/**
 * 语音工具 - 语音合成和识别
 * 
 * 提供语音交互能力:
 * - 文本转语音 (TTS)
 * - 语音转文本 (STT)
 * - 音频播放控制
 * 
 * @module src/tools/SpeechTool/SpeechTool
 */

import { z } from 'zod'
import { buildTool } from '../../Tool'
import { SpeechService, SpeechConfig } from '../../services/speech/speechService'

// ============ 类型定义 ============

const SpeakArgsSchema = z.object({
  /** 要朗读的文本 */
  text: z.string().describe('要朗读的文本内容'),
  /** 语言代码 (如 zh-CN, en-US) */
  language: z.string().optional().describe('语音语言'),
  /** 语速 (0.1 - 10) */
  rate: z.number().optional().describe('语速，范围 0.1-10'),
  /** 音调 (0 - 2) */
  pitch: z.number().optional().describe('音调，范围 0-2'),
  /** 音量 (0 - 1) */
  volume: z.number().optional().describe('音量，范围 0-1'),
})

const StopArgsSchema = z.object({
  /** 停止类型: tts, stt, or all */
  type: z.enum(['tts', 'stt', 'all']).optional().default('all').describe('停止类型'),
})

const GetVoicesArgsSchema = z.object({
  /** 过滤语言 */
  language: z.string().optional().describe('过滤指定语言的语音'),
})

const UpdateConfigArgsSchema = z.object({
  /** TTS 语言 */
  ttsLanguage: z.string().optional(),
  /** TTS 语速 */
  ttsRate: z.number().optional(),
  /** TTS 音调 */
  ttsPitch: z.number().optional(),
  /** TTS 音量 */
  ttsVolume: z.number().optional(),
  /** TTS 语音名称 */
  ttsVoice: z.string().optional(),
  /** STT 语言 */
  sttLanguage: z.string().optional(),
  /** STT 连续识别 */
  sttContinuous: z.boolean().optional(),
  /** STT 中间结果 */
  sttInterimResults: z.boolean().optional(),
  /** 使用 Whisper API */
  useWhisper: z.boolean().optional(),
  /** Whisper API 密钥 */
  whisperApiKey: z.string().optional(),
})

const TranscribeArgsSchema = z.object({
  /** 音频文件路径 (本地文件或 URL) */
  audioPath: z.string().describe('音频文件路径或 URL'),
  /** 语言代码 */
  language: z.string().optional().describe('音频语言'),
  /** 使用 Whisper API */
  useWhisper: z.boolean().optional().default(true).describe('是否使用 Whisper API'),
})

// ============ 语音工具类 ============

class SpeechToolImpl {
  private speechService: SpeechService | null = null
  private defaultConfig: SpeechConfig = {}

  constructor() {
    // 初始化语音服务 (仅在浏览器环境中)
    if (typeof window !== 'undefined') {
      this.speechService = new SpeechService(this.defaultConfig)
    }
  }

