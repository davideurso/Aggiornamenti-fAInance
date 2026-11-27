import assert from "node:assert/strict";
import fs from "node:fs";
import { loadTypeScript } from "./loadTypeScript.mjs";

const { incomeTypeName, incomeTypeTitle, shoppingSettingsText } = loadTypeScript("src/i18n/movementShoppingLabels.ts");
const core = fs.readFileSync("src/core.tsx", "utf8");
const readDefaults = name => Function("return " + core.match(new RegExp("export const " + name + "=(\\[[\\s\\S]*?\\]);"))[1])();
const languages = readDefaults("LANGUAGES");
const types = readDefaults("INCOME_TYPES");
const countries = { it:"IT", en:"GB", es:"ES", fr:"FR", de:"DE", pt:"PT", pl:"PL", nl:"NL", ro:"RO", el:"GR" };
const bonus = {it:"Bonus", en:"Bonus", es:"Bonificación", fr:"Prime", de:"Bonus", pt:"Prémio", pl:"Premia", nl:"Bonus", ro:"Primă", el:"Μπόνους"};
assert.deepEqual(languages.map(l => l.code).sort(), Object.keys(countries).sort());
for (const {code, icon} of languages) {
  const country = Array.from(icon, point => String.fromCharCode(point.codePointAt(0) - 127397)).join("");
  assert.equal(country, countries[code]);
  const png = Array.from(icon,point => point.codePointAt(0).toString(16)).join("-") + ".png";
  assert.ok(fs.existsSync("public/fainance-icons/emoji/" + png));
  for (const type of types) {
    const label = incomeTypeName(type, code);
    assert.ok(label);
    if (type.id === "bonus") assert.equal(label, bonus[code]);
    else if (code !== "it") assert.notEqual(label, type.name, code + "/" + type.id);
    assert.equal(incomeTypeName({...type, name:"My name"}, code), "My name");
  }
  assert.equal(incomeTypeName({id:"custom",name:"Stipendio"}, code),"Stipendio");
  if (code !== "it") assert.notEqual(incomeTypeTitle(code), incomeTypeTitle("it"));
  for (const text of ["Liste","Aree","Unità di misura","Spesa / Liste","Colore","Modifica lista","Nome area",
    "Lista, modifica ed eliminazione delle liste spesa","Lista, riordino e default delle aree spesa","Lista, riordino, modifica e unità predefinita"]) {
    const label = shoppingSettingsText(text,code,"shopping_settings");
    assert.ok(label);
    if (code !== "it" && !(code === "ro" && text === "Liste")) assert.notEqual(label, text, code + "/" + text);
  }
  assert.equal(shoppingSettingsText("Spesa",code,"movement"), undefined);
}
console.log("Verified ten languages, flag assets, system income types, custom names and shopping settings.");

