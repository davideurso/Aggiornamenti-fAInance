import { fainanceBytesToBase64, fainanceBase64ToBytes } from '../utils/base64';

const FAINANCE_ACCOUNT_DATA_COMPRESSION_V5="gzip-base64-json-v1";
export async function fainanceCompressAccountDataV5(value:any){
  var json=JSON.stringify(value==null?{}:value);
  var CompressionCtor:any=(globalThis as any).CompressionStream;
  if(!CompressionCtor)throw new Error("Compressione cloud non disponibile su questo dispositivo.");
  var input=new TextEncoder().encode(json);
  var compressedStream=new Blob([input]).stream().pipeThrough(new CompressionCtor("gzip"));
  var compressed=new Uint8Array(await new Response(compressedStream).arrayBuffer());
  var encoded=fainanceBytesToBase64(compressed);
  if(encoded.length>850000)throw new Error("I dati cloud compressi superano il limite di sicurezza. Esegui un backup prima di continuare.");
  return {encoding:FAINANCE_ACCOUNT_DATA_COMPRESSION_V5,value:encoded,rawBytes:input.length,compressedBytes:compressed.length};
}
export async function fainanceExpandAccountCloudDataV5(raw:any){
  raw=raw&&typeof raw==="object"?raw:{};
  if(!raw.accountDataCompressedV5)return raw;
  try{
    if(String(raw.accountDataCompressionV5||"")!==FAINANCE_ACCOUNT_DATA_COMPRESSION_V5)throw new Error("Formato cloud non riconosciuto.");
    var DecompressionCtor:any=(globalThis as any).DecompressionStream;
    if(!DecompressionCtor)throw new Error("Decompressione cloud non disponibile su questo dispositivo.");
    var bytes=fainanceBase64ToBytes(String(raw.accountDataCompressedV5||""));
    var stream=new Blob([bytes]).stream().pipeThrough(new DecompressionCtor("gzip"));
    var decoded=new TextDecoder().decode(await new Response(stream).arrayBuffer());
    var parsed=JSON.parse(decoded);
    var merged:any={...raw,...(parsed&&typeof parsed==="object"?parsed:{})};
    ["currentPlan","plan","subscriptionPlan"].forEach(function(key){if(raw[key]!==undefined)merged[key]=raw[key];});
    return merged;
  }catch(e){
    console.error("Cloud data decompression error",(e&&e.message)||e);
    return raw;
  }
}
