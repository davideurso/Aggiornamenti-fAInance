/**
 * Local financial anomaly detector. No network access or mutations.
 * Signals are comparisons worth checking, not proof of an accounting error.
 */
const DAY = 86400000;
const numeric = (v) => { const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const money = (v) => Math.round(v * 100) / 100;
const norm = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
function civilDate(value) {
  const s = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : '';
}
const dayIndex = (s) => Date.parse(s + 'T12:00:00Z') / DAY;
const dayAt = (n) => new Date(n * DAY).toISOString().slice(0, 10);
const monthKey = (d) => d.slice(0, 7);
function shiftMonth(key, delta) { const [y,m] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7); }
function median(values) { if (!values.length) return 0; const s = values.slice().sort((a,b)=>a-b); const mid=Math.floor(s.length/2); return s.length%2 ? s[mid] : (s[mid-1]+s[mid])/2; }
function stableId(x) { return String(x.id ?? x._id ?? x.recurringOccurrenceId ?? `${x.date}:${x.catId}:${x.amount}:${norm(x.desc || x.description)}`); }
const recent = (date, now, days) => dayIndex(now) - dayIndex(date) >= 0 && dayIndex(now) - dayIndex(date) <= days;
const abs = Math.abs;
function atMonthDay(key, targetDay) {
  const [y, m] = key.split('-').map(Number);
  const maxDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2,'0')}-${String(Math.min(maxDay, targetDay)).padStart(2,'0')}`;
}
function normalizeRows(rows, now, catMap, ruleMap, kind, period, incomeTypeMap) {
  return (Array.isArray(rows) ? rows : []).map((x) => {
    const date = civilDate(x?.date), amount = money(numeric(x?.amount));
    if (!date || amount <= 0 || dayIndex(date) > dayIndex(now) || dayIndex(date) < dayIndex(now) - 370) return null;
    const category = kind === 'income'
      ? String(x.typeName || x.incomeTypeName || x.type || x.categoryName || 'Entrata')
      : catMap.get(String(x.catId ?? '')) || String(x.categoryName || x.catName || x.category || 'Altre spese');
    const incomeType = kind === 'income' ? String(
      x.typeName || x.incomeTypeName || incomeTypeMap.get(String(x.typeId ?? x.incomeTypeId ?? x.type ?? '')) ||
      (x.typeId === 'salario' ? 'Stipendio' : '')
    ).trim() : '';
    const rawName = String(x.desc || x.description || '').trim();
    const generic = ['entrata','income','uscita','spesa','altro'].includes(norm(rawName));
    const name = String((rawName && !generic ? rawName : incomeType) ||
      ruleMap.get(String(x.recurringRuleId ?? '')) || rawName || '').trim();
    return {id:stableId(x),date,amount,category,catId:String(x.catId ?? category),
      merchant:name,merchantKey:norm(name),method:String(x.methodId ?? ''),
      recurringId:String(x.recurringRuleId ?? ''),period:String(period(date)),kind};
  }).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function regularMissing(rows, now, make) {
  const byKey = new Map();
  const readyForMissing = (last, expected, overdue, maxDays) => {
    if (overdue < 0 || overdue > maxDays) return false;
    // Income stays prompt (3 days), expense alerts require a full calendar
    // month after the expected day. For 31st, clamp to month end.
    if (last.kind === 'income') return overdue >= 3;
    const graceEnds = atMonthDay(shiftMonth(monthKey(expected), 1), Number(expected.slice(8)));
    return dayIndex(now) >= dayIndex(graceEnds);
  };
  for (const row of rows) {
    const key = row.recurringId ? `rule:${row.recurringId}` : row.merchantKey.length >= 4 ? `name:${row.merchantKey}` : '';
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }
  for (const [key, grouped] of byKey) {
    const chronological = [...grouped].sort((a,b)=>a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const days = [...new Set(chronological.map((r)=>r.date))].map(dayIndex);
    if (days.length < 3) continue;
    const last = chronological[chronological.length-1];
    if (!recent(last.date, now, 75)) continue;
    const entries = chronological.filter((r)=>dayIndex(last.date)-dayIndex(r.date)<=180);
    const calendar = new Map();
    for (const r of entries) {
      const mk=monthKey(r.date), arr=calendar.get(mk)||[]; arr.push(r); calendar.set(mk,arr);
    }
    const pastMonths = [...calendar.keys()].sort();
    const lastMonth = monthKey(last.date);
    const priorMonths = [2,1,0].map((o)=>shiftMonth(lastMonth,-o));
    const monthly = priorMonths.every((mk)=>calendar.get(mk)?.length===1);
    const lastThree = priorMonths.map((mk)=>calendar.get(mk)?.[0]).filter(Boolean);
    if (monthly && lastThree.length === 3) {
      const dates = lastThree.map((r)=>Number(r.date.slice(8)));
      const normalizedDays = dates.map((d)=>Math.min(d,28));
      const sameDay = Math.max(...normalizedDays)-Math.min(...normalizedDays)<=5;
      if (sameDay) {
        const nextMonth = shiftMonth(lastMonth,1);
        const expected = atMonthDay(nextMonth,Math.round(median(dates)));
        const overdue = dayIndex(now)-dayIndex(expected);
        if (readyForMissing(last, expected, overdue, 75) && !chronological.some((r)=>abs(dayIndex(r.date)-dayIndex(expected))<=4)) {
          make('missing_recurring',`${last.kind}:${key}:${expected}`,expected,'medium',
            { direction:last.kind,frequency:'monthly',merchant:last.merchant||last.category,
              category:last.category,expectedDate:expected,baseline:money(median(lastThree.map((r)=>r.amount))),
              previousPeriods:3,daysOverdue:Math.floor(overdue)},lastThree.map((r)=>r.id),last.kind);
        }
        continue;
      }
    }
    // Strict weekly cadence: 5 successive occurrences, 4 most recent intervals in [5,9] days.
    if (days.length < 5) continue;
    const trailing=days.slice(-5);
    const gaps=trailing.slice(1).map((x,i)=>x-trailing[i]);
    if (!gaps.every((gap)=>gap>=5 && gap<=9)) continue;
    const gap=Math.round(median(gaps));
    const expected=dayAt(trailing[trailing.length-1]+gap);
    const overdue=dayIndex(now)-dayIndex(expected);
    if (readyForMissing(last, expected, overdue, 65) && !chronological.some((r)=>abs(dayIndex(r.date)-dayIndex(expected))<=2)) {
      make('missing_recurring',`${last.kind}:${key}:${expected}`,expected,'medium',
        {direction:last.kind,frequency:'weekly',merchant:last.merchant||last.category,
          category:last.category,expectedDate:expected,baseline:money(median(chronological.slice(-5).map((r)=>r.amount))),
          previousPeriods:5,daysOverdue:Math.floor(overdue)},chronological.slice(-5).map((r)=>r.id),last.kind);
    }
  }
}

export function detectFinancialAnomalies({ expenses=[], incomes=[], categories=[], incomeTypes=[], recurring=[], today, keyForDate, shiftKey }={}) {
  const now=civilDate(today)||civilDate(new Date().toISOString());
  const period=typeof keyForDate==='function'?keyForDate:monthKey;
  const shift=typeof shiftKey==='function'?shiftKey:shiftMonth;
  const cats=new Map((categories||[]).map((c)=>[String(c.id),String(c.name||'')]));
  const incomeTypeMap=new Map((incomeTypes||[]).map((t)=>[String(t.id),String(t.name||'')]));
  const ruleNames=new Map((recurring||[]).filter(Boolean).map((r)=>[String(r.id),String(r.name||'')]));
  const records=normalizeRows(expenses,now,cats,ruleNames,'expense',period,incomeTypeMap);
  const incomeRows=normalizeRows(incomes,now,cats,ruleNames,'income',period,incomeTypeMap);
  const signals=[];
  const seen=new Set();
  const make=(type,key,date,priority,facts,ids,kind='expense')=>{
    const id=`${type}:${key}`;
    if (seen.has(id)) return;
    seen.add(id);
    signals.push({id,type,date,priority,kind,facts,transactionIds:[...new Set(ids.map(String))]});
  };
  // Increases relative to previous complete accounting periods.
  const byCat=new Map();
  for(const r of records){if(!byCat.has(r.catId))byCat.set(r.catId,[]);byCat.get(r.catId).push(r);}
  const reference=String(period(now));
  const historical=[1,2,3].map((i)=>shift(reference,-i));
  for(const [catId,rows] of byCat){
    const sums=historical.map((mk)=>rows.filter((r)=>r.period===mk).reduce((s,r)=>s+r.amount,0));
    const exists=sums.filter((sum)=>sum>0),current=rows.filter((r)=>r.period===reference);
    if(exists.length<2||!current.length)continue;
    const avg=exists.reduce((s,n)=>s+n,0)/exists.length,total=current.reduce((s,r)=>s+r.amount,0),delta=total-avg,pct=avg?Math.round(delta/avg*100):0;
    if(total>=60&&delta>=35&&pct>=40){
      make('category_spike',`${reference}:${catId}`,current[current.length-1].date,pct>=80?'high':'medium',
        {category:current[0].category,current:money(total),baseline:money(avg),percent:pct,previousPeriods:exists.length,period:reference},current.map((r)=>r.id));
    }
  }
  // Compare amounts, dates and merchant/category. One transaction belongs to
  // at most one duplicate warning, to avoid repeated alerts for the same spend.
  const byAmount=new Map();
  const usedInDuplicate=new Set();
  for(const x of records){
    if(!recent(x.date,now,60))continue;
    const amountKey=x.amount.toFixed(2),earlier=byAmount.get(amountKey)||[];
    if(!usedInDuplicate.has(x.id)){
      const candidates=[];
      for(const other of earlier){
        const days=abs(dayIndex(x.date)-dayIndex(other.date));
        if(days>3||x.id===other.id||usedInDuplicate.has(other.id))continue;
        const sameDescription=!!x.merchantKey&&x.merchantKey.length>=3&&x.merchantKey===other.merchantKey;
        const sameCategory=x.catId===other.catId;
        if(!sameDescription&&!sameCategory)continue;
        const sameMethod=x.method&&other.method?x.method===other.method:null;
        const exact=days===0&&sameDescription&&sameCategory&&sameMethod===true;
        candidates.push({other,days,sameDescription,sameCategory,sameMethod,exact,
          score:(exact?100:0)+(sameDescription?20:0)+(sameCategory?15:0)+
            (sameMethod===true?10:0)-(days*2)});
      }
      candidates.sort((a,b)=>b.score-a.score||a.other.id.localeCompare(b.other.id));
      if(candidates.length){
        const candidate=candidates[0],other=candidate.other;
        const {days,sameDescription,sameCategory,sameMethod,exact}=candidate;
        const matchFields=['amount'],differentFields=[];
        if(sameDescription)matchFields.push('description');else differentFields.push('description');
        if(sameCategory)matchFields.push('category');else differentFields.push('category');
        if(sameMethod===true)matchFields.push('payment_method');
        if(sameMethod===false)differentFields.push('payment_method');
        if(days===0)matchFields.push('date');else differentFields.push('date');
        const pairKey=[x.id,other.id].sort().join(':');
        usedInDuplicate.add(x.id);usedInDuplicate.add(other.id);
        make('possible_duplicate',pairKey,x.date,exact?'high':'medium',
          {merchant:x.merchant||other.merchant||x.category,category:x.category,otherCategory:other.category,
            current:x.amount,firstDate:other.date,secondDate:x.date,matchFields,differentFields,
            sameDescription,sameCategory,sameMethod,daysApart:days,exact},[other.id,x.id]);
      }
    }
    earlier.push(x);
    byAmount.set(amountKey,earlier.filter((r)=>dayIndex(x.date)-dayIndex(r.date)<=3));
  }
  // Recurring expense amount changes.
  const byMerchant=new Map();
  for(const r of records){const key=r.recurringId?`rule:${r.recurringId}`:r.merchantKey.length>=4?`name:${r.merchantKey}|${r.catId}`:'';if(!key)continue;if(!byMerchant.has(key))byMerchant.set(key,[]);byMerchant.get(key).push(r);}
  const recurringSignalIds=new Set();
  for(const [key,rows] of byMerchant){
    const last=rows[rows.length-1];
    if(!recent(last.date,now,48))continue;
    const lastMk=monthKey(last.date),perMonth=new Map();
    for(const r of rows.slice(0,-1)){if(monthKey(r.date)===lastMk||dayIndex(last.date)-dayIndex(r.date)>160)continue;const mk=monthKey(r.date),list=perMonth.get(mk)||[];list.push(r);perMonth.set(mk,list);}
    const earlier=[...perMonth.values()].filter((group)=>group.length===1).map((g)=>g[0]);
    if(earlier.length<2||rows.filter((r)=>monthKey(r.date)===lastMk).length!==1)continue;
    const baseline=median(earlier.map((r)=>r.amount)),diff=last.amount-baseline,pct=baseline?Math.round(diff/baseline*100):0;
    if(abs(pct)<20||abs(diff)<5)continue;
    make('recurring_change',`${key}:${last.id}`,last.date,abs(pct)>=40?'high':'medium',
      {merchant:last.merchant||last.category,category:last.category,current:last.amount,baseline:money(baseline),
        percent:pct,direction:diff>0?'increase':'decrease',previousPeriods:earlier.length,date:last.date},
      [last.id,...earlier.map((r)=>r.id)]);
    recurringSignalIds.add(last.id);
  }
  for(const [catId,rows] of byCat){
    for(const x of rows.filter((r)=>recent(r.date,now,45)).slice(-15)){
      if(recurringSignalIds.has(x.id))continue;
      const prior=rows.filter((r)=>dayIndex(r.date)<dayIndex(x.date)&&dayIndex(x.date)-dayIndex(r.date)<=180);
      if(prior.length<5)continue;
      const baseline=median(prior.map((r)=>r.amount));
      if(baseline<=0||x.amount<75||x.amount-baseline<60||x.amount<baseline*2.8)continue;
      const pct=Math.round((x.amount-baseline)/baseline*100);
      make('unusual_expense',`${catId}:${x.id}`,x.date,'medium',
        {merchant:x.merchant,category:x.category,current:x.amount,baseline:money(baseline),percent:pct,
          comparisonCount:prior.length,date:x.date},[x.id]);
    }
  }
  // Missing movements use historical examples only as evidence, not as
  // repeated alerts against the same recorded transactions.
  regularMissing(incomeRows,now,make);
  regularMissing(records,now,make);
  // De-duplicate signals by affected movement, not merely by signal type.
  // A duplicate is more actionable than a recurring change or an outlier.
  // Category-level trend remains visible if at least two unclaimed movements
  // contribute to it, but not if it only rephrases an individual warning.
  const priorityOrder={possible_duplicate:0,recurring_change:1,unusual_expense:2,
    category_spike:3,missing_recurring:4};
  signals.sort((a,b)=>priorityOrder[a.type]-priorityOrder[b.type]||
    (a.priority==='high'?-1:1)-(b.priority==='high'?-1:1)||
    b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
  const claimed=new Set(), unique=[];
  for(const signal of signals){
    if(signal.type==='missing_recurring'){
      unique.push(signal);
      continue;
    }
    const ids=signal.transactionIds||[];
    const free=ids.filter((id)=>!claimed.has(id));
    if(signal.type==='category_spike'){
      if(free.length<2 && free.length!==ids.length)continue;
      unique.push(signal);
      continue;
    }
    if(free.length!==ids.length)continue;
    unique.push(signal);
    ids.forEach((id)=>claimed.add(id));
  }
  signals.length=0;
  signals.push(...unique);
  const rank={high:0,medium:1};
  return signals.sort((a,b)=>rank[a.priority]-rank[b.priority]||b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).slice(0,80);
}

/** Assistant access policy: summary excludes income and individual movement data; areas includes only expenses. */
export function anomaliesForAssistant(anomalies,level='summary'){
  const access=['summary','areas','full'].includes(level)?level:'summary';
  return (Array.isArray(anomalies)?anomalies:[])
    .filter((a)=>access==='full'||(a.kind!=='income'&&(access!=='summary'||a.type==='category_spike')))
    .slice(0,15).map((a)=>{
      const f=a.facts||{};
      const base={type:a.type,priority:a.priority,kind:a.kind,category:f.category,current:f.current,baseline:f.baseline,
        percent:f.percent,previousPeriods:f.previousPeriods,comparisonCount:f.comparisonCount,period:f.period,
        frequency:f.frequency,daysOverdue:f.daysOverdue};
      if(access!=='summary'){
        base.date=a.date;
        if(a.type==='possible_duplicate'){base.firstDate=f.firstDate;base.secondDate=f.secondDate;base.matchFields=f.matchFields;base.differentFields=f.differentFields;}
      }
      if(access==='full'){base.merchant=f.merchant;base.transactionIds=a.transactionIds;}
      return base;
    });
}
