// Read-only calculations for the existing assistant and financial calendar.
// Money is accumulated in cents. Forecasts describe the loaded ledger, not a bank account.
import { buildFinancialCalendar, validCalendarDate } from './financialCalendar.js';
import { periodForDate, periodForKey, shiftPeriodKey } from './periodEngine.js';
import { budgetForPeriod } from './budgetEngine.js';
import { parseMoneyValue } from '../financeCalculations.js';

const DAY = 86400000;
const list = value => Array.isArray(value) ? value : [];
const active = row => row && !row.deleted && !row.archived &&
  !['deleted', 'archived', 'cancelled'].includes(String(row.status || '').toLowerCase());
const dateOf = row => String(row?.date || '').slice(0, 10);
const money = value => Math.round(parseMoneyValue(value) * 100);
const catOf = row => String(row?.catId ?? '');
const valid = row => active(row) && validCalendarDate(row.date) &&
  row.amount !== null && row.amount !== undefined && String(row.amount).trim() !== '' &&
  /\d/.test(String(row.amount)) && Number.isFinite(Number(String(row.amount).replace(/\s/g, '').replace(',', '.'))) ||
  active(row) && validCalendarDate(row.date) && typeof row.amount === 'string' &&
  /^-?\d{1,3}(?:[.,]\d{3})+[.,]\d{1,2}$/.test(row.amount.trim());
