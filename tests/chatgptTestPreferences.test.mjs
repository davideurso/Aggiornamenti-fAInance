import test from 'node:test';
import assert from 'node:assert/strict';
import {preferLocalAIConsent,pendingChatgptLanguage} from '../src/integrations/chatgptTestPreferences.js';
test('Newer cloud consent revocation wins over old accepted consent, preserving later local changes',()=>{
 assert.equal(preferLocalAIConsent({accepted:true},10,{accepted:false},20),false);
 assert.equal(preferLocalAIConsent({accepted:true},30,{accepted:false},20),true);
 assert.equal(preferLocalAIConsent({accepted:true},0,{accepted:false},0),true);
});
test('ChatGPT language applies once in Test and cannot change Production',()=>{
 const p={language:'en',updatedAtMs:20};
 assert.deepEqual(pendingChatgptLanguage('test','fainance-test-20260823195207',p,10),{language:'en',stamp:20});
 assert.equal(pendingChatgptLanguage('test','fainance-test-20260823195207',p,20),null);
 assert.equal(pendingChatgptLanguage('production','fainance-a7794',p,0),null);
 assert.equal(pendingChatgptLanguage('test','fainance-a7794',p,0),null);
 assert.equal(pendingChatgptLanguage('test','fainance-test-20260823195207',{language:'invalid',updatedAtMs:50},0),null);
});
import {contactEndpoint} from '../src/integrations/contactEndpoint.js';
test('Support endpoint follows authenticated Firebase project and refuses unknown projects',()=>{
 assert.equal(contactEndpoint('fainance-test-20260823195207'),'https://europe-west1-fainance-test-20260823195207.cloudfunctions.net/sendContactEmail');
 assert.equal(contactEndpoint('fainance-a7794'),'https://europe-west1-fainance-a7794.cloudfunctions.net/sendContactEmail');
 assert.throws(()=>contactEndpoint(undefined),/CONTACT_PROJECT_REQUIRED/);
 assert.throws(()=>contactEndpoint('attacker.invalid'),/CONTACT_PROJECT_REQUIRED/);
});
