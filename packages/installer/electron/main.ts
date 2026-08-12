import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  getDefaultInstallDir,
  launchApp,
  needsTempRelaunch,
  relaunchFromTemp,
  runInstall,
  runUninstall,
  type InstallOptions,
  type UninstallOptions,
} from './install'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const args = process.argv.slice(app.isPackaged ? 1 : 2)
const isUninstall = args.includes('--uninstall')
const installDirArg = args.find((a) => a.startsWith('--install-dir='))?.slice('--install-dir='.length)

let win: BrowserWindow | null

function broadcast(channel: string, ...payload: unknown[]) {
  win?.webContents.send(channel, ...payload)
}

function registerIpcHandlers() {
  ipcMain.handle('installer:getInfo', () => ({
    mode: isUninstall ? 'uninstall' : 'install',
    version: app.getVersion(),
    productName: 'Snippet Manager',
    defaultInstallDir: installDirArg ?? getDefaultInstallDir(),
  }))

  ipcMain.handle('installer:pickDirectory', async () => {
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return path.join(result.filePaths[0], 'Snippet Manager')
  })

  ipcMain.handle('installer:install', async (_event, options: InstallOptions) => {
    try {
      await runInstall(options, (done, total) => broadcast('installer:progress', { done, total }))
      return { ok: true as const, installDir: options.installDir }
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('installer:launchAndClose', (_event, installDir: string) => {
    launchApp(installDir)
    app.quit()
  })

  ipcMain.handle('installer:uninstall', async (_event, options: UninstallOptions) => {
    if (needsTempRelaunch(options.installDir)) {
      await relaunchFromTemp(options.installDir)
      return { ok: true as const }
    }
    try {
      await runUninstall(options, (stage) => broadcast('installer:uninstall-progress', stage))
      return { ok: true as const }
    } catch (err) {
      return { ok: false as const, message: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('installer:close', () => app.quit())
}

function createWindow() {
  win = new BrowserWindow({
    width: 460,
    height: 620,
    resizable: false,
    frame: false,
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
    backgroundColor: '#e0735a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  app.quit()
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})
