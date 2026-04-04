import type { z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import type OpenAI from 'openai'
import type { Tool } from '../../Tool.js'

/**
 * Check if an object is a Zod schema (has typeName property)
 */
function isZodSchema(obj: unknown): obj is z.ZodType {
  return obj !== null && typeof obj === 'object' && 'typeName' in obj
}

/**
 * Convert a Zod schema to OpenAI function calling parameter format
 */
export function zodSchemaToOpenAIParams(
  inputSchema: z.ZodType | (() => z.ZodType) | Record<string, unknown>,
): Record<string, unknown> {
  // Handle lazy schemas (functions that return schemas)
  let schema = typeof inputSchema === 'function' ? inputSchema() : inputSchema
  
  // If it's already a plain JSON object (not a Zod schema), return it directly
  if (!isZodSchema(schema)) {
    // Ensure the schema has proper structure
    if (!schema || typeof schema !== 'object') {
      schema = { type: 'object', properties: {} }
    }
    const schemaObj = schema as Record<string, unknown>
    if (!schemaObj.type) {
      schemaObj.type = 'object'
    }
    if (!schemaObj.properties) {
      schemaObj.properties = {}
    }
    return schemaObj
  }
  
  const jsonSchema = zodToJsonSchema(schema as z.ZodType, { target: 'openApi3' })
  
  // Ensure the schema has proper type: "object"
  const schemaObj = jsonSchema as Record<string, unknown>
  if (!schemaObj.type || schemaObj.type === 'null') {
    schemaObj.type = 'object'
  }
  
  // Ensure properties exist
  if (!schemaObj.properties) {
    schemaObj.properties = {}
  }
  
  return schemaObj
}

/**
 * Convert qoocode Tool to OpenAI ChatCompletionTool format
 */
export function toolToOpenAITool(tool: Tool): OpenAI.Chat.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodSchemaToOpenAIParams(tool.inputSchema),
    },
  }
}

/**
 * Convert all tools to OpenAI format
 */
export function toolsToOpenAITools(tools: readonly Tool[]): OpenAI.Chat.ChatCompletionTool[] {
  return tools.map(toolToOpenAITool)
}
