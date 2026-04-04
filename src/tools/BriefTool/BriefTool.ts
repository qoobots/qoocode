import { z } from 'zod'
import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  path: z.string().describe('File or directory path to summarize'),
  maxLines: z.number().optional().describe('Maximum lines to read for summary (default: 500)'),
  includeImports: z.boolean().optional().describe('Include import statements (default: true)'),
  includeExports: z.boolean().optional().describe('Include export statements (default: true)'),
})

type Input = z.infer<typeof inputSchema>

interface FileSummary {
  name: string
  type: 'file' | 'directory'
  size: number
  lines: number
  language?: string
  imports?: string[]
  exports?: string[]
  summary?: string
}

function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase()
  const langMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.py': 'Python',
    '.java': 'Java',
    '.go': 'Go',
    '.rs': 'Rust',
    '.c': 'C',
    '.cpp': 'C++',
    '.cs': 'C#',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.md': 'Markdown',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.xml': 'XML',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
  }
  return langMap[ext]
}

function extractImports(content: string, language: string): string[] {
  const imports: string[] = []

  if (['TypeScript', 'TypeScript (React)', 'JavaScript', 'JavaScript (React)'].includes(language)) {
    const importRegex = /import\s+(?:\{[^}]*\}|\w+)\s+from\s+['"]([^'"]+)['"]/g
    let match
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1])
    }
    // Also handle static imports
    const staticRegex = /import\s+['"]([^'"]+)['"]/g
    while ((match = staticRegex.exec(content)) !== null && !imports.includes(match[1])) {
      imports.push(match[1])
    }
  } else if (language === 'Python') {
    const importRegex = /^(?:from\s+(\S+)\s+)?import\s+([\w,\s]+)/gm
    let match
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) imports.push(match[1])
      else if (match[2]) {
        match[2].split(',').forEach((m: string) => imports.push(m.trim()))
      }
    }
  } else if (language === 'Go') {
    const importRegex = /import\s+(?:\(\n([^)]+)\)|["']([^"']+)["'])/g
    let match
    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[1] || match[2]
      if (imp) {
        imp.split('\n').forEach((m: string) => {
          const pkg = m.replace(/["']/g, '').trim()
          if (pkg) imports.push(pkg)
        })
      }
    }
  } else if (language === 'Rust') {
    const importRegex = /use\s+([^;]+)/g
    let match
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1].trim())
    }
  }

  return imports.slice(0, 10) // Limit to 10 imports
}

function extractExports(content: string, language: string): string[] {
  const exports: string[] = []

  if (['TypeScript', 'TypeScript (React)', 'JavaScript', 'JavaScript (React)'].includes(language)) {
    const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)\s+(\w+)/g
    let match
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1])
    }
    // Named exports
    const namedRegex = /export\s+\{([^}]+)\}/g
    while ((match = namedRegex.exec(content)) !== null) {
      match[1].split(',').forEach((m: string) => exports.push(m.trim()))
    }
  } else if (language === 'Python') {
    const exportRegex = /^def\s+(\w+)|^class\s+(\w+)/gm
    let match
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1] || match[2])
    }
  } else if (language === 'Rust') {
    const exportRegex = /pub\s+(?:fn|struct|enum|impl|trait)\s+(\w+)/g
    let match
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1])
    }
  }

  return exports.slice(0, 10)
}

function generateSummary(content: string, maxLines: number): string {
  const lines = content.split('\n').slice(0, maxLines)
  const truncated = lines.join('\n')

  // Simple summary: first 3 lines of non-empty content
  const nonEmpty = lines.filter((l) => l.trim().length > 0).slice(0, 3)
  return nonEmpty.join(' ').slice(0, 200)
}

async function summarizeFile(filePath: string, maxLines: number): Promise<FileSummary> {
  const stats = await stat(filePath)
  const content = await readFile(filePath, 'utf-8')
  const lines = content.split('\n')
  const language = detectLanguage(filePath) || 'Unknown'

  const imports = inputSchema.shape.includeImports ? extractImports(content, language) : []
  const exports = inputSchema.shape.includeExports ? extractExports(content, language) : []

  return {
    name: path.basename(filePath),
    type: 'file',
    size: stats.size,
    lines: lines.length,
    language,
    imports,
    exports,
    summary: generateSummary(content, maxLines),
  }
}

async function summarizeDirectory(dirPath: string, maxLines: number): Promise<FileSummary[]> {
  const entries = await readdir(dirPath)
  const summaries: FileSummary[] = []

  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'target', 'coverage', '.next']

  for (const entry of entries.slice(0, 20)) {
    if (entry.startsWith('.')) continue

    const fullPath = path.join(dirPath, entry)
    try {
      const stats = await stat(fullPath)

      if (stats.isDirectory()) {
        if (!ignoreDirs.includes(entry)) {
          summaries.push({
            name: entry,
            type: 'directory',
            size: 0,
            lines: 0,
            summary: `Directory with ${(await readdir(fullPath)).length} items`,
          })
        }
      } else {
        const ext = path.extname(entry)
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.md'].includes(ext)) {
          summaries.push(await summarizeFile(fullPath, maxLines))
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return summaries
}

export const BriefTool = buildTool({
  name: 'Brief',
  aliases: ['brief', 'summarize', 'summary', 'file-info'],
  description:
    'Generate a brief summary of a file or directory. Shows imports, exports, and key information.',
  inputSchema,
  maxResultSizeChars: 20_000,

  async call(input: Input): Promise<ToolResult> {
    const { path: targetPath, maxLines, includeImports, includeExports } = input

    const filePath = path.isAbsolute(targetPath) ? targetPath : path.join(getCwd(), targetPath)

    if (!existsSync(filePath)) {
      return {
        data: { path: targetPath, error: 'Path does not exist' },
        content: `Error: Path does not exist: ${targetPath}`,
      }
    }

    const stats = await stat(filePath)
    const effectiveMaxLines = maxLines ?? 500

    if (stats.isFile()) {
      const summary = await summarizeFile(filePath, effectiveMaxLines)

      let content = `📄 **${summary.name}**\n`
      content += `> ${summary.language} | ${summary.lines} lines | ${(summary.size / 1024).toFixed(1)} KB\n\n`

      if (summary.summary) {
        content += `**Summary:** ${summary.summary}\n\n`
      }

      if (includeImports !== false && summary.imports && summary.imports.length > 0) {
        content += `**Imports** (${summary.imports.length}):\n${summary.imports.map((i) => `  - ${i}`).join('\n')}\n\n`
      }

      if (includeExports !== false && summary.exports && summary.exports.length > 0) {
        content += `**Exports** (${summary.exports.length}):\n${summary.exports.map((e) => `  - ${e}`).join('\n')}\n\n`
      }

      return { data: summary, content }
    } else {
      const summaries = await summarizeDirectory(filePath, effectiveMaxLines)

      let content = `📁 **${path.basename(filePath)}**\n`
      content += `> ${summaries.length} items\n\n`

      content += summaries
        .slice(0, 10)
        .map((s) => {
          const icon = s.type === 'directory' ? '📁' : '📄'
          const info = s.type === 'file' ? `${s.language || ''} ${s.lines}L` : ''
          return `${icon} **${s.name}** ${info}\n   ${s.summary || ''}`
        })
        .join('\n\n')

      return {
        data: { path: filePath, items: summaries.length, summaries },
        content,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `Brief(${input?.path ?? ''})`
  },
})
