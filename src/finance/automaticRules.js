export const ruleFields=['description','category','payment','amount','direction','transactionType','source'];
export const actionFields=['category','payment','description','tags','alert'];
export const operatorsFor=field=>field==='amount'?['equals','notEquals','greater','less']:field==='description'?['contains','equals','starts','notContains']:['equals','notEquals'];
export const ruleLimit=plan=>plan==='premium'?Infinity:plan==='base'?2:1;
const text=v=>String(v??'').normalize('NFKC').trim().toLocaleLowerCase();
export function validateAutomaticRule(rule){
  if(rule.kind!=='automatic-v1')return;
  if(typeof rule.name!=='string'||!rule.name.trim()||rule.name.length>120||typeof rule.enabled!=='boolean'||!Number.isSafeInteger(rule.priority)||rule.priority<0||!Number.isSafeInteger(rule.revision)||rule.revision<0||!['expense','income','movement'].includes(rule.trigger)||!['all','any'].includes(rule.match))throw new Error('INVALID_AUTOMATIC_RULE');
  if(!Array.isArray(rule.conditions)||!rule.conditions.length||rule.conditions.length>20||!Array.isArray(rule.actions)||rule.actions.length>10||(!rule.actions.length&&!rule.alert))throw new Error('INVALID_AUTOMATIC_RULE');
  for(const c of rule.conditions){if(!ruleFields.includes(c.field)||!operatorsFor(c.field).includes(c.operator)||!['string','number'].includes(typeof c.value)||!String(c.value).trim()||String(c.value).length>500)throw new Error('INVALID_RULE_CONDITION');if(c.field==='amount'&&(!Number.isFinite(Number(c.value))||Number(c.value)<0))throw new Error('INVALID_RULE_CONDITION');}
  if(rule.categoryFilter!=null&&(!['expense','income'].includes(rule.categoryFilter.direction)||!['string','number'].includes(typeof rule.categoryFilter.value)||!String(rule.categoryFilter.value).trim()||(rule.trigger!=='movement'&&rule.trigger!==rule.categoryFilter.direction)))throw new Error('INVALID_RULE_CATEGORY');
  if(new Set(rule.actions.map(a=>a.field)).size!==rule.actions.length)throw new Error('DUPLICATE_RULE_ACTION');
  for(const a of rule.actions)if(a.field!=='alert'&&(!actionFields.includes(a.field)||!['string','number'].includes(typeof a.value)||!String(a.value).trim()||String(a.value).length>500))throw new Error('INVALID_RULE_ACTION');
  const alerts=[...rule.actions.filter(a=>a.field==='alert'),...(rule.alert?[rule.alert]:[])];
  if(alerts.length>1)throw new Error('DUPLICATE_RULE_ALERT');
  for(const alert of alerts)if(!['information','confirmation'].includes(alert.kind)||typeof alert.text!=='string'||!alert.text.trim()||alert.text.length>1000)throw new Error('INVALID_RULE_ALERT');
}
export function evaluateAutomaticRules(rules, item, direction, source='manual', options={}){
  const original={description:item.desc||'',category:direction==='income'?item.type:item.catId,payment:item.methodId??item.method,amount:Number(item.amount),direction,transactionType:item.rateizzato?'installment':item.receipt?'receipt':'single',source};
  const next={...item},claimed=new Set(),matched=[],alerts=[],skipped=[];
  const defaults=new Set(Array.isArray(item._ruleDefaultFields)?item._ruleDefaultFields:[]);
  const eligible=rules.filter(r=>r.kind==='automatic-v1').slice().sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id)).slice(0,ruleLimit(options.plan||'free'));
  for(const rule of eligible){
    validateAutomaticRule(rule);
    if(!rule.enabled||(rule.trigger!=='movement'&&rule.trigger!==direction))continue;
    if(rule.categoryFilter&&(rule.categoryFilter.direction!==direction||String(rule.categoryFilter.value)!==String(original.category)))continue;
    const checks=rule.conditions.map(c=>{const a=original[c.field],b=c.value;if(c.field==='amount')return c.operator==='greater'?a>Number(b):c.operator==='less'?a<Number(b):c.operator==='notEquals'?a!==Number(b):a===Number(b);const left=text(a),right=text(b);switch(c.operator){case 'contains':return left.includes(right);case 'notContains':return !left.includes(right);case 'starts':return left.startsWith(right);case 'notEquals':return left!==right;default:return left===right;}});
    if(!(rule.match==='all'?checks.every(Boolean):checks.some(Boolean)))continue;
    matched.push(rule.id);
    for(const action of rule.actions){
      if(action.field==='alert'){alerts.push({kind:action.kind,text:action.text,ruleId:rule.id,name:rule.name});continue;}
      const field=action.field==='category'?(direction==='income'?'type':'catId'):action.field==='payment'?'methodId':action.field==='description'?'desc':'tags';
      if(direction==='income'&&field==='methodId')continue;
      const explicit=field==='methodId'?(item.methodId??item.method):item[field];
      if(claimed.has(field)){skipped.push({field,reason:'priority'});continue;}
      if(!defaults.has(field)&&explicit!=null&&String(explicit).trim()!==''){skipped.push({field,reason:'explicit'});continue;}
      let value=action.value;
      if(field==='catId'||field==='type'||field==='methodId'){
        const choices=field==='catId'?options.cats:field==='type'?options.incomeTypes:options.methods;
        if(choices&&!choices.some(c=>String(c.id)===String(value))){skipped.push({field,reason:'missing'});continue;}
        const selected=choices?.find(c=>String(c.id)===String(value));value=selected?selected.id:value;
        if(field==='methodId'){delete next.methodName;delete next.method;}
      }
      next[field]=field==='tags'?String(value).split(',').map(t=>t.trim()).filter(Boolean):value;
      claimed.add(field);
    }
    if(rule.alert)alerts.push({...rule.alert,ruleId:rule.id,name:rule.name});
  }
  delete next._ruleDefaultFields;
  return {item:next,matched,alerts,changed:[...claimed],skipped};
}

