import assert from 'node:assert/strict';
/** Run against a page with the real catalog selectors and synthetic fixture data.
 * Pass a Playwright Page; use a touch-enabled browser context for Android behavior.
 */
export async function verifyCatalogPopup(page,{trigger,optionName,optionCount,touch=false,amountInput,amountPanel}){
 for(let attempt=0;attempt<2;attempt++){
  if(amountInput)await amountInput.focus();
  const heightBefore=amountPanel?await amountPanel.evaluate(el=>el.getBoundingClientRect().height):null;
  touch?await trigger.tap():await trigger.click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  await page.waitForTimeout(250);assert.equal(await dialog.count(),1,'Opening gesture dismissed its own popup');
  assert.equal(await dialog.getByRole('option').count(),optionCount);
  await page.waitForFunction(()=>[...document.querySelectorAll('[role="dialog"] [role="option"] img')].every(img=>img.complete&&img.naturalWidth>0));
  if(amountPanel)assert.equal(await amountPanel.evaluate(el=>el.getBoundingClientRect().height),heightBefore,'Amount blur moved the controls during the gesture');
  const close=dialog.locator('[data-fainance-popup-close]');
  assert.deepEqual(await close.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,background:getComputedStyle(el).backgroundColor})),{width:28,height:28,background:'rgb(255, 240, 240)'});
  if(attempt===0)await dialog.getByRole('option',{name:optionName,exact:true}).click();else await close.click();
  assert.equal(await page.getByRole('dialog').count(),0);
  assert(await trigger.evaluate(el=>document.activeElement===el),'Focus did not return to the original field');
 }
 await trigger.focus();await trigger.press('ArrowDown');await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');
 assert.equal(await page.getByRole('dialog').count(),0);
}