export function shiftCivilDate(value, offset) {
  if (!validCalendarDate(value) || !Number.isInteger(offset)) throw new Error('INVALID_INSIGHT_DATE');
  const [y,m,d] = value.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,d+offset)).toISOString().slice(0,10);
}
const daysBetween = (a,b) => Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/DAY);
const inRange = (row,start,end) => dateOf(row) >= start && dateOf(row) <= end;
const sum = rows => rows.reduce((n,row)=>n+money(row.amount),0);
const centsToMoney = n => n / 100;
const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const MONTHS = [
 ['gennaio','january','enero','janvier','januar','janeiro','styczen','januari','ianuarie','ιανουαριος'],
 ['febbraio','february','febrero','fevrier','februar','fevereiro','luty','februari','februarie','φεβρουαριος'],
 ['marzo','march','mars','marz','marco','marzec','maart','martie','μαρτιος'],
 ['aprile','april','abril','avril','kwiecien','aprilie','απριλιος'],
 ['maggio','may','mayo','mai','maio','maj','mei','μαϊος'],
 ['giugno','june','junio','juin','juni','junho','czerwiec','iunie','ιουνιος'],
 ['luglio','july','julio','juillet','juli','julho','lipiec','iulie','ιουλιος'],
 ['agosto','august','aout','sierpien','augustus','αυγουστος'],
 ['settembre','september','septiembre','septembre','setembro','wrzesien','septembrie','σεπτεμβριος'],
 ['ottobre','october','octubre','octobre','oktober','outubro','pazdziernik','octombrie','οκτωβριος'],
 ['novembre','november','noviembre','novembro','listopad','noiembrie','νοεμβριος'],
 ['dicembre','december','diciembre','decembre','dezember','dezembro','grudzien','decembrie','δεκεμβριος'],
];
// Explicit ranges are inclusive civil dates; named months use the user's fiscal period.
// Never silently replace an invalid requested range with the currently selected month.
export function resolveInsightRange(question, today, selectedKey, settings) {
  const text = normalize(question);
  const selected = periodForKey(selectedKey || periodForDate(today,settings).key, settings);
  const isoDates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [];
  const localDates = [...text.matchAll(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/g)]
    .map(m=>m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0'));
  const dates = isoDates.length ? isoDates : localDates;
  if (dates.length) {
    if (dates.length > 2 || dates.some(d=>!validCalendarDate(d)) || dates[0] > (dates[1]||dates[0]))
      return {status:'N_D',reason:'INVALID_OR_AMBIGUOUS_RANGE'};
    return {status:'VALID',basis:'explicit_dates',start:dates[0],end:dates[1]||dates[0]};
  }
  const trailing = /(?:ultimi|last|ultimos|derniers|letzten|ostatnich|laatstele|laatste|ultimele)\s+(\d+)\s+(?:giorni|days|dias|jours|tage|dni|dagen|zile)/.exec(text);
  if(trailing) {
    const count = Number(trailing[1]);
    return count >= 1 && count <= 3660
      ? {status:'VALID',basis:'trailing_days',start:shiftCivilDate(today,1-count),end:today}
      : {status:'N_D',reason:'INVALID_RANGE_LENGTH'};
  }
  const keys = [...text.matchAll(/\b(\d{4})-(0[1-9]|1[0-2])\b/g)].map(m=>m[0]);
  const named = [];
  let ambiguousDay=false;
  const tokens = text.split(/[^a-zα-ω0-9]+/).filter(Boolean);
  for (let i=0;i<tokens.length;i++) {
    const month = MONTHS.findIndex(names=>names.includes(tokens[i]));
    if(month<0)continue;
    if(/^\d{1,2}$/.test(tokens[i-1]||'')&&Number(tokens[i-1])<=31&&Number(tokens[i-1])>=1&&!/^(categoria|category|categorie|area)$/.test(tokens[i-2]||''))ambiguousDay=true;
    const years=text.match(/\b\d{4}\b/g)||[];
    const year = /^\d{4}$/.test(tokens[i+1]||'') ? tokens[i+1] : years.length===1?years[0]:today.slice(0,4);
    named.push(year+'-'+String(month+1).padStart(2,'0'));
  }
  const requested = keys.length ? keys : named;
  if(!keys.length&&/\b\d{4}-\d{2}\b/.test(text))return {status:'N_D',reason:'INVALID_RANGE'};
  if(ambiguousDay)return {status:'N_D',reason:'EXPLICIT_DAY_RANGE_REQUIRES_FULL_DATES'};
  if (requested.length) {
    if(requested.length===2&&/(confront|compar|vs\b|rispetto|versus|gegenuber|tegenover)/.test(text)) {
      const a=periodForKey(requested[0],settings),b=periodForKey(requested[1],settings);
      return {status:'VALID',basis:'period_comparison',start:a.start,end:a.end,comparisonStart:b.start,comparisonEnd:b.end};
    }
    if(requested.length>2 || requested[0] > (requested[1]||requested[0]))
      return {status:'N_D',reason:'INVALID_OR_AMBIGUOUS_RANGE'};
    try {
      return {status:'VALID',basis:'requested_period',start:periodForKey(requested[0],settings).start,
        end:periodForKey(requested[1]||requested[0],settings).end};
    } catch { return {status:'N_D',reason:'INVALID_RANGE'}; }
  }
  if (/(mese scorso|mese precedente|last month|previous month|mes pasado|mois dernier|letzten monat|mes passado)/.test(text)) {
    const previous = periodForKey(shiftPeriodKey(periodForDate(today,settings).key,-1),settings);
    return {status:'VALID',basis:'previous_period',start:previous.start,end:previous.end};
  }
  if (/(questo mese|mese corrente|this month|current month)/.test(text)) {const p=periodForDate(today,settings);return {status:'VALID',basis:'current_budget_period',start:p.start,end:p.end};}
  const months=/(?:ultimi|last)\s+(tre|three|[1-9]\d?)\s+(?:mesi|months)/.exec(text);
  if(months){const n=months[1]==='tre'||months[1]==='three'?3:Number(months[1]);return {status:'VALID',basis:'trailing_budget_periods_including_current',start:periodForKey(shiftPeriodKey(periodForDate(today,settings).key,1-n),settings).start,end:today};}
  return {status:'VALID',basis:'selected_period',start:selected.start,end:selected.end};
}

function categoryLabel(id,categories,rows=[]) {
  const usable=value=>typeof value==='string'&&value.trim()&&!/^\d+$/.test(value.trim())&&!/^(categoria recuperata|recovered category)\b/i.test(value);
  const cat=list(categories).find(c=>String(c.id)===String(id));
  if(cat&&!cat.recovered&&usable(cat.name))return cat.name.trim();
  const names=[...new Set(rows.filter(r=>catOf(r)===String(id)).map(r=>r.categoryNameSnapshot||r.categoryName||r.catName).filter(usable).map(x=>x.trim()))];
  return names.length===1?names[0]:'[CATEGORY_NAME_UNAVAILABLE]';
}
const privateOrdinary=row=>!row._share&&!row.shareProjectId&&!row._shareProjectId&&!row.shareActivityId&&!row.rateizzato&&
  !row.recurringOccurrenceId&&!row.recurringId&&!row.recurringRuleId&&!row.generatedFromRecurringId&&
  !row.transferId&&!row.isTransfer&&!['transfer','trasferimento','giroconto'].includes(normalize(row.kind||row.type||''))&&!row.oneOff&&!row.exceptional;
const fingerprint=row=>catOf(row)+'|'+normalize(row.desc||row.description||row.name||row.type||row.itype||'').trim();
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
// Read-only hypothesis: one stable payment in each of three completed civil months.
function stablePatterns(rows,today,rules,kind) {
  const keys=[-3,-2,-1].map(n=>shiftPeriodKey(today.slice(0,7),n)),groups=new Map();
  for(const row of rows.filter(r=>privateOrdinary(r)&&money(r.amount)>0&&keys.includes(dateOf(r).slice(0,7)))) {
    const key=fingerprint(row);if(!key.split('|')[1])continue;
    const group=groups.get(key)||[];group.push(row);groups.set(key,group);
  }
  const out=[];
  for(const [key,group] of groups) {
    const buckets=keys.map(k=>group.filter(r=>dateOf(r).startsWith(k)));
    if(buckets.some(b=>b.length!==1))continue;
    const sample=buckets.map(b=>b[0]),values=sample.map(r=>money(r.amount)),amount=median(values),dates=sample.map(r=>Number(dateOf(r).slice(-2)));
    if(Math.max(...values)-Math.min(...values)>Math.max(100,amount*.05)||Math.max(...dates)-Math.min(...dates)>3)continue;
    const catId=catOf(sample[0]),description=String(sample[0].desc||sample[0].description||sample[0].name||sample[0].type||'');
    if(rules.some(r=>(r.rtype==='income'?'income':'expense')===kind&&(kind==='expense'?catOf(r)===catId:normalize(r.name||'')===normalize(description))))continue;
    out.push({key,kind,categoryId:catId,description,amount,day:median(dates),evidenceMonths:keys});
  }
  return out;
}
function stableCategoryTotal(rows,id,today,settings) {
  const current=periodForDate(today,settings).key,periods=[-3,-2,-1].map(n=>periodForKey(shiftPeriodKey(current,n),settings));
  const observed=periods.map(p=>rows.filter(r=>catOf(r)===id&&inRange(r,p.start,p.end)&&privateOrdinary(r)&&money(r.amount)>0));
  if(observed.some(x=>!x.length)||new Set(observed.map(x=>x.length)).size!==1)return null;
  const totals=observed.map(sum),typical=median(totals);
  return Math.max(...totals)-Math.min(...totals)<=Math.max(100,typical*.05)?{typical,periods:periods.map(x=>x.key)}:null;
}

function categoriesFor(rows,categories) {
  const grouped = new Map();
  for(const row of rows) {
    const id=catOf(row);
    const previous=grouped.get(id)||{categoryId:id,category:categoryLabel(id,categories,rows),cents:0,count:0};
    previous.cents+=money(row.amount);previous.count++;grouped.set(id,previous);
  }
  return [...grouped.values()].sort((a,b)=>b.cents-a.cents);
}
function summarizeRange(rows,incomes,range,categories,full,today) {
  if(range.status!=='VALID')return range;
  const exp=rows.filter(row=>inRange(row,range.start,range.end)&&dateOf(row)<=today);
  const inc=incomes.filter(row=>inRange(row,range.start,range.end)&&dateOf(row)<=today);
  const result={...range,status:exp.length||full&&inc.length?'PARTIAL':'N_D',
    expense:centsToMoney(sum(exp)),expenseCount:exp.length,
    futureRowsIncluded:false,
    futureRecordedExpense:centsToMoney(sum(rows.filter(row=>inRange(row,range.start,range.end)&&dateOf(row)>today))),
    categories:categoriesFor(exp,categories).map(({cents,...x})=>({...x,amount:centsToMoney(cents)}))};
  if(full)Object.assign(result,{income:centsToMoney(sum(inc)),incomeCount:inc.length,net:centsToMoney(sum(inc)-sum(exp))});
  return result;
}

export function buildFinancialForecast(options={}) {
  const {today,expenses=[],incomes=[],recurring=[],excludeExpense=()=>false,excludeIncome=()=>false}=options;
  if(!validCalendarDate(today))throw new Error('INVALID_FORECAST_DATE');
  const exp=list(expenses).filter(row=>valid(row)&&!excludeExpense(row));
  const inc=list(incomes).filter(row=>valid(row)&&!excludeIncome(row));
  const rules=list(recurring).filter(row=>active(row)&&/\d/.test(String(row.amount??'')));
  const sourceRows=[...exp,...inc].filter(row=>dateOf(row)<=today);
  const historyStart=shiftCivilDate(today,-90);
  const expenseHistory=list(options.analysisExpenses??exp).filter(row=>valid(row)&&!excludeExpense(row)&&dateOf(row)<today);
  const earliest=expenseHistory.map(dateOf).sort()[0];
  const baselineStart=earliest && earliest>historyStart ? earliest : historyStart;
  const observationDays=earliest ? Math.min(90,daysBetween(baselineStart,today)) : 0;
  // Any recurring category is excluded conservatively, including legacy occurrences
  // without identity metadata. Missing variable spend in those categories is disclosed.
  const recurringCategories=new Set(rules.filter(r=>r.rtype!=='income').map(catOf));
  const patterns=[...stablePatterns(exp,today,rules,'expense'),...stablePatterns(inc,today,rules,'income')];
  const patternKeys=new Set(patterns.filter(p=>p.kind==='expense').map(p=>p.key));
  const variableHistory=expenseHistory.filter(row=>privateOrdinary(row)&&!patternKeys.has(fingerprint(row))&&dateOf(row)>=baselineStart &&
    !row._share&&!row.shareProjectId&&!row._shareProjectId&&!row.shareActivityId&&!row.rateizzato&&!row.recurringOccurrenceId&&!row.recurringId&&!row.recurringRuleId&&!row.generatedFromRecurringId &&
    !recurringCategories.has(catOf(row)));
  const variableByCategory=new Map(categoriesFor(variableHistory,options.categories).map(x=>[x.categoryId,x.cents]));
  const baselineAvailable=observationDays>=28;
  const end=shiftCivilDate(today,90);
  const daily=[];
  let month=today.slice(0,7);
  let opening=null;
  while(month<=end.slice(0,7)) {
    const calendar=buildFinancialCalendar({...options,expenses:exp,incomes:inc,recurring:rules,month,today});
    if(opening===null) {
      opening=Math.round(calendar.openingBalance*100);
      for(const day of calendar.days)if(day.date<=today)for(const e of day.entries)
        if(!e.source.startsWith('planned'))opening+=e.cents;
    }
    for(const day of calendar.days) {
      if(day.date<today||day.date>end)continue;
      // Recorded today belongs to the opening ledger; today's pending recurrence does not.
      const entries=day.entries.filter(e=>day.date>today||e.source.startsWith('planned'));
      const knownIncome=entries.reduce((n,e)=>n+Math.max(0,e.cents),0);
      const knownExpense=entries.reduce((n,e)=>n+Math.max(0,-e.cents),0);
      const variableKnown=new Map();
      for(const e of entries)if(e.cents<0&&!e.installment&&e.provenance!=='recurring'&&e.provenance!=='share'&&
        !recurringCategories.has(String(e.metadata?.categoryId??''))) {
        const id=String(e.metadata?.categoryId??'');variableKnown.set(id,(variableKnown.get(id)||0)-e.cents);
      }
      let additional=0;
      // 30/60/90 means exactly that many future days; no extra average for today.
      if(baselineAvailable&&day.date>today)for(const [id,total] of variableByCategory)
        additional+=Math.max(0,Math.round(total/observationDays)-(variableKnown.get(id)||0));
      daily.push({date:day.date,entries,knownIncome,knownExpense,additional,inferredIncome:0,inferredExpense:0});
    }
    month=shiftPeriodKey(month,1);
  }

  const allEntries=daily.flatMap(d=>d.entries);
  for(const pattern of patterns) {
    for(let m=today.slice(0,7);m<=end.slice(0,7);m=shiftPeriodKey(m,1)) {
      const y=Number(m.slice(0,4)),mo=Number(m.slice(5));
      const date=m+'-'+String(Math.min(pattern.day,new Date(Date.UTC(y,mo,0)).getUTCDate())).padStart(2,'0');
      if(date<=today||date>end)continue;
      const source=pattern.kind==='income'?inc:exp;
      if(source.some(r=>dateOf(r).startsWith(m)&&fingerprint(r)===pattern.key))continue;
      if(allEntries.some(e=>e.date.startsWith(m)&&e.kind===pattern.kind&&(pattern.kind==='expense'?String(e.metadata?.categoryId??'')===pattern.categoryId:normalize(e.title)===normalize(pattern.description))))continue;
      const day=daily.find(d=>d.date===date);
      if(day)day[pattern.kind==='income'?'inferredIncome':'inferredExpense']+=pattern.amount;
    }
  }
  const completeKeys=[-3,-2,-1].map(n=>shiftPeriodKey(today.slice(0,7),n));
  const completeVariable=completeKeys.map(k=>sum(expenseHistory.filter(r=>privateOrdinary(r)&&!patternKeys.has(fingerprint(r))&&!recurringCategories.has(catOf(r))&&dateOf(r).startsWith(k))));
  const fullHistory=earliest&&earliest<=completeKeys[0]+'-01';
  const variableMean=completeVariable.reduce((a,b)=>a+b,0)/3;
  const prudentFactor=fullHistory&&variableMean>0?Math.max(1,Math.max(...completeVariable)/variableMean):null;

  const invalidRows=[...list(expenses),...list(incomes)].filter(row=>active(row)&&!valid(row)).length;
  const hasData=sourceRows.length>0||daily.some(d=>d.entries.length)||opening!==0;
  const openingAvailable=sourceRows.length>0||opening!==0;
  const horizons=[30,60,90].map(days=>{
    const date=shiftCivilDate(today,days),rows=daily.filter(d=>d.date<=date);
    const income=rows.reduce((n,d)=>n+d.knownIncome,0),expense=rows.reduce((n,d)=>n+d.knownExpense,0);
    const additional=rows.reduce((n,d)=>n+d.additional,0),knownChange=income-expense;
    const inferredIncome=rows.reduce((n,d)=>n+d.inferredIncome,0),inferredExpense=rows.reduce((n,d)=>n+d.inferredExpense,0);
    const estimatedChange=baselineAvailable?knownChange+inferredIncome-inferredExpense-additional:null;
    const prudentChange=baselineAvailable&&prudentFactor!==null?knownChange-inferredExpense-Math.round(additional*prudentFactor):null;
    return {days,date,status:hasData?'PARTIAL':'N_D',
      knownIncome:income/100,knownExpense:expense/100,knownChange:knownChange/100,
      inferredIncome:inferredIncome/100,inferredExpense:inferredExpense/100,
      estimatedChange:estimatedChange===null?null:estimatedChange/100,
      prudentChange:prudentChange===null?null:prudentChange/100,
      confidence:days===30&&patterns.length&&prudentFactor!==null?'OBSERVED_PATTERNS':'LIMITED',
      estimatedAdditionalExpense:baselineAvailable?additional/100:null,
      ledgerBalance:null,
      estimatedLedgerBalance:null};
  });
  return {status:hasData?'PARTIAL':'N_D',today,currency:options.currency||'',
    basis:'future_flow_change_no_verified_opening_balance',openingLedgerBalance:null,
    historicalLedgerNet:openingAvailable?opening/100:null,
    openingBalanceStatus:'N_D_NO_VERIFIED_CASH_BALANCE',
    historicalPatterns:patterns.map(({key,amount,...p})=>({...p,amount:amount/100})),
    baseline:{start:baselineStart,end:shiftCivilDate(today,-1),observationDays,
      status:baselineAvailable?'PARTIAL':'N_D',dailyVariableExpense:baselineAvailable?Math.round(sum(variableHistory)/observationDays)/100:null,
      categories:baselineAvailable?[...variableByCategory].map(([categoryId,total])=>({categoryId,dailyCents:Math.round(total/observationDays)})):[]},
    invalidRows,horizons,
    assumptions:['Loaded data may be incomplete; no bank opening balance is known.',
      'Known transactions, forward calendar installments and open future recurrences reuse the financial calendar.',
      'Variable expense estimate uses up to 90 observed days, needs at least 28 days and excludes Share, installments and recurring categories.',
      'For each future day and category, known variable expense replaces the overlapping average; budgets are limits, not extra expenses.',
      'History-based income and fixed costs are separate hypotheses from three complete months, never guaranteed or saved; no overdue hypothetical income.',
      'Prudent change excludes history-inferred income and uses the highest observed complete-month variable spending ratio; no statistical probability is claimed.'],
    daily};
}
export function buildFinancialInsights(options={}) {
  const {today,categories=[],accessLevel='summary',periodSettings={mode:'calendar',startDay:1}}=options;
  const full=accessLevel==='full';
  const allExp=list(options.analysisExpenses??options.expenses).filter(active);
  const allInc=list(options.incomes).filter(active);
  const exp=allExp.filter(valid),inc=full?allInc.filter(valid):[];
  const key=options.periodKey||periodForDate(today,periodSettings).key;
  const range=resolveInsightRange(options.question,today,key,periodSettings);
  const current=periodForKey(key,periodSettings),previous=periodForKey(shiftPeriodKey(key,-1),periodSettings);
  const selected=summarizeRange(exp,inc,{status:'VALID',start:current.start,end:current.end},categories,full,today);
  const prior=summarizeRange(exp,inc,{status:'VALID',start:previous.start,end:previous.end},categories,full,today);
  const comparableEnd=current.start<=today&&today<current.end?shiftCivilDate(previous.start,Math.min(daysBetween(current.start,today),daysBetween(previous.start,previous.end))):previous.end;
  const comparablePrior=summarizeRange(exp,inc,{status:'VALID',start:previous.start,end:comparableEnd},categories,full,today);
  const result={schema:2,source:'all_loaded_rows_before_display_limits',accessLevel,today,currency:options.currency||'',
    accountingPeriod:{...periodSettings,key},calculation:'actual_transaction_date_and_amount',
    coverage:{expenseRows:exp.length,invalidExpenseRows:allExp.length-exp.length,completeness:'NOT_VERIFIED',
      earliestExpense:exp.map(dateOf).sort()[0]||null,latestExpense:exp.map(dateOf).sort().at(-1)||null},
    selectedPeriod:selected,previousPeriod:prior,comparisonPeriod:comparablePrior,
    comparisonBasis:comparableEnd!==previous.end?'MATCHED_ELAPSED_DAYS':'COMPLETE_PERIODS',
    requestedPeriod:summarizeRange(exp,inc,range,categories,full,today),
    categoryChanges:[...new Set([...selected.categories,...comparablePrior.categories].map(x=>x.categoryId))].map(id=>{
      const row=selected.categories.find(x=>x.categoryId===id)||{categoryId:id,category:comparablePrior.categories.find(x=>x.categoryId===id)?.category,amount:0,count:0};
      const before=comparablePrior.categories.find(x=>x.categoryId===row.categoryId)?.amount??0;
      return {...row,previousAmount:before,delta:Math.round((row.amount-before)*100)/100,
        percentage:before!==0?Math.round((row.amount-before)/Math.abs(before)*10000)/100:null};
    }).sort((a,b)=>b.delta-a.delta),
    monthlyHistory:Array.from({length:13},(_,i)=>{
      const p=periodForKey(shiftPeriodKey(key,i-12),periodSettings);
      return {key:p.key,...summarizeRange(exp,inc,{status:'VALID',start:p.start,end:p.end},categories,full,today)};
    }),
    limitations:['PARTIAL means calculations over loaded data, not verified account completeness.',
      'N_D means no observations or invalid scope; do not present it as a confirmed zero.',
      'Future-dated recorded expenses are reported separately as futureRecordedExpense; historical totals stop at today.',
      'Category changes explain arithmetic contributors, not motives or external causes.']};
  if(range.status==='VALID'&&range.comparisonStart) {
    result.requestedComparison=summarizeRange(exp,inc,{status:'VALID',start:range.comparisonStart,end:range.comparisonEnd},categories,full,today);
    result.requestedExpenseDelta=Math.round((result.requestedPeriod.expense-result.requestedComparison.expense)*100)/100;
  }
  if(!full)return result;
  const forecast=buildFinancialForecast(options);
  const futureEntries=forecast.daily.flatMap(d=>d.entries);
  const requestedKey=range.status==='VALID'?periodForDate(range.start,periodSettings).key:key;
  const budgetKey=range.status==='VALID'&&periodForDate(range.end,periodSettings).key===requestedKey?requestedKey:key;
  const budgetPeriod=periodForKey(budgetKey,periodSettings);
  result.budgetPeriod=budgetPeriod;
  const plan=budgetForPeriod(options.financeEvolution,options.legacyBudgetPlan??options.budgetPlan,budgetKey);
  result.budgets=list(plan?.items).filter(item=>item&&item.amount!==null&&item.amount!==undefined&&Number.isFinite(Number(item.amount))).map(item=>{
    const id=String(item.catId),limit=money(item.amount);
    const actual=exp.filter(row=>catOf(row)===id&&inRange(row,budgetPeriod.start,budgetPeriod.end)&&dateOf(row)<=today);
    // Budget actuals use transaction dates, exactly like the existing Budget view.
    // A past installment purchase is already counted in actuals: do not charge its quotas twice.
    const recordedFuture=exp.filter(row=>catOf(row)===id&&inRange(row,budgetPeriod.start,budgetPeriod.end)&&dateOf(row)>today);
    const known=futureEntries.filter(e=>e.cents<0&&e.source.startsWith('planned')&&String(e.metadata?.categoryId??'')===id&&e.date>=budgetPeriod.start&&e.date<=budgetPeriod.end);
    const spent=sum(actual),committed=sum(recordedFuture)+known.reduce((n,e)=>n-e.cents,0);
    const dailyAverage=forecast.baseline.categories.find(x=>x.categoryId===id)?.dailyCents||0;
    const remainingDays=Math.max(0,daysBetween(today>budgetPeriod.start?today:shiftCivilDate(budgetPeriod.start,-1),budgetPeriod.end));
    const estimated=budgetPeriod.end<=today?0:budgetPeriod.end>shiftCivilDate(today,90)?null:forecast.baseline.status!=='N_D'?Math.max(0,dailyAverage*remainingDays-sum(recordedFuture)):null;
    const stable=budgetKey===periodForDate(today,periodSettings).key?stableCategoryTotal(exp,id,today,periodSettings):null;
    const expectedAdditional=budgetPeriod.end<=today?0:stable?Math.max(0,stable.typical-spent-committed):estimated;
    const projected=expectedAdditional===null?null:spent+committed+expectedAdditional;
    const riskStatus=spent>limit?'EXCEEDED':spent+committed>limit?'COMMITTED_OVER_LIMIT':projected!==null&&projected>limit?'PROJECTED_OVER_LIMIT':projected===null?'INSUFFICIENT_DATA':'WITHIN_LIMIT';
    return {categoryId:id,category:categoryLabel(id,categories,exp),
      commitmentCoverage:budgetPeriod.end>shiftCivilDate(today,90)?'PARTIAL_OUTSIDE_FORECAST':'LOADED_DATA_ONLY',budget:limit/100,spent:spent/100,remaining:(limit-spent)/100,committedExpense:committed/100,
      remainingAfterCommitments:(limit-spent-committed)/100,
      estimatedAdditionalExpense:expectedAdditional===null?null:expectedAdditional/100,projectedExpense:projected===null?null:projected/100,
      risk:['EXCEEDED','COMMITTED_OVER_LIMIT','PROJECTED_OVER_LIMIT'].includes(riskStatus),
      riskBasis:spent>limit?'ACTUAL_OVER_LIMIT':spent+committed>limit?'KNOWN_COMMITMENTS_OVER_LIMIT':stable?'STABLE_THREE_COMPLETE_PERIODS':estimated===null?'INSUFFICIENT_HISTORY':'VARIABLE_SPENDING_HISTORY',
      stableHistory:stable?{typicalExpense:stable.typical/100,periods:stable.periods}:null,
      projectedOverrun:projected===null?null:Math.max(0,projected-limit)/100,
      usedPercentage:limit>0?Math.round(spent/limit*10000)/100:null,
      status:riskStatus};
  });
  result.forecast={...forecast,daily:undefined};
  result.largestExpenses=range.status==='VALID'?exp.filter(row=>inRange(row,range.start,range.end)&&dateOf(row)<=today)
    .sort((a,b)=>money(b.amount)-money(a.amount)).slice(0,10).map(row=>({
      date:dateOf(row),amount:money(row.amount)/100,category:categoryLabel(catOf(row),categories,exp),
      description:String(row.desc||row.description||'')})):[];
  result.coverage.incomeRows=inc.length;
  return result;
}
// The read scope is enforced before calculation, so hidden inputs are never emitted.
export function financialInsightsForApp(c,question='') {
  const full=c.aiDataAccess==='full';
  const result = buildFinancialInsights({
    question,today:c.today||[new Date().getFullYear(),String(new Date().getMonth()+1).padStart(2,'0'),String(new Date().getDate()).padStart(2,'0')].join('-'),currency:c.currency,
    periodKey:c.curMonthKey,periodSettings:c.accountingPeriod?.settings,
    accessLevel:full?'full':c.aiDataAccess==='areas'?'areas':'summary',
    analysisExpenses:c.countedExpensesForAnalysis||c.expensesForAnalysis||c.expenses||[],
    expenses:full?(c.expenses||[]):[],incomes:full?(c.countedIncomes||c.incomes||[]):[],
    recurring:full?(c.recurring||[]):[],shareProjects:full?(c.shareProjects||[]):[],userId:full?c.userId:'',
    categories:c.cats||[],financeEvolution:full?c.financeEvolution:undefined,
    legacyBudgetPlan:full?(c.legacyBudgetPlan??c.budgetPlan):undefined,
    excludeExpense:c.isExpenseExcludedFromTotals,excludeIncome:c.isIncomeExcludedFromTotals,
  });
  const requested=normalize(question);
  function cap(rows,limit){if(!Array.isArray(rows)||rows.length<=limit)return rows;const matched=rows.filter(x=>requested.includes(normalize(x.category))&&String(x.category||"").length>2);return [...new Set([...matched,...rows.slice(0,limit)])];}
  for(const row of result.monthlyHistory){const all=row.categories;row.categories=cap(all,12);row.categoriesOmitted=all.length-row.categories.length;}
  for(const key of ["selectedPeriod","previousPeriod","requestedPeriod","requestedComparison"]){const row=result[key];if(!row?.categories)continue;const all=row.categories;row.categories=cap(all,40);row.categoriesOmitted=all.length-row.categories.length;}
  const changes=result.categoryChanges;result.categoryChanges=cap(changes,40);result.categoryChangesOmitted=changes.length-result.categoryChanges.length;
  if(JSON.stringify(result).length>60000)return {schema:1,status:"N_D",reason:"ANALYSIS_CONTEXT_TOO_LARGE",accessLevel:result.accessLevel,coverage:result.coverage,limitations:["Ask for a narrower date range and category; omitted details cannot be inferred."]};
  result.limitations.push("Category lists may be bounded; categoriesOmitted marks omissions. Missing categories must never be assumed to be zero.");
  return result;
}
