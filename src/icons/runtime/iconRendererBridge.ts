let renderer:any=null,assetReader:any=null,subscribe:any=null;
export function registerCatalogIconRenderer(value:any,reader?:any,listen?:any){renderer=value;assetReader=reader;subscribe=listen;}
export function getCatalogIconRenderer(){return renderer;}
export function getCatalogIconAsset(value:any){return assetReader?.(value)||null;}
export function subscribeCatalogIconAssets(listener:()=>void){return subscribe?.(listener)||(()=>{});}
