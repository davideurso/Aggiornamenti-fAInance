import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = JSON.parse(
  fs.readFileSync(path.join(root, "tests", "typescriptLegacyBaseline.json"), "utf8"),
);
const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
const result = spawnSync(process.execPath, [tsc, "-p", "tsconfig.json", "--pretty", "false"], {
  cwd: root,
  encoding: "utf8",
  shell: false,
  maxBuffer: 16 * 1024 * 1024,
});

if (result.error) throw result.error;
if (result.status === 0) {
  console.log("TypeScript: nessun diagnostico residuo.");
  process.exit(0);
}

const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const counts = new Map();
for (const line of output.split(/\r?\n/)) {
  const match = line.match(/^(src[\\/][^(]+)\(\d+,\d+\): error (TS\d+):/);
  if (!match) continue;
  const key = `${match[1].replaceAll("\\", "/")}|${match[2]}`;
  counts.set(key, (counts.get(key) || 0) + 1);
}

const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
assert.ok(total > 0, "TypeScript e fallito senza diagnostici riconosciuti");
assert.ok(
  total <= baseline.total,
  `Diagnostici TypeScript aumentati: ${total} > ${baseline.total}`,
);

const regressions = [];
for (const [key, count] of counts) {
  const ceiling = baseline.groups[key];
  if (ceiling === undefined) regressions.push(`${key}: nuovo gruppo (${count})`);
  else if (count > ceiling) regressions.push(`${key}: ${count} > ${ceiling}`);
}
assert.deepEqual(regressions, [], `Regressioni TypeScript:\n${regressions.join("\n")}`);

console.log(
  `TypeScript legacy ceiling: ${total}/${baseline.total} diagnostici, nessuna regressione.`,
);
