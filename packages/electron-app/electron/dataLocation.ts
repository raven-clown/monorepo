import { BrowserWindow, dialog } from 'electron'
import type * as CoreModule from '@snippet/core'

export interface DataLocation {
  path: string
  isCustom: boolean
}

export function getDataLocation(core: typeof CoreModule): DataLocation {
  return {
    path: core.getStoreDir(),
    isCustom: core.isUsingCustomStoreDir(),
  }
}

export async function pickDataLocation(
  core: typeof CoreModule,
  win: BrowserWindow | null
): Promise<DataLocation | null> {
  const result = win
    ? await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
    : await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  core.setStoreDir(result.filePaths[0])
  return getDataLocation(core)
}

export function resetDataLocation(core: typeof CoreModule): DataLocation {
  core.setStoreDir(null)
  return getDataLocation(core)
}
