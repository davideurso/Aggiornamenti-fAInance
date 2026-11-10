import assert from 'node:assert/strict';
import test from 'node:test';
import {homeShareProject,homeShareActivities} from '../src/ui/homeShareWorklets.js';
import {shareProjectsForRead} from '../src/finance/shareCashMovements.js';

test('a missing saved project never falls back to changing cache/server first projects',()=>{
 const bridge={id:'bridge',name:'Test Bridge 47 modificato',status:'archived',activities:[]};
 const active={id:'active',name:'Viaggio',activities:[]};
 for(const projects of [[],[bridge],[active,bridge],[bridge,active]]){
  assert.equal(homeShareProject(projects,'removed'),null);
  assert.equal(homeShareProject(projects,''),null);
 }
 assert.equal(homeShareProject([bridge,active],'active'),active);
 assert.equal(homeShareProject([active,bridge],'active'),active);
 assert.equal(homeShareProject([{...active,deletedAt:'2026-11-04'}],'active'),null);
 assert.equal(homeShareProject([{...active,status:'deleted'}],'active'),null);
});

test('recent Share rows exclude every deletion form before limiting and keep stable ties',()=>{
 const project={id:'p',deletedActivityIds:['removed'],activities:[
  {id:'removed',date:'2026-11-04'},{id:'a',date:'2026-11-03',deleted:true},
  {id:'b',date:'2026-11-03',deletedAt:'2026-11-04'},{id:'c',date:'2026-11-03',status:'cancelled'},
  {id:'d',date:'2026-11-03',status:'void'},{id:'e',date:'2026-11-03',status:'deleted'},
  {id:'z',date:'2026-11-02',time:'12:00'},{id:'y',date:'2026-11-02',time:'12:00'},
  {id:'old',date:'2026-10-01'}]};
 const before=JSON.stringify(project);
 assert.deepEqual(homeShareActivities(project,2).map(x=>x.id),['y','z']);
 assert.equal(JSON.stringify(project),before);
 assert.deepEqual(homeShareActivities({...project,activities:[...project.activities].reverse()},2).map(x=>x.id),['y','z']);
 assert.deepEqual(homeShareActivities({...project,deleted:true},5),[]);
});

test('confirmed snapshots remove old rows and dates; subsequent cache echoes cannot restore them',()=>{
 const cached={id:'p',activities:[{id:'old-test',date:'2026-11-04'}, {id:'moved',date:'2026-11-04'}]};
 const confirmed={id:'p',activities:[{id:'moved',date:'2026-10-05'}]};
 for(const cache of [[cached],[],[cached,{id:'another',activities:[]}]]){
  const project=homeShareProject(shareProjectsForRead(cache,[confirmed]),'p');
  assert.deepEqual(homeShareActivities(project,5),confirmed.activities);
 }
});
