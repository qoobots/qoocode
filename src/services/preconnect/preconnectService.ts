/**
 * API Preconnect Service
 * Establishes early connections to API endpoints before they're needed
 */

export interface Endpoint {
  url: string;
  type: 'openai' | 'anthropic' | 'mcp' | 'custom';
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

export interface ConnectionState {
  url: string;
  connected: boolean;
  connecting: boolean;
  lastConnected?: number;
  error?: string;
}

export interface PreconnectOptions {
  timeout: number;
  keepAlive: boolean;
  retryAttempts: number;
}

export class PreconnectService {
  private endpoints = new Map<string, Endpoint>();
  private connectionStates = new Map<string, ConnectionState>();
  private options: PreconnectOptions;
  private connections = new Map<string, { controller: AbortController; timer?: NodeJS.Timeout }>();
  private cleanupTimer: NodeJS.Timeout | undefined;

  constructor(options?: Partial<PreconnectOptions>) {
    this.options = {
      timeout: 10000,
      keepAlive: true,
      retryAttempts: 3,
      ...options
    };
    
    // Start periodic cleanup
    this.startCleanupTimer();
  }

  /**
   * Register an endpoint for preconnection
   */
  public registerEndpoint(endpoint: Endpoint): void {
    this.endpoints.set(endpoint.url, endpoint);
    this.connectionStates.set(endpoint.url, {
      url: endpoint.url,
      connected: false,
      connecting: false
    });
  }

  /**
   * Register multiple endpoints
   */
  public registerEndpoints(endpoints: Endpoint[]): void {
    endpoints.forEach(ep => this.registerEndpoint(ep));
  }

  /**
   * Remove an endpoint
   */
  public removeEndpoint(url: string): boolean {
    this.disconnect(url);
    return this.endpoints.delete(url) && this.connectionStates.delete(url);
  }

  /**
   * Connect to a specific endpoint
   */
  public async connect(url: string): Promise<boolean> {
    const endpoint = this.endpoints.get(url);
    if (!endpoint) {
      throw new Error(`Endpoint not registered: ${url}`);
    }

    const existing = this.connections.get(url);
    if (existing) {
      return existing.controller.signal.aborted === false;
    }

    this.updateState(url, { connecting: true });

    try {
      const controller = new AbortController();
      this.connections.set(url, { controller });

      // Perform preconnect using DNS prefetch and TCP handshake
      await this.performPreconnect(endpoint, controller.signal);

      this.updateState(url, { 
        connected: true, 
        connecting: false,
        lastConnected: Date.now()
      });

      // Schedule cleanup if keepAlive is enabled
      if (this.options.keepAlive) {
        this.scheduleConnectionCleanup(url);
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.updateState(url, { 
        connecting: false,
        error: errorMessage
      });
      this.connections.delete(url);
      return false;
    }
  }

  /**
   * Connect to all registered endpoints
   */
  public async connectAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const promises = Array.from(this.endpoints.keys()).map(async url => {
      const success = await this.connect(url);
      results.set(url, success);
    });
    await Promise.all(promises);
    return results;
  }

  /**
   * Connect to endpoints by type
   */
  public async connectByType(type: Endpoint['type']): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const endpointsOfType = Array.from(this.endpoints.entries())
      .filter(([, ep]) => ep.type === type);

    const promises = endpointsOfType.map(async ([url]) => {
      const success = await this.connect(url);
      results.set(url, success);
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Disconnect from an endpoint
   */
  public disconnect(url: string): void {
    const connection = this.connections.get(url);
    if (connection) {
      connection.controller.abort();
      if (connection.timer) {
        clearTimeout(connection.timer);
      }
      this.connections.delete(url);
    }
    this.updateState(url, { connected: false, connecting: false });
  }

  /**
   * Disconnect from all endpoints
   */
  public disconnectAll(): void {
    this.connections.forEach((_, url) => this.disconnect(url));
  }

  /**
   * Get connection state for an endpoint
   */
  public getState(url: string): ConnectionState | undefined {
    return this.connectionStates.get(url);
  }

  /**
   * Get all connection states
   */
  public getAllStates(): Map<string, ConnectionState> {
    return new Map(this.connectionStates);
  }

  /**
   * Check if an endpoint is connected
   */
  public isConnected(url: string): boolean {
    const state = this.connectionStates.get(url);
    return state?.connected ?? false;
  }

  /**
   * Perform actual preconnect (DNS, TCP, TLS)
   */
  private async performPreconnect(endpoint: Endpoint, signal: AbortSignal): Promise<void> {
    // Use fetch to establish early connection
    // This triggers DNS lookup, TCP handshake, and TLS negotiation
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), this.options.timeout);
    
    signal.addEventListener('abort', () => controller.abort());

    try {
      // Attempt a HEAD request to establish connection
      await fetch(endpoint.url, {
        method: 'HEAD',
        headers: endpoint.headers,
        credentials: endpoint.credentials || 'same-origin',
        signal: controller.signal,
        mode: 'cors'
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('Preconnect timeout');
      }
      // Don't fail on HTTP errors, connection may still be established
      // This is expected for APIs that require specific request bodies
    } finally {
      clearTimeout(timeoutTimer);
    }
  }

  /**
   * Update connection state
   */
  private updateState(url: string, updates: Partial<ConnectionState>): void {
    const current = this.connectionStates.get(url) || { url, connected: false, connecting: false };
    this.connectionStates.set(url, { ...current, ...updates });
  }

  /**
   * Schedule connection cleanup
   */
  private scheduleConnectionCleanup(url: string): void {
    const connection = this.connections.get(url);
    if (connection) {
      if (connection.timer) {
        clearTimeout(connection.timer);
      }
      // Keep connection alive for 5 minutes
      connection.timer = setTimeout(() => {
        this.disconnect(url);
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanupTimer(): void {
    // Clean up stale connections every 30 seconds
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30 * 1000);
  }

  /**
   * Clean up stale connections
   */
  private cleanupStaleConnections(): void {
    const staleThreshold = Date.now() - (10 * 60 * 1000); // 10 minutes
    
    this.connectionStates.forEach((state, url) => {
      if (state.connected && state.lastConnected && state.lastConnected < staleThreshold) {
        this.disconnect(url);
      }
    });
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): {
    totalEndpoints: number;
    connected: number;
    connecting: number;
    averageConnectTime?: number;
  } {
    let connected = 0;
    let connecting = 0;
    let totalTime = 0;
    let connectedCount = 0;

    this.connectionStates.forEach(state => {
      if (state.connected) {
        connected++;
        connectedCount++;
      }
      if (state.connecting) connecting++;
    });

    return {
      totalEndpoints: this.endpoints.size,
      connected,
      connecting,
      averageConnectTime: connectedCount > 0 ? totalTime / connectedCount : undefined
    };
  }

  /**
   * Dispose the service
   */
  public dispose(): void {
    this.disconnectAll();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Singleton instance
let preconnectServiceInstance: PreconnectService | null = null;

export function getPreconnectService(options?: Partial<PreconnectOptions>): PreconnectService {
  if (!preconnectServiceInstance) {
    preconnectServiceInstance = new PreconnectService(options);
  }
  return preconnectServiceInstance;
}
