import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import chokidar from "chokidar";
import { Snippet } from "./types";

const APP_NAME = "snippet-manager";

// old location, kept only to migrate anyone who ran an earlier version
function getLegacyStoreDir(): string {
  return path.join(os.homedir(), ".snippet-manager");
}

export function getDefaultStoreDir(): string {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), APP_NAME);
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", APP_NAME);
  }
  return path.join(process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"), APP_NAME);
}

function getPointerPath(): string {
  return path.join(getDefaultStoreDir(), "location.json");
}

function readPointer(): string | null {
  try {
    const raw = fs.readFileSync(getPointerPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed.dataDir === "string" && parsed.dataDir.trim() ? parsed.dataDir : null;
  } catch {
    return null;
  }
}

export function getStoreDir(): string {
  return readPointer() ?? getDefaultStoreDir();
}

export function getStorePath(): string {
  return path.join(getStoreDir(), "data.json");
}

export function isUsingCustomStoreDir(): boolean {
  return readPointer() !== null;
}

// Moves data.json to a new directory and remembers the choice via a pointer
// file at the default location, so every process (including ones already
// running) resolves the same store dir. Pass null to move back to default.
export function setStoreDir(customDir: string | null): void {
  const defaultDir = getDefaultStoreDir();
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
  }

  const currentPath = getStorePath();
  const targetDir = customDir ?? defaultDir;
  const targetPath = path.join(targetDir, "data.json");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  if (path.resolve(currentPath) !== path.resolve(targetPath)) {
    if (fs.existsSync(currentPath)) {
      fs.copyFileSync(currentPath, targetPath);
    } else if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, JSON.stringify([], null, 2), "utf-8");
    }
  }

  const pointerPath = getPointerPath();
  if (customDir === null) {
    if (fs.existsSync(pointerPath)) {
      fs.unlinkSync(pointerPath);
    }
  } else {
    fs.writeFileSync(pointerPath, JSON.stringify({ dataDir: customDir }, null, 2), "utf-8");
  }
}

function ensureStore(): void {
  const dir = getStoreDir();
  const file = getStorePath();

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(file)) {
    const legacyFile = path.join(getLegacyStoreDir(), "data.json");
    if (fs.existsSync(legacyFile)) {
      fs.copyFileSync(legacyFile, file);
    } else {
      fs.writeFileSync(file, JSON.stringify([], null, 2), "utf-8");
    }
  }
}

export function normalizeSnippet(snippet: Partial<Snippet> & Pick<Snippet, "id">): Snippet {
  return {
    id: snippet.id,
    title: snippet.title ?? "",
    code: snippet.code ?? "",
    language: snippet.language ?? "plaintext",
    category: snippet.category ?? "",
    tags: snippet.tags ?? [],
    createdAt: snippet.createdAt ?? new Date().toISOString(),
    updatedAt: snippet.updatedAt ?? snippet.createdAt ?? new Date().toISOString(),
    pinned: snippet.pinned ?? false,
    useCount: snippet.useCount ?? 0,
    lastUsedAt: snippet.lastUsedAt ?? null,
    hiddenInVscode: snippet.hiddenInVscode ?? false,
  };
}

export function readStore(): Snippet[] {
  ensureStore();
  const raw = fs.readFileSync(getStorePath(), "utf-8");
  if (!raw.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeSnippet) : [];
  } catch {
    return [];
  }
}

export function writeStore(snippets: Snippet[]): void {
  ensureStore();
  fs.writeFileSync(getStorePath(), JSON.stringify(snippets, null, 2), "utf-8");
}

export interface StoreWatcher {
  close(): Promise<void>;
}

// Watches data.json for changes, and also watches the pointer file so that
// relocating the store dir (setStoreDir) re-points an already-running watcher
// at the new file instead of going stale.
export function watchStore(onChange: (snippets: Snippet[]) => void): StoreWatcher {
  ensureStore();

  let dataWatcher = chokidar.watch(getStorePath(), { ignoreInitial: true });
  const attachDataListeners = () => {
    dataWatcher.on("add", () => onChange(readStore()));
    dataWatcher.on("change", () => onChange(readStore()));
  };
  attachDataListeners();

  const pointerWatcher = chokidar.watch(getPointerPath(), { ignoreInitial: true });
  const resubscribe = async () => {
    await dataWatcher.close();
    ensureStore();
    dataWatcher = chokidar.watch(getStorePath(), { ignoreInitial: true });
    attachDataListeners();
    onChange(readStore());
  };
  pointerWatcher.on("add", resubscribe);
  pointerWatcher.on("change", resubscribe);
  pointerWatcher.on("unlink", resubscribe);

  return {
    close: async () => {
      await dataWatcher.close();
      await pointerWatcher.close();
    },
  };
}
