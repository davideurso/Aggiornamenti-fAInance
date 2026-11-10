import {saveAutomaticRule,deleteAutomaticRule} from './automaticRuleStore.js';
import {automaticRuleForEditor,MAX_RULE_CONDITIONS} from './automaticRules.js';
import {rulesText,ruleEnhancementText} from '../i18n/automaticRulesTranslations';
import {ruleEditorText} from '../i18n/ruleEditorTranslations';
import {legacyRuleLogicTokens,formatRuleLogic} from './automaticRuleFormula.js';

export const assistantRuleActions=['create_automatic_rule','update_automatic_rule','delete_automatic_rule'];
const normalize=(v:any)=>String(v??'').normalize('NFKC').trim().toLocaleLowerCase();
function fail(code:string):never{throw Object.assign(new Error(code),{code});}
const fields=['ruleApplyOnEdit','ruleName','ruleId','newRuleName','ruleTrigger','ruleMatch','ruleEnabled','ruleScopeCategoryName','ruleScopeDirection','clearRuleScope','ruleConditions','ruleConditionGroups','ruleLogicTokens','ruleActions','replaceRuleConditions','replaceRuleActions','removeRuleConditionIndexes','removeRuleActionFields'];
export function mergeRuleRequest(previous:any,input:any){
  const action=String(input.action||'');
  const newTarget=action!=='create_automatic_rule'&&((input.ruleId&&previous?.ruleId&&input.ruleId!==previous.ruleId)||(input.ruleName&&previous?.ruleName&&normalize(input.ruleName)!==normalize(previous.ruleName)));
  const next:any=previous?.action===action&&!newTarget?{...previous}:{action};
  for(const field of fields)if(input[field]!==undefined&&input[field]!==null)next[field]=structuredClone(input[field]);
  return next;
}
/** The Rule Builder always creates ONE draft; alternate branches are OR groups.
 * Never combine branches with different actions, targets or scopes.
 * An incompatible proposal needs clarification rather than silent multiple writes. */
