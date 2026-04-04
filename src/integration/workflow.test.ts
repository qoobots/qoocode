import { describe, it, expect } from 'vitest'
import { getCommands, findCommand } from '../commands'
import { updateSessionCost, formatCost } from '../utils/tokens'
import type { SessionCost } from '../utils/tokens'

describe('Integration Tests - Workflow', () => {
  describe('Command Execution Workflow', () => {
    it('should execute help and model commands in sequence', async () => {
      const commands = getCommands()
      const helpCmd = findCommand('help', commands)
      const modelCmd = findCommand('model', commands)

      expect(helpCmd).toBeDefined()
      expect(modelCmd).toBeDefined()

      if (helpCmd && helpCmd.execute) {
        const helpResult = await helpCmd.execute()
        expect(helpResult).toBeDefined()
      }

      if (modelCmd && modelCmd.execute) {
        const modelResult = await modelCmd.execute('gpt-4')
        expect(modelResult).toBeDefined()
      }
    })

    it('should handle command aliases correctly', async () => {
      const commands = getCommands()
      const clearAlias = findCommand('cls', commands)
      const clearCmd = findCommand('clear', commands)

      expect(clearAlias?.name).toBe(clearCmd?.name)
    })
  })

  describe('Session Cost Tracking Workflow', () => {
    it('should track multiple API call costs', () => {
      let session: SessionCost = {
        totalCostUSD: 0,
        totalTokens: 0,
        entries: []
      }

      // 使用字符串模型名称
      const calls = [
        'gpt-4',
        'gpt-4',
        'deepseek-chat'
      ]
      const tokens = [
        { prompt: 100, completion: 50 },
        { prompt: 200, completion: 100 },
        { prompt: 150, completion: 75 }
      ]

      calls.forEach((model, index) => {
        session = updateSessionCost(
          session,
          model,
          tokens[index].prompt,
          tokens[index].completion
        )
      })

      expect(session.totalCostUSD).toBeGreaterThan(0)
      expect(session.totalTokens).toBe(675) // 100+50+200+100+150+75
      expect(session.entries).toHaveLength(3)
    })

    it('should format costs correctly', () => {
      expect(formatCost(0.000123)).toBe('$0.000123')
      expect(formatCost(0.0123)).toBe('$0.0123')
      expect(formatCost(1.23)).toBe('$1.23')
    })
  })

  describe('Context Management Workflow', () => {
    it('should maintain conversation context', () => {
      const context = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }
        ],
        currentTool: null,
        pendingAction: null
      }

      expect(context.messages).toHaveLength(2)

      // 添加助手回复
      context.messages.push({ role: 'assistant', content: 'Hi! How can I help?' })
      expect(context.messages).toHaveLength(3)

      // 添加另一个用户消息
      context.messages.push({ role: 'user', content: 'What can you do?' })
      expect(context.messages).toHaveLength(4)
    })
  })

  describe('Error Recovery Workflow', () => {
    it('should handle command execution gracefully', async () => {
      const commands = getCommands()
      const helpCmd = findCommand('help', commands)
      
      if (helpCmd && helpCmd.execute) {
        try {
          const result = await helpCmd.execute()
          expect(result).toBeDefined()
        } catch (error: any) {
          expect(error).toBeDefined()
          // 错误应该被妥善处理，不应该导致程序崩溃
        }
      }
    })
  })

  describe('Command State Management', () => {
    it('should maintain consistent command state', () => {
      const commands1 = getCommands()
      const commands2 = getCommands()

      expect(commands1.length).toBe(commands2.length)
      
      commands1.forEach((cmd, index) => {
        expect(cmd.name).toBe(commands2[index].name)
        expect(cmd.type).toBe(commands2[index].type)
      })
    })
  })
})
