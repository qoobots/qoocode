import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  prompt: z.string().describe('The task/prompt for the sub-agent to execute'),
  agentType: z.enum(['explorer', 'reviewer', 'writer', 'general']).optional().describe('Type of agent to create'),
  maxRounds: z.number().optional().describe('Maximum conversation rounds for the sub-agent (default: 10)'),
  context: z.record(z.string(), z.unknown()).optional().describe('Additional context to pass to the sub-agent'),
})

type Input = z.infer<typeof inputSchema>

interface AgentSession {
  id: string
  type: string
  prompt: string
  maxRounds: number
  createdAt: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
}

// In-memory agent sessions (would be persisted in production)
const activeAgents = new Map<string, AgentSession>()

function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const AGENT_SYSTEM_PROMPTS = {
  explorer: `You are a Code Explorer agent. Your task is to:
1. Understand the project structure
2. Find relevant files for a given task
3. Analyze code and provide insights
4. Search for definitions, references, and usages

Use available tools: Glob, Grep, FileRead, DirectoryRead`,
  reviewer: `You are a Code Reviewer agent. Your task is to:
1. Review code for bugs and issues
2. Check code quality and best practices
3. Identify potential security vulnerabilities
4. Suggest improvements
5. Check for proper error handling

Use available tools: FileRead, Grep, Glob`,
  writer: `You are a Documentation Writer agent. Your task is to:
1. Read and understand existing code
2. Generate documentation
3. Write clear comments and explanations
4. Create README files
5. Explain complex code in simple terms

Use available tools: FileRead, Glob, DirectoryRead`,
  general: `You are a helpful assistant agent. Your task is to:
1. Complete the assigned task
2. Use appropriate tools as needed
3. Provide clear and concise results
4. Report any errors or issues encountered`,
}

export const AgentTool = buildTool({
  name: 'Agent',
  aliases: ['subagent', 'delegate', 'spawn'],
  description:
    'Launch a sub-agent to handle complex tasks. The sub-agent runs independently and returns results.',
  inputSchema,
  maxResultSizeChars: 50_000,

  async call(input: Input): Promise<ToolResult> {
    const agentId = generateAgentId()
    const agentType = input.agentType ?? 'general'
    const maxRounds = input.maxRounds ?? 10

    // Create agent session
    const session: AgentSession = {
      id: agentId,
      type: agentType,
      prompt: input.prompt,
      maxRounds,
      createdAt: new Date(),
      status: 'running',
    }

    activeAgents.set(agentId, session)

    // In a full implementation, this would spawn a child process
    // and run a complete query loop. For now, we return a placeholder.
    const systemPrompt = AGENT_SYSTEM_PROMPTS[agentType]

    // Simulate agent execution (in production, this would run independently)
    const resultContent = `
🤖 Agent Created: ${agentId}
📋 Type: ${agentType}
📝 Task: ${input.prompt}
🔄 Max Rounds: ${maxRounds}

System Prompt:
${systemPrompt}

[Agent execution would run here in a full implementation]

To complete this task, the agent would:
1. Analyze the project structure
2. Use appropriate tools to gather information
3. Process and synthesize the results
4. Return a final report

In production, this would spawn a child process running a separate query loop.`

    session.status = 'completed'
    session.result = resultContent

    return {
      data: {
        agentId,
        agentType,
        prompt: input.prompt,
        maxRounds,
        status: 'created',
      },
      content: resultContent,
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `Agent(${input?.agentType ?? 'general'}: ${input?.prompt?.slice(0, 30) ?? ''}...)`
  },
})

/**
 * Get active agent sessions
 */
export function getActiveAgents(): AgentSession[] {
  return Array.from(activeAgents.values())
}

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): AgentSession | undefined {
  return activeAgents.get(agentId)
}

/**
 * Stop an agent
 */
export function stopAgent(agentId: string): boolean {
  const agent = activeAgents.get(agentId)
  if (agent) {
    agent.status = 'failed'
    return true
  }
  return false
}
