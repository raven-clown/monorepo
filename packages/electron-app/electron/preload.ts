import { contextBridge, ipcRenderer } from 'electron'
import type {
  Category,
  CategoryUpdateInput,
  ImportMode,
  NewCategoryInput,
  NewSnippetInput,
  Snippet,
  SnippetUpdateInput,
  StoreData,
} from '@snippet/core'
import type { Language, SettingsSnapshot, Theme } from './settings'
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
    setPinned: (id: string, pinned: boolean): Promise<Snippet> =>
      ipcRenderer.invoke('snippets:setPinned', { id, pinned }),
    onChange: (callback: (snippets: Snippet[]) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, snippets: Snippet[]) => callback(snippets)
      ipcRenderer.on('snippets:changed', listener)
      return () => {
        ipcRenderer.removeListener('snippets:changed', listener)
      }
    },
  },
  categories: {
    getAll: (): Promise<Category[]> => ipcRenderer.invoke('categories:getAll'),
    add: (input: NewCategoryInput): Promise<Category> => ipcRenderer.invoke('categories:add', input),
    update: (id: string, updates: CategoryUpdateInput): Promise<Category> =>
      ipcRenderer.invoke('categories:update', { id, updates }),
    setPinned: (id: string, pinned: boolean): Promise<Category> =>
      ipcRenderer.invoke('categories:setPinned', { id, pinned }),
    move: (id: string, parentId: string | null, index?: number): Promise<Category[]> =>
      ipcRenderer.invoke('categories:move', { id, parentId, index }),
    reorder: (id: string, direction: 'up' | 'down'): Promise<Category[]> =>
      ipcRenderer.invoke('categories:reorder', { id, direction }),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('categories:delete', id),
    onChange: (callback: (categories: Category[]) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, categories: Category[]) => callback(categories)
      ipcRenderer.on('categories:changed', listener)
      return () => {
        ipcRenderer.removeListener('categories:changed', listener)
      }
    },
  },
  settings: {
    get: (): Promise<SettingsSnapshot> => ipcRenderer.invoke('settings:get'),
    setTheme: (theme: Theme): Promise<SettingsSnapshot> => ipcRenderer.invoke('settings:setTheme', theme),
    setLanguage: (language: Language): Promise<SettingsSnapshot> =>
      ipcRenderer.invoke('settings:setLanguage', language),
    setOnboarded: (): Promise<SettingsSnapshot> => ipcRenderer.invoke('settings:setOnboarded'),
    onChange: (callback: (settings: SettingsSnapshot) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, settings: SettingsSnapshot) => callback(settings)
      ipcRenderer.on('settings:changed', listener)
      return () => {
        ipcRenderer.removeListener('settings:changed', listener)
      }
    },
  },
  windowControls: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized)
      ipcRenderer.on('window:maximized-changed', listener)
      return () => {
        ipcRenderer.removeListener('window:maximized-changed', listener)
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
    importSnippets: (snippets: unknown[], mode: ImportMode): Promise<Snippet[]> =>
      ipcRenderer.invoke('data:importSnippets', { snippets, mode }),
    importStore: (data: Partial<StoreData>, mode: ImportMode): Promise<StoreData> =>
      ipcRenderer.invoke('data:importStore', { data, mode }),
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
