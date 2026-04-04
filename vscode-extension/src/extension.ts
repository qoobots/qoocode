/**
 * qoocode VS Code Extension
 * Main entry point
 */

import * as vscode from 'vscode';
import { QoocodeChatProvider } from './chat/chatProvider';
import { QoocodeTerminalManager } from './terminal/terminalManager';
import { QoocodeStatusBar } from './statusbar/statusBar';
import { QoocodeCodeLensProvider, QoocodeHoverProvider } from './editor/codeActions';
import { QoocodeDiagnosticsProvider, QoocodeCodeActionProvider } from './editor/diagnostics';
import { QoocodeFileWatcher, QoocodeDocumentManager } from './editor/fileWatcher';
import { QoocodeWorkspaceManager, QoocodeTaskProvider } from './workspace/workspaceManager';
import { QoocodeInlineCompletionProvider } from './ai/aiProvider';
import { QoocodeDebugAdapterTrackerFactory, QoocodeDebugConfigurationProvider } from './debug/debugIntegration';
import { QoocodeGitIntegration } from './git/gitIntegration';
import { QoocodeNotificationManager, QoocodeProgressManager, QoocodeWelcomeView } from './notifications/notifications';
import { QoocodeRemoteConnection, QoocodeContainerSupport } from './remote/remoteIntegration';
import { QoocodeFloatingPanel, QoocodeSnippetManager, QoocodeActivityBarWidget } from './ui/advancedComponents';
import { DesignSystemProvider } from './ui/designSystem';
import { QoocodeTelemetry, QoocodeAnalyticsDashboard } from './telemetry/telemetry';
import { registerCommands } from './commands';
import { QoocodeConfig } from './config/config';
import { QoocodeAuthProvider } from './auth/authProvider';
import { BidirectionalCommunication } from './communication/bidirectionalComm';
import { QoocodeAutoUpdater } from './updates/autoUpdater';

