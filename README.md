# Snippet Manager

Code snippet manager as an npm workspaces monorepo: a shared core library, a VS Code
extension, and an Electron desktop app. Both apps read/write the same local JSON store
and stay in sync live via file watching — no server, no accounts.

## Structure

```
packages/
  core/               @snippet/core - storage, CRUD, file watching. No UI.
  vscode-extension/   Sidebar tree view + commands.
  electron-app/       Two-pane desktop app (React + Vite + Electron).
```

Both apps depend on `@snippet/core` as a workspace package and never touch the
filesystem directly — all reads/writes go through `packages/core`.

## How the sync works

Snippets live in a single JSON file at `~/.snippet-manager/data.json`
(`packages/core/src/store.ts`). `watchStore()` uses chokidar to watch that file and
calls back with the fresh snippet list whenever it changes. Both the VS Code extension
and the Electron app's main process subscribe to it on startup, so editing a snippet in
one app updates the other without a reload.

The Electron renderer never imports `@snippet/core` directly — the main process owns
the store and exposes it to the renderer over IPC (see `packages/electron-app/electron`).

## Setup

```bash
npm install
```

Installs dependencies for all three packages via npm workspaces.

## Development

### core

```bash
cd packages/core
npm run build   # tsc -> dist/
npm test        # CRUD smoke test against the real store (backs it up first)
```

### vscode-extension

```bash
cd packages/vscode-extension
npm run compile
```

Then launch the Extension Development Host from VS Code (F5), or from the command line:

```bash
code --extensionDevelopmentPath="$(pwd)"
```

Sidebar groups snippets by language, with a "Pinned" group at the top for anything
pinned. Clicking a snippet copies/inserts/opens it depending on the
`snippetManager.clickAction` setting. Snippets marked "hidden from VS Code" in the
Electron app (see below) are filtered out of the tree and search.

### electron-app

```bash
cd packages/electron-app
npm run dev
```

Two-pane layout: language/tag filters on the left, snippet list + code detail view on
the right. Settings (top-right of the header):

- **Theme** — light / dark / system, defaults to the OS theme on first launch, persisted
  after that via `electron-store`.
- **Language** — EN / TH, defaults to the OS locale on first launch, persisted after an
  explicit change.
- Per-snippet **"Hide from VS Code extension"** toggle, for snippets you don't want
  cluttering the sidebar.

## Packaging

`packages/electron-app/package.json` has an `electron-builder` config targeting
`nsis-web` (bilingual EN/TH installer picker). `.github/workflows/release.yml` builds
and publishes the installer + `.7z` app package to GitHub Releases on a `v*` tag push.

## License

MIT — see [LICENSE](LICENSE).
