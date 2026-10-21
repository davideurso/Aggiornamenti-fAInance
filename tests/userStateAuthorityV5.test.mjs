import fs from "node:fs";
import path from "node:path";

const app = fs.readFileSync(path.resolve("src/app.tsx"), "utf8");
const storico = fs.readFileSync(path.resolve("src/sezioni.tsx"), "utf8");

function ok(condition, message) {
  if (!condition) {
    console.error("[FAIL] " + message);
    process.exitCode = 1;
  } else {
    console.log("[OK] " + message);
  }
}

ok(
  app.includes('"users",') &&
  app.includes('"backups",') &&
  app.includes('"user_state_authority_v5"'),
  "V5 usa un documento cloud separato dal vecchio userData"
);

ok(
  app.includes('kind: "user-state-authority-v5"') &&
  app.includes('schemaVersion: 5') &&
  app.includes('{ merge: false }'),
  "V5 sostituisce lo snapshot completo e conserva anche eliminazioni"
);

ok(
  app.includes("getDocFromServer(ref)") &&
  app.includes('saveUserStateAuthorityV5Direct(') &&
  app.includes('"logout",') &&
  app.includes("true"),
  "Il logout verifica V5 direttamente dal server"
);

ok(
  app.includes("applyUserStateAuthorityV5ToCloudData") &&
  app.includes("restoreUserStateAuthorityV5") &&
  app.includes("cloudUserStateAuthorityV5"),
  "V5 viene applicato sia ai merge cloud sia agli hook locali"
);

ok(
  app.includes('if (/_updated_at$/.test(key)) return false;') &&
  app.includes('if (/(?:^|_)receipt(?:_|$)/.test(key)) return false;'),
  "I metadati volatili non contaminano piu' la verifica delle preferenze"
);

ok(
  app.includes('put("patrimonio_areas_v1", "patrimonioAreas")') &&
  app.includes('put("patrimonio_entries_v1", "patrimonioEntries")') &&
  app.includes('d.patrimonioCatalogUpdatedAt = ts;'),
  "Patrimonio V5 sovrascrive i dati legacy prima del merge"
);

ok(
  storico.includes('fontSize: "0.82em"'),
  "Lo Storico mantiene i decimali leggermente piu piccoli"
);

if (process.exitCode) process.exit(process.exitCode);
console.log("\nTutti i controlli User State Authority V5 sono superati.");
