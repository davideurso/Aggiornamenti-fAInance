import {test} from 'node:test';
import {shareCashMovementKey,shareCashMovementsForUser} from '../src/finance/shareCashMovements.js';
import {recurringMovementId} from '../src/finance/recurringOccurrences.js';
import assert from 'node:assert/strict';
import {createBalanceCheckpoint,derivePatrimony} from '../src/finance/patrimonyAutoBalance.js';
const day='2026-10-26', now=day+'T12:00:00Z';
const income=(id,amount,date=day,method='bank')=>({id,amount,date,receivedInMethodId:method});
const expense=(id,amount,date=day,method='bank')=>({id,amount,date,methodId:method});
function setup({amount=1000,date=day,expenses=[],incomes=[],methodIds=['bank'],entryId='account'}={}){
 const cp=createBalanceCheckpoint({date,amount,expenses,incomes,methodIds,now});
 return {id:entryId,balanceLink:{version:1,enabled:true,checkpoints:[cp]}};
}
function run(entries,expenses=[],incomes=[],extra={}){return derivePatrimony({entries,expenses,incomes,values:{account:1000,house:300000},today:day,mode:'entrambe',...extra});}
test('opt-in preserves all existing values/history without mutating inputs',()=>{
 const entries=[setup()], history={'2026-09':{account:950,_total:950}}, values={account:1000};const input=JSON.stringify({entries,history,values});
 const result=derivePatrimony({entries,history,values,mode:'manuale'});assert.deepEqual(result.values,values);assert.deepEqual(result.history,history);assert.equal(JSON.stringify({entries,history,values}),input);
});
test('confirmed balance already includes same-day movements; later new income and expense count once',()=>{
 const old=[income('salary',500)], entries=[setup({incomes:old})];const result=run(entries,[expense('food',80)],[...old,income('new',120)]);
 assert.equal(result.values.account,1040);assert.equal(result.values.house,300000);
 assert.equal(run(entries,[expense('food',80)],[...old,income('new',120),income('new',120)]).values.account,1040);
});
test('editing, deletion, restoration and destination/date changes recalculate baseline reversibly',()=>{
 const original=income('salary',500), entries=[setup({incomes:[original]})];
 assert.equal(run(entries,[],[{...original,amount:600}]).values.account,1100);
 assert.equal(run(entries,[],[]).values.account,500);
 assert.equal(run(entries,[],[original]).values.account,1000);
 assert.equal(run(entries,[],[{...original,receivedInMethodId:'cash'}]).values.account,500);
 assert.equal(run(entries,[],[{...original,date:'2026-10-27'}]).values.account,500);
 assert.equal(run(entries,[],[{...original,date:'2026-10-25'}]).values.account,1000);
});
test('legacy income methodId is never treated as an explicit receipt',()=>{
 const result=run([setup()],[],[{id:1,amount:900,date:day,methodId:'bank'}]);assert.equal(result.values.account,1000);assert.equal(result.unassigned,1);
});
test('future, planned, pending and cancelled movements do not affect actual balance',()=>{
 const rows=[income(1,90,'2026-10-27'),{...income(2,70),planned:true},{...income(3,80),status:'pending'},{...income(4,100),status:'cancelled'}];
 assert.equal(run([setup()],[],rows).values.account,1000);
 assert.equal(run([setup()],[],rows,{today:'2026-10-27'}).values.account,1090);
});
test('full cash outlay is counted once, never accounting installment allocations',()=>{
 const row={...expense(1,120),rateizzato:true,rate:3};assert.equal(run([setup()],[row]).values.account,880);
});
test('multiple instruments feed one asset; a method mapped twice blocks both assets',()=>{
 const entry=setup({methodIds:['bank','debit']});assert.equal(run([entry],[expense(1,20,day,'debit')],[income(1,100)]).values.account,1080);
 const second=setup({entryId:'other'});const result=run([entry,second],[],[income(1,100)],{values:{account:1000,other:200}});
 assert.deepEqual(result.conflicts,['bank']);assert.equal(result.values.account,1000);assert.equal(result.values.other,200);assert(result.details.account.blocked);
});
test('duplicate ID tombstone wins a stale live record and later restoration wins tombstone',()=>{
 const live={...income(1,70),updatedAtMs:1}, tomb={...live,deleted:true,updatedAtMs:2};
 assert.equal(run([setup()],[],[tomb,live]).values.account,1000);
 assert.equal(run([setup()],[],[live,tomb,{...live,updatedAtMs:3}]).values.account,1070);
});
test('transfers are explicitly excluded and counted for manual reconciliation',()=>{
 const result=run([setup()],[{...expense(1,50),transferId:'t'}],[{...income(1,50),isTransfer:true}]);assert.equal(result.values.account,1000);assert.equal(result.excludedTransfers,2);
});
test('a new reconciliation preserves earlier confirmed snapshots and computes subsequent changes',()=>{
 const entry=setup({date:'2026-09-01'});entry.balanceLink.checkpoints.push(createBalanceCheckpoint({date:day,amount:2000,methodIds:['bank'],expenses:[],incomes:[income(1,100)],now}));
 const history={'2026-09':{account:777,_total:777,_savedAt:'keep'}};const result=run([entry],[],[income(1,100),income(2,30)],{history});
 assert.equal(result.values.account,2030);assert.deepEqual(result.history['2026-09'],history['2026-09']);assert.equal(history['2026-10'],undefined);
});
test('derived missing periods honor financial month boundaries and preserve unrelated manual balances',()=>{
 const entry=setup({date:'2026-08-20'});const result=run([entry,{id:'house'}],[],[income(1,30,'2026-09-05'),income(2,50,'2026-10-22')],{periodSettings:{mode:'financial',startDay:20}});
 assert.equal(result.values.account,1080);assert.equal(result.history['2026-09'].account,1030);assert.equal(result.history['2026-11'].account,1080);assert.equal(result.history['2026-11'].house,300000);assert.equal(result.history['2026-11']._total,301080);
});
test('serialized backup and repeated cloud hydration have identical results and no mutations',()=>{
 const entries=[setup()], incomes=[income(1,0.1),income(2,0.2)], input={entries,incomes,expenses:[expense(1,0.1)]};const original=JSON.stringify(input);
 assert.equal(run(entries,input.expenses,incomes).values.account,1000.2);
 for(let n=0;n<5;n++){const copy=JSON.parse(original);assert.deepEqual(run(copy.entries,copy.expenses,copy.incomes),run(entries,input.expenses,incomes));}
 assert.equal(JSON.stringify(input),original);
});
test('invalid date, missing mapping and invalid opening amount cannot activate a link',()=>{
 for(const patch of [{date:'2026-02-31'},{date:'2026-10-27'},{methodIds:[]},{amount:''},{amount:NaN}])assert.throws(()=>createBalanceCheckpoint({date:day,amount:1000,methodIds:['bank'],now,...patch}));
});

