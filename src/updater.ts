import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface PackageInfo {
  name: string;
  version: string;
}

interface NpmVersionInfo {
  latest: string;
  versions: string[];
}

/**
 * 创建带超时的 execAsync 函数
 */
function execWithTimeout(
  command: string,
  timeout: number = 10000
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Command timeout after ${timeout}ms`));
    }, timeout);

    execAsync(command)
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * 获取当前包的版本信息
 */
async function getCurrentVersion(): Promise<string> {
  // 方案1: 首先尝试从全局安装获取版本
  try {
    const { stdout } = await execWithTimeout(
      'npm list -g consolex-cli --depth=0 --json',
      5000
    );
    const globalInfo = JSON.parse(stdout);
    const globalVersion = globalInfo.dependencies?.['consolex-cli']?.version;
    if (globalVersion) {
      return globalVersion;
    }
  } catch {
    // 忽略全局检查失败
  }

  // 方案2: 尝试使用 which/where 命令查找 consolex 可执行文件，然后检查其package.json
  try {
    const isWindows = process.platform === 'win32';
    const whichCmd = isWindows ? 'where consolex' : 'which consolex';
    const { stdout: consolexPath } = await execWithTimeout(whichCmd, 3000);

    if (consolexPath.trim()) {
      // 获取可执行文件所在目录
      const executablePath = consolexPath.trim().split('\n')[0];
      const binDir = path.dirname(executablePath);
      const nodeModulesDir = path.join(
        binDir,
        '..',
        'lib',
        'node_modules',
        'consolex-cli'
      );
      const packageJsonPath = path.join(nodeModulesDir, 'package.json');

      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        const packageInfo: PackageInfo = JSON.parse(packageContent);
        if (packageInfo.name === 'consolex-cli' && packageInfo.version) {
          return packageInfo.version;
        }
      } catch {
        // 忽略此方法的失败
      }
    }
  } catch {
    // 忽略 which/where 命令失败
  }

  // 方案3: 尝试从 npm 获取本地安装的版本
  try {
    const { stdout } = await execWithTimeout(
      'npm list consolex-cli --depth=0 --json',
      5000
    );
    const localInfo = JSON.parse(stdout);
    const localVersion = localInfo.dependencies?.['consolex-cli']?.version;
    if (localVersion) {
      return localVersion;
    }
  } catch {
    // 忽略本地检查失败
  }

  // 方案4: 尝试从当前目录的 package.json 读取（仅用于开发环境）
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageInfo: PackageInfo = JSON.parse(packageContent);
    if (packageInfo.name === 'consolex-cli') {
      return packageInfo.version;
    }
  } catch {
    // 忽略开发环境检查失败
  }

  // 最后方案：尝试执行 consolex --version 命令（如果可用）
  try {
    const { stdout } = await execWithTimeout('consolex --version', 3000);
    const versionOutput = stdout.trim();
    if (versionOutput && /^\d+\.\d+\.\d+/.test(versionOutput)) {
      return versionOutput;
    }
  } catch {
    // 忽略版本命令失败
  }

  return 'unknown';
}

/**
 * 获取 npm 上的最新版本信息
 */
async function getLatestVersion(): Promise<NpmVersionInfo> {
  try {
    console.log(chalk.gray('Fetching latest version information from npm...'));

    // 强制使用 npm 官方镜像，避免私有镜像导致的问题
    const { stdout } = await execWithTimeout(
      'npm view consolex-cli version versions --json --registry https://registry.npmjs.org/',
      8000
    );
    const info = JSON.parse(stdout);

    return {
      latest: info.version || info.latest,
      versions: info.versions || [],
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch version info from npm: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

/**
 * 比较版本号
 */
function compareVersions(current: string, latest: string): number {
  if (current === 'unknown') return -1;

  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
}

/**
 * 执行更新
 */
async function performUpdate(): Promise<void> {
  try {
    console.log(chalk.blue('🔄 Updating consolex-cli...'));

    // 使用官方镜像进行更新，确保从正确的源获取最新版本
    const { stdout, stderr } = await execWithTimeout(
      'npm install -g consolex-cli@latest --registry https://registry.npmjs.org/',
      30000
    );

    if (stderr && !stderr.includes('warn')) {
      throw new Error(stderr);
    }

    console.log(chalk.green('✅ Update completed successfully!'));
    if (stdout.trim()) {
      console.log(chalk.gray(stdout));
    }
  } catch (error) {
    throw new Error(
      `Update failed: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * 检查更新并可选择性执行更新
 */
export async function checkAndUpdate(
  autoUpdate: boolean = false
): Promise<void> {
  try {
    console.log(chalk.blue('🔍 Checking for updates...'));

    const [currentVersion, versionInfo] = await Promise.all([
      getCurrentVersion(),
      getLatestVersion(),
    ]);

    const { latest } = versionInfo;

    // 改善版本显示
    const currentVersionDisplay =
      currentVersion === 'unknown'
        ? 'not detected (may not be installed)'
        : currentVersion;

    console.log(chalk.gray(`Current version: ${currentVersionDisplay}`));
    console.log(chalk.gray(`Latest version: ${latest}`));

    const comparison = compareVersions(currentVersion, latest);

    if (comparison === 0) {
      console.log(chalk.green('✅ You are already using the latest version!'));
      return;
    }

    if (comparison > 0) {
      console.log(
        chalk.yellow(
          "⚠️  You are using a newer version than what's published on npm."
        )
      );
      return;
    }

    // 有新版本可用
    console.log(chalk.yellow(`📦 New version ${latest} is available!`));

    if (currentVersion === 'unknown') {
      console.log(
        chalk.blue(
          '💡 Since we could not detect your current version, we recommend updating:'
        )
      );
    }

    if (autoUpdate) {
      await performUpdate();

      // 验证更新后的版本
      const newVersion = await getCurrentVersion();
      console.log(
        chalk.green(`🎉 Successfully updated to version ${newVersion}`)
      );
    } else {
      console.log(
        chalk.blue('💡 Run with --update flag to automatically update:')
      );
      console.log(chalk.gray('   consolex --update'));
      console.log(
        chalk.gray(
          '   Or manually update with: npm install -g consolex-cli@latest --registry https://registry.npmjs.org/'
        )
      );
    }
  } catch (error) {
    console.error(chalk.red('❌ Error checking for updates:'));
    console.error(
      chalk.red(error instanceof Error ? error.message : String(error))
    );
    process.exit(1);
  }
}
