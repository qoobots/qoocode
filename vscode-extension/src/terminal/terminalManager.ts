/**
 * QOOCODE VS Code Extension
 * Terminal manager for QOOCODE sessions
 */

import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { QOOCODEConfig } from '../config/config';
import * as path from 'path';

export class QOOCODETerminalManager implements vscode.TerminalProfileProvider {
  private activeTerminal: vscode.Terminal | undefined;
  private activeProcess: ChildProcess | undefined;
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.registerProfileProvider();
  }

  private registerProfileProvider(): void {
    vscode.window.registerTerminalProfileProvider('QOOCODE', this);
  }

  provideTerminalProfile(token: vscode.CancellationToken): vscode.ProviderResult<vscode.TerminalProfile> {
    return {
      options: {
        name: 'QOOCODE',
        iconPath: vscode.Uri.joinPath(
          vscode.Uri.file(this.getExtensionPath()),
          'resources',
          'QOOCODE-icon.svg'
        )
      }
    } as vscode.TerminalProfile;
  }

  async createTerminal(workspacePath: string): Promise<vscode.Terminal> {
    // Close existing terminal
    if (this.activeTerminal) {
      this.activeTerminal.dispose();
    }

    // Determine terminal location
    const location = this.config.get('terminalLocation');
    let viewColumn: vscode.ViewColumn | { parent: vscode.TerminalLocation } = vscode.TerminalLocation.Termitor;

    switch (location) {
      case 'right':
        viewColumn = vscode.ViewColumn.Two;
        break;
      case 'left':
        viewColumn = vscode.ViewColumn.One;
        break;
      default:
        viewColumn = vscode.TerminalLocation.Termitor;
    }

    // Create terminal
    const terminal = vscode.window.createTerminal({
      name: 'QOOCODE',
      location: viewColumn,
      iconPath: vscode.Uri.joinPath(
        vscode.Uri.file(this.getExtensionPath()),
        'resources',
        'QOOCODE-icon.svg'
      )
    });

    this.activeTerminal = terminal;

    // Get QOOCODE binary path
    const QOOCODEPath = this.findQOOCODEBinary();

    // Start QOOCODE
    terminal.sendText(`cd "${workspacePath}"`);
    terminal.sendText(QOOCODEPath);

    // Show terminal
    terminal.show();

    // Listen for terminal close
    terminal.processId.then((pid) => {
      this.trackProcess(pid);
    });

    return terminal;
  }

  private findQOOCODEBinary(): string {
    // Try to find QOOCODE binary in common locations
    const possiblePaths = [
      'QOOCODE',  // If installed globally
      path.join(this.getExtensionPath(), '..', 'dist', 'main.js'),
      path.join(process.env.HOME || '', '.QOOCODE', 'bin', 'QOOCODE'),
      path.join(process.env.APPDATA || '', 'QOOCODE', 'bin', 'QOOCODE')
    ];

    for (const p of possiblePaths) {
      try {
        // Check if file exists (only for non-global paths)
        if (!p.includes('QOOCODE') || p.includes('/') || p.includes('\\')) {
          const fs = require('fs');
          if (fs.existsSync(p)) {
            return p;
          }
        }
      } catch {
        // Continue checking
      }
    }

    // Default to global command
    return 'QOOCODE';
  }

  private getExtensionPath(): string {
    const ext = vscode.extensions.getExtension('QOOCODE.QOOCODE');
    return ext?.extensionPath || '';
  }

  private trackProcess(pid: number): void {
    // This would track the actual process, but VS Code terminal API
    // doesn't provide direct process management
  }

  stopCurrentSession(): void {
    if (this.activeTerminal) {
      // Send interrupt signal
      this.activeTerminal.sendText('\x03'); // Ctrl+C

      // Wait a bit then kill if needed
      setTimeout(() => {
        if (this.activeTerminal) {
          this.activeTerminal.dispose();
          this.activeTerminal = undefined;
        }
      }, 1000);
    }

    if (this.activeProcess) {
      this.activeProcess.kill('SIGTERM');
      this.activeProcess = undefined;
    }
  }

  sendInput(input: string): void {
    if (this.activeTerminal) {
      this.activeTerminal.sendText(input);
    }
  }

  showTerminal(): void {
    if (this.activeTerminal) {
      this.activeTerminal.show();
    }
  }

  hideTerminal(): void {
    if (this.activeTerminal) {
      this.activeTerminal.hide();
    }
  }

  dispose(): void {
    this.stopCurrentSession();
  }
}
