// ═══════════════════════════════════════════════════════════════════════════════
// APP.TSX — Shell principale, login, stato globale, navigazione
// Contiene: LoginScreen, AppWithLogin, App() con SettingsPanel nested,
//           AppuntiPanel, TermsModal, navigazione mobile/desktop.
// I pannelli principali sono in sezioni.tsx e statistiche.tsx.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo, createContext } from 'react';
import { AppCtx, fbAuth, fbDb, googleProvider, doc, setDoc, getDoc, getDocs, addDoc,
  deleteDoc, collection, query, where, onSnapshot,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithCredential,
  deleteUser, getRedirectResult,
  CURRENCIES, LANGUAGES, BG_THEMES, BUTTON_STYLES,
  DEFAULT_CATS, DEFAULT_METHODS, DEFAULT_EXPENSE_GROUPS, DEFAULT_METHOD_GROUPS,
  DEFAULT_INCOME_GROUPS, DEFAULT_PATRIMONIO_AREAS, DEFAULT_PATRIMONIO_ENTRIES,
  DEFAULT_BUDGET_PLAN, DEFAULT_GOALS, DEFAULT_EXPENSE_CATEGORY_NAMES, DEFAULT_EXPENSE_GROUP_NAMES,
  MONTHS_FULL, MONTHS_SHORT, BALANCE_COLOR,
  COLORS, GOAL_ICONS, INCOME_TYPES, EMOJI_LIST,
  getDefaultLang, getDefaultCurrency, getDefaultDateFormat,
  getAllIncomeTypes, translateDefaultCollection, sameNamedItems,
  useStorage, clearFainanceLocalAccountData, fmtDate, fmtAmt, rateMonth,
  todayStr, dateOffset, DATE_FORMATS, IMPORT_DATE_FORMATS, parseDateWithFormat, androidDownload, exportToCSV, exportToXLSX,
  AI_AGENT_ENDPOINT, AI_AGENT_SCOPE_INSTRUCTION, AI_OUT_OF_SCOPE_MESSAGE,
  appLogo, appBanner, aiGrilloMascot
} from './core';
import { TRANSLATIONS } from './traduzioni';
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

function LoginScreen({onLogin}){
  var [mode,setMode]=useState("login");
  var [email,setEmail]=useState("");
  var [password,setPassword]=useState("");
  var [name,setName]=useState("");
  var [confirmPwd,setConfirmPwd]=useState("");
  var [showPwd,setShowPwd]=useState(false);
  var [error,setError]=useState("");
  var [loading,setLoading]=useState(false);

  var inp={width:"100%",borderRadius:10,border:"1px solid #e0e0e0",padding:"12px 14px",fontSize:15,background:"#fff",color:"#333",boxSizing:"border-box",outline:"none"};

  function doLogin(){
    setError("");setLoading(true);
    signInWithEmailAndPassword(fbAuth,email,password)
      .then(function(cred){
        onLogin({id:cred.user.uid,email:cred.user.email,name:cred.user.displayName||name||"Utente"});
      })
      .catch(function(err){
        setError(err.code==="auth/user-not-found"||err.code==="auth/wrong-password"||err.code==="auth/invalid-credential"?"Email o password non corretti.":"Errore: "+err.message);
        setLoading(false);
      });
  }

  function doRegister(){
    setError("");
    if(!name.trim()){setError("Inserisci il tuo nome.");return;}
    if(!email.includes("@")){setError("Email non valida.");return;}
    if(password.length<6){setError("Password: minimo 6 caratteri.");return;}
    if(password!==confirmPwd){setError("Le password non coincidono.");return;}
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
        setError(err.code==="auth/email-already-in-use"?"Email già registrata.":"Errore: "+err.message);
        setLoading(false);
      });
  }

  async function doGoogle(){
    setError(""); setLoading(true);
    try {
      var isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
      if(isNative){
        // On Android/Capacitor: use native Google Sign-In plugin, then Firebase credential
        const mod = await import("@capacitor-firebase/authentication");
        const FirebaseAuthentication = mod.FirebaseAuthentication;
        const result = await FirebaseAuthentication.signInWithGoogle();
        const idToken = result && result.credential && result.credential.idToken;
        if(!idToken) throw new Error("Google login non ha restituito un idToken.");
        const credential = GoogleAuthProvider.credential(idToken);
        const cred = await signInWithCredential(fbAuth, credential);
        onLogin({id:cred.user.uid, email:cred.user.email, name:cred.user.displayName||"Utente"});
        return;
      }
      // On web: use popup
      googleProvider.setCustomParameters({prompt:"select_account"});
      const cred = await signInWithPopup(fbAuth, googleProvider);
      onLogin({id:cred.user.uid, email:cred.user.email, name:cred.user.displayName||"Utente"});
    } catch(err){
      console.error("Google login error:", err);
      setError("Errore Google: "+(err.code||"unknown")+" - "+err.message);
      setLoading(false);
    }
  }

  return <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
    <div style={{width:"100%",maxWidth:400}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <img src={appBanner} alt="fAInance" style={{width:"100%",maxWidth:280,height:"auto",objectFit:"contain",marginBottom:10}}/>
        <div style={{fontSize:11,color:"#888",fontStyle:"italic"}}>Your AI-powered finance tracker</div>
      </div>
      <div style={{background:"#fff",borderRadius:24,padding:28,boxShadow:"0 8px 40px rgba(127,119,221,0.15)"}}>
        <div style={{display:"flex",gap:0,background:"#f5f5f5",borderRadius:12,padding:3,marginBottom:22}}>
          <button onClick={function(){setMode("login");setError("");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:mode==="login"?"#fff":"transparent",color:mode==="login"?"#333":"#888",fontSize:14,cursor:"pointer",fontWeight:mode==="login"?600:400}}>Accedi</button>
          <button onClick={function(){setMode("register");setError("");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:mode==="register"?"#fff":"transparent",color:mode==="register"?"#333":"#888",fontSize:14,cursor:"pointer",fontWeight:mode==="register"?600:400}}>Registrati</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {mode==="register"&&<div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Nome *</label><input placeholder="Mario Rossi" value={name} onChange={function(e){setName(e.target.value);}} style={inp}/></div>}
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Email *</label><input type="email" placeholder="nome@email.com" value={email} onChange={function(e){setEmail(e.target.value);}} style={inp}/></div>
          <div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Password *</label>
            <div style={{position:"relative"}}>
              <input type={showPwd?"text":"password"} placeholder="Password" value={password} onChange={function(e){setPassword(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&mode==="login")doLogin();}} style={{...inp,paddingRight:44}}/>
              <button onClick={function(){setShowPwd(!showPwd);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#aaa"}}>{showPwd?"🙈":"👁"}</button>
            </div>
          </div>
          {mode==="register"&&<div><label style={{fontSize:12,color:"#888",display:"block",marginBottom:4}}>Conferma password *</label><input type={showPwd?"text":"password"} placeholder="Ripeti password" value={confirmPwd} onChange={function(e){setConfirmPwd(e.target.value);}} style={inp}/></div>}
          {error&&<div style={{background:"#fff0f0",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#E24B4A",border:"1px solid #fcc"}}>⚠️ {error}</div>}
          <button onClick={mode==="login"?doLogin:doRegister} disabled={loading} style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",opacity:loading?0.7:1}}>
            {loading?"...":(mode==="login"?"Accedi":"Crea account")}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,height:1,background:"#eee"}}/><span style={{fontSize:12,color:"#aaa"}}>oppure</span><div style={{flex:1,height:1,background:"#eee"}}/></div>
          <button onClick={doGoogle} disabled={loading} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#fff",color:"#333",border:"1.5px solid #e0e0e0",borderRadius:12,padding:"12px",fontSize:14,fontWeight:500,cursor:"pointer"}}>
            <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.1c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.4-10.6 7.4-17.3z"/><path fill="#34A853" d="M24 48c6.5 0 12-2.2 16-5.9l-7.9-6c-2.2 1.5-5 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z"/><path fill="#FBBC05" d="M10.6 28.5c-.5-1.5-.8-3-.8-4.5s.3-3 .8-4.5v-6.2H2.5C.9 16.8 0 20.3 0 24s.9 7.2 2.5 10.7l8.1-6.2z"/><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.2 30.5 0 24 0 14.7 0 6.5 5.4 2.5 13.3l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z"/></svg>
            Accedi con Google
          </button>
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:14,fontSize:11,color:"#aaa"}}>© 2026 fAInance</div>
    </div>
  </div>;
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
  async function send(){
    setStatus(null);
    if(!message.trim()){setStatus({type:"error",text:"Inserisci un messaggio."});return;}
    setLoading(true);
    var payload={name:name.trim(),email:email.trim(),subject:subject.trim()||"Messaggio da fAInance",message:message.trim()};
    try{
      var response=await fetch("https://europe-west1-fainance-a7794.cloudfunctions.net/sendContactEmail",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload)
      });
      var result=null;
      try{result=await response.json();}catch(parseErr){result=null;}
      if(!response.ok||!result||result.ok!==true){
        throw new Error(result&&result.error?result.error:"Invio non riuscito.");
      }
      setStatus({type:"ok",text:"Messaggio inviato correttamente."});
      setSubject("");
      setMessage("");
    }catch(err){
      setStatus({type:"error",text:err&&err.message?err.message:"Invio non riuscito."});
    }finally{
      setLoading(false);
    }
  }
  return <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
    <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:14}}>💬 Contattaci</div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Nome</label><input value={name} onChange={function(e){setName(e.target.value);}} style={sinp} placeholder="Nome"/></div>
        <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Email</label><input value={email} onChange={function(e){setEmail(e.target.value);}} style={sinp} placeholder="email@dominio.com"/></div>
      </div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Oggetto</label><input value={subject} onChange={function(e){setSubject(e.target.value);}} style={sinp} placeholder="Oggetto del messaggio"/></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Messaggio *</label><textarea value={message} onChange={function(e){setMessage(e.target.value);}} style={{...sinp,minHeight:110,resize:"vertical"}} placeholder="Scrivi qui il messaggio..."/></div>
      {status&&<div style={{fontSize:13,borderRadius:10,padding:"10px 12px",background:status.type==="ok"?"#e8f8f0":"#fff0f0",color:status.type==="ok"?"#1D9E75":"#E24B4A",border:"1px solid "+(status.type==="ok"?"#a8e6c8":"#fcc")}}>{status.type==="ok"?"✅ ":"⚠️ "}{status.text}</div>}
      <button onClick={send} disabled={loading} style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px 16px",fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",opacity:loading?0.65:1}}>{loading?"Invio in corso...":"Invia messaggio"}</button>
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
  function save(){
    setError("");
    if(newPwd.length<6){setError("Minimo 6 caratteri.");return;}
    if(newPwd!==confirmPwd){setError("Le password non coincidono.");return;}
    setLoading(true);
    var user=fbAuth.currentUser;
    if(!user){setError("Utente non trovato.");setLoading(false);return;}
    user.updatePassword(newPwd).then(function(){
      setToast("Password aggiornata");
      setOpen(false);setNewPwd("");setConfirmPwd("");
    }).catch(function(err){
      if(err.code==="auth/requires-recent-login"){
        setError("Per sicurezza, esci e rientra prima di cambiare la password.");
      } else {
        setError("Errore: "+err.message);
      }
    }).finally(function(){setLoading(false);});
  }
  return <div style={{borderTop:"1px solid "+borderC,paddingTop:12,marginTop:12}}>
    <button onClick={function(){setOpen(!open);setError("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500,padding:0}}>
      🔑 {open?"Annulla":"Cambia password"}
    </button>
    {open&&<div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Nuova password</label><input type="password" value={newPwd} onChange={function(e){setNewPwd(e.target.value);}} style={sinp} placeholder="Minimo 6 caratteri"/></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Conferma password</label><input type="password" value={confirmPwd} onChange={function(e){setConfirmPwd(e.target.value);}} style={sinp}/></div>
      {error&&<div style={{fontSize:12,color:"#E24B4A",background:"#fff0f0",borderRadius:8,padding:"8px 10px"}}>{error}</div>}
      <button onClick={save} disabled={loading} style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer",opacity:loading?0.7:1}}>{loading?"...":"Aggiorna password"}</button>
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
  var [pName,setPName]=useState(currentUser.name||"");
  var [pPhone,setPPhone]=useState(currentUser.phone||"");
  var [pBirth,setPBirth]=useState(currentUser.birthDate||"");
  var [pGender,setPGender]=useState(currentUser.gender||"");
  var [pCity,setPCity]=useState(currentUser.city||"");
  // Local saved values for display (updated on save)
  var [saved,setSaved]=useState({name:currentUser.name||"",phone:currentUser.phone||"",birthDate:currentUser.birthDate||"",gender:currentUser.gender||"",city:currentUser.city||""});
  useEffect(function(){var next={name:currentUser.name||"",phone:currentUser.phone||"",birthDate:currentUser.birthDate||"",gender:currentUser.gender||"",city:currentUser.city||""};setSaved(next);setPName(next.name);setPPhone(next.phone);setPBirth(next.birthDate);setPGender(next.gender);setPCity(next.city);},[currentUser&&currentUser.id,currentUser&&currentUser.phone,currentUser&&currentUser.name,currentUser&&currentUser.birthDate,currentUser&&currentUser.gender,currentUser&&currentUser.city]);
  var sinp={width:"100%",borderRadius:8,border:"1px solid "+borderC,padding:"8px 10px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:textC};
  function save(){
    var upd={name:pName.trim(),phone:pPhone.trim(),birthDate:pBirth,gender:pGender,city:pCity.trim()};
    function done(){setSaved(upd);if(onProfileUpdate)onProfileUpdate(upd);setEdit(false);if(setToast)setToast("Profilo aggiornato");}
    if(currentUser.id&&fbDbProp){
      setDoc(doc(fbDbProp,"users",currentUser.id),upd,{merge:true}).then(done).catch(function(err){console.error("profile save error",err);if(setToast)setToast("Errore salvataggio profilo");});
    } else {
      done();
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
      <div style={{fontSize:14,fontWeight:600,color:textC}}>👤 Profilo</div>
      {!edit&&<button onClick={function(){setEdit(true);}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500}}>✏ Modifica</button>}
    </div>
    {!edit?<>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
        <div style={{width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#7F77DD,#378ADD)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:"#fff",flexShrink:0}}>
          {d.name?d.name[0].toUpperCase():"U"}
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:700,color:textC}}>{d.name}</div>
          <div style={{fontSize:12,color:subC}}>{currentUser.email||""}</div>
          {<div style={{fontSize:11,color:"#7F77DD",marginTop:2}}>☁️ Dati sincronizzati su cloud</div>}
        </div>
      </div>
      {<div style={{display:"flex",flexDirection:"column",gap:0,marginBottom:14}}>
        {[["📞",d.phone||"—","Telefono"],["🎂",d.birthDate?fmtDate(d.birthDate,dateFmt):"—","Nascita"],["🏙",d.city||"—","Città"],["⚧",d.gender==="M"?"Maschile":d.gender==="F"?"Femminile":d.gender==="X"?"Non spec.":"—","Sesso"]].map(function(r){return <div key={r[2]} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid "+borderC}}>
          <span style={{fontSize:15,width:22}}>{r[0]}</span>
          <span style={{fontSize:12,color:subC,minWidth:64}}>{r[2]}</span>
          <span style={{fontSize:13,color:textC}}>{r[1]}</span>
        </div>;})}
      </div>}
      {<ChangePwdSection dark={dark} textC={textC} subC={subC} borderC={borderC} btnRadius={btnRadius} setToast={setToast}/>}
      {<div style={{borderTop:"1px solid "+borderC,paddingTop:12,marginTop:12,marginBottom:12}}>
        <button onClick={function(){setDeleteOpen(!deleteOpen);setDeleteError("");setDeleteConfirm("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#E24B4A",fontSize:13,fontWeight:700,padding:0}}>🗑 Elimina account e dati</button>
        {deleteOpen&&<div style={{marginTop:12,background:dark?"#2a1e1e":"#fff0f0",border:"1px solid #E24B4A",borderRadius:12,padding:12}}>
          <div style={{fontSize:13,fontWeight:800,color:"#E24B4A",marginBottom:6}}>Operazione permanente</div>
          <div style={{fontSize:12,color:dark?"#ddd":"#555",lineHeight:1.45,marginBottom:10}}>Verranno eliminati profilo, dati cloud, dati locali e account di accesso. Per confermare scrivi ELIMINA.</div>
          <input value={deleteConfirm} onChange={function(e){setDeleteConfirm(e.target.value);}} placeholder="ELIMINA" style={{...sinp,marginBottom:10,borderColor:deleteConfirm==="ELIMINA"?"#E24B4A":borderC}}/>
          {deleteError&&<div style={{fontSize:12,color:"#E24B4A",marginBottom:10,background:dark?"#3a1d1d":"#fff",borderRadius:8,padding:"8px 10px"}}>{deleteError}</div>}
          <div style={{display:"flex",gap:8}}>
            <button onClick={requestDeleteAccount} disabled={deleteLoading||deleteConfirm!=="ELIMINA"} style={{flex:1,background:"#E24B4A",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px",fontSize:13,fontWeight:800,cursor:(deleteLoading||deleteConfirm!=="ELIMINA")?"not-allowed":"pointer",opacity:(deleteLoading||deleteConfirm!=="ELIMINA")?0.45:1}}>{deleteLoading?"Eliminazione...":"Elimina definitivamente"}</button>
            <button onClick={function(){setDeleteOpen(false);setDeleteConfirm("");setDeleteError("");}} disabled={deleteLoading} style={{background:dark?"#333":"#f0f0f0",color:dark?"#eee":"#555",border:"none",borderRadius:btnRadius,padding:"10px 12px",fontSize:13,cursor:"pointer"}}>Annulla</button>
          </div>
        </div>}
      </div>}
      <button onClick={function(){if(window.confirm("Uscire dall'account?"))onLogout();}} style={{width:"100%",background:dark?"#252535":"#f5f5f5",color:"#E24B4A",border:"1px solid #E24B4A",borderRadius:btnRadius,padding:"11px",fontSize:14,fontWeight:500,cursor:"pointer"}}>🚪 Esci</button>
    </>:<div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Nome</label><input value={pName} onChange={function(e){setPName(e.target.value);}} style={sinp}/></div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Telefono</label><input type="tel" value={pPhone} onChange={function(e){setPPhone(e.target.value);}} style={sinp} placeholder="+39 333 1234567"/></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Data nascita</label><input type="date" value={pBirth} onChange={function(e){setPBirth(e.target.value);}} style={sinp}/></div>
        <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Sesso</label>
          <select value={pGender} onChange={function(e){setPGender(e.target.value);}} style={sinp}><option value="">—</option><option value="M">Maschile</option><option value="F">Femminile</option><option value="X">Non spec.</option></select>
        </div>
      </div>
      <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Città</label><input value={pCity} onChange={function(e){setPCity(e.target.value);}} style={sinp} placeholder="Milano"/></div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={save} style={{flex:1,background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px",fontSize:14,fontWeight:600,cursor:"pointer"}}>💾 Salva</button>
        <button onClick={function(){setEdit(false);}} style={{padding:"10px 14px",background:dark?"#333":"#f0f0f0",color:dark?"#eee":"#555",border:"none",borderRadius:btnRadius,cursor:"pointer",fontSize:13}}>Annulla</button>
      </div>
    </div>}
  </div>;
}

function AppWithLogin(){
  var [fbUser,setFbUser]=useState(undefined); // undefined=loading, null=not logged in
  var [userData,setUserData]=useState(null);

  useEffect(function(){
    // Handle Google redirect result (Android)
    getRedirectResult(fbAuth).then(function(result){
      if(result&&result.user){
        // onAuthStateChanged will handle the rest
      }
    }).catch(function(){});

    var unsub=onAuthStateChanged(fbAuth,function(user){
      if(user){
        // Load user profile from Firestore
        getDoc(doc(fbDb,"users",user.uid)).then(function(snap){
          var profile=snap.exists()?snap.data():{};
          var displayName=profile.name||user.displayName||"Utente";
          var normalizedEmail=String(user.email||profile.email||"").toLowerCase();
          setDoc(doc(fbDb,"users",user.uid),{name:displayName,email:normalizedEmail,updatedAt:new Date().toISOString()},{merge:true}).catch(function(){});
          setUserData({id:user.uid,email:normalizedEmail,name:displayName,phone:profile.phone||"",birthDate:profile.birthDate||"",gender:profile.gender||"",city:profile.city||""});
          setFbUser(user);
        }).catch(function(){
          var normalizedEmail=String(user.email||"").toLowerCase();
          setDoc(doc(fbDb,"users",user.uid),{name:user.displayName||"Utente",email:normalizedEmail,updatedAt:new Date().toISOString()},{merge:true}).catch(function(){});
          setUserData({id:user.uid,email:normalizedEmail,name:user.displayName||"Utente"});
          setFbUser(user);
        });
      } else {
        setFbUser(null);
        setUserData(null);
      }
    });
    return unsub;
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
    if(!sameNamedItems(cats,nextCats))setCats(nextCats);
    if(!sameNamedItems(expenseGroups,nextExpenseGroups))setExpenseGroups(nextExpenseGroups);
  },[lang,cats,expenseGroups]);
  var [customIncomeTypes,setCustomIncomeTypes]=useStorage(userKey("custom_income_types_v1"),[]);
  var [incomeTypeOverrides,setIncomeTypeOverrides]=useStorage(userKey("income_type_overrides_v1"),{});
  var incomeTypes=useMemo(function(){return getAllIncomeTypes(customIncomeTypes,incomeTypeOverrides);},[customIncomeTypes,incomeTypeOverrides]);
  var [recurring,setRecurring]=useStorage(userKey("rec_v10"),[]);
  var [goals,setGoals]=useStorage(userKey("goals_v1"),DEFAULT_GOALS);
  var [alerts,setAlerts]=useStorage(userKey("alerts_v1"),[]);
  var [budgetPlan,setBudgetPlan]=useStorage(userKey("budget_plan_v1"),DEFAULT_BUDGET_PLAN);
  var [patrimonioAreas,setPatrimonioAreas]=useStorage(userKey("patrimonio_areas_v1"),DEFAULT_PATRIMONIO_AREAS);
  var [patrimonioEntries,setPatrimonioEntries]=useStorage(userKey("patrimonio_entries_v1"),DEFAULT_PATRIMONIO_ENTRIES);
  var [patrimonioValues,setPatrimonioValues]=useStorage(userKey("patrimonio_values_v1"),{});
  var [patrimonioMode,setPatrimonioMode]=useStorage(userKey("patrimonio_mode_v1"),"manuale");
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
  var [confirmButtonColor,setConfirmButtonColor]=useStorage(userKey("pref_confirm_color"),"#7F77DD");
  var [shareReceivedInvites,setShareReceivedInvites]=useState([]);
  var [shareReceivedNotifications,setShareReceivedNotifications]=useState([]);
  var [shareInviteLoading,setShareInviteLoading]=useState(false);

  // ── FIRESTORE SYNC ──────────────────────────────────────────────────────────
  var [firestoreReady,setFirestoreReady]=useState(false);
  useEffect(function(){
    if(!userId){setFirestoreReady(true);return;}
    setFirestoreReady(false);
    // Load data from Firestore before enabling the UI, so one account can never inherit local data from another account.
    var docRef=doc(fbDb,"userData",userId);
    getDoc(docRef).then(function(snap){
      if(snap.exists()){
        var d=snap.data();
        setExpenses(Array.isArray(d.expenses)?d.expenses:[]);
        setIncomes(Array.isArray(d.incomes)?d.incomes:[]);
        setCats(Array.isArray(d.cats)?d.cats:DEFAULT_CATS);
        setMethods(Array.isArray(d.methods)?d.methods:DEFAULT_METHODS);
        setRecurring(Array.isArray(d.recurring)?d.recurring:[]);
        setGoals(Array.isArray(d.goals)?d.goals:[]);
        setAlerts(Array.isArray(d.alerts)?d.alerts:[]);
        setBudgetPlan(d.budgetPlan!==undefined?d.budgetPlan:DEFAULT_BUDGET_PLAN);
        setPatrimonioValues(d.patrimonioValues||{});
        setPatrimonioAreas(Array.isArray(d.patrimonioAreas)?d.patrimonioAreas:DEFAULT_PATRIMONIO_AREAS);
        setPatrimonioEntries(Array.isArray(d.patrimonioEntries)?d.patrimonioEntries:DEFAULT_PATRIMONIO_ENTRIES);
        setPatrimonioHistory(d.patrimonioHistory||{});
        setPatrimonioNotes(d.patrimonioNotes||{});
        setExpenseGroups(Array.isArray(d.expenseGroups)?d.expenseGroups:DEFAULT_EXPENSE_GROUPS);
        setMethodGroups(Array.isArray(d.methodGroups)?d.methodGroups:DEFAULT_METHOD_GROUPS);
        setIncomeGroups(Array.isArray(d.incomeGroups)?d.incomeGroups:DEFAULT_INCOME_GROUPS);
        setCustomIncomeTypes(Array.isArray(d.customIncomeTypes)?d.customIncomeTypes:[]);
        setIncomeTypeOverrides(d.incomeTypeOverrides||{});
        if(d.historyFutureMode)setHistoryFutureMode(d.historyFutureMode);if(d.shareProjects)setShareProjects(d.shareProjects);if(d.showShareInHistory!==undefined)setShowShareInHistory(!!d.showShareInHistory);if(d.confirmButtonColor)setConfirmButtonColor(d.confirmButtonColor);
        if(d.historySortDate)setHistorySortDate(d.historySortDate);
        if(d.historySortDirection)setHistorySortDirection(d.historySortDirection);
        setAppuntiDocuments(Array.isArray(d.appuntiDocuments)?d.appuntiDocuments:[]);
        setAppuntiNotes(Array.isArray(d.appuntiNotes)?d.appuntiNotes:[]);
        setBankCoords(Array.isArray(d.bankCoords)?d.bankCoords:[]);
        setAiDismissed(Array.isArray(d.aiDismissed)?d.aiDismissed:[]);
        setAiChat(Array.isArray(d.aiChat)?d.aiChat:[]);
        if(d.aiDataAccess)setAiDataAccess(d.aiDataAccess);
        if(d.aiFloatingEnabled!==undefined)setAiFloatingEnabled(!!d.aiFloatingEnabled);
        if(d.notifPrefs)setNotifPrefs(d.notifPrefs);
        if(Array.isArray(d.customNotifs))setCustomNotifs(d.customNotifs);
        if(d.termsAccepted!==undefined)setTermsAccepted(!!d.termsAccepted);
        if(d.privacyAccepted!==undefined)setPrivacyAccepted(!!d.privacyAccepted);
        if(d.legalAcceptanceDate)setLegalAcceptanceDate(d.legalAcceptanceDate);
        setShareProjects(Array.isArray(d.shareProjects)?d.shareProjects:[]);
        if(d.showShareInHistory!==undefined)setShowShareInHistory(!!d.showShareInHistory);
        if(d.confirmButtonColor)setConfirmButtonColor(d.confirmButtonColor);
      } else {
        // Nuovo account: parte vuoto, ma con categorie/metodi base per usare subito l'app.
        setExpenses([]);setIncomes([]);setRecurring([]);setGoals(DEFAULT_GOALS);setAlerts([]);setBudgetPlan(DEFAULT_BUDGET_PLAN);
        setCats(DEFAULT_CATS);setMethods(DEFAULT_METHODS);setExpenseGroups(DEFAULT_EXPENSE_GROUPS);setIncomeGroups(DEFAULT_INCOME_GROUPS);setMethodGroups(DEFAULT_METHOD_GROUPS);
        setPatrimonioAreas(DEFAULT_PATRIMONIO_AREAS);setPatrimonioEntries(DEFAULT_PATRIMONIO_ENTRIES);setPatrimonioValues({});setPatrimonioHistory({});setPatrimonioNotes({});
        setAppuntiDocuments([]);setAppuntiNotes([]);setBankCoords([]);setAiDismissed([]);setAiChat([]);setShareProjects([]);setShowShareInHistory(true);setCustomNotifs([]);setNotifPrefs({remindActive:false,remindFreq:"daily",remindHour:"20:00",stipendioActive:true,stipendioHour:"18:00",stipendioDay:0,spesaRicorrente:true});
      }
      setFirestoreReady(true);
    }).catch(function(err){console.error("Firestore load error",err);setExpenses([]);setIncomes([]);setFirestoreReady(true);});
  },[userId]);

  function saveToFirestore(){
    if(!userId)return;
    try{if(localStorage.getItem("fainance_deleting_account_"+userId)==="1")return;}catch(e){}
    var docRef=doc(fbDb,"userData",userId);
    setDoc(docRef,{expenses,incomes,cats,methods,recurring,goals,alerts,budgetPlan,patrimonioValues,patrimonioAreas,patrimonioEntries,patrimonioHistory,patrimonioNotes,expenseGroups,incomeGroups,methodGroups,customIncomeTypes,incomeTypeOverrides,historyFutureMode,historySortDate,historySortDirection,firstDayOfWeek,appuntiDocuments,appuntiNotes,bankCoords,notifPrefs,customNotifs,termsAccepted,privacyAccepted,legalAcceptanceDate,aiDismissed,aiChat,aiDataAccess,aiFloatingEnabled,shareProjects,showShareInHistory,confirmButtonColor,updatedAt:new Date().toISOString()},{merge:true}).catch(function(){});
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
    setDoc(doc(fbDb,"shareProjects",pid),cloudProject,{merge:true}).catch(function(e){console.error("Share project sync error",e);});
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
    },function(e){console.error("Share projects member listener error",e);setShareInviteLoading(false);}));
    unsubs.push(onSnapshot(query(collection(fbDb,"shareProjects"),where("ownerUid","==",userId)),function(snap){
      var map={};snap.forEach(function(d){map[d.id]={...d.data(),id:d.id};});projectMaps.owner=map;applyProjects();
    },function(e){console.error("Share projects owner listener error",e);}));
    if(email){
      unsubs.push(onSnapshot(query(collection(fbDb,"shareInvites"),where("invitedEmail","==",email)),function(snap){
        var map={};snap.forEach(function(d){map[d.id]={...d.data(),id:d.id};});inviteMaps.email=map;applyInvites();
      },function(e){console.error("Share invites email listener error",e);setShareInviteLoading(false);}));
    }
    unsubs.push(onSnapshot(query(collection(fbDb,"shareInvites"),where("invitedUid","==",userId)),function(snap){
      var map={};snap.forEach(function(d){map[d.id]={...d.data(),id:d.id};});inviteMaps.uid=map;applyInvites();
    },function(e){console.error("Share invites uid listener error",e);setShareInviteLoading(false);}));
    unsubs.push(onSnapshot(query(collection(fbDb,"shareNotifications"),where("userUid","==",userId)),function(snap){
      var list=[];snap.forEach(function(d){var data=d.data();if(data&&!data.read)list.push({...data,id:d.id});});setShareReceivedNotifications(list);
    },function(e){console.error("Share notifications listener error",e);}));
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
    await addDoc(collection(fbDb,"mail"),{to:[invitedEmail],message:{subject:"Invito a "+projectName+" su fAInance",text:mailText,html:mailHtml},shareInviteId:inviteId,shareProjectId:projectId,shareInviteLink:inviteLink,createdAt:new Date().toISOString()}).catch(function(e){console.error("Mail queue error",e);});
    return inviteId;
  }

  // Auto-save to Firestore whenever data changes
  useEffect(function(){
    if(!firestoreReady)return;
    var timer=setTimeout(saveToFirestore,2000); // debounce 2s
    return function(){clearTimeout(timer);};
  },[expenses,incomes,cats,methods,recurring,goals,alerts,budgetPlan,patrimonioValues,patrimonioAreas,patrimonioEntries,patrimonioHistory,patrimonioNotes,expenseGroups,incomeGroups,methodGroups,customIncomeTypes,incomeTypeOverrides,historyFutureMode,historySortDate,historySortDirection,firstDayOfWeek,appuntiDocuments,appuntiNotes,bankCoords,notifPrefs,customNotifs,termsAccepted,privacyAccepted,legalAcceptanceDate,aiDismissed,aiChat,aiDataAccess,aiFloatingEnabled,shareProjects,showShareInHistory,confirmButtonColor]);

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
  var [shownAlertIds,setShownAlertIds]=useState([]); // ids already shown
  var [toast,setToast]=useState(null);
  var [voiceModal,setVoiceModal]=useState(false);
  var [voiceListening,setVoiceListening]=useState(false);
  var [voiceText,setVoiceText]=useState("");
  var [voiceParsed,setVoiceParsed]=useState(null);
  var [voiceError,setVoiceError]=useState("");
  var [voiceConfirm,setVoiceConfirm]=useState(null);
  var [voiceSaving,setVoiceSaving]=useState(false);
  function openVoiceModal(autoStart?:any){setVoiceModal(true);setVoiceText("");setVoiceParsed(null);setVoiceError("");setVoiceListening(false);if(autoStart!==false){setTimeout(function(){},250);}}
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
  useEffect(function(){
    if(lang==="it")return;
    var base={
      en:{"Profilo":"Profile","Generale":"General","Aspetto":"Appearance","Sezioni":"Sections","Notifiche e Promemoria":"Notifications and reminders","Dati":"Data","Supporto":"Support","Info":"Info","Spese":"Expenses","Uscite":"Expenses","Entrate":"Income","Saldo":"Balance","Storico":"History","Statistiche":"Statistics","Stat":"Stats","Budget":"Budget","Patrimonio":"Assets","Aree":"Areas","Voci":"Items","Categorie":"Categories","Metodi di pagamento":"Payment methods","Riordina":"Reorder","Lista":"List","Lista categorie":"Category list","Lista Aree":"Area list","Default":"Default","Accorpa":"Merge","Indietro":"Back","Formato data":"Date format","Primo giorno settimana":"First day of week","Movimenti futuri":"Future transactions","Solo fino a oggi":"Only until today","Mostra anche future":"Also show future","Data dell’operazione":"Transaction date","Data operazione":"Transaction date","Data inserimento":"Entry date","Prima i movimenti più recenti":"Newest first","Prima i movimenti più vecchi":"Oldest first","Più recenti":"Newest first","Più vecchi":"Oldest first","Lingua":"Language","Valuta principale":"Main currency","Metriche":"Metrics","IA":"AI","Salva lingua":"Save language","Nuova uscita":"New expense","Nuova entrata":"New income","Importo":"Amount","Categoria":"Category","Metodo":"Method","Metodo di pagamento":"Payment method","Descrizione":"Description","Data":"Date","Rateizza":"Split","Aggiungi uscita":"Add expense","Aggiungi entrata":"Add income","Contattaci":"Contact us","Invia messaggio":"Send message","Messaggio":"Message","Oggetto":"Subject","Nome":"Name","Email":"Email","Home":"Home","Altro":"More","Salva":"Save","Annulla":"Cancel","Lista categorie":"Category list","Aggiungi categoria uscita":"Add expense category","Nessun default":"No default","Nessuna categoria default":"No default category","Nessun metodo default":"No default payment method","Per Aree":"By area","Personalizzato":"Custom","Archiviata":"Archived","Archiviato":"Archived","Apri":"Open","Chiudi":"Close","Domande frequenti":"FAQ","Invio in corso...":"Sending...","Messaggio inviato correttamente.":"Message sent successfully.","Inserisci un messaggio.":"Enter a message.","La lingua viene applicata salvando e ricaricando l’app.":"The language is applied after saving and reloading the app.","Lingua aggiornata":"Language updated","Valore preselezionato quando apri il form relativo a questa sezione.":"Preselected value when you open this section form.","Gestisci categorie uscite: lista, riordino, default e accorpamento.":"Manage expense categories: list, order, default and merge.","Gestisci metodi di pagamento: lista, riordino e default.":"Manage payment methods: list, order and default.","I tipi di entrata sono predefiniti. Qui puoi gestire visualizzazione, ordine e default.":"Income types are predefined. Here you can manage display, order and default.","Saldo Home":"Home balance","Valuta secondaria":"Secondary currency","Mostra nello storico":"Show in history","Mostra nelle statistiche":"Show in statistics","Mostra nel budget":"Show in budget","Mostra nel patrimonio":"Show in assets","Uscita":"Expense","Entrata":"Income","Uscite mese":"Expenses this month","Entrate mese":"Income this month","Saldo mese":"Balance this month","Saldo ultimi 12 mesi":"Balance last 12 months","Tasso aggiornato in tempo reale":"Real-time exchange rate","Distribuzione uscite":"Expense breakdown","Entrate vs Uscite":"Income vs Expenses","Saldo mensile":"Monthly balance","Ultime uscite":"Recent expenses","Ultime entrate":"Recent income","Nessuna spesa":"No expenses","Filtri":"Filters","Tutti gli anni":"All years","Tutti i mesi":"All months","voci":"items","ricorrenti da confermare per":"recurring to confirm for","alert di spesa superati":"spending alerts triggered","Eliminare?":"Delete?","Categoria":"Category","Area":"Area","Data da":"Date from","Data a":"Date to","Importo min":"Min amount","Importo max":"Max amount","Nessun alert configurato.":"No alerts configured.","Nessuna ricorrente configurata.":"No recurring entries.","Gennaio":"January","Febbraio":"February","Marzo":"March","Aprile":"April","Maggio":"May","Giugno":"June","Luglio":"July","Agosto":"August","Settembre":"September","Ottobre":"October","Novembre":"November","Dicembre":"December","Gen":"Jan","Feb":"Feb","Mar":"Mar","Apr":"Apr","Mag":"May","Giu":"Jun","Lug":"Jul","Ago":"Aug","Set":"Sep","Ott":"Oct","Nov":"Nov","Dic":"Dec","Conversione":"Conversion","Media entrate mensili (ultimi 12 mesi):":"Average monthly income (last 12 months):","Eliminare questa voce dal Patrimonio?":"Delete this asset entry?","Elimina":"Delete","Nessun dato":"No data","Nessuna uscita":"No expenses","Nessuna entrata":"No income","Tutte":"All","Tutto gestito":"All handled"},
      es:{"Profilo":"Perfil","Generale":"General","Aspetto":"Apariencia","Sezioni":"Secciones","Notifiche e Promemoria":"Notificaciones y recordatorios","Dati":"Datos","Supporto":"Soporte","Info":"Info","Spese":"Gastos","Uscite":"Gastos","Entrate":"Ingresos","Saldo":"Saldo","Storico":"Historial","Statistiche":"Estadísticas","Stat":"Estad.","Budget":"Presupuesto","Patrimonio":"Patrimonio","Aree":"Áreas","Voci":"Elementos","Categorie":"Categorías","Metodi di pagamento":"Métodos de pago","Riordina":"Reordenar","Lista":"Lista","Lista categorie":"Lista de categorías","Lista Aree":"Lista de áreas","Default":"Predeterminado","Accorpa":"Fusionar","Indietro":"Atrás","Formato data":"Formato de fecha","Primo giorno settimana":"Primer día de la semana","Movimenti futuri":"Movimientos futuros","Solo fino a oggi":"Solo hasta hoy","Mostra anche future":"Mostrar también futuros","Data dell’operazione":"Fecha de operación","Data operazione":"Fecha de operación","Data inserimento":"Fecha de inserción","Prima i movimenti più recenti":"Más recientes primero","Prima i movimenti più vecchi":"Más antiguos primero","Più recenti":"Más recientes","Più vecchi":"Más antiguos","Lingua":"Idioma","Valuta principale":"Moneda principal","Metriche":"Métricas","IA":"IA","Salva lingua":"Guardar idioma","Nuova uscita":"Nuevo gasto","Nuova entrata":"Nuevo ingreso","Importo":"Importe","Categoria":"Categoría","Metodo":"Método","Metodo di pagamento":"Método de pago","Descrizione":"Descripción","Data":"Fecha","Rateizza":"Dividir","Aggiungi uscita":"Añadir gasto","Aggiungi entrata":"Añadir ingreso","Contattaci":"Contáctanos","Invia messaggio":"Enviar mensaje","Messaggio":"Mensaje","Oggetto":"Asunto","Nome":"Nombre","Email":"Email","Home":"Inicio","Altro":"Más","Salva":"Guardar","Annulla":"Cancelar","Aggiungi categoria uscita":"Añadir categoría de gasto","Nessun default":"Sin predeterminado","Nessuna categoria default":"Sin categoría predeterminada","Nessun metodo default":"Sin método predeterminado","Per Aree":"Por áreas","Personalizzato":"Personalizado","Archiviata":"Archivada","Archiviato":"Archivado","Apri":"Abrir","Chiudi":"Cerrar","Domande frequenti":"Preguntas frecuentes","Invio in corso...":"Enviando...","Messaggio inviato correttamente.":"Mensaje enviado correctamente.","Inserisci un messaggio.":"Introduce un mensaje.","La lingua viene applicata salvando e ricaricando l’app.":"El idioma se aplica guardando y recargando la app.","Lingua aggiornata":"Idioma actualizado","Saldo Home":"Saldo inicial","Valuta secondaria":"Moneda secundaria","Mostra nello storico":"Mostrar en historial","Mostra nelle statistiche":"Mostrar en estadísticas","Mostra nel budget":"Mostrar en presupuesto","Mostra nel patrimonio":"Mostrar en patrimonio","Uscita":"Gasto","Entrata":"Ingreso","Uscite mese":"Gastos este mes","Entrate mese":"Ingresos este mes","Saldo mese":"Saldo este mes","Saldo ultimi 12 mesi":"Saldo últimos 12 meses","Tasso aggiornato in tempo reale":"Tipo de cambio en tiempo real","Distribuzione uscite":"Distribución de gastos","Entrate vs Uscite":"Ingresos vs Gastos","Saldo mensile":"Saldo mensual","Ultime uscite":"Últimos gastos","Ultime entrate":"Últimos ingresos","Nessuna spesa":"Sin gastos","Filtri":"Filtros","Tutti gli anni":"Todos los años","Tutti i mesi":"Todos los meses","voci":"elementos","ricorrenti da confermare per":"recurrentes a confirmar en","alert di spesa superati":"alertas de gasto superadas","Eliminare?":"¿Eliminar?","Categoria":"Categoría","Area":"Área","Data da":"Fecha desde","Data a":"Fecha hasta","Importo min":"Importe mín","Importo max":"Importe máx","Conversione":"Conversión","Elimina":"Eliminar","Nessun dato":"Sin datos","Nessuna uscita":"Sin gastos","Nessuna entrata":"Sin ingresos","Tutte":"Todas","Tutto gestito":"Todo gestionado","Gennaio":"Enero","Febbraio":"Febrero","Marzo":"Marzo","Aprile":"Abril","Maggio":"Mayo","Giugno":"Junio","Luglio":"Julio","Agosto":"Agosto","Settembre":"Septiembre","Ottobre":"Octubre","Novembre":"Noviembre","Dicembre":"Diciembre","Gen":"Ene","Feb":"Feb","Mar":"Mar","Apr":"Abr","Mag":"May","Giu":"Jun","Lug":"Jul","Ago":"Ago","Set":"Sep","Ott":"Oct","Nov":"Nov","Dic":"Dic"}
    };

    base.fr={"Profilo":"Profil","Generale":"Général","Aspetto":"Apparence","Sezioni":"Sections","Notifiche e Promemoria":"Notifications et rappels","Dati":"Données","Supporto":"Support","Info":"Info","Spese":"Dépenses","Uscite":"Dépenses","Entrate":"Revenus","Saldo":"Solde","Storico":"Historique","Statistiche":"Statistiques","Stat":"Stats","Budget":"Budget","Patrimonio":"Patrimoine","Aree":"Zones","Voci":"Éléments","Categorie":"Catégories","Metodi di pagamento":"Moyens de paiement","Riordina":"Réordonner","Lista":"Liste","Lista categorie":"Liste des catégories","Lista Aree":"Liste des zones","Default":"Par défaut","Accorpa":"Fusionner","Indietro":"Retour","Formato data":"Format de date","Primo giorno settimana":"Premier jour de la semaine","Movimenti futuri":"Mouvements futurs","Solo fino a oggi":"Seulement jusqu'à aujourd'hui","Mostra anche future":"Afficher aussi les futurs","Data dell'operazione":"Date de l'opération","Data operazione":"Date de l'opération","Data inserimento":"Date de saisie","Prima i movimenti più recenti":"Les plus récents d'abord","Prima i movimenti più vecchi":"Les plus anciens d'abord","Più recenti":"Les plus récents","Più vecchi":"Les plus anciens","Lingua":"Langue","Valuta principale":"Devise principale","Metriche":"Métriques","IA":"IA","Salva lingua":"Enregistrer la langue","Nuova uscita":"Nouvelle dépense","Nuova entrata":"Nouveau revenu","Importo":"Montant","Categoria":"Catégorie","Metodo":"Méthode","Metodo di pagamento":"Moyen de paiement","Descrizione":"Description","Data":"Date","Rateizza":"Fractionner","Aggiungi uscita":"Ajouter une dépense","Aggiungi entrata":"Ajouter un revenu","Contattaci":"Contactez-nous","Invia messaggio":"Envoyer le message","Messaggio":"Message","Oggetto":"Objet","Nome":"Nom","Email":"Email","Home":"Accueil","Altro":"Plus","Salva":"Enregistrer","Annulla":"Annuler","Aggiungi categoria uscita":"Ajouter une catégorie","Nessun default":"Aucune valeur par défaut","Nessuna categoria default":"Aucune catégorie par défaut","Nessun metodo default":"Aucun moyen par défaut","Per Aree":"Par zones","Personalizzato":"Personnalisé","Archiviata":"Archivée","Archiviato":"Archivé","Apri":"Ouvrir","Chiudi":"Fermer","Domande frequenti":"FAQ","Invio in corso...":"Envoi en cours...","Messaggio inviato correttamente.":"Message envoyé.","Inserisci un messaggio.":"Entrez un message.","La lingua viene applicata salvando e ricaricando l'app.":"La langue est appliquée après enregistrement.","Lingua aggiornata":"Langue mise à jour","Valore preselezionato quando apri il form relativo a questa sezione.":"Valeur présélectionnée à l'ouverture du formulaire.","Gestisci categorie uscite: lista, riordino, default e accorpamento.":"Gérez les catégories: liste, ordre, défaut et fusion.","Gestisci metodi di pagamento: lista, riordino e default.":"Gérez les moyens de paiement: liste, ordre et défaut.","I tipi di entrata sono predefiniti. Qui puoi gestire visualizzazione, ordine e default.":"Les types de revenus sont prédéfinis. Gérez l'affichage, l'ordre et le défaut.","Saldo Home":"Solde accueil","Valuta secondaria":"Devise secondaire","Mostra nello storico":"Afficher dans l'historique","Mostra nelle statistiche":"Afficher dans les statistiques","Mostra nel budget":"Afficher dans le budget","Mostra nel patrimonio":"Afficher dans le patrimoine","Uscita":"Dépense","Entrata":"Revenu","Uscite mese":"Dépenses ce mois","Entrate mese":"Revenus ce mois","Saldo mese":"Solde ce mois","Saldo ultimi 12 mesi":"Solde 12 derniers mois","Tasso aggiornato in tempo reale":"Taux en temps réel","Distribuzione uscite":"Répartition des dépenses","Entrate vs Uscite":"Revenus vs Dépenses","Saldo mensile":"Solde mensuel","Ultime uscite":"Dernières dépenses","Ultime entrate":"Derniers revenus","Nessuna spesa":"Aucune dépense","Filtri":"Filtres","Tutti gli anni":"Toutes les années","Tutti i mesi":"Tous les mois","voci":"éléments","ricorrenti da confermare per":"récurrents à confirmer pour","alert di spesa superati":"alertes de dépenses dépassées","Eliminare?":"Supprimer?","Categoria":"Catégorie","Area":"Zone","Data da":"Date de","Data a":"Date à","Importo min":"Montant min","Importo max":"Montant max","Conversione":"Conversion","Elimina":"Supprimer","Nessun dato":"Aucune donnée","Nessuna uscita":"Aucune dépense","Nessuna entrata":"Aucun revenu","Tutte":"Toutes","Tutto gestito":"Tout géré","Gennaio":"Janvier","Febbraio":"Février","Marzo":"Mars","Aprile":"Avril","Maggio":"Mai","Giugno":"Juin","Luglio":"Juillet","Agosto":"Août","Settembre":"Septembre","Ottobre":"Octobre","Novembre":"Novembre","Dicembre":"Décembre","Gen":"Jan","Feb":"Fév","Mar":"Mar","Apr":"Avr","Mag":"Mai","Giu":"Juin","Lug":"Juil","Ago":"Août","Set":"Sep","Ott":"Oct","Nov":"Nov","Dic":"Déc"};
    base.de={"Profilo":"Profil","Generale":"Allgemein","Aspetto":"Darstellung","Sezioni":"Abschnitte","Notifiche e Promemoria":"Benachrichtigungen und Erinnerungen","Dati":"Daten","Supporto":"Support","Info":"Info","Spese":"Ausgaben","Uscite":"Ausgaben","Entrate":"Einnahmen","Saldo":"Saldo","Storico":"Verlauf","Statistiche":"Statistiken","Stat":"Stat.","Budget":"Budget","Patrimonio":"Vermögen","Aree":"Bereiche","Voci":"Einträge","Categorie":"Kategorien","Metodi di pagamento":"Zahlungsmethoden","Riordina":"Neu ordnen","Lista":"Liste","Lista categorie":"Kategorieliste","Lista Aree":"Bereichsliste","Default":"Standard","Accorpa":"Zusammenführen","Indietro":"Zurück","Formato data":"Datumsformat","Primo giorno settimana":"Erster Wochentag","Movimenti futuri":"Zukünftige Bewegungen","Solo fino a oggi":"Nur bis heute","Mostra anche future":"Auch zukünftige anzeigen","Data dell'operazione":"Vorgangsdatum","Data operazione":"Vorgangsdatum","Data inserimento":"Eingabedatum","Prima i movimenti più recenti":"Neueste zuerst","Prima i movimenti più vecchi":"Älteste zuerst","Più recenti":"Neueste","Più vecchi":"Älteste","Lingua":"Sprache","Valuta principale":"Hauptwährung","Metriche":"Metriken","IA":"KI","Salva lingua":"Sprache speichern","Nuova uscita":"Neue Ausgabe","Nuova entrata":"Neue Einnahme","Importo":"Betrag","Categoria":"Kategorie","Metodo":"Methode","Metodo di pagamento":"Zahlungsmethode","Descrizione":"Beschreibung","Data":"Datum","Rateizza":"Aufteilen","Aggiungi uscita":"Ausgabe hinzufügen","Aggiungi entrata":"Einnahme hinzufügen","Contattaci":"Kontakt","Invia messaggio":"Nachricht senden","Messaggio":"Nachricht","Oggetto":"Betreff","Nome":"Name","Email":"Email","Home":"Startseite","Altro":"Mehr","Salva":"Speichern","Annulla":"Abbrechen","Aggiungi categoria uscita":"Kategorie hinzufügen","Nessun default":"Kein Standard","Nessuna categoria default":"Keine Standardkategorie","Nessun metodo default":"Keine Standardmethode","Per Aree":"Nach Bereichen","Personalizzato":"Benutzerdefiniert","Archiviata":"Archiviert","Archiviato":"Archiviert","Apri":"Öffnen","Chiudi":"Schließen","Domande frequenti":"FAQ","Invio in corso...":"Wird gesendet...","Messaggio inviato correttamente.":"Nachricht gesendet.","Inserisci un messaggio.":"Nachricht eingeben.","La lingua viene applicata salvando e ricaricando l'app.":"Sprache wird nach dem Speichern angewendet.","Lingua aggiornata":"Sprache aktualisiert","Valore preselezionato quando apri il form relativo a questa sezione.":"Vorausgewählter Wert beim Öffnen des Formulars.","Gestisci categorie uscite: lista, riordino, default e accorpamento.":"Ausgabenkategorien verwalten: Liste, Reihenfolge, Standard und Zusammenführung.","Gestisci metodi di pagamento: lista, riordino e default.":"Zahlungsmethoden verwalten: Liste, Reihenfolge und Standard.","I tipi di entrata sono predefiniti. Qui puoi gestire visualizzazione, ordine e default.":"Einnahmetypen sind vordefiniert. Anzeige, Reihenfolge und Standard verwalten.","Saldo Home":"Saldo Startseite","Valuta secondaria":"Nebenwährung","Mostra nello storico":"Im Verlauf anzeigen","Mostra nelle statistiche":"In Statistiken anzeigen","Mostra nel budget":"Im Budget anzeigen","Mostra nel patrimonio":"Im Vermögen anzeigen","Uscita":"Ausgabe","Entrata":"Einnahme","Uscite mese":"Ausgaben diesen Monat","Entrate mese":"Einnahmen diesen Monat","Saldo mese":"Saldo diesen Monat","Saldo ultimi 12 mesi":"Saldo letzte 12 Monate","Tasso aggiornato in tempo reale":"Echtzeit-Wechselkurs","Distribuzione uscite":"Ausgabenverteilung","Entrate vs Uscite":"Einnahmen vs Ausgaben","Saldo mensile":"Monatssaldo","Ultime uscite":"Letzte Ausgaben","Ultime entrate":"Letzte Einnahmen","Nessuna spesa":"Keine Ausgaben","Filtri":"Filter","Tutti gli anni":"Alle Jahre","Tutti i mesi":"Alle Monate","voci":"Einträge","ricorrenti da confermare per":"wiederkehrende zu bestätigen für","alert di spesa superati":"Ausgabenwarnungen überschritten","Eliminare?":"Löschen?","Categoria":"Kategorie","Area":"Bereich","Data da":"Datum von","Data a":"Datum bis","Importo min":"Mindestbetrag","Importo max":"Höchstbetrag","Conversione":"Umrechnung","Elimina":"Löschen","Nessun dato":"Keine Daten","Nessuna uscita":"Keine Ausgaben","Nessuna entrata":"Keine Einnahmen","Tutte":"Alle","Tutto gestito":"Alles erledigt","Gennaio":"Januar","Febbraio":"Februar","Marzo":"März","Aprile":"April","Maggio":"Mai","Giugno":"Juni","Luglio":"Juli","Agosto":"August","Settembre":"September","Ottobre":"Oktober","Novembre":"November","Dicembre":"Dezember","Gen":"Jan","Feb":"Feb","Mar":"Mär","Apr":"Apr","Mag":"Mai","Giu":"Jun","Lug":"Jul","Ago":"Aug","Set":"Sep","Ott":"Okt","Nov":"Nov","Dic":"Dez"};
    base.pt={"Profilo":"Perfil","Generale":"Geral","Aspetto":"Aparência","Sezioni":"Seções","Notifiche e Promemoria":"Notificações e lembretes","Dati":"Dados","Supporto":"Suporte","Info":"Info","Spese":"Despesas","Uscite":"Despesas","Entrate":"Receitas","Saldo":"Saldo","Storico":"Histórico","Statistiche":"Estatísticas","Stat":"Estat.","Budget":"Orçamento","Patrimonio":"Património","Aree":"Áreas","Voci":"Itens","Categorie":"Categorias","Metodi di pagamento":"Métodos de pagamento","Riordina":"Reordenar","Lista":"Lista","Lista categorie":"Lista de categorias","Lista Aree":"Lista de áreas","Default":"Padrão","Accorpa":"Mesclar","Indietro":"Voltar","Formato data":"Formato da data","Primo giorno settimana":"Primeiro dia da semana","Movimenti futuri":"Movimentos futuros","Solo fino a oggi":"Só até hoje","Mostra anche future":"Mostrar também futuros","Data dell'operazione":"Data da operação","Data operazione":"Data da operação","Data inserimento":"Data de inserção","Prima i movimenti più recenti":"Mais recentes primeiro","Prima i movimenti più vecchi":"Mais antigos primeiro","Più recenti":"Mais recentes","Più vecchi":"Mais antigos","Lingua":"Idioma","Valuta principale":"Moeda principal","Metriche":"Métricas","IA":"IA","Salva lingua":"Salvar idioma","Nuova uscita":"Nova despesa","Nuova entrata":"Nova receita","Importo":"Valor","Categoria":"Categoria","Metodo":"Método","Metodo di pagamento":"Método de pagamento","Descrizione":"Descrição","Data":"Data","Rateizza":"Parcelar","Aggiungi uscita":"Adicionar despesa","Aggiungi entrata":"Adicionar receita","Contattaci":"Contacte-nos","Invia messaggio":"Enviar mensagem","Messaggio":"Mensagem","Oggetto":"Assunto","Nome":"Nome","Email":"Email","Home":"Início","Altro":"Mais","Salva":"Guardar","Annulla":"Cancelar","Aggiungi categoria uscita":"Adicionar categoria","Nessun default":"Sem padrão","Nessuna categoria default":"Sem categoria padrão","Nessun metodo default":"Sem método padrão","Per Aree":"Por áreas","Personalizzato":"Personalizado","Archiviata":"Arquivada","Archiviato":"Arquivado","Apri":"Abrir","Chiudi":"Fechar","Domande frequenti":"FAQ","Invio in corso...":"A enviar...","Messaggio inviato correttamente.":"Mensagem enviada.","Inserisci un messaggio.":"Insira uma mensagem.","La lingua viene applicata salvando e ricaricando l'app.":"O idioma é aplicado após guardar.","Lingua aggiornata":"Idioma atualizado","Valore preselezionato quando apri il form relativo a questa sezione.":"Valor pré-selecionado ao abrir o formulário.","Gestisci categorie uscite: lista, riordino, default e accorpamento.":"Gerencie categorias: lista, ordem, padrão e fusão.","Gestisci metodi di pagamento: lista, riordino e default.":"Gerencie métodos de pagamento: lista, ordem e padrão.","I tipi di entrata sono predefiniti. Qui puoi gestire visualizzazione, ordine e default.":"Os tipos de receita são predefinidos. Gira visualização, ordem e padrão.","Saldo Home":"Saldo inicial","Valuta secondaria":"Moeda secundária","Mostra nello storico":"Mostrar no histórico","Mostra nelle statistiche":"Mostrar nas estatísticas","Mostra nel budget":"Mostrar no orçamento","Mostra nel patrimonio":"Mostrar no património","Uscita":"Despesa","Entrata":"Receita","Uscite mese":"Despesas este mês","Entrate mese":"Receitas este mês","Saldo mese":"Saldo este mês","Saldo ultimi 12 mesi":"Saldo últimos 12 meses","Tasso aggiornato in tempo reale":"Taxa em tempo real","Distribuzione uscite":"Distribuição de despesas","Entrate vs Uscite":"Receitas vs Despesas","Saldo mensile":"Saldo mensal","Ultime uscite":"Últimas despesas","Ultime entrate":"Últimas receitas","Nessuna spesa":"Sem despesas","Filtri":"Filtros","Tutti gli anni":"Todos os anos","Tutti i mesi":"Todos os meses","voci":"itens","ricorrenti da confermare per":"recorrentes a confirmar em","alert di spesa superati":"alertas de despesa ultrapassados","Eliminare?":"Eliminar?","Categoria":"Categoria","Area":"Área","Data da":"Data de","Data a":"Data até","Importo min":"Valor mín.","Importo max":"Valor máx.","Conversione":"Conversão","Elimina":"Eliminar","Nessun dato":"Sem dados","Nessuna uscita":"Sem despesas","Nessuna entrata":"Sem receitas","Tutte":"Todas","Tutto gestito":"Tudo tratado","Gennaio":"Janeiro","Febbraio":"Fevereiro","Marzo":"Março","Aprile":"Abril","Maggio":"Maio","Giugno":"Junho","Luglio":"Julho","Agosto":"Agosto","Settembre":"Setembro","Ottobre":"Outubro","Novembre":"Novembro","Dicembre":"Dezembro","Gen":"Jan","Feb":"Fev","Mar":"Mar","Apr":"Abr","Mag":"Mai","Giu":"Jun","Lug":"Jul","Ago":"Ago","Set":"Set","Ott":"Out","Nov":"Nov","Dic":"Dez"};
    base.pl=Object.assign({},base.en,{"Profilo":"Profil","Generale":"Ogólne","Aspetto":"Wygląd","Sezioni":"Sekcje","Notifiche e Promemoria":"Powiadomienia i przypomnienia","Dati":"Dane","Supporto":"Pomoc","Spese":"Wydatki","Uscite":"Wydatki","Entrate":"Przychody","Saldo":"Saldo","Storico":"Historia","Statistiche":"Statystyki","Stat":"Stat.","Patrimonio":"Majątek","Aree":"Obszary","Voci":"Pozycje","Categorie":"Kategorie","Metodi di pagamento":"Metody płatności","Riordina":"Zmień kolejność","Lista":"Lista","Lista categorie":"Lista kategorii","Lista Aree":"Lista obszarów","Default":"Domyślny","Accorpa":"Scal","Indietro":"Wstecz","Formato data":"Format daty","Primo giorno settimana":"Pierwszy dzień tygodnia","Movimenti futuri":"Przyszłe transakcje","Solo fino a oggi":"Tylko do dziś","Mostra anche future":"Pokaż też przyszłe","Data operazione":"Data operacji","Data inserimento":"Data wprowadzenia","Più recenti":"Najnowsze","Più vecchi":"Najstarsze","Lingua":"Język","Valuta principale":"Główna waluta","Metriche":"Metryki","IA":"AI","Salva lingua":"Zapisz język","Nuova uscita":"Nowy wydatek","Nuova entrata":"Nowy przychód","Importo":"Kwota","Categoria":"Kategoria","Metodo":"Metoda","Descrizione":"Opis","Data":"Data","Rateizza":"Rozłóż","Aggiungi uscita":"Dodaj wydatek","Aggiungi entrata":"Dodaj przychód","Contattaci":"Kontakt","Invia messaggio":"Wyślij wiadomość","Messaggio":"Wiadomość","Oggetto":"Temat","Nome":"Nazwa","Email":"Email","Home":"Strona główna","Altro":"Więcej","Salva":"Zapisz","Annulla":"Anuluj","Aggiungi categoria uscita":"Dodaj kategorię","Nessun default":"Brak domyślnego","Per Aree":"Według obszarów","Personalizzato":"Niestandardowy","Archiviata":"Zarchiwizowana","Archiviato":"Zarchiwizowany","Apri":"Otwórz","Chiudi":"Zamknij","Domande frequenti":"FAQ","Lingua aggiornata":"Język zaktualizowany","Saldo Home":"Saldo strona główna","Valuta secondaria":"Waluta dodatkowa","Mostra nello storico":"Pokaż w historii","Mostra nelle statistiche":"Pokaż w statystykach","Mostra nel budget":"Pokaż w budżecie","Mostra nel patrimonio":"Pokaż w majątku","Uscita":"Wydatek","Entrata":"Przychód","Uscite mese":"Wydatki w tym miesiącu","Entrate mese":"Przychody w tym miesiącu","Saldo mese":"Saldo w tym miesiącu","Saldo ultimi 12 mesi":"Saldo ostatnich 12 miesięcy","Tasso aggiornato in tempo reale":"Kurs w czasie rzeczywistym","Distribuzione uscite":"Rozkład wydatków","Entrate vs Uscite":"Przychody vs Wydatki","Saldo mensile":"Miesięczne saldo","Ultime uscite":"Ostatnie wydatki","Ultime entrate":"Ostatnie przychody","Nessuna spesa":"Brak wydatków","Filtri":"Filtry","Tutti gli anni":"Wszystkie lata","Tutti i mesi":"Wszystkie miesiące","voci":"pozycje","ricorrenti da confermare per":"cykliczne do potwierdzenia","alert di spesa superati":"przekroczone alerty wydatków","Eliminare?":"Usunąć?","Categoria":"Kategoria","Area":"Obszar","Data da":"Data od","Data a":"Data do","Importo min":"Kwota min","Importo max":"Kwota maks","Conversione":"Przeliczenie","Elimina":"Usuń","Nessun dato":"Brak danych","Nessuna uscita":"Brak wydatków","Nessuna entrata":"Brak przychodów","Tutte":"Wszystkie","Tutto gestito":"Wszystko obsłużone","Gennaio":"Styczeń","Febbraio":"Luty","Marzo":"Marzec","Aprile":"Kwiecień","Maggio":"Maj","Giugno":"Czerwiec","Luglio":"Lipiec","Agosto":"Sierpień","Settembre":"Wrzesień","Ottobre":"Październik","Novembre":"Listopad","Dicembre":"Grudzień","Gen":"Sty","Feb":"Lut","Mar":"Mar","Apr":"Kwi","Mag":"Maj","Giu":"Cze","Lug":"Lip","Ago":"Sie","Set":"Wrz","Ott":"Paź","Nov":"Lis","Dic":"Gru"});
    base.nl=Object.assign({},base.en,{"Profilo":"Profiel","Generale":"Algemeen","Aspetto":"Weergave","Sezioni":"Secties","Notifiche e Promemoria":"Meldingen en herinneringen","Dati":"Gegevens","Supporto":"Support","Spese":"Uitgaven","Uscite":"Uitgaven","Entrate":"Inkomsten","Saldo":"Saldo","Storico":"Geschiedenis","Statistiche":"Statistieken","Stat":"Stat.","Patrimonio":"Vermogen","Aree":"Gebieden","Voci":"Items","Categorie":"Categorieën","Metodi di pagamento":"Betaalmethoden","Riordina":"Herschikken","Lista":"Lijst","Lista categorie":"Categorielijst","Lista Aree":"Gebiedenlijst","Default":"Standaard","Accorpa":"Samenvoegen","Indietro":"Terug","Formato data":"Datumnotatie","Primo giorno settimana":"Eerste dag van de week","Movimenti futuri":"Toekomstige transacties","Solo fino a oggi":"Alleen tot vandaag","Mostra anche future":"Ook toekomstige tonen","Data operazione":"Transactiedatum","Data inserimento":"Invoerdatum","Più recenti":"Nieuwste","Più vecchi":"Oudste","Lingua":"Taal","Valuta principale":"Hoofdvaluta","Metriche":"Statistieken","IA":"AI","Salva lingua":"Taal opslaan","Nuova uscita":"Nieuwe uitgave","Nuova entrata":"Nieuwe inkomst","Importo":"Bedrag","Categoria":"Categorie","Metodo":"Methode","Descrizione":"Beschrijving","Data":"Datum","Rateizza":"Spreiden","Aggiungi uscita":"Uitgave toevoegen","Aggiungi entrata":"Inkomst toevoegen","Contattaci":"Contact","Invia messaggio":"Bericht sturen","Messaggio":"Bericht","Oggetto":"Onderwerp","Nome":"Naam","Email":"Email","Home":"Startpagina","Altro":"Meer","Salva":"Opslaan","Annulla":"Annuleren","Aggiungi categoria uscita":"Categorie toevoegen","Nessun default":"Geen standaard","Per Aree":"Op gebieden","Personalizzato":"Aangepast","Archiviata":"Gearchiveerd","Archiviato":"Gearchiveerd","Apri":"Openen","Chiudi":"Sluiten","Domande frequenti":"FAQ","Lingua aggiornata":"Taal bijgewerkt","Saldo Home":"Startpaginasaldo","Valuta secondaria":"Secundaire valuta","Mostra nello storico":"Weergeven in geschiedenis","Mostra nelle statistiche":"Weergeven in statistieken","Mostra nel budget":"Weergeven in budget","Mostra nel patrimonio":"Weergeven in vermogen","Uscita":"Uitgave","Entrata":"Inkomst","Uscite mese":"Uitgaven deze maand","Entrate mese":"Inkomsten deze maand","Saldo mese":"Saldo deze maand","Saldo ultimi 12 mesi":"Saldo laatste 12 maanden","Tasso aggiornato in tempo reale":"Wisselkoers in realtime","Distribuzione uscite":"Verdeling uitgaven","Entrate vs Uscite":"Inkomsten vs Uitgaven","Saldo mensile":"Maandsaldo","Ultime uscite":"Recente uitgaven","Ultime entrate":"Recente inkomsten","Nessuna spesa":"Geen uitgaven","Filtri":"Filters","Tutti gli anni":"Alle jaren","Tutti i mesi":"Alle maanden","voci":"items","ricorrenti da confermare per":"terugkerend te bevestigen voor","alert di spesa superati":"uitgavenwaarschuwingen overschreden","Eliminare?":"Verwijderen?","Categoria":"Categorie","Area":"Gebied","Data da":"Datum van","Data a":"Datum tot","Importo min":"Min bedrag","Importo max":"Max bedrag","Conversione":"Omrekening","Elimina":"Verwijderen","Nessun dato":"Geen gegevens","Nessuna uscita":"Geen uitgaven","Nessuna entrata":"Geen inkomsten","Tutte":"Alle","Tutto gestito":"Alles afgehandeld","Gennaio":"Januari","Febbraio":"Februari","Marzo":"Maart","Aprile":"April","Maggio":"Mei","Giugno":"Juni","Luglio":"Juli","Agosto":"Augustus","Settembre":"September","Ottobre":"Oktober","Novembre":"November","Dicembre":"December","Gen":"Jan","Feb":"Feb","Mar":"Mrt","Apr":"Apr","Mag":"Mei","Giu":"Jun","Lug":"Jul","Ago":"Aug","Set":"Sep","Ott":"Okt","Nov":"Nov","Dic":"Dec"});
    base.ro=Object.assign({},base.en,{"Profilo":"Profil","Generale":"General","Aspetto":"Aspect","Sezioni":"Secțiuni","Notifiche e Promemoria":"Notificări și mementouri","Dati":"Date","Supporto":"Suport","Spese":"Cheltuieli","Uscite":"Cheltuieli","Entrate":"Venituri","Saldo":"Sold","Storico":"Istoric","Statistiche":"Statistici","Stat":"Stat.","Patrimonio":"Patrimoniu","Aree":"Zone","Voci":"Elemente","Categorie":"Categorii","Metodi di pagamento":"Metode de plată","Riordina":"Reordonează","Lista":"Listă","Lista categorie":"Listă categorii","Lista Aree":"Listă zone","Default":"Implicit","Accorpa":"Îmbinare","Indietro":"Înapoi","Formato data":"Format dată","Primo giorno settimana":"Prima zi a săptămânii","Movimenti futuri":"Tranzacții viitoare","Solo fino a oggi":"Numai până azi","Mostra anche future":"Arată și viitoare","Data operazione":"Data operațiunii","Data inserimento":"Data introducerii","Più recenti":"Cele mai recente","Più vecchi":"Cele mai vechi","Lingua":"Limbă","Valuta principale":"Monedă principală","Metriche":"Statistici","IA":"AI","Salva lingua":"Salvați limba","Nuova uscita":"Cheltuială nouă","Nuova entrata":"Venit nou","Importo":"Sumă","Categoria":"Categorie","Metodo":"Metodă","Descrizione":"Descriere","Data":"Dată","Rateizza":"Eșalonare","Aggiungi uscita":"Adăugați cheltuială","Aggiungi entrata":"Adăugați venit","Contattaci":"Contactați-ne","Invia messaggio":"Trimite mesaj","Messaggio":"Mesaj","Oggetto":"Subiect","Nome":"Nume","Email":"Email","Home":"Acasă","Altro":"Mai mult","Salva":"Salvează","Annulla":"Anulează","Aggiungi categoria uscita":"Adaugă categorie","Nessun default":"Fără implicit","Per Aree":"Pe zone","Personalizzato":"Personalizat","Archiviata":"Arhivată","Archiviato":"Arhivat","Apri":"Deschide","Chiudi":"Închide","Domande frequenti":"Întrebări frecvente","Lingua aggiornata":"Limbă actualizată","Saldo Home":"Sold acasă","Valuta secondaria":"Monedă secundară","Mostra nello storico":"Afișează în istoric","Mostra nelle statistiche":"Afișează în statistici","Mostra nel budget":"Afișează în buget","Mostra nel patrimonio":"Afișează în patrimoniu","Uscita":"Cheltuială","Entrata":"Venit","Uscite mese":"Cheltuieli luna aceasta","Entrate mese":"Venituri luna aceasta","Saldo mese":"Sold luna aceasta","Saldo ultimi 12 mesi":"Sold ultimele 12 luni","Tasso aggiornato in tempo reale":"Curs în timp real","Distribuzione uscite":"Distribuția cheltuielilor","Entrate vs Uscite":"Venituri vs Cheltuieli","Saldo mensile":"Sold lunar","Ultime uscite":"Ultimele cheltuieli","Ultime entrate":"Ultimele venituri","Nessuna spesa":"Nicio cheltuială","Filtri":"Filtre","Tutti gli anni":"Toți anii","Tutti i mesi":"Toate lunile","voci":"elemente","ricorrenti da confermare per":"recurente de confirmat pentru","alert di spesa superati":"alerte de cheltuieli depășite","Eliminare?":"Șterge?","Categoria":"Categorie","Area":"Zonă","Data da":"Dată de la","Data a":"Dată până la","Importo min":"Sumă min","Importo max":"Sumă max","Conversione":"Conversie","Elimina":"Șterge","Nessun dato":"Nicio dată","Nessuna uscita":"Nicio cheltuială","Nessuna entrata":"Niciun venit","Tutte":"Toate","Tutto gestito":"Totul gestionat","Gennaio":"Ianuarie","Febbraio":"Februarie","Marzo":"Martie","Aprile":"Aprilie","Maggio":"Mai","Giugno":"Iunie","Luglio":"Iulie","Agosto":"August","Settembre":"Septembrie","Ottobre":"Octombrie","Novembre":"Noiembrie","Dicembre":"Decembrie","Gen":"Ian","Feb":"Feb","Mar":"Mar","Apr":"Apr","Mag":"Mai","Giu":"Iun","Lug":"Iul","Ago":"Aug","Set":"Sep","Ott":"Oct","Nov":"Nov","Dic":"Dec"});
    base.el=Object.assign({},base.en,{"Profilo":"Προφίλ","Generale":"Γενικά","Aspetto":"Εμφάνιση","Sezioni":"Ενότητες","Notifiche e Promemoria":"Ειδοποιήσεις και υπενθυμίσεις","Dati":"Δεδομένα","Supporto":"Υποστήριξη","Spese":"Έξοδα","Uscite":"Έξοδα","Entrate":"Έσοδα","Saldo":"Υπόλοιπο","Storico":"Ιστορικό","Statistiche":"Στατιστικά","Stat":"Στατ.","Patrimonio":"Περιουσία","Aree":"Περιοχές","Voci":"Στοιχεία","Categorie":"Κατηγορίες","Metodi di pagamento":"Μέθοδοι πληρωμής","Riordina":"Αναδιάταξη","Lista":"Λίστα","Lista categorie":"Λίστα κατηγοριών","Lista Aree":"Λίστα περιοχών","Default":"Προεπιλογή","Accorpa":"Συγχώνευση","Indietro":"Πίσω","Formato data":"Μορφή ημερομηνίας","Primo giorno settimana":"Πρώτη μέρα εβδομάδας","Movimenti futuri":"Μελλοντικές κινήσεις","Solo fino a oggi":"Μόνο έως σήμερα","Mostra anche future":"Εμφάνιση και μελλοντικών","Data operazione":"Ημερομηνία πράξης","Data inserimento":"Ημερομηνία καταχώρησης","Più recenti":"Πιο πρόσφατα","Più vecchi":"Παλαιότερα","Lingua":"Γλώσσα","Valuta principale":"Κύριο νόμισμα","Metriche":"Στατιστικά","IA":"AI","Salva lingua":"Αποθήκευση γλώσσας","Nuova uscita":"Νέο έξοδο","Nuova entrata":"Νέο έσοδο","Importo":"Ποσό","Categoria":"Κατηγορία","Metodo":"Μέθοδος","Descrizione":"Περιγραφή","Data":"Ημερομηνία","Rateizza":"Κατανομή","Aggiungi uscita":"Προσθήκη εξόδου","Aggiungi entrata":"Προσθήκη εσόδου","Contattaci":"Επικοινωνία","Invia messaggio":"Αποστολή μηνύματος","Messaggio":"Μήνυμα","Oggetto":"Θέμα","Nome":"Όνομα","Email":"Email","Home":"Αρχική","Altro":"Περισσότερα","Salva":"Αποθήκευση","Annulla":"Άκυρο","Aggiungi categoria uscita":"Προσθήκη κατηγορίας","Nessun default":"Χωρίς προεπιλογή","Per Aree":"Ανά περιοχή","Personalizzato":"Προσαρμοσμένο","Archiviata":"Αρχειοθετήθηκε","Archiviato":"Αρχειοθετήθηκε","Apri":"Άνοιγμα","Chiudi":"Κλείσιμο","Domande frequenti":"Συχνές ερωτήσεις","Lingua aggiornata":"Γλώσσα ενημερώθηκε","Saldo Home":"Υπόλοιπο αρχικής","Valuta secondaria":"Δευτερεύον νόμισμα","Mostra nello storico":"Εμφάνιση στο ιστορικό","Mostra nelle statistiche":"Εμφάνιση στα στατιστικά","Mostra nel budget":"Εμφάνιση στον προϋπολογισμό","Mostra nel patrimonio":"Εμφάνιση στην περιουσία","Uscita":"Έξοδο","Entrata":"Έσοδο","Uscite mese":"Έξοδα μήνα","Entrate mese":"Έσοδα μήνα","Saldo mese":"Υπόλοιπο μήνα","Saldo ultimi 12 mesi":"Υπόλοιπο 12 μηνών","Tasso aggiornato in tempo reale":"Συναλλαγματική σε πραγματικό χρόνο","Distribuzione uscite":"Κατανομή εξόδων","Entrate vs Uscite":"Έσοδα vs Έξοδα","Saldo mensile":"Μηνιαίο υπόλοιπο","Ultime uscite":"Τελευταία έξοδα","Ultime entrate":"Τελευταία έσοδα","Nessuna spesa":"Δεν υπάρχουν έξοδα","Filtri":"Φίλτρα","Tutti gli anni":"Όλα τα έτη","Tutti i mesi":"Όλοι οι μήνες","voci":"στοιχεία","ricorrenti da confermare per":"επαναλαμβανόμενα προς επιβεβαίωση","alert di spesa superati":"ειδοποιήσεις εξόδων υπερβλήθηκαν","Eliminare?":"Διαγραφή;","Categoria":"Κατηγορία","Area":"Περιοχή","Data da":"Ημερομηνία από","Data a":"Ημερομηνία έως","Importo min":"Ελάχ. ποσό","Importo max":"Μέγ. ποσό","Conversione":"Μετατροπή","Elimina":"Διαγραφή","Nessun dato":"Δεν υπάρχουν δεδομένα","Nessuna uscita":"Δεν υπάρχουν έξοδα","Nessuna entrata":"Δεν υπάρχουν έσοδα","Tutte":"Όλα","Tutto gestito":"Όλα διαχειρισμένα","Gennaio":"Ιανουάριος","Febbraio":"Φεβρουάριος","Marzo":"Μάρτιος","Aprile":"Απρίλιος","Maggio":"Μάιος","Giugno":"Ιούνιος","Luglio":"Ιούλιος","Agosto":"Αύγουστος","Settembre":"Σεπτέμβριος","Ottobre":"Οκτώβριος","Novembre":"Νοέμβριος","Dicembre":"Δεκέμβριος","Gen":"Ιαν","Feb":"Φεβ","Mar":"Μαρ","Apr":"Απρ","Mag":"Μάι","Giu":"Ιούν","Lug":"Ιούλ","Ago":"Αύγ","Set":"Σεπ","Ott":"Οκτ","Nov":"Νοε","Dic":"Δεκ"});
    if(base.en)Object.assign(base.en,{"Movimenti":"Movements","+ Aggiungi":"+ Add","Ricorrenti":"Recurring","Transazioni ricorrenti":"Recurring transactions","Aggiungi":"Add","Nuovo":"New","Nuova":"New","Salva":"Save","Annulla":"Cancel","Elimina":"Delete","Conferma":"Confirm","Modifica":"Edit","Crea":"Create","Cerca":"Search","Indietro":"Back","Caricamento...":"Loading...","Ordine":"Order","Ordine voci":"Sort order","Voce":"Item","Voce 1":"Item 1","Voce 2":"Item 2","Voce 3":"Item 3","Singola":"Single","Multiple":"Multiple","Entrata aggiunta":"Income added","Uscita aggiunta":"Expense added","Es. Pagamento affitto":"E.g. Rent payment","Cerca descrizione o categoria...":"Search description or category...","Ricorrente non registrata":"Recurring not recorded","Va confermata, saltata o inserita manualmente?":"To confirm, skip or enter manually?","Mese":"Month","Anno":"Year","Range":"Range","Annuale":"Annual","Mensile":"Monthly","Settimanale":"Weekly","Giornaliero":"Daily","Generali":"General","Risparmio":"Savings","Risparmio pianificato":"Planned savings","Risparmio pianif.":"Planned sav.","Risparmio reale":"Actual savings","Risparmio potenziale":"Potential savings","Score attendibilità":"Reliability score","Rateizzato":"Amortised","Reale":"Actual","Speso nel periodo":"Spent in period","Spese alimentari in aumento":"Food expenses increasing","Spese extra concentrate nel weekend":"Extra expenses concentrated on weekends","Nessuna criticità evidente":"No obvious issues","Per categoria":"By category","Budget totale":"Total budget","Vuoi analizzare le singole uscite per capire dove intervenire?":"Want to analyse individual expenses to understand where to act?","Vuoi impostare un limite più stretto per il resto del mese?":"Want to set a stricter limit for the rest of the month?","Suddivisione salvata con successo!":"Breakdown saved successfully!","Salva Suddivisione":"Save Breakdown","Piano di risparmio mensile":"Monthly savings plan","Budget ({sym})":"Budget","Budget per categoria — {titleLabel}":"Budget by category","Budget per area — {titleLabel}":"Budget by area","Salva modifiche":"Save changes","Entrate vs Uscite {curYear}":"Income vs Expenses","Obiettivi di risparmio":"Savings goals","Obiettivi":"Goals","+ Nuovo":"+ New","Icona":"Icon","Colore":"Colour","Periodo":"Period","Target ({sym})":"Target","Già risparmiato":"Already saved","Scadenza":"Deadline","Completato!":"Completed!","Scaduto":"Expired","mancano":"remaining","Nessun obiettivo. Creane uno!":"No goals yet. Create one!","+ risparmio":"+ saving","es. Vacanza":"e.g. Vacation","vs mese scorso":"vs last month","Modalità":"Mode","Inserimento":"Entry","Mese corrente - non ancora salvato":"Current month - not yet saved","Copia valori dal mese precedente":"Copy values from previous month","Aggiungi voce patrimonio":"Add asset entry","Conto corrente":"Current account","Conto deposito":"Deposit account","Come vengono aggiornati i valori del patrimonio.":"How asset values are updated.","Come vengono aggiornati i valori del patrimonio":"How asset values are updated","Inserisci i valori manualmente":"Enter values manually","Beta: collega ai metodi di pagamento":"Beta: link to payment methods","Andamento patrimonio — {histViewYear}":"Asset trend","Snapshot eliminato":"Snapshot deleted","Eliminare snapshot ":"Delete snapshot","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"Delete this asset entry? Related values will also be removed.","Appunti":"Notes","Appunto":"Note","Appunto salvato":"Note saved","Appunto aggiornato":"Note updated","Salva appunto":"Save note","Aggiorna appunto":"Update note","Scrivi un appunto...":"Write a note...","Titolo":"Title","Nota":"Note","Note":"Notes","Note (opzionale)":"Notes (optional)","Nuova voce":"New item","Nuova area":"New area","Documento caricato":"Document uploaded","Salva o condividi ":"Save or share ","Categoria / Voce *":"Category / Item *","Alert superato!":"Alert triggered!","Nessun alert configurato.":"No alerts configured.","Crea alert":"Create alert","Nuovo alert":"New alert","al 100%":"at 100%","Subito":"Immediately","Superato di":"Exceeded by","Budget (€)":"Budget (€)","Testo personalizzato (opzionale)":"Custom text (optional)","Attiva":"Active","Profilo":"Profile","Lingua, valuta, formato data, metriche e IA":"Language, currency, date format, metrics and AI","Aree e categorie delle entrate":"Income areas and categories","Aree, categorie e metodi di pagamento":"Areas, categories and payment methods","Modalità, aree e voci patrimonio":"Modes, areas and asset entries","Ordinamento e movimenti futuri":"Sorting and future transactions","Importa, esporta, backup, elimina":"Import, export, backup, delete","Promemoria inserimento, notifiche custom":"Entry reminders, custom notifications","Versione, piano, aggiornamenti":"Version, plan, updates","Lista e riordino aree patrimonio":"Wealth areas list and order","Lista e riordino voci patrimonio":"Wealth entries list and order","Lista, riordino e default delle aree entrate":"Income areas: list, order and default","Lista, riordino e default delle aree uscite":"Expense areas: list, order and default","Lista, riordino e default delle categorie entrate":"Income categories: list, order and default","Gestisci le aree delle entrate: lista, riordino e area default.":"Manage income areas: list, order and default area.","Gestisci le aree delle uscite: lista, riordino e area default.":"Manage expense areas: list, order and default area.","Coordinate bancarie":"Bank details","Aggiorna coordinate":"Update bank details","Salva coordinate":"Save bank details","Coordinate aggiornate":"Bank details updated","Coordinate salvate":"Bank details saved","Aggiorna password":"Update password","Password aggiornata":"Password updated","Conferma password":"Confirm password","Conferma password *":"Confirm password *","Crea account →":"Create account →","Notifiche e Promemoria":"Notifications & Reminders","Crea notifica":"Create notification","Nuova notifica":"New notification","Modifica notifica":"Edit notification","Attiva promemoria":"Enable reminder","Avviso quando ci sono ricorrenti da confermare":"Alert when there are recurring entries to confirm","Ogni giorno":"Every day","Ogni settimana":"Every week","Ogni mese":"Every month","Ogni anno":"Every year","Ogni 2 giorni":"Every 2 days","Ogni 3 giorni":"Every 3 days","Pulsante entrata":"Income button","Pulsante uscita":"Expense button","Aggiunta Rapida":"Quick add","Nota / Coordinata":"Note / Bank detail","Obiettivo":"Goal","Nota / Coordinata":"Note / Bank detail","Coordinata bancaria":"Bank detail","Obiettivo selezionato":"Selected goal","Mostra percentuale":"Show percentage","Mostra importi":"Show amounts","Aggiornamento automatico":"Automatic update","Numero massimo di caratteri":"Maximum characters","Contenuto da mostrare":"Content to show","Tipo di contenuto":"Content type","Versione":"Version","Supporto":"Support","Supporto diretto via email":"Direct email support","Come aggiungo una spesa?":"How do I add an expense?","Come importo i dati da Excel?":"How do I import data from Excel?","I tutorial YouTube saranno disponibili a breve!":"YouTube tutorials coming soon!","Il sito web sarà attivo a breve!":"The website will be live soon!","Backup ripristinato":"Backup restored","Backup pronto — scegli dove salvarlo":"Backup ready — choose where to save it","CSV pronto — scegli dove salvarlo":"CSV ready — choose where to save it","Mappa almeno Data e Importo":"Map at least Date and Amount","Nessun dato nel file Excel.":"No data in Excel file.","Impostazioni IA aggiornate":"AI settings updated","Impostazioni widget salvate":"Widget settings saved","Widget aggiornato":"Widget updated","Lingua aggiornata":"Language updated","Tipo":"Type","Tipo entrata":"Income type","Nome":"Name","Nome area":"Area name","Nome voce":"Item name","Valore":"Value","Inserisci il tuo nome.":"Enter your name.","Area non trovata":"Area not found","Nessuna voce":"No items","Nessuna ricorrente configurata.":"No recurring entries configured.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"I don't see any missing recurring entries for the current month.","Aggiunta rapida movimenti":"Quick add movements","Configurazione separata del widget Android":"Separate Android widget configuration","Nessuna spesa":"No expenses","Attiva la dark mode":"Enable dark mode","Questa area contiene ":"This area contains ","Config. patrimonio":"Asset config.","Confronto mese corrente ({curMonthKey})":"Current month comparison","Entrate, uscite, patrimonio e storico":"Income, expenses, assets and history","Errore salvataggio widget":"Widget save error","Salva e aggiorna widget":"Save and update widget","Saldo Home":"Home balance","vuoto":"empty","CATEGORIA":"CATEGORY","CAT/TIPO":"CAT/TYPE","Cat/Tipo":"Cat/Type"});
    if(base.es)Object.assign(base.es,{"Movimenti":"Movimientos","+ Aggiungi":"+ Añadir","Ricorrenti":"Recurrentes","Transazioni ricorrenti":"Transacciones recurrentes","Aggiungi":"Añadir","Nuovo":"Nuevo","Nuova":"Nueva","Salva":"Guardar","Annulla":"Cancelar","Elimina":"Eliminar","Conferma":"Confirmar","Modifica":"Editar","Crea":"Crear","Cerca":"Buscar","Indietro":"Atrás","Caricamento...":"Cargando...","Ordine":"Orden","Ordine voci":"Orden de elementos","Voce":"Elemento","Voce 1":"Elemento 1","Voce 2":"Elemento 2","Voce 3":"Elemento 3","Singola":"Individual","Multiple":"Múltiple","Entrata aggiunta":"Ingreso añadido","Uscita aggiunta":"Gasto añadido","Es. Pagamento affitto":"Ej. Pago de alquiler","Cerca descrizione o categoria...":"Buscar descripción o categoría...","Ricorrente non registrata":"Recurrente no registrado","Va confermata, saltata o inserita manualmente?":"¿Confirmar, saltar o introducir manualmente?","Mese":"Mes","Anno":"Año","Range":"Rango","Annuale":"Anual","Mensile":"Mensual","Settimanale":"Semanal","Giornaliero":"Diario","Generali":"General","Risparmio":"Ahorro","Risparmio pianificato":"Ahorro planificado","Risparmio pianif.":"Ahorro plan.","Risparmio reale":"Ahorro real","Risparmio potenziale":"Ahorro potencial","Score attendibilità":"Puntuación de fiabilidad","Rateizzato":"Amortizado","Reale":"Real","Speso nel periodo":"Gastado en el período","Spese alimentari in aumento":"Gastos alimentarios en aumento","Spese extra concentrate nel weekend":"Gastos extra concentrados en el fin de semana","Nessuna criticità evidente":"Sin problemas evidentes","Per categoria":"Por categoría","Budget totale":"Presupuesto total","Vuoi analizzare le singole uscite per capire dove intervenire?":"¿Quieres analizar los gastos individuales para saber dónde actuar?","Vuoi impostare un limite più stretto per il resto del mese?":"¿Quieres establecer un límite más estricto para el resto del mes?","Suddivisione salvata con successo!":"¡División guardada con éxito!","Salva Suddivisione":"Guardar División","Piano di risparmio mensile":"Plan de ahorro mensual","Budget ({sym})":"Presupuesto","Budget per categoria — {titleLabel}":"Presupuesto por categoría","Budget per area — {titleLabel}":"Presupuesto por área","Salva modifiche":"Guardar cambios","Entrate vs Uscite {curYear}":"Ingresos vs Gastos","Obiettivi di risparmio":"Objetivos de ahorro","Obiettivi":"Objetivos","+ Nuovo":"+ Nuevo","Icona":"Icono","Colore":"Color","Periodo":"Período","Target ({sym})":"Objetivo","Già risparmiato":"Ya ahorrado","Scadenza":"Vencimiento","Completato!":"¡Completado!","Scaduto":"Vencido","mancano":"faltan","Nessun obiettivo. Creane uno!":"Sin objetivos. ¡Crea uno!","+ risparmio":"+ ahorro","es. Vacanza":"ej. Vacaciones","vs mese scorso":"vs mes pasado","Modalità":"Modo","Inserimento":"Entrada","Mese corrente - non ancora salvato":"Mes actual - no guardado aún","Copia valori dal mese precedente":"Copiar valores del mes anterior","Aggiungi voce patrimonio":"Añadir elemento de patrimonio","Conto corrente":"Cuenta corriente","Conto deposito":"Cuenta de depósito","Come vengono aggiornati i valori del patrimonio.":"Cómo se actualizan los valores del patrimonio.","Come vengono aggiornati i valori del patrimonio":"Cómo se actualizan los valores del patrimonio","Inserisci i valori manualmente":"Introduce los valores manualmente","Beta: collega ai metodi di pagamento":"Beta: enlazar a métodos de pago","Andamento patrimonio — {histViewYear}":"Evolución del patrimonio","Snapshot eliminato":"Instantánea eliminada","Eliminare snapshot ":"Eliminar instantánea","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"¿Eliminar este elemento del patrimonio? También se eliminarán los valores relacionados.","Appunti":"Notas","Appunto":"Nota","Appunto salvato":"Nota guardada","Appunto aggiornato":"Nota actualizada","Salva appunto":"Guardar nota","Aggiorna appunto":"Actualizar nota","Scrivi un appunto...":"Escribe una nota...","Titolo":"Título","Nota":"Nota","Note":"Notas","Note (opzionale)":"Notas (opcional)","Nuova voce":"Nuevo elemento","Nuova area":"Nueva área","Documento caricato":"Documento cargado","Salva o condividi ":"Guardar o compartir ","Categoria / Voce *":"Categoría / Elemento *","Alert superato!":"¡Alerta superada!","Nessun alert configurato.":"Sin alertas configuradas.","Crea alert":"Crear alerta","Nuovo alert":"Nueva alerta","al 100%":"al 100%","Subito":"Inmediatamente","Superato di":"Superado en","Budget (€)":"Presupuesto (€)","Testo personalizzato (opzionale)":"Texto personalizado (opcional)","Attiva":"Activo","Profilo":"Perfil","Lingua, valuta, formato data, metriche e IA":"Idioma, moneda, formato de fecha, métricas e IA","Aree e categorie delle entrate":"Áreas y categorías de ingresos","Aree, categorie e metodi di pagamento":"Áreas, categorías y métodos de pago","Modalità, aree e voci patrimonio":"Modalidades, áreas y elementos de patrimonio","Ordinamento e movimenti futuri":"Ordenación y movimientos futuros","Importa, esporta, backup, elimina":"Importar, exportar, copia de seguridad, eliminar","Promemoria inserimento, notifiche custom":"Recordatorios de inserción, notificaciones personalizadas","Versione, piano, aggiornamenti":"Versión, plan, actualizaciones","Lista e riordino aree patrimonio":"Lista y orden de áreas del patrimonio","Lista e riordino voci patrimonio":"Lista y orden de elementos del patrimonio","Lista, riordino e default delle aree entrate":"Áreas de ingresos: lista, orden y predeterminado","Lista, riordino e default delle aree uscite":"Áreas de gastos: lista, orden y predeterminado","Lista, riordino e default delle categorie entrate":"Categorías de ingresos: lista, orden y predeterminado","Gestisci le aree delle entrate: lista, riordino e area default.":"Gestionar áreas de ingresos: lista, orden y área predeterminada.","Gestisci le aree delle uscite: lista, riordino e area default.":"Gestionar áreas de gastos: lista, orden y área predeterminada.","Coordinate bancarie":"Datos bancarios","Aggiorna coordinate":"Actualizar datos bancarios","Salva coordinate":"Guardar datos bancarios","Coordinate aggiornate":"Datos bancarios actualizados","Coordinate salvate":"Datos bancarios guardados","Aggiorna password":"Actualizar contraseña","Password aggiornata":"Contraseña actualizada","Conferma password":"Confirmar contraseña","Conferma password *":"Confirmar contraseña *","Crea account →":"Crear cuenta →","Notifiche e Promemoria":"Notificaciones y recordatorios","Crea notifica":"Crear notificación","Nuova notifica":"Nueva notificación","Modifica notifica":"Editar notificación","Attiva promemoria":"Activar recordatorio","Avviso quando ci sono ricorrenti da confermare":"Aviso cuando hay recurrentes por confirmar","Ogni giorno":"Cada día","Ogni settimana":"Cada semana","Ogni mese":"Cada mes","Ogni anno":"Cada año","Ogni 2 giorni":"Cada 2 días","Ogni 3 giorni":"Cada 3 días","Pulsante entrata":"Botón de ingreso","Pulsante uscita":"Botón de gasto","Versione":"Versión","Supporto":"Soporte","Supporto diretto via email":"Soporte directo por email","Come aggiungo una spesa?":"¿Cómo añado un gasto?","Come importo i dati da Excel?":"¿Cómo importo datos de Excel?","I tutorial YouTube saranno disponibili a breve!":"¡Los tutoriales de YouTube estarán disponibles pronto!","Il sito web sarà attivo a breve!":"¡El sitio web estará activo pronto!","Backup ripristinato":"Copia de seguridad restaurada","Backup pronto — scegli dove salvarlo":"Copia de seguridad lista — elige dónde guardarla","CSV pronto — scegli dove salvarlo":"CSV listo — elige dónde guardarlo","Mappa almeno Data e Importo":"Mapea al menos Fecha e Importe","Nessun dato nel file Excel.":"Sin datos en el archivo Excel.","Impostazioni IA aggiornate":"Ajustes de IA actualizados","Impostazioni widget salvate":"Ajustes del widget guardados","Widget aggiornato":"Widget actualizado","Lingua aggiornata":"Idioma actualizado","Tipo":"Tipo","Tipo entrata":"Tipo de ingreso","Nome":"Nombre","Nome area":"Nombre del área","Nome voce":"Nombre del elemento","Valore":"Valor","Inserisci il tuo nome.":"Introduce tu nombre.","Area non trovata":"Área no encontrada","Nessuna voce":"Sin elementos","Nessuna ricorrente configurata.":"Sin recurrentes configuradas.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"No veo entradas o salidas recurrentes faltantes en el mes actual.","Aggiunta rapida movimenti":"Añadir movimientos rápido","Configurazione separata del widget Android":"Configuración separada del widget Android","Nessuna spesa":"Sin gastos","Attiva la dark mode":"Activar modo oscuro","Questa area contiene ":"Esta área contiene ","Config. patrimonio":"Config. patrimonio","Confronto mese corrente ({curMonthKey})":"Comparación mes actual","Entrate, uscite, patrimonio e storico":"Ingresos, gastos, patrimonio e historial","Errore salvataggio widget":"Error al guardar el widget","Salva e aggiorna widget":"Guardar y actualizar widget","Saldo Home":"Saldo inicial","vuoto":"vacío","CATEGORIA":"CATEGORÍA","CAT/TIPO":"CAT/TIPO","Cat/Tipo":"Cat/Tipo"});
    if(base.fr)Object.assign(base.fr,{"Movimenti":"Mouvements","+ Aggiungi":"+ Ajouter","Ricorrenti":"Récurrents","Transazioni ricorrenti":"Transactions récurrentes","Aggiungi":"Ajouter","Nuovo":"Nouveau","Nuova":"Nouvelle","Salva":"Enregistrer","Annulla":"Annuler","Elimina":"Supprimer","Conferma":"Confirmer","Modifica":"Modifier","Crea":"Créer","Cerca":"Rechercher","Indietro":"Retour","Caricamento...":"Chargement...","Ordine":"Ordre","Ordine voci":"Ordre des éléments","Voce":"Élément","Voce 1":"Élément 1","Voce 2":"Élément 2","Voce 3":"Élément 3","Singola":"Unique","Multiple":"Multiple","Entrata aggiunta":"Revenu ajouté","Uscita aggiunta":"Dépense ajoutée","Es. Pagamento affitto":"Ex. Paiement du loyer","Cerca descrizione o categoria...":"Rechercher description ou catégorie...","Ricorrente non registrata":"Récurrent non enregistré","Va confermata, saltata o inserita manualmente?":"À confirmer, ignorer ou saisir manuellement?","Mese":"Mois","Anno":"Année","Range":"Plage","Annuale":"Annuel","Mensile":"Mensuel","Settimanale":"Hebdomadaire","Giornaliero":"Quotidien","Generali":"Général","Risparmio":"Épargne","Risparmio pianificato":"Épargne planifiée","Risparmio pianif.":"Épargne plan.","Risparmio reale":"Épargne réelle","Risparmio potenziale":"Épargne potentielle","Score attendibilità":"Score de fiabilité","Rateizzato":"Amorti","Reale":"Réel","Speso nel periodo":"Dépensé sur la période","Spese alimentari in aumento":"Dépenses alimentaires en hausse","Spese extra concentrate nel weekend":"Dépenses supplémentaires concentrées le week-end","Nessuna criticità evidente":"Aucun problème évident","Per categoria":"Par catégorie","Budget totale":"Budget total","Vuoi analizzare le singole uscite per capire dove intervenire?":"Vous voulez analyser les dépenses individuelles pour savoir où agir?","Vuoi impostare un limite più stretto per il resto del mese?":"Vous voulez fixer une limite plus stricte pour le reste du mois?","Suddivisione salvata con successo!":"Répartition enregistrée avec succès!","Salva Suddivisione":"Enregistrer la répartition","Piano di risparmio mensile":"Plan d'épargne mensuel","Budget ({sym})":"Budget","Budget per categoria — {titleLabel}":"Budget par catégorie","Budget per area — {titleLabel}":"Budget par zone","Salva modifiche":"Enregistrer les modifications","Entrate vs Uscite {curYear}":"Revenus vs Dépenses","Obiettivi di risparmio":"Objectifs d'épargne","Obiettivi":"Objectifs","+ Nuovo":"+ Nouveau","Icona":"Icône","Colore":"Couleur","Periodo":"Période","Target ({sym})":"Objectif","Già risparmiato":"Déjà épargné","Scadenza":"Échéance","Completato!":"Terminé!","Scaduto":"Expiré","mancano":"restent","Nessun obiettivo. Creane uno!":"Aucun objectif. Créez-en un!","+ risparmio":"+ épargne","es. Vacanza":"ex. Vacances","vs mese scorso":"vs mois dernier","Modalità":"Mode","Inserimento":"Saisie","Mese corrente - non ancora salvato":"Mois courant - pas encore enregistré","Copia valori dal mese precedente":"Copier les valeurs du mois précédent","Aggiungi voce patrimonio":"Ajouter un élément au patrimoine","Conto corrente":"Compte courant","Conto deposito":"Compte dépôt","Come vengono aggiornati i valori del patrimonio.":"Comment les valeurs du patrimoine sont mises à jour.","Come vengono aggiornati i valori del patrimonio":"Comment les valeurs du patrimoine sont mises à jour","Inserisci i valori manualmente":"Entrez les valeurs manuellement","Beta: collega ai metodi di pagamento":"Bêta: lier aux moyens de paiement","Andamento patrimonio — {histViewYear}":"Évolution du patrimoine","Snapshot eliminato":"Instantané supprimé","Eliminare snapshot ":"Supprimer l'instantané","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"Supprimer cet élément du patrimoine? Les valeurs associées seront également supprimées.","Appunti":"Notes","Appunto":"Note","Appunto salvato":"Note enregistrée","Appunto aggiornato":"Note mise à jour","Salva appunto":"Enregistrer la note","Aggiorna appunto":"Mettre à jour la note","Scrivi un appunto...":"Écrire une note...","Titolo":"Titre","Nota":"Note","Note":"Notes","Note (opzionale)":"Notes (optionnel)","Nuova voce":"Nouvel élément","Nuova area":"Nouvelle zone","Documento caricato":"Document téléchargé","Salva o condividi ":"Enregistrer ou partager ","Categoria / Voce *":"Catégorie / Élément *","Alert superato!":"Alerte déclenchée!","Nessun alert configurato.":"Aucune alerte configurée.","Crea alert":"Créer une alerte","Nuovo alert":"Nouvelle alerte","al 100%":"à 100%","Subito":"Immédiatement","Superato di":"Dépassé de","Budget (€)":"Budget (€)","Testo personalizzato (opzionale)":"Texte personnalisé (optionnel)","Attiva":"Actif","Profilo":"Profil","Lingua, valuta, formato data, metriche e IA":"Langue, devise, format de date, métriques et IA","Aree e categorie delle entrate":"Zones et catégories des revenus","Aree, categorie e metodi di pagamento":"Zones, catégories et moyens de paiement","Modalità, aree e voci patrimonio":"Modes, zones et éléments du patrimoine","Ordinamento e movimenti futuri":"Tri et mouvements futurs","Importa, esporta, backup, elimina":"Importer, exporter, sauvegarder, supprimer","Promemoria inserimento, notifiche custom":"Rappels de saisie, notifications personnalisées","Versione, piano, aggiornamenti":"Version, forfait, mises à jour","Lista e riordino aree patrimonio":"Liste et ordre des zones du patrimoine","Lista e riordino voci patrimonio":"Liste et ordre des éléments du patrimoine","Lista, riordino e default delle aree entrate":"Zones revenus: liste, ordre et défaut","Lista, riordino e default delle aree uscite":"Zones dépenses: liste, ordre et défaut","Lista, riordino e default delle categorie entrate":"Catégories revenus: liste, ordre et défaut","Gestisci le aree delle entrate: lista, riordino e area default.":"Gérer les zones de revenus: liste, ordre et zone par défaut.","Gestisci le aree delle uscite: lista, riordino e area default.":"Gérer les zones de dépenses: liste, ordre et zone par défaut.","Coordinate bancarie":"Coordonnées bancaires","Aggiorna coordinate":"Mettre à jour les coordonnées bancaires","Salva coordinate":"Enregistrer les coordonnées bancaires","Coordinate aggiornate":"Coordonnées bancaires mises à jour","Coordinate salvate":"Coordonnées bancaires enregistrées","Aggiorna password":"Mettre à jour le mot de passe","Password aggiornata":"Mot de passe mis à jour","Conferma password":"Confirmer le mot de passe","Conferma password *":"Confirmer le mot de passe *","Crea account →":"Créer un compte →","Notifiche e Promemoria":"Notifications et rappels","Crea notifica":"Créer une notification","Nuova notifica":"Nouvelle notification","Modifica notifica":"Modifier la notification","Attiva promemoria":"Activer le rappel","Avviso quando ci sono ricorrenti da confermare":"Alerte quand il y a des récurrents à confirmer","Ogni giorno":"Chaque jour","Ogni settimana":"Chaque semaine","Ogni mese":"Chaque mois","Ogni anno":"Chaque année","Ogni 2 giorni":"Tous les 2 jours","Ogni 3 giorni":"Tous les 3 jours","Pulsante entrata":"Bouton revenu","Pulsante uscita":"Bouton dépense","Versione":"Version","Supporto":"Support","Supporto diretto via email":"Support direct par email","Come aggiungo una spesa?":"Comment ajouter une dépense?","Come importo i dati da Excel?":"Comment importer des données depuis Excel?","I tutorial YouTube saranno disponibili a breve!":"Les tutoriels YouTube seront disponibles prochainement!","Il sito web sarà attivo a breve!":"Le site web sera actif prochainement!","Backup ripristinato":"Sauvegarde restaurée","Backup pronto — scegli dove salvarlo":"Sauvegarde prête — choisissez où l'enregistrer","CSV pronto — scegli dove salvarlo":"CSV prêt — choisissez où l'enregistrer","Mappa almeno Data e Importo":"Mappez au moins la Date et le Montant","Nessun dato nel file Excel.":"Aucune donnée dans le fichier Excel.","Impostazioni IA aggiornate":"Paramètres IA mis à jour","Impostazioni widget salvate":"Paramètres du widget enregistrés","Widget aggiornato":"Widget mis à jour","Lingua aggiornata":"Langue mise à jour","Tipo":"Type","Tipo entrata":"Type de revenu","Nome":"Nom","Nome area":"Nom de la zone","Nome voce":"Nom de l'élément","Valore":"Valeur","Inserisci il tuo nome.":"Entrez votre nom.","Area non trovata":"Zone non trouvée","Nessuna voce":"Aucun élément","Nessuna ricorrente configurata.":"Aucun récurrent configuré.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"Je ne vois pas d'entrées ou sorties récurrentes manquantes pour le mois courant.","Aggiunta rapida movimenti":"Ajout rapide de mouvements","Configurazione separata del widget Android":"Configuration séparée du widget Android","Nessuna spesa":"Aucune dépense","Attiva la dark mode":"Activer le mode sombre","Questa area contiene ":"Cette zone contient ","Config. patrimonio":"Config. patrimoine","Confronto mese corrente ({curMonthKey})":"Comparaison mois courant","Entrate, uscite, patrimonio e storico":"Revenus, dépenses, patrimoine et historique","Errore salvataggio widget":"Erreur enregistrement widget","Salva e aggiorna widget":"Enregistrer et mettre à jour le widget","Saldo Home":"Solde accueil","vuoto":"vide","CATEGORIA":"CATÉGORIE","CAT/TIPO":"CAT/TYPE","Cat/Tipo":"Cat/Type"});
    if(base.de)Object.assign(base.de,{"Movimenti":"Bewegungen","+ Aggiungi":"+ Hinzufügen","Ricorrenti":"Wiederkehrend","Transazioni ricorrenti":"Wiederkehrende Transaktionen","Aggiungi":"Hinzufügen","Nuovo":"Neu","Nuova":"Neu","Salva":"Speichern","Annulla":"Abbrechen","Elimina":"Löschen","Conferma":"Bestätigen","Modifica":"Bearbeiten","Crea":"Erstellen","Cerca":"Suchen","Indietro":"Zurück","Caricamento...":"Laden...","Ordine":"Reihenfolge","Ordine voci":"Reihenfolge","Voce":"Eintrag","Voce 1":"Eintrag 1","Voce 2":"Eintrag 2","Voce 3":"Eintrag 3","Singola":"Einzel","Multiple":"Mehrere","Entrata aggiunta":"Einnahme hinzugefügt","Uscita aggiunta":"Ausgabe hinzugefügt","Es. Pagamento affitto":"Z.B. Mietzahlung","Cerca descrizione o categoria...":"Beschreibung oder Kategorie suchen...","Ricorrente non registrata":"Wiederkehrend nicht erfasst","Va confermata, saltata o inserita manualmente?":"Bestätigen, überspringen oder manuell eingeben?","Mese":"Monat","Anno":"Jahr","Range":"Zeitraum","Annuale":"Jährlich","Mensile":"Monatlich","Settimanale":"Wöchentlich","Giornaliero":"Täglich","Generali":"Allgemein","Risparmio":"Ersparnisse","Risparmio pianificato":"Geplante Ersparnisse","Risparmio pianif.":"Gepl. Ersparnis","Risparmio reale":"Tatsächliche Ersparnisse","Risparmio potenziale":"Potenzielle Ersparnisse","Score attendibilità":"Zuverlässigkeitswert","Rateizzato":"Aufgeteilt","Reale":"Tatsächlich","Speso nel periodo":"Im Zeitraum ausgegeben","Spese alimentari in aumento":"Lebensmittelausgaben steigen","Spese extra concentrate nel weekend":"Zusatzausgaben am Wochenende konzentriert","Nessuna criticità evidente":"Keine offensichtlichen Probleme","Per categoria":"Nach Kategorie","Budget totale":"Gesamtbudget","Vuoi analizzare le singole uscite per capire dove intervenire?":"Möchten Sie einzelne Ausgaben analysieren, um zu verstehen, wo gehandelt werden soll?","Vuoi impostare un limite più stretto per il resto del mese?":"Möchten Sie eine strengere Grenze für den Rest des Monats setzen?","Suddivisione salvata con successo!":"Aufteilung erfolgreich gespeichert!","Salva Suddivisione":"Aufteilung speichern","Piano di risparmio mensile":"Monatlicher Sparplan","Budget ({sym})":"Budget","Budget per categoria — {titleLabel}":"Budget nach Kategorie","Budget per area — {titleLabel}":"Budget nach Bereich","Salva modifiche":"Änderungen speichern","Entrate vs Uscite {curYear}":"Einnahmen vs Ausgaben","Obiettivi di risparmio":"Sparziele","Obiettivi":"Ziele","+ Nuovo":"+ Neu","Icona":"Symbol","Colore":"Farbe","Periodo":"Zeitraum","Target ({sym})":"Ziel","Già risparmiato":"Bereits gespart","Scadenza":"Fälligkeit","Completato!":"Abgeschlossen!","Scaduto":"Abgelaufen","mancano":"verbleiben","Nessun obiettivo. Creane uno!":"Keine Ziele. Erstellen Sie eines!","+ risparmio":"+ Ersparnis","es. Vacanza":"z.B. Urlaub","vs mese scorso":"vs letzten Monat","Modalità":"Modus","Inserimento":"Eingabe","Mese corrente - non ancora salvato":"Aktueller Monat - noch nicht gespeichert","Copia valori dal mese precedente":"Werte vom Vormonat kopieren","Aggiungi voce patrimonio":"Vermögensposition hinzufügen","Conto corrente":"Girokonto","Conto deposito":"Sparkonto","Come vengono aggiornati i valori del patrimonio.":"Wie Vermögenswerte aktualisiert werden.","Come vengono aggiornati i valori del patrimonio":"Wie Vermögenswerte aktualisiert werden","Inserisci i valori manualmente":"Werte manuell eingeben","Beta: collega ai metodi di pagamento":"Beta: mit Zahlungsmethoden verknüpfen","Andamento patrimonio — {histViewYear}":"Vermögensentwicklung","Snapshot eliminato":"Snapshot gelöscht","Eliminare snapshot ":"Snapshot löschen","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"Diesen Vermögenseintrag löschen? Zugehörige Werte werden ebenfalls entfernt.","Appunti":"Notizen","Appunto":"Notiz","Appunto salvato":"Notiz gespeichert","Appunto aggiornato":"Notiz aktualisiert","Salva appunto":"Notiz speichern","Aggiorna appunto":"Notiz aktualisieren","Scrivi un appunto...":"Notiz schreiben...","Titolo":"Titel","Nota":"Notiz","Note":"Notizen","Note (opzionale)":"Notizen (optional)","Nuova voce":"Neuer Eintrag","Nuova area":"Neuer Bereich","Documento caricato":"Dokument hochgeladen","Salva o condividi ":"Speichern oder teilen ","Categoria / Voce *":"Kategorie / Eintrag *","Alert superato!":"Alarm ausgelöst!","Nessun alert configurato.":"Keine Alarme konfiguriert.","Crea alert":"Alarm erstellen","Nuovo alert":"Neuer Alarm","al 100%":"bei 100%","Subito":"Sofort","Superato di":"Überschritten um","Budget (€)":"Budget (€)","Testo personalizzato (opzionale)":"Benutzerdefinierter Text (optional)","Attiva":"Aktiv","Profilo":"Profil","Lingua, valuta, formato data, metriche e IA":"Sprache, Währung, Datumsformat, Metriken und KI","Aree e categorie delle entrate":"Einnahmenbereiche und Kategorien","Aree, categorie e metodi di pagamento":"Bereiche, Kategorien und Zahlungsmethoden","Modalità, aree e voci patrimonio":"Modi, Bereiche und Vermögenspositionen","Ordinamento e movimenti futuri":"Sortierung und zukünftige Bewegungen","Importa, esporta, backup, elimina":"Importieren, exportieren, sichern, löschen","Promemoria inserimento, notifiche custom":"Eingabeerinnerungen, benutzerdefinierte Benachrichtigungen","Versione, piano, aggiornamenti":"Version, Plan, Updates","Lista e riordino aree patrimonio":"Vermögensbereiche Liste und Reihenfolge","Lista e riordino voci patrimonio":"Vermögenspositionen Liste und Reihenfolge","Lista, riordino e default delle aree entrate":"Einnahmenbereiche: Liste, Reihenfolge und Standard","Lista, riordino e default delle aree uscite":"Ausgabenbereiche: Liste, Reihenfolge und Standard","Lista, riordino e default delle categorie entrate":"Einnahmenkategorien: Liste, Reihenfolge und Standard","Gestisci le aree delle entrate: lista, riordino e area default.":"Einnahmenbereiche verwalten: Liste, Reihenfolge und Standardbereich.","Gestisci le aree delle uscite: lista, riordino e area default.":"Ausgabenbereiche verwalten: Liste, Reihenfolge und Standardbereich.","Coordinate bancarie":"Bankdaten","Aggiorna coordinate":"Bankdaten aktualisieren","Salva coordinate":"Bankdaten speichern","Coordinate aggiornate":"Bankdaten aktualisiert","Coordinate salvate":"Bankdaten gespeichert","Aggiorna password":"Passwort aktualisieren","Password aggiornata":"Passwort aktualisiert","Conferma password":"Passwort bestätigen","Conferma password *":"Passwort bestätigen *","Crea account →":"Konto erstellen →","Notifiche e Promemoria":"Benachrichtigungen und Erinnerungen","Crea notifica":"Benachrichtigung erstellen","Nuova notifica":"Neue Benachrichtigung","Modifica notifica":"Benachrichtigung bearbeiten","Attiva promemoria":"Erinnerung aktivieren","Avviso quando ci sono ricorrenti da confermare":"Warnung wenn wiederkehrende Einträge zu bestätigen sind","Ogni giorno":"Jeden Tag","Ogni settimana":"Jede Woche","Ogni mese":"Jeden Monat","Ogni anno":"Jedes Jahr","Ogni 2 giorni":"Alle 2 Tage","Ogni 3 giorni":"Alle 3 Tage","Pulsante entrata":"Einnahmen-Schaltfläche","Pulsante uscita":"Ausgaben-Schaltfläche","Versione":"Version","Supporto":"Support","Supporto diretto via email":"Direkter E-Mail-Support","Come aggiungo una spesa?":"Wie füge ich eine Ausgabe hinzu?","Come importo i dati da Excel?":"Wie importiere ich Daten aus Excel?","I tutorial YouTube saranno disponibili a breve!":"YouTube-Tutorials kommen bald!","Il sito web sarà attivo a breve!":"Die Website wird bald live sein!","Backup ripristinato":"Backup wiederhergestellt","Backup pronto — scegli dove salvarlo":"Backup bereit — wählen Sie, wo es gespeichert werden soll","CSV pronto — scegli dove salvarlo":"CSV bereit — wählen Sie, wo es gespeichert werden soll","Mappa almeno Data e Importo":"Mindestens Datum und Betrag zuordnen","Nessun dato nel file Excel.":"Keine Daten in der Excel-Datei.","Impostazioni IA aggiornate":"KI-Einstellungen aktualisiert","Impostazioni widget salvate":"Widget-Einstellungen gespeichert","Widget aggiornato":"Widget aktualisiert","Lingua aggiornata":"Sprache aktualisiert","Tipo":"Typ","Tipo entrata":"Einnahmentyp","Nome":"Name","Nome area":"Bereichsname","Nome voce":"Eintragsname","Valore":"Wert","Inserisci il tuo nome.":"Geben Sie Ihren Namen ein.","Area non trovata":"Bereich nicht gefunden","Nessuna voce":"Keine Einträge","Nessuna ricorrente configurata.":"Keine wiederkehrenden Einträge konfiguriert.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"Ich sehe keine fehlenden wiederkehrenden Einträge für den aktuellen Monat.","Aggiunta rapida movimenti":"Bewegungen schnell hinzufügen","Configurazione separata del widget Android":"Separate Android-Widget-Konfiguration","Nessuna spesa":"Keine Ausgaben","Attiva la dark mode":"Dunkelmodus aktivieren","Questa area contiene ":"Dieser Bereich enthält ","Config. patrimonio":"Vermögenskonfig.","Confronto mese corrente ({curMonthKey})":"Vergleich aktueller Monat","Entrate, uscite, patrimonio e storico":"Einnahmen, Ausgaben, Vermögen und Verlauf","Errore salvataggio widget":"Widget-Speicherfehler","Salva e aggiorna widget":"Widget speichern und aktualisieren","Saldo Home":"Saldo Startseite","vuoto":"leer","CATEGORIA":"KATEGORIE","CAT/TIPO":"KAT/TYP","Cat/Tipo":"Kat/Typ"});
    if(base.pt)Object.assign(base.pt,{"Movimenti":"Movimentos","+ Aggiungi":"+ Adicionar","Ricorrenti":"Recorrentes","Transazioni ricorrenti":"Transações recorrentes","Aggiungi":"Adicionar","Nuovo":"Novo","Nuova":"Nova","Salva":"Guardar","Annulla":"Cancelar","Elimina":"Eliminar","Conferma":"Confirmar","Modifica":"Editar","Crea":"Criar","Cerca":"Pesquisar","Indietro":"Voltar","Caricamento...":"Carregando...","Ordine":"Ordem","Ordine voci":"Ordem dos itens","Voce":"Item","Voce 1":"Item 1","Voce 2":"Item 2","Voce 3":"Item 3","Singola":"Único","Multiple":"Múltiplo","Entrata aggiunta":"Receita adicionada","Uscita aggiunta":"Despesa adicionada","Es. Pagamento affitto":"Ex. Pagamento de renda","Cerca descrizione o categoria...":"Pesquisar descrição ou categoria...","Ricorrente non registrata":"Recorrente não registrado","Va confermata, saltata o inserita manualmente?":"Confirmar, ignorar ou inserir manualmente?","Mese":"Mês","Anno":"Ano","Range":"Intervalo","Annuale":"Anual","Mensile":"Mensal","Settimanale":"Semanal","Giornaliero":"Diário","Generali":"Geral","Risparmio":"Poupança","Risparmio pianificato":"Poupança planeada","Risparmio pianif.":"Poupança plan.","Risparmio reale":"Poupança real","Risparmio potenziale":"Poupança potencial","Score attendibilità":"Pontuação de fiabilidade","Rateizzato":"Parcelado","Reale":"Real","Speso nel periodo":"Gasto no período","Spese alimentari in aumento":"Despesas alimentares a aumentar","Spese extra concentrate nel weekend":"Despesas extra concentradas ao fim de semana","Nessuna criticità evidente":"Sem problemas evidentes","Per categoria":"Por categoria","Budget totale":"Orçamento total","Vuoi analizzare le singole uscite per capire dove intervenire?":"Quer analisar as despesas individuais para perceber onde agir?","Vuoi impostare un limite più stretto per il resto del mese?":"Quer definir um limite mais restrito para o resto do mês?","Suddivisione salvata con successo!":"Subdivisão guardada com sucesso!","Salva Suddivisione":"Guardar subdivisão","Piano di risparmio mensile":"Plano de poupança mensal","Budget ({sym})":"Orçamento","Budget per categoria — {titleLabel}":"Orçamento por categoria","Budget per area — {titleLabel}":"Orçamento por área","Salva modifiche":"Guardar alterações","Entrate vs Uscite {curYear}":"Receitas vs Despesas","Obiettivi di risparmio":"Objetivos de poupança","Obiettivi":"Objetivos","+ Nuovo":"+ Novo","Icona":"Ícone","Colore":"Cor","Periodo":"Período","Target ({sym})":"Meta","Già risparmiato":"Já poupado","Scadenza":"Prazo","Completato!":"Concluído!","Scaduto":"Vencido","mancano":"faltam","Nessun obiettivo. Creane uno!":"Sem objetivos. Crie um!","+ risparmio":"+ poupança","es. Vacanza":"ex. Férias","vs mese scorso":"vs mês passado","Modalità":"Modo","Inserimento":"Inserção","Mese corrente - non ancora salvato":"Mês atual - ainda não guardado","Copia valori dal mese precedente":"Copiar valores do mês anterior","Aggiungi voce patrimonio":"Adicionar elemento ao patrimônio","Conto corrente":"Conta corrente","Conto deposito":"Conta poupança","Come vengono aggiornati i valori del patrimonio.":"Como os valores do patrimônio são atualizados.","Come vengono aggiornati i valori del patrimonio":"Como os valores do patrimônio são atualizados","Inserisci i valori manualmente":"Insira os valores manualmente","Beta: collega ai metodi di pagamento":"Beta: ligar aos métodos de pagamento","Andamento patrimonio — {histViewYear}":"Evolução do patrimônio","Snapshot eliminato":"Instantâneo eliminado","Eliminare snapshot ":"Eliminar instantâneo","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"Eliminar este elemento do patrimônio? Os valores relacionados também serão removidos.","Appunti":"Notas","Appunto":"Nota","Appunto salvato":"Nota guardada","Appunto aggiornato":"Nota atualizada","Salva appunto":"Guardar nota","Aggiorna appunto":"Atualizar nota","Scrivi un appunto...":"Escreva uma nota...","Titolo":"Título","Nota":"Nota","Note":"Notas","Note (opzionale)":"Notas (opcional)","Nuova voce":"Novo item","Nuova area":"Nova área","Documento caricato":"Documento carregado","Salva o condividi ":"Guardar ou partilhar ","Categoria / Voce *":"Categoria / Item *","Alert superato!":"Alerta ativado!","Nessun alert configurato.":"Sem alertas configurados.","Crea alert":"Criar alerta","Nuovo alert":"Novo alerta","al 100%":"a 100%","Subito":"Imediatamente","Superato di":"Superado em","Budget (€)":"Orçamento (€)","Testo personalizzato (opzionale)":"Texto personalizado (opcional)","Attiva":"Ativo","Profilo":"Perfil","Lingua, valuta, formato data, metriche e IA":"Idioma, moeda, formato de data, métricas e IA","Aree e categorie delle entrate":"Áreas e categorias de receitas","Aree, categorie e metodi di pagamento":"Áreas, categorias e métodos de pagamento","Modalità, aree e voci patrimonio":"Modos, áreas e elementos do patrimônio","Ordinamento e movimenti futuri":"Ordenação e movimentos futuros","Importa, esporta, backup, elimina":"Importar, exportar, cópia de segurança, eliminar","Promemoria inserimento, notifiche custom":"Lembretes de inserção, notificações personalizadas","Versione, piano, aggiornamenti":"Versão, plano, atualizações","Lista e riordino aree patrimonio":"Lista e ordem das áreas do patrimônio","Lista e riordino voci patrimonio":"Lista e ordem dos elementos do patrimônio","Lista, riordino e default delle aree entrate":"Áreas receitas: lista, ordem e padrão","Lista, riordino e default delle aree uscite":"Áreas despesas: lista, ordem e padrão","Lista, riordino e default delle categorie entrate":"Categorias receitas: lista, ordem e padrão","Gestisci le aree delle entrate: lista, riordino e area default.":"Gerir áreas de receitas: lista, ordem e área padrão.","Gestisci le aree delle uscite: lista, riordino e area default.":"Gerir áreas de despesas: lista, ordem e área padrão.","Coordinate bancarie":"Dados bancários","Aggiorna coordinate":"Atualizar dados bancários","Salva coordinate":"Guardar dados bancários","Coordinate aggiornate":"Dados bancários atualizados","Coordinate salvate":"Dados bancários guardados","Aggiorna password":"Atualizar palavra-passe","Password aggiornata":"Palavra-passe atualizada","Conferma password":"Confirmar palavra-passe","Conferma password *":"Confirmar palavra-passe *","Crea account →":"Criar conta →","Notifiche e Promemoria":"Notificações e lembretes","Crea notifica":"Criar notificação","Nuova notifica":"Nova notificação","Modifica notifica":"Editar notificação","Attiva promemoria":"Ativar lembrete","Avviso quando ci sono ricorrenti da confermare":"Aviso quando há recorrentes a confirmar","Ogni giorno":"Todos os dias","Ogni settimana":"Todas as semanas","Ogni mese":"Todos os meses","Ogni anno":"Todos os anos","Ogni 2 giorni":"A cada 2 dias","Ogni 3 giorni":"A cada 3 dias","Pulsante entrata":"Botão de receita","Pulsante uscita":"Botão de despesa","Versione":"Versão","Supporto":"Suporte","Supporto diretto via email":"Suporte direto por email","Come aggiungo una spesa?":"Como adiciono uma despesa?","Come importo i dati da Excel?":"Como importo dados do Excel?","I tutorial YouTube saranno disponibili a breve!":"Tutoriais YouTube em breve!","Il sito web sarà attivo a breve!":"O site estará ativo em breve!","Backup ripristinato":"Cópia de segurança restaurada","Backup pronto — scegli dove salvarlo":"Cópia de segurança pronta — escolha onde guardá-la","CSV pronto — scegli dove salvarlo":"CSV pronto — escolha onde guardá-lo","Mappa almeno Data e Importo":"Mapeie pelo menos Data e Valor","Nessun dato nel file Excel.":"Sem dados no ficheiro Excel.","Impostazioni IA aggiornate":"Definições de IA atualizadas","Impostazioni widget salvate":"Definições do widget guardadas","Widget aggiornato":"Widget atualizado","Lingua aggiornata":"Idioma atualizado","Tipo":"Tipo","Tipo entrata":"Tipo de receita","Nome":"Nome","Nome area":"Nome da área","Nome voce":"Nome do item","Valore":"Valor","Inserisci il tuo nome.":"Introduza o seu nome.","Area non trovata":"Área não encontrada","Nessuna voce":"Sem itens","Nessuna ricorrente configurata.":"Sem recorrentes configuradas.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"Não vejo entradas ou saídas recorrentes em falta no mês atual.","Aggiunta rapida movimenti":"Adição rápida de movimentos","Configurazione separata del widget Android":"Configuração separada do widget Android","Nessuna spesa":"Sem despesas","Attiva la dark mode":"Ativar modo escuro","Questa area contiene ":"Esta área contém ","Config. patrimonio":"Config. patrimônio","Confronto mese corrente ({curMonthKey})":"Comparação mês atual","Entrate, uscite, patrimonio e storico":"Receitas, despesas, patrimônio e histórico","Errore salvataggio widget":"Erro ao guardar widget","Salva e aggiorna widget":"Guardar e atualizar widget","Saldo Home":"Saldo inicial","vuoto":"vazio","CATEGORIA":"CATEGORIA","CAT/TIPO":"CAT/TIPO","Cat/Tipo":"Cat/Tipo"});
    if(base.pl)Object.assign(base.pl,{"Movimenti":"Ruchy","+ Aggiungi":"+ Dodaj","Ricorrenti":"Cykliczne","Transazioni ricorrenti":"Transakcje cykliczne","Aggiungi":"Dodaj","Nuovo":"Nowy","Nuova":"Nowa","Salva":"Zapisz","Annulla":"Anuluj","Elimina":"Usuń","Conferma":"Potwierdź","Modifica":"Edytuj","Crea":"Utwórz","Cerca":"Szukaj","Indietro":"Wstecz","Caricamento...":"Ładowanie...","Ordine":"Kolejność","Ordine voci":"Kolejność elementów","Voce":"Pozycja","Voce 1":"Pozycja 1","Voce 2":"Pozycja 2","Voce 3":"Pozycja 3","Singola":"Jednorazowy","Multiple":"Wiele","Entrata aggiunta":"Przychód dodany","Uscita aggiunta":"Wydatek dodany","Es. Pagamento affitto":"Np. Płatność czynszu","Cerca descrizione o categoria...":"Szukaj opisu lub kategorii...","Ricorrente non registrata":"Cykliczne nie zarejestrowane","Va confermata, saltata o inserita manualmente?":"Potwierdzić, pominąć lub wpisać ręcznie?","Mese":"Miesiąc","Anno":"Rok","Range":"Zakres","Annuale":"Roczny","Mensile":"Miesięczny","Settimanale":"Tygodniowy","Giornaliero":"Dzienny","Generali":"Ogólne","Risparmio":"Oszczędności","Risparmio pianificato":"Zaplanowane oszczędności","Risparmio pianif.":"Zapl. oszcz.","Risparmio reale":"Rzeczywiste oszczędności","Risparmio potenziale":"Potencjalne oszczędności","Score attendibilità":"Wynik wiarygodności","Rateizzato":"Podzielony","Reale":"Rzeczywisty","Speso nel periodo":"Wydane w okresie","Spese alimentari in aumento":"Wydatki na żywność rosną","Spese extra concentrate nel weekend":"Dodatkowe wydatki skoncentrowane w weekendy","Nessuna criticità evidente":"Brak oczywistych problemów","Per categoria":"Według kategorii","Budget totale":"Budżet całkowity","Vuoi analizzare le singole uscite per capire dove intervenire?":"Chcesz przeanalizować poszczególne wydatki, aby zrozumieć, gdzie działać?","Vuoi impostare un limite più stretto per il resto del mese?":"Chcesz ustawić ściślejszy limit na resztę miesiąca?","Suddivisione salvata con successo!":"Podział zapisany pomyślnie!","Salva Suddivisione":"Zapisz podział","Piano di risparmio mensile":"Miesięczny plan oszczędnościowy","Budget ({sym})":"Budżet","Budget per categoria — {titleLabel}":"Budżet wg kategorii","Budget per area — {titleLabel}":"Budżet wg obszaru","Salva modifiche":"Zapisz zmiany","Entrate vs Uscite {curYear}":"Przychody vs Wydatki","Obiettivi di risparmio":"Cele oszczędnościowe","Obiettivi":"Cele","+ Nuovo":"+ Nowy","Icona":"Ikona","Colore":"Kolor","Periodo":"Okres","Target ({sym})":"Cel","Già risparmiato":"Już zaoszczędzone","Scadenza":"Termin","Completato!":"Ukończono!","Scaduto":"Wygasłe","mancano":"pozostało","Nessun obiettivo. Creane uno!":"Brak celów. Utwórz jeden!","+ risparmio":"+ oszczędności","es. Vacanza":"np. Wakacje","vs mese scorso":"vs ostatni miesiąc","Modalità":"Tryb","Inserimento":"Wprowadzenie","Mese corrente - non ancora salvato":"Bieżący miesiąc - niezapisany","Copia valori dal mese precedente":"Kopiuj wartości z poprzedniego miesiąca","Aggiungi voce patrimonio":"Dodaj pozycję majątku","Conto corrente":"Konto bieżące","Conto deposito":"Konto oszczędnościowe","Come vengono aggiornati i valori del patrimonio.":"Jak aktualizowane są wartości majątku.","Come vengono aggiornati i valori del patrimonio":"Jak aktualizowane są wartości majątku","Inserisci i valori manualmente":"Wprowadź wartości ręcznie","Beta: collega ai metodi di pagamento":"Beta: połącz z metodami płatności","Andamento patrimonio — {histViewYear}":"Trend majątku","Snapshot eliminato":"Migawka usunięta","Eliminare snapshot ":"Usuń migawkę","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"Usunąć tę pozycję majątku? Powiązane wartości również zostaną usunięte.","Appunti":"Notatki","Appunto":"Notatka","Appunto salvato":"Notatka zapisana","Appunto aggiornato":"Notatka zaktualizowana","Salva appunto":"Zapisz notatkę","Aggiorna appunto":"Zaktualizuj notatkę","Scrivi un appunto...":"Napisz notatkę...","Titolo":"Tytuł","Nota":"Notatka","Note":"Notatki","Note (opzionale)":"Notatki (opcjonalne)","Nuova voce":"Nowa pozycja","Nuova area":"Nowy obszar","Documento caricato":"Dokument przesłany","Salva o condividi ":"Zapisz lub udostępnij ","Categoria / Voce *":"Kategoria / Pozycja *","Alert superato!":"Alert wyzwolony!","Nessun alert configurato.":"Brak skonfigurowanych alertów.","Crea alert":"Utwórz alert","Nuovo alert":"Nowy alert","al 100%":"na 100%","Subito":"Natychmiast","Superato di":"Przekroczono o","Budget (€)":"Budżet (€)","Testo personalizzato (opzionale)":"Tekst niestandardowy (opcjonalny)","Attiva":"Aktywny","Profilo":"Profil","Lingua, valuta, formato data, metriche e IA":"Język, waluta, format daty, metryki i AI","Aree e categorie delle entrate":"Obszary i kategorie przychodów","Aree, categorie e metodi di pagamento":"Obszary, kategorie i metody płatności","Modalità, aree e voci patrimonio":"Tryby, obszary i pozycje majątku","Ordinamento e movimenti futuri":"Sortowanie i przyszłe transakcje","Importa, esporta, backup, elimina":"Importuj, eksportuj, kopia zapasowa, usuń","Promemoria inserimento, notifiche custom":"Przypomnienia o wpisach, niestandardowe powiadomienia","Versione, piano, aggiornamenti":"Wersja, plan, aktualizacje","Lista e riordino aree patrimonio":"Lista i kolejność obszarów majątku","Lista e riordino voci patrimonio":"Lista i kolejność pozycji majątku","Lista, riordino e default delle aree entrate":"Obszary przychodów: lista, kolejność i domyślne","Lista, riordino e default delle aree uscite":"Obszary wydatków: lista, kolejność i domyślne","Lista, riordino e default delle categorie entrate":"Kategorie przychodów: lista, kolejność i domyślne","Gestisci le aree delle entrate: lista, riordino e area default.":"Zarządzaj obszarami przychodów: lista, kolejność i domyślny obszar.","Gestisci le aree delle uscite: lista, riordino e area default.":"Zarządzaj obszarami wydatków: lista, kolejność i domyślny obszar.","Coordinate bancarie":"Dane bankowe","Aggiorna coordinate":"Zaktualizuj dane bankowe","Salva coordinate":"Zapisz dane bankowe","Coordinate aggiornate":"Dane bankowe zaktualizowane","Coordinate salvate":"Dane bankowe zapisane","Aggiorna password":"Zaktualizuj hasło","Password aggiornata":"Hasło zaktualizowane","Conferma password":"Potwierdź hasło","Conferma password *":"Potwierdź hasło *","Crea account →":"Utwórz konto →","Notifiche e Promemoria":"Powiadomienia i przypomnienia","Crea notifica":"Utwórz powiadomienie","Nuova notifica":"Nowe powiadomienie","Modifica notifica":"Edytuj powiadomienie","Attiva promemoria":"Włącz przypomnienie","Avviso quando ci sono ricorrenti da confermare":"Alert gdy są cykliczne do potwierdzenia","Ogni giorno":"Każdy dzień","Ogni settimana":"Każdy tydzień","Ogni mese":"Każdy miesiąc","Ogni anno":"Każdy rok","Ogni 2 giorni":"Co 2 dni","Ogni 3 giorni":"Co 3 dni","Pulsante entrata":"Przycisk przychodu","Pulsante uscita":"Przycisk wydatku","Versione":"Wersja","Supporto":"Pomoc","Supporto diretto via email":"Bezpośrednie wsparcie emailowe","Come aggiungo una spesa?":"Jak dodaję wydatek?","Come importo i dati da Excel?":"Jak importuję dane z Excela?","I tutorial YouTube saranno disponibili a breve!":"Samouczki YouTube wkrótce!","Il sito web sarà attivo a breve!":"Strona internetowa będzie wkrótce aktywna!","Backup ripristinato":"Kopia zapasowa przywrócona","Backup pronto — scegli dove salvarlo":"Kopia zapasowa gotowa — wybierz gdzie ją zapisać","CSV pronto — scegli dove salvarlo":"CSV gotowy — wybierz gdzie go zapisać","Mappa almeno Data e Importo":"Zmapuj co najmniej Data i Kwota","Nessun dato nel file Excel.":"Brak danych w pliku Excel.","Impostazioni IA aggiornate":"Ustawienia AI zaktualizowane","Impostazioni widget salvate":"Ustawienia widgetu zapisane","Widget aggiornato":"Widget zaktualizowany","Lingua aggiornata":"Język zaktualizowany","Tipo":"Typ","Tipo entrata":"Typ przychodu","Nome":"Nazwa","Nome area":"Nazwa obszaru","Nome voce":"Nazwa pozycji","Valore":"Wartość","Inserisci il tuo nome.":"Wprowadź swoje imię.","Area non trovata":"Obszar nie znaleziony","Nessuna voce":"Brak pozycji","Nessuna ricorrente configurata.":"Brak skonfigurowanych cyklicznych.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"Nie widzę brakujących cyklicznych wpisów w bieżącym miesiącu.","Aggiunta rapida movimenti":"Szybkie dodawanie ruchów","Configurazione separata del widget Android":"Oddzielna konfiguracja widgetu Android","Nessuna spesa":"Brak wydatków","Attiva la dark mode":"Włącz tryb ciemny","Questa area contiene ":"Ten obszar zawiera ","Config. patrimonio":"Konfigur. majątku","Confronto mese corrente ({curMonthKey})":"Porównanie bieżącego miesiąca","Entrate, uscite, patrimonio e storico":"Przychody, wydatki, majątek i historia","Errore salvataggio widget":"Błąd zapisywania widgetu","Salva e aggiorna widget":"Zapisz i zaktualizuj widget","Saldo Home":"Saldo strona główna","vuoto":"pusty","CATEGORIA":"KATEGORIA","CAT/TIPO":"KAT/TYP","Cat/Tipo":"Kat/Typ"});
    if(base.nl)Object.assign(base.nl,{"Movimenti":"Bewegingen","+ Aggiungi":"+ Toevoegen","Ricorrenti":"Terugkerend","Transazioni ricorrenti":"Terugkerende transacties","Aggiungi":"Toevoegen","Nuovo":"Nieuw","Nuova":"Nieuw","Salva":"Opslaan","Annulla":"Annuleren","Elimina":"Verwijderen","Conferma":"Bevestigen","Modifica":"Bewerken","Crea":"Aanmaken","Cerca":"Zoeken","Indietro":"Terug","Caricamento...":"Laden...","Ordine":"Volgorde","Ordine voci":"Volgorde","Voce":"Item","Voce 1":"Item 1","Voce 2":"Item 2","Voce 3":"Item 3","Singola":"Enkelvoudig","Multiple":"Meerdere","Entrata aggiunta":"Inkomst toegevoegd","Uscita aggiunta":"Uitgave toegevoegd","Es. Pagamento affitto":"Bijv. Huurbetaling","Cerca descrizione o categoria...":"Beschrijving of categorie zoeken...","Ricorrente non registrata":"Terugkerend niet vastgelegd","Va confermata, saltata o inserita manualmente?":"Bevestigen, overslaan of handmatig invoeren?","Mese":"Maand","Anno":"Jaar","Range":"Bereik","Annuale":"Jaarlijks","Mensile":"Maandelijks","Settimanale":"Wekelijks","Giornaliero":"Dagelijks","Generali":"Algemeen","Risparmio":"Spaargeld","Risparmio pianificato":"Geplande besparingen","Risparmio pianif.":"Gepl. besparing","Risparmio reale":"Werkelijke besparing","Risparmio potenziale":"Potentiële besparing","Score attendibilità":"Betrouwbaarheidsscore","Rateizzato":"Gespreid","Reale":"Werkelijk","Speso nel periodo":"Besteed in periode","Spese alimentari in aumento":"Voedingsuitgaven stijgen","Spese extra concentrate nel weekend":"Extra uitgaven geconcentreerd in het weekend","Nessuna criticità evidente":"Geen duidelijke problemen","Per categoria":"Per categorie","Budget totale":"Totaal budget","Vuoi analizzare le singole uscite per capire dove intervenire?":"Wilt u afzonderlijke uitgaven analyseren om te begrijpen waar u moet ingrijpen?","Vuoi impostare un limite più stretto per il resto del mese?":"Wilt u een striktere limiet instellen voor de rest van de maand?","Suddivisione salvata con successo!":"Verdeling succesvol opgeslagen!","Salva Suddivisione":"Verdeling opslaan","Piano di risparmio mensile":"Maandelijks spaarplan","Budget ({sym})":"Budget","Budget per categoria — {titleLabel}":"Budget per categorie","Budget per area — {titleLabel}":"Budget per gebied","Salva modifiche":"Wijzigingen opslaan","Entrate vs Uscite {curYear}":"Inkomsten vs Uitgaven","Obiettivi di risparmio":"Spaardoelen","Obiettivi":"Doelen","+ Nuovo":"+ Nieuw","Icona":"Pictogram","Colore":"Kleur","Periodo":"Periode","Target ({sym})":"Doel","Già risparmiato":"Al gespaard","Scadenza":"Deadline","Completato!":"Voltooid!","Scaduto":"Verlopen","mancano":"resterend","Nessun obiettivo. Creane uno!":"Geen doelen. Maak er een!","+ risparmio":"+ besparing","es. Vacanza":"bijv. Vakantie","vs mese scorso":"vs vorige maand","Modalità":"Modus","Inserimento":"Invoer","Mese corrente - non ancora salvato":"Huidige maand - nog niet opgeslagen","Copia valori dal mese precedente":"Waarden van vorige maand kopiëren","Aggiungi voce patrimonio":"Vermogenspost toevoegen","Conto corrente":"Betaalrekening","Conto deposito":"Spaarrekening","Come vengono aggiornati i valori del patrimonio.":"Hoe vermogenswaarden worden bijgewerkt.","Come vengono aggiornati i valori del patrimonio":"Hoe vermogenswaarden worden bijgewerkt","Inserisci i valori manualmente":"Voer waarden handmatig in","Beta: collega ai metodi di pagamento":"Beta: koppelen aan betaalmethoden","Andamento patrimonio — {histViewYear}":"Vermogensontwikkeling","Snapshot eliminato":"Momentopname verwijderd","Eliminare snapshot ":"Momentopname verwijderen","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"Deze vermogenspost verwijderen? Gerelateerde waarden worden ook verwijderd.","Appunti":"Notities","Appunto":"Notitie","Appunto salvato":"Notitie opgeslagen","Appunto aggiornato":"Notitie bijgewerkt","Salva appunto":"Notitie opslaan","Aggiorna appunto":"Notitie bijwerken","Scrivi un appunto...":"Schrijf een notitie...","Titolo":"Titel","Nota":"Notitie","Note":"Notities","Note (opzionale)":"Notities (optioneel)","Nuova voce":"Nieuw item","Nuova area":"Nieuw gebied","Documento caricato":"Document geüpload","Salva o condividi ":"Opslaan of delen ","Categoria / Voce *":"Categorie / Item *","Alert superato!":"Waarschuwing geactiveerd!","Nessun alert configurato.":"Geen waarschuwingen geconfigureerd.","Crea alert":"Waarschuwing aanmaken","Nuovo alert":"Nieuwe waarschuwing","al 100%":"op 100%","Subito":"Onmiddellijk","Superato di":"Overschreden met","Budget (€)":"Budget (€)","Testo personalizzato (opzionale)":"Aangepaste tekst (optioneel)","Attiva":"Actief","Profilo":"Profiel","Lingua, valuta, formato data, metriche e IA":"Taal, valuta, datumnotatie, statistieken en AI","Aree e categorie delle entrate":"Inkomstengebieden en categorieën","Aree, categorie e metodi di pagamento":"Gebieden, categorieën en betaalmethoden","Modalità, aree e voci patrimonio":"Modi, gebieden en vermogensposten","Ordinamento e movimenti futuri":"Sortering en toekomstige transacties","Importa, esporta, backup, elimina":"Importeren, exporteren, back-up, verwijderen","Promemoria inserimento, notifiche custom":"Invoerherinneringen, aangepaste meldingen","Versione, piano, aggiornamenti":"Versie, abonnement, updates","Lista e riordino aree patrimonio":"Lijst en volgorde vermogensgebieden","Lista e riordino voci patrimonio":"Lijst en volgorde vermogensposten","Lista, riordino e default delle aree entrate":"Inkomstengebieden: lijst, volgorde en standaard","Lista, riordino e default delle aree uscite":"Uitgavengebieden: lijst, volgorde en standaard","Lista, riordino e default delle categorie entrate":"Inkomstencategorieën: lijst, volgorde en standaard","Gestisci le aree delle entrate: lista, riordino e area default.":"Inkomstengebieden beheren: lijst, volgorde en standaardgebied.","Gestisci le aree delle uscite: lista, riordino e area default.":"Uitgavengebieden beheren: lijst, volgorde en standaardgebied.","Coordinate bancarie":"Bankgegevens","Aggiorna coordinate":"Bankgegevens bijwerken","Salva coordinate":"Bankgegevens opslaan","Coordinate aggiornate":"Bankgegevens bijgewerkt","Coordinate salvate":"Bankgegevens opgeslagen","Aggiorna password":"Wachtwoord bijwerken","Password aggiornata":"Wachtwoord bijgewerkt","Conferma password":"Wachtwoord bevestigen","Conferma password *":"Wachtwoord bevestigen *","Crea account →":"Account aanmaken →","Notifiche e Promemoria":"Meldingen en herinneringen","Crea notifica":"Melding aanmaken","Nuova notifica":"Nieuwe melding","Modifica notifica":"Melding bewerken","Attiva promemoria":"Herinnering inschakelen","Avviso quando ci sono ricorrenti da confermare":"Waarschuwing als er terugkerende posten te bevestigen zijn","Ogni giorno":"Elke dag","Ogni settimana":"Elke week","Ogni mese":"Elke maand","Ogni anno":"Elk jaar","Ogni 2 giorni":"Elke 2 dagen","Ogni 3 giorni":"Elke 3 dagen","Pulsante entrata":"Inkomstenknop","Pulsante uscita":"Uitgavenknop","Versione":"Versie","Supporto":"Support","Supporto diretto via email":"Directe e-mailondersteuning","Come aggiungo una spesa?":"Hoe voeg ik een uitgave toe?","Come importo i dati da Excel?":"Hoe importeer ik gegevens uit Excel?","I tutorial YouTube saranno disponibili a breve!":"YouTube-tutorials binnenkort beschikbaar!","Il sito web sarà attivo a breve!":"De website is binnenkort live!","Backup ripristinato":"Back-up hersteld","Backup pronto — scegli dove salvarlo":"Back-up klaar — kies waar je het wilt opslaan","CSV pronto — scegli dove salvarlo":"CSV klaar — kies waar je het wilt opslaan","Mappa almeno Data e Importo":"Wijs minimaal Datum en Bedrag toe","Nessun dato nel file Excel.":"Geen gegevens in het Excel-bestand.","Impostazioni IA aggiornate":"AI-instellingen bijgewerkt","Impostazioni widget salvate":"Widgetinstellingen opgeslagen","Widget aggiornato":"Widget bijgewerkt","Lingua aggiornata":"Taal bijgewerkt","Tipo":"Type","Tipo entrata":"Inkomstentype","Nome":"Naam","Nome area":"Gebiedsnaam","Nome voce":"Itemnaam","Valore":"Waarde","Inserisci il tuo nome.":"Voer uw naam in.","Area non trovata":"Gebied niet gevonden","Nessuna voce":"Geen items","Nessuna ricorrente configurata.":"Geen terugkerende posten geconfigureerd.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"Ik zie geen ontbrekende terugkerende posten voor de huidige maand.","Aggiunta rapida movimenti":"Snel bewegingen toevoegen","Configurazione separata del widget Android":"Afzonderlijke Android-widgetconfiguratie","Nessuna spesa":"Geen uitgaven","Attiva la dark mode":"Donkere modus inschakelen","Questa area contiene ":"Dit gebied bevat ","Config. patrimonio":"Vermogensconfiguratie","Confronto mese corrente ({curMonthKey})":"Vergelijking huidige maand","Entrate, uscite, patrimonio e storico":"Inkomsten, uitgaven, vermogen en geschiedenis","Errore salvataggio widget":"Fout bij opslaan widget","Salva e aggiorna widget":"Widget opslaan en bijwerken","Saldo Home":"Startpaginasaldo","vuoto":"leeg","CATEGORIA":"CATEGORIE","CAT/TIPO":"CAT/TYPE","Cat/Tipo":"Cat/Type"});
    if(base.ro)Object.assign(base.ro,{"Movimenti":"Mișcări","+ Aggiungi":"+ Adaugă","Ricorrenti":"Recurente","Transazioni ricorrenti":"Tranzacții recurente","Aggiungi":"Adaugă","Nuovo":"Nou","Nuova":"Nouă","Salva":"Salvează","Annulla":"Anulează","Elimina":"Șterge","Conferma":"Confirmă","Modifica":"Editează","Crea":"Creează","Cerca":"Caută","Indietro":"Înapoi","Caricamento...":"Se încarcă...","Ordine":"Ordine","Ordine voci":"Ordinea elementelor","Voce":"Element","Voce 1":"Element 1","Voce 2":"Element 2","Voce 3":"Element 3","Singola":"Simplu","Multiple":"Multiplu","Entrata aggiunta":"Venit adăugat","Uscita aggiunta":"Cheltuială adăugată","Es. Pagamento affitto":"Ex. Plată chirie","Cerca descrizione o categoria...":"Caută descriere sau categorie...","Ricorrente non registrata":"Recurent neînregistrat","Va confermata, saltata o inserita manualmente?":"De confirmat, omis sau introdus manual?","Mese":"Lună","Anno":"An","Range":"Interval","Annuale":"Anual","Mensile":"Lunar","Settimanale":"Săptămânal","Giornaliero":"Zilnic","Generali":"General","Risparmio":"Economii","Risparmio pianificato":"Economii planificate","Risparmio pianif.":"Econ. planif.","Risparmio reale":"Economii reale","Risparmio potenziale":"Economii potențiale","Score attendibilità":"Scor de fiabilitate","Rateizzato":"Eșalonat","Reale":"Real","Speso nel periodo":"Cheltuit în perioadă","Spese alimentari in aumento":"Cheltuieli alimentare în creștere","Spese extra concentrate nel weekend":"Cheltuieli extra concentrate în weekend","Nessuna criticità evidente":"Nicio problemă evidentă","Per categoria":"Pe categorie","Budget totale":"Buget total","Vuoi analizzare le singole uscite per capire dove intervenire?":"Doriți să analizați cheltuielile individuale pentru a înțelege unde să acționați?","Vuoi impostare un limite più stretto per il resto del mese?":"Doriți să setați o limită mai strictă pentru restul lunii?","Suddivisione salvata con successo!":"Subdivizare salvată cu succes!","Salva Suddivisione":"Salvează subdivizare","Piano di risparmio mensile":"Plan de economii lunar","Budget ({sym})":"Buget","Budget per categoria — {titleLabel}":"Buget pe categorie","Budget per area — {titleLabel}":"Buget pe zonă","Salva modifiche":"Salvează modificările","Entrate vs Uscite {curYear}":"Venituri vs Cheltuieli","Obiettivi di risparmio":"Obiective de economii","Obiettivi":"Obiective","+ Nuovo":"+ Nou","Icona":"Pictogramă","Colore":"Culoare","Periodo":"Perioadă","Target ({sym})":"Țintă","Già risparmiato":"Deja economisit","Scadenza":"Termen","Completato!":"Finalizat!","Scaduto":"Expirat","mancano":"rămân","Nessun obiettivo. Creane uno!":"Niciun obiectiv. Creați unul!","+ risparmio":"+ economii","es. Vacanza":"ex. Vacanță","vs mese scorso":"vs luna trecută","Modalità":"Mod","Inserimento":"Introducere","Mese corrente - non ancora salvato":"Luna curentă - nesalvată încă","Copia valori dal mese precedente":"Copiați valorile din luna anterioară","Aggiungi voce patrimonio":"Adaugă element patrimoniu","Conto corrente":"Cont curent","Conto deposito":"Cont de economii","Come vengono aggiornati i valori del patrimonio.":"Cum sunt actualizate valorile patrimoniului.","Come vengono aggiornati i valori del patrimonio":"Cum sunt actualizate valorile patrimoniului","Inserisci i valori manualmente":"Introduceți valorile manual","Beta: collega ai metodi di pagamento":"Beta: legat de metodele de plată","Andamento patrimonio — {histViewYear}":"Evoluția patrimoniului","Snapshot eliminato":"Instantaneu șters","Eliminare snapshot ":"Șterge instantaneu","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"Șterge acest element de patrimoniu? Valorile aferente vor fi și ele eliminate.","Appunti":"Note","Appunto":"Notă","Appunto salvato":"Notă salvată","Appunto aggiornato":"Notă actualizată","Salva appunto":"Salvează nota","Aggiorna appunto":"Actualizează nota","Scrivi un appunto...":"Scrie o notă...","Titolo":"Titlu","Nota":"Notă","Note":"Note","Note (opzionale)":"Note (opționale)","Nuova voce":"Element nou","Nuova area":"Zonă nouă","Documento caricato":"Document încărcat","Salva o condividi ":"Salvează sau distribuie ","Categoria / Voce *":"Categorie / Element *","Alert superato!":"Alertă declanșată!","Nessun alert configurato.":"Nicio alertă configurată.","Crea alert":"Creează alertă","Nuovo alert":"Alertă nouă","al 100%":"la 100%","Subito":"Imediat","Superato di":"Depășit cu","Budget (€)":"Buget (€)","Testo personalizzato (opzionale)":"Text personalizat (opțional)","Attiva":"Activ","Profilo":"Profil","Lingua, valuta, formato data, metriche e IA":"Limbă, monedă, format dată, metrici și AI","Aree e categorie delle entrate":"Zone și categorii venituri","Aree, categorie e metodi di pagamento":"Zone, categorii și metode de plată","Modalità, aree e voci patrimonio":"Moduri, zone și elemente patrimoniu","Ordinamento e movimenti futuri":"Sortare și tranzacții viitoare","Importa, esporta, backup, elimina":"Importați, exportați, backup, ștergeți","Promemoria inserimento, notifiche custom":"Memento intrare, notificări personalizate","Versione, piano, aggiornamenti":"Versiune, plan, actualizări","Lista e riordino aree patrimonio":"Listă și ordine zone patrimoniu","Lista e riordino voci patrimonio":"Listă și ordine elemente patrimoniu","Lista, riordino e default delle aree entrate":"Zone venituri: listă, ordine și implicit","Lista, riordino e default delle aree uscite":"Zone cheltuieli: listă, ordine și implicit","Lista, riordino e default delle categorie entrate":"Categorii venituri: listă, ordine și implicit","Gestisci le aree delle entrate: lista, riordino e area default.":"Gestionați zone venituri: listă, ordine și zonă implicită.","Gestisci le aree delle uscite: lista, riordino e area default.":"Gestionați zone cheltuieli: listă, ordine și zonă implicită.","Coordinate bancarie":"Date bancare","Aggiorna coordinate":"Actualizează datele bancare","Salva coordinate":"Salvează datele bancare","Coordinate aggiornate":"Date bancare actualizate","Coordinate salvate":"Date bancare salvate","Aggiorna password":"Actualizează parola","Password aggiornata":"Parolă actualizată","Conferma password":"Confirmați parola","Conferma password *":"Confirmați parola *","Crea account →":"Creați cont →","Notifiche e Promemoria":"Notificări și mementouri","Crea notifica":"Creează notificare","Nuova notifica":"Notificare nouă","Modifica notifica":"Editează notificare","Attiva promemoria":"Activați mementoul","Avviso quando ci sono ricorrenti da confermare":"Alertă când există recurente de confirmat","Ogni giorno":"În fiecare zi","Ogni settimana":"În fiecare săptămână","Ogni mese":"În fiecare lună","Ogni anno":"În fiecare an","Ogni 2 giorni":"La 2 zile","Ogni 3 giorni":"La 3 zile","Pulsante entrata":"Buton venit","Pulsante uscita":"Buton cheltuială","Versione":"Versiune","Supporto":"Suport","Supporto diretto via email":"Suport direct prin email","Come aggiungo una spesa?":"Cum adaug o cheltuială?","Come importo i dati da Excel?":"Cum import date din Excel?","I tutorial YouTube saranno disponibili a breve!":"Tutoriale YouTube în curând!","Il sito web sarà attivo a breve!":"Site-ul va fi activ în curând!","Backup ripristinato":"Backup restaurat","Backup pronto — scegli dove salvarlo":"Backup gata — alegeți unde să îl salvați","CSV pronto — scegli dove salvarlo":"CSV gata — alegeți unde să îl salvați","Mappa almeno Data e Importo":"Mapați cel puțin Data și Suma","Nessun dato nel file Excel.":"Nicio dată în fișierul Excel.","Impostazioni IA aggiornate":"Setări AI actualizate","Impostazioni widget salvate":"Setări widget salvate","Widget aggiornato":"Widget actualizat","Lingua aggiornata":"Limbă actualizată","Tipo":"Tip","Tipo entrata":"Tip venit","Nome":"Nume","Nome area":"Nume zonă","Nome voce":"Nume element","Valore":"Valoare","Inserisci il tuo nome.":"Introduceți numele dvs.","Area non trovata":"Zonă negăsită","Nessuna voce":"Niciun element","Nessuna ricorrente configurata.":"Nicio intrare recurentă configurată.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"Nu văd intrări sau ieșiri recurente lipsă în luna curentă.","Aggiunta rapida movimenti":"Adăugare rapidă mișcări","Configurazione separata del widget Android":"Configurare separată widget Android","Nessuna spesa":"Nicio cheltuială","Attiva la dark mode":"Activați modul întunecat","Questa area contiene ":"Această zonă conține ","Config. patrimonio":"Config. patrimoniu","Confronto mese corrente ({curMonthKey})":"Comparație luna curentă","Entrate, uscite, patrimonio e storico":"Venituri, cheltuieli, patrimoniu și istoric","Errore salvataggio widget":"Eroare salvare widget","Salva e aggiorna widget":"Salvează și actualizează widget","Saldo Home":"Sold acasă","vuoto":"gol","CATEGORIA":"CATEGORIE","CAT/TIPO":"CAT/TIP","Cat/Tipo":"Cat/Tip"});
    if(base.el)Object.assign(base.el,{"Movimenti":"Κινήσεις","+ Aggiungi":"+ Προσθήκη","Ricorrenti":"Επαναλαμβανόμενα","Transazioni ricorrenti":"Επαναλαμβανόμενες συναλλαγές","Aggiungi":"Προσθήκη","Nuovo":"Νέο","Nuova":"Νέα","Salva":"Αποθήκευση","Annulla":"Άκυρο","Elimina":"Διαγραφή","Conferma":"Επιβεβαίωση","Modifica":"Επεξεργασία","Crea":"Δημιουργία","Cerca":"Αναζήτηση","Indietro":"Πίσω","Caricamento...":"Φόρτωση...","Ordine":"Σειρά","Ordine voci":"Σειρά στοιχείων","Voce":"Στοιχείο","Voce 1":"Στοιχείο 1","Voce 2":"Στοιχείο 2","Voce 3":"Στοιχείο 3","Singola":"Μονό","Multiple":"Πολλαπλό","Entrata aggiunta":"Έσοδο προστέθηκε","Uscita aggiunta":"Έξοδο προστέθηκε","Es. Pagamento affitto":"Π.χ. Πληρωμή ενοικίου","Cerca descrizione o categoria...":"Αναζήτηση περιγραφής ή κατηγορίας...","Ricorrente non registrata":"Επαναλαμβανόμενο μη καταχωρημένο","Va confermata, saltata o inserita manualmente?":"Να επιβεβαιωθεί, παραλειφθεί ή εισαχθεί χειροκίνητα;","Mese":"Μήνας","Anno":"Έτος","Range":"Εύρος","Annuale":"Ετήσιο","Mensile":"Μηνιαίο","Settimanale":"Εβδομαδιαίο","Giornaliero":"Ημερήσιο","Generali":"Γενικά","Risparmio":"Αποταμιεύσεις","Risparmio pianificato":"Σχεδιασμένες αποταμιεύσεις","Risparmio pianif.":"Σχ. αποταμ.","Risparmio reale":"Πραγματικές αποταμιεύσεις","Risparmio potenziale":"Δυνητικές αποταμιεύσεις","Score attendibilità":"Βαθμολογία αξιοπιστίας","Rateizzato":"Κατανεμημένο","Reale":"Πραγματικό","Speso nel periodo":"Δαπανήθηκε στην περίοδο","Spese alimentari in aumento":"Αύξηση διατροφικών εξόδων","Spese extra concentrate nel weekend":"Επιπλέον έξοδα συγκεντρωμένα τα σαββατοκύριακα","Nessuna criticità evidente":"Δεν υπάρχουν προφανή προβλήματα","Per categoria":"Ανά κατηγορία","Budget totale":"Συνολικός προϋπολογισμός","Vuoi analizzare le singole uscite per capire dove intervenire?":"Θέλετε να αναλύσετε μεμονωμένα έξοδα για να καταλάβετε πού να ενεργήσετε;","Vuoi impostare un limite più stretto per il resto del mese?":"Θέλετε να ορίσετε αυστηρότερο όριο για τον υπόλοιπο μήνα;","Suddivisione salvata con successo!":"Η κατανομή αποθηκεύτηκε επιτυχώς!","Salva Suddivisione":"Αποθήκευση κατανομής","Piano di risparmio mensile":"Μηνιαίο σχέδιο αποταμίευσης","Budget ({sym})":"Προϋπολογισμός","Budget per categoria — {titleLabel}":"Προϋπολογισμός ανά κατηγορία","Budget per area — {titleLabel}":"Προϋπολογισμός ανά περιοχή","Salva modifiche":"Αποθήκευση αλλαγών","Entrate vs Uscite {curYear}":"Έσοδα vs Έξοδα","Obiettivi di risparmio":"Στόχοι αποταμίευσης","Obiettivi":"Στόχοι","+ Nuovo":"+ Νέο","Icona":"Εικονίδιο","Colore":"Χρώμα","Periodo":"Περίοδος","Target ({sym})":"Στόχος","Già risparmiato":"Ήδη αποταμιευμένο","Scadenza":"Προθεσμία","Completato!":"Ολοκληρώθηκε!","Scaduto":"Έληξε","mancano":"απομένουν","Nessun obiettivo. Creane uno!":"Δεν υπάρχουν στόχοι. Δημιουργήστε έναν!","+ risparmio":"+ αποταμίευση","es. Vacanza":"π.χ. Διακοπές","vs mese scorso":"vs προηγούμενο μήνα","Modalità":"Λειτουργία","Inserimento":"Εισαγωγή","Mese corrente - non ancora salvato":"Τρέχων μήνας - δεν έχει αποθηκευτεί","Copia valori dal mese precedente":"Αντιγραφή τιμών από τον προηγούμενο μήνα","Aggiungi voce patrimonio":"Προσθήκη στοιχείου περιουσίας","Conto corrente":"Τρεχούμενος λογαριασμός","Conto deposito":"Αποταμιευτικός λογαριασμός","Come vengono aggiornati i valori del patrimonio.":"Πώς ενημερώνονται οι τιμές των περιουσιακών στοιχείων.","Come vengono aggiornati i valori del patrimonio":"Πώς ενημερώνονται οι τιμές περιουσίας","Inserisci i valori manualmente":"Εισάγετε τιμές χειροκίνητα","Beta: collega ai metodi di pagamento":"Βήτα: σύνδεση με μεθόδους πληρωμής","Andamento patrimonio — {histViewYear}":"Εξέλιξη περιουσίας","Snapshot eliminato":"Στιγμιότυπο διαγράφηκε","Eliminare snapshot ":"Διαγραφή στιγμιότυπου","Eliminare questa voce dal Patrimonio? Verranno rimossi anche i valori collegati a questa voce.":"Διαγραφή αυτού του στοιχείου περιουσίας; Οι σχετικές τιμές θα αφαιρεθούν επίσης.","Appunti":"Σημειώσεις","Appunto":"Σημείωση","Appunto salvato":"Σημείωση αποθηκεύτηκε","Appunto aggiornato":"Σημείωση ενημερώθηκε","Salva appunto":"Αποθήκευση σημείωσης","Aggiorna appunto":"Ενημέρωση σημείωσης","Scrivi un appunto...":"Γράψτε μια σημείωση...","Titolo":"Τίτλος","Nota":"Σημείωση","Note":"Σημειώσεις","Note (opzionale)":"Σημειώσεις (προαιρετικό)","Nuova voce":"Νέο στοιχείο","Nuova area":"Νέα περιοχή","Documento caricato":"Έγγραφο ανέβηκε","Salva o condividi ":"Αποθήκευση ή κοινή χρήση ","Categoria / Voce *":"Κατηγορία / Στοιχείο *","Alert superato!":"Ειδοποίηση ενεργοποιήθηκε!","Nessun alert configurato.":"Δεν υπάρχουν διαμορφωμένες ειδοποιήσεις.","Crea alert":"Δημιουργία ειδοποίησης","Nuovo alert":"Νέα ειδοποίηση","al 100%":"στο 100%","Subito":"Αμέσως","Superato di":"Υπέρβαση κατά","Budget (€)":"Προϋπολογισμός (€)","Testo personalizzato (opzionale)":"Προσαρμοσμένο κείμενο (προαιρετικό)","Attiva":"Ενεργό","Profilo":"Προφίλ","Lingua, valuta, formato data, metriche e IA":"Γλώσσα, νόμισμα, μορφή ημερομηνίας, μετρικές και AI","Aree e categorie delle entrate":"Περιοχές και κατηγορίες εσόδων","Aree, categorie e metodi di pagamento":"Περιοχές, κατηγορίες και μέθοδοι πληρωμής","Modalità, aree e voci patrimonio":"Τρόποι, περιοχές και στοιχεία περιουσίας","Ordinamento e movimenti futuri":"Ταξινόμηση και μελλοντικές κινήσεις","Importa, esporta, backup, elimina":"Εισαγωγή, εξαγωγή, αντίγραφα ασφαλείας, διαγραφή","Promemoria inserimento, notifiche custom":"Υπενθυμίσεις εισαγωγής, προσαρμοσμένες ειδοποιήσεις","Versione, piano, aggiornamenti":"Έκδοση, πλάνο, ενημερώσεις","Lista e riordino aree patrimonio":"Λίστα και σειρά περιοχών περιουσίας","Lista e riordino voci patrimonio":"Λίστα και σειρά στοιχείων περιουσίας","Lista, riordino e default delle aree entrate":"Περιοχές εσόδων: λίστα, σειρά και προεπιλογή","Lista, riordino e default delle aree uscite":"Περιοχές εξόδων: λίστα, σειρά και προεπιλογή","Lista, riordino e default delle categorie entrate":"Κατηγορίες εσόδων: λίστα, σειρά και προεπιλογή","Gestisci le aree delle entrate: lista, riordino e area default.":"Διαχείριση περιοχών εσόδων: λίστα, σειρά και προεπιλεγμένη περιοχή.","Gestisci le aree delle uscite: lista, riordino e area default.":"Διαχείριση περιοχών εξόδων: λίστα, σειρά και προεπιλεγμένη περιοχή.","Coordinate bancarie":"Τραπεζικά στοιχεία","Aggiorna coordinate":"Ενημέρωση τραπεζικών στοιχείων","Salva coordinate":"Αποθήκευση τραπεζικών στοιχείων","Coordinate aggiornate":"Τραπεζικά στοιχεία ενημερώθηκαν","Coordinate salvate":"Τραπεζικά στοιχεία αποθηκεύτηκαν","Aggiorna password":"Ενημέρωση κωδικού","Password aggiornata":"Κωδικός ενημερώθηκε","Conferma password":"Επιβεβαίωση κωδικού","Conferma password *":"Επιβεβαίωση κωδικού *","Crea account →":"Δημιουργία λογαριασμού →","Notifiche e Promemoria":"Ειδοποιήσεις και υπενθυμίσεις","Crea notifica":"Δημιουργία ειδοποίησης","Nuova notifica":"Νέα ειδοποίηση","Modifica notifica":"Επεξεργασία ειδοποίησης","Attiva promemoria":"Ενεργοποίηση υπενθύμισης","Avviso quando ci sono ricorrenti da confermare":"Ειδοποίηση όταν υπάρχουν επαναλαμβανόμενα για επιβεβαίωση","Ogni giorno":"Κάθε μέρα","Ogni settimana":"Κάθε εβδομάδα","Ogni mese":"Κάθε μήνα","Ogni anno":"Κάθε χρόνο","Ogni 2 giorni":"Κάθε 2 μέρες","Ogni 3 giorni":"Κάθε 3 μέρες","Pulsante entrata":"Κουμπί εσόδου","Pulsante uscita":"Κουμπί εξόδου","Versione":"Έκδοση","Supporto":"Υποστήριξη","Supporto diretto via email":"Άμεση υποστήριξη μέσω email","Come aggiungo una spesa?":"Πώς προσθέτω ένα έξοδο;","Come importo i dati da Excel?":"Πώς εισάγω δεδομένα από το Excel;","I tutorial YouTube saranno disponibili a breve!":"Τα tutorials YouTube έρχονται σύντομα!","Il sito web sarà attivo a breve!":"Ο ιστότοπος θα είναι σύντομα διαθέσιμος!","Backup ripristinato":"Αντίγραφο ασφαλείας επαναφέρθηκε","Backup pronto — scegli dove salvarlo":"Αντίγραφο ασφαλείας έτοιμο — επιλέξτε πού να το αποθηκεύσετε","CSV pronto — scegli dove salvarlo":"CSV έτοιμο — επιλέξτε πού να το αποθηκεύσετε","Mappa almeno Data e Importo":"Αντιστοιχίστε τουλάχιστον Ημερομηνία και Ποσό","Nessun dato nel file Excel.":"Δεν υπάρχουν δεδομένα στο αρχείο Excel.","Impostazioni IA aggiornate":"Ρυθμίσεις AI ενημερώθηκαν","Impostazioni widget salvate":"Ρυθμίσεις widget αποθηκεύτηκαν","Widget aggiornato":"Widget ενημερώθηκε","Lingua aggiornata":"Γλώσσα ενημερώθηκε","Tipo":"Τύπος","Tipo entrata":"Τύπος εσόδου","Nome":"Όνομα","Nome area":"Όνομα περιοχής","Nome voce":"Όνομα στοιχείου","Valore":"Τιμή","Inserisci il tuo nome.":"Εισάγετε το όνομά σας.","Area non trovata":"Η περιοχή δεν βρέθηκε","Nessuna voce":"Δεν υπάρχουν στοιχεία","Nessuna ricorrente configurata.":"Δεν υπάρχουν διαμορφωμένα επαναλαμβανόμενα.","Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.":"Δεν βλέπω ελλείπουσες επαναλαμβανόμενες εγγραφές για τον τρέχοντα μήνα.","Aggiunta rapida movimenti":"Γρήγορη προσθήκη κινήσεων","Configurazione separata del widget Android":"Ξεχωριστή διαμόρφωση widget Android","Nessuna spesa":"Δεν υπάρχουν έξοδα","Attiva la dark mode":"Ενεργοποίηση σκοτεινής λειτουργίας","Questa area contiene ":"Αυτή η περιοχή περιέχει ","Config. patrimonio":"Διαμόρφωση περιουσίας","Confronto mese corrente ({curMonthKey})":"Σύγκριση τρέχοντος μήνα","Entrate, uscite, patrimonio e storico":"Έσοδα, έξοδα, περιουσία και ιστορικό","Errore salvataggio widget":"Σφάλμα αποθήκευσης widget","Salva e aggiorna widget":"Αποθήκευση και ενημέρωση widget","Saldo Home":"Υπόλοιπο αρχικής","vuoto":"κενό","CATEGORIA":"ΚΑΤΗΓΟΡΙΑ","CAT/TIPO":"ΚΑΤ/ΤΥΠΟΣ","Cat/Tipo":"Κατ/Τύπος"});
    if(base.en)Object.assign(base.en,{"Expenses mese":"Expenses this month","Income mese":"Income this month","Balance mese":"Balance this month","Balance ultimi 12 mesi":"Balance last 12 months","Distribuzione uscite — ":"Expense breakdown — ","Entrate vs Uscite ":"Income vs Expenses ","Saldo mensile ":"Monthly balance ","Tasso aggiornato in tempo reale":"Real-time exchange rate","Conversione ":"Conversion ","ricorrenti da confermare per ":"recurring to confirm for ","alert di spesa superati":"spending alerts triggered","Ultime uscite":"Recent expenses","Ultime entrate":"Recent income","Distribuzione — ":"Breakdown — ","Per area":"By area","Anno ":"Year ","Entrate vs Uscite — ":"Income vs Expenses — ","Entrate per tipo — ":"Income by type — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"No budget configured. Go to the Budget section to set it up.","Categorie sforate":"Over-budget categories","avanza ":"remaining ","sfora ":"over by ","rimane ":"remaining ","Attendibilità del risparmio — ":"Savings reliability — ","Scostamento medio":"Average deviation","risparmio reale vs pianificato":"actual vs planned savings","mensile da budget":"monthly from budget","In miglioramento":"Improving","In peggioramento":"Worsening","confronto prima/seconda metà anno":"first vs second half of year","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Planned savings (purple dashed) vs actual (bars) — ","Risparmio reale positivo":"Positive actual savings","Risparmio reale negativo":"Negative actual savings","Risparmio pianificato":"Planned savings","Dettaglio mensile — ":"Monthly detail — ","Mesi centrati: ":"Months on target: ","Nessuna categoria sforata o a rischio!":"No over-budget or at-risk categories!","Reddito mensile di riferimento":"Reference monthly income","Reddito di riferimento":"Reference income","Reddito di rif.":"Ref. income","Importo manuale:":"Manual amount:","Totale allocato":"Total allocated","Disponibile:":"Available:","Disponibile: ":"Available: ","% del reddito allocato · risparmio pianificato: ":"% of income allocated · planned savings: ","% del reddito":"% of income","Suddivisione per categoria":"Breakdown by category","IMPORTO (":"AMOUNT (","% REDDITO":"% INCOME","Rispetto al piano":"vs plan","Salva suddivisione":"Save breakdown","Patrimonio — ":"Assets — ","vs mese scorso":"vs last month","Modalità: ":"Mode: ","Manuale":"Manual","Semi-automatica ⚠️":"Semi-automatic ⚠️","✏️ Inserimento":"✏️ Entry","📅 Storico":"📅 History","Mese corrente — non ancora salvato":"Current month — not yet saved","✅ Dati già salvati":"✅ Data already saved","⚠️ Nessun dato per questo mese":"⚠️ No data for this month","Totale ":"Total ","📋 Copia valori da un altro mese...":"📋 Copy values from another month...","Copia da":"Copy from","Andamento patrimonio — ":"Asset trend — ","🔄 Aggiorna":"🔄 Update","💾 Salva":"💾 Save","Salva nota":"Save note","💾 Salva nota":"💾 Save note","🗑 Elimina nota":"🗑 Delete note","Nessun appunto":"No notes","Nessun documento caricato":"No documents uploaded","Nessuna coordinata salvata":"No bank details saved","Banca":"Bank","Intestatario":"Account holder","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Upload PDF, images, Excel or CSV. Files are saved in account data.","+ Carica documento":"+ Upload document","Apri":"Open","Aggiorna appunto":"Update note","Salva appunto":"Save note","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Add a note for this item... (e.g. account details, deadlines, goals)","Formato non supportato":"Unsupported format","Alert di spesa":"Spending alert","attiva al ":"active at ","al 100%":"at 100%","Dati personali, account, accesso":"Personal data, account, login","Tema, colori, stile pulsanti e widget":"Theme, colours, button style and widget","FAQ, tutorial, sito web, contatti":"FAQ, tutorials, website, contacts","Saldo home, valuta secondaria e visualizzazione valori.":"Home balance, secondary currency and value display.","Balance home, valuta secondaria e visualizzazione valori.":"Home balance, secondary currency and value display.","Mostra i valori convertiti in una seconda valuta (via API).":"Show values converted to a second currency (via API).","Mostra ":"Show "," in:":" in:","sempre":"always","Lunedì":"Monday","Domenica":"Sunday","Dati sincronizzati su cloud":"Data synced to cloud","☁️ Dati sincronizzati su cloud":"☁️ Data synced to cloud","Telefono":"Phone","Nascita":"Birthday","Città":"City","Sesso":"Gender","Maschile":"Male","Femminile":"Female","Non spec.":"Not specified","Cambia password":"Change password","🔑 Cambia password":"🔑 Change password","Esci":"Log out","🚪 Esci":"🚪 Log out","Uscire dall'account?":"Log out of account?","Crea account o Accedi":"Create account or Sign in","🔑 Crea account o Accedi":"🔑 Create account or Sign in","Profilo aggiornato":"Profile updated","Nuova password":"New password","Minimo 6 caratteri":"Minimum 6 characters","Aggiorna password":"Update password","Data nascita":"Date of birth","Utente":"User","Email non disponibile":"Email unavailable","Scrivi una domanda su fAInance...":"Ask the AI Advisor a question...","Invia":"Send","Sto analizzando...":"Analysing...","Consigli attivi":"Active insights","Priorità alta":"High priority","Controlli dati":"Data checks","📌 Consigli e metriche":"📌 Insights & metrics","💬 Conversazione":"💬 Chat","Analisi automatiche":"Automatic analysis","Domande su fAInance":"fAInance questions","💬 Inizia conversazione":"💬 Start conversation","Analizza":"Analyse","Non mostrare più":"Don't show again","Importazione completata!":"Import completed!","importate con successo":"successfully imported","Operazione non reversibile. Elementi interessati:":"This action cannot be undone. Affected items:","Elimina i dati per singola sezione.":"Delete data by section.","La ricerca seleziona automaticamente i risultati trovati.":"The search automatically selects found results.","voci":"items","Nessun dato selezionato":"No data selected","uscite":"expenses","entrate":"incomes","voci patrimonio":"asset entries","Consigli e metriche":"Insights & metrics","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"AI Agent dedicated to managing your finances inside fAInance: data analysis, budget, savings, alerts, goals and app usage.","Analisi limitata":"Limited analysis","Analisi media":"Medium analysis","Analisi completa":"Full analysis","🤖 Icona rapida Consulente AI":"🤖 Quick AI Advisor icon","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Shows a floating button at the bottom right to open the AI chat instantly."});
    if(base.es)Object.assign(base.es,{"Expenses mese":"Gastos este mes","Income mese":"Ingresos este mes","Balance mese":"Saldo este mes","Balance ultimi 12 mesi":"Saldo últimos 12 meses","Distribuzione uscite — ":"Distribución de gastos — ","Entrate vs Uscite ":"Ingresos vs Gastos ","Saldo mensile ":"Saldo mensual ","Tasso aggiornato in tempo reale":"Tipo de cambio en tiempo real","Conversione ":"Conversión ","ricorrenti da confermare per ":"recurrentes a confirmar en ","alert di spesa superati":"alertas de gasto superadas","Ultime uscite":"Últimos gastos","Ultime entrate":"Últimos ingresos","Distribuzione — ":"Distribución — ","Per area":"Por área","Anno ":"Año ","Entrate vs Uscite — ":"Ingresos vs Gastos — ","Entrate per tipo — ":"Ingresos por tipo — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"Sin presupuesto configurado. Ve a la sección Presupuesto para configurarlo.","Categorie sforate":"Categorías superadas","avanza ":"queda ","sfora ":"supera en ","rimane ":"queda ","Attendibilità del risparmio — ":"Fiabilidad del ahorro — ","Scostamento medio":"Desviación media","risparmio reale vs pianificato":"ahorro real vs planificado","mensile da budget":"mensual del presupuesto","In miglioramento":"Mejorando","In peggioramento":"Empeorando","confronto prima/seconda metà anno":"primera vs segunda mitad del año","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Ahorro planificado (morado discontinuo) vs real (barras) — ","Risparmio reale positivo":"Ahorro real positivo","Risparmio reale negativo":"Ahorro real negativo","Risparmio pianificato":"Ahorro planificado","Dettaglio mensile — ":"Detalle mensual — ","Mesi centrati: ":"Meses en objetivo: ","Nessuna categoria sforata o a rischio!":"¡Sin categorías superadas o en riesgo!","Reddito mensile di riferimento":"Renta mensual de referencia","Reddito di riferimento":"Renta de referencia","Reddito di rif.":"Renta de ref.","Importo manuale:":"Importe manual:","Totale allocato":"Total asignado","Disponibile:":"Disponible:","Disponibile: ":"Disponible: ","% del reddito allocato · risparmio pianificato: ":"% de renta asignada · ahorro planificado: ","% del reddito":"% de la renta","Suddivisione per categoria":"División por categoría","IMPORTO (":"IMPORTE (","% REDDITO":"% RENTA","Rispetto al piano":"vs plan","Salva suddivisione":"Guardar división","Patrimonio — ":"Patrimonio — ","vs mese scorso":"vs mes pasado","Modalità: ":"Modo: ","Manuale":"Manual","Semi-automatica ⚠️":"Semiautomático ⚠️","✏️ Inserimento":"✏️ Introducción","📅 Storico":"📅 Historial","Mese corrente — non ancora salvato":"Mes actual — no guardado aún","✅ Dati già salvati":"✅ Datos ya guardados","⚠️ Nessun dato per questo mese":"⚠️ Sin datos para este mes","Totale ":"Total ","📋 Copia valori da un altro mese...":"📋 Copiar valores de otro mes...","Copia da":"Copiar de","Andamento patrimonio — ":"Evolución del patrimonio — ","🔄 Aggiorna":"🔄 Actualizar","💾 Salva":"💾 Guardar","Salva nota":"Guardar nota","💾 Salva nota":"💾 Guardar nota","🗑 Elimina nota":"🗑 Eliminar nota","Nessun appunto":"Sin notas","Nessun documento caricato":"Sin documentos cargados","Nessuna coordinata salvata":"Sin datos bancarios guardados","Banca":"Banco","Intestatario":"Titular","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Carga PDF, imágenes, Excel o CSV. Los archivos se guardan en los datos de la cuenta.","+ Carica documento":"+ Cargar documento","Apri":"Abrir","Aggiorna appunto":"Actualizar nota","Salva appunto":"Guardar nota","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Añade una nota para este elemento... (ej. detalles de cuenta, plazos, objetivos)","Formato non supportato":"Formato no compatible","Alert di spesa":"Alerta de gasto","attiva al ":"activa al ","al 100%":"al 100%","Dati personali, account, accesso":"Datos personales, cuenta, acceso","Tema, colori, stile pulsanti e widget":"Tema, colores, estilo de botones y widget","FAQ, tutorial, sito web, contatti":"FAQ, tutoriales, sitio web, contactos","Saldo home, valuta secondaria e visualizzazione valori.":"Saldo inicial, moneda secundaria y visualización de valores.","Balance home, valuta secondaria e visualizzazione valori.":"Saldo inicial, moneda secundaria y visualización de valores.","Mostra i valori convertiti in una seconda valuta (via API).":"Mostrar valores convertidos a una segunda moneda (vía API).","Mostra ":"Mostrar "," in:":" en:","sempre":"siempre","Lunedì":"Lunes","Domenica":"Domingo","Dati sincronizzati su cloud":"Datos sincronizados en la nube","☁️ Dati sincronizzati su cloud":"☁️ Datos sincronizados en la nube","Telefono":"Teléfono","Nascita":"Nacimiento","Città":"Ciudad","Sesso":"Sexo","Maschile":"Masculino","Femminile":"Femenino","Non spec.":"No esp.","Cambia password":"Cambiar contraseña","🔑 Cambia password":"🔑 Cambiar contraseña","Esci":"Cerrar sesión","🚪 Esci":"🚪 Cerrar sesión","Uscire dall'account?":"¿Cerrar sesión?","Crea account o Accedi":"Crear cuenta o Iniciar sesión","🔑 Crea account o Accedi":"🔑 Crear cuenta o Iniciar sesión","Profilo aggiornato":"Perfil actualizado","Nuova password":"Nueva contraseña","Minimo 6 caratteri":"Mínimo 6 caracteres","Aggiorna password":"Actualizar contraseña","Data nascita":"Fecha de nacimiento","Usuario":"Usuario","Email non disponibile":"Email no disponible","Scrivi una domanda su fAInance...":"Escribe una pregunta sobre fAInance...","Invia":"Enviar","Sto analizzando...":"Analizando...","Consigli attivi":"Consejos activos","Priorità alta":"Prioridad alta","Controlli dati":"Verificaciones de datos","📌 Consigli e metriche":"📌 Consejos y métricas","💬 Conversazione":"💬 Conversación","Analisi automatiche":"Análisis automáticos","Domande su fAInance":"Preguntas sobre fAInance","💬 Inizia conversazione":"💬 Iniciar conversación","Analizza":"Analizar","Non mostrare più":"No mostrar más","Importazione completata!":"¡Importación completada!","importate con successo":"importadas con éxito","Operazione non reversibile. Elementi interessati:":"Operación irreversible. Elementos afectados:","Elimina i dati per singola sezione.":"Eliminar datos por sección.","La ricerca seleziona automaticamente i risultati trovati.":"La búsqueda selecciona automáticamente los resultados encontrados.","voci":"elementos","Nessun dato selezionato":"Sin datos seleccionados","uscite":"gastos","entrate":"ingresos","voci patrimonio":"elementos de patrimonio","Consigli e metriche":"Consejos y métricas","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"Agente IA dedicado a gestionar tus finanzas dentro de fAInance: análisis de datos, presupuesto, ahorro, alertas, objetivos y uso de la app.","Analisi limitata":"Análisis limitado","Analisi media":"Análisis medio","Analisi completa":"Análisis completo","Icona rapida Consulente AI":"Icono rápido del Consultor IA","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Muestra un botón flotante en la parte inferior derecha para abrir el chat IA al instante."});
    if(base.fr)Object.assign(base.fr,{"Expenses mese":"Dépenses ce mois","Income mese":"Revenus ce mois","Balance mese":"Solde ce mois","Balance ultimi 12 mesi":"Solde 12 derniers mois","Distribuzione uscite — ":"Répartition des dépenses — ","Entrate vs Uscite ":"Revenus vs Dépenses ","Saldo mensile ":"Solde mensuel ","Tasso aggiornato in tempo reale":"Taux de change en temps réel","Conversione ":"Conversion ","ricorrenti da confermare per ":"récurrents à confirmer pour ","alert di spesa superati":"alertes de dépense déclenchées","Ultime uscite":"Dernières dépenses","Ultime entrate":"Derniers revenus","Distribuzione — ":"Répartition — ","Per area":"Par zone","Anno ":"Année ","Entrate vs Uscite — ":"Revenus vs Dépenses — ","Entrate per tipo — ":"Revenus par type — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"Aucun budget configuré. Allez dans la section Budget pour le configurer.","Categorie sforate":"Catégories dépassées","avanza ":"reste ","sfora ":"dépasse de ","rimane ":"reste ","Attendibilità del risparmio — ":"Fiabilité de l'épargne — ","Scostamento medio":"Écart moyen","risparmio reale vs pianificato":"épargne réelle vs planifiée","mensile da budget":"mensuel du budget","In miglioramento":"En amélioration","In peggioramento":"En détérioration","confronto prima/seconda metà anno":"première vs deuxième moitié de l'année","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Épargne planifiée (tirets violets) vs réelle (barres) — ","Risparmio reale positivo":"Épargne réelle positive","Risparmio reale negativo":"Épargne réelle négative","Risparmio pianificato":"Épargne planifiée","Dettaglio mensile — ":"Détail mensuel — ","Mesi centrati: ":"Mois dans l'objectif: ","Nessuna categoria sforata o a rischio!":"Aucune catégorie dépassée ou à risque!","Reddito mensile di riferimento":"Revenu mensuel de référence","Reddito di riferimento":"Revenu de référence","Reddito di rif.":"Revenu de réf.","Importo manuale:":"Montant manuel:","Totale allocato":"Total alloué","Disponibile:":"Disponible:","Disponibile: ":"Disponible: ","% del reddito allocato · risparmio pianificato: ":"% du revenu alloué · épargne planifiée: ","% del reddito":"% du revenu","Suddivisione per categoria":"Répartition par catégorie","IMPORTO (":"MONTANT (","% REDDITO":"% REVENU","Rispetto al piano":"vs plan","Salva suddivisione":"Enregistrer la répartition","Patrimonio — ":"Patrimoine — ","vs mese scorso":"vs mois dernier","Modalità: ":"Mode: ","Manuale":"Manuel","Semi-automatica ⚠️":"Semi-automatique ⚠️","✏️ Inserimento":"✏️ Saisie","📅 Storico":"📅 Historique","Mese corrente — non ancora salvato":"Mois courant — pas encore enregistré","✅ Dati già salvati":"✅ Données déjà enregistrées","⚠️ Nessun dato per questo mese":"⚠️ Aucune donnée pour ce mois","Totale ":"Total ","📋 Copia valori da un altro mese...":"📋 Copier les valeurs d'un autre mois...","Copia da":"Copier de","Andamento patrimonio — ":"Évolution du patrimoine — ","🔄 Aggiorna":"🔄 Mettre à jour","💾 Salva":"💾 Enregistrer","Salva nota":"Enregistrer la note","💾 Salva nota":"💾 Enregistrer la note","🗑 Elimina nota":"🗑 Supprimer la note","Nessun appunto":"Aucune note","Nessun documento caricato":"Aucun document téléchargé","Nessuna coordinata salvata":"Aucune coordonnée bancaire enregistrée","Banca":"Banque","Intestatario":"Titulaire","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Téléchargez des PDF, images, Excel ou CSV. Les fichiers sont sauvegardés dans les données du compte.","+ Carica documento":"+ Télécharger un document","Apri":"Ouvrir","Aggiorna appunto":"Mettre à jour la note","Salva appunto":"Enregistrer la note","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Ajoutez une note pour cet élément... (ex. détails du compte, délais, objectifs)","Formato non supportato":"Format non supporté","Alert di spesa":"Alerte de dépense","attiva al ":"active à ","al 100%":"à 100%","Dati personali, account, accesso":"Données personnelles, compte, connexion","Tema, colori, stile pulsanti e widget":"Thème, couleurs, style des boutons et widget","FAQ, tutorial, sito web, contatti":"FAQ, tutoriels, site web, contacts","Saldo home, valuta secondaria e visualizzazione valori.":"Solde accueil, devise secondaire et affichage des valeurs.","Balance home, valuta secondaria e visualizzazione valori.":"Solde accueil, devise secondaire et affichage des valeurs.","Mostra i valori convertiti in una seconda valuta (via API).":"Afficher les valeurs converties dans une deuxième devise (via API).","Mostra ":"Afficher "," in:":" dans:","sempre":"toujours","Lunedì":"Lundi","Domenica":"Dimanche","Dati sincronizzati su cloud":"Données synchronisées sur le cloud","☁️ Dati sincronizzati su cloud":"☁️ Données synchronisées sur le cloud","Telefono":"Téléphone","Nascita":"Naissance","Città":"Ville","Sesso":"Sexe","Maschile":"Masculin","Femminile":"Féminin","Non spec.":"Non spéc.","Cambia password":"Changer le mot de passe","🔑 Cambia password":"🔑 Changer le mot de passe","Esci":"Se déconnecter","🚪 Esci":"🚪 Se déconnecter","Uscire dall'account?":"Se déconnecter du compte?","Crea account o Accedi":"Créer un compte ou Se connecter","🔑 Crea account o Accedi":"🔑 Créer un compte ou Se connecter","Profilo aggiornato":"Profil mis à jour","Nuova password":"Nouveau mot de passe","Minimo 6 caratteri":"Minimum 6 caractères","Aggiorna password":"Mettre à jour le mot de passe","Data nascita":"Date de naissance","Utilisateur":"Utilisateur","Email non disponibile":"Email non disponible","Scrivi una domanda su fAInance...":"Posez une question au Conseiller IA...","Invia":"Envoyer","Sto analizzando...":"Analyse en cours...","Consigli attivi":"Conseils actifs","Priorità alta":"Priorité élevée","Controlli dati":"Vérifications des données","📌 Consigli e metriche":"📌 Conseils et métriques","💬 Conversazione":"💬 Conversation","Analisi automatiche":"Analyses automatiques","Domande su fAInance":"Questions libres","💬 Inizia conversazione":"💬 Démarrer une conversation","Analizza":"Analyser","Non mostrare più":"Ne plus afficher","Importazione completata!":"Importation terminée!","importate con successo":"importées avec succès","Operazione non reversibile. Elementi interessati:":"Opération irréversible. Éléments concernés:","Elimina i dati per singola sezione.":"Supprimer les données par section.","La ricerca seleziona automaticamente i risultati trovati.":"La recherche sélectionne automatiquement les résultats trouvés.","voci":"éléments","Nessun dato selezionato":"Aucune donnée sélectionnée","uscite":"dépenses","entrate":"revenus","voci patrimonio":"éléments du patrimoine","Consigli e metriche":"Conseils et métriques","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"Agent IA: analysez vos finances, conseils pratiques et chat sur les finances personnelles ou l'économie générale.","Analisi limitata":"Analyse limitée","Analisi media":"Analyse moyenne","Analisi completa":"Analyse complète","🤖 Icona rapida Consulente AI":"🤖 Icône rapide du Conseiller IA","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Affiche un bouton flottant en bas à droite pour ouvrir le chat IA immédiatement."});
    if(base.de)Object.assign(base.de,{"Expenses mese":"Ausgaben diesen Monat","Income mese":"Einnahmen diesen Monat","Balance mese":"Saldo diesen Monat","Balance ultimi 12 mesi":"Saldo letzte 12 Monate","Distribuzione uscite — ":"Ausgabenverteilung — ","Entrate vs Uscite ":"Einnahmen vs Ausgaben ","Saldo mensile ":"Monatssaldo ","Tasso aggiornato in tempo reale":"Echtzeit-Wechselkurs","Conversione ":"Umrechnung ","ricorrenti da confermare per ":"wiederkehrende zu bestätigen für ","alert di spesa superati":"Ausgabenwarnungen ausgelöst","Ultime uscite":"Letzte Ausgaben","Ultime entrate":"Letzte Einnahmen","Distribuzione — ":"Verteilung — ","Per area":"Nach Bereich","Anno ":"Jahr ","Entrate vs Uscite — ":"Einnahmen vs Ausgaben — ","Entrate per tipo — ":"Einnahmen nach Typ — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"Kein Budget konfiguriert. Gehen Sie zum Budgetbereich, um es einzurichten.","Categorie sforate":"Überschrittene Kategorien","avanza ":"verbleiben ","sfora ":"überschreitet um ","rimane ":"verbleiben ","Attendibilità del risparmio — ":"Sparuverlässigkeit — ","Scostamento medio":"Durchschnittliche Abweichung","risparmio reale vs pianificato":"tatsächliche vs geplante Ersparnisse","mensile da budget":"monatlich aus Budget","In miglioramento":"Verbessernd","In peggioramento":"Verschlechternd","confronto prima/seconda metà anno":"erste vs zweite Jahreshälfte","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Geplante Ersparnisse (lila gestrichelt) vs tatsächlich (Balken) — ","Risparmio reale positivo":"Positive tatsächliche Ersparnisse","Risparmio reale negativo":"Negative tatsächliche Ersparnisse","Risparmio pianificato":"Geplante Ersparnisse","Dettaglio mensile — ":"Monatliche Details — ","Mesi centrati: ":"Monate im Ziel: ","Nessuna categoria sforata o a rischio!":"Keine überschrittenen oder gefährdeten Kategorien!","Reddito mensile di riferimento":"Referenz-Monatseinkommen","Reddito di riferimento":"Referenzeinkommen","Reddito di rif.":"Ref.-Einkommen","Importo manuale:":"Manueller Betrag:","Totale allocato":"Gesamt zugewiesen","Disponibile:":"Verfügbar:","Disponibile: ":"Verfügbar: ","% del reddito allocato · risparmio pianificato: ":"% des Einkommens zugewiesen · geplante Ersparnisse: ","% del reddito":"% des Einkommens","Suddivisione per categoria":"Aufteilung nach Kategorie","IMPORTO (":"BETRAG (","% REDDITO":"% EINKOMMEN","Rispetto al piano":"vs Plan","Salva suddivisione":"Aufteilung speichern","Patrimonio — ":"Vermögen — ","vs mese scorso":"vs letzten Monat","Modalità: ":"Modus: ","Manuale":"Manuell","Semi-automatica ⚠️":"Halbautomatisch ⚠️","✏️ Inserimento":"✏️ Eingabe","📅 Storico":"📅 Verlauf","Mese corrente — non ancora salvato":"Aktueller Monat — noch nicht gespeichert","✅ Dati già salvati":"✅ Daten bereits gespeichert","⚠️ Nessun dato per questo mese":"⚠️ Keine Daten für diesen Monat","Totale ":"Gesamt ","📋 Copia valori da un altro mese...":"📋 Werte von einem anderen Monat kopieren...","Copia da":"Kopieren von","Andamento patrimonio — ":"Vermögensentwicklung — ","🔄 Aggiorna":"🔄 Aktualisieren","💾 Salva":"💾 Speichern","Salva nota":"Notiz speichern","💾 Salva nota":"💾 Notiz speichern","🗑 Elimina nota":"🗑 Notiz löschen","Nessun appunto":"Keine Notizen","Nessun documento caricato":"Keine Dokumente hochgeladen","Nessuna coordinata salvata":"Keine Bankdaten gespeichert","Banca":"Bank","Intestatario":"Kontoinhaber","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Laden Sie PDF, Bilder, Excel oder CSV hoch. Dateien werden in den Kontodaten gespeichert.","+ Carica documento":"+ Dokument hochladen","Apri":"Öffnen","Aggiorna appunto":"Notiz aktualisieren","Salva appunto":"Notiz speichern","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Fügen Sie eine Notiz für diesen Eintrag hinzu... (z.B. Kontodetails, Fristen, Ziele)","Formato non supportato":"Format nicht unterstützt","Alert di spesa":"Ausgabenwarnung","attiva al ":"aktiv bei ","al 100%":"bei 100%","Dati personali, account, accesso":"Persönliche Daten, Konto, Zugang","Tema, colori, stile pulsanti e widget":"Theme, Farben, Schaltflächenstil und Widget","FAQ, tutorial, sito web, contatti":"FAQ, Tutorials, Webseite, Kontakte","Saldo home, valuta secondaria e visualizzazione valori.":"Startsaldo, Nebenwährung und Wertanzeige.","Balance home, valuta secondaria e visualizzazione valori.":"Startsaldo, Nebenwährung und Wertanzeige.","Mostra i valori convertiti in una seconda valuta (via API).":"Werte in einer zweiten Währung anzeigen (über API).","Mostra ":"Anzeigen "," in:":" in:","sempre":"immer","Lunedì":"Montag","Domenica":"Sonntag","Dati sincronizzati su cloud":"Daten mit Cloud synchronisiert","☁️ Dati sincronizzati su cloud":"☁️ Daten mit Cloud synchronisiert","Telefono":"Telefon","Nascita":"Geburtstag","Città":"Stadt","Sesso":"Geschlecht","Maschile":"Männlich","Femminile":"Weiblich","Non spec.":"Nicht ang.","Cambia password":"Passwort ändern","🔑 Cambia password":"🔑 Passwort ändern","Esci":"Abmelden","🚪 Esci":"🚪 Abmelden","Uscire dall'account?":"Vom Konto abmelden?","Crea account o Accedi":"Konto erstellen oder Anmelden","🔑 Crea account o Accedi":"🔑 Konto erstellen oder Anmelden","Profilo aggiornato":"Profil aktualisiert","Nuova password":"Neues Passwort","Minimo 6 caratteri":"Mindestens 6 Zeichen","Aggiorna password":"Passwort aktualisieren","Data nascita":"Geburtsdatum","Benutzer":"Benutzer","Email non disponibile":"E-Mail nicht verfügbar","Scrivi una domanda su fAInance...":"Stellen Sie dem KI-Berater eine Frage...","Invia":"Senden","Sto analizzando...":"Analysiere...","Consigli attivi":"Aktive Hinweise","Priorità alta":"Hohe Priorität","Controlli dati":"Datenprüfungen","📌 Consigli e metriche":"📌 Hinweise und Metriken","💬 Conversazione":"💬 Konversation","Analisi automatiche":"Automatische Analysen","Domande su fAInance":"Freie Fragen","💬 Inizia conversazione":"💬 Gespräch beginnen","Analizza":"Analysieren","Non mostrare più":"Nicht mehr anzeigen","Importazione completata!":"Import abgeschlossen!","importate con successo":"erfolgreich importiert","Operazione non reversibile. Elementi interessati:":"Nicht umkehrbare Aktion. Betroffene Elemente:","Elimina i dati per singola sezione.":"Daten nach Abschnitt löschen.","La ricerca seleziona automaticamente i risultati trovati.":"Die Suche wählt automatisch gefundene Ergebnisse aus.","voci":"Einträge","Nessun dato selezionato":"Keine Daten ausgewählt","uscite":"Ausgaben","entrate":"Einnahmen","voci patrimonio":"Vermögenspositionen","Consigli e metriche":"Hinweise und Metriken","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"KI-Agent: Analysieren Sie Ihre Finanzen, praktische Ratschläge und Chat zu persönlichen Finanzen oder allgemeiner Wirtschaft.","Analisi limitata":"Begrenzte Analyse","Analisi media":"Mittlere Analyse","Analisi completa":"Vollständige Analyse","🤖 Icona rapida Consulente AI":"🤖 Schnellzugriff KI-Berater","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Zeigt eine schwebende Schaltfläche unten rechts an, um den KI-Chat sofort zu öffnen."});
    if(base.pt)Object.assign(base.pt,{"Expenses mese":"Despesas este mês","Income mese":"Receitas este mês","Balance mese":"Saldo este mês","Balance ultimi 12 mesi":"Saldo últimos 12 meses","Distribuzione uscite — ":"Distribuição de despesas — ","Entrate vs Uscite ":"Receitas vs Despesas ","Saldo mensile ":"Saldo mensal ","Tasso aggiornato in tempo reale":"Taxa de câmbio em tempo real","Conversione ":"Conversão ","ricorrenti da confermare per ":"recorrentes a confirmar em ","alert di spesa superati":"alertas de despesa ultrapassados","Ultime uscite":"Últimas despesas","Ultime entrate":"Últimas receitas","Distribuzione — ":"Distribuição — ","Per area":"Por área","Anno ":"Ano ","Entrate vs Uscite — ":"Receitas vs Despesas — ","Entrate per tipo — ":"Receitas por tipo — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"Sem orçamento configurado. Vá à secção Orçamento para o definir.","Categorie sforate":"Categorias excedidas","avanza ":"sobra ","sfora ":"excede em ","rimane ":"sobra ","Attendibilità del risparmio — ":"Fiabilidade das poupanças — ","Scostamento medio":"Desvio médio","risparmio reale vs pianificato":"poupança real vs planeada","mensile da budget":"mensal do orçamento","In miglioramento":"A melhorar","In peggioramento":"A piorar","confronto prima/seconda metà anno":"primeira vs segunda metade do ano","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Poupança planeada (tracejado roxo) vs real (barras) — ","Risparmio reale positivo":"Poupança real positiva","Risparmio reale negativo":"Poupança real negativa","Risparmio pianificato":"Poupança planeada","Dettaglio mensile — ":"Detalhe mensal — ","Mesi centrati: ":"Meses no objetivo: ","Nessuna categoria sforata o a rischio!":"Sem categorias excedidas ou em risco!","Reddito mensile di riferimento":"Rendimento mensal de referência","Reddito di riferimento":"Rendimento de referência","Reddito di rif.":"Rend. de ref.","Importo manuale:":"Valor manual:","Totale allocato":"Total alocado","Disponibile:":"Disponível:","Disponibile: ":"Disponível: ","% del reddito allocato · risparmio pianificato: ":"% do rendimento alocado · poupança planeada: ","% del reddito":"% do rendimento","Suddivisione per categoria":"Subdivisão por categoria","IMPORTO (":"VALOR (","% REDDITO":"% RENDIMENTO","Rispetto al piano":"vs plano","Salva suddivisione":"Guardar subdivisão","Patrimonio — ":"Património — ","vs mese scorso":"vs mês passado","Modalità: ":"Modo: ","Manuale":"Manual","Semi-automatica ⚠️":"Semi-automático ⚠️","✏️ Inserimento":"✏️ Inserção","📅 Storico":"📅 Histórico","Mese corrente — non ancora salvato":"Mês atual — ainda não guardado","✅ Dati già salvati":"✅ Dados já guardados","⚠️ Nessun dato per questo mese":"⚠️ Sem dados para este mês","Totale ":"Total ","📋 Copia valori da un altro mese...":"📋 Copiar valores de outro mês...","Copia da":"Copiar de","Andamento patrimonio — ":"Evolução do património — ","🔄 Aggiorna":"🔄 Atualizar","💾 Salva":"💾 Guardar","Salva nota":"Guardar nota","💾 Salva nota":"💾 Guardar nota","🗑 Elimina nota":"🗑 Eliminar nota","Nessun appunto":"Sem notas","Nessun documento caricato":"Sem documentos carregados","Nessuna coordinata salvata":"Sem dados bancários guardados","Banca":"Banco","Intestatario":"Titular","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Carregue PDF, imagens, Excel ou CSV. Os ficheiros são guardados nos dados da conta.","+ Carica documento":"+ Carregar documento","Apri":"Abrir","Aggiorna appunto":"Atualizar nota","Salva appunto":"Guardar nota","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Adicione uma nota para este item... (ex. detalhes da conta, prazos, objetivos)","Formato non supportato":"Formato não suportado","Alert di spesa":"Alerta de despesa","attiva al ":"ativa aos ","al 100%":"a 100%","Dati personali, account, accesso":"Dados pessoais, conta, acesso","Tema, colori, stile pulsanti e widget":"Tema, cores, estilo de botões e widget","FAQ, tutorial, sito web, contatti":"FAQ, tutoriais, site, contactos","Saldo home, valuta secondaria e visualizzazione valori.":"Saldo inicial, moeda secundária e visualização de valores.","Balance home, valuta secondaria e visualizzazione valori.":"Saldo inicial, moeda secundária e visualização de valores.","Mostra i valori convertiti in una seconda valuta (via API).":"Mostrar valores convertidos para uma segunda moeda (via API).","Mostra ":"Mostrar "," in:":" em:","sempre":"sempre","Lunedì":"Segunda-feira","Domenica":"Domingo","Dati sincronizzati su cloud":"Dados sincronizados na nuvem","☁️ Dati sincronizzati su cloud":"☁️ Dados sincronizados na nuvem","Telefono":"Telefone","Nascita":"Nascimento","Città":"Cidade","Sesso":"Sexo","Maschile":"Masculino","Femminile":"Feminino","Non spec.":"Não espec.","Cambia password":"Alterar palavra-passe","🔑 Cambia password":"🔑 Alterar palavra-passe","Esci":"Sair","🚪 Esci":"🚪 Sair","Uscire dall'account?":"Sair da conta?","Crea account o Accedi":"Criar conta ou Entrar","🔑 Crea account o Accedi":"🔑 Criar conta ou Entrar","Profilo aggiornato":"Perfil atualizado","Nuova password":"Nova palavra-passe","Minimo 6 caratteri":"Mínimo 6 caracteres","Aggiorna password":"Atualizar palavra-passe","Data nascita":"Data de nascimento","Utilizador":"Utilizador","Email non disponibile":"Não registrado","Scrivi una domanda su fAInance...":"Escreva uma pergunta ao Consultor IA...","Invia":"Enviar","Sto analizzando...":"A analisar...","Consigli attivi":"Conselhos ativos","Priorità alta":"Alta prioridade","Controlli dati":"Verificações de dados","📌 Consigli e metriche":"📌 Conselhos e métricas","💬 Conversazione":"💬 Conversa","Analisi automatiche":"Análises automáticas","Domande su fAInance":"Perguntas livres","💬 Inizia conversazione":"💬 Iniciar conversa","Analizza":"Analisar","Non mostrare più":"Não mostrar mais","Importazione completata!":"Importação concluída!","importate con successo":"importadas com sucesso","Operazione non reversibile. Elementi interessati:":"Operação irreversível. Elementos afetados:","Elimina i dati per singola sezione.":"Eliminar dados por secção.","La ricerca seleziona automaticamente i risultati trovati.":"A pesquisa seleciona automaticamente os resultados encontrados.","voci":"itens","Nessun dato selezionato":"Sem dados selecionados","uscite":"despesas","entrate":"receitas","voci patrimonio":"elementos do patrimônio","Consigli e metriche":"Conselhos e métricas","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"Agente IA: analise as suas finanças, conselhos práticos e chat sobre finanças pessoais ou economia geral.","Analisi limitata":"Análise limitada","Analisi media":"Análise média","Analisi completa":"Análise completa","🤖 Icona rapida Consulente AI":"🤖 Ícone rápido do Consultor IA","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Mostra um botão flutuante no canto inferior direito para abrir o chat IA imediatamente."});
    if(base.pl)Object.assign(base.pl,{"Expenses mese":"Wydatki w tym miesiącu","Income mese":"Przychody w tym miesiącu","Balance mese":"Saldo w tym miesiącu","Balance ultimi 12 mesi":"Saldo ostatnich 12 miesięcy","Distribuzione uscite — ":"Rozkład wydatków — ","Entrate vs Uscite ":"Przychody vs Wydatki ","Saldo mensile ":"Miesięczne saldo ","Tasso aggiornato in tempo reale":"Kurs wymiany w czasie rzeczywistym","Conversione ":"Przeliczenie ","ricorrenti da confermare per ":"cykliczne do potwierdzenia dla ","alert di spesa superati":"przekroczone alerty wydatków","Ultime uscite":"Ostatnie wydatki","Ultime entrate":"Ostatnie przychody","Distribuzione — ":"Rozkład — ","Per area":"Według obszaru","Anno ":"Rok ","Entrate vs Uscite — ":"Przychody vs Wydatki — ","Entrate per tipo — ":"Przychody wg typu — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"Brak skonfigurowanego budżetu. Przejdź do sekcji Budżet, aby go skonfigurować.","Categorie sforate":"Przekroczone kategorie","avanza ":"pozostaje ","sfora ":"przekracza o ","rimane ":"pozostaje ","Attendibilità del risparmio — ":"Wiarygodność oszczędności — ","Scostamento medio":"Średnie odchylenie","risparmio reale vs pianificato":"oszczędności rzeczywiste vs zaplanowane","mensile da budget":"miesięcznie z budżetu","In miglioramento":"Poprawa","In peggioramento":"Pogorszenie","confronto prima/seconda metà anno":"pierwsza vs druga połowa roku","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Zaplanowane oszczędności (fioletowe przerywane) vs rzeczywiste (słupki) — ","Risparmio reale positivo":"Pozytywne rzeczywiste oszczędności","Risparmio reale negativo":"Negatywne rzeczywiste oszczędności","Risparmio pianificato":"Zaplanowane oszczędności","Dettaglio mensile — ":"Szczegóły miesięczne — ","Mesi centrati: ":"Miesiące w celu: ","Nessuna categoria sforata o a rischio!":"Brak przekroczonych lub zagrożonych kategorii!","Reddito mensile di riferimento":"Referencyjny miesięczny dochód","Reddito di riferimento":"Dochód referencyjny","Reddito di rif.":"Doch. ref.","Importo manuale:":"Kwota ręczna:","Totale allocato":"Łącznie przydzielono","Disponibile:":"Dostępne:","Disponibile: ":"Dostępne: ","% del reddito allocato · risparmio pianificato: ":"% dochodu przydzielonego · zaplanowane oszczędności: ","% del reddito":"% dochodu","Suddivisione per categoria":"Podział według kategorii","IMPORTO (":"KWOTA (","% REDDITO":"% DOCHÓD","Rispetto al piano":"vs plan","Salva suddivisione":"Zapisz podział","Patrimonio — ":"Majątek — ","vs mese scorso":"vs ostatni miesiąc","Modalità: ":"Tryb: ","Manuale":"Ręczny","Semi-automatica ⚠️":"Półautomatyczny ⚠️","✏️ Inserimento":"✏️ Wprowadzenie","📅 Storico":"📅 Historia","Mese corrente — non ancora salvato":"Bieżący miesiąc — niezapisany","✅ Dati già salvati":"✅ Dane już zapisane","⚠️ Nessun dato per questo mese":"⚠️ Brak danych dla tego miesiąca","Totale ":"Łącznie ","📋 Copia valori da un altro mese...":"📋 Kopiuj wartości z innego miesiąca...","Copia da":"Kopiuj z","Andamento patrimonio — ":"Trend majątku — ","🔄 Aggiorna":"🔄 Zaktualizuj","💾 Salva":"💾 Zapisz","Salva nota":"Zapisz notatkę","💾 Salva nota":"💾 Zapisz notatkę","🗑 Elimina nota":"🗑 Usuń notatkę","Nessun appunto":"Brak notatek","Nessun documento caricato":"Brak przesłanych dokumentów","Nessuna coordinata salvata":"Brak zapisanych danych bankowych","Banca":"Bank","Intestatario":"Właściciel konta","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Prześlij PDF, obrazy, Excel lub CSV. Pliki są zapisywane w danych konta.","+ Carica documento":"+ Prześlij dokument","Apri":"Otwórz","Aggiorna appunto":"Zaktualizuj notatkę","Salva appunto":"Zapisz notatkę","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Dodaj notatkę do tej pozycji... (np. szczegóły konta, terminy, cele)","Formato non supportato":"Nieobsługiwany format","Alert di spesa":"Alert wydatków","attiva al ":"aktywny przy ","al 100%":"na 100%","Dati personali, account, accesso":"Dane osobowe, konto, logowanie","Tema, colori, stile pulsanti e widget":"Motyw, kolory, styl przycisków i widget","FAQ, tutorial, sito web, contatti":"FAQ, samouczki, strona internetowa, kontakty","Saldo home, valuta secondaria e visualizzazione valori.":"Saldo startowe, waluta dodatkowa i wyświetlanie wartości.","Balance home, valuta secondaria e visualizzazione valori.":"Saldo startowe, waluta dodatkowa i wyświetlanie wartości.","Mostra i valori convertiti in una seconda valuta (via API).":"Pokaż wartości przeliczone na drugą walutę (przez API).","Mostra ":"Pokaż "," in:":" w:","sempre":"zawsze","Lunedì":"Poniedziałek","Domenica":"Niedziela","Dati sincronizzati su cloud":"Dane zsynchronizowane z chmurą","☁️ Dati sincronizzati su cloud":"☁️ Dane zsynchronizowane z chmurą","Telefono":"Telefon","Nascita":"Urodziny","Città":"Miasto","Sesso":"Płeć","Maschile":"Mężczyzna","Femminile":"Kobieta","Non spec.":"Nieokreślona","Cambia password":"Zmień hasło","🔑 Cambia password":"🔑 Zmień hasło","Esci":"Wyloguj","🚪 Esci":"🚪 Wyloguj","Uscire dall'account?":"Wylogować z konta?","Crea account o Accedi":"Utwórz konto lub Zaloguj","🔑 Crea account o Accedi":"🔑 Utwórz konto lub Zaloguj","Profilo aggiornato":"Profil zaktualizowany","Nuova password":"Nowe hasło","Minimo 6 caratteri":"Minimum 6 znaków","Aggiorna password":"Zaktualizuj hasło","Data nascita":"Data urodzenia","Użytkownik":"Użytkownik","Email non disponibile":"Email niedostępny","Scrivi una domanda su fAInance...":"Napisz pytanie do Doradcy AI...","Invia":"Wyślij","Sto analizzando...":"Analizuję...","Consigli attivi":"Aktywne porady","Priorità alta":"Wysoki priorytet","Controlli dati":"Kontrole danych","📌 Consigli e metriche":"📌 Porady i metryki","💬 Conversazione":"💬 Rozmowa","Analisi automatiche":"Automatyczne analizy","Domande su fAInance":"Dowolne pytania","💬 Inizia conversazione":"💬 Rozpocznij rozmowę","Analizza":"Analizuj","Non mostrare più":"Nie pokazuj więcej","Importazione completata!":"Import zakończony!","importate con successo":"pomyślnie zaimportowane","Operazione non reversibile. Elementi interessati:":"Operacja nieodwracalna. Dotknięte elementy:","Elimina i dati per singola sezione.":"Usuń dane według sekcji.","La ricerca seleziona automaticamente i risultati trovati.":"Wyszukiwanie automatycznie wybiera znalezione wyniki.","voci":"pozycje","Nessun dato selezionato":"Brak wybranych danych","uscite":"wydatki","entrate":"przychody","voci patrimonio":"pozycje majątku","Consigli e metriche":"Porady i metryki","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"Agent AI: analizuj swoje finanse, praktyczne porady i czat o finansach osobistych lub ogólnej ekonomii.","Analisi limitata":"Ograniczona analiza","Analisi media":"Średnia analiza","Analisi completa":"Pełna analiza","🤖 Icona rapida Consulente AI":"🤖 Szybka ikona Doradcy AI","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Wyświetla pływający przycisk w prawym dolnym rogu, aby natychmiast otworzyć czat AI."});
    if(base.nl)Object.assign(base.nl,{"Expenses mese":"Uitgaven deze maand","Income mese":"Inkomsten deze maand","Balance mese":"Saldo deze maand","Balance ultimi 12 mesi":"Saldo laatste 12 maanden","Distribuzione uscite — ":"Verdeling uitgaven — ","Entrate vs Uscite ":"Inkomsten vs Uitgaven ","Saldo mensile ":"Maandsaldo ","Tasso aggiornato in tempo reale":"Wisselkoers in realtime","Conversione ":"Omrekening ","ricorrenti da confermare per ":"terugkerende te bevestigen voor ","alert di spesa superati":"bestedingswaarschuwingen geactiveerd","Ultime uscite":"Recente uitgaven","Ultime entrate":"Recente inkomsten","Distribuzione — ":"Verdeling — ","Per area":"Per gebied","Anno ":"Jaar ","Entrate vs Uscite — ":"Inkomsten vs Uitgaven — ","Entrate per tipo — ":"Inkomsten per type — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"Geen budget geconfigureerd. Ga naar de sectie Budget om het in te stellen.","Categorie sforate":"Overschreden categorieën","avanza ":"resterend ","sfora ":"overschrijdt met ","rimane ":"resterend ","Attendibilità del risparmio — ":"Spaarbetrouwbaarheid — ","Scostamento medio":"Gemiddelde afwijking","risparmio reale vs pianificato":"werkelijke vs geplande besparingen","mensile da budget":"maandelijks uit budget","In miglioramento":"Verbetering","In peggioramento":"Verslechtering","confronto prima/seconda metà anno":"eerste vs tweede helft van het jaar","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Geplande besparingen (paarse stippellijn) vs werkelijk (staven) — ","Risparmio reale positivo":"Positieve werkelijke besparingen","Risparmio reale negativo":"Negatieve werkelijke besparingen","Risparmio pianificato":"Geplande besparingen","Dettaglio mensile — ":"Maandelijks detail — ","Mesi centrati: ":"Maanden op doel: ","Nessuna categoria sforata o a rischio!":"Geen overschreden of risicocategorieën!","Reddito mensile di riferimento":"Referentiemaandinkomen","Reddito di riferimento":"Referentie-inkomen","Reddito di rif.":"Ref. inkomen","Importo manuale:":"Handmatig bedrag:","Totale allocato":"Totaal toegewezen","Disponibile:":"Beschikbaar:","Disponibile: ":"Beschikbaar: ","% del reddito allocato · risparmio pianificato: ":"% van inkomen toegewezen · geplande besparingen: ","% del reddito":"% van inkomen","Suddivisione per categoria":"Verdeling per categorie","IMPORTO (":"BEDRAG (","% REDDITO":"% INKOMEN","Rispetto al piano":"vs plan","Salva suddivisione":"Verdeling opslaan","Patrimonio — ":"Vermogen — ","vs mese scorso":"vs vorige maand","Modalità: ":"Modus: ","Manuale":"Handmatig","Semi-automatica ⚠️":"Halfautomatisch ⚠️","✏️ Inserimento":"✏️ Invoer","📅 Storico":"📅 Geschiedenis","Mese corrente — non ancora salvato":"Huidige maand — nog niet opgeslagen","✅ Dati già salvati":"✅ Gegevens al opgeslagen","⚠️ Nessun dato per questo mese":"⚠️ Geen gegevens voor deze maand","Totale ":"Totaal ","📋 Copia valori da un altro mese...":"📋 Waarden van een andere maand kopiëren...","Copia da":"Kopiëren van","Andamento patrimonio — ":"Vermogensontwikkeling — ","🔄 Aggiorna":"🔄 Bijwerken","💾 Salva":"💾 Opslaan","Salva nota":"Notitie opslaan","💾 Salva nota":"💾 Notitie opslaan","🗑 Elimina nota":"🗑 Notitie verwijderen","Nessun appunto":"Geen notities","Nessun documento caricato":"Geen documenten geüpload","Nessuna coordinata salvata":"Geen bankgegevens opgeslagen","Banca":"Bank","Intestatario":"Rekeninghouder","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Upload PDF, afbeeldingen, Excel of CSV. Bestanden worden opgeslagen in accountgegevens.","+ Carica documento":"+ Document uploaden","Apri":"Openen","Aggiorna appunto":"Notitie bijwerken","Salva appunto":"Notitie opslaan","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Voeg een notitie toe voor dit item... (bijv. accountdetails, deadlines, doelen)","Formato non supportato":"Niet-ondersteund formaat","Alert di spesa":"Bestedingswaarschuwing","attiva al ":"actief bij ","al 100%":"op 100%","Dati personali, account, accesso":"Persoonlijke gegevens, account, toegang","Tema, colori, stile pulsanti e widget":"Thema, kleuren, knopstijl en widget","FAQ, tutorial, sito web, contatti":"FAQ, tutorials, website, contacten","Saldo home, valuta secondaria e visualizzazione valori.":"Beginsaldo, secundaire valuta en waardeweergave.","Balance home, valuta secondaria e visualizzazione valori.":"Beginsaldo, secundaire valuta en waardeweergave.","Mostra i valori convertiti in una seconda valuta (via API).":"Waarden weergeven omgerekend naar een tweede valuta (via API).","Mostra ":"Toon "," in:":" in:","sempre":"altijd","Lunedì":"Maandag","Domenica":"Zondag","Dati sincronizzati su cloud":"Gegevens gesynchroniseerd met cloud","☁️ Dati sincronizzati su cloud":"☁️ Gegevens gesynchroniseerd met cloud","Telefono":"Telefoon","Nascita":"Geboortedatum","Città":"Stad","Sesso":"Geslacht","Maschile":"Man","Femminile":"Vrouw","Non spec.":"Niet opgeg.","Cambia password":"Wachtwoord wijzigen","🔑 Cambia password":"🔑 Wachtwoord wijzigen","Esci":"Uitloggen","🚪 Esci":"🚪 Uitloggen","Uscire dall'account?":"Uitloggen uit account?","Crea account o Accedi":"Account aanmaken of Inloggen","🔑 Crea account o Accedi":"🔑 Account aanmaken of Inloggen","Profilo aggiornato":"Profiel bijgewerkt","Nuova password":"Nieuw wachtwoord","Minimo 6 caratteri":"Minimaal 6 tekens","Aggiorna password":"Wachtwoord bijwerken","Data nascita":"Geboortedatum","Benutzer":"Benutzer","Email non disponibile":"Email niet beschikbaar","Scrivi una domanda su fAInance...":"Stel een vraag aan de AI-adviseur...","Invia":"Versturen","Sto analizzando...":"Analyseren...","Consigli attivi":"Actieve inzichten","Priorità alta":"Hoge prioriteit","Controlli dati":"Gegevenscontroles","📌 Consigli e metriche":"📌 Inzichten en statistieken","💬 Conversazione":"💬 Gesprek","Analisi automatiche":"Automatische analyses","Domande su fAInance":"Vrije vragen","💬 Inizia conversazione":"💬 Gesprek starten","Analizza":"Analyseren","Non mostrare più":"Niet meer tonen","Importazione completata!":"Import voltooid!","importate con successo":"succesvol geïmporteerd","Operazione non reversibile. Elementi interessati:":"Niet ongedaan te maken. Betrokken items:","Elimina i dati per singola sezione.":"Gegevens per sectie verwijderen.","La ricerca seleziona automaticamente i risultati trovati.":"De zoekopdracht selecteert automatisch gevonden resultaten.","voci":"items","Nessun dato selezionato":"Geen gegevens geselecteerd","uscite":"uitgaven","entrate":"inkomsten","voci patrimonio":"vermogensposten","Consigli e metriche":"Inzichten en statistieken","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"AI-agent: analyseer uw financiën, praktisch advies en chat over persoonlijke financiën of algemene economie.","Analisi limitata":"Beperkte analyse","Analisi media":"Gemiddelde analyse","Analisi completa":"Volledige analyse","🤖 Icona rapida Consulente AI":"🤖 Sneltoegang AI-adviseur","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Toont een zwevende knop rechtsonder om de AI-chat direct te openen."});
    if(base.ro)Object.assign(base.ro,{"Expenses mese":"Cheltuieli luna aceasta","Income mese":"Venituri luna aceasta","Balance mese":"Sold luna aceasta","Balance ultimi 12 mesi":"Sold ultimele 12 luni","Distribuzione uscite — ":"Distribuția cheltuielilor — ","Entrate vs Uscite ":"Venituri vs Cheltuieli ","Saldo mensile ":"Sold lunar ","Tasso aggiornato in tempo reale":"Curs de schimb în timp real","Conversione ":"Conversie ","ricorrenti da confermare per ":"recurente de confirmat pentru ","alert di spesa superati":"alerte cheltuieli declanșate","Ultime uscite":"Ultimele cheltuieli","Ultime entrate":"Ultimele venituri","Distribuzione — ":"Distribuție — ","Per area":"Pe zonă","Anno ":"An ","Entrate vs Uscite — ":"Venituri vs Cheltuieli — ","Entrate per tipo — ":"Venituri pe tip — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"Niciun buget configurat. Mergeți la secțiunea Buget pentru a-l configura.","Categorie sforate":"Categorii depășite","avanza ":"rămâne ","sfora ":"depășește cu ","rimane ":"rămâne ","Attendibilità del risparmio — ":"Fiabilitate economii — ","Scostamento medio":"Abatere medie","risparmio reale vs pianificato":"economii reale vs planificate","mensile da budget":"lunar din buget","In miglioramento":"Îmbunătățire","In peggioramento":"Deteriorare","confronto prima/seconda metà anno":"prima vs a doua jumătate a anului","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Economii planificate (linie violet punctată) vs reale (bare) — ","Risparmio reale positivo":"Economii reale pozitive","Risparmio reale negativo":"Economii reale negative","Risparmio pianificato":"Economii planificate","Dettaglio mensile — ":"Detaliu lunar — ","Mesi centrati: ":"Luni la obiectiv: ","Nessuna categoria sforata o a rischio!":"Nicio categorie depășită sau la risc!","Reddito mensile di riferimento":"Venit lunar de referință","Reddito di riferimento":"Venit de referință","Reddito di rif.":"Venit ref.","Importo manuale:":"Sumă manuală:","Totale allocato":"Total alocat","Disponibile:":"Disponibil:","Disponibile: ":"Disponibil: ","% del reddito allocato · risparmio pianificato: ":"% din venit alocat · economii planificate: ","% del reddito":"% din venit","Suddivisione per categoria":"Subdivizare pe categorie","IMPORTO (":"SUMĂ (","% REDDITO":"% VENIT","Rispetto al piano":"vs plan","Salva suddivisione":"Salvează subdivizare","Patrimonio — ":"Patrimoniu — ","vs mese scorso":"vs luna trecută","Modalità: ":"Mod: ","Manuale":"Manual","Semi-automatica ⚠️":"Semi-automat ⚠️","✏️ Inserimento":"✏️ Introducere","📅 Storico":"📅 Istoric","Mese corrente — non ancora salvato":"Luna curentă — nesalvată încă","✅ Dati già salvati":"✅ Date deja salvate","⚠️ Nessun dato per questo mese":"⚠️ Nicio dată pentru această lună","Totale ":"Total ","📋 Copia valori da un altro mese...":"📋 Copiați valorile dintr-o altă lună...","Copia da":"Copiați din","Andamento patrimonio — ":"Evoluția patrimoniului — ","🔄 Aggiorna":"🔄 Actualizează","💾 Salva":"💾 Salvează","Salva nota":"Salvează nota","💾 Salva nota":"💾 Salvează nota","🗑 Elimina nota":"🗑 Șterge nota","Nessun appunto":"Nicio notă","Nessun documento caricato":"Niciun document încărcat","Nessuna coordinata salvata":"Nicio dată bancară salvată","Banca":"Bancă","Intestatario":"Titular","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Încărcați PDF, imagini, Excel sau CSV. Fișierele sunt salvate în datele contului.","+ Carica documento":"+ Încarcă document","Apri":"Deschide","Aggiorna appunto":"Actualizează nota","Salva appunto":"Salvează nota","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Adăugați o notă pentru acest element... (ex. detalii cont, termene, obiective)","Formato non supportato":"Format neacceptat","Alert di spesa":"Alertă cheltuieli","attiva al ":"activă la ","al 100%":"la 100%","Dati personali, account, accesso":"Date personale, cont, acces","Tema, colori, stile pulsanti e widget":"Temă, culori, stil butoane și widget","FAQ, tutorial, sito web, contatti":"FAQ, tutoriale, site web, contacte","Saldo home, valuta secondaria e visualizzazione valori.":"Soldul de start, monedă secundară și afișarea valorilor.","Balance home, valuta secondaria e visualizzazione valori.":"Soldul de start, monedă secundară și afișarea valorilor.","Mostra i valori convertiti in una seconda valuta (via API).":"Afișați valorile convertite la o a doua monedă (prin API).","Mostra ":"Arată "," in:":" în:","sempre":"mereu","Lunedì":"Luni","Domenica":"Duminică","Dati sincronizzati su cloud":"Date sincronizate în cloud","☁️ Dati sincronizzati su cloud":"☁️ Date sincronizate în cloud","Telefono":"Telefon","Nascita":"Naștere","Città":"Oraș","Sesso":"Sex","Maschile":"Masculin","Femminile":"Feminin","Non spec.":"Nespecificat","Cambia password":"Schimbă parola","🔑 Cambia password":"🔑 Schimbă parola","Esci":"Deconectare","🚪 Esci":"🚪 Deconectare","Uscire dall'account?":"Deconectați din cont?","Crea account o Accedi":"Creați cont sau Conectați-vă","🔑 Crea account o Accedi":"🔑 Creați cont sau Conectați-vă","Profilo aggiornato":"Profil actualizat","Nuova password":"Parolă nouă","Minimo 6 caratteri":"Minimum 6 caractere","Aggiorna password":"Actualizează parola","Data nascita":"Data nașterii","Utilizator":"Utilizator","Email non disponibile":"Email indisponibil","Scrivi una domanda su fAInance...":"Scrie o întrebare către Consultantul AI...","Invia":"Trimite","Sto analizzando...":"Se analizează...","Consigli attivi":"Sfaturi active","Priorità alta":"Prioritate ridicată","Controlli dati":"Verificări date","📌 Consigli e metriche":"📌 Sfaturi și metrici","💬 Conversazione":"💬 Conversație","Analisi automatiche":"Analize automate","Domande su fAInance":"Întrebări libere","💬 Inizia conversazione":"💬 Începe conversația","Analizza":"Analizează","Non mostrare più":"Nu mai arăta","Importazione completata!":"Import finalizat!","importate con successo":"importate cu succes","Operazione non reversibile. Elementi interessati:":"Operație ireversibilă. Elemente afectate:","Elimina i dati per singola sezione.":"Șterge datele pe secțiune.","La ricerca seleziona automaticamente i risultati trovati.":"Căutarea selectează automat rezultatele găsite.","voci":"elemente","Nessun dato selezionato":"Nicio dată selectată","uscite":"cheltuieli","entrate":"venituri","voci patrimonio":"elemente patrimoniu","Consigli e metriche":"Sfaturi și metrici","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"Agent AI: analizați-vă finanțele, sfaturi practice și chat despre finanțe personale sau economie generală.","Analisi limitata":"Analiză limitată","Analisi media":"Analiză medie","Analisi completa":"Analiză completă","🤖 Icona rapida Consulente AI":"🤖 Pictogramă rapidă Consultant AI","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Afișează un buton plutitor în dreapta jos pentru a deschide chat-ul AI imediat."});
    if(base.el)Object.assign(base.el,{"Expenses mese":"Έξοδα μήνα","Income mese":"Έσοδα μήνα","Balance mese":"Υπόλοιπο μήνα","Balance ultimi 12 mesi":"Υπόλοιπο 12 μηνών","Distribuzione uscite — ":"Κατανομή εξόδων — ","Entrate vs Uscite ":"Έσοδα vs Έξοδα ","Saldo mensile ":"Μηνιαίο υπόλοιπο ","Tasso aggiornato in tempo reale":"Συναλλαγματική ισοτιμία σε πραγματικό χρόνο","Conversione ":"Μετατροπή ","ricorrenti da confermare per ":"επαναλαμβανόμενα για επιβεβαίωση ","alert di spesa superati":"ειδοποιήσεις δαπανών ενεργοποιήθηκαν","Ultime uscite":"Τελευταία έξοδα","Ultime entrate":"Τελευταία έσοδα","Distribuzione — ":"Κατανομή — ","Per area":"Ανά περιοχή","Anno ":"Έτος ","Entrate vs Uscite — ":"Έσοδα vs Έξοδα — ","Entrate per tipo — ":"Έσοδα ανά τύπο — ","Nessun budget configurato. Vai nella sezione Budget per impostarlo.":"Δεν έχει διαμορφωθεί προϋπολογισμός. Πηγαίνετε στην ενότητα Προϋπολογισμός για να τον ρυθμίσετε.","Categorie sforate":"Κατηγορίες που ξεπέρασαν τον προϋπολογισμό","avanza ":"απομένει ","sfora ":"υπερβαίνει κατά ","rimane ":"απομένει ","Attendibilità del risparmio — ":"Αξιοπιστία αποταμιεύσεων — ","Scostamento medio":"Μέση απόκλιση","risparmio reale vs pianificato":"πραγματικές vs σχεδιασμένες αποταμιεύσεις","mensile da budget":"μηνιαία από προϋπολογισμό","In miglioramento":"Βελτίωση","In peggioramento":"Επιδείνωση","confronto prima/seconda metà anno":"πρώτο vs δεύτερο εξάμηνο","Risparmio pianificato (tratteggiato viola) vs reale (barre) — ":"Σχεδιασμένες αποταμιεύσεις (μωβ διακεκομμένη) vs πραγματικές (ράβδοι) — ","Risparmio reale positivo":"Θετικές πραγματικές αποταμιεύσεις","Risparmio reale negativo":"Αρνητικές πραγματικές αποταμιεύσεις","Risparmio pianificato":"Σχεδιασμένες αποταμιεύσεις","Dettaglio mensile — ":"Μηνιαία λεπτομέρεια — ","Mesi centrati: ":"Μήνες στόχος: ","Nessuna categoria sforata o a rischio!":"Δεν υπάρχουν κατηγορίες που ξεπέρασαν τον προϋπολογισμό ή βρίσκονται σε κίνδυνο!","Reddito mensile di riferimento":"Μηνιαίο εισόδημα αναφοράς","Reddito di riferimento":"Εισόδημα αναφοράς","Reddito di rif.":"Εισόδημα αναφ.","Importo manuale:":"Χειροκίνητο ποσό:","Totale allocato":"Συνολικά κατανεμημένο","Disponibile:":"Διαθέσιμο:","Disponibile: ":"Διαθέσιμο: ","% del reddito allocato · risparmio pianificato: ":"% εισοδήματος κατανεμημένο · σχεδιασμένες αποταμιεύσεις: ","% del reddito":"% εισοδήματος","Suddivisione per categoria":"Κατανομή ανά κατηγορία","IMPORTO (":"ΠΟΣΟ (","% REDDITO":"% ΕΙΣΟΔΗΜΑ","Rispetto al piano":"vs σχέδιο","Salva suddivisione":"Αποθήκευση κατανομής","Patrimonio — ":"Περιουσία — ","vs mese scorso":"vs προηγούμενο μήνα","Modalità: ":"Λειτουργία: ","Manuale":"Χειροκίνητο","Semi-automatica ⚠️":"Ημιαυτόματο ⚠️","✏️ Inserimento":"✏️ Εισαγωγή","📅 Storico":"📅 Ιστορικό","Mese corrente — non ancora salvato":"Τρέχων μήνας — δεν έχει αποθηκευτεί","✅ Dati già salvati":"✅ Τα δεδομένα έχουν ήδη αποθηκευτεί","⚠️ Nessun dato per questo mese":"⚠️ Δεν υπάρχουν δεδομένα για αυτό τον μήνα","Totale ":"Σύνολο ","📋 Copia valori da un altro mese...":"📋 Αντιγραφή τιμών από άλλο μήνα...","Copia da":"Αντιγραφή από","Andamento patrimonio — ":"Εξέλιξη περιουσίας — ","🔄 Aggiorna":"🔄 Ενημέρωση","💾 Salva":"💾 Αποθήκευση","Salva nota":"Αποθήκευση σημείωσης","💾 Salva nota":"💾 Αποθήκευση σημείωσης","🗑 Elimina nota":"🗑 Διαγραφή σημείωσης","Nessun appunto":"Δεν υπάρχουν σημειώσεις","Nessun documento caricato":"Δεν έχουν ανέβει έγγραφα","Nessuna coordinata salvata":"Δεν υπάρχουν αποθηκευμένα τραπεζικά στοιχεία","Banca":"Τράπεζα","Intestatario":"Δικαιούχος","Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell'account.":"Ανέβαστε PDF, εικόνες, Excel ή CSV. Τα αρχεία αποθηκεύονται στα δεδομένα του λογαριασμού.","+ Carica documento":"+ Ανέβασμα εγγράφου","Apri":"Άνοιγμα","Aggiorna appunto":"Ενημέρωση σημείωσης","Salva appunto":"Αποθήκευση σημείωσης","Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)":"Προσθέστε σημείωση για αυτό το στοιχείο... (π.χ. στοιχεία λογαριασμού, προθεσμίες, στόχοι)","Formato non supportato":"Μη υποστηριζόμενη μορφή","Alert di spesa":"Ειδοποίηση δαπανών","attiva al ":"ενεργή στο ","al 100%":"στο 100%","Dati personali, account, accesso":"Προσωπικά στοιχεία, λογαριασμός, πρόσβαση","Tema, colori, stile pulsanti e widget":"Θέμα, χρώματα, στυλ κουμπιών και widget","FAQ, tutorial, sito web, contatti":"FAQ, εκπαιδευτικά, ιστότοπος, επαφές","Saldo home, valuta secondaria e visualizzazione valori.":"Υπόλοιπο αρχικής, δευτερεύον νόμισμα και εμφάνιση τιμών.","Balance home, valuta secondaria e visualizzazione valori.":"Υπόλοιπο αρχικής, δευτερεύον νόμισμα και εμφάνιση τιμών.","Mostra i valori convertiti in una seconda valuta (via API).":"Εμφάνιση τιμών μετατρεμμένων σε δεύτερο νόμισμα (μέσω API).","Mostra ":"Εμφάνιση "," in:":" σε:","sempre":"πάντα","Lunedì":"Δευτέρα","Domenica":"Κυριακή","Dati sincronizzati su cloud":"Δεδομένα συγχρονισμένα με cloud","☁️ Dati sincronizzati su cloud":"☁️ Δεδομένα συγχρονισμένα με cloud","Telefono":"Τηλέφωνο","Nascita":"Γέννηση","Città":"Πόλη","Sesso":"Φύλο","Maschile":"Αρσενικό","Femminile":"Θηλυκό","Non spec.":"Μη καθορισμένο","Cambia password":"Αλλαγή κωδικού","🔑 Cambia password":"🔑 Αλλαγή κωδικού","Esci":"Αποσύνδεση","🚪 Esci":"🚪 Αποσύνδεση","Uscire dall'account?":"Αποσύνδεση από τον λογαριασμό;","Crea account o Accedi":"Δημιουργία λογαριασμού ή Σύνδεση","🔑 Crea account o Accedi":"🔑 Δημιουργία λογαριασμού ή Σύνδεση","Profilo aggiornato":"Προφίλ ενημερώθηκε","Nuova password":"Νέος κωδικός","Minimo 6 caratteri":"Ελάχιστο 6 χαρακτήρες","Aggiorna password":"Ενημέρωση κωδικού","Data nascita":"Ημερομηνία γέννησης","Χρήστης":"Χρήστης","Email non disponibile":"Email μη διαθέσιμο","Scrivi una domanda su fAInance...":"Γράψτε μια ερώτηση στον Σύμβουλο AI...","Invia":"Αποστολή","Sto analizzando...":"Ανάλυση...","Consigli attivi":"Ενεργές συμβουλές","Priorità alta":"Υψηλή προτεραιότητα","Controlli dati":"Ελέγχοι δεδομένων","📌 Consigli e metriche":"📌 Συμβουλές και μετρικές","💬 Conversazione":"💬 Συνομιλία","Analisi automatiche":"Αυτόματες αναλύσεις","Domande su fAInance":"Ελεύθερες ερωτήσεις","💬 Inizia conversazione":"💬 Έναρξη συνομιλίας","Analizza":"Ανάλυση","Non mostrare più":"Να μη εμφανιστεί ξανά","Importazione completata!":"Εισαγωγή ολοκληρώθηκε!","importate con successo":"εισήχθησαν επιτυχώς","Operazione non reversibile. Elementi interessati:":"Μη αναστρέψιμη ενέργεια. Επηρεαζόμενα στοιχεία:","Elimina i dati per singola sezione.":"Διαγραφή δεδομένων ανά ενότητα.","La ricerca seleziona automaticamente i risultati trovati.":"Η αναζήτηση επιλέγει αυτόματα τα αποτελέσματα που βρέθηκαν.","voci":"στοιχεία","Nessun dato selezionato":"Δεν υπάρχουν επιλεγμένα δεδομένα","uscite":"έξοδα","entrate":"έσοδα","voci patrimonio":"στοιχεία περιουσίας","Consigli e metriche":"Συμβουλές και μετρικές","Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.":"Πράκτορας AI: αναλύστε τα οικονομικά σας, πρακτικές συμβουλές και chat για προσωπικά οικονομικά ή γενική οικονομία.","Analisi limitata":"Περιορισμένη ανάλυση","Analisi media":"Μεσαία ανάλυση","Analisi completa":"Πλήρης ανάλυση","🤖 Icona rapida Consulente AI":"🤖 Γρήγορη εικόνα Συμβούλου AI","Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.":"Εμφανίζει ένα κουμπί που αιωρείται κάτω δεξιά για άμεσο άνοιγμα του AI chat."});

    if(base.es)Object.assign(base.es,{"Share":"Share","Progetti, costi condivisi e saldi":"Proyectos, costes compartidos y saldos","Statistiche":"Estadísticas","Grafici, confronti e metriche":"Gráficos, comparaciones y métricas","Budget":"Presupuesto","Piano mensile e risparmio":"Plan mensual y ahorro","Obiettivi":"Objetivos","Risparmi e target":"Ahorros y objetivos","Patrimonio":"Patrimonio","Asset, conti e storico":"Activos, cuentas e historial","Notas":"Notas","Note":"Notas","Notas, documenti e coordinate":"Notas, documentos y datos bancarios","Notes, documenti e coordinate":"Notas, documentos y datos bancarios","Soglie e avvisi":"Umbrales y avisos","Consulente IA":"Asesor IA","Consulente AI":"Asesor IA","Analisi e domande":"Análisis y preguntas","Progetto":"Proyecto","Progetti":"Proyectos","Nuova spesa condivisa":"Nuevo gasto compartido","Partecipanti":"Participantes","Divisione":"División","Equa":"Equitativa","Percentuali":"Porcentajes","Importi":"Importes","Anteprima quote":"Vista previa de cuotas","Pagato da Io":"Pagado por mí","Pagato da":"Pagado por","Io":"Yo"});
    if(base.en)Object.assign(base.en,{"Progetti, costi condivisi e saldi":"Projects, shared costs and balances","Grafici, confronti e metriche":"Charts, comparisons and metrics","Piano mensile e risparmio":"Monthly plan and savings","Risparmi e target":"Savings and targets","Asset, conti e storico":"Assets, accounts and history","Notas, documenti e coordinate":"Notes, documents and bank details","Notes, documenti e coordinate":"Notes, documents and bank details","Soglie e avvisi":"Thresholds and alerts","Analisi e domande":"Analysis and questions","Progetto":"Project","Progetti":"Projects","Nuova spesa condivisa":"New shared expense","Partecipanti":"Participants","Divisione":"Split","Equa":"Equal","Percentuali":"Percentages","Importi":"Amounts","Anteprima quote":"Share preview","Pagato da Io":"Paid by me","Pagato da":"Paid by","Io":"Me"});
    if(base.en)Object.assign(base.en,{
      "Budget per area":"Budget by area",
      "Budget per categoria":"Budget by category",
      "Over-budget categories / a rischio":"Over-budget / at-risk categories",
      "di ":"of ",
      "Mesi centrati: ":"Months on target: ",
      "Dettaglio mensile":"Monthly detail",
      "Scostamento":"Deviation",
      "Variazioni per voce":"Changes per item",
      "vs mese precedente":"vs previous month",
      "Documenti":"Documents",
      "Note di testo":"Text notes",
      "Notes di testo":"Text notes",
      "Testo personalizzato":"Custom text",
      "Type soglia":"Threshold type",
      "Tipo soglia":"Threshold type",
      "Single categoria":"Single category",
      "Singola categoria":"Single category",
      "Mode attivazione":"Activation mode",
      "Modalita attivazione":"Activation mode",
      "Superamento immediato":"Immediate trigger",
      "Dopo % superamento":"After % exceeded",
      "Solo riassunto delle spese: totali mensili/annuali, saldo, categorie principali, budget e ricorrenti.":"Expense summary only: monthly/annual totals, balance, main categories, budget and recurring.",
      "Riassunto + spese raggruppate per area, utile per capire quali blocchi di spesa pesano di piu.":"Summary + expenses grouped by area, to understand which spending blocks weigh most.",
      "Tutte le transazioni essenziali: data, importo, categoria/metodo o tipo entrata e descrizione.":"All essential transactions: date, amount, category/method or income type and description.",
      "Scegli quali dati l'agente AI puo leggere quando risponde nella chat.":"Choose what data the AI agent can read when responding in chat.",
      "Consulente AI":"AI Advisor",
      "Impostazioni":"Settings",
      "Puoi chiedere analisi, consigli e chiarimenti solo su fAInance e sui dati gestiti nell’app.":"You can ask for analysis, advice and clarifications only about fAInance and the data managed in the app.",
      "Livello dati attivo:":"Active data level:",
      "Tema, sfondo, stile e colori dei pulsanti dell'app":"Theme, background, button style and app colours",
      "Sfondo":"Background",
      "Stile pulsanti":"Button style",
      "Arrotondati":"Rounded",
      "Morbidi":"Soft",
      "Squadrati":"Square",
      "Taglienti":"Sharp",
      "Widget aggiunta rapida":"Quick add widget",
      "Sottotitolo":"Subtitle",
      "Testo tasto uscita":"Expense button text",
      "Testo tasto entrata":"Income button text",
      "Sfondo widget":"Widget background",
      "Anteprima":"Preview",
      "List, riordino, default e accorpa categorie":"List, order, default and merge categories",
      "List, riordino e default dei metodi":"List, order and default of methods",
      "Gestisci le items del Assets: modifica, cancella, archivia o riordina.":"Manage asset items: edit, delete, archive or reorder.",
      "Notifiche & Promemoria":"Notifications & Reminders",
      "Promemoria inserimento spese":"Expense entry reminder",
      "Ricevere un promemoria per inserire le spese del giorno":"Receive a reminder to log daily expenses",
      "Notifiche di sistema":"System notifications",
      "Stipendio":"Salary",
      "Notifica il giorno del mese configurato":"Notification on the configured day of the month",
      "Expenses ricorrenti":"Recurring expenses",
      "Notifiche personalizzate":"Custom notifications",
      "Nessuna notifica personalizzata. Clicca '+ New' per crearne una.":"No custom notifications. Click '+ New' to create one.",
      "Importa dati":"Import data",
      "Il file deve avere le colonne:":"The file must have these columns:",
      "Trascina qui un file Excel o CSV":"Drag an Excel or CSV file here",
      "oppure clicca per sfogliare":"or click to browse",
      "Delete dati":"Delete data",
      "Metodi pagamento":"Payment methods",
      "Esporta dati":"Export data",
      "Scarica expenses e incomes in CSV o Excel":"Download expenses and income as CSV or Excel",
      "Backup JSON completo":"Full JSON backup",
      "Scarica backup":"Download backup",
      "Ripristina JSON":"Restore JSON",
      "Sito web ufficiale":"Official website",
      "Prossimamente":"Coming soon",
      "Video guide e walkthrough":"Video guides and walkthrough",
      "Come funziona la rateizzazione?":"How does instalment splitting work?",
      "Come funziona il Assets?":"How does Assets work?",
      "I dati sono al sicuro?":"Is my data safe?",
      "Come cambio valuta?":"How do I change currency?",
      "Come funzionano le categorie?":"How do categories work?",
      "Aggiornamenti":"Updates",
      "Version installata: ":"Installed version: ",
      "Versione installata: ":"Installed version: ",
      "Controlla aggiornamenti":"Check for updates",
      "Piano attuale":"Current plan",
      "Passa a Pro":"Upgrade to Pro",
      "Vota su Play Store":"Rate on Play Store",
      "Se ti piace l'app, lasciaci una recensione!":"If you like the app, leave us a review!",
      "INFORMAZIONI TECNICHE":"TECHNICAL INFO"
    });
    if(base.es)Object.assign(base.es,{
      "Budget per area":"Presupuesto por area",
      "Budget per categoria":"Presupuesto por categoria",
      "Dettaglio mensile":"Detalle mensual",
      "Scostamento":"Desviacion",
      "Mesi centrati: ":"Meses en objetivo: ",
      "Variazioni per voce":"Cambios por elemento",
      "vs mese precedente":"vs mes anterior",
      "Documenti":"Documentos",
      "Note di testo":"Notas de texto",
      "Testo personalizzato":"Texto personalizado",
      "Tipo soglia":"Tipo de umbral",
      "Singola categoria":"Categoria individual",
      "Superamento immediato":"Superacion inmediata",
      "Dopo % superamento":"Despues de % superado",
      "Consulente AI":"Consultor IA",
      "Sfondo":"Fondo",
      "Stile pulsanti":"Estilo botones",
      "Arrotondati":"Redondeados",
      "Morbidi":"Suaves",
      "Squadrati":"Cuadrados",
      "Taglienti":"Afilados",
      "Widget aggiunta rapida":"Widget adicion rapida",
      "Sottotitolo":"Subtitulo",
      "Testo tasto uscita":"Texto boton gasto",
      "Testo tasto entrata":"Texto boton ingreso",
      "Sfondo widget":"Fondo widget",
      "Anteprima":"Vista previa",
      "Notifiche & Promemoria":"Notificaciones y recordatorios",
      "Promemoria inserimento spese":"Recordatorio insercion gastos",
      "Notifiche di sistema":"Notificaciones sistema",
      "Stipendio":"Salario",
      "Notifiche personalizzate":"Notificaciones personalizadas",
      "Importa dati":"Importar datos",
      "Trascina qui un file Excel o CSV":"Arrastra un archivo Excel o CSV aqui",
      "oppure clicca per sfogliare":"o haz clic para explorar",
      "Delete dati":"Eliminar datos",
      "Metodi pagamento":"Metodos de pago",
      "Esporta dati":"Exportar datos",
      "Backup JSON completo":"Copia de seguridad JSON",
      "Scarica backup":"Descargar copia de seguridad",
      "Ripristina JSON":"Restaurar JSON",
      "Sito web ufficiale":"Sitio web oficial",
      "Prossimamente":"Proximamente",
      "Come funziona la rateizzazione?":"Como funciona la cuotas?",
      "Come funziona il Assets?":"Como funciona el Patrimonio?",
      "I dati sono al sicuro?":"Estan seguros los datos?",
      "Come cambio valuta?":"Como cambio la moneda?",
      "Aggiornamenti":"Actualizaciones",
      "Controlla aggiornamenti":"Verificar actualizaciones",
      "Piano attuale":"Plan actual",
      "Passa a Pro":"Pasar a Pro",
      "Vota su Play Store":"Valorar en Play Store",
      "INFORMAZIONI TECNICHE":"INFORMACION TECNICA"
    });
    if(base.fr)Object.assign(base.fr,{
      "Budget per area":"Budget par zone",
      "Budget per categoria":"Budget par categorie",
      "Dettaglio mensile":"Detail mensuel",
      "Scostamento":"Ecart",
      "Mesi centrati: ":"Mois dans l objectif: ",
      "Variazioni per voce":"Variations par element",
      "vs mese precedente":"vs mois precedent",
      "Documenti":"Documents",
      "Note di testo":"Notes de texte",
      "Testo personalizzato":"Texte personnalise",
      "Tipo soglia":"Type de seuil",
      "Singola categoria":"Categorie unique",
      "Superamento immediato":"Depassement immediat",
      "Dopo % superamento":"Apres % depasse",
      "Consulente AI":"Conseiller IA",
      "Sfondo":"Arriere-plan",
      "Stile pulsanti":"Style boutons",
      "Arrotondati":"Arrondis",
      "Morbidi":"Doux",
      "Squadrati":"Carres",
      "Taglienti":"Pointus",
      "Widget aggiunta rapida":"Widget ajout rapide",
      "Sottotitolo":"Sous-titre",
      "Testo tasto uscita":"Texte bouton depense",
      "Testo tasto entrata":"Texte bouton revenu",
      "Sfondo widget":"Fond du widget",
      "Anteprima":"Apercu",
      "Notifiche & Promemoria":"Notifications et rappels",
      "Promemoria inserimento spese":"Rappel saisie depenses",
      "Notifiche di sistema":"Notifications systeme",
      "Stipendio":"Salaire",
      "Notifiche personalizzate":"Notifications personnalisees",
      "Importa dati":"Importer donnees",
      "Trascina qui un file Excel o CSV":"Faites glisser un fichier Excel ou CSV ici",
      "oppure clicca per sfogliare":"ou cliquez pour parcourir",
      "Delete dati":"Supprimer donnees",
      "Metodi pagamento":"Methodes de paiement",
      "Esporta dati":"Exporter donnees",
      "Backup JSON completo":"Sauvegarde JSON complete",
      "Scarica backup":"Telecharger la sauvegarde",
      "Ripristina JSON":"Restaurer JSON",
      "Sito web ufficiale":"Site officiel",
      "Prossimamente":"Bientot",
      "Come funziona la rateizzazione?":"Comment fonctionne l echelonnement?",
      "Come funziona il Assets?":"Comment fonctionne le Patrimoine?",
      "I dati sono al sicuro?":"Les donnees sont-elles securisees?",
      "Come cambio valuta?":"Comment changer de devise?",
      "Aggiornamenti":"Mises a jour",
      "Controlla aggiornamenti":"Verifier les mises a jour",
      "Piano attuale":"Plan actuel",
      "Passa a Pro":"Passer a Pro",
      "Vota su Play Store":"Noter sur Play Store",
      "INFORMAZIONI TECNICHE":"INFORMATIONS TECHNIQUES"
    });
    if(base.de)Object.assign(base.de,{
      "Budget per area":"Budget nach Bereich",
      "Budget per categoria":"Budget nach Kategorie",
      "Dettaglio mensile":"Monatliche Details",
      "Scostamento":"Abweichung",
      "Mesi centrati: ":"Monate im Ziel: ",
      "Variazioni per voce":"Anderungen pro Position",
      "vs mese precedente":"vs Vormonat",
      "Documenti":"Dokumente",
      "Note di testo":"Textnotizen",
      "Testo personalizzato":"Benutzerdefinierter Text",
      "Tipo soglia":"Schwellenwerttyp",
      "Singola categoria":"Einzelne Kategorie",
      "Superamento immediato":"Sofortige Uberschreitung",
      "Dopo % superamento":"Nach % uberschritten",
      "Consulente AI":"KI-Berater",
      "Sfondo":"Hintergrund",
      "Stile pulsanti":"Schaltflachenstil",
      "Arrotondati":"Abgerundet",
      "Morbidi":"Weich",
      "Squadrati":"Eckig",
      "Taglienti":"Scharf",
      "Widget aggiunta rapida":"Schnellhinzufuge-Widget",
      "Sottotitolo":"Untertitel",
      "Testo tasto uscita":"Ausgaben-Schaltflachentext",
      "Testo tasto entrata":"Einnahmen-Schaltflachentext",
      "Sfondo widget":"Widget-Hintergrund",
      "Anteprima":"Vorschau",
      "Notifiche & Promemoria":"Benachrichtigungen und Erinnerungen",
      "Promemoria inserimento spese":"Erinnerung Ausgabeneingabe",
      "Notifiche di sistema":"Systembenachrichtigungen",
      "Stipendio":"Gehalt",
      "Notifiche personalizzate":"Benutzerdefinierte Benachrichtigungen",
      "Importa dati":"Daten importieren",
      "Trascina qui un file Excel o CSV":"Excel- oder CSV-Datei hier ablegen",
      "oppure clicca per sfogliare":"oder klicken zum Durchsuchen",
      "Delete dati":"Daten loschen",
      "Metodi pagamento":"Zahlungsmethoden",
      "Esporta dati":"Daten exportieren",
      "Backup JSON completo":"Vollstandiges JSON-Backup",
      "Scarica backup":"Backup herunterladen",
      "Ripristina JSON":"JSON wiederherstellen",
      "Sito web ufficiale":"Offizielle Website",
      "Prossimamente":"Demnachst",
      "Come funziona la rateizzazione?":"Wie funktioniert die Ratenzahlung?",
      "Come funziona il Assets?":"Wie funktioniert das Vermogen?",
      "I dati sono al sicuro?":"Sind die Daten sicher?",
      "Come cambio valuta?":"Wie andere ich die Wahrung?",
      "Aggiornamenti":"Updates",
      "Controlla aggiornamenti":"Updates prufen",
      "Piano attuale":"Aktueller Plan",
      "Passa a Pro":"Zu Pro wechseln",
      "Vota su Play Store":"Im Play Store bewerten",
      "INFORMAZIONI TECNICHE":"TECHNISCHE INFORMATIONEN"
    });
    if(base.pt)Object.assign(base.pt,{
      "Budget per area":"Orcamento por area",
      "Budget per categoria":"Orcamento por categoria",
      "Dettaglio mensile":"Detalhe mensal",
      "Scostamento":"Desvio",
      "Mesi centrati: ":"Meses no objetivo: ",
      "Variazioni per voce":"Variacoes por item",
      "vs mese precedente":"vs mes anterior",
      "Documenti":"Documentos",
      "Note di testo":"Notas de texto",
      "Testo personalizzato":"Texto personalizado",
      "Tipo soglia":"Tipo de limite",
      "Singola categoria":"Categoria individual",
      "Superamento immediato":"Superacao imediata",
      "Dopo % superamento":"Apos % superado",
      "Consulente AI":"Consultor IA",
      "Sfondo":"Fundo",
      "Stile pulsanti":"Estilo botoes",
      "Arrotondati":"Arredondados",
      "Morbidi":"Macios",
      "Squadrati":"Quadrados",
      "Taglienti":"Afiados",
      "Widget aggiunta rapida":"Widget adicao rapida",
      "Sottotitolo":"Subtitulo",
      "Testo tasto uscita":"Texto botao despesa",
      "Testo tasto entrata":"Texto botao receita",
      "Sfondo widget":"Fundo do widget",
      "Anteprima":"Pre-visualizacao",
      "Notifiche & Promemoria":"Notificacoes e lembretes",
      "Promemoria inserimento spese":"Lembrete insercao despesas",
      "Notifiche di sistema":"Notificacoes sistema",
      "Stipendio":"Salario",
      "Notifiche personalizzate":"Notificacoes personalizadas",
      "Importa dati":"Importar dados",
      "Trascina qui un file Excel o CSV":"Arraste um ficheiro Excel ou CSV aqui",
      "oppure clicca per sfogliare":"ou clique para procurar",
      "Delete dati":"Eliminar dados",
      "Metodi pagamento":"Metodos de pagamento",
      "Esporta dati":"Exportar dados",
      "Backup JSON completo":"Backup JSON completo",
      "Scarica backup":"Transferir backup",
      "Ripristina JSON":"Restaurar JSON",
      "Sito web ufficiale":"Site oficial",
      "Prossimamente":"Em breve",
      "Come funziona la rateizzazione?":"Como funciona o parcelamento?",
      "Come funziona il Assets?":"Como funciona o Patrimonio?",
      "I dati sono al sicuro?":"Os dados estao seguros?",
      "Come cambio valuta?":"Como mudo a moeda?",
      "Aggiornamenti":"Atualizacoes",
      "Controlla aggiornamenti":"Verificar atualizacoes",
      "Piano attuale":"Plano atual",
      "Passa a Pro":"Mudar para Pro",
      "Vota su Play Store":"Avaliar na Play Store",
      "INFORMAZIONI TECNICHE":"INFORMACOES TECNICAS"
    });
    if(base.pl)Object.assign(base.pl,{
      "Budget per area":"Budzet wedlug obszaru",
      "Budget per categoria":"Budzet wedlug kategorii",
      "Dettaglio mensile":"Szczegoly miesięczne",
      "Scostamento":"Odchylenie",
      "Mesi centrati: ":"Miesiace w celu: ",
      "Variazioni per voce":"Zmiany na pozycje",
      "vs mese precedente":"vs poprzedni miesiac",
      "Documenti":"Dokumenty",
      "Note di testo":"Notatki tekstowe",
      "Testo personalizzato":"Tekst niestandardowy",
      "Tipo soglia":"Typ progu",
      "Singola categoria":"Pojedyncza kategoria",
      "Superamento immediato":"Natychmiastowe przekroczenie",
      "Dopo % superamento":"Po % przekroczeniu",
      "Consulente AI":"Doradca AI",
      "Sfondo":"Tlo",
      "Stile pulsanti":"Styl przyciskow",
      "Arrotondati":"Zaokraglone",
      "Morbidi":"Miekkie",
      "Squadrati":"Kwadratowe",
      "Taglienti":"Ostre",
      "Widget aggiunta rapida":"Widget szybkiego dodawania",
      "Sottotitolo":"Podtytul",
      "Testo tasto uscita":"Tekst przycisku wydatku",
      "Testo tasto entrata":"Tekst przycisku przychodu",
      "Sfondo widget":"Tlo widgetu",
      "Anteprima":"Podglad",
      "Notifiche & Promemoria":"Powiadomienia i przypomnienia",
      "Promemoria inserimento spese":"Przypomnienie wpisania wydatkow",
      "Notifiche di sistema":"Powiadomienia systemowe",
      "Stipendio":"Wynagrodzenie",
      "Notifiche personalizzate":"Niestandardowe powiadomienia",
      "Importa dati":"Importuj dane",
      "Trascina qui un file Excel o CSV":"Przeciagnij plik Excel lub CSV tutaj",
      "oppure clicca per sfogliare":"lub kliknij aby przegladac",
      "Delete dati":"Usun dane",
      "Metodi pagamento":"Metody platnosci",
      "Esporta dati":"Eksportuj dane",
      "Backup JSON completo":"Pelna kopia JSON",
      "Scarica backup":"Pobierz kopie",
      "Ripristina JSON":"Przywroc JSON",
      "Sito web ufficiale":"Oficjalna strona",
      "Prossimamente":"Wkrotce",
      "Come funziona la rateizzazione?":"Jak dziala ratalnosc?",
      "Come funziona il Assets?":"Jak dziala Majatek?",
      "I dati sono al sicuro?":"Czy dane sa bezpieczne?",
      "Come cambio valuta?":"Jak zmienic walute?",
      "Aggiornamenti":"Aktualizacje",
      "Controlla aggiornamenti":"Sprawdz aktualizacje",
      "Piano attuale":"Aktualny plan",
      "Passa a Pro":"Przejdz na Pro",
      "Vota su Play Store":"Ocen w Play Store",
      "INFORMAZIONI TECNICHE":"INFORMACJE TECHNICZNE"
    });
    if(base.nl)Object.assign(base.nl,{
      "Budget per area":"Budget per gebied",
      "Budget per categoria":"Budget per categorie",
      "Dettaglio mensile":"Maandelijks detail",
      "Scostamento":"Afwijking",
      "Mesi centrati: ":"Maanden op doel: ",
      "Variazioni per voce":"Wijzigingen per item",
      "vs mese precedente":"vs vorige maand",
      "Documenti":"Documenten",
      "Note di testo":"Tekstnotities",
      "Testo personalizzato":"Aangepaste tekst",
      "Tipo soglia":"Type drempelwaarde",
      "Singola categoria":"Enkele categorie",
      "Superamento immediato":"Onmiddellijke overschrijding",
      "Dopo % superamento":"Na % overschreden",
      "Consulente AI":"AI-adviseur",
      "Sfondo":"Achtergrond",
      "Stile pulsanti":"Knopstijl",
      "Arrotondati":"Afgerond",
      "Morbidi":"Zacht",
      "Squadrati":"Vierkant",
      "Taglienti":"Scherp",
      "Widget aggiunta rapida":"Sneltoevoeg-widget",
      "Sottotitolo":"Ondertitel",
      "Testo tasto uscita":"Tekst uitgavenknop",
      "Testo tasto entrata":"Tekst inkomstenknop",
      "Sfondo widget":"Widget-achtergrond",
      "Anteprima":"Voorbeeld",
      "Notifiche & Promemoria":"Meldingen en herinneringen",
      "Promemoria inserimento spese":"Herinnering uitgaven invoeren",
      "Notifiche di sistema":"Systeemmeldingen",
      "Stipendio":"Salaris",
      "Notifiche personalizzate":"Aangepaste meldingen",
      "Importa dati":"Gegevens importeren",
      "Trascina qui un file Excel o CSV":"Sleep een Excel- of CSV-bestand hierheen",
      "oppure clicca per sfogliare":"of klik om te bladeren",
      "Delete dati":"Gegevens verwijderen",
      "Metodi pagamento":"Betaalmethoden",
      "Esporta dati":"Gegevens exporteren",
      "Backup JSON completo":"Volledige JSON-back-up",
      "Scarica backup":"Back-up downloaden",
      "Ripristina JSON":"JSON herstellen",
      "Sito web ufficiale":"Officiele website",
      "Prossimamente":"Binnenkort",
      "Come funziona la rateizzazione?":"Hoe werkt de gespreide betaling?",
      "Come funziona il Assets?":"Hoe werkt het Vermogen?",
      "I dati sono al sicuro?":"Zijn de gegevens veilig?",
      "Come cambio valuta?":"Hoe verander ik de valuta?",
      "Aggiornamenti":"Updates",
      "Controlla aggiornamenti":"Updates controleren",
      "Piano attuale":"Huidig abonnement",
      "Passa a Pro":"Upgraden naar Pro",
      "Vota su Play Store":"Beoordelen in Play Store",
      "INFORMAZIONI TECNICHE":"TECHNISCHE INFORMATIE"
    });
    if(base.ro)Object.assign(base.ro,{
      "Budget per area":"Buget pe zona",
      "Budget per categoria":"Buget pe categorie",
      "Dettaglio mensile":"Detaliu lunar",
      "Scostamento":"Abatere",
      "Mesi centrati: ":"Luni la obiectiv: ",
      "Variazioni per voce":"Variatii pe element",
      "vs mese precedente":"vs luna anterioara",
      "Documenti":"Documente",
      "Note di testo":"Note text",
      "Testo personalizzato":"Text personalizat",
      "Tipo soglia":"Tip prag",
      "Singola categoria":"Categorie unica",
      "Superamento immediato":"Depasire imediata",
      "Dopo % superamento":"Dupa % depasit",
      "Consulente AI":"Consultant AI",
      "Sfondo":"Fundal",
      "Stile pulsanti":"Stil butoane",
      "Arrotondati":"Rotunjite",
      "Morbidi":"Moi",
      "Squadrati":"Patrate",
      "Taglienti":"Ascutite",
      "Widget aggiunta rapida":"Widget adaugare rapida",
      "Sottotitolo":"Subtitlu",
      "Testo tasto uscita":"Text buton cheltuiala",
      "Testo tasto entrata":"Text buton venit",
      "Sfondo widget":"Fundal widget",
      "Anteprima":"Previzualizare",
      "Notifiche & Promemoria":"Notificari si mementouri",
      "Promemoria inserimento spese":"Memento introducere cheltuieli",
      "Notifiche di sistema":"Notificari sistem",
      "Stipendio":"Salariu",
      "Notifiche personalizzate":"Notificari personalizate",
      "Importa dati":"Importati date",
      "Trascina qui un file Excel o CSV":"Trageti un fisier Excel sau CSV aici",
      "oppure clicca per sfogliare":"sau faceti clic pentru a rasfoisi",
      "Delete dati":"Stergeti date",
      "Metodi pagamento":"Metode de plata",
      "Esporta dati":"Exportati date",
      "Backup JSON completo":"Backup JSON complet",
      "Scarica backup":"Descarcati backup",
      "Ripristina JSON":"Restaurati JSON",
      "Sito web ufficiale":"Site oficial",
      "Prossimamente":"In curand",
      "Come funziona la rateizzazione?":"Cum functioneaza ratele?",
      "Come funziona il Assets?":"Cum functioneaza Patrimoniul?",
      "I dati sono al sicuro?":"Datele sunt in siguranta?",
      "Come cambio valuta?":"Cum schimb moneda?",
      "Aggiornamenti":"Actualizari",
      "Controlla aggiornamenti":"Verificati actualizarile",
      "Piano attuale":"Plan curent",
      "Passa a Pro":"Treci la Pro",
      "Vota su Play Store":"Voteaza pe Play Store",
      "INFORMAZIONI TECNICHE":"INFORMATII TEHNICE"
    });
    if(base.el)Object.assign(base.el,{
      "Budget per area":"Προϋπολογισμος ανα περιοχη",
      "Budget per categoria":"Προϋπολογισμος ανα κατηγορια",
      "Dettaglio mensile":"Μηνιαια λεπτομερεια",
      "Scostamento":"Αποκλιση",
      "Mesi centrati: ":"Μηνες στοχος: ",
      "Variazioni per voce":"Αλλαγες ανα στοιχειο",
      "vs mese precedente":"vs προηγουμενο μηνα",
      "Documenti":"Εγγραφα",
      "Note di testo":"Σημειωσεις κειμενου",
      "Testo personalizzato":"Προσαρμοσμενο κειμενο",
      "Tipo soglia":"Τυπος οριου",
      "Singola categoria":"Μεμονωμενη κατηγορια",
      "Superamento immediato":"Αμεση υπερβαση",
      "Dopo % superamento":"Μετα % υπερβαση",
      "Consulente AI":"Συμβουλος AI",
      "Sfondo":"Φοντο",
      "Stile pulsanti":"Στυλ κουμπιων",
      "Arrotondati":"Στρογγυλα",
      "Morbidi":"Απαλα",
      "Squadrati":"Τετραγωνα",
      "Taglienti":"Αιχμηρα",
      "Widget aggiunta rapida":"Widget γρηγορης προσθηκης",
      "Sottotitolo":"Υποτιτλος",
      "Testo tasto uscita":"Κειμενο κουμπιου εξοδου",
      "Testo tasto entrata":"Κειμενο κουμπιου εσοδου",
      "Sfondo widget":"Φοντο widget",
      "Anteprima":"Προεπισκοπηση",
      "Notifiche & Promemoria":"Ειδοποιησεις και υπενθυμισεις",
      "Promemoria inserimento spese":"Υπενθυμιση εισαγωγης εξοδων",
      "Notifiche di sistema":"Ειδοποιησεις συστηματος",
      "Stipendio":"Μισθος",
      "Notifiche personalizzate":"Προσαρμοσμενες ειδοποιησεις",
      "Importa dati":"Εισαγωγη δεδομενων",
      "Trascina qui un file Excel o CSV":"Συρετε αρχειο Excel η CSV εδω",
      "oppure clicca per sfogliare":"η κανετε κλικ για αναζητηση",
      "Delete dati":"Διαγραφη δεδομενων",
      "Metodi pagamento":"Μεθοδοι πληρωμης",
      "Esporta dati":"Εξαγωγη δεδομενων",
      "Backup JSON completo":"Πληρες αντιγραφο JSON",
      "Scarica backup":"Ληψη αντιγραφου",
      "Ripristina JSON":"Επαναφορα JSON",
      "Sito web ufficiale":"Επισημος ιστοτοπος",
      "Prossimamente":"Συντομα",
      "Come funziona la rateizzazione?":"Πως λειτουργει η δοση;",
      "Come funziona il Assets?":"Πως λειτουργει η Περιουσια;",
      "I dati sono al sicuro?":"Ειναι ασφαλη τα δεδομενα;",
      "Come cambio valuta?":"Πως αλλαζω νομισμα;",
      "Aggiornamenti":"Ενημερωσεις",
      "Controlla aggiornamenti":"Ελεγχος ενημερωσεων",
      "Piano attuale":"Τρεχον πλανο",
      "Passa a Pro":"Αναβαθμιση σε Pro",
      "Vota su Play Store":"Αξιολογηση στο Play Store",
      "INFORMAZIONI TECNICHE":"ΤΕΧΝΙΚΕΣ ΠΛΗΡΟΦΟΡΙΕΣ"
    });
    // Translation guarantees for all system languages: every visible fixed label added in recent sections must be available in every app language.
    var universal={
      en:{"Share":"Share","Progetti, costi condivisi e saldi":"Projects, shared costs and balances","Grafici, confronti e metriche":"Charts, comparisons and metrics","Piano mensile e risparmio":"Monthly plan and savings","Risparmi e target":"Savings and targets","Asset, conti e storico":"Assets, accounts and history","Appunti":"Notes","Note, documenti e coordinate":"Notes, documents and bank details","Soglie e avvisi":"Thresholds and alerts","Consulente AI":"AI Advisor","Consulente IA":"AI Advisor","Analisi e domande":"Analysis and questions","Progetto":"Project","Progetti":"Projects","Nuova spesa condivisa":"New shared expense","Partecipanti":"Participants","Divisione":"Split","Equa":"Equal","Percentuali":"Percentages","Importi":"Amounts","Anteprima quote":"Share preview","Pagato da":"Paid by","Pagato da Io":"Paid by me","Io":"Me","Chi deve soldi a chi":"Who owes whom","Registra nello storico la mia quota Share":"Record my Share amount in history","Categoria Share nello storico":"Share category in history","Aggiunta vocale":"Voice entry","Sto ascoltando...":"Listening...","Riprova ascolto":"Retry listening","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"Recording starts automatically when you open this screen. Use the button only to retry.","Oppure scrivi qui il comando vocale...":"Or type the voice command here...","Analizza comando":"Analyze command","Uscita riconosciuta":"Expense recognized","Entrata riconosciuta":"Income recognized","Rateizzazione":"Instalment","Voce":"Voice","Risparmio potenziale":"Potential savings","Consigli attivi":"Active tips","Priorità alta":"High priority","Controlli dati":"Data checks","Inizia conversazione":"Start conversation","Scrivi una domanda su fAInance...":"Write a question about fAInance...","Sto analizzando...":"Analyzing...","Non mostrare più":"Don't show again","Analizza":"Analyze","Rispondi nella lingua usata dall'utente":"Reply in the user's language"},
      es:{"Share":"Share","Progetti, costi condivisi e saldi":"Proyectos, costes compartidos y saldos","Grafici, confronti e metriche":"Gráficos, comparaciones y métricas","Piano mensile e risparmio":"Plan mensual y ahorro","Risparmi e target":"Ahorros y objetivos","Asset, conti e storico":"Activos, cuentas e historial","Appunti":"Notas","Note, documenti e coordinate":"Notas, documentos y datos bancarios","Soglie e avvisi":"Umbrales y avisos","Consulente AI":"Asesor IA","Consulente IA":"Asesor IA","Analisi e domande":"Análisis y preguntas","Progetto":"Proyecto","Progetti":"Proyectos","Nuova spesa condivisa":"Nuevo gasto compartido","Partecipanti":"Participantes","Divisione":"División","Equa":"Equitativa","Percentuali":"Porcentajes","Importi":"Importes","Anteprima quote":"Vista previa de cuotas","Pagato da":"Pagado por","Pagato da Io":"Pagado por mí","Io":"Yo","Chi deve soldi a chi":"Quién debe dinero a quién","Registra nello storico la mia quota Share":"Registrar mi cuota Share en el historial","Categoria Share nello storico":"Categoría Share en el historial","Aggiunta vocale":"Añadido por voz","Sto ascoltando...":"Estoy escuchando...","Riprova ascolto":"Reintentar escucha","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"La grabación empieza automáticamente al abrir esta pantalla. Usa el botón solo si quieres intentarlo de nuevo.","Oppure scrivi qui il comando vocale...":"O escribe aquí el comando de voz...","Analizza comando":"Analizar comando","Uscita riconosciuta":"Gasto reconocido","Entrata riconosciuta":"Ingreso reconocido","Rateizzazione":"División","Voce":"Voz","Risparmio potenziale":"Ahorro potencial","Consigli attivi":"Consejos activos","Priorità alta":"Prioridad alta","Controlli dati":"Controles de datos","Inizia conversazione":"Iniciar conversación","Scrivi una domanda su fAInance...":"Escribe una pregunta sobre fAInance...","Sto analizzando...":"Estoy analizando...","Non mostrare più":"No mostrar más","Analizza":"Analizar","Rispondi nella lingua usata dall'utente":"Responde en el idioma usado por el usuario"},
      fr:{"Share":"Share","Progetti, costi condivisi e saldi":"Projets, coûts partagés et soldes","Grafici, confronti e metriche":"Graphiques, comparaisons et métriques","Piano mensile e risparmio":"Plan mensuel et épargne","Risparmi e target":"Épargne et objectifs","Asset, conti e storico":"Actifs, comptes et historique","Appunti":"Notes","Note, documenti e coordinate":"Notes, documents et coordonnées bancaires","Soglie e avvisi":"Seuils et alertes","Consulente AI":"Conseiller IA","Consulente IA":"Conseiller IA","Analisi e domande":"Analyses et questions","Progetto":"Projet","Progetti":"Projets","Nuova spesa condivisa":"Nouvelle dépense partagée","Partecipanti":"Participants","Divisione":"Répartition","Equa":"Égale","Percentuali":"Pourcentages","Importi":"Montants","Anteprima quote":"Aperçu des parts","Pagato da":"Payé par","Pagato da Io":"Payé par moi","Io":"Moi","Chi deve soldi a chi":"Qui doit de l'argent à qui","Registra nello storico la mia quota Share":"Enregistrer ma part Share dans l’historique","Categoria Share nello storico":"Catégorie Share dans l’historique","Aggiunta vocale":"Ajout vocal","Sto ascoltando...":"J’écoute...","Riprova ascolto":"Réessayer l’écoute","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"L’enregistrement démarre automatiquement à l’ouverture de cet écran. Utilisez le bouton seulement pour réessayer.","Oppure scrivi qui il comando vocale...":"Ou écrivez ici la commande vocale...","Analizza comando":"Analyser la commande","Uscita riconosciuta":"Dépense reconnue","Entrata riconosciuta":"Revenu reconnu","Rateizzazione":"Échelonnement","Voce":"Voix","Risparmio potenziale":"Épargne potentielle","Consigli attivi":"Conseils actifs","Priorità alta":"Priorité élevée","Controlli dati":"Contrôles des données","Inizia conversazione":"Démarrer la conversation","Scrivi una domanda su fAInance...":"Écrivez une question sur fAInance...","Sto analizzando...":"Analyse en cours...","Non mostrare più":"Ne plus afficher","Analizza":"Analyser","Rispondi nella lingua usata dall'utente":"Réponds dans la langue utilisée par l'utilisateur"},
      de:{"Share":"Share","Progetti, costi condivisi e saldi":"Projekte, geteilte Kosten und Salden","Grafici, confronti e metriche":"Diagramme, Vergleiche und Kennzahlen","Piano mensile e risparmio":"Monatsplan und Sparen","Risparmi e target":"Ersparnisse und Ziele","Asset, conti e storico":"Vermögen, Konten und Verlauf","Appunti":"Notizen","Note, documenti e coordinate":"Notizen, Dokumente und Bankdaten","Soglie e avvisi":"Grenzwerte und Warnungen","Consulente AI":"KI-Berater","Consulente IA":"KI-Berater","Analisi e domande":"Analysen und Fragen","Progetto":"Projekt","Progetti":"Projekte","Nuova spesa condivisa":"Neue geteilte Ausgabe","Partecipanti":"Teilnehmer","Divisione":"Aufteilung","Equa":"Gleich","Percentuali":"Prozentsätze","Importi":"Beträge","Anteprima quote":"Anteilvorschau","Pagato da":"Bezahlt von","Pagato da Io":"Von mir bezahlt","Io":"Ich","Chi deve soldi a chi":"Wer wem Geld schuldet","Registra nello storico la mia quota Share":"Meinen Share-Anteil im Verlauf erfassen","Categoria Share nello storico":"Share-Kategorie im Verlauf","Aggiunta vocale":"Spracheingabe","Sto ascoltando...":"Ich höre zu...","Riprova ascolto":"Erneut anhören","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"Die Aufnahme startet automatisch beim Öffnen dieses Bildschirms. Verwende die Taste nur zum Wiederholen.","Oppure scrivi qui il comando vocale...":"Oder Sprachbefehl hier eingeben...","Analizza comando":"Befehl analysieren","Uscita riconosciuta":"Ausgabe erkannt","Entrata riconosciuta":"Einnahme erkannt","Rateizzazione":"Ratenaufteilung","Voce":"Stimme","Risparmio potenziale":"Mögliches Sparen","Consigli attivi":"Aktive Tipps","Priorità alta":"Hohe Priorität","Controlli dati":"Datenprüfungen","Inizia conversazione":"Gespräch starten","Scrivi una domanda su fAInance...":"Schreibe eine Frage zu fAInance...","Sto analizzando...":"Analysiere...","Non mostrare più":"Nicht mehr anzeigen","Analizza":"Analysieren","Rispondi nella lingua usata dall'utente":"Antworte in der Sprache des Benutzers"},
      pt:{"Share":"Share","Progetti, costi condivisi e saldi":"Projetos, custos partilhados e saldos","Grafici, confronti e metriche":"Gráficos, comparações e métricas","Piano mensile e risparmio":"Plano mensal e poupança","Risparmi e target":"Poupanças e objetivos","Asset, conti e storico":"Ativos, contas e histórico","Appunti":"Notas","Note, documenti e coordinate":"Notas, documentos e dados bancários","Soglie e avvisi":"Limites e avisos","Consulente AI":"Consultor IA","Consulente IA":"Consultor IA","Analisi e domande":"Análises e perguntas","Progetto":"Projeto","Progetti":"Projetos","Nuova spesa condivisa":"Nova despesa partilhada","Partecipanti":"Participantes","Divisione":"Divisão","Equa":"Igual","Percentuali":"Percentagens","Importi":"Valores","Anteprima quote":"Pré-visualização das quotas","Pagato da":"Pago por","Pagato da Io":"Pago por mim","Io":"Eu","Chi deve soldi a chi":"Quem deve dinheiro a quem","Registra nello storico la mia quota Share":"Registar a minha quota Share no histórico","Categoria Share nello storico":"Categoria Share no histórico","Aggiunta vocale":"Entrada por voz","Sto ascoltando...":"A ouvir...","Riprova ascolto":"Tentar ouvir novamente","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"A gravação começa automaticamente ao abrir este ecrã. Use o botão apenas para tentar novamente.","Oppure scrivi qui il comando vocale...":"Ou escreva aqui o comando de voz...","Analizza comando":"Analisar comando","Uscita riconosciuta":"Despesa reconhecida","Entrata riconosciuta":"Receita reconhecida","Rateizzazione":"Parcelamento","Voce":"Voz","Risparmio potenziale":"Poupança potencial","Consigli attivi":"Conselhos ativos","Priorità alta":"Prioridade alta","Controlli dati":"Controlos de dados","Inizia conversazione":"Iniciar conversa","Scrivi una domanda su fAInance...":"Escreva uma pergunta sobre fAInance...","Sto analizzando...":"A analisar...","Non mostrare più":"Não mostrar mais","Analizza":"Analisar","Rispondi nella lingua usata dall'utente":"Responde no idioma usado pelo utilizador"},
      pl:{"Share":"Share","Progetti, costi condivisi e saldi":"Projekty, wspólne koszty i salda","Grafici, confronti e metriche":"Wykresy, porównania i metryki","Piano mensile e risparmio":"Plan miesięczny i oszczędności","Risparmi e target":"Oszczędności i cele","Asset, conti e storico":"Aktywa, konta i historia","Appunti":"Notatki","Note, documenti e coordinate":"Notatki, dokumenty i dane bankowe","Soglie e avvisi":"Progi i alerty","Consulente AI":"Doradca AI","Consulente IA":"Doradca AI","Analisi e domande":"Analizy i pytania","Progetto":"Projekt","Progetti":"Projekty","Nuova spesa condivisa":"Nowy wspólny wydatek","Partecipanti":"Uczestnicy","Divisione":"Podział","Equa":"Równo","Percentuali":"Procenty","Importi":"Kwoty","Anteprima quote":"Podgląd udziałów","Pagato da":"Zapłacone przez","Pagato da Io":"Zapłacone przeze mnie","Io":"Ja","Chi deve soldi a chi":"Kto komu jest winien","Registra nello storico la mia quota Share":"Zapisz mój udział Share w historii","Categoria Share nello storico":"Kategoria Share w historii","Aggiunta vocale":"Dodawanie głosowe","Sto ascoltando...":"Słucham...","Riprova ascolto":"Spróbuj ponownie","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"Nagrywanie zaczyna się automatycznie po otwarciu tego ekranu. Użyj przycisku tylko, aby spróbować ponownie.","Oppure scrivi qui il comando vocale...":"Albo wpisz tutaj polecenie głosowe...","Analizza comando":"Analizuj polecenie","Uscita riconosciuta":"Wydatek rozpoznany","Entrata riconosciuta":"Przychód rozpoznany","Rateizzazione":"Podział na raty","Voce":"Głos","Risparmio potenziale":"Potencjalne oszczędności","Consigli attivi":"Aktywne porady","Priorità alta":"Wysoki priorytet","Controlli dati":"Kontrole danych","Inizia conversazione":"Rozpocznij rozmowę","Scrivi una domanda su fAInance...":"Napisz pytanie o fAInance...","Sto analizzando...":"Analizuję...","Non mostrare più":"Nie pokazuj więcej","Analizza":"Analizuj","Rispondi nella lingua usata dall'utente":"Odpowiadaj w języku użytkownika"},
      nl:{"Share":"Share","Progetti, costi condivisi e saldi":"Projecten, gedeelde kosten en saldi","Grafici, confronti e metriche":"Grafieken, vergelijkingen en statistieken","Piano mensile e risparmio":"Maandplan en sparen","Risparmi e target":"Spaargeld en doelen","Asset, conti e storico":"Activa, rekeningen en geschiedenis","Appunti":"Notities","Note, documenti e coordinate":"Notities, documenten en bankgegevens","Soglie e avvisi":"Drempels en meldingen","Consulente AI":"AI-adviseur","Consulente IA":"AI-adviseur","Analisi e domande":"Analyses en vragen","Progetto":"Project","Progetti":"Projecten","Nuova spesa condivisa":"Nieuwe gedeelde uitgave","Partecipanti":"Deelnemers","Divisione":"Verdeling","Equa":"Gelijk","Percentuali":"Percentages","Importi":"Bedragen","Anteprima quote":"Voorbeeld van aandelen","Pagato da":"Betaald door","Pagato da Io":"Betaald door mij","Io":"Ik","Chi deve soldi a chi":"Wie wie geld verschuldigd is","Registra nello storico la mia quota Share":"Mijn Share-aandeel in geschiedenis registreren","Categoria Share nello storico":"Share-categorie in geschiedenis","Aggiunta vocale":"Spraakinvoer","Sto ascoltando...":"Ik luister...","Riprova ascolto":"Opnieuw luisteren","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"De opname start automatisch wanneer je dit scherm opent. Gebruik de knop alleen om opnieuw te proberen.","Oppure scrivi qui il comando vocale...":"Of typ hier de spraakopdracht...","Analizza comando":"Opdracht analyseren","Uscita riconosciuta":"Uitgave herkend","Entrata riconosciuta":"Inkomst herkend","Rateizzazione":"Gespreide betaling","Voce":"Stem","Risparmio potenziale":"Potentiële besparing","Consigli attivi":"Actieve tips","Priorità alta":"Hoge prioriteit","Controlli dati":"Gegevenscontroles","Inizia conversazione":"Gesprek starten","Scrivi una domanda su fAInance...":"Schrijf een vraag over fAInance...","Sto analizzando...":"Analyseren...","Non mostrare più":"Niet meer tonen","Analizza":"Analyseren","Rispondi nella lingua usata dall'utente":"Antwoord in de taal van de gebruiker"},
      ro:{"Share":"Share","Progetti, costi condivisi e saldi":"Proiecte, costuri comune și solduri","Grafici, confronti e metriche":"Grafice, comparații și metrici","Piano mensile e risparmio":"Plan lunar și economii","Risparmi e target":"Economii și obiective","Asset, conti e storico":"Active, conturi și istoric","Appunti":"Notițe","Note, documenti e coordinate":"Notițe, documente și date bancare","Soglie e avvisi":"Praguri și alerte","Consulente AI":"Consultant AI","Consulente IA":"Consultant AI","Analisi e domande":"Analize și întrebări","Progetto":"Proiect","Progetti":"Proiecte","Nuova spesa condivisa":"Cheltuială comună nouă","Partecipanti":"Participanți","Divisione":"Împărțire","Equa":"Egal","Percentuali":"Procente","Importi":"Sume","Anteprima quote":"Previzualizare cote","Pagato da":"Plătit de","Pagato da Io":"Plătit de mine","Io":"Eu","Chi deve soldi a chi":"Cine cui datorează bani","Registra nello storico la mia quota Share":"Înregistrează cota mea Share în istoric","Categoria Share nello storico":"Categoria Share în istoric","Aggiunta vocale":"Introducere vocală","Sto ascoltando...":"Ascult...","Riprova ascolto":"Reîncearcă ascultarea","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"Înregistrarea pornește automat când deschizi acest ecran. Folosește butonul doar pentru a încerca din nou.","Oppure scrivi qui il comando vocale...":"Sau scrie aici comanda vocală...","Analizza comando":"Analizează comanda","Uscita riconosciuta":"Cheltuială recunoscută","Entrata riconosciuta":"Venit recunoscut","Rateizzazione":"Eșalonare","Voce":"Voce","Risparmio potenziale":"Economii potențiale","Consigli attivi":"Sfaturi active","Priorità alta":"Prioritate ridicată","Controlli dati":"Verificări date","Inizia conversazione":"Începe conversația","Scrivi una domanda su fAInance...":"Scrie o întrebare despre fAInance...","Sto analizzando...":"Analizez...","Non mostrare più":"Nu mai afișa","Analizza":"Analizează","Rispondi nella lingua usata dall'utente":"Răspunde în limba utilizatorului"},
      el:{"Share":"Share","Progetti, costi condivisi e saldi":"Έργα, κοινά κόστη και υπόλοιπα","Grafici, confronti e metriche":"Γραφήματα, συγκρίσεις και μετρικές","Piano mensile e risparmio":"Μηνιαίο πλάνο και αποταμίευση","Risparmi e target":"Αποταμιεύσεις και στόχοι","Asset, conti e storico":"Περιουσιακά στοιχεία, λογαριασμοί και ιστορικό","Appunti":"Σημειώσεις","Note, documenti e coordinate":"Σημειώσεις, έγγραφα και τραπεζικά στοιχεία","Soglie e avvisi":"Όρια και ειδοποιήσεις","Consulente AI":"Σύμβουλος AI","Consulente IA":"Σύμβουλος AI","Analisi e domande":"Αναλύσεις και ερωτήσεις","Progetto":"Έργο","Progetti":"Έργα","Nuova spesa condivisa":"Νέα κοινή δαπάνη","Partecipanti":"Συμμετέχοντες","Divisione":"Κατανομή","Equa":"Ίσα","Percentuali":"Ποσοστά","Importi":"Ποσά","Anteprima quote":"Προεπισκόπηση μεριδίων","Pagato da":"Πληρώθηκε από","Pagato da Io":"Πληρώθηκε από εμένα","Io":"Εγώ","Chi deve soldi a chi":"Ποιος χρωστάει σε ποιον","Registra nello storico la mia quota Share":"Καταχώριση του Share μεριδίου μου στο ιστορικό","Categoria Share nello storico":"Κατηγορία Share στο ιστορικό","Aggiunta vocale":"Φωνητική εισαγωγή","Sto ascoltando...":"Ακούω...","Riprova ascolto":"Δοκιμή ξανά","La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.":"Η εγγραφή ξεκινά αυτόματα όταν ανοίγετε αυτή την οθόνη. Χρησιμοποιήστε το κουμπί μόνο για νέα προσπάθεια.","Oppure scrivi qui il comando vocale...":"Ή γράψτε εδώ τη φωνητική εντολή...","Analizza comando":"Ανάλυση εντολής","Uscita riconosciuta":"Έξοδο αναγνωρίστηκε","Entrata riconosciuta":"Έσοδο αναγνωρίστηκε","Rateizzazione":"Δόσεις","Voce":"Φωνή","Risparmio potenziale":"Πιθανή αποταμίευση","Consigli attivi":"Ενεργές συμβουλές","Priorità alta":"Υψηλή προτεραιότητα","Controlli dati":"Έλεγχοι δεδομένων","Inizia conversazione":"Έναρξη συνομιλίας","Scrivi una domanda su fAInance...":"Γράψτε μια ερώτηση για το fAInance...","Sto analizzando...":"Αναλύω...","Non mostrare più":"Να μη εμφανιστεί ξανά","Analizza":"Ανάλυση","Rispondi nella lingua usata dall'utente":"Απάντησε στη γλώσσα του χρήστη"}
    };
    Object.keys(universal).forEach(function(code){if(base[code])Object.assign(base[code],universal[code]);});
    var aliases={};
    var map=base[lang]||base[aliases[lang]]||base.en;
    // Set of all translated values - used to skip already-translated text
    var allMapValues=new Set(Object.values(map));
    function replaceText(txt){
      var out=txt;
      // If the entire text node is already a translated value, skip it to prevent re-translation (avoids "Statsssss" bug)
      if(allMapValues.has(out.trim()))return out;
      // Sort keys longest-first to avoid partial replacements
      Object.keys(map).sort(function(a,b){return b.length-a.length;}).forEach(function(k){
        if(out.indexOf(k)>=0){
          // Only replace exact matches of k that are not part of a longer already-translated word
          // Use split/join but only if the key appears at a word boundary or as a standalone phrase
          var escaped=k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
          // Word-boundary aware: match key not preceded/followed by word chars
          try{
            var re=new RegExp('(^|[^\\w\\u00C0-\\u017E])'+escaped+'([^\\w\\u00C0-\\u017E]|$)','g');
            var replaced=out.replace(re,function(m,pre,suf){return pre+map[k]+suf;});
            if(replaced!==out)out=replaced;
          }catch(e){
            // Fallback for special chars
            if(out===k){out=map[k];}
          }
        }
      });
      return out;
    }
    function applyTranslations(root){
      try{
        var scope=root&&root.querySelectorAll?root:document.body;
        var walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{acceptNode:function(node){
          if(!node.nodeValue||!node.nodeValue.trim())return NodeFilter.FILTER_REJECT;
          var p=node.parentElement;if(!p)return NodeFilter.FILTER_REJECT;
          if(["SCRIPT","STYLE"].includes(p.tagName))return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }});
        var nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
        nodes.forEach(function(n){var nv=replaceText(n.nodeValue);if(nv!==n.nodeValue)n.nodeValue=nv;});
        Array.from(document.querySelectorAll("input[placeholder],textarea[placeholder]")).forEach(function(el){var ph=el.getAttribute("placeholder");var np=replaceText(ph||"");if(np!==ph)el.setAttribute("placeholder",np);});
      }catch(e){}
    }
    var timer=setTimeout(function(){applyTranslations(document.body);},0);
    var obs=null;
    try{obs=new MutationObserver(function(muts){clearTimeout(timer);timer=setTimeout(function(){applyTranslations(document.body);},20);});obs.observe(document.body,{childList:true,subtree:true,characterData:true});}catch(e){}
    return function(){clearTimeout(timer);if(obs)obs.disconnect();};
  },[lang,settingsPage,tab,speseSubTab,addType,addSubTab,historyTab]);
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
  var addExpenses=useCallback(function(items){setExpenses(function(p){return [...items,...p];});},[setExpenses]);
  var addIncomes=useCallback(function(items){setIncomes(function(p){return [...items,...p];});},[setIncomes]);
  function confirmRecurring(r,mk){var day=r.dayOfMonth===0?new Date(now.getFullYear(),now.getMonth()+1,0).getDate():r.dayOfMonth;var ds=new Date(now.getFullYear(),now.getMonth(),day).toISOString().split("T")[0];if(r.rtype==="expense")setExpenses(function(p){return [{id:Date.now(),amount:r.amount,catId:Number(r.catId),methodId:Number(r.methodId),desc:r.name,date:ds,rateizzato:r.rateizzato,rate:r.rate},...p];});else setIncomes(function(p){return [{id:Date.now(),amount:r.amount,type:r.incomeType,desc:r.name,date:ds,rateizzato:r.rateizzato,rate:r.rate},...p];});setRecurring(function(p){return p.map(function(x){return x.id===r.id?{...x,confirmed:[...(x.confirmed||[]),mk]}:x;});});}

  var curMonthExp=homeBalanceView==="rateizzato"?expenses.reduce(function(a,e){return a+rateMonth(e,curMonthKey);},0):expenses.filter(function(e){return e.date.startsWith(curMonthKey);}).reduce(function(a,e){return a+e.amount;},0);
  var curMonthInc=homeBalanceView==="rateizzato"?incomes.reduce(function(a,i){return a+rateMonth(i,curMonthKey);},0):incomes.filter(function(i){return i.date.startsWith(curMonthKey);}).reduce(function(a,i){return a+i.amount;},0);
  var yearExp=expenses.filter(function(e){return e.date.startsWith(String(curYear));}).reduce(function(a,e){return a+e.amount;},0);
  var yearInc=incomes.filter(function(i){return i.date.startsWith(String(curYear));}).reduce(function(a,i){return a+i.amount;},0);
  var last12Balance=useMemo(function(){var start=new Date(now.getFullYear(),now.getMonth()-11,1);var keys=[];for(var k=0;k<12;k++){var d=new Date(start.getFullYear(),start.getMonth()+k,1);keys.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}var exp=keys.reduce(function(a,key){return a+expenses.filter(function(e){return e.date&&e.date.startsWith(key);}).reduce(function(b,e){return b+e.amount;},0);},0);var inc=keys.reduce(function(a,key){return a+incomes.filter(function(i){return i.date&&i.date.startsWith(key);}).reduce(function(b,i){return b+i.amount;},0);},0);return inc-exp;},[expenses,incomes,curMonthKey]);
  var monthlyTotals=useMemo(function(){return Array.from({length:12},function(_,i){var key=curYear+"-"+String(i+1).padStart(2,"0");var exp=statsView==="reale"?expenses.filter(function(e){return e.date.startsWith(key);}).reduce(function(a,e){return a+e.amount;},0):expenses.reduce(function(a,e){return a+rateMonth(e,key);},0);var inc=statsView==="reale"?incomes.filter(function(x){return x.date.startsWith(key);}).reduce(function(a,x){return a+x.amount;},0):incomes.reduce(function(a,x){return a+rateMonth(x,key);},0);return{label:MONTHS_SHORT[i],exp:exp,inc:inc,value:Math.max(0,inc-exp)};});},[expenses,incomes,curYear,statsView]);
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
      return{...al,spentFmt:fmt(al._spent),budgetFmt:fmt(al.budget),pct:al.budget>0?Math.min(200,(al._spent/al.budget)*100):0};
    });
  }
  var triggeredAlertsData=useMemo(computeTriggered,[alerts,expenses,cats,curMonthKey,curYear,expenseGroups]);
  var alertTriggered=triggeredAlertsData.length;

  // ── REAL-TIME ALERT: only fire popup for newly triggered alerts ──
  var prevTriggeredIdsRef=useRef([]);
  useEffect(function(){
    if(!firestoreReady)return;
    var currentIds=triggeredAlertsData.map(function(a){return a.id;});
    var newIds=currentIds.filter(function(id){return !prevTriggeredIdsRef.current.includes(id);});
    if(newIds.length>0){
      var newAlerts=triggeredAlertsData.filter(function(a){return newIds.includes(a.id);});
      setAlertPopup(newAlerts);
    }
    prevTriggeredIdsRef.current=currentIds;
  },[firestoreReady,JSON.stringify(triggeredAlertsData.map(function(a){return a.id;}))]);

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
      return{id:"share_"+project.id+"_"+a.id,amount:myShare,catId:"share",methodId:null,desc:(project.name||"Share")+" · "+(a.desc||"Spesa condivisa")+(paidBy?" · pagata da "+paidBy.name:""),date:a.date,rateizzato:false,rate:1,_share:true,_shareProjectId:project.id,_shareProjectName:project.name,_sharePaidBy:paidBy?paidBy.name:""};
    });});
  },[shareProjects,showShareInHistory]);
  var filteredExpenses=useMemo(function(){var q=searchQuery.toLowerCase();var source=expenses.concat(shareHistoryExpenses);return sortHistoryItems(source.filter(function(e){var c=e._share?{id:"share",name:"Share",group:"share",icon:"🤝",color:confirmButtonColor}:getCat(e.catId);if(historyFutureMode==="untilToday"&&e.date>todayStr())return false;if(filterYear&&filterYear!=="all"&&!e.date.startsWith(filterYear))return false;if(filterMonth&&!e.date.startsWith(filterMonth))return false;if(filterMonths&&filterMonths.length&&!filterMonths.some(function(mk){return e.date.startsWith(mk);}))return false;var txt=((e.desc||"")+" "+(c?c.name:"")+" "+(e._shareProjectName||"")+" "+(e._sharePaidBy||"")).toLowerCase();if(q&&!txt.includes(q))return false;if(filterCats&&filterCats.length){var isSelected=filterCats.includes(String(e.catId));if(filterCatExclude?isSelected:!isSelected)return false;}else if(filterCat!=="all"&&String(e.catId)!==filterCat)return false;if(filterGroup!=="all"&&(c?c.group:"")!==filterGroup)return false;if(filterDateFrom&&e.date<filterDateFrom)return false;if(filterDateTo&&e.date>filterDateTo)return false;if(filterAmtMin&&e.amount<parseFloat(filterAmtMin))return false;if(filterAmtMax&&e.amount>parseFloat(filterAmtMax))return false;return true;}));},[expenses,shareHistoryExpenses,filterYear,filterMonth,filterMonths,searchQuery,filterCat,filterCats,filterCatExclude,filterGroup,filterDateFrom,filterDateTo,filterAmtMin,filterAmtMax,historyFutureMode,historySortDate,historySortDirection,confirmButtonColor]);
  var filteredIncomes=useMemo(function(){var q=searchQuery.toLowerCase();return sortHistoryItems(incomes.filter(function(i){if(historyFutureMode==="untilToday"&&i.date>todayStr())return false;if(filterYear&&filterYear!=="all"&&!i.date.startsWith(filterYear))return false;if(filterMonth&&!i.date.startsWith(filterMonth))return false;if(q&&!(i.desc||"").toLowerCase().includes(q))return false;if(filterDateFrom&&i.date<filterDateFrom)return false;if(filterDateTo&&i.date>filterDateTo)return false;if(filterAmtMin&&i.amount<parseFloat(filterAmtMin))return false;if(filterAmtMax&&i.amount>parseFloat(filterAmtMax))return false;return true;}));},[incomes,filterYear,filterMonth,searchQuery,filterDateFrom,filterDateTo,filterAmtMin,filterAmtMax,historyFutureMode,historySortDate,historySortDirection]);

  var inp={borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};
  var sb={padding:"8px 14px",border:"none",borderRadius:btnRadius,fontSize:13,cursor:"pointer",fontWeight:500};
  var ctxValue={
    // ── Già presenti ──────────────────────────────────────────────────────
    t,lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,
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
    userKey,
    // ── Tema / stile (usati dai pannelli) ─────────────────────────────────
    textC,subC,borderC,cardBg,inp,sb,bgColor,
    // ── Navigazione e stato UI ─────────────────────────────────────────────
    tab,setTab,settingsPage,setSettingsPage,
    speseSubTab,setSpeseSubTab,addType,setAddType,addSubTab,setAddSubTab,
    historyTab,setHistoryTab,
    editingItem,setEditingItem,
    mobileMenu,setMobileMenu,
    toast,setToast,alertPopup,setAlertPopup,
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
    confirmButtonColor,setConfirmButtonColor,
    // ── Firestore / auth ────────────────────────────────────────────────────
    firestoreReady,userKey,userId,currentUser,
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
    homeBalanceView,setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,
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
        voiceLabel:"Voce",
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
      shareWidget:{
        title:"Share",
        projectId:selectedShareProject?String(selectedShareProject.projectId):"",
        projectName:selectedShareProject?(selectedShareProject.projectName||"Progetto Share"):"Nessun progetto selezionato",
        netAmount:selectedShareProject?Number(selectedShareProject.netAmount||0):0,
        owedAmount:selectedShareProject?Number(selectedShareProject.owedAmount||0):0,
        oweAmount:selectedShareProject?Number(selectedShareProject.oweAmount||0):0,
        lastActivity:selectedShareProject?(selectedShareProject.lastActivity||"Nessuna attività recente"):"Nessuna attività recente",
        currency:sym,
        bgColor:widgetShareBgColor,
        bgAlpha:Number(widgetShareBgAlpha)||65,
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
        bgAlpha:Number(widget2BgAlpha)||65,
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
        bgAlpha:Number(widget3BgAlpha)||65,
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
        textColor:widget3TextColor,
        percentColor:widget3PercentColor,
        currency:sym,
        goalItems:widgetGoalItems
      }
    };
  }

  function saveWidgetSettingsToNative(showMessage,overridePayload){
    var payload=overridePayload||widgetSettingsPayload();
    try{
      var prefs=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.Preferences;
      var bridge=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.WidgetBridge;
      var payloadString=JSON.stringify(payload);
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
      var afterNativeUpdate=function(){if(showMessage)setToast("Widget aggiornati");};
      var fallbackSave=function(){
        var afterSave=function(){
          if(bridge&&bridge.updateAllWidgets){
            bridge.updateAllWidgets().then(afterNativeUpdate).catch(function(){if(showMessage)setToast("Impostazioni widget salvate");});
          } else if(bridge&&bridge.updateQuickAddWidget){
            bridge.updateQuickAddWidget().then(function(){if(showMessage)setToast("Widget aggiornato");}).catch(function(){if(showMessage)setToast("Impostazioni widget salvate");});
          } else {
            if(showMessage)setToast("Impostazioni widget salvate");
          }
        };
        if(prefs&&prefs.set){
          Promise.all([
            prefs.set({key:"widget_settings_v2",value:payloadString}),
            prefs.set({key:"widget_quick_add_settings",value:quickString}),
            prefs.set({key:"widget_note_settings",value:noteString}),
            prefs.set({key:"widget_goal_settings",value:goalString}),
            prefs.set({key:"widget_share_settings",value:shareString})
          ]).then(afterSave).catch(function(){if(showMessage)setToast("Errore salvataggio widget");});
        } else {
          localStorage.setItem("widget_settings_v2",payloadString);
          localStorage.setItem("widget_quick_add_settings",quickString);
          localStorage.setItem("widget_note_settings",noteString);
          localStorage.setItem("widget_goal_settings",goalString);
          localStorage.setItem("widget_share_settings",shareString);
          afterSave();
        }
      };
      if(bridge&&bridge.saveAndUpdateWidgets){
        bridge.saveAndUpdateWidgets({
          settings:payloadString,
          quickAdd:quickString,
          note:noteString,
          goal:goalString,
          share:shareString
        }).then(function(){
          if(prefs&&prefs.set){
            Promise.all([
              prefs.set({key:"widget_settings_v2",value:payloadString}),
              prefs.set({key:"widget_quick_add_settings",value:quickString}),
              prefs.set({key:"widget_note_settings",value:noteString}),
              prefs.set({key:"widget_goal_settings",value:goalString}),
              prefs.set({key:"widget_share_settings",value:shareString})
            ]).catch(function(){});
          }
          afterNativeUpdate();
        }).catch(fallbackSave);
      } else {
        fallbackSave();
      }
    }catch(e){if(showMessage)setToast("Errore salvataggio widget");}
  }

  // HOTFIX 1.0.9: non aggiorna i widget nativi automaticamente all'avvio.
  // Il salvataggio resta disponibile dalle impostazioni widget, evitando crash nativi in apertura app.





  useEffect(function(){
    if(!(window&&window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()))return;
    var timer=setTimeout(function(){try{saveWidgetSettingsToNative(false);}catch(e){}},600);
    return function(){clearTimeout(timer);};
  },[widgetBgColor,widgetBgAlpha,widgetExpenseColor,widgetIncomeColor,widgetTitle,widgetSubtitle,widgetExpenseLabel,widgetIncomeLabel,widgetShowHeader,widgetButtonStyle,widgetVoiceEnabled,widget2Enabled,widget2Type,widget2AccentColor,widget2TitleColor,widget2BodyColor,widget2BgAlpha,widget2MaxChars,widget2TextSize,widget2SelectedNoteId,widget2SelectedBankId,widget3Enabled,widget3AccentColor,widget3TextColor,widget3PercentColor,widget3BgAlpha,widget3SelectedGoalId,widget3ShowPercent,widget3ShowAmounts,widgetShareSelectedProjectId,widgetShareBgColor,widgetShareBgAlpha,widgetShareAccentColor,widgetShareActivityColor,widgetShareTitleColor,widgetShareBodyColor,widgetShareAutoUpdate,appuntiNotes,bankCoords,goals,shareProjects,shareSelectedProjectId,confirmButtonColor]);
  function AppuntiPanel(){
    var [noteTitle,setNoteTitle]=useState("");
    var [noteText,setNoteText]=useState("");
    var [editingNoteId,setEditingNoteId]=useState(null);
    var [bankForm,setBankForm]=useState({bank:"",holder:"",iban:"",bic:"",note:""});
    var [editingBankId,setEditingBankId]=useState(null);
    var fileInputRef=useRef(null);
    var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
    function handleFiles(ev){var files=Array.from((ev.target&&ev.target.files)||[]);if(!files.length)return;files.forEach(function(file){var allowed=/pdf|image|spreadsheet|excel|sheet|csv|officedocument/i.test(file.type)||/\.(pdf|png|jpe?g|webp|gif|xlsx?|csv)$/i.test(file.name);if(!allowed){setToast("Formato non supportato");return;}var reader=new FileReader();reader.onload=function(e){setAppuntiDocuments(function(p){return [{id:Date.now()+Math.random(),name:file.name,type:file.type||"file",size:file.size,createdAt:new Date().toISOString(),dataUrl:e.target.result},...p];});setToast("Documento caricato");};reader.readAsDataURL(file);});ev.target.value="";}
    function saveNote(){if(!noteTitle.trim()&&!noteText.trim())return;if(editingNoteId){setAppuntiNotes(function(p){return p.map(function(n){return n.id===editingNoteId?{...n,title:noteTitle.trim()||"Appunto",text:noteText.trim(),updatedAt:new Date().toISOString()}:n;});});setToast("Appunto aggiornato");}else{setAppuntiNotes(function(p){return [{id:Date.now(),title:noteTitle.trim()||"Appunto",text:noteText.trim(),createdAt:new Date().toISOString()},...p];});setToast("Appunto salvato");}setEditingNoteId(null);setNoteTitle("");setNoteText("");}
    function editNote(n){setEditingNoteId(n.id);setNoteTitle(n.title||"");setNoteText(n.text||"");}
    function cancelNoteEdit(){setEditingNoteId(null);setNoteTitle("");setNoteText("");}
    function saveBank(){if(!bankForm.iban.trim()&&!bankForm.bank.trim())return;if(editingBankId){setBankCoords(function(p){return p.map(function(b){return b.id===editingBankId?{...b,...bankForm,updatedAt:new Date().toISOString()}:b;});});setToast("Coordinate aggiornate");}else{setBankCoords(function(p){return [{...bankForm,id:Date.now(),createdAt:new Date().toISOString()},...p];});setToast("Coordinate salvate");}setEditingBankId(null);setBankForm({bank:"",holder:"",iban:"",bic:"",note:""});}
    function editBank(b){setEditingBankId(b.id);setBankForm({bank:b.bank||"",holder:b.holder||"",iban:b.iban||"",bic:b.bic||"",note:b.note||""});}
    function cancelBankEdit(){setEditingBankId(null);setBankForm({bank:"",holder:"",iban:"",bic:"",note:""});}
    function fmtSize(n){if(!n)return "";if(n<1024)return n+" B";if(n<1024*1024)return Math.round(n/1024)+" KB";return (n/1024/1024).toFixed(1).replace(".",",")+" MB";}
    return <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>📎 Documenti</div><div style={{fontSize:12,color:subC,marginBottom:12}}>Carica PDF, immagini, Excel o CSV. I file vengono salvati nei dati dell’account.</div><input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.xls,.xlsx,.csv,image/*,application/pdf" style={{display:"none"}} onChange={handleFiles}/><Btn onClick={function(){fileInputRef.current&&fileInputRef.current.click();}} bg="#7F77DD" style={{marginBottom:12}}>+ Carica documento</Btn>{(!appuntiDocuments||appuntiDocuments.length===0)&&<div style={{fontSize:13,color:"#bbb",padding:"16px 0",textAlign:"center"}}>Nessun documento caricato</div>}{(appuntiDocuments||[]).map(function(d){return <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:20}}>{/image/i.test(d.type)?"🖼":/pdf/i.test(d.type)||/\.pdf$/i.test(d.name)?"📄":"📊"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</div><div style={{fontSize:11,color:subC}}>{fmtSize(d.size)} · {d.createdAt?fmtDate(d.createdAt.slice(0,10),dateFmt):""}</div></div>{d.dataUrl&&<button onClick={function(){var w=window.open();if(w)w.document.write('<iframe src="'+d.dataUrl+'" style="border:0;width:100%;height:100vh"></iframe>');}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13}}>Apri</button>}<button onClick={function(){setAppuntiDocuments(function(p){return p.filter(function(x){return x.id!==d.id;});});}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:16}}>x</button></div>;})}</div>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:12}}>📝 Appunti di testo</div><div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}><input placeholder="Titolo" value={noteTitle} onChange={function(e){setNoteTitle(e.target.value);}} style={sinp}/><textarea placeholder="Scrivi un appunto..." value={noteText} onChange={function(e){setNoteText(e.target.value);}} style={{...sinp,minHeight:90,resize:"vertical"}}/><div style={{display:"flex",gap:8}}><Btn onClick={saveNote} bg="#378ADD">{editingNoteId?"Aggiorna appunto":"Salva appunto"}</Btn>{editingNoteId&&<Btn onClick={cancelNoteEdit} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#555"}>{V.cancel}</Btn>}</div></div>{(!appuntiNotes||appuntiNotes.length===0)&&<div style={{fontSize:13,color:"#bbb",padding:"12px 0",textAlign:"center"}}>Nessun appunto</div>}{(appuntiNotes||[]).map(function(n){return <div key={n.id} style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:10,border:"1px solid "+borderC,padding:"10px 12px",marginBottom:8}}><div style={{display:"flex",gap:8,alignItems:"flex-start"}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:textC}}>{n.title}</div><div style={{fontSize:12,color:subC,whiteSpace:"pre-wrap",marginTop:4}}>{n.text}</div></div><button onClick={function(){editNote(n);}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13}}>Modifica</button><button onClick={function(){setAppuntiNotes(function(p){return p.filter(function(x){return x.id!==n.id;});});}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:16}}>x</button></div></div>;})}</div>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:12}}>🏦 Coordinate bancarie</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:12}}><input placeholder="Banca" value={bankForm.bank} onChange={function(e){setBankForm(function(p){return{...p,bank:e.target.value};});}} style={sinp}/><input placeholder="Intestatario" value={bankForm.holder} onChange={function(e){setBankForm(function(p){return{...p,holder:e.target.value};});}} style={sinp}/><input placeholder="IBAN" value={bankForm.iban} onChange={function(e){setBankForm(function(p){return{...p,iban:e.target.value};});}} style={sinp}/><input placeholder="BIC/SWIFT" value={bankForm.bic} onChange={function(e){setBankForm(function(p){return{...p,bic:e.target.value};});}} style={sinp}/><input placeholder="Note" value={bankForm.note} onChange={function(e){setBankForm(function(p){return{...p,note:e.target.value};});}} style={{...sinp,gridColumn:isMobile?"auto":"1 / -1"}}/></div><div style={{display:"flex",gap:8,marginBottom:12}}><Btn onClick={saveBank} bg="#1D9E75">{editingBankId?"Aggiorna coordinate":"Salva coordinate"}</Btn>{editingBankId&&<Btn onClick={cancelBankEdit} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#555"}>{V.cancel}</Btn>}</div>{(!bankCoords||bankCoords.length===0)&&<div style={{fontSize:13,color:"#bbb",padding:"12px 0",textAlign:"center"}}>Nessuna coordinata salvata</div>}{(bankCoords||[]).map(function(b){return <div key={b.id} style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:10,border:"1px solid "+borderC,padding:"10px 12px",marginBottom:8}}><div style={{display:"flex",gap:8,alignItems:"flex-start"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:textC}}>{b.bank||"Banca"}</div><div style={{fontSize:12,color:subC}}>Intestatario: {b.holder||"—"}</div><div style={{fontSize:12,color:textC,wordBreak:"break-all",fontWeight:600}}>IBAN: {b.iban||"—"}</div><div style={{fontSize:12,color:subC}}>BIC/SWIFT: {b.bic||"—"}</div>{b.note&&<div style={{fontSize:12,color:subC,marginTop:4}}>{b.note}</div>}</div><button onClick={function(){editBank(b);}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13}}>Modifica</button><button onClick={function(){setBankCoords(function(p){return p.filter(function(x){return x.id!==b.id;});});}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:16}}>x</button></div></div>;})}</div>
    </div>;
  }

  function TermsAndConditionsContent(){
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
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:24}}>📄</span><div style={{fontSize:18,fontWeight:800,color:textC}}>Termini di utilizzo</div></div>
        <div style={{fontSize:13,color:subC,lineHeight:1.55}}>Usando fAInance accetti che l’app sia uno strumento di supporto alla gestione personale dei tuoi dati finanziari e non un servizio di consulenza professionale.</div>
      </div>
      {rows.map(function(r){return <div key={r.title} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:textC,marginBottom:6}}>{r.title}</div>
        <div style={{fontSize:13,color:subC,lineHeight:1.55}}>{r.text}</div>
      </div>;})}
      <div style={{background:dark?"#24213a":"#F0EDFF",borderRadius:14,border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),padding:16}}>
        <div style={{fontSize:13,color:dark?"#BEB8FF":"#534AB7",lineHeight:1.55,fontWeight:600}}>Versione termini: 1.0 · Ultimo aggiornamento: 25/05/2026</div>
      </div>
    </div>;
  }

  function PrivacyPolicyContent(){
    var rows=[
      {title:"Dati trattati",text:"fAInance può salvare i dati che inserisci nell’app, come entrate, uscite, categorie, metodi di pagamento, ricorrenze, budget, patrimonio, obiettivi, alert, appunti, documenti caricati e coordinate bancarie salvate volontariamente."},
      {title:"Account e accesso",text:"Se accedi con email/password o Google, vengono usati i dati necessari all’autenticazione, come identificativo utente, email e nome profilo. L’accesso è gestito tramite Firebase Authentication."},
      {title:"Salvataggio e sincronizzazione",text:"I dati dell’app possono essere salvati localmente sul dispositivo e, per gli utenti autenticati, sincronizzati su Firestore/Firebase per consentire backup e recupero dei dati collegati all’account."},
      {title:"Uso dell’Agente AI",text:"Quando usi il Consulente AI, la domanda e i dati finanziari necessari all’analisi possono essere inviati al servizio AI collegato all’app per generare la risposta. È consigliabile non inserire dati non necessari o informazioni troppo sensibili nelle domande libere."},
      {title:"Finalità",text:"I dati vengono usati per fornire le funzionalità dell’app: registrazione movimenti, statistiche, budget, alert, patrimonio, backup, sincronizzazione e analisi tramite AI."},
      {title:"Responsabilità dell’utente",text:"L’utente decide quali dati inserire, caricare o cancellare. Prima di salvare documenti, note o coordinate bancarie, valuta se siano davvero necessari per l’uso personale dell’app."},
      {title:"Cancellazione dati",text:"L’app include funzioni per eliminare dati per sezione o cancellare informazioni salvate. Alcuni dati potrebbero restare in backup o cache tecniche fino ai normali tempi di aggiornamento dei servizi utilizzati."},
      {title:"Servizi terzi",text:"L’app può usare servizi esterni come Firebase, Firestore, autenticazione Google, API di cambio valuta e servizi AI. Ogni servizio può applicare proprie regole tecniche e privacy."},
      {title:"Aggiornamenti",text:"Questa informativa può essere aggiornata quando cambiano funzionalità, servizi tecnici, modalità di sincronizzazione o uso dell’Agente AI."}
    ];
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><span style={{fontSize:24}}>🔐</span><div style={{fontSize:18,fontWeight:800,color:textC}}>Informativa Privacy</div></div>
        <div style={{fontSize:13,color:subC,lineHeight:1.55}}>Questa informativa spiega in modo sintetico quali dati possono essere gestiti da fAInance e per quali finalità vengono usati.</div>
      </div>
      {rows.map(function(r){return <div key={r.title} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
        <div style={{fontSize:14,fontWeight:800,color:textC,marginBottom:6}}>{r.title}</div>
        <div style={{fontSize:13,color:subC,lineHeight:1.55}}>{r.text}</div>
      </div>;})}
      <div style={{background:dark?"#24213a":"#F0EDFF",borderRadius:14,border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),padding:16}}>
        <div style={{fontSize:13,color:dark?"#BEB8FF":"#534AB7",lineHeight:1.55,fontWeight:600}}>Versione privacy: 1.0 · Ultimo aggiornamento: 25/05/2026</div>
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
        <button onClick={function(){if(isTerms){setTermsChecked(true);}else{setPrivacyChecked(true);}setLegalView("main");}} style={{width:"100%",background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"13px 16px",fontSize:15,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px rgba(127,119,221,0.35)",marginTop:14}}>Ho letto</button>
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
              <span style={{fontSize:13,color:textC,lineHeight:1.45}}>Dichiaro di aver letto e accettato i Termini di utilizzo <span style={{color:"#E24B4A"}}>*</span></span>
            </label>
            <button onClick={function(){setLegalView("terms");}} style={{background:"transparent",border:"none",color:dark?"#BEB8FF":"#378ADD",padding:"8px 0 0 28px",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left"}}>Leggi i Termini di utilizzo</button>
          </div>
          <div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:14,border:"1px solid "+borderC,padding:14}}>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
              <input type="checkbox" checked={privacyChecked} onChange={function(e){setPrivacyChecked(e.target.checked);}} style={{width:18,height:18,marginTop:1,accentColor:"#7F77DD",flexShrink:0}}/>
              <span style={{fontSize:13,color:textC,lineHeight:1.45}}>Dichiaro di aver letto e accettato l’Informativa Privacy <span style={{color:"#E24B4A"}}>*</span></span>
            </label>
            <button onClick={function(){setLegalView("privacy");}} style={{background:"transparent",border:"none",color:dark?"#BEB8FF":"#378ADD",padding:"8px 0 0 28px",fontSize:13,fontWeight:700,cursor:"pointer",textAlign:"left"}}>Leggi l’Informativa Privacy</button>
          </div>
        </div>
        <button onClick={acceptAll} disabled={!termsChecked||!privacyChecked} style={{width:"100%",background:(!termsChecked||!privacyChecked)?(dark?"#333":"#ddd"):"linear-gradient(135deg,#7F77DD,#378ADD)",color:(!termsChecked||!privacyChecked)?(dark?"#777":"#999"):"#fff",border:"none",borderRadius:btnRadius,padding:"13px 16px",fontSize:15,fontWeight:800,cursor:(!termsChecked||!privacyChecked)?"not-allowed":"pointer",boxShadow:(!termsChecked||!privacyChecked)?"none":"0 4px 16px rgba(127,119,221,0.35)"}}>Continua</button>
      </div>
    </div>;
  }

  var settingsSections=[
    {id:"profile",icon:"👤",label:"Profilo",desc:"Dati personali, account, accesso"},
    {id:"general",icon:"🌐",label:"Generale",desc:"Lingua, formato data, metriche, valute e IA"},
    {id:"appearance",icon:"🎨",label:"Aspetto",desc:"Tema, colori, stile pulsanti e widget"},
    {id:"sections",icon:"🧩",label:"Sezioni",desc:"Entrate, uscite, patrimonio e storico"},
    {id:"notifications",icon:"🔔",label:"Notifiche e Promemoria",desc:"Promemoria inserimento, notifiche custom"},
    {id:"delete",icon:"💾",label:"Dati",desc:"Importa, esporta, backup, elimina"},
    {id:"support",icon:"🆘",label:"Supporto",desc:"FAQ, tutorial, sito web, contatti"},
    {id:"info",icon:"ℹ️",label:"Info app",desc:"Versione, piano, aggiornamenti e termini"},
  ];

  function SettingsPanel(){
    var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};
    function settingsParent(id){var map={metrics:"general",currency_settings:"general",appearance_app:"appearance",appearance_widget:"appearance",appearance_widget_quick:"appearance_widget",appearance_widget_note:"appearance_widget",appearance_widget_goal:"appearance_widget",appearance_widget_share:"appearance_widget",sections_income:"sections",sections_expense:"sections",patrimonio_settings:"sections",history_settings:"sections",patrimonio_areas_settings:"patrimonio_settings",patrimonio_entries_settings:"patrimonio_settings",patrimonio_mode_settings:"patrimonio_settings",sections_income_areas:"sections_income",sections_income_categories:"sections_income",sections_expense_areas:"sections_expense",sections_expense_categories:"sections_expense",sections_expense_methods:"sections_expense",terms_conditions:"info",privacy_policy:"info"};return map[id]||null;}
    function PageHeader({title}){return <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}><button onClick={function(){setSettingsPage(settingsParent(settingsPage));}} style={{minWidth:104,height:42,borderRadius:14,border:"1px solid "+(dark?"#4a4865":"#d8d2ff"),background:dark?"#24213a":"#F0EDFF",cursor:"pointer",color:dark?"#BEB8FF":"#534AB7",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:dark?"none":"0 3px 14px rgba(83,74,183,0.14)"}}>‹ Indietro</button><div style={{fontSize:18,fontWeight:800,color:textC}}>{title}</div></div>;}
    function SettingHint({children}){return <div style={{fontSize:12,color:dark?"#BEB8FF":"#534AB7",background:dark?"#24213a":"#F0EDFF",border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),borderRadius:10,padding:"8px 10px",marginBottom:12,lineHeight:1.45}}>{children}</div>;}
    function SettingsCards({items}){return <div style={{display:"flex",flexDirection:"column",gap:10}}>{items.map(function(s){return <button key={s.id} onClick={function(){setSettingsPage(s.id);}} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",border:"1px solid "+borderC,borderRadius:16,background:cardBg,cursor:"pointer",textAlign:"left",boxShadow:dark?"none":"0 2px 12px rgba(0,0,0,0.04)"}}><div style={{width:42,height:42,borderRadius:14,background:dark?"#24213a":"#F0EDFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{s.icon}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:800,color:textC,marginBottom:3}}>{s.label}</div><div style={{fontSize:12,color:dark?"#BEB8FF":"#534AB7",background:dark?"#24213a":"#F0EDFF",border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),borderRadius:9,padding:"5px 8px",lineHeight:1.35}}>{s.desc}</div></div><span style={{fontSize:18,color:subC}}>›</span></button>;})}</div>;}
    function SettingsMenu(){return <SettingsCards items={settingsSections}/>;}
    function Segmented({items,value,onChange}){return <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3,marginBottom:12}}>{items.map(function(it){var active=value===it.id;return <button type="button" key={it.id} onClick={function(e){if(e&&e.stopPropagation)e.stopPropagation();onChange(it.id);}} style={{flex:1,padding:"9px 10px",border:"none",borderRadius:10,background:active?"linear-gradient(135deg,#7F77DD,#378ADD)":"transparent",color:active?"#fff":subC,fontSize:13,cursor:"pointer",fontWeight:active?800:400,boxShadow:active?"0 3px 10px rgba(127,119,221,0.25)":"none"}}>{it.label}</button>;})}</div>;}
    function CurrencyPicker({value,onChange,exclude,allowNone}){var [q,setQ]=useState("");var normalized=String(q||"").toLowerCase().trim();var list=CURRENCIES.filter(function(c){return (!exclude||c.code!==exclude)&&(!normalized||c.code.toLowerCase().indexOf(normalized)>=0||String(c.name||"").toLowerCase().indexOf(normalized)>=0||String(c.symbol||"").toLowerCase().indexOf(normalized)>=0);}).slice(0,180);return <div style={{display:"flex",flexDirection:"column",gap:8}}><input placeholder="Cerca valuta, es. euro, dollaro, yen..." value={q} onChange={function(e){setQ(e.target.value);}} style={{...sinp,width:"100%"}}/><select value={value||""} onChange={function(e){onChange(e.target.value);}} style={{...sinp,width:"100%"}}>{allowNone&&<option value="">Nessuna</option>}{list.map(function(c){return <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>;})}</select><div style={{fontSize:11,color:subC}}>{list.length} valute mostrate{normalized?" per la ricerca":""}.</div></div>;}

    function WidgetAppearancePanel(){
      return <SettingsCards items={[
        {id:"appearance_widget_quick",icon:"⚡",label:"Aggiunta Rapida",desc:"Logo fAInance, pulsanti Uscita/Entrata e layout 1x4 in una sola riga"},
        {id:"appearance_widget_note",icon:"📝",label:"Nota / Coordinata",desc:"Mostra il contenuto di una nota oppure l’IBAN selezionato"},
        {id:"appearance_widget_goal",icon:"🎯",label:"Obiettivo",desc:"Mostra avanzamento, percentuale e importi di un obiettivo"},
        {id:"appearance_widget_share",icon:"🤝",label:"Share",desc:"Scegli progetto, colori, trasparenza e grafica del widget Share"}
      ]}/>;
    }

    function WidgetQuickAddSettingsPanel(){
      var WIDGET_BG_PALETTE=[{name:"Glass scuro",value:"#1E1E30"},{name:"Notte",value:"#111827"},{name:"Slate",value:"#273244"},{name:"Soft",value:"#FAFAFF"},{name:"Bianco",value:"#FFFFFF"},{name:"Lavanda",value:"#F0EDFF"}];
      var WIDGET_EXP_PALETTE=[{name:"Rosso",value:"#E24B4A"},{name:"Corallo",value:"#F05A55"},{name:"Arancio",value:"#D85A30"},{name:"Rosso scuro",value:"#B33030"},{name:"Cremisi",value:"#C0392B"},{name:"Viola",value:"#8E44AD"}];
      var WIDGET_INC_PALETTE=[{name:"Verde",value:"#1D9E75"},{name:"Teal",value:"#16A085"},{name:"Smeraldo",value:"#10B981"},{name:"Verde 2",value:"#27AE60"},{name:"Blu",value:"#3498DB"},{name:"Royal",value:"#0D6EFD"}];
      var [draft,setDraft]=useState(function(){return{bgColor:widgetBgColor,bgAlpha:widgetBgAlpha,expenseColor:widgetExpenseColor,incomeColor:widgetIncomeColor,title:widgetTitle,subtitle:widgetSubtitle,expenseLabel:stripWidgetPrefix(widgetExpenseLabel)||"Uscita",incomeLabel:stripWidgetPrefix(widgetIncomeLabel)||"Entrata",showHeader:widgetShowHeader,buttonStyle:widgetButtonStyle,voiceEnabled:widgetVoiceEnabled};});
      function stripWidgetPrefix(v){return String(v||"").replace(/^\s*[+\-−]\s*/,"").trim();}
      function dset(k,v){setDraft(function(p){return{...p,[k]:v};});}
      function radiusFor(id){var x=BUTTON_STYLES.find(function(b){return b.id===id;});return x?Math.max(6,Math.round(x.r*.7)):10;}
      function alphaHex(hex,alpha){var a=Math.max(0,Math.min(100,Number(alpha)||0))/100;var h=String(hex||"#1E1E30");if(h.length===4)h="#"+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];var r=parseInt(h.slice(1,3),16)||0,g=parseInt(h.slice(3,5),16)||0,b=parseInt(h.slice(5,7),16)||0;return "rgba("+r+","+g+","+b+","+a+")";}
      function textOnBg(hex){var h=String(hex||"#1E1E30").replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var r=parseInt(h.slice(0,2),16)||0,g=parseInt(h.slice(2,4),16)||0,b=parseInt(h.slice(4,6),16)||0;return (r*299+g*587+b*114)/1000<145?"#FFFFFF":"#222222";}
      function save(){var cleanExpense=stripWidgetPrefix(draft.expenseLabel)||"Uscita";var cleanIncome=stripWidgetPrefix(draft.incomeLabel)||"Entrata";setWidgetBgColor(draft.bgColor);setWidgetBgAlpha(Number(draft.bgAlpha)||65);setWidgetExpenseColor(draft.expenseColor);setWidgetIncomeColor(draft.incomeColor);setWidgetTitle(draft.title);setWidgetSubtitle(draft.subtitle);setWidgetExpenseLabel(cleanExpense);setWidgetIncomeLabel(cleanIncome);setWidgetShowHeader(!!draft.showHeader);setWidgetButtonStyle(draft.buttonStyle);setWidgetVoiceEnabled(!!draft.voiceEnabled);saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),quickAdd:{bgColor:draft.bgColor,bgAlpha:Number(draft.bgAlpha)||65,expenseColor:draft.expenseColor,incomeColor:draft.incomeColor,title:draft.title,subtitle:draft.subtitle,expenseLabel:cleanExpense,incomeLabel:cleanIncome,showHeader:!!draft.showHeader,buttonStyle:draft.buttonStyle,compactSingleRow:true,reduceButtonHeightPct:15,removeButtonWhiteOverlay:true,widgetCornerRadius:"soft",showVoiceButton:!!draft.voiceEnabled,voiceLabel:"Voce",voiceIcon:"🎙️",voiceAction:"open-voice",voiceUrlScheme:"fainance://open-voice",logoKind:"official",logoLabel:"fAI"},bgColor:draft.bgColor,bgAlpha:Number(draft.bgAlpha)||65,expenseColor:draft.expenseColor,incomeColor:draft.incomeColor,title:draft.title,subtitle:draft.subtitle,expenseLabel:cleanExpense,incomeLabel:cleanIncome,showHeader:!!draft.showHeader,buttonStyle:draft.buttonStyle});}
      function Palette({title,value,onPick,items}){return <div style={{background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:14,padding:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><div style={{fontSize:13,fontWeight:800,color:textC}}>{title}</div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:34,height:22,borderRadius:8,background:value,border:"1px solid "+borderC}}/><span style={{fontSize:11,color:subC,fontWeight:700}}>{value}</span></div></div><div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:10}}><input type="color" value={value} onChange={function(e){onPick(e.target.value);}} style={{width:54,height:42,padding:0,border:"none",borderRadius:10,cursor:"pointer",background:"transparent"}}/><div style={{background:value,color:"#fff",borderRadius:12,padding:"9px 14px",fontSize:12,fontWeight:900,textShadow:"0 1px 2px rgba(0,0,0,0.35)"}}>Anteprima</div></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{items.map(function(c){var active=value.toUpperCase()===c.value.toUpperCase();return <button type="button" title={c.name} key={c.value} onClick={function(){onPick(c.value);}} style={{width:32,height:32,background:c.value,border:active?"3px solid #333":"2px solid transparent",boxShadow:active?"0 0 0 2px rgba(127,119,221,0.35)":"none",borderRadius:"50%",cursor:"pointer",padding:0}}/>;})}</div></div>;}
      var previewText=textOnBg(draft.bgColor);
      var previewSub=previewText==="#FFFFFF"?"rgba(255,255,255,0.72)":"#777";
      var cardAlpha=alphaHex(draft.bgColor,draft.bgAlpha);
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:16}}><div style={{fontSize:15,fontWeight:900,color:textC,marginBottom:4}}>⚡ Aggiunta Rapida</div><SettingHint>Questo widget serve per inserire rapidamente una nuova uscita o una nuova entrata direttamente dalla Home del telefono, senza aprire manualmente l’app.</SettingHint><div style={{background:cardAlpha,border:"1px solid rgba(255,255,255,.18)",borderRadius:14,padding:10,display:"flex",alignItems:"center",gap:10,boxShadow:"inset 0 1px 0 rgba(255,255,255,.08)"}}><FAInanceLogo size={36}/><div style={{height:32,width:1,background:"rgba(255,255,255,.18)"}}/>{draft.voiceEnabled&&<div style={{width:34,height:34,borderRadius:17,background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:previewText}}>🎙️</div>}<div style={{flex:1,background:draft.expenseColor,color:"#fff",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 8px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:900}}><span>−</span><span>{draft.expenseLabel||"Uscita"}</span></div><div style={{flex:1,background:draft.incomeColor,color:"#fff",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 8px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontSize:13,fontWeight:900}}><span>+</span><span>{draft.incomeLabel||"Entrata"}</span></div><div style={{width:30,height:30,borderRadius:15,border:"1px solid rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",color:previewText}}>⚙</div></div>{draft.showHeader&&<div style={{background:cardAlpha,border:"1px solid rgba(255,255,255,.18)",borderRadius:14,padding:14,marginTop:12}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><FAInanceLogo size={42}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:900,color:previewText}}>{draft.title||"fAInance"}</div><div style={{fontSize:12,color:previewSub}}>{draft.subtitle||"Aggiunta rapida movimenti"}</div></div><div style={{color:previewText}}>⚙</div></div><div style={{display:"flex",gap:10}}>{draft.voiceEnabled&&<div style={{width:44,background:"rgba(255,255,255,.18)",color:previewText,border:"1px solid rgba(255,255,255,.25)",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 10px",textAlign:"center",fontWeight:900}}>🎙️</div>}<div style={{flex:1,background:draft.expenseColor,color:"#fff",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 10px",textAlign:"center",fontWeight:900}}>− {draft.expenseLabel||"Uscita"}</div><div style={{flex:1,background:draft.incomeColor,color:"#fff",borderRadius:radiusFor(draft.buttonStyle),padding:"10px 10px",textAlign:"center",fontWeight:900}}>+ {draft.incomeLabel||"Entrata"}</div></div></div>}</div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}><div><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:5}}>Titolo</div><input value={draft.title} onChange={function(e){dset("title",e.target.value);}} style={sinp}/></div><div><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:5}}>Sottotitolo</div><input value={draft.subtitle} onChange={function(e){dset("subtitle",e.target.value);}} style={sinp}/></div><div><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:5}}>Testo tasto uscita</div><input value={draft.expenseLabel} onChange={function(e){dset("expenseLabel",stripWidgetPrefix(e.target.value));}} style={sinp}/></div><div><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:5}}>Testo tasto entrata</div><input value={draft.incomeLabel} onChange={function(e){dset("incomeLabel",stripWidgetPrefix(e.target.value));}} style={sinp}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}><Palette title="Sfondo widget" value={draft.bgColor} onPick={function(v){dset("bgColor",v);}} items={WIDGET_BG_PALETTE}/><Palette title="Pulsante uscita" value={draft.expenseColor} onPick={function(v){dset("expenseColor",v);}} items={WIDGET_EXP_PALETTE}/><Palette title="Pulsante entrata" value={draft.incomeColor} onPick={function(v){dset("incomeColor",v);}} items={WIDGET_INC_PALETTE}/></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>Trasparenza sfondo widget</div><div style={{fontSize:12,color:subC}}>Regola solo lo sfondo del widget.</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draft.bgAlpha}%</div></div><input type="range" min="20" max="100" step="1" value={draft.bgAlpha} onChange={function(e){dset("bgAlpha",Number(e.target.value));}} style={{width:"100%"}}/></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:12,fontWeight:700,color:subC,marginBottom:8}}>Bordi dei tasti widget</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{BUTTON_STYLES.map(function(bs){var active=draft.buttonStyle===bs.id;return <button type="button" key={bs.id} onClick={function(){dset("buttonStyle",bs.id);}} style={{padding:"10px",border:"2px solid "+(active?"#7F77DD":borderC),borderRadius:Math.max(6,Math.round(bs.r*.7)),background:active?(dark?"#2a2a3e":"#EEEDFE"):(dark?"#1e1e30":"#f9f9f9"),cursor:"pointer",fontSize:13,color:active?"#7F77DD":textC,fontWeight:active?800:500}}>{bs.label}</button>;})}</div></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>Mostra microfono nel widget</div><div style={{fontSize:12,color:subC}}>Aggiunge il pulsante 🎙️ sulla sinistra del widget di aggiunta rapida.</div></div><Toggle label="" checked={!!draft.voiceEnabled} onChange={function(){dset("voiceEnabled",!draft.voiceEnabled);}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>Mostra intestazione nella versione ampia</div><div style={{fontSize:12,color:subC}}>Nella versione 1x4 resta una sola riga.</div></div><Toggle label="" checked={!!draft.showHeader} onChange={function(){dset("showHeader",!draft.showHeader);}}/></div><Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>Salva e aggiorna widget</Btn>
      </div>;
    }

    function WidgetIntroCard({icon,title,children}){return <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:16,display:"flex",gap:14,alignItems:"flex-start"}}><div style={{width:46,height:46,borderRadius:14,background:dark?"#24213a":"#F0EDFF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{icon}</div><div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:900,color:textC,marginBottom:5}}>{title}</div><div style={{fontSize:13,color:subC,lineHeight:1.45}}>{children}</div></div></div>;}

    function WidgetNoteSettingsPanel(){
      var [draftMaxChars,setDraftMaxChars]=useState(String(widget2MaxChars||500));
      var [draftTextSize,setDraftTextSize]=useState(Number(widget2TextSize)||14);
      var [draftBgAlpha,setDraftBgAlpha]=useState(Number(widget2BgAlpha)||65);
      function save(){
        var max=(parseInt(draftMaxChars,10)||500);max=Math.max(20,Math.min(2000,max));
        var alpha=Math.max(0,Math.min(100,Number(draftBgAlpha)||65));
        var textSize=Math.max(10,Math.min(28,Number(draftTextSize)||14));
        setWidget2MaxChars(max);
        setWidget2TextSize(textSize);
        setWidget2BgAlpha(alpha);
        saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),noteWidget:{...widgetSettingsPayload().noteWidget,maxChars:max,textSize:textSize,bgAlpha:alpha,titleColor:widget2TitleColor,bodyColor:widget2BodyColor,accentColor:widget2AccentColor}});
      }
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <WidgetIntroCard icon="📝" title="Nota / Coordinata">Questo widget mostra sulla Home una nota salvata oppure una coordinata bancaria. Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori e aggiornamento.</WidgetIntroCard>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:900,color:textC,marginBottom:5}}>Numero massimo di caratteri</div><div style={{fontSize:12,color:subC,marginBottom:8}}>Limite del testo mostrato nel widget.</div><input type="number" inputMode="numeric" min="20" max="2000" value={draftMaxChars} onChange={function(e){setDraftMaxChars(e.target.value);}} onBlur={function(){var n=parseInt(draftMaxChars,10);if(!n)setDraftMaxChars("500");else setDraftMaxChars(String(Math.max(20,Math.min(2000,n))));}} style={{...sinp,width:"100%"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:900,color:textC,marginBottom:8}}>Grandezza testo</div><div style={{fontSize:12,color:subC,marginBottom:8}}>Dimensione del contenuto mostrato nel widget.</div><div style={{display:"flex",alignItems:"center",gap:10}}><input type="range" min="10" max="28" step="1" value={draftTextSize} onChange={function(e){setDraftTextSize(Number(e.target.value));}} style={{flex:1}}/><input type="number" min="10" max="28" value={draftTextSize} onChange={function(e){setDraftTextSize(Math.max(10,Math.min(28,Number(e.target.value)||14)));}} style={{...sinp,width:74}}/></div></div></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore icona</div><input type="color" value={widget2AccentColor} onChange={function(e){setWidget2AccentColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),noteWidget:{...widgetSettingsPayload().noteWidget,accentColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore titolo</div><input type="color" value={widget2TitleColor} onChange={function(e){setWidget2TitleColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),noteWidget:{...widgetSettingsPayload().noteWidget,titleColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore testo</div><input type="color" value={widget2BodyColor} onChange={function(e){setWidget2BodyColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),noteWidget:{...widgetSettingsPayload().noteWidget,bodyColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>Trasparenza sfondo widget</div><div style={{fontSize:12,color:subC}}>100% = completamente trasparente. 0% = sfondo pieno.</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draftBgAlpha}%</div></div><input type="range" min="0" max="100" step="1" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Number(e.target.value));}} style={{width:"100%"}}/><input type="number" min="0" max="100" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Math.max(0,Math.min(100,Number(e.target.value)||0)));}} style={{...sinp,width:90,marginTop:8}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>Aggiornamento automatico</div><div style={{fontSize:12,color:subC}}>Aggiorna i widget già installati quando cambi contenuti o impostazioni.</div></div><Toggle label="" checked={!!widget2AutoUpdate} onChange={function(){setWidget2AutoUpdate(!widget2AutoUpdate);}}/></div>
        <Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>Salva e aggiorna widget</Btn>
      </div>;
    }

    function WidgetGoalSettingsPanel(){
      var selectedGoal=(goals||[])[0]||null;
      var target=selectedGoal?Number(selectedGoal.target||0):0;
      var saved=selectedGoal?Number(selectedGoal.saved||0):0;
      var pct=target>0?Math.min(100,Math.round(saved/target*100)):0;
      var gColor=widget3AccentColor;
      var [draftBgAlpha,setDraftBgAlpha]=useState(Number(widget3BgAlpha)||65);
      function save(){
        var alpha=Math.max(0,Math.min(100,Number(draftBgAlpha)||65));
        setWidget3BgAlpha(alpha);
        saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),goalWidget:{...widgetSettingsPayload().goalWidget,bgAlpha:alpha,showPercent:!!widget3ShowPercent,showAmounts:!!widget3ShowAmounts,accentColor:widget3AccentColor,textColor:widget3TextColor,percentColor:widget3PercentColor}});
      }
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <WidgetIntroCard icon="🎯" title="Obiettivo">Questo widget mostra sulla Home l’avanzamento di un obiettivo di risparmio: nome, percentuale, barra e importi. L’obiettivo preciso si sceglie quando aggiungi il widget alla Home; qui modifichi aspetto e colori.</WidgetIntroCard>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{background:dark?"#111827":"#F8FAFC",border:"1px solid "+borderC,borderRadius:14,padding:12,display:"flex",alignItems:"center",gap:12}}><div style={{width:48,height:48,borderRadius:24,background:gColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff"}}>{selectedGoal?(selectedGoal.icon||"🎯"):"🎯"}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",gap:10}}><div style={{fontSize:16,fontWeight:900,color:widget3TextColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{selectedGoal?(selectedGoal.name||"Obiettivo"):"Anteprima obiettivo"}</div>{widget3ShowPercent&&<div style={{fontSize:16,fontWeight:900,color:widget3PercentColor}}>{pct}%</div>}</div><div style={{height:8,borderRadius:8,background:dark?"#273244":"#E5E7EB",overflow:"hidden",marginTop:8}}><div style={{width:pct+"%",height:"100%",background:gColor,borderRadius:8}}/></div>{widget3ShowAmounts&&<div style={{fontSize:12,color:widget3TextColor,marginTop:5,opacity:0.82}}><span style={{color:widget3PercentColor,fontWeight:800}}>{fmt(saved)}</span> / {fmt(target)}</div>}</div><div style={{fontSize:18,color:subC}}>⚙</div></div></div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>Mostra percentuale</div><div style={{fontSize:12,color:subC}}>Mostra la percentuale di avanzamento.</div></div><Toggle label="" checked={!!widget3ShowPercent} onChange={function(){setWidget3ShowPercent(!widget3ShowPercent);}}/></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:"12px 14px"}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>Mostra importi</div><div style={{fontSize:12,color:subC}}>Mostra importo raggiunto e target.</div></div><Toggle label="" checked={!!widget3ShowAmounts} onChange={function(){setWidget3ShowAmounts(!widget3ShowAmounts);}}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore barra/icona</div><input type="color" value={widget3AccentColor} onChange={function(e){setWidget3AccentColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),goalWidget:{...widgetSettingsPayload().goalWidget,accentColor:e.target.value,color:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore testo</div><input type="color" value={widget3TextColor} onChange={function(e){setWidget3TextColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),goalWidget:{...widgetSettingsPayload().goalWidget,textColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore percentuale</div><input type="color" value={widget3PercentColor} onChange={function(e){setWidget3PercentColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),goalWidget:{...widgetSettingsPayload().goalWidget,percentColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>Trasparenza sfondo widget</div><div style={{fontSize:12,color:subC}}>100% = completamente trasparente. 0% = sfondo pieno.</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draftBgAlpha}%</div></div><input type="range" min="0" max="100" step="1" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Number(e.target.value));}} style={{width:"100%"}}/><input type="number" min="0" max="100" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Math.max(0,Math.min(100,Number(e.target.value)||0)));}} style={{...sinp,width:90,marginTop:8}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>Aggiornamento automatico</div><div style={{fontSize:12,color:subC}}>Aggiorna il widget quando cambia l’obiettivo.</div></div><Toggle label="" checked={!!widget3AutoUpdate} onChange={function(){setWidget3AutoUpdate(!widget3AutoUpdate);}}/></div>
        <Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>Salva e aggiorna widget</Btn>
      </div>;
    }


    function WidgetShareSettingsPanel(){
      var selected=(shareProjects||[]).find(function(p){return String(p.id)===String(widgetShareSelectedProjectId);})||(shareProjects||[]).find(function(p){return String(p.id)===String(shareSelectedProjectId);})||(shareProjects||[])[0]||null;
      var [draftBgAlpha,setDraftBgAlpha]=useState(Number(widgetShareBgAlpha)||65);
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
        var alpha=Math.max(0,Math.min(100,Number(draftBgAlpha)||65));
        setWidgetShareBgAlpha(alpha);
        saveWidgetSettingsToNative(true,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,bgColor:widgetShareBgColor,bgAlpha:alpha,accentColor:widgetShareAccentColor,activityColor:widgetShareActivityColor,titleColor:widgetShareTitleColor,bodyColor:widgetShareBodyColor,projectId:selected?String(selected.id):"",projectName:selected?(selected.name||"Progetto Share"):"Nessun progetto selezionato",autoUpdate:!!widgetShareAutoUpdate}});
      }
      return <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <WidgetIntroCard icon="🤝" title="Share">Questo widget mostra sulla Home il riepilogo di un progetto Share: saldo personale, quanto devi, quanto ti devono e ultima attività. Il progetto può essere scelto qui come default e anche dal tasto di configurazione quando aggiungi il widget.</WidgetIntroCard>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:900,color:textC,marginBottom:5}}>Progetto mostrato nel widget</div>
          <div style={{fontSize:12,color:subC,marginBottom:8}}>Scegli il progetto predefinito. Ogni singolo widget potrà comunque essere configurato con un progetto diverso.</div>
          <select value={widgetShareSelectedProjectId||""} onChange={function(e){setWidgetShareSelectedProjectId(e.target.value);setShareSelectedProjectId(e.target.value||shareSelectedProjectId);}} style={{...sinp,width:"100%"}}>
            <option value="">Primo progetto disponibile</option>
            {(shareProjects||[]).map(function(p){return <option key={p.id} value={p.id}>{p.name||"Progetto Share"}</option>;})}
          </select>
        </div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}>
          <div style={{background:widgetShareBgColor,borderRadius:14,padding:12,border:"1px solid rgba(255,255,255,.18)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><FAInanceLogo size={34}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:900,color:widgetShareTitleColor}}>Share</div><div style={{fontSize:11,color:widgetShareBodyColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{selected?(selected.name||"Progetto Share"):"Nessun progetto selezionato"}</div></div><div style={{color:widgetShareTitleColor}}>⚙</div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{background:"rgba(255,255,255,.13)",borderRadius:12,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:widgetShareBodyColor}}>Saldo</div><div style={{fontSize:17,fontWeight:900,color:widgetShareTitleColor}}>{fmt(preview.net)}</div></div>
              <div style={{fontSize:11,color:widgetShareBodyColor,lineHeight:1.8}}><div>Ti devono: <strong style={{color:widgetShareTitleColor}}>{fmt(preview.owed)}</strong></div><div>Devi: <strong style={{color:widgetShareTitleColor}}>{fmt(preview.owe)}</strong></div><div style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{preview.last}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}><div style={{background:widgetShareAccentColor,color:"#fff",borderRadius:btnRadius,padding:"8px",textAlign:"center",fontWeight:900}}>+ Spesa</div><div style={{background:widgetShareActivityColor,color:"#fff",borderRadius:btnRadius,padding:"8px",textAlign:"center",fontWeight:900}}>Attività</div></div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 1fr",gap:10}}>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Sfondo</div><input type="color" value={widgetShareBgColor} onChange={function(e){setWidgetShareBgColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,bgColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore + Spesa</div><input type="color" value={widgetShareAccentColor} onChange={function(e){setWidgetShareAccentColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,accentColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore Attività</div><input type="color" value={widgetShareActivityColor} onChange={function(e){setWidgetShareActivityColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,activityColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore titolo</div><input type="color" value={widgetShareTitleColor} onChange={function(e){setWidgetShareTitleColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,titleColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:8}}>Colore testi secondari</div><input type="color" value={widgetShareBodyColor} onChange={function(e){setWidgetShareBodyColor(e.target.value);saveWidgetSettingsToNative(false,{...widgetSettingsPayload(),shareWidget:{...widgetSettingsPayload().shareWidget,bodyColor:e.target.value}});}} style={{width:54,height:42,border:"none",borderRadius:10,background:"transparent"}}/></div>
        </div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:8}}><div><div style={{fontSize:13,fontWeight:900,color:textC}}>Trasparenza sfondo widget</div><div style={{fontSize:12,color:subC}}>100% = completamente trasparente. 0% = sfondo pieno.</div></div><div style={{fontSize:16,fontWeight:900,color:"#7F77DD"}}>{draftBgAlpha}%</div></div><input type="range" min="0" max="100" step="1" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Number(e.target.value));}} style={{width:"100%"}}/><input type="number" min="0" max="100" value={draftBgAlpha} onChange={function(e){setDraftBgAlpha(Math.max(0,Math.min(100,Number(e.target.value)||0)));}} style={{...sinp,width:90,marginTop:8}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:14}}><div><div style={{fontSize:13,fontWeight:800,color:textC}}>Aggiornamento automatico</div><div style={{fontSize:12,color:subC}}>Aggiorna il widget quando cambiano progetti, spese o impostazioni Share.</div></div><Toggle label="" checked={!!widgetShareAutoUpdate} onChange={function(){setWidgetShareAutoUpdate(!widgetShareAutoUpdate);}}/></div>
        <Btn onClick={save} bg="#7F77DD" style={{width:"100%",padding:12,fontWeight:800}}>Salva e aggiorna widget</Btn>
      </div>;
    }

    function GroupSettingsPanel({title,desc,items,setItems,defaultValue,setDefaultValue,withIcon}){var _gspKey="gsp_view_"+encodeURIComponent(title||"");var [view,setView]=useStorage(_gspKey,"list");var [edit,setEdit]=useState(null);var [form,setForm]=useState({name:"",icon:"📂",color:COLORS[0]});function add(){if(!form.name.trim())return;setItems([...(items||[]),{id:"area_"+Date.now(),name:form.name.trim(),icon:withIcon?form.icon:undefined,color:form.color}]);setForm({name:"",icon:"📂",color:COLORS[0]});}function save(){if(!edit||!edit.name.trim())return;setItems(items.map(function(x){return x.id===edit.id?{...x,name:edit.name.trim(),icon:withIcon?edit.icon:x.icon,color:edit.color||COLORS[0]}:x;}));setEdit(null);}function del(id){setItems(items.filter(function(x){return x.id!==id;}));if(String(defaultValue)===String(id))setDefaultValue("");}function archive(id){setItems(items.map(function(x){return x.id===id?{...x,archived:!x.archived}:x;}));}return <div><PageHeader title={title}/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>{title}</div><SettingHint>{desc}</SettingHint><Segmented items={[{id:"list",label:"Lista"},{id:"order",label:"Riordina"},{id:"default",label:"Default"}]} value={view} onChange={setView}/>{view==="list"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{items.map(function(a){return edit&&edit.id===a.id?<div key={a.id} style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{withIcon&&<EmojiPicker value={edit.icon||"📂"} onChange={function(v){setEdit(function(p){return{...p,icon:v};});}}/>}<input type="color" value={edit.color||COLORS[0]} onChange={function(e){setEdit(function(p){return{...p,color:e.target.value};});}} style={{width:34,height:34,border:"none",borderRadius:8,padding:0}}/><input value={edit.name} onChange={function(e){setEdit(function(p){return{...p,name:e.target.value};});}} style={{...sinp,flex:1,minWidth:130}}/><Btn onClick={save} bg="#7F77DD">{V.save}</Btn><Btn onClick={function(){setEdit(null);}} bg={dark?"#333":"#f0f0f0"} color={textC}>{V.cancel}</Btn></div>:<div key={a.id} style={{background:cardBg,borderRadius:12,border:"1px solid "+borderC,padding:"12px 14px",display:"flex",alignItems:"center",gap:10,opacity:a.archived?0.55:1}}>{withIcon&&<span style={{fontSize:20}}>{a.icon||"📂"}</span>}<span style={{width:12,height:12,borderRadius:"50%",background:a.color||COLORS[0],flexShrink:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div>{a.archived&&<div style={{fontSize:11,color:subC}}>Archiviata</div>}</div><button onClick={function(){setEdit({...a});}} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:subC}}>✏️</button><button onClick={function(){archive(a.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:subC}}>{a.archived?"📂":"🗂"}</button><button onClick={function(){del(a.id);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#E24B4A"}}>🗑</button></div>;})}<div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px dashed "+borderC,padding:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{withIcon&&<EmojiPicker value={form.icon} onChange={function(v){setForm(function(p){return{...p,icon:v};});}}/>}<input type="color" value={form.color} onChange={function(e){setForm(function(p){return{...p,color:e.target.value};});}} style={{width:34,height:34,border:"none",borderRadius:8,padding:0}}/><input placeholder="Nuova area" value={form.name} onChange={function(e){setForm(function(p){return{...p,name:e.target.value};});}} onKeyDown={function(e){if(e.key==="Enter")add();}} style={{...sinp,flex:1,minWidth:140}}/><Btn onClick={add}>+</Btn></div></div>}{view==="order"&&<SortableRows items={items} onMove={function(i,dir){var j=i+dir;if(j<0||j>=items.length)return;var arr=items.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setItems(arr);}} renderItem={function(a){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>{withIcon&&<span style={{fontSize:20}}>{a.icon||"📂"}</span>}<span style={{width:12,height:12,borderRadius:"50%",background:a.color||COLORS[0],flexShrink:0}}/><div style={{fontSize:14,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div></div>;}}/>}{view==="default"&&<div><SettingHint>Valore preselezionato quando apri il form relativo a questa sezione.</SettingHint><select value={defaultValue||""} onChange={function(e){setDefaultValue(e.target.value);}} style={{...sinp,width:"100%"}}><option value="">Nessun default</option>{items.map(function(a){return <option key={a.id} value={a.id}>{withIcon?(a.icon||"📂")+" ":""}{a.name}</option>;})}</select></div>}</div></div>;}
    function ExpenseCategoriesSettings(){var [view,setView]=useStorage(userKey("expense_cats_settings_view_v1"),"list");var ordered=(catOrder&&catOrder.length?catOrder.map(function(id){return cats.find(function(c){return String(c.id)===String(id);});}).filter(Boolean).concat(cats.filter(function(c){return catOrder.map(String).indexOf(String(c.id))<0;})):cats);return <div><PageHeader title="Uscite / Categorie"/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><SettingHint>Gestisci categorie uscite: lista, riordino, default e accorpamento.</SettingHint><Segmented items={[{id:"list",label:"Lista categorie"},{id:"order",label:"Riordina"},{id:"default",label:"Default"},{id:"merge",label:"Accorpa"}]} value={view} onChange={setView}/>{view==="list"&&<SettingsList items={cats} setItems={setCats} label="Aggiungi categoria uscita" showGroup showIcon groupList={expenseGroups||DEFAULT_EXPENSE_GROUPS}/>} {view==="order"&&<div><Segmented items={[{id:"group",label:"Per Aree"},{id:"custom",label:"Personalizzato"}]} value={catSortMode} onChange={setCatSortMode}/>{catSortMode==="custom"&&<SortableRows items={ordered} onMove={function(i,dir){var j=i+dir;if(j<0||j>=ordered.length)return;var arr=ordered.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setCatOrder(arr.map(function(c){return c.id;}));setCats(arr.concat(cats.filter(function(c){return arr.findIndex(function(x){return String(x.id)===String(c.id);})<0;})));}} renderItem={function(c){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>{c.icon}</span><span style={{fontSize:13,color:textC,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span></div>;}}/>}</div>}{view==="default"&&<div><select value={defaultExpenseCat||""} onChange={function(e){setDefaultExpenseCat(e.target.value);}} style={{...sinp,width:"100%"}}><option value="">Nessuna categoria default</option>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div>}{view==="merge"&&<div><div style={{marginBottom:12}}><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>Da (elimina)</label><select value={mergeFrom} onChange={function(e){setMergeFrom(e.target.value);}} style={sinp}><option value="">-</option>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div><div style={{marginBottom:16}}><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>In (mantieni)</label><select value={mergeTo} onChange={function(e){setMergeTo(e.target.value);}} style={sinp}><option value="">-</option>{cats.filter(function(c){return String(c.id)!==mergeFrom;}).map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div><Btn onClick={function(){if(!mergeFrom||!mergeTo)return;setExpenses(expenses.map(function(e){return e.catId===Number(mergeFrom)?{...e,catId:Number(mergeTo)}:e;}));setCats(cats.filter(function(c){return c.id!==Number(mergeFrom);}));setMergeFrom("");setMergeTo("");}} style={{width:"100%",padding:13,fontSize:14,fontWeight:600}}>Accorpa</Btn></div>}</div></div>;}
    function ExpenseMethodsSettings(){var [view,setView]=useStorage(userKey("expense_methods_settings_view_v1"),"list");var ordered=(methodOrder&&methodOrder.length?methodOrder.map(function(id){return methods.find(function(m){return String(m.id)===String(id);});}).filter(Boolean).concat(methods.filter(function(m){return methodOrder.map(String).indexOf(String(m.id))<0;})):methods);return <div><PageHeader title="Uscite / Metodi di pagamento"/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><SettingHint>Gestisci metodi di pagamento: lista, riordino e default.</SettingHint><Segmented items={[{id:"list",label:"Lista"},{id:"order",label:"Riordina"},{id:"default",label:"Default"}]} value={view} onChange={setView}/>{view==="list"&&<div><SettingsList items={methods} setItems={setMethods} label="Aggiungi metodo di pagamento" showIcon showGroup groupList={methodGroups} isMethod/><div style={{fontSize:12,color:subC,marginTop:8}}>🗂 = Archivia  📂 = Ripristina</div></div>}{view==="order"&&<SortableRows items={ordered} onMove={function(i,dir){var j=i+dir;if(j<0||j>=ordered.length)return;var arr=ordered.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setMethodOrder(arr.map(function(m){return m.id;}));setMethods(arr.concat(methods.filter(function(m){return arr.findIndex(function(x){return String(x.id)===String(m.id);})<0;})));}} renderItem={function(m){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>{m.icon}</span><span style={{fontSize:13,color:textC,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span></div>;}}/>}{view==="default"&&<select value={defaultExpenseMethod||""} onChange={function(e){setDefaultExpenseMethod(e.target.value);}} style={{...sinp,width:"100%"}}><option value="">Nessun metodo default</option>{methods.map(function(m){return <option key={m.id} value={m.id}>{m.icon} {m.name}</option>;})}</select>}</div></div>;}
    function IncomeCategoriesSettings(){
      var [view,setView]=useStorage(userKey("income_cats_settings_view_v1"),"list");
      var groups=incomeGroups||DEFAULT_INCOME_GROUPS;
      function incomeDefaultGroup(id){if(id==="azioni")return "investimenti";if(id==="extra")return "extra_inc";if(id==="conti")return "investimenti";return "lavoro";}
      var orderedRaw=incomeTypeOrder.length?incomeTypeOrder.map(function(id){return incomeTypes.find(function(x){return x.id===id;});}).filter(Boolean).concat(incomeTypes.filter(function(x){return incomeTypeOrder.indexOf(x.id)<0;})):incomeTypes;
      var ordered=orderedRaw.map(function(it){return {...it,group:it.group||incomeDefaultGroup(it.id),color:it.color||"#5DCAA5",icon:it.icon||"💰"};});
      function setIncomeItems(nextItems){
        var nextCustom=[];var nextOverrides={...incomeTypeOverrides};var nextOrder=[];
        (nextItems||[]).forEach(function(it){
          nextOrder.push(it.id);
          var clean={name:it.name,icon:it.icon||"💰",color:it.color||"#5DCAA5",group:it.group||(groups[0]?groups[0].id:"lavoro"),archived:!!it.archived};
          var isBase=INCOME_TYPES.some(function(b){return b.id===it.id;});
          if(isBase){nextOverrides[it.id]=clean;}else{nextCustom.push({...it,...clean,custom:true});}
        });
        setIncomeTypeOverrides(nextOverrides);
        setCustomIncomeTypes(nextCustom);
        setIncomeTypeOrder(nextOrder);
      }
      function moveIncome(i,dir){var j=i+dir;if(j<0||j>=ordered.length)return;var arr=ordered.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setIncomeTypeOrder(arr.map(function(x){return x.id;}));}
      return <div><PageHeader title="Entrate / Categorie"/><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}><SettingHint>Gestisci le categorie delle entrate con la stessa interfaccia delle altre liste: modifica, archivia, cancella, riordina e default.</SettingHint><Segmented items={[{id:"list",label:"Lista"},{id:"order",label:"Riordina"},{id:"default",label:"Default"}]} value={view} onChange={setView}/>
        {view==="list"&&<SettingsList items={ordered} setItems={setIncomeItems} label="Aggiungi categoria entrata" showIcon showGroup groupList={groups}/>} 
        {view==="order"&&<SortableRows items={ordered} onMove={moveIncome} renderItem={function(it){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>{it.icon||"💰"}</span><div style={{width:10,height:10,borderRadius:"50%",background:it.color||"#5DCAA5",flexShrink:0}}/><span style={{fontSize:13,color:textC,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.name}</span>{it.archived&&<span style={{fontSize:10,background:dark?"#333":"#f0f0f0",color:subC,borderRadius:10,padding:"1px 6px"}}>Archiviato</span>}</div>;}}/>}
        {view==="default"&&<select value={defaultIncomeType||""} onChange={function(e){setDefaultIncomeType(e.target.value);}} style={{...sinp,width:"100%"}}><option value="">Nessuna categoria default</option>{ordered.filter(function(it){return !it.archived;}).map(function(it){return <option key={it.id} value={it.id}>{it.icon} {it.name}</option>;})}</select>}
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
          {[{label:"🌐 Lingua",el:<div><select value={pendingLang} onChange={function(e){setPendingLang(e.target.value);}} style={{...sinp,width:"100%",marginBottom:8}}>{LANGUAGES.map(function(l){return <option key={l.code} value={l.code}>{l.label}</option>;})}</select><Btn onClick={function(){setLang(pendingLang);try{localStorage.setItem("pref_lang_v2",JSON.stringify(pendingLang));}catch(e){};setToast("Lingua aggiornata");setTimeout(function(){window.location.reload();},250);}} bg="#7F77DD" style={{width:"100%",padding:10}}>Salva lingua</Btn><div style={{fontSize:11,color:subC,marginTop:6}}>La lingua viene applicata salvando e ricaricando l’app.</div></div>},{label:"📅 Formato data",el:<Segmented items={DATE_FORMATS.map(function(f){return{id:f.id,label:f.label};})} value={dateFmt} onChange={setDateFmt}/>},{label:"📅 Primo giorno settimana",el:<Segmented items={[{id:"mon",label:"Lunedì"},{id:"sun",label:"Domenica"}]} value={firstDayOfWeek} onChange={setFirstDayOfWeek}/>}].map(function(item,i,arr){return <div key={item.label} style={{background:cardBg,padding:"16px 20px",borderBottom:i<arr.length-1?"1px solid "+borderC:"none"}}><div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:8}}>{item.label}</div>{item.el}</div>;})}
        </div>

        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>💱 Valute</div>
          <SettingHint>Gestisci valuta principale e valuta secondaria con ricerca tra tutte le valute disponibili.</SettingHint>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12,alignItems:"start"}}>
            <div><div style={{fontSize:13,fontWeight:700,color:textC,marginBottom:6}}>Valuta principale</div><CurrencyPicker value={currency} onChange={setCurrency}/></div>
            <div><div style={{fontSize:13,fontWeight:700,color:textC,marginBottom:6}}>Valuta secondaria</div><CurrencyPicker value={secondaryCurrency} onChange={setSecondaryCurrency} exclude={currency} allowNone/></div>
          </div>
          {secondaryCurrency&&<div style={{display:"flex",flexDirection:"column",gap:10,background:dark?"#252535":"#f9f9f9",borderRadius:12,padding:"14px 16px",border:"1px solid "+borderC,marginTop:12}}>
            <div style={{fontSize:12,fontWeight:700,color:subC}}>Mostra {secondaryCurrency} in:</div>
            {[{label:"🏠 Home",always:true},{label:"📋 Storico",v:showSecInHistory,fn:function(){setShowSecInHistory(!showSecInHistory);}},{label:"📊 Statistiche",v:showSecInStats,fn:function(){setShowSecInStats(!showSecInStats);}},{label:"💰 Budget",v:showSecInBudget,fn:function(){setShowSecInBudget(!showSecInBudget);}},{label:"💎 Patrimonio",v:showSecInPatrimonio,fn:function(){setShowSecInPatrimonio(!showSecInPatrimonio);}}].map(function(item,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:item.always?subC:textC}}>{item.label}</span>{item.always?<span style={{fontSize:11,background:dark?"#333":"#f0f0f0",color:"#aaa",borderRadius:8,padding:"2px 8px"}}>sempre</span>:<Toggle label="" checked={item.v} onChange={item.fn}/>}</div>;})}
          </div>}
        </div>

        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:4}}>📊 Metriche</div>
          <SettingHint>Saldo home e visualizzazione valori.</SettingHint>
          <div style={{marginTop:12,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:6}}>🏠 Saldo Home</div>
            <Segmented items={[{id:"reale",label:"Reale"},{id:"rateizzato",label:"Rateizzato"}]} value={homeBalanceView} onChange={setHomeBalanceView}/>
          </div>

        </div>

        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><AIGrilloIcon size={46}/><div style={{fontSize:14,fontWeight:700,color:textC}}>IA</div></div>
          <SettingHint>Scegli quali dati l’agente AI può leggere quando risponde nella chat.</SettingHint>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:12}}>
            {[
              {id:"summary",icon:"📊",title:"Analisi limitata",desc:"Solo riassunto delle spese: totali mensili/annuali, saldo, categorie principali, budget e ricorrenti."},
              {id:"areas",icon:"📂",title:"Analisi media",desc:"Riassunto + spese raggruppate per area, utile per capire quali blocchi di spesa pesano di più."},
              {id:"full",icon:"🔎",title:"Analisi completa",desc:"Tutte le transazioni essenziali: data, importo, categoria/metodo o tipo entrata e descrizione."}
            ].map(function(opt){var active=aiDataAccess===opt.id;return <button key={opt.id} onClick={function(){setAiDataAccess(opt.id);setToast("Impostazioni IA aggiornate");}} style={{width:"100%",textAlign:"left",display:"flex",gap:12,alignItems:"flex-start",padding:"13px 14px",borderRadius:12,border:"1.5px solid "+(active?"#7F77DD":borderC),background:active?"linear-gradient(135deg,#f0edff,#e8f4ff)":(dark?"#252535":"#fff"),cursor:"pointer",boxShadow:active?"0 3px 12px rgba(127,119,221,0.16)":"none"}}>
              <span style={{fontSize:22,lineHeight:1.1}}>{opt.icon}</span>
              <span style={{flex:1}}>
                <span style={{display:"block",fontSize:13,fontWeight:800,color:active?"#534AB7":textC,marginBottom:3}}>{opt.title}</span>
                <span style={{display:"block",fontSize:12,color:subC,lineHeight:1.45}}>{opt.desc}</span>
              </span>
              {active&&<span style={{fontSize:16,color:"#7F77DD",fontWeight:800}}>✓</span>}
            </button>;})}
          </div>
          <div style={{marginTop:14,background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10}}><AIGrilloIcon size={42}/><div style={{fontSize:13,fontWeight:700,color:textC}}>Icona rapida Consulente AI</div></div>
              <div style={{fontSize:12,color:subC,marginTop:3,lineHeight:1.4}}>Mostra un pulsante flottante in basso a destra per aprire subito la chat AI.</div>
            </div>
            <Toggle label="" checked={aiFloatingEnabled} onChange={function(){setAiFloatingEnabled(!aiFloatingEnabled);setToast("Impostazioni IA aggiornate");}}/>
          </div>
          <div style={{fontSize:11,color:subC,marginTop:10,lineHeight:1.45}}>Questa impostazione viene applicata solo alle richieste inviate all’agente AI esterno. I consigli locali dell’app continuano a usare i dati già presenti sul dispositivo.</div>
        </div>
      </div>
    </div>;

    if(settingsPage==="sections")return <div><PageHeader title="Sezioni"/><SettingsCards items={[
      {id:"sections_income",icon:"💰",label:"Entrate",desc:"Aree e categorie delle entrate"},
      {id:"sections_expense",icon:"💸",label:"Uscite",desc:"Aree, categorie e metodi di pagamento"},
      {id:"patrimonio_settings",icon:"💎",label:"Patrimonio",desc:"Modalità, aree e voci patrimonio"},
      {id:"history_settings",icon:"📋",label:t.history||"Storico",desc:"Ordinamento e movimenti futuri"}
    ]}/></div>;

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
        {[{id:"cats",icon:"💸",label:"Uscite"},{id:"income_types",icon:"💰",label:"Entrate"},{id:"methods",icon:"💳",label:"Metodi di pagamento"},{id:"areas",icon:"📂",label:"Aree"},{id:"patrimonio",icon:"💎",label:"Patrimonio"},{id:"merge",icon:"↔",label:"Accorpa"},{id:"order",icon:"↕",label:"Ordine"},{id:"defaultcat",icon:"⭐",label:"Default"}].map(function(st){return <Btn key={st.id} onClick={function(){setSettingsValuesTab(st.id);}} bg={settingsValuesTab===st.id?(dark?"#444":"#333"):(dark?"#333":"#f0f0f0")} color={settingsValuesTab===st.id?"#fff":(dark?"#eee":"#555")} style={{fontSize:13,padding:"8px 14px"}}>{st.icon} {st.label}</Btn>;})}
</div>
      {settingsValuesTab==="cats"&&<SettingsList items={cats} setItems={setCats} label="Aggiungi categoria uscita" showGroup showIcon groupList={expenseGroups||DEFAULT_EXPENSE_GROUPS}/>}
      {settingsValuesTab==="income_types"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div style={{background:dark?"#1e2a1e":"#f0faf5",borderRadius:10,border:"1px solid "+(dark?"#2a5a2a":"#a8e6c8"),padding:"10px 14px",marginBottom:4}}>
          <div style={{fontSize:12,color:dark?"#7ec":"#1D9E75",fontWeight:600,marginBottom:2}}>💰 Tipi di entrata</div>
          <div style={{fontSize:12,color:dark?"#aaa":"#555"}}>I tipi di entrata sono predefiniti dal sistema (Busta paga, Bonus, Azioni, ecc.). Puoi modificarne nome e icona.</div>
        </div>
        {incomeTypes.map(function(it){return <div key={it.id} style={{background:cardBg,borderRadius:10,border:"1px solid "+borderC,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>{it.icon}</span>
          <div style={{width:12,height:12,borderRadius:"50%",background:it.color,flexShrink:0}}/>
          <span style={{flex:1,fontSize:14,color:textC}}>{it.name}</span>
        </div>;})}
        <div style={{fontSize:12,color:subC,marginTop:4}}>Le categorie personalizzate si aggiungono da Sezioni → Entrate → Categorie.</div>
      </div>}
      {settingsValuesTab==="methods"&&<div><SettingsList items={methods} setItems={setMethods} label="Aggiungi metodo di pagamento" showIcon showGroup groupList={methodGroups} isMethod/><div style={{fontSize:12,color:subC,marginTop:8}}>🗂 = Archivia  📂 = Ripristina</div></div>}
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
        <div style={{fontSize:12,color:subC,marginTop:4}}>🗂 = Archivia  📂 = Ripristina · Le aree si gestiscono in Aree → Patrimonio</div>
      </div>}
      {settingsValuesTab==="order"&&<div key="order-panel"><SortOrderPanel/></div>}
      {settingsValuesTab==="defaultcat"&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
        <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:4}}>⭐ Categoria default</div>
        <div style={{fontSize:12,color:subC,marginBottom:12}}>Categoria preselezionata quando apri il form di inserimento uscita</div>
        <select style={sinp}><option value="">Nessuna (prima della lista)</option>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select>
        <div style={{display:"flex",alignItems:"flex-start",gap:8,marginTop:10,background:dark?"#252535":"#f0f4ff",borderRadius:10,padding:"10px 12px",border:"1px solid "+(dark?"#3a3a5a":"#c7d7f8")}}>
          <span style={{fontSize:16,flexShrink:0}}>ℹ️</span>
          <span style={{fontSize:12,color:dark?"#aac":"#446"}}>Questa impostazione definisce solo la <strong>visualizzazione predefinita</strong>: la categoria preselezionata all'apertura del form. Se selezioni manualmente una categoria diversa al momento dell'inserimento, quella scelta ha sempre la precedenza.</span>
        </div>
      </div>}
      {settingsValuesTab==="merge"&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
        <div style={{marginBottom:12}}><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>Da (elimina)</label><select value={mergeFrom} onChange={function(e){setMergeFrom(e.target.value);}} style={sinp}><option value="">-</option>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div>
        <div style={{marginBottom:16}}><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>In (mantieni)</label><select value={mergeTo} onChange={function(e){setMergeTo(e.target.value);}} style={sinp}><option value="">-</option>{cats.filter(function(c){return String(c.id)!==mergeFrom;}).map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div>
        <Btn onClick={function(){if(!mergeFrom||!mergeTo)return;setExpenses(expenses.map(function(e){return e.catId===Number(mergeFrom)?{...e,catId:Number(mergeTo)}:e;}));setCats(cats.filter(function(c){return c.id!==Number(mergeFrom);}));setMergeFrom("");setMergeTo("");}} style={{width:"100%",padding:13,fontSize:14,fontWeight:600}}>Accorpa</Btn>
      </div>}
    </div>;

    if(settingsPage==="notifications"){
      var np=notifPrefs||{};
      function setNp(k,v){setNotifPrefs(function(p){return{...p,[k]:v};});}
      var [showNewNotif,setShowNewNotif]=useState(false);
      var [editNotifId,setEditNotifId]=useState(null);
      var emptyNotif={title:"",text:"",hour:"09:00",freq:"monthly",dayOfMonth:1,dayOfWeek:1,date:todayStr(),active:true};
      var [newNotif,setNewNotif]=useState(emptyNotif);
      function saveNotif(){
        if(!newNotif.title.trim())return;
        if(editNotifId){
          setCustomNotifs(function(p){return p.map(function(n){return n.id===editNotifId?{...newNotif,id:editNotifId}:n;});});
          setEditNotifId(null);
        } else {
          setCustomNotifs(function(p){return [...p,{...newNotif,id:Date.now()}];});
        }
        setNewNotif(emptyNotif);setShowNewNotif(false);
      }
      function startEditNotif(n){setNewNotif({title:n.title,text:n.text||"",hour:n.hour||"09:00",freq:n.freq||"monthly",dayOfMonth:n.dayOfMonth||1,dayOfWeek:n.dayOfWeek||1,date:n.date||todayStr(),active:n.active!==false});setEditNotifId(n.id);setShowNewNotif(true);}
      function delNotif(id){setCustomNotifs(function(p){return p.filter(function(n){return n.id!==id;});});}
      function toggleNotif(id){setCustomNotifs(function(p){return p.map(function(n){return n.id===id?{...n,active:!n.active}:n;});});}
      var FREQ_LABELS={daily:"Ogni giorno",weekly:"Ogni settimana",monthly:"Ogni mese",yearly:"Ogni anno",once:"Una tantum"};
      var DOW=["Dom","Lun","Mar","Mer","Gio","Ven","Sab"];
      return <div><PageHeader title="Notifiche & Promemoria"/>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* Promemoria inserimento */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
            <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:4}}>⏰ Promemoria inserimento spese</div>
            <div style={{fontSize:12,color:subC,marginBottom:14}}>Ricevere un promemoria per inserire le spese del giorno</div>
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
              <div style={{background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:8,padding:"10px 12px"}}><span style={{fontSize:12,color:"#856404"}}>ℹ️ I promemoria richiedono i permessi di notifica del browser. Clicca "Attiva" per abilitarli.</span></div>
            </div>}
          </div>

          {/* Notifiche di sistema */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
            <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:14}}>🔔 Notifiche di sistema</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:dark?"#252535":"#f9f9f9",borderRadius:10,border:"1px solid "+(dark?"#333":"#f0f0f0")}}>
                <div><div style={{fontSize:13,fontWeight:600,color:textC}}>💼 Stipendio</div><div style={{fontSize:12,color:subC}}>Notifica il giorno del mese configurato</div></div>
                <Toggle label="" checked={!!np.stipendioActive} onChange={function(){setNp("stipendioActive",!np.stipendioActive);}}/>
              </div>
              {np.stipendioActive&&<div style={{display:"flex",alignItems:"center",gap:10,paddingLeft:12}}>
                <span style={{fontSize:12,color:subC}}>Giorno:</span>
                <input type="number" min="1" max="31" value={np.stipendioDay||27} onChange={function(e){setNp("stipendioDay",parseInt(e.target.value)||27);}} style={{...sinp,width:70}}/>
                <span style={{fontSize:12,color:subC}}>di ogni mese</span>
              </div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:dark?"#252535":"#f9f9f9",borderRadius:10,border:"1px solid "+(dark?"#333":"#f0f0f0")}}>
                <div><div style={{fontSize:13,fontWeight:600,color:textC}}>🔄 Spese ricorrenti</div><div style={{fontSize:12,color:subC}}>Avviso quando ci sono ricorrenti da confermare</div></div>
                <Toggle label="" checked={!!np.spesaRicorrente} onChange={function(){setNp("spesaRicorrente",!np.spesaRicorrente);}}/>
              </div>
            </div>
          </div>

          {/* Notifiche custom */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:600,color:textC}}>✏️ Notifiche personalizzate</div>
              {!showNewNotif&&<button onClick={function(){setNewNotif(emptyNotif);setEditNotifId(null);setShowNewNotif(true);}} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:500}}>+ Nuova</button>}
            </div>

            {/* Form crea/modifica */}
            {showNewNotif&&<div style={{background:dark?"#1e1e30":"#f5f5ff",borderRadius:12,border:"1px solid #AFA9EC",padding:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:"#534AB7",marginBottom:12}}>{editNotifId?"Modifica notifica":"Nuova notifica"}</div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Titolo *</label>
                  <input type="text" placeholder="Es. Pagamento affitto" value={newNotif.title} onChange={function(e){setNewNotif(function(p){return{...p,title:e.target.value};});}} style={sinp}/>
                </div>
                <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Testo (opzionale)</label>
                  <input type="text" placeholder="Es. Ricorda di pagare l'affitto di questo mese" value={newNotif.text} onChange={function(e){setNewNotif(function(p){return{...p,text:e.target.value};});}} style={sinp}/>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Orario</label>
                    <input type="time" value={newNotif.hour} onChange={function(e){setNewNotif(function(p){return{...p,hour:e.target.value};});}} style={sinp}/>
                  </div>
                  <div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Frequenza</label>
                    <select value={newNotif.freq} onChange={function(e){setNewNotif(function(p){return{...p,freq:e.target.value};});}} style={sinp}>
                      <option value="daily">Ogni giorno</option>
                      <option value="weekly">Ogni settimana</option>
                      <option value="monthly">Ogni mese</option>
                      <option value="yearly">Ogni anno</option>
                      <option value="once">Una tantum</option>
                    </select>
                  </div>
                </div>
                {newNotif.freq==="weekly"&&<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Giorno della settimana</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {DOW.map(function(d,i){return <button key={i} onClick={function(){setNewNotif(function(p){return{...p,dayOfWeek:i};});}} style={{padding:"5px 10px",borderRadius:6,border:"1px solid "+(newNotif.dayOfWeek===i?"#7F77DD":borderC),background:newNotif.dayOfWeek===i?"#EEEDFE":(dark?"#252535":"#f5f5f5"),color:newNotif.dayOfWeek===i?"#534AB7":textC,fontSize:12,cursor:"pointer"}}>{d}</button>;})}
                  </div>
                </div>}
                {newNotif.freq==="monthly"&&<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Giorno del mese</label>
                  <input type="number" min="1" max="31" value={newNotif.dayOfMonth} onChange={function(e){setNewNotif(function(p){return{...p,dayOfMonth:parseInt(e.target.value)||1};});}} style={{...sinp,width:80}}/>
                </div>}
                {newNotif.freq==="yearly"&&<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Data (GG/MM)</label>
                  <input type="date" value={newNotif.date} onChange={function(e){setNewNotif(function(p){return{...p,date:e.target.value};});}} style={{...sinp,width:"auto"}}/>
                </div>}
                {newNotif.freq==="once"&&<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>Data</label>
                  <input type="date" value={newNotif.date} onChange={function(e){setNewNotif(function(p){return{...p,date:e.target.value};});}} style={{...sinp,width:"auto"}}/>
                </div>}
              </div>
              <div style={{display:"flex",gap:8,marginTop:14}}>
                <Btn onClick={saveNotif} bg="#7F77DD" style={{flex:1,padding:"10px",fontWeight:600}}>{editNotifId?"Salva modifiche":"Crea notifica"}</Btn>
                <Btn onClick={function(){setShowNewNotif(false);setEditNotifId(null);setNewNotif(emptyNotif);}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"} style={{padding:"10px 16px"}}>{V.cancel}</Btn>
              </div>
            </div>}

            {/* Lista notifiche custom */}
            {customNotifs.length===0&&!showNewNotif&&<div style={{textAlign:"center",color:subC,fontSize:13,padding:"20px 0"}}>Nessuna notifica personalizzata. Clicca "+ Nuova" per crearne una.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {customNotifs.map(function(n){return <div key={n.id} style={{padding:"12px 14px",background:n.active?(dark?"#252535":"#f9f9f9"):(dark?"#1a1a28":"#f5f5f5"),borderRadius:10,border:"1px solid "+(n.active?(dark?"#333":"#e8e8e8"):(dark?"#2a2a3e":"#ddd")),opacity:n.active?1:0.65}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:2}}>{n.title}</div>
                    {n.text&&<div style={{fontSize:12,color:subC,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.text}</div>}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                      <span style={{fontSize:11,background:"#EEEDFE",color:"#534AB7",borderRadius:6,padding:"2px 8px"}}>{FREQ_LABELS[n.freq]||n.freq}</span>
                      <span style={{fontSize:11,color:subC}}>🕐 {n.hour||"09:00"}</span>
                      {n.freq==="monthly"&&<span style={{fontSize:11,color:subC}}>📅 giorno {n.dayOfMonth}</span>}
                      {n.freq==="weekly"&&<span style={{fontSize:11,color:subC}}>📅 {DOW[n.dayOfWeek||0]}</span>}
                      {(n.freq==="once"||n.freq==="yearly")&&n.date&&<span style={{fontSize:11,color:subC}}>📅 {fmtDate(n.date,"dmy")}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                    <Toggle label="" checked={n.active!==false} onChange={function(){toggleNotif(n.id);}}/>
                    <button onClick={function(){startEditNotif(n);}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14,padding:"2px 4px"}}>✏</button>
                    <button onClick={function(){delNotif(n.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:14,padding:"2px 4px"}}>×</button>
                  </div>
                </div>
              </div>;})}
            </div>
          </div>
        </div>
      </div>;
    }

    if(settingsPage==="patrimonio_settings")return <div><PageHeader title="Patrimonio"/><SettingsCards items={[{id:"patrimonio_areas_settings",icon:"📂",label:"Aree",desc:"Lista e riordino aree patrimonio"},{id:"patrimonio_entries_settings",icon:"💎",label:"Voci",desc:"Lista e riordino voci patrimonio"},{id:"patrimonio_mode_settings",icon:"⚙️",label:"Modalità",desc:"Come vengono aggiornati i valori del patrimonio"}]}/></div>;
    if(settingsPage==="patrimonio_areas_settings")return <div><PageHeader title="Patrimonio / Aree"/><PatrimonioSettingsPanel forcedSection="areas"/></div>;
    if(settingsPage==="patrimonio_entries_settings")return <div><PageHeader title="Patrimonio / Voci"/><PatrimonioSettingsPanel forcedSection="entries"/></div>;
    if(settingsPage==="patrimonio_mode_settings")return <div><PageHeader title="Patrimonio / Modalità"/><PatrimonioSettingsPanel forcedSection="mode"/></div>;

    if(settingsPage==="appearance")return <div><PageHeader title="Aspetto"/><SettingsCards items={[
      {id:"appearance_app",icon:"🎨",label:"App",desc:"Tema, sfondo, stile e colori dei pulsanti dell’app"},
      {id:"appearance_widget",icon:"🧩",label:"Widget",desc:"Configurazione separata del widget Android"}
    ]}/></div>;

    if(settingsPage==="appearance_app")return <div><PageHeader title="Aspetto / App"/>
      <div style={{display:"flex",flexDirection:"column",gap:0,borderRadius:14,overflow:"hidden",border:"1px solid "+borderC}}>
        <div style={{background:cardBg,padding:"16px 20px",borderBottom:"1px solid "+borderC}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:10}}>🌙 Dark Mode</div>
          <Toggle label="Attiva la dark mode" checked={dark} onChange={function(){setBgTheme(dark?"default":"dark");}} color="#7F77DD"/>
        </div>
        <div style={{background:cardBg,padding:"16px 20px",borderBottom:"1px solid "+borderC}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>🎨 Sfondo</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>{BG_THEMES.map(function(th){return <button key={th.id} onClick={function(){setBgTheme(th.id);}} style={{padding:"10px 6px",border:"2px solid "+(bgTheme===th.id?"#7F77DD":borderC),borderRadius:12,background:th.bg,cursor:"pointer",fontSize:11,color:th.dark?"#eee":"#333",fontWeight:bgTheme===th.id?600:400,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}><div style={{width:22,height:22,borderRadius:6,background:th.bg,border:"1px solid #ccc"}}/>{bgTheme===th.id&&<span style={{fontSize:9,color:"#7F77DD"}}>✓</span>}<span>{th.label}</span></button>;}) }</div>
        </div>
        <div style={{background:cardBg,padding:"16px 20px",borderBottom:"1px solid "+borderC}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>🔲 Stile pulsanti</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{BUTTON_STYLES.map(function(bs){return <button key={bs.id} onClick={function(){setBtnStyle(bs.id);}} style={{padding:"12px",border:"2px solid "+(btnStyle===bs.id?"#7F77DD":borderC),borderRadius:bs.r,background:btnStyle===bs.id?(dark?"#2a2a3e":"#EEEDFE"):(dark?"#1e1e30":"#f9f9f9"),cursor:"pointer",fontSize:13,color:btnStyle===bs.id?"#7F77DD":textC,fontWeight:btnStyle===bs.id?600:400}}>{bs.label}</button>;}) }</div>
        </div>
        <div style={{background:cardBg,padding:"16px 20px",borderBottom:"1px solid "+borderC}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>🔴 Colore uscite</div>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><input type="color" value={expenseColor} onChange={function(e){setExpenseColor(e.target.value);}} style={{width:48,height:40,padding:0,border:"none",borderRadius:8,cursor:"pointer"}}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["#E24B4A","#D85A30","#B33030","#C0392B","#E67E22","#8E44AD"].map(function(c){return <button key={c} onClick={function(){setExpenseColor(c);}} style={{width:28,height:28,background:c,border:expenseColor===c?"3px solid #333":"2px solid transparent",borderRadius:"50%",cursor:"pointer",padding:0}}/>;}) }</div><div style={{background:expenseColor,color:"#fff",borderRadius:btnRadius,padding:"8px 16px",fontSize:13,fontWeight:500}}>Anteprima</div></div>
        </div>
        <div style={{background:cardBg,padding:"16px 20px"}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>🟢 Colore entrate</div>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><input type="color" value={incomeColor} onChange={function(e){setIncomeColor(e.target.value);}} style={{width:48,height:40,padding:0,border:"none",borderRadius:8,cursor:"pointer"}}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["#1D9E75","#27AE60","#16A085","#2ECC71","#3498DB","#0D6EFD"].map(function(c){return <button key={c} onClick={function(){setIncomeColor(c);}} style={{width:28,height:28,background:c,border:incomeColor===c?"3px solid #333":"2px solid transparent",borderRadius:"50%",cursor:"pointer",padding:0}}/>;}) }</div><div style={{background:incomeColor,color:"#fff",borderRadius:btnRadius,padding:"8px 16px",fontSize:13,fontWeight:500}}>Anteprima</div></div>
        </div>
        <div style={{background:cardBg,padding:"16px 20px",borderTop:"1px solid "+borderC}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>✅ Colore bottoni di conferma</div>
          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}><input type="color" value={confirmButtonColor} onChange={function(e){setConfirmButtonColor(e.target.value);}} style={{width:48,height:40,padding:0,border:"none",borderRadius:8,cursor:"pointer"}}/><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["#7F77DD","#378ADD","#1D9E75","#EF9F27","#8E44AD","#222222"].map(function(c){return <button key={c} onClick={function(){setConfirmButtonColor(c);}} style={{width:28,height:28,background:c,border:confirmButtonColor===c?"3px solid #333":"2px solid transparent",borderRadius:"50%",cursor:"pointer",padding:0}}/>;}) }</div><div style={{background:confirmButtonColor,color:"#fff",borderRadius:btnRadius,padding:"8px 16px",fontSize:13,fontWeight:500}}>Anteprima conferma</div></div>
        </div>
      </div>
    </div>;

    if(settingsPage==="appearance_widget")return <div><PageHeader title="Aspetto / Widget"/><WidgetAppearancePanel/></div>;
    if(settingsPage==="appearance_widget_quick")return <div><PageHeader title="Aggiunta Rapida"/><WidgetQuickAddSettingsPanel/></div>;
    if(settingsPage==="appearance_widget_note")return <div><PageHeader title="Nota / Coordinata"/><WidgetNoteSettingsPanel/></div>;
    if(settingsPage==="appearance_widget_goal")return <div><PageHeader title="Obiettivo"/><WidgetGoalSettingsPanel/></div>;
    if(settingsPage==="appearance_widget_share")return <div><PageHeader title="Share"/><WidgetShareSettingsPanel/></div>;

    if(settingsPage==="history_settings")return <div><PageHeader title="Storico"/>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:4}}>📋 Ordinamento storico</div>
          <SettingHint>Scegli quale data usare per ordinare uscite ed entrate.</SettingHint>
          <Segmented items={[{id:"operation",label:"Data operazione"},{id:"created",label:"Data inserimento"}]} value={historySortDate} onChange={setHistorySortDate}/>
          <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:4}}>↕ Direzione ordinamento</div>
          <SettingHint>Decidi se mostrare prima i movimenti più recenti o quelli più vecchi.</SettingHint>
          <Segmented items={[{id:"desc",label:"Più recenti"},{id:"asc",label:"Più vecchi"}]} value={historySortDirection} onChange={setHistorySortDirection}/>
          <div style={{fontSize:12,color:subC}}>Default: prima i movimenti più recenti, ordinati per data dell’operazione.</div>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:4}}>📋 Movimenti futuri</div>
          <SettingHint>Decidi se nello storico devono comparire anche uscite ed entrate con data futura.</SettingHint>
          <Segmented items={[{id:"untilToday",label:"Solo fino a oggi"},{id:"all",label:"Mostra anche future"}]} value={historyFutureMode} onChange={setHistoryFutureMode}/>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:4}}>🤝 Share nello storico</div>
          <SettingHint>Attiva questa opzione per mostrare nello storico anche la tua quota delle spese inserite nella sezione Share. La categoria Share comparirà nei filtri solo quando questa opzione è attiva.</SettingHint>
          <Toggle label="Mostra transazioni Share nello storico" checked={showShareInHistory} onChange={function(){setShowShareInHistory(!showShareInHistory);}} color={confirmButtonColor}/>
        </div>
      </div>
    </div>;

    if(settingsPage==="delete")return <div><PageHeader title="Dati"/>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:textC,marginBottom:4}}>📥 Importa dati</div>
          <div style={{fontSize:13,color:subC,marginBottom:14}}>CSV o Excel (.xlsx)</div>
          <ImportData/>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:"#E24B4A",marginBottom:4}}>🗑 Elimina dati</div>
          <DeleteDataPanel/>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:textC,marginBottom:4}}>📤 Esporta dati</div>
          <div style={{fontSize:13,color:subC,marginBottom:14}}>Scarica uscite e entrate in CSV o Excel</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <Btn onClick={function(){exportToCSV(expenses,incomes,cats,methods,dateFmt,function(){setToast("CSV pronto — scegli dove salvarlo");});}} bg="#1D9E75" style={{padding:"10px 18px",fontSize:14,fontWeight:500}}>📄 CSV</Btn>
            <Btn onClick={function(){exportToXLSX(expenses,incomes,cats,methods,dateFmt,function(){setToast("Excel pronto — scegli dove salvarlo");});}} bg="#217346" style={{padding:"10px 18px",fontSize:14,fontWeight:500}}>📊 Excel</Btn>
            <div style={{fontSize:12,color:subC}}>{expenses.length} uscite · {incomes.length} entrate</div>
          </div>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:600,color:textC,marginBottom:4}}>💾 Backup JSON completo</div>
          <div style={{fontSize:13,color:subC,marginBottom:14}}>Esporta tutto il contenuto dell'app in un file JSON</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Btn onClick={function(){var data={expenses,incomes,cats,methods,recurring,goals,alerts,budgetPlan,patrimonioValues,patrimonioAreas,patrimonioEntries,patrimonioHistory,patrimonioNotes,historyFutureMode,historySortDate,historySortDirection,firstDayOfWeek,appuntiDocuments,appuntiNotes,bankCoords,aiDataAccess,shareProjects,showShareInHistory,confirmButtonColor};androidDownload("fainance_backup_"+todayStr()+".json",new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),function(){setToast("Backup pronto — scegli dove salvarlo");});}} bg="#7F77DD" style={{padding:"10px 18px",fontSize:14,fontWeight:500}}>⬇️ Scarica backup</Btn>
            <label style={{display:"inline-flex",alignItems:"center",background:dark?"#333":"#f0f0f0",color:dark?"#eee":"#444",borderRadius:btnRadius,padding:"10px 18px",fontSize:14,fontWeight:500,cursor:"pointer"}}>
              ⬆️ Ripristina JSON
              <input type="file" accept=".json" style={{display:"none"}} onChange={function(e){var f=e.target.files&&e.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(ev){try{var d=JSON.parse(ev.target.result);if(d.expenses)setExpenses(d.expenses);if(d.incomes)setIncomes(d.incomes);if(d.cats)setCats(d.cats);if(d.methods)setMethods(d.methods);if(d.recurring)setRecurring(d.recurring);if(d.goals)setGoals(d.goals);if(d.alerts)setAlerts(d.alerts);if(d.budgetPlan!==undefined)setBudgetPlan(d.budgetPlan);if(d.patrimonioValues)setPatrimonioValues(d.patrimonioValues);if(d.patrimonioAreas)setPatrimonioAreas(d.patrimonioAreas);if(d.patrimonioEntries)setPatrimonioEntries(d.patrimonioEntries);if(d.patrimonioHistory)setPatrimonioHistory(d.patrimonioHistory);if(d.patrimonioNotes)setPatrimonioNotes(d.patrimonioNotes);if(d.historyFutureMode)setHistoryFutureMode(d.historyFutureMode);if(d.shareProjects)setShareProjects(d.shareProjects);if(d.showShareInHistory!==undefined)setShowShareInHistory(!!d.showShareInHistory);if(d.confirmButtonColor)setConfirmButtonColor(d.confirmButtonColor);
        if(d.historySortDate)setHistorySortDate(d.historySortDate);
        if(d.historySortDirection)setHistorySortDirection(d.historySortDirection);if(d.appuntiDocuments)setAppuntiDocuments(d.appuntiDocuments);if(d.appuntiNotes)setAppuntiNotes(d.appuntiNotes);if(d.bankCoords)setBankCoords(d.bankCoords);if(d.aiDataAccess)setAiDataAccess(d.aiDataAccess);setToast("Backup ripristinato");}catch(err){alert("File JSON non valido");}};r.readAsText(f);}}/>
            </label>
          </div>
        </div>
      </div>
    </div>;

    if(settingsPage==="support"){
      var FAQ_ITEMS=[
        {q:"Come aggiungo una spesa?",a:"Vai nella sezione Movimenti, clicca '+ Aggiungi', inserisci l'importo, seleziona la categoria e il metodo di pagamento, poi salva."},
        {q:"Come funziona la rateizzazione?",a:"Quando aggiungi una spesa, attiva 'Rateizza' e scegli il numero di mesi. La spesa viene distribuita automaticamente sui mesi selezionati."},
        {q:"Come importo i dati da Excel?",a:"Vai in Impostazioni → Dati → Importa dati. Trascina il file Excel o CSV, mappa le colonne (Data, Importo, ecc.) e clicca Importa."},
        {q:"Come funziona il Patrimonio?",a:"Il Patrimonio ti permette di tracciare i tuoi asset mese per mese. Inserisci i valori per ogni voce, poi clicca 'Salva' per registrare lo snapshot del mese."},
        {q:"I dati sono al sicuro?",a:"Tutti i dati sono salvati localmente sul tuo dispositivo (localStorage). Per un backup completo vai in Dati → Backup JSON."},
        {q:"Come cambio valuta?",a:"Vai in Impostazioni → Generale → Valuta principale. Puoi anche abilitare una valuta secondaria in Impostazioni → Metriche."},
        {q:"Come funzionano le categorie?",a:"Le categorie sono organizzate in aree (es. Casa, Vita, Svago). Puoi crearle, modificarle e archiviarle in Impostazioni → Categorie & Metodi."},
        {q:"Posso usare l'app offline?",a:"Sì, l'app funziona completamente offline. Solo la conversione valuta secondaria richiede una connessione internet."},
      ];
      var [openFaq,setOpenFaq]=useState(null);
      var [showContactForm,setShowContactForm]=useState(false);
      var [comingSoonMsg,setComingSoonMsg]=useState("");
      function showComingSoon(msg){setComingSoonMsg(msg);setTimeout(function(){setComingSoonMsg("");},3000);}
      return <div><PageHeader title="Supporto"/>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Coming soon popup */}
          {comingSoonMsg&&<div style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",borderRadius:14,padding:"16px 20px",textAlign:"center",boxShadow:"0 4px 20px rgba(127,119,221,0.3)"}}>
            <div style={{fontSize:28,marginBottom:6}}>🚀</div>
            <div style={{fontSize:15,fontWeight:700,color:"#fff",marginBottom:4}}>{comingSoonMsg}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>Sarà disponibile a breve nella prossima versione!</div>
          </div>}

          {/* Links principali */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,overflow:"hidden"}}>
            {[
              {icon:"🌐",label:"Sito web ufficiale",desc:"fainance.app",action:function(){showComingSoon("Il sito web sarà attivo a breve!");},badge:"Prossimamente"},
              {icon:"▶️",label:"Tutorial YouTube",desc:"Video guide e walkthrough",action:function(){showComingSoon("I tutorial YouTube saranno disponibili a breve!");},badge:"Prossimamente"},
              {icon:"💬",label:"Contattaci",desc:"Supporto diretto via email",action:function(){setShowContactForm(function(v){return !v;});},badge:showContactForm?"Chiudi":"Apri"},
            ].map(function(item,i,arr){return <button key={i} onClick={item.action} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px 20px",border:"none",borderBottom:i<arr.length-1?"1px solid "+borderC:"none",background:cardBg,cursor:"pointer",textAlign:"left"}}>
              <span style={{fontSize:24,width:36,textAlign:"center"}}>{item.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:textC}}>{item.label}</div>
                <div style={{fontSize:12,color:subC,marginTop:1}}>{item.desc}</div>
              </div>
              <span style={{fontSize:12,background:item.label==="Contattaci"?"#e8f4ff":"#EEEDFE",color:item.label==="Contattaci"?"#1a5fa8":"#534AB7",borderRadius:20,padding:"3px 10px",fontWeight:500,flexShrink:0}}>{item.badge}</span>
            </button>;})}
          </div>
          {showContactForm&&<ContactForm currentUser={currentUser}/>}

          {/* FAQ */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
            <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:14}}>❓ Domande frequenti</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {FAQ_ITEMS.map(function(item,i){return <div key={i} style={{borderRadius:10,border:"1px solid "+(openFaq===i?"#AFA9EC":borderC),overflow:"hidden"}}>
                <button onClick={function(){setOpenFaq(openFaq===i?null:i);}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",border:"none",background:openFaq===i?(dark?"#2a2a3e":"#EEEDFE"):(dark?"#252535":"#f9f9f9"),cursor:"pointer",textAlign:"left"}}>
                  <span style={{fontSize:13,fontWeight:600,color:openFaq===i?"#534AB7":textC,flex:1,paddingRight:8}}>{item.q}</span>
                  <span style={{fontSize:16,color:openFaq===i?"#534AB7":subC,flexShrink:0}}>{openFaq===i?"▲":"▼"}</span>
                </button>
                {openFaq===i&&<div style={{padding:"12px 14px",background:dark?"#1e1e30":"#fff",fontSize:13,color:textC,lineHeight:1.6,borderTop:"1px solid "+(dark?"#3a3a5a":"#e8e6ff")}}>{item.a}</div>}
              </div>;})}
            </div>
          </div>

          {/* Versione rapida */}
          <div style={{background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:subC}}>fAInance v1.0.0</span>
            <span style={{fontSize:11,background:"#f0f0f0",color:"#888",borderRadius:20,padding:"2px 10px"}}>FREE</span>
          </div>
        </div>
      </div>;
    }

    if(settingsPage==="terms_conditions")return <div><PageHeader title="Info app / Termini di utilizzo"/><TermsAndConditionsContent/></div>;
    if(settingsPage==="privacy_policy")return <div><PageHeader title="Info app / Informativa Privacy"/><PrivacyPolicyContent/></div>;

    if(settingsPage==="info"){
      var APP_VERSION="1.4.13";
      var APP_VERSION_CODE=129;
      var APP_PLAN="free";
      var APP_WEBSITE="https://fainance.app";
      var UPDATE_JSON_URL="https://raw.githubusercontent.com/davideurso/Aggiornamenti-fAInance/main/version.json";
      var [updateStatus,setUpdateStatus]=useState(null);
      var [updateInfo,setUpdateInfo]=useState(null);
      function checkForUpdates(){
        setUpdateStatus("checking");
        fetch(UPDATE_JSON_URL)
          .then(function(r){return r.json();})
          .then(function(data){
            setUpdateInfo(data);
            if(data.versionCode&&data.versionCode>APP_VERSION_CODE){
              setUpdateStatus("available");
            } else {
              setUpdateStatus("uptodate");
            }
          })
          .catch(function(){setUpdateStatus("error");});
      }
      return <div><PageHeader title="Info"/>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* App identity */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:24,textAlign:"center"}}>
            <img src={appBanner} alt="fAInance" style={{width:"100%",maxWidth:300,height:"auto",objectFit:"contain",marginBottom:10}}/>
            <div style={{fontSize:13,color:subC,marginBottom:2}}>Versione {APP_VERSION}</div>
            <div style={{fontSize:11,color:subC,marginTop:4,fontStyle:"italic"}}>Your AI-powered finance tracker</div>
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
            <div style={{fontSize:14,fontWeight:600,color:textC,marginBottom:4}}>🔄 Aggiornamenti</div>
            <div style={{fontSize:12,color:subC,marginBottom:14}}>Versione installata: <strong>{APP_VERSION}</strong></div>
            {updateStatus==="checking"&&<div style={{background:dark?"#252535":"#f5f5f5",borderRadius:10,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>⏳</span>
              <span style={{fontSize:13,color:subC}}>Controllo in corso...</span>
            </div>}
            {updateStatus==="uptodate"&&<div style={{background:dark?"#1a2a1e":"#edfaf3",borderRadius:10,padding:"12px 16px",marginBottom:12,border:"1px solid #1D9E75",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>✅</span>
              <span style={{fontSize:13,color:"#1D9E75",fontWeight:500}}>Hai già l'ultima versione!</span>
            </div>}
            {updateStatus==="error"&&<div style={{background:"#FFF8E1",borderRadius:10,padding:"12px 16px",marginBottom:12,border:"1px solid #FFD54F",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:20}}>⚠️</span>
              <span style={{fontSize:13,color:"#856404"}}>Impossibile contattare il server. Controlla la connessione.</span>
            </div>}
            {updateStatus==="available"&&updateInfo&&<div style={{background:dark?"#1a1e35":"#f0edff",borderRadius:10,padding:"16px",marginBottom:12,border:"1px solid #7F77DD"}}>
              <div style={{fontSize:14,fontWeight:700,color:"#534AB7",marginBottom:4}}>🚀 Aggiornamento disponibile!</div>
              <div style={{fontSize:12,color:subC,marginBottom:10}}>Versione {updateInfo.version} · {updateInfo.releaseDate}</div>
              {updateInfo.notes&&<div style={{fontSize:12,color:dark?"#ccc":"#444",background:dark?"#252535":"#fff",borderRadius:8,padding:"10px 12px",marginBottom:12,lineHeight:1.6}}>
                <div style={{fontSize:11,fontWeight:600,color:subC,marginBottom:4}}>Novità:</div>
                {updateInfo.notes}
              </div>}
              <button onClick={function(){if(updateInfo.apkUrl)window.open(updateInfo.apkUrl,"_blank");}} style={{width:"100%",background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(127,119,221,0.35)"}}>
                ⬇️ Scarica e installa v{updateInfo.version}
              </button>
              <div style={{marginTop:10,background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:10,padding:"10px 12px",display:"flex",alignItems:"flex-start",gap:8}}>
                <span style={{fontSize:16,flexShrink:0}}>⚠️</span>
                <span style={{fontSize:12,color:"#856404"}}>Prima di aggiornare fai un <strong>Backup JSON</strong>: Impostazioni → Dati → Backup JSON. Dopo l'installazione potrai ripristinarlo se necessario.</span>
              </div>
              <div style={{fontSize:11,color:subC,marginTop:8,textAlign:"center"}}>Apri il file APK scaricato e conferma l'installazione. I tuoi dati vengono conservati.</div>
            </div>}
            <button onClick={checkForUpdates} disabled={updateStatus==="checking"} style={{width:"100%",background:dark?"#252535":"#f5f5f5",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"11px",fontSize:14,cursor:updateStatus==="checking"?"not-allowed":"pointer",fontWeight:500,opacity:updateStatus==="checking"?0.6:1}}>
              {updateStatus==="checking"?"⏳ Controllo in corso...":"🔍 Controlla aggiornamenti"}
            </button>
          </div>

          {/* Piano */}
          <div style={{background:APP_PLAN==="free"?(dark?"#252535":cardBg):(dark?"#1a2a1e":"#edfaf3"),borderRadius:14,border:"2px solid "+(APP_PLAN==="free"?(dark?"#444":"#eee"):"#1D9E75"),padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div><div style={{fontSize:13,color:subC,marginBottom:2}}>Piano attuale</div><div style={{fontSize:18,fontWeight:700,color:APP_PLAN==="free"?textC:"#1D9E75"}}>{APP_PLAN==="free"?"🆓 Free":"⭐ Pro"}</div></div>
              {APP_PLAN==="free"&&<span style={{background:"#f0f0f0",color:"#888",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:600}}>FREE</span>}
            </div>
            {APP_PLAN==="free"&&<>
              <div style={{fontSize:13,color:subC,marginBottom:14}}>Con il piano <strong>Free</strong> hai accesso alle funzionalità di base. Passa a <strong>Pro</strong> per sbloccare funzionalità avanzate, backup cloud, supporto prioritario e altro.</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>{["✅ Uscite ed entrate illimitate","✅ Statistiche base","✅ Import CSV/Excel","❌ Backup cloud automatico","❌ Sincronizzazione multi-dispositivo","❌ Categorie personalizzate illimitate","❌ Supporto prioritario"].map(function(f,i){return <div key={i} style={{fontSize:13,color:f.startsWith("✅")?textC:subC}}>{f}</div>;})}</div>
              <button onClick={function(){alert("Funzionalità di upgrade disponibile a breve!");}} style={{width:"100%",background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 16px rgba(127,119,221,0.35)"}}>🚀 Passa a Pro</button>
            </>}
          </div>

          {/* Rating */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <button onClick={function(){window.open("https://play.google.com","_blank");}} style={{width:"100%",display:"flex",alignItems:"center",gap:12,background:"none",border:"none",cursor:"pointer",padding:0}}>
              <span style={{fontSize:24}}>⭐</span>
              <div style={{textAlign:"left"}}><div style={{fontSize:14,fontWeight:600,color:textC}}>Vota su Play Store</div><div style={{fontSize:12,color:subC}}>Se ti piace l'app, lasciaci una recensione!</div></div>
              <span style={{marginLeft:"auto",fontSize:16,color:subC}}>›</span>
            </button>
          </div>

          {/* Build info */}
          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:12,color:subC,marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:1}}>Informazioni tecniche</div>
            {[["Versione",APP_VERSION],["Version Code",String(APP_VERSION_CODE)],["Build","2026.05"],["Piattaforma","Android"],["Storage","localStorage"]].map(function(row){return <div key={row[0]} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:13,color:subC}}>{row[0]}</span><span style={{fontSize:13,color:textC,fontWeight:500}}>{row[1]}</span></div>;})}
          </div>
          <div style={{fontSize:11,color:subC,textAlign:"center",padding:"8px 0"}}>© 2026 fAInance · Tutti i diritti riservati</div>
        </div>
      </div>;
    }
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

    var navItems=[{id:"home",icon:"🏠",label:"Home"},{id:"spese",icon:"💸",label:t.spese||"Movimenti",badge:pendingCount},{id:"history",icon:"📋",label:t.history||"Storico"},{id:"voice",icon:"🎙️",label:(TRANSLATIONS[lang]&&TRANSLATIONS[lang].voice)||({it:"Voce",en:"Voice",es:"Voz",fr:"Voix",de:"Stimme",pt:"Voz",pl:"Głos",nl:"Stem",ro:"Voce",el:"Φωνή"}[lang]||"Voice")},{id:"share",icon:"🤝",label:"Share"},{id:"more",icon:"☰",label:t.more||"Altro",badge:alertTriggered}];

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
        ?<button onClick={function(){setShowCopy(true);}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500,padding:0}}>📋 Copia valori da un altro mese...</button>
        :<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:textC}}>Copia da</span>
          <select value={copyFrom} onChange={function(e){setCopyFrom(e.target.value);}} style={{...sinp,flex:1,padding:"6px 10px"}}>
            {availMonths.map(function(mk){return <option key={mk} value={mk}>{MONTHS_SHORT[parseInt(mk.split("-")[1])-1]} {mk.slice(0,4)}</option>;})}
          </select>
          <button onClick={function(){
            if(onCopyMonth){onCopyMonth(copyFrom);setShowCopy(false);return;}
            var srcSnap=pHistory[copyFrom];
            if(!srcSnap)return;
            var nd={};
            pEntries.forEach(function(e){var raw=srcSnap[e.id];if(raw===undefined&&srcSnap.values)raw=srcSnap.values[e.id];if(raw===undefined&&srcSnap.entries)raw=srcSnap.entries[e.id];nd[e.id]=raw!==undefined?String(raw):"";});
            setDraft(nd);
            setShowCopy(false);
            setToast("Valori copiati da "+MONTHS_SHORT[parseInt(copyFrom.split("-")[1])-1]+" "+copyFrom.slice(0,4));
          }} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>Copia</button>
          <button onClick={function(){setShowCopy(false);}} style={{background:"none",border:"none",cursor:"pointer",color:subC,fontSize:13}}>Annulla</button>
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
    var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};

    // Tab principale
    var [patTab,setPatTab]=useState("inserimento"); // "inserimento" | "storico"

    // ── INSERIMENTO: mese selezionato ─────────────────────────────────────────
    var [selYear,setSelYear]=useState(curYear);
    var [selMonth,setSelMonth]=useState(now.getMonth()+1); // 1-12
    var selMonthKey=selYear+"-"+String(selMonth).padStart(2,"0");
    var isCurrentMonth=selMonthKey===curMonthKey;

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
    function saveNote(){setPatrimonioNotes(function(n){return{...n,[noteEntryId]:noteDraft};});setNoteEntryId(null);}

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
      setSelMonth(m);setSelYear(y);
    }

    function copyPatrimonioSnapshot(copyFromKey){
      var targetYear=selYear;var targetMonth=selMonth;
      var srcSnap=pHistory[copyFromKey];
      if(!srcSnap){setToast("Nessun valore disponibile per il mese selezionato");return;}
      var nd={};
      pEntries.forEach(function(e){var raw=srcSnap[e.id];if(raw===undefined&&srcSnap.values)raw=srcSnap.values[e.id];if(raw===undefined&&srcSnap.entries)raw=srcSnap.entries[e.id];nd[e.id]=raw!==undefined?String(raw):"";});
      setDraft(nd);
      setSelYear(targetYear);setSelMonth(targetMonth);
      setToast("Valori copiati da "+MONTHS_SHORT[parseInt(copyFromKey.split("-")[1])-1]+" "+copyFromKey.slice(0,4));
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
      setToast("Patrimonio "+MONTHS_SHORT[selMonth-1]+" "+selYear+" salvato");
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
            <textarea value={noteDraft} onChange={function(e){setNoteDraft(e.target.value);}} placeholder="Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)" style={{...sinp,height:120,resize:"vertical",lineHeight:1.5}} autoFocus/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn onClick={saveNote} bg="#7F77DD" style={{flex:1,padding:"10px",fontWeight:600}}>💾 Salva nota</Btn>
              <Btn onClick={function(){setNoteEntryId(null);}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"} style={{padding:"10px 14px"}}>{V.cancel}</Btn>
            </div>
            {pNotes[noteEntryId]&&<button onClick={function(){setPatrimonioNotes(function(n){var q={...n};delete q[noteEntryId];return q;});setNoteEntryId(null);}} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:12,width:"100%"}}>🗑 Elimina nota</button>}
          </div>
        </div>;
      })()}

      {/* ── Header totale ── */}
      <div style={{background:"linear-gradient(135deg,#378ADD22,#9F77DD22)",borderRadius:14,border:"1px solid "+(dark?"#444":"#ddd"),padding:20,textAlign:"center"}}>
        <div style={{fontSize:11,color:subC,marginBottom:2}}>Patrimonio — {MONTHS_FULL[now.getMonth()]} {curYear}</div>
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
            <div style={{fontSize:16,fontWeight:700,color:textC}}>{MONTHS_FULL[selMonth-1]} {selYear}</div>
            <div style={{fontSize:11,color:subC,marginTop:2}}>
              {existingSnap?"✅ Dati già salvati":(isCurrentMonth?"Mese corrente — non ancora salvato":"⚠️ Nessun dato per questo mese")}
            </div>
          </div>
          <button onClick={function(){goMonth(1);}} disabled={selMonthKey>=curMonthKey} style={{background:"none",border:"none",cursor:selMonthKey>=curMonthKey?"not-allowed":"pointer",fontSize:20,color:selMonthKey>=curMonthKey?"#ccc":subC,padding:"4px 8px",borderRadius:8}}>›</button>
        </div>

        {/* Totale mese selezionato + delta */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC}}>
          <div>
            <div style={{fontSize:11,color:subC}}>Totale {MONTHS_SHORT[selMonth-1]} {selYear}</div>
            <div style={{fontSize:22,fontWeight:700,color:draftTotal>=0?"#1D9E75":"#E24B4A"}}>{fmt(draftTotal)}{secRate&&showSecInPatrimonio&&fmtSec(draftTotal)&&<div style={{fontSize:12,color:subC,fontWeight:400,marginTop:2}}>{fmtSec(draftTotal)}</div>}</div>
          </div>
          {totalDelta!==null&&<div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:subC}}>vs {MONTHS_SHORT[parseInt(prevKey.split("-")[1])-1]}</div>
            <div style={{fontSize:16,fontWeight:600,color:totalDelta>=0?"#1D9E75":"#E24B4A"}}>{totalDelta>=0?"+":""}{fmt(totalDelta)}</div>
          </div>}
          <button onClick={saveMonthSnap} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 18px",fontSize:14,cursor:"pointer",fontWeight:600}}>
            {existingSnap?"🔄 Aggiorna":"💾 Salva"}
          </button>
        </div>

        {/* Copia da altro mese */}
        <CopyMonthWidget
          pHistory={pHistory}
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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:20}}>{area.icon}</span>
                <span style={{fontSize:15,fontWeight:600,color:textC}}>{area.name}</span>
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
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:dark?"#252535":"#f9f9f9",borderRadius:pNotes[entry.id]?"10px 10px 0 0":10,border:"1px solid "+(editingId===entry.id?"#7F77DD":(dark?"#333":"#f0f0f0"))}}>
                  <span style={{fontSize:16,flexShrink:0}}>{entry.icon}</span>
                  <span style={{flex:1,fontSize:13,color:textC}}>{entry.name}</span>
                  {editingId===entry.id
                    ?<div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <input type="number" value={rawVal} placeholder="0"
                        onChange={function(e){var v=e.target.value;setDraft(function(d){return{...d,[entry.id]:v};});}}
                        onKeyDown={function(e){if(e.key==="Enter"||e.key==="Tab")setEditingId(null);}}
                        style={{...sinp,width:110,padding:"4px 8px",fontSize:13}} autoFocus/>
                      <button onClick={function(){setEditingId(null);}} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:500}}>✓</button>
                    </div>
                    :<div style={{display:"flex",alignItems:"center",gap:6}}>
                      {entryDelta!==null&&entryDelta!==0&&<span style={{fontSize:11,fontWeight:500,color:entryDelta>0?"#1D9E75":"#E24B4A",minWidth:56,textAlign:"right"}}>{entryDelta>0?"+":""}{fmt(entryDelta)}</span>}
                      <span onClick={function(){setEditingId(entry.id);}} style={{fontSize:14,fontWeight:500,color:numVal>0?"#1D9E75":numVal<0?"#E24B4A":subC,minWidth:80,textAlign:"right",cursor:"pointer",borderBottom:"1px dashed "+(dark?"#555":"#ddd"),padding:"1px 0"}}>{rawVal===""?"—":fmt(numVal)}</span>
                      <button onClick={function(){setEditingId(entry.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14,padding:0}}>✏</button>
                      <button onClick={function(){openNote(entry.id);}} title="Nota" style={{background:pNotes[entry.id]?"#EEEDFE":"none",border:pNotes[entry.id]?"1px solid #AFA9EC":"none",borderRadius:6,cursor:"pointer",color:pNotes[entry.id]?"#534AB7":"#ccc",fontSize:13,padding:"1px 5px"}}>📝</button>
                      <button onClick={function(){delEntry(entry.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:14,padding:0}}>×</button>
                    </div>
                  }
                  </div>
                  {pNotes[entry.id]&&<div onClick={function(){openNote(entry.id);}} style={{padding:"6px 12px",background:dark?"#1e1e30":"#f5f4ff",border:"1px solid "+(dark?"#3a3a5a":"#c8c0f8"),borderTop:"none",borderRadius:"0 0 10px 10px",fontSize:11,color:dark?"#aac":"#534AB7",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {pNotes[entry.id]}</div>}
                </div>;
              })}
            </div>
            {addingEntry===area.id
              ?<div style={{marginTop:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <EmojiPicker value={newEntryIcon} onChange={setNewEntryIcon}/>
                <input type="text" placeholder="Nome voce" value={newEntryName} onChange={function(e){setNewEntryName(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addEntry(area.id);}} style={{...sinp,flex:1,minWidth:120}}/>
                <button onClick={function(){addEntry(area.id);}} style={{background:"#1D9E75",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>Aggiungi</button>
                <button onClick={function(){setAddingEntry(null);setNewEntryName("");}} style={{background:"#f0f0f0",color:"#666",border:"none",borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:13}}>Annulla</button>
              </div>
              :<button onClick={function(){setAddingEntry(area.id);}} style={{marginTop:10,background:"none",border:"1px dashed "+(dark?"#444":"#ddd"),borderRadius:8,padding:"7px 14px",cursor:"pointer",color:subC,fontSize:13,width:"100%"}}>+ Aggiungi voce</button>
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
                {coords.map(function(p,i){return <g key={i}><circle cx={p.x} cy={p.y} r={3} fill="#7F77DD"/><text x={p.x} y={h-5} textAnchor="middle" fontSize={8} fill={tc2}>{MONTHS_SHORT[parseInt(p.mk.split("-")[1])-1]}</text></g>;})}
              </svg>;
            })()}
          </div>}

          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>Dettaglio mensile</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:dark?"#252535":"#f5f5f5"}}>
                  <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:subC}}>Mese</th>
                  <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>Totale</th>
                  <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>Δ</th>
                  {pAreas.slice(0,isMobile?2:4).map(function(a){return <th key={a.id} style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>{a.icon}</th>;})}
                  <th style={{padding:"7px 10px",textAlign:"center",fontWeight:600,color:subC}}></th>
                </tr></thead>
                <tbody>
                  {filteredHist.map(function(m){
                    var lbl=MONTHS_SHORT[parseInt(m.mk.split("-")[1])-1]+" "+m.mk.slice(0,4);
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
                        <button onClick={function(){if(window.confirm("Eliminare snapshot "+m.mk+"?")){delMonthSnap(m.mk);}}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:13}}>×</button>
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredHist.length>0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>Variazioni per voce — {MONTHS_SHORT[parseInt(filteredHist[0].mk.split("-")[1])-1]} vs mese precedente</div>
            {filteredHist[0].delta===null?<div style={{fontSize:12,color:subC}}>Nessun mese precedente nel registro.</div>:
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
  function createShareProject(){
    var owner={id:"me",uid:userId,name:currentUser&&currentUser.name?currentUser.name:"Io",email:currentUser&&currentUser.email?normalizeEmail(currentUser.email):"",kind:"registered",type:"registered",role:"owner",status:"active"};
    var p={id:String(Date.now()),name:"Nuovo progetto",ownerUid:userId,ownerName:owner.name,ownerEmail:owner.email,memberUids:userId?[userId]:[],participants:[owner],activities:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    setShareProjects(function(list){return[p].concat(list||[]);});
    syncShareProjectToCloud(p);
    setShareSelectedProjectId(p.id);
    setShareProjectTab("attivita");
  }
  function updateShareProject(pid,fn){setShareProjects(function(list){return(list||[]).map(function(p){if(String(p.id)!==String(pid))return p;var updated=fn(p);syncShareProjectToCloud(updated);return updated;});});}
  function deleteShareProject(pid){setShareProjects(function(list){return(list||[]).filter(function(p){return String(p.id)!==String(pid);});});deleteDoc(doc(fbDb,"shareProjects",String(pid))).catch(function(){});if(String(shareSelectedProjectId)===String(pid))setShareSelectedProjectId(null);}
  function SharePanel(){
    var projects=shareProjects||[];
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
    var [settlementFrom,setSettlementFrom]=useState("me");
    var [settlementTo,setSettlementTo]=useState("");
    var [settlementAmount,setSettlementAmount]=useState("");
    var [settlementDate,setSettlementDate]=useState(todayStr());
    var [participantBusy,setParticipantBusy]=useState(false);
    var sinp={width:"100%",borderRadius:10,border:"1px solid "+borderC,padding:"9px 11px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:textC,boxSizing:"border-box"};
    useEffect(function(){setProjectNameDraft(selected?selected.name||"":"");setShareEditingActivityId(null);},[selected?selected.id:null]);
    useEffect(function(){var ids=activeParticipants.map(function(p){return p.id;});setShareParticipantIds(function(list){var clean=(list||[]).filter(function(id){return ids.includes(id);});return clean.length?clean:ids;});},[selected?selected.id:null,activeParticipants.map(function(p){return p.id;}).join("|")]);
    function resetShareExpenseForm(){setShareAmount("");setShareDesc("");setShareDate(todayStr());setSplitDraft({});setShareSplitTouched(false);setShareEditingActivityId(null);setShareParticipantIds(activeParticipants.map(function(p){return p.id;}));}
    function personLabel(p){return p&&p.uid===userId?((currentUser&&currentUser.name)||p.name||"Nome"):p.name;}
    var currentShareMember=(participants||[]).find(function(p){return p.uid===userId;})||(participants||[]).find(function(p){return p.id==="me";});
    var currentShareMemberId=currentShareMember?currentShareMember.id:"me";
    useEffect(function(){var ids=activeParticipants.map(function(p){return p.id;});if(ids.length&&!ids.includes(sharePaidBy))setSharePaidBy(currentShareMemberId&&ids.includes(currentShareMemberId)?currentShareMemberId:ids[0]);},[selected?selected.id:null,activeParticipants.map(function(p){return p.id;}).join("|"),currentShareMemberId]);
    function commitProjectName(){if(!selected)return;var v=(projectNameDraft||"").trim()||"Progetto";updateShareProject(selected.id,function(p){return{...p,name:v};});}
    async function addParticipant(){
      if(!selected||participantBusy)return;
      var name=newPersonName.trim();var email=normalizeEmail(newPersonEmail);
      if(personMode==="fake"){
        if(!name){setToast("Inserisci il nome della persona esterna");return;}
        var fakeItem={id:"p_"+Date.now(),name:name,email:"",kind:"fake",type:"fake",role:"member",status:"active"};
        updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([fakeItem])};});
        setNewPersonName("");setNewPersonEmail("");setToast("Persona esterna aggiunta");return;
      }
      if(!email){setToast("Inserisci l'email dell'utente");return;}
      setParticipantBusy(true);
      try{
        var foundUser=null;
        var userSnap=await getDocs(query(collection(fbDb,"users"),where("email","==",email))).catch(function(){return null;});
        if(userSnap&&userSnap.docs&&userSnap.docs.length){var d=userSnap.docs[0];foundUser={uid:d.id,...d.data()};}
        name=foundUser?(foundUser.name||foundUser.displayName||email):email;
        var item={id:"p_"+Date.now(),uid:foundUser?foundUser.uid:null,name:name,email:email,kind:foundUser?"registered":"invited",type:foundUser?"registered":"invited",role:"member",status:"pending"};
        updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([item])};});
        await createShareInvite(selected,item,email,name,foundUser);
        setNewPersonName("");setNewPersonEmail("");
        setToast(foundUser?"Invito creato: notifica in app ed email inviata":"Invito creato: email inviata. Quando l'utente si registra con questa email, troverà l'invito.");
      }catch(e){console.error(e);setToast("Errore durante la creazione dell'invito");}
      finally{setParticipantBusy(false);}
    }
    function removeParticipant(pid){if(!selected||pid==="me")return;updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).filter(function(x){return x.id!==pid;})};});}
    function archiveParticipant(pid){if(!selected||pid==="me")return;updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).map(function(x){return x.id===pid?{...x,status:"archived"}:x;})};});}
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
      if(!ids.length)return{ok:false,blocking:true,message:"Seleziona almeno un partecipante con cui condividere la spesa."};
      if(splitMode==="percent"){
        var pct=ids.reduce(function(a,id){return a+(parseFloat(splitDraft[id])||0);},0);var pctDiff=shareRound(100-pct);
        if(Math.abs(pctDiff)>0.009){var moneyDiff=shareRound(amount*(pctDiff/100));return{ok:false,blocking:true,message:pctDiff>0?"Manca ancora il "+pctDiff.toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+") per arrivare al 100%.":"Hai superato il 100% di "+Math.abs(pctDiff).toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+")."};}
      }
      if(splitMode==="amount"){
        var sum=ids.reduce(function(a,id){return a+shareRound(parseFloat(splitDraft[id])||0);},0);var diff=shareRound(amount-sum);
        if(Math.abs(diff)>0.009)return{ok:false,blocking:true,message:diff>0?"Mancano ancora "+fmt(Math.abs(diff))+" per arrivare al totale.":"Hai superato il totale di "+fmt(Math.abs(diff))+"."};
      }
      return{ok:true,blocking:false,message:""};
    }
    function addSharedActivity(){
      if(!selected)return;if(!shareAmount||parseFloat(shareAmount)<=0){setToast("Inserisci l'importo");return;}
      var validation=shareValidation();if(validation.blocking){setToast(validation.message);return;}
      var shares=computeShares();
      if(!Object.keys(shares).length){setToast("Seleziona almeno un partecipante con cui condividere");return;}
      var previous=shareEditingActivityId?((selected.activities||[]).find(function(x){return String(x.id)===String(shareEditingActivityId);})||{}):{};
      var activity={id:shareEditingActivityId||Date.now(),kind:"expense",amount:shareRound(parseFloat(shareAmount)),desc:shareDesc||"Spesa condivisa",paidBy:sharePaidBy,date:shareDate,time:shareEditingActivityId?(previous.time||new Date().toTimeString().slice(0,5)):new Date().toTimeString().slice(0,5),shares:shares,splitMode:splitMode,sharedWith:Object.keys(shares),createdAt:shareEditingActivityId?(previous.createdAt||new Date().toISOString()):new Date().toISOString(),updatedAt:new Date().toISOString()};
      updateShareProject(selected.id,function(p){
        if(shareEditingActivityId){return{...p,activities:(p.activities||[]).map(function(a){return String(a.id)===String(shareEditingActivityId)?activity:a;})};}
        return{...p,activities:[activity].concat(p.activities||[])};
      });
      resetShareExpenseForm();setToast(shareEditingActivityId?"Spesa Share aggiornata":"Spesa Share aggiunta");
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
      setToast("Modifica attiva: aggiorna i dati nel form e salva.");
    }
    function addSettlement(){
      if(!selected)return;if(!settlementAmount||parseFloat(settlementAmount)<=0)return;
      var activity={id:Date.now(),kind:"settlement",amount:parseFloat(settlementAmount),from:settlementFrom,to:settlementTo||"me",date:settlementDate,time:new Date().toTimeString().slice(0,5),desc:"Saldo tra partecipanti",createdAt:new Date().toISOString()};
      updateShareProject(selected.id,function(p){return{...p,activities:[activity].concat(p.activities||[])};});
      setSettlementAmount("");setToast("Saldo registrato");
    }
    function deleteActivity(aid){if(!selected)return;updateShareProject(selected.id,function(p){return{...p,activities:(p.activities||[]).filter(function(a){return a.id!==aid;})};});}
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
    var tabs=[{id:"attivita",label:"Attività"},{id:"partecipanti",label:"Partecipanti"},{id:"riassunto",label:"Riassunto"},{id:"saldi",label:"Saldi"}];
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div><div style={{fontSize:20,fontWeight:900,color:textC}}>Share</div><div style={{fontSize:12,color:subC}}>Progetti, spese condivise e saldi</div></div><Btn onClick={createShareProject} bg={confirmButtonColor}>+ Progetto</Btn></div>
      {(shareReceivedInvites||[]).length>0&&<div style={{background:confirmButtonColor+"18",border:"1px solid "+confirmButtonColor+"55",borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><div style={{fontSize:14,fontWeight:900,color:textC}}>Inviti ricevuti</div><div style={{fontSize:12,color:subC}}>Accetta o rifiuta gli inviti ai progetti Share.</div></div><button onClick={loadShareCollaboration} style={{background:"transparent",border:"1px solid "+borderC,borderRadius:10,padding:"6px 9px",color:subC,cursor:"pointer"}}>{shareInviteLoading?"...":"↻"}</button></div>{shareReceivedInvites.map(function(inv){return <div key={inv.id} style={{background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{flex:1,minWidth:160}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{inv.projectName||"Progetto Share"}</div><div style={{fontSize:11,color:subC}}>Invito da {inv.invitedByName||"utente fAInance"}</div></div><Btn onClick={function(){acceptShareInvite(inv);}} bg={confirmButtonColor} style={{padding:"7px 10px",fontSize:12}}>Accetta</Btn><Btn onClick={function(){declineShareInvite(inv);}} bg={dark?"#333":"#f0f0f0"} color={textC} style={{padding:"7px 10px",fontSize:12}}>Rifiuta</Btn></div>;})}</div>}
      {projects.length===0&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:22,textAlign:"center",color:subC}}><div style={{fontSize:34,marginBottom:8}}>🤝</div><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:5}}>Nessun progetto Share</div><div style={{fontSize:12}}>Crea un progetto per inserire partecipanti, spese e saldi.</div></div>}
      {projects.length>0&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>{projects.map(function(p){var active=selected&&selected.id===p.id;return <button key={p.id} onClick={function(){setShareSelectedProjectId(p.id);setShareProjectTab("attivita");}} style={{flex:"0 0 auto",border:"1px solid "+(active?confirmButtonColor:borderC),background:active?confirmButtonColor:"transparent",color:active?"#fff":textC,borderRadius:14,padding:"9px 12px",cursor:"pointer",fontSize:13,fontWeight:800}}>{p.name||"Progetto"}</button>;})}</div>}
      {selected&&<>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}><input value={projectNameDraft} onChange={function(e){setProjectNameDraft(e.target.value);}} onBlur={commitProjectName} onKeyDown={function(e){if(e.key==="Enter")commitProjectName();}} style={{...sinp,fontSize:17,fontWeight:900}}/><button onClick={function(){if(window.confirm("Eliminare il progetto Share?"))deleteShareProject(selected.id);}} style={{background:"#fff0f0",border:"1px solid #ffd0d0",color:expenseColor,borderRadius:10,padding:"8px 10px",cursor:"pointer"}}>🗑</button></div>
          <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}>{tabs.map(function(tb){return <button key={tb.id} onClick={function(){setShareProjectTab(tb.id);}} style={{flex:1,border:"none",borderRadius:10,padding:"8px 4px",background:shareProjectTab===tb.id?confirmButtonColor:"transparent",color:shareProjectTab===tb.id?"#fff":subC,fontSize:12,fontWeight:shareProjectTab===tb.id?800:600,cursor:"pointer"}}>{tb.label}</button>;})}</div>
        </div>
        {shareProjectTab==="attivita"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><div style={{fontSize:14,fontWeight:900,color:textC}}>{shareEditingActivityId?"Modifica spesa condivisa":"+ Spesa condivisa"}</div>{shareEditingActivityId&&<button onClick={resetShareExpenseForm} style={{background:"transparent",border:"1px solid "+borderC,borderRadius:9,padding:"6px 8px",fontSize:12,color:subC,cursor:"pointer"}}>Annulla modifica</button>}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 2fr 1fr",gap:8}}><input type="number" placeholder="Importo" value={shareAmount} onChange={function(e){setShareAmount(e.target.value);}} style={sinp}/><input placeholder="Descrizione" value={shareDesc} onChange={function(e){setShareDesc(e.target.value);}} style={sinp}/><input type="date" value={shareDate} onChange={function(e){setShareDate(e.target.value);}} style={sinp}/></div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.4fr",gap:8,marginTop:8}}><select value={sharePaidBy} onChange={function(e){setSharePaidBy(e.target.value);}} style={sinp}>{activeParticipants.map(function(p){return <option key={p.id} value={p.id}>Pagato da {personLabel(p)}</option>;})}</select><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{[{id:"equal",label:"Equa"},{id:"percent",label:"Percentuali"},{id:"amount",label:"Importi"}].map(function(m){return <button key={m.id} onClick={function(){setSplitMode(m.id);setSplitDraft({});setShareSplitTouched(false);}} style={{border:"1px solid "+(splitMode===m.id?confirmButtonColor:borderC),background:splitMode===m.id?confirmButtonColor:"transparent",color:splitMode===m.id?"#fff":textC,borderRadius:10,padding:"8px 6px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{m.label}</button>;})}</div></div><div style={{marginTop:10,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:12,padding:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8}}><div style={{fontSize:12,fontWeight:900,color:textC}}>Condivisa con</div><label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:subC,cursor:"pointer"}}><input type="checkbox" checked={activeParticipants.length>0&&shareParticipantIds.length===activeParticipants.length} onChange={function(){var all=activeParticipants.map(function(p){return p.id;});setShareParticipantIds(shareParticipantIds.length===all.length?[]:all);}}/>Tutti</label></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{activeParticipants.map(function(p){var checked=shareParticipantIds.includes(p.id);return <label key={p.id} style={{display:"flex",alignItems:"center",gap:6,border:"1px solid "+(checked?confirmButtonColor:borderC),background:checked?confirmButtonColor+"22":"transparent",borderRadius:20,padding:"5px 9px",fontSize:12,color:checked?confirmButtonColor:textC,cursor:"pointer"}}><input type="checkbox" checked={checked} onChange={function(){setShareParticipantIds(function(list){return list.includes(p.id)?list.filter(function(x){return x!==p.id;}):list.concat([p.id]);});}}/>{personLabel(p)}</label>;})}</div></div>{splitMode!=="equal"&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginTop:8}}>{activeParticipants.filter(function(p){return shareParticipantIds.includes(p.id);}).map(function(p){return <div key={p.id}><label style={{fontSize:11,color:subC}}>{personLabel(p)} {splitMode==="percent"?"%":"€"}</label><input type="number" value={splitDraft[p.id]||""} onChange={function(e){var v=e.target.value;setShareSplitTouched(true);setSplitDraft(function(d){return{...d,[p.id]:v};});}} style={sinp}/></div>;})}</div>}{showShareCheck&&<div style={{marginTop:10,background:dark?"#2f2a1e":"#fff8e6",border:"1px solid #F2C94C77",borderRadius:12,padding:"9px 10px",fontSize:12,color:dark?"#F2C94C":"#8A6500",fontWeight:600}}>💡 {shareCheck.message}</div>}<div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{fontSize:12,color:subC}}>Quote: {Object.keys(computeShares()).map(function(id){var p=participants.find(function(x){return x.id===id;});return (p?personLabel(p):id)+" "+fmt(computeShares()[id]);}).join(" · ")}</div><Btn onClick={addSharedActivity} bg={showShareCheck?"#999":confirmButtonColor} disabled={showShareCheck}>{shareEditingActivityId?"Aggiorna spesa":"Salva spesa"}</Btn></div></div>
          <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>Attività del progetto</div>{(selected.activities||[]).length===0&&<div style={{fontSize:13,color:subC,textAlign:"center",padding:"18px 0"}}>Nessuna attività</div>}{(selected.activities||[]).map(function(a){var paid=participants.find(function(p){return p.id===a.paidBy;});var from=participants.find(function(p){return p.id===a.from;});var to=participants.find(function(p){return p.id===a.to;});return <div key={a.id} style={{borderBottom:"1px solid "+borderC,padding:"10px 0",display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18}}>{a.kind==="settlement"?"↔️":"🧾"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.kind==="settlement"?((from?personLabel(from):a.from)+" ha pagato "+(to?personLabel(to):a.to)):a.desc}</div><div style={{fontSize:11,color:subC}}>{fmtDate(a.date,dateFmt)} · {a.time||"--:--"}</div>{a.kind!=="settlement"&&<div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}><div style={{fontSize:11,color:textC,fontWeight:700}}>Pagata da: {paid?personLabel(paid):(a.paidBy||"—")}</div><div style={{fontSize:11,color:subC}}>Condivisa con: {Object.keys(a.shares||{}).map(function(pid){var pp=participants.find(function(x){return x.id===pid;});return (pp?personLabel(pp):pid)+" "+fmt(a.shares[pid]);}).join(" · ")||"—"}</div></div>}</div><div style={{fontSize:13,fontWeight:900,color:a.kind==="settlement"?confirmButtonColor:expenseColor}}>{fmt(a.amount)}</div>{a.kind!=="settlement"&&<button onClick={function(){startEditSharedActivity(a);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",borderRadius:9,padding:"5px 8px",cursor:"pointer",color:confirmButtonColor,fontSize:12,fontWeight:800}}>Modifica</button>}<button onClick={function(){deleteActivity(a.id);}} style={{background:"none",border:"none",cursor:"pointer",color:subC}}>×</button></div>;})}</div>
        </div>}
        {shareProjectTab==="partecipanti"&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>Partecipanti</div>{participants.map(function(p){return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+borderC,opacity:p.status==="archived"?0.55:1}}><div style={{width:34,height:34,borderRadius:"50%",background:confirmButtonColor+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:confirmButtonColor}}>{personLabel(p).slice(0,1).toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{personLabel(p)}</div><div style={{fontSize:11,color:subC}}>{p.kind==="fake"?"Persona esterna":p.kind==="registered"?"Utente fAInance":"Invito in attesa"}{p.email?" · "+p.email:""}{p.status==="pending"?" · pendente":""}{p.status==="archived"?" · archiviato":""}</div></div>{p.id!=="me"&&<div style={{display:"flex",gap:5}}>{p.status==="archived"?<button onClick={function(){restoreParticipant(p.id);}} style={{background:"#eef8f4",border:"1px solid #bdebdc",borderRadius:8,color:incomeColor,padding:"5px 7px"}}>Ripristina</button>:<button onClick={function(){archiveParticipant(p.id);}} style={{background:"#fff8e1",border:"1px solid #ffe29a",borderRadius:8,color:"#9a6a00",padding:"5px 7px"}}>Archivia</button>}<button onClick={function(){removeParticipant(p.id);}} style={{background:"#fff0f0",border:"1px solid #ffd0d0",borderRadius:8,color:expenseColor,padding:"5px 7px"}}>Elimina</button></div>}</div>;})}</div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>Aggiungi partecipante</div><div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:10,padding:3,marginBottom:10}}>{[{id:"user",label:"Utente"},{id:"fake",label:"Persona esterna"}].map(function(m){return <button key={m.id} onClick={function(){setPersonMode(m.id);}} style={{flex:1,border:"none",borderRadius:8,padding:"7px",background:personMode===m.id?confirmButtonColor:"transparent",color:personMode===m.id?"#fff":subC,fontSize:12,fontWeight:800}}>{m.label}</button>;})}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr auto",gap:8}}>{personMode==="fake"?<input placeholder="Nome persona esterna" value={newPersonName} onChange={function(e){setNewPersonName(e.target.value);}} style={sinp}/>:<input placeholder="Email utente" value={newPersonEmail} onChange={function(e){setNewPersonEmail(e.target.value);}} style={sinp}/>}<Btn onClick={addParticipant} bg={confirmButtonColor} disabled={participantBusy}>{participantBusy?"...":"Aggiungi"}</Btn></div><div style={{fontSize:11,color:subC,marginTop:8}}>Utente richiede solo l'email: quando l'account viene collegato, verrà mostrato il nome reale. Persona esterna usa solo il nome e non riceve inviti.</div></div></div>}
        {shareProjectTab==="riassunto"&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>Riassunto</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10}}><StatCard title="Spese progetto" value={fmt(totalSpent)} color={expenseColor} bg={expenseColor+"22"}/><StatCard title="Mi devono" value={fmt(Math.max(0,myBalance))} color={incomeColor} bg={incomeColor+"22"}/><StatCard title="Devo" value={fmt(Math.max(0,-myBalance))} color={expenseColor} bg={expenseColor+"22"}/></div><div style={{fontSize:12,color:subC,marginTop:12}}>Questa sezione è secondaria: il flusso principale resta progetto → inserimento spesa.</div></div>}
        {shareProjectTab==="saldi"&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>Chi deve soldi a chi</div>{debts.length===0&&<div style={{fontSize:13,color:subC,textAlign:"center",padding:"16px 0"}}>Nessun saldo aperto</div>}{debts.map(function(d,i){var from=participants.find(function(p){return p.id===d.from;});var to=participants.find(function(p){return p.id===d.to;});return <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:13,color:textC,flex:1}}>{from?personLabel(from):d.from} deve pagare {to?personLabel(to):d.to}</span><span style={{fontSize:14,fontWeight:900,color:confirmButtonColor}}>{fmt(d.amount)}</span></div>;})}</div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>Registra saldo/rimborso</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr auto",gap:8}}><select value={settlementFrom} onChange={function(e){setSettlementFrom(e.target.value);}} style={sinp}>{participants.map(function(p){return <option key={p.id} value={p.id}>{personLabel(p)}</option>;})}</select><select value={settlementTo} onChange={function(e){setSettlementTo(e.target.value);}} style={sinp}>{participants.map(function(p){return <option key={p.id} value={p.id}>a {personLabel(p)}</option>;})}</select><input type="number" placeholder="Importo" value={settlementAmount} onChange={function(e){setSettlementAmount(e.target.value);}} style={sinp}/><input type="date" value={settlementDate} onChange={function(e){setSettlementDate(e.target.value);}} style={sinp}/><Btn onClick={addSettlement} bg={confirmButtonColor}>Registra</Btn></div></div></div>}
      </>}
    </div>;
  }

  function MorePanel(){
    var items=[{id:"share",icon:"🤝",label:"Share",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Progetti, costi condivisi e saldi"])||"Progetti, costi condivisi e saldi"},{id:"stats",icon:"📊",label:t.stats||"Statistiche",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Grafici, confronti e metriche"])||"Grafici, confronti e metriche"},{id:"budget",icon:"💰",label:t.budget||"Budget",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Piano mensile e risparmio"])||"Piano mensile e risparmio"},{id:"goals",icon:"🎯",label:t.goals||"Obiettivi",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Risparmi e target"])||"Risparmi e target"},{id:"patrimonio",icon:"💎",label:(TRANSLATIONS[lang]&&TRANSLATIONS[lang].patrimonio)||"Patrimonio",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Asset, conti e storico"])||"Asset, conti e storico"},{id:"appunti",icon:"🗂",label:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Appunti"])||"Appunti",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Note, documenti e coordinate"])||"Note, documenti e coordinate"},{id:"alerts",icon:"🔔",label:t.alerts||"Alert",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Soglie e avvisi"])||"Soglie e avvisi",badge:alertTriggered},{id:"consulenteAI",icon:<AIGrilloIcon size={28}/>,label:lang==="es"?"Asesor IA":lang==="en"?"AI Advisor":"Consulente AI",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Analisi e domande"])||"Analisi e domande"},{id:"settings",icon:"⚙",label:t.settings||"Impostazioni",sub:"Profilo, dati e preferenze"}];
    return <div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{fontSize:20,fontWeight:900,color:textC}}>Altro</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>{items.map(function(item){return <button key={item.id} onClick={function(){setTab(item.id);setSettingsPage(null);setMobileMenu(false);}} style={{position:"relative",textAlign:"left",background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:"15px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",color:textC,boxShadow:dark?"none":"0 4px 14px rgba(0,0,0,0.05)"}}><span style={{fontSize:24,width:32,textAlign:"center"}}>{item.icon}</span><span style={{flex:1}}><span style={{display:"block",fontSize:15,fontWeight:800}}>{item.label}</span><span style={{display:"block",fontSize:12,color:subC,marginTop:2}}>{item.sub}</span></span>{item.badge>0&&<span style={{position:"absolute",right:12,top:12,background:expenseColor,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{item.badge}</span>}</button>;})}</div></div>;
  }
  // panelContent() is defined in sezioni.tsx and imported above
    function panelContent(){
    if(tab==="home")return <HomePanel/>;
    if(tab==="spese")return <SpesePanel/>;
    if(tab==="history")return <HistoryPanel/>;
    if(tab==="more")return <MorePanel/>;
    if(tab==="share")return <SharePanel/>;
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

  var mobileMain=[{id:"home",icon:"🏠",label:"Home"},{id:"spese",icon:"💸",label:t.spese||"Movimenti"},{id:"history",icon:"📋",label:t.history||"Storico"},{id:"voice",icon:"🎙️",label:(TRANSLATIONS[lang]&&TRANSLATIONS[lang].voice)||({it:"Voce",en:"Voice",es:"Voz",fr:"Voix",de:"Stimme",pt:"Voz",pl:"Głos",nl:"Stem",ro:"Voce",el:"Φωνή"}[lang]||"Voice")},{id:"more",icon:"☰",label:t.more||"Altro"}];

  return <AppCtx.Provider value={ctxValue}>
    {!firestoreReady?<div style={{position:"fixed",inset:0,background:dark?"#1a1a2e":"linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,zIndex:999}}><FAInanceLogo size={72}/><div style={{fontSize:13,color:dark?"#aaa":"#888"}}>Caricamento dati account...</div></div>:
    isMobile?
    <div style={{fontFamily:"system-ui,sans-serif",maxWidth:430,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column",background:bgColor,overflow:"hidden"}}>
      <div style={{background:headerBg,borderBottom:"1px solid "+borderC,padding:"10px 16px 8px",flexShrink:0}}><div style={{fontSize:11,fontWeight:600,color:subC,marginBottom:4}}>fAInance</div><div style={{display:"flex",justifyContent:"space-between"}}><div><div style={{fontSize:11,color:subC}}>Uscite</div><div style={{fontSize:19,fontWeight:600,color:expenseColor}}>{fmt(curMonthExp)}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:11,color:subC}}>Saldo</div><div style={{fontSize:17,fontWeight:600,color:BALANCE_COLOR}}>{fmt(curMonthInc-curMonthExp)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:11,color:subC}}>Entrate</div><div style={{fontSize:19,fontWeight:600,color:incomeColor}}>{fmt(curMonthInc)}</div></div></div></div>
      <div style={{flex:1,overflowY:"auto",padding:14}}>{panelContent()}</div>
      {aiFloatingEnabled&&tab!=="settings"&&<FloatingAIButton/>}
      {voiceModal&&<VoiceEntryModal/>}
      <div style={{background:headerBg,borderTop:"1px solid "+borderC,display:"flex",flexShrink:0}}>{mobileMain.map(function(item){return <button key={item.id} onClick={function(){if(item.id==="voice"){openVoiceModal();setMobileMenu(false);}else if(item.id==="more"){setTab("more");setMobileMenu(function(s){return !s;});setSettingsPage(null);}else{setTab(item.id);setMobileMenu(false);setSettingsPage(null);}}} style={{flex:1,padding:"9px 2px",border:"none",background:"transparent",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",color:(tab===item.id||(item.id==="more"&&tab==="more")||(item.id==="voice"&&voiceModal))?textC:subC,borderTop:(tab===item.id||(item.id==="more"&&tab==="more")||(item.id==="voice"&&voiceModal))?"2px solid "+(dark?"#eee":"#333"):"2px solid transparent"}}><span style={{fontSize:17}}>{item.icon}</span><span style={{fontSize:9,fontWeight:(tab===item.id||(item.id==="more"&&tab==="more")||(item.id==="voice"&&voiceModal))?500:400}}>{item.label}</span></button>;})}</div>
      {mobileMenu&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={function(){setMobileMenu(false);}}><div style={{background:cardBg,borderRadius:"20px 20px 0 0",width:"100%",padding:"20px 16px 32px"}} onClick={function(e){e.stopPropagation();}}>{[{id:"share",icon:"🤝",label:"Share"},{id:"stats",icon:"📊",label:t.stats||"Statistiche"},{id:"budget",icon:"💰",label:t.budget||"Budget"},{id:"goals",icon:"🎯",label:t.goals||"Obiettivi"},{id:"patrimonio",icon:"💎",label:"Patrimonio"},{id:"appunti",icon:"🗂",label:"Appunti"},{id:"alerts",icon:"🔔",label:t.alerts||"Alert",badge:alertTriggered},{id:"consulenteAI",icon:<AIGrilloIcon size={28}/>,label:lang==="es"?"Asesor IA":lang==="en"?"AI Advisor":"Consulente AI"},{id:"settings",icon:"⚙",label:t.settings||"Impostazioni"}].map(function(item){return <button key={item.id} onClick={function(){setTab(item.id);setSettingsPage(null);setMobileMenu(false);}} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"14px 8px",border:"none",background:"transparent",borderBottom:"1px solid "+borderC,fontSize:15,cursor:"pointer",color:textC}}><span style={{fontSize:22}}>{item.icon}</span>{item.label}{item.badge>0&&<span style={{marginLeft:"auto",background:expenseColor,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>{item.badge}</span>}</button>;})}</div></div>}
      {toast&&<Toast msg={toast} onDone={function(){setToast(null);}}/>}
      {alertPopup&&alertPopup.length>0&&<AlertPopup newAlerts={alertPopup} onClose={function(){setAlertPopup(null);}}/>}
      {editingItem&&<EditModal item={editingItem.item} isExp={editingItem.isExp} onSave={function(updated){if(editingItem.isExp)setExpenses(expenses.map(function(e){return e.id===updated.id?updated:e;}));else setIncomes(incomes.map(function(i){return i.id===updated.id?updated:i;}));setEditingItem(null);}} onClose={function(){setEditingItem(null);}}/>}
    </div>
    :
    <div style={{fontFamily:"system-ui,sans-serif",height:"100vh",display:"flex",flexDirection:"column",background:bgColor,overflow:"hidden"}}>
      <div style={{background:headerBg,borderBottom:"1px solid "+borderC,padding:"10px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}><div style={{fontWeight:600,fontSize:15,color:textC}}>fAInance</div><div style={{display:"flex",gap:24}}>{[["Uscite",expenseColor,fmt(curMonthExp)],["Saldo",BALANCE_COLOR,fmt(curMonthInc-curMonthExp)],["Entrate",incomeColor,fmt(curMonthInc)]].map(function(item){return <div key={item[0]} style={{textAlign:"center"}}><div style={{fontSize:10,color:subC}}>{item[0]}</div><div style={{fontSize:16,fontWeight:600,color:item[1]}}>{item[2]}</div></div>;})}</div><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:11,color:subC}}>{curYear}: {fmt(yearExp)} / {fmt(yearInc)}</span><Btn onClick={function(){exportToCSV(expenses,incomes,cats,methods,dateFmt);}} bg={incomeColor} style={{padding:"5px 10px",fontSize:11}}>CSV</Btn><Btn onClick={function(){exportToXLSX(expenses,incomes,cats,methods,dateFmt);}} bg="#217346" style={{padding:"5px 10px",fontSize:11}}>Excel</Btn></div></div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{width:220,background:sideBg,borderRight:"1px solid "+borderC,display:"flex",flexDirection:"column",padding:"16px 0",flexShrink:0,overflowY:"auto"}}>{navItems.map(function(item){return <button key={item.id} onClick={function(){if(item.id==="voice"){openVoiceModal();}else{setTab(item.id);if(item.id!=="settings")setSettingsPage(null);}}} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 20px",border:"none",background:(tab===item.id||(item.id==="voice"&&voiceModal))?(dark?"#2a2a3e":"#f0f0f0"):"transparent",color:(tab===item.id||(item.id==="voice"&&voiceModal))?textC:subC,fontSize:14,cursor:"pointer",fontWeight:(tab===item.id||(item.id==="voice"&&voiceModal))?500:400,textAlign:"left",position:"relative"}}><span style={{fontSize:18}}>{item.icon}</span>{item.label}{item.badge>0&&<span style={{position:"absolute",right:14,background:expenseColor,color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500}}>{item.badge}</span>}</button>;})}</div>
        <div style={{flex:1,overflowY:"auto",padding:24}}><div style={{maxWidth:960,margin:"0 auto"}}>{panelContent()}</div></div>
      </div>
      {aiFloatingEnabled&&tab!=="settings"&&<FloatingAIButton desktop/>}
      {voiceModal&&<VoiceEntryModal/>}
      {toast&&<Toast msg={toast} onDone={function(){setToast(null);}}/>}
      {alertPopup&&alertPopup.length>0&&<AlertPopup newAlerts={alertPopup} onClose={function(){setAlertPopup(null);}}/>}
      {editingItem&&<EditModal item={editingItem.item} isExp={editingItem.isExp} onSave={function(updated){if(editingItem.isExp)setExpenses(expenses.map(function(e){return e.id===updated.id?updated:e;}));else setIncomes(incomes.map(function(i){return i.id===updated.id?updated:i;}));setEditingItem(null);}} onClose={function(){setEditingItem(null);}}/>}
    </div>}
    {(!termsAccepted||!privacyAccepted)&&<TermsAcceptanceModal/>}
  </AppCtx.Provider>;
}

export default AppWithLogin;
