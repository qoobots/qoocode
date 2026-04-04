/**
 * qoocode Bidirectional Communication
 * Enables two-way communication between VS Code and qoocode backend
 */

import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import { QoocodeAuthProvider } from '../auth/authProvider';
import { QoocodeConfig } from '../config/config';

export interface Message {
  id: string;
  type: 'request' | 'response' | 'event' | 'error';
  action: string;
  payload?: unknown;
  timestamp: number;
}

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface EventHandlers {
  onMessage?: (message: Message) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onSync?: (data: SyncData) => void;
}

export interface SyncData {
  files?: { path: string; content: string; hash: string }[];
  settings?: Record<string, unknown>;
  cursor?: { line: number; column: number };
  selections?: vscode.Selection[];
}

export class BidirectionalCommunication {
  private config: QoocodeConfig;
  private authProvider: QoocodeAuthProvider;
  private context: vscode.ExtensionContext;
  private wsEndpoint: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout?: NodeJS.Timeout }>();
  private eventHandlers: EventHandlers = {};
  private messageQueue: Message[] = [];
  private syncTimer: NodeJS.Timeout | undefined;
  private connectionStateEmitter = new vscode.EventEmitter<boolean>();

  public readonly onConnectionStateChanged = this.connectionStateEmitter.event;

  constructor(
    context: vscode.ExtensionContext,
    config: QoocodeConfig,
    authProvider: QoocodeAuthProvider
  ) {
    this.context = context;
    this.config = config;
    this.authProvider = authProvider;
    this.wsEndpoint = config.get('communication.wsEndpoint') || 'ws://localhost:3000';
  }

  /**
   * Connect to the qoocode backend
   */
  public async connect(): Promise<boolean> {
    try {
      const baseUrl = this.wsEndpoint.replace('ws://', 'http://').replace('wss://', 'https://');
      
      // Send connection request via HTTP
      const response = await this.httpRequest({
        method: 'POST',
        path: '/api/connect',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          clientId: this.context.extension.id,
          clientVersion: this.context.extension.packageJSON.version,
          capabilities: this.getCapabilities()
        }
      });

      if (response.success) {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionStateEmitter.fire(true);
        this.eventHandlers.onConnect?.();
        this.flushMessageQueue();
        this.startSyncTimer();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Connection failed:', error);
      this.eventHandlers.onError?.(error as Error);
      return false;
    }
  }

  /**
   * Disconnect from the backend
   */
  public async disconnect(): Promise<void> {
    this.isConnected = false;
    this.stopSyncTimer();
    
    try {
      await this.httpRequest({
        method: 'POST',
        path: '/api/disconnect',
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          clientId: this.context.extension.id
        }
      });
    } catch {
      // Ignore disconnect errors
    }

    this.connectionStateEmitter.fire(false);
    this.eventHandlers.onDisconnect?.();
  }

  /**
   * Send a message to the backend
   */
  public async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now()
    };

    if (!this.isConnected) {
      this.messageQueue.push(fullMessage);
      return fullMessage.id;
    }

    try {
      const response = await this.httpRequest({
        method: 'POST',
        path: '/api/message',
        headers: {
          'Content-Type': 'application/json'
        },
        body: fullMessage
      });

      return fullMessage.id;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send a request and wait for response
   */
  public async sendRequest<T = unknown>(action: string, payload?: unknown, timeout = 30000): Promise<T> {
    const messageId = await this.sendMessage({
      type: 'request',
      action,
      payload
    });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request ${action} timed out`));
      }, timeout);

      this.pendingRequests.set(messageId, { resolve, reject, timeout: timer });
    });
  }

  /**
   * Handle incoming response
   */
  public handleResponse(messageId: string, payload: unknown): void {
    const pending = this.pendingRequests.get(messageId);
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      this.pendingRequests.delete(messageId);
      pending.resolve(payload);
    }
  }

  /**
   * Handle incoming event
   */
  public handleEvent(message: Message): void {
    this.eventHandlers.onMessage?.(message);

    if (message.action === 'sync' && message.payload) {
      this.eventHandlers.onSync?.(message.payload as SyncData);
    }
  }

  /**
   * Set event handlers
   */
  public setEventHandlers(handlers: EventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Sync workspace state to backend
   */
  public async syncWorkspaceState(): Promise<void> {
    if (!this.isConnected) return;

    try {
      const syncData = await this.collectSyncData();
      
      await this.httpRequest({
        method: 'POST',
        path: '/api/sync',
        headers: {
          'Content-Type': 'application/json'
        },
        body: syncData
      });
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  /**
   * Collect workspace data for sync
   */
  private async collectSyncData(): Promise<SyncData> {
    const editor = vscode.window.activeTextEditor;
    const workspaceFolders = vscode.workspace.workspaceFolders;

    const syncData: SyncData = {
      settings: vscode.workspace.getConfiguration('qoocode').get<string, Record<string, unknown>>('')
    };

    if (editor) {
      syncData.cursor = {
        line: editor.selection.active.line,
        column: editor.selection.active.character
      };
      syncData.selections = editor.selections;
    }

    if (workspaceFolders && workspaceFolders.length > 0) {
      syncData.files = [];
      const rootPath = workspaceFolders[0].uri.fsPath;

      // Watch for file changes
      const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js,json,md}');
      
      fileWatcher.onDidChange(async (uri) => {
        const document = await vscode.workspace.openTextDocument(uri);
        syncData.files?.push({
          path: uri.fsPath.replace(rootPath, ''),
          content: document.getText(),
          hash: this.hashContent(document.getText())
        });
      });
    }

    return syncData;
  }

  /**
   * Simple content hash
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * HTTP request helper
   */
  private async httpRequest(options: RequestOptions): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const baseUrl = this.wsEndpoint.replace('ws://', 'http://').replace('wss://', 'https://');
      const url = new URL(options.path, baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestOptions: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method,
        headers: {
          ...options.headers,
          'X-Client-ID': this.context.extension.id
        },
        timeout: options.timeout || 30000
      };

      const req = client.request(requestOptions, async (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data ? JSON.parse(data) : { success: true });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Get VS Code capabilities
   */
  private getCapabilities(): Record<string, unknown> {
    return {
      editor: {
        selections: true,
        cursor: true,
        documents: true
      },
      workspace: {
        folders: true,
        configuration: true,
        fileSystem: true
      },
      extensions: true,
      terminal: true,
      debug: true,
      git: true
    };
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message).catch(console.error);
      }
    }
  }

  /**
   * Start periodic sync timer
   */
  private startSyncTimer(): void {
    const syncInterval = this.config.get('communication.syncInterval') || 30000;
    
    this.syncTimer = setInterval(() => {
      this.syncWorkspaceState();
    }, syncInterval);
  }

  /**
   * Stop periodic sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  /**
   * Attempt reconnection
   */
  public async reconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return false;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    await new Promise(resolve => setTimeout(resolve, delay));
    
    return this.connect();
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Dispose the communication manager
   */
  public dispose(): void {
    this.stopSyncTimer();
    this.disconnect();
    this.pendingRequests.forEach(pending => {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Communication disposed'));
    });
    this.pendingRequests.clear();
    this.messageQueue = [];
    this.connectionStateEmitter.dispose();
  }
}
