#!/usr/bin/env node

import { Command } from 'commander';
import { removeConsoleFromProject } from './console-remover';
import chalk from 'chalk';

const program = new Command();

program
  .name("consolex")
  .description("Remove console statements from your project")
  .version("1.0.0");

program
  .option('-t, --types <types>', 'Console types to remove (comma-separated)', 'log,error,warn,info,debug,table,time,timeEnd,group,groupEnd,clear,count,trace')
  .option('-p, --path <path>', 'Project path', process.cwd())
  .option('-e, --extensions <extensions>', 'File extensions to process (comma-separated)', 'js,ts,jsx,tsx')
  .option('--dry-run', 'Show what would be removed without actually removing')
  .option('--exclude <patterns>', 'Exclude patterns (comma-separated)', 'node_modules,dist,build,.git')
  .action(async (options) => {
    try {
      const types = options.types.split(',').map((t: string) => t.trim());
      const extensions = options.extensions.split(',').map((e: string) => e.trim());
      const excludePatterns = options.exclude.split(',').map((p: string) => p.trim());
      
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
        excludePatterns
      });
      
      if (result.filesProcessed === 0) {
        console.log(chalk.yellow('No files found to process'));
      } else {
        console.log(chalk.green(`Processed ${result.filesProcessed} files`));
        console.log(chalk.green(`Removed ${result.consolesRemoved} console statements`));
        
        if (options.dryRun) {
          console.log(chalk.blue('\nDry run completed. Use without --dry-run to actually remove console statements.'));
        }
      }
      
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();