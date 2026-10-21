import {useEffect,useRef} from 'react';
/** First delivery waits for account hydration; subsequent renders cannot duplicate an alert. */
export function useSpendingAlertDispatch({ready,accountKey,rows,onPopup}:any){
 const previous=useRef<{account:string,keys:string[]}>({account:'',keys:[]});
 const signature=JSON.stringify((rows||[]).map((row:any)=>String(row._alertKey)));
 useEffect(()=>{
  const account=String(accountKey||"");
  if(previous.current.account!==account){if(previous.current.account)onPopup(null);previous.current={account,keys:[]};}
  if(!ready||!account)return;
  const prior=previous.current.keys;
  const current=(rows||[]).map((row:any)=>String(row._alertKey));
  const fresh=(rows||[]).filter((row:any)=>!prior.includes(String(row._alertKey)));
  previous.current={account,keys:current};
  if(fresh.length)onPopup((current:any[])=>[...new Map([...(current||[]),...fresh].map(row=>[row._alertKey,row])).values()]);
 },[ready,accountKey,signature,onPopup]);
}
