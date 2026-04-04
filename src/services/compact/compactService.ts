/**
 * Context Compression Service
 * 
 * Provides comprehensive context compression functionality to reduce conversation size.
 * Integrates with auto-compact and micro-compact services for intelligent compression.
 */

import {
  isAutoCompactEnabled,
  shouldAutoCompact,
  calculateTokenWarningState,
  getAutoCompactThreshold,
  getEffectiveContextWindowSize,
  createAutoCompactTrackingState,
  updateTrackingStateAfterCompaction,
  shouldCircuitBreakerTrip,
  formatTokenWarning,
  type TokenWarningState,
  type AutoCompactTrackingState,
  estimateTokensFromMessages,
} from './autoCompactService.js'

import {
  microCompact,
  shouldMicroCompact,
  findMicroCompactCandidates,
  formatMicroCompactResult,
  type MicroCompactCandidate,
  type MicroCompactResult,
} from './microCompactService.js'

export interface CompressionStats {
  originalTokens: number;
  compressedTokens: number;
  messagesRemoved: number;
  compressionRatio: number;
  tokensFreed: number;
}

export interface CompressionResult {
  success: boolean;
  stats?: CompressionStats;
  message?: string;
  wasAutoCompact?: boolean;
  wasMicroCompact?: boolean;
}

export interface CompressionOptions {
  maxTokens?: number;
  preserveSystem?: boolean;
  preserveRecent?: number;
  model?: string;
  force?: boolean;
}

// Estimate token count
function estimateTokens(text: string): number {
  let count = 0;
  for (const char of text) {
    if (/[\u4e00-\u9fa5]/.test(char)) {
      count += 0.5;
    } else {
      count += 0.25;
    }
  }
  return Math.ceil(count);
}

