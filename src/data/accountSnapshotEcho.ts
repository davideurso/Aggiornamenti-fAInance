const testProject = 'fainance-test-20260823195207';
const ownWrites = new Set<string>();
export function trackAccountWrite(project: string,uid: string,token: string) {
 const key=JSON.stringify([uid,token]);
 if(project!==testProject||!uid||!token)return ()=>{};
 ownWrites.add(key);return ()=>{ownWrites.delete(key);};
}
export function skipTestAccountEcho(input: any,equal: (a:any,b:any)=>boolean) {
 const {project,uid,validatedUid,ready,raw,metadata,last}=input;
 if(project!==testProject||!uid||uid!==validatedUid||!ready||!raw||!last)return false;
 // A cached snapshot must still make its normal transition to server authority.
 if(last.fromCache===!!metadata.fromCache&&equal(last.raw,raw))return true;
 const owned=ownWrites.has(JSON.stringify([uid,String(raw.syncClientWriteToken||'')]));
 const entitlementSame=['currentPlan','plan','subscriptionPlan'].every(key=>equal(last.raw[key],raw[key]));
 return metadata.hasPendingWrites===true&&owned&&entitlementSame;
}
