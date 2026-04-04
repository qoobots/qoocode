/**
 * qoocode VS Code Extension
 * Workspace manager
 */

import * as vscode from 'vscode';
import { QoocodeConfig } from '../config/config';

export class QoocodeWorkspaceManager {
  private config: QoocodeConfig;
  private outputChannel: vscode.OutputChannel;

  constructor(config: QoocodeConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('qoocode');
  }

  /**
   * Get workspace root path
   */
  getWorkspaceRoot(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath;
    }
    return undefined;
  }

  /**
   * Get all workspace folders
   */
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
    return vscode.workspace.workspaceFolders || [];
  }

  /**
   * Get relative path from workspace root
   */
  getRelativePath(uri: vscode.Uri): string | undefined {
    const root = this.getWorkspaceRoot();
    if (!root) return undefined;

    const absolutePath = uri.fsPath;
    if (absolutePath.startsWith(root)) {
      return absolutePath.substring(root.length + 1);
    }
    return undefined;
  }

  /**
   * Get workspace configuration
   */
  getWorkspaceConfig(): WorkspaceConfig {
    return {
      root: this.getWorkspaceRoot(),
      folders: this.getWorkspaceFolders().map(f => f.uri.fsPath),
      hasMultipleFolders: (vscode.workspace.workspaceFolders?.length || 0) > 1
    };
  }

  /**
   * Show output channel
   */
  showOutput(): void {
    this.outputChannel.show();
  }

  /**
   * Append to output channel
   */
  appendOutput(message: string): void {
    this.outputChannel.appendLine(`[${new Date().toLocaleTimeString()}] ${message}`);
  }

  /**
   * Clear output channel
   */
  clearOutput(): void {
    this.outputChannel.clear();
  }

  /**
   * Find files in workspace
   */
  async findFiles(pattern: string, maxResults: number = 100): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(pattern, undefined, maxResults);
  }

  /**
   * Read file contents
   */
  async readFile(uri: vscode.Uri): Promise<string | undefined> {
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      return document.getText();
    } catch {
      return undefined;
    }
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}

interface WorkspaceConfig {
  root: string | undefined;
  folders: string[];
  hasMultipleFolders: boolean;
}

export class QoocodeTaskProvider implements vscode.TaskProvider {
  private config: QoocodeConfig;

  constructor(config: QoocodeConfig) {
    this.config = config;
  }

  provideTasks(token?: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
    const tasks: vscode.Task[] = [];

    // qoocode: Analyze Task
    const analyzeTask = new vscode.Task(
      { type: 'qoocode', task: 'analyze' },
      vscode.TaskScope.Workspace,
      'Analyze with qoocode',
      'qoocode',
      new vscode.ShellExecution('qoocode analyze'),
      '$qoocode'
    );
    analyzeTask.group = vscode.TaskGroup.Build;
    analyzeTask.isBackground = false;
    tasks.push(analyzeTask);

    // qoocode: Review Task
    const reviewTask = new vscode.Task(
      { type: 'qoocode', task: 'review' },
      vscode.TaskScope.Workspace,
      'Review with qoocode',
      'qoocode',
      new vscode.ShellExecution('qoocode review'),
      '$qoocode'
    );
    reviewTask.group = vscode.TaskGroup.Build;
    reviewTask.isBackground = false;
    tasks.push(reviewTask);

    return tasks;
  }

  resolveTask(task: vscode.Task, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
    return task;
  }
}
