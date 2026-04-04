/**
 * Auto-Compact Service
 * 
 * Automatic context compression based on token usage thresholds.
 * Implements intelligent compaction triggers with circuit breaker protection.
 */

export interface AutoCompactConfig {
  // Buffer tokens reserved for output during compaction
  maxOutputTokensForSummary: number
  
  // Token buffer before triggering auto-compact
  autoCompactBufferTokens: number
  
  // Warning threshold buffer tokens
  warningThresholdBufferTokens: number
  
  // Error threshold buffer tokens
  errorThresholdBufferTokens: number
  
  // Manual compact buffer tokens
  manualCompactBufferTokens: number
  
  // Maximum consecutive auto-compact failures before circuit breaker
  maxConsecutiveFailures: number
  
  // Environment variable overrides
  autoCompactWindowOverride?: string
  autoCompactPercentOverride?: string
}

export const DEFAULT_AUTO_COMPACT_CONFIG: AutoCompactConfig = {
  maxOutputTokensForSummary: 20_000,
  autoCompactBufferTokens: 13_000,
  warningThresholdBufferTokens: 20_000,
  errorThresholdBufferTokens: 20_000,
  manualCompactBufferTokens: 3_000,
  maxConsecutiveFailures: 3,
}

// Model context window sizes (approximate)
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'claude-sonnet-4': 200_000,
  'claude-sonnet-4-7': 200_000,
  'claude-opus-4': 200_000,
  'claude-opus-4-2': 200_000,
  'claude-3-5-sonnet': 200_000,
  'claude-3-5-sonnet-latest': 200_000,
  'claude-3-5-haiku': 200_000,
  'claude-3-opus': 200_000,
  'claude-3-sonnet': 200_000,
  'claude-3-haiku': 200_000,
  'gpt-4': 128_000,
  'gpt-4-turbo': 128_000,
  'gpt-4o': 128_000,
  'gpt-3.5-turbo': 16_385,
  'deepseek-chat': 64_000,
  'deepseek-coder': 64_000,
  'o1-preview': 128_000,
  'o1-mini': 128_000,
  // Default for unknown models
  'default': 128_000,
}

/**
 * Get context window size for a model
 */
export function getContextWindowForModel(model: string): number {
  // Check for exact match first
  if (MODEL_CONTEXT_WINDOWS[model]) {
    return MODEL_CONTEXT_WINDOWS[model]
  }
  
  // Check for prefix match
  for (const [key, value] of Object.entries(MODEL_CONTEXT_WINDOWS)) {
    if (model.startsWith(key) || key.startsWith(model.split('-')[0])) {
      return value
    }
  }
  
  return MODEL_CONTEXT_WINDOWS['default']
}

/**
 * Get effective context window size (minus reserved output tokens)
 */
export function getEffectiveContextWindowSize(
  model: string,
  config: AutoCompactConfig = DEFAULT_AUTO_COMPACT_CONFIG
): number {
  const reservedTokens = Math.min(
    getContextWindowForModel(model),
    config.maxOutputTokensForSummary
  )
  
  let contextWindow = getContextWindowForModel(model)
  
  // Environment override
  const envWindow = process.env.QOOCODE_AUTO_COMPACT_WINDOW
  if (envWindow) {
    const parsed = parseInt(envWindow, 10)
    if (!isNaN(parsed) && parsed > 0) {
      contextWindow = Math.min(contextWindow, parsed)
    }
  }
  
  return contextWindow - reservedTokens
}

/**
 * Get auto-compact threshold for a model
 */
export function getAutoCompactThreshold(
  model: string,
  config: AutoCompactConfig = DEFAULT_AUTO_COMPACT_CONFIG
): number {
  const effectiveContextWindow = getEffectiveContextWindowSize(model, config)
  
  const threshold = effectiveContextWindow - config.autoCompactBufferTokens
  
  // Environment override for testing
  const envPercent = process.env.QOOCODE_AUTOCOMPACT_PCT_OVERRIDE
  if (envPercent) {
    const parsed = parseFloat(envPercent)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      const percentageThreshold = Math.floor(
        effectiveContextWindow * (parsed / 100)
      )
      return Math.min(percentageThreshold, threshold)
    }
  }
  
  return threshold
}

export interface TokenWarningState {
  percentLeft: number
  isAboveWarningThreshold: boolean
  isAboveErrorThreshold: boolean
  isAboveAutoCompactThreshold: boolean
  isAtBlockingLimit: boolean
}

/**
 * Calculate token warning state for a model
 */
