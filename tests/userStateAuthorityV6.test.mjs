import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const app = fs.readFileSync(path.resolve("src/app.tsx"), "utf8");
const backups = fs.readFileSync(path.resolve("src/data/automaticBackups.ts"), "utf8");
const storico = fs.readFileSync(path.resolve("src/sezioni.tsx"), "utf8");


// Structural checks of the actual source: no Firebase connection or user data.
// Parse call sites instead of requiring obsolete whitespace, async keywords or log labels.
function nodes(root, predicate) {
  const result=[];
  function visit(node) { if(predicate(node)) result.push(node); ts.forEachChild(node,visit); }
  if(root) visit(root); return result;
}
function functionNamed(tree,name) {
  return nodes(tree,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name)[0];
}
function calls(root,name) {
  return nodes(root,n=>ts.isCallExpression(n)&&ts.isIdentifier(n.expression)&&n.expression.text===name);
}
function v6Paths(appSource,backupSource) {
  const a=ts.createSourceFile('app.tsx',appSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const b=ts.createSourceFile('backups.ts',backupSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const save=functionNamed(b,'saveUserStateAuthorityBackupV6');
  const payload=functionNamed(b,'saveUserStateAuthorityBackupV6Payload');
  const byId=functionNamed(b,'readUserStateAuthorityBackupV6ById');
  const latest=functionNamed(b,'readLatestUserStateAuthorityBackupV6');
  const verifier=functionNamed(a,'verifyUserStateAuthorityV6Server');
  const saver=functionNamed(a,'saveUserStateAuthorityV6Direct');
  const server=!!save&&calls(save,'saveAuthorityOnce').length===1&&calls(save,'saveUserStateAuthorityBackupV6Payload').length===1
    &&calls(payload,'setDoc').length>=2&&calls(byId,'getDocFromServer').length===1&&calls(latest,'getDocsFromServer').length===1
    &&calls(verifier,'readUserStateAuthorityBackupV6ById').length===1&&calls(verifier,'validUserStateAuthorityV6').length>=2;
  const logout=nodes(a,ts.isAwaitExpression).some(n=>calls(n,'saveUserStateAuthorityV6Direct').some(c=>
    c.arguments.length===2&&ts.isStringLiteral(c.arguments[0])&&c.arguments[0].text==='logout'&&c.arguments[1].kind===ts.SyntaxKind.TrueKeyword))
    &&calls(saver,'verifyUserStateAuthorityV6Server').length>=1;
  const declarations=nodes(a,ts.isVariableDeclaration);
  const started=declarations.find(n=>ts.isIdentifier(n.name)&&n.name.text==='authorityV6Read'&&calls(n,'readLatestUserStateAuthorityV6').length===1);
  const waited=declarations.find(n=>ts.isIdentifier(n.name)&&n.name.text==='authorityV6'&&n.initializer&&ts.isAwaitExpression(n.initializer)
    &&ts.isIdentifier(n.initializer.expression)&&n.initializer.expression.text==='authorityV6Read');
  const hydration=!!started&&!!waited&&started.pos<waited.pos
    &&calls(a,'applyUserStateAuthorityV6ToCloudData').some(c=>c.pos>waited.end)
    &&calls(a,'restoreUserStateAuthorityV6').some(c=>c.arguments[0]?.getText(a)==='cloudUserStateAuthorityV6')
    &&calls(a,'restoreUserStateAuthorityV6').some(c=>c.arguments[0]?.getText(a)==='guardedAuthorityV6');
  return {server,logout,hydration};
}
const paths=v6Paths(app,backups);

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
  paths.server,
  "V6 mantiene wrapper Promise, scritture e letture server esplicite nel codice"
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
  paths.logout &&
  app.includes('userKey("user_state_authority_v6_last_error")'),
  "Il logout salva V6 e verifica lo stesso backup dal server prima di uscire"
);

ok(
  paths.hydration,
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


// Negative source fixtures ensure these assertions still detect removal of safety paths.
ok(!v6Paths(app,backups.replaceAll('getDocFromServer(', 'getDocFromCache(')).server,
  "La rimozione della lettura server viene rilevata");
ok(!v6Paths(app,backups.replaceAll('saveUserStateAuthorityBackupV6Payload(input)', 'Promise.resolve(null)')).server,
  "Un wrapper senza scrittura reale viene rilevato");
ok(!v6Paths(app.replace(/saveUserStateAuthorityV6Direct\(\s*"logout"\s*,\s*true\s*\)/g,
  'saveUserStateAuthorityV6Direct("logout", false)'),backups).logout,
  "Un logout senza verifica server viene rilevato");
ok(!v6Paths(app.replaceAll('await authorityV6Read','null'),backups).hydration,
  "La rimozione dell'attesa V6 viene rilevata");

if (failed) process.exit(1);
console.log("\nTutti i controlli User State Authority V6 sono superati.");
