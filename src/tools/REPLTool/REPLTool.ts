// REPLTool - Interactive REPL environment for code execution
import { z } from 'zod'
import { buildTool, type ToolDef } from '../../Tool.js'
import { REPL_TOOL_NAME } from './constants.js'
import { DESCRIPTION, PROMPT } from './prompt.js'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { join, extname } from 'path'
import { writeFileSync, unlinkSync, existsSync } from 'fs'

// Input schema
const inputSchema = z.object({
  code: z.string().describe('The code to execute in the REPL'),
  language: z.enum(['javascript', 'typescript', 'python', 'bash']).optional().default('javascript').describe('The programming language'),
  timeout: z.number().optional().default(10000).describe('Timeout in milliseconds'),
})
type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  output: z.string(),
  exitCode: z.number(),
  error: z.string().optional(),
})
type OutputSchema = z.infer<typeof outputSchema>

export type Output = z.infer<typeof outputSchema>

// Language to file extension mapping
const LANG_EXT: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  bash: 'sh',
}

// Language to interpreter mapping
const LANG_INTERPRETER: Record<string, string> = {
  javascript: 'node',
  typescript: 'npx ts-node',
  python: 'python3',
  bash: 'bash',
}

export const REPLTool = buildTool({
  name: REPL_TOOL_NAME,
  searchHint: 'run code in interactive REPL',
  maxResultSizeChars: 100_000,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema
  },
  get outputSchema(): OutputSchema {
    return outputSchema
  },
  userFacingName() {
    return 'REPL'
  },
  isEnabled() {
    return true
  },
  isReadOnly() {
    return false
  },
  async checkPermissions(input: InputSchema) {
    // Allow read-only operations
    return { behavior: 'allow', updatedInput: input }
  },
  async call({ code, language, timeout }: InputSchema) {
    const ext = LANG_EXT[language] || 'js'
    const interpreter = LANG_INTERPRETER[language] || 'node'
    const tempFile = join(tmpdir(), `repl-${randomUUID()}.${ext}`)
    
    try {
      // Write code to temp file
      writeFileSync(tempFile, code, 'utf-8')
      
      // Execute code
      let output = ''
      let exitCode = 0
      let error: string | undefined
      
      try {
        const result = execSync(interpreter === 'node' ? `node "${tempFile}"` : `${interpreter} "${tempFile}"`, {
          encoding: 'utf-8',
          timeout: timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB max buffer
        })
        output = result
      } catch (err: any) {
        exitCode = err.status || 1
        error = err.message || String(err)
        output = err.stdout || ''
        if (output && error) {
          output = output + '\n' + error
        } else if (!output) {
          output = error
        }
      }
      
      return {
        data: {
          output: output || '(no output)',
          exitCode,
          error,
        },
      }
    } finally {
      // Clean up temp file
      try {
        if (existsSync(tempFile)) {
          unlinkSync(tempFile)
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  },
  mapToolResultToToolResultBlockParam(result: Output, toolUseId: string) {
    const content = result.error
      ? `Exit code: ${result.exitCode}\n${result.output}`
      : result.output
    
    return {
      tool_use_id: toolUseId,
      type: 'tool_result',
      content: content || '(no output)',
    }
  },
} satisfies ToolDef<InputSchema, Output>)
