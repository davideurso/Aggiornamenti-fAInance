// Selection stays inside the app: never use the sampled AI transaction context.
export function normalizeDescription(value:any){return String(value??'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();}
export function mergeRecategorization(previous:any,incoming:any){
  const next:any={...(previous||{}),action:'recategorize_expenses'};
  for(const key of ['descriptionFilter','categoryName','matchMode','dateFrom','dateTo']){
    if(incoming&&incoming[key]!==undefined&&incoming[key]!==null)next[key]=String(incoming[key]).trim();
  }
  return next;
}
function fail(code:string):never{throw Object.assign(new Error(code),{code});}
function date(value:any){if(!value)return '';const s=String(value);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))fail('invalidDate');const d=new Date(s+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s)fail('invalidDate');return s;}
function eligible(row:any){return row&&row.id!==undefined&&row.id!==null&&String(row.id)!==''&&!row.virtual&&!row._virtual&&!row.isVirtual&&!row.shareProjectId&&!String(row.source||'').startsWith('share_');}
function fingerprint(row:any){return JSON.stringify(row);}
export function previewRecategorization(rows:any[],categories:any[],request:any){
  const filter=normalizeDescription(request.descriptionFilter);
  if(!filter)fail('missingDescription');
  if(!String(request.categoryName||'').trim())fail('missingCategory');
  const categoriesFound=(categories||[]).filter(c=>!c.archived&&normalizeDescription(c.name)===normalizeDescription(request.categoryName));
  if(categoriesFound.length!==1)fail('invalidCategory');
  const category=categoriesFound[0],mode=request.matchMode||'exact';
  if(!['exact','contains'].includes(mode))fail('invalidMode');
  const from=date(request.dateFrom),to=date(request.dateTo);
  if(from&&to&&from>to)fail('invalidDate');
  const matches=(rows||[]).filter(row=>eligible(row)&&(!from||String(row.date)>=from)&&(!to||String(row.date)<=to)&&
    (mode==='exact'?normalizeDescription(row.desc)===filter:normalizeDescription(row.desc).includes(filter)));
  if(!matches.length)fail('noMatches');
  const ids=matches.map(row=>String(row.id));
  if(new Set(ids).size!==ids.length)fail('conflict');
  const changed=matches.filter(row=>String(row.catId)!==String(category.id));
  if(!changed.length)fail('unchanged');
  return {action:'recategorize_expenses',descriptionFilter:String(request.descriptionFilter).trim(),categoryName:category.name,
    categoryId:category.id,matchMode:mode,dateFrom:from,dateTo:to,matched:matches.length,changed:changed.length,
    records:matches.map(row=>({id:String(row.id),fingerprint:fingerprint(row)}))};
}
export function applyRecategorization(rows:any[],categories:any[],preview:any){
  const fresh=previewRecategorization(rows,categories,preview);
  if(String(fresh.categoryId)!==String(preview.categoryId)||fresh.records.length!==preview.records.length)fail('conflict');
  const expected=new Map(preview.records.map((record:any)=>[record.id,record.fingerprint]));
  if(fresh.records.some(record=>expected.get(record.id)!==record.fingerprint))fail('conflict');
  let count=0;
  const updated=(rows||[]).map(row=>{if(!expected.has(String(row.id))||String(row.catId)===String(fresh.categoryId))return row;count++;return {...row,catId:fresh.categoryId};});
  return {rows:updated,count};
}

