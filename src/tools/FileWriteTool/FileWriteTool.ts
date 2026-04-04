import { z } from 'zod'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  file_path: z
    .string()
    .describe('Absolute path to the file to write'),
  content: z.string().describe('The content to write to the file'),
})

type Input = z.infer<typeof inputSchema>

export const FileWriteTool = buildTool({
  name: 'FileWrite',
  aliases: ['write'],
  description:
    'Write content to a file. Creates the file (and parent directories) if they don\'t exist. Overwrites existing files.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      // Ensure parent directory exists
      const dir = path.dirname(input.file_path)
      await mkdir(dir, { recursive: true })

      await writeFile(input.file_path, input.content, 'utf-8')

      return {
        data: { filePath: input.file_path, bytesWritten: Buffer.byteLength(input.content, 'utf-8') },
        content: `Successfully wrote to ${input.file_path} (${Buffer.byteLength(input.content, 'utf-8')} bytes)`,
      }
    } catch (err: unknown) {
      const error = err as Error
      return {
        data: { error: error.message },
        content: `Error writing file: ${error.message}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `Write(${path.basename(input?.file_path ?? 'unknown')})`
  },
})
