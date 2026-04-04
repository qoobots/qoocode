import { z } from 'zod'

// Permission types
export type PermissionType = 
  | 'file:read'
  | 'file:write'
  | 'file:delete'
  | 'dir:read'
  | 'dir:create'
  | 'dir:delete'
  | 'network:fetch'
  | 'network:connect'
  | 'shell:execute'
  | 'env:read'
  | 'env:write'

export type PermissionLevel = 'allow' | 'deny' | 'prompt'

export interface PermissionRule {
  type: PermissionType
  pattern?: string  // Glob pattern for path matching
  level: PermissionLevel
  description?: string
}

export interface PermissionResult {
  behavior: 'allow' | 'deny' | 'prompt'
  updatedInput?: Record<string, unknown>
  reason?: string
}

// Input schema for permission check
const checkPermissionInput = z.object({
  action: z.enum(['file:read', 'file:write', 'file:delete', 'dir:read', 'dir:create', 'dir:delete', 'network:fetch', 'network:connect', 'shell:execute', 'env:read', 'env:write'])
    .describe('Type of permission to check'),
  path: z.string().optional().describe('File or directory path involved'),
  requestedBy: z.string().optional().describe('Tool or component requesting permission'),
})

type CheckPermissionInput = z.infer<typeof checkPermissionInput>

// Permission configuration
interface PermissionConfig {
  rules: PermissionRule[]
  defaultLevel: PermissionLevel
  enablePatterns: boolean
}

const DEFAULT_CONFIG: PermissionConfig = {
  rules: [
    // File read - allow by default
    { type: 'file:read', level: 'allow', description: 'Read files' },
    // File write - prompt by default
    { type: 'file:write', level: 'prompt', description: 'Write files' },
    // File delete - deny by default (dangerous)
    { type: 'file:delete', level: 'deny', description: 'Delete files' },
    // Directory read - allow
    { type: 'dir:read', level: 'allow', description: 'Read directories' },
    // Directory create - prompt
    { type: 'dir:create', level: 'prompt', description: 'Create directories' },
    // Directory delete - deny
    { type: 'dir:delete', level: 'deny', description: 'Delete directories' },
    // Network fetch - allow
    { type: 'network:fetch', level: 'allow', description: 'Fetch web content' },
    // Network connect - prompt
    { type: 'network:connect', level: 'prompt', description: 'Connect to network' },
    // Shell execute - deny by default
    { type: 'shell:execute', level: 'deny', description: 'Execute shell commands' },
    // Env read - allow
    { type: 'env:read', level: 'allow', description: 'Read environment variables' },
    // Env write - deny
    { type: 'env:write', level: 'deny', description: 'Write environment variables' },
  ],
  defaultLevel: 'prompt',
  enablePatterns: true,
}

class PermissionManager {
  private config: PermissionConfig
  private customRules: PermissionRule[] = []

  constructor(config?: Partial<PermissionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Check if an action is allowed
  check(action: PermissionType, path?: string): PermissionResult {
    // Check custom rules first (highest priority)
    for (const rule of this.customRules) {
      if (rule.type === action) {
        if (rule.pattern && path) {
          // Pattern matching
          if (this.matchPattern(rule.pattern, path)) {
            return { behavior: rule.level, reason: rule.description }
          }
        } else {
          return { behavior: rule.level, reason: rule.description }
        }
      }
    }

    // Check default rules
    for (const rule of this.config.rules) {
      if (rule.type === action) {
        if (rule.pattern && path) {
          if (this.matchPattern(rule.pattern, path)) {
            return { behavior: rule.level, reason: rule.description }
          }
        } else {
          return { behavior: rule.level, reason: rule.description }
        }
      }
    }

    // Default to config default
    return { behavior: this.config.defaultLevel }
  }

  // Add a custom rule
  addRule(rule: PermissionRule): void {
    this.customRules.unshift(rule) // Prepend for higher priority
  }

  // Remove a custom rule
  removeRule(type: PermissionType): void {
    this.customRules = this.customRules.filter((r) => r.type !== type)
  }

  // Simple glob pattern matching
  private matchPattern(pattern: string, path: string): boolean {
    // Convert glob to regex
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    return new RegExp(`^${regex}$`, 'i').test(path)
  }

  // Get all rules
  getRules(): PermissionRule[] {
    return [...this.customRules, ...this.config.rules]
  }

  // Reset to defaults
  reset(): void {
    this.customRules = []
  }

  // Update config
  updateConfig(newConfig: Partial<PermissionConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}

// Default permission manager instance
let permissionManager: PermissionManager | null = null

export function getPermissionManager(): PermissionManager {
  if (!permissionManager) {
    permissionManager = new PermissionManager()
  }
  return permissionManager
}

// Convenience functions
export function checkPermission(action: PermissionType, path?: string): PermissionResult {
  return getPermissionManager().check(action, path)
}

export function allowAction(action: PermissionType, description?: string): void {
  getPermissionManager().addRule({ type: action, level: 'allow', description })
}

export function denyAction(action: PermissionType, description?: string): void {
  getPermissionManager().addRule({ type: action, level: 'deny', description })
}

export function promptAction(action: PermissionType, description?: string): void {
  getPermissionManager().addRule({ type: action, level: 'prompt', description })
}

// Helper to check if path is in safe location
export function isPathSafe(path: string, allowedDirs: string[]): boolean {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase()
  return allowedDirs.some((dir) => normalizedPath.startsWith(dir.toLowerCase()))
}

// Helper to check for dangerous operations
export function isDangerousOperation(action: PermissionType): boolean {
  const dangerous = ['file:delete', 'dir:delete', 'shell:execute', 'env:write']
  return dangerous.includes(action)
}
