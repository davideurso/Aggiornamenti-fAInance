import { useState, useEffect, useRef } from "react";
import {
  useApp,
  fbAuth,
  PLAN_LIMITS,
  RECEIPT_OCR_ENDPOINT,
  dateOffset,
  fmtDate,
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
} from "../widget";
import { parseFainanceShareVoiceCommand } from "../voiceParser";
import { pickFainanceContact } from "../native/appContacts";
import { focusFainanceInput } from "../utils/appRuntime";
import {
  saveShareAttachment,
  watchShareAttachments,
} from "../share/shareAttachments";

export function SharePanel() {
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
  var [newPersonName, setNewPersonName] = useState("");
  var [newPersonEmail, setNewPersonEmail] = useState("");
  var [personMode, setPersonMode] = useState("user");
  var [shareAmount, setShareAmount] = useState("");
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
  var [shareFilterOpen, setShareFilterOpen] = useState(false);
  var [shareFilterSearch, setShareFilterSearch] = useState("");
  var [shareFilterDateFrom, setShareFilterDateFrom] = useState("");
  var [shareFilterDateTo, setShareFilterDateTo] = useState("");
  var [shareFilterAmountMin, setShareFilterAmountMin] = useState("");
  var [shareFilterAmountMax, setShareFilterAmountMax] = useState("");
  var [shareFilterPaidBy, setShareFilterPaidBy] = useState("");
  var [shareSortDirection, setShareSortDirection] = useState("desc");
  var [shareFilterSectionsOpen, setShareFilterSectionsOpen] = useState({
    period: false,
    amount: false,
    payer: false,
    order: false,
  });
  var [sharePendingReceipt, setSharePendingReceipt] = useState(null);
  var [remoteShareAttachments, setRemoteShareAttachments] = useState<any[]>([]);
  var [shareReceiptPreview, setShareReceiptPreview] = useState<any>(null);
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
  function openShareExpensePopup(mode) {
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
      setSettlementPopupOpen(true);
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
      setToast({ text: L("Ricevuta caricata"), type: "success", icon: "🧾" });
    } catch (e) {
      setToast({
        text: L("Impossibile caricare la ricevuta"),
        type: "error",
        icon: "🚫",
      });
    }
  }
  function requestShareReceiptUpload() {
    if (!shareReceiptAllowed()) {
      setToast({
        text: L("Funzione disponibile a partire dal piano Base"),
        type: "warning",
        icon: "🔒",
      });
      return;
    }
    try {
      if (shareReceiptFileInputRef.current)
        shareReceiptFileInputRef.current.click();
    } catch (e) {}
  }
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
  function personLabel(p) {
    return p && p.uid === userId
      ? (currentUser && currentUser.name) || p.name || "Nome"
      : p.name;
  }
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
      name = foundUser
        ? foundUser.name || foundUser.displayName || (foundUser.username ? "@" + foundUser.username : email)
        : email;
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
      updateShareProject(selected.id, function (p) {
        return { ...p, participants: (p.participants || []).concat([item]) };
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
        var name = foundUser.name || foundUser.displayName || nm || em || ph;
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
    var activity = {
      id: Date.now(),
      kind: "settlement",
      amount: parseFloat(settlementAmount),
      from: settlementFrom,
      to: toId,
      date: settlementDate,
      time: new Date().toTimeString().slice(0, 5),
      desc: String(settlementComment || "").trim() || "Saldo tra partecipanti",
      comment: String(settlementComment || "").trim(),
      createdAt: new Date().toISOString(),
    };
    updateShareProject(selected.id, function (p) {
      return { ...p, activities: [activity].concat(p.activities || []) };
    });
    setSettlementAmount("");
    setSettlementComment("");
    setSettlementPopupOpen(false);
    setToast("Saldo registrato");
  }
  function deleteActivity(aid) {
    if (!selected) return;
    if (!window.confirm(L("Eliminare questa spesa Share?"))) return;
    updateShareProject(selected.id, function (p) {
      return {
        ...p,
        activities: (p.activities || []).filter(function (a) {
          return a.id !== aid;
        }),
      };
    });
    setShareReceiptUploads(function (list) {
      return (list || []).filter(function (r) {
        return String(r.activityId || "") !== String(aid);
      });
    });
    setToast("Spesa Share eliminata");
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
    shareSortDirection !== "desc"
  );
  function resetShareFilters() {
    setShareFilterSearch("");
    setShareFilterDateFrom("");
    setShareFilterDateTo("");
    setShareFilterAmountMin("");
    setShareFilterAmountMax("");
    setShareFilterPaidBy("");
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
                  fontSize: 11,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                      <FainanceIcon value={theme.icon} size={24} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
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
                  style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 16,
                      background: theme.color,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                      flexShrink: 0,
                      boxShadow: dark
                        ? "none"
                        : "0 8px 18px " + theme.color + "44",
                    }}
                  >
                    <FainanceIcon value={theme.icon} size={24} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 900,
                          color: textC,
                          lineHeight: 1.18,
                          whiteSpace: "normal",
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                        }}
                      >
                        {selected.name || "Progetto"}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: subC,
                        marginTop: 4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selected.description ||
                        L("Progetti, spese condivise e saldi")}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8 }}>
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
                        style={{
                          background: "#EEF4FF",
                          border: "1px solid #BFD7FF",
                          color: confirmButtonColor,
                          borderRadius: 10,
                          padding: "8px 10px",
                          cursor: "pointer",
                        }}
                      >
                        ✏
                      </button>
                      <button
                        onClick={function () {
                          requestDeleteProject(selected.id);
                        }}
                        style={{
                          background: "#fff0f0",
                          border: "1px solid #ffd0d0",
                          color: expenseColor,
                          borderRadius: 10,
                          padding: "8px 10px",
                          cursor: "pointer",
                        }}
                      >
                        🗑
                      </button>
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: theme.color + "18",
                        color: theme.color,
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {L("Progetto attivo")}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 8,
            }}
          >
            {[
              { id: "attivita", label: L("Progetto") },
              { id: "partecipanti", label: L("Partecipanti") },
              { id: "riassunto", label: L("Riassunto e Saldi") },
            ].map(function (tb) {
              var active = shareProjectTab === tb.id;
              return (
                <button
                  key={tb.id}
                  onClick={function () {
                    setShareProjectTab(tb.id);
                  }}
                  style={{
                    border:
                      "1px solid " + (active ? secondaryButtonColor : borderC),
                    background: active
                      ? secondaryButtonColor
                      : dark
                      ? "#333"
                      : "#f0f0f0",
                    color: active ? "#fff" : textC,
                    borderRadius: btnRadius,
                    padding: "11px 8px",
                    fontSize: 12,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {tb.label}
                </button>
              );
            })}
          </div>
          {shareProjectTab === "attivita" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Btn
                onClick={function () {
                  setShareEditingActivityId(null);
                  openShareExpensePopup("simple");
                }}
                bg={confirmButtonColor}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 15,
                  fontWeight: 950,
                }}
              >
                ＋ {L("Aggiungi spesa")}
              </Btn>
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
                              <div style={{ flexShrink: 0 }}>
                                <MultiCurrencyField
                                  inline
                                  compact
                                  value={shareFx}
                                  amount={shareAmount}
                                  onChange={setShareFx}
                                />
                              </div>
                              <div
                                style={{
                                  position: "relative",
                                  minWidth: 0,
                                  width: "min(150px, 100%)",
                                }}
                              >
                                {!String(shareAmount || "").trim() && (
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
                            </div>
                            {!String(shareAmount || "").trim() && (
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
                              minHeight: 72,
                              height: 72,
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
                              marginBottom: 8,
                            }}
                          >
                            {L("Data")}
                          </label>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: ".58fr .62fr 1.12fr 2.04fr",
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
                                fontSize: 11,
                                fontWeight: 850,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
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
                                fontSize: 11,
                                fontWeight: 850,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
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
                                fontSize: 9.5,
                                fontWeight: 850,
                                cursor: "pointer",
                                whiteSpace: "normal",
                                lineHeight: 1.05,
                                padding: "0 2px",
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
                                  fontWeight: 850,
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
                        <div
                          style={{
                            marginTop: 10,
                            background: dark ? "#1f1f31" : "#F7F8FF",
                            border: "1px solid " + borderC,
                            borderRadius: 14,
                            padding: 10,
                          }}
                        >
                          <input
                            ref={shareReceiptFileInputRef}
                            type="file"
                            accept="image/*,.jpg,.jpeg,.png,.webp"
                            onChange={onShareReceiptFileSelected}
                            style={{ display: "none" }}
                          />
                          <button
                            type="button"
                            onClick={requestShareReceiptUpload}
                            style={{
                              width: "100%",
                              border:
                                "1px solid " +
                                (shareReceiptAllowed()
                                  ? confirmButtonColor
                                  : borderC),
                              background: shareReceiptAllowed()
                                ? dark
                                  ? "#252535"
                                  : "#fff"
                                : dark
                                ? "#30303a"
                                : "#eeeeee",
                              color: shareReceiptAllowed()
                                ? confirmButtonColor
                                : subC,
                              borderRadius: btnRadius,
                              padding: "10px 12px",
                              fontWeight: 900,
                              cursor: "pointer",
                              opacity: shareReceiptAllowed() ? 1 : 0.72,
                            }}
                          >
                            🧾{" "}
                            {L(
                              sharePendingReceipt
                                ? "Ricevuta caricata"
                                : "Carica ricevuta"
                            )}
                          </button>
                          {sharePendingReceipt && (
                            <button
                              type="button"
                              onClick={function () {
                                setSharePendingReceipt(null);
                              }}
                              style={{
                                marginTop: 7,
                                width: "100%",
                                border: "none",
                                background: "transparent",
                                color: expenseColor,
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              {L("Rimuovi ricevuta")}
                            </button>
                          )}
                          <div
                            style={{
                              fontSize: 10.5,
                              color: subC,
                              lineHeight: 1.35,
                              marginTop: 7,
                            }}
                          >
                            {L(
                              "Il documento resterà disponibile per 6 mesi dalla data di caricamento, poi verrà eliminato"
                            )}
                          </div>
                        </div>
                        <div
                          style={{
                            marginTop: 10,
                            marginBottom: 4,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ fontSize: 12, color: subC }}>
                            {L("Quote")}:{" "}
                            {Object.keys(computeShares())
                              .map(function (id) {
                                var p = participants.find(function (x) {
                                  return x.id === id;
                                });
                                return (
                                  (p ? personLabel(p) : id) +
                                  " " +
                                  fmt(computeShares()[id])
                                );
                              })
                              .join(" · ")}
                          </div>
                          <Btn
                            onClick={addSharedActivity}
                            bg={
                              shareExpenseFormValid
                                ? confirmButtonColor
                                : "#A8A8A8"
                            }
                            disabled={!shareExpenseFormValid}
                            style={{ minWidth: 132, padding: "11px 16px" }}
                          >
                            {L(
                              shareEditingActivityId
                                ? "Aggiorna spesa"
                                : "Salva spesa"
                            )}
                          </Btn>
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
                    {L("Attività del progetto")}
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
                  return (
                    <div
                      key={a.id}
                      style={{
                        borderBottom: "1px solid " + borderC,
                        padding: "10px 0",
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
                              {L("Salva modifica")}
                            </Btn>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <span style={{ fontSize: 18 }}>
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
                                ? (from ? personLabel(from) : a.from) +
                                  " " +
                                  L("ha pagato") +
                                  " " +
                                  (to ? personLabel(to) : a.to)
                                : a.desc}
                            </div>
                            <div style={{ fontSize: 11, color: subC }}>
                              {fmtDate(a.date, dateFmt)} · {a.time || "--:--"}
                            </div>
                            {a.kind !== "settlement" && (
                              <div
                                style={{
                                  marginTop: 6,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                }}
                              >
                                <div style={{ fontSize: 11, color: textC }}>
                                  {L("Pagata da")}:{" "}
                                  {paid ? personLabel(paid) : a.paidBy || "—"}
                                </div>
                                <div style={{ fontSize: 11, color: subC }}>
                                  {L("Condivisa con")}:{" "}
                                  {Object.keys(a.shares || {})
                                    .map(function (pid) {
                                      var pp = participants.find(function (x) {
                                        return x.id === pid;
                                      });
                                      return (
                                        (pp ? personLabel(pp) : pid) +
                                        " " +
                                        fmt(a.shares[pid])
                                      );
                                    })
                                    .join(" · ") || "—"}
                                </div>
                                {activeShareReceiptForActivity(a.id) && (
                                  <button
                                    type="button"
                                    onClick={function () {
                                      openStoredShareReceipt(
                                        activeShareReceiptForActivity(a.id)
                                      );
                                    }}
                                    style={{
                                      alignSelf: "flex-start",
                                      border: "none",
                                      background: "transparent",
                                      padding: 0,
                                      color: confirmButtonColor,
                                      fontSize: 11,
                                      fontWeight: 900,
                                      cursor: "pointer",
                                    }}
                                  >
                                    🧾 {L("Apri ricevuta")}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 900,
                              color:
                                a.kind === "settlement"
                                  ? confirmButtonColor
                                  : expenseColor,
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
                          {a.kind !== "settlement" && (
                            <button
                              onClick={function () {
                                startEditSharedActivity(a);
                              }}
                              style={{
                                background: "#EEF4FF",
                                border: "1px solid #BFD7FF",
                                borderRadius: 9,
                                padding: "5px 8px",
                                cursor: "pointer",
                                color: confirmButtonColor,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {L("Modifica")}
                            </button>
                          )}
                          <button
                            onClick={function () {
                              deleteActivity(a.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: subC,
                            }}
                          >
                            ×
                          </button>
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
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 11px",
                          border: "1px solid " + borderC,
                          borderRadius: 14,
                          background: dark ? "#252535" : "#fff",
                          opacity: archived ? 0.55 : 1,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 14,
                            background:
                              (p.kind === "fake"
                                ? secondaryButtonColor
                                : confirmButtonColor) + "22",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 950,
                            color:
                              p.kind === "fake"
                                ? secondaryButtonColor
                                : confirmButtonColor,
                            flexShrink: 0,
                          }}
                        >
                          {personLabel(p).slice(0, 1).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            className="fai-ellipsis"
                            style={{
                              fontSize: 13,
                              fontWeight: 950,
                              color: textC,
                            }}
                          >
                            {personLabel(p)}
                          </div>
                          <div
                            className="fai-ellipsis"
                            style={{ fontSize: 11, color: subC, marginTop: 2 }}
                          >
                            {L(
                              p.kind === "fake"
                                ? "Persona Esterna"
                                : p.kind === "registered"
                                ? "Utente fAInance"
                                : "Invito in attesa"
                            )}
                            {p.email ? " · " + p.email : ""}
                            {p.status === "pending"
                              ? " · " + L("pendente")
                              : ""}
                            {archived ? " · " + L("archiviato") : ""}
                          </div>
                        </div>
                        {p.id !== "me" && (
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              justifyContent: "flex-end",
                            }}
                          >
                            {archived ? (
                              <button
                                onClick={function () {
                                  restoreParticipant(p.id);
                                }}
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
                                onClick={function () {
                                  archiveParticipant(p.id);
                                }}
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
                              onClick={function () {
                                removeParticipant(p.id);
                              }}
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
                        <strong>{from ? personLabel(from) : d.from}</strong>{" "}
                        {L("deve pagare")}{" "}
                        <strong>{to ? personLabel(to) : d.to}</strong>
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
                if (e.target === e.currentTarget) setSettlementPopupOpen(false);
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
                      ↔️ {L("Registra saldo/rimborso")}
                    </div>
                    <div style={{ fontSize: 12, color: subC, marginTop: 3 }}>
                      {L(
                        "Registra un pagamento tra partecipanti del progetto."
                      )}
                    </div>
                  </div>
                  <PopupCloseButton onClick={function () { setSettlementPopupOpen(false); }} dark={dark} label={L("Chiudi")} />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
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
                  {L("Registra")}
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
                        <strong>{from ? personLabel(from) : d.from}</strong>{" "}
                        {L("deve pagare")}{" "}
                        <strong>{to ? personLabel(to) : d.to}</strong>
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
