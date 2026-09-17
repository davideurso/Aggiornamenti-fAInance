const normalize=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();

// An AI proposal repeating the configured default is not by itself evidence
// that the user selected it. Non-default choices remain protected, as do
// explicit payment references in the originating user request.
export function assistantUsesDefaultPayment(action,defaultMethod,request){
  if(!action.methodName)return true;
  if(!defaultMethod||normalize(action.methodName)!==normalize(defaultMethod.name))return false;
  if(action._rulePaymentExplicit===true)return false;
  // Missing provenance is ambiguous: preserve the existing choice.
  if(!String(request||'').trim())return false;
  const words=' '+normalize(request)+' ';
  if(words.includes(' '+normalize(defaultMethod.name)+' '))return false;
  const paymentWords=/(?:^| )(carta|carte|card|tarjeta|cartao|karte|karta|kaart|contanti|cash|efectivo|especes|numerario|bargeld|gotowka|numerar|μετρητα|καρτα|conto|account|cuenta|compte|konto|rekening|bonifico|transfer|virement|uberweisung|predefinito|default|standard)(?= |$)/u;
  return !paymentWords.test(normalize(request));
}
