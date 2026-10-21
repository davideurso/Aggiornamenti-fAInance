import assert from "node:assert/strict";
import fs from "node:fs";
import { loadTypeScript } from './loadTypeScript.mjs';

const { translateFainanceText } = loadTypeScript('src/traduzioni.tsx');
for (const [file, name] of [['periodTranslations','periodTranslationRows'],['budgetTranslations','budgetTranslationRows'],['financeMessages','financeMessageRows']]) {
  const rows=loadTypeScript(`src/i18n/${file}.ts`)[name];
  assert.equal(Object.keys(rows).length,10);
  for (const [language,values] of Object.entries(rows)) {
    assert.equal(values.length,rows.it.length,language);
    assert(values.every(value=>typeof value==='string'&&value.trim()),language);
  }
}

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
