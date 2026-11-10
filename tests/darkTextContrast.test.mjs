import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTextColor, readableDarkText, textContrastRatio } from '../src/ui/textContrast.js';

// Independent WCAG reference calculation, including transparency compositing.
function referenceRatio(foreground, background) {
  const linear = value => { const v=value/255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); };
  const luminance = rgb => linear(rgb[0])*0.2126+linear(rgb[1])*0.7152+linear(rgb[2])*0.0722;
  const x=luminance(foreground), y=luminance(background);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
const foregrounds=['#333','#555','#666','#64748b','#534AB7','#7F77DD','#1D9E75','#E24B4A','#378ADD','#aaa','#fff','#ccc','#856404','#9a6a00','rgba(255,255,255,0.85)'];
const backgrounds=['#1a1a2e','#16213e','#1e1e30','#252535','#35354a','#17352d','#351f24','#fff5f5','#FFF8E1','#378ADD','#1D9E75','#E24B4A'];

test('known black/white reference ratios',()=>{
  assert.equal(textContrastRatio([0,0,0],[255,255,255]),21);
  assert.equal(textContrastRatio([17,17,17],[17,17,17]),1);
});
test('dark text reaches 4.5:1 across dark cards, light popups and accent buttons',()=>{
  for(const color of foregrounds) for(const background of backgrounds) {
    const corrected=readableDarkText(color,true,background);
    const fg=parseTextColor(corrected), bg=parseTextColor(background);
    const visible=fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3]));
    assert.ok(referenceRatio(visible,bg)>=4.5,`${color} on ${background}: ${corrected}`);
  }
});
test('light mode preserves the original value exactly, including custom colours',()=>{
  for(const color of [...foregrounds,'var(--custom)','inherit',undefined,null])
    for(const bg of backgrounds) assert.equal(readableDarkText(color,false,bg),color);
});
test('sufficient dark contrast preserves semantic and custom colours',()=>{
  assert.equal(readableDarkText('#BEB8FF',true,'#252535'),'#BEB8FF');
  assert.equal(readableDarkText('#856404',true,'#FFF8E1'),'#856404');
});
test('unsupported gradients and colour expressions are preserved for component-specific styling',()=>{
  assert.equal(readableDarkText('var(--custom)',true),'var(--custom)');
  assert.equal(readableDarkText('#fff',true,'linear-gradient(#fff,#000)'),'#fff');
});
test('transparent dark surfaces are composited and corrected',()=>{
  const corrected=readableDarkText('#555',true,'transparent');
  assert.ok(referenceRatio(parseTextColor(corrected),[53,53,74])>=4.5);
});
