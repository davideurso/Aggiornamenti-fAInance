import fs from "node:fs";
import path from "node:path";

const app = fs.readFileSync(path.resolve("src/app.tsx"), "utf8");
const sezioni = fs.readFileSync(path.resolve("src/sezioni.tsx"), "utf8");

function ok(condition, message) {
  if (!condition) {
    console.error("[FAIL] " + message);
    process.exitCode = 1;
  } else {
    console.log("[OK] " + message);
  }
}

ok(
  app.includes("function validUserStateAuthorityV4") &&
  app.includes('scope: "compressed-complete-user-config-v1"'),
  "V4 esiste come snapshot completo della configurazione utente"
);

ok(
  app.includes("userStateAuthorityV4: buildUserStateAuthorityV4(null)") &&
  app.includes("var userStateAuthorityV4 = buildUserStateAuthorityV4(") &&
  app.includes("userStateAuthorityV4,"),
  "V4 viene scritto sia al primo account sia nei salvataggi normali"
);

ok(
  app.includes("userStateAuthorityV4: true,"),
  "V4 non viene toccato come campo Firestore top-level"
);

ok(
  app.includes("restoreUserStateAuthorityV4(cloudUserStateAuthorityV4)") &&
  app.includes("cloudUserStateAuthorityV4 &&") &&
  app.includes("V4 viene applicato per ULTIMO"),
  "V4 viene applicato per ultimo dopo i merge legacy"
);

ok(
  app.includes("verifyUserStateAuthorityV4FromServer") &&
  app.includes("fainanceExpandAccountCloudDataV5(") &&
  app.includes("getDocFromServer(doc(fbDb, \"userData\", userId))"),
  "Il logout verifica il V4 dentro il blob realmente letto dal server"
);

ok(
  app.includes("writeUserStateAuthorityV4IntoCompressedServer") &&
  app.includes("accountDataCompressedV5: compressed.value") &&
  app.includes("direct-compressed"),
  "Il fallback logout riscrive V4 nel blob compresso gia' autorizzato"
);

ok(
  app.includes("return saveToFirestore();") &&
  !app.includes('return saveUserStateAuthorityV3Direct(reason || "change", false);'),
  "Le modifiche configurabili usano il percorso cloud account già autorizzato"
);

ok(
  sezioni.includes("function historyAmountDisplay") &&
  sezioni.includes('fontSize: "0.82em"') &&
  sezioni.includes("historyAmountDisplay(historyFxView(e).main)") &&
  sezioni.includes("historyAmountDisplay(historyFxView(inc).main)"),
  "Nello Storico i decimali delle transazioni sono leggermente più piccoli"
);

// Verifica il comportamento del parser visuale usato per i decimali.
function splitAmount(str) {
  const match = String(str ?? "").match(/^(.*)([.,]\d{2})(\D*)$/);
  return match ? [match[1], match[2], match[3]] : [String(str ?? ""), "", ""];
}
const it = splitAmount("€ 1.234,56");
const en = splitAmount("1,234.56 USD");
const whole = splitAmount("€ 1234");
ok(it[1] === ",56", "Riconosce i decimali con formato italiano");
ok(en[1] === ".56", "Riconosce i decimali con formato inglese");
ok(whole[1] === "", "Non altera importi senza decimali");

if (process.exitCode) process.exit(process.exitCode);
console.log("\nTutti i controlli User State Authority V4 sono superati.");
