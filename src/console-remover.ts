import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';

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

export async function removeConsoleFromProject(options: RemoveConsoleOptions): Promise<RemoveConsoleResult> {
  const {
    projectPath,
    consoleTypes,
    fileExtensions,
    dryRun = false,
    excludePatterns = []
  } = options;

  // 构建文件匹配模式
  const patterns = fileExtensions.map(ext => `**/*.${ext}`);
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matchedFiles = await glob(pattern, {
      cwd: projectPath,
      absolute: true,
      ignore: excludePatterns.map(p => `**/${p}/**`)
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
          console.log(chalk.yellow(`[DRY RUN] ${path.relative(projectPath, filePath)}: ${result.removedCount} console statements would be removed`));
        } else {
          await fs.writeFile(filePath, result.content, 'utf-8');
          console.log(chalk.green(`✓ ${path.relative(projectPath, filePath)}: ${result.removedCount} console statements removed`));
        }
      }
    } catch (error) {
      console.warn(chalk.yellow(`Skipped ${filePath}: ${error instanceof Error ? error.message : error}`));
    }
  }

  return {
    filesProcessed,
    consolesRemoved,
    modifiedFiles
  };
}

interface RemoveResult {
  content: string;
  modified: boolean;
  removedCount: number;
}

function removeConsoleFromContent(content: string, consoleTypes: string[]): RemoveResult {
  let modifiedContent = content;
  let removedCount = 0;
  let modified = false;

  for (const type of consoleTypes) {
    // 匹配各种console语句的正则表达式
    const patterns = [
      // console.log(...); 单行语句
      new RegExp(`\\s*console\\.${type}\\s*\\([^;]*\\);?\\s*\\n?`, 'g'),
      // console.log(...) 在表达式中
      new RegExp(`console\\.${type}\\s*\\([^)]*\\)`, 'g')
    ];

    for (const pattern of patterns) {
      const matches = modifiedContent.match(pattern);
      if (matches) {
        removedCount += matches.length;
        modified = true;
        modifiedContent = modifiedContent.replace(pattern, '');
      }
    }
  }

  // 清理多余的空行
  modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

  return {
    content: modifiedContent,
    modified,
    removedCount
  };
}