import type { Tools } from './Tool.js'
export type { Tools } from './Tool.js'
import { BashTool } from './tools/BashTool/BashTool.js'
import { PowerShellTool } from './tools/PowerShellTool/PowerShellTool.js'
import { FileReadTool } from './tools/FileReadTool/FileReadTool.js'
import { FileWriteTool } from './tools/FileWriteTool/FileWriteTool.js'
import { FileEditTool } from './tools/FileEditTool/FileEditTool.js'
import { GrepTool } from './tools/GrepTool/GrepTool.js'
import { GlobTool } from './tools/GlobTool/GlobTool.js'
import { DirectoryReadTool } from './tools/DirectoryReadTool/DirectoryReadTool.js'
import { DirectoryWriteTool } from './tools/DirectoryWriteTool/DirectoryWriteTool.js'
import { DirectoryEditTool } from './tools/DirectoryEditTool/DirectoryEditTool.js'
import { WebFetchTool } from './tools/WebFetchTool/WebFetchTool.js'
import { APICallTool } from './tools/APICallTool/APICallTool.js'
import { AgentTool } from './tools/AgentTool/AgentTool.js'
import { LSPTool } from './tools/LSPTool/LSPTool.js'
import { GotoDefinitionTool } from './tools/GotoDefinitionTool/GotoDefinitionTool.js'
import { FindReferencesTool } from './tools/FindReferencesTool/FindReferencesTool.js'
import { WebSearchTool } from './tools/WebSearchTool/WebSearchTool.js'
import { GitCommitTool } from './tools/GitCommitTool/GitCommitTool.js'
import { GitDiffTool } from './tools/GitDiffTool/GitDiffTool.js'
import { GitLogTool } from './tools/GitLogTool/GitLogTool.js'
import { GitBranchTool } from './tools/GitBranchTool/GitBranchTool.js'
import { ConfigTool } from './tools/ConfigTool/ConfigTool.js'
import { ExitPlanModeTool } from './tools/ExitPlanModeTool/ExitPlanModeTool.js'
import { NotebookEditTool } from './tools/NotebookEditTool/NotebookEditTool.js'
import { RunTestsTool } from './tools/RunTestsTool/RunTestsTool.js'
import { AskUserQuestionTool } from './tools/AskUserQuestionTool/AskUserQuestionTool.js'
import { CopyFileTool } from './tools/CopyFileTool/CopyFileTool.js'
import { MoveFileTool } from './tools/MoveFileTool/MoveFileTool.js'
import { DeleteFileTool } from './tools/DeleteFileTool/DeleteFileTool.js'
import { SymbolSearchTool } from './tools/SymbolSearchTool/SymbolSearchTool.js'
import { BriefTool } from './tools/BriefTool/BriefTool.js'
import { TestCoverageTool } from './tools/TestCoverageTool/TestCoverageTool.js'
import { MCPTool } from './tools/MCPTool/MCPTool.js'
import { ListMcpResourcesTool } from './tools/ListMcpResourcesTool/ListMcpResourcesTool.js'
import { ReadMcpResourceTool } from './tools/ReadMcpResourceTool/ReadMcpResourceTool.js'
import { EnterWorktreeTool } from './tools/EnterWorktreeTool/EnterWorktreeTool.js'
import { ExitWorktreeTool } from './tools/ExitWorktreeTool/ExitWorktreeTool.js'
import { McpAuthTool } from './tools/McpAuthTool/McpAuthTool.js'
import { RemoteTriggerTool } from './tools/RemoteTriggerTool/RemoteTriggerTool.js'
import { CronCreateTool, CronDeleteTool, CronListTool } from './tools/ScheduleCronTool/ScheduleCronTool.js'
import { ToolSearchTool } from './tools/ToolSearchTool/ToolSearchTool.js'
import { SleepTool } from './tools/SleepTool/SleepTool.js'
import { SyntheticOutputTool } from './tools/SyntheticOutputTool/SyntheticOutputTool.js'
import { TodoWriteTool } from './tools/TodoWriteTool/TodoWriteTool.js'
import { TaskListTool } from './tools/TaskListTool/TaskListTool.js'
import { TeamCreateTool } from './tools/TeamCreateTool/TeamCreateTool.js'
import { TeamDeleteTool } from './tools/TeamDeleteTool/TeamDeleteTool.js'
import { SendMessageTool } from './tools/SendMessageTool/SendMessageTool.js'
import { TaskStopTool } from './tools/TaskStopTool/TaskStopTool.js'
import { TaskCreateTool } from './tools/TaskCreateTool/TaskCreateTool.js'
import { TaskGetTool } from './tools/TaskGetTool/TaskGetTool.js'
import { TaskUpdateTool } from './tools/TaskUpdateTool/TaskUpdateTool.js'
import { REPLTool } from './tools/REPLTool/REPLTool.js'
import { TaskOutputTool } from './tools/TaskOutputTool/TaskOutputTool.js'
import { SkillTool } from './tools/SkillTool/SkillTool.js'
import { WebBrowserTool } from './tools/WebBrowserTool/WebBrowserTool.js'
import { speechTool } from './tools/SpeechTool/SpeechTool.js'

/**
 * Get the list of all available tools.
 * This is the single source of truth for the tool registry.
 */
export function getTools(): Tools {
  return [
    BashTool,
    PowerShellTool,
    FileReadTool,
    FileWriteTool,
    FileEditTool,
    GrepTool,
    GlobTool,
    DirectoryReadTool,
    DirectoryWriteTool,
    DirectoryEditTool,
    WebFetchTool,
    APICallTool,
    WebBrowserTool,
    AgentTool,
    LSPTool,
    GotoDefinitionTool,
    FindReferencesTool,
    WebSearchTool,
    GitCommitTool,
    GitDiffTool,
    GitLogTool,
    GitBranchTool,
    ConfigTool,
    ExitPlanModeTool,
    NotebookEditTool,
    RunTestsTool,
    AskUserQuestionTool,
    CopyFileTool,
    MoveFileTool,
    DeleteFileTool,
    SymbolSearchTool,
    BriefTool,
    TestCoverageTool,
    // MCP tools
    MCPTool,
    McpAuthTool,
    ListMcpResourcesTool,
    ReadMcpResourceTool,
    // Git worktree tools
    EnterWorktreeTool,
    ExitWorktreeTool,
    // Remote trigger tool
    RemoteTriggerTool,
    // Cron tools
    CronCreateTool,
    CronDeleteTool,
    CronListTool,
    // Tool search
    ToolSearchTool,
    // Utility tools
    SleepTool,
    SyntheticOutputTool,
    // Todo tool
    TodoWriteTool,
    TaskListTool,
    // Swarm/Team tools
    TeamCreateTool,
    TeamDeleteTool,
    SendMessageTool,
    TaskStopTool,
    // Task management tools
    TaskCreateTool,
    TaskGetTool,
    TaskUpdateTool,
    // Task output tool
    TaskOutputTool,
    // Skill tool
    SkillTool,
    // REPL tool
    REPLTool,
    // Speech tool
    speechTool,
  ].filter((tool) => tool.isEnabled())
}

/**
 * Get tool descriptions for the system prompt
 */
export function getToolDescriptions(): string {
  const tools = getTools()
  return tools
    .map((t) => `- ${t.name}: ${t.description}`)
    .join('\n')
}
