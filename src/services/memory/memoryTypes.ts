/**
 * Memory Types and Taxonomy
 * 
 * Defines the typed memory system with four types:
 * - user: Facts about the user, their role, preferences
 * - feedback: Corrections and suggestions from the user
 * - project: Project-specific context and decisions
 * - reference: External resources and documentation
 */

export const MEMORY_ENTRYPOINT_NAME = 'MEMORY.md'
export const MAX_ENTRYPOINT_LINES = 200
export const MAX_ENTRYPOINT_BYTES = 25_000

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference'

export const MEMORY_TYPE_DESCRIPTIONS: Record<MemoryType, string> = {
  user: 'Facts about the user, their role, preferences, and collaboration style',
  feedback: 'Corrections and suggestions from the user',
  project: 'Project-specific context, decisions, and technical details',
  reference: 'External resources, documentation, and useful links',
}

export interface MemoryEntry {
  name: string
  description: string
  type: MemoryType
  createdAt: number
  updatedAt: number
}

export interface MemoryFile {
  frontmatter: {
    name: string
    description: string
    type: MemoryType
    createdAt: string
    updatedAt: string
  }
  content: string
}

export const MEMORY_FRONTMATTER_EXAMPLE = [
  '```yaml',
  '# Memory Entry Frontmatter',
  'name: example-entry',
  'description: Brief description of what this memory contains',
  'type: user | feedback | project | reference',
  'createdAt: 2026-04-02',
  'updatedAt: 2026-04-02',
  '```',
]

export const MEMORY_TYPE_GUIDELINES = [
  '## Memory Types',
  '',
  'Each memory has a specific type:',
  '',
  '**user** - Facts about the user:',
  '- Role and responsibilities',
  '- Preferences',
  '- Working style',
  '',
  '**feedback** - Corrections and suggestions:',
  '- Behavioral corrections',
  '- Style preferences',
  '',
  '**project** - Project-specific context:',
  '- Architecture decisions',
  '- Team conventions',
  '',
  '**reference** - External resources:',
  '- Documentation links',
  '- API documentation',
]

export const WHAT_NOT_TO_SAVE_SECTION = [
  '## What NOT to save to memory',
  '',
  '**Code patterns** derivable from the codebase',
  '**Transient information** (use tasks instead)',
  '**Information the user wants to keep private**',
]

export const WHEN_TO_ACCESS_SECTION = [
  '## When to access memory',
  '',
  'Read memory when:',
  '- Starting a new session',
  '- User asks about their preferences',
  '- Making suggestions or corrections',
  '',
  'Update memory when:',
  '- User explicitly says to remember something',
  '- User corrects your behavior',
]

export function createMemoryFileTemplate(entry: MemoryEntry): string {
  return `---
name: ${entry.name}
description: ${entry.description}
type: ${entry.type}
createdAt: ${new Date(entry.createdAt).toISOString().split('T')[0]}
updatedAt: ${new Date(entry.updatedAt).toISOString().split('T')[0]}
---

# ${entry.name}

${entry.description}
`
}

export function parseFrontmatter(content: string): MemoryFile | null {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (!match) return null
  
  const frontmatterStr = match[1]
  const body = match[2]
  
  const frontmatter: Record<string, string> = {}
  for (const line of frontmatterStr.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim()
      frontmatter[key] = value
    }
  }
  
  return {
    frontmatter: {
      name: frontmatter.name || '',
      description: frontmatter.description || '',
      type: (frontmatter.type as MemoryType) || 'reference',
      createdAt: frontmatter.createdAt || '',
      updatedAt: frontmatter.updatedAt || '',
    },
    content: body,
  }
}

export function truncateEntrypointContent(raw: string): {
  content: string
  lineCount: number
  byteCount: number
  wasLineTruncated: boolean
  wasByteTruncated: boolean
} {
  const trimmed = raw.trim()
  const contentLines = trimmed.split('\n')
  const lineCount = contentLines.length
  const byteCount = trimmed.length
  
  const wasLineTruncated = lineCount > MAX_ENTRYPOINT_LINES
  const wasByteTruncated = byteCount > MAX_ENTRYPOINT_BYTES
  
  if (!wasLineTruncated && !wasByteTruncated) {
    return { content: trimmed, lineCount, byteCount, wasLineTruncated, wasByteTruncated }
  }
  
  let truncated = wasLineTruncated
    ? contentLines.slice(0, MAX_ENTRYPOINT_LINES).join('\n')
    : trimmed
  
  if (truncated.length > MAX_ENTRYPOINT_BYTES) {
    const cutAt = truncated.lastIndexOf('\n', MAX_ENTRYPOINT_BYTES)
    truncated = truncated.slice(0, cutAt > 0 ? cutAt : MAX_ENTRYPOINT_BYTES)
  }
  
  return {
    content: truncated + `\n\n> WARNING: ${MEMORY_ENTRYPOINT_NAME} was truncated`,
    lineCount,
    byteCount,
    wasLineTruncated,
    wasByteTruncated,
  }
}
