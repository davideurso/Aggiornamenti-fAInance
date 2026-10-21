const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '..');
async function run() {
  const finance = await import(pathToFileURL(path.join(root,'src/finance/financialCalendar.js')));
  const {calendarPayerName, buildFinancialCalendar} = finance;
  assert.equal(calendarPayerName({name:'user',displayName:'Maria Rossi'}),'Maria Rossi');
  assert.equal(calendarPayerName({name:'user',firstName:'Maria',lastName:'Rossi'}),'Maria Rossi');
  assert.equal(calendarPayerName({name:'@maria',username:'maria',email:'maria@example.test'}),'');
  assert.equal(calendarPayerName({name:'maria',username:'maria'}),'');
  assert.equal(calendarPayerName({name:'user',uid:'other'}, {name:'Davide Urso'}, 'viewer'),'');
  assert.equal(calendarPayerName({name:'user',uid:'viewer'}, {name:'Davide Urso'}, 'viewer'),'Davide Urso');
  assert.equal(calendarPayerName({name:'Amico',kind:'fake'}),'Amico');
  const project={id:'p',participants:[{id:'v',uid:'viewer',name:'Viewer'},{id:7,uid:'other',name:'user',displayName:'Maria Rossi'}],activities:[{id:'a',date:'2026-09-01',amount:100,paidBy:'7',shares:{v:40,7:60}}]};
  const input={month:'2026-09',today:'2026-10-15',shareProjects:[project],userId:'viewer',currentUser:{name:'Davide Urso'}};
  const before=JSON.stringify(input);
  const result=buildFinancialCalendar(input);
  assert.equal(result.expense,40);
  assert.equal(result.days[0].entries[0].metadata.paidBy,'Maria Rossi');
  assert.equal(JSON.stringify(input),before,'read-only projection');
  const imported=buildFinancialCalendar({...input,expenses:[{id:'imp',date:'2026-09-01',amount:40,shareProjectId:'p',shareActivityId:'a',_sharePaidBy:'user'}]});
  assert.equal(imported.days[0].entries.length,1,'no duplicate live/imported Share');
  assert.equal(imported.days[0].entries[0].metadata.paidBy,'Maria Rossi');
  const unknown={...project,participants:[project.participants[0],{id:7,name:'user',uid:'other'}]};
  assert.equal(buildFinancialCalendar({...input,shareProjects:[unknown]}).days[0].entries[0].metadata.paidBy,'—');
  assert.equal(buildFinancialCalendar({...input,shareProjects:[unknown],payerNames:{'["p","7"]':'Maria Rossi'}}).days[0].entries[0].metadata.paidBy,'Maria Rossi');
  // Execute the actual component with stateful hooks; exercise its select and navigation handlers.
  const source=fs.readFileSync(path.join(root,'src/sections/FinancialCalendarPanel.tsx'),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
  assert.equal(output.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
  const state=[];let cursor=0;const effects=[];
  const hooks={useState:init=>{const i=cursor++;if(!(i in state))state[i]=typeof init==='function'?init():init;return[state[i],v=>{state[i]=v}];},useMemo:fn=>fn(),useRef:()=>({current:null}),useEffect:fn=>effects.push(fn)};
  const context={lang:'it',dark:false,expenses:[{id:'e',amount:12345.67,date:'2026-09-01'}],incomes:[],shareProjects:[],sym:'€',fmt:()=>{throw Error('Calendar must enforce whole units');}};
  const box={exports:{}};
  new Function('require','exports','module',output.outputText)(name=>name==='react'?hooks:name==='../core'?{useApp:()=>context}:name.includes('FinancialForecastPanel')?{FinancialForecastPanel:()=>null,forecastWords:()=>Array.from({length:12},(_,i)=>i===11?'Bilancio cumulativo previsto':'')}:name.includes('financialCalendar.js')?finance:name.endsWith('.css')?{}:require(name),box.exports,box);
  function render(){cursor=0;return box.exports.FinancialCalendarPanel();}
  function all(node,out=[]){if(!node||typeof node!=='object')return out;if(Array.isArray(node)){for(const n of node)all(n,out);return out;}out.push(node);all(node.props?.children,out);return out;}
  function text(n){if(n==null||typeof n==='boolean')return '';if(typeof n==='string'||typeof n==='number')return String(n);if(Array.isArray(n))return n.map(text).join('');return text(n.props?.children);}
  let tree=render(), select=all(tree).find(n=>n.type==='select');
  const options=all(select).filter(n=>n.type==='option');
  assert.equal(options.length,73);assert(options.some(n=>n.props.value==='2026-09'));
  select.props.onChange({target:{value:'2026-09'}});
  tree=render();
  assert.equal(all(tree).find(n=>n.type==='select').props.value,'2026-09');
  assert(text(tree).includes('Settembre 2026'));
  const amount=all(tree).find(n=>String(n.props?.className).includes('fc-day-amount'));
  assert.equal(text(amount),'€ 12.346');
  const next=all(tree).filter(n=>n.props?.className==='fc-month-arrow')[1];next.props.onClick();
  assert.equal(all(render()).find(n=>n.type==='select').props.value,'2026-10');
  all(render()).find(n=>n.type==='select').props.onChange({target:{value:'2027-01'}});
  assert.equal(all(render()).find(n=>n.type==='select').props.value,'2027-01');
  all(render()).find(n=>n.type==='select').props.onChange({target:{value:'2099-01'}});
  assert.equal(all(render()).find(n=>n.type==='select').props.value,'2027-01','range guard');
  context.lang='en';
  assert(text(render()).includes('January 2027'));
  context.lang='it';context.dark=true;
  assert.equal(render().props.className,'fc-panel fc-dark');
  const css=fs.readFileSync(path.join(root,'src/sections/financialCalendar.css'),'utf8');
  for(const cls of ['fc-day-number','fc-day-amount'])assert.match(css,new RegExp('\\.'+cls+'\\{[^}]*font-weight:400'));
  assert(!/\.fc-day-amount\{[^}]*text-overflow:ellipsis/.test(css),'full integers remain visible');
  console.log('[OK] Calendar: whole numbers, working month/year selection, bounds, themes, Share payer identity, import deduplication and read-only data.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
