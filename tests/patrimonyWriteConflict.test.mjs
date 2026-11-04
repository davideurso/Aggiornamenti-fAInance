import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveNewerPatrimony as merge } from '../src/finance/patrimonyWriteConflict.js';
test('resumed stale client preserves newer web balances and month history, including zero', () => {
 const local={patrimonioDataUpdatedAt:10,patrimonioValues:{a:99},patrimonioHistory:{},expenses:[{id:'x'}]};
 const remote={patrimonioDataUpdatedAt:20,patrimonioValues:{a:0},patrimonioHistory:{'2026-11':{a:0}},patrimonioNotes:{}};
 assert.deepEqual(merge(local,remote),{...local,...remote});assert.equal(local.patrimonioValues.a,99);
});
test('new local edit survives older server snapshot',()=>{
 const local={patrimonioDataUpdatedAt:30,patrimonioValues:{a:42}};
 assert.deepEqual(merge(local,{patrimonioDataUpdatedAt:20,patrimonioValues:{a:0}}),local);
});
test('catalog and balance versions are independent and deleted catalogs remain empty',()=>{
 const local={patrimonioDataUpdatedAt:30,patrimonioValues:{a:42},patrimonioCatalogUpdatedAt:5,patrimonioEntries:[{id:'a'}]};
 const out=merge(local,{patrimonioDataUpdatedAt:20,patrimonioCatalogUpdatedAt:10,patrimonioEntries:[],patrimonioAreas:[]});
 assert.equal(out.patrimonioValues.a,42);assert.deepEqual(out.patrimonioEntries,[]);
});
import {reconcilePatrimonyAuthority as reconcile} from '../src/finance/patrimonyWriteConflict.js';
test('a later preference backup cannot resurrect an entry deleted in the live catalog',()=>{
 const stale={updatedAtMs:900,values:{patrimonio_entries_v1:JSON.stringify([{id:'a'}]),other:'preserved'}};
 const live={patrimonioCatalogUpdatedAt:200,patrimonioAreas:[],patrimonioEntries:[{id:'a',deleted:true}]};
 const out=reconcile(stale,live);assert.equal(JSON.parse(out.values.patrimonio_entries_v1)[0].deleted,true);assert.equal(out.__patrimonioCatalogUpdatedAt,200);assert.equal(out.values.other,'preserved');assert.equal(stale.values.patrimonio_entries_v1,'[{"id":"a"}]');
});
test('newer explicit live catalog authority wins, including empty arrays; absent live data keeps recovery fallback',()=>{
 const backup={values:{patrimonio_entries_v1:'[{"id":"old"}]'}};
 const out=reconcile(backup,{patrimonioCatalogUpdatedAt:10,patrimonioEntries:[{id:'old'}],patrimonioAreas:[],userStateAuthorityV2:{sections:{patrimonioCatalog:{updatedAtMs:20,data:{areas:[],entries:[]}}}}});assert.deepEqual(JSON.parse(out.values.patrimonio_entries_v1),[]);assert.equal(out.__patrimonioCatalogUpdatedAt,20);assert.equal(reconcile(backup,{}),backup);
});
