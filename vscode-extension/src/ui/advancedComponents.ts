/**
 * QOOCODE VS Code Extension
 * Advanced UI Components
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

/**
 * Floating action panel
 */
export class QOOCODEFloatingPanel {
  private panel: vscode.WebviewPanel | undefined;
  private config: QOOCODEConfig;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, config: QOOCODEConfig) {
    this.context = context;
    this.config = config;
  }

  /**
   * Show floating action panel
   */
  show(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'QOOCODE.floating',
      'QOOCODE Actions',
      {
        viewColumn: vscode.ViewColumn.Two,
        preserveFocus: true
      },
      {
        floating: true,
        resizable: true
      }
    );

    this.panel.webview.html = this.getHtml();
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: sans-serif;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
    }
    .action {
      background: rgba(255,255,255,0.2);
      padding: 12px;
      margin: 8px 0;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .action:hover {
      background: rgba(255,255,255,0.3);
    }
  </style>
</head>
<body>
  <h2>Quick Actions</h2>
  <div class="action" onclick="execute('start')">🚀 Start Session</div>
  <div class="action" onclick="execute('explain')">✨ Explain Code</div>
  <div class="action" onclick="execute('review')">🔍 Review Changes</div>
  <div class="action" onclick="execute('test')">🧪 Run Tests</div>
  <script>
    function execute(action) {
      vscode.postMessage({ command: action });
    }
  </script>
</body>
</html>`;
  }
}

/**
 * Quick picker with AI suggestions
 */
export class QOOCODEQuickPicker {
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  /**
   * Show AI-powered quick picker
   */
  async showSuggestions(
    context: string,
    suggestions: string[]
  ): Promise<string | undefined> {
    const items = suggestions.map(s => ({
      label: s,
      picked: false
    }));

    const result = await vscode.window.showQuickPick(items, {
      placeHolder: `Suggestions for: ${context}`,
      matchOnDescription: true,
      canPickMany: false
    });

    return result?.label;
  }

  /**
   * Show file picker with preview
   */
  async showFilePicker(): Promise<vscode.Uri | undefined> {
    const files = await vscode.workspace.findFiles('**/*.{ts,js,py,go,rs}');
    
    const items = files.slice(0, 50).map(uri => ({
      label: uri.fsPath.split(/[/\\]/).pop() || '',
      description: uri.fsPath,
      uri
    }));

    const result = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a file',
      matchOnDescription: true
    });

    return result?.uri;
  }
}

/**
 * Code snippet manager
 */
export class QOOCODESnippetManager {
  private config: QOOCODEConfig;
  private snippets: Map<string, Snippet> = new Map();

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.loadDefaultSnippets();
  }

  private loadDefaultSnippets(): void {
    this.snippets.set('error-handler', {
      name: 'Error Handler',
      body: `try {
  // code
} catch (error) {
  console.error('Error:', error);
  throw error;
}`,
      language: 'typescript'
    });

    this.snippets.set('async-function', {
      name: 'Async Function',
      body: `async function ${1:name}(${2:params}) {
  try {
    ${3:// implementation}
  } catch (error) {
    console.error('Error in ${1:name}:', error);
    throw error;
  }
}`,
      language: 'typescript'
    });

    this.snippets.set('react-component', {
      name: 'React Component',
      body: `import React from 'react';

interface ${1:Name}Props {}

export const ${1:Name}: React.FC<${1:Name}Props> = ({}) => {
  return (
    <div>
      ${2:// content}
    </div>
  );
};`,
      language: 'typescript'
    });
  }

  /**
   * Get snippet by name
   */
  get(name: string): Snippet | undefined {
    return this.snippets.get(name);
  }

  /**
   * Insert snippet at cursor
   */
  async insert(name: string): Promise<void> {
    const snippet = this.snippets.get(name);
    if (!snippet) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const snippetString = new vscode.SnippetString(snippet.body);
    editor.insertSnippet(snippetString);
  }

  /**
   * List all snippets
   */
  list(): Snippet[] {
    return Array.from(this.snippets.values());
  }

  /**
   * Add custom snippet
   */
  add(name: string, snippet: Snippet): void {
    this.snippets.set(name, snippet);
  }
}

interface Snippet {
  name: string;
  body: string;
  language: string;
}

/**
 * Activity bar widget
 */
export class QOOCODEActivityBarWidget {
  private config: QOOCODEConfig;
  private statusItem: vscode.StatusBarItem;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.statusItem = vscode.window.createStatusBarItem(
      'QOOCODE.activity',
      vscode.StatusBarAlignment.Left,
      80
    );
  }

  /**
   * Update activity status
   */
  update(status: ActivityStatus): void {
    switch (status.type) {
      case 'idle':
        this.statusItem.text = '$(circle-outline) QOOCODE';
        this.statusItem.color = undefined;
        break;
      case 'working':
        this.statusItem.text = '$(sync~spin) QOOCODE';
        this.statusItem.color = '#89d185';
        break;
      case 'thinking':
        this.statusItem.text = '$(light-bulb) QOOCODE';
        this.statusItem.color = '#dcdcaa';
        break;
      case 'error':
        this.statusItem.text = '$(error) QOOCODE';
        this.statusItem.color = '#f14c4c';
        break;
    }

    this.statusItem.tooltip = status.message || 'QOOCODE';
    this.statusItem.command = 'QOOCODE.chat';
    this.statusItem.show();
  }

  dispose(): void {
    this.statusItem.dispose();
  }
}

interface ActivityStatus {
  type: 'idle' | 'working' | 'thinking' | 'error';
  message?: string;
}

/**
 * Mini map integration
 */
export class QOOCODEMiniMapEnhancement {
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  /**
   * Highlight current context in minimap
   */
  highlightInMinimap(editor: vscode.TextEditor): void {
    // Would highlight current context in minimap
    // VS Code API doesn't directly support minimap modification
  }
}
