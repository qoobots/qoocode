/**
 * QOOCODE VS Code Extension
 * Marketplace integration
 */

import * as vscode from 'vscode';
import { QOOCODEConfig } from '../config/config';

export interface Extension {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloadCount: number;
  rating: number;
  tags: string[];
  icon?: string;
}

export interface ExtensionCategory {
  id: string;
  name: string;
  description: string;
}

export class QOOCODEMarketplaceProvider {
  private config: QOOCODEConfig;
  private outputChannel: vscode.OutputChannel;
  private cache: Map<string, Extension[]> = new Map();
  private cacheTime: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: QOOCODEConfig) {
    this.config = config;
    this.outputChannel = vscode.window.createOutputChannel('QOOCODE Marketplace');
  }

  /**
   * Search extensions in marketplace
   */
  async search(query: string, category?: string): Promise<Extension[]> {
    const cacheKey = `${query}:${category}`;

    // Check cache
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    // Would call marketplace API
    this.outputChannel.appendLine(`Searching for: ${query}`);
    
    // Mock results
    const results = this.mockSearch(query);
    
    // Cache results
    this.cache.set(cacheKey, results);
    this.cacheTime.set(cacheKey, Date.now());

    return results;
  }

  private isCacheValid(key: string): boolean {
    const time = this.cacheTime.get(key);
    if (!time) return false;
    return Date.now() - time < this.CACHE_DURATION;
  }

  private mockSearch(query: string): Extension[] {
    return [
      {
        id: 'QOOCODE.extension.example',
        name: 'Example Extension',
        description: `Extensions matching: ${query}`,
        author: 'QOOCODE',
        version: '1.0.0',
        downloadCount: 1000,
        rating: 4.5,
        tags: ['QOOCODE', 'extension', query]
      }
    ];
  }

  /**
   * Get featured extensions
   */
  async getFeatured(): Promise<Extension[]> {
    return [
      {
        id: 'QOOCODE.featured.ai-review',
        name: 'AI Code Review',
        description: 'Advanced AI-powered code review',
        author: 'QOOCODE',
        version: '1.0.0',
        downloadCount: 5000,
        rating: 4.8,
        tags: ['ai', 'review', 'quality']
      },
      {
        id: 'QOOCODE.featured.security',
        name: 'Security Scanner',
        description: 'AI-powered security vulnerability detection',
        author: 'QOOCODE',
        version: '1.0.0',
        downloadCount: 3000,
        rating: 4.6,
        tags: ['security', 'scanner', 'vulnerability']
      }
    ];
  }

  /**
   * Get extension categories
   */
  getCategories(): ExtensionCategory[] {
    return [
      { id: 'ai', name: 'AI & Machine Learning', description: 'AI-powered tools' },
      { id: 'security', name: 'Security', description: 'Security and vulnerability tools' },
      { id: 'productivity', name: 'Productivity', description: 'Boost your productivity' },
      { id: 'testing', name: 'Testing', description: 'Testing and QA tools' },
      { id: 'documentation', name: 'Documentation', description: 'Documentation generators' }
    ];
  }

  /**
   * Install extension
   */
  async install(extensionId: string): Promise<boolean> {
    this.outputChannel.appendLine(`Installing: ${extensionId}`);
    
    try {
      // Would install via VS Code API
      await vscode.commands.executeCommand('extension.open', extensionId);
      return true;
    } catch (error) {
      this.outputChannel.appendLine(`Error: ${error}`);
      return false;
    }
  }

  /**
   * Uninstall extension
   */
  async uninstall(extensionId: string): Promise<boolean> {
    this.outputChannel.appendLine(`Uninstalling: ${extensionId}`);
    // Would uninstall via VS Code API
    return true;
  }

  /**
   * Get installed extensions
   */
  async getInstalled(): Promise<Extension[]> {
    const extensions = vscode.extensions.all;
    return extensions.map(ext => ({
      id: ext.id,
      name: ext.packageJSON.displayName || ext.packageJSON.name,
      description: ext.packageJSON.description || '',
      author: ext.packageJSON.author?.name || 'Unknown',
      version: ext.packageJSON.version,
      downloadCount: 0,
      rating: 0,
      tags: ext.packageJSON.keywords || []
    }));
  }

  dispose(): void {
    this.outputChannel.dispose();
    this.cache.clear();
  }
}

export class QOOCODEExtensionGallery {
  private marketplace: QOOCODEMarketplaceProvider;

  constructor(marketplace: QOOCODEMarketplaceProvider) {
    this.marketplace = marketplace;
  }

  /**
   * Show extension gallery view
   */
  async showGallery(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'QOOCODE.gallery',
      'QOOCODE Extension Gallery',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const featured = await this.marketplace.getFeatured();
    const categories = this.marketplace.getCategories();

    panel.webview.html = this.getGalleryHtml(featured, categories);
  }

  private getGalleryHtml(
    featured: Extension[],
    categories: ExtensionCategory[]
  ): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #007acc; }
    .extension {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    .extension h3 { margin: 0 0 8px 0; }
    .meta { color: #666; font-size: 12px; }
    button {
      background: #007acc;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <h1>🎨 QOOCODE Extension Gallery</h1>
  <div class="featured">
    <h2>Featured Extensions</h2>
    ${featured.map(ext => `
      <div class="extension">
        <h3>${ext.name}</h3>
        <p>${ext.description}</p>
        <div class="meta">
          By ${ext.author} | ${ext.downloadCount} downloads | ⭐ ${ext.rating}
        </div>
        <button onclick="install('${ext.id}')">Install</button>
      </div>
    `).join('')}
  </div>
  <script>
    function install(id) {
      vscode.postMessage({ command: 'install', id });
    }
  </script>
</body>
</html>`;
  }
}
