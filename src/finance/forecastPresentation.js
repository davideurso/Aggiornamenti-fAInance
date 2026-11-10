// Display-only adapters. Signed forecast values and financial inputs are never changed.
const cents=value=>Math.round(value*100);
export function formatForecastAmount(value,language='it',currency='EUR') {
  if(typeof value!=='number'||!Number.isFinite(value))return '—';
  return new Intl.NumberFormat(language,{style:'currency',currency,useGrouping:true,minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(value));
}
export function forecastPrudentBreakdown(row) {
  const keys=['knownChange','inferredExpense','prudentChange','estimatedAdditionalExpense','inferredIncome','estimatedChange'];
  if(!row||keys.some(key=>typeof row[key]!=='number'||!Number.isFinite(row[key])))return null;
  const prudentIncome=cents(row.inferredPrudentIncome??0);
  if(!Number.isFinite(prudentIncome)||prudentIncome<0||prudentIncome>cents(row.inferredIncome))return null;
  const variable=cents(row.knownChange)+prudentIncome-cents(row.inferredExpense)-cents(row.prudentChange);
  const extra=variable-cents(row.estimatedAdditionalExpense);
  const excluded=cents(row.inferredIncome)-prudentIncome,difference=cents(row.estimatedChange)-cents(row.prudentChange);
  if(variable<0||extra<0||difference!==extra+excluded)return null;
  return {variableExpense:variable/100,extraExpense:extra/100,excludedIncome:excluded/100,difference:difference/100};
}
export function forecastMovementBreakdown(data,horizon) {
  const entries=(data?.daily||[]).filter(day=>day.date>=data.today&&day.date<=horizon.date)
    .flatMap(day=>day.entries||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
  const valid=entries.every(entry=>Number.isSafeInteger(entry.cents)&&entry.cents!==0);
  const income=entries.reduce((sum,e)=>sum+Math.max(0,e.cents),0);
  const expense=entries.reduce((sum,e)=>sum+Math.max(0,-e.cents),0);
  return {entries,income:income/100,expense:expense/100,
    reconciled:valid&&income===cents(horizon.knownIncome)&&expense===cents(horizon.knownExpense)};
}
