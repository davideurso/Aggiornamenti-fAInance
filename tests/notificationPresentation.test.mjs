import test from 'node:test';
import assert from 'node:assert/strict';
import {notificationTone,notificationAppearance} from '../src/ui/notificationPresentation.js';
import {formatForecastAmount} from '../src/finance/forecastPresentation.js';
test('Italian 4-digit and large amounts always group thousands without changing sign policy',()=>{
 assert.equal(formatForecastAmount(1717.03,'it','EUR'),'1.717,03 €');
 assert.equal(formatForecastAmount(-1307.08,'it','EUR'),'1.307,08 €');
 assert.equal(formatForecastAmount(1234567.89,'it','EUR'),'1.234.567,89 €');
});
test('explicit severity overrides conflicting message content and caller colors',()=>{
 for(const type of ['success','error','warning','info'])assert.equal(notificationTone({type,color:'#fff'},'Errore, operazione completata'),type);
});
test('legacy export completion is success; failures never infer success from saved wording',()=>{
 assert.equal(notificationTone({},'Backup esportato'),'success');
 assert.equal(notificationTone({},'Impossibile esportare i dati salvati'),'error');
 assert.equal(notificationTone({},'Mappa almeno Data e Importo'),'warning');
 assert.equal(notificationTone({},'Messaggio'),'info');
});
test('all languages use the same explicit semantic palette and readable contrast',()=>{
 for(const text of ['Export complete','Exportación completada','Εξαγωγή ολοκληρώθηκε']){
  assert.equal(notificationTone({type:'success'},text),'success');
  assert.equal(notificationAppearance('success').background,'#16815F');
 }
 assert.equal(notificationAppearance('error').background,'#B63B45');
 assert.equal(notificationAppearance('warning').background,'#FFD54F');
 assert.equal(notificationAppearance('warning').color,'#3B3000');
});

test('import replacement failure and multiline file-reader errors explicitly remain red in every language',async()=>{
 const {default:fs}=await import('node:fs');
 const source=fs.readFileSync(new URL('../src/widget.tsx',import.meta.url),'utf8');
 const block=source.slice(source.indexOf('export function ImportData('));
 const replacement=block.slice(block.indexOf("console.error('Import replacement failed'"),block.indexOf("console.error('Import replacement failed'")+420);
 assert.match(replacement,/setMsg\(L\('[^']+'\), "error"\)/);
 assert.match(block,/setMsg\(L\("Il Foglio Google selezionato non ha fornito una tabella leggibile."\), "error"\)/);
});
