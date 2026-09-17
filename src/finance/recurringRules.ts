export function isRecurringDueInMonth(r:any,now:any,monthKey:any){
  if(!r)return false;
  if(String(r.frequency)==="annual"){
    var raw=(r.annualMonth!=null?r.annualMonth:(r.monthOfYear!=null?r.monthOfYear:(r.month!=null?r.month:r.dayOfMonth)));
    var m=parseInt(raw,10);
    if(isNaN(m)||m<1||m>12)m=1;
    if(m!==(now.getMonth()+1))return false;
  }
  return !(r.confirmed||[]).includes(monthKey)&&!(r.skipped||[]).includes(monthKey);
}
