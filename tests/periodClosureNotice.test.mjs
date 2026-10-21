import test from "node:test";
import assert from "node:assert/strict";
import { periodClosureNoticeId, periodClosureNoticeEnabled, periodClosureNoticeVisible, periodClosureNoticeRead, periodClosureNoticeText, updatePeriodClosureNotice } from "../src/notifications/periodClosureNotice.mjs";
const id = periodClosureNoticeId("2026-09", "EUR");
test("identificatore unico per mese e valuta", () => {
  assert.equal(id, "period_closure:EUR:2026-09");
  assert.notEqual(id, periodClosureNoticeId("2026-10", "EUR"));
  assert.notEqual(id, periodClosureNoticeId("2026-09", "USD"));
  assert.throws(() => periodClosureNoticeId("2026-13", "EUR"));
});
test("attiva di default, disattivabile nelle notifiche", () => {
  assert.equal(periodClosureNoticeEnabled({}), true);
  assert.equal(periodClosureNoticeEnabled({periodClosureActive:false}), false);
  assert.equal(periodClosureNoticeVisible({periodClosureActive:false},id), false);
  assert.equal(periodClosureNoticeVisible({},id), true);
});
test("notifica leggibile una sola volta, resta letta", () => {
  const p = updatePeriodClosureNotice({},id,"read");
  assert.equal(periodClosureNoticeRead(p,id),true);
  assert.equal(periodClosureNoticeVisible(p,id),true);
  assert.equal(periodClosureNoticeRead(p,periodClosureNoticeId("2026-10","EUR")),false);
});
test("eliminazione permanente per il mese, senza disattivare altri mesi", () => {
  const p = updatePeriodClosureNotice({},id,"dismiss");
  assert.equal(periodClosureNoticeVisible(p,id),false);
  assert.equal(periodClosureNoticeVisible(p,periodClosureNoticeId("2026-10","EUR")),true);
  assert.equal(periodClosureNoticeVisible(p,periodClosureNoticeId("2026-09","USD")),true);
  assert.equal(periodClosureNoticeEnabled(p),true);
  assert.deepEqual(updatePeriodClosureNotice(p,id,"dismiss"),p);
});
test("testi disponibili nelle lingue supportate", () => {
  for (const lang of ["it","en","es","fr","de","pt","pl","nl","ro","el"]) {
    assert.ok(periodClosureNoticeText(lang, "settingTitle"));
    assert.ok(periodClosureNoticeText(lang, "settingDescription"));
    assert.ok(periodClosureNoticeText(lang, "open"));
  }
});
test("preferenze immutabili per la sincronizzazione", () => {
  const source = {periodClosureActive:true, periodClosureRead:{foo:true}};
  const out = updatePeriodClosureNotice(source,id,"dismiss");
  assert.notEqual(out,source);
  assert.deepEqual(source,{periodClosureActive:true,periodClosureRead:{foo:true}});
});
