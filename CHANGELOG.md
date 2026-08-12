# Changelog

## [0.3.0] - 2026-08-12

### Added
- Full visual redesign of the Electron app: iOS 26–style glass materials, blur, and
  spring motion across three themes (White / Black / Color), each sharing one accent
  color and design token set
- Custom frameless title bar with app icon, drag region, and minimize/maximize/close
  controls, replacing the native Windows title bar
- First-launch onboarding screen (hero, feature highlights, theme picker)
- Responsive layout: compact/medium/wide breakpoints, with the sidebar collapsing to a
  drawer and the list/detail panes stacking on narrow widths
- Syntax-highlighted code block with line numbers in the snippet detail view
- Nested category tree (VS Code Explorer–style): subcategories via right-click, inline
  rename, pin, move up/down, delete (children/snippets reassigned to the parent) — core
  now models categories as a real entity (id/parentId/order/pinned) instead of a flat
  string, with automatic migration from the old format
- Category picker (with inline "new category") in the Add/Edit snippet form
- App logo replaces the placeholder icon in the title bar, onboarding, and window icon

### Changed
- Theme/language pickers consolidated into Settings only (no longer duplicated in the
  header or onboarding)
- Full backup export/import now bundles categories alongside snippets so the folder
  tree round-trips

### Fixed
- Snippet list rows were center-aligned instead of left-aligned (base button style
  leaking into a column-layout row)
- Copy button no longer shows a truncated/misaligned label in compact width — icon only

## [0.2.0] - 2026-08-11

### Added
- Snippet `category` field, separate from language/tags, with a sidebar filter in the
  Electron app
- Export/import: export all snippets or a single snippet to a `.json` file, import with
  a merge-or-replace choice (Electron app → Settings → Backup & restore)
- Data storage relocation: pick a custom folder for `data.json` from the Electron app;
  every process (including ones already running) picks up the move via a pointer file
- Auto-update for the Electron app via `electron-updater` + GitHub Releases — checks on
  launch, shows a download-progress banner, prompts restart-to-install (packaged builds
  only)
- Pin/favorite snippets and usage-count tracking in the VS Code sidebar, with a
  "Pinned" group pinned to the top
- Configurable click action in the VS Code extension (`snippetManager.clickAction`:
  copy / insert at cursor / open in new editor)
- "Add Snippet (Blank)" + "Save As Snippet" commands in the VS Code extension, for
  adding a snippet without pre-selecting code
- Auto-reveal of the matching language group in the VS Code tree when switching editors
- Per-snippet "Hide from VS Code extension" toggle in the Electron app

### Changed
- Snippet data now lives in the OS-standard app-data folder (e.g. `%APPDATA%\snippet-manager`
  on Windows) instead of `~/.snippet-manager`, with automatic migration from the old
  location on first run

### Security
- Bumped `electron` (30→43), `vite` (5→8), `electron-builder` (24→26) to close known
  advisories (15 → 4 remaining, all in test-only tooling with no upstream fix yet)

## [0.1.0] - 2026-08-11

Initial development version — not yet released for real use.

### Added
- Monorepo: `@snippet/core` (CRUD + JSON store + chokidar file watching), a VS Code
  extension, and an Electron desktop app, sharing one local data store
- Live sync between the two apps via `watchStore()` — no server, no polling
- Electron app: two-pane UI, light/dark/system theme, EN/TH language (defaults to OS
  theme/locale, persists explicit choices)
- `electron-builder` `nsis-web` installer config (bilingual EN/TH picker) and a GitHub
  Actions release workflow
