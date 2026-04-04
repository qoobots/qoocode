import { z } from 'zod'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  path: z.string().describe('Directory path to create'),
  recursive: z.boolean().optional().describe('Create parent directories if they do not exist (default: true)'),
})

type Input = z.infer<typeof inputSchema>

export const DirectoryWriteTool = buildTool({
  name: 'DirectoryWrite',
  aliases: ['mkdir', 'create-dir', 'create-directory'],
  description:
    'Create a new directory. Useful for organizing project structure or creating folders for new features.',
  inputSchema,

  async call(input: Input): Promise<ToolResult> {
    const dirPath = path.resolve(getCwd(), input.path)
    const recursive = input.recursive ?? true

    try {
      await mkdir(dirPath, { recursive })

      return {
        data: {
          path: dirPath,
          created: true,
        },
        content: `✓ Created directory: ${dirPath}`,
      }
    } catch (error) {
      if (error instanceof Error) {
        // Check if directory already exists
        if (error.message.includes('already exists')) {
          return {
            data: {
              path: dirPath,
              created: false,
              reason: 'already exists',
            },
            content: `ℹ Directory already exists: ${dirPath}`,
          }
        }
      }

      return {
        data: {
          path: dirPath,
          created: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        content: `✗ Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `DirectoryWrite(${input?.path ?? 'new'})`
  },

  requiresApproval() {
    return true
  },
})

