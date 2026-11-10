const fs=require('fs'),path=require('path'),assert=require('assert/strict');
let ts;try{ts=require('typescript');}catch{ts=require('C:/Users/Davide/Documents/Progetti/01 - fAInance/App/node_modules/typescript');}
const root=fs.existsSync(path.resolve(__dirname,'../src/widget.tsx'))?path.resolve(__dirname,'..'):'C:/Users/Davide/Documents/Progetti/01 - fAInance/App';
function functionText(source,name){const f=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nodes=[];function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)nodes.push(n);ts.forEachChild(n,visit);}visit(f);assert.equal(nodes.length,1,name);return nodes[0].getText(f);}
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function load(rel,deps={}){const module={exports:{}};new Function('require','module','exports',compile(fs.readFileSync(path.join(root,rel),'utf8')))(name=>{if(name in deps)return deps[name];throw Error('Unexpected import '+name);},module,module.exports);return module.exports;}
(async()=>{
 const tools=await import(require('url').pathToFileURL(path.join(root,'src/finance/tools.js')).href);
 const h=load('src/data/importCurrency.ts',{'../finance/tools':tools});
 const core=fs.readFileSync(path.join(root,'src/core.tsx'),'utf8'),f=ts.createSourceFile('core.tsx',core,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let expression;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(f)==='CURRENCIES')expression=n.initializer.getText(f);ts.forEachChild(n,walk);}walk(f);assert(expression);const defs=new Function('return '+expression)();
 for(const header of ['Valuta','Currency','Currency Code','Codice valuta','Währung'])assert.equal(h.findImportCurrencyColumn(['Data',header,'Importo']),header);
 assert.equal(h.findImportCurrencyColumn(['Exchange rate','Data']),'');
 assert.equal(h.normalizeImportCurrency(' usd ','EUR',defs),'USD');assert.equal(h.normalizeImportCurrency('Euro','USD',defs),'EUR');assert.equal(h.normalizeImportCurrency('€','USD',defs),'EUR');assert.equal(h.normalizeImportCurrency('','GBP',defs),'GBP');
 for(const value of ['$','ABC','not a currency'])assert.throws(()=>h.normalizeImportCurrency(value,'EUR',defs),/IMPORT_CURRENCY_INVALID/);
 const input=[{amount:100,currency:'USD',date:'2026-10-20',rateizzato:true,rate:12},{amount:25,currency:'USD'},{amount:50,currency:'GBP'},{amount:2.12345,currency:''}];const before=JSON.stringify(input),calls=[];
 const out=await h.convertImportedCurrencyRows(input,'EUR',defs,async(from,to)=>{calls.push([from,to]);return from==='USD'?0.8:1.2;},{plan:'premium',secondary:''});
 assert.doesNotThrow(()=>h.assertImportCurrencyContext(out,'EUR',{plan:'premium',secondary:''}));
 assert.throws(()=>h.assertImportCurrencyContext(out,'GBP',{plan:'premium',secondary:''}),/IMPORT_CURRENCY_BASE_CHANGED/);
 assert.throws(()=>h.assertImportCurrencyContext(out,'EUR',{plan:'free',secondary:''}),/IMPORT_CURRENCY_PLAN/);
 assert.deepEqual(calls.sort(),[['GBP','EUR'],['USD','EUR']]);assert.equal(JSON.stringify(input),before);
 assert.deepEqual(out.map(x=>x.amount),[80,20,60,2.12345]);assert.equal(out[0].originalAmount,100);assert.equal(out[0].baseCurrency,'EUR');assert.equal(out[0].currency,'USD');assert.equal(out[0].rate,12);assert.equal(out[0].exchangeRate,0.8);assert.equal(out[3].originalAmount,null);
 const widget=fs.readFileSync(path.join(root,'src/widget.tsx'),'utf8');const payloadFactory=new Function('importType','importedCurrencyFields',compile(functionText(widget,'importedMovementRows'))+';return importedMovementRows;');
 for(const direction of ['expense','income']){const payload=payloadFactory(direction,h.importedCurrencyFields)(out);assert.equal(payload[0].currency,'USD');assert.equal(payload[0].amount,80);assert.equal(payload[0].originalAmount,100);assert.equal(payload[0].baseAmount,80);assert.equal(payload[0].exchangeRate,0.8);}
 let fetches=0;await h.convertImportedCurrencyRows([{amount:2}],'EUR',defs,async()=>{fetches++;throw Error('must not fetch');},{plan:'free',secondary:''});assert.equal(fetches,0);
 await assert.rejects(h.convertImportedCurrencyRows(input,'EUR',defs,async()=>0.8,{plan:'free',secondary:''}),/IMPORT_CURRENCY_PLAN/);
 await h.convertImportedCurrencyRows([{amount:1,currency:'USD'}],'EUR',defs,async()=>0.8,{plan:'base',secondary:'USD'});
 await assert.rejects(h.convertImportedCurrencyRows([{amount:1,currency:'GBP'}],'EUR',defs,async()=>1.2,{plan:'base',secondary:'USD'}),/IMPORT_CURRENCY_PLAN/);
 for(const plan of ['premium','complete','completo'])await h.convertImportedCurrencyRows([{amount:1,currency:'GBP'}],'EUR',defs,async()=>1.2,{plan,secondary:''});
 for(const quote of [0,-1,NaN,Infinity])await assert.rejects(h.convertImportedCurrencyRows([{amount:2,currency:'USD'}],'EUR',defs,async()=>quote,{plan:'premium',secondary:''}),/IMPORT_CURRENCY_RATE/);
 await assert.rejects(h.convertImportedCurrencyRows(input,'EUR',defs,async()=>{throw Error('offline');},{plan:'premium',secondary:''}),/offline/);
 await assert.rejects(h.convertImportedCurrencyRows([{amount:0.001,currency:'USD'}],'EUR',defs,async()=>0.1,{plan:'premium',secondary:''}),/IMPORT_CURRENCY_AMOUNT/);
 const yen=await h.convertImportedCurrencyRows([{amount:1.23,currency:'USD'}],'JPY',defs,async()=>150,{plan:'premium',secondary:''});assert.equal(yen[0].amount,185);
 const bhd=await h.convertImportedCurrencyRows([{amount:1.23,currency:'USD'}],'BHD',defs,async()=>0.376,{plan:'premium',secondary:''});assert.equal(bhd[0].amount,0.462);
 console.log('IMPORT_CURRENCY_OK: mapping, original/base amounts, actual movement payloads, quote deduplication, failure atomicity, plan limits, rounding and legacy no-column behavior');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
