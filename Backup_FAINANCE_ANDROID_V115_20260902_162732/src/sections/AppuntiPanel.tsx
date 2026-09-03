import { useState, useEffect, useRef } from 'react';
import { registerPlugin } from '@capacitor/core';
import { useApp, EMOJI_LIST, fmtDate } from '../core';
import { Btn, AppColorSelector, PopupCloseButton } from '../widget';
const FainanceFileNative:any=registerPlugin('FainanceFile');

export function AppuntiPanel() {
  var _c:any=useApp();
  var {appuntiDocuments,appuntiNotes,bankCoords,borderC,canAddPlanItem,cardBg,confirmButtonColor,creditCards,dark,dateFmt,getPlanLimit,isMobile,lang,setAppuntiDocuments,setAppuntiNotes,setBankCoords,setCreditCards,setToast,setWidget2SelectedBankId,setWidget2SelectedCreditCardId,setWidget2SelectedNoteId,subC,textC,translateUiRuntimeText,upgradeMessage,userKey,widget2SelectedBankId,widget2SelectedCreditCardId,widget2SelectedNoteId}:any=_c;

    function L(s) {
      return translateUiRuntimeText ? translateUiRuntimeText(s) : s;
    }
    function appuntiDraftKey(name) {
      try {
        return userKey ? userKey(name) : name;
      } catch (e) {
        return name;
      }
    }
    function readAppuntiDraft(name, fallback) {
      try {
        var raw = localStorage.getItem(appuntiDraftKey(name));
        if (!raw) return fallback;
        var saved = JSON.parse(raw);
        return saved && typeof saved === "object"
          ? { ...fallback, ...saved }
          : fallback;
      } catch (e) {
        return fallback;
      }
    }
    function escapeNoteHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }
    function plainTextToNoteHtml(value) {
      return escapeNoteHtml(value).replace(/\r?\n/g, "<br>");
    }
    function sanitizeNoteHtml(value) {
      var html = String(value || "");
      if (!html.trim()) return "";
      try {
        var root = document.createElement("div");
        root.innerHTML = html;
        var allowed = {
          B: true, STRONG: true, I: true, EM: true, U: true, S: true,
          STRIKE: true, DIV: true, P: true, BR: true, UL: true, OL: true,
          LI: true, SPAN: true, FONT: true, BLOCKQUOTE: true
        };
        Array.from(root.querySelectorAll("*")).forEach(function (node) {
          var el:any = node;
          var tag = String(el.tagName || "").toUpperCase();
          if (!allowed[tag]) {
            var parent = el.parentNode;
            if (!parent) return;
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
            return;
          }
          var color = String(el.getAttribute("color") || el.style.color || "").trim();
          var textAlign = String(el.style.textAlign || "").trim();
          var fontWeight = String(el.style.fontWeight || "").trim();
          var fontStyle = String(el.style.fontStyle || "").trim();
          var textDecoration = String(el.style.textDecoration || el.style.textDecorationLine || "").trim();
          Array.from(el.attributes || []).forEach(function (attr:any) {
            el.removeAttribute(attr.name);
          });
          var safeStyles = [];
          if (color && !/expression|url\s*\(|javascript:/i.test(color)) safeStyles.push("color:" + color);
          if (/^(left|center|right|justify)$/i.test(textAlign)) safeStyles.push("text-align:" + textAlign.toLowerCase());
          if (/^(bold|bolder|[5-9]00)$/i.test(fontWeight)) safeStyles.push("font-weight:" + fontWeight);
          if (/^(italic|oblique)$/i.test(fontStyle)) safeStyles.push("font-style:" + fontStyle);
          if (/^(underline|line-through|underline line-through|line-through underline)$/i.test(textDecoration)) safeStyles.push("text-decoration:" + textDecoration);
          if (safeStyles.length) el.setAttribute("style", safeStyles.join(";"));
        });
        return root.innerHTML;
      } catch (e) {
        return plainTextToNoteHtml(html.replace(/<[^>]*>/g, ""));
      }
    }
    function noteHtmlToPlainText(value) {
      var html = sanitizeNoteHtml(value);
      if (!html) return "";
      try {
        var root = document.createElement("div");
        root.innerHTML = html;
        return String(root.innerText || root.textContent || "")
          .replace(/\u00a0/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      } catch (e) {
        return String(html).replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, "").trim();
      }
    }
    var emptyBankForm = { bank: "", holder: "", iban: "", bic: "", note: "" };
    var emptyCreditCardForm = {
      name: "",
      issuer: "",
      holder: "",
      number: "",
      expiry: "",
      cvv: "",
      note: "",
    };
    var noteDraft = readAppuntiDraft("draft_appunto_testo_v1", {
      noteTitle: "",
      noteText: "",
      noteHtml: "",
      editingNoteId: null,
    });
    var bankDraft = readAppuntiDraft("draft_coordinate_bancarie_v1", {
      bankForm: emptyBankForm,
      editingBankId: null,
    });
    var creditCardDraft = readAppuntiDraft("draft_carta_credito_v1", {
      creditCardForm: emptyCreditCardForm,
      editingCreditCardId: null,
    });
    var [noteTitle, setNoteTitle] = useState(String(noteDraft.noteTitle || ""));
    var [noteText, setNoteText] = useState(String(noteDraft.noteText || ""));
    var [noteHtml, setNoteHtml] = useState(
      sanitizeNoteHtml(noteDraft.noteHtml || plainTextToNoteHtml(noteDraft.noteText || ""))
    );
    var [noteTextColor, setNoteTextColor] = useState("#7F77DD");
    var [editingNoteId, setEditingNoteId] = useState(
      noteDraft.editingNoteId || null
    );
    var [showNoteForm, setShowNoteForm] = useState(
      !!noteDraft.editingNoteId ||
        !!String(noteDraft.noteTitle || "").trim() ||
        !!String(noteDraft.noteText || "").trim()
    );
    var [bankForm, setBankForm] = useState({
      ...emptyBankForm,
      ...(bankDraft.bankForm || {}),
    });
    var [editingBankId, setEditingBankId] = useState(
      bankDraft.editingBankId || null
    );
    var [showBankForm, setShowBankForm] = useState(
      !!bankDraft.editingBankId ||
        Object.keys(bankDraft.bankForm || {}).some(function (k) {
          return !!String((bankDraft.bankForm || {})[k] || "").trim();
        })
    );
    var [creditCardForm, setCreditCardForm] = useState({
      ...emptyCreditCardForm,
      ...(creditCardDraft.creditCardForm || {}),
    });
    var [editingCreditCardId, setEditingCreditCardId] = useState(
      creditCardDraft.editingCreditCardId || null
    );
    var [showCreditCardForm, setShowCreditCardForm] = useState(
      !!creditCardDraft.editingCreditCardId ||
        Object.keys(creditCardDraft.creditCardForm || {}).some(function (k) {
          return !!String((creditCardDraft.creditCardForm || {})[k] || "").trim();
        })
    );
    var noteFormValid =
      !!String(noteTitle || "").trim() || !!String(noteText || "").trim();
    var bankFormValid =
      !!String((bankForm || {}).iban || "").trim() ||
      !!String((bankForm || {}).bank || "").trim();
    var creditCardFormValid =
      !!String((creditCardForm || {}).name || "").trim() ||
      String((creditCardForm || {}).number || "").replace(/\D/g, "").length > 0;
    var [editingDocumentId, setEditingDocumentId] = useState(null);
    var [documentNameDraft, setDocumentNameDraft] = useState("");
    var fileInputRef = useRef(null);
    var noteEditorRef = useRef(null);
    var noteSelectionRef = useRef(null);
    var [showNoteIcons, setShowNoteIcons] = useState(false);
    useEffect(
      function () {
        try {
          var has =
            !!editingNoteId ||
            String(noteTitle || "").trim() ||
            String(noteText || "").trim();
          if (has)
            localStorage.setItem(
              appuntiDraftKey("draft_appunto_testo_v1"),
              JSON.stringify({
                noteTitle: noteTitle,
                noteText: noteText,
                noteHtml: sanitizeNoteHtml(noteHtml),
                editingNoteId: editingNoteId,
                updatedAt: new Date().toISOString(),
              })
            );
          else localStorage.removeItem(appuntiDraftKey("draft_appunto_testo_v1"));
        } catch (e) {}
      },
      [noteTitle, noteText, noteHtml, editingNoteId]
    );
    useEffect(
      function () {
        try {
          var bf = bankForm || {};
          var has =
            !!editingBankId ||
            String(bf.bank || "").trim() ||
            String(bf.holder || "").trim() ||
            String(bf.iban || "").trim() ||
            String(bf.bic || "").trim() ||
            String(bf.note || "").trim();
          if (has)
            localStorage.setItem(
              appuntiDraftKey("draft_coordinate_bancarie_v1"),
              JSON.stringify({
                bankForm: { ...emptyBankForm, ...bf },
                editingBankId: editingBankId,
                updatedAt: new Date().toISOString(),
              })
            );
          else
            localStorage.removeItem(
              appuntiDraftKey("draft_coordinate_bancarie_v1")
            );
        } catch (e) {}
      },
      [bankForm, editingBankId]
    );
    useEffect(
      function () {
        try {
          var cf = creditCardForm || {};
          var has =
            !!editingCreditCardId ||
            String(cf.name || "").trim() ||
            String(cf.issuer || "").trim() ||
            String(cf.holder || "").trim() ||
            String(cf.number || "").trim() ||
            String(cf.expiry || "").trim() ||
            String(cf.cvv || "").trim() ||
            String(cf.note || "").trim();
          if (has)
            localStorage.setItem(
              appuntiDraftKey("draft_carta_credito_v1"),
              JSON.stringify({
                creditCardForm: { ...emptyCreditCardForm, ...cf },
                editingCreditCardId: editingCreditCardId,
                updatedAt: new Date().toISOString(),
              })
            );
          else localStorage.removeItem(appuntiDraftKey("draft_carta_credito_v1"));
        } catch (e) {}
      },
      [creditCardForm, editingCreditCardId]
    );
    var sinp = {
      width: "100%",
      borderRadius: 8,
      border: "1px solid " + (dark ? "#444" : "#ddd"),
      padding: "8px 10px",
      fontSize: 14,
      background: dark ? "#2a2a3e" : "#fff",
      color: dark ? "#eee" : "#333",
      boxSizing: "border-box",
    };
    function normalizeDocumentExtension(value) {
      var ext = String(value || "").trim();
      if (!ext) return "";
      if (ext.charAt(0) !== ".") ext = "." + ext;
      return ext.toLowerCase();
    }
    function extensionFromMimeType(type) {
      var t = String(type || "").toLowerCase();
      var map = {
        "application/pdf": ".pdf",
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "text/csv": ".csv",
        "text/plain": ".txt",
        "application/json": ".json",
        "application/xml": ".xml",
        "text/xml": ".xml",
        "application/rtf": ".rtf",
        "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
        "application/vnd.ms-excel": ".xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
        "application/vnd.oasis.opendocument.spreadsheet": ".ods",
        "application/vnd.oasis.opendocument.text": ".odt",
      };
      return map[t] || "";
    }
    function splitDocumentFileName(fileName, mimeType) {
      var raw = String(fileName || "").trim();
      var match = raw.match(/(\.[A-Za-z0-9]{1,10})$/);
      var extension = match ? normalizeDocumentExtension(match[1]) : extensionFromMimeType(mimeType);
      var name = match ? raw.slice(0, -match[1].length) : raw;
      name = name.trim() || "Documento";
      return { name: name, extension: extension };
    }
    function documentExtension(d) {
      if (!d) return "";
      var stored = normalizeDocumentExtension(d.extension || d.ext || "");
      if (stored) return stored;
      var source = String(d.originalName || d.fileName || d.name || "");
      var parsed = splitDocumentFileName(source, d.type || "");
      return parsed.extension || extensionFromMimeType(d.type || "");
    }
    function documentBaseName(d) {
      if (!d) return "Documento";
      if (String(d.baseName || "").trim()) return String(d.baseName).trim();
      var raw = String(d.name || d.originalName || d.fileName || "Documento").trim();
      var ext = documentExtension(d);
      if (ext && raw.toLowerCase().endsWith(ext.toLowerCase())) raw = raw.slice(0, -ext.length);
      return raw.trim() || "Documento";
    }
    function documentFullName(d) {
      var base = documentBaseName(d);
      var ext = documentExtension(d);
      return base + ext;
    }
    function normalizeDocumentBaseNameInput(value, extension) {
      var name = String(value || "").trim();
      var supportedExt = /\.(pdf|png|jpe?g|webp|gif|xlsx?|csv|docx?|rtf|txt|json|xml|ods|odt)$/i;
      name = name.replace(supportedExt, "").trim();
      var originalExt = normalizeDocumentExtension(extension);
      if (originalExt && name.toLowerCase().endsWith(originalExt.toLowerCase())) name = name.slice(0, -originalExt.length).trim();
      return name;
    }
    function moveDocument(documentId, direction) {
      setAppuntiDocuments(function (items) {
        var list = (items || []).slice();
        var from = list.findIndex(function (d) { return d.id === documentId; });
        if (from < 0) return list;
        var to = from + direction;
        if (to < 0 || to >= list.length) return list;
        var temp = list[from];
        list[from] = list[to];
        list[to] = temp;
        return list;
      });
    }
    function handleFiles(ev) {
      var files = Array.from((ev.target && ev.target.files) || []);
      if (!files.length) return;
      if (
        !canAddPlanItem(
          "documents",
          (appuntiDocuments || []).length,
          files.length
        )
      ) {
        showPlanLimitWarning("documents", (appuntiDocuments || []).length);
        ev.target.value = "";
        return;
      }
      files.forEach(function (file) {
        var allowed =
          /pdf|image|spreadsheet|excel|sheet|csv|officedocument|word|text|json|xml|rtf|opendocument/i.test(
            file.type
          ) ||
          /\.(pdf|png|jpe?g|webp|gif|xlsx?|csv|docx?|rtf|txt|json|xml|ods|odt)$/i.test(
            file.name
          );
        if (!allowed) {
          setToast("Formato non supportato");
          return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
          var parsedName = splitDocumentFileName(file.name, file.type);
          setAppuntiDocuments(function (p) {
            return [
              {
                id: Date.now() + Math.random(),
                name: parsedName.name,
                extension: parsedName.extension,
                originalName: file.name,
                type: file.type || "file",
                size: file.size,
                createdAt: new Date().toISOString(),
                dataUrl: e.target.result,
              },
              ...p,
            ];
          });
          setToast("Documento caricato");
        };
        reader.readAsDataURL(file);
      });
      ev.target.value = "";
    }
    function formatCardExpiry(value) {
      var digits = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 4);
      if (digits.length <= 2) return digits;
      return digits.slice(0, 2) + " / " + digits.slice(2);
    }
    async function copyAppuntiContent(value, label) {
      var text = String(value || "");
      if (!text.trim()) return;
      try {
        var cap = typeof window !== "undefined" ? window.Capacitor : null;
        var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
        if (native && FainanceFileNative && FainanceFileNative.copyText) {
          await FainanceFileNative.copyText({ text: text });
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          var area = document.createElement("textarea");
          area.value = text;
          area.style.position = "fixed";
          area.style.left = "-9999px";
          area.style.top = "0";
          area.setAttribute("readonly", "");
          document.body.appendChild(area);
          area.focus();
          area.select();
          var copied = document.execCommand("copy");
          document.body.removeChild(area);
          if (!copied) throw new Error("Copia non riuscita");
        }
        setToast((label || "Contenuto") + " copiato integralmente");
      } catch (e) {
        setToast("Non riesco a copiare il contenuto");
      }
    }
    function noteTitleText(n) {
      return String((n && (n.title || n.name || n.subject)) || "Appunto").trim() || "Appunto";
    }
    function noteBodyText(n) {
      var values = n ? [n.text, n.content, n.body, n.note, n.description] : [];
      for (var i = 0; i < values.length; i++) {
        var value = String(values[i] == null ? "" : values[i]);
        if (value.trim()) return value;
      }
      return "";
    }
    function noteCopyText(n) {
      var title = noteTitleText(n);
      var rawValues = n ? [n.text, n.content, n.body, n.note, n.description] : [];
      var parts = [];
      rawValues.forEach(function(value) {
        var text = String(value == null ? "" : value).trim();
        if (!text || text === title || parts.indexOf(text) >= 0) return;
        parts.push(text);
      });
      return [title].concat(parts).filter(function(v){return String(v||"").trim();}).join("\n");
    }
    function stripLeadingDecorativeIcons(value) {
      var text = String(value || "").trim();
      if (!text) return "";
      // Rimuove in modo deterministico tutte le icone/simboli iniziali già
      // presenti nelle traduzioni. L'icona della scheda viene renderizzata
      // separatamente una sola volta.
      text = text.replace(/^(?:(?:📝|📥|📤|🗑️?|💾|📄|🏦|💳)\s*)+/g, "");
      try {
        var chars = Array.from(text);
        var firstTextIndex = chars.findIndex(function (ch) {
          return /[\p{L}\p{N}]/u.test(ch);
        });
        if (firstTextIndex > 0) text = chars.slice(firstTextIndex).join("");
      } catch (e) {
        text = text.replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ0-9]+/, "");
      }
      return text.trim();
    }
    function plainAppuntiTextLabel() {
      // Non passare dal vecchio dizionario che contiene anche l'emoji: l'icona
      // viene già renderizzata separatamente dalla scheda.
      var labels = {
        it: "Appunti di testo",
        en: "Text notes",
        es: "Notas de texto",
        fr: "Notes de texte",
        de: "Textnotizen",
        pt: "Notas de texto",
        pl: "Notatki tekstowe",
        nl: "Tekstnotities",
        ro: "Note text",
        el: "Σημειώσεις κειμένου",
      };
      var key = String(lang || "it").split("-")[0];
      return labels[key] || labels.it;
    }
    function ibanMod97(compact) {
      var value = String(compact || "").toUpperCase();
      if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(value)) return false;
      var rearranged = value.slice(4) + value.slice(0, 4);
      var remainder = 0;
      for (var i = 0; i < rearranged.length; i++) {
        var ch = rearranged.charAt(i);
        var numeric = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
        for (var j = 0; j < numeric.length; j++) remainder = (remainder * 10 + Number(numeric.charAt(j))) % 97;
      }
      return remainder === 1;
    }
    function extractIbanCompact(value) {
      var raw = String(value || "").toUpperCase();
      if (!raw) return "";
      var countryLengths = {AL:28,AD:24,AT:20,AZ:28,BH:22,BE:16,BA:20,BR:29,BG:22,CR:22,HR:21,CY:28,CZ:24,DK:18,DO:28,EE:20,FO:18,FI:18,FR:27,GE:22,DE:22,GI:23,GR:27,GL:18,GT:28,HU:28,IS:26,IE:22,IL:23,IT:27,JO:30,KZ:20,XK:20,KW:30,LV:21,LB:28,LI:21,LT:20,LU:20,MT:31,MR:27,MU:30,MC:27,MD:24,ME:22,NL:18,MK:19,NO:15,PK:24,PS:29,PL:28,PT:25,QA:29,RO:24,SM:27,SA:24,RS:22,SK:24,SI:19,ES:24,SE:24,CH:21,TN:24,TR:26,AE:23,GB:22,VA:22};
      var startRegex = /[A-Z]{2}\s*\d{2}/g;
      var match;
      while ((match = startRegex.exec(raw))) {
        var collected = "";
        for (var pos = match.index; pos < raw.length && collected.length < 34; pos++) {
          var ch = raw.charAt(pos);
          if (/[A-Z0-9]/.test(ch)) collected += ch;
          else if (/\s|[-.]/.test(ch)) continue;
          else if (collected.length >= 4) break;
        }
        var expected = countryLengths[collected.slice(0, 2)];
        if (expected && collected.length >= expected) {
          var exact = collected.slice(0, expected);
          if (ibanMod97(exact)) return exact;
        }
        for (var length = 15; length <= Math.min(34, collected.length); length++) {
          var candidate = collected.slice(0, length);
          if (ibanMod97(candidate)) return candidate;
        }
      }
      return "";
    }
    function formatIban(compact) {
      return String(compact || "").replace(/(.{4})/g, "$1 ").trim();
    }
    function cleanStoredIban(value) {
      return formatIban(extractIbanCompact(value));
    }
    function effectiveBankIban(b) {
      if (!b) return "";
      var source = [b.iban, b.note, b.bank, b.holder]
        .filter(Boolean)
        .map(removeBankPlaceholderText)
        .join(" ");
      return cleanStoredIban(source);
    }
    function removeExactIban(text, ibanValue) {
      var compact = extractIbanCompact(ibanValue || text);
      if (!compact) return String(text || "");
      var pattern = compact.split("").map(function (ch) { return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("[\\s\\-.]*");
      try { return String(text || "").replace(new RegExp("(?:IBAN\\s*:?\\s*)?" + pattern, "gi"), " "); }
      catch (e) { return String(text || ""); }
    }
    function removeBankPlaceholderText(value) {
      var text = String(value == null ? "" : value).replace(/\u00a0/g, " ");
      // Testo guida erroneamente persistito da versioni precedenti. La regex è
      // volutamente tollerante a apostrofi, ritorni a capo e punteggiatura.
      var patterns = [
        /Mostra\s+il\s+contenuto\s+di\s+una\s+nota\s+oppure\s+l\s*[’'`]?[\s-]*IBAN\s+selezionato\s*[.!:;,-]*/giu,
        /Muestra\s+el\s+contenido\s+de\s+una\s+nota\s+o\s+el\s+IBAN\s+seleccionado\s*[.!:;,-]*/giu,
        /Shows\s+the\s+content\s+of\s+a\s+note\s+or\s+the\s+selected\s+IBAN\s*[.!:;,-]*/giu,
        /Affiche\s+le\s+contenu\s+d[’'`]une\s+note\s+ou\s+l[’'`]IBAN\s+sélectionné\s*[.!:;,-]*/giu,
      ];
      patterns.forEach(function (pattern) { text = text.replace(pattern, " "); });
      // Protezione aggiuntiva per le varianti corrotte presenti nei backup più vecchi.
      text = text.replace(/Mostra[\s\S]{0,220}?(?:IBAN\s+)?selezionato\s*[.!:;,-]*/giu, " ");
      return text;
    }
    function cleanBankNote(value, ibanValue) {
      var text = removeBankPlaceholderText(value);
      text = removeExactIban(text, ibanValue || text);
      // L'IBAN deve comparire solo nella riga dedicata, mai nelle note.
      text = text.replace(/(?:IBAN\s*:?\s*)?[A-Z]{2}\s*\d{2}(?:[\s.\-]*[A-Z0-9]){11,30}/gi, " ");
      text = text.replace(/^(?:IBAN|Note?)\s*:\s*/i, "");
      return text
        .replace(/[\t ]{2,}/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, "");
    }
    function bankNoteForDisplay(b) {
      var cleaned = cleanBankNote((b && b.note) || "", effectiveBankIban(b));
      return /Mostra\s+il\s+contenuto/i.test(cleaned) ? "" : cleaned;
    }
    function bankCopyText(b) {
      var iban = effectiveBankIban(b);
      var note = cleanBankNote(b && b.note, iban);
      return [
        b && b.bank ? "Banca: " + b.bank : "",
        b && b.holder ? "Intestatario: " + b.holder : "",
        iban ? "IBAN: " + iban : "",
        b && b.bic ? "BIC/SWIFT: " + b.bic : "",
        note,
      ]
        .filter(Boolean)
        .join("\n");
    }
    function cardCopyText(c) {
      return [
        c && c.name ? "Carta: " + c.name : "",
        c && c.issuer ? "Emittente: " + c.issuer : "",
        c && c.holder ? "Intestatario: " + c.holder : "",
        c && c.number ? "Numero: " + c.number : "",
        c && c.expiry ? "Scadenza: " + c.expiry : "",
        c && c.cvv ? "CVV/CVC: " + c.cvv : "",
        c && c.note ? c.note : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    async function openAppuntiDocument(d) {
      if (!d || !d.dataUrl) return;
      try {
        var cap = typeof window !== "undefined" ? window.Capacitor : null;
        var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
        if (native && FainanceFileNative && FainanceFileNative.openFile) {
          await FainanceFileNative.openFile({
            dataUrl: d.dataUrl,
            fileName: documentFullName(d) || "documento",
            mimeType: d.type || "application/octet-stream",
          });
          return;
        }
        var link = document.createElement("a");
        link.href = d.dataUrl;
        link.download = documentFullName(d) || "documento";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        setToast("Nessuna app disponibile per aprire questo documento");
      }
    }
    function syncNoteEditorState() {
      var editor = noteEditorRef.current;
      if (!editor) return;
      var safeHtml = sanitizeNoteHtml(editor.innerHTML);
      setNoteHtml(safeHtml);
      setNoteText(noteHtmlToPlainText(safeHtml));
    }
    function rememberNoteSelection() {
      try {
        var editor = noteEditorRef.current;
        var selection = window.getSelection && window.getSelection();
        if (!editor || !selection || !selection.rangeCount) return;
        var range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer))
          noteSelectionRef.current = range.cloneRange();
      } catch (e) {}
    }
    function restoreNoteSelection() {
      try {
        var editor = noteEditorRef.current;
        if (!editor) return;
        editor.focus();
        var selection = window.getSelection && window.getSelection();
        if (!selection) return;
        selection.removeAllRanges();
        if (noteSelectionRef.current) selection.addRange(noteSelectionRef.current);
        else {
          var range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
          selection.addRange(range);
        }
      } catch (e) {}
    }
    function runNoteCommand(command, value = "") {
      restoreNoteSelection();
      try { document.execCommand("styleWithCSS", false, "true"); } catch (e) {}
      try { document.execCommand(command, false, value == null ? "" : String(value)); } catch (e) {}
      rememberNoteSelection();
      syncNoteEditorState();
    }
    function insertNoteIcon(icon) {
      restoreNoteSelection();
      try { document.execCommand("insertText", false, String(icon || "")); } catch (e) {}
      rememberNoteSelection();
      syncNoteEditorState();
    }
    function noteToolButton(label, title, command, value = "", extraStyle:any = {}) {
      return (
        <button
          type="button"
          title={L(title)}
          aria-label={L(title)}
          onMouseDown={function (e) {
            e.preventDefault();
            rememberNoteSelection();
          }}
          onClick={function () { runNoteCommand(command, value); }}
          style={{
            width: 42,
            height: 38,
            border: "1px solid " + (dark ? "#4A4A60" : "#D9DCE5"),
            background: dark ? "#29293D" : "#fff",
            color: textC,
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 900,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            ...extraStyle,
          }}
        >
          {label}
        </button>
      );
    }
    useEffect(
      function () {
        if (!showNoteForm || !noteEditorRef.current) return;
        var desired = sanitizeNoteHtml(noteHtml || plainTextToNoteHtml(noteText || ""));
        if (noteEditorRef.current.innerHTML !== desired)
          noteEditorRef.current.innerHTML = desired;
      },
      [showNoteForm, editingNoteId]
    );
    function clearNoteDraft() {
      try {
        localStorage.removeItem(appuntiDraftKey("draft_appunto_testo_v1"));
      } catch (e) {}
    }
    function clearBankDraft() {
      try {
        localStorage.removeItem(appuntiDraftKey("draft_coordinate_bancarie_v1"));
      } catch (e) {}
    }
    function clearCreditCardDraft() {
      try {
        localStorage.removeItem(appuntiDraftKey("draft_carta_credito_v1"));
      } catch (e) {}
    }
    function sensitiveCount() {
      return (bankCoords || []).length + (creditCards || []).length;
    }
    function showPlanLimitWarning(feature, currentCount, customText) {
      setToast({
        text: customText || upgradeMessage(feature, currentCount),
        type: "warning",
        color: "#FFF3CD",
        textColor: "#856404",
        icon: "⚠️",
      });
    }
    function maskCardNumber(n) {
      var clean = String(n || "").replace(/\D/g, "");
      if (!clean) return "—";
      if (clean.length <= 4) return clean;
      return "•••• •••• •••• " + clean.slice(-4);
    }
    function openNewNote() {
      if (!canAddPlanItem("notes", (appuntiNotes || []).length, 1)) {
        showPlanLimitWarning("notes", (appuntiNotes || []).length);
        return;
      }
      setEditingNoteId(null);
      setNoteTitle("");
      setNoteText("");
      setNoteHtml("");
      setShowNoteIcons(false);
      noteSelectionRef.current = null;
      setShowNoteForm(true);
    }
    function sensitiveLimitMessage() {
      return L("Hai raggiunto il limite complessivo di coordinate bancarie e carte di credito del tuo piano. Puoi modificare o eliminare gli elementi già salvati.");
    }
    function openNewBank() {
      if (!canAddPlanItem("bankNotes", sensitiveCount(), 1)) {
        showPlanLimitWarning("bankNotes", sensitiveCount(), sensitiveLimitMessage());
        return;
      }
      setEditingBankId(null);
      setBankForm({ ...emptyBankForm });
      setShowBankForm(true);
    }
    function openNewCreditCard() {
      if (!canAddPlanItem("bankNotes", sensitiveCount(), 1)) {
        showPlanLimitWarning("bankNotes", sensitiveCount(), sensitiveLimitMessage());
        return;
      }
      setEditingCreditCardId(null);
      setCreditCardForm({ ...emptyCreditCardForm });
      setShowCreditCardForm(true);
    }
    function saveNote() {
      var safeHtml = sanitizeNoteHtml(
        noteEditorRef.current ? noteEditorRef.current.innerHTML : noteHtml
      );
      var plainText = noteHtmlToPlainText(safeHtml);
      if (!noteTitle.trim() && !plainText.trim()) return;
      if (
        !editingNoteId &&
        !canAddPlanItem("notes", (appuntiNotes || []).length, 1)
      ) {
        setToast({
          text: upgradeMessage("notes", (appuntiNotes || []).length),
          type: "error",
          color: "#E24B4A",
          icon: "🚫",
        });
        return;
      }
      if (editingNoteId) {
        setAppuntiNotes(function (p) {
          return p.map(function (n) {
            return n.id === editingNoteId
              ? {
                  ...n,
                  title: noteTitle.trim() || "Appunto",
                  text: plainText,
                  html: safeHtml,
                  updatedAt: new Date().toISOString(),
                }
              : n;
          });
        });
        setToast("Appunto modificato");
      } else {
        setAppuntiNotes(function (p) {
          return [
            {
              id: Date.now(),
              title: noteTitle.trim() || "Appunto",
              text: plainText,
              html: safeHtml,
              createdAt: new Date().toISOString(),
            },
            ...p,
          ];
        });
        setToast("Appunto salvato");
      }
      clearNoteDraft();
      setEditingNoteId(null);
      setNoteTitle("");
      setNoteText("");
      setNoteHtml("");
      setShowNoteIcons(false);
      noteSelectionRef.current = null;
      setShowNoteForm(false);
    }
    function editNote(n) {
      var existingHtml = sanitizeNoteHtml(n.html || plainTextToNoteHtml(n.text || ""));
      setEditingNoteId(n.id);
      setNoteTitle(n.title || "");
      setNoteText(n.text || noteHtmlToPlainText(existingHtml));
      setNoteHtml(existingHtml);
      setShowNoteIcons(false);
      noteSelectionRef.current = null;
      setShowNoteForm(true);
    }
    function cancelNoteEdit() {
      clearNoteDraft();
      setEditingNoteId(null);
      setNoteTitle("");
      setNoteText("");
      setNoteHtml("");
      setShowNoteIcons(false);
      noteSelectionRef.current = null;
      setShowNoteForm(false);
    }
    function saveBank() {
      if (
        !String(bankForm.iban || "").trim() &&
        !String(bankForm.bank || "").trim()
      )
        return;
      if (!editingBankId && !canAddPlanItem("bankNotes", sensitiveCount(), 1)) {
        setToast({
          text: upgradeMessage("bankNotes", sensitiveCount()),
          type: "error",
          color: "#E24B4A",
          icon: "🚫",
        });
        return;
      }
      var cleanedIban = cleanStoredIban(bankForm.iban).replace(/\s+/g, "");
      var cleanedBankForm = { ...bankForm, iban: cleanedIban, note: cleanBankNote(bankForm.note, cleanedIban) };
      if (editingBankId) {
        setBankCoords(function (p) {
          return p.map(function (b) {
            return b.id === editingBankId
              ? { ...b, ...cleanedBankForm, updatedAt: new Date().toISOString() }
              : b;
          });
        });
        setToast("Coordinate bancarie aggiornate");
      } else {
        setBankCoords(function (p) {
          return [
            { ...cleanedBankForm, id: Date.now(), createdAt: new Date().toISOString() },
            ...p,
          ];
        });
        setToast("Coordinate bancarie salvate");
      }
      clearBankDraft();
      setEditingBankId(null);
      setBankForm({ ...emptyBankForm });
      setShowBankForm(false);
    }
    function editBank(b) {
      try {
        if (!b || !b.id) return;
        setEditingBankId(b.id);
        setBankForm({
          bank: b.bank || "",
          holder: b.holder || "",
          iban: cleanStoredIban(b.iban).replace(/\s+/g, ""),
          bic: b.bic || "",
          note: b.note || "",
        });
        setShowBankForm(true);
      } catch (e) {
        setToast("Errore modifica coordinata bancaria");
      }
    }
    function cancelBankEdit() {
      clearBankDraft();
      setEditingBankId(null);
      setBankForm({ ...emptyBankForm });
      setShowBankForm(false);
    }
    function saveCreditCard() {
      var cf = creditCardForm || {};
      var cleanNumber = String(cf.number || "").replace(/\D/g, "");
      if (!String(cf.name || "").trim() && !cleanNumber) return;
      if (
        !editingCreditCardId &&
        !canAddPlanItem("bankNotes", sensitiveCount(), 1)
      ) {
        setToast({
          text: upgradeMessage("bankNotes", sensitiveCount()),
          type: "error",
          color: "#E24B4A",
          icon: "🚫",
        });
        return;
      }
      var payload = {
        ...cf,
        number: cleanNumber.slice(0, 19),
        expiry: formatCardExpiry(cf.expiry),
        cvv: String(cf.cvv || "")
          .replace(/\D/g, "")
          .slice(0, 4),
        updatedAt: new Date().toISOString(),
      };
      if (editingCreditCardId) {
        setCreditCards(function (p) {
          return (p || []).map(function (c) {
            return c.id === editingCreditCardId ? { ...c, ...payload } : c;
          });
        });
        setToast("Carta di credito aggiornata");
      } else {
        setCreditCards(function (p) {
          return [
            { ...payload, id: Date.now(), createdAt: new Date().toISOString() },
            ...(p || []),
          ];
        });
        setToast("Carta di credito salvata");
      }
      clearCreditCardDraft();
      setEditingCreditCardId(null);
      setCreditCardForm({ ...emptyCreditCardForm });
      setShowCreditCardForm(false);
    }
    function editCreditCard(c) {
      try {
        if (!c || !c.id) return;
        setEditingCreditCardId(c.id);
        setCreditCardForm({
          name: c.name || "",
          issuer: c.issuer || "",
          holder: c.holder || "",
          number: c.number || "",
          expiry: c.expiry || "",
          cvv: c.cvv || "",
          note: c.note || "",
        });
        setShowCreditCardForm(true);
      } catch (e) {
        setToast("Errore modifica carta di credito");
      }
    }
    function cancelCreditCardEdit() {
      clearCreditCardDraft();
      setEditingCreditCardId(null);
      setCreditCardForm({ ...emptyCreditCardForm });
      setShowCreditCardForm(false);
    }
    function editDocument(d) {
      setEditingDocumentId(d.id);
      setDocumentNameDraft(documentBaseName(d));
    }
    function cancelDocumentEdit() {
      setEditingDocumentId(null);
      setDocumentNameDraft("");
    }
    var documentEditFormValid =
      !!editingDocumentId && !!String(documentNameDraft || "").trim();
    function saveDocumentEdit() {
      if (!documentEditFormValid) return;
      setAppuntiDocuments(function (p) {
        return (p || []).map(function (d) {
          if (d.id !== editingDocumentId) return d;
          var extension = documentExtension(d);
          var name = normalizeDocumentBaseNameInput(documentNameDraft, extension) || "Documento";
          return {
            ...d,
            name: name,
            extension: extension,
            originalName: d.originalName || documentFullName(d),
            updatedAt: new Date().toISOString(),
          };
        });
      });
      setEditingDocumentId(null);
      setDocumentNameDraft("");
      setToast("Documento modificato correttamente");
    }
    function fmtSize(n) {
      if (!n) return "";
      if (n < 1024) return n + " B";
      if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
      return (n / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
    }
    var documentsUnavailable = getPlanLimit("documents") === 0;
    var notesLimitReached =
      !canAddPlanItem("notes", (appuntiNotes || []).length, 1);
    var sensitiveLimitReached =
      !canAddPlanItem("bankNotes", sensitiveCount(), 1);
    var bankLimitReached = sensitiveLimitReached;
    var creditCardLimitReached = sensitiveLimitReached;
    var documentsLimitReached =
      !canAddPlanItem("documents", (appuntiDocuments || []).length, 1);
    function LimitReachedBox() {
      return (
        <div
          style={{
            background: dark ? "#4b3d1b" : "#FFF3CD",
            border: "1px solid " + (dark ? "#80672a" : "#FFD54F"),
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 12,
            color: dark ? "#FFE5A6" : "#856404",
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
      );
    }
    function appuntiModal(title, onClose, children) {
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            zIndex: 850,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "17vh 16px 3vh",
          }}
          onClick={onClose}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "88vh",
              overflowY: "auto",
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 22,
              boxShadow: "0 18px 60px rgba(0,0,0,.34)",
              padding: 18,
            }}
            onClick={function (e) {
              e.stopPropagation();
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 900, color: textC }}>
                {title}
              </div>
<PopupCloseButton onClick={onClose} dark={dark} label={L("Chiudi")} />
            </div>
            {children}
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            background: documentsUnavailable ? (dark ? "#2B2B36" : "#F3F4F6") : cardBg,
            borderRadius: 14,
            border: "1px solid " + (documentsUnavailable ? (dark ? "#6A5520" : "#FFD54F") : borderC),
            padding: 20,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: textC,
              marginBottom: 4,
            }}
          >
            📎 {L("Documenti")}
          </div>
          <div
            style={{
              fontSize: 12,
              color: subC,
              marginBottom: 12,
            }}
          >
            {L(
              "Carica PDF, immagini, Word, Excel, CSV o file di testo. I documenti si aprono con le app del telefono."
            )}
          </div>
          {documentsUnavailable && (
            <div style={{fontSize:12,color:dark?"#FFE09A":"#856404",background:dark?"#3A3018":"#FFF3CD",border:"1px solid "+(dark?"#6A5520":"#FFD54F"),borderRadius:10,padding:"9px 10px",marginBottom:10,fontWeight:800,lineHeight:1.35}}>
              🔒 {L("Questa funzionalità non è disponibile nel piano Gratuito. Vai in Info per passare a un piano superiore.")}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.xls,.xlsx,.csv,.doc,.docx,.rtf,.txt,.json,.xml,.ods,.odt,image/*,application/pdf"
            style={{ display: "none" }}
            onChange={handleFiles}
          />
          <Btn
            onClick={function () {
              if (documentsLimitReached) {
                showPlanLimitWarning("documents", (appuntiDocuments || []).length);
                return;
              }
              fileInputRef.current && fileInputRef.current.click();
            }}
            bg={documentsLimitReached ? "#999" : "#7F77DD"}
            aria-disabled={documentsLimitReached}
            style={{ marginBottom: 12 }}
          >
            {L("+ Carica documento")}
          </Btn>
          {(!appuntiDocuments || appuntiDocuments.length === 0) && (
            <div
              style={{
                fontSize: 13,
                color: "#bbb",
                padding: "16px 0",
                textAlign: "center",
              }}
            >
              {L("Nessun documento caricato")}
            </div>
          )}
          {(appuntiDocuments || []).map(function (d, documentIndex) {
            var isEditingDoc = editingDocumentId === d.id;
            var docExtension = documentExtension(d);
            var docBaseName = documentBaseName(d);
            return (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: "1px solid " + borderC,
                }}
              >
                <span style={{ fontSize: 20 }}>
                  {/image/i.test(d.type)
                    ? "🖼"
                    : /pdf/i.test(d.type) || /\.pdf$/i.test(documentFullName(d))
                    ? "📄"
                    : "📊"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditingDoc ? (
                    <div
                      style={{ display: "flex", flexDirection: "column", gap: 6 }}
                    >
                      <div style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
                        <input
                          value={documentNameDraft}
                          onChange={function (e) {
                            setDocumentNameDraft(e.target.value);
                          }}
                          style={{ ...sinp, flex: 1, minWidth: 0 }}
                        />
                        {docExtension && (
                          <div
                            title={L("L'estensione del file resta invariata")}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 58,
                              padding: "0 10px",
                              borderRadius: 8,
                              border: "1px solid " + (dark ? "#4A4A60" : "#D9DCE5"),
                              background: dark ? "#252535" : "#F4F5F8",
                              color: subC,
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {docExtension}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn
                          onClick={saveDocumentEdit}
                          disabled={!documentEditFormValid}
                          bg={
                            documentEditFormValid ? confirmButtonColor : "#A8A8A8"
                          }
                          style={{ padding: "6px 10px", fontSize: 12 }}
                        >
                          {L("Salva")}
                        </Btn>
                        <Btn
                          onClick={cancelDocumentEdit}
                          bg={dark ? "#333" : "#f0f0f0"}
                          color={dark ? "#eee" : "#555"}
                          style={{ padding: "6px 10px", fontSize: 12 }}
                        >
                          {L("Annulla")}
                        </Btn>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: textC,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {docBaseName}
                        {docExtension && <span style={{ color: subC, fontWeight: 600 }}>{docExtension}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: subC }}>
                        {fmtSize(d.size)} ·{" "}
                        {d.createdAt
                          ? fmtDate(d.createdAt.slice(0, 10), dateFmt)
                          : ""}
                      </div>
                    </>
                  )}
                </div>
                {!isEditingDoc && d.dataUrl && (
                  <button
                    onClick={function () {
                      openAppuntiDocument(d);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#7F77DD",
                      fontSize: 13,
                    }}
                  >
                    {L("Apri")}
                  </button>
                )}
                {!isEditingDoc && (
                  <button
                    onClick={function () {
                      editDocument(d);
                    }}
                    style={{
                      background: "#EEF4FF",
                      border: "1px solid #BFD7FF",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "#378ADD",
                      fontSize: 14,
                      padding: "5px 8px",
                      fontWeight: 700,
                    }}
                  >
                    ✏️
                  </button>
                )}
                {!isEditingDoc && (
                  <button
                    disabled={documentIndex === 0}
                    onClick={function () { moveDocument(d.id, -1); }}
                    title={L("Sposta su")}
                    style={{
                      background: dark ? "#252535" : "#F7F7FA",
                      border: "1px solid " + borderC,
                      borderRadius: 8,
                      cursor: documentIndex === 0 ? "not-allowed" : "pointer",
                      color: textC,
                      fontSize: 13,
                      padding: "5px 7px",
                      fontWeight: 800,
                      opacity: documentIndex === 0 ? 0.35 : 1,
                    }}
                  >
                    ▲
                  </button>
                )}
                {!isEditingDoc && (
                  <button
                    disabled={documentIndex === (appuntiDocuments || []).length - 1}
                    onClick={function () { moveDocument(d.id, 1); }}
                    title={L("Sposta giù")}
                    style={{
                      background: dark ? "#252535" : "#F7F7FA",
                      border: "1px solid " + borderC,
                      borderRadius: 8,
                      cursor: documentIndex === (appuntiDocuments || []).length - 1 ? "not-allowed" : "pointer",
                      color: textC,
                      fontSize: 13,
                      padding: "5px 7px",
                      fontWeight: 800,
                      opacity: documentIndex === (appuntiDocuments || []).length - 1 ? 0.35 : 1,
                    }}
                  >
                    ▼
                  </button>
                )}
                <button
                  onClick={function () {
                    if (!window.confirm(L("Eliminare questo documento?"))) return;
                    if (editingDocumentId === d.id) cancelDocumentEdit();
                    setAppuntiDocuments(function (p) {
                      return p.filter(function (x) {
                        return x.id !== d.id;
                      });
                    });
                    setToast("Documento eliminato");
                  }}
                  style={{
                    background: "#FFF0F0",
                    border: "1px solid #FFD0D0",
                    borderRadius: 8,
                    cursor: "pointer",
                    color: "#E24B4A",
                    fontSize: 14,
                    padding: "5px 8px",
                    fontWeight: 700,
                  }}
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: "1px solid " + borderC,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div
                data-no-translate="true"
                style={{ fontSize: 14, fontWeight: 800, color: textC, display: "flex", alignItems: "center", gap: 6 }}
              >
                <span aria-hidden="true" style={{ flexShrink: 0 }}>📝</span>
                <span>{plainAppuntiTextLabel()}</span>
              </div>
              <div style={{ fontSize: 12, color: subC, marginTop: 3 }}>
                {(appuntiNotes || []).length} {L((appuntiNotes || []).length===1?"salvato":"salvati")}
              </div>
            </div>
            <Btn
              onClick={openNewNote}
              bg={notesLimitReached ? "#999" : confirmButtonColor}
              aria-disabled={notesLimitReached}
            >
              {L("Nuovo Appunto")}
            </Btn>
          </div>
          
          {(!appuntiNotes || appuntiNotes.length === 0) && (
            <div
              style={{
                fontSize: 13,
                color: "#bbb",
                padding: "12px 0",
                textAlign: "center",
              }}
            >
              {L("Nessun appunto")}
            </div>
          )}
          {(appuntiNotes || []).map(function (n) {
            return (
              <div
                key={n.id}
                onClick={function () {
                  copyAppuntiContent(noteCopyText(n), "Appunto");
                }}
                title={L("Tocca per copiare")}
                style={{
                  background: dark ? "#1e1e30" : "#f9f9f9",
                  cursor: "pointer",
                  borderRadius: 10,
                  border: "1px solid " + borderC,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                >
                  <div data-no-translate="true" style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textC }}>
                      {noteTitleText(n)}
                    </div>
                    {n.html ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: subC,
                          whiteSpace: "normal",
                          marginTop: 4,
                          lineHeight: 1.45,
                          overflowWrap: "anywhere",
                        }}
                        dangerouslySetInnerHTML={{ __html: sanitizeNoteHtml(n.html) }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 12,
                          color: subC,
                          whiteSpace: "pre-wrap",
                          marginTop: 4,
                        }}
                      >
                        {noteBodyText(n)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={function (e) {
                      e.stopPropagation();
                      editNote(n);
                    }}
                    style={{
                      background: "#EEF4FF",
                      border: "1px solid #BFD7FF",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "#378ADD",
                      fontSize: 14,
                      padding: "5px 8px",
                      fontWeight: 700,
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={function (e) {
                      e.stopPropagation();
                      if (!window.confirm(L("Eliminare questa nota?"))) return;
                      if (widget2SelectedNoteId === n.id)
                        setWidget2SelectedNoteId("");
                      setAppuntiNotes(function (p) {
                        return p.filter(function (x) {
                          return x.id !== n.id;
                        });
                      });
                      setToast(L("Nota eliminata"));
                    }}
                    style={{
                      background: "#FFF0F0",
                      border: "1px solid #FFD0D0",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "#E24B4A",
                      fontSize: 14,
                      padding: "5px 8px",
                      fontWeight: 700,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {sensitiveLimitReached && (
          <div
            style={{
              background: dark ? "#4b3d1b" : "#FFF3CD",
              border: "1px solid " + (dark ? "#80672a" : "#FFD54F"),
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 12,
              color: dark ? "#FFE5A6" : "#856404",
              fontWeight: 800,
              lineHeight: 1.4,
            }}
          >
            ⚠️ {sensitiveLimitMessage()}
          </div>
        )}
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: "1px solid " + borderC,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: textC }}>
                🏦 {L("Coordinate bancarie")}
              </div>
              <div style={{ fontSize: 12, color: subC, marginTop: 3 }}>
                {(bankCoords || []).length} {L((bankCoords || []).length===1?"salvata":"salvate")}
              </div>
            </div>
            <Btn
              onClick={openNewBank}
              bg={bankLimitReached ? "#999" : confirmButtonColor}
              aria-disabled={bankLimitReached}
            >
              {L("Nuova Coordinata")}
            </Btn>
          </div>
          
          {(!bankCoords || bankCoords.length === 0) && (
            <div
              style={{
                fontSize: 13,
                color: "#bbb",
                padding: "12px 0",
                textAlign: "center",
              }}
            >
              {L("Nessuna coordinata salvata")}
            </div>
          )}
          {(bankCoords || []).map(function (b) {
            return (
              <div
                key={b.id}
                onClick={function () {
                  copyAppuntiContent(bankCopyText(b), "Coordinata bancaria");
                }}
                title={L("Tocca per copiare")}
                style={{
                  background: dark ? "#1e1e30" : "#f9f9f9",
                  cursor: "pointer",
                  borderRadius: 10,
                  border: "1px solid " + borderC,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                >
                  <div data-no-translate="true" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textC }}>
                      {removeBankPlaceholderText(b.bank || "Banca").trim() || "Banca"}
                    </div>
                    <div style={{ fontSize: 12, color: subC }}>
                      {L("Intestatario")}: {removeBankPlaceholderText(b.holder || "").trim() || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: textC,
                        wordBreak: "break-all",
                        fontWeight: 600,
                      }}
                    >
                      IBAN: {effectiveBankIban(b) || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: subC }}>
                      BIC/SWIFT: {removeBankPlaceholderText(b.bic || "").trim() || "—"}
                    </div>
                    {bankNoteForDisplay(b) && (
                      <div style={{ fontSize: 12, color: subC, marginTop: 4 }}>
                        {bankNoteForDisplay(b)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={function (e) {
                      e.stopPropagation();
                      editBank(b);
                    }}
                    style={{
                      background: "#EEF4FF",
                      border: "1px solid #BFD7FF",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "#378ADD",
                      fontSize: 14,
                      padding: "5px 8px",
                      fontWeight: 700,
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={function (e) {
                      e.stopPropagation();
                      if (
                        !window.confirm(
                          L("Eliminare questa coordinata bancaria?")
                        )
                      )
                        return;
                      if (widget2SelectedBankId === b.id)
                        setWidget2SelectedBankId("");
                      setBankCoords(function (p) {
                        return p.filter(function (x) {
                          return x.id !== b.id;
                        });
                      });
                      setToast("Coordinata bancaria eliminata");
                    }}
                    style={{
                      background: "#FFF0F0",
                      border: "1px solid #FFD0D0",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "#E24B4A",
                      fontSize: 14,
                      padding: "5px 8px",
                      fontWeight: 700,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: "1px solid " + borderC,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: textC }}>
                💳 {L("Carte di credito")}
              </div>
              <div style={{ fontSize: 12, color: subC, marginTop: 3 }}>
                {(creditCards || []).length} {L((creditCards || []).length===1?"salvata":"salvate")}
              </div>
            </div>
            <Btn
              onClick={openNewCreditCard}
              bg={creditCardLimitReached ? "#999" : confirmButtonColor}
              aria-disabled={creditCardLimitReached}
            >
              {L("Nuova Carta")}
            </Btn>
          </div>
          
          {(!creditCards || creditCards.length === 0) && (
            <div
              style={{
                fontSize: 13,
                color: "#bbb",
                padding: "12px 0",
                textAlign: "center",
              }}
            >
              {L("Nessuna carta di credito salvata")}
            </div>
          )}
          {(creditCards || []).map(function (c) {
            return (
              <div
                key={c.id}
                onClick={function () {
                  copyAppuntiContent(cardCopyText(c), "Carta di credito");
                }}
                title={L("Tocca per copiare")}
                style={{
                  background: dark ? "#1e1e30" : "#f9f9f9",
                  cursor: "pointer",
                  borderRadius: 10,
                  border: "1px solid " + borderC,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textC }}>
                      {c.name || c.issuer || L("Carta di credito")}
                    </div>
                    <div style={{ fontSize: 12, color: subC }}>
                      {L("Emittente")}: {c.issuer || "—"}
                    </div>
                    <div style={{ fontSize: 12, color: subC }}>
                      {L("Intestatario")}: {c.holder || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: textC,
                        wordBreak: "break-all",
                        fontWeight: 600,
                      }}
                    >
                      {L("Numero")}: {maskCardNumber(c.number)}
                    </div>
                    <div style={{ fontSize: 12, color: subC }}>
                      {L("Scadenza")}: {c.expiry || "—"}
                    </div>
                    {c.cvv && (
                      <div style={{ fontSize: 12, color: subC }}>
                        CVV/CVC: {c.cvv}
                      </div>
                    )}
                    {c.note && (
                      <div style={{ fontSize: 12, color: subC, marginTop: 4 }}>
                        {c.note}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={function (e) {
                      e.stopPropagation();
                      editCreditCard(c);
                    }}
                    style={{
                      background: "#EEF4FF",
                      border: "1px solid #BFD7FF",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "#378ADD",
                      fontSize: 14,
                      padding: "5px 8px",
                      fontWeight: 700,
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={function (e) {
                      e.stopPropagation();
                      if (
                        !window.confirm(L("Eliminare questa carta di credito?"))
                      )
                        return;
                      if (widget2SelectedCreditCardId === c.id)
                        setWidget2SelectedCreditCardId("");
                      setCreditCards(function (p) {
                        return (p || []).filter(function (x) {
                          return x.id !== c.id;
                        });
                      });
                      setToast("Carta di credito eliminata");
                    }}
                    style={{
                      background: "#FFF0F0",
                      border: "1px solid #FFD0D0",
                      borderRadius: 8,
                      cursor: "pointer",
                      color: "#E24B4A",
                      fontSize: 14,
                      padding: "5px 8px",
                      fontWeight: 700,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {showNoteForm &&
          appuntiModal(
            L(editingNoteId ? "Modifica Appunto" : "Nuovo Appunto"),
            cancelNoteEdit,
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                placeholder={L("Titolo")}
                value={noteTitle}
                onChange={function (e) {
                  setNoteTitle(e.target.value);
                }}
                style={sinp}
              />
              <div
                style={{
                  border: "1px solid " + (dark ? "#45455A" : "#D9DCE5"),
                  borderRadius: 14,
                  overflow: "hidden",
                  background: dark ? "#222235" : "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 7,
                    padding: 9,
                    background: dark ? "#29293D" : "#F7F8FC",
                    borderBottom: "1px solid " + (dark ? "#45455A" : "#E4E6EC"),
                    overflow: "visible",
                  }}
                >
                  {noteToolButton(<b>B</b>, "Grassetto", "bold")}
                  {noteToolButton(<i>I</i>, "Corsivo", "italic")}
                  {noteToolButton(<u>U</u>, "Sottolineato", "underline")}
                  {noteToolButton(<span style={{ textDecoration: "line-through" }}>S</span>, "Barrato", "strikeThrough")}
                  {noteToolButton("•", "Elenco puntato", "insertUnorderedList", null, { fontSize: 22 })}
                  {noteToolButton("1.", "Elenco numerato", "insertOrderedList", null, { fontSize: 13 })}
                  <div
                    title={L("Allineamento")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid " + (dark ? "#4A4A60" : "#D9DCE5"),
                      borderRadius: 10,
                      overflow: "hidden",
                      height: 38,
                      background: dark ? "#29293D" : "#fff",
                    }}
                  >
                    {[
                      ["☰", "justifyLeft", "Allinea a sinistra"],
                      ["≡", "justifyCenter", "Centra"],
                      ["☷", "justifyRight", "Allinea a destra"],
                      ["▤", "justifyFull", "Giustifica"],
                    ].map(function (item, index) {
                      return (
                        <button
                          key={item[1]}
                          type="button"
                          title={L(item[2])}
                          aria-label={L(item[2])}
                          onMouseDown={function (e) {
                            e.preventDefault();
                            rememberNoteSelection();
                          }}
                          onClick={function () { runNoteCommand(item[1]); }}
                          style={{
                            width: 42,
                            height: 38,
                            border: "none",
                            borderLeft: index ? "1px solid " + (dark ? "#4A4A60" : "#E4E6EC") : "none",
                            background: "transparent",
                            color: textC,
                            fontSize: 15,
                            fontWeight: 900,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {item[0]}
                        </button>
                      );
                    })}
                  </div>
                  <div
                    title={L("Colore testo")}
                    onMouseDownCapture={rememberNoteSelection}
                    style={{ width: 42, height: 38, flexShrink: 0 }}
                  >
                    <AppColorSelector
                      value={noteTextColor}
                      onChange={function (color) { setNoteTextColor(color); runNoteCommand("foreColor", color); }}
                      dark={dark}
                      disabled={false}
                      compact={true}
                    />
                  </div>
                  <button
                    type="button"
                    title={L("Icone")}
                    aria-label={L("Icone")}
                    onMouseDown={function (e) {
                      e.preventDefault();
                      rememberNoteSelection();
                    }}
                    onClick={function () { setShowNoteIcons(function (v) { return !v; }); }}
                    style={{
                      width: 42,
                      height: 38,
                      border: "1px solid " + (showNoteIcons ? confirmButtonColor : (dark ? "#4A4A60" : "#D9DCE5")),
                      background: showNoteIcons ? confirmButtonColor + "20" : (dark ? "#29293D" : "#fff"),
                      color: textC,
                      borderRadius: 10,
                      fontSize: 20,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                    }}
                  >
                    ☺
                  </button>
                </div>
                {showNoteIcons && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill,minmax(38px,1fr))",
                      gap: 5,
                      padding: 10,
                      borderBottom: "1px solid " + (dark ? "#45455A" : "#E4E6EC"),
                      background: dark ? "#252538" : "#FBFBFD",
                    }}
                  >
                    {(EMOJI_LIST || []).map(function (icon, index) {
                      return (
                        <button
                          type="button"
                          key={String(icon) + "_" + index}
                          title={String(icon)}
                          onMouseDown={function (e) {
                            e.preventDefault();
                            rememberNoteSelection();
                          }}
                          onClick={function () { insertNoteIcon(icon); }}
                          style={{
                            height: 38,
                            minWidth: 38,
                            border: "1px solid " + (dark ? "#414156" : "#E4E6EC"),
                            borderRadius: 9,
                            background: dark ? "#2D2D43" : "#fff",
                            fontSize: 20,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          {icon}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div style={{ position: "relative" }}>
                  {!noteText.trim() && (
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: 11,
                        color: dark ? "#77778B" : "#9A9DAC",
                        fontSize: 14,
                        pointerEvents: "none",
                      }}
                    >
                      {L("Scrivi un appunto...")}
                    </div>
                  )}
                  <div
                    ref={noteEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    data-no-translate="true"
                    onInput={syncNoteEditorState}
                    onKeyUp={rememberNoteSelection}
                    onMouseUp={rememberNoteSelection}
                    onBlur={rememberNoteSelection}
                    style={{
                      minHeight: 170,
                      maxHeight: 360,
                      overflowY: "auto",
                      padding: "11px 12px",
                      outline: "none",
                      color: textC,
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                    }}
                  />
                </div>
              </div>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <Btn
                  onClick={cancelNoteEdit}
                  bg={dark ? "#333" : "#f0f0f0"}
                  color={dark ? "#eee" : "#555"}
                  style={{}}
                  disabled={false}
                >
                  {L("Annulla")}
                </Btn>
                <Btn
                  onClick={saveNote}
                  disabled={!noteFormValid}
                  bg={noteFormValid ? confirmButtonColor : "#A8A8A8"}
                  color="#fff"
                  style={{}}
                >
                  {L(editingNoteId ? "Aggiorna appunto" : "Salva appunto")}
                </Btn>
              </div>
            </div>
          )}
        {showBankForm &&
          appuntiModal(
            L(editingBankId ? "Modifica Coordinata" : "Nuova Coordinata"),
            cancelBankEdit,
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
              }}
            >
              <input
                placeholder={L("Banca")}
                value={bankForm.bank}
                onChange={function (e) {
                  setBankForm(function (p) {
                    return { ...p, bank: e.target.value };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder={L("Intestatario")}
                value={bankForm.holder}
                onChange={function (e) {
                  setBankForm(function (p) {
                    return { ...p, holder: e.target.value };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder="IBAN"
                value={bankForm.iban}
                onChange={function (e) {
                  setBankForm(function (p) {
                    return { ...p, iban: e.target.value };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder="BIC/SWIFT"
                value={bankForm.bic}
                onChange={function (e) {
                  setBankForm(function (p) {
                    return { ...p, bic: e.target.value };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder={L("Note")}
                value={bankForm.note}
                onChange={function (e) {
                  setBankForm(function (p) {
                    return { ...p, note: e.target.value };
                  });
                }}
                style={{ ...sinp, gridColumn: isMobile ? "auto" : "1 / -1" }}
              />
              <div
                style={{
                  gridColumn: isMobile ? "auto" : "1 / -1",
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                }}
              >
                <Btn
                  onClick={cancelBankEdit}
                  bg={dark ? "#333" : "#f0f0f0"}
                  color={dark ? "#eee" : "#555"}
                >
                  {L("Annulla")}
                </Btn>
                <Btn
                  onClick={saveBank}
                  disabled={!bankFormValid}
                  bg={bankFormValid ? confirmButtonColor : "#A8A8A8"}
                >
                  {L(editingBankId ? "Aggiorna coordinate" : "Salva coordinate")}
                </Btn>
              </div>
            </div>
          )}
        {showCreditCardForm &&
          appuntiModal(
            L(
              editingCreditCardId
                ? "Modifica Carta di credito"
                : "Nuova Carta di credito"
            ),
            cancelCreditCardEdit,
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
              }}
            >
              <input
                placeholder={L("Nome carta")}
                value={creditCardForm.name}
                onChange={function (e) {
                  setCreditCardForm(function (p) {
                    return { ...p, name: e.target.value };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder={L("Emittente")}
                value={creditCardForm.issuer}
                onChange={function (e) {
                  setCreditCardForm(function (p) {
                    return { ...p, issuer: e.target.value };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder={L("Intestatario")}
                value={creditCardForm.holder}
                onChange={function (e) {
                  setCreditCardForm(function (p) {
                    return { ...p, holder: e.target.value };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder={L("Numero carta")}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={19}
                value={creditCardForm.number}
                onChange={function (e) {
                  setCreditCardForm(function (p) {
                    return { ...p, number: e.target.value.replace(/\D/g, "") };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder="MM / AA"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={7}
                value={creditCardForm.expiry}
                onChange={function (e) {
                  setCreditCardForm(function (p) {
                    return { ...p, expiry: formatCardExpiry(e.target.value) };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder="CVV/CVC (max 4 numeri)"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={creditCardForm.cvv}
                onChange={function (e) {
                  setCreditCardForm(function (p) {
                    return {
                      ...p,
                      cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                    };
                  });
                }}
                style={sinp}
              />
              <input
                placeholder={L("Note")}
                value={creditCardForm.note}
                onChange={function (e) {
                  setCreditCardForm(function (p) {
                    return { ...p, note: e.target.value };
                  });
                }}
                style={sinp}
              />
              <div
                style={{
                  gridColumn: isMobile ? "auto" : "1 / -1",
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                }}
              >
                <Btn
                  onClick={cancelCreditCardEdit}
                  bg={dark ? "#333" : "#f0f0f0"}
                  color={dark ? "#eee" : "#555"}
                >
                  {L("Annulla")}
                </Btn>
                <Btn
                  onClick={saveCreditCard}
                  disabled={!creditCardFormValid}
                  bg={creditCardFormValid ? confirmButtonColor : "#A8A8A8"}
                >
                  {L(editingCreditCardId ? "Aggiorna carta" : "Salva carta")}
                </Btn>
              </div>
            </div>
          )}
      </div>
    );
  }
