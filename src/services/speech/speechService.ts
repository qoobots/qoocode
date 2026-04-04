/**
 * 语音服务 - 文本转语音 (TTS) 和语音转文本 (STT)
 * 
 * 支持的语音引擎:
 * - Web Speech API (浏览器原生)
 * - Whisper API (OpenAI) - 通过 API 调用
 * - Windows Speech API (Windows 平台)
 * 
 * @module src/services/speech/speechService
 */

import { EventEmitter } from 'events';

// ============ 类型定义 ============

export interface SpeechConfig {
  /** TTS 语言 */
  ttsLanguage?: string
  /** TTS 语速 (0.1 - 10) */
  ttsRate?: number
  /** TTS 音调 (0 - 2) */
  ttsPitch?: number
  /** TTS 音量 (0 - 1) */
  ttsVolume?: number
  /** TTS 语音名称 */
  ttsVoice?: string
  /** STT 语言 */
  sttLanguage?: string
  /** STT 连续识别 */
  sttContinuous?: boolean
  /** STT 中间结果 */
  sttInterimResults?: boolean
  /** 使用 Whisper API 进行 STT */
  useWhisper?: boolean
  /** Whisper API 密钥 */
  whisperApiKey?: string
  /** Whisper API 端点 */
  whisperEndpoint?: string
}

export interface SpeechSynthesisResult {
  success: boolean
  text?: string
  error?: string
}

export interface SpeechRecognitionResult {
  success: boolean
  transcript?: string
  isFinal?: boolean
  confidence?: number
  error?: string
}

export interface AvailableVoice {
  name: string
  lang: string
  localService: boolean
  default: boolean
}

// ============ 语音合成服务 (TTS) ============

export class SpeechSynthesisService extends EventEmitter {
  private config: Required<SpeechConfig>
  private isSpeaking: boolean = false
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private voices: SpeechSynthesisVoice[] = []

