export function fainanceBytesToBase64(bytes:any){
  var out="";var chunk=0x8000;
  for(var i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode.apply(null,Array.from(bytes.subarray(i,Math.min(i+chunk,bytes.length))));
  return btoa(out);
}
export function fainanceBase64ToBytes(value:string){
  var raw=atob(String(value||""));var out=new Uint8Array(raw.length);
  for(var i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
  return out;
}
