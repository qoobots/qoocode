// TaskUpdateTool prompt
export const DESCRIPTION = 'Update a task\'s status, ownership, or dependencies'

export function getPrompt(): string {
  return `Use this tool to update a task's properties including status, ownership, and dependencies.

## Task Fields:

- **taskId**: The ID of the task to update
- **status** (optional): New status - "pending", "in_progress", or "completed"
- **subject** (optional): New title for the task
- **description** (optional): New description
- **activeForm** (optional): New active form for spinner display
- **owner** (optional): Assign a team member to this task
- **blockedBy** (optional): Array of task IDs that must be completed before this task
- **blocks** (optional): Array of task IDs that this task blocks

## When to Use This Tool:

- When starting work on a task: set status to "in_progress"
- When completing a task: set status to "completed"
- When assigning a task to a teammate: set the owner
- When a task depends on others: add to blockedBy
- When a task is a prerequisite for others: add to blocks

## Tips:

- Always mark tasks as "in_progress" when you start working on them
- Mark tasks as "completed" when done
- Use TaskList to see all available tasks and their IDs
- Dependency management helps track complex workflows`

}
