import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
import {plannedSavingScope,softenChartColor} from '../src/ui/workletIntegrity.js';
const keys=Array.from({length:12},(_,i)=>'2026-'+String(i+1).padStart(2,'0')),plan={income:5000,items:[{catId:1,amount:1000}]};
test('legacy current Budget is never retroactively multiplied over twelve months',()=>{
 const r=plannedSavingScope({keys,currentKey:'2026-10',finance:{budget:{standardVersions:[{from:'0001-01',plan}]}},getPlan:()=>plan});
 assert.deepEqual(r.keys,['2026-10']);assert.equal(r.saving,4000);assert(r.limited);
});
test('only dated supported budgets are compared and missing plans are unavailable',()=>{
 const r=plannedSavingScope({keys,currentKey:'2026-10',finance:{budget:{standardVersions:[{from:'2026-10',plan}]}},getPlan:()=>plan});assert.deepEqual(r.keys,['2026-10','2026-11','2026-12']);assert.equal(r.saving,12000);
 const no=plannedSavingScope({keys,currentKey:'2026-10',getPlan:()=>({income:5000,items:[]})});assert.equal(no.saving,null);assert.equal(no.status,'N_D');
});
test('monthly overrides retain amounts and colour smoothing does not alter catalog colours',()=>{
 const source='#123456';assert.notEqual(softenChartColor(source),source);assert.equal(source,'#123456');assert.match(softenChartColor(source),/^#[a-f0-9]{6}$/);
 const r=plannedSavingScope({keys:['2026-09','2026-10'],currentKey:'2026-10',finance:{budget:{overrides:{'2026-09':plan,'2026-10':plan}}},getPlan:key=>({...plan,income:key==='2026-09'?3000:5000})});assert.equal(r.saving,6000);
});
const source=fs.readFileSync('src/sezioni.tsx','utf8'),ast=ts.createSourceFile('s.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function fn(name,env){let node;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)node=n;ts.forEachChild(n,walk);}walk(ast);assert(node);return new Function(...Object.keys(env),ts.transpileModule(node.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+';return '+name)(...Object.values(env));}
test('photo upload executes the authenticated transport with token refresh, same body and single retry',async()=>{
 let refreshes=[],requests=[];const body='{"imageDataUrl":"data:image/jpeg;base64,SYNTHETIC"}';
 const api=fn('authenticatedAiFetch',{fbAuth:{currentUser:{uid:'test-user',getIdToken:async force=>(refreshes.push(force),force?'fresh':'old')},authStateReady:async()=>{}},c:{userId:'test-user'},fetch:async(_,options)=>(requests.push(options),{status:requests.length===1?401:200})});
 const r=await api('test://photo',{method:'POST',headers:{'Content-Type':'application/json'},body});
 assert.equal(r.status,200);assert.deepEqual(refreshes,[false,true]);assert(requests.every(x=>x.body===body));assert.equal(requests[1].headers.Authorization,'Bearer fresh');
 const documentNode=(()=>{let out;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='analyzeFinanceDocument')out=n;ts.forEachChild(n,walk);}walk(ast);return out;})();
 assert(documentNode.getText(ast).includes('await authenticatedAiFetch(AI_AGENT_ENDPOINT'));assert(!documentNode.getText(ast).includes('await fetch(AI_AGENT_ENDPOINT'));
});
test('photo is not uploaded under another account after a native activity resumes',async()=>{
 let calls=0;const api=fn('authenticatedAiFetch',{fbAuth:{currentUser:{uid:'other',getIdToken:async()=>''},authStateReady:async()=>{}},c:{userId:'expected'},fetch:async()=>{calls++;}});
 await assert.rejects(api('test://photo',{body:'private'}));assert.equal(calls,0);
});
test('all group worklet labels and Other use the real catalogue renderer',()=>{
 // Execute its real JSX transpiled with classic factory.
 let node;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='plainOrCatalogLabel')node=n;ts.forEachChild(n,walk);}walk(ast);
 const code=ts.transpileModule(node.getText(ast),{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;
 const render=new Function('React','CatalogLabel','L',code+';return plainOrCatalogLabel;')({createElement:(type,props)=>({type,props})},'catalog',x=>x);
 assert.equal(render({icon:'📦'},'📁','Altro').type,'catalog');
 assert(!source.includes('return g.name || L("Altro");'));
});

test('all named catalogue options throughout the app declare their icon reference',()=>{
 function scan(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?scan(dir+'/'+e.name):e.name.endsWith('.tsx')?[dir+'/'+e.name]:[]);}
 let count=0;
 for(const file of scan('src')){
  const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function walk(n){if(ts.isJsxElement(n)&&n.openingElement.tagName.getText(ast)==='option'){
   const body=n.children.map(x=>x.getText(ast)).join('');
   if(/\b[A-Za-z_$][\w$]*\.(?:name|label|title)\b/.test(body)){count++;assert(n.openingElement.attributes.getText(ast).includes('data-fainance-icon-ref'),file+': unprotected catalogue option');}
  }ts.forEachChild(n,walk);}walk(ast);
 }
 assert(count>=52);
});
test('JSX bootstrap does not eagerly import Firebase or the account-backed icon library',()=>{
 const visited=new Set();
 function walk(file){if(visited.has(file))return;visited.add(file);const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
  for(const n of ast.statements){if(!ts.isImportDeclaration(n))continue;const name=n.moduleSpecifier.text;assert(!/firebase|customIconLibrary/.test(name),'Eager runtime dependency '+name);
   if(name.startsWith('.')){const base=pathResolve(file,name),target=[base,base+'.ts',base+'.tsx'].find(f=>fs.existsSync(f));if(target&&!target.endsWith('.json'))walk(target);}
  }
 }
 function pathResolve(file,name){const parts=(file.slice(0,file.lastIndexOf('/')+1)+name).split('/'),out=[];for(const part of parts){if(part==='..')out.pop();else if(part!=='.')out.push(part);}return out.join('/');}
 walk('src/icons/runtime/jsx-runtime.ts');
});
