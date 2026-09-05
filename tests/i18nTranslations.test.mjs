import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("src/traduzioni.tsx", "utf8").replace(/^export\s+/gm, "");
const context = {
  console,
  TRANSLATIONS: undefined,
  FAINANCE_I18N_PHRASES: undefined,
  translateFainanceText: undefined
};
vm.createContext(context);
vm.runInContext(`${source}
this.TRANSLATIONS = TRANSLATIONS;
this.translateFainanceText = translateFainanceText;`, context);

const { translateFainanceText } = context;

const cases = [
  ["Uscite", "es", "Gastos"],
  ["Expenses", "es", "Gastos"],
  ["Dépenses", "es", "Gastos"],
  ["Gastos", "fr", "Dépenses"],
  ["Attività del progetto", "es", "Actividad del proyecto"],
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
