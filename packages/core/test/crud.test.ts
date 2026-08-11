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
  writeStore([]); // also creates ~/.snippet-manager/data.json if missing

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

  const categorized = addSnippet({
    title: "Third",
    code: "echo third",
    language: "bash",
    category: "DevOps",
  });
  assert.strictEqual(categorized.category, "DevOps", "addSnippet should keep the category");
  assert.strictEqual(getSnippets().length, 2, "store should contain two snippets before export test");

  const exported = exportSnippets();
  assert.strictEqual(exported.length, 2, "exportSnippets() should export everything by default");

  const exportedOne = exportSnippets([categorized.id]);
  assert.deepStrictEqual(
    exportedOne.map((s) => s.id),
    [categorized.id],
    "exportSnippets(ids) should filter to the given ids"
  );

  const merged = importSnippets(
    [{ ...categorized, title: "Third (renamed)" }, { title: "Imported new", code: "x", language: "go" }],
    "merge"
  );
  assert.strictEqual(merged.length, 3, "merge import should update one and add one");
  assert.ok(
    merged.find((s) => s.id === categorized.id)?.title === "Third (renamed)",
    "merge import should overwrite matching ids"
  );

  const replaced = importSnippets([{ title: "Only this one", code: "y", language: "rust" }], "replace");
  assert.strictEqual(replaced.length, 1, "replace import should wipe existing snippets");
  assert.strictEqual(getSnippets().length, 1, "store should reflect the replace import");

  console.log("All @snippet/core CRUD tests passed.");
} finally {
  restore();
}
