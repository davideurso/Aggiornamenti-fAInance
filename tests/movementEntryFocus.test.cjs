const fs=require('fs'),p=require('path'),assert=require('node:assert/strict'),ts=require('typescript');
const root=p.join(__dirname,'..'),box={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync(p.join(root,'src/ui/movementEntryFocus.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(box.exports);
const listeners={},windowListeners={},viewportListeners={},queue=new Map();let serial=0;
class Element {matches(){return this.field===true;}}
const input=new Element();input.field=false;const description=new Element();description.field=true;const save=new Element();
const win={HTMLElement:Element,requestAnimationFrame(fn){queue.set(++serial,fn);return serial},cancelAnimationFrame(id){queue.delete(id)},setTimeout(fn){queue.set(++serial,fn);return serial},clearTimeout(id){queue.delete(id)},addEventListener(n,fn){windowListeners[n]=fn},removeEventListener(n){delete windowListeners[n]},visualViewport:{addEventListener(n,fn){viewportListeners[n]=fn},removeEventListener(n){delete viewportListeners[n]}}};
const spacer={style:{height:'0px'}};const scroller={scrollTop:0,clientTop:0,clientHeight:600,get scrollHeight(){return 700+parseFloat(spacer.style.height)},getBoundingClientRect(){return {top:20}},scrollTo({top}){this.scrollTop=Math.min(top,this.scrollHeight-this.clientHeight)}};
const anchor={getBoundingClientRect(){return {top:220-scroller.scrollTop}}};
const form={ownerDocument:{defaultView:win,activeElement:input},contains(e){return [input,description,save].includes(e)},closest(){return scroller},querySelector(){return anchor},addEventListener(n,fn){listeners[n]=fn},removeEventListener(n){delete listeners[n]}};
function flush(){const jobs=[...queue.values()];queue.clear();jobs.forEach(fn=>fn());}
const cleanup=box.exports.installMovementEntryFocus(form,spacer);flush();assert.equal(scroller.scrollTop,0,'initial amount autofocus leaves opening position unchanged');
listeners.focusin({target:input});listeners.click({target:input});viewportListeners.resize();flush();assert.equal(scroller.scrollTop,0,'amount tap and keyboard do not align');assert.equal(spacer.style.height,'0px');
form.ownerDocument.activeElement=description;listeners.focusin({target:description});flush();assert.equal(scroller.scrollTop,198);assert.equal(spacer.style.height,'98px');
// Keyboard resize, repeated focus and re-taps must not accumulate spacer height.
scroller.clientHeight=420;viewportListeners.resize();flush();assert.equal(scroller.scrollTop,198);assert.equal(spacer.style.height,'0px');
form.ownerDocument.activeElement=description;listeners.focusin({target:description});flush();assert.equal(scroller.scrollTop,198);
scroller.scrollTop=90;listeners.click({target:description});flush();assert.equal(scroller.scrollTop,198);
form.ownerDocument.activeElement=save;scroller.scrollTop=100;windowListeners.resize();flush();assert.equal(scroller.scrollTop,100,'save interaction must not scroll');
form.ownerDocument.activeElement=description;listeners.click({target:description});form.ownerDocument.activeElement=input;scroller.scrollTop=80;flush();assert.equal(scroller.scrollTop,80,'pending description callback cannot scroll amount');
cleanup();assert.equal(queue.size,0);assert.equal(Object.keys(listeners).length,0);assert.equal(Object.keys(viewportListeners).length,0);assert.equal(spacer.style.height,'0px');
assert.equal(box.exports.installMovementEntryFocus(null,null),undefined);
const widget=fs.readFileSync(p.join(root,'src/widget.tsx'),'utf8');const tree=ts.createSourceFile('widget.tsx',widget,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);assert.equal(tree.parseDiagnostics.length,0);
const fields=[];function visit(n){if(ts.isJsxSelfClosingElement(n)&&n.attributes.properties.some(a=>a.name?.getText(tree)==='data-entry-focus'))fields.push(n.tagName.getText(tree));ts.forEachChild(n,visit);}visit(tree);assert.deepEqual(fields,['textarea'],'only description opts into scrolling');
console.log('[OK] Amount opening unchanged; description focus/re-tap, keyboard resize, exact anchor, no spacer accumulation, save stability and cleanup.');
