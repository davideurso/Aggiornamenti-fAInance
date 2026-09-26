import { useState, useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  useApp,
  fbAuth,
  PLAN_LIMITS,
  RECEIPT_OCR_ENDPOINT,
  dateOffset,
  fmtDate,
  androidDownload,
  parseMoney,
  todayStr,
  todayUsageKey,
} from "../core";
import {
  Btn,
  StatCard,
  EmojiPicker,
  AppColorSelector,
  AmountCalculatorButton,
  MultiCurrencyField,
  FainanceIcon,
  PopupCloseButton,
  FainanceInfoPopover,
  FainancePickerModal,
} from "../widget";
import { parseFainanceShareVoiceCommand } from "../voiceParser";
import { pickFainanceContact } from "../native/appContacts";
import { focusFainanceInput } from "../utils/appRuntime";
import { fainanceIsNativePlatform } from "../native/platform";
import {
  saveShareAttachment,
  watchShareAttachments,
} from "../share/shareAttachments";

const SHARE_ATTACHMENT_CAMERA_PENDING_KEY = "fainance_share_attachment_camera_pending_v1";
const SHARE_ATTACHMENT_CAMERA_RESTORED_KEY = "fainance_share_attachment_camera_restored_v1";
const SHARE_ATTACHMENT_CAMERA_EVENT = "fainance-share-attachment-camera-restored-v1";
let shareAttachmentCameraRestoreBridgeStarted = false;

function readShareAttachmentCameraPending() {
  try {
    if (typeof localStorage === "undefined") return null;
    var raw = localStorage.getItem(SHARE_ATTACHMENT_CAMERA_PENDING_KEY);
    if (!raw) return null;
    var parsed = JSON.parse(raw || "{}");
    var ts = Number(parsed && parsed.ts || 0);
    if (!ts || Date.now() - ts > 1000 * 60 * 30) {
      localStorage.removeItem(SHARE_ATTACHMENT_CAMERA_PENDING_KEY);
      return null;
    }
    return parsed;
  } catch (_e) {
    return null;
  }
}

function persistRestoredShareAttachmentCameraResult(eventData: any) {
  try {
    var pending = readShareAttachmentCameraPending();
    if (!pending || typeof window === "undefined") return;
    var data = eventData && eventData.data ? eventData.data : {};
    var packet: any = {
      pending: pending,
      receivedAt: Date.now(),
      data: {
        webPath: String(data.webPath || ""),
        path: String(data.path || ""),
        format: String(data.format || "jpeg"),
        dataUrl: String(data.dataUrl || ""),
      },
    };
    (window as any).__fainanceShareAttachmentCameraRestored = packet;
    try {
      // Con CameraResultType.Uri persistiamo solo URI/path, evitando di mettere
      // immagini base64 molto grandi nel localStorage durante il ripristino Android.
      var persistable = {
        pending: pending,
        receivedAt: packet.receivedAt,
        data: {
          webPath: packet.data.webPath,
          path: packet.data.path,
          format: packet.data.format,
        },
      };
      localStorage.setItem(
        SHARE_ATTACHMENT_CAMERA_RESTORED_KEY,
        JSON.stringify(persistable)
      );
    } catch (_persistError) {}
    try {
      window.dispatchEvent(
        new CustomEvent(SHARE_ATTACHMENT_CAMERA_EVENT, { detail: packet })
      );
    } catch (_eventError) {}
  } catch (_e) {}
}

function startShareAttachmentCameraRestoreBridge() {
  if (shareAttachmentCameraRestoreBridgeStarted) return;
  shareAttachmentCameraRestoreBridgeStarted = true;
  try {
    if (!Capacitor.isNativePlatform()) return;
    CapacitorApp.addListener("appRestoredResult", function (eventData: any) {
      try {
        var pluginId = String(eventData && eventData.pluginId || "").toLowerCase();
        var methodName = String(eventData && eventData.methodName || "").toLowerCase();
        if (pluginId.indexOf("camera") < 0 || methodName !== "getphoto") return;
        if (!readShareAttachmentCameraPending()) return;
        persistRestoredShareAttachmentCameraResult(eventData);
      } catch (_restoredError) {}
    }).catch(function () {});
  } catch (_bridgeError) {}
}
startShareAttachmentCameraRestoreBridge();

