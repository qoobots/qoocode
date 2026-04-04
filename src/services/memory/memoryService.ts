/**
 * Memory Service
 * 
 * Manages persistent memory files with typed taxonomy.
 * Provides MEMORY.md entrypoint management and memory file CRUD operations.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { getConfigDirPath } from '../../utils/config.js'
import {
  type MemoryEntry,
  type MemoryFile,
  MEMORY_ENTRYPOINT_NAME,
  parseFrontmatter,
  createMemoryFileTemplate,
  truncateEntrypointContent,
  type MemoryType,
  MEMORY_TYPE_DESCRIPTIONS,
} from './memoryTypes.js'

export interface MemoryServiceOptions {
  memoryDir?: string
  enableTeamMemory?: boolean
}

export class MemoryService {
  private memoryDir: string
  private teamMemoryDir: string | null = null
  
  constructor(options: MemoryServiceOptions = {}) {
    const baseDir = options.memoryDir || join(getConfigDirPath(), 'memory')
    this.memoryDir = baseDir
    this.teamMemoryDir = options.enableTeamMemory ? join(baseDir, 'team') : null
  }
  
  getMemoryDir(): string {
    return this.memoryDir
  }
  
  getTeamMemoryDir(): string | null {
    return this.teamMemoryDir
  }
  
  ensureMemoryDirExists(dir?: string): void {
    const targetDir = dir || this.memoryDir
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }
  }
  
  getEntrypointPath(dir?: string): string {
    return join(dir || this.memoryDir, MEMORY_ENTRYPOINT_NAME)
  }
  
  listMemoryFiles(dir?: string): MemoryEntry[] {
    const targetDir = dir || this.memoryDir
    if (!existsSync(targetDir)) {
      return []
    }
    
    const files = readdirSync(targetDir)
    const entries: MemoryEntry[] = []
    
    for (const file of files) {
      if (!file.endsWith('.md') || file === MEMORY_ENTRYPOINT_NAME) {
        continue
      }
      
      const filePath = join(targetDir, file)
      try {
        const content = readFileSync(filePath, 'utf-8')
        const parsed = parseFrontmatter(content)
        
        if (parsed) {
          entries.push({
            name: parsed.frontmatter.name || file.replace('.md', ''),
            description: parsed.frontmatter.description,
            type: parsed.frontmatter.type,
            createdAt: new Date(parsed.frontmatter.createdAt).getTime(),
            updatedAt: new Date(parsed.frontmatter.updatedAt).getTime(),
          })
        }
      } catch {
        // Skip files that can't be parsed
      }
    }
    
    return entries.sort((a, b) => b.updatedAt - a.updatedAt)
  }
  
  readEntrypoint(dir?: string): string {
    const entrypointPath = this.getEntrypointPath(dir)
    if (!existsSync(entrypointPath)) {
      return ''
    }
    
    try {
      return readFileSync(entrypointPath, 'utf-8')
    } catch {
      return ''
    }
  }
  
  readTruncatedEntrypoint(dir?: string) {
    const content = this.readEntrypoint(dir)
    return truncateEntrypointContent(content)
  }
  
  createMemoryEntry(params: {
    name: string
    description: string
    type: MemoryType
    content?: string
  }): MemoryEntry {
    const now = Date.now()
    const entry: MemoryEntry = {
      name: params.name,
      description: params.description,
      type: params.type,
      createdAt: now,
      updatedAt: now,
    }
    
    const fileName = `${params.name.toLowerCase().replace(/\s+/g, '-')}.md`
    const filePath = join(this.memoryDir, fileName)
    
    this.ensureMemoryDirExists()
    
    const fileContent = createMemoryFileTemplate(entry) + (params.content || '')
    writeFileSync(filePath, fileContent, 'utf-8')
    
    this.addToEntrypoint({
      name: params.name,
      description: params.description,
      type: params.type,
      fileName,
    })
    
    return entry
  }
  
  updateMemoryEntry(
    name: string,
    updates: Partial<Omit<MemoryEntry, 'createdAt'>>
  ): MemoryEntry | null {
    const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.md`
    const filePath = join(this.memoryDir, fileName)
    
    if (!existsSync(filePath)) {
      return null
    }
    
    try {
      const content = readFileSync(filePath, 'utf-8')
      const parsed = parseFrontmatter(content)
      
      if (!parsed) {
        return null
      }
      
      const updated: MemoryEntry = {
        name: updates.name || parsed.frontmatter.name || name,
        description: updates.description || parsed.frontmatter.description,
        type: updates.type || parsed.frontmatter.type,
        createdAt: new Date(parsed.frontmatter.createdAt).getTime(),
        updatedAt: Date.now(),
      }
      
      const fileContent = createMemoryFileTemplate(updated) + parsed.content
      writeFileSync(filePath, fileContent, 'utf-8')
      
      if (updates.name || updates.description || updates.type) {
        this.updateEntrypointEntry(fileName, updated)
      }
      
      return updated
    } catch {
      return null
    }
  }
  
  deleteMemoryEntry(name: string): boolean {
    const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.md`
    const filePath = join(this.memoryDir, fileName)
    
    if (!existsSync(filePath)) {
      return false
    }
    
    try {
      unlinkSync(filePath)
      this.removeFromEntrypoint(fileName)
      return true
    } catch {
      return false
    }
  }
  
  private addToEntrypoint(entry: {
    name: string
    description: string
    type: MemoryType
    fileName: string
  }): void {
    const entrypointPath = this.getEntrypointPath()
    this.ensureMemoryDirExists()
    
    const line = `- [${entry.name}](${entry.fileName}) — ${entry.type}: ${entry.description}`
    
    if (existsSync(entrypointPath)) {
      const content = readFileSync(entrypointPath, 'utf-8')
      if (content.includes('# Memory')) {
        const lines = content.split('\n')
        const insertIndex = lines.findIndex((l, i) => i > 0 && l.startsWith('#'))
        if (insertIndex > 0) {
          lines.splice(insertIndex, 0, line, '')
          writeFileSync(entrypointPath, lines.join('\n'), 'utf-8')
          return
        }
      }
      writeFileSync(entrypointPath, content + '\n' + line + '\n', 'utf-8')
    } else {
      writeFileSync(entrypointPath, `# Memory\n\n${line}\n`, 'utf-8')
    }
  }
  
  private updateEntrypointEntry(fileName: string, entry: MemoryEntry): void {
    const entrypointPath = this.getEntrypointPath()
    if (!existsSync(entrypointPath)) {
      return
    }
    
    const content = readFileSync(entrypointPath, 'utf-8')
    const lines = content.split('\n')
    const newLine = `- [${entry.name}](${fileName}) — ${entry.type}: ${entry.description}`
    
    const linkPattern = new RegExp(`\\[.*?\\]\\(${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`)
    
    for (let i = 0; i < lines.length; i++) {
      if (linkPattern.test(lines[i])) {
        lines[i] = newLine
        break
      }
    }
    
    writeFileSync(entrypointPath, lines.join('\n'), 'utf-8')
  }
  
  private removeFromEntrypoint(fileName: string): void {
    const entrypointPath = this.getEntrypointPath()
    if (!existsSync(entrypointPath)) {
      return
    }
    
    const content = readFileSync(entrypointPath, 'utf-8')
    const lines = content.split('\n')
    const linkPattern = new RegExp(`\\[.*?\\]\\(${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`)
    
    const filtered = lines.filter(l => !linkPattern.test(l))
    writeFileSync(entrypointPath, filtered.join('\n'), 'utf-8')
  }
  
  searchByType(type: MemoryType): MemoryEntry[] {
    return this.listMemoryFiles().filter(e => e.type === type)
  }
  
  buildMemoryPrompt(): string {
    const lines: string[] = []
    
    lines.push(
      '# Memory',
      '',
      `You have a persistent memory system at \`${this.memoryDir}\`.`,
      '',
      '## Memory Types',
      '',
      ...Object.entries(MEMORY_TYPE_DESCRIPTIONS).map(
        ([type, desc]) => `- **${type}**: ${desc}`
      ),
      '',
      '## How to save memories',
      '1. Write each memory to its own file using frontmatter format',
      '2. Add a pointer to MEMORY.md index',
      '',
      '## When to access memory',
      '- Starting a new session',
      '- User asks about preferences',
      '- Making corrections',
      '',
    )
    
    const entrypoint = this.readTruncatedEntrypoint()
    if (entrypoint.content) {
      lines.push('', '## MEMORY.md', '', entrypoint.content)
    } else {
      lines.push('', '## MEMORY.md', '', 'Your MEMORY.md is currently empty.')
    }
    
    return lines.join('\n')
  }
}

let memoryServiceInstance: MemoryService | null = null

export function getMemoryService(): MemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService()
  }
  return memoryServiceInstance
}
