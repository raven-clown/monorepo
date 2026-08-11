import { randomUUID } from "crypto";
import { NewSnippetInput, Snippet, SnippetUpdateInput } from "./types";
import { readStore, writeStore } from "./store";

export function getSnippets(): Snippet[] {
  return readStore();
}

export function addSnippet(input: NewSnippetInput): Snippet {
  const now = new Date().toISOString();
  const snippet: Snippet = {
    id: randomUUID(),
    title: input.title,
    code: input.code,
    language: input.language,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    pinned: false,
    useCount: 0,
    lastUsedAt: null,
    hiddenInVscode: input.hiddenInVscode ?? false,
  };

  const snippets = readStore();
  snippets.push(snippet);
  writeStore(snippets);

  return snippet;
}

export function updateSnippet(id: string, updates: SnippetUpdateInput): Snippet {
  const snippets = readStore();
  const index = snippets.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Snippet not found: ${id}`);
  }

  const updated: Snippet = {
    ...snippets[index],
    ...updates,
    id: snippets[index].id,
    createdAt: snippets[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  snippets[index] = updated;
  writeStore(snippets);

  return updated;
}

export function setPinned(id: string, pinned: boolean): Snippet {
  const snippets = readStore();
  const index = snippets.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Snippet not found: ${id}`);
  }

  const updated: Snippet = { ...snippets[index], pinned };
  snippets[index] = updated;
  writeStore(snippets);

  return updated;
}

export function recordUsage(id: string): Snippet {
  const snippets = readStore();
  const index = snippets.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Snippet not found: ${id}`);
  }

  const updated: Snippet = {
    ...snippets[index],
    useCount: snippets[index].useCount + 1,
    lastUsedAt: new Date().toISOString(),
  };
  snippets[index] = updated;
  writeStore(snippets);

  return updated;
}

export function deleteSnippet(id: string): boolean {
  const snippets = readStore();
  const next = snippets.filter((s) => s.id !== id);
  const deleted = next.length !== snippets.length;
  if (deleted) {
    writeStore(next);
  }
  return deleted;
}
