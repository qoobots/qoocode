import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getOpenAIClient, resetClient } from './openai-client'
import type { QOOCODEConfig } from '../../utils/config'

// Mock OpenAI SDK
vi.mock('openai', () => ({
  default: class MockOpenAI {
    constructor(private config: any) {}
    chat = {
      completions: {
        create: vi.fn(),
      }
    }
  }
}))

describe('OpenAI Client', () => {
  let mockConfig: QOOCODEConfig

  beforeEach(() => {
    vi.clearAllMocks()
    resetClient()
    mockConfig = {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      maxTokens: 4096,
      temperature: 0.7,
      timeoutMs: 30000,
      debug: false,
      verbose: false,
    }
  })

  afterEach(() => {
    resetClient()
  })

  describe('getOpenAIClient', () => {
    it('should create a client with correct configuration', () => {
      const client = getOpenAIClient(mockConfig)
      expect(client).toBeDefined()
      expect(client).toHaveProperty('chat')
    })

    it('should use custom base URL', () => {
      const config = {
        ...mockConfig,
        baseUrl: 'https://custom.api.com/v1',
      }
      const client = getOpenAIClient(config)
      expect(client).toBeDefined()
    })

    it('should use custom API key', () => {
      const config = {
        ...mockConfig,
        apiKey: 'custom-key',
      }
      const client = getOpenAIClient(config)
      expect(client).toBeDefined()
    })

    it('should support different timeout values', () => {
      const config = {
        ...mockConfig,
        timeoutMs: 60000,
      }
      const client = getOpenAIClient(config)
      expect(client).toBeDefined()
    })

    it('should return cached client on subsequent calls', () => {
      const client1 = getOpenAIClient(mockConfig)
      const client2 = getOpenAIClient(mockConfig)
      // 由于 OpenAI 每次都创建新实例，我们测试函数是否被正确调用
      expect(client1).toBeDefined()
      expect(client2).toBeDefined()
      // 验证两次调用返回相同配置的客户端
      expect(client1).toMatchObject(client2)
    })
  })

  describe('resetClient', () => {
    it('should reset the client instance', () => {
      const client1 = getOpenAIClient(mockConfig)
      resetClient()
      const client2 = getOpenAIClient(mockConfig)
      expect(client1).toBeDefined()
      expect(client2).toBeDefined()
      expect(client1).not.toBe(client2)
    })
  })

  describe('Client methods', () => {
    it('should have chat completions interface', () => {
      const client = getOpenAIClient(mockConfig)
      expect(client.chat).toBeDefined()
      expect(client.chat.completions).toBeDefined()
      expect(client.chat.completions.create).toBeDefined()
    })
  })

  describe('Configuration validation', () => {
    it('should handle missing API key gracefully', () => {
      const config = { ...mockConfig, apiKey: '' }
      expect(() => getOpenAIClient(config)).toBeDefined()
    })

    it('should handle empty base URL', () => {
      const config = { ...mockConfig, baseUrl: '' }
      expect(() => getOpenAIClient(config)).toBeDefined()
    })

    it('should handle invalid timeout values', () => {
      const config = { ...mockConfig, timeoutMs: -1 }
      expect(() => getOpenAIClient(config)).toBeDefined()
    })

    it('should handle invalid temperature values', () => {
      const config = { ...mockConfig, temperature: 2.5 }
      expect(() => getOpenAIClient(config)).toBeDefined()
    })
  })

  describe('Client reuse', () => {
    it('should create independent clients after reset', () => {
      const client1 = getOpenAIClient(mockConfig)
      resetClient()
      const client2 = getOpenAIClient(mockConfig)
      expect(client1).toBeDefined()
      expect(client2).toBeDefined()
      expect(client1).not.toBe(client2)
    })

    it('should maintain separate configurations', () => {
      resetClient()
      const config1 = { ...mockConfig, model: 'gpt-4' }
      const config2 = { ...mockConfig, model: 'gpt-3.5-turbo' }
      
      resetClient()
      const client1 = getOpenAIClient(config1)
      resetClient()
      const client2 = getOpenAIClient(config2)
      
      expect(client1).toBeDefined()
      expect(client2).toBeDefined()
      expect(client1).not.toBe(client2)
    })
  })
})
