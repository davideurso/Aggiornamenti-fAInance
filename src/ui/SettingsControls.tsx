import {useApp} from '../core';
import {readableDarkText, parseTextColor, textContrastRatio} from './textContrast';
import {translateFainanceText} from '../traduzioni';

export function secondarySettingsStyle(c:any):any {
 const color=c.secondaryButtonColor||'#5FAFE5';
 const background=parseTextColor(color), blue=parseTextColor('#052A5F')!;
 const label=!background||textContrastRatio([255,255,255],background)>=4.5?'#fff':textContrastRatio(blue,background)>=4.5?'#052A5F':'#000000';
 return {minHeight:36,minWidth:36,background:color,backgroundImage:'none',color:readableDarkText(label,!!c.dark,color),border:'1px solid '+color,borderRadius:c.btnRadius||12,boxShadow:'none',fontWeight:600};
}
export function SettingsSegmented({items,value,onChange,columns,onLocked}:any){
 const c:any=useApp(),mobile=!!c.isMobile;
 const cols=Number(columns)||(mobile&&items.length>2?2:Math.max(1,items.length));
 return <div data-settings-segmented style={{display:'grid',gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,gap:4,background:c.dark?'#252535':'#f5f5f5',borderRadius:12,padding:3,marginBottom:12}}>
  {items.map(it=>{const active=value===it.id,disabled=!!it.disabled;return <button key={it.id} type="button" aria-pressed={active} aria-disabled={disabled} onClick={e=>{e.stopPropagation();if(disabled){if(it.lockedMessage)c.setToast(it.lockedMessage);else if(onLocked)onLocked();return;}onChange(it.id);}} style={{minWidth:0,minHeight:44,padding:mobile?'8px 5px':'9px 10px',border:'none',borderRadius:10,background:'transparent',color:c.subC||(c.dark?'#aaa':'#888'),fontSize:mobile?11:13,lineHeight:1.18,whiteSpace:'normal',overflowWrap:'anywhere',cursor:disabled?'not-allowed':'pointer',fontWeight:active?800:400,touchAction:'manipulation',WebkitTapHighlightColor:'transparent',...(active?secondarySettingsStyle(c):{}),opacity:disabled?0.55:1}}>{translateFainanceText(it.label,c.lang||'it')}{disabled?' 🔒':''}</button>;})}
 </div>;
}

// Compact action treatment reused from the existing expense category rows.
export function settingsActionStyle(c:any,kind:'edit'|'archive'|'delete'):any {
 const background=kind==='edit'?'#EEF4FF':kind==='delete'?'#FFF0F0':c.dark?'#302B48':'#F0EDFF';
 const border=kind==='edit'?'#BFD7FF':kind==='delete'?'#FFD0D0':c.dark?'#51476C':'#D8D0F2';
 return {minWidth:27,minHeight:28,padding:'4px 5px',marginLeft:-3,background,backgroundImage:'none',border:'1px solid '+border,borderRadius:8,boxShadow:'none',display:'inline-flex',alignItems:'center',justifyContent:'center'};
}
