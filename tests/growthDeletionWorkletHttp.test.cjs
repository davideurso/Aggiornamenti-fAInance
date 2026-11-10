'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {handler}=require('../functions/growthDeletionWorkletHttp.cjs');
const {TEST}=require('../functions/growthDeletionEvidence.cjs');
function res(){
 const output={headers:{},statusCode:null,body:null};
 return{output,set:(key,value)=>{output.headers[key]=value;},
  status:code=>({json:body=>{output.statusCode=code;output.body=body;return output;}})};
}
test('A06 private source rejects non-Test backend at construction',()=>{
 assert.throws(()=>handler({db:{},project:'fainance-a7794'}),/A06_TEST_PROJECT_REQUIRED/);
});
test('A06 HTTP never accepts GET or malformed date, extra fields or extended range',async()=>{
 const read=()=>{throw Error('MUST_NOT_QUERY');};
 for(const [req,statusCode] of [
  [{method:'GET',body:{from:'2026-11-08',toExclusive:'2026-11-09'}},405],
  [{method:'POST',body:{from:'2026-11-08',toExclusive:'2026-11-09',uid:'private'}},400],
  [{method:'POST',body:{from:'2026-11-08',toExclusive:'2026-11-08'}},400],
  [{method:'POST',body:{from:'2026-11-08',toExclusive:'2026-12-25'}},400],
  [{method:'POST',body:{from:'2026-11-99',toExclusive:'2026-12-01'}},400]]){
  const r=res();await handler({db:{},project:TEST,read})(req,r);
  assert.equal(r.output.statusCode,statusCode);
  assert.equal(r.output.headers['Cache-Control'],'no-store');
  assert.equal(r.output.body.status,'N_D');
 }
});
test('A06 HTTP closed period returns only verified aggregate Test envelope',async()=>{
 const db={collection:()=>({})};
 const r=res();
 const read=async args=>{
  assert.equal(args.project,TEST);assert.equal(args.db,db);
  assert.equal(args.from,'2026-11-08');assert.equal(args.toExclusive,'2026-11-09');
  return {status:'SOURCE_OBSERVED',environment:'Test',productionQualified:false,
   numericExportAllowed:false,app:'fAInance',complete:true,completed:2,revoked:1,pending:3};
 };
 await handler({db,project:TEST,read,now:()=> '2026-11-10T10:00:00Z'})({
  method:'POST',body:{from:'2026-11-08',toExclusive:'2026-11-09'}
 },r);
 assert.equal(r.output.statusCode,200);
 assert.equal(r.output.body.completed,2);
 assert(!JSON.stringify(r.output.body).includes('uid'));
});
test('A06 HTTP must never mark Test values as Production publishable',async()=>{
 const r=res();
 await handler({db:{},project:TEST,read:async()=>({status:'SOURCE_OBSERVED',
  environment:'Production',numericExportAllowed:true,productionQualified:true,completed:10})})({
  method:'POST',body:{from:'2026-11-08',toExclusive:'2026-11-09'}
 },r);
 assert.equal(r.output.statusCode,503);
 assert.equal(r.output.body.status,'N_D');
});
test('A06 HTTP upstream failure emits only N/D without source payload',async()=>{
 const r=res();
 await handler({db:{},project:TEST,read:async()=>{throw Error('UID and private stack trace');}})({
  method:'POST',body:{from:'2026-11-08',toExclusive:'2026-11-09'}
 },r);
 assert.equal(r.output.statusCode,503);
 assert(!JSON.stringify(r.output.body).includes('UID'));
});
