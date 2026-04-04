// Theme service for qoocode CLI

export type ThemeName = 'light' | 'dark' | 'auto'

export interface ThemeColors {
  // Primary colors
  primary: string
  primaryBg: string
  secondary: string
  secondaryBg: string

  // Text colors
  text: string
  textMuted: string
  textBright: string

  // Background colors
  bg: string
  bgSecondary: string
  bgTertiary: string

  // Status colors
  success: string
  warning: string
  error: string
  info: string

  // UI colors
  border: string
  borderLight: string
  highlight: string
  selection: string

  // Tool output colors
  toolBg: string
  toolBorder: string
  userMessage: string
  assistantMessage: string
  systemMessage: string
}

export interface Theme {
  name: ThemeName
  colors: ThemeColors
  icons: {
    user: string
    assistant: string
    system: string
    tool: string
    error: string
    success: string
    warning: string
    info: string
  }
}

// Dark theme (default)
export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#3b82f6',
    primaryBg: '#1e3a5f',
    secondary: '#8b5cf6',
    secondaryBg: '#2d1b4e',
    text: '#e5e7eb',
    textMuted: '#9ca3af',
    textBright: '#ffffff',
    bg: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    border: '#475569',
    borderLight: '#334155',
    highlight: '#3b82f620',
    selection: '#3b82f640',
    toolBg: '#1e293b',
    toolBorder: '#475569',
    userMessage: '#1e3a5f',
    assistantMessage: '#1e293b',
    systemMessage: '#2d1b4e',
  },
  icons: {
    user: '👤',
    assistant: '🤖',
    system: '⚙️',
    tool: '🔧',
    error: '❌',
    success: '✅',
    warning: '⚠️',
    info: 'ℹ️',
  },
}

// Light theme
export const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#2563eb',
    primaryBg: '#dbeafe',
    secondary: '#7c3aed',
    secondaryBg: '#ede9fe',
    text: '#1f2937',
    textMuted: '#6b7280',
    textBright: '#000000',
    bg: '#ffffff',
    bgSecondary: '#f3f4f6',
    bgTertiary: '#e5e7eb',
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
    border: '#d1d5db',
    borderLight: '#e5e7eb',
    highlight: '#2563eb20',
    selection: '#2563eb30',
    toolBg: '#f3f4f6',
    toolBorder: '#d1d5db',
    userMessage: '#dbeafe',
    assistantMessage: '#f3f4f6',
    systemMessage: '#ede9fe',
  },
  icons: {
    user: '👤',
    assistant: '🤖',
    system: '⚙️',
    tool: '🔧',
    error: '❌',
    success: '✅',
    warning: '⚠️',
    info: 'ℹ️',
  },
}

// Get theme by name
export function getTheme(name: ThemeName): Theme {
  if (name === 'auto') {
    // Check system preference
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : lightTheme
    }
    return darkTheme
  }
  return name === 'dark' ? darkTheme : lightTheme
}

// Theme manager
class ThemeManager {
  private currentTheme: Theme
  private listeners: Array<(theme: Theme) => void> = []

  constructor(initialTheme: ThemeName = 'dark') {
    this.currentTheme = getTheme(initialTheme)
  }

  getTheme(): Theme {
    return this.currentTheme
  }

  setTheme(name: ThemeName): void {
    this.currentTheme = getTheme(name)
    this.notifyListeners()
  }

  toggleTheme(): void {
    this.setTheme(this.currentTheme.name === 'dark' ? 'light' : 'dark')
  }

  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentTheme))
  }
}

// Default theme manager instance
let themeManager: ThemeManager | null = null

export function getThemeManager(): ThemeManager {
  if (!themeManager) {
    themeManager = new ThemeManager('dark')
  }
  return themeManager
}

// Convenience functions
export function useTheme(): Theme {
  return getThemeManager().getTheme()
}

export function setTheme(name: ThemeName): void {
  getThemeManager().setTheme(name)
}

export function toggleTheme(): void {
  getThemeManager().toggleTheme()
}

// CSS variables helper
export function getThemeCSSVariables(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--color-${key}`] = value
  }
  return vars
}

// Theme configuration storage
const THEME_CONFIG_KEY = 'qoocode_theme'

/**
 * Load saved theme from config
 */
export function loadSavedTheme(): ThemeName {
  if (typeof process !== 'undefined' && process.env?.QOOCODE_THEME) {
    const envTheme = process.env.QOOCODE_THEME as ThemeName
    if (['light', 'dark', 'auto'].includes(envTheme)) {
      return envTheme
    }
  }
  return 'dark'
}

/**
 * Get theme by name with validation
 */
export function validateThemeName(name: string): ThemeName | null {
  if (['light', 'dark', 'auto'].includes(name)) {
    return name as ThemeName
  }
  return null
}

/**
 * Get all available themes
 */
export function getAvailableThemes(): Array<{ name: ThemeName; description: string }> {
  return [
    { name: 'dark', description: 'Dark theme (default)' },
    { name: 'light', description: 'Light theme' },
    { name: 'auto', description: 'Follow system preference' },
  ]
}

/**
 * Format theme info for display
 */
export function formatThemeInfo(currentTheme: ThemeName): string {
  const themes = getAvailableThemes()
  const currentName = currentTheme.toUpperCase()
  
  const lines = [
    '',
    '  Theme Settings',
    '  =============',
    '',
    `  Current theme: ${currentName}`,
    '',
    '  Available themes:',
    ...themes.map(t => {
      const marker = t.name === currentTheme ? '>' : ' '
      return `    ${marker} ${t.name.padEnd(8)} - ${t.description}`
    }),
    '',
    '  Usage:',
    '    /theme          - Show current theme',
    '    /theme dark     - Set dark theme',
    '    /theme light    - Set light theme',
    '    /theme auto     - Follow system preference',
    '    /theme toggle   - Toggle between light and dark',
    '',
  ]
  
  return lines.join('\n')
}