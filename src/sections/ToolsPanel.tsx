import { readableDarkText } from '../ui/textContrast';
import {useEffect,useRef,useState} from 'react';
import {useApp,CURRENCIES,parseMoney,todayStr} from '../core';
import {AmountCalculatorButton,ExpenseForm,FainanceInfoPopover,FainancePickerModal,RecurringManager} from '../widget';
import {toolsText} from '../i18n/toolsTranslations';
import {rulesText} from '../i18n/automaticRulesTranslations';
import {AutomaticRulesPanel} from './AutomaticRulesPanel';
import {translateFainanceText} from '../traduzioni';
import {
  addToolHistory,
  pruneToolHistory,
  orderedToolCurrencies,
  roundCurrency,
  currencyDigits,
  fetchToolRate,
  invertToolQuote,
  toolCurrencyAllowed,
  calculateSavingsPlan,
  calculateSavingsHorizon,
  calculatePurchaseVsSavings,
  calculatePurchaseInstallmentPlan,
  calculateInflationPower,
  calculateInflationSnapshot,
} from '../finance/tools';
import './tools.css';

function localNumber(value:any){
  const raw=String(value??'').trim().replace(/\s/g,'').replace(',','.');
  if(!raw)return NaN;
  return Number(raw);
}
function nextYearDate(){const d=new Date();d.setFullYear(d.getFullYear()+1);return d.toISOString().slice(0,10);}

