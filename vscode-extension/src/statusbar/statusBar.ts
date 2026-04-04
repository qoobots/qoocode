/**
 * QOOCODE VS Code Extension
 * Status bar management
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export type QOOCODEStatus = 'idle' | 'running' | 'thinking' | 'stopped' | 'error';

export class QOOCODEStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private status: QOOCODEStatus = 'idle';
  private config: QOOCODEConfig;
  private statusUpdateTimeout: NodeJS.Timeout | undefined;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.statusBarItem = vscode.window.createStatusBarItem(
      'QOOCODE.status',
      vscode.StatusBarAlignment.Left,
      100
    );

    this.statusBarItem.command = 'QOOCODE.chat';
    this.statusBarItem.text = '$(robot) QOOCODE';
    this.statusBarItem.tooltip = 'QOOCODE AI Assistant';
  }

  show(): void {
    this.statusBarItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
  }

  setStatus(status: QOOCODEStatus, message?: string): void {
    this.status = status;

    // Clear any pending timeout
    if (this.statusUpdateTimeout) {
      clearTimeout(this.statusUpdateTimeout);
      this.statusUpdateTimeout = undefined;
    }

    // Update status bar
    switch (status) {
      case 'idle':
        this.statusBarItem.text = '$(robot) QOOCODE: Idle';
        this.statusBarItem.color = undefined;
        break;

      case 'running':
        this.statusBarItem.text = '$(loading~spin) QOOCODE: Running';
        this.statusBarItem.color = '#89d185'; // Green
        break;

      case 'thinking':
        this.statusBarItem.text = '$(sync~spin) QOOCODE: Thinking';
        this.statusBarItem.color = '#dcdcaa'; // Yellow
        break;

      case 'stopped':
        this.statusBarItem.text = '$(debug-stop) QOOCODE: Stopped';
        this.statusBarItem.color = '#f14c4c'; // Red
        break;

      case 'error':
        this.statusBarItem.text = '$(error) QOOCODE: Error';
        this.statusBarItem.color = '#f14c4c'; // Red
        break;
    }

    // Update tooltip
    if (message) {
      this.statusBarItem.tooltip = message;
    } else {
      this.statusBarItem.tooltip = `QOOCODE AI Assistant\nStatus: ${status}`;
    }

    // Auto-reset thinking status after timeout
    if (status === 'thinking') {
      this.statusUpdateTimeout = setTimeout(() => {
        if (this.status === 'thinking') {
          this.statusBarItem.text = '$(robot) QOOCODE';
          this.statusBarItem.color = undefined;
        }
      }, 5000);
    }
  }

  getStatus(): QOOCODEStatus {
    return this.status;
  }

  setModel(model: string): void {
    this.statusBarItem.tooltip = `QOOCODE (${model})`;
  }

  setProgress(progress: number): void {
    const filled = Math.round(progress * 20);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    this.statusBarItem.text = `$(sync~spin) ${bar} ${Math.round(progress * 100)}%`;
  }

  dispose(): void {
    if (this.statusUpdateTimeout) {
      clearTimeout(this.statusUpdateTimeout);
    }
    this.statusBarItem.dispose();
  }
}
