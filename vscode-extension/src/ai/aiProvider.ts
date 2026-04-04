/**
 * qoocode VS Code Extension
 * AI provider for qoocode integration
 */

import * as vscode from 'vscode';
import { QoocodeConfig } from '../config/config';
import { QoocodeTerminalManager } from '../terminal/terminalManager';

export class QoocodeAIProvider {
  private config: QoocodeConfig;
  private terminalManager: QoocodeTerminalManager | undefined;
  private contextHistory: Map<string, AIMessage[]> = new Map();

  constructor(config: QoocodeConfig, terminalManager?: QoocodeTerminalManager) {
    this.config = config;
    this.terminalManager = terminalManager;
  }

  /**
   * Send a query to qoocode
   */
  async query(prompt: string, context?: QueryContext): Promise<string> {
    const sessionId = context?.sessionId || 'default';

    // Add to history
    this.addToHistory(sessionId, { role: 'user', content: prompt });

    // Build full prompt with context
    const fullPrompt = this.buildPrompt(prompt, context);

    // Send to terminal or API
    if (this.terminalManager) {
      this.terminalManager.sendInput(fullPrompt);
      return 'Sent to qoocode terminal';
    }

    // Fallback: show in output channel
    const output = vscode.window.createOutputChannel('qoocode Query');
    output.appendLine(`Query: ${prompt}`);
    output.show();

    return 'Query sent to qoocode';
  }

  /**
   * Build prompt with context
   */
  private buildPrompt(prompt: string, context?: QueryContext): string {
    let fullPrompt = '';

    // Add context if available
    if (context) {
      if (context.fileUri) {
        const doc = vscode.workspace.textDocuments.find(
          d => d.uri.fsPath === context.fileUri?.fsPath
        );
        if (doc) {
          fullPrompt += `File: ${doc.fileName}\n`;
          fullPrompt += `Language: ${doc.languageId}\n\n`;
        }
      }

      if (context.selection) {
        fullPrompt += `Selected code:\n\`\`\`\n${context.selection}\n\`\`\`\n\n`;
      }

      if (context.range) {
        fullPrompt += `Range: lines ${context.range.start.line + 1}-${context.range.end.line + 1}\n\n`;
      }
    }

    fullPrompt += prompt;
    return fullPrompt;
  }

  /**
   * Add message to history
   */
  private addToHistory(sessionId: string, message: AIMessage): void {
    if (!this.contextHistory.has(sessionId)) {
      this.contextHistory.set(sessionId, []);
    }
    this.contextHistory.get(sessionId)!.push(message);

    // Limit history size
    const history = this.contextHistory.get(sessionId)!;
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  /**
   * Get conversation history
   */
  getHistory(sessionId: string = 'default'): AIMessage[] {
    return this.contextHistory.get(sessionId) || [];
  }

  /**
   * Clear history
   */
  clearHistory(sessionId?: string): void {
    if (sessionId) {
      this.contextHistory.delete(sessionId);
    } else {
      this.contextHistory.clear();
    }
  }

  /**
   * Generate code completion
   */
  async complete(prefix: string, suffix?: string): Promise<string | undefined> {
    // This would integrate with qoocode's completion API
    // For now, return undefined to use default completions
    return undefined;
  }
}

interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface QueryContext {
  sessionId?: string;
  fileUri?: vscode.Uri;
  selection?: string;
  range?: vscode.Range;
}

export class QoocodeInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  private config: QoocodeConfig;
  private aiProvider: QoocodeAIProvider;

  constructor(config: QoocodeConfig) {
    this.config = config;
    this.aiProvider = new QoocodeAIProvider(config);
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    // Only trigger on explicit request (typing specific trigger characters)
    if (!context.triggerKind === vscode.InlineCompletionTriggerKind.Explicit) {
      return undefined;
    }

    // Get the current line prefix
    const range = new vscode.Range(position.line, 0, position.line, position.character);
    const prefix = document.getText(range);

    // Check for trigger patterns
    const triggerPatterns = ['// ', '# ', '/* ', '/** ', '//!', '// TODO'];
    const shouldTrigger = triggerPatterns.some(p => prefix.endsWith(p));

    if (!shouldTrigger) {
      return undefined;
    }

    // Request completion from qoocode
    const completion = await this.aiProvider.complete(prefix);

    if (!completion) {
      return undefined;
    }

    return [
      new vscode.InlineCompletionItem(
        new vscode.SnippetString(completion),
        new vscode.Range(position, position)
      )
    ];
  }
}
