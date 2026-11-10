import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInstallmentRegistry, collectInstallmentPlans, filterInstallmentRegistryRecords} from '../src/finance/installmentRegistry.js';
import {itemAmountForMonth} from '../src/financeCalculations.js';

const movement = {id:'computer',desc:'Computer portatile',date:'2026-01-31',amount:100,rateizzato:true,rate:3,
  rateDirection:'forward',catId:'electronics',methodId:'card'};
const options = {year:2026,currency:'EUR',categories:[{id:'electronics',name:'Elettronica'}],
  methods:[{id:'card',name:'Carta principale'}]};
const registry = (expenses, extra = {}) => buildInstallmentRegistry({...options,expenses,...extra});
function freeze(value) {if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;}

test('annual register allocates the last-cent remainder and clamps month-end dates', () => {
  const r = registry([movement]);
  assert.equal(r.status,'LOADED_DATA');assert.equal(r.records.length,1);
  assert.deepEqual(r.records[0].annualInstallments,[
    {number:1,date:'2026-01-31',amount:33.33},
    {number:2,date:'2026-02-28',amount:33.33},
    {number:3,date:'2026-03-31',amount:33.34},
  ]);
  assert.equal(r.records[0].annualAmount,100);assert.equal(r.records[0].totalAmount,100);
  assert.deepEqual(r.summary.monthlyAmounts,[33.33,33.33,33.34,0,0,0,0,0,0,0,0,0]);
  assert.equal(r.summary.installmentCount,3);
});

test('year follows allocations, including purchases before the year and backwards purchases after it', () => {
  const r = registry([
    {...movement,id:'previous',date:'2025-12-31'},
    {...movement,id:'future-backward',date:'2027-01-31',rateDirection:'backward'},
    {...movement,id:'outside',date:'2024-01-31'},
  ]);
  assert.deepEqual(r.records.map(row=>row.id),['expense:future-backward','expense:previous']);
  assert.deepEqual(r.records.map(row=>row.annualAmount),[66.67,66.67]);
  assert.equal(r.summary.annualAmount,133.34);assert.equal(r.summary.totalAmount,200);
  assert.equal(r.summary.installmentCount,4);
  assert.deepEqual(r.availableYears,[2027,2026,2025,2024]);
});

test('backwards allocations preserve the remainder on the final saved installment', () => {
  const r = registry([{...movement,date:'2026-03-31',rateDirection:'backward'}]);
  assert.deepEqual(r.records[0].annualInstallments,[
    {number:1,date:'2026-03-31',amount:33.33},
    {number:2,date:'2026-02-28',amount:33.33},
    {number:3,date:'2026-01-31',amount:33.34},
  ]);
  assert.deepEqual(r.summary.monthlyAmounts.slice(0,3),[33.34,33.33,33.33]);
  assert.equal(r.records[0].startDate,'2026-01-31');assert.equal(r.records[0].endDate,'2026-03-31');
});

test('civil annual register is independent of fiscal period naming and matches canonical monthly allocations', () => {
  for(const direction of ['forward','backward']) {
    const row={...movement,date:'2026-11-30',rateDirection:direction};
    const r=registry([row]);
    for(let month=1;month<=12;month++) {
      const key='2026-'+String(month).padStart(2,'0');
      assert.equal(r.summary.monthlyAmounts[month-1],itemAmountForMonth(row,key));
    }
    assert.deepEqual(r.period,{start:'2026-01-01',end:'2026-12-31',basis:'calendar_year'});
  }
});

test('leap dates, one installment and the maximum supported term retain every year', () => {
  const leap=registry([{...movement,date:'2028-01-31'}],{year:2028});
  assert.equal(leap.records[0].annualInstallments[1].date,'2028-02-29');
  const single=registry([{...movement,rate:1}]);
  assert.equal(single.summary.annualAmount,100);assert.equal(single.records[0].annualInstallmentCount,1);
  const long=registry([{...movement,date:'2026-12-31',rate:240,amount:2400}],{year:2046});
  assert.equal(long.records[0].annualInstallmentCount,11);assert.equal(long.summary.annualAmount,110);
  assert.equal(long.availableYears.length,21);assert.equal(long.availableYears.at(-1),2026);
});

test('category exclusions are visible with separate totals, while archived historical labels survive', () => {
  const rows=[movement,{...movement,id:'excluded',catId:'private',amount:300}];
  const r=registry(rows,{categories:[{id:'electronics',name:'Elettronica storica',archived:true},
    {id:'private',name:'Non conteggiare',excludeFromTotals:true}],
    methods:[{id:'card',name:'Vecchia carta',archived:true}],excludeExpense:row=>row.catId==='private'});
  assert.equal(r.records.length,2);assert.equal(r.summary.countedRecordCount,1);assert.equal(r.summary.excludedRecordCount,1);
  assert.equal(r.summary.annualAmount,400);assert.equal(r.summary.countedAnnualAmount,100);assert.equal(r.summary.excludedAnnualAmount,300);
  assert.equal(r.records.find(row=>row.id==='expense:computer').categoryName,'Elettronica storica');
  assert(r.records.every(row=>row.paymentMethod==='Vecchia carta'));
});

