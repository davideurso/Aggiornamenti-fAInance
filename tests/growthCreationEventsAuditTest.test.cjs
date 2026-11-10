'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const a=require('../tools/growthCreationEventsAuditTest.cjs');
const family='goals';
const valid={
 name:'projects/demo/databases/(default)/documents/users/PRIVATE/growthMetrics/current/creationEvents/'+'a'.repeat(64),
 fields:{
  schema:{stringValue:'first-server-confirmation-v1'},
  family:{stringValue:family},
  testOnly:{booleanValue:true},
  numericExportAllowed:{booleanValue:false},
  wholeAppPopulationQualified:{booleanValue:false},
  firstConfirmedAt:{timestampValue:'2026-11-07T13:25:00Z'}
 }
};
test('Test only first-server-confirmed event metadata validates',()=>{
 assert.equal(a.qualify(valid),true);
 for(const f of a.FAMILIES)assert.equal(a.qualify({...valid,fields:{...valid.fields,family:{stringValue:f}}}),true);
});
test('partial, future-client, invalid server and malformed data fail closed',()=>{
 const bads=[
  {...valid,fields:{...valid.fields,schema:{stringValue:'client-v1'}}},
  {...valid,fields:{...valid.fields,firstConfirmedAt:{timestampValue:'not_a_time'}}},
  {...valid,fields:{...valid.fields,testOnly:{booleanValue:false}}},
  {...valid,fields:{...valid.fields,numericExportAllowed:{booleanValue:true}}},
  {...valid,fields:{...valid.fields,wholeAppPopulationQualified:{booleanValue:true}}},
  {...valid,fields:{...valid.fields,family:{stringValue:'unknown'}}},
  {...valid,name:'projects/example/users/u/creationEvents/not-a-hash'},
  {name:valid.name,fields:{}},null
 ];
 for(const v of bads)assert.equal(a.qualify(v),false);
});
test('only IdentityToolkit or Firestore HTTPS source domains are accepted',()=>{
 for(const x of ['https://identitytoolkit.googleapis.com/v1/x','https://firestore.googleapis.com/v1/x'])
  assert.equal(a.checkedUrl(x),x);
 for(const x of ['https://evilhacker.example/path','http://firestore.googleapis.com/v1/x',
  'https://firestore.googleapis.com.evil.example/x','https://u:p@firestore.googleapis.com/v1/x'])
  assert.throws(()=>a.checkedUrl(x),/A10_HOST_NOT_ALLOWED/);
});
test('provider fields are classified with no private IDs in outputs',()=>{
 assert.equal(a.field(valid,'family'),'goals');
 assert.equal(a.field(valid,'firstConfirmedAt'),'2026-11-07T13:25:00Z');
 assert.equal(a.field(valid,'userEmail'),undefined);
});
