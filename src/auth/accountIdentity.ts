export function fainanceMinimalAuthUser(payload:any){
  payload=payload||{};
  return {uid:payload.uid||payload.id||"",email:payload.email||"",displayName:payload.displayName||payload.name||"Utente"};
}
export function fainanceResolveLegalAcceptance(profile:any,accountData?:any){
  profile=profile||{};accountData=accountData||{};
  var candidates=[profile.legalAcceptanceV2,accountData.legalAcceptanceV2];
  for(var i=0;i<candidates.length;i++){
    var value=candidates[i];
    if(value&&typeof value==="object"&&value.accepted===true&&value.terms===true&&value.privacy===true){
      return {accepted:true,terms:true,privacy:true,metaEventsConsent:!!value.metaEventsConsent,acceptedAt:String(value.acceptedAt||profile.legalAcceptanceDate||accountData.legalAcceptanceDate||new Date().toISOString()),version:String(value.version||"2026-07-30")};
    }
  }
  var accepted=!!((profile.termsAccepted&&profile.privacyAccepted)||(accountData.termsAccepted&&accountData.privacyAccepted));
  if(!accepted)return null;
  return {accepted:true,terms:true,privacy:true,metaEventsConsent:!!(profile.metaEventsConsent||accountData.metaEventsConsent),acceptedAt:String(profile.legalAcceptanceDate||accountData.legalAcceptanceDate||new Date().toISOString()),version:"2026-07-30"};
}
