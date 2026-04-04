// TodoWriteTool prompt
export const DESCRIPTION = 'Manages the session task checklist (todo list)'

export const PROMPT = `The TodoWrite tool allows you to manage a todo list for tracking tasks during this session.

Use this tool to:
- Add new tasks with status (pending, in_progress, completed)
- Update existing task status
- Remove tasks from the list
- Clear all completed tasks
- Reorder tasks

The tool accepts an array of todo items, each with:
- content: The task description
- status: One of "pending", "in_progress", "completed"
- activeForm: A short description shown when task is in progress (e.g., "Running tests")

Always maintain a todo list when working on multi-step tasks to help track progress.`