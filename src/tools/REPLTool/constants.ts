// Constants for REPLTool
export const REPL_TOOL_NAME = 'REPL'

/**
 * Tools that are only accessible via REPL when REPL mode is enabled.
 * When REPL mode is on, these tools are hidden from direct use,
 * forcing use of REPL for batch operations.
 */
export const REPL_ONLY_TOOLS = new Set([
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Bash',
  'NotebookEdit',
  'Agent',
])
