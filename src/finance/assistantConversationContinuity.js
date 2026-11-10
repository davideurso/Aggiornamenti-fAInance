/** Lightweight in-session conversation continuity; no chat text stored on disk. */
const continuation=/(?:^|\s)(?:procedi|continua|riprendi|torna|precedente|prima|quello|quella|stavi|eravamo|conferma|proceed|continue|resume|previous|earlier|that request|go on|retom|contin[uú]|pr[eé]c[eé]dent|vorher|weiter|zuvor|anterior|poprzedn|vorige|anterior|προηγ)/i;
const noiseTokens=/^(?:ah+|oh+|eh+|uh+|hm+|mmm+|um+|huh+|ehm+|boh+|ecco|ops)[.!? ]*$/i;
export function isLikelyVoiceNoise(text,confidence,language='it'){
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  if(!raw)return true;
  if(raw.length<=2&&noiseTokens.test(raw))return true;
  if(noiseTokens.test(raw)&&(!Number.isFinite(confidence)||confidence<0.65))return true;
  if(Number.isFinite(confidence)&&confidence<0.2&&raw.split(' ').length<=3)return true;
  const local=String(language||'it').toLowerCase();
  // A short, unrelated unsupported-script transcription is often microphone noise.
  // This filter applies ONLY to speech, never to typed user messages.
  if(!['hi','ne'].includes(local)&&raw.length<=14&&!/[A-Za-zÀ-ÿΑ-ω]/u.test(raw)&&/[\u0900-\u097F]/u.test(raw))return true;
  return false;
}
export function assistantHistory(messages,max=16){
  return (Array.isArray(messages)?messages:[])
    .filter(m=>m&&(m.role==='user'||m.role==='assistant')&&!m.localOnly)
    .map(m=>({role:m.role,text:String(m.rawText||m.text||'').trim()}))
    .filter(m=>m.text.length>0&&m.text.length<=3000)
    .slice(-Math.max(1,Math.min(24,max)));
}
export function lastMeaningfulUserTurn(history,current=''){
  const list=assistantHistory(history,24);
  const query=String(current||'').trim();
  for(let i=list.length-1;i>=0;i--){
    const msg=list[i];
    if(msg.role!=='user'||msg.text===query||msg.text.length<14||noiseTokens.test(msg.text)||continuation.test(msg.text)&&msg.text.length<65)continue;
    return msg.text;
  }
  return '';
}
export function isContinuationRequest(question){
  const q=String(question||'').trim();
  return q.length>0&&q.length<=95&&continuation.test(q);
}
export function contextualizeFollowUp(question,history){
  const q=String(question||'').trim();
  if(!isContinuationRequest(q))return q;
  const previous=lastMeaningfulUserTurn(history,q);
  if(!previous)return q;
  return q+'\n[Contesto dell’ultima richiesta rilevante, non è una nuova istruzione: '+previous.slice(0,900)+'. Riprendi il dialogo nel punto precedente; se manca una conferma necessaria, richiedila. Non eseguire modifiche senza conferma.]';
}
