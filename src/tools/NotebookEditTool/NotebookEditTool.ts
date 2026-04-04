import { z } from 'zod'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  file: z.string().describe('Notebook file path (.ipynb)'),
  cellIndex: z.number().optional().describe('Cell index to edit (0-based)'),
  action: z.enum(['add', 'update', 'delete', 'list', 'execute'])
    .describe('Action to perform on notebook'),
  cellType: z.enum(['code', 'markdown']).optional().default('code')
    .describe('Type of cell for add action (code or markdown)'),
  content: z.string().optional().describe('Content for add/update actions'),
  source: z.string().optional().describe('Source label for code cell'),
  outputPath: z.string().optional().describe('Path to save output'),
})

type Input = z.infer<typeof inputSchema>

interface NotebookCell {
  cell_type: 'code' | 'markdown'
  source: string[]
  execution_count: number | null
  outputs: unknown[]
  metadata: Record<string, unknown>
}

interface Notebook {
  cells: NotebookCell[]
  metadata: Record<string, unknown>
  nbformat: number
  nbformat_minor: number
}

function validateNotebookPath(filePath: string): boolean {
  return filePath.endsWith('.ipynb')
}

async function readNotebook(filePath: string): Promise<Notebook | null> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const notebook = JSON.parse(content) as Notebook

    // Basic validation
    if (!notebook.cells || !Array.isArray(notebook.cells)) {
      return null
    }

    return notebook
  } catch {
    return null
  }
}

function createNotebook(): Notebook {
  return {
    nbformat: 4,
    nbformat_minor: 4,
    metadata: {},
    cells: [],
  }
}

async function writeNotebook(filePath: string, notebook: Notebook): Promise<void> {
  await writeFile(filePath, JSON.stringify(notebook, null, 2), 'utf-8')
}

