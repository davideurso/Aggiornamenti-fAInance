// ═══════════════════════════════════════════════════════════════════════════════
// APP.TSX — Shell principale, login, stato globale, navigazione
// Contiene: LoginScreen, AppWithLogin, App() con SettingsPanel nested,
//           AppuntiPanel, TermsModal, navigazione mobile/desktop.
// I pannelli principali sono in sezioni.tsx e statistiche.tsx.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo, createContext, Component } from 'react';
import { AppCtx, useApp, fbAuth, fbDb, googleProvider, doc, setDoc, getDoc, getDocs, addDoc,
  deleteDoc, collection, query, where, limit, onSnapshot,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  onAuthStateChanged, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithCredential,
  deleteUser,
  CURRENCIES, LANGUAGES, BG_THEMES, BUTTON_STYLES,
  DEFAULT_CATS, DEFAULT_METHODS, DEFAULT_EXPENSE_GROUPS, DEFAULT_METHOD_GROUPS,
  DEFAULT_INCOME_GROUPS, DEFAULT_PATRIMONIO_AREAS, DEFAULT_PATRIMONIO_ENTRIES,
  DEFAULT_BUDGET_PLAN, DEFAULT_GOALS, DEFAULT_EXPENSE_CATEGORY_NAMES, DEFAULT_EXPENSE_GROUP_NAMES,
  DEFAULT_METHOD_NAMES, DEFAULT_METHOD_GROUP_NAMES, DEFAULT_PATRIMONIO_AREA_NAMES, DEFAULT_PATRIMONIO_ENTRY_NAMES,
  MONTHS_FULL, MONTHS_SHORT, BALANCE_COLOR,
  COLORS, GOAL_ICONS, INCOME_TYPES, EMOJI_LIST,
  getDefaultLang, getDefaultCurrency, getDefaultDateFormat,
  getAllIncomeTypes, translateDefaultCollection, sameNamedItems,
  useStorage, clearFainanceLocalAccountData, fmtDate, fmtAmt, rateMonth,
  todayStr, dateOffset, DATE_FORMATS, IMPORT_DATE_FORMATS, parseDateWithFormat, parseMoney, androidDownload, exportToCSV, exportToXLSX,
  AI_AGENT_ENDPOINT, AI_AGENT_SCOPE_INSTRUCTION, AI_OUT_OF_SCOPE_MESSAGE,
  PLAN_IDS, PLAN_LABELS, PLAN_PRICES, PLAN_LIMITS, planLabel, planLimitLabel, todayUsageKey, monthUsageKey,
  appLogo, appBanner, aiGrilloMascot
} from './core';
import { TRANSLATIONS, translateFainanceText } from './traduzioni';
import { totalForMonth, last12MonthKeys, balanceForMonths, monthlyTotalsForYear } from './financeCalculations';
import { Btn, Badge, Toggle, Toast, StatCard, DonutChart, BarChart, LineChart,
  AlertPopup, EditModal, SettingsList, AreasEditor, SortableRows,
  PatrimonioSettingsPanel, SortOrderPanel, DeleteDataPanel, ImportData,
  FAInanceLogo, AIGrilloIcon, EmojiPicker, DatePickerField,
  ExpenseForm, BulkEntry, ReceiptScanPanel, RecurringManager,
  BudgetPlanPanel, GoalsPanel, AlertsPanel
} from './widget';
import { StatsPanel } from './statistiche';
import { HomePanel, SpesePanel, HistoryPanel, ConsulenteAIPanel,
  FloatingAIButton, CopyMonthWidget, PatrimonioPanel, SharePanel, MorePanel,
  VoiceEntryModal
} from './sezioni';


// 1.6.68: safe module-level translator fallback.
// Prevents runtime crashes when a component calls L(...) before declaring a local translator.
function FAI_TRANSLATE(value:any){
  try{
    var fn=(typeof window!=="undefined")?(window as any).fainanceTranslateUi:null;
    if(fn)return fn(value);
  }catch(e){}
  return value;
}
function L(value:any){return FAI_TRANSLATE(value);}
function PL(value:any){return FAI_TRANSLATE(value);}
function numOr(v:any,f:any){var n=Number(v);return Number.isFinite(n)?n:f;}
function readFainanceStoredLang(){
  try{
    var raw=localStorage.getItem("pref_lang_v2");
    if(!raw)return "it";
    try{
      var parsed=JSON.parse(raw);
      return parsed||"it";
    }catch(e){
      return String(raw).replace(/^\"|\"$/g,"")||"it";
    }
  }catch(e){return "it";}
}

const ADMOB_APP_ID_ANDROID="ca-app-pub-4502496181111632~4013173874";
const ADMOB_REWARDED_AD_UNIT_ID_ANDROID="ca-app-pub-4502496181111632/2700092208";
const ADMOB_BANNER_AD_UNIT_ID_ANDROID="ca-app-pub-4502496181111632/3175905788";
const ADMOB_APP_ID_IOS="ca-app-pub-4502496181111632~7115058902";
const ADMOB_REWARDED_AD_UNIT_ID_IOS="ca-app-pub-4502496181111632/5610405541";
const ADMOB_BANNER_AD_UNIT_ID_IOS="ca-app-pub-4502496181111632/2522463380";

// Evita il flash visibile in italiano quando è attiva una lingua diversa:
// la UI resta nascosta solo per il frame necessario alla traduzione runtime.
try{
  if(typeof document!=="undefined"&&!document.getElementById("fainance-i18n-no-flash")){
    var st=document.createElement("style");
    st.id="fainance-i18n-no-flash";
    st.textContent='html[data-fainance-i18n="loading"] body{opacity:0!important;} html,body,#root{max-width:100%!important;overflow-x:hidden!important;} #root *{box-sizing:border-box;min-width:0;} .fai-ellipsis{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:100%;display:block;}';
    document.head.appendChild(st);
  }
}catch(e){}

function LoginScreen({onLogin}){
  var [mode,setMode]=useState("login");
  var [email,setEmail]=useState("");
  var [password,setPassword]=useState("");
  var [name,setName]=useState("");
  var [confirmPwd,setConfirmPwd]=useState("");
  var [showPwd,setShowPwd]=useState(false);
  var [error,setError]=useState("");
  var [loading,setLoading]=useState(false);
  var [resetSent,setResetSent]=useState(false);
  var [resetOpen,setResetOpen]=useState(false);
  var [resetEmail,setResetEmail]=useState("");

  function loginLang(){return readFainanceStoredLang();}
  function L(s){return translateFainanceText(s,loginLang());}
  function authActionSettings(){
    var origin="https://fainanceapp.it";
    try{if(typeof window!=="undefined"&&window.location&&window.location.origin)origin=window.location.origin;}catch(e){}
    return {url:origin,handleCodeInApp:false};
  }

  var inp={width:"100%",borderRadius:10,border:"1px solid #e0e0e0",padding:"12px 14px",fontSize:15,background:"#fff",color:"#333",boxSizing:"border-box",outline:"none"};

  function doLogin(){
    setError("");setLoading(true);
    signInWithEmailAndPassword(fbAuth,email,password)
      .then(function(cred){
        onLogin({id:cred.user.uid,email:cred.user.email,name:cred.user.displayName||name||"Utente"});
      })
      .catch(function(err){
        setError(err.code==="auth/user-not-found"||err.code==="auth/wrong-password"||err.code==="auth/invalid-credential"?L("Email o password non corretti."):L("Errore: ")+err.message);
        setLoading(false);
      });
  }

  function doRegister(){
    setError("");
    if(!name.trim()){setError(L("Inserisci il tuo nome."));return;}
    if(!email.includes("@")){setError(L("Email non valida."));return;}
    if(password.length<6){setError(L("Password: minimo 6 caratteri."));return;}
    if(password!==confirmPwd){setError(L("Le password non coincidono."));return;}
    setLoading(true);
    createUserWithEmailAndPassword(fbAuth,email,password)
      .then(function(cred){
        // Save name to Firestore
        return setDoc(doc(fbDb,"users",cred.user.uid),{name:name.trim(),email:email.toLowerCase(),createdAt:new Date().toISOString()})
          .then(function(){
            onLogin({id:cred.user.uid,email:cred.user.email,name:name.trim()});
          });
      })
      .catch(function(err){
        setError(err.code==="auth/email-already-in-use"?L("Email già registrata."):L("Errore: ")+err.message);
        setLoading(false);
      });
  }

  async function doGoogle(){
    setError(""); setLoading(true);
    try {
      var isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
      if(isNative){
        const mod = await import("@capacitor-firebase/authentication");
        const FirebaseAuthentication = mod.FirebaseAuthentication;
        async function nativeGoogleAttempt(resetFirst){
          if(resetFirst&&FirebaseAuthentication.signOut){try{await FirebaseAuthentication.signOut();}catch(e){}}
          return await FirebaseAuthentication.signInWithGoogle({scopes:["email","profile"],customParameters:[{key:"prompt",value:"select_account"}]});
        }
        var result=null;
        try{
          result=await nativeGoogleAttempt(false);
        }catch(firstErr){
          var m=String((firstErr&&firstErr.message)||firstErr||"").toLowerCase();
          if(m.indexOf("no credentials")>=0||m.indexOf("credential")>=0||m.indexOf("canceled")>=0){
            result=await nativeGoogleAttempt(true);
          }else{
            throw firstErr;
          }
        }
        const credData=(result&&result.credential)||{};
        const idToken=credData.idToken||credData.id_token||"";
        const accessToken=credData.accessToken||credData.access_token||"";
        if(!idToken&&!accessToken) throw new Error("Google login non ha restituito token utilizzabili.");
        const credential = GoogleAuthProvider.credential(idToken||null, accessToken||null);
        const cred = await signInWithCredential(fbAuth, credential);
        onLogin({id:cred.user.uid, email:cred.user.email, name:cred.user.displayName||"Utente"});
        return;
      }
      googleProvider.setCustomParameters({prompt:"select_account"});
      const cred = await signInWithPopup(fbAuth, googleProvider);
      onLogin({id:cred.user.uid, email:cred.user.email, name:cred.user.displayName||"Utente"});
    } catch(err){
      console.error("Google login error",(err&&err.code)||"unknown");
      var msg=String((err&&err.message)||err||"");
      var code=(err&&err.code)||"unknown";
      if(msg.toLowerCase().indexOf("no credentials")>=0){
        setError(L("Errore Google: nessuna credenziale Google disponibile sul dispositivo. Riprova dopo aver selezionato un account Google nel popup."));
      }else{
        setError(L("Errore Google: ")+code+" - "+msg);
      }
      setLoading(false);
    }
  }

  async function doApple(){
    setError(""); setLoading(true);
    try {
      var isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
      if(isNative){
        const mod = await import("@capacitor-firebase/authentication");
        const FirebaseAuthentication = mod.FirebaseAuthentication;
        if(!FirebaseAuthentication||!FirebaseAuthentication.signInWithApple){
          throw new Error("Sign in with Apple non disponibile nel plugin di autenticazione installato.");
        }
        const result = await FirebaseAuthentication.signInWithApple({scopes:["email","name"]});
        const credData=(result&&result.credential)||{};
        const idToken=credData.idToken||credData.id_token||credData.identityToken||credData.identity_token||"";
        const accessToken=credData.accessToken||credData.access_token||"";
        const rawNonce=credData.rawNonce||credData.raw_nonce||credData.nonce||"";
        if(!idToken) throw new Error("Apple login non ha restituito un identity token utilizzabile.");
        const provider = new OAuthProvider("apple.com");
        const credential = provider.credential(rawNonce?{idToken:idToken,rawNonce:rawNonce,accessToken:accessToken||undefined}:{idToken:idToken,accessToken:accessToken||undefined});
        const cred = await signInWithCredential(fbAuth, credential);
        try{
          var appleName=(cred.user.displayName||"").trim();
          if(cred.user.uid){
            var ref=doc(fbDb,"users",cred.user.uid);
            var snap=await getDoc(ref);
            if(!snap.exists()){
              await setDoc(ref,{name:appleName||"Utente",email:(cred.user.email||"").toLowerCase(),provider:"apple",createdAt:new Date().toISOString()});
            }
          }
        }catch(saveErr){}
        onLogin({id:cred.user.uid, email:cred.user.email, name:cred.user.displayName||"Utente"});
        return;
      }
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      const cred = await signInWithPopup(fbAuth, provider);
      try{
        if(cred.user&&cred.user.uid){
          var refWeb=doc(fbDb,"users",cred.user.uid);
          var snapWeb=await getDoc(refWeb);
          if(!snapWeb.exists()){
            await setDoc(refWeb,{name:cred.user.displayName||"Utente",email:(cred.user.email||"").toLowerCase(),provider:"apple",createdAt:new Date().toISOString()});
          }
        }
      }catch(saveWebErr){}
      onLogin({id:cred.user.uid, email:cred.user.email, name:cred.user.displayName||"Utente"});
    } catch(err){
      console.error("Apple login error",(err&&err.code)||"unknown");
      var msg=String((err&&err.message)||err||"");
      var code=(err&&err.code)||"unknown";
      if(code==="auth/operation-not-allowed"){
        setError(L("Errore Apple: abilita il provider Apple in Firebase Authentication e riprova."));
      }else if(code==="auth/account-exists-with-different-credential"){
        setError(L("Esiste già un account con questa email. Accedi con il metodo usato in precedenza."));
      }else if(msg.toLowerCase().indexOf("cancel")>=0||code==="auth/cancelled-popup-request"||code==="auth/popup-closed-by-user"){
        setError(L("Accesso Apple annullato."));
      }else{
        setError(L("Errore Apple: ")+code+" - "+msg);
      }
      setLoading(false);
    }
  }

  async function doResetPassword(){
    setError("");
    setResetSent(false);
    var cleanEmail=String(resetEmail||"").trim().toLowerCase();
    if(!cleanEmail||cleanEmail.indexOf("@")<0){setError(L("Inserisci l'email con cui ti sei registrato."));return;}
    setLoading(true);
    try{
      const mod=await import("firebase/auth");
      try{fbAuth.languageCode=loginLang();}catch(e){}
      await mod.sendPasswordResetEmail(fbAuth,cleanEmail,authActionSettings());
      setResetSent(true);
      setError("");
    }catch(err){
      setError((err&&err.code)==="auth/user-not-found"?L("Nessun account trovato con questa email."):L("Errore recupero password: ")+((err&&err.message)||L("invio email non riuscito")));
    }finally{
      setLoading(false);
    }
  }


  return <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
    <div style={{width:"100%",maxWidth:400}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <img src={appBanner} alt="fAInance" style={{width:"100%",maxWidth:280,height:"auto",objectFit:"contain",marginBottom:10}}/>
        <div style={{fontSize:11,color:"#888",fontStyle:"italic"}}>{L("Your AI-powered finance tracker")}</div>
      </div>
      <div style={{background:"#fff",borderRadius:24,padding:28,boxShadow:"0 8px 40px rgba(127,119,221,0.15)"}}>
        <div style={{display:"flex",gap:0,background:"#f5f5f5",borderRadius:12,padding:3,marginBottom:22}}>
          <button onClick={function(){setMode("login");setError("");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:mode==="login"?"#fff":"transparent",color:mode==="login"?"#333":"#888",fontSize:14,cursor:"pointer",fontWeight:mode==="login"?600:400}}>{L("Accedi")}</button>
          <button onClick={function(){setMode("register");setError("");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:mode==="register"?"#fff":"transparent",color:mode==="register"?"#333":"#888",fontSize:14,cursor:"pointer",fontWeight:mode==="register"?600:400}}>{L("Registrati")}</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode==="register"&&<div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>{L("Nome")} *</label><input placeholder={L("Mario Rossi")} value={name} onChange={function(e){setName(e.target.value);}} style={inp}/></div>}
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>{L("Email")} *</label><input type="email" placeholder={L("nome@email.com")} value={email} onChange={function(e){setEmail(e.target.value);}} style={inp}/></div>
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>{L("Password")} *</label>
            <div style={{position:"relative"}}>
              <input type={showPwd?"text":"password"} placeholder={L("Password")} value={password} onChange={function(e){setPassword(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&mode==="login")doLogin();}} style={{...inp,paddingRight:44}}/>
              <button onClick={function(){setShowPwd(!showPwd);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa"}}>{showPwd?"🙈":"👁"}</button>
            </div>
          </div>
          {mode==="register"&&<div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>{L("Conferma password")} *</label><input type={showPwd?"text":"password"} placeholder={L("Ripeti password")} value={confirmPwd} onChange={function(e){setConfirmPwd(e.target.value);}} style={inp}/></div>}
          {mode==="login"&&<button onClick={function(){setResetOpen(!resetOpen);setResetSent(false);setError("");setResetEmail(email||"");}} disabled={loading} style={{background:"none",border:"none",padding:0,alignSelf:"flex-end",fontSize:12,color:"#7F77DD",fontWeight:700,cursor:loading?"not-allowed":"pointer"}}>{L("Password dimenticata?")}</button>}
          {mode==="login"&&resetOpen&&<div style={{background:"linear-gradient(135deg,#f0edff,#e8f4ff)",border:"1px solid rgba(127,119,221,0.25)",borderRadius:18,padding:16,boxShadow:"0 6px 20px rgba(127,119,221,0.12)",display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:34,height:34,borderRadius:12,background:"linear-gradient(135deg,#7F77DD,#378ADD)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:17}}>🔐</div><div><div style={{fontSize:14,fontWeight:800,color:"#534AB7"}}>{L("Recupera password")}</div><div style={{fontSize:11,color:"#777",marginTop:2}}>{L("Ti invieremo un link sicuro per reimpostarla.")}</div></div></div>
            <div><label style={{fontSize:12,color:"#777",display:"block",marginBottom:4}}>{L("Email dell’account")}</label><input type="email" value={resetEmail} onChange={function(e){setResetEmail(e.target.value);}} placeholder={L("nome@email.com")} style={{...inp,background:"#fff",border:"1px solid rgba(127,119,221,0.25)"}}/></div>
            <div style={{display:"flex",gap:8}}><button onClick={doResetPassword} disabled={loading} style={{flex:1,background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:12,padding:"11px",fontSize:13,fontWeight:800,cursor:loading?"not-allowed":"pointer",opacity:loading?0.65:1}}>{loading?L("Invio..."):L("Invia email di recupero")}</button><button onClick={function(){setResetOpen(false);setResetSent(false);setError("");}} disabled={loading} style={{background:"#fff",color:"#666",border:"1px solid #e0e0e0",borderRadius:12,padding:"11px 13px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{L("Annulla")}</button></div>
          </div>}
          {resetSent&&<div style={{background:"#e8f8f0",borderRadius:12,padding:"12px 14px",fontSize:13,color:"#1D9E75",border:"1px solid #a8e6c8",lineHeight:1.4}}>✅ {L("Email di recupero password inviata. Controlla la casella di posta.")}</div>}
          {error&&<div style={{background:"#fff0f0",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#E24B4A",border:"1px solid #fcc"}}>⚠️ {error}</div>}
          <button onClick={mode==="login"?doLogin:doRegister} disabled={loading} style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",opacity:loading?0.7:1}}>
            {loading?"...":(mode==="login"?L("Accedi"):L("Crea account"))}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:1,background:"#eee"}}/><span style={{fontSize:12,color:"#aaa"}}>{L("oppure")}</span><div style={{flex:1,height:1,background:"#eee"}}/></div>
          <button onClick={doApple} disabled={loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#000",color:"#fff",border:"1.5px solid #000",borderRadius:12,padding:"12px",fontSize:14,fontWeight:600,cursor:"pointer",opacity:loading?0.7:1}}>
            <span style={{fontSize:18,lineHeight:1}}></span>
            {L("Accedi con Apple")}
          </button>
          <button onClick={doGoogle} disabled={loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#fff",color:"#333",border:"1.5px solid #e0e0e0",borderRadius:12,padding:"12px",fontSize:14,fontWeight:500,cursor:"pointer"}}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.3z"/><path fill="#34A853" d="M24 48c6.5 0 12-2.2 16-5.9l-7.9-6c-2.2 1.5-5 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z"/><path fill="#FBBC05" d="M10.6 28.5c-.5-1.5-.8-3-.8-4.5s.3-3 .8-4.5v-6.2H2.5C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.7l8.1-6.2z"/><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.2 30.5 0 24 0 14.7 0 6.5 5.4 2.5 13.3l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z"/></svg>
            {L("Accedi con Google")}
          </button>
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:14,fontSize:11,color:"#aaa"}}>© 2026 fAInance</div>
    </div>
  </div>;
}


// ── SECTION ERROR BOUNDARY ──────────────────────────────────────────────────
class SectionErrorBoundary extends Component{
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(error){return{hasError:true,error:error};}
  componentDidCatch(error,info){try{console.error("fAInance section error",error,info);}catch(e){}}
  componentDidUpdate(prevProps){if(prevProps.resetKey!==this.props.resetKey&&this.state.hasError){this.setState({hasError:false,error:null});}}
  render(){
    if(this.state.hasError){
      var dark=!!this.props.dark;
      var subC=dark?"#aaa":"#666";
      var borderC=dark?"#5a3333":"#f3b6b6";
      var tr=typeof this.props.tr==="function"?this.props.tr:function(x){return x;};
      var detail=this.state.error&&this.state.error.message?this.state.error.message:String(this.state.error||tr("Errore sconosciuto"));
      return <div style={{background:dark?"#2a2424":"#fff0f0",border:"1.5px solid "+borderC,borderRadius:18,padding:24,display:"flex",gap:18,alignItems:"flex-start"}}>
        <div style={{width:58,height:58,borderRadius:18,background:dark?"#3a2b2b":"#ffe0e0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0}}>⚠️</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:20,fontWeight:900,color:dark?"#ffd0d0":"#8a2d2d",marginBottom:8}}>{tr("Questa sezione non si è caricata correttamente")}</div>
          <div style={{fontSize:14,color:subC,lineHeight:1.55,marginBottom:14}}>{tr("Errore intercettato senza bloccare l'app. Torna alla Home e segnala il dettaglio tecnico se si ripete.")}</div>
          <div style={{fontSize:13,color:subC,background:dark?"#1e1e30":"#fff",border:"1px solid "+(dark?"#444":"#ddd"),borderRadius:12,padding:"10px 12px",marginBottom:14,wordBreak:"break-word"}}>{tr("Dettaglio tecnico")}: {detail}</div>
          <button onClick={this.props.onHome} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:14,padding:"11px 18px",fontSize:14,fontWeight:800,cursor:"pointer"}}>{tr("Torna alla Home")}</button>
        </div>
      </div>;
    }
    return this.props.children;
  }
}

// ── CONTACT FORM ─────────────────────────────────────────────────────────────
function ContactForm({currentUser}){
  var ctx=useApp();
  var dark=ctx.dark;
  var btnRadius=ctx.btnRadius;
  var textC=dark?"#eee":"#333";
  var subC=dark?"#aaa":"#888";
  var borderC=dark?"#444":"#eee";
  var cardBg=dark?"#252535":"#fff";
  var [name,setName]=useState(currentUser?(currentUser.name||""):"");
  var [email,setEmail]=useState(currentUser?(currentUser.email||""):"");
  var [subject,setSubject]=useState("");
  var [message,setMessage]=useState("");
  var [status,setStatus]=useState(null);
  var [loading,setLoading]=useState(false);
  var sinp={width:"100%",borderRadius:8,border:"1px solid "+borderC,padding:"9px 11px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:textC,boxSizing:"border-box"};
  function contactLang(){return readFainanceStoredLang();}
  function PL(s){return translateFainanceText(s,contactLang());}
  async function send(){
    setStatus(null);
    if(!message.trim()){setStatus({type:"error",text:PL("Inserisci un messaggio.")});return;}
    setLoading(true);
    var payload={name:name.trim(),email:email.trim(),subject:subject.trim()||PL("Messaggio da fAInance"),message:message.trim()};
    try{
      var contactToken="";try{if(fbAuth.currentUser)contactToken=await fbAuth.currentUser.getIdToken();}catch(e){}
      var contactCtrl=new AbortController();var contactTimeout=setTimeout(function(){contactCtrl.abort();},15000);
      var response=await fetch("https://europe-west1-fainance-a7794.cloudfunctions.net/sendContactEmail",{
        method:"POST",
        headers:{"Content-Type":"application/json",...(contactToken?{"Authorization":"Bearer "+contactToken}:{})},
        signal:contactCtrl.signal,
        body:JSON.stringify(payload)
      }).finally(function(){clearTimeout(contactTimeout);});
      var result=null;
      try{result=await response.json();}catch(parseErr){result=null;}
      if(!response.ok||!result||result.ok!==true){
        throw new Error(result&&result.error?result.error:PL("Invio non riuscito."));
      }
      setStatus({type:"ok",text:PL("Messaggio inviato correttamente.")});
      setSubject("");
      setMessage("");
    }catch(err){
      setStatus({type:"error",text:err&&err.message?err.message:PL("Invio non riuscito.")});
    }finally{
      setLoading(false);
    }
  }
  return <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
    <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:14}}>💬 {PL("Contattaci")}</div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Nome")}</label><input value={name} onChange={function(e){setName(e.target.value);}} style={sinp} placeholder={PL("Nome")}/></div>
        <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Email")}</label><input value={email} onChange={function(e){setEmail(e.target.value);}} style={sinp} placeholder="email@dominio.com"/></div>
      </div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Oggetto")}</label><input value={subject} onChange={function(e){setSubject(e.target.value);}} style={sinp} placeholder={PL("Oggetto del messaggio")}/></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Messaggio")} *</label><textarea value={message} onChange={function(e){setMessage(e.target.value);}} style={{...sinp,minHeight:110,resize:"vertical"}} placeholder={PL("Scrivi qui il messaggio...")}/></div>
      {status&&<div style={{fontSize:13,borderRadius:10,padding:"10px 12px",background:status.type==="ok"?"#e8f8f0":"#fff0f0",color:status.type==="ok"?"#1D9E75":"#E24B4A",border:"1px solid "+(status.type==="ok"?"#a8e6c8":"#fcc")}}>{status.type==="ok"?"✅ ":"⚠️ "}{status.text}</div>}
      <button onClick={send} disabled={loading} style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px 16px",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",opacity:loading?0.65:1}}>{loading?PL("Invio in corso..."):PL("Invia messaggio")}</button>
    </div>
  </div>;
}

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────
function ChangePwdSection({dark,textC,subC,borderC,btnRadius,setToast}){
  var [open,setOpen]=useState(false);
  var [newPwd,setNewPwd]=useState("");
  var [confirmPwd,setConfirmPwd]=useState("");
  var [error,setError]=useState("");
  var [loading,setLoading]=useState(false);
  var sinp={width:"100%",borderRadius:8,border:"1px solid "+borderC,padding:"8px 10px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:textC};
  function profileLang(){return readFainanceStoredLang();}
  function PL(s){return translateFainanceText(s,profileLang());}
  function authActionSettings(){
    var origin="https://fainanceapp.it";
    try{if(typeof window!=="undefined"&&window.location&&window.location.origin)origin=window.location.origin;}catch(e){}
    return {url:origin,handleCodeInApp:false};
  }
  function LegacyPlacePromptField({label,value,onChange,placeholder,types,countryRestriction,fallback}){
    var [suggestions,setSuggestions]=useState([]);
    var [focused,setFocused]=useState(false);
    function askGoogle(q){
      try{
        var g=(window as any).google;
        if(!g||!g.maps||!g.maps.places||!g.maps.places.AutocompleteService)return false;
        if(!q||String(q).trim().length<2){setSuggestions([]);return true;}
        var service=new g.maps.places.AutocompleteService();
        var opts={input:String(q),types:types||['(regions)']};
        if(countryRestriction)opts.componentRestrictions={country:countryRestriction};
        service.getPlacePredictions(opts,function(preds,status){
          var ok=g.maps.places.PlacesServiceStatus&&status===g.maps.places.PlacesServiceStatus.OK;
          setSuggestions(ok&&preds?preds.map(function(x){return x.description;}).slice(0,8):[]);
        });
        return true;
      }catch(e){return false;}
    }
    function handle(v){onChange(v);if(!askGoogle(v)){var low=String(v||'').toLowerCase();setSuggestions((fallback||[]).filter(function(x){return String(x).toLowerCase().indexOf(low)>=0;}).slice(0,8));}}
    return <div style={{position:'relative'}}><label style={{fontSize:11,color:subC,display:'block',marginBottom:3}}>{label}</label><input value={value} onFocus={function(){setFocused(true);handle(value);}} onBlur={function(){setTimeout(function(){setFocused(false);},150);}} onChange={function(e){handle(e.target.value);}} style={sinp} placeholder={placeholder}/>{focused&&suggestions.length>0&&<div style={{position:'absolute',zIndex:40,left:0,right:0,top:58,background:dark?'#252535':'#fff',border:'1px solid '+borderC,borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.16)',maxHeight:190,overflowY:'auto'}}>{suggestions.map(function(x){return <button key={x} onMouseDown={function(e){e.preventDefault();onChange(x);setSuggestions([]);setFocused(false);}} style={{display:'block',width:'100%',textAlign:'left',background:'transparent',border:'none',padding:'9px 11px',fontSize:12,color:textC,cursor:'pointer'}}>{x}</button>;})}</div>}</div>;
  }
  function save(){
    setError("");
    if(newPwd.length<6){setError(PL("Minimo 6 caratteri."));return;}
    if(newPwd!==confirmPwd){setError(L("Le password non coincidono."));return;}
    setLoading(true);
    var user=fbAuth.currentUser;
    if(!user){setError(PL("Utente non trovato."));setLoading(false);return;}
    import("firebase/auth").then(function(mod){
      if(!mod||!mod.updatePassword)throw new Error("Funzione cambio password non disponibile.");
      return mod.updatePassword(user,newPwd);
    }).then(function(){
      setToast(PL("Password aggiornata"));
      setOpen(false);setNewPwd("");setConfirmPwd("");
    }).catch(function(err){
      if(err&&err.code==="auth/requires-recent-login"){
        setError(PL("Per sicurezza, esci e rientra prima di cambiare la password."));
      } else {
        setError(PL("Errore")+": "+((err&&err.message)||PL("cambio password non riuscito")));
      }
    }).finally(function(){setLoading(false);});
  }
  return <div style={{borderTop:"1px solid "+borderC,paddingTop:12,marginTop:12}}>
    <button onClick={function(){setOpen(!open);setError("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500,padding:0}}>
      🔑 {open?PL("Annulla"):PL("Cambia password")}
    </button>
    {open&&<div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Nuova password")}</label><input type="password" value={newPwd} onChange={function(e){setNewPwd(e.target.value);}} style={sinp} placeholder={PL("Minimo 6 caratteri")}/></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Conferma password")}</label><input type="password" value={confirmPwd} onChange={function(e){setConfirmPwd(e.target.value);}} style={sinp}/></div>
      {error&&<div style={{fontSize:12,color:"#E24B4A",background:"#fff0f0",borderRadius:8,padding:"8px 10px"}}>{error}</div>}
      <button onClick={save} disabled={loading} style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer",opacity:loading?0.7:1}}>{loading?"...":PL("Aggiorna password")}</button>
    </div>}
  </div>;
}


const PROFILE_COUNTRY_OPTIONS=[{"code":"AF","it":"Afghanistan","en":"Afghanistan","es":"Afganistán","fr":"Afghanistan"},{"code":"AL","it":"Albania","en":"Albania","es":"Albania","fr":"Albanie"},{"code":"DZ","it":"Algeria","en":"Algeria","es":"Argelia","fr":"Algérie"},{"code":"AD","it":"Andorra","en":"Andorra","es":"Andorra","fr":"Andorre"},{"code":"AO","it":"Angola","en":"Angola","es":"Angola","fr":"Angola"},{"code":"AI","it":"Anguilla","en":"Anguilla","es":"Anguila","fr":"Anguilla"},{"code":"AQ","it":"Antartide","en":"Antarctica","es":"Antártida","fr":"Antarctique"},{"code":"AG","it":"Antigua e Barbuda","en":"Antigua & Barbuda","es":"Antigua y Barbuda","fr":"Antigua-et-Barbuda"},{"code":"SA","it":"Arabia Saudita","en":"Saudi Arabia","es":"Arabia Saudí","fr":"Arabie saoudite"},{"code":"AR","it":"Argentina","en":"Argentina","es":"Argentina","fr":"Argentine"},{"code":"AM","it":"Armenia","en":"Armenia","es":"Armenia","fr":"Arménie"},{"code":"AW","it":"Aruba","en":"Aruba","es":"Aruba","fr":"Aruba"},{"code":"AU","it":"Australia","en":"Australia","es":"Australia","fr":"Australie"},{"code":"AT","it":"Austria","en":"Austria","es":"Austria","fr":"Autriche"},{"code":"AZ","it":"Azerbaigian","en":"Azerbaijan","es":"Azerbaiyán","fr":"Azerbaïdjan"},{"code":"BS","it":"Bahamas","en":"Bahamas","es":"Bahamas","fr":"Bahamas"},{"code":"BH","it":"Bahrein","en":"Bahrain","es":"Baréin","fr":"Bahreïn"},{"code":"BD","it":"Bangladesh","en":"Bangladesh","es":"Bangladés","fr":"Bangladesh"},{"code":"BB","it":"Barbados","en":"Barbados","es":"Barbados","fr":"Barbade"},{"code":"BE","it":"Belgio","en":"Belgium","es":"Bélgica","fr":"Belgique"},{"code":"BZ","it":"Belize","en":"Belize","es":"Belice","fr":"Belize"},{"code":"BJ","it":"Benin","en":"Benin","es":"Benín","fr":"Bénin"},{"code":"BM","it":"Bermuda","en":"Bermuda","es":"Bermudas","fr":"Bermudes"},{"code":"BT","it":"Bhutan","en":"Bhutan","es":"Bután","fr":"Bhoutan"},{"code":"BY","it":"Bielorussia","en":"Belarus","es":"Bielorrusia","fr":"Biélorussie"},{"code":"BO","it":"Bolivia","en":"Bolivia","es":"Bolivia","fr":"Bolivie"},{"code":"BA","it":"Bosnia ed Erzegovina","en":"Bosnia & Herzegovina","es":"Bosnia y Herzegovina","fr":"Bosnie-Herzégovine"},{"code":"BW","it":"Botswana","en":"Botswana","es":"Botsuana","fr":"Botswana"},{"code":"BR","it":"Brasile","en":"Brazil","es":"Brasil","fr":"Brésil"},{"code":"BN","it":"Brunei","en":"Brunei","es":"Brunéi","fr":"Brunei"},{"code":"BG","it":"Bulgaria","en":"Bulgaria","es":"Bulgaria","fr":"Bulgarie"},{"code":"BF","it":"Burkina Faso","en":"Burkina Faso","es":"Burkina Faso","fr":"Burkina Faso"},{"code":"BI","it":"Burundi","en":"Burundi","es":"Burundi","fr":"Burundi"},{"code":"KH","it":"Cambogia","en":"Cambodia","es":"Camboya","fr":"Cambodge"},{"code":"CM","it":"Camerun","en":"Cameroon","es":"Camerún","fr":"Cameroun"},{"code":"CA","it":"Canada","en":"Canada","es":"Canadá","fr":"Canada"},{"code":"CV","it":"Capo Verde","en":"Cape Verde","es":"Cabo Verde","fr":"Cap-Vert"},{"code":"BQ","it":"Caraibi Olandesi","en":"Caribbean Netherlands","es":"Caribe neerlandés","fr":"Pays-Bas caribéens"},{"code":"CZ","it":"Cechia","en":"Czechia","es":"Chequia","fr":"Tchéquie"},{"code":"TD","it":"Ciad","en":"Chad","es":"Chad","fr":"Tchad"},{"code":"CL","it":"Cile","en":"Chile","es":"Chile","fr":"Chili"},{"code":"CN","it":"Cina","en":"China","es":"China","fr":"Chine"},{"code":"CY","it":"Cipro","en":"Cyprus","es":"Chipre","fr":"Chypre"},{"code":"VA","it":"Città del Vaticano","en":"Vatican City","es":"Ciudad del Vaticano","fr":"État de la Cité du Vatican"},{"code":"CO","it":"Colombia","en":"Colombia","es":"Colombia","fr":"Colombie"},{"code":"KM","it":"Comore","en":"Comoros","es":"Comoras","fr":"Comores"},{"code":"CD","it":"Congo - Kinshasa","en":"Congo - Kinshasa","es":"República Democrática del Congo","fr":"Congo-Kinshasa"},{"code":"CG","it":"Congo-Brazzaville","en":"Congo - Brazzaville","es":"Congo","fr":"Congo-Brazzaville"},{"code":"KP","it":"Corea del Nord","en":"North Korea","es":"Corea del Norte","fr":"Corée du Nord"},{"code":"KR","it":"Corea del Sud","en":"South Korea","es":"Corea del Sur","fr":"Corée du Sud"},{"code":"CR","it":"Costa Rica","en":"Costa Rica","es":"Costa Rica","fr":"Costa Rica"},{"code":"CI","it":"Costa d’Avorio","en":"Côte d’Ivoire","es":"Côte d’Ivoire","fr":"Côte d’Ivoire"},{"code":"HR","it":"Croazia","en":"Croatia","es":"Croacia","fr":"Croatie"},{"code":"CU","it":"Cuba","en":"Cuba","es":"Cuba","fr":"Cuba"},{"code":"CW","it":"Curaçao","en":"Curaçao","es":"Curazao","fr":"Curaçao"},{"code":"DK","it":"Danimarca","en":"Denmark","es":"Dinamarca","fr":"Danemark"},{"code":"DM","it":"Dominica","en":"Dominica","es":"Dominica","fr":"Dominique"},{"code":"EC","it":"Ecuador","en":"Ecuador","es":"Ecuador","fr":"Équateur"},{"code":"EG","it":"Egitto","en":"Egypt","es":"Egipto","fr":"Égypte"},{"code":"SV","it":"El Salvador","en":"El Salvador","es":"El Salvador","fr":"Salvador"},{"code":"AE","it":"Emirati Arabi Uniti","en":"United Arab Emirates","es":"Emiratos Árabes Unidos","fr":"Émirats arabes unis"},{"code":"ER","it":"Eritrea","en":"Eritrea","es":"Eritrea","fr":"Érythrée"},{"code":"EE","it":"Estonia","en":"Estonia","es":"Estonia","fr":"Estonie"},{"code":"SZ","it":"Eswatini","en":"Eswatini","es":"Esuatini","fr":"Eswatini"},{"code":"ET","it":"Etiopia","en":"Ethiopia","es":"Etiopía","fr":"Éthiopie"},{"code":"FJ","it":"Figi","en":"Fiji","es":"Fiyi","fr":"Fidji"},{"code":"PH","it":"Filippine","en":"Philippines","es":"Filipinas","fr":"Philippines"},{"code":"FI","it":"Finlandia","en":"Finland","es":"Finlandia","fr":"Finlande"},{"code":"FR","it":"Francia","en":"France","es":"Francia","fr":"France"},{"code":"GA","it":"Gabon","en":"Gabon","es":"Gabón","fr":"Gabon"},{"code":"GM","it":"Gambia","en":"Gambia","es":"Gambia","fr":"Gambie"},{"code":"GE","it":"Georgia","en":"Georgia","es":"Georgia","fr":"Géorgie"},{"code":"GS","it":"Georgia del Sud e Sandwich Australi","en":"South Georgia & South Sandwich Islands","es":"Islas Georgia del Sur y Sandwich del Sur","fr":"Géorgie du Sud-et-les Îles Sandwich du Sud"},{"code":"DE","it":"Germania","en":"Germany","es":"Alemania","fr":"Allemagne"},{"code":"GH","it":"Ghana","en":"Ghana","es":"Ghana","fr":"Ghana"},{"code":"JM","it":"Giamaica","en":"Jamaica","es":"Jamaica","fr":"Jamaïque"},{"code":"JP","it":"Giappone","en":"Japan","es":"Japón","fr":"Japon"},{"code":"GI","it":"Gibilterra","en":"Gibraltar","es":"Gibraltar","fr":"Gibraltar"},{"code":"DJ","it":"Gibuti","en":"Djibouti","es":"Yibuti","fr":"Djibouti"},{"code":"JO","it":"Giordania","en":"Jordan","es":"Jordania","fr":"Jordanie"},{"code":"GR","it":"Grecia","en":"Greece","es":"Grecia","fr":"Grèce"},{"code":"GD","it":"Grenada","en":"Grenada","es":"Granada","fr":"Grenade"},{"code":"GL","it":"Groenlandia","en":"Greenland","es":"Groenlandia","fr":"Groenland"},{"code":"GP","it":"Guadalupa","en":"Guadeloupe","es":"Guadalupe","fr":"Guadeloupe"},{"code":"GU","it":"Guam","en":"Guam","es":"Guam","fr":"Guam"},{"code":"GT","it":"Guatemala","en":"Guatemala","es":"Guatemala","fr":"Guatemala"},{"code":"GG","it":"Guernsey","en":"Guernsey","es":"Guernesey","fr":"Guernesey"},{"code":"GN","it":"Guinea","en":"Guinea","es":"Guinea","fr":"Guinée"},{"code":"GQ","it":"Guinea Equatoriale","en":"Equatorial Guinea","es":"Guinea Ecuatorial","fr":"Guinée équatoriale"},{"code":"GW","it":"Guinea-Bissau","en":"Guinea-Bissau","es":"Guinea-Bisáu","fr":"Guinée-Bissau"},{"code":"GY","it":"Guyana","en":"Guyana","es":"Guyana","fr":"Guyana"},{"code":"GF","it":"Guyana Francese","en":"French Guiana","es":"Guayana Francesa","fr":"Guyane française"},{"code":"HT","it":"Haiti","en":"Haiti","es":"Haití","fr":"Haïti"},{"code":"HN","it":"Honduras","en":"Honduras","es":"Honduras","fr":"Honduras"},{"code":"IN","it":"India","en":"India","es":"India","fr":"Inde"},{"code":"ID","it":"Indonesia","en":"Indonesia","es":"Indonesia","fr":"Indonésie"},{"code":"IR","it":"Iran","en":"Iran","es":"Irán","fr":"Iran"},{"code":"IQ","it":"Iraq","en":"Iraq","es":"Irak","fr":"Irak"},{"code":"IE","it":"Irlanda","en":"Ireland","es":"Irlanda","fr":"Irlande"},{"code":"IS","it":"Islanda","en":"Iceland","es":"Islandia","fr":"Islande"},{"code":"BV","it":"Isola Bouvet","en":"Bouvet Island","es":"Isla Bouvet","fr":"Île Bouvet"},{"code":"CX","it":"Isola Christmas","en":"Christmas Island","es":"Isla de Navidad","fr":"Île Christmas"},{"code":"NF","it":"Isola Norfolk","en":"Norfolk Island","es":"Isla Norfolk","fr":"Île Norfolk"},{"code":"IM","it":"Isola di Man","en":"Isle of Man","es":"Isla de Man","fr":"Île de Man"},{"code":"KY","it":"Isole Cayman","en":"Cayman Islands","es":"Islas Caimán","fr":"Îles Caïmans"},{"code":"CC","it":"Isole Cocos (Keeling)","en":"Cocos (Keeling) Islands","es":"Islas Cocos","fr":"Îles Cocos"},{"code":"CK","it":"Isole Cook","en":"Cook Islands","es":"Islas Cook","fr":"Îles Cook"},{"code":"FK","it":"Isole Falkland","en":"Falkland Islands","es":"Islas Malvinas","fr":"Îles Malouines"},{"code":"FO","it":"Isole Fær Øer","en":"Faroe Islands","es":"Islas Feroe","fr":"Îles Féroé"},{"code":"HM","it":"Isole Heard e McDonald","en":"Heard & McDonald Islands","es":"Islas Heard y McDonald","fr":"Îles Heard-et-MacDonald"},{"code":"MP","it":"Isole Marianne Settentrionali","en":"Northern Mariana Islands","es":"Islas Marianas del Norte","fr":"Îles Mariannes du Nord"},{"code":"MH","it":"Isole Marshall","en":"Marshall Islands","es":"Islas Marshall","fr":"Îles Marshall"},{"code":"UM","it":"Isole Minori Esterne degli Stati Uniti","en":"U.S. Outlying Islands","es":"Islas menores alejadas de EE. UU.","fr":"Îles mineures éloignées des États-Unis"},{"code":"PN","it":"Isole Pitcairn","en":"Pitcairn Islands","es":"Islas Pitcairn","fr":"Îles Pitcairn"},{"code":"SB","it":"Isole Salomone","en":"Solomon Islands","es":"Islas Salomón","fr":"Îles Salomon"},{"code":"TC","it":"Isole Turks e Caicos","en":"Turks & Caicos Islands","es":"Islas Turcas y Caicos","fr":"Îles Turques-et-Caïques"},{"code":"VI","it":"Isole Vergini Americane","en":"U.S. Virgin Islands","es":"Islas Vírgenes de EE. UU.","fr":"Îles Vierges des États-Unis"},{"code":"VG","it":"Isole Vergini Britanniche","en":"British Virgin Islands","es":"Islas Vírgenes Británicas","fr":"Îles Vierges britanniques"},{"code":"AX","it":"Isole Åland","en":"Åland Islands","es":"Islas Aland","fr":"Îles Åland"},{"code":"IL","it":"Israele","en":"Israel","es":"Israel","fr":"Israël"},{"code":"IT","it":"Italia","en":"Italy","es":"Italia","fr":"Italie"},{"code":"JE","it":"Jersey","en":"Jersey","es":"Jersey","fr":"Jersey"},{"code":"KZ","it":"Kazakistan","en":"Kazakhstan","es":"Kazajistán","fr":"Kazakhstan"},{"code":"KE","it":"Kenya","en":"Kenya","es":"Kenia","fr":"Kenya"},{"code":"KG","it":"Kirghizistan","en":"Kyrgyzstan","es":"Kirguistán","fr":"Kirghizstan"},{"code":"KI","it":"Kiribati","en":"Kiribati","es":"Kiribati","fr":"Kiribati"},{"code":"KW","it":"Kuwait","en":"Kuwait","es":"Kuwait","fr":"Koweït"},{"code":"LA","it":"Laos","en":"Laos","es":"Laos","fr":"Laos"},{"code":"LS","it":"Lesotho","en":"Lesotho","es":"Lesoto","fr":"Lesotho"},{"code":"LV","it":"Lettonia","en":"Latvia","es":"Letonia","fr":"Lettonie"},{"code":"LB","it":"Libano","en":"Lebanon","es":"Líbano","fr":"Liban"},{"code":"LR","it":"Liberia","en":"Liberia","es":"Liberia","fr":"Liberia"},{"code":"LY","it":"Libia","en":"Libya","es":"Libia","fr":"Libye"},{"code":"LI","it":"Liechtenstein","en":"Liechtenstein","es":"Liechtenstein","fr":"Liechtenstein"},{"code":"LT","it":"Lituania","en":"Lithuania","es":"Lituania","fr":"Lituanie"},{"code":"LU","it":"Lussemburgo","en":"Luxembourg","es":"Luxemburgo","fr":"Luxembourg"},{"code":"MK","it":"Macedonia del Nord","en":"North Macedonia","es":"Macedonia del Norte","fr":"Macédoine du Nord"},{"code":"MG","it":"Madagascar","en":"Madagascar","es":"Madagascar","fr":"Madagascar"},{"code":"MW","it":"Malawi","en":"Malawi","es":"Malaui","fr":"Malawi"},{"code":"MY","it":"Malaysia","en":"Malaysia","es":"Malasia","fr":"Malaisie"},{"code":"MV","it":"Maldive","en":"Maldives","es":"Maldivas","fr":"Maldives"},{"code":"ML","it":"Mali","en":"Mali","es":"Mali","fr":"Mali"},{"code":"MT","it":"Malta","en":"Malta","es":"Malta","fr":"Malte"},{"code":"MA","it":"Marocco","en":"Morocco","es":"Marruecos","fr":"Maroc"},{"code":"MQ","it":"Martinica","en":"Martinique","es":"Martinica","fr":"Martinique"},{"code":"MR","it":"Mauritania","en":"Mauritania","es":"Mauritania","fr":"Mauritanie"},{"code":"MU","it":"Mauritius","en":"Mauritius","es":"Mauricio","fr":"Maurice"},{"code":"YT","it":"Mayotte","en":"Mayotte","es":"Mayotte","fr":"Mayotte"},{"code":"MX","it":"Messico","en":"Mexico","es":"México","fr":"Mexique"},{"code":"FM","it":"Micronesia","en":"Micronesia","es":"Micronesia","fr":"Micronésie"},{"code":"MD","it":"Moldavia","en":"Moldova","es":"Moldavia","fr":"Moldavie"},{"code":"MC","it":"Monaco","en":"Monaco","es":"Mónaco","fr":"Monaco"},{"code":"MN","it":"Mongolia","en":"Mongolia","es":"Mongolia","fr":"Mongolie"},{"code":"ME","it":"Montenegro","en":"Montenegro","es":"Montenegro","fr":"Monténégro"},{"code":"MS","it":"Montserrat","en":"Montserrat","es":"Montserrat","fr":"Montserrat"},{"code":"MZ","it":"Mozambico","en":"Mozambique","es":"Mozambique","fr":"Mozambique"},{"code":"MM","it":"Myanmar (Birmania)","en":"Myanmar (Burma)","es":"Myanmar (Birmania)","fr":"Myanmar (Birmanie)"},{"code":"NA","it":"Namibia","en":"Namibia","es":"Namibia","fr":"Namibie"},{"code":"NR","it":"Nauru","en":"Nauru","es":"Nauru","fr":"Nauru"},{"code":"NP","it":"Nepal","en":"Nepal","es":"Nepal","fr":"Népal"},{"code":"NI","it":"Nicaragua","en":"Nicaragua","es":"Nicaragua","fr":"Nicaragua"},{"code":"NE","it":"Niger","en":"Niger","es":"Níger","fr":"Niger"},{"code":"NG","it":"Nigeria","en":"Nigeria","es":"Nigeria","fr":"Nigeria"},{"code":"NU","it":"Niue","en":"Niue","es":"Niue","fr":"Niue"},{"code":"NO","it":"Norvegia","en":"Norway","es":"Noruega","fr":"Norvège"},{"code":"NC","it":"Nuova Caledonia","en":"New Caledonia","es":"Nueva Caledonia","fr":"Nouvelle-Calédonie"},{"code":"NZ","it":"Nuova Zelanda","en":"New Zealand","es":"Nueva Zelanda","fr":"Nouvelle-Zélande"},{"code":"OM","it":"Oman","en":"Oman","es":"Omán","fr":"Oman"},{"code":"NL","it":"Paesi Bassi","en":"Netherlands","es":"Países Bajos","fr":"Pays-Bas"},{"code":"PK","it":"Pakistan","en":"Pakistan","es":"Pakistán","fr":"Pakistan"},{"code":"PW","it":"Palau","en":"Palau","es":"Palaos","fr":"Palaos"},{"code":"PA","it":"Panama","en":"Panama","es":"Panamá","fr":"Panama"},{"code":"PG","it":"Papua Nuova Guinea","en":"Papua New Guinea","es":"Papúa Nueva Guinea","fr":"Papouasie-Nouvelle-Guinée"},{"code":"PY","it":"Paraguay","en":"Paraguay","es":"Paraguay","fr":"Paraguay"},{"code":"PE","it":"Perù","en":"Peru","es":"Perú","fr":"Pérou"},{"code":"PF","it":"Polinesia Francese","en":"French Polynesia","es":"Polinesia Francesa","fr":"Polynésie française"},{"code":"PL","it":"Polonia","en":"Poland","es":"Polonia","fr":"Pologne"},{"code":"PT","it":"Portogallo","en":"Portugal","es":"Portugal","fr":"Portugal"},{"code":"PR","it":"Portorico","en":"Puerto Rico","es":"Puerto Rico","fr":"Porto Rico"},{"code":"QA","it":"Qatar","en":"Qatar","es":"Catar","fr":"Qatar"},{"code":"HK","it":"RAS di Hong Kong","en":"Hong Kong SAR China","es":"RAE de Hong Kong (China)","fr":"R.A.S. chinoise de Hong Kong"},{"code":"MO","it":"RAS di Macao","en":"Macao SAR China","es":"RAE de Macao (China)","fr":"R.A.S. chinoise de Macao"},{"code":"GB","it":"Regno Unito","en":"United Kingdom","es":"Reino Unido","fr":"Royaume-Uni"},{"code":"CF","it":"Repubblica Centrafricana","en":"Central African Republic","es":"República Centroafricana","fr":"République centrafricaine"},{"code":"DO","it":"Repubblica Dominicana","en":"Dominican Republic","es":"República Dominicana","fr":"République dominicaine"},{"code":"RE","it":"Riunione","en":"Réunion","es":"Reunión","fr":"La Réunion"},{"code":"RO","it":"Romania","en":"Romania","es":"Rumanía","fr":"Roumanie"},{"code":"RW","it":"Ruanda","en":"Rwanda","es":"Ruanda","fr":"Rwanda"},{"code":"RU","it":"Russia","en":"Russia","es":"Rusia","fr":"Russie"},{"code":"EH","it":"Sahara Occidentale","en":"Western Sahara","es":"Sáhara Occidental","fr":"Sahara occidental"},{"code":"KN","it":"Saint Kitts e Nevis","en":"St. Kitts & Nevis","es":"San Cristóbal y Nieves","fr":"Saint-Christophe-et-Niévès"},{"code":"LC","it":"Saint Lucia","en":"St. Lucia","es":"Santa Lucía","fr":"Sainte-Lucie"},{"code":"MF","it":"Saint Martin","en":"St. Martin","es":"San Martín","fr":"Saint-Martin"},{"code":"VC","it":"Saint Vincent e Grenadine","en":"St. Vincent & Grenadines","es":"San Vicente y las Granadinas","fr":"Saint-Vincent-et-les Grenadines"},{"code":"BL","it":"Saint-Barthélemy","en":"St. Barthélemy","es":"San Bartolomé","fr":"Saint-Barthélemy"},{"code":"PM","it":"Saint-Pierre e Miquelon","en":"St. Pierre & Miquelon","es":"San Pedro y Miquelón","fr":"Saint-Pierre-et-Miquelon"},{"code":"WS","it":"Samoa","en":"Samoa","es":"Samoa","fr":"Samoa"},{"code":"AS","it":"Samoa Americane","en":"American Samoa","es":"Samoa Americana","fr":"Samoa américaines"},{"code":"SM","it":"San Marino","en":"San Marino","es":"San Marino","fr":"Saint-Marin"},{"code":"SH","it":"Sant’Elena","en":"St. Helena","es":"Santa Elena","fr":"Sainte-Hélène"},{"code":"SN","it":"Senegal","en":"Senegal","es":"Senegal","fr":"Sénégal"},{"code":"RS","it":"Serbia","en":"Serbia","es":"Serbia","fr":"Serbie"},{"code":"SC","it":"Seychelles","en":"Seychelles","es":"Seychelles","fr":"Seychelles"},{"code":"SL","it":"Sierra Leone","en":"Sierra Leone","es":"Sierra Leona","fr":"Sierra Leone"},{"code":"SG","it":"Singapore","en":"Singapore","es":"Singapur","fr":"Singapour"},{"code":"SX","it":"Sint Maarten","en":"Sint Maarten","es":"Sint Maarten","fr":"Saint-Martin (partie néerlandaise)"},{"code":"SY","it":"Siria","en":"Syria","es":"Siria","fr":"Syrie"},{"code":"SK","it":"Slovacchia","en":"Slovakia","es":"Eslovaquia","fr":"Slovaquie"},{"code":"SI","it":"Slovenia","en":"Slovenia","es":"Eslovenia","fr":"Slovénie"},{"code":"SO","it":"Somalia","en":"Somalia","es":"Somalia","fr":"Somalie"},{"code":"ES","it":"Spagna","en":"Spain","es":"España","fr":"Espagne"},{"code":"LK","it":"Sri Lanka","en":"Sri Lanka","es":"Sri Lanka","fr":"Sri Lanka"},{"code":"US","it":"Stati Uniti","en":"United States","es":"Estados Unidos","fr":"États-Unis"},{"code":"SS","it":"Sud Sudan","en":"South Sudan","es":"Sudán del Sur","fr":"Soudan du Sud"},{"code":"ZA","it":"Sudafrica","en":"South Africa","es":"Sudáfrica","fr":"Afrique du Sud"},{"code":"SD","it":"Sudan","en":"Sudan","es":"Sudán","fr":"Soudan"},{"code":"SR","it":"Suriname","en":"Suriname","es":"Surinam","fr":"Suriname"},{"code":"SJ","it":"Svalbard e Jan Mayen","en":"Svalbard & Jan Mayen","es":"Svalbard y Jan Mayen","fr":"Svalbard et Jan Mayen"},{"code":"SE","it":"Svezia","en":"Sweden","es":"Suecia","fr":"Suède"},{"code":"CH","it":"Svizzera","en":"Switzerland","es":"Suiza","fr":"Suisse"},{"code":"ST","it":"São Tomé e Príncipe","en":"São Tomé & Príncipe","es":"Santo Tomé y Príncipe","fr":"Sao Tomé-et-Principe"},{"code":"TJ","it":"Tagikistan","en":"Tajikistan","es":"Tayikistán","fr":"Tadjikistan"},{"code":"TW","it":"Taiwan","en":"Taiwan","es":"Taiwán","fr":"Taïwan"},{"code":"TZ","it":"Tanzania","en":"Tanzania","es":"Tanzania","fr":"Tanzanie"},{"code":"TF","it":"Terre Australi Francesi","en":"French Southern Territories","es":"Territorios Australes Franceses","fr":"Terres australes françaises"},{"code":"PS","it":"Territori Palestinesi","en":"Palestinian Territories","es":"Territorios Palestinos","fr":"Territoires palestiniens"},{"code":"IO","it":"Territorio Britannico dell’Oceano Indiano","en":"British Indian Ocean Territory","es":"Territorio Británico del Océano Índico","fr":"Territoire britannique de l’océan Indien"},{"code":"TH","it":"Thailandia","en":"Thailand","es":"Tailandia","fr":"Thaïlande"},{"code":"TL","it":"Timor Est","en":"Timor-Leste","es":"Timor-Leste","fr":"Timor oriental"},{"code":"TG","it":"Togo","en":"Togo","es":"Togo","fr":"Togo"},{"code":"TK","it":"Tokelau","en":"Tokelau","es":"Tokelau","fr":"Tokelau"},{"code":"TO","it":"Tonga","en":"Tonga","es":"Tonga","fr":"Tonga"},{"code":"TT","it":"Trinidad e Tobago","en":"Trinidad & Tobago","es":"Trinidad y Tobago","fr":"Trinité-et-Tobago"},{"code":"TN","it":"Tunisia","en":"Tunisia","es":"Túnez","fr":"Tunisie"},{"code":"TR","it":"Turchia","en":"Türkiye","es":"Turquía","fr":"Turquie"},{"code":"TM","it":"Turkmenistan","en":"Turkmenistan","es":"Turkmenistán","fr":"Turkménistan"},{"code":"TV","it":"Tuvalu","en":"Tuvalu","es":"Tuvalu","fr":"Tuvalu"},{"code":"UA","it":"Ucraina","en":"Ukraine","es":"Ucrania","fr":"Ukraine"},{"code":"UG","it":"Uganda","en":"Uganda","es":"Uganda","fr":"Ouganda"},{"code":"HU","it":"Ungheria","en":"Hungary","es":"Hungría","fr":"Hongrie"},{"code":"UY","it":"Uruguay","en":"Uruguay","es":"Uruguay","fr":"Uruguay"},{"code":"UZ","it":"Uzbekistan","en":"Uzbekistan","es":"Uzbekistán","fr":"Ouzbékistan"},{"code":"VU","it":"Vanuatu","en":"Vanuatu","es":"Vanuatu","fr":"Vanuatu"},{"code":"VE","it":"Venezuela","en":"Venezuela","es":"Venezuela","fr":"Venezuela"},{"code":"VN","it":"Vietnam","en":"Vietnam","es":"Vietnam","fr":"Viêt Nam"},{"code":"WF","it":"Wallis e Futuna","en":"Wallis & Futuna","es":"Wallis y Futuna","fr":"Wallis-et-Futuna"},{"code":"YE","it":"Yemen","en":"Yemen","es":"Yemen","fr":"Yémen"},{"code":"ZM","it":"Zambia","en":"Zambia","es":"Zambia","fr":"Zambie"},{"code":"ZW","it":"Zimbabwe","en":"Zimbabwe","es":"Zimbabue","fr":"Zimbabwe"}];
function getProfileCountryNames(lang){
  var supported={it:"it",en:"en",es:"es",fr:"fr",de:"de",pt:"pt",pl:"pl",nl:"nl",ro:"ro",el:"el"};
  var key=supported[lang]?lang:"it";
  var display=null;
  try{
    if(typeof Intl!=="undefined"&&Intl.DisplayNames)display=new Intl.DisplayNames([key],{type:"region"});
  }catch(e){display=null;}
  return PROFILE_COUNTRY_OPTIONS.map(function(c){
    try{if(display){var n=display.of(c.code);if(n)return n;}}catch(e){}
    var fallbackKey=key==="en"?"en":key==="es"?"es":key==="fr"?"fr":"it";
    return c[fallbackKey]||c.it;
  }).filter(Boolean).sort(function(a,b){return String(a).localeCompare(String(b),key,{sensitivity:"base"});});
}

function localizeProfileCountryName(value, lang){
  var raw=String(value||"").trim();
  if(!raw)return raw;
  var code=null;
  try{
    var low=raw.toLowerCase();
    var item=PROFILE_COUNTRY_OPTIONS.find(function(c){
      return [c.it,c.en,c.es,c.fr,c.code].filter(Boolean).some(function(n){return String(n).toLowerCase()===low;});
    });
    if(item)code=item.code;
    if(code&&typeof Intl!=="undefined"&&Intl.DisplayNames){
      var display=new Intl.DisplayNames([lang||"it"],{type:"region"});
      var n=display.of(code);
      if(n)return n;
    }
  }catch(e){}
  return raw;
}

function ProfilePlacePromptField({label,value,onChange,placeholder,types,countryRestriction,fallback,subC,dark,borderC,textC,sinp}){
  var [suggestions,setSuggestions]=useState([]);
  var [focused,setFocused]=useState(false);
  function askGoogle(q){
    try{
      var g=(window as any).google;
      if(!g||!g.maps||!g.maps.places||!g.maps.places.AutocompleteService)return false;
      if(!q||String(q).trim().length<2){setSuggestions([]);return true;}
      var service=new g.maps.places.AutocompleteService();
      var opts={input:String(q),types:types||['(regions)']};
      if(countryRestriction)opts.componentRestrictions={country:countryRestriction};
      service.getPlacePredictions(opts,function(preds,status){
        var ok=g.maps.places.PlacesServiceStatus&&status===g.maps.places.PlacesServiceStatus.OK;
        setSuggestions(ok&&preds?preds.map(function(x){return x.description;}).slice(0,8):[]);
      });
      return true;
    }catch(e){return false;}
  }
  function handle(v){onChange(v);if(!askGoogle(v)){var low=String(v||'').toLowerCase();setSuggestions((fallback||[]).filter(function(x){return String(x).toLowerCase().indexOf(low)>=0;}).slice(0,8));}}
  return <div style={{position:'relative'}}><label style={{fontSize:11,color:subC,display:'block',marginBottom:3}}>{label}</label><input value={value} onFocus={function(){setFocused(true);handle(value);}} onBlur={function(){setTimeout(function(){setFocused(false);},150);}} onChange={function(e){handle(e.target.value);}} style={sinp} placeholder={placeholder}/>{focused&&suggestions.length>0&&<div style={{position:'absolute',zIndex:40,left:0,right:0,top:58,background:dark?'#252535':'#fff',border:'1px solid '+borderC,borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.16)',maxHeight:190,overflowY:'auto'}}>{suggestions.map(function(x){return <button key={x} onMouseDown={function(e){e.preventDefault();onChange(x);setSuggestions([]);setFocused(false);}} style={{display:'block',width:'100%',textAlign:'left',background:'transparent',border:'none',padding:'9px 11px',fontSize:12,color:textC,cursor:'pointer'}}>{x}</button>;})}</div>}</div>;
}

function ProfileLocalPromptField({label,value,onChange,placeholder,options,subC,dark,borderC,textC,sinp}){
  var [open,setOpen]=useState(false);
  var [query,setQuery]=useState("");
  var list=useMemo(function(){
    var q=String(query||"").trim().toLowerCase();
    var base=(options||[]).slice();
    if(q)base=base.filter(function(x){return String(x).toLowerCase().indexOf(q)>=0;});
    return base.slice(0,260);
  },[query,options]);
  function choose(x){onChange(x);setQuery("");setOpen(false);}
  return <div>
    <label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{label}</label>
    <button type="button" onClick={function(){setOpen(true);setQuery("");}} style={{...sinp,width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,textAlign:"left",cursor:"pointer",background:dark?"#2a2a3e":"#fff"}}>
      <span style={{color:value?textC:subC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value?localizeProfileCountryName(value,readFainanceStoredLang()):placeholder}</span>
      <span style={{fontSize:14,color:subC,flexShrink:0}}>⌄</span>
    </button>
    <div style={{fontSize:10,color:subC,marginTop:4}}>{PL("Tocca il campo e digita le prime lettere.")}</div>
    {open&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.48)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={function(e){if(e.target===e.currentTarget)setOpen(false);}}>
      <div style={{background:dark?"#1e1e30":"#fff",borderRadius:18,width:"100%",maxWidth:460,maxHeight:"80vh",overflow:"hidden",boxShadow:"0 12px 44px rgba(0,0,0,.28)",border:"1px solid "+borderC}}>
        <div style={{padding:"16px 16px 12px",borderBottom:"1px solid "+borderC,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,fontSize:15,fontWeight:800,color:textC}}>{label}</div>
          <button type="button" onClick={function(){setOpen(false);}} style={{background:dark?"#333":"#f0f0f0",border:"none",borderRadius:10,color:textC,fontSize:16,padding:"6px 10px",cursor:"pointer"}}>×</button>
        </div>
        <div style={{padding:14,borderBottom:"1px solid "+borderC}}>
          <input autoFocus value={query} onChange={function(e){setQuery(e.target.value);}} placeholder={placeholder} style={{...sinp,width:"100%",fontSize:15,padding:"11px 12px"}}/>
          <div style={{fontSize:11,color:subC,marginTop:6}}>{PL("Lista completa delle nazioni. Puoi cercare digitando le prime lettere.")}</div>
        </div>
        <div style={{maxHeight:"52vh",overflowY:"auto",padding:"6px 8px 10px"}}>
          {list.length>0?list.map(function(x){return <button key={x} type="button" onClick={function(){choose(x);}} style={{display:"block",width:"100%",textAlign:"left",background:value===x?(dark?"#343050":"#EEEDFE"):"transparent",border:"none",borderRadius:10,padding:"11px 12px",fontSize:14,color:value===x?"#7F77DD":textC,cursor:"pointer",fontWeight:value===x?700:500}}>{x}</button>;}):<div style={{padding:18,textAlign:"center",fontSize:13,color:subC}}>{PL("Nessun risultato")}</div>}
        </div>
      </div>
    </div>}
  </div>;
}
// ── PROFILE CARD ─────────────────────────────────────────────────────────────
function ProfileCard({currentUser,onLogout,dark,textC,subC,borderC,cardBg,btnRadius,dateFmt,setToast,fbDb:fbDbProp,onProfileUpdate,onDeleteAccount}){
  var [edit,setEdit]=useState(false);
  var [deleteOpen,setDeleteOpen]=useState(false);
  var [deleteConfirm,setDeleteConfirm]=useState("");
  var [deleteLoading,setDeleteLoading]=useState(false);
  var [deleteError,setDeleteError]=useState("");
  var [emailOpen,setEmailOpen]=useState(false);
  var [newEmail,setNewEmail]=useState(String(currentUser.email||""));
  var [emailLoading,setEmailLoading]=useState(false);
  var [emailError,setEmailError]=useState("");
  var [emailOk,setEmailOk]=useState(false);
  var [pName,setPName]=useState(currentUser.name||"");
  var [pPhone,setPPhone]=useState(currentUser.phone||"");
  var [pPhonePrefix,setPPhonePrefix]=useState(currentUser.phonePrefix||"+39");
  var [pBirth,setPBirth]=useState(currentUser.birthDate||"");
  var [pGender,setPGender]=useState(currentUser.gender||"");
  var [pNationality,setPNationality]=useState(currentUser.nationality||"");
  var [pCountry,setPCountry]=useState(currentUser.country||"");
  var [pProvince,setPProvince]=useState(currentUser.province||"");
  var [pCity,setPCity]=useState(currentUser.city||"");
  var [pAddress,setPAddress]=useState(currentUser.address||"");
  var [pJobType,setPJobType]=useState(currentUser.jobType||"");
  var [pAppUseReason,setPAppUseReason]=useState(currentUser.appUseReason||"");
  var PHONE_PREFIXES=[{code:"+39",country:"Italia"},{code:"+34",country:"España"},{code:"+33",country:"France"},{code:"+49",country:"Deutschland"},{code:"+44",country:"United Kingdom"},{code:"+1",country:"United States / Canada"},{code:"+351",country:"Portugal"},{code:"+48",country:"Polska"},{code:"+31",country:"Nederland"},{code:"+40",country:"România"},{code:"+30",country:"Ελλάδα"}];
  var JOB_TYPES=["Dipendente","Manager","Consulente","Libero professionista","Imprenditore","Commerciante","Artigiano","Insegnante / Formazione","Sanità","Tecnologia / IT","Finanza / Amministrazione","Marketing / Comunicazione","Vendite","Studente","Pensionato","Non occupato","Altro"];
  var APP_USE_REASONS=["Controllare le spese quotidiane","Risparmiare di più ogni mese","Gestire budget e limiti","Monitorare entrate e uscite","Gestire patrimonio e conti","Preparare obiettivi personali","Controllare spese condivise","Capire dove finiscono i soldi","Ricevere consigli dall’AI","Tenere tutto in un’unica app","Altro"];
  var countryNames=getProfileCountryNames(profileLang());
  // Local saved values for display (updated on save)
  var [saved,setSaved]=useState({name:currentUser.name||"",phone:currentUser.phone||"",phonePrefix:currentUser.phonePrefix||"+39",birthDate:currentUser.birthDate||"",gender:currentUser.gender||"",nationality:currentUser.nationality||"",country:currentUser.country||"",province:currentUser.province||"",city:currentUser.city||"",address:currentUser.address||"",jobType:currentUser.jobType||"",appUseReason:currentUser.appUseReason||""});
  useEffect(function(){var next={name:currentUser.name||"",phone:currentUser.phone||"",phonePrefix:currentUser.phonePrefix||"+39",birthDate:currentUser.birthDate||"",gender:currentUser.gender||"",nationality:currentUser.nationality||"",country:currentUser.country||"",province:currentUser.province||"",city:currentUser.city||"",address:currentUser.address||"",jobType:currentUser.jobType||"",appUseReason:currentUser.appUseReason||""};setSaved(next);setPName(next.name);setPPhone(next.phone);setPPhonePrefix(next.phonePrefix);setPBirth(next.birthDate);setPGender(next.gender);setPNationality(next.nationality);setPCountry(next.country);setPProvince(next.province);setPCity(next.city);setPAddress(next.address);setPJobType(next.jobType);setPAppUseReason(next.appUseReason);},[currentUser&&currentUser.id,currentUser&&currentUser.phone,currentUser&&currentUser.phonePrefix,currentUser&&currentUser.name,currentUser&&currentUser.birthDate,currentUser&&currentUser.gender,currentUser&&currentUser.nationality,currentUser&&currentUser.country,currentUser&&currentUser.province,currentUser&&currentUser.city,currentUser&&currentUser.address,currentUser&&currentUser.jobType,currentUser&&currentUser.appUseReason]);
  var sinp={width:"100%",borderRadius:8,border:"1px solid "+borderC,padding:"8px 10px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:textC};
  function profileLang(){return readFainanceStoredLang();}
  function PL(s){return translateFainanceText(s,profileLang());}
  function authActionSettings(){
    var origin="https://fainanceapp.it";
    try{if(typeof window!=="undefined"&&window.location&&window.location.origin)origin=window.location.origin;}catch(e){}
    return {url:origin,handleCodeInApp:false};
  }
  function LegacyPlacePromptField({label,value,onChange,placeholder,types,countryRestriction,fallback}){
    var [suggestions,setSuggestions]=useState([]);
    var [focused,setFocused]=useState(false);
    function askGoogle(q){
      try{
        var g=(window as any).google;
        if(!g||!g.maps||!g.maps.places||!g.maps.places.AutocompleteService)return false;
        if(!q||String(q).trim().length<2){setSuggestions([]);return true;}
        var service=new g.maps.places.AutocompleteService();
        var opts={input:String(q),types:types||['(regions)']};
        if(countryRestriction)opts.componentRestrictions={country:countryRestriction};
        service.getPlacePredictions(opts,function(preds,status){
          var ok=g.maps.places.PlacesServiceStatus&&status===g.maps.places.PlacesServiceStatus.OK;
          setSuggestions(ok&&preds?preds.map(function(x){return x.description;}).slice(0,8):[]);
        });
        return true;
      }catch(e){return false;}
    }
    function handle(v){onChange(v);if(!askGoogle(v)){var low=String(v||'').toLowerCase();setSuggestions((fallback||[]).filter(function(x){return String(x).toLowerCase().indexOf(low)>=0;}).slice(0,8));}}
    return <div style={{position:'relative'}}><label style={{fontSize:11,color:subC,display:'block',marginBottom:3}}>{label}</label><input value={value} onFocus={function(){setFocused(true);handle(value);}} onBlur={function(){setTimeout(function(){setFocused(false);},150);}} onChange={function(e){handle(e.target.value);}} style={sinp} placeholder={placeholder}/>{focused&&suggestions.length>0&&<div style={{position:'absolute',zIndex:40,left:0,right:0,top:58,background:dark?'#252535':'#fff',border:'1px solid '+borderC,borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,.16)',maxHeight:190,overflowY:'auto'}}>{suggestions.map(function(x){return <button key={x} onMouseDown={function(e){e.preventDefault();onChange(x);setSuggestions([]);setFocused(false);}} style={{display:'block',width:'100%',textAlign:'left',background:'transparent',border:'none',padding:'9px 11px',fontSize:12,color:textC,cursor:'pointer'}}>{x}</button>;})}</div>}</div>;
  }
  function save(){
    var cleanPhone=String(pPhone||"").replace(/[^0-9]/g,"");
    if(pPhone&&cleanPhone.length<6){if(setToast)setToast({text:PL("Numero di telefono non valido"),type:"warning",color:"#EF9F27",icon:"⚠️"});return;}
    var upd={name:pName.trim(),phone:cleanPhone,phonePrefix:pPhonePrefix,birthDate:pBirth,gender:pGender,nationality:pNationality.trim(),country:pCountry.trim(),province:pProvince.trim(),city:pCity.trim(),address:pAddress.trim(),jobType:pJobType,appUseReason:pAppUseReason};
    function done(){setSaved(upd);if(onProfileUpdate)onProfileUpdate(upd);setEdit(false);if(setToast)setToast(PL("Profilo aggiornato"));}
    if(currentUser.id&&fbDbProp){
      setDoc(doc(fbDbProp,"users",currentUser.id),upd,{merge:true}).then(done).catch(function(err){console.error("profile save error",(err&&err.code)||"unknown");if(setToast)setToast(PL("Errore salvataggio profilo"));});
    } else {
      done();
    }
  }
  async function saveEmailChange(){
    setEmailError("");setEmailOk(false);
    var cleanEmail=String(newEmail||"").trim().toLowerCase();
    if(!cleanEmail||cleanEmail.indexOf("@")<0){setEmailError(PL("Inserisci una nuova email valida."));return;}
    if(cleanEmail===String(currentUser.email||"").toLowerCase()){setEmailError(PL("La nuova email è uguale a quella attuale."));return;}
    setEmailLoading(true);
    try{
      var user=fbAuth.currentUser;
      if(!user)throw new Error(PL("Utente non trovato. Esci e rientra, poi riprova."));
      const mod=await import("firebase/auth");
      try{fbAuth.languageCode=profileLang();}catch(e){}
      if(mod.verifyBeforeUpdateEmail){
        await mod.verifyBeforeUpdateEmail(user,cleanEmail,authActionSettings());
        setEmailOk(true);
        setEmailOpen(false);
        if(setToast)setToast("Email di verifica inviata");
      }else{
        await mod.updateEmail(user,cleanEmail);
        if(currentUser.id&&fbDbProp){await setDoc(doc(fbDbProp,"users",currentUser.id),{email:cleanEmail,updatedAt:new Date().toISOString()},{merge:true});}
        if(onProfileUpdate)onProfileUpdate({email:cleanEmail});
        setEmailOk(true);
        setEmailOpen(false);
        if(setToast)setToast("Email aggiornata");
      }
    }catch(err){
      var code=err&&err.code?err.code:"";
      if(code==="auth/requires-recent-login")setEmailError(PL("Per sicurezza, esci e rientra prima di cambiare email."));
      else if(code==="auth/email-already-in-use")setEmailError(PL("Questa email è già usata da un altro account."));
      else if(code==="auth/invalid-email")setEmailError(PL("Email non valida."));
      else if(code==="auth/operation-not-allowed")setEmailError(PL("Firebase richiede la verifica della nuova email. Controlla che nel progetto Firebase sia attivo il provider Email/Password e riprova."));
      else setEmailError(PL("Errore cambio email: ")+((err&&err.message)||PL("operazione non riuscita")));
    }finally{
      setEmailLoading(false);
    }
  }

  function requestDeleteAccount(){
    if(!onDeleteAccount||deleteConfirm!=="ELIMINA")return;
    setDeleteLoading(true);setDeleteError("");
    Promise.resolve(onDeleteAccount()).catch(function(err){
      var msg=(err&&err.message)?err.message:"Errore durante l’eliminazione account.";
      setDeleteError(msg);
      if(setToast)setToast("Errore eliminazione account");
    }).finally(function(){setDeleteLoading(false);});
  }
  var d=saved;
  return <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontSize:14,fontWeight:600,color:textC}}>{PL("👤 Profilo")}</div>
      {!edit&&<button onClick={function(){setEdit(true);}} style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",border:"none",borderRadius:btnRadius,padding:"8px 14px",cursor:"pointer",color:"#fff",fontSize:13,fontWeight:800,boxShadow:dark?"none":"0 6px 16px rgba(83,74,183,0.22)",display:"inline-flex",alignItems:"center",gap:6}}>{PL("✏ Modifica")}</button>}
    </div>
    {!edit?<>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#7F77DD,#378ADD)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",flexShrink:0}}>
          {d.name?d.name[0].toUpperCase():"U"}
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:textC}}>{d.name}</div>
          <div style={{fontSize:12,color:subC}}>{currentUser.email||""}</div>
          {<div style={{fontSize:11,color:"#7F77DD",marginTop:2}}>{PL("☁️ Dati sincronizzati su cloud")}</div>}
        </div>
      </div>
      {<div style={{display:"flex",flexDirection:"column",gap:0,marginBottom:14}}>
        {[["📞",d.phone?(d.phonePrefix||"+39")+" "+d.phone:"—",PL("Telefono")],["🌍",d.nationality||"—",PL("Nazionalità")],["🎂",d.birthDate?fmtDate(d.birthDate,dateFmt):"—",PL("Nascita")],["🏙",[d.country,d.province,d.city].filter(Boolean).join(" · ")||"—",PL("Località")],["📍",d.address||"—",PL("Indirizzo")],["💼",d.jobType?PL(d.jobType):"—",PL("Lavoro")],["🎯",d.appUseReason?PL(d.appUseReason):"—",PL("Uso principale")],["⚧",d.gender==="M"?PL("Maschile"):d.gender==="F"?PL("Femminile"):d.gender==="X"?PL("Non spec."):"—",PL("Sesso")]].map(function(r){return <div key={r[2]} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid "+borderC}}>
          <span style={{fontSize:15,width:22}}>{r[0]}</span>
          <span style={{fontSize:12,color:subC,minWidth:64}}>{r[2]}</span>
          <span style={{fontSize:13,color:textC}}>{r[1]}</span>
        </div>;})}
      </div>}
      {<div style={{borderTop:"1px solid "+borderC,paddingTop:12,marginTop:12}}>
        <button onClick={function(){setEmailOpen(!emailOpen);setEmailError("");setEmailOk(false);setNewEmail(String(currentUser.email||""));}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:700,padding:0}}>{PL("✉️ Cambia email di accesso")}</button>
        {emailOpen&&<div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
          <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Nuova email")}</label><input type="email" value={newEmail} onChange={function(e){setNewEmail(e.target.value);}} style={sinp} placeholder="nuova@email.com"/></div>
          <div style={{fontSize:11,color:subC,lineHeight:1.35}}>{PL("La nuova email diventerà l’indirizzo usato per accedere all’app.")}</div>
          {emailError&&<div style={{fontSize:12,color:"#E24B4A",background:dark?"#3a1d1d":"#fff0f0",borderRadius:8,padding:"8px 10px"}}>{emailError}</div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={saveEmailChange} disabled={emailLoading} style={{flex:1,background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px",fontSize:13,fontWeight:700,cursor:emailLoading?"not-allowed":"pointer",opacity:emailLoading?0.65:1}}>{emailLoading?PL("Aggiornamento..."):PL("Aggiorna email")}</button>
            <button onClick={function(){setEmailOpen(false);setEmailError("");}} disabled={emailLoading} style={{background:dark?"#333":"#f0f0f0",color:dark?"#eee":"#555",border:"none",borderRadius:btnRadius,padding:"10px 12px",fontSize:13,cursor:"pointer"}}>{PL("Annulla")}</button>
          </div>
        </div>}
        {emailOk&&<div style={{fontSize:12,color:"#1D9E75",marginTop:8}}>{PL("Email di verifica inviata. Apri il link ricevuto sulla nuova email per completare il cambio.")}</div>}
      </div>}
      {<ChangePwdSection dark={dark} textC={textC} subC={subC} borderC={borderC} btnRadius={btnRadius} setToast={setToast}/>}
      {<div style={{borderTop:"1px solid "+borderC,paddingTop:12,marginTop:12,marginBottom:12}}>
        <button onClick={function(){setDeleteOpen(!deleteOpen);setDeleteError("");setDeleteConfirm("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#E24B4A",fontSize:13,fontWeight:700,padding:0}}>{PL("🗑 Elimina account e dati")}</button>
        {deleteOpen&&<div style={{marginTop:12,background:dark?"#2a1e1e":"#fff0f0",border:"1px solid #E24B4A",borderRadius:12,padding:12}}>
          <div style={{fontSize:13,fontWeight:800,color:"#E24B4A",marginBottom:6}}>{PL("Operazione permanente")}</div>
          <div style={{fontSize:12,color:dark?"#ddd":"#555",lineHeight:1.45,marginBottom:10}}>{PL("Verranno eliminati profilo, dati cloud, dati locali e account di accesso. Per confermare scrivi ELIMINA.")}</div>
          <input value={deleteConfirm} onChange={function(e){setDeleteConfirm(e.target.value);}} placeholder="ELIMINA" style={{...sinp,marginBottom:10,borderColor:deleteConfirm==="ELIMINA"?"#E24B4A":borderC}}/>
          {deleteError&&<div style={{fontSize:12,color:"#E24B4A",marginBottom:10,background:dark?"#3a1d1d":"#fff",borderRadius:8,padding:"8px 10px"}}>{deleteError}</div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={requestDeleteAccount} disabled={deleteLoading||deleteConfirm!=="ELIMINA"} style={{flex:1,background:"#E24B4A",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px",fontSize:13,fontWeight:800,cursor:(deleteLoading||deleteConfirm!=="ELIMINA")?"not-allowed":"pointer",opacity:(deleteLoading||deleteConfirm!=="ELIMINA")?0.45:1}}>{deleteLoading?PL("Eliminazione..."):PL("Elimina definitivamente")}</button>
            <button onClick={function(){setDeleteOpen(false);setDeleteConfirm("");setDeleteError("");}} disabled={deleteLoading} style={{background:dark?"#333":"#f0f0f0",color:dark?"#eee":"#555",border:"none",borderRadius:btnRadius,padding:"10px 12px",fontSize:13,cursor:"pointer"}}>{PL("Annulla")}</button>
          </div>
        </div>}
      </div>}
      <button onClick={function(){if(window.confirm(PL("Uscire dall'account?")))onLogout();}} style={{width:"100%",background:dark?"#252535":"#f5f5f5",color:"#E24B4A",border:"1px solid #E24B4A",borderRadius:btnRadius,padding:"11px",fontSize:14,fontWeight:500,cursor:"pointer"}}>{PL("🚪 Esci")}</button>
    </>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Nome")}</label><input value={pName} onChange={function(e){setPName(e.target.value);}} style={sinp}/></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Telefono")}</label><div style={{display:"grid",gridTemplateColumns:"130px 1fr",gap:8}}><input list="phone-prefixes" value={pPhonePrefix} onChange={function(e){setPPhonePrefix(e.target.value);}} style={sinp} placeholder="+39"/><input type="tel" value={pPhone} onChange={function(e){setPPhone(e.target.value.replace(/[^0-9 ]/g,""));}} style={sinp} placeholder="333 1234567"/></div><datalist id="phone-prefixes">{PHONE_PREFIXES.map(function(p){return <option key={p.code} value={p.code}>{p.country}</option>;})}</datalist><div style={{fontSize:10,color:subC,marginTop:3}}>{PL("Cerca il prefisso nazionale e inserisci solo numeri nel telefono.")}</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Data nascita")}</label><input type="date" value={pBirth} onChange={function(e){setPBirth(e.target.value);}} style={sinp}/></div>
        <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Sesso")}</label>
          <select value={pGender} onChange={function(e){setPGender(e.target.value);}} style={sinp}><option value="">—</option><option value="M">{PL("Maschile")}</option><option value="F">{PL("Femminile")}</option><option value="X">{PL("Non spec.")}</option></select>
        </div>
      </div>
      <ProfileLocalPromptField label={PL("Nazionalità")} value={pNationality} onChange={setPNationality} placeholder={PL("Cerca nazionalità")} options={countryNames} subC={subC} dark={dark} borderC={borderC} textC={textC} sinp={sinp}/>
      <ProfileLocalPromptField label={PL("Nazione di residenza")} value={pCountry} onChange={setPCountry} placeholder={PL("Cerca nazione di residenza")} options={countryNames} subC={subC} dark={dark} borderC={borderC} textC={textC} sinp={sinp}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Provincia / Regione")}</label><input value={pProvince} onChange={function(e){setPProvince(e.target.value);}} style={sinp} placeholder={PL("Provincia o regione")}/></div><div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Città")}</label><input value={pCity} onChange={function(e){setPCity(e.target.value);}} style={sinp} placeholder={PL("Città")}/></div></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Indirizzo")}</label><input value={pAddress} onChange={function(e){setPAddress(e.target.value);}} style={sinp} placeholder={PL("Indirizzo")}/></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Lavoro")}</label><select value={pJobType} onChange={function(e){setPJobType(e.target.value);}} style={sinp}><option value="">—</option>{JOB_TYPES.map(function(j){return <option key={j} value={j}>{PL(j)}</option>;})}</select></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{PL("Per cosa vuoi usare principalmente fAInance?")}</label><select value={pAppUseReason} onChange={function(e){setPAppUseReason(e.target.value);}} style={sinp}><option value="">—</option>{APP_USE_REASONS.map(function(r){return <option key={r} value={r}>{PL(r)}</option>;})}</select></div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={save} style={{flex:1,background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px",fontSize:14,fontWeight:600,cursor:"pointer"}}>{"💾 "+PL("Salva")}</button>
        <button onClick={function(){setEdit(false);}} style={{padding:"10px 14px",background:dark?"#333":"#f0f0f0",color:dark?"#eee":"#555",border:"none",borderRadius:btnRadius,cursor:"pointer",fontSize:13}}>{PL("Annulla")}</button>
      </div>
    </div>}
  </div>;
}

function AppWithLogin(){
  async function deriveBankKey(uid){var enc=new TextEncoder();var km=await crypto.subtle.importKey("raw",enc.encode("fainance_bank_"+uid),["deriveBits","deriveKey"],false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:enc.encode("fainance_salt_v1"),iterations:100000,hash:"SHA-256"},km,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
  async function encryptBankCoords(data,uid){try{var key=await deriveBankKey(uid);var iv=crypto.getRandomValues(new Uint8Array(12));var enc=new TextEncoder();var ct=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,enc.encode(JSON.stringify(data)));var combined=new Uint8Array(iv.byteLength+ct.byteLength);combined.set(iv,0);combined.set(new Uint8Array(ct),12);return btoa(String.fromCharCode(...combined));}catch(e){return null;}}
  async function decryptBankCoords(b64,uid){try{var raw=Uint8Array.from(atob(b64),function(c){return c.charCodeAt(0);});var iv=raw.slice(0,12);var ct=raw.slice(12);var key=await deriveBankKey(uid);var pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:iv},key,ct);return JSON.parse(new TextDecoder().decode(pt));}catch(e){return null;}}
  var [fbUser,setFbUser]=useState(undefined); // undefined=loading, null=not logged in
  var [userData,setUserData]=useState(null);

  useEffect(function(){
    var active=true;
    var authFallbackTimer=setTimeout(function(){
      // iOS/TestFlight safety: Firebase Auth can remain pending during WebView
      // persistence restore. Do not block the whole app forever on "Caricamento...".
      if(active){
        setFbUser(function(prev){return prev===undefined?null:prev;});
      }
    },5000);

    function applyMinimalUser(user){
      var normalizedEmail=String((user&&user.email)||"").toLowerCase();
      setUserData(function(prev){
        return {
          ...(prev||{}),
          id:user.uid,
          email:normalizedEmail,
          name:(user.displayName||((prev&&prev.name)||"Utente")),
          phonePrefix:(prev&&prev.phonePrefix)||"+39",
          phone:(prev&&prev.phone)||"",
          birthDate:(prev&&prev.birthDate)||"",
          gender:(prev&&prev.gender)||"",
          nationality:(prev&&prev.nationality)||"",
          country:(prev&&prev.country)||"",
          province:(prev&&prev.province)||"",
          city:(prev&&prev.city)||"",
          address:(prev&&prev.address)||"",
          jobType:(prev&&prev.jobType)||"",
          appUseReason:(prev&&prev.appUseReason)||""
        };
      });
      setFbUser(user);
    }

    function loadProfileInBackground(user){
      getDoc(doc(fbDb,"users",user.uid)).then(function(snap){
        if(!active)return;
        var profile=snap.exists()?snap.data():{};
        var displayName=profile.name||user.displayName||"Utente";
        var normalizedEmail=String(user.email||profile.email||"").toLowerCase();
        setDoc(doc(fbDb,"users",user.uid),{name:displayName,email:normalizedEmail,updatedAt:new Date().toISOString()},{merge:true}).catch(function(){});
        setUserData({id:user.uid,email:normalizedEmail,name:displayName,phone:profile.phone||"",phonePrefix:profile.phonePrefix||"+39",birthDate:profile.birthDate||"",gender:profile.gender||"",nationality:profile.nationality||"",country:profile.country||"",province:profile.province||"",city:profile.city||"",address:profile.address||"",jobType:profile.jobType||"",appUseReason:profile.appUseReason||""});
      }).catch(function(){
        if(!active)return;
        var normalizedEmail=String(user.email||"").toLowerCase();
        setDoc(doc(fbDb,"users",user.uid),{name:user.displayName||"Utente",email:normalizedEmail,updatedAt:new Date().toISOString()},{merge:true}).catch(function(){});
        setUserData(function(prev){
          return {
            ...(prev||{}),
            id:user.uid,
            email:normalizedEmail,
            name:user.displayName||((prev&&prev.name)||"Utente"),
            phonePrefix:(prev&&prev.phonePrefix)||"+39",
            phone:(prev&&prev.phone)||"",
            nationality:(prev&&prev.nationality)||"",
            country:(prev&&prev.country)||"",
            province:(prev&&prev.province)||"",
            city:(prev&&prev.city)||"",
            address:(prev&&prev.address)||"",
            jobType:(prev&&prev.jobType)||"",
            appUseReason:(prev&&prev.appUseReason)||""
          };
        });
      });
    }

    var unsub=function(){};
    try{
      unsub=onAuthStateChanged(fbAuth,function(user){
        if(!active)return;
        clearTimeout(authFallbackTimer);
        if(user){
          // Important: never wait for Firestore before leaving the loading screen.
          applyMinimalUser(user);
          loadProfileInBackground(user);
        } else {
          setFbUser(null);
          setUserData(null);
        }
      },function(err){
        if(!active)return;
        clearTimeout(authFallbackTimer);
        console.error("Firebase auth state error",err);
        setFbUser(null);
        setUserData(null);
      });
    }catch(err){
      clearTimeout(authFallbackTimer);
      console.error("Firebase auth listener setup error",err);
      setFbUser(null);
      setUserData(null);
    }

    return function(){
      active=false;
      clearTimeout(authFallbackTimer);
      try{if(typeof unsub==="function")unsub();}catch(e){}
    };
  },[]);

  if(fbUser===undefined)return <div style={{position:"fixed",inset:0,background:"linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
    <FAInanceLogo size={72}/>
    <div style={{fontSize:13,color:"#888"}}>Caricamento...</div>
  </div>;

  async function forceLogout(){
    try{
      if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){
        try{
          var mod=await import("@capacitor-firebase/authentication");
          if(mod&&mod.FirebaseAuthentication&&mod.FirebaseAuthentication.signOut)await mod.FirebaseAuthentication.signOut();
        }catch(nativeErr){}
      }
      await signOut(fbAuth).catch(function(){});
    }finally{
      setFbUser(null);
      setUserData(null);
    }
  }

  if(!fbUser)return <LoginScreen onLogin={function(u){setUserData(u);}}/>;
  return <App currentUser={userData||{id:fbUser.uid,email:fbUser.email,name:fbUser.displayName||"Utente"}} onLogout={forceLogout} fbUser={fbUser} onProfileUpdate={function(upd){setUserData(function(p){return {...(p||{}),id:fbUser.uid,email:fbUser.email,...upd};});}}/>;
}

function App({currentUser,onLogout,fbUser,onProfileUpdate}){
  currentUser=currentUser||{id:fbUser&&fbUser.uid?fbUser.uid:"",email:fbUser&&fbUser.email?fbUser.email:"",name:fbUser&&fbUser.displayName?fbUser.displayName:"Utente"};
  var userId=currentUser.id;
  function userKey(key){return userId?"user_"+userId+"_"+key:"no_user_"+key;}

  function ensureArrayValue(value,fallback){return Array.isArray(value)?value:(Array.isArray(fallback)?fallback:[]);}
  function ensureObjectValue(value,fallback){return value&&typeof value==="object"&&!Array.isArray(value)?value:(fallback||{});}
  function mergeArrayByStableId(cloud,local){
    var out=[];var seen={};
    function add(item){
      if(item==null)return;
      var id=item&&item.id!=null?String(item.id):JSON.stringify(item);
      if(seen[id])return;
      seen[id]=true;out.push(item);
    }
    ensureArrayValue(cloud,[]).forEach(add);
    ensureArrayValue(local,[]).forEach(add);
    return out;
  }
  function chooseCloudLocalArray(cloud,local,fallback,merge){
    var c=Array.isArray(cloud)?cloud:null;
    var l=Array.isArray(local)?local:null;
    if(merge&&c&&l)return mergeArrayByStableId(c,l);
    if(c)return c;
    if(l&&l.length)return l;
    return ensureArrayValue(fallback,[]);
  }
  function chooseCloudLocalObject(cloud,local,fallback){
    if(cloud&&typeof cloud==="object"&&!Array.isArray(cloud))return cloud;
    if(local&&typeof local==="object"&&!Array.isArray(local))return local;
    return fallback||{};
  }
  var firestoreHydratedRef=useRef(false);

  var [lang,setLang]=useStorage("pref_lang_v2",getDefaultLang());
  var [expenses,setExpenses]=useStorage(userKey("exp_v10"),[]);
  var [incomes,setIncomes]=useStorage(userKey("inc_v10"),[]);
  var [cats,setCats]=useStorage(userKey("cats_v10"),DEFAULT_CATS);
  var [methods,setMethods]=useStorage(userKey("meth_v10"),DEFAULT_METHODS);
  var [methodGroups,setMethodGroups]=useStorage(userKey("method_groups_v1"),DEFAULT_METHOD_GROUPS);
  var [expenseGroups,setExpenseGroups]=useStorage(userKey("expense_groups_v1"),DEFAULT_EXPENSE_GROUPS);
  var [incomeGroups,setIncomeGroups]=useStorage(userKey("income_groups_v1"),DEFAULT_INCOME_GROUPS);
  useEffect(function(){
    var nextCats=translateDefaultCollection(cats,DEFAULT_CATS,DEFAULT_EXPENSE_CATEGORY_NAMES,lang);
    var nextExpenseGroups=translateDefaultCollection(expenseGroups,DEFAULT_EXPENSE_GROUPS,DEFAULT_EXPENSE_GROUP_NAMES,lang);
    var nextMethods=translateDefaultCollection(methods,DEFAULT_METHODS,DEFAULT_METHOD_NAMES,lang);
    var nextMethodGroups=translateDefaultCollection(methodGroups,DEFAULT_METHOD_GROUPS,DEFAULT_METHOD_GROUP_NAMES,lang);
    if(!sameNamedItems(cats,nextCats))setCats(nextCats);
    if(!sameNamedItems(expenseGroups,nextExpenseGroups))setExpenseGroups(nextExpenseGroups);
    if(!sameNamedItems(methods,nextMethods))setMethods(nextMethods);
    if(!sameNamedItems(methodGroups,nextMethodGroups))setMethodGroups(nextMethodGroups);
  },[lang,cats,expenseGroups,methods,methodGroups]);
  var [customIncomeTypes,setCustomIncomeTypes]=useStorage(userKey("custom_income_types_v1"),[]);
  var [incomeTypeOverrides,setIncomeTypeOverrides]=useStorage(userKey("income_type_overrides_v1"),{});
  var incomeTypes=useMemo(function(){return getAllIncomeTypes(customIncomeTypes,incomeTypeOverrides).filter(function(x){return !x.deleted;});},[customIncomeTypes,incomeTypeOverrides]);
  var [recurring,setRecurring]=useStorage(userKey("rec_v10"),[]);
  var [goals,setGoals]=useStorage(userKey("goals_v1"),DEFAULT_GOALS);
  var [alerts,setAlerts]=useStorage(userKey("alerts_v1"),[]);
  var [budgetPlan,setBudgetPlan]=useStorage(userKey("budget_plan_v1"),DEFAULT_BUDGET_PLAN);
  var [patrimonioAreas,setPatrimonioAreas]=useStorage(userKey("patrimonio_areas_v1"),DEFAULT_PATRIMONIO_AREAS);
  var [patrimonioEntries,setPatrimonioEntries]=useStorage(userKey("patrimonio_entries_v1"),DEFAULT_PATRIMONIO_ENTRIES);
  var [patrimonioValues,setPatrimonioValues]=useStorage(userKey("patrimonio_values_v1"),{});
  var [patrimonioMode,setPatrimonioMode]=useStorage(userKey("patrimonio_mode_v1"),"manuale");
  useEffect(function(){
    var nextPatrimonioAreas=translateDefaultCollection(patrimonioAreas,DEFAULT_PATRIMONIO_AREAS,DEFAULT_PATRIMONIO_AREA_NAMES,lang);
    var nextPatrimonioEntries=translateDefaultCollection(patrimonioEntries,DEFAULT_PATRIMONIO_ENTRIES,DEFAULT_PATRIMONIO_ENTRY_NAMES,lang);
    if(!sameNamedItems(patrimonioAreas,nextPatrimonioAreas))setPatrimonioAreas(nextPatrimonioAreas);
    if(!sameNamedItems(patrimonioEntries,nextPatrimonioEntries))setPatrimonioEntries(nextPatrimonioEntries);
  },[lang,patrimonioAreas,patrimonioEntries]);
  var [catOrder,setCatOrder]=useStorage(userKey("cat_order_v1"),[]);
  var [methodOrder,setMethodOrder]=useStorage(userKey("method_order_v1"),[]);
  var [catSortMode,setCatSortMode]=useStorage(userKey("cat_sort_mode"),"group");
  var [methodSortMode,setMethodSortMode]=useStorage(userKey("method_sort_mode"),"group");
  var [currency,setCurrency]=useStorage(userKey("pref_cur"),getDefaultCurrency());
  var [secondaryCurrency,setSecondaryCurrency]=useStorage(userKey("pref_sec_cur"),"");
  var [showSecInHistory,setShowSecInHistory]=useStorage(userKey("pref_sec_history"),true);
  var [showSecInStats,setShowSecInStats]=useStorage(userKey("pref_sec_stats"),true);
  var [showSecInBudget,setShowSecInBudget]=useStorage(userKey("pref_sec_budget"),false);
  var [showSecInPatrimonio,setShowSecInPatrimonio]=useStorage(userKey("pref_sec_patrimonio"),false);
  var [secRate,setSecRate]=useState(null);
  var [secRateLoading,setSecRateLoading]=useState(false);
  var secSym=secondaryCurrency?(CURRENCIES.find(function(c){return c.code===secondaryCurrency;})||{symbol:secondaryCurrency}).symbol:"";
  useEffect(function(){
    if(!secondaryCurrency){setSecRate(null);return;}
    setSecRateLoading(true);
    fetch("https://api.exchangerate-api.com/v4/latest/"+currency)
      .then(function(r){return r.json();})
      .then(function(d){var r=d.rates&&d.rates[secondaryCurrency];setSecRate(r||null);})
      .catch(function(){setSecRate(null);})
      .finally(function(){setSecRateLoading(false);});
  },[secondaryCurrency,currency]);
  function fmtSec(val){
    if(!secRate||!secondaryCurrency)return null;
    var conv=val*secRate;
    // Same format as fmt() - no K/M abbreviations
    return secSym+conv.toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".");
  }
  var [dateFmt,setDateFmt]=useStorage(userKey("pref_datefmt"),getDefaultDateFormat());
  var [firstDayOfWeek,setFirstDayOfWeek]=useStorage(userKey("pref_first_day_week"),"mon");
  var [homeBalanceView,setHomeBalanceView]=useStorage(userKey("pref_home_balance"),"rateizzato");
  var [showAppSummaryHeader,setShowAppSummaryHeader]=useStorage(userKey("pref_show_app_summary_header_v1"),true);
  var [mobileNavOrder,setMobileNavOrder]=useStorage(userKey("pref_mobile_nav_order_v1"),["home","spese","history","voice","more","share"]);
  var [mobileNavIconCount,setMobileNavIconCount]=useStorage(userKey("pref_mobile_nav_icon_count_v1"),5);
  var [mobileMenuOrder,setMobileMenuOrder]=useStorage(userKey("pref_mobile_menu_order_v1"),["consulenteAI","patrimonio","budget","share","debtCredits","shopping","goals","alerts","appunti","settings"]);
  var DEFAULT_MOBILE_ALL_NAV_ORDER=["home","spese","history","voice","stats","consulenteAI","patrimonio","budget","share","debtCredits","shopping","goals","alerts","appunti","settings"];
  var [mobileAllNavOrderRaw,setMobileAllNavOrderRaw]=useStorage(userKey("pref_mobile_all_nav_order_v1"),DEFAULT_MOBILE_ALL_NAV_ORDER);
  var mobileAllNavOrder=useMemo(function(){
    var desired=DEFAULT_MOBILE_ALL_NAV_ORDER;
    var raw=Array.isArray(mobileAllNavOrderRaw)?mobileAllNavOrderRaw:[];
    var oldDefault=["home","spese","history","stats","appunti","voice","share","consulenteAI","patrimonio","budget","goals","alerts","settings"];
    var isOld=raw.length===oldDefault.length&&raw.every(function(x,i){return x===oldDefault[i];});
    if(!raw.length||isOld)return desired;
    var seen={};var out=[];raw.concat(desired).forEach(function(id){if(desired.indexOf(id)>=0&&!seen[id]){seen[id]=true;out.push(id);}});
    return out;
  },[mobileAllNavOrderRaw]);
  function setMobileAllNavOrder(v){setMobileAllNavOrderRaw(v);}
  var [statsView,setStatsView]=useStorage(userKey("pref_statsview"),"rateizzato");
  var [bgTheme,setBgTheme]=useStorage(userKey("pref_bg"),"default");
  var [btnStyle,setBtnStyle]=useStorage(userKey("pref_btn_style"),"soft");
  var [expenseColor,setExpenseColor]=useStorage(userKey("pref_exp_color"),"#E24B4A");
  var [incomeColor,setIncomeColor]=useStorage(userKey("pref_inc_color"),"#1D9E75");
  var [widgetBgColor,setWidgetBgColor]=useStorage(userKey("widget_bg_color_v1"),"#1E1E30");
  var [widgetBgAlpha,setWidgetBgAlpha]=useStorage(userKey("widget_bg_alpha_v1"),25);
  var [widgetExpenseColor,setWidgetExpenseColor]=useStorage(userKey("widget_expense_color_v1"),expenseColor||"#E24B4A");
  var [widgetIncomeColor,setWidgetIncomeColor]=useStorage(userKey("widget_income_color_v1"),incomeColor||"#1D9E75");
  var [widgetTitle,setWidgetTitle]=useStorage(userKey("widget_title_v1"),"fAInance");
  var [widgetSubtitle,setWidgetSubtitle]=useStorage(userKey("widget_subtitle_v1"),"Aggiunta rapida movimenti");
  var [widgetExpenseLabel,setWidgetExpenseLabel]=useStorage(userKey("widget_expense_label_v1"),"Uscita");
  var [widgetIncomeLabel,setWidgetIncomeLabel]=useStorage(userKey("widget_income_label_v1"),"Entrata");
  var [widgetShowHeader,setWidgetShowHeader]=useStorage(userKey("widget_show_header_v1"),true);
  var [widgetButtonStyle,setWidgetButtonStyle]=useStorage(userKey("widget_button_style_v1"),btnStyle||"soft");
  var [widgetVoiceEnabled,setWidgetVoiceEnabled]=useStorage(userKey("widget_voice_enabled_v1"),true);
  var [widget2Enabled,setWidget2Enabled]=useStorage(userKey("widget2_enabled_v1"),true);
  var [widget2Type,setWidget2Type]=useStorage(userKey("widget2_type_v1"),"note");
  var [widget2SelectedNoteId,setWidget2SelectedNoteId]=useStorage(userKey("widget2_note_id_v1"),"");
  var [widget2SelectedBankId,setWidget2SelectedBankId]=useStorage(userKey("widget2_bank_id_v1"),"");
  var [widget2MaxChars,setWidget2MaxChars]=useStorage(userKey("widget2_max_chars_v1"),500);
  var [widget2TextSize,setWidget2TextSize]=useStorage(userKey("widget2_text_size_v1"),14);
  var [widget2AccentColor,setWidget2AccentColor]=useStorage(userKey("widget2_accent_color_v1"),"#7F77DD");
  var [widget2TitleColor,setWidget2TitleColor]=useStorage(userKey("widget2_title_color_v1"),"#FFFFFF");
  var [widget2BodyColor,setWidget2BodyColor]=useStorage(userKey("widget2_body_color_v1"),"#CCFFFFFF");
  var [widget2BgAlpha,setWidget2BgAlpha]=useStorage(userKey("widget2_bg_alpha_v1"),25);
  var [widget2AutoUpdate,setWidget2AutoUpdate]=useStorage(userKey("widget2_auto_update_v1"),true);
  var [widget3Enabled,setWidget3Enabled]=useStorage(userKey("widget3_enabled_v1"),true);
  var [widget3SelectedGoalId,setWidget3SelectedGoalId]=useStorage(userKey("widget3_goal_id_v1"),"fondo_emergenza");
  var [widget3ShowPercent,setWidget3ShowPercent]=useStorage(userKey("widget3_show_percent_v1"),true);
  var [widget3ShowAmounts,setWidget3ShowAmounts]=useStorage(userKey("widget3_show_amounts_v1"),true);
  var [widget3AccentColor,setWidget3AccentColor]=useStorage(userKey("widget3_accent_color_v1"),"#EF7D00");
  var [widget3TextColor,setWidget3TextColor]=useStorage(userKey("widget3_text_color_v1"),"#FFFFFF");
  var [widget3PercentColor,setWidget3PercentColor]=useStorage(userKey("widget3_percent_color_v1"),"#EF7D00");
  var [widget3BgAlpha,setWidget3BgAlpha]=useStorage(userKey("widget3_bg_alpha_v1"),25);
  var [widget3AutoUpdate,setWidget3AutoUpdate]=useStorage(userKey("widget3_auto_update_v1"),true);
  var [widgetShareSelectedProjectId,setWidgetShareSelectedProjectId]=useStorage(userKey("widget_share_project_id_v1"),"");
  var [widgetShareBgColor,setWidgetShareBgColor]=useStorage(userKey("widget_share_bg_color_v1"),"#1E1E30");
  var [widgetShareBgAlpha,setWidgetShareBgAlpha]=useStorage(userKey("widget_share_bg_alpha_v1"),25);
  var [widgetShareAccentColor,setWidgetShareAccentColor]=useStorage(userKey("widget_share_accent_color_v1"),confirmButtonColor||"#7F77DD");
  var [widgetShareActivityColor,setWidgetShareActivityColor]=useStorage(userKey("widget_share_activity_color_v1"),"#378ADD");
  var [widgetShareTitleColor,setWidgetShareTitleColor]=useStorage(userKey("widget_share_title_color_v1"),"#FFFFFF");
  var [widgetShareBodyColor,setWidgetShareBodyColor]=useStorage(userKey("widget_share_body_color_v1"),"#D8D6F2");
  var [widgetShareAutoUpdate,setWidgetShareAutoUpdate]=useStorage(userKey("widget_share_auto_update_v1"),true);
  var [widgetShoppingListEnabled,setWidgetShoppingListEnabled]=useStorage(userKey("widget_shopping_list_enabled_v1"),true);
  var [widgetShoppingListMaxItems,setWidgetShoppingListMaxItems]=useStorage(userKey("widget_shopping_list_max_items_v1"),8);
  var [widgetShoppingListAccentColor,setWidgetShoppingListAccentColor]=useStorage(userKey("widget_shopping_list_accent_color_v1"),confirmButtonColor||"#EF9F27");
  var [widgetShoppingListTextSize,setWidgetShoppingListTextSize]=useStorage(userKey("widget_shopping_list_text_size_v1"),13);
  var [widgetShoppingListIconColor,setWidgetShoppingListIconColor]=useStorage(userKey("widget_shopping_list_icon_color_v1"),confirmButtonColor||"#EF9F27");
  var [widgetShoppingListTitleColor,setWidgetShoppingListTitleColor]=useStorage(userKey("widget_shopping_list_title_color_v1"),"#FFFFFF");
  var [widgetShoppingListTextColor,setWidgetShoppingListTextColor]=useStorage(userKey("widget_shopping_list_text_color_v1"),"#EDEDF7");
  var [widgetShoppingListBgAlpha,setWidgetShoppingListBgAlpha]=useStorage(userKey("widget_shopping_list_bg_alpha_v1"),65);
  var [widgetShoppingListAutoUpdate,setWidgetShoppingListAutoUpdate]=useStorage(userKey("widget_shopping_list_auto_update_v1"),true);
  var [widgetFidelityEnabled,setWidgetFidelityEnabled]=useStorage(userKey("widget_fidelity_enabled_v1"),true);
  var [widgetFidelitySelectedCardId,setWidgetFidelitySelectedCardId]=useStorage(userKey("widget_fidelity_card_id_v1"),"");
  var [widgetFidelityAccentColor,setWidgetFidelityAccentColor]=useStorage(userKey("widget_fidelity_accent_color_v1"),"#378ADD");
  var [widgetFidelityTextSize,setWidgetFidelityTextSize]=useStorage(userKey("widget_fidelity_text_size_v1"),14);
  var [widgetFidelityIconColor,setWidgetFidelityIconColor]=useStorage(userKey("widget_fidelity_icon_color_v1"),"#0F9F76");
  var [widgetFidelityTitleColor,setWidgetFidelityTitleColor]=useStorage(userKey("widget_fidelity_title_color_v1"),"#FFFFFF");
  var [widgetFidelityTextColor,setWidgetFidelityTextColor]=useStorage(userKey("widget_fidelity_text_color_v1"),"#FFFFFF");
  var [widgetFidelityBgAlpha,setWidgetFidelityBgAlpha]=useStorage(userKey("widget_fidelity_bg_alpha_v1"),65);
  var [widgetFidelityAutoUpdate,setWidgetFidelityAutoUpdate]=useStorage(userKey("widget_fidelity_auto_update_v1"),true);
  var [widgetDebtCreditsEnabled,setWidgetDebtCreditsEnabled]=useStorage(userKey("widget_debt_credits_enabled_v1"),true);
  var [widgetDebtCreditsMode,setWidgetDebtCreditsMode]=useStorage(userKey("widget_debt_credits_mode_v1"),"open");
  var [widgetDebtCreditsAccentColor,setWidgetDebtCreditsAccentColor]=useStorage(userKey("widget_debt_credits_accent_color_v1"),"#7F77DD");
  var [widgetDebtCreditsTextSize,setWidgetDebtCreditsTextSize]=useStorage(userKey("widget_debt_credits_text_size_v1"),13);
  var [widgetDebtCreditsIconColor,setWidgetDebtCreditsIconColor]=useStorage(userKey("widget_debt_credits_icon_color_v1"),"#7F77DD");
  var [widgetDebtCreditsTitleColor,setWidgetDebtCreditsTitleColor]=useStorage(userKey("widget_debt_credits_title_color_v1"),"#FFFFFF");
  var [widgetDebtCreditsTextColor,setWidgetDebtCreditsTextColor]=useStorage(userKey("widget_debt_credits_text_color_v1"),"#EDEDF7");
  var [widgetDebtCreditsBgAlpha,setWidgetDebtCreditsBgAlpha]=useStorage(userKey("widget_debt_credits_bg_alpha_v1"),65);
  var [widgetDebtCreditsAutoUpdate,setWidgetDebtCreditsAutoUpdate]=useStorage(userKey("widget_debt_credits_auto_update_v1"),true);

  var [tab,setTab]=useState("home");
  var [settingsPage,setSettingsPage]=useState(null);
  var [notifPrefs,setNotifPrefs]=useStorage(userKey("notif_prefs_v1"),{remindActive:false,remindFreq:"daily",remindHour:"20:00",stipendioActive:true,stipendioHour:"18:00",stipendioDay:0,spesaRicorrente:true});
  var [customNotifs,setCustomNotifs]=useStorage(userKey("custom_notifs_v1"),[]);
  var [patrimonioHistory,setPatrimonioHistory]=useStorage(userKey("patrimonio_history_v1"),{});
  var [patrimonioNotes,setPatrimonioNotes]=useStorage(userKey("patrimonio_notes_v1"),{});
  var [historyFutureMode,setHistoryFutureMode]=useStorage(userKey("history_future_mode_v1"),"untilToday");
  var [historySortDate,setHistorySortDate]=useStorage(userKey("history_sort_date_v1"),"operation");
  var [historySortDirection,setHistorySortDirection]=useStorage(userKey("history_sort_direction_v1"),"desc");
  var [appuntiDocuments,setAppuntiDocuments]=useStorage(userKey("appunti_documents_v1"),[]);
  var [appuntiNotes,setAppuntiNotes]=useStorage(userKey("appunti_notes_v1"),[]);
  var [bankCoords,setBankCoords]=useStorage(userKey("bank_coords_v1"),[]);
  var [termsAccepted,setTermsAccepted]=useStorage(userKey("terms_accepted_v1"),false);
  var [privacyAccepted,setPrivacyAccepted]=useStorage(userKey("privacy_accepted_v1"),false);
  var [legalAcceptanceDate,setLegalAcceptanceDate]=useStorage(userKey("legal_acceptance_date_v1"),"");
  var [shareProjects,setShareProjects]=useStorage(userKey("share_projects_v1"),[]);
  var [showShareInHistory,setShowShareInHistory]=useStorage(userKey("share_show_history_v1"),true);
  var DEFAULT_SHOPPING_AREAS=["Alimenti","Banco Frigo","Macelleria","Pescheria","Salumi","Ortofrutta","Igiene","Altro"];
  var [debtCredits,setDebtCredits]=useStorage(userKey("debt_credits_v1"),[]);
  var [shoppingCards,setShoppingCards]=useStorage(userKey("shopping_cards_v1"),[]);
  var [shoppingItems,setShoppingItems]=useStorage(userKey("shopping_items_v1"),[]);
  var [shoppingAreas,setShoppingAreas]=useStorage(userKey("shopping_areas_v1"),DEFAULT_SHOPPING_AREAS);
  var [shoppingAreaIcons,setShoppingAreaIcons]=useStorage(userKey("shopping_area_icons_v1"),{});
  var [shoppingBoughtColor,setShoppingBoughtColor]=useStorage(userKey("shopping_bought_color_v1"),"#EAF7EE");
  var [shoppingLists,setShoppingLists]=useStorage(userKey("shopping_lists_v2"),[{id:"main",title:"Lista principale",icon:"🧺",createdAt:new Date().toISOString()}]);
  var [activeShoppingListId,setActiveShoppingListId]=useStorage(userKey("shopping_active_list_id_v2"),"main");
  var [shoppingProductSort,setShoppingProductSort]=useStorage(userKey("shopping_product_sort_v1"),"custom");
  var [shoppingIconPickerArea,setShoppingIconPickerArea]=useState("");
  var SHOPPING_ICON_OPTIONS=["📌","🧺","🛒","🥩","🍗","🥓","🍖","🐖","🐷","🧀","🥛","🥪","🍕","🌭","🥟","🧈","🐟","🦐","🦞","🥚","🍞","🥐","🥖","🍝","🍚","🥫","🫘","🥦","🥬","🥕","🍅","🌽","🥔","🍄","🍆","🧄","🧅","🥒","🫑","🥑","🍎","🍌","🍊","🍋","🍓","🍇","🍉","🥝","🥭","🍐","🍑","🍒","🫐","🥥","🍍","🧼","🧴","🧻","🪥","🧽","🧹","🧺","🧊","☕","🍵","🥤","🍺","🍷","🍫","🍪","🍯","🧂","🌶️","🥜","🍿","🧃","🍬","🍭","🍼","🐾","👶","💊","🩹","📦","⭐","❤️","🔥","❄️","✅"];
  var [showDebtCreditsInPatrimonio,setShowDebtCreditsInPatrimonio]=useStorage(userKey("debt_credits_show_patrimonio_v1"),true);
  var [showDebtCreditsInExpenses,setShowDebtCreditsInExpenses]=useStorage(userKey("debt_credits_show_expenses_v1"),false);
  var [shoppingDefaultArea,setShoppingDefaultArea]=useStorage(userKey("shopping_default_area_v1"),"Alimenti");
  var [shareReceiptUploads,setShareReceiptUploads]=useStorage(userKey("share_receipt_uploads_v1"),[]);
  var [confirmButtonColor,setConfirmButtonColor]=useStorage(userKey("pref_confirm_color"),"#7F77DD");
  var [currentPlan,setCurrentPlanRaw]=useStorage(userKey("plan_v1"),"free");
  var [planBillingPeriod,setPlanBillingPeriod]=useStorage(userKey("plan_billing_period_v1"),"monthly");
  var [planPurchaseLoading,setPlanPurchaseLoading]=useState("");
  var [topAdDismissedAt,setTopAdDismissedAt]=useStorage(userKey("top_ad_dismissed_at_v1"),0);
  var currentPlanRef=useRef(currentPlan||"free");
  // persistAccountPlan rimossa: Firestore Security Rules bloccano scrittura piano dal client
  function setCurrentPlan(nextPlan){
    var safePlan=PLAN_LIMITS[nextPlan]?nextPlan:"free";
    currentPlanRef.current=safePlan;
    setCurrentPlanRaw(safePlan);
    try{localStorage.setItem(userKey("plan_v1"),JSON.stringify(safePlan));}catch(e){}
  }
  useEffect(function(){currentPlanRef.current=currentPlan||"free";},[currentPlan]);
  var [planUsage,setPlanUsage]=useStorage(userKey("plan_usage_v1"),{});
  var [shareReceivedInvites,setShareReceivedInvites]=useState([]);
  var [shareReceivedNotifications,setShareReceivedNotifications]=useState([]);
  var [shareInviteLoading,setShareInviteLoading]=useState(false);

  // ── FIRESTORE SYNC ──────────────────────────────────────────────────────────
  var [firestoreReady,setFirestoreReady]=useState(false);
  var [isOffline,setIsOffline]=useState(!navigator.onLine);
  useEffect(function(){function goOnline(){setIsOffline(false);}function goOffline(){setIsOffline(true);}window.addEventListener("online",goOnline);window.addEventListener("offline",goOffline);return function(){window.removeEventListener("online",goOnline);window.removeEventListener("offline",goOffline);};},[]);
  useEffect(function(){
    if(!userId){setFirestoreReady(true);return;}
    firestoreHydratedRef.current=false;
    setFirestoreReady(false);
    // Reset immediato dei dati sensibili quando cambia account: evita che il nuovo account erediti
    // in memoria alert, movimenti, chat o appunti del profilo usato prima mentre Firestore sta caricando.
    setExpenses([]);setIncomes([]);setRecurring([]);setGoals(DEFAULT_GOALS);setAlerts([]);setBudgetPlan(DEFAULT_BUDGET_PLAN);
    setAppuntiDocuments([]);setAppuntiNotes([]);setBankCoords([]);setAiDismissed([]);setAiChat([]);setShareProjects([]);setDebtCredits([]);setShoppingCards([]);setShoppingItems([]);setShareReceiptUploads([]);setCustomNotifs([]);setPlanUsage({});setShownAlertIds([]);
    // Load data from Firestore before enabling the UI, so one account can never inherit local data from another account.
    var docRef=doc(fbDb,"userData",userId);
    getDoc(docRef).then(function(snap){
      if(snap.exists()){
        var d=snap.data();
        setExpenses(Array.isArray(d.expenses)?d.expenses:[]);
        setIncomes(Array.isArray(d.incomes)?d.incomes:[]);
        (function(){var cloudTs=Number(d.catsUpdatedAt||0);var localTs=0;try{localTs=Number(localStorage.getItem(userKey("cats_updated_at"))||0);}catch(e){}var cloudCats=Array.isArray(d.cats)?d.cats:null;if(localTs>cloudTs&&Array.isArray(cats)&&cats.length>0){setCats(cats);}else{setCats(chooseCloudLocalArray(cloudCats,cats,DEFAULT_CATS,false));}})();
        (function(){var cloudTs=Number(d.methodsUpdatedAt||0);var localTs=0;try{localTs=Number(localStorage.getItem(userKey("cats_updated_at"))||0);}catch(e){}var cloudMethods=Array.isArray(d.methods)?d.methods:null;if(localTs>cloudTs&&Array.isArray(methods)&&methods.length>0){setMethods(methods);}else{setMethods(chooseCloudLocalArray(cloudMethods,methods,DEFAULT_METHODS,false));}})();
        setRecurring(Array.isArray(d.recurring)?d.recurring:[]);
        setGoals(Array.isArray(d.goals)?d.goals:DEFAULT_GOALS);
        setAlerts(Array.isArray(d.alerts)?d.alerts:[]);
        setBudgetPlan(d.budgetPlan!==undefined?d.budgetPlan:(budgetPlan||DEFAULT_BUDGET_PLAN));
        setPatrimonioValues(chooseCloudLocalObject(d.patrimonioValues,patrimonioValues,{}));
        setPatrimonioAreas(chooseCloudLocalArray(d.patrimonioAreas,patrimonioAreas,DEFAULT_PATRIMONIO_AREAS,false));
        setPatrimonioEntries(chooseCloudLocalArray(d.patrimonioEntries,patrimonioEntries,DEFAULT_PATRIMONIO_ENTRIES,false));
        setPatrimonioHistory(chooseCloudLocalObject(d.patrimonioHistory,patrimonioHistory,{}));
        setPatrimonioNotes(chooseCloudLocalObject(d.patrimonioNotes,patrimonioNotes,{}));
        setExpenseGroups(chooseCloudLocalArray(d.expenseGroups,expenseGroups,DEFAULT_EXPENSE_GROUPS,false));
        setMethodGroups(chooseCloudLocalArray(d.methodGroups,methodGroups,DEFAULT_METHOD_GROUPS,false));
        setIncomeGroups(chooseCloudLocalArray(d.incomeGroups,incomeGroups,DEFAULT_INCOME_GROUPS,false));
        setCustomIncomeTypes(chooseCloudLocalArray(d.customIncomeTypes,customIncomeTypes,[],true));
        setIncomeTypeOverrides(chooseCloudLocalObject(d.incomeTypeOverrides,incomeTypeOverrides,{}));
        if(d.historyFutureMode)setHistoryFutureMode(d.historyFutureMode);if(d.shareProjects)setShareProjects(d.shareProjects);if(d.debtCredits)setDebtCredits(d.debtCredits);if(d.shoppingCards)setShoppingCards(d.shoppingCards);if(d.shoppingItems)setShoppingItems(d.shoppingItems);if(d.shoppingAreas)setShoppingAreas(d.shoppingAreas);if(d.shareReceiptUploads)setShareReceiptUploads(d.shareReceiptUploads);if(d.showDebtCreditsInPatrimonio!==undefined)setShowDebtCreditsInPatrimonio(!!d.showDebtCreditsInPatrimonio);if(d.showDebtCreditsInExpenses!==undefined)setShowDebtCreditsInExpenses(!!d.showDebtCreditsInExpenses);if(d.shoppingDefaultArea)setShoppingDefaultArea(d.shoppingDefaultArea);if(d.shoppingAreaIcons)setShoppingAreaIcons(d.shoppingAreaIcons);if(d.shoppingBoughtColor)setShoppingBoughtColor(d.shoppingBoughtColor);restoreLocalJson("shopping_lists_v2",d.shoppingLists);restoreLocalJson("shopping_active_list_id_v2",d.activeShoppingListId);restoreLocalJson("shopping_product_sort_v1",d.shoppingProductSort);if(d.showShareInHistory!==undefined)setShowShareInHistory(!!d.showShareInHistory);if(d.confirmButtonColor)setConfirmButtonColor(d.confirmButtonColor);
        if(d.historySortDate)setHistorySortDate(d.historySortDate);
        if(d.historySortDirection)setHistorySortDirection(d.historySortDirection);
        setAppuntiDocuments(Array.isArray(d.appuntiDocuments)?d.appuntiDocuments:[]);
        setAppuntiNotes(Array.isArray(d.appuntiNotes)?d.appuntiNotes:[]);
        (async function(){var raw=d.bankCoords;if(typeof raw==="string"&&raw.length>0){var dec=await decryptBankCoords(raw,user.uid);setBankCoords(Array.isArray(dec)?dec:[]);}else{setBankCoords(Array.isArray(raw)?raw:[]);}})();
        setAiDismissed(Array.isArray(d.aiDismissed)?d.aiDismissed:[]);
        setAiChat(Array.isArray(d.aiChat)?d.aiChat:[]);
        if(d.aiDataAccess)setAiDataAccess(d.aiDataAccess);
        if(d.aiFloatingEnabled!==undefined)setAiFloatingEnabled(!!d.aiFloatingEnabled);
        if(d.notifPrefs)setNotifPrefs(d.notifPrefs);
        setCustomNotifs(Array.isArray(d.customNotifs)?d.customNotifs:[]);
        if(d.termsAccepted!==undefined)setTermsAccepted(!!d.termsAccepted);
        if(d.privacyAccepted!==undefined)setPrivacyAccepted(!!d.privacyAccepted);
        if(d.legalAcceptanceDate)setLegalAcceptanceDate(d.legalAcceptanceDate);
        setShareProjects(chooseCloudLocalArray(d.shareProjects,shareProjects,[],true));
        setDebtCredits(chooseCloudLocalArray(d.debtCredits,debtCredits,[],true));
        setShoppingCards(chooseCloudLocalArray(d.shoppingCards,shoppingCards,[],true));
        setShoppingItems(chooseCloudLocalArray(d.shoppingItems,shoppingItems,[],true));
        setShoppingAreas(chooseCloudLocalArray(d.shoppingAreas,shoppingAreas,DEFAULT_SHOPPING_AREAS,false));
        setShareReceiptUploads(chooseCloudLocalArray(d.shareReceiptUploads,shareReceiptUploads,[],true));
        if(d.showShareInHistory!==undefined)setShowShareInHistory(!!d.showShareInHistory);
        if(d.confirmButtonColor)setConfirmButtonColor(d.confirmButtonColor);
        var cloudPlan=d.currentPlan||d.plan||d.subscriptionPlan;if(cloudPlan&&PLAN_LIMITS[cloudPlan])setCurrentPlan(cloudPlan,false);
        setPlanUsage(chooseCloudLocalObject(d.planUsage,planUsage,{}));
        setShownAlertIds(Array.isArray(d.shownAlertIds)?d.shownAlertIds:[]);
      } else {
        // Nuovo account o documento cloud mancante: non cancellare mai dati locali già presenti.
        // Questo evita che un rientro con Firestore vuoto sovrascriva movimenti salvati sul dispositivo.
        setExpenses([]);setIncomes([]);setRecurring([]);setGoals(DEFAULT_GOALS);setAlerts([]);setBudgetPlan(DEFAULT_BUDGET_PLAN);
        setCats(chooseCloudLocalArray(null,cats,DEFAULT_CATS,false));setMethods(chooseCloudLocalArray(null,methods,DEFAULT_METHODS,false));setExpenseGroups(chooseCloudLocalArray(null,expenseGroups,DEFAULT_EXPENSE_GROUPS,false));setIncomeGroups(chooseCloudLocalArray(null,incomeGroups,DEFAULT_INCOME_GROUPS,false));setMethodGroups(chooseCloudLocalArray(null,methodGroups,DEFAULT_METHOD_GROUPS,false));
        setPatrimonioAreas(chooseCloudLocalArray(null,patrimonioAreas,DEFAULT_PATRIMONIO_AREAS,false));setPatrimonioEntries(chooseCloudLocalArray(null,patrimonioEntries,DEFAULT_PATRIMONIO_ENTRIES,false));setPatrimonioValues(chooseCloudLocalObject(null,patrimonioValues,{}));setPatrimonioHistory(chooseCloudLocalObject(null,patrimonioHistory,{}));setPatrimonioNotes(chooseCloudLocalObject(null,patrimonioNotes,{}));
        setAppuntiDocuments([]);setAppuntiNotes([]);setBankCoords([]);setAiDismissed([]);setAiChat([]);setShareProjects([]);setDebtCredits([]);setShoppingCards([]);setShoppingItems([]);setShoppingAreas(DEFAULT_SHOPPING_AREAS);setShareReceiptUploads([]);setShowShareInHistory(true);setCustomNotifs([]);setNotifPrefs({remindActive:false,remindFreq:"daily",remindHour:"20:00",stipendioActive:true,stipendioHour:"18:00",stipendioDay:0,spesaRicorrente:true});if(!PLAN_LIMITS[currentPlanRef.current])setCurrentPlan("free",false);setPlanUsage({});setShownAlertIds([]);
      }
      firestoreHydratedRef.current=true;
      setFirestoreReady(true);
    }).catch(function(err){console.error("Firestore load error",(err&&err.code)||"unknown");firestoreHydratedRef.current=true;setFirestoreReady(true);});
  },[userId]);

  async function saveToFirestore(){
    if(!userId||!firestoreHydratedRef.current)return;
    if(!navigator.onLine)return;
    try{if(localStorage.getItem("fainance_deleting_account_"+userId)==="1")return;}catch(e){}
    var docRef=doc(fbDb,"userData",userId);
    var bankCoordsToSave=bankCoords;
    try{var encBank=await encryptBankCoords(bankCoords,userId);if(encBank)bankCoordsToSave=encBank;}catch(e){}
    var catsTs=Date.now();
    try{localStorage.setItem(userKey("cats_updated_at"),String(catsTs));}catch(e){}
    setDoc(docRef,{expenses,incomes,cats,methods,catsUpdatedAt:catsTs,methodsUpdatedAt:catsTs,recurring,goals,alerts,budgetPlan,patrimonioValues,patrimonioAreas,patrimonioEntries,patrimonioHistory,patrimonioNotes,expenseGroups,incomeGroups,methodGroups,customIncomeTypes,incomeTypeOverrides,historyFutureMode,historySortDate,historySortDirection,firstDayOfWeek,appuntiDocuments,appuntiNotes,bankCoords:bankCoordsToSave,notifPrefs,customNotifs,termsAccepted,privacyAccepted,legalAcceptanceDate,aiDismissed,aiChat,aiDataAccess,aiFloatingEnabled,shareProjects,showShareInHistory,debtCredits,shoppingCards,shoppingItems,shoppingAreas,showDebtCreditsInPatrimonio,showDebtCreditsInExpenses,shoppingDefaultArea,shareReceiptUploads,confirmButtonColor,planUsage,shownAlertIds,updatedAt:new Date().toISOString()},{merge:true}).catch(function(e){console.error("Firestore save error",(e&&e.code)||"unknown");});
  }

  async function deleteCurrentAccount(){
    if(!userId)throw new Error("Account non valido.");
    var authUser=fbAuth.currentUser;
    if(!authUser)throw new Error("Utente non trovato. Esci e rientra, poi riprova.");
    var deletingKey="fainance_deleting_account_"+userId;
    try{
      try{localStorage.setItem(deletingKey,"1");}catch(e){}
      setFirestoreReady(false);
      await deleteDoc(doc(fbDb,"userData",userId)).catch(function(){});
      await deleteDoc(doc(fbDb,"users",userId)).catch(function(){});
      try{var ownedSnap=await getDocs(query(collection(fbDb,"shareProjects"),where("ownerUid","==",userId)));await Promise.all(ownedSnap.docs.map(function(d){return deleteDoc(d.ref);}));}catch(e){}
      try{var invSnap=await getDocs(query(collection(fbDb,"shareInvites"),where("invitedUid","==",userId)));await Promise.all(invSnap.docs.map(function(d){return deleteDoc(d.ref);}));}catch(e){}
      try{var notifSnap=await getDocs(query(collection(fbDb,"shareNotifications"),where("userUid","==",userId)));await Promise.all(notifSnap.docs.map(function(d){return deleteDoc(d.ref);}));}catch(e){}
      clearFainanceLocalAccountData();
      await deleteUser(authUser);
      await Promise.resolve(onLogout&&onLogout());
    }catch(err){
      if(err&&err.code==="auth/requires-recent-login"){
        clearFainanceLocalAccountData();
        await Promise.resolve(onLogout&&onLogout());
        throw new Error("Per sicurezza Firebase richiede un accesso recente. Rientra con lo stesso account e ripeti l’eliminazione: i dati locali sono già stati rimossi da questo dispositivo.");
      }
      await Promise.resolve(onLogout&&onLogout()).catch(function(){});
      throw err;
    }finally{
      try{localStorage.removeItem(deletingKey);}catch(e){}
    }
  }


  function normalizeEmail(v){return String(v||"").trim().toLowerCase();}
  function currentUserShareName(){return currentUser&&currentUser.name?currentUser.name:"Utente";}
  var SHARE_WEB_APP_URL="https://test-fainanceapp-it.web.app";
  function escapeShareHtml(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
  function buildShareInviteUrl(inviteId,projectId){
    var base=SHARE_WEB_APP_URL.replace(/\/$/,"");
    return base+"/?shareInvite="+encodeURIComponent(String(inviteId||""))+"&shareProject="+encodeURIComponent(String(projectId||""));
  }
  function mergeShareProjectsFromCloud(cloudProjects){
    if(!Array.isArray(cloudProjects)||!cloudProjects.length)return;
    setShareProjects(function(list){
      var map={};
      (list||[]).forEach(function(p){map[String(p.id)]=p;});
      cloudProjects.forEach(function(p){map[String(p.id)]=p;});
      return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return String(b.createdAt||"").localeCompare(String(a.createdAt||""));});
    });
  }
  function syncShareProjectToCloud(project){
    if(!project||!userId)return;
    var pid=String(project.id);
    var memberUids=Array.from(new Set((project.participants||[]).map(function(p){return p.uid;}).filter(Boolean).concat(project.memberUids||[])));
    var cloudProject={...project,memberUids:memberUids,ownerUid:project.ownerUid||userId,updatedAt:new Date().toISOString()};
    setDoc(doc(fbDb,"shareProjects",pid),cloudProject,{merge:true}).catch(function(e){console.error("Share project sync error",(e&&e.code)||"unknown");});
  }
  function loadShareCollaboration(){
    if(!userId)return;
    var email=normalizeEmail(currentUser&&currentUser.email);
    setShareInviteLoading(true);
    var inviteQueries=[];
    if(email)inviteQueries.push(getDocs(query(collection(fbDb,"shareInvites"),where("invitedEmail","==",email))).catch(function(){return null;}));
    inviteQueries.push(getDocs(query(collection(fbDb,"shareInvites"),where("invitedUid","==",userId))).catch(function(){return null;}));
    Promise.all([
      Promise.all(inviteQueries),
      getDocs(query(collection(fbDb,"shareProjects"),where("memberUids","array-contains",userId))).catch(function(){return null;}),
      getDocs(query(collection(fbDb,"shareNotifications"),where("userUid","==",userId))).catch(function(){return null;})
    ]).then(function(res){
      var invMap={};
      (res[0]||[]).forEach(function(snap){if(!snap)return;(snap.docs||[]).forEach(function(d){var data=d.data();if(data&&data.status==="pending")invMap[d.id]={...data,id:d.id};});});
      setShareReceivedInvites(Object.keys(invMap).map(function(k){return invMap[k];}).sort(function(a,b){return String(b.createdAt||"").localeCompare(String(a.createdAt||""));}));
      var cloudProjects=[];
      if(res[1])res[1].docs.forEach(function(d){cloudProjects.push({...d.data(),id:d.id});});
      mergeShareProjectsFromCloud(cloudProjects);
      var notifs=[];
      if(res[2])res[2].docs.forEach(function(d){var data=d.data();if(data&&!data.read)notifs.push({...data,id:d.id});});
      setShareReceivedNotifications(notifs);
    }).finally(function(){setShareInviteLoading(false);});
  }
  useEffect(function(){
    if(!firestoreReady||!userId)return;
    var email=normalizeEmail(currentUser&&currentUser.email);
    setShareInviteLoading(true);
    var projectMaps={member:{},owner:{}};
    var inviteMaps={email:{},uid:{}};
    function applyProjects(){
      var all={};
      Object.keys(projectMaps.member).forEach(function(k){all[k]=projectMaps.member[k];});
      Object.keys(projectMaps.owner).forEach(function(k){all[k]=projectMaps.owner[k];});
      var arr=Object.keys(all).map(function(k){return all[k];}).sort(function(a,b){return String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||""));});
      setShareProjects(arr);
    }
    function applyInvites(){
      var all={};
      Object.keys(inviteMaps.email).forEach(function(k){all[k]=inviteMaps.email[k];});
      Object.keys(inviteMaps.uid).forEach(function(k){all[k]=inviteMaps.uid[k];});
      setShareReceivedInvites(Object.keys(all).map(function(k){return all[k];}).filter(function(i){return i&&i.status==="pending";}).sort(function(a,b){return String(b.createdAt||"").localeCompare(String(a.createdAt||""));}));
      setShareInviteLoading(false);
    }
    var unsubs=[];
    unsubs.push(onSnapshot(query(collection(fbDb,"shareProjects"),where("memberUids","array-contains",userId)),function(snap){
      var map={};snap.forEach(function(d){map[d.id]={...d.data(),id:d.id};});projectMaps.member=map;applyProjects();
    },function(e){console.error("Share projects member listener error",(e&&e.code)||"unknown");setShareInviteLoading(false);}));
    unsubs.push(onSnapshot(query(collection(fbDb,"shareProjects"),where("ownerUid","==",userId)),function(snap){
      var map={};snap.forEach(function(d){map[d.id]={...d.data(),id:d.id};});projectMaps.owner=map;applyProjects();
    },function(e){console.error("Share projects owner listener error",(e&&e.code)||"unknown");}));
    if(email){
      unsubs.push(onSnapshot(query(collection(fbDb,"shareInvites"),where("invitedEmail","==",email)),function(snap){
        var map={};snap.forEach(function(d){map[d.id]={...d.data(),id:d.id};});inviteMaps.email=map;applyInvites();
      },function(e){console.error("Share invites email listener error",(e&&e.code)||"unknown");setShareInviteLoading(false);}));
    }
    unsubs.push(onSnapshot(query(collection(fbDb,"shareInvites"),where("invitedUid","==",userId)),function(snap){
      var map={};snap.forEach(function(d){map[d.id]={...d.data(),id:d.id};});inviteMaps.uid=map;applyInvites();
    },function(e){console.error("Share invites uid listener error",(e&&e.code)||"unknown");setShareInviteLoading(false);}));
    unsubs.push(onSnapshot(query(collection(fbDb,"shareNotifications"),where("userUid","==",userId)),function(snap){
      var list=[];snap.forEach(function(d){var data=d.data();if(data&&!data.read)list.push({...data,id:d.id});});setShareReceivedNotifications(list);
    },function(e){console.error("Share notifications listener error",(e&&e.code)||"unknown");}));
    return function(){unsubs.forEach(function(u){try{u&&u();}catch(e){}});};
  },[firestoreReady,userId,currentUser&&currentUser.email]);
  async function acceptShareInvite(invite){
    if(!invite||!invite.projectId||!userId)return;
    try{
      var projectRef=doc(fbDb,"shareProjects",String(invite.projectId));
      var projectSnap=await getDoc(projectRef);
      if(!projectSnap.exists()){setToast("Progetto Share non trovato");return;}
      var project={...projectSnap.data(),id:String(invite.projectId)};
      var email=normalizeEmail(currentUser&&currentUser.email);
      var participants=Array.isArray(project.participants)?project.participants.slice():[];
      var found=false;
      participants=participants.map(function(p){
        var matches=(invite.participantId&&p.id===invite.participantId)||(email&&normalizeEmail(p.email)===email)||p.uid===userId;
        if(!matches)return p;
        found=true;
        return {...p,uid:userId,email:email||p.email,name:currentUserShareName(),kind:"registered",type:"registered",role:"member",status:"active"};
      });
      if(!found)participants.push({id:"u_"+userId,uid:userId,email:email,name:currentUserShareName(),kind:"registered",type:"registered",role:"member",status:"active"});
      var memberUids=Array.from(new Set((project.memberUids||[]).concat([userId])));
      var updated={...project,participants:participants,memberUids:memberUids,updatedAt:new Date().toISOString()};
      await setDoc(projectRef,updated,{merge:true});
      await setDoc(doc(fbDb,"shareInvites",String(invite.id)),{status:"accepted",acceptedAt:new Date().toISOString(),invitedUid:userId},{merge:true});
      setShareProjects(function(list){var exists=(list||[]).some(function(p){return String(p.id)===String(updated.id);});return exists?(list||[]).map(function(p){return String(p.id)===String(updated.id)?updated:p;}):[updated].concat(list||[]);});
      setShareReceivedInvites(function(list){return(list||[]).filter(function(i){return i.id!==invite.id;});});
      setToast("Invito Share accettato");
      loadShareCollaboration();
    }catch(e){console.error(e);setToast("Errore durante l'accettazione dell'invito");}
  }
  async function declineShareInvite(invite){
    if(!invite||!invite.id)return;
    try{
      await setDoc(doc(fbDb,"shareInvites",String(invite.id)),{status:"declined",declinedAt:new Date().toISOString(),invitedUid:userId||null},{merge:true});
      setShareReceivedInvites(function(list){return(list||[]).filter(function(i){return i.id!==invite.id;});});
      setToast("Invito Share rifiutato");
    }catch(e){console.error(e);setToast("Errore durante il rifiuto dell'invito");}
  }
  async function createShareInvite(project,participant,email,name,foundUser){
    if(!project||!email||!userId)return null;
    var inviteId="invite_"+Date.now()+"_"+Math.floor(Math.random()*10000);
    var invitedUid=foundUser&&foundUser.uid?foundUser.uid:null;
    var projectId=String(project.id);
    var projectName=project.name||"Progetto Share";
    var inviteLink=buildShareInviteUrl(inviteId,projectId);
    var invitedEmail=normalizeEmail(email);
    var invite={id:inviteId,projectId:projectId,projectName:projectName,participantId:participant.id,invitedEmail:invitedEmail,invitedUid:invitedUid,invitedName:name||invitedEmail.split("@")[0],invitedByUid:userId,invitedByName:currentUserShareName(),status:"pending",inviteLink:inviteLink,createdAt:new Date().toISOString()};
    await setDoc(doc(fbDb,"shareInvites",inviteId),invite,{merge:true});
    if(invitedUid){await addDoc(collection(fbDb,"shareNotifications"),{userUid:invitedUid,type:"share_invite",title:"Invito Share",message:currentUserShareName()+" ti ha invitato nel progetto "+projectName,projectId:projectId,inviteId:inviteId,inviteLink:inviteLink,read:false,createdAt:new Date().toISOString()}).catch(function(){});}
    var safeInviter=escapeShareHtml(currentUserShareName());
    var safeProject=escapeShareHtml(projectName);
    var safeLink=escapeShareHtml(inviteLink);
    var mailHtml=""
      +"<div style=\"font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;line-height:1.5;\">"
      +"<div style=\"font-size:22px;font-weight:800;margin-bottom:6px;\">Invito Share su fAInance</div>"
      +"<div style=\"font-size:14px;color:#666;margin-bottom:22px;\">Gestisci spese condivise, saldi e rimborsi in un unico progetto.</div>"
      +"<div style=\"background:#f4f1ff;border:1px solid #ddd8ff;border-radius:14px;padding:18px;margin-bottom:22px;\">"
      +"<p style=\"margin:0 0 10px 0;\"><strong>"+safeInviter+"</strong> ti ha invitato a partecipare al progetto:</p>"
      +"<p style=\"margin:0;font-size:20px;font-weight:800;color:#5f55d8;\">"+safeProject+"</p>"
      +"</div>"
      +"<a href=\""+safeLink+"\" style=\"display:inline-block;background:#7F77DD;color:#fff;text-decoration:none;border-radius:12px;padding:13px 20px;font-weight:800;margin-bottom:18px;\">Apri invito Share</a>"
      +"<p style=\"font-size:13px;color:#777;margin-top:18px;\">Se il pulsante non funziona, copia e incolla questo link nel browser:</p>"
      +"<p style=\"font-size:12px;word-break:break-all;color:#555;\">"+safeLink+"</p>"
      +"<hr style=\"border:none;border-top:1px solid #eee;margin:22px 0;\"/>"
      +"<p style=\"font-size:12px;color:#999;margin:0;\">Hai ricevuto questa email perché qualcuno ti ha invitato a un progetto Share su fAInance.</p>"
      +"</div>";
    var mailText=currentUserShareName()+" ti ha invitato a partecipare al progetto "+projectName+" su fAInance. Apri l'invito da questo link: "+inviteLink;
    await addDoc(collection(fbDb,"mail"),{to:[invitedEmail],message:{subject:"Invito a "+projectName+" su fAInance",text:mailText,html:mailHtml},shareInviteId:inviteId,shareProjectId:projectId,shareInviteLink:inviteLink,createdAt:new Date().toISOString()}).catch(function(e){console.error("Mail queue error",(e&&e.code)||"unknown");});
    return inviteId;
  }

  // Auto-save to Firestore whenever data changes
  useEffect(function(){
    if(!firestoreReady)return;
    var timer=setTimeout(saveToFirestore,700); // debounce rapido per non perdere dati se l'app viene chiusa
    return function(){clearTimeout(timer);};
  },[expenses,incomes,cats,methods,recurring,goals,alerts,budgetPlan,patrimonioValues,patrimonioAreas,patrimonioEntries,patrimonioHistory,patrimonioNotes,expenseGroups,incomeGroups,methodGroups,customIncomeTypes,incomeTypeOverrides,historyFutureMode,historySortDate,historySortDirection,firstDayOfWeek,appuntiDocuments,appuntiNotes,bankCoords,notifPrefs,customNotifs,termsAccepted,privacyAccepted,legalAcceptanceDate,aiDismissed,aiChat,aiDataAccess,aiFloatingEnabled,shareProjects,showShareInHistory,debtCredits,shoppingCards,shoppingItems,shoppingAreas,showDebtCreditsInPatrimonio,showDebtCreditsInExpenses,shoppingDefaultArea,shareReceiptUploads,confirmButtonColor,currentPlan,planUsage,shownAlertIds]);
  useEffect(function(){
    function flush(){if(firestoreReady&&firestoreHydratedRef.current)saveToFirestore();}
    function onVisibility(){if(document.visibilityState==="hidden")flush();}
    document.addEventListener("visibilitychange",onVisibility);
    window.addEventListener("pagehide",flush);
    return function(){document.removeEventListener("visibilitychange",onVisibility);window.removeEventListener("pagehide",flush);};
  },[firestoreReady,expenses,incomes,cats,methods,recurring,goals,alerts,budgetPlan,patrimonioValues,patrimonioAreas,patrimonioEntries,patrimonioHistory,patrimonioNotes,expenseGroups,incomeGroups,methodGroups,customIncomeTypes,incomeTypeOverrides,historyFutureMode,historySortDate,historySortDirection,firstDayOfWeek,appuntiDocuments,appuntiNotes,bankCoords,notifPrefs,customNotifs,termsAccepted,privacyAccepted,legalAcceptanceDate,aiDismissed,aiChat,aiDataAccess,aiFloatingEnabled,shareProjects,showShareInHistory,debtCredits,shoppingCards,shoppingItems,shoppingAreas,showDebtCreditsInPatrimonio,showDebtCreditsInExpenses,shoppingDefaultArea,shareReceiptUploads,confirmButtonColor,planUsage,shownAlertIds]);

  var [speseSubTab,setSpeseSubTab]=useState("add");
  var [addType,setAddType]=useState("expense");
  var [addSubTab,setAddSubTab]=useState("single");

  function openQuickAddFromUrl(rawUrl){
    var raw=String(rawUrl||"");
    var url=raw.toLowerCase();
    if(!url)return;
    var shareInviteId="";
    var shareProjectId="";
    try{
      var parsed=new URL(raw,window&&window.location?window.location.origin:SHARE_WEB_APP_URL);
      shareInviteId=parsed.searchParams.get("shareInvite")||parsed.searchParams.get("invite")||"";
      shareProjectId=parsed.searchParams.get("shareProject")||parsed.searchParams.get("project")||"";
    }catch(e){
      var im=raw.match(/[?&](?:shareInvite|invite)=([^&]+)/);
      var pm=raw.match(/[?&](?:shareProject|project)=([^&]+)/);
      shareInviteId=im?decodeURIComponent(im[1]):"";
      shareProjectId=pm?decodeURIComponent(pm[1]):"";
    }
    if(url.indexOf("open-plan-info")>=0||url.indexOf("open-info")>=0||url.indexOf("plan-info")>=0){
      openPlanInfo();
      return;
    }
    if(url.indexOf("open-receipt-camera")>=0||url.indexOf("receipt-camera")>=0){
      try{localStorage.setItem("fainance_receipt_auto_camera_once","1");}catch(e){}
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("expense");
      setAddSubTab("receipt");
      setSettingsPage(null);
      setMobileMenu(false);
      try{
        setTimeout(function(){window.dispatchEvent(new CustomEvent("fainance-open-receipt-camera"));},120);
        setTimeout(function(){window.dispatchEvent(new CustomEvent("fainance-open-receipt-camera"));},520);
        setTimeout(function(){window.dispatchEvent(new CustomEvent("fainance-open-receipt-camera"));},1200);
      }catch(e){}
      return;
    }
    if(url.indexOf("open-receipt")>=0||url.indexOf("receipt")>=0||url.indexOf("scontrino")>=0){
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("expense");
      setAddSubTab("receipt");
      setSettingsPage(null);
      setMobileMenu(false);
      return;
    }
    if(url.indexOf("share-add-expense")>=0){
      setTab("share");
      setSettingsPage(null);
      setMobileMenu(false);
      setShareProjectTab("attivita");
      if(shareProjectId)setShareSelectedProjectId(String(shareProjectId));
      return;
    }
    if(url.indexOf("share-activity")>=0){
      setTab("share");
      setSettingsPage(null);
      setMobileMenu(false);
      setShareProjectTab("attivita");
      if(shareProjectId)setShareSelectedProjectId(String(shareProjectId));
      return;
    }
    if(shareInviteId||shareProjectId||url.indexOf("/share")>=0||url.indexOf("open-share")>=0){
      setTab("share");
      setSettingsPage(null);
      setMobileMenu(false);
      setShareProjectTab("attivita");
      if(shareProjectId)setShareSelectedProjectId(String(shareProjectId));
      return;
    }
    if(url.indexOf("add-expense")>=0){
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("expense");
      setAddSubTab("single");
      setSettingsPage(null);
      setMobileMenu(false);
    }
    if(url.indexOf("add-income")>=0){
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("income");
      setAddSubTab("single");
      setSettingsPage(null);
      setMobileMenu(false);
    }
    if(url.indexOf("widget-settings")>=0){
      setTab("settings");
      setSettingsPage("appearance_widget");
      setMobileMenu(false);
    }
    if(url.indexOf("open-voice")>=0||url.indexOf("voice-entry")>=0||url.indexOf("add-voice")>=0){
      setTab("voice");
      setSettingsPage(null);
      setMobileMenu(false);
      setTimeout(function(){openVoiceModal();},80);
    }
    if(url.indexOf("open-appunti")>=0){
      setTab("appunti");
      setSettingsPage(null);
      setMobileMenu(false);
    }
    if(url.indexOf("open-goals")>=0||url.indexOf("add-goal-progress")>=0){
      setTab("goals");
      setSettingsPage(null);
      setMobileMenu(false);
    }
  }

  useEffect(function(){
    var removeListener=null;
    var cancelled=false;

    if(window&&window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){
      import("@capacitor/app").then(function(mod){
        if(cancelled)return;
        var CapApp=mod.App;
        if(!CapApp)return;

        CapApp.getLaunchUrl().then(function(result){
          if(result&&result.url)openQuickAddFromUrl(result.url);
        }).catch(function(){});

        CapApp.addListener("appUrlOpen",function(event){
          if(event&&event.url)openQuickAddFromUrl(event.url);
        }).then(function(listener){
          removeListener=listener;
        }).catch(function(){});
      }).catch(function(){});
    } else {
      openQuickAddFromUrl(window.location.href);
    }

    return function(){
      cancelled=true;
      if(removeListener&&removeListener.remove)removeListener.remove();
    };
  },[]);
  var [historyTab,setHistoryTab]=useState("expenses");
  var [filterYear,setFilterYear]=useState("all");
  var [filterMonth,setFilterMonth]=useState("");
  var [shareSelectedProjectId,setShareSelectedProjectId]=useState(null);
  var [shareProjectTab,setShareProjectTab]=useState("attivita");
  var [mergeFrom,setMergeFrom]=useState("");var [mergeTo,setMergeTo]=useState("");
  var [mobileMenu,setMobileMenu]=useState(false);
  var [settingsValuesTab,setSettingsValuesTab]=useState("cats");
  var [defaultExpenseArea,setDefaultExpenseArea]=useStorage(userKey("default_expense_area_v1"),"vita");
  var [defaultExpenseCat,setDefaultExpenseCat]=useStorage(userKey("default_expense_cat_v1"),"4");
  var [defaultExpenseMethod,setDefaultExpenseMethod]=useStorage(userKey("default_expense_method_v1"),"2");
  var [defaultIncomeArea,setDefaultIncomeArea]=useStorage(userKey("default_income_area_v1"),"lavoro");
  var [defaultIncomeType,setDefaultIncomeType]=useStorage(userKey("default_income_type_v1"),"salario");
  var [defaultMethodArea,setDefaultMethodArea]=useStorage(userKey("default_method_area_v1"),"conti_carte");
  var [incomeTypeOrder,setIncomeTypeOrder]=useStorage(userKey("income_type_order_v1"),[]);
  var [isMobile,setIsMobile]=useState(true);
  var [searchQuery,setSearchQuery]=useState("");
  var historySearchDraftRef=useRef("");
  var [filterCat,setFilterCat]=useState("all");
  var [filterCats,setFilterCats]=useState([]);
  var [filterCatExclude,setFilterCatExclude]=useState(false);
  var [filterMonths,setFilterMonths]=useState([]);
  var [filterGroup,setFilterGroup]=useState("all");
  var [filterDateFrom,setFilterDateFrom]=useState("");
  var [filterDateTo,setFilterDateTo]=useState("");
  var [filterAmtMin,setFilterAmtMin]=useState("");
  var [filterAmtMax,setFilterAmtMax]=useState("");
  var [showFilters,setShowFilters]=useState(false);
  var [editingItem,setEditingItem]=useState(null);
  var [deleteConfirmId,setDeleteConfirmId]=useState(null);
  var [alertPopup,setAlertPopup]=useState(null); // holds array of NEW alerts to show
  var [shownAlertIds,setShownAlertIds]=useStorage(userKey("shown_alert_ids_v2"),[]); // alert keys already acknowledged
  var [toast,setToastState]=useState<any>(null);
  function buildRuntimeTranslationMap(){
    var current=(TRANSLATIONS[lang]||TRANSLATIONS.it||{});
    var map={...(current||{})};
    try{
      Object.keys(TRANSLATIONS||{}).forEach(function(code){
        var src=TRANSLATIONS[code]||{};
        Object.keys(src).forEach(function(k){
          var target=current[k];
          var sourceVal=src[k];
          if(typeof target==="string"&&typeof sourceVal==="string"&&sourceVal){
            map[sourceVal]=target;
          }
        });
      });
    }catch(e){}
    return map;
  }
  var runtimeTranslationMap=useMemo(function(){return buildRuntimeTranslationMap();},[lang]);
  var runtimeTranslationKeys=useMemo(function(){
    return Object.keys(runtimeTranslationMap||{}).filter(function(k){return k&&typeof runtimeTranslationMap[k]==="string"&&k!==runtimeTranslationMap[k]&&k.length>=4;}).sort(function(a,b){return b.length-a.length;});
  },[runtimeTranslationMap]);
  function translateCriticalUiText(value, code){
    var raw=String(value==null?"":value);
    var k=raw.trim();
    if(!k)return raw;
    var D={"Riepilogo alto, numero icone e ordine delle sezioni": {"en": "Top summary, number of icons and section order", "es": "Resumen superior, número de iconos y orden de secciones", "fr": "Résumé supérieur, nombre d’icônes et ordre des sections", "de": "Obere Zusammenfassung, Anzahl der Symbole und Reihenfolge der Bereiche", "pt": "Resumo superior, número de ícones e ordem das secções", "pl": "Górne podsumowanie, liczba ikon i kolejność sekcji", "nl": "Bovenste samenvatting, aantal pictogrammen en volgorde van secties", "ro": "Rezumat superior, număr de pictograme și ordinea secțiunilor", "el": "Πάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων"}, "Top summary, number of icons and section order": {"en": "Top summary, number of icons and section order", "es": "Resumen superior, número de iconos y orden de secciones", "fr": "Résumé supérieur, nombre d’icônes et ordre des sections", "de": "Obere Zusammenfassung, Anzahl der Symbole und Reihenfolge der Bereiche", "pt": "Resumo superior, número de ícones e ordem das secções", "pl": "Górne podsumowanie, liczba ikon i kolejność sekcji", "nl": "Bovenste samenvatting, aantal pictogrammen en volgorde van secties", "ro": "Rezumat superior, număr de pictograme și ordinea secțiunilor", "el": "Πάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων"}, "Colore + Spesa": {"en": "Expense button color", "es": "Color del botón de gasto", "fr": "Couleur du bouton de dépense", "de": "Farbe der Ausgaben-Schaltfläche", "pt": "Cor do botão de despesa", "pl": "Kolor przycisku wydatku", "nl": "Kleur van de uitgavenknop", "ro": "Culoarea butonului de cheltuială", "el": "Χρώμα κουμπιού εξόδου"}, "Color + Expense": {"en": "Expense button color", "es": "Color del botón de gasto", "fr": "Couleur du bouton de dépense", "de": "Farbe der Ausgaben-Schaltfläche", "pt": "Cor do botão de despesa", "pl": "Kolor przycisku wydatku", "nl": "Kleur van de uitgavenknop", "ro": "Culoarea butonului de cheltuială", "el": "Χρώμα κουμπιού εξόδου"}, "Color + Uitgave": {"en": "Expense button color", "es": "Color del botón de gasto", "fr": "Couleur du bouton de dépense", "de": "Farbe der Ausgaben-Schaltfläche", "pt": "Cor do botão de despesa", "pl": "Kolor przycisku wydatku", "nl": "Kleur van de uitgavenknop", "ro": "Culoarea butonului de cheltuială", "el": "Χρώμα κουμπιού εξόδου"}, "Colore Attività": {"en": "Activity color", "es": "Color de actividad", "fr": "Couleur de l’activité", "de": "Aktivitätsfarbe", "pt": "Cor da atividade", "pl": "Kolor aktywności", "nl": "Activiteitskleur", "ro": "Culoarea activității", "el": "Χρώμα δραστηριότητας"}, "Activity color": {"en": "Activity color", "es": "Color de actividad", "fr": "Couleur de l’activité", "de": "Aktivitätsfarbe", "pt": "Cor da atividade", "pl": "Kolor aktywności", "nl": "Activiteitskleur", "ro": "Culoarea activității", "el": "Χρώμα δραστηριότητας"}, "Colore titolo": {"en": "Title color", "es": "Color del título", "fr": "Couleur du titre", "de": "Titelfarbe", "pt": "Cor do título", "pl": "Kolor tytułu", "nl": "Titelkleur", "ro": "Culoarea titlului", "el": "Χρώμα τίτλου"}, "Title color": {"en": "Title color", "es": "Color del título", "fr": "Couleur du titre", "de": "Titelfarbe", "pt": "Cor do título", "pl": "Kolor tytułu", "nl": "Titelkleur", "ro": "Culoarea titlului", "el": "Χρώμα τίτλου"}, "Colore testi secondari": {"en": "Secondary text color", "es": "Color del texto secundario", "fr": "Couleur du texte secondaire", "de": "Farbe des sekundären Textes", "pt": "Cor do texto secundário", "pl": "Kolor tekstu dodatkowego", "nl": "Kleur van secundaire tekst", "ro": "Culoarea textului secundar", "el": "Χρώμα δευτερεύοντος κειμένου"}, "Secondary text color": {"en": "Secondary text color", "es": "Color del texto secundario", "fr": "Couleur du texte secondaire", "de": "Farbe des sekundären Textes", "pt": "Cor do texto secundário", "pl": "Kolor tekstu dodatkowego", "nl": "Kleur van secundaire tekst", "ro": "Culoarea textului secundar", "el": "Χρώμα δευτερεύοντος κειμένου"}, "Progetto mostrato nel widget": {"en": "Project shown in the widget", "es": "Proyecto mostrado en el widget", "fr": "Projet affiché dans le widget", "de": "Im Widget angezeigtes Projekt", "pt": "Projeto mostrado no widget", "pl": "Projekt pokazany w widżecie", "nl": "Project dat in de widget wordt getoond", "ro": "Proiect afișat în widget", "el": "Έργο που εμφανίζεται στο widget"}, "Project shown in the widget": {"en": "Project shown in the widget", "es": "Proyecto mostrado en el widget", "fr": "Projet affiché dans le widget", "de": "Im Widget angezeigtes Projekt", "pt": "Projeto mostrado no widget", "pl": "Projekt pokazany w widżecie", "nl": "Project dat in de widget wordt getoond", "ro": "Proiect afișat în widget", "el": "Έργο που εμφανίζεται στο widget"}, "Scegli il progetto predefinito. Ogni singolo widget potrà comunque essere configurato con un progetto diverso.": {"en": "Choose the default project. Each individual widget can still be configured with a different project.", "es": "Elige el proyecto predeterminado. Cada widget individual puede configurarse con un proyecto distinto.", "fr": "Choisis le projet par défaut. Chaque widget individuel peut quand même être configuré avec un projet différent.", "de": "Wähle das Standardprojekt. Jedes einzelne Widget kann weiterhin mit einem anderen Projekt konfiguriert werden.", "pt": "Escolhe o projeto predefinido. Cada widget individual ainda pode ser configurado com um projeto diferente.", "pl": "Wybierz projekt domyślny. Każdy pojedynczy widżet nadal można skonfigurować z innym projektem.", "nl": "Kies het standaardproject. Elke afzonderlijke widget kan nog steeds met een ander project worden ingesteld.", "ro": "Alege proiectul implicit. Fiecare widget poate fi configurat totuși cu un proiect diferit.", "el": "Επίλεξε το προεπιλεγμένο έργο. Κάθε μεμονωμένο widget μπορεί ακόμη να ρυθμιστεί με διαφορετικό έργο."}, "Choose the default project. Each individual widget can still be configured with a different project.": {"en": "Choose the default project. Each individual widget can still be configured with a different project.", "es": "Elige el proyecto predeterminado. Cada widget individual puede configurarse con un proyecto distinto.", "fr": "Choisis le projet par défaut. Chaque widget individuel peut quand même être configuré avec un projet différent.", "de": "Wähle das Standardprojekt. Jedes einzelne Widget kann weiterhin mit einem anderen Projekt konfiguriert werden.", "pt": "Escolhe o projeto predefinido. Cada widget individual ainda pode ser configurado com um projeto diferente.", "pl": "Wybierz projekt domyślny. Każdy pojedynczy widżet nadal można skonfigurować z innym projektem.", "nl": "Kies het standaardproject. Elke afzonderlijke widget kan nog steeds met een ander project worden ingesteld.", "ro": "Alege proiectul implicit. Fiecare widget poate fi configurat totuși cu un proiect diferit.", "el": "Επίλεξε το προεπιλεγμένο έργο. Κάθε μεμονωμένο widget μπορεί ακόμη να ρυθμιστεί με διαφορετικό έργο."}, "Primo progetto disponibile": {"en": "First available project", "es": "Primer proyecto disponible", "fr": "Premier projet disponible", "de": "Erstes verfügbares Projekt", "pt": "Primeiro projeto disponível", "pl": "Pierwszy dostępny projekt", "nl": "Eerste beschikbare project", "ro": "Primul proiect disponibil", "el": "Πρώτο διαθέσιμο έργο"}, "First available project": {"en": "First available project", "es": "Primer proyecto disponible", "fr": "Premier projet disponible", "de": "Erstes verfügbares Projekt", "pt": "Primeiro projeto disponível", "pl": "Pierwszy dostępny projekt", "nl": "Eerste beschikbare project", "ro": "Primul proiect disponibil", "el": "Πρώτο διαθέσιμο έργο"}, "Salva e aggiorna widget": {"en": "Save and update widget", "es": "Guardar y actualizar widget", "fr": "Enregistrer et mettre à jour le widget", "de": "Widget speichern und aktualisieren", "pt": "Guardar e atualizar widget", "pl": "Zapisz i zaktualizuj widżet", "nl": "Widget opslaan en bijwerken", "ro": "Salvează și actualizează widgetul", "el": "Αποθήκευση και ενημέρωση widget"}, "Save and update widget": {"en": "Save and update widget", "es": "Guardar y actualizar widget", "fr": "Enregistrer et mettre à jour le widget", "de": "Widget speichern und aktualisieren", "pt": "Guardar e atualizar widget", "pl": "Zapisz i zaktualizuj widżet", "nl": "Widget opslaan en bijwerken", "ro": "Salvează și actualizează widgetul", "el": "Αποθήκευση και ενημέρωση widget"}, "Aggiornamento automatico": {"en": "Automatic update", "es": "Actualización automática", "fr": "Mise à jour automatique", "de": "Automatische Aktualisierung", "pt": "Atualização automática", "pl": "Automatyczna aktualizacja", "nl": "Automatische update", "ro": "Actualizare automată", "el": "Αυτόματη ενημέρωση"}, "Automatic update": {"en": "Automatic update", "es": "Actualización automática", "fr": "Mise à jour automatique", "de": "Automatische Aktualisierung", "pt": "Atualização automática", "pl": "Automatyczna aktualizacja", "nl": "Automatische update", "ro": "Actualizare automată", "el": "Αυτόματη ενημέρωση"}, "Saldo": {"en": "Balance", "es": "Saldo", "fr": "Solde", "de": "Kontostand", "pt": "Saldo", "pl": "Saldo", "nl": "Balans", "ro": "Sold", "el": "Υπόλοιπο"}, "Balance": {"en": "Balance", "es": "Saldo", "fr": "Solde", "de": "Kontostand", "pt": "Saldo", "pl": "Saldo", "nl": "Balans", "ro": "Sold", "el": "Υπόλοιπο"}, "Spesa": {"en": "Expense", "es": "Gasto", "fr": "Dépense", "de": "Ausgabe", "pt": "Despesa", "pl": "Wydatek", "nl": "Uitgave", "ro": "Cheltuială", "el": "Έξοδο"}, "+ Spesa": {"en": "+ Expense", "es": "+ Gasto", "fr": "+ Dépense", "de": "+ Ausgabe", "pt": "+ Despesa", "pl": "+ Wydatek", "nl": "+ Uitgave", "ro": "+ Cheltuială", "el": "+ Έξοδο"}, "+ Expense": {"en": "+ Expense", "es": "+ Gasto", "fr": "+ Dépense", "de": "+ Ausgabe", "pt": "+ Despesa", "pl": "+ Wydatek", "nl": "+ Uitgave", "ro": "+ Cheltuială", "el": "+ Έξοδο"}, "Attività": {"en": "Activity", "es": "Actividad", "fr": "Activité", "de": "Aktivität", "pt": "Atividade", "pl": "Aktywność", "nl": "Activiteit", "ro": "Activitate", "el": "Δραστηριότητα"}, "Activity": {"en": "Activity", "es": "Actividad", "fr": "Activité", "de": "Aktivität", "pt": "Atividade", "pl": "Aktywność", "nl": "Activiteit", "ro": "Activitate", "el": "Δραστηριότητα"}, "Sfondo": {"en": "Background", "es": "Fondo", "fr": "Arrière-plan", "de": "Hintergrund", "pt": "Fundo", "pl": "Tło", "nl": "Achtergrond", "ro": "Fundal", "el": "Φόντο"}, "Background": {"en": "Background", "es": "Fondo", "fr": "Arrière-plan", "de": "Hintergrund", "pt": "Fundo", "pl": "Tło", "nl": "Achtergrond", "ro": "Fundal", "el": "Φόντο"}, "Questo widget mostra sulla Home il riepilogo di un progetto Share: saldo personale, quanto devi, quanto ti devono e ultima attività. Il progetto può essere scelto qui come default e anche dal tasto di configurazione quando aggiungi il widget.": {"en": "This widget shows a Share project summary on the Home screen: personal balance, what you owe, what others owe you and the latest activity. The project can be selected here as default and also from the configuration button when you add the widget.", "es": "Este widget muestra en la pantalla de inicio el resumen de un proyecto Share: saldo personal, cuánto debes, cuánto te deben y la última actividad. El proyecto puede elegirse aquí como predeterminado y también desde el botón de configuración al añadir el widget.", "fr": "Ce widget affiche sur l’écran d’accueil le résumé d’un projet Share : solde personnel, ce que tu dois, ce qu’on te doit et la dernière activité. Le projet peut être choisi ici par défaut et aussi depuis le bouton de configuration lorsque tu ajoutes le widget.", "de": "Dieses Widget zeigt auf dem Startbildschirm die Zusammenfassung eines Share-Projekts: persönlicher Kontostand, was du schuldest, was dir geschuldet wird und die letzte Aktivität. Das Projekt kann hier als Standard und auch über die Konfigurationstaste beim Hinzufügen des Widgets gewählt werden.", "pt": "Este widget mostra no ecrã inicial o resumo de um projeto Share: saldo pessoal, quanto deves, quanto te devem e a última atividade. O projeto pode ser escolhido aqui como padrão e também no botão de configuração ao adicionares o widget.", "pl": "Ten widżet pokazuje na ekranie głównym podsumowanie projektu Share: saldo osobiste, ile jesteś winien, ile inni są winni tobie i ostatnią aktywność. Projekt można wybrać tutaj jako domyślny, a także przyciskiem konfiguracji podczas dodawania widżetu.", "nl": "Deze widget toont op het startscherm de samenvatting van een Share-project: persoonlijk saldo, wat jij verschuldigd bent, wat anderen jou verschuldigd zijn en de laatste activiteit. Het project kan hier als standaard worden gekozen en ook via de configuratieknop wanneer je de widget toevoegt.", "ro": "Acest widget afișează pe ecranul principal rezumatul unui proiect Share: sold personal, cât datorezi, cât ți se datorează și ultima activitate. Proiectul poate fi ales aici ca implicit și și din butonul de configurare când adaugi widgetul.", "el": "Αυτό το widget εμφανίζει στην αρχική οθόνη τη σύνοψη ενός έργου Share: προσωπικό υπόλοιπο, πόσα οφείλεις, πόσα σου οφείλουν και την τελευταία δραστηριότητα. Το έργο μπορεί να επιλεγεί εδώ ως προεπιλογή και επίσης από το κουμπί ρύθμισης όταν προσθέτεις το widget."}, "This widget shows a Share project summary on the Home screen: personal balance, how much you owe, how much others owe you and the latest activity. The project can be selected here as the default and also from the configuration button when you add the widget.": {"en": "This widget shows a Share project summary on the Home screen: personal balance, what you owe, what others owe you and the latest activity. The project can be selected here as default and also from the configuration button when you add the widget.", "es": "Este widget muestra en la pantalla de inicio el resumen de un proyecto Share: saldo personal, cuánto debes, cuánto te deben y la última actividad. El proyecto puede elegirse aquí como predeterminado y también desde el botón de configuración al añadir el widget.", "fr": "Ce widget affiche sur l’écran d’accueil le résumé d’un projet Share : solde personnel, ce que tu dois, ce qu’on te doit et la dernière activité. Le projet peut être choisi ici par défaut et aussi depuis le bouton de configuration lorsque tu ajoutes le widget.", "de": "Dieses Widget zeigt auf dem Startbildschirm die Zusammenfassung eines Share-Projekts: persönlicher Kontostand, was du schuldest, was dir geschuldet wird und die letzte Aktivität. Das Projekt kann hier als Standard und auch über die Konfigurationstaste beim Hinzufügen des Widgets gewählt werden.", "pt": "Este widget mostra no ecrã inicial o resumo de um projeto Share: saldo pessoal, quanto deves, quanto te devem e a última atividade. O projeto pode ser escolhido aqui como padrão e também no botão de configuração ao adicionares o widget.", "pl": "Ten widżet pokazuje na ekranie głównym podsumowanie projektu Share: saldo osobiste, ile jesteś winien, ile inni są winni tobie i ostatnią aktywność. Projekt można wybrać tutaj jako domyślny, a także przyciskiem konfiguracji podczas dodawania widżetu.", "nl": "Deze widget toont op het startscherm de samenvatting van een Share-project: persoonlijk saldo, wat jij verschuldigd bent, wat anderen jou verschuldigd zijn en de laatste activiteit. Het project kan hier als standaard worden gekozen en ook via de configuratieknop wanneer je de widget toevoegt.", "ro": "Acest widget afișează pe ecranul principal rezumatul unui proiect Share: sold personal, cât datorezi, cât îți datorează alții și ultima activitate. Proiectul selectat aici este folosit ca implicit și și de butonul de configurare când adaugi widgetul.", "el": "Αυτό το widget εμφανίζει στην αρχική οθόνη μια σύνοψη του έργου Share: προσωπικό υπόλοιπο, πόσα οφείλεις, πόσα σου οφείλουν και την τελευταία δραστηριότητα. Το έργο που επιλέγεται εδώ χρησιμοποιείται ως προεπιλογή και επίσης από το κουμπί ρύθμισης όταν προσθέτεις το widget."}};
    var EXTRA_TRANSLATIONS_1633={"Scegli la lista, aggiungi prodotti e spunta quelli già messi nel carrello.":{"it":"Scegli la lista, aggiungi prodotti e spunta quelli già messi nel carrello.","en":"Choose a list, add products and tick the items already in your cart.","es":"Elige la lista, añade productos y marca los que ya están en el carrito.","fr":"Choisissez la liste, ajoutez des produits et cochez ceux déjà dans le panier.","de":"Wähle die Liste, füge Produkte hinzu und markiere die Artikel im Einkaufswagen.","pt":"Escolhe a lista, adiciona produtos e marca os que já estão no carrinho.","pl":"Wybierz listę, dodaj produkty i zaznacz te, które są już w koszyku.","nl":"Kies de lijst, voeg producten toe en vink de artikelen aan die al in je winkelwagen liggen.","ro":"Alege lista, adaugă produse și bifează articolele deja puse în coș.","el":"Επιλέξτε λίστα, προσθέστε προϊόντα και σημειώστε όσα είναι ήδη στο καλάθι."},"Tocca il prodotto per aggiungerlo alla lista.":{"it":"Tocca il prodotto per aggiungerlo alla lista.","en":"Tap the product to add it to the list.","es":"Toca el producto para añadirlo a la lista.","fr":"Touchez le produit pour l’ajouter à la liste.","de":"Tippe auf das Produkt, um es zur Liste hinzuzufügen.","pt":"Toca no produto para o adicionar à lista.","pl":"Dotknij produktu, aby dodać go do listy.","nl":"Tik op het product om het aan de lijst toe te voegen.","ro":"Atinge produsul pentru a-l adăuga în listă.","el":"Πατήστε το προϊόν για να το προσθέσετε στη λίστα."},"Visibilità, collegamento a patrimonio e movimenti":{"it":"Visibilità, collegamento a patrimonio e movimenti","en":"Visibility, connection to assets and transactions","es":"Visibilidad, conexión con patrimonio y movimientos","fr":"Visibilité, lien avec patrimoine et mouvements","de":"Sichtbarkeit, Verknüpfung mit Vermögen und Bewegungen","pt":"Visibilidade, ligação a património e movimentos","pl":"Widoczność, połączenie z majątkiem i ruchami","nl":"Zichtbaarheid, koppeling met vermogen en bewegingen","ro":"Vizibilitate, legătură cu patrimoniu și mișcări","el":"Ορατότητα, σύνδεση με περιουσία και κινήσεις"},"Aree lista spesa, fidelity card e prepagate":{"it":"Aree lista spesa, fidelity card e prepagate","en":"Shopping list areas, loyalty cards and prepaid cards","es":"Áreas de la lista de la compra, tarjetas fidelidad y prepago","fr":"Rayons de la liste de courses, cartes fidélité et prépayées","de":"Einkaufslistenbereiche, Kundenkarten und Prepaid-Karten","pt":"Áreas da lista de compras, cartões fidelidade e pré-pagos","pl":"Obszary listy zakupów, karty lojalnościowe i przedpłacone","nl":"Boodschappenlijstgebieden, klantenkaarten en prepaidkaarten","ro":"Zone listă cumpărături, carduri fidelitate și preplătite","el":"Περιοχές λίστας αγορών, κάρτες πελάτη και προπληρωμένες"},"Carte fidelity e prepagate":{"it":"Carte fidelity e prepagate","en":"Loyalty and prepaid cards","es":"Tarjetas fidelidad y prepago","fr":"Cartes fidélité et prépayées","de":"Kunden- und Prepaid-Karten","pt":"Cartões fidelidade e pré-pagos","pl":"Karty lojalnościowe i przedpłacone","nl":"Klanten- en prepaidkaarten","ro":"Carduri fidelitate și preplătite","el":"Κάρτες πελάτη και προπληρωμένες"},"Riporta nel patrimonio":{"it":"Riporta nel patrimonio","en":"Include in assets","es":"Incluir en patrimonio","fr":"Inclure dans le patrimoine","de":"In Vermögen aufnehmen","pt":"Incluir no património","pl":"Uwzględnij w majątku","nl":"Opnemen in vermogen","ro":"Include în patrimoniu","el":"Συμπερίληψη στην περιουσία"},"Consente di creare una voce Patrimonio collegata al Saldo del debito o credito.":{"it":"Consente di creare una voce Patrimonio collegata al Saldo del debito o credito.","en":"Allows creating an asset item linked to the debt or credit balance.","es":"Permite crear una partida de patrimonio vinculada al saldo de la deuda o crédito.","fr":"Permet de créer un élément de patrimoine lié au solde de la dette ou du crédit.","de":"Ermöglicht einen Vermögenseintrag, der mit dem Saldo der Schuld oder des Guthabens verknüpft ist.","pt":"Permite criar um item de património ligado ao saldo da dívida ou crédito.","pl":"Pozwala utworzyć pozycję majątku połączoną z saldem długu lub należności.","nl":"Maakt een vermogensitem aan dat gekoppeld is aan het saldo van de schuld of het tegoed.","ro":"Permite crearea unui element de patrimoniu legat de soldul datoriei sau creditului.","el":"Επιτρέπει τη δημιουργία στοιχείου περιουσίας συνδεδεμένου με το υπόλοιπο χρέους ή πίστωσης."},"Consente di creare una voce patrimonio collegata al saldo del debito o credito.":{"it":"Consente di creare una voce patrimonio collegata al saldo del debito o credito.","en":"Allows creating an asset item linked to the debt or credit balance.","es":"Permite crear una partida de patrimonio vinculada al saldo de la deuda o crédito.","fr":"Permet de créer un élément de patrimoine lié au solde de la dette ou du crédit.","de":"Ermöglicht einen Vermögenseintrag, der mit dem Saldo der Schuld oder des Guthabens verknüpft ist.","pt":"Permite criar um item de património ligado ao saldo da dívida ou crédito.","pl":"Pozwala utworzyć pozycję majątku połączoną z saldem długu lub należności.","nl":"Maakt een vermogensitem aan dat gekoppeld is aan het saldo van de schuld of het tegoed.","ro":"Permite crearea unui element de patrimoniu legat de soldul datoriei sau creditului.","el":"Επιτρέπει τη δημιουργία στοιχείου περιουσίας συνδεδεμένου με το υπόλοιπο χρέους ή πίστωσης."},"Riporta nei movimenti":{"it":"Riporta nei movimenti","en":"Include in transactions","es":"Incluir en movimientos","fr":"Inclure dans les mouvements","de":"In Bewegungen aufnehmen","pt":"Incluir nos movimentos","pl":"Uwzględnij w ruchach","nl":"Opnemen in bewegingen","ro":"Include în mișcări","el":"Συμπερίληψη στις κινήσεις"},"Consente di creare entrate o uscite partendo dal Saldo del debito o credito.":{"it":"Consente di creare entrate o uscite partendo dal Saldo del debito o credito.","en":"Allows creating income or expenses from the debt or credit balance.","es":"Permite crear ingresos o gastos a partir del saldo de la deuda o crédito.","fr":"Permet de créer des entrées ou sorties à partir du solde de la dette ou du crédit.","de":"Ermöglicht Einnahmen oder Ausgaben aus dem Saldo der Schuld oder des Guthabens.","pt":"Permite criar entradas ou saídas a partir do saldo da dívida ou crédito.","pl":"Pozwala tworzyć przychody lub wydatki z salda długu lub należności.","nl":"Maakt inkomsten of uitgaven aan op basis van het saldo van de schuld of het tegoed.","ro":"Permite crearea de venituri sau cheltuieli pornind de la soldul datoriei sau creditului.","el":"Επιτρέπει τη δημιουργία εσόδων ή εξόδων από το υπόλοιπο χρέους ή πίστωσης."},"Consente di creare entrate o uscite partendo dal saldo del debito o credito.":{"it":"Consente di creare entrate o uscite partendo dal saldo del debito o credito.","en":"Allows creating income or expenses from the debt or credit balance.","es":"Permite crear ingresos o gastos a partir del saldo de la deuda o crédito.","fr":"Permet de créer des entrées ou sorties à partir du solde de la dette ou du crédit.","de":"Ermöglicht Einnahmen oder Ausgaben aus dem Saldo der Schuld oder des Guthabens.","pt":"Permite criar entradas ou saídas a partir do saldo da dívida ou crédito.","pl":"Pozwala tworzyć przychody lub wydatki z salda długu lub należności.","nl":"Maakt inkomsten of uitgaven aan op basis van het saldo van de schuld of het tegoed.","ro":"Permite crearea de venituri sau cheltuieli pornind de la soldul datoriei sau creditului.","el":"Επιτρέπει τη δημιουργία εσόδων ή εξόδων από το υπόλοιπο χρέους ή πίστωσης."},"Gestisci le aree dei prodotti e scegli icona e area predefinita.":{"it":"Gestisci le aree dei prodotti e scegli icona e area predefinita.","en":"Manage product areas and choose the icon and default area.","es":"Gestiona las áreas de productos y elige icono y área predeterminada.","fr":"Gérez les rayons des produits et choisissez l’icône et le rayon par défaut.","de":"Verwalte Produktbereiche und wähle Symbol und Standardbereich.","pt":"Gere as áreas dos produtos e escolhe ícone e área predefinida.","pl":"Zarządzaj obszarami produktów oraz wybierz ikonę i obszar domyślny.","nl":"Beheer productgebieden en kies het pictogram en standaardgebied.","ro":"Gestionează zonele produselor și alege pictograma și zona implicită.","el":"Διαχειριστείτε τις περιοχές προϊόντων και επιλέξτε εικονίδιο και προεπιλεγμένη περιοχή."},"Colore usato nella lista quando un prodotto è già nel carrello.":{"it":"Colore usato nella lista quando un prodotto è già nel carrello.","en":"Color used in the list when a product is already in the cart.","es":"Color usado en la lista cuando un producto ya está en el carrito.","fr":"Couleur utilisée dans la liste lorsqu’un produit est déjà dans le panier.","de":"Farbe in der Liste, wenn ein Produkt bereits im Wagen ist.","pt":"Cor usada na lista quando um produto já está no carrinho.","pl":"Kolor używany na liście, gdy produkt jest już w koszyku.","nl":"Kleur in de lijst wanneer een product al in de winkelwagen staat.","ro":"Culoare folosită în listă când un produs este deja în coș.","el":"Χρώμα στη λίστα όταν ένα προϊόν είναι ήδη στο καλάθι."},"Top summary, number of icons and section order":{"it":"Riepilogo alto, numero icone e ordine delle sezioni","en":"Top summary, number of icons and section order","es":"Resumen superior, número de iconos y orden de secciones","fr":"Résumé supérieur, nombre d’icônes et ordre des sections","de":"Obere Zusammenfassung, Anzahl der Symbole und Abschnittsreihenfolge","pt":"Resumo superior, número de ícones e ordem das secções","pl":"Górne podsumowanie, liczba ikon i kolejność sekcji","nl":"Bovenste samenvatting, aantal pictogrammen en volgorde van secties","ro":"Rezumat superior, număr de pictograme și ordinea secțiunilor","el":"Επάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων"},"Riepilogo alto, numero icone e ordine delle sezioni":{"it":"Riepilogo alto, numero icone e ordine delle sezioni","en":"Top summary, number of icons and section order","es":"Resumen superior, número de iconos y orden de secciones","fr":"Résumé supérieur, nombre d’icônes et ordre des sections","de":"Obere Zusammenfassung, Anzahl der Symbole und Abschnittsreihenfolge","pt":"Resumo superior, número de ícones e ordem das secções","pl":"Górne podsumowanie, liczba ikon i kolejność sekcji","nl":"Bovenste samenvatting, aantal pictogrammen en volgorde van secties","ro":"Rezumat superior, număr de pictograme și ordinea secțiunilor","el":"Επάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων"},"Configurazione widget Android":{"it":"Configurazione widget Android","en":"Android widget configuration","es":"Configuración de widgets Android","fr":"Configuration des widgets Android","de":"Android-Widget-Konfiguration","pt":"Configuração dos widgets Android","pl":"Konfiguracja widżetów Android","nl":"Android-widgetconfiguratie","ro":"Configurare widgeturi Android","el":"Ρύθμιση widget Android"},"Widget ingresso rapido":{"it":"Widget ingresso rapido","en":"Quick entry widget","es":"Widget de entrada rápida","fr":"Widget de saisie rapide","de":"Schnelleingabe-Widget","pt":"Widget de entrada rápida","pl":"Widżet szybkiego wpisu","nl":"Widget snelle invoer","ro":"Widget introducere rapidă","el":"Widget γρήγορης εισαγωγής"},"Incluso nel piano gratuito. Logo fAInance, pulsanti Entrata/Uscita e layout 1x4 in una sola riga":{"it":"Incluso nel piano gratuito. Logo fAInance, pulsanti Entrata/Uscita e layout 1x4 in una sola riga","en":"Included in the free plan. fAInance logo, income/expense buttons and 1x4 layout in one row","es":"Incluido en el plan gratuito. Logo fAInance, botones Entrada/Salida y diseño 1x4 en una sola fila","fr":"Inclus dans le plan gratuit. Logo fAInance, boutons Entrée/Sortie et disposition 1x4 sur une seule ligne","de":"Im Gratis-Plan enthalten. fAInance-Logo, Einnahmen/Ausgaben-Schaltflächen und 1x4-Layout in einer Zeile","pt":"Incluído no plano gratuito. Logo fAInance, botões Entrada/Saída e layout 1x4 numa só linha","pl":"Dostępne w planie darmowym. Logo fAInance, przyciski Przychód/Wydatek i układ 1x4 w jednym wierszu","nl":"Inbegrepen in het gratis plan. fAInance-logo, knoppen Inkomsten/Uitgaven en 1x4-indeling op één rij","ro":"Inclus în planul gratuit. Logo fAInance, butoane Venit/Cheltuială și aspect 1x4 pe un singur rând","el":"Περιλαμβάνεται στο δωρεάν πλάνο. Λογότυπο fAInance, κουμπιά Έσοδα/Έξοδα και διάταξη 1x4 σε μία γραμμή"},"Lista spesa":{"it":"Lista spesa","en":"Shopping list","es":"Lista de la compra","fr":"Liste de courses","de":"Einkaufsliste","pt":"Lista de compras","pl":"Lista zakupów","nl":"Boodschappenlijst","ro":"Listă de cumpărături","el":"Λίστα αγορών"},"Visualizza la lista della spesa e permette di segnare gli articoli acquistati.":{"it":"Visualizza la lista della spesa e permette di segnare gli articoli acquistati.","en":"Shows the shopping list and lets you mark purchased items.","es":"Muestra la lista de la compra y permite marcar los artículos comprados.","fr":"Affiche la liste de courses et permet de marquer les articles achetés.","de":"Zeigt die Einkaufsliste und lässt gekaufte Artikel markieren.","pt":"Mostra a lista de compras e permite marcar os artigos comprados.","pl":"Pokazuje listę zakupów i pozwala oznaczać kupione produkty.","nl":"Toont de boodschappenlijst en laat gekochte artikelen markeren.","ro":"Afișează lista de cumpărături și permite marcarea articolelor cumpărate.","el":"Εμφανίζει τη λίστα αγορών και επιτρέπει τη σήμανση των αγορασμένων ειδών."},"Mostra la lista della spesa e permette di segnare gli articoli acquistati.":{"it":"Mostra la lista della spesa e permette di segnare gli articoli acquistati.","en":"Shows the shopping list and lets you mark purchased items.","es":"Muestra la lista de la compra y permite marcar los artículos comprados.","fr":"Affiche la liste de courses et permet de marquer les articles achetés.","de":"Zeigt die Einkaufsliste und lässt gekaufte Artikel markieren.","pt":"Mostra a lista de compras e permite marcar os artigos comprados.","pl":"Pokazuje listę zakupów i pozwala oznaczać kupione produkty.","nl":"Toont de boodschappenlijst en laat gekochte artikelen markeren.","ro":"Afișează lista de cumpărături și permite marcarea articolelor cumpărate.","el":"Εμφανίζει τη λίστα αγορών και επιτρέπει τη σήμανση των αγορασμένων ειδών."},"Fidelity card":{"it":"Fidelity card","en":"Loyalty card","es":"Tarjeta fidelidad","fr":"Carte fidélité","de":"Kundenkarte","pt":"Cartão fidelidade","pl":"Karta lojalnościowa","nl":"Klantenkaart","ro":"Card fidelitate","el":"Κάρτα πελάτη"},"Visualizza rapidamente una fidelity card o una prepagata.":{"it":"Visualizza rapidamente una fidelity card o una prepagata.","en":"Quickly shows a loyalty or prepaid card.","es":"Muestra rápidamente una tarjeta fidelidad o prepago.","fr":"Affiche rapidement une carte fidélité ou prépayée.","de":"Zeigt schnell eine Kunden- oder Prepaid-Karte.","pt":"Mostra rapidamente um cartão fidelidade ou pré-pago.","pl":"Szybko pokazuje kartę lojalnościową lub przedpłaconą.","nl":"Toont snel een klantenkaart of prepaidkaart.","ro":"Afișează rapid un card fidelitate sau preplătit.","el":"Εμφανίζει γρήγορα μια κάρτα πελάτη ή προπληρωμένη."},"Debiti / Crediti":{"it":"Debiti / Crediti","en":"Debts / Credits","es":"Deudas / Créditos","fr":"Dettes / Crédits","de":"Schulden / Guthaben","pt":"Dívidas / Créditos","pl":"Długi / Należności","nl":"Schulden / Tegoeden","ro":"Datorii / Credite","el":"Χρέη / Πιστώσεις"},"Mostra il saldo aperto di debiti e crediti.":{"it":"Mostra il saldo aperto di debiti e crediti.","en":"Shows the open balance of debts and credits.","es":"Muestra el saldo abierto de deudas y créditos.","fr":"Affiche le solde ouvert des dettes et crédits.","de":"Zeigt den offenen Saldo von Schulden und Guthaben.","pt":"Mostra o saldo em aberto de dívidas e créditos.","pl":"Pokazuje otwarte saldo długów i należności.","nl":"Toont het open saldo van schulden en tegoeden.","ro":"Afișează soldul deschis al datoriilor și creditelor.","el":"Εμφανίζει το ανοικτό υπόλοιπο χρεών και πιστώσεων."},"Icon color":{"it":"Colore icona","en":"Icon color","es":"Color del icono","fr":"Couleur de l’icône","de":"Symbolfarbe","pt":"Cor do ícone","pl":"Kolor ikony","nl":"Pictogramkleur","ro":"Culoare pictogramă","el":"Χρώμα εικονιδίου"},"Title color":{"it":"Colore titolo","en":"Title color","es":"Color del título","fr":"Couleur du titre","de":"Titelfarbe","pt":"Cor do título","pl":"Kolor tytułu","nl":"Titelkleur","ro":"Culoare titlu","el":"Χρώμα τίτλου"},"Text color":{"it":"Colore testo","en":"Text color","es":"Color del texto","fr":"Couleur du texte","de":"Textfarbe","pt":"Cor do texto","pl":"Kolor tekstu","nl":"Tekstkleur","ro":"Culoare text","el":"Χρώμα κειμένου"},"Project shown in the widget":{"it":"Progetto mostrato nel widget","en":"Project shown in the widget","es":"Proyecto mostrado en el widget","fr":"Projet affiché dans le widget","de":"Im Widget angezeigtes Projekt","pt":"Projeto mostrado no widget","pl":"Projekt pokazany w widżecie","nl":"Project getoond in de widget","ro":"Proiect afișat în widget","el":"Έργο που εμφανίζεται στο widget"},"Save and update widget":{"it":"Salva e aggiorna widget","en":"Save and update widget","es":"Guardar y actualizar widget","fr":"Enregistrer et mettre à jour le widget","de":"Widget speichern und aktualisieren","pt":"Guardar e atualizar widget","pl":"Zapisz i zaktualizuj widżet","nl":"Widget opslaan en bijwerken","ro":"Salvează și actualizează widgetul","el":"Αποθήκευση και ενημέρωση widget"},"Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":{"it":"Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.","en":"You choose the exact content when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.","es":"El contenido exacto se elige al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.","fr":"Le contenu exact se choisit lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.","de":"Den genauen Inhalt wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.","pt":"O conteúdo exato é escolhido ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.","pl":"Dokładną treść wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.","nl":"De exacte inhoud kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.","ro":"Conținutul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.","el":"Το ακριβές περιεχόμενο επιλέγεται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση."},"La carta precisa si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":{"it":"La carta precisa si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.","en":"You choose the exact card when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.","es":"La tarjeta exacta se elige al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.","fr":"La carte exacte se choisit lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.","de":"Die genaue Karte wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.","pt":"O cartão exato é escolhido ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.","pl":"Dokładną kartę wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.","nl":"De exacte kaart kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.","ro":"Cardul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.","el":"Η ακριβής κάρτα επιλέγεται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση."},"I debiti e crediti precisi si scelgono quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":{"it":"I debiti e crediti precisi si scelgono quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.","en":"You choose the exact debts and credits when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.","es":"Las deudas y créditos exactos se eligen al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.","fr":"Les dettes et crédits exacts se choisissent lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.","de":"Die genauen Schulden und Guthaben wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.","pt":"As dívidas e créditos exatos são escolhidos ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.","pl":"Dokładne długi i należności wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.","nl":"De exacte schulden en tegoeden kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.","ro":"Datoriile și creditele exacte se aleg când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.","el":"Τα ακριβή χρέη και πιστώσεις επιλέγονται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση."},"Grandezza testo":{"it":"Grandezza testo","en":"Text size","es":"Tamaño del texto","fr":"Taille du texte","de":"Textgröße","pt":"Tamanho do texto","pl":"Rozmiar tekstu","nl":"Tekstgrootte","ro":"Dimensiune text","el":"Μέγεθος κειμένου"},"Dimensione del contenuto mostrato nel widget.":{"it":"Dimensione del contenuto mostrato nel widget.","en":"Size of the content shown in the widget.","es":"Tamaño del contenido mostrado en el widget.","fr":"Taille du contenu affiché dans le widget.","de":"Größe des im Widget angezeigten Inhalts.","pt":"Tamanho do conteúdo mostrado no widget.","pl":"Rozmiar treści pokazywanej w widżecie.","nl":"Grootte van de inhoud die in de widget wordt getoond.","ro":"Dimensiunea conținutului afișat în widget.","el":"Μέγεθος του περιεχομένου που εμφανίζεται στο widget."},"Trasparenza sfondo widget":{"it":"Trasparenza sfondo widget","en":"Widget background transparency","es":"Transparencia del fondo del widget","fr":"Transparence du fond du widget","de":"Widget-Hintergrundtransparenz","pt":"Transparência do fundo do widget","pl":"Przezroczystość tła widżetu","nl":"Transparantie van widgetachtergrond","ro":"Transparență fundal widget","el":"Διαφάνεια φόντου widget"},"100% = completamente trasparente. 0% = sfondo pieno.":{"it":"100% = completamente trasparente. 0% = sfondo pieno.","en":"100% = fully transparent. 0% = solid background.","es":"100% = totalmente transparente. 0% = fondo sólido.","fr":"100 % = totalement transparent. 0 % = fond plein.","de":"100 % = vollständig transparent. 0 % = voller Hintergrund.","pt":"100% = totalmente transparente. 0% = fundo sólido.","pl":"100% = całkowicie przezroczyste. 0% = pełne tło.","nl":"100% = volledig transparant. 0% = volle achtergrond.","ro":"100% = complet transparent. 0% = fundal plin.","el":"100% = πλήρως διαφανές. 0% = πλήρες φόντο."},"Aggiornamento automatico":{"it":"Aggiornamento automatico","en":"Automatic update","es":"Actualización automática","fr":"Mise à jour automatique","de":"Automatische Aktualisierung","pt":"Atualização automática","pl":"Automatyczna aktualizacja","nl":"Automatische update","ro":"Actualizare automată","el":"Αυτόματη ενημέρωση"},"Aggiorna i widget già installati quando cambi contenuti o impostazioni.":{"it":"Aggiorna i widget già installati quando cambi contenuti o impostazioni.","en":"Updates already installed widgets when you change content or settings.","es":"Actualiza los widgets ya instalados cuando cambias contenidos o ajustes.","fr":"Met à jour les widgets déjà installés lorsque vous changez du contenu ou des paramètres.","de":"Aktualisiert bereits installierte Widgets, wenn du Inhalte oder Einstellungen änderst.","pt":"Atualiza os widgets já instalados quando alteras conteúdos ou definições.","pl":"Aktualizuje już zainstalowane widżety po zmianie treści lub ustawień.","nl":"Werkt al geïnstalleerde widgets bij wanneer je inhoud of instellingen wijzigt.","ro":"Actualizează widgeturile deja instalate când schimbi conținutul sau setările.","el":"Ενημερώνει τα ήδη εγκατεστημένα widget όταν αλλάζετε περιεχόμενο ή ρυθμίσεις."},"Colore icona":{"it":"Colore icona","en":"Icon color","es":"Color del icono","fr":"Couleur de l’icône","de":"Symbolfarbe","pt":"Cor do ícone","pl":"Kolor ikony","nl":"Pictogramkleur","ro":"Culoare pictogramă","el":"Χρώμα εικονιδίου"},"Colore titolo":{"it":"Colore titolo","en":"Title color","es":"Color del título","fr":"Couleur du titre","de":"Titelfarbe","pt":"Cor do título","pl":"Kolor tytułu","nl":"Titelkleur","ro":"Culoare titlu","el":"Χρώμα τίτλου"},"Colore testo":{"it":"Colore testo","en":"Text color","es":"Color del texto","fr":"Couleur du texte","de":"Textfarbe","pt":"Cor do texto","pl":"Kolor tekstu","nl":"Tekstkleur","ro":"Culoare text","el":"Χρώμα κειμένου"},"Progetto mostrato nel widget":{"it":"Progetto mostrato nel widget","en":"Project shown in the widget","es":"Proyecto mostrado en el widget","fr":"Projet affiché dans le widget","de":"Im Widget angezeigtes Projekt","pt":"Projeto mostrado no widget","pl":"Projekt pokazany w widżecie","nl":"Project getoond in de widget","ro":"Proiect afișat în widget","el":"Έργο που εμφανίζεται στο widget"},"Salva e aggiorna widget":{"it":"Salva e aggiorna widget","en":"Save and update widget","es":"Guardar y actualizar widget","fr":"Enregistrer et mettre à jour le widget","de":"Widget speichern und aktualisieren","pt":"Guardar e atualizar widget","pl":"Zapisz i zaktualizuj widżet","nl":"Widget opslaan en bijwerken","ro":"Salvează și actualizează widgetul","el":"Αποθήκευση και ενημέρωση widget"}};Object.keys(EXTRA_TRANSLATIONS_1633).forEach(function(x){D[x]=EXTRA_TRANSLATIONS_1633[x];});var WIDGET_ALIAS_TRANSLATIONS_1634={"Icon Color":{"it":"Colore icona","en":"Icon color","es":"Color del icono","fr":"Couleur de l’icône","de":"Symbolfarbe","pt":"Cor do ícone","pl":"Kolor ikony","nl":"Pictogramkleur","ro":"Culoare pictogramă","el":"Χρώμα εικονιδίου"},"Title Color":{"it":"Colore titolo","en":"Title color","es":"Color del título","fr":"Couleur du titre","de":"Titelfarbe","pt":"Cor do título","pl":"Kolor tytułu","nl":"Titelkleur","ro":"Culoare titlu","el":"Χρώμα τίτλου"},"Text Color":{"it":"Colore testo","en":"Text color","es":"Color del texto","fr":"Couleur du texte","de":"Textfarbe","pt":"Cor do texto","pl":"Kolor tekstu","nl":"Tekstkleur","ro":"Culoare text","el":"Χρώμα κειμένου"},"Background Transparency":{"it":"Trasparenza sfondo widget","en":"Widget background transparency","es":"Transparencia del fondo del widget","fr":"Transparence du fond du widget","de":"Widget-Hintergrundtransparenz","pt":"Transparência do fundo do widget","pl":"Przezroczystość tła widżetu","nl":"Transparantie widgetachtergrond","ro":"Transparență fundal widget","el":"Διαφάνεια φόντου widget"},"Save and Update widget":{"it":"Salva e aggiorna widget","en":"Save and update widget","es":"Guardar y actualizar widget","fr":"Enregistrer et mettre à jour le widget","de":"Widget speichern und aktualisieren","pt":"Guardar e atualizar widget","pl":"Zapisz i zaktualizuj widżet","nl":"Widget opslaan en bijwerken","ro":"Salvează și actualizează widgetul","el":"Αποθήκευση και ενημέρωση widget"},"Save and update widget":{"it":"Salva e aggiorna widget","en":"Save and update widget","es":"Guardar y actualizar widget","fr":"Enregistrer et mettre à jour le widget","de":"Widget speichern und aktualisieren","pt":"Guardar e atualizar widget","pl":"Zapisz i zaktualizuj widżet","nl":"Widget opslaan en bijwerken","ro":"Salvează și actualizează widgetul","el":"Αποθήκευση και ενημέρωση widget"},"Show percentage":{"it":"Mostra percentuale","en":"Show percentage","es":"Mostrar porcentaje","fr":"Afficher le pourcentage","de":"Prozent anzeigen","pt":"Mostrar percentagem","pl":"Pokaż procent","nl":"Percentage tonen","ro":"Afișează procentul","el":"Εμφάνιση ποσοστού"},"Show amounts":{"it":"Mostra importi","en":"Show amounts","es":"Mostrar importes","fr":"Afficher les montants","de":"Beträge anzeigen","pt":"Mostrar valores","pl":"Pokaż kwoty","nl":"Bedragen tonen","ro":"Afișează sumele","el":"Εμφάνιση ποσών"},"Bar color":{"it":"Colore barra","en":"Bar color","es":"Color de la barra","fr":"Couleur de la barre","de":"Balkenfarbe","pt":"Cor da barra","pl":"Kolor paska","nl":"Balkkleur","ro":"Culoarea barei","el":"Χρώμα γραμμής"},"Percentage color":{"it":"Colore percentuale","en":"Percentage color","es":"Color del porcentaje","fr":"Couleur du pourcentage","de":"Prozentfarbe","pt":"Cor da percentagem","pl":"Kolor procentu","nl":"Percentagekleur","ro":"Culoarea procentului","el":"Χρώμα ποσοστού"}};Object.keys(WIDGET_ALIAS_TRANSLATIONS_1634).forEach(function(x){D[x]=WIDGET_ALIAS_TRANSLATIONS_1634[x];});var row=D[k];
    if(row&&row[code])return raw.replace(k,row[code]);
    return raw;
  }

  function translateUiRuntimeText(value){
    var forced=translateCriticalUiText(value, lang);
    if(forced!==String(value==null?"":value))return forced;
    return translateFainanceText(value, lang);
  }
  useEffect(function(){
    try{(window as any).fainanceTranslateUi=function(value){return translateUiRuntimeText(value);};}catch(e){}
    return function(){try{delete (window as any).fainanceTranslateUi;}catch(e){}};
  },[lang]);
  useEffect(function(){
    // 1.6.61: traduzione runtime esatta sui nodi nuovi, senza osservare le modifiche di testo/attributi che crea essa stessa.
    // Mantiene le traduzioni legacy senza innescare sfarfallii continui.
    if(typeof document==="undefined")return;
    var root=document.getElementById("root");
    if(!root)return;
    var map=runtimeTranslationMap||{};
    var normalizedMap={};
    function repairMojibake(value){
      var raw=String(value==null?"":value);
      if(!/[������]/.test(raw))return raw;
      try{
        var decoded=decodeURIComponent(escape(raw));
        if(decoded&&decoded!==raw&&decoded.indexOf("�")<0)return decoded;
      }catch(e){}
      return raw;
    }
    function norm(v){return String(v||"").replace(/�/g,"").replace(/’|‘|’|‘|`/g,"'").replace(/“|��|“|”/g,'"').normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
    Object.keys(map).forEach(function(k){var nk=norm(k);if(nk&&!normalizedMap[nk])normalizedMap[nk]=map[k];});
    function tx(value){
      if(value==null)return value;
      var raw=repairMojibake(String(value));
      var trimmed=raw.trim();
      if(!trimmed||trimmed.length<2)return raw;
      if(/^[\d\s.,:;€$%+\-()\/]+$/.test(trimmed))return raw;
      if(lang==="it"){
        var forcedIt=translateCriticalUiText(trimmed,"it");
        if(forcedIt&&forcedIt!==trimmed)return raw.replace(trimmed,forcedIt);
        var directIt=translateFainanceText(trimmed,"it");
        if(directIt&&directIt!==trimmed)return raw.replace(trimmed,directIt);
        var nextIt=map[trimmed]||normalizedMap[norm(trimmed)];
        if(nextIt&&nextIt!==trimmed&&String(nextIt).indexOf("�")<0)return raw.replace(trimmed,repairMojibake(String(nextIt)));
        return raw;
      }
      var forced=translateCriticalUiText(trimmed,lang);
      if(forced&&forced!==trimmed)return raw.replace(trimmed,forced);
      var direct=translateFainanceText(trimmed,lang);
      if(direct&&direct!==trimmed)return raw.replace(trimmed,direct);
      var next=map[trimmed]||normalizedMap[norm(trimmed)];
      if(!next){
        var pref=trimmed.match(/^([^A-Za-zÀ-ÿ0-9]+)\s*([\s\S]+)$/);
        if(pref&&pref[2]){
          var translatedTail=map[pref[2]]||normalizedMap[norm(pref[2])];
          if(translatedTail)next=pref[1]+String(translatedTail);
        }
      }
      if(!next||next===trimmed||String(next).indexOf("�")>=0)return raw;
      return raw.replace(trimmed,repairMojibake(String(next)));
    }
    function skip(el){
      if(!el||!el.tagName)return true;
      if(["SCRIPT","STYLE","NOSCRIPT","CODE","PRE","TEXTAREA"].includes(el.tagName))return true;
      if(el.closest&&el.closest('[data-no-translate="true"]'))return true;
      return false;
    }
    function applyExactTranslations(){
      try{
        var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
          if(!node.nodeValue||!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;
          var p=node.parentElement;if(skip(p))return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }});
        var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
        nodes.forEach(function(node){var next=tx(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;});
        root.querySelectorAll("input[placeholder],textarea[placeholder],[title],[aria-label],option[label]").forEach(function(el){
          if(skip(el))return;
          ["placeholder","title","aria-label","label"].forEach(function(attr){var v=el.getAttribute(attr);if(v){var next=tx(v);if(next!==v)el.setAttribute(attr,next);}});
        });
      }catch(e){}
    }
    // 1.6.73: niente MutationObserver continuo.
    // Esegue pochi passaggi schedulati quando cambia schermata/lingua/stato rilevante.
    // Questo mantiene le traduzioni legacy senza causare loop, sfarfallii o rallentamenti progressivi.
    var timers=[];
    function schedule(ms){timers.push(setTimeout(applyExactTranslations,ms));}
    schedule(20);
    schedule(180);
    schedule(650);
    return function(){timers.forEach(function(timer){clearTimeout(timer);});};
  },[lang,tab,settingsPage,speseSubTab,addSubTab,historyTab,shareProjectTab,patrimonioMode,aiTab,statsView]);
  function monthShortName(index){
    var names={
      it:["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"],
      en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
      es:["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
      fr:["Janv.","Fevr.","Mars","Avr.","Mai","Juin","Juil.","Aout","Sept.","Oct.","Nov.","Dec."],
      de:["Jan.","Feb.","Marz","Apr.","Mai","Juni","Juli","Aug.","Sept.","Okt.","Nov.","Dez."],
      pt:["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
      pl:["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paz","Lis","Gru"],
      nl:["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"],
      ro:["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Nov","Dec"],
      el:["Ιαν","Φεβ","Μαρ","Απρ","Μαι","Ιουν","Ιουλ","Αυγ","Σεπ","Οκτ","Νοε","Δεκ"]
    };
    var list=names[lang]||names.en;
    return list[index]||MONTHS_SHORT[index]||"";
  }
  function monthFullName(index){
    var names={
      it:MONTHS_FULL,
      en:["January","February","March","April","May","June","July","August","September","October","November","December"],
      es:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
      fr:["Janvier","Fevrier","Mars","Avril","Mai","Juin","Juillet","Aout","Septembre","Octobre","Novembre","Decembre"],
      de:["Januar","Februar","Marz","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
      pt:["Janeiro","Fevereiro","Marco","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
      pl:["Styczen","Luty","Marzec","Kwiecien","Maj","Czerwiec","Lipiec","Sierpien","Wrzesien","Pazdziernik","Listopad","Grudzien"],
      nl:["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"],
      ro:["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"],
      el:["Ιανουαριος","Φεβρουαριος","Μαρτιος","Απριλιος","Μαιος","Ιουνιος","Ιουλιος","Αυγουστος","Σεπτεμβριος","Οκτωβριος","Νοεμβριος","Δεκεμβριος"]
    };
    var list=names[lang]||names.en;
    return list[index]||MONTHS_FULL[index]||"";
  }
  function translatePopupText(value){
    var raw=String(value==null?"":value);
    if(!raw)return raw;
    var exact=translateUiRuntimeText(raw);
    if(exact&&exact!==raw)return exact;
    var out=raw;
    try{
      (runtimeTranslationKeys||[]).forEach(function(k){
        if(!k||k.length<10)return;
        var v=runtimeTranslationMap&&runtimeTranslationMap[k];
        if(!v||v===k)return;
        if(out.indexOf(k)>=0)out=out.split(k).join(String(v));
      });
    }catch(e){}
    return out;
  }
  function inferToastPresentation(text,base){
    var raw=String(text||"").toLowerCase();
    var b={...(base||{})};
    var isSuccess=/(aggiornat|salvat|creat|eliminat|pronto|registrat|accettat|inviat|caricat|ripristinat|copiat|aggiunt|modificat|password aggiornata|piano aggiornato|widget aggiornato)/i.test(text||"");
    var isBlock=/(errore|non puoi|non disponibile|non valido|non supportato|nessun valore|non completato|annullato|limite massimo|operazione extra non sbloccata|configurazione acquisto non disponibile|link supporto non disponibile|inserisci |seleziona almeno|raggiunto il limite|hai terminato|disponibile dal piano|available from the|available dal|non consentit)/i.test(text||"");
    var isWarn=/(sta per partire un annuncio|caricamento annuncio|in attesa|ti resta|ne hai ancora|guarda un annuncio|limiti inclusi|backup|ripristinare|conferma|continuare|attenzione|annuncio)/i.test(text||"");
    if(isBlock){b.type="error";b.color="#E24B4A";b.icon=b.icon||"🚫";}
    else if(isWarn){b.type=b.type||"warning";b.color=b.color||"#EF9F27";b.icon=b.icon||"⚠️";}
    else if(isSuccess){b.type=b.type||"success";b.color=b.color||"#1D9E75";b.icon=b.icon||"✅";}
    return b;
  }
  function setToast(msg){
    if(typeof msg==="function"){setToastState(msg);return;}
    if(!msg){setToastState(null);return;}
    var base=typeof msg==="object"&&!Array.isArray(msg)?msg:{text:String(msg)};
    var rawText=String((base&&base.text)||(base&&base.message)||"");
    var cleanBase={...base};
    var finalText=cleanBase.translated?String(rawText):translatePopupText(rawText);
    delete cleanBase.translated;
    cleanBase=inferToastPresentation(finalText,cleanBase);
    setToastState({...cleanBase,text:finalText,id:Date.now()+Math.random()});
  } 
  var [voiceModal,setVoiceModal]=useState(false);
  var [voiceListening,setVoiceListening]=useState(false);
  var [voiceText,setVoiceText]=useState("");
  var [voiceParsed,setVoiceParsed]=useState(null);
  var [voiceError,setVoiceError]=useState("");
  var [voiceConfirm,setVoiceConfirm]=useState(null);
  var [voiceSaving,setVoiceSaving]=useState(false);
  function openVoiceModal(autoStart?:any){if(!canUsePlanFeature("voiceEntry",1)){setToast({text:upgradeMessage("voiceEntry"),type:"error",color:"#E24B4A",icon:"🚫"});return;}setVoiceModal(true);setVoiceText("");setVoiceParsed(null);setVoiceError("");setVoiceListening(false);}
  var [aiDismissed,setAiDismissed]=useStorage(userKey("ai_dismissed_v1"),[]);
  var [aiChat,setAiChat]=useStorage(userKey("ai_chat_v1"),[]);
  var [aiDataAccess,setAiDataAccess]=useStorage(userKey("ai_data_access_v1"),"summary");
  var [aiFloatingEnabled,setAiFloatingEnabled]=useStorage(userKey("ai_floating_enabled_v1"),true);
  var [aiFloatingPos,setAiFloatingPos]=useStorage(userKey("ai_floating_pos_v1"),{right:18,bottom:78});
  var [aiFloatingDrag,setAiFloatingDrag]=useState(null);
  var [aiTab,setAiTab]=useStorage(userKey("ai_tab_v1"),"consigli");
  var [aiAdviceFilter,setAiAdviceFilter]=useState("all");
  var chatInputRef=useRef(null);
  var aiChatSectionRef=useRef(null);
  var [aiLoading,setAiLoading]=useState(false);
  useEffect(function(){if(aiTab==="prompt")setAiTab("chat");},[aiTab]);

  useEffect(function(){function h(){setIsMobile(window.innerWidth<900);}h();window.addEventListener("resize",h);return function(){window.removeEventListener("resize",h);};},[]);

  var btnStyleObj=BUTTON_STYLES.find(function(b){return b.id===btnStyle;})||BUTTON_STYLES[0];
  var btnRadius=btnStyleObj.r;
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  try{
    // 1.6.35: non nascondiamo più la UI a ogni cambio sezione.
    // Il vecchio flag data-fainance-i18n poteva lasciare la pagina opaca/ferma
    // mentre il traduttore runtime scansionava il DOM.
    if(typeof document!=="undefined")document.documentElement.removeAttribute("data-fainance-i18n");
  }catch(e){}
  useEffect(function(){
    // 1.6.51: niente MutationObserver per le traduzioni.
    // Evita ritardi nelle aperture delle sezioni e regressioni su testi già corretti.
    try{
      if(typeof document!=="undefined")document.documentElement.removeAttribute("data-fainance-i18n");
    }catch(e){}
  },[lang]);
  var themeObj=BG_THEMES.find(function(b){return b.id===bgTheme;})||BG_THEMES[0];
  var dark=themeObj.dark,bgColor=themeObj.bg;
  var cardBg=dark?"#1e1e30":"#fff",sideBg=dark?"#16162a":"#fff",borderC=dark?"#333":"#eee",textC=dark?"#eee":"#333",subC=dark?"#aaa":"#888",headerBg=dark?"#16162a":"#fff";
  var sym=(CURRENCIES.find(function(c){return c.code===currency;})||{symbol:"€"}).symbol;
  var fmt=function(n){return fmtAmt(n,sym);};
  var now=new Date(),curYear=now.getFullYear();
  var curMonthKey=curYear+"-"+String(now.getMonth()+1).padStart(2,"0");

  function getCat(id){return cats.find(function(c){return c.id===Number(id);});}
  function getMethod(id){return methods.find(function(m){return m.id===Number(id);});}
  function getIT(id){return incomeTypes.find(function(x){return x.id===id;});}
  function bulkMovementRowLimit(plan){
    if(plan==="free")return 10;
    if(plan==="base")return 15;
    return Infinity;
  }
  function bulkMovementCooldownMonths(plan){
    return 0;
  }
  function addMonthsSafe(ms,months){
    var d=new Date(Number(ms)||Date.now());
    var day=d.getDate();
    d.setMonth(d.getMonth()+Number(months||0));
    if(d.getDate()<day)d.setDate(0);
    return d.getTime();
  }
  function bulkMovementLastAt(){return Number((planUsage&&planUsage["bulkMovement:lastAt"])||0);}
  function bulkMovementNextAllowedAt(){
    var months=bulkMovementCooldownMonths(currentPlan);
    var last=bulkMovementLastAt();
    if(!months||!last)return 0;
    return addMonthsSafe(last,months);
  }
  function bulkMovementLocked(){
    if(bulkMovementCooldownMonths(currentPlan)<=0)return false;
    var next=bulkMovementNextAllowedAt();
    return !!next&&Date.now()<next;
  }
  function bulkMovementCooldownText(){
    var next=bulkMovementNextAllowedAt();
    if(!next)return "";
    var d=new Date(next);
    var dateText=d.toLocaleDateString((lang||"it")==="it"?"it-IT":undefined,{day:"2-digit",month:"2-digit",year:"numeric"});
    if(currentPlan==="base")return translateUiRuntimeText("Hai già usato un inserimento multiplo. Nel piano Base puoi usarne un altro tra 2 mesi, dal ")+dateText+".";
    return translateUiRuntimeText("Hai già usato un inserimento multiplo. Nel piano Gratis puoi usarne un altro tra 1 mese, dal ")+dateText+".";
  }
  var planLimits=PLAN_LIMITS[currentPlan]||PLAN_LIMITS.free;
  function planCount(key){return Number((planUsage&&planUsage[key])||0);}
  function planInc(key,delta){setPlanUsage(function(p){return {...(p||{}),[key]:Number((p&&p[key])||0)+(delta||1)};});}
  function usageKey(feature,period){return feature+":"+(period==="monthly"?monthUsageKey():todayUsageKey());}
  function rewardedFeatureConfig(feature){
    var cfg={
      manualMovement:{period:"daily",label:"movimenti",included:{free:2,base:4,premium:Infinity},rewarded:{free:2,base:2,premium:0},includedLabel:"movimenti inclusi",extraLabel:"movimenti extra con annuncio"},
      instalmentMovement:{period:"daily",label:"rateizzazioni",included:{free:2,base:4,premium:Infinity},rewarded:{free:0,base:0,premium:0},includedLabel:"rateizzazioni incluse",extraLabel:"rateizzazioni extra con annuncio"},
      receiptScan:{period:"daily",label:"scontrini",included:{free:1,base:3,premium:Infinity},rewarded:{free:1,base:1,premium:0},includedLabel:"scontrini inclusi",extraLabel:"scontrini extra con annuncio"},
      voiceEntry:{period:"daily",label:"comandi vocali",included:{free:1,base:3,premium:Infinity},rewarded:{free:1,base:1,premium:0},includedLabel:"comandi vocali inclusi",extraLabel:"comandi vocali extra con annuncio"},
      shareDailyExpenses:{period:"daily",label:"spese Share",included:{free:2,base:4,premium:Infinity},rewarded:{free:2,base:2,premium:0},includedLabel:"spese Share incluse",extraLabel:"spese Share extra con annuncio"},
      patrimonioCopy:{period:"monthly",label:"copie patrimonio",included:{free:2,base:5,premium:Infinity},rewarded:{free:2,base:2,premium:0},includedLabel:"copie patrimonio incluse",extraLabel:"copie patrimonio extra con annuncio"},
      bulkMovement:{period:"monthly",label:"blocchi multipli",included:{free:1,base:2,premium:Infinity},rewarded:{free:0,base:0,premium:0},includedLabel:"blocchi multipli inclusi",extraLabel:"blocchi multipli extra con annuncio"},
      aiReply:{period:"daily",label:"risposte AI",included:{free:4,base:10,premium:Infinity},rewarded:{free:2,base:3,premium:0},includedLabel:"risposte AI incluse",extraLabel:"risposte AI extra con annuncio"}
    };
    return cfg[feature]||null;
  }
  function featurePeriod(feature){var c=rewardedFeatureConfig(feature);return c&&c.period?c.period:"daily";}
  function featureUsageKey(feature){return usageKey(feature,featurePeriod(feature));}
  function featureExtraKey(feature){return usageKey(feature+"ExtraUnlocked",featurePeriod(feature));}
  function featureLimits(feature){
    var c=rewardedFeatureConfig(feature);
    if(c){
      var inc=(c.included&&c.included[currentPlan]!==undefined)?c.included[currentPlan]:Infinity;
      var rew=(c.rewarded&&c.rewarded[currentPlan]!==undefined)?c.rewarded[currentPlan]:0;
      return {included:inc,rewarded:rew,total:inc===Infinity?Infinity:(Number(inc||0)+Number(rew||0)),config:c};
    }
    var lim=Infinity;
    if(feature==="shareProjects")lim=planLimits.shareProjects;
    else if(feature==="goals")lim=planLimits.goals;
    else if(feature==="notes")lim=planLimits.notes;
    else if(feature==="bankNotes")lim=planLimits.bankNotes;
    else if(feature==="documents")lim=planLimits.documents;
    else if(feature==="alerts")lim=planLimits.alerts;
    else if(feature==="widgets")lim=planLimits.widgets;
    else if(feature==="recurringMovements")lim=planLimits.recurringMovements;
    return {included:lim,rewarded:0,total:lim,config:null};
  }
  function getPlanLimit(feature){return featureLimits(feature).total;}
  function featureLabel(feature){
    var m={manualMovement:"movimenti giornalieri",instalmentMovement:"rateizzazioni",bulkMovement:"movimenti multipli",receiptScan:"scontrini",voiceEntry:"inserimento vocale",aiReply:"risposte AI",shareProjects:"progetti Share",shareDailyExpenses:"spese Share giornaliere",patrimonioCopy:"copia patrimonio",recurringMovements:"movimenti ricorrenti",goals:"obiettivi",notes:"note",bankNotes:"coordinate bancarie",documents:"documenti",alerts:"alert",widgets:"widget"};
    return m[feature]||feature;
  }
  function featureUsed(feature,currentCount){
    if(rewardedFeatureConfig(feature))return planCount(featureUsageKey(feature));
    return Number(currentCount||0);
  }
  function planRemaining(feature,currentCount){
    var lim=featureLimits(feature);
    if(lim.total===Infinity)return Infinity;
    return Math.max(0,Number(lim.total)-featureUsed(feature,currentCount));
  }
  function upgradeMessage(feature,currentCount){
    var label=planLabel(currentPlan,lang);
    var rem=planRemaining(feature,currentCount);
    var remText=rem===Infinity?translateUiRuntimeText("illimitati"):String(rem);
    var f=translateUiRuntimeText(featureLabel(feature));
    function tr(s){return translateUiRuntimeText(s).replace("{plan}",label).replace("{feature}",f).replace("{remaining}",remText);}
    if(feature==="manualMovement")return tr("Limite giornaliero raggiunto. Hai già usato tutti i movimenti inclusi e quelli extra con annuncio.");
    if(feature==="instalmentMovement")return tr("Hai raggiunto il limite giornaliero di rateizzazioni del piano {plan}.");
    if(feature==="shareProjects")return tr("Hai raggiunto il limite per progetti Share nel piano {plan}.");
    if(feature==="shareDailyExpenses")return tr("Hai raggiunto il limite giornaliero di spese Share del piano {plan}.");
    if(feature==="patrimonioCopy")return tr("Hai raggiunto il limite mensile per copiare il patrimonio nel piano {plan}.");
    if(feature==="goals")return tr("Hai raggiunto il numero massimo di obiettivi del piano {plan}. Elimina un obiettivo oppure vai in Info per passare a un piano superiore. Restano: {remaining}.");
    if(feature==="bulkMovement"){
      var cd=bulkMovementCooldownText();
      if(cd)return cd;
      return tr("Hai raggiunto il limite per movimenti multipli nel piano {plan}.");
    }
    if(feature==="receiptScan")return tr("Hai raggiunto il limite giornaliero per lettura scontrini nel piano {plan}.");
    if(feature==="voiceEntry")return tr("Hai raggiunto il limite giornaliero per inserimento vocale nel piano {plan}.");
    if(feature==="notes")return tr("Hai raggiunto il numero massimo di appunti del piano {plan}.");
    if(feature==="bankNotes")return tr("Hai raggiunto il numero massimo di coordinate bancarie del piano {plan}.");
    if(feature==="documents")return tr("I documenti non sono disponibili nel piano {plan}. Vai in Info per passare al piano Base o Completo.");
    if(feature==="recurringMovements")return tr("Hai raggiunto il numero massimo di movimenti ricorrenti del piano {plan}.");
    return tr("Hai raggiunto il limite per {feature} nel piano {plan}. Restano: {remaining}. Vai in Info per passare a un piano superiore.");
  }
  function rewardedFeatureGateState(feature,amount){
    amount=Number(amount||1);
    var lim=featureLimits(feature);
    if(lim.total===Infinity)return {state:"open",limit:Infinity,used:0,remaining:Infinity};
    var used=planCount(featureUsageKey(feature));
    var included=Number(lim.included||0),rewarded=Number(lim.rewarded||0),total=Number(lim.total||0);
    if(used+amount<=included)return {state:"open",limit:total,used:used,remaining:total-used,included:included,rewarded:rewarded};
    if(used+amount>total)return {state:"blocked",limit:total,used:used,remaining:0,included:included,rewarded:rewarded,text:upgradeMessage(feature)};
    if(rewarded<=0)return {state:"blocked",limit:total,used:used,remaining:0,included:included,rewarded:rewarded,text:upgradeMessage(feature)};
    var needed=Math.max(0,used+amount-included);
    var unlocked=planCount(featureExtraKey(feature));
    if(unlocked>=needed)return {state:"open",limit:total,used:used,remaining:total-used,included:included,rewarded:rewarded,unlocked:unlocked};
    return {state:"ad",limit:total,used:used,remaining:total-used,included:included,rewarded:rewarded,needed:needed,unlocked:unlocked,text:"Hai usato i limiti inclusi per "+featureLabel(feature)+". Guarda un annuncio per sbloccare 1 operazione extra."};
  }
  function unlockRewardedFeature(feature,amount){
    amount=Number(amount||1);
    var g=rewardedFeatureGateState(feature,amount);
    if(g.state==="blocked"){setToast({text:g.text,type:"error",color:"#E24B4A",icon:"🚫"});return false;}
    if(g.state==="ad")planInc(featureExtraKey(feature),1);
    return true;
  }
  function manualMovementUsage(){
    var g=rewardedFeatureGateState("manualMovement",1);
    var lim=featureLimits("manualMovement");
    var used=planCount(featureUsageKey("manualMovement"));
    var unlocked=planCount(featureExtraKey("manualMovement"));
    return {used:used,freeLimit:Number(lim.included||0),extraLimit:Number(lim.rewarded||0),totalLimit:lim.total,unlocked:unlocked,extraUsed:Math.max(0,used-Number(lim.included||0))};
  }
  function singleMovementGateState(){return rewardedFeatureGateState("manualMovement",1);}
  function unlockRewardedMovement(){return unlockRewardedFeature("manualMovement",1);}
  function featurePeriodText(feature){
    var c=rewardedFeatureConfig(feature)||{};
    return c.period==="monthly"?"questo mese":"oggi";
  }
  function featureUnitName(feature){
    var c=rewardedFeatureConfig(feature)||{};
    return c.label||featureLabel(feature);
  }
  function successToastForFeature(feature,label,usedAfterOverride){
    label=String(label||"Operazione completata.");
    var lim=featureLimits(feature);
    if(lim.total===Infinity)return {text:label,type:"success",color:"#1D9E75",icon:"✅"};
    var usedAfter=(usedAfterOverride!==undefined&&usedAfterOverride!==null)?Number(usedAfterOverride):planCount(featureUsageKey(feature));
    var included=Number(lim.included||0),rewarded=Number(lim.rewarded||0),total=Number(lim.total||0);
    var unit=featureUnitName(feature);
    var period=featurePeriodText(feature);
    var remainingIncluded=Math.max(0,included-usedAfter);
    var remainingExtra=Math.max(0,total-usedAfter);
    function oneMany(n,singular,plural){return Number(n)===1?singular:plural;}
    function extraAdText(n){return Number(n)===1?"1 con annuncio":n+" con annuncio";}
    if(usedAfter<included){
      if(feature==="manualMovement"){
        if(remainingIncluded===1&&rewarded>0)return {text:label+"\nTi resta 1 movimento gratuito oggi + "+extraAdText(rewarded)+".",type:"success",color:"#1D9E75",icon:"✅"};
        return {text:label+"\nTi "+oneMany(remainingIncluded,"resta","restano")+" "+remainingIncluded+" "+oneMany(remainingIncluded,"movimento gratuito","movimenti gratuiti")+" oggi.",type:"success",color:"#1D9E75",icon:"✅"};
      }
      if(remainingIncluded===1&&rewarded>0)return {text:label+"\nTi resta 1 "+unit+" inclusa "+period+" + "+extraAdText(rewarded)+".",type:"success",color:"#1D9E75",icon:"✅"};
      return {text:label+"\nTi "+oneMany(remainingIncluded,"resta","restano")+" "+remainingIncluded+" "+unit+" "+oneMany(remainingIncluded,"inclusa","incluse")+" "+period+".",type:"success",color:"#1D9E75",icon:"✅"};
    }
    if(usedAfter===included&&rewarded>0){
      if(feature==="manualMovement")return {text:label+"\nHai completato le transazioni gratuite. Ne hai ancora "+rewarded+" se guardi un annuncio.",type:"success",color:"#1D9E75",icon:"✅"};
      if(feature==="voiceEntry")return {text:translateUiRuntimeText(label)+"\n"+translateUiRuntimeText("Hai terminato per oggi gli inserimenti vocali gratuiti. Te ne resta")+" "+rewarded+" "+translateUiRuntimeText("con annuncio."),translated:true,type:"success",color:"#1D9E75",icon:"✅"};
      if(feature==="receiptScan")return {text:translateUiRuntimeText(label)+"\n"+translateUiRuntimeText("Hai terminato per oggi gli scontrini gratuiti. Te ne resta")+" "+rewarded+" "+translateUiRuntimeText("con annuncio."),translated:true,type:"success",color:"#1D9E75",icon:"✅"};
      return {text:label+"\nHai completato le operazioni incluse per "+unit+". Ne hai ancora "+rewarded+" se guardi un annuncio.",type:"success",color:"#1D9E75",icon:"✅"};
    }
    if(usedAfter<total){
      if(feature==="manualMovement")return {text:label+"\nTi resta "+remainingExtra+" movimento extra se guardi un annuncio.",type:"success",color:"#1D9E75",icon:"✅"};
      return {text:label+"\nTi "+oneMany(remainingExtra,"resta","restano")+" "+remainingExtra+" "+unit+" extra se guardi un annuncio.",type:"success",color:"#1D9E75",icon:"✅"};
    }
    if(feature==="manualMovement")return {text:label+"\nPer oggi non hai altre spese da inserire. Aspetta domani o passa a un altro piano.",type:"warning",color:"#EF9F27",icon:"⚠️"};
    return {text:label+"\nHai usato tutte le operazioni disponibili per "+unit+" "+period+". Aspetta "+(featurePeriod(feature)==="monthly"?"il prossimo mese":"domani")+" o passa a un altro piano.",type:"warning",color:"#EF9F27",icon:"⚠️"};
  }
  function singleMovementSuccessToast(label,usedAfterOverride){return successToastForFeature("manualMovement",label||"Movimento aggiunto.",usedAfterOverride);}
  function bulkMovementSuccessToast(kind,count,usedAfterOverride){return successToastForFeature("bulkMovement",Number(count||0)+" "+(kind==="income"?"entrate":"uscite")+" aggiunte correttamente.",usedAfterOverride);}
  function planFeatureGateState(feature){return rewardedFeatureConfig(feature)?rewardedFeatureGateState(feature,1):(planRemaining(feature)<=0?{state:"blocked",text:upgradeMessage(feature)}:{state:"open"});}
  function limitedFeatureSuccessToast(feature,label,usedAfterOverride){return successToastForFeature(feature,label,usedAfterOverride);}
  function remainingMessage(feature,currentCount){
    var rem=planRemaining(feature,currentCount);
    if(rem===Infinity)return "";
    var lim=featureLimits(feature);
    if(rewardedFeatureConfig(feature)){
      var used=planCount(featureUsageKey(feature));
      var included=Number(lim.included||0),rewarded=Number(lim.rewarded||0),total=Number(lim.total||0);
      var unit=featureUnitName(feature);
      var period=featurePeriodText(feature);
      function oneMany(n,singular,plural){return Number(n)===1?singular:plural;}
      if(used<included){
        var incLeft=Math.max(0,included-used);
        if(feature==="manualMovement"){
          if(incLeft===1&&rewarded>0)return "Ti resta 1 movimento gratuito oggi + "+rewarded+" con un annuncio.";
          return "Ti "+oneMany(incLeft,"resta","restano")+" "+incLeft+" "+oneMany(incLeft,"movimento gratuito","movimenti gratuiti")+" oggi.";
        }
        return "Ti "+oneMany(incLeft,"resta","restano")+" "+incLeft+" "+unit+" "+oneMany(incLeft,"inclusa","incluse")+" "+period+(rewarded>0?" + "+rewarded+" con annuncio.":".");
      }
      if(used===included&&rewarded>0){
        if(feature==="manualMovement")return "Hai completato le transazioni gratuite. Ne hai ancora "+rewarded+" se guardi un annuncio.";
        return "Hai completato le operazioni incluse per "+unit+". Ne hai ancora "+rewarded+" se guardi un annuncio.";
      }
      if(used<total){
        var extraLeft=Math.max(0,total-used);
        if(feature==="manualMovement")return "Ti resta "+extraLeft+" movimento extra se guardi un annuncio.";
        return "Ti "+oneMany(extraLeft,"resta","restano")+" "+extraLeft+" "+unit+" extra se guardi un annuncio.";
      }
      if(feature==="manualMovement")return "Per oggi non hai altre spese da inserire. Aspetta domani o passa a un altro piano.";
      return "Hai usato tutte le operazioni disponibili per "+unit+" "+period+". Aspetta "+(featurePeriod(feature)==="monthly"?"il prossimo mese":"domani")+" o passa a un altro piano.";
    }
    return "Operazioni residue: "+rem;
  }
  function openPlanInfo(){
    setMobileMenu(false);
    setTab("settings");
    setSettingsPage("info");
    try{setTimeout(function(){setTab("settings");setSettingsPage("info");setMobileMenu(false);},80);}catch(e){}
  }
  var GOOGLE_PLAY_SUBSCRIPTION_IDS={base:{productId:"base",monthly:"base-monthly",yearly:"base-yearly"},premium:{productId:"complete",monthly:"complete-monthly",yearly:"complete-yearly"}};
  var APPLE_SUBSCRIPTION_IDS={base:{monthly:"base_monthly",yearly:"base_yearly"},premium:{monthly:"complete_monthly",yearly:"complete_yearly"}};
  function billingPeriodLabel(period){return period==="yearly"?L("Annuale"):L("Mensile");}
  function nativePlugin(name){try{return window&&window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins[name];}catch(e){return null;}}
  function nativePlatform(){try{var c=window&&window.Capacitor;if(c&&c.getPlatform)return c.getPlatform();if(c&&c.isNativePlatform&&c.isNativePlatform())return "native";}catch(e){}return "web";}
  function isNativeMobileApp(){try{return !!(window&&window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());}catch(e){return false;}}
  function isNativeAndroidApp(){return isNativeMobileApp()&&nativePlatform()==="android";}
  function isNativeIOSApp(){return isNativeMobileApp()&&nativePlatform()==="ios";}
  function appStoreName(){return isNativeIOSApp()?"App Store":"store";}
  function platformStoreBillingName(){return isNativeIOSApp()?"App Store":"store del dispositivo";}
  function currentRewardedAdUnitId(){return isNativeIOSApp()?ADMOB_REWARDED_AD_UNIT_ID_IOS:ADMOB_REWARDED_AD_UNIT_ID_ANDROID;}
  function currentBannerAdUnitId(){return isNativeIOSApp()?ADMOB_BANNER_AD_UNIT_ID_IOS:ADMOB_BANNER_AD_UNIT_ID_ANDROID;}
  var adConsentRequestedRef=useRef(false);
  var rewardedAdInProgressRef=useRef(false);
  var rewardedAdCompletedAtRef=useRef(0);
  function requestAdConsentIfNeeded(){
    var ads=nativePlugin("FainanceAds");
    if(!isNativeMobileApp()||!ads||!ads.requestConsent)return;
    if(adConsentRequestedRef.current)return;
    adConsentRequestedRef.current=true;
    try{ads.requestConsent({}).catch(function(e){console.warn("AdMob consent error",e);});}catch(e){}
  }
  function purchasePlan(pid){
    if(pid==="free"){
      setCurrentPlan("free",true);
      setToast("Piano aggiornato: "+planLabel("free",lang));
      setTimeout(function(){try{saveWidgetSettingsToNative(false,enforceWidgetPlanPayload(widgetSettingsPayload()));}catch(e){}},50);
      return;
    }
    var billing=nativePlugin("FainanceBilling");
    if(!isNativeMobileApp()||!billing||!billing.purchase){
      setToast({text:L("Gli acquisti reali sono disponibili solo dall’app installata dallo store."),type:"warning",color:"#EF9F27",icon:"⚠️"});
      return;
    }
    var period=planBillingPeriod==="yearly"?"yearly":"monthly";
    var productId="";
    var basePlanId="";
    if(isNativeIOSApp()){
      var iosCfg=APPLE_SUBSCRIPTION_IDS[pid];
      productId=iosCfg&&iosCfg[period]?iosCfg[period]:"";
    }else{
      var cfg=GOOGLE_PLAY_SUBSCRIPTION_IDS[pid];
      productId=cfg?cfg.productId:"";
      basePlanId=cfg&&cfg[period]?cfg[period]:"";
    }
    if(!productId){
      setToast({text:L("Configurazione acquisto non disponibile."),type:"warning",color:"#EF9F27",icon:"⚠️"});
      return;
    }
    var loadingKey=pid+":"+period;
    setPlanPurchaseLoading(loadingKey);
    billing.purchase({productId:productId,basePlanId:basePlanId,plan:pid,billingPeriod:period,platform:nativePlatform()})
      .then(function(res){
        if(res&&res.success){
          setCurrentPlan(res.plan||pid,true);
          setPlanBillingPeriod(res.billingPeriod||period);
          setToast({text:L("Piano aggiornato")+": "+planLabel(res.plan||pid,lang)+" · "+billingPeriodLabel(res.billingPeriod||period),type:"success",color:"#1D9E75",icon:"✅"});
          setTimeout(function(){try{saveWidgetSettingsToNative(false,enforceWidgetPlanPayload(widgetSettingsPayload()));}catch(e){}},50);
        }else if(res&&res.cancelled){
          setToast({text:L("Acquisto annullato. Il piano resta invariato."),type:"warning",color:"#EF9F27",icon:"⚠️"});
        }else if(res&&res.pending){
          setToast({text:L("Acquisto in attesa di conferma dallo store."),type:"warning",color:"#EF9F27",icon:"⏳"});
        }else{
          setToast({text:L("Acquisto non completato. Il piano resta invariato."),type:"warning",color:"#EF9F27",icon:"⚠️"});
        }
      })
      .catch(function(err){
        var msg=err&&err.message?err.message:String(err||"");
        setToast({text:L("Errore acquisto")+(msg?": "+msg:""),type:"error",color:"#E24B4A",icon:"❌"});
      })
      .finally(function(){setPlanPurchaseLoading("");});
  }
  function restorePurchases(){
    var billing=nativePlugin("FainanceBilling");
    if(!isNativeMobileApp()||!billing||!billing.restorePurchases){
      setToast({text:L("Ripristino acquisti disponibile solo dall’app installata dallo store."),type:"warning",color:"#EF9F27",icon:"⚠️"});
      return;
    }
    setPlanPurchaseLoading("restore");
    billing.restorePurchases({platform:nativePlatform()})
      .then(function(res){
        if(res&&res.success&&res.plan){
          setCurrentPlan(res.plan,true);
          if(res.billingPeriod)setPlanBillingPeriod(res.billingPeriod);
          setToast({text:L("Acquisti ripristinati")+": "+planLabel(res.plan,lang),type:"success",color:"#1D9E75",icon:"✅"});
          setTimeout(function(){try{saveWidgetSettingsToNative(false,enforceWidgetPlanPayload(widgetSettingsPayload()));}catch(e){}},50);
        }else{
          setToast({text:L("Nessun abbonamento attivo trovato."),type:"warning",color:"#EF9F27",icon:"⚠️"});
        }
      })
      .catch(function(err){var msg=err&&err.message?err.message:String(err||"");setToast({text:L("Errore ripristino acquisti")+(msg?": "+msg:""),type:"error",color:"#E24B4A",icon:"❌"});})
      .finally(function(){setPlanPurchaseLoading("");});
  }
  function showRewardedAdForExtraMovement(onReward){
    var nowMs=Date.now();
    if(rewardedAdInProgressRef.current)return;
    if(nowMs-Number(rewardedAdCompletedAtRef.current||0)<2500)return;
    var ads=nativePlugin("FainanceAds");
    if(!isNativeMobileApp()||!ads||!ads.showRewarded){
      setToast({text:L("Annuncio non disponibile in questa versione. Installa l’app dallo store e riprova."),type:"warning",color:"#EF9F27",icon:"⚠️"});
      return;
    }
    rewardedAdInProgressRef.current=true;
    requestAdConsentIfNeeded();
    setToast({text:L("Caricamento annuncio..."),type:"info",color:"#7F77DD",icon:"⏳"});
    ads.showRewarded({adUnitId:currentRewardedAdUnitId()})
      .then(function(res){
        if(res&&res.rewarded){rewardedAdCompletedAtRef.current=Date.now();onReward();}
        else setToast({text:L("Annuncio non completato. Operazione extra non sbloccata."),type:"warning",color:"#EF9F27",icon:"⚠️"});
      })
      .catch(function(err){
        var msg=err&&err.message?err.message:String(err||"");
        setToast({text:L("Annuncio non disponibile")+(msg?": "+msg:""),type:"warning",color:"#EF9F27",icon:"⚠️"});
      })
      .finally(function(){rewardedAdInProgressRef.current=false;});
  }
  var WIDGET_PLAN_REQUIREMENTS={quick:"free",note:"base",goal:"base",shoppingList:"free",fidelity:"free",debtCredits:"base",share:"premium"};
  var WIDGET_TYPE_ORDER=["quick","fidelity","shoppingList","note","goal","share","debtCredits"];
  function planRank(plan){var order={free:0,base:1,premium:2};return order[plan]!=null?order[plan]:0;}
  function isWidgetAllowed(widgetType){var required=WIDGET_PLAN_REQUIREMENTS[widgetType]||"free";return planRank(currentPlan)>=planRank(required);}
  function widgetPlanName(widgetType){return planLabel(WIDGET_PLAN_REQUIREMENTS[widgetType]||"free",lang);}
  function widgetLockedMessage(widgetType){return "Widget disponibile dal piano "+widgetPlanName(widgetType)+". Vai in Info per cambiare piano.";}
  function settingAllowed(requiredPlan){return planRank(currentPlan)>=planRank(requiredPlan||"free");}
  function settingPlanName(requiredPlan){return planLabel(requiredPlan||"free",lang);}
  function settingLockedMessage(requiredPlan){return "🔒 Impostazione non inclusa nel piano "+planLabel(currentPlan,lang)+". Disponibile dal piano "+settingPlanName(requiredPlan)+". Vai in Info per cambiare piano.";}
  function blockSetting(requiredPlan){if(settingAllowed(requiredPlan))return false;setToast({text:translateUiRuntimeText(settingLockedMessage(requiredPlan)),type:"error",color:"#E24B4A",icon:"🚫"});return true;}
  function guardedSetter(fn,requiredPlan){return function(v){if(blockSetting(requiredPlan))return;return fn(v);};}
  function guardedHandler(fn,requiredPlan){return function(){if(blockSetting(requiredPlan))return;return fn.apply(null,arguments);};}
  function widgetAvailabilityForPlan(plan){
    var order={free:0,base:1,premium:2};
    var activePlan=PLAN_LIMITS[plan]?plan:(currentPlanRef.current||currentPlan||"free");
    var all=WIDGET_TYPE_ORDER;
    var availability={};
    all.forEach(function(type){var required=WIDGET_PLAN_REQUIREMENTS[type]||"free";availability[type]=(order[activePlan]||0)>=(order[required]||0);});
    return availability;
  }
  function widgetTypesForPlan(plan){var av=widgetAvailabilityForPlan(plan);return WIDGET_TYPE_ORDER.filter(function(k){return !!av[k];});}
  function disabledWidgetTypesForPlan(plan){var av=widgetAvailabilityForPlan(plan);return WIDGET_TYPE_ORDER.filter(function(k){return !av[k];});}
  function enforceWidgetPlanPayload(payload){
    payload=payload||{};
    var noteAllowed=isWidgetAllowed("note");
    var goalAllowed=isWidgetAllowed("goal");
    var shoppingListAllowed=isWidgetAllowed("shoppingList");
    var fidelityAllowed=isWidgetAllowed("fidelity");
    var debtCreditsAllowed=isWidgetAllowed("debtCredits");
    var shareAllowed=isWidgetAllowed("share");
    payload.quickAdd={...(payload.quickAdd||{}),enabled:true};
    payload.noteWidget={...(payload.noteWidget||{}),enabled:noteAllowed&&!!((payload.noteWidget||{}).enabled)};
    payload.goalWidget={...(payload.goalWidget||{}),enabled:goalAllowed&&!!((payload.goalWidget||{}).enabled)};
    payload.shoppingListWidget={...(payload.shoppingListWidget||{}),enabled:shoppingListAllowed&&!!((payload.shoppingListWidget||{}).enabled)};
    payload.fidelityWidget={...(payload.fidelityWidget||{}),enabled:fidelityAllowed&&!!((payload.fidelityWidget||{}).enabled)};
    payload.debtCreditsWidget={...(payload.debtCreditsWidget||{}),enabled:debtCreditsAllowed&&!!((payload.debtCreditsWidget||{}).enabled)};
    payload.shareWidget={...(payload.shareWidget||{}),enabled:shareAllowed};
    if(!shareAllowed&&payload.shareWidget){
      payload.shareWidget.projectId="";
      payload.shareWidget.projectName="Disponibile dal piano "+widgetPlanName("share");
      payload.shareWidget.projectItems=[];
      payload.shareWidget.netAmount=0;
      payload.shareWidget.owedAmount=0;
      payload.shareWidget.oweAmount=0;
      payload.shareWidget.lastActivity="Passa al piano "+widgetPlanName("share")+" per usare il widget Share";
    }
    var safePlan=currentPlanRef.current||currentPlan||"free";
    var availableTypes=widgetTypesForPlan(safePlan);
    var disabledTypes=disabledWidgetTypesForPlan(safePlan);
    payload.widget_current_plan=safePlan;
    payload.widget_order=WIDGET_TYPE_ORDER.slice();
    payload.widget_available_types=availableTypes;
    payload.widget_enabled_types=availableTypes;
    payload.widget_disabled_types=disabledTypes;
    payload.widget_plan_availability=widgetAvailabilityForPlan(safePlan);
    payload.widget_plan_requirements=WIDGET_PLAN_REQUIREMENTS;
    return payload;
  }
  function canUsePlanFeature(feature,amount){
    amount=Number(amount||1);
    if(rewardedFeatureConfig(feature)){
      var g=rewardedFeatureGateState(feature,amount);
      return g.state!=="blocked";
    }
    var limit=getPlanLimit(feature);
    if(limit===Infinity)return true;
    return featureUsed(feature)+amount<=limit;
  }
  function canAddPlanItem(feature,currentCount,amount){
    amount=Number(amount||1);
    if(rewardedFeatureConfig(feature)){
      var lim=featureLimits(feature);
      if(lim.total===Infinity)return true;
      var used=Math.max(planCount(featureUsageKey(feature)),Number(currentCount||0));
      return used+amount<=Number(lim.total);
    }
    var limit=getPlanLimit(feature);
    if(limit===Infinity)return true;
    return Number(currentCount||0)+amount<=Number(limit);
  }
  function consumePlanFeature(feature,amount){
    amount=Number(amount||1);
    if(rewardedFeatureConfig(feature)){planInc(featureUsageKey(feature),amount);return;}
    var key="";
    if(feature==="aiReply")key=usageKey("aiReply","daily");
    if(key)planInc(key,amount);
  }
  function handleRewardedFeature(feature,amount,onAllowed,label){
    amount=Number(amount||1);
    var g=rewardedFeatureGateState(feature,amount);
    if(g.state==="blocked"){setToast({text:g.text,type:"error",color:"#E24B4A",icon:"🚫"});return false;}
    if(g.state==="ad"){
      var left=Math.max(0,Number(g.rewarded||0)-Number(g.unlocked||0));
      var featureName=featureLabel(feature);
      setToast({text:translateUiRuntimeText("Hai terminato le risposte gratuite incluse. Sta per partire un annuncio per sbloccare un messaggio extra.")+" "+translateUiRuntimeText("Messaggi extra disponibili con annuncio")+": "+left+".",type:"warning",color:"#EF9F27",icon:"📢",duration:1800});
      setTimeout(function(){showRewardedAdForExtraMovement(function(){
        if(unlockRewardedFeature(feature,amount)){onAllowed();}
      });},900);
      return false;
    }
    onAllowed();
    return true;
  }
  function useRewardedMovement(){
    var g=singleMovementGateState();
    if(g.state==="open")return true;
    setToast({text:g.text,type:"error",color:"#E24B4A",icon:"🚫"});
    return false;
  }
  function addExpenses(items,source){
    var list=Array.isArray(items)?items:[items];
    if(source==="import"){
      setExpenses(function(p){return list.map(function(x){return {...x,amount:Math.abs(parseMoney(x.amount)),createdAt:x.createdAt||new Date().toISOString()};}).filter(function(x){return x.amount>0;}).concat(p);});
      return true;
    }
    var hasInstalment=list.some(function(x){return !!x.rateizzato;});
    var feature=(source==="bulk"||list.length>1?"bulkMovement":source==="receipt"?"receiptScan":source==="voice"?"voiceEntry":hasInstalment?"instalmentMovement":"manualMovement");
    var amount=feature==="bulkMovement"?1:list.length;
    if(feature==="bulkMovement"){
      var maxBulk=bulkMovementRowLimit(currentPlan);
      if(maxBulk!==Infinity&&list.length>maxBulk){setToast({text:translateUiRuntimeText("Puoi inserire al massimo ")+maxBulk+translateUiRuntimeText(" movimenti per volta."),type:"warning",color:"#EF9F27",icon:"⚠️"});return false;}
    }
    if(!canUsePlanFeature(feature,amount)){setToast({text:upgradeMessage(feature),type:"error",color:"#E24B4A",icon:"🚫"});return false;}
    function save(){
      var usedAfter=rewardedFeatureConfig(feature)?planCount(featureUsageKey(feature))+amount:null;
      consumePlanFeature(feature,amount);
      if(hasInstalment&&feature!=="instalmentMovement")consumePlanFeature("instalmentMovement",list.filter(function(x){return !!x.rateizzato;}).length);
      setExpenses(function(p){return list.map(function(x){return {...x,amount:Math.abs(parseMoney(x.amount)),createdAt:x.createdAt||new Date().toISOString()};}).filter(function(x){return x.amount>0;}).concat(p);});
      if(feature==="manualMovement")setToast(singleMovementSuccessToast("Uscita aggiunta.",usedAfter));
      else if(feature==="instalmentMovement")setToast(successToastForFeature("instalmentMovement","Uscita rateizzata aggiunta.",usedAfter));
      else if(feature==="receiptScan"){setToast(limitedFeatureSuccessToast("receiptScan","Scontrino salvato.",usedAfter));setTab("history");setHistoryTab("expenses");setAddSubTab("single");}
      else if(feature==="voiceEntry"){setToast(limitedFeatureSuccessToast("voiceEntry","Uscita vocale salvata.",usedAfter));setVoiceModal(false);setVoiceListening(false);setVoiceText("");setVoiceParsed(null);setVoiceError("");setTab("history");setHistoryTab("expenses");}
      else if(feature==="bulkMovement")setToast(bulkMovementSuccessToast("expense",list.length,usedAfter));
    }
    if(rewardedFeatureConfig(feature)){return handleRewardedFeature(feature,amount,save);}
    save();
    return true;
  }
  function addIncomes(items,source){
    var list=Array.isArray(items)?items:[items];
    if(source==="import"){
      setIncomes(function(p){return list.map(function(x){return {...x,amount:Math.abs(parseMoney(x.amount)),createdAt:x.createdAt||new Date().toISOString()};}).filter(function(x){return x.amount>0;}).concat(p);});
      return true;
    }
    var hasInstalment=list.some(function(x){return !!x.rateizzato;});
    var feature=(source==="bulk"||list.length>1?"bulkMovement":source==="voice"?"voiceEntry":hasInstalment?"instalmentMovement":"manualMovement");
    var amount=feature==="bulkMovement"?1:list.length;
    if(feature==="bulkMovement"){
      var maxBulk=bulkMovementRowLimit(currentPlan);
      if(maxBulk!==Infinity&&list.length>maxBulk){setToast({text:translateUiRuntimeText("Puoi inserire al massimo ")+maxBulk+translateUiRuntimeText(" movimenti per volta."),type:"warning",color:"#EF9F27",icon:"⚠️"});return false;}
    }
    if(!canUsePlanFeature(feature,amount)){setToast({text:upgradeMessage(feature),type:"error",color:"#E24B4A",icon:"🚫"});return false;}
    function save(){
      var usedAfter=rewardedFeatureConfig(feature)?planCount(featureUsageKey(feature))+amount:null;
      consumePlanFeature(feature,amount);
      if(hasInstalment&&feature!=="instalmentMovement")consumePlanFeature("instalmentMovement",list.filter(function(x){return !!x.rateizzato;}).length);
      setIncomes(function(p){return list.map(function(x){return {...x,amount:Math.abs(parseMoney(x.amount)),createdAt:x.createdAt||new Date().toISOString()};}).filter(function(x){return x.amount>0;}).concat(p);});
      if(feature==="manualMovement")setToast(singleMovementSuccessToast("Entrata aggiunta.",usedAfter));
      else if(feature==="instalmentMovement")setToast(successToastForFeature("instalmentMovement","Entrata rateizzata aggiunta.",usedAfter));
      else if(feature==="voiceEntry"){setToast(limitedFeatureSuccessToast("voiceEntry","Entrata vocale salvata.",usedAfter));setVoiceModal(false);setVoiceListening(false);setVoiceText("");setVoiceParsed(null);setVoiceError("");setTab("history");setHistoryTab("incomes");}
      else if(feature==="bulkMovement")setToast(bulkMovementSuccessToast("income",list.length,usedAfter));
    }
    if(rewardedFeatureConfig(feature)){return handleRewardedFeature(feature,amount,save);}
    save();
    return true;
  }
  function confirmRecurring(r,mk){if(!planLimits.recurringMovements){setToast({text:translateUiRuntimeText("Movimenti ricorrenti disponibili dal piano Base."),type:"warning",color:"#EF9F27",icon:"⚠️"});return;}var day=r.dayOfMonth===0?new Date(now.getFullYear(),now.getMonth()+1,0).getDate():r.dayOfMonth;var ds=new Date(now.getFullYear(),now.getMonth(),day).toISOString().split("T")[0];if(r.rtype==="expense")setExpenses(function(p){return [{id:Date.now(),amount:r.amount,catId:Number(r.catId),methodId:Number(r.methodId),desc:r.name,date:ds,rateizzato:r.rateizzato,rate:r.rate,createdAt:new Date().toISOString()},...p];});else setIncomes(function(p){return [{id:Date.now(),amount:r.amount,type:r.incomeType,desc:r.name,date:ds,rateizzato:r.rateizzato,rate:r.rate,createdAt:new Date().toISOString()},...p];});setRecurring(function(p){return p.map(function(x){return x.id===r.id?{...x,confirmed:[...(x.confirmed||[]),mk]}:x;});});}

  var curMonthExp=totalForMonth(expenses,curMonthKey,homeBalanceView==="reale"?"reale":"rateizzato");
  var curMonthInc=totalForMonth(incomes,curMonthKey,homeBalanceView==="reale"?"reale":"rateizzato");
  var yearExp=expenses.filter(function(e){return e.date.startsWith(String(curYear));}).reduce(function(a,e){return a+e.amount;},0);
  var yearInc=incomes.filter(function(i){return i.date.startsWith(String(curYear));}).reduce(function(a,i){return a+i.amount;},0);
  var last12Balance=useMemo(function(){return balanceForMonths(expenses,incomes,last12MonthKeys(now));},[expenses,incomes,curMonthKey]);
  var localizedMonthShorts=useMemo(function(){return Array.from({length:12},function(_,i){return monthShortName(i);});},[lang]);
  var monthlyTotals=useMemo(function(){return monthlyTotalsForYear(expenses,incomes,curYear,statsView==="reale"?"reale":"rateizzato",localizedMonthShorts);},[expenses,incomes,curYear,statsView,localizedMonthShorts]);
  var pendingCount=recurring.filter(function(r){return !(r.confirmed||[]).includes(curMonthKey)&&!(r.skipped||[]).includes(curMonthKey);}).length;

  // compute triggered alerts
  function computeTriggered(){
    return alerts.filter(function(al){
      var prefix=al.period==="annual"?String(curYear):curMonthKey;
      var spent;
      if(al.type==="cat")spent=expenses.filter(function(e){return e.catId===al.catId&&e.date.startsWith(prefix);}).reduce(function(a,e){return a+e.amount;},0);
      else{var gc=cats.filter(function(c){return c.group===al.groupId;}).map(function(c){return c.id;});spent=expenses.filter(function(e){return gc.includes(e.catId)&&e.date.startsWith(prefix);}).reduce(function(a,e){return a+e.amount;},0);}
      var triggered=al.triggerMode==="immediate"?spent>=al.budget:spent>=al.budget*(1+(al.triggerPct||0)/100);
      if(!triggered)return false;
      al._spent=spent;
      return true;
    }).map(function(al){
      var grps=expenseGroups||DEFAULT_EXPENSE_GROUPS;
      var cat3=al.type==="cat"?cats.find(function(c){return c.id===al.catId;}):null;
      var prefixKey=al.period==="annual"?String(curYear):curMonthKey;return{...al,_alertKey:String(al.id)+":"+prefixKey,spentFmt:fmt(al._spent),budgetFmt:fmt(al.budget),pct:al.budget>0?Math.min(200,(al._spent/al.budget)*100):0};
    });
  }
  var allTriggeredAlertsData=useMemo(computeTriggered,[alerts,expenses,cats,curMonthKey,curYear,expenseGroups]);
  function alertSeenKey(al){return String((al&&al._alertKey)||((al&&al.id)||""));}
  var triggeredAlertsData=useMemo(function(){
    var seen=new Set(Array.isArray(shownAlertIds)?shownAlertIds.map(String):[]);
    return allTriggeredAlertsData.filter(function(a){return !seen.has(alertSeenKey(a));});
  },[allTriggeredAlertsData,shownAlertIds]);
  var alertTriggered=triggeredAlertsData.length;
  function markAlertsSeen(list){
    var source=Array.isArray(list)&&list.length?list:triggeredAlertsData;
    var keys=source.map(alertSeenKey).filter(Boolean);
    if(keys.length){
      var set=new Set((Array.isArray(shownAlertIds)?shownAlertIds:[]).map(String));
      keys.forEach(function(k){set.add(String(k));});
      setShownAlertIds(Array.from(set));
      try{localStorage.setItem(userKey("shown_alert_ids_v2"),JSON.stringify(Array.from(set)));}catch(e){}
      if(userId){try{setDoc(doc(fbDb,"userData",userId),{shownAlertIds:Array.from(set),updatedAt:new Date().toISOString()},{merge:true}).catch(function(){});}catch(e){}}
    }
    setAlertPopup(null);
  }

  // ── REAL-TIME ALERT: only fire popup for newly triggered and not-yet-seen alerts ──
  var prevTriggeredIdsRef=useRef([]);
  useEffect(function(){
    if(!firestoreReady)return;
    var currentIds=triggeredAlertsData.map(alertSeenKey);
    var seen=new Set(Array.isArray(shownAlertIds)?shownAlertIds.map(String):[]);
    var newIds=currentIds.filter(function(id){return id&&!seen.has(id)&&!prevTriggeredIdsRef.current.includes(id);});
    if(newIds.length>0){
      var newAlerts=triggeredAlertsData.filter(function(a){return newIds.includes(alertSeenKey(a));});
      setAlertPopup(newAlerts);
    }
    prevTriggeredIdsRef.current=currentIds;
  },[firestoreReady,JSON.stringify(triggeredAlertsData.map(alertSeenKey)),JSON.stringify(shownAlertIds||[])]);
  useEffect(function(){
    if(tab==="alerts"&&triggeredAlertsData.length>0)markAlertsSeen(triggeredAlertsData);
  },[tab,JSON.stringify(triggeredAlertsData.map(alertSeenKey))]);

  function historySortValue(item){
    if(historySortDate==="created")return item.createdAt?String(item.createdAt):(item.id?String(item.id):"");
    return item.date||"";
  }
  function sortHistoryItems(list){
    return list.slice().sort(function(a,b){
      var av=historySortValue(a),bv=historySortValue(b);
      if(av===bv)return 0;
      var res=av>bv?1:-1;
      return historySortDirection==="asc"?res:-res;
    });
  }
  var shareHistoryExpenses=useMemo(function(){
    if(!showShareInHistory)return [];
    return (shareProjects||[]).flatMap(function(project){return (project.activities||[]).filter(function(a){return a.kind!=="settlement";}).map(function(a){
      var paidBy=(project.participants||[]).find(function(p){return p.id===a.paidBy;});
      var myShare=(a.shares&&a.shares.me!==undefined)?Number(a.shares.me):(Number(a.amount)||0)/Math.max(1,(project.participants||[]).filter(function(p){return p.status!=="archived";}).length||1);
      return{id:"share_"+project.id+"_"+a.id,amount:myShare,catId:"share",methodId:null,desc:(project.name||"Share")+" · "+(a.desc||"Spesa condivisa")+(paidBy?" · pagata da "+paidBy.name:""),date:a.date,createdAt:a.createdAt||a.date,rateizzato:false,rate:1,_share:true,_shareProjectId:project.id,_shareProjectName:project.name,_sharePaidBy:paidBy?paidBy.name:""};
    });});
  },[shareProjects,showShareInHistory]);
  var filteredExpenses=useMemo(function(){var q=searchQuery.toLowerCase();var minAmt=filterAmtMin?parseMoney(filterAmtMin):null;var maxAmt=filterAmtMax?parseMoney(filterAmtMax):null;var source=expenses.concat(shareHistoryExpenses);return sortHistoryItems(source.filter(function(e){var c=e._share?{id:"share",name:"Share",group:"share",icon:"🤝",color:confirmButtonColor}:getCat(e.catId);if(historyFutureMode==="untilToday"&&e.date>todayStr())return false;if(filterYear&&filterYear!=="all"&&!e.date.startsWith(filterYear))return false;if(filterMonth&&!e.date.startsWith(filterMonth))return false;if(filterMonths&&filterMonths.length&&!filterMonths.some(function(mk){return e.date.startsWith(mk);}))return false;var txt=((e.desc||"")+" "+(c?c.name:"")+" "+(e._shareProjectName||"")+" "+(e._sharePaidBy||"")).toLowerCase();if(q&&!txt.includes(q))return false;if(filterCats&&filterCats.length){var isSelected=filterCats.includes(String(e.catId));if(filterCatExclude?isSelected:!isSelected)return false;}else if(filterCat!=="all"&&String(e.catId)!==filterCat)return false;if(filterGroup!=="all"&&(c?c.group:"")!==filterGroup)return false;if(filterDateFrom&&e.date<filterDateFrom)return false;if(filterDateTo&&e.date>filterDateTo)return false;if(minAmt!==null&&e.amount<minAmt)return false;if(maxAmt!==null&&e.amount>maxAmt)return false;return true;}));},[expenses,shareHistoryExpenses,filterYear,filterMonth,filterMonths,searchQuery,filterCat,filterCats,filterCatExclude,filterGroup,filterDateFrom,filterDateTo,filterAmtMin,filterAmtMax,historyFutureMode,historySortDate,historySortDirection,confirmButtonColor,planUsage,shownAlertIds]);
  var filteredIncomes=useMemo(function(){var q=searchQuery.toLowerCase();var minAmt=filterAmtMin?parseMoney(filterAmtMin):null;var maxAmt=filterAmtMax?parseMoney(filterAmtMax):null;return sortHistoryItems(incomes.filter(function(i){var it=getIT(i.type);var txt=((i.desc||"")+" "+(it?it.name:"")+" "+(i.type||"")).toLowerCase();if(historyFutureMode==="untilToday"&&i.date>todayStr())return false;if(filterYear&&filterYear!=="all"&&!i.date.startsWith(filterYear))return false;if(filterMonth&&!i.date.startsWith(filterMonth))return false;if(q&&!txt.includes(q))return false;if(filterDateFrom&&i.date<filterDateFrom)return false;if(filterDateTo&&i.date>filterDateTo)return false;if(minAmt!==null&&i.amount<minAmt)return false;if(maxAmt!==null&&i.amount>maxAmt)return false;return true;}));},[incomes,filterYear,filterMonth,searchQuery,filterDateFrom,filterDateTo,filterAmtMin,filterAmtMax,historyFutureMode,historySortDate,historySortDirection,incomeTypes]);

  var inp={borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};
  var sb={padding:"8px 14px",border:"none",borderRadius:btnRadius,fontSize:13,cursor:"pointer",fontWeight:500};
  useEffect(function(){
    if(currentPlan==="free"){
      requestAdConsentIfNeeded();
    }else{
      try{var ads=nativePlugin("FainanceAds");if(ads&&ads.hideBanner)ads.hideBanner({});}catch(e){}
    }
  },[currentPlan]);

  function shouldShowTopAdBox(){
    if(currentPlan!=="free")return false;
    if(!planLimits||!planLimits.ads)return false;
    if(!isMobile)return false;
    if(tab==="settings"||tab==="consulenteAI")return false;
    var last=Number(topAdDismissedAt||0);
    return !last||(Date.now()-last)>20*60*1000;
  }
  function TopAdBox(){
    var visible=shouldShowTopAdBox();
    var nativeBanner=isNativeMobileApp();
    var adBoxRef=useRef(null);
    var slotHeight=showAppSummaryHeader?68:74;
    useEffect(function(){
      var ads=nativePlugin("FainanceAds");
      if(!visible||!nativeBanner||!ads||!ads.showBanner)return;
      requestAdConsentIfNeeded();
      function showAtMeasuredSlot(){
        var top=0;
        try{
          var el=adBoxRef.current;
          if(el&&el.getBoundingClientRect){
            var r=el.getBoundingClientRect();
            // Il plugin Android disegna un banner nativo sopra la WebView: qui gli passiamo
            // la posizione reale dello slot riservato nel layout, senza modalita inline/custom
            // che in alcune build vengono ignorate e fanno sparire l'annuncio.
            top=Math.max(0,Math.round(r.top+Math.max(0,(r.height-50)/2)+38));
          }
        }catch(e){}
        try{
          ads.showBanner({
            adUnitId:currentBannerAdUnitId(),
            topMarginCssPx:top,
            topMarginPx:top,
            topMargin:top,
            marginTop:top,
            y:top,
            top:top,
            placement:"inline-slot",
            headerVisible:!!showAppSummaryHeader
          }).catch(function(e){console.warn("Banner AdMob non disponibile",e);});
        }catch(e){}
      }
      var t1=setTimeout(showAtMeasuredSlot,120);
      var t2=setTimeout(showAtMeasuredSlot,520);
      var t3=setTimeout(showAtMeasuredSlot,1200);
      try{window.addEventListener("resize",showAtMeasuredSlot);}catch(e){}
      try{window.addEventListener("scroll",showAtMeasuredSlot,{passive:true});}catch(e){}
      return function(){clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);try{window.removeEventListener("resize",showAtMeasuredSlot);}catch(e){}try{window.removeEventListener("scroll",showAtMeasuredSlot);}catch(e){}try{if(ads&&ads.hideBanner)ads.hideBanner({});}catch(e){}};
    },[visible,tab,currentPlan,nativeBanner,showAppSummaryHeader,slotHeight]);
    if(!visible)return null;
    return <div ref={adBoxRef} style={{position:"relative",height:slotHeight,margin:showAppSummaryHeader?"8px 0 12px":"16px 0 12px",background:nativeBanner?(dark?"#171725":"#fff"):(dark?"#202033":"#F8FAFF"),border:nativeBanner?"1px solid transparent":"1px solid "+borderC,borderRadius:nativeBanner?0:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,overflow:"hidden",boxSizing:"border-box",pointerEvents:nativeBanner?"none":"auto"}}>
      {!nativeBanner&&<div style={{fontSize:12,color:subC,textAlign:"center",fontWeight:700}}>📢 {L("Spazio annuncio")}</div>}
      {!nativeBanner&&<button onClick={function(){try{var ads=nativePlugin("FainanceAds");if(ads&&ads.hideBanner)ads.hideBanner({});}catch(e){}setTopAdDismissedAt(Date.now());}} style={{position:"absolute",right:8,top:8,width:24,height:24,borderRadius:"50%",border:"none",background:dark?"#333":"#eef",color:subC,cursor:"pointer",fontWeight:800}}>×</button>}
    </div>;
  }

  var ctxValue={
    // ── Già presenti ──────────────────────────────────────────────────────
    t,lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,
    translateUiRuntimeText,monthShortName,monthFullName,
    expenseGroups,setExpenseGroups,incomeGroups,setIncomeGroups,
    incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides,
    recurring,setRecurring,goals,setGoals,alerts,setAlerts,
    expenses,setExpenses,incomes,setIncomes,
    sym,fmt,dark,dateFmt,curMonthKey,addExpenses,addIncomes,confirmRecurring,
    catOrder,setCatOrder,methodOrder,setMethodOrder,
    catSortMode,setCatSortMode,methodSortMode,setMethodSortMode,
    budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile,
    patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,
    patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode,
    patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,
    historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate,historySortDirection,setHistorySortDirection,
    appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords,
    notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,
    aiDismissed,setAiDismissed,aiChat,setAiChat,aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,
    secondaryCurrency,secRate,fmtSec,secSym,secRateLoading,currency,
    showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,
    showSecInBudget,setShowSecInBudget,showSecInPatrimonio,setShowSecInPatrimonio,
    
    currentPlan,setCurrentPlan,planUsage,setPlanUsage,planLimits,canUsePlanFeature,consumePlanFeature,handleRewardedFeature,canAddPlanItem,planRemaining,upgradeMessage,remainingMessage,singleMovementSuccessToast,bulkMovementSuccessToast,limitedFeatureSuccessToast,planFeatureGateState,singleMovementGateState,unlockRewardedMovement,manualMovementUsage,bulkMovementRowLimit,bulkMovementCooldownMonths,bulkMovementLocked,bulkMovementCooldownText,PLAN_IDS,PLAN_LABELS,PLAN_PRICES,PLAN_LIMITS,planLabel,planLimitLabel,
    // ── Tema / stile (usati dai pannelli) ─────────────────────────────────
    textC,subC,borderC,cardBg,inp,sb,bgColor,
    // ── Navigazione e stato UI ─────────────────────────────────────────────
    tab,setTab,settingsPage,setSettingsPage,
    speseSubTab,setSpeseSubTab,addType,setAddType,addSubTab,setAddSubTab,
    historyTab,setHistoryTab,
    editingItem,setEditingItem,
    mobileMenu,setMobileMenu,
    toast,setToast,alertPopup,setAlertPopup,markAlertsSeen,
    // ── Statistiche ────────────────────────────────────────────────────────
    statsView,setStatsView,curYear,yearExp,yearInc,monthlyTotals,
    // ── Filtri storico ─────────────────────────────────────────────────────
    searchQuery,setSearchQuery,showFilters,setShowFilters,
    filterYear,setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,
    filterCat,setFilterCat,filterCats,setFilterCats,filterCatExclude,setFilterCatExclude,
    filterGroup,setFilterGroup,
    filterDateFrom,setFilterDateFrom,filterDateTo,setFilterDateTo,
    filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,
    filteredExpenses,filteredIncomes,
    // ── Share ──────────────────────────────────────────────────────────────
    shareProjects,setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,
    shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,
    showShareInHistory,setShowShareInHistory,
    debtCredits,setDebtCredits,shoppingCards,setShoppingCards,shoppingItems,setShoppingItems,shoppingAreas,setShoppingAreas,shoppingAreaIcons,setShoppingAreaIcons,shoppingBoughtColor,setShoppingBoughtColor,
    showDebtCreditsInPatrimonio,setShowDebtCreditsInPatrimonio,showDebtCreditsInExpenses,setShowDebtCreditsInExpenses,shoppingDefaultArea,setShoppingDefaultArea,shareReceiptUploads,setShareReceiptUploads,
    confirmButtonColor,setConfirmButtonColor,
    // ── Firestore / auth ────────────────────────────────────────────────────
    firestoreReady,isOffline,userKey,userId,currentUser,
    // ── Funzioni e ref condivisi usati dai pannelli estratti ────────────────
    historySearchDraftRef,normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,
    // ── Valori calcolati ────────────────────────────────────────────────────
    pendingCount,alertTriggered,getCat,getMethod,getIT,
    curMonthExp,curMonthInc,last12Balance,
    // ── AI ─────────────────────────────────────────────────────────────────
    aiTab,setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,
    // ── Voice ──────────────────────────────────────────────────────────────
    voiceModal,setVoiceModal,voiceListening,setVoiceListening,
    voiceText,setVoiceText,voiceError,setVoiceError,
    voiceConfirm,setVoiceConfirm,voiceSaving,setVoiceSaving,voiceParsed,setVoiceParsed,
    // ── Settings specifici ─────────────────────────────────────────────────
    defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,
    defaultExpenseArea,setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,
    defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,
    incomeTypeOrder,setIncomeTypeOrder,
    deleteConfirmId,setDeleteConfirmId,
    mergeFrom,setMergeFrom,mergeTo,setMergeTo,
    homeBalanceView,setHomeBalanceView,showAppSummaryHeader,setShowAppSummaryHeader,firstDayOfWeek,setFirstDayOfWeek,
    mobileNavOrder,setMobileNavOrder,mobileNavIconCount,setMobileNavIconCount,mobileMenuOrder,setMobileMenuOrder,
    // ── AI floating ────────────────────────────────────────────────────────
    aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,
    // ── Widget Android ─────────────────────────────────────────────────────
    widgetBgColor,setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,
    widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,
    widgetTitle,setWidgetTitle,widgetSubtitle,setWidgetSubtitle,
    widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,
    widgetShowHeader,setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,
    widgetVoiceEnabled,setWidgetVoiceEnabled,
    widget2Enabled,setWidget2Enabled,widget2Type,setWidget2Type,
    widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,
    widget2AccentColor,setWidget2AccentColor,widget2BgAlpha,setWidget2BgAlpha,
    widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,
    widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId,setWidget2SelectedNoteId,
    widget2SelectedBankId,setWidget2SelectedBankId,
    widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,
    widget3AccentColor,setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,
    widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,
    widget3ShowAmounts,setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widgetShareSelectedProjectId,setWidgetShareSelectedProjectId,widgetShareBgColor,setWidgetShareBgColor,widgetShareBgAlpha,setWidgetShareBgAlpha,widgetShareAccentColor,setWidgetShareAccentColor,widgetShareActivityColor,setWidgetShareActivityColor,widgetShareTitleColor,setWidgetShareTitleColor,widgetShareBodyColor,setWidgetShareBodyColor,widgetShareAutoUpdate,setWidgetShareAutoUpdate,
    widget3SelectedGoalId,setWidget3SelectedGoalId,
    bgTheme,setBgTheme,btnStyle,setBtnStyle,
      // ── Misc ────────────────────────────────────────────────────────────────
    shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab,
  };

  function widgetSettingsPayload(){
    function numOr(v,f){var n=Number(v);return Number.isFinite(n)?n:f;}
    var selectedNote=(appuntiNotes||[]).find(function(n){return String(n.id)===String(widget2SelectedNoteId);})||(appuntiNotes||[])[0]||null;
    var selectedBank=(bankCoords||[]).find(function(b){return String(b.id)===String(widget2SelectedBankId);})||(bankCoords||[])[0]||null;
    var selectedGoal=(goals||[]).find(function(g){return String(g.id)===String(widget3SelectedGoalId);})||(goals||[])[0]||null;
    var cleanNoteText=selectedNote?String(selectedNote.text||selectedNote.title||""):"";
    var bankTitle=selectedBank?(selectedBank.bank||selectedBank.holder||"Coordinata bancaria"):"";
    var bankIban=selectedBank?String(selectedBank.iban||""):"";
    var goalTarget=selectedGoal?Number(selectedGoal.target||0):0;
    var goalSaved=selectedGoal?Number(selectedGoal.saved||0):0;
    var goalPct=goalTarget>0?Math.min(100,Math.round(goalSaved/goalTarget*100)):0;
    var widgetNoteItems=(appuntiNotes||[]).map(function(n){return{id:String(n.id),title:n.title||"Nota",body:String(n.text||n.title||"")};});
    var widgetBankItems=(bankCoords||[]).map(function(b){var body=[b.bank?"Banca: "+b.bank:"",b.holder?"Intestatario: "+b.holder:"",b.iban?"IBAN: "+b.iban:"",b.bic?"BIC/SWIFT: "+b.bic:"",b.note?"Note: "+b.note:""];return{id:String(b.id),title:b.bank||b.holder||"Coordinata bancaria",body:body.filter(Boolean).join("\n")};});
    var widgetGoalItems=(goals||[]).map(function(g){var target=Number(g.target||0),saved=Number(g.saved||0),percent=target>0?Math.min(100,Math.round(saved/target*100)):0;return{id:String(g.id),title:g.name||"Obiettivo",icon:g.icon||"🎯",saved:saved,target:target,percent:percent,color:g.color||widget3AccentColor,textColor:widget3TextColor,percentColor:widget3PercentColor,currency:sym};});
    function calcShareWidgetProject(project){
    if(!project)return null;
    var participants=(project.participants||[]);
    var member=participants.find(function(p){return p.uid===userId;})||participants.find(function(p){return p.id==="me";})||participants[0]||null;
    var currentId=member?member.id:"me";
    var balances={};
    participants.forEach(function(p){balances[p.id]=0;});
    ((project&&project.activities)||[]).forEach(function(a){
      if(a.kind==="settlement"){
        balances[a.from]=(balances[a.from]||0)+Number(a.amount||0);
        balances[a.to]=(balances[a.to]||0)-Number(a.amount||0);
        return;
      }
      var paid=a.paidBy||"me";
      balances[paid]=(balances[paid]||0)+Number(a.amount||0);
      Object.keys(a.shares||{}).forEach(function(pid){balances[pid]=(balances[pid]||0)-Number(a.shares[pid]||0);});
    });
    var net=Math.round(Number(balances[currentId]||0)*100)/100;
    var last=((project&&project.activities)||[])[0]||null;
    var lastText=last?(last.kind==="settlement"?"Ultimo saldo: "+fmt(Number(last.amount||0)):(last.desc||"Ultima spesa")+" · "+fmt(Number(last.amount||0))):"Nessuna attività recente";
    return {
      id:String(project.id),
      projectId:String(project.id),
      name:project.name||"Progetto Share",
      projectName:project.name||"Progetto Share",
      netAmount:net,
      owedAmount:Math.max(0,net),
      oweAmount:Math.max(0,-net),
      lastActivity:lastText,
      currency:sym
    };
  }
    var shareWidgetProjectItems=(shareProjects||[]).map(calcShareWidgetProject).filter(Boolean);
    var selectedShareProject=shareWidgetProjectItems.find(function(p){return String(p.projectId)===String(widgetShareSelectedProjectId);})||shareWidgetProjectItems.find(function(p){return String(p.projectId)===String(shareSelectedProjectId);})||shareWidgetProjectItems[0]||null;
    function readWidgetLocalValue(key,fallback){try{var raw=localStorage.getItem(userKey(key));if(!raw)return fallback;try{return JSON.parse(raw);}catch(e){return raw;}}catch(e){return fallback;}}
    var widgetShoppingLists=readWidgetLocalValue("shopping_lists_v2",[{id:"main",title:"Lista principale",icon:"🧺"}]);
    if(!Array.isArray(widgetShoppingLists)||!widgetShoppingLists.length)widgetShoppingLists=[{id:"main",title:"Lista principale",icon:"🧺"}];
    var widgetActiveShoppingListId=String(readWidgetLocalValue("shopping_active_list_id_v2","main")||"main");
    var widgetActiveShoppingList=widgetShoppingLists.find(function(l){return String(l.id)===widgetActiveShoppingListId;})||widgetShoppingLists[0];
    var shoppingWidgetAllItems=(shoppingItems||[]).filter(function(x){return !x.archived;}).map(function(x){return{id:String(x.id),name:x.name||"Prodotto",area:x.area||"Altro",bought:!!x.bought,listId:String(x.listId||"main"),action:"toggle-shopping-item"};});
    var shoppingWidgetItems=shoppingWidgetAllItems.filter(function(x){return String(x.listId||"main")===String(widgetActiveShoppingList&&widgetActiveShoppingList.id||"main");}).sort(function(a,b){if(!!a.bought!==!!b.bought)return a.bought?1:-1;return String(a.name||"").localeCompare(String(b.name||""));}).slice(0,Math.max(1,Number(widgetShoppingListMaxItems)||8));
    var fidelityWidgetCards=(shoppingCards||[]).map(function(c){return{id:String(c.id),name:c.name||"Carta",code:String(c.code||""),codeType:c.codeType||c.type||"barcode",type:c.type||"fidelity",color:c.color||"#0F9F76"};});
    var selectedFidelityCard=fidelityWidgetCards.find(function(c){return String(c.id)===String(widgetFidelitySelectedCardId);})||fidelityWidgetCards[0]||null;
    function debtWidgetBalance(item){var v=Number(item.initialAmount||0);(item.transactions||[]).forEach(function(tx){var a=Number(tx.amount||0);v+=tx.action==="increase"?a:-a;});return Math.max(0,Math.round(v*100)/100);}
    var debtWidgetAllItems=(debtCredits||[]).map(function(x){return{id:String(x.id),holder:x.holder||"",kind:x.kind||"debt",balance:debtWidgetBalance(x),closed:debtWidgetBalance(x)<=0,currency:sym};});
    var debtWidgetItems=debtWidgetAllItems.filter(function(x){return widgetDebtCreditsMode==="all"||!x.closed;}).slice(0,6);
    return {
      bgColor:widgetBgColor,
      bgAlpha:widgetBgAlpha,
      expenseColor:widgetExpenseColor,
      incomeColor:widgetIncomeColor,
      title:widgetTitle,
      subtitle:widgetSubtitle,
      expenseLabel:widgetExpenseLabel,
      incomeLabel:widgetIncomeLabel,
      showHeader:!!widgetShowHeader,
      buttonStyle:widgetButtonStyle,
      quickAdd:{
        bgColor:widgetBgColor,
        bgAlpha:widgetBgAlpha,
        expenseColor:widgetExpenseColor,
        incomeColor:widgetIncomeColor,
        title:widgetTitle,
        subtitle:widgetSubtitle,
        expenseLabel:widgetExpenseLabel,
        incomeLabel:widgetIncomeLabel,
        showHeader:!!widgetShowHeader,
        buttonStyle:widgetButtonStyle,
        compactSingleRow:true,
        reduceButtonHeightPct:15,
        removeButtonWhiteOverlay:true,
        widgetCornerRadius:"soft",
        showVoiceButton:!!widgetVoiceEnabled,
        voiceLabel:L("Voce"),
        voiceIcon:"🎙️",
        voiceAction:"open-voice",
        voiceUrlScheme:"fainance://open-voice",
        receiptLabel:"Scontrino",
        receiptIcon:"📷",
        receiptAction:"open-receipt-camera",
        receiptUrlScheme:"fainance://open-receipt-camera",
        logoKind:"official",
        logoLabel:"fAI"
      },
      shoppingListWidget:{
        enabled:isWidgetAllowed("shoppingList")&&!!widgetShoppingListEnabled,
        title:L("Lista spesa"),
        subtitle:L("Tocca un articolo quando è nel carrello"),
        accentColor:widgetShoppingListAccentColor||confirmButtonColor||"#EF9F27",
        iconColor:widgetShoppingListIconColor||widgetShoppingListAccentColor||confirmButtonColor||"#EF9F27",
        titleColor:widgetShoppingListTitleColor||"#FFFFFF",
        textColor:widgetShoppingListTextColor||"#EDEDF7",
        textSize:Number(widgetShoppingListTextSize)||13,
        bgAlpha:numOr(widgetShoppingListBgAlpha,65),
        autoUpdate:!!widgetShoppingListAutoUpdate,
        selectedListId:String(widgetActiveShoppingList&&widgetActiveShoppingList.id||"main"),
        selectedListTitle:String((widgetActiveShoppingList&&(widgetActiveShoppingList.title||widgetActiveShoppingList.name))||"Lista spesa"),
        lists:widgetShoppingLists.map(function(l){return{id:String(l.id||"main"),title:String(l.title||l.name||"Lista"),icon:String(l.icon||"🧺")};}),
        boughtColor:shoppingBoughtColor||"#EAF7EE",
        maxItems:Number(widgetShoppingListMaxItems)||8,
        items:shoppingWidgetItems,
        allItems:shoppingWidgetAllItems,
        emptyText:L("Lista della spesa vuota"),
        toggleAction:"toggle-shopping-item",
        dynamic:true
      },
      fidelityWidget:{
        enabled:isWidgetAllowed("fidelity")&&!!widgetFidelityEnabled,
        title:L("Fidelity card"),
        accentColor:widgetFidelityAccentColor||"#378ADD",
        iconColor:widgetFidelityIconColor||widgetFidelityAccentColor||"#0F9F76",
        titleColor:widgetFidelityTitleColor||"#FFFFFF",
        textColor:widgetFidelityTextColor||"#FFFFFF",
        textSize:Number(widgetFidelityTextSize)||14,
        bgAlpha:numOr(widgetFidelityBgAlpha,65),
        autoUpdate:!!widgetFidelityAutoUpdate,
        selectedCardId:selectedFidelityCard?String(selectedFidelityCard.id):"",
        selectedCard:selectedFidelityCard,
        cards:fidelityWidgetCards
      },
      debtCreditsWidget:{
        enabled:isWidgetAllowed("debtCredits")&&!!widgetDebtCreditsEnabled,
        title:L("Debiti / Crediti"),
        accentColor:widgetDebtCreditsAccentColor||"#7F77DD",
        iconColor:widgetDebtCreditsIconColor||widgetDebtCreditsAccentColor||"#7F77DD",
        titleColor:widgetDebtCreditsTitleColor||"#FFFFFF",
        textColor:widgetDebtCreditsTextColor||"#EDEDF7",
        textSize:Number(widgetDebtCreditsTextSize)||13,
        bgAlpha:numOr(widgetDebtCreditsBgAlpha,65),
        autoUpdate:!!widgetDebtCreditsAutoUpdate,
        mode:widgetDebtCreditsMode||"open",
        items:debtWidgetItems,
        allItems:debtWidgetAllItems,
        selectedIds:debtWidgetItems.map(function(x){return String(x.id);}),
        currency:sym
      },
      shareWidget:{
        enabled:isWidgetAllowed("share"),
        title:"Share",
        projectId:selectedShareProject?String(selectedShareProject.projectId):"",
        projectName:selectedShareProject?(selectedShareProject.projectName||"Progetto Share"):"Nessun progetto selezionato",
        netAmount:selectedShareProject?Number(selectedShareProject.netAmount||0):0,
        owedAmount:selectedShareProject?Number(selectedShareProject.owedAmount||0):0,
        oweAmount:selectedShareProject?Number(selectedShareProject.oweAmount||0):0,
        lastActivity:selectedShareProject?(selectedShareProject.lastActivity||"Nessuna attività recente"):"Nessuna attività recente",
        currency:sym,
        bgColor:widgetShareBgColor,
        bgAlpha:numOr(widgetShareBgAlpha,65),
        accentColor:widgetShareAccentColor||confirmButtonColor||"#7F77DD",
        activityColor:widgetShareActivityColor||"#378ADD",
        titleColor:widgetShareTitleColor||"#FFFFFF",
        bodyColor:widgetShareBodyColor||"#D8D6F2",
        autoUpdate:!!widgetShareAutoUpdate,
        projectItems:shareWidgetProjectItems
      },
      noteWidget:{
        enabled:!!widget2Enabled,
        type:widget2Type,
        accentColor:widget2AccentColor,
        titleColor:widget2TitleColor,
        bodyColor:widget2BodyColor,
        bgAlpha:numOr(widget2BgAlpha,65),
        maxChars:Number(widget2MaxChars)||500,
        textSize:Number(widget2TextSize)||14,
        autoUpdate:!!widget2AutoUpdate,
        selectedNoteId:widget2SelectedNoteId,
        selectedBankId:widget2SelectedBankId,
        title:widget2Type==="bank"?(bankTitle||"Coordinata bancaria"):(selectedNote?(selectedNote.title||"Nota"):"Nota"),
        body:widget2Type==="bank"?(bankIban||"Nessun IBAN selezionato"):(cleanNoteText||"Nessuna nota selezionata"),
        bankHolder:selectedBank?(selectedBank.holder||""):"",
        bankBic:selectedBank?(selectedBank.bic||""):"",
        bankNote:selectedBank?(selectedBank.note||""):"",
        noteItems:widgetNoteItems,
        bankItems:widgetBankItems
      },
      goalWidget:{
        enabled:!!widget3Enabled,
        accentColor:widget3AccentColor,
        textColor:widget3TextColor,
        percentColor:widget3PercentColor,
        bgAlpha:numOr(widget3BgAlpha,65),
        autoUpdate:!!widget3AutoUpdate,
        selectedGoalId:widget3SelectedGoalId,
        showPercent:!!widget3ShowPercent,
        showAmounts:!!widget3ShowAmounts,
        title:selectedGoal?(selectedGoal.name||"Obiettivo"):"Nessun obiettivo",
        icon:selectedGoal?(selectedGoal.icon||"🎯"):"🎯",
        target:goalTarget,
        saved:goalSaved,
        percent:goalPct,
        color:widget3AccentColor,
        currency:sym,
        goalItems:widgetGoalItems
      }
    };
  }

  function saveWidgetSettingsToNative(showMessage,overridePayload){
    var payload=enforceWidgetPlanPayload(overridePayload||widgetSettingsPayload());
    try{
      var prefs=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Preferences;
      var bridge=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.WidgetBridge;
      var payloadString=JSON.stringify(payload);
      try{
        if(bridge&&bridge.setWidgetAvailability){bridge.setWidgetAvailability({currentPlan:String(payload.widget_current_plan||currentPlanRef.current||currentPlan||"free"),availableTypes:payload.widget_available_types||[],enabledTypes:payload.widget_enabled_types||[],disabledTypes:payload.widget_disabled_types||[],planAvailability:payload.widget_plan_availability||{}}).catch(function(){});}
        if(bridge&&bridge.setAvailableWidgets){bridge.setAvailableWidgets({types:payload.widget_available_types||[],currentPlan:String(payload.widget_current_plan||currentPlanRef.current||currentPlan||"free")}).catch(function(){});}
      }catch(e){}
      var legacyQuickAddPayload={
        bgColor:(payload.quickAdd&&payload.quickAdd.bgColor)||payload.bgColor,
        bgAlpha:(payload.quickAdd&&payload.quickAdd.bgAlpha)||payload.bgAlpha,
        expenseColor:(payload.quickAdd&&payload.quickAdd.expenseColor)||payload.expenseColor,
        incomeColor:(payload.quickAdd&&payload.quickAdd.incomeColor)||payload.incomeColor,
        title:(payload.quickAdd&&payload.quickAdd.title)||payload.title,
        subtitle:(payload.quickAdd&&payload.quickAdd.subtitle)||payload.subtitle,
        expenseLabel:(payload.quickAdd&&payload.quickAdd.expenseLabel)||payload.expenseLabel,
        incomeLabel:(payload.quickAdd&&payload.quickAdd.incomeLabel)||payload.incomeLabel,
        showHeader:(payload.quickAdd&&payload.quickAdd.showHeader)!==undefined?!!payload.quickAdd.showHeader:!!payload.showHeader,
        buttonStyle:(payload.quickAdd&&payload.quickAdd.buttonStyle)||payload.buttonStyle,
        showVoiceButton:(payload.quickAdd&&payload.quickAdd.showVoiceButton)!==undefined?!!payload.quickAdd.showVoiceButton:true,
        voiceLabel:(payload.quickAdd&&payload.quickAdd.voiceLabel)||"Voce",
        voiceIcon:(payload.quickAdd&&payload.quickAdd.voiceIcon)||"🎙️",
        voiceAction:(payload.quickAdd&&payload.quickAdd.voiceAction)||"open-voice",
        voiceUrlScheme:(payload.quickAdd&&payload.quickAdd.voiceUrlScheme)||"fainance://open-voice",
        logoKind:(payload.quickAdd&&payload.quickAdd.logoKind)||"official",
        logoLabel:(payload.quickAdd&&payload.quickAdd.logoLabel)||"fAI",
        receiptLabel:(payload.quickAdd&&payload.quickAdd.receiptLabel)||"Scontrino",
        receiptIcon:(payload.quickAdd&&payload.quickAdd.receiptIcon)||"📷",
        receiptAction:(payload.quickAdd&&payload.quickAdd.receiptAction)||"open-receipt-camera",
        receiptUrlScheme:(payload.quickAdd&&payload.quickAdd.receiptUrlScheme)||"fainance://open-receipt-camera"
      };
      var quickString=JSON.stringify(legacyQuickAddPayload);
      var noteString=JSON.stringify(payload.noteWidget||{});
      var goalString=JSON.stringify(payload.goalWidget||{});
      var shareString=JSON.stringify(payload.shareWidget||{});
      var shoppingListString=JSON.stringify(payload.shoppingListWidget||{});
      var fidelityString=JSON.stringify(payload.fidelityWidget||{});
      var debtCreditsString=JSON.stringify(payload.debtCreditsWidget||{});
      var afterNativeUpdate=function(){if(showMessage)setToast("Widget aggiornato");};
      var fallbackSave=function(){
        var afterSave=function(){
          if(bridge&&bridge.updateAllWidgets){
            bridge.updateAllWidgets().then(afterNativeUpdate).catch(function(){if(showMessage)setToast("Widget aggiornato");});
          } else if(bridge&&bridge.updateQuickAddWidget){
            bridge.updateQuickAddWidget().then(function(){if(showMessage)setToast("Widget aggiornato");}).catch(function(){if(showMessage)setToast("Widget aggiornato");});
          } else {
            if(showMessage)setToast("Widget aggiornato");
          }
        };
        if(prefs&&prefs.set){
          Promise.all([
            prefs.set({key:"widget_settings_v2",value:payloadString}),
            prefs.set({key:"widget_quick_add_settings",value:quickString}),
            prefs.set({key:"widget_note_settings",value:noteString}),
            prefs.set({key:"widget_goal_settings",value:goalString}),
            prefs.set({key:"widget_share_settings",value:shareString}),
            prefs.set({key:"widget_shopping_list_settings",value:shoppingListString}),
            prefs.set({key:"widget_shopping_list_bg_alpha",value:String((payload.shoppingListWidget&&payload.shoppingListWidget.bgAlpha)||65)}),
            prefs.set({key:"widget_fidelity_settings",value:fidelityString}),
            prefs.set({key:"widget_debt_credits_settings",value:debtCreditsString}),
            prefs.set({key:"widget_current_plan",value:String(payload.widget_current_plan||currentPlanRef.current||currentPlan||"free")}),
            prefs.set({key:"widget_available_types",value:JSON.stringify(payload.widget_available_types||[])}),
            prefs.set({key:"widget_order",value:JSON.stringify(payload.widget_order||WIDGET_TYPE_ORDER)}),
            prefs.set({key:"widget_enabled_types",value:JSON.stringify(payload.widget_enabled_types||[])}),
            prefs.set({key:"widget_disabled_types",value:JSON.stringify(payload.widget_disabled_types||[])}),
            prefs.set({key:"widget_plan_availability",value:JSON.stringify(payload.widget_plan_availability||{})})
          ]).then(afterSave).catch(function(){if(showMessage)setToast({text:"Errore salvataggio widget",type:"error",color:"#E24B4A",icon:"🚫"});});
        } else {
          localStorage.setItem("widget_settings_v2",payloadString);
          localStorage.setItem("widget_quick_add_settings",quickString);
          localStorage.setItem("widget_note_settings",noteString);
          localStorage.setItem("widget_goal_settings",goalString);
          localStorage.setItem("widget_share_settings",shareString);
          localStorage.setItem("widget_shopping_list_settings",shoppingListString);
          localStorage.setItem("widget_fidelity_settings",fidelityString);
          localStorage.setItem("widget_debt_credits_settings",debtCreditsString);
          localStorage.setItem("widget_current_plan",String(payload.widget_current_plan||currentPlanRef.current||currentPlan||"free"));
          localStorage.setItem("widget_available_types",JSON.stringify(payload.widget_available_types||[]));
          localStorage.setItem("widget_order",JSON.stringify(payload.widget_order||WIDGET_TYPE_ORDER));
          localStorage.setItem("widget_enabled_types",JSON.stringify(payload.widget_enabled_types||[]));
          localStorage.setItem("widget_disabled_types",JSON.stringify(payload.widget_disabled_types||[]));
          localStorage.setItem("widget_plan_availability",JSON.stringify(payload.widget_plan_availability||{}));
          afterSave();
        }
      };
      if(bridge&&bridge.saveAndUpdateWidgets){
        bridge.saveAndUpdateWidgets({
          settings:payloadString,
          quickAdd:quickString,
          note:noteString,
          goal:goalString,
          share:shareString,
          shoppingList:shoppingListString,
          fidelity:fidelityString,
          debtCredits:debtCreditsString,
          currentPlan:String(payload.widget_current_plan||currentPlanRef.current||currentPlan||"free"),
          availableTypes:JSON.stringify(payload.widget_available_types||[]),
          widgetOrder:JSON.stringify(payload.widget_order||WIDGET_TYPE_ORDER),
          enabledTypes:JSON.stringify(payload.widget_enabled_types||[]),
          disabledTypes:JSON.stringify(payload.widget_disabled_types||[]),
          planAvailability:JSON.stringify(payload.widget_plan_availability||{})
        }).then(function(){
          if(prefs&&prefs.set){
            Promise.all([
              prefs.set({key:"widget_settings_v2",value:payloadString}),
              prefs.set({key:"widget_quick_add_settings",value:quickString}),
              prefs.set({key:"widget_note_settings",value:noteString}),
              prefs.set({key:"widget_goal_settings",value:goalString}),
              prefs.set({key:"widget_share_settings",value:shareString}),
              prefs.set({key:"widget_shopping_list_settings",value:shoppingListString}),
              prefs.set({key:"widget_fidelity_settings",value:fidelityString}),
              prefs.set({key:"widget_debt_credits_settings",value:debtCreditsString})
            ]).catch(function(){});
          }
          afterNativeUpdate();
        }).catch(fallbackSave);
      } else {
        fallbackSave();
      }
    }catch(e){if(showMessage)setToast({text:"Errore salvataggio widget",type:"error",color:"#E24B4A",icon:"🚫"});}
  }


  function syncShoppingListChangesFromNativeWidget(){
    try{
      if(!(window&&window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()))return;
      var prefs=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Preferences;
      if(!prefs||!prefs.get)return;
      prefs.get({key:"widget_shopping_list_item_updates_v1"}).then(function(res){
        var raw=res&&res.value?String(res.value):"";
        if(!raw)return;
        var updates=[];
        try{updates=JSON.parse(raw);}catch(e){updates=[];}
        if(!Array.isArray(updates)||!updates.length)return;
        var map={};
        updates.forEach(function(u){if(u&&u.id!==undefined&&u.id!==null)map[String(u.id)]={bought:!!u.bought,updatedAt:u.updatedAt||new Date().toISOString()};});
        var keys=Object.keys(map);
        if(!keys.length)return;
        setShoppingItems(function(list){
          var changed=false;
          var next=(list||[]).map(function(x){
            var u=map[String(x.id)];
            if(!u)return x;
            if(!!x.bought===!!u.bought)return x;
            changed=true;
            return {...x,bought:!!u.bought,updatedAt:u.updatedAt};
          });
          if(changed){try{setTimeout(function(){try{saveWidgetSettingsToNative(false);}catch(e){}},180);}catch(e){}}
          return changed?next:list;
        });
        if(prefs.remove)prefs.remove({key:"widget_shopping_list_item_updates_v1"}).catch(function(){});
        else prefs.set({key:"widget_shopping_list_item_updates_v1",value:"[]"}).catch(function(){});
      }).catch(function(){});
    }catch(e){}
  }

  useEffect(function(){
    try{
      if(!(window&&window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()))return;
      var timers=[setTimeout(syncShoppingListChangesFromNativeWidget,160),setTimeout(syncShoppingListChangesFromNativeWidget,900)];
      var removeResume=null;
      try{
        import("@capacitor/app").then(function(mod){
          if(mod&&mod.App&&mod.App.addListener){
            mod.App.addListener("resume",function(){syncShoppingListChangesFromNativeWidget();}).then(function(l){removeResume=l;}).catch(function(){});
          }
        }).catch(function(){});
      }catch(e){}
      function onVis(){try{if(!document.hidden)syncShoppingListChangesFromNativeWidget();}catch(e){}}
      function onFocus(){syncShoppingListChangesFromNativeWidget();}
      document.addEventListener("visibilitychange",onVis);
      window.addEventListener("focus",onFocus);
      return function(){try{timers.forEach(clearTimeout);}catch(e){};try{document.removeEventListener("visibilitychange",onVis);}catch(e){};try{window.removeEventListener("focus",onFocus);}catch(e){};try{if(removeResume&&removeResume.remove)removeResume.remove();}catch(e){}};
    }catch(e){}
  },[]);

  // HOTFIX 1.0.9: non aggiorna i widget nativi automaticamente all'avvio.
  // Il salvataggio resta disponibile dalle impostazioni widget, evitando crash nativi in apertura app.





  useEffect(function(){
    if(!(window&&window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()))return;
    var timer=setTimeout(function(){try{saveWidgetSettingsToNative(false);}catch(e){}},600);
    return function(){clearTimeout(timer);};
  },[widgetBgColor,widgetBgAlpha,widgetExpenseColor,widgetIncomeColor,widgetTitle,widgetSubtitle,widgetExpenseLabel,widgetIncomeLabel,widgetShowHeader,widgetButtonStyle,widgetVoiceEnabled,widget2Enabled,widget2Type,widget2AccentColor,widget2TitleColor,widget2BodyColor,widget2BgAlpha,widget2MaxChars,widget2TextSize,widget2SelectedNoteId,widget2SelectedBankId,widget3Enabled,widget3AccentColor,widget3TextColor,widget3PercentColor,widget3BgAlpha,widget3SelectedGoalId,widget3ShowPercent,widget3ShowAmounts,widgetShareSelectedProjectId,widgetShareBgColor,widgetShareBgAlpha,widgetShareAccentColor,widgetShareActivityColor,widgetShareTitleColor,widgetShareBodyColor,widgetShareAutoUpdate,widgetShoppingListEnabled,widgetShoppingListMaxItems,widgetShoppingListAccentColor,widgetFidelityEnabled,widgetFidelitySelectedCardId,widgetFidelityAccentColor,widgetDebtCreditsEnabled,widgetDebtCreditsMode,widgetDebtCreditsAccentColor,shoppingItems,shoppingCards,debtCredits,appuntiNotes,bankCoords,goals,shareProjects,shareSelectedProjectId,confirmButtonColor,currentPlan,planUsage,shownAlertIds]);
  function AppuntiPanel(){
    function L(s){return translateUiRuntimeText?translateUiRuntimeText(s):s;}
    var [noteTitle,setNoteTitle]=useState("");
    var [noteText,setNoteText]=useState("");
    var [editingNoteId,setEditingNoteId]=useState(null);
    var [bankForm,setBankForm]=useState({bank:"",holder:"",iban:"",bic:"",note:""});
    var [editingBankId,setEditingBankId]=useState(null);
    var [editingDocumentId,setEditingDocumentId]=useState(null);
    var [documentNameDraft,setDocumentNameDraft]=useState("");
    var fileInputRef=useRef(null);
    var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
    function handleFiles(ev){var files=Array.from((ev.target&&ev.target.files)||[]);if(!files.length)return;if(!canAddPlanItem("documents",(appuntiDocuments||[]).length,files.length)){setToast({text:upgradeMessage("documents",(appuntiDocuments||[]).length),type:"error",color:"#E24B4A",icon:"🚫"});ev.target.value="";return;}files.forEach(function(file){var allowed=/pdf|image|spreadsheet|excel|sheet|csv|officedocument/i.test(file.type)||/\.(pdf|png|jpe?g|webp|gif|xlsx?|csv)$/i.test(file.name);if(!allowed){setToast("Formato non supportato");return;}var reader=new FileReader();reader.onload=function(e){setAppuntiDocuments(function(p){return [{id:Date.now()+Math.random(),name:file.name,type:file.type||"file",size:file.size,createdAt:new Date().toISOString(),dataUrl:e.target.result},...p];});setToast("Documento caricato");};reader.readAsDataURL(file);});ev.target.value="";}
    function saveNote(){if(!noteTitle.trim()&&!noteText.trim())return;if(!editingNoteId&&!canAddPlanItem("notes",(appuntiNotes||[]).length,1)){setToast({text:upgradeMessage("notes",(appuntiNotes||[]).length),type:"error",color:"#E24B4A",icon:"🚫"});return;}if(editingNoteId){setAppuntiNotes(function(p){return p.map(function(n){return n.id===editingNoteId?{...n,title:noteTitle.trim()||"Appunto",text:noteText.trim(),updatedAt:new Date().toISOString()}:n;});});setToast("Appunto modificato");}else{setAppuntiNotes(function(p){return [{id:Date.now(),title:noteTitle.trim()||"Appunto",text:noteText.trim(),createdAt:new Date().toISOString()},...p];});setToast("Appunto salvato");}setEditingNoteId(null);setNoteTitle("");setNoteText("");}
    function editNote(n){setEditingNoteId(n.id);setNoteTitle(n.title||"");setNoteText(n.text||"");}
    function cancelNoteEdit(){setEditingNoteId(null);setNoteTitle("");setNoteText("");}
    function saveBank(){if(!bankForm.iban.trim()&&!bankForm.bank.trim())return;if(!editingBankId&&!canAddPlanItem("bankNotes",(bankCoords||[]).length,1)){setToast({text:upgradeMessage("bankNotes",(bankCoords||[]).length),type:"error",color:"#E24B4A",icon:"🚫"});return;}if(editingBankId){setBankCoords(function(p){return p.map(function(b){return b.id===editingBankId?{...b,...bankForm,updatedAt:new Date().toISOString()}:b;});});setToast("Coordinate bancarie aggiornate");}else{setBankCoords(function(p){return [{...bankForm,id:Date.now(),createdAt:new Date().toISOString()},...p];});setToast("Coordinate bancarie salvate");}setEditingBankId(null);setBankForm({bank:"",holder:"",iban:"",bic:"",note:""});}
    function editBank(b){try{if(!b||!b.id)return;setEditingBankId(b.id);setBankForm({bank:b.bank||"",holder:b.holder||"",iban:b.iban||"",bic:b.bic||"",note:b.note||""});}catch(e){setToast("Errore modifica coordinata bancaria");}}
    function cancelBankEdit(){setEditingBankId(null);setBankForm({bank:"",holder:"",iban:"",bic:"",note:""});}
    function editDocument(d){setEditingDocumentId(d.id);setDocumentNameDraft(d.name||"");}
    function cancelDocumentEdit(){setEditingDocumentId(null);setDocumentNameDraft("");}
    function saveDocumentEdit(){if(!editingDocumentId)return;var name=(documentNameDraft||"").trim()||"Documento";setAppuntiDocuments(function(p){return(p||[]).map(function(d){return d.id===editingDocumentId?{...d,name:name,updatedAt:new Date().toISOString()}:d;});});setEditingDocumentId(null);setDocumentNameDraft("");setToast("Documento modificato correttamente");}
    function fmtSize(n){if(!n)return "";if(n<1024)return n+" B";if(n<1024*1024)return Math.round(n/1024)+" KB";return (n/1024/1024).toFixed(1).replace(".",",")+" MB";}
    var documentsLocked=!settingAllowed("base");
    var notesLimitReached=!editingNoteId&&!canAddPlanItem("notes",(appuntiNotes||[]).length,1);
    var bankLimitReached=!editingBankId&&!canAddPlanItem("bankNotes",(bankCoords||[]).length,1);
    var documentsLimitReached=!editingDocumentId&&!canAddPlanItem("documents",(appuntiDocuments||[]).length,1);
    function LimitReachedBox(){return <div style={{background:dark?"#4b3d1b":"#FFF3CD",border:"1px solid "+(dark?"#80672a":"#FFD54F"),borderRadius:12,padding:"10px 12px",fontSize:12,color:dark?"#FFE5A6":"#856404",fontWeight:800,lineHeight:1.4,marginBottom:12}}>⚠️ {L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione.")}</div>;}
    return <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:documentsLimitReached?(dark?"#342b16":"#FFF8E1"):cardBg,borderRadius:14,border:"1px solid "+(documentsLimitReached?(dark?"#6a5520":"#FFD54F"):borderC),padding:20}}><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>📎 {L("Documenti")}</div><div style={{fontSize:12,color:documentsLimitReached?(dark?"#FFE5A6":"#856404"):subC,marginBottom:12}}>{documentsLimitReached?L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione."):L("Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell’account.")}</div>{documentsLimitReached&&<LimitReachedBox/>}<input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.xls,.xlsx,.csv,image/*,application/pdf" style={{display:"none"}} onChange={handleFiles}/><Btn onClick={function(){if(documentsLimitReached)return;fileInputRef.current&&fileInputRef.current.click();}} bg={documentsLimitReached?"#999":"#7F77DD"} disabled={documentsLimitReached} style={{marginBottom:12}}>{L("+ Carica documento")}</Btn>{(!appuntiDocuments||appuntiDocuments.length===0)&&<div style={{fontSize:13,color:"#bbb",padding:"16px 0",textAlign:"center"}}>{L("Nessun documento caricato")}</div>}{(appuntiDocuments||[]).map(function(d){var isEditingDoc=editingDocumentId===d.id;return <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:20}}>{/image/i.test(d.type)?"🖼":/pdf/i.test(d.type)||/\.pdf$/i.test(d.name)?"📄":"📊"}</span><div style={{flex:1,minWidth:0}}>{isEditingDoc?<div style={{display:"flex",flexDirection:"column",gap:6}}><input value={documentNameDraft} onChange={function(e){setDocumentNameDraft(e.target.value);}} style={sinp}/><div style={{display:"flex",gap:6}}><Btn onClick={saveDocumentEdit} bg="#378ADD" style={{padding:"6px 10px",fontSize:12}}>{L("Salva")}</Btn><Btn onClick={cancelDocumentEdit} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#555"} style={{padding:"6px 10px",fontSize:12}}>{L("Annulla")}</Btn></div></div>:<><div style={{fontSize:13,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div><div style={{fontSize:11,color:subC}}>{fmtSize(d.size)} · {d.createdAt?fmtDate(d.createdAt.slice(0,10),dateFmt):""}</div></>}</div>{!isEditingDoc&&d.dataUrl&&<button onClick={function(){var w=window.open();if(w)w.document.write('<iframe src="'+d.dataUrl+'" style="border:0;width:100%;height:100vh"></iframe>');}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13}}>{L("Apri")}</button>}{!isEditingDoc&&<button onClick={function(){editDocument(d);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",borderRadius:8,cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",fontWeight:700}}>✏️</button>}<button onClick={function(){if(!window.confirm(L("Eliminare questo documento?")))return;if(editingDocumentId===d.id)cancelDocumentEdit();setAppuntiDocuments(function(p){return p.filter(function(x){return x.id!==d.id;});});setToast("Documento eliminato");}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",borderRadius:8,cursor:"pointer",color:"#E24B4A",fontSize:14,padding:"5px 8px",fontWeight:700}}>🗑️</button></div>;})}</div>
      <div style={{background:notesLimitReached?(dark?"#342b16":"#FFF8E1"):cardBg,borderRadius:14,border:"1px solid "+(notesLimitReached?(dark?"#6a5520":"#FFD54F"):borderC),padding:20}}><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:12}}>{L("📝 Appunti di testo")}</div>{notesLimitReached&&<LimitReachedBox/>}<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}><input placeholder={L("Titolo")} value={noteTitle} onChange={function(e){setNoteTitle(e.target.value);}} style={sinp} disabled={notesLimitReached&&!editingNoteId}/><textarea placeholder={L("Scrivi un appunto...")} value={noteText} onChange={function(e){setNoteText(e.target.value);}} style={{...sinp,minHeight:90,resize:"vertical"}} disabled={notesLimitReached&&!editingNoteId}/><div style={{display:"flex",gap:8}}><Btn onClick={saveNote} bg={notesLimitReached?"#999":"#378ADD"} disabled={notesLimitReached&&!editingNoteId}>{L(editingNoteId?"Aggiorna appunto":"Salva appunto")}</Btn>{editingNoteId&&<Btn onClick={cancelNoteEdit} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#555"}>{L("Annulla")}</Btn>}</div></div>{(!appuntiNotes||appuntiNotes.length===0)&&<div style={{fontSize:13,color:"#bbb",padding:"12px 0",textAlign:"center"}}>{L("Nessun appunto")}</div>}{(appuntiNotes||[]).map(function(n){return <div key={n.id} style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:10,border:"1px solid "+borderC,padding:"10px 12px",marginBottom:8}}><div style={{display:"flex",gap:8,alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:textC}}>{n.title}</div><div style={{fontSize:12,color:subC,whiteSpace:"pre-wrap",marginTop:4}}>{n.text}</div></div><button onClick={function(){editNote(n);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",borderRadius:8,cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",fontWeight:700}}>✏️</button><button onClick={function(){if(!window.confirm(L("Eliminare questa nota?")))return;if(widget2SelectedNoteId===n.id)setWidget2SelectedNoteId("");setAppuntiNotes(function(p){return p.filter(function(x){return x.id!==n.id;});});setToast(L("Nota eliminata"));}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",borderRadius:8,cursor:"pointer",color:"#E24B4A",fontSize:14,padding:"5px 8px",fontWeight:700}}>🗑️</button></div></div>;})}</div>
      <div style={{background:bankLimitReached?(dark?"#342b16":"#FFF8E1"):cardBg,borderRadius:14,border:"1px solid "+(bankLimitReached?(dark?"#6a5520":"#FFD54F"):borderC),padding:20}}><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:12}}>{L("🏦 Coordinate bancarie")}</div>{bankLimitReached&&<LimitReachedBox/>}<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:12}}><input placeholder={L("Banca")} value={bankForm.bank} onChange={function(e){setBankForm(function(p){return{...p,bank:e.target.value};});}} style={sinp} disabled={bankLimitReached&&!editingBankId}/><input placeholder={L("Intestatario")} value={bankForm.holder} onChange={function(e){setBankForm(function(p){return{...p,holder:e.target.value};});}} style={sinp} disabled={bankLimitReached&&!editingBankId}/><input placeholder="IBAN" value={bankForm.iban} onChange={function(e){setBankForm(function(p){return{...p,iban:e.target.value};});}} style={sinp} disabled={bankLimitReached&&!editingBankId}/><input placeholder="BIC/SWIFT" value={bankForm.bic} onChange={function(e){setBankForm(function(p){return{...p,bic:e.target.value};});}} style={sinp} disabled={bankLimitReached&&!editingBankId}/><input placeholder={L("Note")} value={bankForm.note} onChange={function(e){setBankForm(function(p){return{...p,note:e.target.value};});}} style={{...sinp,gridColumn:isMobile?"auto":"1 / -1"}} disabled={bankLimitReached&&!editingBankId}/></div><div style={{display:"flex",gap:8,marginBottom:12}}><Btn onClick={saveBank} bg={bankLimitReached?"#999":"#1D9E75"} disabled={bankLimitReached&&!editingBankId}>{L(editingBankId?"Aggiorna coordinate":"Salva coordinate")}</Btn>{editingBankId&&<Btn onClick={cancelBankEdit} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#555"}>{L("Annulla")}</Btn>}</div>{(!bankCoords||bankCoords.length===0)&&<div style={{fontSize:13,color:"#bbb",padding:"12px 0",textAlign:"center"}}>{L("Nessuna coordinata salvata")}</div>}{(bankCoords||[]).map(function(b){return <div key={b.id} style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:10,border:"1px solid "+borderC,padding:"10px 12px",marginBottom:8}}><div style={{display:"flex",gap:8,alignItems:"flex-start"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:textC}}>{b.bank||"Banca"}</div><div style={{fontSize:12,color:subC}}>{L("Intestatario")}: {b.holder||"—"}</div><div style={{fontSize:12,color:textC,wordBreak:"break-all",fontWeight:600}}>IBAN: {b.iban||"—"}</div><div style={{fontSize:12,color:subC}}>BIC/SWIFT: {b.bic||"—"}</div>{b.note&&<div style={{fontSize:12,color:subC,marginTop:4}}>{b.note}</div>}</div><button onClick={function(){editBank(b);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",borderRadius:8,cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",fontWeight:700}}>✏️</button><button onClick={function(){if(!window.confirm(L("Eliminare questa coordinata bancaria?")))return;if(widget2SelectedBankId===b.id)setWidget2SelectedBankId("");setBankCoords(function(p){return p.filter(function(x){return x.id!==b.id;});});setToast("Coordinata bancaria eliminata");}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",borderRadius:8,cursor:"pointer",color:"#E24B4A",fontSize:14,padding:"5px 8px",fontWeight:700}}>🗑️</button></div></div>;})}</div>
    </div>;
  }

  function TermsAndConditionsContent(){
    function L(s){return translateUiRuntimeText(s);}
    var rows=[
      {title:"Ambito dell’app",text:"fAInance è uno strumento personale per registrare, organizzare e analizzare entrate, uscite, budget, patrimonio, obiettivi, alert, appunti e dati collegati alla gestione finanziaria personale."},
      {title:"Agente AI",text:"Il Consulente AI aiuta a interpretare i dati inseriti nell’app e a proporre spunti pratici di risparmio, controllo spese e organizzazione. Le risposte hanno finalità informative e organizzative."},
      {title:"Nessuna consulenza professionale",text:"Le analisi e i consigli dell’app non costituiscono consulenza finanziaria, fiscale, legale, patrimoniale o professionale. Le decisioni restano sempre responsabilità dell’utente."},
      {title:"Dati inseriti dall’utente",text:"L’utente è responsabile della correttezza dei dati inseriti. Se i dati sono incompleti, errati o non aggiornati, anche statistiche, alert, budget e risposte AI possono risultare imprecisi."},
      {title:"Backup e conservazione dati",text:"L’utente deve eseguire backup periodici prima di aggiornamenti, reinstallazioni, cambi dispositivo o modifiche importanti. L’app offre strumenti di esportazione e ripristino, ma non garantisce il recupero automatico di dati cancellati manualmente."},
      {title:"Uso personale",text:"fAInance è pensata per uso personale e dimostrativo. Non deve essere usata come unico strumento per decisioni economiche rilevanti, dichiarazioni fiscali, investimenti o obblighi contabili professionali."},
      {title:"Aggiornamenti",text:"Le funzionalità, i testi, i limiti dell’Agente AI e questi termini possono essere aggiornati nelle versioni successive dell’app."}
    ];
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:24}}>📄</span><div style={{fontSize:18,fontWeight:800,color:textC}}>{L("Termini di utilizzo")}</div></div>
        <div style={{fontSize:13,color:subC,lineHeight:1.55}}>{L("Usando fAInance accetti che l’app sia uno strumento di supporto alla gestione personale dei tuoi dati finanziari e non un servizio di consulenza professionale.")}</div>
      </div>
      {rows.map(function(r){return <div key={r.title} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:textC,marginBottom:6}}>{L(r.title)}</div>
        <div style={{fontSize:13,color:subC,lineHeight:1.55}}>{L(r.text)}</div>
      </div>;})}
      <div style={{background:dark?"#24213a":"#F0EDFF",borderRadius:14,border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),padding:16}}>
        <div style={{fontSize:13,color:dark?"#BEB8FF":"#534AB7",lineHeight:1.55,fontWeight:600}}>{L("Versione termini: 1.0 · Ultimo aggiornamento: 25/05/2026")}</div>
      </div>
    </div>;
  }

  function PrivacyPolicyContent(){
    function L(s){return translateUiRuntimeText(s);}
    var rows=[
      {title:"Dati trattati",text:"fAInance può salvare i dati che inserisci nell’app, come entrate, uscite, categorie, metodi di pagamento, ricorrenze, budget, patrimonio, obiettivi, alert, appunti, documenti caricati e coordinate bancarie salvate volontariamente."},
      {title:"Account e accesso",text:"Se accedi con email/password, Google o Apple, vengono usati i dati necessari all’autenticazione, come identificativo utente, email e nome profilo. L’accesso è gestito tramite Firebase Authentication."},
      {title:"Salvataggio e sincronizzazione",text:"I dati dell’app possono essere salvati localmente sul dispositivo e, per gli utenti autenticati, sincronizzati su Firestore/Firebase per consentire backup e recupero dei dati collegati all’account."},
      {title:"Uso dell’Agente AI",text:"Quando usi il Consulente AI, la domanda e i dati finanziari necessari all’analisi possono essere inviati al servizio AI collegato all’app per generare la risposta. È consigliabile non inserire dati non necessari o informazioni troppo sensibili nelle domande libere."},
      {title:"Finalità",text:"I dati vengono usati per fornire le funzionalità dell’app: registrazione movimenti, statistiche, budget, alert, patrimonio, backup, sincronizzazione e analisi tramite AI."},
      {title:"Responsabilità dell’utente",text:"L’utente decide quali dati inserire, caricare o cancellare. Prima di salvare documenti, note o coordinate bancarie, valuta se siano davvero necessari per l’uso personale dell’app."},
      {title:"Cancellazione dati",text:"L’app include funzioni per eliminare dati per sezione o cancellare informazioni salvate. Alcuni dati potrebbero restare in backup o cache tecniche fino ai normali tempi di aggiornamento dei servizi utilizzati."},
      {title:"Servizi terzi",text:"L’app può usare servizi esterni come Firebase, Firestore, autenticazione Google/Apple, API di cambio valuta e servizi AI. Ogni servizio può applicare proprie regole tecniche e privacy."},
      {title:"Aggiornamenti",text:"Questa informativa può essere aggiornata quando cambiano funzionalità, servizi tecnici, modalità di sincronizzazione o uso dell’Agente AI."}
    ];
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:24}}>🔐</span><div style={{fontSize:18,fontWeight:800,color:textC}}>{L("Informativa Privacy")}</div></div>
        <div style={{fontSize:13,color:subC,lineHeight:1.55}}>{L("Questa informativa spiega in modo sintetico quali dati possono essere gestiti da fAInance e per quali finalità vengono usati.")}</div>
      </div>
      {rows.map(function(r){return <div key={r.title} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:textC,marginBottom:6}}>{L(r.title)}</div>
        <div style={{fontSize:13,color:subC,lineHeight:1.55}}>{L(r.text)}</div>
      </div>;})}
      <div style={{background:dark?"#24213a":"#F0EDFF",borderRadius:14,border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),padding:16}}>
        <div style={{fontSize:13,color:dark?"#BEB8FF":"#534AB7",lineHeight:1.55,fontWeight:600}}>{L("Versione privacy: 1.0 · Ultimo aggiornamento: 25/05/2026")}</div>
      </div>
    </div>;
  }

  function TermsAcceptanceModal(){
    var [legalView,setLegalView]=useState("main");
    var [termsChecked,setTermsChecked]=useState(!!termsAccepted);
    var [privacyChecked,setPrivacyChecked]=useState(!!privacyAccepted);
    function acceptAll(){
      if(!termsChecked||!privacyChecked)return;
      setTermsAccepted(true);
      setPrivacyAccepted(true);
      setLegalAcceptanceDate(new Date().toISOString());
      setToast("Autorizzazioni salvate");
    }
    function LegalDetail({type}){
      var isTerms=type==="terms";
      return <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <button onClick={function(){setLegalView("main");}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#f5f5f5",color:textC,borderRadius:10,padding:"8px 12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>‹ Indietro</button>
          <div style={{fontSize:16,fontWeight:900,color:textC}}>{isTerms?"Termini di utilizzo":"Informativa Privacy"}</div>
        </div>
        <div style={{maxHeight:"58vh",overflowY:"auto",paddingRight:4}}>{isTerms?<TermsAndConditionsContent/>:<PrivacyPolicyContent/>}</div>
        <button onClick={function(){if(isTerms){setTermsChecked(true);}else{setPrivacyChecked(true);}setLegalView("main");}} style={{width:"100%",background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"13px 16px",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px rgba(127,119,221,0.35)",marginTop:14}}>{translateUiRuntimeText("Ho letto")}</button>
      </div>;
    }
    if(legalView==="terms")return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.58)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div style={{width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",background:cardBg,borderRadius:22,border:"1px solid "+borderC,boxShadow:"0 14px 60px rgba(0,0,0,0.32)",padding:20}}><LegalDetail type="terms"/></div></div>;
    if(legalView==="privacy")return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.58)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}><div style={{width:"100%",maxWidth:560,maxHeight:"90vh",overflowY:"auto",background:cardBg,borderRadius:22,border:"1px solid "+borderC,boxShadow:"0 14px 60px rgba(0,0,0,0.32)",padding:20}}><LegalDetail type="privacy"/></div></div>;
    return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.58)",zIndex:900,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:520,maxHeight:"88vh",overflowY:"auto",background:cardBg,borderRadius:22,border:"1px solid "+borderC,boxShadow:"0 14px 60px rgba(0,0,0,0.32)",padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}><FAInanceLogo size={44}/><div><div style={{fontSize:18,fontWeight:900,color:textC}}>Autorizzazioni</div><div style={{fontSize:12,color:subC}}>Prima di continuare devi leggere e accettare i documenti obbligatori.</div></div></div>
        <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
          <div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:14,border:"1px solid "+borderC,padding:14}}>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
              <input type="checkbox" checked={termsChecked} onChange={function(e){setTermsChecked(e.target.checked);}} style={{width:18,height:18,marginTop:1,accentColor:"#7F77DD",flexShrink:0}}/>
              <span style={{fontSize:13,color:textC,lineHeight:1.45}}>{translateUiRuntimeText("Dichiaro di aver letto e accettato i Termini di utilizzo")} <span style={{color:"#E24B4A"}}>*</span></span>
            </label>
            <button onClick={function(){setLegalView("terms");}} style={{background:"transparent",border:"none",color:dark?"#BEB8FF":"#378ADD",padding:"8px 0 0 28px",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{translateUiRuntimeText("Leggi i Termini di utilizzo")}</button>
          </div>
          <div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:14,border:"1px solid "+borderC,padding:14}}>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
              <input type="checkbox" checked={privacyChecked} onChange={function(e){setPrivacyChecked(e.target.checked);}} style={{width:18,height:18,marginTop:1,accentColor:"#7F77DD",flexShrink:0}}/>
              <span style={{fontSize:13,color:textC,lineHeight:1.45}}>{translateUiRuntimeText("Dichiaro di aver letto e accettato l’Informativa Privacy")} <span style={{color:"#E24B4A"}}>*</span></span>
            </label>
            <button onClick={function(){setLegalView("privacy");}} style={{background:"transparent",border:"none",color:dark?"#BEB8FF":"#378ADD",padding:"8px 0 0 28px",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{translateUiRuntimeText("Leggi l’Informativa Privacy")}</button>
          </div>
        </div>
        <button onClick={acceptAll} disabled={!termsChecked||!privacyChecked} style={{width:"100%",background:(!termsChecked||!privacyChecked)?(dark?"#333":"#ddd"):"linear-gradient(135deg,#7F77DD,#378ADD)",color:(!termsChecked||!privacyChecked)?(dark?"#777":"#999"):"#fff",border:"none",borderRadius:btnRadius,padding:"13px 16px",fontSize:15,fontWeight:800,cursor:(!termsChecked||!privacyChecked)?"not-allowed":"pointer",boxShadow:(!termsChecked||!privacyChecked)?"none":"0 4px 16px rgba(127,119,221,0.35)"}}>{translateUiRuntimeText("Continua")}</button>
      </div>
    </div>;
  }

  var settingsSections=[
    {id:"profile",icon:"👤",label:translateUiRuntimeText("Profilo"),desc:translateUiRuntimeText("Dati personali, account, accesso")},
    {id:"general",icon:"🌐",label:translateUiRuntimeText("Generale"),desc:translateUiRuntimeText("Lingua, formato data, metriche, valute e IA")},
    {id:"appearance",icon:"🎨",label:translateUiRuntimeText("Aspetto"),desc:translateUiRuntimeText("Tema, colori, stile pulsanti e widget")},
    {id:"sections",icon:"🧩",label:translateUiRuntimeText("Sezioni"),desc:translateUiRuntimeText("Entrate, uscite, patrimonio e storico")},
    {id:"notifications",icon:"🔔",label:translateUiRuntimeText("Notifiche e Promemoria"),desc:translateUiRuntimeText("Promemoria inserimento, notifiche custom")},
    {id:"delete",icon:"💾",label:translateUiRuntimeText("Dati"),desc:translateUiRuntimeText("Importa, esporta, backup, elimina")},
    {id:"support",icon:"🆘",label:translateUiRuntimeText("Supporto"),desc:translateUiRuntimeText("FAQ, tutorial, sito web, contatti")},
    {id:"info",icon:"ℹ️",label:translateUiRuntimeText("Info app"),desc:translateUiRuntimeText("Versione, piano, aggiornamenti e termini")},
  ];

  var bottomNavDefaultOrder=["home","spese","history","voice","more"];
  var mobileMenuDefaultOrder=["stats","consulenteAI","patrimonio","budget","share","debtCredits","shopping","goals","alerts","appunti","settings"];
  var mobileAllNavDefaultOrder=DEFAULT_MOBILE_ALL_NAV_ORDER;
  function voiceLabel(){return (TRANSLATIONS[lang]&&TRANSLATIONS[lang].voice)||({it:"Voce",en:"Voice",es:"Voz",fr:"Voix",de:"Stimme",pt:"Voz",pl:"Głos",nl:"Stem",ro:"Voce",el:"Φωνή"}[lang]||"Voice");}
  function sectionLabel(id){
    var dict={
      it:{home:"Home",spese:"Movimenti",history:"Storico",stats:"Statistiche",appunti:"Appunti",voice:"Voce",share:"Share",debtCredits:"Debiti / Crediti",shopping:"Spesa",consulenteAI:"Consulente AI",patrimonio:"Patrimonio",budget:"Budget",goals:"Obiettivi",alerts:"Alert",settings:"Impostazioni",more:"Altro"},
      en:{home:"Home",spese:"Movements",history:"History",stats:"Statistics",appunti:"Notes",voice:"Voice",share:"Share",debtCredits:"Debts / Credits",shopping:"Shopping",consulenteAI:"AI Advisor",patrimonio:"Assets",budget:"Budget",goals:"Goals",alerts:"Alerts",settings:"Settings",more:"More"},
      es:{home:"Inicio",spese:"Movimientos",history:"Historial",stats:"Estadísticas",appunti:"Notas",voice:"Voz",share:"Share",debtCredits:"Deudas / Créditos",shopping:"Compra",consulenteAI:"Asesor IA",patrimonio:"Patrimonio",budget:"Presupuesto",goals:"Objetivos",alerts:"Alertas",settings:"Ajustes",more:"Más"},
      fr:{home:"Accueil",spese:"Mouvements",history:"Historique",stats:"Statistiques",appunti:"Notes",voice:"Voix",share:"Share",debtCredits:"Dettes / Créances",shopping:"Courses",consulenteAI:"Conseiller IA",patrimonio:"Patrimoine",budget:"Budget",goals:"Objectifs",alerts:"Alertes",settings:"Paramètres",more:"Plus"},
      de:{home:"Startseite",spese:"Buchungen",history:"Verlauf",stats:"Statistiken",appunti:"Notizen",voice:"Stimme",share:"Share",debtCredits:"Schulden / Forderungen",shopping:"Einkauf",consulenteAI:"KI-Berater",patrimonio:"Vermögen",budget:"Budget",goals:"Ziele",alerts:"Warnungen",settings:"Einstellungen",more:"Andere"},
      pt:{home:"Início",spese:"Movimentos",history:"Histórico",stats:"Estatísticas",appunti:"Apontamentos",voice:"Voz",share:"Share",debtCredits:"Dívidas / Créditos",shopping:"Compras",consulenteAI:"Consultor IA",patrimonio:"Património",budget:"Orçamento",goals:"Objetivos",alerts:"Alertas",settings:"Definições",more:"Mais"},
      pl:{home:"Start",spese:"Ruchy",history:"Historia",stats:"Statystyki",appunti:"Notatki",voice:"Głos",share:"Share",debtCredits:"Długi / Należności",shopping:"Zakupy",consulenteAI:"Doradca AI",patrimonio:"Majątek",budget:"Budżet",goals:"Cele",alerts:"Alerty",settings:"Ustawienia",more:"Więcej"},
      nl:{home:"Home",spese:"Mutaties",history:"Geschiedenis",stats:"Statistieken",appunti:"Notities",voice:"Stem",share:"Share",debtCredits:"Schulden / Tegoeden",shopping:"Boodschappen",consulenteAI:"AI-adviseur",patrimonio:"Vermogen",budget:"Budget",goals:"Doelen",alerts:"Waarschuwingen",settings:"Instellingen",more:"Meer"},
      ro:{home:"Acasă",spese:"Mișcări",history:"Istoric",stats:"Statistici",appunti:"Notițe",voice:"Voce",share:"Share",debtCredits:"Datorii / Creanțe",shopping:"Cumpărături",consulenteAI:"Consilier AI",patrimonio:"Patrimoniu",budget:"Buget",goals:"Obiective",alerts:"Alerte",settings:"Setări",more:"Mai mult"},
      el:{home:"Αρχική",spese:"Κινήσεις",history:"Ιστορικό",stats:"Στατιστικά",appunti:"Σημειώσεις",voice:"Φωνή",share:"Share",debtCredits:"Χρέη / Πιστώσεις",shopping:"Αγορές",consulenteAI:"Σύμβουλος AI",patrimonio:"Περιουσία",budget:"Προϋπολογισμός",goals:"Στόχοι",alerts:"Ειδοποιήσεις",settings:"Ρυθμίσεις",more:"Περισσότερα"}
    };
    return (dict[lang]&&dict[lang][id])||(dict.it[id]||id);
  }
  function allNavDefs(){return{
    home:{id:"home",icon:"🏠",label:sectionLabel("home")},spese:{id:"spese",icon:"💸",label:sectionLabel("spese"),badge:pendingCount},history:{id:"history",icon:"📋",label:sectionLabel("history")},stats:{id:"stats",icon:"📊",label:sectionLabel("stats")},appunti:{id:"appunti",icon:"🗂",label:sectionLabel("appunti")},voice:{id:"voice",icon:"🎙️",label:sectionLabel("voice")},share:{id:"share",icon:"🤝",label:"Share"},debtCredits:{id:"debtCredits",icon:"💳",label:sectionLabel("debtCredits")},shopping:{id:"shopping",icon:"🛒",label:sectionLabel("shopping")},consulenteAI:{id:"consulenteAI",icon:<AIGrilloIcon size={28}/>,label:sectionLabel("consulenteAI")},patrimonio:{id:"patrimonio",icon:"💎",label:sectionLabel("patrimonio")},budget:{id:"budget",icon:"💰",label:sectionLabel("budget")},goals:{id:"goals",icon:"🎯",label:sectionLabel("goals")},alerts:{id:"alerts",icon:"🔔",label:sectionLabel("alerts"),badge:alertTriggered},settings:{id:"settings",icon:"⚙",label:sectionLabel("settings")},more:{id:"more",icon:"☰",label:sectionLabel("more"),badge:alertTriggered}
  };}
  function bottomNavDefs(){return allNavDefs();}
  function menuNavDefs(){return allNavDefs();}
  function normalizeOrder(order,defaults){var seen={};var out=[];(Array.isArray(order)?order:[]).concat(defaults).forEach(function(id){if(defaults.indexOf(id)>=0&&!seen[id]){seen[id]=true;out.push(id);}});return out;}
  function moveOrder(order,setOrder,defaults,id,dir){var arr=normalizeOrder(order,defaults);var i=arr.indexOf(id);var j=i+dir;if(i<0||j<0||j>=arr.length)return;var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setOrder(arr);setToast("Impostazioni aggiornate");}
  function getBottomNavIds(){var order=normalizeOrder(mobileAllNavOrder,mobileAllNavDefaultOrder);var count=Math.max(3,Math.min(6,parseInt(String(mobileNavIconCount||5),10)||5));return order.filter(function(id){return id!=="more";}).slice(0,Math.max(0,count-1));}
  function buildBottomNavItems(){var defs=allNavDefs();var selected=getBottomNavIds();selected.push("more");return selected.map(function(id){return defs[id];}).filter(Boolean);}
  function buildMobileMenuItems(){var defs=allNavDefs();var inBottom={};getBottomNavIds().forEach(function(id){inBottom[id]=true;});return normalizeOrder(mobileAllNavOrder,mobileAllNavDefaultOrder).filter(function(id){return !inBottom[id];}).map(function(id){return defs[id];}).filter(Boolean);}

  function SettingsPanel(){
    var V=t;
    function translateWidgetSettingsText(value){
      var raw=String(value==null?"":value);
      var code=String(lang||"it").split("-")[0].toLowerCase();
      if(!raw)return raw;
      var widgetExactAlias={
        "Icon Color":{it:"Colore icona",en:"Icon color",es:"Color del icono",fr:"Couleur de l’icône",de:"Symbolfarbe",pt:"Cor do ícone",pl:"Kolor ikony",nl:"Pictogramkleur",ro:"Culoarea pictogramei",el:"Χρώμα εικονιδίου"},
        "Icon color":{it:"Colore icona",en:"Icon color",es:"Color del icono",fr:"Couleur de l’icône",de:"Symbolfarbe",pt:"Cor do ícone",pl:"Kolor ikony",nl:"Pictogramkleur",ro:"Culoarea pictogramei",el:"Χρώμα εικονιδίου"},
        "Title Color":{it:"Colore titolo",en:"Title color",es:"Color del título",fr:"Couleur du titre",de:"Titelfarbe",pt:"Cor do título",pl:"Kolor tytułu",nl:"Titelkleur",ro:"Culoarea titlului",el:"Χρώμα τίτλου"},
        "Title color":{it:"Colore titolo",en:"Title color",es:"Color del título",fr:"Couleur du titre",de:"Titelfarbe",pt:"Cor do título",pl:"Kolor tytułu",nl:"Titelkleur",ro:"Culoarea titlului",el:"Χρώμα τίτλου"},
        "Text Color":{it:"Colore testo",en:"Text color",es:"Color del texto",fr:"Couleur du texte",de:"Textfarbe",pt:"Cor do texto",pl:"Kolor tekstu",nl:"Tekstkleur",ro:"Culoarea textului",el:"Χρώμα κειμένου"},
        "Text color":{it:"Colore testo",en:"Text color",es:"Color del texto",fr:"Couleur du texte",de:"Textfarbe",pt:"Cor do texto",pl:"Kolor tekstu",nl:"Tekstkleur",ro:"Culoarea textului",el:"Χρώμα κειμένου"},
        "Background Transparency":{it:"Trasparenza sfondo widget",en:"Widget background transparency",es:"Transparencia del fondo del widget",fr:"Transparence du fond du widget",de:"Widget-Hintergrundtransparenz",pt:"Transparência do fundo do widget",pl:"Przezroczystość tła widżetu",nl:"Transparantie widgetachtergrond",ro:"Transparență fundal widget",el:"Διαφάνεια φόντου widget"},
        "Background transparency":{it:"Trasparenza sfondo widget",en:"Widget background transparency",es:"Transparencia del fondo del widget",fr:"Transparence du fond du widget",de:"Widget-Hintergrundtransparenz",pt:"Transparência do fundo do widget",pl:"Przezroczystość tła widżetu",nl:"Transparantie widgetachtergrond",ro:"Transparență fundal widget",el:"Διαφάνεια φόντου widget"},
        "Save and Update widget":{it:"Salva e aggiorna widget",en:"Save and update widget",es:"Guardar y actualizar widget",fr:"Enregistrer et mettre à jour le widget",de:"Widget speichern und aktualisieren",pt:"Guardar e atualizar widget",pl:"Zapisz i zaktualizuj widżet",nl:"Widget opslaan en bijwerken",ro:"Salvează și actualizează widgetul",el:"Αποθήκευση και ενημέρωση widget"},
        "Save and update widget":{it:"Salva e aggiorna widget",en:"Save and update widget",es:"Guardar y actualizar widget",fr:"Enregistrer et mettre à jour le widget",de:"Widget speichern und aktualisieren",pt:"Guardar e atualizar widget",pl:"Zapisz i zaktualizuj widżet",nl:"Widget opslaan en bijwerken",ro:"Salvează și actualizează widgetul",el:"Αποθήκευση και ενημέρωση widget"},
        "SAVE AND UPDATE WIDGET":{it:"SALVA E AGGIORNA WIDGET",en:"SAVE AND UPDATE WIDGET",es:"GUARDAR Y ACTUALIZAR WIDGET",fr:"ENREGISTRER ET METTRE À JOUR LE WIDGET",de:"WIDGET SPEICHERN UND AKTUALISIEREN",pt:"GUARDAR E ATUALIZAR WIDGET",pl:"ZAPISZ I ZAKTUALIZUJ WIDŻET",nl:"WIDGET OPSLAAN EN BIJWERKEN",ro:"SALVEAZĂ ȘI ACTUALIZEAZĂ WIDGETUL",el:"ΑΠΟΘΗΚΕΥΣΗ ΚΑΙ ΕΝΗΜΕΡΩΣΗ WIDGET"},
        "Show percentage":{it:"Mostra percentuale",en:"Show percentage",es:"Mostrar porcentaje",fr:"Afficher le pourcentage",de:"Prozentsatz anzeigen",pt:"Mostrar percentagem",pl:"Pokaż procent",nl:"Percentage tonen",ro:"Afișează procentul",el:"Εμφάνιση ποσοστού"},
        "Show amounts":{it:"Mostra importi",en:"Show amounts",es:"Mostrar importes",fr:"Afficher les montants",de:"Beträge anzeigen",pt:"Mostrar valores",pl:"Pokaż kwoty",nl:"Bedragen tonen",ro:"Afișează sumele",el:"Εμφάνιση ποσών"},
        "Bar color":{it:"Colore barra",en:"Bar color",es:"Color de la barra",fr:"Couleur de la barre",de:"Balkenfarbe",pt:"Cor da barra",pl:"Kolor paska",nl:"Balkkleur",ro:"Culoarea barei",el:"Χρώμα γραμμής"},
        "Percentage color":{it:"Colore percentuale",en:"Percentage color",es:"Color del porcentaje",fr:"Couleur du pourcentage",de:"Prozentfarbe",pt:"Cor da percentagem",pl:"Kolor procentu",nl:"Percentagekleur",ro:"Culoarea procentului",el:"Χρώμα ποσοστού"}
      };
      var aliasRow=widgetExactAlias[raw]||widgetExactAlias[raw.trim()];
      if(aliasRow&&aliasRow[code])return aliasRow[code];
      var D={
        "Saldo":{it:"Saldo",en:"Balance",es:"Saldo",fr:"Solde",de:"Kontostand",pt:"Saldo",pl:"Saldo",nl:"Balans",ro:"Sold",el:"Υπόλοιπο"},
        "Balance":{it:"Saldo",en:"Balance",es:"Saldo",fr:"Solde",de:"Kontostand",pt:"Saldo",pl:"Saldo",nl:"Balans",ro:"Sold",el:"Υπόλοιπο"},
        "+ Spesa":{it:"+ Spesa",en:"+ Expense",es:"+ Gasto",fr:"+ Dépense",de:"+ Ausgabe",pt:"+ Despesa",pl:"+ Wydatek",nl:"+ Uitgave",ro:"+ Cheltuială",el:"+ Έξοδο"},
        "+ Expense":{it:"+ Spesa",en:"+ Expense",es:"+ Gasto",fr:"+ Dépense",de:"+ Ausgabe",pt:"+ Despesa",pl:"+ Wydatek",nl:"+ Uitgave",ro:"+ Cheltuială",el:"+ Έξοδο"},
        "Spesa":{it:"Spesa",en:"Expense",es:"Gasto",fr:"Dépense",de:"Ausgabe",pt:"Despesa",pl:"Wydatek",nl:"Uitgave",ro:"Cheltuială",el:"Έξοδο"},
        "Expense":{it:"Spesa",en:"Expense",es:"Gasto",fr:"Dépense",de:"Ausgabe",pt:"Despesa",pl:"Wydatek",nl:"Uitgave",ro:"Cheltuială",el:"Έξοδο"},
        "Salva e aggiorna widget":{it:"Salva e aggiorna widget",en:"Save and update widget",es:"Guardar y actualizar widget",fr:"Enregistrer et mettre à jour le widget",de:"Widget speichern und aktualisieren",pt:"Guardar e atualizar widget",pl:"Zapisz i zaktualizuj widżet",nl:"Widget opslaan en bijwerken",ro:"Salvează și actualizează widgetul",el:"Αποθήκευση και ενημέρωση widget"},
        "Save and update widget":{it:"Salva e aggiorna widget",en:"Save and update widget",es:"Guardar y actualizar widget",fr:"Enregistrer et mettre à jour le widget",de:"Widget speichern und aktualisieren",pt:"Guardar e atualizar widget",pl:"Zapisz i zaktualizuj widżet",nl:"Widget opslaan en bijwerken",ro:"Salvează și actualizează widgetul",el:"Αποθήκευση και ενημέρωση widget"},
        "Mostra percentuale":{it:"Mostra percentuale",en:"Show percentage",es:"Mostrar porcentaje",fr:"Afficher le pourcentage",de:"Prozentsatz anzeigen",pt:"Mostrar percentagem",pl:"Pokaż procent",nl:"Percentage tonen",ro:"Afișează procentul",el:"Εμφάνιση ποσοστού"},
        "Show percentage":{it:"Mostra percentuale",en:"Show percentage",es:"Mostrar porcentaje",fr:"Afficher le pourcentage",de:"Prozentsatz anzeigen",pt:"Mostrar percentagem",pl:"Pokaż procent",nl:"Percentage tonen",ro:"Afișează procentul",el:"Εμφάνιση ποσοστού"},
        "Mostra importi":{it:"Mostra importi",en:"Show amounts",es:"Mostrar importes",fr:"Afficher les montants",de:"Beträge anzeigen",pt:"Mostrar valores",pl:"Pokaż kwoty",nl:"Bedragen tonen",ro:"Afișează sumele",el:"Εμφάνιση ποσών"},
        "Show amounts":{it:"Mostra importi",en:"Show amounts",es:"Mostrar importes",fr:"Afficher les montants",de:"Beträge anzeigen",pt:"Mostrar valores",pl:"Pokaż kwoty",nl:"Bedragen tonen",ro:"Afișează sumele",el:"Εμφάνιση ποσών"},
        "Colore barra/icona":{it:"Colore barra/icona",en:"Bar/icon color",es:"Color de barra/icono",fr:"Couleur de la barre/icône",de:"Balken-/Symbolfarbe",pt:"Cor da barra/ícone",pl:"Kolor paska/ikony",nl:"Kleur van balk/pictogram",ro:"Culoarea barei/pictogramei",el:"Χρώμα μπάρας/εικονιδίου"},
        "Bar/icon color":{it:"Colore barra/icona",en:"Bar/icon color",es:"Color de barra/icono",fr:"Couleur de la barre/icône",de:"Balken-/Symbolfarbe",pt:"Cor da barra/ícone",pl:"Kolor paska/ikony",nl:"Kleur van balk/pictogram",ro:"Culoarea barei/pictogramei",el:"Χρώμα μπάρας/εικονιδίου"},
        "Colore testo":{it:"Colore testo",en:"Text color",es:"Color del texto",fr:"Couleur du texte",de:"Textfarbe",pt:"Cor do texto",pl:"Kolor tekstu",nl:"Tekstkleur",ro:"Culoarea textului",el:"Χρώμα κειμένου"},
        "Text color":{it:"Colore testo",en:"Text color",es:"Color del texto",fr:"Couleur du texte",de:"Textfarbe",pt:"Cor do texto",pl:"Kolor tekstu",nl:"Tekstkleur",ro:"Culoarea textului",el:"Χρώμα κειμένου"},
        "Colore percentuale":{it:"Colore percentuale",en:"Percentage color",es:"Color del porcentaje",fr:"Couleur du pourcentage",de:"Prozentfarbe",pt:"Cor da percentagem",pl:"Kolor procentu",nl:"Kleur van percentage",ro:"Culoarea procentului",el:"Χρώμα ποσοστού"},
        "Percentage color":{it:"Colore percentuale",en:"Percentage color",es:"Color del porcentaje",fr:"Couleur du pourcentage",de:"Prozentfarbe",pt:"Cor da percentagem",pl:"Kolor procentu",nl:"Kleur van percentage",ro:"Culoarea procentului",el:"Χρώμα ποσοστού"},
        "Colore icona":{it:"Colore icona",en:"Icon color",es:"Color del icono",fr:"Couleur de l’icône",de:"Symbolfarbe",pt:"Cor do ícone",pl:"Kolor ikony",nl:"Pictogramkleur",ro:"Culoarea pictogramei",el:"Χρώμα εικονιδίου"},
        "Icon color":{it:"Colore icona",en:"Icon color",es:"Color del icono",fr:"Couleur de l’icône",de:"Symbolfarbe",pt:"Cor do ícone",pl:"Kolor ikony",nl:"Pictogramkleur",ro:"Culoarea pictogramei",el:"Χρώμα εικονιδίου"},
        "Colore titolo":{it:"Colore titolo",en:"Title color",es:"Color del título",fr:"Couleur du titre",de:"Titelfarbe",pt:"Cor do título",pl:"Kolor tytułu",nl:"Titelkleur",ro:"Culoarea titlului",el:"Χρώμα τίτλου"},
        "Title color":{it:"Colore titolo",en:"Title color",es:"Color del título",fr:"Couleur du titre",de:"Titelfarbe",pt:"Cor do título",pl:"Kolor tytułu",nl:"Titelkleur",ro:"Culoarea titlului",el:"Χρώμα τίτλου"},
        "Colore + Spesa":{it:"Colore + Spesa",en:"Expense button color",es:"Color del botón de gasto",fr:"Couleur du bouton de dépense",de:"Farbe der Ausgaben-Schaltfläche",pt:"Cor do botão de despesa",pl:"Kolor przycisku wydatku",nl:"Kleur van de uitgavenknop",ro:"Culoarea butonului de cheltuială",el:"Χρώμα κουμπιού εξόδου"},
        "Color + Expense":{it:"Colore + Spesa",en:"Expense button color",es:"Color del botón de gasto",fr:"Couleur du bouton de dépense",de:"Farbe der Ausgaben-Schaltfläche",pt:"Cor do botão de despesa",pl:"Kolor przycisku wydatku",nl:"Kleur van de uitgavenknop",ro:"Culoarea butonului de cheltuială",el:"Χρώμα κουμπιού εξόδου"},
        "Color + Uitgave":{it:"Colore + Spesa",en:"Expense button color",es:"Color del botón de gasto",fr:"Couleur du bouton de dépense",de:"Farbe der Ausgaben-Schaltfläche",pt:"Cor do botão de despesa",pl:"Kolor przycisku wydatku",nl:"Kleur van de uitgavenknop",ro:"Culoarea butonului de cheltuială",el:"Χρώμα κουμπιού εξόδου"},
        "Colore Attività":{it:"Colore Attività",en:"Activity color",es:"Color de actividad",fr:"Couleur de l’activité",de:"Aktivitätsfarbe",pt:"Cor da atividade",pl:"Kolor aktywności",nl:"Activiteitskleur",ro:"Culoarea activității",el:"Χρώμα δραστηριότητας"},
        "Activity color":{it:"Colore Attività",en:"Activity color",es:"Color de actividad",fr:"Couleur de l’activité",de:"Aktivitätsfarbe",pt:"Cor da atividade",pl:"Kolor aktywności",nl:"Activiteitskleur",ro:"Culoarea activității",el:"Χρώμα δραστηριότητας"},
        "Sfondo":{it:"Sfondo",en:"Background",es:"Fondo",fr:"Arrière-plan",de:"Hintergrund",pt:"Fundo",pl:"Tło",nl:"Achtergrond",ro:"Fundal",el:"Φόντο"},
        "Background":{it:"Sfondo",en:"Background",es:"Fondo",fr:"Arrière-plan",de:"Hintergrund",pt:"Fundo",pl:"Tło",nl:"Achtergrond",ro:"Fundal",el:"Φόντο"},
        "Attività":{it:"Attività",en:"Activity",es:"Actividad",fr:"Activité",de:"Aktivität",pt:"Atividade",pl:"Aktywność",nl:"Activiteit",ro:"Activitate",el:"Δραστηριότητα"},
        "Activity":{it:"Attività",en:"Activity",es:"Actividad",fr:"Activité",de:"Aktivität",pt:"Atividade",pl:"Aktywność",nl:"Activiteit",ro:"Activitate",el:"Δραστηριότητα"},
        "Ti devono":{it:"Ti devono",en:"They owe you",es:"Te deben",fr:"On te doit",de:"Dir wird geschuldet",pt:"Devem-te",pl:"Oni są Ci winni",nl:"Zij zijn jou verschuldigd",ro:"Îți datorează",el:"Σου οφείλουν"},
        "Devi":{it:"Devi",en:"You owe",es:"Debes",fr:"Tu dois",de:"Du schuldest",pt:"Deves",pl:"Jesteś winien",nl:"Jij bent verschuldigd",ro:"Datorezi",el:"Οφείλεις"},
        "Primo progetto disponibile":{it:"Primo progetto disponibile",en:"First available project",es:"Primer proyecto disponible",fr:"Premier projet disponible",de:"Erstes verfügbares Projekt",pt:"Primeiro projeto disponível",pl:"Pierwszy dostępny projekt",nl:"Eerste beschikbare project",ro:"Primul proiect disponibil",el:"Πρώτο διαθέσιμο έργο"},
        "First available project":{it:"Primo progetto disponibile",en:"First available project",es:"Primer proyecto disponible",fr:"Premier projet disponible",de:"Erstes verfügbares Projekt",pt:"Primeiro projeto disponível",pl:"Pierwszy dostępny projekt",nl:"Eerste beschikbare project",ro:"Primul proiect disponibil",el:"Πρώτο διαθέσιμο έργο"},
        "Progetto mostrato nel widget":{it:"Progetto mostrato nel widget",en:"Project shown in the widget",es:"Proyecto mostrado en el widget",fr:"Projet affiché dans le widget",de:"Im Widget angezeigtes Projekt",pt:"Projeto mostrado no widget",pl:"Projekt pokazany w widżecie",nl:"Project dat in de widget wordt getoond",ro:"Proiect afișat în widget",el:"Έργο που εμφανίζεται στο widget"},
        "Project shown in the widget":{it:"Progetto mostrato nel widget",en:"Project shown in the widget",es:"Proyecto mostrado en el widget",fr:"Projet affiché dans le widget",de:"Im Widget angezeigtes Projekt",pt:"Projeto mostrado no widget",pl:"Projekt pokazany w widżecie",nl:"Project dat in de widget wordt getoond",ro:"Proiect afișat în widget",el:"Έργο που εμφανίζεται στο widget"},
        "Questo widget serve per inserire rapidamente una nuova uscita o una nuova entrata direttamente dalla Home del telefono, senza aprire manualmente l’app.":{it:"Questo widget serve per inserire rapidamente una nuova uscita o una nuova entrata direttamente dalla Home del telefono, senza aprire manualmente l’app.",en:"This widget lets you quickly add a new expense or income directly from the phone Home screen, without opening the app manually.",es:"Este widget te permite añadir rápidamente un nuevo gasto o ingreso directamente desde la pantalla de inicio del teléfono, sin abrir manualmente la app.",fr:"Ce widget te permet d’ajouter rapidement une nouvelle dépense ou un nouveau revenu directement depuis l’écran d’accueil du téléphone, sans ouvrir l’app manuellement.",de:"Mit diesem Widget kannst du schnell eine neue Ausgabe oder Einnahme direkt vom Startbildschirm des Telefons hinzufügen, ohne die App manuell zu öffnen.",pt:"Este widget permite adicionar rapidamente uma nova despesa ou receita diretamente a partir do ecrã inicial do telefone, sem abrir manualmente a app.",pl:"Ten widżet pozwala szybko dodać nowy wydatek lub przychód bezpośrednio z ekranu głównego telefonu, bez ręcznego otwierania aplikacji.",nl:"Met deze widget kun je snel een nieuwe uitgave of inkomst rechtstreeks vanaf het startscherm van je telefoon toevoegen, zonder de app handmatig te openen.",ro:"Acest widget îți permite să adaugi rapid o cheltuială sau un venit nou direct de pe ecranul principal al telefonului, fără să deschizi manual aplicația.",el:"Αυτό το widget σου επιτρέπει να προσθέτεις γρήγορα ένα νέο έξοδο ή έσοδο απευθείας από την αρχική οθόνη του τηλεφώνου, χωρίς να ανοίγεις χειροκίνητα την εφαρμογή."},
        "Questo widget mostra sulla Home una nota salvata oppure una coordinata bancaria. Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori e aggiornamento.":{it:"Questo widget mostra sulla Home una nota salvata oppure una coordinata bancaria. Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori e aggiornamento.",en:"This widget shows a saved note or bank detail on the Home screen. The exact content is selected when you add the widget to the Home screen; here you only change appearance, colors and update settings.",es:"Este widget muestra en la pantalla de inicio una nota guardada o un dato bancario. El contenido exacto se elige al añadir el widget a la pantalla de inicio; aquí solo modificas el aspecto, los colores y la actualización.",fr:"Ce widget affiche sur l’écran d’accueil une note enregistrée ou une coordonnée bancaire. Le contenu exact se choisit lorsque tu ajoutes le widget à l’écran d’accueil ; ici tu modifies seulement l’apparence, les couleurs et la mise à jour.",de:"Dieses Widget zeigt auf dem Startbildschirm eine gespeicherte Notiz oder Bankverbindung. Der genaue Inhalt wird gewählt, wenn du das Widget zum Startbildschirm hinzufügst; hier änderst du nur Aussehen, Farben und Aktualisierung.",pt:"Este widget mostra no ecrã inicial uma nota guardada ou um dado bancário. O conteúdo exato é escolhido quando adicionas o widget ao ecrã inicial; aqui alteras apenas o aspeto, as cores e a atualização.",pl:"Ten widżet pokazuje na ekranie głównym zapisaną notatkę albo dane bankowe. Dokładną zawartość wybiera się podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory i aktualizację.",nl:"Deze widget toont op het startscherm een opgeslagen notitie of bankgegeven. De exacte inhoud kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren en bijwerken.",ro:"Acest widget afișează pe ecranul principal o notiță salvată sau un detaliu bancar. Conținutul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile și actualizarea.",el:"Αυτό το widget εμφανίζει στην αρχική οθόνη μια αποθηκευμένη σημείωση ή ένα τραπεζικό στοιχείο. Το ακριβές περιεχόμενο επιλέγεται όταν προσθέτεις το widget στην αρχική οθόνη· εδώ αλλάζεις μόνο εμφάνιση, χρώματα και ενημέρωση."},
        "Questo widget mostra sulla Home l’avanzamento di un obiettivo di risparmio: nome, percentuale, barra e importi. L’obiettivo preciso si sceglie quando aggiungi il widget alla Home; qui modifichi aspetto e colori.":{it:"Questo widget mostra sulla Home l’avanzamento di un obiettivo di risparmio: nome, percentuale, barra e importi. L’obiettivo preciso si sceglie quando aggiungi il widget alla Home; qui modifichi aspetto e colori.",en:"This widget shows the progress of a savings goal on the Home screen: name, percentage, bar and amounts. The exact goal is selected when you add the widget to the Home screen; here you change appearance and colors.",es:"Este widget muestra en la pantalla de inicio el avance de un objetivo de ahorro: nombre, porcentaje, barra e importes. El objetivo exacto se elige al añadir el widget a la pantalla de inicio; aquí modificas el aspecto y los colores.",fr:"Ce widget affiche sur l’écran d’accueil la progression d’un objectif d’épargne : nom, pourcentage, barre et montants. L’objectif exact se choisit lorsque tu ajoutes le widget à l’écran d’accueil ; ici tu modifies l’apparence et les couleurs.",de:"Dieses Widget zeigt auf dem Startbildschirm den Fortschritt eines Sparziels: Name, Prozentwert, Balken und Beträge. Das genaue Ziel wird gewählt, wenn du das Widget zum Startbildschirm hinzufügst; hier änderst du Aussehen und Farben.",pt:"Este widget mostra no ecrã inicial o progresso de um objetivo de poupança: nome, percentagem, barra e valores. O objetivo exato é escolhido quando adicionas o widget ao ecrã inicial; aqui alteras o aspeto e as cores.",pl:"Ten widżet pokazuje na ekranie głównym postęp celu oszczędnościowego: nazwę, procent, pasek i kwoty. Dokładny cel wybiera się podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz wygląd i kolory.",nl:"Deze widget toont op het startscherm de voortgang van een spaardoel: naam, percentage, balk en bedragen. Het exacte doel kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je uiterlijk en kleuren.",ro:"Acest widget afișează pe ecranul principal progresul unui obiectiv de economisire: nume, procent, bară și sume. Obiectivul exact se alege când adaugi widgetul pe ecranul principal; aici modifici aspectul și culorile.",el:"Αυτό το widget εμφανίζει στην αρχική οθόνη την πρόοδο ενός στόχου αποταμίευσης: όνομα, ποσοστό, μπάρα και ποσά. Ο ακριβής στόχος επιλέγεται όταν προσθέτεις το widget στην αρχική οθόνη· εδώ αλλάζεις εμφάνιση και χρώματα."},
        "Questo widget mostra sulla Home il riepilogo di un progetto Share: saldo personale, quanto devi, quanto ti devono e ultima attività. Il progetto può essere scelto qui come default e anche dal tasto di configurazione quando aggiungi il widget.":{it:"Questo widget mostra sulla Home il riepilogo di un progetto Share: saldo personale, quanto devi, quanto ti devono e ultima attività. Il progetto può essere scelto qui come default e anche dal tasto di configurazione quando aggiungi il widget.",en:"This widget shows a Share project summary on the Home screen: personal balance, what you owe, what others owe you and the latest activity. The project can be selected here as default and also from the configuration button when you add the widget.",es:"Este widget muestra en la pantalla de inicio el resumen de un proyecto Share: saldo personal, cuánto debes, cuánto te deben y la última actividad. El proyecto puede elegirse aquí como predeterminado y también desde el botón de configuración al añadir el widget.",fr:"Ce widget affiche sur l’écran d’accueil le résumé d’un projet Share : solde personnel, ce que tu dois, ce qu’on te doit et la dernière activité. Le projet peut être choisi ici par défaut et aussi depuis le bouton de configuration lorsque tu ajoutes le widget.",de:"Dieses Widget zeigt auf dem Startbildschirm die Zusammenfassung eines Share-Projekts: persönlicher Kontostand, was du schuldest, was dir geschuldet wird und die letzte Aktivität. Das Projekt kann hier als Standard und auch über die Konfigurationstaste beim Hinzufügen des Widgets gewählt werden.",pt:"Este widget mostra no ecrã inicial o resumo de um projeto Share: saldo pessoal, quanto deves, quanto te devem e a última atividade. O projeto pode ser escolhido aqui como padrão e também no botão de configuração ao adicionares o widget.",pl:"Ten widżet pokazuje na ekranie głównym podsumowanie projektu Share: saldo osobiste, ile jesteś winien, ile inni są winni tobie i ostatnią aktywność. Projekt można wybrać tutaj jako domyślny, a także przyciskiem konfiguracji podczas dodawania widżetu.",nl:"Deze widget toont op het startscherm de samenvatting van een Share-project: persoonlijk saldo, wat jij verschuldigd bent, wat anderen jou verschuldigd zijn en de laatste activiteit. Het project kan hier als standaard worden gekozen en ook via de configuratieknop wanneer je de widget toevoegt.",ro:"Acest widget afișează pe ecranul principal rezumatul unui proiect Share: sold personal, cât datorezi, cât ți se datorează și ultima activitate. Proiectul poate fi ales aici ca implicit și și din butonul de configurare când adaugi widgetul.",el:"Αυτό το widget εμφανίζει στην αρχική οθόνη τη σύνοψη ενός έργου Share: προσωπικό υπόλοιπο, πόσα οφείλεις, πόσα σου οφείλουν και την τελευταία δραστηριότητα. Το έργο μπορεί να επιλεγεί εδώ ως προεπιλογή και επίσης από το κουμπί ρύθμισης όταν προσθέτεις το widget."}
      };
      var EXTRA_WIDGET_TRANSLATIONS_1633={"Scegli la lista, aggiungi prodotti e spunta quelli già messi nel carrello.":{"it":"Scegli la lista, aggiungi prodotti e spunta quelli già messi nel carrello.","en":"Choose a list, add products and tick the items already in your cart.","es":"Elige la lista, añade productos y marca los que ya están en el carrito.","fr":"Choisissez la liste, ajoutez des produits et cochez ceux déjà dans le panier.","de":"Wähle die Liste, füge Produkte hinzu und markiere die Artikel im Einkaufswagen.","pt":"Escolhe a lista, adiciona produtos e marca os que já estão no carrinho.","pl":"Wybierz listę, dodaj produkty i zaznacz te, które są już w koszyku.","nl":"Kies de lijst, voeg producten toe en vink de artikelen aan die al in je winkelwagen liggen.","ro":"Alege lista, adaugă produse și bifează articolele deja puse în coș.","el":"Επιλέξτε λίστα, προσθέστε προϊόντα και σημειώστε όσα είναι ήδη στο καλάθι."},"Tocca il prodotto per aggiungerlo alla lista.":{"it":"Tocca il prodotto per aggiungerlo alla lista.","en":"Tap the product to add it to the list.","es":"Toca el producto para añadirlo a la lista.","fr":"Touchez le produit pour l’ajouter à la liste.","de":"Tippe auf das Produkt, um es zur Liste hinzuzufügen.","pt":"Toca no produto para o adicionar à lista.","pl":"Dotknij produktu, aby dodać go do listy.","nl":"Tik op het product om het aan de lijst toe te voegen.","ro":"Atinge produsul pentru a-l adăuga în listă.","el":"Πατήστε το προϊόν για να το προσθέσετε στη λίστα."},"Visibilità, collegamento a patrimonio e movimenti":{"it":"Visibilità, collegamento a patrimonio e movimenti","en":"Visibility, connection to assets and transactions","es":"Visibilidad, conexión con patrimonio y movimientos","fr":"Visibilité, lien avec patrimoine et mouvements","de":"Sichtbarkeit, Verknüpfung mit Vermögen und Bewegungen","pt":"Visibilidade, ligação a património e movimentos","pl":"Widoczność, połączenie z majątkiem i ruchami","nl":"Zichtbaarheid, koppeling met vermogen en bewegingen","ro":"Vizibilitate, legătură cu patrimoniu și mișcări","el":"Ορατότητα, σύνδεση με περιουσία και κινήσεις"},"Aree lista spesa, fidelity card e prepagate":{"it":"Aree lista spesa, fidelity card e prepagate","en":"Shopping list areas, loyalty cards and prepaid cards","es":"Áreas de la lista de la compra, tarjetas fidelidad y prepago","fr":"Rayons de la liste de courses, cartes fidélité et prépayées","de":"Einkaufslistenbereiche, Kundenkarten und Prepaid-Karten","pt":"Áreas da lista de compras, cartões fidelidade e pré-pagos","pl":"Obszary listy zakupów, karty lojalnościowe i przedpłacone","nl":"Boodschappenlijstgebieden, klantenkaarten en prepaidkaarten","ro":"Zone listă cumpărături, carduri fidelitate și preplătite","el":"Περιοχές λίστας αγορών, κάρτες πελάτη και προπληρωμένες"},"Carte fidelity e prepagate":{"it":"Carte fidelity e prepagate","en":"Loyalty and prepaid cards","es":"Tarjetas fidelidad y prepago","fr":"Cartes fidélité et prépayées","de":"Kunden- und Prepaid-Karten","pt":"Cartões fidelidade e pré-pagos","pl":"Karty lojalnościowe i przedpłacone","nl":"Klanten- en prepaidkaarten","ro":"Carduri fidelitate și preplătite","el":"Κάρτες πελάτη και προπληρωμένες"},"Riporta nel patrimonio":{"it":"Riporta nel patrimonio","en":"Include in assets","es":"Incluir en patrimonio","fr":"Inclure dans le patrimoine","de":"In Vermögen aufnehmen","pt":"Incluir no património","pl":"Uwzględnij w majątku","nl":"Opnemen in vermogen","ro":"Include în patrimoniu","el":"Συμπερίληψη στην περιουσία"},"Consente di creare una voce Patrimonio collegata al Saldo del debito o credito.":{"it":"Consente di creare una voce Patrimonio collegata al Saldo del debito o credito.","en":"Allows creating an asset item linked to the debt or credit balance.","es":"Permite crear una partida de patrimonio vinculada al saldo de la deuda o crédito.","fr":"Permet de créer un élément de patrimoine lié au solde de la dette ou du crédit.","de":"Ermöglicht einen Vermögenseintrag, der mit dem Saldo der Schuld oder des Guthabens verknüpft ist.","pt":"Permite criar um item de património ligado ao saldo da dívida ou crédito.","pl":"Pozwala utworzyć pozycję majątku połączoną z saldem długu lub należności.","nl":"Maakt een vermogensitem aan dat gekoppeld is aan het saldo van de schuld of het tegoed.","ro":"Permite crearea unui element de patrimoniu legat de soldul datoriei sau creditului.","el":"Επιτρέπει τη δημιουργία στοιχείου περιουσίας συνδεδεμένου με το υπόλοιπο χρέους ή πίστωσης."},"Consente di creare una voce patrimonio collegata al saldo del debito o credito.":{"it":"Consente di creare una voce patrimonio collegata al saldo del debito o credito.","en":"Allows creating an asset item linked to the debt or credit balance.","es":"Permite crear una partida de patrimonio vinculada al saldo de la deuda o crédito.","fr":"Permet de créer un élément de patrimoine lié au solde de la dette ou du crédit.","de":"Ermöglicht einen Vermögenseintrag, der mit dem Saldo der Schuld oder des Guthabens verknüpft ist.","pt":"Permite criar um item de património ligado ao saldo da dívida ou crédito.","pl":"Pozwala utworzyć pozycję majątku połączoną z saldem długu lub należności.","nl":"Maakt een vermogensitem aan dat gekoppeld is aan het saldo van de schuld of het tegoed.","ro":"Permite crearea unui element de patrimoniu legat de soldul datoriei sau creditului.","el":"Επιτρέπει τη δημιουργία στοιχείου περιουσίας συνδεδεμένου με το υπόλοιπο χρέους ή πίστωσης."},"Riporta nei movimenti":{"it":"Riporta nei movimenti","en":"Include in transactions","es":"Incluir en movimientos","fr":"Inclure dans les mouvements","de":"In Bewegungen aufnehmen","pt":"Incluir nos movimentos","pl":"Uwzględnij w ruchach","nl":"Opnemen in bewegingen","ro":"Include în mișcări","el":"Συμπερίληψη στις κινήσεις"},"Consente di creare entrate o uscite partendo dal Saldo del debito o credito.":{"it":"Consente di creare entrate o uscite partendo dal Saldo del debito o credito.","en":"Allows creating income or expenses from the debt or credit balance.","es":"Permite crear ingresos o gastos a partir del saldo de la deuda o crédito.","fr":"Permet de créer des entrées ou sorties à partir du solde de la dette ou du crédit.","de":"Ermöglicht Einnahmen oder Ausgaben aus dem Saldo der Schuld oder des Guthabens.","pt":"Permite criar entradas ou saídas a partir do saldo da dívida ou crédito.","pl":"Pozwala tworzyć przychody lub wydatki z salda długu lub należności.","nl":"Maakt inkomsten of uitgaven aan op basis van het saldo van de schuld of het tegoed.","ro":"Permite crearea de venituri sau cheltuieli pornind de la soldul datoriei sau creditului.","el":"Επιτρέπει τη δημιουργία εσόδων ή εξόδων από το υπόλοιπο χρέους ή πίστωσης."},"Consente di creare entrate o uscite partendo dal saldo del debito o credito.":{"it":"Consente di creare entrate o uscite partendo dal saldo del debito o credito.","en":"Allows creating income or expenses from the debt or credit balance.","es":"Permite crear ingresos o gastos a partir del saldo de la deuda o crédito.","fr":"Permet de créer des entrées ou sorties à partir du solde de la dette ou du crédit.","de":"Ermöglicht Einnahmen oder Ausgaben aus dem Saldo der Schuld oder des Guthabens.","pt":"Permite criar entradas ou saídas a partir do saldo da dívida ou crédito.","pl":"Pozwala tworzyć przychody lub wydatki z salda długu lub należności.","nl":"Maakt inkomsten of uitgaven aan op basis van het saldo van de schuld of het tegoed.","ro":"Permite crearea de venituri sau cheltuieli pornind de la soldul datoriei sau creditului.","el":"Επιτρέπει τη δημιουργία εσόδων ή εξόδων από το υπόλοιπο χρέους ή πίστωσης."},"Gestisci le aree dei prodotti e scegli icona e area predefinita.":{"it":"Gestisci le aree dei prodotti e scegli icona e area predefinita.","en":"Manage product areas and choose the icon and default area.","es":"Gestiona las áreas de productos y elige icono y área predeterminada.","fr":"Gérez les rayons des produits et choisissez l’icône et le rayon par défaut.","de":"Verwalte Produktbereiche und wähle Symbol und Standardbereich.","pt":"Gere as áreas dos produtos e escolhe ícone e área predefinida.","pl":"Zarządzaj obszarami produktów oraz wybierz ikonę i obszar domyślny.","nl":"Beheer productgebieden en kies het pictogram en standaardgebied.","ro":"Gestionează zonele produselor și alege pictograma și zona implicită.","el":"Διαχειριστείτε τις περιοχές προϊόντων και επιλέξτε εικονίδιο και προεπιλεγμένη περιοχή."},"Colore usato nella lista quando un prodotto è già nel carrello.":{"it":"Colore usato nella lista quando un prodotto è già nel carrello.","en":"Color used in the list when a product is already in the cart.","es":"Color usado en la lista cuando un producto ya está en el carrito.","fr":"Couleur utilisée dans la liste lorsqu’un produit est déjà dans le panier.","de":"Farbe in der Liste, wenn ein Produkt bereits im Wagen ist.","pt":"Cor usada na lista quando um produto já está no carrinho.","pl":"Kolor używany na liście, gdy produkt jest już w koszyku.","nl":"Kleur in de lijst wanneer een product al in de winkelwagen staat.","ro":"Culoare folosită în listă când un produs este deja în coș.","el":"Χρώμα στη λίστα όταν ένα προϊόν είναι ήδη στο καλάθι."},"Top summary, number of icons and section order":{"it":"Riepilogo alto, numero icone e ordine delle sezioni","en":"Top summary, number of icons and section order","es":"Resumen superior, número de iconos y orden de secciones","fr":"Résumé supérieur, nombre d’icônes et ordre des sections","de":"Obere Zusammenfassung, Anzahl der Symbole und Abschnittsreihenfolge","pt":"Resumo superior, número de ícones e ordem das secções","pl":"Górne podsumowanie, liczba ikon i kolejność sekcji","nl":"Bovenste samenvatting, aantal pictogrammen en volgorde van secties","ro":"Rezumat superior, număr de pictograme și ordinea secțiunilor","el":"Επάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων"},"Riepilogo alto, numero icone e ordine delle sezioni":{"it":"Riepilogo alto, numero icone e ordine delle sezioni","en":"Top summary, number of icons and section order","es":"Resumen superior, número de iconos y orden de secciones","fr":"Résumé supérieur, nombre d’icônes et ordre des sections","de":"Obere Zusammenfassung, Anzahl der Symbole und Abschnittsreihenfolge","pt":"Resumo superior, número de ícones e ordem das secções","pl":"Górne podsumowanie, liczba ikon i kolejność sekcji","nl":"Bovenste samenvatting, aantal pictogrammen en volgorde van secties","ro":"Rezumat superior, număr de pictograme și ordinea secțiunilor","el":"Επάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων"},"Configurazione widget Android":{"it":"Configurazione widget Android","en":"Android widget configuration","es":"Configuración de widgets Android","fr":"Configuration des widgets Android","de":"Android-Widget-Konfiguration","pt":"Configuração dos widgets Android","pl":"Konfiguracja widżetów Android","nl":"Android-widgetconfiguratie","ro":"Configurare widgeturi Android","el":"Ρύθμιση widget Android"},"Widget ingresso rapido":{"it":"Widget ingresso rapido","en":"Quick entry widget","es":"Widget de entrada rápida","fr":"Widget de saisie rapide","de":"Schnelleingabe-Widget","pt":"Widget de entrada rápida","pl":"Widżet szybkiego wpisu","nl":"Widget snelle invoer","ro":"Widget introducere rapidă","el":"Widget γρήγορης εισαγωγής"},"Incluso nel piano gratuito. Logo fAInance, pulsanti Entrata/Uscita e layout 1x4 in una sola riga":{"it":"Incluso nel piano gratuito. Logo fAInance, pulsanti Entrata/Uscita e layout 1x4 in una sola riga","en":"Included in the free plan. fAInance logo, income/expense buttons and 1x4 layout in one row","es":"Incluido en el plan gratuito. Logo fAInance, botones Entrada/Salida y diseño 1x4 en una sola fila","fr":"Inclus dans le plan gratuit. Logo fAInance, boutons Entrée/Sortie et disposition 1x4 sur une seule ligne","de":"Im Gratis-Plan enthalten. fAInance-Logo, Einnahmen/Ausgaben-Schaltflächen und 1x4-Layout in einer Zeile","pt":"Incluído no plano gratuito. Logo fAInance, botões Entrada/Saída e layout 1x4 numa só linha","pl":"Dostępne w planie darmowym. Logo fAInance, przyciski Przychód/Wydatek i układ 1x4 w jednym wierszu","nl":"Inbegrepen in het gratis plan. fAInance-logo, knoppen Inkomsten/Uitgaven en 1x4-indeling op één rij","ro":"Inclus în planul gratuit. Logo fAInance, butoane Venit/Cheltuială și aspect 1x4 pe un singur rând","el":"Περιλαμβάνεται στο δωρεάν πλάνο. Λογότυπο fAInance, κουμπιά Έσοδα/Έξοδα και διάταξη 1x4 σε μία γραμμή"},"Lista spesa":{"it":"Lista spesa","en":"Shopping list","es":"Lista de la compra","fr":"Liste de courses","de":"Einkaufsliste","pt":"Lista de compras","pl":"Lista zakupów","nl":"Boodschappenlijst","ro":"Listă de cumpărături","el":"Λίστα αγορών"},"Visualizza la lista della spesa e permette di segnare gli articoli acquistati.":{"it":"Visualizza la lista della spesa e permette di segnare gli articoli acquistati.","en":"Shows the shopping list and lets you mark purchased items.","es":"Muestra la lista de la compra y permite marcar los artículos comprados.","fr":"Affiche la liste de courses et permet de marquer les articles achetés.","de":"Zeigt die Einkaufsliste und lässt gekaufte Artikel markieren.","pt":"Mostra a lista de compras e permite marcar os artigos comprados.","pl":"Pokazuje listę zakupów i pozwala oznaczać kupione produkty.","nl":"Toont de boodschappenlijst en laat gekochte artikelen markeren.","ro":"Afișează lista de cumpărături și permite marcarea articolelor cumpărate.","el":"Εμφανίζει τη λίστα αγορών και επιτρέπει τη σήμανση των αγορασμένων ειδών."},"Mostra la lista della spesa e permette di segnare gli articoli acquistati.":{"it":"Mostra la lista della spesa e permette di segnare gli articoli acquistati.","en":"Shows the shopping list and lets you mark purchased items.","es":"Muestra la lista de la compra y permite marcar los artículos comprados.","fr":"Affiche la liste de courses et permet de marquer les articles achetés.","de":"Zeigt die Einkaufsliste und lässt gekaufte Artikel markieren.","pt":"Mostra a lista de compras e permite marcar os artigos comprados.","pl":"Pokazuje listę zakupów i pozwala oznaczać kupione produkty.","nl":"Toont de boodschappenlijst en laat gekochte artikelen markeren.","ro":"Afișează lista de cumpărături și permite marcarea articolelor cumpărate.","el":"Εμφανίζει τη λίστα αγορών και επιτρέπει τη σήμανση των αγορασμένων ειδών."},"Fidelity card":{"it":"Fidelity card","en":"Loyalty card","es":"Tarjeta fidelidad","fr":"Carte fidélité","de":"Kundenkarte","pt":"Cartão fidelidade","pl":"Karta lojalnościowa","nl":"Klantenkaart","ro":"Card fidelitate","el":"Κάρτα πελάτη"},"Visualizza rapidamente una fidelity card o una prepagata.":{"it":"Visualizza rapidamente una fidelity card o una prepagata.","en":"Quickly shows a loyalty or prepaid card.","es":"Muestra rápidamente una tarjeta fidelidad o prepago.","fr":"Affiche rapidement une carte fidélité ou prépayée.","de":"Zeigt schnell eine Kunden- oder Prepaid-Karte.","pt":"Mostra rapidamente um cartão fidelidade ou pré-pago.","pl":"Szybko pokazuje kartę lojalnościową lub przedpłaconą.","nl":"Toont snel een klantenkaart of prepaidkaart.","ro":"Afișează rapid un card fidelitate sau preplătit.","el":"Εμφανίζει γρήγορα μια κάρτα πελάτη ή προπληρωμένη."},"Debiti / Crediti":{"it":"Debiti / Crediti","en":"Debts / Credits","es":"Deudas / Créditos","fr":"Dettes / Crédits","de":"Schulden / Guthaben","pt":"Dívidas / Créditos","pl":"Długi / Należności","nl":"Schulden / Tegoeden","ro":"Datorii / Credite","el":"Χρέη / Πιστώσεις"},"Mostra il saldo aperto di debiti e crediti.":{"it":"Mostra il saldo aperto di debiti e crediti.","en":"Shows the open balance of debts and credits.","es":"Muestra el saldo abierto de deudas y créditos.","fr":"Affiche le solde ouvert des dettes et crédits.","de":"Zeigt den offenen Saldo von Schulden und Guthaben.","pt":"Mostra o saldo em aberto de dívidas e créditos.","pl":"Pokazuje otwarte saldo długów i należności.","nl":"Toont het open saldo van schulden en tegoeden.","ro":"Afișează soldul deschis al datoriilor și creditelor.","el":"Εμφανίζει το ανοικτό υπόλοιπο χρεών και πιστώσεων."},"Icon color":{"it":"Colore icona","en":"Icon color","es":"Color del icono","fr":"Couleur de l’icône","de":"Symbolfarbe","pt":"Cor do ícone","pl":"Kolor ikony","nl":"Pictogramkleur","ro":"Culoare pictogramă","el":"Χρώμα εικονιδίου"},"Title color":{"it":"Colore titolo","en":"Title color","es":"Color del título","fr":"Couleur du titre","de":"Titelfarbe","pt":"Cor do título","pl":"Kolor tytułu","nl":"Titelkleur","ro":"Culoare titlu","el":"Χρώμα τίτλου"},"Text color":{"it":"Colore testo","en":"Text color","es":"Color del texto","fr":"Couleur du texte","de":"Textfarbe","pt":"Cor do texto","pl":"Kolor tekstu","nl":"Tekstkleur","ro":"Culoare text","el":"Χρώμα κειμένου"},"Project shown in the widget":{"it":"Progetto mostrato nel widget","en":"Project shown in the widget","es":"Proyecto mostrado en el widget","fr":"Projet affiché dans le widget","de":"Im Widget angezeigtes Projekt","pt":"Projeto mostrado no widget","pl":"Projekt pokazany w widżecie","nl":"Project getoond in de widget","ro":"Proiect afișat în widget","el":"Έργο που εμφανίζεται στο widget"},"Save and update widget":{"it":"Salva e aggiorna widget","en":"Save and update widget","es":"Guardar y actualizar widget","fr":"Enregistrer et mettre à jour le widget","de":"Widget speichern und aktualisieren","pt":"Guardar e atualizar widget","pl":"Zapisz i zaktualizuj widżet","nl":"Widget opslaan en bijwerken","ro":"Salvează și actualizează widgetul","el":"Αποθήκευση και ενημέρωση widget"},"Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":{"it":"Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.","en":"You choose the exact content when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.","es":"El contenido exacto se elige al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.","fr":"Le contenu exact se choisit lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.","de":"Den genauen Inhalt wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.","pt":"O conteúdo exato é escolhido ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.","pl":"Dokładną treść wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.","nl":"De exacte inhoud kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.","ro":"Conținutul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.","el":"Το ακριβές περιεχόμενο επιλέγεται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση."},"La carta precisa si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":{"it":"La carta precisa si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.","en":"You choose the exact card when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.","es":"La tarjeta exacta se elige al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.","fr":"La carte exacte se choisit lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.","de":"Die genaue Karte wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.","pt":"O cartão exato é escolhido ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.","pl":"Dokładną kartę wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.","nl":"De exacte kaart kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.","ro":"Cardul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.","el":"Η ακριβής κάρτα επιλέγεται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση."},"I debiti e crediti precisi si scelgono quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":{"it":"I debiti e crediti precisi si scelgono quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.","en":"You choose the exact debts and credits when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.","es":"Las deudas y créditos exactos se eligen al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.","fr":"Les dettes et crédits exacts se choisissent lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.","de":"Die genauen Schulden und Guthaben wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.","pt":"As dívidas e créditos exatos são escolhidos ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.","pl":"Dokładne długi i należności wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.","nl":"De exacte schulden en tegoeden kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.","ro":"Datoriile și creditele exacte se aleg când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.","el":"Τα ακριβή χρέη και πιστώσεις επιλέγονται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση."},"Grandezza testo":{"it":"Grandezza testo","en":"Text size","es":"Tamaño del texto","fr":"Taille du texte","de":"Textgröße","pt":"Tamanho do texto","pl":"Rozmiar tekstu","nl":"Tekstgrootte","ro":"Dimensiune text","el":"Μέγεθος κειμένου"},"Dimensione del contenuto mostrato nel widget.":{"it":"Dimensione del contenuto mostrato nel widget.","en":"Size of the content shown in the widget.","es":"Tamaño del contenido mostrado en el widget.","fr":"Taille du contenu affiché dans le widget.","de":"Größe des im Widget angezeigten Inhalts.","pt":"Tamanho do conteúdo mostrado no widget.","pl":"Rozmiar treści pokazywanej w widżecie.","nl":"Grootte van de inhoud die in de widget wordt getoond.","ro":"Dimensiunea conținutului afișat în widget.","el":"Μέγεθος του περιεχομένου που εμφανίζεται στο widget."},"Trasparenza sfondo widget":{"it":"Trasparenza sfondo widget","en":"Widget background transparency","es":"Transparencia del fondo del widget","fr":"Transparence du fond du widget","de":"Widget-Hintergrundtransparenz","pt":"Transparência do fundo do widget","pl":"Przezroczystość tła widżetu","nl":"Transparantie van widgetachtergrond","ro":"Transparență fundal widget","el":"Διαφάνεια φόντου widget"},"100% = completamente trasparente. 0% = sfondo pieno.":{"it":"100% = completamente trasparente. 0% = sfondo pieno.","en":"100% = fully transparent. 0% = solid background.","es":"100% = totalmente transparente. 0% = fondo sólido.","fr":"100 % = totalement transparent. 0 % = fond plein.","de":"100 % = vollständig transparent. 0 % = voller Hintergrund.","pt":"100% = totalmente transparente. 0% = fundo sólido.","pl":"100% = całkowicie przezroczyste. 0% = pełne tło.","nl":"100% = volledig transparant. 0% = volle achtergrond.","ro":"100% = complet transparent. 0% = fundal plin.","el":"100% = πλήρως διαφανές. 0% = πλήρες φόντο."},"Aggiornamento automatico":{"it":"Aggiornamento automatico","en":"Automatic update","es":"Actualización automática","fr":"Mise à jour automatique","de":"Automatische Aktualisierung","pt":"Atualização automática","pl":"Automatyczna aktualizacja","nl":"Automatische update","ro":"Actualizare automată","el":"Αυτόματη ενημέρωση"},"Aggiorna i widget già installati quando cambi contenuti o impostazioni.":{"it":"Aggiorna i widget già installati quando cambi contenuti o impostazioni.","en":"Updates already installed widgets when you change content or settings.","es":"Actualiza los widgets ya instalados cuando cambias contenidos o ajustes.","fr":"Met à jour les widgets déjà installés lorsque vous changez du contenu ou des paramètres.","de":"Aktualisiert bereits installierte Widgets, wenn du Inhalte oder Einstellungen änderst.","pt":"Atualiza os widgets já instalados quando alteras conteúdos ou definições.","pl":"Aktualizuje już zainstalowane widżety po zmianie treści lub ustawień.","nl":"Werkt al geïnstalleerde widgets bij wanneer je inhoud of instellingen wijzigt.","ro":"Actualizează widgeturile deja instalate când schimbi conținutul sau setările.","el":"Ενημερώνει τα ήδη εγκατεστημένα widget όταν αλλάζετε περιεχόμενο ή ρυθμίσεις."},"Colore icona":{"it":"Colore icona","en":"Icon color","es":"Color del icono","fr":"Couleur de l’icône","de":"Symbolfarbe","pt":"Cor do ícone","pl":"Kolor ikony","nl":"Pictogramkleur","ro":"Culoare pictogramă","el":"Χρώμα εικονιδίου"},"Colore titolo":{"it":"Colore titolo","en":"Title color","es":"Color del título","fr":"Couleur du titre","de":"Titelfarbe","pt":"Cor do título","pl":"Kolor tytułu","nl":"Titelkleur","ro":"Culoare titlu","el":"Χρώμα τίτλου"},"Colore testo":{"it":"Colore testo","en":"Text color","es":"Color del texto","fr":"Couleur du texte","de":"Textfarbe","pt":"Cor do texto","pl":"Kolor tekstu","nl":"Tekstkleur","ro":"Culoare text","el":"Χρώμα κειμένου"},"Progetto mostrato nel widget":{"it":"Progetto mostrato nel widget","en":"Project shown in the widget","es":"Proyecto mostrado en el widget","fr":"Projet affiché dans le widget","de":"Im Widget angezeigtes Projekt","pt":"Projeto mostrado no widget","pl":"Projekt pokazany w widżecie","nl":"Project getoond in de widget","ro":"Proiect afișat în widget","el":"Έργο που εμφανίζεται στο widget"},"Salva e aggiorna widget":{"it":"Salva e aggiorna widget","en":"Save and update widget","es":"Guardar y actualizar widget","fr":"Enregistrer et mettre à jour le widget","de":"Widget speichern und aktualisieren","pt":"Guardar e atualizar widget","pl":"Zapisz i zaktualizuj widżet","nl":"Widget opslaan en bijwerken","ro":"Salvează și actualizează widgetul","el":"Αποθήκευση και ενημέρωση widget"}};Object.keys(EXTRA_WIDGET_TRANSLATIONS_1633).forEach(function(x){D[x]=EXTRA_WIDGET_TRANSLATIONS_1633[x];});var WIDGET_ALIAS_TRANSLATIONS_1634={"Icon Color":{"it":"Colore icona","en":"Icon color","es":"Color del icono","fr":"Couleur de l’icône","de":"Symbolfarbe","pt":"Cor do ícone","pl":"Kolor ikony","nl":"Pictogramkleur","ro":"Culoare pictogramă","el":"Χρώμα εικονιδίου"},"Title Color":{"it":"Colore titolo","en":"Title color","es":"Color del título","fr":"Couleur du titre","de":"Titelfarbe","pt":"Cor do título","pl":"Kolor tytułu","nl":"Titelkleur","ro":"Culoare titlu","el":"Χρώμα τίτλου"},"Text Color":{"it":"Colore testo","en":"Text color","es":"Color del texto","fr":"Couleur du texte","de":"Textfarbe","pt":"Cor do texto","pl":"Kolor tekstu","nl":"Tekstkleur","ro":"Culoare text","el":"Χρώμα κειμένου"},"Background Transparency":{"it":"Trasparenza sfondo widget","en":"Widget background transparency","es":"Transparencia del fondo del widget","fr":"Transparence du fond du widget","de":"Widget-Hintergrundtransparenz","pt":"Transparência do fundo do widget","pl":"Przezroczystość tła widżetu","nl":"Transparantie widgetachtergrond","ro":"Transparență fundal widget","el":"Διαφάνεια φόντου widget"},"Save and Update widget":{"it":"Salva e aggiorna widget","en":"Save and update widget","es":"Guardar y actualizar widget","fr":"Enregistrer et mettre à jour le widget","de":"Widget speichern und aktualisieren","pt":"Guardar e atualizar widget","pl":"Zapisz i zaktualizuj widżet","nl":"Widget opslaan en bijwerken","ro":"Salvează și actualizează widgetul","el":"Αποθήκευση και ενημέρωση widget"},"Save and update widget":{"it":"Salva e aggiorna widget","en":"Save and update widget","es":"Guardar y actualizar widget","fr":"Enregistrer et mettre à jour le widget","de":"Widget speichern und aktualisieren","pt":"Guardar e atualizar widget","pl":"Zapisz i zaktualizuj widżet","nl":"Widget opslaan en bijwerken","ro":"Salvează și actualizează widgetul","el":"Αποθήκευση και ενημέρωση widget"},"Show percentage":{"it":"Mostra percentuale","en":"Show percentage","es":"Mostrar porcentaje","fr":"Afficher le pourcentage","de":"Prozent anzeigen","pt":"Mostrar percentagem","pl":"Pokaż procent","nl":"Percentage tonen","ro":"Afișează procentul","el":"Εμφάνιση ποσοστού"},"Show amounts":{"it":"Mostra importi","en":"Show amounts","es":"Mostrar importes","fr":"Afficher les montants","de":"Beträge anzeigen","pt":"Mostrar valores","pl":"Pokaż kwoty","nl":"Bedragen tonen","ro":"Afișează sumele","el":"Εμφάνιση ποσών"},"Bar color":{"it":"Colore barra","en":"Bar color","es":"Color de la barra","fr":"Couleur de la barre","de":"Balkenfarbe","pt":"Cor da barra","pl":"Kolor paska","nl":"Balkkleur","ro":"Culoarea barei","el":"Χρώμα γραμμής"},"Percentage color":{"it":"Colore percentuale","en":"Percentage color","es":"Color del porcentaje","fr":"Couleur du pourcentage","de":"Prozentfarbe","pt":"Cor da percentagem","pl":"Kolor procentu","nl":"Percentagekleur","ro":"Culoarea procentului","el":"Χρώμα ποσοστού"}};Object.keys(WIDGET_ALIAS_TRANSLATIONS_1634).forEach(function(x){D[x]=WIDGET_ALIAS_TRANSLATIONS_1634[x];});
    var EXTRA_FINAL_1637={"Spunta i prodotti già messi nel carrello.":{en:"Tick the products already in your cart.",es:"Marca los productos ya puestos en el carrito.",fr:"Cochez les produits déjà mis dans le panier.",de:"Markiere die Produkte, die bereits im Einkaufswagen sind.",pt:"Marca os produtos já colocados no carrinho.",pl:"Zaznacz produkty już włożone do koszyka.",nl:"Vink de producten aan die al in je winkelwagen liggen.",ro:"Bifează produsele deja puse în coș.",el:"Σημειώστε τα προϊόντα που είναι ήδη στο καλάθι."},"Se vuoi creare un’altra lista, vai nelle impostazioni":{en:"To create another list, go to settings",es:"Si quieres crear otra lista, ve a los ajustes",fr:"Pour créer une autre liste, allez dans les paramètres",de:"Wenn du eine weitere Liste erstellen möchtest, gehe zu den Einstellungen",pt:"Se quiseres criar outra lista, vai às definições",pl:"Aby utworzyć inną listę, przejdź do ustawień",nl:"Ga naar instellingen om een andere lijst te maken",ro:"Pentru a crea o altă listă, mergi la setări",el:"Για να δημιουργήσετε άλλη λίστα, μεταβείτε στις ρυθμίσεις"},"Liste della spesa":{en:"Shopping lists",es:"Listas de la compra",fr:"Listes de courses",de:"Einkaufslisten",pt:"Listas de compras",pl:"Listy zakupów",nl:"Boodschappenlijsten",ro:"Liste de cumpărături",el:"Λίστες αγορών"},"Crea, modifica o elimina le liste disponibili nella sezione Spesa.":{en:"Create, edit or delete the lists available in the Shopping section.",es:"Crea, modifica o elimina las listas disponibles en la sección Compra.",fr:"Créez, modifiez ou supprimez les listes disponibles dans la section Courses.",de:"Erstelle, bearbeite oder lösche die Listen im Bereich Einkaufen.",pt:"Cria, edita ou elimina as listas disponíveis na secção Compras.",pl:"Twórz, edytuj lub usuwaj listy dostępne w sekcji Zakupy.",nl:"Maak, bewerk of verwijder de lijsten in de sectie Boodschappen.",ro:"Creează, modifică sau șterge listele disponibile în secțiunea Cumpărături.",el:"Δημιουργήστε, επεξεργαστείτε ή διαγράψτε τις λίστες στην ενότητα Αγορές."},"Lista della spesa creata":{en:"Shopping list created",es:"Lista de la compra creada",fr:"Liste de courses créée",de:"Einkaufsliste erstellt",pt:"Lista de compras criada",pl:"Lista zakupów utworzona",nl:"Boodschappenlijst aangemaakt",ro:"Lista de cumpărături a fost creată",el:"Η λίστα αγορών δημιουργήθηκε"},"Lista della spesa aggiornata":{en:"Shopping list updated",es:"Lista de la compra actualizada",fr:"Liste de courses mise à jour",de:"Einkaufsliste aktualisiert",pt:"Lista de compras atualizada",pl:"Lista zakupów zaktualizowana",nl:"Boodschappenlijst bijgewerkt",ro:"Lista de cumpărături a fost actualizată",el:"Η λίστα αγορών ενημερώθηκε"},"Confermi la cancellazione?":{en:"Confirm deletion?",es:"¿Confirmas la eliminación?",fr:"Confirmer la suppression ?",de:"Löschung bestätigen?",pt:"Confirmas a eliminação?",pl:"Potwierdzasz usunięcie?",nl:"Verwijderen bevestigen?",ro:"Confirmi ștergerea?",el:"Επιβεβαιώνετε τη διαγραφή;"},"Cancellazione completata":{en:"Deletion completed",es:"Eliminación completada",fr:"Suppression terminée",de:"Löschung abgeschlossen",pt:"Eliminação concluída",pl:"Usuwanie zakończone",nl:"Verwijderen voltooid",ro:"Ștergere finalizată",el:"Η διαγραφή ολοκληρώθηκε"},"Transazione modificata":{en:"Transaction updated",es:"Transacción modificada",fr:"Transaction modifiée",de:"Transaktion geändert",pt:"Transação modificada",pl:"Transakcja zmieniona",nl:"Transactie gewijzigd",ro:"Tranzacție modificată",el:"Η συναλλαγή τροποποιήθηκε"},"La lista principale non può essere eliminata se è l’unica lista.":{en:"The main list cannot be deleted if it is the only list.",es:"La lista principal no se puede eliminar si es la única lista.",fr:"La liste principale ne peut pas être supprimée si c’est la seule liste.",de:"Die Hauptliste kann nicht gelöscht werden, wenn sie die einzige Liste ist.",pt:"A lista principal não pode ser eliminada se for a única lista.",pl:"Głównej listy nie można usunąć, jeśli jest jedyną listą.",nl:"De hoofdlijst kan niet worden verwijderd als dit de enige lijst is.",ro:"Lista principală nu poate fi ștearsă dacă este singura listă.",el:"Η κύρια λίστα δεν μπορεί να διαγραφεί αν είναι η μόνη λίστα."},"Lista selezionata":{en:"Selected list",es:"Lista seleccionada",fr:"Liste sélectionnée",de:"Ausgewählte Liste",pt:"Lista selecionada",pl:"Wybrana lista",nl:"Geselecteerde lijst",ro:"Listă selectată",el:"Επιλεγμένη λίστα"}};Object.keys(EXTRA_FINAL_1637).forEach(function(k){D[k]=Object.assign({it:k},EXTRA_FINAL_1637[k]);});
var row=D[raw]||D[raw.trim()];
      if(row&&row[code])return row[code];
      return translateUiRuntimeText(raw);
    }
    function L(s){return translateWidgetSettingsText(s);}
    var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};
    var baseSettingsAllowed=settingAllowed("base");
    function baseDisabledStyle(){return baseSettingsAllowed?{}:{background:dark?"#342b16":"#FFF8E1",border:"1.5px solid "+(dark?"#6a5520":"#FFD54F"),opacity:1};}
    function baseLockHint(label){return baseSettingsAllowed?null:<div style={{fontSize:12,color:dark?"#ffd58a":"#856404",background:dark?"#342b16":"#FFF8E1",border:"1px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:10,padding:"8px 10px",marginTop:8,lineHeight:1.35}}>🔒 {label||"Disponibile dal piano Base"}. <button onClick={openPlanInfo} style={{background:"none",border:"none",color:dark?"#FFE5A6":"#534AB7",fontWeight:900,cursor:"pointer",padding:0}}>Cambia piano</button></div>;}
    function settingsParent(id){var map={metrics:"general",currency_settings:"general",appearance_app:"appearance",appearance_widget:"appearance",appearance_widget_quick:"appearance_widget",appearance_widget_note:"appearance_widget",appearance_widget_goal:"appearance_widget",appearance_widget_shopping_list:"appearance_widget",appearance_widget_fidelity:"appearance_widget",appearance_widget_debt_credits:"appearance_widget",appearance_widget_share:"appearance_widget",appearance_nav:"appearance",sections_income:"sections",sections_expense:"sections",shopping_settings:"sections",shopping_settings_lists:"shopping_settings",shopping_settings_areas:"shopping_settings",patrimonio_settings:"sections",history_settings:"sections",patrimonio_areas_settings:"patrimonio_settings",patrimonio_entries_settings:"patrimonio_settings",patrimonio_mode_settings:"patrimonio_settings",sections_income_areas:"sections_income",sections_income_categories:"sections_income",sections_expense_areas:"sections_expense",sections_expense_categories:"sections_expense",sections_expense_methods:"sections_expense",terms_conditions:"info",privacy_policy:"info"};return map[id]||null;}
    function PageHeader({title}){return <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><button onClick={function(){setSettingsPage(settingsParent(settingsPage));}} style={{minWidth:104,height:42,borderRadius:14,border:"1px solid "+(dark?"#4a4865":"#d8d2ff"),background:dark?"#24213a":"#F0EDFF",cursor:"pointer",color:dark?"#BEB8FF":"#534AB7",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:dark?"none":"0 3px 14px rgba(83,74,183,0.14)"}}>{L("‹ Indietro")}</button><div style={{fontSize:18,fontWeight:800,color:textC}}>{L(title)}</div></div>;}
    function SettingHint({children}){var txt=(typeof children==="string")?L(children):children;return <div style={{fontSize:12,color:dark?"#BEB8FF":"#534AB7",background:dark?"#24213a":"#F0EDFF",border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),borderRadius:10,padding:"8px 10px",marginBottom:12,lineHeight:1.45}}>{txt}</div>;}
    function LockedFeatureCard({icon,title,message}){return <div style={{background:dark?"#2a2424":"#fff0f0",border:"1px solid "+(dark?"#5a3333":"#f3b6b6"),borderRadius:18,padding:20,display:"flex",gap:14,alignItems:"flex-start"}}><div style={{width:46,height:46,borderRadius:16,background:dark?"#3a2b2b":"#ffe0e0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0,filter:"grayscale(1)"}}>{icon}</div><div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:dark?"#ffd0d0":"#8a2d2d",marginBottom:6}}>{title}</div><div style={{fontSize:13,color:dark?"#f0bbbb":"#8a4a4a",lineHeight:1.45,marginBottom:12}}>{message}</div><Btn onClick={openPlanInfo} bg="#E24B4A">{L("Cambia piano")}</Btn></div></div>;}
    function SettingsCards({items}){return <div style={{display:"flex",flexDirection:"column",gap:10}}>{items.map(function(s){var locked=!!s.disabled;return <button key={s.id} onClick={function(){if(locked){if(s.lockedMessage)setToast({text:s.lockedMessage,type:"warning"});return;}setSettingsPage(s.id);}} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",border:"1.5px solid "+(locked?(dark?"#6a5520":"#FFD54F"):borderC),borderRadius:16,background:locked?(dark?"#2b2518":"#FFF8E1"):cardBg,cursor:locked?"not-allowed":"pointer",textAlign:"left",boxShadow:locked?"none":(dark?"none":"0 2px 12px rgba(0,0,0,0.04)"),opacity:1}}><div style={{width:42,height:42,borderRadius:14,background:locked?(dark?"#3a3018":"#FFF3CD"):(dark?"#24213a":"#F0EDFF"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{locked?"🔒":s.icon}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}><div style={{fontSize:15,fontWeight:900,color:locked?(dark?"#ffd58a":"#856404"):textC}}>{L(s.label)}</div>{locked&&<span style={{fontSize:11,background:dark?"#3a3018":"#FFE8A3",color:dark?"#ffd58a":"#856404",borderRadius:20,padding:"2px 8px",fontWeight:900}}>{L("Disponibile da")} {s.requiredPlanLabel}</span>}</div><div style={{fontSize:12,color:locked?(dark?"#ffe0a3":"#856404"):(dark?"#BEB8FF":"#534AB7"),background:locked?(dark?"#221d12":"#fff3cd"):(dark?"#24213a":"#F0EDFF"),border:"1px solid "+(locked?(dark?"#6a5520":"#FFD54F"):(dark?"#3d376a":"#D8D2FF")),borderRadius:9,padding:"6px 9px",lineHeight:1.35}}>{locked?L("Questa impostazione esiste, ma non è inclusa nel tuo piano attuale. "):""}{L(s.desc)}</div>{locked&&<div style={{fontSize:12,color:dark?"#ffd58a":"#856404",fontWeight:800,marginTop:7}}>{L("Tocca per vedere il motivo oppure usa “Cambia piano” nei popup.")}</div>}</div><span style={{fontSize:18,color:locked?(dark?"#ffd58a":"#856404"):subC}}>{locked?"🔒":"›"}</span></button>;})}</div>;}
    function SettingsMenu(){return <SettingsCards items={settingsSections}/>;}
    function Segmented({items,value,onChange}){return <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3,marginBottom:12}}>{items.map(function(it){var active=value===it.id;var disabled=!!it.disabled;return <button type="button" key={it.id} disabled={disabled} onClick={function(e){if(e&&e.stopPropagation)e.stopPropagation();if(disabled){if(it.lockedMessage)setToast(it.lockedMessage);return;}onChange(it.id);}} style={{flex:1,padding:"9px 10px",border:"none",borderRadius:10,background:active?"linear-gradient(135deg,#7F77DD,#378ADD)":"transparent",color:active?"#fff":(disabled?(dark?"#555":"#aaa"):subC),fontSize:13,cursor:disabled?"not-allowed":"pointer",fontWeight:active?800:400,boxShadow:active?"0 3px 10px rgba(127,119,221,0.25)":"none",opacity:disabled?0.55:1}}>{L(it.label)}{disabled?" 🔒":""}</button>;})}</div>;}
    function CurrencyPicker({value,onChange,exclude,allowNone}){var [q,setQ]=useState("");var normalized=String(q||"").toLowerCase().trim();var list=CURRENCIES.filter(function(c){return (!exclude||c.code!==exclude)&&(!normalized||c.code.toLowerCase().indexOf(normalized)>=0||String(c.name||"").toLowerCase().indexOf(normalized)>=0||String(c.symbol||"").toLowerCase().indexOf(normalized)>=0);}).slice(0,180);return <div style={{display:"flex",flexDirection:"column",gap:8}}><input placeholder={L("Cerca valuta, es. euro, dollaro, yen...")} value={q} onChange={function(e){setQ(e.target.value);}} style={{...sinp,width:"100%"}}/><select value={value||""} onChange={function(e){onChange(e.target.value);}} style={{...sinp,width:"100%"}}>{allowNone&&<option value="">{L("Nessuna")}</option>}{list.map(function(c){return <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>;})}</select><div style={{fontSize:11,color:subC}}>{list.length} {L("valute mostrate")}{normalized?L(" per la ricerca"):""}.</div></div>;}

    function WidgetAppearancePanel(){
      var noteLocked=!isWidgetAllowed("note");
      var goalLocked=!isWidgetAllowed("goal");
      var shoppingListLocked=!isWidgetAllowed("shoppingList");
      var fidelityLocked=!isWidgetAllowed("fidelity");
      var debtCreditsLocked=!isWidgetAllowed("debtCredits");
      var shareLocked=!isWidgetAllowed("share");
      return <SettingsCards items={[
        {id:"appearance_widget_quick",icon:"⚡",label:L("Aggiunta rapida"),desc:L("Incluso nel piano Gratis. Logo fAInance, pulsanti Uscita/Entrata e layout 1x4 in una sola riga")},
        {id:"appearance_widget_fidelity",icon:"💳",label:L("Fidelity card"),desc:fidelityLocked?L("Disponibile dal piano")+" "+widgetPlanName("fidelity")+". "+L("Mostra rapidamente una fidelity card o una prepagata."):L("Mostra rapidamente una fidelity card o una prepagata."),disabled:fidelityLocked,requiredPlanLabel:widgetPlanName("fidelity"),lockedMessage:widgetLockedMessage("fidelity")},
        {id:"appearance_widget_shopping_list",icon:"🧺",label:L("Lista spesa"),desc:shoppingListLocked?L("Disponibile dal piano")+" "+widgetPlanName("shoppingList")+". "+L("Mostra la lista della spesa e permette di segnare gli articoli acquistati."):L("Mostra la lista della spesa e permette di segnare gli articoli acquistati."),disabled:shoppingListLocked,requiredPlanLabel:widgetPlanName("shoppingList"),lockedMessage:widgetLockedMessage("shoppingList")},
        {id:"appearance_widget_note",icon:"📝",label:L("Nota / Dati bancari"),desc:noteLocked?L("Disponibile dal piano")+" "+widgetPlanName("note")+". "+L("Mostra il contenuto di una nota oppure l’IBAN selezionato."):L("Mostra il contenuto di una nota oppure l’IBAN selezionato"),disabled:noteLocked,requiredPlanLabel:widgetPlanName("note"),lockedMessage:widgetLockedMessage("note")},
        {id:"appearance_widget_goal",icon:"🎯",label:L("Obiettivo"),desc:goalLocked?L("Disponibile dal piano")+" "+widgetPlanName("goal")+". "+L("Mostra avanzamento, percentuale e importi di un obiettivo."):L("Mostra avanzamento, percentuale e importi di un obiettivo"),disabled:goalLocked,requiredPlanLabel:widgetPlanName("goal"),lockedMessage:widgetLockedMessage("goal")},
        {id:"appearance_widget_share",icon:"🤝",label:"Share",desc:shareLocked?L("Disponibile dal piano")+" "+widgetPlanName("share")+". "+L("Scegli progetto, colori, trasparenza e grafica del widget Share."):L("Scegli progetto, colori, trasparenza e grafica del widget Share"),disabled:shareLocked,requiredPlanLabel:widgetPlanName("share"),lockedMessage:widgetLockedMessage("share")},
        {id:"appearance_widget_debt_credits",icon:"📉",label:L("Debiti / Crediti"),desc:debtCreditsLocked?L("Disponibile dal piano")+" "+widgetPlanName("debtCredits")+". "+L("Mostra il saldo aperto di debiti e crediti."):L("Mostra il saldo aperto di debiti e crediti."),disabled:debtCreditsLocked,requiredPlanLabel:widgetPlanName("debtCredits"),lockedMessage:widgetLockedMessage("debtCredits")}
      ]}/>;
    }

    function WidgetQuickAddSettingsPanel(){
      var WIDGET_BG_PALETTE=[{name:"Glass scuro",value:"#1E1E30"},{name:"Notte",value:"#111827"},{name:"Slate",value:"#273244"},{name:"Soft",value:"#FAFAFF"},{name:"Bianco",value:"#FFFFFF"},{name:"Lavanda",value:"#F0EDFF"}];
      var WIDGET_EXP_PALETTE=[{name:"Rosso",value:"#E24B4A"},{name:"Corallo",value:"#F05A55"},{name:"Arancio",value:"#D85A30"},{name:"Rosso scuro",value:"#B33030"},{name:"Cremisi",value:"#C0392B"},{name:"Viola",value:"#8E44AD"}];
      var WIDGET_INC_PALETTE=[{name:"Verde",value:"#1D9E75"},{name:"Teal",value:"#16A085"},{name:"Smeraldo",value:"#10B981"},{name:"Verde 2",value:"#27AE60"},{name:"Blu",value:"#3498DB"},{name:"Royal",value:"#0D6EFD"}];
      var [draft,setDraft]=useState(function(){return{bgColor:widgetBgColor,bgAlpha:widgetBgAlpha,expenseColor:widgetExpenseColor,incomeColor:widgetIncomeColor,title:translateUiRuntimeText(widgetTitle),subtitle:translateUiRuntimeText(widgetSubtitle),expenseLabel:stripWidgetPrefix(translateUiRuntimeText(widgetExpenseLabel))||translateUiRuntimeText("Uscita"),incomeLabel:stripWidgetPrefix(translateUiRuntimeText(widgetIncomeLabel))||translateUiRuntimeText("Entrata"),showHeader:widgetShowHeader,buttonStyle:widgetButtonStyle,voiceEnabled:widgetVoiceEnabled};});
      function stripWidgetPrefix(v){return String(v||"").replace(/^\s*[+\-−]\s*/,"").trim();}
      function dset(k,v){setDraft(function(p){return{...p,[k]:v};});}
      function radiusFor(id){var x=BUTTON_STYLES.find(function(b){return b.id===id;});return x?Math.max(6,Math.round(x.r*.7)):10;}
      function alphaHex(hex,alpha){var a=Math.max(0,Math.min(100,Number(alpha)||0))/100;var h=String(hex||"#1E1E30");if(h.length===4)h="#"+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];var r=parseInt(h.slice(1,3),16)||0,g=parseInt(h.slice(3,5),16)||0,b=parseInt(h.slice(5,7),16)||0;return "rgba("+r+","+g+","+b+","+a+")";}
      function textOnBg(hex){var h=String(hex||"#1E1E30").replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var r=parseInt(h.slice(0,2),16)||0,g=parseInt(h.slice(2,4),16)||0,b=parseInt(h.slice(4,6),16)||0;return (r*299+g*587+b*114)/1000<145?"#FFFFFF":"#222222";}
      function save(){var cleanExpense=stripWidgetPrefix(draft.expenseLabel)||"Uscita";var cleanIncome=stripWidgetPrefix(draft.incomeLabel)||"Entrata";setWidgetBgColor(draft.bgColor);setWidgetBgAlpha(numOr(draft.bgAlpha,65));setWidgetExpenseColor(draft.expenseColor);setWidgetIncomeColor(draft.incomeColor);setWidgetTitle(draft.title);setWidgetSubtitle(draft.subtitle);setWidgetExpenseLabel(cleanExpense);setWidgetIncomeLabel(cleanIncome);setWidgetShowHeader(!!draft.showHeader);setWidgetButtonStyle(draft.buttonStyle);setWidgetVoiceEnabled(!!draft.voiceEnabled);saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),quickAdd:{bgColor:draft.bgColor,bgAlpha:numOr(draft.bgAlpha,65),expenseColor:draft.expenseColor,incomeColor:draft.incomeColor,title:draft.title,subtitle:draft.subtitle,expenseLabel:cleanExpense,incomeLabel:cleanIncome,showHeader:!!draft.showHeader,buttonStyle:draft.buttonStyle,compactSingleRow:true,reduceButtonHeightPct:15,removeButtonWhiteOverlay:true,widgetCornerRadius:"soft",showVoiceButton:!!draft.voiceEnabled,voiceLabel:L("Voce"),voiceIcon:"🎙️",voiceAction:"open-voice",voiceUrlScheme:"fainance://open-voice",logoKind:"official",logoLabel:"fAI"},bgColor:draft.bgColor,bgAlpha:numOr(draft.bgAlpha,65),expenseColor:draft.expenseColor,incomeColor:draft.incomeColor,title:draft.title,subtitle:draft.subtitle,expenseLabel:cleanExpense,incomeLabel:cleanIncome,showHeader:!!draft.showHeader,buttonStyle:draft.buttonStyle});}
      function Palette({title,value,onPick,items}){return <div style={{background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:14,padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><div style={{fontSize:13,fontWeight:800,color:textC}}>{L(title)}</div><div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}><div style={{width:34,height:22,borderRadius:8,background:value,border:"1px solid "+borderC}}/><span style={{fontSize:11,color:subC,fontWeight:700}}>{value}</span></div></div><div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:10}}><input type="color" value={value} onChange={function(e){onPick(e.target.value);}} style={{width:54,height:42,padding:0,border:"none",borderRadius:10,cursor:"pointer",background:"transparent"}}/><div style={{background:value,color:"#fff",borderRadius:12,padding:"9px 14px",fontSize:12,fontWeight:900,textShadow:"0 1px 2px rgba(0,0,0,0.35)"}}>{L("Anteprima")}</div></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{items.map(function(c){var active=value.toUpperCase()===c.value.toUpperCase();return <button type="button" title={c.name} key={c.value} onClick={function(){onPick(c.value);}} style={{width:32,height:32,background:c.value,border:active?"3px solid #333":"2px solid transparent",boxShadow:active?"0 0 0 2px rgba(127,119,221,0.35)":"none",borderRadius:"50%",cursor:"pointer",padding:0}}/>;})}</div></div>;}
      var previewText=textOnBg(draft.bgColor);
      var previewSub=previewText==="#FFFFFF"?"rgba(255,255,255,0.72)":"#777";
      var cardAlpha=alphaHex(draft.bgColor,draft.bgAlpha);
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:16}}><div style={{fontSize:15,fontWeight:900,color:textC,marginBottom:4}}>{L("⚡ Aggiunta Rapida")}</div><SettingHint>{L("Questo widget serve per inserire rapidamente una nuova uscita o una nuova entrata direttamente dalla Home del telefono, senza aprire manualmente l’app.")}</SettingHint><div style={{background:cardAlpha,border:"1px solid rgba(255,255,255,.18)",borderRadius:14,padding:10,display:"flex",alignItems:"center",gap:10,boxShadow:"inset 0 1px 0 rgba(255,255,255,.08)"}}><FAInanceLogo size={36}/><div style={{height:32,width:1,background:"rgba(255,255,255,.18)"}}/>{draft.voiceEnabled&&<div style={{width:34,height:34,borderRadius:17,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:previewText}}>🎙️</div>}<div style={{flex:1,background:draft.expenseColor,color:"#fff",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 8px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:900}}><span>−</span><span>{L(draft.expenseLabel||"Uscita")}</span></div><div style={{flex:1,background:draft.incomeColor,color:"#fff",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 8px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:900}}><span>+</span><span>{L(draft.incomeLabel||"Entrata")}</span></div><div style={{width:30,height:30,borderRadius:15,border:"1px solid rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",color:previewText}}>⚙</div></div>{draft.showHeader&&<div style={{background:cardAlpha,border:"1px solid rgba(255,255,255,.18)",borderRadius:14,padding:14,marginTop:12}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><FAInanceLogo size={42}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:900,color:previewText}}>{draft.title||"fAInance"}</div><div style={{fontSize:12,color:previewSub}}>{draft.subtitle||"Aggiunta rapida movimenti"}</div></div><div style={{color:previewText}}>⚙</div></div><div style={{display:"flex",gap:10}}>{draft.voiceEnabled&&<div style={{width:44,background:"rgba(255,255,255,.18)",color:previewText,border:"1px solid rgba(255,255,255,.25)",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 10px",textAlign:"center",fontWeight:900}}>🎙️</div>}<div style={{flex:1,background:draft.expenseColor,color:"#fff",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 10px",textAlign:"center",fontWeight:900}}>− {L(draft.expenseLabel||"Uscita")}</div><div style={{flex:1,background:draft.incomeColor,color:"#fff",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 10px",textAlign:"center",fontWeight:900}}>+ {L(draft.incomeLabel||"Entrata")}</div></div></div>}</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}><div><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:5}}>{L("Titolo")}</div><input value={draft.title} onChange={function(e){dset("title",e.target.value);}} style={sinp}/></div><div><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:5}}>{L("Sottotitolo")}</div><input value={draft.subtitle} onChange={function(e){dset("subtitle",e.target.value);}} style={sinp}/></div><div><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:5}}>{L("Testo tasto uscita")}</div><input value={draft.expenseLabel} onChange={function(e){dset("expenseLabel",stripWidgetPrefix(e.target.value));}} style={sinp}/></div><div><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:5}}>{L("Testo tasto entrata")}</div><input value={draft.incomeLabel} onChange={function(e){dset("incomeLabel",stripWidgetPrefix(e.target.value));}} style={sinp}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}><Palette title={L("Sfondo widget")} value={draft.bgColor} onPick={function(v){dset("bgColor",v);}} items={WIDGET_BG_PALETTE}/><Palette title={L("Pulsante uscita")} value={draft.expenseColor} onPick={function(v){dset("expenseColor",v);}} items={WIDGET_EXP_PALETTE}/><Palette title={L("Pulsante entrata")} value={draft.incomeColor} onPick={function(v){dset("incomeColor",v);}} items={WIDGET_INC_PALETTE}/></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>{L("Trasparenza sfondo widget")}</div><div style={{fontSize:12,color:subC}}>{L("Regola solo lo sfondo del widget.")}</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draft.bgAlpha}%</div></div><input type="range" min="20" max="100" step="1" value={draft.bgAlpha} onChange={function(e){dset("bgAlpha",Number(e.target.value));}} style={{width:"100%"}}/></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:8}}>{L("Bordi dei tasti widget")}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{BUTTON_STYLES.map(function(bs){var active=draft.buttonStyle===bs.id;return <button type="button" key={bs.id} onClick={function(){dset("buttonStyle",bs.id);}} style={{padding:"10px",border:"2px solid "+(active?"#7F77DD":borderC),borderRadius:Math.max(6,Math.round(bs.r*.7)),background:active?(dark?"#2a2a3e":"#EEEDFE"):(dark?"#1e1e30":"#f9f9f9"),cursor:"pointer",fontSize:13,color:active?"#7F77DD":textC,fontWeight:active?800:500}}>{L(bs.label)}</button>;})}</div></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Mostra microfono nel widget")}</div><div style={{fontSize:12,color:subC}}>{L("Aggiunge il pulsante 🎙️ sulla sinistra del widget di aggiunta rapida.")}</div></div><Toggle label="" checked={!!draft.voiceEnabled} onChange={function(){dset("voiceEnabled",!draft.voiceEnabled);}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Mostra intestazione nella versione ampia")}</div><div style={{fontSize:12,color:subC}}>{L("Nella versione 1x4 resta una sola riga.")}</div></div><Toggle label="" checked={!!draft.showHeader} onChange={function(){dset("showHeader",!draft.showHeader);}}/></div><Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>{L("Salva e aggiorna widget")}</Btn>
      </div>;
    }

    function WidgetIntroCard({icon,title,children}){return <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:16,display:"flex",gap:14,alignItems:"flex-start"}}><div style={{width:46,height:46,borderRadius:14,background:dark?"#24213a":"#F0EDFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{icon}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:900,color:textC,marginBottom:5}}>{L(title)}</div><div style={{fontSize:13,color:subC,lineHeight:1.45}}>{typeof children==="string"?L(children):children}</div></div></div>;}

    function WidgetNoteSettingsPanel(){
      var [draftMaxChars,setDraftMaxChars]=useState(String(widget2MaxChars||500));
      var [draftTextSize,setDraftTextSize]=useState(Number(widget2TextSize)||14);
      var [draftBgAlpha,setDraftBgAlpha]=useState(numOr(widget2BgAlpha,65));
      function save(){
        var max=(parseInt(draftMaxChars,10)||500);max=Math.max(20,Math.min(2000,max));
        var rawAlpha=Number(draftBgAlpha);var alpha=Math.max(0,Math.min(100,Number.isFinite(rawAlpha)?rawAlpha:65));
        var textSize=Math.max(10,Math.min(28,Number(draftTextSize)||14));
        setWidget2MaxChars(max);
        setWidget2TextSize(textSize);
        setWidget2BgAlpha(alpha);
        saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),noteWidget:{...widgetSettingsPayload().noteWidget,maxChars:max,textSize:textSize,bgAlpha:alpha,titleColor:widget2TitleColor,bodyColor:widget2BodyColor,accentColor:widget2AccentColor}});
      }
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <WidgetIntroCard icon="📝" title={L("Nota / Coordinata")}>{L("Questo widget mostra sulla Home una nota salvata oppure una coordinata bancaria. Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori e aggiornamento.")}</WidgetIntroCard>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:900,color:textC,marginBottom:5}}>{L("Numero massimo di caratteri")}</div><div style={{fontSize:12,color:subC,marginBottom:8}}>{L("Limite del testo mostrato nel widget.")}</div><input type="number" inputMode="numeric" min="20" max="2000" value={draftMaxChars} onChange={function(e){setDraftMaxChars(e.target.value);}} onBlur={function(){var n=parseInt(draftMaxChars,10);if(!n)setDraftMaxChars("500");else setDraftMaxChars(String(Math.max(20,Math.min(2000,n))));}} style={{...sinp,width:"100%"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:900,color:textC,marginBottom:8}}>{L("Grandezza testo")}</div><div style={{fontSize:12,color:subC,marginBottom:8}}>{L("Dimensione del contenuto mostrato nel widget.")}</div><div style={{display:"flex",alignItems:"center",gap:10}}><input type="range" min="10" max="28" step="1" value={draftTextSize} onChange={function(e){setDraftTextSize(Number(e.target.value));}} style={{flex:1}}/><input type="number" min="10" max="28" value={draftTextSize} onChange={function(e){setDraftTextSize(Math.max(10,Math.min(28,Number(e.target.value)||14)));}} style={{...sinp,width:74}}/></div></div></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore icona")}</div><input type="color" value={widget2AccentColor} onChange={function(e){setWidget2AccentColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),noteWidget:{...widgetSettingsPayload().noteWidget,accentColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore titolo")}</div><input type="color" value={widget2TitleColor} onChange={function(e){setWidget2TitleColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),noteWidget:{...widgetSettingsPayload().noteWidget,titleColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore testo")}</div><input type="color" value={widget2BodyColor} onChange={function(e){setWidget2BodyColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),noteWidget:{...widgetSettingsPayload().noteWidget,bodyColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>{L("Trasparenza sfondo widget")}</div><div style={{fontSize:12,color:subC}}>{L("100% = completamente trasparente. 0% = sfondo pieno.")}</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draftBgAlpha}%</div></div><input type="range" min="0" max="100" step="1" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Number(e.target.value));}} style={{width:"100%"}}/><input type="number" min="0" max="100" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Math.max(0,Math.min(100,Number(e.target.value)||0)));}} style={{...sinp,width:90,marginTop:8}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Aggiornamento automatico")}</div><div style={{fontSize:12,color:subC}}>{L("Aggiorna i widget già installati quando cambi contenuti o impostazioni.")}</div></div><Toggle label="" checked={!!widget2AutoUpdate} onChange={function(){setWidget2AutoUpdate(!widget2AutoUpdate);}}/></div>
        <Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>{L("Salva e aggiorna widget")}</Btn>
      </div>;
    }

    function WidgetGoalSettingsPanel(){
      var selectedGoal=(goals||[])[0]||null;
      var target=selectedGoal?Number(selectedGoal.target||0):0;
      var saved=selectedGoal?Number(selectedGoal.saved||0):0;
      var pct=target>0?Math.min(100,Math.round(saved/target*100)):0;
      var gColor=widget3AccentColor;
      var [draftBgAlpha,setDraftBgAlpha]=useState(numOr(widget3BgAlpha,65));
      function save(){
        var rawAlpha=Number(draftBgAlpha);var alpha=Math.max(0,Math.min(100,Number.isFinite(rawAlpha)?rawAlpha:65));
        setWidget3BgAlpha(alpha);
        saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),goalWidget:{...widgetSettingsPayload().goalWidget,bgAlpha:alpha,showPercent:!!widget3ShowPercent,showAmounts:!!widget3ShowAmounts,accentColor:widget3AccentColor,textColor:widget3TextColor,percentColor:widget3PercentColor}});
      }
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <WidgetIntroCard icon="🎯" title={L("Obiettivo")}>{L("Questo widget mostra sulla Home l’avanzamento di un obiettivo di risparmio: nome, percentuale, barra e importi. L’obiettivo preciso si sceglie quando aggiungi il widget alla Home; qui modifichi aspetto e colori.")}</WidgetIntroCard>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{background:dark?"#111827":"#F8FAFC",border:"1px solid "+borderC,borderRadius:14,padding:12,display:"flex",alignItems:"center",gap:12}}><div style={{width:48,height:48,borderRadius:24,background:gColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff"}}>{selectedGoal?(selectedGoal.icon||"🎯"):"🎯"}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div style={{fontSize:16,fontWeight:900,color:widget3TextColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{selectedGoal?(selectedGoal.name||"Obiettivo"):"Anteprima obiettivo"}</div>{widget3ShowPercent&&<div style={{fontSize:16,fontWeight:900,color:widget3PercentColor}}>{pct}%</div>}</div><div style={{height:8,borderRadius:8,background:dark?"#273244":"#E5E7EB",overflow:"hidden",marginTop:8}}><div style={{width:pct+"%",height:"100%",background:gColor,borderRadius:8}}/></div>{widget3ShowAmounts&&<div style={{fontSize:12,color:widget3TextColor,marginTop:5,opacity:0.82}}><span style={{color:widget3PercentColor,fontWeight:800}}>{fmt(saved)}</span> / {fmt(target)}</div>}</div><div style={{fontSize:18,color:subC}}>⚙</div></div></div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Mostra percentuale")}</div><div style={{fontSize:12,color:subC}}>{L("Mostra la percentuale di avanzamento.")}</div></div><Toggle label="" checked={!!widget3ShowPercent} onChange={function(){setWidget3ShowPercent(!widget3ShowPercent);}}/></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Mostra importi")}</div><div style={{fontSize:12,color:subC}}>{L("Mostra importo raggiunto e target.")}</div></div><Toggle label="" checked={!!widget3ShowAmounts} onChange={function(){setWidget3ShowAmounts(!widget3ShowAmounts);}}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore barra/icona")}</div><input type="color" value={widget3AccentColor} onChange={function(e){setWidget3AccentColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),goalWidget:{...widgetSettingsPayload().goalWidget,accentColor:e.target.value,color:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore testo")}</div><input type="color" value={widget3TextColor} onChange={function(e){setWidget3TextColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),goalWidget:{...widgetSettingsPayload().goalWidget,textColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore percentuale")}</div><input type="color" value={widget3PercentColor} onChange={function(e){setWidget3PercentColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),goalWidget:{...widgetSettingsPayload().goalWidget,percentColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>{L("Trasparenza sfondo widget")}</div><div style={{fontSize:12,color:subC}}>{L("100% = completamente trasparente. 0% = sfondo pieno.")}</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draftBgAlpha}%</div></div><input type="range" min="0" max="100" step="1" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Number(e.target.value));}} style={{width:"100%"}}/><input type="number" min="0" max="100" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Math.max(0,Math.min(100,Number(e.target.value)||0)));}} style={{...sinp,width:90,marginTop:8}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Aggiornamento automatico")}</div><div style={{fontSize:12,color:subC}}>{L("Aggiorna il widget quando cambia l’obiettivo.")}</div></div><Toggle label="" checked={!!widget3AutoUpdate} onChange={function(){setWidget3AutoUpdate(!widget3AutoUpdate);}}/></div>
        <Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>{L("Salva e aggiorna widget")}</Btn>
      </div>;
    }


    function WidgetGenericStylePanel({kind,icon,title,description,values,setters,onSave}){
      var [draftTextSize,setDraftTextSize]=useState(Number(values.textSize)||13);
      var [draftBgAlpha,setDraftBgAlpha]=useState(numOr(values.bgAlpha,65));
      useEffect(function(){setDraftBgAlpha(numOr(values.bgAlpha,65));},[values.bgAlpha]);
      useEffect(function(){setDraftTextSize(Number(values.textSize)||13);},[values.textSize]);
      function save(){
        var textSize=Math.max(10,Math.min(28,Number(draftTextSize)||13));
        var rawAlpha=Number(draftBgAlpha);var alpha=Math.max(0,Math.min(100,Number.isFinite(rawAlpha)?rawAlpha:65));
        setters.setTextSize(textSize);
        setters.setBgAlpha(alpha);
        onSave({textSize:textSize,bgAlpha:alpha});
      }
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <WidgetIntroCard icon={icon} title={L(title)}>{L(description)}</WidgetIntroCard>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:900,color:textC,marginBottom:8}}>{L("Grandezza testo")}</div><div style={{fontSize:12,color:subC,marginBottom:8}}>{L("Dimensione del contenuto mostrato nel widget.")}</div><div style={{display:"flex",alignItems:"center",gap:10}}><input type="range" min="10" max="28" step="1" value={draftTextSize} onChange={function(e){setDraftTextSize(Number(e.target.value));}} style={{flex:1}}/><input type="number" min="10" max="28" value={draftTextSize} onChange={function(e){setDraftTextSize(Math.max(10,Math.min(28,Number(e.target.value)||13)));}} style={{...sinp,width:74}}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore icona")}</div><input type="color" value={values.iconColor} onChange={function(e){setters.setIconColor(e.target.value);}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore titolo")}</div><input type="color" value={values.titleColor} onChange={function(e){setters.setTitleColor(e.target.value);}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore testo")}</div><input type="color" value={values.textColor} onChange={function(e){setters.setTextColor(e.target.value);}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
        </div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>{L("Trasparenza sfondo widget")}</div><div style={{fontSize:12,color:subC}}>{L("100% = completamente trasparente. 0% = sfondo pieno.")}</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draftBgAlpha}%</div></div><input type="range" min="0" max="100" step="1" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Number(e.target.value));}} style={{width:"100%"}}/><input type="number" min="0" max="100" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Math.max(0,Math.min(100,Number(e.target.value)||0)));}} style={{...sinp,width:90,marginTop:8}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Aggiornamento automatico")}</div><div style={{fontSize:12,color:subC}}>{L("Aggiorna i widget già installati quando cambi contenuti o impostazioni.")}</div></div><Toggle label="" checked={!!values.autoUpdate} onChange={function(){setters.setAutoUpdate(!values.autoUpdate);}}/></div>
        <Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>{L("Salva e aggiorna widget")}</Btn>
      </div>;
    }

    function WidgetShoppingListSettingsPanel(){
      function save(extra){saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),shoppingListWidget:{...widgetSettingsPayload().shoppingListWidget,textSize:extra.textSize,bgAlpha:extra.bgAlpha,iconColor:widgetShoppingListIconColor,titleColor:widgetShoppingListTitleColor,textColor:widgetShoppingListTextColor,autoUpdate:!!widgetShoppingListAutoUpdate}});}
      return <WidgetGenericStylePanel key={"shop_"+widgetShoppingListBgAlpha+"_"+widgetShoppingListTextSize} kind="shoppingList" icon="🧺" title="Lista spesa" description="Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento." values={{textSize:widgetShoppingListTextSize,bgAlpha:widgetShoppingListBgAlpha,iconColor:widgetShoppingListIconColor,titleColor:widgetShoppingListTitleColor,textColor:widgetShoppingListTextColor,autoUpdate:widgetShoppingListAutoUpdate}} setters={{setTextSize:setWidgetShoppingListTextSize,setBgAlpha:setWidgetShoppingListBgAlpha,setIconColor:setWidgetShoppingListIconColor,setTitleColor:setWidgetShoppingListTitleColor,setTextColor:setWidgetShoppingListTextColor,setAutoUpdate:setWidgetShoppingListAutoUpdate}} onSave={save}/>;
    }

    function WidgetFidelitySettingsPanel(){
      function save(extra){saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),fidelityWidget:{...widgetSettingsPayload().fidelityWidget,textSize:extra.textSize,bgAlpha:extra.bgAlpha,iconColor:widgetFidelityIconColor,titleColor:widgetFidelityTitleColor,textColor:widgetFidelityTextColor,autoUpdate:!!widgetFidelityAutoUpdate}});}
      return <WidgetGenericStylePanel kind="fidelity" icon="💳" title="Fidelity card" description="La carta precisa si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento." values={{textSize:widgetFidelityTextSize,bgAlpha:widgetFidelityBgAlpha,iconColor:widgetFidelityIconColor,titleColor:widgetFidelityTitleColor,textColor:widgetFidelityTextColor,autoUpdate:widgetFidelityAutoUpdate}} setters={{setTextSize:setWidgetFidelityTextSize,setBgAlpha:setWidgetFidelityBgAlpha,setIconColor:setWidgetFidelityIconColor,setTitleColor:setWidgetFidelityTitleColor,setTextColor:setWidgetFidelityTextColor,setAutoUpdate:setWidgetFidelityAutoUpdate}} onSave={save}/>;
    }

    function WidgetDebtCreditsSettingsPanel(){
      function save(extra){saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),debtCreditsWidget:{...widgetSettingsPayload().debtCreditsWidget,textSize:extra.textSize,bgAlpha:extra.bgAlpha,iconColor:widgetDebtCreditsIconColor,titleColor:widgetDebtCreditsTitleColor,textColor:widgetDebtCreditsTextColor,autoUpdate:!!widgetDebtCreditsAutoUpdate}});}
      return <WidgetGenericStylePanel kind="debtCredits" icon="📉" title="Debiti / Crediti" description="I debiti e crediti precisi si scelgono quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento." values={{textSize:widgetDebtCreditsTextSize,bgAlpha:widgetDebtCreditsBgAlpha,iconColor:widgetDebtCreditsIconColor,titleColor:widgetDebtCreditsTitleColor,textColor:widgetDebtCreditsTextColor,autoUpdate:widgetDebtCreditsAutoUpdate}} setters={{setTextSize:setWidgetDebtCreditsTextSize,setBgAlpha:setWidgetDebtCreditsBgAlpha,setIconColor:setWidgetDebtCreditsIconColor,setTitleColor:setWidgetDebtCreditsTitleColor,setTextColor:setWidgetDebtCreditsTextColor,setAutoUpdate:setWidgetDebtCreditsAutoUpdate}} onSave={save}/>;
    }

    function WidgetShareSettingsPanel(){
      var selected=(shareProjects||[]).find(function(p){return String(p.id)===String(widgetShareSelectedProjectId);})||(shareProjects||[]).find(function(p){return String(p.id)===String(shareSelectedProjectId);})||(shareProjects||[])[0]||null;
      var [draftBgAlpha,setDraftBgAlpha]=useState(numOr(widgetShareBgAlpha,65));
      function projectBalance(project){
        if(!project)return{net:0,owed:0,owe:0,last:"Nessuna attività recente"};
        var participants=(project.participants||[]);
        var member=participants.find(function(p){return p.uid===userId;})||participants.find(function(p){return p.id==="me";})||participants[0]||null;
        var currentId=member?member.id:"me";
        var balances={};participants.forEach(function(p){balances[p.id]=0;});
        ((project.activities||[])).forEach(function(a){
          if(a.kind==="settlement"){balances[a.from]=(balances[a.from]||0)+Number(a.amount||0);balances[a.to]=(balances[a.to]||0)-Number(a.amount||0);return;}
          var paid=a.paidBy||"me";balances[paid]=(balances[paid]||0)+Number(a.amount||0);Object.keys(a.shares||{}).forEach(function(pid){balances[pid]=(balances[pid]||0)-Number(a.shares[pid]||0);});
        });
        var net=Math.round(Number(balances[currentId]||0)*100)/100;
        var last=(project.activities||[])[0]||null;
        return{net:net,owed:Math.max(0,net),owe:Math.max(0,-net),last:last?(last.kind==="settlement"?"Ultimo saldo: "+fmt(Number(last.amount||0)):(last.desc||"Ultima spesa")+" · "+fmt(Number(last.amount||0))):"Nessuna attività recente"};
      }
      var preview=projectBalance(selected);
      function save(){
        var rawAlpha=Number(draftBgAlpha);var alpha=Math.max(0,Math.min(100,Number.isFinite(rawAlpha)?rawAlpha:65));
        setWidgetShareBgAlpha(alpha);
        saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,bgColor:widgetShareBgColor,bgAlpha:alpha,accentColor:widgetShareAccentColor,activityColor:widgetShareActivityColor,titleColor:widgetShareTitleColor,bodyColor:widgetShareBodyColor,projectId:selected?String(selected.id):"",projectName:selected?(selected.name||"Progetto Share"):"Nessun progetto selezionato",autoUpdate:!!widgetShareAutoUpdate}});
      }
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <WidgetIntroCard icon="🤝" title="Share">{L("Questo widget mostra sulla Home il riepilogo di un progetto Share: saldo personale, quanto devi, quanto ti devono e ultima attività. Il progetto può essere scelto qui come default e anche dal tasto di configurazione quando aggiungi il widget.")}</WidgetIntroCard>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:900,color:textC,marginBottom:5}}>{L("Progetto mostrato nel widget")}</div>
          <div style={{fontSize:12,color:subC,marginBottom:8}}>{L("Scegli il progetto predefinito. Ogni singolo widget potrà comunque essere configurato con un progetto diverso.")}</div>
          <select value={widgetShareSelectedProjectId||""} onChange={function(e){setWidgetShareSelectedProjectId(e.target.value);setShareSelectedProjectId(e.target.value||shareSelectedProjectId);}} style={{...sinp,width:"100%"}}>
            <option value="">{L("Primo progetto disponibile")}</option>
            {(shareProjects||[]).map(function(p){return <option key={p.id} value={p.id}>{p.name||L("Progetto Share")}</option>;})}
          </select>
        </div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}>
          <div style={{background:widgetShareBgColor,borderRadius:14,padding:12,border:"1px solid rgba(255,255,255,.18)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><FAInanceLogo size={34}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:900,color:widgetShareTitleColor}}>Share</div><div style={{fontSize:11,color:widgetShareBodyColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{selected?(selected.name||L("Progetto Share")):L("Nessun progetto selezionato")}</div></div><div style={{color:widgetShareTitleColor}}>⚙</div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"rgba(255,255,255,.13)",borderRadius:12,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:widgetShareBodyColor}}>{L("Saldo")}</div><div style={{fontSize:17,fontWeight:900,color:widgetShareTitleColor}}>{fmt(preview.net)}</div></div>
              <div style={{fontSize:11,color:widgetShareBodyColor,lineHeight:1.8}}><div>{L("Ti devono")}: <strong style={{color:widgetShareTitleColor}}>{fmt(preview.owed)}</strong></div><div>{L("Devi")}: <strong style={{color:widgetShareTitleColor}}>{fmt(preview.owe)}</strong></div><div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{preview.last}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}><div style={{background:widgetShareAccentColor,color:"#fff",borderRadius:btnRadius,padding:"8px",textAlign:"center",fontWeight:900}}>{"+ "+L("Spesa")}</div><div style={{background:widgetShareActivityColor,color:"#fff",borderRadius:btnRadius,padding:"8px",textAlign:"center",fontWeight:900}}>{L("Attività")}</div></div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Sfondo")}</div><input type="color" value={widgetShareBgColor} onChange={function(e){setWidgetShareBgColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,bgColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore + Spesa")}</div><input type="color" value={widgetShareAccentColor} onChange={function(e){setWidgetShareAccentColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,accentColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore Attività")}</div><input type="color" value={widgetShareActivityColor} onChange={function(e){setWidgetShareActivityColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,activityColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore titolo")}</div><input type="color" value={widgetShareTitleColor} onChange={function(e){setWidgetShareTitleColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,titleColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>{L("Colore testi secondari")}</div><input type="color" value={widgetShareBodyColor} onChange={function(e){setWidgetShareBodyColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,bodyColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
        </div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>{L("Trasparenza sfondo widget")}</div><div style={{fontSize:12,color:subC}}>{L("100% = completamente trasparente. 0% = sfondo pieno.")}</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draftBgAlpha}%</div></div><input type="range" min="0" max="100" step="1" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Number(e.target.value));}} style={{width:"100%"}}/><input type="number" min="0" max="100" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Math.max(0,Math.min(100,Number(e.target.value)||0)));}} style={{...sinp,width:90,marginTop:8}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Aggiornamento automatico")}</div><div style={{fontSize:12,color:subC}}>{L("Aggiorna il widget quando cambiano progetti, spese o impostazioni Share.")}</div></div><Toggle label="" checked={!!widgetShareAutoUpdate} onChange={function(){setWidgetShareAutoUpdate(!widgetShareAutoUpdate);}}/></div>
        <Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>{L("Salva e aggiorna widget")}</Btn>
      </div>;
    }

    function GroupSettingsPanel({title,desc,items,setItems,defaultValue,setDefaultValue,withIcon}){
      var _gspKey="gsp_view_"+encodeURIComponent(title||"");
      var [view,setView]=useStorage(_gspKey,"list");
      var [edit,setEdit]=useState(null);
      var [form,setForm]=useState({name:"",icon:"📂",color:COLORS[0]});
      function add(){if(blockSetting("base"))return;if(!form.name.trim())return;setItems([...(items||[]),{id:"area_"+Date.now(),name:form.name.trim(),icon:withIcon?form.icon:undefined,color:form.color}]);setForm({name:"",icon:"📂",color:COLORS[0]});}
      function save(){if(blockSetting("base"))return;if(!edit||!edit.name.trim())return;setItems(items.map(function(x){return x.id===edit.id?{...x,name:edit.name.trim(),icon:withIcon?edit.icon:x.icon,color:edit.color||COLORS[0]}:x;}));setEdit(null);}
      function del(id){if(blockSetting("base"))return;setItems(items.filter(function(x){return x.id!==id;}));if(String(defaultValue)===String(id))setDefaultValue("");}
      function archive(id){if(blockSetting("base"))return;setItems(items.map(function(x){return x.id===id?{...x,archived:!x.archived}:x;}));}
      return <div><PageHeader title={title}/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>{L(title)}</div><SettingHint>{desc}</SettingHint><Segmented items={[{id:"list",label:"Lista"},{id:"order",label:"Riordina",disabled:!baseSettingsAllowed,lockedMessage:settingLockedMessage("base")},{id:"default",label:"Default"}]} value={view} onChange={setView}/>
      {view==="list"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{items.map(function(a){return edit&&edit.id===a.id?<div key={a.id} style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:12,display:"flex",flexDirection:"column",gap:10,...baseDisabledStyle()}}>{withIcon&&<EmojiPicker value={edit.icon||"📂"} onChange={function(v){if(blockSetting("base"))return;setEdit(function(p){return{...p,icon:v};});}}/>}<input disabled={!baseSettingsAllowed} type="color" value={edit.color||COLORS[0]} onChange={function(e){if(blockSetting("base"))return;setEdit(function(p){return{...p,color:e.target.value};});}} style={{width:34,height:34,border:"none",borderRadius:8,padding:0}}/><input disabled={!baseSettingsAllowed} value={edit.name} onChange={function(e){if(blockSetting("base"))return;setEdit(function(p){return{...p,name:e.target.value};});}} style={{...sinp,width:"100%",boxSizing:"border-box"}}/><div style={{display:"flex",gap:8}}><Btn onClick={save} bg="#7F77DD" style={{flex:1}}>{V.save}</Btn><Btn onClick={function(){setEdit(null);}} bg={dark?"#333":"#f0f0f0"} color={textC}>{L("Annulla")}</Btn></div></div>:<div key={a.id} style={{background:cardBg,borderRadius:12,border:"1px solid "+borderC,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,opacity:a.archived?0.55:1}}>{withIcon&&<span style={{fontSize:20}}>{a.icon||"📂"}</span>}<span style={{width:12,height:12,borderRadius:"50%",background:a.color||COLORS[0],flexShrink:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(a.name)}</div>{a.archived&&<div style={{fontSize:11,color:subC}}>{L("Archiviata")}</div>}</div><button disabled={!baseSettingsAllowed} onClick={function(){if(blockSetting("base"))return;setEdit({...a});}} style={{background:"none",border:"none",cursor:baseSettingsAllowed?"pointer":"not-allowed",fontSize:16,color:subC,opacity:baseSettingsAllowed?1:.45}}>✏️</button><button disabled={!baseSettingsAllowed} onClick={function(){archive(a.id);}} style={{background:"none",border:"none",cursor:baseSettingsAllowed?"pointer":"not-allowed",fontSize:16,color:subC,opacity:baseSettingsAllowed?1:.45}}>{a.archived?"📂":"🗂"}</button><button disabled={!baseSettingsAllowed} onClick={function(){del(a.id);}} style={{background:"none",border:"none",cursor:baseSettingsAllowed?"pointer":"not-allowed",fontSize:16,color:"#E24B4A",opacity:baseSettingsAllowed?1:.45}}>🗑</button></div>;})}{baseLockHint("Modifica, archiviazione, eliminazione e aggiunta disponibili dal piano Base")}<div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px dashed "+borderC,padding:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",...baseDisabledStyle()}}>{withIcon&&<EmojiPicker value={form.icon} onChange={function(v){if(blockSetting("base"))return;setForm(function(p){return{...p,icon:v};});}}/>}<input disabled={!baseSettingsAllowed} type="color" value={form.color} onChange={function(e){if(blockSetting("base"))return;setForm(function(p){return{...p,color:e.target.value};});}} style={{width:34,height:34,border:"none",borderRadius:8,padding:0}}/><input disabled={!baseSettingsAllowed} placeholder={L("Nuova area")} value={form.name} onChange={function(e){if(blockSetting("base"))return;setForm(function(p){return{...p,name:e.target.value};});}} onKeyDown={function(e){if(e.key==="Enter")add();}} style={{...sinp,flex:1,minWidth:140}}/><Btn onClick={add}>+</Btn></div></div>}
      {view==="order"&&<SortableRows items={items} onMove={function(i,dir){if(blockSetting("base"))return;var j=i+dir;if(j<0||j>=items.length)return;var arr=items.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setItems(arr);}} renderItem={function(a){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>{withIcon&&<span style={{fontSize:20}}>{a.icon||"📂"}</span>}<span style={{width:12,height:12,borderRadius:"50%",background:a.color||COLORS[0],flexShrink:0}}/><div style={{fontSize:14,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(a.name)}</div></div>;}}/>}
      {view==="default"&&<div><SettingHint>Valore preselezionato quando apri il form relativo a questa sezione.</SettingHint><select value={defaultValue||""} onChange={function(e){setDefaultValue(e.target.value);}} style={{...sinp,width:"100%"}}><option value="">{L("Nessun default")}</option>{items.map(function(a){return <option key={a.id} value={a.id}>{withIcon?(a.icon||"📂")+" ":""}{L(a.name)}</option>;})}</select></div>}
      </div></div>;}
    function ExpenseCategoriesSettings(){var [view,setView]=useStorage(userKey("expense_cats_settings_view_v1"),"list");var validCatIds=cats.map(function(c){return String(c.id);});
var cleanCatOrder=(catOrder||[]).filter(function(id){return validCatIds.indexOf(String(id))>=0;});
if(cleanCatOrder.length!==(catOrder||[]).length){setCatOrder(cleanCatOrder);}
var ordered=(cleanCatOrder.length?cleanCatOrder.map(function(id){return cats.find(function(c){return String(c.id)===String(id);});}).filter(Boolean).concat(cats.filter(function(c){return cleanCatOrder.indexOf(String(c.id))<0&&cleanCatOrder.indexOf(c.id)<0;})):cats);return <div><PageHeader title={L("Uscite / Categorie")}/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><SettingHint>{L("Gestisci categorie uscite: lista, riordino, default e accorpamento.")}</SettingHint><Segmented items={[{id:"list",label:"Lista categorie"},{id:"order",label:"Riordina",disabled:!baseSettingsAllowed,lockedMessage:settingLockedMessage("base")},{id:"default",label:"Default"},{id:"merge",label:"Accorpa",disabled:!baseSettingsAllowed,lockedMessage:settingLockedMessage("base")}]} value={view} onChange={setView}/>{view==="list"&&<><SettingsList items={cats} setItems={guardedSetter(setCats,"base")} label="Aggiungi categoria uscita" showGroup showIcon groupList={expenseGroups||DEFAULT_EXPENSE_GROUPS}/>{baseLockHint("Modifica, archiviazione, eliminazione e aggiunta categorie disponibili dal piano Base")}</>} {view==="order"&&<SortableRows items={ordered} onMove={function(i,dir){if(blockSetting("base"))return;var j=i+dir;if(j<0||j>=ordered.length)return;var arr=ordered.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setCatOrder(arr.map(function(c){return c.id;}));setCats(arr.concat(cats.filter(function(c){return arr.findIndex(function(x){return String(x.id)===String(c.id);})<0;})));}} renderItem={function(c){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>{c.icon}</span><span style={{fontSize:13,color:textC,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(c.name)}</span></div>;}}/>}{view==="default"&&<div><select value={defaultExpenseCat||""} onChange={function(e){setDefaultExpenseCat(e.target.value);}} style={{...sinp,width:"100%"}}><option value="">{L("Nessuna categoria default")}</option>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {L(c.name)}</option>;})}</select></div>}{view==="merge"&&<div><div style={{marginBottom:12}}><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>{L("Da (elimina)")}</label><select value={mergeFrom} onChange={function(e){setMergeFrom(e.target.value);}} style={sinp}><option value="">-</option>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {L(c.name)}</option>;})}</select></div><div style={{marginBottom:16}}><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>{L("In (mantieni)")}</label><select value={mergeTo} onChange={function(e){setMergeTo(e.target.value);}} style={sinp}><option value="">-</option>{cats.filter(function(c){return String(c.id)!==mergeFrom;}).map(function(c){return <option key={c.id} value={c.id}>{c.icon} {L(c.name)}</option>;})}</select></div><Btn onClick={function(){if(blockSetting("base"))return;if(!mergeFrom||!mergeTo)return;setExpenses(expenses.map(function(e){return e.catId===Number(mergeFrom)?{...e,catId:Number(mergeTo)}:e;}));setCats(cats.filter(function(c){return c.id!==Number(mergeFrom);}));setMergeFrom("");setMergeTo("");}} style={{width:"100%",padding:13,fontSize:14,fontWeight:600}}>{L("Accorpa")}</Btn></div>}</div></div>;}
    function ExpenseMethodsSettings(){var [view,setView]=useStorage(userKey("expense_methods_settings_view_v1"),"list");var ordered=(methodOrder&&methodOrder.length?methodOrder.map(function(id){return methods.find(function(m){return String(m.id)===String(id);});}).filter(Boolean).concat(methods.filter(function(m){return methodOrder.map(String).indexOf(String(m.id))<0;})):methods);return <div><PageHeader title="Uscite / Metodi di pagamento"/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><SettingHint>Gestisci metodi di pagamento: lista, riordino e default.</SettingHint><Segmented items={[{id:"list",label:"Lista"},{id:"order",label:"Riordina",disabled:!baseSettingsAllowed,lockedMessage:settingLockedMessage("base")},{id:"default",label:"Default"}]} value={view} onChange={setView}/>{view==="list"&&<div><SettingsList items={methods} setItems={guardedSetter(setMethods,"base")} label="Aggiungi metodo di pagamento" showIcon showGroup groupList={methodGroups} isMethod/>{baseLockHint("Modifica, archiviazione, ripristino, riordino e aggiunta metodi disponibili dal piano Base")}<div style={{fontSize:12,color:subC,marginTop:8}}>🗂 = {L("Archivia")}  📂 = {L("Ripristina")}</div></div>}{view==="order"&&<SortableRows items={ordered} onMove={function(i,dir){if(blockSetting("base"))return;var j=i+dir;if(j<0||j>=ordered.length)return;var arr=ordered.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setMethodOrder(arr.map(function(m){return m.id;}));setMethods(arr.concat(methods.filter(function(m){return arr.findIndex(function(x){return String(x.id)===String(m.id);})<0;})));}} renderItem={function(m){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>{m.icon}</span><span style={{fontSize:13,color:textC,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(m.name)}</span></div>;}}/>}{view==="default"&&<select value={defaultExpenseMethod||""} onChange={function(e){setDefaultExpenseMethod(e.target.value);}} style={{...sinp,width:"100%"}}><option value="">{L("Nessun metodo default")}</option>{methods.map(function(m){return <option key={m.id} value={m.id}>{m.icon} {L(m.name)}</option>;})}</select>}</div></div>;}
    function IncomeCategoriesSettings(){
      var [view,setView]=useStorage(userKey("income_cats_settings_view_v1"),"list");
      var groups=incomeGroups||DEFAULT_INCOME_GROUPS;
      function incomeDefaultGroup(id){if(id==="azioni")return "investimenti";if(id==="extra")return "extra_inc";if(id==="conti")return "investimenti";return "lavoro";}
      var validIncomeIds=incomeTypes.map(function(x){return String(x.id);});
      var cleanOrder=incomeTypeOrder.filter(function(id){return validIncomeIds.indexOf(String(id))>=0;});
      if(cleanOrder.length!==incomeTypeOrder.length){setIncomeTypeOrder(cleanOrder);}
      var orderedRaw=cleanOrder.length?cleanOrder.map(function(id){return incomeTypes.find(function(x){return String(x.id)===String(id);});}).filter(Boolean).concat(incomeTypes.filter(function(x){return cleanOrder.map(String).indexOf(String(x.id))<0;})):incomeTypes;
      var ordered=orderedRaw.map(function(it){return {...it,group:it.group||incomeDefaultGroup(it.id),color:it.color||"#5DCAA5",icon:it.icon||"💰"};});
      function setIncomeItems(nextItems){
        var nextCustom=[];var nextOverrides={...incomeTypeOverrides};var nextOrder=[];
        var nextIds=(nextItems||[]).map(function(it){return String(it.id);});
        orderedRaw.forEach(function(oldItem){
          if(nextIds.indexOf(String(oldItem.id))>=0)return;
          var isBaseMissing=INCOME_TYPES.some(function(b){return String(b.id)===String(oldItem.id);});
          var used=(incomes||[]).some(function(x){return String(x.type)===String(oldItem.id);});
          if(used){
            if(setToast)setToast({text:L("Non puoi eliminare questa voce perché esistono già elementi associati. Archiviala invece di eliminarla."),type:"warning",color:"#EF9F27",icon:"⚠️"});
            nextItems=[...(nextItems||[]),{...oldItem,archived:true}];
          }else if(isBaseMissing){
            nextOverrides[oldItem.id]={...(nextOverrides[oldItem.id]||{}),deleted:true,archived:true};
          }
        });
        (nextItems||[]).forEach(function(it){
          nextOrder.push(it.id);
          var clean={name:it.name,icon:it.icon||"💰",color:it.color||"#5DCAA5",group:it.group||(groups[0]?groups[0].id:"lavoro"),archived:!!it.archived,deleted:false};
          var isBase=INCOME_TYPES.some(function(b){return b.id===it.id;});
          if(isBase){nextOverrides[it.id]=clean;}else{nextCustom.push({...it,...clean,custom:true});}
        });
        setIncomeTypeOverrides(nextOverrides);
        setCustomIncomeTypes(nextCustom);
        setIncomeTypeOrder(nextOrder);
      }
      function moveIncome(i,dir){if(blockSetting("base"))return;var j=i+dir;if(j<0||j>=ordered.length)return;var arr=ordered.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setIncomeTypeOrder(arr.map(function(x){return x.id;}));}
      return <div><PageHeader title={L("Entrate / Categorie")}/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><SettingHint>{L("Gestisci le categorie delle entrate con la stessa interfaccia delle altre liste: modifica, archivia, cancella, riordina e default.")}</SettingHint><Segmented items={[{id:"list",label:"Lista"},{id:"order",label:"Riordina",disabled:!baseSettingsAllowed,lockedMessage:settingLockedMessage("base")},{id:"default",label:"Default"}]} value={view} onChange={setView}/>
        {view==="list"&&<><SettingsList items={ordered} setItems={guardedSetter(setIncomeItems,"base")} label="Aggiungi categoria entrata" showIcon showGroup groupList={groups}/>{baseLockHint("Modifica, archiviazione, eliminazione e aggiunta categorie disponibili dal piano Base")}</>} 
        {view==="order"&&<SortableRows items={ordered} onMove={moveIncome} renderItem={function(it){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>{it.icon||"💰"}</span><div style={{width:10,height:10,borderRadius:"50%",background:it.color||"#5DCAA5",flexShrink:0}}/><span style={{fontSize:13,color:textC,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{translateUiRuntimeText(it.name)}</span>{it.archived&&<span style={{fontSize:10,background:dark?"#333":"#f0f0f0",color:subC,borderRadius:10,padding:"1px 6px"}}>{L("Archiviato")}</span>}</div>;}}/>}
        {view==="default"&&<select value={defaultIncomeType||""} onChange={function(e){setDefaultIncomeType(e.target.value);}} style={{...sinp,width:"100%"}}><option value="">{L("Nessuna categoria default")}</option>{ordered.filter(function(it){return !it.archived;}).map(function(it){return <option key={it.id} value={it.id}>{it.icon} {translateUiRuntimeText(it.name)}</option>;})}</select>}
      </div></div>;
    }
    var [pendingLang,setPendingLang]=useState(lang);
    useEffect(function(){setPendingLang(lang);},[lang]);
    if(!settingsPage)return <SettingsMenu/>;
    if(settingsPage==="profile")return <div><PageHeader title="Profilo"/>
      <ProfileCard currentUser={currentUser} onLogout={onLogout} dark={dark} textC={textC} subC={subC} borderC={borderC} cardBg={cardBg} btnRadius={btnRadius} dateFmt={dateFmt} setToast={setToast} fbDb={fbDb} onProfileUpdate={onProfileUpdate} onDeleteAccount={deleteCurrentAccount}/>
    </div>;

    if(settingsPage==="general")return <div><PageHeader title="Generale"/>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:0,borderRadius:14,overflow:"hidden",border:"1px solid "+borderC}}>
          {[{label:"🌐 Lingua",el:<div><select value={pendingLang} onChange={function(e){setPendingLang(e.target.value);}} style={{...sinp,width:"100%",marginBottom:8}}>{LANGUAGES.map(function(l){return <option key={l.code} value={l.code}>{l.label}</option>;})}</select><Btn onClick={function(){var nextLang=pendingLang;setLang(nextLang);try{localStorage.setItem("pref_lang_v2",JSON.stringify(nextLang));}catch(e){};setToast({text:translateFainanceText("Lingua aggiornata",nextLang),type:"success",translated:true});}} bg="#7F77DD" style={{width:"100%",padding:10}}>{L("Salva lingua")}</Btn><div style={{fontSize:11,color:subC,marginTop:6}}>{L("La lingua viene applicata salvando e ricaricando l’app.")}</div></div>},{label:"📅 Formato data",el:<Segmented items={DATE_FORMATS.map(function(f){return{id:f.id,label:f.label};})} value={dateFmt} onChange={setDateFmt}/>},{label:"📅 Primo giorno settimana",el:<Segmented items={[{id:"mon",label:"Lunedì"},{id:"sun",label:"Domenica"}]} value={firstDayOfWeek} onChange={setFirstDayOfWeek}/>}].map(function(item,i,arr){return <div key={item.label} style={{background:cardBg,padding:"16px 20px",borderBottom:i<arr.length-1?"1px solid "+borderC:"none"}}><div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:8}}>{L(item.label)}</div>{item.el}</div>;})}
        </div>

        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>💱 {L("Valute")}</div>
          <SettingHint>Gestisci valuta principale e valuta secondaria con ricerca tra tutte le valute disponibili.</SettingHint>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,alignItems:"start"}}>
            <div><div style={{fontSize:13,fontWeight:700,color:textC,marginBottom:6}}>{L("Valuta principale")}</div><CurrencyPicker value={currency} onChange={setCurrency}/></div>
            <div style={{opacity:settingAllowed("base")?1:.62}}><div style={{fontSize:13,fontWeight:700,color:textC,marginBottom:6}}>{L("Valuta secondaria")} <span style={{fontSize:11,background:dark?"#333":"#FFF3CD",color:dark?"#ffd58a":"#856404",borderRadius:20,padding:"2px 7px",fontWeight:900}}>Base</span></div>{settingAllowed("base")?<CurrencyPicker value={secondaryCurrency} onChange={setSecondaryCurrency} exclude={currency} allowNone/>:<div onClick={function(){blockSetting("base");}} style={{border:"1px dashed "+(dark?"#5a4a20":"#FFD54F"),background:dark?"#2b2518":"#FFF8E1",borderRadius:12,padding:"12px",fontSize:12,color:dark?"#ffd58a":"#856404",cursor:"pointer",lineHeight:1.35}}>🔒 {L("Valuta secondaria disponibile dal piano Base.")}</div>}</div>
          </div>
          {secondaryCurrency&&<div style={{display:"flex",flexDirection:"column",gap:10,background:dark?"#252535":"#f9f9f9",borderRadius:12,padding:"14px 16px",border:"1px solid "+borderC,marginTop:12,opacity:settingAllowed("base")?1:.62}}>
            <div style={{fontSize:12,fontWeight:700,color:subC}}>{L("Mostra")} {secondaryCurrency} {L("in")}:</div>
            {[{label:"🏠 Home",always:true},{label:"📋 Storico",v:showSecInHistory,fn:function(){if(blockSetting("base"))return;setShowSecInHistory(!showSecInHistory);}},{label:"📊 Statistiche",v:showSecInStats,fn:function(){if(blockSetting("base"))return;setShowSecInStats(!showSecInStats);}},{label:"💰 Budget",v:showSecInBudget,fn:function(){if(blockSetting("base"))return;setShowSecInBudget(!showSecInBudget);}},{label:"💎 Patrimonio",v:showSecInPatrimonio,fn:function(){if(blockSetting("base"))return;setShowSecInPatrimonio(!showSecInPatrimonio);}}].map(function(item,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:item.always?subC:textC}}>{L(item.label)}</span>{item.always?<span style={{fontSize:11,background:dark?"#333":"#f0f0f0",color:"#aaa",borderRadius:8,padding:"2px 8px"}}>{L("sempre")}</span>:<Toggle label="" checked={item.v} onChange={item.fn}/>}</div>;})}
          </div>}
        </div>

        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>📊 {L("Metriche")}</div>
          <SettingHint>{translateUiRuntimeText("Saldo home e visualizzazione valori.")}</SettingHint>
          <div style={{marginTop:12,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:6}}>🏠 {L("Saldo Home")}</div>
            <Segmented items={[{id:"reale",label:"Reale"},{id:"rateizzato",label:"Rateizzato"}]} value={homeBalanceView} onChange={setHomeBalanceView}/>
          </div>
        </div>

        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><AIGrilloIcon size={46}/><div style={{fontSize:14,fontWeight:700,color:textC}}>{L("IA")}</div></div>
          <SettingHint>{translateUiRuntimeText("Scegli quali dati l’agente AI può leggere quando risponde nella chat.")}</SettingHint>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
            {[
              {id:"summary",icon:"📊",title:"Analisi limitata",desc:"Solo riassunto delle spese: totali mensili/annuali, saldo, categorie principali, budget e ricorrenti."},
              {id:"areas",icon:"📂",title:"Analisi media",desc:"Riassunto + spese raggruppate per area, utile per capire quali blocchi di spesa pesano di più."},
              {id:"full",icon:"🔎",title:"Analisi completa",desc:"Tutte le transazioni essenziali: data, importo, categoria/metodo o tipo entrata e descrizione."}
            ].map(function(opt){var active=aiDataAccess===opt.id;return <button key={opt.id} onClick={function(){setAiDataAccess(opt.id);setToast("Impostazioni IA aggiornate");}} style={{width:"100%",textAlign:"left",display:"flex",gap:12,alignItems:"flex-start",padding:"13px 14px",borderRadius:12,border:"1.5px solid "+(active?"#7F77DD":borderC),background:active?"linear-gradient(135deg,#f0edff,#e8f4ff)":(dark?"#252535":"#fff"),cursor:"pointer",boxShadow:active?"0 3px 12px rgba(127,119,221,0.16)":"none"}}>
              <span style={{fontSize:22,lineHeight:1.1}}>{opt.icon}</span>
              <span style={{flex:1}}>
                <span style={{display:"block",fontSize:13,fontWeight:800,color:active?"#534AB7":textC,marginBottom:3}}>{L(opt.title)}</span>
                <span style={{display:"block",fontSize:12,color:subC,lineHeight:1.45}}>{L(opt.desc)}</span>
              </span>
              {active&&<span style={{fontSize:16,color:"#7F77DD",fontWeight:800}}>✓</span>}
            </button>;})}
          </div>
          <div style={{marginTop:14,background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><AIGrilloIcon size={42}/><div style={{fontSize:13,fontWeight:700,color:textC}}>{L("Icona rapida Consulente AI")}</div></div>
              <div style={{fontSize:12,color:subC,marginTop:3,lineHeight:1.4}}>{L("Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.")}</div>
            </div>
            <Toggle label="" checked={aiFloatingEnabled} onChange={function(){setAiFloatingEnabled(!aiFloatingEnabled);setToast("Impostazioni IA aggiornate");}}/>
          </div>
          <div style={{fontSize:11,color:subC,marginTop:10,lineHeight:1.45}}>{L("Questa impostazione viene applicata solo alle richieste inviate all’agente AI esterno. I consigli locali dell’app continuano a usare i dati già presenti sul dispositivo.")}</div>
        </div>
      </div>
    </div>;

    if(settingsPage==="sections")return <div><PageHeader title="Sezioni"/><SettingsCards items={[
      {id:"sections_income",icon:"💰",label:"Entrate",desc:"Aree e categorie delle entrate"},
      {id:"sections_expense",icon:"💸",label:"Uscite",desc:"Aree, categorie e metodi di pagamento"},
      {id:"history_settings",icon:"📋",label:t.history||"Storico",desc:"Ordinamento e movimenti futuri"},
      {id:"patrimonio_settings",icon:"💎",label:"Patrimonio",desc:"Modalità, aree e voci patrimonio"},
      {id:"debt_credits_settings",icon:"💳",label:"Debiti / Crediti",desc:"Visibilità, collegamento a patrimonio e movimenti"},
      {id:"shopping_settings",icon:"🛒",label:"Spesa",desc:"Aree lista spesa, fidelity card e prepagate"}
    ]}/></div>;



    if(settingsPage==="debt_credits_settings")return <div><PageHeader title="Debiti / Crediti"/>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:18}}>
          <div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:4}}>💳 {L("Debiti / Crediti")}</div>
          <div style={{fontSize:12,color:subC,marginBottom:12}}>{L("Sezione disponibile dal piano Base. Puoi decidere dove far apparire i valori collegati.")}</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Riporta nel patrimonio")}</div><div style={{fontSize:12,color:subC}}>{L("Consente di creare una voce patrimonio collegata al saldo del debito o credito.")}</div></div><Toggle label="" checked={!!showDebtCreditsInPatrimonio} onChange={function(){setShowDebtCreditsInPatrimonio(!showDebtCreditsInPatrimonio);setToast(L("Impostazioni aggiornate"));}}/></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>{L("Riporta nei movimenti")}</div><div style={{fontSize:12,color:subC}}>{L("Consente di creare entrate o uscite partendo dal saldo del debito o credito.")}</div></div><Toggle label="" checked={!!showDebtCreditsInExpenses} onChange={function(){setShowDebtCreditsInExpenses(!showDebtCreditsInExpenses);setToast(L("Impostazioni aggiornate"));}}/></div>
          </div>
        </div>
      </div>
    </div>;

    var [newListSettTitle,setNewListSettTitle]=useState("");
    var [newListSettIcon,setNewListSettIcon]=useState("🧺");
    var [showNewListSettForm,setShowNewListSettForm]=useState(false);
    var SHOP_CREATE_ICONS=["🛒","🛍","🏪","🏬","🏦","🏥","🏗","🔧","🔨","🪛","🪚","🔩","🪜","🧲","💡","🔌","🪟","🚿","🛁","🪠","🚽","🧴","🧹","🧺","🧻","🫙","🖫","🍞","🥩","🐟","🥦","🍎","🧀","🥛","🍷","🫖","☕","🧃","🥤","🍕","🍔","🍣","🥗","🍜","🍰","🎂","🧁","🍫","🧸","🎮","📱","💻","🖥","📷","🎵","📚","📓","✏","🖊","🎨","🖼","🪴","🌿","🌸","🪑","🛋","🪞","🛏","🪣","🧯","🔑","🪝","🚗","🛻","🏍","🚲","⛽","🔋","🛞","🧳","👟","👠","👗","👔","🧥","🎩","💍","💄","🪥","💊","�z","🏋","⚽","🎾","🏄","🎸","🎭","🌊","🏖","🌄","✈","🗺","🏕"];
    function createSettingsShoppingList(){setShowNewListSettForm(true);}
    function confirmCreateSettingsList(){var title=String(newListSettTitle||"").trim();if(!title){setToast({text:L("Inserisci il titolo della lista."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}var icon=newListSettIcon||"🧺";var id="list_"+Date.now();setShoppingLists(function(list){return (list||[]).concat([{id:id,title:title,icon:icon,createdAt:new Date().toISOString()}]);});setToast({text:L("Lista della spesa creata"),type:"success",icon:"🗂️"});setNewListSettTitle("");setNewListSettIcon("🧺");setShowNewListSettForm(false);}
    function editSettingsShoppingList(list){var title=window.prompt(L("Titolo lista"),list.title||"");if(title===null)return;var icon=window.prompt(L("Icona lista"),list.icon||"🧺");if(icon===null)return;setShoppingLists(function(items){return (items||[]).map(function(x){return String(x.id)===String(list.id)?{...x,title:String(title||"").trim()||list.title,icon:icon||"🧺",updatedAt:new Date().toISOString()}:x;});});setToast({text:L("Lista della spesa aggiornata"),type:"success",icon:"✅"});}
    function deleteSettingsShoppingList(id){var list=(shoppingLists||[]).find(function(x){return String(x.id)===String(id);});if(!list)return;if(String(id)==="main"&&((shoppingLists||[]).length<=1)){setToast({text:L("La lista principale non può essere eliminata se è l’unica lista."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}if(!window.confirm(L("Confermi la cancellazione?")))return;setShoppingLists(function(items){return (items||[]).filter(function(x){return String(x.id)!==String(id);});});setShoppingItems(function(items){return (items||[]).filter(function(x){return String(x.listId||"main")!==String(id)||x.archived;});});if(String(activeShoppingListId)===String(id))setActiveShoppingListId("main");setToast({text:L("Cancellazione completata"),type:"success",icon:"🗑️"});}
    function shoppingAreaSettingsItems(){return (shoppingAreas||DEFAULT_SHOPPING_AREAS).map(function(a,idx){return{id:String(a),name:String(a),icon:(shoppingAreaIcons&&shoppingAreaIcons[a])||"📂",color:COLORS[idx%COLORS.length]};});}
    function setShoppingAreaSettingsItems(nextItems){var oldIcons=shoppingAreaIcons||{};var nextAreas=[];var nextIcons={};(nextItems||[]).forEach(function(it,idx){var name=String((it&&it.name)||("Area "+(idx+1))).trim()||("Area "+(idx+1));nextAreas.push(name);nextIcons[name]=(it&&it.icon)||oldIcons[it&&it.id]||oldIcons[name]||"📂";});setShoppingAreas(nextAreas);setShoppingAreaIcons(nextIcons);if(shoppingDefaultArea&&nextAreas.indexOf(shoppingDefaultArea)<0)setShoppingDefaultArea(nextAreas[0]||"");}
    function ShoppingSettingsCategoriesPanel(){var [view,setView]=useStorage(userKey("shopping_categories_settings_view_v1"),"list");var products=(shoppingItems||[]).filter(function(x){return x.archived;});var ordered=products.slice().sort(function(a,b){return Number(a.order||0)-Number(b.order||0);});function moveProductSetting(id,dir){if(blockSetting("base"))return;var idx=ordered.findIndex(function(x){return String(x.id)===String(id);});var j=idx+dir;if(idx<0||j<0||j>=ordered.length)return;var ids=ordered.map(function(x){return x.id;});var tmp=ids[idx];ids[idx]=ids[j];ids[j]=tmp;setShoppingItems(function(list){return (list||[]).map(function(x){var pos=ids.indexOf(x.id);return pos>=0?{...x,order:pos+1}:x;});});}
      return <div><PageHeader title="Spesa / Categorie"/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><SettingHint>{L("Gestisci i prodotti salvati della spesa con la stessa impostazione grafica delle categorie Uscite. La logica della sezione Spesa resta invariata.")}</SettingHint><Segmented items={[{id:"list",label:"Lista categorie"},{id:"order",label:"Riordina",disabled:!baseSettingsAllowed,lockedMessage:settingLockedMessage("base")}]} value={view} onChange={setView}/>{view==="list"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{ordered.map(function(x){return <div key={x.id} style={{background:cardBg,borderRadius:12,border:"1px solid "+borderC,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🏷</span><span style={{width:12,height:12,borderRadius:"50%",background:confirmButtonColor,flexShrink:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(x.name||"Prodotto")}</div><div style={{fontSize:11,color:subC}}>{((shoppingAreaIcons&&shoppingAreaIcons[x.area])||"📂")+" "+L(x.area||"Altro")}</div></div></div>;})}{!ordered.length&&<div style={{fontSize:13,color:subC,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:12,padding:14}}>{L("Nessun prodotto salvato")}</div>}</div>}{view==="order"&&<SortableRows items={ordered} onMove={function(i,dir){if(i<0||i>=ordered.length)return;moveProductSetting(ordered[i].id,dir);}} renderItem={function(x){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>🏷</span><span style={{fontSize:13,color:textC,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(x.name||"Prodotto")}</span><span style={{fontSize:11,color:subC,whiteSpace:"nowrap"}}>· {L(x.area||"Altro")}</span></div>;}}/>}</div></div>;}

    if(settingsPage==="shopping_settings")return <div><PageHeader title="Spesa"/><SettingsCards items={[
      {id:"shopping_settings_lists",icon:"🧺",label:"Liste",desc:"Lista, modifica ed eliminazione delle liste spesa"},
      {id:"shopping_settings_areas",icon:"📂",label:"Aree",desc:"Lista, riordino e default delle aree spesa"}
    ]}/></div>;

    if(settingsPage==="shopping_settings_lists")return <div><PageHeader title="Spesa / Liste"/>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:12}}><div><div style={{fontSize:14,fontWeight:900,color:textC}}>🧺 {L("Liste della spesa")}</div><div style={{fontSize:12,color:subC}}>{L("Crea, modifica o elimina le liste disponibili nella sezione Spesa.")}</div></div><button onClick={createSettingsShoppingList} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 12px",fontWeight:900,cursor:"pointer"}}>＋ {L("Nuova lista")}</button></div>{showNewListSettForm&&<div style={{background:dark?"#1e1e30":"#f9f9ff",borderRadius:14,border:"1.5px solid "+confirmButtonColor,padding:14,marginTop:12}}><div style={{fontSize:13,fontWeight:900,color:textC,marginBottom:10}}>{L("Nuova lista")}</div><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><span style={{fontSize:28,flexShrink:0}}>{newListSettIcon}</span><input placeholder={L("Nome lista")} value={newListSettTitle} onChange={function(e){setNewListSettTitle(e.target.value);}} style={{...sinp,flex:1}}/></div><div style={{marginBottom:10}}><div style={{fontSize:11,color:subC,marginBottom:6}}>{L("Scegli icona")}</div><div style={{display:"flex",flexWrap:"wrap",gap:4,maxHeight:160,overflowY:"auto"}}>{SHOP_CREATE_ICONS.map(function(ic){return <button key={ic} onClick={function(){setNewListSettIcon(ic);}} style={{fontSize:20,padding:"4px",background:newListSettIcon===ic?(dark?"#3d376a":"#EEEDFE"):"transparent",border:newListSettIcon===ic?"1.5px solid #7F77DD":"1.5px solid transparent",borderRadius:8,cursor:"pointer",lineHeight:1}}>{ic}</button>;})}</div></div><div style={{display:"flex",gap:8}}><Btn onClick={confirmCreateSettingsList} bg={confirmButtonColor} style={{flex:1}}>{L("Crea lista")}</Btn><Btn onClick={function(){setShowNewListSettForm(false);setNewListSettTitle("");setNewListSettIcon("🧺");}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#555"}>{L("Annulla")}</Btn></div></div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{((shoppingLists&&shoppingLists.length)?shoppingLists:[{id:"main",title:"Lista principale",icon:"🧺"}]).map(function(list){return <div key={list.id} style={{display:"flex",alignItems:"center",gap:10,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:12,padding:"10px 12px"}}><span style={{fontSize:22}}>{list.icon||"🧺"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:900,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{list.title||L("Lista senza titolo")}</div>{String(activeShoppingListId)===String(list.id)&&<div style={{fontSize:11,color:incomeColor,fontWeight:800}}>{L("Lista selezionata")}</div>}</div><button onClick={function(){editSettingsShoppingList(list);}} style={{border:"none",background:dark?"#2b2b3a":"#EEF1FF",color:confirmButtonColor,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>✏️</button><button onClick={function(){deleteSettingsShoppingList(list.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>🗑️</button></div>;})}</div>
        </div>
      </div>
    </div>;

    if(settingsPage==="shopping_settings_areas")return <GroupSettingsPanel title="Spesa / Aree" desc="Gestisci le aree della spesa: lista, riordino e area default." items={shoppingAreaSettingsItems()} setItems={setShoppingAreaSettingsItems} defaultValue={shoppingDefaultArea} setDefaultValue={setShoppingDefaultArea} withIcon/>;


    if(settingsPage==="sections_income")return <div><PageHeader title="Entrate"/><SettingsCards items={[
      {id:"sections_income_areas",icon:"📂",label:"Aree",desc:"Lista, riordino e default delle aree entrate"},
      {id:"sections_income_categories",icon:"🏷",label:"Categorie",desc:"Lista, riordino e default delle categorie entrate"}
    ]}/></div>;

    if(settingsPage==="sections_expense")return <div><PageHeader title="Uscite"/><SettingsCards items={[
      {id:"sections_expense_areas",icon:"📂",label:"Aree",desc:"Lista, riordino e default delle aree uscite"},
      {id:"sections_expense_categories",icon:"🏷",label:"Categorie",desc:"Lista, riordino, default e accorpa categorie"},
      {id:"sections_expense_methods",icon:"💳",label:"Metodi di pagamento",desc:"Lista, riordino e default dei metodi"}
    ]}/></div>;

    if(settingsPage==="sections_income_areas")return <GroupSettingsPanel title="Entrate / Aree" desc="Gestisci le aree delle entrate: lista, riordino e area default." items={incomeGroups||DEFAULT_INCOME_GROUPS} setItems={setIncomeGroups} defaultValue={defaultIncomeArea} setDefaultValue={setDefaultIncomeArea}/>;
    if(settingsPage==="sections_income_categories")return <IncomeCategoriesSettings/>;
    if(settingsPage==="sections_expense_areas")return <GroupSettingsPanel title="Uscite / Aree" desc="Gestisci le aree delle uscite: lista, riordino e area default." items={expenseGroups||DEFAULT_EXPENSE_GROUPS} setItems={setExpenseGroups} defaultValue={defaultExpenseArea} setDefaultValue={setDefaultExpenseArea}/>;
    if(settingsPage==="sections_expense_categories")return <ExpenseCategoriesSettings/>;
    if(settingsPage==="sections_expense_methods")return <ExpenseMethodsSettings/>;
    if(settingsPage==="values")return <div><PageHeader title="Categorie & Metodi"/>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[{id:"cats",icon:"💸",label:"Uscite"},{id:"income_types",icon:"💰",label:"Entrate"},{id:"methods",icon:"💳",label:"Metodi di pagamento"},{id:"areas",icon:"📂",label:"Aree"},{id:"patrimonio",icon:"💎",label:"Patrimonio"},{id:"merge",icon:"↔",label:"Accorpa"},{id:"order",icon:"↕",label:"Ordine"},{id:"defaultcat",icon:"⭐",label:"Default"}].map(function(st){return <Btn key={st.id} onClick={function(){setSettingsValuesTab(st.id);}} bg={settingsValuesTab===st.id?(dark?"#444":"#333"):(dark?"#333":"#f0f0f0")} color={settingsValuesTab===st.id?"#fff":(dark?"#eee":"#555")} style={{fontSize:12,padding:"8px 11px",whiteSpace:"nowrap",minWidth:settingsValuesTab===st.id?92:78,flex:"0 0 auto",textAlign:"center"}}>{st.icon} {L(st.label)}</Btn>;})}
</div>
      {settingsValuesTab==="cats"&&<><SettingsList items={cats} setItems={guardedSetter(setCats,"base")} label="Aggiungi categoria uscita" showGroup showIcon groupList={expenseGroups||DEFAULT_EXPENSE_GROUPS}/>{baseLockHint("Modifica, archiviazione, eliminazione e aggiunta categorie disponibili dal piano Base")}</>}
      {settingsValuesTab==="income_types"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{background:dark?"#1e2a1e":"#f0faf5",borderRadius:10,border:"1px solid "+(dark?"#2a5a2a":"#a8e6c8"),padding:"10px 14px",marginBottom:4}}>
          <div style={{fontSize:12,color:dark?"#7ec":"#1D9E75",fontWeight:600,marginBottom:2}}>💰 Tipi di entrata</div>
          <div style={{fontSize:12,color:dark?"#aaa":"#555"}}>I tipi di entrata sono predefiniti dal sistema (Busta paga, Bonus, Azioni, ecc.). Puoi modificarne nome e icona.</div>
        </div>
        {incomeTypes.map(function(it){return <div key={it.id} style={{background:cardBg,borderRadius:10,border:"1px solid "+borderC,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>{it.icon}</span>
          <div style={{width:12,height:12,borderRadius:"50%",background:it.color,flexShrink:0}}/>
          <span style={{flex:1,fontSize:14,color:textC}}>{translateUiRuntimeText(it.name)}</span>
        </div>;})}
        <div style={{fontSize:12,color:subC,marginTop:4}}>{translateUiRuntimeText("Le categorie personalizzate si aggiungono da Sezioni → Entrate → Categorie.")}</div>
      </div>}
      {settingsValuesTab==="methods"&&<div><SettingsList items={methods} setItems={guardedSetter(setMethods,"base")} label="Aggiungi metodo di pagamento" showIcon showGroup groupList={methodGroups} isMethod/>{baseLockHint("Modifica, archiviazione, ripristino, riordino e aggiunta metodi disponibili dal piano Base")}<div style={{fontSize:12,color:subC,marginTop:8}}>🗂 = Archivia  📂 = Ripristina</div></div>}
      {settingsValuesTab==="areas"&&<AreasEditor/>}
      {settingsValuesTab==="patrimonio"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <SettingsList
          items={patrimonioEntries||DEFAULT_PATRIMONIO_ENTRIES}
          setItems={setPatrimonioEntries}
          label="Aggiungi voce patrimonio"
          showGroup
          showIcon
          groupList={(patrimonioAreas||DEFAULT_PATRIMONIO_AREAS).map(function(a){return{id:a.id,name:a.icon+" "+a.name,color:a.color};})}
        />
        <div style={{fontSize:12,color:subC,marginTop:4}}>🗂 = {L("Archivia")}  📂 = {L("Ripristina")} · {L("Le aree si gestiscono in Aree → Patrimonio")}</div>
      </div>}
      {settingsValuesTab==="order"&&<div key="order-panel"><SortOrderPanel/></div>}
      {settingsValuesTab==="defaultcat"&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:4}}>⭐ {L("Categoria default")}</div>
        <div style={{fontSize:12,color:subC,marginBottom:12}}>{L("Categoria preselezionata quando apri il form di inserimento uscita")}</div>
        <select style={sinp}><option value="">{L("Nessuna (prima della lista)")}</option>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {L(c.name)}</option>;})}</select>
        <div style={{display:"flex",alignItems:"flex-start",gap:8,marginTop:10,background:dark?"#252535":"#f0f4ff",borderRadius:10,padding:"10px 12px",border:"1px solid "+(dark?"#3a3a5a":"#c7d7f8")}}>
          <span style={{fontSize:16,flexShrink:0}}>ℹ️</span>
          <span style={{fontSize:12,color:dark?"#aac":"#446"}}>Questa impostazione definisce solo la <strong>visualizzazione predefinita</strong>: la categoria preselezionata all'apertura del form. Se selezioni manualmente una categoria diversa al momento dell'inserimento, quella scelta ha sempre la precedenza.</span>
        </div>
      </div>}
      {settingsValuesTab==="merge"&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
        <div style={{marginBottom:12}}><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>{L("Da (elimina)")}</label><select value={mergeFrom} onChange={function(e){setMergeFrom(e.target.value);}} style={sinp}><option value="">-</option>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {L(c.name)}</option>;})}</select></div>
        <div style={{marginBottom:16}}><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>{L("In (mantieni)")}</label><select value={mergeTo} onChange={function(e){setMergeTo(e.target.value);}} style={sinp}><option value="">-</option>{cats.filter(function(c){return String(c.id)!==mergeFrom;}).map(function(c){return <option key={c.id} value={c.id}>{c.icon} {L(c.name)}</option>;})}</select></div>
        <Btn onClick={function(){if(blockSetting("base"))return;if(!mergeFrom||!mergeTo)return;setExpenses(expenses.map(function(e){return e.catId===Number(mergeFrom)?{...e,catId:Number(mergeTo)}:e;}));setCats(cats.filter(function(c){return c.id!==Number(mergeFrom);}));setMergeFrom("");setMergeTo("");}} style={{width:"100%",padding:13,fontSize:14,fontWeight:600}}>{L("Accorpa")}</Btn>
      </div>}
    </div>;

    
    function NotificationsSettingsPage(){
      var np=notifPrefs||{};
      function setNp(k,v){setNotifPrefs(function(p){return{...p,[k]:v};});}
      var notifBaseAllowed=settingAllowed("base");
      var [showNewNotif,setShowNewNotif]=useState(false);
      var [editNotifId,setEditNotifId]=useState(null);
      var emptyNotif={title:"",text:"",hour:"09:00",freq:"monthly",dayOfMonth:1,dayOfWeek:1,date:todayStr(),active:true};
      var [newNotif,setNewNotif]=useState(emptyNotif);
      function saveNotif(){
        if(blockSetting("base"))return;
        if(!newNotif.title.trim()){setToast({text:"⚠️ Inserisci il titolo della notifica.",type:"warning"});return;}
        if(editNotifId){
          setCustomNotifs(function(p){return p.map(function(n){return n.id===editNotifId?{...newNotif,id:editNotifId}:n;});});
          setEditNotifId(null);
          setToast("Notifica personalizzata modificata");
        } else {
          setCustomNotifs(function(p){return [...p,{...newNotif,id:Date.now()}];});
          setToast("Notifica personalizzata creata");
        }
        setNewNotif(emptyNotif);setShowNewNotif(false);
      }
      function startEditNotif(n){setNewNotif({title:n.title,text:n.text||"",hour:n.hour||"09:00",freq:n.freq||"monthly",dayOfMonth:n.dayOfMonth||1,dayOfWeek:n.dayOfWeek||1,date:n.date||todayStr(),active:n.active!==false});setEditNotifId(n.id);setShowNewNotif(true);}
      function delNotif(id){if(!window.confirm(L("Eliminare questa notifica personalizzata?")))return;setCustomNotifs(function(p){return p.filter(function(n){return n.id!==id;});});setToast("Notifica personalizzata eliminata");}
      function toggleNotif(id){setCustomNotifs(function(p){return p.map(function(n){return n.id===id?{...n,active:!n.active}:n;});});}
      var FREQ_LABELS={daily:"Ogni giorno",weekly:"Ogni settimana",monthly:"Ogni mese",yearly:"Ogni anno",once:"Una tantum"};
      var DOW=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
      return <div><PageHeader title="Notifiche & Promemoria"/>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Promemoria inserimento */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
            <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:4}}>⏰ Promemoria inserimento spese</div>
            <div style={{fontSize:12,color:subC,marginBottom:14}}>{L("Ricevere un promemoria per inserire le spese del giorno")}</div>
            <Toggle label="Attiva promemoria" checked={!!np.remindActive} onChange={function(){setNp("remindActive",!np.remindActive);}}/>
            {np.remindActive&&<div style={{marginTop:16,display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <div style={{fontSize:12,color:subC,marginBottom:6}}>Frequenza</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[{id:"daily",label:"Ogni giorno"},{id:"every2",label:"Ogni 2 giorni"},{id:"every3",label:"Ogni 3 giorni"},{id:"weekly",label:"Settimanale"}].map(function(f){return <button key={f.id} onClick={function(){setNp("remindFreq",f.id);}} style={{padding:"7px 14px",borderRadius:8,border:"1px solid "+(np.remindFreq===f.id?"#7F77DD":borderC),background:np.remindFreq===f.id?"#EEEDFE":(dark?"#252535":"#f5f5f5"),color:np.remindFreq===f.id?"#534AB7":textC,fontSize:12,cursor:"pointer",fontWeight:np.remindFreq===f.id?600:400}}>{f.label}</button>;})}</div>
              </div>
              <div>
                <div style={{fontSize:12,color:subC,marginBottom:6}}>Orario</div>
                <input type="time" value={np.remindHour||"20:00"} onChange={function(e){setNp("remindHour",e.target.value);}} style={{...sinp,width:"auto"}}/>
              </div>
              <div style={{background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:8,padding:"10px 12px"}}><span style={{fontSize:12,color:"#856404"}}>{"ℹ️ "+L('I promemoria richiedono i permessi di notifica del browser. Clicca "Attiva" per abilitarli.')}</span></div>
            </div>}
          </div>

          {/* Notifiche di sistema */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
            <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:14}}>🔔 Notifiche di sistema</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:dark?"#252535":"#f9f9f9",borderRadius:10,border:"1px solid "+(dark?"#333":"#f0f0f0")}}>
                <div><div style={{fontSize:13,fontWeight:600,color:textC}}>{"💼 "+L("Stipendio")}</div><div style={{fontSize:12,color:subC}}>{L("Notifica il giorno del mese configurato")}</div></div>
                <Toggle label="" checked={!!np.stipendioActive} onChange={function(){setNp("stipendioActive",!np.stipendioActive);}}/>
              </div>
              {np.stipendioActive&&<div style={{display:"flex",alignItems:"center",gap:10,paddingLeft:12}}>
                <span style={{fontSize:12,color:subC}}>{L("Giorno")}:</span>
                <input type="number" min="1" max="31" value={np.stipendioDay||27} onChange={function(e){setNp("stipendioDay",parseInt(e.target.value)||27);}} style={{...sinp,width:70}}/>
                <span style={{fontSize:12,color:subC}}>{L("di ogni mese")}</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:dark?"#252535":"#f9f9f9",borderRadius:10,border:"1px solid "+(dark?"#333":"#f0f0f0")}}>
                <div><div style={{fontSize:13,fontWeight:600,color:textC}}>🔄 {L("Spese ricorrenti")} <span style={{fontSize:10,background:dark?"#333":"#FFF3CD",color:dark?"#ffd58a":"#856404",borderRadius:20,padding:"1px 7px",fontWeight:900}}>Base</span></div><div style={{fontSize:12,color:subC}}>{L("Avviso quando ci sono ricorrenti da confermare")}</div></div>
                <Toggle label="" checked={!!np.spesaRicorrente} onChange={function(){if(blockSetting("base"))return;setNp("spesaRicorrente",!np.spesaRicorrente);}}/>
              </div>
            </div>
          </div>

          {/* Notifiche custom */}
          <div style={{background:notifBaseAllowed?cardBg:"#FFF8E1",borderRadius:14,border:"1px solid "+(notifBaseAllowed?borderC:"#FFD54F"),padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div><div style={{fontSize:14,fontWeight:600,color:textC}}>✏️ {L("Notifiche personalizzate")} <span style={{fontSize:10,background:dark?"#333":"#FFF3CD",color:dark?"#ffd58a":"#856404",borderRadius:20,padding:"1px 7px",fontWeight:900}}>Base</span></div>{!notifBaseAllowed&&<div style={{fontSize:12,color:dark?"#ffd58a":"#856404",marginTop:4}}>{L("Disponibili dal piano Base. Puoi vederle qui, ma non crearle o modificarle nel piano Gratis.")}</div>}</div>
              {!showNewNotif&&<button onClick={function(){if(blockSetting("base"))return;setNewNotif(emptyNotif);setEditNotifId(null);setShowNewNotif(true);}} style={{background:notifBaseAllowed?"#7F77DD":(dark?"#333":"#e5e5e5"),color:notifBaseAllowed?"#fff":subC,border:"none",borderRadius:btnRadius,padding:"7px 14px",fontSize:13,cursor:notifBaseAllowed?"pointer":"not-allowed",fontWeight:700}}>{"+ "+L("Nuova")+" "+(notifBaseAllowed?"":"🔒")}</button>}
            </div>

            {/* Form crea/modifica */}
            {showNewNotif&&<div style={{background:dark?"#1e1e30":"#f5f5ff",borderRadius:12,border:"1px solid #AFA9EC",padding:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:"#534AB7",marginBottom:12}}>{editNotifId?L("Modifica notifica"):L("Nuova notifica")}</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Titolo *")}</label>
                  <input type="text" placeholder={L("Es. Pagamento affitto")} value={newNotif.title} onChange={function(e){setNewNotif(function(p){return{...p,title:e.target.value};});}} style={sinp}/>
                </div>
                <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Testo (opzionale)")}</label>
                  <input type="text" placeholder={L("Es. Ricorda di pagare l\'affitto di questo mese")} value={newNotif.text} onChange={function(e){setNewNotif(function(p){return{...p,text:e.target.value};});}} style={sinp}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Orario")}</label>
                    <input type="time" value={newNotif.hour} onChange={function(e){setNewNotif(function(p){return{...p,hour:e.target.value};});}} style={sinp}/>
                  </div>
                  <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Frequenza")}</label>
                    <select value={newNotif.freq} onChange={function(e){setNewNotif(function(p){return{...p,freq:e.target.value};});}} style={sinp}>
                      <option value="daily">{L("Ogni giorno")}</option>
                      <option value="weekly">{L("Ogni settimana")}</option>
                      <option value="monthly">{L("Ogni mese")}</option>
                      <option value="yearly">{L("Ogni anno")}</option>
                      <option value="once">{L("Una tantum")}</option>
                    </select>
                  </div>
                </div>
                {newNotif.freq==="weekly"&&<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Giorno della settimana")}</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {DOW.map(function(d,i){return <button key={i} onClick={function(){setNewNotif(function(p){return{...p,dayOfWeek:i};});}} style={{padding:"5px 10px",borderRadius:6,border:"1px solid "+(newNotif.dayOfWeek===i?"#7F77DD":borderC),background:newNotif.dayOfWeek===i?"#EEEDFE":(dark?"#252535":"#f5f5f5"),color:newNotif.dayOfWeek===i?"#534AB7":textC,fontSize:12,cursor:"pointer"}}>{d}</button>;})}
                  </div>
                </div>}
                {newNotif.freq==="monthly"&&<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Giorno del mese")}</label>
                  <input type="number" min="1" max="31" value={newNotif.dayOfMonth} onChange={function(e){setNewNotif(function(p){return{...p,dayOfMonth:parseInt(e.target.value)||1};});}} style={{...sinp,width:80}}/>
                </div>}
                {newNotif.freq==="yearly"&&<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Data (GG/MM)")}</label>
                  <input type="date" value={newNotif.date} onChange={function(e){setNewNotif(function(p){return{...p,date:e.target.value};});}} style={{...sinp,width:"auto"}}/>
                </div>}
                {newNotif.freq==="once"&&<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Data")}</label>
                  <input type="date" value={newNotif.date} onChange={function(e){setNewNotif(function(p){return{...p,date:e.target.value};});}} style={{...sinp,width:"auto"}}/>
                </div>}
              </div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <Btn onClick={saveNotif} bg="#7F77DD" style={{flex:1,padding:"10px",fontWeight:600}}>{editNotifId?L("Salva modifiche"):L("Crea notifica")}</Btn>
                <Btn onClick={function(){setShowNewNotif(false);setEditNotifId(null);setNewNotif(emptyNotif);}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"} style={{padding:"10px 16px"}}>{L("Annulla")}</Btn>
              </div>
            </div>}

            {/* Lista notifiche custom */}
            {customNotifs.length===0&&!showNewNotif&&<div style={{textAlign:"center",color:subC,fontSize:13,padding:"20px 0"}}>{translateUiRuntimeText('Nessuna notifica personalizzata. Clicca "+ Nuova" per crearne una.')}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {customNotifs.map(function(n){return <div key={n.id} style={{padding:"12px 14px",background:n.active?(dark?"#252535":"#f9f9f9"):(dark?"#1a1a28":"#f5f5f5"),borderRadius:10,border:"1px solid "+(n.active?(dark?"#333":"#e8e8e8"):(dark?"#2a2a3e":"#ddd")),opacity:n.active?1:0.65}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:2}}>{n.title}</div>
                    {n.text&&<div style={{fontSize:12,color:subC,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.text}</div>}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:11,background:"#EEEDFE",color:"#534AB7",borderRadius:6,padding:"2px 8px"}}>{L(FREQ_LABELS[n.freq]||n.freq)}</span>
                      <span style={{fontSize:11,color:subC}}>🕐 {n.hour||"09:00"}</span>
                      {n.freq==="monthly"&&<span style={{fontSize:11,color:subC}}>📅 {L("giorno")} {n.dayOfMonth}</span>}
                      {n.freq==="weekly"&&<span style={{fontSize:11,color:subC}}>📅 {DOW[n.dayOfWeek||0]}</span>}
                      {(n.freq==="once"||n.freq==="yearly")&&n.date&&<span style={{fontSize:11,color:subC}}>📅 {fmtDate(n.date,"dmy")}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                    <Toggle label="" checked={n.active!==false} onChange={function(){if(blockSetting("base"))return;toggleNotif(n.id);}}/>
                    <button title={L("Modifica")} onClick={function(){if(blockSetting("base"))return;startEditNotif(n);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",cursor:notifBaseAllowed?"pointer":"not-allowed",color:"#378ADD",fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700,opacity:notifBaseAllowed?1:.45}}>✏️</button>
                    <button title={L("Elimina")} onClick={function(){if(blockSetting("base"))return;delNotif(n.id);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",cursor:notifBaseAllowed?"pointer":"not-allowed",color:"#E24B4A",fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700,opacity:notifBaseAllowed?1:.45}}>🗑️</button>
                  </div>
                </div>
              </div>;})}
            </div>
          </div>
        </div>
      </div>;
    
    }

    if(settingsPage==="notifications")return <NotificationsSettingsPage/>;

    if(settingsPage==="patrimonio_settings")return <div><PageHeader title="Patrimonio"/><SettingsCards items={[{id:"patrimonio_areas_settings",icon:"📂",label:"Aree",desc:settingAllowed("base")?"Lista, crea, modifica e riordina aree patrimonio":"Lista disponibile. Crea, modifica e riordina dal piano Base"},{id:"patrimonio_entries_settings",icon:"💎",label:"Voci",desc:settingAllowed("base")?"Lista, crea, modifica e riordina voci patrimonio":"Lista disponibile. Crea, modifica e riordina dal piano Base"},{id:"patrimonio_mode_settings",icon:"⚙️",label:"Modalità",desc:"Come vengono aggiornati i valori del patrimonio"}]}/></div>;
    if(settingsPage==="patrimonio_areas_settings")return <div><PageHeader title="Patrimonio / Aree"/><PatrimonioSettingsPanel forcedSection="areas" allowEditing={settingAllowed("base")} onLocked={function(){blockSetting("base");}}/></div>;
    if(settingsPage==="patrimonio_entries_settings")return <div><PageHeader title="Patrimonio / Voci"/><PatrimonioSettingsPanel forcedSection="entries" allowEditing={settingAllowed("base")} onLocked={function(){blockSetting("base");}}/></div>;
    if(settingsPage==="patrimonio_mode_settings")return <div><PageHeader title="Patrimonio / Modalità"/><PatrimonioSettingsPanel forcedSection="mode"/></div>;

    if(settingsPage==="appearance")return <div><PageHeader title="Aspetto"/><SettingsCards items={[
      {id:"appearance_app",icon:"🎨",label:"App",desc:"Tema, sfondo, stile e colori dei pulsanti dell’app"},
      {id:"appearance_nav",icon:"📱",label:"Barra inferiore",desc:"Riepilogo alto, numero icone e ordine delle sezioni"},
      {id:"appearance_widget",icon:"🧩",label:"Widget",desc:"Configurazione separata del widget Android"}
    ]}/></div>;

    if(settingsPage==="appearance_nav")return <div><PageHeader title="Aspetto / Barra inferiore e menu"/>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>📊 Mostra riepilogo in alto</div>
          <SettingHint>{translateUiRuntimeText("Attiva o rimuove la barra superiore con Uscite, Saldo ed Entrate.")}</SettingHint>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}>
            <div><div style={{fontSize:13,fontWeight:700,color:textC}}>Mostra riepilogo in alto</div><div style={{fontSize:12,color:subC,marginTop:3,lineHeight:1.35}}>Mostra o nasconde la parte alta dell'app.</div></div>
            <Toggle label="" checked={!!showAppSummaryHeader} onChange={function(){setShowAppSummaryHeader(!showAppSummaryHeader);setToast(L("Impostazioni aggiornate"));}}/>
          </div>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>{"📱 "+L("Barra inferiore e menu")}</div>
          <SettingHint>{L("Le prime sezioni dell'elenco entrano nella barra inferiore, in base al numero di icone scelto. Le altre restano nel menu Altro. L'icona Altro resta sempre disponibile.")}</SettingHint>
          <div style={{fontSize:13,fontWeight:700,color:textC,marginBottom:6}}>{L("Numero icone nella barra inferiore")}</div>
          <Segmented items={[3,4,5,6].map(function(n){return{id:String(n),label:String(n)};})} value={String(mobileNavIconCount||5)} onChange={function(v){setMobileNavIconCount(parseInt(v,10));setToast(L("Impostazioni aggiornate"));}}/>
          <div style={{fontSize:12,color:subC,marginTop:8,marginBottom:12}}>{(function(){var n=parseInt(String(mobileNavIconCount||5),10)||5;var sec=Math.max(0,n-1);var map={it:"Con "+n+" icone: "+sec+" sezioni + Altro.",en:"With "+n+" icons: "+sec+" sections + More.",es:"Con "+n+" iconos: "+sec+" secciones + Más.",fr:"Avec "+n+" icônes : "+sec+" sections + Plus.",de:"Mit "+n+" Symbolen: "+sec+" Bereiche + Mehr.",pt:"Com "+n+" ícones: "+sec+" secções + Mais.",pl:"Przy "+n+" ikonach: "+sec+" sekcje + Więcej.",nl:"Met "+n+" pictogrammen: "+sec+" secties + Meer.",ro:"Cu "+n+" pictograme: "+sec+" secțiuni + Mai mult.",el:"Με "+n+" εικονίδια: "+sec+" ενότητες + Περισσότερα."};return map[lang]||map.en;})()}</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>{normalizeOrder(mobileAllNavOrder,mobileAllNavDefaultOrder).map(function(id,idx,arr){var item=allNavDefs()[id];if(!item)return null;var bottomMap={};getBottomNavIds().forEach(function(x){bottomMap[x]=true;});var zone=bottomMap[id]?"Barra inferiore":"Menu Altro";return <div key={id} style={{display:"flex",alignItems:"center",gap:10,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:10,padding:"8px 10px"}}><span style={{fontSize:18,width:28,textAlign:"center"}}>{item.icon}</span><span style={{flex:1,fontSize:13,fontWeight:800,color:textC} }>{L(item.label)}<span style={{display:"block",fontSize:10,fontWeight:700,color:bottomMap[id]?"#1D9E75":subC,marginTop:2}}>{L(zone)}</span></span><button onClick={function(){moveOrder(mobileAllNavOrder,setMobileAllNavOrder,mobileAllNavDefaultOrder,id,-1);}} disabled={idx===0} style={{border:"1px solid "+borderC,borderRadius:8,background:dark?"#1e1e30":"#fff",color:textC,padding:"4px 8px",opacity:idx===0?0.35:1,cursor:idx===0?"not-allowed":"pointer"}}>▲</button><button onClick={function(){moveOrder(mobileAllNavOrder,setMobileAllNavOrder,mobileAllNavDefaultOrder,id,1);}} disabled={idx===arr.length-1} style={{border:"1px solid "+borderC,borderRadius:8,background:dark?"#1e1e30":"#fff",color:textC,padding:"4px 8px",opacity:idx===arr.length-1?0.35:1,cursor:idx===arr.length-1?"not-allowed":"pointer"}}>▼</button></div>;})}</div>
        </div>
      </div>
    </div>;

    if(settingsPage==="appearance_app")return <div><PageHeader title="Aspetto / App"/>
      <div style={{display:"flex",flexDirection:"column",gap:0,borderRadius:14,overflow:"hidden",border:"1px solid "+borderC}}>
        <div style={{background:cardBg,padding:"16px 20px",borderBottom:"1px solid "+borderC}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:10}}>{"🌙 "+L("Dark Mode")}</div>
          <Toggle label={L("Attiva la dark mode")} checked={dark} onChange={function(){setBgTheme(dark?"default":"dark");}} color="#7F77DD"/>
        </div>
        <div onClick={function(){if(!baseSettingsAllowed)blockSetting("base");}} style={{background:baseSettingsAllowed?cardBg:(dark?"#342b16":"#FFF8E1"),padding:"16px 20px",borderBottom:"1px solid "+(baseSettingsAllowed?borderC:(dark?"#6a5520":"#FFD54F"))}}>
          <div style={{fontSize:13,fontWeight:600,color:baseSettingsAllowed?textC:(dark?"#ffd58a":"#856404"),marginBottom:12}}>{"🎨 "+L("Sfondo")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>{BG_THEMES.map(function(th){return <button key={th.id} disabled={!baseSettingsAllowed} onClick={function(){if(blockSetting("base"))return;setBgTheme(th.id);}} style={{padding:"10px 6px",border:"2px solid "+(baseSettingsAllowed?(bgTheme===th.id?"#7F77DD":borderC):"#FFD54F"),borderRadius:12,background:baseSettingsAllowed?th.bg:"#FFF8E1",cursor:baseSettingsAllowed?"pointer":"not-allowed",fontSize:11,color:baseSettingsAllowed?(th.dark?"#eee":"#333"):"#856404",fontWeight:bgTheme===th.id?600:400,display:"flex",flexDirection:"column",alignItems:"center",gap:4,opacity:1,filter:baseSettingsAllowed?"none":"none"}}><div style={{width:22,height:22,borderRadius:6,background:th.bg,border:"1px solid #ccc"}}/>{bgTheme===th.id&&<span style={{fontSize:9,color:"#7F77DD"}}>✓</span>}<span>{L(th.label)}</span></button>;}) }</div>{baseLockHint("Scelta sfondo disponibile dal piano Base")}
        </div>
        <div style={{background:cardBg,padding:"16px 20px",borderBottom:"1px solid "+borderC}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{"🔲 "+L("Stile pulsanti")}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{BUTTON_STYLES.map(function(bs){return <button key={bs.id} onClick={function(){setBtnStyle(bs.id);}} style={{padding:"12px",border:"2px solid "+(btnStyle===bs.id?"#7F77DD":borderC),borderRadius:bs.r,background:btnStyle===bs.id?(dark?"#2a2a3e":"#EEEDFE"):(dark?"#1e1e30":"#f9f9f9"),cursor:"pointer",fontSize:13,color:btnStyle===bs.id?"#7F77DD":textC,fontWeight:btnStyle===bs.id?600:400}}>{L(bs.label)}</button>;}) }</div>
        </div>
        <div style={{background:cardBg,padding:"16px 20px",borderBottom:"1px solid "+borderC}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{"🔴 "+L("Colore uscite")}</div>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><input type="color" value={expenseColor} onChange={function(e){setExpenseColor(e.target.value);}} style={{width:48,height:40,padding:0,border:"none",borderRadius:8,cursor:"pointer"}}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["#E24B4A","#D85A30","#B33030","#C0392B","#E67E22","#8E44AD"].map(function(c){return <button key={c} onClick={function(){setExpenseColor(c);}} style={{width:28,height:28,background:c,border:expenseColor===c?"3px solid #333":"2px solid transparent",borderRadius:"50%",cursor:"pointer",padding:0}}/>;}) }</div><div style={{background:expenseColor,color:"#fff",borderRadius:btnRadius,padding:"8px 16px",fontSize:13,fontWeight:500}}>{L("Anteprima")}</div></div>
        </div>
        <div style={{background:cardBg,padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{"🟢 "+L("Colore entrate")}</div>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><input type="color" value={incomeColor} onChange={function(e){setIncomeColor(e.target.value);}} style={{width:48,height:40,padding:0,border:"none",borderRadius:8,cursor:"pointer"}}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["#1D9E75","#27AE60","#16A085","#2ECC71","#3498DB","#0D6EFD"].map(function(c){return <button key={c} onClick={function(){setIncomeColor(c);}} style={{width:28,height:28,background:c,border:incomeColor===c?"3px solid #333":"2px solid transparent",borderRadius:"50%",cursor:"pointer",padding:0}}/>;}) }</div><div style={{background:incomeColor,color:"#fff",borderRadius:btnRadius,padding:"8px 16px",fontSize:13,fontWeight:500}}>{L("Anteprima")}</div></div>
        </div>
        <div onClick={function(){if(!baseSettingsAllowed)blockSetting("base");}} style={{background:baseSettingsAllowed?cardBg:(dark?"#342b16":"#FFF8E1"),padding:"16px 20px",borderTop:"1px solid "+(baseSettingsAllowed?borderC:(dark?"#6a5520":"#FFD54F"))}}>
          <div style={{fontSize:13,fontWeight:600,color:baseSettingsAllowed?textC:(dark?"#ffd58a":"#856404"),marginBottom:12}}>{"✅ "+L("Colore bottoni di conferma")}</div>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><input disabled={!baseSettingsAllowed} type="color" value={confirmButtonColor} onChange={function(e){if(blockSetting("base"))return;setConfirmButtonColor(e.target.value);}} style={{width:48,height:40,padding:0,border:"none",borderRadius:8,cursor:baseSettingsAllowed?"pointer":"not-allowed",opacity:baseSettingsAllowed?1:.45}}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["#7F77DD","#378ADD","#1D9E75","#EF9F27","#8E44AD","#222222"].map(function(c){return <button key={c} disabled={!baseSettingsAllowed} onClick={function(){if(blockSetting("base"))return;setConfirmButtonColor(c);}} style={{width:28,height:28,background:c,border:confirmButtonColor===c?"3px solid #333":"2px solid transparent",borderRadius:"50%",cursor:baseSettingsAllowed?"pointer":"not-allowed",padding:0,opacity:baseSettingsAllowed?1:.45}}/>;}) }</div><div style={{background:baseSettingsAllowed?confirmButtonColor:"#EF9F27",color:"#fff",borderRadius:btnRadius,padding:"8px 16px",fontSize:13,fontWeight:500}}>{L("Anteprima conferma")}</div></div>{baseLockHint("Colore bottoni di conferma disponibile dal piano Base")}
        </div>
      </div>
    </div>;

    if(settingsPage==="appearance_widget")return <div><PageHeader title="Aspetto / Widget"/><WidgetAppearancePanel/></div>;
    if(settingsPage==="appearance_widget_quick")return <div><PageHeader title="Aggiunta Rapida"/><WidgetQuickAddSettingsPanel/></div>;
    if(settingsPage==="appearance_widget_note"){
      if(!isWidgetAllowed("note"))return <div><PageHeader title="Nota / Coordinata"/><LockedFeatureCard icon="📝" title="Widget Nota / Coordinata" message={widgetLockedMessage("note")}/></div>;
      return <div><PageHeader title="Nota / Coordinata"/><WidgetNoteSettingsPanel/></div>;
    }
    if(settingsPage==="appearance_widget_goal"){
      if(!isWidgetAllowed("goal"))return <div><PageHeader title="Obiettivo"/><LockedFeatureCard icon="🎯" title="Widget Obiettivo" message={widgetLockedMessage("goal")}/></div>;
      return <div><PageHeader title="Obiettivo"/><WidgetGoalSettingsPanel/></div>;
    }
    if(settingsPage==="appearance_widget_shopping_list"){
      if(!isWidgetAllowed("shoppingList"))return <div><PageHeader title="Lista spesa"/><LockedFeatureCard icon="🧺" title="Widget Lista spesa" message={widgetLockedMessage("shoppingList")}/></div>;
      return <div><PageHeader title="Lista spesa"/><WidgetShoppingListSettingsPanel/></div>;
    }
    if(settingsPage==="appearance_widget_fidelity"){
      if(!isWidgetAllowed("fidelity"))return <div><PageHeader title="Fidelity card"/><LockedFeatureCard icon="💳" title="Widget Fidelity card" message={widgetLockedMessage("fidelity")}/></div>;
      return <div><PageHeader title="Fidelity card"/><WidgetFidelitySettingsPanel/></div>;
    }
    if(settingsPage==="appearance_widget_debt_credits"){
      if(!isWidgetAllowed("debtCredits"))return <div><PageHeader title="Debiti / Crediti"/><LockedFeatureCard icon="📉" title="Widget Debiti / Crediti" message={widgetLockedMessage("debtCredits")}/></div>;
      return <div><PageHeader title="Debiti / Crediti"/><WidgetDebtCreditsSettingsPanel/></div>;
    }
    if(settingsPage==="appearance_widget_share"){
      if(!isWidgetAllowed("share"))return <div><PageHeader title="Share"/><LockedFeatureCard icon="🤝" title="Widget Share" message={widgetLockedMessage("share")}/></div>;
      return <div><PageHeader title="Share"/><WidgetShareSettingsPanel/></div>;
    }

    if(settingsPage==="history_settings")return <div><PageHeader title="Storico"/>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:4}}>📋 {L("Ordinamento storico")}</div>
          <SettingHint>{translateUiRuntimeText("Scegli quale data usare per ordinare uscite ed entrate.")}</SettingHint>
          <Segmented items={[{id:"operation",label:"Data operazione"},{id:"created",label:"Data inserimento"}]} value={historySortDate} onChange={setHistorySortDate}/>
          <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:4}}>↕ {L("Direzione ordinamento")}</div>
          <SettingHint>{L("Decidi se mostrare prima i movimenti più recenti o quelli più vecchi.")}</SettingHint>
          <Segmented items={[{id:"desc",label:"Più recenti"},{id:"asc",label:"Più vecchi"}]} value={historySortDirection} onChange={setHistorySortDirection}/>
          <div style={{fontSize:12,color:subC}}>{L("Default: prima i movimenti più recenti, ordinati per data dell’operazione.")}</div>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:4}}>📋 {L("Movimenti futuri")}</div>
          <SettingHint>{L("Decidi se nello storico devono comparire anche uscite ed entrate con data futura.")}</SettingHint>
          <Segmented items={[{id:"untilToday",label:"Solo fino a oggi"},{id:"all",label:"Mostra anche future"}]} value={historyFutureMode} onChange={setHistoryFutureMode}/>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:4}}>🤝 {L("Share nello storico")} {!baseSettingsAllowed&&<span style={{fontSize:11,color:subC}}> 🔒 Base</span>}</div>
          <SettingHint>Attiva questa opzione per mostrare nello storico anche la tua quota delle spese inserite nella sezione Share. La categoria Share comparirà nei filtri solo quando questa opzione è attiva.</SettingHint>
          <Toggle label={L("Mostra transazioni Share nello storico")} checked={showShareInHistory} onChange={function(){setShowShareInHistory(!showShareInHistory);}} color={confirmButtonColor}/>
        </div>
      </div>
    </div>;

    function backupLocalJson(key,fallback){try{var raw=localStorage.getItem(userKey(key));return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
    function restoreLocalJson(key,value){try{if(value!==undefined)localStorage.setItem(userKey(key),JSON.stringify(value));}catch(e){}}
    function buildBackupPayload(){return {expenses,incomes,cats,methods,recurring,goals,alerts,budgetPlan,patrimonioValues,patrimonioAreas,patrimonioEntries,patrimonioHistory,patrimonioNotes,historyFutureMode,historySortDate,historySortDirection,firstDayOfWeek,appuntiDocuments,appuntiNotes,bankCoords,aiDataAccess,shareProjects,showShareInHistory,debtCredits,shoppingCards,shoppingItems,shoppingAreas,shoppingAreaIcons,shoppingBoughtColor,shoppingDefaultArea,shoppingLists:backupLocalJson("shopping_lists_v2",[]),activeShoppingListId:backupLocalJson("shopping_active_list_id_v2","main"),shoppingProductSort:backupLocalJson("shopping_product_sort_v1","custom"),showDebtCreditsInPatrimonio,showDebtCreditsInExpenses,shareReceiptUploads,confirmButtonColor};}
    function countBackupItems(d){d=d||{};var parts=[];function add(label,n){n=Number(n||0);if(n>0)parts.push(n+" "+label);}add("uscite",(d.expenses||[]).length);add("entrate",(d.incomes||[]).length);add("ricorrenti",(d.recurring||[]).length);add("obiettivi",(d.goals||[]).length);add("alert",(d.alerts||[]).length);add("voci patrimonio",(d.patrimonioEntries||[]).length);add("mesi patrimonio",Object.keys(d.patrimonioHistory||{}).length);add("documenti",(d.appuntiDocuments||[]).length);add("appunti",(d.appuntiNotes||[]).length);add("coordinate",(d.bankCoords||[]).length);add("progetti Share",(d.shareProjects||[]).length);add(L("debiti/crediti"),(d.debtCredits||[]).length);add(L("carte fidelity"),(d.shoppingCards||[]).length);add(L("prodotti spesa"),(d.shoppingItems||[]).length);add(L("aree spesa"),(d.shoppingAreas||[]).length);add(L("liste spesa"),(d.shoppingLists||[]).length);return parts.length?parts.join(" · "):"0 voci";}
    function applyBackupData(d){if(d.expenses)setExpenses(d.expenses);if(d.incomes)setIncomes(d.incomes);if(d.cats)setCats(d.cats);if(d.methods)setMethods(d.methods);if(d.recurring)setRecurring(d.recurring);if(d.goals)setGoals(d.goals);if(d.alerts)setAlerts(d.alerts);if(d.budgetPlan!==undefined)setBudgetPlan(d.budgetPlan);if(d.patrimonioValues)setPatrimonioValues(d.patrimonioValues);if(d.patrimonioAreas)setPatrimonioAreas(d.patrimonioAreas);if(d.patrimonioEntries)setPatrimonioEntries(d.patrimonioEntries);if(d.patrimonioHistory)setPatrimonioHistory(d.patrimonioHistory);if(d.patrimonioNotes)setPatrimonioNotes(d.patrimonioNotes);if(d.historyFutureMode)setHistoryFutureMode(d.historyFutureMode);if(d.shareProjects)setShareProjects(d.shareProjects);if(d.debtCredits)setDebtCredits(d.debtCredits);if(d.shoppingCards)setShoppingCards(d.shoppingCards);if(d.shoppingItems)setShoppingItems(d.shoppingItems);if(d.shoppingAreas)setShoppingAreas(d.shoppingAreas);if(d.shareReceiptUploads)setShareReceiptUploads(d.shareReceiptUploads);if(d.showDebtCreditsInPatrimonio!==undefined)setShowDebtCreditsInPatrimonio(!!d.showDebtCreditsInPatrimonio);if(d.showDebtCreditsInExpenses!==undefined)setShowDebtCreditsInExpenses(!!d.showDebtCreditsInExpenses);if(d.shoppingDefaultArea)setShoppingDefaultArea(d.shoppingDefaultArea);if(d.showShareInHistory!==undefined)setShowShareInHistory(!!d.showShareInHistory);if(d.confirmButtonColor)setConfirmButtonColor(d.confirmButtonColor);if(d.historySortDate)setHistorySortDate(d.historySortDate);if(d.historySortDirection)setHistorySortDirection(d.historySortDirection);if(d.appuntiDocuments)setAppuntiDocuments(d.appuntiDocuments);if(d.appuntiNotes)setAppuntiNotes(d.appuntiNotes);if(d.bankCoords)setBankCoords(d.bankCoords);if(d.aiDataAccess)setAiDataAccess(d.aiDataAccess);setToast("Backup ripristinato");}
    function handleBackupJsonFile(e){var f=e.target.files&&e.target.files[0];if(!f)return;e.target.value="";var r=new FileReader();r.onload=function(ev){try{var d=JSON.parse(String(ev.target.result||"{}"));var summary=countBackupItems(d);var ok=window.confirm(L("Stai per ripristinare questo backup.\nVoci che verranno importate: ")+summary+L(".\n\nContinuare?"));if(!ok)return;applyBackupData(d);}catch(err){setToast({text:"File JSON non valido",type:"error",icon:"🚫",color:"#E24B4A"});}};r.readAsText(f);} 

    if(settingsPage==="delete")return <div><PageHeader title="Dati"/>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:textC,marginBottom:4}}>📥 {L("Importa dati")}</div>
          <div style={{fontSize:13,color:subC,marginBottom:14}}>{L("CSV o Excel (.xlsx)")}</div>
          <ImportData/>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:"#E24B4A",marginBottom:4}}>🗑 {L("Elimina dati")}</div>
          <DeleteDataPanel/>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:textC,marginBottom:4}}>📤 {L("Esporta dati")}</div>
          <div style={{fontSize:13,color:subC,marginBottom:14}}>{L("Esporta separatamente uscite ed entrate in CSV o Excel")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2, minmax(0, 1fr))",gap:10,alignItems:"center"}}>
            <Btn onClick={function(){exportToCSV(expenses,[],cats,methods,dateFmt,function(){setToast("File CSV uscite pronto");},"fainance_uscite.csv");}} bg={expenseColor} style={{padding:"10px 12px",fontSize:13,fontWeight:700,width:"100%"}}>{L("CSV Uscite")}</Btn>
            <Btn onClick={function(){exportToCSV([],incomes,cats,methods,dateFmt,function(){setToast("File CSV entrate pronto");},"fainance_entrate.csv");}} bg={incomeColor} style={{padding:"10px 12px",fontSize:13,fontWeight:700,width:"100%"}}>{L("CSV Entrate")}</Btn>
            <Btn onClick={function(){exportToXLSX(expenses,[],cats,methods,dateFmt,function(){setToast("File Excel uscite pronto");},"fainance_uscite.xlsx");}} bg={expenseColor} style={{padding:"10px 12px",fontSize:13,fontWeight:700,width:"100%"}}>{L("Excel Uscite")}</Btn>
            <Btn onClick={function(){exportToXLSX([],incomes,cats,methods,dateFmt,function(){setToast("File Excel entrate pronto");},"fainance_entrate.xlsx");}} bg={incomeColor} style={{padding:"10px 12px",fontSize:13,fontWeight:700,width:"100%"}}>{L("Excel Entrate")}</Btn>
            <Btn onClick={function(){androidDownload("fainance_debiti_crediti_"+todayStr()+".json",new Blob([JSON.stringify({debtCredits:debtCredits||[],showDebtCreditsInPatrimonio,showDebtCreditsInExpenses},null,2)],{type:"application/json"}),function(){setToast(L("File JSON Debiti / Crediti pronto"));});}} bg="#7F77DD" style={{padding:"10px 12px",fontSize:13,fontWeight:700,width:"100%"}}>{L("JSON Debiti / Crediti")}</Btn>
            <Btn onClick={function(){androidDownload("fainance_spesa_"+todayStr()+".json",new Blob([JSON.stringify({shoppingCards:shoppingCards||[],shoppingItems:shoppingItems||[],shoppingAreas:shoppingAreas||[],shoppingAreaIcons:shoppingAreaIcons||{},shoppingBoughtColor,shoppingDefaultArea,shoppingLists:backupLocalJson("shopping_lists_v2",[]),activeShoppingListId:backupLocalJson("shopping_active_list_id_v2","main")},null,2)],{type:"application/json"}),function(){setToast(L("File JSON Spesa pronto"));});}} bg="#EF9F27" style={{padding:"10px 12px",fontSize:13,fontWeight:700,width:"100%"}}>{L("JSON Spesa")}</Btn>
            <Btn onClick={function(){androidDownload("fainance_patrimonio_"+todayStr()+".json",new Blob([JSON.stringify({patrimonioValues:patrimonioValues||{},patrimonioAreas:patrimonioAreas||[],patrimonioEntries:patrimonioEntries||[],patrimonioHistory:patrimonioHistory||{},patrimonioNotes:patrimonioNotes||{}},null,2)],{type:"application/json"}),function(){setToast(L("File JSON Patrimonio pronto"));});}} bg="#8F7DE8" style={{padding:"10px 12px",fontSize:13,fontWeight:700,width:"100%"}}>{L("JSON Patrimonio")}</Btn>
            <Btn onClick={function(){androidDownload("fainance_budget_"+todayStr()+".json",new Blob([JSON.stringify({budgetPlan:budgetPlan||{}},null,2)],{type:"application/json"}),function(){setToast(L("File JSON Budget pronto"));});}} bg="#4FAF8A" style={{padding:"10px 12px",fontSize:13,fontWeight:700,width:"100%"}}>{L("JSON Budget")}</Btn>
            <div style={{gridColumn:"1 / -1",fontSize:12,color:subC}}>{expenses.length} {L("uscite")} · {incomes.length} {L("entrate")} · {(debtCredits||[]).length} {L("debiti/crediti")} · {((shoppingItems||[]).length+(shoppingCards||[]).length)} {L("elementi spesa")}</div>
          </div>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:textC,marginBottom:4}}>💾 {L("Backup JSON completo")}</div>
          <div style={{fontSize:13,color:subC,marginBottom:14}}>{L("Esporta tutto il contenuto dell’app in un file JSON")}</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Btn onClick={function(){var data=buildBackupPayload();androidDownload("fainance_backup_"+todayStr()+".json",new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),function(){setToast("Backup pronto");});}} bg="#7F77DD" style={{padding:"10px 18px",fontSize:14,fontWeight:500}}>⬇️ {L("Scarica backup")}</Btn>
            <label style={{display:"inline-flex",alignItems:"center",background:dark?"#333":"#f0f0f0",color:dark?"#eee":"#444",borderRadius:btnRadius,padding:"10px 18px",fontSize:14,fontWeight:500,cursor:"pointer"}}>
              ⬆️ {L("Ripristina JSON")}
              <input type="file" accept=".json" style={{display:"none"}} onChange={handleBackupJsonFile}/>
            </label>
          </div>
        </div>
      </div>
    </div>;

    
    function SupportSettingsPage(){
      var [showContactForm,setShowContactForm]=useState(false);
      function openExternal(url){try{if(window&&window.open){window.open(url,"_blank");return;}}catch(e){}try{window.location.href=url;}catch(e2){setToast(L("Link supporto non disponibile"));}}
      return <div><PageHeader title="Supporto"/>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,overflow:"hidden"}}>
            {[
              {icon:"🌐",label:"FAQ sul sito web",desc:"Apri le FAQ ufficiali su fainanceapp.it",action:function(){openExternal("https://fainanceapp.it/it/faq-ita/");},badge:"Apri"},
              {icon:"🌐",label:"Sito web ufficiale",desc:"fainanceapp.it",action:function(){openExternal("https://fainanceapp.it/");},badge:"Apri"},
              {icon:"✉️",label:"Contattaci",desc:"Apri il form di contatto interno",action:function(){setShowContactForm(function(v){return !v;});},badge:"Form"}
            ].map(function(item,i,arr){return <button key={i} onClick={item.action} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px 20px",border:"none",borderBottom:i<arr.length-1?"1px solid "+borderC:"none",background:cardBg,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:24,width:36,textAlign:"center"}}>{item.icon}</span><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:textC}}>{L(item.label)}</div><div style={{fontSize:12,color:subC,marginTop:1}}>{L(item.desc)}</div></div><span style={{fontSize:12,background:"#e8f4ff",color:"#1a5fa8",borderRadius:20,padding:"3px 10px",fontWeight:500,flexShrink:0}}>{L(item.badge)}</span>
            </button>;})}
          </div>
          {showContactForm&&<ContactForm currentUser={currentUser}/>}
          <div style={{background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:12,color:subC}}>fAInance v1.2.4</span><span style={{fontSize:11,background:"#f0f0f0",color:"#888",borderRadius:20,padding:"2px 10px"}}>{planLabel(currentPlan,lang)}</span></div>
        </div>
      </div>;
    }

    if(settingsPage==="support")return <SupportSettingsPage/>;

    if(settingsPage==="terms_conditions")return <div><PageHeader title="Info app / Termini di utilizzo"/><TermsAndConditionsContent/></div>;
    if(settingsPage==="privacy_policy")return <div><PageHeader title="Info app / Informativa Privacy"/><PrivacyPolicyContent/></div>;

    function InfoSettingsPage(){
      var APP_VERSION="1.6.5";
      var APP_VERSION_CODE=142;
      var APP_WEBSITE="https://fainance.app";
      var PLAY_STORE_WEB_URL="https://play.google.com/store/apps/details?id=it.fainanceapp.app";
      var PLAY_STORE_MARKET_URL="market://details?id=it.fainanceapp.app";
      var [updateStatus,setUpdateStatus]=useState(null);
      var [updateInfo,setUpdateInfo]=useState(null);
      function checkForUpdates(){
        setUpdateStatus("playstore");
        try{
          if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){
            window.location.href=PLAY_STORE_MARKET_URL;
            setTimeout(function(){try{window.open(PLAY_STORE_WEB_URL,"_blank");}catch(e){}},700);
          }else{
            window.open(PLAY_STORE_WEB_URL,"_blank");
          }
        }catch(e){
          try{window.open(PLAY_STORE_WEB_URL,"_blank");}catch(e2){}
        }
      }
      return <div><PageHeader title="Info"/>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* App identity */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:24,textAlign:"center"}}>
            <div style={{background:dark?"#fff":"transparent",borderRadius:dark?14:0,padding:dark?14:0,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:10,boxShadow:dark?"0 8px 28px rgba(0,0,0,0.25)":"none"}}><img src={appBanner} alt="fAInance" style={{width:"100%",maxWidth:300,height:"auto",objectFit:"contain",display:"block"}}/></div>
            <div style={{fontSize:13,color:subC,marginBottom:2}}>Versione {APP_VERSION}</div>
            <div style={{fontSize:11,color:subC,marginTop:4,fontStyle:"italic"}}>{L("Your AI-powered finance tracker")}</div>
          </div>

          {/* Termini e Privacy */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <button onClick={function(){setSettingsPage("terms_conditions");}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left",marginBottom:14}}>
              <span style={{fontSize:24}}>📄</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:textC}}>Termini di utilizzo</div><div style={{fontSize:12,color:subC}}>Consulta ambito dell’app, limiti dell’Agente AI e responsabilità utente.</div></div>
              <span style={{fontSize:18,color:subC}}>›</span>
            </button>
            <div style={{height:1,background:borderC,marginBottom:14}}/>
            <button onClick={function(){setSettingsPage("privacy_policy");}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left"}}>
              <span style={{fontSize:24}}>🔐</span>
              <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,color:textC}}>Informativa Privacy</div><div style={{fontSize:12,color:subC}}>Consulta dati salvati, sincronizzazione, Firebase e uso dell’Agente AI.</div></div>
              <span style={{fontSize:18,color:subC}}>›</span>
            </button>
          </div>

          {/* Aggiornamenti OTA */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
            <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:4}}>{"🔄 "+translateUiRuntimeText("Aggiornamenti")}</div>
            <div style={{fontSize:12,color:subC,marginBottom:14}}>Versione installata: <strong>{APP_VERSION}</strong></div>
            {updateStatus==="playstore"&&<div style={{background:dark?"#1a2a1e":"#edfaf3",borderRadius:10,padding:"12px 16px",marginBottom:12,border:"1px solid #1D9E75",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>✅</span>
              <span style={{fontSize:13,color:"#1D9E75",fontWeight:500}}>{L("Si aprirà la pagina dello store di fAInance per verificare eventuali aggiornamenti.")}</span>
            </div>}
            <button onClick={checkForUpdates} disabled={updateStatus==="checking"} style={{width:"100%",background:dark?"#252535":"#f5f5f5",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"11px",fontSize:14,cursor:updateStatus==="checking"?"not-allowed":"pointer",fontWeight:500,opacity:updateStatus==="checking"?0.6:1}}>
              {L("Apri store")}
            </button>
          </div>

          {/* Piano */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:14}}>
              <div><div style={{fontSize:14,fontWeight:800,color:textC,marginBottom:3}}>💎 {L("Piano")}</div><div style={{fontSize:12,color:subC}}>{L("Scorri lateralmente per confrontare tutti i dettagli dei piani.")}</div></div>
              <span style={{background:dark?"#24213a":"#F0EDFF",color:dark?"#BEB8FF":"#534AB7",border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:800}}>{planLabel(currentPlan,lang)}</span>
            </div>
            <div style={{display:"flex",gap:6,background:dark?"#252535":"#f5f5f5",borderRadius:14,padding:4,marginBottom:12,width:"fit-content"}}>
              {[{id:"monthly",label:"Mensile"},{id:"yearly",label:"Annuale"}].map(function(item){var selected=planBillingPeriod===item.id;return <button key={item.id} onClick={function(){setPlanBillingPeriod(item.id);}} style={{border:"none",borderRadius:12,padding:"8px 14px",background:selected?"#7F77DD":"transparent",color:selected?"#fff":textC,fontSize:13,fontWeight:900,cursor:"pointer",boxShadow:selected?(dark?"none":"0 4px 12px rgba(127,119,221,.22)"):"none"}}>{L(item.label)}</button>;})}
            </div>
            <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:8,scrollSnapType:"x mandatory"}}>
              {PLAN_IDS.map(function(pid){
                var active=currentPlan===pid;
                var lim=PLAN_LIMITS[pid]||PLAN_LIMITS.free;
                var price=PLAN_PRICES[pid]||PLAN_PRICES.free;
                var day=L("giorno"), month=L("mese"), ad=L("annuncio"), extra=L("extra"), withAd=L("con annuncio");
                function limTxt(v){return v===Infinity?L("illimitati"):String(v);}
                function limFem(v){return v===Infinity?L("illimitate"):String(v);}
                function perDay(v){return v+"/"+day;}
                function perMonth(v){return v+"/"+month;}
                function plusAd(n){return n?(" + "+n+" "+withAd):"";}
                function copyPatrimonioLabel(){return lim.patrimonioCopyMonthly===Infinity?L("illimitate"):(String(lim.patrimonioCopyMonthly)+" "+L("al mese")+plusAd(lim.rewardedExtraPatrimonioCopy));}
                var details=[
                  ["Entrate e Uscite semplici",limFem(lim.dailySingleMovements)+plusAd(lim.rewardedExtraMovements)+"/"+day],
                  ["Entrate e Uscite Multiple",pid==="premium"?L("illimitate"):((pid==="base"?"2":"1")+" "+L("al mese")+" ("+L("massimo")+" "+(pid==="base"?"15":"10")+" "+L("spese alla volta")+")")],
                  ["Entrate e Uscite Ricorrenti",lim.recurringMovements===Infinity?L("illimitate"):String(lim.recurringMovements)],
                  ["Entrate e Uscite Rateizzate",pid==="premium"?L("Scegli il numero"):(pid==="free"?L("2 opzioni"):L("4 opzioni"))],
                  ["Scontrini",limTxt(lim.dailyReceiptScans)+plusAd(lim.rewardedExtraReceiptScans)+"/"+day],
                  ["Voce",limTxt(lim.dailyVoiceEntries)+plusAd(lim.rewardedExtraVoiceEntries)+"/"+day],
                  ["Share Progetti",limTxt(lim.shareProjects)],
                  ["Share Spese",limTxt(lim.shareDailyExpenses)+plusAd(lim.rewardedExtraShareDailyExpenses)+"/"+day],
                  ["Share Scontrini",limTxt(lim.shareReceiptScans)+"/"+day],
                  ["Debiti / Crediti",lim.debtCredits===0?L("dal piano Base"):limTxt(lim.debtCredits)],
                  ["Carte Spesa",limTxt(lim.shoppingCards)],
                  ["Lista della spesa",limTxt(lim.shoppingListItems)],
                  ["Budget",L("completo")],
                  ["Patrimonio copia",copyPatrimonioLabel()],
                  ["Obiettivi",limTxt(lim.goals)],
                  ["Appunti",limTxt(lim.notes)],
                  ["Coordinate bancarie",limTxt(lim.bankNotes)],
                  ["Documenti",lim.documents===0?L("no"):(lim.documents===Infinity?L("illimitati"):String(lim.documents))],
                  ["Alert",limTxt(lim.alerts)],
                  ["AI Consigli",limTxt(lim.aiMonthlyTips)],
                  ["AI Risposte",pid==="premium"?L("illimitate"):(limTxt(lim.aiDailyReplies)+plusAd(lim.rewardedExtraAiReplies)+"/"+day)],
                  ["Statistiche",L(lim.statsLevel)],
                  ["Impostazioni",L(lim.settingsLevel)],
                  ["Widget",limTxt(lim.widgets)],
                  ["Annunci",lim.ads?L("sì"):L("no")]
                ];
                return <div key={pid} style={{minWidth:isMobile?280:320,scrollSnapAlign:"start",background:active?(dark?"#1a2a1e":"#edfaf3"):(dark?"#252535":"#fff"),border:"2px solid "+(active?"#1D9E75":borderC),borderRadius:18,padding:"16px 16px",boxShadow:active?(dark?"none":"0 8px 24px rgba(29,158,117,0.18)"):"none"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}}><div><div style={{fontSize:18,fontWeight:900,color:active?"#1D9E75":textC}}>{planLabel(pid,lang)}</div><div style={{fontSize:12,color:subC,marginTop:3}}>{price.monthly===0?"0 €":price.monthly+" €/"+L("mese")} · {price.yearly===0?"0 €":price.yearly+" €/"+L("anno")}</div><div style={{fontSize:12,color:pid==="free"?subC:"#7F77DD",fontWeight:800,marginTop:5}}>{pid==="free"?L("Gratis sempre disponibile"):L("Pagamento")+": "+(planBillingPeriod==="yearly"?(price.yearly+" €/"+L("anno")):price.monthly+" €/"+L("mese"))}</div></div>{active&&<span style={{fontSize:11,fontWeight:900,color:"#1D9E75",background:"#1D9E7522",borderRadius:12,padding:"3px 8px"}}>{L("ATTIVO")}</span>}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:310,overflowY:"auto",paddingRight:3}}>{details.map(function(row){return <div key={row[0]} style={{display:"flex",justifyContent:"space-between",gap:10,borderBottom:"1px solid "+(dark?"#333":"#f0f0f0"),padding:"5px 0"}}><span style={{fontSize:12,color:subC}}>{L(row[0])}</span><span style={{fontSize:12,color:textC,fontWeight:800,textAlign:"right"}}>{L(row[1])}</span></div>;})}</div>
                  <button onClick={function(){if(active)return;purchasePlan(pid);}} disabled={active||!!planPurchaseLoading} style={{width:"100%",marginTop:12,background:active?"#1D9E75":"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"11px",fontSize:13,fontWeight:900,cursor:(active||!!planPurchaseLoading)?"not-allowed":"pointer",opacity:(active||!!planPurchaseLoading)?0.8:1}}>{L(active?"Piano selezionato":(planPurchaseLoading===(pid+":"+(planBillingPeriod==="yearly"?"yearly":"monthly"))?"Acquisto in corso...":(pid==="free"?"Passa a Gratis":"Acquista piano")))}</button>
                </div>;
              })}
            </div>
            <div style={{fontSize:11,color:subC,marginTop:10,lineHeight:1.45}}>{L("Gli acquisti Base e Completo vengono gestiti tramite lo store del dispositivo. Se l'acquisto viene annullato o non va a buon fine, il piano resta invariato.")}</div>
            <button onClick={restorePurchases} disabled={!!planPurchaseLoading} style={{marginTop:10,background:dark?"#252535":"#F3F4FF",color:dark?"#D6D1FF":"#5A52B8",border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),borderRadius:btnRadius,padding:"9px 12px",fontSize:12,fontWeight:900,cursor:planPurchaseLoading?"not-allowed":"pointer",opacity:planPurchaseLoading?0.7:1}}>{L(planPurchaseLoading==="restore"?"Ripristino in corso...":"Ripristina acquisti")}</button>
          </div>

          {/* Rating */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <button onClick={function(){window.open("https://play.google.com","_blank");}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,background:"none",border:"none",cursor:"pointer",padding:0}}>
              <span style={{fontSize:24}}>⭐</span>
              <div style={{textAlign:"left"}}><div style={{fontSize:14,fontWeight:600,color:textC}}>Vota sullo store</div><div style={{fontSize:12,color:subC}}>Se ti piace l'app, lasciaci una recensione!</div></div>
              <span style={{marginLeft:"auto",fontSize:16,color:subC}}>›</span>
            </button>
          </div>

          {/* Build info */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:12,color:subC,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Informazioni tecniche</div>
            {[["Versione",APP_VERSION],["Build","2026.05"],["Piattaforma","Android"],["Storage","localStorage"]].map(function(row){return <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:13,color:subC}}>{row[0]}</span><span style={{fontSize:13,color:textC,fontWeight:500}}>{row[1]}</span></div>;})}
          </div>
          <div style={{fontSize:11,color:subC,textAlign:"center",padding:"8px 0"}}>© 2026 fAInance · Tutti i diritti riservati</div>
        </div>
      </div>;
    }

    if(settingsPage==="info")return <InfoSettingsPage/>;
  }



  function DebtCreditsPanel(){
    function L(s){return translateUiRuntimeText(s);}
    var debtBaseAllowed=currentPlan==="base"||currentPlan==="premium";
    var [kind,setKind]=useState("debt");
    var [holder,setHolder]=useState("");
    var [amount,setAmount]=useState("");
    var [startDate,setStartDate]=useState(todayStr());
    var [endDate,setEndDate]=useState("");
    var [note,setNote]=useState("");
    var [selectedId,setSelectedId]=useState(null);
    var [editingId,setEditingId]=useState(null);
    var [txAmount,setTxAmount]=useState("");
    var [txType,setTxType]=useState("reduction");
    var [txDate,setTxDate]=useState(todayStr());
    var [txStart,setTxStart]=useState(todayStr());
    var [txEnd,setTxEnd]=useState("");
    var [txNote,setTxNote]=useState("");
    var [showTxForm,setShowTxForm]=useState(false);
    var [showDebtForm,setShowDebtForm]=useState(false);
    var [editingTxId,setEditingTxId]=useState("");
    var sinp={...inp,width:"100%",boxSizing:"border-box"};
    var labelStyle={fontSize:11,fontWeight:900,color:subC,margin:"0 0 5px 2px",textTransform:"uppercase",letterSpacing:.3};
    function field(label,child){return <div style={{display:"flex",flexDirection:"column",gap:0}}><label style={labelStyle}>{L(label)}</label>{child}</div>;}
    function balance(item){var v=Number(item.initialAmount||0);(item.transactions||[]).forEach(function(tx){var a=Number(tx.amount||0);v+=tx.action==="increase"?a:-a;});return Math.max(0,Math.round(v*100)/100);}
    function selected(){return (debtCredits||[]).find(function(x){return String(x.id)===String(selectedId);})||null;}
    function resetForm(){setEditingId(null);setKind("debt");setHolder("");setAmount("");setStartDate(todayStr());setEndDate("");setNote("");setShowDebtForm(false);}
    function openItem(item){setSelectedId(item.id);setShowTxForm(false);setEditingTxId("");setTxType("reduction");setTxDate(todayStr());setTxStart(item.startDate||todayStr());setTxEnd(item.estimatedEndDate||"");setTxAmount("");setTxNote("");}
    async function pickContact(){
      try{
        var cap=(window as any).Capacitor;
        var contacts=cap&&cap.Plugins&&cap.Plugins.Contacts;
        if(contacts&&contacts.pickContact){
          var picked=await contacts.pickContact({projection:{name:true,phones:true,emails:true}});
          var pc=picked&&((picked.contact)||(picked.contacts&&picked.contacts[0])||picked);
          var name=(pc&&pc.name&&((pc.name.display)||(Array.isArray(pc.name)?pc.name[0]:pc.name)))||(pc&&pc.displayName)||(pc&&pc.fullName)||"";
          if(name){setHolder(name);setToast({text:L("Contatto importato dalla rubrica"),type:"success",icon:"📇"});return;}
        }
        if(contacts&&contacts.getContacts){
          var list=await contacts.getContacts({projection:{name:true,phones:true,emails:true}});
          var arr=(list&&list.contacts)||[];
          if(arr.length){
            var names=arr.map(function(c){return (c.name&&c.name.display)||c.displayName||c.fullName||(c.emails&&c.emails[0]&&c.emails[0].address)||(c.phones&&c.phones[0]&&c.phones[0].number)||"";}).filter(Boolean);
            var chosen=names.length===1?names[0]:window.prompt(L("Scrivi il nome del contatto da usare"),names[0]||"");
            if(chosen){setHolder(chosen);setToast({text:L("Contatto importato dalla rubrica"),type:"success",icon:"📇"});return;}
          }
        }
        setToast({text:L("Rubrica non disponibile. Inserisci il titolare manualmente."),type:"warning",color:"#FFF8E1",icon:"📇",textColor:"#856404"});
      }catch(e){setToast({text:L("Impossibile leggere la rubrica. Inserisci il titolare manualmente."),type:"warning",color:"#FFF8E1",icon:"📇",textColor:"#856404"});}
    }
    function saveItem(){
      if(!debtBaseAllowed){setToast({text:L("Debiti / Crediti disponibili dal piano Base."),type:"error",color:"#E24B4A",icon:"🚫"});return;}
      var a=parseMoney(amount);if(!holder.trim()||!a){setToast({text:L("Inserisci titolare e importo."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}
      if(editingId){
        setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(editingId)?{...x,kind:kind,holder:holder.trim(),initialAmount:a,startDate:startDate||todayStr(),estimatedEndDate:endDate||"",note:note.trim(),updatedAt:new Date().toISOString()}:x;});});
        setSelectedId(editingId);setToast({text:L("Debito / Credito aggiornato"),type:"success",icon:"✅"});resetForm();return;
      }
      var item={id:"dc_"+Date.now(),kind:kind,holder:holder.trim(),initialAmount:a,startDate:startDate||todayStr(),estimatedEndDate:endDate||"",note:note.trim(),transactions:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      setDebtCredits(function(list){return [item].concat(list||[]);});setSelectedId(item.id);setToast({text:L("Debito / Credito salvato"),type:"success",icon:"✅"});resetForm();
    }
    function deleteItem(id){if(!window.confirm(L("Eliminare questo Debito / Credito?")))return;setDebtCredits(function(list){return (list||[]).filter(function(x){return String(x.id)!==String(id);});});if(String(selectedId)===String(id))setSelectedId(null);if(String(editingId)===String(id))resetForm();setToast({text:L("Debito / Credito eliminato"),type:"success",icon:"🗑️"});}
    function editItem(item){setKind(item.kind||"debt");setHolder(item.holder||"");setAmount(String(item.initialAmount||""));setStartDate(item.startDate||todayStr());setEndDate(item.estimatedEndDate||"");setNote(item.note||"");setEditingId(item.id);setSelectedId(null);setShowTxForm(false);setShowDebtForm(true);}
    function saveTx(){var item=selected();if(!item)return;var a=parseMoney(txAmount);if(!a){setToast({text:L("Inserisci l'importo della transazione."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}if(editingTxId&&!window.confirm(L("Confermi la modifica?")))return;var tx={id:editingTxId||("tx_"+Date.now()),action:txType==="increase"?"increase":"reduction",amount:a,date:txDate||todayStr(),startDate:txStart||item.startDate||todayStr(),estimatedEndDate:txEnd||item.estimatedEndDate||"",note:txNote.trim(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};setDebtCredits(function(list){return (list||[]).map(function(x){if(String(x.id)!==String(item.id))return x;var txs=(x.transactions||[]);return {...x,transactions:editingTxId?txs.map(function(t){return String(t.id)===String(editingTxId)?{...t,...tx}:t;}):[tx].concat(txs),updatedAt:new Date().toISOString()};});});setTxAmount("");setTxNote("");setEditingTxId("");setShowTxForm(false);setToast({text:L(editingTxId?"Transazione modificata":"Transazione Debito / Credito salvata"),type:"success",icon:"✅"});}
    function deleteTx(itemId,txId){if(!window.confirm(L("Confermi la cancellazione?")))return;setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(itemId)?{...x,transactions:(x.transactions||[]).filter(function(t){return String(t.id)!==String(txId);}),updatedAt:new Date().toISOString()}:x;});});setToast({text:L("Cancellazione completata"),type:"success",icon:"🗑️"});}
    function editTx(tx){setEditingTxId(tx.id);setTxType(tx.action||"reduction");setTxAmount(String(tx.amount||""));setTxDate(tx.date||todayStr());setTxStart(tx.startDate||todayStr());setTxEnd(tx.estimatedEndDate||"");setTxNote(tx.note||"");setShowTxForm(true);}
    function closeItem(item){var b=balance(item);if(b<=0)return;if(!window.confirm(L(item.kind==="debt"?"Chiudere questo Debito?":"Chiudere questo Credito?")))return;var tx={id:"tx_"+Date.now(),action:"reduction",amount:b,date:todayStr(),startDate:item.startDate||todayStr(),estimatedEndDate:item.estimatedEndDate||"",note:L(item.kind==="debt"?"Debito chiuso":"Credito chiuso"),createdAt:new Date().toISOString(),closing:true};setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(item.id)?{...x,transactions:[tx].concat(x.transactions||[]),closedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:x;});});setShowTxForm(false);setToast({text:L(item.kind==="debt"?"Debito chiuso":"Credito chiuso"),type:"success",icon:"✅"});}
    function reportPatrimonio(item){var val=balance(item)*(item.kind==="debt"?-1:1);var id="dc_"+item.id;setPatrimonioEntries(function(list){var exists=(list||[]).some(function(e){return e.id===id;});if(exists)return list;return (list||[]).concat([{id:id,name:(item.kind==="debt"?L("Debito"):L("Credito"))+" - "+item.holder,icon:item.kind==="debt"?"📉":"📈",color:item.kind==="debt"?"#E24B4A":"#1D9E75",group:"altro"}]);});setPatrimonioValues(function(v){var next={...(v||{})};if(!next[curMonthKey])next[curMonthKey]={};next[curMonthKey][id]=val;return next;});setToast({text:L("Debito / Credito riportato nel patrimonio"),type:"success",icon:"💎"});}
    function reportMovement(item){var a=balance(item);if(!a)return;var desc=(item.kind==="debt"?L("Debito"):L("Credito"))+" - "+item.holder;if(item.kind==="debt"){addExpenses([{id:Date.now(),amount:a,catId:(cats&&cats[0]&&cats[0].id)||1,methodId:(methods&&methods[0]&&methods[0].id)||1,desc:desc,date:todayStr()}],"manual");}else{addIncomes([{id:Date.now(),amount:a,typeId:(incomeTypes&&incomeTypes[0]&&incomeTypes[0].id)||"stipendio",desc:desc,date:todayStr()}],"manual");}setToast({text:L("Debito / Credito riportato nei movimenti"),type:"success",icon:"💸"});}
    var sel=selected();
    if(sel){return <div style={{display:"flex",flexDirection:"column",gap:14}}><button onClick={function(){setSelectedId(null);setShowTxForm(false);setEditingTxId("");}} style={{alignSelf:"flex-start",background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>‹ {L("Indietro")}</button><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:balance(sel)<=0?(dark?"#202024":"#f2f2f2"):(dark?"#252535":"#F8FAFC"),border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><div style={{fontSize:18,fontWeight:900,color:textC}}>{sel.kind==="debt"?"📉":"📈"} {sel.holder}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L(sel.kind==="debt"?"Debito":"Credito")} · {L("Saldo attuale")}: <b style={{color:balance(sel)<=0?incomeColor:textC}}>{fmt(balance(sel))}</b> {balance(sel)<=0&&<b style={{color:incomeColor}}> · {L("Estinto")}</b>}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L("Data inizio")}: {sel.startDate||"-"} · {L("Fine stimata")}: {sel.estimatedEndDate||"-"}</div>{sel.note&&<div style={{fontSize:12,color:subC,marginTop:4}}>{sel.note}</div>}</div><button onClick={function(){editItem(sel);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>✏️</button></div></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{balance(sel)>0&&<button onClick={function(){setEditingTxId("");setTxType("reduction");setTxAmount("");setTxDate(todayStr());setTxStart(sel.startDate||todayStr());setTxEnd(sel.estimatedEndDate||"");setTxNote("");setShowTxForm(function(v){return !v;});}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>＋ {L("Aggiungi transazione")}</button>}{balance(sel)>0&&<button onClick={function(){closeItem(sel);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>✅ {L(sel.kind==="debt"?"Chiudi Debito":"Chiudi Credito")}</button>}{showDebtCreditsInPatrimonio&&<button onClick={function(){reportPatrimonio(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💎 {L("Riporta nel patrimonio")}</button>}{showDebtCreditsInExpenses&&<button onClick={function(){reportMovement(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💸 {L("Riporta nei movimenti")}</button>}</div>{balance(sel)>0&&showTxForm&&<div style={{background:dark?"#1f2333":"#FAFBFF",border:"1px solid "+borderC,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 120px 140px",gap:8}}>{field("Tipo transazione",<select value={txType} onChange={function(e){setTxType(e.target.value);}} style={sinp}><option value="reduction">{L(sel.kind==="debt"?"Riduzione del Debito":"Riduzione del Credito")}</option><option value="increase">{L(sel.kind==="debt"?"Aumento del debito":"Aumento del Credito")}</option></select>)}{field("Importo",<input value={txAmount} onChange={function(e){setTxAmount(e.target.value);}} inputMode="decimal" placeholder={L("Importo")} style={sinp}/>)}{field("Data transazione",<input type="date" value={txDate} onChange={function(e){setTxDate(e.target.value);}} style={sinp}/>)}{field("Data inizio",<input type="date" value={txStart} onChange={function(e){setTxStart(e.target.value);}} style={sinp}/>)}{field("Data stimata fine",<input type="date" value={txEnd} onChange={function(e){setTxEnd(e.target.value);}} style={sinp}/>)}{field("Commento",<input value={txNote} onChange={function(e){setTxNote(e.target.value);}} placeholder={L("Commento")} style={sinp}/>)}<button onClick={saveTx} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:"pointer"}}>＋ {L(editingTxId?"Salva modifica":"Aggiungi transazione")}</button>{editingTxId&&<button onClick={function(){setEditingTxId("");setShowTxForm(false);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:"pointer"}}>{L("Annulla")}</button>}</div>}<div>{(sel.transactions||[]).map(function(tx){return <div key={tx.id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid "+borderC,borderRadius:10,padding:"8px 10px",marginBottom:6,background:dark?"#252535":"#fff"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:900,color:tx.action==="increase"?expenseColor:incomeColor}}>{tx.action==="increase"?"＋":"−"} {fmt(tx.amount)} · {tx.date||""}</div><div style={{fontSize:11,color:subC}}>{L("Inizio")}: {tx.startDate||"-"} · {L("Fine stimata")}: {tx.estimatedEndDate||"-"}{tx.note?" · "+tx.note:""}</div></div><button onClick={function(){editTx(tx);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>✏️</button><button onClick={function(){deleteTx(sel.id,tx.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>🗑️</button></div>;})}{!(sel.transactions||[]).length&&<div style={{fontSize:13,color:subC}}>{L("Nessuna transazione inserita")}</div>}</div></div></div></div>;}
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:debtBaseAllowed?cardBg:(dark?"#342b16":"#FFF8E1"),border:"1px solid "+(debtBaseAllowed?borderC:"#FFD54F"),borderRadius:16,padding:16}}>
        <div style={{fontSize:18,fontWeight:900,color:textC,marginBottom:4}}>💳 {L("Debiti / Crediti")}</div>
        <div style={{fontSize:12,color:subC,marginBottom:12}}>{L("Registra debiti e crediti, aggiorna il saldo con transazioni e riportali in patrimonio o nei movimenti.")}</div>
        {!debtBaseAllowed&&<div style={{fontSize:12,color:dark?"#ffd58a":"#856404",marginBottom:12,fontWeight:700}}>🚫 {L("Disponibile dal piano Base.")}</div>}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3, minmax(0, 1fr))",gap:10,marginTop:12}}>
          <div style={{background:dark?"#252535":"#F8FAFC",border:"1px solid "+borderC,borderRadius:14,padding:12}}>
            <div style={{fontSize:11,color:subC,fontWeight:800,textTransform:"uppercase"}}>{L("Totale Debiti")}</div>
            <div style={{fontSize:18,fontWeight:900,color:expenseColor}}>{fmt((debtCredits||[]).filter(function(x){return x.kind==="debt";}).reduce(function(a,x){return a+balance(x);},0))}</div>
          </div>
          <div style={{background:dark?"#252535":"#F8FAFC",border:"1px solid "+borderC,borderRadius:14,padding:12}}>
            <div style={{fontSize:11,color:subC,fontWeight:800,textTransform:"uppercase"}}>{L("Totale Crediti")}</div>
            <div style={{fontSize:18,fontWeight:900,color:incomeColor}}>{fmt((debtCredits||[]).filter(function(x){return x.kind==="credit";}).reduce(function(a,x){return a+balance(x);},0))}</div>
          </div>
          <button onClick={function(){resetForm();setShowDebtForm(true);}} disabled={!debtBaseAllowed} style={{background:debtBaseAllowed?confirmButtonColor:"#ccc",color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px 14px",fontWeight:900,cursor:debtBaseAllowed?"pointer":"not-allowed"}}>＋ {L("Aggiungi Debito o Credito")}</button>
        </div>
        {(showDebtForm||editingId)&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"150px 1fr 130px 150px",gap:10}}>
          {field("Tipo",<select value={kind} onChange={function(e){setKind(e.target.value);}} style={sinp}><option value="debt">{L("Debito")}</option><option value="credit">{L("Credito")}</option></select>)}
          {field("Titolare",<div style={{display:"flex",gap:6}}><input value={holder} onChange={function(e){setHolder(e.target.value);}} placeholder={L("Nome titolare")} style={sinp}/><button onClick={pickContact} title={L("Cerca nella rubrica")} style={{border:"1px solid "+borderC,borderRadius:10,background:dark?"#252535":"#fff",color:textC,padding:"0 12px",cursor:"pointer"}}>📇</button></div>)}
          {field("Importo iniziale",<input value={amount} onChange={function(e){setAmount(e.target.value);}} placeholder={L("Importo")} inputMode="decimal" style={sinp}/>)}
          {field("Data inizio",<input type="date" value={startDate} onChange={function(e){setStartDate(e.target.value);}} style={sinp}/>)}
          {field("Data stimata fine",<input type="date" value={endDate} onChange={function(e){setEndDate(e.target.value);}} style={sinp}/>)}
          {field("Commento",<input value={note} onChange={function(e){setNote(e.target.value);}} placeholder={L("Commento")} style={sinp}/>)}
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}><button onClick={saveItem} disabled={!debtBaseAllowed} style={{background:debtBaseAllowed?confirmButtonColor:"#ccc",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontWeight:800,cursor:debtBaseAllowed?"pointer":"not-allowed",width:"100%"}}>＋ {L(editingId?"Salva modifica":"Aggiungi")}</button>{editingId&&<button onClick={resetForm} style={{background:dark?"#252535":"#f0f0f0",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 12px",fontWeight:800,cursor:"pointer"}}>{L("Annulla")}</button>}</div>
        </div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}>
          <div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Elenco Debiti / Crediti")}</div>
          {!(debtCredits||[]).length&&<div style={{fontSize:13,color:subC}}>{L("Nessun Debito / Credito inserito")}</div>}
          {(debtCredits||[]).map(function(item){var b=balance(item);var active=String(selectedId)===String(item.id);var extinct=b<=0;return <div key={item.id} onClick={function(){openItem(item);}} style={{border:"1px solid "+(active?confirmButtonColor:borderC),borderRadius:12,padding:10,marginBottom:8,background:extinct?(dark?"#202024":"#f2f2f2"):(active?(dark?"#252535":"#f7f5ff"):(dark?"#1e1e30":"#fff")),opacity:extinct?.62:1,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}><div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:900,color:textC,wordBreak:"break-word"}}>{item.kind==="debt"?"📉":"📈"} {item.holder}</div><div style={{fontSize:12,color:subC}}>{L(item.kind==="debt"?"Debito":"Credito")} · {L("Saldo")}: {fmt(b)} {extinct&&<span style={{marginLeft:6,fontWeight:900,color:incomeColor}}>· {L("Estinto")}</span>}</div></div><div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={function(e){e.stopPropagation();editItem(item);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>✏️</button><button onClick={function(e){e.stopPropagation();deleteItem(item.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>🗑️</button></div></div></div>;})}
        </div>
        <div style={{display:"none"}}>
          {!sel&&<div style={{fontSize:13,color:subC}}>{L("Seleziona un Debito / Credito per inserire transazioni.")}</div>}
          {sel&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:balance(sel)<=0?(dark?"#202024":"#f2f2f2"):(dark?"#252535":"#F8FAFC"),border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><div style={{fontSize:16,fontWeight:900,color:textC}}>{sel.kind==="debt"?"📉":"📈"} {sel.holder}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L(sel.kind==="debt"?"Debito":"Credito")} · {L("Saldo attuale")}: <b style={{color:balance(sel)<=0?incomeColor:textC}}>{fmt(balance(sel))}</b> {balance(sel)<=0&&<b style={{color:incomeColor}}> · {L("Estinto")}</b>}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L("Data inizio")}: {sel.startDate||"-"} · {L("Fine stimata")}: {sel.estimatedEndDate||"-"}</div>{sel.note&&<div style={{fontSize:12,color:subC,marginTop:4}}>{sel.note}</div>}</div><div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={function(){editItem(sel);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>✏️</button><button onClick={function(){setSelectedId(null);setShowTxForm(false);}} style={{border:"none",background:dark?"#333":"#f0f0f0",color:textC,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>×</button></div></div></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{balance(sel)>0&&<button onClick={function(){setShowTxForm(function(v){return !v;});}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>＋ {L("Aggiungi transazione")}</button>}{balance(sel)>0&&<button onClick={function(){closeItem(sel);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>✅ {L(sel.kind==="debt"?"Chiudi Debito":"Chiudi Credito")}</button>}{showDebtCreditsInPatrimonio&&<button onClick={function(){reportPatrimonio(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💎 {L("Riporta nel patrimonio")}</button>}{showDebtCreditsInExpenses&&<button onClick={function(){reportMovement(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💸 {L("Riporta nei movimenti")}</button>}</div>
            {balance(sel)>0&&showTxForm&&<div style={{background:dark?"#1f2333":"#FAFBFF",border:"1px solid "+borderC,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 120px 140px",gap:8}}>
              {field("Tipo transazione",<select value={txType} onChange={function(e){setTxType(e.target.value);}} style={sinp}><option value="reduction">{L(sel.kind==="debt"?"Riduzione del Debito":"Riduzione del Credito")}</option><option value="increase">{L(sel.kind==="debt"?"Aumento del debito":"Aumento del Credito")}</option></select>)}
              {field("Importo",<input value={txAmount} onChange={function(e){setTxAmount(e.target.value);}} inputMode="decimal" placeholder={L("Importo")} style={sinp}/>)}
              {field("Data transazione",<input type="date" value={txDate} onChange={function(e){setTxDate(e.target.value);}} style={sinp}/>)}
              {field("Data inizio",<input type="date" value={txStart} onChange={function(e){setTxStart(e.target.value);}} style={sinp}/>)}
              {field("Data stimata fine",<input type="date" value={txEnd} onChange={function(e){setTxEnd(e.target.value);}} style={sinp}/>)}
              {field("Commento",<input value={txNote} onChange={function(e){setTxNote(e.target.value);}} placeholder={L("Commento")} style={sinp}/>)}
              <button onClick={saveTx} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:"pointer"}}>＋ {L("Aggiungi transazione")}</button>
            </div>}
            <div>{(sel.transactions||[]).map(function(tx){return <div key={tx.id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid "+borderC,borderRadius:10,padding:"8px 10px",marginBottom:6,background:dark?"#252535":"#fff"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:900,color:tx.action==="increase"?expenseColor:incomeColor}}>{tx.action==="increase"?"＋":"−"} {fmt(tx.amount)} · {tx.date||""}</div><div style={{fontSize:11,color:subC}}>{L("Inizio")}: {tx.startDate||"-"} · {L("Fine stimata")}: {tx.estimatedEndDate||"-"}{tx.note?" · "+tx.note:""}</div></div><button onClick={function(){deleteTx(sel.id,tx.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>🗑️</button></div>;})}{!(sel.transactions||[]).length&&<div style={{fontSize:13,color:subC}}>{L("Nessuna transazione inserita")}</div>}</div>
          </div>}
        </div>
      </div>
    </div>;
  }


  function ShoppingPanel(){
    function L(s){return translateUiRuntimeText(s);}
    var todayIso=new Date().toISOString().slice(0,10);
    var [tabShop,setTabShop]=useStorage(userKey("shopping_active_tab_v1"),"list");
    var [newListTitle,setNewListTitle]=useState("");
    var [newListIcon,setNewListIcon]=useState("🧺");
    var [showNewListForm,setShowNewListForm]=useState(false);
    var [showItemForm,setShowItemForm]=useState(false);
    var [showProductForm,setShowProductForm]=useState(false);
    var [showProductSortMenu,setShowProductSortMenu]=useState(false);
    var [cardName,setCardName]=useState("");
    var [cardCode,setCardCode]=useState("");
    var [cardCodeType,setCardCodeType]=useState("barcode");
    var [cardColor,setCardColor]=useState("#0F9F76");
    var [itemName,setItemName]=useState("");
    var [itemArea,setItemArea]=useState(shoppingDefaultArea||"Alimenti");
    var [itemNote,setItemNote]=useState("");
    var [itemQty,setItemQty]=useState("1");
    var [itemUnit,setItemUnit]=useState("unità");
    var [productName,setProductName]=useState("");
    var [productArea,setProductArea]=useState(shoppingDefaultArea||"Alimenti");
    var [productNote,setProductNote]=useState("");
    var [productQty,setProductQty]=useState("1");
    var [productUnit,setProductUnit]=useState("unità");
    var [editingProductId,setEditingProductId]=useState("");
    var [editingCardId,setEditingCardId]=useState("");
    var [showCardCreateChoice,setShowCardCreateChoice]=useState(false);
    var [showCardManualForm,setShowCardManualForm]=useState(false);
    var [pendingScannedCard,setPendingScannedCard]=useState(null);
    var sinp={...inp,width:"100%",boxSizing:"border-box"};
    var softPanel={background:dark?"#1f1f31":"linear-gradient(180deg,#ffffff,#fffaf2)",border:"1px solid "+borderC,borderRadius:20,padding:16,boxShadow:dark?"none":"0 10px 26px rgba(15,23,42,.07)"};
    var formBox={background:dark?"#181827":"linear-gradient(135deg,#fffaf2,#ffffff)",border:"1px solid "+(dark?borderC:"#F4C46A"),borderRadius:18,padding:14,boxShadow:dark?"none":"0 8px 22px rgba(239,159,39,.10)"};
    var lists=(shoppingLists&&shoppingLists.length)?shoppingLists:[{id:"main",title:"Lista principale",icon:"🧺",createdAt:new Date().toISOString()}];
    var activeList=lists.find(function(x){return String(x.id)===String(activeShoppingListId);})||lists[0];
    var activeListId=activeList?activeList.id:"main";
    var areas=(shoppingAreas&&shoppingAreas.length)?shoppingAreas:DEFAULT_SHOPPING_AREAS;
    var unitOptions=["unità","grammi","millilitri","altro"];
    function areaIcon(a){return (shoppingAreaIcons&&shoppingAreaIcons[a])||"📌";}
    function qtyLabel(x){var q=String((x&&x.qty)||"").trim();var u=String((x&&x.unit)||"").trim();if(!q||q==="1")return "";return q+(u?" "+L(u):"");}
    function normName(v){return String(v||"").trim().toLowerCase();}
    function sameProduct(a,b){return normName(a&&a.name)===normName(b&&b.name)&&String((a&&a.area)||"Altro")===String((b&&b.area)||"Altro");}
    function itemBelongsToList(x){return !x.archived&&(String(x.listId||"main")===String(activeListId));}
    function activeItems(){return (shoppingItems||[]).filter(itemBelongsToList);}
    function activeItemsOrdered(){return activeItems().slice().sort(function(a,b){if(!!a.bought!==!!b.bought)return a.bought?1:-1;return (a.order||0)-(b.order||0);});}
    function productArchive(){var seen={};var base=(shoppingItems||[]).filter(function(x){return x.archived;}).filter(function(x){var k=normName(x.name)+"|"+String(x.area||"");if(seen[k])return false;seen[k]=true;return true;});return sortProducts(base);}
    function areaIndex(a){var i=areas.indexOf(a||"Altro");return i<0?999:i;}
    function sortProducts(list){var arr=(list||[]).slice();if(shoppingProductSort==="alpha")arr.sort(function(a,b){return String(a.name||"").localeCompare(String(b.name||""));});else if(shoppingProductSort==="area")arr.sort(function(a,b){return areaIndex(a.area)-areaIndex(b.area)||String(a.name||"").localeCompare(String(b.name||""));});else if(shoppingProductSort==="usage")arr.sort(function(a,b){return (b.usageCount||0)-(a.usageCount||0)||String(a.name||"").localeCompare(String(b.name||""));});else arr.sort(function(a,b){return (a.order||0)-(b.order||0)||areaIndex(a.area)-areaIndex(b.area)||String(a.name||"").localeCompare(String(b.name||""));});return arr;}
    function groupedProducts(){var groups=[];var by={};productArchive().forEach(function(x){var a=x.area||"Altro";if(!by[a]){by[a]=[];groups.push({area:a,items:by[a]});}by[a].push(x);});if(shoppingProductSort==="alpha"||shoppingProductSort==="usage")return [{area:L(shoppingProductSort==="alpha"?"Alfabetico":"Per utilizzo"),items:productArchive()}];return groups.sort(function(g1,g2){return areaIndex(g1.area)-areaIndex(g2.area);});}
    function ean13CheckDigit(first12){var sum=0;String(first12||"").slice(0,12).split("").forEach(function(ch,i){sum+=(Number(ch)||0)*(i%2===0?1:3);});return String((10-(sum%10))%10);}
    function encodeEan13Bits(raw){var code=String(raw||"").replace(/\D/g,"");if(code.length===12)code+=ean13CheckDigit(code);if(code.length!==13)return "";var Lp=["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];var Gp=["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];var Rp=["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];var parity=["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"][Number(code[0])||0];var bits="101";for(var i=1;i<=6;i++){var d=Number(code[i])||0;bits+=(parity[i-1]==="L"?Lp[d]:Gp[d]);}bits+="01010";for(var j=7;j<=12;j++){bits+=Rp[Number(code[j])||0];}bits+="101";return bits;}
    function code128Bits(raw){var value=String(raw||"").trim();if(!value)return "";var patterns=["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];var vals=[104];for(var i=0;i<value.length;i++){var code=value.charCodeAt(i);vals.push(Math.max(0,Math.min(94,code-32)));}var checksum=104;for(var j=1;j<vals.length;j++)checksum+=vals[j]*j;vals.push(checksum%103);vals.push(106);var bits="";vals.forEach(function(v){var pat=patterns[v]||patterns[0];for(var k=0;k<pat.length;k++){bits+=(k%2===0?"1":"0").repeat(Number(pat[k])||1);}});return bits;}
    function barcodeBars(code){var clean=String(code||"").replace(/\D/g,"");var bits=encodeEan13Bits(clean)||code128Bits(clean);if(!bits)return [];return bits.split("").map(function(x){return {on:x==="1",w:2};});}
    function qrCells(code){var seed=String(code||"");var cells=[];for(var y=0;y<17;y++){for(var x=0;x<17;x++){var finder=(x<5&&y<5)||(x>11&&y<5)||(x<5&&y>11);var v=finder?((x===0||x===4||y===0||y===4)||(x>1&&x<3&&y>1&&y<3)):(((x*7+y*11+seed.charCodeAt((x+y)%Math.max(seed.length,1)))%5)<2);cells.push({x:x,y:y,on:v});}}return cells;}
    function catalogHas(name,area,list){return (list||shoppingItems||[]).some(function(x){return x.archived&&normName(x.name)===normName(name)&&String(x.area||"Altro")===String(area||"Altro");});}
    function listHasProduct(x){return activeItems().some(function(a){return sameProduct(a,x);});}
    function touchUsage(name,area){setShoppingItems(function(list){return (list||[]).map(function(x){return x.archived&&normName(x.name)===normName(name)&&String(x.area||"Altro")===String(area||"Altro")?{...x,usageCount:(x.usageCount||0)+1,lastUsedAt:new Date().toISOString()}:x;});});}
    function addShoppingList(){var title=String(newListTitle||"").trim();if(!title){setToast({text:L("Inserisci il titolo della lista."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}var id="list_"+Date.now();setShoppingLists(function(list){return (list||[]).concat([{id:id,title:title,icon:newListIcon||"🧺",createdAt:new Date().toISOString()}]);});setActiveShoppingListId(id);setNewListTitle("");setNewListIcon("🧺");setShowNewListForm(false);}
    function deleteShoppingList(id){if(String(id)==="main"||lists.length<=1)return;if(!window.confirm(L("Eliminare questa lista della spesa?")))return;setShoppingLists(function(list){return (list||[]).filter(function(x){return String(x.id)!==String(id);});});setShoppingItems(function(list){return (list||[]).filter(function(x){return String(x.listId||"main")!==String(id)||x.archived;});});setActiveShoppingListId("main");}
    function saveCard(){var clean=String(cardCode||"").replace(/\D/g,"");if(!cardName.trim()||!clean){setToast({text:L("Inserisci nome carta e codice numerico."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}if(editingCardId){setShoppingCards(function(list){return (list||[]).map(function(c){return String(c.id)===String(editingCardId)?{...c,name:cardName.trim(),code:clean,codeType:cardCodeType,color:cardColor,updatedAt:new Date().toISOString()}:c;});});setEditingCardId("");setPendingScannedCard(null);setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");setShowCardManualForm(false);setShowCardCreateChoice(false);setToast({text:L("Carta aggiornata"),type:"success",icon:"✅"});return;}var lim=(PLAN_LIMITS[currentPlan]&&PLAN_LIMITS[currentPlan].shoppingCards)||2;if(lim!==Infinity&&(shoppingCards||[]).length>=lim){setToast({text:L("Hai raggiunto il limite di carte del tuo piano."),type:"error",color:"#E24B4A",icon:"🚫"});return;}var c={id:"card_"+Date.now(),name:cardName.trim(),code:clean,codeType:cardCodeType,color:cardColor,createdAt:new Date().toISOString(),fromScan:!!pendingScannedCard};setShoppingCards(function(list){return [c].concat(list||[]);});setPendingScannedCard(null);setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");setShowCardManualForm(false);setShowCardCreateChoice(false);setToast({text:L("Carta salvata"),type:"success",icon:"✅"});}
    function editCard(c){setPendingScannedCard(null);setEditingCardId(c.id);setCardName(c.name||"");setCardCode(String(c.code||""));setCardCodeType(c.codeType||"barcode");setCardColor(c.color||"#0F9F76");setShowCardCreateChoice(false);setShowCardManualForm(false);setTabShop("cards");}
    function deleteCard(id){if(!window.confirm(L("Eliminare questa carta?")))return;setShoppingCards(function(list){return (list||[]).filter(function(c){return String(c.id)!==String(id);});});if(String(editingCardId)===String(id)){setEditingCardId("");setCardName("");setCardCode("");setShowCardManualForm(false);setShowCardCreateChoice(false);}setToast({text:L("Carta eliminata"),type:"success",icon:"🗑️"});}
    function readRawFromBarcodeResult(res){var candidates=[];try{candidates.push(res&&res.rawValue,res&&res.displayValue,res&&res.content,res&&res.text,res&&res.value,res&&res.result);}catch(e){}try{if(res&&Array.isArray(res.barcodes))res.barcodes.forEach(function(b){candidates.push(b&&b.rawValue,b&&b.displayValue,b&&b.value,b&&b.text);});}catch(e){}for(var i=0;i<candidates.length;i++){var raw=String(candidates[i]||"").replace(/\D/g,"");if(raw.length>=4)return raw;}return "";}
    async function scanCardWithNativePlugins(){try{var cap=(window as any).Capacitor;var plugins=(cap&&cap.Plugins)||{};var p=plugins.BarcodeScanner||plugins.BarcodeScanning||plugins.MLKitBarcodeScanner;if(!p)return "";try{if(p.requestPermissions)await p.requestPermissions();}catch(e){}var formats=["QR_CODE","EAN_13","EAN_8","CODE_128","CODE_39","UPC_A","UPC_E","ITF"];var res=null;if(p.scan){res=await p.scan({formats:formats});}else if(p.scanBarcode){res=await p.scanBarcode({formats:formats});}else if(p.startScan){res=await p.startScan();}else if(p.scanCode){res=await p.scanCode();}var raw=readRawFromBarcodeResult(res);try{if(p.stopScan)await p.stopScan();}catch(e){}return raw;}catch(e){return "";}}
    function manualCardPrompt(message){setShowCardCreateChoice(true);setShowCardManualForm(true);setToast({text:L(message||"Non sono riuscito a leggere automaticamente il codice. Si apre l’inserimento manuale."),type:"warning",color:"#FFF8E1",icon:"⌨️",textColor:"#856404"});}
    function normalizeScannedCardCode(raw){var clean=String(raw||"").replace(/\D/g,"");if(clean.length===12)clean="0"+clean;return clean;}
    function guessScannedCardName(clean){var c=String(clean||"");if(c==="0470024406224"||c==="470024406224")return "Il Gigante";return L("Carta scansionata");}
    function saveScannedCard(raw,kind){var clean=normalizeScannedCardCode(raw);if(!clean){manualCardPrompt();return;}var detectedType=kind||"barcode";var suggestedName=guessScannedCardName(clean);var draftColor=cardColor||"#0F9F76";setPendingScannedCard({name:suggestedName,code:clean,codeType:detectedType,color:draftColor,createdAt:new Date().toISOString()});setEditingCardId("");setCardName(suggestedName);setCardCode(clean);setCardCodeType(detectedType);setCardColor(draftColor);setShowCardCreateChoice(true);setShowCardManualForm(true);setTabShop("cards");}
    function scanPhysicalCard(){(async function(){try{var nativeRaw=await scanCardWithNativePlugins();if(nativeRaw){saveScannedCard(nativeRaw,"barcode");return;}scanCardFromImage(true);}catch(e){manualCardPrompt("Scanner non disponibile. Inserisci il codice manualmente.");}})();}
    function scanCardFromImage(useCamera){try{var input=document.createElement("input");input.type="file";input.accept="image/*";if(useCamera)input.setAttribute("capture","environment");input.onchange=async function(){try{var file=input.files&&input.files[0];if(!file){manualCardPrompt();return;}if("BarcodeDetector" in window){var Detector=(window as any).BarcodeDetector;var detector=new Detector({formats:["qr_code","ean_13","ean_8","code_128","code_39","upc_a","upc_e","itf"]});var bmp=await createImageBitmap(file);var codes=await detector.detect(bmp);var raw=codes&&codes[0]&&codes[0].rawValue?String(codes[0].rawValue).replace(/\D/g,""):"";if(raw){saveScannedCard(raw,codes&&codes[0]&&String(codes[0].format||"").toLowerCase().indexOf("qr")>=0?"qr":"barcode");return;}}manualCardPrompt("Non sono riuscito a leggere automaticamente il codice. Si apre l’inserimento manuale.");}catch(e){manualCardPrompt("Non sono riuscito a leggere automaticamente il codice. Si apre l’inserimento manuale.");}};input.click();}catch(e){manualCardPrompt("Scanner non disponibile. Inserisci il codice manualmente.");}}
    function uploadCardPhoto(){scanCardFromImage(false);}
    function makeItem(name,area,archived,extra){return {id:(archived?"prod_":"shop_")+Date.now()+"_"+Math.floor(Math.random()*9999),name:name,area:area||"Altro",note:(extra&&extra.note)||"",qty:(extra&&extra.qty)||"1",unit:(extra&&extra.unit)||"unità",bought:false,archived:!!archived,listId:archived?"":activeListId,order:Date.now(),createdAt:new Date().toISOString(),catalogOnly:!!archived,usageCount:(extra&&extra.usageCount)||0};}
    function saveItem(){if(!itemName.trim()){setToast({text:L("Inserisci il nome del prodotto."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}var lim=(PLAN_LIMITS[currentPlan]&&PLAN_LIMITS[currentPlan].shoppingListItems)||25;if(lim!==Infinity&&activeItems().length>=lim){setToast({text:L("Hai raggiunto il limite della lista spesa del tuo piano."),type:"error",color:"#E24B4A",icon:"🚫"});return;}var area=itemArea||"Altro";var name=itemName.trim();var extra={note:itemNote,qty:itemQty,unit:itemUnit,usageCount:1};var it=makeItem(name,area,false,extra);setShoppingItems(function(list){var next=[it].concat(list||[]);if(!catalogHas(name,area,next)){next.push(makeItem(name,area,true,extra));}else{next=next.map(function(x){return x.archived&&normName(x.name)===normName(name)&&String(x.area||"Altro")===String(area||"Altro")?{...x,usageCount:(x.usageCount||0)+1,lastUsedAt:new Date().toISOString()}:x;});}return next;});setItemName("");setItemNote("");setItemQty("1");setItemUnit("unità");setShowItemForm(false);}
    function saveProductOnly(){if(!productName.trim()){setToast({text:L("Inserisci il nome del prodotto."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}var name=productName.trim();var area=productArea||"Altro";var extra={note:productNote,qty:productQty,unit:productUnit};if(editingProductId){setShoppingItems(function(list){return (list||[]).map(function(x){return String(x.id)===String(editingProductId)?{...x,name:name,area:area,note:productNote,qty:productQty,unit:productUnit,updatedAt:new Date().toISOString()}:x;});});cancelEditProduct();setTabShop("products");return;}setShoppingItems(function(list){if(catalogHas(name,area,list)){setToast({text:L("Prodotto già presente in Prodotti"),type:"warning",color:"#FFF8E1",icon:"📦",textColor:"#856404"});return list||[];}return [makeItem(name,area,true,extra)].concat(list||[]);});setProductName("");setProductNote("");setProductQty("1");setProductUnit("unità");setShowProductForm(false);setTabShop("products");}
    function addProductToList(x){if(listHasProduct(x))return;var lim=(PLAN_LIMITS[currentPlan]&&PLAN_LIMITS[currentPlan].shoppingListItems)||25;if(lim!==Infinity&&activeItems().length>=lim){setToast({text:L("Hai raggiunto il limite della lista spesa del tuo piano."),type:"error",color:"#E24B4A",icon:"🚫"});return;}setShoppingItems(function(list){return [{...x,id:"shop_"+Date.now()+"_"+Math.floor(Math.random()*9999),archived:false,bought:false,listId:activeListId,order:Date.now(),restoredAt:new Date().toISOString()}].concat((list||[]).map(function(p){return p.archived&&String(p.id)===String(x.id)?{...p,usageCount:(p.usageCount||0)+1,lastUsedAt:new Date().toISOString()}:p;}));});setTabShop("products");}
    function editProduct(x){setEditingProductId(x.id);setProductName(x.name||"");setProductArea(x.area||shoppingDefaultArea||"Alimenti");setProductNote(x.note||"");setProductQty(x.qty||"1");setProductUnit(x.unit||"unità");setShowProductForm(false);setTabShop("products");}
    function deleteProduct(id){if(!window.confirm(L("Eliminare questo prodotto?")))return;setShoppingItems(function(list){return (list||[]).filter(function(x){return String(x.id)!==String(id);});});if(String(editingProductId)===String(id))cancelEditProduct();setToast({text:L("Prodotto eliminato"),type:"success",icon:"🗑️"});}
    function cancelEditProduct(){setEditingProductId("");setProductName("");setProductArea(shoppingDefaultArea||"Alimenti");setProductNote("");setProductQty("1");setProductUnit("unità");setShowProductForm(false);}
    function toggleItem(id){setShoppingItems(function(list){return (list||[]).map(function(x){return String(x.id)===String(id)?{...x,bought:!x.bought,boughtAt:!x.bought?new Date().toISOString():"",order:Date.now()}:x;});});}
    function deleteItem(id){setShoppingItems(function(list){return (list||[]).map(function(x){return String(x.id)===String(id)?{...x,archived:true,bought:false,listId:"",catalogOnly:true,order:Date.now(),archivedAt:new Date().toISOString()}:x;});});}
    function removeBoughtItems(){setShoppingItems(function(list){return (list||[]).map(function(x){return itemBelongsToList(x)&&x.bought?{...x,archived:true,bought:false,listId:"",catalogOnly:true,order:Date.now(),archivedAt:new Date().toISOString()}:x;});});}
    function moveArea(idx,dir){var next=areas.slice();var j=idx+dir;if(j<0||j>=next.length)return;var tmp=next[idx];next[idx]=next[j];next[j]=tmp;setShoppingAreas(next);}
    function moveProduct(id,dir){var current=(shoppingItems||[]).find(function(x){return String(x.id)===String(id);});var area=current?(current.area||"Altro"):"Altro";var archive=productArchive().filter(function(x){return String(x.area||"Altro")===String(area);});var idx=archive.findIndex(function(x){return String(x.id)===String(id);});var j=idx+dir;if(idx<0||j<0||j>=archive.length)return;var ids=archive.map(function(x){return x.id;});var tmp=ids[idx];ids[idx]=ids[j];ids[j]=tmp;setShoppingItems(function(list){return (list||[]).map(function(x){var pos=ids.indexOf(x.id);return pos>=0?{...x,order:(areaIndex(x.area)+1)*10000+pos+1}:x;});});}
    function moveItem(id,dir){var items=activeItemsOrdered().filter(function(x){return !x.bought;});var idx=items.findIndex(function(x){return String(x.id)===String(id);});var j=idx+dir;if(idx<0||j<0||j>=items.length)return;var ids=items.map(function(x){return x.id;});var tmp=ids[idx];ids[idx]=ids[j];ids[j]=tmp;setShoppingItems(function(list){return (list||[]).map(function(x){var pos=ids.indexOf(x.id);return pos>=0?{...x,order:pos+1}:x;});});}
    function productForm(prefix){
      var isList=prefix==="item";
      var qVal=isList?itemQty:productQty;
      var uVal=isList?itemUnit:productUnit;
      return <div style={{...formBox,borderRadius:22,padding:16,background:dark?"#202033":"linear-gradient(135deg,#fff7e8,#ffffff)",boxShadow:dark?"none":"0 12px 28px rgba(239,159,39,.14)"}} onClick={function(e){e.stopPropagation();}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1.4fr 150px 95px 135px",gap:8,alignItems:"end"}}>
          <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Nome prodotto")}<input value={isList?itemName:productName} onChange={function(e){isList?setItemName(e.target.value):setProductName(e.target.value);}} placeholder={L("Nome prodotto")} style={{...sinp,marginTop:5}}/></label>
          <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Area")}<select value={isList?itemArea:productArea} onChange={function(e){isList?setItemArea(e.target.value):setProductArea(e.target.value);}} style={{...sinp,marginTop:5}}>{areas.map(function(a){return <option key={a} value={a}>{areaIcon(a)} {L(a)}</option>;})}</select></label>
          <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Quantità")}<input value={qVal} onChange={function(e){var v=e.target.value.replace(/[^0-9.,]/g,"");isList?setItemQty(v):setProductQty(v);}} placeholder="1" inputMode="decimal" style={{...sinp,marginTop:5}}/></label>
          <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Unità")}<select value={uVal} onChange={function(e){isList?setItemUnit(e.target.value):setProductUnit(e.target.value);}} style={{...sinp,marginTop:5}}>{unitOptions.map(function(u){return <option key={u} value={u}>{L(u)}</option>;})}</select></label>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 150px",gap:8,marginTop:8,alignItems:"end"}}>
          <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Note")}<input value={isList?itemNote:productNote} onChange={function(e){isList?setItemNote(e.target.value):setProductNote(e.target.value);}} placeholder={L("Note")} style={{...sinp,marginTop:5}}/></label>
          <button type="button" onClick={function(e){e.stopPropagation();(isList?saveItem:saveProductOnly)();}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"11px 12px",fontWeight:950,cursor:"pointer"}}>{isList?"＋ ":(editingProductId?"💾 ":"＋ ")}{L(isList?"Aggiungi alla lista":(editingProductId?"Salva modifica":"Crea"))}</button>
        </div>
        {!isList&&editingProductId&&<button type="button" onClick={function(e){e.stopPropagation();cancelEditProduct();}} style={{marginTop:8,background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>× {L("Annulla modifica")}</button>}
      </div>;
    }
    function cardCodePreview(c){var type=c.codeType||"barcode";if(type==="qr"){var cells=qrCells(c.code);return <div style={{display:"grid",gridTemplateColumns:"repeat(17,1fr)",gap:1,width:"min(210px,100%)",aspectRatio:"1 / 1",margin:"0 auto",background:"#fff",padding:12,borderRadius:14,boxShadow:"0 8px 18px rgba(0,0,0,.16)",boxSizing:"border-box"}}>{cells.map(function(cell,i){return <div key={i} style={{background:cell.on?"#111":"#fff"}}/>;})}</div>;}var bars=barcodeBars(c.code);return <div style={{background:"#fff",borderRadius:18,padding:"18px 14px 12px",overflow:"hidden",position:"relative",boxShadow:"0 8px 18px rgba(0,0,0,.16)",width:"100%",boxSizing:"border-box"}}><div style={{display:"flex",alignItems:"stretch",height:128,gap:0,width:"100%",justifyContent:"center"}}>{bars.map(function(b,i){return <div key={i} style={{background:b.on?"#050505":"transparent",height:"100%",flex:"1 1 0",minWidth:0}}/>;})}</div><div style={{color:"#111827",textAlign:"center",fontSize:12,fontWeight:900,letterSpacing:1.4,marginTop:8,wordBreak:"break-all"}}>{String(c.code||"")}</div></div>;}
    var active=activeItemsOrdered();
    var archive=productArchive();
    var listGroups={};active.forEach(function(x){var key=x.bought?L("Acquistati"):(x.area||"Altro");if(!listGroups[key])listGroups[key]=[];listGroups[key].push(x);});
    var productTitleStyle={fontSize:18,fontWeight:950,color:textC,marginBottom:4};
    var helperTextStyle={fontSize:12,color:subC,marginBottom:12};
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{[{id:"list",label:"Lista della spesa",icon:"🧺"},{id:"products",label:"Prodotti",icon:"📦"},{id:"cards",label:"Fidelity card",icon:"💳"}].map(function(t){return <button type="button" key={t.id} onClick={function(){setTabShop(t.id);}} style={{border:"1px solid "+(tabShop===t.id?confirmButtonColor:borderC),background:tabShop===t.id?confirmButtonColor:(dark?"#252535":"#fff"),color:tabShop===t.id?"#fff":textC,borderRadius:14,padding:"10px 8px",fontWeight:950,cursor:"pointer",fontSize:12}}>{t.icon} {L(t.label)}</button>;})}</div>

      {tabShop==="list"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={softPanel}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.25fr .95fr",gap:12,alignItems:"stretch",marginBottom:12}}>
            <div style={{background:dark?"#252535":"linear-gradient(135deg,#FFF7E8,#FFFFFF)",border:"1px solid "+(dark?borderC:"#F4D79B"),borderRadius:18,padding:14}}><div style={{fontSize:20,fontWeight:950,color:textC,display:"flex",alignItems:"center",gap:8}}>🧺 {L("Lista della spesa")}</div><div style={{fontSize:12,color:subC,marginTop:4,lineHeight:1.35}}>{L("Spunta i prodotti già messi nel carrello.")}<br/>{L("Se vuoi creare un’altra lista, vai nelle impostazioni")} <button type="button" onClick={function(){setTab("settings");setSettingsPage("shopping_settings");}} style={{border:"none",background:"transparent",padding:0,color:confirmButtonColor,fontWeight:900,cursor:"pointer",textDecoration:"underline"}}>{L("Spesa")}</button></div></div>
            <div style={{background:dark?"#252535":"#fff",border:"1px solid "+borderC,borderRadius:18,padding:12,display:"flex",flexDirection:"column",gap:10,justifyContent:"center"}}><select value={activeListId} onChange={function(e){setActiveShoppingListId(e.target.value);}} style={{...sinp,minWidth:170,fontWeight:900}}>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.icon||"🧺"} {l.title}</option>;})}</select><button type="button" onClick={function(){setShowItemForm(!showItemForm);}} style={{background:dark?"#1d1d2b":"#F8FAFC",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 10px",fontWeight:950,cursor:"pointer"}}>＋ {L("Crea Prodotto")}</button></div>
          </div>
                    {showItemForm&&productForm("item")}
        </div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}>
          {Object.keys(listGroups).map(function(area){return <div key={area} style={{marginBottom:12}}><div style={{fontSize:13,fontWeight:950,color:textC,marginBottom:7}}>{area==L("Acquistati")?"✅":areaIcon(area)} {L(area)}</div>{listGroups[area].map(function(x,idx){var bought=!!x.bought;return <div key={x.id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid "+borderC,borderRadius:12,padding:"9px 10px",marginBottom:7,background:bought?shoppingBoughtColor:(dark?"#252535":"#fff")}}><input type="checkbox" checked={bought} onChange={function(){toggleItem(x.id);}} style={{width:18,height:18,accentColor:incomeColor}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:900,color:bought?subC:textC,textDecoration:bought?"line-through":"none",wordBreak:"break-word"}}>{x.name} {qtyLabel(x)&&<span style={{fontSize:11,color:subC}}>× {qtyLabel(x)}</span>}</div>{x.note&&<div style={{fontSize:11,color:subC,wordBreak:"break-word"}}>{x.note}</div>}</div>{!bought&&<button type="button" disabled={idx===0} onClick={function(){moveItem(x.id,-1);}} style={{border:"1px solid "+borderC,background:dark?"#1d1d2b":"#fff",borderRadius:8,padding:"4px 7px",opacity:idx===0?0.35:1,cursor:idx===0?"not-allowed":"pointer"}}>▲</button>}{!bought&&<button type="button" disabled={idx===listGroups[area].length-1} onClick={function(){moveItem(x.id,1);}} style={{border:"1px solid "+borderC,background:dark?"#1d1d2b":"#fff",borderRadius:8,padding:"4px 7px",opacity:idx===listGroups[area].length-1?0.35:1,cursor:idx===listGroups[area].length-1?"not-allowed":"pointer"}}>▼</button>}<button type="button" onClick={function(){deleteItem(x.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>🗑️</button></div>;})}</div>;})}
          {active.some(function(x){return x.bought;})&&<div style={{marginTop:12,display:"flex",justifyContent:"center"}}><button type="button" onClick={removeBoughtItems} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 14px",fontWeight:950,cursor:"pointer",boxShadow:dark?"none":"0 6px 16px rgba(15,23,42,.07)"}}>🧹 {L("Rimuovi prodotti acquistati")}</button></div>}
          {!active.length&&<div style={{fontSize:13,color:subC}}>{L("Lista della spesa vuota")}</div>}
        </div>
      </div>}

      {tabShop==="products"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={softPanel}>
          <div style={{background:dark?"#252535":"linear-gradient(135deg,#FFFFFF,#FFF8E8)",border:"1px solid "+(dark?borderC:"#F1D39C"),borderRadius:20,padding:16,boxShadow:dark?"none":"0 10px 24px rgba(15,23,42,.06)",marginBottom:showProductForm&&!editingProductId?12:0}}>
            <div style={{fontSize:21,fontWeight:950,color:textC,lineHeight:1.1,display:"flex",alignItems:"center",gap:8}}>📦 {L("Prodotti")}</div>
            <div style={{fontSize:12,color:subC,marginTop:6,lineHeight:1.35}}>{L("Tocca il prodotto per aggiungerlo alla lista.")}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,alignItems:"center",marginTop:14}}><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();setEditingProductId("");if(showProductForm&&!editingProductId){setShowProductForm(false);return;}setProductName("");setProductArea(shoppingDefaultArea||"Alimenti");setProductNote("");setProductQty("1");setProductUnit("unità");setShowProductForm(true);setShowProductSortMenu(false);setTabShop("products");}} style={{background:dark?"#1d1d2b":"#F8FAFC",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 10px",fontWeight:950,cursor:"pointer",whiteSpace:"nowrap"}}>＋ {L("Crea Prodotto")}</button><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();setShowProductSortMenu(function(v){return !v;});setShowProductForm(false);setTabShop("products");}} style={{background:showProductSortMenu?confirmButtonColor:(dark?"#1d1d2b":"#F8FAFC"),color:showProductSortMenu?"#fff":textC,border:"1px solid "+(showProductSortMenu?confirmButtonColor:borderC),borderRadius:btnRadius,padding:"10px 10px",fontWeight:950,cursor:"pointer",whiteSpace:"nowrap"}}>↕ {L("Ordina")}</button></div>{showProductSortMenu&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,background:dark?"#1d1d2b":"#fff",border:"1px solid "+borderC,borderRadius:16,padding:8,marginTop:10}}>{[{id:"alpha",label:"Alfabetico"},{id:"area",label:"Per Area"},{id:"usage",label:"Per utilizzo"},{id:"custom",label:"Personalizzato"}].map(function(m){return <button type="button" key={m.id} onClick={function(e){e.preventDefault();e.stopPropagation();setShoppingProductSort(m.id);setShowProductSortMenu(false);setTabShop("products");}} style={{border:"1px solid "+(shoppingProductSort===m.id?confirmButtonColor:borderC),background:shoppingProductSort===m.id?confirmButtonColor:(dark?"#252535":"#F8FAFC"),color:shoppingProductSort===m.id?"#fff":textC,borderRadius:999,padding:"9px 8px",fontSize:12,fontWeight:950,cursor:"pointer",textAlign:"center"}}>{L(m.label)}</button>;})}</div>}
          </div>
          {showProductForm&&!editingProductId&&productForm("product")}
        </div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:18,padding:14}}>
          {!archive.length&&<div style={{fontSize:13,color:subC}}>{L("Nessun prodotto salvato")}</div>}
          {groupedProducts().map(function(group){return <div key={group.area} style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:950,color:textC,margin:"0 0 8px"}}>{areaIcon(group.area)} {L(group.area)}</div><div style={{display:"flex",flexDirection:"column",gap:9}}>{group.items.map(function(x,idx){var inList=listHasProduct(x);var editing=String(editingProductId)===String(x.id);return <div key={x.id} style={{border:"1px solid "+(editing?confirmButtonColor:(inList?incomeColor:borderC)),background:inList?(dark?"#183425":"linear-gradient(135deg,#E7F8EE,#F6FFF9)"):(dark?"#252535":"linear-gradient(135deg,#ffffff,#fbfbff)"),borderRadius:18,padding:12,boxShadow:dark?"none":"0 8px 22px rgba(15,23,42,.06)"}}><div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(0,1fr) 38px 38px 38px 38px":"minmax(0,1fr) 140px 38px 38px 38px 38px",alignItems:"center",gap:7}}><button type="button" disabled={inList} onClick={function(e){e.preventDefault();e.stopPropagation();addProductToList(x);setTabShop("products");}} style={{border:"none",background:"transparent",textAlign:"left",cursor:inList?"default":"pointer",padding:"2px 0",minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}><span style={{fontSize:15,fontWeight:950,color:inList?incomeColor:textC,wordBreak:"break-word"}}>{x.name}</span>{inList&&<span style={{fontSize:11,fontWeight:950,color:incomeColor,background:dark?"#123121":"#D9F4E5",border:"1px solid "+incomeColor,borderRadius:999,padding:"2px 7px"}}>✓ {L("In lista")}</span>}</div><div style={{fontSize:11,color:inList?incomeColor:subC,marginTop:3}}>{qtyLabel(x)?qtyLabel(x)+" · ":""}{x.note||""}</div></button><div style={{fontSize:11,color:inList?incomeColor:subC,fontWeight:900,background:dark?"#1d1d2b":"#F7F7F7",border:"1px solid "+borderC,borderRadius:999,padding:"6px 9px",textAlign:"center",display:isMobile?"none":"block",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{L(x.area||"Altro")}{x.usageCount?" · "+x.usageCount:""}</div><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();editProduct(x);setTabShop("products");}} style={{width:38,height:38,border:"none",background:dark?"#2b2b3a":"#EEF1FF",color:confirmButtonColor,borderRadius:12,padding:0,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();deleteProduct(x.id);setTabShop("products");}} style={{width:38,height:38,border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:12,padding:0,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button><button type="button" disabled={shoppingProductSort!=="custom"||idx===0} onClick={function(e){e.preventDefault();e.stopPropagation();moveProduct(x.id,-1);setTabShop("products");}} style={{width:38,height:38,border:"1px solid "+borderC,background:dark?"#1d1d2b":"#fff",borderRadius:12,padding:0,opacity:(shoppingProductSort!=="custom"||idx===0)?0.35:1,cursor:shoppingProductSort!=="custom"||idx===0?"not-allowed":"pointer",fontSize:15,fontWeight:950,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>▲</button><button type="button" disabled={shoppingProductSort!=="custom"||idx===group.items.length-1} onClick={function(e){e.preventDefault();e.stopPropagation();moveProduct(x.id,1);setTabShop("products");}} style={{width:38,height:38,border:"1px solid "+borderC,background:dark?"#1d1d2b":"#fff",borderRadius:12,padding:0,opacity:(shoppingProductSort!=="custom"||idx===group.items.length-1)?0.35:1,cursor:shoppingProductSort!=="custom"||idx===group.items.length-1?"not-allowed":"pointer",fontSize:15,fontWeight:950,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>▼</button></div>{editing&&<div style={{marginTop:10}}>{productForm("product")}</div>}</div>;})}</div></div>;})}
        </div>
      </div>}

      {tabShop==="cards"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={softPanel}>
          <div style={productTitleStyle}>💳 {L("Fidelity card e prepagate")}</div>
          <div style={helperTextStyle}>{L("Crea una carta solo quando ti serve: puoi scansionarla, caricare una foto o compilare i dati manualmente.")}</div>
          <button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();if(showCardCreateChoice&&!editingCardId){setShowCardCreateChoice(false);setShowCardManualForm(false);return;}setPendingScannedCard(null);setEditingCardId("");setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");setShowCardCreateChoice(true);setShowCardManualForm(false);setTabShop("cards");}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 12px",fontWeight:950,cursor:"pointer",marginBottom:showCardCreateChoice?12:0}}>＋ {L("Nuova Carta")}</button>
          {showCardCreateChoice&&<div style={{...formBox,marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:8}}><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();scanPhysicalCard();}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px",fontWeight:950,cursor:"pointer"}}>📷 {L("Scansiona carta")}</button><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();uploadCardPhoto();}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"12px",fontWeight:950,cursor:"pointer"}}>🖼️ {L("Carica foto")}</button><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();setShowCardManualForm(true);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"12px",fontWeight:950,cursor:"pointer"}}>⌨️ {L("Compila manualmente")}</button></div>{showCardManualForm&&<div style={{marginTop:12,background:dark?"#202033":"#fff",border:"1px solid "+borderC,borderRadius:18,padding:12}}>{pendingScannedCard&&<div style={{marginBottom:10,padding:"10px 12px",borderRadius:14,background:dark?"#26263a":"#F0FDF4",border:"1px solid "+(dark?"#3A3A52":"#BBF7D0")}}><div style={{fontSize:15,fontWeight:950,color:textC}}>✅ {L("Conferma dati carta")}</div><div style={{fontSize:12,color:subC,marginTop:3}}>{L("Il codice è stato letto. Controlla i dati prima di salvare la carta.")}</div></div>}<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr 130px 54px 120px",gap:8,alignItems:"end"}}><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Nome carta")}<input value={cardName} onChange={function(e){setCardName(e.target.value);}} placeholder={L("Nome carta")} style={{...sinp,marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Codice numerico")}<input value={cardCode} onChange={function(e){setCardCode(e.target.value.replace(/\D/g,""));}} placeholder={L("Codice numerico")} inputMode="numeric" style={{...sinp,marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Tipo codice")}<select value={cardCodeType} onChange={function(e){setCardCodeType(e.target.value);}} style={{...sinp,marginTop:5}}><option value="barcode">{L("Codice a barre")}</option><option value="qr">{L("QR")}</option></select></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Colore")}<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:6}}>{["#0F9F76","#378ADD","#7F77DD","#EF9F27","#E24B4A","#111827"].map(function(c){return <button key={c} type="button" onClick={function(){setCardColor(c);}} style={{width:26,height:26,borderRadius:999,border:cardColor===c?"3px solid #111827":"1px solid #E5E7EB",background:c,cursor:"pointer"}}/>;})}<input type="color" value={cardColor} onChange={function(e){setCardColor(e.target.value);}} style={{width:34,height:30,border:"none",background:"transparent"}}/></div></label><button type="button" onClick={saveCard} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"11px",fontWeight:950,cursor:"pointer"}}>{editingCardId?"💾 ":"＋ "}{L(editingCardId?"Salva modifica":"Aggiungi")}</button></div>{editingCardId&&<button type="button" onClick={function(){setEditingCardId("");setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");setShowCardManualForm(false);setShowCardCreateChoice(false);}} style={{marginTop:8,background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>× {L("Annulla modifica")}</button>}</div>}</div>}
          {false&&pendingScannedCard&&<div style={{...formBox,marginBottom:12,border:"2px solid "+confirmButtonColor,background:dark?"#202033":"linear-gradient(135deg,#fff7df,#ffffff)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:10}}><div><div style={{fontSize:16,fontWeight:950,color:textC}}>✅ {L("Conferma dati carta")}</div><div style={{fontSize:12,color:subC,marginTop:3}}>{L("Il codice è stato letto. Controlla i dati prima di salvare la carta.")}</div></div><button type="button" onClick={function(){setPendingScannedCard(null);setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:12,padding:"7px 10px",fontWeight:950,cursor:"pointer"}}>×</button></div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr 130px 54px 120px",gap:8,alignItems:"end"}}><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Nome carta")}<input value={cardName} onChange={function(e){setCardName(e.target.value);}} placeholder={L("Nome carta")} style={{...sinp,marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Codice numerico")}<input value={cardCode} onChange={function(e){setCardCode(e.target.value.replace(/\D/g,""));}} placeholder={L("Codice numerico")} inputMode="numeric" style={{...sinp,marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Tipo codice")}<select value={cardCodeType} onChange={function(e){setCardCodeType(e.target.value);}} style={{...sinp,marginTop:5}}><option value="barcode">{L("Codice a barre")}</option><option value="qr">{L("QR")}</option></select></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Colore")}<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:6}}>{["#0F9F76","#378ADD","#7F77DD","#EF9F27","#E24B4A","#111827"].map(function(c){return <button key={c} type="button" onClick={function(){setCardColor(c);}} style={{width:26,height:26,borderRadius:999,border:cardColor===c?"3px solid #111827":"1px solid #E5E7EB",background:c,cursor:"pointer"}}/>;})}<input type="color" value={cardColor} onChange={function(e){setCardColor(e.target.value);}} style={{width:34,height:30,border:"none",background:"transparent"}}/></div></label><button type="button" onClick={saveCard} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"11px",fontWeight:950,cursor:"pointer"}}>💾 {L("Salva carta")}</button></div></div>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>{(shoppingCards||[]).map(function(c){var mainColor=c.color||((c.type||"")==="prepaid"?"#7F77DD":"#0F9F76");return <div key={c.id} style={{background:"linear-gradient(135deg,"+mainColor+",#101828 82%)",border:"1px solid rgba(255,255,255,.18)",borderRadius:26,padding:18,boxShadow:"0 18px 38px rgba(0,0,0,.24)",color:"#fff",position:"relative",overflow:"hidden",minHeight:250}}><div style={{position:"absolute",right:-45,top:-45,width:160,height:160,borderRadius:999,background:"rgba(255,255,255,.13)"}}/><div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:16,position:"relative"}}><div><div style={{fontSize:20,fontWeight:950,letterSpacing:.2}}>{c.name}</div><div style={{fontSize:12,opacity:.82,marginTop:6,letterSpacing:1.2}}>{c.code}</div></div><div style={{display:"flex",gap:6}}><button type="button" onClick={function(){editCard(c);}} style={{border:"none",background:"rgba(255,255,255,.22)",color:"#fff",borderRadius:10,padding:"7px 9px",height:36,cursor:"pointer"}}>✏️</button><button type="button" onClick={function(){deleteCard(c.id);}} style={{border:"none",background:"rgba(255,255,255,.22)",color:"#fff",borderRadius:10,padding:"7px 9px",height:36,cursor:"pointer"}}>🗑️</button></div></div>{cardCodePreview(c)}{String(editingCardId)===String(c.id)&&<div style={{marginTop:12,background:"rgba(255,255,255,.96)",color:"#111827",borderRadius:18,padding:12,position:"relative",zIndex:2}}><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 110px 54px",gap:8,alignItems:"end"}}><label style={{fontSize:11,fontWeight:900,color:"#6B7280"}}>{L("Nome carta")}<input value={cardName} onChange={function(e){setCardName(e.target.value);}} placeholder={L("Nome carta")} style={{...sinp,marginTop:5,background:"#fff",color:"#111827"}}/></label><label style={{fontSize:11,fontWeight:900,color:"#6B7280"}}>{L("Codice numerico")}<input value={cardCode} onChange={function(e){setCardCode(e.target.value.replace(/\D/g,""));}} placeholder={L("Codice numerico")} inputMode="numeric" style={{...sinp,marginTop:5,background:"#fff",color:"#111827"}}/></label><label style={{fontSize:11,fontWeight:900,color:"#6B7280"}}>{L("Tipo codice")}<select value={cardCodeType} onChange={function(e){setCardCodeType(e.target.value);}} style={{...sinp,marginTop:5,background:"#fff",color:"#111827"}}><option value="barcode">{L("Codice a barre")}</option><option value="qr">{L("QR")}</option></select></label><label style={{fontSize:11,fontWeight:900,color:"#6B7280"}}>{L("Colore")}<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:6}}>{["#0F9F76","#378ADD","#7F77DD","#EF9F27","#E24B4A","#111827"].map(function(c){return <button key={c} type="button" onClick={function(){setCardColor(c);}} style={{width:26,height:26,borderRadius:999,border:cardColor===c?"3px solid #111827":"1px solid #E5E7EB",background:c,cursor:"pointer"}}/>;})}<input type="color" value={cardColor} onChange={function(e){setCardColor(e.target.value);}} style={{width:34,height:30,border:"none",background:"transparent"}}/></div></label></div><div style={{display:"flex",gap:8,marginTop:10}}><button type="button" onClick={saveCard} style={{flex:1,background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 12px",fontWeight:950,cursor:"pointer"}}>💾 {L("Salva modifica")}</button><button type="button" onClick={function(){setEditingCardId("");setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");}} style={{background:"#fff",color:"#111827",border:"1px solid #E5E7EB",borderRadius:btnRadius,padding:"10px 12px",fontWeight:950,cursor:"pointer"}}>× {L("Annulla")}</button></div></div>}</div>;})}{!(shoppingCards||[]).length&&<div style={{fontSize:13,color:subC,background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:16}}>{L("Nessuna carta inserita")}</div>}</div>
      </div>}
    </div>;
  }

  // ── Pannelli estratti in file separati ───────────────────────────────────────
  // HomePanel, SpesePanel, HistoryPanel → sezioni.tsx
  // StatsPanel                          → statistiche.tsx
  // ConsulenteAIPanel, FloatingAIButton  → sezioni.tsx
  // PatrimonioPanel                      → sezioni.tsx
  // SharePanel                           → sezioni.tsx
  // MorePanel + panelContent             → sezioni.tsx
  // Tutti i pannelli leggono il contesto via useApp()
  // ─────────────────────────────────────────────────────────────────────────────

    var navItems=["home","spese","history","stats","consulenteAI","patrimonio","budget","share","debtCredits","shopping","goals","alerts","appunti","settings"].map(function(id){return allNavDefs()[id];}).filter(Boolean);

  // ── COPY MONTH WIDGET (proper component to avoid hooks-in-IIFE) ──────────────
  function CopyMonthWidget({pHistory,pEntries,selMonthKey,setDraft,setToast,dark,textC,subC,borderC,sinp,btnRadius,onCopyMonth}){
    var availMonths=Object.keys(pHistory).sort().reverse().filter(function(mk){return mk!==selMonthKey;});
    var [copyFrom,setCopyFrom]=useState(availMonths[0]||"");
    var [showCopy,setShowCopy]=useState(false);
    if(!availMonths.length)return null;
    // Keep copyFrom valid when availMonths changes
    if(copyFrom&&!availMonths.includes(copyFrom)){setCopyFrom(availMonths[0]||"");}
    return <div style={{background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:"12px 16px"}}>
      {!showCopy
        ?<button onClick={function(){setShowCopy(true);}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500,padding:0}}>📋 {translateUiRuntimeText("Copia valori da un altro mese...")}</button>
        :<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:textC}}>{translateUiRuntimeText("Copia da")}</span>
          <select value={copyFrom} onChange={function(e){setCopyFrom(e.target.value);}} style={{...sinp,flex:1,padding:"6px 10px"}}>
            {availMonths.map(function(mk){return <option key={mk} value={mk}>{monthShortName(parseInt(mk.split("-")[1])-1)} {mk.slice(0,4)}</option>;})}
          </select>
          <button onClick={function(){
            if(onCopyMonth){onCopyMonth(copyFrom);setShowCopy(false);return;}
            var srcSnap=pHistory[copyFrom];
            if(!srcSnap)return;
            var nd={};
            pEntries.forEach(function(e){var raw=srcSnap[e.id];if(raw===undefined&&srcSnap.values)raw=srcSnap.values[e.id];if(raw===undefined&&srcSnap.entries)raw=srcSnap.entries[e.id];nd[e.id]=raw!==undefined?String(raw):"";});
            setDraft(nd);
            setShowCopy(false);
            setToast(translateUiRuntimeText("Valori copiati da")+" "+monthShortName(parseInt(copyFrom.split("-")[1])-1)+" "+copyFrom.slice(0,4));
          }} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>{translateUiRuntimeText("Copia")}</button>
          <button onClick={function(){setShowCopy(false);}} style={{background:"none",border:"none",cursor:"pointer",color:subC,fontSize:13}}>{translateUiRuntimeText("Annulla")}</button>
        </div>
      }
    </div>;
  }

  // ── PATRIMONIO PANEL ────────────────────────────────────────────────────────
  function PatrimonioPanel(){
    var pAreas=patrimonioAreas||DEFAULT_PATRIMONIO_AREAS;
    var pEntries=patrimonioEntries||DEFAULT_PATRIMONIO_ENTRIES;
    var pHistory=patrimonioHistory||{};
    var pNotes=patrimonioNotes||{};
    var patrimonioEntryAllowed=settingAllowed("base");
    function lockedPatrimonioEntry(){setToast({text:"Aggiungi voce patrimonio disponibile dal piano Base.",type:"warning",color:"#EF9F27",icon:"⚠️"});}
    var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};

    // Tab principale
    var [patTab,setPatTab]=useState("inserimento"); // "inserimento" | "storico"

    // ── INSERIMENTO: mese selezionato ─────────────────────────────────────────
    function readPatrimonioSelectedMonth(){try{var v=localStorage.getItem(userKey("patrimonio_selected_month_v1"));if(v&&/^\d{4}-\d{2}$/.test(v))return v;}catch(e){}return curMonthKey;}
    function rememberPatrimonioSelectedMonth(y,m){try{localStorage.setItem(userKey("patrimonio_selected_month_v1"),y+"-"+String(m).padStart(2,"0"));}catch(e){}}
    var initialPatMonth=readPatrimonioSelectedMonth();
    var [selYear,setSelYear]=useState(function(){return Number(initialPatMonth.slice(0,4))||curYear;});
    var [selMonth,setSelMonth]=useState(function(){return Number(initialPatMonth.slice(5,7))||now.getMonth()+1;}); // 1-12
    var selMonthKey=selYear+"-"+String(selMonth).padStart(2,"0");
    var isCurrentMonth=selMonthKey===curMonthKey;
    useEffect(function(){rememberPatrimonioSelectedMonth(selYear,selMonth);},[selYear,selMonth]);

    // Valori editabili per il mese selezionato
    var existingSnap=pHistory[selMonthKey]||null;
    var [draft,setDraft]=useState(function(){
      var d={};
      pEntries.forEach(function(e){d[e.id]=existingSnap?String(existingSnap[e.id]||""):String((pHistory[curMonthKey]||{})[e.id]||"");});
      return d;
    });
    var prevSelKey=useRef(selMonthKey);
    useEffect(function(){
      if(prevSelKey.current===selMonthKey)return;
      prevSelKey.current=selMonthKey;
      var snap=pHistory[selMonthKey]||null;
      var d={};
      pEntries.forEach(function(e){d[e.id]=snap?String(snap[e.id]||""):"";});
      setDraft(d);
      setEditingId(null);
    },[selMonthKey,pHistory,pEntries]);

    var [editingId,setEditingId]=useState(null);
    var [addingEntry,setAddingEntry]=useState(null);
    var [newEntryName,setNewEntryName]=useState("");
    var [newEntryIcon,setNewEntryIcon]=useState("📦");
    var [noteEntryId,setNoteEntryId]=useState(null); // id voce di cui si stanno editando le note
    var [noteDraft,setNoteDraft]=useState("");

    function openNote(eid){setNoteEntryId(eid);setNoteDraft(pNotes[eid]||"");}
    function saveNote(){setPatrimonioNotes(function(n){return{...n,[noteEntryId]:noteDraft};});setNoteEntryId(null);setToast({text:"Nota inserita",type:"success",color:"#1D9E75",icon:"✅"});}

    // Totale calcolato dal draft
    var draftTotal=pEntries.reduce(function(a,e){return a+(parseFloat(draft[e.id])||0);},0);

    // Mese precedente nello storico per calcolare delta
    var prevKey=useMemo(function(){
      var d=new Date(selYear,selMonth-2,1);
      return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    },[selYear,selMonth]);
    var prevSnap=pHistory[prevKey]||null;
    var prevTotal=prevSnap?(prevSnap._total||pEntries.reduce(function(a,e){return a+(parseFloat(prevSnap[e.id])||0);},0)):null;
    var totalDelta=prevTotal!==null?draftTotal-prevTotal:null;

    // Naviga mese
    function goMonth(dir){
      var m=selMonth+dir;var y=selYear;
      if(m>12){m=1;y++;}if(m<1){m=12;y--;}
      setSelMonth(m);setSelYear(y);rememberPatrimonioSelectedMonth(y,m);
    }

    function copyPatrimonioSnapshot(copyFromKey,rewardAlreadyGranted){
      var pg=rewardedFeatureGateState("patrimonioCopy",1);
      if(!rewardAlreadyGranted&&pg.state==="blocked"){setToast({text:pg.text,type:"error",color:"#E24B4A",icon:"🚫"});return;}
      if(!rewardAlreadyGranted&&pg.state==="ad"){
        showRewardedAdForExtraMovement(function(){
          if(unlockRewardedFeature("patrimonioCopy",1))copyPatrimonioSnapshot(copyFromKey,true);
        });
        return;
      }
      var keepY=selYear,keepM=selMonth;
      var histSnap=pHistory&&pHistory[copyFromKey]?pHistory[copyFromKey]:null;
      var liveSnap=(copyFromKey===curMonthKey)?(patrimonioValues||{}):null;
      var srcSnap={};
      if(histSnap&&typeof histSnap==="object")srcSnap={...srcSnap,...histSnap};
      if(liveSnap&&typeof liveSnap==="object")srcSnap={...srcSnap,...liveSnap};
      function readValue(entry){
        if(!entry)return undefined;
        var keys=[entry.id,String(entry.id),entry.name,String(entry.name||"")];
        for(var i=0;i<keys.length;i++){var k=keys[i];if(k&&srcSnap[k]!==undefined)return srcSnap[k];}
        if(srcSnap.values){for(var j=0;j<keys.length;j++){var kv=keys[j];if(kv&&srcSnap.values[kv]!==undefined)return srcSnap.values[kv];}}
        if(srcSnap.entries){for(var z=0;z<keys.length;z++){var ke=keys[z];if(ke&&srcSnap.entries[ke]!==undefined)return srcSnap.entries[ke];}}
        return undefined;
      }
      var sourceKeys=Object.keys(srcSnap||{}).filter(function(k){return k.indexOf("_")!==0&&k!=="values"&&k!=="entries";});
      var hasValues=pEntries.some(function(e){var raw=readValue(e);return raw!==undefined&&raw!==null&&String(raw)!=="";}) || sourceKeys.some(function(k){var raw=srcSnap[k];return raw!==undefined&&raw!==null&&String(raw)!=="";});
      if(!hasValues){setToast({text:"Nessun valore disponibile per il mese selezionato",type:"error",color:"#E24B4A",icon:"🚫"});return;}
      var nd={};
      var copiedSnap={};
      pEntries.forEach(function(e){var raw=readValue(e);var val=raw!==undefined&&raw!==null?String(raw):"";nd[e.id]=val;copiedSnap[e.id]=parseFloat(String(val).replace(",","."))||0;});
      copiedSnap._total=pEntries.reduce(function(a,e){return a+(parseFloat(String(nd[e.id]||"").replace(",","."))||0);},0);
      copiedSnap._savedAt=new Date().toISOString();
      setDraft(nd);
      setPatrimonioHistory(function(h){return {...(h||{}),[keepY+"-"+String(keepM).padStart(2,"0")]:copiedSnap};});
      if((keepY+"-"+String(keepM).padStart(2,"0"))===curMonthKey){var liveVals={};pEntries.forEach(function(e){liveVals[e.id]=copiedSnap[e.id]||0;});setPatrimonioValues(liveVals);}
      setSelYear(keepY);setSelMonth(keepM);rememberPatrimonioSelectedMonth(keepY,keepM);
      consumePlanFeature("patrimonioCopy",1);
      var usedAfterCopy=planCount(featureUsageKey("patrimonioCopy"))+1;
      setToast(successToastForFeature("patrimonioCopy","Valori copiati da "+monthShortName(parseInt(copyFromKey.split("-")[1])-1)+" "+copyFromKey.slice(0,4),usedAfterCopy));
    }

    // Salva snapshot per il mese selezionato
    function saveMonthSnap(){
      var snap={};
      pEntries.forEach(function(e){snap[e.id]=parseFloat(draft[e.id])||0;});
      snap._total=draftTotal;
      snap._savedAt=new Date().toISOString();
      // Se è il mese corrente aggiorna anche pValues (valori "live")
      if(isCurrentMonth){
        var newVals={};
        pEntries.forEach(function(e){newVals[e.id]=parseFloat(draft[e.id])||0;});
        setPatrimonioValues(newVals);
      }
      setPatrimonioHistory(function(h){return{...h,[selMonthKey]:snap};});
      var keepY=selYear,keepM=selMonth;
      rememberPatrimonioSelectedMonth(keepY,keepM);setTimeout(function(){setSelYear(keepY);setSelMonth(keepM);rememberPatrimonioSelectedMonth(keepY,keepM);},0);
      setToast("Patrimonio "+monthShortName(selMonth-1)+" "+selYear+" salvato");
    }

    // Elimina snapshot mese
    function delMonthSnap(mk){
      setPatrimonioHistory(function(h){var q={...h};delete q[mk];return q;});
      setToast("Snapshot eliminato");
    }

    function addEntry(areaId){if(!newEntryName.trim())return;var nid="entry_"+Date.now();setPatrimonioEntries(function(p){return [...p,{id:nid,name:newEntryName.trim(),icon:newEntryIcon,areaId:areaId}];});setDraft(function(d){return{...d,[nid]:""}});setNewEntryName("");setNewEntryIcon("📦");setAddingEntry(null);}
    function delEntry(eid){setPatrimonioEntries(function(p){return p.filter(function(x){return x.id!==eid;});});setDraft(function(d){var q={...d};delete q[eid];return q;});if(isCurrentMonth)setPatrimonioValues(function(p){var q={...p};delete q[eid];return q;});}

    // ── STORICO ────────────────────────────────────────────────────────────────
    var [histViewYear,setHistViewYear]=useState(String(curYear));
    var histMonths=useMemo(function(){
      var keys=Object.keys(pHistory).sort();
      return keys.map(function(mk,i){
        var snap=pHistory[mk];
        var prev=i>0?pHistory[keys[i-1]]:null;
        var total=snap._total||pEntries.reduce(function(a,e){return a+(parseFloat(snap[e.id])||0);},0);
        var prevT=prev?(prev._total||pEntries.reduce(function(a,e){return a+(parseFloat(prev[e.id])||0);},0)):null;
        return{mk:mk,snap:snap,total:total,delta:prevT!==null?total-prevT:null};
      }).reverse();
    },[pHistory,pEntries]);
    var histYears=useMemo(function(){var ys=new Set(histMonths.map(function(m){return m.mk.slice(0,4);}));return Array.from(ys).sort(function(a,b){return b-a;});},[histMonths]);
    var filteredHist=histMonths.filter(function(m){return m.mk.startsWith(histViewYear);});

    // Totale corrente (mese corrente) per header
    var liveTotalSnap=pHistory[curMonthKey];
    var liveTotal=liveTotalSnap?(liveTotalSnap._total||pEntries.reduce(function(a,e){return a+(parseFloat(liveTotalSnap[e.id])||0);},0)):pEntries.reduce(function(a,e){return a+(parseFloat((patrimonioValues||{})[e.id])||0);},0);
    var livePrevSnap=pHistory[useMemo(function(){var d=new Date(curYear,now.getMonth()-1,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");},[])];
    var livePrevTotal=livePrevSnap?(livePrevSnap._total||0):null;

    return <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Note modal */}
      {noteEntryId&&(function(){
        var entry=pEntries.find(function(e){return e.id===noteEntryId;});
        return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={function(e){if(e.target===e.currentTarget){saveNote();}}}>
          <div style={{background:dark?"#1e1e30":"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:440,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:600,color:textC}}>{entry?entry.icon+" "+entry.name:"Nota"}</div>
              <button onClick={function(){saveNote();}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#aaa"}}>×</button>
            </div>
            <textarea value={noteDraft} onChange={function(e){setNoteDraft(e.target.value);}} placeholder={L("Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)")} style={{...sinp,height:120,resize:"vertical",lineHeight:1.5}} autoFocus/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn onClick={saveNote} bg="#7F77DD" style={{flex:1,padding:"10px",fontWeight:600}}>{"💾 "+L("Salva nota")}</Btn>
              <Btn onClick={function(){setNoteEntryId(null);}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"} style={{padding:"10px 14px"}}>{L("Annulla")}</Btn>
            </div>
            {pNotes[noteEntryId]&&<button onClick={function(){if(!window.confirm(L("Eliminare questa nota?")))return;setPatrimonioNotes(function(n){var q={...n};delete q[noteEntryId];return q;});setNoteEntryId(null);setToast(L("Nota eliminata"));}} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:12,width:"100%"}}>{"🗑 "+L("Elimina nota")}</button>}
          </div>
        </div>;
      })()}

      {/* ── Header totale ── */}
      <div style={{background:"linear-gradient(135deg,#378ADD22,#9F77DD22)",borderRadius:14,border:"1px solid "+(dark?"#444":"#ddd"),padding:20,textAlign:"center"}}>
        <div style={{fontSize:11,color:subC,marginBottom:2}}>{L("Patrimonio")} — {monthFullName(now.getMonth())} {curYear}</div>
        <div style={{fontSize:32,fontWeight:700,color:liveTotal>=0?"#1D9E75":"#E24B4A"}}>{fmt(liveTotal)}</div>
        {secRate&&showSecInPatrimonio&&fmtSec(liveTotal)&&<div style={{fontSize:14,color:subC,marginTop:2}}>{fmtSec(liveTotal)}</div>}
        {livePrevTotal!==null&&<div style={{fontSize:13,fontWeight:500,color:(liveTotal-livePrevTotal)>=0?"#1D9E75":"#E24B4A",marginTop:4}}>
          {(liveTotal-livePrevTotal)>=0?"▲":"▼"} {fmt(Math.abs(liveTotal-livePrevTotal))} vs mese scorso
        </div>}
        <div style={{fontSize:11,color:subC,marginTop:6}}>Modalità: {patrimonioMode==="manuale"?"Manuale":"Semi-automatica ⚠️"}</div>
      </div>

      {/* ── Tab ── */}
      <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}>
        <button onClick={function(){setPatTab("inserimento");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:patTab==="inserimento"?(dark?"#444":"#fff"):"transparent",color:patTab==="inserimento"?textC:subC,fontSize:14,cursor:"pointer",fontWeight:patTab==="inserimento"?500:400}}>✏️ Inserimento</button>
        <button onClick={function(){setPatTab("storico");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:patTab==="storico"?(dark?"#444":"#fff"):"transparent",color:patTab==="storico"?textC:subC,fontSize:14,cursor:"pointer",fontWeight:patTab==="storico"?500:400}}>
          📅 Storico {histMonths.length>0&&<span style={{fontSize:11,background:"#7F77DD",color:"#fff",borderRadius:10,padding:"1px 6px",marginLeft:4}}>{histMonths.length}</span>}
        </button>
      </div>

      {/* ══════════════════════ TAB INSERIMENTO ══════════════════════ */}
      {patTab==="inserimento"&&<>

        {/* Selettore mese */}
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={function(){goMonth(-1);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:subC,padding:"4px 8px",borderRadius:8}}>‹</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:textC}}>{monthFullName(selMonth-1)} {selYear}</div>
            <div style={{fontSize:11,color:subC,marginTop:2}}>
              {existingSnap?"✅ Dati già salvati":(isCurrentMonth?"Mese corrente — non ancora salvato":"⚠️ Nessun dato per questo mese")}
            </div>
          </div>
          <button onClick={function(){goMonth(1);}} disabled={selMonthKey>=curMonthKey} style={{background:"none",border:"none",cursor:selMonthKey>=curMonthKey?"not-allowed":"pointer",fontSize:20,color:selMonthKey>=curMonthKey?"#ccc":subC,padding:"4px 8px",borderRadius:8}}>›</button>
        </div>

        {/* Totale mese selezionato + delta */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) auto",gap:12,alignItems:"center",padding:"14px 16px",background:dark?"#252535":"#f9f9f9",borderRadius:14,border:"1px solid "+borderC}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:11,color:subC}}>Totale {monthShortName(selMonth-1)} {selYear}</div>
            <div style={{fontSize:isMobile?24:26,fontWeight:900,color:draftTotal>=0?"#1D9E75":"#E24B4A",lineHeight:1.1,wordBreak:"break-word"}}>{fmt(draftTotal)}</div>
            {secRate&&showSecInPatrimonio&&fmtSec(draftTotal)&&<div style={{fontSize:12,color:subC,fontWeight:500,marginTop:2}}>{fmtSec(draftTotal)}</div>}
            {totalDelta!==null&&<div style={{fontSize:13,fontWeight:800,color:totalDelta>=0?"#1D9E75":"#E24B4A",marginTop:5}}>vs {monthShortName(parseInt(prevKey.split("-")[1])-1)}: {totalDelta>=0?"+":""}{fmt(totalDelta)}</div>}
          </div>
          <button onClick={saveMonthSnap} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px 18px",fontSize:14,cursor:"pointer",fontWeight:900,width:isMobile?"100%":"auto",minWidth:isMobile?0:118,boxShadow:dark?"none":"0 6px 18px rgba(127,119,221,0.28)"}}>
            {existingSnap?("🔄 "+L("Aggiorna")):("💾 "+L("Salva"))}
          </button>
        </div>

        {/* Copia da altro mese */}
        <CopyMonthWidget
          pHistory={(function(){var h={...(pHistory||{})};var hasLive=pEntries.some(function(e){var v=(patrimonioValues||{})[e.id];return v!==undefined&&v!==null&&String(v)!==""&&Number(v)!==0;});if(hasLive){h[curMonthKey]={...(h[curMonthKey]||{}),...(patrimonioValues||{})};}return h;})()}
          pEntries={pEntries}
          selMonthKey={selMonthKey}
          setDraft={setDraft}
          setToast={setToast}
          dark={dark}
          textC={textC}
          subC={subC}
          borderC={borderC}
          sinp={sinp}
          btnRadius={btnRadius}
          onCopyMonth={copyPatrimonioSnapshot}
        />

        {/* Aree e voci */}
        {pAreas.map(function(area){
          var aEntries=pEntries.filter(function(e){return e.areaId===area.id;});
          var aTotal=aEntries.reduce(function(a,e){return a+(parseFloat(draft[e.id])||0);},0);
          var aPrevTotal=prevSnap?aEntries.reduce(function(a,e){return a+(parseFloat(prevSnap[e.id])||0);},0):null;
          var aDelta=aPrevTotal!==null?aTotal-aPrevTotal:null;
          return <div key={area.id} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:10,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                <span style={{fontSize:20}}>{area.icon}</span>
                <span style={{fontSize:15,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{L(area.name)}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:600,color:aTotal>=0?"#1D9E75":"#E24B4A"}}>{fmt(aTotal)}</div>
                {aDelta!==null&&aDelta!==0&&<div style={{fontSize:11,color:aDelta>0?"#1D9E75":"#E24B4A"}}>{aDelta>0?"+":""}{fmt(aDelta)}</div>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {aEntries.map(function(entry){
                var rawVal=draft[entry.id]||"";
                var numVal=parseFloat(rawVal)||0;
                var prevEntryVal=prevSnap?parseFloat(prevSnap[entry.id])||0:null;
                var entryDelta=prevEntryVal!==null?numVal-prevEntryVal:null;
                return <div key={entry.id}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:isMobile?"8px 8px":"8px 10px",background:dark?"#252535":"#f9f9f9",borderRadius:pNotes[entry.id]?"10px 10px 0 0":10,border:"1px solid "+(editingId===entry.id?"#7F77DD":(dark?"#333":"#f0f0f0")),minWidth:0,overflow:"hidden"}}>
                  <span style={{fontSize:16,flexShrink:0}}>{entry.icon}</span>
                  <span style={{flex:"1 1 auto",minWidth:0,fontSize:13,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(entry.name)}</span>
                  {editingId===entry.id
                    ?<div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <input type="number" value={rawVal} placeholder="0"
                        onChange={function(e){var v=e.target.value;setDraft(function(d){return{...d,[entry.id]:v};});}}
                        onKeyDown={function(e){if(e.key==="Enter"||e.key==="Tab")setEditingId(null);}}
                        style={{...sinp,width:110,padding:"4px 8px",fontSize:13}} autoFocus/>
                      <button onClick={function(){setEditingId(null);}} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:500}}>✓</button>
                    </div>
                    :<div style={{display:"flex",alignItems:"center",gap:isMobile?4:6,flexShrink:0,minWidth:0}}>
                      {entryDelta!==null&&entryDelta!==0&&<span style={{fontSize:11,fontWeight:500,color:entryDelta>0?"#1D9E75":"#E24B4A",minWidth:isMobile?42:56,textAlign:"right",whiteSpace:"nowrap"}}>{entryDelta>0?"+":""}{fmt(entryDelta)}</span>}
                      <span onClick={function(){setEditingId(entry.id);}} style={{fontSize:isMobile?12:14,fontWeight:500,color:numVal>0?"#1D9E75":numVal<0?"#E24B4A":subC,minWidth:isMobile?62:80,maxWidth:isMobile?72:110,textAlign:"right",cursor:"pointer",borderBottom:"1px dashed "+(dark?"#555":"#ddd"),padding:"1px 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{rawVal===""?"—":fmt(numVal)}</span>
                      <button title={L("Modifica")} onClick={function(){setEditingId(entry.id);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",cursor:"pointer",color:"#378ADD",fontSize:isMobile?12:14,padding:isMobile?"4px 6px":"5px 8px",borderRadius:8,fontWeight:700,flexShrink:0}}>✏️</button>
                      <button onClick={function(){openNote(entry.id);}} title="Nota" style={{background:pNotes[entry.id]?"#EEEDFE":"none",border:pNotes[entry.id]?"1px solid #AFA9EC":"none",borderRadius:6,cursor:"pointer",color:pNotes[entry.id]?"#534AB7":"#ccc",fontSize:isMobile?12:13,padding:isMobile?"1px 3px":"1px 5px",flexShrink:0}}>📝</button>
                      <button title={L("Elimina")} onClick={function(){if(!window.confirm(L("Eliminare questa voce dal Patrimonio?")))return;delEntry(entry.id);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",cursor:"pointer",color:"#E24B4A",fontSize:isMobile?12:14,padding:isMobile?"4px 6px":"5px 8px",borderRadius:8,fontWeight:700,flexShrink:0}}>🗑️</button>
                    </div>
                  }
                  </div>
                  {pNotes[entry.id]&&<div onClick={function(){openNote(entry.id);}} style={{padding:"6px 12px",background:dark?"#1e1e30":"#f5f4ff",border:"1px solid "+(dark?"#3a3a5a":"#c8c0f8"),borderTop:"none",borderRadius:"0 0 10px 10px",fontSize:11,color:dark?"#aac":"#534AB7",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {pNotes[entry.id]}</div>}
                </div>;
              })}
            </div>
            {addingEntry===area.id
              ?<div onClick={function(){if(!patrimonioEntryAllowed)lockedPatrimonioEntry();}} style={{marginTop:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",background:patrimonioEntryAllowed?"transparent":(dark?"#342b16":"#FFF8E1"),border:patrimonioEntryAllowed?"none":"1.5px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:12,padding:patrimonioEntryAllowed?0:10}}>
                <EmojiPicker value={newEntryIcon} onChange={function(v){if(!patrimonioEntryAllowed){lockedPatrimonioEntry();return;}setNewEntryIcon(v);}}/>
                <input disabled={!patrimonioEntryAllowed} type="text" placeholder="Nome voce" value={newEntryName} onChange={function(e){if(!patrimonioEntryAllowed){lockedPatrimonioEntry();return;}setNewEntryName(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addEntry(area.id);}} style={{...sinp,flex:1,minWidth:120}}/>
                <button onClick={function(){if(!patrimonioEntryAllowed){lockedPatrimonioEntry();return;}addEntry(area.id);}} style={{background:patrimonioEntryAllowed?"#1D9E75":"#EF9F27",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:patrimonioEntryAllowed?"pointer":"not-allowed",fontSize:13,fontWeight:500}}>{L("Aggiungi")}</button>
                <button onClick={function(){setAddingEntry(null);setNewEntryName("");}} style={{background:"#f0f0f0",color:"#666",border:"none",borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:13}}>{L("Annulla")}</button>
              </div>
              :<button onClick={function(){if(!patrimonioEntryAllowed){lockedPatrimonioEntry();return;}setAddingEntry(area.id);}} style={{marginTop:10,background:patrimonioEntryAllowed?"none":"#FFF8E1",border:"1.5px dashed "+(patrimonioEntryAllowed?(dark?"#444":"#ddd"):(dark?"#6a5520":"#FFD54F")),borderRadius:8,padding:"7px 14px",cursor:patrimonioEntryAllowed?"pointer":"not-allowed",color:patrimonioEntryAllowed?subC:"#856404",fontSize:13,width:"100%"}}>+ {L("Aggiungi voce")}{patrimonioEntryAllowed?"":" 🔒"}</button>
            }
          </div>;
        })}
        {patrimonioMode==="semi"&&<div style={{background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:12,padding:"12px 16px"}}><span style={{fontSize:13,color:"#856404"}}>⚠️ Modalità semi-automatica in beta.</span></div>}
      </>}

      {/* ══════════════════════ TAB STORICO ══════════════════════ */}
      {patTab==="storico"&&<>
        {histMonths.length===0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:40,textAlign:"center",color:subC,fontSize:14}}>
          Nessuno storico disponibile. Nella scheda Inserimento seleziona un mese, inserisci i valori e clicca "💾 Salva".
        </div>}

        {histMonths.length>0&&<>
          {histYears.length>1&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {histYears.map(function(y){return <button key={y} onClick={function(){setHistViewYear(y);}} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(histViewYear===y?"#7F77DD":borderC),background:histViewYear===y?"#EEEDFE":(dark?"#252535":"#f5f5f5"),color:histViewYear===y?"#534AB7":textC,fontSize:13,cursor:"pointer",fontWeight:histViewYear===y?600:400}}>{y}</button>;})}
          </div>}

          {filteredHist.length>1&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:10}}>Andamento patrimonio — {histViewYear}</div>
            {(function(){
              var pts=[...filteredHist].reverse();
              var vals=pts.map(function(m){return m.total;});
              var maxV=Math.max.apply(null,vals);var minV=Math.min.apply(null,vals);
              var range=maxV-minV;if(!range)range=maxV||1;
              var w=isMobile?300:500,h=100,pl=8,pr=8,pt2=8,pb=20;
              var cw=w-pl-pr,ch=h-pt2-pb;
              var coords=pts.map(function(m,i){return{x:pl+i*(cw/Math.max(pts.length-1,1)),y:pt2+ch-((m.total-minV)/range)*ch,mk:m.mk,total:m.total};});
              var linePath=coords.map(function(p,i){return(i===0?"M":"L")+p.x.toFixed(1)+" "+p.y.toFixed(1);}).join(" ");
              var areaPath=linePath+" L"+coords[coords.length-1].x+" "+(pt2+ch)+" L"+coords[0].x+" "+(pt2+ch)+" Z";
              var tc2=dark?"#888":"#bbb";
              return <svg width={w} height={h}>
                <defs><linearGradient id="patGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7F77DD" stopOpacity="0.3"/><stop offset="100%" stopColor="#7F77DD" stopOpacity="0"/></linearGradient></defs>
                <path d={areaPath} fill="url(#patGrad2)"/>
                <path d={linePath} fill="none" stroke="#7F77DD" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
                      {coords.map(function(p,i){return <g key={i}><circle cx={p.x} cy={p.y} r={3} fill="#7F77DD"/><text x={p.x} y={h-5} textAnchor="middle" fontSize={8} fill={tc2}>{monthShortName(parseInt(p.mk.split("-")[1])-1)}</text></g>;})}
              </svg>;
            })()}
          </div>}

          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>Dettaglio mensile</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:dark?"#252535":"#f5f5f5"}}>
                  <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:subC}}>{translateUiRuntimeText("Mese")}</th>
                  <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>Totale</th>
                  <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>Δ</th>
                  {pAreas.slice(0,isMobile?2:4).map(function(a){return <th key={a.id} style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>{a.icon}</th>;})}
                  <th style={{padding:"7px 10px",textAlign:"center",fontWeight:600,color:subC}}></th>
                </tr></thead>
                <tbody>
                  {filteredHist.map(function(m){
                    var lbl=monthShortName(parseInt(m.mk.split("-")[1])-1)+" "+m.mk.slice(0,4);
                    return <tr key={m.mk} style={{borderBottom:"1px solid "+(dark?"#333":"#f0f0f0")}}>
                      <td style={{padding:"8px 10px",color:textC,fontWeight:500}}>
                        <button onClick={function(){setSelYear(parseInt(m.mk.slice(0,4)));setSelMonth(parseInt(m.mk.split("-")[1]));setPatTab("inserimento");}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:12,fontWeight:600,padding:0,textDecoration:"underline"}}>{lbl}</button>
                      </td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:m.total>=0?"#1D9E75":"#E24B4A"}}>{fmt(m.total)}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:500,color:m.delta===null?subC:m.delta>=0?"#1D9E75":"#E24B4A"}}>{m.delta===null?"—":(m.delta>=0?"+":"")+fmt(m.delta)}</td>
                      {pAreas.slice(0,isMobile?2:4).map(function(a){
                        var aEnts=pEntries.filter(function(e){return e.areaId===a.id;});
                        var aT=aEnts.reduce(function(acc,e){return acc+(parseFloat(m.snap[e.id])||0);},0);
                        return <td key={a.id} style={{padding:"8px 10px",textAlign:"right",color:subC,fontSize:11}}>{fmt(aT)}</td>;
                      })}
                      <td style={{padding:"8px 10px",textAlign:"center"}}>
                        <button onClick={function(){if(window.confirm(L("Eliminare snapshot ")+m.mk+"?")){delMonthSnap(m.mk);}}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:13}}>×</button>
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredHist.length>0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>Variazioni per voce — {monthShortName(parseInt(filteredHist[0].mk.split("-")[1])-1)} vs mese precedente</div>
            {filteredHist[0].delta===null?<div style={{fontSize:12,color:subC}}>{translateUiRuntimeText("Nessun mese precedente nel registro.")}</div>:
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {pEntries.map(function(entry){
                var cur=parseFloat(filteredHist[0].snap[entry.id])||0;
                var prev2=filteredHist.length>1?(parseFloat(filteredHist[1].snap[entry.id])||0):null;
                var d2=prev2!==null?cur-prev2:null;
                if(cur===0&&(d2===null||d2===0))return null;
                return <div key={entry.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:dark?"#252535":"#f9f9f9",borderRadius:8}}>
                  <span style={{fontSize:14,flexShrink:0}}>{entry.icon}</span>
                  <span style={{flex:1,fontSize:12,color:textC}}>{entry.name}</span>
                  <span style={{fontSize:13,fontWeight:500,color:cur>=0?"#1D9E75":"#E24B4A",minWidth:70,textAlign:"right"}}>{fmt(cur)}</span>
                  {d2!==null&&<span style={{fontSize:11,fontWeight:500,color:d2===0?subC:d2>0?"#1D9E75":"#E24B4A",minWidth:60,textAlign:"right"}}>{d2===0?"—":(d2>0?"+":"")+fmt(d2)}</span>}
                </div>;
              }).filter(Boolean)}
            </div>}
          </div>}
        </>}
      </>}
    </div>;
  }
  function createShareProject(name,description){
    if(!canAddPlanItem("shareProjects",(shareProjects||[]).length,1)){setToast({text:upgradeMessage("shareProjects",(shareProjects||[]).length),type:"error",color:"#E24B4A",icon:"🚫"});return null;}
    var owner={id:"me",uid:userId,name:currentUser&&currentUser.name?currentUser.name:"Io",email:currentUser&&currentUser.email?normalizeEmail(currentUser.email):"",kind:"registered",type:"registered",role:"owner",status:"active"};
    var p={id:String(Date.now()),name:(name||"").trim()||"Progetto Share",description:(description||"").trim(),ownerUid:userId,ownerName:owner.name,ownerEmail:owner.email,memberUids:userId?[userId]:[],participants:[owner],activities:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    setShareProjects(function(list){return[p].concat(list||[]);});
    syncShareProjectToCloud(p);
    setShareSelectedProjectId(p.id);
    setShareProjectTab("attivita");
    return p;
  }
  function updateShareProject(pid,fn){setShareProjects(function(list){return(list||[]).map(function(p){if(String(p.id)!==String(pid))return p;var updated=fn(p);syncShareProjectToCloud(updated);return updated;});});}
  function deleteShareProject(pid){setShareProjects(function(list){return(list||[]).filter(function(p){return String(p.id)!==String(pid);});});deleteDoc(doc(fbDb,"shareProjects",String(pid))).catch(function(){});if(String(shareSelectedProjectId)===String(pid))setShareSelectedProjectId(null);setToast("Progetto Share eliminato");}
  function SharePanel(){
    function L(s){return translateUiRuntimeText(s);}
    var projects=shareProjects||[];
    var shareProjectLimitReached=!canAddPlanItem("shareProjects",projects.length,1);
    var selected=projects.find(function(p){return p.id===shareSelectedProjectId;})||projects[0]||null;
    var participants=selected?(selected.participants||[]):[];
    var activeParticipants=participants.filter(function(p){return p.status!=="archived";});
    var [newPersonName,setNewPersonName]=useState("");
    var [newPersonEmail,setNewPersonEmail]=useState("");
    var [personMode,setPersonMode]=useState("user");
    var [shareAmount,setShareAmount]=useState("");
    var [shareDesc,setShareDesc]=useState("");
    var [sharePaidBy,setSharePaidBy]=useState("me");
    var [shareDate,setShareDate]=useState(todayStr());
    var [splitMode,setSplitMode]=useState("equal");
    var [splitDraft,setSplitDraft]=useState({});
    var [shareSplitTouched,setShareSplitTouched]=useState(false);
    var [shareParticipantIds,setShareParticipantIds]=useState([]);
    var [shareEditingActivityId,setShareEditingActivityId]=useState(null);
    var [projectNameDraft,setProjectNameDraft]=useState(selected?selected.name||"":"");
    var [projectDescDraft,setProjectDescDraft]=useState(selected?selected.description||"":"");
    var [projectEditingDetails,setProjectEditingDetails]=useState(false);
    var [showNewProjectForm,setShowNewProjectForm]=useState(false);
    var [newProjectName,setNewProjectName]=useState("");
    var [newProjectDesc,setNewProjectDesc]=useState("");
    var [settlementFrom,setSettlementFrom]=useState("me");
    var [settlementTo,setSettlementTo]=useState("");
    var [settlementAmount,setSettlementAmount]=useState("");
    var [settlementDate,setSettlementDate]=useState(todayStr());
    var [participantBusy,setParticipantBusy]=useState(false);
    var [shareReceiptOpen,setShareReceiptOpen]=useState(false);
    var sinp={width:"100%",borderRadius:10,border:"1px solid "+borderC,padding:"9px 11px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:textC,boxSizing:"border-box"};
    useEffect(function(){setProjectNameDraft(selected?selected.name||"":"");setProjectDescDraft(selected?selected.description||"":"");setProjectEditingDetails(false);setShareEditingActivityId(null);},[selected?selected.id:null]);
    useEffect(function(){var ids=activeParticipants.map(function(p){return p.id;});setShareParticipantIds(function(list){var clean=(list||[]).filter(function(id){return ids.includes(id);});return clean.length?clean:ids;});},[selected?selected.id:null,activeParticipants.map(function(p){return p.id;}).join("|")]);
    function resetShareExpenseForm(){setShareAmount("");setShareDesc("");setShareDate(todayStr());setSplitDraft({});setShareSplitTouched(false);setShareEditingActivityId(null);setShareParticipantIds(activeParticipants.map(function(p){return p.id;}));}
    function personLabel(p){return p&&p.uid===userId?((currentUser&&currentUser.name)||p.name||"Nome"):p.name;}
    var currentShareMember=(participants||[]).find(function(p){return p.uid===userId;})||(participants||[]).find(function(p){return p.id==="me";});
    var currentShareMemberId=currentShareMember?currentShareMember.id:"me";
    useEffect(function(){var ids=activeParticipants.map(function(p){return p.id;});if(ids.length&&!ids.includes(sharePaidBy))setSharePaidBy(currentShareMemberId&&ids.includes(currentShareMemberId)?currentShareMemberId:ids[0]);},[selected?selected.id:null,activeParticipants.map(function(p){return p.id;}).join("|"),currentShareMemberId]);
    function saveProjectDetails(){if(!selected)return;var v=(projectNameDraft||"").trim()||"Progetto";var d=(projectDescDraft||"").trim();updateShareProject(selected.id,function(p){return{...p,name:v,description:d,updatedAt:new Date().toISOString()};});setProjectEditingDetails(false);setToast("Progetto Share aggiornato");}
  function createProjectFromDraft(){if(shareProjectLimitReached){setToast({text:L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione."),type:"error",color:"#E24B4A",icon:"🚫"});return;}var v=(newProjectName||"").trim();var d=(newProjectDesc||"").trim();if(!v){setToast("Inserisci il nome del progetto Share");return;}var p=createShareProject(v,d);if(p){setShowNewProjectForm(false);setNewProjectName("");setNewProjectDesc("");setToast("Progetto Share creato");}}
  function requestDeleteProject(pid){if(!pid)return;if(!window.confirm(L("Eliminare il progetto Share?")))return;deleteShareProject(pid);}
    function saveNewShareProject(){if(shareProjectLimitReached){setToast({text:L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione."),type:"error",color:"#E24B4A",icon:"🚫"});return;}var name=(newProjectName||"").trim();if(!name){setToast("Inserisci il nome del progetto Share");return;}var created=createShareProject(name,(newProjectDesc||"").trim());if(created){setNewProjectName("");setNewProjectDesc("");setShowNewProjectForm(false);setToast("Progetto Share creato");}}
    async function addParticipant(){
      if(!selected||participantBusy)return;
      var name=newPersonName.trim();var email=normalizeEmail(newPersonEmail);
      if(personMode==="fake"){
        if(!name){setToast({text:"Inserisci il nome della persona esterna",type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}
        var fakeItem={id:"p_"+Date.now(),name:name,email:"",kind:"fake",type:"fake",role:"member",status:"active"};
        updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([fakeItem])};});
        setNewPersonName("");setNewPersonEmail("");setToast("Persona esterna aggiunta");return;
      }
      if(!email){setToast({text:"Inserisci l'email dell'utente",type:"warning",color:"#EF9F27",icon:"⚠️"});return;}
      setParticipantBusy(true);
      try{
        var foundUser=null;
        var userSnap=await getDocs(query(collection(fbDb,"users"),where("email","==",email),limit(1))).catch(function(){return null;});
        if(userSnap&&userSnap.docs&&userSnap.docs.length){var d=userSnap.docs[0];foundUser={uid:d.id,...d.data()};}
        name=foundUser?(foundUser.name||foundUser.displayName||email):email;
        var item={id:"p_"+Date.now(),uid:foundUser?foundUser.uid:null,name:name,email:email,kind:foundUser?"registered":"invited",type:foundUser?"registered":"invited",role:"member",status:"pending"};
        updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([item])};});
        await createShareInvite(selected,item,email,name,foundUser);
        setNewPersonName("");setNewPersonEmail("");
        setToast(foundUser?"Invito Share inviato correttamente.":"Invito creato: email inviata. Quando l'utente si registra con questa email, troverà l'invito.");
      }catch(e){console.error(e);setToast("Errore durante la creazione dell'invito");}
      finally{setParticipantBusy(false);}
    }
    function removeParticipant(pid){if(!selected||pid==="me")return;if(!window.confirm(L("Eliminare questa persona dal progetto Share?")))return;updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).filter(function(x){return x.id!==pid;})};});setToast("Partecipante eliminato");}
    function archiveParticipant(pid){if(!selected||pid==="me")return;if(!window.confirm(L("Archiviare questa persona dal progetto Share?")))return;updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).map(function(x){return x.id===pid?{...x,status:"archived"}:x;})};});setToast("Partecipante archiviato");}
    function restoreParticipant(pid){if(!selected||pid==="me")return;updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).map(function(x){return x.id===pid?{...x,status:"active"}:x;})};});}
    function shareRound(v){return Math.round((Number(v)||0)*100)/100;}
    function selectedShareIds(){var activeIds=activeParticipants.map(function(p){return p.id;});return (shareParticipantIds&&shareParticipantIds.length?shareParticipantIds:activeIds).filter(function(id){return activeIds.includes(id);});}
    function computeShares(){
      var amount=shareRound(parseFloat(shareAmount)||0);var ids=selectedShareIds();var shares={};
      if(!ids.length)return shares;
      if(splitMode==="equal"){var remaining=amount;ids.forEach(function(id,i){var value=i===ids.length-1?remaining:shareRound(amount/ids.length);shares[id]=shareRound(value);remaining=shareRound(remaining-value);});}
      else if(splitMode==="percent"){ids.forEach(function(id){shares[id]=shareRound(amount*((parseFloat(splitDraft[id])||0)/100));});}
      else{ids.forEach(function(id){shares[id]=shareRound(parseFloat(splitDraft[id])||0);});}
      return shares;
    }
    function shareValidation(){
      var amount=shareRound(parseFloat(shareAmount)||0);var ids=selectedShareIds();
      if(!amount||amount<=0)return{ok:false,blocking:false,message:""};
      if(!ids.length)return{ok:false,blocking:true,message:L("Seleziona almeno un partecipante con cui condividere la spesa.")};
      if(splitMode==="percent"){
        var pct=ids.reduce(function(a,id){return a+(parseFloat(splitDraft[id])||0);},0);var pctDiff=shareRound(100-pct);
        if(Math.abs(pctDiff)>0.009){var moneyDiff=shareRound(amount*(pctDiff/100));return{ok:false,blocking:true,message:pctDiff>0?(lang==="es"?"Falta todavía el "+pctDiff.toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+") para llegar al 100%.":lang==="en"?"Still missing "+pctDiff.toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+") to reach 100%.":"Manca ancora il "+pctDiff.toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+") per arrivare al 100%."):(lang==="es"?"Has superado el 100% en "+Math.abs(pctDiff).toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+").":lang==="en"?"You exceeded 100% by "+Math.abs(pctDiff).toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+").":"Hai superato il 100% di "+Math.abs(pctDiff).toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+").")};}
      }
      if(splitMode==="amount"){
        var sum=ids.reduce(function(a,id){return a+shareRound(parseFloat(splitDraft[id])||0);},0);var diff=shareRound(amount-sum);
        if(Math.abs(diff)>0.009)return{ok:false,blocking:true,message:diff>0?(lang==="es"?"Faltan todavía "+fmt(Math.abs(diff))+" para llegar al total.":lang==="en"?"Still missing "+fmt(Math.abs(diff))+" to reach the total.":"Mancano ancora "+fmt(Math.abs(diff))+" per arrivare al totale."):(lang==="es"?"Has superado el total en "+fmt(Math.abs(diff))+".":lang==="en"?"You exceeded the total by "+fmt(Math.abs(diff))+".":"Hai superato il totale di "+fmt(Math.abs(diff))+".")};
      }
      return{ok:true,blocking:false,message:""};
    }
    function saveShareReceiptFromScan(item){
      if(!selected)return false;
      var lim=(PLAN_LIMITS[currentPlan]&&PLAN_LIMITS[currentPlan].shareReceiptScans)||0;
      var today=todayUsageKey();
      var count=(shareReceiptUploads||[]).filter(function(r){return String(r.dateKey||"")===today;}).length;
      if(lim!==Infinity&&count>=lim){setToast({text:L("Hai raggiunto il limite scontrini Share del tuo piano."),type:"error",color:"#E24B4A",icon:"🚫"});return false;}
      setShareAmount(String(item.amount||""));setShareDesc(item.desc||L("Scontrino Share"));setShareDate(item.date||todayStr());
      var retention=(PLAN_LIMITS[currentPlan]&&PLAN_LIMITS[currentPlan].shareReceiptRetentionMonths)||0;
      var rec={id:"shr_receipt_"+Date.now(),projectId:String(selected.id),dateKey:today,amount:Number(item.amount||0),desc:item.desc||L("Scontrino Share"),date:item.date||todayStr(),createdAt:new Date().toISOString(),expiresAt:retention?dateOffset(-1*0):"",retentionMonths:retention};
      if(currentPlan==="premium")rec.expiresAt=new Date(new Date().setMonth(new Date().getMonth()+6)).toISOString().slice(0,10);
      setShareReceiptUploads(function(list){return [rec].concat(list||[]);});
      setShareReceiptOpen(false);
      setToast({text:L(currentPlan==="premium"?"Scontrino Share salvato nel progetto per 6 mesi":"Scontrino Share letto. Nel piano attuale l'immagine non viene conservata nel progetto."),type:"success",icon:"🧾"});
      return false;
    }

    function addSharedActivity(){
      if(!selected)return;var shareTodayCount=(selected.activities||[]).filter(function(a){return a.kind!=="settlement"&&a.createdAt&&String(a.createdAt).slice(0,10)===todayUsageKey();}).length;if(!shareEditingActivityId&&!canAddPlanItem("shareDailyExpenses",shareTodayCount,1)){setToast({text:upgradeMessage("shareDailyExpenses",shareTodayCount),type:"error",color:"#E24B4A",icon:"🚫"});return;}if(!shareAmount||parseFloat(shareAmount)<=0){setToast({text:"Inserisci l'importo della spesa",type:"error",color:"#FDECEC",icon:"🚫",textColor:"#E24B4A"});return;}
      var validation=shareValidation();if(validation.blocking){setToast(validation.message);return;}
      var shares=computeShares();
      if(!Object.keys(shares).length){setToast("Seleziona almeno un partecipante con cui condividere");return;}
      var previous=shareEditingActivityId?((selected.activities||[]).find(function(x){return String(x.id)===String(shareEditingActivityId);})||{}):{};
      var activity={id:shareEditingActivityId||Date.now(),kind:"expense",amount:shareRound(parseFloat(shareAmount)),desc:shareDesc||"Spesa condivisa",paidBy:sharePaidBy,date:shareDate,time:shareEditingActivityId?(previous.time||new Date().toTimeString().slice(0,5)):new Date().toTimeString().slice(0,5),shares:shares,splitMode:splitMode,sharedWith:Object.keys(shares),createdAt:shareEditingActivityId?(previous.createdAt||new Date().toISOString()):new Date().toISOString(),updatedAt:new Date().toISOString()};
      function saveShareActivity(){
        if(!shareEditingActivityId)consumePlanFeature("shareDailyExpenses",1);
        updateShareProject(selected.id,function(p){
          if(shareEditingActivityId){return{...p,activities:(p.activities||[]).map(function(a){return String(a.id)===String(shareEditingActivityId)?activity:a;})};}
          return{...p,activities:[activity].concat(p.activities||[])};
        });
        resetShareExpenseForm();setToast(shareEditingActivityId?L("Spesa Share aggiornata"):successToastForFeature("shareDailyExpenses",L("Spesa Share aggiunta"),planCount(featureUsageKey("shareDailyExpenses"))+1));
      }
      if(!shareEditingActivityId){
        var slim=featureLimits("shareDailyExpenses");
        if(slim.total!==Infinity&&shareTodayCount>=Number(slim.included||0)){
          if(shareTodayCount>=Number(slim.total||0)){setToast({text:upgradeMessage("shareDailyExpenses",shareTodayCount),type:"error",color:"#E24B4A",icon:"🚫"});return;}
          showRewardedAdForExtraMovement(function(){planInc(featureExtraKey("shareDailyExpenses"),1);saveShareActivity();});return;
        }
      }
      saveShareActivity();
    }
    function startEditSharedActivity(a){
      if(!a||a.kind==="settlement")return;
      var amt=shareRound(Number(a.amount||0));
      setShareEditingActivityId(a.id);
      setShareAmount(String(amt||""));
      setShareDesc(a.desc||"");
      setSharePaidBy(a.paidBy||currentShareMemberId||"me");
      setShareDate(a.date||todayStr());
      var ids=Object.keys(a.shares||{});
      setShareParticipantIds(ids.length?ids:activeParticipants.map(function(p){return p.id;}));
      var mode=a.splitMode||"amount";
      setSplitMode(mode);
      var draft={};
      if(mode==="percent"){ids.forEach(function(id){draft[id]=amt?String(shareRound((Number(a.shares[id]||0)/amt)*100)):"";});}
      else if(mode==="amount"){ids.forEach(function(id){draft[id]=String(shareRound(Number(a.shares[id]||0)));});}
      else {draft={};}
      setSplitDraft(draft);
      setShareSplitTouched(false);
      setShareProjectTab("attivita");
    }
    function addSettlement(){
      if(!selected)return;if(!settlementAmount||parseFloat(settlementAmount)<=0)return;
      var activity={id:Date.now(),kind:"settlement",amount:parseFloat(settlementAmount),from:settlementFrom,to:settlementTo||"me",date:settlementDate,time:new Date().toTimeString().slice(0,5),desc:"Saldo tra partecipanti",createdAt:new Date().toISOString()};
      updateShareProject(selected.id,function(p){return{...p,activities:[activity].concat(p.activities||[])};});
      setSettlementAmount("");setToast("Saldo registrato");
    }
    function deleteActivity(aid){if(!selected)return;if(!window.confirm(L("Eliminare questa spesa Share?")))return;updateShareProject(selected.id,function(p){return{...p,activities:(p.activities||[]).filter(function(a){return a.id!==aid;})};});setToast("Spesa Share eliminata");}
    function balances(){
      var bal={};participants.forEach(function(p){bal[p.id]=0;});
      ((selected&&selected.activities)||[]).forEach(function(a){
        if(a.kind==="settlement"){bal[a.from]=(bal[a.from]||0)+Number(a.amount||0);bal[a.to]=(bal[a.to]||0)-Number(a.amount||0);return;}
        var paid=a.paidBy||"me";bal[paid]=(bal[paid]||0)+Number(a.amount||0);
        Object.keys(a.shares||{}).forEach(function(pid){bal[pid]=(bal[pid]||0)-Number(a.shares[pid]||0);});
      });
      return bal;
    }
    function simplifiedDebts(){
      var b=balances();var debtors=[],creditors=[];Object.keys(b).forEach(function(k){var v=Math.round(b[k]*100)/100;if(v< -0.009)debtors.push({id:k,amount:-v});if(v>0.009)creditors.push({id:k,amount:v});});
      var rows=[];debtors.forEach(function(d){creditors.forEach(function(c){if(d.amount<=0||c.amount<=0)return;var x=Math.min(d.amount,c.amount);rows.push({from:d.id,to:c.id,amount:Math.round(x*100)/100});d.amount-=x;c.amount-=x;});});return rows;
    }
    var b=selected?balances():{};var debts=selected?simplifiedDebts():[];var totalSpent=selected?(selected.activities||[]).filter(function(a){return a.kind!=="settlement";}).reduce(function(a,x){return a+Number(x.amount||0);},0):0;
    var myBalance=b[currentShareMemberId]||0;
    var shareCheck=shareValidation();
    var showShareCheck=shareCheck.blocking&&(shareSplitTouched||Object.keys(splitDraft||{}).some(function(k){return String(splitDraft[k]||"").trim()!=="";}));
    var tabs=[{id:"attivita",label:L("Attività")},{id:"partecipanti",label:L("Partecipanti")},{id:"riassunto",label:L("Riassunto")},{id:"saldi",label:L("Saldi")}];
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div><div style={{fontSize:20,fontWeight:900,color:textC}}>Share</div><div style={{fontSize:12,color:subC}}>{L("Progetti, spese condivise e saldi")}</div></div><Btn onClick={function(){if(shareProjectLimitReached)return;setShowNewProjectForm(true);setNewProjectName("");setNewProjectDesc("");}} bg={shareProjectLimitReached?"#999":confirmButtonColor} disabled={shareProjectLimitReached}>{L("+ Progetto")}</Btn></div>
      {shareProjectLimitReached&&<div style={{background:dark?"#342b16":"#FFF8E1",border:"1px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:16,padding:14,color:dark?"#FFE5A6":"#856404",fontSize:13,fontWeight:800,lineHeight:1.4}}>⚠️ {L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione.")}</div>}
      {showNewProjectForm&&!shareProjectLimitReached&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:10}}><div style={{fontSize:14,fontWeight:900,color:textC}}>{L("Nuovo progetto Share")}</div><input placeholder={L("Nome progetto")} value={newProjectName} onChange={function(e){setNewProjectName(e.target.value);}} style={sinp}/><textarea placeholder={L("Descrizione progetto (opzionale)")} value={newProjectDesc} onChange={function(e){setNewProjectDesc(e.target.value);}} style={{...sinp,minHeight:72,resize:"vertical"}}/><div style={{display:"flex",gap:8}}><Btn onClick={saveNewShareProject} bg={confirmButtonColor}>{L("Salva progetto")}</Btn><Btn onClick={function(){setShowNewProjectForm(false);setNewProjectName("");setNewProjectDesc("");}} bg={dark?"#333":"#f0f0f0"} color={textC}>{L("Annulla")}</Btn></div></div>}
      {(shareReceivedInvites||[]).length>0&&<div style={{background:confirmButtonColor+"18",border:"1px solid "+confirmButtonColor+"55",borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><div style={{fontSize:14,fontWeight:900,color:textC}}>{L("Inviti ricevuti")}</div><div style={{fontSize:12,color:subC}}>{L("Accetta o rifiuta gli inviti ai progetti Share.")}</div></div><button onClick={loadShareCollaboration} style={{background:"transparent",border:"1px solid "+borderC,borderRadius:10,padding:"6px 9px",color:subC,cursor:"pointer"}}>{shareInviteLoading?"...":"↻"}</button></div>{shareReceivedInvites.map(function(inv){return <div key={inv.id} style={{background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{flex:1,minWidth:160}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{inv.projectName||"Progetto Share"}</div><div style={{fontSize:11,color:subC}}>Invito da {inv.invitedByName||"utente fAInance"}</div></div><Btn onClick={function(){acceptShareInvite(inv);}} bg={confirmButtonColor} style={{padding:"7px 10px",fontSize:12}}>{L("Accetta")}</Btn><Btn onClick={function(){declineShareInvite(inv);}} bg={dark?"#333":"#f0f0f0"} color={textC} style={{padding:"7px 10px",fontSize:12}}>{L("Rifiuta")}</Btn></div>;})}</div>}
      {projects.length===0&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:22,textAlign:"center",color:subC}}><div style={{fontSize:34,marginBottom:8}}>🤝</div><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:5}}>{L("Nessun progetto Share")}</div><div style={{fontSize:12}}>{L("Crea un progetto per inserire partecipanti, movimenti e saldi.")}</div></div>}
      {projects.length>0&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>{projects.map(function(p){var active=selected&&selected.id===p.id;return <button key={p.id} onClick={function(){setShareSelectedProjectId(p.id);setShareProjectTab("attivita");}} style={{flex:"0 0 auto",border:"1px solid "+(active?confirmButtonColor:borderC),background:active?confirmButtonColor:"transparent",color:active?"#fff":textC,borderRadius:14,padding:"9px 12px",cursor:"pointer",fontSize:13,fontWeight:800}}>{p.name||"Progetto"}</button>;})}</div>}
      {selected&&<>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>{projectEditingDetails?<div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}><input value={projectNameDraft} onChange={function(e){setProjectNameDraft(e.target.value);}} style={{...sinp,fontSize:17,fontWeight:900}}/><textarea placeholder={L("Descrizione progetto (opzionale)")} value={projectDescDraft} onChange={function(e){setProjectDescDraft(e.target.value);}} style={{...sinp,minHeight:72,resize:"vertical"}}/><div style={{display:"flex",gap:8}}><Btn onClick={saveProjectDetails} bg={confirmButtonColor}>{L("Salva modifiche")}</Btn><Btn onClick={function(){setProjectNameDraft(selected?selected.name||"":"");setProjectDescDraft(selected?selected.description||"":"");setProjectEditingDetails(false);}} bg={dark?"#333":"#f0f0f0"} color={textC}>{L("Annulla")}</Btn></div></div>:<div style={{flex:1,minWidth:0}}><div style={{fontSize:17,fontWeight:900,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name||"Progetto"}</div>{selected.description&&<div style={{fontSize:12,color:subC,marginTop:4,whiteSpace:"pre-wrap"}}>{selected.description}</div>}</div>}<button onClick={function(){setProjectEditingDetails(true);setProjectNameDraft(selected?selected.name||"":"");setProjectDescDraft(selected?selected.description||"":"");}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",color:confirmButtonColor,borderRadius:10,padding:"8px 10px",cursor:"pointer"}}>✏</button><button onClick={function(){requestDeleteProject(selected.id);}} style={{background:"#fff0f0",border:"1px solid #ffd0d0",color:expenseColor,borderRadius:10,padding:"8px 10px",cursor:"pointer"}}>🗑</button></div>
          <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}>{tabs.map(function(tb){return <button key={tb.id} onClick={function(){setShareProjectTab(tb.id);}} style={{flex:1,border:"none",borderRadius:10,padding:"8px 4px",background:shareProjectTab===tb.id?confirmButtonColor:"transparent",color:shareProjectTab===tb.id?"#fff":subC,fontSize:12,fontWeight:shareProjectTab===tb.id?800:600,cursor:"pointer"}}>{tb.label}</button>;})}</div>
        </div>
        {shareProjectTab==="attivita"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div id="share_expense_form" style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><div style={{fontSize:14,fontWeight:900,color:textC}}>{L(shareEditingActivityId?"Modifica spesa condivisa":"+ Spesa condivisa")}</div>{shareEditingActivityId&&<button onClick={resetShareExpenseForm} style={{background:"transparent",border:"1px solid "+borderC,borderRadius:9,padding:"6px 8px",fontSize:12,color:subC,cursor:"pointer"}}>{L("Annulla modifica")}</button>}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 2fr 1fr",gap:8}}><input type="number" placeholder={L("Importo")} value={shareAmount} onChange={function(e){setShareAmount(e.target.value);}} style={sinp}/><input placeholder={L("Descrizione")} value={shareDesc} onChange={function(e){setShareDesc(e.target.value);}} style={sinp}/><input type="date" value={shareDate} onChange={function(e){setShareDate(e.target.value);}} style={sinp}/></div><div style={{marginTop:8,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}><button onClick={function(){setShareReceiptOpen(!shareReceiptOpen);}} style={{border:"1px solid "+borderC,borderRadius:10,background:shareReceiptOpen?confirmButtonColor:(dark?"#252535":"#fff"),color:shareReceiptOpen?"#fff":textC,padding:"8px 10px",fontSize:12,fontWeight:900,cursor:"pointer"}}>🧾 {L("Leggi scontrino Share")}</button><span style={{fontSize:11,color:subC}}>{L("Gratis 1, Base 2, Completo illimitati. Conservazione 6 mesi solo Completo.")}</span></div>{shareReceiptOpen&&<div style={{marginTop:8,border:"1px solid "+borderC,borderRadius:14,padding:10,background:dark?"#252535":"#f9f9f9"}}><ReceiptScanPanel onSave={saveShareReceiptFromScan} shareMode/></div>}<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.4fr",gap:8,marginTop:8}}><select value={sharePaidBy} onChange={function(e){setSharePaidBy(e.target.value);}} style={sinp}>{activeParticipants.map(function(p){return <option key={p.id} value={p.id}>{L("Pagato da")} {personLabel(p)}</option>;})}</select><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{[{id:"equal",label:L("Equa")},{id:"percent",label:L("Percentuali")},{id:"amount",label:L("Importi")}].map(function(m){return <button key={m.id} onClick={function(){setSplitMode(m.id);setSplitDraft({});setShareSplitTouched(false);}} style={{border:"1px solid "+(splitMode===m.id?confirmButtonColor:borderC),background:splitMode===m.id?confirmButtonColor:"transparent",color:splitMode===m.id?"#fff":textC,borderRadius:10,padding:"8px 6px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{m.label}</button>;})}</div></div><div style={{marginTop:10,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:12,padding:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8}}><div style={{fontSize:12,fontWeight:900,color:textC}}>{L("Condivisa con")}</div><label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:subC,cursor:"pointer"}}><input type="checkbox" checked={activeParticipants.length>0&&shareParticipantIds.length===activeParticipants.length} onChange={function(){var all=activeParticipants.map(function(p){return p.id;});setShareParticipantIds(shareParticipantIds.length===all.length?[]:all);}}/>{L("Tutti")}</label></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{activeParticipants.map(function(p){var checked=shareParticipantIds.includes(p.id);return <label key={p.id} style={{display:"flex",alignItems:"center",gap:6,border:"1px solid "+(checked?confirmButtonColor:borderC),background:checked?confirmButtonColor+"22":"transparent",borderRadius:20,padding:"5px 9px",fontSize:12,color:checked?confirmButtonColor:textC,cursor:"pointer"}}><input type="checkbox" checked={checked} onChange={function(){setShareParticipantIds(function(list){return list.includes(p.id)?list.filter(function(x){return x!==p.id;}):list.concat([p.id]);});}}/>{personLabel(p)}</label>;})}</div></div>{splitMode!=="equal"&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginTop:8}}>{activeParticipants.filter(function(p){return shareParticipantIds.includes(p.id);}).map(function(p){return <div key={p.id}><label style={{fontSize:11,color:subC}}>{personLabel(p)} {splitMode==="percent"?"%":"€"}</label><input type="number" value={splitDraft[p.id]||""} onChange={function(e){var v=e.target.value;setShareSplitTouched(true);setSplitDraft(function(d){return{...d,[p.id]:v};});}} style={sinp}/></div>;})}</div>}{showShareCheck&&<div style={{marginTop:10,background:dark?"#2f2a1e":"#fff8e6",border:"1px solid #F2C94C77",borderRadius:12,padding:"9px 10px",fontSize:12,color:dark?"#F2C94C":"#8A6500",fontWeight:600}}>💡 {shareCheck.message}</div>}<div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{fontSize:12,color:subC}}>{L("Quote")}: {Object.keys(computeShares()).map(function(id){var p=participants.find(function(x){return x.id===id;});return (p?personLabel(p):id)+" "+fmt(computeShares()[id]);}).join(" · ")}</div><Btn onClick={addSharedActivity} bg={showShareCheck?"#999":confirmButtonColor} disabled={showShareCheck}>{L(shareEditingActivityId?"Aggiorna spesa":"Salva spesa")}</Btn></div></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Attività del progetto")}</div>{(selected.activities||[]).length===0&&<div style={{fontSize:13,color:subC,textAlign:"center",padding:"18px 0"}}>{L("Nessuna attività")}</div>}{(selected.activities||[]).map(function(a){var paid=participants.find(function(p){return p.id===a.paidBy;});var from=participants.find(function(p){return p.id===a.from;});var to=participants.find(function(p){return p.id===a.to;});var editing=shareEditingActivityId===a.id&&a.kind!=="settlement";return <div key={a.id} style={{borderBottom:"1px solid "+borderC,padding:"10px 0"}}>{editing?<div style={{background:dark?"#1e1e30":"#F7F8FF",border:"1px solid "+confirmButtonColor+"55",borderRadius:14,padding:12,display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{L("Modifica spesa Share")}</div><button onClick={resetShareExpenseForm} style={{background:"transparent",border:"none",color:subC,cursor:"pointer",fontSize:18}}>×</button></div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 2fr 1fr",gap:8}}><input type="number" value={shareAmount} onChange={function(e){setShareAmount(e.target.value);}} style={sinp} placeholder={L("Importo")}/><input value={shareDesc} onChange={function(e){setShareDesc(e.target.value);}} style={sinp} placeholder={L("Descrizione")}/><input type="date" value={shareDate} onChange={function(e){setShareDate(e.target.value);}} style={sinp}/></div><select value={sharePaidBy} onChange={function(e){setSharePaidBy(e.target.value);}} style={sinp}>{activeParticipants.map(function(p){return <option key={p.id} value={p.id}>{L("Pagata da")} {personLabel(p)}</option>;})}</select><div style={{fontSize:11,color:subC}}>{L("La modifica viene salvata direttamente su questa transazione.")}</div><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn onClick={resetShareExpenseForm} bg={dark?"#333":"#f0f0f0"} color={textC}>{L("Annulla")}</Btn><Btn onClick={addSharedActivity} bg={confirmButtonColor}>{L("Salva modifica")}</Btn></div></div>:<div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18}}>{a.kind==="settlement"?"↔️":"🧾"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.kind==="settlement"?((from?personLabel(from):a.from)+" "+L("ha pagato")+" "+(to?personLabel(to):a.to)):a.desc}</div><div style={{fontSize:11,color:subC}}>{fmtDate(a.date,dateFmt)} · {a.time||"--:--"}</div>{a.kind!=="settlement"&&<div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:11,color:textC,fontWeight:700}}>{L("Pagata da")}: {paid?personLabel(paid):(a.paidBy||"—")}</div><div style={{fontSize:11,color:subC}}>{L("Condivisa con")}: {Object.keys(a.shares||{}).map(function(pid){var pp=participants.find(function(x){return x.id===pid;});return (pp?personLabel(pp):pid)+" "+fmt(a.shares[pid]);}).join(" · ")||"—"}</div></div>}</div><div style={{fontSize:13,fontWeight:900,color:a.kind==="settlement"?confirmButtonColor:expenseColor}}>{fmt(a.amount)}</div>{a.kind!=="settlement"&&<button onClick={function(){startEditSharedActivity(a);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",borderRadius:9,padding:"5px 8px",cursor:"pointer",color:confirmButtonColor,fontSize:12,fontWeight:800}}>{L("Modifica")}</button>}<button onClick={function(){deleteActivity(a.id);}} style={{background:"none",border:"none",cursor:"pointer",color:subC}}>×</button></div>}</div>;})}</div>
        </div>}
        {shareProjectTab==="partecipanti"&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Partecipanti")}</div>{participants.map(function(p){return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+borderC,opacity:p.status==="archived"?0.55:1}}><div style={{width:34,height:34,borderRadius:"50%",background:confirmButtonColor+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:confirmButtonColor}}>{personLabel(p).slice(0,1).toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{personLabel(p)}</div><div style={{fontSize:11,color:subC}}>{L(p.kind==="fake"?"Persona esterna":p.kind==="registered"?"Utente fAInance":"Invito in attesa")}{p.email?" · "+p.email:""}{p.status==="pending"?" · "+L("pendente"):""}{p.status==="archived"?" · "+L("archiviato"):""}</div></div>{p.id!=="me"&&<div style={{display:"flex",gap:5}}>{p.status==="archived"?<button onClick={function(){restoreParticipant(p.id);}} style={{background:"#eef8f4",border:"1px solid #bdebdc",borderRadius:8,color:incomeColor,padding:"5px 7px"}}>{L("Ripristina")}</button>:<button onClick={function(){archiveParticipant(p.id);}} style={{background:"#fff8e1",border:"1px solid #ffe29a",borderRadius:8,color:"#9a6a00",padding:"5px 7px"}}>{L("Archivia")}</button>}<button onClick={function(){removeParticipant(p.id);}} style={{background:"#fff0f0",border:"1px solid #ffd0d0",borderRadius:8,color:expenseColor,padding:"5px 7px"}}>{L("Elimina")}</button></div>}</div>;})}</div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Aggiungi partecipante")}</div><div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:10,padding:3,marginBottom:10}}>{[{id:"user",label:L("Utente")},{id:"fake",label:L("Persona esterna")}].map(function(m){return <button key={m.id} onClick={function(){setPersonMode(m.id);}} style={{flex:1,border:"none",borderRadius:8,padding:"7px",background:personMode===m.id?confirmButtonColor:"transparent",color:personMode===m.id?"#fff":subC,fontSize:12,fontWeight:800}}>{m.label}</button>;})}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr auto",gap:8}}>{personMode==="fake"?<input placeholder={L("Nome persona esterna")} value={newPersonName} onChange={function(e){setNewPersonName(e.target.value);}} style={sinp}/>:<input placeholder={L("Email utente")} value={newPersonEmail} onChange={function(e){setNewPersonEmail(e.target.value);}} style={sinp}/>}<Btn onClick={addParticipant} bg={confirmButtonColor} disabled={participantBusy}>{participantBusy?"...":L("Aggiungi")}</Btn></div><div style={{fontSize:11,color:subC,marginTop:8}}>{L("Utente richiede solo l'email: quando l'account viene collegato, verrà mostrato il nome reale. Persona esterna usa solo il nome e non riceve inviti.")}</div></div></div>}
        {shareProjectTab==="riassunto"&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Riassunto")}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10}}><StatCard title={L("Spese progetto")} value={fmt(totalSpent)} color={expenseColor} bg={expenseColor+"22"}/><StatCard title={L("Mi devono")} value={fmt(Math.max(0,myBalance))} color={incomeColor} bg={incomeColor+"22"}/><StatCard title={L("Devo")} value={fmt(Math.max(0,-myBalance))} color={expenseColor} bg={expenseColor+"22"}/></div><div style={{fontSize:12,color:subC,marginTop:12}}>{L("Questa sezione è secondaria: il flusso principale resta progetto → inserimento spesa.")}</div></div>}
        {shareProjectTab==="saldi"&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Chi deve soldi a chi")}</div>{debts.length===0&&<div style={{fontSize:13,color:subC,textAlign:"center",padding:"16px 0"}}>{L("Nessun saldo aperto")}</div>}{debts.map(function(d,i){var from=participants.find(function(p){return p.id===d.from;});var to=participants.find(function(p){return p.id===d.to;});return <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:13,color:textC,flex:1}}>{from?personLabel(from):d.from} {L("deve pagare")} {to?personLabel(to):d.to}</span><span style={{fontSize:14,fontWeight:900,color:confirmButtonColor}}>{fmt(d.amount)}</span></div>;})}</div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Registra saldo/rimborso")}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr auto",gap:8}}><select value={settlementFrom} onChange={function(e){setSettlementFrom(e.target.value);}} style={sinp}>{participants.map(function(p){return <option key={p.id} value={p.id}>{personLabel(p)}</option>;})}</select><select value={settlementTo} onChange={function(e){setSettlementTo(e.target.value);}} style={sinp}>{participants.map(function(p){return <option key={p.id} value={p.id}>{L("a")} {personLabel(p)}</option>;})}</select><input type="number" placeholder={L("Importo")} value={settlementAmount} onChange={function(e){setSettlementAmount(e.target.value);}} style={sinp}/><input type="date" value={settlementDate} onChange={function(e){setSettlementDate(e.target.value);}} style={sinp}/><Btn onClick={addSettlement} bg={confirmButtonColor}>{L("Registra")}</Btn></div></div></div>}
      </>}
    </div>;
  }

  function MorePanel(){
    function capMenuLabel(v){v=String(v||"");return v?v.charAt(0).toLocaleUpperCase()+v.slice(1):v;}
    var menuSubs={consulenteAI:translateUiRuntimeText("Analisi e domande"),patrimonio:translateUiRuntimeText("Asset, conti e storico"),budget:translateUiRuntimeText("Piano mensile e risparmio"),goals:translateUiRuntimeText("Risparmi e target"),alerts:translateUiRuntimeText("Soglie e avvisi"),share:translateUiRuntimeText("Progetti, costi condivisi e saldi"),appunti:translateUiRuntimeText("Note, documenti e coordinate"),settings:translateUiRuntimeText("Profilo, dati e preferenze")};
    var items=buildMobileMenuItems().map(function(item){return {...item,sub:menuSubs[item.id]||""};});
    return <div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{fontSize:20,fontWeight:900,color:textC}}>{translateUiRuntimeText("Altro")}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>{items.map(function(item){return <button key={item.id} onClick={function(){setTab(item.id);setSettingsPage(null);setMobileMenu(false);}} style={{position:"relative",textAlign:"left",background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:"15px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",color:textC,boxShadow:dark?"none":"0 4px 14px rgba(0,0,0,0.05)"}}><span style={{fontSize:24,width:32,textAlign:"center"}}>{item.icon}</span><span style={{flex:1}}><span style={{display:"block",fontSize:15,fontWeight:800}}>{capMenuLabel(item.label)}</span><span style={{display:"block",fontSize:12,color:subC,marginTop:2}}>{item.sub}</span></span>{item.badge>0&&<span style={{position:"absolute",right:12,top:12,background:expenseColor,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{item.badge}</span>}</button>;})}</div></div>;
  }
  // panelContent() is defined in sezioni.tsx and imported above
    function panelContent(){
    if(tab==="home")return <HomePanel/>;
    if(tab==="spese")return <SpesePanel/>;
    if(tab==="history")return <HistoryPanel/>;
    if(tab==="more")return <MorePanel/>;
    if(tab==="share")return <SharePanel/>;
    if(tab==="debtCredits")return <DebtCreditsPanel/>;
    if(tab==="shopping")return <ShoppingPanel/>;
    if(tab==="stats")return <StatsPanel/>;
    if(tab==="consulenteAI")return <ConsulenteAIPanel/>;
    if(tab==="budget")return <BudgetPlanPanel/>;
    if(tab==="goals")return <GoalsPanel/>;
    if(tab==="patrimonio")return <PatrimonioPanel/>;
    if(tab==="appunti")return <AppuntiPanel/>;
    if(tab==="alerts")return <AlertsPanel/>;
    if(tab==="settings")return <SettingsPanel/>;
    return null;
  }

  var mobileMain=buildBottomNavItems();

  return <AppCtx.Provider value={ctxValue}>
    {!firestoreReady?<div style={{position:"fixed",inset:0,background:dark?"#1a1a2e":"linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,zIndex:999}}><FAInanceLogo size={72}/><div style={{fontSize:13,color:dark?"#aaa":"#888"}}>Caricamento dati account...</div></div>:
    isMobile?
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:430,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column",background:bgColor,overflow:"hidden"}}>
      {(showAppSummaryHeader&&!(tab==="consulenteAI"&&aiTab==="chat"))&&<div style={{background:headerBg,borderBottom:"1px solid "+borderC,padding:"10px 16px 8px",flexShrink:0}}><div style={{fontSize:11,fontWeight:600,color:subC,marginBottom:4}}>fAInance</div><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:11,color:subC}}>{translateUiRuntimeText("Uscite")}</div><div style={{fontSize:19,fontWeight:600,color:expenseColor}}>{fmt(curMonthExp)}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:11,color:subC}}>{translateUiRuntimeText("Saldo")}</div><div style={{fontSize:17,fontWeight:600,color:BALANCE_COLOR}}>{fmt(curMonthInc-curMonthExp)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:11,color:subC}}>{translateUiRuntimeText("Entrate")}</div><div style={{fontSize:19,fontWeight:600,color:incomeColor}}>{fmt(curMonthInc)}</div></div></div></div>}
      <TopAdBox/>
      <div style={{flex:1,overflowY:"auto",padding:14}}><SectionErrorBoundary resetKey={tab+"|"+(settingsPage||"")} dark={dark} tr={translateUiRuntimeText} onHome={function(){setTab("home");setSettingsPage(null);setMobileMenu(false);}}>{panelContent()}</SectionErrorBoundary></div>
      {aiFloatingEnabled&&tab!=="settings"&&<FloatingAIButton/>}
      {voiceModal&&<VoiceEntryModal/>}
      <div style={{background:headerBg,borderTop:"1px solid "+borderC,display:"flex",flexShrink:0}}>{mobileMain.map(function(item){return <button key={item.id} onClick={function(){if(item.id==="voice"){openVoiceModal();setMobileMenu(false);}else if(item.id==="more"){setTab("more");setMobileMenu(function(s){return !s;});setSettingsPage(null);}else{setTab(item.id);setMobileMenu(false);setSettingsPage(null);}}} style={{flex:1,padding:"9px 2px",border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",color:(tab===item.id||(item.id==="more"&&tab==="more")||(item.id==="voice"&&voiceModal))?textC:subC,borderTop:(tab===item.id||(item.id==="more"&&tab==="more")||(item.id==="voice"&&voiceModal))?"2px solid "+(dark?"#eee":"#333"):"2px solid transparent"}}><span style={{fontSize:17}}>{item.icon}</span><span style={{fontSize:9,fontWeight:(tab===item.id||(item.id==="more"&&tab==="more")||(item.id==="voice"&&voiceModal))?500:400}}>{item.label}</span></button>;})}</div>
      {mobileMenu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={function(){setMobileMenu(false);}}><div style={{background:cardBg,borderRadius:"20px 20px 0 0",width:"100%",padding:"20px 16px 32px"}} onClick={function(e){e.stopPropagation();}}>{buildMobileMenuItems().map(function(item){return <button key={item.id} onClick={function(){setTab(item.id);setSettingsPage(null);setMobileMenu(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"14px 8px",border:"none",background:"transparent",borderBottom:"1px solid "+borderC,fontSize:15,cursor:"pointer",color:textC}}><span style={{fontSize:22}}>{item.icon}</span>{item.label}{item.badge>0&&<span style={{marginLeft:"auto",background:expenseColor,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>{item.badge}</span>}</button>;})}</div></div>}
      {isOffline&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:9998,background:"#E24B4A",color:"#fff",textAlign:"center",fontSize:13,fontWeight:700,padding:"6px 12px"}}>{L("Nessuna connessione. I dati verranno sincronizzati al ripristino della rete.")}</div>}
  {toast&&<Toast key={(toast&&toast.id)||String(toast)} msg={toast} onDone={function(){setToast(null);}}/>}
      {alertPopup&&alertPopup.length>0&&<AlertPopup newAlerts={alertPopup} onClose={function(list){markAlertsSeen(list||alertPopup);}}/>}
      {editingItem&&<EditModal item={editingItem.item} isExp={editingItem.isExp} onSave={function(updated){if(editingItem.isExp){setExpenses(expenses.map(function(e){return e.id===updated.id?updated:e;}));setToast("Spesa aggiornata");}else{setIncomes(incomes.map(function(i){return i.id===updated.id?updated:i;}));setToast("Entrata aggiornata");}setEditingItem(null);}} onClose={function(){setEditingItem(null);}}/>}
    </div>
    :
    <div style={{fontFamily:"system-ui,sans-serif",height:"100vh",display:"flex",flexDirection:"column",background:bgColor,overflow:"hidden"}}>
      {(showAppSummaryHeader&&!(tab==="consulenteAI"&&aiTab==="chat"))&&<div style={{background:headerBg,borderBottom:"1px solid "+borderC,padding:"10px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}><div style={{fontWeight:600,fontSize:15,color:textC}}>fAInance</div><div style={{display:"flex",gap:24}}>{[[translateUiRuntimeText("Uscite"),expenseColor,fmt(curMonthExp)],[translateUiRuntimeText("Saldo"),BALANCE_COLOR,fmt(curMonthInc-curMonthExp)],[translateUiRuntimeText("Entrate"),incomeColor,fmt(curMonthInc)]].map(function(item){return <div key={item[0]} style={{textAlign:"center"}}><div style={{fontSize:10,color:subC}}>{item[0]}</div><div style={{fontSize:16,fontWeight:600,color:item[1]}}>{item[2]}</div></div>;})}</div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:subC}}>{curYear}: {fmt(yearExp)} / {fmt(yearInc)}</span><Btn onClick={function(){exportToCSV(expenses,incomes,cats,methods,dateFmt);}} bg={incomeColor} style={{padding:"5px 10px",fontSize:11}}>CSV</Btn><Btn onClick={function(){exportToXLSX(expenses,incomes,cats,methods,dateFmt);}} bg="#217346" style={{padding:"5px 10px",fontSize:11}}>Excel</Btn></div></div>}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{width:220,background:sideBg,borderRight:"1px solid "+borderC,display:"flex",flexDirection:"column",padding:"16px 0",flexShrink:0,overflowY:"auto"}}>{navItems.map(function(item){return <button key={item.id} onClick={function(){if(item.id==="voice"){openVoiceModal();}else{setTab(item.id);if(item.id!=="settings")setSettingsPage(null);}}} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",border:"none",background:(tab===item.id||(item.id==="voice"&&voiceModal))?(dark?"#2a2a3e":"#f0f0f0"):"transparent",color:(tab===item.id||(item.id==="voice"&&voiceModal))?textC:subC,fontSize:14,cursor:"pointer",fontWeight:(tab===item.id||(item.id==="voice"&&voiceModal))?500:400,textAlign:"left",position:"relative"}}><span style={{fontSize:18}}>{item.icon}</span>{item.label}{item.badge>0&&<span style={{position:"absolute",right:14,background:expenseColor,color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500}}>{item.badge}</span>}</button>;})}</div>
        <div style={{flex:1,overflowY:"auto",padding:24}}><div style={{maxWidth:960,margin:"0 auto"}}><SectionErrorBoundary resetKey={tab+"|"+(settingsPage||"")} dark={dark} tr={translateUiRuntimeText} onHome={function(){setTab("home");setSettingsPage(null);setMobileMenu(false);}}>{panelContent()}</SectionErrorBoundary></div></div>
      </div>
      {aiFloatingEnabled&&tab!=="settings"&&<FloatingAIButton desktop/>}
      {voiceModal&&<VoiceEntryModal/>}
      {toast&&<Toast key={(toast&&toast.id)||String(toast)} msg={toast} onDone={function(){setToast(null);}}/>}
      {alertPopup&&alertPopup.length>0&&<AlertPopup newAlerts={alertPopup} onClose={function(list){markAlertsSeen(list||alertPopup);}}/>}
      {editingItem&&<EditModal item={editingItem.item} isExp={editingItem.isExp} onSave={function(updated){if(editingItem.isExp){setExpenses(expenses.map(function(e){return e.id===updated.id?updated:e;}));setToast("Spesa aggiornata");}else{setIncomes(incomes.map(function(i){return i.id===updated.id?updated:i;}));setToast("Entrata aggiornata");}setEditingItem(null);}} onClose={function(){setEditingItem(null);}}/>}
    </div>}
    {(!termsAccepted||!privacyAccepted)&&<TermsAcceptanceModal/>}
  </AppCtx.Provider>;
}

export default AppWithLogin;


// fAInance 1.6.31 - Debiti, Spesa e widget: traduzioni complete aggiuntive.
(function(){
  var LANGS=['it','en','es','fr','de','pt','pl','nl','ro','el'];
  function add(k,v){LANGS.forEach(function(c){var val=v[c]||v.en||v.it||k;if(!TRANSLATIONS[c])TRANSLATIONS[c]={};TRANSLATIONS[c][k]=val;try{if(typeof FAINANCE_UI_TRANSLATIONS!=='undefined'){if(!FAINANCE_UI_TRANSLATIONS[c])FAINANCE_UI_TRANSLATIONS[c]={};FAINANCE_UI_TRANSLATIONS[c][k]=val;}}catch(e){}try{if(typeof FAINANCE_I18N_PHRASES!=='undefined'){if(!FAINANCE_I18N_PHRASES[c])FAINANCE_I18N_PHRASES[c]={};FAINANCE_I18N_PHRASES[c][k]=val;}}catch(e){}});}
  var D={
    'Barra inferiore':{en:'Bottom bar',es:'Barra inferior',fr:'Barre inférieure',de:'Untere Leiste',pt:'Barra inferior',pl:'Dolny pasek',nl:'Onderste balk',ro:'Bară inferioară',el:'Κάτω μπάρα'},
    'Debiti / Crediti':{en:'Debts / Credits',es:'Deudas / Créditos',fr:'Dettes / Crédits',de:'Schulden / Guthaben',pt:'Dívidas / Créditos',pl:'Długi / Należności',nl:'Schulden / Tegoeden',ro:'Datorii / Creanțe',el:'Χρέη / Πιστώσεις'},
    'Debiti':{en:'Debts',es:'Deudas',fr:'Dettes',de:'Schulden',pt:'Dívidas',pl:'Długi',nl:'Schulden',ro:'Datorii',el:'Χρέη'},
    'Crediti':{en:'Credits',es:'Créditos',fr:'Crédits',de:'Guthaben',pt:'Créditos',pl:'Należności',nl:'Tegoeden',ro:'Creanțe',el:'Πιστώσεις'},
    'Saldo':{en:'Balance',es:'Saldo',fr:'Solde',de:'Saldo',pt:'Saldo',pl:'Saldo',nl:'Saldo',ro:'Sold',el:'Υπόλοιπο'},
    'Lista spesa':{en:'Shopping list',es:'Lista de la compra',fr:'Liste de courses',de:'Einkaufsliste',pt:'Lista de compras',pl:'Lista zakupów',nl:'Boodschappenlijst',ro:'Listă de cumpărături',el:'Λίστα αγορών'},
    'Fidelity card':{en:'Fidelity card',es:'Tarjeta de fidelidad',fr:'Carte de fidélité',de:'Kundenkarte',pt:'Cartão de fidelidade',pl:'Karta lojalnościowa',nl:'Klantenkaart',ro:'Card de fidelitate',el:'Κάρτα πιστότητας'},
    'Grandezza testo':{en:'Text size',es:'Tamaño del texto',fr:'Taille du texte',de:'Textgröße',pt:'Tamanho do texto',pl:'Rozmiar tekstu',nl:'Tekstgrootte',ro:'Dimensiune text',el:'Μέγεθος κειμένου'},
    'Colore icona':{en:'Icon color',es:'Color del icono',fr:'Couleur de l’icône',de:'Symbolfarbe',pt:'Cor do ícone',pl:'Kolor ikony',nl:'Pictogramkleur',ro:'Culoare pictogramă',el:'Χρώμα εικονιδίου'},
    'Colore titolo':{en:'Title color',es:'Color del título',fr:'Couleur du titre',de:'Titelfarbe',pt:'Cor do título',pl:'Kolor tytułu',nl:'Titelkleur',ro:'Culoare titlu',el:'Χρώμα τίτλου'},
    'Colore testo':{en:'Text color',es:'Color del texto',fr:'Couleur du texte',de:'Textfarbe',pt:'Cor do texto',pl:'Kolor tekstu',nl:'Tekstkleur',ro:'Culoare text',el:'Χρώμα κειμένου'},
    'Trasparenza sfondo widget':{en:'Widget background transparency',es:'Transparencia del fondo del widget',fr:'Transparence du fond du widget',de:'Widget-Hintergrundtransparenz',pt:'Transparência do fundo do widget',pl:'Przezroczystość tła widżetu',nl:'Transparantie widgetachtergrond',ro:'Transparența fundalului widgetului',el:'Διαφάνεια φόντου widget'},
    'Aggiornamento automatico':{en:'Automatic update',es:'Actualización automática',fr:'Mise à jour automatique',de:'Automatische Aktualisierung',pt:'Atualização automática',pl:'Automatyczna aktualizacja',nl:'Automatisch bijwerken',ro:'Actualizare automată',el:'Αυτόματη ενημέρωση'},
    'Salva e aggiorna widget':{en:'Save and update widget',es:'Guardar y actualizar widget',fr:'Enregistrer et mettre à jour le widget',de:'Widget speichern und aktualisieren',pt:'Guardar e atualizar widget',pl:'Zapisz i zaktualizuj widżet',nl:'Widget opslaan en bijwerken',ro:'Salvează și actualizează widgetul',el:'Αποθήκευση και ενημέρωση widget'},
    'Tocca un articolo quando è nel carrello':{en:'Tap an item when it is in the cart',es:'Toca un artículo cuando esté en el carrito',fr:'Touchez un article quand il est dans le panier',de:'Tippe auf einen Artikel, wenn er im Wagen liegt',pt:'Toca num artigo quando estiver no carrinho',pl:'Dotknij produktu, gdy jest w koszyku',nl:'Tik op een artikel wanneer het in de winkelwagen ligt',ro:'Atinge un articol când este în coș',el:'Πάτησε ένα προϊόν όταν είναι στο καλάθι'},
    'Rimuovi prodotti acquistati':{en:'Remove purchased products',es:'Eliminar productos comprados',fr:'Supprimer les produits achetés',de:'Gekaufte Produkte entfernen',pt:'Remover produtos comprados',pl:'Usuń kupione produkty',nl:'Gekochte producten verwijderen',ro:'Elimină produsele cumpărate',el:'Αφαίρεση αγορασμένων προϊόντων'}
  };
  Object.keys(D).forEach(function(k){add(k,Object.assign({it:k},D[k]));});
  try{fainanceTranslationCache={};}catch(e){}
})();
