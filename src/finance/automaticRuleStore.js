import {migrateFinanceEvolution} from '../data/financeEvolution.js';
import {ruleLimit,validateAutomaticRule,automaticRuleCategoryConflict} from './automaticRules.js';
export function saveAutomaticRule(finance,input,plan){
  const data=migrateFinanceEvolution(finance),old=data.rules.find(r=>r.id===input.id);
  if(typeof input.id!=='string'||!input.id.trim())throw new Error('INVALID_AUTOMATIC_RULE');
  if(old?(old.kind!=='automatic-v1'||old.revision!==input.expectedRevision):input.expectedRevision!=null)throw new Error('RULE_CONFLICT');
  if(!old&&data.rules.filter(r=>r.kind==='automatic-v1').length>=ruleLimit(plan))throw new Error('RULE_LIMIT');
  const {expectedRevision,...fields}=input;
  const rule={...fields,kind:'automatic-v1',name:String(input.name).trim(),revision:old?old.revision+1:0,priority:old?old.priority:Math.max(-1,...data.rules.map(r=>Number(r.priority)||0))+1};
  validateAutomaticRule(rule);
  if(rule.enabled&&automaticRuleCategoryConflict(rule))throw new Error('RULE_CATEGORY_CONFLICT');
  return migrateFinanceEvolution({...data,rules:old?data.rules.map(r=>r.id===old.id?rule:r):[...data.rules,rule]});
}
export function deleteAutomaticRule(finance,id,revision){
  const data=migrateFinanceEvolution(finance),old=data.rules.find(r=>r.id===id);
  if(!old||old.kind!=='automatic-v1'||old.revision!==revision)throw new Error('RULE_CONFLICT');
  return migrateFinanceEvolution({...data,rules:data.rules.filter(r=>r.id!==id)});
}
export function reorderAutomaticRules(finance,ids,expected){
  const data=migrateFinanceEvolution(finance);
  if(JSON.stringify(data.rules)!==expected)throw new Error('RULE_CONFLICT');
  const rows=data.rules.filter(r=>r.kind==='automatic-v1');
  if(ids.length!==rows.length||new Set(ids).size!==ids.length||ids.some(id=>!rows.some(r=>r.id===id)))throw new Error('RULE_CONFLICT');
  return migrateFinanceEvolution({...data,rules:data.rules.map(r=>r.kind==='automatic-v1'?{...r,priority:ids.indexOf(r.id),revision:r.revision+1}:r)});
}
