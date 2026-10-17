import {parseRuleLogic,evaluateRuleLogic} from "./automaticRuleFormula.js";
// The maximum applies to new/saved rules. Previously stored rules are validated
// with their historical limit during read/migration; they are never truncated.
export const MAX_RULE_CONDITIONS=6;
export const ruleFields=['description','category','payment','amount','direction','transactionType','source'];
export const actionFields=['category','payment','description','tags','note','alert'];
export const operatorsFor=field=>field==='amount'?['equals','notEquals','greater','greaterOrEqual','less','lessOrEqual','between']:field==='description'?['contains','equals','starts','notContains']:['equals','notEquals'];
export const ruleLimit=plan=>plan==='premium'?Infinity:plan==='base'?2:1;
const text=v=>String(v??'').normalize('NFKC').trim().toLocaleLowerCase();
const range=v=>String(v??'').split('|').map(s=>s.trim());
export function validateAutomaticRule(rule,options={}){
  if(rule.kind!=='automatic-v1')return;
  if(typeof rule.name!=='string'||!rule.name.trim()||rule.name.length>120||typeof rule.enabled!=='boolean'||!Number.isSafeInteger(rule.priority)||rule.priority<0||!Number.isSafeInteger(rule.revision)||rule.revision<0||!['expense','income','movement'].includes(rule.trigger)||!['all','any'].includes(rule.match))throw new Error('INVALID_AUTOMATIC_RULE');
  const max=options.allowLegacyConditions?20:MAX_RULE_CONDITIONS;
  if(!Array.isArray(rule.conditions)||!rule.conditions.length||rule.conditions.length>max)throw new Error(rule.conditions?.length>MAX_RULE_CONDITIONS?'RULE_CONDITION_LIMIT':'INVALID_AUTOMATIC_RULE');
  if(!Array.isArray(rule.actions)||rule.actions.length>10||(!rule.actions.length&&!rule.alert))throw new Error('INVALID_AUTOMATIC_RULE');
  if(rule.applyOnEdit!==undefined&&typeof rule.applyOnEdit!=='boolean')throw new Error('INVALID_AUTOMATIC_RULE');
  if(rule.logicTokens!==undefined)parseRuleLogic(rule.logicTokens,rule.conditions.length);
  // Nested and disjoint parentheses are supported; crossed groups are not.
  // E.g. (A OR B) AND (C OR (D AND E)) is valid, (A OR (B AND C) OR D) too.
  if(rule.conditionGroups!==undefined){
    if(!Array.isArray(rule.conditionGroups)||rule.conditionGroups.length>MAX_RULE_CONDITIONS-1)throw new Error('INVALID_RULE_GROUP');
    const seen=new Set();
    for(const g of rule.conditionGroups){
      if(!g||!Number.isInteger(g.start)||!Number.isInteger(g.end)||g.start<0||g.end>=rule.conditions.length||g.end<=g.start)throw new Error('INVALID_RULE_GROUP');
      const key=g.start+':'+g.end;
      if(seen.has(key))throw new Error('INVALID_RULE_GROUP');
      seen.add(key);
    }
    for(let i=0;i<rule.conditionGroups.length;i++)for(let j=i+1;j<rule.conditionGroups.length;j++){
      const a=rule.conditionGroups[i],b=rule.conditionGroups[j];
      if((a.start<b.start&&b.start<=a.end&&a.end<b.end)||(b.start<a.start&&a.start<=b.end&&b.end<a.end))throw new Error('INVALID_RULE_GROUP');
    }
  }
  for(let i=0;i<rule.conditions.length;i++){
    const c=rule.conditions[i];
    if(!ruleFields.includes(c.field)||!operatorsFor(c.field).includes(c.operator)||!['string','number'].includes(typeof c.value)||!String(c.value).trim()||String(c.value).length>500)throw new Error('INVALID_RULE_CONDITION');
    if(i>0&&c.join!==undefined&&!['all','any'].includes(c.join))throw new Error('INVALID_RULE_CONDITION');
    if(c.field==='amount'){
      if(c.operator==='between'){
        const values=range(c.value);
        if(values.length!==2||values.some(s=>!s||!Number.isFinite(Number(s))||Number(s)<0)||Number(values[0])>Number(values[1]))throw new Error('INVALID_RULE_CONDITION');
      }else if(!Number.isFinite(Number(c.value))||Number(c.value)<0)throw new Error('INVALID_RULE_CONDITION');
    }
  }
  if(rule.categoryFilter!=null&&(!['expense','income'].includes(rule.categoryFilter.direction)||!['string','number'].includes(typeof rule.categoryFilter.value)||!String(rule.categoryFilter.value).trim()||(rule.trigger!=='movement'&&rule.trigger!==rule.categoryFilter.direction)))throw new Error('INVALID_RULE_CATEGORY');
  if(new Set(rule.actions.map(a=>a.field)).size!==rule.actions.length)throw new Error('DUPLICATE_RULE_ACTION');
  for(const a of rule.actions)if(a.field!=='alert'&&(!actionFields.includes(a.field)||!['string','number'].includes(typeof a.value)||!String(a.value).trim()||String(a.value).length>500))throw new Error('INVALID_RULE_ACTION');
  const alerts=[...rule.actions.filter(a=>a.field==='alert'),...(rule.alert?[rule.alert]:[])];
  if(alerts.length>1)throw new Error('DUPLICATE_RULE_ALERT');
  for(const alert of alerts)if(!['information','confirmation'].includes(alert.kind)||typeof alert.text!=='string'||!alert.text.trim()||alert.text.length>1000)throw new Error('INVALID_RULE_ALERT');
}
function testCondition(c,original){
  const a=original[c.field],b=c.value;
  if(c.field==='amount'){
    const amount=Number(a),value=Number(b);
    if(!Number.isFinite(amount))return false;
    switch(c.operator){
      case 'greater':return amount>value;
      case 'greaterOrEqual':return amount>=value;
      case 'less':return amount<value;
      case 'lessOrEqual':return amount<=value;
      case 'between':{const [min,max]=range(b).map(Number);return amount>=min&&amount<=max;}
      case 'notEquals':return amount!==value;
      default:return amount===value;
    }
  }
  const left=text(a),right=text(b);
  switch(c.operator){case 'contains':return left.includes(right);case 'notContains':return !left.includes(right);case 'starts':return left.startsWith(right);case 'notEquals':return left!==right;default:return left===right;}
}
// Mixed joins use the visual order, left to right. Old rules lacking join
// properties retain their ALL/ANY semantics exactly.
export function ruleConditionsMatch(rule,original){
  const conditions=rule.conditions||[];
  if(!conditions.length)return false;
  if(rule.logicTokens!==undefined){
    const ast=parseRuleLogic(rule.logicTokens,conditions.length);
    return evaluateRuleLogic(ast,conditions.map(c=>testCondition(c,original)));
  }
  const groups=rule.conditionGroups||[];
  const frames=[{terms:[],externalJoin:'all',end:Infinity}];
  function collapse(frame){
    if(!frame.terms.length)return false;
    return frame.terms.slice(1).reduce((acc,term)=>term.join==='any'?acc||term.value:acc&&term.value,frame.terms[0].value);
  }
  for(let i=0;i<conditions.length;i++){
    const item=conditions[i];
    // Open outer parentheses before inner parentheses with the same start.
    for(const g of groups.filter(g=>g.start===i).sort((a,b)=>b.end-a.end)){
      frames.push({terms:[],externalJoin:item.join||rule.match,end:g.end});
    }
    frames[frames.length-1].terms.push({value:testCondition(item,original),join:item.join||rule.match});
    // Close inner parentheses before outer parentheses with the same end.
    while(frames.length>1&&frames[frames.length-1].end===i){
      const group=frames.pop();
      frames[frames.length-1].terms.push({value:collapse(group),join:group.externalJoin});
    }
  }
  return collapse(frames[0]);
}
export function evaluateAutomaticRules(rules,item,direction,source='manual',options={}){
  const original={description:item.desc||'',category:direction==='income'?item.type:item.catId,payment:item.methodId??item.method,amount:Number(item.amount),direction,transactionType:item.rateizzato?'installment':item.receipt?'receipt':'single',source};
  const next={...item},claimed=new Set(),matched=[],alerts=[],skipped=[],conflicts=[];
  const owner=new Map();
  const defaults=new Set(Array.isArray(item._ruleDefaultFields)?item._ruleDefaultFields:[]);
  const eligible=rules.filter(r=>r.kind==='automatic-v1').slice().sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id)).slice(0,ruleLimit(options.plan||'free'));
  for(const rule of eligible){
    validateAutomaticRule(rule,{allowLegacyConditions:true});
    if(!rule.enabled||(rule.trigger!=='movement'&&rule.trigger!==direction))continue;
    if(options.event==='edit'&&rule.applyOnEdit!==true)continue;
    if(rule.categoryFilter&&(rule.categoryFilter.direction!==direction||String(rule.categoryFilter.value)!==String(original.category)))continue;
    if(!ruleConditionsMatch(rule,original))continue;
    matched.push(rule.id);
    for(const action of rule.actions){
      if(action.field==='alert'){alerts.push({kind:action.kind,text:action.text,ruleId:rule.id,name:rule.name});continue;}
      const field=action.field==='category'?(direction==='income'?'type':'catId'):action.field==='payment'?'methodId':action.field==='description'?'desc':action.field;
      if(direction==='income'&&field==='methodId')continue;
      const explicit=field==='methodId'?(item.methodId??item.method):item[field];
      if(claimed.has(field)){
        const first=owner.get(field);
        if(String(first.value)!==String(action.value))conflicts.push({field,firstRule:first.name,secondRule:rule.name,firstValue:first.value,secondValue:action.value});
        skipped.push({field,reason:'priority'});continue;
      }
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
      owner.set(field,{name:rule.name,value:action.value});
    }
    if(rule.alert)alerts.push({...rule.alert,ruleId:rule.id,name:rule.name});
  }
  delete next._ruleDefaultFields;
  return {item:next,matched,alerts,changed:[...claimed],skipped,conflicts};
}

