import { readableDarkText } from '../ui/textContrast';
import {useEffect,useRef,useState} from 'react';
import {useApp,CURRENCIES,parseMoney,todayStr,smallDecimalNode,formatNumber,numberLocale} from '../core';
import {AmountCalculatorButton,Btn,ExpenseForm,FainanceInfoPopover,FainancePickerModal,RecurringManager} from '../widget';
import {toolsText} from '../i18n/toolsTranslations';
import {rulesText} from '../i18n/automaticRulesTranslations';
import {AutomaticRulesPanel} from './AutomaticRulesPanel';
import {FinancialForecastPanel} from './FinancialForecastPanel';
import './financialCalendar.css';
import {translateFainanceText} from '../traduzioni';
import {buildFinancialForecast,shiftCivilDate} from '../finance/financialInsights';
import {buildSavingsForecast} from '../finance/savingsForecast';
import {budgetPeriodSummary} from '../finance/budgetEngine';
import {compareWhatIf} from '../finance/whatIf';
import {SettingsSegmented,secondarySettingsStyle} from '../ui/SettingsControls';
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
  projectMonthlySavings,
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
const emptyWhatIf = () => ({start:todayStr(),expense:'',installment:'',installments:'1',income:'',fixedCost:'',openingBalance:''});

export function ToolsPanel({renderAnomalies}: {renderAnomalies:(onBack:()=>void)=>React.ReactNode}){
  const ctx:any=useApp(),T=(key:any)=>toolsText(ctx.lang||'it',key),L=(s:string)=>translateFainanceText(s,ctx.lang||'it');
  const pair=ctx.financeEvolution.tools.lastCurrencyPair||[ctx.currency,ctx.secondaryCurrency&&ctx.secondaryCurrency!==ctx.currency?ctx.secondaryCurrency:(ctx.currency==='USD'?'EUR':'USD')];
  const [page,setPage]=useState(()=>{
    try{return (sessionStorage.getItem('fainance_rule_ai_editor_draft_once')||sessionStorage.getItem('fainance_rule_ai_target_tool_once'))?'automaticRules':'calculator';}
    catch{return 'calculator';}
  }),[seed,setSeed]=useState({value:'',key:0}),[calc,setCalc]=useState<number|null>(null);
  const [from,setFrom]=useState(pair[0]),[to,setTo]=useState(pair[1]),[amount,setAmount]=useState(''),[quote,setQuote]=useState<any>(null);
  const [picker,setPicker]=useState<string|null>(null),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[saved,setSaved]=useState(false);
  const [transaction,setTransaction]=useState<any>(null),[direction,setDirection]=useState('expense'),[project,setProject]=useState<string|null>(null),[sharePicker,setSharePicker]=useState(false);
  const [savingsMode,setSavingsMode]=useState<'byDate'|'byMonthly'>('byDate');
  const [savings,setSavings]=useState({goal:'',current:'',targetDate:nextYearDate(),monthlySavings:'',annualRate:'0'});
  const [purchaseMode,setPurchaseMode]=useState<'cash'|'installments'>('cash');
  const [purchase,setPurchase]=useState({goal:'',current:'',monthlySavings:'',purchaseAmount:'',installmentMonths:'12',installmentRate:'0'});
  const [inflationMode,setInflationMode]=useState<'cost'|'power'>('cost');
  const [inflation,setInflation]=useState({amount:'',inflationRate:'2.5',years:'10'});
  const [whatIf,setWhatIf]=useState(emptyWhatIf);
  const [whatIfDays,setWhatIfDays]=useState('30');
  const [whatIfMode,setWhatIfMode]=useState('expense');
  const [whatIfDetails,setWhatIfDetails]=useState(false);
  const [whatIfCalculation,setWhatIfCalculation]=useState<{
    comparison:ReturnType<typeof compareWhatIf>; purchaseInBudget:boolean;
    monthlyBaseline:number|null; monthlyContribution:number; delayMonths:number;
  }|null>(null);
  const [whatIfError,setWhatIfError]=useState(false);
  const whatIfResult=useRef<HTMLDivElement>(null);
  const whatIfToday=todayStr();
  useEffect(()=>{
    if(!whatIfCalculation)return;
    const frame=requestAnimationFrame(()=>whatIfResult.current?.scrollIntoView({block:'start'}));
    return()=>cancelAnimationFrame(frame);
  },[whatIfCalculation]);
  const request=useRef(0),abort=useRef<AbortController|null>(null);
  useEffect(()=>()=>{request.current++;abort.current?.abort();},[]);
  useEffect(()=>{
    try{if(sessionStorage.getItem('fainance_rule_ai_target_tool_once')==='automaticRules'){
      sessionStorage.removeItem('fainance_rule_ai_target_tool_once');
      setPage('automaticRules');
    }}catch{}
  },[]);
  useEffect(()=>{
    const id=requestAnimationFrame(()=>{try{const active=document.activeElement as HTMLElement|null;if(active&&typeof active.blur==='function')active.blur();}catch{}});
    return()=>cancelAnimationFrame(id);
  },[page]);
  useEffect(()=>{
    const openToolPage=(event:any)=>{
      const target=String(event?.detail?.page||'');
      if(['calculator','converter','savings','buyVsSave','inflation','whatIf','recurring','automaticRules','anomalies','forecast'].includes(target)){
        if(target==='automaticRules')try{sessionStorage.removeItem('fainance_rule_ai_target_tool_once');}catch{}
        changePage(target);
      }
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
  async function rate(a,b,signal){return fetchToolRate(a,b,ctx.toolRateFetcher,signal);}
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
  function changePage(value){
    invalidate();setPage(value);setPicker(null);setTransaction(null);setCalc(null);setSeed(p=>({value:'',key:p.key+1}));setAmount('');setQuote(null);
  }
  function openHistory(section,row){changePage(section);if(section==='calculator')setSeed(p=>({value:String(row.result),key:p.key+1}));else{setFrom(row.from);setTo(row.to);setAmount(String(row.amount));convert(row.from,row.to,String(row.amount),false);}}
  function clearHistory(section){if(!window.confirm(T('clearConfirm')))return;try{ctx.setFinanceEvolution(p=>({...p,tools:{...p.tools,[section]:[]}}));setError(false);}catch{setError(true);}}
  function inlineHistory(section){const rows=(tools[section]||[]).filter(r=>r.kind==='tool-v1');return <div className="tool-inline-history"><div className="tool-history-heading"><h4>◷ {L('Storico')}</h4><button disabled={!rows.length} onClick={()=>clearHistory(section)}>{T('clear')}</button></div><p className="tool-muted">{T('retention')}</p>{!rows.length&&<p className="tool-muted">{T('empty')}</p>}{rows.map(row=><button className="tool-history-row" key={row.id} onClick={()=>openHistory(section,row)}>{section==='calculator'?smallDecimalNode(number(row.result),ctx.lang||'it'):<>{smallDecimalNode(money(row.amount,row.from),ctx.lang||'it')} {row.from} → {smallDecimalNode(money(row.result,row.to),ctx.lang||'it')} {row.to}</>} <span>›</span></button>)}</div>;}

  let savingsResult:any=null,savingsInvalid=false;
  if(page==='savings'&&String(savings.goal).trim()){
    try{
      savingsResult=savingsMode==='byDate'
        ?(String(savings.targetDate).trim()?calculateSavingsPlan({goal:localNumber(savings.goal),current:String(savings.current).trim()?localNumber(savings.current):0,targetDate:savings.targetDate,annualRate:String(savings.annualRate).trim()?localNumber(savings.annualRate):0}):null)
        :(String(savings.monthlySavings).trim()?calculateSavingsHorizon({goal:localNumber(savings.goal),current:String(savings.current).trim()?localNumber(savings.current):0,monthlySavings:localNumber(savings.monthlySavings),annualRate:String(savings.annualRate).trim()?localNumber(savings.annualRate):0}):null);
    }catch{savingsInvalid=true;}
  }
  let purchaseResult:any=null,purchaseInvalid=false;
  if(page==='buyVsSave'&&String(purchase.goal).trim()&&String(purchase.monthlySavings).trim()&&String(purchase.purchaseAmount).trim()){
    try{purchaseResult=purchaseMode==='cash'
      ?calculatePurchaseVsSavings({goal:localNumber(purchase.goal),current:String(purchase.current).trim()?localNumber(purchase.current):0,monthlySavings:localNumber(purchase.monthlySavings),purchaseAmount:localNumber(purchase.purchaseAmount)})
      :calculatePurchaseInstallmentPlan({goal:localNumber(purchase.goal),current:String(purchase.current).trim()?localNumber(purchase.current):0,monthlySavings:localNumber(purchase.monthlySavings),purchaseAmount:localNumber(purchase.purchaseAmount),installmentMonths:localNumber(purchase.installmentMonths),annualRate:String(purchase.installmentRate).trim()?localNumber(purchase.installmentRate):0});
    }catch{purchaseInvalid=true;}
  }
  let inflationResult:any=null,inflationSnapshot:any=null,inflationInvalid=false;
  if(page==='inflation'&&String(inflation.amount).trim()&&String(inflation.inflationRate).trim()&&String(inflation.years).trim()){
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
  function metric(label,value,accent=false){return <div className={`tool-metric${accent?' tool-metric-accent':''}`}><span>{label}</span><strong>{smallDecimalNode(value,ctx.lang||'it')}</strong></div>;}
  function addMonths(months:number){const d=new Date();d.setHours(12,0,0,0);d.setMonth(d.getMonth()+Math.max(0,Number(months)||0));return d;}
  function dateLabel(months:number){return new Intl.DateTimeFormat(ctx.lang||'it',{month:'short',year:'numeric'}).format(addMonths(months));}
  function textTemplate(key:string,values:Record<string,string|number>){let text=T(key);Object.entries(values).forEach(([name,value])=>{text=text.split(`{${name}}`).join(String(value));});return text;}
  function modeSwitch(value:string,items:Array<{id:string,label:string}>,onChange:(id:any)=>void){return <SettingsSegmented value={value} columns={2} items={items} onChange={onChange}/>;}
  function quickChoices(values:Array<number>,current:string,onChange:(value:string)=>void,suffix=''){return <div className="tool-quick-row">{values.map(value=><button type="button" key={value} aria-pressed={Number(current)===value} onClick={()=>onChange(String(value))}>{value}{suffix}</button>)}</div>;}
  function simulatorSectionLabel(text:string){return <div className="tool-section-kicker">{text}</div>;}
  function savingsTargetDate(months:number){return new Intl.DateTimeFormat(ctx.lang||'it',{month:'long',year:'numeric'}).format(addMonths(months));}

  function renderWhatIf(){
    const custom=whatIfMode==='custom';
    const resetWhatIf=()=>{
      setWhatIf(emptyWhatIf());
      setWhatIfDays('30');
      setWhatIfDetails(false);
      setWhatIfCalculation(null);
      setWhatIfError(false);
    };
    const setField=(field:keyof typeof whatIf)=>(value:string)=>{
      setWhatIf(previous=>({...previous,[field]:value}));
      setWhatIfCalculation(null);
      setWhatIfError(false);
    };
    const amount=(field:keyof typeof whatIf)=>whatIf[field].trim()?localNumber(whatIf[field]):0;
    const hasAmounts=(['expense','installment','income','fixedCost'] as const).some(field=>whatIf[field]!=='');
    const locale=numberLocale(ctx.lang);
    const parts=new Intl.NumberFormat(locale,{useGrouping:'always'}).formatToParts(12345.6);
    const grouping=parts.find(part=>part.type==='group')?.value||'';
    const decimal=parts.find(part=>part.type==='decimal')?.value||'.';
    const formatInput=(value:string)=>{
      const match=/^(-?)(\d*)(\.(\d*))?$/.exec(value);
      if(!match)return value;
      const [,sign,integer,fraction,digits]=match;
      return sign+integer.replace(/\B(?=(\d{3})+(?!\d))/g,grouping)+(fraction?decimal+digits:'');
    };
    const groupedField=(label:string,field:keyof typeof whatIf,info:string,placeholder='0')=><div className="tool-field">
      {labelInfo(label,field,info)}
      <div className="tool-input-money">
        <input aria-label={label} inputMode="decimal" value={formatInput(whatIf[field])} placeholder={placeholder} onChange={event=>{
          const input=event.currentTarget;
          const typed=input.value;
          const start=input.selectionStart??typed.length;
          const ungrouped=grouping?typed.split(grouping).join(''):typed;
          const next=ungrouped.replace('−','-').replace(decimal,'.');
          if(!/^-?\d*(\.\d*)?$/.test(next))return;
          if(!custom&&field!=='openingBalance'&&next.startsWith('-'))return;
          setField(field)(next);
          const prefix=typed.slice(0,start);
          const logicalPosition=(grouping?prefix.split(grouping).join(''):prefix).length;
          const formatted=formatInput(next);
          let position=0;
          let characters=0;
          while(position<formatted.length&&characters<logicalPosition){
            if(formatted[position]!==grouping)characters++;
            position++;
          }
          requestAnimationFrame(()=>{if(document.activeElement===input)input.setSelectionRange(position,position);});
        }}/>
        <span>{mainSymbol}</span>
      </div>
    </div>;
    function calculateChange(){
      if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
      setWhatIfError(false);
      try{
        const settings=ctx.accountingPeriod.settings;
        const sources={
          today:whatIfToday,currency:ctx.currency,expenses:ctx.expenses||[],incomes:ctx.countedIncomes||ctx.incomes||[],
          analysisExpenses:ctx.countedExpensesForAnalysis||ctx.expensesForAnalysis||ctx.expenses||[],
          recurring:ctx.recurring,excludeExpense:ctx.isExpenseExcludedFromTotals,excludeIncome:ctx.isIncomeExcludedFromTotals,
        };
        const forecast=buildFinancialForecast({...sources,shareProjects:ctx.shareProjects,userId:ctx.userId,categories:ctx.cats});
        const savings=buildSavingsForecast({...sources,periodSettings:settings});
        const bounds=ctx.accountingPeriod.forDate(whatIfToday);
        const plan=ctx.budgetForPeriod(bounds.key);
        const items=plan?.items||[];
        const limit=items.reduce((sum,item)=>sum+Number(item.amount||0),0);
        const plannedIncome=Number(plan?.manualIncome??plan?.income);
        const monthlyPlanMargin=items.length&&plannedIncome>0&&Number.isFinite(plannedIncome)?plannedIncome-limit:null;
        const scheduledExpenses=forecast.daily.filter(day=>day.date>=bounds.start&&day.date<=bounds.end)
          .flatMap(day=>day.entries).reduce((sum,entry)=>sum+(entry.source.startsWith('planned')?Math.max(0,-entry.cents):0),0)/100;
        const budget=items.length?{
          start:bounds.start,end:bounds.end,
          remaining:limit-budgetPeriodSummary(sources.analysisExpenses,sources.incomes,plan,bounds.key,settings).expense-scheduledExpenses,
        }:null;
        const comparison=compareWhatIf({today:whatIfToday,forecast,savings,budget,monthlyPlanMargin,hypothesis:{
          start:whatIf.start,expense:amount('expense'),installment:amount('installment'),installments:amount('installment')?amount('installments'):1,
          income:amount('income'),fixedCost:whatIfMode==='fixedCost'?-amount('fixedCost'):amount('fixedCost'),
          openingBalance:whatIf.openingBalance.trim()?amount('openingBalance'):null,
        }});
        const incomeMode=whatIfMode==='income';
        const monthlyContribution=roundCurrency(amount('income')+(whatIfMode==='fixedCost'?amount('fixedCost'):-amount('fixedCost')),mainCurrency);
        const monthlyBaseline=monthlyContribution>0&&!custom&&savings.status!=='N_D'
          ?savings.monthlyHistory.reduce((sum,period)=>sum+(incomeMode?period.income:period.expense),0)/savings.monthlyHistory.length:null;
        const delayMonths=Math.ceil((Date.parse(whatIf.start)-Date.parse(whatIfToday))/(30*86400000));
        setWhatIfCalculation({comparison,monthlyBaseline,monthlyContribution,delayMonths,
          purchaseInBudget:whatIfMode==='expense'&&!!budget&&whatIf.start>=bounds.start&&whatIf.start<=bounds.end});
        setWhatIfDays(monthlyContribution>0?'1y':'30');
      }catch{
        setWhatIfCalculation(null);
        setWhatIfError(true);
      }
    }
    const comparison=whatIfCalculation?.comparison;
    const selected=comparison?.horizons.find(row=>row.days===Number(whatIfDays));
    const investmentAvailable=(whatIfCalculation?.monthlyContribution??0)>0;
    const projectionMonths=whatIfDays.endsWith('y')?Number(whatIfDays.slice(0,-1))*12:Number(whatIfDays)/30;
    const depositMonths=Math.max(0,projectionMonths-(whatIfCalculation?.delayMonths??0));
    const monthlyContribution=whatIfCalculation?.monthlyContribution??0;
    const monthlyBaseline=whatIfCalculation?.monthlyBaseline??null;
    const display=(value:number|null)=>value===null?'—':`${formatNumber(value,locale,{useGrouping:'always',minimumFractionDigits:currencyDigits(mainCurrency),maximumFractionDigits:currencyDigits(mainCurrency)})} ${mainSymbol}`;
    const describe=(value:number|null)=>value!==null&&value<0?`${L('Mancano')} ${display(-value)}`:display(value);
    const budgetResult=comparison?.budget;
    const purchaseInBudget=whatIfCalculation?.purchaseInBudget;
    const secondary=secondarySettingsStyle(ctx);
    const detailFields=<div className="tool-form-grid tool-what-if-fields">
      {dateInput(L('Quando inizia?'),whatIf.start,setField('start'),'what-if-date',L('Puoi scegliere una data da oggi ai prossimi 90 giorni.'))}
      {groupedField(L('Soldi disponibili oggi'), 'openingBalance', L('Inserisci il saldo di oggi per stimare quanto ti resterebbe.'), L('Facoltativo'))}
    </div>;
    const pair=(label:string,current:number|null,scenario:number|null)=><>
      {simulatorSectionLabel(label)}
      <div className="tool-metric-grid">
        {metric(L('Senza il cambiamento'),describe(current))}
        {metric(L('Con il cambiamento'),describe(scenario),true)}
      </div>
    </>;
    return <div className="tool-simulator-page tool-what-if">
      <div className="tool-card tool-simulator tool-simulator-intro">
        <div className="tool-simulator-title"><span>💭</span><div>
          <h3>{L('E se…?')}</h3>
          <p className="tool-muted">{L('Prima di spendere, scopri se la spesa rientra nel Budget e quanto potresti ancora risparmiare.')}</p>
        </div></div>
      </div>
      <div className="tool-card tool-input-panel">
        <div className="tool-question">
          <span>{L('Cosa vuoi provare?')}</span>
          <SettingsSegmented value={whatIfMode} columns={2} items={[
            {id:'expense',label:L('Faccio una spesa')},
            {id:'installment',label:T('installmentPurchase')},
            {id:'fixedCost',label:L('Spendo meno ogni mese')},
            {id:'income',label:L('Guadagno di più')},
          ]} onChange={mode=>{if(mode!==whatIfMode){resetWhatIf();setWhatIfMode(mode);}}}/>
        </div>
        {custom&&<p className="tool-muted">{L('Compila solo ciò che cambia. Usa il segno meno per indicare una riduzione.')}</p>}
        <div className={custom||whatIfMode==='installment'?'tool-form-grid tool-what-if-fields':'tool-form-grid'}>
          {(custom||whatIfMode==='expense')&&groupedField(custom?L('Variazione spesa singola'):L('Quanto costa?'), 'expense', L('Una spesa da pagare tutta insieme.'), '250')}
          {(custom||whatIfMode==='installment')&&groupedField(custom?L('Variazione rata mensile'):L('Quanto paghi al mese?'), 'installment', L('La prima rata viene conteggiata dopo 30 giorni.'), '50')}
          {(whatIfMode==='installment'||custom&&!!amount('installment'))&&plainInput(T('installmentMonths'),whatIf.installments,setField('installments'),'what-if-installments',L('Inserisci da 1 a 120 rate.'),'1')}
          {(custom||whatIfMode==='income')&&groupedField(custom?L('Variazione entrate mensili'):L('Quanto guadagni in più al mese?'), 'income', L('Conteggiato una volta ogni 30 giorni.'), '100')}
          {(custom||whatIfMode==='fixedCost')&&groupedField(custom?L('Variazione costi fissi mensili'):L('Quanto spendi in meno al mese?'), 'fixedCost', L('Conteggiato una volta ogni 30 giorni.'), '50')}
        </div>
        {!custom&&whatIfMode!=='expense'&&<p className="tool-muted">{L('Il primo importo entra nel calcolo dopo 30 giorni, poi una volta ogni 30 giorni.')}</p>}
        {(custom||whatIfDetails)&&detailFields}
        <div className="tool-action-row">
          <Btn style={secondary} onClick={()=>{
            resetWhatIf();
            setWhatIfMode(custom?'expense':'custom');
          }}>{custom?L('Torna alle scelte semplici'):L('Combina più cambiamenti')}</Btn>
          {!custom&&<Btn style={secondary} onClick={()=>setWhatIfDetails(!whatIfDetails)}>{whatIfDetails?L('Nascondi data e saldo'):L('Data e saldo')}</Btn>}
          {custom&&hasAmounts&&<Btn style={secondary} onClick={resetWhatIf}>{L('Svuota i campi')}</Btn>}
          <Btn style={{gridColumn:'1 / -1'}} disabled={!hasAmounts} onClick={calculateChange}>{L('Vedi il cambio')}</Btn>
        </div>
        {whatIfError&&<p role="alert" className="tool-error">{L('Controlla l’importo, la data e il numero di rate.')}</p>}
      </div>
      {comparison&&(selected||investmentAvailable)&&<div className="tool-what-if-result-anchor" ref={whatIfResult}>
        <div className="tool-card tool-result-panel">
        <h3>{L('Cosa cambia')}</h3>
        {purchaseInBudget&&budgetResult&&<div className={`tool-result-hero${budgetResult.scenario<0?' tool-result-warning':''}`}>
          <span>{L('Budget del periodo corrente')}</span>
          <strong>{budgetResult.scenario<0?L('La spesa supera il Budget'):L('La spesa rientra nel Budget')}</strong>
          <small>{budgetResult.scenario<0?`${display(-budgetResult.scenario)} ${L('oltre il limite')}`:`${L('Dopo la spesa restano')} ${display(budgetResult.scenario)}`}</small>
        </div>}
        <div className="tool-question"><span>{L('Periodo della previsione')}</span>{investmentAvailable?
          <select aria-label={L('Periodo della previsione')} value={whatIfDays} onChange={e=>setWhatIfDays(e.currentTarget.value)} style={{colorScheme:'light',background:'#fff',color:'#000'}}>
            <optgroup label={L('Giorni')}>{[30,60,90].map(days=><option key={days} value={String(days)}>{days} {L('giorni')}</option>)}</optgroup>
            <optgroup label={L('Anni')}>{[1,2,5,6,10].map(years=><option key={years} value={`${years}y`}>{years} {L(years===1?'anno':'anni')}</option>)}</optgroup>
          </select>:<SettingsSegmented value={whatIfDays} columns={3} items={[30,60,90].map(days=>({id:String(days),label:`${days} ${L('giorni')}`}))} onChange={setWhatIfDays}/>}</div>
        {investmentAvailable&&<>
          {monthlyBaseline!==null&&(whatIfMode==='income'||monthlyBaseline>=monthlyContribution)&&pair(
            L(whatIfMode==='income'?'Entrate medie al mese':'Spese medie al mese'),
            monthlyBaseline,monthlyBaseline+(whatIfMode==='income'?monthlyContribution:-monthlyContribution),
          )}
          {!custom&&<p className="tool-muted">{L(whatIfMode==='income'
            ?'Le entrate aumentano. I limiti di spesa del Budget restano quelli impostati.'
            :'Ridurre le spese libera denaro senza aumentare le entrate.')}</p>}
          {simulatorSectionLabel(L('Se metti da parte o investi questi soldi'))}
          <p className="tool-muted">{display(monthlyContribution)} {L('al mese')} · {depositMonths} {L(depositMonths===1?'versamento':'versamenti')}</p>
          <div className="tool-metric-grid">
            {[0,3,4,5].map(rate=>{
              const total=projectMonthlySavings({monthlySavings:monthlyContribution,months:depositMonths,annualRate:rate});
              const gain=total-monthlyContribution*depositMonths;
              return <div key={rate}>{metric(
              rate===0?L('Senza investirli'):`${rate}% ${L('annuo ipotetico')}`,
              display(total),
              rate>0,
              )}{rate>0&&<p className="tool-muted">+{display(gain)} {L('di rendimento')}</p>}</div>;
            })}
          </div>
          <p className="tool-muted">{depositMonths<=1&&L('Il primo versamento arriva a fine mese. Il rendimento si vede dal mese successivo.')} {L('Rendimenti ipotetici, al lordo di costi e imposte.')}</p>
        </>}
        {selected&&<>
        {selected.current===null?<p className="tool-muted" role="status">{L('I movimenti disponibili non bastano per stimare quanto risparmieresti. Servono movimenti nei tre periodi conclusi o entrate e uscite future già previste.')}</p>:<>
          {pair(selected.basis==='scheduled'?L('Entrate meno uscite già previste'):L('Risparmio previsto'),selected.current,selected.scenario)}
          <p className="tool-muted">{selected.basis==='history'?L('Stima dagli ultimi tre periodi conclusi e dai cambiamenti già programmati.'):selected.basis==='scheduled'?L('Sono inclusi solo i movimenti futuri già noti.'):selected.basis==='plan'?L('Stima basata sulle entrate e sulle spese che hai pianificato nel Budget.'):L('Stima dai movimenti e dalle ricorrenze disponibili.')}</p>
        </>}
        {budgetResult?pair(L('Quanto resta del Budget nel periodo corrente'),budgetResult.current,budgetResult.scenario):
          <p className="tool-muted">{L('Imposta un Budget per sapere se hai spazio per questa spesa.')}</p>}
        {selected.currentBalance!==null&&pair(L('Saldo stimato alla fine del periodo'),selected.currentBalance,selected.scenarioBalance)}
        </>}
        </div>
      </div>}
    </div>;
  }

  const utilityTabs=[
    {id:'calculator',icon:'▦',label:T('calculatorShort')},
    {id:'converter',icon:'⇄',label:T('converterShort')},
  ];
  const savingsTabs=[
    {id:'savings',icon:'🎯',label:T('savingsShort')},
    {id:'buyVsSave',icon:'⚖️',label:T('buyVsSaveShort')},
    {id:'inflation',icon:'📉',label:T('inflationShort')},
  ];
  const savingsPage=savingsTabs.some(item=>item.id===page);
  const simulatorTabs=[
    {id:'savings',icon:'🎯',label:L('Risparmio e inflazione'),active:savingsPage},
    {id:'whatIf',icon:'💭',label:L('E se…?'),active:page==='whatIf'},
    {id:'forecast',icon:'📈',label:L('Proiezioni'),active:page==='forecast'},
  ];
  const automationTabs=[
    {id:'recurring',icon:'🔁',label:T('recurringShort')},
    {id:'automaticRules',icon:'⚙️',label:rulesText(ctx.lang||'it','title')},
    {id:'anomalies',icon:'🔎',label:L('Anomalie')},
  ];

  return <section className="fainance-tools" data-dark={ctx.dark ? "true" : "false"} style={style} aria-label={T('title')}>
    <header className="tool-heading"><span>🧰</span><div><h2>{T('title')}</h2><p>{T('utilities')} · {T('automations')} · {T('simulators')}</p></div></header>
    <nav className="tool-main-navigation" aria-label={T('title')}>
      <div className="tool-nav-group"><span className="tool-nav-label">{T('utilities')}</span><div className="tool-tabs tool-main-tabs tool-main-tabs-utilities">{utilityTabs.map(item=><button key={item.id} aria-pressed={page===item.id} onClick={()=>changePage(item.id)}><span className="tool-tab-icon">{item.icon}</span><span>{item.label}</span></button>)}</div></div>
      <div className="tool-nav-group"><span className="tool-nav-label">{T('automations')}</span><div className="tool-tabs tool-main-tabs tool-main-tabs-automations" style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>{automationTabs.map(item=><button key={item.id} aria-pressed={page===item.id} onClick={()=>changePage(item.id)} style={{width:'100%'}}><span className="tool-tab-icon">{item.icon}</span><span>{item.label}</span></button>)}</div></div>
      <div className="tool-nav-group"><span className="tool-nav-label">{T('simulators')}</span><div className="tool-tabs tool-main-tabs tool-main-tabs-simulators">{simulatorTabs.map(item=><button key={item.id} aria-pressed={item.active} onClick={()=>{if(!item.active)changePage(item.id);}}><span className="tool-tab-icon">{item.icon}</span><span>{item.label}</span></button>)}</div></div>
    </nav>
    {savingsPage&&<SettingsSegmented value={page} columns={3} items={savingsTabs} onChange={changePage}/>}
    {error&&<p role="alert" className="tool-error">{T('error')}{page==='converter'&&<button type="button" onClick={()=>convert()}>{L('Riprova')}</button>}</p>}
    {busy&&<p role="status">{T('busy')}</p>}
    {transaction?<div className="tool-card"><button onClick={()=>setTransaction(null)}>‹ {L('Indietro')}</button><h3>{T('create')}</h3><div className="tool-tabs"><button aria-pressed={direction==='expense'} onClick={()=>setDirection('expense')}>{L('Uscita')}</button><button aria-pressed={direction==='income'} onClick={()=>setDirection('income')}>{L('Entrata')}</button></div><ExpenseForm type={direction} initialValue={transaction} draftNamespace="draft_tool_" onSave={item=>{const accepted=direction==='expense'?ctx.addExpenses([item],'tool'):ctx.addIncomes([item],'tool');if(accepted===false)return false;setTransaction(null);return true;}}/></div>:<>
      {page==='calculator'&&<div className="tool-card"><h3>{T('calculator')}</h3><AmountCalculatorButton embedded key={seed.key} value={seed.value} onResult={calculated} onEdit={()=>{invalidate();setCalc(null);setSaved(false);}}/>{calc!=null&&<output className="tool-result">{smallDecimalNode(number(calc),ctx.lang||'it')}</output>}{saved&&<p role="status" className="tool-muted">✓ {T('saved')}</p>}{resultActions()}{inlineHistory('calculator')}</div>}
      {page==='converter'&&<div className="tool-card"><h3>{T('converter')}</h3><div style={{display:'flex',flexDirection:'column',gap:8}}><div style={{display:'flex',alignItems:'center',gap:10,minHeight:64,padding:'10px 14px',borderRadius:16,border:`1px solid ${ctx.borderC}`,background:ctx.dark?'#2e3849':'#f4f7fb'}}><button onClick={()=>{setPicker('from');setSearch('');}} style={{display:'flex',alignItems:'center',gap:8,border:0,background:'transparent',color:readableDarkText(ctx.textC, ctx.dark, 'transparent'),fontWeight:900,fontSize:16,padding:0,cursor:'pointer',minWidth:118}}><span style={{fontSize:22}}>{currencyFlag(from)}</span><span>{from}</span><span style={{fontSize:12,opacity:.65}}>⌄</span></button><input aria-label={L('Importo')} inputMode="decimal" value={amount} onChange={e=>changeAmount(e.target.value)} placeholder="0" style={{flex:1,minWidth:0,border:0,outline:0,background:'transparent',textAlign:'right',color:readableDarkText(ctx.textC, ctx.dark, 'transparent'),fontWeight:900,fontSize:30,padding:0}}/></div><div style={{display:'flex',justifyContent:'center',height:18,margin:'-5px 0'}}><button className="tool-swap" aria-label={T('swap')} onClick={swap} style={{width:34,height:34,minHeight:34,borderRadius:999,zIndex:2}}>⇅</button></div><div style={{display:'flex',alignItems:'center',gap:10,minHeight:64,padding:'10px 14px',borderRadius:16,border:`1px solid ${ctx.borderC}`,background:ctx.dark?'#2e3849':'#f4f7fb'}}><button onClick={()=>{setPicker('to');setSearch('');}} style={{display:'flex',alignItems:'center',gap:8,border:0,background:'transparent',color:readableDarkText(ctx.textC, ctx.dark, 'transparent'),fontWeight:900,fontSize:16,padding:0,cursor:'pointer',minWidth:118}}><span style={{fontSize:22}}>{currencyFlag(to)}</span><span>{to}</span><span style={{fontSize:12,opacity:.65}}>⌄</span></button><output aria-label={T('converter')} style={{flex:1,minWidth:0,textAlign:'right',color:readableDarkText(ctx.confirmButtonColor||'#378ADD', ctx.dark, ctx.dark?'#2e3849':'#f4f7fb'),fontWeight:900,fontSize:30}}>{quote?smallDecimalNode(number(quote.result,to),ctx.lang||'it'):'—'}</output></div></div>{quote&&<p className="tool-muted" style={{textAlign:'center',marginTop:8}}>{T('rate')}: 1 {from} = {smallDecimalNode(new Intl.NumberFormat(ctx.lang||'it',{maximumFractionDigits:8}).format(quote.rate),ctx.lang||'it')} {to} · {L('conversione automatica')}</p>}{saved&&<p role="status" className="tool-muted">✓ {T('saved')}</p>}{resultActions()}{inlineHistory('converter')}</div>}

      {page==='savings'&&<div className="tool-simulator-page"><div className="tool-card tool-simulator tool-simulator-intro"><div className="tool-simulator-title"><span>🎯</span><div><h3>{T('savings')}</h3><p className="tool-muted">{savingsMode==='byDate'?T('saveByDateHint'):T('saveByMonthlyHint')}</p></div></div><div className="tool-question"><span>{T('whatToDiscover')}</span>{modeSwitch(savingsMode,[{id:'byDate',label:T('saveByDate')},{id:'byMonthly',label:T('saveByMonthly')}],setSavingsMode)}</div></div><div className="tool-card tool-input-panel">{simulatorSectionLabel(T('simulationData'))}<div className="tool-form-grid tool-paired-fields">{moneyInput(T('goalAmount'),savings.goal,value=>setSavings(p=>({...p,goal:value})),'savings-goal',T('infoGoalAmount'),'5.000')}{moneyInput(T('currentSavings'),savings.current,value=>setSavings(p=>({...p,current:value})),'savings-current',T('infoCurrentSavings'),'1.000')}{savingsMode==='byDate'?dateInput(T('targetDate'),savings.targetDate,value=>setSavings(p=>({...p,targetDate:value})),'savings-date',T('infoTargetDate')):moneyInput(T('monthlySavingPlan'),savings.monthlySavings,value=>setSavings(p=>({...p,monthlySavings:value})),'savings-monthly',T('infoMonthlySavings'),'300')}{percentInput(T('annualReturn'),savings.annualRate,value=>setSavings(p=>({...p,annualRate:value})),'savings-return',T('infoAnnualReturn'))}</div>{savingsInvalid&&<p className="tool-error">{T('error')}</p>}</div>{savingsResult&&<div className="tool-card tool-result-panel">{simulatorSectionLabel(T('resultSection'))}<div className="tool-progress-wrap tool-progress-rich"><div className="tool-progress-orbit" style={{'--tool-progress-pct':`${Math.min(100,Math.max(0,(savingsResult.current/savingsResult.goal)*100))}%`} as any}><strong>{Math.min(100,Math.max(0,Math.round((savingsResult.current/savingsResult.goal)*100)))}%</strong></div><div className="tool-progress-copy"><div className="tool-progress-label"><span>{T('alreadyCovered')}</span><strong>{smallDecimalNode(money(savingsResult.current,mainCurrency),ctx.lang||'it')}</strong></div><div className="tool-progress"><span style={{width:`${Math.min(100,Math.max(0,(savingsResult.current/savingsResult.goal)*100))}%`}}/></div></div></div>{savingsMode==='byDate'?<div className="tool-result-hero"><span>{T('monthlyRequired')}</span><strong>{smallDecimalNode(money(savingsResult.monthlyRequired,mainCurrency),ctx.lang||'it')}</strong><small>{T('perMonth')}</small></div>:<div className="tool-result-hero"><span>{T('targetReachedIn')}</span><strong>{savingsResult.months} {T('monthShort')}</strong><small>{T('targetReachedDate')}: {savingsTargetDate(savingsResult.months)}</small></div>}<div className="tool-metric-grid">{metric(T('months'),`${savingsResult.months} ${T('monthShort')}`)}{metric(T('totalContributions'),money(savingsResult.totalContributions,mainCurrency))}{metric(T('estimatedGrowth'),money(savingsResult.projectedGrowth,mainCurrency),true)}</div></div>}</div>}

      {page==='buyVsSave'&&<div className="tool-simulator-page"><div className="tool-card tool-simulator tool-simulator-intro"><div className="tool-simulator-title"><span>⚖️</span><div><h3>{T('buyVsSave')}</h3><p className="tool-muted">{T('buyVsSaveHint')}</p></div></div><div className="tool-question"><span>{T('whatToDiscover')}</span>{modeSwitch(purchaseMode,[{id:'cash',label:T('cashPurchase')},{id:'installments',label:T('installmentPurchase')}],setPurchaseMode)}</div></div><div className="tool-card tool-input-panel">{simulatorSectionLabel(T('simulationData'))}<div className="tool-form-grid tool-paired-fields">{moneyInput(T('goalAmount'),purchase.goal,value=>setPurchase(p=>({...p,goal:value})),'purchase-goal',T('infoGoalAmount'),'5.000')}{moneyInput(T('currentSavings'),purchase.current,value=>setPurchase(p=>({...p,current:value})),'purchase-current',T('infoPurchaseCurrentSavings'),'1.000')}{moneyInput(T('monthlySavings'),purchase.monthlySavings,value=>setPurchase(p=>({...p,monthlySavings:value})),'purchase-monthly',T('infoMonthlySavings'),'300')}{moneyInput(T('purchaseAmount'),purchase.purchaseAmount,value=>setPurchase(p=>({...p,purchaseAmount:value})),'purchase-amount',T('infoPurchaseAmount'),'1.000')}{purchaseMode==='installments'&&plainInput(T('installmentMonths'),purchase.installmentMonths,value=>setPurchase(p=>({...p,installmentMonths:value})),'purchase-installments',T('installmentMonths'),'12')}{purchaseMode==='installments'&&percentInput(T('financingRate'),purchase.installmentRate,value=>setPurchase(p=>({...p,installmentRate:value})),'purchase-financing-rate',T('financingRate'))}</div>{purchaseInvalid&&<p className="tool-error">{T('error')}</p>}</div>{purchaseResult&&<div className="tool-card tool-result-panel">{simulatorSectionLabel(T('resultSection'))}<div className={`tool-result-hero ${purchaseResult.delayMonths>0?'tool-result-warning':''}`}><span>{T('impact')}</span><strong>{purchaseResult.delayMonths>0?textTemplate('delayResult',{months:purchaseResult.delayMonths}):T('noDelayResult')}</strong><small>{purchaseMode==='cash'?textTemplate('savingsEquivalentText',{months:number(purchase.monthlySavings?localNumber(purchase.purchaseAmount)/Math.max(1,localNumber(purchase.monthlySavings)):0)}):textTemplate('installmentImpactText',{amount:money(Math.max(0,purchaseResult.monthlySavingsDuringInstallment),mainCurrency)})}</small></div><div className="tool-timeline-compare"><div><div className="tool-timeline-head"><span>{T('withoutPurchase')}</span><strong>{dateLabel(purchaseResult.monthsWithoutPurchase)}</strong></div><div className="tool-timeline"><span style={{width:`${Math.max(8,Math.min(100,purchaseResult.monthsWithoutPurchase/Math.max(1,purchaseResult.monthsWithPurchase)*100))}%`}}/></div></div><div><div className="tool-timeline-head"><span>{T('withPurchase')}</span><strong>{dateLabel(purchaseResult.monthsWithPurchase)}</strong></div><div className="tool-timeline tool-timeline-warning"><span style={{width:'100%'}}/></div></div></div><div className="tool-metric-grid">{purchaseMode==='cash'?<>{metric(T('purchaseAmount'),money(purchaseResult.purchaseAmount,mainCurrency))}{metric(T('remainingAfterPurchase'),money(purchaseResult.savingsAfterPurchase,mainCurrency),purchaseResult.savingsAfterPurchase<0)}</>:<>{metric(T('monthlyInstallment'),money(purchaseResult.monthlyInstallment,mainCurrency),true)}{metric(T('financingCost'),money(purchaseResult.financingCost,mainCurrency))}</>}</div></div>}</div>}

      {page==='inflation'&&<div className="tool-simulator-page"><div className="tool-card tool-simulator tool-simulator-intro"><div className="tool-simulator-title"><span>📉</span><div><h3>{T('inflation')}</h3><p className="tool-muted">{T('inflationHint')}</p></div></div><div className="tool-question"><span>{T('whatToDiscover')}</span>{modeSwitch(inflationMode,[{id:'cost',label:T('futureCostMode')},{id:'power',label:T('futurePowerMode')}],setInflationMode)}</div></div><div className="tool-card tool-input-panel">{simulatorSectionLabel(T('simulationData'))}<div className="tool-form-grid tool-paired-fields tool-inflation-fields">{moneyInput(T('currentAmount'),inflation.amount,value=>setInflation(p=>({...p,amount:value})),'inflation-amount',T('infoCurrentAmount'),'10.000')}{percentInput(T('inflationRate'),inflation.inflationRate,value=>setInflation(p=>({...p,inflationRate:value})),'inflation-rate',T('infoInflationRate'))}{plainInput(T('years'),inflation.years,value=>setInflation(p=>({...p,years:value})),'inflation-years',T('infoYears'),'10')}</div><div className="tool-quick-scenarios"><span>{T('quickScenarios')}</span><div><div>{quickChoices([2,3,5],inflation.inflationRate,value=>setInflation(p=>({...p,inflationRate:value})),'%')}</div><div>{quickChoices([5,10,20,30],inflation.years,value=>setInflation(p=>({...p,years:value})))}</div></div></div>{inflationInvalid&&<p className="tool-error">{T('error')}</p>}</div>{inflationResult&&inflationSnapshot&&<div className="tool-card tool-result-panel">{simulatorSectionLabel(T('resultSection'))}<div className="tool-result-hero"><span>{inflationMode==='cost'?T('futureNeeded'):T('futureBuyingPower')}</span><strong>{smallDecimalNode(money(inflationMode==='cost'?inflationResult.futureNeeded:inflationResult.futureBuyingPower,mainCurrency),ctx.lang||'it')}</strong><small>{inflationMode==='cost'?textTemplate('inflationCostSummary',{amount:money(inflationResult.amount,mainCurrency)}):T('inflationPowerSummary')}</small></div><div className="tool-three-point-flow"><div><span>{T('today')}</span><strong>{smallDecimalNode(money(inflationResult.amount,mainCurrency),ctx.lang||'it')}</strong></div><b>→</b><div><span>{T('midPeriod')}</span><strong>{smallDecimalNode(money(inflationMode==='cost'?inflationSnapshot.midFutureNeeded:inflationSnapshot.midBuyingPower,mainCurrency),ctx.lang||'it')}</strong><small>{smallDecimalNode(number(inflationSnapshot.midpointYears),ctx.lang||'it')} {T('yearsSuffix')}</small></div><b>→</b><div><span>{inflationMode==='cost'?T('futureCost'):T('buyingPower')}</span><strong>{smallDecimalNode(money(inflationMode==='cost'?inflationResult.futureNeeded:inflationResult.futureBuyingPower,mainCurrency),ctx.lang||'it')}</strong><small>{smallDecimalNode(number(inflationResult.years),ctx.lang||'it')} {T('yearsSuffix')}</small></div></div><div className="tool-metric-grid">{metric(T('purchasingLoss'),money(inflationResult.purchasingLoss,mainCurrency))}{metric(T('purchasingLossPercent'),`${number(inflationResult.amount>0?inflationResult.purchasingLoss/inflationResult.amount*100:0)}%`,true)}</div></div>}</div>}
      {page==='whatIf'&&renderWhatIf()}
      {page==='recurring'&&<div className="tool-embedded-page"><RecurringManager/></div>}
      {page==='forecast'&&<div className={ctx.dark?'fc-panel fc-dark':'fc-panel'}><FinancialForecastPanel/></div>}
      {page==='anomalies'&&renderAnomalies(()=>changePage('recurring'))}
      {page==='automaticRules'&&<div className="tool-embedded-page"><div className="tool-embedded-heading"><span>⚙️</span><div><h3>{rulesText(ctx.lang||'it','title')}</h3><p>{rulesText(ctx.lang||'it','intro')}</p></div></div><AutomaticRulesPanel/></div>}

    </>}
    {sharePicker&&<FainancePickerModal open={sharePicker} title={T('project')} onClose={()=>setSharePicker(false)} zIndex={2147483000}><div className="tool-project-list">{projects.map(p=><button key={p.id} onClick={()=>{const id=String(p.id);setProject(id);setSharePicker(false);prepare('share',id);}}><strong>{p.name}</strong><span>›</span></button>)}</div></FainancePickerModal>}
    {picker&&<FainancePickerModal open={!!picker} title={T('chooseCurrency')} onClose={()=>setPicker(null)} zIndex={2147483000}><input autoFocus aria-label={L('Cerca')} placeholder={L('Cerca')} value={search} onChange={e=>setSearch(e.target.value)}/><div className="tool-currency-list">{orderedToolCurrencies(CURRENCIES,ctx.currency,ctx.secondaryCurrency,tools.recentCurrencies).filter(c=>`${c.code} ${c.symbol} ${L(c.name)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(c=><button key={c.code} onClick={()=>chooseCurrency(c.code)}><strong>{c.symbol} {c.code}</strong><span>{L(c.name)}</span></button>)}</div></FainancePickerModal>}
  </section>;
}
