import {useEffect,useLayoutEffect,useRef,useState} from 'react';

// Measure the existing 1x renderer once, before paint, rather than inventing a
// common pixel height. A single DOM tree is used: no hidden duplicate worklets,
// no duplicate effects, and no height preference written into user settings.
export function useHomeWorkletHeights(revision:object) {
  const [,redraw]=useState(0);
  const [viewport,setViewport]=useState(()=>typeof window==='undefined'?0:window.innerWidth);
  const cache=useRef<{revision:object|null;viewport:number;heights:Map<string,number>}>({revision:null,viewport:0,heights:new Map()});
  const pending=useRef(new Map<string,HTMLElement>());
  if(cache.current.revision!==revision||cache.current.viewport!==viewport){cache.current={revision,viewport,heights:new Map()};pending.current.clear();}
  useEffect(()=>{const resize=()=>setViewport(window.innerWidth);window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  useLayoutEffect(()=>{
    let changed=false;
    for(const [key,node] of pending.current){
      if(!node.isConnected)continue;
      const height=node.getBoundingClientRect().height;
      if(height>0&&!cache.current.heights.has(key)){cache.current.heights.set(key,height);changed=true;}
    }
    pending.current.clear();
    if(changed)redraw(x=>x+1);
  });
  return function layoutFor(w:any){
    // The compact savings renderer has less content than 1x: measure its own
    // natural height instead of reserving the full-width summary's empty area.
    const compactSaving=w.type==='planned_saving'&&w.size==='0.5x';
    const key=JSON.stringify([w.id,w.type,w.params,compactSaving]);
    const normal=cache.current.heights.get(key);
    return {measuring:normal==null,measurementSize:compactSaving?'0.5x':'1x',height:normal==null?undefined:normal*(w.size==='2x'?1.5:1),
      ref:(node:HTMLDivElement|null)=>{if(node&&normal==null)pending.current.set(key,node);}};
  };
}
