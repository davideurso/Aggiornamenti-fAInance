import React, { useEffect, useState } from 'react';
import { appEnvironment } from '../config/env';
import { startupReport } from './startupDiagnostics';

export function StartupTimingPanel({ready}: {ready: boolean}) {
  const [report,setReport] = useState<ReturnType<typeof startupReport> | null>(null);
  const [closed,setClosed] = useState(false);
  useEffect(() => {
    if (appEnvironment !== 'test' || !ready || report) return;
    const frame = requestAnimationFrame(() => setReport(startupReport()));
    return () => cancelAnimationFrame(frame);
  },[ready,report]);
  if (appEnvironment !== 'test' || !ready || !report || closed) return null;
  const seconds = (value: number | null) => value === null ? '—' : value.toFixed(2).replace('.',',') + ' s';
  return <div role="dialog" aria-label="Tempi di apertura" aria-modal="true" style={{position:'fixed',inset:0,zIndex:2147483647,background:'#0009',display:'flex',alignItems:'center',justifyContent:'center',padding:12,color:'#17213a'}}>
    <div style={{background:'#fff',borderRadius:16,padding:18,width:'100%',maxWidth:380,maxHeight:'95dvh',overflowY:'auto',fontFamily:'sans-serif',boxSizing:'border-box'}}>
      <h2 style={{fontSize:19,margin:'0 0 6px'}}>Tempi di apertura · TEST E1</h2>
      <div style={{fontSize:22,fontWeight:700,marginBottom:10}}>Totale: {seconds(report.total)}</div>
      {report.rows.map(row=><div key={row.label} style={{display:'flex',justifyContent:'space-between',gap:10,padding:'4px 0',borderBottom:'1px solid #e9edf4',fontSize:13}}><span>{row.label}</span><strong style={{whiteSpace:'nowrap'}}>{seconds(row.seconds)}</strong></div>)}
      <p style={{fontSize:11,lineHeight:1.35,margin:'10px 0'}}>Invia uno screenshot di questo riepilogo. Alcune attività si sovrappongono: i tempi non vanno sommati. Il totale parte dall’avvio della pagina interna, non dal tocco sull’icona.</p>
      <button onClick={()=>setClosed(true)} style={{width:'100%',border:0,borderRadius:9,padding:10,background:'#6750a4',color:'#fff',fontWeight:700}}>Chiudi e usa l’app</button>
    </div>
  </div>;
}
