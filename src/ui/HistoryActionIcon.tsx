import { FainanceIcon } from '../icons/customIconLibrary';

export function HistoryActionIcon({kind}:{kind:'filter'|'sort'}){
 if(kind==='filter')return <span data-history-action-icon="filter" aria-hidden="true" style={{flexShrink:0,display:'inline-flex',alignItems:'center'}}><FainanceIcon value="🔎" size={22}/></span>;
 return <svg data-history-action-icon="sort" aria-hidden="true" width="27" height="26" viewBox="0 0 30 26" fill="none" style={{flexShrink:0,display:'block'}}>
  <path d="M9 3 3 9h4v13h4V9h4Z" fill="#A4E3C8"/>
  <path d="m21 23 6-6h-4V4h-4v13h-4Z" fill="#FFD16B"/>
 </svg>;
}
