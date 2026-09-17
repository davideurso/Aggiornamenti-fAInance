export const TOOL_HISTORY_MS=7*24*60*60*1000;
const currency=code=>typeof code==='string'&&/^[A-Z]{3}$/.test(code);
export function currencyDigits(code){return new Intl.NumberFormat('en',{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits;}
export function roundCurrency(amount,code){const power=10**currencyDigits(code);return Math.round((Number(amount)+Number.EPSILON)*power)/power;}
export function validateToolData(tools){
  for(const section of ['calculator','converter'])for(const row of tools[section]||[]){
    if(row.kind!=='tool-v1')continue;
    if(!Number.isFinite(Date.parse(row.createdAt)))throw new Error('INVALID_TOOL_DATE');
    if(section==='calculator'){if(!Number.isFinite(row.result))throw new Error('INVALID_TOOL_RESULT');}
    else if(!currency(row.from)||!currency(row.to)||!Number.isFinite(row.amount)||row.amount<0||!Number.isFinite(row.result)||row.result<0||!Number.isFinite(row.rate)||row.rate<=0)throw new Error('INVALID_TOOL_CONVERSION');
  }
  if(tools.lastCurrencyPair!=null&&(!Array.isArray(tools.lastCurrencyPair)||tools.lastCurrencyPair.length!==2||!tools.lastCurrencyPair.every(currency)))throw new Error('INVALID_TOOL_PAIR');
}
export function pruneToolHistory(tools,now=Date.now()){
  const live=rows=>rows.filter(r=>r.kind!=='tool-v1'||Date.parse(r.createdAt)>now-TOOL_HISTORY_MS);
  return {...tools,calculator:live(tools.calculator),converter:live(tools.converter)};
}
export function addToolHistory(tools,section,row,now=Date.now()){
  if(!['calculator','converter'].includes(section))throw new Error('INVALID_TOOL_SECTION');
  const next=pruneToolHistory(tools,now),entry={...row,kind:'tool-v1',createdAt:new Date(now).toISOString()};
  if(typeof entry.id!=='string'||!entry.id||next[section].some(r=>r.id===entry.id))throw new Error('INVALID_TOOL_ID');
  next[section]=[entry,...next[section]];
  if(section==='converter'){next.lastCurrencyPair=[entry.from,entry.to];next.recentCurrencies=[...new Set([entry.from,entry.to,...next.recentCurrencies])].slice(0,8);}
  validateToolData(next);return next;
}
export function orderedToolCurrencies(rows,base,secondary,recent=[]){
  const preferred=[...new Set([base,secondary,...recent].filter(Boolean))];
  return rows.slice().sort((a,b)=>{const ai=preferred.indexOf(a.code),bi=preferred.indexOf(b.code);return ai>=0||bi>=0?(ai<0?999:ai)-(bi<0?999:bi):a.code.localeCompare(b.code);});
}
export function toolCurrencyAllowed(code,base,secondary,plan){return code===base||plan==='premium'||(['base'].includes(plan)&&code===secondary);}
export async function fetchToolRate(from,to,fetcher=fetch,signal){
  if(!currency(from)||!currency(to))throw new Error('INVALID_TOOL_CURRENCY');
  if(from===to)return 1;
  const response=await fetcher('https://api.exchangerate-api.com/v4/latest/'+from,{signal});
  if(!response.ok)throw new Error('FX_UNAVAILABLE');
  const data=await response.json(),rate=Number(data?.rates?.[to]);
  if(!Number.isFinite(rate)||rate<=0)throw new Error('FX_UNAVAILABLE');return rate;
}
export function invertToolQuote(quote){return {from:quote.to,to:quote.from,amount:quote.result,result:quote.amount,rate:1/quote.rate};}
