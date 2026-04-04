import type { SessionCost } from '../types/message.js'
import { getModelCost } from '../constants/defaults.js'

/**
 * Estimate tokens from text (rough approximation: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Calculate cost for a model usage
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const costs = getModelCost(model)
  return (promptTokens / 1000) * costs.input + (completionTokens / 1000) * costs.output
}

/**
 * Format cost as USD string
 */
export function formatCost(costUSD: number): string {
  if (costUSD < 0.01) return `$${costUSD.toFixed(6)}`
  if (costUSD < 1) return `$${costUSD.toFixed(4)}`
  return `$${costUSD.toFixed(2)}`
}

/**
 * Update session cost with new usage data
 */
export function updateSessionCost(
  session: SessionCost,
  model: string,
  promptTokens: number,
  completionTokens: number,
): SessionCost {
  const costUSD = calculateCost(model, promptTokens, completionTokens)
  const entry = {
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUSD,
    timestamp: Date.now(),
  }

  return {
    totalCostUSD: session.totalCostUSD + costUSD,
    totalTokens: session.totalTokens + promptTokens + completionTokens,
    entries: [...session.entries, entry],
  }
}
