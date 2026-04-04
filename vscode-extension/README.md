# QOOCODE VS Code Extension

VS Code extension for QOOCODE AI coding assistant.

## Features

- **Integrated AI Assistant**: Full QOOCODE CLI integration within VS Code
- **Chat Panel**: Dedicated chat view for AI interactions
- **Context-Aware Commands**: Right-click context menu for code actions
- **Terminal Integration**: Built-in terminal for QOOCODE sessions
- **Status Bar**: Real-time status and model information
- **Keyboard Shortcuts**: Quick access to QOOCODE features

## Commands

| Command | Description | Shortcut |
|---------|-------------|----------|
| `QOOCODE.start` | Start QOOCODE session | `Ctrl+Shift+O` |
| `QOOCODE.chat` | Open chat panel | `Ctrl+Shift+C` |
| `QOOCODE.quickChat` | Quick chat with selection | `Ctrl+Shift+/` |
| `QOOCODE.config` | Configure QOOCODE | - |
| `QOOCODE.stop` | Stop session | - |
| `QOOCODE.restart` | Restart session | - |
| `QOOCODE.status` | Show status | - |
| `QOOCODE.explain` | Explain code | - |
| `QOOCODE.fix` | Fix error | - |
| `QOOCODE.refactor` | Refactor code | - |

## Configuration

```json
{
  "QOOCODE.apiKey": "your-api-key",
  "QOOCODE.model": "claude-opus-4-5",
  "QOOCODE.autoStart": false,
  "QOOCODE.theme": "auto"
}
```

## Installation

1. Clone the repository
2. Run `npm install`
3. Run `npm run compile`
4. Press `F5` to debug

## License

MIT
