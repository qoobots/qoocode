/**
 * AutoUpdater - 自动更新服务
 * 
 * 提供版本检查和自动更新功能 (使用 npm)
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { homedir } from 'os'
import { access } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { EventEmitter } from 'events'

const execAsync = promisify(exec)

// 当前版本 - 从 package.json 读取
export const CURRENT_VERSION = '0.1.21'

// npm 包名称
const PACKAGE_NAME = 'qoocode'

// Update channels
export type UpdateChannel = 'stable' | 'latest'

// Update event types
export type UpdateEventType = 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

// Update event
export interface UpdateEvent {
  type: UpdateEventType
  version?: string
  error?: string
  progress?: number
}

// Update progress callback
export type ProgressCallback = (event: UpdateEvent) => void

export type InstallStatus =
  | 'success'
  | 'no_permissions'
  | 'install_failed'
  | 'in_progress'
  | 'up_to_date'

export type AutoUpdaterResult = {
  version: string | null
  status: InstallStatus
  notifications?: string[]
}

/**
 * 检查全局安装权限
 */
export async function checkGlobalInstallPermissions(): Promise<{
  hasPermissions: boolean
  npmPrefix: string | null
}> {
  try {
    const prefixResult = await execAsync('npm -g config get prefix', { cwd: homedir() })
    const prefix = prefixResult.stdout.trim()

    try {
      await access(prefix, fsConstants.W_OK)
      return { hasPermissions: true, npmPrefix: prefix }
    } catch {
      return { hasPermissions: false, npmPrefix: prefix }
    }
  } catch (error) {
    return { hasPermissions: false, npmPrefix: null }
  }
}

/**
 * 获取最新版本
 */
export async function getLatestVersion(): Promise<string | null> {
  try {
    const result = await execAsync(
      `npm view ${PACKAGE_NAME}@latest version --prefer-online`,
      { cwd: homedir() }
    )
    return result.stdout.trim()
  } catch (error) {
    console.error('获取最新版本失败:', error)
    return null
  }
}

/**
 * 获取版本历史
 */
export async function getVersionHistory(limit: number = 10): Promise<string[]> {
  try {
    const result = await execAsync(
      `npm view ${PACKAGE_NAME} versions --json --prefer-online`,
      { cwd: homedir() }
    )
    const versions = JSON.parse(result.stdout.trim()) as string[]
    // 返回最新的 N 个版本
    return versions.slice(-limit).reverse()
  } catch (error) {
    console.error('获取版本历史失败:', error)
    return []
  }
}

/**
 * 比较版本
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.replace(/[^\d.]/g, '').split('.').map(Number)
  const parts2 = v2.replace(/[^\d.]/g, '').split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0
    const p2 = parts2[i] || 0
    if (p1 > p2) return 1
    if (p1 < p2) return -1
  }
  return 0
}

/**
 * 检查是否有可用更新
 */
export async function checkForUpdates(): Promise<{
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string | null
  message?: string
}> {
  const currentVersion = CURRENT_VERSION
  const latestVersion = await getLatestVersion()

  if (!latestVersion) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: null,
      message: '无法检查更新，请稍后重试',
    }
  }

  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
    message: hasUpdate
      ? `发现新版本: ${latestVersion} (当前: ${currentVersion})`
      : `已是最新版本 (${currentVersion})`,
  }
}

/**
 * 安装全局包
 */
export async function installGlobalPackage(specificVersion?: string | null): Promise<InstallStatus> {
  const { hasPermissions } = await checkGlobalInstallPermissions()

  if (!hasPermissions) {
    return 'no_permissions'
  }

  try {
    const packageSpec = specificVersion
      ? `${PACKAGE_NAME}@${specificVersion}`
      : PACKAGE_NAME

    const packageManager = process.env.PACKAGE_MANAGER || 'npm'
    
    await execAsync(`${packageManager} install -g ${packageSpec}`, {
      cwd: homedir(),
      timeout: 120000,
    })

    return 'success'
  } catch (error) {
    console.error('安装失败:', error)
    return 'install_failed'
  }
}

/**
 * 执行更新
 */
