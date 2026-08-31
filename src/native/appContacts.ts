import { L } from '../utils/translationFallback';

// App contact picker extracted from app.tsx in Architecture Phase 11.
// Legacy dynamic-import fallback is intentionally preserved.
async function getFainanceContactsPlugin(){
  try{
    var cap=(typeof window!=="undefined")?(window as any).Capacitor:null;
    var plugins=cap&&cap.Plugins?cap.Plugins:{};
    var p=plugins.FainanceContacts||plugins.CapacitorContacts||plugins.Contacts||plugins.CapgoCapacitorContacts;
    if(p)return p;
  }catch(e){}
  try{
    var mod:any=await import("@capgo/capacitor-contacts");
    return mod&&((mod.CapacitorContacts)||(mod.Contacts)||(mod.default));
  }catch(e){return null;}
}
function firstContactValue(v:any){
  if(!v)return "";
  if(typeof v==="string"||typeof v==="number")return String(v);
  if(Array.isArray(v)){for(var i=0;i<v.length;i++){var r=firstContactValue(v[i]);if(r)return r;}return "";}
  return v.value||v.address||v.email||v.number||v.normalizedNumber||v.display||v.formatted||v.formattedName||v.name||v.label||"";
}
function normalizeFainanceContact(c:any){
  if(!c)return null;
  if(c.contact)c=c.contact;
  if(c.contacts&&c.contacts[0])c=c.contacts[0];
  if(c.person)c=c.person;
  var structuredName=firstContactValue(c.name)||firstContactValue(c.names);
  var name=firstContactValue(c.displayName)||firstContactValue(c.fullName)||structuredName||[firstContactValue(c.givenName),firstContactValue(c.middleName),firstContactValue(c.familyName)].filter(Boolean).join(" ");
  var email=firstContactValue(c.emailAddresses)||firstContactValue(c.emails)||firstContactValue(c.email);
  var phone=firstContactValue(c.phoneNumbers)||firstContactValue(c.phones)||firstContactValue(c.tel)||firstContactValue(c.phone);
  name=String(name||"").trim();email=String(email||"").trim();phone=String(phone||"").trim();
  if(!name&&!email&&!phone)return null;
  return {name:name,email:email,phone:phone};
}
function normalizeFainanceContactsResult(res:any){
  if(!res)return [];
  var arr:any[]=[];
  if(Array.isArray(res))arr=res;
  else if(Array.isArray(res.contacts))arr=res.contacts;
  else if(res.contact)arr=[res.contact];
  else arr=[res];
  return arr.map(normalizeFainanceContact).filter(Boolean);
}
function fainanceContactFields(){return ["id","fullName","givenName","middleName","familyName","displayName","emailAddresses","phoneNumbers"] as any;}
async function tryFainanceContactPicker(plugin:any){
  if(!plugin)return null;
  var fields=fainanceContactFields();
  var attempts=[
    function(){return plugin.pickContact?plugin.pickContact():null;},
    function(){return plugin.pickContact?plugin.pickContact({fields:fields,multiple:false}):null;},
    function(){return plugin.pickContacts?plugin.pickContacts({multiple:false}):null;},
    function(){return plugin.pickContacts?plugin.pickContacts({fields:fields,multiple:false}):null;}
  ];
  for(var i=0;i<attempts.length;i++){
    try{
      var res=await attempts[i]();
      var list=normalizeFainanceContactsResult(res);
      if(list.length)return list[0];
    }catch(e){}
  }
  return null;
}
async function requestFainanceContactsPermission(plugin:any){
  try{if(plugin&&plugin.checkPermissions){var st=await plugin.checkPermissions();var r=st&&(st.readContacts||st.contacts||st.granted);if(r===true||r==="granted"||r==="limited")return true;}}catch(e){}
  try{if(plugin&&plugin.requestPermissions){var rp=await plugin.requestPermissions({permissions:["readContacts"]});var rr=rp&&(rp.readContacts||rp.contacts||rp.granted);if(rr===true||rr==="granted"||rr==="limited")return true;}}catch(e){}
  try{if(plugin&&plugin.requestPermissions){await plugin.requestPermissions();return true;}}catch(e){}
  return false;
}
async function chooseFainanceContactFromList(cleaned:any[]){
  if(!cleaned||!cleaned.length)return null;
  if(cleaned.length===1)return cleaned[0];
  if(typeof document==="undefined")return cleaned[0];
  return await new Promise(function(resolve){
    var original=cleaned.slice(0,800);
    var selected=false;
    var overlay=document.createElement("div");
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.style.position="fixed";
    overlay.style.inset="0";
    overlay.style.zIndex="2147483647";
    overlay.style.background="rgba(0,0,0,.55)";
    overlay.style.display="flex";
    overlay.style.alignItems="center";
    overlay.style.justifyContent="center";
    overlay.style.padding="14px";
    var card=document.createElement("div");
    card.style.width="min(560px,100%)";
    card.style.maxHeight="86vh";
    card.style.background="#ffffff";
    card.style.color="#111827";
    card.style.borderRadius="22px";
    card.style.boxShadow="0 22px 60px rgba(0,0,0,.34)";
    card.style.overflow="hidden";
    card.style.display="flex";
    card.style.flexDirection="column";
    var header=document.createElement("div");
    header.style.display="flex";
    header.style.alignItems="center";
    header.style.justifyContent="space-between";
    header.style.gap="12px";
    header.style.padding="14px 14px 10px";
    header.style.borderBottom="1px solid #e5e7eb";
    var title=document.createElement("div");
    title.textContent=L("Seleziona contatto");
    title.style.fontSize="18px";
    title.style.fontWeight="900";
    title.style.lineHeight="1.2";
    var close=document.createElement("button");
    close.type="button";
    close.textContent="×";
    close.setAttribute("aria-label",L("Chiudi"));
    close.style.width="38px";
    close.style.height="38px";
    close.style.borderRadius="12px";
    close.style.border="1px solid #fecaca";
    close.style.background="#fee2e2";
    close.style.color="#ef4444";
    close.style.fontSize="26px";
    close.style.fontWeight="900";
    close.style.lineHeight="30px";
    close.style.cursor="pointer";
    close.onclick=function(){cleanup(null);};
    header.appendChild(title);header.appendChild(close);
    var searchWrap=document.createElement("div");
    searchWrap.style.padding="12px 14px";
    searchWrap.style.borderBottom="1px solid #e5e7eb";
    var search=document.createElement("input");
    search.type="search";
    search.placeholder=L("Cerca contatto");
    search.style.width="100%";
    search.style.boxSizing="border-box";
    search.style.border="1px solid #d1d5db";
    search.style.borderRadius="14px";
    search.style.padding="12px 13px";
    search.style.fontSize="15px";
    search.style.outline="none";
    searchWrap.appendChild(search);
    var list=document.createElement("div");
    list.style.overflowY="auto";
    list.style.maxHeight="calc(86vh - 130px)";
    list.style.padding="6px 8px 10px";
    var empty=document.createElement("div");
    empty.textContent=L("Nessun contatto trovato");
    empty.style.padding="22px";
    empty.style.textAlign="center";
    empty.style.color="#6b7280";
    empty.style.fontWeight="700";
    function contactText(c:any){return String([c.name,c.email,c.phone].filter(Boolean).join(" ")).toLowerCase();}
    function render(){
      var q=String(search.value||"").trim().toLowerCase();
      var filtered=q?original.filter(function(c:any){return contactText(c).indexOf(q)>=0;}):original;
      list.innerHTML="";
      if(!filtered.length){list.appendChild(empty);return;}
      filtered.slice(0,250).forEach(function(c:any){
        var row=document.createElement("button");
        row.type="button";
        row.style.width="100%";
        row.style.display="grid";
        row.style.gridTemplateColumns="42px 1fr";
        row.style.gap="10px";
        row.style.alignItems="center";
        row.style.textAlign="left";
        row.style.border="0";
        row.style.background="transparent";
        row.style.borderRadius="14px";
        row.style.padding="10px";
        row.style.cursor="pointer";
        row.onmouseenter=function(){row.style.background="#f3f4f6";};
        row.onmouseleave=function(){row.style.background="transparent";};
        row.onclick=function(){cleanup(c);};
        var avatar=document.createElement("div");
        avatar.textContent=String(c.name||c.email||c.phone||"?").trim().slice(0,1).toUpperCase();
        avatar.style.width="42px";
        avatar.style.height="42px";
        avatar.style.borderRadius="14px";
        avatar.style.background="#dbeafe";
        avatar.style.color="#2563eb";
        avatar.style.display="flex";
        avatar.style.alignItems="center";
        avatar.style.justifyContent="center";
        avatar.style.fontWeight="900";
        var info=document.createElement("div");
        info.style.minWidth="0";
        var name=document.createElement("div");
        name.textContent=c.name||c.email||c.phone||L("Contatto");
        name.style.fontSize="14px";
        name.style.fontWeight="900";
        name.style.whiteSpace="nowrap";
        name.style.overflow="hidden";
        name.style.textOverflow="ellipsis";
        var meta=document.createElement("div");
        meta.textContent=[c.email,c.phone].filter(Boolean).join(" · ");
        meta.style.fontSize="12px";
        meta.style.color="#6b7280";
        meta.style.marginTop="2px";
        meta.style.whiteSpace="nowrap";
        meta.style.overflow="hidden";
        meta.style.textOverflow="ellipsis";
        info.appendChild(name);if(meta.textContent)info.appendChild(meta);
        row.appendChild(avatar);row.appendChild(info);list.appendChild(row);
      });
    }
    function cleanup(value:any){
      if(selected)return;
      selected=true;
      try{document.removeEventListener("keydown",onKey);}catch(e){}
      try{overlay.remove();}catch(e){try{document.body.removeChild(overlay);}catch(_e){}}
      resolve(value);
    }
    function onKey(ev:KeyboardEvent){if(ev.key==="Escape")cleanup(null);}
    search.addEventListener("input",render);
    document.addEventListener("keydown",onKey);
    overlay.onclick=function(ev:any){if(ev&&ev.target===overlay)cleanup(null);};
    card.appendChild(header);card.appendChild(searchWrap);card.appendChild(list);overlay.appendChild(card);document.body.appendChild(overlay);
    render();
    setTimeout(function(){try{search.focus();}catch(e){}},60);
  });
}

