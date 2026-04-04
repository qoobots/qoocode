# qoocode

**Open Source AI Coding Assistant CLI**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.3-green.svg)](https://bun.sh/)
[![Test](https://img.shields.io/badge/Tests-113/124%20passed-brightgreen.svg)]()
[![GitHub Stars](https://img.shields.io/github/stars/qoobots/qoocode?style=social)]()

English | [中文](./README.md)

🚀 An open-source AI coding assistant CLI compatible with OpenAI/DeepSeek APIs, providing intelligent code assistance right in your terminal.

> qoocode is a fully open-source independent project, inspired by and referencing the [Claude Code source code](https://github.com/qoobots/opencode), with complete feature replication.

## ✨ Features

### Core Capabilities
| Category | Tools | Description |
|----------|-------|-------------|
| **File Operations** | 8 | Read, write, edit, copy, move, delete files and directories |
| **Git Operations** | 7 | Commit, diff, log, branch, status, tag, stash management |
| **Code Search** | 5 | Grep, glob, LSP, symbol search, references |
| **Web Capabilities** | 4 | Fetch, search, API calls, curl support |
| **Testing** | 4 | Run tests, coverage, watch mode, test generation |
| **Advanced** | 6 | Cache, hooks, auth, telemetry, update, MCP |

### Multi-Platform IDE Integration
- **VS Code Extension** - Full IDE integration for VS Code
- **JetBrains Plugin** - Native plugin for IntelliJ, PyCharm, WebStorm, and more

### 63 Slash Commands
`/help`, `/add`, `/test`, `/search`, `/git`, `/web`, `/edit`, `/delete`, `/explain`, `/refactor`, `/lint`, `/benchmark`, `/doc`, `/debug`, `/security`, `/mcp`, and more...

## 📦 Installation

### Option 1: Bun (Recommended)

```bash
# Install
bun install -g @qoobot/qoocode

# Configure API key (required on first use)
export OPENAI_API_KEY="your-api-key-here"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"

# Run
qoocode
```

### Option 2: npm

```bash
# Install
npm install -g @qoobot/qoocode

# Configure API key (required on first use)
export OPENAI_API_KEY="your-api-key-here"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"

# Run
qoocode
```

### Option 3: Download Binary

Download the executable for your platform from [Releases](https://github.com/qoobots/qoocode/releases):

| Platform | Download |
|----------|----------|
| Windows x64 | `qoocode.exe` |
| macOS x64 | `qoocode-macos` |
| macOS ARM64 | `qoocode-macos-arm64` |
| Linux x64 | `qoocode-linux` |

```bash
# Windows
.\qoocode.exe

# macOS / Linux
chmod +x qoocode
./qoocode
```

### Option 4: Build from Source

```bash
# Clone the repository
git clone https://github.com/qoobots/qoocode.git
cd qoocode

# Install dependencies
bun install

# Configure API key (required on first use)
export OPENAI_API_KEY="your-api-key-here"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"

# Build executable
bun run build:compile

# Run directly
bun run dev
```

## 🚀 Quick Start

### 1. Configure API Key

```bash
# Linux/macOS
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.deepseek.com/v1"
export OPENAI_MODEL="deepseek-chat"

# Windows (PowerShell)
$env:OPENAI_API_KEY="your-api-key"
$env:OPENAI_BASE_URL="https://api.deepseek.com/v1"
$env:OPENAI_MODEL="deepseek-chat"

# Windows (CMD)
set OPENAI_API_KEY=your-api-key
set OPENAI_BASE_URL=https://api.deepseek.com/v1
set OPENAI_MODEL=deepseek-chat
```

### 2. Run

```bash
qoocode

# Or use command line arguments
qoocode --api-key your-api-key --base-url https://api.deepseek.com/v1 --model deepseek-chat
```

## 📖 Usage Examples

### Interactive Conversation

```
You: Analyze the current project structure

Assistant: Analyzing...
  ✓ Found src/ directory with TypeScript source
  ✓ Config files: package.json, tsconfig.json
  ✓ Test files: vitest.config.ts
  ✓ 124 test cases passing
```

### Slash Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/test` | Run tests | `/test src/utils` |
| `/search` | Search code | `/search "async function"` |
| `/git` | Git operations | `/git "commit -m 'fix'"` |
| `/web` | Web search | `/web "TypeScript best practices"` |
| `/edit` | Edit file | `/edit src/app.ts:42` |
| `/explain` | Explain code | `/explain src/utils.ts` |
| `/refactor` | Refactor code | `/refactor "improve performance"` |
| `/doc` | Generate docs | `/doc src/api/` |
| `/mcp` | MCP tools | `/mcp "list servers"` |

### Direct Tool Usage

```
You: Create a REST API endpoint for user authentication

Assistant: Creating files...
  [FileWrite] src/api/auth/login.ts
  [FileWrite] src/api/auth/register.ts
  [FileWrite] src/middleware/auth.ts
  [FileEdit] src/routes.ts - Added auth routes
  [Bash] Running tests...
  ✓ All tests passed
```

## 🛠️ Tool Reference

### File Operations
| Tool | Description |
|------|-------------|
| **FileRead** | Read file with encoding support |
| **FileWrite** | Create/overwrite files |
| **FileEdit** | Precise string replacement |
| **CopyFile** | Copy with backup |
| **MoveFile** | Move with backup |
| **DeleteFile** | Safe delete with backup |

### Git Operations
| Tool | Description |
|------|-------------|
| **GitCommit** | Commit with auto-staging |
| **GitDiff** | View diff with syntax highlighting |
| **GitLog** | View commit history |
| **GitBranch** | Branch management |

### Code Intelligence
| Tool | Description |
|------|-------------|
| **Grep** | Full-text search with regex |
| **Glob** | Pattern-based file search |
| **LSP** | Language Server Protocol |
| **GotoDefinition** | Jump to definition |
| **FindReferences** | Find all references |

## 🔧 Configuration

### Config File Location

```bash
# Linux/macOS
~/.qoocode/config.json

# Windows
%USERPROFILE%\.qoocode\config.json
```

### Config Format

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

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | API key | - |
| `OPENAI_BASE_URL` | API base URL | `https://api.deepseek.com/v1` |
| `OPENAI_MODEL` | Model name | `deepseek-chat` |
| `QOOCODE_MAX_TOKENS` | Max tokens | `8192` |
| `QOOCODE_DEBUG` | Debug mode | `false` |
| `QOOCODE_VERBOSE` | Verbose output | `false` |
| `QOOCODE_CONFIG` | Config file path | `~/.qoocode/config.json` |

## ⌨️ CLI Options

```bash
qoocode [options]

Options:
  --api-key <key>         API key
  --base-url <url>        API base URL
  --model <name>          Model name (default: deepseek-chat)
  --temperature <value>   Temperature (default: 0.7)
  --max-tokens <count>    Max tokens (default: 8192)
  --timeout <ms>          Timeout (default: 60000ms)
  --config <path>         Config file path
  --debug                 Enable debug mode
  --verbose               Verbose output
  --no-cache              Disable cache
  --no-telemetry          Disable telemetry
  --help                  Show help
  --version               Show version
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Watch mode
bun run test:watch

# Coverage report
bun run test:coverage

# Specific test file
bun test src/utils.test.ts
```

## 📁 Project Structure

```
qoocode/
├── src/
│   ├── main.tsx                 # Entry point
│   ├── App.tsx                  # Main app component
│   ├── query.ts                 # Query logic
│   ├── tools/                   # Tool implementations
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
│   │   └── ...
│   ├── services/                # Service layer
│   │   ├── api/                 # API clients
│   │   ├── cache/               # Cache service
│   │   └── hook/                # Hook service
│   ├── state/                   # State management
│   ├── types/                   # Type definitions
│   └── utils/                   # Utilities
├── vscode-extension/            # VS Code extension
├── jetbrains-plugin/            # JetBrains plugin
├── tests/                       # Test files
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Workflow

```bash
# 1. Fork and clone
git clone https://github.com/qoobots/qoocode.git
cd qoocode

# 2. Create feature branch
git checkout -b feature/amazing-feature

# 3. Install dependencies
bun install

# 4. Make changes and test
bun test
bun run dev

# 5. Commit (follow conventional commits)
git commit -m 'feat: add amazing feature'

# 6. Push and create PR
git push origin feature/amazing-feature
```

### Commit Message Format

```
<type>(<scope>): <subject>

Types:
  feat:     New feature
  fix:      Bug fix
  docs:     Documentation
  style:    Formatting
  refactor: Code refactoring
  test:     Adding tests
  chore:    Maintenance
```

### Code Standards

- TypeScript strict mode enabled
- Run `bun test` before submitting PR
- Follow existing code style
- Add tests for new features

## ❓ FAQ

**Q: Which models are supported?**
A: qoocode supports any OpenAI API-compatible model including GPT-4, Claude, DeepSeek, and local models.

**Q: How does pricing work?**
A: You only pay for the API calls to your chosen provider. qoocode itself is free and open source.

**Q: Can I use it offline?**
A: Yes, if you have a local LLM server running (like Ollama) with OpenAI-compatible API.

**Q: Is my code sent to external servers?**
A: Only prompts and code snippets you explicitly request are sent to the API. No telemetry without consent.

**Q: How do I report bugs?**
A: Please open an issue on GitHub with detailed reproduction steps.

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

## 🙏 Acknowledgments

- [Ink](https://github.com/vadimdemedes/ink) - React for CLI
- [OpenAI](https://openai.com/) - GPT models
- [DeepSeek](https://deepseek.com/) - DeepSeek models
- [Bun](https://bun.sh/) - JavaScript runtime
- [Zod](https://zod.dev/) - TypeScript schema validation

## 📬 Contact

- GitHub Issues: [https://github.com/qoobots/qoocode/issues](https://github.com/qoobots/qoocode/issues)
- Email: your.email@example.com

---

<div align="center">

**If you find this project helpful, please give it a ⭐!**

</div>
