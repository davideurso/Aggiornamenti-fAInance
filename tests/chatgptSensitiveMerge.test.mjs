import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeSensitiveRecords} from '../src/integrations/chatgptSensitiveMerge.js';
test('Remote Test sensitive edits survive stale reconnect and explicit deletion prevents resurrection',()=>{
 const old={id:1,bank:'Old',updatedAt:'2026-10-01'},remote={...old,bank:'New',syncUpdatedAtMs:2000000000000};
 assert.deepEqual(mergeSensitiveRecords([remote],[old],{},'bank'),[remote]);
 assert.deepEqual(mergeSensitiveRecords([],[old],{'bank:1':{explicit:true,deletedAt:2000000000000}},'bank'),[]);
 assert.deepEqual(mergeSensitiveRecords([],[old],{'card:1':{explicit:true,deletedAt:2000000000000}},'bank'),[old]);
});
