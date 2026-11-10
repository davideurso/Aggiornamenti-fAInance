export function softenChartColor(color) {
 const hex=String(color||'').replace(/^#/,'');if(!/^[a-f0-9]{6}$/i.test(hex))return '#C3D5E7';
 return '#'+[0,2,4].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*.48+255*.52).toString(16).padStart(2,'0')).join('');
}
export function plannedSavingScope({keys,currentKey,finance,getPlan}) {
 const versions=finance?.budget?.standardVersions||[],overrides=finance?.budget?.overrides||{};
 const known=keys.filter(key=>overrides[key]||versions.some(v=>v.from!=='0001-01'&&v.from<=key));
 const selected=known.length?known:[currentKey],plans=selected.map(getPlan);
 const valid=plans.every(p=>p&&Array.isArray(p.items)&&p.items.length>0&&Number.isFinite(Number(p.manualIncome??p.income))&&Number(p.manualIncome??p.income)>0&&p.items.every(i=>Number.isFinite(Number(i.amount))&&Number(i.amount)>=0));
 const saving=valid?plans.reduce((n,p)=>n+Math.max(0,Math.round(Number(p.manualIncome??p.income)*100)-p.items.reduce((a,i)=>a+Math.round(Number(i.amount)*100),0)),0)/100:null;
 const referenceIncome=valid?plans.reduce((n,p)=>n+Math.round(Number(p.manualIncome??p.income)*100),0)/100:null;
 const plannedExpense=valid?plans.reduce((n,p)=>n+p.items.reduce((a,i)=>a+Math.round(Number(i.amount)*100),0),0)/100:null;
 return {referenceIncome,plannedExpense,keys:selected,saving,limited:selected.length!==keys.length||selected.some((k,i)=>k!==keys[i]),status:valid?'PARTIAL':'N_D'};
}
export const savingCopy={
 it:['Budget corrente','Budget storici disponibili','Obiettivo = entrate di riferimento meno spese pianificate nel Budget. Il reale usa gli stessi periodi. Il Budget corrente non viene moltiplicato sui mesi senza uno storico verificabile.','Imposta entrate e spese nel Budget per calcolare un obiettivo.'],
 en:['Current budget','Available historical budgets','Target = reference income minus budgeted expenses. Actual savings use the same periods. The current budget is not multiplied over months without a verifiable history.','Set income and expenses in Budget to calculate a target.'],
 es:['Presupuesto actual','Presupuestos históricos disponibles','Objetivo = ingresos de referencia menos gastos presupuestados. El ahorro real usa los mismos períodos. No se extrapola el presupuesto actual a meses sin historial verificable.','Configura ingresos y gastos en Presupuesto para calcular un objetivo.'],
 fr:['Budget actuel','Budgets historiques disponibles','Objectif = revenus de référence moins dépenses budgétées. Le réel utilise les mêmes périodes. Le budget actuel n’est pas extrapolé aux mois sans historique vérifiable.','Renseignez revenus et dépenses dans Budget pour calculer un objectif.'],
 de:['Aktuelles Budget','Verfügbare historische Budgets','Ziel = Referenzeinkommen minus geplante Ausgaben. Ist-Werte nutzen dieselben Zeiträume. Das aktuelle Budget wird nicht auf Monate ohne prüfbaren Verlauf übertragen.','Trage Einnahmen und Ausgaben im Budget ein, um ein Ziel zu berechnen.'],
 pt:['Orçamento atual','Orçamentos históricos disponíveis','Objetivo = entradas de referência menos despesas orçamentadas. O real usa os mesmos períodos. O orçamento atual não é extrapolado para meses sem histórico verificável.','Define entradas e despesas no Orçamento para calcular um objetivo.'],
 pl:['Bieżący budżet','Dostępne historyczne budżety','Cel = przychód odniesienia minus planowane wydatki. Wynik rzeczywisty obejmuje te same okresy. Bieżący budżet nie jest mnożony przez miesiące bez zweryfikowanej historii.','Ustaw przychody i wydatki w Budżecie, aby obliczyć cel.'],
 nl:['Huidig budget','Beschikbare historische budgetten','Doel = referentie-inkomsten minus begrote uitgaven. Werkelijke besparing gebruikt dezelfde perioden. Het huidige budget wordt niet toegepast op maanden zonder verifieerbare historie.','Stel inkomsten en uitgaven in Budget in om een doel te berekenen.'],
 ro:['Bugetul curent','Bugete istorice disponibile','Obiectiv = venituri de referință minus cheltuieli bugetate. Rezultatul real folosește aceleași perioade. Bugetul curent nu este extrapolat lunilor fără istoric verificabil.','Configurează venituri și cheltuieli în Buget pentru a calcula un obiectiv.'],
 el:['Τρέχων προϋπολογισμός','Διαθέσιμοι ιστορικοί προϋπολογισμοί','Στόχος = έσοδα αναφοράς μείον προγραμματισμένα έξοδα. Το πραγματικό ποσό χρησιμοποιεί τις ίδιες περιόδους. Δεν επεκτείνουμε τον τρέχοντα προϋπολογισμό σε μήνες χωρίς επαληθεύσιμο ιστορικό.','Ορίστε έσοδα και έξοδα στον Προϋπολογισμό για υπολογισμό στόχου.']
};

