import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { randomUUID } from "crypto";
import chokidar from "chokidar";
import { Category, Snippet, StoreData } from "./types";

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

const EMPTY_STORE_JSON = JSON.stringify({ snippets: [], categories: [] }, null, 2);

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
      fs.writeFileSync(targetPath, EMPTY_STORE_JSON, "utf-8");
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
      fs.writeFileSync(file, EMPTY_STORE_JSON, "utf-8");
    }
  }
}

export function normalizeCategory(category: Partial<Category> & Pick<Category, "id">): Category {
  return {
    id: category.id,
    name: category.name ?? "",
    parentId: category.parentId ?? null,
    order: category.order ?? 0,
    pinned: category.pinned ?? false,
    createdAt: category.createdAt ?? new Date().toISOString(),
    updatedAt: category.updatedAt ?? category.createdAt ?? new Date().toISOString(),
  };
}

export function normalizeSnippet(snippet: Partial<Snippet> & Pick<Snippet, "id">): Snippet {
  return {
    id: snippet.id,
    title: snippet.title ?? "",
    code: snippet.code ?? "",
    language: snippet.language ?? "plaintext",
    categoryId: snippet.categoryId ?? null,
    tags: snippet.tags ?? [],
    createdAt: snippet.createdAt ?? new Date().toISOString(),
    updatedAt: snippet.updatedAt ?? snippet.createdAt ?? new Date().toISOString(),
    pinned: snippet.pinned ?? false,
    useCount: snippet.useCount ?? 0,
    lastUsedAt: snippet.lastUsedAt ?? null,
    hiddenInVscode: snippet.hiddenInVscode ?? false,
  };
}

// Handles two legacy shapes: a bare Snippet[] array (pre-category-entity
// versions), and snippets carrying a free-text `category` string instead of
// `categoryId`. Free-text categories are turned into real top-level Category
// records the first time they're seen, matched case-insensitively by name.
function migrate(raw: unknown): StoreData {
  const rawSnippets: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { snippets?: unknown })?.snippets)
      ? (raw as { snippets: unknown[] }).snippets
      : [];
  const rawCategories: unknown[] = Array.isArray((raw as { categories?: unknown })?.categories)
    ? (raw as { categories: unknown[] }).categories
    : [];

  const categories = rawCategories.map((c) => normalizeCategory(c as Partial<Category> & Pick<Category, "id">));
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c] as const));

  const snippets = rawSnippets.map((entry) => {
    const s = entry as Partial<Snippet> & Pick<Snippet, "id"> & { category?: string };
    if (!s.categoryId && typeof s.category === "string" && s.category.trim()) {
      const name = s.category.trim();
      let category = categoryByName.get(name.toLowerCase());
      if (!category) {
        const now = new Date().toISOString();
        category = {
          id: randomUUID(),
          name,
          parentId: null,
          order: categories.length,
          pinned: false,
          createdAt: now,
          updatedAt: now,
        };
        categories.push(category);
        categoryByName.set(name.toLowerCase(), category);
      }
      return normalizeSnippet({ ...s, categoryId: category.id });
    }
    return normalizeSnippet(s);
  });

  return { snippets, categories };
}

export function readStore(): StoreData {
  ensureStore();
  const raw = fs.readFileSync(getStorePath(), "utf-8");
  if (!raw.trim()) {
    return { snippets: [], categories: [] };
  }
  try {
    return migrate(JSON.parse(raw));
  } catch {
    return { snippets: [], categories: [] };
  }
}

export function writeStore(data: StoreData): void {
  ensureStore();
  fs.writeFileSync(getStorePath(), JSON.stringify(data, null, 2), "utf-8");
}

export interface StoreWatcher {
  close(): Promise<void>;
}

// Watches data.json for changes, and also watches the pointer file so that
// relocating the store dir (setStoreDir) re-points an already-running watcher
// at the new file instead of going stale.
function watchSlice<T>(select: (data: StoreData) => T, onChange: (value: T) => void): StoreWatcher {
  ensureStore();

  let dataWatcher = chokidar.watch(getStorePath(), { ignoreInitial: true });
  const attachDataListeners = () => {
    dataWatcher.on("add", () => onChange(select(readStore())));
    dataWatcher.on("change", () => onChange(select(readStore())));
  };
  attachDataListeners();

  const pointerWatcher = chokidar.watch(getPointerPath(), { ignoreInitial: true });
  const resubscribe = async () => {
    await dataWatcher.close();
    ensureStore();
    dataWatcher = chokidar.watch(getStorePath(), { ignoreInitial: true });
    attachDataListeners();
    onChange(select(readStore()));
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

export function watchStore(onChange: (snippets: Snippet[]) => void): StoreWatcher {
  return watchSlice((data) => data.snippets, onChange);
}

export function watchCategories(onChange: (categories: Category[]) => void): StoreWatcher {
  return watchSlice((data) => data.categories, onChange);
}
