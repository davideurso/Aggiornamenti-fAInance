const TEST_PROJECT='fainance-test-20260823195207';
const TEST_ORIGIN='https://fainancechatgpttest-kgt2744bdq-ew.a.run.app';
const PUBLIC_ORIGIN='https://europe-west1-fainance-a7794.cloudfunctions.net/fainanceChatgpt';

export function subscriptionEndpoint(environment,projectId){
 if(environment==='test'&&projectId===TEST_PROJECT)return TEST_ORIGIN;
 if(environment==='production'&&projectId==='fainance-a7794')return PUBLIC_ORIGIN;
 return null;
}
async function request(origin,path,auth,body,fetcher){
 const user=auth?.currentUser;
 if(!user?.uid)throw Error('LOGIN_REQUIRED');
 const token=await user.getIdToken();
 if(auth.currentUser!==user)throw Error('ACCOUNT_CHANGED');
 const response=await fetcher(origin+'/subscriptions/'+path,{method:'POST',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),
  signal:AbortSignal.timeout(30000)});
 const result=await response.json();
 if(auth.currentUser!==user)throw Error('ACCOUNT_CHANGED');
 if(!response.ok)throw Error(result.error||'STORE_VERIFICATION_FAILED');
 return result;
}
export async function purchaseWithStoreVerification({billing,args,auth,environment,projectId,fetcher=fetch}){
 const origin=subscriptionEndpoint(environment,projectId);
 const binding=origin?await request(origin,'account',auth,{},fetcher):{};
 const uid=auth?.currentUser?.uid;
 const result=await billing.purchase({...args,...binding});
 return synchronizePurchase({result,auth,uid,origin,fetcher,platform:args.platform});
}
export async function restoreWithStoreVerification({billing,args,auth,environment,projectId,fetcher=fetch}){
 const uid=auth?.currentUser?.uid;
 const result=await billing.restorePurchases(args);
 return synchronizePurchase({result,auth,uid,origin:subscriptionEndpoint(environment,projectId),fetcher,platform:args.platform});
}
async function synchronizePurchase({result,auth,uid,origin,fetcher,platform}){
 if(!result?.success||!origin)return result;
 if(!uid||auth?.currentUser?.uid!==uid)throw Error('ACCOUNT_CHANGED');
 try{
  const body=platform==='ios'?{provider:'apple',signedTransaction:result.signedTransaction}:
   {provider:'google',purchaseToken:result.purchaseToken};
  const verified=await request(origin,'verify',auth,body,fetcher);
  return {...result,storeSubscriptionVerified:verified.active,
   storeSubscriptionSyncPending:['premium','complete'].includes(result.plan)&&!verified.active};
 }catch{
  if(auth?.currentUser?.uid!==uid)throw Error('ACCOUNT_CHANGED');
  // A server outage must not turn a completed Store purchase into a failed purchase
  // or encourage the user to buy twice. Keep the native result; retry through Restore.
  return {...result,storeSubscriptionVerified:false,storeSubscriptionSyncPending:true};
 }
}
export function storeSubscriptionNotice(lang){
 const messages={
  it:'Acquisto conservato. Collegamento ChatGPT da sincronizzare: usa Ripristina acquisti, senza acquistare di nuovo.',
  en:'Purchase preserved. ChatGPT access needs syncing: use Restore purchases, without buying again.',
  es:'Compra conservada. Falta sincronizar el acceso a ChatGPT: usa Restaurar compras, sin volver a comprar.',
  fr:'Achat conservé. Accès ChatGPT à synchroniser : utilisez Restaurer les achats, sans acheter à nouveau.',
  de:'Kauf gespeichert. ChatGPT-Zugriff muss synchronisiert werden: Käufe wiederherstellen, nicht erneut kaufen.',
  pt:'Compra preservada. O acesso ao ChatGPT precisa ser sincronizado: use Restaurar compras, sem comprar novamente.',
  pl:'Zakup zachowany. Dostęp do ChatGPT wymaga synchronizacji: użyj Przywróć zakupy, bez ponownego zakupu.',
  nl:'Aankoop behouden. ChatGPT-toegang moet worden gesynchroniseerd: gebruik Aankopen herstellen, zonder opnieuw te kopen.',
  ro:'Achiziție păstrată. Accesul ChatGPT trebuie sincronizat: folosește Restabilește achizițiile, fără să cumperi din nou.',
  el:'Η αγορά διατηρήθηκε. Απαιτείται συγχρονισμός πρόσβασης στο ChatGPT: χρησιμοποιήστε Επαναφορά αγορών, χωρίς νέα αγορά.',
 };return messages[lang]||messages.en;
}
