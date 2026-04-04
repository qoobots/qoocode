import { z } from 'zod'
import { rename, stat } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  source: z.string().describe('Source directory path'),
  destination: z.string().describe('Destination directory path (new name or new location)'),
})

type Input = z.infer<typeof inputSchema>

export const DirectoryEditTool = buildTool({
  name: 'DirectoryEdit',
  aliases: ['mvdir', 'rename-dir', 'move-dir'],
  description:
    'Rename or move a directory. Useful for reorganizing project structure or fixing naming conventions.',
  inputSchema,

  async call(input: Input): Promise<ToolResult> {
    const sourcePath = path.resolve(getCwd(), input.source)
    const destPath = path.resolve(getCwd(), input.destination)

    try {
      // Check if source exists
      const sourceStats = await stat(sourcePath)
      if (!sourceStats.isDirectory()) {
        return {
          data: {
            source: sourcePath,
            destination: destPath,
            moved: false,
            error: 'Source is not a directory',
          },
          content: `✗ Error: Source path is not a directory: ${sourcePath}`,
        }
      }

      // Check if destination already exists
      try {
        const destStats = await stat(destPath)
        if (destStats) {
          return {
            data: {
              source: sourcePath,
              destination: destPath,
              moved: false,
              error: 'Destination already exists',
            },
            content: `✗ Error: Destination already exists: ${destPath}`,
          }
        }
      } catch {
        // Destination doesn't exist, which is what we want
      }

      // Perform the rename/move
      await rename(sourcePath, destPath)

      // Determine if it was a rename or move
      const isRename = path.dirname(sourcePath) === path.dirname(destPath)
      const action = isRename ? 'renamed' : 'moved'

      return {
        data: {
          source: sourcePath,
          destination: destPath,
          moved: true,
          action,
        },
        content: `✓ Directory ${action}: ${sourcePath} → ${destPath}`,
      }
    } catch (error) {
      return {
        data: {
          source: sourcePath,
          destination: destPath,
          moved: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        content: `✗ Failed to move directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `DirectoryEdit(${input?.source ?? 'source'} → ${input?.destination ?? 'destination'})`
  },

  requiresApproval() {
    return true
  },
})

