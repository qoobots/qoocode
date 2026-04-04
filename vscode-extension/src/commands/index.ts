/**
 * qoocode VS Code Extension
 * Command registration
 */

import * as vscode from 'vscode';
import { QoocodeConfig } from '../config/config';
import { QoocodeChatProvider } from '../chat/chatProvider';
import { QoocodeTerminalManager } from '../terminal/terminalManager';
import { QoocodeStatusBar } from '../statusbar/statusBar';

interface QoocodeServices {
  chatProvider?: QoocodeChatProvider;
  terminalManager?: QoocodeTerminalManager;
  statusBar?: QoocodeStatusBar;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  config: QoocodeConfig,
  services: QoocodeServices
): void {
  const { chatProvider, terminalManager, statusBar } = services;

  // Start qoocode
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.start', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;
      if (terminalManager) {
        await terminalManager.createTerminal(workspacePath);
        statusBar?.setStatus('running');
      }
    })
  );

  // Open chat panel
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.chat', async () => {
      await vscode.commands.executeCommand('qoocode.chat.focus');
    })
  );

  // Configure qoocode
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.config', async () => {
      await vscode.commands.executeCommand(
        'workbench.action.openSettings',
        'qoocode'
      );
    })
  );

  // Stop qoocode
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.stop', async () => {
      terminalManager?.stopCurrentSession();
      statusBar?.setStatus('stopped');
    })
  );

  // Restart qoocode
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.restart', async () => {
      terminalManager?.stopCurrentSession();
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        await terminalManager?.createTerminal(workspaceFolders[0].uri.fsPath);
        statusBar?.setStatus('running');
      }
    })
  );

  // Show status
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.status', async () => {
      const status = statusBar?.getStatus();
      const model = config.get('model');
      vscode.window.showInformationMessage(
        `qoocode Status: ${status}\nModel: ${model}`,
        'OK'
      );
    })
  );

  // Quick chat with selection
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.quickChat', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText) {
        vscode.window.showWarningMessage('No text selected');
        return;
      }

      // Send to chat provider
      if (chatProvider) {
        chatProvider.addMessage({
          type: 'user',
          content: selectedText,
          timestamp: Date.now()
        });
        await vscode.commands.executeCommand('qoocode.chat.focus');
      }
    })
  );

  // Explain code
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.explain', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText) return;

      if (chatProvider) {
        chatProvider.addMessage({
          type: 'user',
          content: `Explain this code:\n\`\`\`\n${selectedText}\n\`\`\``,
          timestamp: Date.now()
        });
        await vscode.commands.executeCommand('qoocode.chat.focus');
      }
    })
  );

  // Fix error
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.fix', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText) return;

      if (chatProvider) {
        chatProvider.addMessage({
          type: 'user',
          content: `Fix this error:\n\`\`\`\n${selectedText}\n\`\`\``,
          timestamp: Date.now()
        });
        await vscode.commands.executeCommand('qoocode.chat.focus');
      }
    })
  );

  // Refactor code
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.refactor', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (!selectedText) return;

      if (chatProvider) {
        chatProvider.addMessage({
          type: 'user',
          content: `Refactor this code:\n\`\`\`\n${selectedText}\n\`\`\``,
          timestamp: Date.now()
        });
        await vscode.commands.executeCommand('qoocode.chat.focus');
      }
    })
  );

  // Send message to qoocode
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.send', async (message: string) => {
      if (chatProvider) {
        chatProvider.addMessage({
          type: 'user',
          content: message,
          timestamp: Date.now()
        });
      }
    })
  );

  // Clear chat
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.clear', async () => {
      if (chatProvider) {
        chatProvider.clearMessages();
      }
    })
  );

  // Analyze file
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.analyze', async (uri?: vscode.Uri) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri) {
        vscode.window.showWarningMessage('No file open');
        return;
      }

      const document = await vscode.workspace.openTextDocument(targetUri);
      if (chatProvider) {
        chatProvider.addMessage({
          type: 'user',
          content: `Analyze this file:\n\`\`\`\n${document.getText()}\n\`\`\``,
          timestamp: Date.now()
        });
        await vscode.commands.executeCommand('qoocode.chat.focus');
      }
    })
  );

  // Review file
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.review', async (uri?: vscode.Uri, position?: vscode.Position) => {
      const targetUri = uri || vscode.window.activeTextEditor?.document.uri;
      if (!targetUri) {
        vscode.window.showWarningMessage('No file open');
        return;
      }

      const document = await vscode.workspace.openTextDocument(targetUri);
      let content = document.getText();

      // If position provided, get context around it
      if (position) {
        const range = new vscode.Range(
          Math.max(0, position.line - 5),
          0,
          Math.min(document.lineCount - 1, position.line + 20),
          0
        );
        content = document.getText(range);
      }

      if (chatProvider) {
        chatProvider.addMessage({
          type: 'user',
          content: `Review this code:\n\`\`\`\n${content}\n\`\`\``,
          timestamp: Date.now()
        });
        await vscode.commands.executeCommand('qoocode.chat.focus');
      }
    })
  );

  // Complete code
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.complete', async (uri?: vscode.Uri, position?: vscode.Position) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const cursorPosition = selection.active;

      if (chatProvider) {
        chatProvider.addMessage({
          type: 'user',
          content: 'Suggest a completion for the current code context.',
          timestamp: Date.now()
        });
        await vscode.commands.executeCommand('qoocode.chat.focus');
      }
    })
  );

  // Show output
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.output', async () => {
      const output = vscode.window.createOutputChannel('qoocode');
      output.show();
    })
  );

  // Show keyboard shortcuts
  context.subscriptions.push(
    vscode.commands.registerCommand('qoocode.shortcuts', async () => {
      const shortcuts: Array<{ key: string; command: string }> = [
        { key: 'Ctrl+Shift+O', command: 'Start qoocode' },
        { key: 'Ctrl+Shift+C', command: 'Open Chat' },
        { key: 'Ctrl+Shift+/', command: 'Quick Chat (with selection)' }
      ];

      const items = shortcuts.map(s => ({
        label: s.key,
        description: s.command
      }));

      await vscode.window.showQuickPick(items, {
        placeHolder: 'qoocode Keyboard Shortcuts'
      });
    })
  );
}
