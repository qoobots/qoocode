/**
 * Vim Input Mode Service
 * 
 * Provides basic Vim-style keybindings for terminal input:
 * - Normal mode: vi-like navigation (hjkl, w, b, etc.)
 * - Insert mode: direct text input
 * - ESC to switch between modes
 */

import { useState, useCallback, useEffect } from 'react';

export type VimMode = 'INSERT' | 'NORMAL';

export interface VimState {
  mode: VimMode;
  buffer: string;
  cursorPosition: number;
  commandBuffer: string;
}

export interface VimKeyMapping {
  key: string;
  action: 'move-left' | 'move-right' | 'move-up' | 'move-down' | 
          'word-forward' | 'word-backward' | 'line-start' | 'line-end' |
          'delete-char' | 'delete-word' | 'backspace' |
          'enter-insert' | 'enter-normal' | 'enter' | 'escape' |
          'yank' | 'paste' | 'undo' | 'noop';
}

const VIM_KEY_MAPPINGS: Record<string, VimKeyMapping['action']> = {
  // Movement keys
  'h': 'move-left',
  'l': 'move-right',
  'j': 'move-down',
  'k': 'move-up',
  'ArrowLeft': 'move-left',
  'ArrowRight': 'move-right',
  'ArrowUp': 'move-up',
  'ArrowDown': 'move-down',
  
  // Word movement
  'w': 'word-forward',
  'b': 'word-backward',
  'e': 'word-forward', // end of word
  
  // Line movement
  '0': 'line-start',
  '$': 'line-end',
  '^': 'line-start',
  
  // Editing
  'x': 'delete-char',
  'd': 'noop', // needs special handling
  'dd': 'delete-char', // simplified
  'c': 'noop', // needs special handling
  'y': 'noop', // needs special handling
  'p': 'paste',
  'P': 'paste',
  'u': 'undo',
  
  // Mode switching
  'i': 'enter-insert',
  'I': 'enter-insert',
  'a': 'enter-insert',
  'A': 'enter-insert',
  'o': 'enter-insert',
  'O': 'enter-insert',
  'Escape': 'enter-normal',
  'ESC': 'enter-normal',
  
  // Special
  'Enter': 'enter',
  'Backspace': 'backspace',
  'Delete': 'delete-char',
};

/**
 * Check if a character is a word character
 */
function isWordChar(char: string): boolean {
  return /[a-zA-Z0-9_]/.test(char);
}

/**
 * Find the start of the current word
 */
function findWordStart(text: string, pos: number): number {
  if (pos <= 0) return 0;
  
  // Skip current word
  while (pos > 0 && isWordChar(text[pos - 1])) {
    pos--;
  }
  // Skip non-word chars
  while (pos > 0 && !isWordChar(text[pos - 1])) {
    pos--;
  }
  
  return pos;
}

/**
 * Find the end of the current word
 */
function findWordEnd(text: string, pos: number): number {
  const len = text.length;
  if (pos >= len) return len;
  
  // Skip current word
  while (pos < len && isWordChar(text[pos])) {
    pos++;
  }
  // Skip non-word chars
  while (pos < len && !isWordChar(text[pos])) {
    pos++;
  }
  
  return pos;
}

/**
 * Process a Vim key in NORMAL mode
 */
