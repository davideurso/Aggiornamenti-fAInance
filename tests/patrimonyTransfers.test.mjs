import{test}from'node:test';import assert from'node:assert/strict';
import fs from'node:fs';import vm from'node:vm';
import{createRequire}from'node:module';const ts=createRequire(import.meta.url)('typescript');
import{transferPatrimonyFunds,patrimonyTransferHistory,revisePatrimonyTransfer}from'../src/finance/patrimonyTransfers.js';
import{derivePatrimony,createBalanceCheckpoint}from'../src/finance/patrimonyAutoBalance.js';
const now='2026-10-29T12:00:00Z',date='2026-10-29';
function state(mode='manuale') {return{patrimonioMode:mode,patrimonioEntries:[{id:'bank',name:'Conto',icon:'🏦'},{id:'cash',name:'Contanti',icon:'💵'},{id:'house',name:'Casa'}],patrimonioValues:{bank:1000,cash:100,house:100000},patrimonioHistory:{'2026-09':{bank:900,cash:50,house:100000,_total:100950}},expenses:[],incomes:[]};}
const args={id:'transfer-1',fromId:'bank',toId:'cash',amount:'500'};
test('500 withdrawn moves equal amounts, preserves net worth, history, and all movements',()=>{const s=state(),original=JSON.stringify(s),out=transferPatrimonyFunds(s,args,now);assert.equal(JSON.stringify(s),original);assert.deepEqual(out.patrimonioValues,{bank:500,cash:600,house:100000});assert.equal(out.patrimonioHistory['2026-10']._total,101100);assert.deepEqual(out.patrimonioHistory['2026-09'],s.patrimonioHistory['2026-09']);assert.equal(out.record.amount,500);assert.deepEqual(s.expenses,[]);assert.deepEqual(s.incomes,[]);});
test('same transfer retry is idempotent after JSON persistence and cannot change payload',()=>{const s=state(),out=transferPatrimonyFunds(s,args,now),next=JSON.parse(JSON.stringify({...s,...out}));assert.equal(transferPatrimonyFunds(next,args,now),null);assert.throws(()=>transferPatrimonyFunds(next,{...args,amount:20},now),/ID_CONFLICT/);assert.equal(patrimonyTransferHistory(next.patrimonioEntries).length,1);});
test('linked balances retain transferred funds when later spending and receipts arrive',()=>{const s=state('entrambe');s.expenses=[{id:'old',date,methodId:'bank-method',amount:40}];s.patrimonioEntries=s.patrimonioEntries.map(e=>e.id==='house'?e:{...e,balanceLink:{version:1,enabled:true,checkpoints:[createBalanceCheckpoint({date,amount:s.patrimonioValues[e.id],methodIds:[e.id+'-method'],expenses:s.expenses,incomes:[],now})]}});const out=transferPatrimonyFunds(s,args,now);let r=derivePatrimony({entries:out.patrimonioEntries,values:out.patrimonioValues,history:out.patrimonioHistory,expenses:s.expenses,mode:'entrambe',today:date});assert.equal(r.values.bank,500);assert.equal(r.values.cash,600);r=derivePatrimony({entries:out.patrimonioEntries,values:out.patrimonioValues,history:out.patrimonioHistory,expenses:[...s.expenses,{id:'new',date,methodId:'cash-method',amount:25}],incomes:[{id:'salary',date,receivedInMethodId:'bank-method',amount:100}],mode:'entrambe',today:date});assert.equal(r.values.bank,600);assert.equal(r.values.cash,575);});
test('paused automatic links remain paused and preserve old checkpoints',()=>{const s=state();s.patrimonioEntries[0].balanceLink={enabled:true,version:1,checkpoints:[{date:'2026-10-01',amount:1000,methodIds:['m']}]};const out=transferPatrimonyFunds(s,args,now);assert.deepEqual(out.patrimonioEntries[0].balanceLink,s.patrimonioEntries[0].balanceLink);assert.equal(out.patrimonioValues.bank,500);});
test('credit draw uses a negative balance and equal cash increase',()=>{const s=state();s.patrimonioValues.bank=0;const out=transferPatrimonyFunds(s,args,now);assert.equal(out.patrimonioValues.bank,-500);assert.equal(out.patrimonioValues.cash,600);assert.equal(out.patrimonioHistory['2026-10']._total,100100);});
test('decimal cents, archived entries and unrelated notes/fields remain intact',()=>{const s=state();s.patrimonioEntries[1].archived=true;s.patrimonioEntries[0].custom='keep';const out=transferPatrimonyFunds(s,{...args,amount:'20,15'},now);assert.equal(out.patrimonioValues.bank,979.85);assert.equal(out.patrimonioValues.cash,120.15);assert.equal(out.patrimonioEntries[0].custom,'keep');assert(out.patrimonioEntries[1].archived);});
test('invalid or identical destinations, zero, invalid values and ambiguous links never mutate input',()=>{const s=state(),before=JSON.stringify(s);for(const amount of['0','-2','','x','0,001','Infinity'])assert.throws(()=>transferPatrimonyFunds(s,{...args,amount},now));assert.throws(()=>transferPatrimonyFunds(s,{...args,toId:'bank'},now));assert.throws(()=>transferPatrimonyFunds(s,{...args,toId:'missing'},now));s.patrimonioAutomatic={details:{bank:{blocked:true}}};assert.throws(()=>transferPatrimonyFunds(s,args,now),/MAPPING/);delete s.patrimonioAutomatic;assert.equal(JSON.stringify(s),before);});
test('deleted source transfer history remains available without duplicate audit rows',()=>{const s=state(),out=transferPatrimonyFunds(s,args,now);out.patrimonioEntries[0].deleted=true;out.patrimonioEntries[1].fundTransfersV1=[out.record];assert.equal(patrimonyTransferHistory(out.patrimonioEntries).length,1);});
test('unrelated archived balances do not reappear in current month',()=>{const s=state();s.patrimonioEntries.push({id:'old',name:'Vecchio',archived:true});s.patrimonioValues.old=9000;const out=transferPatrimonyFunds(s,args,now);assert.equal(out.patrimonioHistory['2026-10']._total,101100);assert(!Object.hasOwn(out.patrimonioHistory['2026-10'],'old'));assert.equal(out.patrimonioValues.old,9000);});
test('Home uses an inline transfer worklet and keeps the saved layout as its source',()=>{
 const home=fs.readFileSync(new URL('../src/sezioni.tsx',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../src/app.tsx',import.meta.url),'utf8');
 const dialog=fs.readFileSync(new URL('../src/sections/PatrimonyTransferDialog.tsx',import.meta.url),'utf8');
 assert.match(home,/w.type === "button_transfer".*<PatrimonyTransferWorklet/);
 assert.match(home,/normalizeWorklets\(homeWorklets, true\)/);
 assert.match(app,/id: "home_button_transfer", type: "button_transfer", size: "1x"/);
 assert.match(dialog,/const flow=useTransfer\(\{\.\.\.draft,date:size==='2x'\?draft.date:civilToday\(\)\}/);
});
test('actual delayed account payload pairs current Patrimonio links, zero balances and transfers with their current timestamps',async()=>{const source=fs.readFileSync(new URL('../src/app.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let save;function find(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='saveToFirestore')save=n;ts.forEachChild(n,find)}find(ast);assert(save);const decl=name=>save.body.statements.find(s=>ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>d.name.getText(ast)===name));const snapshot=decl('latestPatrimonySaveV1');assert(snapshot);assert(snapshot.getStart(ast)>source.indexOf('await fainanceEncryptSensitiveData',save.getStart(ast)));const payload=decl('savePayload').declarationList.declarations.find(d=>d.name.getText(ast)==='savePayload').initializer;const keys=['patrimonioValues','patrimonioAreas','patrimonioEntries','patrimonioHistory','patrimonioNotes','patrimonioCatalogUpdatedAt','patrimonioDataUpdatedAt'];const props=payload.properties.filter(p=>keys.includes(p.name?.getText(ast))).map(p=>p.getText(ast));assert.equal(props.length,7);let release;const stored={},timestamps={};const context={waitEncryption:new Promise(r=>release=r),readUserLocalJson:(k,f)=>k in stored?structuredClone(stored[k]):f,readUserLocalUpdatedAt:k=>timestamps[k]||0,patrimonioAreas:[{id:'stale-area'}],patrimonioEntries:[{id:'stale-entry'}],patrimonioValues:{old:50},patrimonioHistory:{old:{old:50}},patrimonioNotes:{old:'stale'}};const script=ts.transpileModule('async function reproduce(){await waitEncryption;'+snapshot.getText(ast)+decl('patrimonioCatalogTs').getText(ast)+decl('patrimonioDataTs').getText(ast)+'return {'+props.join(',')+'};}reproduce();',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;const result=vm.runInNewContext(script,context);Object.assign(stored,{patrimonio_areas_v1:[],patrimonio_entries_v1:[{id:'new',balanceLink:{enabled:true,checkpoints:[{amount:0,methodIds:['cash']}]},fundTransfersV1:[{id:'transfer-live'}]}],patrimonio_values_v1:{new:0,credit:-500},patrimonio_history_v1:{'2026-10':{new:0,credit:-500}},patrimonio_notes_v1:{new:'current'}});timestamps.patrimonio_catalog_v2=20;timestamps.patrimonio_data_v2=21;release();const actual=JSON.parse(JSON.stringify(await result));assert.deepEqual(actual.patrimonioEntries,stored.patrimonio_entries_v1);assert.deepEqual(actual.patrimonioAreas,[]);assert.deepEqual(actual.patrimonioValues,{new:0,credit:-500});assert.deepEqual(actual.patrimonioHistory,stored.patrimonio_history_v1);assert.deepEqual(actual.patrimonioNotes,{new:'current'});assert.equal(actual.patrimonioCatalogUpdatedAt,20);assert.equal(actual.patrimonioDataUpdatedAt,21);});

test('a dated transfer updates known history and current linked balances exactly once',()=>{
 const source=state();
 source.patrimonioHistory['2026-09']={cash:900,bank:100000,_total:100900,_savedAt:'2026-09-30T22:00:00Z'};
 const [from,to]=source.patrimonioEntries;
 const before=source.patrimonioHistory['2026-09'];
 const dated=transferPatrimonyFunds(source,{id:'dated',fromId:String(from.id),toId:String(to.id),amount:200,date:'2026-09-25'},now);
 assert.equal(dated.record.date,'2026-09-25');
 assert.equal(dated.patrimonioValues[from.id],Number(source.patrimonioValues[from.id])-200);
 assert.equal(dated.patrimonioHistory['2026-09']._total,before._total);
 assert.throws(()=>transferPatrimonyFunds(source,{id:'future',fromId:String(from.id),toId:String(to.id),amount:10,date:'2026-12-01'},now),/TRANSFER_DATE/);
});

test('legacy transfer snapshots no longer bake a deleted cash effect into opening balance',()=>{
 const first='2026-10-29',saved='2026-11-04T12:37:53.964Z',day='2026-11-04';
 const transfer={id:'qa-transfer',fromId:'cash',toId:'wallet',fromName:'Cash',toName:'Wallet',date:day,amount:100000,createdAt:saved,before:{cash:900,wallet:0},after:{cash:-99100,wallet:100000}};
 const entries=[{id:'cash',name:'Cash',fundTransfersV1:[transfer],balanceLink:{enabled:true,version:1,checkpoints:[
  {date:first,amount:900,methodIds:['cash'],savedAt:first+'T18:00:00Z',baselineCents:0},
  {date:day,amount:-99100,methodIds:['cash'],savedAt:saved,baselineCents:0,shareBaselineIds:[]},
 ]}},{id:'wallet',name:'Wallet'}];
 const state={patrimonioMode:'entrambe',patrimonioEntries:entries,patrimonioValues:transfer.after,patrimonioHistory:{'2026-11':{...transfer.after,_total:900,_savedAt:saved,_automatic:{cash:true}}}};
 const before=derivePatrimony({entries,values:state.patrimonioValues,history:state.patrimonioHistory,mode:'entrambe',today:day});
 assert.equal(before.values.cash,-99100);
 const edited=revisePatrimonyTransfer(state,transfer.id,{date:'2026-10-31',fromId:'cash',toId:'wallet',amount:200},'2026-11-04T15:00:00Z');
 let projected=derivePatrimony({entries:edited.patrimonioEntries,values:edited.patrimonioValues,history:edited.patrimonioHistory,mode:'entrambe',today:day});
 assert.equal(projected.history['2026-10'].cash,700);
 assert.equal(projected.values.cash,700);
 assert.equal(patrimonyTransferHistory(edited.patrimonioEntries).length,1);
 const deleted=revisePatrimonyTransfer({...state,...edited},transfer.id,null,'2026-11-04T15:10:00Z');
 projected=derivePatrimony({entries:deleted.patrimonioEntries,values:deleted.patrimonioValues,history:deleted.patrimonioHistory,mode:'entrambe',today:day});
 assert.equal(projected.values.cash,900);
 assert.equal(projected.history['2026-10'].cash,900);
 assert.equal(projected.values.wallet,0);
 assert.equal(patrimonyTransferHistory(deleted.patrimonioEntries).length,0);
});

