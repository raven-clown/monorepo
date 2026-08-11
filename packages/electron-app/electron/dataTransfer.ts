import { BrowserWindow, dialog } from 'electron'
import * as fs from 'node:fs'
import type * as CoreModule from '@snippet/core'
import type { ImportMode, Snippet } from '@snippet/core'

function slugify(title: string): string {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || 'snippet'
}

async function saveJson(win: BrowserWindow | null, defaultName: string, data: unknown): Promise<string | null> {
  const result = win
    ? await dialog.showSaveDialog(win, { defaultPath: defaultName, filters: [{ name: 'JSON', extensions: ['json'] }] })
    : await dialog.showSaveDialog({ defaultPath: defaultName, filters: [{ name: 'JSON', extensions: ['json'] }] })

  if (result.canceled || !result.filePath) {
    return null
  }

  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
  return result.filePath
}

export async function exportAllSnippets(core: typeof CoreModule, win: BrowserWindow | null): Promise<string | null> {
  return saveJson(win, 'snippets-backup.json', core.exportSnippets())
}

export async function exportOneSnippet(
  core: typeof CoreModule,
  win: BrowserWindow | null,
  id: string
): Promise<string | null> {
  const [snippet] = core.exportSnippets([id])
  if (!snippet) {
    return null
  }
  return saveJson(win, `${slugify(snippet.title)}.json`, [snippet])
}

export interface ImportPreview {
  filePath: string
  count: number
  snippets: unknown[]
}

export async function pickImportFile(
  win: BrowserWindow | null
): Promise<ImportPreview | { error: string } | null> {
  const result = win
    ? await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })
    : await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'JSON', extensions: ['json'] }] })

  if (result.canceled || !result.filePaths[0]) {
    return null
  }

  const filePath = result.filePaths[0]
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed : [parsed]
    return { filePath, count: list.length, snippets: list }
  } catch {
    return { error: 'Could not read that file as snippet JSON.' }
  }
}

export function importSnippets(core: typeof CoreModule, snippets: unknown[], mode: ImportMode): Snippet[] {
  return core.importSnippets(snippets, mode)
}
