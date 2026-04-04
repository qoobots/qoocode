/**
 * qoocode VS Code Extension
 * Chat provider for tree view
 */

import * as vscode from 'vscode';
import { QoocodeConfig } from '../config/config';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export class QoocodeChatProvider implements vscode.TreeDataProvider<ChatTreeItem> {
  private messages: ChatMessage[] = [];
  private _onDidChangeTreeData = new vscode.EventEmitter<ChatTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private webviewPanel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private config: QoocodeConfig;

  constructor(context: vscode.ExtensionContext, config: QoocodeConfig) {
    this.context = context;
    this.config = config;

    // Add welcome message
    this.addMessage({
      type: 'assistant',
      content: 'Hello! I\'m qoocode, your AI coding assistant. How can I help you today?',
      timestamp: Date.now()
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: ChatTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: ChatTreeItem): vscode.ProviderResult<ChatTreeItem[]> {
    if (!element) {
      // Return messages grouped by date
      const groupedMessages = this.groupMessagesByDate();
      return groupedMessages;
    }

    return [];
  }

  private groupMessagesByDate(): ChatTreeItem[] {
    const groups = new Map<string, ChatMessage[]>();
    const items: ChatTreeItem[] = [];

    for (const message of this.messages) {
      const date = new Date(message.timestamp).toLocaleDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(message);
    }

    for (const [date, messages] of groups) {
      items.push(new ChatTreeItem(date, 'date', vscode.TreeItemCollapsibleState.Expanded));
      for (const msg of messages) {
        items.push(new ChatTreeItem(
          msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          msg.type,
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'qoocode.showMessage',
            title: 'Show Message',
            arguments: [msg]
          }
        ));
      }
    }

    return items;
  }

  addMessage(message: Omit<ChatMessage, 'id'>): ChatMessage {
    const msg: ChatMessage = {
      id: this.generateId(),
      ...message
    };
    this.messages.push(msg);
    this.refresh();
    return msg;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
    this.refresh();
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create or show webview panel
   */
  createWebviewPanel(): vscode.WebviewPanel {
    if (this.webviewPanel) {
      this.webviewPanel.reveal();
      return this.webviewPanel;
    }

    this.webviewPanel = vscode.window.createWebviewPanel(
      'qoocode.chat',
      'qoocode Chat',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionPath, 'resources')
        ]
      }
    );

    this.webviewPanel.webview.html = this.getWebviewHtml();

    this.webviewPanel.onDidDispose(() => {
      this.webviewPanel = undefined;
    });

    return this.webviewPanel;
  }

  private getWebviewHtml(): string {
    const theme = this.config.get('theme');
    const isDark = theme === 'dark' || (theme === 'auto' && vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>qoocode Chat</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      background-color: ${isDark ? '#1e1e1e' : '#ffffff'};
      color: ${isDark ? '#cccccc' : '#333333'};
    }
    .message {
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 8px;
    }
    .user {
      background-color: ${isDark ? '#264f78' : '#e3f2fd'};
      margin-left: 20%;
    }
    .assistant {
      background-color: ${isDark ? '#2d2d2d' : '#f5f5f5'};
      margin-right: 20%;
    }
    .system {
      background-color: ${isDark ? '#4a3f2f' : '#fff3e0'};
      font-style: italic;
    }
    .input-area {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }
    textarea {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid ${isDark ? '#404040' : '#e0e0e0'};
      background-color: ${isDark ? '#2d2d2d' : '#ffffff'};
      color: ${isDark ? '#cccccc' : '#333333'};
      resize: none;
      height: 80px;
    }
    button {
      padding: 12px 24px;
      border-radius: 8px;
      border: none;
      background-color: #007acc;
      color: white;
      cursor: pointer;
    }
    button:hover {
      background-color: #005a9e;
    }
  </style>
</head>
<body>
  <div id="messages"></div>
  <div class="input-area">
    <textarea id="input" placeholder="Ask qoocode..."></textarea>
    <button onclick="sendMessage()">Send</button>
  </div>
  <script>
    function addMessage(content, type) {
      const div = document.createElement('div');
      div.className = 'message ' + type;
      div.innerHTML = '<pre style="white-space: pre-wrap; margin: 0;">' + escapeHtml(content) + '</pre>';
      document.getElementById('messages').appendChild(div);
      window.scrollTo(0, document.body.scrollHeight);
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function sendMessage() {
      const input = document.getElementById('input');
      const message = input.value.trim();
      if (message) {
        addMessage(message, 'user');
        input.value = '';
        // Send to extension
        vscode.postMessage({ type: 'chat', content: message });
      }
    }

    document.getElementById('input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Listen for messages from extension
    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'response') {
        addMessage(message.content, 'assistant');
      }
    });
  </script>
</body>
</html>`;
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
    this.webviewPanel?.dispose();
  }
}

export class ChatTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly messageType: 'user' | 'assistant' | 'system' | 'date',
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);

    if (command) {
      this.command = command;
    }

    // Set icons based on type
    this.iconPath = this.getIcon();
  }

  private getIcon(): vscode.Uri | undefined {
    const extPath = vscode.extensions.getExtension('qoocode.qoocode')?.extensionPath;
    if (!extPath) return undefined;

    switch (this.messageType) {
      case 'user':
        return vscode.Uri.joinPath(vscode.Uri.file(extPath), 'resources', 'user-icon.svg');
      case 'assistant':
        return vscode.Uri.joinPath(vscode.Uri.file(extPath), 'resources', 'assistant-icon.svg');
      default:
        return undefined;
    }
  }

  contextValue = 'chatMessage';
}
