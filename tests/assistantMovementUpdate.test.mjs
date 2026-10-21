import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
import {loadTypeScript} from './loadTypeScript.mjs';
const movement=loadTypeScript('src/finance/assistantMovementUpdate.ts');
const {latestPersonalMovement,previewMovementUpdate:preview,applyMovementUpdate:apply,isLatestMovementQuestion,isMovementCorrectionText,stripPreparationAnnouncements}=movement;
const rows=[{id:'future',createdAt:'2026-10-06T10:00:00Z',date:'2026-12-01',desc:'Future',amount:99,catId:1,methodId:1,methodName:'Carta principale'},
{id:'esselunga',createdAt:'2026-10-07T15:00:00Z',date:'2026-10-07',desc:'Esselunga',amount:52,catId:1,methodId:1,method:1,methodName:'Carta principale',currency:'EUR'}];
const ctx={userId:'u',lang:'it',currency:'EUR',sym:'€',dateFmt:'dmy',aiDataAccess:'full',expenses:rows,incomes:[],cats:[{id:1,name:'Supermercato'}],incomeTypes:[],methods:[{id:1,name:'Carta principale'},{id:2,name:'Contanti'}]};
assert.equal(latestPersonalMovement(ctx).id,'esselunga','Insertion time must outrank future expense date');
assert(isLatestMovementQuestion("Indicami qual è stata l’ultima spesa che ho inserito."));
assert(isMovementCorrectionText('Il metodo di pagamento è stato in contanti.'));
assert(!isMovementCorrectionText('Quale metodo di pagamento ho usato?'));
assert.equal(stripPreparationAnnouncements('Ok, preparo la modifica così potrai confermarla.'),'');
assert.equal(stripPreparationAnnouncements('Ok, preparo la modifica. Pagamento: Contanti. Confermi?'),'Pagamento: Contanti. Confermi?');
ctx.lastReferencedMovement={ownerUid:'u',kind:'expense',id:'esselunga'};
const plan=preview(ctx,{action:'update_movement',selection:'referenced',methodName:'Contanti'});
assert.equal(plan._patch.methodName,'Contanti');assert.equal(plan.movementId,'esselunga');assert.equal(ctx.expenses[1].methodId,1,'Preview must not write');
const changed=apply(rows,ctx,plan,'2026-10-08T10:00:00Z');
assert.deepEqual(changed[1],{...rows[1],methodId:2,method:2,methodName:'Contanti',updatedAt:'2026-10-08T10:00:00Z'});
assert.equal(changed[0],rows[0]);assert.equal(changed[1].amount,52);assert.equal(changed[1].catId,1);
assert.throws(()=>apply(changed,ctx,plan),/conflict/);
assert.throws(()=>apply(rows.map((r,i)=>i===1?{...r,amount:60}:r),ctx,plan),/conflict/);
assert.throws(()=>apply(rows,{...ctx,userId:'other'},plan),/conflict/);
assert.throws(()=>preview(ctx,{selection:'referenced',methodName:'Imaginary'}),/catalog/);
assert.throws(()=>preview({...ctx,lastReferencedMovement:null},{methodName:'Contanti'}),/target/);
assert.throws(()=>preview({...ctx,expenses:[{...rows[1],shareProjectId:'p'}]},{selection:'latest_created',methodName:'Contanti'}),/target/);
const recurring={...rows[1],id:'r1',source:'recurring',recurringRuleId:'rule',recurringOccurrenceDate:'2026-10-07',recurringOccurrenceId:'rule@2026-10-07'};
const rc={...ctx,expenses:[recurring,{...recurring,id:'r2'}]};
const rp=preview(rc,{movementId:'r1',methodName:'Contanti'});const rewritten=apply(rc.expenses,rc,rp);
assert(rewritten.every(r=>r.methodId===2&&r.recurringOverride));assert.equal(rewritten[0].recurringRuleId,'rule');assert.equal(rewritten[1].id,'r2');