test('malformed imported links cannot crash the app or activate calculations',()=>{
 for(const checkpoints of [[null],[{}],[{date:'invalid',amount:0,methodIds:['bank']}],[{date:day,amount:0,methodIds:[]}]] ){
  const entry={id:'account',balanceLink:{version:1,enabled:true,checkpoints}};assert.equal(run([entry],[],[income(1,40)]).values.account,1000);
 }
});
test('all confirmed prior snapshot shapes and totals remain byte-equivalent',()=>{
 const history={'2026-09':{values:{account:777},_total:777,_automatic:{account:true}}};const original=JSON.stringify(history);
 const result=run([setup({date:'2026-08-01'})],[],[income(1,40,'2026-09-10')],{history});assert.equal(JSON.stringify(result.history['2026-09']),JSON.stringify(history['2026-09']));assert.equal(JSON.stringify(history),original);
});
test('refunds, negative balances, zero amounts and invalid amounts remain well-defined',()=>{
 const rows=[expense(1,-30),expense(2,1200),expense(3,0),expense(4,'invalid')];
 assert.equal(run([setup()],rows).values.account,-170);
});


test('archived assets retain method ownership and linked balance',()=>{
 const archived={...setup({methodIds:['bank','old-cash']}),archived:true};
 const result=run([archived],[expense('a',20,day,'old-cash')],[income('b',80)]);
 assert.equal(result.values.account,1060);assert.equal(result.conflicts.length,0);
 const blocked=run([archived,setup({entryId:'other'})],[],[income('c',80)],{values:{account:1000,other:200}});
 assert.deepEqual(blocked.conflicts,['bank']);assert.equal(blocked.values.account,1000);assert.equal(blocked.values.other,200);
});

