import * as continuity from '../src/finance/assistantConversationContinuity.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {loadTypeScript} from './loadTypeScript.mjs';
const load=async path=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText).toString('base64'));
const {previewRecategorization:preview,applyRecategorization:apply,mergeRecategorization:merge,recategorizationText}=await load('src/finance/assistantRecategorization.ts');
const categories=[{id:1,name:'Altro'},{id:2,name:'Alimentari'}];
const rows=Array.from({length:1200},(_,i)=>({id:i,desc:'Supermercato X',catId:1,date:'2026-10-01',amount:i+.25,currency:'EUR',methodId:7,rateizzato:i===3,rate:3,note:'Preserve'}));
rows.push({id:'share',desc:'Supermercato X',catId:1,shareProjectId:'p'},{id:'virtual',desc:'Supermercato X',catId:1,virtual:true});
const request={descriptionFilter:'Supermercato X',categoryName:'Alimentari'};
const plan=preview(rows,categories,request);
assert.equal(plan.changed,1200);assert.equal(plan.matched,1200);
const result=apply(rows,categories,plan);
assert.equal(result.count,1200);assert.equal(result.rows.at(-1),rows.at(-1));assert.equal(result.rows.at(-2),rows.at(-2));
rows.slice(0,1200).forEach((row,i)=>assert.deepEqual(result.rows[i],{...row,catId:2}));
assert.equal(rows[0].catId,1,'Preview/apply must not mutate inputs');
assert.throws(()=>apply([...rows,{id:'new',desc:'Supermercato X',catId:1}],categories,plan),/conflict/);
assert.throws(()=>apply(rows.map((row,i)=>i===0?{...row,amount:99}:row),categories,plan),/conflict/);
assert.throws(()=>apply(rows.slice(1),categories,plan),/conflict/);
assert.throws(()=>apply(rows,[categories[0],{...categories[1],id:99}],plan),/conflict/);
assert.throws(()=>apply(result.rows,categories,plan),/unchanged/,'A repeated confirmation cannot write twice');
assert.throws(()=>preview(rows,[...categories,{id:3,name:'Alimentari'}],request),/invalidCategory/);
assert.throws(()=>preview(rows,categories,{...request,categoryName:'Unknown'}),/invalidCategory/);
assert.throws(()=>preview(rows,categories,{...request,descriptionFilter:''}),/missingDescription/);
assert.throws(()=>preview(rows,categories,{...request,categoryName:''}),/missingCategory/);
assert.throws(()=>preview(rows,categories,{...request,dateFrom:'2026-02-30'}),/invalidDate/);
assert.throws(()=>preview(rows,categories,{...request,dateFrom:'2027-01-01',dateTo:'2026-01-01'}),/invalidDate/);
assert.throws(()=>preview(rows,categories,{...request,matchMode:'regex'}),/invalidMode/);
assert.throws(()=>preview(rows,categories,{...request,descriptionFilter:'Supermercato'}),/noMatches/);
assert.equal(preview(rows,categories,{...request,descriptionFilter:'Supermercato',matchMode:'contains'}).matched,1200);
assert.equal(preview([...rows.slice(0,1),{...rows[0],id:'other',desc:'Supermercato  X'}],categories,request).matched,2);
assert.equal(preview([{...rows[0],desc:'CAFÉ'}],categories,{...request,descriptionFilter:'cafe\u0301'}).matched,1);
assert.throws(()=>preview([...rows,rows[0]],categories,request),/conflict/);
let draft=merge(null,{descriptionFilter:'Supermercato X'});draft=merge(draft,{categoryName:'Alimentari',descriptionFilter:null});assert.equal(draft.descriptionFilter,'Supermercato X');assert.equal(draft.categoryName,'Alimentari');
assert.equal(merge(draft,{categoryName:'Altro'}).descriptionFilter,draft.descriptionFilter);
for(const language of ['it','en','es','fr','de','pt','pl','nl','ro','el']){
  const message=recategorizationText(language,'preview',{count:1200,matched:1200,filter:'X',category:'Alimentari',matchMode:'exact'});
  assert(!message.includes('{'));assert(message.includes('1200'));
}
const logic=await load('src/assistantLogic.ts');
const session=logic.buildRealtimeManualResponseSessionUpdate({closeMicrophone:true,lockedLanguage:'it'}).session;
assert.equal(session.audio.input.noise_reduction.type,'near_field');
assert.equal(session.audio.input.transcription.model,'gpt-4o-transcribe');
assert.equal(session.audio.input.transcription.language,'it');
assert.equal(session.audio.input.turn_detection.type,'semantic_vad');
assert.equal(session.audio.input.turn_detection.create_response,false);
assert.equal(logic.buildRealtimeManualResponseSessionUpdate({}).session.audio.input.noise_reduction.type,'far_field');
assert.equal(logic.buildRealtimeManualResponseSessionUpdate({}).session.audio.input.transcription.language,undefined);
assert(logic.compactAssistantAnswer('word '.repeat(1000),'it',600).length<=601);
assert.equal(logic.getFainanceHelpAnswer('crea un alert per Alimentari','it'),'','Imperative actions must reach the agent');

