import {parseMoneyValue} from '../financeCalculations.js';
import {goalSavedAmount} from './savingsGoals.js';
import {validCalendarDate} from './financialCalendar.js';

const list=value=>Array.isArray(value)?value:[];
const active=row=>row&&!row.deleted&&!row.deletedAt&&!row.archived&&
  !['deleted','archived','cancelled'].includes(String(row.status||'').toLowerCase());
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cents=value=>Math.round(value*100);
const has=(object,key)=>Object.prototype.hasOwnProperty.call(object||{},key);
const civil=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&validCalendarDate(value);
function amountOrNull(value) {
  if(value==null||typeof value==='boolean'||typeof value==='object')return null;
  if(typeof value==='number')return Number.isFinite(value)?cents(value)/100:null;
  const text=String(value).trim();
  if(!text||!/^[-+]?\s*(?:\d+(?:[.,]\d+)?|\d{1,3}(?:[.,]\d{3})+[.,]\d{1,2})\s*$/.test(text))return null;
  const parsed=parseMoneyValue(text);
  return Number.isFinite(parsed)?cents(parsed)/100:null;
}
function bounded(rows,question,limit=100) {
  const query=normalize(question),matched=rows.filter(row=>row.name&&query.includes(normalize(row.name)));
  const items=[...new Set([...matched,...rows])].slice(0,limit);
  return {items,totalCount:rows.length,omittedCount:rows.length-items.length};
}

// The app already derives automatic balances and canonical goal contributions.
// Read those values as evidence; do not reapply movements or add goals to wealth.
export function assistantFinancialPositionForApp(c,question='') {
  if(c?.aiDataAccess!=='full')return {schema:1,status:'N_D',reason:'FULL_DATA_ACCESS_REQUIRED'};
  const today=String(c.today||'');
  if(!civil(today))return {schema:1,status:'N_D',reason:'INVALID_TODAY'};
  const currency=String(c.currency||'');
  const currentValues=c.patrimonioValues;
  const values=currentValues&&typeof currentValues==='object'&&!Array.isArray(currentValues)?currentValues:{};
  const assetRows=list(c.patrimonioEntries).filter(active).map(entry=>{
    const value=has(values,String(entry.id))?amountOrNull(values[String(entry.id)]):null;
    const area=list(c.patrimonioAreas).find(item=>String(item.id)===String(entry.areaId));
    return {name:String(entry.name||''),area:area?.name||null,areaId:String(entry.areaId||''),
      value,currency,status:value===null?'N_D':'RECORDED_VALUE'};
  });
  const known=assetRows.filter(row=>row.value!==null),missingValueCount=assetRows.length-known.length;
  const knownTotal=known.length?known.reduce((sum,row)=>sum+cents(row.value),0)/100:null;
  const goalRows=list(c.goals).filter(active).map(goal=>{
    const goalCurrency=String(goal.currency||currency),target=amountOrNull(goal.target);
    let saved=null,savedBasis='N_D';
    try {
      // The canonical callback includes historical contributions and reversals.
      // A standalone snapshot can use the same pure ledger function when present.
      if(typeof c.goalSavedAmount==='function') {saved=amountOrNull(c.goalSavedAmount(goal));savedBasis='APP_CANONICAL_GOAL_AMOUNT';}
      else if(c.financeEvolution?.savings&&Array.isArray(c.financeEvolution.savings.entries)) {
        saved=amountOrNull(goalSavedAmount(c.financeEvolution,goal,currency));savedBasis='CANONICAL_SAVINGS_LEDGER';
      } else if(has(goal,'saved')) {saved=amountOrNull(goal.saved);savedBasis='RECORDED_LEGACY_SAVED_AMOUNT';}
    } catch {saved=null;}
    const validTarget=target!==null&&target>=0?target:null;
    const remaining=validTarget!==null&&saved!==null?Math.max(0,cents(validTarget)-cents(saved))/100:null;
    const rawDeadline=String(goal.deadline||''),deadline=civil(rawDeadline)?rawDeadline:null;
    const deadlineStatus=rawDeadline&&!deadline?'INVALID_DATE':!deadline?'NO_DEADLINE':deadline<today?'PAST':deadline===today?'TODAY':'FUTURE';
    const monthsIncludingCurrent=deadline&&deadline>=today
      ? (Number(deadline.slice(0,4))-Number(today.slice(0,4)))*12+Number(deadline.slice(5,7))-Number(today.slice(5,7))+1:null;
    return {name:String(goal.name||''),currency:goalCurrency,target:validTarget,saved,savedBasis:saved===null?'N_D':savedBasis,remaining,
      progressPercentage:validTarget>0&&saved!==null?Math.round(saved/validTarget*10000)/100:null,
      deadline,deadlineStatus,monthsIncludingCurrent,
      monthlyContributionToDeadline:remaining!==null&&monthsIncludingCurrent!==null?Math.ceil(cents(remaining)/monthsIncludingCurrent)/100:null,
      contributionBasis:'EQUAL_CONTRIBUTIONS_INCLUDING_CURRENT_MONTH',
      status:remaining===null?'N_D':remaining===0?'COMPLETE':deadlineStatus==='PAST'?'OVERDUE':'OPEN'};
  });
  return {schema:1,status:assetRows.length||goalRows.length?'LOADED_DATA':'N_D',today,currency,
    patrimony:{status:!assetRows.length?'N_D':missingValueCount?'PARTIAL':'LOADED_DATA',basis:'CURRENT_RECORDED_VALUES',
      total:assetRows.length&&!missingValueCount?knownTotal:null,knownTotal,missingValueCount,...bounded(assetRows,question)},
    liquidity:{status:'N_D',amount:null,reason:'NOT_DERIVABLE_FROM_PATRIMONY_TOTAL'},
    goals:bounded(goalRows,question),
    limitations:[
      'Patrimony is the current recorded valuation from the app, not a verified bank balance or a historical valuation for a requested month.',
      'A missing asset value is unavailable, never zero. knownTotal excludes unavailable values; total is unavailable if any active asset is missing.',
      'Goals use their canonical saved amount, including linked contributions when available. Do not add goal savings to patrimony or subtract them again without evidence.',
      'The monthly contribution is the remaining target divided equally across calendar months including this month and the deadline month, rounded up to cents; it is arithmetic, not a saving plan or a feasibility guarantee.',
      'Compare goals with income, expenses and budgets only in the same currency. Wealth alone does not establish how much can be spent.',
      'Calculations cover loaded active records only; omittedCount marks bounded detail lists.'
    ]};
}
