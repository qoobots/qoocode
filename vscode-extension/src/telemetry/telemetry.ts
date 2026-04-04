/**
 * QOOCODE VS Code Extension
 * Telemetry and Analytics
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
  measurements?: Record<string, number>;
  timestamp: number;
}

export class QOOCODETelemetry {
  private config: QOOCODEConfig;
  private events: TelemetryEvent[] = [];
  private outputChannel: vscode.OutputChannel;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('QOOCODE Telemetry');
  }

  /**
   * Track event
   */
  trackEvent(name: string, properties?: Record<string, string | number | boolean>): void {
    const event: TelemetryEvent = {
      name,
      properties,
      timestamp: Date.now()
    };

    this.events.push(event);
    this.outputChannel.appendLine(`[Event] ${name}: ${JSON.stringify(properties)}`);

    // Flush periodically
    if (this.events.length >= 10) {
      this.flush();
    }
  }

  /**
   * Track command usage
   */
  trackCommand(command: string): void {
    this.trackEvent('command', {
      command,
      timestamp: Date.now()
    });
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: string): void {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack || '',
      context: context || ''
    });
  }

  /**
   * Track performance
   */
  trackPerformance(name: string, duration: number): void {
    this.trackEvent('performance', {
      name,
      duration
    });
  }

  /**
   * Flush events to telemetry service
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    // Would send to telemetry endpoint
    this.outputChannel.appendLine(`[Flush] ${this.events.length} events`);
    this.events = [];
  }

  /**
   * Get analytics summary
   */
  getSummary(): AnalyticsSummary {
    const commands: Record<string, number> = {};
    const errors: Record<string, number> = {};

    for (const event of this.events) {
      if (event.name === 'command') {
        const cmd = event.properties?.command as string;
        commands[cmd] = (commands[cmd] || 0) + 1;
      } else if (event.name === 'error') {
        const msg = event.properties?.message as string;
        errors[msg] = (errors[msg] || 0) + 1;
      }
    }

    return {
      totalEvents: this.events.length,
      topCommands: Object.entries(commands)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cmd, count]) => ({ command: cmd, count })),
      errorCount: Object.keys(errors).length,
      recentErrors: Object.entries(errors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([msg, count]) => ({ message: msg, count }))
    };
  }

  dispose(): void {
    this.flush();
    this.outputChannel.dispose();
  }
}

interface AnalyticsSummary {
  totalEvents: number;
  topCommands: Array<{ command: string; count: number }>;
  errorCount: number;
  recentErrors: Array<{ message: string; count: number }>;
}

export class QOOCODEAnalyticsDashboard {
  private telemetry: QOOCODETelemetry;

  constructor(telemetry: QOOCODETelemetry) {
    this.telemetry = telemetry;
  }

  /**
   * Show analytics dashboard
   */
  async showDashboard(): Promise<void> {
    const summary = this.telemetry.getSummary();

    const panel = vscode.window.createWebviewPanel(
      'QOOCODE.analytics',
      'QOOCODE Analytics',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = this.getDashboardHtml(summary);
  }

  private getDashboardHtml(summary: AnalyticsSummary): string {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #007acc; }
    .stat {
      display: inline-block;
      background: #f5f5f5;
      padding: 16px;
      margin: 8px;
      border-radius: 8px;
      min-width: 120px;
    }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
  </style>
</head>
<body>
  <h1>📊 QOOCODE Analytics</h1>
  <div class="stat">
    <div class="stat-value">${summary.totalEvents}</div>
    <div class="stat-label">Total Events</div>
  </div>
  <div class="stat">
    <div class="stat-value">${summary.errorCount}</div>
    <div class="stat-label">Unique Errors</div>
  </div>
  <h2>Top Commands</h2>
  <table>
    <tr><th>Command</th><th>Count</th></tr>
    ${summary.topCommands.map(c => `<tr><td>${c.command}</td><td>${c.count}</td></tr>`).join('')}
  </table>
</body>
</html>`;
  }
}
