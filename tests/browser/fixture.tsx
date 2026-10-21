import {ToolsPanel} from '../../src/sections/ToolsPanel';
import { AutomaticRulesPanel } from '../../src/sections/AutomaticRulesPanel';
import { SavingsClosurePanel, SavingsDeficitsPanel } from '../../src/sections/SavingsClosurePanel';
import { createSavingsBucket } from '../../src/finance/savingsBuckets';
import { saveSavingsEntry } from '../../src/finance/savingsLedger';
import { goalSavedAmount } from '../../src/finance/savingsGoals';
import { useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { AppCtx, useStorage } from '../../src/core';
import { GlobalToastHost, publishFainanceToast } from '../../src/ui/appInfrastructure';
import { PeriodPreferences } from '../../src/settings/PeriodPreferences';
import { createFinanceEvolution, migrateFinanceEvolution } from '../../src/data/financeEvolution';
import { createAccountingPeriod } from '../../src/finance/accountingPeriod';
import { periodLabel } from '../../src/finance/periodEngine';
import { BudgetPlanPanel, GoalsPanel } from '../../src/widget';
import { budgetForPeriod, saveBudgetForPeriod, resetBudgetForPeriod } from '../../src/finance/budgetEngine';
import { translateFainanceText } from '../../src/traduzioni';
const legacyPlan = { income:3000, manualIncome:3000, items:[{catId:1,amount:200,pct:0}] };
function StorageFixture() {
  const [rows,setRows]=useStorage('verification_transactions_v1',[]);
  const [description,setDescription]=useState('');
  return <section>
    <h2>Verifica salvataggio e avviso</h2>
    <label>Descrizione di prova<input value={description} onChange={event=>setDescription(event.target.value)}/></label>
    <button onClick={()=>publishFainanceToast({id:Date.now(),compact:true,type:'error',color:'#E24B4A',duration:15000,text:'Sincronizzazione cloud non riuscita. I dati restano salvati sul dispositivo e verrà effettuato un nuovo tentativo.'})}>Mostra avviso di prova</button>
    <button onClick={()=>{setRows(previous=>[...previous,{description:description+' A'}]);setRows(previous=>[...previous,{description:description+' B'}]);}}>Salva due inserimenti rapidi</button>
    <button onClick={()=>setRows([])}>Pulisci dati di prova</button>
    <output aria-label="Inserimenti di prova">{rows.map(row=>row.description).join(' · ')}</output>
    <GlobalToastHost/>
  </section>;
}
function ClosureFixture(){
  function seed(){let f=createFinanceEvolution();for(const [id,name] of [['a','Vacanze P6'],['b','Emergenze P6']])f=createSavingsBucket(f,{id,name,currency:'EUR'});return f;}
  const [finance,setFinance]=useStorage('verification_closure_p6',seed());
  const [negative,setNegative]=useState(false);
  const [backup,setBackup]=useState('');
  const ctx:any={financeEvolution:finance,accountingPeriod:createAccountingPeriod(finance.period),lang:'it',currency:'EUR',goals:[],legacyBudgetPlan:{income:1000,items:[{catId:1,amount:500}],savingsPlannedAmounts:{a:300,b:200}},expenses:[{date:'2026-08-05',amount:negative?1120.35:600}],incomes:[{date:'2026-08-01',amount:1000}],setFinanceEvolution:next=>setFinance(old=>migrateFinanceEvolution(typeof next==='function'?next(old):next)),cardBg:'#fff',textC:'#202030',subC:'#666',borderC:'#ddd',inp:{padding:10,border:'1px solid #aaa',borderRadius:8}};
  return <AppCtx.Provider value={ctx}><section aria-label="Prova chiusura P6" style={{padding:12,maxWidth:380,margin:'auto'}}><h2>Prova chiusura P6</h2>
    <button onClick={()=>{setNegative(false);setFinance(saveSavingsEntry(seed(),{id:'manual',bucketId:'a',currency:'EUR',date:'2026-08-10',source:'planned',amountMinor:10000},'2026-08-10T12:00:00Z'));}}>Prepara risparmio P6</button>
    <button onClick={()=>{const f=seed();f.savings.buckets[0].balanceMinor=8000;f.savings.buckets[1].balanceMinor=2000;setFinance(f);setNegative(true);}}>Prepara deficit P6</button>
    <button onClick={()=>setBackup(JSON.stringify(finance))}>Backup P6</button><button disabled={!backup} onClick={()=>setFinance(migrateFinanceEvolution(JSON.parse(backup)))}>Restore P6</button>
    <SavingsClosurePanel periodKey="2026-08"/><SavingsDeficitsPanel/>
    <output aria-label="Saldi P6">{finance.savings.buckets.map(b=>b.name+': '+b.balanceMinor/100).join(' · ')}</output>
  </section></AppCtx.Provider>;
}

function RulesFixture(){
  const [finance,setFinance]=useStorage('verification_automatic_rules_v1',createFinanceEvolution());
  const [notice,setNotice]=useState('');const [plan,setPlan]=useState('premium');
  const ctx:any={financeEvolution:finance,setFinanceEvolution:value=>{const next=migrateFinanceEvolution(typeof value==='function'?value(finance):value);setFinance(next);},currentPlan:plan,lang:'it',cats:[{id:1,name:'Altro'},{id:2,name:'Sport'}],methods:[{id:1,name:'Carta'},{id:3,name:'Contanti'}],incomeTypes:[{id:'salary',name:'Stipendio'},{id:'gift',name:'Regalo'}],setToast:t=>setNotice(t.text||String(t)),cardBg:'#fff',textC:'#222',borderC:'#ddd',inp:{padding:10,border:'1px solid #aaa',borderRadius:8}};
  return <AppCtx.Provider value={ctx}><section aria-label="Prova regole" style={{maxWidth:340}}><label>Piano di prova<select value={plan} onChange={e=>setPlan(e.target.value)}><option value="free">Gratis</option><option value="base">Base</option><option value="premium">Completo</option></select></label><AutomaticRulesPanel/><output aria-label="Avviso piano">{notice}</output></section></AppCtx.Provider>;
}

function ToolsFixture(){
  const [finance,setFinance]=useStorage('verification_tools_v1',createFinanceEvolution()),[saved,setSaved]=useState<any[]>([]),[transfer,setTransfer]=useState<any>(null),[lang,setLang]=useState('it'),[dark,setDark]=useState(false);
  const [projects,setProjects]=useState(true);
  const ctx:any={financeEvolution:finance,setFinanceEvolution:fn=>setFinance(p=>migrateFinanceEvolution(typeof fn==='function'?fn(p):fn)),lang,dark,userId:'fixture-tools',currency:'EUR',secondaryCurrency:'USD',currentPlan:'premium',sym:'€',isMobile:true,defaultExpenseCat:1,defaultExpenseMethod:1,defaultIncomeType:'salary',catOrder:[],methodOrder:[],expenseGroups:[{id:'altro',name:'Altro'}],cats:[{id:1,name:'Altro',group:'altro'}],methods:[{id:1,name:'Carta'}],incomeTypes:[{id:'salary',name:'Stipendio'}],cardBg:dark?'#252535':'#fff',textC:dark?'#eee':'#222',subC:dark?'#bbb':'#666',borderC:dark?'#444':'#e8e8ed',confirmButtonColor:'#378ADD',secondaryButtonColor:'#5FAFE5',expenseColor:'#e65b59',incomeColor:'#3caa88',btnRadius:12,t:{},userKey:k=>'verification_tools_'+k,
  toolRateFetcher:async url=>({ok:true,json:async()=>({rates:String(url).endsWith('/USD')?{EUR:1/1.17,JPY:150}:String(url).endsWith('/JPY')?{EUR:1/175.5,USD:1/150}:{USD:1.17,JPY:175.5}})}),shareProjects:projects?[{id:'tool-share',name:'Progetto di prova'}]:[],shareSelectedProjectId:'tool-share',setToolShareDraft:setTransfer,setShareSelectedProjectId:()=>{},setTab:()=>{},setToast:()=>{},addExpenses:items=>{setSaved(p=>[...p,...items]);return true;},addIncomes:items=>{setSaved(p=>[...p,...items]);return true;}};
  return <AppCtx.Provider value={ctx}><section aria-label="Prova Tool" style={{maxWidth:360}}><label>Lingua Tool<select value={lang} onChange={e=>setLang(e.target.value)}>{['it','en','es','fr','de','pt','pl','nl','ro','el'].map(l=><option key={l}>{l}</option>)}</select></label><label><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)}/>Tema scuro Tool</label><label><input type="checkbox" checked={projects} onChange={e=>setProjects(e.target.checked)}/>Progetti Share Tool</label><ToolsPanel/><output aria-label="Transazioni Tool">{saved.map((x,i)=><p key={i}>{x.amount} {x.currency} · {x.methodId||x.type}</p>)}</output><output aria-label="Passaggio Share Tool">{transfer?JSON.stringify(transfer):''}</output></section></AppCtx.Provider>;
}

