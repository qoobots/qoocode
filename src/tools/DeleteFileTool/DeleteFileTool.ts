import { z } from 'zod'
import { unlink, rmdir } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  path: z.string().describe('File or directory path to delete'),
  recursive: z.boolean().optional().describe('Delete directories recursively (default: false)'),
  force: z.boolean().optional().describe('Force delete without confirmation (default: false)'),
})

type Input = z.infer<typeof inputSchema>

export const DeleteFileTool = buildTool({
  name: 'DeleteFile',
  aliases: ['rm', 'del', 'delete', 'remove'],
  description:
    'Delete a file or directory. Supports recursive deletion for directories.',
  inputSchema,
  maxResultSizeChars: 5_000,

  async call(input: Input): Promise<ToolResult> {
    const { path: targetPath, recursive, force } = input

    const filePath = path.isAbsolute(targetPath) ? targetPath : path.join(getCwd(), targetPath)

    // Validate path exists
    if (!existsSync(filePath)) {
      return {
        data: { path: targetPath, error: 'Path does not exist' },
        content: `Error: Path does not exist: ${targetPath}`,
      }
    }

    const stat = statSync(filePath)
    const isDirectory = stat.isDirectory()

    // Warn about dangerous operations
    if (!force) {
      if (isDirectory && recursive) {
        return {
          data: { path: targetPath, warning: 'recursive delete without force' },
          content: `⚠️ Warning: You are about to recursively delete directory:\n\n${filePath}\n\nTo proceed, use force: true`,
        }
      }
    }

    try {
      if (isDirectory) {
        if (recursive) {
          await rmdir(filePath, { recursive: true })
          return {
            data: { path: filePath, type: 'directory', recursive: true },
            content: `✅ Deleted directory successfully!\n\n${filePath}`,
          }
        } else {
          return {
            data: { path: targetPath, error: 'Directory not empty' },
            content: `Error: Directory is not empty. Use recursive: true to delete.`,
          }
        }
      } else {
        await unlink(filePath)
        const sizeKB = (stat.size / 1024).toFixed(2)
        return {
          data: { path: filePath, type: 'file', size: stat.size },
          content: `✅ Deleted file successfully!\n\n${filePath}\nSize: ${sizeKB} KB`,
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: { error: message },
        content: `Error deleting: ${message}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `DeleteFile(${input?.path ?? ''})`
  },
})
