export function bulkMovementRowLimit(plan:any){
  if(plan==="free")return 10;
  if(plan==="base")return 15;
  return Infinity;
}

export function bulkMovementCooldownMonths(plan:any){
  return 0;
}

export function addMonthsSafe(ms:any,months:any){
  var d=new Date(Number(ms)||Date.now());
  var day=d.getDate();
  d.setMonth(d.getMonth()+Number(months||0));
  if(d.getDate()<day)d.setDate(0);
  return d.getTime();
}

export function movementWithMethodSnapshot(x:any,resolveMethod:(id:any)=>any){
  var mid=x&&x.methodId!=null?x.methodId:(x&&x.method!=null?x.method:"");
  var m=mid!==""?resolveMethod(mid):null;
  var snapName=(x&&x.methodName)||((m&&m.name)||"");
  var out={...x};
  if(mid!==""){out.methodId=mid;if(out.method===undefined)out.method=mid;}
  if(snapName)out.methodName=snapName;
  return out;
}
