import {useEffect,useRef,useState} from 'react';
import {useApp,CURRENCIES,parseMoney,todayStr} from '../core';
import {AmountCalculatorButton,ExpenseForm,FainancePickerModal} from '../widget';
import {toolsText} from '../i18n/toolsTranslations';
import {translateFainanceText} from '../traduzioni';
import {addToolHistory,pruneToolHistory,orderedToolCurrencies,roundCurrency,currencyDigits,fetchToolRate,invertToolQuote,toolCurrencyAllowed} from '../finance/tools';
import './tools.css';

export function ToolsPanel(){
  const ctx:any=useApp(),T=(key:any)=>toolsText(ctx.lang||'it',key),L=(s:string)=>translateFainanceText(s,ctx.lang||'it');
  const pair=ctx.financeEvolution.tools.lastCurrencyPair||[ctx.currency,ctx.secondaryCurrency&&ctx.secondaryCurrency!==ctx.currency?ctx.secondaryCurrency:(ctx.currency==='USD'?'EUR':'USD')];
  const [page,setPage]=useState('calculator'),[seed,setSeed]=useState({value:'',key:0}),[calc,setCalc]=useState<number|null>(null);
  const [from,setFrom]=useState(pair[0]),[to,setTo]=useState(pair[1]),[amount,setAmount]=useState(''),[quote,setQuote]=useState<any>(null);
  const [picker,setPicker]=useState<string|null>(null),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[saved,setSaved]=useState(false);
  const [transaction,setTransaction]=useState<any>(null),[direction,setDirection]=useState('expense'),[project,setProject]=useState<string|null>(null),[sharePicker,setSharePicker]=useState(false);
  const request=useRef(0),abort=useRef<AbortController|null>(null);
  useEffect(()=>()=>{request.current++;abort.current?.abort();},[]);
  useEffect(()=>{
    const id=requestAnimationFrame(()=>{
      try{const active=document.activeElement as HTMLElement|null;if(active&&typeof active.blur==='function')active.blur();}catch{}
    });
    return()=>cancelAnimationFrame(id);
  },[page]);
  const tools=pruneToolHistory(ctx.financeEvolution.tools),projects=(ctx.shareProjects||[]).filter(p=>p.id!=null);
  const style:any={'--tool-card':ctx.cardBg,'--tool-text':ctx.textC,'--tool-sub':ctx.subC||'#77808b','--tool-border':ctx.borderC,'--tool-primary':ctx.confirmButtonColor||'#378ADD','--tool-soft':ctx.dark?'#253445':'#edf5fc'};
  const number=(value:number,code?:string)=>new Intl.NumberFormat(ctx.lang||'it',{minimumFractionDigits:code?currencyDigits(code):0,maximumFractionDigits:code?currencyDigits(code):2}).format(value);
  const money=(value:number,code:string)=>`${number(value,code)} ${CURRENCIES.find(c=>c.code===code)?.symbol||code}`;
  const currencyName=code=>`${CURRENCIES.find(c=>c.code===code)?.symbol||code} ${code}`;
  const currencyFlag=(code:string)=>({EUR:'🇪🇺',USD:'🇺🇸',GBP:'🇬🇧',CHF:'🇨🇭',JPY:'🇯🇵',AUD:'🇦🇺',CAD:'🇨🇦',CNY:'🇨🇳',HKD:'🇭🇰',NZD:'🇳🇿',SEK:'🇸🇪',NOK:'🇳🇴',DKK:'🇩🇰',PLN:'🇵🇱',CZK:'🇨🇿',HUF:'🇭🇺',RON:'🇷🇴',BGN:'🇧🇬',TRY:'🇹🇷',BRL:'🇧🇷',MXN:'🇲🇽',ARS:'🇦🇷',CLP:'🇨🇱',COP:'🇨🇴',INR:'🇮🇳',KRW:'🇰🇷',SGD:'🇸🇬',THB:'🇹🇭',IDR:'🇮🇩',MYR:'🇲🇾',PHP:'🇵🇭',ZAR:'🇿🇦',AED:'🇦🇪',SAR:'🇸🇦',ILS:'🇮🇱',EGP:'🇪🇬',MAD:'🇲🇦'} as any)[String(code||'').toUpperCase()]||'💱';
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
  return <section className="fainance-tools" style={style} aria-label={T('title')}>
    <header className="tool-heading"><span>🧰</span><div><h2>{T('title')}</h2><p>{T('calculator')} · {T('converter')}</p></div></header>
    <nav className="tool-tabs" aria-label={T('title')}>{['calculator','converter'].map(id=><button key={id} aria-pressed={page===id} onClick={()=>changePage(id)}>{id==='calculator'?'▦':'⇄'} {T(id)}</button>)}</nav>
    {error&&<p role="alert" className="tool-error">{T('error')}</p>}
    {busy&&<p role="status">{T('busy')}</p>}
    {transaction?<div className="tool-card"><button onClick={()=>setTransaction(null)}>‹ {L('Indietro')}</button><h3>{T('create')}</h3><div className="tool-tabs"><button aria-pressed={direction==='expense'} onClick={()=>setDirection('expense')}>{L('Uscita')}</button><button aria-pressed={direction==='income'} onClick={()=>setDirection('income')}>{L('Entrata')}</button></div><ExpenseForm type={direction} initialValue={transaction} draftNamespace="draft_tool_" onSave={item=>{const accepted=direction==='expense'?ctx.addExpenses([item],'tool'):ctx.addIncomes([item],'tool');if(accepted===false)return false;setTransaction(null);return true;}}/></div>:<>
      {page==='calculator'&&<div className="tool-card"><h3>{T('calculator')}</h3><AmountCalculatorButton embedded key={seed.key} value={seed.value} onResult={calculated} onEdit={()=>{invalidate();setCalc(null);setSaved(false);}}/>{calc!=null&&<output className="tool-result">{number(calc)}</output>}{saved&&<p role="status" className="tool-muted">✓ {T('saved')}</p>}{resultActions()}{inlineHistory('calculator')}</div>}
      {page==='converter'&&<div className="tool-card"><h3>{T('converter')}</h3><div style={{display:'flex',flexDirection:'column',gap:8}}><div style={{display:'flex',alignItems:'center',gap:10,minHeight:64,padding:'10px 14px',borderRadius:16,border:`1px solid ${ctx.borderC}`,background:ctx.dark?'#2e3849':'#f4f7fb'}}><button onClick={()=>{setPicker('from');setSearch('');}} style={{display:'flex',alignItems:'center',gap:8,border:0,background:'transparent',color:ctx.textC,fontWeight:900,fontSize:16,padding:0,cursor:'pointer',minWidth:118}}><span style={{fontSize:22}}>{currencyFlag(from)}</span><span>{from}</span><span style={{fontSize:12,opacity:.65}}>⌄</span></button><input aria-label={L('Importo')} inputMode="decimal" value={amount} onChange={e=>changeAmount(e.target.value)} placeholder="0" style={{flex:1,minWidth:0,border:0,outline:0,background:'transparent',textAlign:'right',color:ctx.textC,fontWeight:900,fontSize:30,padding:0}}/></div><div style={{display:'flex',justifyContent:'center',height:18,margin:'-5px 0'}}><button className="tool-swap" aria-label={T('swap')} onClick={swap} style={{width:34,height:34,minHeight:34,borderRadius:999,zIndex:2}}>⇅</button></div><div style={{display:'flex',alignItems:'center',gap:10,minHeight:64,padding:'10px 14px',borderRadius:16,border:`1px solid ${ctx.borderC}`,background:ctx.dark?'#2e3849':'#f4f7fb'}}><button onClick={()=>{setPicker('to');setSearch('');}} style={{display:'flex',alignItems:'center',gap:8,border:0,background:'transparent',color:ctx.textC,fontWeight:900,fontSize:16,padding:0,cursor:'pointer',minWidth:118}}><span style={{fontSize:22}}>{currencyFlag(to)}</span><span>{to}</span><span style={{fontSize:12,opacity:.65}}>⌄</span></button><output aria-label={T('converter')} style={{flex:1,minWidth:0,textAlign:'right',color:ctx.confirmButtonColor||'#378ADD',fontWeight:900,fontSize:30}}>{quote?number(quote.result,to):'—'}</output></div></div>{quote&&<p className="tool-muted" style={{textAlign:'center',marginTop:8}}>{T('rate')}: 1 {from} = {new Intl.NumberFormat(ctx.lang||'it',{maximumFractionDigits:8}).format(quote.rate)} {to} · {L('conversione automatica')}</p>}{saved&&<p role="status" className="tool-muted">✓ {T('saved')}</p>}{resultActions()}{inlineHistory('converter')}</div>}
    </>}
    {sharePicker&&<FainancePickerModal open={sharePicker} title={T('project')} onClose={()=>setSharePicker(false)} zIndex={2147483000}><div className="tool-project-list">{projects.map(p=><button key={p.id} onClick={()=>{const id=String(p.id);setProject(id);setSharePicker(false);prepare('share',id);}}><strong>{p.name}</strong><span>›</span></button>)}</div></FainancePickerModal>}
    {picker&&<FainancePickerModal open={!!picker} title={T('chooseCurrency')} onClose={()=>setPicker(null)} zIndex={2147483000}><input autoFocus aria-label={L('Cerca')} placeholder={L('Cerca')} value={search} onChange={e=>setSearch(e.target.value)}/><div className="tool-currency-list">{orderedToolCurrencies(CURRENCIES,ctx.currency,ctx.secondaryCurrency,tools.recentCurrencies).filter(c=>`${c.code} ${c.symbol} ${L(c.name)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(c=><button key={c.code} onClick={()=>chooseCurrency(c.code)}><strong>{c.symbol} {c.code}</strong><span>{L(c.name)}</span></button>)}</div></FainancePickerModal>}
  </section>;
}
