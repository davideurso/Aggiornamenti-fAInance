export function normalizeHistorySortField(field:any){
  if(field==="operation")return "date";
  if(field==="immission")return "created";
  if(field==="created")return "created";
  if(field==="amount")return "amount";
  if(field==="category")return "category";
  return "date";
}

export function financialHistorySortValue(item:any,field:any,resolveExpenseCategory:(id:any)=>any,resolveIncomeType:(id:any)=>any){
  var f=normalizeHistorySortField(field);
  if(f==="amount")return Number(item.amount)||0;
  if(f==="created")return item.createdAt?String(item.createdAt):(item.id?String(item.id):"");
  if(f==="category"){
    var c=item&&item.catId!==undefined?resolveExpenseCategory(item.catId):null;
    var it=item&&item.type!==undefined?resolveIncomeType(item.type):null;
    return String((c&&c.name)||(it&&it.name)||item.catName||item.type||item.catId||"").toLowerCase();
  }
  return item.date||"";
}

export function compareFinancialHistoryItems(a:any,b:any,field:any,dir:any,resolveExpenseCategory:(id:any)=>any,resolveIncomeType:(id:any)=>any){
  var f=normalizeHistorySortField(field);
  var av=financialHistorySortValue(a,f,resolveExpenseCategory,resolveIncomeType);
  var bv=financialHistorySortValue(b,f,resolveExpenseCategory,resolveIncomeType);
  var res=0;
  if(f==="amount")res=av===bv?0:(av>bv?1:-1);
  else res=av===bv?0:(String(av)>String(bv)?1:-1);
  return (dir||"desc")==="asc"?res:-res;
}

export function sortFinancialHistoryItems(
  list:any[],
  primaryField:any,
  primaryDirection:any,
  secondaryField:any,
  secondaryDirection:any,
  resolveExpenseCategory:(id:any)=>any,
  resolveIncomeType:(id:any)=>any
){
  return list.slice().sort(function(a,b){
    var first=compareFinancialHistoryItems(a,b,primaryField,primaryDirection,resolveExpenseCategory,resolveIncomeType);
    if(first!==0)return first;
    return compareFinancialHistoryItems(a,b,secondaryField||"amount",secondaryDirection||"desc",resolveExpenseCategory,resolveIncomeType);
  });
}
