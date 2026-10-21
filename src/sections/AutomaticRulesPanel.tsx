import {assistantRuleError,combineBuilderRuleProposals,previewRuleRequest} from "../finance/assistantAutomaticRules";
import {AI_AGENT_ENDPOINT,fbAuth} from '../core';
import {proposalsFromAiResponse} from '../finance/directRuleProposal';
import {buildAssistantRequestPayload} from '../assistantLogic';
import {directRuleAiText} from '../i18n/directRuleAiTranslations';
import { readableDarkText } from '../ui/textContrast';
import {useEffect,useRef,useState} from 'react';
import {useApp} from '../core';
import {rulesText,rulesExtraText,rulesUiText,ruleEnhancementText} from '../i18n/automaticRulesTranslations';
import {ruleDiagnosticText} from '../i18n/ruleDiagnosticsTranslations';
import {ruleEditorText} from '../i18n/ruleEditorTranslations';
import {ruleBuilderText} from '../i18n/ruleBuilderTranslations';
import {ruleFormulaText} from '../i18n/ruleFormulaTranslations';
import {parseRuleLogic,legacyRuleLogicTokens,suggestedNextLogicTokens,formatRuleLogic,stripRedundantOuterParentheses} from '../finance/automaticRuleFormula';
import {translateFainanceText} from '../traduzioni';
import {ruleFields,operatorsFor,ruleLimit,MAX_RULE_CONDITIONS,evaluateAutomaticRules,validateAutomaticRule,automaticRuleForEditor,automaticRuleCategoryConflict,categoryScopeFromConditions} from '../finance/automaticRules';
import {saveAutomaticRule,deleteAutomaticRule,reorderAutomaticRules} from '../finance/automaticRuleStore';
import './automaticRules.css';

