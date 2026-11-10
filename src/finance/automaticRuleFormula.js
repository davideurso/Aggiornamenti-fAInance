/** Rule logic keyboard: numbered conditions, E/O, and arbitrary balanced nesting.
 * Existing V1 rules remain supported by the original groups/joins evaluator.
 */
const operation=t=>t==='all'||t==='any';
const condition=t=>/^[1-6]$/.test(String(t));
export function parseRuleLogic(tokens,count){
  if(!Number.isInteger(count)||count<1||count>6||!Array.isArray(tokens)||tokens.length>120)throw new Error('INVALID_RULE_FORMULA');
  let i=0;const used=new Set();
  function atom(){
    const t=String(tokens[i]??'');
    if(t==='('){i++;const expression=or();if(tokens[i]!==')')throw new Error('INVALID_RULE_FORMULA');i++;return expression;}
    if(condition(t)){
      const n=Number(t);
      if(n>count)throw new Error('INVALID_RULE_FORMULA');
      used.add(n);i++;return {type:'condition',index:n-1};
    }
    throw new Error('INVALID_RULE_FORMULA');
  }
  function and(){let left=atom();while(tokens[i]==='all'){i++;left={type:'all',left,right:atom()};}return left;}
  function or(){let left=and();while(tokens[i]==='any'){i++;left={type:'any',left,right:and()};}return left;}
  if(!tokens.length)throw new Error('INVALID_RULE_FORMULA');
  const ast=or();
  if(i!==tokens.length||used.size!==count)throw new Error('INVALID_RULE_FORMULA');
  return ast;
}
export function evaluateRuleLogic(ast,values){
  if(ast.type==='condition')return !!values[ast.index];
  if(ast.type==='all')return evaluateRuleLogic(ast.left,values)&&evaluateRuleLogic(ast.right,values);
  if(ast.type==='any')return evaluateRuleLogic(ast.left,values)||evaluateRuleLogic(ast.right,values);
  throw new Error('INVALID_RULE_FORMULA');
}
export function defaultRuleLogic(count){
  const tokens=[];
  for(let n=1;n<=count;n++){if(n>1)tokens.push('all');tokens.push(String(n));}
  return tokens;
}
/** Preserve exact old left-to-right and nested-group semantics while editing. */
export function legacyRuleLogicTokens(rule){
  const cs=rule?.conditions||[];
  if(!cs.length)return [];
  const groups=rule.conditionGroups||[];
  const frames=[{terms:[],end:Infinity,externalJoin:'all'}];
  const collapse=terms=>terms.slice(1).reduce((left,term)=>({type:term.join,left,right:term.node}),terms[0].node);
  for(let i=0;i<cs.length;i++){
    const join=cs[i].join||rule.match||'all';
    for(const g of groups.filter(g=>g.start===i).sort((a,b)=>b.end-a.end))frames.push({terms:[],end:g.end,externalJoin:join});
    frames[frames.length-1].terms.push({node:{type:'condition',index:i},join});
    while(frames.length>1&&frames[frames.length-1].end===i){
      const frame=frames.pop();
      frames[frames.length-1].terms.push({node:collapse(frame.terms),join:frame.externalJoin});
    }
  }
  function emit(node){if(node.type==='condition')return [String(node.index+1)];return ['(',...emit(node.left),node.type,...emit(node.right),')'];}
  return emit(collapse(frames[0].terms));
}
export function formatRuleLogic(tokens,conditionLabels,andLabel='E',orLabel='O'){
  return tokens.map(t=>t==='all'?andLabel:t==='any'?orLabel:/^[1-6]$/.test(String(t))?conditionLabels[Number(t)-1]||String(t):t).join(' ').replace(/\( /g,'(').replace(/ \)/g,')');
}
export function suggestedNextLogicTokens(tokens,count){
  // Useful for the keypad: invalid intermediate states are allowed while typing,
  // and duplicate condition references are allowed, with every defined condition used at least once.
  const used=new Set(tokens.filter(condition));
  let depth=0;
  for(const t of tokens)depth+=t==='('?1:t===')'?-1:0;
  const last=tokens.at(-1);
  const expectingAtom=!tokens.length||last==='('||operation(last);
  return {
    expectingAtom,
    canOpen:expectingAtom&&depth<10&&tokens.length<110,
    canClose:!expectingAtom&&depth>0,
    canJoin:!expectingAtom&&tokens.length<118,
    canCondition:n=>expectingAtom&&Number.isInteger(n)&&n>=1&&n<=count&&tokens.length<118,
    complete:!expectingAtom&&depth===0&&used.size===count
  };
}

/** Remove only redundant parentheses enclosing the whole formula.
 * The original AST, its precedence and all necessary nested groups are preserved.
 */
export function stripRedundantOuterParentheses(tokens){
  if(!Array.isArray(tokens))return tokens;
  let out=tokens.slice();
  while(out.length>=3&&out[0]==='('&&out[out.length-1]===')'){
    let depth=0, enclosesAll=true;
    for(let i=0;i<out.length;i++){
      if(out[i]==='(')depth++;
      else if(out[i]===')')depth--;
      if(depth<0||(depth===0&&i<out.length-1)){enclosesAll=false;break;}
    }
    if(!enclosesAll||depth!==0)break;
    out=out.slice(1,-1);
  }
  return out;
}
