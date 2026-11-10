import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

function loadModule(file) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'exports', 'module', output)(name => {
    assert.equal(name, 'react');
    return React;
  }, module.exports, module);
  return module.exports;
}
const logic = loadModule('src/assistantLogic.ts');
const formatting = loadModule('src/ui/AssistantMessage.tsx');
const continuity = loadModule('src/finance/assistantConversationContinuity.js');
const source = fs.readFileSync('src/sezioni.tsx', 'utf8');
const ast = ts.createSourceFile('sezioni.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['appendMessage', 'appendVoiceMessage', 'cleanSpeechText', 'sendMessage', 'sendRealtimeText', 'handleRealtimeEvent', 'isYes', 'isNo', 'looksLikeDirectAppAction'];
const chunks = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) chunks.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(chunks.length, names.length, 'Extract exactly the real message and Realtime handlers');
const code = ts.transpileModule(chunks.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

function fixture() {
  const calls = [], events = [], history = [];
  let consumed = 0, confirmations = 0;
  const env = {
    ...logic, ...formatting, ...continuity,
    lang: 'it', input: '', documentLoading: false, realtimeStatus: 'connected', pendingActions: [],
    operationDraftRef: { current: null }, pendingActionsRef: { current: [] }, activeAttachmentRef: { current: null },
    aiChatRef: { current: history }, lastVoiceUserRequestRef: { current: '' }, lastAssistantUserLanguageRef: { current: 'it' },
    assistantTurnRef: { current: 4 }, realtimeResponseTurnsRef: { current: new Map() }, realtimeAudioGenerationRef: { current: 0 },
    realtimeInputItemsRef: { current: new Map() }, realtimeCompletedInputRef: { current: new Set() }, realtimeUserDraftRef: { current: '' },
    realtimeAssistantDraftRef: { current: '' }, lastRealtimeAssistantTranscriptRef: { current: '' },
    normalized: value => String(value).toLowerCase(),
    setAiChat(fn) { const next = fn(history); history.splice(0, history.length, ...next); },
    resolveVoiceAssistantTurn: () => ({ language: 'it', languageName: 'Italian' }),
    assistantLanguageControlReply: () => '', getFainanceHelpAnswer: () => '',
    handleLocalMovementTurn: () => false, isVoicePromptEcho: () => false, isMovementCorrectionText: () => false,
    consumePlanFeature(feature, count) { assert.equal(feature, 'aiReply'); consumed += count; },
    callAssistant(question, resolution) { calls.push({ question, resolution }); },
    sendRealtimeEvent(event) { events.push(event); return true; },
    sendRealtimeModelResponse() { throw new Error('A requested list must use the existing structured text path'); },
    confirmPending() { confirmations++; }, cancelPending() {},
    interruptAssistantTurn() {}, setInput() {}, stopListening() {}, setVoiceError() {}, setBusy() {},
    setRealtimeUserDraft() {}, setVoiceListening() {}, clearVoiceNotice() {}, setRealtimeAssistantDraft() {}
  };
  const handlers = new Function('env', `with(env){${code};return {${names.join(',')}};}`)(env);
  Object.assign(env, handlers);
  return { env, handlers, calls, events, history, consumed: () => consumed, confirmations: () => confirmations };
}

test('typed list on an active Realtime connection uses text/TTS and consumes once', () => {
  const f = fixture();
  f.handlers.sendMessage('Quali spese rateizzate ho nel 2026?');
  assert.equal(f.consumed(), 1);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].question, 'Quali spese rateizzate ho nel 2026?');
  assert.equal(f.calls[0].resolution.language, 'it');
  assert.equal(f.events.length, 0, 'No competing Realtime model response');
  assert.equal(f.history.length, 1);
});

test('voice list routes once and duplicate completed transcription cannot consume twice', () => {
  const f = fixture();
  const event = { type: 'conversation.item.input_audio_transcription.completed', item_id: 'synthetic-1', transcript: 'Elenca le spese del 2026' };
  f.handlers.handleRealtimeEvent(event);
  f.handlers.handleRealtimeEvent(event);
  assert.equal(f.consumed(), 1);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].question, event.transcript);
  assert.deepEqual(f.events.map(item => item.type), ['response.cancel', 'output_audio_buffer.clear']);
  assert.equal(f.history.length, 1);
});

test('saved and streamed Markdown remains intact while speech uses a separate plain view', () => {
  const f = fixture();
  const message = 'Spese disponibili:\n\n- **Spesa A**: 12,50 €\n- **Spesa B**: 20,00 €';
  f.handlers.appendMessage('assistant', message);
  assert.equal(f.history[0].text, message);
  assert.equal(f.handlers.cleanSpeechText(message), 'Spese disponibili:\n\nSpesa A: 12,50 €\nSpesa B: 20,00 €');
  assert.equal(f.history[0].text, message, 'TTS must not overwrite stored display text');
  f.handlers.handleRealtimeEvent({ type: 'response.output_audio_transcript.delta', delta: message });
  assert.equal(f.env.realtimeAssistantDraftRef.current, message);
  f.handlers.handleRealtimeEvent({ type: 'response.output_audio_transcript.done', transcript: message });
  assert.equal(f.history[1].text, message);
});

test('pending confirmation keeps priority over routing and does not consume an answer', () => {
  const f = fixture();
  f.env.pendingActions = [{ action: 'update_movement' }];
  f.handlers.sendMessage('sì');
  assert.equal(f.confirmations(), 1);
  assert.equal(f.calls.length, 0);
  assert.equal(f.consumed(), 0);
});
