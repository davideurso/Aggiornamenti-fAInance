const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=process.cwd(),ts=require(path.join(root,'node_modules/typescript'));
const source=process.env.FAINANCE_TEST_SOURCE||root;
const text=fs.readFileSync(path.join(source,'src/sezioni.tsx'),'utf8');
const ast=ts.createSourceFile('sezioni.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='shareBalanceDetails')fn=node;ts.forEachChild(node,visit);}visit(ast);assert(fn);
const code=ts.transpileModule(fn.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const engine={};new Function('exports',ts.transpileModule(fs.readFileSync(path.join(root,'src/finance/periodEngine.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(engine);
const safeNum=x=>Number.isFinite(Number(x))?Number(x):0;
const fixture=activities=>({participants:[{id:'me',name:'Tu'},{id:'other',name:'Altro'}],activities});
function calculate(activities,date,settings={mode:'calendar',startDay:1},withCurrent=true){
 const accountingPeriod={forDate:d=>engine.periodForDate(d,settings),forKey:k=>engine.periodForKey(k,settings)};
 const period=accountingPeriod.forDate(date);
 const impl=new Function('ctx','L','safeNum','currentBalancePeriod','accountingPeriod','balancePeriodKey','curMonthKey','todayStr',code+';return shareBalanceDetails;')({userId:'uid'},x=>x,safeNum,withCurrent?period:undefined,accountingPeriod,period.key,period.key,()=>date);
 const project=fixture(activities),before=JSON.stringify(project),value=impl(project);assert.equal(JSON.stringify(project),before);return value;
}
const expense=(date,amount)=>({kind:'expense',date,amount,paidBy:'me',shares:{me:amount/2,other:amount/2}});
let checks=0;
const cases=[
 ['calendar actual context',[expense('2026-10-18',167.68)],'2026-10-19',undefined,167.68],
 ['calendar inclusive bounds',[expense('2026-09-30',900),expense('2026-10-01',10),expense('2026-10-31',20),expense('2026-11-01',800)],'2026-10-19',undefined,30],
 ['financial day 27',[expense('2026-09-26',900),expense('2026-09-27',10),expense('2026-10-26',20),expense('2026-10-27',800)],'2026-10-19',{mode:'financial',startDay:27},30],
 ['financial day 15',[expense('2026-10-14',900),expense('2026-10-15',10),expense('2026-11-14',20),expense('2026-11-15',800)],'2026-10-19',{mode:'financial',startDay:15},30],
 ['year boundary',[expense('2026-12-31',20),expense('2027-01-01',7)],'2027-01-02',undefined,7],
 ['leap day',[expense('2024-02-29',29),expense('2024-03-01',999)],'2024-02-20',undefined,29],
 ['settlements excluded',[expense('2026-10-18',100),{kind:'settlement',date:'2026-10-18',amount:50,from:'me',to:'other'}],'2026-10-19',undefined,100],
 ['legacy expense without kind',[{date:'2026-10-18T12:00:00Z',amount:40},expense('2026-10-19',-5)],'2026-10-19',undefined,35],
 ['missing invalid out of period',[{amount:10},{date:'not-a-date',amount:20},expense('2026-10-18',NaN)],'2026-10-19',undefined,0],
 ['empty project',[],'2026-10-19',undefined,0]
];
for(const [name,activities,date,settings,total]of cases)for(const withCurrent of [true,false]){const value=calculate(activities,date,settings,withCurrent);assert(Math.abs(value.monthTotal-total)<1e-8,name+' total '+value.monthTotal);checks++;}
const v=calculate([expense('2026-10-18',100)],'2026-10-19');assert.equal(v.balance,50);assert.equal(v.relations.length,1);checks++;
console.log(JSON.stringify({shareWorkletPeriodChecks:checks,status:'passed'}));
