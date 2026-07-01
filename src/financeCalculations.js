export function itemAmountForMonth(item, monthKey){
  if(!item||!monthKey)return 0;
  var amount=Number(item.amount||0);
  if(!item.rateizzato)return String(item.date||"").startsWith(monthKey)?amount:0;
  var rate=Number(item.rate||0);
  if(!rate||rate<1)return 0;
  var start=new Date(item.date);
  if(Number.isNaN(start.getTime()))return 0;
  var p=String(monthKey).split("-");
  var year=parseInt(p[0],10);
  var month=parseInt(p[1],10);
  if(!year||!month)return 0;
  var index=(year-start.getFullYear())*12+(month-1-start.getMonth());
  if(index<0||index>=rate)return 0;
  return amount/rate;
}

export function totalForMonth(items, monthKey, mode){
  var list=Array.isArray(items)?items:[];
  if(mode==="reale"){
    return list.filter(function(item){return String(item&&item.date||"").startsWith(monthKey);})
      .reduce(function(sum,item){return sum+Number(item.amount||0);},0);
  }
  return list.reduce(function(sum,item){return sum+itemAmountForMonth(item,monthKey);},0);
}

export function last12MonthKeys(referenceDate){
  var now=referenceDate?new Date(referenceDate):new Date();
  var start=new Date(now.getFullYear(),now.getMonth()-11,1);
  var keys=[];
  for(var i=0;i<12;i++){
    var d=new Date(start.getFullYear(),start.getMonth()+i,1);
    keys.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));
  }
  return keys;
}

export function balanceForMonths(expenses,incomes,monthKeys){
  var keys=Array.isArray(monthKeys)?monthKeys:[];
  var exp=keys.reduce(function(sum,key){return sum+totalForMonth(expenses,key,"reale");},0);
  var inc=keys.reduce(function(sum,key){return sum+totalForMonth(incomes,key,"reale");},0);
  return inc-exp;
}

export function monthlyTotalsForYear(expenses,incomes,year,mode,monthLabels){
  var labels=Array.isArray(monthLabels)?monthLabels:[];
  return Array.from({length:12},function(_,i){
    var key=String(year)+"-"+String(i+1).padStart(2,"0");
    var exp=totalForMonth(expenses,key,mode);
    var inc=totalForMonth(incomes,key,mode);
    return {label:labels[i]||key.slice(5),exp:exp,inc:inc,value:inc-exp};
  });
}

export function patrimonioSnapshotTotal(entries,snapshot){
  var list=Array.isArray(entries)?entries:[];
  var snap=snapshot||{};
  if(snap._total!==undefined&&snap._total!==null&&snap._total!=="")return Number(snap._total)||0;
  return list.reduce(function(sum,item){return sum+(parseFloat(String(snap[item.id]||"").replace(",","."))||0);},0);
}