export function combineBuilderRuleProposals(inputs:any[]){
  if(!Array.isArray(inputs)||inputs.length<1||inputs.some(a=>a?.action!=='create_automatic_rule'))fail('INVALID_RULE_BUILDER_ACTIONS');
  if(inputs.length===1)return inputs[0];
  const first=inputs[0];
  const normalizedActions=(a:any)=>JSON.stringify((a.ruleActions||[]).map((x:any)=>({field:x.field,value:normalize(x.value),kind:x.kind,text:normalize(x.text)})).sort((a:any,b:any)=>a.field.localeCompare(b.field)));
  const sameScope=(a:any)=>normalize(a.ruleTrigger)===normalize(first.ruleTrigger)&&normalize(a.ruleScopeCategoryName)===normalize(first.ruleScopeCategoryName)&&normalize(a.ruleScopeDirection)===normalize(first.ruleScopeDirection)&&normalizedActions(a)===normalizedActions(first);
  if(inputs.some(a=>!sameScope(a)))fail('INVALID_RULE_BUILDER_ACTIONS');
  const combined:any[]=[];const tokens:string[]=[];
  for(const proposal of inputs){
    if(!Array.isArray(proposal.ruleConditions)||!proposal.ruleConditions.length)fail('missingConditions');
    const offset=combined.length;
    for(const item of proposal.ruleConditions)combined.push({...item});
    const localTokens=Array.isArray(proposal.ruleLogicTokens)?proposal.ruleLogicTokens:legacyRuleLogicTokens({conditions:proposal.ruleConditions,match:proposal.ruleMatch||'all',conditionGroups:proposal.ruleConditionGroups||[]});
    if(!localTokens.length)fail('INVALID_RULE_FORMULA');
    if(tokens.length)tokens.push('any');
    tokens.push('(',...localTokens.map((token:any)=>/^[1-6]$/.test(String(token))?String(Number(token)+offset):token),')');
  }
  if(combined.length>MAX_RULE_CONDITIONS)fail('RULE_CONDITION_LIMIT');
  return {...first,ruleName:inputs.map(a=>String(a.ruleName||'').trim()).filter(Boolean).join(' / ').slice(0,120),ruleConditions:combined,ruleLogicTokens:tokens,ruleConditionGroups:undefined,ruleMatch:'all'};
}
function choose(list:any[],value:any){const matches=(list||[]).filter(c=>!c.archived&&(String(c.id)===String(value)||normalize(c.name)===normalize(value)));if(matches.length!==1)fail('invalidCatalog');return matches[0].id;}
function categoryList(ctx:any,rule:any){const direction=rule.categoryFilter?.direction||rule.trigger;if(direction==='movement')fail('missingTrigger');return direction==='income'?ctx.incomeTypes:ctx.cats;}
function condition(c:any,ctx:any,rule:any){const result:any={field:c.field,operator:c.operator,value:c.value};if(c.join!==undefined)result.join=c.join;if(c.field==='category')result.value=choose(categoryList(ctx,rule),c.value);if(c.field==='payment')result.value=choose(ctx.methods,c.value);return result;}
function action(a:any,ctx:any,rule:any){const result:any=a.field==='alert'?{field:'alert',kind:a.kind,text:a.text}:{field:a.field,value:a.value};if(a.field==='category')result.value=choose(categoryList(ctx,rule),a.value);if(a.field==='payment')result.value=choose(ctx.methods,a.value);return result;}
export function previewRuleRequest(finance:any,ctx:any,input:any,idFactory=()=>crypto.randomUUID()){
  if(!assistantRuleActions.includes(input.action))fail('unsupported');
  const create=input.action==='create_automatic_rule';
  const candidates=(finance.rules||[]).filter((r:any)=>r.kind==='automatic-v1'&&(input.ruleId?String(r.id)===String(input.ruleId):normalize(r.name)===normalize(input.ruleName)));
  let old:any=null;
  if(!create){if(!input.ruleName&&!input.ruleId)fail('missingTarget');if(candidates.length!==1)fail('targetAmbiguous');old=candidates[0];}
  const base:any={...input,ruleName:old?.name||input.ruleName,_ruleId:old?.id,_ruleBefore:old?JSON.stringify(old):null};
  if(input.action==='delete_automatic_rule')return base;
  if(!create&&!fields.filter(field=>!['ruleName','ruleId'].includes(field)).some(field=>input[field]!==undefined))fail('missingChanges');
  const draft:any=create?{id:idFactory(),kind:'automatic-v1',name:input.ruleName||'',enabled:true,revision:0,priority:0,trigger:input.ruleTrigger,categoryFilter:null,match:'all',conditions:[],actions:[],alert:null}:automaticRuleForEditor(old);
  if(input.newRuleName!==undefined)draft.name=String(input.newRuleName).trim();
  if(!String(draft.name||'').trim())fail('missingName');
  if(create&&(finance.rules||[]).some((r:any)=>r.kind==='automatic-v1'&&normalize(r.name)===normalize(draft.name)))fail('duplicateName');
  if(input.ruleTrigger!==undefined)draft.trigger=input.ruleTrigger;
  if(!['expense','income','movement'].includes(draft.trigger))fail('missingTrigger');
  if(input.ruleMatch!==undefined)draft.match=input.ruleMatch;
  if(input.ruleApplyOnEdit!==undefined){if(typeof input.ruleApplyOnEdit!=='boolean')fail('invalidRule');draft.applyOnEdit=input.ruleApplyOnEdit;}
  if(input.ruleEnabled!==undefined){if(typeof input.ruleEnabled!=='boolean')fail('invalidRule');draft.enabled=input.ruleEnabled;}
  if(input.clearRuleScope===true)draft.categoryFilter=null;
  if(input.ruleScopeCategoryName!==undefined){const direction=input.ruleScopeDirection||draft.trigger;if(!['income','expense'].includes(direction))fail('missingTrigger');draft.categoryFilter={direction,value:choose(direction==='income'?ctx.incomeTypes:ctx.cats,input.ruleScopeCategoryName)};}
  if(input.removeRuleConditionIndexes!==undefined){const indices=input.removeRuleConditionIndexes;if(!Array.isArray(indices)||indices.some((i:any)=>!Number.isInteger(i)||i<0||i>=draft.conditions.length))fail('conditionAmbiguous');draft.conditions=draft.conditions.filter((_:any,i:number)=>!indices.includes(i));draft.conditionGroups=[];}
  if(input.ruleConditions!==undefined){
    if(!Array.isArray(input.ruleConditions))fail('missingConditions');
    if(create||input.replaceRuleConditions===true){draft.conditions=input.ruleConditions.map((c:any)=>condition(c,ctx,draft));draft.conditionGroups=[];}
    else for(const patch of input.ruleConditions){
      let index=patch.index;
      if(index===undefined){const matches=draft.conditions.map((c:any,i:number)=>({c,i})).filter(({c}:any)=>c.field===patch.field);if(matches.length>1)fail('conditionAmbiguous');index=matches.length?matches[0].i:draft.conditions.length;}
      if(!Number.isInteger(index)||index<0||index>draft.conditions.length)fail('conditionAmbiguous');
      const next=condition({...draft.conditions[index],...patch},ctx,draft);
      if(index===draft.conditions.length){draft.conditions.push(next);draft.conditionGroups=[];}else draft.conditions[index]=next;
    }
  }
  if(input.removeRuleActionFields!==undefined){if(!Array.isArray(input.removeRuleActionFields)||input.removeRuleActionFields.some((field:any)=>!['category','payment','description','tags','alert'].includes(field)))fail('missingActions');draft.actions=draft.actions.filter((a:any)=>!input.removeRuleActionFields.includes(a.field));}
  if(input.ruleActions!==undefined){
    if(!Array.isArray(input.ruleActions))fail('missingActions');
    if(create||input.replaceRuleActions===true)draft.actions=input.ruleActions.map((a:any)=>action(a,ctx,draft));
    else for(const patch of input.ruleActions){const index=draft.actions.findIndex((a:any)=>a.field===patch.field),next=action({...draft.actions[index],...patch},ctx,draft);if(index<0)draft.actions.push(next);else draft.actions[index]=next;}
  }
  if(input.ruleLogicTokens!==undefined){
    if(!Array.isArray(input.ruleLogicTokens))fail('INVALID_RULE_FORMULA');
    draft.logicTokens=input.ruleLogicTokens.map((token:any)=>String(token));
  }
  if(input.ruleConditionGroups!==undefined){
    if(!Array.isArray(input.ruleConditionGroups))fail('INVALID_RULE_GROUP');
    draft.conditionGroups=input.ruleConditionGroups.map((g:any)=>({start:g.start,end:g.end}));
  }
  if(draft.conditions.length>MAX_RULE_CONDITIONS)fail('RULE_CONDITION_LIMIT');
  if(!draft.conditions.length)fail('missingConditions');if(!draft.actions.length&&!draft.alert)fail('missingActions');
  // Validate through the same store used by the manual editor. This is a pure preview.
  draft.expectedRevision=old?.revision;
  const validated=saveAutomaticRule(finance,draft,ctx.currentPlan);
  return {...base,ruleName:create?draft.name:old.name,_preparedRule:validated.rules.find((r:any)=>r.id===draft.id),_ruleId:draft.id};
}
export function applyRuleRequest(finance:any,ctx:any,preview:any){
  const old=(finance.rules||[]).find((r:any)=>r.id===preview._ruleId);
  if(preview.action==='create_automatic_rule'){if(old)fail('RULE_CONFLICT');const fresh=previewRuleRequest(finance,ctx,preview,()=>preview._ruleId);return saveAutomaticRule(finance,fresh._preparedRule,ctx.currentPlan);}
  if(!old||JSON.stringify(old)!==preview._ruleBefore)fail('RULE_CONFLICT');
  if(preview.action==='delete_automatic_rule')return deleteAutomaticRule(finance,old.id,old.revision);
  const fresh=previewRuleRequest(finance,ctx,preview,()=>preview._ruleId);
  return saveAutomaticRule(finance,{...fresh._preparedRule,expectedRevision:old.revision},ctx.currentPlan);
}
const questions:any={
  it:['Quale regola vuoi modificare o eliminare?','Il nome non identifica una sola regola. Indica il nome esatto.','Come vuoi chiamare la regola?','La regola deve riguardare entrate o uscite?','Quali condizioni devono attivare la regola?','Cosa deve fare la regola?','La categoria o il pagamento non è presente o è ambiguo. Indica una voce esistente.','Quale condizione vuoi modificare? Ci sono più condizioni sullo stesso campo.','Esiste già una regola con questo nome. Scegli un altro nome.','La regola è cambiata. Riaprila o richiedi una nuova anteprima.'],
  en:['Which rule do you want to edit or delete?','The name does not identify one rule. Give the exact name.','What should the rule be called?','Should the rule apply to income or expenses?','Which conditions should trigger the rule?','What should the rule do?','The category or payment method is missing or ambiguous. Give an existing item.','Which condition should change? Multiple conditions use that field.','A rule already has this name. Choose another name.','The rule changed. Reopen it or request a new preview.'],
  es:['¿Qué regla quieres modificar o eliminar?','El nombre no identifica una sola regla. Indica el nombre exacto.','¿Cómo quieres llamar la regla?','¿La regla es para ingresos o gastos?','¿Qué condiciones deben activar la regla?','¿Qué debe hacer la regla?','La categoría o el pago no existe o es ambiguo. Indica una opción existente.','¿Qué condición quieres modificar? Hay varias en ese campo.','Ya existe una regla con ese nombre. Elige otro.','La regla cambió. Ábrela de nuevo o solicita otra vista previa.'],
  fr:['Quelle règle voulez-vous modifier ou supprimer ?','Le nom ne désigne pas une seule règle. Donnez le nom exact.','Comment nommer la règle ?','La règle concerne-t-elle les revenus ou les dépenses ?','Quelles conditions doivent déclencher la règle ?','Que doit faire la règle ?','La catégorie ou le paiement est absent ou ambigu. Choisissez une option existante.','Quelle condition faut-il modifier ? Plusieurs utilisent ce champ.','Une règle porte déjà ce nom. Choisissez-en un autre.','La règle a changé. Rouvrez-la ou demandez un nouvel aperçu.'],
  de:['Welche Regel möchtest du ändern oder löschen?','Der Name ist nicht eindeutig. Nenne den genauen Namen.','Wie soll die Regel heißen?','Soll die Regel Einnahmen oder Ausgaben betreffen?','Welche Bedingungen sollen die Regel auslösen?','Was soll die Regel tun?','Kategorie oder Zahlung fehlt oder ist mehrdeutig. Wähle einen vorhandenen Eintrag.','Welche Bedingung soll geändert werden? Mehrere nutzen dieses Feld.','Eine Regel heißt bereits so. Wähle einen anderen Namen.','Die Regel wurde geändert. Öffne sie erneut oder fordere eine neue Vorschau an.'],
  pt:['Que regra queres modificar ou eliminar?','O nome não identifica uma única regra. Indica o nome exato.','Como queres chamar a regra?','A regra deve aplicar-se a receitas ou despesas?','Que condições devem ativar a regra?','O que deve fazer a regra?','A categoria ou o pagamento não existe ou é ambíguo. Escolhe uma opção existente.','Que condição queres modificar? Há várias nesse campo.','Já existe uma regra com esse nome. Escolhe outro.','A regra mudou. Abre-a novamente ou pede outra prévia.'],
  pl:['Którą regułę chcesz zmienić lub usunąć?','Nazwa nie wskazuje jednej reguły. Podaj dokładną nazwę.','Jak nazwać regułę?','Czy reguła dotyczy przychodów czy wydatków?','Jakie warunki mają uruchamiać regułę?','Co ma robić reguła?','Kategoria lub płatność nie istnieje lub jest niejednoznaczna. Wybierz istniejącą pozycję.','Który warunek zmienić? Kilka używa tego pola.','Reguła o tej nazwie już istnieje. Wybierz inną nazwę.','Reguła się zmieniła. Otwórz ją ponownie lub poproś o nowy podgląd.'],
  nl:['Welke regel wil je wijzigen of verwijderen?','De naam is niet uniek. Geef de exacte naam.','Hoe moet de regel heten?','Geldt de regel voor inkomsten of uitgaven?','Welke voorwaarden moeten de regel activeren?','Wat moet de regel doen?','De categorie of betaling ontbreekt of is dubbelzinnig. Kies een bestaande optie.','Welke voorwaarde wil je wijzigen? Meerdere gebruiken dit veld.','Er bestaat al een regel met deze naam. Kies een andere naam.','De regel is gewijzigd. Open hem opnieuw of vraag een nieuw overzicht.'],
  ro:['Ce regulă vrei să modifici sau să ștergi?','Numele nu identifică o singură regulă. Indică numele exact.','Cum vrei să numești regula?','Regula se aplică veniturilor sau cheltuielilor?','Ce condiții trebuie să activeze regula?','Ce trebuie să facă regula?','Categoria sau plata lipsește ori este ambiguă. Alege o opțiune existentă.','Ce condiție vrei să modifici? Mai multe folosesc acest câmp.','Există deja o regulă cu acest nume. Alege altul.','Regula s-a schimbat. Redeschide-o sau cere o nouă previzualizare.'],
  el:['Ποιον κανόνα θέλετε να αλλάξετε ή να διαγράψετε;','Το όνομα δεν προσδιορίζει έναν κανόνα. Δώστε το ακριβές όνομα.','Πώς να ονομαστεί ο κανόνας;','Ο κανόνας αφορά έσοδα ή έξοδα;','Ποιες συνθήκες πρέπει να ενεργοποιούν τον κανόνα;','Τι πρέπει να κάνει ο κανόνας;','Η κατηγορία ή η πληρωμή λείπει ή είναι ασαφής. Επιλέξτε υπάρχουσα επιλογή.','Ποια συνθήκη θέλετε να αλλάξετε; Πολλές χρησιμοποιούν το πεδίο.','Υπάρχει ήδη κανόνας με αυτό το όνομα. Επιλέξτε άλλο.','Ο κανόνας άλλαξε. Ανοίξτε τον ξανά ή ζητήστε νέα προεπισκόπηση.']
};
const questionKeys=['missingTarget','targetAmbiguous','missingName','missingTrigger','missingConditions','missingActions','invalidCatalog','conditionAmbiguous','duplicateName','RULE_CONFLICT'];
const changeQuestions:any={it:'Cosa vuoi modificare nella regola?',en:'What should change in the rule?',es:'¿Qué quieres modificar en la regla?',fr:'Que voulez-vous modifier dans la règle ?',de:'Was möchtest du an der Regel ändern?',pt:'O que queres modificar na regra?',pl:'Co chcesz zmienić w regule?',nl:'Wat wil je wijzigen in de regel?',ro:'Ce vrei să modifici în regulă?',el:'Τι θέλετε να αλλάξετε στον κανόνα;'};
const builderConflictErrors:Record<string,string>={it:'La proposta contiene più regole con azioni diverse. Descrivi un unico risultato oppure specifica come combinarle, così potrò creare una sola regola.',en:'The proposal contains multiple rules with different actions. Describe one common outcome or clarify how to combine them into one rule.',es:'La propuesta contiene varias reglas con acciones distintas. Indica un único resultado o aclara cómo combinarlas.',fr:'La proposition contient plusieurs règles aux actions différentes. Indiquez un résultat unique ou comment les combiner.',de:'Der Vorschlag enthält mehrere Regeln mit verschiedenen Aktionen. Gib ein gemeinsames Ergebnis an oder erkläre die Verknüpfung.',pt:'A proposta contém várias regras com ações diferentes. Indica um único resultado ou explica como combiná-las.',pl:'Propozycja zawiera kilka reguł z różnymi działaniami. Podaj wspólny wynik lub wyjaśnij, jak je połączyć.',nl:'Het voorstel bevat meerdere regels met verschillende acties. Geef één gezamenlijk resultaat op of leg uit hoe je ze wilt combineren.',ro:'Propunerea conține mai multe reguli cu acțiuni diferite. Precizează un rezultat comun sau cum să fie combinate.',el:'Η πρόταση περιέχει πολλούς κανόνες με διαφορετικές ενέργειες. Δώστε ένα κοινό αποτέλεσμα ή διευκρινίστε πώς θα συνδυαστούν.'};
export function assistantRuleError(language:any,code:any){if(code==='INVALID_RULE_BUILDER_ACTIONS')return builderConflictErrors[language]||builderConflictErrors.en;if(code==='RULE_CONDITION_LIMIT')return ruleEnhancementText(language,'conditionLimit');if(code==='missingChanges')return changeQuestions[language]||changeQuestions.en;if(code==='INVALID_RULE_CONDITION')code='missingConditions';if(['INVALID_RULE_ACTION','INVALID_RULE_ALERT','DUPLICATE_RULE_ACTION','DUPLICATE_RULE_ALERT'].includes(code))code='missingActions';const index=questionKeys.indexOf(code);return index>=0?(questions[language]||questions.en)[index]:rulesText(language,code==='RULE_LIMIT'?'limit':'error');}
const operations:any={it:['Crea regola','Modifica regola','Elimina regola','Confermi?'],en:['Create rule','Edit rule','Delete rule','Confirm?'],es:['Crear regla','Modificar regla','Eliminar regla','¿Confirmas?'],fr:['Créer la règle','Modifier la règle','Supprimer la règle','Confirmez-vous ?'],de:['Regel erstellen','Regel ändern','Regel löschen','Bestätigen?'],pt:['Criar regra','Modificar regra','Eliminar regra','Confirmas?'],pl:['Utwórz regułę','Zmień regułę','Usuń regułę','Potwierdzasz?'],nl:['Regel maken','Regel wijzigen','Regel verwijderen','Bevestigen?'],ro:['Creează regula','Modifică regula','Șterge regula','Confirmi?'],el:['Δημιουργία κανόνα','Αλλαγή κανόνα','Διαγραφή κανόνα','Επιβεβαιώνετε;']};
export function ruleRequestSummary(preview:any,ctx:any,brief=false){
  const language=ctx.lang||'it',labels=operations[language]||operations.en;
  const renamed=preview._preparedRule?.name&&preview._preparedRule.name!==preview.ruleName?' → «'+preview._preparedRule.name+'»':'';
  const heading=labels[assistantRuleActions.indexOf(preview.action)]+' «'+preview.ruleName+'»'+renamed+'.';
  if(brief||preview.action==='delete_automatic_rule')return heading+' '+labels[3];
  const rule=preview._preparedRule;
  function value(field:string,v:any){const direction=rule.categoryFilter?.direction||rule.trigger;const list=field==='category'?(direction==='income'?ctx.incomeTypes:direction==='expense'?ctx.cats:[...(ctx.cats||[]),...(ctx.incomeTypes||[])]):field==='payment'?ctx.methods:null;return list?.filter((c:any)=>String(c.id)===String(v)).map((c:any)=>c.name).join(' / ')||String(v??'');}
  const conditions=rule.logicTokens?formatRuleLogic(rule.logicTokens,rule.conditions.map((c:any)=>rulesText(language,c.field)+' '+(rulesText(language,c.operator)||ruleEnhancementText(language,c.operator))+' '+value(c.field,c.value)),ruleEnhancementText(language,'and'),ruleEnhancementText(language,'or')):rule.conditions.map((c:any,i:number)=>{
    const join=i?((c.join||rule.match)==='all'?' '+ruleEnhancementText(language,'and')+' ':' '+ruleEnhancementText(language,'or')+' '):'';
    const opening='('.repeat((rule.conditionGroups||[]).filter((g:any)=>g.start===i).length);
    const closing=')'.repeat((rule.conditionGroups||[]).filter((g:any)=>g.end===i).length);
    return join+opening+rulesText(language,c.field)+' '+(rulesText(language,c.operator)||ruleEnhancementText(language,c.operator))+' '+value(c.field,c.value)+closing;
  }).join('');
  const actions=rule.actions.map((a:any)=>(rulesText(language,a.field)||ruleEnhancementText(language,a.field))+': '+(a.field==='alert'?rulesText(language,a.kind)+' — '+a.text:value(a.field,a.value))).join('; ');
  const scope=rule.categoryFilter?categoryList(ctx,rule)?.find((c:any)=>String(c.id)===String(rule.categoryFilter.value))?.name||String(rule.categoryFilter.value):ruleEditorText(language,'allCategories');
  const explanation=ruleEnhancementText(language,'explainRule')+': '+rulesText(language,'when')+' '+rulesText(language,rule.trigger)+' ('+scope+'), '+rulesText(language,'if')+' '+conditions+', '+rulesText(language,'then')+' '+actions+'.';
  return [heading,ruleEditorText(language,rule.enabled?'active':'inactive'),explanation,labels[3]].join('\n');
}
