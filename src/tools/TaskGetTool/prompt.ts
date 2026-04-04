// TaskGetTool prompt
export const DESCRIPTION = 'Get details of a specific task by ID'

export const PROMPT = `Use this tool to get the full details of a specific task by its ID.

## Task Fields:

- **taskId**: The ID of the task to retrieve (e.g., "task-1234567890-abc123")

## When to Use This Tool:

- When you need to see the full description of a task
- When you need to check a task's current status
- Before updating or modifying a task

## Tips:

- Use TaskList to see all available tasks and their IDs first
- The task ID format is typically "task-<timestamp>-<random>"`

export function getPrompt(): string {
  return PROMPT
}
