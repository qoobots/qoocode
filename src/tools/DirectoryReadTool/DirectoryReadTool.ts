import { z } from 'zod'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  path: z.string().optional().describe('Directory path to read (default: workspace root)'),
  maxDepth: z.number().optional().describe('Maximum depth to traverse (default: 3)'),
  includeHidden: z.boolean().optional().describe('Include hidden files starting with . (default: false)'),
  exclude: z.string().optional().describe('Glob pattern to exclude (e.g. "node_modules")'),
})

type Input = z.infer<typeof inputSchema>

interface FileNode {
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
  children?: FileNode[]
}

async function buildFileTree(
  dirPath: string,
  currentDepth: number,
  maxDepth: number,
  includeHidden: boolean,
  excludePattern: RegExp | null,
): Promise<FileNode | null> {
  if (currentDepth > maxDepth) return null

  try {
    const stats = await stat(dirPath)
    const name = path.basename(dirPath)

    if (!includeHidden && name.startsWith('.')) return null
    if (excludePattern && excludePattern.test(name)) return null

    if (stats.isFile()) {
      return {
        name,
        type: 'file',
        path: dirPath.replace(/\\/g, '/'),
        size: stats.size,
      }
    }

    if (stats.isDirectory()) {
      const entries = await readdir(dirPath, { withFileTypes: true })
      const children: FileNode[] = []

      for (const entry of entries) {
        const childPath = path.join(dirPath, entry.name)
        const childNode = await buildFileTree(
          childPath,
          currentDepth + 1,
          maxDepth,
          includeHidden,
          excludePattern,
        )
        if (childNode) {
          children.push(childNode)
        }
      }

      // Sort: directories first, then alphabetically
      children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return {
        name,
        type: 'directory',
        path: dirPath.replace(/\\/g, '/'),
        children,
      }
    }

    return null
  } catch {
    return null
  }
}

function formatTree(node: FileNode, prefix = '', isLast = true, isRoot = true): string {
  const lines: string[] = []

  if (!isRoot) {
    const connector = isLast ? '└── ' : '├── '
    const sizeInfo = node.type === 'file' && node.size !== undefined
      ? ` (${formatSize(node.size)})`
      : ''
    lines.push(`${prefix}${connector}${node.name}${sizeInfo}`)
    prefix += isLast ? '    ' : '│   '
  }

  if (node.children) {
    const childCount = node.children.length
    node.children.forEach((child, index) => {
      const isLastChild = index === childCount - 1
      lines.push(...formatTree(child, prefix, isLastChild, false))
    })
  }

  return lines
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function countItems(node: FileNode): { files: number; dirs: number } {
  let files = 0
  let dirs = 0

  if (node.type === 'directory') {
    dirs++
    if (node.children) {
      for (const child of node.children) {
        const counts = countItems(child)
        files += counts.files
        dirs += counts.dirs
      }
    }
  } else {
    files++
  }

  return { files, dirs }
}

export const DirectoryReadTool = buildTool({
  name: 'DirectoryRead',
  aliases: ['dir', 'ls', 'directory-tree', 'tree'],
  description:
    'Read a directory and display its contents as a tree. Useful for understanding project structure.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    const dirPath = input.path ?? getCwd()
    const maxDepth = input.maxDepth ?? 3
    const includeHidden = input.includeHidden ?? false

    const excludePattern = input.exclude
      ? new RegExp(input.exclude.replace(/\*/g, '.*'), 'i')
      : null

    const tree = await buildFileTree(dirPath, 0, maxDepth, includeHidden, excludePattern)

    if (!tree) {
      return {
        data: { error: 'Directory not found or not accessible' },
        content: `Error: Cannot read directory "${dirPath}"`,
      }
    }

    const treeLines = formatTree(tree)
    const { files, dirs } = countItems(tree)

    const summary = `\n📁 ${tree.name}\n${'─'.repeat(40)}\n${treeLines.join('\n')}\n\n${'─'.repeat(40)}\n${dirs} directories, ${files} files`

    return {
      data: {
        path: dirPath,
        directories: dirs,
        files,
        tree,
      },
      content: summary,
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `DirectoryRead(${input?.path ?? 'current'})`
  },
})
