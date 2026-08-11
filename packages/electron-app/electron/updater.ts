import { createRequire } from 'node:module'
import { BrowserWindow } from 'electron'

const require = createRequire(import.meta.url)
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater')

export type UpdateStatus =
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'not-available' }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }

function broadcast(update: UpdateStatus) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:status', update)
  }
}

export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => broadcast({ status: 'checking' }))
  autoUpdater.on('update-available', (info) => broadcast({ status: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => broadcast({ status: 'not-available' }))
  autoUpdater.on('download-progress', (progress) =>
    broadcast({ status: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => broadcast({ status: 'downloaded', version: info.version }))
  autoUpdater.on('error', (err) => broadcast({ status: 'error', message: err.message }))

  autoUpdater.checkForUpdates().catch((err) => broadcast({ status: 'error', message: err.message }))
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch((err) => broadcast({ status: 'error', message: err.message }))
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch((err) => broadcast({ status: 'error', message: err.message }))
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
