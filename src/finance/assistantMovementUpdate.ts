import {movementWithMethodSnapshot} from './movementRules';
import {parseMoneyValue} from '../financeCalculations.js';
export const normalizedMovementText=(v:any)=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function stripPreparationAnnouncements(text:any){return String(text||'').trim().replace(/^(?:(?:ok|okay|certo|va bene|sure|bien|vale|d'accord)[,\s.!]*)?(?:preparo|sto preparando|preparero|procedo a|i will prepare|i'll prepare|i am preparing|je prepare|voy a preparar|vou preparar)[^.!?\n]*(?:[.!?]|\n|$)\s*/i,'').trim();}
function fail(code:string):never{throw Object.assign(new Error(code),{code});}
function eligible(r:any){return r&&r.id!==null&&r.id!==undefined&&!r.virtual&&!r._virtual&&!r.isVirtual&&!r.shareProjectId&&!String(r.source||'').startsWith('share_');}
function created(r:any){const value=r.createdAt;let stamp=typeof value==='number'?value:Date.parse(String(value||''));if(!Number.isFinite(stamp)){const id=Number(r.id);stamp=id>946684800000&&id<4102444800000?id:0;}return Number.isFinite(stamp)?stamp:0;}
export function latestPersonalMovement(ctx:any,kind='expense'){
  const rows=(kind==='income'?ctx.incomes:ctx.expenses)||[];
  return rows.filter(eligible).map((row:any,index:number)=>({row,index,created:created(row)})).sort((a:any,b:any)=>b.created-a.created||a.index-b.index)[0]?.row||null;
}
export function isLatestMovementQuestion(text:any){const n=normalizedMovementText(text);return /\b(ultima|ultimo|last|latest|recent|dernier|derniere|letzte|ultimo|ultima|ostatni|laatste|ultima)\b/u.test(n)&&/\b(spesa|uscita|expense|expenses|entrata|income|movement|movimento|gasto|despesa|depense|ausgabe|wydat|uitgave|cheltuiala)\b/u.test(n)&&!isMovementCorrectionText(n)&&(/\b(quale|indicami|dimmi|mostra|mostrami|dici|what|which|show|tell|cual|muestra|qual|montre|quelle|welche|toon|jak|care)\b/u.test(n)||n.split(' ').length<=4);}
export function isMovementCorrectionText(text:any){const n=normalizedMovementText(text);if(/\b(quale|quanto|quanti|what|which|how|show|mostra|mostrami|quando)\b/u.test(n)||String(text).includes('?'))return false;return /\b(metodo di pagamento|pagamento|payment method|payment|modo de pago|moyen de paiement|zahlungs|metodo de pagamento)\b/u.test(n)&&/\b(e stato|era|e |invece|in realta|cambia|modifica|correggi|was|actually|change|instead|fue|etait|war|foi)\b/u.test(n);}
export function methodMentioned(text:any,methods:any[]){const n=' '+normalizedMovementText(text)+' ';const matches=(methods||[]).filter(m=>!m.archived&&normalizedMovementText(m.name)&&n.includes(' '+normalizedMovementText(m.name)+' '));return matches.length===1?matches[0]:null;}
export function mergeMovementUpdate(previous:any,input:any){const next:any=previous?.action==='update_movement'?{...previous}:{action:'update_movement'};for(const key of ['movementKind','movementId','selection','methodName','categoryName','amount','date','description'])if(input[key]!==undefined&&input[key]!==null)next[key]=input[key];return next;}
function unique(list:any[],name:any){const matches=(list||[]).filter(x=>!x.archived&&normalizedMovementText(x.name)===normalizedMovementText(name));if(matches.length!==1)fail('catalog');return matches[0];}
function sameOccurrence(a:any,b:any){if(a.recurringOccurrenceId)return String(a.recurringOccurrenceId)===String(b.recurringOccurrenceId||'');return a.recurringRuleId&&a.recurringOccurrenceDate&&String(a.recurringRuleId)===String(b.recurringRuleId||'')&&String(a.recurringOccurrenceDate)===String(b.recurringOccurrenceDate||'');}
export function previewMovementUpdate(ctx:any,input:any){
  const reference=ctx.lastReferencedMovement;
  const kind=input.movementKind||reference?.kind||'expense';if(!['expense','income'].includes(kind))fail('target');
  const rows=((kind==='income'?ctx.incomes:ctx.expenses)||[]).filter(eligible);
  let id=input.movementId;
  if(id===undefined){if(input.selection==='latest_created')id=latestPersonalMovement(ctx,kind)?.id;else if(reference?.ownerUid===String(ctx.userId||'')&&reference.kind===kind)id=reference.id;}
  const matches=rows.filter((r:any)=>id!==undefined&&String(r.id)===String(id));if(matches.length!==1)fail('target');const row=matches[0];
  const patch:any={};
  if(input.methodName!==undefined){if(kind!=='expense')fail('methodIncome');const method=unique(ctx.methods,input.methodName);patch.methodId=method.id;patch.method=method.id;patch.methodName=method.name;}
  if(input.categoryName!==undefined){const category=unique(kind==='income'?ctx.incomeTypes:ctx.cats,input.categoryName);patch[kind==='income'?'type':'catId']=category.id;}
  if(input.description!==undefined){const value=String(input.description).trim();if(!value||value.length>500)fail('fields');patch.desc=value;}
  if(input.date!==undefined){const value=String(input.date);const d=new Date(value+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)fail('fields');patch.date=value;}
  if(input.amount!==undefined){if(row.originalCurrency&&String(row.originalCurrency)!==String(ctx.currency||'EUR'))fail('foreignAmount');const value=parseMoneyValue(input.amount);if(!Number.isFinite(value)||value<=0)fail('fields');patch.amount=value;}
  if(!Object.keys(patch).length)fail('missing');
  const group=rows.filter((r:any)=>String(r.id)===String(row.id)||sameOccurrence(row,r));
  if(new Set(group.map((r:any)=>String(r.id))).size!==group.length)fail('target');
  return {...input,action:'update_movement',movementKind:kind,movementId:row.id,_ownerUid:String(ctx.userId||''),_before:group.map((r:any)=>({id:String(r.id),fingerprint:JSON.stringify(r)})),_row:{...row},_patch:patch};
}
export function applyMovementUpdate(rows:any[],ctx:any,preview:any,now=new Date().toISOString()){
  if(preview._ownerUid!==String(ctx.userId||''))fail('conflict');
  const live=previewMovementUpdate({...ctx,[preview.movementKind==='income'?'incomes':'expenses']:rows},preview);
  const expected=new Map(preview._before.map((r:any)=>[r.id,r.fingerprint]));
  if(live._before.length!==expected.size||live._before.some((r:any)=>expected.get(r.id)!==r.fingerprint))fail('conflict');
  return rows.map(row=>{if(!expected.has(String(row.id)))return row;let next:any={...row,...live._patch,id:row.id,updatedAt:now};if(live._patch.methodId!==undefined)next=movementWithMethodSnapshot(next,(id:any)=>(ctx.methods||[]).find((m:any)=>String(m.id)===String(id)));if(row.recurringOccurrenceId||row.recurringRuleId||row.source==='recurring'){next.recurringOverride=true;next.recurringOverrideUpdatedAt=now;}return next;});
}
const labels:any={
  it:['Spesa','Entrata','Data','Importo','Categoria','Pagamento','Descrizione','Confermi?','Quale movimento vuoi modificare?','Quale campo vuoi correggere?','La categoria o il pagamento non è presente o è ambiguo.','Il movimento è cambiato. Richiedi una nuova anteprima.','Non ci sono movimenti personali registrati.','L’ultimo movimento è mostrato nella chat.','Il pagamento non è previsto per le entrate.','Per cambiare un importo in valuta estera usa il modulo di modifica.'],
  en:['Expense','Income','Date','Amount','Category','Payment','Description','Confirm?','Which transaction should change?','Which field should change?','The category or payment method is missing or ambiguous.','The transaction changed. Request a new preview.','There are no recorded personal transactions.','The latest transaction is shown in the chat.','Payment methods are not available for income.','Use the edit form to change a foreign-currency amount.'],
  es:['Gasto','Ingreso','Fecha','Importe','Categoría','Pago','Descripción','¿Confirmas?','¿Qué movimiento quieres modificar?','¿Qué campo quieres corregir?','La categoría o el pago no existe o es ambiguo.','El movimiento cambió. Solicita otra vista previa.','No hay movimientos personales registrados.','El último movimiento aparece en el chat.','El pago no está previsto para ingresos.','Usa el formulario para cambiar un importe en moneda extranjera.'],
  fr:['Dépense','Revenu','Date','Montant','Catégorie','Paiement','Description','Confirmez-vous ?','Quelle opération faut-il modifier ?','Quel champ faut-il corriger ?','La catégorie ou le paiement est absent ou ambigu.','L’opération a changé. Demandez un nouvel aperçu.','Aucune opération personnelle enregistrée.','La dernière opération est affichée dans le chat.','Le paiement n’est pas prévu pour les revenus.','Utilisez le formulaire pour modifier un montant en devise étrangère.'],
  de:['Ausgabe','Einnahme','Datum','Betrag','Kategorie','Zahlung','Beschreibung','Bestätigen?','Welche Buchung soll geändert werden?','Welches Feld soll geändert werden?','Kategorie oder Zahlung fehlt oder ist mehrdeutig.','Die Buchung wurde geändert. Neue Vorschau anfordern.','Keine persönlichen Buchungen vorhanden.','Die letzte Buchung wird im Chat angezeigt.','Zahlungsmethoden gelten nicht für Einnahmen.','Fremdwährungsbeträge bitte im Bearbeitungsformular ändern.'],
  pt:['Despesa','Receita','Data','Valor','Categoria','Pagamento','Descrição','Confirmas?','Que movimento queres modificar?','Que campo queres corrigir?','A categoria ou o pagamento não existe ou é ambíguo.','O movimento mudou. Pede outra prévia.','Não há movimentos pessoais registados.','O último movimento aparece no chat.','O pagamento não está previsto para receitas.','Usa o formulário para mudar um valor em moeda estrangeira.'],
  pl:['Wydatek','Przychód','Data','Kwota','Kategoria','Płatność','Opis','Potwierdzasz?','Którą transakcję zmienić?','Które pole zmienić?','Kategoria lub płatność nie istnieje lub jest niejednoznaczna.','Transakcja się zmieniła. Poproś o nowy podgląd.','Brak osobistych transakcji.','Ostatnia transakcja jest pokazana w czacie.','Płatności nie są dostępne dla przychodów.','Kwotę w obcej walucie zmień w formularzu.'],
  nl:['Uitgave','Inkomst','Datum','Bedrag','Categorie','Betaling','Omschrijving','Bevestigen?','Welke transactie wil je wijzigen?','Welk veld wil je wijzigen?','De categorie of betaling ontbreekt of is dubbelzinnig.','De transactie is gewijzigd. Vraag een nieuw overzicht.','Geen persoonlijke transacties geregistreerd.','De laatste transactie staat in de chat.','Betalingen zijn niet beschikbaar voor inkomsten.','Wijzig een bedrag in vreemde valuta via het formulier.'],
  ro:['Cheltuială','Venit','Data','Sumă','Categorie','Plată','Descriere','Confirmi?','Ce tranzacție vrei să modifici?','Ce câmp vrei să corectezi?','Categoria sau plata lipsește ori este ambiguă.','Tranzacția s-a schimbat. Cere o nouă previzualizare.','Nu există tranzacții personale înregistrate.','Ultima tranzacție este afișată în chat.','Plata nu este prevăzută pentru venituri.','Modifică suma în valută prin formular.'],
  el:['Έξοδο','Έσοδο','Ημερομηνία','Ποσό','Κατηγορία','Πληρωμή','Περιγραφή','Επιβεβαιώνετε;','Ποια συναλλαγή θέλετε να αλλάξετε;','Ποιο πεδίο θέλετε να διορθώσετε;','Η κατηγορία ή η πληρωμή λείπει ή είναι ασαφής.','Η συναλλαγή άλλαξε. Ζητήστε νέα προεπισκόπηση.','Δεν υπάρχουν προσωπικές συναλλαγές.','Η τελευταία συναλλαγή εμφανίζεται στη συνομιλία.','Η πληρωμή δεν προβλέπεται για έσοδα.','Αλλάξτε ποσό σε ξένο νόμισμα μέσω της φόρμας.']
};
export function movementLabel(language:any,index:number){return (labels[language]||labels.en)[index];}
export function movementUpdateError(language:any,code:any){const index:any={target:8,missing:9,catalog:10,conflict:11,empty:12,fields:9,methodIncome:14,foreignAmount:15};return movementLabel(language,index[code]??11);}
export function movementUpdateSummary(preview:any,ctx:any,brief=false){
  const l=(i:number)=>movementLabel(ctx.lang,i),row=preview._row,patch=preview._patch;
  const info=brief?[]:[l(preview.movementKind==='income'?1:0)+': '+String(row.desc||''),l(2)+': '+String(row.date||'')];
  if(patch.methodName!==undefined)info.push(l(5)+': '+patch.methodName);
  if(patch.desc!==undefined)info.push(l(6)+': '+patch.desc);
  if(patch.date!==undefined)info.push(l(2)+': '+patch.date);
  if(patch.amount!==undefined)info.push(l(3)+': '+String(patch.amount));
  if(patch.catId!==undefined||patch.type!==undefined){const list=preview.movementKind==='income'?ctx.incomeTypes:ctx.cats;info.push(l(4)+': '+(list||[]).find((c:any)=>String(c.id)===String(patch.catId??patch.type))?.name);}
  info.push(l(7));return info.join(brief?'. ': '\n');
}

export function isVoicePromptEcho(text:any){
 const n=normalizedMovementText(text);
 const glossary='fainance personal finance expenses income categories descriptions budgets dates and payments';
 return n==='fainance'||n===glossary||n===glossary+' transcribe faithfully'||n===glossary+' transcribe faithfully do not add missing words';
}
export function requestedMovementField(text:any){
 const n=normalizedMovementText(text);
 if(!/\b(quale|qual|quanto|quando|come|what|which|how|quelle|quel|welche|cual|jak|care|toon)\b/u.test(n)&&!String(text).includes('?'))return '';
 if(/\b(categoria|category|categorie|kategorie|categoría)\b/u.test(n))return 'category';
 if(/\b(pagamento|pagato|payment|paid|pago|paiement|zahlung)\b/u.test(n))return 'payment';
 if(/\b(importo|amount|quanto|costo|cost|montant|betrag)\b/u.test(n))return 'amount';
 if(/\b(data|date|quando|when|datum)\b/u.test(n))return 'date';
 if(/\b(descrizione|description|omschrijving)\b/u.test(n))return 'description';
 return '';
}
export function isReferencedMovementQuestion(text:any){
 return !!requestedMovementField(text)&&/\b(questa|questo|quella|quello|quest ultima|quest ultimo|this|that|cette|dieser|esa)\b/u.test(normalizedMovementText(text));
}

export function categoryCorrectionMentioned(text:any,categories:any[]){
 const n=normalizedMovementText(text);
 const match=/^(?:modifica|cambia|correggi|imposta|change|set)(?: la categoria| categoria| the category| category)?(?: a| al| alla| in| to)? (.+)$/u.exec(n);
 if(!match)return null;
 const matches=(categories||[]).filter(c=>!c.archived&&normalizedMovementText(c.name)===match[1]);
 return matches.length===1?matches[0]:null;
}
