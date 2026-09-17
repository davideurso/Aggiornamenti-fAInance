import { FainanceIcon } from './customIconLibrary';

// Keep uploaded icons as images and always provide a fallback for old/imported
// categories without an icon. This only changes presentation, never the catalog.
export function CatalogLabel({ item, fallback = '🏷️', name }: { item?: any; fallback?: string; name: string }) {
  const icon = typeof item?.icon === 'string' && item.icon.trim() ? item.icon : fallback;
  return <span style={{display:'inline-flex',alignItems:'center',gap:5,maxWidth:'100%',verticalAlign:'middle'}}>
    <FainanceIcon value={icon} size={16} style={{flexShrink:0}}/>
    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</span>
  </span>;
}
