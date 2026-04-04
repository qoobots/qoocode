import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { query, querySimple, type QueryOptions, type QueryResult } from './query.js'
import type { QoocodeConfig } from './utils/config.js'
import type { Message, SessionCost } from './types/message.js'

// Mock dependencies
vi.mock('./utils/messages.js', () => ({
  createUserMessage: vi.fn((content: string) => ({
    role: 'user',
    content,
  })),
  messagesToOpenAIFormat: vi.fn((messages) => messages),
}))

vi.mock('./utils/systemPrompt.js', () => ({
  buildSystemPrompt: vi.fn(() => 'Test system prompt'),
}))

// Note: We intentionally do NOT mock ./utils/tokens.js here
// because it would interfere with tokens.test.ts
// Instead, query tests will use the real updateSessionCost

vi.mock('./tools.js', () => ({
  getTools: vi.fn(() => []),
}))

vi.mock('./services/api/messageAdapter.js', () => ({
  toolsToOpenAITools: vi.fn(() => []),
}))

vi.mock('./services/api/streamHandler.js', () => {
  return {
    streamToEvents: vi.fn().mockImplementation((stream) => {
      async function* generator() {
        for await (const event of stream) {
          yield event
        }
      }
      return generator()
    }),
  }
})

vi.mock('./services/api/openai-client.js', () => {
  // Use a factory function to create new mock objects each time
  const createMockClient = () => ({
    chat: {
      completions: {
        create: vi.fn(),
      }
    }
  })
  
  return {
    getOpenAIClient: vi.fn(() => createMockClient()),
    resetClient: vi.fn(),
    createStreamChatCompletion: vi.fn(),
    createChatCompletion: vi.fn(),
  }
})

describe('Query Module', () => {
  const mockConfig: QoocodeConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.test.com',
    model: 'test-model',
    maxTokens: 4096,
    temperature: 0.7,
    timeoutMs: 30000,
    debug: false,
    verbose: false,
  }

  const mockMessages: Message[] = [
    { role: 'user', content: 'Hello, world!' },
  ]

  const mockCost: SessionCost = {
    totalCostUSD: 0,
    totalTokens: 0,
    entries: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('query function', () => {
    it('should return QueryResult with messages, cost, and abortController', async () => {
      // Mock stream to return a simple text response
      const mockStream = (async function* () {
        yield { type: 'text_delta', text: 'Hello from AI!' }
        yield { type: 'message_end', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } }
      })()

      // Get the mocked functions
      const { createStreamChatCompletion } = await import('./services/api/openai-client.js')
      const { streamToEvents } = await import('./services/api/streamHandler.js')

      // Set up mocks
      createStreamChatCompletion.mockResolvedValue(mockStream)
      streamToEvents.mockImplementation(async function* (stream, model, signal) {
        for await (const event of stream) {
          yield event
        }
      })

      const options: QueryOptions = {
        config: mockConfig,
        messages: mockMessages,
        cost: mockCost,
      }

      const result = await query(options)

      expect(result).toHaveProperty('messages')
      expect(result).toHaveProperty('cost')
      expect(result).toHaveProperty('abortController')
      expect(result.messages.length).toBeGreaterThan(0)
      expect(result.abortController).toBeInstanceOf(AbortController)
    })

    it('should handle streaming text responses', async () => {
      // Create mock stream
      const mockStream = (async function* () {
        yield { type: 'text_delta', text: 'Hello' }
        yield { type: 'text_delta', text: ' from' }
        yield { type: 'text_delta', text: ' AI!' }
        yield { type: 'message_end', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 } }
      })()

      const { createStreamChatCompletion } = await import('./services/api/openai-client.js')
      const { streamToEvents } = await import('./services/api/streamHandler.js')

      createStreamChatCompletion.mockResolvedValue(mockStream)
      
      // Override the default mock implementation with one that properly yields events
      const events = [
        { type: 'text_delta', text: 'Hello' },
        { type: 'text_delta', text: ' from' },
        { type: 'text_delta', text: ' AI!' },
        { type: 'message_end', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 } }
      ]
      let eventIndex = 0
      streamToEvents.mockReturnValue((async function* () {
        while (eventIndex < events.length) {
          yield events[eventIndex++]
        }
      })())

      const options: QueryOptions = {
        config: mockConfig,
        messages: mockMessages,
        cost: mockCost,
      }

      const result = await query(options)

      // Should have original message + assistant response
      expect(result.messages.length).toBe(2)
      expect(result.messages[1].role).toBe('assistant')
      expect(result.messages[1].content).toBe('Hello from AI!')
    })

    it('should handle stream errors', async () => {
      const { createStreamChatCompletion } = await import('./services/api/openai-client.js')
      
      createStreamChatCompletion.mockRejectedValue(new Error('Stream creation failed'))

      const onStreamEvent = vi.fn()
      const options: QueryOptions = {
        config: mockConfig,
        messages: mockMessages,
        cost: mockCost,
        onStreamEvent,
      }

      const result = await query(options)

      expect(result.messages).toEqual(mockMessages)
      expect(result.cost).toEqual(mockCost)
      expect(onStreamEvent).toHaveBeenCalledWith({
        type: 'error',
        error: expect.any(Error),
      })
    })

    it('should respect external abort signal', async () => {
      const abortController = new AbortController()
      const mockStream = (async function* () {
        yield { type: 'text_delta', text: 'Hello' }
        yield { type: 'message_end', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } }
      })()

      const { createStreamChatCompletion } = await import('./services/api/openai-client.js')
      const { streamToEvents } = await import('./services/api/streamHandler.js')

      createStreamChatCompletion.mockResolvedValue(mockStream)
      streamToEvents.mockImplementation(async function* (stream, model, signal) {
        for await (const event of stream) {
          yield event
        }
      })

      const options: QueryOptions = {
        config: mockConfig,
        messages: mockMessages,
        cost: mockCost,
        signal: abortController.signal,
      }

      const result = await query(options)

      expect(result.abortController.signal.aborted).toBe(false)
    })
  })

  describe('querySimple function', () => {
    it('should return simple response without streaming', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Simple response',
          },
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }

      const { createChatCompletion } = await import('./services/api/openai-client.js')
      createChatCompletion.mockResolvedValue(mockResponse)

      const result = await querySimple(mockConfig, mockMessages)

      expect(result.content).toBe('Simple response')
      // Cost should be calculated (actual value may vary)
      expect(result.cost).toBeDefined()
    })

    it('should handle errors in simple query', async () => {
      const { createChatCompletion } = await import('./services/api/openai-client.js')
      createChatCompletion.mockRejectedValue(new Error('API error'))

      const result = await querySimple(mockConfig, mockMessages)

      expect(result.content).toContain('Error:')
      expect(result.cost.totalTokens).toBe(0)
    })

    it('should handle missing usage data', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Response without usage',
          },
        }],
        usage: undefined,
      }

      const { createChatCompletion } = await import('./services/api/openai-client.js')
      createChatCompletion.mockResolvedValue(mockResponse)

      const result = await querySimple(mockConfig, mockMessages)

      expect(result.content).toBe('Response without usage')
      expect(result.cost.totalTokens).toBe(0)
    })
  })
})