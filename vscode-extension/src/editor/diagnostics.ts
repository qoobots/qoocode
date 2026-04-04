/**
 * QOOCODE VS Code Extension
 * Diagnostics and Code Actions provider
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export class QOOCODEDiagnosticsProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private config: QOOCODEConfig;
  private debounceTimer: NodeJS.Timeout | undefined;

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('QOOCODE');
  }

  /**
   * Analyze document and report diagnostics
   */
  async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    // Debounce to avoid too many requests
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const diagnostics: vscode.Diagnostic[] = [];

      // Get selected text or whole document
      const editor = vscode.window.activeTextEditor;
      let code: string;

      if (editor && editor.document === document) {
        const selection = editor.selection;
        if (!selection.isEmpty) {
          code = document.getText(selection);
        } else {
          code = document.getText();
        }
      } else {
        code = document.getText();
      }

      // Analyze for common issues
      const issues = this.detectIssues(document, code);

      for (const issue of issues) {
        const range = new vscode.Range(
          document.positionAt(issue.start),
          document.positionAt(issue.end)
        );
        const diagnostic = new vscode.Diagnostic(
          range,
          issue.message,
          this.mapSeverity(issue.level)
        );
        diagnostic.source = 'QOOCODE';
        diagnostic.code = issue.code;
        diagnostics.push(diagnostic);
      }

      this.diagnosticCollection.set(document.uri, diagnostics);
    }, 1000);
  }

  private detectIssues(document: vscode.TextDocument, code: string): Issue[] {
    const issues: Issue[] = [];

    // Detect TODO/FIXME without assignee
    const todoPattern = /\/\/\s*(TODO|FIXME|HACK|XXX|BUG):?\s*(\S+)?/gi;
    let match;
    while ((match = todoPattern.exec(code)) !== null) {
      // If no assignee, flag it
      if (!match[2] || !match[2].startsWith('@')) {
        issues.push({
          start: match.index,
          end: match.index + match[0].length,
          message: `QOOCODE: TODO/FIXME without assignee detected. Click to ask QOOCODE to help.`,
          level: 'warning',
          code: 'todo-without-assignee'
        });
      }
    }

    // Detect unused variables (simple pattern)
    const unusedPattern = /(?:const|let|var)\s+(\w+)\s*=/g;
    while ((match = unusedPattern.exec(code)) !== null) {
      const varName = match[1];
      const afterDeclaration = code.substring(match.index + match[0].length);
      const usageCount = (afterDeclaration.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;

      if (usageCount === 0) {
        issues.push({
          start: match.index,
          end: match.index + match[0].length,
          message: `QOOCODE: Variable '${varName}' appears unused`,
          level: 'hint',
          code: 'unused-variable'
        });
      }
    }

    return issues;
  }

  private mapSeverity(level: string): vscode.DiagnosticSeverity {
    switch (level) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  /**
   * Clear diagnostics for a document
   */
  clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  /**
   * Clear all diagnostics
   */
  clearAll(): void {
    this.diagnosticCollection.clear();
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.diagnosticCollection.dispose();
  }
}

interface Issue {
  start: number;
  end: number;
  message: string;
  level: string;
  code: string;
}

export class QOOCODECodeActionProvider implements vscode.CodeActionProvider {
  private config: QOOCODEConfig;
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.Refactor,
    vscode.CodeActionKind.QuickFix
  ];

  constructor(config: QOOCODEConfig) {
    this.config = config;
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Add "Explain with QOOCODE" action
    const explainAction = new vscode.CodeAction(
      '$(sparkle) Explain with QOOCODE',
      vscode.CodeActionKind.Refactor
    );
    explainAction.command = {
      command: 'QOOCODE.explain',
      title: 'Explain with QOOCODE',
      arguments: [document.uri, range]
    };
    actions.push(explainAction);

    // Add "Refactor with QOOCODE" action
    const refactorAction = new vscode.CodeAction(
      '$(sparkle) Refactor with QOOCODE',
      vscode.CodeActionKind.Refactor
    );
    refactorAction.command = {
      command: 'QOOCODE.refactor',
      title: 'Refactor with QOOCODE',
      arguments: [document.uri, range]
    };
    actions.push(refactorAction);

    // If there are diagnostics, add fix actions
    if (context.diagnostics.length > 0) {
      const fixAction = new vscode.CodeAction(
        '$(sparkle) Fix with QOOCODE',
        vscode.CodeActionKind.QuickFix
      );
      fixAction.command = {
        command: 'QOOCODE.fix',
        title: 'Fix with QOOCODE',
        arguments: [document.uri, context.diagnostics]
      };
      actions.push(fixAction);
    }

    return actions;
  }

  resolveCodeAction?(
    codeAction: vscode.CodeAction
  ): vscode.CodeAction | undefined {
    return codeAction;
  }
}
