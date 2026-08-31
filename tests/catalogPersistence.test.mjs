import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(root, "src", "app.tsx");
const source = fs.readFileSync(appPath, "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Funzione ${name} non trovata`);
  const brace = source.indexOf("{", start);
  assert.ok(brace > start, `Corpo ${name} non trovato`);
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Corpo ${name} non chiuso`);
}

const compareSource = extractFunction("compareCatalogSyncMetaV3");
const compareCatalogSyncMetaV3 = Function(`return (${compareSource});`)();

assert.equal(compareCatalogSyncMetaV3(null, null), "legacy");
assert.equal(
  compareCatalogSyncMetaV3(
    { schemaVersion: 3, revision: 1, updatedAtMs: 10, writerId: "a" },
    null
  ),
  "local"
);
assert.equal(
  compareCatalogSyncMetaV3(null, {
    schemaVersion: 3,
    revision: 1,
    updatedAtMs: 10,
    writerId: "a",
  }),
  "cloud"
);
assert.equal(
  compareCatalogSyncMetaV3(
    { revision: 2, updatedAtMs: 20, writerId: "a" },
    { revision: 99, updatedAtMs: 19, writerId: "z" }
  ),
  "local",
  "La versione locale piu recente deve prevalere"
);
assert.equal(
  compareCatalogSyncMetaV3(
    { revision: 99, updatedAtMs: 19, writerId: "z" },
    { revision: 2, updatedAtMs: 20, writerId: "a" }
  ),
  "cloud",
  "La versione cloud piu recente deve prevalere"
);
assert.equal(
  compareCatalogSyncMetaV3(
    { revision: 8, updatedAtMs: 20, writerId: "a" },
    { revision: 7, updatedAtMs: 20, writerId: "z" }
  ),
  "local",
  "La revisione rompe correttamente la parita temporale"
);

const wholeCatalogSource = extractFunction("chooseWholeCatalog");
assert.ok(!wholeCatalogSource.includes("readOnlyBuild && cloudExists"));
assert.ok(!wholeCatalogSource.includes("evidenceFn(localCatalog)"));
assert.ok(!wholeCatalogSource.includes("evidenceFn(cloudCatalog)"));

assert.ok(source.includes('userKey("catalog_sync_meta_v3")'));
assert.ok(source.includes("catalogSyncV3"));
assert.ok(source.includes("categoryPreferences: categoryValue"));
assert.ok(source.includes('userKey("catalog_auto_recovery_disabled_v9")'));
assert.ok(source.includes("if (isCatalogSyncV3StorageKey(key)) return fallback;"));
assert.ok(!source.includes("if (await fainanceIsTestBuild())"));
assert.ok(
  source.includes(
    "Cataloghi, ordine e default vengono salvati insieme dal sync compatto."
  )
);

console.log("Catalog sync V3: 16 controlli superati");
