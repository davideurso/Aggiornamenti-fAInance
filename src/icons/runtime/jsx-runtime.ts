import React, { forwardRef, useLayoutEffect, useRef, useState } from 'react';
import * as original from 'react/jsx-runtime';
import { canonicalText, canonicalHtml, emojiParts, plainIconText } from '../canonicalEmoji';
export { Fragment } from 'react/jsx-runtime';
export type { JSX } from 'react/jsx-runtime';
// Keep native select behavior (keyboard, focus, value and events). Its selected
// icon is our bundled image; native option labels use text rather than OS emoji.
const CanonicalSelect = forwardRef<HTMLSelectElement, any>(function CanonicalSelect(props, forwarded) {
  const own = useRef<HTMLSelectElement>(null);
  const [icon,setIcon] = useState('');
  const update = () => { const el=own.current; const option=el?.selectedOptions?.[0]; const next=option?.getAttribute('data-fainance-option-icon') || ''; setIcon(old => old === next ? old : next); };
  useLayoutEffect(update);
  const ref = (node: HTMLSelectElement | null) => { own.current=node; if(typeof forwarded==='function')forwarded(node); else if(forwarded)(forwarded as any).current=node; };
  const style = icon ? {...props.style,backgroundImage:`url("${icon}")`,backgroundRepeat:'no-repeat',backgroundPosition:'12px center',backgroundSize:'1.1em 1.1em',paddingLeft:'2.2em'} : props.style;
  return original.jsx('select', {...props,ref,style,onChange:(event:any) => { props.onChange?.(event); update(); }});
});
function strings(children:any):string { return Array.isArray(children) ? children.map(strings).join('') : typeof children==='string'||typeof children==='number' ? String(children) : ''; }
function normalize(type:any,props:any): [any,any] {
  if (!props || typeof type !== 'string') return [type,props];
  if(type==='button' && typeof props.children==='string' && ['×','✕','☰'].includes(props.children.trim()) && !props['aria-label'] && !props['aria-labelledby'])props={...props,'aria-label':props.children.trim()};
  const scrim = props.style;
  if (scrim?.position === 'fixed' && (scrim.inset === 0 || scrim.inset === '0') && /^rgba\(/.test(String(scrim.background || scrim.backgroundColor || ''))) props={...props,'data-fainance-overlay':'true'};
  if (type === 'select') return [CanonicalSelect,props];
  if (type === 'option') { const label=strings(props.children), parts=emojiParts(label), asset=parts.find(p=>p.asset)?.asset; return [type,{...props,value:props.value === undefined ? label : props.value,children:plainIconText(label)||props['aria-label']|| (asset?'Icona':label),'data-fainance-option-icon':asset||undefined}]; }
  if(props.dangerouslySetInnerHTML?.__html && typeof props.dangerouslySetInnerHTML.__html==='string') return [type,{...props,dangerouslySetInnerHTML:{__html:canonicalHtml(props.dangerouslySetInnerHTML.__html)}}];
  if (['textarea','script','style','title','text','tspan'].includes(type) || props.contentEditable || props.dangerouslySetInnerHTML) return [type,props];
  return [type,{...props,children:canonicalText(props.children)}];
}
export function jsx(type:any,props:any,key?:any) { const [t,p]=normalize(type,props); return original.jsx(t,p,key); }
export function jsxs(type:any,props:any,key?:any) { const [t,p]=normalize(type,props); return original.jsxs(t,p,key); }
