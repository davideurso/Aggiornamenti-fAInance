// Read-only savings projection. No cash opening balance, records or settings are written.
import { periodForDate, periodForKey, shiftPeriodKey } from './periodEngine.js';
import { validCalendarDate } from './financialCalendar.js';
import { recurringOccurrencesInPeriod } from './recurringOccurrences.js';
import { parseMoneyValue } from '../financeCalculations.js';
const list=x=>Array.isArray(x)?x:[];
const active=r=>r&&!r.deleted&&!r.archived&&!['deleted','archived','cancelled'].includes(String(r.status||'').toLowerCase());
const date=r=>String(r?.date||'').slice(0,10);
const cents=x=>Math.round(parseMoneyValue(x)*100);
const numeric=x=>typeof x==='number'?Number.isFinite(x):typeof x==='string'&&/^-?\s*\d[\d.,\s]*$/.test(x.trim());
const valid=r=>active(r)&&validCalendarDate(r.date)&&numeric(r.amount);
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const transfer=r=>!!(r.transferId||r.isTransfer||['transfer','giroconto','trasferimento'].includes(normalize(r.kind||r.type)));
const bucket=(r,kind)=>kind+'|'+String(kind==='income'?(r.incomeType??r.type??r.itype??''):(r.catId??''));
const MONTH_WORDS=new Set(["gennaio", "january", "enero", "janvier", "januar", "janeiro", "styczen", "januari", "ianuarie", "ιανουαριος", "febbraio", "february", "febrero", "fevrier", "februar", "fevereiro", "luty", "februari", "februarie", "φεβρουαριος", "marzo", "march", "mars", "marz", "marco", "marzec", "maart", "martie", "μαρτιος", "aprile", "april", "abril", "avril", "kwiecien", "aprilie", "απριλιος", "maggio", "may", "mayo", "mai", "maio", "maj", "mei", "μαϊος", "giugno", "june", "junio", "juin", "juni", "junho", "czerwiec", "iunie", "ιουνιος", "luglio", "july", "julio", "juillet", "juli", "julho", "lipiec", "iulie", "ιουλιος", "agosto", "august", "aout", "sierpien", "augustus", "αυγουστος", "settembre", "september", "septiembre", "septembre", "setembro", "wrzesien", "septembrie", "σεπτεμβριος", "ottobre", "october", "octubre", "octobre", "oktober", "outubro", "pazdziernik", "octombrie", "οκτωβριος", "novembre", "november", "noviembre", "novembro", "listopad", "noiembrie", "νοεμβριος", "dicembre", "december", "diciembre", "decembre", "dezember", "dezembro", "grudzien", "decembrie", "δεκεμβριος"].map(normalize));
function incomeSourceDescription(row){
 const text=normalize(row.desc||row.description||row.name||''),words=text.split(' ');
 if(words.length>2&&/^(19|20)\d{2}$/.test(words.at(-1)))words.pop();
 return words.length>1&&MONTH_WORDS.has(words.at(-1))?words.slice(0,-1).join(' '):text;
}
const source=(r,kind)=>bucket(r,kind)+'|'+(kind==='income'?incomeSourceDescription(r):normalize(r.desc||r.description||r.name||''));
const sum=rows=>rows.reduce((n,r)=>n+cents(r.amount),0);
const shift=(value,days)=>{const [y,m,d]=value.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+days)).toISOString().slice(0,10);};
const CALENDAR={mode:'calendar',startDay:1};
export function buildSavingsForecast(options={}) {
 const {today,excludeExpense=()=>false,excludeIncome=()=>false}=options;
 if(!validCalendarDate(today))throw Error('INVALID_SAVINGS_FORECAST_DATE');
 const settings=options.periodSettings||options.financeEvolution?.period||CALENDAR;
 const currentPeriod=periodForDate(today,settings);
 const periods=[-3,-2,-1].map(i=>periodForKey(shiftPeriodKey(currentPeriod.key,i),settings));
 const rawExp=list(options.analysisExpenses??options.expenses),rawInc=list(options.incomes);
 const exp=rawExp.filter(r=>valid(r)&&!transfer(r)&&!excludeExpense(r));
 const inc=rawInc.filter(r=>valid(r)&&!transfer(r)&&!excludeIncome(r));
 const historical=(rows,p)=>rows.filter(r=>date(r)>=p.start&&date(r)<=p.end);
 const monthlyHistory=periods.map(p=>{
  const e=historical(exp,p),i=historical(inc,p);
  return {...p,income:sum(i)/100,expense:sum(e)/100,net:(sum(i)-sum(e))/100,
   observedRows:e.length+i.length,status:e.length+i.length?'PARTIAL':'N_D'};
 });
 const enough=monthlyHistory.every(p=>p.observedRows>0);
 // The current partial month never replaces or dilutes a completed month.
 const currentRows=(rows)=>rows.filter(r=>date(r)>=currentPeriod.start&&date(r)<=today);
 const current={...currentPeriod,through:today,income:sum(currentRows(inc))/100,expense:sum(currentRows(exp))/100,
  net:(sum(currentRows(inc))-sum(currentRows(exp)))/100,partial:today<currentPeriod.end};
 const averageCents=enough?Math.round(monthlyHistory.reduce((n,p)=>n+Math.round(p.net*100),0)/3):null;
 const historyRows={expense:exp.filter(r=>date(r)>=periods[0].start&&date(r)<=periods[2].end),
  income:inc.filter(r=>date(r)>=periods[0].start&&date(r)<=periods[2].end)};
 const end=shift(today,90),events=[];
 for(const [kind,rows] of [['expense',exp],['income',inc]])for(const [index,r] of rows.entries())
  if(date(r)>today&&date(r)<=end)events.push({id:kind+':'+String(r.id??index)+':'+index,date:date(r),kind,row:r,value:cents(r.amount),recorded:true});
 // Recurrences supply concrete dated changes, never an extra blanket monthly charge.
 for(const [index,r] of list(options.recurring).entries()) {
  if(!active(r)||transfer(r)||!numeric(r.amount))continue;
  const kind=r.rtype==='income'?'income':'expense';
  if(kind==='income'?excludeIncome({...r,type:r.incomeType??r.type}):excludeExpense(r))continue;
  for(let m=today.slice(0,7);m<=end.slice(0,7);m=shiftPeriodKey(m,1)){
   for(const occurrence of recurringOccurrencesInPeriod(r,m,CALENDAR,kind==='income'?inc:exp)){
    const d=String(occurrence._occurrenceDate||'');
    if(d<=today||d>end||(validCalendarDate(r.effectiveFrom)&&d<r.effectiveFrom.slice(0,10)))continue;
    const row={...r,desc:r.name,type:r.incomeType??r.type};
    // A recorded payment with a normalized period label already covers the plan.
    if(events.some(e=>e.recorded&&e.kind===kind&&e.date===d&&e.value===cents(r.amount)&&
      source(e.row,kind)===source(row,kind)&&(kind==='income'||String(e.row.methodId??'')===String(r.methodId??''))))continue;
    events.push({id:'rule:'+String(r.id??index)+'@'+d,date:d,kind,row,value:cents(r.amount),recorded:false});
   }
  }
 }
 events.sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 function historicalSource(row,kind){return historyRows[kind].filter(r=>source(r,kind)===source(row,kind));}
 const horizons=[30,60,90].map(days=>{
  const dateEnd=shift(today,days),months=days/30,selected=events.filter(e=>e.date<=dateEnd);
  if(!enough)return {days,date:dateEnd,status:'N_D',baseSavings:null,adjustment:null,estimatedSavings:null,adjustments:[],ledgerBalance:null};
  const adjustments=[],used=new Set(),consumed=new Map();
  for(const event of selected){
   if(used.has(event.id))continue;
   const r=event.row,sign=event.kind==='income'?1:-1,key=bucket(r,event.kind);
   // A signed reversal is an additional concrete refund/chargeback, not a replacement salary or bill.
   if(r.oneOff||r.exceptional||event.value<0){
    used.add(event.id);
    if(event.value)adjustments.push({id:event.id,date:event.date,title:String(r.desc||r.name||''),kind:event.kind,
      reason:'EXPLICIT_EXCEPTIONAL',amount:sign*event.value/100,knownAmount:event.value/100,historicalAmount:0});
    continue;
   }
   const hist=historicalSource(r,event.kind);
   const groups=periods.map(p=>hist.filter(x=>date(x)>=p.start&&date(x)<=p.end));
   // Only a single established payment per completed period permits a known price/pay change.
   if(groups.every(g=>g.length===1)&&groups.every(g=>!g[0].oneOff&&!g[0].exceptional)){
    const keyPeriod=periodForDate(event.date,settings).key;
    const peers=selected.filter(other=>!used.has(other.id)&&other.kind===event.kind&&
      source(other.row,other.kind)===source(r,event.kind)&&periodForDate(other.date,settings).key===keyPeriod&&
      !other.row.oneOff&&!other.row.exceptional&&other.value>=0);
    const previous=Math.round(groups.reduce((n,g)=>n+sum(g),0)/3),known=peers.reduce((n,p)=>n+p.value,0),
      change=sign*(known-previous);
    for(const peer of peers)used.add(peer.id);
    consumed.set(key,(consumed.get(key)||0)+Math.max(0,previous));
    if(change)adjustments.push({id:event.id,date:peers.at(-1).date,title:String(r.desc||r.name||''),kind:event.kind,
      reason:'KNOWN_AMOUNT_CHANGE',amount:change/100,knownAmount:known/100,historicalAmount:previous/100,
      entries:peers.map(p=>({date:p.date,title:String(p.row.desc||p.row.name||''),amount:p.value/100}))});
   } else if(hist.length===0&&validCalendarDate(r.effectiveFrom)&&r.effectiveFrom.slice(0,10)>periods[2].end) {
    // A genuinely new dated recurrence is not part of the baseline.
    used.add(event.id);
    if(event.value)adjustments.push({id:event.id,date:event.date,title:String(r.desc||r.name||''),kind:event.kind,
      reason:'NEW_RECURRENCE',amount:sign*event.value/100,knownAmount:event.value/100,historicalAmount:0});
   }
  }
  // Other future records may be ordinary purchases with new descriptions.
  // Compare their category/type total with the baseline left after matched payments.
  // Missing future records never imply a lost salary or a saving.
  const groups=new Map();
  for(const e of selected.filter(e=>!used.has(e.id))){
   const key=bucket(e.row,e.kind),g=groups.get(key)||[];
   g.push(e);groups.set(key,g);
  }
  for(const [key,group] of groups){
   const kind=group[0].kind,historicalTotal=sum(historyRows[kind].filter(r=>bucket(r,kind)===key));
   const covered=Math.max(0,Math.round(historicalTotal/3*months)-(consumed.get(key)||0));
   const known=group.reduce((n,e)=>n+e.value,0),excess=Math.max(0,known-covered);
   if(excess)adjustments.push({id:'bucket:'+key,date:group.at(-1).date,title:group.map(e=>String(e.row.desc||e.row.name||'')).filter(Boolean).join(' · '),
    kind,reason:'KNOWN_TOTAL_ABOVE_BASELINE',amount:(kind==='income'?excess:-excess)/100,
    knownAmount:known/100,historicalAmount:covered/100,entries:group.map(e=>({date:e.date,title:String(e.row.desc||e.row.name||''),amount:e.value/100}))});
  }
  const base=averageCents*months,change=adjustments.reduce((n,a)=>n+Math.round(a.amount*100),0);
  return {days,date:dateEnd,status:'PARTIAL',baseSavings:base/100,adjustment:change/100,estimatedSavings:(base+change)/100,adjustments,
   knownCommitments:selected.length,unchangedOrCoveredCommitments:selected.filter(e=>!adjustments.some(a=>a.id===e.id||a.entries?.some(x=>x.date===e.date&&x.title===String(e.row.desc||e.row.name||'')))).length,ledgerBalance:null};
 });
 return {schema:1,status:enough?'PARTIAL':'N_D',basis:'actual_net_savings_completed_periods',today,currency:options.currency||'EUR',
  calculation:'actual_transaction_date_and_full_amount',periodSettings:settings,monthlyHistory,current,
  averageMonthlySavings:averageCents===null?null:averageCents/100,horizons,
  coverage:{completeness:'NOT_VERIFIED',requiredCompletedPeriods:3,observedPeriods:monthlyHistory.filter(p=>p.observedRows>0).length,
   invalidRows:[...rawExp,...rawInc].filter(r=>active(r)&&!valid(r)).length},
  assumptions:['Arithmetic mean of actual net savings in the last three completed financial periods. Current partial period is shown separately.',
   '30, 60 and 90 civil days use one, two and three monthly averages; this is an approximate savings projection, not a bank balance or a dated liquidity schedule.',
   'The actual transaction amount is counted on its recorded date; accounting installment allocations and budgets are not new cash flows.',
   'Only explicit exceptional items, genuinely new dated recurrences, known amount changes and known commitments exceeding their historical allowance adjust the baseline.',
   'Missing future records never mean missing income. Historical months and current exclusions may be incomplete. No probability or guaranteed saving is claimed.']};
}
