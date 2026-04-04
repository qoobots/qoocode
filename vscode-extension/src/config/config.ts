/**
 * qoocode VS Code Extension
 * Configuration management
 */

import * as vscode from 'vscode';

export interface QoocodeConfiguration {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  autoStart: boolean;
  showNotifications: boolean;
  terminalLocation: 'bottom' | 'right' | 'left';
  theme: 'auto' | 'light' | 'dark';
  speechEnabled: boolean;
  voiceInputEnabled: boolean;
  autoCompact: boolean;
  maxContextTokens: number;
  safeMode: boolean;
}

const DEFAULT_CONFIG: QoocodeConfiguration = {
  apiKey: '',
  model: 'deepseek-chat',
  maxTokens: 8192,
  temperature: 1,
  autoStart: false,
  showNotifications: true,
  terminalLocation: 'bottom',
  theme: 'auto',
  speechEnabled: false,
  voiceInputEnabled: false,
  autoCompact: true,
  maxContextTokens: 200000,
  safeMode: true
};

export class QoocodeConfig {
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration('qoocode');
  }

  get<K extends keyof QoocodeConfiguration>(
    key: K
  ): QoocodeConfiguration[K] {
    return this.config.get<K>(key) ?? DEFAULT_CONFIG[key];
  }

  set<K extends keyof QoocodeConfiguration>(
    key: K,
    value: QoocodeConfiguration[K]
  ): Thenable<void> {
    return this.config.update(key, value, true);
  }

  getAll(): QoocodeConfiguration {
    const result: QoocodeConfiguration = { ...DEFAULT_CONFIG };

    for (const key of Object.keys(DEFAULT_CONFIG) as Array<keyof QoocodeConfiguration>) {
      const value = this.config.get<QoocodeConfiguration[typeof key]>(key);
      if (value !== undefined) {
        result[key] = value;
      }
    }

    return result;
  }

  getApiKey(): string {
    // Check qoocode config first, then fall back to environment
    const configKey = this.get('apiKey');
    if (configKey) {
      return configKey;
    }

    // Check environment variable
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) {
      return envKey;
    }

    return '';
  }

  hasApiKey(): boolean {
    return !!this.getApiKey();
  }

  reset(): Thenable<void> {
    const resets: Thenable<void>[] = [];

    for (const key of Object.keys(DEFAULT_CONFIG)) {
      resets.push(this.config.update(key, DEFAULT_CONFIG[key as keyof QoocodeConfiguration], true));
    }

    return Promise.all(resets).then(() => void 0);
  }
}