export async function pickFainanceContact(){
  var plugin=await getFainanceContactsPlugin();
  if(plugin){
    try{if(plugin.isSupported){var sup=await plugin.isSupported();if(sup&&sup.isSupported===false)throw new Error("CONTACTS_NOT_SUPPORTED");}}catch(e){}
    try{if(plugin.isAvailable){var av=await plugin.isAvailable();if(av&&av.isAvailable===false)throw new Error("CONTACTS_NOT_AVAILABLE");}}catch(e){}
    try{
      if(plugin.getContacts){
        await requestFainanceContactsPermission(plugin);
        var fields=fainanceContactFields();
        var res=await plugin.getContacts({fields:fields,limit:500,offset:0});
        var cleaned=normalizeFainanceContactsResult(res);
        var chosen=await chooseFainanceContactFromList(cleaned);
        if(chosen)return chosen;
      }
    }catch(e){}
    var picked=await tryFainanceContactPicker(plugin);
    if(picked)return picked;
  }
  try{
    var nav:any=(typeof navigator!=="undefined"?navigator:null);
    if(nav&&nav.contacts&&nav.contacts.select){var contacts=await nav.contacts.select(["name","email","tel"],{multiple:false});var c=contacts&&contacts[0];if(c)return normalizeFainanceContact(c);}
  }catch(e){}
  return null;
}
try{if(typeof window!=="undefined"){(window as any).fainancePickContact=pickFainanceContact;}}catch(e){}
