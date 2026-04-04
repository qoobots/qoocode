// Context Visualizer Component - Shows token usage and context size
import React, { useMemo } from 'react'
import { Text, Box } from 'ink'

/**
 * Context usage statistics
 */
export interface ContextStats {
  currentTokens: number
  maxTokens: number
  systemPromptTokens: number
  messagesTokens: number
  toolsTokens: number
  contextLimit: number
}

/**
 * Context bar component
 */
export interface ContextBarProps {
  stats: ContextStats
  showDetails?: boolean
}

const MAX_BAR_WIDTH = 30

export const ContextBar: React.FC<ContextBarProps> = ({ stats, showDetails = false }) => {
  const percentage = useMemo(() => {
    return Math.min((stats.currentTokens / stats.contextLimit) * 100, 100)
  }, [stats.currentTokens, stats.contextLimit])

  const barLength = useMemo(() => {
    return Math.round((percentage / 100) * MAX_BAR_WIDTH)
  }, [percentage])

  const color = useMemo(() => {
    if (percentage >= 90) return 'red'
    if (percentage >= 70) return 'yellow'
    if (percentage >= 50) return 'cyan'
    return 'green'
  }, [percentage])

  const bar = useMemo(() => {
    const filled = '█'.repeat(barLength)
    const empty = '░'.repeat(MAX_BAR_WIDTH - barLength)
    return filled + empty
  }, [barLength])

  if (!showDetails) {
    return (
      <Box>
        <Text dimColor>Context: </Text>
        <Text color={color}>{bar}</Text>
        <Text dimColor> {percentage.toFixed(1)}%</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={0}>
      {/* Header */}
      <Box>
        <Text bold>Context Usage: </Text>
        <Text color={color}>{bar}</Text>
        <Text dimColor> {percentage.toFixed(1)}%</Text>
      </Box>

      {/* Details */}
      <Box paddingLeft={2} flexDirection="column">
        <Box>
          <Text dimColor>  System: </Text>
          <Text>{stats.systemPromptTokens.toLocaleString()}</Text>
          <Text dimColor> tokens</Text>
        </Box>
        <Box>
          <Text dimColor>  Messages: </Text>
          <Text>{stats.messagesTokens.toLocaleString()}</Text>
          <Text dimColor> tokens</Text>
        </Box>
        {stats.toolsTokens > 0 && (
          <Box>
            <Text dimColor>  Tools: </Text>
            <Text>{stats.toolsTokens.toLocaleString()}</Text>
            <Text dimColor> tokens</Text>
          </Box>
        )}
        <Box>
          <Text dimColor>  ──────────────────</Text>
        </Box>
        <Box>
          <Text bold>  Total: </Text>
          <Text bold>{stats.currentTokens.toLocaleString()}</Text>
          <Text dimColor> / {stats.contextLimit.toLocaleString()} tokens</Text>
        </Box>
        <Box>
          <Text dimColor>  Remaining: </Text>
          <Text color={color}>{(stats.contextLimit - stats.currentTokens).toLocaleString()}</Text>
          <Text dimColor> tokens</Text>
        </Box>
      </Box>
    </Box>
  )
}

/**
 * Compact context indicator for status bar
 */
export interface ContextIndicatorProps {
  currentTokens: number
  contextLimit: number
}

export const ContextIndicator: React.FC<ContextIndicatorProps> = ({ currentTokens, contextLimit }) => {
  const percentage = (currentTokens / contextLimit) * 100
  
  const color = percentage >= 90 ? 'red' : percentage >= 70 ? 'yellow' : 'green'
  
  return (
    <Text color={color}>
      [{currentTokens.toLocaleString()}/{contextLimit.toLocaleString()}]
    </Text>
  )
}

/**
 * Warning banner when context is running low
 */
export interface ContextWarningProps {
  remainingPercentage: number
  onCompact?: () => void
}

export const ContextWarning: React.FC<ContextWarningProps> = ({ remainingPercentage, onCompact }) => {
  if (remainingPercentage > 20) return null

  return (
    <Box borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text yellow>
        ⚠️ Context running low ({remainingPercentage.toFixed(0)}% remaining)
        {onCompact && ' - Use /compact to compress context'}
      </Text>
    </Box>
  )
}

/**
 * Token breakdown chart
 */
export interface TokenBreakdownProps {
  systemTokens: number
  messagesTokens: number
  toolsTokens: number
  maxWidth?: number
}

export const TokenBreakdown: React.FC<TokenBreakdownProps> = ({
  systemTokens,
  messagesTokens,
  toolsTokens,
  maxWidth = 40,
}) => {
  const total = systemTokens + messagesTokens + toolsTokens
  
  const systemPct = (systemTokens / total) * 100
  const messagesPct = (messagesTokens / total) * 100
  const toolsPct = (toolsTokens / total) * 100

  const systemWidth = Math.round((systemPct / 100) * maxWidth)
  const messagesWidth = Math.round((messagesPct / 100) * maxWidth)
  const toolsWidth = maxWidth - systemWidth - messagesWidth

  return (
    <Box flexDirection="column" gap={0}>
      <Box>
        <Text dimColor>System </Text>
        <Text green>{'█'.repeat(systemWidth)}</Text>
        <Text dimColor> ({systemPct.toFixed(1)}%)</Text>
      </Box>
      <Box>
        <Text dimColor>Messages </Text>
        <Text cyan>{'█'.repeat(messagesWidth)}</Text>
        <Text dimColor> ({messagesPct.toFixed(1)}%)</Text>
      </Box>
      {toolsTokens > 0 && (
        <Box>
          <Text dimColor>Tools </Text>
          <Text yellow>{'█'.repeat(toolsWidth)}</Text>
          <Text dimColor> ({toolsPct.toFixed(1)}%)</Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Full context visualization panel
 */
export interface ContextPanelProps {
  stats: ContextStats
  onCompact?: () => void
}

export const ContextPanel: React.FC<ContextPanelProps> = ({ stats, onCompact }) => {
  const remaining = stats.contextLimit - stats.currentTokens
  const remainingPct = (remaining / stats.contextLimit) * 100

  return (
    <Box flexDirection="column" gap={1}>
      {/* Header */}
      <Box>
        <Text bold>╭─────────────────────────────────╮</Text>
      </Box>
      <Box paddingLeft={1}>
        <Text bold>│ Context Status</Text>
      </Box>

      {/* Usage bar */}
      <Box paddingLeft={1}>
        <ContextBar stats={stats} />
      </Box>

      {/* Breakdown */}
      <Box paddingLeft={1}>
        <TokenBreakdown
          systemTokens={stats.systemPromptTokens}
          messagesTokens={stats.messagesTokens}
          toolsTokens={stats.toolsTokens}
        />
      </Box>

      {/* Warning if low */}
      {remainingPct <= 20 && (
        <Box paddingLeft={1}>
          <ContextWarning
            remainingPercentage={remainingPct}
            onCompact={onCompact}
          />
        </Box>
      )}

      {/* Footer */}
      <Box>
        <Text bold>╰─────────────────────────────────╯</Text>
      </Box>
    </Box>
  )
}

export default ContextBar