export function processNormalKey(
  key: string,
  state: VimState,
): { newState: VimState; consumed: boolean; action?: VimKeyMapping['action'] } {
  const action = VIM_KEY_MAPPINGS[key] || 'noop';
  
  switch (action) {
    case 'move-left': {
      const newPos = Math.max(0, state.cursorPosition - 1);
      return { 
        newState: { ...state, cursorPosition: newPos }, 
        consumed: true 
      };
    }
    
    case 'move-right': {
      const newPos = Math.min(state.buffer.length, state.cursorPosition + 1);
      return { 
        newState: { ...state, cursorPosition: newPos }, 
        consumed: true 
      };
    }
    
    case 'move-up':
    case 'move-down': {
      // Line-based movement would need multi-line support
      return { newState: state, consumed: true };
    }
    
    case 'word-forward': {
      const newPos = findWordEnd(state.buffer, state.cursorPosition);
      return { 
        newState: { ...state, cursorPosition: newPos }, 
        consumed: true 
      };
    }
    
    case 'word-backward': {
      const newPos = findWordStart(state.buffer, state.cursorPosition);
      return { 
        newState: { ...state, cursorPosition: newPos }, 
        consumed: true 
      };
    }
    
    case 'line-start': {
      // Find the start of the current line
      const lineStart = state.buffer.lastIndexOf('\n', state.cursorPosition - 1) + 1;
      return { 
        newState: { ...state, cursorPosition: lineStart }, 
        consumed: true 
      };
    }
    
    case 'line-end': {
      // Find the end of the current line
      const nextNewline = state.buffer.indexOf('\n', state.cursorPosition);
      const lineEnd = nextNewline === -1 ? state.buffer.length : nextNewline;
      return { 
        newState: { ...state, cursorPosition: lineEnd }, 
        consumed: true 
      };
    }
    
    case 'delete-char': {
      if (state.buffer.length === 0) {
        return { newState: state, consumed: true };
      }
      const before = state.buffer.slice(0, state.cursorPosition);
      const after = state.buffer.slice(state.cursorPosition + 1);
      return { 
        newState: { ...state, buffer: before + after }, 
        consumed: true 
      };
    }
    
    case 'backspace': {
      if (state.cursorPosition === 0) {
        return { newState: state, consumed: true };
      }
      const before = state.buffer.slice(0, state.cursorPosition - 1);
      const after = state.buffer.slice(state.cursorPosition);
      return { 
        newState: { ...state, buffer: before + after, cursorPosition: state.cursorPosition - 1 }, 
        consumed: true 
      };
    }
    
    case 'enter-insert': {
      return { 
        newState: { ...state, mode: 'INSERT' as VimMode }, 
        consumed: true,
        action: 'enter-insert'
      };
    }
    
    case 'enter-normal': {
      return { newState: state, consumed: false };
    }
    
    case 'noop':
    default: {
      return { newState: state, consumed: false };
    }
  }
}

/**
 * Process a Vim key in INSERT mode
 */
export function processInsertKey(
  key: string,
  state: VimState,
): { newState: VimState; consumed: boolean } {
  if (key === 'Escape' || key === 'ESC') {
    return { 
      newState: { ...state, mode: 'NORMAL' as VimMode, cursorPosition: Math.max(0, state.cursorPosition - 1) }, 
      consumed: true 
    };
  }
  
  if (key === 'Backspace') {
    if (state.cursorPosition === 0) {
      return { newState: state, consumed: true };
    }
    const before = state.buffer.slice(0, state.cursorPosition - 1);
    const after = state.buffer.slice(state.cursorPosition);
    return { 
      newState: { ...state, buffer: before + after, cursorPosition: state.cursorPosition - 1 }, 
      consumed: true 
    };
  }
  
  if (key === 'Delete') {
    if (state.cursorPosition >= state.buffer.length) {
      return { newState: state, consumed: true };
    }
    const before = state.buffer.slice(0, state.cursorPosition);
    const after = state.buffer.slice(state.cursorPosition + 1);
    return { 
      newState: { ...state, buffer: before + after }, 
      consumed: true 
    };
  }
  
  if (key === 'ArrowLeft') {
    const newPos = Math.max(0, state.cursorPosition - 1);
    return { newState: { ...state, cursorPosition: newPos }, consumed: true };
  }
  
  if (key === 'ArrowRight') {
    const newPos = Math.min(state.buffer.length, state.cursorPosition + 1);
    return { newState: { ...state, cursorPosition: newPos }, consumed: true };
  }
  
  if (key === 'ArrowUp' || key === 'ArrowDown') {
    // Line-based movement
    return { newState: state, consumed: true };
  }
  
  if (key === 'Enter') {
    const before = state.buffer.slice(0, state.cursorPosition);
    const after = state.buffer.slice(state.cursorPosition);
    return { 
      newState: { ...state, buffer: before + '\n' + after, cursorPosition: state.cursorPosition + 1 }, 
      consumed: true 
    };
  }
  
  // Regular character input
  if (key.length === 1) {
    const before = state.buffer.slice(0, state.cursorPosition);
    const after = state.buffer.slice(state.cursorPosition);
    return { 
      newState: { ...state, buffer: before + key + after, cursorPosition: state.cursorPosition + 1 }, 
      consumed: true 
    };
  }
  
  return { newState: state, consumed: false };
}

/**
 * Create initial Vim state
 */
export function createVimState(initialText: string = ''): VimState {
  return {
    mode: 'NORMAL',
    buffer: initialText,
    cursorPosition: initialText.length,
    commandBuffer: '',
  };
}

/**
 * Get the mode indicator for display
 */
export function getVimModeIndicator(mode: VimMode): string {
  return mode === 'INSERT' ? '-- INSERT --' : '';
}

/**
 * Vim mode help text
 */
export const VIM_HELP = `
Vim Mode Commands:
  h/j/k/l   - Move cursor (or arrow keys)
  w/b       - Word forward/backward
  0/$       - Line start/end
  i         - Enter insert mode
  a         - Enter insert mode (after cursor)
  x         - Delete character
  u         - Undo
  p         - Paste
  ESC       - Return to normal mode
`;
