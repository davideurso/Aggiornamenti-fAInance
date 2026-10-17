// Localized calculator prompt used by every embedded calculator instance.
const calculatorPrompt:Record<string,string>={"it": "Inserisci un calcolo", "en": "Enter a calculation", "es": "Introduce un cálculo", "fr": "Saisissez un calcul", "de": "Berechnung eingeben", "pt": "Introduza um cálculo", "pl": "Wpisz działanie", "nl": "Voer een berekening in", "ro": "Introdu un calcul", "el": "Εισαγάγετε έναν υπολογισμό"};
export function calculatorInputPlaceholder(lang:string){return calculatorPrompt[String(lang||"it").toLowerCase().split("-")[0]]||calculatorPrompt.it;}
