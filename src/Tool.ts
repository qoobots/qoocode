import type { z } from 'zod'
import type { PermissionResult } from './types/permissions.js'

// ============================================================
// Tool Type Definition
// ============================================================

export type AnyObject = z.ZodType<{ [key: string]: unknown }>

export type ToolResult<T = unknown> = {
  data: T
  content: string // Text content to send back to LLM
}

export type ToolDef<
  Input extends AnyObject = AnyObject,
  Output = unknown,
> = {
  name: string
  aliases?: string[]
  description: string
  inputSchema: Input
  outputSchema?: z.ZodType<unknown>
  maxResultSizeChars?: number

  /** Execute the tool with given input */
  call(input: z.infer<Input>): Promise<ToolResult<Output>>

  /** Whether this tool is currently enabled */
  isEnabled?(): boolean

  /** Whether the tool is read-only (doesn't modify filesystem) */
  isReadOnly?(input: z.infer<Input>): boolean

  /** Check permissions (simplified: always allow by default) */
  checkPermissions?(input: z.infer<Input>): Promise<PermissionResult>

  /** Get a user-facing display name for the tool */
  userFacingName?(input?: Partial<z.infer<Input>>): string
}

export type Tool<Input extends AnyObject = AnyObject, Output = unknown> = {
  name: string
  aliases?: string[]
  description: string
  inputSchema: Input
  outputSchema?: z.ZodType<unknown>
  maxResultSizeChars: number
  call(input: z.infer<Input>): Promise<ToolResult<Output>>
  isEnabled(): boolean
  isReadOnly(input: z.infer<Input>): boolean
  checkPermissions(input: z.infer<Input>): Promise<PermissionResult>
  userFacingName(input?: Partial<z.infer<Input>>): string
}

// ============================================================
// Tool Defaults
// ============================================================

const TOOL_DEFAULTS = {
  maxResultSizeChars: 50_000,
  isEnabled: () => true,
  isReadOnly: (_input?: unknown) => false,
  checkPermissions: (input: { [key: string]: unknown }): Promise<PermissionResult> =>
    Promise.resolve({ behavior: 'allow', updatedInput: input }),
  userFacingName: (name?: string) => name ?? '',
}

// ============================================================
// buildTool factory
// ============================================================

export function buildTool<D extends ToolDef<any, any>>(def: D): Tool<any, any> {
  return {
    ...TOOL_DEFAULTS,
    ...def,
    userFacingName: (input) => def.userFacingName?.(input) ?? def.name,
  } as Tool<any, any>
}

// ============================================================
// Tool lookup utilities
// ============================================================

export type Tools = readonly Tool[]

export function findToolByName(tools: Tools, name: string): Tool | undefined {
  return tools.find(
    (t) => t.name === name || t.aliases?.includes(name),
  )
}
