import * as continuity from '../src/finance/assistantConversationContinuity.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Execute the actual component functions, with browser/network boundaries mocked.
const source=fs.readFileSync('src/sezioni.tsx','utf8');
const ast=ts.createSourceFile('sezioni.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['stopLocalSpeech','stopSpeaking','interruptAssistantTurn','isCurrentAssistantTurn',
 'handleRealtimeEvent','resumeListeningAfterSpeech','speak','speakFallback','callAssistant',
 'sendMessage','sendRealtimeModelResponse','applyAssistantSystemVolume','onSystemVolume'];
const found=new Map();
function visit(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);}
visit(ast);assert.equal(found.size,names.length);
const code=ts.transpileModule([...found.values()].join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const factory=new Function('env',`with(env){${code};return {${names.join(',')}};}`);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function harness(){
 const sent=[],states=[],messages=[],players=[];
 const e={};
 for(const name of new Set(source.match(/\b\w+Ref\b/g)))e[name]={current:null};
 for(const name of new Set(code.match(/\bset[A-Z]\w+/g)))e[name]=(...args)=>states.push([name,...args]);
 Object.assign(e,{...continuity,sessionStorage:{getItem:()=>null},
  mountedRef:{current:true},speechCycleRef:{current:0},assistantTurnRef:{current:0},
  realtimeAudioGenerationRef:{current:0},realtimeResponseTurnsRef:{current:new Map()},
  realtimeOutputBlockedRef:{current:false},assistantVolumeRef:{current:1},
  nativeRealtimeCommunicationRef:{current:true},
  realtimeAssistantDraftRef:{current:''},realtimeUserDraftRef:{current:''},
  systemMediaMutedRef:{current:false},pendingActionsRef:{current:[]},
  realtimeAudioRef:{current:{muted:false,volume:1}},continuous:true,voiceModal:true,
  window:{speechSynthesis:{cancel(){}}},sendRealtimeEvent:x=>(sent.push(x),true),
  nativePlatformName:()=> 'android',clampAssistantVolume:v=>Math.max(0,Math.min(1,v)),
  clearVoiceNotice(){},startAnalyticsFlow(){},finishAnalyticsFlow(){},
  cleanSpeechText:s=>s,lang:'it',setNativeAssistantAudio:async()=>{},syncSystemMediaVolume:async()=>1,
  AI_VOICE_ENDPOINT:'/voice',AI_AGENT_ENDPOINT:'/agent',
  authenticatedAiFetch:async()=>({ok:true,blob:async()=>new Blob(['audio'])}),
  Audio:class{constructor(url){this.src=url;this.paused=true;players.push(this);}async play(){this.paused=false;}pause(){this.paused=true;}},
  startListening(){throw Error('A second recognizer must not start during Realtime');},
  realtimeTurnDirective:()=> 'directive',realtimeStatus:'connected',documentLoading:false,
  input:'',stopListening(){},pendingActions:[],resolveVoiceAssistantTurn:()=>({language:'it'}),
  assistantLanguageControlReply:()=>'',getFainanceHelpAnswer:()=>'',consumePlanFeature:null,
  appendMessage:(role,text)=>messages.push({role,text}),sendRealtimeText:()=>true,
  fbAuth:{currentUser:{getIdToken:async()=> 'mock'}},aiDataAccess:'summary',aiChat:[],
  buildContext:()=>({}),buildAssistantRequestPayload:()=>({language:'it',payload:{}}),
  assistantRuntimeText:()=> 'message',assistantAnswerNeedsTranslation:()=>false,
  compactAssistantAnswer:s=>s,realtimeActionsFrom:()=>[],
  stripPreparationAnnouncements:s=>s,handleLocalMovementTurn:()=>false,currentVoiceLanguageResolution:()=>({language:'it'}),
  realtimeFailureMessage:()=> 'unexpected error',
 });
 const api=factory(e);return {e,api,sent,states,messages,players};
}
{
 const h=harness(),pending=new AbortController(),speech=new AbortController();
 const player=new h.e.Audio('');player.paused=false;
 h.e.nativeAudioRef.current=player;h.e.speechAbortRef.current=speech;h.e.assistantRequestAbortRef.current=pending;
 h.api.handleRealtimeEvent({type:'input_audio_buffer.speech_started'});
 assert(player.paused);assert(speech.signal.aborted);assert(pending.signal.aborted);
 assert(h.e.realtimeAudioRef.current.muted);assert.equal(h.e.assistantTurnRef.current,1);
 assert.deepEqual(h.sent.map(x=>x.type),['response.cancel','output_audio_buffer.clear']);
}
{
 const h=harness();const old=new h.e.Audio('');old.paused=false;h.e.nativeAudioRef.current=old;
 h.api.sendMessage('Nuova richiesta');
 assert(old.paused);assert(h.e.realtimeAudioRef.current.muted);
 assert.equal(h.messages[0].text,'Nuova richiesta');
}
{
 const h=harness();await h.api.speak('prima',false);assert(!h.players[0].paused);
 await h.api.speak('seconda',false);assert(h.players[0].paused);assert(!h.players[1].paused);
 h.api.stopSpeaking();
}
{
 const h=harness(),blob=deferred(),fetchStarted=deferred();
 h.e.authenticatedAiFetch=async()=>{fetchStarted.resolve();return {ok:true,blob:()=>blob.promise};};
 const pending=h.api.speak('Audio arrivato tardi',false);await fetchStarted.promise;
 h.api.interruptAssistantTurn();blob.resolve(new Blob(['late']));await pending;
 assert.equal(h.players.length,0,'Interrupted pending audio must never play');
}
{
 const h=harness();h.api.sendRealtimeModelResponse({language:'it'});
 const metadata=h.sent.find(x=>x.type==='response.create').response.metadata;
 h.api.handleRealtimeEvent({type:'response.created',response:{id:'old',metadata}});
 h.api.interruptAssistantTurn();
 h.api.handleRealtimeEvent({type:'output_audio_buffer.started',response_id:'old'});
 assert(h.e.realtimeAudioRef.current.muted,'Old output event must not unmute');
 h.api.handleRealtimeEvent({type:'response.created',response:{id:'late',metadata}});
 assert(h.sent.some(x=>x.type==='response.cancel'&&x.response_id==='late'));
 h.api.sendRealtimeModelResponse({language:'it'});
 const next=h.sent.filter(x=>x.type==='response.create').at(-1).response.metadata;
 h.api.handleRealtimeEvent({type:'response.created',response:{id:'new',metadata:next}});
 h.api.handleRealtimeEvent({type:'output_audio_buffer.started',response_id:'new'});
 assert(!h.e.realtimeAudioRef.current.muted,'New output must remain audible');
}
{
 const h=harness(),token=deferred();let fetches=0;
 h.e.fbAuth.currentUser.getIdToken=()=>token.promise;
 h.e.authenticatedAiFetch=async()=>{fetches++;throw Error('stale fetch');};
 const pending=h.api.callAssistant('old');h.api.interruptAssistantTurn();token.resolve('mock');await pending;
 assert.equal(fetches,0);assert.equal(h.messages.length,0);
}
{
 const h=harness(),result=deferred(),started=deferred();
 h.e.authenticatedAiFetch=async()=>{started.resolve();return {ok:true,json:()=>result.promise};};
 const pending=h.api.callAssistant('old');await started.promise;
 h.api.interruptAssistantTurn();result.resolve({answer:'stale answer'});await pending;
 assert.equal(h.messages.length,0);assert.equal(h.players.length,0);
}
{
 const h=harness();h.e.authenticatedAiFetch=async()=>({ok:true,json:async()=>({answer:'Risposta valida'})});
 await h.api.callAssistant('new');assert.equal(h.messages[0].text,'Risposta valida');h.api.stopSpeaking();
}
{
 const h=harness();const local=new h.e.Audio('');h.e.nativeAudioRef.current=local;
 h.api.applyAssistantSystemVolume(0,true);
 assert.equal(h.e.realtimeAudioRef.current.volume,0,'Communication audio must reach true zero');
 assert.equal(h.e.realtimeAudioRef.current.muted,true);
 assert.equal(local.volume,1,'Local media must not be attenuated twice');assert(local.muted);
 h.api.applyAssistantSystemVolume(0.4,false);
 assert.equal(h.e.realtimeAudioRef.current.volume,0.4);assert.equal(h.e.realtimeAudioRef.current.muted,false);
 assert.equal(local.volume,1);assert.equal(local.muted,false,'Turning volume up must restore audio');
 h.e.nativeRealtimeCommunicationRef.current=false;h.api.applyAssistantSystemVolume(0.4,false);
 assert.equal(h.e.realtimeAudioRef.current.volume,1,'Media-routed Realtime must not be attenuated twice');
 h.api.applyAssistantSystemVolume(0,false);assert.equal(h.e.realtimeAudioRef.current.muted,true);
 h.api.stopSpeaking();h.api.applyAssistantSystemVolume(1,false);
 assert.equal(h.e.realtimeAudioRef.current.muted,true,'Volume update must not undo interruption');
 h.e.realtimeChannelRef.current={readyState:'open'};h.api.resumeListeningAfterSpeech(true,h.e.speechCycleRef.current);
}
{
 const h=harness();h.api.applyAssistantSystemVolume(0,false);
 h.api.sendRealtimeModelResponse({language:'it'});
 const metadata=h.sent.find(x=>x.type==='response.create').response.metadata;
 h.api.handleRealtimeEvent({type:'response.created',response:{id:'muted-new',metadata}});
 h.api.handleRealtimeEvent({type:'output_audio_buffer.started',response_id:'muted-new'});
 assert(h.e.realtimeAudioRef.current.muted,'A new response must not bypass system zero');
 await h.api.speak('new local response at zero',false);
 assert(h.players[0].muted,'A newly created local player must also respect zero');
 h.api.stopSpeaking();
}
{
 const h=harness();
 h.api.onSystemVolume({type:'fainance-assistant-system-volume',current:0,max:15,ratio:0,muted:true,communication:true});
 assert(h.e.realtimeAudioRef.current.muted,'Native Capacitor Event carries fields directly');
 h.api.onSystemVolume({detail:{current:3,max:15,ratio:0.2,muted:false,communication:true}});
 assert(!h.e.realtimeAudioRef.current.muted);assert.equal(h.e.realtimeAudioRef.current.volume,0.2);
}
console.log('Assistant audio: interruption, exclusive playback, stale responses, true zero, unmute, native event payloads, new responses at zero, no double media attenuation and single microphone passed.');
