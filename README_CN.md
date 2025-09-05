# Consolex CLI

[English Documentation](./README.md)

一个用于移除项目中console语句的TypeScript命令行工具。

## 安装

### 从npm安装
```bash
npm install -g consolex-cli
```

### 从源码安装
```bash
git clone <repository-url>
cd consolex-cli
pnpm i
pnpm build
# use
pnpm start options
# e.g
pnpm start --types log,error,warn --path <"your project path"> --extensions ts,tsx --dry-run
```

## 使用方法

### 基本用法

```bash
# 移除当前目录下所有类型的console语句
consolex

# 只移除console.log
consolex --types log

# 移除多种类型的console语句
consolex --types log,error,warn

# 指定项目路径
consolex --path /path/to/your/project

# 预览模式（不实际修改文件）
consolex --dry-run

# 指定文件扩展名
consolex --extensions js,ts,jsx,tsx

# 排除特定目录
consolex --exclude node_modules,dist,build
```

### 选项说明

- `-t, --types <types>`: 要移除的console类型（逗号分隔），默认移除所有类型
- `-p, --path <path>`: 项目路径，默认为当前目录
- `-e, --extensions <extensions>`: 要处理的文件扩展名（逗号分隔），默认为 js,ts,jsx,tsx
- `--dry-run`: 预览模式，显示将要移除的内容但不实际修改文件
- `--exclude <patterns>`: 排除的目录模式（逗号分隔），默认排除 node_modules,dist,build,.git
- `-u, --update`: 检查更新并升级到最新版本

### 支持的Console类型

- log
- error
- warn
- info
- debug
- table
- time
- timeEnd
- group
- groupEnd
- clear
- count
- trace

## 示例

```bash
# 只移除console.log和console.error
consolex --types log,error

# 处理特定目录的TypeScript文件
consolex --path ./src --extensions ts,tsx

# 预览将要移除的console语句
consolex --dry-run --types log

# 检查并升级版本
consolex --update

# 仅检查更新不自动安装
consolex check-update
```

## 许可证

MIT