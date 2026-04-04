import { describe, it, expect } from 'vitest'
import { createUserMessage, createToolMessage, messagesToOpenAIFormat } from './messages'

describe('Message Utilities', () => {
  describe('createUserMessage', () => {
    it('should create a user message with text content', () => {
      const message = createUserMessage('Hello, world!')
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello, world!')
    })

    it('should handle empty content', () => {
      const message = createUserMessage('')
      expect(message.content).toBe('')
    })

    it('should handle multiline content', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const message = createUserMessage(content)
      expect(message.content).toBe(content)
    })
  })

  describe('createToolMessage', () => {
    it('should create a tool message with tool_call_id', () => {
      const message = createToolMessage('call_123', 'tool output')
      expect(message.role).toBe('tool')
      expect(message.tool_call_id).toBe('call_123')
      expect(message.content).toBe('tool output')
    })

    it('should handle empty tool output', () => {
      const message = createToolMessage('call_123', '')
      expect(message.role).toBe('tool')
      expect(message.content).toBe('')
    })
  })

  describe('messagesToOpenAIFormat', () => {
    it('should convert user messages correctly', () => {
      const messages = [createUserMessage('test message')]
      const converted = messagesToOpenAIFormat(messages)
      expect(converted[0]).toEqual({ role: 'user', content: 'test message' })
    })

    it('should convert tool messages correctly', () => {
      const messages = [createToolMessage('call_123', 'output')]
      const converted = messagesToOpenAIFormat(messages)
      expect(converted[0]).toEqual({
        role: 'tool',
        tool_call_id: 'call_123',
        content: 'output',
      })
    })

    it('should handle multiple messages', () => {
      const messages = [
        createUserMessage('user message'),
        createToolMessage('call_123', 'tool output'),
      ]
      const converted = messagesToOpenAIFormat(messages)
      expect(converted).toHaveLength(2)
      expect(converted[0].role).toBe('user')
      expect(converted[1].role).toBe('tool')
    })

    it('should handle system messages', () => {
      const messages = [{ role: 'system' as const, content: 'system prompt' }]
      const converted = messagesToOpenAIFormat(messages)
      expect(converted[0]).toEqual({
        role: 'system',
        content: 'system prompt',
      })
    })

    it('should handle assistant messages with content', () => {
      const messages = [{ role: 'assistant' as const, content: 'assistant response' }]
      const converted = messagesToOpenAIFormat(messages)
      expect(converted[0]).toEqual({
        role: 'assistant',
        content: 'assistant response',
      })
    })

    it('should handle assistant messages with tool_calls', () => {
      const messages = [
        {
          role: 'assistant' as const,
          content: null,
          tool_calls: [
            {
              id: 'call_123',
              type: 'function' as const,
              function: {
                name: 'Bash',
                arguments: '{"command":"echo test"}',
              },
            },
          ],
        },
      ]
      const converted = messagesToOpenAIFormat(messages)
      expect(converted[0]).toEqual({
        role: 'assistant',
        content: null,
        tool_calls: messages[0].tool_calls,
      })
    })
  })

  describe('Message content handling', () => {
    it('should preserve whitespace in content', () => {
      const content = '  indented  \n  text  '
      const message = createUserMessage(content)
      expect(message.content).toBe(content)
    })

    it('should handle special characters', () => {
      const content = 'Hello "world"! @#$%^&*()'
      const message = createUserMessage(content)
      expect(message.content).toBe(content)
    })

    it('should handle unicode characters', () => {
      const content = '你好世界 🌍'
      const message = createUserMessage(content)
      expect(message.content).toBe(content)
    })

    it('should handle very long content', () => {
      const content = 'x'.repeat(10000)
      const message = createUserMessage(content)
      expect(message.content).toBe(content)
      expect(message.content.length).toBe(10000)
    })
  })
})
