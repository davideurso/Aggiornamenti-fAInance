const words:Record<string,string[]>={
 it:['Opzioni','Collegamenti automatici e decimali','Prima di collegare i metodi','Gestisci le aree del patrimonio.','Gestisci le categorie del patrimonio e le relative aree.'],
 en:['Options','Automatic links and decimals','Before linking methods','Manage asset areas.','Manage asset categories and their areas.'],
 es:['Opciones','Vínculos automáticos y decimales','Antes de vincular métodos','Gestiona las áreas del patrimonio.','Gestiona las categorías del patrimonio y sus áreas.'],
 fr:['Options','Liens automatiques et décimales','Avant de relier des méthodes','Gérez les domaines du patrimoine.','Gérez les catégories du patrimoine et leurs domaines.'],
 de:['Optionen','Automatische Verknüpfungen und Dezimalstellen','Vor dem Verknüpfen von Methoden','Vermögensbereiche verwalten.','Vermögenskategorien und deren Bereiche verwalten.'],
 pt:['Opções','Ligações automáticas e casas decimais','Antes de ligar métodos','Gira as áreas do património.','Gira as categorias do património e as respetivas áreas.'],
 pl:['Opcje','Automatyczne powiązania i miejsca dziesiętne','Przed powiązaniem metod','Zarządzaj obszarami majątku.','Zarządzaj kategoriami majątku i ich obszarami.'],
 nl:['Opties','Automatische koppelingen en decimalen','Voordat je methoden koppelt','Beheer vermogensgebieden.','Beheer vermogenscategorieën en hun gebieden.'],
 ro:['Opțiuni','Legături automate și zecimale','Înainte de a lega metode','Gestionează zonele patrimoniului.','Gestionează categoriile patrimoniului și zonele lor.'],
 el:['Επιλογές','Αυτόματες συνδέσεις και δεκαδικά','Πριν συνδέσετε μεθόδους','Διαχειριστείτε τους τομείς περιουσίας.','Διαχειριστείτε τις κατηγορίες περιουσίας και τους τομείς τους.']
};
export function catalogSettingsText(lang:string,key:'modeDisplay'|'modeDesc'|'checks'|'areasDesc'|'categoriesDesc'){
 const language=String(lang||'en').toLowerCase().split(/[-_]/)[0];return (words[language]||words.en)[{modeDisplay:0,modeDesc:1,checks:2,areasDesc:3,categoriesDesc:4}[key]];
}

const optionWords:Record<string,string[]>={
 it:['Collega il Patrimonio e i Movimenti','Aggiorna automaticamente','Collega Patrimonio e ricezione'],
 en:['Link Assets and Transactions','Update automatically','Link Assets and receipt'],
 es:['Vincula Patrimonio y Movimientos','Actualizar automáticamente','Vincula Patrimonio y recepción'],
 fr:['Relier Patrimoine et Mouvements','Mettre à jour automatiquement','Reliez Patrimoine et réception'],
 de:['Vermögen und Buchungen verknüpfen','Automatisch aktualisieren','Vermögen und Eingang verknüpfen'],
 pt:['Ligar Património e Movimentos','Atualizar automaticamente','Ligue Património e receção'],
 pl:['Połącz majątek i operacje','Aktualizuj automatycznie','Połącz majątek i odbiór'],
 nl:['Vermogen en transacties koppelen','Automatisch bijwerken','Koppel vermogen en ontvangst'],
 ro:['Leagă Patrimoniul și Mișcările','Actualizează automat','Leagă Patrimoniul și încasarea'],
 el:['Σύνδεση Περιουσίας και Κινήσεων','Αυτόματη ενημέρωση','Συνδέστε Περιουσία και Είσπραξη']
};
export function patrimonyOptionsText(lang:string,index:number){return (optionWords[String(lang||'en').toLowerCase().split(/[-_]/)[0]]||optionWords.en)[index];}
