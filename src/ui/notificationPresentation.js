
const PALETTE={
 success:{background:'#16815F',color:'#FFFFFF',border:'#16815F',icon:'✓'},
 error:{background:'#B63B45',color:'#FFFFFF',border:'#9F303A',icon:'!'},
 warning:{background:'#FFD54F',color:'#3B3000',border:'#D4AB21',icon:'!'},
 info:{background:'#245B8E',color:'#FFFFFF',border:'#1B4870',icon:'i'}
};
// Explicit severity wins. Legacy inference uses the original, untranslated text.
export function notificationTone(payload={},rawText=''){
 const type=String(payload.type||'').toLowerCase();
 if(['success','error','warning','info'].includes(type))return type;
 if(/errore|impossibile|non valid|non support|non trovato|riprova|non disponibile|non riesco|nessuna app/i.test(rawText))return 'error';
 if(/avviso|attenzione|limite|raggiunto|piano|upgrade|nessun dato|mappa almeno/i.test(rawText))return 'warning';
 if(/salvat|caricat|eliminat|aggiornat|creat|aggiunt|copiat|inviat|ripristinat|accettat|registrat|completat|pronto|attivat|disattivat|confermat|esportat|integrat|sostituit/i.test(rawText))return 'success';
 return 'info';
}
export function notificationAppearance(type='info'){
 return PALETTE[type]||PALETTE.info;
}
