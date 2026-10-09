import { getTools } from '../tools.js'
import { getCwd } from '../utils/cwd.js'
import { APP_NAME, APP_VERSION } from '../constants/defaults.js'
import { existsSync, readFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { getMemoryService } from '../services/memory/memoryService.js'

// 项目记忆文件命名（与 Claude Code 的 CLAUDE.md 约定对齐，并提供 qoocode 专属别名）
const PROJECT_MEMORY_FILES = ['CLAUDE.md', 'qoocode.md']
// 向上遍历的最大层数，避免走到文件系统根导致过慢
const MAX_MEMORY_DEPTH = 10
// 单个记忆文件读取上限，超大文件截断，避免撑爆上下文
const MAX_MEMORY_FILE_BYTES = 50 * 1024

/**
 * 向上遍历工作目录及其父目录，收集项目记忆文件（CLAUDE.md / qoocode.md）。
 * 对标 Claude Code 自动读取项目 CLAUDE.md / 嵌套 CLAUDE.md 的能力。
 */
export function loadProjectMemory(startDir: string): string {
  const blocks: string[] = []
  const seen = new Set<string>()
  let dir = resolve(startDir)
  let depth = 0

  while (depth < MAX_MEMORY_DEPTH) {
    for (const name of PROJECT_MEMORY_FILES) {
      const filePath = join(dir, name)
      if (seen.has(filePath)) continue
      seen.add(filePath)
      if (!existsSync(filePath)) continue
      try {
        const raw = readFileSync(filePath, 'utf-8')
        const content =
          raw.length > MAX_MEMORY_FILE_BYTES
            ? raw.slice(0, MAX_MEMORY_FILE_BYTES) + '\n...(truncated)'
            : raw
        const trimmed = content.trim()
        if (trimmed) {
          blocks.push(`# ${name} (${filePath})\n${trimmed}`)
        }
      } catch {
        // 忽略无法读取的文件
      }
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
    depth++
  }

  return blocks.join('\n\n')
}

/**
 * Build the system prompt for the AI assistant
 */
export function buildSystemPrompt(): string {
  const cwd = getCwd()
  const toolDescriptions = getTools()
    .map((t) => `${t.name}: ${t.description}`)
    .join('\n')

  const projectMemory = loadProjectMemory(cwd)
  const memoryPrompt = getMemoryService().buildMemoryPrompt()

  return `You are ${APP_NAME} (v${APP_VERSION}), an AI coding assistant running in the terminal. You help users with programming tasks by reading, writing, and editing files, running commands, and searching code.

## Current Environment
- Working directory: ${cwd}
- Platform: ${process.platform}
- Shell: ${process.platform === 'win32' ? 'PowerShell' : 'bash'}

## Available Tools
${toolDescriptions}

## Project Memory
${projectMemory || '(no CLAUDE.md / qoocode.md found in the working directory or its parent directories)'}

## Memory
${memoryPrompt}

## Guidelines
- When reading files, always show relevant content with line numbers.
- When editing files, use FileEdit for targeted replacements and FileWrite for creating new files.
- Before running commands, consider what the user is trying to accomplish.
- Use Grep to search file contents and Glob to find files by name.
- Be concise and direct. Show code changes, not explanations.
- If a task requires multiple steps, work through them systematically.
- Always use absolute paths when referring to files.
- Respect the instructions in Project Memory / CLAUDE.md above; they take precedence over these generic guidelines.

## Output Format
- Use markdown for formatting
- Use fenced code blocks with language hints for code
- Keep responses focused and actionable`
}