export async function performUpdate(): Promise<AutoUpdaterResult> {
  const latestVersion = await getLatestVersion()

  if (!latestVersion) {
    return {
      version: null,
      status: 'install_failed',
      notifications: ['无法获取最新版本信息'],
    }
  }

  if (compareVersions(latestVersion, CURRENT_VERSION) <= 0) {
    return {
      version: CURRENT_VERSION,
      status: 'up_to_date',
      notifications: ['已是最新版本，无需更新'],
    }
  }

  const status = await installGlobalPackage(latestVersion)

  return {
    version: latestVersion,
    status,
    notifications: status === 'success'
      ? [`成功更新到版本 ${latestVersion}`]
      : undefined,
  }
}

/**
 * 获取更新信息摘要
 */
export function getUpdateInfo(): string {
  return `
🔄 QOOCODE 更新信息

当前版本: ${CURRENT_VERSION}
npm 包名: ${PACKAGE_NAME}

更新命令:
  npm update -g ${PACKAGE_NAME}
  # 或
  bun update -g ${PACKAGE_NAME}

检查更新:
  npm view ${PACKAGE_NAME}@latest version
`
}

// Update manager class for advanced features
export class UpdateManager extends EventEmitter {
  private channel: UpdateChannel = 'stable'
  private autoCheck: boolean = true
  private checkInterval: number = 3600000 // 1 hour
  private intervalId?: NodeJS.Timeout
  private lastCheck?: Date
  private cachedLatest?: string

  constructor() {
    super()
    this.loadSettings()
  }

  /**
   * Load settings from environment/config
   */
  private loadSettings(): void {
    const channel = process.env.QOOCODE_UPDATE_CHANNEL as UpdateChannel
    if (channel && ['stable', 'latest'].includes(channel)) {
      this.channel = channel
    }

    if (process.env.QOOCODE_AUTO_UPDATE === 'false') {
      this.autoCheck = false
    }

    const interval = parseInt(process.env.QOOCODE_UPDATE_CHECK_INTERVAL || '', 10)
    if (interval > 0) {
      this.checkInterval = interval
    }
  }

  /**
   * Set update channel
   */
  setChannel(channel: UpdateChannel): void {
    this.channel = channel
    this.cachedLatest = undefined // Clear cache
  }

  /**
   * Get current channel
   */
  getChannel(): UpdateChannel {
    return this.channel
  }

  /**
   * Start auto-check timer
   */
  startAutoCheck(callback?: ProgressCallback): void {
    if (this.intervalId) {
      return // Already running
    }

    this.intervalId = setInterval(async () => {
      await this.checkForUpdates(callback)
    }, this.checkInterval)

    // Initial check
    this.checkForUpdates(callback)
  }

