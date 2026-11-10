const id=value=>value==null?'':String(value);
export function spendingAlertSnapshot(alert,{expenses=[],categories=[],periodKey,accountingPeriod,format=String}){
 const key=alert.period==='annual'?String(periodKey).slice(0,4):String(periodKey);
 const categoryIds=alert.type==='cat'?new Set([id(alert.catId)]):new Set(categories.filter(c=>id(c.group)===id(alert.groupId)).map(c=>id(c.id)));
 const cents=expenses.filter(e=>categoryIds.has(id(e.catId))&&accountingPeriod.matches(e.date,key)).reduce((sum,e)=>sum+Math.round((Number(e.amount)||0)*100),0);
 const budget=Number(alert.budget),extra=alert.triggerMode==='immediate'?0:Number(alert.triggerPct)||0;
 const threshold=Math.round(budget*100*(1+extra/100));
 const valid=Number.isFinite(budget)&&budget>0&&extra>=0&&Number.isFinite(threshold);
 return {...alert,_spent:cents/100,_periodKey:key,_alertKey:'spending:v3:'+id(alert.id)+':'+key,triggered:valid&&cents>=threshold,spentFmt:format(cents/100),budgetFmt:format(budget),pct:budget>0?Math.min(200,cents/(budget*100)*100):0};
}
export function triggeredSpendingAlerts(options){return (options.alerts||[]).map(alert=>spendingAlertSnapshot(alert,options)).filter(row=>row.triggered);}
export function spendingAlertNotices({rows=[],seen=[],dismissed=[],userId,title='Alert superato!'}){
 if(!userId)return [];
 const read=new Set(seen.map(String)),hidden=new Set(dismissed.map(String));
 return rows.filter(row=>!hidden.has(String(row._alertKey))).map(row=>({
 id:'virtual_spending_alert_'+row._alertKey,targetUid:String(userId),type:'spending_alert',title:row.name||title,
 message:[row.customText,row.spentFmt+' / '+row.budgetFmt,row._periodKey].filter(Boolean).join(' · '),severity:'warning',
 actionType:'open_alerts',actionValue:row._alertKey,read:read.has(String(row._alertKey)),status:'active',virtual:true
 }));
}

export function suggestedAlertBudget({plan,categories=[],type='cat',catId,groupId,period='monthly'}){
 if(!Array.isArray(plan?.items))return null;
 const ids=type==='cat'?new Set([id(catId)]):new Set(categories.filter(c=>id(c.group)===id(groupId)).map(c=>id(c.id)));
 const items=plan.items.filter(item=>ids.has(id(item.catId)));
 if(!items.length)return null;
 const monthlyMinor=items.reduce((sum,item)=>sum+Math.round((Number(item.amount)||0)*100),0);
 return monthlyMinor>0?monthlyMinor*(period==='annual'?12:1)/100:null;
}
