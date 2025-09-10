import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { generate } from '@babel/generator';
import * as t from '@babel/types';

export interface RemoveConsoleOptions {
  projectPath: string;
  consoleTypes: string[];
  fileExtensions: string[];
  dryRun?: boolean;
  excludePatterns?: string[];
}

export interface RemoveConsoleResult {
  filesProcessed: number;
  consolesRemoved: number;
  modifiedFiles: string[];
}

export async function removeConsoleFromProject(
  options: RemoveConsoleOptions
): Promise<RemoveConsoleResult> {
  const {
    projectPath,
    consoleTypes,
    fileExtensions,
    dryRun = false,
    excludePatterns = [],
  } = options;

  // 构建文件匹配模式
  const patterns = fileExtensions.map((ext) => `**/*.${ext}`);
  const files: string[] = [];

  // 扩展忽略模式，确保目录被正确忽略 | Expand ignore patterns to reliably ignore directories
  const expandedIgnore = excludePatterns.flatMap((p) => [
    p,
    `${p}/**`,
    `**/${p}/**`,
  ]);

  for (const pattern of patterns) {
    const matchedFiles = await glob(pattern, {
      cwd: projectPath,
      absolute: true,
      // 直接使用用户提供的忽略模式 | Use user-provided ignore patterns as-is
      ignore: expandedIgnore,
    });
    files.push(...matchedFiles);
  }

  // 去重
  const uniqueFiles = [...new Set(files)];

  let filesProcessed = 0;
  let consolesRemoved = 0;
  const modifiedFiles: string[] = [];

  for (const filePath of uniqueFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const result = removeConsoleFromContent(content, consoleTypes);

      if (result.modified) {
        filesProcessed++;
        consolesRemoved += result.removedCount;
        modifiedFiles.push(filePath);

        if (dryRun) {
          console.log(
            chalk.yellow(
              `[DRY RUN] ${path.relative(projectPath, filePath)}: ${
                result.removedCount
              } console statements would be removed`
            )
          );
        } else {
          await fs.writeFile(filePath, result.content, 'utf-8');
          console.log(
            chalk.green(
              `✓ ${path.relative(projectPath, filePath)}: ${
                result.removedCount
              } console statements removed`
            )
          );
        }
      }
    } catch (error) {
      console.warn(
        chalk.yellow(
          `Skipped ${filePath}: ${
            error instanceof Error ? error.message : error
          }`
        )
      );
    }
  }

  return {
    filesProcessed,
    consolesRemoved,
    modifiedFiles,
  };
}

interface RemoveResult {
  content: string;
  modified: boolean;
  removedCount: number;
}

function removeConsoleFromContent(
  content: string,
  consoleTypes: string[]
): RemoveResult {
  // 使用 AST 删除 console 调用，并尽量保留行与缩进 | Remove console calls with AST and keep code layout
  let removedCount = 0;
  let modified = false;

  // 解析 | Parse
  const ast = parse(content, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    // 启用新的格式保留功能所需的选项
    tokens: true,
    createParenthesizedExpressions: true,
    plugins: [
      'typescript',
      'jsx',
      'classProperties',
      'objectRestSpread',
      'decorators-legacy',
      'dynamicImport',
      'optionalChaining',
      'nullishCoalescingOperator',
      'topLevelAwait',
    ],
  });

  // 工具：判断是否 console.* | Helper: is console.*
  const isTargetConsole = (callee: any): { hit: boolean; prop?: string } => {
    const getName = (prop: any): string | null => {
      if (t.isIdentifier(prop)) return prop.name;
      if (t.isStringLiteral(prop)) return prop.value;
      return null;
    };

    // MemberExpression 或 OptionalMemberExpression | Member or OptionalMember
    if (t.isMemberExpression(callee) || t.isOptionalMemberExpression(callee)) {
      const obj = callee.object;
      const prop = callee.property;
      const name = getName(prop);
      if (
        t.isIdentifier(obj, { name: 'console' }) &&
        name &&
        consoleTypes.includes(name)
      ) {
        return { hit: true, prop: name };
      }
    }
    return { hit: false };
  };

  // 用于将表达式安全替换为无副作用的空值 | Replace expression with side-effect-free void 0
  const void0 = () => t.unaryExpression('void', t.numericLiteral(0), true);

  // 统一处理器 | Unified handler
  const removeConsoleCall = (path: any) => {
    const callee = path.node.callee as any;
    const { hit } = isTargetConsole(callee);
    if (!hit) return;

    removedCount++;
    modified = true;

    const parentPath = path.parentPath;

    // 独立语句：直接删除 | Standalone statement: remove it
    if (parentPath.isExpressionStatement()) {
      parentPath.remove();
      return;
    }

    // 序列表达式：移除该项并降级 | SequenceExpression: remove element and normalize
    if (parentPath.isSequenceExpression()) {
      const seq = parentPath.node.expressions;
      const idx = seq.indexOf(path.node);
      if (idx >= 0) seq.splice(idx, 1);
      if (seq.length === 0) {
        parentPath.replaceWith(void0());
      } else if (seq.length === 1) {
        parentPath.replaceWith(seq[0]);
      } else {
        parentPath.replaceWith(t.sequenceExpression(seq));
      }
      return;
    }

    // 其他上下文：替换为 void 0 | Other contexts: replace with void 0
    path.replaceWith(void0());
  };

  // 遍历：处理 CallExpression 和 OptionalCallExpression | Traverse
  traverse.default(ast, {
    CallExpression(path) {
      removeConsoleCall(path);
    },
    OptionalCallExpression(path: any) {
      removeConsoleCall(path);
    },
  });

  // 生成 | Generate - 使用实验性格式保留功能
  const output = generate(
    ast,
    {
      comments: true,
      retainLines: true,
      compact: false,
      shouldPrintComment: () => true,
      retainFunctionParens: true,
      minified: false,
      concise: false,
      // 实验性格式保留选项 - 保持原始代码格式
      experimental_preserveFormat: true,
    } as any, // 使用 as any 来绕过 TypeScript 类型检查
    content
  );

  return {
    content: output.code,
    modified,
    removedCount,
  };
}
