/**
 * Skill Catalog - 技能目录服务
 * 
 * Provides skill discovery, browsing, and management functionality.
 * Supports built-in skills, plugin skills, and external skill marketplace.
 */

import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'
import { getSkillManager, type SkillDefinition, type SkillContext, type SkillResult } from './skillManager.js'

// Skill catalog entry
export interface SkillCatalogEntry {
  id: string
  name: string
  description: string
  version: string
  author: string
  tags: string[]
  category: SkillCategory
  source: SkillSource
  installed: boolean
  enabled: boolean
  downloads?: number
  rating?: number
  lastUpdated?: string
}

export type SkillCategory = 
  | 'code'
  | 'git'
  | 'testing'
  | 'documentation'
  | 'refactoring'
  | 'security'
  | 'deployment'
  | 'analysis'
  | 'automation'
  | 'other'

export type SkillSource = 'builtin' | 'plugin' | 'marketplace' | 'local'

// Skill manifest schema for plugin skills
export const skillManifestSchema = z.object({
  id: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  author: z.string().max(100),
  tags: z.array(z.string()).max(10),
  category: z.enum(['code', 'git', 'testing', 'documentation', 'refactoring', 'security', 'deployment', 'analysis', 'automation', 'other']),
  entry: z.string(), // Main file to load
  dependencies: z.record(z.string()).optional(),
  config: z.record(z.unknown()).optional(),
})

export type SkillManifest = z.infer<typeof skillManifestSchema>

// Category display info
export const CATEGORY_INFO: Record<SkillCategory, { label: string; emoji: string; description: string }> = {
  code: { label: '代码', emoji: '💻', description: '代码生成、编辑、重构工具' },
  git: { label: 'Git', emoji: '🔀', description: 'Git 操作和版本控制工具' },
  testing: { label: '测试', emoji: '🧪', description: '测试生成和验证工具' },
  documentation: { label: '文档', emoji: '📝', description: '文档生成和管理工具' },
  refactoring: { label: '重构', emoji: '🔧', description: '代码重构和优化工具' },
  security: { label: '安全', emoji: '🔒', description: '安全扫描和审计工具' },
  deployment: { label: '部署', emoji: '🚀', description: '部署和发布工具' },
  analysis: { label: '分析', emoji: '📊', description: '代码分析和洞察工具' },
  automation: { label: '自动化', emoji: '⚡', description: '批量处理和自动化工具' },
  other: { label: '其他', emoji: '📦', description: '其他工具' },
}

// Built-in skill catalog
const BUILTIN_CATALOG: SkillCatalogEntry[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for issues, bugs, and improvements',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['review', 'quality', 'analysis'],
    category: 'code',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.8,
  },
  {
    id: 'git-helper',
    name: 'Git Helper',
    description: 'Helper for common Git operations',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['git', 'version-control', 'commits'],
    category: 'git',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.5,
  },
  {
    id: 'test-generator',
    name: 'Test Generator',
    description: 'Generate unit tests for code',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['testing', 'generation', 'vitest'],
    category: 'testing',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.6,
  },
  {
    id: 'doc-generator',
    name: 'Documentation Generator',
    description: 'Generate documentation from code',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['documentation', 'readme', 'generation'],
    category: 'documentation',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.4,
  },
  {
    id: 'remember',
    name: 'Memory Review',
    description: 'Review and organize auto-memory entries',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['memory', 'organization'],
    category: 'automation',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.3,
  },
  {
    id: 'verify',
    name: 'Code Verifier',
    description: 'Verify code changes by running the app',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['verification', 'testing', 'validation'],
    category: 'testing',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.7,
  },
  {
    id: 'simplify',
    name: 'Code Simplifier',
    description: 'Simplify complex code while preserving functionality',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['refactoring', 'simplification', 'clean-code'],
    category: 'refactoring',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.5,
  },
  {
    id: 'stuck',
    name: 'Stuck Helper',
    description: 'Help when you are stuck on a problem',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['help', 'debugging', 'problem-solving'],
    category: 'other',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.2,
  },
  {
    id: 'batch',
    name: 'Batch Processor',
    description: 'Process multiple files or tasks in batch',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['batch', 'automation', 'bulk'],
    category: 'automation',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.1,
  },
  {
    id: 'keybindings',
    name: 'Keybindings Helper',
    description: 'Show and manage keyboard shortcuts',
    version: '1.0.0',
    author: 'QOOCODE',
    tags: ['keybindings', 'shortcuts', 'keyboard'],
    category: 'other',
    source: 'builtin',
    installed: true,
    enabled: true,
    downloads: 0,
    rating: 4.0,
  },
]

