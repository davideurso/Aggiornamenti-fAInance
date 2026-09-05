import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function asClassicScript(source) {
  return source
    .replace(/^\s*import\s+[^;]+;\s*$/gm, "")
    .replace(/^\s*export\s+\*\s+from\s+[^;]+;\s*$/gm, "")
    .replace(/^export\s+/gm, "");
}

// Architecture Phase 10 moved the dictionaries to translationData.ts.
// The test reconstructs the same data + runtime in a VM without changing
// package.json module semantics for the application.
const dataSource = asClassicScript(
  fs.readFileSync("src/i18n/translationData.ts", "utf8")
);
const runtimeSource = asClassicScript(
  fs.readFileSync("src/traduzioni.tsx", "utf8")
);
const source = `${dataSource}\n${runtimeSource}`;

const context = {
  console,
  TRANSLATIONS: undefined,
  FAINANCE_UI_TRANSLATIONS: undefined,
  FAINANCE_I18N_PHRASES: undefined,
  translateFainanceText: undefined
};
vm.createContext(context);
vm.runInContext(`${source}
this.TRANSLATIONS = TRANSLATIONS;
this.translateFainanceText = translateFainanceText;`, context);

const { translateFainanceText } = context;
assert.equal(typeof translateFainanceText, "function", "translateFainanceText non disponibile");

const cases = [
  ["Uscite", "es", "Gastos"],
  ["Expenses", "es", "Gastos"],
  ["Dépenses", "es", "Gastos"],
  ["Gastos", "fr", "Dépenses"],
  // Stable pre-refactor production behavior is "Actividad".
  ["Attività del progetto", "es", "Actividad"],
  ["Nessuna attività", "fr", "Aucune activité"],
  ["+ Carica documento", "de", "+ Dokument hochladen"],
  ["Consulente AI", "en", "AI Advisor"],
  ["Piano mensile e risparmio", "nl", "Maandplan en sparen"]
];

for (const [input, lang, expected] of cases) {
  assert.equal(translateFainanceText(input, lang), expected, `${input} -> ${lang}`);
}

for (const [input, lang] of cases) {
  const translated = translateFainanceText(input, lang);
  assert(!/[ÃÂâðÄÅÈÎÏ�]/.test(translated), `mojibake in ${input} -> ${lang}: ${translated}`);
}

console.log("i18n translations ok");
