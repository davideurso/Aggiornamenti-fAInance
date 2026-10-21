import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function runEnv(environment) {
  const source=fs.readFileSync('src/config/env.ts','utf8').replaceAll('import.meta.env','__env');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  new Function('exports','__env',code)(exports,environment);
  return exports;
}
const values={MODE:'test',VITE_APP_ENV:'test',VITE_FIREBASE_TEST_PROJECT_ID:'fainance-test-20260823195207'};
for(const name of ['API_KEY','AUTH_DOMAIN','STORAGE_BUCKET','MESSAGING_SENDER_ID','APP_ID'])values['VITE_FIREBASE_TEST_'+name]='synthetic-test-value';
const config=runEnv(values);
assert.equal(config.firebaseConfig.projectId,'fainance-test-20260823195207');
assert(config.cloudFunctionUrl('testFunction').includes('fainance-test-20260823195207'));
assert.throws(()=>runEnv({...values,VITE_FIREBASE_TEST_API_KEY:''}),/INCOMPLETE/);
assert.throws(()=>runEnv({...values,VITE_FIREBASE_TEST_PROJECT_ID:'fainance-a7794'}),/MISMATCH/);
assert.equal(runEnv({...values,VITE_APP_ENV:'production'}).appEnvironment,'test','Build mode test must prevail over an incorrect environment label');
console.log('TEST isolation: required project, function routing, incomplete config rejection and Production mismatch rejection passed');
