import { randomUUID } from "crypto";
import {
  Category,
  CategoryUpdateInput,
  ImportMode,
  NewCategoryInput,
  NewSnippetInput,
  Snippet,
  SnippetUpdateInput,
  StoreData,
} from "./types";
import { normalizeSnippet, readStore, writeStore } from "./store";

export function getSnippets(): Snippet[] {
  return readStore().snippets;
}

export function addSnippet(input: NewSnippetInput): Snippet {
  const now = new Date().toISOString();
  const snippet: Snippet = {
    id: randomUUID(),
    title: input.title,
    code: input.code,
    language: input.language,
    categoryId: input.categoryId ?? null,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    pinned: false,
    useCount: 0,
    lastUsedAt: null,
    hiddenInVscode: input.hiddenInVscode ?? false,
  };

  const store = readStore();
  store.snippets.push(snippet);
  writeStore(store);

  return snippet;
}

export function updateSnippet(id: string, updates: SnippetUpdateInput): Snippet {
  const store = readStore();
  const index = store.snippets.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Snippet not found: ${id}`);
  }

  const updated: Snippet = {
    ...store.snippets[index],
    ...updates,
    id: store.snippets[index].id,
    createdAt: store.snippets[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  store.snippets[index] = updated;
  writeStore(store);

  return updated;
}

export function setPinned(id: string, pinned: boolean): Snippet {
  const store = readStore();
  const index = store.snippets.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Snippet not found: ${id}`);
  }

  const updated: Snippet = { ...store.snippets[index], pinned };
  store.snippets[index] = updated;
  writeStore(store);

  return updated;
}

export function recordUsage(id: string): Snippet {
  const store = readStore();
  const index = store.snippets.findIndex((s) => s.id === id);
  if (index === -1) {
    throw new Error(`Snippet not found: ${id}`);
  }

  const updated: Snippet = {
    ...store.snippets[index],
    useCount: store.snippets[index].useCount + 1,
    lastUsedAt: new Date().toISOString(),
  };
  store.snippets[index] = updated;
  writeStore(store);

  return updated;
}

export function deleteSnippet(id: string): boolean {
  const store = readStore();
  const next = store.snippets.filter((s) => s.id !== id);
  const deleted = next.length !== store.snippets.length;
  if (deleted) {
    writeStore({ ...store, snippets: next });
  }
  return deleted;
}

export function exportSnippets(ids?: string[]): Snippet[] {
  const { snippets } = readStore();
  return ids ? snippets.filter((s) => ids.includes(s.id)) : snippets;
}

export function importSnippets(imported: unknown[], mode: ImportMode = "merge"): Snippet[] {
  const sanitized = imported
    .filter((s): s is Partial<Snippet> => typeof s === "object" && s !== null)
    .map((s) => normalizeSnippet({ ...s, id: (s as Partial<Snippet>).id ?? randomUUID() }));

  const store = readStore();

  if (mode === "replace") {
    const next = { ...store, snippets: sanitized };
    writeStore(next);
    return sanitized;
  }

  const byId = new Map(store.snippets.map((s) => [s.id, s] as const));
  for (const s of sanitized) {
    byId.set(s.id, s);
  }
  const merged = Array.from(byId.values());
  writeStore({ ...store, snippets: merged });
  return merged;
}

export function exportStore(): StoreData {
  return readStore();
}

export function importStore(imported: Partial<StoreData>, mode: ImportMode = "merge"): StoreData {
  const incomingCategories = Array.isArray(imported.categories) ? imported.categories : [];
  const incomingSnippets = Array.isArray(imported.snippets) ? imported.snippets : [];

  if (mode === "replace") {
    const next: StoreData = { snippets: incomingSnippets, categories: incomingCategories };
    writeStore(next);
    return next;
  }

  const store = readStore();
  const categoryById = new Map(store.categories.map((c) => [c.id, c] as const));
  for (const c of incomingCategories) categoryById.set(c.id, c);
  const snippetById = new Map(store.snippets.map((s) => [s.id, s] as const));
  for (const s of incomingSnippets) snippetById.set(s.id, s);

  const merged: StoreData = {
    categories: Array.from(categoryById.values()),
    snippets: Array.from(snippetById.values()),
  };
  writeStore(merged);
  return merged;
}

// ---------- Categories ----------

