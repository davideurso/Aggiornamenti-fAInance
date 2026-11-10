import assert from 'node:assert/strict';
import {loadTypeScript} from './loadTypeScript.mjs';
const {homeRecentMovements: recent}=loadTypeScript('src/ui/homeRecentMovements.ts');
const original=[
{id:'old-stock',type:'Azioni',date:'2024-10-27'},
{id:'stock',type:'Azioni',date:'2026-09-25'},
{id:'salary',type:'Stipendio',date:'2026-10-18'},
{id:'rent',type:'Affitto',date:'2026-10-19'},
{id:'refund',type:'Rimborso',date:'2026-10-17'}];
const before=JSON.stringify(original);
assert.deepEqual(recent(original,3).map(x=>x.id),['rent','salary','refund']);
assert.equal(JSON.stringify(original),before);
assert.deepEqual(recent([],5),[]);
assert.deepEqual(recent(undefined,5),[]);
assert.equal(recent(original,1).length,1);
assert.deepEqual(recent([{id:1,date:''},{id:2,date:'2026-10-01'}],2).map(x=>x.id),[2,1]);
assert.deepEqual(recent([{id:1,date:'2026-10-01'},{id:2,date:'2026-10-01'}],2).map(x=>x.id),[1,2]);
console.log('OK recent movements: categories, date-before-limit, empty, tie, immutability');

const futureRows=[{id:'future-last',date:'2026-12-31'},{id:'tomorrow',date:'2026-10-21'},{id:'today',date:'2026-10-20'},{id:'yesterday',date:'2026-10-19'},{id:'missing'},{id:'invalid',date:'2026-02-31'}];
const preserved=JSON.stringify(futureRows);
assert.deepEqual(recent(futureRows,2,'2026-10-20').map(x=>x.id),['today','yesterday'],'Filter future dates before limiting, include today');
assert.deepEqual(recent(futureRows,2).map(x=>x.id),['future-last','tomorrow'],'Callers without a cutoff keep existing behavior');
assert.equal(JSON.stringify(futureRows),preserved);
assert.deepEqual(recent([{id:1,date:'2027-01-01'},{id:2,date:'2026-12-31'}],5,'2026-12-31').map(x=>x.id),[2]);
assert.deepEqual(recent([{id:1,date:'2028-02-29'},{id:2,date:'2028-03-01'}],5,'2028-02-29').map(x=>x.id),[1]);
assert.deepEqual(recent([{id:1,date:'2026-10-20T23:59:59'},{id:2,date:'2026-10-21T00:00:00'}],5,'2026-10-20').map(x=>x.id),[1]);
const {readFileSync}=await import('node:fs');const sections=readFileSync(new URL('../src/sezioni.tsx',import.meta.url),'utf8');
assert(sections.includes('homeRecentMovements(expenses, n, todayStr())'));
assert(sections.includes('homeRecentMovements(incomes, n2)'));
console.log('OK recent expenses: today included; future excluded before count; year, leap, timestamp and income behavior preserved');
