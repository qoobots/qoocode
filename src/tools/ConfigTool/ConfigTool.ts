import { z } from 'zod'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  action: z.enum(['get', 'set', 'list', 'delete'])
    .describe('Action: get a value, set a value, list all, or delete a key'),
  key: z.string().optional().describe('Configuration key (required for get/set/delete)'),
  value: z.any().optional().describe('Configuration value (required for set)'),
  configPath: z.string().optional().describe('Path to config file (default: config.json in workspace root)'),
})

type Input = z.infer<typeof inputSchema>

const DEFAULT_CONFIG_PATH = 'config.json'

async function readConfig(configPath: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(configPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function writeConfig(configPath: string, config: Record<string, unknown>): Promise<void> {
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export const ConfigTool = buildTool({
  name: 'Config',
  aliases: ['config', 'cfg', 'settings'],
  description:
    'Manage configuration values. Get, set, list, or delete configuration keys in a JSON config file.',
  inputSchema,

  async call(input: Input): Promise<ToolResult> {
    const configPath = input.configPath
      ? path.resolve(getCwd(), input.configPath)
      : path.resolve(getCwd(), DEFAULT_CONFIG_PATH)

    try {
      switch (input.action) {
        case 'get': {
          if (!input.key) {
            return {
              data: { error: 'Key is required for get action' },
              content: '✗ Error: Key is required for get action',
            }
          }

          const config = await readConfig(configPath)
          if (!config) {
            return {
              data: { key: input.key, found: false },
              content: `ℹ Config file not found or empty`,
            }
          }

          const value = config[input.key]
          const found = value !== undefined

          return {
            data: { key: input.key, value, found },
            content: found
              ? `${input.key} = ${JSON.stringify(value, null, 2)}`
              : `ℹ Key not found: ${input.key}`,
          }
        }

        case 'set': {
          if (!input.key) {
            return {
              data: { error: 'Key is required for set action' },
              content: '✗ Error: Key is required for set action',
            }
          }

          if (input.value === undefined) {
            return {
              data: { error: 'Value is required for set action' },
              content: '✗ Error: Value is required for set action',
            }
          }

          const config = (await readConfig(configPath)) || {}
          config[input.key] = input.value
          await writeConfig(configPath, config)

          return {
            data: { key: input.key, value: input.value, path: configPath },
            content: `✓ Set ${input.key} = ${JSON.stringify(input.value)}\n  → ${configPath}`,
          }
        }

        case 'list': {
          const config = await readConfig(configPath)
          if (!config) {
            return {
              data: { keys: [], count: 0 },
              content: `ℹ Config file not found or empty\n  → ${configPath}`,
            }
          }

          const keys = Object.keys(config)
          const content = keys.length === 0
            ? `ℹ Config file is empty\n  → ${configPath}`
            : `⚙ Configuration\n${'─'.repeat(40)}\n${keys.map(key => `${key} = ${JSON.stringify(config[key])}`).join('\n')}\n${'─'.repeat(40)}\n${keys.length} key(s)`

          return {
            data: { config, keys, count: keys.length },
            content,
          }
        }

        case 'delete': {
          if (!input.key) {
            return {
              data: { error: 'Key is required for delete action' },
              content: '✗ Error: Key is required for delete action',
            }
          }

          const config = await readConfig(configPath)
          if (!config || config[input.key] === undefined) {
            return {
              data: { key: input.key, deleted: false },
              content: `ℹ Key not found: ${input.key}`,
            }
          }

          delete config[input.key]
          await writeConfig(configPath, config)

          return {
            data: { key: input.key, deleted: true },
            content: `✓ Deleted key: ${input.key}`,
          }
        }

        default:
          return {
            data: { error: `Unknown action: ${input.action}` },
            content: `✗ Error: Unknown action: ${input.action}`,
          }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: {
          action: input.action,
          key: input.key,
          error: errorMessage,
        },
        content: `✗ Config operation failed: ${errorMessage}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `Config(${input?.action ?? 'list'}${input?.key ? ` ${input.key}` : ''})`
  },

  requiresApproval(input?: Input) {
    // Require approval for write operations (set, delete)
    if (input?.action && ['set', 'delete'].includes(input.action)) {
      return true
    }
    return false
  },
})