  /**
   * 文本转语音
   */
  async speak(args: z.infer<typeof SpeakArgsSchema>): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.speechService) {
      // 非浏览器环境，使用命令行 TTS
      return this.speakWithCommand(args)
    }

    try {
      // 更新临时配置
      const tempConfig: Partial<SpeechConfig> = {}
      if (args.language) tempConfig.ttsLanguage = args.language
      if (args.rate) tempConfig.ttsRate = args.rate
      if (args.pitch) tempConfig.ttsPitch = args.pitch
      if (args.volume) tempConfig.ttsVolume = args.volume
      
      if (Object.keys(tempConfig).length > 0) {
        this.speechService.updateConfig(tempConfig)
      }

      const result = await this.speechService.speak(args.text)
      
      // 恢复默认配置
      if (Object.keys(tempConfig).length > 0) {
        this.speechService.updateConfig(this.defaultConfig)
      }

      if (result.success) {
        return {
          success: true,
          content: `Successfully spoke: "${args.text.substring(0, 50)}${args.text.length > 50 ? '...' : ''}"`,
        }
      } else {
        return {
          success: false,
          error: result.error,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Speech failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * 非浏览器环境的命令行 TTS
   */
  private async speakWithCommand(args: z.infer<typeof SpeakArgsSchema>): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      let command: string
      const text = args.text.replace(/"/g, '\\"')
      
      if (process.platform === 'win32') {
        // Windows: 使用 PowerShell
        command = `powershell -Command "Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.Speak('${text}')"`
      } else if (process.platform === 'darwin') {
        // macOS: 使用 say 命令
        command = `say "${text}"`
      } else {
        // Linux: 使用 espeak 或 festival
        try {
          command = `espeak "${text}"`
        } catch {
          return {
            success: false,
            error: 'No TTS engine available. Install espeak on Linux.',
          }
        }
      }

      await execAsync(command, { timeout: 30000 })
      return {
        success: true,
        content: `Successfully spoke: "${args.text.substring(0, 50)}${args.text.length > 50 ? '...' : ''}"`,
      }
    } catch (error) {
      return {
        success: false,
        error: `Command TTS failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * 停止语音
   */
  async stop(args: z.infer<typeof StopArgsSchema>): Promise<{ success: boolean; content?: string }> {
    if (!this.speechService) {
      return {
        success: true,
        content: 'Speech service not available in this environment',
      }
    }

    switch (args.type) {
      case 'tts':
        this.speechService.stop()
        break
      case 'stt':
        this.speechService.abortListening()
        break
      default:
        this.speechService.stop()
        this.speechService.abortListening()
    }

    return {
      success: true,
      content: `Stopped ${args.type} operation`,
    }
  }

  /**
   * 获取可用的语音列表
   */
  async getVoices(args: z.infer<typeof GetVoicesArgsSchema>): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.speechService) {
      return {
        success: false,
        error: 'Speech service not available in this environment',
      }
    }

    try {
      let voices = this.speechService.getAvailableVoices()
      
      if (args.language) {
        voices = voices.filter(v => v.lang.startsWith(args.language!))
      }

      if (voices.length === 0) {
        return {
          success: true,
          content: 'No voices available for the specified criteria',
        }
      }

      const voiceList = voices.map((v, i) => 
        `${i + 1}. ${v.name} (${v.lang})${v.default ? ' [default]' : ''}${v.localService ? ' [local]' : ''}`
      ).join('\n')

      return {
        success: true,
        content: `Available voices:\n${voiceList}`,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get voices: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * 开始语音识别
   */
  async startListening(): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.speechService) {
      return {
        success: false,
        error: 'Speech service not available in this environment',
      }
    }

    try {
      const result = await this.speechService.startListening()
      if (result.success) {
        return {
          success: true,
          content: 'Listening for speech... (speak now)',
        }
      } else {
        return {
          success: false,
          error: result.error,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to start listening: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * 停止语音识别并获取结果
   */
  async stopListening(): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!this.speechService) {
      return {
        success: false,
        error: 'Speech service not available in this environment',
      }
    }

    const result = this.speechService.stopListening()
    
    if (result.success && result.transcript) {
      return {
        success: true,
        content: `You said: "${result.transcript}"`,
      }
    } else if (result.success) {
      return {
        success: true,
        content: 'No speech detected',
      }
    } else {
      return {
        success: false,
        error: result.error,
      }
    }
  }

  /**
   * 获取当前状态
   */
  async getStatus(): Promise<{ success: boolean; content?: string }> {
    const ttsSupported = this.speechService?.isTtsSupported() ?? false
    const sttSupported = this.speechService?.isSttSupported() ?? false
    const isSpeaking = this.speechService?.isSpeaking() ?? false
    const isListening = this.speechService?.isListening() ?? false

    return {
      success: true,
      content: [
        'Speech Service Status:',
        `  TTS (Text-to-Speech): ${ttsSupported ? '✅ Supported' : '❌ Not Supported'}`,
        `  STT (Speech-to-Text): ${sttSupported ? '✅ Supported' : '❌ Not Supported'}`,
        `  Currently Speaking: ${isSpeaking ? '🔊 Yes' : '🔇 No'}`,
        `  Currently Listening: ${isListening ? '🎤 Yes' : '🎤 No'}`,
      ].join('\n'),
    }
  }

  /**
   * 更新语音配置
   */
  async updateConfig(args: z.infer<typeof UpdateConfigArgsSchema>): Promise<{ success: boolean; content?: string }> {
    if (!this.speechService) {
      return {
        success: false,
        content: 'Speech service not available in this environment',
      }
    }

    try {
      this.speechService.updateConfig(args)
      
      // 更新默认配置
      Object.assign(this.defaultConfig, args)

      return {
        success: true,
        content: 'Speech configuration updated',
      }
    } catch (error) {
      return {
        success: false,
        content: `Failed to update config: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * 使用 Whisper API 转录音频
   */
  async transcribe(args: z.infer<typeof TranscribeArgsSchema>): Promise<{ success: boolean; content?: string; error?: string }> {
    if (!args.useWhisper || !this.speechService) {
      return {
        success: false,
        error: 'Whisper transcription requires browser environment',
      }
    }

    try {
      // 获取音频文件
      let audioBlob: Blob
      
      if (args.audioPath.startsWith('http://') || args.audioPath.startsWith('https://')) {
        const response = await fetch(args.audioPath)
        audioBlob = await response.blob()
      } else {
        const fs = await import('fs/promises')
        const path = await import('path')
        const buffer = await fs.readFile(args.audioPath)
        audioBlob = new Blob([buffer], { type: 'audio/webm' })
      }

      const result = await this.speechService.transcribeWithWhisper(audioBlob, {
        language: args.language,
      })

      if (result.success && result.transcript) {
        return {
          success: true,
          content: `Transcription: "${result.transcript}"`,
        }
      } else {
        return {
          success: false,
          error: result.error,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}

// ============ 创建语音工具 ============

const speechTool = buildTool({
  name: 'SpeechTool',
  description: '语音工具 - 提供文本转语音和语音转文本功能。支持朗读文本、语音识别、获取可用语音列表等功能。',
  
  permissions: {
    trustedPermissions: ['speech'],
    untrustedPermissions: ['speech'],
    requireConfirmation: false,
  },

  inputSchema: {
    mode: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['speak', 'stop', 'getVoices', 'startListening', 'stopListening', 'status', 'updateConfig', 'transcribe'],
        description: '语音操作类型',
      },
      // speak 参数
      text: {
        type: 'string',
        description: '要朗读的文本',
      },
      language: {
        type: 'string',
        description: '语言代码 (如 zh-CN, en-US)',
      },
      rate: {
        type: 'number',
        description: '语速 (0.1 - 10)',
      },
      pitch: {
        type: 'number',
        description: '音调 (0 - 2)',
      },
      volume: {
        type: 'number',
        description: '音量 (0 - 1)',
      },
      // stop 参数
      type: {
        type: 'string',
        enum: ['tts', 'stt', 'all'],
        description: '停止类型',
      },
      // getVoices 参数
      // startListening / stopListening 无额外参数
      // status 无参数
      // updateConfig 参数
      ttsLanguage: { type: 'string' },
      ttsRate: { type: 'number' },
      ttsPitch: { type: 'number' },
      ttsVolume: { type: 'number' },
      ttsVoice: { type: 'string' },
      sttLanguage: { type: 'string' },
      sttContinuous: { type: 'boolean' },
      sttInterimResults: { type: 'boolean' },
      useWhisper: { type: 'boolean' },
      whisperApiKey: { type: 'string' },
      // transcribe 参数
      audioPath: {
        type: 'string',
        description: '音频文件路径或 URL',
      },
    },
    required: ['action'],
    dependencies: {
      speak: ['text'],
      stop: [],
      getVoices: [],
      startListening: [],
      stopListening: [],
      status: [],
      updateConfig: [],
      transcribe: ['audioPath'],
    },
  },

  handler: async (args) => {
    const tool = new SpeechToolImpl()
    const { action, ...rest } = args as any

    switch (action) {
      case 'speak':
        return tool.speak(SpeakArgsSchema.parse(rest))
      case 'stop':
        return tool.stop(StopArgsSchema.parse(rest))
      case 'getVoices':
        return tool.getVoices(GetVoicesSchema.parse(rest))
      case 'startListening':
        return tool.startListening()
      case 'stopListening':
        return tool.stopListening()
      case 'status':
        return tool.getStatus()
      case 'updateConfig':
        return tool.updateConfig(UpdateConfigArgsSchema.parse(rest))
      case 'transcribe':
        return tool.transcribe(TranscribeArgsSchema.parse(rest))
      default:
        return {
          success: false,
          error: `Unknown action: ${action}`,
        }
    }
  },
})

// 修复：添加缺失的 schema
const GetVoicesSchema = z.object({
  language: z.string().optional(),
})

export { speechTool, SpeechToolImpl }
export type { SpeechConfig }