export function SharePanel() {
    // MUNDELY_51_SHARE_SYNC_UI
    if(false && typeof window!=="undefined" && document.documentElement.getAttribute("data-mundely-share-v51")!=="1"){
      document.documentElement.setAttribute("data-mundely-share-v51","1");
      const emitBridgeMutation=()=>{
        window.dispatchEvent(new CustomEvent("fainance:share-mutated"));
      };
      const scheduleBridgeMutation=()=>{
        [0,120,500,1200,2600,5000].forEach((delay)=>window.setTimeout(emitBridgeMutation,delay));
      };
      const normalizeMundelyLabel=(value)=>String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
      const mundelyCategoryKey=(value)=>{
        const s=normalizeMundelyLabel(value);
        if(/senza categoria|no category|sin categoria/.test(s))return "none";
        if(/\bcibo\b|\bfood\b|\bcomida\b/.test(s))return "food";
        if(/trasport|transport/.test(s))return "transport";
        if(/alloggio|accommodation|alojamiento|unterkunft|hebergement/.test(s))return "accommodation";
        if(/\bstay\b|lodging|hotel/.test(s))return "accommodation_legacy";
        if(/attivita|activities|activity|actividades/.test(s))return "activities";
        if(/shopping|compras|einkaufe/.test(s))return "shopping";
        if(/\baltro\b|\bother\b|\botro\b|sonstiges|autre/.test(s))return "other";
        return "legacy";
      };
      const filterMundelyCategoryDialog=()=>{
        const radios=Array.from(document.querySelectorAll('input[type="radio"]'));
        const roots=[];
        for(const radio of radios){
          let node=radio.parentElement;
          for(let depth=0;node&&depth<7;depth+=1,node=node.parentElement){
            const count=node.querySelectorAll('input[type="radio"]').length;
            if(count>=6&&count<=18){ if(!roots.includes(node))roots.push(node); break; }
          }
        }
        for(const root of roots){
          const localRadios=Array.from(root.querySelectorAll('input[type="radio"]'));
          const rows=[];
          for(let index=0;index<localRadios.length;index+=1){
            const radio=localRadios[index];
            const row=radio.closest('label,[role="radio"],.radio-row,.option-row,.list-row')||radio.parentElement;
            if(row)rows.push({radio,row,index});
          }
          const keys=rows.map((item)=>mundelyCategoryKey(item.row.textContent||""));
          const canonical=["food","transport","accommodation","activities","shopping","other"];
          const present=new Set(keys.filter((key)=>canonical.includes(key)));
          if(present.size<3)continue;
          const chosen=new Map();
          for(const key of canonical){
            const options=rows.filter((item)=>mundelyCategoryKey(item.row.textContent||"")===key);
            if(!options.length)continue;
            let selected=null;
            for(const item of options){
              const signatureText=[item.radio.getAttribute("value"),item.radio.getAttribute("id"),item.radio.getAttribute("name"),item.row.getAttribute("data-value"),item.row.getAttribute("data-id"),item.row.getAttribute("data-category-id")].filter(Boolean).join(" ");
              if(/sc_mundely_/i.test(signatureText)){ selected=item; break; }
            }
            if(!selected)selected=options[0];
            chosen.set(key,selected);
          }
          for(const item of rows){
            const key=mundelyCategoryKey(item.row.textContent||"");
            const show=key==="none"||(canonical.includes(key)&&chosen.get(key)===item);
            item.row.setAttribute("style",show?"":"display:none!important");
          }
        }
      };
      document.addEventListener("click",(event)=>{
        const target=event.target;
        const button=target&&typeof target.closest==="function"?target.closest("button,[role='button']"):null;
        if(!button)return;
        const label=String([button.getAttribute("aria-label"),button.getAttribute("title"),button.textContent].filter(Boolean).join(" ")).toLowerCase();
        if(/salva|save|guardar|aggiungi|add|anadir|añadir|aggiorna|update|elimina|delete|remove|borrar/.test(label))scheduleBridgeMutation();
      },true);
      document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden")emitBridgeMutation(); });
      window.addEventListener("pagehide",emitBridgeMutation);
      const observer=new MutationObserver(filterMundelyCategoryDialog);
      observer.observe(document.body,{childList:true,subtree:true});
      window.setTimeout(filterMundelyCategoryDialog,0);
    }

    // MUNDELY_48_SHARE_SYNC_UI
    if(false && typeof window!=="undefined" && !(window as any).__mundelyShareV48Hook){
      (window as any).__mundelyShareV48Hook=true;
      const dispatchBridgeMutation=()=>{
        [120,700,1600].forEach((delay)=>window.setTimeout(()=>window.dispatchEvent(new CustomEvent("fainance:share-mutated")),delay));
      };
      document.addEventListener("click",(event)=>{
        const target=event.target as Element|null;
        const button=target&&typeof (target as any).closest==="function" ? target.closest("button") : null;
        if(!button)return;
        const label=String([
          button.getAttribute("aria-label"),
          button.getAttribute("title"),
          button.textContent
        ].filter(Boolean).join(" ")).toLowerCase();
        if(/salva|save|guardar|aggiungi|add|añadir|aggiorna|update|elimina|delete|remove|borrar/.test(label)) dispatchBridgeMutation();
      },true);

      const filterMundelyCategories=()=>{
        const roots=Array.from(document.querySelectorAll('[role="dialog"],.modal,.modal-content,.popup,.dialog'));
        for(const root of roots){
          const radios=Array.from(root.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
          const mundely=radios.filter((radio)=>/^sc_mundely_(food|transport|accommodation|activities|shopping|other)_/i.test(String(radio.value||"")));
          if(mundely.length<3)continue;
          const seen=new Set<string>();
          for(const radio of radios){
            const value=String(radio.value||"");
            const match=/^sc_mundely_(food|transport|accommodation|activities|shopping|other)_/i.exec(value);
            const row=(radio.closest("label")||radio.parentElement) as HTMLElement|null;
            if(!row)continue;
            if(!value){row.style.display="";continue;}
            if(!match){row.style.display="none";continue;}
            const key=match[1].toLowerCase();
            if(seen.has(key)){row.style.display="none";continue;}
            seen.add(key); row.style.display="";
          }
        }
      };
      const observer=new MutationObserver(()=>filterMundelyCategories());
      observer.observe(document.body,{childList:true,subtree:true});
      window.setTimeout(filterMundelyCategories,0);
    }

    // MUNDELY_47_SHARE_CURRENCY
    // MUNDELY_44_SHARE_CURRENCY
    function formatShareBridgeAmount(activity:any,value:any){
      var numeric=Number(value||0);
      var code=String((activity&&((activity.currency||activity.originalCurrency||activity.mundelyCurrency)))||currency||"EUR").trim().toUpperCase()||"EUR";
      try{return new Intl.NumberFormat(undefined,{style:"currency",currency:code}).format(numeric);}
      catch(_e){return numeric.toFixed(2)+" "+code;}
    }
    function formatShareBridgeBaseAmount(value:any){
      var numeric=Number(value||0);
      var code=String(currency||"EUR").trim().toUpperCase()||"EUR";
      try{return new Intl.NumberFormat(undefined,{style:"currency",currency:code}).format(numeric);}
      catch(_e){return numeric.toFixed(2)+" "+code;}
    }

  var _c: any = useApp();
  var {
    acceptShareInvite,
    borderC,
    btnRadius,
    canAddPlanItem,
    cardBg,
    confirmButtonColor,
    consumePlanFeature,
    createShareInvite,
    createShareProject,
    currentPlan,
    currentUser,
    dark,
    dateFmt,
    declineShareInvite,
    deleteShareProject,
    requestShareProjectDeletion,
    expenseColor,
    featureExtraKey,
    featureLimits,
    featureUsageKey,
    findRegisteredUserForShare,
    firestoreReady,
    fmt,
    incomeColor,
    isMobile,
    lang,
    loadShareCollaboration,
    normalizeEmail,
    normalizePhoneForLookup,
    planCount,
    planInc,
    secondaryButtonColor,
    setShareProjectTab,
    setShareReceiptUploads,
    setShareSelectedProjectId,
    setToast,
    shareInviteLoading,
    shareProjectTab,
    shareProjects,
    cats,
    shareCategoryMappings,
    setShareCategoryMappings,
    shareDefaultCategoryId,
    shareReceiptUploads,
    shareReceivedInvites,
    shareSelectedProjectId,
    showRewardedAdForExtraMovement,
    subC,
    successToastForFeature,
    t,
    textC,
    translateUiRuntimeText,
    updateShareProject,
    upgradeMessage,
    userId,
  }: any = _c;

  function L(s) {
    return translateUiRuntimeText(s);
  }
  var projects = (shareProjects || []).filter(function (p) {
    return !!p && typeof p === "object" && p.status !== "deleted";
  });
  var shareProjectLimitReached = !canAddPlanItem(
    "shareProjects",
    projects.length,
    1
  );
  function readFocusedShareInviteMarker() {
    try {
      return {
        inviteId: String(localStorage.getItem("fainance_share_focus_invite_id") || ""),
        projectId: String(localStorage.getItem("fainance_share_focus_project_id") || ""),
        projectName: String(localStorage.getItem("fainance_share_focus_project_name") || ""),
        invitedByName: String(localStorage.getItem("fainance_share_focus_inviter_name") || ""),
      };
    } catch (_focusInviteReadError) {
      return { inviteId: "", projectId: "", projectName: "", invitedByName: "" };
    }
  }
  var [focusedShareInviteMarker, setFocusedShareInviteMarker] = useState<any>(
    readFocusedShareInviteMarker
  );
  function clearFocusedShareInviteMarker() {
    try {
      localStorage.removeItem("fainance_share_focus_invite_id");
      localStorage.removeItem("fainance_share_focus_project_id");
      localStorage.removeItem("fainance_share_focus_project_name");
      localStorage.removeItem("fainance_share_focus_inviter_name");
    } catch (_focusInviteClearError) {}
    setFocusedShareInviteMarker({ inviteId: "", projectId: "", projectName: "", invitedByName: "" });
  }
  useEffect(
    function () {
      var next = readFocusedShareInviteMarker();
      if (next.inviteId || next.projectId) setFocusedShareInviteMarker(next);
    },
    [shareInviteLoading, (shareReceivedInvites || []).length, shareProjectTab]
  );
  var focusedPendingInvite = (shareReceivedInvites || []).find(function (inv) {
    return (
      (focusedShareInviteMarker.inviteId &&
        String(inv && inv.id || "") === String(focusedShareInviteMarker.inviteId)) ||
      (focusedShareInviteMarker.projectId &&
        String(inv && inv.projectId || "") === String(focusedShareInviteMarker.projectId))
    );
  });
  var focusedInvite = focusedPendingInvite ||
    ((focusedShareInviteMarker.inviteId || focusedShareInviteMarker.projectId)
      ? {
          id: focusedShareInviteMarker.inviteId,
          projectId: focusedShareInviteMarker.projectId,
          projectName: focusedShareInviteMarker.projectName,
          invitedByName: focusedShareInviteMarker.invitedByName,
        }
      : null);
  var latestShareProject =
    projects.slice().sort(function (a, b) {
      return String(b.updatedAt || b.createdAt || "").localeCompare(
        String(a.updatedAt || a.createdAt || "")
      );
    })[0] || null;
  var selected =
    projects.find(function (p) {
      return String(p.id || "") === String(shareSelectedProjectId || "");
    }) ||
    latestShareProject ||
    projects[0] ||
    null;
  var participants = selected ? selected.participants || [] : [];
  var activeParticipants = participants.filter(function (p) {
    return p.status !== "archived";
  });
  // FAINANCE_58_ARCHIVED_SHARE_READONLY
  var selectedShareArchived = !!(
    selected && String(selected.status || "").toLowerCase() === "archived"
  );
  // MUNDELY_52_CANONICAL_CATEGORIES
  var selectedIsMundelyLinked = !!(
    selected &&
    (
      String(selected.sourceApp || "").toLowerCase() === "mundely" ||
      !!String(selected.mundelyTripId || "").trim() ||
      String(selected.id || "").indexOf("mundely_") === 0
    )
  );
  function canonicalMundelyShareCategoryKey(category) {
    var raw = String(
      (category && (category.mundelyCategoryKey || category.name || category.id)) || ""
    )
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s-]+/g, "_");
    var aliases = {
      food: "food", cibo: "food", meal: "food", meals: "food", dining: "food", restaurant: "food",
      transport: "transport", trasporti: "transport", transportation: "transport", travel: "transport",
      accommodation: "accommodation", alloggio: "accommodation", stay: "accommodation", lodging: "accommodation", hotel: "accommodation", hotels: "accommodation",
      activities: "activities", activity: "activities", attivita: "activities", experience: "activities", experiences: "activities",
      shopping: "shopping", shops: "shopping",
      other: "other", altro: "other", misc: "other", miscellaneous: "other",
    };
    if (aliases[raw]) return aliases[raw];
    var idMatch = /^sc_mundely_(food|transport|accommodation|activities|shopping|other)(?:_|$)/.exec(
      String((category && category.id) || "").toLowerCase()
    );
    return idMatch ? idMatch[1] : raw;
  }
  var projectShareCategories = selected
    ? (selected.categories || []).filter(function (category) {
        return category && String(category.status || "active") !== "deleted";
      })
    : [];
  if (selectedIsMundelyLinked && projectShareCategories.length) {
    var canonicalOrder = ["food", "transport", "accommodation", "activities", "shopping", "other"];
    var bestByKey = {};
    projectShareCategories.forEach(function (category) {
      var key = canonicalMundelyShareCategoryKey(category);
      if (canonicalOrder.indexOf(key) < 0) return;
      var score = 0;
      if (String(category.sourceApp || "").toLowerCase() === "mundely") score += 20;
      if (String(category.mundelyCategoryKey || "").toLowerCase() === key) score += 15;
      if (String(category.id || "").toLowerCase().indexOf("sc_mundely_" + key + "_") === 0) score += 10;
      if (canonicalMundelyShareCategoryKey({ name: category.name }) === key) score += 2;
      var previous = bestByKey[key];
      if (!previous || score > previous.score) bestByKey[key] = { category: category, score: score };
    });
    var canonicalOnly = canonicalOrder
      .map(function (key) { return bestByKey[key] && bestByKey[key].category; })
      .filter(Boolean);
    if (canonicalOnly.length) projectShareCategories = canonicalOnly;
  }
  var selectedCurrentParticipant = participants.find(function (participant) {
    return (
      participant &&
      (String(participant.uid || "") === String(userId || "") ||
        (!selected.ownerUid && !String(participant.uid || "").trim() && String(participant.id || "") === "me"))
    );
  });
  var canManageShareCategories = !!(
    selected &&
    !selectedIsMundelyLinked &&
    (String(selected.ownerUid || "") === String(userId || "") ||
      (!selected.ownerUid && selectedCurrentParticipant && String(selectedCurrentParticipant.role || "") === "owner"))
  );
  var personalShareCategories = (cats || []).filter(function (category) {
    return category && !category.archived && !category.deleted;
  });
  var shareDefaultPersonalCategory =
    personalShareCategories.find(function (category) {
      return String(category.id) === String(shareDefaultCategoryId || "17");
    }) ||
    personalShareCategories.find(function (category) {
      return String(category.id) === "17";
    }) ||
    personalShareCategories[0] ||
    null;
  var [shareResolvedParticipantNames, setShareResolvedParticipantNames] = useState<any>({});
  var [newPersonName, setNewPersonName] = useState("");
  var [newPersonEmail, setNewPersonEmail] = useState("");
  var [personMode, setPersonMode] = useState("user");
  var [shareAmount, setShareAmount] = useState("");
  var [shareAmountFocused, setShareAmountFocused] = useState(false);
  var [shareFx, setShareFx] = useState<any>({
    currency: String(_c.currency || "EUR"),
    baseCurrency: String(_c.currency || "EUR"),
    exchangeRate: 1,
  });
  var [shareDesc, setShareDesc] = useState("");
  var [sharePaidBy, setSharePaidBy] = useState("me");
  var [shareDate, setShareDate] = useState(todayStr());
  var [splitMode, setSplitMode] = useState("equal");
  var [splitDraft, setSplitDraft] = useState({});
  var [shareSplitTouched, setShareSplitTouched] = useState(false);
  var [shareParticipantIds, setShareParticipantIds] = useState([]);
  var [shareEditingActivityId, setShareEditingActivityId] = useState(null);
  var [shareCategoryId, setShareCategoryId] = useState("");
  var [newShareCategoryName, setNewShareCategoryName] = useState("");
  var [newShareCategoryIcon, setNewShareCategoryIcon] = useState("🏷️");
  var [newShareCategoryColor, setNewShareCategoryColor] = useState("#4F8FF7");
  var [showNewShareCategoryPopup, setShowNewShareCategoryPopup] = useState(false);
  var [editingShareCategoryId, setEditingShareCategoryId] = useState("");
  var [editingShareCategoryName, setEditingShareCategoryName] = useState("");
  var [shareCategoryMappingDraft, setShareCategoryMappingDraft] = useState("");
  var [projectNameDraft, setProjectNameDraft] = useState(
    selected ? selected.name || "" : ""
  );
  var [projectDescDraft, setProjectDescDraft] = useState(
    selected ? selected.description || "" : ""
  );
  var [projectIconDraft, setProjectIconDraft] = useState(
    selected ? selected.icon || "🤝" : "🤝"
  );
  var [projectColorDraft, setProjectColorDraft] = useState(
    selected ? selected.color || "#4F8FF7" : "#4F8FF7"
  );
  var [projectEditingDetails, setProjectEditingDetails] = useState(false);
  var [showNewProjectForm, setShowNewProjectForm] = useState(false);
  var [chooseProjectOpen, setChooseProjectOpen] = useState(false);
  var [newProjectName, setNewProjectName] = useState("");
  var [newProjectDesc, setNewProjectDesc] = useState("");
  var [newProjectIcon, setNewProjectIcon] = useState("🤝");
  var [newProjectColor, setNewProjectColor] = useState("#4F8FF7");
  var [settlementFrom, setSettlementFrom] = useState("me");
  var [settlementTo, setSettlementTo] = useState("");
  var [settlementAmount, setSettlementAmount] = useState("");
  var [settlementDate, setSettlementDate] = useState(todayStr());
  var [settlementComment, setSettlementComment] = useState("");
  var [settlementPopupOpen, setSettlementPopupOpen] = useState(false);
  var [editingSettlementActivityId, setEditingSettlementActivityId] = useState<any>(null);
  var [shareFilterOpen, setShareFilterOpen] = useState(false);
  var [shareFilterSearch, setShareFilterSearch] = useState("");
  var [shareFilterDateFrom, setShareFilterDateFrom] = useState("");
  var [shareFilterDateTo, setShareFilterDateTo] = useState("");
  var [shareFilterAmountMin, setShareFilterAmountMin] = useState("");
  var [shareFilterAmountMax, setShareFilterAmountMax] = useState("");
  var [shareFilterPaidBy, setShareFilterPaidBy] = useState("");
  var [shareFilterCategoryId, setShareFilterCategoryId] = useState("");
  var [shareSortDirection, setShareSortDirection] = useState("desc");
  var [shareFilterSectionsOpen, setShareFilterSectionsOpen] = useState({
    period: false,
    amount: false,
    payer: false,
    category: false,
    order: false,
  });
  var [sharePendingReceipt, setSharePendingReceipt] = useState(null);
  var [remoteShareAttachments, setRemoteShareAttachments] = useState<any[]>([]);
  var [shareReceiptPreview, setShareReceiptPreview] = useState<any>(null);
  var [shareReceiptConfirmationOpen, setShareReceiptConfirmationOpen] = useState(false);
  var [shareExpandedActivityIds, setShareExpandedActivityIds] = useState<any>({});
  var [shareProjectArchiveConfirmOpen, setShareProjectArchiveConfirmOpen] = useState(false);
  var [shareProjectArchiveMode, setShareProjectArchiveMode] = useState<"archive" | "restore">("archive");
  var shareAttachmentRestoreBusyRef = useRef(false);
  var shareReceiptFileInputRef = useRef(null);
  var shareDateInputLang =
    (
      {
        it: "it-IT",
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        de: "de-DE",
        pt: "pt-PT",
        pl: "pl-PL",
        nl: "nl-NL",
        ro: "ro-RO",
        el: "el-GR",
      } as any
    )[lang] || "it-IT";
  var shareDateLabel =
    (
      {
        it: "Data",
        en: "Date",
        es: "Fecha",
        fr: "Date",
        de: "Datum",
        pt: "Data",
        pl: "Data",
        nl: "Datum",
        ro: "Dată",
        el: "Ημερομηνία",
      } as any
    )[lang] || "Data";
  var [participantBusy, setParticipantBusy] = useState(false);
  var [shareReceiptOpen, setShareReceiptOpen] = useState(false);
  var [shareReceiptReady, setShareReceiptReady] = useState(false);
  var [shareReceiptBusy, setShareReceiptBusy] = useState(false);
  var [shareExpenseFormOpen, setShareExpenseFormOpen] = useState(false);
  var [shareExpenseMode, setShareExpenseMode] = useState("simple");
  var [shareVoiceListening, setShareVoiceListening] = useState(false);
  var [shareVoiceText, setShareVoiceText] = useState("");
  var [shareParticipantPopupOpen, setShareParticipantPopupOpen] =
    useState(false);
  var shareAmountInputRef = useRef(null);
  var settlementAmountInputRef = useRef(null);
  useEffect(
    function () {
      if (
        (shareExpenseFormOpen || shareEditingActivityId) &&
        shareExpenseMode === "simple"
      )
        focusFainanceInput(shareAmountInputRef, 120);
    },
    [shareExpenseFormOpen, shareEditingActivityId, shareExpenseMode]
  );
  useEffect(
    function () {
      if (settlementPopupOpen)
        focusFainanceInput(settlementAmountInputRef, 120);
    },
    [settlementPopupOpen]
  );
  var shareTransactionPopupVisible = !!(shareExpenseFormOpen || shareEditingActivityId);
  useEffect(
    function () {
      var setSuppressed = _c && _c.setNativeBannerSuppressed;
      if (typeof setSuppressed !== "function") return;
      setSuppressed(shareTransactionPopupVisible);
      return function () {
        setSuppressed(false);
      };
    },
    [shareTransactionPopupVisible]
  );
  var sinp = {
    width: "100%",
    borderRadius: 10,
    border: "1px solid " + borderC,
    padding: "9px 11px",
    fontSize: 13,
    background: dark ? "#2a2a3e" : "#fff",
    color: textC,
    boxSizing: "border-box",
  };
  useEffect(
    function () {
      if (!firestoreReady || !projects.length) return;
      var hasValidSelection = projects.some(function (p) {
        return String(p.id || "") === String(shareSelectedProjectId || "");
      });
      if (!hasValidSelection && projects[0] && projects[0].id != null)
        setShareSelectedProjectId(String(projects[0].id));
    },
    [
      firestoreReady,
      projects
        .map(function (p) {
          return String(p.id || "");
        })
        .join("|"),
      shareSelectedProjectId,
    ]
  );
  useEffect(
    function () {
      setProjectNameDraft(selected ? selected.name || "" : "");
      setProjectDescDraft(selected ? selected.description || "" : "");
      setProjectIconDraft(selected ? selected.icon || "🤝" : "🤝");
      setProjectColorDraft(selected ? selected.color || "#4F8FF7" : "#4F8FF7");
      setProjectEditingDetails(false);
      setShareEditingActivityId(null);
      setShareCategoryId(
        selected && (selected.categories || []).find(function (category) {
          return category && String(category.status || "active") !== "deleted";
        })
          ? String((selected.categories || []).find(function (category) {
              return category && String(category.status || "active") !== "deleted";
            }).id)
          : ""
      );
      setEditingShareCategoryId("");
      setEditingShareCategoryName("");
    },
    [selected ? selected.id : null]
  );
  useEffect(
    function () {
      if (selected) return;
      setShareExpenseFormOpen(false);
      setShareEditingActivityId(null);
      setSettlementPopupOpen(false);
      setEditingSettlementActivityId(null);
      setShareProjectArchiveConfirmOpen(false);
      setProjectEditingDetails(false);
      setChooseProjectOpen(false);
      setTimeout(function () {
        try {
          var root = document.getElementById("share_panel_root");
          if (root && root.scrollIntoView) root.scrollIntoView({ block: "start" });
        } catch (_e) {}
      }, 0);
    },
    [selected ? selected.id : null]
  );
  useEffect(
    function () {
      var ids = activeParticipants.map(function (p) {
        return p.id;
      });
      setShareParticipantIds(function (list) {
        var clean = (list || []).filter(function (id) {
          return ids.includes(id);
        });
        return clean.length ? clean : ids;
      });
    },
    [
      selected ? selected.id : null,
      activeParticipants
        .map(function (p) {
          return p.id;
        })
        .join("|"),
    ]
  );
  function notifyArchivedShareProject() {
    setToast({
      text: L("Il progetto è archiviato. Ripristinalo per aggiungere nuove spese."),
      type: "warning",
      icon: "🗂️",
      color: "#FFF8E1",
      textColor: "#856404",
    });
  }
  function canCreateShareExpense() {
    return !!selected && !selectedShareArchived;
  }
  function resetShareExpenseForm() {
    try {
      localStorage.removeItem("fainance_share_receipt_draft_v2");
      localStorage.removeItem("fainance_share_receipt_flow_v2");
      localStorage.removeItem("fainance_share_widget_action_v1");
      localStorage.removeItem("fainance_share_open_expense_mode");
    } catch (e) {}
    setShareAmount("");
    setShareFx({ currency: String(_c.currency || "EUR"), baseCurrency: String(_c.currency || "EUR"), exchangeRate: 1 });
    setShareDesc("");
    setShareCategoryId(
      projectShareCategories.length ? String(projectShareCategories[0].id) : ""
    );
    setShareDate(todayStr());
    setSplitDraft({});
    setShareSplitTouched(false);
    setShareEditingActivityId(null);
    setShareExpenseFormOpen(false);
    setShareReceiptOpen(false);
    setShareReceiptReady(false);
    setShareExpenseMode("simple");
    setShareVoiceText("");
    setSharePendingReceipt(null);
    setShareParticipantIds(
      activeParticipants.map(function (p) {
        return p.id;
      })
    );
  }
  function closeShareExpensePopup() {
    try {
      localStorage.removeItem("fainance_share_receipt_flow_v2");
      localStorage.removeItem("fainance_share_widget_action_v1");
      localStorage.removeItem("fainance_share_open_expense_mode");
    } catch (e) {}
    setShareExpenseFormOpen(false);
    setShareEditingActivityId(null);
    setShareReceiptOpen(false);
    setShareReceiptReady(false);
    setShareExpenseMode("simple");
  }
  useEffect(function () {
    if (selectedShareArchived && shareExpenseFormOpen && !shareEditingActivityId) {
      closeShareExpensePopup();
    }
  }, [selectedShareArchived, shareExpenseFormOpen, shareEditingActivityId]);
  function openShareExpensePopup(mode) {
    if (selectedShareArchived && mode !== "income") {
      notifyArchivedShareProject();
      return;
    }
    setShareProjectTab("attivita");
    setShareReceiptReady(false);
    if (mode === "receipt") {
      startShareReceiptFlow();
      return;
    }
    if (mode === "income") {
      var ids = activeParticipants.map(function (p) {
        return String(p.id);
      });
      var currentId = String(currentShareMemberId || "me");
      var fromId =
        ids.find(function (id) {
          return id !== currentId;
        }) || "";
      setSettlementFrom(fromId);
      setSettlementTo(ids.includes(currentId) ? currentId : ids[0] || "");
      setSettlementAmount("");
      setSettlementDate(todayStr());
      openNewSettlementPopup();
      return;
    }
    setShareExpenseMode(mode || "simple");
    setShareReceiptOpen(false);
    setShareExpenseFormOpen(true);
    if (mode === "voice")
      setTimeout(function () {
        startShareVoiceCommand();
      }, 250);
  }
  const consumedToolDraft=useRef<string|null>(null);
  useEffect(()=>{
    const draft=_c.toolShareDraft;
    if(!draft||consumedToolDraft.current===draft.id||!selected||String(selected.id)!==draft.projectId)return;
    consumedToolDraft.current=draft.id;
    if (selectedShareArchived) {
      _c.setToolShareDraft(null);
      notifyArchivedShareProject();
      return;
    }
    resetShareExpenseForm();
    setShareAmount(draft.amount);setShareDate(draft.date);setShareDesc('');
    setShareFx({currency:draft.currency,baseCurrency:draft.baseCurrency,exchangeRate:draft.exchangeRate,exchangeRateDate:draft.exchangeRateDate,exchangeRateSource:draft.exchangeRateSource,baseAmount:draft.baseAmount});
    setSharePaidBy(String(currentShareMemberId||'me'));
    setShareProjectTab('attivita');setShareExpenseMode('simple');setShareExpenseFormOpen(true);
    _c.setToolShareDraft(null);
  },[_c.toolShareDraft,selected?.id]);
  function consumePendingShareWidgetAction() {
    var payload: any = null;
    try {
      var raw = localStorage.getItem("fainance_share_widget_action_v1") || "";
      if (raw) payload = JSON.parse(raw);
    } catch (e) {}
    try {
      if (!payload) {
        var oldMode =
          localStorage.getItem("fainance_share_open_expense_mode") || "";
        if (oldMode) payload = { mode: oldMode, ts: Date.now() };
      }
    } catch (e) {}
    if (!payload) return false;
    if (payload.ts && Date.now() - Number(payload.ts) > 60000) {
      try {
        localStorage.removeItem("fainance_share_widget_action_v1");
        localStorage.removeItem("fainance_share_open_expense_mode");
      } catch (e) {}
      return false;
    }
    var mode = String(payload.mode || "simple");
    var projectId = String(payload.projectId || payload.shareProjectId || "");
    if (projectId && (!selected || String(selected.id) !== projectId)) {
      setShareSelectedProjectId(projectId);
      return false;
    }
    if (!selected && !(projects || []).length) return false;
    try {
      localStorage.removeItem("fainance_share_widget_action_v1");
      localStorage.removeItem("fainance_share_open_expense_mode");
    } catch (e) {}
    openShareExpensePopup(mode);
    return true;
  }
  useEffect(
    function () {
      function handler() {
        consumePendingShareWidgetAction();
      }
      try {
        window.addEventListener("fainance-open-share-expense", handler);
      } catch (e) {}
      var timers = [80, 260, 650, 1200].map(function (ms) {
        return setTimeout(handler, ms);
      });
      return function () {
        try {
          window.removeEventListener("fainance-open-share-expense", handler);
        } catch (e) {}
        timers.forEach(function (t) {
          clearTimeout(t);
        });
      };
    },
    [
      selected ? selected.id : null,
      (projects || [])
        .map(function (p) {
          return String(p.id);
        })
        .join("|"),
      activeParticipants
        .map(function (p) {
          return String(p.id);
        })
        .join("|"),
    ]
  );

  function shareReceiptCurrentDefaults() {
    var ids = activeParticipants.map(function (p) {
      return p.id;
    });
    return {
      projectId: selected ? String(selected.id) : "",
      paidBy: String(currentShareMemberId || "me"),
      participantIds: ids,
      splitMode: "equal",
    };
  }
  function applyShareReceiptDraftToForm(draft) {
    if (!draft || !selected || String(draft.projectId) !== String(selected.id))
      return false;
    if (selectedShareArchived) {
      notifyArchivedShareProject();
      return false;
    }
    var ids =
      draft.participantIds && draft.participantIds.length
        ? draft.participantIds
        : activeParticipants.map(function (p) {
            return p.id;
          });
    setShareProjectTab("attivita");
    setShareAmount(String(draft.amount || ""));
    setShareDesc(draft.desc || L("Scontrino Share"));
    setShareDate(draft.date || todayStr());
    setSharePaidBy(draft.paidBy || String(currentShareMemberId || "me"));
    setShareParticipantIds(ids);
    setSplitMode("equal");
    setSplitDraft({});
    setShareSplitTouched(false);
    setShareReceiptOpen(false);
    setShareReceiptReady(true);
    setShareExpenseMode("simple");
    setShareExpenseFormOpen(true);
    setShareReceiptBusy(false);
    return true;
  }
  function shareReceiptLocale() {
    return (
      {
        it: "it-IT",
        en: "en-US",
        es: "es-ES",
        fr: "fr-FR",
        de: "de-DE",
        pt: "pt-PT",
        pl: "pl-PL",
        nl: "nl-NL",
        ro: "ro-RO",
        el: "el-GR",
      }[lang || "it"] || "it-IT"
    );
  }
  function shareReceiptNum(v) {
    var raw = String(v || "")
      .replace(/[€$£]/g, " ")
      .replace(/\b(eur|euro|euros)\b/gi, " ")
      .replace(/\s/g, "")
      .replace(",", ".");
    if (!raw) return 0;
    var parts = raw.split(".");
    if (parts.length > 2) {
      var cents = parts.pop();
      raw = parts.join("") + "." + cents;
    }
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }
  function shareReceiptDescription(data, text) {
    var d =
      data &&
      (data.merchantName ||
        data.merchant ||
        data.storeName ||
        data.shopName ||
        data.vendor ||
        data.description ||
        data.desc ||
        data.categoryName ||
        data.category ||
        "");
    d = String(d || "").trim();
    if (d) return d;
    var lines = String(text || "")
      .split(/\r?\n/)
      .map(function (x) {
        return String(x || "").trim();
      })
      .filter(Boolean);
    for (var i = 0; i < Math.min(lines.length, 6); i++) {
      var l = lines[i];
      if (
        l &&
        !/\d{2,}/.test(l) &&
        !/totale|iva|documento|scontrino|pagamento/i.test(l)
      )
        return l;
    }
    return L("Scontrino Share");
  }
  async function processShareReceiptImage(img, name, flow) {
    try {
      setShareReceiptBusy(true);
      var token = "";
      try {
        if (fbAuth.currentUser) token = await fbAuth.currentUser.getIdToken();
      } catch (e) {}
      var ctrl = new AbortController();
      var timer = setTimeout(function () {
        try {
          ctrl.abort();
        } catch (e) {}
      }, 18000);
      var res = await fetch(RECEIPT_OCR_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          imageBase64: img,
          imageData: img,
          imageName: name || "share_receipt.jpg",
          locale: shareReceiptLocale(),
          strictTotal: true,
          instructions:
            "Estrai il totale finale pagato dello scontrino. Dai priorità a TOTALE COMPLESSIVO, TOTALE DOCUMENTO, TOTALE DA PAGARE, IMPORTO PAGATO, PAGAMENTO ELETTRONICO. Non usare IVA, imponibile, prezzo unitario, quantità o numero documento.",
        }),
      });
      clearTimeout(timer);
      var data = await res.json().catch(function () {
        return {};
      });
      if (!res.ok || data.ok === false)
        throw new Error(data.error || "Errore OCR " + res.status);
      var text =
        data.text ||
        data.ocrText ||
        data.rawText ||
        data.fullText ||
        data.extractedText ||
        data.receiptText ||
        "";
      var amount = shareReceiptNum(
        data.amount ||
          data.totalAmount ||
          data.total ||
          data.grandTotal ||
          data.paidAmount ||
          ""
      );
      if (!amount || amount <= 0)
        amount = shareReceiptNum(
          String(text || "").match(
            /(?:totale|pagare|pagato|complessivo)[^\d]{0,25}(\d+[,.]\d{1,2})/i
          )?.[1] || ""
        );
      if (!amount || amount <= 0) {
        setShareReceiptBusy(false);
        setShareReceiptReady(true);
        setShareExpenseMode("simple");
        setShareExpenseFormOpen(true);
        setSharePaidBy(String(currentShareMemberId || "me"));
        setShareParticipantIds(
          activeParticipants.map(function (p) {
            return p.id;
          })
        );
        setSplitMode("equal");
        setSplitDraft({});
        setShareSplitTouched(false);
        setToast({
          text: L(
            "Non riesco a leggere l'importo dello scontrino. Inseriscilo manualmente e salva la spesa Share."
          ),
          type: "error",
          icon: "🚫",
        });
        return;
      }
      var defaults = flow || shareReceiptCurrentDefaults();
      var draft = {
        projectId: String(defaults.projectId || ""),
        amount: Math.round(amount * 100) / 100,
        desc: shareReceiptDescription(data, text),
        date: data.date || todayStr(),
        paidBy: defaults.paidBy || String(currentShareMemberId || "me"),
        participantIds:
          defaults.participantIds && defaults.participantIds.length
            ? defaults.participantIds
            : activeParticipants.map(function (p) {
                return p.id;
              }),
        splitMode: "equal",
        source: "receipt",
        createdAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(
          "fainance_share_receipt_draft_v2",
          JSON.stringify(draft)
        );
        localStorage.removeItem("fainance_share_receipt_flow_v2");
      } catch (e) {}
      if (!applyShareReceiptDraftToForm(draft)) {
        setToast({
          text: L(
            "Scontrino letto. Riapri il progetto Share per confermare la spesa."
          ),
          type: "success",
          icon: "🧾",
        });
      }
    } catch (err) {
      setShareReceiptBusy(false);
      setShareReceiptReady(true);
      setShareExpenseMode("simple");
      setShareExpenseFormOpen(true);
      setSharePaidBy(String(currentShareMemberId || "me"));
      setShareParticipantIds(
        activeParticipants.map(function (p) {
          return p.id;
        })
      );
      setSplitMode("equal");
      setSplitDraft({});
      setShareSplitTouched(false);
      setToast({
        text: L(
          "Lettura scontrino non riuscita. Inserisci i dati manualmente e salva la spesa Share."
        ),
        type: "error",
        icon: "🚫",
      });
    }
  }
  async function startShareReceiptFlow() {
    if (!selected) {
      setToast(L("Seleziona un progetto Share."));
      return;
    }
    var flow = shareReceiptCurrentDefaults();
    try {
      localStorage.setItem(
        "fainance_share_receipt_flow_v2",
        JSON.stringify({ ...flow, ts: Date.now() })
      );
      localStorage.removeItem("fainance_share_receipt_draft_v2");
    } catch (e) {}
    setShareProjectTab("attivita");
    setSharePaidBy(String(currentShareMemberId || "me"));
    setShareParticipantIds(
      activeParticipants.map(function (p) {
        return p.id;
      })
    );
    setSplitMode("equal");
    setSplitDraft({});
    setShareSplitTouched(false);
    setShareExpenseFormOpen(true);
    setShareExpenseMode("simple");
    setShareReceiptOpen(false);
    setShareReceiptReady(true);
    setShareReceiptBusy(true);
    try {
      var cameraMod: any = await import("@capacitor/camera");
      var photo = await cameraMod.Camera.getPhoto({
        quality: 82,
        allowEditing: false,
        resultType: cameraMod.CameraResultType.DataUrl,
        source: cameraMod.CameraSource.Camera,
        direction: cameraMod.CameraDirection.Rear,
        saveToGallery: false,
        correctOrientation: true,
        promptLabelHeader: L("Scontrino"),
        promptLabelPhoto: L("Fotocamera posteriore"),
        promptLabelPicture: L("Fotocamera posteriore"),
      });
      var img = photo && photo.dataUrl ? photo.dataUrl : "";
      if (!img) {
        setShareReceiptBusy(false);
        setShareExpenseMode("simple");
        setShareExpenseFormOpen(true);
        return;
      }
      await processShareReceiptImage(
        img,
        "share_receipt_" + Date.now() + ".jpg",
        flow
      );
    } catch (err) {
      setShareReceiptBusy(false);
      setShareReceiptReady(true);
      setShareExpenseMode("simple");
      setShareExpenseFormOpen(true);
      setSharePaidBy(String(currentShareMemberId || "me"));
      setShareParticipantIds(
        activeParticipants.map(function (p) {
          return p.id;
        })
      );
      setSplitMode("equal");
      setSplitDraft({});
      setShareSplitTouched(false);
      setToast({
        text: L(
          "Fotocamera scontrino annullata o non disponibile. Inserisci i dati manualmente e salva la spesa Share."
        ),
        type: "error",
        icon: "📷",
      });
    }
  }
  function openShareReceiptFallbackForm(flow: any) {
    if (!flow || !selected || String(flow.projectId) !== String(selected.id))
      return false;
    var ids =
      flow.participantIds && flow.participantIds.length
        ? flow.participantIds
        : activeParticipants.map(function (p) {
            return p.id;
          });
    setShareProjectTab("attivita");
    setShareAmount(function (v) {
      return String(v || "");
    });
    setShareDesc(function (v) {
      return String(v || "") || L("Scontrino Share");
    });
    setShareDate(function (v) {
      return v || todayStr();
    });
    setSharePaidBy(flow.paidBy || String(currentShareMemberId || "me"));
    setShareParticipantIds(ids);
    setSplitMode("equal");
    setSplitDraft({});
    setShareSplitTouched(false);
    setShareReceiptOpen(false);
    setShareReceiptReady(true);
    setShareExpenseMode("simple");
    setShareExpenseFormOpen(true);
    setShareReceiptBusy(false);
    return true;
  }
  useEffect(
    function () {
      function tryApplyDraftOrFlow() {
        try {
          var raw = localStorage.getItem("fainance_share_receipt_draft_v2");
          if (raw) {
            var draft = JSON.parse(raw || "{}");
            if (
              draft &&
              selected &&
              String(draft.projectId) === String(selected.id)
            ) {
              applyShareReceiptDraftToForm(draft);
              return;
            }
          }
          var flowRaw = localStorage.getItem("fainance_share_receipt_flow_v2");
          if (!flowRaw) return;
          var flow = JSON.parse(flowRaw || "{}");
          var ts = Number(flow.ts || 0);
          if (ts && Date.now() - ts > 1000 * 60 * 30) {
            try {
              localStorage.removeItem("fainance_share_receipt_flow_v2");
            } catch (e) {}
            return;
          }
          if (
            flow &&
            selected &&
            String(flow.projectId) === String(selected.id)
          )
            openShareReceiptFallbackForm(flow);
        } catch (e) {}
      }
      tryApplyDraftOrFlow();
      var timers = [250, 900, 1800].map(function (ms) {
        return setTimeout(tryApplyDraftOrFlow, ms);
      });
      function onFallback(ev: any) {
        tryApplyDraftOrFlow();
      }
      try {
        window.addEventListener("fainance-share-receipt-fallback", onFallback);
        window.addEventListener("focus", onFallback);
        document.addEventListener("visibilitychange", onFallback);
      } catch (e) {}
      return function () {
        timers.forEach(function (t) {
          clearTimeout(t);
        });
        try {
          window.removeEventListener(
            "fainance-share-receipt-fallback",
            onFallback
          );
          window.removeEventListener("focus", onFallback);
          document.removeEventListener("visibilitychange", onFallback);
        } catch (e) {}
      };
    },
    [
      selected ? selected.id : null,
      activeParticipants
        .map(function (p) {
          return p.id;
        })
        .join("|"),
    ]
  );
  useEffect(
    function () {
      function handler(ev: any) {
        try {
          var detail =
            (ev && ev.detail) ||
            (window as any).__fainanceShareReceiptRestored ||
            {};
          var flow = detail.flow || {};
          var img = detail.image || "";
          if (
            img &&
            selected &&
            String(flow.projectId) === String(selected.id)
          ) {
            (window as any).__fainanceShareReceiptRestored = null;
            processShareReceiptImage(
              img,
              "share_receipt_restored_" + Date.now() + ".jpg",
              flow
            );
          }
        } catch (e) {}
      }
      try {
        window.addEventListener("fainance-share-receipt-restored", handler);
      } catch (e) {}
      setTimeout(function () {
        handler({ detail: (window as any).__fainanceShareReceiptRestored });
      }, 80);
      return function () {
        try {
          window.removeEventListener(
            "fainance-share-receipt-restored",
            handler
          );
        } catch (e) {}
      };
    },
    [selected ? selected.id : null]
  );
  useEffect(
    function () {
      var remove: any = null;
      var active = true;
      import("@capacitor/app")
        .then(function (mod: any) {
          if (!active) return;
          var App = mod.App || mod.default || mod;
          if (!App || !App.addListener) return;
          App.addListener("appRestoredResult", function (ev: any) {
            try {
              var raw = localStorage.getItem("fainance_share_receipt_flow_v2");
              if (!raw) return;
              var flow = JSON.parse(raw || "{}");
              var data = (ev && ev.data) || {};
              var img = data.dataUrl || data.webPath || "";
              if (img)
                processShareReceiptImage(
                  img,
                  "share_receipt_restored_" + Date.now() + ".jpg",
                  flow
                );
            } catch (e) {}
          })
            .then(function (h: any) {
              remove = h;
            })
            .catch(function () {});
        })
        .catch(function () {});
      return function () {
        active = false;
        try {
          if (remove && remove.remove) remove.remove();
        } catch (e) {}
      };
    },
    [selected ? selected.id : null]
  );
  function shareReceiptAllowed() {
    return currentPlan === "base" || currentPlan === "premium";
  }
  function addSixMonthsIso() {
    var d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString();
  }
  function activeShareReceiptForActivity(activityId) {
    return (
      (remoteShareAttachments || []).concat(shareReceiptUploads || []).find(function (r) {
        return (
          String(r.activityId || "") === String(activityId || "") &&
          (!r.expiresAt || new Date(r.expiresAt).getTime() > Date.now())
        );
      }) || null
    );
  }
  function openStoredShareReceipt(rec) {
    if (!rec || !rec.dataUrl) return;
    setShareReceiptPreview(rec);
  }
  function compressShareReceiptFile(file: any) {
    return new Promise(function (resolve, reject) {
      try {
        var reader = new FileReader();
        reader.onerror = function () {
          reject(new Error("read"));
        };
        reader.onload = function () {
          var img = new Image();
          img.onerror = function () {
            reject(new Error("image"));
          };
          img.onload = function () {
            var max = 1100;
            var scale = Math.min(
              1,
              max / Math.max(img.width || 1, img.height || 1)
            );
            var w = Math.max(1, Math.round((img.width || 1) * scale));
            var h = Math.max(1, Math.round((img.height || 1) * scale));
            var canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("canvas"));
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);
            var quality = 0.7;
            var out = canvas.toDataURL("image/jpeg", quality);
            while (out.length > 680000 && quality > 0.34) {
              quality -= 0.08;
              out = canvas.toDataURL("image/jpeg", quality);
            }
            if (out.length > 700000) {
              reject(new Error("too-large"));
              return;
            }
            resolve(out);
          };
          img.src = String(reader.result || "");
        };
        reader.readAsDataURL(file);
      } catch (e) {
        reject(e);
      }
    });
  }
  function dataUrlToFile(dataUrl: string, name: string) {
    var safeDataUrl = String(dataUrl || "");
    var parts = safeDataUrl.split(",");
    var meta = parts[0] || "data:image/jpeg;base64";
    var mimeMatch = meta.match(/data:(.*?);base64/);
    var mime = mimeMatch && mimeMatch[1] ? mimeMatch[1] : "image/jpeg";
    var binary = atob(parts[1] || "");
    var len = binary.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], name || "ricevuta.jpg", { type: mime });
  }

  async function shareCameraResultToFile(photo: any, name: string) {
    if (photo && photo.dataUrl) return dataUrlToFile(String(photo.dataUrl), name);
    var src = String((photo && photo.webPath) || "");
    if (!src && photo && photo.path) {
      try {
        src = Capacitor.convertFileSrc(String(photo.path || ""));
      } catch (_convertError) {
        src = String(photo.path || "");
      }
    }
    if (!src) throw new Error("camera-result-empty");
    var response = await fetch(src);
    if (!response.ok) throw new Error("camera-result-read");
    var blob = await response.blob();
    return new File([blob], name || "ricevuta.jpg", {
      type: blob.type || "image/jpeg",
    });
  }

  function clearShareAttachmentCameraRestoreState() {
    try {
      localStorage.removeItem(SHARE_ATTACHMENT_CAMERA_PENDING_KEY);
      localStorage.removeItem(SHARE_ATTACHMENT_CAMERA_RESTORED_KEY);
    } catch (_e) {}
    try {
      (window as any).__fainanceShareAttachmentCameraRestored = null;
    } catch (_e) {}
  }

  function restoreShareAttachmentExpenseDraft(pending: any) {
    if (!pending) return;
    try {
      setShareProjectTab("attivita");
      if (String(pending.context || "expense") === "settlement") {
        setShareExpenseFormOpen(false);
        setShareEditingActivityId(null);
        setSettlementFrom(String(pending.settlementFrom || currentShareMemberId || "me"));
        setSettlementTo(String(pending.settlementTo || ""));
        setSettlementAmount(String(pending.settlementAmount || ""));
        setSettlementDate(String(pending.settlementDate || todayStr()));
        setSettlementComment(String(pending.settlementComment || ""));
        setEditingSettlementActivityId(pending.editingSettlementActivityId || null);
        setSettlementPopupOpen(true);
        return;
      }
      setShareExpenseMode("simple");
      setShareExpenseFormOpen(true);
      setShareAmount(String(pending.amount || ""));
      setShareDesc(String(pending.desc || ""));
      setShareDate(String(pending.date || todayStr()));
      setSharePaidBy(String(pending.paidBy || currentShareMemberId || "me"));
      setShareParticipantIds(
        Array.isArray(pending.participantIds)
          ? pending.participantIds
          : activeParticipants.map(function (p) { return p.id; })
      );
      setShareCategoryId(String(pending.categoryId || ""));
      setSplitMode(String(pending.splitMode || "equal"));
      setSplitDraft(pending.splitDraft && typeof pending.splitDraft === "object" ? pending.splitDraft : {});
      setShareSplitTouched(!!pending.shareSplitTouched);
      if (pending.shareFx && typeof pending.shareFx === "object") setShareFx(pending.shareFx);
      setShareEditingActivityId(pending.editingActivityId || null);
    } catch (_e) {}
  }

  async function applyShareAttachmentCameraResult(photo: any, pending?: any) {
    var name = "share_receipt_" + Date.now() + ".jpg";
    var file = await shareCameraResultToFile(photo, name);
    var compressedCameraReceipt: any = await compressShareReceiptFile(file);
    restoreShareAttachmentExpenseDraft(pending);
    setSharePendingReceipt({
      id: "share_attachment_" + Date.now(),
      name: name,
      dataUrl: String(compressedCameraReceipt || ""),
      createdAt: new Date().toISOString(),
      expiresAt: addSixMonthsIso(),
    });
    clearShareAttachmentCameraRestoreState();
    setShareReceiptConfirmationOpen(true);
  }

  async function onShareReceiptFileSelected(ev: any) {
    var file = ev && ev.target && ev.target.files && ev.target.files[0];
    try {
      if (ev && ev.target) ev.target.value = "";
    } catch (e) {}
    if (!file) return;
    if (!shareReceiptAllowed()) {
      setToast({
        text: L("Funzione disponibile a partire dal piano Base"),
        type: "warning",
        icon: "🔒",
      });
      return;
    }
    try {
      var dataUrl: any = await compressShareReceiptFile(file);
      setSharePendingReceipt({
        id: "share_attachment_" + Date.now(),
        name: String(file.name || "ricevuta.jpg"),
        dataUrl: String(dataUrl || ""),
        createdAt: new Date().toISOString(),
        expiresAt: addSixMonthsIso(),
      });
      setShareReceiptConfirmationOpen(true);
    } catch (e) {
      setToast({
        text: L("Impossibile caricare la ricevuta"),
        type: "error",
        icon: "🚫",
      });
    }
  }
  async function requestShareReceiptUpload(context?: "expense" | "settlement") {
    if (!shareReceiptAllowed()) {
      setToast({
        text: L("Funzione disponibile a partire dal piano Base"),
        type: "warning",
        icon: "🔒",
      });
      return;
    }
    var receiptContext = context === "settlement" ? "settlement" : "expense";
    var pending: any = {
      ts: Date.now(),
      context: receiptContext,
      projectId: selected ? String(selected.id || "") : "",
      amount: String(shareAmount || ""),
      desc: String(shareDesc || ""),
      date: String(shareDate || todayStr()),
      paidBy: String(sharePaidBy || currentShareMemberId || "me"),
      participantIds: Array.isArray(shareParticipantIds) ? shareParticipantIds : [],
      categoryId: String(shareCategoryId || ""),
      splitMode: String(splitMode || "equal"),
      splitDraft: splitDraft || {},
      shareSplitTouched: !!shareSplitTouched,
      shareFx: shareFx || null,
      editingActivityId: shareEditingActivityId || null,
      settlementFrom: String(settlementFrom || ""),
      settlementTo: String(settlementTo || ""),
      settlementAmount: String(settlementAmount || ""),
      settlementDate: String(settlementDate || todayStr()),
      settlementComment: String(settlementComment || ""),
      editingSettlementActivityId: editingSettlementActivityId || null,
    };
    try {
      localStorage.setItem(SHARE_ATTACHMENT_CAMERA_PENDING_KEY, JSON.stringify(pending));
      localStorage.removeItem(SHARE_ATTACHMENT_CAMERA_RESTORED_KEY);
      // Evita che un vecchio flusso OCR Share intercetti lo stesso risultato Camera.
      localStorage.removeItem("fainance_share_receipt_flow_v2");
    } catch (_e) {}
    try {
      if (fainanceIsNativePlatform()) {
        var cameraMod: any = await import("@capacitor/camera");
        var photo = await cameraMod.Camera.getPhoto({
          quality: 84,
          allowEditing: false,
          // URI evita di mantenere una foto completa in base64 mentre l'Activity
          // fotocamera è aperta e consente di recuperare il risultato dopo una
          // ricreazione dell'Activity Android tramite appRestoredResult.
          resultType: cameraMod.CameraResultType.Uri,
          source: cameraMod.CameraSource.Camera,
          direction: cameraMod.CameraDirection.Rear,
          saveToGallery: false,
          correctOrientation: true,
          promptLabelHeader: L("Ricevuta"),
          promptLabelPhoto: L("Scatta foto"),
          promptLabelPicture: L("Scatta foto"),
        });
        if (photo && (photo.webPath || photo.path || photo.dataUrl)) {
          await applyShareAttachmentCameraResult(photo, pending);
          return;
        }
      }
      clearShareAttachmentCameraRestoreState();
      if (shareReceiptFileInputRef.current)
        shareReceiptFileInputRef.current.click();
    } catch (e) {
      var raw = String((e && e.message) || "");
      clearShareAttachmentCameraRestoreState();
      if (!/cancel|cancell|user/i.test(raw)) {
        setToast({ text: L("Non riesco ad aprire la fotocamera"), type: "error", icon: "📷" });
      }
      try {
        if (shareReceiptFileInputRef.current) shareReceiptFileInputRef.current.click();
      } catch (_fallbackReceiptError) {}
    }
  }

  useEffect(
    function () {
      var active = true;
      async function consumeRestoredShareAttachment(packet: any) {
        if (!active || shareAttachmentRestoreBusyRef.current) return;
        try {
          if (!packet) {
            packet = (window as any).__fainanceShareAttachmentCameraRestored || null;
          }
          if (!packet) {
            var raw = localStorage.getItem(SHARE_ATTACHMENT_CAMERA_RESTORED_KEY);
            if (raw) packet = JSON.parse(raw || "{}");
          }
          if (!packet || !packet.pending || !packet.data) return;
          var projectId = String(packet.pending.projectId || "");
          if (!selected || String(selected.id || "") !== projectId) return;
          if (!(packet.data.webPath || packet.data.path || packet.data.dataUrl)) return;
          shareAttachmentRestoreBusyRef.current = true;
          await applyShareAttachmentCameraResult(packet.data, packet.pending);
        } catch (_restoreError) {
          clearShareAttachmentCameraRestoreState();
          setToast({ text: L("Impossibile recuperare la foto della ricevuta"), type: "error", icon: "📷" });
        } finally {
          shareAttachmentRestoreBusyRef.current = false;
        }
      }
      function handler(ev: any) {
        consumeRestoredShareAttachment(ev && ev.detail ? ev.detail : null);
      }
      try {
        window.addEventListener(SHARE_ATTACHMENT_CAMERA_EVENT, handler);
      } catch (_e) {}
      var timers = [60, 300, 900].map(function (ms) {
        return setTimeout(function () { consumeRestoredShareAttachment(null); }, ms);
      });
      return function () {
        active = false;
        timers.forEach(function (t) { clearTimeout(t); });
        try {
          window.removeEventListener(SHARE_ATTACHMENT_CAMERA_EVENT, handler);
        } catch (_e) {}
      };
    },
    [selected ? selected.id : null]
  );

  useEffect(
    function () {
      var now = Date.now();
      var list = Array.isArray(shareReceiptUploads) ? shareReceiptUploads : [];
      var clean = list.filter(function (r) {
        return !r.expiresAt || new Date(r.expiresAt).getTime() > now;
      });
      if (clean.length !== list.length) setShareReceiptUploads(clean);
    },
    [selected ? selected.id : null, (shareReceiptUploads || []).length]
  );
  useEffect(
    function () {
      setRemoteShareAttachments([]);
      if (!selected || !selected.id || !firestoreReady) return;
      return watchShareAttachments(
        String(selected.id),
        setRemoteShareAttachments,
        function () {
          setRemoteShareAttachments([]);
        }
      );
    },
    [selected ? selected.id : null, firestoreReady]
  );

  function parseShareVoiceCommand(text) {
    var result = parseFainanceShareVoiceCommand(
      text,
      activeParticipants.map(function (p) {
        return {
          id: String(p.id),
          label: personLabel(p),
          name: p.name,
          email: p.email,
          isCurrent: String(p.id) === String(currentShareMemberId),
        };
      }),
      String(currentShareMemberId || "me")
    );
    if (result.amount) setShareAmount(String(result.amount));
    if (result.description) setShareDesc(result.description);
    if (result.paidBy) setSharePaidBy(result.paidBy);
    if (result.date) setShareDate(result.date);
    if (result.participantIds && result.participantIds.length)
      setShareParticipantIds(result.participantIds);
    setSplitMode(result.splitMode || "equal");
    setSplitDraft(result.splitDraft || {});
    setShareSplitTouched(
      !!(result.splitDraft && Object.keys(result.splitDraft).length)
    );
    if (
      (!result.splitDraft || !Object.keys(result.splitDraft).length) &&
      (result.splitMode || "equal") === "equal"
    ) {
      setShareSplitTouched(false);
    }
  }
  function startShareVoiceCommand() {
    var language =
      lang === "en"
        ? "en-US"
        : lang === "es"
        ? "es-ES"
        : lang === "fr"
        ? "fr-FR"
        : lang === "de"
        ? "de-DE"
        : lang === "pt"
        ? "pt-PT"
        : lang === "pl"
        ? "pl-PL"
        : lang === "nl"
        ? "nl-NL"
        : lang === "ro"
        ? "ro-RO"
        : lang === "el"
        ? "el-GR"
        : "it-IT";
    function applyVoiceText(txt) {
      txt = String(txt || "").trim();
      if (!txt) return;
      setShareVoiceText(txt);
      parseShareVoiceCommand(txt);
    }
    var safetyTimer: any = null;
    function stopSafetyTimer() {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
    }
    try {
      if (
        window &&
        window.Capacitor &&
        window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform()
      ) {
        setShareVoiceListening(true);
        (async function () {
          try {
            var speech: any = await import(
              "@capgo/capacitor-speech-recognition"
            );
            var SpeechRecognition: any =
              speech.SpeechRecognition || speech.default || speech;
            if (!SpeechRecognition || !SpeechRecognition.start)
              throw new Error("SpeechRecognition plugin non disponibile");
            var perm: any = SpeechRecognition.checkPermissions
              ? await SpeechRecognition.checkPermissions()
              : {};
            var permState = String(
              (perm && perm.speechRecognition) || ""
            ).toLowerCase();
            if (permState !== "granted") {
              perm = SpeechRecognition.requestPermissions
                ? await SpeechRecognition.requestPermissions()
                : perm;
              permState = String(
                (perm && perm.speechRecognition) || ""
              ).toLowerCase();
            }
            if (permState && permState !== "granted")
              throw new Error("Permesso microfono non concesso");
            try {
              if (SpeechRecognition.removeAllListeners)
                await SpeechRecognition.removeAllListeners();
            } catch (e) {}
            safetyTimer = setTimeout(function () {
              try {
                if (SpeechRecognition.forceStop)
                  SpeechRecognition.forceStop({ timeout: 1200 });
                else if (SpeechRecognition.stop) SpeechRecognition.stop();
              } catch (e) {}
              setShareVoiceListening(false);
            }, 13000);
            var res: any = await SpeechRecognition.start({
              language: language,
              maxResults: 3,
              partialResults: false,
              popup: false,
              prompt: "Parla ora",
              addPunctuation: true,
            });
            var nativeText =
              (res && res.matches && res.matches[0]) ||
              (res && res.value) ||
              "";
            applyVoiceText(nativeText);
          } catch (err) {
            setToast({
              text: L("Errore riconoscimento vocale"),
              type: "error",
              color: "#E24B4A",
              icon: "🎙️",
            });
          } finally {
            stopSafetyTimer();
            setShareVoiceListening(false);
          }
        })();
        return;
      }
      var SpeechRecognition: any =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setToast({
          text: L(
            "Riconoscimento vocale non disponibile su questo dispositivo"
          ),
          type: "warning",
          color: "#EF9F27",
          icon: "🎙️",
        });
        return;
      }
      var rec = new SpeechRecognition();
      rec.lang = language;
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;
      var best = "";
      rec.onresult = function (ev: any) {
        var text = "";
        for (var i = 0; i < ev.results.length; i++) {
          text +=
            String((ev.results[i][0] && ev.results[i][0].transcript) || "") +
            " ";
        }
        best = text.trim() || best;
        applyVoiceText(best);
      };
      rec.onerror = function () {
        stopSafetyTimer();
        setShareVoiceListening(false);
      };
      rec.onend = function () {
        stopSafetyTimer();
        setShareVoiceListening(false);
        if (best) applyVoiceText(best);
      };
      setShareVoiceListening(true);
      safetyTimer = setTimeout(function () {
        try {
          rec.stop();
        } catch (e) {}
      }, 12000);
      rec.start();
    } catch (e) {
      stopSafetyTimer();
      setShareVoiceListening(false);
      setToast({
        text: L("Errore riconoscimento vocale"),
        type: "error",
        color: "#E24B4A",
        icon: "🎙️",
      });
    }
  }

  function resetNewProjectDraft() {
    setNewProjectName("");
    setNewProjectDesc("");
    setNewProjectIcon("🤝");
    setNewProjectColor("#4F8FF7");
  }
  function projectTheme(p) {
    return { icon: (p && p.icon) || "🤝", color: (p && p.color) || "#4F8FF7" };
  }
  var shareProjectIcons = ["🤝", "🏠", "✈️", "🍽️", "👨‍👩‍👧‍👦", "🎉", "🚗", "💼"];
  var shareProjectColors = [
    "#4F8FF7",
    "#7F77DD",
    "#1D9E75",
    "#F29F3D",
    "#E24B4A",
    "#16A6C9",
    "#F06292",
    "#26A69A",
    "#FF7043",
    "#5C6BC0",
    "#8D6E63",
    "#78909C",
    "#C0CA33",
    "#AB47BC",
    "#42A5F5",
  ];
  function normalizeShareDisplayName(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
  function participantNameLooksUsable(p, value) {
    var clean = normalizeShareDisplayName(value);
    if (!clean) return false;
    if (p && (p.kind === "fake" || p.type === "fake")) return true;
    var lower = clean.replace(/^@+/, "").toLocaleLowerCase();
    if (clean.charAt(0) === "@" || clean.indexOf("@") >= 0) return false;
    var username = String((p && p.username) || "").replace(/^@+/, "").trim().toLocaleLowerCase();
    var email = normalizeEmail((p && p.email) || "");
    var emailLocal = email ? String(email.split("@")[0] || "").toLocaleLowerCase() : "";
    if (username && lower === username) return false;
    if (emailLocal && lower === emailLocal) return false;
    if (["utente", "user", "partecipante", "participant"].indexOf(lower) >= 0) return false;
    return true;
  }
  function currentShareFullName() {
    var firstName = normalizeShareDisplayName(currentUser && currentUser.firstName);
    var lastName = normalizeShareDisplayName(currentUser && currentUser.lastName);
    if (firstName && lastName) return firstName + " " + lastName;
    var direct = normalizeShareDisplayName(currentUser && currentUser.name);
    return participantNameLooksUsable({ email: currentUser && currentUser.email, username: currentUser && currentUser.username }, direct)
      ? direct
      : "";
  }
  function personFullName(p) {
    if (!p) return L("Partecipante");
    var key = String(p.id || p.uid || "");
    var resolved = normalizeShareDisplayName(shareResolvedParticipantNames[key]);
    if (resolved && participantNameLooksUsable(p, resolved)) return resolved;
    if (String(p.uid || "") === String(userId || "") || String(p.id || "") === String(currentShareMemberId || "")) {
      var mine = currentShareFullName();
      if (mine) return mine;
    }
    var firstLast = [p.firstName, p.lastName]
      .map(normalizeShareDisplayName)
      .filter(Boolean)
      .join(" ");
    if (firstLast && participantNameLooksUsable(p, firstLast)) return firstLast;
    var stored = normalizeShareDisplayName(p.name || p.displayName || p.fullName || "");
    if (participantNameLooksUsable(p, stored)) return stored;
    return L("Partecipante");
  }
  function personLabel(p) {
    var full = personFullName(p);
    if (full === L("Partecipante")) return full;
    var parts = full.split(/\s+/).filter(Boolean);
    if (!parts.length) return full;
    var first = parts[0];
    var sameFirst = (participants || []).filter(function (candidate) {
      var candidateFull = personFullName(candidate);
      if (candidateFull === L("Partecipante")) return false;
      var candidateParts = candidateFull.split(/\s+/).filter(Boolean);
      return candidateParts.length && candidateParts[0].toLocaleLowerCase() === first.toLocaleLowerCase();
    });
    if (sameFirst.length > 1 && parts.length > 1) {
      return first + " " + String(parts[parts.length - 1] || "").slice(0, 1).toUpperCase() + ".";
    }
    return first;
  }
  function personLabelById(id) {
    var participant = (participants || []).find(function (candidate) {
      return String(candidate.id) === String(id);
    });
    return participant ? personLabel(participant) : L("Partecipante");
  }
  useEffect(
    function () {
      var cancelled = false;
      if (!selected || !(participants || []).length) {
        setShareResolvedParticipantNames({});
        return function () { cancelled = true; };
      }
      (async function () {
        var resolvedNames: any = {};
        var changedNames: any = {};
        for (var i = 0; i < (participants || []).length; i++) {
          var participant: any = participants[i];
          if (!participant) continue;
          var key = String(participant.id || participant.uid || "");
          if (!key) continue;
          if (String(participant.uid || "") === String(userId || "")) {
            var ownFullName = currentShareFullName();
            if (ownFullName) {
              resolvedNames[key] = ownFullName;
              var ownStored = normalizeShareDisplayName(participant.name || participant.displayName || "");
              if (ownStored !== ownFullName) changedNames[key] = ownFullName;
            }
            continue;
          }
          if (!participant.uid && !participant.email && !participant.username) continue;
          try {
            var found = await findRegisteredUserForShare(
              participant.email || "",
              participant.phone || "",
              participant.username || "",
              participant.uid || ""
            );
            var foundFirstLast = [found && found.firstName, found && found.lastName]
              .map(normalizeShareDisplayName)
              .filter(Boolean)
              .join(" ");
            var full = normalizeShareDisplayName(
              foundFirstLast || (found && (found.name || found.displayName || found.fullName)) || ""
            );
            if (!participantNameLooksUsable({ ...participant, ...(found || {}) }, full)) continue;
            resolvedNames[key] = full;
            var stored = String(participant.name || participant.displayName || "").replace(/\s+/g, " ").trim();
            if (stored !== full) changedNames[key] = full;
          } catch (_shareParticipantNameResolveError) {}
        }
        if (cancelled) return;
        setShareResolvedParticipantNames(resolvedNames);
        var changeKeys = Object.keys(changedNames);
        if (changeKeys.length && selected) {
          updateShareProject(selected.id, function (project) {
            return {
              ...project,
              participants: (project.participants || []).map(function (participant) {
                var key = String(participant.id || participant.uid || "");
                return changedNames[key] ? { ...participant, name: changedNames[key], displayName: changedNames[key] } : participant;
              }),
              updatedAt: new Date().toISOString(),
            };
          });
        }
      })();
      return function () { cancelled = true; };
    },
    [
      selected ? selected.id : "",
      (participants || []).map(function (p) {
        return [p.id, p.uid, p.email, p.username, p.name, p.displayName].join("~");
      }).join("|"),
      currentUser && currentUser.name,
      currentUser && currentUser.firstName,
      currentUser && currentUser.lastName,
      currentUser && currentUser.username,
      userId,
    ]
  );
  var currentShareMember =
    (participants || []).find(function (p) {
      return p.uid === userId;
    }) ||
    (participants || []).find(function (p) {
      return p.id === "me";
    });
  var currentShareMemberId = currentShareMember ? currentShareMember.id : "me";
  useEffect(
    function () {
      var ids = activeParticipants.map(function (p) {
        return String(p.id);
      });
      if (!ids.length) {
        setSettlementFrom("");
        setSettlementTo("");
        return;
      }
      var preferredFrom = ids.includes(String(currentShareMemberId || ""))
        ? String(currentShareMemberId)
        : ids[0];
      setSettlementFrom(function (prev) {
        return ids.includes(String(prev || "")) ? String(prev) : preferredFrom;
      });
      setSettlementTo(function (prev) {
        var fromNow = ids.includes(String(settlementFrom || ""))
          ? String(settlementFrom)
          : preferredFrom;
        if (ids.includes(String(prev || "")) && String(prev) !== fromNow)
          return String(prev);
        return (
          ids.find(function (id) {
            return id !== fromNow;
          }) || ""
        );
      });
    },
    [
      selected ? selected.id : null,
      activeParticipants
        .map(function (p) {
          return String(p.id);
        })
        .join("|"),
      currentShareMemberId,
      settlementFrom,
    ]
  );
  useEffect(
    function () {
      var ids = activeParticipants.map(function (p) {
        return p.id;
      });
      if (ids.length && !ids.includes(sharePaidBy))
        setSharePaidBy(
          currentShareMemberId && ids.includes(currentShareMemberId)
            ? currentShareMemberId
            : ids[0]
        );
    },
    [
      selected ? selected.id : null,
      activeParticipants
        .map(function (p) {
          return p.id;
        })
        .join("|"),
      currentShareMemberId,
    ]
  );
  useEffect(
    function () {
      setNewShareCategoryColor(selected && selected.color ? selected.color : confirmButtonColor || "#4F8FF7");
    },
    [selected ? selected.id : null, selected && selected.color, confirmButtonColor]
  );
  function resetNewShareCategoryForm() {
    setEditingShareCategoryId("");
    setEditingShareCategoryName("");
    setNewShareCategoryName("");
    setNewShareCategoryIcon("🏷️");
    setNewShareCategoryColor(selected && selected.color ? selected.color : confirmButtonColor || "#4F8FF7");
    setShareCategoryMappingDraft("");
    setShowNewShareCategoryPopup(false);
  }
  function openNewShareCategoryPopup() {
    if (!canManageShareCategories) return;
    setEditingShareCategoryId("");
    setEditingShareCategoryName("");
    setNewShareCategoryName("");
    setNewShareCategoryIcon("🏷️");
    setNewShareCategoryColor(selected && selected.color ? selected.color : confirmButtonColor || "#4F8FF7");
    setShareCategoryMappingDraft("");
    setShowNewShareCategoryPopup(true);
  }
  function openEditShareCategoryPopup(category) {
    if (!category) return;
    setEditingShareCategoryId(String(category.id || ""));
    setEditingShareCategoryName(String(category.name || ""));
    setNewShareCategoryName(String(category.name || ""));
    setNewShareCategoryIcon(String(category.icon || "🏷️"));
    setNewShareCategoryColor(String(category.color || selected.color || confirmButtonColor || "#4F8FF7"));
    setShareCategoryMappingDraft(shareCategoryMappingValue(category.id));
    setShowNewShareCategoryPopup(true);
  }
  function saveProjectDetails() {
    if (!shareProjectDetailsValid) return;
    var v = String(projectNameDraft || "").trim();
    var d = (projectDescDraft || "").trim();
    updateShareProject(selected.id, function (p) {
      return {
        ...p,
        name: v,
        description: d,
        icon: projectIconDraft || "🤝",
        color: projectColorDraft || "#4F8FF7",
        updatedAt: new Date().toISOString(),
      };
    });
    setProjectEditingDetails(false);
    setToast("Progetto Share aggiornato");
  }
  function shareCategoryMappingValue(categoryId) {
    var projectMap =
      shareCategoryMappings && selected && shareCategoryMappings[String(selected.id)];
    return projectMap && typeof projectMap === "object"
      ? String(projectMap[String(categoryId)] || "")
      : "";
  }
  function setShareCategoryMappingValue(categoryId, personalCategoryId) {
    if (!selected || !setShareCategoryMappings) return;
    var projectId = String(selected.id);
    var shareId = String(categoryId || "");
    setShareCategoryMappings(function (current) {
      var next = { ...(current || {}) };
      var projectMap = { ...(next[projectId] || {}) };
      if (personalCategoryId) projectMap[shareId] = String(personalCategoryId);
      else delete projectMap[shareId];
      if (Object.keys(projectMap).length) next[projectId] = projectMap;
      else delete next[projectId];
      return next;
    });
  }
  function addShareProjectCategory() {
    if (!selected) return;
    var name = String(newShareCategoryName || "").trim();
    var now = new Date().toISOString();

    if (editingShareCategoryId) {
      if (canManageShareCategories) {
        if (!name) {
          setToast(L("Inserisci il nome della categoria Share"));
          return;
        }
        updateShareProject(selected.id, function (project) {
          return {
            ...project,
            categories: (project.categories || []).map(function (category) {
              return String(category.id) === String(editingShareCategoryId)
                ? {
                    ...category,
                    name: name,
                    icon: String(newShareCategoryIcon || "🏷️"),
                    color: String(newShareCategoryColor || selected.color || confirmButtonColor || "#4F8FF7"),
                    updatedAt: now,
                  }
                : category;
            }),
          };
        });
      }
      setShareCategoryMappingValue(editingShareCategoryId, shareCategoryMappingDraft);
      resetNewShareCategoryForm();
      setToast(L("Categoria Share aggiornata"));
      return;
    }

    if (!canManageShareCategories) return;
    if (!name) {
      setToast(L("Inserisci il nome della categoria Share"));
      return;
    }
    var category = {
      id: "sc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
      name: name,
      icon: String(newShareCategoryIcon || "🏷️"),
      color: String(newShareCategoryColor || selected.color || confirmButtonColor || "#4F8FF7"),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    updateShareProject(selected.id, function (project) {
      return { ...project, categories: (project.categories || []).concat([category]) };
    });
    if (shareCategoryMappingDraft) setShareCategoryMappingValue(category.id, shareCategoryMappingDraft);
    if (!shareCategoryId) setShareCategoryId(String(category.id));
    resetNewShareCategoryForm();
    setToast(L("Categoria Share aggiunta"));
  }
  function deleteShareProjectCategory(categoryId) {
    if (!selected || !canManageShareCategories) return;
    if (!window.confirm(L("Eliminare questa categoria Share? Le spese storiche resteranno conservate e useranno la categoria personale predefinita.")))
      return;
    var now = new Date().toISOString();
    updateShareProject(selected.id, function (project) {
      return {
        ...project,
        categories: (project.categories || []).map(function (category) {
          return String(category.id) === String(categoryId)
            ? {
                ...category,
                status: "deleted",
                deletedAt: now,
                updatedAt: now,
              }
            : category;
        }),
      };
    });
    if (String(shareCategoryId || "") === String(categoryId))
      setShareCategoryId("");
    setEditingShareCategoryId("");
    setEditingShareCategoryName("");
    setToast(L("Categoria Share eliminata"));
  }
  function moveShareProjectCategory(categoryId, direction) {
    if (!selected || !canManageShareCategories) return;
    var visibleIds = projectShareCategories.map(function (category) {
      return String(category.id || "");
    });
    var currentIndex = visibleIds.indexOf(String(categoryId || ""));
    if (currentIndex < 0) return;
    var targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= visibleIds.length) return;
    var swapId = visibleIds[targetIndex];
    updateShareProject(selected.id, function (project) {
      var categories = (project.categories || []).slice();
      var indexA = categories.findIndex(function (category) {
        return String(category && category.id || "") === String(categoryId || "");
      });
      var indexB = categories.findIndex(function (category) {
        return String(category && category.id || "") === String(swapId || "");
      });
      if (indexA < 0 || indexB < 0) return project;
      var temp = categories[indexA];
      categories[indexA] = categories[indexB];
      categories[indexB] = temp;
      return {
        ...project,
        categories: categories,
        updatedAt: new Date().toISOString(),
      };
    });
  }
  function createProjectFromDraft() {
    if (shareProjectLimitReached) {
      setToast({
        text: L(
          "Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione."
        ),
        type: "error",
        color: "#E24B4A",
        icon: "🚫",
      });
      return;
    }
    var v = (newProjectName || "").trim();
    var d = (newProjectDesc || "").trim();
    if (!v) {
      setToast("Inserisci il nome del progetto Share");
      return;
    }
    var p = createShareProject(v, d, newProjectIcon, newProjectColor);
    if (p) {
      setShowNewProjectForm(false);
      resetNewProjectDraft();
      setToast("Progetto Share creato");
    }
  }
  function requestDeleteProject(pid) {
    if (!pid) return;
    if (requestShareProjectDeletion) requestShareProjectDeletion(pid);
    else deleteShareProject(pid, false);
  }
  function saveNewShareProject() {
    if (shareProjectLimitReached) {
      setToast({
        text: L(
          "Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione."
        ),
        type: "error",
        color: "#E24B4A",
        icon: "🚫",
      });
      return;
    }
    var name = (newProjectName || "").trim();
    if (!name) {
      setToast("Inserisci il nome del progetto Share");
      return;
    }
    var created = createShareProject(
      name,
      (newProjectDesc || "").trim(),
      newProjectIcon,
      newProjectColor
    );
    if (created) {
      resetNewProjectDraft();
      setShowNewProjectForm(false);
      setToast("Progetto Share creato");
    }
  }
  async function addParticipant() {
    if (!shareParticipantFormValid) return;
    var name = newPersonName.trim();
    var lookupValue = String(newPersonEmail || "").trim();
    var usernameLookup =
      lookupValue.charAt(0) === "@" || lookupValue.indexOf("@") < 0
        ? lookupValue.replace(/^@+/, "")
        : "";
    var email = usernameLookup ? "" : normalizeEmail(lookupValue);
    if (personMode === "fake") {
      if (!name) {
        setToast({
          text: "Inserisci il nome della persona esterna",
          type: "warning",
          color: "#FFF8E1",
          icon: "⚠️",
          textColor: "#856404",
        });
        return;
      }
      var fakeItem = {
        id: "p_" + Date.now(),
        name: name,
        email: "",
        kind: "fake",
        type: "fake",
        role: "member",
        status: "active",
      };
      updateShareProject(selected.id, function (p) {
        return {
          ...p,
          participants: (p.participants || []).concat([fakeItem]),
        };
      });
      setNewPersonName("");
      setNewPersonEmail("");
      setShareParticipantPopupOpen(false);
      setToast("Persona esterna aggiunta");
      return;
    }
    if (!email && !usernameLookup) {
      setToast({
        text: L("Inserisci l'email o lo username dell'utente"),
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      });
      return;
    }
    setParticipantBusy(true);
    try {
      var foundUser = await findRegisteredUserForShare(email, "", usernameLookup);
      if (usernameLookup && !foundUser) {
        setToast({
          text: L("Nessun utente trovato con questo username"),
          type: "warning",
          color: "#FFF8E1",
          icon: "🔎",
          textColor: "#856404",
        });
        return;
      }
      var foundFullName = foundUser
        ? normalizeShareDisplayName(
            [foundUser.firstName, foundUser.lastName].filter(Boolean).join(" ") ||
            foundUser.name || foundUser.displayName || foundUser.fullName || ""
          )
        : "";
      name = participantNameLooksUsable(foundUser || { email: email, username: usernameLookup }, foundFullName)
        ? foundFullName
        : L("Partecipante");
      var item = {
        id: "p_" + Date.now(),
        uid: foundUser ? foundUser.uid : null,
        name: name,
        email: email,
        username: foundUser ? foundUser.username || usernameLookup : "",
        kind: foundUser ? "registered" : "invited",
        type: foundUser ? "registered" : "invited",
        role: "member",
        status: "pending",
      };
      // FIX 2.4.3 - invitedEmails serve alle regole Firestore: chi e' invitato ma non
      // ha ancora accettato non figura fra memberUids, e senza questo elenco non
      // potrebbe leggere il progetto ne' aggiungersi accettando.
      updateShareProject(selected.id, function (p) {
        var pendingEmails = Array.isArray(p.invitedEmails) ? p.invitedEmails.slice() : [];
        if (email && pendingEmails.indexOf(email) < 0) pendingEmails.push(email);
        return {
          ...p,
          participants: (p.participants || []).concat([item]),
          invitedEmails: pendingEmails,
        };
      });
      await createShareInvite(selected, item, email, name, foundUser);
      setNewPersonName("");
      setNewPersonEmail("");
      setShareParticipantPopupOpen(false);
      setToast(
        foundUser
          ? L("Invito Share inviato correttamente.")
          : "Invito creato: email inviata. Quando l'utente si registra con questa email, troverà l'invito."
      );
    } catch (e) {
      console.error(e);
      setToast("Errore durante la creazione dell'invito");
    } finally {
      setParticipantBusy(false);
    }
  }
  async function pickContactFromAddressBook() {
    if (!selected || participantBusy) return;
    setParticipantBusy(true);
    try {
      var c = await pickFainanceContact();
      if (!c) {
        setToast({
          text: L("Rubrica non disponibile su questo dispositivo."),
          type: "warning",
          icon: "📇",
          color: "#FFF8E1",
          textColor: "#856404",
        });
        return;
      }
      var nm = String(c.name || "").trim();
      var em = normalizeEmail(c.email || "");
      var ph = normalizePhoneForLookup(c.phone || "");
      var label = (nm || em || ph || "").trim();
      if (!label) {
        setToast({
          text: L("Contatto senza nome o email."),
          type: "warning",
          icon: "📇",
          color: "#FFF8E1",
          textColor: "#856404",
        });
        return;
      }
      var foundUser = await findRegisteredUserForShare(em, ph, "");
      if (foundUser && foundUser.email && !em)
        em = normalizeEmail(foundUser.email);
      var already = (participants || []).some(function (p) {
        var pe = normalizeEmail(p.email || "");
        var pp = normalizePhoneForLookup(p.phone || "");
        var pn = String(p.name || "")
          .trim()
          .toLowerCase();
        return (
          (em && pe && pe === em) ||
          (ph && pp && pp === ph) ||
          (!em && !ph && pn && pn === label.toLowerCase()) ||
          (foundUser && p.uid && p.uid === foundUser.uid)
        );
      });
      if (already) {
        setToast({
          text: L("Partecipante già presente"),
          type: "warning",
          icon: "📇",
          color: "#FFF8E1",
          textColor: "#856404",
        });
        return;
      }
      if (foundUser) {
        var foundContactFullName = normalizeShareDisplayName(
          [foundUser.firstName, foundUser.lastName].filter(Boolean).join(" ") ||
          foundUser.name || foundUser.displayName || foundUser.fullName || ""
        );
        var name = participantNameLooksUsable(foundUser, foundContactFullName)
          ? foundContactFullName
          : (nm || L("Partecipante"));
        var item = {
          id: "p_" + Date.now(),
          uid: foundUser.uid,
          email: em || normalizeEmail(foundUser.email || ""),
          phone: ph || normalizePhoneForLookup(foundUser.phone || ""),
          name: name,
          kind: "registered",
          type: "registered",
          role: "member",
          status: "pending",
        };
        updateShareProject(selected.id, function (p) {
          return {
            ...p,
            participants: (p.participants || []).concat([item]),
            updatedAt: new Date().toISOString(),
          };
        });
        try {
          await createShareInvite(
            selected,
            item,
            item.email || "",
            name,
            foundUser
          );
        } catch (inviteErr) {
          console.warn("Share invite from contact not sent", inviteErr);
        }
        setPersonMode("user");
        setNewPersonEmail("");
        setNewPersonName("");
        setToast({
          text: L("Invito Share inviato correttamente."),
          type: "success",
          icon: "📇",
        });
        return;
      }
      if (em) {
        var itemInv = {
          id: "p_" + Date.now(),
          uid: null,
          name: nm || em,
          email: em,
          phone: ph,
          kind: "invited",
          type: "invited",
          role: "member",
          status: "pending",
        };
        updateShareProject(selected.id, function (p) {
          return {
            ...p,
            participants: (p.participants || []).concat([itemInv]),
            updatedAt: new Date().toISOString(),
          };
        });
        try {
          await createShareInvite(selected, itemInv, em, nm || em, null);
        } catch (inviteErr2) {
          console.warn("Share invite from contact not sent", inviteErr2);
        }
        setPersonMode("user");
        setNewPersonEmail("");
        setNewPersonName("");
        setToast({
          text: L("Contatto importato dalla rubrica"),
          type: "success",
          icon: "📇",
        });
        return;
      }
      var fakeItem = {
        id: "p_" + Date.now(),
        name: label,
        email: "",
        phone: ph,
        kind: "fake",
        type: "fake",
        role: "member",
        status: "active",
      };
      updateShareProject(selected.id, function (p) {
        return {
          ...p,
          participants: (p.participants || []).concat([fakeItem]),
          updatedAt: new Date().toISOString(),
        };
      });
      setPersonMode("fake");
      setNewPersonEmail("");
      setNewPersonName("");
      setToast({
        text: L("Contatto importato dalla rubrica"),
        type: "success",
        icon: "📇",
      });
    } catch (e) {
      console.error(e);
      setToast({
        text: L("Rubrica non disponibile su questo dispositivo."),
        type: "warning",
        icon: "📇",
        color: "#FFF8E1",
        textColor: "#856404",
      });
    } finally {
      setParticipantBusy(false);
    }
  }
  function removeParticipant(pid) {
    if (!selected || pid === "me") return;
    if (!window.confirm(L("Eliminare questa persona dal progetto Share?")))
      return;
    updateShareProject(selected.id, function (p) {
      return {
        ...p,
        participants: (p.participants || []).filter(function (x) {
          return x.id !== pid;
        }),
      };
    });
    setToast("Partecipante eliminato");
  }
  function archiveParticipant(pid) {
    if (!selected || pid === "me") return;
    if (!window.confirm(L("Archiviare questa persona dal progetto Share?")))
      return;
    updateShareProject(selected.id, function (p) {
      return {
        ...p,
        participants: (p.participants || []).map(function (x) {
          return x.id === pid ? { ...x, status: "archived" } : x;
        }),
      };
    });
    setToast("Partecipante archiviato");
  }
  function restoreParticipant(pid) {
    if (!selected || pid === "me") return;
    updateShareProject(selected.id, function (p) {
      return {
        ...p,
        participants: (p.participants || []).map(function (x) {
          return x.id === pid ? { ...x, status: "active" } : x;
        }),
      };
    });
  }
  function shareRound(v) {
    return Math.round((Number(v) || 0) * 100) / 100;
  }
  function shareNum(v) {
    return parseMoney(String(v || "").replace(",", "."));
  }
  function shareAccountingAmount() {
    return String(shareFx.currency || _c.currency) !== String(_c.currency) && Number(shareFx.baseAmount) > 0
      ? shareRound(Number(shareFx.baseAmount))
      : shareRound(shareNum(shareAmount) || 0);
  }
  function selectedShareIds() {
    var activeIds = activeParticipants.map(function (p) {
      return p.id;
    });
    return (
      shareParticipantIds && shareParticipantIds.length
        ? shareParticipantIds
        : activeIds
    ).filter(function (id) {
      return activeIds.includes(id);
    });
  }
  function computeShares() {
    var amount = shareAccountingAmount();
    var ids = selectedShareIds();
    var shares = {};
    if (!ids.length) return shares;
    if (splitMode === "equal") {
      var remaining = amount;
      ids.forEach(function (id, i) {
        var value =
          i === ids.length - 1 ? remaining : shareRound(amount / ids.length);
        shares[id] = shareRound(value);
        remaining = shareRound(remaining - value);
      });
    } else if (splitMode === "percent") {
      ids.forEach(function (id) {
        shares[id] = shareRound(
          amount * ((parseFloat(splitDraft[id]) || 0) / 100)
        );
      });
    } else {
      ids.forEach(function (id) {
        shares[id] = shareRound(parseFloat(splitDraft[id]) || 0);
      });
    }
    return shares;
  }
  function shareValidation() {
    var amount = shareAccountingAmount();
    var ids = selectedShareIds();
    if (!amount || amount <= 0)
      return { ok: false, blocking: false, message: "" };
    if (!ids.length)
      return {
        ok: false,
        blocking: true,
        message: L(
          "Seleziona almeno un partecipante con cui condividere la spesa."
        ),
      };
    if (splitMode === "percent") {
      var pct = ids.reduce(function (a, id) {
        return a + (parseFloat(splitDraft[id]) || 0);
      }, 0);
      var pctDiff = shareRound(100 - pct);
      if (Math.abs(pctDiff) > 0.009) {
        var moneyDiff = shareRound(amount * (pctDiff / 100));
        return {
          ok: false,
          blocking: true,
          message:
            pctDiff > 0
              ? lang === "es"
                ? "Falta todavía el " +
                  pctDiff.toFixed(2).replace(".", ",") +
                  "% (" +
                  fmt(Math.abs(moneyDiff)) +
                  ") para llegar al 100%."
                : lang === "en"
                ? "Still missing " +
                  pctDiff.toFixed(2).replace(".", ",") +
                  "% (" +
                  fmt(Math.abs(moneyDiff)) +
                  ") to reach 100%."
                : "Manca ancora il " +
                  pctDiff.toFixed(2).replace(".", ",") +
                  "% (" +
                  fmt(Math.abs(moneyDiff)) +
                  ") per arrivare al 100%."
              : lang === "es"
              ? "Has superado el 100% en " +
                Math.abs(pctDiff).toFixed(2).replace(".", ",") +
                "% (" +
                fmt(Math.abs(moneyDiff)) +
                ")."
              : lang === "en"
              ? "You exceeded 100% by " +
                Math.abs(pctDiff).toFixed(2).replace(".", ",") +
                "% (" +
                fmt(Math.abs(moneyDiff)) +
                ")."
              : "Hai superato il 100% di " +
                Math.abs(pctDiff).toFixed(2).replace(".", ",") +
                "% (" +
                fmt(Math.abs(moneyDiff)) +
                ").",
        };
      }
    }
    if (splitMode === "amount") {
      var sum = ids.reduce(function (a, id) {
        return a + shareRound(parseFloat(splitDraft[id]) || 0);
      }, 0);
      var diff = shareRound(amount - sum);
      if (Math.abs(diff) > 0.009)
        return {
          ok: false,
          blocking: true,
          message:
            diff > 0
              ? lang === "es"
                ? "Faltan todavía " +
                  fmt(Math.abs(diff)) +
                  " para llegar al total."
                : lang === "en"
                ? "Still missing " +
                  fmt(Math.abs(diff)) +
                  " to reach the total."
                : "Mancano ancora " +
                  fmt(Math.abs(diff)) +
                  " per arrivare al totale."
              : lang === "es"
              ? "Has superado el total en " + fmt(Math.abs(diff)) + "."
              : lang === "en"
              ? "You exceeded the total by " + fmt(Math.abs(diff)) + "."
              : "Hai superato il totale di " + fmt(Math.abs(diff)) + ".",
        };
    }
    return { ok: true, blocking: false, message: "" };
  }
  var newShareProjectFormValid = !!String(newProjectName || "").trim();
  var shareProjectDetailsValid =
    !!selected && !!String(projectNameDraft || "").trim();
  var shareParticipantFormValid =
    !!selected &&
    !participantBusy &&
    (personMode === "fake"
      ? !!String(newPersonName || "").trim()
      : !!String(newPersonEmail || "").trim());
  var currentShareValidation = shareValidation();
  var shareExpenseFormValid =
    !!selected &&
    shareNum(shareAmount) > 0 &&
    !!String(shareDate || "").trim() &&
    !!String(sharePaidBy || "").trim() &&
    selectedShareIds().length > 0 &&
    currentShareValidation.ok &&
    !currentShareValidation.blocking;
  function resetSettlementForm() {
    setSettlementFrom(currentShareMemberId || (participants[0] ? participants[0].id : "me"));
    var defaultTo = activeParticipants.find(function (p) { return String(p.id) !== String(currentShareMemberId || "me"); }) || participants.find(function (p) { return String(p.id) !== String(currentShareMemberId || "me"); }) || null;
    setSettlementTo(defaultTo ? defaultTo.id : "");
    setSettlementAmount("");
    setSettlementDate(todayStr());
    setSettlementComment("");
    setEditingSettlementActivityId(null);
    setSharePendingReceipt(null);
  }
  function openNewSettlementPopup() {
    resetSettlementForm();
    setSettlementPopupOpen(true);
  }
  function openShareProjectArchiveConfirm(mode: "archive" | "restore") {
    if (!selected) return;
    setShareProjectArchiveMode(mode);
    setShareProjectArchiveConfirmOpen(true);
  }
  function confirmShareProjectArchiveAction() {
    if (!selected) return;
    var mode = shareProjectArchiveMode === "restore" ? "restore" : "archive";
    if (mode === "archive" && shareExpenseFormOpen && !shareEditingActivityId) {
      closeShareExpensePopup();
    }
    updateShareProject(selected.id, function (p) {
      return mode === "restore"
        ? { ...p, status: "active", archivedAt: null, restoredAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : { ...p, status: "archived", archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    });
    setShareProjectArchiveConfirmOpen(false);
    setToast(L(mode === "restore" ? "Progetto ripristinato" : "Progetto archiviato"));
  }

  var settlementFormValid =
    !!selected &&
    parseFloat(settlementAmount) > 0 &&
    !!String(settlementDate || "").trim() &&
    !!String(settlementFrom || "").trim() &&
    !!String(settlementTo || "").trim() &&
    String(settlementFrom) !== String(settlementTo);
  function saveShareReceiptFromScan(item) {
    if (!selected) return false;
    var lim = shareReceiptAllowed()
      ? (PLAN_LIMITS[currentPlan] && PLAN_LIMITS[currentPlan].shareReceiptScans) || 0
      : 0;
    var today = todayUsageKey();
    var count = (shareReceiptUploads || []).filter(function (r) {
      return String(r.dateKey || "") === today;
    }).length;
    if (lim !== Infinity && count >= lim) {
      setToast({
        text: L("Hai raggiunto il limite scontrini Share del tuo piano."),
        type: "error",
        color: "#E24B4A",
        icon: "🚫",
      });
      return false;
    }
    setShareAmount(String(item.amount || ""));
    setShareFx({ currency: String(_c.currency || "EUR"), baseCurrency: String(_c.currency || "EUR"), exchangeRate: 1 });
    setShareDesc(item.desc || L("Scontrino Share"));
    setShareDate(item.date || todayStr());
    setSharePaidBy(String(currentShareMemberId || "me"));
    setSplitMode("equal");
    setSplitDraft({});
    setShareSplitTouched(false);
    setShareParticipantIds(
      activeParticipants.map(function (p) {
        return p.id;
      })
    );
    var retention = shareReceiptAllowed() ? 6 : 0;
    var rec = {
      id: "shr_receipt_" + Date.now(),
      projectId: String(selected.id),
      dateKey: today,
      amount: Number(item.amount || 0),
      desc: item.desc || L("Scontrino Share"),
      date: item.date || todayStr(),
      createdAt: new Date().toISOString(),
      expiresAt: retention ? addSixMonthsIso() : "",
      retentionMonths: retention,
    };
    setShareReceiptUploads(function (list) {
      return [rec].concat(list || []);
    });
    setShareExpenseFormOpen(true);
    setShareReceiptOpen(false);
    setShareReceiptReady(true);
    setShareExpenseMode("simple");
    setToast({
      text: L(
        "Scontrino letto. Scegli chi ha pagato, verifica la suddivisione e salva la spesa Share."
      ),
      type: "success",
      icon: "🧾",
    });
    return false;
  }

  function addSharedActivity() {
    try {
      localStorage.removeItem("fainance_share_receipt_draft_v2");
      localStorage.removeItem("fainance_share_receipt_flow_v2");
    } catch (e) {}
    if (!selected) return;
    if (!shareEditingActivityId && selectedShareArchived) {
      notifyArchivedShareProject();
      return;
    }
    var shareTodayCount = (selected.activities || []).filter(function (a) {
      return (
        a.kind !== "settlement" &&
        a.createdAt &&
        String(a.createdAt).slice(0, 10) === todayUsageKey()
      );
    }).length;
    if (
      !shareEditingActivityId &&
      !canAddPlanItem("shareDailyExpenses", shareTodayCount, 1)
    ) {
      setToast({
        text: upgradeMessage("shareDailyExpenses", shareTodayCount),
        type: "error",
        color: "#E24B4A",
        icon: "🚫",
      });
      return;
    }
    if (!shareExpenseFormValid) return;
    var validation = currentShareValidation;
    var shares = computeShares();
    if (!Object.keys(shares).length) {
      setToast("Seleziona almeno un partecipante con cui condividere");
      return;
    }
    var previous = shareEditingActivityId
      ? (selected.activities || []).find(function (x) {
          return String(x.id) === String(shareEditingActivityId);
        }) || {}
      : {};
    var activityId = shareEditingActivityId || Date.now();
    var activity = {
      id: activityId,
      kind: "expense",
      amount: shareAccountingAmount(),
      originalAmount: String(shareFx.currency || _c.currency) !== String(_c.currency) ? shareRound(shareNum(shareAmount)) : null,
      currency: String(shareFx.currency || _c.currency || "EUR"),
      baseCurrency: String(_c.currency || "EUR"),
      baseAmount: shareAccountingAmount(),
      exchangeRate: Number(shareFx.exchangeRate || 1),
      exchangeRateDate: String(shareFx.exchangeRateDate || new Date().toISOString().slice(0, 10)),
      exchangeRateSource: String(shareFx.exchangeRateSource || "base"),
      desc: shareDesc || "Spesa condivisa",
      shareCategoryId: String(shareCategoryId || ""),
      paidBy: sharePaidBy,
      date: shareDate,
      time: shareEditingActivityId
        ? previous.time || new Date().toTimeString().slice(0, 5)
        : new Date().toTimeString().slice(0, 5),
      shares: shares,
      splitMode: splitMode,
      sharedWith: Object.keys(shares),
      receiptId: sharePendingReceipt
        ? sharePendingReceipt.id
        : previous.receiptId || "",
      createdAt: shareEditingActivityId
        ? previous.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    function saveShareActivity() {
      if (!shareEditingActivityId) consumePlanFeature("shareDailyExpenses", 1);
      updateShareProject(selected.id, function (p) {
        if (shareEditingActivityId) {
          return {
            ...p,
            activities: (p.activities || []).map(function (a) {
              return String(a.id) === String(shareEditingActivityId)
                ? activity
                : a;
            }),
          };
        }
        return { ...p, activities: [activity].concat(p.activities || []) };
      });
      if (sharePendingReceipt) {
        var stored = {
          ...sharePendingReceipt,
          projectId: String(selected.id),
          activityId: String(activityId),
          retentionMonths: 6,
        };
        setShareReceiptUploads(function (list) {
          return [stored].concat(
            (list || []).filter(function (r) {
              return String(r.id) !== String(stored.id);
            })
          );
        });
        saveShareAttachment(stored).catch(function (error) {
          console.error("Share attachment upload error", error);
          setToast({
            text: L("La spesa è stata salvata, ma l'allegato non è stato sincronizzato."),
            type: "warning",
            icon: "⚠️",
            color: "#FFF8E1",
            textColor: "#856404",
          });
        });
      }
      resetShareExpenseForm();
      setShareProjectTab("attivita");
      setShareExpenseFormOpen(false);
      setShareEditingActivityId(null);
      setToast(
        shareEditingActivityId
          ? L("Spesa Share aggiornata")
          : successToastForFeature(
              "shareDailyExpenses",
              L("Spesa Share aggiunta"),
              planCount(featureUsageKey("shareDailyExpenses")) + 1
            )
      );
    }
    if (!shareEditingActivityId) {
      var slim = featureLimits("shareDailyExpenses");
      if (
        slim.total !== Infinity &&
        shareTodayCount >= Number(slim.included || 0)
      ) {
        if (shareTodayCount >= Number(slim.total || 0)) {
          setToast({
            text: upgradeMessage("shareDailyExpenses", shareTodayCount),
            type: "error",
            color: "#E24B4A",
            icon: "🚫",
          });
          return;
        }
        showRewardedAdForExtraMovement(function () {
          planInc(featureExtraKey("shareDailyExpenses"), 1);
          saveShareActivity();
        });
        return;
      }
    }
    saveShareActivity();
  }
  function startEditSharedActivity(a) {
    if (!a || a.kind === "settlement") return;
    var amt = shareRound(Number(a.originalAmount || a.amount || 0));
    setShareEditingActivityId(a.id);
    setShareAmount(String(amt || ""));
    setShareFx({
      currency: String(a.currency || _c.currency || "EUR"),
      baseCurrency: String(a.baseCurrency || _c.currency || "EUR"),
      baseAmount: Number(a.baseAmount || a.amount || 0),
      exchangeRate: Number(a.exchangeRate || 1),
      exchangeRateDate: String(a.exchangeRateDate || ""),
      exchangeRateSource: String(a.exchangeRateSource || "base"),
    });
    setShareDesc(a.desc || "");
    setShareCategoryId(String(a.shareCategoryId || ""));
    setSharePaidBy(a.paidBy || currentShareMemberId || "me");
    setShareDate(a.date || todayStr());
    var ids = Object.keys(a.shares || {});
    setShareParticipantIds(
      ids.length
        ? ids
        : activeParticipants.map(function (p) {
            return p.id;
          })
    );
    var mode = a.splitMode || "amount";
    setSplitMode(mode);
    var draft = {};
    if (mode === "percent") {
      ids.forEach(function (id) {
        draft[id] = amt
          ? String(shareRound((Number(a.shares[id] || 0) / amt) * 100))
          : "";
      });
    } else if (mode === "amount") {
      ids.forEach(function (id) {
        draft[id] = String(shareRound(Number(a.shares[id] || 0)));
      });
    } else {
      draft = {};
    }
    setSplitDraft(draft);
    setShareSplitTouched(false);
    setShareProjectTab("attivita");
    setShareExpenseFormOpen(true);
  }
  function startEditSettlement(a) {
    if (!a || a.kind !== "settlement") return;
    setEditingSettlementActivityId(a.id);
    setSettlementFrom(String(a.from || currentShareMemberId || "me"));
    setSettlementTo(String(a.to || ""));
    setSettlementAmount(String(shareRound(Number(a.amount || 0)) || ""));
    setSettlementDate(a.date || todayStr());
    setSettlementComment(String(a.comment || a.desc || ""));
    setSharePendingReceipt(activeShareReceiptForActivity(a.id) || null);
    setSettlementPopupOpen(true);
  }
  function addSettlement() {
    if (!settlementFormValid) return;
    var toId = settlementTo;
    if (String(settlementFrom) === String(toId)) {
      setToast({
        text: L(
          "Non puoi registrare un saldo/rimborso con la stessa persona in Da e A."
        ),
        type: "error",
        color: "#E24B4A",
        icon: "🚫",
      });
      return;
    }
    var previousSettlement = editingSettlementActivityId
      ? ((selected && selected.activities) || []).find(function (x) {
          return String(x && x.id) === String(editingSettlementActivityId);
        }) || null
      : null;
    var activityId = editingSettlementActivityId || Date.now();
    var activity = {
      id: activityId,
      kind: "settlement",
      amount: parseFloat(settlementAmount),
      from: settlementFrom,
      to: toId,
      date: settlementDate,
      time: editingSettlementActivityId
        ? (previousSettlement && previousSettlement.time) || new Date().toTimeString().slice(0, 5)
        : new Date().toTimeString().slice(0, 5),
      desc: String(settlementComment || "").trim() || "Saldo tra partecipanti",
      comment: String(settlementComment || "").trim(),
      receiptId: sharePendingReceipt
        ? sharePendingReceipt.id
        : previousSettlement && previousSettlement.receiptId || "",
      createdAt: editingSettlementActivityId
        ? (previousSettlement && previousSettlement.createdAt) || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateShareProject(selected.id, function (p) {
      if (editingSettlementActivityId) {
        return {
          ...p,
          activities: (p.activities || []).map(function (a) {
            return String(a.id) === String(editingSettlementActivityId) ? activity : a;
          }),
        };
      }
      return { ...p, activities: [activity].concat(p.activities || []) };
    });
    if (sharePendingReceipt) {
      var stored = {
        ...sharePendingReceipt,
        projectId: String(selected.id),
        activityId: String(activityId),
        retentionMonths: 6,
      };
      setShareReceiptUploads(function (list) {
        return [stored].concat(
          (list || []).filter(function (r) {
            return String(r.id) !== String(stored.id);
          })
        );
      });
      saveShareAttachment(stored).catch(function (error) {
        console.error("Share attachment upload error", error);
        setToast({
          text: L("Il saldo è stato salvato, ma l'allegato non è stato sincronizzato."),
          type: "warning",
          icon: "⚠️",
          color: "#FFF8E1",
          textColor: "#856404",
        });
      });
    }
    var wasEditingSettlement = !!editingSettlementActivityId;
    resetSettlementForm();
    setSettlementPopupOpen(false);
    setShareProjectTab("attivita");
    setShareExpenseFormOpen(false);
    setShareEditingActivityId(null);
    setToast(L(wasEditingSettlement ? "Saldo aggiornato" : "Saldo registrato"));
  }

  function deleteActivity(aid) {
    if (!selected) return;
    var targetActivity = ((selected && selected.activities) || []).find(function (a) {
      return String(a && a.id) === String(aid);
    });
    var isSettlement = !!(targetActivity && targetActivity.kind === "settlement");
    if (!window.confirm(L(isSettlement ? "Eliminare questa operazione di saldo?" : "Eliminare questa spesa Share?"))) return;
    updateShareProject(selected.id, function (p) {
      var deletedActivityIds = Array.isArray(p.deletedActivityIds)
        ? p.deletedActivityIds.map(String)
        : [];
      var deletedId = String(aid);
      if (deletedActivityIds.indexOf(deletedId) < 0) deletedActivityIds.push(deletedId);
      return {
        ...p,
        deletedActivityIds: deletedActivityIds,
        activities: (p.activities || []).filter(function (a) {
          return String(a && a.id) !== deletedId;
        }),
      };
    });
    setShareReceiptUploads(function (list) {
      return (list || []).filter(function (r) {
        return String(r.activityId || "") !== String(aid);
      });
    });
    setToast(L(isSettlement ? "Operazione di saldo eliminata" : "Spesa Share eliminata"));
  }
  function balances() {
    var bal = {};
    participants.forEach(function (p) {
      bal[p.id] = 0;
    });
    ((selected && selected.activities) || []).forEach(function (a) {
      if (a.kind === "settlement") {
        bal[a.from] = (bal[a.from] || 0) + Number(a.amount || 0);
        bal[a.to] = (bal[a.to] || 0) - Number(a.amount || 0);
        return;
      }
      var paid = a.paidBy || "me";
      bal[paid] = (bal[paid] || 0) + Number(a.amount || 0);
      Object.keys(a.shares || {}).forEach(function (pid) {
        bal[pid] = (bal[pid] || 0) - Number(a.shares[pid] || 0);
      });
    });
    return bal;
  }
  function simplifiedDebts() {
    var b = balances();
    var debtors = [],
      creditors = [];
    Object.keys(b).forEach(function (k) {
      var v = Math.round(b[k] * 100) / 100;
      if (v < -0.009) debtors.push({ id: k, amount: -v });
      if (v > 0.009) creditors.push({ id: k, amount: v });
    });
    var rows = [];
    debtors.forEach(function (d) {
      creditors.forEach(function (c) {
        if (d.amount <= 0 || c.amount <= 0) return;
        var x = Math.min(d.amount, c.amount);
        rows.push({ from: d.id, to: c.id, amount: Math.round(x * 100) / 100 });
        d.amount -= x;
        c.amount -= x;
      });
    });
    return rows;
  }
  var b = selected ? balances() : {};
  var debts = selected ? simplifiedDebts() : [];
  var totalSpent = selected
    ? (selected.activities || [])
        .filter(function (a) {
          return a.kind !== "settlement";
        })
        .reduce(function (a, x) {
          return a + Number(x.amount || 0);
        }, 0)
    : 0;
  var myBalance = b[currentShareMemberId] || 0;
  async function exportShareProjectXlsx() {
    if (!selected) return;
    var exportNameMap: any = { ...(shareResolvedParticipantNames || {}) };
    for (var exportIndex = 0; exportIndex < (participants || []).length; exportIndex++) {
      var exportParticipant: any = participants[exportIndex];
      if (!exportParticipant) continue;
      var exportKey = String(exportParticipant.id || exportParticipant.uid || "");
      if (!exportKey || exportNameMap[exportKey]) continue;
      if (exportParticipant.uid === userId && currentUser && currentUser.name) {
        exportNameMap[exportKey] = String(currentUser.name).replace(/\s+/g, " ").trim();
        continue;
      }
      if (!exportParticipant.uid && !exportParticipant.email && !exportParticipant.username) continue;
      try {
        var exportFound = await findRegisteredUserForShare(
          exportParticipant.email || "",
          exportParticipant.phone || "",
          exportParticipant.username || "",
          exportParticipant.uid || ""
        );
        var exportFirstLast = [exportFound && exportFound.firstName, exportFound && exportFound.lastName]
          .map(normalizeShareDisplayName)
          .filter(Boolean)
          .join(" ");
        var exportFull = normalizeShareDisplayName(
          exportFirstLast || (exportFound && (exportFound.name || exportFound.displayName || exportFound.fullName)) || ""
        );
        if (participantNameLooksUsable({ ...exportParticipant, ...(exportFound || {}) }, exportFull)) {
          exportNameMap[exportKey] = exportFull;
        }
      } catch (_shareExcelNameResolveError) {}
    }
    function exportFullName(p) {
      var key = String((p && (p.id || p.uid)) || "");
      var resolvedExport = normalizeShareDisplayName(key && exportNameMap[key]);
      if (resolvedExport && participantNameLooksUsable(p, resolvedExport)) return resolvedExport;
      return personFullName(p);
    }
    function exportPersonLabel(p) {
      var full = exportFullName(p);
      var parts = full.split(/\s+/).filter(Boolean);
      if (!parts.length) return full;
      var first = parts[0];
      var sameFirst = (participants || []).filter(function (candidate) {
        var candidateParts = exportFullName(candidate).split(/\s+/).filter(Boolean);
        return candidateParts.length && candidateParts[0].toLocaleLowerCase() === first.toLocaleLowerCase();
      });
      if (sameFirst.length > 1 && parts.length > 1) {
        return first + " " + String(parts[parts.length - 1] || "").slice(0, 1).toUpperCase() + ".";
      }
      return first;
    }
    function xml(value) {
      return String(value == null ? "" : value)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    }
    function colName(index) {
      var name = "";
      var n = index + 1;
      while (n > 0) {
        var r = (n - 1) % 26;
        name = String.fromCharCode(65 + r) + name;
        n = Math.floor((n - 1) / 26);
      }
      return name;
    }
    function splitModeLabel(mode) {
      if (mode === "percent") return L("Percentuali");
      if (mode === "amount") return L("Importi");
      return L("Equa");
    }
    var rows: any[] = [];
    var merges: string[] = [];
    function addRow(values, style, height) {
      var rowIndex = rows.length + 1;
      rows.push({ values: values || [], style: style == null ? 0 : style, height: height || 20 });
      return rowIndex;
    }
    function section(title) {
      var r = addRow([title], 3, 24);
      merges.push("A" + r + ":H" + r);
    }
    function participantName(id) {
      var p = participants.find(function (x) { return String(x.id) === String(id); });
      return p ? exportPersonLabel(p) : L("Partecipante");
    }
    function exportShareCategoryName(activity) {
      var shareCategoryId = String((activity && activity.shareCategoryId) || "");
      if (!shareCategoryId) return L("Senza categoria");
      var shareCategory = ((selected && selected.categories) || []).find(function (category) {
        return String(category && category.id || "") === shareCategoryId;
      });
      return shareCategory && shareCategory.name ? String(shareCategory.name) : L("Senza categoria");
    }
    var theme = projectTheme(selected);
    var titleRow = addRow([String(theme.icon || "🤝") + "  " + String(selected.name || selected.title || L("Progetto Share"))], 1, 34);
    merges.push("A" + titleRow + ":H" + titleRow);
    var descRow = addRow([String(selected.description || L("Nessuna descrizione"))], 2, 26);
    merges.push("A" + descRow + ":H" + descRow);
    addRow([], 0, 9);

    section(L("Partecipanti"));
    addRow([L("Nome"), L("Email"), L("Stato"), "", "", "", ""], 4, 22);
    (participants || []).forEach(function (p) {
      var contactEmail = normalizeEmail(p.email || "");
      var status = p.status === "archived" ? L("Archiviato") : p.pending || p.status === "pending" ? L("Invito in attesa") : L("Attivo");
      addRow([exportFullName(p), contactEmail, status, "", "", "", ""], 0, 20);
    });
    if (!(participants || []).length) addRow([L("Nessun partecipante")], 7, 20);
    addRow([], 0, 9);

    section(L("Transazioni"));
    addRow([L("Data"), L("Descrizione"), L("Categoria Share"), L("Da / Pagato da"), L("A / Condivisa con"), L("Suddivisione"), L("Valuta"), L("Importo")], 4, 22);
    ((selected && selected.activities) || []).forEach(function (a) {
      if (a.kind === "settlement") {
        addRow([
          fmtDate(a.date, dateFmt),
          a.comment || a.desc || L("Saldo tra partecipanti"),
          "",
          participantName(a.from),
          participantName(a.to),
          L("Saldo / Rimborso"),
          String(a.currency || a.baseCurrency || _c.currency || "EUR"),
          { n: Number(a.amount || 0), style: 5 },
        ], 0, 20);
      } else {
        var sharedWith = Object.keys(a.shares || {}).map(participantName).filter(Boolean).join(", ");
        var txCurrency = String(a.currency || a.baseCurrency || _c.currency || "EUR");
        var txAmount = a.originalAmount != null && a.currency && a.baseCurrency && String(a.currency) !== String(a.baseCurrency)
          ? Number(a.originalAmount || 0)
          : Number(a.amount || 0);
        addRow([
          fmtDate(a.date, dateFmt),
          a.desc || L("Spesa condivisa"),
          exportShareCategoryName(a),
          participantName(a.paidBy || "me"),
          sharedWith,
          splitModeLabel(a.splitMode || "equal"),
          txCurrency,
          { n: txAmount, style: 5 },
        ], 0, 20);
      }
    });
    if (!((selected && selected.activities) || []).length) addRow([L("Nessuna transazione")], 7, 20);
    addRow([], 0, 9);

    section(L("Saldi"));
    addRow([L("Chi paga"), L("Chi riceve"), L("Importo"), "", "", "", ""], 4, 22);
    (debts || []).forEach(function (d) {
      addRow([participantName(d.from), participantName(d.to), { n: Number(d.amount || 0), style: 5 }, "", "", "", ""], 0, 20);
    });
    if (!(debts || []).length) addRow([L("Nessun saldo aperto")], 7, 20);
    addRow([], 0, 9);

    section(L("Pagamenti da effettuare"));
    addRow([L("Chi deve pagare"), L("Chi deve ricevere"), L("Importo"), L("Istruzione"), "", "", ""], 4, 22);
    (debts || []).forEach(function (d) {
      var fromName = participantName(d.from);
      var toName = participantName(d.to);
      addRow([
        fromName,
        toName,
        { n: Number(d.amount || 0), style: 5 },
        fromName + " → " + toName,
        "",
        "",
        "",
      ], 0, 20);
    });
    if (!(debts || []).length) addRow([L("Nessun pagamento da effettuare")], 7, 20);
    addRow([], 0, 9);

    section(L("Riassunto"));
    addRow([L("Spese progetto"), { n: Number(totalSpent || 0), style: 6 }, "", "", "", "", ""], 0, 22);
    addRow([L("Mi devono"), { n: Math.max(0, Number(myBalance || 0)), style: 6 }, "", "", "", "", ""], 0, 22);
    addRow([L("Devo"), { n: Math.max(0, -Number(myBalance || 0)), style: 6 }, "", "", "", "", ""], 0, 22);

    var sheetRows = "";
    rows.forEach(function (row, ri) {
      var rn = ri + 1;
      sheetRows += '<row r="' + rn + '" ht="' + row.height + '" customHeight="1">';
      for (var ci = 0; ci < Math.max(1, row.values.length); ci++) {
        var raw = row.values[ci] == null ? "" : row.values[ci];
        var cellStyle = row.style || 0;
        var addr = colName(ci) + rn;
        if (raw && typeof raw === "object" && raw.n !== undefined) {
          cellStyle = raw.style == null ? cellStyle : raw.style;
          sheetRows += '<c r="' + addr + '" s="' + cellStyle + '" t="n"><v>' + String(Number(raw.n) || 0) + '</v></c>';
        } else {
          sheetRows += '<c r="' + addr + '" s="' + cellStyle + '" t="inlineStr"><is><t xml:space="preserve">' + xml(raw) + '</t></is></c>';
        }
      }
      sheetRows += "</row>";
    });
    var sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="2" width="34" customWidth="1"/><col min="3" max="3" width="22" customWidth="1"/><col min="4" max="4" width="22" customWidth="1"/><col min="5" max="5" width="30" customWidth="1"/><col min="6" max="6" width="18" customWidth="1"/><col min="7" max="7" width="12" customWidth="1"/><col min="8" max="8" width="16" customWidth="1"/></cols>' +
      '<sheetData>' + sheetRows + '</sheetData>' +
      (merges.length ? '<mergeCells count="' + merges.length + '">' + merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join("") + '</mergeCells>' : "") +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '</worksheet>';
    var stylesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>' +
      '<fonts count="5">' +
      '<font><sz val="11"/><name val="Aptos"/></font>' +
      '<font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>' +
      '<font><i/><sz val="11"/><color rgb="FF667085"/><name val="Aptos"/></font>' +
      '<font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>' +
      '<font><b/><sz val="11"/><color rgb="FF20242C"/><name val="Aptos"/></font>' +
      '</fonts>' +
      '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF378ADD"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7F77DD"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEAF5FF"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="2"><border/><border><left style="thin"><color rgb="FFDDE2EA"/></left><right style="thin"><color rgb="FFDDE2EA"/></right><top style="thin"><color rgb="FFDDE2EA"/></top><bottom style="thin"><color rgb="FFDDE2EA"/></bottom></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="8">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' +
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="164" fontId="4" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
      '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>' +
      '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    var workbookXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Share" sheetId="1" r:id="rId1"/></sheets></workbook>';
    var workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
    var enc = new TextEncoder();
    function bytes(v) { return enc.encode(String(v)); }
    function u16(n) { return [n & 255, (n >> 8) & 255]; }
    function u32(n) { return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255]; }
    var crcTable: any[] = [];
    for (var ci = 0; ci < 256; ci++) { var cv = ci; for (var ck = 0; ck < 8; ck++) cv = cv & 1 ? (0xEDB88320 ^ (cv >>> 1)) : cv >>> 1; crcTable[ci] = cv; }
    function crc(data) { var r = 0xFFFFFFFF; for (var i = 0; i < data.length; i++) r = crcTable[(r ^ data[i]) & 255] ^ (r >>> 8); return (r ^ 0xFFFFFFFF) >>> 0; }
    function entry(name, data) { var nb = bytes(name), db = data instanceof Uint8Array ? data : bytes(data), cr = crc(db), flag = 0x0800; var lh = [0x50,0x4B,0x03,0x04,20,0].concat(u16(flag),u16(0),u16(0),u16(0),u32(cr),u32(db.length),u32(db.length),u16(nb.length),u16(0)); return { lh: lh, nb: nb, db: db, cr: cr, off: 0 }; }
    var entries: any[] = [entry("[Content_Types].xml", contentTypes), entry("_rels/.rels", rootRels), entry("xl/workbook.xml", workbookXml), entry("xl/_rels/workbook.xml.rels", workbookRels), entry("xl/styles.xml", stylesXml), entry("xl/worksheets/sheet1.xml", sheetXml)];
    var zip: number[] = [], off = 0;
    entries.forEach(function (en) { en.off = off; var rec = en.lh.concat(Array.from(en.nb), Array.from(en.db)); zip = zip.concat(rec); off += rec.length; });
    var cdStart = off, cd: number[] = [], flag = 0x0800;
    entries.forEach(function (en) { cd = cd.concat([0x50,0x4B,0x01,0x02,20,0,20,0].concat(u16(flag),u16(0),u16(0),u16(0),u32(en.cr),u32(en.db.length),u32(en.db.length),u16(en.nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(en.off),Array.from(en.nb))); });
    zip = zip.concat(cd, [0x50,0x4B,0x05,0x06,0,0,0,0].concat(u16(entries.length),u16(entries.length),u32(cd.length),u32(cdStart),u16(0)));
    var safeName = String(selected.name || selected.title || "Share").replace(/[\\/:*?"<>|]+/g, "_").trim() || "Share";
    androidDownload(
      "fAInance_Share_" + safeName + ".xlsx",
      new Blob([new Uint8Array(zip)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      function () { setToast({ text: L("File Excel Share pronto"), type: "success", icon: "📊" }); }
    );
  }

  var shareCheck = shareValidation();
  var showShareCheck =
    shareCheck.blocking &&
    (shareSplitTouched ||
      Object.keys(splitDraft || {}).some(function (k) {
        return String(splitDraft[k] || "").trim() !== "";
      }));
  var shareAllActivities = (selected && selected.activities) || [];
  var shareFilteredActivities = shareAllActivities
    .filter(function (a) {
      var q = String(shareFilterSearch || "")
        .trim()
        .toLowerCase();
      var paid = participants.find(function (p) {
        return String(p.id) === String(a.paidBy || "");
      });
      var from = participants.find(function (p) {
        return String(p.id) === String(a.from || "");
      });
      var to = participants.find(function (p) {
        return String(p.id) === String(a.to || "");
      });
      var hay = (
        String(a.desc || "") +
        " " +
        (paid ? personLabel(paid) : "") +
        " " +
        (from ? personLabel(from) : "") +
        " " +
        (to ? personLabel(to) : "")
      ).toLowerCase();
      if (q && hay.indexOf(q) < 0) return false;
      var d = String(a.date || "");
      if (shareFilterDateFrom && d < shareFilterDateFrom) return false;
      if (shareFilterDateTo && d > shareFilterDateTo) return false;
      var amt = Number(a.amount || 0);
      var min = shareNum(shareFilterAmountMin);
      var max = shareNum(shareFilterAmountMax);
      if (String(shareFilterAmountMin || "").trim() && amt < min) return false;
      if (String(shareFilterAmountMax || "").trim() && amt > max) return false;
      if (
        shareFilterPaidBy &&
        a.kind !== "settlement" &&
        String(a.paidBy || "") !== String(shareFilterPaidBy)
      )
        return false;
      if (
        shareFilterCategoryId &&
        (a.kind === "settlement" || String(a.shareCategoryId || "") !== String(shareFilterCategoryId))
      )
        return false;
      return true;
    })
    .slice()
    .sort(function (a, b) {
      var ak =
        String(a.date || "") +
        "T" +
        String(a.time || "00:00") +
        "|" +
        String(a.createdAt || "");
      var bk =
        String(b.date || "") +
        "T" +
        String(b.time || "00:00") +
        "|" +
        String(b.createdAt || "");
      var cmp = ak.localeCompare(bk);
      return shareSortDirection === "asc" ? cmp : -cmp;
    });
  var shareFiltersActive = !!(
    shareFilterSearch ||
    shareFilterDateFrom ||
    shareFilterDateTo ||
    shareFilterAmountMin ||
    shareFilterAmountMax ||
    shareFilterPaidBy ||
    shareFilterCategoryId ||
    shareSortDirection !== "desc"
  );
  function resetShareFilters() {
    setShareFilterSearch("");
    setShareFilterDateFrom("");
    setShareFilterDateTo("");
    setShareFilterAmountMin("");
    setShareFilterAmountMax("");
    setShareFilterPaidBy("");
    setShareFilterCategoryId("");
    setShareSortDirection("desc");
  }
  function toggleShareFilterSection(id) {
    setShareFilterSectionsOpen(function (prev) {
      return { ...prev, [id]: !prev[id] };
    });
  }
  function shareFilterSummary(id) {
    if (id === "period") {
      if (shareFilterDateFrom || shareFilterDateTo)
        return [shareFilterDateFrom || "…", shareFilterDateTo || "…"].join(
          " → "
        );
      return L("Tutto il periodo");
    }
    if (id === "amount") {
      if (shareFilterAmountMin || shareFilterAmountMax)
        return (
          (shareFilterAmountMin || "0") + " → " + (shareFilterAmountMax || "∞")
        );
      return L("Qualsiasi importo");
    }
    if (id === "payer") {
      if (!shareFilterPaidBy) return L("Tutti i pagatori");
      var p = activeParticipants.find(function (x) {
        return String(x.id) === String(shareFilterPaidBy);
      });
      return p ? personLabel(p) : L("Tutti i pagatori");
    }
    if (id === "category") {
      if (!shareFilterCategoryId) return L("Tutte le categorie");
      var shareCategory = projectShareCategories.find(function (x) {
        return String(x.id) === String(shareFilterCategoryId);
      });
      return shareCategory ? String(shareCategory.name || L("Categoria")) : L("Tutte le categorie");
    }
    if (id === "order")
      return shareSortDirection === "asc"
        ? L("Meno recenti")
        : L("Più recenti");
    return "";
  }
  function shareFilterAccordion(id, title, accent, children) {
    var open = !!shareFilterSectionsOpen[id];
    return (
      <div
        style={{
          background: cardBg,
          border: "1px solid " + borderC,
          borderRadius: 14,
          overflow: "hidden",
          boxShadow: dark ? "none" : "0 3px 12px rgba(15,23,42,.045)",
        }}
      >
        <button
          type="button"
          onClick={function () {
            toggleShareFilterSection(id);
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 14px",
            border: "none",
            background: open ? (dark ? "#232337" : "#FBFCFF") : "transparent",
            color: textC,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 4,
                height: 28,
                borderRadius: 4,
                background: accent,
                flexShrink: 0,
              }}
            />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 950 }}>
                {title}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 10.5,
                  color: subC,
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {shareFilterSummary(id)}
              </span>
            </span>
          </span>
          <span
            style={{
              fontSize: 18,
              color: subC,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform .16s ease",
              flexShrink: 0,
            }}
          >
            ⌄
          </span>
        </button>
        {open && (
          <div
            style={{
              padding: "4px 14px 14px",
              borderTop: "1px solid " + borderC,
            }}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
  var tabs = [
    { id: "partecipanti", label: L("Partecipanti") },
    { id: "riassunto", label: L("Riassunto e Saldi") },
    { id: "saldi", label: L("Saldi") },
  ];
  return (
    <div id="share_panel_root" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input
        ref={shareReceiptFileInputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp"
        capture="environment"
        onChange={onShareReceiptFileSelected}
        style={{ display: "none" }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: textC }}>
            Share
          </div>
          <div style={{ fontSize: 12, color: subC }}>
            {!firestoreReady
              ? L("Sincronizzazione in corso...")
              : projects.length +
                " " +
                L(
                  projects.length === 1
                    ? "progetto disponibile"
                    : "progetti disponibili"
                )}
          </div>
        </div>
        <Btn
          onClick={function () {
            if (!projects.length) {
              setShowNewProjectForm(true);
              return;
            }
            setChooseProjectOpen(true);
          }}
          bg={confirmButtonColor}
          style={{ padding: "11px 16px", fontWeight: 950 }}
        >
          {L("Progetti")}
        </Btn>
      </div>
      {focusedInvite && (
        <div
          style={{
            background: dark ? "#28253A" : "#F8F5FF",
            border: "2px solid " + confirmButtonColor + "88",
            borderRadius: 16,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: confirmButtonColor + "22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              🤝
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: confirmButtonColor }}>
                {L("Invito Share")}
              </div>
              <div style={{ fontSize: 16, fontWeight: 950, color: textC, overflowWrap: "anywhere" }}>
                {focusedInvite.projectName || L("Progetto Share")}
              </div>
              {!!focusedInvite.invitedByName && (
                <div style={{ fontSize: 11, color: subC, marginTop: 2 }}>
                  {L("Invito da")} {focusedInvite.invitedByName}
                </div>
              )}
            </div>
            <PopupCloseButton
              onClick={clearFocusedShareInviteMarker}
              dark={dark}
              label={L("Chiudi")}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Btn
              onClick={async function () {
                var ok = await acceptShareInvite(focusedInvite);
                if (ok) clearFocusedShareInviteMarker();
              }}
              bg={confirmButtonColor}
              style={{ padding: "9px 10px", fontSize: 12 }}
            >
              {L("Accetta")}
            </Btn>
            <Btn
              onClick={async function () {
                var ok = await declineShareInvite(focusedInvite);
                if (ok) clearFocusedShareInviteMarker();
              }}
              bg={dark ? "#333" : "#f0f0f0"}
              color={textC}
              style={{ padding: "9px 10px", fontSize: 12 }}
            >
              {L("Rifiuta")}
            </Btn>
          </div>
        </div>
      )}
      {showNewShareCategoryPopup && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.58)", zIndex: 10145, display: "flex", alignItems: "center", justifyContent: "center", padding: "7vh 16px 3vh", boxSizing: "border-box", overflowY: "auto" }}
          onMouseDown={function (e) { if (e.target === e.currentTarget) resetNewShareCategoryForm(); }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: 520, background: cardBg, borderRadius: 22, border: "1px solid " + borderC, boxShadow: "0 18px 65px rgba(0,0,0,0.38)", padding: "20px 18px 18px" }}>
            <div style={{ position: "absolute", right: 14, top: 14 }}>
              <PopupCloseButton onClick={resetNewShareCategoryForm} dark={dark} label={L("Chiudi")} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 950, color: textC, marginBottom: 16, paddingRight: 44 }}>
              {L(editingShareCategoryId ? "Modifica categoria" : "Nuova categoria")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12, alignItems: "start", opacity: canManageShareCategories ? 1 : .65 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 850, color: subC, marginBottom: 6 }}>{L("Icona")}</div>
                  <EmojiPicker value={newShareCategoryIcon} onChange={function (v) { if (canManageShareCategories) setNewShareCategoryIcon(v); }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 850, color: subC, marginBottom: 6 }}>{L("Colore")}</div>
                  <AppColorSelector value={newShareCategoryColor} disabled={!canManageShareCategories} onChange={function (v) { if (canManageShareCategories) setNewShareCategoryColor(v); }} compact={true} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 850, color: subC, marginBottom: 6 }}>{L("Nome categoria")}</div>
                <input autoFocus={canManageShareCategories} disabled={!canManageShareCategories} value={newShareCategoryName} onChange={function (e) { if (canManageShareCategories) setNewShareCategoryName(e.target.value); }} onKeyDown={function (e) { if (e.key === "Enter") addShareProjectCategory(); }} placeholder={L("Inserisci il nome della categoria")} style={{ ...sinp, width: "100%", boxSizing: "border-box", borderRadius: 16, padding: "13px 14px", border: "1px solid " + (dark ? "#484860" : "#D9E1F5"), background: dark ? "#242437" : "#FBFCFF", boxShadow: dark ? "none" : "0 8px 18px rgba(79,143,247,0.08)", fontSize: 14, fontWeight: 700 }} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 850, color: subC, marginBottom: 6 }}>{L("Categoria personale per le mie statistiche")}</div>
                <select value={shareCategoryMappingDraft} onChange={function (e) { setShareCategoryMappingDraft(e.target.value); }} style={{ ...sinp, width: "100%", boxSizing: "border-box", borderRadius: 16, padding: "13px 14px", border: "1px solid " + (dark ? "#806318" : "#E4BF60"), background: dark ? "#302816" : "#FFF9EC", boxShadow: dark ? "none" : "0 8px 18px rgba(223,175,58,0.14)", fontWeight: 700, fontSize: 14 }}>
                  <option value="">{(shareDefaultPersonalCategory ? shareDefaultPersonalCategory.name : L("Altro")) + " (" + L("categoria Default") + ")"}</option>
                  {personalShareCategories.map(function (personalCategory) {
                    return <option key={personalCategory.id} value={String(personalCategory.id)}>{personalCategory.icon || "🏷️"} {personalCategory.name}</option>;
                  })}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
              <Btn onClick={addShareProjectCategory} disabled={!editingShareCategoryId && (!canManageShareCategories || !String(newShareCategoryName || "").trim())} bg={(!editingShareCategoryId && (!canManageShareCategories || !String(newShareCategoryName || "").trim())) ? "#A8A8A8" : confirmButtonColor} style={{ flex: 1, padding: 12, fontWeight: 950 }}>{L("Salva")}</Btn>
              <Btn onClick={resetNewShareCategoryForm} bg={dark ? "#333" : "#f0f0f0"} color={textC} style={{ padding: "12px 16px", fontWeight: 900 }}>{L("Annulla")}</Btn>
            </div>
          </div>
        </div>
      )}
      {shareReceiptConfirmationOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={L("Ricevuta caricata")}
          onMouseDown={function (event) {
            if (event.target === event.currentTarget) setShareReceiptConfirmationOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10155,
            background: "rgba(0,0,0,0.58)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "7vh 16px 3vh",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
        >
          <div style={{ position: "relative", width: "100%", maxWidth: 420, background: cardBg, borderRadius: 22, border: "1px solid " + borderC, boxShadow: "0 18px 65px rgba(0,0,0,0.38)", padding: "20px 18px 18px" }}>
            <div style={{ position: "absolute", right: 14, top: 14 }}>
              <PopupCloseButton onClick={function () { setShareReceiptConfirmationOpen(false); }} dark={dark} label={L("Chiudi")} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 950, color: textC, marginBottom: 8, paddingRight: 44 }}>
              {L("Ricevuta caricata")}
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.45, color: subC, marginBottom: 18 }}>
              {L("La foto della ricevuta è stata caricata correttamente.")}
            </div>
            <Btn
              onClick={function () { setShareReceiptConfirmationOpen(false); }}
              bg={confirmButtonColor}
              style={{ width: "100%", padding: "11px 14px", fontWeight: 900 }}
            >
              {L("OK")}
            </Btn>
          </div>
        </div>
      )}
      {shareReceiptPreview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={L("Anteprima allegato Share")}
          onClick={function (event) {
            if (event.target === event.currentTarget) setShareReceiptPreview(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10040,
            background: "rgba(0,0,0,.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "max(18px,env(safe-area-inset-top,0px)) 14px max(18px,env(safe-area-inset-bottom,0px))",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: "min(720px,100%)", maxHeight: "100%", overflow: "auto", background: cardBg, borderRadius: 18, padding: 12, position: "relative" }}>
            <div style={{ position: "sticky", top: 0, float: "right", zIndex: 2 }}><PopupCloseButton onClick={function () { setShareReceiptPreview(null); }} dark={dark} label={L("Chiudi")} /></div>
            <img src={shareReceiptPreview.dataUrl} alt={shareReceiptPreview.name || L("Allegato Share")} style={{ display: "block", maxWidth: "100%", height: "auto", margin: "0 auto", borderRadius: 12 }} />
            <div style={{ padding: "10px 4px 2px", color: subC, fontSize: 11 }}>{shareReceiptPreview.name || L("Allegato Share")}</div>
          </div>
        </div>
      )}
      {showNewProjectForm && !shareProjectLimitReached && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.58)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "7vh 16px 3vh",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
          onClick={function (e) {
            if (e.target === e.currentTarget) setShowNewProjectForm(false);
          }}
        >
          <div
            style={{
              position: "relative",
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 22,
              padding: "20px 18px 18px",
              width: "100%",
              maxWidth: 500,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 18px 65px rgba(0,0,0,0.38)",
            }}
          >
            <div style={{ position: "absolute", right: 14, top: 14 }}>
              <PopupCloseButton onClick={function () { setShowNewProjectForm(false); }} dark={dark} label={L("Chiudi")} />
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 950,
                color: textC,
                marginBottom: 16,
                paddingRight: 44,
              }}
            >
              {L("Nuovo progetto")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 850,
                    color: subC,
                    marginBottom: 6,
                  }}
                >
                  {L("Nome progetto")}
                </div>
                <input
                  autoFocus
                  placeholder={L("Nome progetto")}
                  value={newProjectName}
                  onChange={function (e) {
                    setNewProjectName(e.target.value);
                  }}
                  style={sinp}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 850,
                    color: subC,
                    marginBottom: 6,
                  }}
                >
                  {L("Descrizione progetto (opzionale)")}
                </div>
                <textarea
                  placeholder={L("Descrizione progetto (opzionale)")}
                  value={newProjectDesc}
                  onChange={function (e) {
                    setNewProjectDesc(e.target.value);
                  }}
                  style={{ ...sinp, minHeight: 76, resize: "vertical" }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 850,
                      color: subC,
                      marginBottom: 6,
                    }}
                  >
                    {L("Icona progetto")}
                  </div>
                  <EmojiPicker
                    value={newProjectIcon}
                    onChange={setNewProjectIcon}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 850,
                      color: subC,
                      marginBottom: 6,
                    }}
                  >
                    {L("Colore progetto")}
                  </div>
                  <AppColorSelector
                    value={newProjectColor}
                    onChange={setNewProjectColor}
                    compact={true}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
              <Btn
                onClick={saveNewShareProject}
                disabled={!newShareProjectFormValid}
                bg={newShareProjectFormValid ? confirmButtonColor : "#A8A8A8"}
                style={{ flex: 1, padding: "12px 14px", fontWeight: 950 }}
              >
                {L("Salva progetto")}
              </Btn>
              <Btn
                onClick={function () {
                  setShowNewProjectForm(false);
                }}
                bg={dark ? "#333" : "#f0f0f0"}
                color={textC}
                style={{ padding: "12px 16px", fontWeight: 900 }}
              >
                {L("Annulla")}
              </Btn>
            </div>
          </div>
        </div>
      )}
      {chooseProjectOpen && projects.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 9999,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "17vh 16px 3vh",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
          onClick={function (e) {
            if (e.target === e.currentTarget) setChooseProjectOpen(false);
          }}
        >
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 20,
              padding: 16,
              width: "100%",
              maxWidth: 430,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: textC }}>
                {L("Scegli progetto")}
              </div>
              <PopupCloseButton onClick={function () { setChooseProjectOpen(false); }} dark={dark} label={L("Chiudi")} />
            </div>
            {shareProjectLimitReached && (
              <div
                style={{
                  background: dark ? "#342b16" : "#FFF8E1",
                  border: "1px solid " + (dark ? "#6a5520" : "#FFD54F"),
                  borderRadius: 14,
                  padding: 12,
                  color: dark ? "#FFE5A6" : "#856404",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.4,
                  marginBottom: 12,
                }}
              >
                ⚠️{" "}
                {L(
                  "Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione."
                )}
              </div>
            )}
            <Btn
              onClick={function () {
                if (shareProjectLimitReached) return;
                setChooseProjectOpen(false);
                setShowNewProjectForm(true);
              }}
              disabled={shareProjectLimitReached}
              bg={shareProjectLimitReached ? "#A8A8A8" : confirmButtonColor}
              style={{
                width: "100%",
                padding: "12px 14px",
                fontWeight: 950,
                marginBottom: 12,
              }}
            >
              ＋ {L("Nuovo progetto")}
            </Btn>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.map(function (pj) {
                var theme = projectTheme(pj);
                var active = selected && selected.id === pj.id;
                return (
                  <button
                    key={pj.id}
                    onClick={function () {
                      setShareSelectedProjectId(pj.id);
                      setShareProjectTab("attivita");
                      setChooseProjectOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid " + (active ? theme.color : borderC),
                      background: active
                        ? theme.color + "22"
                        : dark
                        ? "#252535"
                        : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: theme.color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      <FainanceIcon value={theme.icon} size={21} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 900,
                          color: textC,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pj.name || "Progetto"}
                      </div>
                      {pj.description && (
                        <div
                          style={{
                            fontSize: 11,
                            color: subC,
                            marginTop: 3,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pj.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {(shareReceivedInvites || []).length > 0 && (
        <div
          style={{
            background: confirmButtonColor + "18",
            border: "1px solid " + confirmButtonColor + "55",
            borderRadius: 16,
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: textC }}>
                {L("Inviti ricevuti")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {L("Accetta o rifiuta gli inviti ai progetti Share.")}
              </div>
            </div>
            <button
              onClick={loadShareCollaboration}
              style={{
                background: "transparent",
                border: "1px solid " + borderC,
                borderRadius: 10,
                padding: "6px 9px",
                color: subC,
                cursor: "pointer",
              }}
            >
              {shareInviteLoading ? "..." : "↻"}
            </button>
          </div>
          {shareReceivedInvites.map(function (inv) {
            return (
              <div
                key={inv.id}
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 12,
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: textC }}>
                    {inv.projectName || "Progetto Share"}
                  </div>
                  <div style={{ fontSize: 11, color: subC }}>
                    Invito da {inv.invitedByName || "utente fAInance"}
                  </div>
                </div>
                <Btn
                  onClick={function () {
                    acceptShareInvite(inv);
                  }}
                  bg={confirmButtonColor}
                  style={{ padding: "7px 10px", fontSize: 12 }}
                >
                  {L("Accetta")}
                </Btn>
                <Btn
                  onClick={function () {
                    declineShareInvite(inv);
                  }}
                  bg={dark ? "#333" : "#f0f0f0"}
                  color={textC}
                  style={{ padding: "7px 10px", fontSize: 12 }}
                >
                  {L("Rifiuta")}
                </Btn>
              </div>
            );
          })}
        </div>
      )}
      {!firestoreReady && projects.length === 0 && (
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 16,
            padding: 22,
            textAlign: "center",
            color: subC,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>↻</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: textC,
              marginBottom: 5,
            }}
          >
            {L("Sincronizzazione Share in corso")}
          </div>
          <div style={{ fontSize: 12 }}>
            {L("Attendi il completamento del caricamento dei progetti.")}
          </div>
        </div>
      )}
      {firestoreReady && projects.length === 0 && (
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 16,
            padding: 22,
            textAlign: "center",
            color: subC,
          }}
        >
          <div style={{ fontSize: 34, marginBottom: 8 }}>🤝</div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: textC,
              marginBottom: 5,
            }}
          >
            {L("Nessun progetto Share")}
          </div>
          <div style={{ fontSize: 12 }}>
            {L(
              "Crea un progetto per inserire partecipanti, movimenti e saldi."
            )}
          </div>
        </div>
      )}
      {!selected && (
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 18,
            padding: 18,
            color: textC,
            boxShadow: dark ? "none" : "0 8px 24px rgba(15,23,42,.06)",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 950, marginBottom: 5 }}>{L("Nessun progetto Share selezionato")}</div>
          <div style={{ fontSize: 12, color: subC, lineHeight: 1.45 }}>
            {L(projects.length ? "Seleziona un progetto per continuare." : "Non ci sono progetti Share disponibili.")}
          </div>
        </div>
      )}
      {selected && (
        <>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 20,
              padding: 16,
              boxShadow: dark ? "none" : "0 10px 26px rgba(83,74,183,0.08)",
            }}
          >
            {(function () {
              var theme = projectTheme(selected);
              return (
                <div
                  style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: theme.color,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                      boxShadow: dark
                        ? "none"
                        : "0 8px 18px " + theme.color + "44",
                    }}
                  >
                    <FainanceIcon value={theme.icon} size={21} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        color: textC,
                        lineHeight: 1.14,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        minWidth: 0,
                        width: "100%",
                      }}
                    >
                      {selected.name || "Progetto"}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: subC,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {selected.description ||
                        L("Progetti, spese condivise e saldi")}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        minWidth: 0,
                        marginTop: 2,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                        <select
                          value={shareProjectTab}
                          onChange={function (e) { setShareProjectTab(e.target.value); }}
                          style={{
                            ...sinp,
                            minWidth: 0,
                            width: "100%",
                            maxWidth: 150,
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "7px 24px 7px 8px",
                            borderRadius: 11,
                            background: dark ? "#232335" : "#F7F8FC",
                            border: "1px solid " + borderC,
                            color: textC,
                          }}
                        >
                          <option value="attivita">{L("Spese")}</option>
                          <option value="categorie">{L("Categorie")}</option>
                          <option value="partecipanti">{L("Partecipanti")}</option>
                          <option value="riassunto">{L("Riassunto e Saldi")}</option>
                        </select>
                        {selected && selected.status === "archived" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "4px 8px",
                              borderRadius: 999,
                              background: dark ? "#333" : "#F0F0F0",
                              color: textC,
                              fontSize: 10,
                              fontWeight: 900,
                              flexShrink: 0,
                            }}
                          >
                            {L("Archiviato")}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                        <button
                          onClick={function () {
                            setProjectNameDraft(
                              selected ? selected.name || "" : ""
                            );
                            setProjectDescDraft(
                              selected ? selected.description || "" : ""
                            );
                            setProjectIconDraft(
                              selected ? selected.icon || "🤝" : "🤝"
                            );
                            setProjectColorDraft(
                              selected ? selected.color || "#4F8FF7" : "#4F8FF7"
                            );
                            setProjectEditingDetails(true);
                          }}
                          title={L("Modifica")}
                          style={{
                            background: "#EEF4FF",
                            border: "1px solid #BFD7FF",
                            color: confirmButtonColor,
                            borderRadius: 8,
                            width: 24,
                            height: 24,
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          ✏
                        </button>
                        <button
                          onClick={function () {
                            openShareProjectArchiveConfirm(selected && selected.status === "archived" ? "restore" : "archive");
                          }}
                          title={L(selected && selected.status === "archived" ? "Ripristina" : "Archivia")}
                          style={{
                            background: dark ? "#2F2F39" : "#F3F4F7",
                            border: "1px solid " + borderC,
                            color: textC,
                            borderRadius: 8,
                            width: 24,
                            height: 24,
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          {selected && selected.status === "archived" ? "📂" : "🗂️"}
                        </button>
                        <button
                          onClick={function () {
                            requestDeleteProject(selected.id);
                          }}
                          title={L("Elimina")}
                          style={{
                            background: "#fff0f0",
                            border: "1px solid #ffd0d0",
                            color: expenseColor,
                            borderRadius: 8,
                            width: 24,
                            height: 24,
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          {shareProjectArchiveConfirmOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                zIndex: 9998,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                boxSizing: "border-box",
              }}
              onClick={function (e) {
                if (e.target === e.currentTarget) setShareProjectArchiveConfirmOpen(false);
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: 420,
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 22,
                  padding: 18,
                  boxShadow: dark ? "none" : "0 18px 42px rgba(15,23,42,.18)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                  <PopupCloseButton onClick={function () { setShareProjectArchiveConfirmOpen(false); }} dark={dark} label={L("Chiudi")} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 950, color: textC, marginBottom: 6 }}>
                  {L(shareProjectArchiveMode === "restore" ? "Ripristina progetto" : "Archivia progetto")}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: subC, marginBottom: 16 }}>
                  {L(shareProjectArchiveMode === "restore" ? "Vuoi ripristinare questo progetto Share?" : "Vuoi archiviare questo progetto Share?")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={function () { setShareProjectArchiveConfirmOpen(false); }}
                    style={{
                      border: "1px solid " + borderC,
                      background: dark ? "#2E2E3C" : "#F6F7FB",
                      color: textC,
                      borderRadius: 13,
                      padding: "11px 10px",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {L("Annulla")}
                  </button>
                  <button
                    type="button"
                    onClick={confirmShareProjectArchiveAction}
                    style={{
                      border: 0,
                      background: confirmButtonColor,
                      color: "#fff",
                      borderRadius: 13,
                      padding: "11px 10px",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {L(shareProjectArchiveMode === "restore" ? "Ripristina" : "Archivia")}
                  </button>
                </div>
              </div>
            </div>
          )}
          {projectEditingDetails && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.58)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "7vh 16px 3vh",
                boxSizing: "border-box",
                overflowY: "auto",
              }}
              onClick={function (e) {
                if (e.target === e.currentTarget)
                  setProjectEditingDetails(false);
              }}
            >
              <div
                style={{
                  position: "relative",
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 22,
                  padding: "20px 18px 18px",
                  width: "100%",
                  maxWidth: 500,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  boxShadow: "0 18px 65px rgba(0,0,0,0.38)",
                }}
              >
                <div style={{ position: "absolute", right: 14, top: 14 }}>
                  <PopupCloseButton onClick={function () { setProjectEditingDetails(false); }} dark={dark} label={L("Chiudi")} />
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 950,
                    color: textC,
                    marginBottom: 16,
                    paddingRight: 44,
                  }}
                >
                  {L("Modifica progetto")}
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 850,
                        color: subC,
                        marginBottom: 6,
                      }}
                    >
                      {L("Nome progetto")}
                    </div>
                    <input
                      autoFocus
                      value={projectNameDraft}
                      onChange={function (e) {
                        setProjectNameDraft(e.target.value);
                      }}
                      style={{ ...sinp, fontSize: 17, fontWeight: 900 }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 850,
                        color: subC,
                        marginBottom: 6,
                      }}
                    >
                      {L("Descrizione progetto (opzionale)")}
                    </div>
                    <textarea
                      placeholder={L("Descrizione progetto (opzionale)")}
                      value={projectDescDraft}
                      onChange={function (e) {
                        setProjectDescDraft(e.target.value);
                      }}
                      style={{ ...sinp, minHeight: 76, resize: "vertical" }}
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 850,
                          color: subC,
                          marginBottom: 6,
                        }}
                      >
                        {L("Icona progetto")}
                      </div>
                      <EmojiPicker
                        value={projectIconDraft}
                        onChange={setProjectIconDraft}
                      />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 850,
                          color: subC,
                          marginBottom: 6,
                        }}
                      >
                        {L("Colore progetto")}
                      </div>
                      <AppColorSelector
                        value={projectColorDraft}
                        onChange={setProjectColorDraft}
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
                  <Btn
                    onClick={saveProjectDetails}
                    disabled={!shareProjectDetailsValid}
                    bg={
                      shareProjectDetailsValid ? confirmButtonColor : "#A8A8A8"
                    }
                    style={{ flex: 1, padding: "12px 14px", fontWeight: 950 }}
                  >
                    {L("Salva modifiche")}
                  </Btn>
                  <Btn
                    onClick={function () {
                      setProjectEditingDetails(false);
                    }}
                    bg={dark ? "#333" : "#f0f0f0"}
                    color={textC}
                    style={{ padding: "12px 16px", fontWeight: 900 }}
                  >
                    {L("Annulla")}
                  </Btn>
                </div>
              </div>
            </div>
          )}
          {shareProjectTab === "attivita" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Btn
                onClick={function () {
                  if (selectedShareArchived) {
                    notifyArchivedShareProject();
                    return;
                  }
                  setShareEditingActivityId(null);
                  openShareExpensePopup("simple");
                }}
                bg={selectedShareArchived ? "#A8A8A8" : confirmButtonColor}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 15,
                  fontWeight: 950,
                  cursor: selectedShareArchived ? "not-allowed" : "pointer",
                  opacity: selectedShareArchived ? 0.72 : 1,
                }}
              >
                {selectedShareArchived ? "🔒 " : "＋ "}{L("Aggiungi spesa")}
              </Btn>
              {selectedShareArchived && (
                <div
                  style={{
                    background: dark ? "#3B3014" : "#FFF8D8",
                    border: "1px solid " + (dark ? "#C8A53A" : "#E7CA6A"),
                    borderRadius: 12,
                    padding: "9px 11px",
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    color: dark ? "#FFF2BB" : "#6B5900",
                  }}
                >
                  {L("Il progetto è archiviato. Ripristinalo per aggiungere nuove spese.")}
                </div>
              )}
              {(shareExpenseFormOpen || shareEditingActivityId) && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    width: "100%",
                    height: "100dvh",
                    minHeight: "100%",
                    background: "rgba(0,0,0,0.45)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding:
                      "calc(env(safe-area-inset-top, 0px) + 72px) 12px calc(env(safe-area-inset-bottom, 0px) + 10px)",
                    boxSizing: "border-box",
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                    WebkitTransform: "translateZ(0)",
                    transform: "translateZ(0)",
                    WebkitBackfaceVisibility: "hidden",
                    backfaceVisibility: "hidden",
                  }}
                  onClick={function (e) {
                    if (e.target === e.currentTarget) closeShareExpensePopup();
                  }}
                >
                  <div
                    id="share_expense_form"
                    style={{
                      background: cardBg,
                      border: "1px solid " + borderC,
                      borderRadius: 18,
                      padding: "14px 14px 26px",
                      width: "100%",
                      maxWidth: 430,
                      maxHeight:
                        "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 92px)",
                      minHeight: 0,
                      overflowY: "auto",
                      touchAction: "pan-y",
                      WebkitOverflowScrolling: "touch",
                      overscrollBehavior: "contain",
                      boxSizing: "border-box",
                      WebkitTransform: "translateZ(0)",
                      transform: "translateZ(0)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{ fontSize: 14, fontWeight: 900, color: textC }}
                      >
                        {L(
                          shareEditingActivityId
                            ? "Modifica spesa condivisa"
                            : "+ Spesa condivisa"
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        {shareEditingActivityId && (
                          <button
                            onClick={resetShareExpenseForm}
                            style={{
                              background: "transparent",
                              border: "1px solid " + borderC,
                              borderRadius: 9,
                              padding: "6px 8px",
                              fontSize: 12,
                              color: subC,
                              cursor: "pointer",
                            }}
                          >
                            {L("Annulla modifica")}
                          </button>
                        )}
                        <PopupCloseButton onClick={closeShareExpensePopup} dark={dark} label={L("Chiudi")} />
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      {[
                        { id: "simple", label: L("Spesa semplice") },
                        { id: "receipt", label: L("Scontrino") },
                        { id: "voice", label: L("Vocale") },
                      ].map(function (tb) {
                        var active = shareExpenseMode === tb.id;
                        return (
                          <button
                            key={tb.id}
                            type="button"
                            onClick={function () {
                              setShareReceiptReady(false);
                              if (tb.id === "receipt") {
                                startShareReceiptFlow();
                                return;
                              }
                              setShareExpenseMode(tb.id);
                              setShareReceiptOpen(false);
                              setShareExpenseFormOpen(true);
                              if (tb.id === "voice")
                                setTimeout(function () {
                                  startShareVoiceCommand();
                                }, 150);
                            }}
                            style={{
                              border:
                                "1px solid " +
                                (active ? secondaryButtonColor : borderC),
                              background: active
                                ? secondaryButtonColor
                                : dark
                                ? "#333"
                                : "#f0f0f0",
                              color: active ? "#fff" : textC,
                              borderRadius: btnRadius,
                              padding: "10px 6px",
                              fontSize: 11,
                              fontWeight: 900,
                              cursor: "pointer",
                            }}
                          >
                            {tb.label}
                          </button>
                        );
                      })}
                    </div>
                    {shareReceiptBusy && (
                      <div
                        style={{
                          border: "1px solid " + borderC,
                          borderRadius: 16,
                          padding: 12,
                          background: dark ? "#252535" : "#f9f9f9",
                          fontSize: 13,
                          fontWeight: 800,
                          color: textC,
                          marginBottom: 10,
                        }}
                      >
                        🧾 {L("Sto leggendo lo scontrino...")}
                      </div>
                    )}
                    {(shareExpenseMode !== "receipt" ||
                      shareReceiptReady ||
                      String(shareAmount || "").trim() ||
                      String(shareDesc || "").trim()) && (
                      <>
                        {shareExpenseMode === "voice" && (
                          <div
                            style={{
                              background: dark ? "#1f1f31" : "#fff",
                              border:
                                "1px solid " + (dark ? "#3d3d50" : "#ECE9F6"),
                              borderRadius: 16,
                              padding: 10,
                              marginBottom: 10,
                            }}
                          >
                            <Btn
                              onClick={startShareVoiceCommand}
                              bg={secondaryButtonColor}
                              style={{
                                width: "100%",
                                padding: "12px 14px",
                                fontWeight: 950,
                              }}
                            >
                              🎙️{" "}
                              {L(
                                shareVoiceListening
                                  ? "Ascolto in corso..."
                                  : "Avvia comando vocale"
                              )}
                            </Btn>
                            {shareVoiceText && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: subC,
                                  marginTop: 8,
                                  lineHeight: 1.35,
                                }}
                              >
                                {shareVoiceText}
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          style={{
                            background:
                              "linear-gradient(135deg,#5E230D 0%,#9A3F13 52%,#3E1608 100%)",
                            borderRadius: 18,
                            padding: "14px 14px",
                            display: "grid",
                            gridTemplateColumns: "44px minmax(0,1fr) 44px",
                            gap: 8,
                            alignItems: "center",
                            color: "#fff",
                            boxShadow: dark
                              ? "none"
                              : "0 10px 24px rgba(83,74,183,.12)",
                            marginBottom: 10,
                          }}
                        >
                          <AmountCalculatorButton
                            value={shareAmount}
                            onApply={function (next) {
                              setShareAmount(next);
                            }}
                            inverse
                            compact
                            iconOnly
                            iconSize={34}
                          />
                          <div style={{ minWidth: 0, textAlign: "center" }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 850,
                                textTransform: "uppercase",
                                letterSpacing: 0.8,
                                color: "rgba(255,255,255,.70)",
                                marginBottom: 2,
                              }}
                            >
                              {L("Importo")}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 7,
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  position: "relative",
                                  minWidth: 0,
                                  width: "min(150px, 100%)",
                                }}
                              >
                                {!String(shareAmount || "").trim() && !shareAmountFocused && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 32,
                                      fontWeight: 950,
                                      color: "#fff",
                                      lineHeight: 1,
                                      pointerEvents: "none",
                                    }}
                                  >
                                    _,__
                                  </div>
                                )}
                                <input
                                  ref={shareAmountInputRef}
                                  type="text"
                                  inputMode="decimal"
                                  placeholder=""
                                  value={shareAmount}
                                  onFocus={function () { setShareAmountFocused(true); }}
                                  onBlur={function () { setShareAmountFocused(false); }}
                                  onChange={function (e) {
                                    setShareAmount(e.target.value);
                                  }}
                                  style={{
                                    width: "100%",
                                    minWidth: 0,
                                    border: "none",
                                    background: "transparent",
                                    padding: 0,
                                    textAlign: "center",
                                    fontSize: 32,
                                    fontWeight: 950,
                                    color: "#fff",
                                    WebkitTextFillColor: "#fff",
                                    outline: "none",
                                    lineHeight: 1,
                                  }}
                                />
                              </div>
                              <div style={{ flexShrink: 0 }}>
                                <MultiCurrencyField
                                  inline
                                  compact
                                  value={shareFx}
                                  amount={shareAmount}
                                  onChange={setShareFx}
                                />
                              </div>
                            </div>
                            {!String(shareAmount || "").trim() && !shareAmountFocused && (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "rgba(255,255,255,.70)",
                                  fontWeight: 600,
                                  marginTop: 4,
                                }}
                              >
                                {L("Inserisci l'importo")}
                              </div>
                            )}
                            {String(shareFx.currency || _c.currency) !== String(_c.currency) && Number(shareFx.baseAmount) > 0 && (
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,.70)", marginTop: 3 }}>
                                ≈ {Number(shareFx.baseAmount).toFixed(2)} {String(_c.currency || "EUR")}
                              </div>
                            )}
                          </div>
                          <div
                            aria-hidden="true"
                            style={{ width: 34, height: 34 }}
                          />
                        </div>
                        <div
                          style={{
                            background: dark ? "#1f1f31" : "#fff",
                            border:
                              "1px solid " + (dark ? "#3d3d50" : "#ECE9F6"),
                            borderRadius: 16,
                            padding: 10,
                            boxShadow: dark
                              ? "none"
                              : "0 4px 12px rgba(83,74,183,0.05)",
                            marginBottom: 10,
                          }}
                        >
                          <label
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: subC,
                              display: "block",
                              marginBottom: 6,
                            }}
                          >
                            {L("Descrizione")}
                          </label>
                          <textarea
                            placeholder={L("Descrizione")}
                            value={shareDesc}
                            onChange={function (e) {
                              setShareDesc(e.target.value);
                            }}
                            style={{
                              ...sinp,
                              minHeight: 40,
                              height: 40,
                              resize: "none",
                              padding: "11px 12px",
                              lineHeight: 1.25,
                              fontFamily: "inherit",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            background: dark ? "#1f1f31" : "#fff",
                            border:
                              "1px solid " + (dark ? "#3d3d50" : "#ECE9F6"),
                            borderRadius: 16,
                            padding: 10,
                            boxShadow: dark
                              ? "none"
                              : "0 4px 12px rgba(83,74,183,0.05)",
                            marginBottom: 10,
                          }}
                        >
                          <label
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: subC,
                              display: "block",
                              marginBottom: 6,
                            }}
                          >
                            {L("Categoria")}
                          </label>
                          <select
                            value={shareCategoryId}
                            onChange={function (e) {
                              setShareCategoryId(e.target.value);
                            }}
                            style={sinp}
                          >
                            <option value="">{L("Senza categoria")}</option>
                            {projectShareCategories.map(function (category) {
                              return (
                                <option key={category.id} value={String(category.id)}>
                                  {category.icon || "🏷️"} {category.name}
                                </option>
                              );
                            })}
                          </select>
                          {!projectShareCategories.length && (
                            <div style={{ fontSize: 11, color: subC, marginTop: 6 }}>
                              {canManageShareCategories
                                ? L("Crea le categorie del progetto dalla scheda Categorie.")
                                : L("Il proprietario del progetto non ha ancora creato categorie.")}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            background: dark ? "#1f1f31" : "#fff",
                            border:
                              "1px solid " + (dark ? "#3d3d50" : "#ECE9F6"),
                            borderRadius: 16,
                            padding: 10,
                            boxShadow: dark
                              ? "none"
                              : "0 4px 12px rgba(83,74,183,0.05)",
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile ? ".84fr 1.02fr 1.28fr 1.62fr" : ".8fr 1fr 1.18fr 1.7fr",
                              gap: 5,
                              alignItems: "center",
                            }}
                          >
                            <button
                              type="button"
                              onClick={function () {
                                setShareDate(todayStr());
                              }}
                              style={{
                                height: 38,
                                borderRadius: 12,
                                border:
                                  "1px solid " +
                                  (shareDate === todayStr()
                                    ? "#7F77DD"
                                    : dark
                                    ? "#3f3f52"
                                    : "#E4E2F2"),
                                background:
                                  shareDate === todayStr()
                                    ? dark
                                      ? "#7F77DD44"
                                      : "#7F77DD14"
                                    : dark
                                    ? "#252535"
                                    : "#fff",
                                color:
                                  shareDate === todayStr() ? "#7F77DD" : textC,
                                fontSize: 9.8,
                                fontWeight: 850,
                                cursor: "pointer",
                                whiteSpace: "normal",
                                lineHeight: 1.05,
                                padding: "0 4px",
                                textAlign: "center"
                              }}
                            >
                              {t.today}
                            </button>
                            <button
                              type="button"
                              onClick={function () {
                                setShareDate(dateOffset(1));
                              }}
                              style={{
                                height: 38,
                                borderRadius: 12,
                                border:
                                  "1px solid " +
                                  (shareDate === dateOffset(1)
                                    ? "#7F77DD"
                                    : dark
                                    ? "#3f3f52"
                                    : "#E4E2F2"),
                                background:
                                  shareDate === dateOffset(1)
                                    ? dark
                                      ? "#7F77DD44"
                                      : "#7F77DD14"
                                    : dark
                                    ? "#252535"
                                    : "#fff",
                                color:
                                  shareDate === dateOffset(1)
                                    ? "#7F77DD"
                                    : textC,
                                fontSize: 9.2,
                                fontWeight: 850,
                                cursor: "pointer",
                                whiteSpace: "normal",
                                lineHeight: 1.05,
                                padding: "0 4px",
                                textAlign: "center"
                              }}
                            >
                              {t.yesterday}
                            </button>
                            <button
                              type="button"
                              onClick={function () {
                                setShareDate(dateOffset(2));
                              }}
                              style={{
                                height: 38,
                                borderRadius: 12,
                                border:
                                  "1px solid " +
                                  (shareDate === dateOffset(2)
                                    ? "#7F77DD"
                                    : dark
                                    ? "#3f3f52"
                                    : "#E4E2F2"),
                                background:
                                  shareDate === dateOffset(2)
                                    ? dark
                                      ? "#7F77DD44"
                                      : "#7F77DD14"
                                    : dark
                                    ? "#252535"
                                    : "#fff",
                                color:
                                  shareDate === dateOffset(2)
                                    ? "#7F77DD"
                                    : textC,
                                fontSize: 8.3,
                                fontWeight: 850,
                                cursor: "pointer",
                                whiteSpace: "normal",
                                lineHeight: 1.05,
                                padding: "0 3px",
                                textAlign: "center",
                              }}
                            >
                              {t.twoDaysAgo}
                            </button>
                            <label
                              style={{
                                height: 38,
                                borderRadius: 12,
                                border:
                                  "1px solid " + (dark ? "#3f3f52" : "#E4E2F2"),
                                background: dark ? "#252535" : "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                position: "relative",
                                overflow: "hidden",
                                padding: "0 5px",
                                gap: 4,
                                cursor: "pointer",
                              }}
                            >
                              <span
                                style={{
                                  pointerEvents: "none",
                                  fontWeight: 700,
                                  fontSize: 9.4,
                                  color: textC,
                                }}
                              >
                                {fmtDate(shareDate, dateFmt)}
                              </span>
                              <span
                                style={{ pointerEvents: "none", fontSize: 17 }}
                              >
                                📅
                              </span>
                              <input
                                type="date"
                                value={shareDate}
                                onChange={function (e) {
                                  setShareDate(e.target.value);
                                }}
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  opacity: 0,
                                  cursor: "pointer",
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr",
                            gap: 8,
                            marginTop: 8,
                          }}
                        >
                          <select
                            value={sharePaidBy}
                            onChange={function (e) {
                              setSharePaidBy(e.target.value);
                            }}
                            style={sinp}
                          >
                            {activeParticipants.map(function (p) {
                              return (
                                <option key={p.id} value={p.id}>
                                  {L("Pagato da")} {personLabel(p)}
                                </option>
                              );
                            })}
                          </select>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3,1fr)",
                              gap: 6,
                            }}
                          >
                            {[
                              { id: "equal", label: L("Equa") },
                              { id: "percent", label: L("Percentuali") },
                              { id: "amount", label: L("Importi") },
                            ].map(function (m) {
                              return (
                                <button
                                  key={m.id}
                                  onClick={function () {
                                    setSplitMode(m.id);
                                    setSplitDraft({});
                                    setShareSplitTouched(false);
                                  }}
                                  style={{
                                    border:
                                      "1px solid " +
                                      (splitMode === m.id
                                        ? confirmButtonColor
                                        : borderC),
                                    background:
                                      splitMode === m.id
                                        ? confirmButtonColor
                                        : "transparent",
                                    color: splitMode === m.id ? "#fff" : textC,
                                    borderRadius: 10,
                                    padding: "8px 6px",
                                    fontSize: 12,
                                    fontWeight: 800,
                                    cursor: "pointer",
                                  }}
                                >
                                  {m.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div
                          style={{
                            marginTop: 10,
                            background: dark ? "#252535" : "#f9f9f9",
                            border: "1px solid " + borderC,
                            borderRadius: 12,
                            padding: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 900,
                                color: textC,
                              }}
                            >
                              {L("Condivisa con")}
                            </div>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12,
                                color: subC,
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  activeParticipants.length > 0 &&
                                  shareParticipantIds.length ===
                                    activeParticipants.length
                                }
                                onChange={function () {
                                  var all = activeParticipants.map(function (
                                    p
                                  ) {
                                    return p.id;
                                  });
                                  setShareParticipantIds(
                                    shareParticipantIds.length === all.length
                                      ? []
                                      : all
                                  );
                                }}
                              />
                              {L("Tutti")}
                            </label>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            {activeParticipants.map(function (p) {
                              var checked = shareParticipantIds.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    border:
                                      "1px solid " +
                                      (checked ? confirmButtonColor : borderC),
                                    background: checked
                                      ? confirmButtonColor + "22"
                                      : "transparent",
                                    borderRadius: 20,
                                    padding: "5px 9px",
                                    fontSize: 12,
                                    color: checked ? confirmButtonColor : textC,
                                    cursor: "pointer",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={function () {
                                      setShareParticipantIds(function (list) {
                                        return list.includes(p.id)
                                          ? list.filter(function (x) {
                                              return x !== p.id;
                                            })
                                          : list.concat([p.id]);
                                      });
                                    }}
                                  />
                                  {personLabel(p)}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        {splitMode !== "equal" && (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile
                                ? "1fr 1fr"
                                : "repeat(4,1fr)",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            {activeParticipants
                              .filter(function (p) {
                                return shareParticipantIds.includes(p.id);
                              })
                              .map(function (p) {
                                return (
                                  <div key={p.id}>
                                    <label
                                      style={{ fontSize: 11, color: subC }}
                                    >
                                      {personLabel(p)}{" "}
                                      {splitMode === "percent" ? "%" : "€"}
                                    </label>
                                    <input
                                      type="text"
                                      inputMode={
                                        splitMode === "percent"
                                          ? "numeric"
                                          : "decimal"
                                      }
                                      placeholder={
                                        splitMode === "percent" ? "%" : "_,__"
                                      }
                                      value={splitDraft[p.id] || ""}
                                      onChange={function (e) {
                                        var v = e.target.value;
                                        setShareSplitTouched(true);
                                        setSplitDraft(function (d) {
                                          return { ...d, [p.id]: v };
                                        });
                                      }}
                                      style={sinp}
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        )}
                        {showShareCheck && (
                          <div
                            style={{
                              marginTop: 10,
                              background: dark ? "#2f2a1e" : "#fff8e6",
                              border: "1px solid #F2C94C77",
                              borderRadius: 12,
                              padding: "9px 10px",
                              fontSize: 12,
                              color: dark ? "#F2C94C" : "#8A6500",
                              fontWeight: 600,
                            }}
                          >
                            💡 {shareCheck.message}
                          </div>
                        )}
                        {sharePendingReceipt && (
                          <div
                            style={{
                              marginTop: 10,
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: 9,
                              borderRadius: 13,
                              border: "1px solid " + borderC,
                              background: dark ? "#242437" : "#F8FAFD",
                            }}
                          >
                            <button
                              type="button"
                              onClick={function () { setShareReceiptPreview(sharePendingReceipt); }}
                              aria-label={L("Apri ricevuta")}
                              style={{
                                width: 76,
                                height: 76,
                                flex: "0 0 76px",
                                padding: 0,
                                border: "1px solid " + borderC,
                                borderRadius: 11,
                                overflow: "hidden",
                                background: dark ? "#1E1E30" : "#FFFFFF",
                                cursor: "pointer",
                              }}
                            >
                              <img
                                src={sharePendingReceipt.dataUrl}
                                alt={L("Ricevuta caricata")}
                                style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }}
                              />
                            </button>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: textC, marginBottom: 5 }}>
                                🧾 {L("Ricevuta caricata")}
                              </div>
                              <button
                                type="button"
                                onClick={function () { setShareReceiptPreview(sharePendingReceipt); }}
                                style={{ border: "none", background: "transparent", color: confirmButtonColor, fontSize: 11, fontWeight: 750, cursor: "pointer", padding: 0, marginRight: 12 }}
                              >
                                {L("Apri ricevuta")}
                              </button>
                              <button
                                type="button"
                                onClick={function () { setSharePendingReceipt(null); }}
                                style={{ border: "none", background: "transparent", color: expenseColor, fontSize: 11, fontWeight: 750, cursor: "pointer", padding: 0 }}
                              >
                                {L("Rimuovi ricevuta")}
                              </button>
                            </div>
                          </div>
                        )}
                        <div style={{ marginTop: 10, marginBottom: 4 }}>
                          <div style={{ fontSize: 12, color: subC, marginBottom: 8 }}>
                            {L("Quote")}: {" "}
                            {Object.keys(computeShares()).map(function (id) {
                              var p = participants.find(function (x) { return x.id === id; });
                              return (p ? personLabel(p) : L("Partecipante")) + " " + fmt(computeShares()[id]);
                            }).join(" · ")}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <Btn onClick={function () { requestShareReceiptUpload("expense"); }} bg={secondaryButtonColor} disabled={!shareReceiptAllowed()} style={{ padding: "11px 12px", fontWeight: 900, opacity: shareReceiptAllowed() ? 1 : .65 }}>
                              🧾 {L(sharePendingReceipt ? "Ricevuta caricata" : "Carica ricevuta")}
                            </Btn>
                            <Btn onClick={addSharedActivity} bg={shareExpenseFormValid ? confirmButtonColor : "#A8A8A8"} disabled={!shareExpenseFormValid} style={{ padding: "11px 12px", fontWeight: 900 }}>
                              {L(shareEditingActivityId ? "Aggiorna spesa" : "Salva spesa")}
                            </Btn>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <div
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 900, color: textC }}>
                    {L("Spese")}
                  </div>
                  <Btn
                    onClick={function () {
                      setShareFilterOpen(true);
                    }}
                    bg={secondaryButtonColor}
                    style={{
                      padding: "7px 11px",
                      fontSize: 12,
                      fontWeight: 900,
                      boxShadow: shareFiltersActive
                        ? "0 0 0 2px " + secondaryButtonColor + "33"
                        : "none",
                    }}
                  >
                    ⚙ {L("Filtri")}
                    {shareFiltersActive ? " ✓" : ""}
                  </Btn>
                </div>
                {shareAllActivities.length === 0 && (
                  <div
                    style={{
                      fontSize: 13,
                      color: subC,
                      textAlign: "center",
                      padding: "18px 0",
                    }}
                  >
                    {L("Nessuna attività")}
                  </div>
                )}
                {shareAllActivities.length > 0 &&
                  shareFilteredActivities.length === 0 && (
                    <div
                      style={{
                        fontSize: 13,
                        color: subC,
                        textAlign: "center",
                        padding: "18px 0",
                      }}
                    >
                      {L("Nessun risultato con i filtri")}
                    </div>
                  )}
                {shareFilteredActivities.map(function (a) {
                  var paid = participants.find(function (p) {
                    return p.id === a.paidBy;
                  });
                  var from = participants.find(function (p) {
                    return p.id === a.from;
                  });
                  var to = participants.find(function (p) {
                    return p.id === a.to;
                  });
                  var editing =
                    shareEditingActivityId === a.id && a.kind !== "settlement";
                  var activityShareCategory =
                    a.kind !== "settlement"
                      ? ((selected && selected.categories) || []).find(function (item) {
                          return String((item && item.id) || "") === String(a.shareCategoryId || "");
                        })
                      : null;
                  var activityShareCategoryColor = activityShareCategory
                    ? String(activityShareCategory.color || confirmButtonColor || "#4F8FF7")
                    : "";
                  return (
                    <div
                      key={a.id}
                      style={{
                        borderBottom: "1px solid " + borderC,
                        borderRadius: a.kind !== "settlement" ? 12 : 0,
                        padding: "10px 8px",
                        marginBottom: a.kind !== "settlement" ? 6 : 0,
                        background:
                          a.kind !== "settlement" && activityShareCategoryColor
                            ? activityShareCategoryColor + (dark ? "26" : "18")
                            : "transparent",
                      }}
                    >
                      {editing ? (
                        <div
                          style={{
                            background: dark ? "#1e1e30" : "#F7F8FF",
                            border: "1px solid " + confirmButtonColor + "55",
                            borderRadius: 14,
                            padding: 12,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 900,
                                color: textC,
                              }}
                            >
                              {L("Modifica spesa Share")}
                            </div>
                            <button
                              onClick={resetShareExpenseForm}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: subC,
                                cursor: "pointer",
                                fontSize: 18,
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile
                                ? "1fr"
                                : "1fr 2fr 1fr",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <input
                                type="text"
                                inputMode="decimal"
                                value={shareAmount}
                                onChange={function (e) {
                                  setShareAmount(e.target.value);
                                }}
                                style={sinp}
                                placeholder="_,__"
                              />
                              <AmountCalculatorButton
                                value={shareAmount}
                                onApply={function (next) {
                                  setShareAmount(next);
                                }}
                                compact
                              />
                            </div>
                            <input
                              value={shareDesc}
                              onChange={function (e) {
                                setShareDesc(e.target.value);
                              }}
                              style={sinp}
                              placeholder={L("Descrizione")}
                            />
                            <input
                              type="date"
                              value={shareDate}
                              onChange={function (e) {
                                setShareDate(e.target.value);
                              }}
                              style={sinp}
                            />
                          </div>
                          <select
                            value={sharePaidBy}
                            onChange={function (e) {
                              setSharePaidBy(e.target.value);
                            }}
                            style={sinp}
                          >
                            {activeParticipants.map(function (p) {
                              return (
                                <option key={p.id} value={p.id}>
                                  {L("Pagata da")} {personLabel(p)}
                                </option>
                              );
                            })}
                          </select>
                          <div style={{ fontSize: 11, color: subC }}>
                            {L(
                              "La modifica viene salvata direttamente su questa transazione."
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              justifyContent: "flex-end",
                            }}
                          >
                            <Btn
                              onClick={resetShareExpenseForm}
                              bg={dark ? "#333" : "#f0f0f0"}
                              color={textC}
                            >
                              {L("Annulla")}
                            </Btn>
                            <Btn
                              onClick={addSharedActivity}
                              disabled={!shareExpenseFormValid}
                              bg={
                                shareExpenseFormValid
                                  ? confirmButtonColor
                                  : "#A8A8A8"
                              }
                            >
                              {L("Aggiorna spesa")}
                            </Btn>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "flex-start",
                          }}
                        >
                          <span style={{ fontSize: 18, marginTop: 1 }}>
                            {a.kind === "settlement" ? "↔️" : "🧾"}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: textC,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {a.kind === "settlement"
                                ? (from ? personLabel(from) : L("Partecipante")) +
                                  " " +
                                  L("ha pagato") +
                                  " " +
                                  (to ? personLabel(to) : L("Partecipante"))
                                : a.desc}
                            </div>
                            <div style={{ fontSize: 11, color: subC }}>
                              {fmtDate(a.date, dateFmt)} · {a.time || "--:--"}
                            </div>
                            {a.kind === "settlement" && !!shareExpandedActivityIds[a.id] && (
                              <div style={{ marginTop: 6, fontSize: 11, color: subC, lineHeight: 1.35 }}>
                                {L("Commento")}: {String(a.comment || "").trim() || "—"}
                              </div>
                            )}
                            {a.kind !== "settlement" && (
                              <div
                                style={{
                                  marginTop: 6,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                }}
                              >
                                <div style={{ fontSize: 11, color: subC }}>
                                  {L("Categoria")}: {" "}
                                  {activityShareCategory
                                    ? (activityShareCategory.icon || "🏷️") + " " + activityShareCategory.name
                                    : L("Senza categoria")}
                                </div>
                                {!!shareExpandedActivityIds[a.id] && (
                                  <>
                                    <div style={{ fontSize: 11, color: textC }}>
                                      {L("Pagata da")}: {" "}
                                      {paid ? personLabel(paid) : L("Partecipante")}
                                    </div>
                                    <div style={{ fontSize: 11, color: subC }}>
                                      {L("Condivisa con")}: {" "}
                                      {Object.keys(a.shares || {})
                                        .map(function (pid) {
                                          var pp = participants.find(function (x) {
                                            return x.id === pid;
                                          });
                                          return (
                                            (pp ? personLabel(pp) : L("Partecipante")) +
                                            " " +
                                            fmt((a && a.shares && a.shares[pid]) || 0)
                                          );
                                        })
                                        .join(" · ") || "—"}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                            <div
                              style={{
                                fontSize: 16,
                                fontWeight: 900,
                                color:
                                  a.kind === "settlement"
                                    ? confirmButtonColor
                                    : expenseColor,
                                textAlign: "right",
                              }}
                            >
                              {a.originalAmount && a.currency && a.currency !== (_c.currency || a.baseCurrency)
                                ? Number(a.originalAmount).toLocaleString(lang || "it", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + a.currency
                                : fmt(a.amount)}
                              {a.originalAmount && a.currency && a.currency !== (_c.currency || a.baseCurrency) && (
                                <div style={{ fontSize: 10, color: subC, fontWeight: 400 }}>
                                  {fmt(a.baseAmount || a.amount)}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                title={shareExpandedActivityIds[a.id] ? L("Comprimi") : L("Espandi")}
                                onClick={function () {
                                  setShareExpandedActivityIds(function (prev) {
                                    var next: any = Object.assign({}, prev || {});
                                    next[a.id] = !next[a.id];
                                    return next;
                                  });
                                }}
                                style={{ border: "1px solid #D7DDEA", background: dark ? "#2A2A3D" : "#F5F7FB", color: textC, borderRadius: 8, width: 26, height: 26, cursor: "pointer", fontSize: 11, padding: 0 }}
                              >
                                {shareExpandedActivityIds[a.id] ? "▴" : "▾"}
                              </button>
                              {activeShareReceiptForActivity(a.id) && (
                                <button
                                  type="button"
                                  title={L("Apri ricevuta")}
                                  onClick={function () {
                                    openStoredShareReceipt(activeShareReceiptForActivity(a.id));
                                  }}
                                  style={{ border: "1px solid #D6D1F7", background: dark ? "#2D2948" : "#F5F1FF", color: secondaryButtonColor, borderRadius: 8, width: 26, height: 26, cursor: "pointer", fontSize: 11, padding: 0 }}
                                >
                                  🧾
                                </button>
                              )}
                              <button
                                onClick={function () {
                                  if (a.kind === "settlement") startEditSettlement(a);
                                  else startEditSharedActivity(a);
                                }}
                                title={L("Modifica")}
                                style={{ background: "#EEF4FF", border: "1px solid #BFD7FF", borderRadius: 8, width: 26, height: 26, cursor: "pointer", color: confirmButtonColor, fontSize: 11, padding: 0 }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={function () {
                                  deleteActivity(a.id);
                                }}
                                title={L("Elimina")}
                                style={{ background: "#FFF0F0", border: "1px solid #FFD0D0", borderRadius: 8, width: 26, height: 26, cursor: "pointer", color: expenseColor, fontSize: 11, padding: 0 }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {shareFilterOpen && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,.50)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding: isMobile ? "5vh 10px 3vh" : "9vh 16px 3vh",
                    boxSizing: "border-box",
                    overflowY: "auto",
                  }}
                  onClick={function (e) {
                    if (e.target === e.currentTarget) setShareFilterOpen(false);
                  }}
                >
                  <div
                    style={{
                      background: dark ? "#181827" : "#F7F8FC",
                      border: "1px solid " + borderC,
                      borderRadius: 22,
                      padding: 14,
                      width: "100%",
                      maxWidth: 500,
                      maxHeight: "88vh",
                      overflowY: "auto",
                      boxShadow: dark
                        ? "none"
                        : "0 18px 46px rgba(15,23,42,.20)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 950,
                            color: textC,
                          }}
                        >
                          {L("Filtri e ordine")}
                        </div>
                        <div
                          style={{ fontSize: 11, color: subC, marginTop: 2 }}
                        >
                          Share · {L("Spese del progetto")}
                        </div>
                      </div>
                      <PopupCloseButton onClick={function () { setShareFilterOpen(false); }} dark={dark} label={L("Chiudi")} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          background: cardBg,
                          border: "1px solid " + borderC,
                          borderRadius: 14,
                          padding: 12,
                          boxShadow: dark
                            ? "none"
                            : "0 3px 12px rgba(15,23,42,.045)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 950,
                            color: textC,
                            marginBottom: 9,
                          }}
                        >
                          {L("Parola chiave")}
                        </div>
                        <div style={{ position: "relative" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: 11,
                              top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: 14,
                              pointerEvents: "none",
                            }}
                          >
                            🔍
                          </span>
                          <input
                            value={shareFilterSearch}
                            onChange={function (e) {
                              setShareFilterSearch(e.target.value);
                            }}
                            placeholder={L("Cerca nelle spese")}
                            style={{ ...sinp, paddingLeft: 34 }}
                          />
                        </div>
                      </div>
                      {shareFilterAccordion(
                        "period",
                        L("Periodo"),
                        "#7F77DD",
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                            paddingTop: 10,
                          }}
                        >
                          <label
                            style={{
                              fontSize: 11,
                              fontWeight: 850,
                              color: subC,
                            }}
                          >
                            {L("Data da")}
                            <input
                              type="date"
                              value={shareFilterDateFrom}
                              onChange={function (e) {
                                setShareFilterDateFrom(e.target.value);
                              }}
                              style={{ ...sinp, marginTop: 5 }}
                            />
                          </label>
                          <label
                            style={{
                              fontSize: 11,
                              fontWeight: 850,
                              color: subC,
                            }}
                          >
                            {L("Data a")}
                            <input
                              type="date"
                              value={shareFilterDateTo}
                              onChange={function (e) {
                                setShareFilterDateTo(e.target.value);
                              }}
                              style={{ ...sinp, marginTop: 5 }}
                            />
                          </label>
                        </div>
                      )}
                      {shareFilterAccordion(
                        "amount",
                        L("Importo"),
                        "#F59E0B",
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 10,
                            paddingTop: 10,
                          }}
                        >
                          <label
                            style={{
                              fontSize: 11,
                              fontWeight: 850,
                              color: subC,
                            }}
                          >
                            {L("Importo minimo")}
                            <input
                              type="text"
                              inputMode="decimal"
                              value={shareFilterAmountMin}
                              onChange={function (e) {
                                setShareFilterAmountMin(e.target.value);
                              }}
                              placeholder="0"
                              style={{ ...sinp, marginTop: 5 }}
                            />
                          </label>
                          <label
                            style={{
                              fontSize: 11,
                              fontWeight: 850,
                              color: subC,
                            }}
                          >
                            {L("Importo massimo")}
                            <input
                              type="text"
                              inputMode="decimal"
                              value={shareFilterAmountMax}
                              onChange={function (e) {
                                setShareFilterAmountMax(e.target.value);
                              }}
                              placeholder="0"
                              style={{ ...sinp, marginTop: 5 }}
                            />
                          </label>
                        </div>
                      )}
                      {shareFilterAccordion(
                        "payer",
                        L("Pagatore"),
                        "#10B981",
                        <div style={{ paddingTop: 10 }}>
                          <select
                            value={shareFilterPaidBy}
                            onChange={function (e) {
                              setShareFilterPaidBy(e.target.value);
                            }}
                            style={sinp}
                          >
                            <option value="">{L("Tutti i pagatori")}</option>
                            {activeParticipants.map(function (p) {
                              return (
                                <option key={p.id} value={p.id}>
                                  {personLabel(p)}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                      {shareFilterAccordion(
                        "category",
                        L("Categoria Share"),
                        "#8B5CF6",
                        <div style={{ paddingTop: 10 }}>
                          <select
                            value={shareFilterCategoryId}
                            onChange={function (e) {
                              setShareFilterCategoryId(e.target.value);
                            }}
                            style={sinp}
                          >
                            <option value="">{L("Tutte le categorie")}</option>
                            {projectShareCategories.map(function (category) {
                              return (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                      {shareFilterAccordion(
                        "order",
                        L("Ordine"),
                        "#3B82F6",
                        <div style={{ paddingTop: 10 }}>
                          <select
                            value={shareSortDirection}
                            onChange={function (e) {
                              setShareSortDirection(e.target.value);
                            }}
                            style={sinp}
                          >
                            <option value="desc">{L("Più recenti")}</option>
                            <option value="asc">{L("Meno recenti")}</option>
                          </select>
                        </div>
                      )}
                      <Btn
                        onClick={function () {
                          setShareFilterOpen(false);
                        }}
                        bg={confirmButtonColor}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          fontWeight: 950,
                          marginTop: 2,
                        }}
                      >
                        {L("Filtra")}
                      </Btn>
                      <Btn
                        onClick={resetShareFilters}
                        bg={secondaryButtonColor}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          fontWeight: 900,
                        }}
                      >
                        {L("Pulisci filtri")}
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {shareProjectTab === "categorie" && (
            <div style={{ background: cardBg, border: "1px solid " + borderC, borderRadius: 18, padding: 14, boxShadow: dark ? "none" : "0 8px 24px rgba(15,23,42,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 950, color: textC }}>{L("Categorie")}</div>
                  <FainanceInfoPopover label={L("Informazioni")} title={L("Categorie")} size={22} popupWidth={340}>
                    <div style={{ lineHeight: 1.45 }}>
                      {L("Le categorie appartengono al progetto e sono condivise con tutti i partecipanti. La mappatura sulla categoria personale è invece privata per ogni utente.")}
                      <div style={{ marginTop: 8 }}>{L("Apri Modifica su una categoria per scegliere anche la categoria personale usata nelle tue statistiche. Se non scegli nulla viene usata la categoria predefinita per Share")}: {shareDefaultPersonalCategory ? shareDefaultPersonalCategory.name : L("Altro")}.</div>
                    </div>
                  </FainanceInfoPopover>
                </div>
                {canManageShareCategories && <Btn onClick={openNewShareCategoryPopup} bg={confirmButtonColor} style={{ padding: "9px 13px", fontWeight: 900, flexShrink: 0 }}>＋ {L("Aggiungi")}</Btn>}
              </div>
              {!canManageShareCategories && <div style={{ marginBottom: 10, padding: "9px 10px", borderRadius: 12, background: dark ? "#272738" : "#F5F4FB", color: subC, fontSize: 11 }}>{L("Solo il proprietario può modificare nome, icona e colore. Ogni partecipante può comunque modificare la propria mappatura personale.")}</div>}
              {!projectShareCategories.length ? (
                <div style={{ fontSize: 12, color: subC, padding: "8px 0" }}>{L("Non ci sono ancora categorie Share in questo progetto.")}</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {projectShareCategories.map(function (category, categoryIndex) {
                    var categoryColor = String(category.color || selected.color || confirmButtonColor || "#4F8FF7");
                    var mappedId = shareCategoryMappingValue(category.id);
                    var mappedCategory = personalShareCategories.find(function (pc) { return String(pc.id) === String(mappedId || ""); });
                    return (
                      <div key={category.id} style={{ border: "1px solid " + categoryColor + "66", borderRadius: 14, padding: 11, background: categoryColor + (dark ? "26" : "18") }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <span style={{ width: 32, height: 32, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: categoryColor + "33", flexShrink: 0 }}><FainanceIcon value={category.icon || "🏷️"} size={19} /></span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: textC, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{category.name}</div>
                            <div style={{ fontSize: 10.5, color: subC, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {mappedCategory ? L("Categoria personale") + ": " + (mappedCategory.icon || "🏷️") + " " + mappedCategory.name : L("Categoria personale") + ": " + (shareDefaultPersonalCategory ? shareDefaultPersonalCategory.name : L("Altro")) + " (" + L("predefinita") + ")"}
                            </div>
                          </div>
                          {canManageShareCategories && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <button type="button" title={L("Sposta su")} disabled={categoryIndex === 0} onClick={function () { moveShareProjectCategory(category.id, "up"); }} style={{ border: "1px solid #D7DDEA", background: categoryIndex === 0 ? (dark ? "#2A2A3D" : "#F5F7FB") : "#F5F7FB", opacity: categoryIndex === 0 ? .45 : 1, color: textC, borderRadius: 8, width: 28, height: 24, cursor: categoryIndex === 0 ? "default" : "pointer", padding: 0 }}>▴</button>
                            <button type="button" title={L("Sposta giù")} disabled={categoryIndex === projectShareCategories.length - 1} onClick={function () { moveShareProjectCategory(category.id, "down"); }} style={{ border: "1px solid #D7DDEA", background: categoryIndex === projectShareCategories.length - 1 ? (dark ? "#2A2A3D" : "#F5F7FB") : "#F5F7FB", opacity: categoryIndex === projectShareCategories.length - 1 ? .45 : 1, color: textC, borderRadius: 8, width: 28, height: 24, cursor: categoryIndex === projectShareCategories.length - 1 ? "default" : "pointer", padding: 0 }}>▾</button>
                          </div>}
                          <button type="button" title={L("Modifica")} onClick={function () { openEditShareCategoryPopup(category); }} style={{ border: "1px solid #BFD7FF", background: "#EEF4FF", color: confirmButtonColor, borderRadius: 9, padding: "5px 8px", cursor: "pointer" }}>✏️</button>
                          {canManageShareCategories && <button type="button" title={L("Elimina")} onClick={function () { deleteShareProjectCategory(category.id); }} style={{ border: "1px solid #FFD0D0", background: "#FFF0F0", color: expenseColor, borderRadius: 9, padding: "5px 8px", cursor: "pointer" }}>🗑️</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {shareProjectTab === "partecipanti" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 18,
                  padding: 14,
                  boxShadow: dark ? "none" : "0 8px 24px rgba(15,23,42,.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 950, color: textC }}>
                    {L("Partecipanti")}
                  </div>
                  <Btn
                    onClick={function () {
                      setShareParticipantPopupOpen(true);
                    }}
                    bg={confirmButtonColor}
                    style={{ padding: "8px 11px", fontWeight: 900 }}
                  >
                    {L("Aggiungi Partecipante")}
                  </Btn>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 9 }}
                >
                  {participants.map(function (p) {
                    var archived = p.status === "archived";
                    var pending = p.status === "pending";
                    var statusBg = pending
                      ? dark ? "#3A301C" : "#FFF7DE"
                      : archived
                      ? dark ? "#2A2A34" : "#F4F4F6"
                      : dark ? "#1D352E" : "#EAF8F2";
                    var statusBorder = pending
                      ? dark ? "#765E22" : "#F0CF70"
                      : archived
                      ? borderC
                      : dark ? "#285A49" : "#BDEBDC";
                    var statusColor = pending ? "#A46D00" : archived ? subC : incomeColor;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "38px minmax(0,1fr)"
                            : "38px minmax(0,1fr) auto",
                          alignItems: "center",
                          columnGap: 10,
                          rowGap: 7,
                          padding: "10px 11px",
                          border: "1px solid " + (pending ? statusBorder : borderC),
                          borderRadius: 14,
                          background: pending
                            ? dark ? "#2E291E" : "#FFFCF2"
                            : dark ? "#252535" : "#fff",
                          opacity: archived ? 0.58 : 1,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 14,
                            background: pending
                              ? dark ? "#4A3B18" : "#FFF0BF"
                              : (p.kind === "fake"
                                  ? secondaryButtonColor
                                  : confirmButtonColor) + "22",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 950,
                            color: pending
                              ? "#A46D00"
                              : p.kind === "fake"
                              ? secondaryButtonColor
                              : confirmButtonColor,
                            flexShrink: 0,
                          }}
                        >
                          {personFullName(p).slice(0, 1).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              minWidth: 0,
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              className="fai-ellipsis"
                              style={{
                                fontSize: 13,
                                fontWeight: 950,
                                color: textC,
                                minWidth: 0,
                                maxWidth: "100%",
                              }}
                            >
                              {personFullName(p)}
                            </div>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 20,
                                padding: "2px 7px",
                                borderRadius: 999,
                                background: statusBg,
                                border: "1px solid " + statusBorder,
                                color: statusColor,
                                fontSize: 10,
                                fontWeight: 900,
                                lineHeight: 1.1,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              {pending
                                ? "⏳ " + L("Invito in attesa")
                                : archived
                                ? L("Archiviato")
                                : "✓ " + L("Attivo")}
                            </span>
                          </div>
                          <div
                            className="fai-ellipsis"
                            style={{ fontSize: 11, color: subC, marginTop: 3 }}
                          >
                            {L(
                              p.kind === "fake"
                                ? "Persona Esterna"
                                : p.kind === "registered"
                                ? "Utente fAInance"
                                : "Utente invitato"
                            )}
                            {p.email ? " · " + p.email : ""}
                          </div>
                        </div>
                        {p.id !== "me" && (
                          <div
                            style={{
                              gridColumn: isMobile ? "2" : "auto",
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              justifyContent: isMobile ? "flex-start" : "flex-end",
                              minWidth: 0,
                            }}
                          >
                            {archived ? (
                              <button
                                onClick={function () { restoreParticipant(p.id); }}
                                style={{
                                  background: "#eef8f4",
                                  border: "1px solid #bdebdc",
                                  borderRadius: 9,
                                  color: incomeColor,
                                  padding: "6px 8px",
                                  fontSize: 11,
                                  fontWeight: 850,
                                }}
                              >
                                {L("Ripristina")}
                              </button>
                            ) : (
                              <button
                                onClick={function () { archiveParticipant(p.id); }}
                                style={{
                                  background: "#fff8e1",
                                  border: "1px solid #ffe29a",
                                  borderRadius: 9,
                                  color: "#9a6a00",
                                  padding: "6px 8px",
                                  fontSize: 11,
                                  fontWeight: 850,
                                }}
                              >
                                {L("Archivia")}
                              </button>
                            )}
                            <button
                              onClick={function () { removeParticipant(p.id); }}
                              style={{
                                background: "#fff0f0",
                                border: "1px solid #ffd0d0",
                                borderRadius: 9,
                                color: expenseColor,
                                padding: "6px 8px",
                                fontSize: 11,
                                fontWeight: 850,
                              }}
                            >
                              {L("Elimina")}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {shareParticipantPopupOpen && (
                <div
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,.45)",
                    zIndex: 500,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding: "17vh 16px 3vh",
                    boxSizing: "border-box",
                    overflowY: "auto",
                  }}
                  onClick={function (e) {
                    if (e.target === e.currentTarget)
                      setShareParticipantPopupOpen(false);
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      maxWidth: 460,
                      background: cardBg,
                      border: "1px solid " + borderC,
                      borderRadius: 18,
                      padding: 14,
                      boxShadow: dark ? "none" : "0 14px 40px rgba(0,0,0,.18)",
                    }}
                  >
                    <div style={{ position: "absolute", right: 10, top: 10 }}>
                      <PopupCloseButton onClick={function () { setShareParticipantPopupOpen(false); }} dark={dark} label={L("Chiudi")} />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        paddingTop: 30,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 950,
                          color: textC,
                          marginBottom: 10,
                        }}
                      >
                        {L("Aggiungi partecipante")}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3,1fr)",
                          gap: 8,
                          marginBottom: 10,
                        }}
                      >
                        <button
                          type="button"
                          onClick={function () {
                            setPersonMode("user");
                          }}
                          style={{
                            border:
                              "1px solid " +
                              (personMode === "user"
                                ? secondaryButtonColor
                                : borderC),
                            background:
                              personMode === "user"
                                ? secondaryButtonColor
                                : dark
                                ? "#252535"
                                : "#fff",
                            color: personMode === "user" ? "#fff" : textC,
                            borderRadius: btnRadius,
                            padding: "9px 8px",
                            fontSize: 12,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          {L("Utente")}
                        </button>
                        <button
                          type="button"
                          onClick={pickContactFromAddressBook}
                          disabled={participantBusy}
                          style={{
                            border:
                              "1px solid " +
                              (participantBusy
                                ? secondaryButtonColor
                                : borderC),
                            background: participantBusy
                              ? secondaryButtonColor
                              : dark
                              ? "#252535"
                              : "#fff",
                            color: participantBusy ? "#fff" : textC,
                            borderRadius: btnRadius,
                            padding: "9px 8px",
                            fontSize: 12,
                            fontWeight: 900,
                            cursor: participantBusy ? "not-allowed" : "pointer",
                            opacity: participantBusy ? 0.75 : 1,
                          }}
                        >
                          {participantBusy ? "..." : L("Da Rubrica")}
                        </button>
                        <button
                          type="button"
                          onClick={function () {
                            setPersonMode("fake");
                          }}
                          style={{
                            border:
                              "1px solid " +
                              (personMode === "fake"
                                ? secondaryButtonColor
                                : borderC),
                            background:
                              personMode === "fake"
                                ? secondaryButtonColor
                                : dark
                                ? "#252535"
                                : "#fff",
                            color: personMode === "fake" ? "#fff" : textC,
                            borderRadius: btnRadius,
                            padding: "9px 8px",
                            fontSize: 12,
                            fontWeight: 900,
                            cursor: "pointer",
                          }}
                        >
                          {L("Persona Esterna")}
                        </button>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                          gap: 8,
                        }}
                      >
                        {personMode === "fake" ? (
                          <input
                            placeholder={L("Nome persona esterna")}
                            value={newPersonName}
                            onChange={function (e) {
                              setNewPersonName(e.target.value);
                            }}
                            style={sinp}
                          />
                        ) : (
                          <input
                            placeholder={L("Email o @username")}
                            value={newPersonEmail}
                            onChange={function (e) {
                              setNewPersonEmail(e.target.value);
                            }}
                            style={sinp}
                          />
                        )}
                        <Btn
                          onClick={addParticipant}
                          bg={
                            shareParticipantFormValid
                              ? confirmButtonColor
                              : "#A8A8A8"
                          }
                          disabled={!shareParticipantFormValid}
                        >
                          {participantBusy ? "..." : L("Aggiungi")}
                        </Btn>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: subC,
                          marginTop: 8,
                          lineHeight: 1.35,
                        }}
                      >
                        {L(
                          "Cerca un account tramite email o @username. Persona esterna usa solo il nome e non riceve inviti."
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {shareProjectTab === "riassunto" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: textC,
                    marginBottom: 10,
                  }}
                >
                  {L("Riassunto")}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(2,minmax(0,1fr))"
                      : "repeat(3,minmax(0,1fr))",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      gridColumn: isMobile ? "1/-1" : "auto",
                      minWidth: 0,
                    }}
                  >
                    <StatCard
                      title={L("Spese progetto")}
                      value={fmt(totalSpent)}
                      color={expenseColor}
                      bg={expenseColor + "22"}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <StatCard
                      title={L("Mi devono")}
                      value={fmt(Math.max(0, myBalance))}
                      color={incomeColor}
                      bg={incomeColor + "22"}
                    />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <StatCard
                      title={L("Devo")}
                      value={fmt(Math.max(0, -myBalance))}
                      color={expenseColor}
                      bg={expenseColor + "22"}
                    />
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: textC,
                    marginBottom: 10,
                  }}
                >
                  {L("Chi deve soldi a chi")}
                </div>
                {debts.length === 0 && (
                  <div
                    style={{
                      fontSize: 13,
                      color: subC,
                      textAlign: "center",
                      padding: "16px 0",
                    }}
                  >
                    {L("Nessun saldo aperto")}
                  </div>
                )}
                {debts.map(function (d, i) {
                  var from = participants.find(function (p) {
                    return p.id === d.from;
                  });
                  var to = participants.find(function (p) {
                    return p.id === d.to;
                  });
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px solid " + borderC,
                      }}
                    >
                      <span style={{ fontSize: 13, color: textC, flex: 1 }}>
                        <strong>{from ? personLabel(from) : L("Partecipante")}</strong>{" "}
                        {L("deve pagare")}{" "}
                        <strong>{to ? personLabel(to) : L("Partecipante")}</strong>
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: confirmButtonColor,
                        }}
                      >
                        {fmt(d.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <Btn
                  onClick={function () {
                    setSettlementPopupOpen(true);
                  }}
                  bg={confirmButtonColor}
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    fontWeight: 950,
                  }}
                >
                  {L("Registra saldo/rimborso")}
                </Btn>
                <Btn
                  onClick={exportShareProjectXlsx}
                  bg={secondaryButtonColor || "#5FAFE5"}
                  color="#fff"
                  disabled={false}
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    fontWeight: 950,
                    marginTop: 10,
                  }}
                >
                  📊 {L("Scarica progetto in Excel")}
                </Btn>
              </div>
            </div>
          )}
          {settlementPopupOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                zIndex: 9999,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "17vh 16px 3vh",
                boxSizing: "border-box",
                overflowY: "auto",
              }}
              onClick={function (e) {
                if (e.target === e.currentTarget) { resetSettlementForm(); setSettlementPopupOpen(false); }
              }}
            >
              <div
                style={{
                  background: dark ? "#181827" : "#fff",
                  border: "1px solid " + borderC,
                  borderRadius: 22,
                  padding: 16,
                  width: "100%",
                  maxWidth: 430,
                  boxShadow: dark ? "none" : "0 18px 42px rgba(15,23,42,.18)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 17, fontWeight: 950, color: textC }}
                    >
                      ↔️ {L(editingSettlementActivityId ? "Modifica saldo/rimborso" : "Registra saldo/rimborso")}
                    </div>
                    <div style={{ fontSize: 12, color: subC, marginTop: 3 }}>
                      {L(
                        "Registra un pagamento tra partecipanti del progetto."
                      )}
                    </div>
                  </div>
                  <PopupCloseButton onClick={function () { resetSettlementForm(); setSettlementPopupOpen(false); }} dark={dark} label={L("Chiudi")} />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "minmax(0,1fr) 40px minmax(0,1fr)" : "minmax(0,1fr) 46px minmax(0,1fr)",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      background: dark ? "#1f1f31" : "#F7F8FF",
                      border: "1px solid " + borderC,
                      borderRadius: 15,
                      padding: 10,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: subC,
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      {L("Da")}
                    </label>
                    <select
                      value={settlementFrom}
                      onChange={function (e) {
                        setSettlementFrom(e.target.value);
                      }}
                      style={sinp}
                    >
                      {participants.map(function (p) {
                        return (
                          <option key={p.id} value={p.id}>
                            {personLabel(p)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={function () {
                      var previousFrom = settlementFrom;
                      setSettlementFrom(settlementTo);
                      setSettlementTo(previousFrom);
                    }}
                    aria-label={L("Inverti Da e A")}
                    title={L("Inverti Da e A")}
                    style={{
                      alignSelf: "center",
                      justifySelf: "center",
                      width: isMobile ? 36 : 40,
                      height: isMobile ? 36 : 40,
                      borderRadius: 999,
                      border: "1px solid " + (secondaryButtonColor || confirmButtonColor),
                      background: dark ? "#252535" : "#F0F7FF",
                      color: secondaryButtonColor || confirmButtonColor,
                      fontSize: 20,
                      fontWeight: 950,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    ⇄
                  </button>
                  <div
                    style={{
                      background: dark ? "#1f1f31" : "#F7F8FF",
                      border: "1px solid " + borderC,
                      borderRadius: 15,
                      padding: 10,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: subC,
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      {L("A")}
                    </label>
                    <select
                      value={settlementTo}
                      onChange={function (e) {
                        setSettlementTo(e.target.value);
                      }}
                      style={sinp}
                    >
                      {participants.map(function (p) {
                        return (
                          <option key={p.id} value={p.id}>
                            {personLabel(p)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      background: dark ? "#1f1f31" : "#FFF7F2",
                      border: "1px solid " + borderC,
                      borderRadius: 15,
                      padding: 12,
                      minWidth: 0,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: subC,
                        display: "block",
                        marginBottom: 7,
                      }}
                    >
                      {L("Importo")}
                    </label>
                    <input
                      ref={settlementAmountInputRef}
                      autoFocus
                      type="text"
                      inputMode="decimal"
                      placeholder="_,__"
                      value={settlementAmount}
                      onChange={function (e) {
                        setSettlementAmount(e.target.value);
                      }}
                      style={{
                        ...sinp,
                        fontSize: 18,
                        fontWeight: 900,
                        minWidth: 0,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      background: dark ? "#1f1f31" : "#F7F8FF",
                      border: "1px solid " + borderC,
                      borderRadius: 15,
                      padding: 12,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: subC,
                        display: "block",
                        marginBottom: 7,
                      }}
                    >
                      {shareDateLabel}
                    </div>
                    <label
                      style={{
                        ...sinp,
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                        position: "relative",
                        overflow: "hidden",
                        cursor: "pointer",
                        minWidth: 0,
                        boxSizing: "border-box",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: textC,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {fmtDate(settlementDate, dateFmt)}
                      </span>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>📅</span>
                      <input
                        aria-label={shareDateLabel}
                        lang={shareDateInputLang}
                        type="date"
                        value={settlementDate}
                        onChange={function (e) {
                          setSettlementDate(e.target.value);
                        }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          opacity: 0,
                          cursor: "pointer",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: subC,
                      display: "block",
                      marginBottom: 7,
                    }}
                  >
                    {L("Commento (facoltativo)")}
                  </label>
                  <textarea
                    value={settlementComment}
                    onChange={function (e) {
                      setSettlementComment(e.target.value);
                    }}
                    placeholder={L("Commento (facoltativo)")}
                    style={{ ...sinp, minHeight: 68, resize: "vertical" }}
                  />
                </div>
                {sharePendingReceipt && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      border: "1px solid " + borderC,
                      borderRadius: 14,
                      padding: 10,
                      marginBottom: 12,
                      background: dark ? "#1f1f31" : "#F7F8FF",
                    }}
                  >
                    <button type="button" onClick={function () { setShareReceiptPreview(sharePendingReceipt); }} style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                      <img src={sharePendingReceipt.dataUrl} alt={L("Ricevuta caricata")} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 10, border: "1px solid " + borderC, display: "block" }} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: textC }}>{L("Ricevuta caricata")}</div>
                      <div style={{ fontSize: 11, color: subC, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sharePendingReceipt.name || L("Apri ricevuta")}</div>
                    </div>
                    <button type="button" onClick={function () { setSharePendingReceipt(null); }} style={{ border: "1px solid #FFD0D0", background: "#FFF0F0", color: expenseColor, borderRadius: 9, padding: "7px 9px", cursor: "pointer" }}>🗑️</button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <Btn
                    onClick={function () { requestShareReceiptUpload("settlement"); }}
                    bg={dark ? "#333" : "#f0f0f0"}
                    color={textC}
                    style={{ flex: 1, padding: "12px 14px", fontWeight: 900 }}
                  >
                    🧾 {L(sharePendingReceipt ? "Sostituisci ricevuta" : "Carica ricevuta")}
                  </Btn>
                </div>
                <Btn
                  onClick={addSettlement}
                  disabled={!settlementFormValid}
                  bg={settlementFormValid ? confirmButtonColor : "#A8A8A8"}
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    fontWeight: 950,
                  }}
                >
                  {L(editingSettlementActivityId ? "Aggiorna saldo" : "Registra")}
                </Btn>
              </div>
            </div>
          )}
          {shareProjectTab === "saldi" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: textC,
                    marginBottom: 10,
                  }}
                >
                  {L("Chi deve soldi a chi")}
                </div>
                {debts.length === 0 && (
                  <div
                    style={{
                      fontSize: 13,
                      color: subC,
                      textAlign: "center",
                      padding: "16px 0",
                    }}
                  >
                    {L("Nessun saldo aperto")}
                  </div>
                )}
                {debts.map(function (d, i) {
                  var from = participants.find(function (p) {
                    return p.id === d.from;
                  });
                  var to = participants.find(function (p) {
                    return p.id === d.to;
                  });
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 0",
                        borderBottom: "1px solid " + borderC,
                      }}
                    >
                      <span style={{ fontSize: 13, color: textC, flex: 1 }}>
                        <strong>{from ? personLabel(from) : L("Partecipante")}</strong>{" "}
                        {L("deve pagare")}{" "}
                        <strong>{to ? personLabel(to) : L("Partecipante")}</strong>
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 900,
                          color: confirmButtonColor,
                        }}
                      >
                        {fmt(d.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <Btn
                  onClick={function () {
                    setSettlementPopupOpen(true);
                  }}
                  bg={confirmButtonColor}
                  style={{
                    width: "100%",
                    padding: "13px 14px",
                    fontWeight: 950,
                  }}
                >
                  {L("Registra saldo/rimborso")}
                </Btn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
