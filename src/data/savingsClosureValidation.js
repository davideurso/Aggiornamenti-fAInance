import { periodForKey } from '../finance/periodEngine.js';

const integer=(value,min=0)=>{if(!Number.isSafeInteger(value)||value<min)throw new Error('INVALID_CLOSURE_AMOUNT');};
const stamp=value=>{if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('INVALID_CLOSURE_TIMESTAMP');};
export function validateSavingsClosures(savings) {
  const closures=savings.closures.filter(c=>c.kind==='period-v1');
  for(const c of closures){
    const bounds=periodForKey(c.periodKey,c.settings);
    if(c.start!==bounds.start||c.end!==bounds.end||c.id!==`close:${c.currency}:${c.start}:${c.end}`||! /^[A-Z]{3}$/.test(c.currency))throw new Error('INVALID_CLOSURE_PERIOD');
    if(closures.some(other=>other!==c&&other.currency===c.currency&&other.start<=c.end&&other.end>=c.start))throw new Error('CLOSURE_OVERLAP');
    integer(c.realMinor,-Number.MAX_SAFE_INTEGER);
    for(const k of ['plannedMinor','depositedMinor','availableMinor','allocatedMinor','residualMinor'])integer(c[k]);
    stamp(c.closedAt);
    if(c.closedAt.slice(0,10)<=c.end)throw new Error('INVALID_CLOSURE_TIMESTAMP');
    if(c.availableMinor!==Math.max(0,c.realMinor-c.depositedMinor)||c.allocatedMinor+c.residualMinor!==c.availableMinor)throw new Error('INVALID_CLOSURE_TOTAL');
    if(!Array.isArray(c.counted)||new Set(c.counted.map(e=>e.id)).size!==c.counted.length)throw new Error('INVALID_CLOSURE_DEPOSITS');
    let deposits=0;
    for(const saved of c.counted){
      const e=savings.entries.find(e=>e.id===saved.id);
      if(!e||e.kind!=='manual'||e.status!=='active'||e.currency!==c.currency||e.date<c.start||e.date>c.end||e.revision!==saved.revision||e.amountMinor!==saved.amountMinor)throw new Error('CLOSED_SAVINGS_ENTRY');
      deposits+=e.amountMinor;
    }
    if(deposits!==c.depositedMinor)throw new Error('INVALID_CLOSURE_DEPOSITS');
    const active=savings.entries.filter(e=>e.kind==='manual'&&e.status==='active'&&e.currency===c.currency&&e.date>=c.start&&e.date<=c.end);
    if(active.length!==c.counted.length)throw new Error('CLOSED_SAVINGS_ENTRY');
    const entries=savings.entries.filter(e=>e.kind==='closure'&&e.closureId===c.id);
    if(entries.reduce((n,e)=>n+e.amountMinor,0)!==c.allocatedMinor)throw new Error('INVALID_CLOSURE_TOTAL');
    const deficit=savings.deficits.find(d=>d.kind==='period-v1'&&d.id===c.id);
    if(c.realMinor<0 ? !deficit||deficit.originalMinor!==-c.realMinor : !!deficit)throw new Error('INVALID_CLOSURE_DEFICIT');
  }
  for(const e of savings.entries.filter(e=>e.kind==='closure')){
    const c=closures.find(c=>c.id===e.closureId), b=savings.buckets.find(b=>b.id===e.bucketId);
    if(!c||!b||b.ledgerVersion!==1||e.currency!==c.currency||e.currency!==b.currency||e.date!==c.end||e.status!=='active'||e.source!=='residual'||e.id!==`${c.id}:${b.id}`||e.amountMinor%100!==0)throw new Error('INVALID_CLOSURE_ENTRY');
    if(e.goalId!=null&&(typeof e.goalId!=='string'||!e.goalId.trim()))throw new Error('INVALID_SAVINGS_GOAL');
    stamp(e.createdAt);
  }
  for(const d of savings.deficits.filter(d=>d.kind==='period-v1')){
    const c=closures.find(c=>c.id===d.closureId);
    if(!c||d.id!==c.id||d.currency!==c.currency||d.periodKey!==c.periodKey||d.originalMinor!==-c.realMinor)throw new Error('INVALID_CLOSURE_DEFICIT');
    integer(d.originalMinor,1);
    const paid=savings.coverageEntries.filter(e=>e.kind==='period-v1'&&e.deficitId===d.id).reduce((n,e)=>n+e.amountMinor,0);
    integer(paid);if(paid>d.originalMinor||d.status!==(paid===0?'uncovered':paid===d.originalMinor?'covered':'partial'))throw new Error('INVALID_DEFICIT_COVERAGE');
  }
  for(const e of savings.coverageEntries.filter(e=>e.kind==='period-v1')){
    const d=savings.deficits.find(d=>d.kind==='period-v1'&&d.id===e.deficitId),b=savings.buckets.find(b=>b.id===e.bucketId);
    if(!d||!b||b.ledgerVersion!==1||e.currency!==d.currency||e.currency!==b.currency||typeof e.operationId!=='string'||!e.operationId||e.id!==`${e.operationId}:${b.id}`)throw new Error('INVALID_DEFICIT_COVERAGE');
    integer(e.amountMinor,1);stamp(e.createdAt);
    if(e.date!==e.createdAt.slice(0,10))throw new Error('INVALID_DEFICIT_COVERAGE');
    if(!Array.isArray(e.goalDebits)||new Set(e.goalDebits.map(d=>d.goalId)).size!==e.goalDebits.length)throw new Error('INVALID_COVERAGE_GOALS');
    let goalTotal=0;
    for(const debit of e.goalDebits){integer(debit.amountMinor,1);if(typeof debit.goalId!=='string'||!debit.goalId)throw new Error('INVALID_COVERAGE_GOALS');goalTotal+=debit.amountMinor;}
    if(goalTotal>e.amountMinor)throw new Error('INVALID_COVERAGE_GOALS');
  }
  for(const b of savings.buckets){
    const credits=new Map();
    for(const e of savings.entries.filter(e=>e.bucketId===b.id&&['manual','closure'].includes(e.kind)&&e.status==='active'&&e.goalId))credits.set(e.goalId,(credits.get(e.goalId)||0)+e.amountMinor);
    for(const e of savings.coverageEntries.filter(e=>e.kind==='period-v1'&&e.bucketId===b.id))for(const debit of e.goalDebits){credits.set(debit.goalId,(credits.get(debit.goalId)||0)-debit.amountMinor);}
    if([...credits.values()].some(n=>n<0)||[...credits.values()].reduce((n,v)=>n+v,0)>b.balanceMinor)throw new Error('INVALID_COVERAGE_GOALS');
  }
}
