import {useRef,useState} from 'react';
import {useApp} from '../core';
import {rulesText,rulesExtraText,rulesUiText} from '../i18n/automaticRulesTranslations';
import {ruleDiagnosticText} from '../i18n/ruleDiagnosticsTranslations';
import {ruleEditorText} from '../i18n/ruleEditorTranslations';
import {translateFainanceText} from '../traduzioni';
import {ruleFields,operatorsFor,ruleLimit,evaluateAutomaticRules,validateAutomaticRule,automaticRuleForEditor,automaticRuleCategoryConflict,categoryScopeFromConditions} from '../finance/automaticRules';
import {saveAutomaticRule,deleteAutomaticRule,reorderAutomaticRules} from '../finance/automaticRuleStore';
import './automaticRules.css';

const editableActions=['category','payment','description','alert'];
export function AutomaticRulesPanel(){
  const ctx:any=useApp();
  const [draft,setDraft]=useState<any>(null),[error,setError]=useState(false),[test,setTest]=useState<any>(null),[result,setResult]=useState<any>(null),[editorTab,setEditorTab]=useState<'when'|'if'|'then'>('when');
  const drag=useRef<any>(null);
  const T=(key:any)=>key==='recurring'?translateFainanceText('Ricorrente',ctx.lang||'it'):rulesText(ctx.lang||'it',key);
  const D=(key:any)=>ruleDiagnosticText(ctx.lang||'it',key);
  const E=(key:any)=>ruleEditorText(ctx.lang||'it',key);
  const L=(s:string)=>rulesExtraText(ctx.lang||'it',s)??translateFainanceText(s,ctx.lang||'it');
  const U=(key:'createRule'|'ruleSingular'|'whenSubtitle'|'ifSubtitle'|'thenSubtitle'|'messagePlaceholder'|'testRule')=>rulesUiText(ctx.lang||'it',key);
  const directionOptions=[{id:'expense',label:T('expense')},{id:'income',label:T('income')}];
  const rules=ctx.financeEvolution.rules.filter(r=>r.kind==='automatic-v1').slice().sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
  const limit=ruleLimit(ctx.currentPlan);
  const theme:any={'--rule-text':ctx.textC,'--rule-sub':ctx.subC||(ctx.dark?'#b8bdc8':'#69727c'),'--rule-card':ctx.cardBg,'--rule-border':ctx.borderC,'--rule-primary':ctx.confirmButtonColor||'#378ADD','--rule-soft':ctx.dark?'#263444':'#edf5fc','--rule-input':ctx.inp?.background||ctx.cardBg,'--rule-radius':`${ctx.btnRadius??12}px`,'--rule-expense':ctx.expenseColor||'#E35B5B','--rule-income':ctx.incomeColor||'#2FA66A'};
  function limitNotice(){ctx.setToast({text:T('limit'),type:'warning',color:'#FFF8E1',textColor:'#856404',icon:'🔒',actionLabel:L('Piani'),actionPage:'plans_settings',duration:7000});}
  function apply(fn){try{ctx.setFinanceEvolution(fn);setError(false);return true;}catch(e){if(e.message==='RULE_LIMIT')limitNotice();else setError(true);return false;}}
  function open(rule?,duplicate=false,probe=false){
    if((!rule||duplicate)&&rules.length>=limit){limitNotice();return;}
    setEditorTab('when');
    setDraft(rule?{...automaticRuleForEditor(rule),id:duplicate?crypto.randomUUID():rule.id,expectedRevision:duplicate?undefined:rule.revision}:{id:crypto.randomUUID(),kind:'automatic-v1',name:'',enabled:true,revision:0,priority:rules.length,trigger:'expense',categoryFilter:null,match:'all',conditions:[{field:'description',operator:'contains',value:''}],actions:[{field:'category',value:''}],alert:null});
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
  function valueInput(field,value,onChange,direction?){
    const items=choices(field,direction);
    if(items)return <select aria-label={T(field)} value={String(value??'')} onChange={e=>onChange(e.target.value)}><option value="">—</option>{items.map(c=><option key={c.id} value={c.id}>{c.icon?c.icon+' ':''}{c.name}</option>)}</select>;
    if(field==='amount')return <input aria-label={T(field)} type="number" min={0} step="0.01" inputMode="decimal" placeholder="1000 €" maxLength={500} value={value??''} onChange={e=>onChange(e.target.value)}/>;
    if(field==='description')return <input aria-label={T(field)} type="text" placeholder={T('description')} maxLength={500} value={value??''} onChange={e=>onChange(e.target.value)}/>;
    return <input aria-label={T(field)} type="text" maxLength={500} value={value??''} onChange={e=>onChange(e.target.value)}/>;
  }
  const describe=(c,direction)=>`${T(c.field)} ${T(c.operator)} ${choices(c.field,direction)?.find(v=>String(v.id)===String(c.value))?.name||c.value}`;
  const scopeText=r=>`${T(r.trigger)} · ${r.categoryFilter?choices('category',r.categoryFilter.direction)?.find(c=>String(c.id)===String(r.categoryFilter.value))?.name||r.categoryFilter.value:E('allCategories')}`;
  const patchCondition=(i,patch)=>{setDraft({...draft,conditions:draft.conditions.map((c,j)=>i===j?{...c,...patch}:c)});setResult(null);};
  const patchAction=(i,patch)=>{setDraft({...draft,actions:draft.actions.map((a,j)=>i===j?{...a,...patch}:a)});setResult(null);};
  const actionName=a=>a.field==='alert'?E(a.kind==='confirmation'?'confirmationAction':'informationAction'):T(a.field);
  function showTest(){setTest({desc:'',amount:'',direction:draft.categoryFilter?.direction||(draft.trigger==='income'?'income':'expense'),source:'manual',transactionType:'single',category:draft.categoryFilter?.value||'',payment:'',defaults:true});setResult(null);}
  const probeLabel=U('testRule');
  function runTest(){try{validateAutomaticRule(draft);if(!String(test.amount).trim()||!Number.isFinite(Number(test.amount))||Number(test.amount)<0)throw new Error('INVALID_AMOUNT');setResult(evaluateAutomaticRules([{...draft,enabled:true}],{desc:test.desc,amount:Number(test.amount),catId:test.category,type:test.category,methodId:test.payment,rateizzato:test.transactionType==='installment',receipt:test.transactionType==='receipt',_ruleDefaultFields:test.defaults?['catId','type','methodId']:[]},test.direction,test.source,{plan:'premium',cats:ctx.cats,methods:ctx.methods,incomeTypes:ctx.incomeTypes}));setError(false);}catch{setError(true);}}
  function closeEditor(){setDraft(null);setEditorTab('when');setError(false);setTest(null);setResult(null);}
  return <section aria-label={T('title')} className="fainance-rules" style={theme}>
    <div className="rule-screen">
    {rules.length>limit&&<p role="note" className="rule-notice">{T('limit')}</p>}
    {error&&<p role="alert" className="rule-notice">{T('error')}</p>}
    {!draft&&<>
      <div className="rule-toolbar"><span className="rule-counter">{rules.length} / {limit===Infinity?'∞':limit}</span><button type="button" className="rule-primary" onClick={()=>open()}>＋ {U('createRule')}</button></div>
      {!rules.length&&<div className="rule-card"><p className="rule-caption">{E('empty')}</p></div>}
      {rules.map((r,index)=><article key={r.id} data-rule-id={r.id} draggable onDragStart={()=>{drag.current=r.id;}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();order(drag.current,r.id);drag.current=null;}} className={"rule-card rule-item"+(r.enabled?"":" rule-inactive")}>
        <div className="rule-card-top"><button type="button" aria-label={T('priority')} style={{touchAction:'none',padding:'7px 10px'}} onPointerDown={e=>{drag.current=r.id;e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-rule-id]')?.getAttribute('data-rule-id');if(target)order(drag.current,target);drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>☰</button><strong className="rule-name">{r.name}</strong><span className={"rule-status "+(r.enabled?"rule-enabled":"")}>{E(r.enabled?'active':'inactive')}</span></div>
        <p className="rule-scope">{r.trigger==='income'?'↙':'↗'} {scopeText(r)}</p>{conflictNotice(r)}
        {index>=limit&&<p role="note" className="rule-notice">{T('limit')}</p>}
        <div className="rule-flow">
          <div className="rule-flow-label">{T('if')} · {T(r.match)}</div>
          <div className="rule-chips">{r.conditions.map((condition,i)=><span className="rule-chip" key={i}>{describe(condition,r.categoryFilter?.direction||r.trigger)}</span>)}</div>
          <div className="rule-flow-label">↓ {T('then')}</div>
          <div className="rule-chips">{automaticRuleForEditor(r).actions.map(a=><span className="rule-chip rule-action-chip" key={a.field}>{a.field==='payment'?'💳':a.field==='alert'?'🔔':'✦'} {actionName(a)}: {a.field==='alert'?a.text:choices(a.field,r.categoryFilter?.direction||r.trigger)?.find(v=>String(v.id)===String(a.value))?.name||a.value}</span>)}</div>
        </div>
        <div className="rule-actions-block">
          <div className="rule-actions-label">{D('more')}</div>
          <div className="rule-icon-actions">
            <button type="button" className="rule-icon-button" title={L('Modifica')} aria-label={L('Modifica')} onClick={()=>open(r)}><span aria-hidden="true">✏️</span></button>
            <button type="button" className="rule-icon-button" title={probeLabel} aria-label={probeLabel} onClick={()=>open(r,false,true)}><span aria-hidden="true">🧪</span></button>
            <button type="button" className="rule-icon-button" title={L('Duplica')} aria-label={L('Duplica')} onClick={()=>open(r,true)}><span aria-hidden="true">⧉</span></button>
            <button type="button" className="rule-icon-button" title={L(r.enabled?'Disattiva':'Attiva')} aria-label={L(r.enabled?'Disattiva':'Attiva')} onClick={()=>apply(p=>saveAutomaticRule(p,{...r,enabled:!r.enabled,expectedRevision:r.revision},ctx.currentPlan))}><span aria-hidden="true">{r.enabled?'⏸️':'▶️'}</span></button>
            <button type="button" className="rule-icon-button" title={L('Elimina')} aria-label={L('Elimina')} onClick={()=>{if(window.confirm(L('Elimina')+' '+r.name+'?'))apply(p=>deleteAutomaticRule(p,r.id,r.revision));}}><span aria-hidden="true">🗑️</span></button>
            <button type="button" className="rule-icon-button" title="Su" aria-label="Su" disabled={index===0} onClick={()=>order(r.id,rules[index-1].id)}><span aria-hidden="true">↑</span></button>
            <button type="button" className="rule-icon-button" title="Giù" aria-label="Giù" disabled={index===rules.length-1} onClick={()=>order(r.id,rules[index+1].id)}><span aria-hidden="true">↓</span></button>
          </div>
        </div>
      </article>)}
    </>}
    {draft&&<div className="rule-editor-overlay" role="dialog" aria-modal="true" onMouseDown={e=>{if(e.target===e.currentTarget){closeEditor()}}}><form className="rule-editor-shell rule-goal-like" onMouseDown={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();if(apply(p=>saveAutomaticRule(p,draft,ctx.currentPlan))){closeEditor();}}}>
      <div className="rule-editor-header"><div className="rule-editor-title">{draft.expectedRevision!==undefined?L('Modifica')+' · '+U('ruleSingular'):U('createRule')}</div><button type="button" className="rule-editor-close" aria-label={L('Chiudi')} onClick={()=>{closeEditor()}}>×</button></div>
      <div className="rule-editor-tabs"><button type="button" className={"rule-editor-tab"+(editorTab==='when'?' active':'')} onClick={()=>setEditorTab('when')}><span aria-hidden="true">📅</span><b>{T('when')}</b></button><button type="button" className={"rule-editor-tab"+(editorTab==='if'?' active':'')} onClick={()=>setEditorTab('if')}><span aria-hidden="true">🔎</span><b>{T('if')}</b></button><button type="button" className={"rule-editor-tab"+(editorTab==='then'?' active':'')} onClick={()=>setEditorTab('then')}><span aria-hidden="true">⚡</span><b>{T('then')}</b></button></div>
      <div className="rule-editor-body">
      {conflictNotice(draft)}
      {editorTab==='when'&&<section className="rule-card" aria-label={T('when')}>
        <div className="rule-name-card"><label>{L('Nome')}<input required maxLength={120} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label></div>
        <div className="rule-grid"><div><div className="rule-field-label">{T('direction')}</div><div className="rule-toggle-row" role="tablist" aria-label={T('direction')}>{directionOptions.map(opt=><button key={opt.id} type="button" className={'rule-toggle-button'+(draft.trigger===opt.id?' active ':' ')+(opt.id==='expense'?' expense':' income')} onClick={()=>{setDraft({...draft,trigger:opt.id,categoryFilter:null,conditions:draft.conditions.map(c=>c.field==='category'?{...c,value:''}:c),actions:draft.actions.map(a=>a.field==='category'?{...a,value:''}:a)});setTest(null);setResult(null);}}>{opt.label}</button>)}</div></div>
          <label>{categoryLabel(draft.trigger)}<select aria-label={E('appliesTo')} value={draft.categoryFilter?JSON.stringify([draft.categoryFilter.direction,String(draft.categoryFilter.value)]):''} onChange={e=>{const selected=e.target.value?JSON.parse(e.target.value):null;setDraft({...draft,categoryFilter:selected?{direction:selected[0],value:selected[1]}:null});setTest(null);setResult(null);}}>
            <option value="">{E('allCategories')}</option>{[draft.trigger].map(d=><optgroup key={d} label={categoryLabel(d)}>{choices('category',d).map(c=><option key={c.id} value={JSON.stringify([d,String(c.id)])}>{c.icon?c.icon+' ':''}{c.name}</option>)}</optgroup>)}
          </select></label><p className="rule-caption">{E('scopeHint')}</p>
        </div>
      </section>}
      {editorTab==='if'&&<section className="rule-card" aria-label={T('if')}>
        <div className="rule-grid">
        {draft.conditions.map((c,i)=><div key={i} className="rule-grid">{i>0&&<div className="rule-join">{E(draft.match==='all'?'and':'or')}</div>}<fieldset className="rule-row"><legend>{T('if')} {i+1}</legend>
          <select aria-label={T('if')+' '+(i+1)} value={c.field} onChange={e=>patchCondition(i,{field:e.target.value,operator:operatorsFor(e.target.value)[0],value:''})}>{ruleFields.filter(f=>f!=='category'||c.field==='category').map(f=><option key={f} value={f}>{f==='category'?categoryLabel(draft.categoryFilter?.direction||draft.trigger):T(f)}</option>)}</select>
          <select aria-label={T('condition')+' '+(i+1)} value={c.operator} onChange={e=>patchCondition(i,{operator:e.target.value})}>{operatorsFor(c.field).map(op=><option key={op} value={op}>{T(op)}</option>)}</select>
          {valueInput(c.field,c.value,value=>patchCondition(i,{value}),draft.categoryFilter?.direction||draft.trigger)}
          <button type="button" className="rule-remove" disabled={draft.conditions.length===1} onClick={()=>{setDraft({...draft,conditions:draft.conditions.filter((_,j)=>j!==i)});setResult(null);}}>{L('Elimina')}</button>
        </fieldset></div>)}
        <button type="button" className="rule-secondary" disabled={draft.conditions.length>=20} onClick={()=>{setDraft({...draft,conditions:[...draft.conditions,{field:'amount',operator:'greater',value:''}]});setResult(null);}}>＋ {T('condition')}</button>
        {draft.conditions.length>1&&<><div className="rule-match-buttons">{['all','any'].map(v=><button key={v} type="button" className={'rule-toggle-button rule-match-button'+(draft.match===v?' active':'')} onClick={()=>{setDraft({...draft,match:v});setResult(null);}}>{E(v==='all'?'allConditions':'anyCondition')}</button>)}</div><p className="rule-caption">{E('conditionsHint')}</p></>}
        </div>
      </section>}
      {editorTab==='then'&&<section className="rule-card" aria-label={T('then')}>
        <div className="rule-grid">{draft.actions.map((a,i)=><fieldset key={i} className="rule-row"><legend>{T('then')} {i+1}</legend>
          <select aria-label={T('then')+' '+(i+1)} value={a.field==='alert'?a.kind:a.field} onChange={e=>{const field=['information','confirmation'].includes(e.target.value)?'alert':e.target.value;setDraft({...draft,actions:draft.actions.map((v,j)=>j===i?(field==='alert'?{field,kind:e.target.value,text:v.text||''}:{field,value:''}):v)});setResult(null);}}>
            {['category','payment','description',...(a.field==='tags'?['tags']:[]),'information','confirmation'].map(f=><option key={f} value={f} disabled={draft.actions.some((other,j)=>j!==i&&other.field===(['information','confirmation'].includes(f)?'alert':f))}>{f==='information'?E('informationAction'):f==='confirmation'?E('confirmationAction'):T(f)}</option>)}
          </select>
          {a.field==='alert'?<label>{E('message')}<textarea required maxLength={1000} placeholder={U('messagePlaceholder')} value={a.text} onChange={e=>patchAction(i,{text:e.target.value})}/></label>:valueInput(a.field,a.value,value=>patchAction(i,{value}),draft.categoryFilter?.direction||draft.trigger)}
          <button type="button" className="rule-remove" onClick={()=>{setDraft({...draft,actions:draft.actions.filter((_,j)=>j!==i)});setResult(null);}}>{L('Elimina')}</button>
        </fieldset>)}
        <button type="button" className="rule-secondary" disabled={editableActions.every(f=>draft.actions.some(a=>a.field===f))} onClick={()=>{const field=editableActions.find(f=>!draft.actions.some(a=>a.field===f));setDraft({...draft,actions:[...draft.actions,field==='alert'?{field,kind:'confirmation',text:''}:{field,value:''}]});setResult(null);}}>＋ {T('action')}</button></div>
      </section>}
      {editorTab==='then'&&test&&<fieldset className="rule-card rule-grid rule-test-card"><legend>{T('probe')}</legend><p className="rule-caption">{T('testHint')}</p>
        {['description','amount','direction','source','transactionType','category','payment'].filter(f=>test.direction!=='income'||f!=='payment').map(field=><label key={field}>{T(field)}{valueInput(field,test[field==='description'?'desc':field],value=>{setTest({...test,[field==='description'?'desc':field]:value,...(field==='direction'?{category:'',payment:''}:{})});setResult(null);},test.direction)}</label>)}
        <label className="rule-check"><input type="checkbox" checked={test.defaults} onChange={e=>{setTest({...test,defaults:e.target.checked});setResult(null);}}/>{T('defaultFields')}</label>
        <button type="button" className="rule-secondary" onClick={runTest}>{probeLabel}</button>
        {result&&<output className="rule-result"><div className="rule-flow-label">{D('result')}</div><strong>{T(result.matched.length?'matched':'unmatched')}</strong><p>{T('category')}: {choices('category',test.direction)?.find(c=>String(c.id)===String(test.direction==='income'?result.item.type:result.item.catId))?.name||'—'}</p>{test.direction!=='income'&&<p>{T('payment')}: {choices('payment')?.find(c=>String(c.id)===String(result.item.methodId))?.name||'—'}</p>}<p>{T('description')}: {result.item.desc}</p>{result.changed.map(field=><p key={field}>✓ {T(field==='methodId'?'payment':field==='catId'||field==='type'?'category':field==='desc'?'description':field)}: {D('applied')}</p>)}{result.skipped?.map((item,i)=><p key={i}>{T(item.field==='methodId'?'payment':item.field==='catId'||item.field==='type'?'category':item.field==='desc'?'description':item.field)}: {D(item.reason)}</p>)}{result.alerts.map(a=><p key={a.ruleId}>{actionName({field:'alert',...a})}: {a.text}</p>)}</output>}
      </fieldset>}
      </div>
      <div className={"rule-editor-footer tab-"+editorTab}>
        {editorTab==='when'&&<><span className="rule-footer-spacer" aria-hidden="true"/><button type="button" className="rule-primary" onClick={()=>setEditorTab('if')}>{L('Avanti')}</button></>}
        {editorTab==='if'&&<><button type="button" className="rule-secondary" onClick={()=>setEditorTab('when')}>{L('Indietro')}</button><button type="button" className="rule-primary" onClick={()=>setEditorTab('then')}>{L('Avanti')}</button></>}
        {editorTab==='then'&&<><button type="button" className="rule-secondary rule-test-footer" onClick={()=>{if(!test)showTest();else runTest();}}>{probeLabel}</button><button type="submit" className="rule-primary rule-save-footer" disabled={automaticRuleCategoryConflict(draft)}>{L('Salva')}</button><button type="button" className="rule-secondary rule-back-footer" onClick={()=>setEditorTab('if')}>{L('Indietro')}</button><span className="rule-footer-spacer" aria-hidden="true"/></>}
      </div>
    </form></div>}
    </div>
  </section>;
}
