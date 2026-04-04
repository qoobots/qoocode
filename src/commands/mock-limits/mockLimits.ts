// Mock Limits Command - Simulate rate limits for testing
// Allows testing how the system handles rate limit scenarios
import { z } from 'zod'

// Rate limit configuration
interface RateLimitConfig {
  enabled: boolean
  tokensPerMinute?: number
  requestsPerMinute?: number
  toolCallsPerMinute?: number
  errorsPerHour?: number
  simulatedDelay?: number
}

let currentConfig: RateLimitConfig = {
  enabled: false,
}

// Input schema
export const mockLimitsInputSchema = z.object({
  action: z.enum(['enable', 'disable', 'status', 'set']).optional().default('status').describe('Mock limits action'),
  limitType: z.enum(['tokens', 'requests', 'toolcalls', 'errors', 'delay']).optional().describe('Type of limit'),
  value: z.number().optional().describe('Limit value'),
})
export type MockLimitsInput = z.infer<typeof mockLimitsInputSchema>

// Output interface
export interface MockLimitsOutput {
  success: boolean
  message: string
  config?: RateLimitConfig
}

/**
 * Enable mock rate limits
 */
function enableLimits(config?: Partial<RateLimitConfig>): MockLimitsOutput {
  currentConfig = {
    enabled: true,
    ...config,
  }

  return {
    success: true,
    message: `
Mock Rate Limits Enabled
========================

${formatConfig(currentConfig)}

Use /mock-limits disable to restore normal operation.
`,
    config: currentConfig,
  }
}

/**
 * Disable mock rate limits
 */
function disableLimits(): MockLimitsOutput {
  currentConfig = {
    enabled: false,
  }

  return {
    success: true,
    message: `
Mock Rate Limits Disabled
=========================

Normal rate limiting is now active.

Use /mock-limits status to see current configuration.
`,
    config: currentConfig,
  }
}

/**
 * Get current configuration
 */
function getStatus(): MockLimitsOutput {
  return {
    success: true,
    message: `
Mock Rate Limits Status
=======================

Status: ${currentConfig.enabled ? 'ENABLED' : 'DISABLED'}

${currentConfig.enabled ? formatConfig(currentConfig) : 'No limits configured.'}

Usage:
  /mock-limits enable [type] [value]
  /mock-limits disable
  /mock-limits status
  /mock-limits set <type> <value>

Examples:
  /mock-limits enable tokens 100000
  /mock-limits enable requests 10
  /mock-limits enable delay 500
`,
    config: currentConfig,
  }
}

/**
 * Set a specific limit
 */
function setLimit(type: string, value: number): MockLimitsOutput {
  if (!currentConfig.enabled) {
    return {
      success: false,
      message: 'Mock limits are not enabled. Use /mock-limits enable first.',
    }
  }

  switch (type) {
    case 'tokens':
      currentConfig.tokensPerMinute = value
      break
    case 'requests':
      currentConfig.requestsPerMinute = value
      break
    case 'toolcalls':
      currentConfig.toolCallsPerMinute = value
      break
    case 'errors':
      currentConfig.errorsPerHour = value
      break
    case 'delay':
      currentConfig.simulatedDelay = value
      break
    default:
      return {
        success: false,
        message: `Unknown limit type: ${type}\n\nValid types: tokens, requests, toolcalls, errors, delay`,
      }
  }

  return {
    success: true,
    message: `
Limit Updated
=============

${type}: ${value}

${formatConfig(currentConfig)}
`,
    config: currentConfig,
  }
}

/**
 * Format configuration for display
 */
function formatConfig(config: RateLimitConfig): string {
  const lines: string[] = []

  if (config.tokensPerMinute) {
    lines.push(`  Tokens/min:  ${config.tokensPerMinute}`)
  }
  if (config.requestsPerMinute) {
    lines.push(`  Requests/min: ${config.requestsPerMinute}`)
  }
  if (config.toolCallsPerMinute) {
    lines.push(`  ToolCalls/min: ${config.toolCallsPerMinute}`)
  }
  if (config.errorsPerHour) {
    lines.push(`  Errors/hour:   ${config.errorsPerHour}`)
  }
  if (config.simulatedDelay) {
    lines.push(`  Delay:         ${config.simulatedDelay}ms`)
  }

  return lines.length > 0 ? lines.join('\n') : '  No limits configured.'
}

/**
 * Check if a request would be rate limited
 */
export function checkRateLimit(type: 'tokens' | 'requests' | 'toolcalls' | 'errors'): {
  limited: boolean
  message?: string
} {
  if (!currentConfig.enabled) {
    return { limited: false }
  }

  switch (type) {
    case 'tokens':
      if (currentConfig.tokensPerMinute) {
        return {
          limited: true,
          message: `Rate limit: tokens/min set to ${currentConfig.tokensPerMinute}`,
        }
      }
      break
    case 'requests':
      if (currentConfig.requestsPerMinute) {
        return {
          limited: true,
          message: `Rate limit: requests/min set to ${currentConfig.requestsPerMinute}`,
        }
      }
      break
    case 'toolcalls':
      if (currentConfig.toolCallsPerMinute) {
        return {
          limited: true,
          message: `Rate limit: toolCalls/min set to ${currentConfig.toolCallsPerMinute}`,
        }
      }
      break
    case 'errors':
      if (currentConfig.errorsPerHour) {
        return {
          limited: true,
          message: `Rate limit: errors/hour set to ${currentConfig.errorsPerHour}`,
        }
      }
      break
  }

  return { limited: false }
}

/**
 * Get simulated delay
 */
export function getSimulatedDelay(): number {
  return currentConfig.simulatedDelay || 0
}

/**
 * Execute mock-limits command
 */
export async function executeMockLimitsCommand(input: MockLimitsInput): Promise<MockLimitsOutput> {
  const { action = 'status', limitType, value } = input

  switch (action) {
    case 'enable': {
      const config: Partial<RateLimitConfig> = {}
      
      // Set default test values if type not specified
      if (limitType && value !== undefined) {
        switch (limitType) {
          case 'tokens':
            config.tokensPerMinute = value
            break
          case 'requests':
            config.requestsPerMinute = value
            break
          case 'toolcalls':
            config.toolCallsPerMinute = value
            break
          case 'errors':
            config.errorsPerHour = value
            break
          case 'delay':
            config.simulatedDelay = value
            break
        }
      } else {
        // Set some reasonable test defaults
        config.tokensPerMinute = 100000
        config.requestsPerMinute = 20
        config.toolCallsPerMinute = 100
      }

      return enableLimits(config)
    }

    case 'disable':
      return disableLimits()

    case 'status':
      return getStatus()

    case 'set': {
      if (!limitType || value === undefined) {
        return {
          success: false,
          message: 'Usage: /mock-limits set <type> <value>\n\nTypes: tokens, requests, toolcalls, errors, delay',
        }
      }
      return setLimit(limitType, value)
    }

    default:
      return {
        success: false,
        message: `Unknown action: ${action}\n\nAvailable: enable, disable, status, set`,
      }
  }
}