test('Share cash follows the full outlay and actual settlements, independently of shares and closure', () => {
  const { project, assignments } = shareCashFixture();
  const entry = setup({ amount: 100, methodIds: ['cash'] });
  const balance = () => run([entry], [], [], {
    shareCashMovements: shareCashMovementsForUser([project, project], assignments, 'owner', 'EUR'),
  }).values.account;
  assert.equal(balance(), 40);
  project.status = 'archived';
  assert.equal(balance(), 40);
  project.activities.push({ id: 'receive', kind: 'settlement', from: 'other', to: 'me', amount: 100, date: day, createdAt: day + 'T13:00:00Z' });
  assignments[shareCashMovementKey(project.id, 'receive')] = { methodId: 'cash', direction: 'income' };
  assert.equal(balance(), 140);
  project.activities.push({ id: 'pay', kind: 'settlement', from: 'me', to: 'other', amount: 20, date: day, createdAt: day + 'T14:00:00Z' });
  assignments[shareCashMovementKey(project.id, 'pay')] = { methodId: 'cash', direction: 'expense' };
  assert.equal(balance(), 120);
  project.activities[0].baseAmount = 50;
  assert.equal(balance(), 130);
  assignments[shareCashMovementKey(project.id, 'pay')].methodId = 'card';
  assert.equal(balance(), 150);
  project.deletedActivityIds = ['receive'];
  assert.equal(balance(), 50);
  project.activities[0].paidBy = 'other';
  assert.equal(balance(), 100);
});

test('Share opening checkpoints do not replay same-day cash and exclude earlier or future activity', () => {
  const { project, assignments } = shareCashFixture();
  const entry = setup({ amount: 100, methodIds: ['cash'] });
  const [activity] = project.activities;
  const cash = () => shareCashMovementsForUser([project], assignments, 'owner', 'EUR');
  delete entry.balanceLink.checkpoints[0].shareBaselineIds;
  activity.createdAt = day + 'T09:00:00Z';
  assert.equal(run([entry], [], [], { shareCashMovements: cash() }).values.account, 100);
  activity.createdAt = day + 'T13:00:00Z';
  assert.equal(run([entry], [], [], { shareCashMovements: cash() }).values.account, 40);
  entry.balanceLink.checkpoints.push(createBalanceCheckpoint({
    date: day, amount: 40, methodIds: ['cash'], shareCashMovements: cash(), now,
  }));
  assert.equal(run([entry], [], [], { shareCashMovements: cash() }).values.account, 40);
  activity.baseAmount = 50;
  assert.equal(run([entry], [], [], { shareCashMovements: cash() }).values.account, 50);
  activity.date = '2026-10-27';
  assert.equal(run([entry], [], [], { shareCashMovements: cash() }).values.account, 100);
  assert.equal(run([entry], [], [], { today: activity.date, shareCashMovements: cash() }).values.account, 50);
});

test('materialized recurring payments and receipts count once per occurrence across replay', () => {
  const entry = setup({ amount: 100 });
  const rule = { id: 'rent' };
  const out = { ...expense(recurringMovementId(rule, day), 30), recurringRuleId: rule.id, recurringOccurrenceDate: day };
  const duplicate = { ...out, id: 'legacy', amount: 25, updatedAtMs: 2 };
  const inRow = { ...income('receipt', 60), recurringOccurrenceId: 'salary@' + day };
  const future = { ...expense('future', 90, '2026-10-27'), recurringOccurrenceId: 'rent@2026-10-27' };
  const planned = { ...expense('planned', 90), recurringOccurrenceId: 'planned@' + day, planned: true };
  assert.equal(run([entry], [out, duplicate, future, planned], [inRow, { ...inRow, id: 'retry' }]).values.account, 135);
  const tombstone = { ...duplicate, deleted: true, updatedAtMs: 3 };
  assert.equal(run([entry], [out, duplicate, tombstone], [inRow]).values.account, 160);
});

