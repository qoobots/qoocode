import { z } from 'zod'
import { rename, mkdir } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  source: z.string().describe('Source file path to move'),
  destination: z.string().describe('Destination file or directory path'),
  overwrite: z.boolean().optional().describe('Overwrite if destination exists (default: false)'),
})

type Input = z.infer<typeof inputSchema>

export const MoveFileTool = buildTool({
  name: 'MoveFile',
  aliases: ['mv', 'move', 'rename'],
  description:
    'Move or rename a file from one location to another.',
  inputSchema,
  maxResultSizeChars: 5_000,

  async call(input: Input): Promise<ToolResult> {
    const { source, destination, overwrite } = input

    const sourcePath = path.isAbsolute(source) ? source : path.join(getCwd(), source)
    const destPath = path.isAbsolute(destination) ? destination : path.join(getCwd(), destination)

    // Validate source exists
    if (!existsSync(sourcePath)) {
      return {
        data: { source, error: 'Source file does not exist' },
        content: `Error: Source file does not exist: ${source}`,
      }
    }

    const sourceStat = statSync(sourcePath)
    if (!sourceStat.isFile()) {
      return {
        data: { source, error: 'Source is not a file' },
        content: `Error: Source is not a file: ${source}`,
      }
    }

    // Check if destination exists
    if (existsSync(destPath) && !overwrite) {
      return {
        data: { destination, error: 'Destination already exists' },
        content: `Error: Destination already exists: ${destination}\nUse overwrite: true to overwrite.`,
      }
    }

    // If destination is a directory, use source filename
    let finalDest = destPath
    const destStat = existsSync(destPath) ? statSync(destPath) : null
    if (destStat?.isDirectory()) {
      finalDest = path.join(destPath, path.basename(sourcePath))
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(finalDest)
    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true })
    }

    try {
      await rename(sourcePath, finalDest)

      const newStat = statSync(finalDest)
      const sizeKB = (newStat.size / 1024).toFixed(2)

      return {
        data: {
          source: sourcePath,
          destination: finalDest,
          size: newStat.size,
        },
        content: `✅ Moved successfully!\n\nFrom: ${sourcePath}\nTo: ${finalDest}\nSize: ${sizeKB} KB`,
      }
    } catch (error) {
      // If rename fails (cross-device), try copy + delete
      if (error instanceof Error && error.code === 'EXDEV') {
        try {
          const { copyFile } = await import('node:fs/promises')
          await copyFile(sourcePath, finalDest)
          const { unlink } = await import('node:fs/promises')
          await unlink(sourcePath)

          const newStat = statSync(finalDest)
          const sizeKB = (newStat.size / 1024).toFixed(2)

          return {
            data: {
              source: sourcePath,
              destination: finalDest,
              size: newStat.size,
            },
            content: `✅ Moved successfully!\n\nFrom: ${sourcePath}\nTo: ${finalDest}\nSize: ${sizeKB} KB`,
          }
        } catch (copyError) {
          const message = copyError instanceof Error ? copyError.message : 'Unknown error'
          return {
            data: { error: message },
            content: `Error moving file: ${message}`,
          }
        }
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: { error: message },
        content: `Error moving file: ${message}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `MoveFile(${input?.source ?? ''} → ${input?.destination ?? ''})`
  },
})
