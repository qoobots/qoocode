import React, { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import type { Message, SessionCost, StreamEvent } from '../types/message.js'
import type { QoocodeConfig } from '../utils/config.js'

// ============================================================
// AppState
// ============================================================

export type TodoItem = {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
}

export type AppState = {
  messages: Message[]
  cost: SessionCost
  isQuerying: boolean
  streamingText: string
  activeToolCalls: Map<string, { name: string; arguments: string }>
  config: QoocodeConfig
  error: string | null
  todos: TodoItem[]  // Todo list for tracking tasks
}

export type AppAction =
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'SET_MESSAGES'; messages: Message[] }
  | { type: 'SET_COST'; cost: SessionCost }
  | { type: 'SET_QUERYING'; isQuerying: boolean }
  | { type: 'APPEND_STREAMING_TEXT'; text: string }
  | { type: 'CLEAR_STREAMING_TEXT' }
  | { type: 'SET_ACTIVE_TOOL_CALLS'; toolCalls: Map<string, { name: string; arguments: string }> }
  | { type: 'ADD_TOOL_CALL'; toolCallId: string; name: string }
  | { type: 'UPDATE_TOOL_CALL_ARGS'; toolCallId: string; argsDelta: string }
  | { type: 'REMOVE_TOOL_CALL'; toolCallId: string }
  | { type: 'SET_CONFIG'; config: QoocodeConfig }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_TODOS'; todos: TodoItem[] }  // Set the entire todo list
  | { type: 'UPDATE_TODO'; index: number; todo: Partial<TodoItem> }  // Update a single todo
  | { type: 'ADD_TODO'; todo: TodoItem }  // Add a new todo
  | { type: 'REMOVE_TODO'; index: number }  // Remove a todo by index
  | { type: 'CLEAR_TODOS' }  // Clear all todos

// ============================================================
// Initial State
// ============================================================

export function createInitialState(config: QoocodeConfig): AppState {
  return {
    messages: [],
    cost: { totalCostUSD: 0, totalTokens: 0, entries: [] },
    isQuerying: false,
    streamingText: '',
    activeToolCalls: new Map(),
    config,
    error: null,
    todos: [],
  }
}

// ============================================================
// Reducer
// ============================================================

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] }
    case 'SET_MESSAGES':
      return { ...state, messages: action.messages }
    case 'SET_COST':
      return { ...state, cost: action.cost }
    case 'SET_QUERYING':
      return { ...state, isQuerying: action.isQuerying }
    case 'APPEND_STREAMING_TEXT':
      return { ...state, streamingText: state.streamingText + action.text }
    case 'CLEAR_STREAMING_TEXT':
      return { ...state, streamingText: '' }
    case 'SET_ACTIVE_TOOL_CALLS':
      return { ...state, activeToolCalls: action.toolCalls }
    case 'ADD_TOOL_CALL': {
      const newMap = new Map(state.activeToolCalls)
      newMap.set(action.toolCallId, { name: action.name, arguments: '' })
      return { ...state, activeToolCalls: newMap }
    }
    case 'UPDATE_TOOL_CALL_ARGS': {
      const existing = state.activeToolCalls.get(action.toolCallId)
      if (existing) {
        const newMap = new Map(state.activeToolCalls)
        newMap.set(action.toolCallId, { ...existing, arguments: existing.arguments + action.argsDelta })
        return { ...state, activeToolCalls: newMap }
      }
      return state
    }
    case 'REMOVE_TOOL_CALL': {
      const newMap = new Map(state.activeToolCalls)
      newMap.delete(action.toolCallId)
      return { ...state, activeToolCalls: newMap }
    }
    case 'SET_CONFIG':
      return { ...state, config: action.config }
    case 'SET_ERROR':
      return { ...state, error: action.error }
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [], streamingText: '', activeToolCalls: new Map(), error: null }
    case 'SET_TODOS':
      return { ...state, todos: action.todos }
    case 'UPDATE_TODO': {
      const newTodos = [...state.todos]
      if (action.index >= 0 && action.index < newTodos.length) {
        newTodos[action.index] = { ...newTodos[action.index], ...action.todo }
      }
      return { ...state, todos: newTodos }
    }
    case 'ADD_TODO':
      return { ...state, todos: [...state.todos, action.todo] }
    case 'REMOVE_TODO': {
      const newTodos = state.todos.filter((_, i) => i !== action.index)
      return { ...state, todos: newTodos }
    }
    case 'CLEAR_TODOS':
      return { ...state, todos: [] }
    default:
      return state
  }
}

// ============================================================
// Context
// ============================================================

export type AppContextType = {
  state: AppState
  dispatch: Dispatch<AppAction>
}

export const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({
  config,
  children,
}: {
  config: QoocodeConfig
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(appReducer, config, createInitialState)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState(): AppContextType {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
