/**
 * Permission Dialog Component
 * 
 * Dialog for managing permission rules and settings.
 */

import React, { useState, useMemo } from 'react'
import {
  Box,
  Text,
  useStdin,
} from 'ink'
import { Select } from '../CustomSelect/select.js'
import {
  getPermissionManager,
  type PermissionRule,
  type PermissionType,
  type PermissionLevel,
} from '../../services/permissions/permissionManager.js'

export type PermissionDialogTab = 'allow' | 'ask' | 'deny' | 'rules'

export type PermissionDialogProps = {
  onClose: () => void
  initialTab?: PermissionDialogTab
}

const TABS: { id: PermissionDialogTab; label: string }[] = [
  { id: 'allow', label: 'Allow' },
  { id: 'ask', label: 'Ask' },
  { id: 'deny', label: 'Deny' },
  { id: 'rules', label: 'Rules' },
]

/**
 * Permission dialog for managing permissions
 */
export function PermissionDialog({
  onClose,
  initialTab = 'ask',
}: PermissionDialogProps) {
  const [activeTab, setActiveTab] = useState<PermissionDialogTab>(initialTab)
  const [selectedRuleIndex, setSelectedRuleIndex] = useState(0)
  const { exit } = useStdin()

  const permissionManager = getPermissionManager()
  const allRules = permissionManager.getRules()

  // Filter rules by level for each tab
  const filteredRules = useMemo(() => {
    if (activeTab === 'rules') {
      return allRules
    }
    return allRules.filter(rule => rule.level === activeTab)
  }, [allRules, activeTab])

  // Tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'allow':
        return (
          <Box flexDirection="column" gap={1}>
            <Text bold>Allowed Operations</Text>
            <Text dimColor>These operations will be executed without confirmation:</Text>
            <Box marginTop={1} flexDirection="column">
              {filteredRules.length === 0 ? (
                <Text dimColor italic>No allow rules configured</Text>
              ) : (
                filteredRules.map((rule, index) => (
                  <Box key={`allow-${index}`}>
                    <Text color="green">✓ </Text>
                    <Text>{rule.type}</Text>
                    {rule.pattern && (
                      <Text dimColor> ({rule.pattern})</Text>
                    )}
                    {rule.description && (
                      <Text dimColor> - {rule.description}</Text>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )
      
      case 'ask':
        return (
          <Box flexDirection="column" gap={1}>
            <Text bold>Operations Requiring Confirmation</Text>
            <Text dimColor>These operations will prompt for confirmation:</Text>
            <Box marginTop={1} flexDirection="column">
              {filteredRules.length === 0 ? (
                <Text dimColor italic>No ask rules configured</Text>
              ) : (
                filteredRules.map((rule, index) => (
                  <Box key={`ask-${index}`}>
                    <Text color="yellow">? </Text>
                    <Text>{rule.type}</Text>
                    {rule.pattern && (
                      <Text dimColor> ({rule.pattern})</Text>
                    )}
                    {rule.description && (
                      <Text dimColor> - {rule.description}</Text>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )
      
      case 'deny':
        return (
          <Box flexDirection="column" gap={1}>
            <Text bold>Denied Operations</Text>
            <Text dimColor>These operations will be blocked:</Text>
            <Box marginTop={1} flexDirection="column">
              {filteredRules.length === 0 ? (
                <Text dimColor italic>No deny rules configured</Text>
              ) : (
                filteredRules.map((rule, index) => (
                  <Box key={`deny-${index}`}>
                    <Text color="red">✗ </Text>
                    <Text>{rule.type}</Text>
                    {rule.pattern && (
                      <Text dimColor> ({rule.pattern})</Text>
                    )}
                    {rule.description && (
                      <Text dimColor> - {rule.description}</Text>
                    )}
                  </Box>
                ))
              )}
            </Box>
          </Box>
        )
      
      case 'rules':
        return (
          <Box flexDirection="column" gap={1}>
            <Text bold>Permission Rules</Text>
            <Text dimColor>Manage all permission rules:</Text>
            <Box marginTop={1} flexDirection="column">
              {filteredRules.length === 0 ? (
                <Text dimColor italic>No rules configured</Text>
              ) : (
                filteredRules.map((rule, index) => {
                  const levelColor = rule.level === 'allow' ? 'green' 
                    : rule.level === 'deny' ? 'red' 
                    : 'yellow'
                  return (
                    <Box key={`rule-${index}`}>
                      <Text color={levelColor}>[</Text>
                      <Text color={levelColor} bold>{rule.level.toUpperCase().padEnd(5)}</Text>
                      <Text color={levelColor}>]</Text>
                      <Text> {rule.type}</Text>
                      {rule.pattern && (
                        <Text dimColor> ({rule.pattern})</Text>
                      )}
                    </Box>
                  )
                })
              )}
            </Box>
          </Box>
        )
    }
  }

  // Tab header
  const renderTabs = () => (
    <Box flexDirection="column" gap={1}>
      <Box>
        {TABS.map((tab, index) => (
          <Box key={tab.id} marginRight={2}>
            <Text
              color={activeTab === tab.id ? 'cyan' : 'white'}
              bold={activeTab === tab.id}
              inverse={activeTab === tab.id}
            >
              {activeTab === tab.id ? '> ' : '  '}
              {tab.label}
            </Text>
            <Text dimColor> ({filteredRules.length})</Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>─".repeat(50)</Text>
    </Box>
  )

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">Permission Manager</Text>
      </Box>

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      <Box marginTop={1} marginBottom={1}>
        {renderTabContent()}
      </Box>

      {/* Footer */}
      <Box>
        <Text dimColor>
          ↑↓ navigate tabs | ←→ switch | d delete | a add | q quit
        </Text>
      </Box>
    </Box>
  )
}

/**
 * Permission rule editor dialog
 */
export type PermissionRuleEditorProps = {
  rule?: PermissionRule
  onSave: (rule: PermissionRule) => void
  onCancel: () => void
}

export function PermissionRuleEditor({
  rule,
  onSave,
  onCancel,
}: PermissionRuleEditorProps) {
  const [type, setType] = useState<PermissionType>(
    rule?.type || 'file:read'
  )
  const [level, setLevel] = useState<PermissionLevel>(
    rule?.level || 'prompt'
  )
  const [pattern, setPattern] = useState(rule?.pattern || '')
  const [description, setDescription] = useState(rule?.description || '')

  const PERMISSION_TYPES: PermissionType[] = [
    'file:read', 'file:write', 'file:delete',
    'dir:read', 'dir:create', 'dir:delete',
    'network:fetch', 'network:connect',
    'shell:execute', 'env:read', 'env:write',
  ]

  const LEVEL_OPTIONS: { value: PermissionLevel; label: string; color: string }[] = [
    { value: 'allow', label: 'Allow', color: 'green' },
    { value: 'prompt', label: 'Ask', color: 'yellow' },
    { value: 'deny', label: 'Deny', color: 'red' },
  ]

  const handleSave = () => {
    onSave({
      type,
      level,
      pattern: pattern || undefined,
      description: description || undefined,
    })
  }

  return (
    <Box
      flexDirection="column"
      gap={1}
      borderStyle="round"
      borderColor="cyan"
      padding={1}
    >
      <Text bold color="cyan">
        {rule ? 'Edit Permission Rule' : 'New Permission Rule'}
      </Text>

      {/* Type */}
      <Box>
        <Text>Type: </Text>
        <Select
          options={PERMISSION_TYPES.map(t => ({ value: t, label: t }))}
          value={type}
          onChange={(value) => setType(value as PermissionType)}
        />
      </Box>

      {/* Level */}
      <Box>
        <Text>Level: </Text>
        <Select
          options={LEVEL_OPTIONS.map(l => ({ value: l.value, label: l.label }))}
          value={level}
          onChange={(value) => setLevel(value as PermissionLevel)}
        />
      </Box>

      {/* Pattern */}
      <Box>
        <Text>Pattern (optional): </Text>
        <Text>{pattern || '(none)'}</Text>
      </Box>

      {/* Description */}
      <Box>
        <Text>Description: </Text>
        <Text>{description || '(none)'}</Text>
      </Box>

      {/* Actions */}
      <Box marginTop={1}>
        <Text dimColor>
          Enter to save | Esc to cancel
        </Text>
      </Box>
    </Box>
  )
}

export default PermissionDialog
