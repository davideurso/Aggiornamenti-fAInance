import test from 'node:test';
import assert from 'node:assert/strict';
import {CHATGPT_TEST_ACTIONS,resolveChatgptTestRoute} from '../src/integrations/chatgptTestRoutes.js';
const project='fainance-test-20260823195207';
test('Every native handoff is navigation only and rejected outside Test',()=>{
 for(const action of Object.keys(CHATGPT_TEST_ACTIONS)){
  const url='fainance://chatgpt-action?chatgptAction='+action;
  assert.equal(resolveChatgptTestRoute(url,'test',project).action,action);
  assert.equal(resolveChatgptTestRoute(url,'production',project),null);
  assert.equal(resolveChatgptTestRoute(url,'test','fainance-a7794'),null);
  assert.equal(resolveChatgptTestRoute('https://attacker.invalid/?chatgptAction='+action,'test',project),null);
 }
 assert.equal(resolveChatgptTestRoute('fainance://chatgpt-action?chatgptAction=__proto__','test',project),null);
 assert.equal(resolveChatgptTestRoute('fainance://chatgpt-action?chatgptAction=share_attachments&shareProject=../../other','test',project),null);
});

test('Currency handoff resolves to the existing General screen',()=>{assert.equal(resolveChatgptTestRoute('fainance://chatgpt-action?chatgptAction=currency_settings','test',project).settings,'general');});