// Run real component event and confirmation functions with IO boundaries mocked.
const source=fs.readFileSync('src/sezioni.tsx','utf8');
const ast=ts.createSourceFile('sezioni.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['handleRealtimeEvent','realtimeServerFailure','confirmPending','isYes','updatePendingActions'];const found=[];
function visit(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.push(node.getText(ast));ts.forEachChild(node,visit);}visit(ast);
assert.equal(found.length,names.length);
const code=ts.transpileModule(found.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const env={...continuity,sessionStorage:{getItem:()=>null},assistantTurnRef:{current:4},realtimeInputItemsRef:{current:new Map()},realtimeCompletedInputRef:{current:new Set()},realtimeUserDraftRef:{current:''},pendingActionsRef:{current:[]},operationDraftRef:{current:null},realtimeStatus:'connected',lang:'it',userId:'test-user',c:{expenses:rows},cats:categories,
  ...loadTypeScript('src/finance/assistantAutomaticRules.ts'),
  ...loadTypeScript('src/finance/assistantMovementUpdate.ts'),
  handleLocalMovementTurn:()=>false,movementLiveContext:()=>({}),
  realtimeResponseTurnsRef:{current:new Map()},realtimeAudioGenerationRef:{current:0},lastAssistantUserLanguageRef:{current:'it'},lastVoiceUserRequestRef:{current:''},
  mergeRecategorization:merge,previewRecategorization:preview,recategorizationText,
  setRealtimeUserDraft(){},setVoiceListening(){},setBusy(){},setPendingActions(){},clearVoiceNotice(){},showTemporaryVoiceNotice(){},assistantRuntimeText:()=> 'message',appendMessage(){},speak(){},
  resolveVoiceAssistantTurn:()=>({language:'it'}),appendVoiceMessage(){},isNo:()=>false,assistantLanguageControlReply:()=>'',getFainanceHelpAnswer:()=>'',normalized:x=>x,consumePlanFeature:null,activeAttachmentRef:{current:null},looksLikeDirectAppAction:()=>false,
  sendRealtimeModelResponse(){},sendRealtimeEvent(){},callAssistant(){},executeAction(){},cancelPending(){}};
let accepted=0,busyValue=true,executed=0;
env.appendVoiceMessage=()=>accepted++;env.setBusy=value=>busyValue=value;env.executeAction=()=>{executed++;return 'updated'};
const api=new Function('env',`with(env){${code};return {${names.join(',')}};}`)(env);
api.handleRealtimeEvent({type:'input_audio_buffer.committed',item_id:'old'});
env.assistantTurnRef.current=5;
api.handleRealtimeEvent({type:'conversation.item.input_audio_transcription.completed',item_id:'old',transcript:'stale'});
assert.equal(accepted,0);
api.handleRealtimeEvent({type:'input_audio_buffer.committed',item_id:'new'});
api.handleRealtimeEvent({type:'conversation.item.input_audio_transcription.delta',item_id:'new',delta:'ciao'});
api.handleRealtimeEvent({type:'conversation.item.input_audio_transcription.completed',item_id:'new'});
api.handleRealtimeEvent({type:'conversation.item.input_audio_transcription.completed',item_id:'new',transcript:'duplicate'});
assert.equal(accepted,1);
api.handleRealtimeEvent({type:'conversation.item.input_audio_transcription.completed',item_id:'empty',transcript:''});assert.equal(busyValue,false);
busyValue=true;api.handleRealtimeEvent({type:'conversation.item.input_audio_transcription.failed',item_id:'failed'});assert.equal(busyValue,false);
assert.equal(api.isYes('sì'),true);assert.equal(api.isYes('sì, ma cambia categoria'),false);assert.equal(api.isYes('okay do something else'),false);
assert.equal(api.updatePendingActions([{action:'recategorize_expenses',descriptionFilter:'Supermercato X'}]),false);
assert.equal(env.operationDraftRef.current.descriptionFilter,'Supermercato X');
assert.equal(api.updatePendingActions([{action:'recategorize_expenses',categoryName:'Alimentari'}]),true);
assert.equal(env.pendingActionsRef.current[0].changed,1200);
api.confirmPending('');api.confirmPending('');assert.equal(executed,1);
console.log('Assistant reliability: full archive selection, field retention, strict confirmation, conflicts, preservation, languages, transcript ordering/deduplication/errors and voice settings passed.');

let warnings=0,resolved=0;
env.showTemporaryVoiceNotice=()=>warnings++;
env.resolveVoiceAssistantTurn=()=>{resolved++;return {language:'it'}};
for(const [i,transcript] of ['fAInance.','fAInance. Personal finance, expenses, income, categories, descriptions, budgets, dates and payments.'].entries()){
 api.handleRealtimeEvent({type:'conversation.item.input_audio_transcription.completed',item_id:'echo'+i,transcript});
}
assert.equal(resolved,0,'Prompt echoes cannot change language');
assert.equal(accepted,1,'Prompt echoes cannot appear in chat');
api.handleRealtimeEvent({type:'conversation.item.input_audio_transcription.failed',item_id:'new'});
assert.equal(warnings,0,'A successful transcript cannot later become a hearing failure');
assert.equal(api.realtimeServerFailure({code:'response_cancel_not_active'}),'');
assert.equal(api.realtimeServerFailure({code:'output_audio_buffer_clear_failed'}),'');
env.assistantRuntimeText=(_lang,key)=>key;
assert.equal(api.realtimeServerFailure({code:'server_error'}),'unavailable');
assert.equal(api.realtimeServerFailure({code:'rate_limit_exceeded'}),'rateLimited');
assert(!movementEcho('Please tell me about fAInance'));
function movementEcho(text){return env.isVoicePromptEcho(text)}
assert.equal(logic.buildRealtimeManualResponseSessionUpdate({}).session.audio.input.transcription.prompt,undefined);
console.log('Prompt echo filtering, language protection and accurate service errors passed.');

assert(!logic.getFainanceHelpAnswer('Come creo un alert?','it').includes('Posso'));
