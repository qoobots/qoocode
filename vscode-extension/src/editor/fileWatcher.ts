/**
 * qoocode VS Code Extension
 * File watcher and event handling
 */

import * as vscode from 'vscode';
import { QoocodeConfig } from '../config/config';

export class QoocodeFileWatcher {
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private config: QoocodeConfig;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext, config: QoocodeConfig) {
    this.context = context;
    this.config = config;
    this.registerWatcher();
  }

  private registerWatcher(): void {
    // Watch for file changes
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      '**/*.{ts,tsx,js,jsx,py,go,rs}',
      false,  // ignoreCreateEvents
      true,   // ignoreChangeEvents
      false   // ignoreDeleteEvents
    );

    // Handle file saves
    this.fileWatcher.onDidSave((uri) => {
      this.onFileSaved(uri);
    });

    this.context.subscriptions.push(this.fileWatcher);
  }

  private async onFileSaved(uri: vscode.Uri): Promise<void> {
    // Check if auto-analyze is enabled
    const document = await vscode.workspace.openTextDocument(uri);
    
    // Show notification for large files
    if (document.lineCount > 500) {
      const choice = await vscode.window.showInformationMessage(
        `File "${uri.fsPath.split(/[/\\]/).pop()}" has ${document.lineCount} lines. Would you like qoocode to review it?`,
        'Review',
        'Ignore'
      );

      if (choice === 'Review') {
        vscode.commands.executeCommand('qoocode.review', uri);
      }
    }
  }

  dispose(): void {
    this.fileWatcher?.dispose();
  }
}

export class QoocodeDocumentManager {
  private config: QoocodeConfig;
  private recentDocuments: vscode.Uri[] = [];

  constructor(config: QoocodeConfig) {
    this.config = config;
    this.registerHandlers();
  }

  private registerHandlers(): void {
    // Track document opens
    vscode.workspace.onDidOpenTextDocument((document) => {
      this.trackDocument(document.uri);
    });

    // Track document closes
    vscode.workspace.onDidCloseTextDocument((document) => {
      this.removeFromRecent(document.uri);
    });
  }

  private trackDocument(uri: vscode.Uri): void {
    // Remove if already exists
    this.removeFromRecent(uri);
    
    // Add to front
    this.recentDocuments.unshift(uri);
    
    // Keep only last 20
    if (this.recentDocuments.length > 20) {
      this.recentDocuments.pop();
    }
  }

  private removeFromRecent(uri: vscode.Uri): void {
    const index = this.recentDocuments.findIndex(u => u.fsPath === uri.fsPath);
    if (index > -1) {
      this.recentDocuments.splice(index, 1);
    }
  }

  getRecentDocuments(): vscode.Uri[] {
    return [...this.recentDocuments];
  }

  getDocumentContext(): string {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return 'No active editor';
    }

    const document = editor.document;
    const selection = editor.selection;

    let context = `File: ${document.fileName}\n`;
    context += `Language: ${document.languageId}\n`;
    context += `Lines: ${document.lineCount}\n`;

    if (!selection.isEmpty) {
      context += `\nSelected text (lines ${selection.start.line + 1}-${selection.end.line + 1}):\n`;
      context += document.getText(selection);
    } else {
      context += '\nNo text selected';
    }

    return context;
  }
}
