# Changelog

## [1.0.0] - 2026-08-11

First release.

### Added
- Monorepo: `@snippet/core` (CRUD + JSON store + chokidar file watching), a VS Code
  extension, and an Electron desktop app, sharing one local data store
- Live sync between the two apps via `watchStore()` — no server, no polling
- Snippet fields: title, code, language, category, tags, pin, usage count
- Electron app: two-pane UI, language/category/tag filters, light/dark/system theme,
  EN/TH language (defaults to OS theme/locale, persists explicit choices)
- Electron app: export all snippets or a single snippet to `.json`; import with a
  merge-or-replace choice
- Electron app: data storage location is relocatable to any folder; every process
  (including ones already running) picks up the move via a pointer file
- Electron app: auto-update via `electron-updater` + GitHub Releases — checks on
  launch, shows a download-progress banner, prompts restart-to-install
- Electron app: per-snippet "Hide from VS Code extension" toggle
- `electron-builder` `nsis-web` installer (bilingual EN/TH picker, user-selectable
  install directory) and a GitHub Actions release workflow
- VS Code extension: sidebar grouped by language with a "Pinned" group on top, sorted
  by usage; add/delete/copy/search commands; "Add Snippet (Blank)" + "Save As Snippet"
  for adding without pre-selecting code; configurable click action
  (`snippetManager.clickAction`: copy / insert at cursor / open in new editor);
  auto-reveals the matching language group when switching editors

### Security
- `electron` 30→43, `vite` 5→8, `electron-builder` 24→26 to close known advisories
