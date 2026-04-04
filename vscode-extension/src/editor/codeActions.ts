/**
 * qoocode VS Code Extension
 * CodeLens and Hover provider
 */

import * as vscode from 'vscode';
import { QoocodeConfig } from '../config/config';

export class QoocodeCodeLensProvider implements vscode.CodeLensProvider {
  private config: QoocodeConfig;
  private onDidChangeCodeLenses = new vscode.EventEmitter<void>();

  constructor(config: QoocodeConfig) {
    this.config = config;
  }

  readonly onDidChange: vscode.Event<void> = this.onDidChangeCodeLenses.event;

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];

    // Only show for supported languages
    const supportedLanguages = ['typescript', 'javascript', 'python', 'go', 'rust'];
    const languageId = document.languageId;

    if (!supportedLanguages.includes(languageId)) {
      return lenses;
    }

    // Add "Explain with qoocode" code lens
    const explainRange = new vscode.Range(0, 0, 0, 0);
    lenses.push(new vscode.CodeLens(explainRange, {
      title: '$(sparkle) Explain with qoocode',
      command: 'qoocode.explain',
      arguments: [document.uri]
    }));

    // Add "Review with qoocode" code lens for functions
    const text = document.getText();
    const functionPattern = /(?:function|const|let|var|class|def|async)\s+\w+/g;
    let match;

    while ((match = functionPattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position);
      lenses.push(new vscode.CodeLens(range, {
        title: '$(sparkle) Review',
        command: 'qoocode.review',
        arguments: [document.uri, position]
      }));
    }

    return lenses;
  }

  resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens {
    return codeLens;
  }
}

export class QoocodeHoverProvider implements vscode.HoverProvider {
  private config: QoocodeConfig;

  constructor(config: QoocodeConfig) {
    this.config = config;
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    // Get the word at the current position
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return undefined;
    }

    const word = document.getText(wordRange);

    // Check if it's a function or class definition
    const line = document.lineAt(position).text;
    const isFunction = /\w+\s*\([^)]*\)/.test(line) || /def\s+\w+/.test(line);

    if (!isFunction) {
      return undefined;
    }

    // Show hover with option to explain
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown(`**${word}**\n\n`);
    markdown.appendMarkdown('> $(sparkle) Ask qoocode to explain this function\n');
    markdown.appendCommandLink(
      'Explain with qoocode',
      new vscode.Command('qoocode.explain', 'qoocode.explain', [document.uri, wordRange])
    );

    return new vscode.Hover(markdown, wordRange);
  }
}

export class QoocodeDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Location | undefined {
    // This would integrate with qoocode to find definitions
    // For now, return undefined to use default behavior
    return undefined;
  }
}

export class QoocodeCompletionProvider implements vscode.CompletionItemProvider {
  private config: QoocodeConfig;

  constructor(config: QoocodeConfig) {
    this.config = config;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    // Provide AI-powered completions through qoocode
    // This is a placeholder that would integrate with the qoocode service
    const items: vscode.CompletionItem[] = [];

    // Add a "loading" completion that triggers qoocode
    const triggerCompletion = new vscode.CompletionItem(
      '$(sparkle) Ask qoocode...',
      vscode.CompletionItemKind.Snippet
    );
    triggerCompletion.insertText = '';
    triggerCompletion.command = {
      title: 'qoocode Completion',
      command: 'qoocode.complete',
      arguments: [document.uri, position]
    };
    items.push(triggerCompletion);

    return items;
  }
}
