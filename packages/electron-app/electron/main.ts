import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type {
  CategoryUpdateInput,
  ImportMode,
  NewCategoryInput,
  NewSnippetInput,
  SnippetUpdateInput,
  StoreData,
} from '@snippet/core'
import {
  getSettingsSnapshot,
  setLanguage,
  setOnboarded,
  setTheme,
  type Language,
  type Theme,
} from './settings'
import { getDataLocation, pickDataLocation, resetDataLocation } from './dataLocation'
import { exportAllData, exportOneSnippet, importSnippets, importStore, pickImportFile } from './dataTransfer'
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

  ipcMain.handle('snippets:setPinned', (_event, { id, pinned }: { id: string; pinned: boolean }) =>
    core.setPinned(id, pinned)
  )

  ipcMain.handle('categories:getAll', () => core.getCategories())
  ipcMain.handle('categories:add', (_event, input: NewCategoryInput) => core.addCategory(input))
  ipcMain.handle(
    'categories:update',
    (_event, { id, updates }: { id: string; updates: CategoryUpdateInput }) => core.updateCategory(id, updates)
  )
  ipcMain.handle('categories:setPinned', (_event, { id, pinned }: { id: string; pinned: boolean }) =>
    core.setCategoryPinned(id, pinned)
  )
  ipcMain.handle(
    'categories:move',
    (_event, { id, parentId, index }: { id: string; parentId: string | null; index?: number }) =>
      core.moveCategory(id, parentId, index)
  )
  ipcMain.handle('categories:reorder', (_event, { id, direction }: { id: string; direction: 'up' | 'down' }) =>
    core.reorderCategory(id, direction)
  )
  ipcMain.handle('categories:delete', (_event, id: string) => core.deleteCategory(id))

  ipcMain.handle('settings:get', () => getSettingsSnapshot())

  ipcMain.handle('settings:setTheme', (_event, theme: Theme) => {
    setTheme(theme)
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

  ipcMain.handle('settings:setOnboarded', () => {
    setOnboarded()
    const snapshot = getSettingsSnapshot()
    broadcast('settings:changed', snapshot)
    return snapshot
  })

  ipcMain.handle('window:minimize', () => win?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.handle('window:close', () => win?.close())
  ipcMain.handle('window:isMaximized', () => win?.isMaximized() ?? false)

  ipcMain.handle('dataLocation:get', () => getDataLocation(core))
  ipcMain.handle('dataLocation:pick', () => pickDataLocation(core, win))
  ipcMain.handle('dataLocation:reset', () => resetDataLocation(core))

  ipcMain.handle('data:exportAll', () => exportAllData(core, win))
  ipcMain.handle('data:exportSnippet', (_event, id: string) => exportOneSnippet(core, win, id))
  ipcMain.handle('data:pickImportFile', () => pickImportFile(win))
  ipcMain.handle(
    'data:importSnippets',
    (_event, { snippets, mode }: { snippets: unknown[]; mode: ImportMode }) => importSnippets(core, snippets, mode)
  )
  ipcMain.handle(
    'data:importStore',
    (_event, { data, mode }: { data: Partial<StoreData>; mode: ImportMode }) => importStore(core, data, mode)
  )

  ipcMain.handle('update:check', () => checkForUpdates())
  ipcMain.handle('update:download', () => downloadUpdate())
  ipcMain.handle('update:install', () => installUpdate())

  core.watchStore((snippets) => {
    broadcast('snippets:changed', snippets)
  })

  core.watchCategories((categories) => {
    broadcast('categories:changed', categories)
  })
}

const THEME_BG: Record<Theme, string> = {
  white: '#fcfcfa',
  black: '#0d0e12',
  color: '#a8455a',
}

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 640,
    minHeight: 480,
    frame: false,
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    backgroundColor: THEME_BG[getSettingsSnapshot().theme],
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('settings:changed', getSettingsSnapshot())
  })

  win.on('maximize', () => broadcast('window:maximized-changed', true))
  win.on('unmaximize', () => broadcast('window:maximized-changed', false))

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
