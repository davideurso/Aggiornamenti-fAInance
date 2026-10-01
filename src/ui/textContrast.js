// Text-only correction: light mode and stored category/theme colours stay unchanged.
export function parseTextColor(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim().toLowerCase();
  if (s === 'white') return [255,255,255,1];
  if (s === 'transparent') return [0,0,0,0];
  if (s === 'black') return [0,0,0,1];
  const h = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (h) {
    const hex = h[1].length === 3 ? [...h[1]].map(c=>c+c).join('') : h[1];
    return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)).concat(hex.length===8?parseInt(hex.slice(6),16)/255:1);
  }
  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(s);
  return rgb ? [Number(rgb[1]),Number(rgb[2]),Number(rgb[3]),rgb[4]===undefined?1:Number(rgb[4])] : null;
}
export function textContrastRatio(a,b) {
  const lum = c => c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
  const x=lum(a),y=lum(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
const resolvedColors = new Map();
export function readableDarkText(color, dark, background = '#35354a') {
  if (!dark) return color;
  const key=String(color)+"|"+String(background);
  if(resolvedColors.has(key)) return resolvedColors.get(key);
  const remember = value => { if(resolvedColors.size>=512) resolvedColors.clear(); resolvedColors.set(key,value); return value; };
  const fg=parseTextColor(color), rawBg=parseTextColor(background);
  // Unknown colours/gradients need an explicit component palette; never guess.
  if (!fg || !rawBg) return color;
  const base=[53,53,74];
  const bg=rawBg.slice(0,3).map((v,i)=>v*rawBg[3]+base[i]*(1-rawBg[3]));
  const visible=fg.slice(0,3).map((v,i)=>v*fg[3]+bg[i]*(1-fg[3]));
  if(textContrastRatio(visible,bg)>=4.5) return remember(color);
  const target=textContrastRatio([255,255,255],bg)>=textContrastRatio([0,0,0],bg)?255:0;
  for(let step=1;step<=100;step++) {
    const candidate=visible.map(v=>Math.round(v+(target-v)*step/100));
    if(textContrastRatio(candidate,bg)>=4.5) return remember('#'+candidate.map(v=>v.toString(16).padStart(2,'0')).join(''));
  }
  return target?'#ffffff':'#000000';
}
