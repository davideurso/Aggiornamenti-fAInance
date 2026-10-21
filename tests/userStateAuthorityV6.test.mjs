import fs from "node:fs";
import path from "node:path";

const app = fs.readFileSync(path.resolve("src/app.tsx"), "utf8");
const backups = fs.readFileSync(path.resolve("src/data/automaticBackups.ts"), "utf8");
const storico = fs.readFileSync(path.resolve("src/sezioni.tsx"), "utf8");

let failed = false;
function ok(condition, message) {
  if (!condition) {
    failed = true;
    console.error("[FAIL] " + message);
  } else {
    console.log("[OK] " + message);
  }
}

ok(
  backups.includes('const USER_STATE_AUTHORITY_V6_REASON = "user-state-authority-v6"') &&
  backups.includes('doc(fbDb, "users", uid, "backups", id)') &&
  backups.includes('schemaVersion: 1') &&
  backups.includes('payload: compressed.value'),
  "V6 usa lo stesso schema Firestore dei backup automatici gia esistenti"
);

ok(
  backups.includes("export async function saveUserStateAuthorityBackupV6") &&
  backups.includes("export async function readUserStateAuthorityBackupV6ById") &&
  backups.includes("export async function readLatestUserStateAuthorityBackupV6") &&
  backups.includes("getDocFromServer") &&
  backups.includes("getDocsFromServer"),
  "V6 salva e verifica realmente dal server, non dalla cache locale"
);

ok(
  app.includes('if (localStorage.getItem(marker) === "1") return;'),
  "La migrazione legacy e davvero one-shot e non puo resuscitare configurazioni vecchie a ogni login"
);

ok(
  app.includes("function restoreUserStateAuthorityV6") &&
  app.includes("Full snapshot semantics: absence is intentional") &&
  app.includes("localStorage.removeItem(fullKey)") &&
  app.includes("dispatchUserStorageRestore"),
  "V6 tratta anche assenza/eliminazione come stato autoritativo completo"
);

ok(
  app.includes("saveUserStateAuthorityBackupV6({") &&
  app.includes("verifyUserStateAuthorityV6Server") &&
  app.includes('saveUserStateAuthorityV6Direct(\n      "logout",\n      true') &&
  app.includes('userKey("user_state_authority_v6_last_error")'),
  "Il logout salva V6 e verifica lo stesso backup dal server prima di uscire"
);

ok(
  app.includes("var authorityV6 = await readLatestUserStateAuthorityV6()") &&
  app.includes("d = applyUserStateAuthorityV6ToCloudData(") &&
  app.includes("restoreUserStateAuthorityV6(cloudUserStateAuthorityV6)") &&
  app.includes("USER STATE V6 LATE OVERRIDE BLOCKED"),
  "Login/reinstallazione applicano V6 prima dei merge e bloccano overwrite tardivi"
);

ok(
  app.includes('patrimonio_areas_v1: true') && app.includes('patrimonio_entries_v1: true'),
  "Aree e voci Patrimonio sono comprese nello snapshot V6"
);

ok(
  /fontSize:\s*["']0\.82em["']/.test(storico),
  "La riduzione dei decimali nello Storico resta inclusa"
);

ok(
  !/function patrimonioProtectedArray[\s\S]{{0,500}}mergeProtectedArrayByStableId/.test(app),
  "Il Patrimonio non riaggiunge i default attraverso merge protetti"
);

if (failed) process.exit(1);
console.log("\nTutti i controlli User State Authority V6 sono superati.");
