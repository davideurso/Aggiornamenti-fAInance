import assert from 'node:assert/strict';
import {buildFinancialCalendar} from '../src/finance/financialCalendar.js';
const d=(month,inputs)=>buildFinancialCalendar({month,today:'2026-10-14',expenses:inputs,incomes:[],recurring:[]});
const bill={id:'rent-1',amount:1200,date:'2026-08-01',desc:'Affitto',rateizzato:true,rate:12,rateDirection:'backward'};
for(let index=0;index<12;index++){
 const yr=2026+Math.floor((7+index)/12);
 const m=(7+index)%12+1;
 const month=String(yr)+'-'+String(m).padStart(2,'0');
 const r=d(month,[bill]);
 const first=r.days[0];
 assert.equal(first.expense,100,month+' must have 100 EUR installment');
 assert.equal(first.entries.length,1);
 assert.deepEqual(first.entries[0].installment,{number:index+1,of:12});
 assert.equal(r.expense,100);
}
assert.equal(d('2026-07',[bill]).expense,0);
let r=d('2026-08',[{...bill,id:'rent-2',amount:1001}]);
assert.equal(r.expense,83.41,'cent splitting of first month');
assert.equal(d('2027-07',[{...bill,id:'rent-2',amount:1001}]).expense,83.49,'remainder on last month');
const daily=buildFinancialCalendar({month:'2026-08', today:'2026-10-14',expenses:[bill],incomes:[{id:'inc',amount:200,date:'2026-08-01'}],recurring:[]});
assert.equal(daily.days[0].income,200);
assert.equal(daily.days[0].expense,100);
assert.equal(daily.days[0].change,100);
console.log('[OK] 12 rate mensili da 100EUR e date corrette');
