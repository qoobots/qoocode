<div align="center">

# qoocode

**开源 AI 编程助手 - 终端中的智能代码助手**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-green.svg)](https://bun.sh/)
[![Test](https://img.shields.io/badge/Tests-124%20passed-brightgreen.svg)](./src)
[![GitHub Stars](https://img.shields.io/github/stars/qoobots/qoocode?style=social)](https://github.com/qoobots/qoocode)

**English** | [中文](./README.md)

🚀 在终端中为你提供 AI 驱动的代码辅助，支持 OpenAI、DeepSeek 等所有兼容 OpenAI API 的模型。

[快速开始](#-快速开始) • [特性](#-特性) • [安装](#-安装) • [文档](#-文档) • [贡献](#-贡献)

</div>

---

## ✨ 特性

### 🤖 智能AI交互
- 支持 OpenAI、DeepSeek、Anthropic 等所有兼容 OpenAI API 的模型
- 智能代码分析和解释
- 自动代码重构建议

### 📁 完整文件操作
- 读取、创建、编辑、删除文件
- 目录结构分析和管理
- 批量文件操作

### 🔍 强大的搜索能力
- Grep 全文搜索
- Glob 文件模式匹配
- 符号搜索和代码导航

### 💻 Git 集成
- 提交、分支、差异管理
- 提交历史查看
- Worktree 支持

### 🌐 网络功能
- 网页内容抓取
- API 调用
- 网络搜索

### 🛡️ 安全特性
- 23 种 Bash 安全检查
- 命令替换检测
- 危险命令阻止

### 🎨 现代化界面
- 基于 Ink/React 的终端 UI
- 流式响应输出
- 主题切换支持

---

## 📦 安装

### 前置要求

- [Bun](https://bun.sh/) 1.3+ 或 Node.js 18+
- OpenAI 兼容的 API 密钥

### 方式一：使用 Bun（推荐）

```bash
# 安装
bun install -g qoocode

# 运行
qoocode
```

### 方式二：使用 npm

```bash
npm install -g qoocode
qoocode
```

### 方式三：从源码构建

```bash
# 克隆仓库
git clone https://github.com/qoobots/qoocode.git
cd qoocode

# 安装依赖
bun install

# 开发模式
bun run dev

# 构建发布版本（JS bundle）
bun run build
./dist/qoocode

# 编译为独立的 exe 可执行文件
bun run build:compile
./qoocode.exe
```

---

## 🚀 快速开始

### 1. 配置 API 密钥

```bash
# Linux/macOS
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"  # 可选

# Windows (PowerShell)
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_BASE_URL="https://api.deepseek.com/v1"

# Windows (CMD)
set OPENAI_API_KEY=your-api-key
```

### 2. 启动程序

```bash
qoocode
```

### 3. 开始对话

```
qoocode > 分析当前项目结构
qoocode > 帮我创建一个新组件
qoocode > 查看这个函数的实现
```

---

## 📖 使用示例

### 代码分析和解释

```
> 解释这个函数的作用
```

### 文件操作

```
> 创建一个 React 组件，放在 src/components/UserProfile.tsx
```

### Git 操作

```
> 查看最近的提交
> 帮我创建一个新分支
> 比较 main 和 develop 的差异
```

### 代码搜索

```
> 在 src 目录下搜索 "useState"
> 找出所有未使用的导入
```

### 运行测试

```
> 运行所有测试
> 查看测试覆盖率
```

---

## 🛠️ 核心工具

| 类别 | 工具 | 描述 |
|------|------|------|
| **文件** | FileRead, FileWrite, FileEdit, Copy, Move, Delete | 文件操作 |
| **目录** | DirectoryRead, DirectoryWrite, DirectoryEdit | 目录管理 |
| **搜索** | Grep, Glob, SymbolSearch | 代码搜索 |
| **Git** | GitCommit, GitDiff, GitLog, GitBranch, Worktree | Git操作 |
| **网络** | WebFetch, WebSearch, APICall | 网络功能 |
| **测试** | RunTests, TestCoverage | 测试支持 |
| **导航** | LSP, GotoDefinition, FindReferences | 代码导航 |
| **高级** | Agent, Brief, AskUser, Skill, Speech | 智能工具 |

---

## 📚 文档

### 斜杠命令

| 命令 | 功能 |
|------|------|
| `/help` | 显示帮助 |
| `/clear` | 清空对话 |
| `/model` | 切换模型 |
| `/plan` | 进入计划模式 |
| `/session` | 会话管理 |
| `/commit` | Git 提交 |
| `/test` | 运行测试 |
| `/config` | 配置管理 |

完整命令列表请查看[命令文档](./src/commands.ts)。

### 配置

配置文件位置：
- Linux/macOS: `~/.qoocode/config.json`
- Windows: `%USERPROFILE%\.qoocode\config.json`

```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://api.deepseek.com/v1",
  "model": "deepseek-chat",
  "temperature": 0.7,
  "maxTokens": 8192
}
```

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | API 密钥 | - |
| `OPENAI_BASE_URL` | API 地址 | OpenAI |
| `OPENAI_MODEL` | 模型名称 | gpt-4 |
| `qoocode_DEBUG` | 调试模式 | false |

---

## 🧪 测试

```bash
# 运行所有测试
bun test

# 监听模式
bun run test:watch

# 生成覆盖率报告
bun run test:coverage
```

---

## 📂 项目结构

```
qoocode/
├── src/
│   ├── main.tsx              # 入口文件
│   ├── query.ts              # 对话循环
│   ├── commands.ts            # 63个斜杠命令
│   ├── tools/                # 59个核心工具
│   │   ├── BashTool/
│   │   ├── FileReadTool/
│   │   ├── GitCommitTool/
│   │   └── ...
│   ├── services/             # 服务层
│   │   ├── api/             # API适配
│   │   ├── session/         # 会话管理
│   │   ├── compact/         # 上下文压缩
│   │   └── memory/          # Memory系统
│   └── components/          # UI组件
├── vscode-extension/        # VS Code扩展
├── jetbrains-plugin/        # JetBrains插件
├── tests/                   # 测试文件
└── package.json
```

---

## 🤝 贡献

欢迎贡献代码！请阅读以下指南：

### 开发流程

1. **Fork** 本仓库
2. **克隆** 你的 Fork
   ```bash
   git clone https://github.com/YOUR_USERNAME/qoocode.git
   cd qoocode
   ```
3. **创建** 功能分支
   ```bash
   git checkout -b feature/amazing-feature
   ```
4. **开发** 你的功能
5. **测试** 确保通过
   ```bash
   bun test
   ```
6. **提交** 你的更改
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
7. **推送** 到你的 Fork
   ```bash
   git push origin feature/amazing-feature
   ```
8. 创建 **Pull Request**

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 添加测试用例
- 更新相关文档

### 报告问题

请使用 [GitHub Issues](https://github.com/qoobots/qoocode/issues) 报告 Bug 或请求功能。

---

## ❓ FAQ

**Q: 支持哪些模型？**
A: 支持所有兼容 OpenAI API 的模型，包括 GPT-4、Claude、DeepSeek 等。

**Q: 如何获取 API 密钥？**
A: 从 OpenAI、DeepSeek 或其他支持 OpenAI 兼容 API 的服务商获取。

**Q: 支持 Windows 吗？**
A: 支持！支持 Windows、macOS 和 Linux。

**Q: 可以离线使用吗？**
A: 需要 API 密钥来调用远程模型，暂不支持本地模型。

---

## 📄 许可证

本项目采用 [MIT 许可证](./LICENSE)。

---

## 🙏 致谢

- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [Bun](https://bun.sh/) - JavaScript 运行时
- [Zod](https://zod.dev/) - TypeScript 模式验证
- [Vitest](https://vitest.dev/) - 测试框架

---

## 📬 联系方式

- GitHub Issues: [https://github.com/qoocode-dev/qoocode/issues](https://github.com/qoocode-dev/qoocode/issues)

---

<div align="center">

**如果这个项目对你有帮助，请给它一个 ⭐！**

</div>
