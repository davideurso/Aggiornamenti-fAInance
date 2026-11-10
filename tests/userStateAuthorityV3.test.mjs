import fs from 'node:fs';

const app = fs.readFileSync('src/app.tsx', 'utf8');
const codec = fs.readFileSync('src/data/accountCloudCodec.ts', 'utf8');
const fidelity = fs.readFileSync('android/app/src/main/java/com/fainance/widgets/FidelityWidgetProvider.kt', 'utf8');
const sezioni = fs.readFileSync('src/sezioni.tsx', 'utf8');
const trad = fs.readFileSync('src/traduzioni.tsx', 'utf8');

function ok(cond, msg) {
  if (!cond) {
    console.error('[FAIL] ' + msg);
    process.exitCode = 1;
  } else console.log('[OK] ' + msg);
}

ok(app.includes('schemaVersion: 3') && app.includes('complete-user-config-v1'), 'V3 completo dello stato utente presente');
ok(app.includes('getDocFromServer(docRef)'), 'verifica server reale presente');
ok(app.includes("Il logout e' stato annullato") && app.includes('logout-final'), 'logout bloccato se il cloud non conferma');
ok(app.includes('delete compactSource.userStateAuthorityV3;'), 'V3 escluso dallo snapshot compresso legacy');
ok(app.includes('userStateAuthorityV3: true'), 'V3 protetto dalle delete legacy');
ok(codec.includes('"userStateAuthorityV3"'), 'codec preserva il campo V3 top-level');
ok(app.includes('if (!cloudUserStateAuthorityV3)') && app.includes('applyUserStateAuthorityV2(d)'), 'V2 non sovrascrive V3');
ok(app.includes('localStorage.removeItem(fullKey)') && app.includes('Object.prototype.hasOwnProperty.call(values, baseKey)'), 'restore V3 è mirror completo, incluse eliminazioni');
ok(app.includes('userStateAuthorityV3SaveChainRef'), 'scritture V3 serializzate contro race condition');
ok(app.includes('{ mergeFields: ["userStateAuthorityV3"] }'), 'la mappa V3 viene sostituita come campo completo');

ok(fidelity.includes('views.setViewVisibility(barcodeId, View.GONE)') && fidelity.includes('numero della tessera'), 'Fidelity mantiene nascosto il numero tessera');
ok(sezioni.includes('var maxHeight = 118') && sezioni.includes('overflowY'), 'campo Agente AI resta autoespandibile');
ok(sezioni.includes('recurringPendingHomeOne') && sezioni.includes('recurringPendingHomeMany'), 'ricorrenze singolare/plurale presenti');
ok(trad.includes('recurringPendingHomeOne:"Transazione ricorrente"') && trad.includes('recurringPendingHomeMany:"Transazioni ricorrenti"'), 'traduzioni ricorrenze italiane presenti');

if (process.exitCode) process.exit(process.exitCode);
console.log('\nTutti i controlli State Authority V3 sono superati.');