export function getCategories(): Category[] {
  return readStore().categories;
}

export function addCategory(input: NewCategoryInput): Category {
  const store = readStore();
  const parentId = input.parentId ?? null;
  const siblings = store.categories.filter((c) => c.parentId === parentId);
  const now = new Date().toISOString();
  const category: Category = {
    id: randomUUID(),
    name: input.name,
    parentId,
    order: siblings.length,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  store.categories.push(category);
  writeStore(store);
  return category;
}

export function updateCategory(id: string, updates: CategoryUpdateInput): Category {
  const store = readStore();
  const index = store.categories.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error(`Category not found: ${id}`);
  }
  const updated: Category = {
    ...store.categories[index],
    ...updates,
    id: store.categories[index].id,
    createdAt: store.categories[index].createdAt,
    updatedAt: new Date().toISOString(),
  };
  store.categories[index] = updated;
  writeStore(store);
  return updated;
}

export function setCategoryPinned(id: string, pinned: boolean): Category {
  const store = readStore();
  const index = store.categories.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error(`Category not found: ${id}`);
  }
  const updated: Category = { ...store.categories[index], pinned };
  store.categories[index] = updated;
  writeStore(store);
  return updated;
}

function isDescendant(categories: Category[], candidateId: string, ancestorId: string): boolean {
  let current = categories.find((c) => c.id === candidateId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = categories.find((c) => c.id === current!.parentId);
  }
  return false;
}

// Reparents and/or repositions a category among the siblings of its
// (possibly new) parent. Pass no index to append at the end.
export function moveCategory(id: string, parentId: string | null, index?: number): Category[] {
  const store = readStore();
  const movingIndex = store.categories.findIndex((c) => c.id === id);
  if (movingIndex === -1) {
    throw new Error(`Category not found: ${id}`);
  }
  if (parentId !== null) {
    if (parentId === id || isDescendant(store.categories, parentId, id)) {
      throw new Error("Cannot move a category into itself or its own descendant");
    }
  }

  const moving = { ...store.categories[movingIndex] };
  const oldParentId = moving.parentId;

  const oldSiblings = store.categories
    .filter((c) => c.parentId === oldParentId && c.id !== id)
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, order: i }));

  const newSiblings = store.categories
    .filter((c) => c.parentId === parentId && c.id !== id)
    .sort((a, b) => a.order - b.order);
  const insertAt = index === undefined ? newSiblings.length : Math.max(0, Math.min(index, newSiblings.length));
  newSiblings.splice(insertAt, 0, moving);
  const renumberedNewSiblings = newSiblings.map((c, i) => ({ ...c, order: i, parentId }));

  const updatedById = new Map<string, Category>();
  for (const c of oldSiblings) updatedById.set(c.id, c);
  for (const c of renumberedNewSiblings) updatedById.set(c.id, { ...c, updatedAt: new Date().toISOString() });

  store.categories = store.categories.map((c) => updatedById.get(c.id) ?? c);
  writeStore(store);
  return store.categories;
}

// Moves a category up/down among its siblings by one position.
export function reorderCategory(id: string, direction: "up" | "down"): Category[] {
  const store = readStore();
  const moving = store.categories.find((c) => c.id === id);
  if (!moving) {
    throw new Error(`Category not found: ${id}`);
  }
  const siblings = store.categories
    .filter((c) => c.parentId === moving.parentId)
    .sort((a, b) => a.order - b.order);
  const currentIndex = siblings.findIndex((c) => c.id === id);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return store.categories;
  }
  return moveCategory(id, moving.parentId, targetIndex);
}

// Deletes a category. Child categories are reparented up to the deleted
// category's parent (flattened one level), and snippets in it fall back to
// that same parent (or become uncategorized if it was a top-level category).
export function deleteCategory(id: string): boolean {
  const store = readStore();
  const target = store.categories.find((c) => c.id === id);
  if (!target) return false;

  store.categories = store.categories
    .filter((c) => c.id !== id)
    .map((c) => (c.parentId === id ? { ...c, parentId: target.parentId, updatedAt: new Date().toISOString() } : c));
  store.snippets = store.snippets.map((s) =>
    s.categoryId === id ? { ...s, categoryId: target.parentId, updatedAt: new Date().toISOString() } : s
  );
  writeStore(store);
  return true;
}
