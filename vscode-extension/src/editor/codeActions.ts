/**
 * QOOCODE VS Code Extension
 * CodeLens and Hover provider
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export class QOOCODECodeLensProvider implements vscode.CodeLensProvider {
  private config: QOOCODEConfig;
  private onDidChangeCodeLenses = new vscode.EventEmitter<void>();

  constructor(config: QOOCODEConfig) {
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

    // Add "Explain with QOOCODE" code lens
    const explainRange = new vscode.Range(0, 0, 0, 0);
    lenses.push(new vscode.CodeLens(explainRange, {
      title: '$(sparkle) Explain with QOOCODE',
      command: 'QOOCODE.explain',
      arguments: [document.uri]
    }));

    // Add "Review with QOOCODE" code lens for functions
    const text = document.getText();
    const functionPattern = /(?:function|const|let|var|class|def|async)\s+\w+/g;
    let match;

    while ((match = functionPattern.exec(text)) !== null) {
      const position = document.positionAt(match.index);
      const range = new vscode.Range(position, position);
      lenses.push(new vscode.CodeLens(range, {
        title: '$(sparkle) Review',
        command: 'QOOCODE.review',
        arguments: [document.uri, position]
      }));
    }

    return lenses;
  }

  resolveCodeLens(codeLens: vscode.CodeLens): vscode.CodeLens {
    return codeLens;
  }
}

export class QOOCODEHoverProvider implements vscode.HoverProvider {
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
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
    markdown.appendMarkdown('> $(sparkle) Ask QOOCODE to explain this function\n');
    markdown.appendCommandLink(
      'Explain with QOOCODE',
      new vscode.Command('QOOCODE.explain', 'QOOCODE.explain', [document.uri, wordRange])
    );

    return new vscode.Hover(markdown, wordRange);
  }
}

export class QOOCODEDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.Location | undefined {
    // This would integrate with QOOCODE to find definitions
    // For now, return undefined to use default behavior
    return undefined;
  }
}

export class QOOCODECompletionProvider implements vscode.CompletionItemProvider {
  private config: QOOCODEConfig;

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    // Provide AI-powered completions through QOOCODE
    // This is a placeholder that would integrate with the QOOCODE service
    const items: vscode.CompletionItem[] = [];

    // Add a "loading" completion that triggers QOOCODE
    const triggerCompletion = new vscode.CompletionItem(
      '$(sparkle) Ask QOOCODE...',
      vscode.CompletionItemKind.Snippet
    );
    triggerCompletion.insertText = '';
    triggerCompletion.command = {
      title: 'QOOCODE Completion',
      command: 'QOOCODE.complete',
      arguments: [document.uri, position]
    };
    items.push(triggerCompletion);

    return items;
  }
}
