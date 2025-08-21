# Consolex CLI - AI Documentation

## English Version

### Project Overview
Consolex CLI is a TypeScript-based command-line tool designed to intelligently remove console statements from JavaScript and TypeScript projects. It uses Abstract Syntax Tree (AST) parsing to safely identify and remove console calls while preserving code structure and formatting.

### Technical Architecture

#### Core Components
1. **CLI Interface** (`src/index.ts`): Built with Commander.js for command-line argument parsing and user interaction
2. **AST Processor** (`src/console-remover.ts`): Uses Babel parser and traverser for code analysis and transformation
3. **File System Operations**: Handles file discovery, reading, and writing with proper error handling

#### Key Technologies
- **TypeScript**: Primary development language with strict type checking
- **Babel Parser**: Parses JavaScript/TypeScript code into AST
- **Babel Traverse**: Navigates and modifies AST nodes
- **Babel Generator**: Converts modified AST back to code
- **Commander.js**: CLI framework for argument parsing
- **Glob**: File pattern matching for project scanning
- **Chalk**: Terminal styling for better user experience

#### AST Processing Strategy
The tool employs sophisticated AST manipulation techniques:
- **Member Expression Detection**: Identifies `console.method()` calls
- **Context-Aware Removal**: Different handling based on expression context:
  - Standalone statements: Complete removal
  - Sequence expressions: Element removal and sequence normalization
  - Other contexts: Replacement with `void 0` (side-effect-free)
- **Code Preservation**: Maintains original formatting, comments, and line numbers

#### Supported Console Methods
The tool can remove all standard console methods:
- `console.log`, `console.error`, `console.warn`, `console.info`
- `console.debug`, `console.table`, `console.time`, `console.timeEnd`
- `console.group`, `console.groupEnd`, `console.clear`, `console.count`, `console.trace`

#### File Processing Capabilities
- **Multiple Extensions**: Supports `.js`, `.ts`, `.jsx`, `.tsx` files
- **Pattern Exclusion**: Automatically excludes `node_modules`, `dist`, `build`, `.git` directories
- **Custom Patterns**: User-configurable exclusion patterns
- **Dry Run Mode**: Preview changes without modifying files

### Development Setup
```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Run linting
pnpm lint

# Run type checking
pnpm type-check

# Format code
pnpm format
```

### Build Process
The project uses TypeScript compiler with ES module output:
- Target: ES2020
- Module: ES2020
- Strict type checking enabled
- Source maps for debugging

### Quality Assurance
- ESLint with TypeScript support
- Prettier for code formatting
- Husky for git hooks
- Commitlint for commit message validation
- Lint-staged for pre-commit checks

### Performance Considerations
- **Incremental Processing**: Files are processed individually to handle large projects
- **Memory Efficiency**: AST parsing and generation per file to avoid memory bloat
- **Parallel Discovery**: File discovery using glob patterns for efficiency

### Security Features
- **Input Validation**: All user inputs are validated and sanitized
- **Error Handling**: Graceful error handling with informative messages
- **File Permissions**: Proper file access permissions checking
- **No Remote Execution**: Purely local file operations

### Extension Points
- **Custom Transformers**: AST visitor pattern allows for custom transformations
- **Plugin System**: Potential for additional code modification rules
- **Configuration Files**: Support for project-specific configuration

---

## 中文版本

### 项目概述
Consolex CLI 是一个基于 TypeScript 的命令行工具，专门用于智能地从 JavaScript 和 TypeScript 项目中移除 console 语句。它使用抽象语法树（AST）解析技术来安全地识别和移除 console 调用，同时保持代码结构和格式。

### 技术架构

#### 核心组件
1. **CLI 接口** (`src/index.ts`): 使用 Commander.js 构建命令行参数解析和用户交互
2. **AST 处理器** (`src/console-remover.ts`): 使用 Babel 解析器和遍历器进行代码分析和转换
3. **文件系统操作**: 处理文件发现、读取和写入，包含完善的错误处理

#### 关键技术
- **TypeScript**: 主要开发语言，支持严格类型检查
- **Babel Parser**: 将 JavaScript/TypeScript 代码解析为 AST
- **Babel Traverse**: 导航和修改 AST 节点
- **Babel Generator**: 将修改后的 AST 转换回代码
- **Commander.js**: 命令行参数解析框架
- **Glob**: 文件模式匹配，用于项目扫描
- **Chalk**: 终端样式库，提供更好的用户体验

#### AST 处理策略
工具采用先进的 AST 操作技术：
- **成员表达式检测**: 识别 `console.method()` 调用
- **上下文感知移除**: 根据表达式上下文进行不同处理：
  - 独立语句：完全移除
  - 序列表达式：移除元素并规范化序列
  - 其他上下文：替换为 `void 0`（无副作用）
- **代码保留**: 保持原始格式、注释和行号

#### 支持的 Console 方法
工具可以移除所有标准 console 方法：
- `console.log`, `console.error`, `console.warn`, `console.info`
- `console.debug`, `console.table`, `console.time`, `console.timeEnd`
- `console.group`, `console.groupEnd`, `console.clear`, `console.count`, `console.trace`

#### 文件处理能力
- **多扩展名支持**: 支持 `.js`, `.ts`, `.jsx`, `.tsx` 文件
- **模式排除**: 自动排除 `node_modules`, `dist`, `build`, `.git` 目录
- **自定义模式**: 用户可配置的排除模式
- **预览模式**: 在不修改文件的情况下预览更改

### 开发设置
```bash
# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行代码检查
pnpm lint

# 运行类型检查
pnpm type-check

# 格式化代码
pnpm format
```

### 构建过程
项目使用 TypeScript 编译器，输出 ES 模块：
- 目标：ES2020
- 模块：ES2020
- 启用严格类型检查
- 包含源代码映射用于调试

### 质量保证
- 支持 TypeScript 的 ESLint
- Prettier 代码格式化
- Husky git 钩子
- Commitlint 提交消息验证
- Lint-staged 预提交检查

### 性能考虑
- **增量处理**: 逐个文件处理以支持大型项目
- **内存效率**: 每个文件单独进行 AST 解析和生成，避免内存膨胀
- **并行发现**: 使用 glob 模式进行高效文件发现

### 安全特性
- **输入验证**: 所有用户输入都经过验证和清理
- **错误处理**: 优雅的错误处理，提供信息性消息
- **文件权限**: 正确的文件访问权限检查
- **无远程执行**: 纯本地文件操作

### 扩展点
- **自定义转换器**: AST 访问者模式支持自定义转换
- **插件系统**: 支持额外的代码修改规则
- **配置文件**: 支持项目特定配置

### AI 集成建议
对于 AI 系统集成，建议关注：
1. **AST 解析模式**: 理解代码结构分析的方法
2. **上下文感知处理**: 学习如何根据代码上下文进行智能修改
3. **错误恢复机制**: 处理解析失败时的优雅降级
4. **增量处理模式**: 大规模代码库的高效处理策略

这个项目展示了现代 JavaScript 工具开发的优秀实践，包括类型安全、模块化设计和用户体验优化。