export function ToolsPanel(){
  const ctx:any=useApp(),T=(key:any)=>toolsText(ctx.lang||'it',key),L=(s:string)=>translateFainanceText(s,ctx.lang||'it');
  const pair=ctx.financeEvolution.tools.lastCurrencyPair||[ctx.currency,ctx.secondaryCurrency&&ctx.secondaryCurrency!==ctx.currency?ctx.secondaryCurrency:(ctx.currency==='USD'?'EUR':'USD')];
  const [page,setPage]=useState('calculator'),[seed,setSeed]=useState({value:'',key:0}),[calc,setCalc]=useState<number|null>(null);
  const [from,setFrom]=useState(pair[0]),[to,setTo]=useState(pair[1]),[amount,setAmount]=useState(''),[quote,setQuote]=useState<any>(null);
  const [picker,setPicker]=useState<string|null>(null),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[saved,setSaved]=useState(false);
  const [transaction,setTransaction]=useState<any>(null),[direction,setDirection]=useState('expense'),[project,setProject]=useState<string|null>(null),[sharePicker,setSharePicker]=useState(false);
  const [savingsMode,setSavingsMode]=useState<'byDate'|'byMonthly'>('byDate');
  const [savings,setSavings]=useState({goal:'',current:'',targetDate:nextYearDate(),monthlySavings:'',annualRate:'0'});
  const [purchaseMode,setPurchaseMode]=useState<'cash'|'installments'>('cash');
  const [purchase,setPurchase]=useState({goal:'',current:'',monthlySavings:'',purchaseAmount:'',installmentMonths:'12',installmentRate:'0'});
  const [inflationMode,setInflationMode]=useState<'cost'|'power'>('cost');
  const [inflation,setInflation]=useState({amount:'',inflationRate:'2.5',years:'10'});
  const request=useRef(0),abort=useRef<AbortController|null>(null);
  useEffect(()=>()=>{request.current++;abort.current?.abort();},[]);
  useEffect(()=>{
    const id=requestAnimationFrame(()=>{try{const active=document.activeElement as HTMLElement|null;if(active&&typeof active.blur==='function')active.blur();}catch{}});
    return()=>cancelAnimationFrame(id);
  },[page]);
  useEffect(()=>{
    const openToolPage=(event:any)=>{
      const target=String(event?.detail?.page||'');
      if(['calculator','converter','savings','buyVsSave','inflation','recurring','automaticRules'].includes(target)) changePage(target);
    };
    window.addEventListener('fainance:open-tool',openToolPage as EventListener);
    return()=>window.removeEventListener('fainance:open-tool',openToolPage as EventListener);
  },[]);

  const tools=pruneToolHistory(ctx.financeEvolution.tools),projects=(ctx.shareProjects||[]).filter(p=>p.id!=null);
  const style:any={'--tool-card':ctx.cardBg,'--tool-text':ctx.textC,'--tool-sub':ctx.subC||'#77808b','--tool-border':ctx.borderC,'--tool-primary':ctx.confirmButtonColor||'#378ADD','--tool-link':readableDarkText(ctx.confirmButtonColor||'#378ADD',ctx.dark),'--tool-on-primary':readableDarkText('#fff',ctx.dark,ctx.confirmButtonColor||'#378ADD'),'--tool-soft':ctx.dark?'#253445':'#edf5fc'};
  const number=(value:number,code?:string)=>new Intl.NumberFormat(ctx.lang||'it',{minimumFractionDigits:code?currencyDigits(code):0,maximumFractionDigits:code?currencyDigits(code):2}).format(value);
  const money=(value:number,code:string)=>`${number(value,code)} ${CURRENCIES.find(c=>c.code===code)?.symbol||code}`;
  const currencyFlag=(code:string)=>({EUR:'🇪🇺',USD:'🇺🇸',GBP:'🇬🇧',CHF:'🇨🇭',JPY:'🇯🇵',AUD:'🇦🇺',CAD:'🇨🇦',CNY:'🇨🇳',HKD:'🇭🇰',NZD:'🇳🇿',SEK:'🇸🇪',NOK:'🇳🇴',DKK:'🇩🇰',PLN:'🇵🇱',CZK:'🇨🇿',HUF:'🇭🇺',RON:'🇷🇴',BGN:'🇧🇬',TRY:'🇹🇷',BRL:'🇧🇷',MXN:'🇲🇽',ARS:'🇦🇷',CLP:'🇨🇱',COP:'🇨🇴',INR:'🇮🇳',KRW:'🇰🇷',SGD:'🇸🇬',THB:'🇹🇭',IDR:'🇮🇩',MYR:'🇲🇾',PHP:'🇵🇭',ZAR:'🇿🇦',AED:'🇦🇪',SAR:'🇸🇦',ILS:'🇮🇱',EGP:'🇪🇬',MAD:'🇲🇦'} as any)[String(code||'').toUpperCase()]||'💱';
  const mainCurrency=String(ctx.currency||'EUR');

  function invalidate(){request.current++;abort.current?.abort();setBusy(false);setError(false);setSaved(false);}
  function changeAmount(value){invalidate();setAmount(value);setQuote(null);}
  function rememberPair(a,b){ctx.setFinanceEvolution(p=>({...p,tools:{...p.tools,lastCurrencyPair:[a,b],recentCurrencies:[...new Set([a,b,...p.tools.recentCurrencies])].slice(0,8)}}));}
  function rememberRate(a,b,rate){const now=new Date().toISOString();ctx.setFinanceEvolution(p=>{const current=Array.isArray(p.tools.rateCache)?p.tools.rateCache:[],next=[{from:a,to:b,rate:Number(rate),createdAt:now},...current.filter(r=>!(String(r.from)===String(a)&&String(r.to)===String(b)))].slice(0,60);return {...p,tools:{...p.tools,rateCache:next,lastCurrencyPair:[a,b],recentCurrencies:[...new Set([a,b,...p.tools.recentCurrencies])].slice(0,8)}};});try{const bridge=(window as any)?.Capacitor?.Plugins?.WidgetBridge;if(bridge&&bridge.saveToolRate){bridge.saveToolRate({from:String(a),to:String(b),rate:Number(rate),createdAt:now}).catch(()=>{});}}catch{}}
  function chooseCurrency(code){const a=picker==='from'?code:from,b=picker==='to'?code:to;invalidate();setFrom(a);setTo(b);setQuote(null);setPicker(null);setSearch('');try{rememberPair(a,b);}catch{setError(true);}}
  function record(section,row){ctx.setFinanceEvolution(p=>({...p,tools:addToolHistory(p.tools,section,{...row,id:crypto.randomUUID()})}));setSaved(true);}
  function calculated(value){invalidate();try{record('calculator',{result:value});setCalc(value);setError(false);}catch{setError(true);setCalc(null);}}
  async function rate(a,b,signal){return fetchToolRate(a,b,ctx.toolRateFetcher||fetch,signal);}
  async function convert(a=from,b=to,input=amount,saveHistory=true){
    invalidate();const id=request.current,controller=new AbortController();abort.current=controller;
    const value=parseMoney(input);if(!String(input).trim()||!Number.isFinite(value)||value<0){setError(true);return;}
    setBusy(true);setQuote(null);const timer=setTimeout(()=>controller.abort(),15000);
    try{const fx=await rate(a,b,controller.signal);if(id!==request.current)return;const next={from:a,to:b,amount:value,result:roundCurrency(value*fx,b),rate:fx};rememberRate(a,b,fx);if(saveHistory)record('converter',next);setQuote(next);}
    catch{if(id===request.current)setError(true);}finally{clearTimeout(timer);if(id===request.current)setBusy(false);}
  }
  useEffect(()=>{
    if(page!=='converter')return;
    const raw=String(amount||'').trim();
    if(!raw){invalidate();setQuote(null);return;}
    const value=parseMoney(raw);
    if(!Number.isFinite(value)||value<0){invalidate();setQuote(null);setError(true);return;}
    const timer=setTimeout(()=>{convert(from,to,raw,false);},350);
    return ()=>clearTimeout(timer);
  },[page,amount,from,to]);
  function swap(){invalidate();if(quote){const next=invertToolQuote(quote);setFrom(next.from);setTo(next.to);setAmount(String(next.amount));try{record('converter',next);setQuote(next);}catch{setError(true);setQuote(null);}}else{setFrom(to);setTo(from);setQuote(null);try{rememberPair(to,from);}catch{setError(true);}}}

  const result=page==='calculator'?(calc==null?null:{amount:calc,currency:ctx.currency}):quote?{amount:quote.result,currency:quote.to}:null;
  async function prepare(destination,projectOverride=null){
    if(!result||result.amount<=0||busy)return;
    if(!toolCurrencyAllowed(result.currency,ctx.currency,ctx.secondaryCurrency,ctx.currentPlan)){ctx.setToast({text:L('Questa funzione non è disponibile con il piano attuale.'),type:'warning',color:'#FFF8E1',textColor:'#856404',actionLabel:L('Piani'),actionPage:'plans_settings'});return;}
    invalidate();const id=request.current,controller=new AbortController();abort.current=controller;setBusy(true);const timer=setTimeout(()=>controller.abort(),15000);
    try{const fx=await rate(result.currency,ctx.currency,controller.signal);if(id!==request.current)return;
      const initial={amount:String(result.amount),currency:result.currency,baseCurrency:ctx.currency,exchangeRate:fx,exchangeRateSource:result.currency===ctx.currency?'base':'exchangerate-api.com',exchangeRateDate:todayStr(),baseAmount:roundCurrency(result.amount*fx,ctx.currency),date:todayStr()};
      if(destination==='transaction'){setDirection('expense');setTransaction(initial);}
      else {const selected=projects.find(p=>String(p.id)===String(projectOverride||project||ctx.shareSelectedProjectId))||projects[0];if(!selected)throw new Error('NO_PROJECT');ctx.setToolShareDraft({id:crypto.randomUUID(),projectId:String(selected.id),...initial});ctx.setShareSelectedProjectId(String(selected.id));ctx.setTab('share');}
    }catch{if(id===request.current)setError(true);}finally{clearTimeout(timer);if(id===request.current)setBusy(false);}
  }
  function resultActions(){return <div className="tool-followups"><div className="tool-action-row"><button className="tool-main-action" disabled={!result||result.amount<=0||busy} onClick={()=>prepare('transaction')}>＋ {T('create')}</button><button className="tool-main-action" disabled={!result||result.amount<=0||busy||!projects.length} onClick={()=>setSharePicker(true)}>🤝 {T('share')}</button></div>{!projects.length&&<p className="tool-muted">{T('noProject')}</p>}</div>;}
  function changePage(value){invalidate();setPage(value);setPicker(null);setTransaction(null);setCalc(null);setSeed(p=>({value:'',key:p.key+1}));setAmount('');setQuote(null);}
  function openHistory(section,row){changePage(section);if(section==='calculator')setSeed(p=>({value:String(row.result),key:p.key+1}));else{setFrom(row.from);setTo(row.to);setAmount(String(row.amount));convert(row.from,row.to,String(row.amount),false);}}
  function clearHistory(section){if(!window.confirm(T('clearConfirm')))return;try{ctx.setFinanceEvolution(p=>({...p,tools:{...p.tools,[section]:[]}}));setError(false);}catch{setError(true);}}
  function inlineHistory(section){const rows=(tools[section]||[]).filter(r=>r.kind==='tool-v1');return <div className="tool-inline-history"><div className="tool-history-heading"><h4>◷ {L('Storico')}</h4><button disabled={!rows.length} onClick={()=>clearHistory(section)}>{T('clear')}</button></div><p className="tool-muted">{T('retention')}</p>{!rows.length&&<p className="tool-muted">{T('empty')}</p>}{rows.map(row=><button className="tool-history-row" key={row.id} onClick={()=>openHistory(section,row)}>{section==='calculator'?number(row.result):`${money(row.amount,row.from)} ${row.from} → ${money(row.result,row.to)} ${row.to}`} <span>›</span></button>)}</div>;}

  let savingsResult:any=null,savingsInvalid=false;
  if(String(savings.goal).trim()){
    try{
      savingsResult=savingsMode==='byDate'
        ?(String(savings.targetDate).trim()?calculateSavingsPlan({goal:localNumber(savings.goal),current:String(savings.current).trim()?localNumber(savings.current):0,targetDate:savings.targetDate,annualRate:String(savings.annualRate).trim()?localNumber(savings.annualRate):0}):null)
        :(String(savings.monthlySavings).trim()?calculateSavingsHorizon({goal:localNumber(savings.goal),current:String(savings.current).trim()?localNumber(savings.current):0,monthlySavings:localNumber(savings.monthlySavings),annualRate:String(savings.annualRate).trim()?localNumber(savings.annualRate):0}):null);
    }catch{savingsInvalid=true;}
  }
  let purchaseResult:any=null,purchaseInvalid=false;
  if(String(purchase.goal).trim()&&String(purchase.monthlySavings).trim()&&String(purchase.purchaseAmount).trim()){
    try{purchaseResult=purchaseMode==='cash'
      ?calculatePurchaseVsSavings({goal:localNumber(purchase.goal),current:String(purchase.current).trim()?localNumber(purchase.current):0,monthlySavings:localNumber(purchase.monthlySavings),purchaseAmount:localNumber(purchase.purchaseAmount)})
      :calculatePurchaseInstallmentPlan({goal:localNumber(purchase.goal),current:String(purchase.current).trim()?localNumber(purchase.current):0,monthlySavings:localNumber(purchase.monthlySavings),purchaseAmount:localNumber(purchase.purchaseAmount),installmentMonths:localNumber(purchase.installmentMonths),annualRate:String(purchase.installmentRate).trim()?localNumber(purchase.installmentRate):0});
    }catch{purchaseInvalid=true;}
  }
  let inflationResult:any=null,inflationSnapshot:any=null,inflationInvalid=false;
  if(String(inflation.amount).trim()&&String(inflation.inflationRate).trim()&&String(inflation.years).trim()){
    try{
      const args={amount:localNumber(inflation.amount),inflationRate:localNumber(inflation.inflationRate),years:localNumber(inflation.years)};
      inflationResult=calculateInflationPower(args);
      inflationSnapshot=calculateInflationSnapshot(args);
    }catch{inflationInvalid=true;}
  }

  const mainSymbol=CURRENCIES.find(c=>c.code===mainCurrency)?.symbol||mainCurrency;
  function labelInfo(label:string,key:string,text:string){
    return <div className="tool-field-label"><span>{label}</span><FainanceInfoPopover label={T('moreInfo')} title={label} body={text} size={19} popupWidth={280} popupOffsetY={27} popupAlign="right" buttonStyle={{fontSize:10}} popupStyle={{fontSize:11,lineHeight:1.5}}/></div>;
  }
  function moneyInput(label,value,onChange,key,info,placeholder='5.000'){
    return <div className="tool-field">{labelInfo(label,key,info)}<div className="tool-input-money"><input aria-label={label} inputMode="decimal" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/><span>{mainSymbol}</span></div></div>;
  }
  function percentInput(label,value,onChange,key,info){return <div className="tool-field">{labelInfo(label,key,info)}<div className="tool-input-money"><input aria-label={label} inputMode="decimal" value={value} onChange={e=>onChange(e.target.value)} placeholder="0"/><span>%</span></div></div>;}
  function plainInput(label,value,onChange,key,info,placeholder=''){return <div className="tool-field">{labelInfo(label,key,info)}<input aria-label={label} inputMode="decimal" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>;}
  function dateInput(label,value,onChange,key,info){return <div className="tool-field">{labelInfo(label,key,info)}<input aria-label={label} type="date" value={value} min={todayStr()} onChange={e=>onChange(e.target.value)}/></div>;}
  function metric(label,value,accent=false){return <div className={`tool-metric${accent?' tool-metric-accent':''}`}><span>{label}</span><strong>{value}</strong></div>;}
  function addMonths(months:number){const d=new Date();d.setHours(12,0,0,0);d.setMonth(d.getMonth()+Math.max(0,Number(months)||0));return d;}
  function dateLabel(months:number){return new Intl.DateTimeFormat(ctx.lang||'it',{month:'short',year:'numeric'}).format(addMonths(months));}
  function textTemplate(key:string,values:Record<string,string|number>){let text=T(key);Object.entries(values).forEach(([name,value])=>{text=text.split(`{${name}}`).join(String(value));});return text;}
  function modeSwitch(value:string,items:Array<{id:string,label:string}>,onChange:(id:any)=>void){return <div className="tool-mode-switch">{items.map(item=><button type="button" key={item.id} aria-pressed={value===item.id} onClick={()=>onChange(item.id)}>{item.label}</button>)}</div>;}
  function quickChoices(values:Array<number>,current:string,onChange:(value:string)=>void,suffix=''){return <div className="tool-quick-row">{values.map(value=><button type="button" key={value} aria-pressed={Number(current)===value} onClick={()=>onChange(String(value))}>{value}{suffix}</button>)}</div>;}
  function simulatorSectionLabel(text:string){return <div className="tool-section-kicker">{text}</div>;}
  function savingsTargetDate(months:number){return new Intl.DateTimeFormat(ctx.lang||'it',{month:'long',year:'numeric'}).format(addMonths(months));}

  const utilityTabs=[
    {id:'calculator',icon:'▦',label:T('calculatorShort')},
    {id:'converter',icon:'⇄',label:T('converterShort')},
  ];
  const simulatorTabs=[
    {id:'savings',icon:'🎯',label:T('savingsShort')},
    {id:'buyVsSave',icon:'⚖️',label:T('buyVsSaveShort')},
    {id:'inflation',icon:'📉',label:T('inflationShort')},
  ];
  const automationTabs=[
    {id:'recurring',icon:'🔁',label:T('recurringShort')},
    {id:'automaticRules',icon:'⚙️',label:rulesText(ctx.lang||'it','title')},
  ];

  return <section className="fainance-tools" data-dark={ctx.dark ? "true" : "false"} style={style} aria-label={T('title')}>
    <header className="tool-heading"><span>🧰</span><div><h2>{T('title')}</h2><p>{T('utilities')} · {T('simulators')} · {T('automations')}</p></div></header>
    <nav className="tool-main-navigation" aria-label={T('title')}>
      <div className="tool-nav-group"><span className="tool-nav-label">{T('utilities')}</span><div className="tool-tabs tool-main-tabs tool-main-tabs-utilities">{utilityTabs.map(item=><button key={item.id} aria-pressed={page===item.id} onClick={()=>changePage(item.id)}><span className="tool-tab-icon">{item.icon}</span><span>{item.label}</span></button>)}</div></div>
      <div className="tool-nav-group"><span className="tool-nav-label">{T('simulators')}</span><div className="tool-tabs tool-main-tabs tool-main-tabs-simulators">{simulatorTabs.map(item=><button key={item.id} aria-pressed={page===item.id} onClick={()=>changePage(item.id)}><span className="tool-tab-icon">{item.icon}</span><span>{item.label}</span></button>)}</div></div>
      <div className="tool-nav-group"><span className="tool-nav-label">{T('automations')}</span><div className="tool-tabs tool-main-tabs tool-main-tabs-automations">{automationTabs.map(item=><button key={item.id} aria-pressed={page===item.id} onClick={()=>changePage(item.id)}><span className="tool-tab-icon">{item.icon}</span><span>{item.label}</span></button>)}</div></div>
    </nav>
    {error&&<p role="alert" className="tool-error">{T('error')}</p>}
    {busy&&<p role="status">{T('busy')}</p>}
    {transaction?<div className="tool-card"><button onClick={()=>setTransaction(null)}>‹ {L('Indietro')}</button><h3>{T('create')}</h3><div className="tool-tabs"><button aria-pressed={direction==='expense'} onClick={()=>setDirection('expense')}>{L('Uscita')}</button><button aria-pressed={direction==='income'} onClick={()=>setDirection('income')}>{L('Entrata')}</button></div><ExpenseForm type={direction} initialValue={transaction} draftNamespace="draft_tool_" onSave={item=>{const accepted=direction==='expense'?ctx.addExpenses([item],'tool'):ctx.addIncomes([item],'tool');if(accepted===false)return false;setTransaction(null);return true;}}/></div>:<>
      {page==='calculator'&&<div className="tool-card"><h3>{T('calculator')}</h3><AmountCalculatorButton embedded key={seed.key} value={seed.value} onResult={calculated} onEdit={()=>{invalidate();setCalc(null);setSaved(false);}}/>{calc!=null&&<output className="tool-result">{number(calc)}</output>}{saved&&<p role="status" className="tool-muted">✓ {T('saved')}</p>}{resultActions()}{inlineHistory('calculator')}</div>}
      {page==='converter'&&<div className="tool-card"><h3>{T('converter')}</h3><div style={{display:'flex',flexDirection:'column',gap:8}}><div style={{display:'flex',alignItems:'center',gap:10,minHeight:64,padding:'10px 14px',borderRadius:16,border:`1px solid ${ctx.borderC}`,background:ctx.dark?'#2e3849':'#f4f7fb'}}><button onClick={()=>{setPicker('from');setSearch('');}} style={{display:'flex',alignItems:'center',gap:8,border:0,background:'transparent',color:readableDarkText(ctx.textC, ctx.dark, 'transparent'),fontWeight:900,fontSize:16,padding:0,cursor:'pointer',minWidth:118}}><span style={{fontSize:22}}>{currencyFlag(from)}</span><span>{from}</span><span style={{fontSize:12,opacity:.65}}>⌄</span></button><input aria-label={L('Importo')} inputMode="decimal" value={amount} onChange={e=>changeAmount(e.target.value)} placeholder="0" style={{flex:1,minWidth:0,border:0,outline:0,background:'transparent',textAlign:'right',color:readableDarkText(ctx.textC, ctx.dark, 'transparent'),fontWeight:900,fontSize:30,padding:0}}/></div><div style={{display:'flex',justifyContent:'center',height:18,margin:'-5px 0'}}><button className="tool-swap" aria-label={T('swap')} onClick={swap} style={{width:34,height:34,minHeight:34,borderRadius:999,zIndex:2}}>⇅</button></div><div style={{display:'flex',alignItems:'center',gap:10,minHeight:64,padding:'10px 14px',borderRadius:16,border:`1px solid ${ctx.borderC}`,background:ctx.dark?'#2e3849':'#f4f7fb'}}><button onClick={()=>{setPicker('to');setSearch('');}} style={{display:'flex',alignItems:'center',gap:8,border:0,background:'transparent',color:readableDarkText(ctx.textC, ctx.dark, 'transparent'),fontWeight:900,fontSize:16,padding:0,cursor:'pointer',minWidth:118}}><span style={{fontSize:22}}>{currencyFlag(to)}</span><span>{to}</span><span style={{fontSize:12,opacity:.65}}>⌄</span></button><output aria-label={T('converter')} style={{flex:1,minWidth:0,textAlign:'right',color:readableDarkText(ctx.confirmButtonColor||'#378ADD', ctx.dark, ctx.dark?'#2e3849':'#f4f7fb'),fontWeight:900,fontSize:30}}>{quote?number(quote.result,to):'—'}</output></div></div>{quote&&<p className="tool-muted" style={{textAlign:'center',marginTop:8}}>{T('rate')}: 1 {from} = {new Intl.NumberFormat(ctx.lang||'it',{maximumFractionDigits:8}).format(quote.rate)} {to} · {L('conversione automatica')}</p>}{saved&&<p role="status" className="tool-muted">✓ {T('saved')}</p>}{resultActions()}{inlineHistory('converter')}</div>}

      {page==='savings'&&<div className="tool-simulator-page"><div className="tool-card tool-simulator tool-simulator-intro"><div className="tool-simulator-title"><span>🎯</span><div><h3>{T('savings')}</h3><p className="tool-muted">{savingsMode==='byDate'?T('saveByDateHint'):T('saveByMonthlyHint')}</p></div></div><div className="tool-question"><span>{T('whatToDiscover')}</span>{modeSwitch(savingsMode,[{id:'byDate',label:T('saveByDate')},{id:'byMonthly',label:T('saveByMonthly')}],setSavingsMode)}</div></div><div className="tool-card tool-input-panel">{simulatorSectionLabel(T('simulationData'))}<div className="tool-form-grid">{moneyInput(T('goalAmount'),savings.goal,value=>setSavings(p=>({...p,goal:value})),'savings-goal',T('infoGoalAmount'),'5.000')}{moneyInput(T('currentSavings'),savings.current,value=>setSavings(p=>({...p,current:value})),'savings-current',T('infoCurrentSavings'),'1.000')}{savingsMode==='byDate'?dateInput(T('targetDate'),savings.targetDate,value=>setSavings(p=>({...p,targetDate:value})),'savings-date',T('infoTargetDate')):moneyInput(T('monthlySavingPlan'),savings.monthlySavings,value=>setSavings(p=>({...p,monthlySavings:value})),'savings-monthly',T('infoMonthlySavings'),'300')}{percentInput(T('annualReturn'),savings.annualRate,value=>setSavings(p=>({...p,annualRate:value})),'savings-return',T('infoAnnualReturn'))}</div>{savingsInvalid&&<p className="tool-error">{T('error')}</p>}</div>{savingsResult&&<div className="tool-card tool-result-panel">{simulatorSectionLabel(T('resultSection'))}<div className="tool-progress-wrap tool-progress-rich"><div className="tool-progress-orbit" style={{'--tool-progress-pct':`${Math.min(100,Math.max(0,(savingsResult.current/savingsResult.goal)*100))}%`} as any}><strong>{Math.min(100,Math.max(0,Math.round((savingsResult.current/savingsResult.goal)*100)))}%</strong></div><div className="tool-progress-copy"><div className="tool-progress-label"><span>{T('alreadyCovered')}</span><strong>{money(savingsResult.current,mainCurrency)}</strong></div><div className="tool-progress"><span style={{width:`${Math.min(100,Math.max(0,(savingsResult.current/savingsResult.goal)*100))}%`}}/></div></div></div>{savingsMode==='byDate'?<div className="tool-result-hero"><span>{T('monthlyRequired')}</span><strong>{money(savingsResult.monthlyRequired,mainCurrency)}</strong><small>{T('perMonth')}</small></div>:<div className="tool-result-hero"><span>{T('targetReachedIn')}</span><strong>{savingsResult.months} {T('monthShort')}</strong><small>{T('targetReachedDate')}: {savingsTargetDate(savingsResult.months)}</small></div>}<div className="tool-metric-grid">{metric(T('months'),`${savingsResult.months} ${T('monthShort')}`)}{metric(T('totalContributions'),money(savingsResult.totalContributions,mainCurrency))}{metric(T('estimatedGrowth'),money(savingsResult.projectedGrowth,mainCurrency),true)}</div></div>}</div>}

      {page==='buyVsSave'&&<div className="tool-simulator-page"><div className="tool-card tool-simulator tool-simulator-intro"><div className="tool-simulator-title"><span>⚖️</span><div><h3>{T('buyVsSave')}</h3><p className="tool-muted">{T('buyVsSaveHint')}</p></div></div><div className="tool-question"><span>{T('whatToDiscover')}</span>{modeSwitch(purchaseMode,[{id:'cash',label:T('cashPurchase')},{id:'installments',label:T('installmentPurchase')}],setPurchaseMode)}</div></div><div className="tool-card tool-input-panel">{simulatorSectionLabel(T('simulationData'))}<div className="tool-form-grid">{moneyInput(T('goalAmount'),purchase.goal,value=>setPurchase(p=>({...p,goal:value})),'purchase-goal',T('infoGoalAmount'),'5.000')}{moneyInput(T('currentSavings'),purchase.current,value=>setPurchase(p=>({...p,current:value})),'purchase-current',T('infoPurchaseCurrentSavings'),'1.000')}{moneyInput(T('monthlySavings'),purchase.monthlySavings,value=>setPurchase(p=>({...p,monthlySavings:value})),'purchase-monthly',T('infoMonthlySavings'),'300')}{moneyInput(T('purchaseAmount'),purchase.purchaseAmount,value=>setPurchase(p=>({...p,purchaseAmount:value})),'purchase-amount',T('infoPurchaseAmount'),'1.000')}{purchaseMode==='installments'&&plainInput(T('installmentMonths'),purchase.installmentMonths,value=>setPurchase(p=>({...p,installmentMonths:value})),'purchase-installments',T('installmentMonths'),'12')}{purchaseMode==='installments'&&percentInput(T('financingRate'),purchase.installmentRate,value=>setPurchase(p=>({...p,installmentRate:value})),'purchase-financing-rate',T('financingRate'))}</div>{purchaseInvalid&&<p className="tool-error">{T('error')}</p>}</div>{purchaseResult&&<div className="tool-card tool-result-panel">{simulatorSectionLabel(T('resultSection'))}<div className={`tool-result-hero ${purchaseResult.delayMonths>0?'tool-result-warning':''}`}><span>{T('impact')}</span><strong>{purchaseResult.delayMonths>0?textTemplate('delayResult',{months:purchaseResult.delayMonths}):T('noDelayResult')}</strong><small>{purchaseMode==='cash'?textTemplate('savingsEquivalentText',{months:number(purchase.monthlySavings?localNumber(purchase.purchaseAmount)/Math.max(1,localNumber(purchase.monthlySavings)):0)}):textTemplate('installmentImpactText',{amount:money(Math.max(0,purchaseResult.monthlySavingsDuringInstallment),mainCurrency)})}</small></div><div className="tool-timeline-compare"><div><div className="tool-timeline-head"><span>{T('withoutPurchase')}</span><strong>{dateLabel(purchaseResult.monthsWithoutPurchase)}</strong></div><div className="tool-timeline"><span style={{width:`${Math.max(8,Math.min(100,purchaseResult.monthsWithoutPurchase/Math.max(1,purchaseResult.monthsWithPurchase)*100))}%`}}/></div></div><div><div className="tool-timeline-head"><span>{T('withPurchase')}</span><strong>{dateLabel(purchaseResult.monthsWithPurchase)}</strong></div><div className="tool-timeline tool-timeline-warning"><span style={{width:'100%'}}/></div></div></div><div className="tool-metric-grid">{purchaseMode==='cash'?<>{metric(T('purchaseAmount'),money(purchaseResult.purchaseAmount,mainCurrency))}{metric(T('remainingAfterPurchase'),money(purchaseResult.savingsAfterPurchase,mainCurrency),purchaseResult.savingsAfterPurchase<0)}</>:<>{metric(T('monthlyInstallment'),money(purchaseResult.monthlyInstallment,mainCurrency),true)}{metric(T('financingCost'),money(purchaseResult.financingCost,mainCurrency))}</>}</div></div>}</div>}

      {page==='inflation'&&<div className="tool-simulator-page"><div className="tool-card tool-simulator tool-simulator-intro"><div className="tool-simulator-title"><span>📉</span><div><h3>{T('inflation')}</h3><p className="tool-muted">{T('inflationHint')}</p></div></div><div className="tool-question"><span>{T('whatToDiscover')}</span>{modeSwitch(inflationMode,[{id:'cost',label:T('futureCostMode')},{id:'power',label:T('futurePowerMode')}],setInflationMode)}</div></div><div className="tool-card tool-input-panel">{simulatorSectionLabel(T('simulationData'))}<div className="tool-form-grid">{moneyInput(T('currentAmount'),inflation.amount,value=>setInflation(p=>({...p,amount:value})),'inflation-amount',T('infoCurrentAmount'),'10.000')}{percentInput(T('inflationRate'),inflation.inflationRate,value=>setInflation(p=>({...p,inflationRate:value})),'inflation-rate',T('infoInflationRate'))}{plainInput(T('years'),inflation.years,value=>setInflation(p=>({...p,years:value})),'inflation-years',T('infoYears'),'10')}</div><div className="tool-quick-scenarios"><span>{T('quickScenarios')}</span><div><div>{quickChoices([2,3,5],inflation.inflationRate,value=>setInflation(p=>({...p,inflationRate:value})),'%')}</div><div>{quickChoices([5,10,20,30],inflation.years,value=>setInflation(p=>({...p,years:value})))}</div></div></div>{inflationInvalid&&<p className="tool-error">{T('error')}</p>}</div>{inflationResult&&inflationSnapshot&&<div className="tool-card tool-result-panel">{simulatorSectionLabel(T('resultSection'))}<div className="tool-result-hero"><span>{inflationMode==='cost'?T('futureNeeded'):T('futureBuyingPower')}</span><strong>{money(inflationMode==='cost'?inflationResult.futureNeeded:inflationResult.futureBuyingPower,mainCurrency)}</strong><small>{inflationMode==='cost'?textTemplate('inflationCostSummary',{amount:money(inflationResult.amount,mainCurrency)}):T('inflationPowerSummary')}</small></div><div className="tool-three-point-flow"><div><span>{T('today')}</span><strong>{money(inflationResult.amount,mainCurrency)}</strong></div><b>→</b><div><span>{T('midPeriod')}</span><strong>{money(inflationMode==='cost'?inflationSnapshot.midFutureNeeded:inflationSnapshot.midBuyingPower,mainCurrency)}</strong><small>{number(inflationSnapshot.midpointYears)} {T('yearsSuffix')}</small></div><b>→</b><div><span>{inflationMode==='cost'?T('futureCost'):T('buyingPower')}</span><strong>{money(inflationMode==='cost'?inflationResult.futureNeeded:inflationResult.futureBuyingPower,mainCurrency)}</strong><small>{number(inflationResult.years)} {T('yearsSuffix')}</small></div></div><div className="tool-metric-grid">{metric(T('purchasingLoss'),money(inflationResult.purchasingLoss,mainCurrency))}{metric(T('purchasingLossPercent'),`${number(inflationResult.amount>0?inflationResult.purchasingLoss/inflationResult.amount*100:0)}%`,true)}</div></div>}</div>}
      {page==='recurring'&&<div className="tool-embedded-page"><RecurringManager/></div>}
      {page==='automaticRules'&&<div className="tool-embedded-page"><div className="tool-embedded-heading"><span>⚙️</span><div><h3>{rulesText(ctx.lang||'it','title')}</h3><p>{rulesText(ctx.lang||'it','intro')}</p></div></div><AutomaticRulesPanel/></div>}

    </>}
    {sharePicker&&<FainancePickerModal open={sharePicker} title={T('project')} onClose={()=>setSharePicker(false)} zIndex={2147483000}><div className="tool-project-list">{projects.map(p=><button key={p.id} onClick={()=>{const id=String(p.id);setProject(id);setSharePicker(false);prepare('share',id);}}><strong>{p.name}</strong><span>›</span></button>)}</div></FainancePickerModal>}
    {picker&&<FainancePickerModal open={!!picker} title={T('chooseCurrency')} onClose={()=>setPicker(null)} zIndex={2147483000}><input autoFocus aria-label={L('Cerca')} placeholder={L('Cerca')} value={search} onChange={e=>setSearch(e.target.value)}/><div className="tool-currency-list">{orderedToolCurrencies(CURRENCIES,ctx.currency,ctx.secondaryCurrency,tools.recentCurrencies).filter(c=>`${c.code} ${c.symbol} ${L(c.name)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(c=><button key={c.code} onClick={()=>chooseCurrency(c.code)}><strong>{c.symbol} {c.code}</strong><span>{L(c.name)}</span></button>)}</div></FainancePickerModal>}
  </section>;
}
