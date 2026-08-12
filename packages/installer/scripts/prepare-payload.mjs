import { existsSync, readdirSync, rmSync, cpSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appReleaseDir = path.join(__dirname, '..', '..', 'electron-app', 'release')
const payloadDir = path.join(__dirname, '..', 'payload')

if (!existsSync(appReleaseDir)) {
  console.error(`electron-app release directory not found: ${appReleaseDir}`)
  console.error('Run "npm run build:unpacked --workspace=electron-app" first.')
  process.exit(1)
}

const versionDirs = readdirSync(appReleaseDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()

const latest = versionDirs.at(-1)
if (!latest) {
  console.error(`No version directories found under ${appReleaseDir}`)
  process.exit(1)
}

const unpackedDir = path.join(appReleaseDir, latest, 'win-unpacked')
if (!existsSync(unpackedDir)) {
  console.error(`win-unpacked not found: ${unpackedDir}`)
  console.error('Run "npm run build:unpacked --workspace=electron-app" first.')
  process.exit(1)
}

rmSync(payloadDir, { recursive: true, force: true })
cpSync(unpackedDir, payloadDir, { recursive: true })
console.log(`Copied payload from ${unpackedDir} -> ${payloadDir}`)
