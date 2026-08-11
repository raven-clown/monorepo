import { contextBridge, ipcRenderer } from 'electron'
import type { NewSnippetInput, Snippet, SnippetUpdateInput } from '@snippet/core'
import type { Language, SettingsSnapshot, ThemePreference } from './settings'

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
}

export type SnippetManagerApi = typeof api

contextBridge.exposeInMainWorld('api', api)
