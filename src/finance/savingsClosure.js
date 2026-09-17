import { migrateFinanceEvolution } from '../data/financeEvolution.js';
import { periodForKey, periodForDate } from './periodEngine.js';
import { budgetForPeriod, budgetPeriodSummary } from './budgetEngine.js';

const minor = value => { const n=Math.round(value*100); if(!Number.isSafeInteger(n))throw new Error('INVALID_CLOSURE_AMOUNT');return n; };
export const closureId = (bounds,currency) => `close:${currency}:${bounds.start}:${bounds.end}`;

// Largest remainders, in whole currency units. Any cents stay in the period.
export function distributeSavings(amountMinor, rows) {
  if(!Number.isSafeInteger(amountMinor)||amountMinor<0)throw new Error('INVALID_CLOSURE_AMOUNT');
  const units=Math.floor(amountMinor/100);
  if(!rows.length)return {};
  if(new Set(rows.map(r=>r.id)).size!==rows.length || rows.some(r=>!Number.isFinite(r.weight)||r.weight<0))throw new Error('INVALID_CLOSURE_WEIGHTS');
  const total=rows.reduce((n,r)=>n+r.weight,0);
  const parts=rows.map((r,index)=>{const exact=units*(total?r.weight/total:1/rows.length);return {...r,index,value:Math.floor(exact),remainder:exact-Math.floor(exact)};});
  let rest=units-parts.reduce((n,r)=>n+r.value,0);
  for(const row of [...parts].sort((a,b)=>b.remainder-a.remainder||a.index-b.index)){if(rest-->0)row.value++;}
  return Object.fromEntries(parts.map(r=>[r.id,r.value*100]));
}

export function closurePreview(finance, legacyPlan, expenses, incomes, key, currency, today) {
  const data=migrateFinanceEvolution(finance), bounds=periodForKey(key,data.period);
  const current=periodForDate(today,data.period);
  if(bounds.end>=current.start)throw new Error('PERIOD_NOT_ENDED');
  const existing=data.savings.closures.find(row=>row.id===closureId(bounds,currency));
  if(existing)return {existing};
  if(data.savings.closures.some(row=>row.kind==='period-v1'&&row.currency===currency&&row.start<=bounds.end&&row.end>=bounds.start))throw new Error('CLOSURE_OVERLAP');
  const plan=budgetForPeriod(data,legacyPlan,key);
  const summary=budgetPeriodSummary(expenses,incomes,plan,key,data.period);
  const realMinor=minor(summary.realSaving), plannedMinor=minor(summary.plannedSaving);
  const counted=data.savings.entries.filter(e=>e.kind==='manual'&&e.status==='active'&&e.currency===currency&&e.date>=bounds.start&&e.date<=bounds.end);
  const depositedMinor=counted.reduce((n,e)=>n+e.amountMinor,0);
  const availableMinor=Math.max(0,realMinor-depositedMinor);
  const buckets=data.savings.buckets.filter(b=>b.active!==false&&b.currency===currency);
  const proposal=distributeSavings(availableMinor,buckets.map(b=>({id:b.id,weight:Number(plan?.savingsPlannedAmounts?.[b.id])||0})));
  const snapshot={id:closureId(bounds,currency),kind:'period-v1',periodKey:key,settings:{...data.period},start:bounds.start,end:bounds.end,currency,realMinor,plannedMinor,depositedMinor,availableMinor,counted:counted.map(e=>({id:e.id,revision:e.revision,amountMinor:e.amountMinor}))};
  // Detect changes while the confirmation form is open, including goal links.
  const token=JSON.stringify({snapshot,buckets:buckets.map(b=>({id:b.id,goalId:b.goalId,balanceMinor:b.balanceMinor})),proposal});
  return {snapshot,buckets,proposal,token};
}

function allocationsChecked(allocations,buckets,limit,step=100) {
  if(!allocations||typeof allocations!=='object'||Array.isArray(allocations))throw new Error('INVALID_CLOSURE_ALLOCATION');
  let total=0;
  for(const [id,value] of Object.entries(allocations)){
    if(!buckets.some(b=>b.id===id)||!Number.isSafeInteger(value)||value<0||value%step!==0)throw new Error('INVALID_CLOSURE_ALLOCATION');
    total+=value;
  }
  if(!Number.isSafeInteger(total)||total>limit)throw new Error('CLOSURE_EXCEEDED');
  return total;
}

