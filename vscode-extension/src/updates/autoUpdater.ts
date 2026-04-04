/**
 * QOOCODE Auto-Updater
 * Automatic update checking and installation for QOOCODE extension
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
  downloadUrl: string;
  isMandatory: boolean;
}

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'up-to-date' | 'error';
  progress?: number;
  updateInfo?: UpdateInfo;
  error?: string;
}

export interface UpdateSettings {
  autoCheck: boolean;
  autoDownload: boolean;
  autoInstall: boolean;
  checkInterval: number; // hours
  channel: 'stable' | 'beta' | 'nightly';
}

export class QOOCODEAutoUpdater {
  private config: QOOCODEConfig;
  private context: vscode.ExtensionContext;
  private settings: UpdateSettings;
  private status: UpdateStatus = { state: 'idle' };
  private checkTimer: NodeJS.Timeout | undefined;
  private statusChangedEmitter = new vscode.EventEmitter<UpdateStatus>();

  public readonly onStatusChanged = this.statusChangedEmitter.event;

  constructor(context: vscode.ExtensionContext, config: QOOCODEConfig) {
    this.context = context;
    this.config = config;
    this.settings = this.loadSettings();
    this.setupUpdateHandler();
  }

  /**
   * Load update settings from config
   */
  private loadSettings(): UpdateSettings {
    return {
      autoCheck: this.config.get('updates.autoCheck') ?? true,
      autoDownload: this.config.get('updates.autoDownload') ?? false,
      autoInstall: this.config.get('updates.autoInstall') ?? false,
      checkInterval: this.config.get('updates.checkInterval') ?? 24,
      channel: this.config.get('updates.channel') ?? 'stable'
    };
  }

  /**
   * Save update settings to config
   */
  public async saveSettings(settings: Partial<UpdateSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    
    if (settings.autoCheck !== undefined) {
      this.config.set('updates.autoCheck', settings.autoCheck);
    }
    if (settings.autoDownload !== undefined) {
      this.config.set('updates.autoDownload', settings.autoDownload);
    }
    if (settings.autoInstall !== undefined) {
      this.config.set('updates.autoInstall', settings.autoInstall);
    }
    if (settings.checkInterval !== undefined) {
      this.config.set('updates.checkInterval', settings.checkInterval);
    }
    if (settings.channel !== undefined) {
      this.config.set('updates.channel', settings.channel);
    }

    // Restart check timer if autoCheck changed
    if (settings.autoCheck !== undefined || settings.checkInterval !== undefined) {
      this.setupCheckTimer();
    }
  }

  /**
   * Get current update settings
   */
  public getSettings(): UpdateSettings {
    return { ...this.settings };
  }

  /**
   * Get current update status
   */
  public getStatus(): UpdateStatus {
    return { ...this.status };
  }

  /**
   * Setup VS Code native update handler
   */
  private setupUpdateHandler(): void {
    // Check for updates using VS Code's built-in update mechanism
    if (vscode.env.uiKind === vscode.UIKind.Desktop) {
      // Enable update checking
      this.context.globalState.update('updateLastCheck', Date.now());
      this.setupCheckTimer();
    }
  }

  /**
   * Setup periodic update checking
   */
  private setupCheckTimer(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    if (this.settings.autoCheck) {
      // Check immediately if needed
      this.checkForUpdates().catch(console.error);
      
      // Then check periodically
      const intervalMs = this.settings.checkInterval * 60 * 60 * 1000;
      this.checkTimer = setInterval(() => {
        this.checkForUpdates().catch(console.error);
      }, intervalMs);
    }
  }

  /**
   * Check for available updates
   */
  public async checkForUpdates(silent = false): Promise<UpdateStatus> {
    if (this.status.state === 'checking') {
      return this.status;
    }

    this.updateStatus({ state: 'checking' });

    try {
      // Get current version
      const currentVersion = this.context.extension.packageJSON.version;
      
      // Simulate checking for updates (in production, this would call the update server)
      const updateInfo = await this.fetchUpdateInfo(currentVersion);

      if (updateInfo && this.isNewerVersion(updateInfo.version, currentVersion)) {
        this.updateStatus({
          state: 'available',
          updateInfo
        });

        if (!silent && this.settings.autoDownload) {
          await this.downloadUpdate(updateInfo);
        }
      } else {
        this.updateStatus({ state: 'up-to-date' });
      }

      // Update last check time
      this.context.globalState.update('updateLastCheck', Date.now());

      return this.status;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateStatus({
        state: 'error',
        error: errorMessage
      });
      return this.status;
    }
  }

  /**
   * Fetch update information from server
   */
  private async fetchUpdateInfo(currentVersion: string): Promise<UpdateInfo | null> {
    // In production, this would fetch from a real update server
    // For now, return null to indicate no update available
    try {
      const extensions = await vscode.extensions.all;
      const QOOCODEExtension = extensions.find(ext => ext.id.includes('QOOCODE'));
      
      if (QOOCODEExtension) {
        const latestVersion = QOOCODEExtension.packageJSON.version;
        if (this.isNewerVersion(latestVersion, currentVersion)) {
          return {
            version: latestVersion,
            releaseDate: new Date().toISOString(),
            releaseNotes: 'New version available',
            downloadUrl: QOOCODEExtension.packageJSON.downloadUrl || '',
            isMandatory: false
          };
        }
      }
    } catch {
      // Ignore fetch errors
    }
    
    return null;
  }

  /**
   * Compare semantic versions
   */
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }
    
    return false;
  }

  /**
   * Download the available update
   */
  public async downloadUpdate(updateInfo?: UpdateInfo): Promise<void> {
    const info = updateInfo || this.status.updateInfo;
    if (!info) {
      throw new Error('No update available to download');
    }

    this.updateStatus({ state: 'downloading', progress: 0 });

    try {
      // Simulate download progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.updateStatus({ state: 'downloading', progress: i });
      }

      if (this.settings.autoInstall) {
        await this.installUpdate(info);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      this.updateStatus({
        state: 'error',
        error: errorMessage
      });
    }
  }

  /**
   * Install the downloaded update
   */
  public async installUpdate(updateInfo?: UpdateInfo): Promise<void> {
    const info = updateInfo || this.status.updateInfo;
    if (!info) {
      throw new Error('No update available to install');
    }

    this.updateStatus({ state: 'installing', progress: 0 });

    try {
      // Show confirmation dialog for mandatory updates
      if (info.isMandatory) {
        const choice = await vscode.window.showInformationMessage(
          `QOOCODE ${info.version} is required. The extension will restart to install.`,
          'Restart Now',
          'Later'
        );

        if (choice !== 'Restart Now') {
          this.updateStatus({ state: 'available', updateInfo: info });
          return;
        }
      } else {
        const choice = await vscode.window.showInformationMessage(
          `QOOCODE ${info.version} is available. Would you like to update?`,
          'Update Now',
          'Later',
          'View Release Notes'
        );

        if (choice === 'View Release Notes') {
          await vscode.env.openExternal(vscode.Uri.parse(info.downloadUrl));
          return;
        }

        if (choice !== 'Update Now') {
          this.updateStatus({ state: 'available', updateInfo: info });
          return;
        }
      }

      // Simulate installation
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.updateStatus({ state: 'installing', progress: i });
      }

      // Trigger extension reload
      await vscode.commands.executeCommand('workbench.action.reloadWindow');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Installation failed';
      this.updateStatus({
        state: 'error',
        error: errorMessage
      });
    }
  }

  /**
   * Dismiss the current update
   */
  public dismissUpdate(): void {
    const currentVersion = this.context.extension.packageJSON.version;
    this.context.globalState.update('dismissedUpdate', currentVersion);
    this.updateStatus({ state: 'idle' });
  }

  /**
   * Check if update was dismissed
   */
  public isUpdateDismissed(): boolean {
    const dismissedVersion = this.context.globalState.get<string>('dismissedUpdate');
    const currentVersion = this.context.extension.packageJSON.version;
    return dismissedVersion === currentVersion;
  }

  /**
   * Get time since last check
   */
  public getTimeSinceLastCheck(): number {
    const lastCheck = this.context.globalState.get<number>('updateLastCheck');
    return lastCheck ? Date.now() - lastCheck : Infinity;
  }

  /**
   * Update internal status
   */
  private updateStatus(status: Partial<UpdateStatus>): void {
    this.status = { ...this.status, ...status };
    this.statusChangedEmitter.fire(this.status);
  }

  /**
   * Show update notification if available
   */
  public async showUpdateNotification(): Promise<void> {
    if (this.status.state === 'available' && this.status.updateInfo && !this.isUpdateDismissed()) {
      const info = this.status.updateInfo;
      
      const choice = await vscode.window.showInformationMessage(
        `QOOCODE ${info.version} is available!`,
        'Update Now',
        'Later',
        'View Release Notes'
      );

      if (choice === 'Update Now') {
        await this.downloadUpdate();
      } else if (choice === 'View Release Notes') {
        await vscode.env.openExternal(vscode.Uri.parse(info.downloadUrl));
      }
    }
  }

  /**
   * Dispose the auto updater
   */
  public dispose(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    this.statusChangedEmitter.dispose();
  }
}