function shareCashFixture() {
  const project = {
    id: 'trip', ownerUid: 'owner', status: 'active',
    participants: [{ id: 'me', uid: 'owner' }, { id: 'other', uid: 'guest' }],
    activities: [
      { id: 'meal', kind: 'expense', paidBy: 'me', amount: 60, baseAmount: 60, baseCurrency: 'EUR', date: day, createdAt: day + 'T13:00:00Z', shares: { me: 10, other: 50 } },
      { id: 'hotel', kind: 'expense', paidBy: 'other', amount: 80, date: day, shares: { me: 40, other: 40 } },
    ],
  };
  return { project, assignments: Object.fromEntries(project.activities.map(row =>
    [shareCashMovementKey(project.id, row.id), { methodId: 'cash', direction: 'expense' }])) };
}

test('Share quotas exported to personal history never charge an account or duplicate the real outlay', () => {
  const quota = { ...expense('share-history', 10), source: 'share_project_history', createdAt: day + 'T10:00:00Z' };
  const cash = [{ id: 'meal', direction: 'expense', methodId: 'bank', amount: 60, date: day, createdAt: day + 'T13:00:00Z' }];
  const entry = setup({ amount: 100 });
  assert.equal(run([entry], [quota], [], { shareCashMovements: cash }).values.account, 40);
  const legacy = entry.balanceLink.checkpoints[0];
  delete legacy.shareBaselineIds;
  legacy.baselineCents = -1000;
  assert.equal(run([entry], [quota], [], { shareCashMovements: cash }).values.account, 40);
  const cp = createBalanceCheckpoint({ date: day, amount: 40, methodIds: ['bank'], expenses: [quota], shareCashMovements: cash, now });
  assert.equal(cp.baselineCents, -6000);
});

test('Share corrections recalculate cached periods and preserve a confirmed closing snapshot', () => {
 const initial = setup({ amount: 100, methodIds: ['cash'] });
 const bank = setup({ amount: 100, methodIds: ['bank'], entryId: 'second' });
 const month = '2026-10', today = '2026-11-03';
 const movement = { id: 'expense', direction: 'expense', methodId: 'cash', amount: 60, date: '2026-10-29', createdAt: day + 'T13:00:00Z' };
 const base = { entries: [initial, bank], today, mode: 'entrambe' };
 const current = derivePatrimony({ ...base, shareCashMovements: [movement] });
 const moved = derivePatrimony({ ...base, history: current.history, shareCashMovements: [{ ...movement, methodId: 'bank', date: today }] });
 assert.equal(moved.values.account, 100);
 assert.equal(moved.values.second, 40);
 assert.equal(moved.history[month].account, 100);
 const confirmed = { ...current.history[month], _confirmedEntries:{account:true,second:true}, _savedAt: '2026-11-01T10:00:00Z' };
 const deleted = derivePatrimony({ ...base, history: { [month]: confirmed } });
 assert.equal(deleted.values.account, 100);
 assert.equal(deleted.values.second, 100);
 assert.deepEqual(deleted.history[month], confirmed);
 const before = derivePatrimony({ ...base, shareCashMovements: [{ ...movement, date: '2026-10-25' }] });
 // A backdated row created after the opening belongs to the earlier period.
 assert.equal(before.values.account, 100);
});

