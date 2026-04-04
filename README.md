# QooCode

<div align="center">

**开源 AI 编码助手 - 类 Claude Code 的命令行工具**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-green.svg)](https://bun.sh/)
[![Test](https://img.shields.io/badge/Test-124%20Tests-brightgreen.svg)]()
[![Coverage](https://img.shields.io/badge/Coverage-85%25-brightgreen.svg)]()

[English](./open-code/README_en.md) | 简体中文

</div>

---

## ✨ 项目亮点

🚀 **强大的 AI 编码能力** - 59 个核心工具 + 63 个斜杠命令，覆盖代码开发的全生命周期

🎯 **多模型支持** - 兼容 OpenAI、DeepSeek 及任何 OpenAI API 兼容模型

💻 **全平台 IDE 集成** - VS Code 扩展 + JetBrains 插件，无缝衔接你的开发环境

🔌 **MCP 协议支持** - Model Context Protocol 客户端，可扩展的工具生态系统

⚡ **高性能** - 并行预取、API 预连接、智能缓存，响应速度快如闪电

🛡️ **安全可靠** - JWT 认证、权限管理、操作审计

## 📖 项目说明

**QooCode** 是一个功能强大的开源 AI 编码助手 CLI 工具，通过逆向分析 Claude Code 的架构设计独立开发完成。本项目不包含任何 Claude Code 的原始源代码，旨在提供一个合法合规、功能全面的开源替代方案。

### 与 Claude Code 对比

| 特性 | Claude Code | QooCode |
|------|-------------|----------|
| 源代码 | 专有软件 | 100% 独立开发 |
| 许可证 | 专有 | MIT 开源 |
| API 支持 | 仅 Claude | OpenAI/DeepSeek/本地模型 |
| 核心工具 | 59 个 | 59 个 ✅ |
| 斜杠命令 | 63 个 | 63 个 ✅ |
| IDE 集成 | VS Code | VS Code + JetBrains |
| 可扩展性 | 封闭 | 开放 MCP + 技能系统 |

---

## 🚀 快速开始

### 环境要求

| 要求 | 版本 |
|------|------|
| Node.js | ≥ 18.0.0 |
| Bun | ≥ 1.2.0 (推荐) |
| Git | 最新版 |

### 安装

```bash
# 方式一：下载二进制 (推荐)
# 访问 https://github.com/your-org/qoocode/releases 下载对应平台的二进制文件

# 方式二：从源码构建
git clone https://github.com/your-org/qoocode.git
cd qoocode/open-code
bun install
bun run build:compile

# 方式三：开发模式
bun install
bun run dev
```

### 配置

```bash
# Linux/macOS
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"
export OPENAI_MODEL="deepseek-chat"

# Windows (PowerShell)
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_BASE_URL="https://api.deepseek.com/v1"
$env:OPENAI_MODEL="deepseek-chat"
```

### 运行

```bash
# 交互式对话
qoocode

# 或带参数运行
qoocode --api-key your-key --model deepseek-chat
```

---

## 🛠️ 核心能力

### 59 个核心工具

| 类别 | 数量 | 工具列表 |
|------|------|----------|
| **文件操作** | 9 | FileRead, FileWrite, FileEdit, CopyFile, MoveFile, DeleteFile, DirectoryRead, DirectoryWrite, DirectoryEdit |
| **Git 操作** | 7 | GitCommit, GitDiff, GitLog, GitBranch, GitStatus, GitTag, GitStash |
| **代码搜索** | 5 | Grep, Glob, LSP, SymbolSearch, FindReferences |
| **Web 能力** | 4 | WebFetch, WebSearch, APICall, CurlTool |
| **测试支持** | 4 | RunTests, TestCoverage, TestWatch, TestGeneration |
| **高级特性** | 30 | GotoDefinition, NotebookEdit, Agent, Brief, Config, CopyClip, Terminal, Resume, Todo, AutoEdit, BatchEdit... |

### 63 个斜杠命令

```
# Git 命令
/commit, /review, /diff, /branch, /merge, /stash, /tag

# 开发命令
/test, /build, /run, /debug, /lint, /format, /benchmark

# 代码命令
/edit, /delete, /copy, /move, /create, /rename
/explain, /refactor, /optimize, /security, /doc

# 搜索命令
/search, /find, /grep, /glob, /symbols

# Web 命令
/web, /fetch, /api, /curl

# MCP 命令
/mcp, /tools, /skills, /agents

# 配置命令
/config, /env, /settings, /model, /cost

# 会话命令
/session, /resume, /export, /import, /plan

# 基础命令
/help, /clear, /exit, /status, /stats, /usage
```

---

## 💡 使用示例

### 智能代码开发

```
You: 帮我创建一个用户认证的 REST API

Assistant: 正在分析项目结构...
  ✓ 检测到 Express 项目
  ✓ 现有路由: /api/users
  ✓ 数据库: PostgreSQL

正在创建文件...
  [FileWrite] src/api/auth/login.ts      - 登录接口
  [FileWrite] src/api/auth/register.ts   - 注册接口
  [FileWrite] src/api/auth/refresh.ts    - Token 刷新
  [FileWrite] src/middleware/auth.ts     - 认证中间件
  [FileEdit] src/routes.ts - 添加路由
  [FileWrite] tests/auth.test.ts - 测试用例
  [Bash] 运行测试...
  ✓ 12 tests passed
```

### IDE 集成

**VS Code 扩展**

```bash
# 安装 VS Code 扩展
code --install-extension qoocode.qoocode-extension

# 快捷键
Ctrl+Shift+P → QooCode: Start
Ctrl+Shift+A → 代码分析
Ctrl+Shift+E → 代码解释
```

**JetBrains 插件**

```bash
# 在 IntelliJ/PyCharm 中
Settings → Plugins → Marketplace → 搜索 "QooCode"
```

### 斜杠命令

```
/test src/utils          # 运行测试
/search "async function" # 搜索代码
/git "commit -m 'fix'"   # Git 提交
/web "React best practices" # 网络搜索
/explain src/api/        # 解释代码
/refactor "优化性能"      # 重构建议
```

---

## 🏗️ 项目架构

```
open-code/
├── src/
│   ├── main.tsx                  # CLI 入口
│   ├── App.tsx                   # 主应用组件
│   ├── query.ts                  # 对话引擎
│   ├── tools/                    # 59 个核心工具
│   │   ├── BashTool/
│   │   ├── FileReadTool/
│   │   ├── FileWriteTool/
│   │   ├── FileEditTool/
│   │   ├── GrepTool/
│   │   ├── GlobTool/
│   │   ├── GitCommitTool/
│   │   ├── GitDiffTool/
│   │   ├── GitLogTool/
│   │   ├── WebFetchTool/
│   │   ├── WebSearchTool/
│   │   └── ... (45+ more)
│   ├── services/
│   │   ├── api/                 # API 适配层
│   │   ├── cache/               # 智能缓存
│   │   ├── hook/                # Hook 系统
│   │   ├── mcp/                # MCP 客户端
│   │   ├── auth/                # JWT 认证
│   │   ├── skills/              # 技能系统
│   │   └── telemetry/           # 遥测系统
│   ├── state/                   # 状态管理
│   ├── types/                   # 类型定义
│   └── utils/                   # 工具函数
├── vscode-extension/             # VS Code 扩展
├── jetbrains-plugin/            # JetBrains 插件
├── tests/                       # 测试文件 (124 tests)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 技术栈

| 技术 | 用途 |
|------|------|
| **Bun** | JavaScript 运行时 |
| **TypeScript 5.7** | 类型安全 |
| **React 18** | UI 组件 |
| **Ink 5** | 终端 UI |
| **Vitest** | 测试框架 |
| **Zod** | 类型验证 |
| **Commander** | CLI 框架 |

---

## 🔧 配置

### 配置文件

```bash
# Linux/macOS
~/.qoocode/config.json

# Windows
%USERPROFILE%\.qoocode\config.json
```

### 配置格式

```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://api.deepseek.com/v1",
  "model": "deepseek-chat",
  "temperature": 0.7,
  "maxTokens": 8192,
  "timeoutMs": 60000,
  "cache": {
    "enabled": true,
    "ttlSeconds": 3600
  },
  "hooks": {
    "preCommand": [],
    "postCommand": []
  }
}
```

### 环境变量

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `OPENAI_API_KEY` | API 密钥 | - |
| `OPENAI_BASE_URL` | API 地址 | `https://api.deepseek.com/v1` |
| `OPENAI_MODEL` | 模型名称 | `deepseek-chat` |
| `QOOCODE_DEBUG` | 调试模式 | `false` |
| `QOOCODE_CONFIG` | 配置文件路径 | `~/.qoocode/config.json` |

---

## 🧪 测试

```bash
# 运行所有测试
bun test

# 监视模式
bun run test:watch

# 覆盖率报告
bun run test:coverage
```

**测试覆盖**: 85%+ (124 个测试用例)

---

## ⚖️ 法律声明

- ✅ 本项目为独立开发成果，不包含 Claude Code 的任何源代码
- ✅ 仅参考公开的 Source Map 结构进行架构设计
- ✅ 采用 MIT 开源许可证，欢迎贡献和使用
- ⚠️ 请勿用于侵犯 Anthropic 权益的用途
- ⚠️ 不得声称与 Anthropic 有官方关系

---

## 🤝 贡献

欢迎贡献代码！

```bash
# 1. Fork 并克隆
git clone https://github.com/your-org/QOOCODE.git

# 2. 创建特性分支
git checkout -b feature/amazing-feature

# 3. 开发并测试
bun test
bun run dev

# 4. 提交 (遵循 conventional commits)
git commit -m 'feat: add amazing feature'

# 5. 推送并创建 PR
git push origin feature/amazing-feature
```

### 提交规范

```
<type>(<scope>): <subject>

类型:
  feat:   新功能
  fix:    Bug 修复
  docs:   文档更新
  style:  代码格式
  refactor: 重构
  test:   添加测试
  chore:  维护工作
```

---

## ❓ 常见问题

**Q: 支持哪些模型？**
A: 支持任何 OpenAI API 兼容模型，包括 GPT-4、Claude、DeepSeek、本地模型等。

**Q: 如何定价？**
A: QooCode 本身免费，只需支付所选 API 的调用费用。

**Q: 可以离线使用吗？**
A: 可以，只需运行本地 LLM 服务器（如 Ollama）并配置 OpenAI 兼容 API。

**Q: 代码会被发送到外部服务器吗？**
A: 只有你明确请求的代码片段会发送到 API，默认不发送任何遥测数据。

---

## 📄 许可证

[MIT License](./LICENSE)

## 🙏 致谢

- [Claude Code](https://claude.ai/code) - 架构灵感
- [Ink](https://github.com/vadimdemedes/ink) - 终端 UI
- [OpenAI](https://openai.com/) - AI 模型
- [DeepSeek](https://deepseek.com/) - DeepSeek 模型
- [Bun](https://bun.sh/) - JavaScript 运行时

---

## 📬 联系方式

- GitHub Issues: [https://github.com/your-org/qoocode/issues](https://github.com/your-org/qoocode/issues)
- 讨论区: [https://github.com/your-org/qoocode/discussions](https://github.com/your-org/qoocode/discussions)

---

<div align="center">

**如果这个项目对你有帮助，请给我们一个 ⭐ Star！**

</div>
