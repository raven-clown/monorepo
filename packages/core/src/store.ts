import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import chokidar, { FSWatcher } from "chokidar";
import { Snippet } from "./types";

export function getStoreDir(): string {
  return path.join(os.homedir(), ".snippet-manager");
}

export function getStorePath(): string {
  return path.join(getStoreDir(), "data.json");
}

function ensureStore(): void {
  const dir = getStoreDir();
  const file = getStorePath();

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([], null, 2), "utf-8");
  }
}

function normalize(snippet: Partial<Snippet> & Pick<Snippet, "id">): Snippet {
  return {
    id: snippet.id,
    title: snippet.title ?? "",
    code: snippet.code ?? "",
    language: snippet.language ?? "plaintext",
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
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch {
    return [];
  }
}

export function writeStore(snippets: Snippet[]): void {
  ensureStore();
  fs.writeFileSync(getStorePath(), JSON.stringify(snippets, null, 2), "utf-8");
}

export function watchStore(onChange: (snippets: Snippet[]) => void): FSWatcher {
  ensureStore();
  const watcher = chokidar.watch(getStorePath(), {
    ignoreInitial: true,
  });

  watcher.on("add", () => onChange(readStore()));
  watcher.on("change", () => onChange(readStore()));

  return watcher;
}
