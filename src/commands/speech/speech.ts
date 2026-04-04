/**
 * 语音命令 - /speech
 * 
 * 提供语音交互功能:
 * - /speech speak <text> - 朗读文本
 * - /speech listen - 开始语音识别
 * - /speech stop - 停止语音
 * - /speech voices - 列出可用语音
 * - /speech status - 显示语音服务状态
 * 
 * @module src/commands/speech/speech
 */

import type { Command } from '../../types/message.js'
import { SpeechService, type SpeechConfig } from '../../services/speech/speechService.js'

// 创建语音服务实例
let speechService: SpeechService | null = null

function getSpeechService(): SpeechService {
  if (!speechService) {
    speechService = new SpeechService()
  }
  return speechService
}

export const speechCommand: Command = {
  name: 'speech',
  aliases: ['voice', 'tts', 'stt'],
  description: '语音服务 - 文本转语音和语音转文本',
  type: 'local',
  execute(args?: string) {
    const parts = (args || '').trim().split(/\s+/)
    const action = parts[0]?.toLowerCase() || 'help'
    const restArgs = parts.slice(1).join(' ')

    switch (action) {
      case 'speak':
      case 'say':
        return handleSpeak(restArgs)
      
      case 'listen':
      case 'start':
        return handleListen()
      
      case 'stop':
        return handleStop()
      
      case 'voices':
        return handleVoices()
      
      case 'status':
        return handleStatus()
      
      case 'config':
        return handleConfig(restArgs)
      
      case 'help':
      default:
        return showHelp()
    }
  },
}

function handleSpeak(text: string): string {
  if (!text) {
    return 'Usage: /speech speak <text>\n\nExample: /speech speak Hello, how are you?'
  }

  const service = getSpeechService()
  
  if (!service.isTtsSupported()) {
    return `Text-to-Speech not supported in this environment.
    
You can try:
- Windows: Install PowerShell with System.Speech
- macOS: Use the built-in 'say' command
- Linux: Install espeak (sudo apt install espeak)`
  }

  // 同步执行朗读
  service.speak(text)
  
  return `🔊 Speaking: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`
}

function handleListen(): string {
  const service = getSpeechService()
  
  if (!service.isSttSupported()) {
    return `Speech recognition not supported in this environment.
    
You can try:
- Use Chrome browser (best support)
- Enable Web Speech API in browser settings
- Use Whisper API with /speech transcribe <file>`
  }

  service.startListening()
  
  return `🎤 Listening for speech... (say "stop" or press Ctrl+C to stop)

Tip: Speak clearly and wait for the result.`
}

function handleStop(): string {
  const service = getSpeechService()
  
  service.stop()
  service.abortListening()
  
  const transcript = service.getTranscript()
  if (transcript.final) {
    return `⏹️ Stopped listening.\n\nYou said: "${transcript.final}"`
  }
  
  return '⏹️ Stopped all speech operations.'
}

function handleVoices(): string {
  const service = getSpeechService()
  
  if (!service.isTtsSupported()) {
    return 'Speech synthesis not supported in this environment.'
  }

  const voices = service.getAvailableVoices()
  
  if (voices.length === 0) {
    return 'No voices available. Voices may still be loading...'
  }

  // 按语言分组
  const byLanguage = new Map<string, typeof voices>()
  for (const voice of voices) {
    const lang = voice.lang
    if (!byLanguage.has(lang)) {
      byLanguage.set(lang, [])
    }
    byLanguage.get(lang)!.push(voice)
  }

  const lines: string[] = [
    '🗣️ Available Voices:',
    '',
    ...Array.from(byLanguage.entries()).flatMap(([lang, langVoices]) => [
      `  ${lang}:`,
      ...langVoices.map(v => `    ${v.name}${v.default ? ' ★' : ''}`),
      '',
    ]),
    `Total: ${voices.length} voices`,
    '',
    'Use: /speech config --ttsVoice "<voice-name>"',
  ]

  return lines.join('\n')
}

