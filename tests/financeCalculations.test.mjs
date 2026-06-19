import assert from "node:assert/strict";
import {
  itemAmountForMonth,
  totalForMonth,
  last12MonthKeys,
  balanceForMonths,
  monthlyTotalsForYear,
  patrimonioSnapshotTotal
} from "../src/financeCalculations.js";

assert.equal(itemAmountForMonth({amount:120,date:"2026-01-15",rateizzato:true,rate:3},"2026-01"),40);
assert.equal(itemAmountForMonth({amount:120,date:"2026-01-15",rateizzato:true,rate:3},"2026-03"),40);
assert.equal(itemAmountForMonth({amount:120,date:"2026-01-15",rateizzato:true,rate:3},"2026-04"),0);
assert.equal(itemAmountForMonth({amount:80,date:"2026-02-03",rateizzato:false},"2026-02"),80);
assert.equal(itemAmountForMonth({amount:80,date:"2026-02-03",rateizzato:false},"2026-03"),0);

var expenses=[
  {amount:120,date:"2026-01-15",rateizzato:true,rate:3},
  {amount:50,date:"2026-02-02",rateizzato:false}
];
var incomes=[
  {amount:1000,date:"2026-02-01",rateizzato:false},
  {amount:300,date:"2026-01-10",rateizzato:true,rate:3}
];
assert.equal(totalForMonth(expenses,"2026-02","rateizzato"),90);
assert.equal(totalForMonth(expenses,"2026-02","reale"),50);
assert.equal(totalForMonth(incomes,"2026-02","rateizzato"),1100);

assert.deepEqual(last12MonthKeys("2026-06-14"),[
  "2025-07","2025-08","2025-09","2025-10","2025-11","2025-12",
  "2026-01","2026-02","2026-03","2026-04","2026-05","2026-06"
]);
assert.equal(balanceForMonths(expenses,incomes,["2026-02"]),950);

var totals=monthlyTotalsForYear(expenses,incomes,2026,"rateizzato",["Gen","Feb"]);
assert.equal(totals[0].exp,40);
assert.equal(totals[1].exp,90);
assert.equal(totals[1].inc,1100);
assert.equal(totals[1].value,1010);

assert.equal(patrimonioSnapshotTotal([{id:"a"},{id:"b"}],{a:"10,5",b:"20"}),30.5);
assert.equal(patrimonioSnapshotTotal([{id:"a"},{id:"b"}],{_total:42,a:"10",b:"20"}),42);

console.log("finance calculations ok");
