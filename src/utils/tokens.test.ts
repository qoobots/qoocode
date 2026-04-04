import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateCost, estimateTokens, formatCost, updateSessionCost } from './tokens'

// Mock only the constants to avoid external dependencies
vi.mock('../constants/defaults', () => ({
  getModelCost: vi.fn((model: string) => {
    const costs: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'deepseek-chat': { input: 0.0014, output: 0.0028 },
    }
    return costs[model] || costs['gpt-3.5-turbo']
  }),
}))

describe('estimateTokens', () => {
  it('should estimate tokens based on character count (4 chars per token)', () => {
    expect(estimateTokens('hello')).toBe(2)
    expect(estimateTokens('hello world')).toBe(3)
    expect(estimateTokens('hello world!')).toBe(3)
  })

  it('should return 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('should handle large texts', () => {
    const largeText = 'a'.repeat(4000)
    expect(estimateTokens(largeText)).toBe(1000)
  })

  it('should handle unicode characters', () => {
    const unicodeText = '你好世界'
    // Each CJK character is 3 bytes in UTF-8, but JS string.length counts code units
    // '你好世界'.length = 4, Math.ceil(4/4) = 1
    expect(estimateTokens(unicodeText)).toBe(1)
  })
})

describe('calculateCost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate cost for GPT-4', () => {
    const cost = calculateCost('gpt-4', 1000, 1000)
    expect(cost).toBeCloseTo(0.03 + 0.06, 5)
  })

  it('should calculate cost for GPT-3.5-turbo', () => {
    const cost = calculateCost('gpt-3.5-turbo', 1000, 1000)
    expect(cost).toBeCloseTo(0.0015 + 0.002, 5)
  })

  it('should calculate cost for deepseek-chat', () => {
    const cost = calculateCost('deepseek-chat', 1000, 1000)
    expect(cost).toBeCloseTo(0.0014 + 0.0028, 5)
  })

  it('should handle zero tokens', () => {
    const cost = calculateCost('gpt-4', 0, 0)
    expect(cost).toBe(0)
  })

  it('should scale correctly with different token amounts', () => {
    const cost1 = calculateCost('gpt-4', 500, 500)
    const cost2 = calculateCost('gpt-4', 1000, 1000)
    expect(cost2).toBeCloseTo(cost1 * 2, 5)
  })

  it('should use default model for unknown models', () => {
    const cost = calculateCost('unknown-model', 1000, 1000)
    expect(cost).toBeCloseTo(0.0015 + 0.002, 5)
  })
})

describe('formatCost', () => {
  it('should format small costs with 6 decimal places', () => {
    expect(formatCost(0.000001)).toBe('$0.000001')
    expect(formatCost(0.000123)).toBe('$0.000123')
  })

  it('should format medium costs with 4 decimal places', () => {
    expect(formatCost(0.01)).toBe('$0.0100')
    expect(formatCost(0.1234)).toBe('$0.1234')
  })

  it('should format large costs with 2 decimal places', () => {
    expect(formatCost(1.00)).toBe('$1.00')
    expect(formatCost(12.345)).toBe('$12.35')
  })

  it('should handle zero cost', () => {
    // formatCost(0) matches costUSD < 0.01 branch, returns 6 decimal places
    expect(formatCost(0)).toBe('$0.000000')
  })

  it('should handle very small costs', () => {
    expect(formatCost(0.00000123456)).toBe('$0.000001')
  })
})

describe('updateSessionCost', () => {
  const mockSession = {
    totalCostUSD: 0,
    totalTokens: 0,
    entries: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update session with new usage', () => {
    const updated = updateSessionCost(mockSession, 'gpt-4', 1000, 500)
    expect(updated.totalCostUSD).toBeGreaterThan(0)
    expect(updated.totalTokens).toBe(1500)
    expect(updated.entries.length).toBe(1)
  })

  it('should accumulate costs across multiple calls', () => {
    let session = mockSession
    session = updateSessionCost(session, 'gpt-4', 1000, 500)
    session = updateSessionCost(session, 'gpt-4', 500, 250)
    
    expect(session.totalTokens).toBe(2250)
    expect(session.entries.length).toBe(2)
  })

  it('should track timestamps for each entry', () => {
    const before = Date.now()
    const updated = updateSessionCost(mockSession, 'gpt-4', 1000, 500)
    const after = Date.now()

    expect(updated.entries[0].timestamp).toBeGreaterThanOrEqual(before)
    expect(updated.entries[0].timestamp).toBeLessThanOrEqual(after)
  })

  it('should store complete entry information', () => {
    const updated = updateSessionCost(mockSession, 'gpt-4', 1000, 500)
    const entry = updated.entries[0]

    expect(entry.model).toBe('gpt-4')
    expect(entry.promptTokens).toBe(1000)
    expect(entry.completionTokens).toBe(500)
    expect(entry.totalTokens).toBe(1500)
    expect(entry.costUSD).toBeGreaterThan(0)
  })

  it('should handle empty session', () => {
    const emptySession = {
      totalCostUSD: 0,
      totalTokens: 0,
      entries: [],
    }

    const updated = updateSessionCost(emptySession, 'gpt-3.5-turbo', 100, 50)
    expect(updated.totalTokens).toBe(150)
    expect(updated.entries.length).toBe(1)
  })
})
