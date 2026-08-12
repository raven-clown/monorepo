import { contextBridge, ipcRenderer } from 'electron'
import type { InstallOptions, UninstallOptions } from './install'

export interface InstallerInfo {
  mode: 'install' | 'uninstall'
  version: string
  productName: string
  defaultInstallDir: string
}

export type InstallResult = { ok: true; installDir: string } | { ok: false; message: string }
export type UninstallResult = { ok: true } | { ok: false; message: string }

const api = {
  getInfo: (): Promise<InstallerInfo> => ipcRenderer.invoke('installer:getInfo'),
  pickDirectory: (): Promise<string | null> => ipcRenderer.invoke('installer:pickDirectory'),
  install: (options: InstallOptions): Promise<InstallResult> => ipcRenderer.invoke('installer:install', options),
  launchAndClose: (installDir: string): Promise<void> => ipcRenderer.invoke('installer:launchAndClose', installDir),
  uninstall: (options: UninstallOptions): Promise<UninstallResult> =>
    ipcRenderer.invoke('installer:uninstall', options),
  close: (): Promise<void> => ipcRenderer.invoke('installer:close'),
  onProgress: (callback: (progress: { done: number; total: number }) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: { done: number; total: number }) =>
      callback(progress)
    ipcRenderer.on('installer:progress', listener)
    return () => ipcRenderer.removeListener('installer:progress', listener)
  },
  onUninstallProgress: (callback: (stage: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, stage: string) => callback(stage)
    ipcRenderer.on('installer:uninstall-progress', listener)
    return () => ipcRenderer.removeListener('installer:uninstall-progress', listener)
  },
}

export type InstallerApi = typeof api

contextBridge.exposeInMainWorld('installer', api)
