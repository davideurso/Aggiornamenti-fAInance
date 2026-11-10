/** Normalize only explicit structured AI rule proposals; never execute an action or infer financial data. */
import {parseRuleLogic,legacyRuleLogicTokens} from './automaticRuleFormula.js';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const logical=t=>{
  const raw=String(t??'').trim();
  if(raw==='('||raw===')'||/^[1-6]$/.test(raw))return raw;
  const folded=raw.toLocaleLowerCase('en-US');
  if(['all','and','e','et','und','y','&&','&','şi','și','και'].includes(folded))return 'all';
  if(['any','or','o','ou','oder','of','lub','sau','ή','||','|'].includes(folded))return 'any';
  fail('AI_INVALID_FORMULA_TOKEN');
};
function tokensFrom(value){
  if(Array.isArray(value)){
    return value.flatMap(t=>{
      const s=String(t??'').trim();
      if(!s)fail('AI_INVALID_FORMULA_TOKEN');
      return s.replace(/[（]/g,'(').replace(/[）]/g,')').replace(/([()])/g,' $1 ').split(/\s+/).filter(Boolean).map(logical);
    });
  }
  if(typeof value==='string'){
    let s=value.trim();
    if(!s)fail('AI_MISSING_FORMULA');
    if(s.startsWith('[')){try{return tokensFrom(JSON.parse(s));}catch(e){if(e.code)throw e;fail('AI_INVALID_FORMULA_TOKEN');}}
    s=s.replace(/[（]/g,'(').replace(/[）]/g,')')
      .replace(/([()])/g,' $1 ');
    return s.split(/\s+/).filter(Boolean).map(logical);
  }
  fail('AI_INVALID_FORMULA_TOKEN');
}
const normalizedMatch=v=>{
  const raw=String(v||'').trim().toLowerCase();
  if(['all','and','e','tutte','tutti'].includes(raw))return 'all';
  if(['any','or','o','almeno una'].includes(raw))return 'any';
  return null;
};
const hasAlternative=txt=>/\b(oppure|altrimenti|o|or|either|otherwise|ou|oder|sino|o bien)\b/i.test(String(txt));

export function normalizeDirectRuleProposal(input,request=''){
  if(!input||input.action!=='create_automatic_rule')fail('AI_INVALID_ACTION');
  const conditions=input.ruleConditions;
  if(!Array.isArray(conditions)||!conditions.length)fail('missingConditions');
  if(conditions.length>6)fail('RULE_CONDITION_LIMIT');
  const result={...input,ruleConditions:conditions.map((c,i)=>{
    if(!c||typeof c!=='object')fail('missingConditions');
    const mapped=normalizedMatch(c.join);
    return mapped?{...c,join:mapped}:c;
  })};
  let tokens;
  if(result.ruleLogicTokens!==undefined&&result.ruleLogicTokens!==null&&result.ruleLogicTokens!==''){
    tokens=tokensFrom(result.ruleLogicTokens);
  }else {
    // Legacy response is safe only if its E/O operators make the user's alternatives explicit.
    const match=normalizedMatch(result.ruleMatch);
    const joins=result.ruleConditions.map(c=>normalizedMatch(c.join)).filter(Boolean);
    if(!match&&!joins.length&&conditions.length>1)fail('AI_MISSING_FORMULA');
    const groupRule={conditions:result.ruleConditions,match:match||'all',conditionGroups:result.ruleConditionGroups||[]};
    tokens=legacyRuleLogicTokens(groupRule);
  }
  parseRuleLogic(tokens,conditions.length);
  if(hasAlternative(request)&&conditions.length>1&&!tokens.includes('any'))fail('AI_MISSING_ALTERNATIVE');
  result.ruleLogicTokens=tokens;
  result.ruleMatch='all'; // actual evaluation is dictated by explicit tokens
  return result;
}

export function proposalsFromAiResponse(data,request=''){
  let actions=Array.isArray(data?.actions)?data.actions:null;
  if(!actions&&Array.isArray(data?.result?.actions))actions=data.result.actions;
  if(!actions&&data?.action==='create_automatic_rule')actions=[data];
  if(!actions){
    // Accept JSON-structured replies only; never attempt to interpret arbitrary explanatory prose.
    const answer=String(data?.answer||'').trim().replace(/^```(?:json)?\s*|\s*```$/g,'');
    if(answer&&answer.length<15000){
      try{
        const parsed=JSON.parse(answer);
        if(Array.isArray(parsed))actions=parsed;
        else if(Array.isArray(parsed?.actions))actions=parsed.actions;
        else if(parsed?.action==='create_automatic_rule')actions=[parsed];
      }catch{}
    }
  }
  if(!Array.isArray(actions)||!actions.length)fail('AI_NO_STRUCTURED_ACTION');
  if(actions.length>6||actions.some(a=>a?.action!=='create_automatic_rule'))fail('AI_INVALID_ACTION');
  return actions.map(a=>normalizeDirectRuleProposal(a,request));
}
