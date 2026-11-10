import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
const source=readFileSync(new URL('../src/sezioni.tsx',import.meta.url),'utf8');
const tree=ts.createSourceFile('sezioni.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(tree.parseDiagnostics.length,0);
function find(name){let found;function walk(n){if((ts.isFunctionDeclaration(n)||ts.isVariableDeclaration(n))&&n.name?.getText(tree)===name)found=n;ts.forEachChild(n,walk);}walk(tree);assert(found,name);return found;}
const normalize=new Function(find('normalizeWorkletSize').getText(tree)+';return normalizeWorkletSize;')();
const span=new Function('assistantType','transferType','compact','buttonType','size','isMobile','return '+find('spanUnits').initializer.getText(tree));
test('Agent and transfer use half/full mobile widths for the same three sizes',()=>{
 for(const type of ['assistant_voice_widget','button_transfer'])for(const size of ['0.5x','1x','2x']){
  assert.equal(normalize(type,size),size);
  assert.equal(span(type==='assistant_voice_widget',type==='button_transfer',size==='0.5x',type==='button_transfer',size,true),size==='0.5x'?2:4);
 }
});
test('saved Agent sizes migrate by occupied width without losing any worklet',()=>{
 assert.equal(normalize('assistant_voice_widget','1x1'),'0.5x');assert.equal(normalize('assistant_voice_widget','1x2'),'0.5x');
 assert.equal(normalize('assistant_voice_widget','2x1'),'1x');assert.equal(normalize('assistant_voice_widget','2x2'),'2x');
});
test('all worklets share the same width semantics on mobile and desktop',()=>{
 for(const mobile of [false,true])for(const size of ['0.5x','1x','2x']){
  assert.equal(span(false,false,size==='0.5x',true,size,mobile),size==='0.5x'?2:4);
  assert.equal(span(false,false,size==='0.5x',false,size,mobile),size==='0.5x'?2:4);
 }
});

test('editing never changes the rendered card width, height or content padding',()=>{
 const card=find('workletCard');let common;
 function walk(node){if(ts.isVariableDeclaration(node)&&node.name.getText(tree)==='common')common=node.initializer;ts.forEachChild(node,walk);}walk(card);assert(common);
 function geometry(size,isEditing,type){
  const scope={available:false,isEditing,assistantTall:size==='2x',layout:{measuring:false,height:131.25*(size==='2x'?1.5:1)},assistantType:type==='assistant_voice_widget',transferType:type==='button_transfer',buttonType:type.startsWith('button_'),compact:size==='0.5x',size,span:'span '+(size==='0.5x'?2:4),bg:'#fff',fg:'#111',dark:false,borderC:'#ddd',homeDragging:false,readableDarkText:x=>x};
  const style=new Function(...Object.keys(scope),'return ('+common.getText(tree)+');')(...Object.values(scope));
  return {width:style.gridColumn,height:style.height,minHeight:style.minHeight,padding:style.padding,paddingTop:style.paddingTop};
 }
 for(const type of ['summary','monthly_balance','income_vs_expense','assistant_voice_widget','button_transfer','button_stats'])for(const size of ['0.5x','1x','2x']){
  const home=geometry(size,false,type),preview=geometry(size,true,type);
  assert.deepEqual(preview,home,type+' '+size+' preview parity');
  assert.equal(home.width,size==='0.5x'?'span 2':'span 4');
  assert.equal(home.height,size==='0.5x'?'100%':131.25*(size==='2x'?1.5:1));
  assert.equal(home.minHeight,131.25*(size==='2x'?1.5:1));
 }
});

test('transfer title follows the same visibility setting as other worklets',()=>{
 const node=find('showHeader');const show=new Function('available','buttonType','transferType','assistantType','w','homeShowTitle','return '+node.initializer.getText(tree));
 for(const type of ['button_transfer','summary','monthly_balance'])for(const visible of [false,true])assert.equal(show(false,type.startsWith('button_'),type==='button_transfer',false,{params:{showTitle:visible}},w=>w.params.showTitle),visible);
});

test('background preserves the saved hue for every renderer in both themes',()=>{
 const code=find('workletColor').getText(tree);
 for(const dark of [false,true]){
  const color=new Function('dark',code+';return workletColor;')(dark);
  for(const type of ['summary','assistant_voice_widget','button_transfer','monthlyized_expenses_by_area','monthlyized_expenses_by_category']){
   const a=color({type,color:'#E8F4FF'}),b=color({type,color:'#FFE4E6'});assert.notEqual(a,b);
   if(!dark)assert.equal(color({type,color:'#052A5F'}),'#052A5F');
  }
 }
});

test('adding a worklet in dark mode saves the chosen background, never a text contrast color',()=>{
 let saved;
 const scope={editDraft:{id:'new',type:'button_transfer',mode:'add',color:'#E8F4FF',size:'1x',params:{showTitle:true}},homeCountDraftRef:{current:{}},homeTitleDraftRef:{current:{}},draftCountKey:()=>'',draftTitleKey:()=>'',sanitizeWorkletParams:(_type,p)=>p,defaultSize:()=> '1x',activeWorklets:[],saveWorklets:rows=>{saved=rows;},setEditDraft:()=>{},dark:true};
 new Function(...Object.keys(scope),find('applyDraft').getText(tree)+';applyDraft();')(...Object.values(scope));
 assert.equal(saved[0].color,'#E8F4FF');assert.equal(saved[0].params.showTitle,true);
});
