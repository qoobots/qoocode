/**
 * QOOCODE VS Code Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { QOOCODEChatProvider } from './chat/chatProvider';
import { QOOCODETerminalManager } from './terminal/terminalManager';
import { QOOCODEStatusBar } from './statusbar/statusBar';
import { QOOCODECodeLensProvider, QOOCODEHoverProvider } from './editor/codeActions';
import { QOOCODEDiagnosticsProvider, QOOCODECodeActionProvider } from './editor/diagnostics';
import { QOOCODEFileWatcher, QOOCODEDocumentManager } from './editor/fileWatcher';
import { QOOCODEWorkspaceManager, QOOCODETaskProvider } from './workspace/workspaceManager';
import { QOOCODEInlineCompletionProvider } from './ai/aiProvider';
import { QOOCODEDebugAdapterTrackerFactory, QOOCODEDebugConfigurationProvider } from './debug/debugIntegration';
import { QOOCODEGitIntegration } from './git/gitIntegration';
import { QOOCODENotificationManager, QOOCODEProgressManager, QOOCODEWelcomeView } from './notifications/notifications';
import { QOOCODERemoteConnection, QOOCODEContainerSupport } from './remote/remoteIntegration';
import { QOOCODEFloatingPanel, QOOCODESnippetManager, QOOCODEActivityBarWidget } from './ui/advancedComponents';
import { DesignSystemProvider } from './ui/designSystem';
import { QOOCODETelemetry, QOOCODEAnalyticsDashboard } from './telemetry/telemetry';
import { registerCommands } from './commands';
import { QOOCODEConfig } from './config/config';
import { QOOCODEAuthProvider } from './auth/authProvider';
import { BidirectionalCommunication } from './communication/bidirectionalComm';
import { QOOCODEAutoUpdater } from './updates/autoUpdater';

let chatProvider: QOOCODEChatProvider | undefined;
let terminalManager: QOOCODETerminalManager | undefined;
let statusBar: QOOCODEStatusBar | undefined;
let codeLensProvider: QOOCODECodeLensProvider | undefined;
let hoverProvider: QOOCODEHoverProvider | undefined;
let diagnosticsProvider: QOOCODEDiagnosticsProvider | undefined;
let codeActionProvider: QOOCODECodeActionProvider | undefined;
let fileWatcher: QOOCODEFileWatcher | undefined;
let documentManager: QOOCODEDocumentManager | undefined;
let workspaceManager: QOOCODEWorkspaceManager | undefined;
let gitIntegration: QOOCODEGitIntegration | undefined;
let notifications: QOOCODENotificationManager | undefined;
let progress: QOOCODEProgressManager | undefined;
let remoteConnection: QOOCODERemoteConnection | undefined;
let containerSupport: QOOCODEContainerSupport | undefined;
let floatingPanel: QOOCODEFloatingPanel | undefined;
let snippetManager: QOOCODESnippetManager | undefined;
let activityWidget: QOOCODEActivityBarWidget | undefined;
let telemetry: QOOCODETelemetry | undefined;
let authProvider: QOOCODEAuthProvider | undefined;
let communication: BidirectionalCommunication | undefined;
let designSystem: DesignSystemProvider | undefined;
let autoUpdater: QOOCODEAutoUpdater | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialize configuration
  const config = new QOOCODEConfig();

  // Check if auto-start is enabled
  if (config.get('autoStart')) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      startQOOCODE(workspaceFolders[0].uri.fsPath);
    }
  }

  // Initialize status bar
  statusBar = new QOOCODEStatusBar(config);
  statusBar.show();

  // Initialize terminal manager
  terminalManager = new QOOCODETerminalManager(config);

  // Initialize chat provider
  chatProvider = new QOOCODEChatProvider(context, config);

  // Initialize workspace manager
  workspaceManager = new QOOCODEWorkspaceManager(config);

  // Initialize document manager
  documentManager = new QOOCODEDocumentManager(config);

  // Initialize file watcher
  fileWatcher = new QOOCODEFileWatcher(context, config);

  // Initialize CodeLens provider
  codeLensProvider = new QOOCODECodeLensProvider(config);
  vscode.languages.registerCodeLensProvider(
    { scheme: 'file', languages: ['typescript', 'javascript', 'python', 'go', 'rust'] },
    codeLensProvider
  );

  // Initialize Hover provider
  hoverProvider = new QOOCODEHoverProvider(config);
  vscode.languages.registerHoverProvider(
    { scheme: 'file', languages: ['typescript', 'javascript', 'python', 'go', 'rust'] },
    hoverProvider
  );

  // Initialize Diagnostics provider
  diagnosticsProvider = new QOOCODEDiagnosticsProvider(config);
  vscode.workspace.onDidSaveTextDocument((document) => {
    diagnosticsProvider?.analyzeDocument(document);
  });

  // Initialize Code Action provider
  codeActionProvider = new QOOCODECodeActionProvider(config);
  vscode.languages.registerCodeActionProvider(
    { scheme: 'file' },
    codeActionProvider,
    'QOOCODE'
  );

  // Initialize Task provider
  vscode.tasks.registerTaskProvider('QOOCODE', new QOOCODETaskProvider(config));

  // Initialize Inline Completion provider
  const inlineCompletionProvider = new QOOCODEInlineCompletionProvider(config);
  vscode.languages.registerInlineCompletionItemProvider(
    { scheme: 'file' },
    inlineCompletionProvider
  );

  // Initialize Debug integration
  const debugTrackerFactory = new QOOCODEDebugAdapterTrackerFactory(config);
  vscode.debug.registerDebugAdapterTrackerFactory('*', debugTrackerFactory);

  const debugConfigProvider = new QOOCODEDebugConfigurationProvider(config);
  vscode.debug.registerDebugConfigurationProvider('QOOCODE', debugConfigProvider);

  // Initialize Git integration
  gitIntegration = new QOOCODEGitIntegration(config);

  // Initialize Notifications and Progress
  notifications = new QOOCODENotificationManager(config);
  progress = new QOOCODEProgressManager(config);

  // Initialize Remote support
  remoteConnection = new QOOCODERemoteConnection(config);
  containerSupport = new QOOCODEContainerSupport(config);

  // Initialize UI components
  floatingPanel = new QOOCODEFloatingPanel(context, config);
  snippetManager = new QOOCODESnippetManager(config);
  activityWidget = new QOOCODEActivityBarWidget(config);

  // Initialize Telemetry
  telemetry = new QOOCODETelemetry(config);

  // Initialize Auth Provider
  authProvider = new QOOCODEAuthProvider(context, config);
  
  // Initialize Bidirectional Communication
  communication = new BidirectionalCommunication(context, config, authProvider);
  
  // Set up communication event handlers
  communication.setEventHandlers({
    onConnect: () => {
      vscode.window.showInformationMessage('QOOCODE connected to backend');
      statusBar?.setConnectionStatus(true);
    },
    onDisconnect: () => {
      vscode.window.showWarningMessage('QOOCODE disconnected from backend');
      statusBar?.setConnectionStatus(false);
    },
    onError: (error) => {
      console.error('Communication error:', error);
      vscode.window.showErrorMessage(`QOOCODE communication error: ${error.message}`);
    },
    onSync: (data) => {
      console.log('Workspace sync received:', data);
    }
  });

  // Connect to backend if enabled
  if (config.get('communication.enabled')) {
    communication.connect().catch(console.error);
  }

  // Initialize Design System
  designSystem = new DesignSystemProvider();

  // Initialize Auto-Updater
  autoUpdater = new QOOCODEAutoUpdater(context, config);
  
  // Check for updates on startup
  if (config.get('updates.autoCheck')) {
    autoUpdater.checkForUpdates(true).then(() => {
      autoUpdater?.showUpdateNotification();
    }).catch(console.error);
  }

  // Show welcome view on first activation
  const welcomeShown = context.globalState.get<boolean>('QOOCODE.welcomeShown');
  if (!welcomeShown) {
    context.globalState.update('QOOCODE.welcomeShown', true);
    const welcomeView = new QOOCODEWelcomeView(context, config);
    await welcomeView.show();
  }

  // Register commands
  registerCommands(context, config, {
    chatProvider,
    terminalManager,
    statusBar
  });

  // Register tree data provider
  vscode.window.registerTreeDataProvider('QOOCODE.chat', chatProvider);

  // Register tree view
  const treeView = vscode.window.createTreeView('QOOCODE.chat', {
    treeDataProvider: chatProvider,
    showCollapseAll: true
  });

  // Handle view events
  treeView.onDidChangeVisibility((e) => {
    if (e.visible) {
      chatProvider?.refresh();
    }
  });

  // Show welcome message on first activation
  const stateKey = 'QOOCODE.activated';
  const isActivated = context.globalState.get<boolean>(stateKey);
  if (!isActivated) {
    context.globalState.update(stateKey, true);
    vscode.window.showInformationMessage(
      'QOOCODE Extension Activated! Use Ctrl+Shift+O to start.'
    );
  }
}

export function deactivate(): void {
  // Clean up
  terminalManager?.dispose();
  statusBar?.dispose();
  chatProvider?.dispose();
  diagnosticsProvider?.dispose();
  fileWatcher?.dispose();
  workspaceManager?.dispose();
  gitIntegration?.dispose();
  notifications?.dispose();
  remoteConnection?.dispose();
  activityWidget?.dispose();
  telemetry?.dispose();
  authProvider?.dispose();
  communication?.dispose();
  designSystem?.dispose();
  autoUpdater?.dispose();
}

/**
 * Start QOOCODE session
 */
async function startQOOCODE(workspacePath: string): Promise<void> {
  if (terminalManager) {
    await terminalManager.createTerminal(workspacePath);
  }
}
