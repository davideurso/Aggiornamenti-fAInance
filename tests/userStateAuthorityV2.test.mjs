import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const app = read("src/app.tsx");
const core = read("src/core.tsx");
const codec = read("src/data/accountCloudCodec.ts");
const sections = read("src/sezioni.tsx");
const translations = read("src/traduzioni.tsx");
const widget = read("src/widget.tsx");
const settings = read("src/settings/SettingsPanel.tsx");
const fidelityKt = read("android/app/src/main/java/com/fainance/widgets/FidelityWidgetProvider.kt");
const fidelityXml = read("android/app/src/main/res/layout/widget_fidelity.xml");

let failed = false;
function ok(condition, label) {
  if (condition) console.log("[OK] " + label);
  else {
    failed = true;
    console.error("[FAIL] " + label);
  }
}

// 1) Autorita' stato utente / cloud
ok(app.includes("USER STATE AUTHORITY V2"), "User State Authority V2 presente");
ok(app.includes('"preferenceStorage"') && app.includes("readUserPreferenceStorageSnapshotV2"), "Snapshot generico preferenze presente");
ok(app.includes("userStateAuthorityPreferenceKeyAllowed") && app.includes('/^widget/'), "Preferenze e widget inclusi nello snapshot autoritativo");
ok(app.includes("/^pref_(?:biometric|local_lock)/") && app.includes("return false"), "PIN/biometria locali esclusi dallo snapshot cloud");
ok(app.includes('writeUserLocalUpdatedAt("preference_storage_v2", Date.now())'), "Ogni modifica di preferenza riceve un timestamp persistente");
ok(app.includes('saver("pending-change")') && app.includes("userStateAuthoritySaveTimerRef"), "Salvataggio cloud rapido agganciato direttamente alle modifiche");
ok(app.includes('await saver("logout")') && app.includes("onLogout: flushUserStateAndLogout"), "Logout forza il flush dello stato utente prima della disconnessione");
ok(app.includes("applyUserStateAuthorityV2(d)"), "Autorita' applicata prima della normale idratazione cloud");
ok(codec.includes('"userStateAuthorityV2"'), "Autorita' top-level preservata dal codec cloud");
ok(core.includes("fainance-storage-restore") && core.includes("setV(next)"), "Ripristino cloud aggiorna anche gli hook useStorage gia' montati");
ok(
  app.includes("((previousExpensePersonalized && !currentExpensePersonalized) ||") &&
    app.includes("Number(expenseCatalogTs || 0) <= previousExpenseTs"),
  "Il guard delle categorie Uscite non blocca una cancellazione utente piu' recente"
);

// 2) Il vuoto scelto dall'utente resta vuoto
ok(!app.includes("if (!arr.length) arr = ensureArrayValue(fallback, []).slice();"), "Un array utente vuoto non viene ripopolato dai default");
ok(!app.includes("if (!nextUnits.length) nextUnits = DEFAULT_SHOPPING_UNITS.slice();"), "Le unita' Lista spesa non ricompaiono dopo rimozione completa");
ok(app.includes("function patrimonioProtectedArray") && !/function patrimonioProtectedArray[\s\S]{0,900}mergeProtectedArrayByStableId/.test(app), "Patrimonio non riaggiunge voci standard mancanti");

// 3) Cursore: i modal problematici non devono essere componenti nested rimontati ad ogni tasto
ok(widget.includes("function renderModalShell") && !widget.includes("function ModalShell("), "Editor voci usa render helper stabile");
ok(widget.includes("function renderAreaModal") && !widget.includes("function AreaModal("), "Editor aree usa render helper stabile");
ok(settings.includes("function renderGroupModal") && !settings.includes("function GroupModal("), "Editor gruppi usa render helper stabile");
ok(!widget.includes("<ModalShell") && !widget.includes("<AreaModal"), "Nessun remount JSX residuo nei due editor principali");
ok(!settings.includes("<GroupModal"), "Nessun remount JSX residuo nell'editor gruppi");

// 4) Agente AI multilinea
ok(sections.includes("aiComposerInputRef") && sections.includes("resizeAiComposerInput"), "Composer Agente AI auto-espandibile presente");
ok(sections.includes("maxHeight: 118") && sections.includes('lineHeight: "22px"'), "Composer Agente AI mostra circa 5 righe prima dello scroll");

// 5) Ricorrenze singolare/plurale in tutte le lingue in scope
const langs = ["it", "en", "es", "fr", "de", "pt", "pl", "nl", "ro", "el"];
ok(sections.includes("pendingCount === 1") && sections.includes("recurringPendingHomeOne") && sections.includes("recurringPendingHomeMany"), "Banner ricorrenze usa singolare/plurale");
for (const lang of langs) {
  const block = new RegExp(`${lang}:\\s*\\{[\\s\\S]*?recurringPendingHomeOne:[\\s\\S]*?recurringPendingHomeMany:`, "m");
  ok(block.test(translations), `Traduzioni ricorrenze complete: ${lang}`);
}

// 6) Fidelity: il codice serve al barcode ma non deve essere visibile
ok(fidelityKt.includes('views.setTextViewText(codeId, "")') && fidelityKt.includes("views.setViewVisibility(codeId, View.GONE)"), "Widget Fidelity nasconde sempre il numero tessera");
ok(/android:id="@\+id\/cardCode"[\s\S]{0,220}android:visibility="gone"/.test(fidelityXml), "Layout Fidelity non riserva spazio al numero tessera");
ok(fidelityKt.includes("WidgetUtils.barcodeBitmap(code"), "Il barcode continua a essere generato dal codice tessera");

if (failed) process.exit(1);
console.log("\nTutti i controlli User State Authority / UI sono superati.");
