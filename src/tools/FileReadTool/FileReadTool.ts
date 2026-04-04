import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to read'),
  offset: z
    .number()
    .optional()
    .describe('Line number to start reading from (1-based)'),
  limit: z
    .number()
    .optional()
    .describe('Maximum number of lines to read'),
})

type Input = z.infer<typeof inputSchema>

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export const FileReadTool = buildTool({
  name: 'FileRead',
  aliases: ['read', 'cat'],
  description:
    'Read a file from the local filesystem. Returns the file content with line numbers.',
  inputSchema,
  maxResultSizeChars: 200_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      const raw = await readFile(input.file_path, 'utf-8')

      if (Buffer.byteLength(raw, 'utf-8') > MAX_FILE_SIZE) {
        return {
          data: { content: raw.slice(0, MAX_FILE_SIZE), truncated: true },
          content: `File too large (${(Buffer.byteLength(raw, 'utf-8') / 1024 / 1024).toFixed(1)}MB). Showing first ${MAX_FILE_SIZE / 1024}KB:\n${raw.slice(0, MAX_FILE_SIZE)}`,
        }
      }

      const lines = raw.split('\n')
      const startLine = input.offset ?? 1
      const startIdx = Math.max(0, startLine - 1)
      const endIdx = input.limit ? startIdx + input.limit : lines.length
      const selectedLines = lines.slice(startIdx, endIdx)

      // Add line numbers (right-aligned, 6 chars wide)
      const numbered = selectedLines
        .map((line, i) => {
          const lineNum = String(startLine + i).padStart(6)
          return `${lineNum}:${line}`
        })
        .join('\n')

      return {
        data: { content: numbered, totalLines: lines.length },
        content: numbered,
      }
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'ENOENT') {
        return {
          data: { error: 'File not found' },
          content: `Error: File not found: ${input.file_path}`,
        }
      }
      if (error.code === 'EISDIR') {
        return {
          data: { error: 'Path is a directory' },
          content: `Error: ${input.file_path} is a directory, not a file`,
        }
      }
      return {
        data: { error: error.message },
        content: `Error reading file: ${error.message}`,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `Read(${path.basename(input?.file_path ?? 'unknown')})`
  },
})

