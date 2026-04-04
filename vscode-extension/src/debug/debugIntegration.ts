/**
 * QOOCODE VS Code Extension
 * Debug integration
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export class QOOCODEDebugAdapterTracker implements vscode.DebugAdapterTracker {
  private outputChannel: vscode.OutputChannel;
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('QOOCODE Debug');
  }

  onWillStartSession(): void {
    this.appendLine('[Debug] Session starting...');
  }

  onWillStopSession(): void {
    this.appendLine('[Debug] Session stopping...');
  }

  onError(error: Error): void {
    this.appendLine(`[Debug] Error: ${error.message}`);
  }

  onWillReceiveMessage(message: unknown): void {
    if (typeof message === 'object' && message !== null) {
      const msg = message as { command?: string };
      if (msg.command === 'variables' || msg.command === 'stackTrace') {
        // Log variable requests
        this.appendLine(`[Debug] → Request: ${msg.command}`);
      }
    }
  }

  onDidSendMessage(message: unknown): void {
    if (typeof message === 'object' && message !== null) {
      const msg = message as { type?: string; event?: string };
      if (msg.type === 'event' || msg.event) {
        this.appendLine(`[Debug] ← Event: ${msg.event || msg.type}`);
      }
    }
  }

  private appendLine(line: string): void {
    this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${line}`);
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

export class QOOCODEDebugAdapterTrackerFactory implements vscode.DebugAdapterTrackerFactory {
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  createDebugAdapterTracker(
    session: vscode.DebugSession
  ): vscode.ProviderResult<vscode.DebugAdapterTracker> {
    return new QOOCODEDebugAdapterTracker(this.config);
  }
}

export class QOOCODEDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  resolveDebugConfiguration(
    folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    // Add QOOCODE-specific debug configurations
    if (!config.type && !config.request && !config.name) {
      // Show a picker to choose debug type
      vscode.window.showQuickPick([
        { label: 'Node.js', value: 'node' },
        { label: 'Python', value: 'python' },
        { label: 'Go', value: 'go' },
        { label: 'Rust', value: 'rust' },
        { label: 'C++', value: 'cppvsdbg' }
      ]).then((selection) => {
        if (selection) {
          this.createDebugConfig(selection.value, folder);
        }
      });
      return undefined;
    }

    return config;
  }

  private async createDebugConfig(type: string, folder?: vscode.WorkspaceFolder): Promise<void> {
    // Use QOOCODE to help create debug configuration
    const prompt = `Create a debug configuration for ${type} in VS Code`;
    
    vscode.window.showInformationMessage(
      `QOOCODE: Would you like help creating a ${type} debug configuration?`,
      'Yes',
      'No'
    ).then(async (choice) => {
      if (choice === 'Yes') {
        vscode.commands.executeCommand('QOOCODE.chat', prompt);
      }
    });
  }

  provideDebugConfigurations(
    folder: vscode.WorkspaceFolder | undefined,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DebugConfiguration[]> {
    const configs: vscode.DebugConfiguration[] = [
      {
        type: 'node',
        request: 'launch',
        name: 'QOOCODE: Node.js',
        program: '${workspaceFolder}/${file}',
        skipFiles: ['<node_internals>/**']
      }
    ];

    return configs;
  }
}

export class QOOCODEBreakpointAnalyzer {
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  /**
   * Analyze breakpoint and suggest improvements
   */
  async analyzeBreakpoint(
    document: vscode.TextDocument,
    breakpoint: vscode.SourceBreakpoint
  ): Promise<BreakpointSuggestion | undefined> {
    const line = document.lineAt(breakpoint.location.range.start);
    const lineText = line.text;

    // Check for common patterns
    const suggestions: string[] = [];

    // Suggest adding conditions for loops
    if (lineText.includes('for') || lineText.includes('while')) {
      suggestions.push('Consider adding a condition to avoid infinite loops');
    }

    // Suggest logging for data inspection
    if (lineText.includes('function') || lineText.includes('=>')) {
      suggestions.push('Add log points to inspect function arguments');
    }

    // Check for async operations
    if (lineText.includes('await') || lineText.includes('Promise')) {
      suggestions.push('Async breakpoint - consider using async debugging tools');
    }

    if (suggestions.length === 0) {
      return undefined;
    }

    return {
      line: line.lineNumber,
      suggestions
    };
  }
}

interface BreakpointSuggestion {
  line: number;
  suggestions: string[];
}
