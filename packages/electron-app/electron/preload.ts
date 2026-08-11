import { contextBridge, ipcRenderer } from 'electron'
import type { ImportMode, NewSnippetInput, Snippet, SnippetUpdateInput } from '@snippet/core'
import type { Language, SettingsSnapshot, ThemePreference } from './settings'
import type { DataLocation } from './dataLocation'
import type { ImportPreview } from './dataTransfer'
import type { UpdateStatus } from './updater'

const api = {
  snippets: {
    getAll: (): Promise<Snippet[]> => ipcRenderer.invoke('snippets:getAll'),
    add: (input: NewSnippetInput): Promise<Snippet> => ipcRenderer.invoke('snippets:add', input),
    update: (id: string, updates: SnippetUpdateInput): Promise<Snippet> =>
      ipcRenderer.invoke('snippets:update', { id, updates }),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('snippets:delete', id),
    onChange: (callback: (snippets: Snippet[]) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, snippets: Snippet[]) => callback(snippets)
      ipcRenderer.on('snippets:changed', listener)
      return () => {
        ipcRenderer.removeListener('snippets:changed', listener)
      }
    },
  },
  settings: {
    get: (): Promise<SettingsSnapshot> => ipcRenderer.invoke('settings:get'),
    setTheme: (theme: ThemePreference): Promise<SettingsSnapshot> =>
      ipcRenderer.invoke('settings:setTheme', theme),
    setLanguage: (language: Language): Promise<SettingsSnapshot> =>
      ipcRenderer.invoke('settings:setLanguage', language),
    onChange: (callback: (settings: SettingsSnapshot) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, settings: SettingsSnapshot) => callback(settings)
      ipcRenderer.on('settings:changed', listener)
      return () => {
        ipcRenderer.removeListener('settings:changed', listener)
      }
    },
  },
  dataLocation: {
    get: (): Promise<DataLocation> => ipcRenderer.invoke('dataLocation:get'),
    pick: (): Promise<DataLocation | null> => ipcRenderer.invoke('dataLocation:pick'),
    reset: (): Promise<DataLocation> => ipcRenderer.invoke('dataLocation:reset'),
  },
  data: {
    exportAll: (): Promise<string | null> => ipcRenderer.invoke('data:exportAll'),
    exportSnippet: (id: string): Promise<string | null> => ipcRenderer.invoke('data:exportSnippet', id),
    pickImportFile: (): Promise<ImportPreview | { error: string } | null> =>
      ipcRenderer.invoke('data:pickImportFile'),
    import: (snippets: unknown[], mode: ImportMode): Promise<Snippet[]> =>
      ipcRenderer.invoke('data:import', { snippets, mode }),
  },
  updates: {
    check: (): Promise<void> => ipcRenderer.invoke('update:check'),
    download: (): Promise<void> => ipcRenderer.invoke('update:download'),
    install: (): Promise<void> => ipcRenderer.invoke('update:install'),
    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status)
      ipcRenderer.on('update:status', listener)
      return () => {
        ipcRenderer.removeListener('update:status', listener)
      }
    },
  },
}

export type SnippetManagerApi = typeof api

contextBridge.exposeInMainWorld('api', api)
