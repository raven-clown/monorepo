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

  console.log("All @snippet/core CRUD tests passed.");
} finally {
  restore();
}
