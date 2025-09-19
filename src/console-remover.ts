import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import recast from 'recast';

export interface RemoveConsoleOptions {
  projectPath: string;
  consoleTypes: string[];
  fileExtensions: string[];
  dryRun?: boolean;
  excludePatterns?: string[];
  debug?: boolean;
}

export interface RemoveConsoleResult {
  filesProcessed: number;
  consolesRemoved: number;
  modifiedFiles: string[];
  filesMatched: number;
  parseErrors: { file: string; error: string }[];
}

export async function removeConsoleFromProject(
  options: RemoveConsoleOptions
): Promise<RemoveConsoleResult> {
  const {
    projectPath,
    consoleTypes,
    fileExtensions,
    dryRun = false,
    excludePatterns = ['node_modules', 'dist', 'build', '.git'],
    debug = false,
  } = options;

  const patterns = fileExtensions.map((ext) => `**/*.${ext}`);
  const ignore = excludePatterns.flatMap((p) => [p, `${p}/**`, `**/${p}/**`]);

  if (debug) {
    console.log(chalk.gray('glob patterns:'), patterns);
    console.log(chalk.gray('glob ignore:'), ignore);
    console.log(chalk.gray('cwd:'), projectPath);
  }

  const files: string[] = [];
  for (const pattern of patterns) {
    const matchedFiles = await glob(pattern, {
      cwd: projectPath,
      absolute: true,
      ignore,
      dot: true,
    });
    if (debug) {
      console.log(
        chalk.gray(`pattern "${pattern}" matched ${matchedFiles.length} files`)
      );
      if (matchedFiles.length > 0) {
        console.log(
          chalk.gray(
            'sample:',
            matchedFiles.slice(0, 5).map((f) => path.relative(projectPath, f))
          )
        );
      }
    }
    files.push(...matchedFiles);
  }

  const uniqueFiles = [...new Set(files)];

  if (uniqueFiles.length === 0) {
    console.log(chalk.yellow('No files found to process'));
    return {
      filesProcessed: 0,
      consolesRemoved: 0,
      modifiedFiles: [],
      filesMatched: 0,
      parseErrors: [],
    };
  }

  if (debug) {
    console.log(chalk.gray(`Total unique files: ${uniqueFiles.length}`));
  }

  let filesProcessed = 0;
  let consolesRemoved = 0;
  const modifiedFiles: string[] = [];
  const parseErrors: { file: string; error: string }[] = [];

  for (const filePath of uniqueFiles) {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      console.warn(
        chalk.yellow(
          `Skipped ${filePath}: failed to read - ${
            err instanceof Error ? err.message : String(err)
          }`
        )
      );
      continue;
    }

    const result = removeConsoleFromContent(content, consoleTypes, {
      debug,
      filePath,
    });

    if (result.parseError) {
      parseErrors.push({ file: filePath, error: result.parseError });
      if (debug) {
        console.warn(
          chalk.yellow(
            `Parse error in ${path.relative(
              projectPath,
              filePath
            )}: ${result.parseError}`
          )
        );
      }
      continue;
    }

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
    } else if (debug) {
      console.log(
        chalk.gray(
          `${path.relative(projectPath, filePath)}: no console.${consoleTypes.join(
            '|'
          )} found`
        )
      );
    }
  }

  return {
    filesProcessed,
    consolesRemoved,
    modifiedFiles,
    filesMatched: uniqueFiles.length,
    parseErrors,
  };
}

interface RemoveResult {
  content: string;
  modified: boolean;
  removedCount: number;
  parseError?: string | null;
}

function removeConsoleFromContent(
  content: string,
  consoleTypes: string[],
  opts?: { debug?: boolean; filePath?: string }
): RemoveResult {
  let removedCount = 0;
  let modified = false;

  let ast: any;
  try {
    ast = recast.parse(content, {
      parser: {
        parse(source: string) {
          return parse(source, {
            sourceType: 'unambiguous',
            allowReturnOutsideFunction: true,
            tokens: true,
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
              'importMeta',
              'regexpUnicodeSets',
            ],
          });
        },
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (opts?.debug) {
      console.warn(
        chalk.yellow(
          `Parse failed${opts.filePath ? ' for ' + opts.filePath : ''}: ${msg}`
        )
      );
    }
    return {
      content,
      modified: false,
      removedCount: 0,
      parseError: msg,
    };
  }

  const void0 = () => t.unaryExpression('void', t.numericLiteral(0), true);

  traverse.default(ast, {
    CallExpression(path) {
      const { hit } = isTargetConsole(path.node.callee, consoleTypes);
      if (!hit) return;

      removedCount++;
      modified = true;

      const parentPath = path.parentPath;

      if (parentPath && parentPath.isExpressionStatement()) {
        parentPath.remove();
        return;
      }

      if (parentPath && parentPath.isSequenceExpression()) {
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

      path.replaceWith(void0());
    },
    OptionalCallExpression(path: any) {
      const { hit } = isTargetConsole(path.node.callee, consoleTypes);
      if (!hit) return;

      removedCount++;
      modified = true;
      path.replaceWith(void0());
    },
  });

  const output = recast.print(ast).code;

  return {
    content: output,
    modified,
    removedCount,
    parseError: null,
  };
}

function isTargetConsole(
  callee: t.Expression | t.V8IntrinsicIdentifier,
  consoleTypes: string[]
): { hit: boolean; prop?: string } {
  const getName = (prop: t.Expression | t.PrivateName): string | null => {
    if (t.isIdentifier(prop)) return prop.name;
    if (t.isStringLiteral(prop)) return prop.value;
    return null;
  };

  if (
    t.isMemberExpression(callee) ||
    (t as any).isOptionalMemberExpression?.(callee) ||
    (callee as any).type === 'OptionalMemberExpression'
  ) {
    const obj = (callee as any).object;
    const prop = (callee as any).property;
    const name = getName(prop as any);

    if (
      t.isIdentifier(obj, { name: 'console' }) &&
      name !== null &&
      consoleTypes.includes(name)
    ) {
      return { hit: true, prop: name };
    }
  }

  return { hit: false };
}