test('moving a newly recorded Share debit respects the next independently confirmed opening',()=>{
 const oct='2026-10-01',nov='2026-11-01';
 const entry={id:'cash',balanceLink:{version:1,enabled:true,checkpoints:[
  {date:oct,amount:100,methodIds:['cash'],baselineCents:0,savedAt:oct+'T12:00:00Z'},
  {date:nov,amount:100,methodIds:['cash'],baselineCents:0,savedAt:nov+'T12:00:00Z',shareBaselineIds:[]},
 ]}};
 const debit={id:'share-edit',direction:'expense',methodId:'cash',amount:60,date:'2026-11-04',createdAt:'2026-11-04T12:00:00Z'};
 const options={entries:[entry],mode:'entrambe',today:'2026-11-04'};
 const initial=derivePatrimony({...options,shareCashMovements:[debit]});
 assert.equal(initial.history['2026-10'].cash,100);
 const changed=derivePatrimony({...options,history:initial.history,shareCashMovements:[{...debit,date:'2026-10-31'}]});
 assert.equal(changed.history['2026-10'].cash,40);
 assert.equal(changed.values.cash,100);
 const removed=derivePatrimony({...options,history:changed.history});
 assert.equal(removed.history['2026-10'].cash,100);
 assert.equal(removed.values.cash,100);
});

test('a stale dated Share row cannot reappear after authoritative deletion; open October and November both reconcile',()=>{
 const initial={date:'2026-10-28',amount:145,methodIds:['cash'],baselineCents:0,savedAt:'2026-10-28T12:00:00Z'};
 const cash={id:'cash',balanceLink:{enabled:true,version:1,checkpoints:[initial]}};
 const starting={'2026-10':{cash:145,_total:145,_savedAt:'2026-10-14T08:00:00Z'}};
 const opts={entries:[cash],history:starting,today:'2026-11-04',mode:'entrambe'};
 const row={id:'share',direction:'expense',methodId:'cash',amount:50000,createdAt:'2026-11-04T12:00:00Z',date:'2026-11-04'};
 const nov=derivePatrimony({...opts,shareCashMovements:[row]});
 assert.equal(nov.history['2026-10'].cash,145);
 const oct=derivePatrimony({...opts,shareCashMovements:[{...row,date:'2026-10-05'}]});
 assert.equal(oct.history['2026-10'].cash,-49855);
 assert.equal(oct.history['2026-11'].cash,145);
 const back=derivePatrimony({...opts,history:oct.history,shareCashMovements:[row]});
 assert.equal(back.history['2026-10'].cash,145);
 assert.equal(back.history['2026-11'].cash,-49855);
 const removed=derivePatrimony({...opts,history:oct.history});
 assert.equal(removed.history['2026-10'].cash,145);
 assert.equal(removed.values.cash,145);
 assert.equal(starting['2026-10'].cash,145);
});

test('personal income, expenses and confirmed recurring items move between periods without duplicate effects',()=>{
 const first='2026-10-01',cp=createBalanceCheckpoint({date:first,amount:100,methodIds:['cash','card'],now:first+'T12:00:00Z'});
 const account={id:'account',balanceLink:{version:1,enabled:true,checkpoints:[cp]}};
 const opts={entries:[account],today:'2026-11-04',mode:'entrambe'};
 const recent='2026-11-03',old='2026-10-30';
 const incomeRow={id:'salary',date:recent,amount:90,receivedInMethodId:'cash',createdAt:'2026-11-01T12:00:00Z'};
 const expenseRow={id:'rent',date:recent,amount:20,methodId:'card',catId:'old',recurringRuleId:'rec',recurringOccurrenceDate:recent,createdAt:'2026-11-01T12:00:00Z'};
 const baseline=derivePatrimony({...opts,expenses:[expenseRow],incomes:[incomeRow]});
 assert.equal(baseline.history['2026-10'].account,100);
 assert.equal(baseline.values.account,170);
 const expenseEdit={...expenseRow,date:old,amount:30,catId:'new',methodId:'cash',updatedAtMs:2};
 const moved=derivePatrimony({...opts,history:baseline.history,expenses:[expenseRow,expenseEdit],incomes:[{...incomeRow,date:old,amount:95}]});
 assert.equal(moved.history['2026-10'].account,165);
 assert.equal(moved.values.account,165);
 const noExpense=derivePatrimony({...opts,history:moved.history,expenses:[expenseEdit,{...expenseEdit,deleted:true,updatedAtMs:3}],incomes:[{...incomeRow,receivedInMethodId:'other'}]});
 assert.equal(noExpense.history['2026-10'].account,100);
 assert.equal(noExpense.values.account,100);
});
