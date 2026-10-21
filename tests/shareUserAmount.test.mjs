import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { loadTypeScript } from './loadTypeScript.mjs';
const { resolveSharePersonalCategoryId } = loadTypeScript('src/finance/shareAnalytics.js');
import { participantForUser, shareAmountForUser } from '../src/finance/shareUserAmount.js';
const project={ownerUid:'davide',participants:[{id:'me',uid:'davide',role:'owner'},{id:'francesca-participant',uid:'francesca'}]};
const activity={amount:450,paidBy:'francesca-participant',shares:{me:170,'francesca-participant':280}};
assert.equal(shareAmountForUser(project,activity,'davide'),170);
assert.equal(shareAmountForUser(project,activity,'francesca'),280);
assert.equal(shareAmountForUser(project,activity,'unrelated'),0);
assert.equal(shareAmountForUser(project,{...activity,paidBy:'me'},'francesca'),280);
assert.equal(shareAmountForUser(project,{...activity,shares:{me:450}},'francesca'),0);
assert.equal(shareAmountForUser(project,{...activity,shares:{me:450,'francesca-participant':0}},'francesca'),0);
assert.equal(shareAmountForUser(project,{...activity,kind:'settlement'},'francesca'),0);
assert.equal(shareAmountForUser(project,{amount:450,sharedWith:['francesca-participant']},'francesca'),450);
assert.equal(shareAmountForUser(project,{amount:450,sharedWith:['francesca-participant']},'davide'),0);
assert.equal(participantForUser({...project,participants:[{id:'me',role:'owner'},project.participants[1]]},'davide').id,'me');
assert.equal(participantForUser(project,''),null);
const source=fs.readFileSync('src/app.tsx','utf8');
const tree=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let history,archived;
const nameFunctions=[];
function visit(node){
  if(ts.isFunctionDeclaration(node)&&["normalizeEmail","normalizeSharePersonName","shareNameLooksLikeIdentifier","shareUserFullName"].includes(node.name?.text))nameFunctions.push(node.getText(tree));
  if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='shareHistoryExpenses')history=node.initializer;
  if(ts.isFunctionDeclaration(node)&&node.name?.text==='shareHistoryRowsForCurrentUser')archived=node;
  ts.forEachChild(node,visit);
}
visit(tree);assert(history&&archived);
const historyCode=ts.transpileModule('const result = '+history.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const archivedCode=ts.transpileModule(archived.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const nameCode=ts.transpileModule(nameFunctions.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const completeProject={...project,id:'project',name:'Test',activities:[{...activity,id:'expense',date:'2026-09-10',desc:'Regalo Matrimonio',originalAmount:900,currency:'USD',baseCurrency:'EUR'}]};
for(const [uid,expected] of [['davide',170],['francesca',280],['unrelated',0]]){
  const rows=new Function('useMemo','showShareInHistory','shareProjects','userId','currency','shareAmountForUser','resolveSharePersonalCategoryId','shareCategoryMappings','effectiveShareDefaultCategoryId','cats',nameCode+historyCode+';return result;')(
    fn=>fn(),true,[completeProject],uid,'EUR',shareAmountForUser,resolveSharePersonalCategoryId,{},17,[{id:17,name:'Altro'}]);
  assert.equal(rows.length,expected?1:0);
  if(expected){assert.equal(rows[0].amount,expected);assert.equal(rows[0].baseAmount,expected);assert.equal(rows[0].originalAmount,expected*2);}
  const savedRows=new Function('shareCurrentParticipant','shareAmountForUser','userId','currency','todayStr','resolveSharePersonalCategoryId','shareCategoryMappings','effectiveShareDefaultCategoryId','cats',archivedCode+';return shareHistoryRowsForCurrentUser;')(
    p=>participantForUser(p,uid),shareAmountForUser,uid,'EUR',()=> '2026-09-10',resolveSharePersonalCategoryId,{},17,[{id:17,name:'Altro'}])(completeProject);
  assert.equal(savedRows.length,expected?1:0);
  if(expected)assert.equal(savedRows[0].amount,expected);
}
console.log('Share history: 170/280 by account identity, payer independence, exclusion, zero shares, settlements and legacy owner passed');
