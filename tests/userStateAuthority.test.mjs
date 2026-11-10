import fs from "node:fs";
import path from "node:path";

const app = fs.readFileSync(path.resolve("src/app.tsx"), "utf8");
const widget = fs.readFileSync(path.resolve("src/widget.tsx"), "utf8");
const sezioni = fs.readFileSync(path.resolve("src/sezioni.tsx"), "utf8");
const stats = fs.readFileSync(path.resolve("src/statistiche.tsx"), "utf8");
const settings = fs.readFileSync(path.resolve("src/settings/SettingsPanel.tsx"), "utf8");
const shopping = fs.readFileSync(path.resolve("src/sections/ShoppingPanel.tsx"), "utf8");

function ok(condition, message) {
  if (!condition) {
    console.error("[FAIL] " + message);
    process.exitCode = 1;
  } else {
    console.log("[OK] " + message);
  }
}

ok(
  app.includes('var arr = Array.isArray(value)') &&
  !app.includes('if (!arr.length) arr = ensureArrayValue(fallback, []).slice();'),
  "Gli array utente vuoti non vengono sostituiti dai default"
);

ok(
  app.includes("function patrimonioProtectedArray") &&
  !/function patrimonioProtectedArray[\s\S]{0,900}mergeProtectedArrayByStableId/.test(app),
  "Il Patrimonio non riaggiunge automaticamente aree/voci predefinite"
);

ok(
  app.includes("if (c) return c;") && app.includes("if (l) return l;"),
  "La sync considera [] uno stato valido e autoritativo"
);

ok(
  app.includes("localSnap.budgetPlan === undefined") &&
  !app.includes("setBudgetPlan(localSnap.budgetPlan || DEFAULT_BUDGET_PLAN)"),
  "Budget disabilitato/null non viene ripristinato al default"
);

ok(
  app.includes("archived: true") &&
  app.includes("deleted: true") &&
  app.includes("Keep historical references resolvable"),
  "Le categorie storiche mancanti restano nascoste e non vengono riattivate"
);

ok(
  !/Array\.isArray\([^\n]+\)\s*&&\s*[^\n]*\.length[\s\S]{0,120}:\s*DEFAULT_/.test(
    [app, widget, sezioni, stats, settings, shopping].join("\n")
  ),
  "Nessun fallback noto ripopola i default solo perché una lista è vuota"
);

ok(
  !app.includes("if (!nextUnits.length) nextUnits = DEFAULT_SHOPPING_UNITS.slice();"),
  "Le unità della Lista spesa non vengono rigenerate dopo rimozione completa"
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nTutti i controlli anti-ripristino sono superati.");