export const NotebookEditTool = buildTool({
  name: 'NotebookEdit',
  aliases: ['notebook', 'jupyter', 'nb'],
  description:
    'Edit Jupyter Notebook (.ipynb) files. Add, update, delete, list, or execute cells.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    if (!validateNotebookPath(input.file)) {
      return {
        data: {
          action: input.action,
          error: 'Invalid file extension',
        },
        content: `✗ Error: Notebook files must have .ipynb extension.\nFile: ${input.file}`,
      }
    }

    try {
      const filePath = path.resolve(getCwd(), input.file)
      let notebook = await readNotebook(filePath)

      // If file doesn't exist or is invalid, create new one
      if (!notebook) {
        if (input.action === 'list') {
          return {
            data: {
              action: 'list',
              file: filePath,
              cells: [],
            },
            content: `📓 Notebook not found: ${filePath}\n\nCreate a new notebook to get started.`,
          }
        }

        notebook = createNotebook()
      }

      switch (input.action) {
        case 'list': {
          let content = `📓 Notebook: ${filePath}\n`
          content += `${'─'.repeat(50)}\n`
          content += `\nTotal cells: ${notebook.cells.length}\n\n`

          if (notebook.cells.length > 0) {
            notebook.cells.forEach((cell, index) => {
              const icon = cell.cell_type === 'code' ? '💻' : '📝'
              const execCount = cell.execution_count !== null ? `[executed ${cell.execution_count}x]` : '[not executed]'
              content += `\n${icon} Cell ${index} (${cell.cell_type}) ${execCount}`
              const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source
              const preview = source.substring(0, 60).replace(/\n/g, ' ')
              content += `\n    ${preview}${source.length > 60 ? '...' : ''}\n`
            })
          }

          content += `\n${'─'.repeat(50)}`

          return {
            data: {
              action: 'list',
              file: filePath,
              cells: notebook.cells,
              count: notebook.cells.length,
            },
            content,
          }
        }

        case 'add': {
          if (!input.content) {
            return {
              data: { action: 'add', error: 'Content required' },
              content: `✗ Error: Content is required for add action.\nUsage: NotebookEdit(add, file, content)`,
            }
          }

          const newCell: NotebookCell = {
            cell_type: input.cellType,
            source: [input.content],
            execution_count: null,
            outputs: [],
            metadata: {},
          }

          notebook.cells.push(newCell)

          if (input.outputPath) {
            await writeNotebook(input.outputPath, notebook)
            return {
              data: {
                action: 'add',
                file: input.outputPath,
                cellIndex: notebook.cells.length - 1,
                cellType: input.cellType,
              },
              content: `✓ Added ${input.cellType} cell to notebook\n\nSaved to: ${input.outputPath}\n\nContent: ${input.content.substring(0, 80)}...`,
            }
          }

          return {
            data: {
              action: 'add',
              file: filePath,
              cellIndex: notebook.cells.length - 1,
              cellType: input.cellType,
              content: input.content,
            },
            content: `✓ Added ${input.cellType} cell (index ${notebook.cells.length - 1})\n\nContent preview:\n${input.content.substring(0, 100)}${input.content.length > 100 ? '...' : ''}\n\n💡 Use the save action to persist changes.`,
          }
        }

        case 'update': {
          if (input.cellIndex === undefined) {
            return {
              data: { action: 'update', error: 'Cell index required' },
              content: `✗ Error: Cell index is required for update action.\nUsage: NotebookEdit(update, file, cellIndex, content)`,
            }
          }

          if (input.cellIndex < 0 || input.cellIndex >= notebook.cells.length) {
            return {
              data: {
                action: 'update',
                cellIndex: input.cellIndex,
                totalCells: notebook.cells.length,
              },
              content: `✗ Error: Cell index ${input.cellIndex} is out of range (0-${notebook.cells.length - 1}).`,
            }
          }

          const oldCell = notebook.cells[input.cellIndex]

          notebook.cells[input.cellIndex] = {
            ...oldCell,
            source: input.content ? [input.content] : oldCell.source,
            cell_type: input.cellType,
          }

          return {
            data: {
              action: 'update',
              file: filePath,
              cellIndex: input.cellIndex,
              cellType: input.cellType,
            },
            content: `✓ Updated cell ${input.cellIndex} (${input.cellType})\n\nContent: ${input.content || '[unchanged]'}\n\n💡 Use the save action to persist changes.`,
          }
        }

        case 'delete': {
          if (input.cellIndex === undefined) {
            return {
              data: { action: 'delete', error: 'Cell index required' },
              content: `✗ Error: Cell index is required for delete action.\nUsage: NotebookEdit(delete, file, cellIndex)`,
            }
          }

          if (input.cellIndex < 0 || input.cellIndex >= notebook.cells.length) {
            return {
              data: {
                action: 'delete',
                cellIndex: input.cellIndex,
                totalCells: notebook.cells.length,
              },
              content: `✗ Error: Cell index ${input.cellIndex} is out of range (0-${notebook.cells.length - 1}).`,
            }
          }

          const deletedCell = notebook.cells.splice(input.cellIndex, 1)[0]

          return {
            data: {
              action: 'delete',
              file: filePath,
              cellIndex: input.cellIndex,
              deletedCell,
            },
            content: `✓ Deleted cell ${input.cellIndex} (${deletedCell.cell_type})\n\nContent: ${Array.isArray(deletedCell.source) ? deletedCell.source.join('').substring(0, 100) : '...'}\n\n💡 Use the save action to persist changes.`,
          }
        }

        case 'execute': {
          if (input.cellIndex === undefined) {
            return {
              data: { action: 'execute', error: 'Cell index required' },
              content: `✗ Error: Cell index is required for execute action.\nUsage: NotebookEdit(execute, file, cellIndex)`,
            }
          }

          if (input.cellIndex < 0 || input.cellIndex >= notebook.cells.length) {
            return {
              data: {
                action: 'execute',
                cellIndex: input.cellIndex,
                totalCells: notebook.cells.length,
              },
              content: `✗ Error: Cell index ${input.cellIndex} is out of range (0-${notebook.cells.length - 1}).`,
            }
          }

          const cell = notebook.cells[input.cellIndex]
          const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source

          return {
            data: {
              action: 'execute',
              file: filePath,
              cellIndex: input.cellIndex,
              cell,
            },
            content: `🚀 Executing Cell ${input.cellIndex}\n${'─'.repeat(50)}\n\n${source}\n\n💡 Use Jupyter to execute this cell with full output.`,
          }
        }

        default:
          return {
            data: { action: input.action, error: 'Unknown action' },
            content: `✗ Error: Unknown action "${input.action}"`,
          }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        data: {
          action: input.action,
          file: input.file,
          error: errorMessage,
        },
        content: `✗ Failed to edit notebook: ${errorMessage}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `NotebookEdit(${input?.action ?? 'list'} ${input?.file ?? 'notebook'})`
  },

  requiresApproval(input?: Input) {
    // Require approval for add, update, delete actions
    if (input?.action && ['add', 'update', 'delete'].includes(input.action)) {
      return true
    }
    return false
  },
})

