#!/usr/bin/env node

import { Command } from 'commander';
import { removeConsoleFromProject } from './console-remover.js';
import chalk from 'chalk';
import { checkAndUpdate } from './updater.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// 动态读取版本号
function getVersion(): string {
  try {
    // 在 ES 模块中获取当前文件的目录
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 获取 package.json 的路径
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    // 如果读取失败，返回默认版本
    console.warn(
      'Warning: Could not read version from package.json, using fallback version'
    );
    return '1.0.0';
  }
}

const program = new Command();

program
  .name('consolex')
  .description('Remove console statements from your project')
  .version(getVersion());

program
  .option(
    '-t, --types <types>',
    'Console types to remove (comma-separated)',
    'log,error,warn,info,debug,table,time,timeEnd,group,groupEnd,clear,count,trace'
  )
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option(
    '-e, --extensions <extensions>',
    'File extensions to process (comma-separated)',
    'js,ts,jsx,tsx'
  )
  .option('--dry-run', 'Show what would be removed without actually removing')
  .option(
    '--exclude <patterns>',
    'Exclude patterns (comma-separated)',
    'node_modules,dist,build,.git'
  )
  .option('-u, --update', 'Check for updates and upgrade to the latest version')
  .action(async (options) => {
    try {
      // 如果用户指定了 --update 选项，执行更新检查和升级
      if (options.update) {
        await checkAndUpdate(true);
        return;
      }

      const types = options.types.split(',').map((t: string) => t.trim());
      const extensions = options.extensions
        .split(',')
        .map((e: string) => e.trim());
      const excludePatterns = options.exclude
        .split(',')
        .map((p: string) => p.trim());

      console.log(chalk.blue('Starting console removal...'));
      console.log(chalk.gray(`Path: ${options.path}`));
      console.log(chalk.gray(`Types: ${types.join(', ')}`));
      console.log(chalk.gray(`Extensions: ${extensions.join(', ')}`));
      console.log(chalk.gray(`Dry run: ${options.dryRun ? 'Yes' : 'No'}`));
      console.log('');

      const result = await removeConsoleFromProject({
        projectPath: options.path,
        consoleTypes: types,
        fileExtensions: extensions,
        dryRun: options.dryRun,
        excludePatterns,
      });

      if (result.filesProcessed === 0) {
        console.log(chalk.yellow('No files found to process'));
      } else {
        console.log(chalk.green(`Processed ${result.filesProcessed} files`));
        console.log(
          chalk.green(`Removed ${result.consolesRemoved} console statements`)
        );

        if (options.dryRun) {
          console.log(
            chalk.blue(
              '\nDry run completed. Use without --dry-run to actually remove console statements.'
            )
          );
        }
      }
    } catch (error) {
      console.error(
        chalk.red('Error:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

// 添加一个独立的检查更新命令
program
  .command('check-update')
  .description('Check if there are any updates available')
  .action(async () => {
    try {
      await checkAndUpdate(false);
    } catch (error) {
      console.error(
        chalk.red('Error:'),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

program.parse();
