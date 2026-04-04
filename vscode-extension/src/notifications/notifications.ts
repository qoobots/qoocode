/**
 * QOOCODE VS Code Extension
 * Notifications and progress system
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export class QOOCODENotificationManager {
  private config: QOOCODEConfig;
  private outputChannel: vscode.OutputChannel;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('QOOCODE Notifications');
  }

  /**
   * Show info notification
   */
  info(message: string, options?: NotificationOptions): void {
    if (!this.config.get('showNotifications')) {
      return;
    }
    vscode.window.showInformationMessage(message, ...(options?.actions || [])).then((action) => {
      if (action && options?.onAction) {
        options.onAction(action);
      }
    });
  }

  /**
   * Show warning notification
   */
  warning(message: string, options?: NotificationOptions): void {
    if (!this.config.get('showNotifications')) {
      return;
    }
    vscode.window.showWarningMessage(message, ...(options?.actions || [])).then((action) => {
      if (action && options?.onAction) {
        options.onAction(action);
      }
    });
  }

  /**
   * Show error notification
   */
  error(message: string, options?: NotificationOptions): void {
    if (!this.config.get('showNotifications')) {
      return;
    }
    vscode.window.showErrorMessage(message, ...(options?.actions || [])).then((action) => {
      if (action && options?.onAction) {
        options.onAction(action);
      }
    });
  }

  /**
   * Log to output channel
   */
  log(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

interface NotificationOptions {
  actions?: string[];
  onAction?: (action: string) => void;
}

export class QOOCODEProgressManager {
  private config: QOOCODEConfig;
  private progressMap: Map<string, vscode.Progress<{ message?: string; increment?: number }>> = new Map();

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  /**
   * Start a progress indicator
   */
  start(title: string, id: string = 'default'): vscode.Progress<{ message?: string; increment?: number }> {
    const progress = vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
      },
      (progress) => {
        return new Promise<void>((resolve) => {
          this.progressMap.set(id, progress);
          // Store resolve to call later
          (progress as any)._resolve = resolve;
        });
      }
    );

    return {
      report: (value: { message?: string; increment?: number }) => {
        progress.progress.report(value);
      }
    };
  }

  /**
   * Report progress
   */
  report(id: string, message: string, increment?: number): void {
    const progress = this.progressMap.get(id);
    if (progress) {
      progress.report({ message, increment });
    }
  }

  /**
   * End progress
   */
  end(id: string = 'default'): void {
    const progress = this.progressMap.get(id);
    if (progress && (progress as any)._resolve) {
      (progress as any)._resolve();
      this.progressMap.delete(id);
    }
  }
}

export class QOOCODEWelcomeView {
  private config: QOOCODEConfig;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, config: QOOCODEConfig) {
    this.config = config;
    this.context = context;
  }

  /**
   * Show welcome view
   */
  async show(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'QOOCODE.welcome',
      'Welcome to QOOCODE',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.webview.html = this.getWelcomeHtml();
  }

  private getWelcomeHtml(): string {
    const theme = this.config.get('theme');
    const isDark = theme === 'dark' || (theme === 'auto' && vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      background-color: ${isDark ? '#1e1e1e' : '#ffffff'};
      color: ${isDark ? '#cccccc' : '#333333'};
      text-align: center;
    }
    h1 { color: #007acc; margin-bottom: 20px; }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 40px 0;
      text-align: left;
    }
    .feature {
      padding: 20px;
      border-radius: 8px;
      background-color: ${isDark ? '#2d2d2d' : '#f5f5f5'};
    }
    .feature h3 { margin-top: 0; color: #007acc; }
    button {
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      background-color: #007acc;
      color: white;
      cursor: pointer;
      font-size: 16px;
      margin: 10px;
    }
    button:hover { background-color: #005a9e; }
    .shortcuts {
      margin-top: 40px;
      padding: 20px;
      background-color: ${isDark ? '#2d2d2d' : '#f5f5f5'};
      border-radius: 8px;
    }
    .shortcut {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    kbd {
      background-color: ${isDark ? '#3c3c3c' : '#e0e0e0'};
      padding: 4px 8px;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>🎉 Welcome to QOOCODE</h1>
  <p>Your AI-powered coding assistant is ready!</p>

  <div class="features">
    <div class="feature">
      <h3>🚀 Quick Start</h3>
      <p>Press <kbd>Ctrl+Shift+O</kbd> to start a new QOOCODE session</p>
    </div>
    <div class="feature">
      <h3>💬 Chat</h3>
      <p>Press <kbd>Ctrl+Shift+C</kbd> to open the chat panel</p>
    </div>
    <div class="feature">
      <h3>✨ Code Actions</h3>
      <p>Select code and right-click for AI-powered actions</p>
    </div>
    <div class="feature">
      <h3>🔍 Code Review</h3>
      <p>Use CodeLens to explain and review code</p>
    </div>
  </div>

  <button onclick="vscode.postMessage({ command: 'start' })">Get Started</button>
  <button onclick="vscode.postMessage({ command: 'configure' })">Configure</button>

  <div class="shortcuts">
    <h3>Keyboard Shortcuts</h3>
    <div class="shortcut"><span>Start QOOCODE</span><kbd>Ctrl+Shift+O</kbd></div>
    <div class="shortcut"><span>Open Chat</span><kbd>Ctrl+Shift+C</kbd></div>
    <div class="shortcut"><span>Quick Chat</span><kbd>Ctrl+Shift+/</kbd></div>
  </div>

  <script>
    window.addEventListener('message', (event) => {
      const { command } = event.data;
      if (command === 'start') {
        vscode.postMessage({ command: 'execute', id: 'QOOCODE.start' });
      } else if (command === 'configure') {
        vscode.postMessage({ command: 'execute', id: 'QOOCODE.config' });
      }
    });
  </script>
</body>
</html>`;
  }
}
