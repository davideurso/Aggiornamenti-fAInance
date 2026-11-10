import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const readText = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

const expectedCapacitorVersion = "8.5.0";
const alignedPackages = [
  "@capacitor/android",
  "@capacitor/cli",
  "@capacitor/core",
  "@capacitor/ios",
];

const packageJson = readJson("package.json");
const packageLock = readJson("package-lock.json");
const lockedRoot = packageLock.packages?.[""];

assert.ok(lockedRoot, "package-lock.json non contiene il pacchetto radice");
for (const packageName of alignedPackages) {
  assert.equal(
    packageJson.dependencies?.[packageName],
    expectedCapacitorVersion,
    `${packageName} non e fissato a ${expectedCapacitorVersion}`,
  );
  assert.equal(
    lockedRoot.dependencies?.[packageName],
    expectedCapacitorVersion,
    `${packageName} non e allineato nel lockfile`,
  );
  assert.equal(
    packageLock.packages?.[`node_modules/${packageName}`]?.version,
    expectedCapacitorVersion,
    `${packageName} risolve una versione diversa nel lockfile`,
  );
}

assert.equal(
  packageJson.scripts?.["test:release-rc"],
  "node tests/releaseCandidate.test.mjs && node tests/typescriptBaseline.test.mjs",
  "Comando di regressione RC inatteso",
);

const viteTypes = readText("src/vite-env.d.ts");
assert.match(viteTypes, /reference types="vite\/client"/);
assert.match(viteTypes, /declare module "\*\.png"/);
assert.match(viteTypes, /__fainancePendingWidgetRoute/);

const translationPatches = readText("src/i18n/appTranslationPatches.ts");
assert.match(translationPatches, /FAINANCE_I18N_PHRASES/);
assert.match(translationPatches, /FAINANCE_UI_TRANSLATIONS/);
assert.match(
  translationPatches,
  /let fainanceTranslationCache: Record<string, unknown> = \{\};/,
);

console.log(
  `Release candidate: Capacitor ${expectedCapacitorVersion} allineato, lockfile e dichiarazioni TypeScript verificati.`,
);