/** Category envelopes for one selected accounting period; never extrapolate a legacy plan. */
export function budgetEnvelope(plan,spentForCategory){
 const limits=new Map();for(const item of plan?.items||[]){const amount=Number(item.amount);if(item.catId==null||!Number.isFinite(amount)||amount<0)continue;const id=String(item.catId);limits.set(id,(limits.get(id)||0)+amount);}
 let limit=0,spent=0,exceeded=0;for(const [id,amount] of limits){const actual=Number(spentForCategory(id))||0;limit+=Math.round(amount*100);spent+=Math.round(actual*100);if(Math.round(actual*100)>Math.round(amount*100))exceeded++;}
 return {configured:limits.size>0,categoryIds:[...limits.keys()],limit:limit/100,spent:spent/100,remaining:(limit-spent)/100,exceeded};
}
export const budgetCopy={
 it:['Margine sui Budget','Speso con Budget','Budget del periodo','Oltre il Budget totale','Categorie oltre il limite','Spese senza Budget','Solo le categorie con Budget nel periodo indicato. Le spese senza Budget sono mostrate a parte.'],
 en:['Budget headroom','Spent within budgets','Period budget','Over the total budget','Categories over limit','Spending without a budget','Only budgeted categories in the displayed period. Spending without a budget is shown separately.'],
 es:['Margen de presupuestos','Gasto con presupuesto','Presupuesto del período','Sobre el presupuesto total','Categorías sobre el límite','Gastos sin presupuesto','Solo categorías con presupuesto en el período indicado. Los gastos sin presupuesto se muestran aparte.'],
 fr:['Marge des budgets','Dépenses budgétées','Budget de la période','Dépassement du budget total','Catégories au-delà du plafond','Dépenses sans budget','Uniquement les catégories budgétées de la période affichée. Les dépenses sans budget sont séparées.'],
 de:['Budgetspielraum','Ausgaben mit Budget','Budget des Zeitraums','Über dem Gesamtbudget','Kategorien über dem Limit','Ausgaben ohne Budget','Nur budgetierte Kategorien im angezeigten Zeitraum. Ausgaben ohne Budget werden separat angezeigt.'],
 pt:['Margem dos orçamentos','Gasto com orçamento','Orçamento do período','Acima do orçamento total','Categorias acima do limite','Despesas sem orçamento','Apenas categorias com orçamento no período indicado. As despesas sem orçamento aparecem separadas.'],
 pl:['Pozostały budżet','Wydatki z budżetem','Budżet okresu','Przekroczenie całego budżetu','Kategorie ponad limit','Wydatki bez budżetu','Tylko kategorie z budżetem w podanym okresie. Wydatki bez budżetu są pokazane osobno.'],
 nl:['Budgetruimte','Uitgaven met budget','Budget van de periode','Boven het totale budget','Categorieën boven de limiet','Uitgaven zonder budget','Alleen categorieën met budget in de getoonde periode. Uitgaven zonder budget staan apart.'],
 ro:['Marja bugetelor','Cheltuieli cu buget','Bugetul perioadei','Peste bugetul total','Categorii peste limită','Cheltuieli fără buget','Doar categoriile cu buget din perioada afișată. Cheltuielile fără buget sunt separate.'],
 el:['Περιθώριο προϋπολογισμών','Δαπάνες με προϋπολογισμό','Προϋπολογισμός περιόδου','Υπέρβαση συνολικού προϋπολογισμού','Κατηγορίες πάνω από το όριο','Δαπάνες χωρίς προϋπολογισμό','Μόνο κατηγορίες με προϋπολογισμό στην περίοδο που εμφανίζεται. Οι δαπάνες χωρίς προϋπολογισμό εμφανίζονται χωριστά.']
};

export const distributionIconLabels={"it":"Visualizza icone","en":"Show icons","es":"Mostrar iconos","fr":"Afficher les icônes","de":"Symbole anzeigen","pt":"Mostrar ícones","pl":"Pokaż ikony","nl":"Pictogrammen tonen","ro":"Afișează pictogramele","el":"Εμφάνιση εικονιδίων"};
