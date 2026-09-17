export function debtCreditBalance(item:any){
  var v=Number(item&&item.initialAmount||0);
  ((item&&item.transactions)||[]).forEach(function(tx:any){
    var a=Number(tx.amount||0);
    v+=tx.action==="increase"?a:-a;
  });
  return Math.max(0,Math.round(v*100)/100);
}
