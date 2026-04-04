// TaskListTool prompt
export const DESCRIPTION = 'List all tasks in the session'

export const PROMPT = `The TaskList tool returns all tasks currently in the session todo list.

Use this tool to:
- View current pending tasks
- See tasks in progress
- Review completed tasks
- Check task statuses

Returns an array of task objects with id, subject, status, and owner fields.`