// Logica vocale comune fAInance: Entrate/Uscite singole e Share.
// Questa libreria contiene funzioni pure, quindi testabili senza UI.

export type FainanceVoiceParticipant = { id:string; label?:string; name?:string; email?:string; isCurrent?:boolean };
export type FainanceShareVoiceResult = {
  amount?:number;
  description?:string;
  paidBy?:string;
  participantIds?:string[];
  splitMode?:"equal"|"amount"|"percent";
  splitDraft?:Record<string,string>;
  warning?:string;
  date?:string;
};

function title(s:string):string{s=String(s||"").trim();return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
function esc(s:string):string{return String(s||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function round2(n:number):number{return Math.round((Number(n)||0)*100)/100;}
function moneyStr(n:number):string{return String(round2(n)).replace(".",",");}

export function voiceNormalizeText(value:any):string{
  return String(value||"").toLowerCase()
    .replace(/[€]/g," euro ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[’']/g," ")
    .replace(/[;:!?()]/g," ")
    .replace(/[,]/g," ")
    .replace(/\s+/g," ").trim();
}

const UNITS:any={zero:0,un:1,uno:1,una:1,due:2,tre:3,quattro:4,cinque:5,sei:6,sette:7,otto:8,nove:9,dieci:10,undici:11,dodici:12,tredici:13,quattordici:14,quindici:15,sedici:16,diciassette:17,diciotto:18,diciannove:19};
const TENS:any={venti:20,trenta:30,quaranta:40,cinquanta:50,sessanta:60,settanta:70,ottanta:80,novanta:90};

export function voiceItalianNumberWordToNumber(w:any):number{
  var s=voiceNormalizeText(w).replace(/\s+/g,"");
  if(UNITS[s]!=null)return UNITS[s];
  if(TENS[s]!=null)return TENS[s];
  if(s==="cento")return 100;
  if(s.indexOf("cento")===0){var tail=s.slice(5);return 100+(tail?voiceItalianNumberWordToNumber(tail):0);}
  var keys=Object.keys(TENS).sort(function(a,b){return b.length-a.length;});
  for(var i=0;i<keys.length;i++){
    var t=keys[i];
    if(s.indexOf(t)===0){var tail2=s.slice(t.length);return TENS[t]+(tail2?voiceItalianNumberWordToNumber(tail2):0);}
    var short=t.replace(/[aeiou]$/,"");
    if(short&&s.indexOf(short)===0){var tail3=s.slice(short.length);var u=voiceItalianNumberWordToNumber(tail3);if(u>0)return TENS[t]+u;}
  }
  return 0;
}

export function voiceReplaceItalianNumberWords(raw:any):string{
  var text=String(raw||"");
  var words=[
    "centoventi","centodieci","cento",
    "novantanove","novantotto","novantasette","novantasei","novantacinque","novantaquattro","novantatre","novantadue","novantuno","novanta",
    "ottantanove","ottantotto","ottantasette","ottantasei","ottantacinque","ottantaquattro","ottantatre","ottantadue","ottantuno","ottanta",
    "settantanove","settantotto","settantasette","settantasei","settantacinque","settantaquattro","settantatre","settantadue","settantuno","settanta",
    "sessantanove","sessantotto","sessantasette","sessantasei","sessantacinque","sessantaquattro","sessantatre","sessantadue","sessantuno","sessanta",
    "cinquantanove","cinquantotto","cinquantasette","cinquantasei","cinquantacinque","cinquantaquattro","cinquantatre","cinquantadue","cinquantuno","cinquanta",
    "quarantanove","quarantotto","quarantasette","quarantasei","quarantacinque","quarantaquattro","quarantatre","quarantadue","quarantuno","quaranta",
    "trentanove","trentotto","trentasette","trentasei","trentacinque","trentaquattro","trentatre","trentadue","trentuno","trenta",
    "ventinove","ventotto","ventisette","ventisei","venticinque","ventiquattro","ventitre","ventidue","ventuno","venti",
    "diciannove","diciotto","diciassette","sedici","quindici","quattordici","tredici","dodici","undici","dieci",
    "nove","otto","sette","sei","cinque","quattro","tre","due","uno","una","un"
  ];
  words.forEach(function(w){
    var v=voiceItalianNumberWordToNumber(w);
    if(v>0)text=text.replace(new RegExp("\\b"+esc(w)+"\\b","ig"),String(v));
  });
  return text;
}

function normalizeAmountValue(numText:string, fullText:string, token:string):number{
  var v=parseFloat(String(numText||"").replace(",","."));
  if(isNaN(v))return 0;
  // Correzione ASR frequente: "cento euro" viene trascritto come "€1.00".
  // La app lavora in contesto vocale, non in inserimento manuale: se il token è proprio €1.00
  // e la frase parla di "pagati/pagata/pagato da", interpretiamo come 100.
  if(/^€\s*1\.00$/i.test(String(token||"").trim())&&/\bpagat[ioaiae]*\s+da\b/i.test(voiceNormalizeText(fullText))){
    return 100;
  }
  return v;
}

export function voiceParseAmounts(raw:any):Array<{value:number;index:number;text:string}>{
  var src=voiceReplaceItalianNumberWords(String(raw||""));
  var out:Array<{value:number;index:number;text:string}>=[];
  // Importi vocali con centesimi: "14 euro e 22 centesimi", "14 € e 22", "14 con 22 centesimi".
  var centsRe=/(€\s*)?(\d{1,6})\s*(?:euro|eur|€)?\s*(?:e|ed|con|virgola)\s*(\d{1,2})\s*(?:centesimi|centesimo|cent|cents)?/ig;
  var cm:any;
  var occupied:Array<[number,number]>=[];
  while((cm=centsRe.exec(src))){
    var euro=parseInt(cm[2],10);
    var cents=parseInt(cm[3],10);
    if(!isNaN(euro)&&!isNaN(cents)&&cents>=0&&cents<100){
      out.push({value:euro+(cents/100),index:cm.index,text:cm[0]});
      occupied.push([cm.index,cm.index+cm[0].length]);
    }
  }
  function overlaps(i:number){return occupied.some(function(r){return i>=r[0]&&i<r[1];});}
  var re=/(€\s*)?(\d{1,6}(?:[\.,]\d{1,2})?)\s*(euro|eur|€)?/ig;
  var m:any;
  while((m=re.exec(src))){
    if(overlaps(m.index))continue;
    var token=m[0];
    var v=normalizeAmountValue(m[2],src,token);
    if(!isNaN(v)&&v>0)out.push({value:v,index:m.index,text:token});
  }
  return out.sort(function(a,b){return a.index-b.index;});
}

function participantAliases(p:FainanceVoiceParticipant):string[]{
  var out=[p.label,p.name,p.email].filter(Boolean).map(String);
  if(p.label){var first=String(p.label).split(/\s+/)[0];if(first)out.push(first);}
  if(p.name){var first2=String(p.name).split(/\s+/)[0];if(first2)out.push(first2);}
  if(p.isCurrent)out.push("io","me","me stesso","me stessa");
  return Array.from(new Set(out.map(voiceNormalizeText).filter(Boolean)));
}

function containsAlias(normText:string, alias:string):boolean{
  return !!alias&&new RegExp("(^|\\s)"+esc(alias)+"(\\s|$)","i").test(normText);
}

function cleanDescription(raw:any, participants:FainanceVoiceParticipant[], totalText?:string):string{
  var s=voiceReplaceItalianNumberWords(String(raw||""));
  if(totalText)s=s.replace(totalText," ");
  participants.forEach(function(p){
    participantAliases(p).forEach(function(a){
      if(!a)return;
      s=s.replace(new RegExp("\\b"+esc(a)+"\\b\\s*(pago|paga|pagano|metto|mette|quota|ha pagato|ho pagato)?\\s*(?:€\\s*)?\\d*(?:[\\.,]\\d{1,2})?\\s*(euro|eur|€|percento|%)?","ig")," ");
    });
  });
  s=s.replace(/\b(pagati da|pagate da|pagata da|pagato da|ha pagato|ho pagato|paga tutto|pago tutto|totale|conto|spesa|uscita|entrata|share|condivisa|divisa|diviso|dividere|a meta|meta|uguale|uguali|insieme|con|da|a|per|in|il resto|resto|restante|quello che manca|il|lo|la|i|gli|le|un|una|uno|e|ed|and|euro|eur|centesimi|centesimo|cent|cents|percento|quota|quote|importi|percentuali|equa|io|me|pagati|pagate|pagata|pagato|paga|pago)\b/ig," ");
  s=s.replace(/\b\d{1,6}\s*(euro|eur|€)?\s*(e|ed|con|virgola)\s*\d{1,2}\s*(centesimi|centesimo|cent|cents)?\b/ig," ");
  s=s.replace(/\b\d{1,2}\s+(giorni|giorno|days|day)\s+fa\b/ig," ").replace(/\b(oggi|ieri|avantieri|altro ieri|today|yesterday|day before yesterday)\b/ig," ");
  s=s.replace(/[€.,]/g," ").replace(/\d+(?:[\.,]\d{1,2})?/g," ").replace(/\s+/g," ").trim();
  return title(s);
}

function explicitPayer(normText:string, participants:FainanceVoiceParticipant[], currentId:string):string{
  var paidBy=currentId;
  participants.forEach(function(p){
    participantAliases(p).forEach(function(a){
      if(!a)return;
      if(new RegExp("\\b(pagat[ioaiae]*|spes[aoe]?|conto)\\s+da\\s+"+esc(a)+"\\b","i").test(normText)||
         new RegExp("\\b"+esc(a)+"\\s+(ha\\s+pagato|paga\\s+tutto)\\b","i").test(normText)){
        paidBy=String(p.id);
      }
    });
  });
  if(/\b(ho pagato|pagat[ioaiae]* da me|pagat[ioaiae]* da io|pago tutto io)\b/i.test(normText))paidBy=currentId;
  return paidBy;
}


function localDateOffset(days:number):string{
  var d=new Date();
  d.setDate(d.getDate()-days);
  var y=d.getFullYear();
  var m=String(d.getMonth()+1).padStart(2,"0");
  var day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
}
export function voiceParseRelativeDate(raw:any):string|undefined{
  var fixed=voiceReplaceItalianNumberWords(String(raw||""));
  var n=voiceNormalizeText(fixed);
  if(/\b(oggi|today)\b/i.test(n))return localDateOffset(0);
  if(/\b(ieri|yesterday)\b/i.test(n))return localDateOffset(1);
  if(/\b(avantieri|altro ieri|day before yesterday)\b/i.test(n))return localDateOffset(2);
  var m=n.match(/\b(\d{1,2})\s+(giorni|giorno|days|day)\s+fa\b/i);
  if(m){var days=parseInt(m[1],10);if(days>0&&days<370)return localDateOffset(days);}
  return undefined;
}
export function parseFainanceShareVoiceCommand(rawInput:any, participantsInput:FainanceVoiceParticipant[], currentId:string):FainanceShareVoiceResult{
  var raw=String(rawInput||"").trim();
  var participants=(participantsInput||[]).map(function(p){return {...p,isCurrent:p.isCurrent||String(p.id)===String(currentId)};});
  var current=participants.find(function(p){return String(p.id)===String(currentId);})||participants[0];
  var fixed=voiceReplaceItalianNumberWords(raw);
  var norm=voiceNormalizeText(fixed);
  var date=voiceParseRelativeDate(fixed);
  var amounts=voiceParseAmounts(fixed);
  var total=amounts.length?amounts[0].value:0;
  var totalText=amounts.length?amounts[0].text:"";
  var paidBy=explicitPayer(norm,participants,String(current?current.id:currentId));
  var mentioned:string[]=[];
  function addMention(id:string){if(id&&mentioned.indexOf(id)<0)mentioned.push(id);}

  var splitDraft:any={};
  var percentDraft:any={};
  var mode:"equal"|"amount"|"percent"="equal";

  participants.forEach(function(p){
    var pid=String(p.id);
    participantAliases(p).forEach(function(a){
      if(!a)return;
      if(containsAlias(norm,a))addMention(pid);

      // Percentuali
      var pct1=new RegExp("\\b"+esc(a)+"\\s+(?:quota|paga|mette|ha)?\\s*(\\d+(?:[\\.,]\\d{1,2})?)\\s*(?:percento|%)\\b","i");
      var pct2=new RegExp("\\b(\\d+(?:[\\.,]\\d{1,2})?)\\s*(?:percento|%)\\s+(?:a|per)?\\s*"+esc(a)+"\\b","i");
      var pm=norm.match(pct1)||norm.match(pct2);
      if(pm){
        percentDraft[pid]=String(pm[1]).replace(".",",");
        mode="percent";addMention(pid);return;
      }

      // Importi come quota: "io 40", "Francesca 2", "Francesca paga 2", "per Francesca 2".
      // Non interpreta "pagati da Francesca" come quota perché in quel caso non c'è importo dopo il nome.
      var amount1=new RegExp("\\b"+esc(a)+"\\s+(?:ho\\s+pagato|pago|paga|metto|mette|quota)?\\s*(?:(?:€|euro|eur)\\s*)?(\\d+(?:[\\.,]\\d{1,2})?)\\s*(?:euro|eur|€)?\\b","i");
      var amount2=new RegExp("\\b(?:a|per)\\s+"+esc(a)+"\\s*(?:(?:€|euro|eur)\\s*)?(\\d+(?:[\\.,]\\d{1,2})?)\\s*(?:euro|eur|€)?\\b","i");
      var amount3=new RegExp("\\b(?:€\\s*)?(\\d+(?:[\\.,]\\d{1,2})?)\\s*(?:euro|eur|€)?\\s+(?:a|per)\\s+"+esc(a)+"\\b","i");
      var mm=norm.match(amount1)||norm.match(amount2)||norm.match(amount3);
      if(mm){
        var val=parseFloat(String(mm[1]).replace(",","."));
        // Se coincide col totale e il nome è dentro "pagati da Nome", non è una quota.
        var isPayerPhrase=new RegExp("\\bpagat[ioaiae]*\\s+da\\s+"+esc(a)+"\\b","i").test(norm);
        if(!isPayerPhrase&&!isNaN(val)&&val>0&&!(total>0&&Math.abs(val-total)<0.009)){
          splitDraft[pid]=moneyStr(val);mode="amount";addMention(pid);
        }
      }

      var rest1=new RegExp("\\b"+esc(a)+"\\s+(?:il\\s+)?(?:resto|restante|quello\\s+che\\s+manca)\\b","i");
      var rest2=new RegExp("\\b(?:resto|restante|quello\\s+che\\s+manca)\\s+(?:a|per)?\\s*"+esc(a)+"\\b","i");
      if((rest1.test(norm)||rest2.test(norm))&&total>0){
        splitDraft[pid]="__REST__";mode="amount";addMention(pid);
      }
    });
  });

  if(mode==="amount"){
    var known=0,restIds:string[]=[];
    Object.keys(splitDraft).forEach(function(k){
      if(splitDraft[k]==="__REST__")restIds.push(k);
      else known+=parseFloat(String(splitDraft[k]).replace(",","."))||0;
    });
    if(total>0&&restIds.length){
      splitDraft[restIds[0]]=moneyStr(Math.max(0,total-known));
    }
    var keys=Object.keys(splitDraft);
    var sum=keys.reduce(function(a,k){return a+(parseFloat(String(splitDraft[k]).replace(",","."))||0);},0);
    if(!total&&sum>0)total=round2(sum);
    if(total>0&&sum>total&&keys.length>=2){
      var last=keys[keys.length-1];
      var others=keys.filter(function(k){return k!==last;}).reduce(function(a,k){return a+(parseFloat(String(splitDraft[k]).replace(",","."))||0);},0);
      var residual=round2(total-others);
      if(residual>0)splitDraft[last]=moneyStr(residual);
    }
  }

  if(mode==="percent"){
    var pKeys=Object.keys(percentDraft);
    var pSum=pKeys.reduce(function(a,k){return a+(parseFloat(String(percentDraft[k]).replace(",","."))||0);},0);
    if(pSum<100&&pKeys.length===1&&mentioned.length>1){
      var restPct=mentioned.find(function(id){return !percentDraft[id];});
      if(restPct)percentDraft[restPct]=moneyStr(100-pSum);
    }
  }

  // Regola Davide: se non viene specificata una divisione, divide equamente tra tutti gli appartenenti al gruppo.
  var participantIds:string[];
  if(mode==="equal"){
    participantIds=participants.map(function(p){return String(p.id);});
  }else{
    participantIds=mentioned.length?mentioned.slice():participants.map(function(p){return String(p.id);});
    if(current&&!participantIds.includes(String(current.id)))participantIds.unshift(String(current.id));
  }

  var desc=cleanDescription(fixed,participants,totalText);
  return {
    amount:total||undefined,
    description:desc||"",
    paidBy:paidBy,
    participantIds:participantIds,
    splitMode:mode,
    splitDraft:mode==="percent"?percentDraft:(mode==="amount"?splitDraft:{}),
    warning:"",
    date:date
  };
}

export function parseFainanceSingleVoiceCommon(rawInput:any){
  var raw=String(rawInput||"").trim();
  var converted=voiceReplaceItalianNumberWords(raw);
  var amounts=voiceParseAmounts(converted);
  var total=amounts.length?amounts[0].value:0;
  var n=voiceNormalizeText(converted);
  var type=/\b(entrata|incasso|ricevuto|stipendio|salario|salary|income|ingreso|revenu|receita|einnahme|gehalt)\b/i.test(n)&&!/\b(uscita|spesa|pagato|pagata|expense|gasto|despesa|ausgabe)\b/i.test(n)?"income":"expense";
  var desc=cleanDescription(converted,[],amounts.length?amounts[0].text:"");
  return {amount:total,type:type,description:desc,normalized:n,converted:converted,date:voiceParseRelativeDate(converted)};
}