// Skill catalog class
class SkillCatalog {
  private catalog: SkillCatalogEntry[] = [...BUILTIN_CATALOG]
  private pluginSkills: Map<string, SkillManifest> = new Map()
  private catalogDir: string

  constructor() {
    this.catalogDir = path.join(process.cwd(), '.QOOCODE', 'skills')
    this.loadLocalSkills()
  }

  /**
   * Load local plugin skills
   */
  private loadLocalSkills(): void {
    try {
      if (!fs.existsSync(this.catalogDir)) {
        fs.mkdirSync(this.catalogDir, { recursive: true })
        return
      }

      const entries = fs.readdirSync(this.catalogDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const manifestPath = path.join(this.catalogDir, entry.name, 'skill.json')
          if (fs.existsSync(manifestPath)) {
            try {
              const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
              const manifest = skillManifestSchema.parse(JSON.parse(manifestContent))
              this.pluginSkills.set(manifest.id, manifest)
              
              // Add to catalog if not already present
              if (!this.catalog.find(s => s.id === manifest.id)) {
                this.catalog.push({
                  id: manifest.id,
                  name: manifest.name,
                  description: manifest.description,
                  version: manifest.version,
                  author: manifest.author,
                  tags: manifest.tags,
                  category: manifest.category,
                  source: 'plugin',
                  installed: true,
                  enabled: false,
                })
              }
            } catch (err) {
              console.error(`Failed to load skill manifest: ${manifestPath}`, err)
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load local skills:', err)
    }
  }

  /**
   * Get all catalog entries
   */
  getAll(): SkillCatalogEntry[] {
    return this.catalog
  }

  /**
   * Get catalog entry by ID
   */
  getById(id: string): SkillCatalogEntry | undefined {
    return this.catalog.find(s => s.id === id)
  }

  /**
   * Search skills by query
   */
  search(query: string): SkillCatalogEntry[] {
    const lowerQuery = query.toLowerCase()
    return this.catalog.filter(skill =>
      skill.name.toLowerCase().includes(lowerQuery) ||
      skill.description.toLowerCase().includes(lowerQuery) ||
      skill.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): SkillCatalogEntry[] {
    return this.catalog.filter(skill => skill.category === category)
  }

  /**
   * Get skills by source
   */
  getBySource(source: SkillSource): SkillCatalogEntry[] {
    return this.catalog.filter(skill => skill.source === source)
  }

  /**
   * Get installed skills
   */
  getInstalled(): SkillCatalogEntry[] {
    return this.catalog.filter(skill => skill.installed)
  }

  /**
   * Get enabled skills
   */
  getEnabled(): SkillCatalogEntry[] {
    return this.catalog.filter(skill => skill.enabled)
  }

  /**
   * Install a skill from local path
   */
  async installSkill(id: string, skillPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const manifestPath = path.join(skillPath, 'skill.json')
      
      if (!fs.existsSync(manifestPath)) {
        return { success: false, error: 'skill.json not found' }
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf-8')
      const manifest = skillManifestSchema.parse(JSON.parse(manifestContent))

      // Copy to catalog directory
      const targetDir = path.join(this.catalogDir, manifest.id)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      // Copy files
      const files = fs.readdirSync(skillPath)
      for (const file of files) {
        const src = path.join(skillPath, file)
        const dest = path.join(targetDir, file)
        fs.copyFileSync(src, dest)
      }

      // Add to catalog
      this.pluginSkills.set(manifest.id, manifest)
      this.catalog.push({
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        version: manifest.version,
        author: manifest.author,
        tags: manifest.tags,
        category: manifest.category,
        source: 'local',
        installed: true,
        enabled: false,
      })

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  /**
   * Uninstall a skill
   */
  async uninstallSkill(id: string): Promise<{ success: boolean; error?: string }> {
    const skill = this.getById(id)
    if (!skill) {
      return { success: false, error: 'Skill not found' }
    }

    if (skill.source === 'builtin') {
      return { success: false, error: 'Cannot uninstall built-in skills' }
    }

    try {
      const targetDir = path.join(this.catalogDir, id)
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true })
      }

      this.pluginSkills.delete(id)
      this.catalog = this.catalog.filter(s => s.id !== id)
      getSkillManager().disableSkill(id)

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  /**
   * Enable a skill
   */
  enableSkill(id: string): boolean {
    const skill = this.getById(id)
    if (!skill || !skill.installed) {
      return false
    }

    skill.enabled = true
    getSkillManager().enableSkill(id)
    return true
  }

  /**
   * Disable a skill
   */
  disableSkill(id: string): boolean {
    const skill = this.getById(id)
    if (!skill) {
      return false
    }

    skill.enabled = false
    getSkillManager().disableSkill(id)
    return true
  }

  /**
   * Get catalog statistics
   */
  getStats(): {
    total: number
    installed: number
    enabled: number
    byCategory: Record<SkillCategory, number>
    bySource: Record<SkillSource, number>
  } {
    const stats = {
      total: this.catalog.length,
      installed: this.catalog.filter(s => s.installed).length,
      enabled: this.catalog.filter(s => s.enabled).length,
      byCategory: {} as Record<SkillCategory, number>,
      bySource: {} as Record<SkillSource, number>,
    }

    for (const skill of this.catalog) {
      stats.byCategory[skill.category] = (stats.byCategory[skill.category] || 0) + 1
      stats.bySource[skill.source] = (stats.bySource[skill.source] || 0) + 1
    }

    return stats
  }

  /**
   * Format catalog for display
   */
  formatForDisplay(options?: {
    category?: SkillCategory
    source?: SkillSource
    showDisabled?: boolean
    maxPerCategory?: number
  }): string {
    let skills = this.catalog

    if (options?.category) {
      skills = skills.filter(s => s.category === options.category)
    }
    if (options?.source) {
      skills = skills.filter(s => s.source === options.source)
    }
    if (!options?.showDisabled) {
      skills = skills.filter(s => s.enabled)
    }

    const lines: string[] = [
      '📦 Skill Catalog',
      '',
      `Total: ${skills.length} skills`,
      '',
    ]

    // Group by category
    const byCategory = new Map<SkillCategory, SkillCatalogEntry[]>()
    for (const skill of skills) {
      const list = byCategory.get(skill.category) || []
      list.push(skill)
      byCategory.set(skill.category, list)
    }

    for (const [category, categorySkills] of byCategory) {
      const info = CATEGORY_INFO[category]
      const max = options?.maxPerCategory || 10
      const displayed = categorySkills.slice(0, max)

      lines.push(`${info.emoji} ${info.label} (${categorySkills.length})`)
      for (const skill of displayed) {
        const status = skill.enabled ? '✓' : '○'
        const sourceTag = skill.source === 'builtin' ? '' : ` [${skill.source}]`
        lines.push(`  ${status} ${skill.name}${sourceTag} - ${skill.description.substring(0, 50)}...`)
      }
      if (categorySkills.length > max) {
        lines.push(`  ... and ${categorySkills.length - max} more`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}

// Singleton instance
let skillCatalog: SkillCatalog | null = null

export function getSkillCatalog(): SkillCatalog {
  if (!skillCatalog) {
    skillCatalog = new SkillCatalog()
  }
  return skillCatalog
}

// Convenience functions
export function listSkills(options?: { category?: SkillCategory; source?: SkillSource }): SkillCatalogEntry[] {
  const catalog = getSkillCatalog()
  if (options?.category) {
    return catalog.getByCategory(options.category)
  }
  if (options?.source) {
    return catalog.getBySource(options.source)
  }
  return catalog.getAll()
}

export function searchSkills(query: string): SkillCatalogEntry[] {
  return getSkillCatalog().search(query)
}

export function getSkillInfo(id: string): SkillCatalogEntry | undefined {
  return getSkillCatalog().getById(id)
}

export function enableSkill(id: string): boolean {
  return getSkillCatalog().enableSkill(id)
}

export function disableSkill(id: string): boolean {
  return getSkillCatalog().disableSkill(id)
}

export async function installSkill(id: string, path: string): Promise<{ success: boolean; error?: string }> {
  return getSkillCatalog().installSkill(id, path)
}

export async function uninstallSkill(id: string): Promise<{ success: boolean; error?: string }> {
  return getSkillCatalog().uninstallSkill(id)
}

export function getSkillStats() {
  return getSkillCatalog().getStats()
}

export function formatSkillCatalog(options?: { category?: SkillCategory; maxPerCategory?: number }): string {
  return getSkillCatalog().formatForDisplay(options)
}

// Execute skill by trigger
export async function executeSkillByTrigger(
  trigger: string,
  context: SkillContext
): Promise<SkillResult | null> {
  const skillManager = getSkillManager()
  const skill = skillManager.findSkillByTrigger(trigger)
  
  if (!skill) {
    return null
  }

  const action = skill.definition.actions[0]
  if (!action) {
    return null
  }

  return skillManager.execute(
    skill.definition.id,
    action.name,
    { trigger },
    context
  )
}

export type { SkillCatalogEntry, SkillCategory, SkillSource, SkillManifest }
