import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  url: z.string().describe('The API endpoint URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('GET').describe('HTTP method (default: GET)'),
  headers: z.record(z.string()).optional().describe('HTTP headers as key-value pairs'),
  body: z.any().optional().describe('Request body (for POST/PUT/PATCH)'),
  timeout: z.number().optional().describe('Request timeout in milliseconds (default: 30000)'),
})

type Input = z.infer<typeof inputSchema>

interface APIResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: unknown
}

async function makeAPIRequest(
  url: string,
  method: string,
  headers: Record<string, string> | undefined,
  body: unknown,
  timeout: number,
): Promise<APIResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers || {}),
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })

    let data: unknown
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export const APICallTool = buildTool({
  name: 'APICall',
  aliases: ['api', 'http', 'request'],
  description:
    'Make HTTP API calls to REST endpoints. Supports GET, POST, PUT, DELETE, PATCH methods with custom headers and body.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    const timeout = input.timeout ?? 30000

    try {
      const result = await makeAPIRequest(
        input.url,
        input.method,
        input.headers,
        input.body,
        timeout,
      )

      const success = result.status >= 200 && result.status < 300

      // Format the response
      let responseText = ''
      responseText += `Status: ${result.status} ${result.statusText}\n`

      if (Object.keys(result.headers).length > 0) {
        responseText += '\nHeaders:\n'
        for (const [key, value] of Object.entries(result.headers)) {
          responseText += `  ${key}: ${value}\n`
        }
      }

      responseText += '\nResponse:\n'
      responseText += typeof result.data === 'string'
        ? result.data
        : JSON.stringify(result.data, null, 2)

      const icon = success ? '✓' : '✗'
      const prefix = success ? 'Success' : 'Failed'

      return {
        data: {
          success,
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
          body: result.data,
        },
        content: `${icon} ${prefix}:\n\n${responseText}`,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        data: {
          success: false,
          error: errorMessage,
        },
        content: `✗ API call failed: ${errorMessage}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    const method = input?.method ?? 'GET'
    return `APICall(${method} ${input?.url ?? 'url'})`
  },

  requiresApproval(input?: Input) {
    // Require approval for write operations (POST, PUT, DELETE, PATCH)
    if (input?.method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(input.method)) {
      return true
    }
    return false
  },
})

