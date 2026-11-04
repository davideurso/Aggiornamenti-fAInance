import assert from 'node:assert/strict';
import { dueCustomReminders, dueSalaryReminder, monthEndDay, salaryDayInMonth, collectDueLocalReminders, readLocalReminders, markLocalReminderRead, removeLocalReminder, clearLocalReminders } from '../src/notifications/localCustomReminders.mjs';
import { notificationChannelKind, notificationDeliveryMode, normalizedNotificationChannels } from '../src/notifications/notificationChannels.mjs';
import { notificationChannelText } from '../src/notifications/notificationChannelTranslations.mjs';

assert.equal(monthEndDay(2024, 1), 29);
assert.equal(monthEndDay(2026, 1), 28);
assert.equal(salaryDayInMonth(0, 2024, 1), 29);
assert.equal(salaryDayInMonth(0, 2026, 1), 28);
assert.equal(salaryDayInMonth(31, 2026, 1), 28);
assert.equal(salaryDayInMonth(27, 2026, 1), 27);
assert.equal(dueSalaryReminder({stipendioActive:true,stipendioDay:0,stipendioHour:'18:00'},new Date('2026-02-28T18:00:15').getTime()).length, 1);
assert.equal(dueSalaryReminder({stipendioActive:true,stipendioDay:0,stipendioHour:'18:00'},new Date('2026-02-27T18:00:15').getTime()).length, 0);
const fire = (rule, now) => dueCustomReminders([{id:'x', active:true, title:'Test', hour:'06:43', ...rule}],new Date(now).getTime());
assert.equal(fire({freq:'once',date:'2026-10-25'}, '2026-10-25T06:43:30').length, 1);
assert.equal(fire({freq:'once',date:'2026-10-25'}, '2026-10-25T06:49:00').length, 1);
assert.equal(fire({freq:'once',date:'2026-10-25'}, '2026-10-26T07:00:00').length, 0);
assert.equal(dueSalaryReminder({stipendioActive:true,stipendioDay:0,stipendioHour:'18:00'},new Date('2026-03-01T09:00:00').getTime()).length, 1);
assert.equal(fire({freq:'monthly',dayOfMonth:31}, '2026-02-28T06:44:00').length, 1);
assert.equal(fire({freq:'yearly',date:'2024-02-29'}, '2026-02-28T06:44:00').length, 1);
assert.equal(fire({freq:'weekly',dayOfWeek:0}, '2026-10-25T06:43:10').length, 1);
assert.equal(fire({freq:'weekly',dayOfWeek:1}, '2026-10-25T06:43:10').length, 0);
assert.equal(fire({freq:'daily',active:false}, '2026-10-25T06:43:10').length, 0);
assert.equal(notificationChannelKind('custom_reminder'),'custom');
assert.equal(notificationDeliveryMode({},'custom_reminder'),'in_app');
assert.equal(normalizedNotificationChannels({custom:'email'}).custom,'email');
for (const lang of ['it','en','es','fr','de','pt','pl','nl','ro','el']) {
  for (const k of ['inAppAlways','customName','customDesc','pushHelp','reminderHelpShort','reminderPermissionHelp','salaryLastDayInfo','customDeliveryLimit']) {
    const value=notificationChannelText(lang,k);
    assert.ok(value && value!==k,`${lang}: ${k}`);
  }
}
const mem = new Map();
globalThis.localStorage = {getItem:(k)=>mem.has(k)?mem.get(k):null, setItem:(k,v)=>mem.set(k,v)};
globalThis.window = {dispatchEvent:()=>{}};
globalThis.CustomEvent = class {constructor() {}};
const list=[{id:123, title:'Paga',active:true, freq:'once',hour:'06:43',date:'2026-10-25'}];
const when=new Date('2026-10-25T06:44:00').getTime();
assert.equal(collectDueLocalReminders('user1',list,when).length,1);
assert.equal(collectDueLocalReminders('user1',list,when).length,0);
assert.equal(readLocalReminders('user2').length,0);
assert.equal(readLocalReminders('user1').length,1);
markLocalReminderRead('user1',readLocalReminders('user1')[0].id);
assert.equal(readLocalReminders('user1')[0].read,true);
// A deleted occurrence must not resurrect within the 24-hour catch-up window.
const id = readLocalReminders('user1')[0].id;
removeLocalReminder('user1', id);
assert.equal(readLocalReminders('user1').length,0);
assert.equal(collectDueLocalReminders('user1',list,when).length,0);
// Another account and other occurrence can still fire.
assert.equal(collectDueLocalReminders('user2',list,when).length,1);
assert.equal(readLocalReminders('user2').length,1);
clearLocalReminders('user2');
assert.equal(readLocalReminders('user2').length,0);
assert.equal(collectDueLocalReminders('user2',list,when).length,0);
// Dismissal survives reopening (same localStorage, re-read).
assert.equal(collectDueLocalReminders('user1',list,when+15000).length,0);
console.log('OK: scheduler and translations, channels, duplicate guard');
