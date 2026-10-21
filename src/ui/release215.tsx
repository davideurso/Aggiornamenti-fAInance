import palette from './FAINANCE_PALETTE.json';
import facebookLogo from '../assets/social215/facebook.svg';
import instagramLogo from '../assets/social215/instagram.svg';
import youtubeLogo from '../assets/social215/youtube.svg';

export function PremiumProfileIcon({ dark = false }: { dark?: boolean }) {
  const colors = palette.colors;
  const gold = dark ? colors.orange.hex : colors.amber.hex;
  return <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true" fill="none">
    <circle cx="14" cy="14" r="12.5" fill={dark ? colors['night-surface'].hex : colors.paper.hex} stroke={gold} strokeWidth="1"/>
    <circle cx="14" cy="10" r="3.2" fill={gold}/>
    <path d="M7.8 21c.2-4 2.3-6 6.2-6s6 2 6.2 6Z" fill={gold}/>
  </svg>;
}

export function ReleaseSocialLinks({ dark, openExternal, translate }: any) {
  const c = palette.colors;
  const text = dark ? c['night-text'].hex : c.ink.hex;
  const muted = dark ? c['night-muted'].hex : c.muted.hex;
  const border = dark ? c['night-border'].hex : c.border.hex;
  const links = [
    { name: 'Facebook', username: '@fainanceapp', url: 'https://www.facebook.com/fainanceapp/', logo: facebookLogo },
    { name: 'Instagram', username: '@fainanceapp', url: 'https://www.instagram.com/fainanceapp', logo: instagramLogo },
    { name: 'YouTube', username: '@fAInanceApp', url: 'https://www.youtube.com/@fAInanceApp', logo: youtubeLogo },
  ];
  return <div data-release-social="2.1.15" style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:10 }}>
    {links.map(link=><button key={link.name} type="button" onClick={()=>openExternal(link.url)}
      style={{ gridColumn:link.name==='YouTube'?'1 / -1':undefined, display:'flex', alignItems:'center', gap:10, padding:'12px 10px', border:'1px solid '+border, borderRadius:12, background:dark?c['night-surface'].hex:c['blue-mist'].hex, color:text, cursor:'pointer', textAlign:'left', minWidth:0 }}>
      <span aria-hidden="true" style={{ width:34, height:34, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', background:c.paper.hex, border:'1px solid '+c.border.hex, boxSizing:'border-box', flexShrink:0 }}>
        <img src={link.logo} alt="" width="22" height="22" draggable={false}/>
      </span>
      <span style={{ minWidth:0, flex:1 }}>
        <span style={{ display:'block', fontSize:13, fontWeight:900 }}>{link.name}</span>
        <span data-no-translate="true" style={{ display:'block', fontSize:11, color:muted, marginTop:2, overflowWrap:'anywhere' }}>{link.username}</span>
        
      </span>
      {link.name==='YouTube'&&<span style={{ flex:'1 1 0', minWidth:0, paddingLeft:10, borderLeft:'1px solid '+border, lineHeight:1.35 }}>
        <span style={{ display:'block', fontSize:12, fontWeight:800 }}>{translate('Tutorial e guide')}</span>
        <span style={{ display:'block', fontSize:11, color:muted, marginTop:3 }}>{translate('Scopri come usare fAInance')}</span>
      </span>}
    </button>)}
  </div>;
}
