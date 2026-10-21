import assert from 'node:assert/strict';
import { loadTypeScript } from './loadTypeScript.mjs';
import { createFinanceEvolution } from '../src/data/financeEvolution.js';
const { fainanceCompressAccountDataV5: compress, fainanceExpandAccountCloudDataV5: expand } = loadTypeScript('src/data/accountCloudCodec.ts');
const data = { expenses:[{id:'α',note:'Viaggio 🧳 — città',amount:12.34}], financeEvolution:createFinanceEvolution(), currentPlan:'free' };
data.financeEvolution.period={mode:'financial',startDay:31};
const before=JSON.stringify(data);
const compressed=await compress(data);
const envelope={accountDataCompressedV5:compressed.value,accountDataCompressionV5:compressed.encoding,currentPlan:'premium'};
const restored=await expand(envelope);
assert.deepEqual(restored.financeEvolution,data.financeEvolution);
assert.deepEqual(restored.expenses,data.expenses);
assert.equal(restored.currentPlan,'premium');
assert.equal(JSON.stringify(data),before);
assert.deepEqual(await expand(data),data);
await assert.rejects(expand({...envelope,accountDataCompressionV5:'future'}),/CLOUD_DATA_UNREADABLE/);
await assert.rejects(expand({...envelope,accountDataCompressedV5:'invalid gzip'}),/CLOUD_DATA_UNREADABLE/);
const invalid=await compress(['not','a','document']);
await assert.rejects(expand({...envelope,accountDataCompressedV5:invalid.value}),/CLOUD_DATA_UNREADABLE/);
const ctor=globalThis.DecompressionStream;
try {
  globalThis.DecompressionStream=undefined;
  await assert.rejects(expand(envelope),/CLOUD_DATA_UNREADABLE/);
} finally { globalThis.DecompressionStream=ctor; }
console.log('Cloud codec: legacy document, complete gzip roundtrip, Unicode, plan precedence and fail-closed errors passed');