// Legacy alerts are moved into the editor actions only when a rule is opened.
// Saved legacy rules and backups remain readable without rewriting history.
export function automaticRuleForEditor(rule){
  const copy=structuredClone(rule);
  if(copy.alert){copy.actions.push({field:'alert',...copy.alert});copy.alert=null;}
  return copy;
}
// Keep category restrictions compatible with existing backups while rejecting
// impossible combinations on the next save, not while loading user data.
export function automaticRuleCategoryConflict(rule){
  const conditions=(rule.conditions||[]).filter(c=>c.field==='category');
  const scope=rule.categoryFilter?.value;
  if(scope!=null){
    const matches=conditions.map(c=>c.operator==='notEquals'?text(scope)!==text(c.value):text(scope)===text(c.value));
    return rule.match==='all'?matches.some(v=>!v):conditions.length===rule.conditions.length&&matches.length>0&&matches.every(v=>!v);
  }
  if(rule.match!=='all')return false;
  const equal=conditions.filter(c=>c.operator==='equals').map(c=>text(c.value));
  return new Set(equal).size>1||(equal.length>0&&conditions.some(c=>c.operator==='notEquals'&&text(c.value)===equal[0]));
}

export function categoryScopeFromConditions(rule){
  if(rule.match!=='all'||rule.trigger==='movement')return null;
  const equal=(rule.conditions||[]).filter(c=>c.field==='category'&&c.operator==='equals');
  if(!equal.length||new Set(equal.map(c=>text(c.value))).size!==1)return null;
  const filter={direction:rule.trigger,value:equal[0].value};
  return automaticRuleCategoryConflict({...rule,categoryFilter:filter})?null:filter;
}
