# qoocode VS Code Extension

VS Code extension for qoocode AI coding assistant.

## Features

- **Integrated AI Assistant**: Full qoocode CLI integration within VS Code
- **Chat Panel**: Dedicated chat view for AI interactions
- **Context-Aware Commands**: Right-click context menu for code actions
- **Terminal Integration**: Built-in terminal for qoocode sessions
- **Status Bar**: Real-time status and model information
- **Keyboard Shortcuts**: Quick access to qoocode features

## Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `qoocode.start` | Start qoocode session | `Ctrl+Shift+O` |
| `qoocode.chat` | Open chat panel | `Ctrl+Shift+C` |
| `qoocode.quickChat` | Quick chat with selection | `Ctrl+Shift+/` |
| `qoocode.config` | Configure qoocode | - |
| `qoocode.stop` | Stop session | - |
| `qoocode.restart` | Restart session | - |
| `qoocode.status` | Show status | - |
| `qoocode.explain` | Explain code | - |
| `qoocode.fix` | Fix error | - |
| `qoocode.refactor` | Refactor code | - |

## Configuration

```json
{
  "qoocode.apiKey": "your-api-key",
  "qoocode.model": "claude-opus-4-5",
  "qoocode.autoStart": false,
  "qoocode.theme": "auto"
}
```

## Installation

1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Press `F5` to debug

## License

Apache 2.0
