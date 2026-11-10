'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const a=require('../tools/growthAuthCoverageReadOnlyTest.cjs');
const now=Date.UTC(2026,10,8,14,0);
const fields=['goals','rules','budgetVersions','budgetOverrides','alerts','shareProjects'];
const entry=(v)=>({stringValue:v});
const registry=(set=fields,schema='first-server-confirmation-v1')=>({
 fields:{schema:{stringValue:schema},baselinedFamilies:{
  arrayValue:{values:set.map(entry)}},captureIncomplete:{booleanValue:false}}
});
test('A09/A10 audit date comes from Rome, not environment locale',()=>{
 assert.equal(a.dayRome(Date.UTC(2026,10,8,0,5)),'2026-11-08');
 assert.equal(a.auditDate([],now),'2026-11-08');
 assert.equal(a.auditDate(['--date=2026-11-06'],now),'2026-11-06');
});
test('Rome day boundary handles DST without inventing dates',()=>{
 assert.equal(a.dayRome(Date.UTC(2026,2,28,23,30)),'2026-03-29');
 assert.equal(a.dayRome(Date.UTC(2026,9,25,22,30)),'2026-10-25');
 assert.equal(a.dayRome(Date.UTC(2026,9,25,23,30)),'2026-10-26');
});
test('unknown flags, invalid dates and future reports fail closed',()=>{
 for(const args of [
  ['--project=fainance-a7794'],['--date=2026-11-09'],
  ['--date=2026-02-30'],['--date=2025-12-31'],
  ['--date=../../keys'],['--date=2026-11-07','--other=x']
 ])assert.throws(()=>a.auditDate(args,now),/AUDIT_DATE_/);
});
test('archive output is date-scoped and traversal-resistant',()=>{
 const x=a.reportPath('2026-11-08');
 assert.equal(path.basename(x),'coverage-summary-live.json');
 assert(x.includes('growth-A09-cohort-audit-20261108'));
 assert.throws(()=>a.reportPath('../2026-11-08'),/AUDIT_REPORT_DATE_INVALID/);
});
test('six-family baseline is qualified only by exact registry schema and family set',()=>{
 assert.equal(a.sixFamiliesBaselined(registry()),true);
 assert.equal(a.sixFamiliesBaselined(registry(fields.slice(0,5))),false);
 assert.equal(a.sixFamiliesBaselined(registry([...fields.slice(0,5),'goals'])),false);
 assert.equal(a.sixFamiliesBaselined(registry([...fields.slice(0,5),'bankSecrets'])),false);
 assert.equal(a.sixFamiliesBaselined(registry(fields,'legacy')),false);
 assert.equal(a.sixFamiliesBaselined({fields:{schema:entry('first-server-confirmation-v1')}}),false);
});
function meta({safe=true,reg=registry()}={}){
 return{
  profile:{fields:{deletionStatus:entry('active')}},
  deletion:null,
  meta:{fields:{schemaVersion:{integerValue:'2'},state:entry('enabled-clean')}},
  current:{fields:{
   testOnly:{booleanValue:safe},
   numericExportAllowed:{booleanValue:false},
   wholeAppPopulationQualified:{booleanValue:false}
  }},
  registry:reg
 };
}
test('only safety-compliant Test snapshot remains without unsafe flags',()=>{
 const c=a.blank();
 a.accumulate(c,{disabled:false,uid:'synthetic-test-only'},meta());
 assert.equal(c.authAccounts,1);assert.equal(c.v2Clean,1);
 assert.equal(c.unsafeSnapshotFlags,0);
 assert.equal(c.creationRegistryPresent,1);
 assert.equal(c.creationSixFamilyBaselines,1);
 assert.equal(c.creationRegistryWithoutSixBaseline,0);
 assert(!JSON.stringify(c).includes('synthetic-test-only'));
});
test('incomplete baseline and unsafe project flag remain visible, never safe',()=>{
 const c=a.blank();
 a.accumulate(c,{disabled:false},meta({safe:false,reg:registry(fields.slice(0,4))}));
 assert.equal(c.unsafeSnapshotFlags,1);
 assert.equal(c.creationSixFamilyBaselines,0);
 assert.equal(c.creationRegistryWithoutSixBaseline,1);
});
test('missing profile and registry cannot be interpreted as qualified coverage',()=>{
 const c=a.blank(),data=meta();
 data.profile=null;data.current=null;data.registry=null;data.meta=null;
 a.accumulate(c,{disabled:false},data);
 assert.equal(c.profileMissing,1);
 assert.equal(c.v2MissingOrIncomplete,1);
 assert.equal(c.creationCaptureUnknown,1);
 assert.equal(c.growthSnapshotMissing,1);
 assert.equal(c.creationSixFamilyBaselines,0);
});
