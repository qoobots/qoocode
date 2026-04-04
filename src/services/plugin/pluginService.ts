/**
 * Plugin Service - Manages QOOCODE plugins
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execSync } from 'node:child_process'

export interface PluginConfig {
  name: string
  version?: string
  description?: string
  commands?: string[]
  tools?: string[]
  skills?: string[]
}

export interface InstalledPlugin extends PluginConfig {
  installedAt: string
  path: string
}

// Plugin registry stored in config
const PLUGIN_REGISTRY_FILE = '.QOOCODE/plugins.json'

/**
 * Load plugin registry
 */
async function loadRegistry(): Promise<Record<string, InstalledPlugin>> {
  try {
    const configPath = resolve(process.cwd(), PLUGIN_REGISTRY_FILE)
    if (existsSync(configPath)) {
      const content = await readFile(configPath, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // Ignore errors
  }
  return {}
}

/**
 * Save plugin registry
 */
async function saveRegistry(registry: Record<string, InstalledPlugin>): Promise<void> {
  const configDir = resolve(process.cwd(), '.QOOCODE')
  const configPath = join(configDir, PLUGIN_REGISTRY_FILE)
  
  // Ensure directory exists
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true })
  }
  
  await writeFile(configPath, JSON.stringify(registry, null, 2), 'utf-8')
}

/**
 * Plugin Manager class
 */
class PluginManager {
  private registry: Record<string, InstalledPlugin> = {}
  private loaded = false
  
  async load(): Promise<void> {
    if (this.loaded) return
    this.registry = await loadRegistry()
    this.loaded = true
  }
  
  async getInstalledPlugins(): Promise<InstalledPlugin[]> {
    await this.load()
    return Object.values(this.registry)
  }
  
  async getPlugin(name: string): Promise<InstalledPlugin | null> {
    await this.load()
    return this.registry[name] || null
  }
  
  async installPlugin(packageName: string): Promise<{ success: boolean; message: string }> {
    await this.load()
    
    try {
      // Check if already installed
      if (this.registry[packageName]) {
        return { success: false, message: `Plugin "${packageName}" is already installed` }
      }
      
      // Install the package using npm
      console.log(`Installing plugin: ${packageName}`)
      execSync(`npm install ${packageName}`, { stdio: 'pipe' })
      
      // Get package info
      let version = 'unknown'
      let description = ''
      try {
        const pkgInfo = JSON.parse(
          execSync(`npm show ${packageName} version`, { encoding: 'utf-8' })
        )
        version = typeof pkgInfo === 'string' ? pkgInfo : (pkgInfo as { version: string }).version
        description = JSON.parse(
          execSync(`npm show ${packageName} description`, { encoding: 'utf-8' }) || ''
        )
      } catch {
        // Use defaults
      }
      
      // Register the plugin
      this.registry[packageName] = {
        name: packageName,
        version,
        description,
        installedAt: new Date().toISOString(),
        path: `./node_modules/${packageName}`,
      }
      
      await saveRegistry(this.registry)
      
      return { success: true, message: `Successfully installed plugin: ${packageName}` }
    } catch (error) {
      return {
        success: false,
        message: `Failed to install plugin: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
  
  async uninstallPlugin(name: string): Promise<{ success: boolean; message: string }> {
    await this.load()
    
    const plugin = this.registry[name]
    if (!plugin) {
      return { success: false, message: `Plugin "${name}" is not installed` }
    }
    
    try {
      // Uninstall the package
      console.log(`Uninstalling plugin: ${name}`)
      execSync(`npm uninstall ${name}`, { stdio: 'pipe' })
      
      // Remove from registry
      delete this.registry[name]
      await saveRegistry(this.registry)
      
      return { success: true, message: `Successfully uninstalled plugin: ${name}` }
    } catch (error) {
      return {
        success: false,
        message: `Failed to uninstall plugin: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
  
  async reloadPlugins(): Promise<{ success: boolean; message: string }> {
    // Reload the registry
    this.registry = await loadRegistry()
    return {
      success: true,
      message: `Reloaded ${Object.keys(this.registry).length} plugins`,
    }
  }
}

// Singleton instance
let pluginManager: PluginManager | null = null

export function getPluginManager(): PluginManager {
  if (!pluginManager) {
    pluginManager = new PluginManager()
  }
  return pluginManager
}

export default PluginManager