const editableActions=['category','payment','description','tags','note','alert'];
export function AutomaticRulesPanel(){
  const ctx:any=useApp();
  const [draft,setDraft]=useState<any>(null),[error,setError]=useState(false),[test,setTest]=useState<any>(null),[result,setResult]=useState<any>(null),[editorTab,setEditorTab]=useState<'when'|'if'|'then'>('when'),[probeOnly,setProbeOnly]=useState(false);
  const drag=useRef<any>(null);
  const editorScrollRef=useRef<any>(null);
  const [saveErrorCode,setSaveErrorCode]=useState('');
  const [historyTest,setHistoryTest]=useState<any>(null);
  const [limitWarning,setLimitWarning]=useState(false);
  const [logicStep,setLogicStep]=useState<'conditions'|'formula'>('conditions');
  const [logicChanged,setLogicChanged]=useState(false);
  const [aiPromptOpen,setAiPromptOpen]=useState(false);
  const [aiPrompt,setAiPrompt]=useState('');
  const [aiReview,setAiReview]=useState(false);
  const [aiBusy,setAiBusy]=useState(false);
  const [aiError,setAiError]=useState('');
  const aiAbortRef=useRef<AbortController|null>(null);
  useEffect(()=>()=>{aiAbortRef.current?.abort();},[]);
  useEffect(()=>{if(draft&&editorScrollRef.current)editorScrollRef.current.scrollTop=0;},[editorTab,logicStep,Boolean(draft)]);
  const T=(key:any)=>key==='recurring'?translateFainanceText('Ricorrente',ctx.lang||'it'):rulesText(ctx.lang||'it',key);
  const D=(key:any)=>ruleDiagnosticText(ctx.lang||'it',key);
  const E=(key:any)=>ruleEditorText(ctx.lang||'it',key);
  const R=(key:string)=>ruleEnhancementText(ctx.lang||'it',key);
  const B=(key:string)=>ruleBuilderText(ctx.lang||'it',key);
  const A=(key:string)=>directRuleAiText(ctx.lang||'it',key);
  const F=(key:string)=>ruleFormulaText(ctx.lang||'it',key);
  const L=(s:string)=>rulesExtraText(ctx.lang||'it',s)??translateFainanceText(s,ctx.lang||'it');
  const U=(key:'createRule'|'ruleSingular'|'whenSubtitle'|'ifSubtitle'|'thenSubtitle'|'messagePlaceholder'|'testRule')=>rulesUiText(ctx.lang||'it',key);
  const directionOptions=[{id:'expense',label:T('expense')},{id:'income',label:T('income')}];
  const rules=ctx.financeEvolution.rules.filter(r=>r.kind==='automatic-v1').slice().sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
  const limit=ruleLimit(ctx.currentPlan);
  const theme:any={'--rule-text':ctx.textC,'--rule-sub':ctx.subC||(ctx.dark?'#b8bdc8':'#69727c'),'--rule-card':ctx.cardBg,'--rule-border':ctx.borderC,'--rule-primary':ctx.confirmButtonColor||'#378ADD','--rule-link':readableDarkText(ctx.confirmButtonColor||'#378ADD',ctx.dark),'--rule-on-primary':readableDarkText('#fff',ctx.dark,ctx.confirmButtonColor||'#378ADD'),'--rule-on-expense':readableDarkText('#fff',ctx.dark,ctx.expenseColor||'#E35B5B'),'--rule-on-income':readableDarkText('#fff',ctx.dark,ctx.incomeColor||'#2FA66A'),'--rule-soft':ctx.dark?'#263444':'#edf5fc','--rule-input':ctx.inp?.background||ctx.cardBg,'--rule-radius':`${ctx.btnRadius??12}px`,'--rule-expense':ctx.expenseColor||'#E35B5B','--rule-income':ctx.incomeColor||'#2FA66A'};
  function conditionLimitNotice(){setLimitWarning(true);ctx.setToast({text:R('conditionLimit'),type:'warning',duration:5000});}
  function limitNotice(){ctx.setToast({text:T('limit'),type:'warning',color:'#FFF8E1',textColor:'#856404',icon:'🔒',actionLabel:L('Piani'),actionPage:'plans_settings',duration:7000});}
  function apply(fn){try{ctx.setFinanceEvolution(fn);setError(false);setSaveErrorCode('');return true;}catch(e){setSaveErrorCode(String(e.message||''));if(e.message==='RULE_LIMIT')limitNotice();if(e.message==='RULE_CONDITION_LIMIT')conditionLimitNotice();setError(true);return false;}}
  function open(rule?,duplicate=false,probe=false){
    if((!rule||duplicate)&&rules.length>=limit){limitNotice();return;}
    setAiReview(false);setAiError('');setSaveErrorCode('');setLimitWarning(false);setLogicStep('conditions');setLogicChanged(false);setEditorTab(probe?'then':'when');
    setProbeOnly(!!probe);
    setDraft(rule?{...automaticRuleForEditor(rule),logicTokens:stripRedundantOuterParentheses(rule.logicTokens||legacyRuleLogicTokens(rule)),id:duplicate?crypto.randomUUID():rule.id,expectedRevision:duplicate?undefined:rule.revision}:{id:crypto.randomUUID(),kind:'automatic-v1',name:'',enabled:true,revision:0,priority:rules.length,trigger:'expense',categoryFilter:null,match:'all',logicTokens:['1'],conditions:[{field:'description',operator:'contains',value:''}],actions:[{field:'category',value:''}],alert:null});
    setHistoryTest(null);
    setTest(probe?{desc:'',amount:'',direction:rule.categoryFilter?.direction||(rule.trigger==='income'?'income':'expense'),source:'manual',transactionType:'single',category:rule.categoryFilter?.value||'',payment:'',defaults:true}:null);setResult(null);setError(false);
  }
  function order(id,target){if(id===target)return;const ids=rules.map(r=>r.id),from=ids.indexOf(id),to=ids.indexOf(target);if(from<0||to<0)return;ids.splice(from,1);ids.splice(to,0,id);apply(p=>reorderAutomaticRules(p,ids,JSON.stringify(ctx.financeEvolution.rules)));}
  function choices(field,direction=draft?.trigger){
    if(field==='category')return (direction==='income'?ctx.incomeTypes:ctx.cats)||[];
    if(field==='payment')return ctx.methods||[];
    const values=field==='direction'?['expense','income']:field==='transactionType'?['single','installment','receipt']:field==='source'?['manual','bulk','receipt','voice','assistant','tool','recurring']:null;
    return values?.map(id=>({id,name:T(id)}));
  }
  function repairRule(r){const categoryFilter=categoryScopeFromConditions(r);if(!categoryFilter)return;if(draft){setDraft({...draft,categoryFilter});setResult(null);setError(false);}else apply(p=>saveAutomaticRule(p,{...r,categoryFilter,expectedRevision:r.revision},ctx.currentPlan));}
  function conflictNotice(r){return automaticRuleCategoryConflict(r)?<div role="alert" className="rule-conflict"><strong>⚠️ {D('conflict')}</strong>{categoryScopeFromConditions(r)&&<button type="button" onClick={()=>repairRule(r)}>{D('fix')} · {choices('category',r.trigger)?.find(c=>String(c.id)===String(categoryScopeFromConditions(r)?.value))?.name}</button>}</div>:null;}
  const categoryLabel=(direction)=>E(direction==='income'?'incomeCategory':'expenseCategory');
  function valueInput(field,value,onChange,direction?,operator?){
    if(field==='amount'&&operator==='between'){const [min='',max='']=String(value??'').split('|');return <div className="rule-range-input"><label>{R('from')}<input type="number" min="0" step="0.01" inputMode="decimal" value={min} onChange={e=>onChange(e.target.value+'|'+max)}/></label><label>{R('to')}<input type="number" min="0" step="0.01" inputMode="decimal" value={max} onChange={e=>onChange(min+'|'+e.target.value)}/></label></div>;}
    const items=choices(field,direction);
    if(items)return <select aria-label={T(field)} value={String(value??'')} onChange={e=>onChange(e.target.value)}><option value="">—</option>{items.map(c=><option key={c.id} value={c.id} data-fainance-icon-ref={(c as any).icon || "\u{1F4C1}"}>{c.icon?c.icon+' ':''}{c.name}</option>)}</select>;
    if(field==='tags')return <input aria-label={R('tags')} type="text" placeholder={R('tags')} maxLength={500} value={value??''} onChange={e=>onChange(e.target.value)}/>;
    if(field==='note')return <input aria-label={R('note')} type="text" placeholder={R('note')} maxLength={500} value={value??''} onChange={e=>onChange(e.target.value)}/>;
    if(field==='amount')return <input aria-label={T(field)} type="number" min={0} step="0.01" inputMode="decimal" placeholder="1000 €" maxLength={500} value={value??''} onChange={e=>onChange(e.target.value)}/>;
    if(field==='description')return <input aria-label={T(field)} type="text" placeholder={T('description')} maxLength={500} value={value??''} onChange={e=>onChange(e.target.value)}/>;
    return <input aria-label={T(field)} type="text" maxLength={500} value={value??''} onChange={e=>onChange(e.target.value)}/>;
  }
  const conditionExpression=(rule:any)=>{
    const conditions=rule.conditions||[];
    if(!conditions.length)return '';
    const labels=conditions.map((c:any)=>describe(c,rule.categoryFilter?.direction||rule.trigger));
    const tokens=stripRedundantOuterParentheses(rule.logicTokens||legacyRuleLogicTokens(rule));
    return formatRuleLogic(tokens,labels,R('and'),R('or'));
  };
  const effectiveLogicTokens=draft?stripRedundantOuterParentheses(draft.logicTokens||legacyRuleLogicTokens(draft)):[];
  let logicValid=false;
  if(draft){try{parseRuleLogic(effectiveLogicTokens,draft.conditions.length);logicValid=true;}catch{logicValid=false;}}
  const nextLogic=draft?suggestedNextLogicTokens(effectiveLogicTokens,draft.conditions.length):null;
  const appendLogic=(token:string)=>{setDraft({...draft,logicTokens:[...effectiveLogicTokens,token]});setResult(null);setError(false);};
  const updateLogic=(tokens:string[])=>{setDraft({...draft,logicTokens:tokens});setResult(null);setError(false);};
  const changeConditions=(conditions:any[])=>{
    setDraft({...draft,conditions,logicTokens:conditions.length===1?['1']:[],conditionGroups:[]});
    setLogicChanged(true);setLogicStep('conditions');setLimitWarning(false);setResult(null);
  };
  const ruleExplanation=(rule:any)=>`${T('when')}: ${scopeText(rule)}. ${T('if')}: ${conditionExpression(rule)}. ${T('then')}: ${automaticRuleForEditor(rule).actions.map((a:any)=>`${actionName(a)}: ${a.field==='alert'?a.text:choices(a.field,rule.categoryFilter?.direction||rule.trigger)?.find((v:any)=>String(v.id)===String(a.value))?.name||a.value}`).join('; ')}.`;
  const describe=(c,direction)=>`${T(c.field)} ${T(c.operator)||R(c.operator)} ${c.operator==='between'?String(c.value).split('|').join(' – '):choices(c.field,direction)?.find(v=>String(v.id)===String(c.value))?.name||c.value}`;
  const scopeText=r=>`${T(r.trigger)} · ${r.categoryFilter?choices('category',r.categoryFilter.direction)?.find(c=>String(c.id)===String(r.categoryFilter.value))?.name||r.categoryFilter.value:E('allCategories')}`;
  const patchCondition=(i,patch)=>{setDraft({...draft,conditions:draft.conditions.map((c,j)=>i===j?{...c,...patch}:c)});setResult(null);};
  const removeCondition=(i:number)=>{
    if(draft.conditions.length<=1)return;
    changeConditions(draft.conditions.filter((_:any,j:number)=>j!==i));
  };
  // Direct AI assistant: only a structured draft is accepted. No chat navigation, no writes.
  async function generateRuleFromPrompt(){
    const request=aiPrompt.trim();
    if(aiBusy||request.length<8)return;
    if(!ctx.aiExternalConsent){setAiError(A('consent'));return;}
    if(rules.length>=limit&&!draft){limitNotice();return;}
    if(ctx.canUsePlanFeature&&!ctx.canUsePlanFeature('aiReply',1)){
      setAiError(ctx.upgradeMessage?.('aiReply')||A('quota'));return;
    }
    const generation=async()=>{
      const controller=new AbortController();aiAbortRef.current=controller;
      const timer=setTimeout(()=>controller.abort(),65000);
      setAiBusy(true);setAiError('');
      try{
        const categories=(ctx.cats||[]).filter((v:any)=>!v.archived).map((v:any)=>({id:String(v.id),name:v.name,groupId:String(v.group||'')}));
        const methods=(ctx.methods||[]).filter((v:any)=>!v.archived).map((v:any)=>({id:String(v.id),name:v.name,groupId:String(v.group||'')}));
        const incomeTypes=(ctx.incomeTypes||[]).filter((v:any)=>!v.archived).map((v:any)=>({id:String(v.id),name:v.name}));
        // Only catalog labels and existing rule names are sent, not financial movements or profile data.
        const financeContext={
          app:'fAInance',agentCapabilitiesVersion:4,language:ctx.lang||'it',plan:ctx.currentPlan||'free',
          dataAccessLevel:'summary',dataAccessPolicy:{level:'summary'},
          automaticRules:rules.map((v:any)=>({name:v.name,trigger:v.trigger,enabled:v.enabled})),
          catalogs:{categories,methods,incomeTypes},
          defaults:{date:new Date().toISOString().slice(0,10)},
          operationDraft:null
        };
        const instruction=[
          'RULE-EDITOR DIRECT STRUCTURED DRAFT ONLY. Do not create or modify any real rule.',
          'Return exactly one create_automatic_rule structured action in the actions array.',
          'For alternative branches that share the same result, use one ruleConditions array and ruleLogicTokens',
          'with numbered references, all (=AND), any (=OR), and balanced nested parentheses.',
          'At most six distinct conditions; condition numbers can repeat in ruleLogicTokens.',
          'Always provide ruleName, ruleTrigger, ruleConditions, ruleLogicTokens and ruleActions.',
          'Use only existing category and payment method names from financeContext.catalogs.',
          'Do not invent fields. If any essential detail is ambiguous, ask a clarification',
          'and return zero actions. The user reviews QUANDO, SE, ALLORA and saves in the editor.',
          'No extra confirmation in chat. No saving, applying or executing actions.'
        ].join(' ');
        const payloadObject:any=buildAssistantRequestPayload({
          question:request,forcedLanguage:ctx.lang||'it',fallbackLanguage:ctx.lang||'it',
          interfaceLanguage:ctx.lang||'it',aiDataAccess:'summary',financeContext,chatHistory:[]
        });
        const payload={...payloadObject.payload,instruction:String(payloadObject.payload?.instruction||'')+' '+instruction};
        let token='';
        if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();
        if(!token)throw new Error('AUTH_REQUIRED');
        async function callApi(currentToken:string){
          return fetch(AI_AGENT_ENDPOINT,{
            method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+currentToken},
            signal:controller.signal,body:JSON.stringify(payload)
          });
        }
        let response=await callApi(token);
        // Match the existing assistant's 401 token-refresh behavior.
        if(response.status===401&&fbAuth.currentUser){
          const renewed=await fbAuth.currentUser.getIdToken(true);
          if(renewed)response=await callApi(renewed);
        }
        let data:any={};try{data=await response.json();}catch{}
        if(!response.ok){
          const reason=response.status===429?'AI_QUOTA':`AI_HTTP_${response.status}`;
          throw new Error(reason);
        }
        // The service sometimes returns a JSON action encoded as answer, or E/O operators
        // as AND/OR instead of all/any. Parse only explicit structured values.
        const proposals=proposalsFromAiResponse(data,request);
        let merged:any;
        try{merged=combineBuilderRuleProposals(proposals);}catch(e:any){throw e;}
        const preview=previewRuleRequest(ctx.financeEvolution,{...ctx,currentPlan:ctx.currentPlan},merged);
        if(!preview?._preparedRule)throw new Error('INVALID_RULE');
        if(controller.signal.aborted)return;
        const proposed=automaticRuleForEditor(preview._preparedRule);
        // This is a replacement of the on-screen draft only, never a persistence operation.
        setDraft({...proposed,expectedRevision:undefined,logicTokens:stripRedundantOuterParentheses(proposed.logicTokens||legacyRuleLogicTokens(proposed))});
        setAiReview(true);setProbeOnly(false);setEditorTab('when');setLogicStep('conditions');
        setLogicChanged(false);setSaveErrorCode('');setError(false);setResult(null);
        setHistoryTest(null);setTest(null);setLimitWarning(false);setAiPromptOpen(false);
        if(ctx.consumePlanFeature)ctx.consumePlanFeature('aiReply',1);
      }catch(e:any){
        if(controller.signal.aborted){setAiError(A('timeout'));return;}
        const code=String(e?.code||e?.message||'');
        const knownRuleCodes=['missingName','missingTrigger','missingConditions','missingActions','invalidCatalog','INVALID_RULE_BUILDER_ACTIONS','duplicateName','RULE_LIMIT'];
        const detail=code==='AUTH_REQUIRED'?A('auth'):code==='AI_QUOTA'?A('quota'):
          code==='RULE_CONDITION_LIMIT'?R('conditionLimit'):
          code==='INVALID_RULE_FORMULA'||code==='AI_INVALID_FORMULA_TOKEN'||code==='AI_MISSING_FORMULA'||code==='AI_MISSING_ALTERNATIVE'?A('invalidFormula'):
          code==='AI_NO_STRUCTURED_ACTION'?A('noStructured'):
          code==='AI_INVALID_ACTION'?A('invalidAction'):
          code==='RULE_CATEGORY_CONFLICT'?A('categoryConflict'):
          knownRuleCodes.includes(code)?assistantRuleError(ctx.lang||'it',code):
          /^AI_HTTP_\d{3}$/.test(code)?`${A('serviceError')} (${code.replace('AI_HTTP_','HTTP ')})`:
          `${A('failure')} (${A('errorCode')}: ${/^[a-z0-9_-]{3,55}$/i.test(code)?code:'AI_CLIENT_ERROR'})`;
        setAiError(detail);
      }finally{clearTimeout(timer);aiAbortRef.current=null;setAiBusy(false);}
    };
    // Respect the app's existing free-plan rewarded entitlement mechanism.
    if(ctx.handleRewardedFeature)ctx.handleRewardedFeature('aiReply',1,generation);
    else generation();
  }
  useEffect(()=>{
    function openAiProposal(){
      let envelope:any=null;
      try{
        const stored=sessionStorage.getItem('fainance_rule_ai_editor_draft_once');
        if(!stored)return;
        sessionStorage.removeItem('fainance_rule_ai_editor_draft_once');
        envelope=JSON.parse(stored);
      }catch{return;}
      if(!envelope?.rule||envelope.ownerUid!==String(ctx.userId||'')||Date.now()-Number(envelope.createdAt||0)>300000)return;
      const proposed=automaticRuleForEditor(envelope.rule);
      // An AI proposal is always a NEW rule; a review is not a write operation.
      const {expectedRevision,...fresh}=proposed;
      setAiReview(true);
      setSaveErrorCode('');setLimitWarning(false);setLogicStep('conditions');setLogicChanged(false);
      setProbeOnly(false);setTest(null);setResult(null);setHistoryTest(null);setError(false);
      setEditorTab('when');
      setDraft({...fresh,logicTokens:stripRedundantOuterParentheses(proposed.logicTokens||legacyRuleLogicTokens(proposed)),enabled:proposed.enabled!==false});
    }
    openAiProposal();
    window.addEventListener('fainance:review-ai-rule',openAiProposal);
    return()=>window.removeEventListener('fainance:review-ai-rule',openAiProposal);
  },[]);
  const patchAction=(i,patch)=>{setDraft({...draft,actions:draft.actions.map((a,j)=>i===j?{...a,...patch}:a)});setResult(null);};
  const actionName=a=>a.field==='alert'?E(a.kind==='confirmation'?'confirmationAction':'informationAction'):(T(a.field)||R(a.field));
  function runHistoryTest(){
    // Read-only simulation. Existing values are marked as replaceable *only*
    // within this preview; neither local storage nor Firebase is modified.
    const history=[...(ctx.expenses||[]).map((item:any)=>({item,direction:'expense'})),...(ctx.incomes||[]).map((item:any)=>({item,direction:'income'}))]
      .filter(({item}:any)=>item&&Number.isFinite(Number(item.amount)))
      .sort((a:any,b:any)=>String(b.item.date||b.item.createdAt||'').localeCompare(String(a.item.date||a.item.createdAt||''))).slice(0,20);
    if(!history.length){setHistoryTest({total:0,matched:0,conflicts:[]});return;}
    const previewRule={...draft,enabled:true};
    const existing=rules.filter((r:any)=>r.id!==draft.id);
    const pool=[...existing,previewRule].sort((a:any,b:any)=>a.priority-b.priority||a.id.localeCompare(b.id));
    try{
      validateAutomaticRule(previewRule,{allowLegacyConditions:true});
      const simulations=history.map(({item,direction}:any)=>evaluateAutomaticRules(pool,{...item,_ruleDefaultFields:['catId','type','methodId','desc','tags','note']},direction,item.source||'manual',{plan:ctx.currentPlan,cats:ctx.cats,methods:ctx.methods,incomeTypes:ctx.incomeTypes}));
      const conflicts=simulations.flatMap((result:any)=>result.conflicts||[]).filter((v:any,i:number,a:any[])=>a.findIndex(x=>x.field===v.field&&x.firstRule===v.firstRule&&x.secondRule===v.secondRule)===i);
      setHistoryTest({total:history.length,matched:simulations.filter((r:any)=>r.matched.includes(draft.id)).length,conflicts});setError(false);
    }catch(e:any){setSaveErrorCode(e?.message||'');setError(true);setHistoryTest(null);}
  }
  function showTest(){setTest({desc:'',amount:'',direction:draft.categoryFilter?.direction||(draft.trigger==='income'?'income':'expense'),source:'manual',transactionType:'single',category:draft.categoryFilter?.value||'',payment:'',defaults:true});setResult(null);}
  const probeLabel=U('testRule');
  function runTest(){setSaveErrorCode('');try{validateAutomaticRule(draft,{allowLegacyConditions:true});if(!String(test.amount).trim()||!Number.isFinite(Number(test.amount))||Number(test.amount)<0)throw new Error('INVALID_AMOUNT');setResult(evaluateAutomaticRules([{...draft,enabled:true}],{desc:test.desc,amount:Number(test.amount),catId:test.category,type:test.category,methodId:test.payment,rateizzato:test.transactionType==='installment',receipt:test.transactionType==='receipt',_ruleDefaultFields:test.defaults?['catId','type','methodId']:[]},test.direction,test.source,{plan:'premium',cats:ctx.cats,methods:ctx.methods,incomeTypes:ctx.incomeTypes}));setError(false);}catch{setError(true);}}
  function closeEditor(){setLogicStep('conditions');setLogicChanged(false);setAiReview(false);setLimitWarning(false);setHistoryTest(null);setSaveErrorCode('');setDraft(null);setEditorTab('when');setProbeOnly(false);setError(false);setTest(null);setResult(null);}
  function saveDraft(e){
    e.preventDefault();
    if(probeOnly){runTest();return;}
    if(!String(draft.name||'').trim()){setSaveErrorCode('missingName');setError(true);setEditorTab('when');return;}
    if(draft.conditions.length>MAX_RULE_CONDITIONS){conditionLimitNotice();setSaveErrorCode('RULE_CONDITION_LIMIT');setEditorTab('if');setError(true);return;}
    if(!logicValid){setEditorTab('if');setLogicStep('formula');setSaveErrorCode('INVALID_RULE_FORMULA');setError(true);return;}
    if(apply(p=>saveAutomaticRule(p,draft,ctx.currentPlan)))closeEditor();
  }
  return <section aria-label={T('title')} className="fainance-rules" data-dark={ctx.dark ? "true" : "false"} style={theme}>
    <div className="rule-screen">
    {rules.length>limit&&<p role="note" className="rule-notice">{T('limit')}</p>}
    {error&&<p role="alert" className="rule-notice">{T('error')}</p>}
    {!draft&&<>
      <div className="rule-toolbar"><span className="rule-counter">{rules.length} / {limit===Infinity?'∞':limit}</span><button type="button" className="rule-primary" aria-disabled={rules.length>=limit} onClick={()=>{if(rules.length>=limit){limitNotice();return;}open();}} style={rules.length>=limit?{background:'#A8A8A8',borderColor:'#A8A8A8',boxShadow:'none',cursor:'pointer'}:undefined}>{U('createRule')}</button></div>
      <button type="button" className="rule-secondary rule-ai-prompt-open" onClick={()=>{setAiError('');setAiPromptOpen(true);}} aria-label={B('createAI')}>✨ {B('createAI')}</button>
      {!rules.length&&<div className="rule-card"><p className="rule-caption">{E('empty')}</p></div>}
      {rules.map((r,index)=><article key={r.id} data-rule-id={r.id} draggable onDragStart={()=>{drag.current=r.id;}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();order(drag.current,r.id);drag.current=null;}} className={"rule-card rule-item"+(r.enabled?"":" rule-inactive")}>
        <div className="rule-card-top"><button type="button" aria-label={T('priority')} style={{touchAction:'none',padding:'7px 10px'}} onPointerDown={e=>{drag.current=r.id;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-rule-id]')?.getAttribute('data-rule-id');if(target)order(drag.current,target);drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>☰</button><strong className="rule-name">{r.name}</strong><span className={"rule-status "+(r.enabled?"rule-enabled":"")}>{E(r.enabled?'active':'inactive')}</span></div>
        <p className="rule-scope">{r.trigger==='income'?'↙':'↗'} {scopeText(r)}</p>{conflictNotice(r)}
        {index>=limit&&<p role="note" className="rule-notice">{T('limit')}</p>}
        <div className="rule-flow">
          <div className="rule-flow-label">{T('if')}</div>
          <p className="rule-expression">{conditionExpression(r)}</p>
          <div className="rule-flow-label">↓ {T('then')}</div>
          <div className="rule-chips">{automaticRuleForEditor(r).actions.map(a=><span className="rule-chip rule-action-chip" key={a.field}>{a.field==='payment'?'💳':a.field==='alert'?'🔔':'✦'} {actionName(a)}: {a.field==='alert'?a.text:choices(a.field,r.categoryFilter?.direction||r.trigger)?.find(v=>String(v.id)===String(a.value))?.name||a.value}</span>)}</div>
        </div>
        <details className="rule-explanation"><summary>{R('explainRule')}</summary><p>{ruleExplanation(r)}</p></details>
        <div className="rule-actions-block">
          <div className="rule-actions-label">{D('more')}</div>
          <div className="rule-icon-actions">
            <button type="button" className="rule-icon-button" title={L('Modifica')} aria-label={L('Modifica')} onClick={()=>open(r)}><span aria-hidden="true">✏️</span></button>
            <button type="button" className="rule-icon-button" title={probeLabel} aria-label={probeLabel} onClick={()=>open(r,false,true)}><span aria-hidden="true">🧪</span></button>
            <button type="button" className="rule-icon-button" title={L('Duplica')} aria-label={L('Duplica')} onClick={()=>open(r,true)}><span aria-hidden="true">⧉</span></button>
            <button type="button" className="rule-icon-button" title={L(r.enabled?'Disattiva':'Attiva')} aria-label={L(r.enabled?'Disattiva':'Attiva')} onClick={()=>apply(p=>saveAutomaticRule(p,{...r,enabled:!r.enabled,expectedRevision:r.revision},ctx.currentPlan))}><span aria-hidden="true">{r.enabled?'⏸️':'▶️'}</span></button>
            <button type="button" className="rule-icon-button" title={L('Elimina')} aria-label={L('Elimina')} onClick={()=>{if(window.confirm(L('Elimina')+' '+r.name+'?'))apply(p=>deleteAutomaticRule(p,r.id,r.revision));}}><span aria-hidden="true">🗑️</span></button>
            <button type="button" className="rule-icon-button" title={T('up')} aria-label={T('up')} disabled={index===0} onClick={()=>order(r.id,rules[index-1].id)}><span aria-hidden="true">↑</span></button>
            <button type="button" className="rule-icon-button" title={T('down')} aria-label={T('down')} disabled={index===rules.length-1} onClick={()=>order(r.id,rules[index+1].id)}><span aria-hidden="true">↓</span></button>
          </div>
        </div>
      </article>)}
    </>}
    {aiPromptOpen&&<div className="rule-editor-overlay rule-ai-direct-overlay" role="dialog" aria-modal="true" aria-label={B('promptTitle')} onMouseDown={e=>{if(e.target===e.currentTarget&&!aiBusy)setAiPromptOpen(false);}}><form className="rule-editor-shell rule-goal-like rule-ai-prompt-dialog" onSubmit={e=>{e.preventDefault();generateRuleFromPrompt();}}>
      <div className="rule-editor-header"><strong className="rule-editor-title">✨ {B('promptTitle')}</strong><button type="button" className="rule-editor-close" onClick={()=>{if(!aiBusy){aiAbortRef.current?.abort();setAiPromptOpen(false);}}} disabled={aiBusy} aria-label={B('cancel')}>×</button></div>
      <div className="rule-ai-prompt-content"><p className="rule-caption">{A('hint')}</p><label>{B('editPrompt')}<textarea autoFocus required disabled={aiBusy} minLength={8} maxLength={1400} rows={5} value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} placeholder={B('promptPlaceholder')}/></label>{aiBusy&&<p role="status" aria-live="polite" className="rule-caption">{A('thinking')}</p>}{aiError&&<p role="alert" className="rule-notice">{aiError}</p>}</div>
      <div className="rule-editor-footer"><button type="button" className="rule-secondary" onClick={()=>{if(!aiBusy)setAiPromptOpen(false);}} disabled={aiBusy}>{B('cancel')}</button><button type="submit" className="rule-primary" disabled={aiBusy||aiPrompt.trim().length<8}>{aiBusy?A('thinking'):A('generate')}</button></div>
    </form></div>}
    {draft&&<div className="rule-editor-overlay" role="dialog" aria-modal="true" onMouseDown={e=>{if(e.target===e.currentTarget){closeEditor()}}}><form ref={editorScrollRef} noValidate className="rule-editor-shell rule-goal-like" onMouseDown={e=>e.stopPropagation()} onSubmit={saveDraft}>
      <div className="rule-editor-header"><div className="rule-editor-title">{probeOnly?probeLabel:(draft.expectedRevision!==undefined?L('Modifica')+' · '+U('ruleSingular'):U('createRule'))}</div><button type="button" className="rule-editor-close" aria-label={L('Chiudi')} onClick={()=>{closeEditor()}}>×</button></div>
      {!probeOnly&&draft.expectedRevision===undefined&&<button type="button" className="rule-secondary rule-ai-rephrase" onClick={()=>{setAiError('');setAiPromptOpen(true);}}>✨ {aiReview?A('rephrase'):A('create')}</button>}
      {!probeOnly&&<div className="rule-editor-tabs"><button type="button" className={"rule-editor-tab"+(editorTab==='when'?' active':'')} onClick={()=>setEditorTab('when')}><span aria-hidden="true">📅</span><b>{T('when')}</b></button><button type="button" className={"rule-editor-tab"+(editorTab==='if'?' active':'')} onClick={()=>setEditorTab('if')}><span aria-hidden="true">🔎</span><b>{T('if')}</b></button><button type="button" className={"rule-editor-tab"+(editorTab==='then'?' active':'')} onClick={()=>setEditorTab('then')}><span aria-hidden="true">⚡</span><b>{T('then')}</b></button></div>}
      <div className="rule-editor-body">
      {error&&<p role="alert" className="rule-notice">{saveErrorCode==='INVALID_RULE_FORMULA'?F('confirmLogic'):saveErrorCode==='RULE_CONDITION_LIMIT'?R('legacyConditionLimit'):saveErrorCode?assistantRuleError(ctx.lang||'it',saveErrorCode):T('error')}</p>}
      {!probeOnly&&conflictNotice(draft)}
      {!probeOnly&&editorTab==='when'&&<section className="rule-card" aria-label={T('when')}>
        <div className="rule-name-card"><label>{L('Nome')}<input required maxLength={120} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label></div>
        <div className="rule-grid"><div><div className="rule-field-label">{T('direction')}</div><div className="rule-toggle-row" role="tablist" aria-label={T('direction')}>{directionOptions.map(opt=><button key={opt.id} type="button" className={'rule-toggle-button'+(draft.trigger===opt.id?' active ':' ')+(opt.id==='expense'?' expense':' income')} onClick={()=>{setDraft({...draft,trigger:opt.id,categoryFilter:null,conditions:draft.conditions.map(c=>c.field==='category'?{...c,value:''}:c),actions:draft.actions.map(a=>a.field==='category'?{...a,value:''}:a)});setTest(null);setResult(null);}}>{opt.label}</button>)}</div></div>
          <label>{categoryLabel(draft.trigger)}<select aria-label={E('appliesTo')} value={draft.categoryFilter?JSON.stringify([draft.categoryFilter.direction,String(draft.categoryFilter.value)]):''} onChange={e=>{const selected=e.target.value?JSON.parse(e.target.value):null;setDraft({...draft,categoryFilter:selected?{direction:selected[0],value:selected[1]}:null});setTest(null);setResult(null);}}>
            <option value="">{E('allCategories')}</option>{[draft.trigger].map(d=><optgroup key={d} label={categoryLabel(d)}>{choices('category',d).map(c=><option key={c.id} value={JSON.stringify([d,String(c.id)])} data-fainance-icon-ref={(c as any).icon || "\u{1F4C1}"}>{c.icon?c.icon+' ':''}{c.name}</option>)}</optgroup>)}
          </select></label><p className="rule-caption">{E('scopeHint')}</p>
        </div>
        <label className="rule-check rule-edit-optin"><input type="checkbox" checked={draft.applyOnEdit===true} onChange={e=>setDraft({...draft,applyOnEdit:e.target.checked})}/><span>{R('applyOnEdit')}</span></label><p className="rule-caption">{R('editModeHint')}</p>
      </section>}
      {!probeOnly&&editorTab==='if'&&<section className="rule-card rule-formula-wizard" aria-label={T('if')}>
        {draft.conditions.length>MAX_RULE_CONDITIONS&&<p role="note" className="rule-notice">{R('legacyConditionLimit')}</p>}
        {draft.conditions.length>=2&&<nav className="rule-formula-steps" aria-label={T('if')}>
          <button type="button" className={logicStep==='conditions'?'active':''} onClick={()=>setLogicStep('conditions')}>{F('conditionsStep')}</button>
          <button type="button" className={logicStep==='formula'?'active':''} onClick={()=>setLogicStep('formula')}>{F('logicStep')}</button>
        </nav>}
        {(logicStep==='conditions'||draft.conditions.length<2)?<div className="rule-grid">
          <p className="rule-caption">{F('conditionsHint')}</p>
          {draft.conditions.map((c:any,i:number)=><fieldset key={i} className="rule-row rule-condition-row">
            <legend>{T('if')} {i+1}</legend>
            <select aria-label={T('if')+' '+(i+1)} value={c.field} onChange={e=>patchCondition(i,{field:e.target.value,operator:operatorsFor(e.target.value)[0],value:''})}>{ruleFields.filter(f=>f!=='category'||c.field==='category').map(f=><option key={f} value={f}>{f==='category'?categoryLabel(draft.categoryFilter?.direction||draft.trigger):(T(f)||R(f))}</option>)}</select>
            <select aria-label={T('condition')+' '+(i+1)} value={c.operator} onChange={e=>patchCondition(i,{operator:e.target.value,value:e.target.value==='between'?'|':c.operator==='between'?'':c.value})}>{operatorsFor(c.field).map(op=><option key={op} value={op}>{T(op)||R(op)}</option>)}</select>
            {valueInput(c.field,c.value,(value:any)=>patchCondition(i,{value}),draft.categoryFilter?.direction||draft.trigger,c.operator)}
            <button type="button" className="rule-remove" disabled={draft.conditions.length===1} onClick={()=>removeCondition(i)}>{L('Elimina')}</button>
          </fieldset>)}
          <button type="button" className={'rule-secondary rule-add-condition'+(draft.conditions.length>=MAX_RULE_CONDITIONS?' at-limit':'')} aria-disabled={draft.conditions.length>=MAX_RULE_CONDITIONS} onClick={()=>{if(draft.conditions.length>=MAX_RULE_CONDITIONS){conditionLimitNotice();return;}changeConditions([...draft.conditions,{field:'amount',operator:'greater',value:''}]);}}>＋ {T('condition')}</button>
          {limitWarning&&<p role="alert" aria-live="assertive" className="rule-limit-inline">{R('conditionLimit')}</p>}
          {logicChanged&&<p className="rule-caption" role="status">{F('changed')}</p>}
        </div>:<div className="rule-formula-content">
          <p className="rule-caption">{F('logicHint')}</p>
          <p className="rule-caption">{F('useEach')}</p>
          <div className="rule-formula-expression" role="status" aria-live="polite" aria-label={F('formula')}>
            {effectiveLogicTokens.length?effectiveLogicTokens.map((token:string,i:number)=><span key={i} className={'rule-formula-token '+(/^[1-6]$/.test(token)?'number':'operator')}>{token==='all'?R('and'):token==='any'?R('or'):token}</span>):<span className="rule-caption">{F('formula')}</span>}
          </div>
          <div className="rule-formula-keypad" role="group" aria-label={F('formula')}>
            <button type="button" disabled={!nextLogic?.canOpen} onClick={()=>appendLogic('(')}>(</button>
            <button type="button" disabled={!nextLogic?.canClose} onClick={()=>appendLogic(')')}>)</button>
            {Array.from({length:draft.conditions.length},(_:any,i:number)=><button key={i} type="button" className="rule-formula-number" disabled={!nextLogic?.canCondition(i+1)} onClick={()=>appendLogic(String(i+1))}>{i+1}</button>)}
            <button type="button" className="rule-formula-operator" disabled={!nextLogic?.canJoin} onClick={()=>appendLogic('all')}>{R('and')}</button>
            <button type="button" className="rule-formula-operator" disabled={!nextLogic?.canJoin} onClick={()=>appendLogic('any')}>{R('or')}</button>
            <button type="button" className="rule-formula-undo" disabled={!effectiveLogicTokens.length} onClick={()=>updateLogic(effectiveLogicTokens.slice(0,-1))} aria-label={F('undo')}>⌫</button>
            <button type="button" className="rule-formula-clear" disabled={!effectiveLogicTokens.length} onClick={()=>updateLogic([])}>{F('clear')}</button>
          </div>
          <div className="rule-formula-available"><strong>{F('available')}</strong>{draft.conditions.map((c:any,i:number)=><p key={i}><span className="rule-formula-available-number">{i+1}</span>{describe(c,draft.categoryFilter?.direction||draft.trigger)}</p>)}</div>
          <div className="rule-formula-preview"><strong>{F('preview')}</strong><p>{formatRuleLogic(effectiveLogicTokens,draft.conditions.map((c:any)=>describe(c,draft.categoryFilter?.direction||draft.trigger)),R('and'),R('or'))||'—'}</p><span role="status" className={logicValid?'rule-formula-valid':'rule-formula-invalid'}>{logicValid?'✓ '+F('valid'):F('invalid')}</span></div>
          <p className="rule-caption">{F('example')}</p>
        </div>}
      </section>}
      {!probeOnly&&editorTab==='then'&&<section className="rule-card" aria-label={T('then')}>
        <div className="rule-grid">{draft.actions.map((a,i)=><fieldset key={i} className="rule-row"><legend>{T('then')} {i+1}</legend>
          <select aria-label={T('then')+' '+(i+1)} value={a.field==='alert'?a.kind:a.field} onChange={e=>{const field=['information','confirmation'].includes(e.target.value)?'alert':e.target.value;setDraft({...draft,actions:draft.actions.map((v,j)=>j===i?(field==='alert'?{field,kind:e.target.value,text:v.text||''}:{field,value:''}):v)});setResult(null);}}>
            {['category','payment','description','tags','note','information','confirmation'].map(f=><option key={f} value={f} disabled={draft.actions.some((other,j)=>j!==i&&other.field===(['information','confirmation'].includes(f)?'alert':f))}>{f==='information'?E('informationAction'):f==='confirmation'?E('confirmationAction'):(T(f)||R(f))}</option>)}
          </select>
          {a.field==='alert'?<label>{E('message')}<textarea required maxLength={1000} placeholder={U('messagePlaceholder')} value={a.text} onChange={e=>patchAction(i,{text:e.target.value})}/></label>:valueInput(a.field,a.value,value=>patchAction(i,{value}),draft.categoryFilter?.direction||draft.trigger)}
          <button type="button" className="rule-remove" onClick={()=>{setDraft({...draft,actions:draft.actions.filter((_,j)=>j!==i)});setResult(null);}}>{L('Elimina')}</button>
        </fieldset>)}
        <button type="button" className="rule-secondary" disabled={editableActions.every(f=>draft.actions.some(a=>a.field===f))} onClick={()=>{const field=editableActions.find(f=>!draft.actions.some(a=>a.field===f));setDraft({...draft,actions:[...draft.actions,field==='alert'?{field,kind:'confirmation',text:''}:{field,value:''}]});setResult(null);}}>＋ {T('action')}</button></div>
      </section>}
      {(probeOnly||editorTab==='then')&&test&&<fieldset className="rule-card rule-grid rule-test-card"><legend>{T('probe')}</legend><p className="rule-caption">{T('testHint')}</p>
        {['description','amount','direction','source','transactionType','category','payment'].filter(f=>test.direction!=='income'||f!=='payment').map(field=><label key={field}>{T(field)}{valueInput(field,test[field==='description'?'desc':field],value=>{setTest({...test,[field==='description'?'desc':field]:value,...(field==='direction'?{category:'',payment:''}:{})});setResult(null);},test.direction)}</label>)}
        <label className="rule-check"><input type="checkbox" checked={test.defaults} onChange={e=>{setTest({...test,defaults:e.target.checked});setResult(null);}}/><span>{T('defaultFields')}</span></label>
        <button type="button" className="rule-secondary" onClick={runTest}>{probeLabel}</button>
        {result&&<output className={'rule-result '+(result.matched.length?'rule-result-success':'rule-result-failure')}><div className="rule-flow-label">{D('result')}</div><strong>{T(result.matched.length?'matched':'unmatched')}</strong><p>{T('category')}: {choices('category',test.direction)?.find(c=>String(c.id)===String(test.direction==='income'?result.item.type:result.item.catId))?.name||'—'}</p>{test.direction!=='income'&&<p>{T('payment')}: {choices('payment')?.find(c=>String(c.id)===String(result.item.methodId))?.name||'—'}</p>}<p>{T('description')}: {result.item.desc}</p>{result.changed.map(field=><p key={field}>✓ {T(field==='methodId'?'payment':field==='catId'||field==='type'?'category':field==='desc'?'description':field)||R(field)}: {D('applied')}</p>)}{result.skipped?.map((item,i)=><p key={i}>{T(item.field==='methodId'?'payment':item.field==='catId'||item.field==='type'?'category':item.field==='desc'?'description':item.field)||R(item.field)}: {D(item.reason)}</p>)}{result.alerts.map(a=><p key={a.ruleId}>{actionName({field:'alert',...a})}: {a.text}</p>)}{result.conflicts?.map((c,i)=><p key={i} role="alert">⚠️ {R('ruleConflict')}: {c.firstRule} / {c.secondRule} · {R('ruleWins')}: {c.firstRule}</p>)}</output>}
      </fieldset>}
      {(probeOnly||editorTab==='then')&&<div className="rule-card rule-history-test"><button type="button" className="rule-secondary" onClick={runHistoryTest}>{R('recentTest')}</button><p className="rule-caption">{R('recentTestIntro')}</p>
        {historyTest&&<output className="rule-result">{historyTest.total?<><p>{R('testedMovements')}: {historyTest.total}</p><p>{R('recentMatches')}: {historyTest.matched}</p><p>{R('recentConflicts')}: {historyTest.conflicts.length}</p>{historyTest.conflicts.map((c,i)=><p key={i}>⚠️ {c.firstRule} / {c.secondRule} · {R('ruleWins')}: {c.firstRule}</p>)}</>:<p>{R('noRecentMovements')}</p>}</output>}
      </div>}
      </div>
      {probeOnly?<div className="rule-editor-footer rule-probe-footer"><button type="button" className="rule-secondary" onClick={closeEditor}>{L('Chiudi')}</button></div>:<div className={"rule-editor-footer tab-"+editorTab}>
        {editorTab==='when'&&<><span className="rule-footer-spacer" aria-hidden="true"/><button type="button" className="rule-primary" onClick={()=>{setLogicStep('conditions');setEditorTab('if');}}>{L('Avanti')}</button></>}
        {editorTab==='if'&&<><button type="button" className="rule-secondary" onClick={()=>logicStep==='formula'&&draft.conditions.length>=2?setLogicStep('conditions'):setEditorTab('when')}>{L('Indietro')}</button><button type="button" className="rule-primary" onClick={()=>{if(logicStep==='conditions'&&draft.conditions.length>=2){setLogicStep('formula');return;}if(!logicValid){setSaveErrorCode('INVALID_RULE_FORMULA');setError(true);return;}setSaveErrorCode('');setError(false);setEditorTab('then');}}>{L('Avanti')}</button></>}
        {editorTab==='then'&&<><button type="button" className="rule-secondary rule-test-footer" onClick={()=>{if(!test)showTest();else runTest();}}>{probeLabel}</button><button type="submit" className="rule-primary rule-save-footer">{L('Salva')}</button><button type="button" className="rule-secondary rule-back-footer" onClick={()=>{setLogicStep(draft.conditions.length>=2?'formula':'conditions');setEditorTab('if');}}>{L('Indietro')}</button><span className="rule-footer-spacer" aria-hidden="true"/></>}
      </div>}
    </form></div>}
    </div>
  </section>;
}
