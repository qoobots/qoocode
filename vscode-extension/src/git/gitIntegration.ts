/**
 * QOOCODE VS Code Extension
 * Git integration
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export class QOOCODEGitIntegration {
  private config: QOOCODEConfig;
  private statusBarItem: vscode.StatusBarItem;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.statusBarItem = vscode.window.createStatusBarItem('QOOCODE.git', vscode.StatusBarAlignment.Left, 90);
    this.initialize();
  }

  private initialize(): void {
    // Watch for git operations
    vscode.workspace.onDidChangeWorkspaceFolder(() => {
      this.updateStatus();
    });

    // Update status on document change
    vscode.workspace.onDidChangeTextDocument(() => {
      this.updateStatus();
    });

    this.updateStatus();
  }

  private updateStatus(): void {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      this.statusBarItem.text = '$(git-commit) No Git';
      this.statusBarItem.color = '#f14c4c';
      this.statusBarItem.show();
      return;
    }

    const api = gitExtension.exports.getAPI(1);
    
    if (api.repositories.length === 0) {
      this.statusBarItem.text = '$(git-commit) No Repo';
      this.statusBarItem.color = '#f14c4c';
    } else {
      const repo = api.repositories[0];
      const branch = repo.state.HEAD?.name || 'unknown';
      const state = repo.state;

      // Determine git status
      let statusIcon = '$(git-commit)';
      let color = '#89d185';

      if (state.isStagingDirty || state.isDirty) {
        statusIcon = '$(git-dirty)';
        color = '#dcdcaa';
      }

      this.statusBarItem.text = `${statusIcon} ${branch}`;
      this.statusBarItem.color = color;
    }

    this.statusBarItem.show();
    this.statusBarItem.command = 'QOOCODE.git';
  }

  /**
   * Get git diff for QOOCODE review
   */
  async getGitDiff(): Promise<string> {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      return '';
    }

    const api = gitExtension.exports.getAPI(1);
    if (api.repositories.length === 0) {
      return '';
    }

    const repo = api.repositories[0];
    const changes = repo.state.changes;

    let diff = '# Git Changes\n\n';

    for (const group of changes) {
      diff += `## ${group.resourceGroup.name}\n\n`;
      for (const resource of group.resourceStates) {
        const uri = resource.resourceUri;
        const status = this.getResourceStatus(resource);
        diff += `- [${status}] ${uri.fsPath.split(/[/\\]/).pop()}\n`;
      }
      diff += '\n';
    }

    return diff;
  }

  private getResourceStatus(resource: unknown): string {
    // Simplified - would use proper type guards
    return 'M';
  }

  /**
   * Get commit message suggestion
   */
  async suggestCommitMessage(): Promise<string> {
    const diff = await this.getGitDiff();
    
    if (!diff) {
      return '';
    }

    // Send to QOOCODE for message generation
    vscode.commands.executeCommand('QOOCODE.chat', 
      `Suggest a commit message for these changes:\n${diff}`
    );

    return '';
  }

  /**
   * Review changes with QOOCODE
   */
  async reviewChanges(): Promise<void> {
    const diff = await this.getGitDiff();
    
    if (!diff) {
      vscode.window.showInformationMessage('No git changes to review');
      return;
    }

    vscode.commands.executeCommand('QOOCODE.chat', 
      `Review these git changes:\n${diff}`
    );
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}

export class QOOCODEGitDecorationProvider implements vscode.DecorationProvider {
  private config: QOOCODEConfig;
  private decorationType: vscode.TextEditorDecorationType;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.decorationType = vscode.window.createTextEditorDecorationType({
      isWholeLine: true,
      backgroundColor: 'rgba(100, 200, 100, 0.1)'
    });
  }

  provideDecorations(editor: vscode.TextEditor): void {
    // This would highlight AI-modified lines
    // For now, provide empty decorations
    editor.setDecorations(this.decorationType, []);
  }

  dispose(): void {
    this.decorationType.dispose();
  }
}

export class QOOCODEGitLensProvider {
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  /**
   * Get recent changes for a line
   */
  async getRecentChanges(uri: vscode.Uri, line: number): Promise<GitChange[]> {
    // This would query git history for recent changes
    return [];
  }

  /**
   * Get blame information
   */
  async getBlame(uri: vscode.Uri, line: number): Promise<BlameInfo | undefined> {
    // This would query git blame
    return undefined;
  }
}

interface GitChange {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

interface BlameInfo {
  author: string;
  date: Date;
  message: string;
  hash: string;
}
