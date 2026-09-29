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

function finiteNumber(value,name,{min=-Infinity,max=Infinity}={}){
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max)throw new Error('INVALID_'+String(name||'VALUE').toUpperCase());
  return number;
}

export function monthsUntilDate(targetDate,now=new Date()){
  const target=new Date(String(targetDate||'')+'T12:00:00');
  if(Number.isNaN(target.getTime()))throw new Error('INVALID_TARGET_DATE');
  const current=now instanceof Date?now:new Date(now);
  if(Number.isNaN(current.getTime()))throw new Error('INVALID_CURRENT_DATE');
  const diff=target.getTime()-current.getTime();
  if(diff<=0)throw new Error('TARGET_DATE_IN_PAST');
  return Math.max(1,Math.ceil(diff/(365.2425/12*24*60*60*1000)));
}

export function calculateSavingsPlan({goal,current=0,targetDate,annualRate=0,now=new Date()}){
  const goalValue=finiteNumber(goal,'GOAL',{min:0.01});
  const currentValue=finiteNumber(current,'CURRENT',{min:0});
  const annual=finiteNumber(annualRate,'RATE',{min:0,max:100});
  const months=monthsUntilDate(targetDate,now);
  const monthlyRate=annual/100/12;
  const currentFuture=currentValue*Math.pow(1+monthlyRate,months);
  let monthlyRequired=0;
  if(goalValue>currentFuture){
    monthlyRequired=monthlyRate===0
      ?(goalValue-currentValue)/months
      :(goalValue-currentFuture)*monthlyRate/(Math.pow(1+monthlyRate,months)-1);
  }
  monthlyRequired=Math.max(0,monthlyRequired);
  const totalContributions=currentValue+monthlyRequired*months;
  const projectedGrowth=Math.max(0,goalValue-totalContributions);
  return {goal:goalValue,current:currentValue,annualRate:annual,months,monthlyRequired,totalContributions,projectedGrowth};
}

export function calculatePurchaseVsSavings({goal,current=0,monthlySavings,purchaseAmount}){
  const goalValue=finiteNumber(goal,'GOAL',{min:0.01});
  const currentValue=finiteNumber(current,'CURRENT',{min:0});
  const monthly=finiteNumber(monthlySavings,'MONTHLY_SAVINGS',{min:0.01});
  const purchase=finiteNumber(purchaseAmount,'PURCHASE_AMOUNT',{min:0});
  const monthsWithoutPurchase=Math.max(0,Math.ceil((goalValue-currentValue)/monthly));
  const savingsAfterPurchase=currentValue-purchase;
  const monthsWithPurchase=Math.max(0,Math.ceil((goalValue-savingsAfterPurchase)/monthly));
  const delayMonths=Math.max(0,monthsWithPurchase-monthsWithoutPurchase);
  return {goal:goalValue,current:currentValue,monthlySavings:monthly,purchaseAmount:purchase,savingsAfterPurchase,monthsWithoutPurchase,monthsWithPurchase,delayMonths};
}

export function calculateInflationPower({amount,inflationRate,years}){
  const currentAmount=finiteNumber(amount,'AMOUNT',{min:0});
  const inflation=finiteNumber(inflationRate,'INFLATION',{min:0,max:100});
  const horizon=finiteNumber(years,'YEARS',{min:0,max:100});
  const factor=Math.pow(1+inflation/100,horizon);
  const futureNeeded=currentAmount*factor;
  const futureBuyingPower=factor===0?currentAmount:currentAmount/factor;
  const purchasingLoss=Math.max(0,currentAmount-futureBuyingPower);
  return {amount:currentAmount,inflationRate:inflation,years:horizon,factor,futureNeeded,futureBuyingPower,purchasingLoss};
}