  constructor(config: SpeechConfig = {}) {
    super()
    this.config = {
      ttsLanguage: config.ttsLanguage ?? 'zh-CN',
      ttsRate: config.ttsRate ?? 1.0,
      ttsPitch: config.ttsPitch ?? 1.0,
      ttsVolume: config.ttsVolume ?? 1.0,
      ttsVoice: config.ttsVoice ?? '',
      sttLanguage: config.sttLanguage ?? 'zh-CN',
      sttContinuous: config.sttContinuous ?? false,
      sttInterimResults: config.sttInterimResults ?? true,
      useWhisper: config.useWhisper ?? false,
      whisperApiKey: config.whisperApiKey ?? process.env.OPENAI_API_KEY ?? '',
      whisperEndpoint: config.whisperEndpoint ?? 'https://api.openai.com/v1/audio/transcriptions',
    }

    // 初始化语音列表
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.loadVoices()
    }
  }

  private loadVoices(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    
    // 某些浏览器需要等待 voiceschanged 事件
    const load = () => {
      this.voices = window.speechSynthesis!.getVoices()
      this.emit('voices-loaded', this.voices)
    }
    
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
  }

  /**
   * 获取所有可用的语音
   */
  getAvailableVoices(): AvailableVoice[] {
    return this.voices.map(v => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      default: v.default,
    }))
  }

  /**
   * 获取指定语言的语音
   */
  getVoicesByLanguage(lang: string): SpeechSynthesisVoice[] {
    return this.voices.filter(v => v.lang.startsWith(lang))
  }

  /**
   * 文本转语音
   */
  async speak(text: string): Promise<SpeechSynthesisResult> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return {
        success: false,
        error: 'Speech synthesis not available in this environment',
      }
    }

    if (this.isSpeaking) {
      this.stop()
    }

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text)
        
        // 设置语音参数
        if (this.config.ttsLanguage) {
          utterance.lang = this.config.ttsLanguage
        }
        if (this.config.ttsRate) {
          utterance.rate = this.config.ttsRate
        }
        if (this.config.ttsPitch) {
          utterance.pitch = this.config.ttsPitch
        }
        if (this.config.ttsVolume) {
          utterance.volume = this.config.ttsVolume
        }

        // 选择语音
        if (this.config.ttsVoice) {
          const voice = this.voices.find(v => v.name === this.config.ttsVoice)
          if (voice) {
            utterance.voice = voice
          }
        } else {
          // 默认选择第一个匹配的语音
          const langVoices = this.getVoicesByLanguage(this.config.ttsLanguage)
          if (langVoices.length > 0) {
            utterance.voice = langVoices[0]
          }
        }

        utterance.onstart = () => {
          this.isSpeaking = true
          this.currentUtterance = utterance
          this.emit('start', text)
        }

        utterance.onend = () => {
          this.isSpeaking = false
          this.currentUtterance = null
          this.emit('end', text)
          resolve({ success: true, text })
        }

        utterance.onerror = (event) => {
          this.isSpeaking = false
          this.currentUtterance = null
          this.emit('error', event.error)
          resolve({
            success: false,
            text,
            error: `Speech synthesis error: ${event.error}`,
          })
        }

        window.speechSynthesis.speak(utterance)
      } catch (error) {
        resolve({
          success: false,
          error: `Failed to speak: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    })
  }

  /**
   * 停止语音
   */
  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    this.isSpeaking = false
    this.currentUtterance = null
    this.emit('stop')
  }

  /**
   * 暂停语音
   */
  pause(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
    }
    this.emit('pause')
  }

  /**
   * 恢复语音
   */
  resume(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
    }
    this.emit('resume')
  }

  /**
   * 检查是否正在说话
   */
  isActive(): boolean {
    return this.isSpeaking
  }

  /**
   * 检查是否支持语音合成
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SpeechConfig>): void {
    Object.assign(this.config, config)
  }
}

// ============ 语音识别服务 (STT) ============

export class SpeechRecognitionService extends EventEmitter {
  private config: Required<SpeechConfig>
  private isListening: boolean = false
  private recognition: SpeechRecognition | null = null
  private finalTranscript: string = ''
  private interimTranscript: string = ''

  constructor(config: SpeechConfig = {}) {
    super()
    this.config = {
      ttsLanguage: config.ttsLanguage ?? 'zh-CN',
      ttsRate: config.ttsRate ?? 1.0,
      ttsPitch: config.ttsPitch ?? 1.0,
      ttsVolume: config.ttsVolume ?? 1.0,
      ttsVoice: config.ttsVoice ?? '',
      sttLanguage: config.sttLanguage ?? 'zh-CN',
      sttContinuous: config.sttContinuous ?? false,
      sttInterimResults: config.sttInterimResults ?? true,
      useWhisper: config.useWhisper ?? false,
      whisperApiKey: config.whisperApiKey ?? process.env.OPENAI_API_KEY ?? '',
      whisperEndpoint: config.whisperEndpoint ?? 'https://api.openai.com/v1/audio/transcriptions',
    }

    this.initRecognition()
  }

  private initRecognition(): void {
    if (typeof window === 'undefined') return

    // 获取 SpeechRecognition 构造器
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    this.recognition = new SpeechRecognitionAPI()
    this.recognition.lang = this.config.sttLanguage
    this.recognition.continuous = this.config.sttContinuous
    this.recognition.interimResults = this.config.sttInterimResults
    this.recognition.maxAlternatives = 1

    this.recognition.onstart = () => {
      this.isListening = true
      this.finalTranscript = ''
      this.interimTranscript = ''
      this.emit('start')
    }

    this.recognition.onresult = (event) => {
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      this.finalTranscript += final
      this.interimTranscript = interim

      this.emit('result', {
        transcript: final || interim,
        isFinal: !!final,
        interim: interim,
      })

      if (final) {
        this.emit('final', final)
      }
    }

    this.recognition.onerror = (event) => {
      this.isListening = false
      this.emit('error', event.error)
    }

    this.recognition.onend = () => {
      this.isListening = false
      this.emit('end', this.finalTranscript)
    }
  }

  /**
   * 开始语音识别
   */
  async start(): Promise<{ success: boolean; error?: string }> {
    if (!this.recognition) {
      return {
        success: false,
        error: 'Speech recognition not supported in this environment',
      }
    }

    if (this.isListening) {
      return { success: true }
    }

    return new Promise((resolve) => {
      try {
        this.recognition!.start()
        resolve({ success: true })
      } catch (error) {
        resolve({
          success: false,
          error: `Failed to start recognition: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    })
  }

  /**
   * 停止语音识别
   */
  stop(): SpeechRecognitionResult {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
    this.isListening = false
    return {
      success: true,
      transcript: this.finalTranscript || this.interimTranscript,
      isFinal: true,
    }
  }

  /**
   * 中止语音识别
   */
  abort(): void {
    if (this.recognition) {
      this.recognition.abort()
    }
    this.isListening = false
    this.finalTranscript = ''
    this.interimTranscript = ''
  }

  /**
   * 获取当前转录结果
   */
  getTranscript(): { final: string; interim: string } {
    return {
      final: this.finalTranscript,
      interim: this.interimTranscript,
    }
  }

  /**
   * 检查是否正在监听
   */
  isActive(): boolean {
    return this.isListening
  }

  /**
   * 检查是否支持语音识别
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SpeechConfig>): void {
    Object.assign(this.config, config)
    
    if (this.recognition) {
      if (config.sttLanguage) this.recognition.lang = config.sttLanguage
      if (config.sttContinuous !== undefined) this.recognition.continuous = config.sttContinuous
      if (config.sttInterimResults !== undefined) this.recognition.interimResults = config.sttInterimResults
    }
  }
}

// ============ Whisper API 服务 (外部 STT) ============

export class WhisperService {
  private apiKey: string
  private endpoint: string

  constructor(config: SpeechConfig = {}) {
    this.apiKey = config.whisperApiKey ?? process.env.OPENAI_API_KEY ?? ''
    this.endpoint = config.whisperEndpoint ?? 'https://api.openai.com/v1/audio/transcriptions'
  }

  /**
   * 转录音频文件
   */
  async transcribe(
    audioBlob: Blob,
    options: {
      model?: string
      language?: string
      prompt?: string
      temperature?: number
      onProgress?: (progress: number) => void
    } = {}
  ): Promise<SpeechRecognitionResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'API key not configured',
      }
    }

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('model', options.model ?? 'whisper-1')
      
      if (options.language) {
        formData.append('language', options.language)
      }
      if (options.prompt) {
        formData.append('prompt', options.prompt)
      }
      if (options.temperature !== undefined) {
        formData.append('temperature', String(options.temperature))
      }

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        return {
          success: false,
          error: error.error?.message ?? `API error: ${response.status}`,
        }
      }

      const result = await response.json()
      return {
        success: true,
        transcript: result.text,
        isFinal: true,
      }
    } catch (error) {
      return {
        success: false,
        error: `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * 从音频文件路径转录
   */
  async transcribeFromFile(
    filePath: string,
    options: Parameters<typeof this.transcribe>[1] = {}
  ): Promise<SpeechRecognitionResult> {
    try {
      // 读取文件
      const response = await fetch(`file://${filePath}`)
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to read file: ${filePath}`,
        }
      }
      const blob = await response.blob()
      return this.transcribe(blob, options)
    } catch (error) {
      return {
        success: false,
        error: `Failed to transcribe file: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}

// ============ 统一语音服务 ============

export class SpeechService extends EventEmitter {
  private tts: SpeechSynthesisService
  private stt: SpeechRecognitionService
  private whisper: WhisperService
  private config: Required<SpeechConfig>

  constructor(config: SpeechConfig = {}) {
    super()
    
    this.config = {
      ttsLanguage: config.ttsLanguage ?? 'zh-CN',
      ttsRate: config.ttsRate ?? 1.0,
      ttsPitch: config.ttsPitch ?? 1.0,
      ttsVolume: config.ttsVolume ?? 1.0,
      ttsVoice: config.ttsVoice ?? '',
      sttLanguage: config.sttLanguage ?? 'zh-CN',
      sttContinuous: config.sttContinuous ?? false,
      sttInterimResults: config.sttInterimResults ?? true,
      useWhisper: config.useWhisper ?? false,
      whisperApiKey: config.whisperApiKey ?? process.env.OPENAI_API_KEY ?? '',
      whisperEndpoint: config.whisperEndpoint ?? 'https://api.openai.com/v1/audio/transcriptions',
    }

    this.tts = new SpeechSynthesisService(this.config)
    this.stt = new SpeechRecognitionService(this.config)
    this.whisper = new WhisperService(this.config)

    // 转发事件
    this.tts.on('start', (...args) => this.emit('tts-start', ...args))
    this.tts.on('end', (...args) => this.emit('tts-end', ...args))
    this.tts.on('error', (...args) => this.emit('tts-error', ...args))
    
    this.stt.on('start', (...args) => this.emit('stt-start', ...args))
    this.stt.on('result', (...args) => this.emit('stt-result', ...args))
    this.stt.on('final', (...args) => this.emit('stt-final', ...args))
    this.stt.on('end', (...args) => this.emit('stt-end', ...args))
    this.stt.on('error', (...args) => this.emit('stt-error', ...args))
  }

  // ============ TTS 方法 ============

  /**
   * 文本转语音
   */
  async speak(text: string): Promise<SpeechSynthesisResult> {
    return this.tts.speak(text)
  }

  /**
   * 停止语音
   */
  stop(): void {
    this.tts.stop()
  }

  /**
   * 暂停语音
   */
  pause(): void {
    this.tts.pause()
  }

  /**
   * 恢复语音
   */
  resume(): void {
    this.tts.resume()
  }

  /**
   * 检查 TTS 是否可用
   */
  isTtsSupported(): boolean {
    return this.tts.isSupported()
  }

  /**
   * 检查是否正在说话
   */
  isSpeaking(): boolean {
    return this.tts.isActive()
  }

  /**
   * 获取可用的语音列表
   */
  getAvailableVoices(): AvailableVoice[] {
    return this.tts.getAvailableVoices()
  }

  // ============ STT 方法 ============

  /**
   * 开始语音识别
   */
  async startListening(): Promise<{ success: boolean; error?: string }> {
    return this.stt.start()
  }

  /**
   * 停止语音识别
   */
  stopListening(): SpeechRecognitionResult {
    return this.stt.stop()
  }

  /**
   * 中止语音识别
   */
  abortListening(): void {
    this.stt.abort()
  }

  /**
   * 获取当前转录结果
   */
  getTranscript(): { final: string; interim: string } {
    return this.stt.getTranscript()
  }

  /**
   * 检查 STT 是否可用
   */
  isSttSupported(): boolean {
    return this.stt.isSupported()
  }

  /**
   * 检查是否正在监听
   */
  isListening(): boolean {
    return this.stt.isActive()
  }

  // ============ Whisper 方法 ============

  /**
   * 使用 Whisper API 转录音频
   */
  async transcribeWithWhisper(
    audioBlob: Blob,
    options: {
      model?: string
      language?: string
      prompt?: string
    } = {}
  ): Promise<SpeechRecognitionResult> {
    return this.whisper.transcribe(audioBlob, options)
  }

  // ============ 配置方法 ============

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SpeechConfig>): void {
    Object.assign(this.config, config)
    this.tts.updateConfig(config)
    this.stt.updateConfig(config)
  }

  /**
   * 获取当前配置
   */
  getConfig(): SpeechConfig {
    return { ...this.config }
  }
}

// ============ 类型声明 ============

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
    speechSynthesis: SpeechSynthesis
  }
}

export default SpeechService