const messages:any={
  it:{missingDescription:'Quale descrizione devono avere le spese?',missingCategory:'In quale categoria vuoi spostarle?',invalidCategory:'La categoria non è presente o è ambigua. Quale categoria esistente vuoi usare?',invalidMode:'Vuoi la descrizione esatta oppure le spese che contengono quel testo?',invalidDate:'Quale periodo vuoi usare? Indica date valide.',noMatches:'Non ci sono spese personali con questa descrizione e questo periodo.',unchanged:'Le spese corrispondenti sono già tutte nella categoria scelta.',conflict:'Le spese sono cambiate. Ripeti la richiesta per una nuova anteprima.',preview:'{count} spese da aggiornare, {matched} corrispondenze. Descrizione {mode}: “{filter}”. Categoria: {category}. Confermi?',exact:'esatta',contains:'che contiene',done:'Aggiornate nell’app {count} spese in {category}.',cancelled:'Operazione annullata.'},
  en:{missingDescription:'Which description should the expenses have?',missingCategory:'Which category should they move to?',invalidCategory:'The category is missing or ambiguous. Which existing category should I use?',invalidMode:'Should the description match exactly or contain that text?',invalidDate:'Which period should I use? Please give valid dates.',noMatches:'No personal expenses match this description and period.',unchanged:'All matching expenses are already in that category.',conflict:'The expenses changed. Repeat the request for a new preview.',preview:'Update {count} expenses, {matched} matches. Description {mode}: “{filter}”. Category: {category}. Confirm?',exact:'exactly',contains:'containing',done:'Updated {count} expenses in the app to {category}.',cancelled:'Operation cancelled.'},
  es:{missingDescription:'¿Qué descripción deben tener los gastos?',missingCategory:'¿A qué categoría quieres moverlos?',invalidCategory:'La categoría no existe o es ambigua. ¿Qué categoría existente quieres usar?',invalidMode:'¿La descripción debe ser exacta o contener ese texto?',invalidDate:'¿Qué periodo quieres usar? Indica fechas válidas.',noMatches:'No hay gastos personales con esa descripción y periodo.',unchanged:'Todos los gastos coincidentes ya están en esa categoría.',conflict:'Los gastos han cambiado. Repite la solicitud para una nueva vista previa.',preview:'Actualizar {count} gastos, {matched} coincidencias. Descripción {mode}: “{filter}”. Categoría: {category}. ¿Confirmas?',exact:'exacta',contains:'que contiene',done:'Actualizados {count} gastos en la app a {category}.',cancelled:'Operación cancelada.'},
  fr:{missingDescription:'Quelle description doivent avoir les dépenses ?',missingCategory:'Vers quelle catégorie voulez-vous les déplacer ?',invalidCategory:'La catégorie est absente ou ambiguë. Quelle catégorie existante faut-il utiliser ?',invalidMode:'La description doit-elle être exacte ou contenir ce texte ?',invalidDate:'Quelle période faut-il utiliser ? Indiquez des dates valides.',noMatches:'Aucune dépense personnelle ne correspond à cette description et cette période.',unchanged:'Toutes les dépenses correspondantes sont déjà dans cette catégorie.',conflict:'Les dépenses ont changé. Répétez la demande pour un nouvel aperçu.',preview:'Modifier {count} dépenses, {matched} correspondances. Description {mode} : « {filter} ». Catégorie : {category}. Confirmez-vous ?',exact:'exacte',contains:'contenant',done:'{count} dépenses mises à jour dans l’app vers {category}.',cancelled:'Opération annulée.'},
  de:{missingDescription:'Welche Beschreibung sollen die Ausgaben haben?',missingCategory:'In welche Kategorie sollen sie verschoben werden?',invalidCategory:'Die Kategorie fehlt oder ist mehrdeutig. Welche vorhandene Kategorie soll ich verwenden?',invalidMode:'Soll die Beschreibung genau übereinstimmen oder den Text enthalten?',invalidDate:'Welchen Zeitraum soll ich verwenden? Bitte gültige Daten angeben.',noMatches:'Keine persönlichen Ausgaben passen zu Beschreibung und Zeitraum.',unchanged:'Alle passenden Ausgaben sind bereits in dieser Kategorie.',conflict:'Die Ausgaben haben sich geändert. Bitte erneut anfordern.',preview:'{count} Ausgaben ändern, {matched} Treffer. Beschreibung {mode}: „{filter}“. Kategorie: {category}. Bestätigen?',exact:'genau',contains:'enthält',done:'{count} Ausgaben in der App auf {category} geändert.',cancelled:'Vorgang abgebrochen.'},
  pt:{missingDescription:'Que descrição devem ter as despesas?',missingCategory:'Para que categoria queres movê-las?',invalidCategory:'A categoria não existe ou é ambígua. Qual categoria existente queres usar?',invalidMode:'A descrição deve ser exata ou conter esse texto?',invalidDate:'Que período queres usar? Indica datas válidas.',noMatches:'Nenhuma despesa pessoal corresponde à descrição e ao período.',unchanged:'Todas as despesas correspondentes já estão nessa categoria.',conflict:'As despesas mudaram. Repete o pedido para uma nova prévia.',preview:'Atualizar {count} despesas, {matched} correspondências. Descrição {mode}: “{filter}”. Categoria: {category}. Confirmas?',exact:'exata',contains:'que contém',done:'Atualizadas {count} despesas na app para {category}.',cancelled:'Operação cancelada.'},
  pl:{missingDescription:'Jaki opis mają mieć wydatki?',missingCategory:'Do jakiej kategorii je przenieść?',invalidCategory:'Kategoria nie istnieje lub jest niejednoznaczna. Której istniejącej kategorii użyć?',invalidMode:'Czy opis ma być dokładny, czy zawierać ten tekst?',invalidDate:'Jaki okres wybrać? Podaj poprawne daty.',noMatches:'Brak osobistych wydatków pasujących do opisu i okresu.',unchanged:'Wszystkie pasujące wydatki są już w tej kategorii.',conflict:'Wydatki się zmieniły. Powtórz prośbę, aby zobaczyć nowy podgląd.',preview:'Zmień {count} wydatków, {matched} dopasowań. Opis {mode}: „{filter}”. Kategoria: {category}. Potwierdzasz?',exact:'dokładny',contains:'zawierający',done:'Zmieniono {count} wydatków w aplikacji na {category}.',cancelled:'Operacja anulowana.'},
  nl:{missingDescription:'Welke omschrijving moeten de uitgaven hebben?',missingCategory:'Naar welke categorie moeten ze?',invalidCategory:'De categorie ontbreekt of is dubbelzinnig. Welke bestaande categorie wil je gebruiken?',invalidMode:'Moet de omschrijving exact zijn of deze tekst bevatten?',invalidDate:'Welke periode wil je gebruiken? Geef geldige datums.',noMatches:'Geen persoonlijke uitgaven passen bij deze omschrijving en periode.',unchanged:'Alle passende uitgaven staan al in die categorie.',conflict:'De uitgaven zijn gewijzigd. Herhaal de aanvraag voor een nieuw overzicht.',preview:'{count} uitgaven wijzigen, {matched} overeenkomsten. Omschrijving {mode}: “{filter}”. Categorie: {category}. Bevestigen?',exact:'exact',contains:'met',done:'{count} uitgaven in de app gewijzigd naar {category}.',cancelled:'Bewerking geannuleerd.'},
  ro:{missingDescription:'Ce descriere trebuie să aibă cheltuielile?',missingCategory:'În ce categorie vrei să le muți?',invalidCategory:'Categoria lipsește sau este ambiguă. Ce categorie existentă vrei să folosești?',invalidMode:'Descrierea trebuie să fie exactă sau să conțină textul?',invalidDate:'Ce perioadă vrei să folosești? Indică date valide.',noMatches:'Nu există cheltuieli personale cu această descriere și perioadă.',unchanged:'Toate cheltuielile corespunzătoare sunt deja în categoria aleasă.',conflict:'Cheltuielile s-au schimbat. Repetă cererea pentru o nouă previzualizare.',preview:'Modifică {count} cheltuieli, {matched} potriviri. Descriere {mode}: „{filter}”. Categoria: {category}. Confirmi?',exact:'exactă',contains:'care conține',done:'Actualizate {count} cheltuieli în aplicație la {category}.',cancelled:'Operațiune anulată.'},
  el:{missingDescription:'Ποια περιγραφή πρέπει να έχουν τα έξοδα;',missingCategory:'Σε ποια κατηγορία να μεταφερθούν;',invalidCategory:'Η κατηγορία λείπει ή είναι ασαφής. Ποια υπάρχουσα κατηγορία θέλετε;',invalidMode:'Η περιγραφή πρέπει να είναι ακριβής ή να περιέχει το κείμενο;',invalidDate:'Ποια περίοδο θέλετε; Δώστε έγκυρες ημερομηνίες.',noMatches:'Δεν υπάρχουν προσωπικά έξοδα με αυτή την περιγραφή και περίοδο.',unchanged:'Όλα τα αντίστοιχα έξοδα βρίσκονται ήδη στην κατηγορία.',conflict:'Τα έξοδα άλλαξαν. Επαναλάβετε το αίτημα για νέα προεπισκόπηση.',preview:'Αλλαγή {count} εξόδων, {matched} αντιστοιχίες. Περιγραφή {mode}: «{filter}». Κατηγορία: {category}. Επιβεβαιώνετε;',exact:'ακριβής',contains:'που περιέχει',done:'Ενημερώθηκαν {count} έξοδα στην εφαρμογή στην κατηγορία {category}.',cancelled:'Η ενέργεια ακυρώθηκε.'}
};
export function recategorizationText(language:any,key:string,values:any={}){
  const m=messages[language]||messages.en;
  const text=m[key]||m.conflict;
  return text.replace(/\{(\w+)\}/g,(_:string,name:string)=>String(name==='mode'?m[values.matchMode||'exact']:values[name]??''));
}
