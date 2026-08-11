import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { ImportMode, NewSnippetInput, SnippetUpdateInput } from '@snippet/core'
import {
  getSettingsSnapshot,
  resolveTheme,
  setLanguage,
  setThemePreference,
  type Language,
  type ThemePreference,
} from './settings'
import { getDataLocation, pickDataLocation, resetDataLocation } from './dataLocation'
import { exportAllSnippets, exportOneSnippet, importSnippets, pickImportFile } from './dataTransfer'
import { checkForUpdates, downloadUpdate, installUpdate, setupAutoUpdater } from './updater'

const require = createRequire(import.meta.url)
// required at runtime instead of imported - rollup can't cleanly bundle this
// workspace package's cjs output into an esm chunk
const core = require('@snippet/core') as typeof import('@snippet/core')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function broadcast(channel: string, ...args: unknown[]) {
  for (const w of BrowserWindow.getAllWindows()) {
    w.webContents.send(channel, ...args)
  }
}

function registerIpcHandlers() {
  ipcMain.handle('snippets:getAll', () => core.getSnippets())

  ipcMain.handle('snippets:add', (_event, input: NewSnippetInput) => core.addSnippet(input))

  ipcMain.handle(
    'snippets:update',
    (_event, { id, updates }: { id: string; updates: SnippetUpdateInput }) =>
      core.updateSnippet(id, updates)
  )

  ipcMain.handle('snippets:delete', (_event, id: string) => core.deleteSnippet(id))

  ipcMain.handle('settings:get', () => getSettingsSnapshot())

  ipcMain.handle('settings:setTheme', (_event, theme: ThemePreference) => {
    setThemePreference(theme)
    const snapshot = getSettingsSnapshot()
    broadcast('settings:changed', snapshot)
    return snapshot
  })

  ipcMain.handle('settings:setLanguage', (_event, language: Language) => {
    setLanguage(language)
    const snapshot = getSettingsSnapshot()
    broadcast('settings:changed', snapshot)
    return snapshot
  })

  ipcMain.handle('dataLocation:get', () => getDataLocation(core))
  ipcMain.handle('dataLocation:pick', () => pickDataLocation(core, win))
  ipcMain.handle('dataLocation:reset', () => resetDataLocation(core))

  ipcMain.handle('data:exportAll', () => exportAllSnippets(core, win))
  ipcMain.handle('data:exportSnippet', (_event, id: string) => exportOneSnippet(core, win, id))
  ipcMain.handle('data:pickImportFile', () => pickImportFile(win))
  ipcMain.handle('data:import', (_event, { snippets, mode }: { snippets: unknown[]; mode: ImportMode }) =>
    importSnippets(core, snippets, mode)
  )

  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', () => downloadUpdate())
  ipcMain.handle('update:install', () => installUpdate())

  core.watchStore((snippets) => {
    broadcast('snippets:changed', snippets)
  })

  nativeTheme.on('updated', () => {
    const snapshot = getSettingsSnapshot()
    if (snapshot.theme === 'system') {
      broadcast('settings:changed', { ...snapshot, resolvedTheme: resolveTheme('system') })
    }
  })
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 720,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    backgroundColor: resolveTheme(getSettingsSnapshot().theme) === 'dark' ? '#0d0d0d' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('settings:changed', getSettingsSnapshot())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  if (app.isPackaged) {
    setupAutoUpdater()
  }
})
