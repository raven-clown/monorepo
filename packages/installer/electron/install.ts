import { app } from 'electron'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs/promises'
import path from 'node:path'

// The payload we copy includes electron-app's own app.asar. Electron's fs
// patches special-case any path touching *.asar, which breaks a plain
// byte-for-byte copy of that file - disable the interception entirely.
process.noAsar = true

const execFileAsync = promisify(execFile)

export const PRODUCT_NAME = 'Snippet Manager'
export const APP_EXE = `${PRODUCT_NAME}.exe`
export const UNINSTALL_EXE = `Uninstall ${PRODUCT_NAME}.exe`
const REGISTRY_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\SnippetManager'
const USER_DATA_DIR = path.join(app.getPath('appData'), 'snippet-manager')

export function getPayloadDir(): string {
  return app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(process.env.APP_ROOT, 'payload')
}

export function getDefaultInstallDir(): string {
  const localAppData = process.env.LOCALAPPDATA ?? path.join(app.getPath('appData'), '..', 'Local')
  return path.join(localAppData, 'Programs', PRODUCT_NAME)
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full)))
    } else {
      files.push(full)
    }
  }
  return files
}

async function copyWithProgress(
  srcDir: string,
  destDir: string,
  onProgress: (done: number, total: number) => void
): Promise<void> {
  const files = await listFilesRecursive(srcDir)
  const total = files.length
  let done = 0
  for (const file of files) {
    const rel = path.relative(srcDir, file)
    const dest = path.join(destDir, rel)
    await fs.mkdir(path.dirname(dest), { recursive: true })
    await fs.copyFile(file, dest)
    done += 1
    onProgress(done, total)
  }
}

async function createShortcut(shortcutPath: string, targetExe: string, workingDir: string): Promise<void> {
  const script = [
    '$WshShell = New-Object -ComObject WScript.Shell',
    `$Shortcut = $WshShell.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')`,
    `$Shortcut.TargetPath = '${targetExe.replace(/'/g, "''")}'`,
    `$Shortcut.WorkingDirectory = '${workingDir.replace(/'/g, "''")}'`,
    `$Shortcut.IconLocation = '${targetExe.replace(/'/g, "''")},0'`,
    '$Shortcut.Save()',
  ].join('; ')
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script])
}

async function removeShortcut(shortcutPath: string): Promise<void> {
  await fs.rm(shortcutPath, { force: true })
}

function startMenuShortcutPath(): string {
  return path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', `${PRODUCT_NAME}.lnk`)
}

function desktopShortcutPath(): string {
  return path.join(app.getPath('desktop'), `${PRODUCT_NAME}.lnk`)
}

async function writeUninstallRegistry(installDir: string, version: string, sizeKb: number): Promise<void> {
  const exePath = path.join(installDir, APP_EXE)
  const uninstallCmd = `"${path.join(installDir, UNINSTALL_EXE)}" --uninstall --install-dir="${installDir}"`
  const entries: [string, 'REG_SZ' | 'REG_DWORD', string][] = [
    ['DisplayName', 'REG_SZ', PRODUCT_NAME],
    ['DisplayIcon', 'REG_SZ', exePath],
    ['DisplayVersion', 'REG_SZ', version],
    ['Publisher', 'REG_SZ', 'SNOWFLEX'],
    ['InstallLocation', 'REG_SZ', installDir],
    ['UninstallString', 'REG_SZ', uninstallCmd],
    ['NoModify', 'REG_DWORD', '1'],
    ['NoRepair', 'REG_DWORD', '1'],
    ['EstimatedSize', 'REG_DWORD', String(sizeKb)],
  ]
  for (const [name, type, value] of entries) {
    await execFileAsync('reg', ['add', REGISTRY_KEY, '/v', name, '/t', type, '/d', value, '/f'])
  }
}

async function removeUninstallRegistry(): Promise<void> {
  await execFileAsync('reg', ['delete', REGISTRY_KEY, '/f']).catch(() => undefined)
}

async function dirSizeBytes(dir: string): Promise<number> {
  const files = await listFilesRecursive(dir)
  let total = 0
  for (const file of files) {
    const stat = await fs.stat(file)
    total += stat.size
  }
  return total
}

export interface InstallOptions {
  installDir: string
  desktopShortcut: boolean
}

export async function runInstall(
  options: InstallOptions,
  onProgress: (done: number, total: number) => void
): Promise<void> {
  const payloadDir = getPayloadDir()
  await fs.mkdir(options.installDir, { recursive: true })
  await copyWithProgress(payloadDir, options.installDir, onProgress)

  const selfExe = app.isPackaged ? process.execPath : undefined
  if (selfExe) {
    await fs.copyFile(selfExe, path.join(options.installDir, UNINSTALL_EXE)).catch(() => undefined)
  }

  const exePath = path.join(options.installDir, APP_EXE)
  await createShortcut(startMenuShortcutPath(), exePath, options.installDir)
  if (options.desktopShortcut) {
    await createShortcut(desktopShortcutPath(), exePath, options.installDir)
  }

  const sizeBytes = await dirSizeBytes(options.installDir).catch(() => 0)
  await writeUninstallRegistry(options.installDir, app.getVersion(), Math.round(sizeBytes / 1024))
}

export function launchApp(installDir: string): void {
  const exePath = path.join(installDir, APP_EXE)
  const child = spawn(exePath, [], { detached: true, stdio: 'ignore' })
  child.unref()
}

export interface UninstallOptions {
  installDir: string
  deleteUserData: boolean
}

// Relaunches from a temp copy so the running exe (inside installDir) isn't deleting itself.
export function needsTempRelaunch(installDir: string): boolean {
  const normalizedExe = path.normalize(process.execPath).toLowerCase()
  const normalizedInstall = path.normalize(installDir).toLowerCase()
  return normalizedExe.startsWith(normalizedInstall)
}

export async function relaunchFromTemp(installDir: string): Promise<never> {
  const tmpExe = path.join(app.getPath('temp'), `snippet-manager-uninstall-${Date.now()}.exe`)
  await fs.copyFile(process.execPath, tmpExe)
  const child = spawn(tmpExe, ['--uninstall', `--install-dir=${installDir}`], {
    detached: true,
    stdio: 'ignore',
  })
  child.unref()
  app.exit(0)
  throw new Error('unreachable')
}

export async function runUninstall(
  options: UninstallOptions,
  onProgress: (message: string) => void
): Promise<void> {
  onProgress('shortcuts')
  await removeShortcut(startMenuShortcutPath())
  await removeShortcut(desktopShortcutPath())

  onProgress('registry')
  await removeUninstallRegistry()

  if (options.deleteUserData) {
    onProgress('data')
    await fs.rm(USER_DATA_DIR, { recursive: true, force: true }).catch(() => undefined)
  }

  onProgress('files')
  await fs.rm(options.installDir, { recursive: true, force: true }).catch(() => undefined)
}
