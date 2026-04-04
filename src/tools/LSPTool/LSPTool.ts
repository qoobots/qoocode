import { z } from 'zod'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  action: z.enum(['definition', 'references', 'completions', 'hover', 'diagnostics', 'symbols'])
    .describe('LSP action to perform'),
  file: z.string().describe('File path to analyze'),
  position: z.object({
    line: z.number().describe('Line number (0-based)'),
    character: z.number().describe('Character position (0-based)'),
  }).optional().describe('Position in the file'),
  symbol: z.string().optional().describe('Symbol name to search for'),
})

type Input = z.infer<typeof inputSchema>

interface LSPClient {
  workspaceRoot: string
  serverProcess?: ReturnType<typeof spawn>
  capabilities?: Record<string, unknown>
}

const lspClients = new Map<string, LSPClient>()

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const langMap: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.py': 'python',
    '.java': 'java',
    '.go': 'go',
    '.rs': 'rust',
    '.cpp': 'cpp',
    '.c': 'c',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
  }
  return langMap[ext] || 'unknown'
}

function findLanguageServer(language: string): string | null {
  // Common LSP servers (simplified - in production, check PATH and config)
  const servers: Record<string, string[]> = {
    typescript: ['typescript-language-server', 'tsserver'],
    javascript: ['typescript-language-server', 'tsserver'],
    python: ['pylsp', 'pyright-langserver', 'jedi-language-server'],
    go: ['gopls'],
    rust: ['rust-analyzer'],
    java: ['jdtls'],
  }

  return servers[language]?.[0] || null
}

async function initializeLSP(workspaceRoot: string): Promise<LSPClient | null> {
  const language = detectLanguage(path.join(workspaceRoot, 'package.json'))
  const serverCommand = findLanguageServer(language)

  if (!serverCommand) {
    return null
  }

  // Create LSP client (simplified - in production, implement full LSP protocol)
  const client: LSPClient = {
    workspaceRoot,
    capabilities: {},
  }

  lspClients.set(workspaceRoot, client)
  return client
}

async function sendLSPRequest(
  client: LSPClient,
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  // Simplified LSP request handling
  // In production, this would implement the full LSP JSON-RPC protocol
  return { error: 'LSP server not connected' }
}

export const LSPTool = buildTool({
  name: 'LSP',
  aliases: ['lsp', 'language-server', 'goto-definition', 'find-references'],
  description:
    'Language Server Protocol tool for code navigation, completions, and diagnostics.',
  inputSchema,
  maxResultSizeChars: 50_000,

  async call(input: Input): Promise<ToolResult> {
    const workspaceRoot = getCwd()

    // Initialize LSP client if needed
    let client = lspClients.get(workspaceRoot)
    if (!client) {
      client = await initializeLSP(workspaceRoot)
    }

    if (!client) {
      return {
        data: { action: input.action, error: 'No language server available for this project' },
        content: `Error: Cannot find a language server for "${detectLanguage(input.file)}" files.

To enable LSP features, install a language server:
- TypeScript/JavaScript: npm install -g typescript-language-server
- Python: pip install python-lsp-server
- Go: go install golang.org/x/tools/gopls@latest
- Rust: rustup component add rust-analyzer`,
      }
    }

    const { action, file, position, symbol } = input

    switch (action) {
      case 'definition': {
        if (!position) {
          return {
            data: { action, error: 'Position required for definition lookup' },
            content: 'Error: Please provide position (line and character) for definition lookup.',
          }
        }
        // Simplified - in production, send proper LSP request
        return {
          data: { action, file, position, status: 'requested' },
          content: `📍 Go to Definition\n\nFile: ${file}\nLine: ${position.line + 1}\nCharacter: ${position.character}

[In production, this would send an LSP "textDocument/definition" request to the language server]`,
        }
      }

      case 'references': {
        if (!position) {
          return {
            data: { action, error: 'Position required for references lookup' },
            content: 'Error: Please provide position for references lookup.',
          }
        }
        return {
          data: { action, file, position, status: 'requested' },
          content: `🔍 Find References\n\nFile: ${file}\nLine: ${position.line + 1}\nCharacter: ${position.character}

[In production, this would send an LSP "textDocument/references" request]`,
        }
      }

      case 'completions': {
        if (!position) {
          return {
            data: { action, error: 'Position required for completions' },
            content: 'Error: Please provide position for completions.',
          }
        }
        return {
          data: { action, file, position, status: 'requested' },
          content: `✨ Code Completions\n\nFile: ${file}\nLine: ${position.line + 1}\nCharacter: ${position.character}

[In production, this would send an LSP "textDocument/completion" request]`,
        }
      }

      case 'hover': {
        if (!position) {
          return {
            data: { action, error: 'Position required for hover' },
            content: 'Error: Please provide position for hover info.',
          }
        }
        return {
          data: { action, file, position, status: 'requested' },
          content: `ℹ️ Hover Information\n\nFile: ${file}\nLine: ${position.line + 1}\nCharacter: ${position.character}

[In production, this would send an LSP "textDocument/hover" request]`,
        }
      }

      case 'diagnostics': {
        return {
          data: { action, file, status: 'requested' },
          content: `🐛 Diagnostics\n\nFile: ${file}

[In production, this would send an LSP "textDocument/diagnostic" request and receive linting errors]`,
        }
      }

      case 'symbols': {
        return {
          data: { action, file, status: 'requested' },
          content: `📋 Document Symbols\n\nFile: ${file}${symbol ? `\nFilter: ${symbol}` : ''}

[In production, this would send an LSP "textDocument/documentSymbol" request]`,
        }
      }

      default:
        return {
          data: { action, error: 'Unknown action' },
          content: `Error: Unknown action "${action}"`,
        }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `LSP(${input?.action ?? 'unknown'}: ${input?.file ?? ''})`
  },
})
