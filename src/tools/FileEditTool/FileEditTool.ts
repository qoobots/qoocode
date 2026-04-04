import { z } from 'zod'
import { readFile, writeFile } from 'node:fs/promises'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  file_path: z.string().describe('Absolute path to the file to modify'),
  old_string: z.string().describe('The exact string to find and replace'),
  new_string: z.string().describe('The string to replace old_string with'),
})

type Input = z.infer<typeof inputSchema>

export const FileEditTool = buildTool({
  name: 'FileEdit',
  aliases: ['edit', 'replace'],
  description:
    'Perform exact string replacement in an existing file. The old_string must match exactly (including whitespace and indentation).',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      const raw = await readFile(input.file_path, 'utf-8')

      if (!raw.includes(input.old_string)) {
        // Try to find similar strings for helpful error
        const lines = raw.split('\n')
        const oldLines = input.old_string.split('\n')
        const firstLine = oldLines[0]?.trim()
        const similarLines = lines
          .map((l, i) => ({ line: l.trim(), num: i + 1 }))
          .filter((l) => l.line.length > 3 && firstLine && l.line.includes(firstLine.slice(0, Math.min(firstLine.length, 30))))

        let hint = ''
        if (similarLines.length > 0) {
          hint = `\n\nDid you mean one of these locations?\n${similarLines.slice(0, 3).map((s) => `  Line ${s.num}: ${s.line.slice(0, 80)}`).join('\n')}`
        }

        return {
          data: { error: 'old_string not found' },
          content: `Error: old_string not found in ${input.file_path}. Make sure the exact string (including whitespace/indentation) matches.${hint}`,
        }
      }

      // Only replace the first occurrence
      const newIndex = raw.indexOf(input.old_string)
      const newRaw = raw.slice(0, newIndex) + input.new_string + raw.slice(newIndex + input.old_string.length)

      await writeFile(input.file_path, newRaw, 'utf-8')

      const changedLines = Math.abs(input.old_string.split('\n').length - input.new_string.split('\n').length)

      return {
        data: { filePath: input.file_path, linesChanged: changedLines },
        content: `Successfully edited ${input.file_path} (${changedLines > 0 ? `${changedLines} lines changed` : 'replacement made'})`,
      }
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException
      if (error.code === 'ENOENT') {
        return {
          data: { error: 'File not found' },
          content: `Error: File not found: ${input.file_path}`,
        }
      }
      return {
        data: { error: error.message },
        content: `Error editing file: ${error.message}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    const name = input?.file_path?.split(/[/\\]/).pop() ?? 'unknown'
    return `Edit(${name})`
  },
})