export function closeSavingsPeriod(finance, input, now=new Date().toISOString()) {
  const data=migrateFinanceEvolution(finance);
  const preview=closurePreview(data,input.legacyPlan,input.expenses,input.incomes,input.periodKey,input.currency,input.today);
  if(preview.existing)throw new Error('PERIOD_ALREADY_CLOSED');
  if(preview.token!==input.expectedToken)throw new Error('CLOSURE_CONFLICT');
  const allocatedMinor=allocationsChecked(input.allocations,preview.buckets,preview.snapshot.availableMinor);
  const closure={...preview.snapshot,allocatedMinor,residualMinor:preview.snapshot.availableMinor-allocatedMinor,closedAt:now};
  const entries=[...data.savings.entries], buckets=data.savings.buckets.map(b=>({...b}));
  for(const [id,amountMinor] of Object.entries(input.allocations)){
    if(!amountMinor)continue;
    const bucket=buckets.find(b=>b.id===id);
    if(bucket.goalId && !(input.goals||[]).some(g=>String(g.id)===bucket.goalId&&(g.currency||input.currency)===bucket.currency))throw new Error('SAVINGS_GOAL_UNAVAILABLE');
    if(bucket.ledgerVersion!==1){bucket.openingBalanceMinor=bucket.balanceMinor;bucket.ledgerVersion=1;}
    bucket.balanceMinor+=amountMinor;
    entries.push({id:`${closure.id}:${id}`,kind:'closure',closureId:closure.id,bucketId:id,currency:closure.currency,date:closure.end,amountMinor,source:'residual',goalId:bucket.goalId||null,status:'active',createdAt:now});
  }
  const deficits=[...data.savings.deficits];
  if(closure.realMinor<0)deficits.push({id:closure.id,kind:'period-v1',closureId:closure.id,periodKey:closure.periodKey,currency:closure.currency,originalMinor:-closure.realMinor,status:'uncovered'});
  return migrateFinanceEvolution({...data,savings:{...data.savings,buckets,entries,closures:[...data.savings.closures,closure],deficits}});
}

export function deficitRemaining(savings, deficit) {
  return deficit.originalMinor-savings.coverageEntries.filter(e=>e.kind==='period-v1'&&e.deficitId===deficit.id).reduce((n,e)=>n+e.amountMinor,0);
}

// Use unassigned funds first. If goal funds are needed, retain the original
// goal identities even when the bucket has since been linked elsewhere.
function coverageGoalDebits(savings,bucket,amountMinor){
  const credits=new Map();
  for(const e of savings.entries.filter(e=>e.bucketId===bucket.id&&['manual','closure'].includes(e.kind)&&e.status==='active'&&e.goalId))credits.set(e.goalId,(credits.get(e.goalId)||0)+e.amountMinor);
  for(const e of savings.coverageEntries.filter(e=>e.kind==='period-v1'&&e.bucketId===bucket.id))for(const debit of e.goalDebits)credits.set(debit.goalId,(credits.get(debit.goalId)||0)-debit.amountMinor);
  const goalTotal=[...credits.values()].reduce((n,v)=>n+v,0);
  let needed=Math.max(0,amountMinor-Math.max(0,bucket.balanceMinor-goalTotal));
  const debits=[];
  for(const [goalId,available] of credits){const take=Math.min(needed,available);if(take>0){debits.push({goalId,amountMinor:take});needed-=take;}}
  return debits;
}

export function coverSavingsDeficit(finance,input,now=new Date().toISOString()) {
  const data=migrateFinanceEvolution(finance);
  if(typeof input.id!=='string'||!input.id.trim())throw new Error('INVALID_COVERAGE_ID');
  if(data.savings.coverageEntries.some(e=>e.operationId===input.id))throw new Error('COVERAGE_DUPLICATE');
  const deficit=data.savings.deficits.find(d=>d.id===input.deficitId&&d.kind==='period-v1');
  if(!deficit)throw new Error('DEFICIT_NOT_FOUND');
  const remaining=deficitRemaining(data.savings,deficit);
  if(remaining!==input.expectedRemaining)throw new Error('CLOSURE_CONFLICT');
  const eligible=data.savings.buckets.filter(b=>b.currency===deficit.currency);
  const total=allocationsChecked(input.allocations,eligible,remaining,1);
  if(!total)throw new Error('INVALID_CLOSURE_ALLOCATION');
  const coverageEntries=[...data.savings.coverageEntries], buckets=data.savings.buckets.map(b=>({...b}));
  const date=now.slice(0,10);
  for(const [id,amountMinor] of Object.entries(input.allocations)){
    if(!amountMinor)continue;
    const bucket=buckets.find(b=>b.id===id);
    if(bucket.balanceMinor<amountMinor)throw new Error('INSUFFICIENT_SAVINGS');
    const goalDebits=coverageGoalDebits(data.savings,bucket,amountMinor);
    if(bucket.ledgerVersion!==1){bucket.openingBalanceMinor=bucket.balanceMinor;bucket.ledgerVersion=1;}
    bucket.balanceMinor-=amountMinor;
    coverageEntries.push({id:`${input.id}:${id}`,operationId:input.id,kind:'period-v1',deficitId:deficit.id,bucketId:id,currency:deficit.currency,date,amountMinor,goalDebits,createdAt:now});
  }
  const deficits=data.savings.deficits.map(d=>d.id===deficit.id?{...d,status:total===remaining?'covered':'partial'}:d);
  return migrateFinanceEvolution({...data,savings:{...data.savings,buckets,deficits,coverageEntries}});
}