export function automaticRuleForEditor(rule){
  const copy=structuredClone(rule);
  if(copy.alert){copy.actions.push({field:'alert',...copy.alert});copy.alert=null;}
  return copy;
}
export function automaticRuleCategoryConflict(rule){
  const conditions=(rule.conditions||[]).filter(c=>c.field==='category');
  const scope=rule.categoryFilter?.value;
  // When E/OR operators are mixed, do not declare a conflict unless it
  // can actually be demonstrated by the evaluation engine.
  if(rule.logicTokens!==undefined||rule.conditionGroups?.length||rule.conditions?.some((c,i)=>i>0&&c.join&&c.join!==rule.match))return false;
  if(scope!=null){
    const matches=conditions.map(c=>c.operator==='notEquals'?text(scope)!==text(c.value):text(scope)===text(c.value));
    return rule.match==='all'?matches.some(v=>!v):conditions.length===rule.conditions.length&&matches.length>0&&matches.every(v=>!v);
  }
  if(rule.match!=='all')return false;
  const equal=conditions.filter(c=>c.operator==='equals').map(c=>text(c.value));
  return new Set(equal).size>1||(equal.length>0&&conditions.some(c=>c.operator==='notEquals'&&text(c.value)===equal[0]));
}
export function categoryScopeFromConditions(rule){
  if(rule.match!=='all'||rule.trigger==='movement'||rule.logicTokens!==undefined||rule.conditionGroups?.length||rule.conditions?.some((c,i)=>i>0&&c.join&&c.join!=='all'))return null;
  const equal=(rule.conditions||[]).filter(c=>c.field==='category'&&c.operator==='equals');
  if(!equal.length||new Set(equal.map(c=>text(c.value))).size!==1)return null;
  const filter={direction:rule.trigger,value:equal[0].value};
  return automaticRuleCategoryConflict({...rule,categoryFilter:filter})?null:filter;
}
