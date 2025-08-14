# Remove Console CLI

[中文文档](./README_CN.md)

A TypeScript command-line tool for removing console statements from your project.

## Installation

### Install from npm
```bash
npm install -g remove-console-cli
```

### Install from source
```bash
git clone <repository-url>
cd remove-console-cli
npm install
npm run build
npm install -g .
```

## Usage

### Basic Usage

```bash
# Remove all types of console statements from current directory
remove-console

# Remove only console.log
remove-console --types log

# Remove multiple types of console statements
remove-console --types log,error,warn

# Specify project path
remove-console --path /path/to/your/project

# Preview mode (don't actually modify files)
remove-console --dry-run

# Specify file extensions
remove-console --extensions js,ts,jsx,tsx

# Exclude specific directories
remove-console --exclude node_modules,dist,build
```

### Options

- `-t, --types <types>`: Console types to remove (comma-separated), removes all types by default
- `-p, --path <path>`: Project path, defaults to current directory
- `-e, --extensions <extensions>`: File extensions to process (comma-separated), defaults to js,ts,jsx,tsx
- `--dry-run`: Preview mode, shows what would be removed without actually modifying files
- `--exclude <patterns>`: Directory patterns to exclude (comma-separated), defaults to node_modules,dist,build,.git

### Supported Console Types

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

## Examples

```bash
# Remove only console.log and console.error
remove-console --types log,error

# Process TypeScript files in specific directory
remove-console --path ./src --extensions ts,tsx

# Preview console statements that would be removed
remove-console --dry-run --types log
```

## License

MIT