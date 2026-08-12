import * as assert from "assert";
import * as fs from "fs";
import {
  getStorePath,
  addSnippet,
  getSnippets,
  updateSnippet,
  deleteSnippet,
  writeStore,
  setPinned,
  recordUsage,
  exportSnippets,
  importSnippets,
  addCategory,
  getCategories,
  updateCategory,
  setCategoryPinned,
  moveCategory,
  reorderCategory,
  deleteCategory,
  readStore,
} from "../src";

// backs up and restores the real store file so this doesn't clobber existing snippets
const storePath = getStorePath();
const backup = fs.existsSync(storePath) ? fs.readFileSync(storePath, "utf-8") : null;

function restore() {
  if (backup !== null) {
    fs.writeFileSync(storePath, backup, "utf-8");
  } else if (fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
  }
}

try {
  writeStore({ snippets: [], categories: [] }); // also creates the data file if missing

  assert.deepStrictEqual(getSnippets(), [], "store should start empty");

  const created = addSnippet({
    title: "Hello world",
    code: "console.log('hello')",
    language: "javascript",
    tags: ["greeting"],
  });
  assert.ok(created.id, "addSnippet should assign an id");
  assert.strictEqual(created.pinned, false, "new snippets start unpinned");
  assert.strictEqual(created.useCount, 0, "new snippets start with useCount 0");
  assert.strictEqual(created.categoryId, null, "new snippets start uncategorized");
  assert.strictEqual(getSnippets().length, 1, "store should contain one snippet");

  const pinned = setPinned(created.id, true);
  assert.strictEqual(pinned.pinned, true, "setPinned should flip pinned");

  const used = recordUsage(created.id);
  assert.strictEqual(used.useCount, 1, "recordUsage should increment useCount");
  assert.ok(used.lastUsedAt, "recordUsage should set lastUsedAt");

  const updated = updateSnippet(created.id, { title: "Hello, world!" });
  assert.strictEqual(updated.title, "Hello, world!", "updateSnippet should change the title");
  assert.strictEqual(updated.id, created.id, "updateSnippet should preserve the id");
  assert.strictEqual(updated.createdAt, created.createdAt, "updateSnippet should preserve createdAt");

  const second = addSnippet({
    title: "Second",
    code: "print('second')",
    language: "python",
    tags: [],
  });
  assert.strictEqual(getSnippets().length, 2, "store should contain two snippets");

  const deleted = deleteSnippet(second.id);
  assert.strictEqual(deleted, true, "deleteSnippet should report success");
  assert.strictEqual(getSnippets().length, 1, "store should contain one snippet after delete");

  const deletedAgain = deleteSnippet(second.id);
  assert.strictEqual(deletedAgain, false, "deleting a missing snippet should return false");

  assert.throws(() => updateSnippet("does-not-exist", { title: "x" }), /Snippet not found/);

  // ---------- Categories ----------

  const devops = addCategory({ name: "DevOps" });
  assert.strictEqual(devops.parentId, null, "top-level category has no parent");
  assert.strictEqual(devops.pinned, false, "new categories start unpinned");

  const ci = addCategory({ name: "CI", parentId: devops.id });
  assert.strictEqual(ci.parentId, devops.id, "addCategory should nest under the given parent");
  assert.strictEqual(ci.order, 0, "first child gets order 0");

  const cd = addCategory({ name: "CD", parentId: devops.id });
  assert.strictEqual(cd.order, 1, "second sibling gets the next order");

  const renamed = updateCategory(ci.id, { name: "Continuous Integration" });
  assert.strictEqual(renamed.name, "Continuous Integration", "updateCategory should rename");

  const pinnedCategory = setCategoryPinned(devops.id, true);
  assert.strictEqual(pinnedCategory.pinned, true, "setCategoryPinned should flip pinned");

  const afterReorder = reorderCategory(cd.id, "up");
  const cdAfter = afterReorder.find((c) => c.id === cd.id)!;
  const ciAfter = afterReorder.find((c) => c.id === ci.id)!;
  assert.ok(cdAfter.order < ciAfter.order, "reorderCategory('up') should move CD before CI");

  const frontend = addCategory({ name: "Frontend" });
  const afterMove = moveCategory(cd.id, frontend.id);
  const cdMoved = afterMove.find((c) => c.id === cd.id)!;
  assert.strictEqual(cdMoved.parentId, frontend.id, "moveCategory should reparent");

  assert.throws(
    () => moveCategory(devops.id, ci.id),
    /descendant/,
    "moveCategory should refuse to move a category into its own descendant"
  );

  const categorizedSnippet = addSnippet({
    title: "Third",
    code: "echo third",
    language: "bash",
    categoryId: ci.id,
  });
  assert.strictEqual(categorizedSnippet.categoryId, ci.id, "addSnippet should keep the categoryId");

  const deletedCategory = deleteCategory(ci.id);
  assert.strictEqual(deletedCategory, true, "deleteCategory should report success");
  assert.strictEqual(
    getCategories().find((c) => c.id === ci.id),
    undefined,
    "deleted category should be gone"
  );
  const reassigned = getSnippets().find((s) => s.id === categorizedSnippet.id)!;
  assert.strictEqual(
    reassigned.categoryId,
    devops.id,
    "snippets in a deleted category fall back to its parent"
  );

  // ---------- Legacy migration (old free-text `category` string -> Category entity) ----------

  fs.writeFileSync(
    storePath,
    JSON.stringify([
      { id: "legacy-1", title: "Legacy", code: "x", language: "js", category: "Legacy Bucket" },
    ]),
    "utf-8"
  );
  const migrated = readStore();
  assert.strictEqual(migrated.categories.length, 1, "migration should create one category from the legacy string");
  assert.strictEqual(migrated.categories[0].name, "Legacy Bucket");
  assert.strictEqual(
    migrated.snippets[0].categoryId,
    migrated.categories[0].id,
    "migrated snippet should reference the new category by id"
  );

  writeStore({ snippets: [], categories: [] });

  // ---------- Export / import ----------

  const exportA = addSnippet({ title: "A", code: "a", language: "go" });
  const exportB = addSnippet({ title: "B", code: "b", language: "rust" });

  const exported = exportSnippets();
  assert.strictEqual(exported.length, 2, "exportSnippets() should export everything by default");

  const exportedOne = exportSnippets([exportA.id]);
  assert.deepStrictEqual(exportedOne.map((s) => s.id), [exportA.id], "exportSnippets(ids) should filter to the given ids");

  const merged = importSnippets(
    [{ ...exportB, title: "B (renamed)" }, { title: "Imported new", code: "x", language: "go" }],
    "merge"
  );
  assert.strictEqual(merged.length, 3, "merge import should update one and add one");
  assert.ok(
    merged.find((s) => s.id === exportB.id)?.title === "B (renamed)",
    "merge import should overwrite matching ids"
  );

  const replaced = importSnippets([{ title: "Only this one", code: "y", language: "rust" }], "replace");
  assert.strictEqual(replaced.length, 1, "replace import should wipe existing snippets");
  assert.strictEqual(getSnippets().length, 1, "store should reflect the replace import");

  console.log("All @snippet/core CRUD tests passed.");
} finally {
  restore();
}
