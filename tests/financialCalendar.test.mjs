import assert from 'node:assert/strict';
import { buildFinancialCalendar, calendarMonthDays } from '../src/finance/financialCalendar.js';
function day(data,date){return data.days.find(x=>x.date === date);}
const a=buildFinancialCalendar({month:'2026-10',today:'2026-10-14',
 incomes:[{id:1,date:'2026-10-15',amount:1000,desc:'Stipendio'}],
 expenses:[{id:2,date:'2026-10-20',amount:300,desc:'Affitto'}]});
assert.equal(a.income,1000);assert.equal(a.expense,300);assert.equal(day(a,'2026-10-16').balance,1000);assert.equal(a.endBalance,700);
const rate=buildFinancialCalendar({month:'2026-10',today:'2026-10-14',expenses:[{id:1,date:'2026-09-23',amount:100,rateizzato:true,rate:3}]});
assert.equal(day(rate,'2026-10-23').expense,33.33);assert.equal(rate.openingBalance,-33.33);
// Le rate retroattive sono ripartizioni contabili, NON transazioni
// accadute prima della data effettiva indicata dall'utente.
const retro = {id:1,date:'2026-10-23',createdAt:'2026-09-01',amount:100,rateizzato:true,rate:3,rateDirection:'backward'};
const back=buildFinancialCalendar({month:'2026-09',today:'2026-08-01',expenses:[retro]});
assert.equal(day(back,'2026-09-23').expense,0);
assert.equal(day(back,'2026-09-23').entries.length,0);
const effective=buildFinancialCalendar({month:'2026-10',today:'2026-08-01',expenses:[retro]});
assert.equal(day(effective,'2026-10-23').expense,33.33);
assert.equal(day(effective,'2026-10-23').entries[0].metadata.date,'2026-10-23');

// Riproduce la schermata: Tredicesima 2.200 euro, 12 mesi indietro,
// immessa in un'altra data. Agosto non deve contenere Tredicesima.
const thirteenth={id:'tredicesima',desc:'Tredicesima',date:'2026-09-23',createdAt:'2026-10-14',amount:2200,rateizzato:true,rate:12,rateDirection:'backward'};
const august=buildFinancialCalendar({month:'2026-08',today:'2026-10-14',incomes:[thirteenth]});
assert.equal(day(august,'2026-08-23').income,0);
assert.equal(day(august,'2026-08-23').entries.length,0);
const september=buildFinancialCalendar({month:'2026-09',today:'2026-10-14',incomes:[thirteenth]});
assert.equal(day(september,'2026-09-23').income,183.33);
assert.equal(day(september,'2026-09-23').entries[0].metadata.date,'2026-09-23');
assert.equal(september.income,183.33);

// I totali giornalieri devono corrispondere alle righe visualizzate,
// per spese non rateizzate, retro-rateizzate e rate forward.
for(const result of [back,effective,august,september,rate]) {
 for(const d of result.days) {
  const inc = d.entries.filter(e=>e.cents>0).reduce((s,e)=>s+e.cents,0);
  const exp = d.entries.filter(e=>e.cents<0).reduce((s,e)=>s-e.cents,0);
  assert.equal(Math.round(d.income*100),inc);
  assert.equal(Math.round(d.expense*100),exp);
  assert.equal(Math.round(d.change*100),inc-exp);
 }
}
const recur=buildFinancialCalendar({month:'2026-10',today:'2026-10-14',recurring:[{id:'r1',rtype:'expense',frequency:'monthly',dayOfMonth:18,amount:50,name:'Abbonamento',effectiveFrom:'2026-10-01'}]});
assert.equal(day(recur,'2026-10-18').expense,50);assert.equal(day(recur,'2026-10-18').entries[0].source,'planned');
const confirmed=buildFinancialCalendar({month:'2026-10',today:'2026-10-14',recurring:[{id:'r1',rtype:'expense',frequency:'monthly',dayOfMonth:18,amount:50,name:'Abbonamento',confirmed:['2026-10']}]});
assert.equal(day(confirmed,'2026-10-18').entries.length,0);
const generated=buildFinancialCalendar({month:'2026-10',today:'2026-10-14',
 expenses:[{id:'done',date:'2026-10-18',amount:50,desc:'Abbonamento',recurringOccurrenceId:'r1@2026-10-18'}],
 recurring:[{id:'r1',rtype:'expense',frequency:'monthly',dayOfMonth:18,amount:50,name:'Abbonamento'}]});
assert.equal(day(generated,'2026-10-18').entries.length,1);
const later=buildFinancialCalendar({month:'2026-11',today:'2026-10-14',recurring:[{id:'r1',rtype:'income',frequency:'monthly',dayOfMonth:15,amount:800,name:'Stipendio'}]});
assert.equal(later.openingBalance,800);assert.equal(later.income,800);assert.equal(later.endBalance,1600);
const excluded=buildFinancialCalendar({month:'2026-10',today:'2026-10-14',incomes:[{date:'2026-10-20',type:'hide',amount:100}],excludeIncome:r=>r.type === 'hide'});
assert.equal(excluded.income,0);
const futureStart=buildFinancialCalendar({month:'2026-10',today:'2026-10-14',recurring:[{id:'r1',rtype:'expense',frequency:'monthly',dayOfMonth:18,amount:50,name:'Bolletta',effectiveFrom:'2026-11-01'}]});
assert.equal(futureStart.expense,0);
assert.equal(calendarMonthDays('2028-02').length,29);
assert.equal(calendarMonthDays('2027-02').length,28);
assert.throws(()=>buildFinancialCalendar({month:'2026-13',today:'2026-10-14'}));
console.log('[OK] 11 gruppi di test Calendario finanziario superati');