  /**
   * Stop auto-check timer
   */
  stopAutoCheck(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  /**
   * Check for updates with channel support
   */
  async checkForUpdates(callback?: ProgressCallback): Promise<{
    hasUpdate: boolean
    currentVersion: string
    latestVersion: string | null
    message?: string
  }> {
    this.emit('checking')
    callback?.({ type: 'checking' })

    try {
      const latestVersion: string | null = await getLatestVersion()

      this.lastCheck = new Date()
      this.cachedLatest = latestVersion

      if (!latestVersion) {
        const result = {
          hasUpdate: false,
          currentVersion: CURRENT_VERSION,
          latestVersion: null,
          message: '无法检查更新，请稍后重试',
        }
        this.emit('error', result.message)
        callback?.({ type: 'error', error: result.message })
        return result
      }

      const hasUpdate = compareVersions(latestVersion, CURRENT_VERSION) > 0

      if (hasUpdate) {
        this.emit('available', latestVersion)
        callback?.({ type: 'available', version: latestVersion })
      } else {
        this.emit('not-available')
        callback?.({ type: 'not-available' })
      }

      return {
        hasUpdate,
        currentVersion: CURRENT_VERSION,
        latestVersion,
        message: hasUpdate
          ? `发现新版本: ${latestVersion} (当前: ${CURRENT_VERSION})`
          : `已是最新版本 (${CURRENT_VERSION})`,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '检查更新失败'
      this.emit('error', message)
      callback?.({ type: 'error', error: message })
      return {
        hasUpdate: false,
        currentVersion: CURRENT_VERSION,
        latestVersion: null,
        message,
      }
    }
  }

  /**
   * Download and install update with progress
   */
  async downloadAndInstall(callback?: ProgressCallback): Promise<AutoUpdaterResult> {
    callback?.({ type: 'downloading', progress: 0 })

    try {
      // First check for updates
      const updateInfo = await this.checkForUpdates()
      
      if (!updateInfo.hasUpdate || !updateInfo.latestVersion) {
        return {
          version: CURRENT_VERSION,
          status: 'up_to_date',
          notifications: ['已是最新版本，无需更新'],
        }
      }

      callback?.({ type: 'downloading', progress: 30 })

      // Perform update
      const result = await performUpdate()
      
      if (result.status === 'success') {
        callback?.({ type: 'downloaded', version: result.version || undefined })
      }

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新失败'
      callback?.({ type: 'error', error: message })
      return {
        version: null,
        status: 'install_failed',
        notifications: [message],
      }
    }
  }

  /**
   * Get update status
   */
  getStatus(): {
    currentVersion: string
    channel: UpdateChannel
    autoCheck: boolean
    lastCheck?: Date
    cachedLatest?: string
  } {
    return {
      currentVersion: CURRENT_VERSION,
      channel: this.channel,
      autoCheck: this.autoCheck,
      lastCheck: this.lastCheck,
      cachedLatest: this.cachedLatest,
    }
  }

  /**
   * Get version release notes
   */
  async getReleaseNotes(version?: string): Promise<string> {
    const targetVersion = version || this.cachedLatest || CURRENT_VERSION
    
    try {
      const result = await execAsync(
        `npm view ${PACKAGE_NAME}@${targetVersion} description --prefer-online`,
        { cwd: homedir() }
      )
      return result.stdout.trim() || 'No release notes available'
    } catch {
      return 'Unable to fetch release notes'
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current package info
      const result = await execAsync(
        `npm list -g ${PACKAGE_NAME} --depth=0 --json`,
        { cwd: homedir() }
      )
      const pkgInfo = JSON.parse(result.stdout)
      const currentVersion = pkgInfo.dependencies?.[PACKAGE_NAME]?.version

      if (!currentVersion) {
        return { success: false, error: '无法确定当前版本' }
      }

      // List available versions
      const versions = await getVersionHistory(20)
      const currentIndex = versions.indexOf(currentVersion)

      if (currentIndex <= 0 || versions.length < 2) {
        return { success: false, error: '没有可回滚的版本' }
      }

      // Install previous version
      const previousVersion = versions[currentIndex - 1]
      const { hasPermissions } = await checkGlobalInstallPermissions()

      if (!hasPermissions) {
        return { success: false, error: '需要管理员权限' }
      }

      const status = await installGlobalPackage(previousVersion)
      
      if (status === 'success') {
        return { success: true }
      } else {
        return { success: false, error: `安装失败: ${status}` }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '回滚失败' }
    }
  }
}

// Singleton instance
let updateManager: UpdateManager | null = null

export function getUpdateManager(): UpdateManager {
  if (!updateManager) {
    updateManager = new UpdateManager()
  }
  return updateManager
}

// Convenience functions
export function setUpdateChannel(channel: UpdateChannel): void {
  getUpdateManager().setChannel(channel)
}

export function startAutoUpdateCheck(callback?: ProgressCallback): void {
  getUpdateManager().startAutoCheck(callback)
}

export function stopAutoUpdateCheck(): void {
  getUpdateManager().stopAutoCheck()
}

export async function checkAndInstallUpdate(callback?: ProgressCallback): Promise<AutoUpdaterResult> {
  return getUpdateManager().downloadAndInstall(callback)
}

export async function getVersionReleaseNotes(version?: string): Promise<string> {
  return getUpdateManager().getReleaseNotes(version)
}

export async function rollbackVersion(): Promise<{ success: boolean; error?: string }> {
  return getUpdateManager().rollback()
}

export function getUpdaterStatus() {
  return getUpdateManager().getStatus()
}