function Fixture() {
  const [goals,setGoals]=useStorage('verification_linked_goals',[{id:'trip',name:'Viaggio di prova',target:200,saved:40,icon:'🎯',color:'#6555BA'},{id:'home',name:'Casa di prova',target:1000,saved:10,icon:'🏠',color:'#378ADD'}]);
  const [financeEvolution, update] = useStorage('verification_finance_buckets_v1',createFinanceEvolution());
  const [backup, setBackup] = useState('');
  const [lang, setLang] = useState('it');
  const [dark, setDark] = useState(false);
  const accountingPeriod = useMemo(()=>createAccountingPeriod(financeEvolution.period),[financeEvolution]);
  const movements = [{ date: '2026-05-27', amount: 100 }, { date: '2026-06-26', amount: 25 }, { date: '2026-06-27', amount: 50 }];
  const ctx = { financeEvolution, accountingPeriod, lang, dark, goals, setGoals,
    goalSavedAmount:goal=>goalSavedAmount(financeEvolution,goal,'EUR'),
    legacyBudgetPlan:legacyPlan, curMonthKey:'2026-08', isMobile:true, sym:'€', currency:'EUR',
    fmt: value=>new Intl.NumberFormat(lang,{style:'currency',currency:'EUR'}).format(value),
    translateUiRuntimeText:value=>translateFainanceText(value,lang),
    cats:[{id:1,name:'Ristoranti',group:'personal',icon:'🍽️',color:'#7F77DD'}],
    expenseGroups:[{id:'personal',name:'Personale',icon:'👤',color:'#7F77DD'}],
    incomes:[{date:'2026-08-01',amount:3000}], expenses:[{date:'2026-08-02',amount:2800,catId:1}],
    budgetForPeriod:key=>budgetForPeriod(financeEvolution,legacyPlan,key),
    savePeriodBudget:(key,plan,scope)=>update(previous=>saveBudgetForPeriod(previous,legacyPlan,key,plan,scope)),
    resetPeriodBudget:key=>update(previous=>resetBudgetForPeriod(previous,key)),
    setFinanceEvolution: next => update(previous => migrateFinanceEvolution(typeof next==='function'?next(previous):next)),
    cardBg: dark?'#252535':'#fff', textC: dark?'#f3f3f6':'#202030', subC: dark?'#bcbcc7':'#666', borderC: dark?'#444':'#ddd',
    inp: { padding: 12, borderRadius: 8, border: '1px solid #999', background: dark?'#202030':'#fff', color: dark?'white':'#222' }, btnRadius: 12,
  };
  return <AppCtx.Provider value={ctx}><main style={{ fontFamily:'Arial,sans-serif', padding:16, maxWidth:620, margin:'auto', background:dark?'#171722':'#f5f6fa', color:ctx.textC }}>
    <h1 style={{fontSize:18}}>Verifica locale — dati sintetici</h1><RulesFixture/><ToolsFixture/><ClosureFixture/>
    <label>Lingua <select value={lang} onChange={e=>setLang(e.target.value)}>{['it','en','es','fr','de','pt','pl','nl','ro','el'].map(value=><option key={value}>{value}</option>)}</select></label>
    <label style={{marginLeft:12}}><input type="checkbox" checked={dark} onChange={e=>setDark(e.target.checked)}/>Tema scuro</label>
    <PeriodPreferences />
    <section aria-label="Stipendio del 27 agosto"><h2>Stipendio del 27 agosto — 1850 €</h2>{["2026-08","2026-09","2026-10"].map(key=><p key={key}>{periodLabel(key,lang)}: {accountingPeriod.total([{date:"2026-08-27",amount:1850}],key,"reale")} €</p>)}</section>
    <h2 style={{fontSize:16}}>Aggregazione giugno 2026</h2>
    <p>Movimenti di prova: 27 maggio = 100; 26 giugno = 25; 27 giugno = 50.</p>
    <output aria-label="Totale giugno">{accountingPeriod.total(movements,'2026-06')}</output>
    <p aria-label="Periodo salvato">{financeEvolution.period.mode} / {financeEvolution.period.startDay}</p>
    <button onClick={()=>setBackup(JSON.stringify(financeEvolution))}>Salva backup di prova</button>
    <button disabled={!backup} onClick={()=>update(migrateFinanceEvolution(JSON.parse(backup)))}>Ripristina backup di prova</button>
    <BudgetPlanPanel />
    <GoalsPanel />
    <output aria-label="Budget salvati">{['2026-07','2026-08','2026-09','2026-10'].map(key=>`${key}: ${ctx.budgetForPeriod(key).items[0].amount}`).join(' · ')}</output>
    <StorageFixture/>
  </main></AppCtx.Provider>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
