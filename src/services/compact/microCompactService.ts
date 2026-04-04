/**
 * Micro-Compact Service
 * 
 * Lightweight context compression for frequent, smaller reductions.
 * Targets tool results and intermediate messages without full summarization.
 */

// Tools that can be micro-compacted (cleared or summarized)
const COMPACTABLE_TOOLS = new Set([
  'Bash',
  'PowerShell', 
  'Grep',
  'Glob',
  'WebSearch',
  'WebFetch',
  'FileEdit',
  'FileWrite',
  'FileRead',
])

// Maximum tokens before triggering micro-compact
const MICRO_COMPACT_THRESHOLD = 2000

// Token size for images (not included in micro-compact)
const IMAGE_MAX_TOKEN_SIZE = 2000

// Message indicating cleared tool result
export const TIME_BASED_MC_CLEARED_MESSAGE = '[Old tool result content cleared]'

export interface MicroCompactCandidate {
  index: number
  role: string
  content: string
  toolName?: string
  tokenCount: number
  age: number // messages since this one
}

export interface MicroCompactResult {
  cleared: number
  summarized: number
  tokensFreed: number
  messagesRemoved: number
}

/**
 * Find messages eligible for micro-compaction
 */
export function findMicroCompactCandidates(
  messages: Array<{ role: string; content?: string | null; tool?: { name?: string } }>,
  maxCandidates: number = 10
): MicroCompactCandidate[] {
  const candidates: MicroCompactCandidate[] = []
  
  for (let i = 0; i < messages.length - 5; i++) { // Keep last 5 messages
    const msg = messages[i]
    
    // Only compact tool results and assistant messages
    if (msg.role !== 'tool' && msg.role !== 'assistant') {
      continue
    }
    
    const content = String(msg.content || '')
    const toolName = msg.tool?.name
    
    // Skip if it's not a compactable tool
    if (msg.role === 'tool' && toolName && !COMPACTABLE_TOOLS.has(toolName)) {
      continue
    }
    
    // Estimate token count
    const tokenCount = estimateTokens(content)
    
    // Calculate age (messages since this one)
    const age = messages.length - 1 - i
    
    // Only consider older messages
    if (age < 3) {
      continue
    }
    
    // Prioritize by age and token count
    candidates.push({
      index: i,
      role: msg.role,
      content,
      toolName,
      tokenCount,
      age,
    })
  }
  
  // Sort by age (oldest first) then by token count (largest first)
  candidates.sort((a, b) => {
    if (a.age !== b.age) return b.age - a.age
    return b.tokenCount - a.tokenCount
  })
  
  return candidates.slice(0, maxCandidates)
}

/**
 * Estimate token count
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars
  return Math.ceil(chineseChars * 2 + otherChars / 4)
}

/**
 * Generate summary placeholder for tool result
 */
function generateToolResultSummary(content: string, toolName?: string): string {
  const lines = content.split('\n')
  const firstFew = lines.slice(0, 3).join('\n')
  const truncated = firstFew.length > 200 ? firstFew.slice(0, 200) + '...' : firstFew
  
  const toolLabel = toolName ? `[${toolName}]` : '[Tool]'
  return `${toolLabel} result (${estimateTokens(content)} tokens): ${truncated}`
}

/**
 * Apply micro-compaction to messages
 */
export function applyMicroCompact(
  messages: Array<{ role: string; content?: string | null; tool?: { name?: string } }>,
  candidates: MicroCompactCandidate[]
): { compacted: typeof messages; result: MicroCompactResult } {
  const compacted = [...messages]
  const clearedIndices = new Set<number>()
  
  let tokensFreed = 0
  let messagesRemoved = 0
  
  for (const candidate of candidates) {
    if (clearedIndices.has(candidate.index)) continue
    
    if (candidate.role === 'tool') {
      // Replace tool result with placeholder
      compacted[candidate.index] = {
        ...compacted[candidate.index],
        content: TIME_BASED_MC_CLEARED_MESSAGE,
      }
      clearedIndices.add(candidate.index)
      tokensFreed += candidate.tokenCount
    } else if (candidate.role === 'assistant') {
      // Summarize assistant messages
      compacted[candidate.index] = {
        ...compacted[candidate.index],
        content: `[Earlier: ${candidate.content.slice(0, 100)}...]`,
      }
      clearedIndices.add(candidate.index)
      tokensFreed += Math.floor(candidate.tokenCount * 0.7)
    }
  }
  
  return {
    compacted,
    result: {
      cleared: clearedIndices.size,
      summarized: 0,
      tokensFreed,
      messagesRemoved,
    },
  }
}

/**
 * Check if micro-compact should trigger
 */
export function shouldMicroCompact(
  messages: Array<{ role: string; content?: string | null }>,
  threshold: number = MICRO_COMPACT_THRESHOLD
): boolean {
  // Count compactable tool results in the middle of the conversation
  let compactableTokens = 0
  const keepLast = 5
  
  for (let i = 0; i < messages.length - keepLast; i++) {
    const msg = messages[i]
    if (msg.role === 'tool') {
      compactableTokens += estimateTokens(String(msg.content || ''))
    }
  }
  
  return compactableTokens >= threshold
}

/**
 * Run micro-compact on messages
 */
export function microCompact(
  messages: Array<{ role: string; content?: string | null; tool?: { name?: string } }>
): { compacted: typeof messages; result: MicroCompactResult } {
  if (!shouldMicroCompact(messages)) {
    return {
      compacted: messages,
      result: { cleared: 0, summarized: 0, tokensFreed: 0, messagesRemoved: 0 },
    }
  }
  
  const candidates = findMicroCompactCandidates(messages)
  return applyMicroCompact(messages, candidates)
}

/**
 * Estimate rough token count
 */
export function roughTokenCountEstimation(text: string): number {
  return estimateTokens(text)
}

/**
 * Format micro-compact result for display
 */
export function formatMicroCompactResult(result: MicroCompactResult): string {
  if (result.cleared === 0 && result.summarized === 0) {
    return 'No messages micro-compacted'
  }
  
  const parts = []
  if (result.cleared > 0) {
    parts.push(`${result.cleared} messages cleared`)
  }
  if (result.summarized > 0) {
    parts.push(`${result.summarized} messages summarized`)
  }
  parts.push(`~${result.tokensFreed} tokens freed`)
  
  return parts.join(', ')
}
