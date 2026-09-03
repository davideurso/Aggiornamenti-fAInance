export function maskPaymentCardNumber(value:any){
  var clean=String(value||"").replace(/\D/g,"");
  if(!clean)return "";
  return "•••• •••• •••• "+clean.slice(-4);
}