// Execute the actual conversation handlers for the screenshot's full sequence.
const source=fs.readFileSync('src/sezioni.tsx','utf8'),ast=ts.createSourceFile('sezioni.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['movementLiveContext','handleLocalMovementTurn','updatePendingActions','confirmPending','executeActionUntracked','actionSummary'];const chunks=[];
function visit(n){if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))chunks.push(n.getText(ast));ts.forEachChild(n,visit);}visit(ast);assert.equal(chunks.length,names.length);
const code=ts.transpileModule(chunks.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const messages=[],spoken=[];let writes=0;
const live={...ctx,expenses:structuredClone(rows),financeEvolution:{rules:[]}};
live.setExpenses=fn=>{writes++;live.expenses=fn(live.expenses)};
const env={...movement,...loadTypeScript('src/finance/assistantAutomaticRules.ts'),...loadTypeScript('src/finance/assistantRecategorization.ts'),assistantLiveContextRef:{current:live},lastReferencedMovementRef:{current:null},operationDraftRef:{current:null},pendingActionsRef:{current:[]},activeAttachmentRef:{current:null},lastAssistantUserLanguageRef:{current:'it'},lastVoiceUserRequestRef:{current:''},lang:'it',userId:'u',currentPlan:'premium',c:live,cats:ctx.cats,
 normalized:movement.normalizedMovementText,fmtDate:(date)=>date,fmtAmt:(amount,sym)=>sym+' '+amount,
 setPendingActions(){},setBusy(){},setAiLoading(){},appendMessage:(role,text)=>messages.push({role,text}),speak:(text)=>spoken.push(text),sendRealtimeEvent:()=>true,assistantRuntimeText:(_lang,key)=>key==='done'?'Fatto.':key};
const handlers=new Function('env',`with(env){${code};return {${names.join(',')}};}`)(env);env.executeAction=handlers.executeActionUntracked;
assert(handlers.handleLocalMovementTurn("Indicami qual è stata l’ultima spesa che ho inserito.",{language:'it'}));
assert.equal(env.lastReferencedMovementRef.current.id,'esselunga');assert(messages.at(-1).text.includes('Esselunga'));assert(messages.at(-1).text.includes('52'));
assert(handlers.handleLocalMovementTurn('Il metodo di pagamento è stato in contanti.',{language:'it'}));
assert.equal(env.pendingActionsRef.current.length,1);assert.equal(env.pendingActionsRef.current[0].movementId,'esselunga');assert.equal(writes,0);
assert.equal(spoken.at(-1),'Pagamento: Contanti. Confermi?');assert(!spoken.some(text=>/preparo|preparing|procedo/i.test(text)));
handlers.confirmPending('sì');assert.equal(writes,1);assert.equal(live.expenses[1].methodName,'Contanti');assert.equal(live.expenses[1].amount,52);
handlers.confirmPending('sì');assert.equal(writes,1,'Repeated confirmation must not write twice');
handlers.handleLocalMovementTurn('Mostra ultima spesa',{language:'it'});assert(messages.at(-1).text.includes('Contanti'),'The next query must see the updated record, not the startup context');
live.aiDataAccess='summary';env.setAiChat=fn=>{const result=fn(messages);messages.splice(0,messages.length,...result)};
handlers.handleLocalMovementTurn('Mostra ultima spesa',{language:'it'});assert.equal(messages.at(-1).localOnly,true);assert(!spoken.at(-1).includes('52'));assert(!spoken.at(-1).includes('Esselunga'));
assert(source.includes('.filter(m=>!m.localOnly).slice(-8)'));assert(source.includes('return m&&!m.localOnly&&(m.role==='));
console.log('Screenshot sequence passed: latest inserted expense → declarative payment correction → immediate preview without preamble → confirmation → updated method and unchanged amounts/date/category.');

live.aiDataAccess='full';
const beforeWrites=writes;
handlers.handleLocalMovementTurn("Qual è la categoria di quest’ultima spesa che abbiamo aggiunto?",{language:'it'});
assert.equal(messages.at(-1).text,'Categoria: Supermercato.');
assert.equal(spoken.at(-1),'Categoria: Supermercato.');
handlers.handleLocalMovementTurn('Qual è il pagamento di questa spesa?',{language:'it'});
assert.equal(messages.at(-1).text,'Pagamento: Contanti.');
assert.equal(writes,beforeWrites,'Questions must not write');
assert(!messages.at(-1).text.includes('Confermi'));
console.log('Specific factual questions return only the requested field.');

live.cats.push({id:2,name:'Ristorante'});
assert(handlers.handleLocalMovementTurn('Modifica al ristorante',{language:'it'}));
assert.equal(env.pendingActionsRef.current[0].action,'update_movement');
assert.equal(env.pendingActionsRef.current[0].movementId,'esselunga');
assert.equal(env.pendingActionsRef.current[0]._patch.catId,2);
assert.equal(spoken.at(-1),'Categoria: Ristorante. Confermi?');
assert.equal(writes,beforeWrites,'A category correction is previewed, never immediately written');
assert.equal(movement.categoryCorrectionMentioned('Qual è la categoria Ristorante?',live.cats),null);
assert.equal(movement.categoryCorrectionMentioned('Modifica tutte le spese al Ristorante',live.cats),null);
handlers.handleLocalMovementTurn('Qual è la categoria di questa spesa?',{language:'it'});
assert.equal(env.pendingActionsRef.current.length,1,'Reading a field must preserve a pending proposal');
handlers.confirmPending('sì');assert.equal(live.expenses[1].catId,2);assert.equal(live.expenses[1].methodName,'Contanti');
console.log('Photo 2: explicit short category correction uses a local single-record preview.');
