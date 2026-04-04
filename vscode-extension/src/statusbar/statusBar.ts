/**
 * qoocode VS Code Extension
 * Status bar management
 */

import * as vscode from 'vscode';
import { QoocodeConfig } from '../config/config';

export type QoocodeStatus = 'idle' | 'running' | 'thinking' | 'stopped' | 'error';

export class QoocodeStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private status: QoocodeStatus = 'idle';
  private config: QoocodeConfig;
  private statusUpdateTimeout: NodeJS.Timeout | undefined;

  constructor(config: QoocodeConfig) {
    this.config = config;
    this.statusBarItem = vscode.window.createStatusBarItem(
      'qoocode.status',
      vscode.StatusBarAlignment.Left,
      100
    );

    this.statusBarItem.command = 'qoocode.chat';
    this.statusBarItem.text = '$(robot) qoocode';
    this.statusBarItem.tooltip = 'qoocode AI Assistant';
  }

  show(): void {
    this.statusBarItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
  }

  setStatus(status: QoocodeStatus, message?: string): void {
    this.status = status;

    // Clear any pending timeout
    if (this.statusUpdateTimeout) {
      clearTimeout(this.statusUpdateTimeout);
      this.statusUpdateTimeout = undefined;
    }

    // Update status bar
    switch (status) {
      case 'idle':
        this.statusBarItem.text = '$(robot) qoocode: Idle';
        this.statusBarItem.color = undefined;
        break;

      case 'running':
        this.statusBarItem.text = '$(loading~spin) qoocode: Running';
        this.statusBarItem.color = '#89d185'; // Green
        break;

      case 'thinking':
        this.statusBarItem.text = '$(sync~spin) qoocode: Thinking';
        this.statusBarItem.color = '#dcdcaa'; // Yellow
        break;

      case 'stopped':
        this.statusBarItem.text = '$(debug-stop) qoocode: Stopped';
        this.statusBarItem.color = '#f14c4c'; // Red
        break;

      case 'error':
        this.statusBarItem.text = '$(error) qoocode: Error';
        this.statusBarItem.color = '#f14c4c'; // Red
        break;
    }

    // Update tooltip
    if (message) {
      this.statusBarItem.tooltip = message;
    } else {
      this.statusBarItem.tooltip = `qoocode AI Assistant\nStatus: ${status}`;
    }

    // Auto-reset thinking status after timeout
    if (status === 'thinking') {
      this.statusUpdateTimeout = setTimeout(() => {
        if (this.status === 'thinking') {
          this.statusBarItem.text = '$(robot) qoocode';
          this.statusBarItem.color = undefined;
        }
      }, 5000);
    }
  }

  getStatus(): QoocodeStatus {
    return this.status;
  }

  setModel(model: string): void {
    this.statusBarItem.tooltip = `qoocode (${model})`;
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
