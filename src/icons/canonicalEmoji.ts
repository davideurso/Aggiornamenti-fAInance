import React from 'react';
import names from './emojiAssets.json';
const available = new Set(names);
const normalized = new Map(names.map(name => [name.split('-').filter(point => point !== 'fe0f' && point !== 'fe0e').join('-'), name]));
type Branch = { children: Map<number,Branch>; asset?: string };
const tree: Branch = { children:new Map() };
const aliases: Record<string,string> = { '✓':'2714', '▤':'1f4dd' };
for (const name of names) {
  let node=tree;
  for (const part of name.split('-').filter(point => point !== 'fe0f' && point !== 'fe0e')) {
    const cp=parseInt(part,16); if(!node.children.has(cp))node.children.set(cp,{children:new Map()}); node=node.children.get(cp)!;
  }
  node.asset=name;
}
for(const [value,asset] of Object.entries(aliases))tree.children.set(value.codePointAt(0)!,{children:new Map(),asset});
export function emojiAsset(value: string): string | null {
  if(aliases[value])return './fainance-icons/emoji/'+aliases[value]+'.png';
  const points = Array.from(value).map(c => c.codePointAt(0)!.toString(16));
  const exact = points.join('-');
  const key = available.has(exact) ? exact : normalized.get(points.filter(p => p !== 'fe0f' && p !== 'fe0e').join('-'));
  return available.has(key) ? './fainance-icons/emoji/' + key + '.png' : null;
}
export function emojiParts(text: string) {
  // Longest match from the packaged catalogue, including bare text-presentation
  // symbols, modifiers, flags and ZWJ sequences. Optional VS15/16 must never
  // leave a platform-specific glyph behind.
  const matches: {value:string;index:number;asset:string}[]=[];
  for(let index=0;index<text.length;) {
    let node=tree,end=index,best=index;
    while(end<text.length) {
      const cp=text.codePointAt(end)!,size=cp>0xffff?2:1;
      if((cp===0xfe0f||cp===0xfe0e)&&end>index) { end+=size; if(node.asset)best=end; continue; }
      const next=node.children.get(cp); if(!next)break; node=next; end+=size; if(node.asset)best=end;
    }
    if(best>index) { const value=text.slice(index,best); matches.push({value,index,asset:emojiAsset(value)!}); index=best; }
    else index+=text.codePointAt(index)!>0xffff?2:1;
  }
  return matches;
}
export function plainIconText(text: string) {
  let result='',offset=0; for(const part of emojiParts(String(text))) { result+=String(text).slice(offset,part.index); offset=part.index+part.value.length; } return (result+String(text).slice(offset)).replace(/\s+/g, ' ').trim();
}
export function canonicalText(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalText);
  if (typeof value !== 'string') return value;
  const symbol=symbolPath(value.trim());
  if(symbol)return React.createElement('svg',{viewBox:'0 0 24 24',width:'1em',height:'1em',fill:'none',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',role:'img','aria-label':value.trim(),'data-fainance-symbol':value.trim(),style:{display:'inline-block',verticalAlign:'-.12em',flexShrink:0}},React.createElement('path',{d:symbol}));
  const matches = emojiParts(value);
  if (!matches.length) return value;
  const nodes: any[] = []; let offset = 0;
  for (const match of matches) {
    if (match.index > offset) nodes.push(value.slice(offset, match.index));
    if (match.asset) nodes.push(React.createElement('img', {
      key: 'emoji-' + match.index, src:match.asset, alt:match.value,
      draggable:false, 'data-fainance-icon':match.value,
      style:{width:'1em',height:'1em',display:'inline-block',verticalAlign:'-0.12em',objectFit:'contain',flexShrink:0}
    }));
    else nodes.push(value.slice(match.index, match.index + match.value.length));
    offset = match.index + match.value.length;
  }
  if (offset < value.length) nodes.push(value.slice(offset));
  return nodes;
}
function symbolPath(value:string) { return value==='☰'?'M4 6h16M4 12h16M4 18h16':value==='×'||value==='✕'?'M6 6l12 12M6 18L18 6':null; }
// For owned imperative DOM panels/exports only; React-owned trees use the JSX
// runtime below. Never mutate React's text nodes behind its reconciliation.
export function canonicalizeOwnedDom(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = []; let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (parent && !parent.closest('script,style,textarea,option,svg,[contenteditable="true"]')) nodes.push(node as Text);
  }
  for (const text of nodes) {
    const symbol=symbolPath(text.data.trim());
    if(symbol){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [key,value] of Object.entries({viewBox:'0 0 24 24',width:'1em',height:'1em',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round',role:'img','aria-label':text.data.trim()}))svg.setAttribute(key,value);const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',symbol);svg.append(path);text.replaceWith(svg);continue;}
    const matches = emojiParts(text.data); if (!matches.some(m => m.asset)) continue;
    const fragment = document.createDocumentFragment(); let offset = 0;
    for (const match of matches) {
      fragment.append(document.createTextNode(text.data.slice(offset,match.index)));
      if (match.asset) { const img=document.createElement('img'); img.src=match.asset; img.alt=match.value; img.draggable=false; img.dataset.fainanceIcon=match.value; img.style.cssText='width:1em;height:1em;display:inline-block;vertical-align:-.12em;object-fit:contain'; fragment.append(img); }
      else fragment.append(document.createTextNode(match.value));
      offset=match.index+match.value.length;
    }
    fragment.append(document.createTextNode(text.data.slice(offset))); text.replaceWith(fragment);
  }
}

const htmlCache = new Map<string,string>();
export function canonicalHtml(html: string) {
  if (!html || typeof document === 'undefined' || (!emojiParts(html).length && !/[☰×✕]/.test(html))) return html;
  const found=htmlCache.get(html); if(found!==undefined)return found;
  const template=document.createElement('template'); template.innerHTML=html;
  canonicalizeOwnedDom(template.content);
  const result=template.innerHTML; if(htmlCache.size>=64)htmlCache.clear(); htmlCache.set(html,result); return result;
}