test('deleted and stale copies never reappear; duplicate IDs including zero count once', () => {
  const r=registry([{...movement,id:0},{...movement,id:0},
    {...movement,id:'deleted'},{...movement,id:'deleted',deletedAt:'2026-11-10T10:00:00Z'},
    {...movement,id:'void',status:'void'},{...movement,id:'archive',archived:true}]);
  assert.equal(r.records.length,1);assert.equal(r.records[0].id,'expense:0');
  assert.equal(r.summary.annualAmount,100);assert.equal(r.coverage.duplicateCount,2);
});

test('conflicting duplicates are marked incomplete instead of choosing an arbitrary amount', () => {
  const r=registry([movement,{...movement,amount:250},{...movement,id:'good',amount:60}]);
  assert.equal(r.summary.annualAmount,60);assert.equal(r.coverage.invalidCount,1);
  assert.equal(r.coverage.conflictCount,1);assert.equal(r.coverage.accountCompletenessCertified,false);
});

test('invalid data is counted as unavailable and never fabricated into a valid installment', () => {
  const r=registry([
    {...movement,id:'date',date:'2026-02-31'}, {...movement,id:'amount',amount:'not a number'},
    {...movement,id:'fraction',rate:2.5}, {...movement,id:'large',rate:241},
    {...movement,id:'direction',rateDirection:'sideways'}, {...movement,id:'overflow',date:'9999-12-31'},
    {...movement,id:'ordinary',rateizzato:false},
  ]);
  assert.equal(r.records.length,0);assert.equal(r.coverage.invalidCount,6);
  assert.equal(r.summary.countedAnnualAmount,0);assert.equal(r.coverage.omittedCount,0);
  assert.equal(buildInstallmentRegistry({expenses:[movement],year:'2026junk'}).status,'N_D');
});

test('legacy imported rows preserve amount precision, snapshots, source, and separate id-less records', () => {
  const row={...movement,id:undefined,amount:'1.234,50',originalAmount:1400,currency:'USD',
    categoryNameSnapshot:'Categoria storica',methodNameSnapshot:'Carta storica',source:'import',note:'Conserva'};
  const r=registry([row,{...row,desc:'Altro acquisto'}],{categories:[],methods:[]});
  assert.equal(r.records.length,2);assert.equal(r.coverage.legacyIdCount,2);
  assert.equal(r.summary.annualAmount,2469);assert.equal(r.records[0].categoryName,'Categoria storica');
  assert.equal(r.records[0].paymentMethod,'Carta storica');assert.equal(r.records[0].originalCurrency,'USD');
  assert.equal(r.records[0].movement.source,'import');assert.notEqual(r.records[0].id,r.records[1].id);
});

test('shared analytical amounts are preserved as supplied and unconfirmed recurrence rules are not synthesized', () => {
  const shared={...movement,id:'share',amount:60,_share:true,shareProjectId:'trip',shareActivityId:'activity'};
  const r=registry([shared,{...movement,id:'ordinary-share',rateizzato:false,_share:true}],
    {recurring:[{name:'Monthly bill',rateizzato:true,amount:1200,rate:12}]});
  assert.equal(r.records.length,1);assert.equal(r.summary.annualAmount,60);
  assert.equal(r.records[0].movement.shareProjectId,'trip');assert.equal(r.records[0].movement._share,true);
});

test('the register exposes every matching row and filters without truncating or changing summary totals', () => {
  const rows=Array.from({length:150},(_,i)=>({...movement,id:String(i),desc:'Computer '+i}));
  const r=registry(rows);assert.equal(r.records.length,150);assert.equal(r.coverage.omittedCount,0);
  assert.equal(r.summary.annualAmount,15000);
  assert.equal(filterInstallmentRegistryRecords(r,'computer 149 carta')[0].description,'Computer 149');
  assert.equal(filterInstallmentRegistryRecords(r,'elettronica').length,150);
  assert.equal(r.summary.annualAmount,15000);
});

test('rebuilding reflects updates immediately and never mutates a source or a prior result', () => {
  const frozen=freeze({...movement});const first=registry(freeze([frozen]));
  assert.equal(first.records[0].movement,frozen);
  const edited={...frozen,date:'2027-01-31',amount:300,rate:6};
  assert.equal(registry([edited]).records.length,0);
  assert.equal(registry([{...edited,deleted:true}],{year:2027}).records.length,0);
  assert.equal(first.summary.annualAmount,100);assert.deepEqual(first.records[0].movement,movement);
});

test('zero-value monthly allocations and three-decimal currencies do not lose planned counts or precision', () => {
  const tiny=registry([{...movement,amount:.01,rate:3}]);
  assert.equal(tiny.records[0].annualInstallmentCount,3);
  assert.deepEqual(tiny.records[0].annualInstallments.map(row=>row.amount),[0,0,.01]);
  const precise=registry([{...movement,amount:1.001,minorUnitDigits:3}],{currency:'KWD'});
  assert.deepEqual(precise.records[0].annualInstallments.map(row=>row.amount),[.333,.333,.335]);
  assert.equal(precise.summary.annualAmount,1.001);
  const income=collectInstallmentPlans([{...movement,receivedInMethodId:'card',type:'refund'}],
    {type:'income',currency:'EUR',methods:options.methods,incomeTypes:[{id:'refund',name:'Rimborsi'}]});
  assert.equal(income.plans[0].type,'income');assert.equal(income.plans[0].incomeType,'Rimborsi');
});
