import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCommands, findCommand } from './commands'
import type { Command } from './commands'

describe('Command System', () => {
  let allCommands: Command[]

  beforeEach(() => {
    allCommands = getCommands()
    vi.clearAllMocks()
  })

  describe('getCommands', () => {
    it('should return all available commands', () => {
      const commands = getCommands()
      expect(commands).toBeDefined()
      expect(commands.length).toBeGreaterThan(0)
    })

    it('should include help command', () => {
      const commands = getCommands()
      const helpCmd = commands.find((c) => c.name === 'help')
      expect(helpCmd).toBeDefined()
      expect(helpCmd?.type).toBe('local')
    })

    it('should include clear command', () => {
      const commands = getCommands()
      const clearCmd = commands.find((c) => c.name === 'clear')
      expect(clearCmd).toBeDefined()
    })

    it('should include exit command', () => {
      const commands = getCommands()
      const exitCmd = commands.find((c) => c.name === 'exit')
      expect(exitCmd).toBeDefined()
    })

    it('should include cost command', () => {
      const commands = getCommands()
      const costCmd = commands.find((c) => c.name === 'cost')
      expect(costCmd).toBeDefined()
    })

    it('should include model command', () => {
      const commands = getCommands()
      const modelCmd = commands.find((c) => c.name === 'model')
      expect(modelCmd).toBeDefined()
    })
  })

  describe('findCommand', () => {
    it('should find command by name', () => {
      const helpCmd = findCommand('help', allCommands)
      expect(helpCmd).toBeDefined()
      expect(helpCmd?.name).toBe('help')
    })

    it('should find command by alias', () => {
      const hCmd = findCommand('h', allCommands)
      expect(hCmd).toBeDefined()
      expect(hCmd?.name).toBe('help')

      const clsCmd = findCommand('cls', allCommands)
      expect(clsCmd).toBeDefined()
      expect(clsCmd?.name).toBe('clear')

      const qCmd = findCommand('q', allCommands)
      expect(qCmd).toBeDefined()
      expect(qCmd?.name).toBe('exit')
    })

    it('should return undefined for non-existent command', () => {
      const unknownCmd = findCommand('unknown-command', allCommands)
      expect(unknownCmd).toBeUndefined()
    })

    it('should be case-sensitive', () => {
      const helpCmd = findCommand('Help', allCommands)
      expect(helpCmd).toBeUndefined()
    })
  })

  describe('Command execution', () => {
    it('should execute help command', () => {
      const helpCmd = findCommand('help', allCommands)
      expect(helpCmd).toBeDefined()
      const result = helpCmd?.execute()
      expect(result).toBeDefined()
      expect(result).toContain('Available commands')
    })

    it('should execute clear command', () => {
      const clearCmd = findCommand('clear', allCommands)
      expect(clearCmd).toBeDefined()
      const result = clearCmd?.execute()
      expect(result).toBe('__CLEAR_MESSAGES__')
    })

    it('should execute exit command', () => {
      const exitCmd = findCommand('exit', allCommands)
      expect(exitCmd).toBeDefined()
      const result = exitCmd?.execute()
      expect(result).toBe('__EXIT__')
    })

    it('should execute cost command', () => {
      const costCmd = findCommand('cost', allCommands)
      expect(costCmd).toBeDefined()
      const result = costCmd?.execute()
      expect(result).toBe('__SHOW_COST__')
    })

    it('should execute model command without args', () => {
      const modelCmd = findCommand('model', allCommands)
      expect(modelCmd).toBeDefined()
      const result = modelCmd?.execute('')
      expect(result).toContain('Current model')
      expect(result).toContain('Usage: /model')
    })

    it('should execute model command with args', () => {
      const modelCmd = findCommand('model', allCommands)
      expect(modelCmd).toBeDefined()
      const result = modelCmd?.execute('gpt-4')
      expect(result).toBe('__CHANGE_MODEL__:gpt-4')
    })
  })

  describe('Command properties', () => {
    it('should have correct command names', () => {
      const names = allCommands.map((c) => c.name)
      expect(names).toContain('help')
      expect(names).toContain('clear')
      expect(names).toContain('exit')
      expect(names).toContain('cost')
      expect(names).toContain('model')
    })

    it('should have descriptions', () => {
      allCommands.forEach((cmd) => {
        expect(cmd.description).toBeDefined()
        expect(cmd.description.length).toBeGreaterThan(0)
      })
    })

    it('should have execute function', () => {
      const missing = allCommands.filter((cmd) => !cmd.execute)
      if (missing.length > 0) {
        console.log('Commands without execute:', missing.map((c) => c.name))
      }
      expect(missing.length, `Commands without execute: ${missing.map((c) => c.name).join(', ')}`).toBe(0)
    })

    it('should have type property', () => {
      allCommands.forEach((cmd) => {
        expect(cmd.type).toBeDefined()
      })
    })

    it('should have aliases for some commands', () => {
      const helpCmd = findCommand('help', allCommands)
      expect(helpCmd?.aliases).toBeDefined()
      expect(helpCmd?.aliases).toEqual(['h', '?'])

      const exitCmd = findCommand('exit', allCommands)
      expect(exitCmd?.aliases).toEqual(['quit', 'q'])
    })
  })

  describe('Command output format', () => {
    it('should format help output correctly', () => {
      const helpCmd = findCommand('help', allCommands)
      const result = helpCmd?.execute() as string
      expect(result).toContain('Available commands:')
      expect(result).toContain('/help')
      expect(result).toContain('/clear')
      expect(result).toContain('/exit')
      expect(result).toContain('/cost')
      expect(result).toContain('/model')
    })

    it('should include aliases in help output', () => {
      const helpCmd = findCommand('help', allCommands)
      const result = helpCmd?.execute() as string
      expect(result).toContain('(h, ?)')
    })

    it('should include Ctrl+C hint in help output', () => {
      const helpCmd = findCommand('help', allCommands)
      const result = helpCmd?.execute() as string
      expect(result).toContain('Ctrl+C')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty args for model command', () => {
      const modelCmd = findCommand('model', allCommands)
      const result = modelCmd?.execute('   ')
      expect(result).toContain('Current model')
    })

    it('should handle whitespace in model name', () => {
      const modelCmd = findCommand('model', allCommands)
      const result = modelCmd?.execute('  gpt-4  ')
      expect(result).toBe('__CHANGE_MODEL__:gpt-4')
    })

    it('should handle special characters in model name', () => {
      const modelCmd = findCommand('model', allCommands)
      const result = modelCmd?.execute('gpt-4-turbo-2024')
      expect(result).toBe('__CHANGE_MODEL__:gpt-4-turbo-2024')
    })
  })
})
