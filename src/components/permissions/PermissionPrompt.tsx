/**
 * Permission Prompt Component
 * 
 * A shared component for permission prompts with optional feedback input.
 */

import React, { useState } from 'react'
import { Box, Text } from 'ink'

export type FeedbackType = 'accept' | 'reject'

export type PermissionPromptOption<T extends string> = {
  value: T
  label: React.ReactNode
  feedbackConfig?: {
    type: FeedbackType
    placeholder?: string
  }
  keybinding?: string
}

export type ToolAnalyticsContext = {
  toolName: string
  isMcp: boolean
}

export type PermissionPromptProps<T extends string> = {
  options: PermissionPromptOption<T>[]
  onSelect: (value: T, feedback?: string) => void
  onCancel?: () => void
  question?: string | React.ReactNode
  toolAnalyticsContext?: ToolAnalyticsContext
}

const DEFAULT_PLACEHOLDERS: Record<FeedbackType, string> = {
  accept: 'provide instructions for next step',
  reject: 'provide instructions for what to do differently'
}

/**
 * Permission prompt component with optional feedback input
 */
export function PermissionPrompt<T extends string>({
  options,
  onSelect,
  onCancel,
  question = 'Do you want to proceed?',
  toolAnalyticsContext,
}: PermissionPromptProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [feedbackMode, setFeedbackMode] = useState(false)

  const handleSubmit = () => {
    const selected = options[selectedIndex]
    if (selected.feedbackConfig && feedbackMode) {
      onSelect(selected.value, feedback)
    } else {
      onSelect(selected.value)
    }
  }

  const handleToggleFeedback = () => {
    setFeedbackMode(!feedbackMode)
  }

  return (
    <Box flexDirection="column" gap={1}>
      {/* Question */}
      <Box>
        <Text bold>{question}</Text>
      </Box>

      {/* Options */}
      <Box flexDirection="column" marginLeft={2}>
        {options.map((option, index) => (
          <Box key={option.value}>
            <Text
              color={index === selectedIndex ? 'cyan' : 'white'}
              bold={index === selectedIndex}
            >
              {index === selectedIndex ? '> ' : '  '}
              {option.label}
            </Text>
            {option.keybinding && (
              <Text dimColor> [{option.keybinding}]</Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Feedback input (if enabled) */}
      {feedbackMode && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>
            {options[selectedIndex]?.feedbackConfig?.placeholder ||
              DEFAULT_PLACEHOLDERS[options[selectedIndex]?.feedbackConfig?.type || 'accept']}
            :
          </Text>
          <Text>
            <Text color="cyan">{'> '}</Text>
            <Text>{feedback}</Text>
            <Text blink>_</Text>
          </Text>
        </Box>
      )}

      {/* Instructions */}
      <Box marginTop={1}>
        <Text dimColor>
          ↑↓ navigate | Enter select
          {options[selectedIndex]?.feedbackConfig ? ' | Tab feedback' : ''}
          {onCancel ? ' | Esc cancel' : ''}
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Simple permission decision component
 */
export type PermissionDecision = 'allow' | 'deny' | 'cancel'

export type PermissionDecisionPromptProps = {
  toolName: string
  description?: string
  onDecision: (decision: PermissionDecision, feedback?: string) => void
  isMcp?: boolean
}

export function PermissionDecisionPrompt({
  toolName,
  description,
  onDecision,
  isMcp = false,
}: PermissionDecisionPromptProps) {
  const [feedback, setFeedback] = useState('')
  const [mode, setMode] = useState<'select' | 'accept-feedback' | 'deny-feedback'>('select')

  if (mode === 'accept-feedback') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Allow "{toolName}"?</Text>
        {description && <Text dimColor>{description}</Text>}
        {isMcp && (
          <Text dimColor italic>(MCP tool)</Text>
        )}
        <Box marginTop={1}>
          <Text dimColor>Provide instructions for next step:</Text>
        </Box>
        <Box>
          <Text color="cyan">{'> '}</Text>
          <Text>{feedback}</Text>
          <Text blink>_</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter to confirm | Esc to go back</Text>
        </Box>
      </Box>
    )
  }

  if (mode === 'deny-feedback') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Deny "{toolName}"?</Text>
        <Box marginTop={1}>
          <Text dimColor>Provide instructions for what to do differently:</Text>
        </Box>
        <Box>
          <Text color="cyan">{'> '}</Text>
          <Text>{feedback}</Text>
          <Text blink>_</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Enter to confirm | Esc to go back</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text bold>Allow </Text>
        <Text color="cyan">{toolName}</Text>
        <Text>?</Text>
      </Box>
      {description && <Text dimColor>{description}</Text>}
      {isMcp && (
        <Text dimColor italic>(MCP tool)</Text>
      )}

      <Box flexDirection="column" marginLeft={2} marginTop={1}>
        <Box>
          <Text color="cyan" bold>{'> '}</Text>
          <Text
            bold
            underline
            onPress={() => setMode('accept-feedback')}
          >
            Yes, allow
          </Text>
          <Text dimColor> (Enter)</Text>
        </Box>
        <Box>
          <Text color="white" bold>  </Text>
          <Text
            onPress={() => setMode('deny-feedback')}
          >
            No, deny
          </Text>
        </Box>
        {onDecision && (
          <Box>
            <Text dimColor>    </Text>
            <Text dimColor>Cancel</Text>
            <Text dimColor> (Esc)</Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>↑↓ navigate | Enter select | Tab add feedback</Text>
      </Box>
    </Box>
  )
}

export default PermissionPrompt