export function calculateTokenWarningState(
  tokenUsage: number,
  model: string,
  config: AutoCompactConfig = DEFAULT_AUTO_COMPACT_CONFIG
): TokenWarningState {
  const threshold = getAutoCompactThreshold(model, config)
  
  const percentLeft = Math.max(
    0,
    Math.round(((threshold - tokenUsage) / threshold) * 100)
  )
  
  const warningThreshold = threshold - config.warningThresholdBufferTokens
  const errorThreshold = threshold - config.errorThresholdBufferTokens
  
  const isAboveWarningThreshold = tokenUsage >= warningThreshold
  const isAboveErrorThreshold = tokenUsage >= errorThreshold
  
  const isAboveAutoCompactThreshold = tokenUsage >= threshold
  
  const actualContextWindow = getEffectiveContextWindowSize(model, config)
  const defaultBlockingLimit = actualContextWindow - config.manualCompactBufferTokens
  
  // Allow override for testing
  const blockingLimitOverride = process.env.QOOCODE_BLOCKING_LIMIT_OVERRIDE
  const parsedOverride = blockingLimitOverride
    ? parseInt(blockingLimitOverride, 10)
    : NaN
  const blockingLimit = !isNaN(parsedOverride) && parsedOverride > 0
    ? parsedOverride
    : defaultBlockingLimit
  
  const isAtBlockingLimit = tokenUsage >= blockingLimit
  
  return {
    percentLeft,
    isAboveWarningThreshold,
    isAboveErrorThreshold,
    isAboveAutoCompactThreshold,
    isAtBlockingLimit,
  }
}

export interface AutoCompactTrackingState {
  compacted: boolean
  turnCounter: number
  turnId: string
  consecutiveFailures: number
}

/**
 * Check if auto-compact is enabled
 */
export function isAutoCompactEnabled(): boolean {
  // Check environment variable
  if (process.env.DISABLE_COMPACT === 'true' || process.env.DISABLE_COMPACT === '1') {
    return false
  }
  
  // Check auto-compact specific disable
  if (process.env.DISABLE_AUTO_COMPACT === 'true' || process.env.DISABLE_AUTO_COMPACT === '1') {
    return false
  }
  
  // In a real implementation, this would check user config
  // For now, auto-compact is enabled by default
  return true
}

/**
 * Estimate token count from text
 */
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars
  
  return Math.ceil(chineseChars * 2 + otherChars / 4)
}

/**
 * Estimate tokens from messages
 */
export function estimateTokensFromMessages(
  messages: Array<{ role: string; content?: string | null }>
): number {
  return messages.reduce((sum, msg) => {
    return sum + estimateTokens(String(msg.content || ''))
  }, 0)
}

/**
 * Check if auto-compact should trigger
 */
export async function shouldAutoCompact(
  messages: Array<{ role: string; content?: string | null }>,
  model: string,
  querySource?: string
): Promise<boolean> {
  // Skip for certain query sources
  if (querySource === 'session_memory' || querySource === 'compact') {
    return false
  }
  
  if (!isAutoCompactEnabled()) {
    return false
  }
  
  const tokenCount = estimateTokensFromMessages(messages)
  const threshold = getAutoCompactThreshold(model)
  const effectiveWindow = getEffectiveContextWindowSize(model)
  
  return tokenCount >= threshold
}

/**
 * Get tracking state for auto-compact
 */
export function createAutoCompactTrackingState(): AutoCompactTrackingState {
  return {
    compacted: false,
    turnCounter: 0,
    turnId: generateTurnId(),
    consecutiveFailures: 0,
  }
}

/**
 * Generate unique turn ID
 */
function generateTurnId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Update tracking state after compaction
 */
export function updateTrackingStateAfterCompaction(
  tracking: AutoCompactTrackingState,
  wasCompacted: boolean,
  consecutiveFailures?: number
): AutoCompactTrackingState {
  return {
    ...tracking,
    compacted: wasCompacted,
    turnCounter: tracking.turnCounter + 1,
    turnId: generateTurnId(),
    consecutiveFailures: consecutiveFailures ?? (wasCompacted ? 0 : tracking.consecutiveFailures + 1),
  }
}

/**
 * Check if circuit breaker should trip
 */
export function shouldCircuitBreakerTrip(
  tracking: AutoCompactTrackingState,
  config: AutoCompactConfig = DEFAULT_AUTO_COMPACT_CONFIG
): boolean {
  return tracking.consecutiveFailures >= config.maxConsecutiveFailures
}

/**
 * Format token warning for display
 */
export function formatTokenWarning(state: TokenWarningState, model: string): string {
  const parts: string[] = []
  
  if (state.isAtBlockingLimit) {
    parts.push('⚠️ CONTEXT LIMIT REACHED - Compaction required!')
  } else if (state.isAboveErrorThreshold) {
    parts.push('🔴 Critical: ' + state.percentLeft + '% context remaining')
  } else if (state.isAboveWarningThreshold) {
    parts.push('🟡 Warning: ' + state.percentLeft + '% context remaining')
  } else if (state.isAboveAutoCompactThreshold) {
    parts.push('🟢 Auto-compact will trigger soon: ' + state.percentLeft + '% remaining')
  } else {
    parts.push('✅ Context healthy: ' + state.percentLeft + '% remaining')
  }
  
  return parts.join('\n')
}
