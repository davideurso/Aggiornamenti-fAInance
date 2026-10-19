const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),ts=require(root+'/node_modules/typescript');
const patternSource=fs.readFileSync(root+'/src/icons/emojiPattern.ts','utf8'),moduleObject={exports:{}};
vm.runInNewContext(ts.transpileModule(patternSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:moduleObject.exports,module:moduleObject});
const pattern=moduleObject.exports.emojiPattern,names=new Set(JSON.parse(fs.readFileSync(root+'/src/icons/emojiAssets.json','utf8')));
const renderer={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/src/icons/canonicalEmoji.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{exports:renderer.exports,module:renderer,require:name=>name==='react'?{createElement:()=>null}:JSON.parse(fs.readFileSync(root+'/src/icons/emojiAssets.json','utf8'))});
function key(value){const parts=Array.from(value).map(c=>c.codePointAt(0).toString(16));const full=parts.join('-');return names.has(full)?full:parts.filter(p=>!['fe0f','fe0e'].includes(p)).join('-');}
let occurrences=0;const missing=[];
function scan(dir){for(const file of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,file.name);if(file.isDirectory())scan(p);else if(/\.(tsx?|css)$/.test(file.name)){const source=fs.readFileSync(p,'utf8');occurrences+=renderer.exports.emojiParts(source).length;for(const match of source.matchAll(new RegExp(pattern.source,'g'))){if(/^[\ufe0e\ufe0f]+$/.test(match[0]))continue;if(!renderer.exports.emojiAsset(match[0]))missing.push({value:match[0],file:path.relative(root,p)});}}}}
scan(root+'/src');assert.deepEqual(missing,[],'Unregistered emoji: add canonical artwork before building');
const dir=root+'/public/fainance-icons/emoji';const files=fs.readdirSync(dir);assert.equal(files.length,names.size);
for(const name of names){const data=fs.readFileSync(dir+'/'+name+'.png');assert.equal(data.subarray(1,4).toString(),'PNG');assert.equal(data.readUInt32BE(16),72);assert.equal(data.readUInt32BE(20),72);}
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let nativeCopies=0;
for(const file of fs.readdirSync(root+'/android/app/src/main/res/drawable-xxxhdpi').filter(n=>n.startsWith('canonical_'))){const name=file.slice(10,-4).replaceAll('_','-');assert.equal(hash(root+'/android/app/src/main/res/drawable-xxxhdpi/'+file),hash(dir+'/'+name+'.png'));nativeCopies++;}
const ios=root+'/ios/App/FainanceWidgets/CanonicalIcons.xcassets';
for(const folder of fs.readdirSync(ios).filter(n=>n.endsWith('.imageset'))){const name=folder.slice(10,-9);assert.equal(hash(ios+'/'+folder+'/icon.png'),hash(dir+'/'+name+'.png'));nativeCopies++;}
const config=JSON.parse(fs.readFileSync(root+'/tsconfig.json','utf8'));assert.equal(config.compilerOptions.jsxImportSource,'@fainance/icons');
assert(fs.readFileSync(root+'/vite.config.ts','utf8').includes("jsxImportSource: '@fainance/icons'"));
console.log(JSON.stringify({icons:names.size,sourceOccurrences:occurrences,nativeCopies,missing:0,artwork:'identical packaged PNG pixels',iosCompilation:'separate verification required'}));
