const WORDS:Record<string,string[]>={
 it:["Ricezione","Non specificato","Luogo non disponibile"],
 en:["Received into","Not specified","Location unavailable"],
 es:["Lugar de recepción","Sin especificar","Lugar no disponible"],
 fr:["Lieu de réception","Non précisé","Lieu indisponible"],
 de:["Eingangsort","Nicht angegeben","Ort nicht verfügbar"],
 pt:["Local de recebimento","Não especificado","Local indisponível"],
 pl:["Miejsce otrzymania","Nie określono","Miejsce niedostępne"],
 nl:["Ontvangen op","Niet opgegeven","Locatie niet beschikbaar"],
 ro:["Locul primirii","Nespecificat","Loc indisponibil"],
 el:["Τόπος είσπραξης","Δεν καθορίστηκε","Μη διαθέσιμος τόπος"]
};
export function incomeReceiptText(lang:string,key:"label"|"unspecified"|"unavailable"){
 const words=WORDS[String(lang||"en").toLowerCase().split(/[-_]/)[0]]||WORDS.en;
 return words[{label:0,unspecified:1,unavailable:2}[key]];
}
