import ts from "typescript";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const settings = fs.readFileSync("src/settings/SettingsPanel.tsx", "utf8");
const translations = fs.readFileSync("src/i18n/appTranslationPatches.ts", "utf8");

for (const marker of [
  'registerPlugin("FainanceFile")',
  "FainanceFileNativeBackup.pickJson()",
  "decodeNativeBackupBase64",
  "isRecognizedBackupJson",
  "stageBackupJsonText",
  "pendingBackupImport",
  'role="dialog"',
  'accept=".json,application/json,text/json',
]) {
  assert(settings.includes(marker), `Marcatore import backup assente: ${marker}`);
}

const handlerStart = settings.indexOf("async function handleBackupJsonFile");
const handlerEnd = settings.indexOf("function dataTitle", handlerStart);
assert(handlerStart >= 0 && handlerEnd > handlerStart, "Handler backup non isolabile");
assert(
  !settings.slice(handlerStart, handlerEnd).includes("window.confirm"),
  "Il ripristino non deve dipendere dal confirm del WebView"
);

const decoderStart = settings.indexOf("function decodeNativeBackupBase64");
const decoderEnd = settings.indexOf("function showBackupImportError", decoderStart);
assert(decoderStart >= 0 && decoderEnd > decoderStart, "Decoder backup non isolabile");
const decoderSource = settings.slice(decoderStart, decoderEnd);
const context = {
  window: { atob },
  TextDecoder,
  Uint8Array,
  decodeURIComponent,
  Object,
};
vm.createContext(context);
vm.runInContext(
  `${decoderSource}\nthis.decodeNativeBackupBase64=decodeNativeBackupBase64;this.isRecognizedBackupJson=isRecognizedBackupJson;`,
  context
);
const sample = { backupSchemaVersion: 3, expenses: [{ description: "Caffè ☕" }] };
const encoded = Buffer.from(JSON.stringify(sample), "utf8").toString("base64");
assert.deepEqual(JSON.parse(context.decodeNativeBackupBase64(encoded)), sample);
assert.equal(context.isRecognizedBackupJson(sample), true);
assert.equal(context.isRecognizedBackupJson({ unexpected: true }), false);

// The actual Android/Web UI uses the hidden file input. The legacy native
// plugin handler is no longer connected to this button; do not require a
// nonexistent Java plugin or claim to have tested that unsupported path.
assert(settings.includes('var input = backupJsonFileInputRef.current;'));
assert(settings.includes('input.click();'));
assert(settings.includes('onChange={handleBackupJsonFile}'));
const handler = settings.slice(handlerStart, settings.indexOf('async function handleNativeBackupJsonFile',handlerStart));
assert(handler.indexOf('await readBackupJsonFile(f)') < handler.indexOf('input.value = ""'),
  'File URI must remain available until reading finishes');
const tree=ts.createSourceFile('SettingsPanel.tsx',settings,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const functions=[];
function visit(node){
 if(ts.isFunctionDeclaration(node)&&['readBackupJsonFile','readBackupJsonFileWithReader'].includes(node.name?.text))functions.push(node.getText(tree));
 ts.forEachChild(node,visit);
}
visit(tree);assert.equal(functions.length,2);
const readCode=ts.transpileModule(functions.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
let readerUses=0;
class TestReader{
 readAsText(file){readerUses++;queueMicrotask(()=>{this.result=file.fixture;this.onload({target:this});});}
}
const readFile=new Function('FileReader',readCode+';return readBackupJsonFile;')(TestReader);
const fixture=JSON.stringify(sample);
assert.equal(await readFile({text:async()=>fixture}),fixture);
assert.equal(readerUses,0);
assert.equal(await readFile({text:async()=>{throw Error('WebView text read failed');},fixture}),fixture);
assert.equal(readerUses,1,'FileReader fallback must execute on a rejected file.text()');

const exportStart = settings.indexOf("async function runDataExport");
const exportEnd = settings.indexOf("function runDataDelete", exportStart);
assert(exportStart >= 0 && exportEnd > exportStart, "Export dati non isolabile");
const exportBody = settings.slice(exportStart, exportEnd);
for (const marker of [
  "Backup esportato",
  "File Excel uscite esportato",
  "File CSV uscite esportato",
  "File Excel entrate esportato",
  "File CSV entrate esportato",
  "File JSON Patrimonio esportato",
  "File JSON Budget esportato",
  "File JSON Spesa esportato",
  "File JSON Debiti / Crediti esportato",
]) {
  assert(exportBody.includes(marker), `Conferma export assente: ${marker}`);
  assert(translations.includes(`'${marker}'`), `Traduzione export assente: ${marker}`);
}
assert(!/File (?:Excel|CSV).* pronto/.test(exportBody), "Toast export obsoleto ancora presente");
assert(!exportBody.includes("Backup pronto"), "Toast backup obsoleto ancora presente");

console.log("backup import/export checks ok");
