import {migrateFinanceEvolution} from '../data/financeEvolution.js';
import {validateBudgetPlan} from '../data/budgetValidation.js';
import {civilToday,createBalanceCheckpoint} from './patrimonyAutoBalance.js';
const list=x=>Array.isArray(x)?x:[];
const text=x=>String(x??'').normalize('NFKC').trim().toLocaleLowerCase();
const alive=x=>x&&!x.deleted&&!x.deletedAt&&x.status!=='deleted';
const income=x=>x.rtype==='income';
function fields(scope,direction){return scope==='method'?direction==='income'?['receivedInMethodId']:['methodId','method']:scope==='incomeCategory'?['type','incomeType','typeId','catId','categoryId']:['catId','categoryId'];}
function names(scope,direction){return scope==='method'?direction==='income'?['receivedInMethodName']:['methodName','paymentMethodName','paymentMethod']:scope==='incomeCategory'?['typeName','incomeTypeName','categoryName','category']:['catName','categoryName','category','cat'];}
export function catalogMatches(row,scope,source,direction){
 const keys=fields(scope,direction),ids=keys.filter(k=>row[k]!=null&&String(row[k])!=='');
 if(ids.length)return ids.some(k=>String(row[k])===String(source.id));
 return names(scope,direction).some(k=>text(row[k])&&text(row[k])===text(source.name));
}
export function catalogReferences(state,scope,source){
 const out=[];
 for(const [collection,direction]of [['expenses','expense'],['incomes','income'],['recurring',null]])for(const row of list(state[collection])){
  const kind=direction||(income(row)?'income':'expense');
  if((scope==='expenseCategory'&&kind!=='expense')||(scope==='incomeCategory'&&kind!=='income'))continue;
  if(alive(row)&&catalogMatches(row,scope,source,kind))out.push({collection,direction:kind,row});
 }
 if(out.budgetPlan)validateBudgetPlan(out.budgetPlan);if(out.legacyBudgetPlan)validateBudgetPlan(out.legacyBudgetPlan);
 return out;
}
export function methodRemapConflict(state,sourceId,targetId){
 const owners=list(state.patrimonioEntries).filter(e=>alive(e)&&e.balanceLink?.enabled&&list(e.balanceLink.checkpoints).at(-1)?.methodIds?.map(String).includes(String(sourceId)));
 if(!owners.length)return false;
 return list(state.patrimonioEntries).some(e=>alive(e)&&e.balanceLink?.enabled&&!owners.some(o=>String(o.id)===String(e.id))&&list(e.balanceLink.checkpoints).at(-1)?.methodIds?.map(String).includes(String(targetId)));
}
export function remapCatalogReferences(state,scope,source,target,now=new Date().toISOString()){
 if(!target||String(source.id)===String(target.id)||!alive(target))throw Error('INVALID_CATALOG_TARGET');
 if(scope==='method'&&methodRemapConflict(state,source.id,target.id))throw Error('PATRIMONY_MAPPING_CONFLICT');
 const out={},sid=String(source.id),tid=String(target.id);
 function rewrite(row,direction){
  if(!catalogMatches(row,scope,source,direction))return row;
  const next={...row,updatedAt:now};
  for(const key of fields(scope,direction))if(next[key]!=null)next[key]=tid;
  const primary=scope==='method'?(direction==='income'?'receivedInMethodId':'methodId'):scope==='incomeCategory'?'type':'catId';next[primary]=tid;
  for(const key of names(scope,direction))if(next[key]!=null)next[key]=target.name;
  return next;
 }
 for(const [collection,direction]of [['expenses','expense'],['incomes','income'],['recurring',null]])out[collection]=list(state[collection]).map(row=>{
  const kind=direction||(income(row)?'income':'expense');
  return(scope==='expenseCategory'&&kind!=='expense')||(scope==='incomeCategory'&&kind!=='income')?row:rewrite(row,kind);
 });
 // Reuse current balances as explicit checkpoints so merging instruments cannot retroactively add another instrument's history.
 if(scope==='method')out.patrimonioEntries=list(state.patrimonioEntries).map(e=>{
  const link=e.balanceLink,last=list(link?.checkpoints).at(-1);
  if(!alive(e)||!link?.enabled||!last?.methodIds?.map(String).some(id=>id===sid||id===tid))return e;
  const methodIds=[...new Set(last.methodIds.map(id=>String(id)===sid?tid:String(id)))];
  const checkpoint=createBalanceCheckpoint({date:civilToday(new Date(now)),amount:Number(state.patrimonioValues?.[e.id]??last.amount),methodIds,expenses:out.expenses,incomes:out.incomes,shareCashMovements:state.shareCashMovements,now});
  return {...e,balanceLink:{...link,checkpoints:[...link.checkpoints,checkpoint]},updatedAt:now};
 });
 const idFields=scope==='method'?['methodId','paymentMethodId']:scope==='incomeCategory'?['incomeType','incomeTypeId']:['catId','categoryId'];
 function refs(obj){if(Array.isArray(obj)){
   const rows=obj.map(refs);if(!rows.length||!rows.every(x=>x&&typeof x==='object'&&x.catId!=null&&Number.isFinite(x.amount)))return rows;
   const merged=new Map();for(const row of rows){const key=String(row.catId),old=merged.get(key);if(!old)merged.set(key,row);else merged.set(key,{...old,amount:old.amount+row.amount,allocationMode:old.allocationMode==='percent'&&row.allocationMode==='percent'?'percent':'amount',pct:(Number(old.pct)||0)+(Number(row.pct)||0)});}return [...merged.values()];
  }if(!obj||typeof obj!=='object')return obj;const result={};for(const[k,v]of Object.entries(obj))result[k]=idFields.includes(k)&&String(v)===sid?tid:refs(v);return result;}
 if(scope==='expenseCategory'){
  out.alerts=refs(state.alerts||[]);if(state.financeEvolution){if(state.legacyBudgetPlan!==undefined)out.legacyBudgetPlan=refs(state.legacyBudgetPlan);}else out.budgetPlan=refs(state.budgetPlan||null);
  out.shareCategoryMappings=Object.fromEntries(Object.entries(state.shareCategoryMappings||{}).map(([k,v])=>[k,String(v)===sid?tid:v]));
 }
 if(state.financeEvolution){
  const finance=scope==='expenseCategory'?{...state.financeEvolution,budget:refs(state.financeEvolution.budget)}:{...state.financeEvolution};
  finance.rules=list(finance.rules).map(rule=>{
   const direction=scope==='incomeCategory'?'income':'expense';
   const applies=scope==='method'||rule.trigger===direction||(rule.trigger==='movement'&&rule.categoryFilter?.direction===direction);
   const field=scope==='method'?'payment':'category';let changed=false;
   const map=rows=>list(rows).map(item=>{if(applies&&item.field===field&&String(item.value)===sid){changed=true;return {...item,value:tid};}return item;});
   const conditions=map(rule.conditions),actions=map(rule.actions);let categoryFilter=rule.categoryFilter;
   if(scope!=='method'&&categoryFilter?.direction===(scope==='incomeCategory'?'income':'expense')&&String(categoryFilter.value)===sid){categoryFilter={...categoryFilter,value:tid};changed=true;}
   return changed?{...rule,conditions,actions,categoryFilter,revision:(Number(rule.revision)||0)+1,updatedAt:now}:rule;
  });out.financeEvolution=migrateFinanceEvolution(finance);
 }
 if(out.budgetPlan)validateBudgetPlan(out.budgetPlan);if(out.legacyBudgetPlan)validateBudgetPlan(out.legacyBudgetPlan);
 return out;
}