// Check if a message is a tool result that can be compressed
function isCompressibleToolResult(content: string): boolean {
  const compressiblePatterns = [
    /^(Here are|Here is)/i,
    /^(The file|File|The content)/i,
    /^```/,
    /^(✓|✅|\*)/,
  ];
  
  return compressiblePatterns.some(pattern => pattern.test(content.trim()));
}

// Get summary for a message
function getMessageSummary(message: { role: string; content?: string | null }): string {
  if (!message.content) return '[empty message]';
  
  const content = String(message.content);
  const tokens = estimateTokens(content);
  
  if (tokens < 100) {
    return content.slice(0, 100) + (content.length > 100 ? '...' : '');
  }
  
  const lines = content.split('\n').slice(0, 3);
  return lines.join('\n').slice(0, 150) + (content.length > 150 ? '...' : '');
}

/**
 * Full context compression
 */
export function compressContext(
  messages: Array<{ role: string; content?: string | null; tool?: { name?: string } }>,
  options: CompressionOptions = {}
): { compressed: typeof messages; stats: CompressionStats } {
  const maxTokens = options.maxTokens || 10000;
  const preserveRecent = options.preserveRecent ?? 5;
  const preserveSystem = options.preserveSystem ?? true;
  
  const systemMessages: typeof messages = [];
  const otherMessages: typeof messages = [];
  
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemMessages.push(msg);
    } else {
      otherMessages.push(msg);
    }
  }
  
  let totalTokens = messages.reduce((sum, msg) => {
    return sum + estimateTokens(String(msg.content || ''));
  }, 0);
  
  const compressed: typeof messages = [];
  
  if (preserveSystem) {
    compressed.push(...systemMessages);
  }
  
  const recentMessages = otherMessages.slice(-preserveRecent);
  for (const msg of recentMessages) {
    compressed.push(msg);
    totalTokens -= estimateTokens(String(msg.content || ''));
  }
  
  if (totalTokens > maxTokens || options.force) {
    const olderMessages = otherMessages.slice(0, -preserveRecent);
    
    const summarizedOlder: typeof messages = [];
    
    for (const msg of olderMessages) {
      if (msg.role === 'assistant' && msg.content) {
        summarizedOlder.push({
          role: 'assistant',
          content: `[Earlier] ${getMessageSummary(msg)}`,
        });
      } else if (msg.role === 'user' && msg.content) {
        const content = String(msg.content);
        if (content.length > 200) {
          summarizedOlder.push({
            role: 'user',
            content: content.slice(0, 200) + '... [truncated]',
          });
        } else {
          summarizedOlder.push(msg);
        }
      } else if (msg.role === 'tool') {
        if (isCompressibleToolResult(String(msg.content || ''))) {
          summarizedOlder.push({
            role: 'tool',
            content: '[Tool result summarized]',
          });
        } else {
          summarizedOlder.push(msg);
        }
      } else {
        summarizedOlder.push(msg);
      }
    }
    
    compressed.unshift(...summarizedOlder);
  }
  
  const originalTokens = messages.reduce((sum, msg) => {
    return sum + estimateTokens(String(msg.content || ''));
  }, 0);
  
  const compressedTokens = compressed.reduce((sum, msg) => {
    return sum + estimateTokens(String(msg.content || ''));
  }, 0);
  
  const stats: CompressionStats = {
    originalTokens,
    compressedTokens,
    messagesRemoved: messages.length - compressed.length,
    compressionRatio: originalTokens > 0 ? compressedTokens / originalTokens : 1,
    tokensFreed: originalTokens - compressedTokens,
  };
  
  return { compressed, stats };
}

/**
 * Run intelligent compression based on context state
 */
export async function runIntelligentCompression(
  messages: Array<{ role: string; content?: string | null; tool?: { name?: string } }>,
  model: string = 'default',
  tracking?: AutoCompactTrackingState
): Promise<CompressionResult> {
  const tokenUsage = estimateTokensFromMessages(messages);
  const threshold = getAutoCompactThreshold(model);
  
  // Check if we should circuit break
  if (tracking && shouldCircuitBreakerTrip(tracking)) {
    return {
      success: false,
      message: 'Circuit breaker tripped - too many consecutive compression failures',
    };
  }
  
  // Try micro-compact first
  if (shouldMicroCompact(messages)) {
    const microResult = microCompact(messages);
    if (microResult.result.cleared > 0 || microResult.result.summarized > 0) {
      return {
        success: true,
        stats: {
          originalTokens: estimateTokensFromMessages(messages),
          compressedTokens: estimateTokensFromMessages(microResult.compacted),
          messagesRemoved: 0,
          compressionRatio: estimateTokensFromMessages(microResult.compacted) / estimateTokensFromMessages(messages),
          tokensFreed: microResult.result.tokensFreed,
        },
        message: `Micro-compact: ${formatMicroCompactResult(microResult.result)}`,
        wasMicroCompact: true,
      };
    }
  }
  
  // Fall back to full compression
  if (tokenUsage >= threshold || tracking?.compacted) {
    const { compressed, stats } = compressContext(messages, {
      model,
      force: tracking?.compacted,
    });
    
    return {
      success: true,
      stats,
      message: `Context compressed: ${stats.messagesRemoved} messages summarized, ${stats.tokensFreed} tokens freed`,
      wasAutoCompact: true,
    };
  }
  
  return {
    success: false,
    message: 'No compression needed',
  };
}

/**
 * Get context status for a model
 */
export function getContextStatus(
  messages: Array<{ role: string; content?: string | null }>,
  model: string = 'default'
): TokenWarningState & { autoCompactEnabled: boolean } {
  const tokenUsage = estimateTokensFromMessages(messages);
  return {
    ...calculateTokenWarningState(tokenUsage, model),
    autoCompactEnabled: isAutoCompactEnabled(),
  };
}

/**
 * Format compression stats for display
 */
export function formatCompressionStats(stats: CompressionStats): string {
  const lines = [
    'Context Compression Complete:',
    `  Original tokens: ${stats.originalTokens}`,
    `  Compressed tokens: ${stats.compressedTokens}`,
    `  Messages removed: ${stats.messagesRemoved}`,
    `  Compression ratio: ${(stats.compressionRatio * 100).toFixed(1)}%`,
    `  Tokens freed: ${stats.tokensFreed}`,
  ];
  
  return lines.join('\n');
}

/**
 * Preview what would be compressed
 */
export function previewCompression(
  messages: Array<{ role: string; content?: string | null }>,
  options: { maxTokens?: number } = {}
): { count: number; wouldRemove: number; wouldSummarize: number } {
  const maxTokens = options.maxTokens || 10000;
  
  let totalTokens = 0;
  let wouldRemove = 0;
  let wouldSummarize = 0;
  
  for (const msg of messages) {
    const tokens = estimateTokens(String(msg.content || ''));
    totalTokens += tokens;
    
    if (totalTokens > maxTokens) {
      if (msg.role === 'tool' && isCompressibleToolResult(String(msg.content || ''))) {
        wouldSummarize++;
      } else if (msg.role === 'assistant') {
        wouldSummarize++;
      } else {
        wouldRemove++;
      }
    }
  }
  
  return {
    count: messages.length,
    wouldRemove,
    wouldSummarize,
  };
}

// Export for external use
export {
  isAutoCompactEnabled,
  shouldAutoCompact,
  calculateTokenWarningState,
  getAutoCompactThreshold,
  getEffectiveContextWindowSize,
  createAutoCompactTrackingState,
  updateTrackingStateAfterCompaction,
  shouldCircuitBreakerTrip,
  formatTokenWarning,
  microCompact,
  shouldMicroCompact,
  findMicroCompactCandidates,
  estimateTokensFromMessages,
}

export type { TokenWarningState, AutoCompactTrackingState, MicroCompactCandidate, MicroCompactResult }
