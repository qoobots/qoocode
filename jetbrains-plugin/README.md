# QOOCODE JetBrains Plugin

QOOCODE AI-powered code assistant plugin for JetBrains IDEs.

## Features

- **Chat Interface**: Interactive AI chat directly in your IDE
- **Code Analysis**: Analyze files with AI-powered insights
- **Code Explanation**: Get explanations for selected code
- **Refactoring Suggestions**: AI-driven refactoring recommendations
- **Test Generation**: Generate unit tests automatically
- **Git Integration**: AI-assisted git operations
- **Terminal Integration**: AI-enhanced terminal experience

## Supported IDEs

- IntelliJ IDEA
- PyCharm
- WebStorm
- PhpStorm
- RubyMine
- GoLand
- DataGrip
- Rider
- Android Studio
- CLion

## Requirements

- JetBrains IDE 2023.1 or later
- Java 17 or later

## Installation

### From JetBrains Marketplace

1. Open JetBrains IDE
2. Go to Settings > Plugins
3. Search for "QOOCODE"
4. Click Install

### From Source

```bash
./gradlew build
./gradlew runIde  # Test in sandbox IDE
```

## Configuration

### API Settings

1. Open Settings > Tools > QOOCODE
2. Configure API URL and API Key
3. Select your preferred AI model

### General Settings

- Auto-start: Start QOOCODE when opening a project
- Telemetry: Enable anonymous usage statistics
- Theme: Choose light/dark appearance

## Usage

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Open QOOCODE | `Ctrl+Shift+O` | `Cmd+Shift+O` |

### Chat Interface

1. Press `Ctrl+Shift+O` to open QOOCODE
2. Type your question or request
3. Press `Enter` to send

### Code Analysis

1. Open a file in the editor
2. Right-click > "Analyze with QOOCODE"
3. View AI-generated analysis

### Quick Actions

- **Explain**: Select code > Right-click > "Explain Code"
- **Refactor**: Select code > Right-click > "Refactor with QOOCODE"
- **Test**: Select code > Right-click > "Generate Test"

## Architecture

```
src/
├── main/
│   ├── java/QOOCODE/plugin/
│   │   ├── QOOCODEPlugin.java        # Main plugin entry
│   │   ├── QOOCODEChatPanel.java      # Chat UI
│   │   ├── QOOCODEToolWindowFactory.java
│   │   ├── QOOCODEConfig.java         # Settings
│   │   ├── QOOCODEConfigurable.java   # Settings UI
│   │   ├── QOOCODEStatusBarWidget.java
│   │   └── actions/                    # Actions
│   │       ├── QOOCODEMainAction.java
│   │       ├── QOOCODEChatAction.java
│   │       ├── QOOCODEAnalyzeAction.java
│   │       ├── QOOCODEExplainAction.java
│   │       ├── QOOCODERefactorAction.java
│   │       ├── QOOCODEGenerateTestAction.java
│   │       └── QOOCODESettingsAction.java
│   └── kotlin/QOOCODE/plugin/
│       └── QOOCODEKotlinIntegration.kt
└── resources/META-INF/
    └── plugin.xml                       # Plugin configuration
```

## API Integration

The plugin integrates with the QOOCODE API:

```java
// Configuration
config.setApiUrl("http://localhost:8080");
config.setApiKey("your-api-key");

// Send message
chatPanel.addMessage(new ChatMessage(MessageRole.USER, "Hello"));
```

## Development

### Prerequisites

- JDK 17+
- Gradle 8.4+

### Build

```bash
./gradlew build
```

### Run

```bash
./gradlew runIde
```

### Test

```bash
./gradlew test
```

## Version History

### v0.1.30 (Current)

- Initial JetBrains plugin release
- Chat interface
- Code analysis
- Git integration
- Terminal integration
- File operations
- Search and navigation

## License

MIT License

## Support

- GitHub Issues: https://github.com/QOOCODE/QOOCODE/issues
- Documentation: https://QOOCODE.example.com/docs
