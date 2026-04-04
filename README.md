<div align="center">

# qoocode

**开源 AI 编程助手 - 终端中的智能代码助手**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-green.svg)](https://bun.sh/)
[![Test](https://img.shields.io/badge/Tests-254%20passed-brightgreen.svg)](./src)
[![GitHub Stars](https://img.shields.io/github/stars/qoobots/qoocode?style=social)](https://github.com/qoobots/qoocode)

**English** | [中文](./README.md)

🚀 在终端中为你提供 AI 驱动的代码辅助，支持 OpenAI、DeepSeek 等所有兼容 OpenAI API 的模型。

> qoocode 参考 [Claude Code 源码](https://github.com/qoobots/opencode) 实现，是一个完全开源的独立项目，功能完整复刻

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
node dist/main.js

# 编译为独立的 exe 可执行文件
bun run build:compile
./qoocode.exe
```

---

## 🚀 快速开始

### 1. 配置 API 密钥

qoocode 支持多种配置方式,按优先级从高到低:

#### 方式一: 环境变量 (推荐用于临时使用)

**Linux/macOS (Bash/Zsh):**
```bash
# 添加到 ~/.bashrc 或 ~/.zshrc 使其永久生效
export OPENAI_API_KEY="your-api-key-here"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"  # DeepSeek API
export OPENAI_MODEL="deepseek-chat"                   # 可选,默认 deepseek-chat

# 或使用 OpenAI 官方 API
export OPENAI_API_KEY="sk-your-openai-api-key"
# OPENAI_BASE_URL 和 OPENAI_MODEL 可省略,使用默认值
```

**Windows (PowerShell):**
```powershell
# 添加到 $PROFILE 使其永久生效
$env:OPENAI_API_KEY="your-api-key-here"
$env:OPENAI_BASE_URL="https://api.deepseek.com/v1"
$env:OPENAI_MODEL="deepseek-chat"
```

**Windows (CMD):**
```cmd
set OPENAI_API_KEY=your-api-key-here
set OPENAI_BASE_URL=https://api.deepseek.com/v1
set OPENAI_MODEL=deepseek-chat
```

**Windows (永久设置):**
```cmd
setx OPENAI_API_KEY "your-api-key-here"
setx OPENAI_BASE_URL "https://api.deepseek.com/v1"
setx OPENAI_MODEL "deepseek-chat"
```

#### 方式二: 配置文件 (推荐用于长期使用)

创建配置文件 `~/.qoocode/config.json` (Linux/macOS) 或 `%USERPROFILE%\.qoocode\config.json` (Windows):

```json
{
  "apiKey": "your-api-key-here",
  "baseUrl": "https://api.deepseek.com/v1",
  "model": "deepseek-chat",
  "maxTokens": 8192,
  "temperature": 0.7,
  "timeoutMs": 120000,
  "debug": false,
  "verbose": false
}
```

#### 方式三: 命令行参数 (推荐用于临时覆盖)

```bash
# 使用 DeepSeek
qoocode --api-key your-api-key --base-url https://api.deepseek.com/v1 --model deepseek-chat

# 使用 OpenAI
qoocode --api-key sk-your-openai-api-key --model gpt-4o

# 使用通义千问
qoocode --api-key your-api-key --base-url https://dashscope.aliyuncs.com/compatible-mode/v1 --model qwen-plus
```

### 2. 获取 API 密钥

qoocode 支持所有兼容 OpenAI API 的服务:

| 服务商 | 获取地址 | Base URL | 推荐模型 |
|--------|---------|----------|---------|
| **OpenAI** | https://platform.openai.com/api-keys | (默认) | gpt-4o, gpt-3.5-turbo |
| **DeepSeek** | https://platform.deepseek.com/api_keys | https://api.deepseek.com/v1 | deepseek-chat, deepseek-reasoner |
| **通义千问** | https://dashscope.console.aliyun.com/apiKey | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-plus, qwen-turbo |
| **智谱 GLM** | https://open.bigmodel.cn/usercenter/apikeys | https://open.bigmodel.cn/api/paas/v4 | glm-4 |
| **Moonshot (Kimi)** | https://platform.moonshot.cn/console/api-keys | https://api.moonshot.cn/v1 | moonshot-v1-8k |
| **Anthropic Claude** | https://console.anthropic.com/settings/keys | https://api.anthropic.com | claude-3-5-sonnet |

**示例配置:**

```bash
# DeepSeek (性价比高,推荐)
export OPENAI_API_KEY="sk-deepseek-api-key"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"
export OPENAI_MODEL="deepseek-chat"

# OpenAI GPT-4o (最强模型)
export OPENAI_API_KEY="sk-openai-api-key"
export OPENAI_MODEL="gpt-4o"

# 通义千问 (国内访问快)
export OPENAI_API_KEY="sk-aliyun-api-key"
export OPENAI_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export OPENAI_MODEL="qwen-plus"
```

### 3. 验证配置

配置完成后,运行以下命令验证:

```bash
# 显示当前配置信息
qoocode --help

# 直接运行程序
qoocode
```

如果配置正确,你会看到欢迎界面,可以开始对话了。

### 4. 常见问题

**Q: 提示 "OPENAI_API_KEY is required"?**
A: 请检查环境变量或配置文件是否正确设置,确保 API key 不为空。

**Q: 如何切换不同的模型?**
A: 有三种方式:
- 修改环境变量 `OPENAI_MODEL`
- 修改配置文件中的 `model` 字段
- 使用命令行参数 `--model xxx`

**Q: 可以同时配置多个服务商吗?**
A: 可以通过命令行参数临时切换,或在配置文件中保存多份配置,使用时通过命令行参数指定。

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

| 环境变量 | 描述 | 默认值 | 示例 |
|---------|------|--------|------|
| `OPENAI_API_KEY` | API 密钥(必需) | - | `sk-your-api-key` |
| `OPENAI_BASE_URL` | API 基础地址 | `https://api.openai.com/v1` | `https://api.deepseek.com/v1` |
| `OPENAI_MODEL` | 模型名称 | `deepseek-chat` | `gpt-4o`, `deepseek-chat` |
| `QOOCODE_MAX_TOKENS` | 最大输出 token 数 | 8192 | 4096, 16384 |
| `QOOCODE_DEBUG` | 调试模式 | false | 1, true |
| `QOOCODE_VERBOSE` | 详细输出模式 | false | 1, true |
| `QOOCODE_CONFIG` | 配置文件路径 | `~/.qoocode/config.json` | `/path/to/config.json` |

**配置优先级:** 命令行参数 > 环境变量 > 配置文件 > 默认值

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

本项目采用 [Apache-2.0 许可证](./LICENSE)。

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