let chatProvider: QoocodeChatProvider | undefined;
let terminalManager: QoocodeTerminalManager | undefined;
let statusBar: QoocodeStatusBar | undefined;
let codeLensProvider: QoocodeCodeLensProvider | undefined;
let hoverProvider: QoocodeHoverProvider | undefined;
let diagnosticsProvider: QoocodeDiagnosticsProvider | undefined;
let codeActionProvider: QoocodeCodeActionProvider | undefined;
let fileWatcher: QoocodeFileWatcher | undefined;
let documentManager: QoocodeDocumentManager | undefined;
let workspaceManager: QoocodeWorkspaceManager | undefined;
let gitIntegration: QoocodeGitIntegration | undefined;
let notifications: QoocodeNotificationManager | undefined;
let progress: QoocodeProgressManager | undefined;
let remoteConnection: QoocodeRemoteConnection | undefined;
let containerSupport: QoocodeContainerSupport | undefined;
let floatingPanel: QoocodeFloatingPanel | undefined;
let snippetManager: QoocodeSnippetManager | undefined;
let activityWidget: QoocodeActivityBarWidget | undefined;
let telemetry: QoocodeTelemetry | undefined;
let authProvider: QoocodeAuthProvider | undefined;
let communication: BidirectionalCommunication | undefined;
let designSystem: DesignSystemProvider | undefined;
let autoUpdater: QoocodeAutoUpdater | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Initialize configuration
  const config = new QoocodeConfig();

  // Check if auto-start is enabled
  if (config.get('autoStart')) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      startqoocode(workspaceFolders[0].uri.fsPath);
    }
  }

  // Initialize status bar
  statusBar = new QoocodeStatusBar(config);
  statusBar.show();

  // Initialize terminal manager
  terminalManager = new QoocodeTerminalManager(config);

  // Initialize chat provider
  chatProvider = new QoocodeChatProvider(context, config);

  // Initialize workspace manager
  workspaceManager = new QoocodeWorkspaceManager(config);

  // Initialize document manager
  documentManager = new QoocodeDocumentManager(config);

  // Initialize file watcher
  fileWatcher = new QoocodeFileWatcher(context, config);

  // Initialize CodeLens provider
  codeLensProvider = new QoocodeCodeLensProvider(config);
  vscode.languages.registerCodeLensProvider(
    { scheme: 'file', languages: ['typescript', 'javascript', 'python', 'go', 'rust'] },
    codeLensProvider
  );

  // Initialize Hover provider
  hoverProvider = new QoocodeHoverProvider(config);
  vscode.languages.registerHoverProvider(
    { scheme: 'file', languages: ['typescript', 'javascript', 'python', 'go', 'rust'] },
    hoverProvider
  );

  // Initialize Diagnostics provider
  diagnosticsProvider = new QoocodeDiagnosticsProvider(config);
  vscode.workspace.onDidSaveTextDocument((document) => {
    diagnosticsProvider?.analyzeDocument(document);
  });

  // Initialize Code Action provider
  codeActionProvider = new QoocodeCodeActionProvider(config);
  vscode.languages.registerCodeActionProvider(
    { scheme: 'file' },
    codeActionProvider,
    'qoocode'
  );

  // Initialize Task provider
  vscode.tasks.registerTaskProvider('qoocode', new QoocodeTaskProvider(config));

  // Initialize Inline Completion provider
  const inlineCompletionProvider = new QoocodeInlineCompletionProvider(config);
  vscode.languages.registerInlineCompletionItemProvider(
    { scheme: 'file' },
    inlineCompletionProvider
  );

  // Initialize Debug integration
  const debugTrackerFactory = new QoocodeDebugAdapterTrackerFactory(config);
  vscode.debug.registerDebugAdapterTrackerFactory('*', debugTrackerFactory);

  const debugConfigProvider = new QoocodeDebugConfigurationProvider(config);
  vscode.debug.registerDebugConfigurationProvider('qoocode', debugConfigProvider);

  // Initialize Git integration
  gitIntegration = new QoocodeGitIntegration(config);

  // Initialize Notifications and Progress
  notifications = new QoocodeNotificationManager(config);
  progress = new QoocodeProgressManager(config);

  // Initialize Remote support
  remoteConnection = new QoocodeRemoteConnection(config);
  containerSupport = new QoocodeContainerSupport(config);

  // Initialize UI components
  floatingPanel = new QoocodeFloatingPanel(context, config);
  snippetManager = new QoocodeSnippetManager(config);
  activityWidget = new QoocodeActivityBarWidget(config);

  // Initialize Telemetry
  telemetry = new QoocodeTelemetry(config);

  // Initialize Auth Provider
  authProvider = new QoocodeAuthProvider(context, config);
  
  // Initialize Bidirectional Communication
  communication = new BidirectionalCommunication(context, config, authProvider);
  
  // Set up communication event handlers
  communication.setEventHandlers({
    onConnect: () => {
      vscode.window.showInformationMessage('qoocode connected to backend');
      statusBar?.setConnectionStatus(true);
    },
    onDisconnect: () => {
      vscode.window.showWarningMessage('qoocode disconnected from backend');
      statusBar?.setConnectionStatus(false);
    },
    onError: (error) => {
      console.error('Communication error:', error);
      vscode.window.showErrorMessage(`qoocode communication error: ${error.message}`);
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
  autoUpdater = new QoocodeAutoUpdater(context, config);
  
  // Check for updates on startup
  if (config.get('updates.autoCheck')) {
    autoUpdater.checkForUpdates(true).then(() => {
      autoUpdater?.showUpdateNotification();
    }).catch(console.error);
  }

  // Show welcome view on first activation
  const welcomeShown = context.globalState.get<boolean>('qoocode.welcomeShown');
  if (!welcomeShown) {
    context.globalState.update('qoocode.welcomeShown', true);
    const welcomeView = new QoocodeWelcomeView(context, config);
    await welcomeView.show();
  }

  // Register commands
  registerCommands(context, config, {
    chatProvider,
    terminalManager,
    statusBar
  });

  // Register tree data provider
  vscode.window.registerTreeDataProvider('qoocode.chat', chatProvider);

  // Register tree view
  const treeView = vscode.window.createTreeView('qoocode.chat', {
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
  const stateKey = 'qoocode.activated';
  const isActivated = context.globalState.get<boolean>(stateKey);
  if (!isActivated) {
    context.globalState.update(stateKey, true);
    vscode.window.showInformationMessage(
      'qoocode Extension Activated! Use Ctrl+Shift+O to start.'
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
 * Start qoocode session
 */
async function startqoocode(workspacePath: string): Promise<void> {
  if (terminalManager) {
    await terminalManager.createTerminal(workspacePath);
  }
}
