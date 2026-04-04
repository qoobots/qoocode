/**
 * Hooks Service - Manages hooks for tool execution
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execSync } from 'node:child_process'

export type HookEvent = 
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Stop'
  | 'PreToolUseCommand'
  | 'PostToolUseCommand'

export type ToolMatcher = 
  | 'Write'
  | 'Edit'
  | 'Read'
  | 'Bash'
  | string

export interface Hook {
  id: string
  event: HookEvent
  matcher?: ToolMatcher | ToolMatcher[]
  command: string
  description?: string
  enabled: boolean
  source: 'project' | 'personal'
}

export interface HooksConfig {
  hooks: Hook[]
  version: string
}

// Hooks config file locations
const PROJECT_HOOKS_FILE = '.qoocode/settings.json'
const PERSONAL_HOOKS_FILE = '.qoocode/settings.local.json'

/**
 * Default hooks config
 */
function createDefaultConfig(): HooksConfig {
  return {
    hooks: [],
    version: '1.0',
  }
}

/**
 * Load hooks config from file
 */
async function loadConfig(filePath: string): Promise<HooksConfig> {
  try {
    if (existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content)
    }
  } catch {
    // Ignore errors
  }
  return createDefaultConfig()
}

/**
 * Save hooks config to file
 */
async function saveConfig(filePath: string, config: HooksConfig): Promise<void> {
  const dir = resolve(filePath, '..')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * Hooks Manager class
 */
class HooksManager {
  private projectConfig: HooksConfig | null = null
  private personalConfig: HooksConfig | null = null
  private loaded = false
  
  async load(): Promise<void> {
    if (this.loaded) return
    
    const projectPath = resolve(process.cwd(), PROJECT_HOOKS_FILE)
    const personalPath = resolve(process.cwd(), PERSONAL_HOOKS_FILE)
    
    this.projectConfig = await loadConfig(projectPath)
    this.personalConfig = await loadConfig(personalPath)
    this.loaded = true
  }
  
  private getConfig(source: 'project' | 'personal'): HooksConfig {
    return source === 'project' ? this.projectConfig! : this.personalConfig!
  }
  
  private getFilePath(source: 'project' | 'personal'): string {
    const base = source === 'project' ? process.cwd() : process.env.HOME || process.env.USERPROFILE
    return source === 'project' 
      ? resolve(base, PROJECT_HOOKS_FILE)
      : join(base, '.qoocode', 'settings.local.json')
  }
  
  /**
   * Get all hooks (merged from project and personal)
   */
  async getAllHooks(): Promise<Hook[]> {
    await this.load()
    return [
      ...(this.projectConfig?.hooks || []),
      ...(this.personalConfig?.hooks || []),
    ]
  }
  
  /**
   * Get hooks for a specific event and tool
   */
  async getHooksForEvent(
    event: HookEvent,
    toolName?: string
  ): Promise<Hook[]> {
    const allHooks = await this.getAllHooks()
    return allHooks.filter(hook => {
      if (!hook.enabled) return false
      if (hook.event !== event) return false
      
      // Check tool matcher
      if (toolName && hook.matcher) {
        const matchers = Array.isArray(hook.matcher) ? hook.matcher : [hook.matcher]
        if (!matchers.some(m => toolName.includes(m) || m === toolName)) {
          return false
        }
      }
      
      return true
    })
  }
  
  /**
   * Add a new hook
   */
  async addHook(
    hook: Omit<Hook, 'id'>,
    source: 'project' | 'personal' = 'project'
  ): Promise<Hook> {
    await this.load()
    
    const config = this.getConfig(source)
    const id = `hook-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    
    const newHook: Hook = {
      ...hook,
      id,
    }
    
    config.hooks.push(newHook)
    await saveConfig(this.getFilePath(source), config)
    
    return newHook
  }
  
  /**
   * Update a hook
   */
  async updateHook(
    id: string,
    updates: Partial<Omit<Hook, 'id'>>
  ): Promise<Hook | null> {
    await this.load()
    
    // Search in both configs
    for (const config of [this.projectConfig, this.personalConfig]) {
      const index = config!.hooks.findIndex(h => h.id === id)
      if (index !== -1) {
        config!.hooks[index] = { ...config!.hooks[index], ...updates }
        const source = config === this.projectConfig ? 'project' : 'personal'
        await saveConfig(this.getFilePath(source), config!)
        return config!.hooks[index]
      }
    }
    
    return null
  }
  
  /**
   * Remove a hook
   */
  async removeHook(id: string): Promise<boolean> {
    await this.load()
    
    for (const config of [this.projectConfig, this.personalConfig]) {
      const index = config!.hooks.findIndex(h => h.id === id)
      if (index !== -1) {
        config!.hooks.splice(index, 1)
        const source = config === this.projectConfig ? 'project' : 'personal'
        await saveConfig(this.getFilePath(source), config!)
        return true
      }
    }
    
    return false
  }
  
  /**
   * Execute a hook
   */
  async executeHook(hook: Hook, context: Record<string, unknown>): Promise<{
    success: boolean
    output?: string
    error?: string
  }> {
    try {
      // Replace placeholders in command
      let command = hook.command
      for (const [key, value] of Object.entries(context)) {
        command = command.replace(new RegExp(`\\$${key}`, 'g'), String(value))
      }
      
      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 30000, // 30 second timeout
      })
      
      return { success: true, output: output.toString() }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
  
  /**
   * Execute all applicable hooks for an event
   */
  async executeHooksForEvent(
    event: HookEvent,
    toolName?: string,
    context?: Record<string, unknown>
  ): Promise<Array<{ hook: Hook; result: { success: boolean; output?: string; error?: string } }>> {
    const hooks = await this.getHooksForEvent(event, toolName)
    const results: Array<{ hook: Hook; result: { success: boolean; output?: string; error?: string } }> = []
    
    for (const hook of hooks) {
      const result = await this.executeHook(hook, context || {})
      results.push({ hook, result })
    }
    
    return results
  }
  
  /**
   * Validate a hook command
   */
  validateHookCommand(command: string): { valid: boolean; error?: string } {
    if (!command.trim()) {
      return { valid: false, error: 'Command cannot be empty' }
    }
    
    // Check for potentially dangerous commands
    const dangerousPatterns = [
      /^rm\s+-rf\s+\//, // Root rm -rf
      /^dd\s+/, // dd command
      /^mkfs/, // mkfs command
    ]
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command.trim())) {
        return { valid: false, error: 'Command contains potentially dangerous operations' }
      }
    }
    
    return { valid: true }
  }
}

// Singleton instance
let hooksManager: HooksManager | null = null

export function getHooksManager(): HooksManager {
  if (!hooksManager) {
    hooksManager = new HooksManager()
  }
  return hooksManager
}

export type { HooksConfig }
export default HooksManager
