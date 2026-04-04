// SyntheticOutputTool - Structured output generation tool
// Generates structured data based on input schemas
import { buildTool } from '../../Tool.js'
import type { ToolDef, ToolUseContext } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod'

const inputSchema = lazySchema(() =>
  z.strictObject({
    schema: z.record(z.string(), z.unknown()).describe('JSON Schema for the output structure'),
    template: z.string().optional().describe('Template string with placeholders'),
    data: z.record(z.string(), z.unknown()).optional().describe('Data to populate the template'),
    format: z.enum(['json', 'markdown', 'text', 'csv']).optional().default('json').describe('Output format'),
  })
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    output: z.string(),
    format: z.string(),
    validated: z.boolean().optional(),
    error: z.string().optional(),
  })
)
type OutputSchema = ReturnType<typeof outputSchema>

/**
 * Validate data against a simple schema
 */
function validateAgainstSchema(data: Record<string, unknown>, schema: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!schema || typeof schema !== 'object') {
    return { valid: true, errors: [] }
  }
  
  const properties = (schema as { properties?: Record<string, unknown> }).properties || {}
  
  for (const [key, propSchema] of Object.entries(properties)) {
    if (!propSchema || typeof propSchema !== 'object') continue
    
    const prop = propSchema as { type?: string; required?: boolean }
    const value = data[key]
    
    // Check required fields
    if (prop.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${key}`)
      continue
    }
    
    if (value === undefined || value === null) continue
    
    // Type validation
    if (prop.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (prop.type === 'integer' || prop.type === 'number') {
        if (typeof value !== 'number') {
          errors.push(`Field ${key} should be a number, got ${actualType}`)
        }
      } else if (prop.type === 'string') {
        if (typeof value !== 'string') {
          errors.push(`Field ${key} should be a string, got ${actualType}`)
        }
      } else if (prop.type === 'boolean') {
        if (typeof value !== 'boolean') {
          errors.push(`Field ${key} should be a boolean, got ${actualType}`)
        }
      } else if (prop.type === 'object') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Field ${key} should be an object, got ${actualType}`)
        }
      } else if (prop.type === 'array') {
        if (!Array.isArray(value)) {
          errors.push(`Field ${key} should be an array, got ${actualType}`)
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Render template with data
 */
function renderTemplate(template: string, data: Record<string, unknown>): string {
  let result = template
  
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
    result = result.replace(placeholder, String(value))
  }
  
  // Handle nested data with dot notation
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        const placeholder = new RegExp(`\\{\\{\\s*${key}\\.${nestedKey}\\s*\\}\\}`, 'g')
        result = result.replace(placeholder, String(nestedValue))
      }
    }
  }
  
  return result
}

/**
 * Convert data to CSV format
 */
function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = data.map(row => 
    headers.map(h => {
      const val = row[h]
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return String(val ?? '')
    }).join(',')
  )
  
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Convert data to markdown table
 */
function toMarkdownTable(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const separator = headers.map(() => '---')
  
  const rows = data.map(row =>
    headers.map(h => String(row[h] ?? '')).join(' | ')
  )
  
  return [headers.join(' | '), separator.join(' | '), ...rows].join('\n')
}

export const SyntheticOutputTool = buildTool({
  name: 'SyntheticOutput',
  searchHint: 'generate structured output from templates and schemas',
  maxResultSizeChars: 100_000,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isEnabled() {
    return true
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true // Doesn't modify files
  },
  toAutoClassifierInput(input: z.infer<InputSchema>) {
    return `SyntheticOutput ${input.format || 'json'}`
  },
  async description() {
    return 'Generate structured output from templates and schemas. ' +
      'Supports JSON, Markdown, plain text, and CSV formats. ' +
      'Validates output against provided JSON Schema.'
  },
  async prompt() {
    return 'Use SyntheticOutput to:\n' +
      '- Generate JSON output with validation\n' +
      '- Create formatted reports from templates\n' +
      '- Convert data between formats (JSON, Markdown, CSV)\n\n' +
      'Provide a schema for validation, a template for formatting, or data for conversion.'
  },
  async checkPermissions(input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },
  async call(input: z.infer<InputSchema>, _context: ToolUseContext) {
    const { schema, template, data = {}, format = 'json' } = input

    let output: string
    let validated = false
    let error: string | undefined

    // If we have data, format it
    if (data && Object.keys(data).length > 0) {
      // Validate if schema provided
      if (schema && Object.keys(schema).length > 0) {
        const validation = validateAgainstSchema(data, schema)
        if (!validation.valid) {
          error = validation.errors.join('; ')
        }
        validated = validation.valid
      }

      // Format based on type
      if (format === 'csv') {
        if (Array.isArray(data)) {
          output = toCSV(data as Record<string, unknown>[])
        } else {
          output = toCSV([data])
        }
      } else if (format === 'markdown') {
        if (Array.isArray(data)) {
          output = toMarkdownTable(data as Record<string, unknown>[])
        } else {
          // Single object - render as key-value pairs
          output = Object.entries(data)
            .map(([k, v]) => `- **${k}**: ${v}`)
            .join('\n')
        }
      } else if (format === 'text') {
        output = Object.entries(data)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
      } else {
        output = JSON.stringify(data, null, 2)
      }
    } else if (template) {
      // Just render template
      output = renderTemplate(template, {})
    } else {
      throw new Error('Must provide either data or template')
    }

    return {
      data: {
        output,
        format,
        validated,
        ...(error && { error }),
      },
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    let content = `Format: ${output.format}\n`
    if (output.validated) {
      content += 'Status: Validated against schema\n'
    }
    if (output.error) {
      content += `Warning: ${output.error}\n`
    }
    content += `\n${output.output}`
    
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content,
    }
  },
} satisfies ToolDef<InputSchema, z.infer<OutputSchema>>)
