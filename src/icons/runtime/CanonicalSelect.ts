import {PopupCloseButton} from '../../ui/PopupCloseButton';
import React,{forwardRef,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {getCatalogIconRenderer,getCatalogIconAsset,subscribeCatalogIconAssets} from './iconRendererBridge';
import {emojiAsset} from '../canonicalEmoji';
// Preserve the real select, its ref, validation and change event. The same
// packaged icons are rendered in every open list, independent of Android's picker.
export const CanonicalSelect=forwardRef<HTMLSelectElement,any>(function CanonicalSelect(props,forwarded){
 const own=useRef<HTMLSelectElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null);
 const hasIcons=(children:any):boolean=>React.Children.toArray(children).some((child:any)=>React.isValidElement(child)&&((child.props as any)['data-fainance-icon-ref']||(child.props as any)['data-fainance-option-icon']||hasIcons((child.props as any).children)));
 const custom=!props.multiple&&!(Number(props.size)>1)&&hasIcons(props.children);
 const [icon,setIcon]=useState(''),[open,setOpen]=useState(false),[options,setOptions]=useState<any[]>([]),[dark,setDark]=useState(false);
 const update=()=>{const el=own.current;const selected=el?.selectedOptions?.[0],value=selected?.getAttribute('data-fainance-icon-ref')||'';setIcon(getCatalogIconAsset(value)||selected?.getAttribute('data-fainance-option-icon')||emojiAsset(value)||'');};
 useLayoutEffect(update);
 useEffect(()=>subscribeCatalogIconAssets(update),[]);
 useLayoutEffect(()=>{if(custom&&props.autoFocus)trigger.current?.focus({preventScroll:true});},[custom,props.autoFocus]);
 useLayoutEffect(()=>{
  if(!open)return;
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  const first=panel.current?.querySelector<HTMLElement>('[aria-selected="true"]:not(:disabled)')||panel.current?.querySelector<HTMLElement>('[role="option"]:not(:disabled)');first?.focus({preventScroll:true});
  const back=(event:Event)=>{event.preventDefault();setOpen(false);};
  document.addEventListener('fainance-close-overlay',back);
  return()=>{document.body.style.overflow=old;document.removeEventListener('fainance-close-overlay',back);(trigger.current||own.current)?.focus({preventScroll:true});};
 },[open]);
 const ref=(node:HTMLSelectElement|null)=>{own.current=node;if(typeof forwarded==='function')forwarded(node);else if(forwarded)(forwarded as any).current=node;};
 function show(event:any){
  if(props.disabled||props.multiple||Number(props.size)>1)return;
  const el=own.current;if(!el)return;
  const rows=Array.from(el.options).map((o,i)=>({index:i,label:o.label,value:o.value,disabled:o.disabled||(o.parentElement?.tagName==='OPTGROUP'&&(o.parentElement as HTMLOptGroupElement).disabled),selected:o.selected,asset:o.getAttribute('data-fainance-option-icon'),icon:o.getAttribute('data-fainance-icon-ref')}));
  if(!rows.some(o=>o.asset||o.icon))return;
  event.preventDefault();setOptions(rows);
  const color=getComputedStyle(el).color.match(/\d+/g)?.map(Number)||[0,0,0];setDark((color[0]*299+color[1]*587+color[2]*114)/1000>160);
  setOpen(true);
 }
 function choose(row:any){
  const el=own.current;if(!el||row.disabled)return;
  if(!el.options[row.index]||el.options[row.index].value!==row.value){setOpen(false);return;}
  el.selectedIndex=row.index;
  el.dispatchEvent(new Event('change',{bubbles:true}));
  update();setOpen(false);
 }
 function keys(event:React.KeyboardEvent){
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);return;}
  const rows=Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="option"]:not(:disabled)')||[]);
  const index=rows.indexOf(document.activeElement as HTMLElement);
  if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?rows.length-1:(index+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length;rows[next]?.focus();}
  if(event.key==='Tab'){const all=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')||[]),i=all.indexOf(document.activeElement as HTMLElement);if(event.shiftKey&&i<=0){event.preventDefault();all[all.length-1]?.focus();}else if(!event.shiftKey&&i===all.length-1){event.preventDefault();all[0]?.focus();}}
 }
 const label=props['aria-label']||Array.from(own.current?.labels||[]).map(node=>{const copy=node.cloneNode(true) as HTMLElement;copy.querySelectorAll('select,button,input,textarea').forEach(control=>control.remove());return (copy.textContent||'').replace(/\s+/g,' ').trim();}).filter(Boolean).join(' ');
 const style=icon?{...props.style,backgroundImage:'url("'+icon+'")',backgroundRepeat:'no-repeat',backgroundPosition:'12px center',backgroundSize:'1.1em 1.1em',paddingLeft:'2.2em'}:props.style;
 // A real button owns touch activation. Opening on native select pointerdown
 // lets the later compatibility click land on the new backdrop and close it.
 const native=React.createElement('select',{...props,ref,autoFocus:custom?false:props.autoFocus,style:custom?{position:'fixed',left:0,top:0,width:1,height:1,opacity:0,pointerEvents:'none',clipPath:'inset(50%)'}:style,tabIndex:custom?-1:props.tabIndex,'aria-hidden':custom||undefined,onChange:(e:any)=>{props.onChange?.(e);update();}});
 const selected=own.current?.selectedOptions?.[0];
 const button=custom?React.createElement('button',{ref:trigger,type:'button',role:'combobox','data-fainance-select-trigger':'true',disabled:props.disabled,'aria-label':label,'aria-haspopup':'listbox','aria-expanded':open,style:{font:'inherit',textAlign:'left',cursor:'pointer',...style},onClick:(e:any)=>{e.preventDefault();e.stopPropagation();show(e);},onKeyDown:(e:any)=>{if(['ArrowDown','ArrowUp'].includes(e.key))show(e);}},selected?.label||''):null;
 if(!open)return React.createElement(React.Fragment,null,native,button);
 const fg=dark?'#F4F7FB':'#14263D',bg=dark?'#10243A':'#FFFFFF',border=dark?'#29455F':'#D8E1EA';
 const dialog=React.createElement('div',{'data-fainance-overlay':'true',onClick:(e:any)=>{if(e.target===e.currentTarget)setOpen(false);},style:{position:'fixed',inset:0,zIndex:2147483000,background:'rgba(0,0,0,.48)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}},
  React.createElement('div',{ref:panel,role:'dialog','aria-modal':true,'aria-label':label||'Selection',onKeyDown:keys,style:{background:bg,color:fg,borderRadius:16,width:'min(100%,480px)',maxHeight:'min(80dvh,700px)',display:'flex',flexDirection:'column',boxShadow:'0 12px 48px #0005'}},
   React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid '+border}},React.createElement('strong',null,label),React.createElement(PopupCloseButton,{dark,label:'Chiudi',onClick:()=>setOpen(false)})),
   React.createElement('div',{role:'listbox','aria-label':label||'Selection',style:{overflowY:'auto',overscrollBehavior:'contain',padding:4}},options.map(row=>React.createElement('button',{key:row.index,type:'button',role:'option',disabled:row.disabled,'aria-selected':row.selected,onClick:()=>choose(row),style:{width:'100%',display:'grid',gridTemplateColumns:'28px minmax(0,1fr) 20px',gap:12,alignItems:'center',textAlign:'left',padding:'14px 12px',minHeight:52,border:0,borderBottom:'1px solid '+border,borderRadius:8,background:row.selected?(dark?'#245B8E':'#EDF3FA'):'transparent',color:fg,opacity:row.disabled ? 0.5 : 1,font:'inherit',fontSize:16,cursor:'pointer'}},
     row.icon && getCatalogIconRenderer() && (row.icon!=="📁" || !row.asset)?React.createElement(getCatalogIconRenderer(),{value:row.icon,size:24}):React.createElement('img',{src:row.asset||emojiAsset('📁')!,alt:'',width:24,height:24,draggable:false}),
     React.createElement('span',{style:{overflowWrap:'anywhere'}},row.label),React.createElement('span',{'aria-hidden':true},row.selected?'✓':''))))));
 return React.createElement(React.Fragment,null,native,button,createPortal(dialog,document.body));
});
