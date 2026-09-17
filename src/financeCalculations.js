// FIX 2.0.3 — Questo file duplica financeCalculations.ts. Vite risolve ".js" PRIMA di ".ts" e
// tests/financeCalculations.test.mjs importa esplicitamente "../src/financeCalculations.js":
// e' quindi questo il modulo autorevole. Le due copie erano divergenti (vedi nota sotto).
// Da consolidare in un solo file: vedi ISTRUZIONI.md.
import { dateInPeriod, installmentDate, periodForKey, lastPeriodKeys } from './finance/periodEngine.js';
export function parseMoneyValue(value){
  if(typeof value==="number")return isFinite(value)?value:0;
  var raw=String(value==null?"":value).trim().replace(/[^\d,.-]/g,"");
  if(!raw)return 0;
  var lastComma=raw.lastIndexOf(","),lastDot=raw.lastIndexOf(".");
  if(lastComma>=0&&lastDot>=0){raw=lastComma>lastDot?raw.replace(/\./g,"").replace(",","."):raw.replace(/,/g,"");}
  else if(lastComma>=0){raw=raw.replace(/,/g,".");}
  var n=parseFloat(raw);
  return isFinite(n)?n:0;
}
export function itemAmountForMonth(item, monthKey, settings){
  if(!item||!monthKey)return 0;
  var amount=Number(item.amount||0);
  if(!item.rateizzato)return dateInPeriod(item.date,monthKey,settings)?amount:0;
  var rate=Number(item.rate||0);
  if(!Number.isSafeInteger(rate)||rate<1)return 0;
  if(settings && settings.mode === 'financial') {
    try {
      const target = periodForKey(monthKey, settings);
      const monthNumber = value => Number(value.slice(0,4))*12+Number(value.slice(5,7))-1;
      const first = monthNumber(target.start)-monthNumber(String(item.date));
      const last = monthNumber(target.end)-monthNumber(String(item.date));
      const cents = Math.round(amount*100), base = Math.floor(cents/rate);
      let result = 0;
      for(let offset=first;offset<=last;offset++) {
        const index=item.rateDirection==='backward'?-offset:offset;
        if(index<0||index>=rate)continue;
        if(dateInPeriod(installmentDate(item.date,offset),monthKey,settings)) result+=(index===rate-1?cents-base*(rate-1):base)/100;
      }
      return result;
    } catch { return 0; }
  }
  var start=new Date(item.date);
  if(Number.isNaN(start.getTime()))return 0;
  var p=String(monthKey).split("-");
  var year=parseInt(p[0],10);
  var month=parseInt(p[1],10);
  if(!year||!month)return 0;
  // FIX 2.0.3 — mancava il supporto a rateDirection:"backward", presente invece in core.tsx
  // (rateMonth) e in financeCalculations.ts. Poiche' Vite risolve ".js" prima di ".ts", era
  // QUESTO il modulo eseguito: una spesa a rate a ritroso veniva distribuita in avanti e i
  // totali di app.tsx non coincidevano con quelli di Statistiche e Storico.
  var forwardIndex=(year-start.getFullYear())*12+(month-1-start.getMonth());
  var index=item.rateDirection==="backward"?-forwardIndex:forwardIndex;
  if(index<0||index>=rate)return 0;
  // FIX 2.0.3 — resto sull'ultima rata: prima 100 EUR su 3 mesi dava 33,33 x 3 = 99,99.
  var cents=Math.round(amount*100);
  var base=Math.floor(cents/rate);
  var share=index===rate-1?cents-base*(rate-1):base;
  return share/100;
}

export function totalForMonth(items, monthKey, mode, settings){
  var list=Array.isArray(items)?items:[];
  if(mode==="reale"){
    return list.filter(function(item){return dateInPeriod(item&&item.date,monthKey,settings);})
      .reduce(function(sum,item){return sum+Number(item.amount||0);},0);
  }
  return list.reduce(function(sum,item){return sum+itemAmountForMonth(item,monthKey,settings);},0);
}

export function last12MonthKeys(referenceDate, settings){
  if(settings)return lastPeriodKeys(12,referenceDate,settings);
  var now=referenceDate?new Date(referenceDate):new Date();
  var start=new Date(now.getFullYear(),now.getMonth()-11,1);
  var keys=[];
  for(var i=0;i<12;i++){
    var d=new Date(start.getFullYear(),start.getMonth()+i,1);
    keys.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));
  }
  return keys;
}

export function balanceForMonths(expenses,incomes,monthKeys,mode='reale',settings){
  var keys=Array.isArray(monthKeys)?monthKeys:[];
  var exp=keys.reduce(function(sum,key){return sum+totalForMonth(expenses,key,mode,settings);},0);
  var inc=keys.reduce(function(sum,key){return sum+totalForMonth(incomes,key,mode,settings);},0);
  return inc-exp;
}

export function monthlyTotalsForYear(expenses,incomes,year,mode,monthLabels,settings){
  var labels=Array.isArray(monthLabels)?monthLabels:[];
  return Array.from({length:12},function(_,i){
    var key=String(year)+"-"+String(i+1).padStart(2,"0");
    var exp=totalForMonth(expenses,key,mode,settings);
    var inc=totalForMonth(incomes,key,mode,settings);
    return {label:labels[i]||key.slice(5),exp:exp,inc:inc,value:inc-exp};
  });
}

export function patrimonioSnapshotTotal(entries,snapshot){
  var list=Array.isArray(entries)?entries:[];
  var snap=snapshot||{};
  if(snap._total!==undefined&&snap._total!==null&&snap._total!=="")return Number(snap._total)||0;
  return list.reduce(function(sum,item){return sum+parseMoneyValue(snap[item.id]);},0);
}
