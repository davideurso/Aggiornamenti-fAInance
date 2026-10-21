import React from 'react';
import {readableDarkText} from './textContrast';
/** One close control for every popup, including lists created by the JSX runtime. */
export function PopupCloseButton({onClick,dark,label,style,...rest}:any){
 return React.createElement('button',{...rest,'data-fainance-popup-close':'true',type:'button',onClick,'aria-label':label||'Chiudi',style:{...style,padding:0,width:28,height:28,borderRadius:9,border:'1px solid #FCA5A5',background:'#FFF0F0',color:readableDarkText('#F87171',dark,'#FFF0F0'),fontSize:14,fontWeight:950,lineHeight:1,cursor:'pointer',boxShadow:'0 3px 10px #F871712B',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}},'\u00D7');
}
