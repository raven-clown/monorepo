# Changelog

## [0.6.0] - 2026-08-12

### Added
- Code block in the snippet detail view is now editable directly — click into it and
  type, no need to open Edit first
- Branded installer: the Windows setup wizard now uses the app's icon and color
  gradient instead of the generic default NSIS look

### Changed
- Deleting a category or snippet now shows a themed confirm dialog instead of the
  native OS popup

### Fixed
- Category tree: soften the selected/drop-target highlight on the White theme (was a
  solid opaque block that visually merged with an adjacent highlighted row) and add
  a little breathing room between rows
- Removed a stray scrollbar that could appear at the bottom of the window
- Settings modal: the scrollbar could spill outside the modal's rounded corners
- GitHub Actions release publishing now creates a public release immediately instead
  of a hidden draft, and the web installer downloads the correctly named package file

## [0.5.0] - 2026-08-12

### Added
- Snippets now appear directly nested under their category in the sidebar tree, like
  files under folders in VS Code — no need to click into a category to see what's
  inside, and they're draggable onto any category to reparent them
- Right-click "New snippet" creates it instantly and drops straight into inline
  rename in the tree — no edit form pops up; language/tags/code can be filled in later

### Fixed
- Focus ring on inputs/selects replaced with a soft glow (was a harsh solid outline)
- Right-click context menu on the category tree no longer stretches across most of
  the window width

## [0.4.0] - 2026-08-12

### Added
- Real drag-and-drop in the category tree — drag a category onto another to nest it,
  or to its top/bottom edge to reorder among siblings (Move up/down still work too)
- Sidebar is resizable by dragging its right edge, like VS Code (width persists)
- Right-click "New snippet" on any category creates it immediately with placeholder
  content and opens it for editing — no form to fill in before it exists

### Changed
- Sidebar order: Category tree is now the top/primary section, above Language and Tags

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