function handleStatus(): string {
  const service = getSpeechService()
  
  const ttsSupported = service.isTtsSupported()
  const sttSupported = service.isSttSupported()
  const isSpeaking = service.isSpeaking()
  const isListening = service.isListening()
  const config = service.getConfig()

  const lines: string[] = [
    '🎙️ Speech Service Status',
    '========================',
    '',
    `  Text-to-Speech (TTS): ${ttsSupported ? '✅ Supported' : '❌ Not Supported'}`,
    `  Speech-to-Text (STT): ${sttSupported ? '✅ Supported' : '❌ Not Supported'}`,
    `  Currently Speaking: ${isSpeaking ? '🔊 Yes' : '🔇 No'}`,
    `  Currently Listening: ${isListening ? '🎤 Yes' : '🎤 No'}`,
    '',
    '  Configuration:',
    `    TTS Language: ${config.ttsLanguage}`,
    `    TTS Rate: ${config.ttsRate}`,
    `    TTS Pitch: ${config.ttsPitch}`,
    `    TTS Volume: ${config.ttsVolume}`,
    `    STT Language: ${config.sttLanguage}`,
    `    Whisper API: ${config.useWhisper ? '✅ Enabled' : '❌ Disabled'}`,
    '',
  ]

  return lines.join('\n')
}

function handleConfig(args: string): string {
  if (!args) {
    return showConfigHelp()
  }

  const config: Partial<SpeechConfig> = {}
  const parts = args.split(/\s+/)
  
  for (const part of parts) {
    const [key, value] = part.split('=')
    if (!key || !value) continue

    switch (key.replace(/^--/, '')) {
      case 'tts-language':
      case 'ttsLanguage':
        config.ttsLanguage = value
        break
      case 'tts-rate':
      case 'ttsRate':
        config.ttsRate = parseFloat(value)
        break
      case 'tts-pitch':
      case 'ttsPitch':
        config.ttsPitch = parseFloat(value)
        break
      case 'tts-volume':
      case 'ttsVolume':
        config.ttsVolume = parseFloat(value)
        break
      case 'tts-voice':
      case 'ttsVoice':
        config.ttsVoice = value.replace(/^["']|["']$/g, '')
        break
      case 'stt-language':
      case 'sttLanguage':
        config.sttLanguage = value
        break
      case 'whisper':
        config.useWhisper = value === 'true' || value === '1'
        break
    }
  }

  const service = getSpeechService()
  service.updateConfig(config)

  return `✅ Speech configuration updated:

${JSON.stringify(config, null, 2)}

Use /speech status to verify changes.`
}

function showHelp(): string {
  return `🎙️ Speech Commands
====================

Usage: /speech <command> [options]

Commands:
  /speech speak <text>    - Read text aloud (TTS)
  /speech listen          - Start speech recognition (STT)
  /speech stop            - Stop speaking or listening
  /speech voices          - List available TTS voices
  /speech status          - Show speech service status
  /speech config <opts>   - Update speech configuration

Configuration Options:
  --tts-language=<lang>   - Set TTS language (e.g., zh-CN, en-US)
  --tts-rate=<rate>       - Set speaking rate (0.1-10, default: 1.0)
  --tts-pitch=<pitch>     - Set pitch (0-2, default: 1.0)
  --tts-volume=<vol>      - Set volume (0-1, default: 1.0)
  --tts-voice=<name>      - Set specific voice
  --stt-language=<lang>   - Set STT language
  --whisper=true|false    - Enable/disable Whisper API

Examples:
  /speech speak Hello, how are you today?
  /speech speak Bonjour, comment allez-vous?
  /speech listen
  /speech voices
  /speech config --tts-rate=0.8 --tts-pitch=1.2`
}

function showConfigHelp(): string {
  return `🎙️ Speech Configuration
=========================

Usage: /speech config <options>

Options:
  --tts-language=<lang>    Language for text-to-speech (default: zh-CN)
  --tts-rate=<rate>        Speaking rate 0.1-10 (default: 1.0)
  --tts-pitch=<pitch>      Pitch 0-2 (default: 1.0)
  --tts-volume=<vol>       Volume 0-1 (default: 1.0)
  --tts-voice=<name>       Use specific voice (use /speech voices to list)
  --stt-language=<lang>    Language for speech recognition (default: zh-CN)
  --whisper=true|false     Use Whisper API for transcription

Examples:
  /speech config --tts-language=en-US --tts-rate=1.2
  /speech config --tts-voice="Microsoft David"
  /speech config --whisper=true

Note: Use /speech voices to see available voices in your system.`
}