export function calculateSavingsHorizon({goal,current=0,monthlySavings,annualRate=0,maxMonths=1200}){
  const goalValue=finiteNumber(goal,'GOAL',{min:0.01});
  const currentValue=finiteNumber(current,'CURRENT',{min:0});
  const monthly=finiteNumber(monthlySavings,'MONTHLY_SAVINGS',{min:0.01});
  const annual=finiteNumber(annualRate,'RATE',{min:0,max:100});
  const limit=Math.max(1,Math.floor(finiteNumber(maxMonths,'MAX_MONTHS',{min:1,max:2400})));
  if(currentValue>=goalValue)return {goal:goalValue,current:currentValue,monthlySavings:monthly,annualRate:annual,months:0,projectedBalance:currentValue,totalContributions:currentValue,projectedGrowth:0};
  const monthlyRate=annual/100/12;
  let balance=currentValue,months=0;
  while(balance<goalValue&&months<limit){
    balance=balance*(1+monthlyRate)+monthly;
    months++;
  }
  if(balance<goalValue)throw new Error('GOAL_TOO_FAR');
  const totalContributions=currentValue+monthly*months;
  const projectedGrowth=Math.max(0,balance-totalContributions);
  return {goal:goalValue,current:currentValue,monthlySavings:monthly,annualRate:annual,months,projectedBalance:balance,totalContributions,projectedGrowth};
}

export function calculatePurchaseInstallmentPlan({goal,current=0,monthlySavings,purchaseAmount,installmentMonths=12,annualRate=0,maxMonths=1200}){
  const goalValue=finiteNumber(goal,'GOAL',{min:0.01});
  const currentValue=finiteNumber(current,'CURRENT',{min:0});
  const monthly=finiteNumber(monthlySavings,'MONTHLY_SAVINGS',{min:0.01});
  const purchase=finiteNumber(purchaseAmount,'PURCHASE_AMOUNT',{min:0.01});
  const term=Math.max(1,Math.floor(finiteNumber(installmentMonths,'INSTALLMENT_MONTHS',{min:1,max:240})));
  const annual=finiteNumber(annualRate,'INSTALLMENT_RATE',{min:0,max:100});
  const monthlyRate=annual/100/12;
  const installment=monthlyRate===0?purchase/term:purchase*monthlyRate/(1-Math.pow(1+monthlyRate,-term));
  const totalPaid=installment*term;
  const financingCost=Math.max(0,totalPaid-purchase);
  const monthsWithoutPurchase=Math.max(0,Math.ceil((goalValue-currentValue)/monthly));
  let balance=currentValue,monthsWithPurchase=0;
  const limit=Math.max(term+1,Math.floor(finiteNumber(maxMonths,'MAX_MONTHS',{min:1,max:2400})));
  while(balance<goalValue&&monthsWithPurchase<limit){
    const contribution=monthsWithPurchase<term?monthly-installment:monthly;
    balance+=contribution;
    monthsWithPurchase++;
  }
  if(balance<goalValue)throw new Error('GOAL_TOO_FAR');
  const delayMonths=Math.max(0,monthsWithPurchase-monthsWithoutPurchase);
  return {goal:goalValue,current:currentValue,monthlySavings:monthly,purchaseAmount:purchase,installmentMonths:term,annualRate:annual,monthlyInstallment:installment,totalPaid,financingCost,monthsWithoutPurchase,monthsWithPurchase,delayMonths,savingsAfterPurchase:currentValue,monthlySavingsDuringInstallment:monthly-installment};
}

export function calculateInflationSnapshot({amount,inflationRate,years}){
  const currentAmount=finiteNumber(amount,'AMOUNT',{min:0});
  const inflation=finiteNumber(inflationRate,'INFLATION',{min:0,max:100});
  const horizon=finiteNumber(years,'YEARS',{min:0,max:100});
  const midpoint=horizon/2;
  const midFactor=Math.pow(1+inflation/100,midpoint);
  return {midpointYears:midpoint,midFutureNeeded:currentAmount*midFactor,midBuyingPower:midFactor===0?currentAmount:currentAmount/midFactor};
}
