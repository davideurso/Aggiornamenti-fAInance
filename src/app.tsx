// ═══════════════════════════════════════════════════════════════════════════════
// APP.TSX — Shell principale, stato globale e navigazione.
// Login/profilo, impostazioni e pannelli funzionali sono separati in moduli dedicati.
// App() mantiene orchestrazione, sincronizzazione e composizione del contesto.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  createContext,
  Component,
} from "react";
import { registerPlugin, SystemBars, SystemBarsStyle, SystemBarType } from "@capacitor/core";
import {
  AppCtx,
  useApp,
  fbAuth,
  fbDb,
  googleProvider,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential,
  CURRENCIES,
  LANGUAGES,
  BG_THEMES,
  BUTTON_STYLES,
  DEFAULT_CATS,
  DEFAULT_METHODS,
  DEFAULT_EXPENSE_GROUPS,
  DEFAULT_METHOD_GROUPS,
  DEFAULT_INCOME_GROUPS,
  DEFAULT_PATRIMONIO_AREAS,
  DEFAULT_PATRIMONIO_ENTRIES,
  DEFAULT_BUDGET_PLAN,
  DEFAULT_GOALS,
  DEFAULT_EXPENSE_CATEGORY_NAMES,
  DEFAULT_EXPENSE_GROUP_NAMES,
  DEFAULT_METHOD_NAMES,
  DEFAULT_METHOD_GROUP_NAMES,
  DEFAULT_PATRIMONIO_AREA_NAMES,
  DEFAULT_PATRIMONIO_ENTRY_NAMES,
  MONTHS_FULL,
  MONTHS_SHORT,
  BALANCE_COLOR,
  COLORS,
  GOAL_ICONS,
  INCOME_TYPES,
  EMOJI_LIST,
  getDefaultLang,
  getDefaultCurrency,
  getDefaultDateFormat,
  getAllIncomeTypes,
  translateDefaultCollection,
  sameNamedItems,
  useStorage,
  clearFainanceLocalAccountData,
  fmtDate,
  fmtAmt,
  rateMonth,
  todayStr,
  dateOffset,
  DATE_FORMATS,
  IMPORT_DATE_FORMATS,
  parseDateWithFormat,
  parseMoney,
  androidDownload,
  exportToCSV,
  exportToXLSX,
  AI_AGENT_ENDPOINT,
  AI_AGENT_SCOPE_INSTRUCTION,
  AI_OUT_OF_SCOPE_MESSAGE,
  RECEIPT_OCR_ENDPOINT,
  PLAN_IDS,
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_LIMITS,
  planLabel,
  planLimitLabel,
  todayUsageKey,
  monthUsageKey,
  appLogo,
  appBanner,
  aiGrilloMascot,
} from "./core";
import {
  TRANSLATIONS,
  translateFainanceText,
  normalizeFainanceTranslatedIcons,
} from "./traduzioni";
import { applyAppTranslationPatches } from "./i18n/appTranslationPatches";
import { pickFainanceContact } from "./native/appContacts";
import {
  fainanceIsNativePlatform,
  fainanceSetMetaEventsConsent,
  fainanceLogMetaEvent,
} from "./native/platform";
import {
  ADMOB_REWARDED_AD_UNIT_ID_ANDROID,
  ADMOB_INTERSTITIAL_AD_UNIT_ID_ANDROID,
  ADMOB_BANNER_AD_UNIT_ID_ANDROID,
  ADMOB_REWARDED_AD_UNIT_ID_IOS,
  ADMOB_INTERSTITIAL_AD_UNIT_ID_IOS,
  ADMOB_BANNER_AD_UNIT_ID_IOS,
} from "./config/admob";
import {
  getProfileCountryNames,
  localizeProfileCountryName,
} from "./profile/countries";
import {
  accountRequiresEmailVerification,
  currentAuthUser,
  registerEmailAccount,
  signInWithEmailAccount,
  signOutAccount,
} from "./auth/authService";
import {
  buildBaseProfilePatch,
  mergeUserProfile,
} from "./profile/profileService";
import {
  isAndroidLoginPlatform,
  performGoogleAccountLogin,
  performAppleAccountLogin,
  sendAccountPasswordReset,
  googleLoginErrorMessage,
  appleLoginErrorMessage,
} from "./auth/loginRuntime";
import {
  resolveAccountSession,
  watchResolvedAccountSession,
} from "./auth/accountSession";
import {
  totalForMonth,
  last12MonthKeys,
  balanceForMonths,
  monthlyTotalsForYear,
} from "./financeCalculations";
import {
  Btn,
  Badge,
  Toggle,
  Toast,
  StatCard,
  DonutChart,
  BarChart,
  LineChart,
  AlertPopup,
  EditModal,
  SettingsList,
  AreasEditor,
  SortableRows,
  PatrimonioSettingsPanel,
  PopupCloseButton,
  SortOrderPanel,
  DeleteDataPanel,
  ImportData,
  FAInanceLogo,
  AIGrilloIcon,
  EmojiPicker,
  AppColorSelector,
  DatePickerField,
  ExpenseForm,
  BulkEntry,
  ReceiptScanPanel,
  RecurringManager,
  BudgetPlanPanel,
  GoalsPanel,
  AlertsPanel,
} from "./widget";
import { StatsPanel } from "./statistiche";
import { parseFainanceShareVoiceCommand } from "./voiceParser";
const FainanceFileNative: any = registerPlugin("FainanceFile");
import {
  HomePanel,
  SpesePanel,
  HistoryPanel,
  ConsulenteAIPanel,
  FloatingAIButton,
  VoiceEntryModal,
} from "./sezioni";
import { AppuntiPanel } from "./sections/AppuntiPanel";
import { DebtCreditsPanel } from "./sections/DebtCreditsPanel";
import { ShoppingPanel } from "./sections/ShoppingPanel";
import { PatrimonioPanel } from "./sections/PatrimonioPanel";
import { SharePanel } from "./sections/SharePanel";
import { MorePanel } from "./sections/MorePanel";
import { SettingsPanel } from "./settings/SettingsPanel";
import { LoginScreen } from "./account/AccountScreens";
import { L, PL } from "./utils/translationFallback";
import {
  FAINANCE_TOAST_CURRENT,
  publishFainanceToast,
  GlobalToastHost,
  GlobalNumericInputAssist,
  StableCurrencyPicker,
} from "./ui/appInfrastructure";
import {
  focusFainanceInput,
  fainancePromiseTimeout,
  numOr,
  readFainanceStoredLang,
} from "./utils/appRuntime";
import {
  fainanceMinimalAuthUser,
  fainanceResolveLegalAcceptance,
} from "./auth/accountIdentity";
import {
  fainanceCompressAccountDataV5,
  fainanceExpandAccountCloudDataV5,
} from "./data/accountCloudCodec";
import { createAutomaticAccountBackup } from "./data/automaticBackups";
import { writeTechnicalLog } from "./observability/technicalLogs";
import {
  accountSyncErrorInfo,
  accountSyncIsTransientError,
  syncJsonEqual,
  syncRecordTime,
  syncComparableRecord,
  syncTombstoneTime,
  isExplicitSyncTombstone,
  mergeSyncTombstones,
  mergeSyncRecords,
  stampLocalSyncRecords,
  removedSyncRecordTombstones,
  accountSyncRecordKey,
} from "./data/syncAlgorithms";
import {
  bulkMovementRowLimit,
  bulkMovementCooldownMonths,
  movementWithMethodSnapshot,
} from "./finance/movementRules";
import {
  nextBulkMovementAllowedAt,
  isBulkMovementLocked,
} from "./finance/bulkMovementPolicy";
import { isRecurringDueInMonth } from "./finance/recurringRules";
import { sortFinancialHistoryItems } from "./finance/historySorting";
import { debtCreditBalance } from "./finance/debtCredit";
import { maskPaymentCardNumber } from "./finance/paymentCards";
import {
  useFainanceSensitiveStorage,
  fainanceEncryptSensitiveData,
  fainanceDecryptSensitiveData,
} from "./security/sensitiveStorage";
import {
  closeCurrentDeviceSession,
  revokeAllOtherDeviceSessions,
  startCurrentDeviceSession,
} from "./security/deviceSessions";
import {
  cancelAccountDeletion,
  finalizeDueAccountDeletion,
  isAccountDeletionDue,
  isRecentAuthentication,
  requestAccountDeletion,
  watchAccountDeletionState,
} from "./security/accountLifecycle";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { startNativePushNotifications, syncNotificationProfile } from "./notifications/pushNotifications";

/* fainanceBasicUserPayload extracted */

// 1.6.79: biometria Android stabilizzata evitando doppio prompt e blocco immediato dopo l’attivazione.

// Evita il flash visibile in italiano quando è attiva una lingua diversa:
// la UI resta nascosta solo per il frame necessario alla traduzione runtime.
try {
  if (
    typeof document !== "undefined" &&
    !document.getElementById("fainance-i18n-no-flash")
  ) {
    var st = document.createElement("style");
    st.id = "fainance-i18n-no-flash";
    st.textContent =
      'html[data-fainance-i18n="loading"] body{opacity:0!important;} html,body,#root{max-width:100%!important;overflow-x:hidden!important;} #root *{box-sizing:border-box;min-width:0;} .fai-ellipsis{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;max-width:100%;display:block;}';
    document.head.appendChild(st);
  }
} catch (e) {}

/* LoginScreen extracted */

// ── SECTION ERROR BOUNDARY ──────────────────────────────────────────────────
class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error: error };
  }
  componentDidCatch(error, info) {
    try {
      console.error("fAInance section error", error, info);
    } catch (e) {}
  }
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      var dark = !!this.props.dark;
      var subC = dark ? "#aaa" : "#666";
      var borderC = dark ? "#5a3333" : "#f3b6b6";
      var tr =
        typeof this.props.tr === "function"
          ? this.props.tr
          : function (x) {
              return x;
            };
      var detail =
        this.state.error && this.state.error.message
          ? this.state.error.message
          : String(this.state.error || tr("Errore sconosciuto"));
      return (
        <div
          style={{
            background: dark ? "#2a2424" : "#fff0f0",
            border: "1.5px solid " + borderC,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            gap: 18,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 18,
              background: dark ? "#3a2b2b" : "#ffe0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: dark ? "#ffd0d0" : "#8a2d2d",
                marginBottom: 8,
              }}
            >
              {tr("Questa sezione non si è caricata correttamente")}
            </div>
            <div
              style={{
                fontSize: 14,
                color: subC,
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              {tr(
                "Errore intercettato senza bloccare l'app. Torna alla Home e segnala il dettaglio tecnico se si ripete."
              )}
            </div>
            <div
              style={{
                fontSize: 13,
                color: subC,
                background: dark ? "#1e1e30" : "#fff",
                border: "1px solid " + (dark ? "#444" : "#ddd"),
                borderRadius: 12,
                padding: "10px 12px",
                marginBottom: 14,
                wordBreak: "break-word",
              }}
            >
              {tr("Dettaglio tecnico")}: {detail}
            </div>
            <button
              onClick={this.props.onHome}
              style={{
                background: "#7F77DD",
                color: "#fff",
                border: "none",
                borderRadius: 14,
                padding: "11px 18px",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {tr("Torna alla Home")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── CONTACT FORM ─────────────────────────────────────────────────────────────

/* ContactForm extracted */

// ── CHANGE PASSWORD ───────────────────────────────────────────────────────────

/* ChangePwdSection extracted */

/* ProfilePlacePromptField extracted */

/* ProfileLocalPromptField extracted */

// ── PROFILE CARD ─────────────────────────────────────────────────────────────

/* ProfileCard extracted */

function AppWithLogin() {
  var [fbUser, setFbUser] = useState(undefined); // undefined=loading, null=not logged in
  var [userData, setUserData] = useState(null);
  var deletionFinalizeRef = useRef(false);

  async function applyResolvedAuthUser(user: any, data: any) {
    if (!user || !user.uid) {
      setFbUser(null);
      setUserData(null);
      return;
    }
    // Firebase authenticates immediately when an email account is created.
    // Keep the registration screen mounted until profile creation, delivery
    // of the verification email and the final sign-out are all complete.
    try {
      var pendingRegistrationEmail = String(
        sessionStorage.getItem("fainance_registration_pending_email_v1") || ""
      )
        .trim()
        .toLowerCase();
      if (
        pendingRegistrationEmail &&
        !user.emailVerified &&
        pendingRegistrationEmail ===
          String(user.email || "").trim().toLowerCase()
      ) {
        setFbUser(null);
        setUserData(null);
        return;
      }
    } catch (_pendingRegistrationError) {}
    // fAInance 2.0 V25 - global email verification gate.
    var passwordProvider = ((user && user.providerData) || []).some(function (provider: any) {
      return provider && provider.providerId === "password";
    });
    if (passwordProvider && !user.emailVerified) {
      var verificationRequired = await accountRequiresEmailVerification(user).catch(function () {
        return true;
      });
      if (verificationRequired) {
        try {
          sessionStorage.setItem(
            "fainance_email_verification_blocked_v25",
            JSON.stringify({ email: String(user.email || "").trim().toLowerCase(), at: Date.now() })
          );
        } catch (_verificationNoticeError) {}
        await signOutAccount().catch(function () {});
        setFbUser(null);
        setUserData(null);
        return;
      }
    }
    var scheduledAt = String((data && data.deletionScheduledAt) || "");
    var deletionDue =
      String((data && data.deletionStatus) || "") === "pending" &&
      !!scheduledAt &&
      Date.parse(scheduledAt) <= Date.now();
    if (deletionDue) {
      if (deletionFinalizeRef.current) return;
      deletionFinalizeRef.current = true;
      try {
        if (isRecentAuthentication(user)) {
          var deleted = await finalizeDueAccountDeletion(user).catch(
            function () {
              return false;
            }
          );
          if (deleted) {
            try {
              clearFainanceLocalAccountData(user.uid);
            } catch (e) {}
            setFbUser(null);
            setUserData(null);
            return;
          }
        }
        await signOutAccount().catch(function () {});
        setFbUser(null);
        setUserData(null);
        return;
      } finally {
        deletionFinalizeRef.current = false;
      }
    }
    setFbUser(user);
    setUserData(data);
  }

  async function finishAuthUser(user: any) {
    if (!user || !user.uid) {
      setFbUser(null);
      setUserData(null);
      return;
    }
    var resolved: any = await resolveAccountSession(user);
    await applyResolvedAuthUser(user, resolved);
  }

  useEffect(function () {
    return watchResolvedAccountSession(
      function (user, data) {
        void applyResolvedAuthUser(user, data as any);
      },
      function () {
        setFbUser(null);
        setUserData(null);
      }
    );
  }, []);

  async function forceLogout() {
    try {
      var uid = fbUser && fbUser.uid ? fbUser.uid : "";
      if (uid) await closeCurrentDeviceSession(uid).catch(function () {});
      await signOutAccount();
    } finally {
      setFbUser(null);
      setUserData(null);
    }
  }

  useEffect(
    function () {
      var uid = fbUser && fbUser.uid ? String(fbUser.uid) : "";
      if (!uid) return;
      return startCurrentDeviceSession(
        uid,
        function () {
          void forceLogout();
        },
        "2.0 Test"
      );
    },
    [fbUser && fbUser.uid]
  );

  if (fbUser === undefined)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <FAInanceLogo size={72} />
        <div style={{ fontSize: 13, color: "#888" }}>Caricamento...</div>
      </div>
    );

  if (!fbUser)
    return (
      <LoginScreen
        onLogin={function (u, authUser) {
          var realUser = authUser || currentAuthUser();
          if (realUser && realUser.uid) {
            finishAuthUser(realUser);
          } else if (u && u.id) {
            setUserData(u);
            setFbUser(fainanceMinimalAuthUser(u));
          } else {
            setUserData(null);
            setFbUser(null);
          }
        }}
      />
    );
  return (
    <App
      currentUser={
        userData || {
          id: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || "Utente",
        }
      }
      onLogout={forceLogout}
      fbUser={fbUser}
      onProfileUpdate={function (upd) {
        setUserData(function (p) {
          return { ...(p || {}), id: fbUser.uid, email: fbUser.email, ...upd };
        });
      }}
    />
  );
}

function StableNestedPanelHost({ render }: { render: () => any }) {
  return render();
}

function App({ currentUser, onLogout, fbUser, onProfileUpdate }) {
  currentUser = currentUser || {
    id: fbUser && fbUser.uid ? fbUser.uid : "",
    email: fbUser && fbUser.email ? fbUser.email : "",
    name: fbUser && fbUser.displayName ? fbUser.displayName : "Utente",
  };
  var userId = currentUser.id;
  function userKey(key) {
    return userId ? "user_" + userId + "_" + key : "no_user_" + key;
  }

  // Migrazione una tantum dei dati salvati dalle versioni che usavano chiavi
  // locali non associate all'account. Senza questa copia, dopo l'aggiornamento
  // una nuova build può mostrare Share (sincronizzato separatamente) ma non i
  // movimenti personali ancora presenti nelle vecchie chiavi locali.
  function localStorageValueHasData(raw) {
    if (raw == null) return false;
    try {
      var value = JSON.parse(raw);
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object")
        return Object.keys(value).length > 0;
      return value !== null && value !== undefined && String(value) !== "";
    } catch (e) {
      return (
        String(raw).trim() !== "" &&
        String(raw) !== "[]" &&
        String(raw) !== "{}"
      );
    }
  }
  function migrateLegacyLocalStorageForUser(uid) {
    if (!uid || typeof localStorage === "undefined") return;
    var prefix = "user_" + uid + "_";
    var marker = prefix + "legacy_account_storage_migrated_v3";
    var ownerKey = "fainance_legacy_storage_owner_uid_v2";
    try {
      var keys = [
        "exp_v10",
        "inc_v10",
        "cats_v10",
        "meth_v10",
        "rec_v10",
        "goals_v1",
        "alerts_v1",
        "budget_plan_v1",
        "expense_groups_v1",
        "income_groups_v1",
        "method_groups_v1",
        "custom_income_types_v1",
        "income_type_overrides_v1",
        "cat_order_v1",
        "method_order_v1",
        "cat_sort_mode",
        "method_sort_mode",
        "income_type_order_v1",
        "default_expense_cat_v1",
        "default_expense_method_v1",
        "default_income_type_v1",
        "default_expense_area_v1",
        "default_income_area_v1",
        "default_method_area_v1",
        "history_future_mode_v1",
        "history_sort_date_v1",
        "history_sort_direction_v1",
        "history_sort_secondary_v1",
        "history_sort_secondary_direction_v1",
        "patrimonio_values_v1",
        "patrimonio_areas_v1",
        "patrimonio_entries_v1",
        "patrimonio_history_v1",
        "patrimonio_notes_v1",
        "patrimonio_mode_v1",
        "appunti_documents_v1",
        "appunti_notes_v1",
        "bank_coords_v1",
        "credit_cards_v1",
        "share_projects_v1",
        "share_receipt_uploads_v1",
        "share_show_history_v1",
        "debt_credits_v1",
        "debt_credits_show_patrimonio_v1",
        "debt_credits_show_expenses_v1",
        "shopping_cards_v1",
        "shopping_items_v1",
        "shopping_lists_v2",
        "shopping_deleted_records_v2",
        "account_deleted_records_v1",
        "shopping_areas_v1",
        "shopping_area_icons_v1",
        "shopping_bought_color_v1",
        "shopping_default_area_v1",
        "shopping_product_sort_v1",
        "shopping_active_list_id_v2",
        "notif_prefs_v1",
        "custom_notifs_v1",
        "shown_alert_ids_v2",
        "onboarding_guide_seen_v1",
        "terms_accepted_v1",
        "privacy_accepted_v1",
        "meta_events_consent_v1",
        "legal_acceptance_date_v1",
        "ai_chat_v1",
        "ai_data_access_v1",
        "ai_dismissed_v1",
        "ai_floating_enabled_v1",
        "ai_tab_v1",
        "pref_bg",
        "pref_btn_style",
        "pref_cur",
        "pref_datefmt",
        "pref_exp_color",
        "pref_inc_color",
        "pref_first_day_week",
        "pref_home_balance",
        "pref_statsview",
        "pref_confirm_color",
        "pref_secondary_button_color_v1",
        "pref_sec_cur",
        "pref_sec_history",
        "pref_sec_stats",
        "pref_sec_budget",
        "pref_sec_patrimonio",
        "home_worklets_v1",
        "pref_show_app_summary_header_v1",
        "pref_mobile_nav_order_v1",
        "pref_mobile_nav_icon_count_v1",
        "pref_mobile_menu_order_v1",
        "pref_mobile_all_nav_order_v1",
        "pref_biometric_lock_enabled_v1",
        "pref_biometric_lock_timeout_v1",
        "pref_local_lock_method_v1",
        "pref_local_lock_pin_v1",
      ];
      var legacyKeys = keys.filter(function (key) {
        return localStorage.getItem(key) != null;
      });
      var owner = String(localStorage.getItem(ownerKey) || "");
      if (owner && owner !== String(uid)) {
        legacyKeys.forEach(function (key) {
          try {
            localStorage.removeItem(key);
            localStorage.removeItem(key + "_updated_at");
          } catch (e) {}
        });
        localStorage.setItem(marker, "1");
        return;
      }
      if (!owner && legacyKeys.length)
        localStorage.setItem(ownerKey, String(uid));
      keys.forEach(function (key) {
        var source = localStorage.getItem(key);
        var targetKey = prefix + key;
        var target = localStorage.getItem(targetKey);
        var recoveryKey = prefix + "recovery_legacy_" + key;
        var recovery = localStorage.getItem(recoveryKey);
        if (source != null) {
          if (
            recovery == null ||
            (!localStorageValueHasData(recovery) &&
              localStorageValueHasData(source))
          )
            localStorage.setItem(recoveryKey, source);
          if (
            target == null ||
            (!localStorageValueHasData(target) &&
              localStorageValueHasData(source))
          )
            localStorage.setItem(targetKey, source);
          localStorage.removeItem(key);
        } else if (
          recovery != null &&
          (target == null ||
            (!localStorageValueHasData(target) &&
              localStorageValueHasData(recovery)))
        ) {
          localStorage.setItem(targetKey, recovery);
        }
      });
      var timestampMap = {
        shopping_cards_v1: "shopping_cards_updated_at",
        shopping_items_v1: "shopping_items_updated_at",
        shopping_lists_v2: "shopping_lists_updated_at",
      };
      Object.keys(timestampMap).forEach(function (sourceKey) {
        var legacyTs = Number(
          localStorage.getItem(timestampMap[sourceKey]) ||
            localStorage.getItem(sourceKey + "_updated_at") ||
            0
        );
        var targetTsKey = prefix + timestampMap[sourceKey];
        var currentTs = Number(localStorage.getItem(targetTsKey) || 0);
        if (legacyTs > currentTs)
          localStorage.setItem(targetTsKey, String(legacyTs));
      });
      localStorage.setItem(
        "fainance_legacy_account_storage_migrated_uid_v3",
        String(uid)
      );
      localStorage.setItem(marker, "1");
    } catch (e) {
      console.error("Legacy storage migration error", (e && e.message) || e);
    }
  }
  migrateLegacyLocalStorageForUser(userId);

  function ensureArrayValue(value, fallback) {
    return Array.isArray(value)
      ? value
      : Array.isArray(fallback)
      ? fallback
      : [];
  }
  function ensureObjectValue(value, fallback) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value
      : fallback || {};
  }
  function mergeArrayByStableId(cloud, local) {
    var out = [];
    var seen = {};
    function add(item) {
      if (item == null) return;
      var id = item && item.id != null ? String(item.id) : JSON.stringify(item);
      if (seen[id]) return;
      seen[id] = true;
      out.push(item);
    }
    ensureArrayValue(cloud, []).forEach(add);
    ensureArrayValue(local, []).forEach(add);
    return out;
  }
  function mergeArrayPreferLocalByStableId(cloud, local) {
    var out = [];
    var pos = {};
    function upsert(item, prefer) {
      if (item == null) return;
      var id = item && item.id != null ? String(item.id) : JSON.stringify(item);
      if (pos[id] === undefined) {
        pos[id] = out.length;
        out.push(item);
        return;
      }
      if (prefer) out[pos[id]] = item;
    }
    ensureArrayValue(cloud, []).forEach(function (item) {
      upsert(item, false);
    });
    ensureArrayValue(local, []).forEach(function (item) {
      upsert(item, true);
    });
    return out;
  }
  function itemDefaultById(defaults, id) {
    return (
      ensureArrayValue(defaults, []).find(function (x) {
        return String(x && x.id) === String(id);
      }) || null
    );
  }
  function knownDefaultNamesForItem(defaults, dict, item) {
    var out = [];
    var id = item && item.id;
    var d = itemDefaultById(defaults, id);
    if (d && d.name != null) out.push(String(d.name));
    var names = dict && dict[id];
    if (!names && dict) names = dict[String(id)];
    if (names && typeof names === "object") {
      Object.keys(names).forEach(function (k) {
        if (names[k] != null) out.push(String(names[k]));
      });
    }
    return out.filter(function (v, i, a) {
      return a.indexOf(v) === i;
    });
  }
  function isCustomizedStoredItem(item, defaults, dict) {
    if (!item || item.id == null) return false;
    if (
      item.custom ||
      item.userCreated ||
      item.recovered ||
      item.deleted ||
      item.archived
    )
      return true;
    var d = itemDefaultById(defaults, item.id);
    if (!d) return true;
    var knownNames = knownDefaultNamesForItem(defaults, dict, item);
    if (item.name != null && knownNames.indexOf(String(item.name)) === -1)
      return true;
    if (String(item.icon || "") !== String(d.icon || "")) return true;
    if (String(item.color || "") !== String(d.color || "")) return true;
    if (String(item.group || "") !== String(d.group || "")) return true;
    return false;
  }
  function chooseProtectedStoredItem(
    primary,
    secondary,
    defaults,
    dict,
    preferSecondary
  ) {
    if (!primary) return secondary;
    if (!secondary) return primary;
    var primaryCustom = isCustomizedStoredItem(primary, defaults, dict);
    var secondaryCustom = isCustomizedStoredItem(secondary, defaults, dict);
    if (secondaryCustom && !primaryCustom)
      return { ...primary, ...secondary, id: secondary.id };
    if (primaryCustom && !secondaryCustom)
      return { ...secondary, ...primary, id: primary.id };
    if (secondaryCustom && primaryCustom)
      return preferSecondary
        ? { ...primary, ...secondary, id: secondary.id }
        : { ...secondary, ...primary, id: primary.id };
    return preferSecondary
      ? { ...primary, ...secondary, id: secondary.id }
      : { ...secondary, ...primary, id: primary.id };
  }
  function mergeProtectedArrayByStableId(
    primary,
    secondary,
    defaults,
    dict,
    preferSecondary
  ) {
    var out = [];
    var pos = {};
    function upsert(item, fromSecondary) {
      if (item == null) return;
      var id = item && item.id != null ? String(item.id) : JSON.stringify(item);
      if (pos[id] === undefined) {
        pos[id] = out.length;
        out.push(item);
        return;
      }
      out[pos[id]] = fromSecondary
        ? chooseProtectedStoredItem(
            out[pos[id]],
            item,
            defaults,
            dict,
            preferSecondary
          )
        : chooseProtectedStoredItem(
            item,
            out[pos[id]],
            defaults,
            dict,
            !preferSecondary
          );
    }
    ensureArrayValue(primary, []).forEach(function (x) {
      upsert(x, false);
    });
    ensureArrayValue(secondary, []).forEach(function (x) {
      upsert(x, true);
    });
    return out;
  }
  function displayNameFromMovement(item) {
    return String(
      (item &&
        (item.methodName ||
          item.paymentMethodName ||
          item.paymentMethod ||
          item.methodLabel)) ||
        ""
    ).trim();
  }
  function ensureReferencedMethods(methodList, expenseList, recurringList) {
    var out = ensureArrayValue(methodList, []).slice();
    var seen = {};
    out.forEach(function (m) {
      if (m && m.id != null) seen[String(m.id)] = true;
    });
    function maybeAdd(item) {
      if (!item) return;
      var raw = item.methodId != null ? item.methodId : item.method;
      var sid = String(raw == null ? "" : raw).trim();
      if (!sid || seen[sid]) return;
      seen[sid] = true;
      var name =
        displayNameFromMovement(item) ||
        translateUiRuntimeText("Metodo recuperato") + " " + sid;
      out.push({
        id: raw,
        name: name,
        icon: "💳",
        color: "#B4B2A9",
        group: "altri",
        archived: true,
        recovered: true,
        custom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    ensureArrayValue(expenseList, []).forEach(maybeAdd);
    ensureArrayValue(recurringList, []).forEach(maybeAdd);
    return out.length ? out : ensureArrayValue(DEFAULT_METHODS, []);
  }
  function hasFallbackItems(fallback) {
    return Array.isArray(fallback) && fallback.length > 0;
  }
  function normalizeProtectedName(v) {
    try {
      return String(v || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    } catch (e) {
      return String(v || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
    }
  }
  function protectedDefaultNameMap(defaults, dict) {
    var map = {};
    ensureArrayValue(defaults, []).forEach(function (d) {
      if (!d || d.id == null) return;
      if (d.name != null) map[normalizeProtectedName(d.name)] = String(d.id);
      var names = dict && (dict[d.id] || dict[String(d.id)]);
      if (names && typeof names === "object")
        Object.keys(names).forEach(function (k) {
          if (names[k] != null)
            map[normalizeProtectedName(names[k])] = String(d.id);
        });
    });
    return map;
  }
  function compactProtectedArray(value, fallback, dict) {
    var arr = Array.isArray(value) ? value.slice() : [];
    if (!arr.length) arr = ensureArrayValue(fallback, []).slice();
    var defaults = ensureArrayValue(fallback, []);
    var defaultIds = {};
    defaults.forEach(function (d) {
      if (d && d.id != null) defaultIds[String(d.id)] = true;
    });
    var nameMap = protectedDefaultNameMap(defaults, dict);
    var out = [];
    var pos = {};
    function keyOf(item) {
      if (!item) return "null:" + out.length;
      var sid = item.id != null ? String(item.id) : "";
      // Un ID esplicito identifica sempre un elemento distinto. In precedenza un
      // metodo o una categoria personalizzata con un nome simile a un valore di
      // sistema veniva accorpato e spariva durante la sincronizzazione.
      if (sid) return defaultIds[sid] ? "default:" + sid : "id:" + sid;
      var nid = nameMap[normalizeProtectedName(item.name)];
      if (nid) return "default:" + nid;
      return "name:" + normalizeProtectedName(item.name) + ":" + out.length;
    }
    function preferItem(a, b) {
      if (!a) return b;
      if (!b) return a;
      if (a.deleted || b.deleted) {
        var src = b.deleted ? b : a;
        var base = a.deleted ? a : b;
        return { ...base, ...src, deleted: true, archived: true, custom: true };
      }
      var au = a.updatedAt ? Date.parse(a.updatedAt) : 0,
        bu = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      if (
        (b.custom || b.userCreated || b.recovered) &&
        !(a.custom || a.userCreated || a.recovered)
      )
        return { ...a, ...b, id: a.id };
      if (
        (a.custom || a.userCreated || a.recovered) &&
        !(b.custom || b.userCreated || b.recovered)
      )
        return { ...b, ...a, id: a.id };
      return bu >= au ? { ...a, ...b, id: a.id } : { ...b, ...a, id: a.id };
    }
    arr.forEach(function (item) {
      if (!item) return;
      var k = keyOf(item);
      if (pos[k] === undefined) {
        pos[k] = out.length;
        out.push(item);
        return;
      }
      out[pos[k]] = preferItem(out[pos[k]], item);
    });
    return out;
  }
  function defaultProtectedArray(value, fallback, dict) {
    return compactProtectedArray(value, fallback, dict);
  }
  function resolveDefaultProtectedNext(next, current, fallback, dict) {
    var base = defaultProtectedArray(current, fallback, dict);
    var value = typeof next === "function" ? next(base) : next;
    return defaultProtectedArray(value, fallback, dict);
  }
  function chooseCloudLocalArray(cloud, local, fallback, merge) {
    var c = Array.isArray(cloud) ? cloud : null;
    var l = Array.isArray(local) ? local : null;
    var fallbackHasItems = hasFallbackItems(fallback);
    if (merge && c && l) {
      var merged = mergeArrayByStableId(c, l);
      if (merged.length || !fallbackHasItems) return merged;
    }
    if (c && (c.length || !fallbackHasItems)) return c;
    if (l && (l.length || !fallbackHasItems)) return l;
    return ensureArrayValue(fallback, []);
  }
  function chooseCloudLocalObject(cloud, local, fallback) {
    if (cloud && typeof cloud === "object" && !Array.isArray(cloud))
      return cloud;
    if (local && typeof local === "object" && !Array.isArray(local))
      return local;
    return fallback || {};
  }
  function shoppingNormalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }
  function shoppingProductIdentity(item) {
    var name = shoppingNormalizeText(item && item.name);
    var area = shoppingNormalizeText((item && item.area) || "Altro");
    if (name) return name + "|" + area;
    return "id|" + String((item && item.id) || "");
  }
  function shoppingExplicitProductId(item) {
    return String((item && (item.productId || item.catalogProductId)) || "");
  }
  function shoppingRecoveredProductId(identity) {
    var raw = String(identity || "prodotto");
    var hash = 2166136261;
    for (var i = 0; i < raw.length; i++) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return "prod_recovered_" + (hash >>> 0).toString(36);
  }
  function shoppingItemsEqual(a, b) {
    try {
      return (
        JSON.stringify(Array.isArray(a) ? a : []) ===
        JSON.stringify(Array.isArray(b) ? b : [])
      );
    } catch (e) {
      return false;
    }
  }
  function normalizeShoppingItemsData(value) {
    var source = Array.isArray(value)
      ? value.filter(function (x) {
          return !!x && typeof x === "object";
        })
      : [];
    var catalogByIdentity = {};
    var catalogById = {};
    var normalizedCatalogByOriginalId = {};
    var duplicateCatalogIds = {};
    var recoveredCatalogs = [];
    source.forEach(function (item) {
      if (!item.archived) return;
      var identity = shoppingProductIdentity(item);
      var originalId = String(item.id || "");
      var existing = catalogByIdentity[identity];
      if (existing) {
        if (originalId) duplicateCatalogIds[originalId] = true;
        return;
      }
      var stableId =
        shoppingExplicitProductId(item) ||
        originalId ||
        shoppingRecoveredProductId(identity);
      var normalized = {
        ...item,
        id: originalId || stableId,
        productId: stableId,
        archived: true,
        bought: false,
        listId: "",
        catalogOnly: true,
      };
      catalogByIdentity[identity] = normalized;
      catalogById[stableId] = normalized;
      catalogById[String(normalized.id || "")] = normalized;
      if (originalId) normalizedCatalogByOriginalId[originalId] = normalized;
    });
    var out = [];
    source.forEach(function (item) {
      if (item.archived) {
        var originalId = String(item.id || "");
        if (duplicateCatalogIds[originalId]) return;
        var normalizedCatalog =
          normalizedCatalogByOriginalId[originalId] ||
          catalogByIdentity[shoppingProductIdentity(item)];
        if (normalizedCatalog && out.indexOf(normalizedCatalog) < 0)
          out.push(normalizedCatalog);
        return;
      }
      var identity = shoppingProductIdentity(item);
      var explicitId = shoppingExplicitProductId(item);
      var catalog =
        (explicitId && catalogById[explicitId]) || catalogByIdentity[identity];
      if (!catalog) {
        var recoveredId = explicitId || shoppingRecoveredProductId(identity);
        catalog = {
          ...item,
          id: recoveredId,
          productId: recoveredId,
          archived: true,
          bought: false,
          boughtAt: "",
          listId: "",
          catalogOnly: true,
          order: Number(item.order || 0),
          createdAt: item.createdAt || new Date().toISOString(),
          recoveredFromList: true,
        };
        catalogByIdentity[identity] = catalog;
        catalogById[recoveredId] = catalog;
        recoveredCatalogs.push(catalog);
      }
      var stableId =
        shoppingExplicitProductId(catalog) || String(catalog.id || "");
      out.push({ ...item, productId: stableId, archived: false });
    });
    return out.concat(recoveredCatalogs);
  }
  var firestoreHydratedRef = useRef(false);
  var applyingFirestoreRef = useRef(false);
  var remoteApplyDepthRef = useRef(0);
  var pendingAccountSyncRef = useRef<any>({ revision: 0, token: "" });
  var accountSyncSavingRef = useRef(false);
  var accountSyncRetryRequestedRef = useRef(false);
  var lastCloudIntegrityRef = useRef<any>({});
  var lastCloudExpandedDataRef = useRef<any>({});
  var lastCloudRawKeysRef = useRef<string[]>([]);
  var postHydrationSyncRequestedRef = useRef(false);
  var accountSyncErrorToastAtRef = useRef(0);
  var [accountSyncRetryPulse, setAccountSyncRetryPulse] = useState(0);

  function persistAccountSyncError(phase: string, e: any, transient: boolean) {
    if (!userId) return;
    try {
      var info = accountSyncErrorInfo(e);
      localStorage.setItem(
        userKey("account_sync_last_error_v1"),
        JSON.stringify({
          at: new Date().toISOString(),
          phase: String(phase || "unknown"),
          code: info.rawCode,
          message: info.message,
          transient: !!transient,
        })
      );
      writeTechnicalLog({
        category: "SYNC_ERROR",
        operation: String(phase || "unknown"),
        result: "failure",
        severity: transient ? "warning" : "error",
        errorCode: info.rawCode,
        metadata: {
          transient: !!transient,
          message: String(info.message || "").slice(0, 180),
        },
      }).catch(function () {});
    } catch (_e) {}
  }
  function markAccountSyncPendingOnDevice() {
    if (!userId) return;
    try {
      localStorage.setItem(userKey("account_sync_pending_v1"), "1");
    } catch (e) {}
  }
  function clearAccountSyncPendingOnDevice() {
    if (!userId) return;
    try {
      localStorage.removeItem(userKey("account_sync_pending_v1"));
    } catch (e) {}
  }
  function restoreAccountSyncPendingFromDevice() {
    if (!userId) return false;
    try {
      if (localStorage.getItem(userKey("account_sync_pending_v1")) !== "1")
        return false;
      var prev: any = pendingAccountSyncRef.current || {
        revision: 0,
        token: "",
      };
      if (Number(prev.revision || 0) <= 0)
        pendingAccountSyncRef.current = { revision: 1, token: "" };
      return true;
    } catch (e) {
      return false;
    }
  }
  function beginRemoteApply() {
    if (
      Number(
        (pendingAccountSyncRef.current &&
          pendingAccountSyncRef.current.revision) ||
          0
      ) > 0
    )
      scheduleCompleteAccountRecoverySnapshot("before-cloud-merge");
    remoteApplyDepthRef.current = Number(remoteApplyDepthRef.current || 0) + 1;
    applyingFirestoreRef.current = true;
  }
  function endRemoteApply() {
    remoteApplyDepthRef.current = Math.max(
      0,
      Number(remoteApplyDepthRef.current || 0) - 1
    );
    applyingFirestoreRef.current = remoteApplyDepthRef.current > 0;
  }
  var accountRecoveryTimerRef = useRef<any>(null);
  var ACCOUNT_RECOVERY_KEYS = [
    "exp_v10",
    "inc_v10",
    "rec_v10",
    "goals_v1",
    "alerts_v1",
    "budget_plan_v1",
    "cats_v10",
    "meth_v10",
    "expense_groups_v1",
    "income_groups_v1",
    "method_groups_v1",
    "custom_income_types_v1",
    "income_type_overrides_v1",
    "cat_order_v1",
    "method_order_v1",
    "cat_sort_mode",
    "method_sort_mode",
    "income_type_order_v1",
    "default_expense_cat_v1",
    "default_expense_method_v1",
    "default_income_type_v1",
    "default_expense_area_v1",
    "default_income_area_v1",
    "default_method_area_v1",
    "patrimonio_values_v1",
    "patrimonio_areas_v1",
    "patrimonio_entries_v1",
    "patrimonio_history_v1",
    "patrimonio_notes_v1",
    "appunti_documents_v1",
    "appunti_notes_v1",
    "bank_coords_v1",
    "credit_cards_v1",
    "share_projects_v1",
    "debt_credits_v1",
    "share_receipt_uploads_v1",
    "shopping_cards_v1",
    "shopping_items_v1",
    "shopping_lists",
    "shopping_deleted_records_v1",
    "shopping_areas_v1",
    "shopping_area_icons_v1",
    "shopping_bought_color_v1",
    "shopping_default_area_v1",
    "shopping_units_v1",
    "shopping_default_unit_v1",
    "shopping_product_sort_v1",
    "shopping_active_list_id_v2",
    "share_show_history_v1",
    "custom_notifs_v1",
    "notif_prefs_v1",
  ];
  function persistCompleteAccountRecoverySnapshot(reason?: string) {
    if (!userId) return;
    try {
      var values: any = {};
      ACCOUNT_RECOVERY_KEYS.forEach(function (key) {
        var storageKey = userKey(key),
          raw = localStorage.getItem(storageKey);
        if (raw !== null) values[key] = raw;
      });
      var snapshot = JSON.stringify({
        schema: 1,
        userId: String(userId),
        savedAt: new Date().toISOString(),
        reason: String(reason || "change"),
        values: values,
      });
      var currentKey = userKey("account_recovery_complete_v1"),
        previousKey = userKey("account_recovery_complete_previous_v1");
      var previous = localStorage.getItem(currentKey);
      if (previous) localStorage.setItem(previousKey, previous);
      localStorage.setItem(currentKey, snapshot);
      try {
        createAutomaticAccountBackup({
          uid: String(userId),
          snapshot: JSON.parse(snapshot),
          reason: String(reason || "change"),
          appVersion: String(FAINANCE_CURRENT_VERSION || "2.0 Test"),
        }).catch(function () {});
      } catch (_backupError) {}
    } catch (e) {
      console.warn("Account recovery snapshot skipped", (e && e.message) || e);
    }
  }
  function scheduleCompleteAccountRecoverySnapshot(reason?: string) {
    try {
      if (accountRecoveryTimerRef.current)
        clearTimeout(accountRecoveryTimerRef.current);
    } catch (e) {}
    accountRecoveryTimerRef.current = setTimeout(function () {
      accountRecoveryTimerRef.current = null;
      var run = function () {
        persistCompleteAccountRecoverySnapshot(reason || "change");
      };
      try {
        var idle = (window as any).requestIdleCallback;
        if (idle) {
          idle(run, { timeout: 1800 });
          return;
        }
      } catch (e) {}
      setTimeout(run, 0);
    }, 3200);
  }
  function markPendingAccountSync() {
    if (applyingFirestoreRef.current) return;
    var prev = pendingAccountSyncRef.current || { revision: 0, token: "" };
    pendingAccountSyncRef.current = {
      revision: Number(prev.revision || 0) + 1,
      token: "",
    };
    markAccountSyncPendingOnDevice();
    scheduleCompleteAccountRecoverySnapshot("local-change");
    if (accountSyncSavingRef.current)
      accountSyncRetryRequestedRef.current = true;
  }
  useEffect(
    function () {
      function onStorageWrite(ev: any) {
        if (applyingFirestoreRef.current) return;
        var key = String((ev && ev.detail && ev.detail.key) || "");
        if (!key || key.indexOf("user_" + userId + "_") !== 0) return;
        markPendingAccountSync();
      }
      try {
        window.addEventListener(
          "fainance-storage-write",
          onStorageWrite as any
        );
      } catch (e) {}
      return function () {
        try {
          window.removeEventListener(
            "fainance-storage-write",
            onStorageWrite as any
          );
        } catch (e) {}
      };
    },
    [userId]
  );

  var [lang, setLang] = useStorage("pref_lang_v2", getDefaultLang());
  var CATALOG_SYNC_V3_KEYS = {
    cats_v10: true,
    meth_v10: true,
    expense_groups_v1: true,
    income_groups_v1: true,
    method_groups_v1: true,
    custom_income_types_v1: true,
    income_type_overrides_v1: true,
    cat_order_v1: true,
    method_order_v1: true,
    cat_sort_mode: true,
    method_sort_mode: true,
    default_expense_cat_v1: true,
    default_expense_method_v1: true,
    default_income_type_v1: true,
    default_expense_area_v1: true,
    default_income_area_v1: true,
    default_method_area_v1: true,
    income_type_order_v1: true,
  };
  function isCatalogSyncV3StorageKey(key) {
    return !!CATALOG_SYNC_V3_KEYS[String(key || "")];
  }
  function readCatalogSyncMetaV3() {
    try {
      var raw = localStorage.getItem(userKey("catalog_sync_meta_v3"));
      var parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || Number(parsed.schemaVersion || 0) !== 3) return null;
      return {
        schemaVersion: 3,
        revision: Math.max(0, Number(parsed.revision || 0)),
        updatedAtMs: Math.max(0, Number(parsed.updatedAtMs || 0)),
        writerId: String(parsed.writerId || ""),
      };
    } catch (e) {
      return null;
    }
  }
  function writeCatalogSyncMetaV3(value) {
    if (!value) return;
    try {
      localStorage.setItem(
        userKey("catalog_sync_meta_v3"),
        JSON.stringify({
          schemaVersion: 3,
          revision: Math.max(0, Number(value.revision || 0)),
          updatedAtMs: Math.max(0, Number(value.updatedAtMs || 0)),
          writerId: String(value.writerId || ""),
        })
      );
    } catch (e) {}
  }
  function catalogSyncWriterId() {
    var key = "fainance_catalog_sync_writer_v3";
    try {
      var current = String(localStorage.getItem(key) || "");
      if (current) return current;
      var next =
        "device_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 10);
      localStorage.setItem(key, next);
      return next;
    } catch (e) {
      return "device_unknown";
    }
  }
  function touchCatalogSyncMetaV3(nowValue?: number) {
    if (applyingFirestoreRef.current) return null;
    var current = readCatalogSyncMetaV3() || {
      schemaVersion: 3,
      revision: 0,
      updatedAtMs: 0,
      writerId: "",
    };
    var next = {
      schemaVersion: 3,
      revision: Math.max(0, Number(current.revision || 0)) + 1,
      updatedAtMs: Math.max(Date.now(), Number(nowValue || 0)),
      writerId: catalogSyncWriterId(),
    };
    writeCatalogSyncMetaV3(next);
    return next;
  }
  function compareCatalogSyncMetaV3(localMeta, cloudMeta) {
    if (!localMeta && !cloudMeta) return "legacy";
    if (localMeta && !cloudMeta) return "local";
    if (!localMeta && cloudMeta) return "cloud";
    var localTs = Number((localMeta && localMeta.updatedAtMs) || 0),
      cloudTs = Number((cloudMeta && cloudMeta.updatedAtMs) || 0);
    if (localTs > cloudTs) return "local";
    if (cloudTs > localTs) return "cloud";
    var localRevision = Number((localMeta && localMeta.revision) || 0),
      cloudRevision = Number((cloudMeta && cloudMeta.revision) || 0);
    if (localRevision > cloudRevision) return "local";
    if (cloudRevision > localRevision) return "cloud";
    var localWriter = String((localMeta && localMeta.writerId) || ""),
      cloudWriter = String((cloudMeta && cloudMeta.writerId) || "");
    if (localWriter && cloudWriter && localWriter !== cloudWriter)
      return localWriter > cloudWriter ? "local" : "cloud";
    return "local";
  }
  function readUserLocalJson(key, fallback) {
    try {
      var raw = localStorage.getItem(userKey(key));
      if (raw !== null && raw !== "") return JSON.parse(raw);
      // I cataloghi e le relative preferenze non vengono mai ripristinati
      // automaticamente da snapshot storici. Un backup resta disponibile per
      // un ripristino esplicito, ma non puo' piu' diventare autorevole da solo.
      if (isCatalogSyncV3StorageKey(key)) return fallback;
      var recoveryKeys = [
        userKey("account_recovery_complete_v1"),
        userKey("account_recovery_complete_previous_v1"),
      ];
      for (var i = 0; i < recoveryKeys.length; i++) {
        try {
          var snapRaw = localStorage.getItem(recoveryKeys[i]);
          if (!snapRaw) continue;
          var snap = JSON.parse(snapRaw),
            saved = snap && snap.values ? snap.values[key] : null;
          if (saved !== null && saved !== undefined && saved !== "") {
            localStorage.setItem(userKey(key), String(saved));
            return JSON.parse(String(saved));
          }
        } catch (_e) {}
      }
      return fallback;
    } catch (e) {
      return fallback;
    }
  }
  function restoreLocalJson(key, value) {
    try {
      if (value !== undefined)
        localStorage.setItem(userKey(key), JSON.stringify(value));
    } catch (e) {}
  }
  function markUserLocalChange(key) {
    markPendingAccountSync();
    var now = Date.now();
    try {
      localStorage.setItem(userKey(key + "_updated_at"), String(now));
    } catch (e) {}
    if (
      key === "category_preferences_v2" ||
      key === "expense_catalog_v2" ||
      key === "payment_catalog_v2" ||
      key === "income_catalog_v2" ||
      key === "cats" ||
      key === "methods"
    )
      touchCatalogSyncMetaV3(now);
  }
  function markUserLocalChanges(keys) {
    if (applyingFirestoreRef.current) return;
    markPendingAccountSync();
    var now = Date.now();
    (Array.isArray(keys) ? keys : []).forEach(function (key) {
      try {
        localStorage.setItem(userKey(String(key) + "_updated_at"), String(now));
      } catch (e) {}
    });
    if (
      (Array.isArray(keys) ? keys : []).some(function (key) {
        return (
          key === "category_preferences_v2" ||
          key === "expense_catalog_v2" ||
          key === "payment_catalog_v2" ||
          key === "income_catalog_v2" ||
          key === "cats" ||
          key === "methods"
        );
      })
    )
      touchCatalogSyncMetaV3(now);
  }
  function readUserLocalUpdatedAt(key) {
    try {
      return Number(localStorage.getItem(userKey(key + "_updated_at")) || 0);
    } catch (e) {
      return 0;
    }
  }
  function writeUserLocalUpdatedAt(key, value) {
    try {
      var ts = Math.max(0, Number(value || 0));
      if (ts) localStorage.setItem(userKey(key + "_updated_at"), String(ts));
    } catch (e) {}
  }

  function shoppingSyncRecordKey(item) {
    if (!item || typeof item !== "object") return "";
    if (item.archived) {
      var pid =
        shoppingExplicitProductId(item) ||
        String(item.id || "") ||
        shoppingRecoveredProductId(shoppingProductIdentity(item));
      return "product:" + pid;
    }
    return (
      "item:" +
      String(
        item.id || shoppingRecoveredProductId(shoppingProductIdentity(item))
      )
    );
  }
  function shoppingListSyncKey(item) {
    return item && item.id !== undefined ? "list:" + String(item.id) : "";
  }
  function shoppingCardSyncKey(item) {
    return item && item.id !== undefined ? "card:" + String(item.id) : "";
  }
  function readLegacyRecoveryArray(key) {
    if (typeof localStorage === "undefined") return [];
    var values = [];
    [userKey(key), userKey("recovery_legacy_" + key), key].forEach(function (
      storageKey
    ) {
      try {
        var raw = localStorage.getItem(storageKey);
        if (!raw) return;
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) values.push(parsed);
      } catch (e) {}
    });
    return values;
  }
  function mergeShoppingRecoveryArrays(arrays, keyFn) {
    var out = [];
    var seen = {};
    (arrays || []).forEach(function (list) {
      (Array.isArray(list) ? list : []).forEach(function (item) {
        var key = keyFn(item);
        if (!key || seen[key]) return;
        seen[key] = true;
        out.push(item);
      });
    });
    return out;
  }
  function shoppingRecoveryState() {
    var currentItems = normalizeShoppingItemsData(
      readUserLocalJson("shopping_items_v1", [])
    );
    var itemSources = readLegacyRecoveryArray("shopping_items_v1");
    var cardSources = readLegacyRecoveryArray("shopping_cards_v1");
    var listSources = readLegacyRecoveryArray("shopping_lists_v2");
    var items = normalizeShoppingItemsData(
      mergeShoppingRecoveryArrays(
        [currentItems].concat(itemSources),
        shoppingSyncRecordKey
      )
    );
    var cards = mergeShoppingRecoveryArrays(cardSources, shoppingCardSyncKey);
    var lists = mergeShoppingRecoveryArrays(listSources, shoppingListSyncKey);
    var recovered =
      items.length > currentItems.length ||
      cards.length >
        (Array.isArray(shoppingCardsRef.current)
          ? shoppingCardsRef.current.length
          : 0) ||
      lists.length >
        (Array.isArray(shoppingListsRef.current)
          ? shoppingListsRef.current.length
          : 0);
    return { items: items, cards: cards, lists: lists, recovered: recovered };
  }
  function preserveShoppingRecoverySnapshot(items, lists, cards) {
    try {
      var key = userKey("shopping_recovery_snapshot_v1");
      var current = { items: [], lists: [], cards: [] };
      try {
        var raw = localStorage.getItem(key);
        if (raw) current = JSON.parse(raw) || current;
      } catch (e) {}
      var mergedItems = mergeShoppingRecoveryArrays(
        [current.items, items],
        shoppingSyncRecordKey
      );
      var mergedLists = mergeShoppingRecoveryArrays(
        [current.lists, lists],
        shoppingListSyncKey
      );
      var mergedCards = mergeShoppingRecoveryArrays(
        [current.cards, cards],
        shoppingCardSyncKey
      );
      if (mergedItems.length || mergedLists.length || mergedCards.length)
        localStorage.setItem(
          key,
          JSON.stringify({
            items: mergedItems,
            lists: mergedLists,
            cards: mergedCards,
            savedAt: new Date().toISOString(),
          })
        );
    } catch (e) {}
  }
  function readShoppingRecoverySnapshot() {
    try {
      var raw = localStorage.getItem(userKey("shopping_recovery_snapshot_v1"));
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object"
        ? parsed
        : { items: [], lists: [], cards: [] };
    } catch (e) {
      return { items: [], lists: [], cards: [] };
    }
  }
  function removeTombstonesForShoppingRecords(tombstones, items, lists, cards) {
    var out = { ...(tombstones || {}) };
    (items || []).forEach(function (item) {
      var key = shoppingSyncRecordKey(item);
      if (key) delete out[key];
    });
    (lists || []).forEach(function (item) {
      var key = shoppingListSyncKey(item);
      if (key) delete out[key];
    });
    (cards || []).forEach(function (item) {
      var key = shoppingCardSyncKey(item);
      if (key) delete out[key];
    });
    return out;
  }
  function markHomePreferencesChange() {
    if (!applyingFirestoreRef.current) markUserLocalChange("home_preferences");
  }
  function markCategoryPreferencesChange() {
    if (!applyingFirestoreRef.current)
      markUserLocalChange("category_preferences_v2");
  }
  function markDisplayPreferencesChange() {
    if (!applyingFirestoreRef.current)
      markUserLocalChange("display_preferences_v2");
  }
  function markPatrimonyPreferencesChange() {
    if (!applyingFirestoreRef.current)
      markUserLocalChange("patrimony_preferences_v2");
  }
  function markShoppingPreferencesChange() {
    if (!applyingFirestoreRef.current)
      markUserLocalChange("shopping_preferences_v2");
  }
  function normalizeHomeWorkletsValue(value, fallback) {
    if (!Array.isArray(value)) return Array.isArray(fallback) ? fallback : [];
    var valid = value.filter(function (item) {
      return (
        !!item &&
        typeof item === "object" &&
        String(item.id || "").length > 0 &&
        String(item.type || "").length > 0
      );
    });
    return value.length > 0 && valid.length === 0
      ? Array.isArray(fallback)
        ? fallback
        : []
      : valid;
  }
  function normalizeStringOrderValue(value, fallback) {
    var source = Array.isArray(value) ? value : [];
    var seen = {};
    var out = [];
    source.forEach(function (item) {
      var id = String(item || "");
      if (id && !seen[id]) {
        seen[id] = true;
        out.push(id);
      }
    });
    return out.length ? out : Array.isArray(fallback) ? fallback.slice() : [];
  }

  var [accountDeletedRecords, setAccountDeletedRecordsRaw] = useStorage(
    userKey("account_deleted_records_v1"),
    {}
  );
  function mergeAccountDeletedRecords(patch) {
    setAccountDeletedRecordsRaw(function (current) {
      return mergeSyncTombstones(current, patch);
    });
  }
  function prepareAccountCollectionWrite(namespace, current, nextValue) {
    var source = Array.isArray(nextValue) ? nextValue : [];
    var keyFn = function (item) {
      return accountSyncRecordKey(namespace, item);
    };
    mergeAccountDeletedRecords(
      removedSyncRecordTombstones(current, source, keyFn)
    );
    return stampLocalSyncRecords(current, source, keyFn);
  }
  var [expenses, setExpensesRaw] = useStorage(userKey("exp_v10"), []);
  var expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  function setExpenses(nextValue) {
    var current = Array.isArray(expensesRef.current) ? expensesRef.current : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("expense", current, requested);
    expensesRef.current = prepared;
    return setExpensesRaw(prepared);
  }
  var [incomes, setIncomesRaw] = useStorage(userKey("inc_v10"), []);
  var incomesRef = useRef(incomes);
  incomesRef.current = incomes;
  function setIncomes(nextValue) {
    var current = Array.isArray(incomesRef.current) ? incomesRef.current : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("income", current, requested);
    incomesRef.current = prepared;
    return setIncomesRaw(prepared);
  }
  var [cats, setCatsRaw] = useStorage(userKey("cats_v10"), DEFAULT_CATS);
  function setCats(nextCats) {
    if (!applyingFirestoreRef.current)
      markUserLocalChanges(["cats", "expense_catalog_v2"]);
    return setCatsRaw(
      resolveDefaultProtectedNext(
        nextCats,
        cats,
        DEFAULT_CATS,
        DEFAULT_EXPENSE_CATEGORY_NAMES
      )
    );
  }
  cats = defaultProtectedArray(
    cats,
    DEFAULT_CATS,
    DEFAULT_EXPENSE_CATEGORY_NAMES
  );
  var [methods, setMethodsRaw] = useStorage(
    userKey("meth_v10"),
    DEFAULT_METHODS
  );
  function setMethods(nextMethods) {
    if (!applyingFirestoreRef.current)
      markUserLocalChanges(["methods", "payment_catalog_v2"]);
    return setMethodsRaw(
      resolveDefaultProtectedNext(
        nextMethods,
        methods,
        DEFAULT_METHODS,
        DEFAULT_METHOD_NAMES
      )
    );
  }
  methods = defaultProtectedArray(
    methods,
    DEFAULT_METHODS,
    DEFAULT_METHOD_NAMES
  );
  var [methodGroups, setMethodGroupsRaw] = useStorage(
    userKey("method_groups_v1"),
    DEFAULT_METHOD_GROUPS
  );
  function setMethodGroups(nextGroups) {
    if (!applyingFirestoreRef.current)
      markUserLocalChanges(["payment_catalog_v2"]);
    return setMethodGroupsRaw(
      resolveDefaultProtectedNext(
        nextGroups,
        methodGroups,
        DEFAULT_METHOD_GROUPS,
        DEFAULT_METHOD_GROUP_NAMES
      )
    );
  }
  methodGroups = defaultProtectedArray(
    methodGroups,
    DEFAULT_METHOD_GROUPS,
    DEFAULT_METHOD_GROUP_NAMES
  );
  var [expenseGroups, setExpenseGroupsRaw] = useStorage(
    userKey("expense_groups_v1"),
    DEFAULT_EXPENSE_GROUPS
  );
  function setExpenseGroups(nextGroups) {
    if (!applyingFirestoreRef.current)
      markUserLocalChanges(["expense_catalog_v2"]);
    return setExpenseGroupsRaw(
      resolveDefaultProtectedNext(
        nextGroups,
        expenseGroups,
        DEFAULT_EXPENSE_GROUPS,
        DEFAULT_EXPENSE_GROUP_NAMES
      )
    );
  }
  expenseGroups = defaultProtectedArray(
    expenseGroups,
    DEFAULT_EXPENSE_GROUPS,
    DEFAULT_EXPENSE_GROUP_NAMES
  );
  var [incomeGroups, setIncomeGroupsRaw] = useStorage(
    userKey("income_groups_v1"),
    DEFAULT_INCOME_GROUPS
  );
  function setIncomeGroups(nextGroups) {
    if (!applyingFirestoreRef.current)
      markUserLocalChanges(["income_catalog_v2"]);
    return setIncomeGroupsRaw(
      resolveDefaultProtectedNext(
        nextGroups,
        incomeGroups,
        DEFAULT_INCOME_GROUPS
      )
    );
  }
  incomeGroups = defaultProtectedArray(incomeGroups, DEFAULT_INCOME_GROUPS);
  useEffect(
    function () {
      var nextCats = translateDefaultCollection(
        cats,
        DEFAULT_CATS,
        DEFAULT_EXPENSE_CATEGORY_NAMES,
        lang
      );
      var nextExpenseGroups = translateDefaultCollection(
        expenseGroups,
        DEFAULT_EXPENSE_GROUPS,
        DEFAULT_EXPENSE_GROUP_NAMES,
        lang
      );
      var nextMethods = translateDefaultCollection(
        methods,
        DEFAULT_METHODS,
        DEFAULT_METHOD_NAMES,
        lang
      );
      var nextMethodGroups = translateDefaultCollection(
        methodGroups,
        DEFAULT_METHOD_GROUPS,
        DEFAULT_METHOD_GROUP_NAMES,
        lang
      );
      if (!sameNamedItems(cats, nextCats)) setCats(nextCats);
      if (!sameNamedItems(expenseGroups, nextExpenseGroups))
        setExpenseGroups(nextExpenseGroups);
      if (!sameNamedItems(methods, nextMethods)) setMethods(nextMethods);
      if (!sameNamedItems(methodGroups, nextMethodGroups))
        setMethodGroups(nextMethodGroups);
    },
    [lang, cats, expenseGroups, methods, methodGroups]
  );
  var [customIncomeTypes, setCustomIncomeTypesRaw] = useStorage(
    userKey("custom_income_types_v1"),
    []
  );
  function setCustomIncomeTypes(nextValue) {
    if (!applyingFirestoreRef.current)
      markUserLocalChanges(["income_catalog_v2"]);
    return setCustomIncomeTypesRaw(nextValue);
  }
  var [incomeTypeOverrides, setIncomeTypeOverridesRaw] = useStorage(
    userKey("income_type_overrides_v1"),
    {}
  );
  function setIncomeTypeOverrides(nextValue) {
    if (!applyingFirestoreRef.current)
      markUserLocalChanges(["income_catalog_v2"]);
    return setIncomeTypeOverridesRaw(nextValue);
  }
  var incomeTypes = useMemo(
    function () {
      return getAllIncomeTypes(customIncomeTypes, incomeTypeOverrides).filter(
        function (x) {
          return !x.deleted && !x.archived;
        }
      );
    },
    [customIncomeTypes, incomeTypeOverrides]
  );

  function parseCatalogStorageValue(storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      if (raw === null || raw === undefined || raw === "") return undefined;
      return JSON.parse(raw);
    } catch (e) {
      return undefined;
    }
  }
  function catalogRecoverySnapshotValues(storageKey) {
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      var snap = JSON.parse(raw);
      return snap && snap.values && typeof snap.values === "object"
        ? snap.values
        : null;
    } catch (e) {
      return null;
    }
  }
  function catalogValueFromSnapshot(values, key) {
    if (!values || values[key] === undefined || values[key] === null)
      return undefined;
    try {
      return typeof values[key] === "string"
        ? JSON.parse(values[key])
        : values[key];
    } catch (e) {
      return undefined;
    }
  }
  function protectedCollectionEvidence(value, defaults, dict) {
    var arr = Array.isArray(value) ? value : [];
    var score = 0;
    arr.forEach(function (item) {
      if (!item) return;
      if (isCustomizedStoredItem(item, defaults, dict)) score += 10000;
      if (item.deleted || item.archived) score += 750;
      if (item.custom || item.userCreated || item.recovered) score += 1250;
    });
    return score + arr.length;
  }
  function paymentCatalogEvidence(catalog) {
    var c = catalog || {};
    return (
      protectedCollectionEvidence(
        c.methods,
        DEFAULT_METHODS,
        DEFAULT_METHOD_NAMES
      ) *
        10 +
      protectedCollectionEvidence(
        c.groups,
        DEFAULT_METHOD_GROUPS,
        DEFAULT_METHOD_GROUP_NAMES
      )
    );
  }
  function incomeCatalogEvidence(catalog) {
    var c = catalog || {};
    var custom = Array.isArray(c.customTypes) ? c.customTypes : [];
    var overrides =
      c.overrides && typeof c.overrides === "object" ? c.overrides : {};
    return (
      custom.length * 100000 +
      Object.keys(overrides).length * 50000 +
      protectedCollectionEvidence(c.groups, DEFAULT_INCOME_GROUPS, null)
    );
  }
  function expenseCatalogEvidence(catalog) {
    var c = catalog || {};
    return (
      protectedCollectionEvidence(
        c.categories,
        DEFAULT_CATS,
        DEFAULT_EXPENSE_CATEGORY_NAMES
      ) *
        10 +
      protectedCollectionEvidence(
        c.groups,
        DEFAULT_EXPENSE_GROUPS,
        DEFAULT_EXPENSE_GROUP_NAMES
      )
    );
  }
  function chooseWholeCatalog(
    localCatalog,
    cloudCatalog,
    localTs,
    cloudTs,
    readOnlyBuild,
    evidenceFn,
    cloudExists
  ) {
    if (cloudExists && Number(cloudTs || 0) > Number(localTs || 0))
      return { source: "cloud", value: cloudCatalog };
    if (Number(localTs || 0) > Number(cloudTs || 0))
      return { source: "local", value: localCatalog };
    // Non usare mai il numero di voci, personalizzazioni o tombstone come
    // criterio di autorita': quel punteggio faceva riapparire cataloghi vecchi.
    if (
      cloudExists &&
      Number(localTs || 0) <= 0 &&
      Number(cloudTs || 0) <= 0
    )
      return { source: "cloud", value: cloudCatalog };
    if (cloudExists && syncJsonEqual(localCatalog, cloudCatalog))
      return { source: "cloud", value: cloudCatalog };
    return { source: "local", value: localCatalog };
  }
  function buildCatalogRecoverySources() {
    var sources: any[] = [];
    function push(name, values) {
      if (!values) return;
      sources.push({
        name: name,
        methods: values.methods,
        methodGroups: values.methodGroups,
        methodOrder: values.methodOrder,
        methodSortMode: values.methodSortMode,
        defaultExpenseMethod: values.defaultExpenseMethod,
        defaultMethodArea: values.defaultMethodArea,
        incomeGroups: values.incomeGroups,
        customIncomeTypes: values.customIncomeTypes,
        incomeTypeOverrides: values.incomeTypeOverrides,
        incomeTypeOrder: values.incomeTypeOrder,
        defaultIncomeType: values.defaultIncomeType,
        defaultIncomeArea: values.defaultIncomeArea,
      });
    }
    push("current", {
      methods: methods,
      methodGroups: methodGroups,
      methodOrder: methodOrder,
      methodSortMode: methodSortMode,
      defaultExpenseMethod: defaultExpenseMethod,
      defaultMethodArea: defaultMethodArea,
      incomeGroups: incomeGroups,
      customIncomeTypes: customIncomeTypes,
      incomeTypeOverrides: incomeTypeOverrides,
      incomeTypeOrder: incomeTypeOrder,
      defaultIncomeType: defaultIncomeType,
      defaultIncomeArea: defaultIncomeArea,
    });
    push("legacy-recovery", {
      methods: parseCatalogStorageValue(userKey("recovery_legacy_meth_v10")),
      methodGroups: parseCatalogStorageValue(
        userKey("recovery_legacy_method_groups_v1")
      ),
      methodOrder: parseCatalogStorageValue(
        userKey("recovery_legacy_method_order_v1")
      ),
      methodSortMode: parseCatalogStorageValue(
        userKey("recovery_legacy_method_sort_mode")
      ),
      defaultExpenseMethod: parseCatalogStorageValue(
        userKey("recovery_legacy_default_expense_method_v1")
      ),
      defaultMethodArea: parseCatalogStorageValue(
        userKey("recovery_legacy_default_method_area_v1")
      ),
      incomeGroups: parseCatalogStorageValue(
        userKey("recovery_legacy_income_groups_v1")
      ),
      customIncomeTypes: parseCatalogStorageValue(
        userKey("recovery_legacy_custom_income_types_v1")
      ),
      incomeTypeOverrides: parseCatalogStorageValue(
        userKey("recovery_legacy_income_type_overrides_v1")
      ),
      incomeTypeOrder: parseCatalogStorageValue(
        userKey("recovery_legacy_income_type_order_v1")
      ),
      defaultIncomeType: parseCatalogStorageValue(
        userKey("recovery_legacy_default_income_type_v1")
      ),
      defaultIncomeArea: parseCatalogStorageValue(
        userKey("recovery_legacy_default_income_area_v1")
      ),
    });
    var legacyOwner = String(
      localStorage.getItem("fainance_legacy_storage_owner_uid_v2") || ""
    );
    if (!legacyOwner || legacyOwner === String(userId)) {
      push("legacy-unscoped", {
        methods: parseCatalogStorageValue("meth_v10"),
        methodGroups: parseCatalogStorageValue("method_groups_v1"),
        methodOrder: parseCatalogStorageValue("method_order_v1"),
        methodSortMode: parseCatalogStorageValue("method_sort_mode"),
        defaultExpenseMethod: parseCatalogStorageValue(
          "default_expense_method_v1"
        ),
        defaultMethodArea: parseCatalogStorageValue("default_method_area_v1"),
        incomeGroups: parseCatalogStorageValue("income_groups_v1"),
        customIncomeTypes: parseCatalogStorageValue("custom_income_types_v1"),
        incomeTypeOverrides: parseCatalogStorageValue(
          "income_type_overrides_v1"
        ),
        incomeTypeOrder: parseCatalogStorageValue("income_type_order_v1"),
        defaultIncomeType: parseCatalogStorageValue("default_income_type_v1"),
        defaultIncomeArea: parseCatalogStorageValue("default_income_area_v1"),
      });
    }
    [
      ["snapshot-current", userKey("account_recovery_complete_v1")],
      ["snapshot-previous", userKey("account_recovery_complete_previous_v1")],
    ].forEach(function (entry) {
      var values = catalogRecoverySnapshotValues(entry[1]);
      if (!values) return;
      push(entry[0], {
        methods: catalogValueFromSnapshot(values, "meth_v10"),
        methodGroups: catalogValueFromSnapshot(values, "method_groups_v1"),
        methodOrder: catalogValueFromSnapshot(values, "method_order_v1"),
        methodSortMode: catalogValueFromSnapshot(values, "method_sort_mode"),
        defaultExpenseMethod: catalogValueFromSnapshot(
          values,
          "default_expense_method_v1"
        ),
        defaultMethodArea: catalogValueFromSnapshot(
          values,
          "default_method_area_v1"
        ),
        incomeGroups: catalogValueFromSnapshot(values, "income_groups_v1"),
        customIncomeTypes: catalogValueFromSnapshot(
          values,
          "custom_income_types_v1"
        ),
        incomeTypeOverrides: catalogValueFromSnapshot(
          values,
          "income_type_overrides_v1"
        ),
        incomeTypeOrder: catalogValueFromSnapshot(
          values,
          "income_type_order_v1"
        ),
        defaultIncomeType: catalogValueFromSnapshot(
          values,
          "default_income_type_v1"
        ),
        defaultIncomeArea: catalogValueFromSnapshot(
          values,
          "default_income_area_v1"
        ),
      });
    });
    function parsedCatalogField(container, names) {
      if (!container || typeof container !== "object") return undefined;
      for (var ni = 0; ni < names.length; ni++) {
        var value = container[names[ni]];
        if (value === undefined || value === null || value === "") continue;
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch (e) {
            continue;
          }
        }
        return value;
      }
      return undefined;
    }
    function inspectHistoricalContainer(name, container, depth, seen) {
      if (!container || typeof container !== "object" || depth > 4) return;
      if (seen.indexOf(container) >= 0) return;
      seen.push(container);
      var candidate = {
        methods: parsedCatalogField(container, [
          "meth_v10",
          "methods",
          "paymentMethods",
          "payment_methods",
        ]),
        methodGroups: parsedCatalogField(container, [
          "method_groups_v1",
          "methodGroups",
          "paymentMethodGroups",
          "payment_method_groups",
        ]),
        methodOrder: parsedCatalogField(container, [
          "method_order_v1",
          "methodOrder",
        ]),
        methodSortMode: parsedCatalogField(container, [
          "method_sort_mode",
          "methodSortMode",
        ]),
        defaultExpenseMethod: parsedCatalogField(container, [
          "default_expense_method_v1",
          "defaultExpenseMethod",
        ]),
        defaultMethodArea: parsedCatalogField(container, [
          "default_method_area_v1",
          "defaultMethodArea",
        ]),
        incomeGroups: parsedCatalogField(container, [
          "income_groups_v1",
          "incomeGroups",
          "incomeCategoryGroups",
        ]),
        customIncomeTypes: parsedCatalogField(container, [
          "custom_income_types_v1",
          "customIncomeTypes",
          "incomeCategories",
          "incomeTypes",
        ]),
        incomeTypeOverrides: parsedCatalogField(container, [
          "income_type_overrides_v1",
          "incomeTypeOverrides",
        ]),
        incomeTypeOrder: parsedCatalogField(container, [
          "income_type_order_v1",
          "incomeTypeOrder",
        ]),
        defaultIncomeType: parsedCatalogField(container, [
          "default_income_type_v1",
          "defaultIncomeType",
        ]),
        defaultIncomeArea: parsedCatalogField(container, [
          "default_income_area_v1",
          "defaultIncomeArea",
        ]),
      };
      if (
        candidate.methods !== undefined ||
        candidate.methodGroups !== undefined ||
        candidate.customIncomeTypes !== undefined ||
        candidate.incomeTypeOverrides !== undefined ||
        candidate.incomeGroups !== undefined
      )
        push(name, candidate);
      [
        "values",
        "data",
        "payload",
        "backup",
        "account",
        "accountData",
        "state",
        "settings",
        "userData",
        "content",
        "snapshot",
      ].forEach(function (childKey) {
        var child = container[childKey];
        if (child && typeof child === "object")
          inspectHistoricalContainer(
            name + "/" + childKey,
            child,
            depth + 1,
            seen
          );
      });
    }
    try {
      var currentPrefix = "user_" + String(userId) + "_";
      for (var li = 0; li < localStorage.length; li++) {
        var storageName = String(localStorage.key(li) || "");
        if (
          !storageName ||
          (!storageName.startsWith(currentPrefix) &&
            storageName.indexOf("fainance") < 0)
        )
          continue;
        if (
          !/(recovery|backup|snapshot|restore|export|previous|legacy)/i.test(
            storageName
          )
        )
          continue;
        var storageRaw = localStorage.getItem(storageName);
        if (!storageRaw || storageRaw.length > 6000000) continue;
        try {
          inspectHistoricalContainer(
            "storage:" + storageName,
            JSON.parse(storageRaw),
            0,
            []
          );
        } catch (e) {}
      }
    } catch (e) {}
    return sources;
  }
  useEffect(
    function () {
      if (!userId || !sensitiveStorageReady) return;
      var marker = userKey("catalog_auto_recovery_disabled_v9");
      try {
        localStorage.setItem(marker, "1");
      } catch (e) {}
      // Gli snapshot restano disponibili come backup espliciti, ma non possono
      // piu' sostituire automaticamente cataloghi, riordini o valori predefiniti.
      return;
      var sources = buildCatalogRecoverySources();
      var currentPayment = { methods: methods, groups: methodGroups };
      var currentIncome = {
        groups: incomeGroups,
        customTypes: customIncomeTypes,
        overrides: incomeTypeOverrides,
      };
      var bestPayment: any = {
        name: "current",
        catalog: currentPayment,
        source: null,
        score: paymentCatalogEvidence(currentPayment),
      };
      var bestIncome: any = {
        name: "current",
        catalog: currentIncome,
        source: null,
        score: incomeCatalogEvidence(currentIncome),
      };
      sources.forEach(function (src) {
        var payment = {
          methods: Array.isArray(src.methods) ? src.methods : [],
          groups: Array.isArray(src.methodGroups) ? src.methodGroups : [],
        };
        var ps = paymentCatalogEvidence(payment);
        if (ps > bestPayment.score) {
          bestPayment = {
            name: src.name,
            catalog: payment,
            source: src,
            score: ps,
          };
        }
        var income = {
          groups: Array.isArray(src.incomeGroups) ? src.incomeGroups : [],
          customTypes: Array.isArray(src.customIncomeTypes)
            ? src.customIncomeTypes
            : [],
          overrides:
            src.incomeTypeOverrides &&
            typeof src.incomeTypeOverrides === "object"
              ? src.incomeTypeOverrides
              : {},
        };
        var ins = incomeCatalogEvidence(income);
        if (ins > bestIncome.score) {
          bestIncome = {
            name: src.name,
            catalog: income,
            source: src,
            score: ins,
          };
        }
      });
      var restorePayment =
        bestPayment.score > paymentCatalogEvidence(currentPayment);
      var restoreIncome =
        bestIncome.score > incomeCatalogEvidence(currentIncome);
      if (!restorePayment && !restoreIncome) {
        try {
          localStorage.setItem(marker, "1");
        } catch (e) {}
        try {
          if (localStorage.getItem(userKey("catalog_recovery_v7_done")) === "1")
            setToast({
              text: L(
                "Non è stata trovata sul dispositivo una copia precedente delle personalizzazioni. Usa un backup precedente per ripristinarle."
              ),
              type: "warning",
              icon: "⚠️",
            });
        } catch (e) {}
        return;
      }
      try {
        localStorage.setItem(
          userKey("catalog_recovery_v8_before"),
          JSON.stringify({
            savedAt: new Date().toISOString(),
            methods: methods,
            methodGroups: methodGroups,
            incomeGroups: incomeGroups,
            customIncomeTypes: customIncomeTypes,
            incomeTypeOverrides: incomeTypeOverrides,
          })
        );
      } catch (e) {}
      if (restorePayment) {
        var ps = bestPayment.source || {};
        restoreLocalJson("meth_v10", bestPayment.catalog.methods);
        restoreLocalJson("method_groups_v1", bestPayment.catalog.groups);
        if (Array.isArray(ps.methodOrder))
          restoreLocalJson("method_order_v1", ps.methodOrder);
        if (ps.methodSortMode !== undefined)
          restoreLocalJson("method_sort_mode", ps.methodSortMode);
        if (ps.defaultExpenseMethod !== undefined)
          restoreLocalJson(
            "default_expense_method_v1",
            ps.defaultExpenseMethod
          );
        if (ps.defaultMethodArea !== undefined)
          restoreLocalJson("default_method_area_v1", ps.defaultMethodArea);
        writeUserLocalUpdatedAt("methods", Date.now());
        writeUserLocalUpdatedAt("payment_catalog_v2", Date.now());
        setMethods(bestPayment.catalog.methods);
        setMethodGroups(bestPayment.catalog.groups);
        if (Array.isArray(ps.methodOrder)) setMethodOrder(ps.methodOrder);
        if (ps.methodSortMode !== undefined)
          setMethodSortMode(ps.methodSortMode);
        if (ps.defaultExpenseMethod !== undefined)
          setDefaultExpenseMethod(String(ps.defaultExpenseMethod || ""));
        if (ps.defaultMethodArea !== undefined)
          setDefaultMethodArea(String(ps.defaultMethodArea || "conti_carte"));
      }
      if (restoreIncome) {
        var ins = bestIncome.source || {};
        restoreLocalJson("income_groups_v1", bestIncome.catalog.groups);
        restoreLocalJson(
          "custom_income_types_v1",
          bestIncome.catalog.customTypes
        );
        restoreLocalJson(
          "income_type_overrides_v1",
          bestIncome.catalog.overrides
        );
        if (Array.isArray(ins.incomeTypeOrder))
          restoreLocalJson("income_type_order_v1", ins.incomeTypeOrder);
        if (ins.defaultIncomeType !== undefined)
          restoreLocalJson("default_income_type_v1", ins.defaultIncomeType);
        if (ins.defaultIncomeArea !== undefined)
          restoreLocalJson("default_income_area_v1", ins.defaultIncomeArea);
        writeUserLocalUpdatedAt("income_catalog_v2", Date.now());
        setIncomeGroups(bestIncome.catalog.groups);
        setCustomIncomeTypes(bestIncome.catalog.customTypes);
        setIncomeTypeOverrides(bestIncome.catalog.overrides);
        if (Array.isArray(ins.incomeTypeOrder))
          setIncomeTypeOrder(ins.incomeTypeOrder);
        if (ins.defaultIncomeType !== undefined)
          setDefaultIncomeType(String(ins.defaultIncomeType || ""));
        if (ins.defaultIncomeArea !== undefined)
          setDefaultIncomeArea(String(ins.defaultIncomeArea || "lavoro"));
      }
      try {
        localStorage.setItem(marker, "1");
      } catch (e) {}
      setToast({
        text: L("Personalizzazioni di categorie e metodi ripristinate."),
        type: "success",
        icon: "↩️",
      });
    },
    [userId, sensitiveStorageReady]
  );
  var [recurring, setRecurringRaw] = useStorage(userKey("rec_v10"), []);
  var recurringRef = useRef(recurring);
  recurringRef.current = recurring;
  function setRecurring(nextValue) {
    var current = Array.isArray(recurringRef.current)
      ? recurringRef.current
      : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("recurring", current, requested);
    recurringRef.current = prepared;
    return setRecurringRaw(prepared);
  }
  var [goals, setGoalsRaw] = useStorage(userKey("goals_v1"), DEFAULT_GOALS);
  var goalsRef = useRef(goals);
  goalsRef.current = goals;
  function setGoals(nextValue) {
    var current = Array.isArray(goalsRef.current) ? goalsRef.current : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("goal", current, requested);
    goalsRef.current = prepared;
    return setGoalsRaw(prepared);
  }
  var [alerts, setAlertsRaw] = useStorage(userKey("alerts_v1"), []);
  var alertsRef = useRef(alerts);
  alertsRef.current = alerts;
  function setAlerts(nextValue) {
    var current = Array.isArray(alertsRef.current) ? alertsRef.current : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("alert", current, requested);
    alertsRef.current = prepared;
    return setAlertsRaw(prepared);
  }
  var [budgetPlan, setBudgetPlan] = useStorage(
    userKey("budget_plan_v1"),
    DEFAULT_BUDGET_PLAN
  );
  var [patrimonioAreas, setPatrimonioAreas] = useStorage(
    userKey("patrimonio_areas_v1"),
    DEFAULT_PATRIMONIO_AREAS
  );
  var [patrimonioEntries, setPatrimonioEntries] = useStorage(
    userKey("patrimonio_entries_v1"),
    DEFAULT_PATRIMONIO_ENTRIES
  );
  var [patrimonioValues, setPatrimonioValues] = useStorage(
    userKey("patrimonio_values_v1"),
    {}
  );
  var [patrimonioMode, setPatrimonioModeRaw] = useStorage(
    userKey("patrimonio_mode_v1"),
    "manuale"
  );
  function setPatrimonioMode(value) {
    markPatrimonyPreferencesChange();
    return setPatrimonioModeRaw(value);
  }
  useEffect(
    function () {
      var nextPatrimonioAreas = translateDefaultCollection(
        patrimonioAreas,
        DEFAULT_PATRIMONIO_AREAS,
        DEFAULT_PATRIMONIO_AREA_NAMES,
        lang
      );
      var nextPatrimonioEntries = translateDefaultCollection(
        patrimonioEntries,
        DEFAULT_PATRIMONIO_ENTRIES,
        DEFAULT_PATRIMONIO_ENTRY_NAMES,
        lang
      );
      if (!sameNamedItems(patrimonioAreas, nextPatrimonioAreas))
        setPatrimonioAreas(nextPatrimonioAreas);
      if (!sameNamedItems(patrimonioEntries, nextPatrimonioEntries))
        setPatrimonioEntries(nextPatrimonioEntries);
    },
    [lang, patrimonioAreas, patrimonioEntries]
  );
  var webCategoryPreferenceTimerRef = useRef<any>(null);
  var webCategoryPreferencePatchRef = useRef<any>({});
  function queueWebCategoryPreferencePatch(patch: any) {
    if (!userId || applyingFirestoreRef.current) return;
    webCategoryPreferencePatchRef.current = {
      ...(webCategoryPreferencePatchRef.current || {}),
      ...(patch || {}),
    };
    // Cataloghi, ordine e default vengono salvati insieme dal sync compatto.
    // La precedente scrittura parziale Web poteva precedere il catalogo e
    // azzerare il default o riapplicare un ordine non piu' valido.
    markPendingAccountSync();
    return;
    try {
      if (webCategoryPreferenceTimerRef.current)
        clearTimeout(webCategoryPreferenceTimerRef.current);
    } catch (e) {}
    webCategoryPreferenceTimerRef.current = setTimeout(function () {
      webCategoryPreferenceTimerRef.current = null;
      var pending = webCategoryPreferencePatchRef.current || {};
      webCategoryPreferencePatchRef.current = {};
      try {
        var ts = Date.now();
        var prefs = { ...currentCategoryPreferencesV2(), ...pending };
        writeUserLocalUpdatedAt("category_preferences_v2", ts);
        setDoc(
          doc(fbDb, "userData", userId),
          {
            ...prefs,
            categoryPreferencesV2: prefs,
            categoryPreferencesUpdatedAt: ts,
            updatedAt: new Date(ts).toISOString(),
          },
          { merge: true }
        ).catch(function (err) {
          console.warn(
            "Web category preferences immediate sync failed",
            (err && err.code) || err
          );
          markPendingAccountSync();
        });
      } catch (err) {
        console.warn("Web category preferences immediate sync skipped", err);
        markPendingAccountSync();
      }
    }, 180);
  }
  var [catOrder, setCatOrderRaw] = useStorage(userKey("cat_order_v1"), []);
  function setCatOrder(value) {
    markCategoryPreferencesChange();
    var next = typeof value === "function" ? value(catOrder || []) : value;
    next = Array.isArray(next) ? next.map(String) : [];
    queueWebCategoryPreferencePatch({ catOrder: next });
    return setCatOrderRaw(next);
  }
  var [methodOrder, setMethodOrderRaw] = useStorage(
    userKey("method_order_v1"),
    []
  );
  function setMethodOrder(value) {
    markCategoryPreferencesChange();
    var next = typeof value === "function" ? value(methodOrder || []) : value;
    next = Array.isArray(next) ? next.map(String) : [];
    queueWebCategoryPreferencePatch({ methodOrder: next });
    return setMethodOrderRaw(next);
  }
  var [catSortMode, setCatSortModeRaw] = useStorage(
    userKey("cat_sort_mode"),
    "group"
  );
  function setCatSortMode(value) {
    markCategoryPreferencesChange();
    var next = typeof value === "function" ? value(catSortMode) : value;
    next = String(next || "group");
    queueWebCategoryPreferencePatch({ catSortMode: next });
    return setCatSortModeRaw(next);
  }
  var [methodSortMode, setMethodSortModeRaw] = useStorage(
    userKey("method_sort_mode"),
    "group"
  );
  function setMethodSortMode(value) {
    markCategoryPreferencesChange();
    var next = typeof value === "function" ? value(methodSortMode) : value;
    next = String(next || "group");
    queueWebCategoryPreferencePatch({ methodSortMode: next });
    return setMethodSortModeRaw(next);
  }
  var [currency, setCurrencyRaw] = useStorage(
    userKey("pref_cur"),
    getDefaultCurrency()
  );
  function setCurrency(value) {
    markDisplayPreferencesChange();
    return setCurrencyRaw(value);
  }
  var [secondaryCurrency, setSecondaryCurrencyRaw] = useStorage(
    userKey("pref_sec_cur"),
    ""
  );
  function setSecondaryCurrency(value) {
    markDisplayPreferencesChange();
    return setSecondaryCurrencyRaw(value);
  }
  var [showSecInHistory, setShowSecInHistoryRaw] = useStorage(
    userKey("pref_sec_history"),
    true
  );
  function setShowSecInHistory(value) {
    markDisplayPreferencesChange();
    return setShowSecInHistoryRaw(value);
  }
  var [showSecInStats, setShowSecInStatsRaw] = useStorage(
    userKey("pref_sec_stats"),
    true
  );
  function setShowSecInStats(value) {
    markDisplayPreferencesChange();
    return setShowSecInStatsRaw(value);
  }
  var [showSecInBudget, setShowSecInBudgetRaw] = useStorage(
    userKey("pref_sec_budget"),
    false
  );
  function setShowSecInBudget(value) {
    markDisplayPreferencesChange();
    return setShowSecInBudgetRaw(value);
  }
  var [showSecInPatrimonio, setShowSecInPatrimonioRaw] = useStorage(
    userKey("pref_sec_patrimonio"),
    false
  );
  function setShowSecInPatrimonio(value) {
    markDisplayPreferencesChange();
    return setShowSecInPatrimonioRaw(value);
  }
  var [secRate, setSecRate] = useState(null);
  var [secRateLoading, setSecRateLoading] = useState(false);
  var secSym = secondaryCurrency
    ? (
        CURRENCIES.find(function (c) {
          return c.code === secondaryCurrency;
        }) || { symbol: secondaryCurrency }
      ).symbol
    : "";
  useEffect(
    function () {
      if (!secondaryCurrency) {
        setSecRate(null);
        return;
      }
      setSecRateLoading(true);
      fetch("https://api.exchangerate-api.com/v4/latest/" + currency)
        .then(function (r) {
          return r.json();
        })
        .then(function (d) {
          var r = d.rates && d.rates[secondaryCurrency];
          setSecRate(r || null);
        })
        .catch(function () {
          setSecRate(null);
        })
        .finally(function () {
          setSecRateLoading(false);
        });
    },
    [secondaryCurrency, currency]
  );
  function fmtSec(val) {
    if (!secRate || !secondaryCurrency) return null;
    var conv = val * secRate;
    // Same format as fmt() - no K/M abbreviations
    return (
      secSym +
      conv
        .toFixed(2)
        .replace(".", ",")
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    );
  }
  var [dateFmt, setDateFmtRaw] = useStorage(
    userKey("pref_datefmt"),
    getDefaultDateFormat()
  );
  function setDateFmt(value) {
    markDisplayPreferencesChange();
    return setDateFmtRaw(value);
  }
  var [firstDayOfWeek, setFirstDayOfWeekRaw] = useStorage(
    userKey("pref_first_day_week"),
    "mon"
  );
  function setFirstDayOfWeek(value) {
    markDisplayPreferencesChange();
    return setFirstDayOfWeekRaw(value);
  }
  var [homeBalanceView, setHomeBalanceViewRaw] = useStorage(
    userKey("pref_home_balance"),
    "rateizzato"
  );
  function setHomeBalanceView(value) {
    markHomePreferencesChange();
    return setHomeBalanceViewRaw(value);
  }
  var DEFAULT_HOME_WORKLETS = [
    {
      id: "home_quick_actions",
      type: "quick_actions",
      size: "1x",
      color: "#F8FAFF",
      params: { showTitle: false },
    },
    {
      id: "home_summary",
      type: "summary",
      size: "1x",
      color: "#FFFFFF",
      params: { showTitle: false },
    },
    {
      id: "home_distribution_expenses",
      type: "distribution_expenses",
      size: "1x",
      color: "#FFFFFF",
      params: { range: 6 },
    },
    {
      id: "home_income_vs_expense",
      type: "income_vs_expense",
      size: "1x",
      color: "#FFFFFF",
      params: { range: 6 },
    },
    {
      id: "home_monthly_balance",
      type: "monthly_balance",
      size: "2x",
      color: "#FFFFFF",
      params: { range: 6 },
    },
    {
      id: "home_latest_expenses",
      type: "latest_expenses",
      size: "1x",
      color: "#FFFFFF",
      params: { count: 5 },
    },
    {
      id: "home_latest_incomes",
      type: "latest_incomes",
      size: "1x",
      color: "#FFFFFF",
      params: { count: 5 },
    },
  ];
  var DEFAULT_MOBILE_NAV_ORDER = [
    "home",
    "spese",
    "history",
    "voice",
    "more",
    "share",
  ];
  var DEFAULT_MOBILE_MENU_ORDER = [
    "consulenteAI",
    "patrimonio",
    "budget",
    "share",
    "debtCredits",
    "shopping",
    "goals",
    "alerts",
    "appunti",
    "settings",
  ];
  var [homeWorklets, setHomeWorkletsRaw] = useStorage(
    userKey("home_worklets_v1"),
    DEFAULT_HOME_WORKLETS
  );
  function setHomeWorklets(value) {
    markHomePreferencesChange();
    return setHomeWorkletsRaw(value);
  }
  var [showAppSummaryHeader, setShowAppSummaryHeaderRaw] = useStorage(
    userKey("pref_show_app_summary_header_v1"),
    true
  );
  function setShowAppSummaryHeader(value) {
    markHomePreferencesChange();
    return setShowAppSummaryHeaderRaw(value);
  }
  var [mobileNavOrder, setMobileNavOrderRaw] = useStorage(
    userKey("pref_mobile_nav_order_v1"),
    DEFAULT_MOBILE_NAV_ORDER
  );
  function setMobileNavOrder(value) {
    markHomePreferencesChange();
    return setMobileNavOrderRaw(value);
  }
  var [mobileNavIconCount, setMobileNavIconCountRaw] = useStorage(
    userKey("pref_mobile_nav_icon_count_v1"),
    5
  );
  function setMobileNavIconCount(value) {
    markHomePreferencesChange();
    return setMobileNavIconCountRaw(value);
  }
  var [mobileMenuOrder, setMobileMenuOrderRaw] = useStorage(
    userKey("pref_mobile_menu_order_v1"),
    DEFAULT_MOBILE_MENU_ORDER
  );
  function setMobileMenuOrder(value) {
    markHomePreferencesChange();
    return setMobileMenuOrderRaw(value);
  }
  var [biometricLockEnabled, setBiometricLockEnabled] = useStorage(
    userKey("pref_biometric_lock_enabled_v1"),
    false
  );
  var [biometricLockTimeout, setBiometricLockTimeout] = useStorage(
    userKey("pref_biometric_lock_timeout_v1"),
    1
  );
  var [localLockMethod, setLocalLockMethod] = useStorage(
    userKey("pref_local_lock_method_v1"),
    "biometric"
  );
  var [localLockPin, setLocalLockPin] = useStorage(
    userKey("pref_local_lock_pin_v1"),
    ""
  );
  var [securityPinDraft, setSecurityPinDraft] = useState("");
  var securityPinDraftRef = useRef("");
  var [unlockPin, setUnlockPin] = useState("");
  var unlockPinRef = useRef("");
  var [unlockPassword, setUnlockPassword] = useState("");
  var [unlockMethod, setUnlockMethod] = useState("");
  var [appLocked, setAppLocked] = useState(false);
  var [biometricChecking, setBiometricChecking] = useState(false);
  var [biometricLockMessage, setBiometricLockMessage] = useState("");
  var biometricPromptRef = useRef(false);
  var biometricInitialCheckRef = useRef(false);
  var biometricBackgroundAtRef = useRef(null);
  var biometricSkipAutoLockUntilRef = useRef(0);
  var DEFAULT_MOBILE_ALL_NAV_ORDER = [
    "home",
    "spese",
    "history",
    "voice",
    "stats",
    "consulenteAI",
    "patrimonio",
    "budget",
    "share",
    "debtCredits",
    "shopping",
    "goals",
    "alerts",
    "appunti",
    "settings",
  ];
  var [mobileAllNavOrderRaw, setMobileAllNavOrderRaw] = useStorage(
    userKey("pref_mobile_all_nav_order_v1"),
    DEFAULT_MOBILE_ALL_NAV_ORDER
  );
  var mobileAllNavOrder = useMemo(
    function () {
      var desired = DEFAULT_MOBILE_ALL_NAV_ORDER;
      var raw = Array.isArray(mobileAllNavOrderRaw) ? mobileAllNavOrderRaw : [];
      var oldDefault = [
        "home",
        "spese",
        "history",
        "stats",
        "appunti",
        "voice",
        "share",
        "consulenteAI",
        "patrimonio",
        "budget",
        "goals",
        "alerts",
        "settings",
      ];
      var isOld =
        raw.length === oldDefault.length &&
        raw.every(function (x, i) {
          return x === oldDefault[i];
        });
      if (!raw.length || isOld) return desired;
      var seen = {};
      var out = [];
      raw.concat(desired).forEach(function (id) {
        if (desired.indexOf(id) >= 0 && !seen[id]) {
          seen[id] = true;
          out.push(id);
        }
      });
      return out;
    },
    [mobileAllNavOrderRaw]
  );
  function setMobileAllNavOrder(v) {
    markHomePreferencesChange();
    return setMobileAllNavOrderRaw(v);
  }
  var [statsView, setStatsViewRaw] = useStorage(
    userKey("pref_statsview"),
    "rateizzato"
  );
  function setStatsView(value) {
    markDisplayPreferencesChange();
    return setStatsViewRaw(value);
  }
  var [bgTheme, setBgTheme] = useStorage(userKey("pref_bg"), "default");
  var [btnStyle, setBtnStyleRaw] = useStorage(
    userKey("pref_btn_style"),
    "soft"
  );
  function setBtnStyle(value) {
    markDisplayPreferencesChange();
    return setBtnStyleRaw(value);
  }
  var [expenseColor, setExpenseColorRaw] = useStorage(
    userKey("pref_exp_color"),
    "#E24B4A"
  );
  function setExpenseColor(value) {
    markDisplayPreferencesChange();
    return setExpenseColorRaw(value);
  }
  var [incomeColor, setIncomeColorRaw] = useStorage(
    userKey("pref_inc_color"),
    "#1D9E75"
  );
  function setIncomeColor(value) {
    markDisplayPreferencesChange();
    return setIncomeColorRaw(value);
  }
  var [widgetBgColor, setWidgetBgColor] = useStorage(
    userKey("widget_bg_color_v1"),
    "#1E1E30"
  );
  var [widgetBgAlpha, setWidgetBgAlpha] = useStorage(
    userKey("widget_bg_alpha_v1"),
    25
  );
  var [widgetExpenseColor, setWidgetExpenseColor] = useStorage(
    userKey("widget_expense_color_v1"),
    expenseColor || "#E24B4A"
  );
  var [widgetIncomeColor, setWidgetIncomeColor] = useStorage(
    userKey("widget_income_color_v1"),
    incomeColor || "#1D9E75"
  );
  var [widgetTitle, setWidgetTitle] = useStorage(
    userKey("widget_title_v1"),
    "fAInance"
  );
  var [widgetSubtitle, setWidgetSubtitle] = useStorage(
    userKey("widget_subtitle_v1"),
    "Aggiunta rapida movimenti"
  );
  var [widgetExpenseLabel, setWidgetExpenseLabel] = useStorage(
    userKey("widget_expense_label_v1"),
    "Uscita"
  );
  var [widgetIncomeLabel, setWidgetIncomeLabel] = useStorage(
    userKey("widget_income_label_v1"),
    "Entrata"
  );
  var [widgetShowHeader, setWidgetShowHeader] = useStorage(
    userKey("widget_show_header_v1"),
    true
  );
  var [widgetButtonStyle, setWidgetButtonStyle] = useStorage(
    userKey("widget_button_style_v1"),
    btnStyle || "soft"
  );
  var [widgetVoiceEnabled, setWidgetVoiceEnabled] = useStorage(
    userKey("widget_voice_enabled_v1"),
    true
  );
  var [widget2Enabled, setWidget2Enabled] = useStorage(
    userKey("widget2_enabled_v1"),
    true
  );
  var [widget2Type, setWidget2Type] = useStorage(
    userKey("widget2_type_v1"),
    "note"
  );
  var [widget2SelectedNoteId, setWidget2SelectedNoteId] = useStorage(
    userKey("widget2_note_id_v1"),
    ""
  );
  var [widget2SelectedBankId, setWidget2SelectedBankId] = useStorage(
    userKey("widget2_bank_id_v1"),
    ""
  );
  var [widget2SelectedCreditCardId, setWidget2SelectedCreditCardId] =
    useStorage(userKey("widget2_credit_card_id_v1"), "");
  var [widget2MaxChars, setWidget2MaxChars] = useStorage(
    userKey("widget2_max_chars_v1"),
    500
  );
  var [widget2TextSize, setWidget2TextSize] = useStorage(
    userKey("widget2_text_size_v1"),
    14
  );
  var [widget2AccentColor, setWidget2AccentColor] = useStorage(
    userKey("widget2_accent_color_v1"),
    "#7F77DD"
  );
  var [widget2TitleColor, setWidget2TitleColor] = useStorage(
    userKey("widget2_title_color_v1"),
    "#FFFFFF"
  );
  var [widget2BodyColor, setWidget2BodyColor] = useStorage(
    userKey("widget2_body_color_v1"),
    "#CCFFFFFF"
  );
  var [widget2BgAlpha, setWidget2BgAlpha] = useStorage(
    userKey("widget2_bg_alpha_v1"),
    25
  );
  var [widget2AutoUpdate, setWidget2AutoUpdate] = useStorage(
    userKey("widget2_auto_update_v1"),
    true
  );
  var [widget3Enabled, setWidget3Enabled] = useStorage(
    userKey("widget3_enabled_v1"),
    true
  );
  var [widget3SelectedGoalId, setWidget3SelectedGoalId] = useStorage(
    userKey("widget3_goal_id_v1"),
    "fondo_emergenza"
  );
  var [widget3ShowPercent, setWidget3ShowPercent] = useStorage(
    userKey("widget3_show_percent_v1"),
    true
  );
  var [widget3ShowAmounts, setWidget3ShowAmounts] = useStorage(
    userKey("widget3_show_amounts_v1"),
    true
  );
  var [widget3AccentColor, setWidget3AccentColor] = useStorage(
    userKey("widget3_accent_color_v1"),
    "#EF7D00"
  );
  var [widget3TextColor, setWidget3TextColor] = useStorage(
    userKey("widget3_text_color_v1"),
    "#FFFFFF"
  );
  var [widget3PercentColor, setWidget3PercentColor] = useStorage(
    userKey("widget3_percent_color_v1"),
    "#EF7D00"
  );
  var [widget3BgAlpha, setWidget3BgAlpha] = useStorage(
    userKey("widget3_bg_alpha_v1"),
    25
  );
  var [widget3AutoUpdate, setWidget3AutoUpdate] = useStorage(
    userKey("widget3_auto_update_v1"),
    true
  );
  var [widgetShareSelectedProjectId, setWidgetShareSelectedProjectId] =
    useStorage(userKey("widget_share_project_id_v1"), "");
  var [widgetShareBgColor, setWidgetShareBgColor] = useStorage(
    userKey("widget_share_bg_color_v1"),
    "#1E1E30"
  );
  var [widgetShareBgAlpha, setWidgetShareBgAlpha] = useStorage(
    userKey("widget_share_bg_alpha_v1"),
    25
  );
  var [widgetShareAccentColor, setWidgetShareAccentColor] = useStorage(
    userKey("widget_share_accent_color_v1"),
    confirmButtonColor || "#7F77DD"
  );
  var [widgetShareActivityColor, setWidgetShareActivityColor] = useStorage(
    userKey("widget_share_activity_color_v1"),
    "#378ADD"
  );
  var [widgetShareTitleColor, setWidgetShareTitleColor] = useStorage(
    userKey("widget_share_title_color_v1"),
    "#FFFFFF"
  );
  var [widgetShareBodyColor, setWidgetShareBodyColor] = useStorage(
    userKey("widget_share_body_color_v1"),
    "#D8D6F2"
  );
  var [widgetShareAutoUpdate, setWidgetShareAutoUpdate] = useStorage(
    userKey("widget_share_auto_update_v1"),
    true
  );
  var [widgetShoppingListEnabled, setWidgetShoppingListEnabled] = useStorage(
    userKey("widget_shopping_list_enabled_v1"),
    true
  );
  var [widgetShoppingListMaxItems, setWidgetShoppingListMaxItems] = useStorage(
    userKey("widget_shopping_list_max_items_v1"),
    8
  );
  var [widgetShoppingListAccentColor, setWidgetShoppingListAccentColor] =
    useStorage(
      userKey("widget_shopping_list_accent_color_v1"),
      confirmButtonColor || "#EF9F27"
    );
  var [widgetShoppingListTextSize, setWidgetShoppingListTextSize] = useStorage(
    userKey("widget_shopping_list_text_size_v1"),
    13
  );
  var [widgetShoppingListIconColor, setWidgetShoppingListIconColor] =
    useStorage(
      userKey("widget_shopping_list_icon_color_v1"),
      confirmButtonColor || "#EF9F27"
    );
  var [widgetShoppingListTitleColor, setWidgetShoppingListTitleColor] =
    useStorage(userKey("widget_shopping_list_title_color_v1"), "#FFFFFF");
  var [widgetShoppingListTextColor, setWidgetShoppingListTextColor] =
    useStorage(userKey("widget_shopping_list_text_color_v1"), "#EDEDF7");
  var [widgetShoppingListBgAlpha, setWidgetShoppingListBgAlpha] = useStorage(
    userKey("widget_shopping_list_bg_alpha_v1"),
    65
  );
  var [widgetShoppingListAutoUpdate, setWidgetShoppingListAutoUpdate] =
    useStorage(userKey("widget_shopping_list_auto_update_v1"), true);
  var [widgetFidelityEnabled, setWidgetFidelityEnabled] = useStorage(
    userKey("widget_fidelity_enabled_v1"),
    true
  );
  var [widgetFidelitySelectedCardId, setWidgetFidelitySelectedCardId] =
    useStorage(userKey("widget_fidelity_card_id_v1"), "");
  var [widgetFidelityAccentColor, setWidgetFidelityAccentColor] = useStorage(
    userKey("widget_fidelity_accent_color_v1"),
    "#378ADD"
  );
  var [widgetFidelityTextSize, setWidgetFidelityTextSize] = useStorage(
    userKey("widget_fidelity_text_size_v1"),
    14
  );
  var [widgetFidelityIconColor, setWidgetFidelityIconColor] = useStorage(
    userKey("widget_fidelity_icon_color_v1"),
    "#0F9F76"
  );
  var [widgetFidelityTitleColor, setWidgetFidelityTitleColor] = useStorage(
    userKey("widget_fidelity_title_color_v1"),
    "#FFFFFF"
  );
  var [widgetFidelityTextColor, setWidgetFidelityTextColor] = useStorage(
    userKey("widget_fidelity_text_color_v1"),
    "#FFFFFF"
  );
  var [widgetFidelityBgAlpha, setWidgetFidelityBgAlpha] = useStorage(
    userKey("widget_fidelity_bg_alpha_v1"),
    65
  );
  var [widgetFidelityAutoUpdate, setWidgetFidelityAutoUpdate] = useStorage(
    userKey("widget_fidelity_auto_update_v1"),
    true
  );
  var [widgetDebtCreditsEnabled, setWidgetDebtCreditsEnabled] = useStorage(
    userKey("widget_debt_credits_enabled_v1"),
    true
  );
  var [widgetDebtCreditsMode, setWidgetDebtCreditsMode] = useStorage(
    userKey("widget_debt_credits_mode_v1"),
    "open"
  );
  var [widgetDebtCreditsSelectedIds, setWidgetDebtCreditsSelectedIds] =
    useStorage(userKey("widget_debt_credits_selected_ids_v1"), []);
  var [widgetDebtCreditsAccentColor, setWidgetDebtCreditsAccentColor] =
    useStorage(userKey("widget_debt_credits_accent_color_v1"), "#7F77DD");
  var [widgetDebtCreditsTextSize, setWidgetDebtCreditsTextSize] = useStorage(
    userKey("widget_debt_credits_text_size_v1"),
    13
  );
  var [widgetDebtCreditsIconColor, setWidgetDebtCreditsIconColor] = useStorage(
    userKey("widget_debt_credits_icon_color_v1"),
    "#7F77DD"
  );
  var [widgetDebtCreditsTitleColor, setWidgetDebtCreditsTitleColor] =
    useStorage(userKey("widget_debt_credits_title_color_v1"), "#FFFFFF");
  var [widgetDebtCreditsTextColor, setWidgetDebtCreditsTextColor] = useStorage(
    userKey("widget_debt_credits_text_color_v1"),
    "#EDEDF7"
  );
  var [widgetDebtCreditsBgAlpha, setWidgetDebtCreditsBgAlpha] = useStorage(
    userKey("widget_debt_credits_bg_alpha_v1"),
    65
  );
  var [widgetDebtCreditsAutoUpdate, setWidgetDebtCreditsAutoUpdate] =
    useStorage(userKey("widget_debt_credits_auto_update_v1"), true);

  var [tab, setTabRaw] = useState("home");
  function setTab(nextTab) {
    var requestedTab = String(nextTab || "");
    if (requestedTab === "debtCredits" && currentPlan !== "premium") {
      setToast({
        text: "Questa funzione non è disponibile con il piano attuale.\nEffettua l’upgrade",
        type: "warning",
        color: "#FFF8E1",
        textColor: "#856404",
        icon: "🔒",
        actionLabel: "Piani",
        actionPage: "plans_settings",
        duration: 7000,
      });
      try { if (setMobileMenu) setMobileMenu(false); } catch (e) {}
      return;
    }
    setTabRaw(nextTab);
  }
  var [settingsPage, setSettingsPage] = useState(null);
  // Stato del form di supporto mantenuto nel componente principale.
  // SupportSettingsPage è definita dentro SettingsPanel e viene ricreata quando il pannello
  // padre si aggiorna: uno stato locale al suo interno veniva quindi azzerato e il form
  // si richiudeva subito dopo l'apertura.
  var [supportContactFormOpen, setSupportContactFormOpen] = useState(false);
  useEffect(
    function () {
      if (settingsPage !== "support" && supportContactFormOpen)
        setSupportContactFormOpen(false);
    },
    [settingsPage, supportContactFormOpen]
  );
  var androidBackLastPressRef = useRef(0);
  var [notifPrefs, setNotifPrefs] = useStorage(userKey("notif_prefs_v1"), {
    remindActive: false,
    remindFreq: "daily",
    remindHour: "20:00",
    stipendioActive: true,
    stipendioHour: "18:00",
    stipendioDay: 0,
    spesaRicorrente: true,
  });
  var [customNotifs, setCustomNotifsRaw] = useStorage(
    userKey("custom_notifs_v1"),
    []
  );
  var customNotifsRef = useRef(customNotifs);
  customNotifsRef.current = customNotifs;
  function setCustomNotifs(nextValue) {
    var current = Array.isArray(customNotifsRef.current)
      ? customNotifsRef.current
      : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("notification", current, requested);
    customNotifsRef.current = prepared;
    return setCustomNotifsRaw(prepared);
  }
  var [patrimonioHistory, setPatrimonioHistory] = useStorage(
    userKey("patrimonio_history_v1"),
    {}
  );
  var [patrimonioNotes, setPatrimonioNotes] = useStorage(
    userKey("patrimonio_notes_v1"),
    {}
  );
  var [historyFutureMode, setHistoryFutureMode] = useStorage(
    userKey("history_future_mode_v1"),
    "untilToday"
  );
  var [historySortDate, setHistorySortDate] = useStorage(
    userKey("history_sort_date_v1"),
    "date"
  );
  var [historySortDirection, setHistorySortDirection] = useStorage(
    userKey("history_sort_direction_v1"),
    "desc"
  );
  var [historySortSecondary, setHistorySortSecondary] = useStorage(
    userKey("history_sort_secondary_v1"),
    "amount"
  );
  var [historySortSecondaryDirection, setHistorySortSecondaryDirection] =
    useStorage(userKey("history_sort_secondary_direction_v1"), "desc");
  var [appuntiDocuments, setAppuntiDocumentsRaw] = useStorage(
    userKey("appunti_documents_v1"),
    []
  );
  var appuntiDocumentsRef = useRef(appuntiDocuments);
  appuntiDocumentsRef.current = appuntiDocuments;
  function setAppuntiDocuments(nextValue) {
    var current = Array.isArray(appuntiDocumentsRef.current)
      ? appuntiDocumentsRef.current
      : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("document", current, requested);
    appuntiDocumentsRef.current = prepared;
    return setAppuntiDocumentsRaw(prepared);
  }
  var [appuntiNotes, setAppuntiNotesRaw] = useStorage(
    userKey("appunti_notes_v1"),
    []
  );
  var appuntiNotesRef = useRef(appuntiNotes);
  appuntiNotesRef.current = appuntiNotes;
  function setAppuntiNotes(nextValue) {
    var current = Array.isArray(appuntiNotesRef.current)
      ? appuntiNotesRef.current
      : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("note", current, requested);
    appuntiNotesRef.current = prepared;
    return setAppuntiNotesRaw(prepared);
  }
  var [bankCoords, setBankCoords, bankCoordsStorageReady] =
    useFainanceSensitiveStorage(userKey("bank_coords_v1"), [], userId);
  var [creditCards, setCreditCards, creditCardsStorageReady] =
    useFainanceSensitiveStorage(userKey("credit_cards_v1"), [], userId);
  var sensitiveStorageReady =
    !!bankCoordsStorageReady && !!creditCardsStorageReady;
  function readAIExternalConsentLocal() {
    try {
      var raw = localStorage.getItem(userKey("ai_external_consent_v1"));
      return raw === "accepted" || raw === '"accepted"' || raw === "true";
    } catch (e) {
      return false;
    }
  }
  function readAIExternalConsentAtLocal() {
    try {
      return String(
        localStorage.getItem(userKey("ai_external_consent_at_v1")) || ""
      );
    } catch (e) {
      return "";
    }
  }
  var [aiExternalConsent, setAiExternalConsentState] = useState(
    readAIExternalConsentLocal
  );
  var [aiExternalConsentAt, setAiExternalConsentAt] = useState(
    readAIExternalConsentAtLocal
  );
  var AI_CONSENT_TEXT_VERSION = "2026-07-09";
  function setAiExternalConsent(value, acceptedAt) {
    var accepted = !!value;
    var at = accepted
      ? String(acceptedAt || aiExternalConsentAt || new Date().toISOString())
      : "";
    if (!applyingFirestoreRef.current) markUserLocalChange("ai_consent_v2");
    try {
      if (accepted)
        localStorage.setItem(userKey("ai_external_consent_v1"), "accepted");
      else localStorage.removeItem(userKey("ai_external_consent_v1"));
      if (at) localStorage.setItem(userKey("ai_external_consent_at_v1"), at);
      else localStorage.removeItem(userKey("ai_external_consent_at_v1"));
    } catch (e) {}
    setAiExternalConsentState(accepted);
    setAiExternalConsentAt(at);
  }
  useEffect(
    function () {
      setAiExternalConsentState(readAIExternalConsentLocal());
      setAiExternalConsentAt(readAIExternalConsentAtLocal());
    },
    [userId]
  );
  var profileLegalAcceptance: any = fainanceResolveLegalAcceptance(
    currentUser,
    currentUser
  );
  var profileLegalAccepted = !!profileLegalAcceptance;
  var [termsAccepted, setTermsAccepted] = useStorage(
    userKey("terms_accepted_v1"),
    profileLegalAccepted
  );
  var [privacyAccepted, setPrivacyAccepted] = useStorage(
    userKey("privacy_accepted_v1"),
    profileLegalAccepted
  );
  var [metaEventsConsent, setMetaEventsConsent] = useStorage(
    userKey("meta_events_consent_v1"),
    profileLegalAcceptance ? !!profileLegalAcceptance.metaEventsConsent : false
  );
  // Keep the legal modal draft in the parent component. TermsAcceptanceModal is declared
  // inside App and can otherwise be remounted whenever App rerenders, resetting taps.
  var [legalTermsChecked, setLegalTermsChecked] = useState(!!termsAccepted);
  var [legalPrivacyChecked, setLegalPrivacyChecked] = useState(
    !!privacyAccepted
  );
  var [legalMetaChecked, setLegalMetaChecked] = useState(!!metaEventsConsent);
  var LEGAL_ACCEPTANCE_VERSION = "2026-07-30";
  function readLegalAcceptanceV2Local() {
    try {
      var raw = localStorage.getItem(userKey("legal_acceptance_v2"));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }
  function readLegacyLegalBoolean(key) {
    try {
      var raw = localStorage.getItem(userKey(key));
      if (raw === null) return false;
      try {
        return !!JSON.parse(raw);
      } catch (_e) {
        return raw === "true" || raw === "1";
      }
    } catch (e) {
      return false;
    }
  }
  function readLegacyLegalDate() {
    try {
      var raw = localStorage.getItem(userKey("legal_acceptance_date_v1"));
      if (!raw) return "";
      try {
        return String(JSON.parse(raw) || "");
      } catch (_e) {
        return String(raw || "");
      }
    } catch (e) {
      return "";
    }
  }
  function readLegalAcceptanceCommittedLocal() {
    try {
      var v2 = readLegalAcceptanceV2Local();
      if (
        v2 &&
        v2.accepted === true &&
        v2.terms === true &&
        v2.privacy === true
      )
        return true;
      if (
        localStorage.getItem(userKey("legal_acceptance_committed_v1")) === "1"
      )
        return true;
      return (
        readLegacyLegalBoolean("terms_accepted_v1") &&
        readLegacyLegalBoolean("privacy_accepted_v1")
      );
    } catch (e) {
      return false;
    }
  }
  function writeLegalAcceptanceLocal(acceptedAt, metaConsent) {
    try {
      var at = String(
        acceptedAt || readLegacyLegalDate() || new Date().toISOString()
      );
      var payload = {
        accepted: true,
        terms: true,
        privacy: true,
        metaEventsConsent: !!metaConsent,
        acceptedAt: at,
        version: LEGAL_ACCEPTANCE_VERSION,
      };
      localStorage.setItem(userKey("legal_acceptance_committed_v1"), "1");
      localStorage.setItem(
        userKey("legal_acceptance_v2"),
        JSON.stringify(payload)
      );
      localStorage.setItem(userKey("terms_accepted_v1"), JSON.stringify(true));
      localStorage.setItem(
        userKey("privacy_accepted_v1"),
        JSON.stringify(true)
      );
      localStorage.setItem(
        userKey("meta_events_consent_v1"),
        JSON.stringify(!!metaConsent)
      );
      localStorage.setItem(
        userKey("legal_acceptance_date_v1"),
        JSON.stringify(at)
      );
      return payload;
    } catch (e) {
      return {
        accepted: true,
        terms: true,
        privacy: true,
        metaEventsConsent: !!metaConsent,
        acceptedAt: String(acceptedAt || ""),
        version: LEGAL_ACCEPTANCE_VERSION,
      };
    }
  }
  var [legalAcceptanceCommitted, setLegalAcceptanceCommitted] = useState(
    function () {
      return readLegalAcceptanceCommittedLocal() || profileLegalAccepted;
    }
  );
  var legalAcceptingRef = useRef(false);
  useEffect(
    function () {
      var profileLegal: any = fainanceResolveLegalAcceptance(
        currentUser,
        currentUser
      );
      var committed = readLegalAcceptanceCommittedLocal() || !!profileLegal;
      legalAcceptingRef.current = false;
      setLegalAcceptanceCommitted(committed);
      setLegalTermsChecked(committed ? true : !!termsAccepted);
      setLegalPrivacyChecked(committed ? true : !!privacyAccepted);
      setLegalMetaChecked(
        profileLegal ? !!profileLegal.metaEventsConsent : !!metaEventsConsent
      );
      if (committed) {
        var persisted = profileLegal || readLegalAcceptanceV2Local();
        var acceptedAt = String(
          (persisted && persisted.acceptedAt) ||
            readLegacyLegalDate() ||
            new Date().toISOString()
        );
        var metaValue =
          persisted && persisted.metaEventsConsent !== undefined
            ? !!persisted.metaEventsConsent
            : !!metaEventsConsent;
        writeLegalAcceptanceLocal(acceptedAt, metaValue);
        if (!termsAccepted) setTermsAccepted(true);
        if (!privacyAccepted) setPrivacyAccepted(true);
        if (!!metaEventsConsent !== metaValue) setMetaEventsConsent(metaValue);
        if (!legalAcceptanceDate) setLegalAcceptanceDate(acceptedAt);
      }
    },
    [
      userId,
      currentUser && currentUser.legalAcceptanceDate,
      currentUser && currentUser.termsAccepted,
      currentUser && currentUser.privacyAccepted,
    ]
  );
  useEffect(
    function () {
      if (!legalAcceptanceCommitted) return;
      if (!termsAccepted) setTermsAccepted(true);
      if (!privacyAccepted) setPrivacyAccepted(true);
    },
    [legalAcceptanceCommitted, termsAccepted, privacyAccepted, userId]
  );
  useEffect(
    function () {
      if (!fainanceIsNativePlatform()) return;
      fainanceSetMetaEventsConsent(!!metaEventsConsent).catch(function (e) {
        console.warn(
          "Meta App Events consent update failed",
          (e && e.message) || e
        );
      });
    },
    [metaEventsConsent, userId]
  );
  var [legalAcceptanceDate, setLegalAcceptanceDate] = useStorage(
    userKey("legal_acceptance_date_v1"),
    ""
  );
  var [onboardingGuideSeen, setOnboardingGuideSeen] = useStorage(
    userKey("onboarding_guide_seen_v1"),
    false
  );
  var [onboardingGuideOpen, setOnboardingGuideOpen] = useState(false);
  var [onboardingGuideStep, setOnboardingGuideStep] = useState(0);
  var [initialSetupStatus, setInitialSetupStatus] = useStorage(
    userKey("initial_setup_status_v1"),
    ""
  );
  var [initialSetupOpen, setInitialSetupOpen] = useState(false);
  var [initialSetupMode, setInitialSetupMode] = useState("essential");
  var [initialSetupStep, setInitialSetupStep] = useState(0);
  var [setupLang, setSetupLang] = useState(getDefaultLang());
  var [setupCurrency, setSetupCurrency] = useState("EUR");
  var [setupDateFmt, setSetupDateFmt] = useState(getDefaultDateFormat());
  var [setupFirstDay, setSetupFirstDay] = useState("mon");
  var [setupBalanceView, setSetupBalanceView] = useState("rateizzato");
  var [setupIncomeType, setSetupIncomeType] = useState("salario");
  var [setupExpenseCat, setSetupExpenseCat] = useState("4");
  var [setupExpenseMethod, setSetupExpenseMethod] = useState("8");
  var [setupBiometric, setSetupBiometric] = useState(false);
  var [setupShowSummary, setSetupShowSummary] = useState(true);
  var [setupNavIcons, setSetupNavIcons] = useState(5);
  var [setupHistoryDate, setSetupHistoryDate] = useState("operation");
  var [setupHistoryDirection, setSetupHistoryDirection] = useState("desc");
  var [setupShowShareHistory, setSetupShowShareHistory] = useState(true);
  var [setupPicker, setSetupPicker] = useState("");
  var [setupPickerSearch, setSetupPickerSearch] = useState("");
  var setupPickerActionRef = useRef(false);
  var onboardingGuideTransitionRef = useRef(false);
  var onboardingGuideLocalSeenRef = useRef(false);
  var onboardingFlowCompleteRef = useRef(false);
  function readLocalOnboardingFlag(name) {
    try {
      return localStorage.getItem(userKey(name)) === "1";
    } catch (e) {
      return false;
    }
  }
  function writeLocalOnboardingFlag(name) {
    try {
      localStorage.setItem(userKey(name), "1");
    } catch (e) {}
  }
  useEffect(
    function () {
      var guideDone = readLocalOnboardingFlag(
        "onboarding_guide_completed_local_v2"
      );
      var flowDone = readLocalOnboardingFlag("onboarding_flow_complete_v2");
      onboardingGuideLocalSeenRef.current = guideDone || flowDone;
      onboardingFlowCompleteRef.current = flowDone;
      setupPickerActionRef.current = false;
      onboardingGuideTransitionRef.current = false;
      if (flowDone) {
        setOnboardingGuideSeen(true);
        setInitialSetupStatus("complete");
        setOnboardingGuideOpen(false);
        setInitialSetupOpen(false);
      } else if (guideDone) {
        setOnboardingGuideSeen(true);
      }
    },
    [userId]
  );
  useEffect(
    function () {
      if (String(initialSetupStatus || "") !== "complete") return;
      onboardingGuideLocalSeenRef.current = true;
      onboardingFlowCompleteRef.current = true;
      writeLocalOnboardingFlag("onboarding_guide_completed_local_v2");
      writeLocalOnboardingFlag("onboarding_flow_complete_v2");
    },
    [userId, initialSetupStatus]
  );
  var [shareProjects, setShareProjectsRaw] = useStorage(
    userKey("share_projects_v1"),
    []
  );
  var shareProjectsRef = useRef(shareProjects);
  shareProjectsRef.current = shareProjects;
  function setShareProjects(nextValue) {
    var current = Array.isArray(shareProjectsRef.current)
      ? shareProjectsRef.current
      : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite(
          "shareProject",
          current,
          Array.isArray(requested) ? requested : []
        );
    shareProjectsRef.current = prepared;
    return setShareProjectsRaw(prepared);
  }
  var [shareDeletionPrompt, setShareDeletionPrompt] = useState<any>(null);
  var [shareDeletionBusy, setShareDeletionBusy] = useState(false);
  var shareDeletionPromptRef = useRef<any>(null);
  shareDeletionPromptRef.current = shareDeletionPrompt;
  var [showShareInHistory, setShowShareInHistory] = useStorage(
    userKey("share_show_history_v1"),
    true
  );
  var DEFAULT_SHOPPING_AREAS = [
    "Alimenti",
    "Banco Frigo",
    "Macelleria",
    "Pescheria",
    "Salumi",
    "Ortofrutta",
    "Igiene",
    "Altro",
  ];
  var DEFAULT_SHOPPING_UNITS = ["Grammi", "Litri", "Unità", "Altro"];
  function canonicalShoppingUnitName(value) {
    var raw = String(value || "").trim();
    var low = raw.toLocaleLowerCase("it-IT");
    if (low === "unità" || low === "unita") return "Unità";
    if (low === "grammi") return "Grammi";
    if (low === "litri") return "Litri";
    if (low === "altro") return "Altro";
    return raw;
  }
  var [debtCredits, setDebtCreditsRaw] = useStorage(
    userKey("debt_credits_v1"),
    []
  );
  var debtCreditsRef = useRef(debtCredits);
  debtCreditsRef.current = debtCredits;
  function setDebtCredits(nextValue) {
    var current = Array.isArray(debtCreditsRef.current)
      ? debtCreditsRef.current
      : [];
    var requested =
      typeof nextValue === "function" ? nextValue(current) : nextValue;
    var prepared = applyingFirestoreRef.current
      ? Array.isArray(requested)
        ? requested
        : []
      : prepareAccountCollectionWrite("debt", current, requested);
    debtCreditsRef.current = prepared;
    return setDebtCreditsRaw(prepared);
  }
  var [shoppingDeletedRecords, setShoppingDeletedRecordsRaw] = useStorage(
    userKey("shopping_deleted_records_v2"),
    {}
  );
  function mergeShoppingDeletedRecords(patch) {
    setShoppingDeletedRecordsRaw(function (current) {
      return mergeSyncTombstones(current, patch);
    });
  }
  var [shoppingCards, setShoppingCardsRaw] = useStorage(
    userKey("shopping_cards_v1"),
    []
  );
  var shoppingCardsRef = useRef(shoppingCards);
  shoppingCardsRef.current = shoppingCards;
  function setShoppingCards(nextCards) {
    var current = Array.isArray(shoppingCardsRef.current)
      ? shoppingCardsRef.current
      : [];
    var requested =
      typeof nextCards === "function" ? nextCards(current) : nextCards;
    var source = Array.isArray(requested) ? requested : [];
    var prepared = source;
    if (!applyingFirestoreRef.current) {
      markUserLocalChange("shopping_cards");
      mergeShoppingDeletedRecords(
        removedSyncRecordTombstones(current, source, shoppingCardSyncKey)
      );
      prepared = stampLocalSyncRecords(current, source, shoppingCardSyncKey);
    }
    shoppingCardsRef.current = prepared;
    return setShoppingCardsRaw(prepared);
  }
  var [shoppingItems, setShoppingItemsRaw] = useStorage(
    userKey("shopping_items_v1"),
    []
  );
  var shoppingItemsRef = useRef(shoppingItems);
  shoppingItemsRef.current = shoppingItems;
  var shoppingItemsCloudUpdatedAtRef = useRef(0);
  function shoppingItemsLocalUpdatedAt() {
    try {
      return Number(
        localStorage.getItem(userKey("shopping_items_updated_at")) || 0
      );
    } catch (e) {
      return 0;
    }
  }
  function setShoppingItems(nextItems) {
    var current = Array.isArray(shoppingItemsRef.current)
      ? shoppingItemsRef.current
      : [];
    var requested =
      typeof nextItems === "function" ? nextItems(current) : nextItems;
    var normalized = normalizeShoppingItemsData(requested);
    var prepared = normalized;
    if (!applyingFirestoreRef.current) {
      markUserLocalChange("shopping_items");
      mergeShoppingDeletedRecords(
        removedSyncRecordTombstones(current, normalized, shoppingSyncRecordKey)
      );
      prepared = stampLocalSyncRecords(
        current,
        normalized,
        shoppingSyncRecordKey
      );
    }
    shoppingItemsRef.current = prepared;
    return setShoppingItemsRaw(prepared);
  }
  useEffect(
    function () {
      var stored = readUserLocalJson("shopping_items_v1", []);
      var normalized = normalizeShoppingItemsData(stored);
      if (!shoppingItemsEqual(stored, normalized)) {
        markUserLocalChange("shopping_items");
        setShoppingItemsRaw(
          stampLocalSyncRecords(stored, normalized, shoppingSyncRecordKey)
        );
      }
    },
    [userId]
  );
  var [shoppingAreas, setShoppingAreasRaw] = useStorage(
    userKey("shopping_areas_v1"),
    DEFAULT_SHOPPING_AREAS
  );
  function setShoppingAreas(value) {
    markShoppingPreferencesChange();
    return setShoppingAreasRaw(value);
  }
  var [shoppingUnits, setShoppingUnitsRaw] = useStorage(
    userKey("shopping_units_v1"),
    DEFAULT_SHOPPING_UNITS
  );
  function setShoppingUnits(value) {
    markShoppingPreferencesChange();
    return setShoppingUnitsRaw(value);
  }
  var [shoppingAreaIcons, setShoppingAreaIconsRaw] = useStorage(
    userKey("shopping_area_icons_v1"),
    {}
  );
  function setShoppingAreaIcons(value) {
    markShoppingPreferencesChange();
    return setShoppingAreaIconsRaw(value);
  }
  var [shoppingAreaColors, setShoppingAreaColorsRaw] = useStorage(
    userKey("shopping_area_colors_v1"),
    {}
  );
  function setShoppingAreaColors(value) {
    markShoppingPreferencesChange();
    return setShoppingAreaColorsRaw(value);
  }
  var [shoppingBoughtColor, setShoppingBoughtColorRaw] = useStorage(
    userKey("shopping_bought_color_v1"),
    "#EAF7EE"
  );
  function setShoppingBoughtColor(value) {
    markShoppingPreferencesChange();
    return setShoppingBoughtColorRaw(value);
  }
  var [shoppingLists, setShoppingListsRaw] = useStorage(
    userKey("shopping_lists_v2"),
    [
      {
        id: "main",
        title: "Lista principale",
        icon: "🧺",
        createdAt: new Date().toISOString(),
      },
    ]
  );
  var shoppingListsRef = useRef(shoppingLists);
  shoppingListsRef.current = shoppingLists;
  function setShoppingLists(nextLists) {
    var current = Array.isArray(shoppingListsRef.current)
      ? shoppingListsRef.current
      : [];
    var requested =
      typeof nextLists === "function" ? nextLists(current) : nextLists;
    var source = Array.isArray(requested) ? requested : [];
    var prepared = source;
    if (!applyingFirestoreRef.current) {
      markUserLocalChange("shopping_lists");
      mergeShoppingDeletedRecords(
        removedSyncRecordTombstones(current, source, shoppingListSyncKey)
      );
      prepared = stampLocalSyncRecords(current, source, shoppingListSyncKey);
    }
    shoppingListsRef.current = prepared;
    return setShoppingListsRaw(prepared);
  }
  var [activeShoppingListId, setActiveShoppingListId] = useStorage(
    userKey("shopping_active_list_id_v2"),
    "main"
  );
  var [shoppingProductSort, setShoppingProductSortRaw] = useStorage(
    userKey("shopping_product_sort_v1"),
    "custom"
  );
  function setShoppingProductSort(value) {
    markShoppingPreferencesChange();
    return setShoppingProductSortRaw(value);
  }
  var [shoppingIconPickerArea, setShoppingIconPickerArea] = useState("");
  var SHOPPING_ICON_OPTIONS = [
    "📌",
    "🧺",
    "🛒",
    "🥩",
    "🍗",
    "🥓",
    "🍖",
    "🐖",
    "🐷",
    "🧀",
    "🥛",
    "🥪",
    "🍕",
    "🌭",
    "🥟",
    "🧈",
    "🐟",
    "🦐",
    "🦞",
    "🥚",
    "🍞",
    "🥐",
    "🥖",
    "🍝",
    "🍚",
    "🥫",
    "🫘",
    "🥦",
    "🥬",
    "🥕",
    "🍅",
    "🌽",
    "🥔",
    "🍄",
    "🍆",
    "🧄",
    "🧅",
    "🥒",
    "🫑",
    "🥑",
    "🍎",
    "🍌",
    "🍊",
    "🍋",
    "🍓",
    "🍇",
    "🍉",
    "🥝",
    "🥭",
    "🍐",
    "🍑",
    "🍒",
    "🫐",
    "🥥",
    "🍍",
    "🧼",
    "🧴",
    "🧻",
    "🪥",
    "🧽",
    "🧹",
    "🧺",
    "🧊",
    "☕",
    "🍵",
    "🥤",
    "🍺",
    "🍷",
    "🍫",
    "🍪",
    "🍯",
    "🧂",
    "🌶️",
    "🥜",
    "🍿",
    "🧃",
    "🍬",
    "🍭",
    "🍼",
    "🐾",
    "👶",
    "💊",
    "🩹",
    "📦",
    "⭐",
    "❤️",
    "🔥",
    "❄️",
    "✅",
  ];
  var [showDebtCreditsInPatrimonio, setShowDebtCreditsInPatrimonio] =
    useStorage(userKey("debt_credits_show_patrimonio_v1"), true);
  var [showDebtCreditsInExpenses, setShowDebtCreditsInExpenses] = useStorage(
    userKey("debt_credits_show_expenses_v1"),
    false
  );
  var [shoppingDefaultArea, setShoppingDefaultAreaRaw] = useStorage(
    userKey("shopping_default_area_v1"),
    "Alimenti"
  );
  function setShoppingDefaultArea(value) {
    markShoppingPreferencesChange();
    return setShoppingDefaultAreaRaw(value);
  }
  var [shoppingDefaultUnit, setShoppingDefaultUnitRaw] = useStorage(
    userKey("shopping_default_unit_v1"),
    "Unità"
  );
  function setShoppingDefaultUnit(value) {
    markShoppingPreferencesChange();
    return setShoppingDefaultUnitRaw(value);
  }
  useEffect(
    function () {
      var source = Array.isArray(shoppingItems) ? shoppingItems : [];
      var itemsChanged = false;
      var normalizedItems = source.map(function (item) {
        var raw = String((item && item.unit) || "").trim();
        var normalized = canonicalShoppingUnitName(raw);
        if (raw && normalized !== raw) {
          itemsChanged = true;
          return {
            ...item,
            unit: normalized,
            updatedAt: item.updatedAt || new Date().toISOString(),
          };
        }
        return item;
      });
      var base = (
        Array.isArray(shoppingUnits) && shoppingUnits.length
          ? shoppingUnits
          : DEFAULT_SHOPPING_UNITS
      )
        .map(canonicalShoppingUnitName)
        .filter(Boolean);
      var nextUnits = [];
      base.forEach(function (unit) {
        if (unit && nextUnits.indexOf(unit) < 0) nextUnits.push(unit);
      });
      if (!nextUnits.length) nextUnits = DEFAULT_SHOPPING_UNITS.slice();
      if (
        JSON.stringify(nextUnits) !==
        JSON.stringify(Array.isArray(shoppingUnits) ? shoppingUnits : [])
      )
        setShoppingUnits(nextUnits);
      if (itemsChanged) setShoppingItems(normalizedItems);
      var normalizedDefault =
        canonicalShoppingUnitName(shoppingDefaultUnit) || "Unità";
      if (nextUnits.indexOf(normalizedDefault) < 0)
        normalizedDefault =
          nextUnits.indexOf("Unità") >= 0 ? "Unità" : nextUnits[0];
      if (String(shoppingDefaultUnit || "") !== String(normalizedDefault || ""))
        setShoppingDefaultUnit(normalizedDefault);
    },
    [userId, shoppingItems, shoppingUnits, shoppingDefaultUnit]
  );
  var [shareReceiptUploads, setShareReceiptUploads] = useStorage(
    userKey("share_receipt_uploads_v1"),
    []
  );
  var [confirmButtonColor, setConfirmButtonColorRaw] = useStorage(
    userKey("pref_confirm_color"),
    "#378ADD"
  );
  function setConfirmButtonColor(value) {
    markDisplayPreferencesChange();
    return setConfirmButtonColorRaw(value);
  }
  var [secondaryButtonColor, setSecondaryButtonColorRaw] = useStorage(
    userKey("pref_secondary_button_color_v1"),
    "#5FAFE5"
  );
  function setSecondaryButtonColor(value) {
    markDisplayPreferencesChange();
    return setSecondaryButtonColorRaw(value);
  }
  useEffect(
    function () {
      try {
        var migrationKey = userKey("secondary_button_color_migrated_v1");
        if (localStorage.getItem(migrationKey) === "1") return;
        if (String(secondaryButtonColor || "").toUpperCase() === "#7FC8F8")
          setSecondaryButtonColor("#5FAFE5");
        localStorage.setItem(migrationKey, "1");
      } catch (e) {}
    },
    [userId]
  );
  var [currentPlan, setCurrentPlanRaw] = useStorage(userKey("plan_v1"), "free");
  var [manualFullGrant, setManualFullGrant] = useState(false);
  var [planBillingPeriod, setPlanBillingPeriod] = useStorage(
    userKey("plan_billing_period_v1"),
    "monthly"
  );
  var [planPurchaseLoading, setPlanPurchaseLoading] = useState("");
  var [premiumTrialPromptStatus, setPremiumTrialPromptStatus] = useStorage(
    userKey("premium_trial_prompt_status_v1"),
    ""
  );
  var [showPremiumTrialPrompt, setShowPremiumTrialPrompt] = useState(false);
  var premiumTrialPromptShownRef = useRef(false);
  var [topAdDismissedAt, setTopAdDismissedAt] = useStorage(
    userKey("top_ad_dismissed_at_v1"),
    0
  );
  if (manualFullGrant && currentPlan !== "premium") {
    currentPlan = "premium";
  }
  var currentPlanRef = useRef(currentPlan || "free");
  // persistAccountPlan rimossa: Firestore Security Rules bloccano scrittura piano dal client
  function setCurrentPlan(nextPlan) {
    var safePlan = PLAN_LIMITS[nextPlan] ? nextPlan : "free";
    var previousPlan = String(currentPlanRef.current || currentPlan || "free");
    currentPlanRef.current = safePlan;
    setCurrentPlanRaw(safePlan);
    try {
      localStorage.setItem(userKey("plan_v1"), JSON.stringify(safePlan));
    } catch (e) {}
    if (userId && previousPlan !== safePlan) {
      writeTechnicalLog({
        category: "PLAN_CHANGED",
        operation: "plan-change",
        metadata: { from: previousPlan, to: safePlan },
      }).catch(function () {});
    }
  }
  useEffect(
    function () {
      currentPlanRef.current = currentPlan || "free";
    },
    [currentPlan]
  );
  var realtimeWarmupRef = useRef("");
  useEffect(
    function () {
      if (currentPlan !== "base" && currentPlan !== "premium") return;
      var uid = String(
        (fbAuth.currentUser && fbAuth.currentUser.uid) || userId || ""
      );
      if (!uid || realtimeWarmupRef.current === uid) return;
      realtimeWarmupRef.current = uid;
      var cancelled = false;
      var timer = setTimeout(async function () {
        try {
          var user = fbAuth.currentUser;
          if (!user || cancelled) return;
          var token = await user.getIdToken();
          if (cancelled) return;
          var endpoint = AI_AGENT_ENDPOINT.replace(
            /askFinanceAI(?:\?.*)?$/,
            "createFinanceRealtimeSession"
          );
          await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ warmup: true }),
            keepalive: true,
          });
        } catch (e) {}
      }, 900);
      return function () {
        cancelled = true;
        clearTimeout(timer);
      };
    },
    [currentPlan, userId]
  );
  var [planUsage, setPlanUsage] = useStorage(userKey("plan_usage_v1"), {});
  var [shareReceivedInvites, setShareReceivedInvites] = useState([]);
  var [shareReceivedNotifications, setShareReceivedNotifications] = useState(
    []
  );
  var [shareInviteLoading, setShareInviteLoading] = useState(false);

  function isActiveManualGrant(data) {
    if (!data || data.active === false || data.enabled === false) return false;
    var plan = String(
      data.plan || data.level || data.tier || data.access || ""
    ).toLowerCase();
    var full =
      plan === "premium" ||
      plan === "complete" ||
      plan === "completo" ||
      plan === "full" ||
      data.fullAccess === true ||
      data.premium === true;
    if (!full) return false;
    var exp = data.expiresAt || data.expiry || data.validUntil || null;
    if (!exp) return true;
    var ms = 0;
    try {
      if (exp && typeof exp.toDate === "function") ms = exp.toDate().getTime();
      else ms = new Date(exp).getTime();
    } catch (e) {
      ms = 0;
    }
    return !ms || ms > Date.now();
  }
  function manualGrantEmailDocId(email) {
    return encodeURIComponent(normalizeEmail(email));
  }
  useEffect(
    function () {
      var cancelled = false;
      async function loadManualGrant() {
        var authUser = fbAuth && fbAuth.currentUser ? fbAuth.currentUser : null;
        var grantUid = userId || (authUser && authUser.uid) || "";
        if (!grantUid) {
          setManualFullGrant(false);
          return;
        }
        try {
          if (authUser && authUser.getIdToken) await authUser.getIdToken(true);
        } catch (e) {}
        var email = normalizeEmail(
          (currentUser && currentUser.email) ||
            (authUser && authUser.email) ||
            ""
        );
        var emailId = email ? manualGrantEmailDocId(email) : "";
        var candidates = [];
        candidates.push(["manualGrants", grantUid]);
        if (email) candidates.push(["manualGrants", email]); // metodo semplice: manualGrants/email@dominio.it
        if (emailId && emailId !== email)
          candidates.push(["manualGrants", emailId]); // compatibilità con email URL-encoded
        candidates.push(["manual_grants", grantUid]);
        if (email) candidates.push(["manual_grants", email]);
        if (emailId && emailId !== email)
          candidates.push(["manual_grants", emailId]);
        candidates.push(["fullAccessGrants", grantUid]);
        if (email) candidates.push(["fullAccessGrants", email]);
        if (emailId && emailId !== email)
          candidates.push(["fullAccessGrants", emailId]);
        var active = false;
        for (var i = 0; i < candidates.length && !active; i++) {
          try {
            var snap = await getDoc(
              doc(fbDb, candidates[i][0], candidates[i][1])
            );
            if (snap.exists() && isActiveManualGrant(snap.data()))
              active = true;
          } catch (e) {
            console.warn(
              "manual grant read failed",
              candidates[i][0] + "/" + candidates[i][1],
              (e && e.code) || e
            );
          }
        }
        if (!active && email) {
          try {
            var qs = await getDocs(
              query(
                collection(fbDb, "manualGrants"),
                where("email", "==", email),
                limit(1)
              )
            );
            if (qs && qs.docs && qs.docs.length)
              active = isActiveManualGrant(qs.docs[0].data());
          } catch (e) {
            console.warn("manual grant email query failed", (e && e.code) || e);
          }
        }
        if (cancelled) return;
        setManualFullGrant(!!active);
        if (active) {
          currentPlanRef.current = "premium";
          setCurrentPlanRaw("premium");
          try {
            localStorage.setItem(userKey("plan_v1"), JSON.stringify("premium"));
          } catch (e) {}
        }
      }
      loadManualGrant();
      var t = setTimeout(loadManualGrant, 1500);
      return function () {
        cancelled = true;
        clearTimeout(t);
      };
    },
    [userId, currentUser && currentUser.email]
  );

  // ── FIRESTORE SYNC V2 ─────────────────────────────────────────────────────
  // La sincronizzazione mantiene una copia locale per l'uso offline e usa Firestore
  // come sorgente condivisa. Le sezioni con contenuti modificabili da più dispositivi
  // (in particolare Spesa) vengono unite per elemento tramite timestamp e cancellazioni.
  var [firestoreReady, setFirestoreReady] = useState(false);
  var [isOffline, setIsOffline] = useState(!navigator.onLine);
  useEffect(function () {
    function goOnline() {
      setIsOffline(false);
    }
    function goOffline() {
      setIsOffline(true);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return function () {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  function currentHomeSyncValue() {
    return {
      homeBalanceView: homeBalanceView === "reale" ? "reale" : "rateizzato",
      homeWorklets: normalizeHomeWorkletsValue(
        homeWorklets,
        DEFAULT_HOME_WORKLETS
      ),
      showAppSummaryHeader: !!showAppSummaryHeader,
      mobileNavOrder: normalizeStringOrderValue(
        mobileNavOrder,
        DEFAULT_MOBILE_NAV_ORDER
      ),
      mobileNavIconCount: Math.max(
        3,
        Math.min(7, Number(mobileNavIconCount || 5))
      ),
      mobileMenuOrder: normalizeStringOrderValue(
        mobileMenuOrder,
        DEFAULT_MOBILE_MENU_ORDER
      ),
      mobileAllNavOrder: normalizeStringOrderValue(
        mobileAllNavOrder,
        DEFAULT_MOBILE_ALL_NAV_ORDER
      ),
    };
  }
  function isCustomHomeSyncValue(value) {
    var v = value || {};
    return (
      !syncJsonEqual(
        normalizeHomeWorkletsValue(v.homeWorklets, DEFAULT_HOME_WORKLETS),
        DEFAULT_HOME_WORKLETS
      ) ||
      String(v.homeBalanceView || "rateizzato") !== "rateizzato" ||
      v.showAppSummaryHeader === false ||
      !syncJsonEqual(
        normalizeStringOrderValue(v.mobileNavOrder, DEFAULT_MOBILE_NAV_ORDER),
        DEFAULT_MOBILE_NAV_ORDER
      ) ||
      Number(v.mobileNavIconCount || 5) !== 5 ||
      !syncJsonEqual(
        normalizeStringOrderValue(v.mobileMenuOrder, DEFAULT_MOBILE_MENU_ORDER),
        DEFAULT_MOBILE_MENU_ORDER
      ) ||
      !syncJsonEqual(
        normalizeStringOrderValue(
          v.mobileAllNavOrder,
          DEFAULT_MOBILE_ALL_NAV_ORDER
        ),
        DEFAULT_MOBILE_ALL_NAV_ORDER
      )
    );
  }
  function currentCategoryPreferencesV2() {
    return {
      catOrder: (catOrder || []).map(String),
      methodOrder: (methodOrder || []).map(String),
      catSortMode: String(catSortMode || "group"),
      methodSortMode: String(methodSortMode || "group"),
      defaultExpenseCat: String(defaultExpenseCat || ""),
      defaultExpenseMethod: String(defaultExpenseMethod || ""),
      defaultIncomeType: String(defaultIncomeType || ""),
      defaultExpenseArea: String(defaultExpenseArea || ""),
      defaultIncomeArea: String(defaultIncomeArea || ""),
      defaultMethodArea: String(defaultMethodArea || ""),
      incomeTypeOrder: Array.isArray(incomeTypeOrder)
        ? incomeTypeOrder.map(String)
        : [],
    };
  }
  function currentDisplayPreferencesV2() {
    return {
      currency: String(currency || getDefaultCurrency()),
      secondaryCurrency: String(secondaryCurrency || ""),
      showSecInHistory: !!showSecInHistory,
      showSecInStats: !!showSecInStats,
      showSecInBudget: !!showSecInBudget,
      showSecInPatrimonio: !!showSecInPatrimonio,
      dateFmt: String(dateFmt || getDefaultDateFormat()),
      firstDayOfWeek: String(firstDayOfWeek || "mon"),
      statsView: String(statsView || "rateizzato"),
      btnStyle: String(btnStyle || "soft"),
      expenseColor: String(expenseColor || "#E24B4A"),
      incomeColor: String(incomeColor || "#1D9E75"),
      confirmButtonColor: String(confirmButtonColor || "#378ADD"),
      secondaryButtonColor: String(secondaryButtonColor || "#5FAFE5"),
    };
  }
  function currentShoppingPreferencesV2() {
    return {
      shoppingAreas: Array.isArray(shoppingAreas)
        ? shoppingAreas
        : DEFAULT_SHOPPING_AREAS,
      shoppingAreaIcons:
        shoppingAreaIcons && typeof shoppingAreaIcons === "object"
          ? shoppingAreaIcons
          : {},
      shoppingAreaColors:
        shoppingAreaColors && typeof shoppingAreaColors === "object"
          ? shoppingAreaColors
          : {},
      shoppingBoughtColor: String(shoppingBoughtColor || "#EAF7EE"),
      shoppingDefaultArea: String(shoppingDefaultArea || "Alimenti"),
      shoppingUnits:
        Array.isArray(shoppingUnits) && shoppingUnits.length
          ? shoppingUnits
          : DEFAULT_SHOPPING_UNITS,
      shoppingDefaultUnit: String(shoppingDefaultUnit || "Unità"),
      shoppingProductSort: String(shoppingProductSort || "custom"),
    };
  }
  function currentPatrimonyPreferencesV2() {
    return { patrimonioMode: String(patrimonioMode || "manuale") };
  }
  function currentAIConsentV2() {
    return {
      accepted: !!aiExternalConsent,
      acceptedAt: aiExternalConsent ? String(aiExternalConsentAt || "") : "",
      textVersion: AI_CONSENT_TEXT_VERSION,
    };
  }
  function currentLegalAcceptanceV2() {
    var accepted =
      !!legalAcceptanceCommitted || (!!termsAccepted && !!privacyAccepted);
    return {
      accepted: accepted,
      terms: accepted || !!termsAccepted,
      privacy: accepted || !!privacyAccepted,
      metaEventsConsent: !!metaEventsConsent,
      acceptedAt: accepted
        ? String(
            legalAcceptanceDate ||
              readLegacyLegalDate() ||
              new Date().toISOString()
          )
        : "",
      version: LEGAL_ACCEPTANCE_VERSION,
    };
  }
  function syncValueIsDefault(value, defaultValue) {
    return syncJsonEqual(value, defaultValue);
  }
  function chooseMigratedPreference(
    localValue,
    cloudValue,
    defaultValue,
    cloudHasValue,
    preferAllLocal
  ) {
    if (preferAllLocal || !cloudHasValue) return localValue;
    if (
      !syncValueIsDefault(localValue, defaultValue) &&
      syncValueIsDefault(cloudValue, defaultValue)
    )
      return localValue;
    return cloudValue;
  }

  useEffect(
    function () {
      if (!userId) {
        setFirestoreReady(true);
        return;
      }
      if (!sensitiveStorageReady) {
        setFirestoreReady(false);
        return;
      }
      firestoreHydratedRef.current = false;
      setFirestoreReady(false);
      var localSnap: any = {
        catalogSyncMetaV3: readCatalogSyncMetaV3(),
        expenses: readUserLocalJson("exp_v10", []),
        incomes: readUserLocalJson("inc_v10", []),
        recurring: readUserLocalJson("rec_v10", []),
        goals: readUserLocalJson("goals_v1", DEFAULT_GOALS),
        alerts: readUserLocalJson("alerts_v1", []),
        budgetPlan: readUserLocalJson("budget_plan_v1", DEFAULT_BUDGET_PLAN),
        cats: readUserLocalJson("cats_v10", DEFAULT_CATS),
        methods: readUserLocalJson("meth_v10", DEFAULT_METHODS),
        expenseGroups: readUserLocalJson(
          "expense_groups_v1",
          DEFAULT_EXPENSE_GROUPS
        ),
        incomeGroups: readUserLocalJson(
          "income_groups_v1",
          DEFAULT_INCOME_GROUPS
        ),
        methodGroups: readUserLocalJson(
          "method_groups_v1",
          DEFAULT_METHOD_GROUPS
        ),
        customIncomeTypes: readUserLocalJson("custom_income_types_v1", []),
        incomeTypeOverrides: readUserLocalJson("income_type_overrides_v1", {}),
        categoryPreferencesV2: {
          catOrder: readUserLocalJson("cat_order_v1", []),
          methodOrder: readUserLocalJson("method_order_v1", []),
          catSortMode: readUserLocalJson("cat_sort_mode", "group"),
          methodSortMode: readUserLocalJson("method_sort_mode", "group"),
          defaultExpenseCat: readUserLocalJson("default_expense_cat_v1", "4"),
          defaultExpenseMethod: readUserLocalJson(
            "default_expense_method_v1",
            "8"
          ),
          defaultIncomeType: readUserLocalJson(
            "default_income_type_v1",
            "salario"
          ),
          defaultExpenseArea: readUserLocalJson(
            "default_expense_area_v1",
            "vita"
          ),
          defaultIncomeArea: readUserLocalJson(
            "default_income_area_v1",
            "lavoro"
          ),
          defaultMethodArea: readUserLocalJson(
            "default_method_area_v1",
            "conti_carte"
          ),
          incomeTypeOrder: readUserLocalJson("income_type_order_v1", []),
        },
        categoryPreferencesUpdatedAt: readUserLocalUpdatedAt(
          "category_preferences_v2"
        ),
        patrimonioValues: readUserLocalJson("patrimonio_values_v1", {}),
        patrimonioAreas: readUserLocalJson(
          "patrimonio_areas_v1",
          DEFAULT_PATRIMONIO_AREAS
        ),
        patrimonioEntries: readUserLocalJson(
          "patrimonio_entries_v1",
          DEFAULT_PATRIMONIO_ENTRIES
        ),
        patrimonioHistory: readUserLocalJson("patrimonio_history_v1", {}),
        patrimonioNotes: readUserLocalJson("patrimonio_notes_v1", {}),
        patrimonyPreferencesV2: {
          patrimonioMode: readUserLocalJson("patrimonio_mode_v1", "manuale"),
        },
        patrimonyPreferencesUpdatedAt: readUserLocalUpdatedAt(
          "patrimony_preferences_v2"
        ),
        displayPreferencesV2: {
          currency: readUserLocalJson("pref_cur", getDefaultCurrency()),
          secondaryCurrency: readUserLocalJson("pref_sec_cur", ""),
          showSecInHistory: readUserLocalJson("pref_sec_history", true),
          showSecInStats: readUserLocalJson("pref_sec_stats", true),
          showSecInBudget: readUserLocalJson("pref_sec_budget", false),
          showSecInPatrimonio: readUserLocalJson("pref_sec_patrimonio", false),
          dateFmt: readUserLocalJson("pref_datefmt", getDefaultDateFormat()),
          firstDayOfWeek: readUserLocalJson("pref_first_day_week", "mon"),
          statsView: readUserLocalJson("pref_statsview", "rateizzato"),
          btnStyle: readUserLocalJson("pref_btn_style", "soft"),
          expenseColor: readUserLocalJson("pref_exp_color", "#E24B4A"),
          incomeColor: readUserLocalJson("pref_inc_color", "#1D9E75"),
          confirmButtonColor: readUserLocalJson(
            "pref_confirm_color",
            "#378ADD"
          ),
          secondaryButtonColor: readUserLocalJson(
            "pref_secondary_button_color_v1",
            "#5FAFE5"
          ),
        },
        displayPreferencesUpdatedAt: readUserLocalUpdatedAt(
          "display_preferences_v2"
        ),
        homePreferencesV2: {
          homeBalanceView: readUserLocalJson("pref_home_balance", "rateizzato"),
          homeWorklets: readUserLocalJson(
            "home_worklets_v1",
            DEFAULT_HOME_WORKLETS
          ),
          showAppSummaryHeader: readUserLocalJson(
            "pref_show_app_summary_header_v1",
            true
          ),
          mobileNavOrder: readUserLocalJson(
            "pref_mobile_nav_order_v1",
            DEFAULT_MOBILE_NAV_ORDER
          ),
          mobileNavIconCount: readUserLocalJson(
            "pref_mobile_nav_icon_count_v1",
            5
          ),
          mobileMenuOrder: readUserLocalJson(
            "pref_mobile_menu_order_v1",
            DEFAULT_MOBILE_MENU_ORDER
          ),
          mobileAllNavOrder: readUserLocalJson(
            "pref_mobile_all_nav_order_v1",
            DEFAULT_MOBILE_ALL_NAV_ORDER
          ),
        },
        homePreferencesUpdatedAt: readUserLocalUpdatedAt("home_preferences"),
        appuntiDocuments: readUserLocalJson("appunti_documents_v1", []),
        appuntiNotes: readUserLocalJson("appunti_notes_v1", []),
        bankCoords: Array.isArray(bankCoords) ? bankCoords : [],
        creditCards: Array.isArray(creditCards) ? creditCards : [],
        shareProjects: readUserLocalJson("share_projects_v1", []),
        debtCredits: readUserLocalJson("debt_credits_v1", []),
        shareReceiptUploads: readUserLocalJson("share_receipt_uploads_v1", []),
        accountDeletedRecords: readUserLocalJson(
          "account_deleted_records_v1",
          {}
        ),
        shoppingCards: readUserLocalJson("shopping_cards_v1", []),
        shoppingCardsUpdatedAt: readUserLocalUpdatedAt("shopping_cards"),
        shoppingItems: readUserLocalJson("shopping_items_v1", []),
        shoppingItemsUpdatedAt: shoppingItemsLocalUpdatedAt(),
        shoppingLists: readUserLocalJson("shopping_lists_v2", [
          { id: "main", title: "Lista principale", icon: "🧺", createdAt: "" },
        ]),
        shoppingListsUpdatedAt: readUserLocalUpdatedAt("shopping_lists"),
        shoppingDeletedRecords: readUserLocalJson(
          "shopping_deleted_records_v2",
          {}
        ),
        shoppingPreferencesV2: {
          shoppingAreas: readUserLocalJson(
            "shopping_areas_v1",
            DEFAULT_SHOPPING_AREAS
          ),
          shoppingAreaIcons: readUserLocalJson("shopping_area_icons_v1", {}),
          shoppingAreaColors: readUserLocalJson("shopping_area_colors_v1", {}),
          shoppingBoughtColor: readUserLocalJson(
            "shopping_bought_color_v1",
            "#EAF7EE"
          ),
          shoppingDefaultArea: readUserLocalJson(
            "shopping_default_area_v1",
            "Alimenti"
          ),
          shoppingUnits: readUserLocalJson(
            "shopping_units_v1",
            DEFAULT_SHOPPING_UNITS
          ),
          shoppingDefaultUnit: readUserLocalJson(
            "shopping_default_unit_v1",
            "Unità"
          ),
          shoppingProductSort: readUserLocalJson(
            "shopping_product_sort_v1",
            "custom"
          ),
        },
        shoppingPreferencesUpdatedAt: readUserLocalUpdatedAt(
          "shopping_preferences_v2"
        ),
        aiConsentV2: {
          accepted: readAIExternalConsentLocal(),
          acceptedAt: readAIExternalConsentAtLocal(),
          textVersion: AI_CONSENT_TEXT_VERSION,
        },
        aiConsentUpdatedAt: readUserLocalUpdatedAt("ai_consent_v2"),
        legalAcceptanceV2: readLegalAcceptanceV2Local(),
        legalAcceptanceUpdatedAt: readUserLocalUpdatedAt("legal_acceptance_v2"),
        customNotifs: readUserLocalJson("custom_notifs_v1", []),
        notifPrefs: readUserLocalJson("notif_prefs_v1", {
          remindActive: false,
          remindFreq: "daily",
          remindHour: "20:00",
          stipendioActive: true,
          stipendioHour: "18:00",
          stipendioDay: 0,
          spesaRicorrente: true,
        }),
        planUsage: readUserLocalJson("plan_usage_v1", {}),
        shownAlertIds: readUserLocalJson("shown_alert_ids_v2", []),
        onboardingGuideSeen: readUserLocalJson(
          "onboarding_guide_seen_v1",
          false
        ),
        initialSetupStatus: readUserLocalJson("initial_setup_status_v1", ""),
        termsAccepted: readUserLocalJson("terms_accepted_v1", false),
        privacyAccepted: readUserLocalJson("privacy_accepted_v1", false),
        metaEventsConsent: readUserLocalJson("meta_events_consent_v1", false),
        legalAcceptanceDate: readUserLocalJson("legal_acceptance_date_v1", ""),
      };

      beginRemoteApply();
      setAccountDeletedRecordsRaw(localSnap.accountDeletedRecords || {});
      setExpenses(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.expenses) ? localSnap.expenses : [],
          function (item) {
            return accountSyncRecordKey("expense", item);
          }
        )
      );
      setIncomes(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.incomes) ? localSnap.incomes : [],
          function (item) {
            return accountSyncRecordKey("income", item);
          }
        )
      );
      setRecurring(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.recurring) ? localSnap.recurring : [],
          function (item) {
            return accountSyncRecordKey("recurring", item);
          }
        )
      );
      setGoals(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.goals) ? localSnap.goals : DEFAULT_GOALS,
          function (item) {
            return accountSyncRecordKey("goal", item);
          }
        )
      );
      setAlerts(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.alerts) ? localSnap.alerts : [],
          function (item) {
            return accountSyncRecordKey("alert", item);
          }
        )
      );
      setBudgetPlan(localSnap.budgetPlan || DEFAULT_BUDGET_PLAN);
      setCats(
        Array.isArray(localSnap.cats) && localSnap.cats.length
          ? localSnap.cats
          : DEFAULT_CATS
      );
      setMethods(
        ensureReferencedMethods(
          Array.isArray(localSnap.methods) && localSnap.methods.length
            ? localSnap.methods
            : DEFAULT_METHODS,
          localSnap.expenses,
          localSnap.recurring
        )
      );
      setExpenseGroups(
        Array.isArray(localSnap.expenseGroups) && localSnap.expenseGroups.length
          ? localSnap.expenseGroups
          : DEFAULT_EXPENSE_GROUPS
      );
      setIncomeGroups(
        Array.isArray(localSnap.incomeGroups) && localSnap.incomeGroups.length
          ? localSnap.incomeGroups
          : DEFAULT_INCOME_GROUPS
      );
      setMethodGroups(
        Array.isArray(localSnap.methodGroups) && localSnap.methodGroups.length
          ? localSnap.methodGroups
          : DEFAULT_METHOD_GROUPS
      );
      setCustomIncomeTypes(
        Array.isArray(localSnap.customIncomeTypes)
          ? localSnap.customIncomeTypes
          : []
      );
      setIncomeTypeOverrides(localSnap.incomeTypeOverrides || {});
      var lc = localSnap.categoryPreferencesV2;
      setCatOrder(Array.isArray(lc.catOrder) ? lc.catOrder.map(String) : []);
      setMethodOrder(
        Array.isArray(lc.methodOrder) ? lc.methodOrder.map(String) : []
      );
      setCatSortMode(String(lc.catSortMode || "group"));
      setMethodSortMode(String(lc.methodSortMode || "group"));
      setDefaultExpenseCat(String(lc.defaultExpenseCat || ""));
      setDefaultExpenseMethod(String(lc.defaultExpenseMethod || ""));
      setDefaultIncomeType(String(lc.defaultIncomeType || ""));
      setDefaultExpenseArea(String(lc.defaultExpenseArea || "vita"));
      setDefaultIncomeArea(String(lc.defaultIncomeArea || "lavoro"));
      setDefaultMethodArea(String(lc.defaultMethodArea || "conti_carte"));
      setIncomeTypeOrder(
        Array.isArray(lc.incomeTypeOrder) ? lc.incomeTypeOrder.map(String) : []
      );
      setPatrimonioValues(localSnap.patrimonioValues || {});
      setPatrimonioAreas(
        Array.isArray(localSnap.patrimonioAreas)
          ? localSnap.patrimonioAreas
          : DEFAULT_PATRIMONIO_AREAS
      );
      setPatrimonioEntries(
        Array.isArray(localSnap.patrimonioEntries)
          ? localSnap.patrimonioEntries
          : DEFAULT_PATRIMONIO_ENTRIES
      );
      setPatrimonioHistory(localSnap.patrimonioHistory || {});
      setPatrimonioNotes(localSnap.patrimonioNotes || {});
      setPatrimonioMode(
        String(localSnap.patrimonyPreferencesV2.patrimonioMode || "manuale")
      );
      var ld = localSnap.displayPreferencesV2;
      setCurrency(String(ld.currency || getDefaultCurrency()));
      setSecondaryCurrency(String(ld.secondaryCurrency || ""));
      setShowSecInHistory(ld.showSecInHistory !== false);
      setShowSecInStats(ld.showSecInStats !== false);
      setShowSecInBudget(!!ld.showSecInBudget);
      setShowSecInPatrimonio(!!ld.showSecInPatrimonio);
      setDateFmt(String(ld.dateFmt || getDefaultDateFormat()));
      setFirstDayOfWeek(String(ld.firstDayOfWeek || "mon"));
      setStatsView(String(ld.statsView || "rateizzato"));
      setBtnStyle(String(ld.btnStyle || "soft"));
      setExpenseColor(String(ld.expenseColor || "#E24B4A"));
      setIncomeColor(String(ld.incomeColor || "#1D9E75"));
      setConfirmButtonColor(String(ld.confirmButtonColor || "#378ADD"));
      setSecondaryButtonColor(String(ld.secondaryButtonColor || "#5FAFE5"));
      var lh = localSnap.homePreferencesV2;
      setHomeBalanceViewRaw(
        lh.homeBalanceView === "reale" ? "reale" : "rateizzato"
      );
      setHomeWorkletsRaw(
        normalizeHomeWorkletsValue(lh.homeWorklets, DEFAULT_HOME_WORKLETS)
      );
      setShowAppSummaryHeaderRaw(lh.showAppSummaryHeader !== false);
      setMobileNavOrderRaw(
        normalizeStringOrderValue(lh.mobileNavOrder, DEFAULT_MOBILE_NAV_ORDER)
      );
      setMobileNavIconCountRaw(
        Math.max(3, Math.min(7, Number(lh.mobileNavIconCount || 5)))
      );
      setMobileMenuOrderRaw(
        normalizeStringOrderValue(lh.mobileMenuOrder, DEFAULT_MOBILE_MENU_ORDER)
      );
      setMobileAllNavOrderRaw(
        normalizeStringOrderValue(
          lh.mobileAllNavOrder,
          DEFAULT_MOBILE_ALL_NAV_ORDER
        )
      );
      setAppuntiDocuments(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.appuntiDocuments)
            ? localSnap.appuntiDocuments
            : [],
          function (item) {
            return accountSyncRecordKey("document", item);
          }
        )
      );
      setAppuntiNotes(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.appuntiNotes) ? localSnap.appuntiNotes : [],
          function (item) {
            return accountSyncRecordKey("note", item);
          }
        )
      );
      setBankCoords(
        Array.isArray(localSnap.bankCoords) ? localSnap.bankCoords : []
      );
      setCreditCards(
        Array.isArray(localSnap.creditCards) ? localSnap.creditCards : []
      );
      setShareProjects(
        Array.isArray(localSnap.shareProjects) ? localSnap.shareProjects : []
      );
      setDebtCredits(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.debtCredits) ? localSnap.debtCredits : [],
          function (item) {
            return accountSyncRecordKey("debt", item);
          }
        )
      );
      setShareReceiptUploads(
        Array.isArray(localSnap.shareReceiptUploads)
          ? localSnap.shareReceiptUploads
          : []
      );
      setShoppingDeletedRecordsRaw(localSnap.shoppingDeletedRecords || {});
      setShoppingCards(
        Array.isArray(localSnap.shoppingCards) ? localSnap.shoppingCards : []
      );
      setShoppingItems(
        Array.isArray(localSnap.shoppingItems) ? localSnap.shoppingItems : []
      );
      setShoppingLists(
        Array.isArray(localSnap.shoppingLists) && localSnap.shoppingLists.length
          ? localSnap.shoppingLists
          : [
              {
                id: "main",
                title: "Lista principale",
                icon: "🧺",
                createdAt: "",
              },
            ]
      );
      var lsp = localSnap.shoppingPreferencesV2;
      setShoppingAreas(
        Array.isArray(lsp.shoppingAreas) && lsp.shoppingAreas.length
          ? lsp.shoppingAreas
          : DEFAULT_SHOPPING_AREAS
      );
      setShoppingAreaIcons(lsp.shoppingAreaIcons || {});
      setShoppingAreaColors(lsp.shoppingAreaColors || {});
      setShoppingBoughtColor(String(lsp.shoppingBoughtColor || "#EAF7EE"));
      setShoppingDefaultArea(String(lsp.shoppingDefaultArea || "Alimenti"));
      setShoppingProductSort(String(lsp.shoppingProductSort || "custom"));
      setAiExternalConsent(
        !!localSnap.aiConsentV2.accepted,
        localSnap.aiConsentV2.acceptedAt
      );
      setCustomNotifs(
        stampLocalSyncRecords(
          [],
          Array.isArray(localSnap.customNotifs) ? localSnap.customNotifs : [],
          function (item) {
            return accountSyncRecordKey("notification", item);
          }
        )
      );
      setNotifPrefs(localSnap.notifPrefs || {});
      setPlanUsage(localSnap.planUsage || {});
      setShownAlertIds(
        Array.isArray(localSnap.shownAlertIds) ? localSnap.shownAlertIds : []
      );
      var localFlowDone =
        onboardingFlowCompleteRef.current ||
        readLocalOnboardingFlag("onboarding_flow_complete_v2");
      var localGuideDone =
        onboardingGuideLocalSeenRef.current ||
        readLocalOnboardingFlag("onboarding_guide_completed_local_v2");
      var restoredSetupStatus = String(localSnap.initialSetupStatus || "");
      setOnboardingGuideSeen(
        localFlowDone || localGuideDone || !!localSnap.onboardingGuideSeen
      );
      setInitialSetupStatus(
        localFlowDone
          ? "complete"
          : localGuideDone && !restoredSetupStatus
          ? "essential_pending"
          : restoredSetupStatus
      );
      var profileLegal: any = fainanceResolveLegalAcceptance(
        currentUser,
        currentUser
      );
      var localLegal: any =
        profileLegal ||
        (localSnap.legalAcceptanceV2 &&
        typeof localSnap.legalAcceptanceV2 === "object"
          ? localSnap.legalAcceptanceV2
          : null);
      var localLegalAccepted =
        !!profileLegal ||
        !!(
          localLegal &&
          localLegal.accepted &&
          localLegal.terms &&
          localLegal.privacy
        ) ||
        !!(localSnap.termsAccepted && localSnap.privacyAccepted) ||
        readLegalAcceptanceCommittedLocal();
      if (localLegalAccepted) {
        var localAcceptedAt = String(
          (localLegal && localLegal.acceptedAt) ||
            localSnap.legalAcceptanceDate ||
            readLegacyLegalDate() ||
            new Date().toISOString()
        );
        var localMeta =
          localLegal && localLegal.metaEventsConsent !== undefined
            ? !!localLegal.metaEventsConsent
            : !!localSnap.metaEventsConsent;
        writeLegalAcceptanceLocal(localAcceptedAt, localMeta);
        setLegalAcceptanceCommitted(true);
        setTermsAccepted(true);
        setPrivacyAccepted(true);
        setMetaEventsConsent(localMeta);
        setLegalAcceptanceDate(localAcceptedAt);
      } else {
        setLegalAcceptanceCommitted(false);
        setTermsAccepted(false);
        setPrivacyAccepted(false);
        setMetaEventsConsent(!!localSnap.metaEventsConsent);
        setLegalAcceptanceDate(String(localSnap.legalAcceptanceDate || ""));
      }
      endRemoteApply();

      var docRef = doc(fbDb, "userData", userId);
      var cancelled = false;
      var firstSnapshot = true;
      var readyFallback = setTimeout(function () {
        if (!cancelled) {
          console.warn("Firestore load timeout", userId);
          firestoreHydratedRef.current = true;
          setFirestoreReady(true);
        }
      }, 12000);
      var unsubData: any = null;
      try {
        unsubData = onSnapshot(
          docRef,
          async function (snap: any) {
            if (cancelled) return;
            clearTimeout(readyFallback);
            beginRemoteApply();
            if (snap.exists()) {
              var rawCloud: any = snap.data() || {};
              lastCloudRawKeysRef.current = Object.keys(rawCloud);
              var d: any = await fainanceExpandAccountCloudDataV5(rawCloud);
              lastCloudExpandedDataRef.current = d;
              var isFirstSnapshot = firstSnapshot;
              firstSnapshot = false;
              lastCloudIntegrityRef.current =
                d.dataIntegrityV1 && typeof d.dataIntegrityV1 === "object"
                  ? d.dataIntegrityV1
                  : {
                      expenses: Array.isArray(d.expenses)
                        ? d.expenses.length
                        : 0,
                      incomes: Array.isArray(d.incomes) ? d.incomes.length : 0,
                      recurring: Array.isArray(d.recurring)
                        ? d.recurring.length
                        : 0,
                      goals: Array.isArray(d.goals) ? d.goals.length : 0,
                      alerts: Array.isArray(d.alerts) ? d.alerts.length : 0,
                      shoppingItems: Array.isArray(d.shoppingItems)
                        ? d.shoppingItems.length
                        : 0,
                      shoppingLists: Array.isArray(d.shoppingLists)
                        ? d.shoppingLists.length
                        : 0,
                      shoppingCards: Array.isArray(d.shoppingCards)
                        ? d.shoppingCards.length
                        : 0,
                      debtCredits: Array.isArray(d.debtCredits)
                        ? d.debtCredits.length
                        : 0,
                      shareProjects: Array.isArray(d.shareProjects)
                        ? d.shareProjects.length
                        : 0,
                      appuntiDocuments: Array.isArray(d.appuntiDocuments)
                        ? d.appuntiDocuments.length
                        : 0,
                      appuntiNotes: Array.isArray(d.appuntiNotes)
                        ? d.appuntiNotes.length
                        : 0,
                    };
              var pendingSync: any = pendingAccountSyncRef.current || {
                revision: 0,
                token: "",
              };
              var preserveLatestLocalOnFirst =
                isFirstSnapshot && Number(pendingSync.revision || 0) > 0;
              if (!isFirstSnapshot && Number(pendingSync.revision || 0) > 0) {
                var incomingSyncToken = String(d.syncClientWriteToken || "");
                if (
                  pendingSync.token &&
                  incomingSyncToken === String(pendingSync.token)
                ) {
                  // Questo e' l'eco della modifica appena effettuata su questo dispositivo.
                  // Non riapplicare l'intero documento Firestore: su iOS causava centinaia
                  // di aggiornamenti React, reset delle impostazioni e tocchi apparentemente ignorati.
                  pendingAccountSyncRef.current = { revision: 0, token: "" };
                  clearAccountSyncPendingOnDevice();
                  firestoreHydratedRef.current = true;
                  setFirestoreReady(true);
                  endRemoteApply();
                  return;
                } else {
                  // Non applicare uno snapshot precedente alla modifica locale: altrimenti
                  // l'elemento appena creato scompare prima del salvataggio sul cloud.
                  firestoreHydratedRef.current = true;
                  setFirestoreReady(true);
                  endRemoteApply();
                  return;
                }
              }
              var backfill: any = { accountSyncSchemaVersion: 5 };
              var needsBackfill = false;
              var latestLocalExpenses = readUserLocalJson(
                "exp_v10",
                localSnap.expenses
              );
              var latestLocalIncomes = readUserLocalJson(
                "inc_v10",
                localSnap.incomes
              );
              var latestLocalRecurring = readUserLocalJson(
                "rec_v10",
                localSnap.recurring
              );
              var latestLocalGoals = readUserLocalJson(
                "goals_v1",
                localSnap.goals
              );
              var latestLocalAlerts = readUserLocalJson(
                "alerts_v1",
                localSnap.alerts
              );
              var latestLocalDebtCredits = readUserLocalJson(
                "debt_credits_v1",
                localSnap.debtCredits
              );
              var latestLocalAppuntiDocuments = readUserLocalJson(
                "appunti_documents_v1",
                localSnap.appuntiDocuments
              );
              var latestLocalAppuntiNotes = readUserLocalJson(
                "appunti_notes_v1",
                localSnap.appuntiNotes
              );
              var latestLocalBankCoords = Array.isArray(bankCoords)
                ? bankCoords
                : localSnap.bankCoords;
              var latestLocalCreditCards = Array.isArray(creditCards)
                ? creditCards
                : localSnap.creditCards;
              var latestLocalCustomNotifs = readUserLocalJson(
                "custom_notifs_v1",
                localSnap.customNotifs
              );
              var latestLocalShareProjects = readUserLocalJson(
                "share_projects_v1",
                localSnap.shareProjects
              );
              var latestLocalShareReceiptUploads = readUserLocalJson(
                "share_receipt_uploads_v1",
                localSnap.shareReceiptUploads
              );
              var latestLocalExpenseGroups = readUserLocalJson(
                "expense_groups_v1",
                localSnap.expenseGroups
              );
              var latestLocalIncomeGroups = readUserLocalJson(
                "income_groups_v1",
                localSnap.incomeGroups
              );
              var latestLocalMethodGroups = readUserLocalJson(
                "method_groups_v1",
                localSnap.methodGroups
              );
              var latestLocalCustomIncomeTypes = readUserLocalJson(
                "custom_income_types_v1",
                localSnap.customIncomeTypes
              );
              var latestLocalIncomeTypeOverrides = readUserLocalJson(
                "income_type_overrides_v1",
                localSnap.incomeTypeOverrides
              );
              var latestLocalPatrimonioValues = readUserLocalJson(
                "patrimonio_values_v1",
                localSnap.patrimonioValues
              );
              var latestLocalPatrimonioAreas = readUserLocalJson(
                "patrimonio_areas_v1",
                localSnap.patrimonioAreas
              );
              var latestLocalPatrimonioEntries = readUserLocalJson(
                "patrimonio_entries_v1",
                localSnap.patrimonioEntries
              );
              var latestLocalPatrimonioHistory = readUserLocalJson(
                "patrimonio_history_v1",
                localSnap.patrimonioHistory
              );
              var latestLocalPatrimonioNotes = readUserLocalJson(
                "patrimonio_notes_v1",
                localSnap.patrimonioNotes
              );
              var latestLocalCats = readUserLocalJson(
                "cats_v10",
                localSnap.cats
              );
              var latestLocalMethods = readUserLocalJson(
                "meth_v10",
                localSnap.methods
              );
              var latestLocalAccountDeleted = readUserLocalJson(
                "account_deleted_records_v1",
                localSnap.accountDeletedRecords || {}
              );
              var localCatsTs = readUserLocalUpdatedAt("cats"),
                localMethodsTs = readUserLocalUpdatedAt("methods"),
                cloudCatsTs = Number(d.catsUpdatedAt || 0),
                cloudMethodsTs = Number(d.methodsUpdatedAt || 0);
              // Test usa un progetto Firebase separato e deve sincronizzare i
              // propri dati come Production. La vecchia modalita' read-only
              // lasciava nel cloud Test cataloghi obsoleti che poi prevalevano.
              var readOnlyTestBuild = false;
              var cloudAccountDeleted =
                d.accountDeletedRecords &&
                typeof d.accountDeletedRecords === "object"
                  ? d.accountDeletedRecords
                  : {};
              var mergedAccountDeleted = mergeSyncTombstones(
                latestLocalAccountDeleted,
                cloudAccountDeleted
              );
              var expenseKey = function (item) {
                return accountSyncRecordKey("expense", item);
              };
              var incomeKey = function (item) {
                return accountSyncRecordKey("income", item);
              };
              var recurringKey = function (item) {
                return accountSyncRecordKey("recurring", item);
              };
              var goalKey = function (item) {
                return accountSyncRecordKey("goal", item);
              };
              var alertKey = function (item) {
                return accountSyncRecordKey("alert", item);
              };
              var cloudExpenses = Array.isArray(d.expenses) ? d.expenses : [];
              var cloudIncomes = Array.isArray(d.incomes) ? d.incomes : [];
              var cloudRecurring = Array.isArray(d.recurring)
                ? d.recurring
                : [];
              var cloudGoals = Array.isArray(d.goals) ? d.goals : [];
              var cloudAlerts = Array.isArray(d.alerts) ? d.alerts : [];
              var mergedExpenses = mergeSyncRecords(
                latestLocalExpenses,
                cloudExpenses,
                mergedAccountDeleted,
                expenseKey,
                true
              );
              var mergedIncomes = mergeSyncRecords(
                latestLocalIncomes,
                cloudIncomes,
                mergedAccountDeleted,
                incomeKey,
                true
              );
              var mergedRecurring = mergeSyncRecords(
                latestLocalRecurring,
                cloudRecurring,
                mergedAccountDeleted,
                recurringKey,
                true
              );
              var mergedGoals = mergeSyncRecords(
                latestLocalGoals,
                cloudGoals,
                mergedAccountDeleted,
                goalKey,
                true
              );
              var mergedAlerts = mergeSyncRecords(
                latestLocalAlerts,
                cloudAlerts,
                mergedAccountDeleted,
                alertKey,
                true
              );
              if (isFirstSnapshot) {
                if (!syncJsonEqual(cloudAccountDeleted, mergedAccountDeleted)) {
                  backfill.accountDeletedRecords = mergedAccountDeleted;
                  needsBackfill = true;
                }
                [
                  ["expenses", cloudExpenses, mergedExpenses],
                  ["incomes", cloudIncomes, mergedIncomes],
                  ["recurring", cloudRecurring, mergedRecurring],
                  ["goals", cloudGoals, mergedGoals],
                  ["alerts", cloudAlerts, mergedAlerts],
                ].forEach(function (entry) {
                  if (!syncJsonEqual(entry[1], entry[2])) {
                    backfill[entry[0]] = entry[2];
                    needsBackfill = true;
                  }
                });
              }
              var localExpenseCatalog = {
                categories: Array.isArray(latestLocalCats)
                  ? latestLocalCats
                  : [],
                groups: Array.isArray(latestLocalExpenseGroups)
                  ? latestLocalExpenseGroups
                  : [],
              };
              var localPaymentCatalog = {
                methods: Array.isArray(latestLocalMethods)
                  ? latestLocalMethods
                  : [],
                groups: Array.isArray(latestLocalMethodGroups)
                  ? latestLocalMethodGroups
                  : [],
              };
              var localIncomeCatalog = {
                groups: Array.isArray(latestLocalIncomeGroups)
                  ? latestLocalIncomeGroups
                  : [],
                customTypes: Array.isArray(latestLocalCustomIncomeTypes)
                  ? latestLocalCustomIncomeTypes
                  : [],
                overrides:
                  latestLocalIncomeTypeOverrides &&
                  typeof latestLocalIncomeTypeOverrides === "object"
                    ? latestLocalIncomeTypeOverrides
                    : {},
              };
              var cloudCatalogSyncV3 =
                d.catalogSyncV3 &&
                typeof d.catalogSyncV3 === "object" &&
                Number(d.catalogSyncV3.schemaVersion || 0) === 3
                  ? d.catalogSyncV3
                  : null;
              var cloudCatalogMetaV3 = cloudCatalogSyncV3
                ? {
                    schemaVersion: 3,
                    revision: Number(cloudCatalogSyncV3.revision || 0),
                    updatedAtMs: Number(cloudCatalogSyncV3.updatedAtMs || 0),
                    writerId: String(cloudCatalogSyncV3.writerId || ""),
                  }
                : null;
              var localCatalogMetaV3 = localSnap.catalogSyncMetaV3 || null;
              var catalogSyncV3Source = preserveLatestLocalOnFirst
                ? "local"
                : compareCatalogSyncMetaV3(
                    localCatalogMetaV3,
                    cloudCatalogMetaV3
                  );
              var cloudExpenseV2 =
                cloudCatalogSyncV3 &&
                cloudCatalogSyncV3.expenseCatalog &&
                typeof cloudCatalogSyncV3.expenseCatalog === "object"
                  ? cloudCatalogSyncV3.expenseCatalog
                  : d.expenseCatalogV2 &&
                    typeof d.expenseCatalogV2 === "object"
                  ? d.expenseCatalogV2
                  : null;
              var cloudPaymentV2 =
                cloudCatalogSyncV3 &&
                cloudCatalogSyncV3.paymentCatalog &&
                typeof cloudCatalogSyncV3.paymentCatalog === "object"
                  ? cloudCatalogSyncV3.paymentCatalog
                  : d.paymentCatalogV2 &&
                    typeof d.paymentCatalogV2 === "object"
                  ? d.paymentCatalogV2
                  : null;
              var cloudIncomeV2 =
                cloudCatalogSyncV3 &&
                cloudCatalogSyncV3.incomeCatalog &&
                typeof cloudCatalogSyncV3.incomeCatalog === "object"
                  ? cloudCatalogSyncV3.incomeCatalog
                  : d.incomeCatalogV2 &&
                    typeof d.incomeCatalogV2 === "object"
                  ? d.incomeCatalogV2
                  : null;
              var cloudExpenseExists =
                !!cloudExpenseV2 ||
                Array.isArray(d.cats) ||
                Array.isArray(d.expenseGroups);
              var cloudPaymentExists =
                !!cloudPaymentV2 ||
                Array.isArray(d.methods) ||
                Array.isArray(d.methodGroups);
              var cloudIncomeExists =
                !!cloudIncomeV2 ||
                Array.isArray(d.incomeGroups) ||
                Array.isArray(d.customIncomeTypes) ||
                (d.incomeTypeOverrides &&
                  typeof d.incomeTypeOverrides === "object");
              var cloudExpenseCatalog = {
                categories: Array.isArray(
                  cloudExpenseV2 && cloudExpenseV2.categories
                )
                  ? cloudExpenseV2.categories
                  : Array.isArray(d.cats)
                  ? d.cats
                  : [],
                groups: Array.isArray(cloudExpenseV2 && cloudExpenseV2.groups)
                  ? cloudExpenseV2.groups
                  : Array.isArray(d.expenseGroups)
                  ? d.expenseGroups
                  : [],
              };
              var cloudPaymentCatalog = {
                methods: Array.isArray(cloudPaymentV2 && cloudPaymentV2.methods)
                  ? cloudPaymentV2.methods
                  : Array.isArray(d.methods)
                  ? d.methods
                  : [],
                groups: Array.isArray(cloudPaymentV2 && cloudPaymentV2.groups)
                  ? cloudPaymentV2.groups
                  : Array.isArray(d.methodGroups)
                  ? d.methodGroups
                  : [],
              };
              var cloudIncomeCatalog = {
                groups: Array.isArray(cloudIncomeV2 && cloudIncomeV2.groups)
                  ? cloudIncomeV2.groups
                  : Array.isArray(d.incomeGroups)
                  ? d.incomeGroups
                  : [],
                customTypes: Array.isArray(
                  cloudIncomeV2 && cloudIncomeV2.customTypes
                )
                  ? cloudIncomeV2.customTypes
                  : Array.isArray(d.customIncomeTypes)
                  ? d.customIncomeTypes
                  : [],
                overrides:
                  cloudIncomeV2 &&
                  cloudIncomeV2.overrides &&
                  typeof cloudIncomeV2.overrides === "object"
                    ? cloudIncomeV2.overrides
                    : d.incomeTypeOverrides &&
                      typeof d.incomeTypeOverrides === "object"
                    ? d.incomeTypeOverrides
                    : {},
              };
              var localExpenseTs = Math.max(
                  readUserLocalUpdatedAt("expense_catalog_v2"),
                  readUserLocalUpdatedAt("cats")
                ),
                cloudExpenseTs = Math.max(
                  Number((cloudExpenseV2 && cloudExpenseV2.updatedAtMs) || 0),
                  Number(d.expenseCatalogUpdatedAt || 0),
                  Number(d.catsUpdatedAt || 0)
                );
              var localPaymentTs = Math.max(
                  readUserLocalUpdatedAt("payment_catalog_v2"),
                  readUserLocalUpdatedAt("methods")
                ),
                cloudPaymentTs = Math.max(
                  Number((cloudPaymentV2 && cloudPaymentV2.updatedAtMs) || 0),
                  Number(d.paymentCatalogUpdatedAt || 0),
                  Number(d.methodCatalogUpdatedAt || 0),
                  Number(d.methodsUpdatedAt || 0)
                );
              var localIncomeTs = Math.max(
                  readUserLocalUpdatedAt("income_catalog_v2"),
                  readUserLocalUpdatedAt("income_catalog_v1")
                ),
                cloudIncomeTs = Math.max(
                  Number((cloudIncomeV2 && cloudIncomeV2.updatedAtMs) || 0),
                  Number(d.incomeCatalogUpdatedAt || 0)
                );
              var legacyLocalCatalogTs = Math.max(
                localExpenseTs,
                localPaymentTs,
                localIncomeTs,
                readUserLocalUpdatedAt("category_preferences_v2")
              );
              if (!localCatalogMetaV3 && legacyLocalCatalogTs > 0) {
                localCatalogMetaV3 = {
                  schemaVersion: 3,
                  revision: 1,
                  updatedAtMs: legacyLocalCatalogTs,
                  writerId: catalogSyncWriterId(),
                };
                writeCatalogSyncMetaV3(localCatalogMetaV3);
                catalogSyncV3Source = preserveLatestLocalOnFirst
                  ? "local"
                  : compareCatalogSyncMetaV3(
                      localCatalogMetaV3,
                      cloudCatalogMetaV3
                    );
              }
              if (catalogSyncV3Source === "local" && localCatalogMetaV3) {
                var localAuthorityTs = Number(
                  localCatalogMetaV3.updatedAtMs || 0
                );
                localAuthorityTs = Math.max(
                  localAuthorityTs,
                  cloudExpenseTs + 1,
                  cloudPaymentTs + 1,
                  cloudIncomeTs + 1
                );
                localExpenseTs = Math.max(localExpenseTs, localAuthorityTs);
                localPaymentTs = Math.max(localPaymentTs, localAuthorityTs);
                localIncomeTs = Math.max(localIncomeTs, localAuthorityTs);
              } else if (
                catalogSyncV3Source === "cloud" &&
                cloudCatalogMetaV3
              ) {
                var cloudAuthorityTs = Number(
                  cloudCatalogMetaV3.updatedAtMs || 0
                );
                cloudAuthorityTs = Math.max(
                  cloudAuthorityTs,
                  localExpenseTs + 1,
                  localPaymentTs + 1,
                  localIncomeTs + 1
                );
                cloudExpenseTs = Math.max(cloudExpenseTs, cloudAuthorityTs);
                cloudPaymentTs = Math.max(cloudPaymentTs, cloudAuthorityTs);
                cloudIncomeTs = Math.max(cloudIncomeTs, cloudAuthorityTs);
                writeCatalogSyncMetaV3(cloudCatalogMetaV3);
              }
              var expenseChoice = chooseWholeCatalog(
                localExpenseCatalog,
                cloudExpenseCatalog,
                localExpenseTs,
                cloudExpenseTs,
                readOnlyTestBuild,
                expenseCatalogEvidence,
                cloudExpenseExists
              );
              var paymentChoice = chooseWholeCatalog(
                localPaymentCatalog,
                cloudPaymentCatalog,
                localPaymentTs,
                cloudPaymentTs,
                readOnlyTestBuild,
                paymentCatalogEvidence,
                cloudPaymentExists
              );
              var incomeChoice = chooseWholeCatalog(
                localIncomeCatalog,
                cloudIncomeCatalog,
                localIncomeTs,
                cloudIncomeTs,
                readOnlyTestBuild,
                incomeCatalogEvidence,
                cloudIncomeExists
              );
              var mergedCats = compactProtectedArray(
                expenseChoice.value.categories,
                DEFAULT_CATS,
                DEFAULT_EXPENSE_CATEGORY_NAMES
              );
              var mergedExpenseGroups =
                Array.isArray(expenseChoice.value.groups) &&
                expenseChoice.value.groups.length
                  ? expenseChoice.value.groups
                  : DEFAULT_EXPENSE_GROUPS;
              var mergedMethodsBase = compactProtectedArray(
                paymentChoice.value.methods,
                DEFAULT_METHODS,
                DEFAULT_METHOD_NAMES
              );
              var mergedMethods = ensureReferencedMethods(
                mergedMethodsBase,
                mergedExpenses,
                mergedRecurring
              );
              var mergedMethodGroups =
                Array.isArray(paymentChoice.value.groups) &&
                paymentChoice.value.groups.length
                  ? paymentChoice.value.groups
                  : DEFAULT_METHOD_GROUPS;
              var mergedIncomeGroups =
                Array.isArray(incomeChoice.value.groups) &&
                incomeChoice.value.groups.length
                  ? incomeChoice.value.groups
                  : DEFAULT_INCOME_GROUPS;
              var mergedCustomIncomeTypes = Array.isArray(
                incomeChoice.value.customTypes
              )
                ? incomeChoice.value.customTypes
                : [];
              var mergedIncomeOverrides =
                incomeChoice.value.overrides &&
                typeof incomeChoice.value.overrides === "object"
                  ? incomeChoice.value.overrides
                  : {};
              if (expenseChoice.source === "cloud" && cloudExpenseTs > 0)
                writeUserLocalUpdatedAt("expense_catalog_v2", cloudExpenseTs);
              if (paymentChoice.source === "cloud" && cloudPaymentTs > 0)
                writeUserLocalUpdatedAt("payment_catalog_v2", cloudPaymentTs);
              if (incomeChoice.source === "cloud" && cloudIncomeTs > 0)
                writeUserLocalUpdatedAt("income_catalog_v2", cloudIncomeTs);
              if (
                !readOnlyTestBuild &&
                isFirstSnapshot &&
                (expenseChoice.source === "local" || !cloudExpenseV2)
              ) {
                var ect = Math.max(localExpenseTs, cloudExpenseTs, Date.now());
                backfill.cats = mergedCats;
                backfill.expenseGroups = mergedExpenseGroups;
                backfill.catsUpdatedAt = ect;
                backfill.expenseCatalogUpdatedAt = ect;
                backfill.expenseCatalogV2 = {
                  categories: mergedCats,
                  groups: mergedExpenseGroups,
                  updatedAtMs: ect,
                };
                writeUserLocalUpdatedAt("cats", ect);
                writeUserLocalUpdatedAt("expense_catalog_v2", ect);
                needsBackfill = true;
              }
              if (
                !readOnlyTestBuild &&
                isFirstSnapshot &&
                (paymentChoice.source === "local" || !cloudPaymentV2)
              ) {
                var pct = Math.max(localPaymentTs, cloudPaymentTs, Date.now());
                backfill.methods = mergedMethods;
                backfill.methodGroups = mergedMethodGroups;
                backfill.methodsUpdatedAt = pct;
                backfill.methodCatalogUpdatedAt = pct;
                backfill.paymentCatalogUpdatedAt = pct;
                backfill.paymentCatalogV2 = {
                  methods: mergedMethods,
                  groups: mergedMethodGroups,
                  updatedAtMs: pct,
                };
                writeUserLocalUpdatedAt("methods", pct);
                writeUserLocalUpdatedAt("payment_catalog_v2", pct);
                needsBackfill = true;
              }
              if (
                !readOnlyTestBuild &&
                isFirstSnapshot &&
                (incomeChoice.source === "local" || !cloudIncomeV2)
              ) {
                var ict = Math.max(localIncomeTs, cloudIncomeTs, Date.now());
                backfill.incomeGroups = mergedIncomeGroups;
                backfill.customIncomeTypes = mergedCustomIncomeTypes;
                backfill.incomeTypeOverrides = mergedIncomeOverrides;
                backfill.incomeCatalogUpdatedAt = ict;
                backfill.incomeCatalogV2 = {
                  groups: mergedIncomeGroups,
                  customTypes: mergedCustomIncomeTypes,
                  overrides: mergedIncomeOverrides,
                  updatedAtMs: ict,
                };
                writeUserLocalUpdatedAt("income_catalog_v2", ict);
                needsBackfill = true;
              }
              setAccountDeletedRecordsRaw(mergedAccountDeleted);
              setExpenses(mergedExpenses);
              setIncomes(mergedIncomes);
              setRecurring(mergedRecurring);
              setGoals(mergedGoals);
              setAlerts(mergedAlerts);
              setCats(mergedCats);
              setMethods(mergedMethods);
              setBudgetPlan(
                preserveLatestLocalOnFirst
                  ? readUserLocalJson("budget_plan_v1", localSnap.budgetPlan)
                  : d.budgetPlan !== undefined
                  ? d.budgetPlan
                  : localSnap.budgetPlan
              );
              setExpenseGroups(mergedExpenseGroups);
              setIncomeGroups(mergedIncomeGroups);
              setMethodGroups(mergedMethodGroups);
              setCustomIncomeTypes(mergedCustomIncomeTypes);
              setIncomeTypeOverrides(mergedIncomeOverrides);

              var localCategory: any = {
                ...localSnap.categoryPreferencesV2,
                catOrder: readUserLocalJson(
                  "cat_order_v1",
                  localSnap.categoryPreferencesV2.catOrder
                ),
                methodOrder: readUserLocalJson(
                  "method_order_v1",
                  localSnap.categoryPreferencesV2.methodOrder
                ),
                catSortMode: readUserLocalJson(
                  "cat_sort_mode",
                  localSnap.categoryPreferencesV2.catSortMode
                ),
                methodSortMode: readUserLocalJson(
                  "method_sort_mode",
                  localSnap.categoryPreferencesV2.methodSortMode
                ),
                defaultExpenseCat: readUserLocalJson(
                  "default_expense_cat_v1",
                  localSnap.categoryPreferencesV2.defaultExpenseCat
                ),
                defaultExpenseMethod: readUserLocalJson(
                  "default_expense_method_v1",
                  localSnap.categoryPreferencesV2.defaultExpenseMethod
                ),
                defaultIncomeType: readUserLocalJson(
                  "default_income_type_v1",
                  localSnap.categoryPreferencesV2.defaultIncomeType
                ),
                defaultExpenseArea: readUserLocalJson(
                  "default_expense_area_v1",
                  localSnap.categoryPreferencesV2.defaultExpenseArea
                ),
                defaultIncomeArea: readUserLocalJson(
                  "default_income_area_v1",
                  localSnap.categoryPreferencesV2.defaultIncomeArea
                ),
                defaultMethodArea: readUserLocalJson(
                  "default_method_area_v1",
                  localSnap.categoryPreferencesV2.defaultMethodArea
                ),
                incomeTypeOrder: readUserLocalJson(
                  "income_type_order_v1",
                  localSnap.categoryPreferencesV2.incomeTypeOrder
                ),
              };
              var legacyCategory: any = {
                catOrder: d.catOrder,
                methodOrder: d.methodOrder,
                catSortMode: d.catSortMode,
                methodSortMode: d.methodSortMode,
                defaultExpenseCat: d.defaultExpenseCat,
                defaultExpenseMethod: d.defaultExpenseMethod,
                defaultIncomeType: d.defaultIncomeType,
                defaultExpenseArea: d.defaultExpenseArea,
                defaultIncomeArea: d.defaultIncomeArea,
                defaultMethodArea: d.defaultMethodArea,
                incomeTypeOrder: d.incomeTypeOrder,
              };
              Object.keys(legacyCategory).forEach(function (k) {
                if (legacyCategory[k] === undefined) delete legacyCategory[k];
              });
              var cloudCategory: any =
                cloudCatalogSyncV3 &&
                cloudCatalogSyncV3.categoryPreferences &&
                typeof cloudCatalogSyncV3.categoryPreferences === "object"
                  ? cloudCatalogSyncV3.categoryPreferences
                  : d.categoryPreferencesV2 &&
                    typeof d.categoryPreferencesV2 === "object"
                  ? d.categoryPreferencesV2
                  : null;
              var cloudCategoryCombined: any = {
                ...legacyCategory,
                ...(cloudCategory || {}),
              };
              var localCategoryTs = readUserLocalUpdatedAt(
                  "category_preferences_v2"
                ),
                cloudCategoryTs = Math.max(
                  Number(d.categoryPreferencesUpdatedAt || 0),
                  Number((cloudCatalogMetaV3 && cloudCatalogMetaV3.updatedAtMs) || 0)
                );
              if (catalogSyncV3Source === "local" && localCatalogMetaV3)
                localCategoryTs = Math.max(
                  localCategoryTs,
                  Number(localCatalogMetaV3.updatedAtMs || 0),
                  cloudCatalogSyncV3 ? 0 : cloudCategoryTs + 1
                );
              var preferLocalCategory =
                catalogSyncV3Source === "local" ||
                (catalogSyncV3Source === "legacy" &&
                  localCategoryTs > cloudCategoryTs);
              var categoryDefaults: any = {
                catOrder: [],
                methodOrder: [],
                catSortMode: "group",
                methodSortMode: "group",
                defaultExpenseCat: "4",
                defaultExpenseMethod: "8",
                defaultIncomeType: "salario",
                defaultExpenseArea: "vita",
                defaultIncomeArea: "lavoro",
                defaultMethodArea: "conti_carte",
                incomeTypeOrder: [],
              };
              var mergedCategory: any = {};
              Object.keys(categoryDefaults).forEach(function (k) {
                mergedCategory[k] = chooseMigratedPreference(
                  localCategory[k],
                  cloudCategoryCombined[k],
                  categoryDefaults[k],
                  Object.prototype.hasOwnProperty.call(
                    cloudCategoryCombined,
                    k
                  ),
                  preferLocalCategory
                );
              });
              mergedCategory.catOrder = Array.isArray(mergedCategory.catOrder)
                ? mergedCategory.catOrder.map(String)
                : [];
              mergedCategory.methodOrder = Array.isArray(
                mergedCategory.methodOrder
              )
                ? mergedCategory.methodOrder.map(String)
                : [];
              mergedCategory.incomeTypeOrder = Array.isArray(
                mergedCategory.incomeTypeOrder
              )
                ? mergedCategory.incomeTypeOrder.map(String)
                : [];
              setCatOrder(mergedCategory.catOrder);
              setMethodOrder(mergedCategory.methodOrder);
              setCatSortMode(String(mergedCategory.catSortMode || "group"));
              setMethodSortMode(
                String(mergedCategory.methodSortMode || "group")
              );
              setDefaultExpenseCat(
                String(mergedCategory.defaultExpenseCat || "")
              );
              setDefaultExpenseMethod(
                String(mergedCategory.defaultExpenseMethod || "")
              );
              setDefaultIncomeType(
                String(mergedCategory.defaultIncomeType || "")
              );
              setDefaultExpenseArea(
                String(mergedCategory.defaultExpenseArea || "vita")
              );
              setDefaultIncomeArea(
                String(mergedCategory.defaultIncomeArea || "lavoro")
              );
              setDefaultMethodArea(
                String(mergedCategory.defaultMethodArea || "conti_carte")
              );
              setIncomeTypeOrder(mergedCategory.incomeTypeOrder);
              if (
                !cloudCategory ||
                preferLocalCategory ||
                !syncJsonEqual(mergedCategory, cloudCategoryCombined)
              ) {
                var ct = localCategoryTs || cloudCategoryTs || Date.now();
                writeUserLocalUpdatedAt("category_preferences_v2", ct);
                backfill.categoryPreferencesV2 = mergedCategory;
                backfill.categoryPreferencesUpdatedAt = ct;
                Object.assign(backfill, mergedCategory);
                needsBackfill = true;
              }
              if (!cloudCatalogSyncV3) needsBackfill = true;

              setPatrimonioValues(
                preserveLatestLocalOnFirst
                  ? {
                      ...ensureObjectValue(d.patrimonioValues, {}),
                      ...ensureObjectValue(latestLocalPatrimonioValues, {}),
                    }
                  : chooseCloudLocalObject(
                      d.patrimonioValues,
                      localSnap.patrimonioValues,
                      {}
                    )
              );
              setPatrimonioAreas(
                preserveLatestLocalOnFirst
                  ? mergeArrayPreferLocalByStableId(
                      Array.isArray(d.patrimonioAreas) ? d.patrimonioAreas : [],
                      latestLocalPatrimonioAreas
                    )
                  : chooseCloudLocalArray(
                      d.patrimonioAreas,
                      localSnap.patrimonioAreas,
                      DEFAULT_PATRIMONIO_AREAS,
                      false
                    )
              );
              setPatrimonioEntries(
                preserveLatestLocalOnFirst
                  ? mergeArrayPreferLocalByStableId(
                      Array.isArray(d.patrimonioEntries)
                        ? d.patrimonioEntries
                        : [],
                      latestLocalPatrimonioEntries
                    )
                  : chooseCloudLocalArray(
                      d.patrimonioEntries,
                      localSnap.patrimonioEntries,
                      DEFAULT_PATRIMONIO_ENTRIES,
                      false
                    )
              );
              setPatrimonioHistory(
                preserveLatestLocalOnFirst
                  ? {
                      ...ensureObjectValue(d.patrimonioHistory, {}),
                      ...ensureObjectValue(latestLocalPatrimonioHistory, {}),
                    }
                  : chooseCloudLocalObject(
                      d.patrimonioHistory,
                      localSnap.patrimonioHistory,
                      {}
                    )
              );
              setPatrimonioNotes(
                preserveLatestLocalOnFirst
                  ? {
                      ...ensureObjectValue(d.patrimonioNotes, {}),
                      ...ensureObjectValue(latestLocalPatrimonioNotes, {}),
                    }
                  : chooseCloudLocalObject(
                      d.patrimonioNotes,
                      localSnap.patrimonioNotes,
                      {}
                    )
              );
              var localPat: any = {
                patrimonioMode: readUserLocalJson(
                  "patrimonio_mode_v1",
                  localSnap.patrimonyPreferencesV2.patrimonioMode
                ),
              };
              var cloudPat: any =
                d.patrimonyPreferencesV2 &&
                typeof d.patrimonyPreferencesV2 === "object"
                  ? d.patrimonyPreferencesV2
                  : d.patrimonioMode !== undefined
                  ? { patrimonioMode: d.patrimonioMode }
                  : null;
              var localPatTs = readUserLocalUpdatedAt(
                  "patrimony_preferences_v2"
                ),
                cloudPatTs = Number(d.patrimonyPreferencesUpdatedAt || 0);
              var preferLocalPat = localPatTs > cloudPatTs;
              var mergedPat = {
                patrimonioMode: chooseMigratedPreference(
                  localPat.patrimonioMode,
                  cloudPat && cloudPat.patrimonioMode,
                  "manuale",
                  !!(cloudPat && cloudPat.patrimonioMode !== undefined),
                  preferLocalPat
                ),
              };
              setPatrimonioMode(String(mergedPat.patrimonioMode || "manuale"));
              if (
                !d.patrimonyPreferencesV2 ||
                preferLocalPat ||
                !syncJsonEqual(mergedPat, cloudPat || {})
              ) {
                var pt = localPatTs || cloudPatTs || Date.now();
                writeUserLocalUpdatedAt("patrimony_preferences_v2", pt);
                backfill.patrimonyPreferencesV2 = mergedPat;
                backfill.patrimonyPreferencesUpdatedAt = pt;
                backfill.patrimonioMode = mergedPat.patrimonioMode;
                needsBackfill = true;
              }

              var localDisplay: any = {
                ...localSnap.displayPreferencesV2,
                currency: readUserLocalJson(
                  "pref_cur",
                  localSnap.displayPreferencesV2.currency
                ),
                secondaryCurrency: readUserLocalJson(
                  "pref_sec_cur",
                  localSnap.displayPreferencesV2.secondaryCurrency
                ),
                showSecInHistory: readUserLocalJson(
                  "pref_sec_history",
                  localSnap.displayPreferencesV2.showSecInHistory
                ),
                showSecInStats: readUserLocalJson(
                  "pref_sec_stats",
                  localSnap.displayPreferencesV2.showSecInStats
                ),
                showSecInBudget: readUserLocalJson(
                  "pref_sec_budget",
                  localSnap.displayPreferencesV2.showSecInBudget
                ),
                showSecInPatrimonio: readUserLocalJson(
                  "pref_sec_patrimonio",
                  localSnap.displayPreferencesV2.showSecInPatrimonio
                ),
                dateFmt: readUserLocalJson(
                  "pref_datefmt",
                  localSnap.displayPreferencesV2.dateFmt
                ),
                firstDayOfWeek: readUserLocalJson(
                  "pref_first_day_week",
                  localSnap.displayPreferencesV2.firstDayOfWeek
                ),
                statsView: readUserLocalJson(
                  "pref_statsview",
                  localSnap.displayPreferencesV2.statsView
                ),
                btnStyle: readUserLocalJson(
                  "pref_btn_style",
                  localSnap.displayPreferencesV2.btnStyle
                ),
                expenseColor: readUserLocalJson(
                  "pref_exp_color",
                  localSnap.displayPreferencesV2.expenseColor
                ),
                incomeColor: readUserLocalJson(
                  "pref_inc_color",
                  localSnap.displayPreferencesV2.incomeColor
                ),
                confirmButtonColor: readUserLocalJson(
                  "pref_confirm_color",
                  localSnap.displayPreferencesV2.confirmButtonColor
                ),
                secondaryButtonColor: readUserLocalJson(
                  "pref_secondary_button_color_v1",
                  localSnap.displayPreferencesV2.secondaryButtonColor
                ),
              };
              var legacyDisplay: any = {
                firstDayOfWeek: d.firstDayOfWeek,
                confirmButtonColor: d.confirmButtonColor,
                secondaryButtonColor: d.secondaryButtonColor,
                currency: d.currency,
                secondaryCurrency: d.secondaryCurrency,
                showSecInHistory: d.showSecInHistory,
                showSecInStats: d.showSecInStats,
                showSecInBudget: d.showSecInBudget,
                showSecInPatrimonio: d.showSecInPatrimonio,
                dateFmt: d.dateFmt,
                statsView: d.statsView,
                btnStyle: d.btnStyle,
                expenseColor: d.expenseColor,
                incomeColor: d.incomeColor,
              };
              Object.keys(legacyDisplay).forEach(function (k) {
                if (legacyDisplay[k] === undefined) delete legacyDisplay[k];
              });
              var cloudDisplay: any =
                d.displayPreferencesV2 &&
                typeof d.displayPreferencesV2 === "object"
                  ? d.displayPreferencesV2
                  : null;
              var cloudDisplayCombined: any = {
                ...legacyDisplay,
                ...(cloudDisplay || {}),
              };
              var localDisplayTs = readUserLocalUpdatedAt(
                  "display_preferences_v2"
                ),
                cloudDisplayTs = Number(d.displayPreferencesUpdatedAt || 0);
              var preferLocalDisplay = localDisplayTs > cloudDisplayTs;
              var displayDefaults: any = {
                currency: getDefaultCurrency(),
                secondaryCurrency: "",
                showSecInHistory: true,
                showSecInStats: true,
                showSecInBudget: false,
                showSecInPatrimonio: false,
                dateFmt: getDefaultDateFormat(),
                firstDayOfWeek: "mon",
                statsView: "rateizzato",
                btnStyle: "soft",
                expenseColor: "#E24B4A",
                incomeColor: "#1D9E75",
                confirmButtonColor: "#378ADD",
                secondaryButtonColor: "#5FAFE5",
              };
              var mergedDisplay: any = {};
              Object.keys(displayDefaults).forEach(function (k) {
                mergedDisplay[k] = chooseMigratedPreference(
                  localDisplay[k],
                  cloudDisplayCombined[k],
                  displayDefaults[k],
                  Object.prototype.hasOwnProperty.call(cloudDisplayCombined, k),
                  preferLocalDisplay
                );
              });
              setCurrency(
                String(mergedDisplay.currency || getDefaultCurrency())
              );
              setSecondaryCurrency(
                String(mergedDisplay.secondaryCurrency || "")
              );
              setShowSecInHistory(mergedDisplay.showSecInHistory !== false);
              setShowSecInStats(mergedDisplay.showSecInStats !== false);
              setShowSecInBudget(!!mergedDisplay.showSecInBudget);
              setShowSecInPatrimonio(!!mergedDisplay.showSecInPatrimonio);
              setDateFmt(
                String(mergedDisplay.dateFmt || getDefaultDateFormat())
              );
              setFirstDayOfWeek(String(mergedDisplay.firstDayOfWeek || "mon"));
              setStatsView(String(mergedDisplay.statsView || "rateizzato"));
              setBtnStyle(String(mergedDisplay.btnStyle || "soft"));
              setExpenseColor(String(mergedDisplay.expenseColor || "#E24B4A"));
              setIncomeColor(String(mergedDisplay.incomeColor || "#1D9E75"));
              setConfirmButtonColor(
                String(mergedDisplay.confirmButtonColor || "#378ADD")
              );
              setSecondaryButtonColor(
                String(mergedDisplay.secondaryButtonColor || "#5FAFE5")
              );
              if (
                !cloudDisplay ||
                preferLocalDisplay ||
                !syncJsonEqual(mergedDisplay, cloudDisplayCombined)
              ) {
                var dt = localDisplayTs || cloudDisplayTs || Date.now();
                writeUserLocalUpdatedAt("display_preferences_v2", dt);
                backfill.displayPreferencesV2 = mergedDisplay;
                backfill.displayPreferencesUpdatedAt = dt;
                Object.assign(backfill, mergedDisplay);
                needsBackfill = true;
              }

              var latestLocalHome: any = {
                homeBalanceView: readUserLocalJson(
                  "pref_home_balance",
                  localSnap.homePreferencesV2.homeBalanceView
                ),
                homeWorklets: readUserLocalJson(
                  "home_worklets_v1",
                  localSnap.homePreferencesV2.homeWorklets
                ),
                showAppSummaryHeader: readUserLocalJson(
                  "pref_show_app_summary_header_v1",
                  localSnap.homePreferencesV2.showAppSummaryHeader
                ),
                mobileNavOrder: readUserLocalJson(
                  "pref_mobile_nav_order_v1",
                  localSnap.homePreferencesV2.mobileNavOrder
                ),
                mobileNavIconCount: readUserLocalJson(
                  "pref_mobile_nav_icon_count_v1",
                  localSnap.homePreferencesV2.mobileNavIconCount
                ),
                mobileMenuOrder: readUserLocalJson(
                  "pref_mobile_menu_order_v1",
                  localSnap.homePreferencesV2.mobileMenuOrder
                ),
                mobileAllNavOrder: readUserLocalJson(
                  "pref_mobile_all_nav_order_v1",
                  localSnap.homePreferencesV2.mobileAllNavOrder
                ),
              };
              var cloudHome: any = {
                homeBalanceView: d.homeBalanceView,
                homeWorklets: d.homeWorklets,
                showAppSummaryHeader: d.showAppSummaryHeader,
                mobileNavOrder: d.mobileNavOrder,
                mobileNavIconCount: d.mobileNavIconCount,
                mobileMenuOrder: d.mobileMenuOrder,
                mobileAllNavOrder: d.mobileAllNavOrder,
              };
              var localHomeTs = readUserLocalUpdatedAt("home_preferences"),
                cloudHomeTs = Number(d.homePreferencesUpdatedAt || 0);
              var cloudHomeComplete =
                Array.isArray(cloudHome.homeWorklets) &&
                Array.isArray(cloudHome.mobileNavOrder) &&
                Array.isArray(cloudHome.mobileMenuOrder) &&
                Array.isArray(cloudHome.mobileAllNavOrder) &&
                cloudHome.homeBalanceView !== undefined &&
                cloudHome.showAppSummaryHeader !== undefined &&
                cloudHome.mobileNavIconCount !== undefined;
              var preferLocalHome =
                localHomeTs > cloudHomeTs ||
                (isCustomHomeSyncValue(latestLocalHome) &&
                  (!cloudHomeComplete || !isCustomHomeSyncValue(cloudHome)));
              var mergedHome: any =
                preferLocalHome || !cloudHomeComplete
                  ? latestLocalHome
                  : cloudHome;
              mergedHome.homeBalanceView =
                mergedHome.homeBalanceView === "reale" ? "reale" : "rateizzato";
              mergedHome.homeWorklets = normalizeHomeWorkletsValue(
                mergedHome.homeWorklets,
                DEFAULT_HOME_WORKLETS
              );
              mergedHome.showAppSummaryHeader =
                mergedHome.showAppSummaryHeader !== false;
              mergedHome.mobileNavOrder = normalizeStringOrderValue(
                mergedHome.mobileNavOrder,
                DEFAULT_MOBILE_NAV_ORDER
              );
              mergedHome.mobileNavIconCount = Math.max(
                3,
                Math.min(7, Number(mergedHome.mobileNavIconCount || 5))
              );
              mergedHome.mobileMenuOrder = normalizeStringOrderValue(
                mergedHome.mobileMenuOrder,
                DEFAULT_MOBILE_MENU_ORDER
              );
              mergedHome.mobileAllNavOrder = normalizeStringOrderValue(
                mergedHome.mobileAllNavOrder,
                DEFAULT_MOBILE_ALL_NAV_ORDER
              );
              setHomeBalanceViewRaw(mergedHome.homeBalanceView);
              setHomeWorkletsRaw(mergedHome.homeWorklets);
              setShowAppSummaryHeaderRaw(mergedHome.showAppSummaryHeader);
              setMobileNavOrderRaw(mergedHome.mobileNavOrder);
              setMobileNavIconCountRaw(mergedHome.mobileNavIconCount);
              setMobileMenuOrderRaw(mergedHome.mobileMenuOrder);
              setMobileAllNavOrderRaw(mergedHome.mobileAllNavOrder);
              if (preferLocalHome || !cloudHomeComplete) {
                var ht = localHomeTs || cloudHomeTs || Date.now();
                writeUserLocalUpdatedAt("home_preferences", ht);
                Object.assign(backfill, mergedHome, {
                  homePreferencesUpdatedAt: ht,
                });
                needsBackfill = true;
              }

              if (d.historyFutureMode)
                setHistoryFutureMode(d.historyFutureMode);
              if (d.historySortDate) setHistorySortDate(d.historySortDate);
              if (d.historySortDirection)
                setHistorySortDirection(d.historySortDirection);
              if (d.historySortSecondary)
                setHistorySortSecondary(d.historySortSecondary);
              if (d.historySortSecondaryDirection)
                setHistorySortSecondaryDirection(
                  d.historySortSecondaryDirection
                );
              var documentKey = function (item) {
                return accountSyncRecordKey("document", item);
              };
              var noteKey = function (item) {
                return accountSyncRecordKey("note", item);
              };
              var cloudDocuments = Array.isArray(d.appuntiDocuments)
                ? d.appuntiDocuments
                : [];
              var cloudNotes = Array.isArray(d.appuntiNotes)
                ? d.appuntiNotes
                : [];
              var mergedDocuments = mergeSyncRecords(
                latestLocalAppuntiDocuments,
                cloudDocuments,
                mergedAccountDeleted,
                documentKey,
                true
              );
              var mergedNotes = mergeSyncRecords(
                latestLocalAppuntiNotes,
                cloudNotes,
                mergedAccountDeleted,
                noteKey,
                true
              );
              setAppuntiDocuments(mergedDocuments);
              setAppuntiNotes(mergedNotes);
              if (isFirstSnapshot) {
                if (!syncJsonEqual(cloudDocuments, mergedDocuments)) {
                  backfill.appuntiDocuments = mergedDocuments;
                  needsBackfill = true;
                }
                if (!syncJsonEqual(cloudNotes, mergedNotes)) {
                  backfill.appuntiNotes = mergedNotes;
                  needsBackfill = true;
                }
              }
              try {
                var rawBank = d.bankCoords;
                var cloudBank: any;
                if (typeof rawBank === "string" && rawBank)
                  cloudBank = await fainanceDecryptSensitiveData(
                    rawBank,
                    userId
                  );
                else
                  cloudBank = Array.isArray(rawBank)
                    ? rawBank
                    : localSnap.bankCoords;
                var mergedBank = preserveLatestLocalOnFirst
                  ? mergeArrayPreferLocalByStableId(
                      cloudBank,
                      latestLocalBankCoords
                    )
                  : cloudBank;
                setBankCoords(
                  Array.isArray(mergedBank) ? mergedBank : latestLocalBankCoords
                );
                if (Array.isArray(rawBank)) {
                  backfill.bankCoords = await fainanceEncryptSensitiveData(
                    mergedBank,
                    userId
                  );
                  needsBackfill = true;
                }
              } catch (e) {
                console.error(
                  "Bank coordinates decrypt/sync error",
                  (e && e.message) || e
                );
                setBankCoords(latestLocalBankCoords);
              }
              try {
                var rawCredit = d.creditCards;
                var cloudCredit: any;
                if (typeof rawCredit === "string" && rawCredit)
                  cloudCredit = await fainanceDecryptSensitiveData(
                    rawCredit,
                    userId
                  );
                else
                  cloudCredit = Array.isArray(rawCredit)
                    ? rawCredit
                    : localSnap.creditCards;
                var mergedCredit = preserveLatestLocalOnFirst
                  ? mergeArrayPreferLocalByStableId(
                      cloudCredit,
                      latestLocalCreditCards
                    )
                  : cloudCredit;
                setCreditCards(
                  Array.isArray(mergedCredit)
                    ? mergedCredit
                    : latestLocalCreditCards
                );
                if (Array.isArray(rawCredit)) {
                  backfill.creditCards = await fainanceEncryptSensitiveData(
                    mergedCredit,
                    userId
                  );
                  needsBackfill = true;
                }
              } catch (e) {
                console.error(
                  "Credit cards decrypt/sync error",
                  (e && e.message) || e
                );
                setCreditCards(latestLocalCreditCards);
              }
              setAiDismissed(Array.isArray(d.aiDismissed) ? d.aiDismissed : []);
              setAiChat(Array.isArray(d.aiChat) ? d.aiChat : []);
              if (d.aiDataAccess) setAiDataAccess(d.aiDataAccess);
              if (d.aiFloatingEnabled !== undefined)
                setAiFloatingEnabled(!!d.aiFloatingEnabled);
              if (d.notifPrefs) setNotifPrefs(d.notifPrefs);
              var notificationKey = function (item) {
                return accountSyncRecordKey("notification", item);
              };
              var cloudCustomNotifs = Array.isArray(d.customNotifs)
                ? d.customNotifs
                : [];
              var mergedCustomNotifs = mergeSyncRecords(
                latestLocalCustomNotifs,
                cloudCustomNotifs,
                mergedAccountDeleted,
                notificationKey,
                true
              );
              setCustomNotifs(mergedCustomNotifs);
              if (
                isFirstSnapshot &&
                !syncJsonEqual(cloudCustomNotifs, mergedCustomNotifs)
              ) {
                backfill.customNotifs = mergedCustomNotifs;
                needsBackfill = true;
              }
              var cloudLegal: any =
                d.legalAcceptanceV2 && typeof d.legalAcceptanceV2 === "object"
                  ? d.legalAcceptanceV2
                  : null;
              var localLegalNow: any = readLegalAcceptanceV2Local();
              var cloudLegalAccepted =
                !!(
                  cloudLegal &&
                  cloudLegal.accepted &&
                  cloudLegal.terms &&
                  cloudLegal.privacy
                ) || !!(d.termsAccepted && d.privacyAccepted);
              var localLegalAcceptedNow =
                readLegalAcceptanceCommittedLocal() ||
                !!(
                  localLegalNow &&
                  localLegalNow.accepted &&
                  localLegalNow.terms &&
                  localLegalNow.privacy
                );
              var mergedLegalAccepted =
                cloudLegalAccepted || localLegalAcceptedNow;
              var mergedLegalMeta = preserveLatestLocalOnFirst
                ? localLegalNow && localLegalNow.metaEventsConsent !== undefined
                  ? !!localLegalNow.metaEventsConsent
                  : !!localSnap.metaEventsConsent
                : cloudLegal && cloudLegal.metaEventsConsent !== undefined
                ? !!cloudLegal.metaEventsConsent
                : d.metaEventsConsent !== undefined
                ? !!d.metaEventsConsent
                : localLegalNow && localLegalNow.metaEventsConsent !== undefined
                ? !!localLegalNow.metaEventsConsent
                : !!localSnap.metaEventsConsent;
              var mergedLegalDate = String(
                (cloudLegal && cloudLegal.acceptedAt) ||
                  d.legalAcceptanceDate ||
                  (localLegalNow && localLegalNow.acceptedAt) ||
                  localSnap.legalAcceptanceDate ||
                  ""
              );
              if (mergedLegalAccepted) {
                if (!mergedLegalDate)
                  mergedLegalDate = new Date().toISOString();
                writeLegalAcceptanceLocal(mergedLegalDate, mergedLegalMeta);
                setLegalAcceptanceCommitted(true);
                setTermsAccepted(true);
                setPrivacyAccepted(true);
                setMetaEventsConsent(mergedLegalMeta);
                setLegalAcceptanceDate(mergedLegalDate);
                var mergedLegalPayload = {
                  accepted: true,
                  terms: true,
                  privacy: true,
                  metaEventsConsent: mergedLegalMeta,
                  acceptedAt: mergedLegalDate,
                  version: LEGAL_ACCEPTANCE_VERSION,
                };
                if (
                  isFirstSnapshot &&
                  (!cloudLegal ||
                    !cloudLegalAccepted ||
                    !syncJsonEqual(cloudLegal, mergedLegalPayload))
                ) {
                  var legalTs = Math.max(
                    Number(d.legalAcceptanceUpdatedAt || 0),
                    readUserLocalUpdatedAt("legal_acceptance_v2"),
                    Date.now()
                  );
                  writeUserLocalUpdatedAt("legal_acceptance_v2", legalTs);
                  backfill.legalAcceptanceV2 = mergedLegalPayload;
                  backfill.legalAcceptanceUpdatedAt = legalTs;
                  backfill.termsAccepted = true;
                  backfill.privacyAccepted = true;
                  backfill.metaEventsConsent = mergedLegalMeta;
                  backfill.legalAcceptanceDate = mergedLegalDate;
                  needsBackfill = true;
                }
              } else {
                setLegalAcceptanceCommitted(false);
                if (d.termsAccepted !== undefined)
                  setTermsAccepted(!!d.termsAccepted);
                if (d.privacyAccepted !== undefined)
                  setPrivacyAccepted(!!d.privacyAccepted);
                if (d.metaEventsConsent !== undefined)
                  setMetaEventsConsent(!!d.metaEventsConsent);
                if (d.legalAcceptanceDate)
                  setLegalAcceptanceDate(d.legalAcceptanceDate);
              }
              if (
                d.onboardingGuideSeen !== undefined &&
                !onboardingGuideLocalSeenRef.current &&
                !onboardingFlowCompleteRef.current
              )
                setOnboardingGuideSeen(!!d.onboardingGuideSeen);
              if (
                d.initialSetupStatus !== undefined &&
                !onboardingGuideLocalSeenRef.current &&
                !onboardingFlowCompleteRef.current
              )
                setInitialSetupStatus(String(d.initialSetupStatus || ""));
              var cloudShareProjects = Array.isArray(d.shareProjects)
                ? d.shareProjects
                : [];
              var mergedShareProjects = filterShareProjectsByTombstones(
                mergeShareProjectArrays(
                  cloudShareProjects,
                  latestLocalShareProjects
                ),
                mergedAccountDeleted
              );
              setShareProjects(mergedShareProjects);
              if (
                isFirstSnapshot &&
                !syncJsonEqual(cloudShareProjects, mergedShareProjects)
              ) {
                backfill.shareProjects = mergedShareProjects;
                needsBackfill = true;
              }
              var debtKey = function (item) {
                return accountSyncRecordKey("debt", item);
              };
              var cloudDebtCredits = Array.isArray(d.debtCredits)
                ? d.debtCredits
                : [];
              var mergedDebtCredits = mergeSyncRecords(
                latestLocalDebtCredits,
                cloudDebtCredits,
                mergedAccountDeleted,
                debtKey,
                true
              );
              setDebtCredits(mergedDebtCredits);
              if (
                isFirstSnapshot &&
                !syncJsonEqual(cloudDebtCredits, mergedDebtCredits)
              ) {
                backfill.debtCredits = mergedDebtCredits;
                needsBackfill = true;
              }
              setShareReceiptUploads(
                preserveLatestLocalOnFirst
                  ? mergeArrayPreferLocalByStableId(
                      Array.isArray(d.shareReceiptUploads)
                        ? d.shareReceiptUploads
                        : [],
                      latestLocalShareReceiptUploads
                    )
                  : chooseCloudLocalArray(
                      d.shareReceiptUploads,
                      localSnap.shareReceiptUploads,
                      [],
                      true
                    )
              );
              if (d.showShareInHistory !== undefined)
                setShowShareInHistory(!!d.showShareInHistory);
              if (d.showDebtCreditsInPatrimonio !== undefined)
                setShowDebtCreditsInPatrimonio(!!d.showDebtCreditsInPatrimonio);
              if (d.showDebtCreditsInExpenses !== undefined)
                setShowDebtCreditsInExpenses(!!d.showDebtCreditsInExpenses);

              var recoveryState = shoppingRecoveryState();
              var recoverySnapshot = readShoppingRecoverySnapshot();
              var localItems = normalizeShoppingItemsData(
                mergeShoppingRecoveryArrays(
                  [
                    readUserLocalJson(
                      "shopping_items_v1",
                      localSnap.shoppingItems
                    ),
                    recoveryState.items,
                    recoverySnapshot.items,
                  ],
                  shoppingSyncRecordKey
                )
              );
              var cloudItems = normalizeShoppingItemsData(
                Array.isArray(d.shoppingItems) ? d.shoppingItems : []
              );
              var localLists = mergeShoppingRecoveryArrays(
                [
                  readUserLocalJson(
                    "shopping_lists_v2",
                    localSnap.shoppingLists
                  ),
                  recoveryState.lists,
                  recoverySnapshot.lists,
                ],
                shoppingListSyncKey
              );
              var cloudLists = Array.isArray(d.shoppingLists)
                ? d.shoppingLists
                : [];
              var localCards = mergeShoppingRecoveryArrays(
                [
                  readUserLocalJson(
                    "shopping_cards_v1",
                    localSnap.shoppingCards
                  ),
                  recoveryState.cards,
                  recoverySnapshot.cards,
                ],
                shoppingCardSyncKey
              );
              var cloudCards = Array.isArray(d.shoppingCards)
                ? d.shoppingCards
                : [];
              preserveShoppingRecoverySnapshot(
                localItems,
                localLists,
                localCards
              );
              preserveShoppingRecoverySnapshot(
                cloudItems,
                cloudLists,
                cloudCards
              );
              var localDeleted = readUserLocalJson(
                "shopping_deleted_records_v2",
                localSnap.shoppingDeletedRecords
              );
              var cloudDeleted =
                d.shoppingDeletedRecords &&
                typeof d.shoppingDeletedRecords === "object"
                  ? d.shoppingDeletedRecords
                  : {};
              var localItemsTs = shoppingItemsLocalUpdatedAt(),
                cloudItemsTs = Number(d.shoppingItemsUpdatedAt || 0);
              shoppingItemsCloudUpdatedAtRef.current = cloudItemsTs;
              var localListsTs = readUserLocalUpdatedAt("shopping_lists"),
                cloudListsTs = Number(d.shoppingListsUpdatedAt || 0),
                localCardsTs = readUserLocalUpdatedAt("shopping_cards"),
                cloudCardsTs = Number(d.shoppingCardsUpdatedAt || 0);
              var mergedDeleted = mergeSyncTombstones(
                localDeleted,
                cloudDeleted
              );
              var emergencyRecovery =
                cloudItems.length === 0 &&
                cloudCards.length === 0 &&
                cloudLists.filter(function (x) {
                  return String(x && x.id) !== "main";
                }).length === 0 &&
                (localItems.length > 0 ||
                  localCards.length > 0 ||
                  localLists.filter(function (x) {
                    return String(x && x.id) !== "main";
                  }).length > 0);
              if (emergencyRecovery)
                mergedDeleted = removeTombstonesForShoppingRecords(
                  mergedDeleted,
                  localItems,
                  localLists,
                  localCards
                );
              var mergedItems = normalizeShoppingItemsData(
                mergeSyncRecords(
                  localItems,
                  cloudItems,
                  mergedDeleted,
                  shoppingSyncRecordKey,
                  emergencyRecovery || localItemsTs >= cloudItemsTs
                )
              );
              var mergedLists = mergeSyncRecords(
                localLists,
                cloudLists,
                mergedDeleted,
                shoppingListSyncKey,
                emergencyRecovery || localListsTs >= cloudListsTs
              );
              if (!mergedLists.length)
                mergedLists = [
                  {
                    id: "main",
                    title: "Lista principale",
                    icon: "🧺",
                    createdAt: new Date().toISOString(),
                    syncUpdatedAtMs: Date.now(),
                  },
                ];
              var mergedCards = mergeSyncRecords(
                localCards,
                cloudCards,
                mergedDeleted,
                shoppingCardSyncKey,
                emergencyRecovery || localCardsTs >= cloudCardsTs
              );
              preserveShoppingRecoverySnapshot(
                mergedItems,
                mergedLists,
                mergedCards
              );
              setShoppingDeletedRecordsRaw(mergedDeleted);
              setShoppingItems(mergedItems);
              setShoppingLists(mergedLists);
              setShoppingCards(mergedCards);
              if (
                !(mergedLists || []).some(function (x) {
                  return String(x.id) === String(activeShoppingListId);
                })
              )
                setActiveShoppingListId(
                  String((mergedLists[0] && mergedLists[0].id) || "main")
                );
              var localShopPrefs: any = {
                shoppingAreas: readUserLocalJson(
                  "shopping_areas_v1",
                  localSnap.shoppingPreferencesV2.shoppingAreas
                ),
                shoppingAreaIcons: readUserLocalJson(
                  "shopping_area_icons_v1",
                  localSnap.shoppingPreferencesV2.shoppingAreaIcons
                ),
                shoppingAreaColors: readUserLocalJson(
                  "shopping_area_colors_v1",
                  localSnap.shoppingPreferencesV2.shoppingAreaColors || {}
                ),
                shoppingBoughtColor: readUserLocalJson(
                  "shopping_bought_color_v1",
                  localSnap.shoppingPreferencesV2.shoppingBoughtColor
                ),
                shoppingDefaultArea: readUserLocalJson(
                  "shopping_default_area_v1",
                  localSnap.shoppingPreferencesV2.shoppingDefaultArea
                ),
                shoppingUnits: readUserLocalJson(
                  "shopping_units_v1",
                  localSnap.shoppingPreferencesV2.shoppingUnits ||
                    DEFAULT_SHOPPING_UNITS
                ),
                shoppingDefaultUnit: readUserLocalJson(
                  "shopping_default_unit_v1",
                  localSnap.shoppingPreferencesV2.shoppingDefaultUnit || "Unità"
                ),
                shoppingProductSort: readUserLocalJson(
                  "shopping_product_sort_v1",
                  localSnap.shoppingPreferencesV2.shoppingProductSort
                ),
              };
              var cloudShopPrefs: any =
                d.shoppingPreferencesV2 &&
                typeof d.shoppingPreferencesV2 === "object"
                  ? d.shoppingPreferencesV2
                  : {
                      shoppingAreas: d.shoppingAreas,
                      shoppingAreaIcons: d.shoppingAreaIcons,
                      shoppingAreaColors: d.shoppingAreaColors,
                      shoppingBoughtColor: d.shoppingBoughtColor,
                      shoppingDefaultArea: d.shoppingDefaultArea,
                      shoppingUnits: d.shoppingUnits,
                      shoppingDefaultUnit: d.shoppingDefaultUnit,
                      shoppingProductSort: d.shoppingProductSort,
                    };
              Object.keys(cloudShopPrefs).forEach(function (k) {
                if (cloudShopPrefs[k] === undefined) delete cloudShopPrefs[k];
              });
              var localShopPrefsTs = readUserLocalUpdatedAt(
                  "shopping_preferences_v2"
                ),
                cloudShopPrefsTs = Number(d.shoppingPreferencesUpdatedAt || 0);
              var preferLocalShopPrefs = localShopPrefsTs > cloudShopPrefsTs;
              var shoppingDefaults: any = {
                shoppingAreas: DEFAULT_SHOPPING_AREAS,
                shoppingAreaIcons: {},
                shoppingAreaColors: {},
                shoppingBoughtColor: "#EAF7EE",
                shoppingDefaultArea: "Alimenti",
                shoppingUnits: DEFAULT_SHOPPING_UNITS,
                shoppingDefaultUnit: "Unità",
                shoppingProductSort: "custom",
              };
              var mergedShopPrefs: any = {};
              Object.keys(shoppingDefaults).forEach(function (k) {
                mergedShopPrefs[k] = chooseMigratedPreference(
                  localShopPrefs[k],
                  cloudShopPrefs[k],
                  shoppingDefaults[k],
                  Object.prototype.hasOwnProperty.call(cloudShopPrefs, k),
                  preferLocalShopPrefs
                );
              });
              setShoppingAreas(
                Array.isArray(mergedShopPrefs.shoppingAreas) &&
                  mergedShopPrefs.shoppingAreas.length
                  ? mergedShopPrefs.shoppingAreas
                  : DEFAULT_SHOPPING_AREAS
              );
              setShoppingAreaIcons(mergedShopPrefs.shoppingAreaIcons || {});
              setShoppingAreaColors(mergedShopPrefs.shoppingAreaColors || {});
              setShoppingBoughtColor(
                String(mergedShopPrefs.shoppingBoughtColor || "#EAF7EE")
              );
              setShoppingDefaultArea(
                String(mergedShopPrefs.shoppingDefaultArea || "Alimenti")
              );
              setShoppingUnits(
                Array.isArray(mergedShopPrefs.shoppingUnits) &&
                  mergedShopPrefs.shoppingUnits.length
                  ? mergedShopPrefs.shoppingUnits
                  : DEFAULT_SHOPPING_UNITS
              );
              setShoppingDefaultUnit(
                String(mergedShopPrefs.shoppingDefaultUnit || "Unità")
              );
              setShoppingProductSort(
                String(mergedShopPrefs.shoppingProductSort || "custom")
              );
              var shoppingNeedsBackfill =
                isFirstSnapshot &&
                (!syncJsonEqual(cloudItems, mergedItems) ||
                  !syncJsonEqual(cloudLists, mergedLists) ||
                  !syncJsonEqual(cloudCards, mergedCards) ||
                  !syncJsonEqual(cloudDeleted, mergedDeleted) ||
                  !d.shoppingPreferencesV2 ||
                  preferLocalShopPrefs ||
                  !syncJsonEqual(mergedShopPrefs, cloudShopPrefs));
              if (shoppingNeedsBackfill) {
                backfill.shoppingItems = mergedItems;
                backfill.shoppingItemsUpdatedAt = Math.max(
                  localItemsTs,
                  cloudItemsTs,
                  Date.now()
                );
                backfill.shoppingLists = mergedLists;
                backfill.shoppingListsUpdatedAt = Math.max(
                  localListsTs,
                  cloudListsTs,
                  Date.now()
                );
                backfill.shoppingCards = mergedCards;
                backfill.shoppingCardsUpdatedAt = Math.max(
                  localCardsTs,
                  cloudCardsTs,
                  Date.now()
                );
                backfill.shoppingDeletedRecords = mergedDeleted;
                backfill.shoppingPreferencesV2 = mergedShopPrefs;
                backfill.shoppingPreferencesUpdatedAt = Math.max(
                  localShopPrefsTs,
                  cloudShopPrefsTs,
                  Date.now()
                );
                Object.assign(backfill, mergedShopPrefs);
                needsBackfill = true;
              }

              var localConsent: any = {
                accepted: readAIExternalConsentLocal(),
                acceptedAt: readAIExternalConsentAtLocal(),
                textVersion: AI_CONSENT_TEXT_VERSION,
              };
              var cloudConsent: any =
                d.aiConsentV2 && typeof d.aiConsentV2 === "object"
                  ? d.aiConsentV2
                  : null;
              var localConsentTs = readUserLocalUpdatedAt("ai_consent_v2"),
                cloudConsentTs = Number(d.aiConsentUpdatedAt || 0);
              var preferLocalConsent =
                localConsentTs > cloudConsentTs ||
                !cloudConsent ||
                (localConsent.accepted === true &&
                  cloudConsent.accepted !== true);
              var mergedConsent: any = preferLocalConsent
                ? localConsent
                : cloudConsent;
              setAiExternalConsent(
                !!mergedConsent.accepted,
                mergedConsent.acceptedAt
              );
              if (!cloudConsent || preferLocalConsent) {
                var at =
                  localConsentTs ||
                  cloudConsentTs ||
                  (mergedConsent.accepted ? Date.now() : 0);
                if (at) writeUserLocalUpdatedAt("ai_consent_v2", at);
                backfill.aiConsentV2 = {
                  accepted: !!mergedConsent.accepted,
                  acceptedAt: mergedConsent.accepted
                    ? String(mergedConsent.acceptedAt || "")
                    : "",
                  textVersion: String(
                    mergedConsent.textVersion || AI_CONSENT_TEXT_VERSION
                  ),
                };
                backfill.aiConsentUpdatedAt = at;
                needsBackfill = true;
              }

              if (
                d.lang &&
                LANGUAGES.some(function (x) {
                  return x.code === String(d.lang).split("-")[0];
                })
              )
                setLang(String(d.lang).split("-")[0]);
              if (
                d.activeShoppingListId !== undefined &&
                String(d.activeShoppingListId || "")
              )
                setActiveShoppingListId(String(d.activeShoppingListId));
              var cloudPlan = d.currentPlan || d.plan || d.subscriptionPlan;
              if (cloudPlan && PLAN_LIMITS[cloudPlan])
                setCurrentPlan(cloudPlan);
              setPlanUsage(
                chooseCloudLocalObject(d.planUsage, localSnap.planUsage, {})
              );
              setShownAlertIds(
                Array.isArray(d.shownAlertIds)
                  ? d.shownAlertIds
                  : localSnap.shownAlertIds
              );
              if (needsBackfill) {
                postHydrationSyncRequestedRef.current = true;
              }
            } else {
              var initialHome: any = localSnap.homePreferencesV2;
              var initialCategory: any = localSnap.categoryPreferencesV2;
              var initialDisplay: any = localSnap.displayPreferencesV2;
              var initialShopPrefs: any = localSnap.shoppingPreferencesV2;
              var initialMethods = ensureReferencedMethods(
                Array.isArray(localSnap.methods) && localSnap.methods.length
                  ? localSnap.methods
                  : DEFAULT_METHODS,
                localSnap.expenses,
                localSnap.recurring
              );
              var now = Date.now();
              var initialCatalogMetaV3 = localSnap.catalogSyncMetaV3 || {
                schemaVersion: 3,
                revision: 1,
                updatedAtMs: now,
                writerId: catalogSyncWriterId(),
              };
              writeCatalogSyncMetaV3(initialCatalogMetaV3);
              var initialBankEncrypted = await fainanceEncryptSensitiveData(
                localSnap.bankCoords,
                userId
              );
              var initialCreditEncrypted = await fainanceEncryptSensitiveData(
                localSnap.creditCards,
                userId
              );
              var initialPayload: any = {
                accountSyncSchemaVersion: 5,
                lang: String(lang || getDefaultLang()),
                activeShoppingListId: String(activeShoppingListId || "main"),
                accountDeletedRecords: localSnap.accountDeletedRecords || {},
                expenses: stampLocalSyncRecords(
                  [],
                  localSnap.expenses,
                  function (item) {
                    return accountSyncRecordKey("expense", item);
                  }
                ),
                incomes: stampLocalSyncRecords(
                  [],
                  localSnap.incomes,
                  function (item) {
                    return accountSyncRecordKey("income", item);
                  }
                ),
                cats: localSnap.cats,
                methods: initialMethods,
                recurring: stampLocalSyncRecords(
                  [],
                  localSnap.recurring,
                  function (item) {
                    return accountSyncRecordKey("recurring", item);
                  }
                ),
                goals: stampLocalSyncRecords(
                  [],
                  localSnap.goals,
                  function (item) {
                    return accountSyncRecordKey("goal", item);
                  }
                ),
                alerts: stampLocalSyncRecords(
                  [],
                  localSnap.alerts,
                  function (item) {
                    return accountSyncRecordKey("alert", item);
                  }
                ),
                budgetPlan: localSnap.budgetPlan,
                expenseGroups: localSnap.expenseGroups,
                incomeGroups: localSnap.incomeGroups,
                methodGroups: localSnap.methodGroups,
                customIncomeTypes: localSnap.customIncomeTypes,
                incomeTypeOverrides: localSnap.incomeTypeOverrides,
                expenseCatalogV2: {
                  categories: localSnap.cats,
                  groups: localSnap.expenseGroups,
                  updatedAtMs: now,
                },
                expenseCatalogUpdatedAt: now,
                paymentCatalogV2: {
                  methods: initialMethods,
                  groups: localSnap.methodGroups,
                  updatedAtMs: now,
                },
                paymentCatalogUpdatedAt: now,
                methodCatalogUpdatedAt: now,
                incomeCatalogV2: {
                  groups: localSnap.incomeGroups,
                  customTypes: localSnap.customIncomeTypes,
                  overrides: localSnap.incomeTypeOverrides,
                  updatedAtMs: now,
                },
                incomeCatalogUpdatedAt: now,
                catalogSyncV3: {
                  schemaVersion: 3,
                  revision: Number(initialCatalogMetaV3.revision || 1),
                  updatedAtMs: Number(initialCatalogMetaV3.updatedAtMs || now),
                  writerId: String(
                    initialCatalogMetaV3.writerId || catalogSyncWriterId()
                  ),
                  expenseCatalog: {
                    categories: localSnap.cats,
                    groups: localSnap.expenseGroups,
                  },
                  paymentCatalog: {
                    methods: initialMethods,
                    groups: localSnap.methodGroups,
                  },
                  incomeCatalog: {
                    groups: localSnap.incomeGroups,
                    customTypes: localSnap.customIncomeTypes,
                    overrides: localSnap.incomeTypeOverrides,
                  },
                  categoryPreferences: initialCategory,
                },
                categoryPreferencesV2: initialCategory,
                categoryPreferencesUpdatedAt:
                  localSnap.categoryPreferencesUpdatedAt || now,
                ...initialCategory,
                patrimonioValues: localSnap.patrimonioValues,
                patrimonioAreas: localSnap.patrimonioAreas,
                patrimonioEntries: localSnap.patrimonioEntries,
                patrimonioHistory: localSnap.patrimonioHistory,
                patrimonioNotes: localSnap.patrimonioNotes,
                patrimonyPreferencesV2: localSnap.patrimonyPreferencesV2,
                patrimonyPreferencesUpdatedAt:
                  localSnap.patrimonyPreferencesUpdatedAt || now,
                patrimonioMode: localSnap.patrimonyPreferencesV2.patrimonioMode,
                displayPreferencesV2: initialDisplay,
                displayPreferencesUpdatedAt:
                  localSnap.displayPreferencesUpdatedAt || now,
                ...initialDisplay,
                homeBalanceView: initialHome.homeBalanceView,
                homeWorklets: normalizeHomeWorkletsValue(
                  initialHome.homeWorklets,
                  DEFAULT_HOME_WORKLETS
                ),
                showAppSummaryHeader:
                  initialHome.showAppSummaryHeader !== false,
                mobileNavOrder: normalizeStringOrderValue(
                  initialHome.mobileNavOrder,
                  DEFAULT_MOBILE_NAV_ORDER
                ),
                mobileNavIconCount: Math.max(
                  3,
                  Math.min(7, Number(initialHome.mobileNavIconCount || 5))
                ),
                mobileMenuOrder: normalizeStringOrderValue(
                  initialHome.mobileMenuOrder,
                  DEFAULT_MOBILE_MENU_ORDER
                ),
                mobileAllNavOrder: normalizeStringOrderValue(
                  initialHome.mobileAllNavOrder,
                  DEFAULT_MOBILE_ALL_NAV_ORDER
                ),
                homePreferencesUpdatedAt:
                  localSnap.homePreferencesUpdatedAt ||
                  (isCustomHomeSyncValue(initialHome) ? now : 0),
                appuntiDocuments: stampLocalSyncRecords(
                  [],
                  localSnap.appuntiDocuments,
                  function (item) {
                    return accountSyncRecordKey("document", item);
                  }
                ),
                appuntiNotes: stampLocalSyncRecords(
                  [],
                  localSnap.appuntiNotes,
                  function (item) {
                    return accountSyncRecordKey("note", item);
                  }
                ),
                bankCoords: initialBankEncrypted,
                creditCards: initialCreditEncrypted,
                shareProjects: localSnap.shareProjects,
                debtCredits: stampLocalSyncRecords(
                  [],
                  localSnap.debtCredits,
                  function (item) {
                    return accountSyncRecordKey("debt", item);
                  }
                ),
                shareReceiptUploads: localSnap.shareReceiptUploads,
                shoppingCards: stampLocalSyncRecords(
                  [],
                  localSnap.shoppingCards,
                  shoppingCardSyncKey
                ),
                shoppingCardsUpdatedAt: localSnap.shoppingCardsUpdatedAt || now,
                shoppingItems: stampLocalSyncRecords(
                  [],
                  normalizeShoppingItemsData(localSnap.shoppingItems),
                  shoppingSyncRecordKey
                ),
                shoppingItemsUpdatedAt: localSnap.shoppingItemsUpdatedAt || now,
                shoppingLists: stampLocalSyncRecords(
                  [],
                  localSnap.shoppingLists,
                  shoppingListSyncKey
                ),
                shoppingListsUpdatedAt: localSnap.shoppingListsUpdatedAt || now,
                shoppingDeletedRecords: localSnap.shoppingDeletedRecords || {},
                shoppingPreferencesV2: initialShopPrefs,
                shoppingPreferencesUpdatedAt:
                  localSnap.shoppingPreferencesUpdatedAt || now,
                ...initialShopPrefs,
                aiConsentV2: localSnap.aiConsentV2,
                aiConsentUpdatedAt:
                  localSnap.aiConsentUpdatedAt ||
                  (localSnap.aiConsentV2.accepted ? now : 0),
                legalAcceptanceV2: localSnap.legalAcceptanceV2 || {
                  accepted: !!(
                    localSnap.termsAccepted && localSnap.privacyAccepted
                  ),
                  terms: !!localSnap.termsAccepted,
                  privacy: !!localSnap.privacyAccepted,
                  metaEventsConsent: !!localSnap.metaEventsConsent,
                  acceptedAt: String(localSnap.legalAcceptanceDate || ""),
                  version: LEGAL_ACCEPTANCE_VERSION,
                },
                legalAcceptanceUpdatedAt:
                  localSnap.legalAcceptanceUpdatedAt ||
                  (localSnap.termsAccepted && localSnap.privacyAccepted
                    ? now
                    : 0),
                customNotifs: stampLocalSyncRecords(
                  [],
                  localSnap.customNotifs,
                  function (item) {
                    return accountSyncRecordKey("notification", item);
                  }
                ),
                notifPrefs: localSnap.notifPrefs,
                planUsage: localSnap.planUsage,
                shownAlertIds: localSnap.shownAlertIds,
                onboardingGuideSeen: localSnap.onboardingGuideSeen,
                initialSetupStatus: localSnap.initialSetupStatus,
                termsAccepted: localSnap.termsAccepted,
                privacyAccepted: localSnap.privacyAccepted,
                metaEventsConsent: localSnap.metaEventsConsent,
                legalAcceptanceDate: localSnap.legalAcceptanceDate,
                updatedAt: new Date().toISOString(),
                updatedAtMs: now,
              };
              try {
                await writeCompactAccountDocument(docRef, initialPayload);
              } catch (e) {
                console.error(
                  "Firestore first local V5 backfill error",
                  (e && e.code) || "unknown"
                );
                postHydrationSyncRequestedRef.current = true;
              }
            }
            firestoreHydratedRef.current = true;
            setFirestoreReady(true);
            endRemoteApply();
            if (postHydrationSyncRequestedRef.current) {
              setTimeout(function () {
                if (cancelled) return;
                postHydrationSyncRequestedRef.current = false;
                markPendingAccountSync();
                setAccountSyncRetryPulse(function (v) {
                  return v + 1;
                });
              }, 350);
            }
          },
          function (err) {
            if (cancelled) return;
            clearTimeout(readyFallback);
            console.error(
              "Firestore realtime sync error",
              (err && err.code) || "unknown"
            );
            firestoreHydratedRef.current = true;
            setFirestoreReady(true);
            endRemoteApply();
          }
        );
      } catch (err) {
        clearTimeout(readyFallback);
        console.error(
          "Firestore listener setup error",
          (err && err.code) || "unknown"
        );
        firestoreHydratedRef.current = true;
        setFirestoreReady(true);
        endRemoteApply();
      }
      return function () {
        cancelled = true;
        clearTimeout(readyFallback);
        try {
          if (unsubData) unsubData();
        } catch (e) {}
      };
    },
    [userId, sensitiveStorageReady]
  );

  async function writeCompactAccountDocument(docRef: any, payload: any) {
    var compactSource: any = { ...(payload || {}) };
    var previous: any = lastCloudExpandedDataRef.current || {};
    [
      "expenses",
      "incomes",
      "recurring",
      "goals",
      "alerts",
      "debtCredits",
      "appuntiDocuments",
      "appuntiNotes",
      "shareProjects",
      "shoppingItems",
      "shoppingLists",
      "shoppingCards",
    ].forEach(function (field) {
      if (compactSource[field] === undefined && previous[field] !== undefined)
        compactSource[field] = previous[field];
    });
    compactSource.accountSyncSchemaVersion = 5;
    var compressed = await fainanceCompressAccountDataV5(compactSource);
    var write: any = {};
    var reserved: any = {
      currentPlan: true,
      plan: true,
      subscriptionPlan: true,
      accountDataCompressedV5: true,
      accountDataCompressionV5: true,
      accountDataRawBytesV5: true,
      accountDataCompressedBytesV5: true,
      accountDataUpdatedAtMsV5: true,
    };
    Array.from(
      new Set(
        (lastCloudRawKeysRef.current || []).concat(Object.keys(compactSource))
      )
    ).forEach(function (key) {
      if (!reserved[key]) write[key] = deleteField();
    });
    write.accountSyncSchemaVersion = 5;
    write.accountDataCompressedV5 = compressed.value;
    write.accountDataCompressionV5 = compressed.encoding;
    write.accountDataRawBytesV5 = compressed.rawBytes;
    write.accountDataCompressedBytesV5 = compressed.compressedBytes;
    write.accountDataUpdatedAtMsV5 = Number(
      compactSource.updatedAtMs || Date.now()
    );
    write.dataIntegrityV1 = compactSource.dataIntegrityV1 || {};
    write.syncClientWriteToken = String(
      compactSource.syncClientWriteToken || ""
    );
    write.updatedAt = String(
      compactSource.updatedAt || new Date().toISOString()
    );
    write.updatedAtMs = Number(compactSource.updatedAtMs || Date.now());
    await setDoc(docRef, write, { merge: true });
    lastCloudRawKeysRef.current = Object.keys(write).filter(function (key) {
      return write[key] !== undefined;
    });
    lastCloudExpandedDataRef.current = compactSource;
  }

  async function saveToFirestore() {
    if (
      !userId ||
      !firestoreHydratedRef.current ||
      applyingFirestoreRef.current ||
      !navigator.onLine
    )
      return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    )
      return;
    restoreAccountSyncPendingFromDevice();
    var pendingAtStart: any = pendingAccountSyncRef.current || {
      revision: 0,
      token: "",
    };
    if (Number(pendingAtStart.revision || 0) <= 0) return;
    if (accountSyncSavingRef.current) {
      accountSyncRetryRequestedRef.current = true;
      return;
    }
    try {
      if (localStorage.getItem("fainance_deleting_account_" + userId) === "1")
        return;
    } catch (e) {}
    accountSyncSavingRef.current = true;
    accountSyncRetryRequestedRef.current = false;
    var accountSyncRetryDelay = 180;
    var capturedRevision = Number(pendingAtStart.revision || 0);
    var writeToken =
      String(userId) +
      "_" +
      String(Date.now()) +
      "_" +
      Math.random().toString(36).slice(2);
    pendingAccountSyncRef.current = {
      revision: capturedRevision,
      token: writeToken,
    };
    var docRef = doc(fbDb, "userData", userId);
    var bankCoordsToSave: any;
    var creditCardsToSave: any;
    try {
      bankCoordsToSave = await fainanceEncryptSensitiveData(bankCoords, userId);
      creditCardsToSave = await fainanceEncryptSensitiveData(
        creditCards,
        userId
      );
    } catch (e) {
      console.error(
        "Sensitive cloud encryption blocked",
        (e && e.message) || e
      );
      persistAccountSyncError("encryption", e, false);
      accountSyncSavingRef.current = false;
      pendingAccountSyncRef.current = { revision: capturedRevision, token: "" };
      markAccountSyncPendingOnDevice();
      accountSyncRetryRequestedRef.current = true;
      setTimeout(function () {
        setAccountSyncRetryPulse(function (v) {
          return v + 1;
        });
      }, 30000);
      return;
    }
    var catsTs = readUserLocalUpdatedAt("cats"),
      methodsTs = readUserLocalUpdatedAt("methods"),
      expenseCatalogTs = Math.max(
        readUserLocalUpdatedAt("expense_catalog_v2"),
        catsTs
      ),
      paymentCatalogTs = Math.max(
        readUserLocalUpdatedAt("payment_catalog_v2"),
        methodsTs
      ),
      incomeCatalogTs = Math.max(
        readUserLocalUpdatedAt("income_catalog_v2"),
        readUserLocalUpdatedAt("income_catalog_v1")
      ),
      now = Date.now();
    var homeValue = currentHomeSyncValue(),
      categoryValue = currentCategoryPreferencesV2(),
      displayValue = currentDisplayPreferencesV2(),
      shopPrefs = currentShoppingPreferencesV2(),
      patValue = currentPatrimonyPreferencesV2(),
      consentValue = currentAIConsentV2(),
      legalValue = currentLegalAcceptanceV2();
    var homeTs =
      readUserLocalUpdatedAt("home_preferences") ||
      (isCustomHomeSyncValue(homeValue) ? now : 0);
    var categoryTs = readUserLocalUpdatedAt("category_preferences_v2");
    var displayTs = readUserLocalUpdatedAt("display_preferences_v2");
    var shopPrefsTs = readUserLocalUpdatedAt("shopping_preferences_v2");
    var patTs = readUserLocalUpdatedAt("patrimony_preferences_v2");
    var consentTs = readUserLocalUpdatedAt("ai_consent_v2");
    var legalTs = readUserLocalUpdatedAt("legal_acceptance_v2");
    var itemsTs = shoppingItemsLocalUpdatedAt();
    var listsTs = readUserLocalUpdatedAt("shopping_lists");
    var cardsTs = readUserLocalUpdatedAt("shopping_cards");
    var safeMethodsToSave = ensureReferencedMethods(
      methods,
      expenses,
      recurring
    );
    var dataIntegrityV1 = {
      expenses: (expenses || []).length,
      incomes: (incomes || []).length,
      recurring: (recurring || []).length,
      goals: (goals || []).length,
      alerts: (alerts || []).length,
      shoppingItems: (shoppingItems || []).length,
      shoppingLists: (shoppingLists || []).length,
      shoppingCards: (shoppingCards || []).length,
      debtCredits: (debtCredits || []).length,
      shareProjects: (shareProjects || []).length,
      appuntiDocuments: (appuntiDocuments || []).length,
      appuntiNotes: (appuntiNotes || []).length,
      updatedAtMs: now,
    };
    var catalogSyncMetaV3 = readCatalogSyncMetaV3();
    if (!catalogSyncMetaV3) {
      catalogSyncMetaV3 = {
        schemaVersion: 3,
        revision: 1,
        updatedAtMs:
          Math.max(
            expenseCatalogTs,
            paymentCatalogTs,
            incomeCatalogTs,
            categoryTs
          ) || now,
        writerId: catalogSyncWriterId(),
      };
      writeCatalogSyncMetaV3(catalogSyncMetaV3);
    }
    var catalogSyncV3 = {
      schemaVersion: 3,
      revision: Number(catalogSyncMetaV3.revision || 0),
      updatedAtMs: Number(catalogSyncMetaV3.updatedAtMs || now),
      writerId: String(catalogSyncMetaV3.writerId || catalogSyncWriterId()),
      expenseCatalog: {
        categories: cats,
        groups: expenseGroups,
      },
      paymentCatalog: {
        methods: safeMethodsToSave,
        groups: methodGroups,
      },
      incomeCatalog: {
        groups: incomeGroups,
        customTypes: customIncomeTypes,
        overrides: incomeTypeOverrides,
      },
      categoryPreferences: categoryValue,
    };
    var savePayload: any = {
      accountSyncSchemaVersion: 5,
      dataIntegrityV1,
      lang: String(lang || getDefaultLang()),
      activeShoppingListId: String(activeShoppingListId || "main"),
      syncClientWriteToken: writeToken,
      accountDeletedRecords,
      expenses,
      incomes,
      cats,
      methods: safeMethodsToSave,
      catsUpdatedAt: catsTs,
      methodsUpdatedAt: methodsTs,
      recurring,
      goals,
      alerts,
      budgetPlan,
      patrimonioValues,
      patrimonioAreas,
      patrimonioEntries,
      patrimonioHistory,
      patrimonioNotes,
      patrimonioMode: patValue.patrimonioMode,
      patrimonyPreferencesV2: patValue,
      patrimonyPreferencesUpdatedAt: patTs,
      expenseGroups,
      incomeGroups,
      incomeCatalogUpdatedAt: incomeCatalogTs,
      methodGroups,
      methodCatalogUpdatedAt: paymentCatalogTs,
      paymentCatalogUpdatedAt: paymentCatalogTs,
      expenseCatalogUpdatedAt: expenseCatalogTs,
      customIncomeTypes,
      incomeTypeOverrides,
      expenseCatalogV2: {
        categories: cats,
        groups: expenseGroups,
        updatedAtMs: expenseCatalogTs || now,
      },
      paymentCatalogV2: {
        methods: safeMethodsToSave,
        groups: methodGroups,
        updatedAtMs: paymentCatalogTs || now,
      },
      incomeCatalogV2: {
        groups: incomeGroups,
        customTypes: customIncomeTypes,
        overrides: incomeTypeOverrides,
        updatedAtMs: incomeCatalogTs || now,
      },
      catalogSyncV3,
      ...categoryValue,
      categoryPreferencesV2: categoryValue,
      categoryPreferencesUpdatedAt: categoryTs,
      historyFutureMode,
      historySortDate,
      historySortDirection,
      historySortSecondary,
      historySortSecondaryDirection,
      ...displayValue,
      displayPreferencesV2: displayValue,
      displayPreferencesUpdatedAt: displayTs,
      ...homeValue,
      homePreferencesUpdatedAt: homeTs,
      appuntiDocuments,
      appuntiNotes,
      bankCoords: bankCoordsToSave,
      creditCards: creditCardsToSave,
      notifPrefs,
      customNotifs,
      termsAccepted,
      privacyAccepted,
      metaEventsConsent,
      legalAcceptanceDate,
      legalAcceptanceV2: legalValue,
      legalAcceptanceUpdatedAt: legalTs,
      aiDismissed,
      aiChat,
      aiDataAccess,
      aiFloatingEnabled,
      aiConsentV2: consentValue,
      aiConsentUpdatedAt: consentTs,
      shareProjects,
      showShareInHistory,
      debtCredits,
      shoppingCards,
      shoppingCardsUpdatedAt: cardsTs,
      shoppingItems,
      shoppingItemsUpdatedAt: itemsTs,
      shoppingLists,
      shoppingListsUpdatedAt: listsTs,
      shoppingDeletedRecords,
      ...shopPrefs,
      shoppingPreferencesV2: shopPrefs,
      shoppingPreferencesUpdatedAt: shopPrefsTs,
      shoppingAreas: shopPrefs.shoppingAreas,
      shoppingAreaIcons: shopPrefs.shoppingAreaIcons,
      shoppingAreaColors: shopPrefs.shoppingAreaColors,
      shoppingBoughtColor: shopPrefs.shoppingBoughtColor,
      shoppingDefaultArea: shopPrefs.shoppingDefaultArea,
      shoppingUnits: shopPrefs.shoppingUnits,
      shoppingDefaultUnit: shopPrefs.shoppingDefaultUnit,
      shoppingProductSort: shopPrefs.shoppingProductSort,
      showDebtCreditsInPatrimonio,
      showDebtCreditsInExpenses,
      shareReceiptUploads,
      planUsage,
      shownAlertIds,
      onboardingGuideSeen,
      initialSetupStatus,
      updatedAt: new Date().toISOString(),
      updatedAtMs: now,
    };
    var previousIntegrity: any = lastCloudIntegrityRef.current || {};
    var protectedSections: any = {
      expenses: "expense",
      incomes: "income",
      recurring: "recurring",
      goals: "goal",
      alerts: "alert",
      debtCredits: "debt",
      appuntiDocuments: "document",
      appuntiNotes: "note",
    };
    Object.keys(protectedSections).forEach(function (field) {
      var previousCount = Number(previousIntegrity[field] || 0),
        currentCount = Array.isArray(savePayload[field])
          ? savePayload[field].length
          : 0;
      if (previousCount <= 0 || currentCount > 0) return;
      var prefix = protectedSections[field] + ":";
      var deletedCount = Object.keys(accountDeletedRecords || {}).filter(
        function (k) {
          return String(k).indexOf(prefix) === 0;
        }
      ).length;
      if (deletedCount < previousCount) {
        delete savePayload[field];
        console.warn(
          "Prevented accidental empty cloud overwrite",
          field,
          previousCount
        );
      }
    });
    var previousShareCount = Number(previousIntegrity.shareProjects || 0),
      currentShareCount = Array.isArray(savePayload.shareProjects)
        ? savePayload.shareProjects.length
        : 0;
    if (previousShareCount > 0 && currentShareCount === 0) {
      var deletedShareCount = Object.keys(accountDeletedRecords || {}).filter(
        function (key) {
          return String(key).indexOf("shareProject:") === 0;
        }
      ).length;
      if (deletedShareCount < previousShareCount) {
        delete savePayload.shareProjects;
        console.warn(
          "Prevented accidental empty Share overwrite",
          previousShareCount
        );
      }
    }
    var shoppingProtected: any = {
      shoppingItems: "item",
      shoppingLists: "list",
      shoppingCards: "card",
    };
    Object.keys(shoppingProtected).forEach(function (field) {
      var previousCount = Number(previousIntegrity[field] || 0),
        currentCount = Array.isArray(savePayload[field])
          ? savePayload[field].length
          : 0;
      if (previousCount <= 0 || currentCount > 0) return;
      var prefix = shoppingProtected[field] + ":";
      var deletedCount = Object.keys(shoppingDeletedRecords || {}).filter(
        function (k) {
          return String(k).indexOf(prefix) === 0;
        }
      ).length;
      if (deletedCount < previousCount) {
        delete savePayload[field];
        console.warn(
          "Prevented accidental empty shopping overwrite",
          field,
          previousCount
        );
      }
    });
    [
      ["catsUpdatedAt", catsTs],
      ["methodsUpdatedAt", methodsTs],
      ["expenseCatalogUpdatedAt", expenseCatalogTs],
      ["paymentCatalogUpdatedAt", paymentCatalogTs],
      ["incomeCatalogUpdatedAt", incomeCatalogTs],
      ["methodCatalogUpdatedAt", paymentCatalogTs],
      ["homePreferencesUpdatedAt", homeTs],
      ["categoryPreferencesUpdatedAt", categoryTs],
      ["displayPreferencesUpdatedAt", displayTs],
      ["shoppingPreferencesUpdatedAt", shopPrefsTs],
      ["patrimonyPreferencesUpdatedAt", patTs],
      ["aiConsentUpdatedAt", consentTs],
      ["legalAcceptanceUpdatedAt", legalTs],
      ["shoppingItemsUpdatedAt", itemsTs],
      ["shoppingListsUpdatedAt", listsTs],
      ["shoppingCardsUpdatedAt", cardsTs],
    ].forEach(function (entry) {
      if (!Number(entry[1] || 0)) delete savePayload[entry[0]];
    });
    try {
      scheduleCompleteAccountRecoverySnapshot("before-cloud-save");
      await writeCompactAccountDocument(docRef, savePayload);
      if (legalValue && legalValue.accepted) {
        var legalProfileUpdate: any = {
          legalAcceptanceV2: legalValue,
          termsAccepted: true,
          privacyAccepted: true,
          metaEventsConsent: !!legalValue.metaEventsConsent,
          legalAcceptanceDate: String(legalValue.acceptedAt || ""),
          updatedAt: new Date().toISOString(),
        };
        setDoc(doc(fbDb, "users", userId), legalProfileUpdate, {
          merge: true,
        }).catch(function (e) {
          console.error("Legal profile sync error", (e && e.code) || "unknown");
        });
      }
      scheduleCompleteAccountRecoverySnapshot("cloud-save-confirmed");
      var pendingAfterWrite: any = pendingAccountSyncRef.current || {
        revision: 0,
        token: "",
      };
      if (
        Number(pendingAfterWrite.revision || 0) <= capturedRevision &&
        String(pendingAfterWrite.token || "") === writeToken
      )
        clearAccountSyncPendingOnDevice();
      accountSyncErrorToastAtRef.current = 0;
      try {
        localStorage.removeItem(userKey("account_sync_error_toast_at_v1"));
        localStorage.removeItem(userKey("account_sync_last_error_v1"));
      } catch (e) {}
      if (itemsTs)
        shoppingItemsCloudUpdatedAtRef.current = Math.max(
          Number(shoppingItemsCloudUpdatedAtRef.current || 0),
          itemsTs
        );
    } catch (e) {
      var syncTransient = accountSyncIsTransientError(e);
      var syncInfo = accountSyncErrorInfo(e);
      console.error(
        "Firestore save V5 error",
        syncInfo.rawCode,
        syncInfo.message
      );
      persistAccountSyncError("firestore-save", e, syncTransient);
      markAccountSyncPendingOnDevice();
      if (!syncTransient) {
        var syncErrorNow = Date.now(),
          syncErrorLast = Number(accountSyncErrorToastAtRef.current || 0);
        try {
          syncErrorLast = Math.max(
            syncErrorLast,
            Number(
              localStorage.getItem(userKey("account_sync_error_toast_at_v1")) ||
                0
            )
          );
        } catch (_e) {}
        if (syncErrorNow - syncErrorLast > 600000) {
          accountSyncErrorToastAtRef.current = syncErrorNow;
          try {
            localStorage.setItem(
              userKey("account_sync_error_toast_at_v1"),
              String(syncErrorNow)
            );
          } catch (_e) {}
          setToast({
            text: L(
              "Sincronizzazione cloud non riuscita. I dati restano salvati sul dispositivo e verrà effettuato un nuovo tentativo."
            ),
            type: "error",
            color: "#E24B4A",
            icon: "⚠️",
          });
        }
      }
      var currentPending: any = pendingAccountSyncRef.current || {
        revision: capturedRevision,
        token: "",
      };
      if (String(currentPending.token || "") === writeToken)
        pendingAccountSyncRef.current = {
          revision: Math.max(
            capturedRevision,
            Number(currentPending.revision || 0)
          ),
          token: "",
        };
      accountSyncRetryRequestedRef.current = true;
      accountSyncRetryDelay = 30000;
    } finally {
      accountSyncSavingRef.current = false;
      var afterSave: any = pendingAccountSyncRef.current || {
        revision: 0,
        token: "",
      };
      if (
        accountSyncRetryRequestedRef.current ||
        Number(afterSave.revision || 0) > capturedRevision
      ) {
        accountSyncRetryRequestedRef.current = false;
        setTimeout(function () {
          setAccountSyncRetryPulse(function (v) {
            return v + 1;
          });
        }, accountSyncRetryDelay);
      }
    }
  }

  useEffect(
    function () {
      function deferCriticalAccountData() {
        persistCompleteAccountRecoverySnapshot("app-background");
        if (firestoreHydratedRef.current && !applyingFirestoreRef.current)
          markPendingAccountSync();
      }
      function requestForegroundSync() {
        if (
          typeof document !== "undefined" &&
          document.visibilityState === "hidden"
        )
          return;
        if (!navigator.onLine) return;
        restoreAccountSyncPendingFromDevice();
        setAccountSyncRetryPulse(function (v) {
          return v + 1;
        });
      }
      function onVisibility() {
        if (document.visibilityState === "hidden") deferCriticalAccountData();
        else requestForegroundSync();
      }
      function onPageHide() {
        deferCriticalAccountData();
      }
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("online", requestForegroundSync);
      window.addEventListener("focus", requestForegroundSync);
      document.addEventListener("visibilitychange", onVisibility);
      return function () {
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("online", requestForegroundSync);
        window.removeEventListener("focus", requestForegroundSync);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    },
    [userId, firestoreReady]
  );

  useEffect(
    function () {
      if (!userId) return;
      var deletionTimer: any = null;
      var unsubscribe = watchAccountDeletionState(userId, function (state) {
        if (deletionTimer) {
          clearTimeout(deletionTimer);
          deletionTimer = null;
        }
        if (!state || !state.scheduledAt || state.status === "active") return;
        var remaining = Date.parse(state.scheduledAt) - Date.now();
        function expireSession() {
          closeCurrentDeviceSession(userId)
            .catch(function () {})
            .finally(function () {
              Promise.resolve(onLogout && onLogout()).catch(function () {});
            });
        }
        if (state.status === "due" || remaining <= 0) {
          expireSession();
          return;
        }
        deletionTimer = setTimeout(
          expireSession,
          Math.max(1000, remaining + 1000)
        );
      });
      return function () {
        try {
          unsubscribe && unsubscribe();
        } catch (e) {}
        if (deletionTimer) clearTimeout(deletionTimer);
      };
    },
    [userId]
  );

  async function reauthenticateForAccountDeletion(
    authUser: any,
    password: string
  ) {
    var providers = ((authUser && authUser.providerData) || []).map(function (
      p
    ) {
      return String((p && p.providerId) || "");
    });
    var authMod: any = await import("firebase/auth");
    if (providers.indexOf("password") >= 0) {
      if (!password)
        throw new Error(
          L("Inserisci la password attuale prima di eliminare l’account.")
        );
      if (!authUser.email)
        throw new Error(L("Email dell’account non disponibile."));
      var credential = authMod.EmailAuthProvider.credential(
        authUser.email,
        password
      );
      await authMod.reauthenticateWithCredential(authUser, credential);
      return;
    }
    if (providers.indexOf("google.com") >= 0) {
      if (fainanceIsNativePlatform()) {
        var gmod: any = await import("@capacitor-firebase/authentication");
        var gauth = gmod && gmod.FirebaseAuthentication;
        if (!gauth || !gauth.signInWithGoogle)
          throw new Error(
            L("Riautenticazione Google non disponibile in questa build.")
          );
        var result: any = await gauth.signInWithGoogle({
          scopes: ["email", "profile"],
          skipNativeAuth: true,
          customParameters: [{ key: "prompt", value: "select_account" }],
        });
        var data: any = (result && result.credential) || result || {};
        var idToken = data.idToken || data.id_token || "";
        var accessToken = data.accessToken || data.access_token || "";
        if (!idToken && !accessToken)
          throw new Error(L("Google non ha restituito credenziali valide."));
        await authMod.reauthenticateWithCredential(
          authUser,
          GoogleAuthProvider.credential(idToken || null, accessToken || null)
        );
        return;
      }
      var gp = new GoogleAuthProvider();
      gp.setCustomParameters({ prompt: "select_account" });
      await authMod.reauthenticateWithPopup(authUser, gp);
      return;
    }
    if (providers.indexOf("apple.com") >= 0) {
      if (fainanceIsNativePlatform()) {
        var amod: any = await import("@capacitor-firebase/authentication");
        var aauth = amod && amod.FirebaseAuthentication;
        if (!aauth || !aauth.signInWithApple)
          throw new Error(
            L("Riautenticazione Apple non disponibile in questa build.")
          );
        var ares: any = await aauth.signInWithApple({
          scopes: ["email", "name"],
          skipNativeAuth: true,
        });
        var adata: any = (ares && ares.credential) || ares || {};
        var aid =
          adata.idToken ||
          adata.id_token ||
          adata.identityToken ||
          adata.identity_token ||
          "";
        var aa = adata.accessToken || adata.access_token || "";
        var nonce = adata.rawNonce || adata.raw_nonce || adata.nonce || "";
        if (!aid)
          throw new Error(L("Apple non ha restituito credenziali valide."));
        var ap = new OAuthProvider("apple.com");
        var ac = ap.credential(
          nonce
            ? { idToken: aid, rawNonce: nonce, accessToken: aa || undefined }
            : { idToken: aid, accessToken: aa || undefined }
        );
        await authMod.reauthenticateWithCredential(authUser, ac);
        return;
      }
      var provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      await authMod.reauthenticateWithPopup(authUser, provider);
      return;
    }
    throw new Error(
      L(
        "Per eliminare l’account devi accedere nuovamente con il metodo usato alla registrazione."
      )
    );
  }

  async function requestCurrentAccountDeletion(password?: string) {
    if (!userId) throw new Error(L("Account non valido."));
    var authUser = fbAuth.currentUser;
    if (!authUser)
      throw new Error(L("Utente non trovato. Esci e rientra, poi riprova."));
    try {
      await reauthenticateForAccountDeletion(authUser, String(password || ""));
    } catch (err: any) {
      if (
        err &&
        (err.code === "auth/wrong-password" ||
          err.code === "auth/invalid-credential")
      )
        throw new Error(L("Password non corretta."));
      if (err && err.code === "auth/popup-closed-by-user")
        throw new Error(L("Riautenticazione annullata."));
      throw err;
    }
    var state = await requestAccountDeletion(userId);
    await revokeAllOtherDeviceSessions(userId).catch(function () {});
    return state;
  }

  async function cancelCurrentAccountDeletion() {
    if (!userId) throw new Error(L("Account non valido."));
    return await cancelAccountDeletion(userId);
  }

  // Immediate account deletion was removed in fAInance 2.0.
  // Account deletion now always uses the 15-day reconsideration lifecycle.

  function normalizeEmail(v) {
    return String(v || "")
      .trim()
      .toLowerCase();
  }
  function normalizePhoneForLookup(v) {
    return String(v || "").replace(/[^0-9]/g, "");
  }
  function safeLookupDocId(prefix, value) {
    return (
      prefix +
      ":" +
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\//g, "_")
    );
  }
  function userLookupPayload(uid, email, phone, name) {
    return {
      uid: uid || "",
      email: normalizeEmail(email || ""),
      phone: normalizePhoneForLookup(phone || ""),
      name: name || "",
      active: true,
      updatedAt: new Date().toISOString(),
    };
  }
  async function publishCurrentUserLookup(email, phone, name) {
    try {
      var uid =
        (fbAuth && fbAuth.currentUser && fbAuth.currentUser.uid) ||
        userId ||
        "";
      if (!uid || !fbDb) return;
      var em = normalizeEmail(
        email || (currentUser && currentUser.email) || ""
      );
      var ph = normalizePhoneForLookup(phone || "");
      var nm = name || (currentUser && currentUser.name) || "Utente";
      if (em)
        await setDoc(
          doc(fbDb, "userLookup", safeLookupDocId("email", em)),
          userLookupPayload(uid, em, ph, nm),
          { merge: true }
        ).catch(function () {});
      if (ph)
        await setDoc(
          doc(fbDb, "userLookup", safeLookupDocId("phone", ph)),
          userLookupPayload(uid, em, ph, nm),
          { merge: true }
        ).catch(function () {});
    } catch (e) {}
  }
  async function findRegisteredUserForShare(email, phone, username) {
    var em = normalizeEmail(email || "");
    var ph = normalizePhoneForLookup(phone || "");
    var un = String(username || "")
      .trim()
      .replace(/^@+/, "")
      .toLocaleLowerCase("en-US");
    if (un) {
      try {
        var usernameSnap = await getDoc(doc(fbDb, "usernames", un));
        if (usernameSnap.exists()) {
          var usernameData = usernameSnap.data() || {};
          if (usernameData.uid && usernameData.active !== false) {
            return {
              uid: usernameData.uid,
              username: usernameData.username || username,
              usernameLower: un,
              name: "@" + (usernameData.username || username),
              matchType: "username",
            };
          }
        }
      } catch (e) {}
      return null;
    }
    try {
      if (em) {
        var lookupEmail = await getDoc(
          doc(fbDb, "userLookup", safeLookupDocId("email", em))
        ).catch(function () {
          return null;
        });
        if (lookupEmail && lookupEmail.exists && lookupEmail.exists()) {
          var le = lookupEmail.data();
          if (le && le.uid) return { uid: le.uid, ...le, matchType: "email" };
        }
      }
      if (ph) {
        var lookupPhone = await getDoc(
          doc(fbDb, "userLookup", safeLookupDocId("phone", ph))
        ).catch(function () {
          return null;
        });
        if (lookupPhone && lookupPhone.exists && lookupPhone.exists()) {
          var lp = lookupPhone.data();
          if (lp && lp.uid) return { uid: lp.uid, ...lp, matchType: "phone" };
        }
      }
    } catch (e) {}
    try {
      if (em) {
        var byEmail = await getDocs(
          query(collection(fbDb, "users"), where("email", "==", em), limit(1))
        ).catch(function () {
          return null;
        });
        if (byEmail && byEmail.docs && byEmail.docs.length) {
          var de = byEmail.docs[0];
          return { uid: de.id, ...de.data(), matchType: "email" };
        }
      }
    } catch (e) {}
    try {
      if (ph) {
        var byPhone = await getDocs(
          query(collection(fbDb, "users"), where("phone", "==", ph), limit(1))
        ).catch(function () {
          return null;
        });
        if (byPhone && byPhone.docs && byPhone.docs.length) {
          var dp = byPhone.docs[0];
          return { uid: dp.id, ...dp.data(), matchType: "phone" };
        }
      }
    } catch (e) {}
    return null;
  }
  function currentUserShareName() {
    return currentUser && currentUser.name ? currentUser.name : "Utente";
  }
  var SHARE_WEB_APP_URL = "https://fainanceapp.it";
  useEffect(
    function () {
      try {
        if (currentUser && currentUser.email)
          publishCurrentUserLookup(
            currentUser.email,
            currentUser.phone,
            currentUser.name
          );
      } catch (e) {}
    },
    [
      currentUser && currentUser.id,
      currentUser && currentUser.email,
      currentUser && currentUser.phone,
      currentUser && currentUser.name,
    ]
  );
  function escapeShareHtml(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function buildShareInviteUrl(inviteId, projectId) {
    var base = SHARE_WEB_APP_URL.replace(/\/$/, "");
    return (
      base +
      "/?shareInvite=" +
      encodeURIComponent(String(inviteId || "")) +
      "&shareProject=" +
      encodeURIComponent(String(projectId || ""))
    );
  }
  function shareProjectStamp(project) {
    var ms = Number((project && project.updatedAtMs) || 0);
    if (ms > 0) return ms;
    var rev = Number((project && project.shareRevision) || 0);
    if (rev > 0) return rev;
    var parsed = Date.parse(
      String(
        (project && project.updatedAt) || (project && project.createdAt) || ""
      )
    );
    return isNaN(parsed) ? 0 : parsed;
  }
  function preferShareProject(a, b) {
    if (!a) return b;
    if (!b) return a;
    var as = shareProjectStamp(a),
      bs = shareProjectStamp(b);
    if (bs > as) return { ...a, ...b };
    if (as > bs) return { ...b, ...a };
    var aa = Array.isArray(a.activities) ? a.activities.length : 0,
      ba = Array.isArray(b.activities) ? b.activities.length : 0;
    return ba >= aa ? { ...a, ...b } : { ...b, ...a };
  }
  function shareParticipantKey(p) {
    if (!p) return "";
    var uid = String(p.uid || "").trim();
    if (uid) return "uid:" + uid;
    var id = String(p.id || "").trim();
    if (id) return "id:" + id;
    var email = normalizeEmail(p.email || "");
    if (email) return "email:" + email;
    var phone = normalizePhoneForLookup(p.phone || "");
    if (phone) return "phone:" + phone;
    return (
      "name:" +
      String(p.name || "")
        .trim()
        .toLowerCase()
    );
  }
  function shareActivityKey(a) {
    if (!a) return "";
    if (a.id !== undefined && a.id !== null && String(a.id) !== "")
      return "id:" + String(a.id);
    return [
      String(a.kind || a.type || ""),
      String(a.date || ""),
      String(a.time || ""),
      String(a.amount || ""),
      String(a.desc || a.description || ""),
      String(a.from || ""),
      String(a.to || ""),
      String(a.paidBy || ""),
    ].join("|");
  }
  function mergeShareRecordArrays(first, second, keyFn) {
    var out = [];
    var positions = {};
    function add(item) {
      if (!item) return;
      var key = keyFn(item) || "raw:" + JSON.stringify(item);
      if (positions[key] === undefined) {
        positions[key] = out.length;
        out.push(item);
        return;
      }
      var prev = out[positions[key]];
      out[positions[key]] =
        syncRecordTime(item) >= syncRecordTime(prev)
          ? { ...prev, ...item }
          : { ...item, ...prev };
    }
    (Array.isArray(first) ? first : []).forEach(add);
    (Array.isArray(second) ? second : []).forEach(add);
    return out;
  }
  function mergeShareProjectDeep(a, b) {
    if (!a) return b;
    if (!b) return a;
    var preferred = preferShareProject(a, b) || {};
    var participants = mergeShareRecordArrays(
      a.participants,
      b.participants,
      shareParticipantKey
    );
    var activities = mergeShareRecordArrays(
      a.activities,
      b.activities,
      shareActivityKey
    );
    var memberUids = [];
    function addUid(v) {
      v = String(v || "").trim();
      if (v && memberUids.indexOf(v) < 0) memberUids.push(v);
    }
    (a.memberUids || []).forEach(addUid);
    (b.memberUids || []).forEach(addUid);
    addUid(a.ownerUid);
    addUid(b.ownerUid);
    participants.forEach(function (p) {
      addUid(p && p.uid);
      var id = String((p && p.id) || "");
      if (id.indexOf("u_") === 0) addUid(id.slice(2));
    });
    var updatedAtMs = Math.max(
      Number(a.updatedAtMs || 0),
      Number(b.updatedAtMs || 0),
      shareProjectStamp(a),
      shareProjectStamp(b)
    );
    var shareRevision = Math.max(
      Number(a.shareRevision || 0),
      Number(b.shareRevision || 0)
    );
    return {
      ...a,
      ...b,
      ...preferred,
      id: String(preferred.id || a.id || b.id || ""),
      participants: participants,
      activities: activities,
      memberUids: memberUids,
      ownerUid: preferred.ownerUid || a.ownerUid || b.ownerUid || "",
      updatedAtMs: updatedAtMs || undefined,
      shareRevision: shareRevision || undefined,
    };
  }
  function mergeShareProjectArrays(first, second) {
    var map = {};
    var order = [];
    function add(p) {
      if (!p) return;
      var key = String(p.id || "");
      if (!key) return;
      if (!map[key]) order.push(key);
      map[key] = mergeShareProjectDeep(map[key], p);
    }
    (Array.isArray(first) ? first : []).forEach(add);
    (Array.isArray(second) ? second : []).forEach(add);
    return order
      .map(function (k) {
        return map[k];
      })
      .sort(function (a, b) {
        return (
          shareProjectStamp(b) - shareProjectStamp(a) ||
          String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
        );
      });
  }
  function shareProjectTombstoneKey(project) {
    return accountSyncRecordKey("shareProject", project);
  }
  function latestShareProjectTombstones() {
    return readUserLocalJson(
      "account_deleted_records_v1",
      accountDeletedRecords || {}
    );
  }
  function filterShareProjectsByTombstones(projects, tombstones) {
    return (Array.isArray(projects) ? projects : []).filter(function (project) {
      var key = shareProjectTombstoneKey(project);
      if (!key) return true;
      var deletedAt = syncTombstoneTime(tombstones && tombstones[key]);
      return !deletedAt || shareProjectStamp(project) > deletedAt;
    });
  }
  function mergeShareProjectsFromCloud(cloudProjects) {
    if (!Array.isArray(cloudProjects) || !cloudProjects.length) return;
    setShareProjects(function (list) {
      return filterShareProjectsByTombstones(
        mergeShareProjectArrays(list, cloudProjects),
        latestShareProjectTombstones()
      );
    });
  }
  function shareMemberUidsForProject(project) {
    var ids = [];
    function add(v) {
      v = String(v || "").trim();
      if (v && ids.indexOf(v) < 0) ids.push(v);
    }
    add(project && project.ownerUid);
    add(userId);
    ((project && project.memberUids) || []).forEach(add);
    ((project && project.participants) || []).forEach(function (p) {
      add(p && p.uid);
      var pid = String((p && p.id) || "");
      if (pid.indexOf("u_") === 0) add(pid.slice(2));
    });
    return ids;
  }
  function syncShareProjectToCloud(project) {
    if (!project || !userId) return;
    var pid = String(project.id);
    var nowIso = new Date().toISOString();
    var memberUids = shareMemberUidsForProject(project);
    var cloudProject = {
      ...project,
      memberUids: memberUids,
      ownerUid: project.ownerUid || userId,
      updatedAt: project.updatedAt || nowIso,
      updatedAtMs: Date.now(),
      shareRevision: Date.now(),
    };
    setDoc(doc(fbDb, "shareProjects", pid), cloudProject, {
      merge: true,
    }).catch(function (e) {
      console.error("Share project sync error", (e && e.code) || "unknown");
      if (setToast)
        setToast({
          text: L(
            "Errore sincronizzazione Share: verifica la connessione e riapri il progetto."
          ),
          type: "error",
          color: "#E24B4A",
          icon: "⚠️",
        });
    });
  }
  function loadShareCollaboration() {
    if (!userId) return;
    var email = normalizeEmail(currentUser && currentUser.email);
    setShareInviteLoading(true);
    var inviteQueries = [];
    if (email)
      inviteQueries.push(
        getDocs(
          query(
            collection(fbDb, "shareInvites"),
            where("invitedEmail", "==", email)
          )
        ).catch(function () {
          return null;
        })
      );
    inviteQueries.push(
      getDocs(
        query(
          collection(fbDb, "shareInvites"),
          where("invitedUid", "==", userId)
        )
      ).catch(function () {
        return null;
      })
    );
    Promise.all([
      Promise.all(inviteQueries),
      getDocs(
        query(
          collection(fbDb, "shareProjects"),
          where("memberUids", "array-contains", userId)
        )
      ).catch(function () {
        return null;
      }),
      getDocs(
        query(
          collection(fbDb, "shareNotifications"),
          where("userUid", "==", userId)
        )
      ).catch(function () {
        return null;
      }),
    ])
      .then(function (res) {
        var invMap = {};
        (res[0] || []).forEach(function (snap) {
          if (!snap) return;
          (snap.docs || []).forEach(function (d) {
            var data = d.data();
            if (data && data.status === "pending")
              invMap[d.id] = { ...data, id: d.id };
          });
        });
        setShareReceivedInvites(
          Object.keys(invMap)
            .map(function (k) {
              return invMap[k];
            })
            .sort(function (a, b) {
              return String(b.createdAt || "").localeCompare(
                String(a.createdAt || "")
              );
            })
        );
        var cloudProjects = [];
        if (res[1])
          res[1].docs.forEach(function (d) {
            cloudProjects.push({ ...d.data(), id: d.id });
          });
        mergeShareProjectsFromCloud(cloudProjects);
        var notifs = [];
        if (res[2])
          res[2].docs.forEach(function (d) {
            var data = d.data();
            if (data && !data.read) notifs.push({ ...data, id: d.id });
          });
        setShareReceivedNotifications(notifs);
      })
      .finally(function () {
        setShareInviteLoading(false);
      });
  }
  useEffect(
    function () {
      if (!firestoreReady || !userId) return;
      var email = normalizeEmail(currentUser && currentUser.email);
      setShareInviteLoading(true);
      var projectMaps = { member: {}, owner: {} };
      var inviteMaps = { email: {}, uid: {} };
      function applyProjects() {
        var all = {};
        Object.keys(projectMaps.member).forEach(function (k) {
          all[k] = projectMaps.member[k];
        });
        Object.keys(projectMaps.owner).forEach(function (k) {
          all[k] = mergeShareProjectDeep(all[k], projectMaps.owner[k]);
        });
        var remoteArr = Object.keys(all).map(function (k) {
          return all[k];
        });
        setShareProjects(function (current) {
          return filterShareProjectsByTombstones(
            mergeShareProjectArrays(current, remoteArr),
            latestShareProjectTombstones()
          );
        });
      }
      function applyInvites() {
        var all = {};
        Object.keys(inviteMaps.email).forEach(function (k) {
          all[k] = inviteMaps.email[k];
        });
        Object.keys(inviteMaps.uid).forEach(function (k) {
          all[k] = inviteMaps.uid[k];
        });
        setShareReceivedInvites(
          Object.keys(all)
            .map(function (k) {
              return all[k];
            })
            .filter(function (i) {
              return i && i.status === "pending";
            })
            .sort(function (a, b) {
              return String(b.createdAt || "").localeCompare(
                String(a.createdAt || "")
              );
            })
        );
        setShareInviteLoading(false);
      }
      var unsubs = [];
      unsubs.push(
        onSnapshot(
          query(
            collection(fbDb, "shareProjects"),
            where("memberUids", "array-contains", userId)
          ),
          function (snap) {
            var map = {};
            snap.forEach(function (d) {
              map[d.id] = { ...d.data(), id: d.id };
            });
            projectMaps.member = map;
            applyProjects();
          },
          function (e) {
            console.error(
              "Share projects member listener error",
              (e && e.code) || "unknown"
            );
            setShareInviteLoading(false);
          }
        )
      );
      unsubs.push(
        onSnapshot(
          query(
            collection(fbDb, "shareProjects"),
            where("ownerUid", "==", userId)
          ),
          function (snap) {
            var map = {};
            snap.forEach(function (d) {
              map[d.id] = { ...d.data(), id: d.id };
            });
            projectMaps.owner = map;
            applyProjects();
          },
          function (e) {
            console.error(
              "Share projects owner listener error",
              (e && e.code) || "unknown"
            );
          }
        )
      );
      if (email) {
        unsubs.push(
          onSnapshot(
            query(
              collection(fbDb, "shareInvites"),
              where("invitedEmail", "==", email)
            ),
            function (snap) {
              var map = {};
              snap.forEach(function (d) {
                map[d.id] = { ...d.data(), id: d.id };
              });
              inviteMaps.email = map;
              applyInvites();
            },
            function (e) {
              console.error(
                "Share invites email listener error",
                (e && e.code) || "unknown"
              );
              setShareInviteLoading(false);
            }
          )
        );
      }
      unsubs.push(
        onSnapshot(
          query(
            collection(fbDb, "shareInvites"),
            where("invitedUid", "==", userId)
          ),
          function (snap) {
            var map = {};
            snap.forEach(function (d) {
              map[d.id] = { ...d.data(), id: d.id };
            });
            inviteMaps.uid = map;
            applyInvites();
          },
          function (e) {
            console.error(
              "Share invites uid listener error",
              (e && e.code) || "unknown"
            );
            setShareInviteLoading(false);
          }
        )
      );
      unsubs.push(
        onSnapshot(
          query(
            collection(fbDb, "shareNotifications"),
            where("userUid", "==", userId)
          ),
          function (snap) {
            var list = [];
            snap.forEach(function (d) {
              var data = d.data();
              if (data && !data.read) list.push({ ...data, id: d.id });
            });
            setShareReceivedNotifications(list);
          },
          function (e) {
            console.error(
              "Share notifications listener error",
              (e && e.code) || "unknown"
            );
          }
        )
      );
      return function () {
        unsubs.forEach(function (u) {
          try {
            u && u();
          } catch (e) {}
        });
      };
    },
    [firestoreReady, userId, currentUser && currentUser.email]
  );
  useEffect(
    function () {
      if (!firestoreReady || !userId) return;
      var cancelled = false;
      var unsubscribe = onSnapshot(
        query(
          collection(fbDb, "appNotifications"),
          where("targetUid", "==", String(userId)),
          limit(100)
        ),
        function (snapshot) {
          if (cancelled || shareDeletionPromptRef.current) return;
          var pending = [];
          snapshot.forEach(function (row) {
            var data = row.data() || {};
            if (
              data.type === "share_project_deleted" &&
              data.status !== "deleted" &&
              String(data.decisionStatus || "pending") === "pending"
            )
              pending.push({ ...data, id: row.id });
          });
          pending.sort(function (a, b) {
            return Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0);
          });
          var notification = pending[0];
          if (!notification) return;
          var pid = String(notification.projectId || notification.actionValue || "");
          if (!pid) return;
          var localProject = (Array.isArray(shareProjectsRef.current)
            ? shareProjectsRef.current
            : []
          ).find(function (item) {
            return String(item && item.id || "") === pid;
          });
          Promise.resolve(
            localProject
              ? localProject
              : getDoc(doc(fbDb, "shareProjects", pid)).then(function (projectSnap) {
                  return projectSnap.exists()
                    ? { ...projectSnap.data(), id: projectSnap.id }
                    : null;
                })
          )
            .then(function (project) {
              if (cancelled || shareDeletionPromptRef.current) return;
              if (!project) {
                return setDoc(
                  doc(fbDb, "appNotifications", String(notification.id)),
                  { decisionStatus: "unavailable", read: true, readAt: new Date().toISOString() },
                  { merge: true }
                ).catch(function () {});
              }
              setShareDeletionPrompt({
                source: "participant",
                project: project,
                projectId: pid,
                notificationId: String(notification.id),
                deletedByName: String(
                  notification.messageArgs && notification.messageArgs.name ||
                    project.deletedByName ||
                    ""
                ),
              });
            })
            .catch(function (error) {
              console.error("Share deletion prompt load error", error);
            });
        },
        function (error) {
          console.error("Share deletion notification listener error", error);
        }
      );
      return function () {
        cancelled = true;
        try { unsubscribe && unsubscribe(); } catch (_error) {}
      };
    },
    [firestoreReady, userId]
  );

  async function acceptShareInvite(invite) {
    if (!invite || !invite.projectId || !userId) return;
    try {
      var projectRef = doc(fbDb, "shareProjects", String(invite.projectId));
      var projectSnap = await getDoc(projectRef);
      if (!projectSnap.exists()) {
        setToast("Progetto Share non trovato");
        return;
      }
      var project = { ...projectSnap.data(), id: String(invite.projectId) };
      var email = normalizeEmail(currentUser && currentUser.email);
      var participants = Array.isArray(project.participants)
        ? project.participants.slice()
        : [];
      var found = false;
      participants = participants.map(function (p) {
        var matches =
          (invite.participantId && p.id === invite.participantId) ||
          (email && normalizeEmail(p.email) === email) ||
          p.uid === userId;
        if (!matches) return p;
        found = true;
        return {
          ...p,
          uid: userId,
          email: email || p.email,
          name: currentUserShareName(),
          kind: "registered",
          type: "registered",
          role: "member",
          status: "active",
        };
      });
      if (!found)
        participants.push({
          id: "u_" + userId,
          uid: userId,
          email: email,
          name: currentUserShareName(),
          kind: "registered",
          type: "registered",
          role: "member",
          status: "active",
        });
      var memberUids = Array.from(
        new Set((project.memberUids || []).concat([userId]))
      );
      var nowIso = new Date().toISOString();
      var updatedDraft = {
        ...project,
        participants: participants,
        memberUids: memberUids,
        updatedAt: nowIso,
        updatedAtMs: Date.now(),
        shareRevision: Date.now(),
      };
      var updated = {
        ...updatedDraft,
        memberUids: shareMemberUidsForProject(updatedDraft),
      };
      await setDoc(projectRef, updated, { merge: true });
      await setDoc(
        doc(fbDb, "shareInvites", String(invite.id)),
        {
          status: "accepted",
          acceptedAt: new Date().toISOString(),
          invitedUid: userId,
        },
        { merge: true }
      );
      var inviterUid = String(invite.invitedByUid || "").trim();
      if (inviterUid && inviterUid !== String(userId)) {
        var acceptedProjectName = String(project.name || invite.projectName || "Progetto Share");
        var acceptedByName = currentUserShareName();
        await setDoc(
          doc(fbDb, "appNotifications", "share_invite_accepted_" + String(invite.id)),
          {
            targetUid: inviterUid,
            type: "share_invite_accepted",
            title: "Invito Share accettato",
            message: acceptedByName + " ha accettato l'invito al progetto " + acceptedProjectName,
            messageArgs: {
              name: acceptedByName,
              project: acceptedProjectName,
            },
            projectId: String(invite.projectId),
            inviteId: String(invite.id),
            actionType: "open_share_project",
            actionValue: String(invite.projectId),
            source: "share",
            sourceUid: String(userId),
            read: false,
            status: "active",
            createdAt: new Date().toISOString(),
            createdAtMs: Date.now(),
          },
          { merge: true }
        ).catch(function () {});
      }
      setShareProjects(function (list) {
        var exists = (list || []).some(function (p) {
          return String(p.id) === String(updated.id);
        });
        return exists
          ? (list || []).map(function (p) {
              return String(p.id) === String(updated.id) ? updated : p;
            })
          : [updated].concat(list || []);
      });
      setShareReceivedInvites(function (list) {
        return (list || []).filter(function (i) {
          return i.id !== invite.id;
        });
      });
      setToast("Invito Share accettato");
      loadShareCollaboration();
    } catch (e) {
      console.error(e);
      setToast("Errore durante l'accettazione dell'invito");
    }
  }
  async function declineShareInvite(invite) {
    if (!invite || !invite.id) return;
    try {
      await setDoc(
        doc(fbDb, "shareInvites", String(invite.id)),
        {
          status: "declined",
          declinedAt: new Date().toISOString(),
          invitedUid: userId || null,
        },
        { merge: true }
      );
      setShareReceivedInvites(function (list) {
        return (list || []).filter(function (i) {
          return i.id !== invite.id;
        });
      });
      setToast("Invito Share rifiutato");
    } catch (e) {
      console.error(e);
      setToast("Errore durante il rifiuto dell'invito");
    }
  }
  async function createShareInvite(
    project,
    participant,
    email,
    name,
    foundUser
  ) {
    if (!project || !userId) return null;
    var invitedUid =
      foundUser && foundUser.uid
        ? foundUser.uid
        : participant && participant.uid
        ? participant.uid
        : null;
    var invitedEmail = normalizeEmail(
      email || (participant && participant.email) || ""
    );
    var invitedPhone = normalizePhoneForLookup(
      (participant && participant.phone) || (foundUser && foundUser.phone) || ""
    );
    if (!invitedEmail && !invitedUid && !invitedPhone) return null;
    var inviteId =
      "invite_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
    var projectId = String(project.id);
    var projectName = project.name || "Progetto Share";
    var inviteLink = buildShareInviteUrl(inviteId, projectId);
    var inviteName =
      name ||
      (foundUser && (foundUser.name || foundUser.displayName)) ||
      (participant && participant.name) ||
      invitedEmail.split("@")[0] ||
      invitedPhone ||
      "Utente";
    var invite = {
      id: inviteId,
      projectId: projectId,
      projectName: projectName,
      participantId: participant.id,
      invitedEmail: invitedEmail,
      invitedPhone: invitedPhone,
      invitedUid: invitedUid,
      invitedName: inviteName,
      invitedByUid: userId,
      invitedByName: currentUserShareName(),
      status: "pending",
      inviteLink: inviteLink,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(fbDb, "shareInvites", inviteId), invite, { merge: true });
    if (invitedUid) {
      await addDoc(collection(fbDb, "shareNotifications"), {
        userUid: invitedUid,
        type: "share_invite",
        title: "Invito Share",
        message:
          currentUserShareName() +
          " ti ha invitato nel progetto " +
          projectName,
        projectId: projectId,
        inviteId: inviteId,
        inviteLink: inviteLink,
        read: false,
        createdAt: new Date().toISOString(),
      }).catch(function () {});
      await setDoc(
        doc(fbDb, "appNotifications", "share_invite_" + inviteId),
        {
          targetUid: invitedUid,
          type: "share_invite",
          title: "Invito Share",
          message:
            currentUserShareName() +
            " ti ha invitato nel progetto " +
            projectName,
          projectId: projectId,
          inviteId: inviteId,
          actionType: "open_share_invite",
          actionValue: inviteId,
          source: "share",
          sourceUid: userId,
          messageArgs: {
            name: currentUserShareName(),
            project: projectName,
          },
          read: false,
          status: "active",
          createdAt: new Date().toISOString(),
          createdAtMs: Date.now(),
        },
        { merge: true }
      ).catch(function () {});
    }
    if (!invitedEmail) return inviteId;
    var safeInviter = escapeShareHtml(currentUserShareName());
    var safeProject = escapeShareHtml(projectName);
    var safeLink = escapeShareHtml(inviteLink);
    var mailHtml =
      "" +
      '<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#222;line-height:1.5;">' +
      '<div style="font-size:22px;font-weight:800;margin-bottom:6px;">Invito Share su fAInance</div>' +
      '<div style="font-size:14px;color:#666;margin-bottom:22px;">Gestisci spese condivise, saldi e rimborsi in un unico progetto.</div>' +
      '<div style="background:#f4f1ff;border:1px solid #ddd8ff;border-radius:14px;padding:18px;margin-bottom:22px;">' +
      '<p style="margin:0 0 10px 0;"><strong>' +
      safeInviter +
      "</strong> ti ha invitato a partecipare al progetto:</p>" +
      '<p style="margin:0;font-size:20px;font-weight:800;color:#5f55d8;">' +
      safeProject +
      "</p>" +
      "</div>" +
      '<a href="' +
      safeLink +
      '" style="display:inline-block;background:#7F77DD;color:#fff;text-decoration:none;border-radius:12px;padding:13px 20px;font-weight:800;margin-bottom:18px;">Apri invito Share</a>' +
      '<p style="font-size:13px;color:#777;margin-top:18px;">Se il pulsante non funziona, copia e incolla questo link nel browser:</p>' +
      '<p style="font-size:12px;word-break:break-all;color:#555;">' +
      safeLink +
      "</p>" +
      '<hr style="border:none;border-top:1px solid #eee;margin:22px 0;"/>' +
      '<p style="font-size:12px;color:#999;margin:0;">Hai ricevuto questa email perché qualcuno ti ha invitato a un progetto Share su fAInance.</p>' +
      "</div>";
    var mailText =
      currentUserShareName() +
      " ti ha invitato a partecipare al progetto " +
      projectName +
      " su fAInance. Apri l'invito da questo link: " +
      inviteLink;
    await addDoc(collection(fbDb, "mail"), {
      to: [invitedEmail],
      message: {
        subject: "Invito a " + projectName + " su fAInance",
        text: mailText,
        html: mailHtml,
      },
      shareInviteId: inviteId,
      shareProjectId: projectId,
      shareInviteLink: inviteLink,
      createdAt: new Date().toISOString(),
    }).catch(function (e) {
      console.error("Mail queue error", (e && e.code) || "unknown");
    });
    return inviteId;
  }

  // Auto-save to Firestore whenever data changes
  useEffect(
    function () {
      if (!firestoreReady || applyingFirestoreRef.current) return;
      var timer = setTimeout(saveToFirestore, 900); // lascia terminare i tocchi e raggruppa le modifiche prima della sincronizzazione
      return function () {
        clearTimeout(timer);
      };
    },
    [
      accountDeletedRecords,
      expenses,
      incomes,
      cats,
      methods,
      recurring,
      goals,
      alerts,
      budgetPlan,
      patrimonioValues,
      patrimonioAreas,
      patrimonioEntries,
      patrimonioHistory,
      patrimonioNotes,
      patrimonioMode,
      expenseGroups,
      incomeGroups,
      methodGroups,
      customIncomeTypes,
      incomeTypeOverrides,
      catOrder,
      methodOrder,
      catSortMode,
      methodSortMode,
      defaultExpenseCat,
      defaultExpenseMethod,
      defaultIncomeType,
      defaultExpenseArea,
      defaultIncomeArea,
      defaultMethodArea,
      incomeTypeOrder,
      historyFutureMode,
      historySortDate,
      historySortDirection,
      historySortSecondary,
      historySortSecondaryDirection,
      currency,
      secondaryCurrency,
      showSecInHistory,
      showSecInStats,
      showSecInBudget,
      showSecInPatrimonio,
      dateFmt,
      firstDayOfWeek,
      statsView,
      btnStyle,
      expenseColor,
      incomeColor,
      homeBalanceView,
      homeWorklets,
      showAppSummaryHeader,
      mobileNavOrder,
      mobileNavIconCount,
      mobileMenuOrder,
      mobileAllNavOrderRaw,
      appuntiDocuments,
      appuntiNotes,
      bankCoords,
      creditCards,
      notifPrefs,
      customNotifs,
      termsAccepted,
      privacyAccepted,
      metaEventsConsent,
      legalAcceptanceDate,
      aiDismissed,
      aiChat,
      aiDataAccess,
      aiFloatingEnabled,
      aiExternalConsent,
      aiExternalConsentAt,
      shareProjects,
      showShareInHistory,
      debtCredits,
      shoppingCards,
      shoppingItems,
      shoppingLists,
      shoppingDeletedRecords,
      shoppingAreas,
      shoppingAreaIcons,
      shoppingAreaColors,
      shoppingBoughtColor,
      shoppingUnits,
      shoppingDefaultUnit,
      shoppingProductSort,
      showDebtCreditsInPatrimonio,
      showDebtCreditsInExpenses,
      shoppingDefaultArea,
      shareReceiptUploads,
      confirmButtonColor,
      secondaryButtonColor,
      currentPlan,
      planUsage,
      shownAlertIds,
      onboardingGuideSeen,
      initialSetupStatus,
      accountSyncRetryPulse,
      isOffline,
    ]
  );

  var [speseSubTab, setSpeseSubTab] = useState("add");
  var [addType, setAddType] = useState("expense");
  var [addSubTab, setAddSubTab] = useState("single");

  function openQuickAddFromUrl(rawUrl) {
    var raw = String(rawUrl || "");
    var url = raw.toLowerCase();
    if (!url) return;
    var shareInviteId = "";
    var shareProjectId = "";
    var fidelityCardId = "";
    var shoppingListId = "";
    var debtCreditId = "";
    var goalId = "";
    var widgetSettingsType = "";
    try {
      var parsed = new URL(
        raw,
        window && window.location ? window.location.origin : SHARE_WEB_APP_URL
      );
      shareInviteId =
        parsed.searchParams.get("shareInvite") ||
        parsed.searchParams.get("invite") ||
        "";
      shareProjectId =
        parsed.searchParams.get("shareProject") ||
        parsed.searchParams.get("project") ||
        "";
      fidelityCardId =
        parsed.searchParams.get("cardId") ||
        parsed.searchParams.get("card") ||
        "";
      shoppingListId =
        parsed.searchParams.get("listId") ||
        parsed.searchParams.get("list") ||
        "";
      debtCreditId =
        parsed.searchParams.get("debtId") ||
        parsed.searchParams.get("debt") ||
        parsed.searchParams.get("creditId") ||
        parsed.searchParams.get("credit") ||
        "";
      goalId =
        parsed.searchParams.get("goalId") ||
        parsed.searchParams.get("goal") ||
        "";
      widgetSettingsType =
        parsed.searchParams.get("widget") ||
        parsed.searchParams.get("type") ||
        "";
    } catch (e) {
      var im = raw.match(/[?&](?:shareInvite|invite)=([^&]+)/);
      var pm = raw.match(/[?&](?:shareProject|project)=([^&]+)/);
      var cm = raw.match(/[?&](?:cardId|card)=([^&]+)/);
      var lm = raw.match(/[?&](?:listId|list)=([^&]+)/);
      var dm = raw.match(/[?&](?:debtId|debt|creditId|credit)=([^&]+)/);
      var gm = raw.match(/[?&](?:goalId|goal)=([^&]+)/);
      var wm = raw.match(/[?&](?:widget|type)=([^&]+)/);
      shareInviteId = im ? decodeURIComponent(im[1]) : "";
      shareProjectId = pm ? decodeURIComponent(pm[1]) : "";
      fidelityCardId = cm ? decodeURIComponent(cm[1]) : "";
      shoppingListId = lm ? decodeURIComponent(lm[1]) : "";
      debtCreditId = dm ? decodeURIComponent(dm[1]) : "";
      goalId = gm ? decodeURIComponent(gm[1]) : "";
      widgetSettingsType = wm ? decodeURIComponent(wm[1]) : "";
    }
    function dispatchWidgetEvent(eventName, detail) {
      [80, 240, 650, 1200, 2000].forEach(function (ms) {
        setTimeout(function () {
          try {
            window.dispatchEvent(
              new CustomEvent(eventName, { detail: detail || {} })
            );
          } catch (e) {}
        }, ms);
      });
    }
    if (
      url.indexOf("open-plan-info") >= 0 ||
      url.indexOf("open-info") >= 0 ||
      url.indexOf("plan-info") >= 0
    ) {
      openPlanInfo();
      return;
    }
    if (
      url.indexOf("open-ai-assistant") >= 0 ||
      url.indexOf("widget-ai-voice") >= 0
    ) {
      setTab("consulenteAI");
      setAiTab("consigli");
      setSettingsPage(null);
      setMobileMenu(false);
      setTimeout(function () {
        openVoiceModal(true, true);
      }, 80);
      return;
    }
    if (
      url.indexOf("open-receipt-camera") >= 0 ||
      url.indexOf("receipt-camera") >= 0
    ) {
      try {
        localStorage.setItem("fainance_receipt_auto_camera_once", "1");
      } catch (e) {}
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("expense");
      setAddSubTab("receipt");
      setSettingsPage(null);
      setMobileMenu(false);
      try {
        setTimeout(function () {
          window.dispatchEvent(new CustomEvent("fainance-open-receipt-camera"));
        }, 120);
        setTimeout(function () {
          window.dispatchEvent(new CustomEvent("fainance-open-receipt-camera"));
        }, 520);
        setTimeout(function () {
          window.dispatchEvent(new CustomEvent("fainance-open-receipt-camera"));
        }, 1200);
      } catch (e) {}
      return;
    }
    if (url.indexOf("share-voice") >= 0) {
      if (shareProjectId) setShareSelectedProjectId(String(shareProjectId));
      try {
        localStorage.setItem(
          "fainance_voice_share_context_v1",
          JSON.stringify({
            projectId: String(shareProjectId || ""),
            ts: Date.now(),
          })
        );
      } catch (e) {}
      setTab("consulenteAI");
      setAiTab("consigli");
      setSettingsPage(null);
      setMobileMenu(false);
      setTimeout(function () {
        openVoiceModal(true, true);
      }, 80);
      return;
    }
    if (
      url.indexOf("share-add-expense") >= 0 ||
      url.indexOf("share-add-income") >= 0 ||
      url.indexOf("share-receipt") >= 0
    ) {
      var shareMode =
        url.indexOf("share-receipt") >= 0
          ? "receipt"
          : url.indexOf("share-add-income") >= 0
          ? "income"
          : "simple";
      setTab("share");
      setSettingsPage(null);
      setMobileMenu(false);
      setShareProjectTab("attivita");
      if (shareProjectId) setShareSelectedProjectId(String(shareProjectId));
      try {
        localStorage.setItem("fainance_share_open_expense_mode", shareMode);
        localStorage.setItem(
          "fainance_share_widget_action_v1",
          JSON.stringify({
            mode: shareMode,
            projectId: String(shareProjectId || ""),
            ts: Date.now(),
          })
        );
      } catch (e) {}
      dispatchWidgetEvent("fainance-open-share-expense", {
        mode: shareMode,
        projectId: String(shareProjectId || ""),
      });
      return;
    }
    if (
      url.indexOf("open-receipt") >= 0 ||
      url.indexOf("receipt") >= 0 ||
      url.indexOf("scontrino") >= 0
    ) {
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("expense");
      setAddSubTab("receipt");
      setSettingsPage(null);
      setMobileMenu(false);
      return;
    }
    if (url.indexOf("open-fidelity-card") >= 0) {
      setTab("shopping");
      setSettingsPage(null);
      setMobileMenu(false);
      try {
        localStorage.setItem(userKey("shopping_active_tab_v1"), "cards");
        localStorage.setItem(
          "fainance_shopping_widget_action_v1",
          JSON.stringify({
            tab: "cards",
            cardId: String(fidelityCardId || ""),
            ts: Date.now(),
          })
        );
      } catch (e) {}
      dispatchWidgetEvent("fainance-open-shopping-widget", {
        tab: "cards",
        cardId: String(fidelityCardId || ""),
      });
      return;
    }
    if (url.indexOf("open-shopping-list") >= 0) {
      setTab("shopping");
      setSettingsPage(null);
      setMobileMenu(false);
      try {
        localStorage.setItem(userKey("shopping_active_tab_v1"), "list");
        localStorage.setItem(
          "fainance_shopping_widget_action_v1",
          JSON.stringify({
            tab: "list",
            listId: String(shoppingListId || ""),
            ts: Date.now(),
          })
        );
      } catch (e) {}
      dispatchWidgetEvent("fainance-open-shopping-widget", {
        tab: "list",
        listId: String(shoppingListId || ""),
      });
      return;
    }
    if (url.indexOf("open-shopping") >= 0) {
      setTab("shopping");
      setSettingsPage(null);
      setMobileMenu(false);
      return;
    }
    if (url.indexOf("open-debt-credits") >= 0) {
      setTab("debtCredits");
      setSettingsPage(null);
      setMobileMenu(false);
      return;
    }
    if (url.indexOf("open-debt-credit") >= 0) {
      setTab("debtCredits");
      setSettingsPage(null);
      setMobileMenu(false);
      try {
        localStorage.setItem(
          "fainance_debt_credit_open_id_v1",
          String(debtCreditId || "")
        );
      } catch (e) {}
      try {
        sessionStorage.setItem(
          "fainance_debt_credit_open_id_v1",
          String(debtCreditId || "")
        );
      } catch (e) {}
      dispatchWidgetEvent("fainance-open-debt-credit", {
        debtCreditId: String(debtCreditId || ""),
      });
      return;
    }
    if (url.indexOf("share-activity") >= 0) {
      setTab("share");
      setSettingsPage(null);
      setMobileMenu(false);
      setShareProjectTab("attivita");
      if (shareProjectId) setShareSelectedProjectId(String(shareProjectId));
      return;
    }
    if (
      shareInviteId ||
      shareProjectId ||
      url.indexOf("/share") >= 0 ||
      url.indexOf("open-share") >= 0
    ) {
      setTab("share");
      setSettingsPage(null);
      setMobileMenu(false);
      setShareProjectTab("attivita");
      if (shareProjectId) setShareSelectedProjectId(String(shareProjectId));
      return;
    }
    if (url.indexOf("open-quick-add") >= 0) {
      setTab("spese");
      setSpeseSubTab("add");
      setAddSubTab("single");
      setSettingsPage(null);
      setMobileMenu(false);
      return;
    }
    if (url.indexOf("add-expense") >= 0) {
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("expense");
      setAddSubTab("single");
      setSettingsPage(null);
      setMobileMenu(false);
    }
    if (url.indexOf("add-income") >= 0) {
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("income");
      setAddSubTab("single");
      setSettingsPage(null);
      setMobileMenu(false);
    }
    if (url.indexOf("widget-settings") >= 0) {
      var widgetPageMap = {
        quick: "appearance_widget_quick",
        note: "appearance_widget_note",
        goal: "appearance_widget_goal",
        shoppinglist: "appearance_widget_shopping_list",
        shopping_list: "appearance_widget_shopping_list",
        fidelity: "appearance_widget_fidelity",
        debtcredits: "appearance_widget_debt_credits",
        debt_credits: "appearance_widget_debt_credits",
        share: "appearance_widget_share",
      };
      var normalizedWidgetType = String(widgetSettingsType || "")
        .replace(/[^a-zA-Z_]/g, "")
        .toLowerCase();
      setTab("settings");
      setSettingsPage(
        widgetPageMap[normalizedWidgetType] || "appearance_widget"
      );
      setMobileMenu(false);
      return;
    }
    if (url.indexOf("open-plans") >= 0) {
      setTab("settings");
      setSettingsPage("plans_settings");
      setMobileMenu(false);
      setToast({
        text: translateUiRuntimeText(
          "L’assistente vocale è disponibile dal piano Base."
        ),
        type: "warning",
        color: "#EF9F27",
        icon: "🔒",
      });
    }
    if (
      url.indexOf("open-voice") >= 0 ||
      url.indexOf("voice-entry") >= 0 ||
      url.indexOf("add-voice") >= 0
    ) {
      setTab("voice");
      setSettingsPage(null);
      setMobileMenu(false);
      setTimeout(function () {
        openVoiceModal(true, true);
      }, 80);
    }
    if (url.indexOf("open-appunti") >= 0) {
      setTab("appunti");
      setSettingsPage(null);
      setMobileMenu(false);
    }
    if (url.indexOf("open-goal") >= 0 && url.indexOf("open-goals") < 0) {
      setTab("goals");
      setSettingsPage(null);
      setMobileMenu(false);
      try {
        localStorage.setItem(
          "fainance_goal_widget_action_v1",
          JSON.stringify({ goalId: String(goalId || ""), ts: Date.now() })
        );
      } catch (e) {}
      dispatchWidgetEvent("fainance-open-goal", {
        goalId: String(goalId || ""),
      });
      return;
    }
    if (
      url.indexOf("open-goals") >= 0 ||
      url.indexOf("add-goal-progress") >= 0
    ) {
      setTab("goals");
      setSettingsPage(null);
      setMobileMenu(false);
    }
  }

  useEffect(function () {
    var removeListener = null;
    var cancelled = false;
    var lastWidgetRoute = "";
    var lastWidgetRouteAt = 0;
    function onWidgetRoute(event) {
      try {
        var route =
          event && event.detail && event.detail.url
            ? String(event.detail.url)
            : "";
        var now = Date.now();
        if (
          !route ||
          (route === lastWidgetRoute && now - lastWidgetRouteAt < 4000)
        )
          return;
        lastWidgetRoute = route;
        lastWidgetRouteAt = now;
        openQuickAddFromUrl(route);
      } catch (e) {}
    }
    try {
      window.addEventListener("fainance-widget-route", onWidgetRoute);
    } catch (e) {}
    try {
      var pendingWidgetRoute =
        localStorage.getItem("fainance_pending_widget_route_v1") ||
        String(window.__fainancePendingWidgetRoute || "");
      if (pendingWidgetRoute) {
        localStorage.removeItem("fainance_pending_widget_route_v1");
        window.__fainancePendingWidgetRoute = "";
        setTimeout(function () {
          openQuickAddFromUrl(pendingWidgetRoute);
        }, 120);
      }
    } catch (e) {}

    if (
      window &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform &&
      window.Capacitor.isNativePlatform()
    ) {
      import("@capacitor/app")
        .then(function (mod) {
          if (cancelled) return;
          var CapApp = mod.App;
          if (!CapApp) return;

          CapApp.getLaunchUrl()
            .then(function (result) {
              if (result && result.url) openQuickAddFromUrl(result.url);
            })
            .catch(function () {});

          CapApp.addListener("appUrlOpen", function (event) {
            if (event && event.url) openQuickAddFromUrl(event.url);
          })
            .then(function (listener) {
              removeListener = listener;
            })
            .catch(function () {});
        })
        .catch(function () {});
    } else {
      openQuickAddFromUrl(window.location.href);
    }

    return function () {
      cancelled = true;
      try {
        window.removeEventListener("fainance-widget-route", onWidgetRoute);
      } catch (e) {}
      if (removeListener && removeListener.remove) removeListener.remove();
    };
  }, []);
  var [historyTab, setHistoryTab] = useState("all");
  var [filterYear, setFilterYear] = useState("all");
  var [filterMonth, setFilterMonth] = useState("");
  var [shareSelectedProjectId, setShareSelectedProjectId] = useState(null);
  var [shareProjectTab, setShareProjectTab] = useState("attivita");
  useEffect(function () {
    var remove: any = null;
    var active = true;
    function validShareReceiptFlow(flow: any) {
      if (!flow || !flow.projectId) return false;
      var ts = Number(flow.ts || 0);
      if (ts && Date.now() - ts > 1000 * 60 * 30) {
        try {
          localStorage.removeItem("fainance_share_receipt_flow_v2");
        } catch (e) {}
        return false;
      }
      return true;
    }
    function routePendingShareReceipt(payload?: any) {
      try {
        var raw = localStorage.getItem("fainance_share_receipt_flow_v2");
        if (!raw) return;
        var flow = JSON.parse(raw || "{}");
        if (!validShareReceiptFlow(flow)) return;
        if (flow && flow.projectId)
          setShareSelectedProjectId(String(flow.projectId));
        setTab("share");
        setSettingsPage(null);
        setMobileMenu(false);
        setShareProjectTab("attivita");
        if (payload && payload.image) {
          (window as any).__fainanceShareReceiptRestored = {
            image: payload && payload.image,
            flow: flow,
            ts: Date.now(),
          };
          [120, 450, 1000, 1800].forEach(function (ms) {
            setTimeout(function () {
              try {
                window.dispatchEvent(
                  new CustomEvent("fainance-share-receipt-restored", {
                    detail: (window as any).__fainanceShareReceiptRestored,
                  })
                );
              } catch (e) {}
            }, ms);
          });
        } else {
          [120, 450, 1000, 1800].forEach(function (ms) {
            setTimeout(function () {
              try {
                window.dispatchEvent(
                  new CustomEvent("fainance-share-receipt-fallback", {
                    detail: { flow: flow, ts: Date.now() },
                  })
                );
              } catch (e) {}
            }, ms);
          });
        }
      } catch (e) {}
    }
    function routeFromStorage() {
      routePendingShareReceipt();
    }
    setTimeout(routeFromStorage, 120);
    setTimeout(routeFromStorage, 700);
    try {
      window.addEventListener("focus", routeFromStorage);
      document.addEventListener("visibilitychange", routeFromStorage);
    } catch (e) {}
    if (
      window &&
      window.Capacitor &&
      window.Capacitor.isNativePlatform &&
      window.Capacitor.isNativePlatform()
    ) {
      import("@capacitor/app")
        .then(function (mod: any) {
          if (!active) return;
          var CapApp = mod.App || mod.default || mod;
          if (!CapApp || !CapApp.addListener) return;
          CapApp.addListener("appRestoredResult", function (ev: any) {
            try {
              var raw = localStorage.getItem("fainance_share_receipt_flow_v2");
              if (!raw) return;
              var data = (ev && ev.data) || {};
              var img = data.dataUrl || data.webPath || "";
              if (img) routePendingShareReceipt({ image: img });
              else routePendingShareReceipt();
            } catch (e) {}
          })
            .then(function (listener: any) {
              remove = listener;
            })
            .catch(function () {});
          CapApp.addListener &&
            CapApp.addListener("appStateChange", function (state: any) {
              try {
                if (state && state.isActive) routePendingShareReceipt();
              } catch (e) {}
            }).catch(function () {});
        })
        .catch(function () {});
    }
    return function () {
      active = false;
      try {
        window.removeEventListener("focus", routeFromStorage);
        document.removeEventListener("visibilitychange", routeFromStorage);
      } catch (e) {}
      try {
        if (remove && remove.remove) remove.remove();
      } catch (e) {}
    };
  }, []);
  var [mergeFrom, setMergeFrom] = useState("");
  var [mergeTo, setMergeTo] = useState("");
  var [mobileMenu, setMobileMenu] = useState(false);
  var [nativeBannerSuppressed, setNativeBannerSuppressed] = useState(false);
  useEffect(
    function () {
      if (!mobileMenu) return;
      setNativeBannerSuppressed(true);
      try {
        var ads = nativePlugin("FainanceAds");
        if (ads && ads.hideBanner) ads.hideBanner({});
      } catch (e) {}
      return function () {
        setNativeBannerSuppressed(false);
      };
    },
    [mobileMenu]
  );
  var [settingsValuesTab, setSettingsValuesTab] = useState("cats");
  var [defaultExpenseArea, setDefaultExpenseAreaRaw] = useStorage(
    userKey("default_expense_area_v1"),
    "vita"
  );
  function setDefaultExpenseArea(value) {
    markCategoryPreferencesChange();
    var next = String(
      typeof value === "function" ? value(defaultExpenseArea) : value || "vita"
    );
    queueWebCategoryPreferencePatch({ defaultExpenseArea: next });
    return setDefaultExpenseAreaRaw(next);
  }
  var [defaultExpenseCat, setDefaultExpenseCatRaw] = useStorage(
    userKey("default_expense_cat_v1"),
    "4"
  );
  function setDefaultExpenseCat(value) {
    markCategoryPreferencesChange();
    var next = String(
      typeof value === "function" ? value(defaultExpenseCat) : value || ""
    );
    queueWebCategoryPreferencePatch({ defaultExpenseCat: next });
    return setDefaultExpenseCatRaw(next);
  }
  var [defaultExpenseMethod, setDefaultExpenseMethodRaw] = useStorage(
    userKey("default_expense_method_v1"),
    "8"
  );
  function setDefaultExpenseMethod(value) {
    markCategoryPreferencesChange();
    var next = String(
      typeof value === "function" ? value(defaultExpenseMethod) : value || ""
    );
    queueWebCategoryPreferencePatch({ defaultExpenseMethod: next });
    return setDefaultExpenseMethodRaw(next);
  }
  var [defaultIncomeArea, setDefaultIncomeAreaRaw] = useStorage(
    userKey("default_income_area_v1"),
    "lavoro"
  );
  function setDefaultIncomeArea(value) {
    markCategoryPreferencesChange();
    var next = String(
      typeof value === "function" ? value(defaultIncomeArea) : value || "lavoro"
    );
    queueWebCategoryPreferencePatch({ defaultIncomeArea: next });
    return setDefaultIncomeAreaRaw(next);
  }
  var [defaultIncomeType, setDefaultIncomeTypeRaw] = useStorage(
    userKey("default_income_type_v1"),
    "salario"
  );
  function setDefaultIncomeType(value) {
    markCategoryPreferencesChange();
    var next = String(
      typeof value === "function" ? value(defaultIncomeType) : value || ""
    );
    queueWebCategoryPreferencePatch({ defaultIncomeType: next });
    return setDefaultIncomeTypeRaw(next);
  }
  var [defaultMethodArea, setDefaultMethodAreaRaw] = useStorage(
    userKey("default_method_area_v1"),
    "conti_carte"
  );
  function setDefaultMethodArea(value) {
    markCategoryPreferencesChange();
    var next = String(
      typeof value === "function"
        ? value(defaultMethodArea)
        : value || "conti_carte"
    );
    queueWebCategoryPreferencePatch({ defaultMethodArea: next });
    return setDefaultMethodAreaRaw(next);
  }
  var [incomeTypeOrder, setIncomeTypeOrderRaw] = useStorage(
    userKey("income_type_order_v1"),
    []
  );
  function setIncomeTypeOrder(value) {
    markCategoryPreferencesChange();
    var next =
      typeof value === "function" ? value(incomeTypeOrder || []) : value;
    next = Array.isArray(next) ? next.map(String) : [];
    queueWebCategoryPreferencePatch({ incomeTypeOrder: next });
    return setIncomeTypeOrderRaw(next);
  }
  var [isMobile, setIsMobile] = useState(true);
  var [searchQuery, setSearchQuery] = useState("");
  var historySearchDraftRef = useRef("");
  var [filterCat, setFilterCat] = useState("all");
  var [filterCats, setFilterCats] = useState([]);
  var [filterCatExclude, setFilterCatExclude] = useState(false);
  var [filterMethods, setFilterMethods] = useState([]);
  var [filterAreaPersonal, setFilterAreaPersonal] = useState(true);
  var [filterAreaShare, setFilterAreaShare] = useState(true);
  var [filterMonths, setFilterMonths] = useState([]);
  var [filterGroup, setFilterGroup] = useState("all");
  var [filterDateFrom, setFilterDateFrom] = useState("");
  var [filterDateTo, setFilterDateTo] = useState("");
  var [filterAmtMin, setFilterAmtMin] = useState("");
  var [filterAmtMax, setFilterAmtMax] = useState("");
  var [showFilters, setShowFilters] = useState(false);
  var [editingItem, setEditingItem] = useState(null);
  var [deleteConfirmId, setDeleteConfirmId] = useState(null);
  var [alertPopup, setAlertPopup] = useState(null); // holds array of NEW alerts to show
  var [shownAlertIds, setShownAlertIds] = useStorage(
    userKey("shown_alert_ids_v2"),
    []
  ); // alert keys already acknowledged
  // Toast state is isolated in GlobalToastHost to preserve every open form.
  var [appUpdatePopup, setAppUpdatePopup] = useState<any>(null);
  var [appUpdateManualStatus, setAppUpdateManualStatus] = useState<any>(null);
  var [installedAppInfo, setInstalledAppInfo] = useState<any>({
    version: "1.4.1",
    code: 175,
    platform: "web",
  });
  var appUpdateStoreCacheRef = useRef<any>({});
  var appUpdateCheckPromiseRef = useRef<any>(null);
  function buildRuntimeTranslationMap() {
    var current = TRANSLATIONS[lang] || TRANSLATIONS.it || {};
    var map = { ...(current || {}) };
    var runtimeAliasBlock = {
      Gen: 1,
      Jan: 1,
      Ene: 1,
      "Janv.": 1,
      Feb: 1,
      "Févr.": 1,
      Mar: 1,
      Mars: 1,
      März: 1,
      Apr: 1,
      Abr: 1,
      "Avr.": 1,
      Mag: 1,
      May: 1,
      Mai: 1,
      Giu: 1,
      Jun: 1,
      Juin: 1,
      Lug: 1,
      Jul: 1,
      "Juil.": 1,
      Ago: 1,
      Aug: 1,
      Août: 1,
      Set: 1,
      Sep: 1,
      "Sept.": 1,
      Ott: 1,
      Oct: 1,
      Okt: 1,
      Out: 1,
      Nov: 1,
      Dic: 1,
      Dec: 1,
      Dez: 1,
      Sty: 1,
      Lut: 1,
      Kwi: 1,
      Maj: 1,
      Cze: 1,
      Lip: 1,
      Sie: 1,
      Wrz: 1,
      Paź: 1,
      Paz: 1,
      Lis: 1,
      Gru: 1,
      Mrt: 1,
      Mei: 1,
      Ian: 1,
      Iun: 1,
      Iul: 1,
      Ιαν: 1,
      Φεβ: 1,
      Μαρ: 1,
      Απρ: 1,
      Μαι: 1,
      Ιουν: 1,
      Ιουλ: 1,
      Αυγ: 1,
      Σεπ: 1,
      Οκτ: 1,
      Νοε: 1,
      Δεκ: 1,
      Android: 1,
      iOS: 1,
      Web: 1,
      localStorage: 1,
    };
    try {
      Object.keys(TRANSLATIONS || {}).forEach(function (code) {
        var src = TRANSLATIONS[code] || {};
        Object.keys(src).forEach(function (k) {
          var target = current[k];
          var sourceVal = src[k];
          if (
            typeof target === "string" &&
            typeof sourceVal === "string" &&
            sourceVal
          ) {
            if (runtimeAliasBlock[sourceVal] || runtimeAliasBlock[k]) return;
            if (map[sourceVal] === undefined) map[sourceVal] = target;
          }
        });
      });
    } catch (e) {}
    return map;
  }
  var runtimeTranslationMap = useMemo(
    function () {
      return buildRuntimeTranslationMap();
    },
    [lang]
  );
  var runtimeTranslationKeys = useMemo(
    function () {
      return Object.keys(runtimeTranslationMap || {})
        .filter(function (k) {
          return (
            k &&
            typeof runtimeTranslationMap[k] === "string" &&
            k !== runtimeTranslationMap[k] &&
            k.length >= 4
          );
        })
        .sort(function (a, b) {
          return b.length - a.length;
        });
    },
    [runtimeTranslationMap]
  );
  function translateCriticalUiText(value, code) {
    var raw = String(value == null ? "" : value);
    var k = raw.trim();
    if (!k) return raw;
    var D = {
      "Riepilogo alto, numero icone e ordine delle sezioni": {
        en: "Top summary, number of icons and section order",
        es: "Resumen superior, número de iconos y orden de secciones",
        fr: "Résumé supérieur, nombre d’icônes et ordre des sections",
        de: "Obere Zusammenfassung, Anzahl der Symbole und Reihenfolge der Bereiche",
        pt: "Resumo superior, número de ícones e ordem das secções",
        pl: "Górne podsumowanie, liczba ikon i kolejność sekcji",
        nl: "Bovenste samenvatting, aantal pictogrammen en volgorde van secties",
        ro: "Rezumat superior, număr de pictograme și ordinea secțiunilor",
        el: "Πάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων",
      },
      "Top summary, number of icons and section order": {
        en: "Top summary, number of icons and section order",
        es: "Resumen superior, número de iconos y orden de secciones",
        fr: "Résumé supérieur, nombre d’icônes et ordre des sections",
        de: "Obere Zusammenfassung, Anzahl der Symbole und Reihenfolge der Bereiche",
        pt: "Resumo superior, número de ícones e ordem das secções",
        pl: "Górne podsumowanie, liczba ikon i kolejność sekcji",
        nl: "Bovenste samenvatting, aantal pictogrammen en volgorde van secties",
        ro: "Rezumat superior, număr de pictograme și ordinea secțiunilor",
        el: "Πάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων",
      },
      "Colore + Spesa": {
        en: "Expense button color",
        es: "Color del botón de gasto",
        fr: "Couleur du bouton de dépense",
        de: "Farbe der Ausgaben-Schaltfläche",
        pt: "Cor do botão de despesa",
        pl: "Kolor przycisku wydatku",
        nl: "Kleur van de uitgavenknop",
        ro: "Culoarea butonului de cheltuială",
        el: "Χρώμα κουμπιού εξόδου",
      },
      "Color + Expense": {
        en: "Expense button color",
        es: "Color del botón de gasto",
        fr: "Couleur du bouton de dépense",
        de: "Farbe der Ausgaben-Schaltfläche",
        pt: "Cor do botão de despesa",
        pl: "Kolor przycisku wydatku",
        nl: "Kleur van de uitgavenknop",
        ro: "Culoarea butonului de cheltuială",
        el: "Χρώμα κουμπιού εξόδου",
      },
      "Color + Uitgave": {
        en: "Expense button color",
        es: "Color del botón de gasto",
        fr: "Couleur du bouton de dépense",
        de: "Farbe der Ausgaben-Schaltfläche",
        pt: "Cor do botão de despesa",
        pl: "Kolor przycisku wydatku",
        nl: "Kleur van de uitgavenknop",
        ro: "Culoarea butonului de cheltuială",
        el: "Χρώμα κουμπιού εξόδου",
      },
      "Colore Attività": {
        en: "Activity color",
        es: "Color de actividad",
        fr: "Couleur de l’activité",
        de: "Aktivitätsfarbe",
        pt: "Cor da atividade",
        pl: "Kolor aktywności",
        nl: "Activiteitskleur",
        ro: "Culoarea activității",
        el: "Χρώμα δραστηριότητας",
      },
      "Activity color": {
        en: "Activity color",
        es: "Color de actividad",
        fr: "Couleur de l’activité",
        de: "Aktivitätsfarbe",
        pt: "Cor da atividade",
        pl: "Kolor aktywności",
        nl: "Activiteitskleur",
        ro: "Culoarea activității",
        el: "Χρώμα δραστηριότητας",
      },
      "Colore titolo": {
        en: "Title color",
        es: "Color del título",
        fr: "Couleur du titre",
        de: "Titelfarbe",
        pt: "Cor do título",
        pl: "Kolor tytułu",
        nl: "Titelkleur",
        ro: "Culoarea titlului",
        el: "Χρώμα τίτλου",
      },
      "Title color": {
        en: "Title color",
        es: "Color del título",
        fr: "Couleur du titre",
        de: "Titelfarbe",
        pt: "Cor do título",
        pl: "Kolor tytułu",
        nl: "Titelkleur",
        ro: "Culoarea titlului",
        el: "Χρώμα τίτλου",
      },
      "Colore testi secondari": {
        en: "Secondary text color",
        es: "Color del texto secundario",
        fr: "Couleur du texte secondaire",
        de: "Farbe des sekundären Textes",
        pt: "Cor do texto secundário",
        pl: "Kolor tekstu dodatkowego",
        nl: "Kleur van secundaire tekst",
        ro: "Culoarea textului secundar",
        el: "Χρώμα δευτερεύοντος κειμένου",
      },
      "Secondary text color": {
        en: "Secondary text color",
        es: "Color del texto secundario",
        fr: "Couleur du texte secondaire",
        de: "Farbe des sekundären Textes",
        pt: "Cor do texto secundário",
        pl: "Kolor tekstu dodatkowego",
        nl: "Kleur van secundaire tekst",
        ro: "Culoarea textului secundar",
        el: "Χρώμα δευτερεύοντος κειμένου",
      },
      "Progetto mostrato nel widget": {
        en: "Project shown in the widget",
        es: "Proyecto mostrado en el widget",
        fr: "Projet affiché dans le widget",
        de: "Im Widget angezeigtes Projekt",
        pt: "Projeto mostrado no widget",
        pl: "Projekt pokazany w widżecie",
        nl: "Project dat in de widget wordt getoond",
        ro: "Proiect afișat în widget",
        el: "Έργο που εμφανίζεται στο widget",
      },
      "Project shown in the widget": {
        en: "Project shown in the widget",
        es: "Proyecto mostrado en el widget",
        fr: "Projet affiché dans le widget",
        de: "Im Widget angezeigtes Projekt",
        pt: "Projeto mostrado no widget",
        pl: "Projekt pokazany w widżecie",
        nl: "Project dat in de widget wordt getoond",
        ro: "Proiect afișat în widget",
        el: "Έργο που εμφανίζεται στο widget",
      },
      "Scegli il progetto predefinito. Ogni singolo widget potrà comunque essere configurato con un progetto diverso.":
        {
          en: "Choose the default project. Each individual widget can still be configured with a different project.",
          es: "Elige el proyecto predeterminado. Cada widget individual puede configurarse con un proyecto distinto.",
          fr: "Choisis le projet par défaut. Chaque widget individuel peut quand même être configuré avec un projet différent.",
          de: "Wähle das Standardprojekt. Jedes einzelne Widget kann weiterhin mit einem anderen Projekt konfiguriert werden.",
          pt: "Escolhe o projeto predefinido. Cada widget individual ainda pode ser configurado com um projeto diferente.",
          pl: "Wybierz projekt domyślny. Każdy pojedynczy widżet nadal można skonfigurować z innym projektem.",
          nl: "Kies het standaardproject. Elke afzonderlijke widget kan nog steeds met een ander project worden ingesteld.",
          ro: "Alege proiectul implicit. Fiecare widget poate fi configurat totuși cu un proiect diferit.",
          el: "Επίλεξε το προεπιλεγμένο έργο. Κάθε μεμονωμένο widget μπορεί ακόμη να ρυθμιστεί με διαφορετικό έργο.",
        },
      "Choose the default project. Each individual widget can still be configured with a different project.":
        {
          en: "Choose the default project. Each individual widget can still be configured with a different project.",
          es: "Elige el proyecto predeterminado. Cada widget individual puede configurarse con un proyecto distinto.",
          fr: "Choisis le projet par défaut. Chaque widget individuel peut quand même être configuré avec un projet différent.",
          de: "Wähle das Standardprojekt. Jedes einzelne Widget kann weiterhin mit einem anderen Projekt konfiguriert werden.",
          pt: "Escolhe o projeto predefinido. Cada widget individual ainda pode ser configurado com um projeto diferente.",
          pl: "Wybierz projekt domyślny. Każdy pojedynczy widżet nadal można skonfigurować z innym projektem.",
          nl: "Kies het standaardproject. Elke afzonderlijke widget kan nog steeds met een ander project worden ingesteld.",
          ro: "Alege proiectul implicit. Fiecare widget poate fi configurat totuși cu un proiect diferit.",
          el: "Επίλεξε το προεπιλεγμένο έργο. Κάθε μεμονωμένο widget μπορεί ακόμη να ρυθμιστεί με διαφορετικό έργο.",
        },
      "Primo progetto disponibile": {
        en: "First available project",
        es: "Primer proyecto disponible",
        fr: "Premier projet disponible",
        de: "Erstes verfügbares Projekt",
        pt: "Primeiro projeto disponível",
        pl: "Pierwszy dostępny projekt",
        nl: "Eerste beschikbare project",
        ro: "Primul proiect disponibil",
        el: "Πρώτο διαθέσιμο έργο",
      },
      "First available project": {
        en: "First available project",
        es: "Primer proyecto disponible",
        fr: "Premier projet disponible",
        de: "Erstes verfügbares Projekt",
        pt: "Primeiro projeto disponível",
        pl: "Pierwszy dostępny projekt",
        nl: "Eerste beschikbare project",
        ro: "Primul proiect disponibil",
        el: "Πρώτο διαθέσιμο έργο",
      },
      "Salva e aggiorna widget": {
        en: "Save and update widget",
        es: "Guardar y actualizar widget",
        fr: "Enregistrer et mettre à jour le widget",
        de: "Widget speichern und aktualisieren",
        pt: "Guardar e atualizar widget",
        pl: "Zapisz i zaktualizuj widżet",
        nl: "Widget opslaan en bijwerken",
        ro: "Salvează și actualizează widgetul",
        el: "Αποθήκευση και ενημέρωση widget",
      },
      "Save and update widget": {
        en: "Save and update widget",
        es: "Guardar y actualizar widget",
        fr: "Enregistrer et mettre à jour le widget",
        de: "Widget speichern und aktualisieren",
        pt: "Guardar e atualizar widget",
        pl: "Zapisz i zaktualizuj widżet",
        nl: "Widget opslaan en bijwerken",
        ro: "Salvează și actualizează widgetul",
        el: "Αποθήκευση και ενημέρωση widget",
      },
      "Aggiornamento automatico": {
        en: "Automatic update",
        es: "Actualización automática",
        fr: "Mise à jour automatique",
        de: "Automatische Aktualisierung",
        pt: "Atualização automática",
        pl: "Automatyczna aktualizacja",
        nl: "Automatische update",
        ro: "Actualizare automată",
        el: "Αυτόματη ενημέρωση",
      },
      "Automatic update": {
        en: "Automatic update",
        es: "Actualización automática",
        fr: "Mise à jour automatique",
        de: "Automatische Aktualisierung",
        pt: "Atualização automática",
        pl: "Automatyczna aktualizacja",
        nl: "Automatische update",
        ro: "Actualizare automată",
        el: "Αυτόματη ενημέρωση",
      },
      Saldo: {
        en: "Balance",
        es: "Saldo",
        fr: "Solde",
        de: "Kontostand",
        pt: "Saldo",
        pl: "Saldo",
        nl: "Balans",
        ro: "Sold",
        el: "Υπόλοιπο",
      },
      Balance: {
        en: "Balance",
        es: "Saldo",
        fr: "Solde",
        de: "Kontostand",
        pt: "Saldo",
        pl: "Saldo",
        nl: "Balans",
        ro: "Sold",
        el: "Υπόλοιπο",
      },
      Spesa: {
        en: "Expense",
        es: "Gasto",
        fr: "Dépense",
        de: "Ausgabe",
        pt: "Despesa",
        pl: "Wydatek",
        nl: "Uitgave",
        ro: "Cheltuială",
        el: "Έξοδο",
      },
      "+ Spesa": {
        en: "+ Expense",
        es: "+ Gasto",
        fr: "+ Dépense",
        de: "+ Ausgabe",
        pt: "+ Despesa",
        pl: "+ Wydatek",
        nl: "+ Uitgave",
        ro: "+ Cheltuială",
        el: "+ Έξοδο",
      },
      "+ Expense": {
        en: "+ Expense",
        es: "+ Gasto",
        fr: "+ Dépense",
        de: "+ Ausgabe",
        pt: "+ Despesa",
        pl: "+ Wydatek",
        nl: "+ Uitgave",
        ro: "+ Cheltuială",
        el: "+ Έξοδο",
      },
      Attività: {
        en: "Activity",
        es: "Actividad",
        fr: "Activité",
        de: "Aktivität",
        pt: "Atividade",
        pl: "Aktywność",
        nl: "Activiteit",
        ro: "Activitate",
        el: "Δραστηριότητα",
      },
      Activity: {
        en: "Activity",
        es: "Actividad",
        fr: "Activité",
        de: "Aktivität",
        pt: "Atividade",
        pl: "Aktywność",
        nl: "Activiteit",
        ro: "Activitate",
        el: "Δραστηριότητα",
      },
      Sfondo: {
        en: "Background",
        es: "Fondo",
        fr: "Arrière-plan",
        de: "Hintergrund",
        pt: "Fundo",
        pl: "Tło",
        nl: "Achtergrond",
        ro: "Fundal",
        el: "Φόντο",
      },
      Background: {
        en: "Background",
        es: "Fondo",
        fr: "Arrière-plan",
        de: "Hintergrund",
        pt: "Fundo",
        pl: "Tło",
        nl: "Achtergrond",
        ro: "Fundal",
        el: "Φόντο",
      },
      "Questo widget mostra sulla Home il riepilogo di un progetto Share: saldo personale, quanto devi, quanto ti devono e ultima attività. Il progetto può essere scelto qui come default e anche dal tasto di configurazione quando aggiungi il widget.":
        {
          en: "This widget shows a Share project summary on the Home screen: personal balance, what you owe, what others owe you and the latest activity. The project can be selected here as default and also from the configuration button when you add the widget.",
          es: "Este widget muestra en la pantalla de inicio el resumen de un proyecto Share: saldo personal, cuánto debes, cuánto te deben y la última actividad. El proyecto puede elegirse aquí como predeterminado y también desde el botón de configuración al añadir el widget.",
          fr: "Ce widget affiche sur l’écran d’accueil le résumé d’un projet Share : solde personnel, ce que tu dois, ce qu’on te doit et la dernière activité. Le projet peut être choisi ici par défaut et aussi depuis le bouton de configuration lorsque tu ajoutes le widget.",
          de: "Dieses Widget zeigt auf dem Startbildschirm die Zusammenfassung eines Share-Projekts: persönlicher Kontostand, was du schuldest, was dir geschuldet wird und die letzte Aktivität. Das Projekt kann hier als Standard und auch über die Konfigurationstaste beim Hinzufügen des Widgets gewählt werden.",
          pt: "Este widget mostra no ecrã inicial o resumo de um projeto Share: saldo pessoal, quanto deves, quanto te devem e a última atividade. O projeto pode ser escolhido aqui como padrão e também no botão de configuração ao adicionares o widget.",
          pl: "Ten widżet pokazuje na ekranie głównym podsumowanie projektu Share: saldo osobiste, ile jesteś winien, ile inni są winni tobie i ostatnią aktywność. Projekt można wybrać tutaj jako domyślny, a także przyciskiem konfiguracji podczas dodawania widżetu.",
          nl: "Deze widget toont op het startscherm de samenvatting van een Share-project: persoonlijk saldo, wat jij verschuldigd bent, wat anderen jou verschuldigd zijn en de laatste activiteit. Het project kan hier als standaard worden gekozen en ook via de configuratieknop wanneer je de widget toevoegt.",
          ro: "Acest widget afișează pe ecranul principal rezumatul unui proiect Share: sold personal, cât datorezi, cât ți se datorează și ultima activitate. Proiectul poate fi ales aici ca implicit și și din butonul de configurare când adaugi widgetul.",
          el: "Αυτό το widget εμφανίζει στην αρχική οθόνη τη σύνοψη ενός έργου Share: προσωπικό υπόλοιπο, πόσα οφείλεις, πόσα σου οφείλουν και την τελευταία δραστηριότητα. Το έργο μπορεί να επιλεγεί εδώ ως προεπιλογή και επίσης από το κουμπί ρύθμισης όταν προσθέτεις το widget.",
        },
      "This widget shows a Share project summary on the Home screen: personal balance, how much you owe, how much others owe you and the latest activity. The project can be selected here as the default and also from the configuration button when you add the widget.":
        {
          en: "This widget shows a Share project summary on the Home screen: personal balance, what you owe, what others owe you and the latest activity. The project can be selected here as default and also from the configuration button when you add the widget.",
          es: "Este widget muestra en la pantalla de inicio el resumen de un proyecto Share: saldo personal, cuánto debes, cuánto te deben y la última actividad. El proyecto puede elegirse aquí como predeterminado y también desde el botón de configuración al añadir el widget.",
          fr: "Ce widget affiche sur l’écran d’accueil le résumé d’un projet Share : solde personnel, ce que tu dois, ce qu’on te doit et la dernière activité. Le projet peut être choisi ici par défaut et aussi depuis le bouton de configuration lorsque tu ajoutes le widget.",
          de: "Dieses Widget zeigt auf dem Startbildschirm die Zusammenfassung eines Share-Projekts: persönlicher Kontostand, was du schuldest, was dir geschuldet wird und die letzte Aktivität. Das Projekt kann hier als Standard und auch über die Konfigurationstaste beim Hinzufügen des Widgets gewählt werden.",
          pt: "Este widget mostra no ecrã inicial o resumo de um projeto Share: saldo pessoal, quanto deves, quanto te devem e a última atividade. O projeto pode ser escolhido aqui como padrão e também no botão de configuração ao adicionares o widget.",
          pl: "Ten widżet pokazuje na ekranie głównym podsumowanie projektu Share: saldo osobiste, ile jesteś winien, ile inni są winni tobie i ostatnią aktywność. Projekt można wybrać tutaj jako domyślny, a także przyciskiem konfiguracji podczas dodawania widżetu.",
          nl: "Deze widget toont op het startscherm de samenvatting van een Share-project: persoonlijk saldo, wat jij verschuldigd bent, wat anderen jou verschuldigd zijn en de laatste activiteit. Het project kan hier als standaard worden gekozen en ook via de configuratieknop wanneer je de widget toevoegt.",
          ro: "Acest widget afișează pe ecranul principal rezumatul unui proiect Share: sold personal, cât datorezi, cât îți datorează alții și ultima activitate. Proiectul selectat aici este folosit ca implicit și și de butonul de configurare când adaugi widgetul.",
          el: "Αυτό το widget εμφανίζει στην αρχική οθόνη μια σύνοψη του έργου Share: προσωπικό υπόλοιπο, πόσα οφείλεις, πόσα σου οφείλουν και την τελευταία δραστηριότητα. Το έργο που επιλέγεται εδώ χρησιμοποιείται ως προεπιλογή και επίσης από το κουμπί ρύθμισης όταν προσθέτεις το widget.",
        },
    };
    var EXTRA_TRANSLATIONS_1633 = {
      "Scegli la lista, aggiungi prodotti e spunta quelli già messi nel carrello.":
        {
          it: "Scegli la lista, aggiungi prodotti e spunta quelli già messi nel carrello.",
          en: "Choose a list, add products and tick the items already in your cart.",
          es: "Elige la lista, añade productos y marca los que ya están en el carrito.",
          fr: "Choisissez la liste, ajoutez des produits et cochez ceux déjà dans le panier.",
          de: "Wähle die Liste, füge Produkte hinzu und markiere die Artikel im Einkaufswagen.",
          pt: "Escolhe a lista, adiciona produtos e marca os que já estão no carrinho.",
          pl: "Wybierz listę, dodaj produkty i zaznacz te, które są już w koszyku.",
          nl: "Kies de lijst, voeg producten toe en vink de artikelen aan die al in je winkelwagen liggen.",
          ro: "Alege lista, adaugă produse și bifează articolele deja puse în coș.",
          el: "Επιλέξτε λίστα, προσθέστε προϊόντα και σημειώστε όσα είναι ήδη στο καλάθι.",
        },
      "Tocca il prodotto per aggiungerlo alla lista.": {
        it: "Tocca il prodotto per aggiungerlo alla lista.",
        en: "Tap the product to add it to the list.",
        es: "Toca el producto para añadirlo a la lista.",
        fr: "Touchez le produit pour l’ajouter à la liste.",
        de: "Tippe auf das Produkt, um es zur Liste hinzuzufügen.",
        pt: "Toca no produto para o adicionar à lista.",
        pl: "Dotknij produktu, aby dodać go do listy.",
        nl: "Tik op het product om het aan de lijst toe te voegen.",
        ro: "Atinge produsul pentru a-l adăuga în listă.",
        el: "Πατήστε το προϊόν για να το προσθέσετε στη λίστα.",
      },
      "Visibilità, collegamento a patrimonio e movimenti": {
        it: "Visibilità, collegamento a patrimonio e movimenti",
        en: "Visibility, connection to assets and transactions",
        es: "Visibilidad, conexión con patrimonio y movimientos",
        fr: "Visibilité, lien avec patrimoine et mouvements",
        de: "Sichtbarkeit, Verknüpfung mit Vermögen und Bewegungen",
        pt: "Visibilidade, ligação a património e movimentos",
        pl: "Widoczność, połączenie z majątkiem i ruchami",
        nl: "Zichtbaarheid, koppeling met vermogen en bewegingen",
        ro: "Vizibilitate, legătură cu patrimoniu și mișcări",
        el: "Ορατότητα, σύνδεση με περιουσία και κινήσεις",
      },
      "Aree lista spesa, fidelity card e prepagate": {
        it: "Aree lista spesa, fidelity card e prepagate",
        en: "Shopping list areas, loyalty cards and prepaid cards",
        es: "Áreas de la lista de la compra, tarjetas fidelidad y prepago",
        fr: "Rayons de la liste de courses, cartes fidélité et prépayées",
        de: "Einkaufslistenbereiche, Kundenkarten und Prepaid-Karten",
        pt: "Áreas da lista de compras, cartões fidelidade e pré-pagos",
        pl: "Obszary listy zakupów, karty lojalnościowe i przedpłacone",
        nl: "Boodschappenlijstgebieden, klantenkaarten en prepaidkaarten",
        ro: "Zone listă cumpărături, carduri fidelitate și preplătite",
        el: "Περιοχές λίστας αγορών, κάρτες πελάτη και προπληρωμένες",
      },
      "Carte fidelity e prepagate": {
        it: "Carte fidelity e prepagate",
        en: "Loyalty and prepaid cards",
        es: "Tarjetas fidelidad y prepago",
        fr: "Cartes fidélité et prépayées",
        de: "Kunden- und Prepaid-Karten",
        pt: "Cartões fidelidade e pré-pagos",
        pl: "Karty lojalnościowe i przedpłacone",
        nl: "Klanten- en prepaidkaarten",
        ro: "Carduri fidelitate și preplătite",
        el: "Κάρτες πελάτη και προπληρωμένες",
      },
      "Riporta nel patrimonio": {
        it: "Riporta nel patrimonio",
        en: "Include in assets",
        es: "Incluir en patrimonio",
        fr: "Inclure dans le patrimoine",
        de: "In Vermögen aufnehmen",
        pt: "Incluir no património",
        pl: "Uwzględnij w majątku",
        nl: "Opnemen in vermogen",
        ro: "Include în patrimoniu",
        el: "Συμπερίληψη στην περιουσία",
      },
      "Consente di creare una voce Patrimonio collegata al Saldo del debito o credito.":
        {
          it: "Consente di creare una voce Patrimonio collegata al Saldo del debito o credito.",
          en: "Allows creating an asset item linked to the debt or credit balance.",
          es: "Permite crear una partida de patrimonio vinculada al saldo de la deuda o crédito.",
          fr: "Permet de créer un élément de patrimoine lié au solde de la dette ou du crédit.",
          de: "Ermöglicht einen Vermögenseintrag, der mit dem Saldo der Schuld oder des Guthabens verknüpft ist.",
          pt: "Permite criar um item de património ligado ao saldo da dívida ou crédito.",
          pl: "Pozwala utworzyć pozycję majątku połączoną z saldem długu lub należności.",
          nl: "Maakt een vermogensitem aan dat gekoppeld is aan het saldo van de schuld of het tegoed.",
          ro: "Permite crearea unui element de patrimoniu legat de soldul datoriei sau creditului.",
          el: "Επιτρέπει τη δημιουργία στοιχείου περιουσίας συνδεδεμένου με το υπόλοιπο χρέους ή πίστωσης.",
        },
      "Consente di creare una voce patrimonio collegata al saldo del debito o credito.":
        {
          it: "Consente di creare una voce patrimonio collegata al saldo del debito o credito.",
          en: "Allows creating an asset item linked to the debt or credit balance.",
          es: "Permite crear una partida de patrimonio vinculada al saldo de la deuda o crédito.",
          fr: "Permet de créer un élément de patrimoine lié au solde de la dette ou du crédit.",
          de: "Ermöglicht einen Vermögenseintrag, der mit dem Saldo der Schuld oder des Guthabens verknüpft ist.",
          pt: "Permite criar um item de património ligado ao saldo da dívida ou crédito.",
          pl: "Pozwala utworzyć pozycję majątku połączoną z saldem długu lub należności.",
          nl: "Maakt een vermogensitem aan dat gekoppeld is aan het saldo van de schuld of het tegoed.",
          ro: "Permite crearea unui element de patrimoniu legat de soldul datoriei sau creditului.",
          el: "Επιτρέπει τη δημιουργία στοιχείου περιουσίας συνδεδεμένου με το υπόλοιπο χρέους ή πίστωσης.",
        },
      "Riporta nei movimenti": {
        it: "Riporta nei movimenti",
        en: "Include in transactions",
        es: "Incluir en movimientos",
        fr: "Inclure dans les mouvements",
        de: "In Bewegungen aufnehmen",
        pt: "Incluir nos movimentos",
        pl: "Uwzględnij w ruchach",
        nl: "Opnemen in bewegingen",
        ro: "Include în mișcări",
        el: "Συμπερίληψη στις κινήσεις",
      },
      "Consente di creare entrate o uscite partendo dal Saldo del debito o credito.":
        {
          it: "Consente di creare entrate o uscite partendo dal Saldo del debito o credito.",
          en: "Allows creating income or expenses from the debt or credit balance.",
          es: "Permite crear ingresos o gastos a partir del saldo de la deuda o crédito.",
          fr: "Permet de créer des entrées ou sorties à partir du solde de la dette ou du crédit.",
          de: "Ermöglicht Einnahmen oder Ausgaben aus dem Saldo der Schuld oder des Guthabens.",
          pt: "Permite criar entradas ou saídas a partir do saldo da dívida ou crédito.",
          pl: "Pozwala tworzyć przychody lub wydatki z salda długu lub należności.",
          nl: "Maakt inkomsten of uitgaven aan op basis van het saldo van de schuld of het tegoed.",
          ro: "Permite crearea de venituri sau cheltuieli pornind de la soldul datoriei sau creditului.",
          el: "Επιτρέπει τη δημιουργία εσόδων ή εξόδων από το υπόλοιπο χρέους ή πίστωσης.",
        },
      "Consente di creare entrate o uscite partendo dal saldo del debito o credito.":
        {
          it: "Consente di creare entrate o uscite partendo dal saldo del debito o credito.",
          en: "Allows creating income or expenses from the debt or credit balance.",
          es: "Permite crear ingresos o gastos a partir del saldo de la deuda o crédito.",
          fr: "Permet de créer des entrées ou sorties à partir du solde de la dette ou du crédit.",
          de: "Ermöglicht Einnahmen oder Ausgaben aus dem Saldo der Schuld oder des Guthabens.",
          pt: "Permite criar entradas ou saídas a partir do saldo da dívida ou crédito.",
          pl: "Pozwala tworzyć przychody lub wydatki z salda długu lub należności.",
          nl: "Maakt inkomsten of uitgaven aan op basis van het saldo van de schuld of het tegoed.",
          ro: "Permite crearea de venituri sau cheltuieli pornind de la soldul datoriei sau creditului.",
          el: "Επιτρέπει τη δημιουργία εσόδων ή εξόδων από το υπόλοιπο χρέους ή πίστωσης.",
        },
      "Gestisci le aree dei prodotti e scegli icona e area predefinita.": {
        it: "Gestisci le aree dei prodotti e scegli icona e area predefinita.",
        en: "Manage product areas and choose the icon and default area.",
        es: "Gestiona las áreas de productos y elige icono y área predeterminada.",
        fr: "Gérez les rayons des produits et choisissez l’icône et le rayon par défaut.",
        de: "Verwalte Produktbereiche und wähle Symbol und Standardbereich.",
        pt: "Gere as áreas dos produtos e escolhe ícone e área predefinida.",
        pl: "Zarządzaj obszarami produktów oraz wybierz ikonę i obszar domyślny.",
        nl: "Beheer productgebieden en kies het pictogram en standaardgebied.",
        ro: "Gestionează zonele produselor și alege pictograma și zona implicită.",
        el: "Διαχειριστείτε τις περιοχές προϊόντων και επιλέξτε εικονίδιο και προεπιλεγμένη περιοχή.",
      },
      "Colore usato nella lista quando un prodotto è già nel carrello.": {
        it: "Colore usato nella lista quando un prodotto è già nel carrello.",
        en: "Color used in the list when a product is already in the cart.",
        es: "Color usado en la lista cuando un producto ya está en el carrito.",
        fr: "Couleur utilisée dans la liste lorsqu’un produit est déjà dans le panier.",
        de: "Farbe in der Liste, wenn ein Produkt bereits im Wagen ist.",
        pt: "Cor usada na lista quando um produto já está no carrinho.",
        pl: "Kolor używany na liście, gdy produkt jest już w koszyku.",
        nl: "Kleur in de lijst wanneer een product al in de winkelwagen staat.",
        ro: "Culoare folosită în listă când un produs este deja în coș.",
        el: "Χρώμα στη λίστα όταν ένα προϊόν είναι ήδη στο καλάθι.",
      },
      "Top summary, number of icons and section order": {
        it: "Riepilogo alto, numero icone e ordine delle sezioni",
        en: "Top summary, number of icons and section order",
        es: "Resumen superior, número de iconos y orden de secciones",
        fr: "Résumé supérieur, nombre d’icônes et ordre des sections",
        de: "Obere Zusammenfassung, Anzahl der Symbole und Abschnittsreihenfolge",
        pt: "Resumo superior, número de ícones e ordem das secções",
        pl: "Górne podsumowanie, liczba ikon i kolejność sekcji",
        nl: "Bovenste samenvatting, aantal pictogrammen en volgorde van secties",
        ro: "Rezumat superior, număr de pictograme și ordinea secțiunilor",
        el: "Επάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων",
      },
      "Riepilogo alto, numero icone e ordine delle sezioni": {
        it: "Riepilogo alto, numero icone e ordine delle sezioni",
        en: "Top summary, number of icons and section order",
        es: "Resumen superior, número de iconos y orden de secciones",
        fr: "Résumé supérieur, nombre d’icônes et ordre des sections",
        de: "Obere Zusammenfassung, Anzahl der Symbole und Abschnittsreihenfolge",
        pt: "Resumo superior, número de ícones e ordem das secções",
        pl: "Górne podsumowanie, liczba ikon i kolejność sekcji",
        nl: "Bovenste samenvatting, aantal pictogrammen en volgorde van secties",
        ro: "Rezumat superior, număr de pictograme și ordinea secțiunilor",
        el: "Επάνω σύνοψη, αριθμός εικονιδίων και σειρά ενοτήτων",
      },
      "Configurazione widget Android": {
        it: "Configurazione widget Android",
        en: "Android widget configuration",
        es: "Configuración de widgets Android",
        fr: "Configuration des widgets Android",
        de: "Android-Widget-Konfiguration",
        pt: "Configuração dos widgets Android",
        pl: "Konfiguracja widżetów Android",
        nl: "Android-widgetconfiguratie",
        ro: "Configurare widgeturi Android",
        el: "Ρύθμιση widget Android",
      },
      "Widget ingresso rapido": {
        it: "Widget ingresso rapido",
        en: "Quick entry widget",
        es: "Widget de entrada rápida",
        fr: "Widget de saisie rapide",
        de: "Schnelleingabe-Widget",
        pt: "Widget de entrada rápida",
        pl: "Widżet szybkiego wpisu",
        nl: "Widget snelle invoer",
        ro: "Widget introducere rapidă",
        el: "Widget γρήγορης εισαγωγής",
      },
      "Incluso nel piano gratuito. Logo fAInance, pulsanti Entrata/Uscita e layout 1x4 in una sola riga":
        {
          it: "Incluso nel piano gratuito. Logo fAInance, pulsanti Entrata/Uscita e layout 1x4 in una sola riga",
          en: "Included in the free plan. fAInance logo, income/expense buttons and 1x4 layout in one row",
          es: "Incluido en el plan gratuito. Logo fAInance, botones Entrada/Salida y diseño 1x4 en una sola fila",
          fr: "Inclus dans le plan gratuit. Logo fAInance, boutons Entrée/Sortie et disposition 1x4 sur une seule ligne",
          de: "Im Gratis-Plan enthalten. fAInance-Logo, Einnahmen/Ausgaben-Schaltflächen und 1x4-Layout in einer Zeile",
          pt: "Incluído no plano gratuito. Logo fAInance, botões Entrada/Saída e layout 1x4 numa só linha",
          pl: "Dostępne w planie darmowym. Logo fAInance, przyciski Przychód/Wydatek i układ 1x4 w jednym wierszu",
          nl: "Inbegrepen in het gratis plan. fAInance-logo, knoppen Inkomsten/Uitgaven en 1x4-indeling op één rij",
          ro: "Inclus în planul gratuit. Logo fAInance, butoane Venit/Cheltuială și aspect 1x4 pe un singur rând",
          el: "Περιλαμβάνεται στο δωρεάν πλάνο. Λογότυπο fAInance, κουμπιά Έσοδα/Έξοδα και διάταξη 1x4 σε μία γραμμή",
        },
      "Lista spesa": {
        it: "Lista spesa",
        en: "Shopping list",
        es: "Lista de la compra",
        fr: "Liste de courses",
        de: "Einkaufsliste",
        pt: "Lista de compras",
        pl: "Lista zakupów",
        nl: "Boodschappenlijst",
        ro: "Listă de cumpărături",
        el: "Λίστα αγορών",
      },
      "Visualizza la lista della spesa e permette di segnare gli articoli acquistati.":
        {
          it: "Visualizza la lista della spesa e permette di segnare gli articoli acquistati.",
          en: "Shows the shopping list and lets you mark purchased items.",
          es: "Muestra la lista de la compra y permite marcar los artículos comprados.",
          fr: "Affiche la liste de courses et permet de marquer les articles achetés.",
          de: "Zeigt die Einkaufsliste und lässt gekaufte Artikel markieren.",
          pt: "Mostra a lista de compras e permite marcar os artigos comprados.",
          pl: "Pokazuje listę zakupów i pozwala oznaczać kupione produkty.",
          nl: "Toont de boodschappenlijst en laat gekochte artikelen markeren.",
          ro: "Afișează lista de cumpărături și permite marcarea articolelor cumpărate.",
          el: "Εμφανίζει τη λίστα αγορών και επιτρέπει τη σήμανση των αγορασμένων ειδών.",
        },
      "Mostra la lista della spesa e permette di segnare gli articoli acquistati.":
        {
          it: "Mostra la lista della spesa e permette di segnare gli articoli acquistati.",
          en: "Shows the shopping list and lets you mark purchased items.",
          es: "Muestra la lista de la compra y permite marcar los artículos comprados.",
          fr: "Affiche la liste de courses et permet de marquer les articles achetés.",
          de: "Zeigt die Einkaufsliste und lässt gekaufte Artikel markieren.",
          pt: "Mostra a lista de compras e permite marcar os artigos comprados.",
          pl: "Pokazuje listę zakupów i pozwala oznaczać kupione produkty.",
          nl: "Toont de boodschappenlijst en laat gekochte artikelen markeren.",
          ro: "Afișează lista de cumpărături și permite marcarea articolelor cumpărate.",
          el: "Εμφανίζει τη λίστα αγορών και επιτρέπει τη σήμανση των αγορασμένων ειδών.",
        },
      "Fidelity card": {
        it: "Fidelity card",
        en: "Loyalty card",
        es: "Tarjeta fidelidad",
        fr: "Carte fidélité",
        de: "Kundenkarte",
        pt: "Cartão fidelidade",
        pl: "Karta lojalnościowa",
        nl: "Klantenkaart",
        ro: "Card fidelitate",
        el: "Κάρτα πελάτη",
      },
      "Visualizza rapidamente una fidelity card o una prepagata.": {
        it: "Visualizza rapidamente una fidelity card o una prepagata.",
        en: "Quickly shows a loyalty or prepaid card.",
        es: "Muestra rápidamente una tarjeta fidelidad o prepago.",
        fr: "Affiche rapidement une carte fidélité ou prépayée.",
        de: "Zeigt schnell eine Kunden- oder Prepaid-Karte.",
        pt: "Mostra rapidamente um cartão fidelidade ou pré-pago.",
        pl: "Szybko pokazuje kartę lojalnościową lub przedpłaconą.",
        nl: "Toont snel een klantenkaart of prepaidkaart.",
        ro: "Afișează rapid un card fidelitate sau preplătit.",
        el: "Εμφανίζει γρήγορα μια κάρτα πελάτη ή προπληρωμένη.",
      },
      "Debiti / Crediti": {
        it: "Debiti / Crediti",
        en: "Debts / Credits",
        es: "Deudas / Créditos",
        fr: "Dettes / Crédits",
        de: "Schulden / Guthaben",
        pt: "Dívidas / Créditos",
        pl: "Długi / Należności",
        nl: "Schulden / Tegoeden",
        ro: "Datorii / Credite",
        el: "Χρέη / Πιστώσεις",
      },
      "Mostra il saldo aperto di debiti e crediti.": {
        it: "Mostra il saldo aperto di debiti e crediti.",
        en: "Shows the open balance of debts and credits.",
        es: "Muestra el saldo abierto de deudas y créditos.",
        fr: "Affiche le solde ouvert des dettes et crédits.",
        de: "Zeigt den offenen Saldo von Schulden und Guthaben.",
        pt: "Mostra o saldo em aberto de dívidas e créditos.",
        pl: "Pokazuje otwarte saldo długów i należności.",
        nl: "Toont het open saldo van schulden en tegoeden.",
        ro: "Afișează soldul deschis al datoriilor și creditelor.",
        el: "Εμφανίζει το ανοικτό υπόλοιπο χρεών και πιστώσεων.",
      },
      "Icon color": {
        it: "Colore icona",
        en: "Icon color",
        es: "Color del icono",
        fr: "Couleur de l’icône",
        de: "Symbolfarbe",
        pt: "Cor do ícone",
        pl: "Kolor ikony",
        nl: "Pictogramkleur",
        ro: "Culoare pictogramă",
        el: "Χρώμα εικονιδίου",
      },
      "Title color": {
        it: "Colore titolo",
        en: "Title color",
        es: "Color del título",
        fr: "Couleur du titre",
        de: "Titelfarbe",
        pt: "Cor do título",
        pl: "Kolor tytułu",
        nl: "Titelkleur",
        ro: "Culoare titlu",
        el: "Χρώμα τίτλου",
      },
      "Text color": {
        it: "Colore testo",
        en: "Text color",
        es: "Color del texto",
        fr: "Couleur du texte",
        de: "Textfarbe",
        pt: "Cor do texto",
        pl: "Kolor tekstu",
        nl: "Tekstkleur",
        ro: "Culoare text",
        el: "Χρώμα κειμένου",
      },
      "Project shown in the widget": {
        it: "Progetto mostrato nel widget",
        en: "Project shown in the widget",
        es: "Proyecto mostrado en el widget",
        fr: "Projet affiché dans le widget",
        de: "Im Widget angezeigtes Projekt",
        pt: "Projeto mostrado no widget",
        pl: "Projekt pokazany w widżecie",
        nl: "Project getoond in de widget",
        ro: "Proiect afișat în widget",
        el: "Έργο που εμφανίζεται στο widget",
      },
      "Save and update widget": {
        it: "Salva e aggiorna widget",
        en: "Save and update widget",
        es: "Guardar y actualizar widget",
        fr: "Enregistrer et mettre à jour le widget",
        de: "Widget speichern und aktualisieren",
        pt: "Guardar e atualizar widget",
        pl: "Zapisz i zaktualizuj widżet",
        nl: "Widget opslaan en bijwerken",
        ro: "Salvează și actualizează widgetul",
        el: "Αποθήκευση και ενημέρωση widget",
      },
      "Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":
        {
          it: "Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.",
          en: "You choose the exact content when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.",
          es: "El contenido exacto se elige al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.",
          fr: "Le contenu exact se choisit lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.",
          de: "Den genauen Inhalt wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.",
          pt: "O conteúdo exato é escolhido ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.",
          pl: "Dokładną treść wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.",
          nl: "De exacte inhoud kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.",
          ro: "Conținutul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.",
          el: "Το ακριβές περιεχόμενο επιλέγεται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση.",
        },
      "La carta precisa si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":
        {
          it: "La carta precisa si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.",
          en: "You choose the exact card when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.",
          es: "La tarjeta exacta se elige al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.",
          fr: "La carte exacte se choisit lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.",
          de: "Die genaue Karte wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.",
          pt: "O cartão exato é escolhido ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.",
          pl: "Dokładną kartę wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.",
          nl: "De exacte kaart kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.",
          ro: "Cardul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.",
          el: "Η ακριβής κάρτα επιλέγεται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση.",
        },
      "I debiti e crediti precisi si scelgono quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.":
        {
          it: "I debiti e crediti precisi si scelgono quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori, trasparenza e aggiornamento.",
          en: "You choose the exact debts and credits when adding the widget to the Home screen; here you only edit appearance, colors, transparency and updates.",
          es: "Las deudas y créditos exactos se eligen al añadir el widget a la pantalla de inicio; aquí solo modificas aspecto, colores, transparencia y actualización.",
          fr: "Les dettes et crédits exacts se choisissent lors de l’ajout du widget à l’écran d’accueil ; ici vous modifiez seulement l’aspect, les couleurs, la transparence et l’actualisation.",
          de: "Die genauen Schulden und Guthaben wählst du beim Hinzufügen des Widgets zum Startbildschirm; hier änderst du nur Aussehen, Farben, Transparenz und Aktualisierung.",
          pt: "As dívidas e créditos exatos são escolhidos ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores, transparência e atualização.",
          pl: "Dokładne długi i należności wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory, przezroczystość i odświeżanie.",
          nl: "De exacte schulden en tegoeden kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren, transparantie en updates.",
          ro: "Datoriile și creditele exacte se aleg când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile, transparența și actualizarea.",
          el: "Τα ακριβή χρέη και πιστώσεις επιλέγονται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα, διαφάνεια και ενημέρωση.",
        },
      "Grandezza testo": {
        it: "Grandezza testo",
        en: "Text size",
        es: "Tamaño del texto",
        fr: "Taille du texte",
        de: "Textgröße",
        pt: "Tamanho do texto",
        pl: "Rozmiar tekstu",
        nl: "Tekstgrootte",
        ro: "Dimensiune text",
        el: "Μέγεθος κειμένου",
      },
      "Dimensione del contenuto mostrato nel widget.": {
        it: "Dimensione del contenuto mostrato nel widget.",
        en: "Size of the content shown in the widget.",
        es: "Tamaño del contenido mostrado en el widget.",
        fr: "Taille du contenu affiché dans le widget.",
        de: "Größe des im Widget angezeigten Inhalts.",
        pt: "Tamanho do conteúdo mostrado no widget.",
        pl: "Rozmiar treści pokazywanej w widżecie.",
        nl: "Grootte van de inhoud die in de widget wordt getoond.",
        ro: "Dimensiunea conținutului afișat în widget.",
        el: "Μέγεθος του περιεχομένου που εμφανίζεται στο widget.",
      },
      "Trasparenza sfondo widget": {
        it: "Trasparenza sfondo widget",
        en: "Widget background transparency",
        es: "Transparencia del fondo del widget",
        fr: "Transparence du fond du widget",
        de: "Widget-Hintergrundtransparenz",
        pt: "Transparência do fundo do widget",
        pl: "Przezroczystość tła widżetu",
        nl: "Transparantie van widgetachtergrond",
        ro: "Transparență fundal widget",
        el: "Διαφάνεια φόντου widget",
      },
      "100% = completamente trasparente. 0% = sfondo pieno.": {
        it: "100% = completamente trasparente. 0% = sfondo pieno.",
        en: "100% = fully transparent. 0% = solid background.",
        es: "100% = totalmente transparente. 0% = fondo sólido.",
        fr: "100 % = totalement transparent. 0 % = fond plein.",
        de: "100 % = vollständig transparent. 0 % = voller Hintergrund.",
        pt: "100% = totalmente transparente. 0% = fundo sólido.",
        pl: "100% = całkowicie przezroczyste. 0% = pełne tło.",
        nl: "100% = volledig transparant. 0% = volle achtergrond.",
        ro: "100% = complet transparent. 0% = fundal plin.",
        el: "100% = πλήρως διαφανές. 0% = πλήρες φόντο.",
      },
      "Aggiornamento automatico": {
        it: "Aggiornamento automatico",
        en: "Automatic update",
        es: "Actualización automática",
        fr: "Mise à jour automatique",
        de: "Automatische Aktualisierung",
        pt: "Atualização automática",
        pl: "Automatyczna aktualizacja",
        nl: "Automatische update",
        ro: "Actualizare automată",
        el: "Αυτόματη ενημέρωση",
      },
      "Aggiorna i widget già installati quando cambi contenuti o impostazioni.":
        {
          it: "Aggiorna i widget già installati quando cambi contenuti o impostazioni.",
          en: "Updates already installed widgets when you change content or settings.",
          es: "Actualiza los widgets ya instalados cuando cambias contenidos o ajustes.",
          fr: "Met à jour les widgets déjà installés lorsque vous changez du contenu ou des paramètres.",
          de: "Aktualisiert bereits installierte Widgets, wenn du Inhalte oder Einstellungen änderst.",
          pt: "Atualiza os widgets já instalados quando alteras conteúdos ou definições.",
          pl: "Aktualizuje już zainstalowane widżety po zmianie treści lub ustawień.",
          nl: "Werkt al geïnstalleerde widgets bij wanneer je inhoud of instellingen wijzigt.",
          ro: "Actualizează widgeturile deja instalate când schimbi conținutul sau setările.",
          el: "Ενημερώνει τα ήδη εγκατεστημένα widget όταν αλλάζετε περιεχόμενο ή ρυθμίσεις.",
        },
      "Colore icona": {
        it: "Colore icona",
        en: "Icon color",
        es: "Color del icono",
        fr: "Couleur de l’icône",
        de: "Symbolfarbe",
        pt: "Cor do ícone",
        pl: "Kolor ikony",
        nl: "Pictogramkleur",
        ro: "Culoare pictogramă",
        el: "Χρώμα εικονιδίου",
      },
      "Colore titolo": {
        it: "Colore titolo",
        en: "Title color",
        es: "Color del título",
        fr: "Couleur du titre",
        de: "Titelfarbe",
        pt: "Cor do título",
        pl: "Kolor tytułu",
        nl: "Titelkleur",
        ro: "Culoare titlu",
        el: "Χρώμα τίτλου",
      },
      "Colore testo": {
        it: "Colore testo",
        en: "Text color",
        es: "Color del texto",
        fr: "Couleur du texte",
        de: "Textfarbe",
        pt: "Cor do texto",
        pl: "Kolor tekstu",
        nl: "Tekstkleur",
        ro: "Culoare text",
        el: "Χρώμα κειμένου",
      },
      "Progetto mostrato nel widget": {
        it: "Progetto mostrato nel widget",
        en: "Project shown in the widget",
        es: "Proyecto mostrado en el widget",
        fr: "Projet affiché dans le widget",
        de: "Im Widget angezeigtes Projekt",
        pt: "Projeto mostrado no widget",
        pl: "Projekt pokazany w widżecie",
        nl: "Project getoond in de widget",
        ro: "Proiect afișat în widget",
        el: "Έργο που εμφανίζεται στο widget",
      },
      "Salva e aggiorna widget": {
        it: "Salva e aggiorna widget",
        en: "Save and update widget",
        es: "Guardar y actualizar widget",
        fr: "Enregistrer et mettre à jour le widget",
        de: "Widget speichern und aktualisieren",
        pt: "Guardar e atualizar widget",
        pl: "Zapisz i zaktualizuj widżet",
        nl: "Widget opslaan en bijwerken",
        ro: "Salvează și actualizează widgetul",
        el: "Αποθήκευση και ενημέρωση widget",
      },
    };
    Object.keys(EXTRA_TRANSLATIONS_1633).forEach(function (x) {
      D[x] = EXTRA_TRANSLATIONS_1633[x];
    });
    var WIDGET_ALIAS_TRANSLATIONS_1634 = {
      "Icon Color": {
        it: "Colore icona",
        en: "Icon color",
        es: "Color del icono",
        fr: "Couleur de l’icône",
        de: "Symbolfarbe",
        pt: "Cor do ícone",
        pl: "Kolor ikony",
        nl: "Pictogramkleur",
        ro: "Culoare pictogramă",
        el: "Χρώμα εικονιδίου",
      },
      "Title Color": {
        it: "Colore titolo",
        en: "Title color",
        es: "Color del título",
        fr: "Couleur du titre",
        de: "Titelfarbe",
        pt: "Cor do título",
        pl: "Kolor tytułu",
        nl: "Titelkleur",
        ro: "Culoare titlu",
        el: "Χρώμα τίτλου",
      },
      "Text Color": {
        it: "Colore testo",
        en: "Text color",
        es: "Color del texto",
        fr: "Couleur du texte",
        de: "Textfarbe",
        pt: "Cor do texto",
        pl: "Kolor tekstu",
        nl: "Tekstkleur",
        ro: "Culoare text",
        el: "Χρώμα κειμένου",
      },
      "Background Transparency": {
        it: "Trasparenza sfondo widget",
        en: "Widget background transparency",
        es: "Transparencia del fondo del widget",
        fr: "Transparence du fond du widget",
        de: "Widget-Hintergrundtransparenz",
        pt: "Transparência do fundo do widget",
        pl: "Przezroczystość tła widżetu",
        nl: "Transparantie widgetachtergrond",
        ro: "Transparență fundal widget",
        el: "Διαφάνεια φόντου widget",
      },
      "Save and Update widget": {
        it: "Salva e aggiorna widget",
        en: "Save and update widget",
        es: "Guardar y actualizar widget",
        fr: "Enregistrer et mettre à jour le widget",
        de: "Widget speichern und aktualisieren",
        pt: "Guardar e atualizar widget",
        pl: "Zapisz i zaktualizuj widżet",
        nl: "Widget opslaan en bijwerken",
        ro: "Salvează și actualizează widgetul",
        el: "Αποθήκευση και ενημέρωση widget",
      },
      "Save and update widget": {
        it: "Salva e aggiorna widget",
        en: "Save and update widget",
        es: "Guardar y actualizar widget",
        fr: "Enregistrer et mettre à jour le widget",
        de: "Widget speichern und aktualisieren",
        pt: "Guardar e atualizar widget",
        pl: "Zapisz i zaktualizuj widżet",
        nl: "Widget opslaan en bijwerken",
        ro: "Salvează și actualizează widgetul",
        el: "Αποθήκευση και ενημέρωση widget",
      },
      "Show percentage": {
        it: "Mostra percentuale",
        en: "Show percentage",
        es: "Mostrar porcentaje",
        fr: "Afficher le pourcentage",
        de: "Prozent anzeigen",
        pt: "Mostrar percentagem",
        pl: "Pokaż procent",
        nl: "Percentage tonen",
        ro: "Afișează procentul",
        el: "Εμφάνιση ποσοστού",
      },
      "Show amounts": {
        it: "Mostra importi",
        en: "Show amounts",
        es: "Mostrar importes",
        fr: "Afficher les montants",
        de: "Beträge anzeigen",
        pt: "Mostrar valores",
        pl: "Pokaż kwoty",
        nl: "Bedragen tonen",
        ro: "Afișează sumele",
        el: "Εμφάνιση ποσών",
      },
      "Bar color": {
        it: "Colore barra",
        en: "Bar color",
        es: "Color de la barra",
        fr: "Couleur de la barre",
        de: "Balkenfarbe",
        pt: "Cor da barra",
        pl: "Kolor paska",
        nl: "Balkkleur",
        ro: "Culoarea barei",
        el: "Χρώμα γραμμής",
      },
      "Percentage color": {
        it: "Colore percentuale",
        en: "Percentage color",
        es: "Color del porcentaje",
        fr: "Couleur du pourcentage",
        de: "Prozentfarbe",
        pt: "Cor da percentagem",
        pl: "Kolor procentu",
        nl: "Percentagekleur",
        ro: "Culoarea procentului",
        el: "Χρώμα ποσοστού",
      },
    };
    Object.keys(WIDGET_ALIAS_TRANSLATIONS_1634).forEach(function (x) {
      D[x] = WIDGET_ALIAS_TRANSLATIONS_1634[x];
    });
    var EXTRA_CREDIT_CARD_TRANSLATIONS_1215 = {
      "Carte di credito": {
        it: "Carte di credito",
        en: "Credit cards",
        es: "Tarjetas de crédito",
        fr: "Cartes de crédit",
        de: "Kreditkarten",
        pt: "Cartões de crédito",
        pl: "Karty kredytowe",
        nl: "Creditcards",
        ro: "Carduri de credit",
        el: "Πιστωτικές κάρτες",
      },
      "Carta di credito": {
        it: "Carta di credito",
        en: "Credit card",
        es: "Tarjeta de crédito",
        fr: "Carte de crédit",
        de: "Kreditkarte",
        pt: "Cartão de crédito",
        pl: "Karta kredytowa",
        nl: "Creditcard",
        ro: "Card de credit",
        el: "Πιστωτική κάρτα",
      },
      "Nuova Carta": {
        it: "Nuova Carta",
        en: "New card",
        es: "Nueva tarjeta",
        fr: "Nouvelle carte",
        de: "Neue Karte",
        pt: "Novo cartão",
        pl: "Nowa karta",
        nl: "Nieuwe kaart",
        ro: "Card nou",
        el: "Νέα κάρτα",
      },
      "Nuova Carta di credito": {
        it: "Nuova Carta di credito",
        en: "New credit card",
        es: "Nueva tarjeta de crédito",
        fr: "Nouvelle carte de crédit",
        de: "Neue Kreditkarte",
        pt: "Novo cartão de crédito",
        pl: "Nowa karta kredytowa",
        nl: "Nieuwe creditcard",
        ro: "Card de credit nou",
        el: "Νέα πιστωτική κάρτα",
      },
      "Modifica Carta di credito": {
        it: "Modifica Carta di credito",
        en: "Edit credit card",
        es: "Modificar tarjeta de crédito",
        fr: "Modifier la carte de crédit",
        de: "Kreditkarte bearbeiten",
        pt: "Editar cartão de crédito",
        pl: "Edytuj kartę kredytową",
        nl: "Creditcard bewerken",
        ro: "Modifică cardul de credit",
        el: "Επεξεργασία πιστωτικής κάρτας",
      },
      "Nessuna carta di credito salvata": {
        it: "Nessuna carta di credito salvata",
        en: "No credit card saved",
        es: "No hay tarjetas de crédito guardadas",
        fr: "Aucune carte de crédit enregistrée",
        de: "Keine Kreditkarte gespeichert",
        pt: "Nenhum cartão de crédito guardado",
        pl: "Brak zapisanych kart kredytowych",
        nl: "Geen creditcard opgeslagen",
        ro: "Niciun card de credit salvat",
        el: "Δεν έχει αποθηκευτεί πιστωτική κάρτα",
      },
      "Nessuna carta di credito selezionata": {
        it: "Nessuna carta di credito selezionata",
        en: "No credit card selected",
        es: "No hay ninguna tarjeta de crédito seleccionada",
        fr: "Aucune carte de crédit sélectionnée",
        de: "Keine Kreditkarte ausgewählt",
        pt: "Nenhum cartão de crédito selecionado",
        pl: "Nie wybrano karty kredytowej",
        nl: "Geen creditcard geselecteerd",
        ro: "Niciun card de credit selectat",
        el: "Δεν έχει επιλεγεί πιστωτική κάρτα",
      },
      "Nome carta": {
        it: "Nome carta",
        en: "Card name",
        es: "Nombre de la tarjeta",
        fr: "Nom de la carte",
        de: "Kartenname",
        pt: "Nome do cartão",
        pl: "Nazwa karty",
        nl: "Kaartnaam",
        ro: "Numele cardului",
        el: "Όνομα κάρτας",
      },
      Emittente: {
        it: "Emittente",
        en: "Issuer",
        es: "Emisor",
        fr: "Émetteur",
        de: "Aussteller",
        pt: "Emissor",
        pl: "Wydawca",
        nl: "Uitgever",
        ro: "Emitent",
        el: "Εκδότης",
      },
      "Numero carta": {
        it: "Numero carta",
        en: "Card number",
        es: "Número de tarjeta",
        fr: "Numéro de carte",
        de: "Kartennummer",
        pt: "Número do cartão",
        pl: "Numer karty",
        nl: "Kaartnummer",
        ro: "Numărul cardului",
        el: "Αριθμός κάρτας",
      },
      Numero: {
        it: "Numero",
        en: "Number",
        es: "Número",
        fr: "Numéro",
        de: "Nummer",
        pt: "Número",
        pl: "Numer",
        nl: "Nummer",
        ro: "Număr",
        el: "Αριθμός",
      },
      Scadenza: {
        it: "Scadenza",
        en: "Expiry",
        es: "Caducidad",
        fr: "Expiration",
        de: "Ablaufdatum",
        pt: "Validade",
        pl: "Termin ważności",
        nl: "Vervaldatum",
        ro: "Expirare",
        el: "Λήξη",
      },
      "Scadenza MM/AA": {
        it: "Scadenza MM/AA",
        en: "Expiry MM/YY",
        es: "Caducidad MM/AA",
        fr: "Expiration MM/AA",
        de: "Ablauf MM/JJ",
        pt: "Validade MM/AA",
        pl: "Ważność MM/RR",
        nl: "Vervaldatum MM/JJ",
        ro: "Expirare LL/AA",
        el: "Λήξη MM/EE",
      },
      "Salva carta": {
        it: "Salva carta",
        en: "Save card",
        es: "Guardar tarjeta",
        fr: "Enregistrer la carte",
        de: "Karte speichern",
        pt: "Guardar cartão",
        pl: "Zapisz kartę",
        nl: "Kaart opslaan",
        ro: "Salvează cardul",
        el: "Αποθήκευση κάρτας",
      },
      "Aggiorna carta": {
        it: "Aggiorna carta",
        en: "Update card",
        es: "Actualizar tarjeta",
        fr: "Mettre à jour la carte",
        de: "Karte aktualisieren",
        pt: "Atualizar cartão",
        pl: "Zaktualizuj kartę",
        nl: "Kaart bijwerken",
        ro: "Actualizează cardul",
        el: "Ενημέρωση κάρτας",
      },
      "Carta di credito salvata": {
        it: "Carta di credito salvata",
        en: "Credit card saved",
        es: "Tarjeta de crédito guardada",
        fr: "Carte de crédit enregistrée",
        de: "Kreditkarte gespeichert",
        pt: "Cartão de crédito guardado",
        pl: "Karta kredytowa zapisana",
        nl: "Creditcard opgeslagen",
        ro: "Card de credit salvat",
        el: "Η πιστωτική κάρτα αποθηκεύτηκε",
      },
      "Carta di credito aggiornata": {
        it: "Carta di credito aggiornata",
        en: "Credit card updated",
        es: "Tarjeta de crédito actualizada",
        fr: "Carte de crédit mise à jour",
        de: "Kreditkarte aktualisiert",
        pt: "Cartão de crédito atualizado",
        pl: "Karta kredytowa zaktualizowana",
        nl: "Creditcard bijgewerkt",
        ro: "Card de credit actualizat",
        el: "Η πιστωτική κάρτα ενημερώθηκε",
      },
      "Carta di credito eliminata": {
        it: "Carta di credito eliminata",
        en: "Credit card deleted",
        es: "Tarjeta de crédito eliminada",
        fr: "Carte de crédit supprimée",
        de: "Kreditkarte gelöscht",
        pt: "Cartão de crédito eliminado",
        pl: "Karta kredytowa usunięta",
        nl: "Creditcard verwijderd",
        ro: "Card de credit șters",
        el: "Η πιστωτική κάρτα διαγράφηκε",
      },
      "Eliminare questa carta di credito?": {
        it: "Eliminare questa carta di credito?",
        en: "Delete this credit card?",
        es: "¿Eliminar esta tarjeta de crédito?",
        fr: "Supprimer cette carte de crédit ?",
        de: "Diese Kreditkarte löschen?",
        pt: "Eliminar este cartão de crédito?",
        pl: "Usunąć tę kartę kredytową?",
        nl: "Deze creditcard verwijderen?",
        ro: "Ștergi acest card de credit?",
        el: "Διαγραφή αυτής της πιστωτικής κάρτας;",
      },
      "Per sicurezza non viene richiesto né salvato il CVV della carta.": {
        it: "Per sicurezza non viene richiesto né salvato il CVV della carta.",
        en: "For security, the card CVV is neither requested nor saved.",
        es: "Por seguridad, no se solicita ni se guarda el CVV de la tarjeta.",
        fr: "Par sécurité, le CVV de la carte n’est ni demandé ni enregistré.",
        de: "Aus Sicherheitsgründen wird die Kartenprüfnummer nicht abgefragt oder gespeichert.",
        pt: "Por segurança, o CVV do cartão não é pedido nem guardado.",
        pl: "Ze względów bezpieczeństwa kod CVV karty nie jest wymagany ani zapisywany.",
        nl: "Voor de veiligheid wordt de CVV-code niet gevraagd of opgeslagen.",
        ro: "Din motive de securitate, CVV-ul cardului nu este solicitat și nici salvat.",
        el: "Για λόγους ασφαλείας, το CVV της κάρτας δεν ζητείται ούτε αποθηκεύεται.",
      },
      "Nota / Coordinata / Carta": {
        it: "Nota / Coordinata / Carta",
        en: "Note / Bank details / Card",
        es: "Nota / Datos bancarios / Tarjeta",
        fr: "Note / Coordonnées bancaires / Carte",
        de: "Notiz / Bankdaten / Karte",
        pt: "Nota / Dados bancários / Cartão",
        pl: "Notatka / Dane bankowe / Karta",
        nl: "Notitie / Bankgegevens / Kaart",
        ro: "Notă / Date bancare / Card",
        el: "Σημείωση / Τραπεζικά στοιχεία / Κάρτα",
      },
      "Questo widget mostra sulla Home una nota salvata, una coordinata bancaria oppure una carta di credito. Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori e aggiornamento.":
        {
          it: "Questo widget mostra sulla Home una nota salvata, una coordinata bancaria oppure una carta di credito. Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori e aggiornamento.",
          en: "This widget shows a saved note, bank details or a credit card on the phone Home screen. The exact content is chosen when you add the widget to the Home screen; here you only change appearance, colors and updating.",
          es: "Este widget muestra en la pantalla de inicio una nota guardada, datos bancarios o una tarjeta de crédito. El contenido exacto se elige al añadir el widget a la pantalla de inicio; aquí solo cambias aspecto, colores y actualización.",
          fr: "Ce widget affiche sur l’écran d’accueil une note enregistrée, des coordonnées bancaires ou une carte de crédit. Le contenu exact se choisit lors de l’ajout du widget à l’accueil ; ici vous modifiez seulement l’apparence, les couleurs et la mise à jour.",
          de: "Dieses Widget zeigt auf dem Startbildschirm eine gespeicherte Notiz, Bankdaten oder eine Kreditkarte. Den genauen Inhalt wählst du beim Hinzufügen des Widgets; hier änderst du nur Aussehen, Farben und Aktualisierung.",
          pt: "Este widget mostra no ecrã inicial uma nota guardada, dados bancários ou um cartão de crédito. O conteúdo exato é escolhido ao adicionar o widget ao ecrã inicial; aqui alteras apenas aspeto, cores e atualização.",
          pl: "Ten widżet pokazuje na ekranie głównym zapisaną notatkę, dane bankowe albo kartę kredytową. Dokładną treść wybierasz podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory i aktualizację.",
          nl: "Deze widget toont op het startscherm een opgeslagen notitie, bankgegevens of een creditcard. De exacte inhoud kies je wanneer je de widget toevoegt; hier wijzig je alleen uiterlijk, kleuren en updates.",
          ro: "Acest widget afișează pe ecranul principal o notă salvată, date bancare sau un card de credit. Conținutul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile și actualizarea.",
          el: "Αυτό το widget εμφανίζει στην αρχική οθόνη μια αποθηκευμένη σημείωση, τραπεζικά στοιχεία ή μια πιστωτική κάρτα. Το ακριβές περιεχόμενο επιλέγεται όταν προσθέτετε το widget στην αρχική οθόνη· εδώ αλλάζετε μόνο εμφάνιση, χρώματα και ενημέρωση.",
        },
      "Nuovo Appunto": {
        it: "Nuovo Appunto",
        en: "New note",
        es: "Nueva nota",
        fr: "Nouvelle note",
        de: "Neue Notiz",
        pt: "Nova nota",
        pl: "Nowa notatka",
        nl: "Nieuwe notitie",
        ro: "Notă nouă",
        el: "Νέα σημείωση",
      },
      "Nuova Coordinata": {
        it: "Nuova Coordinata",
        en: "New bank detail",
        es: "Nuevo dato bancario",
        fr: "Nouvelle coordonnée",
        de: "Neue Bankdaten",
        pt: "Novo dado bancário",
        pl: "Nowe dane bankowe",
        nl: "Nieuwe bankgegevens",
        ro: "Date bancare noi",
        el: "Νέα τραπεζικά στοιχεία",
      },
    };
    Object.keys(EXTRA_CREDIT_CARD_TRANSLATIONS_1215).forEach(function (x) {
      D[x] = EXTRA_CREDIT_CARD_TRANSLATIONS_1215[x];
    });
    var row = D[k];
    if (row && row[code]) return raw.replace(k, row[code]);
    return raw;
  }

  function translateUiRuntimeText(value) {
    var raw = String(value == null ? "" : value);
    var forced = translateCriticalUiText(raw, lang);
    if (forced !== raw) return normalizeFainanceTranslatedIcons(raw, forced);
    return normalizeFainanceTranslatedIcons(
      raw,
      translateFainanceText(raw, lang)
    );
  }
  useEffect(
    function () {
      try {
        (window as any).fainanceTranslateUi = function (value) {
          return translateUiRuntimeText(value);
        };
      } catch (e) {}
      return function () {
        try {
          delete (window as any).fainanceTranslateUi;
        } catch (e) {}
      };
    },
    [lang]
  );
  useEffect(
    function () {
      // iOS: non osservare continuamente ogni modifica del DOM.
      // Il MutationObserver precedente ritraduceva ogni nodo creato o aggiornato da React,
      // saturando il thread dell'interfaccia e facendo perdere o ritardare i tocchi.
      // Le traduzioni legacy vengono ora applicate solo in pochi passaggi programmati
      // quando cambia la lingua o la schermata visibile.
      if (typeof document === "undefined") return;
      // Nell'app nativa Capacitor i testi sono già tradotti durante il render React.
      // La scansione successiva dell'intero DOM è molto costosa sulle schermate complete
      // e su iOS può bloccare il thread principale, facendo perdere o ritardare i tocchi.
      // index.html imposta il flag nativo; il controllo del protocollo è un'ulteriore tutela.
      var nativeDomTranslationDisabled = false;
      try {
        nativeDomTranslationDisabled =
          !!(window as any).__FAINANCE_DISABLE_DOM_TRANSLATION__ ||
          String(
            (window.location && window.location.protocol) || ""
          ).toLowerCase() === "capacitor:";
      } catch (e) {}
      if (nativeDomTranslationDisabled) return;
      var root = document.getElementById("root");
      if (!root) return;
      var map = runtimeTranslationMap || {};
      var normalizedMap = {};
      var normalizedMapSource = {};
      var foldedExactMap = {};
      function repairMojibake(value) {
        var raw = String(value == null ? "" : value);
        if (!/[������]/.test(raw)) return raw;
        try {
          var decoded = decodeURIComponent(escape(raw));
          if (decoded && decoded !== raw && decoded.indexOf("�") < 0)
            return decoded;
        } catch (e) {}
        return raw;
      }
      function norm(v) {
        return String(v || "")
          .replace(/�/g, "")
          .replace(/’|‘|’|‘|`/g, "'")
          .replace(/“|��|“|”/g, '"')
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
      // Keep a case-insensitive *exact* lookup before the aggressive normalized lookup.
      // The old normalized map removed punctuation, so e.g.
      // "Distribuzione uscite" and "Distribuzione uscite —" collapsed to the same key.
      // Since the decorated translation was inserted first, a later DOM translation pass
      // could turn the clean Home title into "Distribuzione uscite —".
      function foldExact(v) {
        return repairMojibake(String(v || ""))
          .replace(/’|‘|’|‘|`/g, "'")
          .replace(/“|��|“|”/g, '"')
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();
      }
      Object.keys(map).forEach(function (k) {
        var fk = foldExact(k);
        if (fk && foldedExactMap[fk] === undefined) foldedExactMap[fk] = map[k];
        var nk = norm(k);
        if (!nk) return;
        var prev = normalizedMapSource[nk];
        var currentIsPlain = foldExact(k) === nk;
        var previousIsPlain = prev ? foldExact(prev) === nk : false;
        // On collisions prefer the undecorated phrase (no trailing dash/punctuation).
        if (!prev || (currentIsPlain && !previousIsPlain)) {
          normalizedMapSource[nk] = k;
          normalizedMap[nk] = map[k];
        }
      });
      function tx(value) {
        if (value == null) return value;
        var raw = repairMojibake(String(value));
        var trimmed = raw.trim();
        if (!trimmed || trimmed.length < 2) return raw;
        if (/^[\d\s.,:;€$%+\-()\/]+$/.test(trimmed)) return raw;
        if (lang === "it") {
          var forcedIt = translateCriticalUiText(trimmed, "it");
          if (forcedIt && forcedIt !== trimmed)
            return normalizeFainanceTranslatedIcons(
              raw,
              raw.replace(trimmed, forcedIt)
            );
          var directIt = translateFainanceText(trimmed, "it");
          if (directIt && directIt !== trimmed)
            return normalizeFainanceTranslatedIcons(
              raw,
              raw.replace(trimmed, directIt)
            );
          var nextIt =
            map[trimmed] ||
            foldedExactMap[foldExact(trimmed)] ||
            normalizedMap[norm(trimmed)];
          if (nextIt && nextIt !== trimmed && String(nextIt).indexOf("�") < 0)
            return normalizeFainanceTranslatedIcons(
              raw,
              raw.replace(trimmed, repairMojibake(String(nextIt)))
            );
          return raw;
        }
        var forced = translateCriticalUiText(trimmed, lang);
        if (forced && forced !== trimmed)
          return normalizeFainanceTranslatedIcons(
            raw,
            raw.replace(trimmed, forced)
          );
        var direct = translateFainanceText(trimmed, lang);
        if (direct && direct !== trimmed)
          return normalizeFainanceTranslatedIcons(
            raw,
            raw.replace(trimmed, direct)
          );
        var next =
          map[trimmed] ||
          foldedExactMap[foldExact(trimmed)] ||
          normalizedMap[norm(trimmed)];
        if (!next) {
          var pref = trimmed.match(/^([^A-Za-zÀ-ÿ0-9]+)\s*([\s\S]+)$/);
          if (pref && pref[2]) {
            var translatedTail =
              map[pref[2]] ||
              foldedExactMap[foldExact(pref[2])] ||
              normalizedMap[norm(pref[2])];
            if (translatedTail) next = pref[1] + String(translatedTail);
          }
        }
        if (!next || next === trimmed || String(next).indexOf("�") >= 0)
          return raw;
        return normalizeFainanceTranslatedIcons(
          raw,
          raw.replace(trimmed, repairMojibake(String(next)))
        );
      }
      function skip(el) {
        if (!el || !el.tagName) return true;
        if (
          ["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"].includes(
            el.tagName
          )
        )
          return true;
        if (el.closest && el.closest('[data-no-translate="true"]')) return true;
        return false;
      }
      function applyExactTranslations() {
        try {
          var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
              if (!node.nodeValue || !node.nodeValue.trim())
                return NodeFilter.FILTER_REJECT;
              var parent = node.parentElement;
              return skip(parent)
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT;
            },
          });
          var nodes = [];
          while (walker.nextNode()) nodes.push(walker.currentNode);
          nodes.forEach(function (node) {
            try {
              var next = tx(node.nodeValue);
              if (next !== node.nodeValue) node.nodeValue = next;
            } catch (e) {}
          });
          root
            .querySelectorAll(
              "input[placeholder],textarea[placeholder],[title],[aria-label],option[label]"
            )
            .forEach(function (el) {
              if (skip(el)) return;
              ["placeholder", "title", "aria-label", "label"].forEach(function (
                attr
              ) {
                try {
                  var value = el.getAttribute(attr);
                  if (value) {
                    var next = tx(value);
                    if (next !== value) el.setAttribute(attr, next);
                  }
                } catch (e) {}
              });
            });
        } catch (e) {}
      }
      var timers = [];
      function schedule(ms) {
        timers.push(setTimeout(applyExactTranslations, ms));
      }
      schedule(20);
      schedule(180);
      schedule(650);
      return function () {
        timers.forEach(function (timer) {
          clearTimeout(timer);
        });
      };
    },
    [
      lang,
      runtimeTranslationMap,
      tab,
      settingsPage,
      speseSubTab,
      addSubTab,
      historyTab,
      shareProjectTab,
      patrimonioMode,
      aiTab,
      statsView,
    ]
  );
  function monthShortName(index) {
    var names = {
      it: [
        "Gen",
        "Feb",
        "Mar",
        "Apr",
        "Mag",
        "Giu",
        "Lug",
        "Ago",
        "Set",
        "Ott",
        "Nov",
        "Dic",
      ],
      en: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      es: [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ],
      fr: [
        "Janv.",
        "Fevr.",
        "Mars",
        "Avr.",
        "Mai",
        "Juin",
        "Juil.",
        "Aout",
        "Sept.",
        "Oct.",
        "Nov.",
        "Dec.",
      ],
      de: [
        "Jan.",
        "Feb.",
        "Marz",
        "Apr.",
        "Mai",
        "Juni",
        "Juli",
        "Aug.",
        "Sept.",
        "Okt.",
        "Nov.",
        "Dez.",
      ],
      pt: [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ],
      pl: [
        "Sty",
        "Lut",
        "Mar",
        "Kwi",
        "Maj",
        "Cze",
        "Lip",
        "Sie",
        "Wrz",
        "Paz",
        "Lis",
        "Gru",
      ],
      nl: [
        "Jan",
        "Feb",
        "Mrt",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Okt",
        "Nov",
        "Dec",
      ],
      ro: [
        "Ian",
        "Feb",
        "Mar",
        "Apr",
        "Mai",
        "Iun",
        "Iul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      el: [
        "Ιαν",
        "Φεβ",
        "Μαρ",
        "Απρ",
        "Μαι",
        "Ιουν",
        "Ιουλ",
        "Αυγ",
        "Σεπ",
        "Οκτ",
        "Νοε",
        "Δεκ",
      ],
    };
    var list = names[lang] || names.en;
    return list[index] || MONTHS_SHORT[index] || "";
  }
  function monthFullName(index) {
    var names = {
      it: MONTHS_FULL,
      en: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      es: [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
      ],
      fr: [
        "Janvier",
        "Fevrier",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Aout",
        "Septembre",
        "Octobre",
        "Novembre",
        "Decembre",
      ],
      de: [
        "Januar",
        "Februar",
        "Marz",
        "April",
        "Mai",
        "Juni",
        "Juli",
        "August",
        "September",
        "Oktober",
        "November",
        "Dezember",
      ],
      pt: [
        "Janeiro",
        "Fevereiro",
        "Marco",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
      ],
      pl: [
        "Styczen",
        "Luty",
        "Marzec",
        "Kwiecien",
        "Maj",
        "Czerwiec",
        "Lipiec",
        "Sierpien",
        "Wrzesien",
        "Pazdziernik",
        "Listopad",
        "Grudzien",
      ],
      nl: [
        "Januari",
        "Februari",
        "Maart",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Augustus",
        "September",
        "Oktober",
        "November",
        "December",
      ],
      ro: [
        "Ianuarie",
        "Februarie",
        "Martie",
        "Aprilie",
        "Mai",
        "Iunie",
        "Iulie",
        "August",
        "Septembrie",
        "Octombrie",
        "Noiembrie",
        "Decembrie",
      ],
      el: [
        "Ιανουαριος",
        "Φεβρουαριος",
        "Μαρτιος",
        "Απριλιος",
        "Μαιος",
        "Ιουνιος",
        "Ιουλιος",
        "Αυγουστος",
        "Σεπτεμβριος",
        "Οκτωβριος",
        "Νοεμβριος",
        "Δεκεμβριος",
      ],
    };
    var list = names[lang] || names.en;
    return list[index] || MONTHS_FULL[index] || "";
  }
  function translatePopupText(value) {
    var raw = String(value == null ? "" : value);
    if (!raw) return raw;
    var exact = translateUiRuntimeText(raw);
    if (exact && exact !== raw) return exact;
    var out = raw;
    try {
      (runtimeTranslationKeys || []).forEach(function (k) {
        if (!k || k.length < 10) return;
        var v = runtimeTranslationMap && runtimeTranslationMap[k];
        if (!v || v === k) return;
        if (out.indexOf(k) >= 0) out = out.split(k).join(String(v));
      });
    } catch (e) {}
    return out;
  }
  function inferToastPresentation(text, base) {
    var raw = String(text || "").toLowerCase();
    var b = { ...(base || {}) };
    var isSuccess =
      /(aggiornat|salvat|creat|eliminat|pronto|registrat|accettat|inviat|caricat|ripristinat|copiat|aggiunt|modificat|password aggiornata|piano aggiornato|widget aggiornato)/i.test(
        text || ""
      );
    var isBlock =
      /(errore|non puoi|non disponibile|non valido|non supportato|nessun valore|non completato|annullato|limite massimo|operazione extra non sbloccata|configurazione acquisto non disponibile|link supporto non disponibile|inserisci |seleziona almeno|raggiunto il limite|hai terminato|disponibile dal piano|available from the|available dal|non consentit)/i.test(
        text || ""
      );
    var isWarn =
      /(sta per partire un annuncio|caricamento annuncio|in attesa|ti resta|ne hai ancora|guarda un annuncio|limiti inclusi|backup|ripristinare|conferma|continuare|attenzione|annuncio)/i.test(
        text || ""
      );
    if (isBlock) {
      b.type = b.type || "error";
      b.color = b.color || (b.type === "warning" ? "#FFD84D" : "#E24B4A");
      b.icon = b.icon || "🚫";
    } else if (isWarn) {
      b.type = b.type || "warning";
      b.color = b.color || "#EF9F27";
      b.icon = b.icon || "⚠️";
    } else if (isSuccess) {
      b.type = b.type || "success";
      b.color = b.color || "#1D9E75";
      b.icon = b.icon || "✅";
    }
    return b;
  }
  function setToast(msg) {
    if (typeof msg === "function") {
      publishFainanceToast(msg(FAINANCE_TOAST_CURRENT));
      return;
    }
    if (!msg) {
      publishFainanceToast(null);
      return;
    }
    var base =
      typeof msg === "object" && !Array.isArray(msg)
        ? msg
        : { text: String(msg) };
    var rawText = String((base && base.text) || (base && base.message) || "");
    var cleanBase = { ...base };
    var finalText = cleanBase.translated
      ? String(rawText)
      : translatePopupText(rawText);
    delete cleanBase.translated;
    cleanBase = inferToastPresentation(finalText, cleanBase);
    publishFainanceToast({
      ...cleanBase,
      text: finalText,
      id: Date.now() + Math.random(),
    });
  }

  var FAINANCE_CURRENT_VERSION = "2.0.0";
  var FAINANCE_CURRENT_VERSION_CODE = 209;
  var FAINANCE_ANDROID_PACKAGE_ID = "it.fainanceapp.app";
  var FAINANCE_PLAY_STORE_MARKET_URL =
    "market://details?id=" + FAINANCE_ANDROID_PACKAGE_ID;
  var FAINANCE_PLAY_STORE_WEB_URL =
    "https://play.google.com/store/apps/details?id=" +
    FAINANCE_ANDROID_PACKAGE_ID;
  var FAINANCE_APP_STORE_SEARCH_URL =
    "https://apps.apple.com/it/search?term=fAInance";
  function appUpdatePlatform() {
    try {
      var cap = (window as any).Capacitor;
      if (cap && cap.getPlatform)
        return String(cap.getPlatform() || "").toLowerCase();
    } catch (e) {}
    return "web";
  }
  function appUpdatePick(cfg: any, keys: Array<string>, fallback?: any) {
    cfg = cfg || {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (cfg[k] !== undefined && cfg[k] !== null && cfg[k] !== "")
        return cfg[k];
    }
    return fallback;
  }
  function appUpdateCode(v: any) {
    var n = parseInt(String(v == null ? "" : v).replace(/[^0-9]/g, ""), 10);
    return isNaN(n) ? 0 : n;
  }
  function appUpdateCompareVersion(a: any, b: any) {
    var aa = String(a || "")
      .split(".")
      .map(function (x) {
        return parseInt(x, 10) || 0;
      });
    var bb = String(b || "")
      .split(".")
      .map(function (x) {
        return parseInt(x, 10) || 0;
      });
    for (var i = 0; i < Math.max(aa.length, bb.length, 3); i++) {
      var x = aa[i] || 0,
        y = bb[i] || 0;
      if (x > y) return 1;
      if (x < y) return -1;
    }
    return 0;
  }
  function appUpdateAppleId(value: any) {
    var match = String(value || "").match(/(?:\/id|id=)(\d{6,})/i);
    return match ? match[1] : "";
  }
  function appUpdateIosDeepLink(url: any, trackId?: any) {
    var id = String(trackId || appUpdateAppleId(url) || "");
    return id ? "itms-apps://apps.apple.com/app/id" + id : String(url || "");
  }
  async function appUpdateCurrentInfo() {
    var info: any = {
      version: FAINANCE_CURRENT_VERSION,
      code: FAINANCE_CURRENT_VERSION_CODE,
      platform: appUpdatePlatform(),
    };
    try {
      if (isNativePlatform()) {
        var mod: any = await import("@capacitor/app");
        if (mod && mod.App && mod.App.getInfo) {
          var nativeInfo = await mod.App.getInfo().catch(function () {
            return null;
          });
          if (nativeInfo) {
            info.version = String(nativeInfo.version || info.version || "");
            info.code = appUpdateCode(
              nativeInfo.build || nativeInfo.versionCode || info.code
            );
            info.id = String(nativeInfo.id || "");
            info.name = String(nativeInfo.name || "");
          }
        }
      }
    } catch (e) {}
    return info;
  }
  async function appUpdateNativePlayConfig(current: any) {
    if (!current || current.platform !== "android" || !isNativePlatform())
      return null;
    try {
      var plugin = nativePlugin("FainanceAppUpdate");
      if (!plugin || !plugin.checkForUpdate) return null;
      var nativeResult: any = await fainancePromiseTimeout(
        plugin.checkForUpdate(),
        5500,
        "Controllo aggiornamenti Google Play scaduto."
      ).catch(function () {
        return null;
      });
      if (!nativeResult) return null;
      var availability =
        Number(
          nativeResult.updateAvailability || nativeResult.availability || 0
        ) || 0;
      var updateFlag =
        nativeResult.updateAvailable === true ||
        String(nativeResult.updateAvailable || "").toLowerCase() === "true" ||
        availability === 2 ||
        availability === 3 ||
        String(nativeResult.status || nativeResult.updateStatus || "")
          .toUpperCase()
          .indexOf("UPDATE_AVAILABLE") >= 0;
      var availableCode = appUpdateCode(
        nativeResult.availableVersionCode ||
          nativeResult.latestVersionCode ||
          nativeResult.versionCode
      );
      var availableVersion = String(
        nativeResult.availableVersionName ||
          nativeResult.latestVersionName ||
          nativeResult.latestVersion ||
          ""
      );
      var newerByCode =
        availableCode > 0 && availableCode > appUpdateCode(current.code);
      var newerByVersion =
        availableVersion &&
        appUpdateCompareVersion(availableVersion, current.version) > 0;
      if (!updateFlag && !newerByCode && !newerByVersion) return null;
      if (
        availableCode > 0 &&
        availableCode <= appUpdateCode(current.code) &&
        !newerByVersion
      )
        return null;
      return {
        enabled: true,
        confirmedUpdateAvailable: true,
        androidLatestVersionCode: availableCode,
        androidLatestVersion: availableVersion,
        androidStoreUrl: FAINANCE_PLAY_STORE_MARKET_URL,
        androidStoreWebUrl: FAINANCE_PLAY_STORE_WEB_URL,
        titleIt: "Aggiornamento disponibile",
        messageIt:
          "È disponibile una nuova versione di fAInance su Google Play. Aggiorna l'app per ricevere le ultime correzioni e miglioramenti.",
        displayLatestVersion: !!availableVersion || availableCode > 0,
        source: "google_play",
      };
    } catch (e) {
      return null;
    }
  }
  async function appUpdateIosStoreConfig(current: any) {
    if (!current || current.platform !== "ios" || !isNativePlatform())
      return null;
    var bundleId = String(current.id || "").trim();
    if (!bundleId) return null;
    var cached =
      appUpdateStoreCacheRef.current &&
      appUpdateStoreCacheRef.current.iosLookup;
    if (
      cached &&
      cached.bundleId === bundleId &&
      Date.now() - Number(cached.savedAt || 0) < 15 * 60 * 1000
    )
      return cached.config || null;
    var encoded = encodeURIComponent(bundleId);
    var urls = [
      "https://itunes.apple.com/lookup?bundleId=" + encoded + "&country=it",
      "https://itunes.apple.com/lookup?bundleId=" + encoded,
    ];
    try {
      var responses: any[] = await Promise.all(
        urls.map(function (url) {
          return fainancePromiseTimeout(
            fetch(url, {
              cache: "no-store",
              headers: { Accept: "application/json" },
            }),
            6500,
            "Controllo aggiornamenti App Store scaduto."
          ).catch(function () {
            return null;
          });
        })
      );
      var result: any = null;
      for (var i = 0; i < responses.length && !result; i++) {
        var response = responses[i];
        if (!response || !response.ok) continue;
        var json: any = await response.json().catch(function () {
          return null;
        });
        var list = json && Array.isArray(json.results) ? json.results : [];
        result =
          list.find(function (item) {
            return String((item && item.bundleId) || "") === bundleId;
          }) ||
          list[0] ||
          null;
      }
      if (!result) return null;
      var webUrl = String(result.trackViewUrl || "");
      var trackId = String(result.trackId || appUpdateAppleId(webUrl) || "");
      var cfg: any = {
        enabled: true,
        iosLatestVersion: String(result.version || ""),
        iosStoreUrl: appUpdateIosDeepLink(webUrl, trackId),
        iosStoreWebUrl: webUrl,
        appStoreId: trackId,
        titleIt: "Aggiornamento disponibile",
        messageIt:
          "È disponibile una nuova versione di fAInance su App Store. Aggiorna l'app per ricevere le ultime correzioni e miglioramenti.",
        source: "app_store_lookup",
      };
      appUpdateStoreCacheRef.current.iosLookup = {
        bundleId: bundleId,
        savedAt: Date.now(),
        config: cfg,
      };
      return cfg;
    } catch (e) {
      return null;
    }
  }
  async function appUpdateRemoteConfigs() {
    var sources: any[] = [];
    function addSource(value: any) {
      if (!value || typeof value !== "object") return;
      try {
        var key = JSON.stringify(value);
        if (
          sources.some(function (x) {
            try {
              return JSON.stringify(x) === key;
            } catch (e) {
              return x === value;
            }
          })
        )
          return;
      } catch (e) {}
      sources.push(value);
    }
    var tasks: any[] = [];
    [
      function () {
        return getDoc(doc(fbDb, "appConfig", "version"));
      },
      function () {
        return getDoc(doc(fbDb, "config", "appVersion"));
      },
    ].forEach(function (read) {
      tasks.push(
        (async function () {
          try {
            var snap: any = await fainancePromiseTimeout(
              read(),
              4500,
              "Lettura configurazione aggiornamenti scaduta."
            ).catch(function () {
              return null;
            });
            if (snap && snap.exists && snap.exists()) addSource(snap.data());
          } catch (e) {}
        })()
      );
    });
    [
      "https://fainanceapp.it/app-version.json",
      "https://fainanceapp.it/version.json",
    ].forEach(function (url) {
      tasks.push(
        (async function () {
          try {
            var res: any = await fainancePromiseTimeout(
              fetch(url, {
                cache: "no-store",
                headers: { Accept: "application/json" },
              }),
              4500,
              "Controllo aggiornamenti web scaduto."
            ).catch(function () {
              return null;
            });
            if (res && res.ok) {
              var json: any = await res.json().catch(function () {
                return null;
              });
              addSource(json);
            }
          } catch (e) {}
        })()
      );
    });
    await Promise.all(tasks);
    return sources;
  }
  function appUpdateScopedConfig(cfg: any, platform: string) {
    if (!cfg || typeof cfg !== "object") return cfg || {};
    var base: any = cfg;
    [
      cfg.data,
      cfg.update,
      cfg.appUpdate,
      cfg.appVersion,
      cfg.versionConfig,
    ].some(function (candidate) {
      if (
        candidate &&
        typeof candidate === "object" &&
        !Array.isArray(candidate)
      ) {
        base = { ...cfg, ...candidate };
        return true;
      }
      return false;
    });
    var nested =
      base[platform] ||
      (base.platforms && base.platforms[platform]) ||
      (base.platform &&
        typeof base.platform === "object" &&
        base.platform[platform]);
    if (nested && typeof nested === "object" && !Array.isArray(nested))
      return { ...base, ...nested };
    return base;
  }
  function appUpdateStoreUrl(platform: string, cfg: any) {
    cfg = appUpdateScopedConfig(cfg || {}, platform);
    if (platform === "ios") {
      return String(
        appUpdatePick(
          cfg,
          [
            "iosStoreUrl",
            "appStoreUrl",
            "iosStoreWebUrl",
            "trackViewUrl",
            "storeUrl",
          ],
          FAINANCE_APP_STORE_SEARCH_URL
        )
      );
    }
    if (platform === "android") {
      return String(
        appUpdatePick(
          cfg,
          ["androidStoreUrl", "playStoreUrl", "googlePlayUrl", "storeUrl"],
          FAINANCE_PLAY_STORE_MARKET_URL
        )
      );
    }
    return String(
      appUpdatePick(
        cfg,
        ["webStoreUrl", "websiteUrl", "storeUrl"],
        "https://fainanceapp.it/"
      )
    );
  }
  function appUpdateStoreWebUrl(platform: string, cfg: any) {
    cfg = appUpdateScopedConfig(cfg || {}, platform);
    if (platform === "ios")
      return String(
        appUpdatePick(
          cfg,
          [
            "iosStoreWebUrl",
            "trackViewUrl",
            "appStoreUrl",
            "iosStoreUrl",
            "storeUrl",
          ],
          FAINANCE_APP_STORE_SEARCH_URL
        )
      ).replace(/^itms-apps:/i, "https:");
    if (platform === "android")
      return String(
        appUpdatePick(
          cfg,
          [
            "androidStoreWebUrl",
            "playStoreUrl",
            "googlePlayUrl",
            "androidStoreUrl",
            "storeUrl",
          ],
          FAINANCE_PLAY_STORE_WEB_URL
        )
      ).replace(
        /^market:\/\/details/i,
        "https://play.google.com/store/apps/details"
      );
    return String(
      appUpdatePick(
        cfg,
        ["webStoreUrl", "websiteUrl", "storeUrl"],
        "https://fainanceapp.it/"
      )
    );
  }
  function appUpdateDismissKey(targetCode: any) {
    return "fainance_update_popup_dismissed_" + String(targetCode || "latest");
  }
  function appUpdateShouldShow(cfg: any, current: any, options?: any) {
    if (!cfg || cfg.enabled === false || cfg.active === false) return null;
    var platform = current.platform || appUpdatePlatform();
    cfg = appUpdateScopedConfig(cfg, platform);
    var prefix =
      platform === "ios" ? "ios" : platform === "android" ? "android" : "web";
    var latestCode = appUpdateCode(
      appUpdatePick(cfg, [
        prefix + "LatestVersionCode",
        "latest" +
          prefix.charAt(0).toUpperCase() +
          prefix.slice(1) +
          "VersionCode",
        prefix + "VersionCode",
        "latestVersionCode" + prefix.charAt(0).toUpperCase() + prefix.slice(1),
        "latestVersionCode",
        "versionCode",
      ])
    );
    var minCode = appUpdateCode(
      appUpdatePick(cfg, [
        prefix + "MinVersionCode",
        prefix + "MinimumVersionCode",
        "minimum" +
          prefix.charAt(0).toUpperCase() +
          prefix.slice(1) +
          "VersionCode",
        "minVersionCode" + prefix.charAt(0).toUpperCase() + prefix.slice(1),
        "minimumVersionCode",
        "minVersionCode",
        "requiredVersionCode",
      ])
    );
    var latestVersion = String(
      appUpdatePick(
        cfg,
        [
          prefix + "LatestVersion",
          "latest" +
            prefix.charAt(0).toUpperCase() +
            prefix.slice(1) +
            "Version",
          prefix + "Version",
          "latestVersion",
          "version",
        ],
        ""
      )
    );
    var currentCode = appUpdateCode(
      current.code || FAINANCE_CURRENT_VERSION_CODE
    );
    var currentVersion = String(
      current.version || FAINANCE_CURRENT_VERSION || ""
    );
    var byCode = latestCode > 0 && currentCode > 0 && latestCode > currentCode;
    var byVersion =
      !byCode &&
      latestVersion &&
      currentVersion &&
      appUpdateCompareVersion(latestVersion, currentVersion) > 0;
    var force = minCode > 0 && currentCode > 0 && currentCode < minCode;
    var confirmed = cfg.confirmedUpdateAvailable === true;
    if (!byCode && !byVersion && !force && !confirmed) return null;
    var targetCode =
      latestCode ||
      latestVersion ||
      (confirmed
        ? platform +
          "_after_" +
          String(currentCode || currentVersion || "current")
        : "latest");
    if (!force && !(options && options.ignoreDismissed)) {
      try {
        var dismissed = localStorage.getItem(appUpdateDismissKey(targetCode));
        if (dismissed === "never" || dismissed === "1" || dismissed === "true")
          return null;
      } catch (e) {}
    }
    return {
      platform: platform,
      force: force,
      currentVersion: currentVersion,
      currentCode: currentCode,
      latestVersion:
        appUpdatePick(cfg, ["displayLatestVersion"], true) === false
          ? ""
          : latestVersion || String(latestCode || ""),
      latestCode: latestCode,
      storeUrl: appUpdateStoreUrl(platform, cfg),
      storeWebUrl: appUpdateStoreWebUrl(platform, cfg),
      title: String(
        appUpdatePick(
          cfg,
          ["title_" + lang, "titleIt", "title"],
          L("Aggiornamento disponibile")
        )
      ),
      message: String(
        appUpdatePick(
          cfg,
          ["message_" + lang, "messageIt", "message"],
          L(
            "È disponibile una nuova versione di fAInance. Aggiorna l'app per avere le ultime correzioni e miglioramenti."
          )
        )
      ),
      targetCode: targetCode,
    };
  }
  function bestAppUpdateCandidate(candidates: any[]) {
    var list = (candidates || []).filter(Boolean);
    if (!list.length) return null;
    return list.sort(function (a, b) {
      var ac = appUpdateCode(a.latestCode || a.targetCode),
        bc = appUpdateCode(b.latestCode || b.targetCode);
      if (ac !== bc) return bc - ac;
      return appUpdateCompareVersion(
        b.latestVersion || "",
        a.latestVersion || ""
      );
    })[0];
  }
  async function checkAppUpdatePopup(options?: any) {
    if (appUpdateCheckPromiseRef.current)
      return appUpdateCheckPromiseRef.current;
    var check = (async function () {
      try {
        var current = await appUpdateCurrentInfo();
        setInstalledAppInfo(current);
        var results: any[] = await Promise.all([
          appUpdateNativePlayConfig(current).catch(function () {
            return null;
          }),
          appUpdateIosStoreConfig(current).catch(function () {
            return null;
          }),
          appUpdateRemoteConfigs().catch(function () {
            return [];
          }),
        ]);
        var configs: any[] = [];
        if (results[0]) configs.push(results[0]);
        if (results[1]) configs.push(results[1]);
        (results[2] || []).forEach(function (cfg) {
          if (cfg) configs.push(cfg);
        });
        var candidates = configs
          .map(function (cfg) {
            return appUpdateShouldShow(cfg, current, options);
          })
          .filter(Boolean);
        var info = bestAppUpdateCandidate(candidates);
        if (info)
          setAppUpdatePopup(function (prev) {
            return prev &&
              String(prev.targetCode) === String(info.targetCode) &&
              String(prev.platform) === String(info.platform)
              ? prev
              : info;
          });
        return info || null;
      } catch (e) {
        return null;
      }
    })();
    appUpdateCheckPromiseRef.current = check;
    try {
      return await check;
    } finally {
      if (appUpdateCheckPromiseRef.current === check)
        appUpdateCheckPromiseRef.current = null;
    }
  }
  async function appUpdatePreferredStore(current?: any) {
    var info = current || (await appUpdateCurrentInfo());
    var platform = String(
      (info && info.platform) || appUpdatePlatform() || "web"
    );
    if (platform === "android")
      return {
        platform: platform,
        url: FAINANCE_PLAY_STORE_MARKET_URL,
        webUrl: FAINANCE_PLAY_STORE_WEB_URL,
      };
    if (platform === "ios") {
      var iosCfg = await appUpdateIosStoreConfig(info).catch(function () {
        return null;
      });
      if (iosCfg)
        return {
          platform: platform,
          url: appUpdateStoreUrl(platform, iosCfg),
          webUrl: appUpdateStoreWebUrl(platform, iosCfg),
        };
      var remotes: any[] = await appUpdateRemoteConfigs().catch(function () {
        return [];
      });
      for (var i = 0; i < remotes.length; i++) {
        var candidate = appUpdateStoreUrl(platform, remotes[i]);
        if (candidate && candidate !== FAINANCE_APP_STORE_SEARCH_URL)
          return {
            platform: platform,
            url: candidate,
            webUrl: appUpdateStoreWebUrl(platform, remotes[i]),
          };
      }
      return {
        platform: platform,
        url: FAINANCE_APP_STORE_SEARCH_URL,
        webUrl: FAINANCE_APP_STORE_SEARCH_URL,
      };
    }
    return {
      platform: platform,
      url: "https://fainanceapp.it/",
      webUrl: "https://fainanceapp.it/",
    };
  }
  function openFainanceStoreUrl(
    url: any,
    platform?: string,
    webFallback?: any
  ) {
    var target = String(url || "");
    var p = String(platform || appUpdatePlatform() || "web");
    var fallback = String(webFallback || "");
    if (!target) return false;
    try {
      if (isNativePlatform() && (p === "ios" || p === "android")) {
        if (p === "ios" && /^https:\/\/apps\.apple\.com\//i.test(target))
          target = appUpdateIosDeepLink(target);
        window.location.href = target;
        if (fallback && fallback !== target) {
          setTimeout(function () {
            try {
              if (
                typeof document !== "undefined" &&
                document.visibilityState === "visible"
              )
                window.open(fallback, "_blank");
            } catch (e) {}
          }, 1300);
        }
        return true;
      }
      if (window && window.open) {
        window.open(fallback || target, "_blank");
        return true;
      }
      window.location.href = fallback || target;
      return true;
    } catch (e) {
      try {
        if (fallback) {
          window.open(fallback, "_blank");
          return true;
        }
      } catch (e2) {}
      return false;
    }
  }
  function dismissAppUpdatePopup() {
    try {
      if (appUpdatePopup && !appUpdatePopup.force)
        localStorage.setItem(
          appUpdateDismissKey(appUpdatePopup.targetCode),
          "never"
        );
    } catch (e) {}
    setAppUpdatePopup(null);
  }
  async function openAppUpdateStore() {
    var platform = String(
      (appUpdatePopup && appUpdatePopup.platform) ||
        appUpdatePlatform() ||
        "web"
    );
    var url =
      appUpdatePopup && appUpdatePopup.storeUrl
        ? String(appUpdatePopup.storeUrl)
        : "";
    var webUrl =
      appUpdatePopup && appUpdatePopup.storeWebUrl
        ? String(appUpdatePopup.storeWebUrl)
        : "";
    if (!url) {
      var store = await appUpdatePreferredStore();
      platform = store.platform;
      url = store.url;
      webUrl = store.webUrl;
    }
    openFainanceStoreUrl(url, platform, webUrl);
  }
  function AppUpdateModal() {
    if (!appUpdatePopup) return null;
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10050,
          background: "rgba(0,0,0,.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10vh 18px 2vh",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 390,
            background: cardBg,
            color: textC,
            border: "1px solid " + borderC,
            borderRadius: 22,
            boxShadow: "0 18px 50px rgba(0,0,0,.28)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {!appUpdatePopup.force && (
            <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
              <PopupCloseButton onClick={dismissAppUpdatePopup} dark={dark} label={translatePopupText("Chiudi")} />
            </div>
          )}
          <div
            style={{
              padding: "18px 56px 14px 18px",
              background:
                "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
              color: "#fff",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                fontSize: 16,
                fontWeight: 950,
                letterSpacing: "-.55px",
                lineHeight: 1,
                marginBottom: 8,
                textShadow: "0 1px 8px rgba(0,0,0,.12)",
              }}
            >
              <span>f</span>
              <span style={{ fontWeight: 1000, letterSpacing: "-.9px" }}>
                AI
              </span>
              <span>nance</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.15 }}>
              🚀{" "}
              {translatePopupText(
                appUpdatePopup.title || "Aggiornamento disponibile"
              )}
            </div>
          </div>
          <div
            style={{
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 14, lineHeight: 1.45, color: textC }}>
              {(function () {
                var msg = String(
                  translatePopupText(
                    appUpdatePopup.message ||
                      "È disponibile una nuova versione di fAInance."
                  ) || ""
                );
                var needle = "precedente";
                var pos = msg.toLocaleLowerCase().indexOf(needle);
                if (pos < 0) return msg;
                var cut = pos + needle.length;
                return (
                  <>
                    {msg.slice(0, cut)}
                    <br />
                    {msg.slice(cut).replace(/^\s+/, "")}
                  </>
                );
              })()}
            </div>
            <div
              style={{
                fontSize: 12,
                color: subC,
                background: dark ? "#252535" : "#f7f7fb",
                border: "1px solid " + borderC,
                borderRadius: 12,
                padding: "9px 10px",
              }}
            >
              {translatePopupText("Versione installata")}:{" "}
              <b>{appUpdatePopup.currentVersion || "—"}</b>
              {appUpdatePopup.latestVersion && (
                <span>
                  {" "}
                  · {translatePopupText("Nuova versione")}:{" "}
                  <b>{appUpdatePopup.latestVersion}</b>
                </span>
              )}
            </div>
            <button
              onClick={openAppUpdateStore}
              style={{
                width: "100%",
                border: "none",
                borderRadius: btnRadius,
                padding: "12px 14px",
                background:
                  "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                color: "#fff",
                fontSize: 15,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {translatePopupText("Aggiorna ora")}
            </button>
            {!appUpdatePopup.force && (
              <button
                onClick={dismissAppUpdatePopup}
                style={{
                  width: "100%",
                  border: "1px solid " + borderC,
                  borderRadius: btnRadius,
                  padding: "11px 14px",
                  background: dark ? "#242435" : "#fff",
                  color: subC,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {translatePopupText("Non mostrare più")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  function markOnboardingGuideLocallySeen() {
    onboardingGuideLocalSeenRef.current = true;
    writeLocalOnboardingFlag("onboarding_guide_completed_local_v2");
  }
  function persistOnboardingFlowComplete() {
    onboardingGuideLocalSeenRef.current = true;
    onboardingFlowCompleteRef.current = true;
    writeLocalOnboardingFlag("onboarding_guide_completed_local_v2");
    writeLocalOnboardingFlag("onboarding_flow_complete_v2");
    setOnboardingGuideSeen(true);
    setInitialSetupStatus("complete");
  }
  function onboardingGuideEligibleNow() {
    if (
      onboardingFlowCompleteRef.current ||
      onboardingGuideLocalSeenRef.current
    )
      return false;
    if (
      readLocalOnboardingFlag("onboarding_flow_complete_v2") ||
      readLocalOnboardingFlag("onboarding_guide_completed_local_v2")
    )
      return false;
    if (onboardingGuideSeen) return false;
    var acceptedAt = Date.parse(String(legalAcceptanceDate || ""));
    if (!acceptedAt || isNaN(acceptedAt)) return false;
    return Date.now() - acceptedAt <= 7 * 24 * 60 * 60 * 1000;
  }

  useEffect(
    function () {
      if (
        appLocked ||
        !termsAccepted ||
        !privacyAccepted ||
        onboardingGuideOpen ||
        initialSetupOpen
      )
        return;
      var delay = onboardingGuideEligibleNow() ? 4200 : 1600;
      var t = setTimeout(checkAppUpdatePopup, delay);
      return function () {
        clearTimeout(t);
      };
    },
    [
      appLocked,
      termsAccepted,
      privacyAccepted,
      lang,
      onboardingGuideSeen,
      onboardingGuideOpen,
      initialSetupOpen,
      legalAcceptanceDate,
    ]
  );

  useEffect(
    function () {
      if (
        appLocked ||
        !termsAccepted ||
        !privacyAccepted ||
        onboardingGuideOpen ||
        initialSetupOpen
      )
        return;
      var cancelled = false;
      var nativeHandle: any = null;
      var lastCheck = 0;
      function runForegroundCheck() {
        if (cancelled) return;
        try {
          if (
            typeof document !== "undefined" &&
            document.visibilityState === "hidden"
          )
            return;
        } catch (e) {}
        var now = Date.now();
        if (now - lastCheck < 90000) return;
        lastCheck = now;
        checkAppUpdatePopup();
      }
      try {
        window.addEventListener("focus", runForegroundCheck);
        document.addEventListener("visibilitychange", runForegroundCheck);
      } catch (e) {}
      if (isNativePlatform()) {
        import("@capacitor/app")
          .then(function (mod: any) {
            if (cancelled || !mod || !mod.App || !mod.App.addListener) return;
            return mod.App.addListener("appStateChange", function (state: any) {
              if (state && state.isActive) runForegroundCheck();
            });
          })
          .then(function (handle: any) {
            if (cancelled) {
              try {
                handle && handle.remove && handle.remove();
              } catch (e) {}
            } else nativeHandle = handle;
          })
          .catch(function () {});
      }
      return function () {
        cancelled = true;
        try {
          window.removeEventListener("focus", runForegroundCheck);
          document.removeEventListener("visibilitychange", runForegroundCheck);
        } catch (e) {}
        try {
          nativeHandle && nativeHandle.remove && nativeHandle.remove();
        } catch (e) {}
      };
    },
    [
      appLocked,
      termsAccepted,
      privacyAccepted,
      onboardingGuideOpen,
      initialSetupOpen,
      lang,
    ]
  );

  useEffect(
    function () {
      if (appLocked || !termsAccepted || !privacyAccepted) return;
      if (
        onboardingGuideOpen ||
        initialSetupOpen ||
        !onboardingGuideEligibleNow()
      )
        return;
      var t = setTimeout(function () {
        setOnboardingGuideStep(0);
        setOnboardingGuideOpen(true);
      }, 850);
      return function () {
        clearTimeout(t);
      };
    },
    [
      appLocked,
      termsAccepted,
      privacyAccepted,
      onboardingGuideSeen,
      onboardingGuideOpen,
      initialSetupOpen,
      userId,
      legalAcceptanceDate,
    ]
  );

  function markOnboardingGuideDone() {
    markOnboardingGuideLocallySeen();
    setOnboardingGuideSeen(true);
    setOnboardingGuideOpen(false);
    setOnboardingGuideStep(0);
    setInitialSetupStatus("essential_pending");
    openEssentialSetup();
  }

  function resetEssentialSetupDrafts() {
    setSetupLang(function (current) {
      var code = String(current || getDefaultLang())
        .split("-")[0]
        .toLowerCase();
      return LANGUAGES.some(function (x) {
        return x.code === code;
      })
        ? code
        : getDefaultLang();
    });
    setSetupCurrency("EUR");
    setSetupDateFmt(getDefaultDateFormat());
    setSetupFirstDay("mon");
    setSetupBalanceView("rateizzato");
    setSetupIncomeType("salario");
    setSetupExpenseCat("4");
    setSetupExpenseMethod("8");
  }
  function resetAdvancedSetupDrafts() {
    setSetupBiometric(!!biometricLockEnabled);
    setSetupShowSummary(showAppSummaryHeader !== false);
    setSetupNavIcons(Math.max(3, Math.min(7, Number(mobileNavIconCount || 5))));
    setSetupHistoryDate(
      historySortDate === "created" ? "created" : "operation"
    );
    setSetupHistoryDirection(historySortDirection === "asc" ? "asc" : "desc");
    setSetupShowShareHistory(showShareInHistory !== false);
  }
  function openEssentialSetup() {
    resetEssentialSetupDrafts();
    setSetupPicker("");
    setSetupPickerSearch("");
    setInitialSetupMode("essential");
    setInitialSetupStep(0);
    setInitialSetupOpen(true);
  }
  function openAdvancedSetup() {
    resetAdvancedSetupDrafts();
    setSetupPicker("");
    setSetupPickerSearch("");
    setInitialSetupMode("advanced");
    setInitialSetupStep(0);
    setInitialSetupOpen(true);
  }
  useEffect(
    function () {
      if (appLocked || !termsAccepted || !privacyAccepted) return;
      if (
        onboardingFlowCompleteRef.current ||
        readLocalOnboardingFlag("onboarding_flow_complete_v2")
      ) {
        onboardingFlowCompleteRef.current = true;
        if (initialSetupStatus !== "complete")
          setInitialSetupStatus("complete");
        if (onboardingGuideOpen) setOnboardingGuideOpen(false);
        if (initialSetupOpen) setInitialSetupOpen(false);
        return;
      }
      if (onboardingGuideOpen || initialSetupOpen) return;
      if (initialSetupStatus === "essential_pending") {
        openEssentialSetup();
        return;
      }
      if (initialSetupStatus === "advanced_pending") {
        openAdvancedSetup();
        return;
      }
      if (!initialSetupStatus && onboardingGuideSeen) {
        setInitialSetupStatus("complete");
        return;
      }
      if (
        !initialSetupStatus &&
        !onboardingGuideSeen &&
        !onboardingGuideEligibleNow() &&
        legalAcceptanceDate
      ) {
        setInitialSetupStatus("complete");
      }
    },
    [
      appLocked,
      termsAccepted,
      privacyAccepted,
      onboardingGuideOpen,
      initialSetupOpen,
      initialSetupStatus,
      onboardingGuideSeen,
      legalAcceptanceDate,
      userId,
    ]
  );
  function applyEssentialSetup() {
    setLang(String(setupLang || getDefaultLang()));
    setCurrency(String(setupCurrency || "EUR"));
    setDateFmt(String(setupDateFmt || getDefaultDateFormat()));
    setFirstDayOfWeek(String(setupFirstDay || "mon"));
    setHomeBalanceView(setupBalanceView === "reale" ? "reale" : "rateizzato");
    setStatsView(setupBalanceView === "reale" ? "reale" : "rateizzato");
    setDefaultIncomeType(String(setupIncomeType || "salario"));
    setDefaultExpenseCat(String(setupExpenseCat || "4"));
    setDefaultExpenseMethod(String(setupExpenseMethod || "8"));
    var income = incomeTypes.find(function (x) {
      return String(x.id) === String(setupIncomeType);
    });
    var expense = cats.find(function (x) {
      return String(x.id) === String(setupExpenseCat);
    });
    var method = methods.find(function (x) {
      return String(x.id) === String(setupExpenseMethod);
    });
    if (income && income.group) setDefaultIncomeArea(String(income.group));
    if (expense && expense.group) setDefaultExpenseArea(String(expense.group));
    if (method && method.group) setDefaultMethodArea(String(method.group));
  }
  function logMetaRegistrationOnce() {
    if (!metaEventsConsent) return;
    var key = userKey("meta_complete_registration_logged_v1");
    try {
      if (localStorage.getItem(key) === "1") return;
    } catch (e) {}
    fainanceLogMetaEvent("fb_mobile_complete_registration", undefined, {
      registration_method: "fainance_account",
    })
      .then(function (result: any) {
        if (result && result.success) {
          try {
            localStorage.setItem(key, "1");
          } catch (e) {}
        }
      })
      .catch(function (e) {
        console.warn("Meta registration event failed", (e && e.message) || e);
      });
  }
  function completeEssentialSetup(openAdvanced) {
    applyEssentialSetup();
    logMetaRegistrationOnce();
    if (openAdvanced) {
      setInitialSetupStatus("advanced_pending");
      openAdvancedSetup();
    } else {
      persistOnboardingFlowComplete();
      setInitialSetupOpen(false);
      setInitialSetupStep(0);
    }
  }
  async function chooseSetupBiometric(value) {
    if (!value) {
      setSetupBiometric(false);
      return;
    }
    var available = await checkBiometricAvailability();
    if (!available.available) {
      setSetupBiometric(false);
      setToast({
        text: L(
          available.reason ||
            "Il controllo biometrico non è disponibile o non è configurato su questo dispositivo."
        ),
        type: "warning",
        icon: "⚠️",
        color: "#EF9F27",
      });
      return;
    }
    var confirmed = await requestBiometricUnlock(
      L("Conferma l’attivazione del blocco biometrico")
    );
    if (confirmed !== true) {
      setSetupBiometric(false);
      setToast({
        text: L(biometricLockMessage || "Controllo biometrico non completato."),
        type: "warning",
        icon: "⚠️",
        color: "#EF9F27",
      });
      return;
    }
    setSetupBiometric(true);
    setToast({
      text: L(
        "Biometria verificata. La protezione verrà attivata al termine della configurazione."
      ),
      type: "success",
      icon: "🔐",
    });
  }
  function completeAdvancedSetup() {
    if (setupBiometric) {
      biometricInitialCheckRef.current = true;
      biometricBackgroundAtRef.current = null;
      biometricSkipAutoLockUntilRef.current = Date.now() + 5000;
      setLocalLockMethod("biometric");
      setBiometricLockEnabled(true);
      setAppLocked(false);
    } else setBiometricLockEnabled(false);
    setShowAppSummaryHeader(!!setupShowSummary);
    setMobileNavIconCount(Math.max(3, Math.min(7, Number(setupNavIcons || 5))));
    setHistorySortDate(
      setupHistoryDate === "created" ? "created" : "operation"
    );
    setHistorySortDirection(setupHistoryDirection === "asc" ? "asc" : "desc");
    setShowShareInHistory(!!setupShowShareHistory);
    persistOnboardingFlowComplete();
    setInitialSetupStep(2);
  }
  function finishAdvancedSetup() {
    persistOnboardingFlowComplete();
    setSetupPicker("");
    setSetupPickerSearch("");
    setInitialSetupOpen(false);
    setInitialSetupStep(0);
    setInitialSetupMode("essential");
  }
  function skipInitialSetup() {
    persistOnboardingFlowComplete();
    setSetupPicker("");
    setSetupPickerSearch("");
    setInitialSetupOpen(false);
    setInitialSetupStep(0);
    setInitialSetupMode("essential");
  }
  function InitialSetupModal() {
    var essential = initialSetupMode === "essential";
    var maxStep = essential ? 4 : 2;
    function SL(value: any) {
      var raw = String(value == null ? "" : value);
      var code = String(setupLang || lang || getDefaultLang() || "it");
      try {
        var table: any =
          (TRANSLATIONS as any)[code] || (TRANSLATIONS as any).it || {};
        var translated = table[raw];
        if (typeof translated === "string" && translated) return translated;
      } catch (e) {}
      return raw;
    }
    var step = Math.max(0, Math.min(initialSetupStep, maxStep));
    var primary = confirmButtonColor || "#378ADD";
    var panelStyle: any = {
      background: dark ? "#252535" : "#F7F9FC",
      border: "1px solid " + borderC,
      borderRadius: 16,
      padding: 14,
      display: "flex",
      flexDirection: "column",
      gap: 9,
    };
    var labelStyle: any = { fontSize: 12, fontWeight: 900, color: textC };
    function choice(
      id: any,
      label: any,
      selected: any,
      onClick: any,
      desc?: any
    ) {
      var active = String(selected) === String(id);
      return (
        <button
          type="button"
          onClick={onClick}
          style={{
            width: "100%",
            textAlign: "left",
            border: "1px solid " + (active ? primary : borderC),
            background: active
              ? dark
                ? primary + "2B"
                : primary + "12"
              : dark
              ? "#252535"
              : "#fff",
            borderRadius: 14,
            padding: "12px 13px",
            color: textC,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 11,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "2px solid " + (active ? primary : borderC),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {active && (
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: primary,
                }}
              />
            )}
          </span>
          <span>
            <span style={{ fontSize: 14, fontWeight: 900 }}>{SL(label)}</span>
            {desc && (
              <span
                style={{
                  display: "block",
                  fontSize: 12,
                  color: subC,
                  marginTop: 3,
                  lineHeight: 1.35,
                }}
              >
                {SL(desc)}
              </span>
            )}
          </span>
        </button>
      );
    }
    function switchControl(checked) {
      return (
        <span
          aria-hidden="true"
          style={{
            width: 46,
            height: 27,
            borderRadius: 999,
            background: checked ? primary : dark ? "#55556a" : "#CDD2DC",
            padding: 3,
            boxSizing: "border-box",
            flexShrink: 0,
            transition: "all .15s",
          }}
        >
          <span
            style={{
              display: "block",
              width: 21,
              height: 21,
              borderRadius: "50%",
              background: "#fff",
              transform: checked ? "translateX(19px)" : "translateX(0)",
              transition: "all .15s",
              boxShadow: "0 2px 6px rgba(0,0,0,.25)",
            }}
          />
        </span>
      );
    }
    function toggleRow(label, desc, checked, onChange) {
      return (
        <button
          type="button"
          onClick={onChange}
          style={{
            ...panelStyle,
            width: "100%",
            textAlign: "left",
            cursor: "pointer",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ paddingRight: 12 }}>
            <span
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 900,
                color: textC,
              }}
            >
              {SL(label)}
            </span>
            {desc && (
              <span
                style={{
                  display: "block",
                  fontSize: 12,
                  color: subC,
                  marginTop: 4,
                  lineHeight: 1.35,
                }}
              >
                {SL(desc)}
              </span>
            )}
          </span>
          {switchControl(checked)}
        </button>
      );
    }
    function openSetupPicker(id) {
      if (setupPickerActionRef.current) return;
      setSetupPickerSearch("");
      setSetupPicker(id);
    }
    function closeSetupPicker() {
      setupPickerActionRef.current = false;
      setSetupPicker("");
      setSetupPickerSearch("");
    }
    function setupDateLabel(id, example) {
      var labels: any = {
        it: { dmy: "GG/MM/AAAA", mdy: "MM/GG/AAAA", ymd: "AAAA-MM-GG" },
        en: { dmy: "DD/MM/YYYY", mdy: "MM/DD/YYYY", ymd: "YYYY-MM-DD" },
        es: { dmy: "DD/MM/AAAA", mdy: "MM/DD/AAAA", ymd: "AAAA-MM-DD" },
        fr: { dmy: "JJ/MM/AAAA", mdy: "MM/JJ/AAAA", ymd: "AAAA-MM-JJ" },
        de: { dmy: "TT/MM/JJJJ", mdy: "MM/TT/JJJJ", ymd: "JJJJ-MM-TT" },
        pt: { dmy: "DD/MM/AAAA", mdy: "MM/DD/AAAA", ymd: "AAAA-MM-DD" },
        pl: { dmy: "DD/MM/RRRR", mdy: "MM/DD/RRRR", ymd: "RRRR-MM-DD" },
        nl: { dmy: "DD/MM/JJJJ", mdy: "MM/DD/JJJJ", ymd: "JJJJ-MM-DD" },
        ro: { dmy: "ZZ/LL/AAAA", mdy: "LL/ZZ/AAAA", ymd: "AAAA-LL-ZZ" },
        el: { dmy: "ΗΗ/ΜΜ/ΕΕΕΕ", mdy: "ΜΜ/ΗΗ/ΕΕΕΕ", ymd: "ΕΕΕΕ-ΜΜ-ΗΗ" },
      };
      var code = String(setupLang || lang || "it");
      var map = labels[code] || labels.it;
      return String(map[id] || id) + " · " + String(example || "");
    }
    function cleanSetupOptionName(value: any) {
      return String(value || "")
        .replace(/^\s*[+＋]\s*/, "")
        .trim();
    }
    function setupOptionIcon(item: any, kind: any) {
      var icon = String((item && item.icon) || "").trim();
      if (icon !== "+" && icon !== "＋") return icon;
      var defaults =
        kind === "expense"
          ? DEFAULT_CATS
          : kind === "method"
          ? DEFAULT_METHODS
          : [];
      var canonical = (defaults || []).find(function (x) {
        return String(x.id) === String(item && item.id);
      });
      return String((canonical && canonical.icon) || "").trim();
    }
    function setupOptionLabel(item: any, kind: any) {
      var icon = setupOptionIcon(item, kind);
      var name = cleanSetupOptionName(SL(item && item.name));
      return (icon ? icon + " " : "") + name;
    }
    function dateFormatChoice(id: any, example: any) {
      var active = String(setupDateFmt) === String(id);
      var full = setupDateLabel(String(id), example).split(" · ");
      return (
        <button
          key={String(id)}
          type="button"
          onClick={function () {
            setSetupDateFmt(String(id));
          }}
          style={{
            minWidth: 0,
            border: "1px solid " + (active ? primary : borderC),
            background: active
              ? dark
                ? primary + "2B"
                : primary + "12"
              : dark
              ? "#252535"
              : "#fff",
            borderRadius: 13,
            padding: "10px 6px",
            color: textC,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 950, whiteSpace: "nowrap" }}>
            {full[0]}
          </span>
          <span
            style={{
              fontSize: 10,
              color: active ? primary : subC,
              fontWeight: active ? 900 : 700,
              whiteSpace: "nowrap",
            }}
          >
            {full.slice(1).join(" · ")}
          </span>
        </button>
      );
    }
    function pickerOptions() {
      if (setupPicker === "language")
        return LANGUAGES.map(function (x) {
          return { value: String(x.code), label: String(x.label) };
        });
      if (setupPicker === "currency")
        return CURRENCIES.map(function (x) {
          return {
            value: String(x.code),
            label: String(x.symbol) + " · " + String(x.code),
          };
        });
      if (setupPicker === "date")
        return DATE_FORMATS.map(function (x) {
          return {
            value: String(x.id),
            label: setupDateLabel(String(x.id), x.example),
          };
        });
      if (setupPicker === "income")
        return incomeTypes.map(function (x) {
          return { value: String(x.id), label: setupOptionLabel(x, "income") };
        });
      if (setupPicker === "expense")
        return cats
          .filter(function (x) {
            return !x.archived && !x.deleted;
          })
          .map(function (x) {
            return {
              value: String(x.id),
              label: setupOptionLabel(x, "expense"),
            };
          });
      if (setupPicker === "method")
        return methods
          .filter(function (x) {
            return !x.archived && !x.deleted;
          })
          .map(function (x) {
            return {
              value: String(x.id),
              label: setupOptionLabel(x, "method"),
            };
          });
      return [];
    }
    function currentPickerValue() {
      if (setupPicker === "language") return setupLang;
      if (setupPicker === "currency") return setupCurrency;
      if (setupPicker === "date") return setupDateFmt;
      if (setupPicker === "income") return setupIncomeType;
      if (setupPicker === "expense") return setupExpenseCat;
      if (setupPicker === "method") return setupExpenseMethod;
      return "";
    }
    function selectedLabel(id, value) {
      if (id === "language") {
        var l = LANGUAGES.find(function (x) {
          return String(x.code) === String(value);
        });
        return l ? l.label : String(value);
      }
      if (id === "currency") {
        var c = CURRENCIES.find(function (x) {
          return String(x.code) === String(value);
        });
        return c ? String(c.symbol) + " · " + String(c.code) : String(value);
      }
      if (id === "date") {
        var d = DATE_FORMATS.find(function (x) {
          return String(x.id) === String(value);
        });
        return d ? setupDateLabel(String(d.id), d.example) : String(value);
      }
      var list =
        id === "income" ? incomeTypes : id === "expense" ? cats : methods;
      var item = list.find(function (x) {
        return String(x.id) === String(value);
      });
      return item ? setupOptionLabel(item, id) : String(value);
    }
    function pickValue(value) {
      if (setupPickerActionRef.current) return;
      setupPickerActionRef.current = true;
      var pickerId = String(setupPicker || "");
      var selected = String(value);
      // Prima chiudiamo il pannello. Il valore viene applicato nel fotogramma
      // successivo, così Android non deve smontare il selettore e ritradurre
      // contemporaneamente tutta la configurazione.
      setSetupPicker("");
      setSetupPickerSearch("");
      var applySelection = function () {
        if (pickerId === "language") setSetupLang(selected);
        else if (pickerId === "currency") setSetupCurrency(selected);
        else if (pickerId === "date") setSetupDateFmt(selected);
        else if (pickerId === "income") setSetupIncomeType(selected);
        else if (pickerId === "expense") setSetupExpenseCat(selected);
        else if (pickerId === "method") setSetupExpenseMethod(selected);
        setTimeout(function () {
          setupPickerActionRef.current = false;
        }, 80);
      };
      try {
        if (
          typeof window !== "undefined" &&
          typeof window.requestAnimationFrame === "function"
        )
          window.requestAnimationFrame(function () {
            applySelection();
          });
        else setTimeout(applySelection, 0);
      } catch (e) {
        setTimeout(applySelection, 0);
      }
    }
    function pickerField(label, id, value) {
      return (
        <div style={panelStyle}>
          <label style={labelStyle}>{SL(label)}</label>
          <button
            type="button"
            onClick={function () {
              openSetupPicker(id);
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid " + borderC,
              borderRadius: 12,
              padding: "12px",
              fontSize: 14,
              background: dark ? "#1E1E30" : "#fff",
              color: textC,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              textAlign: "left",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {selectedLabel(id, value)}
            </span>
            <span aria-hidden="true" style={{ color: primary, fontSize: 18 }}>
              ⌄
            </span>
          </button>
        </div>
      );
    }
    function summaryPreviewContent() {
      return (
        <>
          <style>
            {
              "@keyframes fainanceSummaryGlow{0%,100%{transform:translateY(0);box-shadow:0 5px 16px rgba(55,138,221,.10)}50%{transform:translateY(-3px);box-shadow:0 10px 24px rgba(55,138,221,.24)}}@keyframes fainanceNavPop{0%,100%{transform:translateY(0);opacity:.72}50%{transform:translateY(-5px);opacity:1}}"
            }
          </style>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: subC,
              marginBottom: 8,
            }}
          >
            {SL("Anteprima riepilogo superiore")}
          </div>
          <div
            className="fainance-setup-summary-preview"
            style={{
              animation: "fainanceSummaryGlow 2.4s ease-in-out infinite",
              background: dark ? "#1E1E30" : "#fff",
              border: "1px solid " + borderC,
              borderRadius: 13,
              padding: "10px 12px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
            }}
          >
            {[
              ["Uscite", "€ 820", "#E24B4A"],
              ["Saldo", "€ 430", "#378ADD"],
              ["Entrate", "€ 1.250", "#1D9E75"],
            ].map(function (x) {
              return (
                <div key={x[0]} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: subC }}>{SL(x[0])}</div>
                  <div style={{ fontSize: 13, fontWeight: 950, color: x[2] }}>
                    {x[1]}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: 11,
              color: subC,
              lineHeight: 1.35,
              marginTop: 8,
            }}
          >
            {SL(
              "Mostra sempre entrate, uscite e saldo nella parte alta dell’app."
            )}
          </div>
        </>
      );
    }
    function summarySettingCard() {
      return (
        <div style={panelStyle}>
          <button
            type="button"
            onClick={function () {
              setSetupShowSummary(!setupShowSummary);
            }}
            style={{
              border: "none",
              padding: 0,
              background: "transparent",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              textAlign: "left",
              cursor: "pointer",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span>
              <span
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 900,
                  color: textC,
                }}
              >
                {SL("Mostra riepilogo in alto?")}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 12,
                  color: subC,
                  marginTop: 4,
                  lineHeight: 1.35,
                }}
              >
                {SL(
                  "Mostra entrate, uscite e saldo nella parte superiore dell’app."
                )}
              </span>
            </span>
            {switchControl(setupShowSummary)}
          </button>
          <div
            style={{ height: 1, background: borderC, margin: "4px 0 2px" }}
          />
          {summaryPreviewContent()}
        </div>
      );
    }
    function navPreviewContent() {
      var count = Math.max(3, Math.min(7, Number(setupNavIcons || 5)));
      var icons = ["🏠", "💸", "📋", "🎙️", "📊", "🎯", "☰"].slice(0, count);
      return (
        <>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: subC,
              marginBottom: 8,
            }}
          >
            {SL("Anteprima barra inferiore")}
          </div>
          <div
            style={{
              background: dark ? "#1E1E30" : "#fff",
              border: "1px solid " + borderC,
              borderRadius: 13,
              padding: "10px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
              gap: 4,
            }}
          >
            {icons.map(function (icon, i) {
              return (
                <span
                  key={i}
                  style={{
                    fontSize: 18,
                    animation:
                      "fainanceNavPop 1.8s ease-in-out " +
                      i * 0.12 +
                      "s infinite",
                    display: "inline-flex",
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {icon}
                </span>
              );
            })}
          </div>
          <div
            style={{
              fontSize: 11,
              color: subC,
              lineHeight: 1.35,
              marginTop: 8,
            }}
          >
            {SL(
              "Scegli quante sezioni mostrare direttamente nella barra. Le altre restano disponibili in Altro."
            )}
          </div>
        </>
      );
    }
    function navSettingCard() {
      return (
        <div style={panelStyle}>
          <label style={labelStyle}>
            {SL("Numero icone barra inferiore")}: <b>{setupNavIcons}</b>
          </label>
          <input
            type="range"
            min="3"
            max="7"
            step="1"
            value={setupNavIcons}
            onChange={function (e) {
              setSetupNavIcons(Number(e.target.value));
            }}
            style={{ width: "100%", touchAction: "pan-x" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: subC,
            }}
          >
            <span>3</span>
            <span>7</span>
          </div>
          <div
            style={{ height: 1, background: borderC, margin: "4px 0 2px" }}
          />
          {navPreviewContent()}
        </div>
      );
    }
    var body: any = null;
    var title = essential
      ? "Configurazione essenziale"
      : "Configurazione avanzata";
    var subtitle = essential
      ? "Personalizza le impostazioni di base prima di iniziare."
      : "Completa le preferenze facoltative dell’app.";
    if (essential && step === 0)
      body = (
        <>
          {pickerField("Scegli lingua", "language", setupLang)}
          {pickerField("Scegli valuta", "currency", setupCurrency)}
        </>
      );
    if (essential && step === 1)
      body = (
        <>
          <div style={panelStyle}>
            <label style={labelStyle}>{SL("Formato data")}</label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,minmax(0,1fr))",
                gap: 7,
              }}
            >
              {DATE_FORMATS.map(function (x) {
                return dateFormatChoice(x.id, x.example);
              })}
            </div>
          </div>
          <div style={panelStyle}>
            <label style={labelStyle}>
              {SL("Primo giorno della settimana")}
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {choice("mon", "Lunedì", setupFirstDay, function () {
                setSetupFirstDay("mon");
              })}
              {choice("sun", "Domenica", setupFirstDay, function () {
                setSetupFirstDay("sun");
              })}
            </div>
          </div>
        </>
      );
    if (essential && step === 2)
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, color: subC, lineHeight: 1.45 }}>
            {SL(
              "Scegli come mostrare le spese rateizzate nel saldo e nelle statistiche."
            )}
          </div>
          {choice(
            "rateizzato",
            "Rateizzato",
            setupBalanceView,
            function () {
              setSetupBalanceView("rateizzato");
            },
            "Ogni rata viene conteggiata nel mese in cui è prevista."
          )}
          {choice(
            "reale",
            "Reale",
            setupBalanceView,
            function () {
              setSetupBalanceView("reale");
            },
            "L’intero importo viene conteggiato nella data dell’acquisto."
          )}
        </div>
      );
    if (essential && step === 3)
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {pickerField(
            "Categoria entrate predefinita",
            "income",
            setupIncomeType
          )}
          {pickerField(
            "Categoria uscite predefinita",
            "expense",
            setupExpenseCat
          )}
          {pickerField(
            "Metodo di pagamento predefinito",
            "method",
            setupExpenseMethod
          )}
        </div>
      );
    if (essential && step === 4)
      body = (
        <div style={{ textAlign: "center", padding: "12px 4px 2px" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: primary + "18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              margin: "0 auto 18px",
            }}
          >
            ✓
          </div>
          <div
            style={{
              fontSize: 21,
              fontWeight: 950,
              color: textC,
              lineHeight: 1.2,
              marginBottom: 10,
            }}
          >
            {SL("La configurazione essenziale è terminata.")}
          </div>
          <div
            style={{
              fontSize: 14,
              color: subC,
              lineHeight: 1.5,
              maxWidth: 390,
              margin: "0 auto",
            }}
          >
            {SL(
              "Sei pronto a usare fAInance. Puoi aprire l’app o continuare con la configurazione avanzata."
            )}
          </div>
        </div>
      );
    if (!essential && step === 0)
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {toggleRow(
            "Imposta il controllo biometrico",
            "Proteggi l’accesso all’app con biometria o credenziali del dispositivo.",
            setupBiometric,
            function () {
              chooseSetupBiometric(!setupBiometric);
            }
          )}
          {summarySettingCard()}
          {navSettingCard()}
        </div>
      );
    if (!essential && step === 1)
      body = (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={panelStyle}>
            <label style={labelStyle}>
              {SL("Storico - Data di ordinamento")}
            </label>
            {choice(
              "operation",
              "Data operazione",
              setupHistoryDate,
              function () {
                setSetupHistoryDate("operation");
              }
            )}
            {choice(
              "created",
              "Data inserimento",
              setupHistoryDate,
              function () {
                setSetupHistoryDate("created");
              }
            )}
          </div>
          <div style={panelStyle}>
            <label style={labelStyle}>
              {SL("Storico - Direzione ordinamento")}
            </label>
            {choice("desc", "Più recenti", setupHistoryDirection, function () {
              setSetupHistoryDirection("desc");
            })}
            {choice("asc", "Più vecchi", setupHistoryDirection, function () {
              setSetupHistoryDirection("asc");
            })}
          </div>
          {toggleRow(
            "Share - Mostra transazioni Share nello storico",
            "Include nello storico la tua quota delle spese registrate nei progetti Share.",
            setupShowShareHistory,
            function () {
              setSetupShowShareHistory(!setupShowShareHistory);
            }
          )}
        </div>
      );
    if (!essential && step === 2)
      body = (
        <div style={{ textAlign: "center", padding: "12px 4px 2px" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: primary + "18",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 38,
              margin: "0 auto 18px",
            }}
          >
            ✓
          </div>
          <div
            style={{
              fontSize: 21,
              fontWeight: 950,
              color: textC,
              lineHeight: 1.2,
              marginBottom: 10,
            }}
          >
            {SL("Configurazione avanzata completata.")}
          </div>
          <div style={{ fontSize: 14, color: subC, lineHeight: 1.5 }}>
            {SL("Le impostazioni avanzate sono state salvate.")}
          </div>
        </div>
      );
    function next() {
      if (essential) {
        if (step < 3) {
          setInitialSetupStep(step + 1);
          return;
        }
        if (step === 3) {
          applyEssentialSetup();
          setInitialSetupStep(4);
          return;
        }
      } else {
        if (step === 0) {
          setInitialSetupStep(1);
          return;
        }
        if (step === 1) {
          completeAdvancedSetup();
          return;
        }
      }
    }
    var options = pickerOptions();
    var query = String(setupPickerSearch || "")
      .trim()
      .toLowerCase();
    var filtered = query
      ? options.filter(function (x) {
          return (
            String(x.label).toLowerCase().indexOf(query) >= 0 ||
            String(x.value).toLowerCase().indexOf(query) >= 0
          );
        })
      : options;
    var pickerLayer = setupPicker ? (
      <div
        role="presentation"
        onClick={function (e) {
          if (e.target === e.currentTarget) closeSetupPicker();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10090,
          background: "rgba(0,0,0,.52)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: isMobile ? 0 : 18,
          boxSizing: "border-box",
          overscrollBehavior: "contain",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={function (e) {
            e.stopPropagation();
          }}
          style={{
            width: "100%",
            maxWidth: 540,
            maxHeight: isMobile ? "78vh" : "74vh",
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: isMobile ? "24px 24px 0 0" : 24,
            padding: 16,
            boxShadow: "0 -16px 50px rgba(0,0,0,.28)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overscrollBehavior: "contain",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 950, color: textC }}>
              {SL("Seleziona un valore")}
            </div>
            <PopupCloseButton onClick={closeSetupPicker} dark={dark} label={SL("Chiudi")} />
          </div>
          {options.length > 12 && (
            <input
              value={setupPickerSearch}
              onChange={function (e) {
                setSetupPickerSearch(e.target.value);
              }}
              placeholder={SL("Cerca...")}
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid " + borderC,
                borderRadius: 12,
                padding: "11px 12px",
                fontSize: 14,
                background: dark ? "#1E1E30" : "#fff",
                color: textC,
                outline: "none",
              }}
            />
          )}
          <div
            style={{
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              touchAction: "pan-y",
              display: "flex",
              flexDirection: "column",
              gap: 7,
              paddingBottom: 4,
            }}
          >
            {filtered.map(function (x) {
              var active = String(currentPickerValue()) === String(x.value);
              return (
                <button
                  key={x.value}
                  type="button"
                  onClick={function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    pickValue(x.value);
                  }}
                  style={{
                    width: "100%",
                    border: "1px solid " + (active ? primary : borderC),
                    background: active
                      ? dark
                        ? primary + "28"
                        : primary + "12"
                      : dark
                      ? "#252535"
                      : "#fff",
                    color: textC,
                    borderRadius: 12,
                    padding: "13px",
                    fontSize: 14,
                    fontWeight: active ? 950 : 750,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <span>{x.label}</span>
                  {active && (
                    <span style={{ color: primary, fontWeight: 950 }}>✓</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 20,
                  color: subC,
                  fontSize: 13,
                }}
              >
                {SL("Nessun risultato")}
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null;
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10060,
          background: dark ? "rgba(8,10,18,.94)" : "rgba(245,248,252,.97)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          boxSizing: "border-box",
          overscrollBehavior: "contain",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: isMobile ? 440 : 540,
            maxHeight: "95vh",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 26,
            padding: isMobile ? 20 : 26,
            boxShadow: "0 24px 70px rgba(0,0,0,.22)",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", right: 13, top: 13, zIndex: 2 }}>
            <PopupCloseButton onClick={skipInitialSetup} dark={dark} label={SL("Chiudi configurazione")} />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 18,
              paddingRight: 44,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 950,
                  color: primary,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  marginBottom: 6,
                }}
              >
                {SL("Passaggio")} {step + 1} {SL("di")} {maxStep + 1}
              </div>
              <div
                style={{
                  fontSize: 23,
                  fontWeight: 950,
                  color: textC,
                  lineHeight: 1.15,
                }}
              >
                {SL(title)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: subC,
                  marginTop: 6,
                  lineHeight: 1.4,
                }}
              >
                {SL(subtitle)}
              </div>
            </div>
            <div style={{ fontSize: 26 }}>⚙️</div>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: dark ? "#35354A" : "#E8ECF2",
              overflow: "hidden",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                height: "100%",
                width: ((step + 1) / (maxStep + 1)) * 100 + "%",
                background: "linear-gradient(90deg," + primary + ",#7F77DD)",
                transition: "width .2s",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {body}
          </div>
          {essential && step === 4 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
                marginTop: 22,
              }}
            >
              <button
                type="button"
                onClick={function () {
                  completeEssentialSetup(false);
                }}
                style={{
                  border: "1px solid " + primary,
                  background: dark ? "#252535" : "#fff",
                  color: primary,
                  borderRadius: 15,
                  padding: "13px 14px",
                  fontSize: 14,
                  fontWeight: 950,
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                {SL("Aprire fAInance")}
              </button>
              <button
                type="button"
                onClick={function () {
                  completeEssentialSetup(true);
                }}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg," + primary + ",#7F77DD)",
                  color: "#fff",
                  borderRadius: 15,
                  padding: "13px 14px",
                  fontSize: 14,
                  fontWeight: 950,
                  cursor: "pointer",
                  touchAction: "manipulation",
                }}
              >
                {SL("Configurazione avanzata")}
              </button>
            </div>
          ) : !essential && step === 2 ? (
            <button
              type="button"
              onClick={finishAdvancedSetup}
              style={{
                width: "100%",
                marginTop: 22,
                border: "none",
                background: "linear-gradient(135deg," + primary + ",#7F77DD)",
                color: "#fff",
                borderRadius: 15,
                padding: "13px 14px",
                fontSize: 15,
                fontWeight: 950,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              {SL("Aprire fAInance")}
            </button>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: step > 0 ? "1fr 1.5fr" : "1fr",
                  gap: 10,
                  marginTop: 22,
                }}
              >
                {step > 0 && (
                  <button
                    type="button"
                    onClick={function () {
                      setInitialSetupStep(step - 1);
                    }}
                    style={{
                      border: "1px solid " + borderC,
                      background: dark ? "#252535" : "#fff",
                      color: textC,
                      borderRadius: 15,
                      padding: "13px 14px",
                      fontSize: 14,
                      fontWeight: 900,
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                  >
                    {SL("Indietro")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  style={{
                    border: "none",
                    background:
                      "linear-gradient(135deg," + primary + ",#7F77DD)",
                    color: "#fff",
                    borderRadius: 15,
                    padding: "13px 14px",
                    fontSize: 14,
                    fontWeight: 950,
                    cursor: "pointer",
                    touchAction: "manipulation",
                  }}
                >
                  {SL(
                    (!essential && step === 1) || (essential && step === 3)
                      ? "Termina"
                      : "Avanti"
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={skipInitialSetup}
                style={{
                  width: "100%",
                  marginTop: 10,
                  border: "none",
                  background: "transparent",
                  color: subC,
                  fontSize: 12,
                  fontWeight: 850,
                  cursor: "pointer",
                  padding: 8,
                  touchAction: "manipulation",
                }}
              >
                {SL("Salta configurazione")}
              </button>
            </>
          )}
        </div>
        {pickerLayer}
      </div>
    );
  }

  function OnboardingGuideModal() {
    var slides = [
      {
        icon: "💳",
        title: "Le tue finanze in un unico posto",
        text: "Registra entrate, uscite, patrimonio, budget e obiettivi.\nTutto resta ordinato e sincronizzato sul tuo account.",
        items: ["Conti", "Carte", "Budget"],
      },
      {
        icon: "✍️",
        title: "Tieni traccia dei movimenti",
        text: "Aggiungi Spese ed Entrate manualmente, vocalmente e con lo scontrino.\nAutomatizza le entrate e le uscite periodiche.",
        items: ["Entrate", "Uscite", "Storico"],
      },
      {
        icon: "📊",
        title: "Controlla budget e statistiche",
        text: "Imposta limiti, guarda grafici chiari e capisci dove vanno i tuoi soldi mese per mese.",
        items: ["Budget", "Grafici", "Alert"],
      },
      {
        icon: "🎯",
        title: "Organizza obiettivi, patrimonio e Share",
        text: "Tieni sotto controllo risparmi, debiti, crediti, liste della spesa, appunti e spese condivise.",
        items: ["Obiettivi", "Patrimonio", "Share"],
      },
      {
        icon: "🤖",
        title: "Usa l’AI per migliorare",
        text: "Chiedi consigli, controlli e priorità per capire come ottimizzare le spese e risparmiare meglio.",
        items: ["Consigli", "Controlli", "Priorità"],
      },
    ];
    var idx = Math.max(0, Math.min(onboardingGuideStep, slides.length - 1));
    var slide = slides[idx];
    var primary = confirmButtonColor || "#378ADD";
    var accent = secondaryButtonColor || "#5FAFE5";
    function GL(value: any) {
      return translateFainanceText(
        String(value == null ? "" : value),
        String(setupLang || getDefaultLang()).split("-")[0]
      );
    }
    function setGuideStepStable(nextStep) {
      if (onboardingGuideTransitionRef.current) return;
      onboardingGuideTransitionRef.current = true;
      setOnboardingGuideStep(
        Math.max(0, Math.min(nextStep, slides.length - 1))
      );
      setTimeout(function () {
        onboardingGuideTransitionRef.current = false;
      }, 140);
    }
    function next() {
      if (idx >= slides.length - 1) markOnboardingGuideDone();
      else setGuideStepStable(idx + 1);
    }
    function prev() {
      if (idx > 0) setGuideStepStable(idx - 1);
    }
    function renderGuideBrandText(value: any) {
      var raw = String(value || "");
      var parts = raw.split(/(fAInance)/g);
      return parts.map(function (part, i) {
        if (part !== "fAInance") return <span key={i}>{part}</span>;
        return (
          <span key={i} style={{ fontWeight: 950, whiteSpace: "nowrap" }}>
            <span style={{ color: "#111827" }}>f</span>
            <span style={{ color: "#F2C94C" }}>AI</span>
            <span style={{ color: "#111827" }}>nance</span>
          </span>
        );
      });
    }
    function renderGuideText(value: any) {
      var translated = String(GL(value) || "");
      var paragraphs = translated.split("\n");
      return (
        <div
          style={{
            fontSize: 13.5,
            color: subC,
            lineHeight: 1.56,
            maxWidth: 390,
            margin: "0 auto 20px",
          }}
        >
          {paragraphs.map(function (p, i) {
            return (
              <div
                key={i}
                style={{ marginBottom: i < paragraphs.length - 1 ? 8 : 0 }}
              >
                {renderGuideBrandText(p)}
              </div>
            );
          })}
        </div>
      );
    }
    function illustration() {
      var miniCardBg = dark ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.86)";
      return (
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: "50%",
            background: dark
              ? "linear-gradient(135deg,rgba(127,119,221,.24),rgba(55,138,221,.18))"
              : "linear-gradient(135deg,#DDF7FF,#ECF2FF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            margin: "0 auto 18px",
            boxShadow: dark
              ? "0 14px 36px rgba(0,0,0,.25)"
              : "0 16px 34px rgba(55,138,221,.16)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 18,
              top: 28,
              width: 40,
              height: 12,
              borderRadius: 999,
              background: "rgba(255,255,255,.55)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 20,
              bottom: 32,
              width: 52,
              height: 12,
              borderRadius: 999,
              background: "rgba(255,255,255,.42)",
            }}
          />
          <div
            style={{
              fontSize: 54,
              filter: dark
                ? "drop-shadow(0 8px 18px rgba(0,0,0,.35))"
                : "drop-shadow(0 8px 18px rgba(55,138,221,.18))",
              zIndex: 2,
            }}
          >
            {slide.icon}
          </div>
          <div
            style={{
              position: "absolute",
              left: 36,
              bottom: 48,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              zIndex: 1,
            }}
          >
            {slide.items.slice(0, 3).map(function (x, i) {
              return (
                <div
                  key={x}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: miniCardBg,
                    border:
                      "1px solid " +
                      (dark ? "rgba(255,255,255,.16)" : "rgba(55,138,221,.16)"),
                    borderRadius: 10,
                    padding: "5px 8px",
                    fontSize: 10,
                    fontWeight: 900,
                    color: textC,
                    boxShadow: dark ? "none" : "0 4px 12px rgba(0,0,0,.06)",
                    transform: "translateX(" + i * 12 + "px)",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 5,
                      borderRadius: 999,
                      background:
                        i === 0 ? primary : i === 1 ? accent : "#7F77DD",
                      display: "inline-block",
                    }}
                  />
                  <span>{GL(x)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10050,
          background: dark ? "rgba(10,10,18,.92)" : "rgba(255,255,255,.96)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: isMobile ? 430 : 520,
            maxHeight: "94vh",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            background: dark ? "#1E1E30" : "#fff",
            border: "1px solid " + (dark ? "#34344a" : "#E7EAF5"),
            borderRadius: 28,
            padding: isMobile ? "22px 20px 18px" : "28px 28px 22px",
            boxShadow: dark
              ? "0 24px 70px rgba(0,0,0,.55)"
              : "0 24px 70px rgba(31,60,120,.18)",
            position: "relative",
            textAlign: "center",
          }}
        >
          <div style={{ position: "absolute", right: 14, top: 14 }}>
            <PopupCloseButton onClick={markOnboardingGuideDone} dark={dark} label={GL("Salta guida")} />
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: primary,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            {GL("Guida rapida")}
          </div>
          {idx === 0 && (
            <div
              style={{
                margin: "0 auto 16px",
                maxWidth: 330,
                textAlign: "left",
                background: dark ? "#252535" : "#F7FAFF",
                border: "1px solid " + borderC,
                borderRadius: 16,
                padding: "11px 12px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  fontWeight: 900,
                  color: subC,
                  marginBottom: 6,
                }}
              >
                {GL("Scegli la lingua")}
              </label>
              <select
                value={String(setupLang || getDefaultLang()).split("-")[0]}
                onChange={function (e) {
                  setSetupLang(String(e.target.value || getDefaultLang()));
                }}
                style={{
                  width: "100%",
                  height: 44,
                  borderRadius: 12,
                  border: "1px solid " + borderC,
                  background: dark ? "#1E1E30" : "#fff",
                  color: textC,
                  padding: "0 11px",
                  fontSize: 14,
                  fontWeight: 800,
                  boxSizing: "border-box",
                }}
              >
                {LANGUAGES.map(function (x) {
                  return (
                    <option key={x.code} value={x.code}>
                      {x.label}
                    </option>
                  );
                })}
              </select>
              <div
                style={{
                  fontSize: 10,
                  color: subC,
                  lineHeight: 1.35,
                  marginTop: 6,
                }}
              >
                {GL(
                  "La lingua del telefono è selezionata automaticamente. Puoi cambiarla ora."
                )}
              </div>
            </div>
          )}
          {illustration()}
          <div
            style={{
              fontSize: isMobile ? 22 : 24,
              fontWeight: 950,
              color: textC,
              lineHeight: 1.12,
              margin: "0 auto 10px",
              maxWidth: 360,
            }}
          >
            {GL(slide.title)}
          </div>
          {renderGuideText(slide.text)}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 7,
              marginBottom: 18,
            }}
          >
            {slides.map(function (_, i) {
              var active = i === idx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={function () {
                    setGuideStepStable(i);
                  }}
                  aria-label={GL("Vai alla schermata") + " " + (i + 1)}
                  style={{
                    width: active ? 22 : 8,
                    height: 8,
                    borderRadius: 999,
                    border: "none",
                    background: active ? primary : dark ? "#55556a" : "#D9DDE8",
                    padding: 0,
                    cursor: "pointer",
                    transition: "all .18s ease",
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: idx > 0 ? "1fr 1.5fr" : "1fr",
              gap: 10,
            }}
          >
            {idx > 0 && (
              <button
                type="button"
                onClick={prev}
                style={{
                  border: "1px solid " + borderC,
                  background: dark ? "#252535" : "#fff",
                  color: textC,
                  borderRadius: 16,
                  padding: "13px 14px",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {GL("Indietro")}
              </button>
            )}
            <button
              type="button"
              onClick={next}
              style={{
                border: "none",
                background: "linear-gradient(135deg," + primary + ",#7F77DD)",
                color: "#fff",
                borderRadius: 16,
                padding: "13px 16px",
                fontSize: 15,
                fontWeight: 950,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(55,138,221,.26)",
              }}
            >
              {GL(idx >= slides.length - 1 ? "Inizia ora" : "Avanti")}
            </button>
          </div>
          <button
            type="button"
            onClick={markOnboardingGuideDone}
            style={{
              marginTop: 12,
              border: "none",
              background: "transparent",
              color: subC,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {GL("Salta")}
          </button>
        </div>
      </div>
    );
  }

  function isNativePlatform() {
    try {
      return !!(
        window.Capacitor &&
        window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform()
      );
    } catch (e) {
      return false;
    }
  }
  function isExternalFilePickerActive() {
    try {
      var w: any = window;
      var active = !!w.__fainanceExternalFilePickerActive;
      var until = Number(w.__fainanceExternalFilePickerUntil || 0);
      // Il flag window si perde se Android ricrea l'Activity mentre il picker
      // nativo e aperto. L'import V10 mantiene anche una lease persistente.
      try {
        var persistedRaw = localStorage.getItem("fainance_import_native_pending_v10") || "";
        if (persistedRaw) {
          var persisted = JSON.parse(persistedRaw);
          var persistedUntil = Number(persisted && persisted.until || 0);
          if (persistedUntil && Date.now() <= persistedUntil) {
            active = true;
            until = Math.max(until || 0, persistedUntil);
          } else {
            localStorage.removeItem("fainance_import_native_pending_v10");
          }
        }
      } catch (_persistedPicker) {}
      if (!active || !until || Date.now() > until) {
        if (active) {
          w.__fainanceExternalFilePickerActive = false;
          w.__fainanceExternalFilePickerUntil = 0;
        }
        return false;
      }
      return true;
    } catch (_externalPicker) {
      return false;
    }
  }
  async function getNativeBiometric() {
    try {
      var pkg: any = await import("@aparajita/capacitor-biometric-auth");
      if (pkg && pkg.BiometricAuth)
        return {
          BiometricAuth: pkg.BiometricAuth,
          AndroidBiometryStrength: pkg.AndroidBiometryStrength || {
            weak: 0,
            strong: 1,
          },
        };
    } catch (e) {}
    try {
      var cap =
        typeof window !== "undefined" ? (window as any).Capacitor : null;
      var legacy = cap && cap.Plugins && cap.Plugins.BiometricAuth;
      if (legacy)
        return {
          BiometricAuth: legacy,
          AndroidBiometryStrength: { weak: 0, strong: 1 },
        };
      var core = await import("@capacitor/core");
      var registerPlugin = (core && core.registerPlugin) || null;
      if (registerPlugin) {
        var proxy = registerPlugin("BiometricAuth");
        return {
          BiometricAuth: proxy,
          AndroidBiometryStrength: { weak: 0, strong: 1 },
        };
      }
    } catch (e) {}
    return null;
  }

  function biometricErrorText(errorCode, details) {
    var code = String(errorCode || "");
    var raw = String(details || "");
    if (code === "biometryNotEnrolled")
      return "Nessuna impronta o biometria configurata sul dispositivo.";
    if (code === "biometryNotAvailable")
      return "La biometria non è disponibile per questa app o su questo dispositivo.";
    if (code === "passcodeNotSet" || code === "noDeviceCredential")
      return "Configura prima un PIN, password, sequenza o impronta nelle impostazioni del telefono.";
    if (code === "biometryLockout")
      return "Troppi tentativi non riusciti. Sblocca il telefono manualmente e riprova.";
    if (code === "authenticationFailed")
      return "Autenticazione biometrica non riuscita.";
    if (code === "systemCancel")
      return "Controllo biometrico annullato dal sistema.";
    if (code === "userCancel") return "Controllo biometrico annullato.";
    if (/not implemented|not available|plugin/i.test(raw))
      return "Plugin biometrico non disponibile in questa build Android. Installa il pacchetto, esegui npx cap sync android e ricompila l’app.";
    return "Controllo biometrico non completato.";
  }
  function withBiometricTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error("TIMEOUT_BIOMETRIC_PROMPT"));
      }, ms || 25000);
      Promise.resolve(promise)
        .then(function (v) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve(v);
        })
        .catch(function (e) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          reject(e);
        });
    });
  }
  async function checkBiometricAvailability() {
    if (!isNativePlatform())
      return {
        available: false,
        reason:
          "Il controllo biometrico è disponibile solo nell’app installata su Android o iPhone.",
      };
    var mod = await getNativeBiometric();
    var BiometricAuth = mod && mod.BiometricAuth;
    if (
      !BiometricAuth ||
      !BiometricAuth.checkBiometry ||
      !BiometricAuth.authenticate
    )
      return {
        available: false,
        reason:
          "Plugin biometrico non disponibile. Esegui npm install e npx cap sync.",
      };
    try {
      var res: any = await withBiometricTimeout(
        BiometricAuth.checkBiometry(),
        8000
      );
      if (res && (res.isAvailable || res.deviceIsSecure))
        return { available: true, reason: "", details: res };
      var reason =
        (res &&
          (res.reason || res.strongReason || res.code || res.strongCode)) ||
        "Il dispositivo non ha biometria o codice di sblocco configurati.";
      return { available: false, reason: String(reason), details: res };
    } catch (e) {
      return {
        available: false,
        reason: String(
          (e && e.message) ||
            e ||
            "Impossibile verificare la disponibilità biometrica."
        ),
        details: null,
      };
    }
  }
  async function requestBiometricUnlock(reason) {
    if (biometricPromptRef.current) return null;
    biometricPromptRef.current = true;
    setBiometricChecking(true);
    setBiometricLockMessage("");
    try {
      if (!isNativePlatform()) {
        setBiometricLockMessage(
          L(
            "Il controllo biometrico è disponibile solo nell’app installata su Android o iPhone."
          )
        );
        return false;
      }
      var mod = await getNativeBiometric();
      var BiometricAuth = mod && mod.BiometricAuth;
      if (!BiometricAuth || !BiometricAuth.authenticate) {
        setBiometricLockMessage(
          L(
            "Plugin biometrico non disponibile. Esegui npm install e npx cap sync."
          )
        );
        return false;
      }
      var available = await checkBiometricAvailability();
      if (!available.available) {
        setBiometricLockMessage(
          L(
            available.reason ||
              "Il controllo biometrico non è disponibile o non è configurato su questo dispositivo."
          )
        );
        return false;
      }
      var AndroidBiometryStrength = (mod && mod.AndroidBiometryStrength) || {};
      await withBiometricTimeout(
        BiometricAuth.authenticate({
          reason: reason || "Sblocca fAInance",
          cancelTitle: "Annulla",
          allowDeviceCredential: true,
          iosFallbackTitle: "Usa codice",
          androidTitle: "fAInance",
          androidSubtitle: "Sblocca fAInance",
          androidConfirmationRequired: false,
          androidBiometryStrength:
            AndroidBiometryStrength.weak !== undefined
              ? AndroidBiometryStrength.weak
              : 0,
        }),
        30000
      );
      biometricBackgroundAtRef.current = null;
      biometricSkipAutoLockUntilRef.current = Date.now() + 3000;
      setBiometricLockMessage("");
      return true;
    } catch (e) {
      var raw = String((e && e.message) || e || "");
      var code = (e && e.code) || raw;
      if (raw === "TIMEOUT_BIOMETRIC_PROMPT")
        setBiometricLockMessage(
          L(
            "Il controllo biometrico non ha ricevuto risposta dal sistema Android. Chiudi e riapri l’app, poi riprova."
          )
        );
      else setBiometricLockMessage(L(biometricErrorText(code, raw)));
      return false;
    } finally {
      biometricPromptRef.current = false;
      setBiometricChecking(false);
    }
  }
  async function unlockBiometricApp(reason) {
    if (biometricPromptRef.current) return null;
    var ok = await requestBiometricUnlock(reason);
    if (ok === true) {
      setUnlockMethod("");
      setAppLocked(false);
    } else if (ok === false) setAppLocked(true);
    return ok;
  }
  function validateLocalPin(pin) {
    return /^\d{4}$/.test(String(pin || ""));
  }
  function resetUnlockInputs() {
    setUnlockPin("");
    unlockPinRef.current = "";
    setUnlockPassword("");
  }
  function prepareAppLock() {
    resetUnlockInputs();
    setUnlockMethod("");
    setBiometricLockMessage("");
    setAppLocked(true);
  }
  function unlockWithPin(pin) {
    if (!validateLocalPin(localLockPin)) {
      setBiometricLockMessage(
        L(
          "PIN non configurato. Puoi sbloccare con biometria o password account e poi impostare un nuovo PIN."
        )
      );
      setUnlockMethod("biometric");
      return false;
    }
    if (String(pin || "") === String(localLockPin || "")) {
      resetUnlockInputs();
      setUnlockMethod("");
      setBiometricLockMessage("");
      setAppLocked(false);
      biometricBackgroundAtRef.current = null;
      biometricSkipAutoLockUntilRef.current = Date.now() + 3000;
      return true;
    }
    resetUnlockInputs();
    setBiometricLockMessage(L("PIN errato."));
    return false;
  }
  async function unlockWithAccountPassword(password) {
    setBiometricChecking(true);
    setBiometricLockMessage("");
    try {
      var user = fbAuth.currentUser;
      var email =
        user && user.email
          ? String(user.email)
          : String((currentUser && currentUser.email) || "");
      if (!user || !email) {
        setBiometricLockMessage(
          L("Account non disponibile. Effettua di nuovo il login.")
        );
        return false;
      }
      var mod: any = await import("firebase/auth");
      if (!mod.EmailAuthProvider || !mod.reauthenticateWithCredential) {
        setBiometricLockMessage(
          L("Verifica password non disponibile in questa build.")
        );
        return false;
      }
      var cred = mod.EmailAuthProvider.credential(
        email,
        String(password || "")
      );
      await mod.reauthenticateWithCredential(user, cred);
      resetUnlockInputs();
      setUnlockMethod("");
      setBiometricLockMessage("");
      setAppLocked(false);
      biometricBackgroundAtRef.current = null;
      biometricSkipAutoLockUntilRef.current = Date.now() + 3000;
      return true;
    } catch (e) {
      setBiometricLockMessage(
        L(
          "Password account non corretta o account non compatibile con accesso tramite password."
        )
      );
      return false;
    } finally {
      setBiometricChecking(false);
    }
  }
  async function handleBiometricToggle(next) {
    if (biometricChecking || biometricPromptRef.current) return;
    if (next) {
      if (localLockMethod === "pin" && !validateLocalPin(localLockPin)) {
        setToast({
          text: L("Imposta prima un PIN di 4 numeri."),
          type: "error",
          icon: "🚫",
          color: "#E24B4A",
        });
        return;
      }
      if (localLockMethod === "biometric") {
        var ok = await requestBiometricUnlock(
          "Conferma l’attivazione del blocco biometrico"
        );
        if (!ok) {
          setToast({
            text: L(
              biometricLockMessage || "Controllo biometrico non completato."
            ),
            type: "error",
            icon: "🚫",
            color: "#E24B4A",
          });
          return;
        }
      }
      biometricInitialCheckRef.current = true;
      biometricBackgroundAtRef.current = null;
      biometricSkipAutoLockUntilRef.current = Date.now() + 5000;
      setBiometricLockEnabled(true);
      setAppLocked(false);
      setToast({
        text: L("Protezione app attivata"),
        type: "success",
        icon: "🔐",
      });
      return;
    }
    var confirmed =
      localLockMethod === "biometric" && isNativePlatform()
        ? await requestBiometricUnlock(
            "Conferma la disattivazione del blocco dell’app"
          )
        : true;
    if (confirmed) {
      biometricInitialCheckRef.current = false;
      biometricBackgroundAtRef.current = null;
      biometricSkipAutoLockUntilRef.current = 0;
      setBiometricLockEnabled(false);
      setAppLocked(false);
      setToast({
        text: L("Protezione app disattivata"),
        type: "success",
        icon: "🔓",
      });
    } else if (confirmed === false)
      setToast({
        text: L(biometricLockMessage || "Controllo non completato."),
        type: "error",
        icon: "🚫",
        color: "#E24B4A",
      });
  }
  useEffect(
    function () {
      if (!biometricLockEnabled) {
        setAppLocked(false);
        biometricInitialCheckRef.current = false;
        return;
      }
      if (localLockMethod === "pin" && !validateLocalPin(localLockPin)) {
        setAppLocked(false);
        setBiometricLockMessage("");
        return;
      }
      if (!firestoreReady || biometricInitialCheckRef.current) return;
      biometricInitialCheckRef.current = true;
      if (Date.now() < Number(biometricSkipAutoLockUntilRef.current || 0))
        return;
      if (biometricPromptRef.current) return;
      if (isExternalFilePickerActive()) return;
      prepareAppLock();
      if (localLockMethod === "biometric" && isNativePlatform())
        unlockBiometricApp(
          "Sblocca fAInance per visualizzare i tuoi dati finanziari"
        );
    },
    [biometricLockEnabled, firestoreReady, localLockMethod, localLockPin]
  );
  useEffect(
    function () {
      var removed = false;
      var listenerHandle = null;
      async function attach() {
        if (!isNativePlatform()) return;
        try {
          var mod = await import("@capacitor/app");
          if (removed || !mod || !mod.App || !mod.App.addListener) return;
          listenerHandle = await mod.App.addListener(
            "appStateChange",
            function (state) {
              var active = !!(state && state.isActive);
              if (!active) {
                if (isExternalFilePickerActive()) {
                  biometricBackgroundAtRef.current = null;
                  return;
                }
                biometricBackgroundAtRef.current = Date.now();
                return;
              }
              if (isExternalFilePickerActive()) {
                biometricBackgroundAtRef.current = null;
                return;
              }
              if (!biometricLockEnabled) return;
              if (
                biometricPromptRef.current ||
                Date.now() < Number(biometricSkipAutoLockUntilRef.current || 0)
              )
                return;
              var bgAt = Number(biometricBackgroundAtRef.current || 0);
              biometricBackgroundAtRef.current = null;
              if (!bgAt) return;
              var minutes = Number(biometricLockTimeout);
              var elapsed = Date.now() - bgAt;
              if (minutes <= 0 || elapsed >= minutes * 60 * 1000) {
                if (
                  localLockMethod === "pin" &&
                  !validateLocalPin(localLockPin)
                ) {
                  setAppLocked(false);
                  return;
                }
                prepareAppLock();
                if (localLockMethod === "biometric")
                  unlockBiometricApp("Sblocca fAInance per continuare");
              }
            }
          );
        } catch (e) {}
      }
      attach();
      return function () {
        removed = true;
        try {
          if (listenerHandle && listenerHandle.remove) listenerHandle.remove();
        } catch (e) {}
      };
    },
    [
      biometricLockEnabled,
      biometricLockTimeout,
      firestoreReady,
      localLockMethod,
      localLockPin,
    ]
  );
  var [voiceModal, setVoiceModal] = useState(false);
  var [voiceListening, setVoiceListening] = useState(false);
  var [voiceText, setVoiceText] = useState("");
  var [voiceParsed, setVoiceParsed] = useState(null);
  var [voiceError, setVoiceError] = useState("");
  var [voiceConfirm, setVoiceConfirm] = useState(null);
  var [voiceSaving, setVoiceSaving] = useState(false);
  function openVoiceModal(
    autoStart?: any,
    assistantOnly?: any,
    entryMode?: any
  ) {
    var realtimeAllowed = currentPlan === "base" || currentPlan === "premium";
    try {
      if (assistantOnly)
        localStorage.setItem("fainance_voice_assistant_mode_once", "1");
      else localStorage.removeItem("fainance_voice_assistant_mode_once");
      if (realtimeAllowed && autoStart !== false)
        localStorage.setItem("fainance_voice_realtime_autostart_once", "1");
      else localStorage.removeItem("fainance_voice_realtime_autostart_once");
      if (!realtimeAllowed && !assistantOnly)
        localStorage.setItem("fainance_voice_quick_mode_once", "1");
      else localStorage.removeItem("fainance_voice_quick_mode_once");
      if (realtimeAllowed && String(entryMode || "") === "receipt")
        localStorage.setItem("fainance_voice_assistant_receipt_once", "camera");
      else localStorage.removeItem("fainance_voice_assistant_receipt_once");
    } catch (e) {}
    if (assistantOnly && !realtimeAllowed)
      setToast({
        text: translateUiRuntimeText(
          "L’assistente vocale AI è disponibile dal piano Base."
        ),
        type: "warning",
        color: "#EF9F27",
        icon: "🔒",
      });
    setVoiceModal(true);
    setVoiceText("");
    setVoiceParsed(null);
    setVoiceError("");
    setVoiceListening(false);
    return true;
  }
  useEffect(
    function () {
      var removed = false;
      var listenerHandle = null;
      async function attachAndroidBackButton() {
        if (!isNativePlatform()) return;
        try {
          var mod: any = await import("@capacitor/app");
          var CapApp = mod && mod.App;
          if (removed || !CapApp || !CapApp.addListener) return;
          listenerHandle = await CapApp.addListener("backButton", function () {
            try {
              var active: any = document && document.activeElement;
              if (
                active &&
                active.blur &&
                /input|textarea|select/i.test(String(active.tagName || ""))
              )
                active.blur();
            } catch (e) {}
            if (voiceModal) {
              setVoiceModal(false);
              setVoiceListening(false);
              return;
            }
            if (mobileMenu) {
              setMobileMenu(false);
              return;
            }
            if (settingsPage) {
              setSettingsPage(null);
              return;
            }
            var nowBack = Date.now();
            if (tab !== "home") {
              setTab("home");
              setMobileMenu(false);
              androidBackLastPressRef.current = nowBack;
              setToast({
                text: "Premi di nuovo Indietro per uscire",
                type: "warning",
                icon: "↩️",
                color: "#EF9F27",
              });
              return;
            }
            if (nowBack - Number(androidBackLastPressRef.current || 0) < 1800) {
              if (CapApp.exitApp) CapApp.exitApp();
              return;
            }
            androidBackLastPressRef.current = nowBack;
            setToast({
              text: "Premi di nuovo Indietro per uscire",
              type: "warning",
              icon: "↩️",
              color: "#EF9F27",
            });
          });
        } catch (e) {}
      }
      attachAndroidBackButton();
      return function () {
        removed = true;
        try {
          if (listenerHandle && listenerHandle.remove) listenerHandle.remove();
        } catch (e) {}
      };
    },
    [tab, settingsPage, mobileMenu, voiceModal]
  );
  var [aiDismissed, setAiDismissed] = useStorage(
    userKey("ai_dismissed_v1"),
    []
  );
  var [aiChat, setAiChat] = useStorage(userKey("ai_chat_v1"), []);
  var [aiDataAccess, setAiDataAccess] = useStorage(
    userKey("ai_data_access_v1"),
    "summary"
  );
  var [aiFloatingEnabled, setAiFloatingEnabled] = useStorage(
    userKey("ai_floating_enabled_v1"),
    true
  );
  var [aiFloatingPos, setAiFloatingPos] = useStorage(
    userKey("ai_floating_pos_v1"),
    { right: 18, bottom: 78 }
  );
  var [aiFloatingDrag, setAiFloatingDrag] = useState(null);
  var [aiTab, setAiTab] = useStorage(userKey("ai_tab_v1"), "consigli");
  var [aiAdviceFilter, setAiAdviceFilter] = useState("all");
  var chatInputRef = useRef(null);
  var aiChatSectionRef = useRef(null);
  var [aiLoading, setAiLoading] = useState(false);
  useEffect(
    function () {
      var legacyAssistantView =
        aiTab === "prompt" ||
        aiTab === "chat" ||
        aiTab === "conversation" ||
        aiTab === "conversazione";
      if (!legacyAssistantView) return;
      setAiTab("consigli");
      // La vecchia chat semplice non deve più essere raggiungibile: ogni vecchio link/tab
      // apre direttamente l'assistente completo (voce + allegati + testo).
      if (tab === "consulenteAI")
        setTimeout(function () {
          try {
            openVoiceModal(false, true);
          } catch (_e) {}
        }, 0);
    },
    [aiTab, tab]
  );

  useEffect(function () {
    function h() {
      setIsMobile(window.innerWidth < 900);
    }
    h();
    window.addEventListener("resize", h);
    return function () {
      window.removeEventListener("resize", h);
    };
  }, []);

  var btnStyleObj =
    BUTTON_STYLES.find(function (b) {
      return b.id === btnStyle;
    }) || BUTTON_STYLES[0];
  var btnRadius = btnStyleObj.r;
  var t = TRANSLATIONS[lang] || TRANSLATIONS.it;
  try {
    // 1.6.35: non nascondiamo più la UI a ogni cambio sezione.
    // Il vecchio flag data-fainance-i18n poteva lasciare la pagina opaca/ferma
    // mentre il traduttore runtime scansionava il DOM.
    if (typeof document !== "undefined")
      document.documentElement.removeAttribute("data-fainance-i18n");
  } catch (e) {}
  useEffect(
    function () {
      // Il traduttore incrementale non nasconde mai l'interfaccia durante il cambio lingua.
      try {
        if (typeof document !== "undefined")
          document.documentElement.removeAttribute("data-fainance-i18n");
      } catch (e) {}
    },
    [lang]
  );
  var themeObj =
    BG_THEMES.find(function (b) {
      return b.id === bgTheme;
    }) || BG_THEMES[0];
  var dark = themeObj.dark,
    bgColor = themeObj.bg;
  // Mantiene leggibili ora, rete e batteria anche con il tema scuro.
  // SystemBarsStyle.Dark = contenuto chiaro su sfondo scuro; Light = contenuto scuro.
  useEffect(
    function () {
      var disposed = false;
      function applyStatusBarStyle() {
        if (disposed) return;
        try {
          var result = SystemBars.setStyle({
            style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
            bar: SystemBarType.StatusBar,
          });
          if (result && typeof result.catch === "function") result.catch(function () {});
        } catch (e) {}
      }
      function onVisibilityChange() {
        try {
          if (typeof document === "undefined" || !document.hidden) applyStatusBarStyle();
        } catch (e) {
          applyStatusBarStyle();
        }
      }
      applyStatusBarStyle();
      try {
        window.addEventListener("focus", applyStatusBarStyle);
        document.addEventListener("visibilitychange", onVisibilityChange);
      } catch (e) {}
      return function () {
        disposed = true;
        try {
          window.removeEventListener("focus", applyStatusBarStyle);
          document.removeEventListener("visibilitychange", onVisibilityChange);
        } catch (e) {}
      };
    },
    [dark]
  );
  var cardBg = dark ? "#1e1e30" : "#fff",
    sideBg = dark ? "#16162a" : "#fff",
    borderC = dark ? "#333" : "#eee",
    textC = dark ? "#eee" : "#333",
    subC = dark ? "#aaa" : "#888",
    headerBg = dark ? "#16162a" : "#fff";
  var sym = (
    CURRENCIES.find(function (c) {
      return c.code === currency;
    }) || { symbol: "€" }
  ).symbol;
  var fmt = function (n) {
    return fmtAmt(n, sym);
  };
  var now = new Date(),
    curYear = now.getFullYear();
  var curMonthKey = curYear + "-" + String(now.getMonth() + 1).padStart(2, "0");

  function activeExpenseCatsList() {
    return (cats || []).filter(function (c) {
      return !c.deleted && !c.archived;
    });
  }
  function activeMethodsList() {
    return (methods || []).filter(function (m) {
      return !m.deleted && !m.archived;
    });
  }
  function activeIncomeTypesList() {
    return (incomeTypes || []).filter(function (x) {
      return !x.deleted && !x.archived;
    });
  }
  function getCat(id) {
    return activeExpenseCatsList().find(function (c) {
      return String(c.id) === String(id);
    });
  }
  function getMethod(id) {
    return activeMethodsList().find(function (m) {
      return String(m.id) === String(id);
    });
  }
  function getIT(id) {
    return activeIncomeTypesList().find(function (x) {
      return String(x.id) === String(id);
    });
  }
  function filterReferenceIsStillActive(ref) {
    var raw = String(ref || "");
    if (!raw) return false;
    if (raw === "share") return true;
    if (raw.indexOf("expense:") === 0) return !!getCat(raw.slice(8));
    if (raw.indexOf("income:") === 0) return !!getIT(raw.slice(7));
    return !!getCat(raw) || !!getIT(raw);
  }
  useEffect(
    function () {
      setFilterCats(function (prev) {
        var next = (prev || []).filter(filterReferenceIsStillActive);
        return next.length === (prev || []).length ? prev : next;
      });
      setFilterMethods(function (prev) {
        var next = (prev || []).filter(function (id) {
          return !!getMethod(id);
        });
        return next.length === (prev || []).length ? prev : next;
      });
      if (filterCat !== "all" && !getCat(filterCat)) setFilterCat("all");
      if (defaultExpenseCat && !getCat(defaultExpenseCat))
        setDefaultExpenseCat("");
      if (defaultExpenseMethod && !getMethod(defaultExpenseMethod))
        setDefaultExpenseMethod("");
      if (defaultIncomeType && !getIT(defaultIncomeType))
        setDefaultIncomeType("");
      var activeCatIds = activeExpenseCatsList().map(function (c) {
        return String(c.id);
      });
      var activeMethodIds = activeMethodsList().map(function (m) {
        return String(m.id);
      });
      var activeIncomeIds = activeIncomeTypesList().map(function (x) {
        return String(x.id);
      });
      setCatOrder(function (prev) {
        var next = (prev || []).filter(function (id) {
          return activeCatIds.indexOf(String(id)) >= 0;
        });
        return next.length === (prev || []).length ? prev : next;
      });
      setMethodOrder(function (prev) {
        var next = (prev || []).filter(function (id) {
          return activeMethodIds.indexOf(String(id)) >= 0;
        });
        return next.length === (prev || []).length ? prev : next;
      });
      setIncomeTypeOrder(function (prev) {
        var next = (prev || []).filter(function (id) {
          return activeIncomeIds.indexOf(String(id)) >= 0;
        });
        return next.length === (prev || []).length ? prev : next;
      });
    },
    [
      cats,
      methods,
      incomeTypes,
      filterCat,
      defaultExpenseCat,
      defaultExpenseMethod,
      defaultIncomeType,
    ]
  );
  function expenseWithMethodSnapshot(x) {
    return movementWithMethodSnapshot(x, getMethod);
  }

  function bulkMovementLastAt() {
    return Number((planUsage && planUsage["bulkMovement:lastAt"]) || 0);
  }
  function bulkMovementNextAllowedAt() {
    return nextBulkMovementAllowedAt(currentPlan, bulkMovementLastAt());
  }
  function bulkMovementLocked() {
    return isBulkMovementLocked(currentPlan, bulkMovementLastAt(), Date.now());
  }
  function bulkMovementCooldownText() {
    var next = bulkMovementNextAllowedAt();
    if (!next) return "";
    var d = new Date(next);
    var dateText = d.toLocaleDateString(
      (lang || "it") === "it" ? "it-IT" : undefined,
      { day: "2-digit", month: "2-digit", year: "numeric" }
    );
    if (currentPlan === "base")
      return (
        translateUiRuntimeText(
          "Hai già usato un inserimento multiplo. Nel piano Base puoi usarne un altro tra 2 mesi, dal "
        ) +
        dateText +
        "."
      );
    return (
      translateUiRuntimeText(
        "Hai già usato un inserimento multiplo. Nel piano Gratis puoi usarne un altro tra 1 mese, dal "
      ) +
      dateText +
      "."
    );
  }
  var planLimits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;
  function planCount(key) {
    return Number((planUsage && planUsage[key]) || 0);
  }
  function planInc(key, delta) {
    setPlanUsage(function (p) {
      return { ...(p || {}), [key]: Number((p && p[key]) || 0) + (delta || 1) };
    });
  }
  function usageKey(feature, period) {
    return (
      feature + ":" + (period === "monthly" ? monthUsageKey() : todayUsageKey())
    );
  }
  function rewardedFeatureConfig(feature) {
    var cfg = {
      manualMovement: {
        period: "daily",
        label: "movimenti",
        included: { free: 2, base: 4, premium: Infinity },
        rewarded: { free: 2, base: 2, premium: 0 },
        includedLabel: "movimenti inclusi",
        extraLabel: "movimenti extra con annuncio",
      },
      instalmentMovement: {
        period: "daily",
        label: "rateizzazioni",
        included: { free: 2, base: 4, premium: Infinity },
        rewarded: { free: 0, base: 0, premium: 0 },
        includedLabel: "rateizzazioni incluse",
        extraLabel: "rateizzazioni extra con annuncio",
      },
      receiptScan: {
        period: "daily",
        label: "scontrini",
        included: { free: 1, base: 3, premium: Infinity },
        rewarded: { free: 1, base: 1, premium: 0 },
        includedLabel: "scontrini inclusi",
        extraLabel: "scontrini extra con annuncio",
      },
      voiceEntry: {
        period: "daily",
        label: "comandi vocali",
        included: { free: 1, base: 3, premium: Infinity },
        rewarded: { free: 1, base: 1, premium: 0 },
        includedLabel: "comandi vocali inclusi",
        extraLabel: "comandi vocali extra con annuncio",
      },
      shareDailyExpenses: {
        period: "daily",
        label: "spese Share",
        included: { free: 2, base: 4, premium: Infinity },
        rewarded: { free: 2, base: 2, premium: 0 },
        includedLabel: "spese Share incluse",
        extraLabel: "spese Share extra con annuncio",
      },
      patrimonioCopy: {
        period: "monthly",
        label: "copie patrimonio",
        included: { free: 2, base: 5, premium: Infinity },
        rewarded: { free: 2, base: 2, premium: 0 },
        includedLabel: "copie patrimonio incluse",
        extraLabel: "copie patrimonio extra con annuncio",
      },
      bulkMovement: {
        period: "monthly",
        label: "blocchi multipli",
        included: { free: 1, base: 2, premium: Infinity },
        rewarded: { free: 0, base: 0, premium: 0 },
        includedLabel: "blocchi multipli inclusi",
        extraLabel: "blocchi multipli extra con annuncio",
      },
      aiReply: {
        period: "daily",
        label: "risposte AI",
        included: { free: 4, base: 10, premium: Infinity },
        rewarded: { free: 2, base: 3, premium: 0 },
        includedLabel: "risposte AI incluse",
        extraLabel: "risposte AI extra con annuncio",
      },
    };
    return cfg[feature] || null;
  }
  function featurePeriod(feature) {
    var c = rewardedFeatureConfig(feature);
    return c && c.period ? c.period : "daily";
  }
  function featureUsageKey(feature) {
    return usageKey(feature, featurePeriod(feature));
  }
  function featureExtraKey(feature) {
    return usageKey(feature + "ExtraUnlocked", featurePeriod(feature));
  }
  function featureLimits(feature) {
    var c = rewardedFeatureConfig(feature);
    if (c) {
      var inc =
        c.included && c.included[currentPlan] !== undefined
          ? c.included[currentPlan]
          : Infinity;
      var rew =
        c.rewarded && c.rewarded[currentPlan] !== undefined
          ? c.rewarded[currentPlan]
          : 0;
      return {
        included: inc,
        rewarded: rew,
        total:
          inc === Infinity ? Infinity : Number(inc || 0) + Number(rew || 0),
        config: c,
      };
    }
    var lim = Infinity;
    if (feature === "shareProjects") lim = planLimits.shareProjects;
    else if (feature === "goals") lim = planLimits.goals;
    else if (feature === "notes") lim = planLimits.notes;
    else if (feature === "bankNotes") lim = planLimits.bankNotes;
    else if (feature === "documents") lim = planLimits.documents;
    else if (feature === "alerts") lim = planLimits.alerts;
    else if (feature === "widgets") lim = planLimits.widgets;
    else if (feature === "recurringMovements")
      lim = planLimits.recurringMovements;
    return { included: lim, rewarded: 0, total: lim, config: null };
  }
  function getPlanLimit(feature) {
    return featureLimits(feature).total;
  }
  function featureLabel(feature) {
    var m = {
      manualMovement: "movimenti giornalieri",
      instalmentMovement: "rateizzazioni",
      bulkMovement: "movimenti multipli",
      receiptScan: "scontrini",
      voiceEntry: "inserimento vocale",
      aiReply: "risposte AI",
      shareProjects: "progetti Share",
      shareDailyExpenses: "spese Share giornaliere",
      patrimonioCopy: "copia patrimonio",
      recurringMovements: "movimenti ricorrenti",
      goals: "obiettivi",
      notes: "note",
      bankNotes: "coordinate bancarie",
      documents: "documenti",
      alerts: "alert",
      widgets: "widget",
    };
    return m[feature] || feature;
  }
  function featureUsed(feature, currentCount) {
    if (rewardedFeatureConfig(feature))
      return planCount(featureUsageKey(feature));
    return Number(currentCount || 0);
  }
  function planRemaining(feature, currentCount) {
    var lim = featureLimits(feature);
    if (lim.total === Infinity) return Infinity;
    return Math.max(0, Number(lim.total) - featureUsed(feature, currentCount));
  }
  function upgradeMessage(feature, currentCount) {
    var label = planLabel(currentPlan, lang);
    var rem = planRemaining(feature, currentCount);
    var remText =
      rem === Infinity ? translateUiRuntimeText("illimitati") : String(rem);
    var f = translateUiRuntimeText(featureLabel(feature));
    function tr(s) {
      return translateUiRuntimeText(s)
        .replace("{plan}", label)
        .replace("{feature}", f)
        .replace("{remaining}", remText);
    }
    if (getPlanLimit(feature) === 0) {
      if (currentPlan === "free")
        return translateUiRuntimeText(
          "Questa funzionalità non è disponibile nel piano Gratuito. Vai in Info per passare a un piano superiore."
        );
      return tr(
        "Questa funzionalità non è disponibile nel piano {plan}. Vai in Info per passare a un piano superiore."
      );
    }
    if (feature === "manualMovement")
      return tr(
        "Limite giornaliero raggiunto. Hai già usato tutti i movimenti inclusi e quelli extra con annuncio."
      );
    if (feature === "instalmentMovement")
      return tr(
        "Hai raggiunto il limite giornaliero di rateizzazioni del piano {plan}."
      );
    if (feature === "shareProjects")
      return tr("Hai raggiunto il limite per progetti Share nel piano {plan}.");
    if (feature === "shareDailyExpenses")
      return tr(
        "Hai raggiunto il limite giornaliero di spese Share del piano {plan}."
      );
    if (feature === "patrimonioCopy")
      return tr(
        "Hai raggiunto il limite mensile per copiare il patrimonio nel piano {plan}."
      );
    if (feature === "goals")
      return tr(
        "Hai raggiunto il numero massimo di obiettivi del piano {plan}. Elimina un obiettivo oppure vai in Info per passare a un piano superiore. Restano: {remaining}."
      );
    if (feature === "bulkMovement") {
      var cd = bulkMovementCooldownText();
      if (cd) return cd;
      return tr(
        "Hai raggiunto il limite per movimenti multipli nel piano {plan}."
      );
    }
    if (feature === "receiptScan")
      return tr(
        "Hai raggiunto il limite giornaliero per lettura scontrini nel piano {plan}."
      );
    if (feature === "voiceEntry")
      return tr(
        "Hai raggiunto il limite giornaliero per inserimento vocale nel piano {plan}."
      );
    if (feature === "notes")
      return tr("Hai raggiunto il numero massimo di appunti del piano {plan}.");
    if (feature === "bankNotes")
      return tr(
        "Hai raggiunto il numero massimo di coordinate bancarie del piano {plan}."
      );
    if (feature === "documents")
      return tr(
        "I documenti non sono disponibili nel piano {plan}. Vai in Info per passare al piano Base o Completo."
      );
    if (feature === "recurringMovements")
      return tr(
        "Hai raggiunto il numero massimo di movimenti ricorrenti del piano {plan}."
      );
    return tr(
      "Hai raggiunto il limite per {feature} nel piano {plan}. Restano: {remaining}. Vai in Info per passare a un piano superiore."
    );
  }
  function rewardedFeatureGateState(feature, amount) {
    amount = Number(amount || 1);
    var lim = featureLimits(feature);
    if (lim.total === Infinity)
      return { state: "open", limit: Infinity, used: 0, remaining: Infinity };
    var used = planCount(featureUsageKey(feature));
    var included = Number(lim.included || 0),
      rewarded = Number(lim.rewarded || 0),
      total = Number(lim.total || 0);
    if (used + amount <= included)
      return {
        state: "open",
        limit: total,
        used: used,
        remaining: total - used,
        included: included,
        rewarded: rewarded,
      };
    if (used + amount > total)
      return {
        state: "blocked",
        limit: total,
        used: used,
        remaining: 0,
        included: included,
        rewarded: rewarded,
        text: upgradeMessage(feature),
      };
    if (rewarded <= 0)
      return {
        state: "blocked",
        limit: total,
        used: used,
        remaining: 0,
        included: included,
        rewarded: rewarded,
        text: upgradeMessage(feature),
      };
    var needed = Math.max(0, used + amount - included);
    var unlocked = planCount(featureExtraKey(feature));
    if (unlocked >= needed)
      return {
        state: "open",
        limit: total,
        used: used,
        remaining: total - used,
        included: included,
        rewarded: rewarded,
        unlocked: unlocked,
      };
    return {
      state: "ad",
      limit: total,
      used: used,
      remaining: total - used,
      included: included,
      rewarded: rewarded,
      needed: needed,
      unlocked: unlocked,
      text:
        "Hai usato i limiti inclusi per " +
        featureLabel(feature) +
        ". Guarda un annuncio per sbloccare 1 operazione extra.",
    };
  }
  function unlockRewardedFeature(feature, amount) {
    amount = Number(amount || 1);
    var g = rewardedFeatureGateState(feature, amount);
    if (g.state === "blocked") {
      setToast({ text: g.text, type: "error", color: "#E24B4A", icon: "🚫" });
      return false;
    }
    if (g.state === "ad") planInc(featureExtraKey(feature), 1);
    return true;
  }
  function manualMovementUsage() {
    var g = rewardedFeatureGateState("manualMovement", 1);
    var lim = featureLimits("manualMovement");
    var used = planCount(featureUsageKey("manualMovement"));
    var unlocked = planCount(featureExtraKey("manualMovement"));
    return {
      used: used,
      freeLimit: Number(lim.included || 0),
      extraLimit: Number(lim.rewarded || 0),
      totalLimit: lim.total,
      unlocked: unlocked,
      extraUsed: Math.max(0, used - Number(lim.included || 0)),
    };
  }
  function singleMovementGateState() {
    return rewardedFeatureGateState("manualMovement", 1);
  }
  function unlockRewardedMovement() {
    return unlockRewardedFeature("manualMovement", 1);
  }
  function featurePeriodText(feature) {
    var c = rewardedFeatureConfig(feature) || {};
    return c.period === "monthly" ? "questo mese" : "oggi";
  }
  function featureUnitName(feature) {
    var c = rewardedFeatureConfig(feature) || {};
    return c.label || featureLabel(feature);
  }
  function successToastForFeature(feature, label, usedAfterOverride) {
    label = String(label || "Operazione completata.");
    var lim = featureLimits(feature);
    if (lim.total === Infinity)
      return { text: label, type: "success", color: "#1D9E75", icon: "✅" };
    var usedAfter =
      usedAfterOverride !== undefined && usedAfterOverride !== null
        ? Number(usedAfterOverride)
        : planCount(featureUsageKey(feature));
    var included = Number(lim.included || 0),
      rewarded = Number(lim.rewarded || 0),
      total = Number(lim.total || 0);
    var unit = featureUnitName(feature);
    var period = featurePeriodText(feature);
    var remainingIncluded = Math.max(0, included - usedAfter);
    var remainingExtra = Math.max(0, total - usedAfter);
    function oneMany(n, singular, plural) {
      return Number(n) === 1 ? singular : plural;
    }
    function extraAdText(n) {
      return Number(n) === 1 ? "1 con annuncio" : n + " con annuncio";
    }
    if (usedAfter < included) {
      if (feature === "manualMovement") {
        if (remainingIncluded === 1 && rewarded > 0)
          return {
            text:
              label +
              "\nTi resta 1 movimento gratuito oggi + " +
              extraAdText(rewarded) +
              ".",
            type: "success",
            color: "#1D9E75",
            icon: "✅",
          };
        return {
          text:
            label +
            "\nTi " +
            oneMany(remainingIncluded, "resta", "restano") +
            " " +
            remainingIncluded +
            " " +
            oneMany(
              remainingIncluded,
              "movimento gratuito",
              "movimenti gratuiti"
            ) +
            " oggi.",
          type: "success",
          color: "#1D9E75",
          icon: "✅",
        };
      }
      if (remainingIncluded === 1 && rewarded > 0)
        return {
          text:
            label +
            "\nTi resta 1 " +
            unit +
            " inclusa " +
            period +
            " + " +
            extraAdText(rewarded) +
            ".",
          type: "success",
          color: "#1D9E75",
          icon: "✅",
        };
      return {
        text:
          label +
          "\nTi " +
          oneMany(remainingIncluded, "resta", "restano") +
          " " +
          remainingIncluded +
          " " +
          unit +
          " " +
          oneMany(remainingIncluded, "inclusa", "incluse") +
          " " +
          period +
          ".",
        type: "success",
        color: "#1D9E75",
        icon: "✅",
      };
    }
    if (usedAfter === included && rewarded > 0) {
      if (feature === "manualMovement")
        return {
          text:
            label +
            "\nHai completato le transazioni gratuite. Ne hai ancora " +
            rewarded +
            " se guardi un annuncio.",
          type: "success",
          color: "#1D9E75",
          icon: "✅",
        };
      if (feature === "voiceEntry")
        return {
          text:
            translateUiRuntimeText(label) +
            "\n" +
            translateUiRuntimeText(
              "Hai terminato per oggi gli inserimenti vocali gratuiti. Te ne resta"
            ) +
            " " +
            rewarded +
            " " +
            translateUiRuntimeText("con annuncio."),
          translated: true,
          type: "success",
          color: "#1D9E75",
          icon: "✅",
        };
      if (feature === "receiptScan")
        return {
          text:
            translateUiRuntimeText(label) +
            "\n" +
            translateUiRuntimeText(
              "Hai terminato per oggi gli scontrini gratuiti. Te ne resta"
            ) +
            " " +
            rewarded +
            " " +
            translateUiRuntimeText("con annuncio."),
          translated: true,
          type: "success",
          color: "#1D9E75",
          icon: "✅",
        };
      return {
        text:
          label +
          "\nHai completato le operazioni incluse per " +
          unit +
          ". Ne hai ancora " +
          rewarded +
          " se guardi un annuncio.",
        type: "success",
        color: "#1D9E75",
        icon: "✅",
      };
    }
    if (usedAfter < total) {
      if (feature === "manualMovement")
        return {
          text:
            label +
            "\nTi resta " +
            remainingExtra +
            " movimento extra se guardi un annuncio.",
          type: "success",
          color: "#1D9E75",
          icon: "✅",
        };
      return {
        text:
          label +
          "\nTi " +
          oneMany(remainingExtra, "resta", "restano") +
          " " +
          remainingExtra +
          " " +
          unit +
          " extra se guardi un annuncio.",
        type: "success",
        color: "#1D9E75",
        icon: "✅",
      };
    }
    if (feature === "manualMovement")
      return {
        text:
          label +
          "\nPer oggi non hai altre spese da inserire. Aspetta domani o passa a un altro piano.",
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      };
    return {
      text:
        label +
        "\nHai usato tutte le operazioni disponibili per " +
        unit +
        " " +
        period +
        ". Aspetta " +
        (featurePeriod(feature) === "monthly" ? "il prossimo mese" : "domani") +
        " o passa a un altro piano.",
      type: "warning",
      color: "#EF9F27",
      icon: "⚠️",
    };
  }
  function singleMovementSuccessToast(label, usedAfterOverride) {
    return successToastForFeature(
      "manualMovement",
      label || "Movimento aggiunto.",
      usedAfterOverride
    );
  }
  function bulkMovementSuccessToast(kind, count, usedAfterOverride) {
    return successToastForFeature(
      "bulkMovement",
      Number(count || 0) +
        " " +
        (kind === "income" ? "entrate" : "uscite") +
        " aggiunte correttamente.",
      usedAfterOverride
    );
  }
  function planFeatureGateState(feature) {
    return rewardedFeatureConfig(feature)
      ? rewardedFeatureGateState(feature, 1)
      : planRemaining(feature) <= 0
      ? { state: "blocked", text: upgradeMessage(feature) }
      : { state: "open" };
  }
  function limitedFeatureSuccessToast(feature, label, usedAfterOverride) {
    return successToastForFeature(feature, label, usedAfterOverride);
  }
  function remainingMessage(feature, currentCount) {
    var rem = planRemaining(feature, currentCount);
    if (rem === Infinity) return "";
    var lim = featureLimits(feature);
    if (rewardedFeatureConfig(feature)) {
      var used = planCount(featureUsageKey(feature));
      var included = Number(lim.included || 0),
        rewarded = Number(lim.rewarded || 0),
        total = Number(lim.total || 0);
      var unit = featureUnitName(feature);
      var period = featurePeriodText(feature);
      function oneMany(n, singular, plural) {
        return Number(n) === 1 ? singular : plural;
      }
      if (used < included) {
        var incLeft = Math.max(0, included - used);
        if (feature === "manualMovement") {
          if (incLeft === 1 && rewarded > 0)
            return (
              "Ti resta 1 movimento gratuito oggi + " +
              rewarded +
              " con un annuncio."
            );
          return (
            "Ti " +
            oneMany(incLeft, "resta", "restano") +
            " " +
            incLeft +
            " " +
            oneMany(incLeft, "movimento gratuito", "movimenti gratuiti") +
            " oggi."
          );
        }
        return (
          "Ti " +
          oneMany(incLeft, "resta", "restano") +
          " " +
          incLeft +
          " " +
          unit +
          " " +
          oneMany(incLeft, "inclusa", "incluse") +
          " " +
          period +
          (rewarded > 0 ? " + " + rewarded + " con annuncio." : ".")
        );
      }
      if (used === included && rewarded > 0) {
        if (feature === "manualMovement")
          return (
            "Hai completato le transazioni gratuite. Ne hai ancora " +
            rewarded +
            " se guardi un annuncio."
          );
        return (
          "Hai completato le operazioni incluse per " +
          unit +
          ". Ne hai ancora " +
          rewarded +
          " se guardi un annuncio."
        );
      }
      if (used < total) {
        var extraLeft = Math.max(0, total - used);
        if (feature === "manualMovement")
          return (
            "Ti resta " + extraLeft + " movimento extra se guardi un annuncio."
          );
        return (
          "Ti " +
          oneMany(extraLeft, "resta", "restano") +
          " " +
          extraLeft +
          " " +
          unit +
          " extra se guardi un annuncio."
        );
      }
      if (feature === "manualMovement")
        return "Per oggi non hai altre spese da inserire. Aspetta domani o passa a un altro piano.";
      return (
        "Hai usato tutte le operazioni disponibili per " +
        unit +
        " " +
        period +
        ". Aspetta " +
        (featurePeriod(feature) === "monthly" ? "il prossimo mese" : "domani") +
        " o passa a un altro piano."
      );
    }
    return "Operazioni residue: " + rem;
  }
  function openPlanInfo() {
    setMobileMenu(false);
    setTab("settings");
    setSettingsPage("plans_settings");
    try {
      setTimeout(function () {
        setTab("settings");
        setSettingsPage("plans_settings");
        setMobileMenu(false);
      }, 80);
    } catch (e) {}
  }
  var GOOGLE_PLAY_SUBSCRIPTION_IDS = {
    base: { productId: "base", monthly: "base-monthly", yearly: "base-yearly" },
    premium: {
      productId: "complete",
      monthly: "complete-monthly",
      yearly: "complete-yearly",
    },
  };
  var APPLE_SUBSCRIPTION_IDS = {
    base: { monthly: "base_monthly", yearly: "base_yearly" },
    premium: { monthly: "complete_monthly", yearly: "complete_yearly" },
  };
  function uniqueList(list) {
    var seen = {};
    return (list || [])
      .map(function (x) {
        return String(x || "").trim();
      })
      .filter(function (x) {
        if (!x || seen[x]) return false;
        seen[x] = true;
        return true;
      });
  }
  function appleProductIdOptions(pid, period) {
    var p = period === "yearly" ? "yearly" : "monthly";
    var p2 = period === "yearly" ? "annual" : "monthly";
    var p3 = period === "yearly" ? "annuale" : "mensile";
    var p4 = period === "yearly" ? "annuale" : "mensile";
    var basePrefix = "it.fainanceapp.app.";
    var altPrefixes = [
      "",
      basePrefix,
      "fainance.",
      "fainance_",
      "fainanceapp.",
      "fainanceapp_",
    ];
    function variants(names) {
      var out = [];
      names.forEach(function (name) {
        [p, p2, p3, p4].forEach(function (per) {
          ["_", "-", "."].forEach(function (sep) {
            altPrefixes.forEach(function (pre) {
              out.push(pre + name + sep + per);
            });
            altPrefixes.forEach(function (pre) {
              out.push(pre + per + sep + name);
            });
          });
        });
        altPrefixes.forEach(function (pre) {
          out.push(pre + name);
        });
      });
      return uniqueList(out);
    }
    if (pid === "base") return variants(["base", "plus"]);
    if (pid === "premium") return variants(["complete", "premium", "completo"]);
    return [];
  }
  function billingPeriodLabel(period) {
    return period === "yearly" ? L("Annuale") : L("Mensile");
  }
  function nativePlugin(name) {
    try {
      return (
        window &&
        window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins[name]
      );
    } catch (e) {
      return null;
    }
  }
  function nativePlatform() {
    try {
      var c = window && window.Capacitor;
      if (c && c.getPlatform) return c.getPlatform();
      if (c && c.isNativePlatform && c.isNativePlatform()) return "native";
    } catch (e) {}
    return "web";
  }
  function isNativeMobileApp() {
    try {
      return !!(
        window &&
        window.Capacitor &&
        window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform()
      );
    } catch (e) {
      return false;
    }
  }
  function isNativeAndroidApp() {
    return isNativeMobileApp() && nativePlatform() === "android";
  }
  function isNativeIOSApp() {
    return isNativeMobileApp() && nativePlatform() === "ios";
  }
  function appStoreName() {
    return isNativeIOSApp() ? "App Store" : "store";
  }
  function platformStoreBillingName() {
    return isNativeIOSApp()
      ? "App Store"
      : isNativeAndroidApp()
      ? "Google Play"
      : "store del dispositivo";
  }
  function currentRewardedAdUnitId() {
    return isNativeIOSApp()
      ? ADMOB_REWARDED_AD_UNIT_ID_IOS
      : ADMOB_REWARDED_AD_UNIT_ID_ANDROID;
  }
  function currentInterstitialAdUnitId() {
    return isNativeIOSApp()
      ? ADMOB_INTERSTITIAL_AD_UNIT_ID_IOS
      : ADMOB_INTERSTITIAL_AD_UNIT_ID_ANDROID;
  }
  function currentBannerAdUnitId() {
    return isNativeIOSApp()
      ? ADMOB_BANNER_AD_UNIT_ID_IOS
      : ADMOB_BANNER_AD_UNIT_ID_ANDROID;
  }
  var adConsentRequestedRef = useRef(false);
  var rewardedAdInProgressRef = useRef(false);
  var rewardedAdCompletedAtRef = useRef(0);
  function requestAdConsentIfNeeded() {
    var ads = nativePlugin("FainanceAds");
    if (!isNativeMobileApp() || !ads || !ads.requestConsent) return;
    if (adConsentRequestedRef.current) return;
    adConsentRequestedRef.current = true;
    try {
      ads.requestConsent({}).catch(function (e) {
        console.warn("AdMob consent error", e);
      });
    } catch (e) {}
  }
  function purchasePlan(pid, forcedPeriod, options) {
    options = options || {};
    if (pid === "free") {
      setCurrentPlan("free", true);
      setToast("Piano aggiornato: " + planLabel("free", lang));
      setTimeout(function () {
        try {
          saveWidgetSettingsToNative(
            false,
            enforceWidgetPlanPayload(widgetSettingsPayload())
          );
        } catch (e) {}
      }, 50);
      return;
    }
    var billing = nativePlugin("FainanceBilling");
    if (!isNativeMobileApp() || !billing || !billing.purchase) {
      setToast({
        text: L(
          "Gli acquisti reali sono disponibili solo dall’app installata dallo store."
        ),
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      });
      return;
    }
    var requestedPeriod = forcedPeriod || planBillingPeriod;
    var period = requestedPeriod === "yearly" ? "yearly" : "monthly";
    var productId = "";
    var basePlanId = "";
    var productIds = [];
    if (isNativeIOSApp()) {
      productIds = appleProductIdOptions(pid, period);
      var iosCfg = APPLE_SUBSCRIPTION_IDS[pid];
      productId =
        iosCfg && iosCfg[period] ? iosCfg[period] : productIds[0] || "";
      if (productId && productIds.indexOf(productId) < 0)
        productIds = [productId].concat(productIds);
    } else {
      var cfg = GOOGLE_PLAY_SUBSCRIPTION_IDS[pid];
      productId = cfg ? cfg.productId : "";
      basePlanId = cfg && cfg[period] ? cfg[period] : "";
      productIds = productId ? [productId] : [];
    }
    if (!productId) {
      setToast({
        text: L("Configurazione acquisto non disponibile."),
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      });
      return;
    }
    var loadingKey = pid + ":" + period;
    setPlanPurchaseLoading(loadingKey);
    billing
      .purchase({
        productId: productId,
        productIdsCsv: productIds.join("|"),
        basePlanId: basePlanId,
        plan: pid,
        billingPeriod: period,
        platform: nativePlatform(),
        offerTag: String(options.offerTag || ""),
        preferFreeTrial: !!options.preferFreeTrial,
        purchaseSource: String(options.purchaseSource || ""),
      })
      .then(function (res) {
        if (res && res.success) {
          setCurrentPlan(res.plan || pid, true);
          setPlanBillingPeriod(res.billingPeriod || period);
          setToast({
            text:
              L("Piano aggiornato") +
              ": " +
              planLabel(res.plan || pid, lang) +
              " · " +
              billingPeriodLabel(res.billingPeriod || period),
            type: "success",
            color: "#1D9E75",
            icon: "✅",
          });
          setTimeout(function () {
            try {
              saveWidgetSettingsToNative(
                false,
                enforceWidgetPlanPayload(widgetSettingsPayload())
              );
            } catch (e) {}
          }, 50);
        } else if (res && res.cancelled) {
          setToast({
            text: L("Acquisto annullato. Il piano resta invariato."),
            type: "warning",
            color: "#EF9F27",
            icon: "⚠️",
          });
        } else if (res && res.pending) {
          setToast({
            text: L("Acquisto in attesa di conferma dallo store."),
            type: "warning",
            color: "#EF9F27",
            icon: "⏳",
          });
        } else {
          var detail = res && res.message ? String(res.message) : "";
          if (!detail && res && res.productIdsTried)
            detail = "Prodotti provati: " + String(res.productIdsTried);
          setToast({
            text:
              L("Acquisto non completato. Il piano resta invariato.") +
              (detail ? " " + detail : ""),
            type: "warning",
            color: "#EF9F27",
            icon: "⚠️",
          });
        }
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err || "");
        setToast({
          text: L("Errore acquisto") + (msg ? ": " + msg : ""),
          type: "error",
          color: "#E24B4A",
          icon: "❌",
        });
      })
      .finally(function () {
        setPlanPurchaseLoading("");
      });
  }
  function restorePurchases() {
    var billing = nativePlugin("FainanceBilling");
    if (!isNativeMobileApp() || !billing || !billing.restorePurchases) {
      setToast({
        text: L(
          "Ripristino acquisti disponibile solo dall’app installata dallo store."
        ),
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      });
      return;
    }
    setPlanPurchaseLoading("restore");
    billing
      .restorePurchases({ platform: nativePlatform() })
      .then(function (res) {
        if (res && res.success && res.plan) {
          setCurrentPlan(res.plan, true);
          if (res.billingPeriod) setPlanBillingPeriod(res.billingPeriod);
          setToast({
            text: L("Acquisti ripristinati") + ": " + planLabel(res.plan, lang),
            type: "success",
            color: "#1D9E75",
            icon: "✅",
          });
          setTimeout(function () {
            try {
              saveWidgetSettingsToNative(
                false,
                enforceWidgetPlanPayload(widgetSettingsPayload())
              );
            } catch (e) {}
          }, 50);
        } else {
          var detail = res && res.message ? String(res.message) : "";
          setToast({
            text:
              L("Nessun abbonamento attivo trovato.") +
              (detail ? " " + detail : ""),
            type: "warning",
            color: "#EF9F27",
            icon: "⚠️",
          });
        }
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err || "");
        setToast({
          text: L("Errore ripristino acquisti") + (msg ? ": " + msg : ""),
          type: "error",
          color: "#E24B4A",
          icon: "❌",
        });
      })
      .finally(function () {
        setPlanPurchaseLoading("");
      });
  }
  useEffect(
    function () {
      if (appLocked || !termsAccepted || !privacyAccepted) return;
      if (
        onboardingGuideOpen ||
        initialSetupOpen ||
        onboardingGuideEligibleNow()
      )
        return;
      if (currentPlan !== "free") return;
      if (premiumTrialPromptStatus) return;
      var acceptedAt = Date.parse(String(legalAcceptanceDate || ""));
      if (!acceptedAt || isNaN(acceptedAt)) return;
      if (Date.now() - acceptedAt > 24 * 60 * 60 * 1000) return;
      if (premiumTrialPromptShownRef.current) return;
      var t = setTimeout(function () {
        premiumTrialPromptShownRef.current = true;
        setShowPremiumTrialPrompt(true);
      }, 450);
      return function () {
        clearTimeout(t);
      };
    },
    [
      appLocked,
      termsAccepted,
      privacyAccepted,
      currentPlan,
      premiumTrialPromptStatus,
      legalAcceptanceDate,
      onboardingGuideSeen,
      onboardingGuideOpen,
      initialSetupOpen,
    ]
  );

  function dismissPremiumTrialPrompt(status) {
    setPremiumTrialPromptStatus(status || "dismissed");
    setShowPremiumTrialPrompt(false);
  }
  function acceptPremiumTrialPrompt() {
    setPremiumTrialPromptStatus("accepted");
    setShowPremiumTrialPrompt(false);
    setPlanBillingPeriod("monthly");
    purchasePlan("premium", "monthly", {
      offerTag: "complete-trial-2m",
      preferFreeTrial: true,
      purchaseSource: "onboarding_trial_popup",
    });
  }
  function PremiumTrialPromptModal() {
    var trialBenefits = [
      "Consigli AI illimitati",
      "Conversazioni AI illimitate",
      "Statistiche e Impostazioni complete",
      "Movimenti Singoli Multipli, Ricorrenti e Rateizzati senza limiti",
      "7 Widget",
      "Progetti Share illimitati",
    ];
    var green = "#1D9E75";
    function languageCode() {
      return String(lang || "it")
        .split("-")[0]
        .toLowerCase();
    }
    function renderColoredParts(parts) {
      return (
        <>
          {parts.map(function (p, i) {
            return (
              <span
                key={i}
                style={p[1] ? { color: green, fontWeight: 980 } : undefined}
              >
                {p[0]}
              </span>
            );
          })}
        </>
      );
    }
    function premiumTrialTitleParts() {
      var l = languageCode();
      var map: any = {
        it: [
          ["Prova ", false],
          ["gratuitamente", true],
          [" la versione ", false],
          ["Completa", true],
          [" per 2 mesi", false],
        ],
        en: [
          ["Try the ", false],
          ["Complete", true],
          [" version ", false],
          ["free", true],
          [" for 2 months", false],
        ],
        es: [
          ["Prueba ", false],
          ["gratis", true],
          [" la versión ", false],
          ["Completa", true],
          [" durante 2 meses", false],
        ],
        fr: [
          ["Essayez ", false],
          ["gratuitement", true],
          [" la version ", false],
          ["Complète", true],
          [" pendant 2 mois", false],
        ],
        de: [
          ["Teste die ", false],
          ["Vollständige", true],
          [" Version 2 Monate ", false],
          ["kostenlos", true],
        ],
        pt: [
          ["Experimenta ", false],
          ["gratuitamente", true],
          [" a versão ", false],
          ["Completa", true],
          [" durante 2 meses", false],
        ],
        pl: [
          ["Wypróbuj ", false],
          ["pełną", true],
          [" wersję ", false],
          ["za darmo", true],
          [" przez 2 miesiące", false],
        ],
        nl: [
          ["Probeer de ", false],
          ["Volledige", true],
          [" versie 2 maanden ", false],
          ["gratis", true],
        ],
        ro: [
          ["Încearcă ", false],
          ["gratuit", true],
          [" versiunea ", false],
          ["Completă", true],
          [" timp de 2 luni", false],
        ],
        el: [
          ["Δοκίμασε ", false],
          ["δωρεάν", true],
          [" την ", false],
          ["Πλήρη", true],
          [" έκδοση για 2 μήνες", false],
        ],
      };
      return map[l] || map.it;
    }
    function premiumTrialSubtitleParts() {
      var l = languageCode();
      var map: any = {
        it: [
          ["Con il piano ", false],
          ["Completo", true],
          [" puoi usare tutte le funzioni ", false],
          ["senza limiti", true],
          [" e ", false],
          ["senza annunci", true],
        ],
        en: [
          ["With the ", false],
          ["Complete", true],
          [" plan, you can use all features ", false],
          ["without limits", true],
          [" and ", false],
          ["without ads", true],
        ],
        es: [
          ["Con el plan ", false],
          ["Completo", true],
          [" puedes usar todas las funciones ", false],
          ["sin límites", true],
          [" y ", false],
          ["sin anuncios", true],
        ],
        fr: [
          ["Avec le forfait ", false],
          ["Complet", true],
          [", vous pouvez utiliser toutes les fonctionnalités ", false],
          ["sans limites", true],
          [" et ", false],
          ["sans publicité", true],
        ],
        de: [
          ["Mit dem Tarif ", false],
          ["Completo", true],
          [" kannst du alle Funktionen ", false],
          ["ohne Einschränkungen", true],
          [" und ", false],
          ["ohne Werbung", true],
          [" nutzen", false],
        ],
        pt: [
          ["Com o plano ", false],
          ["Completo", true],
          [", podes usar todas as funções ", false],
          ["sem limites", true],
          [" e ", false],
          ["sem anúncios", true],
        ],
        pl: [
          ["W planie ", false],
          ["Completo", true],
          [" możesz korzystać ze wszystkich funkcji ", false],
          ["bez limitów", true],
          [" i ", false],
          ["bez reklam", true],
        ],
        nl: [
          ["Met het ", false],
          ["Completo", true],
          ["-abonnement kun je alle functies ", false],
          ["zonder beperkingen", true],
          [" en ", false],
          ["zonder advertenties", true],
          [" gebruiken", false],
        ],
        ro: [
          ["Cu planul ", false],
          ["Completo", true],
          [" poți folosi toate funcțiile ", false],
          ["fără limite", true],
          [" și ", false],
          ["fără reclame", true],
        ],
        el: [
          ["Με το πλάνο ", false],
          ["Completo", true],
          [" μπορείς να χρησιμοποιείς όλες τις λειτουργίες ", false],
          ["χωρίς όρια", true],
          [" και ", false],
          ["χωρίς διαφημίσεις", true],
        ],
      };
      return map[l] || map.it;
    }
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.58)",
          zIndex: 930,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "17vh 16px 3vh",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 560,
            background: cardBg,
            borderRadius: 24,
            border: "1px solid " + borderC,
            boxShadow: "0 18px 70px rgba(0,0,0,0.34)",
            padding: 20,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 12, right: 12 }}>
            <PopupCloseButton
              onClick={function () { dismissPremiumTrialPrompt("closed"); }}
              dark={dark}
              label={translateUiRuntimeText("Chiudi")}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingRight: 42,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                background:
                  "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 27,
                boxShadow: "0 8px 24px rgba(127,119,221,.32)",
              }}
            >
              💎
            </div>
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 950,
                  color: textC,
                  lineHeight: 1.12,
                }}
              >
                {renderColoredParts(premiumTrialTitleParts())}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: subC,
                  marginTop: 5,
                  fontWeight: 750,
                }}
              >
                {translateUiRuntimeText("Offerta valida per i nuovi utenti")}
              </div>
            </div>
          </div>
          <div
            style={{
              background: dark ? "#1e1e30" : "#F5F7FF",
              border: "1px solid " + (dark ? "#3d376a" : "#D8D2FF"),
              borderRadius: 18,
              padding: 15,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 950,
                color: textC,
                lineHeight: 1.35,
                marginBottom: 6,
              }}
            >
              {renderColoredParts(premiumTrialSubtitleParts())}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: textC,
                marginBottom: 10,
              }}
            >
              {translateUiRuntimeText("Inoltre hai a disposizione")}
            </div>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}
            >
              {trialBenefits.map(function (x) {
                return (
                  <div
                    key={x}
                    style={{
                      fontSize: 12.5,
                      color: subC,
                      fontWeight: 780,
                      lineHeight: 1.32,
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: green, fontWeight: 950 }}>✓</span>
                    <span>{translateUiRuntimeText(x)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: subC,
              lineHeight: 1.45,
              marginBottom: 14,
            }}
          >
            {translateUiRuntimeText(
              "Se accetti, si aprirà lo store per attivare la prova gratuita. Dopo i 2 mesi l’abbonamento si rinnoverà automaticamente al prezzo indicato dallo store, salvo cancellazione prima della fine della prova."
            )}
          </div>
          <button
            onClick={acceptPremiumTrialPrompt}
            disabled={!!planPurchaseLoading}
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
              color: "#fff",
              border: "none",
              borderRadius: btnRadius,
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 950,
              cursor: planPurchaseLoading ? "not-allowed" : "pointer",
              opacity: planPurchaseLoading ? 0.7 : 1,
              boxShadow: "0 8px 22px rgba(127,119,221,.28)",
              marginBottom: 9,
            }}
          >
            {translateUiRuntimeText(
              planPurchaseLoading ? "Acquisto in corso..." : "Accetta"
            )}
          </button>
          <button
            onClick={function () {
              dismissPremiumTrialPrompt("free");
            }}
            disabled={!!planPurchaseLoading}
            style={{
              width: "100%",
              background: dark ? "#252535" : "#fff",
              color: subC,
              border: "1px solid " + borderC,
              borderRadius: btnRadius,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 900,
              cursor: planPurchaseLoading ? "not-allowed" : "pointer",
              opacity: planPurchaseLoading ? 0.7 : 1,
            }}
          >
            {translateUiRuntimeText(
              "Voglio continuare con la versione gratuita"
            )}
          </button>
        </div>
      </div>
    );
  }

  function showShortInterstitialForExtraMovement(onDismiss) {
    var nowMs = Date.now();
    if (rewardedAdInProgressRef.current) return;
    if (nowMs - Number(rewardedAdCompletedAtRef.current || 0) < 2500) return;
    var ads = nativePlugin("FainanceAds");
    if (!isNativeMobileApp() || !ads || !ads.showInterstitial) {
      setToast({
        text: L(
          "Annuncio breve non disponibile in questa versione. Aggiorna l'app e riprova."
        ),
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      });
      return;
    }
    rewardedAdInProgressRef.current = true;
    requestAdConsentIfNeeded();
    setToast({
      text: L("Caricamento annuncio..."),
      type: "info",
      color: "#7F77DD",
      icon: "⏳",
    });
    var unitId = currentInterstitialAdUnitId();
    var options = unitId ? { adUnitId: unitId } : {};
    ads
      .showInterstitial(options)
      .then(function (res) {
        if (res && res.shown) {
          rewardedAdCompletedAtRef.current = Date.now();
          onDismiss();
        } else setToast({ text: L("Annuncio non completato. Operazione extra non sbloccata."), type: "warning", color: "#EF9F27", icon: "⚠️" });
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err || "");
        setToast({
          text: L("Annuncio non disponibile") + (msg ? ": " + msg : ""),
          type: "warning",
          color: "#EF9F27",
          icon: "⚠️",
        });
      })
      .finally(function () {
        rewardedAdInProgressRef.current = false;
      });
  }

  function showRewardedAdForExtraMovement(onReward) {
    var nowMs = Date.now();
    if (rewardedAdInProgressRef.current) return;
    if (nowMs - Number(rewardedAdCompletedAtRef.current || 0) < 2500) return;
    var ads = nativePlugin("FainanceAds");
    if (!isNativeMobileApp() || !ads || !ads.showRewarded) {
      setToast({
        text: L(
          "Annuncio non disponibile in questa versione. Installa l’app dallo store e riprova."
        ),
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      });
      return;
    }
    rewardedAdInProgressRef.current = true;
    requestAdConsentIfNeeded();
    setToast({
      text: L("Caricamento annuncio..."),
      type: "info",
      color: "#7F77DD",
      icon: "⏳",
    });
    ads
      .showRewarded({ adUnitId: currentRewardedAdUnitId() })
      .then(function (res) {
        if (res && res.rewarded) {
          rewardedAdCompletedAtRef.current = Date.now();
          onReward();
        } else setToast({ text: L("Annuncio non completato. Operazione extra non sbloccata."), type: "warning", color: "#EF9F27", icon: "⚠️" });
      })
      .catch(function (err) {
        var msg = err && err.message ? err.message : String(err || "");
        setToast({
          text: L("Annuncio non disponibile") + (msg ? ": " + msg : ""),
          type: "warning",
          color: "#EF9F27",
          icon: "⚠️",
        });
      })
      .finally(function () {
        rewardedAdInProgressRef.current = false;
      });
  }
  var WIDGET_PLAN_REQUIREMENTS = {
    quick: "free",
    note: "base",
    goal: "base",
    shoppingList: "free",
    fidelity: "free",
    debtCredits: "premium",
    voiceAssistant: "base",
    share: "premium",
  };
  var WIDGET_TYPE_ORDER = [
    "quick",
    "fidelity",
    "shoppingList",
    "note",
    "goal",
    "debtCredits",
    "voiceAssistant",
    "share",
  ];
  function planRank(plan) {
    var order = { free: 0, base: 1, premium: 2 };
    return order[plan] != null ? order[plan] : 0;
  }
  function isWidgetAllowed(widgetType) {
    var required = WIDGET_PLAN_REQUIREMENTS[widgetType] || "free";
    return planRank(currentPlan) >= planRank(required);
  }
  function widgetPlanName(widgetType) {
    return planLabel(WIDGET_PLAN_REQUIREMENTS[widgetType] || "free", lang);
  }
  function widgetLockedMessage(widgetType) {
    return (
      "Widget disponibile dal piano " +
      widgetPlanName(widgetType) +
      "."
    );
  }
  function settingAllowed(requiredPlan) {
    return planRank(currentPlan) >= planRank(requiredPlan || "free");
  }
  function settingPlanName(requiredPlan) {
    return planLabel(requiredPlan || "free", lang);
  }
  function settingLockedMessage(requiredPlan) {
    return (
      translateUiRuntimeText("Questa funzione non è disponibile con il piano attuale.") +
      "\n" +
      translateUiRuntimeText("Effettua l’upgrade")
    );
  }
  function blockSetting(requiredPlan) {
    if (settingAllowed(requiredPlan)) return false;
    setToast({
      text: settingLockedMessage(requiredPlan),
      type: "warning",
      color: "#FFF8E1",
      textColor: "#856404",
      icon: "🔒",
      actionLabel: translateUiRuntimeText("Piani"),
      actionPage: "plans_settings",
      duration: 7000,
    });
    return true;
  }
  function guardedSetter(fn, requiredPlan) {
    return function (v) {
      if (blockSetting(requiredPlan)) return;
      return fn(v);
    };
  }
  function setExpenseCatsFromSettings(nextItems) {
    var nextList =
      typeof nextItems === "function" ? nextItems(cats) : nextItems;
    nextList = Array.isArray(nextList) ? nextList : [];
    var nextIds = nextList.map(function (c) {
      return String(c.id);
    });
    var removedItems = (cats || []).filter(function (c) {
      return nextIds.indexOf(String(c.id)) < 0 && !c.deleted;
    });
    var removedIds = removedItems.map(function (c) {
      return String(c.id);
    });
    if (removedIds.length) {
      setCatOrder(function (prev) {
        return (prev || []).filter(function (id) {
          return removedIds.indexOf(String(id)) < 0;
        });
      });
      setFilterCats(function (prev) {
        return (prev || []).filter(function (id) {
          var sid = String(id);
          return (
            removedIds.indexOf(sid) < 0 &&
            removedIds.indexOf(sid.replace(/^expense:/, "")) < 0
          );
        });
      });
      if (
        defaultExpenseCat &&
        removedIds.indexOf(String(defaultExpenseCat)) >= 0
      )
        setDefaultExpenseCat("");
      if (mergeFrom && removedIds.indexOf(String(mergeFrom)) >= 0)
        setMergeFrom("");
      if (mergeTo && removedIds.indexOf(String(mergeTo)) >= 0) setMergeTo("");
      setBudgetPlan(function (prev) {
        var bp = prev || {};
        return {
          ...bp,
          items: (bp.items || []).filter(function (b) {
            return (
              removedIds.indexOf(String(b.catId || b.categoryId || "")) < 0
            );
          }),
        };
      });
      var nowIso = new Date().toISOString();
      var defaultIds = {};
      (DEFAULT_CATS || []).forEach(function (d) {
        defaultIds[String(d.id)] = true;
      });
      removedItems.forEach(function (c) {
        if (defaultIds[String(c.id)])
          nextList.push({
            ...c,
            archived: true,
            deleted: true,
            custom: true,
            updatedAt: nowIso,
          });
      });
    }
    setCats(
      compactProtectedArray(
        nextList,
        DEFAULT_CATS,
        DEFAULT_EXPENSE_CATEGORY_NAMES
      )
    );
  }
  function guardedHandler(fn, requiredPlan) {
    return function () {
      if (blockSetting(requiredPlan)) return;
      return fn.apply(null, arguments);
    };
  }
  function widgetAvailabilityForPlan(plan) {
    var order = { free: 0, base: 1, premium: 2 };
    var activePlan = PLAN_LIMITS[plan]
      ? plan
      : currentPlanRef.current || currentPlan || "free";
    var all = WIDGET_TYPE_ORDER;
    var availability = {};
    all.forEach(function (type) {
      var required = WIDGET_PLAN_REQUIREMENTS[type] || "free";
      availability[type] = (order[activePlan] || 0) >= (order[required] || 0);
    });
    return availability;
  }
  function widgetTypesForPlan(plan) {
    var av = widgetAvailabilityForPlan(plan);
    return WIDGET_TYPE_ORDER.filter(function (k) {
      return !!av[k];
    });
  }
  function disabledWidgetTypesForPlan(plan) {
    var av = widgetAvailabilityForPlan(plan);
    return WIDGET_TYPE_ORDER.filter(function (k) {
      return !av[k];
    });
  }
  function enforceWidgetPlanPayload(payload) {
    payload = payload || {};
    var noteAllowed = isWidgetAllowed("note");
    var goalAllowed = isWidgetAllowed("goal");
    var shoppingListAllowed = isWidgetAllowed("shoppingList");
    var fidelityAllowed = isWidgetAllowed("fidelity");
    var debtCreditsAllowed = isWidgetAllowed("debtCredits");
    var shareAllowed = isWidgetAllowed("share");
    payload.quickAdd = { ...(payload.quickAdd || {}), enabled: true };
    payload.noteWidget = {
      ...(payload.noteWidget || {}),
      enabled: noteAllowed && !!(payload.noteWidget || {}).enabled,
    };
    payload.goalWidget = {
      ...(payload.goalWidget || {}),
      enabled: goalAllowed && !!(payload.goalWidget || {}).enabled,
    };
    payload.shoppingListWidget = {
      ...(payload.shoppingListWidget || {}),
      enabled:
        shoppingListAllowed && !!(payload.shoppingListWidget || {}).enabled,
    };
    payload.fidelityWidget = {
      ...(payload.fidelityWidget || {}),
      enabled: fidelityAllowed && !!(payload.fidelityWidget || {}).enabled,
    };
    payload.debtCreditsWidget = {
      ...(payload.debtCreditsWidget || {}),
      enabled:
        debtCreditsAllowed && !!(payload.debtCreditsWidget || {}).enabled,
    };
    payload.shareWidget = {
      ...(payload.shareWidget || {}),
      enabled: shareAllowed,
    };
    if (!shareAllowed && payload.shareWidget) {
      payload.shareWidget.projectId = "";
      payload.shareWidget.projectName =
        "Disponibile dal piano " + widgetPlanName("share");
      payload.shareWidget.projectItems = [];
      payload.shareWidget.netAmount = 0;
      payload.shareWidget.owedAmount = 0;
      payload.shareWidget.oweAmount = 0;
      payload.shareWidget.lastActivity =
        "Passa al piano " +
        widgetPlanName("share") +
        " per usare il widget Share";
    }
    var safePlan = currentPlanRef.current || currentPlan || "free";
    var availableTypes = widgetTypesForPlan(safePlan);
    var disabledTypes = disabledWidgetTypesForPlan(safePlan);
    payload.widget_current_plan = safePlan;
    payload.widget_order = WIDGET_TYPE_ORDER.slice();
    payload.widget_available_types = availableTypes;
    payload.widget_enabled_types = availableTypes;
    payload.widget_disabled_types = disabledTypes;
    payload.widget_plan_availability = widgetAvailabilityForPlan(safePlan);
    payload.widget_plan_requirements = WIDGET_PLAN_REQUIREMENTS;
    return payload;
  }
  function canUsePlanFeature(feature, amount) {
    amount = Number(amount || 1);
    if (rewardedFeatureConfig(feature)) {
      var g = rewardedFeatureGateState(feature, amount);
      return g.state !== "blocked";
    }
    var limit = getPlanLimit(feature);
    if (limit === Infinity) return true;
    return featureUsed(feature) + amount <= limit;
  }
  function canAddPlanItem(feature, currentCount, amount) {
    amount = Number(amount || 1);
    if (rewardedFeatureConfig(feature)) {
      var lim = featureLimits(feature);
      if (lim.total === Infinity) return true;
      var used = Math.max(
        planCount(featureUsageKey(feature)),
        Number(currentCount || 0)
      );
      return used + amount <= Number(lim.total);
    }
    var limit = getPlanLimit(feature);
    if (limit === Infinity) return true;
    return Number(currentCount || 0) + amount <= Number(limit);
  }
  function consumePlanFeature(feature, amount) {
    amount = Number(amount || 1);
    if (rewardedFeatureConfig(feature)) {
      planInc(featureUsageKey(feature), amount);
      return;
    }
    var key = "";
    if (feature === "aiReply") key = usageKey("aiReply", "daily");
    if (key) planInc(key, amount);
  }
  function handleRewardedFeature(feature, amount, onAllowed, label) {
    amount = Number(amount || 1);
    var g = rewardedFeatureGateState(feature, amount);
    if (g.state === "blocked") {
      setToast({ text: g.text, type: "error", color: "#E24B4A", icon: "🚫" });
      return false;
    }
    if (g.state === "ad") {
      var left = Math.max(0, Number(g.rewarded || 0) - Number(g.unlocked || 0));
      var firstManualMovementAd =
        feature === "manualMovement" && Number(g.unlocked || 0) === 0;
      var introDuration = firstManualMovementAd ? 700 : 1800;
      var introDelay = firstManualMovementAd ? 250 : 900;
      var introText;
      if (feature === "manualMovement") {
        introText = firstManualMovementAd
          ? translateUiRuntimeText(
              "Transazioni gratuite completate. Sta per partire il primo annuncio per sbloccare 1 movimento extra."
            )
          : translateUiRuntimeText(
              "Sta per partire il secondo annuncio per sbloccare l'ultimo movimento extra di oggi."
            );
      } else {
        introText =
          translateUiRuntimeText(
            "Hai terminato le risposte gratuite incluse. Sta per partire un annuncio per sbloccare un messaggio extra."
          ) +
          " " +
          translateUiRuntimeText("Messaggi extra disponibili con annuncio") +
          ": " +
          left +
          ".";
      }
      setToast({
        text: introText,
        type: "warning",
        color: "#EF9F27",
        icon: "📢",
        duration: introDuration,
      });
      setTimeout(function () {
        var showAd = firstManualMovementAd
          ? showShortInterstitialForExtraMovement
          : showRewardedAdForExtraMovement;
        showAd(function () {
          if (unlockRewardedFeature(feature, amount)) {
            onAllowed();
          }
        });
      }, introDelay);
      return false;
    }
    onAllowed();
    return true;
  }
  function useRewardedMovement() {
    var g = singleMovementGateState();
    if (g.state === "open") return true;
    setToast({ text: g.text, type: "error", color: "#E24B4A", icon: "🚫" });
    return false;
  }
  function addExpenses(items, source) {
    var list = Array.isArray(items) ? items : [items];
    if (source === "import") {
      setExpenses(function (p) {
        return list
          .map(function (x) {
            return {
              ...expenseWithMethodSnapshot(x),
              amount: Math.abs(parseMoney(x.amount)),
              createdAt: x.createdAt || new Date().toISOString(),
            };
          })
          .filter(function (x) {
            return x.amount > 0;
          })
          .concat(p);
      });
      return true;
    }
    var hasInstalment = list.some(function (x) {
      return !!x.rateizzato;
    });
    var feature =
      source === "bulk" || list.length > 1
        ? "bulkMovement"
        : source === "receipt"
        ? "receiptScan"
        : source === "voice" || source === "assistant"
        ? "voiceEntry"
        : hasInstalment
        ? "instalmentMovement"
        : "manualMovement";
    var amount = feature === "bulkMovement" ? 1 : list.length;
    if (feature === "bulkMovement") {
      var maxBulk = bulkMovementRowLimit(currentPlan);
      if (maxBulk !== Infinity && list.length > maxBulk) {
        setToast({
          text:
            translateUiRuntimeText("Puoi inserire al massimo ") +
            maxBulk +
            translateUiRuntimeText(" movimenti per volta."),
          type: "warning",
          color: "#EF9F27",
          icon: "⚠️",
        });
        return false;
      }
    }
    if (!canUsePlanFeature(feature, amount)) {
      setToast({
        text: upgradeMessage(feature),
        type: "error",
        color: "#E24B4A",
        icon: "🚫",
      });
      return false;
    }
    function save() {
      var usedAfter = rewardedFeatureConfig(feature)
        ? planCount(featureUsageKey(feature)) + amount
        : null;
      consumePlanFeature(feature, amount);
      if (hasInstalment && feature !== "instalmentMovement")
        consumePlanFeature(
          "instalmentMovement",
          list.filter(function (x) {
            return !!x.rateizzato;
          }).length
        );
      setExpenses(function (p) {
        return list
          .map(function (x) {
            return {
              ...expenseWithMethodSnapshot(x),
              amount: Math.abs(parseMoney(x.amount)),
              createdAt: x.createdAt || new Date().toISOString(),
            };
          })
          .filter(function (x) {
            return x.amount > 0;
          })
          .concat(p);
      });
      if (feature === "manualMovement")
        setToast(singleMovementSuccessToast("Uscita aggiunta.", usedAfter));
      else if (feature === "instalmentMovement")
        setToast(
          successToastForFeature(
            "instalmentMovement",
            "Uscita rateizzata aggiunta.",
            usedAfter
          )
        );
      else if (feature === "receiptScan") {
        setToast(
          limitedFeatureSuccessToast(
            "receiptScan",
            "Scontrino salvato.",
            usedAfter
          )
        );
        // Rimani in Inserimento > Scontrino: il pannello si azzera da solo
        // e l'utente può acquisire subito la ricevuta successiva.
      } else if (feature === "voiceEntry") {
        setToast(
          limitedFeatureSuccessToast(
            "voiceEntry",
            source === "assistant"
              ? "Uscita aggiunta dall’assistente."
              : "Uscita vocale salvata.",
            usedAfter
          )
        );
        if (source !== "assistant") {
          setVoiceModal(false);
          setVoiceListening(false);
          setVoiceText("");
          setVoiceParsed(null);
          setVoiceError("");
          setTab("history");
          setHistoryTab("expenses");
        }
      } else if (feature === "bulkMovement")
        setToast(bulkMovementSuccessToast("expense", list.length, usedAfter));
    }
    if (rewardedFeatureConfig(feature)) {
      return handleRewardedFeature(feature, amount, save);
    }
    save();
    return true;
  }
  function addIncomes(items, source) {
    var list = Array.isArray(items) ? items : [items];
    if (source === "import") {
      setIncomes(function (p) {
        return list
          .map(function (x) {
            return {
              ...x,
              amount: Math.abs(parseMoney(x.amount)),
              createdAt: x.createdAt || new Date().toISOString(),
            };
          })
          .filter(function (x) {
            return x.amount > 0;
          })
          .concat(p);
      });
      return true;
    }
    var hasInstalment = list.some(function (x) {
      return !!x.rateizzato;
    });
    var feature =
      source === "bulk" || list.length > 1
        ? "bulkMovement"
        : source === "voice" || source === "assistant"
        ? "voiceEntry"
        : hasInstalment
        ? "instalmentMovement"
        : "manualMovement";
    var amount = feature === "bulkMovement" ? 1 : list.length;
    if (feature === "bulkMovement") {
      var maxBulk = bulkMovementRowLimit(currentPlan);
      if (maxBulk !== Infinity && list.length > maxBulk) {
        setToast({
          text:
            translateUiRuntimeText("Puoi inserire al massimo ") +
            maxBulk +
            translateUiRuntimeText(" movimenti per volta."),
          type: "warning",
          color: "#EF9F27",
          icon: "⚠️",
        });
        return false;
      }
    }
    if (!canUsePlanFeature(feature, amount)) {
      setToast({
        text: upgradeMessage(feature),
        type: "error",
        color: "#E24B4A",
        icon: "🚫",
      });
      return false;
    }
    function save() {
      var usedAfter = rewardedFeatureConfig(feature)
        ? planCount(featureUsageKey(feature)) + amount
        : null;
      consumePlanFeature(feature, amount);
      if (hasInstalment && feature !== "instalmentMovement")
        consumePlanFeature(
          "instalmentMovement",
          list.filter(function (x) {
            return !!x.rateizzato;
          }).length
        );
      setIncomes(function (p) {
        return list
          .map(function (x) {
            return {
              ...x,
              amount: Math.abs(parseMoney(x.amount)),
              createdAt: x.createdAt || new Date().toISOString(),
            };
          })
          .filter(function (x) {
            return x.amount > 0;
          })
          .concat(p);
      });
      if (feature === "manualMovement")
        setToast(singleMovementSuccessToast("Entrata aggiunta.", usedAfter));
      else if (feature === "instalmentMovement")
        setToast(
          successToastForFeature(
            "instalmentMovement",
            "Entrata rateizzata aggiunta.",
            usedAfter
          )
        );
      else if (feature === "voiceEntry") {
        setToast(
          limitedFeatureSuccessToast(
            "voiceEntry",
            source === "assistant"
              ? "Entrata aggiunta dall’assistente."
              : "Entrata vocale salvata.",
            usedAfter
          )
        );
        if (source !== "assistant") {
          setVoiceModal(false);
          setVoiceListening(false);
          setVoiceText("");
          setVoiceParsed(null);
          setVoiceError("");
          setTab("history");
          setHistoryTab("incomes");
        }
      } else if (feature === "bulkMovement")
        setToast(bulkMovementSuccessToast("income", list.length, usedAfter));
    }
    if (rewardedFeatureConfig(feature)) {
      return handleRewardedFeature(feature, amount, save);
    }
    save();
    return true;
  }
  function confirmRecurring(r, mk) {
    if (!planLimits.recurringMovements) {
      setToast({
        text: translateUiRuntimeText(
          "Movimenti ricorrenti disponibili dal piano Base."
        ),
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      });
      return;
    }
    var day =
      r.dayOfMonth === 0
        ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        : r.dayOfMonth;
    var ds = new Date(now.getFullYear(), now.getMonth(), day)
      .toISOString()
      .split("T")[0];
    if (r.rtype === "expense")
      setExpenses(function (p) {
        return [
          expenseWithMethodSnapshot({
            id: Date.now(),
            amount: r.amount,
            catId: Number(r.catId),
            methodId: Number(r.methodId),
            desc: r.name,
            date: ds,
            rateizzato: r.rateizzato,
            rate: r.rate,
            createdAt: new Date().toISOString(),
          }),
          ...p,
        ];
      });
    else
      setIncomes(function (p) {
        return [
          {
            id: Date.now(),
            amount: r.amount,
            type: r.incomeType,
            desc: r.name,
            date: ds,
            rateizzato: r.rateizzato,
            rate: r.rate,
            createdAt: new Date().toISOString(),
          },
          ...p,
        ];
      });
    setRecurring(function (p) {
      return p.map(function (x) {
        return x.id === r.id
          ? { ...x, confirmed: [...(x.confirmed || []), mk] }
          : x;
      });
    });
  }

  var curMonthExp = totalForMonth(
    expenses,
    curMonthKey,
    homeBalanceView === "reale" ? "reale" : "rateizzato"
  );
  var curMonthInc = totalForMonth(
    incomes,
    curMonthKey,
    homeBalanceView === "reale" ? "reale" : "rateizzato"
  );
  var yearExp = expenses
    .filter(function (e) {
      return e.date.startsWith(String(curYear));
    })
    .reduce(function (a, e) {
      return a + e.amount;
    }, 0);
  var yearInc = incomes
    .filter(function (i) {
      return i.date.startsWith(String(curYear));
    })
    .reduce(function (a, i) {
      return a + i.amount;
    }, 0);
  var last12Balance = useMemo(
    function () {
      return balanceForMonths(expenses, incomes, last12MonthKeys(now));
    },
    [expenses, incomes, curMonthKey]
  );
  var localizedMonthShorts = useMemo(
    function () {
      return Array.from({ length: 12 }, function (_, i) {
        return monthShortName(i);
      });
    },
    [lang]
  );
  var monthlyTotals = useMemo(
    function () {
      return monthlyTotalsForYear(
        expenses,
        incomes,
        curYear,
        statsView === "reale" ? "reale" : "rateizzato",
        localizedMonthShorts
      );
    },
    [expenses, incomes, curYear, statsView, localizedMonthShorts]
  );
  function recurringDueInCurrentMonth(r) {
    return isRecurringDueInMonth(r, now, curMonthKey);
  }
  var pendingCount = recurring.filter(recurringDueInCurrentMonth).length;

  // compute triggered alerts
  function computeTriggered() {
    return alerts
      .filter(function (al) {
        var prefix = al.period === "annual" ? String(curYear) : curMonthKey;
        var spent;
        if (al.type === "cat")
          spent = expenses
            .filter(function (e) {
              return e.catId === al.catId && e.date.startsWith(prefix);
            })
            .reduce(function (a, e) {
              return a + e.amount;
            }, 0);
        else {
          var gc = cats
            .filter(function (c) {
              return c.group === al.groupId;
            })
            .map(function (c) {
              return c.id;
            });
          spent = expenses
            .filter(function (e) {
              return gc.includes(e.catId) && e.date.startsWith(prefix);
            })
            .reduce(function (a, e) {
              return a + e.amount;
            }, 0);
        }
        var triggered =
          al.triggerMode === "immediate"
            ? spent >= al.budget
            : spent >= al.budget * (1 + (al.triggerPct || 0) / 100);
        if (!triggered) return false;
        al._spent = spent;
        return true;
      })
      .map(function (al) {
        var grps = expenseGroups || DEFAULT_EXPENSE_GROUPS;
        var cat3 =
          al.type === "cat"
            ? cats.find(function (c) {
                return c.id === al.catId;
              })
            : null;
        var prefixKey = al.period === "annual" ? String(curYear) : curMonthKey;
        return {
          ...al,
          _alertKey: String(al.id) + ":" + prefixKey,
          spentFmt: fmt(al._spent),
          budgetFmt: fmt(al.budget),
          pct: al.budget > 0 ? Math.min(200, (al._spent / al.budget) * 100) : 0,
        };
      });
  }
  var allTriggeredAlertsData = useMemo(computeTriggered, [
    alerts,
    expenses,
    cats,
    curMonthKey,
    curYear,
    expenseGroups,
  ]);
  function alertSeenKey(al) {
    return String((al && al._alertKey) || (al && al.id) || "");
  }
  var triggeredAlertsData = useMemo(
    function () {
      var seen = new Set(
        Array.isArray(shownAlertIds) ? shownAlertIds.map(String) : []
      );
      return allTriggeredAlertsData.filter(function (a) {
        return !seen.has(alertSeenKey(a));
      });
    },
    [allTriggeredAlertsData, shownAlertIds]
  );
  var alertTriggered = triggeredAlertsData.length;
  function markAlertsSeen(list) {
    var source =
      Array.isArray(list) && list.length ? list : triggeredAlertsData;
    var keys = source.map(alertSeenKey).filter(Boolean);
    if (keys.length) {
      var set = new Set(
        (Array.isArray(shownAlertIds) ? shownAlertIds : []).map(String)
      );
      keys.forEach(function (k) {
        set.add(String(k));
      });
      setShownAlertIds(Array.from(set));
      try {
        localStorage.setItem(
          userKey("shown_alert_ids_v2"),
          JSON.stringify(Array.from(set))
        );
      } catch (e) {}
      if (userId) {
        try {
          setDoc(
            doc(fbDb, "userData", userId),
            {
              shownAlertIds: Array.from(set),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch(function () {});
        } catch (e) {}
      }
    }
    setAlertPopup(null);
  }

  // ── REAL-TIME ALERT: only fire popup for newly triggered and not-yet-seen alerts ──
  var prevTriggeredIdsRef = useRef([]);
  useEffect(
    function () {
      if (!firestoreReady) return;
      var currentIds = triggeredAlertsData.map(alertSeenKey);
      var seen = new Set(
        Array.isArray(shownAlertIds) ? shownAlertIds.map(String) : []
      );
      var newIds = currentIds.filter(function (id) {
        return id && !seen.has(id) && !prevTriggeredIdsRef.current.includes(id);
      });
      if (newIds.length > 0) {
        var newAlerts = triggeredAlertsData.filter(function (a) {
          return newIds.includes(alertSeenKey(a));
        });
        setAlertPopup(newAlerts);
      }
      prevTriggeredIdsRef.current = currentIds;
    },
    [
      firestoreReady,
      JSON.stringify(triggeredAlertsData.map(alertSeenKey)),
      JSON.stringify(shownAlertIds || []),
    ]
  );
  useEffect(
    function () {
      if (tab === "alerts" && triggeredAlertsData.length > 0)
        markAlertsSeen(triggeredAlertsData);
    },
    [tab, JSON.stringify(triggeredAlertsData.map(alertSeenKey))]
  );

  function sortHistoryItems(list) {
    return sortFinancialHistoryItems(
      list,
      historySortDate,
      historySortDirection,
      historySortSecondary || "amount",
      historySortSecondaryDirection || "desc",
      getCat,
      getIT
    );
  }

  var shareHistoryExpenses = useMemo(
    function () {
      if (!showShareInHistory) return [];
      return (shareProjects || []).flatMap(function (project) {
        return (project.activities || [])
          .filter(function (a) {
            return a.kind !== "settlement";
          })
          .map(function (a) {
            var paidBy = (project.participants || []).find(function (p) {
              return p.id === a.paidBy;
            });
            var myShare =
              a.shares && a.shares.me !== undefined
                ? Number(a.shares.me)
                : (Number(a.amount) || 0) /
                  Math.max(
                    1,
                    (project.participants || []).filter(function (p) {
                      return p.status !== "archived";
                    }).length || 1
                  );
            var foreignShare =
              a.originalAmount && Number(a.amount) > 0
                ? (Number(a.originalAmount) * myShare) / Number(a.amount)
                : null;
            return {
              id: "share_" + project.id + "_" + a.id,
              amount: myShare,
              originalAmount: foreignShare,
              currency: a.currency || currency,
              baseCurrency: a.baseCurrency || currency,
              baseAmount: myShare,
              exchangeRate: Number(a.exchangeRate || 1),
              exchangeRateDate: a.exchangeRateDate || "",
              exchangeRateSource: a.exchangeRateSource || "base",
              catId: "share",
              methodId: null,
              desc: a.desc || "Spesa condivisa",
              date: a.date,
              createdAt: a.createdAt || a.date,
              rateizzato: false,
              rate: 1,
              _share: true,
              _shareProjectId: project.id,
              _shareProjectName: project.name,
              _shareProjectColor: project.color || "#4F8FF7",
              _shareProjectIcon: project.icon || "🤝",
              _sharePaidBy: paidBy ? paidBy.name : "",
            };
          });
      });
    },
    [shareProjects, showShareInHistory, currency]
  );
  function filterCatMatchesExpenseId(catId) {
    var ids = (filterCats || []).map(function (x) {
      return String(x);
    });
    if (!ids.length) return null;
    var sid = String(catId || "");
    return ids.includes("expense:" + sid) || ids.includes(sid);
  }
  function filterCatMatchesIncomeId(typeId) {
    var ids = (filterCats || []).map(function (x) {
      return String(x);
    });
    if (!ids.length) return null;
    var sid = String(typeId || "");
    return ids.includes("income:" + sid) || ids.includes(sid);
  }
  var filteredExpenses = useMemo(
    function () {
      var q = searchQuery.toLowerCase();
      var minAmt = filterAmtMin ? parseMoney(filterAmtMin) : null;
      var maxAmt = filterAmtMax ? parseMoney(filterAmtMax) : null;
      var personalSource = filterAreaPersonal ? expenses : [];
      var shareSource =
        filterAreaShare && showShareInHistory ? shareHistoryExpenses : [];
      var source = personalSource.concat(shareSource);
      return sortHistoryItems(
        source.filter(function (e) {
          var isShare = !!e._share;
          var c = isShare
            ? {
                id: "share",
                name: "Share",
                group: "share",
                icon: "🤝",
                color: confirmButtonColor,
              }
            : getCat(e.catId);
          if (historyFutureMode === "untilToday" && e.date > todayStr())
            return false;
          if (
            filterYear &&
            filterYear !== "all" &&
            !e.date.startsWith(filterYear)
          )
            return false;
          if (filterMonth && !e.date.startsWith(filterMonth)) return false;
          if (
            filterMonths &&
            filterMonths.length &&
            !filterMonths.some(function (mk) {
              return e.date.startsWith(mk);
            })
          )
            return false;
          var m = isShare ? null : getMethod(e.methodId);
          var txt = (
            (e.desc || "") +
            " " +
            (c ? c.name : "") +
            " " +
            (m ? m.name : "") +
            " " +
            (e._shareProjectName || "") +
            " " +
            (e._sharePaidBy || "")
          ).toLowerCase();
          if (q && !txt.includes(q)) return false;
          if (filterCats && filterCats.length) {
            var selected = isShare
              ? (filterCats || []).map(String).includes("share")
              : filterCatMatchesExpenseId(e.catId);
            if (filterCatExclude ? selected : !selected) return false;
          } else if (filterCat !== "all" && String(e.catId) !== filterCat && !isShare) return false;
          if (
            filterGroup &&
            filterGroup !== "all" &&
            !isShare &&
            (c ? c.group : "") !== filterGroup
          )
            return false;
          if (
            filterMethods &&
            filterMethods.length &&
            !isShare &&
            !(filterMethods || [])
              .map(String)
              .includes(String(e.methodId || ""))
          )
            return false;
          if (filterMethods && filterMethods.length && isShare) return false;
          if (filterDateFrom && e.date < filterDateFrom) return false;
          if (filterDateTo && e.date > filterDateTo) return false;
          if (minAmt !== null && e.amount < minAmt) return false;
          if (maxAmt !== null && e.amount > maxAmt) return false;
          return true;
        })
      );
    },
    [
      expenses,
      shareHistoryExpenses,
      filterAreaPersonal,
      filterAreaShare,
      showShareInHistory,
      filterYear,
      filterMonth,
      filterMonths,
      searchQuery,
      filterCat,
      filterCats,
      filterCatExclude,
      filterGroup,
      filterMethods,
      filterDateFrom,
      filterDateTo,
      filterAmtMin,
      filterAmtMax,
      historyFutureMode,
      historySortDate,
      historySortDirection,
      historySortSecondary,
      historySortSecondaryDirection,
      confirmButtonColor,
      planUsage,
      shownAlertIds,
    ]
  );
  var filteredIncomes = useMemo(
    function () {
      var q = searchQuery.toLowerCase();
      var minAmt = filterAmtMin ? parseMoney(filterAmtMin) : null;
      var maxAmt = filterAmtMax ? parseMoney(filterAmtMax) : null;
      return sortHistoryItems(
        incomes.filter(function (i) {
          var it = getIT(i.type);
          var txt = (
            (i.desc || "") +
            " " +
            (it ? it.name : "") +
            " " +
            (i.type || "")
          ).toLowerCase();
          if (historyFutureMode === "untilToday" && i.date > todayStr())
            return false;
          if (
            filterYear &&
            filterYear !== "all" &&
            !i.date.startsWith(filterYear)
          )
            return false;
          if (filterMonth && !i.date.startsWith(filterMonth)) return false;
          if (
            filterMonths &&
            filterMonths.length &&
            !filterMonths.some(function (mk) {
              return i.date.startsWith(mk);
            })
          )
            return false;
          if (q && !txt.includes(q)) return false;
          if (filterMethods && filterMethods.length) return false;
          if (filterCats && filterCats.length) {
            var selected = filterCatMatchesIncomeId(i.type);
            if (filterCatExclude ? selected : !selected) return false;
          }
          if (filterDateFrom && i.date < filterDateFrom) return false;
          if (filterDateTo && i.date > filterDateTo) return false;
          if (minAmt !== null && i.amount < minAmt) return false;
          if (maxAmt !== null && i.amount > maxAmt) return false;
          return true;
        })
      );
    },
    [
      incomes,
      filterYear,
      filterMonth,
      filterMonths,
      searchQuery,
      filterMethods,
      filterCats,
      filterCatExclude,
      filterDateFrom,
      filterDateTo,
      filterAmtMin,
      filterAmtMax,
      historyFutureMode,
      historySortDate,
      historySortDirection,
      historySortSecondary,
      historySortSecondaryDirection,
      incomeTypes,
    ]
  );

  var inp = {
    borderRadius: 8,
    border: "1px solid " + (dark ? "#444" : "#ddd"),
    padding: "7px 10px",
    fontSize: 13,
    background: dark ? "#2a2a3e" : "#fff",
    color: dark ? "#eee" : "#333",
  };
  var sb = {
    padding: "8px 14px",
    border: "none",
    borderRadius: btnRadius,
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  };
  useEffect(
    function () {
      if (currentPlan === "free") {
        requestAdConsentIfNeeded();
      } else {
        try {
          var ads = nativePlugin("FainanceAds");
          if (ads && ads.hideBanner) ads.hideBanner({});
        } catch (e) {}
      }
    },
    [currentPlan]
  );

  useEffect(
    function () {
      if (!nativeBannerSuppressed) return;
      try {
        var ads = nativePlugin("FainanceAds");
        if (ads && ads.hideBanner) ads.hideBanner({});
      } catch (e) {}
    },
    [nativeBannerSuppressed]
  );

  function shouldShowTopAdBox() {
    if (nativeBannerSuppressed) return false;
    if (currentPlan !== "free") return false;
    if (!planLimits || !planLimits.ads) return false;
    if (!isMobile) return false;
    if (tab === "settings" || tab === "consulenteAI") return false;
    var last = Number(topAdDismissedAt || 0);
    return !last || Date.now() - last > 20 * 60 * 1000;
  }
  function TopAdBox() {
    var visible = shouldShowTopAdBox();
    var nativeBanner = isNativeMobileApp();
    var adBoxRef = useRef(null);
    var slotHeight = showAppSummaryHeader ? 68 : 74;
    useEffect(
      function () {
        var ads = nativePlugin("FainanceAds");
        if (!visible || !nativeBanner || !ads || !ads.showBanner) return;
        requestAdConsentIfNeeded();
        function showAtMeasuredSlot() {
          var top = 0;
          try {
            var el = adBoxRef.current;
            if (el && el.getBoundingClientRect) {
              var r = el.getBoundingClientRect();
              // Il plugin Android disegna un banner nativo sopra la WebView: qui gli passiamo
              // la posizione reale dello slot riservato nel layout, senza modalita inline/custom
              // che in alcune build vengono ignorate e fanno sparire l'annuncio.
              top = Math.max(
                0,
                Math.round(r.top + Math.max(0, (r.height - 50) / 2) + 28)
              );
            }
          } catch (e) {}
          try {
            ads
              .showBanner({
                adUnitId: currentBannerAdUnitId(),
                topMarginCssPx: top,
                topMarginPx: top,
                topMargin: top,
                marginTop: top,
                y: top,
                top: top,
                placement: "inline-slot",
                headerVisible: !!showAppSummaryHeader,
              })
              .catch(function (e) {
                console.warn("Banner AdMob non disponibile", e);
              });
          } catch (e) {}
        }
        var t1 = setTimeout(showAtMeasuredSlot, 120);
        var t2 = setTimeout(showAtMeasuredSlot, 520);
        var t3 = setTimeout(showAtMeasuredSlot, 1200);
        try {
          window.addEventListener("resize", showAtMeasuredSlot);
        } catch (e) {}
        try {
          window.addEventListener("scroll", showAtMeasuredSlot, {
            passive: true,
          });
        } catch (e) {}
        return function () {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
          try {
            window.removeEventListener("resize", showAtMeasuredSlot);
          } catch (e) {}
          try {
            window.removeEventListener("scroll", showAtMeasuredSlot);
          } catch (e) {}
          try {
            if (ads && ads.hideBanner) ads.hideBanner({});
          } catch (e) {}
        };
      },
      [
        visible,
        tab,
        currentPlan,
        nativeBanner,
        showAppSummaryHeader,
        slotHeight,
        nativeBannerSuppressed,
      ]
    );
    if (!visible) return null;
    return (
      <div
        ref={adBoxRef}
        style={{
          position: "relative",
          height: slotHeight,
          margin: showAppSummaryHeader ? "8px 0 12px" : "16px 0 12px",
          background: nativeBanner
            ? dark
              ? "#171725"
              : "#fff"
            : dark
            ? "#202033"
            : "#F8FAFF",
          border: nativeBanner
            ? "1px solid transparent"
            : "1px solid " + borderC,
          borderRadius: nativeBanner ? 0 : 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
          boxSizing: "border-box",
          pointerEvents: nativeBanner ? "none" : "auto",
        }}
      >
        {!nativeBanner && (
          <div
            style={{
              fontSize: 12,
              color: subC,
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            📢 {L("Spazio annuncio")}
          </div>
        )}
        {!nativeBanner && (
          <button
            onClick={function () {
              try {
                var ads = nativePlugin("FainanceAds");
                if (ads && ads.hideBanner) ads.hideBanner({});
              } catch (e) {}
              setTopAdDismissedAt(Date.now());
            }}
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "none",
              background: dark ? "#333" : "#eef",
              color: subC,
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ×
          </button>
        )}
      </div>
    );
  }

  function widgetSettingsPayload() {
    function numOr(v, f) {
      var n = Number(v);
      return Number.isFinite(n) ? n : f;
    }
    function escapeWidgetHtmlText(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    function widgetColorValue(value) {
      var c = String(value || "").trim();
      var rgb = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (rgb) {
        return (
          "#" +
          [rgb[1], rgb[2], rgb[3]]
            .map(function (v) {
              var h = Math.max(0, Math.min(255, Number(v) || 0))
                .toString(16)
                .toUpperCase();
              return h.length < 2 ? "0" + h : h;
            })
            .join("")
        );
      }
      return c;
    }
    function noteHtmlForNativeWidget(value) {
      var raw = String(value || "");
      if (!raw.trim() || typeof document === "undefined") return raw;
      try {
        var root = document.createElement("div");
        root.innerHTML = raw;
        function render(node) {
          if (node.nodeType === 3)
            return escapeWidgetHtmlText(node.nodeValue || "");
          if (node.nodeType !== 1) return "";
          var el: any = node;
          var tag = String(el.tagName || "").toUpperCase();
          if (tag === "BR") return "<br>";
          var inner = Array.from(el.childNodes || [])
            .map(render)
            .join("");
          var style = el.style || {};
          var weight = String(style.fontWeight || "").toLowerCase();
          var fstyle = String(style.fontStyle || "").toLowerCase();
          var deco = String(
            style.textDecoration || style.textDecorationLine || ""
          ).toLowerCase();
          var color = widgetColorValue(
            (el.getAttribute && el.getAttribute("color")) || style.color || ""
          );
          var align = String(style.textAlign || "").toLowerCase();
          if (
            tag === "B" ||
            tag === "STRONG" ||
            weight === "bold" ||
            weight === "bolder" ||
            /^[5-9]00$/.test(weight)
          )
            inner = "<b>" + inner + "</b>";
          if (
            tag === "I" ||
            tag === "EM" ||
            fstyle === "italic" ||
            fstyle === "oblique"
          )
            inner = "<i>" + inner + "</i>";
          if (tag === "U" || deco.indexOf("underline") >= 0)
            inner = "<u>" + inner + "</u>";
          if (
            tag === "S" ||
            tag === "STRIKE" ||
            deco.indexOf("line-through") >= 0
          )
            inner = "<strike>" + inner + "</strike>";
          if (color && !/expression|url\s*\(|javascript:/i.test(color))
            inner =
              '<font color="' +
              String(color).replace(/["<>]/g, "") +
              '">' +
              inner +
              "</font>";
          if (tag === "LI") return "<li>" + inner + "</li>";
          if (tag === "UL") return "<ul>" + inner + "</ul>";
          if (tag === "OL") return "<ol>" + inner + "</ol>";
          if (tag === "BLOCKQUOTE")
            return "<blockquote>" + inner + "</blockquote>";
          if (tag === "P" || tag === "DIV") {
            var attr = /^(left|center|right|justify)$/.test(align)
              ? ' style="text-align:' + align + '"'
              : "";
            return "<div" + attr + ">" + inner + "</div>";
          }
          return inner;
        }
        return Array.from(root.childNodes || [])
          .map(render)
          .join("");
      } catch (e) {
        return raw;
      }
    }
    var selectedNote =
      (appuntiNotes || []).find(function (n) {
        return String(n.id) === String(widget2SelectedNoteId);
      }) ||
      (appuntiNotes || [])[0] ||
      null;
    var selectedBank =
      (bankCoords || []).find(function (b) {
        return String(b.id) === String(widget2SelectedBankId);
      }) ||
      (bankCoords || [])[0] ||
      null;
    var selectedCreditCard =
      (creditCards || []).find(function (c) {
        return String(c.id) === String(widget2SelectedCreditCardId);
      }) ||
      (creditCards || [])[0] ||
      null;
    var selectedGoal =
      (goals || []).find(function (g) {
        return String(g.id) === String(widget3SelectedGoalId);
      }) ||
      (goals || [])[0] ||
      null;
    var cleanNoteText = selectedNote
      ? String(selectedNote.text || selectedNote.title || "")
      : "";
    var cleanNoteHtml = selectedNote
      ? noteHtmlForNativeWidget(selectedNote.html || "")
      : "";
    var bankTitle = selectedBank
      ? selectedBank.bank || selectedBank.holder || "Coordinata bancaria"
      : "";
    var bankIban = selectedBank ? String(selectedBank.iban || "") : "";
    function maskCreditCardNumber(n) {
      return maskPaymentCardNumber(n);
    }
    var creditCardTitle = selectedCreditCard
      ? selectedCreditCard.name ||
        selectedCreditCard.issuer ||
        "Carta di credito"
      : "";
    var creditCardBody = selectedCreditCard
      ? [
          selectedCreditCard.issuer
            ? "Emittente: " + selectedCreditCard.issuer
            : "",
          selectedCreditCard.holder
            ? "Intestatario: " + selectedCreditCard.holder
            : "",
          selectedCreditCard.number
            ? "Numero: " + maskCreditCardNumber(selectedCreditCard.number)
            : "",
          selectedCreditCard.expiry
            ? "Scadenza: " + selectedCreditCard.expiry
            : "",
          selectedCreditCard.note ? "Note: " + selectedCreditCard.note : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";
    var goalTarget = selectedGoal ? Number(selectedGoal.target || 0) : 0;
    var goalSaved = selectedGoal ? Number(selectedGoal.saved || 0) : 0;
    var goalPct =
      goalTarget > 0
        ? Math.min(100, Math.round((goalSaved / goalTarget) * 100))
        : 0;
    var widgetNoteItems = (appuntiNotes || []).map(function (n) {
      return {
        id: String(n.id),
        title: n.title || "Nota",
        body: String(n.text || n.title || ""),
        html: noteHtmlForNativeWidget(n.html || ""),
      };
    });
    var widgetBankItems = (bankCoords || []).map(function (b) {
      var body = [
        b.bank ? "Banca: " + b.bank : "",
        b.holder ? "Intestatario: " + b.holder : "",
        b.iban ? "IBAN: " + b.iban : "",
        b.bic ? "BIC/SWIFT: " + b.bic : "",
        b.note ? "Note: " + b.note : "",
      ];
      return {
        id: String(b.id),
        title: b.bank || b.holder || "Coordinata bancaria",
        body: body.filter(Boolean).join("\n"),
      };
    });
    var widgetCreditCardItems = (creditCards || []).map(function (c) {
      var body = [
        c.issuer ? "Emittente: " + c.issuer : "",
        c.holder ? "Intestatario: " + c.holder : "",
        c.number ? "Numero: " + maskCreditCardNumber(c.number) : "",
        c.expiry ? "Scadenza: " + c.expiry : "",
        c.note ? "Note: " + c.note : "",
      ]
        .filter(Boolean)
        .join("\n");
      return {
        id: String(c.id),
        title: c.name || c.issuer || "Carta di credito",
        body: body,
      };
    });
    var widgetGoalItems = (goals || []).map(function (g) {
      var target = Number(g.target || 0),
        saved = Number(g.saved || 0),
        percent =
          target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
      return {
        id: String(g.id),
        title: g.name || "Obiettivo",
        icon: g.icon || "🎯",
        saved: saved,
        target: target,
        percent: percent,
        color: g.color || widget3AccentColor,
        textColor: widget3TextColor,
        percentColor: widget3PercentColor,
        currency: sym,
      };
    });
    function calcShareWidgetProject(project) {
      if (!project) return null;
      var participants = project.participants || [];
      var member =
        participants.find(function (p) {
          return p.uid === userId;
        }) ||
        participants.find(function (p) {
          return p.id === "me";
        }) ||
        participants[0] ||
        null;
      var currentId = member ? member.id : "me";
      var balances = {};
      participants.forEach(function (p) {
        balances[p.id] = 0;
      });
      ((project && project.activities) || []).forEach(function (a) {
        if (a.kind === "settlement") {
          balances[a.from] = (balances[a.from] || 0) + Number(a.amount || 0);
          balances[a.to] = (balances[a.to] || 0) - Number(a.amount || 0);
          return;
        }
        var paid = a.paidBy || "me";
        balances[paid] = (balances[paid] || 0) + Number(a.amount || 0);
        Object.keys(a.shares || {}).forEach(function (pid) {
          balances[pid] = (balances[pid] || 0) - Number(a.shares[pid] || 0);
        });
      });
      var net = Math.round(Number(balances[currentId] || 0) * 100) / 100;
      var last = ((project && project.activities) || [])[0] || null;
      var lastText = last
        ? last.kind === "settlement"
          ? "Ultimo saldo: " + fmt(Number(last.amount || 0))
          : (last.desc || "Ultima spesa") +
            " · " +
            fmt(Number(last.amount || 0))
        : "Nessuna attività recente";
      return {
        id: String(project.id),
        projectId: String(project.id),
        name: project.name || "Progetto Share",
        projectName: project.name || "Progetto Share",
        netAmount: net,
        owedAmount: Math.max(0, net),
        oweAmount: Math.max(0, -net),
        lastActivity: lastText,
        currency: sym,
      };
    }
    var shareWidgetProjectItems = (shareProjects || [])
      .map(calcShareWidgetProject)
      .filter(Boolean);
    var selectedShareProject =
      shareWidgetProjectItems.find(function (p) {
        return String(p.projectId) === String(widgetShareSelectedProjectId);
      }) ||
      shareWidgetProjectItems.find(function (p) {
        return String(p.projectId) === String(shareSelectedProjectId);
      }) ||
      shareWidgetProjectItems[0] ||
      null;
    function readWidgetLocalValue(key, fallback) {
      try {
        var raw = localStorage.getItem(userKey(key));
        if (!raw) return fallback;
        try {
          return JSON.parse(raw);
        } catch (e) {
          return raw;
        }
      } catch (e) {
        return fallback;
      }
    }
    var widgetShoppingLists = readWidgetLocalValue("shopping_lists_v2", [
      { id: "main", title: "Lista principale", icon: "🧺" },
    ]);
    if (!Array.isArray(widgetShoppingLists) || !widgetShoppingLists.length)
      widgetShoppingLists = [
        { id: "main", title: "Lista principale", icon: "🧺" },
      ];
    var widgetActiveShoppingListId = String(
      readWidgetLocalValue("shopping_active_list_id_v2", "main") || "main"
    );
    var widgetActiveShoppingList =
      widgetShoppingLists.find(function (l) {
        return String(l.id) === widgetActiveShoppingListId;
      }) || widgetShoppingLists[0];
    var shoppingWidgetAllItems = (shoppingItems || [])
      .filter(function (x) {
        return !x.archived;
      })
      .map(function (x) {
        return {
          id: String(x.id),
          name: x.name || "Prodotto",
          area: x.area || "Altro",
          bought: !!x.bought,
          listId: String(x.listId || "main"),
          action: "toggle-shopping-item",
        };
      });
    var shoppingWidgetItems = shoppingWidgetAllItems
      .filter(function (x) {
        return (
          String(x.listId || "main") ===
          String(
            (widgetActiveShoppingList && widgetActiveShoppingList.id) || "main"
          )
        );
      })
      .sort(function (a, b) {
        if (!!a.bought !== !!b.bought) return a.bought ? 1 : -1;
        return String(a.name || "").localeCompare(String(b.name || ""));
      })
      .slice(0, Math.max(1, Number(widgetShoppingListMaxItems) || 8));
    var fidelityWidgetCards = (shoppingCards || []).map(function (c) {
      return {
        id: String(c.id),
        name: c.name || "Carta",
        code: String(c.code || ""),
        codeType: c.codeType || c.type || "barcode",
        type: c.type || "fidelity",
        color: c.color || "#0F9F76",
      };
    });
    var selectedFidelityCard =
      fidelityWidgetCards.find(function (c) {
        return String(c.id) === String(widgetFidelitySelectedCardId);
      }) ||
      fidelityWidgetCards[0] ||
      null;
    function debtWidgetBalance(item) {
      return debtCreditBalance(item);
    }
    var debtWidgetAllItems = (debtCredits || []).map(function (x) {
      return {
        id: String(x.id),
        holder: x.holder || "",
        kind: x.kind || "debt",
        balance: debtWidgetBalance(x),
        closed: debtWidgetBalance(x) <= 0,
        currency: sym,
      };
    });
    var debtWidgetBaseItems = debtWidgetAllItems.filter(function (x) {
      return widgetDebtCreditsMode === "all" || !x.closed;
    });
    var selectedDebtIds = Array.isArray(widgetDebtCreditsSelectedIds)
      ? widgetDebtCreditsSelectedIds.map(String)
      : [];
    var debtWidgetItems = (
      selectedDebtIds.length
        ? debtWidgetBaseItems.filter(function (x) {
            return selectedDebtIds.indexOf(String(x.id)) >= 0;
          })
        : debtWidgetBaseItems
    ).slice(0, 12);
    // Il toggle microfono non deve lasciare celle/segnaposto vuoti nei layout grandi.
    // Nei layout compatti che mantengono il microfono, i metadati vocali restano sempre disponibili.
    var quickVoiceVisibility = widgetVoiceEnabled
      ? {
          mode: "all",
          removeHiddenButton: false,
          preserveLayoutSpace: true,
          hiddenLayouts: [],
          visibleLayouts: ["4x4", "4x3", "4x2", "4x1", "2x2"],
        }
      : {
          mode: "layout",
          removeHiddenButton: true,
          preserveLayoutSpace: false,
          hiddenLayouts: ["4x4", "4x3", "4x2"],
          visibleLayouts: ["4x1", "2x2"],
        };
    return {
      bgColor: widgetBgColor,
      bgAlpha: widgetBgAlpha,
      expenseColor: widgetExpenseColor,
      incomeColor: widgetIncomeColor,
      title: widgetTitle,
      subtitle: widgetSubtitle,
      expenseLabel: widgetExpenseLabel,
      incomeLabel: widgetIncomeLabel,
      showHeader: !!widgetShowHeader,
      buttonStyle: widgetButtonStyle,
      showVoiceButton: !!widgetVoiceEnabled,
      voiceEnabled: !!widgetVoiceEnabled,
      showMicrophone: !!widgetVoiceEnabled,
      voiceUserEnabled: !!widgetVoiceEnabled,
      hideVoiceButton: !widgetVoiceEnabled,
      removeVoiceButton: !widgetVoiceEnabled,
      collapseVoiceButton: !widgetVoiceEnabled,
      voiceButtonVisibility: widgetVoiceEnabled ? "visible" : "gone",
      voiceVisibilityBySize: quickVoiceVisibility,
      quickAdd: {
        bgColor: widgetBgColor,
        bgAlpha: widgetBgAlpha,
        expenseColor: widgetExpenseColor,
        incomeColor: widgetIncomeColor,
        title: widgetTitle,
        subtitle: widgetSubtitle,
        expenseLabel: widgetExpenseLabel,
        incomeLabel: widgetIncomeLabel,
        showHeader: !!widgetShowHeader,
        buttonStyle: widgetButtonStyle,
        compactSingleRow: true,
        reduceButtonHeightPct: 15,
        removeButtonWhiteOverlay: true,
        widgetCornerRadius: "soft",
        showVoiceButton: !!widgetVoiceEnabled,
        voiceEnabled: !!widgetVoiceEnabled,
        showMicrophone: !!widgetVoiceEnabled,
        voiceUserEnabled: !!widgetVoiceEnabled,
        hideVoiceButton: !widgetVoiceEnabled,
        removeVoiceButton: !widgetVoiceEnabled,
        collapseVoiceButton: !widgetVoiceEnabled,
        removeVoiceButtonFromLayout: !widgetVoiceEnabled,
        reserveVoiceButtonSpace: !!widgetVoiceEnabled,
        voiceButtonVisibility: widgetVoiceEnabled ? "visible" : "gone",
        voiceHiddenLayouts: quickVoiceVisibility.hiddenLayouts,
        voiceVisibleLayouts: quickVoiceVisibility.visibleLayouts,
        voiceVisibilityBySize: quickVoiceVisibility,
        // Non azzerare i metadati: i layout compatti autorizzati devono conservare il tasto microfono.
        voiceLabel: L("Voce"),
        voiceIcon: "🎙️",
        voiceAction: "open-voice",
        voiceUrlScheme: "fainance://open-voice",
        receiptLabel: "Scontrino",
        receiptIcon: "📷",
        receiptAction: "open-receipt-camera",
        receiptUrlScheme: "fainance://open-receipt-camera",
        logoKind: "official",
        logoLabel: "fAI",
      },
      shoppingListWidget: {
        enabled: isWidgetAllowed("shoppingList") && !!widgetShoppingListEnabled,
        title: L("Lista spesa"),
        subtitle: "",
        accentColor:
          widgetShoppingListAccentColor || confirmButtonColor || "#EF9F27",
        iconColor:
          widgetShoppingListIconColor ||
          widgetShoppingListAccentColor ||
          confirmButtonColor ||
          "#EF9F27",
        titleColor: widgetShoppingListTitleColor || "#FFFFFF",
        textColor: widgetShoppingListTextColor || "#EDEDF7",
        textSize: Number(widgetShoppingListTextSize) || 13,
        bgAlpha: numOr(widgetShoppingListBgAlpha, 65),
        autoUpdate: !!widgetShoppingListAutoUpdate,
        selectedListId: String(
          (widgetActiveShoppingList && widgetActiveShoppingList.id) || "main"
        ),
        selectedListTitle: String(
          (widgetActiveShoppingList &&
            (widgetActiveShoppingList.title ||
              widgetActiveShoppingList.name)) ||
            "Lista spesa"
        ),
        lists: widgetShoppingLists.map(function (l) {
          return {
            id: String(l.id || "main"),
            title: String(l.title || l.name || "Lista"),
            icon: String(l.icon || "🧺"),
          };
        }),
        boughtColor: shoppingBoughtColor || "#EAF7EE",
        maxItems: Number(widgetShoppingListMaxItems) || 8,
        items: shoppingWidgetItems,
        allItems: shoppingWidgetAllItems,
        emptyText: L("Lista della spesa vuota"),
        toggleAction: "toggle-shopping-item",
        dynamic: true,
      },
      fidelityWidget: {
        enabled: isWidgetAllowed("fidelity") && !!widgetFidelityEnabled,
        title: L("Fidelity card"),
        accentColor: widgetFidelityAccentColor || "#378ADD",
        iconColor:
          widgetFidelityIconColor || widgetFidelityAccentColor || "#0F9F76",
        titleColor: widgetFidelityTitleColor || "#FFFFFF",
        textColor: widgetFidelityTextColor || "#FFFFFF",
        textSize: Number(widgetFidelityTextSize) || 14,
        bgAlpha: numOr(widgetFidelityBgAlpha, 65),
        autoUpdate: !!widgetFidelityAutoUpdate,
        selectedCardId: selectedFidelityCard
          ? String(selectedFidelityCard.id)
          : "",
        selectedCard: selectedFidelityCard,
        cards: fidelityWidgetCards,
      },
      debtCreditsWidget: {
        enabled: isWidgetAllowed("debtCredits") && !!widgetDebtCreditsEnabled,
        title: L("Debiti / Crediti"),
        accentColor: widgetDebtCreditsAccentColor || "#7F77DD",
        iconColor:
          widgetDebtCreditsIconColor ||
          widgetDebtCreditsAccentColor ||
          "#7F77DD",
        titleColor: widgetDebtCreditsTitleColor || "#FFFFFF",
        textColor: widgetDebtCreditsTextColor || "#EDEDF7",
        textSize: Number(widgetDebtCreditsTextSize) || 13,
        bgAlpha: numOr(widgetDebtCreditsBgAlpha, 65),
        autoUpdate: !!widgetDebtCreditsAutoUpdate,
        mode: widgetDebtCreditsMode || "open",
        items: debtWidgetItems,
        allItems: debtWidgetAllItems,
        selectedIds: debtWidgetItems.map(function (x) {
          return String(x.id);
        }),
        currency: sym,
      },
      shareWidget: {
        enabled: isWidgetAllowed("share"),
        title: "Share",
        projectId: selectedShareProject
          ? String(selectedShareProject.projectId)
          : "",
        projectName: selectedShareProject
          ? selectedShareProject.projectName || "Progetto Share"
          : "Nessun progetto selezionato",
        netAmount: selectedShareProject
          ? Number(selectedShareProject.netAmount || 0)
          : 0,
        owedAmount: selectedShareProject
          ? Number(selectedShareProject.owedAmount || 0)
          : 0,
        oweAmount: selectedShareProject
          ? Number(selectedShareProject.oweAmount || 0)
          : 0,
        lastActivity: selectedShareProject
          ? selectedShareProject.lastActivity || "Nessuna attività recente"
          : "Nessuna attività recente",
        currency: sym,
        bgColor: widgetShareBgColor,
        bgAlpha: numOr(widgetShareBgAlpha, 65),
        accentColor: widgetShareAccentColor || confirmButtonColor || "#7F77DD",
        activityColor: widgetShareActivityColor || "#378ADD",
        titleColor: widgetShareTitleColor || "#FFFFFF",
        bodyColor: widgetShareBodyColor || "#D8D6F2",
        buttonStyle: widgetButtonStyle,
        autoUpdate: !!widgetShareAutoUpdate,
        projectItems: shareWidgetProjectItems,
      },
      noteWidget: {
        enabled: !!widget2Enabled,
        type: widget2Type,
        accentColor: widget2AccentColor,
        titleColor: widget2TitleColor,
        bodyColor: widget2BodyColor,
        bgAlpha: numOr(widget2BgAlpha, 65),
        maxChars: Number(widget2MaxChars) || 500,
        textSize: Number(widget2TextSize) || 14,
        autoUpdate: !!widget2AutoUpdate,
        selectedNoteId: widget2SelectedNoteId,
        selectedBankId: widget2SelectedBankId,
        selectedCreditCardId: widget2SelectedCreditCardId,
        title:
          widget2Type === "creditCard"
            ? creditCardTitle || "Carta di credito"
            : widget2Type === "bank"
            ? bankTitle || "Coordinata bancaria"
            : selectedNote
            ? selectedNote.title || "Nota"
            : "Nota",
        body:
          widget2Type === "creditCard"
            ? creditCardBody || "Nessuna carta di credito selezionata"
            : widget2Type === "bank"
            ? bankIban || "Nessun IBAN selezionato"
            : cleanNoteText || "Nessuna nota selezionata",
        html: widget2Type === "note" ? cleanNoteHtml : "",
        bankHolder: selectedBank ? selectedBank.holder || "" : "",
        bankBic: selectedBank ? selectedBank.bic || "" : "",
        bankNote: selectedBank ? selectedBank.note || "" : "",
        noteItems: widgetNoteItems,
        bankItems: widgetBankItems,
        creditCardItems: widgetCreditCardItems,
      },
      goalWidget: {
        enabled: !!widget3Enabled,
        accentColor: widget3AccentColor,
        textColor: widget3TextColor,
        percentColor: widget3PercentColor,
        bgAlpha: numOr(widget3BgAlpha, 65),
        autoUpdate: !!widget3AutoUpdate,
        selectedGoalId: widget3SelectedGoalId,
        showPercent: !!widget3ShowPercent,
        showAmounts: !!widget3ShowAmounts,
        title: selectedGoal
          ? selectedGoal.name || "Obiettivo"
          : "Nessun obiettivo",
        icon: selectedGoal ? selectedGoal.icon || "🎯" : "🎯",
        target: goalTarget,
        saved: goalSaved,
        percent: goalPct,
        color: widget3AccentColor,
        currency: sym,
        goalItems: widgetGoalItems,
      },
    };
  }

  function saveWidgetSettingsToNative(showMessage, overridePayload) {
    var payload = enforceWidgetPlanPayload(
      overridePayload || widgetSettingsPayload()
    );
    try {
      var prefs =
        window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.Preferences;
      var bridge =
        window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.WidgetBridge;
      var payloadString = JSON.stringify(payload);
      try {
        if (bridge && bridge.setWidgetAvailability) {
          bridge
            .setWidgetAvailability({
              currentPlan: String(
                payload.widget_current_plan ||
                  currentPlanRef.current ||
                  currentPlan ||
                  "free"
              ),
              availableTypes: payload.widget_available_types || [],
              enabledTypes: payload.widget_enabled_types || [],
              disabledTypes: payload.widget_disabled_types || [],
              planAvailability: payload.widget_plan_availability || {},
            })
            .catch(function () {});
        }
        if (bridge && bridge.setAvailableWidgets) {
          bridge
            .setAvailableWidgets({
              types: payload.widget_available_types || [],
              currentPlan: String(
                payload.widget_current_plan ||
                  currentPlanRef.current ||
                  currentPlan ||
                  "free"
              ),
            })
            .catch(function () {});
        }
      } catch (e) {}
      var quickAddSource =
        payload.quickAdd && typeof payload.quickAdd === "object"
          ? payload.quickAdd
          : {};
      var quickVoiceEnabled =
        quickAddSource.showVoiceButton !== undefined
          ? !!quickAddSource.showVoiceButton
          : quickAddSource.voiceEnabled !== undefined
          ? !!quickAddSource.voiceEnabled
          : quickAddSource.showMicrophone !== undefined
          ? !!quickAddSource.showMicrophone
          : payload.showVoiceButton !== undefined
          ? !!payload.showVoiceButton
          : !!widgetVoiceEnabled;
      var quickVoiceVisibility =
        quickAddSource.voiceVisibilityBySize &&
        typeof quickAddSource.voiceVisibilityBySize === "object"
          ? quickAddSource.voiceVisibilityBySize
          : quickVoiceEnabled
          ? {
              mode: "all",
              removeHiddenButton: false,
              preserveLayoutSpace: true,
              hiddenLayouts: [],
              visibleLayouts: ["4x4", "4x3", "4x2", "4x1", "2x2"],
            }
          : {
              mode: "layout",
              removeHiddenButton: true,
              preserveLayoutSpace: false,
              hiddenLayouts: ["4x4", "4x3", "4x2"],
              visibleLayouts: ["4x1", "2x2"],
            };
      var legacyQuickAddPayload = {
        bgColor: quickAddSource.bgColor || payload.bgColor,
        bgAlpha: quickAddSource.bgAlpha || payload.bgAlpha,
        expenseColor: quickAddSource.expenseColor || payload.expenseColor,
        incomeColor: quickAddSource.incomeColor || payload.incomeColor,
        title: quickAddSource.title || payload.title,
        subtitle: quickAddSource.subtitle || payload.subtitle,
        expenseLabel: quickAddSource.expenseLabel || payload.expenseLabel,
        incomeLabel: quickAddSource.incomeLabel || payload.incomeLabel,
        showHeader:
          quickAddSource.showHeader !== undefined
            ? !!quickAddSource.showHeader
            : !!payload.showHeader,
        buttonStyle: quickAddSource.buttonStyle || payload.buttonStyle,
        showVoiceButton: quickVoiceEnabled,
        voiceEnabled: quickVoiceEnabled,
        showMicrophone: quickVoiceEnabled,
        voiceUserEnabled: quickVoiceEnabled,
        hideVoiceButton: !quickVoiceEnabled,
        removeVoiceButton: !quickVoiceEnabled,
        collapseVoiceButton: !quickVoiceEnabled,
        removeVoiceButtonFromLayout: !quickVoiceEnabled,
        reserveVoiceButtonSpace: quickVoiceEnabled,
        voiceButtonVisibility: quickVoiceEnabled ? "visible" : "gone",
        voiceHiddenLayouts: Array.isArray(quickVoiceVisibility.hiddenLayouts)
          ? quickVoiceVisibility.hiddenLayouts
          : [],
        voiceVisibleLayouts: Array.isArray(quickVoiceVisibility.visibleLayouts)
          ? quickVoiceVisibility.visibleLayouts
          : [],
        voiceVisibilityBySize: quickVoiceVisibility,
        voiceLabel:
          quickAddSource.voiceLabel !== undefined &&
          String(quickAddSource.voiceLabel)
            ? String(quickAddSource.voiceLabel)
            : "Voce",
        voiceIcon:
          quickAddSource.voiceIcon !== undefined &&
          String(quickAddSource.voiceIcon)
            ? String(quickAddSource.voiceIcon)
            : "🎙️",
        voiceAction:
          quickAddSource.voiceAction !== undefined &&
          String(quickAddSource.voiceAction)
            ? String(quickAddSource.voiceAction)
            : "open-voice",
        voiceUrlScheme:
          quickAddSource.voiceUrlScheme !== undefined &&
          String(quickAddSource.voiceUrlScheme)
            ? String(quickAddSource.voiceUrlScheme)
            : "fainance://open-voice",
        logoKind: quickAddSource.logoKind || "official",
        logoLabel: (payload.quickAdd && payload.quickAdd.logoLabel) || "fAI",
        receiptLabel:
          (payload.quickAdd && payload.quickAdd.receiptLabel) || "Scontrino",
        receiptIcon: (payload.quickAdd && payload.quickAdd.receiptIcon) || "📷",
        receiptAction:
          (payload.quickAdd && payload.quickAdd.receiptAction) ||
          "open-receipt-camera",
        receiptUrlScheme:
          (payload.quickAdd && payload.quickAdd.receiptUrlScheme) ||
          "fainance://open-receipt-camera",
      };
      var quickString = JSON.stringify(legacyQuickAddPayload);
      var noteString = JSON.stringify(payload.noteWidget || {});
      var goalString = JSON.stringify(payload.goalWidget || {});
      var shareString = JSON.stringify(payload.shareWidget || {});
      var shoppingListString = JSON.stringify(payload.shoppingListWidget || {});
      var fidelityString = JSON.stringify(payload.fidelityWidget || {});
      var debtCreditsString = JSON.stringify(payload.debtCreditsWidget || {});
      var afterNativeUpdate = function () {
        if (showMessage) setToast("Widget aggiornato");
      };
      var fallbackSave = function () {
        var afterSave = function () {
          if (bridge && bridge.updateAllWidgets) {
            bridge
              .updateAllWidgets()
              .then(afterNativeUpdate)
              .catch(function () {
                if (showMessage) setToast("Widget aggiornato");
              });
          } else if (bridge && bridge.updateQuickAddWidget) {
            bridge
              .updateQuickAddWidget()
              .then(function () {
                if (showMessage) setToast("Widget aggiornato");
              })
              .catch(function () {
                if (showMessage) setToast("Widget aggiornato");
              });
          } else {
            if (showMessage) setToast("Widget aggiornato");
          }
        };
        if (prefs && prefs.set) {
          Promise.all([
            prefs.set({ key: "widget_settings_v2", value: payloadString }),
            prefs.set({ key: "widget_quick_add_settings", value: quickString }),
            prefs.set({
              key: "widget_quick_add_show_voice_button",
              value: String(quickVoiceEnabled),
            }),
            prefs.set({
              key: "widget_quick_add_voice_enabled",
              value: String(quickVoiceEnabled),
            }),
            prefs.set({
              key: "widget_quick_add_show_microphone",
              value: String(quickVoiceEnabled),
            }),
            prefs.set({
              key: "widget_quick_add_hide_voice_button",
              value: String(!quickVoiceEnabled),
            }),
            prefs.set({
              key: "widget_quick_add_remove_voice_button",
              value: String(!quickVoiceEnabled),
            }),
            prefs.set({
              key: "widget_quick_add_voice_button_visibility",
              value: quickVoiceEnabled ? "visible" : "gone",
            }),
            prefs.set({
              key: "widget_quick_add_voice_hidden_layouts",
              value: JSON.stringify(
                legacyQuickAddPayload.voiceHiddenLayouts || []
              ),
            }),
            prefs.set({
              key: "widget_quick_add_voice_visible_layouts",
              value: JSON.stringify(
                legacyQuickAddPayload.voiceVisibleLayouts || []
              ),
            }),
            prefs.set({
              key: "widget_quick_add_voice_visibility_by_size",
              value: JSON.stringify(
                legacyQuickAddPayload.voiceVisibilityBySize || {}
              ),
            }),
            prefs.set({
              key: "widget_voice_enabled_v1",
              value: JSON.stringify(quickVoiceEnabled),
            }),
            prefs.set({ key: "widget_note_settings", value: noteString }),
            prefs.set({ key: "widget_goal_settings", value: goalString }),
            prefs.set({ key: "widget_share_settings", value: shareString }),
            prefs.set({
              key: "widget_shopping_list_settings",
              value: shoppingListString,
            }),
            prefs.set({
              key: "widget_shopping_list_bg_alpha",
              value: String(
                (payload.shoppingListWidget &&
                  payload.shoppingListWidget.bgAlpha) ||
                  65
              ),
            }),
            prefs.set({
              key: "widget_fidelity_settings",
              value: fidelityString,
            }),
            prefs.set({
              key: "widget_debt_credits_settings",
              value: debtCreditsString,
            }),
            prefs.set({
              key: "widget_current_plan",
              value: String(
                payload.widget_current_plan ||
                  currentPlanRef.current ||
                  currentPlan ||
                  "free"
              ),
            }),
            prefs.set({
              key: "widget_available_types",
              value: JSON.stringify(payload.widget_available_types || []),
            }),
            prefs.set({
              key: "widget_order",
              value: JSON.stringify(payload.widget_order || WIDGET_TYPE_ORDER),
            }),
            prefs.set({
              key: "widget_enabled_types",
              value: JSON.stringify(payload.widget_enabled_types || []),
            }),
            prefs.set({
              key: "widget_disabled_types",
              value: JSON.stringify(payload.widget_disabled_types || []),
            }),
            prefs.set({
              key: "widget_plan_availability",
              value: JSON.stringify(payload.widget_plan_availability || {}),
            }),
          ])
            .then(afterSave)
            .catch(function () {
              if (showMessage)
                setToast({
                  text: "Errore salvataggio widget",
                  type: "error",
                  color: "#E24B4A",
                  icon: "🚫",
                });
            });
        } else {
          localStorage.setItem("widget_settings_v2", payloadString);
          localStorage.setItem("widget_quick_add_settings", quickString);
          localStorage.setItem(
            "widget_quick_add_show_voice_button",
            String(quickVoiceEnabled)
          );
          localStorage.setItem(
            "widget_quick_add_hide_voice_button",
            String(!quickVoiceEnabled)
          );
          localStorage.setItem(
            "widget_quick_add_remove_voice_button",
            String(!quickVoiceEnabled)
          );
          localStorage.setItem(
            "widget_quick_add_voice_button_visibility",
            quickVoiceEnabled ? "visible" : "gone"
          );
          localStorage.setItem(
            "widget_quick_add_voice_hidden_layouts",
            JSON.stringify(legacyQuickAddPayload.voiceHiddenLayouts || [])
          );
          localStorage.setItem(
            "widget_quick_add_voice_visible_layouts",
            JSON.stringify(legacyQuickAddPayload.voiceVisibleLayouts || [])
          );
          localStorage.setItem(
            "widget_quick_add_voice_visibility_by_size",
            JSON.stringify(legacyQuickAddPayload.voiceVisibilityBySize || {})
          );
          localStorage.setItem(
            "widget_quick_add_show_voice_button",
            String(quickVoiceEnabled)
          );
          localStorage.setItem(
            "widget_quick_add_voice_enabled",
            String(quickVoiceEnabled)
          );
          localStorage.setItem(
            "widget_quick_add_show_microphone",
            String(quickVoiceEnabled)
          );
          localStorage.setItem(
            "widget_voice_enabled_v1",
            JSON.stringify(quickVoiceEnabled)
          );
          localStorage.setItem("widget_note_settings", noteString);
          localStorage.setItem("widget_goal_settings", goalString);
          localStorage.setItem("widget_share_settings", shareString);
          localStorage.setItem(
            "widget_shopping_list_settings",
            shoppingListString
          );
          localStorage.setItem("widget_fidelity_settings", fidelityString);
          localStorage.setItem(
            "widget_debt_credits_settings",
            debtCreditsString
          );
          localStorage.setItem(
            "widget_current_plan",
            String(
              payload.widget_current_plan ||
                currentPlanRef.current ||
                currentPlan ||
                "free"
            )
          );
          localStorage.setItem(
            "widget_available_types",
            JSON.stringify(payload.widget_available_types || [])
          );
          localStorage.setItem(
            "widget_order",
            JSON.stringify(payload.widget_order || WIDGET_TYPE_ORDER)
          );
          localStorage.setItem(
            "widget_enabled_types",
            JSON.stringify(payload.widget_enabled_types || [])
          );
          localStorage.setItem(
            "widget_disabled_types",
            JSON.stringify(payload.widget_disabled_types || [])
          );
          localStorage.setItem(
            "widget_plan_availability",
            JSON.stringify(payload.widget_plan_availability || {})
          );
          afterSave();
        }
      };
      if (bridge && bridge.saveAndUpdateWidgets) {
        bridge
          .saveAndUpdateWidgets({
            settings: payloadString,
            quickAdd: quickString,
            note: noteString,
            goal: goalString,
            share: shareString,
            shoppingList: shoppingListString,
            fidelity: fidelityString,
            debtCredits: debtCreditsString,
            currentPlan: String(
              payload.widget_current_plan ||
                currentPlanRef.current ||
                currentPlan ||
                "free"
            ),
            availableTypes: JSON.stringify(
              payload.widget_available_types || []
            ),
            widgetOrder: JSON.stringify(
              payload.widget_order || WIDGET_TYPE_ORDER
            ),
            enabledTypes: JSON.stringify(payload.widget_enabled_types || []),
            disabledTypes: JSON.stringify(payload.widget_disabled_types || []),
            planAvailability: JSON.stringify(
              payload.widget_plan_availability || {}
            ),
          })
          .then(function () {
            if (prefs && prefs.set) {
              Promise.all([
                prefs.set({ key: "widget_settings_v2", value: payloadString }),
                prefs.set({
                  key: "widget_quick_add_settings",
                  value: quickString,
                }),
                prefs.set({
                  key: "widget_quick_add_show_voice_button",
                  value: String(quickVoiceEnabled),
                }),
                prefs.set({
                  key: "widget_quick_add_voice_enabled",
                  value: String(quickVoiceEnabled),
                }),
                prefs.set({
                  key: "widget_quick_add_show_microphone",
                  value: String(quickVoiceEnabled),
                }),
                prefs.set({
                  key: "widget_quick_add_hide_voice_button",
                  value: String(!quickVoiceEnabled),
                }),
                prefs.set({
                  key: "widget_quick_add_remove_voice_button",
                  value: String(!quickVoiceEnabled),
                }),
                prefs.set({
                  key: "widget_quick_add_voice_button_visibility",
                  value: quickVoiceEnabled ? "visible" : "gone",
                }),
                prefs.set({
                  key: "widget_quick_add_voice_hidden_layouts",
                  value: JSON.stringify(
                    legacyQuickAddPayload.voiceHiddenLayouts || []
                  ),
                }),
                prefs.set({
                  key: "widget_quick_add_voice_visible_layouts",
                  value: JSON.stringify(
                    legacyQuickAddPayload.voiceVisibleLayouts || []
                  ),
                }),
                prefs.set({
                  key: "widget_quick_add_voice_visibility_by_size",
                  value: JSON.stringify(
                    legacyQuickAddPayload.voiceVisibilityBySize || {}
                  ),
                }),
                prefs.set({
                  key: "widget_voice_enabled_v1",
                  value: JSON.stringify(quickVoiceEnabled),
                }),
                prefs.set({ key: "widget_note_settings", value: noteString }),
                prefs.set({ key: "widget_goal_settings", value: goalString }),
                prefs.set({ key: "widget_share_settings", value: shareString }),
                prefs.set({
                  key: "widget_shopping_list_settings",
                  value: shoppingListString,
                }),
                prefs.set({
                  key: "widget_fidelity_settings",
                  value: fidelityString,
                }),
                prefs.set({
                  key: "widget_debt_credits_settings",
                  value: debtCreditsString,
                }),
              ]).catch(function () {});
            }
            afterNativeUpdate();
          })
          .catch(fallbackSave);
      } else {
        fallbackSave();
      }
    } catch (e) {
      if (showMessage)
        setToast({
          text: "Errore salvataggio widget",
          type: "error",
          color: "#E24B4A",
          icon: "🚫",
        });
    }
  }

  function syncShoppingListChangesFromNativeWidget() {
    try {
      if (
        !(
          window &&
          window.Capacitor &&
          window.Capacitor.isNativePlatform &&
          window.Capacitor.isNativePlatform()
        )
      )
        return;
      var prefs =
        window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.Preferences;
      if (!prefs || !prefs.get) return;
      prefs
        .get({ key: "widget_shopping_list_item_updates_v1" })
        .then(function (res) {
          var raw = res && res.value ? String(res.value) : "";
          if (!raw) return;
          var updates = [];
          try {
            updates = JSON.parse(raw);
          } catch (e) {
            updates = [];
          }
          if (!Array.isArray(updates) || !updates.length) return;
          var map = {};
          updates.forEach(function (u) {
            if (u && u.id !== undefined && u.id !== null)
              map[String(u.id)] = {
                bought: !!u.bought,
                updatedAt: u.updatedAt || new Date().toISOString(),
              };
          });
          var keys = Object.keys(map);
          if (!keys.length) return;
          setShoppingItems(function (list) {
            var changed = false;
            var next = (list || []).map(function (x) {
              var u = map[String(x.id)];
              if (!u) return x;
              if (!!x.bought === !!u.bought) return x;
              changed = true;
              return { ...x, bought: !!u.bought, updatedAt: u.updatedAt };
            });
            if (changed) {
              try {
                setTimeout(function () {
                  try {
                    saveWidgetSettingsToNative(false);
                  } catch (e) {}
                }, 180);
              } catch (e) {}
            }
            return changed ? next : list;
          });
          if (prefs.remove)
            prefs
              .remove({ key: "widget_shopping_list_item_updates_v1" })
              .catch(function () {});
          else
            prefs
              .set({ key: "widget_shopping_list_item_updates_v1", value: "[]" })
              .catch(function () {});
        })
        .catch(function () {});
    } catch (e) {}
  }

  useEffect(function () {
    try {
      if (
        !(
          window &&
          window.Capacitor &&
          window.Capacitor.isNativePlatform &&
          window.Capacitor.isNativePlatform()
        )
      )
        return;
      var timers = [
        setTimeout(syncShoppingListChangesFromNativeWidget, 160),
        setTimeout(syncShoppingListChangesFromNativeWidget, 900),
      ];
      var removeResume = null;
      try {
        import("@capacitor/app")
          .then(function (mod) {
            if (mod && mod.App && mod.App.addListener) {
              mod.App.addListener("resume", function () {
                syncShoppingListChangesFromNativeWidget();
              })
                .then(function (l) {
                  removeResume = l;
                })
                .catch(function () {});
            }
          })
          .catch(function () {});
      } catch (e) {}
      function onVis() {
        try {
          if (!document.hidden) syncShoppingListChangesFromNativeWidget();
        } catch (e) {}
      }
      function onFocus() {
        syncShoppingListChangesFromNativeWidget();
      }
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("focus", onFocus);
      return function () {
        try {
          timers.forEach(clearTimeout);
        } catch (e) {}
        try {
          document.removeEventListener("visibilitychange", onVis);
        } catch (e) {}
        try {
          window.removeEventListener("focus", onFocus);
        } catch (e) {}
        try {
          if (removeResume && removeResume.remove) removeResume.remove();
        } catch (e) {}
      };
    } catch (e) {}
  }, []);

  // HOTFIX 1.0.9: non aggiorna i widget nativi automaticamente all'avvio.
  // Il salvataggio resta disponibile dalle impostazioni widget, evitando crash nativi in apertura app.

  useEffect(
    function () {
      if (
        !(
          window &&
          window.Capacitor &&
          window.Capacitor.isNativePlatform &&
          window.Capacitor.isNativePlatform()
        )
      )
        return;
      var timer = setTimeout(function () {
        try {
          saveWidgetSettingsToNative(false);
        } catch (e) {}
      }, 600);
      return function () {
        clearTimeout(timer);
      };
    },
    [
      widgetBgColor,
      widgetBgAlpha,
      widgetExpenseColor,
      widgetIncomeColor,
      widgetTitle,
      widgetSubtitle,
      widgetExpenseLabel,
      widgetIncomeLabel,
      widgetShowHeader,
      widgetButtonStyle,
      widgetVoiceEnabled,
      widget2Enabled,
      widget2Type,
      widget2AccentColor,
      widget2TitleColor,
      widget2BodyColor,
      widget2BgAlpha,
      widget2MaxChars,
      widget2TextSize,
      widget2SelectedNoteId,
      widget2SelectedBankId,
      widget2SelectedCreditCardId,
      widget2AutoUpdate,
      widget3Enabled,
      widget3AccentColor,
      widget3TextColor,
      widget3PercentColor,
      widget3BgAlpha,
      widget3SelectedGoalId,
      widget3ShowPercent,
      widget3ShowAmounts,
      widget3AutoUpdate,
      widgetShareSelectedProjectId,
      widgetShareBgColor,
      widgetShareBgAlpha,
      widgetShareAccentColor,
      widgetShareActivityColor,
      widgetShareTitleColor,
      widgetShareBodyColor,
      widgetShareAutoUpdate,
      widgetShoppingListEnabled,
      widgetShoppingListMaxItems,
      widgetShoppingListAccentColor,
      widgetShoppingListTextSize,
      widgetShoppingListIconColor,
      widgetShoppingListTitleColor,
      widgetShoppingListTextColor,
      widgetShoppingListBgAlpha,
      widgetShoppingListAutoUpdate,
      activeShoppingListId,
      widgetFidelityEnabled,
      widgetFidelitySelectedCardId,
      widgetFidelityAccentColor,
      widgetFidelityTextSize,
      widgetFidelityIconColor,
      widgetFidelityTitleColor,
      widgetFidelityTextColor,
      widgetFidelityBgAlpha,
      widgetFidelityAutoUpdate,
      widgetDebtCreditsEnabled,
      widgetDebtCreditsMode,
      widgetDebtCreditsSelectedIds,
      widgetDebtCreditsAccentColor,
      widgetDebtCreditsTextSize,
      widgetDebtCreditsIconColor,
      widgetDebtCreditsTitleColor,
      widgetDebtCreditsTextColor,
      widgetDebtCreditsBgAlpha,
      widgetDebtCreditsAutoUpdate,
      shoppingItems,
      shoppingCards,
      debtCredits,
      appuntiNotes,
      bankCoords,
      creditCards,
      goals,
      shareProjects,
      shareSelectedProjectId,
      confirmButtonColor,
      currentPlan,
      planUsage,
      shownAlertIds,
    ]
  );

  /* AppuntiPanel extracted */

  function TermsAndConditionsContent() {
    function L(s) {
      return translateUiRuntimeText(s);
    }
    var rows = [
      {
        title: "Ambito dell’app",
        text: "fAInance è uno strumento personale per registrare, organizzare e analizzare entrate, uscite, budget, patrimonio, obiettivi, alert, appunti e dati collegati alla gestione finanziaria personale.",
      },
      {
        title: "Agente AI",
        text: "Il Consulente AI aiuta a interpretare i dati inseriti nell’app e a proporre spunti pratici di risparmio, controllo spese e organizzazione. Le risposte hanno finalità informative e organizzative.",
      },
      {
        title: "Nessuna consulenza professionale",
        text: "Le analisi e i consigli dell’app non costituiscono consulenza finanziaria, fiscale, legale, patrimoniale o professionale. Le decisioni restano sempre responsabilità dell’utente.",
      },
      {
        title: "Dati inseriti dall’utente",
        text: "L’utente è responsabile della correttezza dei dati inseriti. Se i dati sono incompleti, errati o non aggiornati, anche statistiche, alert, budget e risposte AI possono risultare imprecisi.",
      },
      {
        title: "Backup e conservazione dati",
        text: "L’utente deve eseguire backup periodici prima di aggiornamenti, reinstallazioni, cambi dispositivo o modifiche importanti. L’app offre strumenti di esportazione e ripristino, ma non garantisce il recupero automatico di dati cancellati manualmente.",
      },
      {
        title: "Uso personale",
        text: "fAInance è pensata per uso personale e dimostrativo. Non deve essere usata come unico strumento per decisioni economiche rilevanti, dichiarazioni fiscali, investimenti o obblighi contabili professionali.",
      },
      {
        title: "Aggiornamenti",
        text: "Le funzionalità, i testi, i limiti dell’Agente AI e questi termini possono essere aggiornati nelle versioni successive dell’app.",
      },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>📄</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: textC }}>
              {L("Termini di utilizzo")}
            </div>
          </div>
          <div style={{ fontSize: 13, color: subC, lineHeight: 1.55 }}>
            {L(
              "Usando fAInance accetti che l’app sia uno strumento di supporto alla gestione personale dei tuoi dati finanziari e non un servizio di consulenza professionale."
            )}
          </div>
        </div>
        {rows.map(function (r) {
          return (
            <div
              key={r.title}
              style={{
                background: cardBg,
                borderRadius: 14,
                border: "1px solid " + borderC,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: textC,
                  marginBottom: 6,
                }}
              >
                {L(r.title)}
              </div>
              <div style={{ fontSize: 13, color: subC, lineHeight: 1.55 }}>
                {L(r.text)}
              </div>
            </div>
          );
        })}
        <div
          style={{
            background: dark ? "#24213a" : "#F0EDFF",
            borderRadius: 14,
            border: "1px solid " + (dark ? "#3d376a" : "#D8D2FF"),
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: dark ? "#BEB8FF" : "#534AB7",
              lineHeight: 1.55,
              fontWeight: 600,
            }}
          >
            {L("Versione termini: 1.0 · Ultimo aggiornamento: 25/05/2026")}
          </div>
        </div>
      </div>
    );
  }

  function PrivacyPolicyContent({ showConsentControl = true }: any = {}) {
    function L(s) {
      return translateUiRuntimeText(s);
    }
    var rows = [
      {
        title: "Dati trattati",
        text: "fAInance può salvare i dati che inserisci nell’app, come entrate, uscite, categorie, metodi di pagamento, ricorrenze, budget, patrimonio, obiettivi, alert, appunti, documenti caricati e coordinate bancarie salvate volontariamente.",
      },
      {
        title: "Account e accesso",
        text: "Se accedi con email/password, Google o Apple, vengono usati i dati necessari all’autenticazione, come identificativo utente, email e nome profilo. L’accesso è gestito tramite Firebase Authentication.",
      },
      {
        title: "Salvataggio e sincronizzazione",
        text: "I dati dell’app possono essere salvati localmente sul dispositivo e, per gli utenti autenticati, sincronizzati su Firestore/Firebase per consentire backup e recupero dei dati collegati all’account.",
      },
      {
        title: "Uso dell’Agente AI",
        text: "Quando usi il Consulente AI, fAInance invia la domanda e il contesto finanziario selezionato al backend sicuro fAInance e al provider AI esterno OpenAI per generare la risposta. I dati inviati possono includere lingua, livello di analisi, riepiloghi finanziari, budget, categorie, ricorrenze e, solo se scegli l’analisi completa, transazioni essenziali come data, importo, categoria o tipo e descrizione. Non vengono inviati CVV, dati biometrici, password, documenti caricati, immagini, fidelity card o dati completi delle carte di credito. Puoi non autorizzare o revocare il consenso e continuare a usare l’app senza inviare dati all’Agente AI esterno.",
      },
      {
        title: "Finalità",
        text: "I dati vengono usati per fornire le funzionalità dell’app: registrazione movimenti, statistiche, budget, alert, patrimonio, backup, sincronizzazione e analisi tramite AI.",
      },
      {
        title: "Responsabilità dell’utente",
        text: "L’utente decide quali dati inserire, caricare o cancellare. Prima di salvare documenti, note o coordinate bancarie, valuta se siano davvero necessari per l’uso personale dell’app.",
      },
      {
        title: "Cancellazione dati",
        text: "L’app include funzioni per eliminare dati per sezione o cancellare informazioni salvate. Alcuni dati potrebbero restare in backup o cache tecniche fino ai normali tempi di aggiornamento dei servizi utilizzati.",
      },
      {
        title: "Analisi e attribuzione pubblicitaria",
        text: "Solo se fornisci un consenso facoltativo, l’app può inviare a Meta App Events eventi tecnici come apertura dell’app, completamento della registrazione e acquisti in-app. Non vengono inviati movimenti finanziari, importi, coordinate bancarie, numeri di carta, documenti o contenuti delle note. La raccolta dell’identificatore pubblicitario è disattivata.",
      },
      {
        title: "Servizi terzi",
        text: "L’app può usare servizi esterni come Firebase, Firestore, autenticazione Google/Apple, API di cambio valuta, Meta App Events e servizi AI. Ogni servizio può applicare proprie regole tecniche e privacy.",
      },
      {
        title: "Aggiornamenti",
        text: "Questa informativa può essere aggiornata quando cambiano funzionalità, servizi tecnici, modalità di sincronizzazione, analisi pubblicitaria o uso dell’Agente AI.",
      },
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
              alignItems: "center",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 24 }}>🔐</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: textC }}>
              {L("Informativa Privacy")}
            </div>
          </div>
          <div style={{ fontSize: 13, color: subC, lineHeight: 1.55 }}>
            {L(
              "Questa informativa spiega in modo sintetico quali dati possono essere gestiti da fAInance e per quali finalità vengono usati."
            )}
          </div>
        </div>
        {rows.map(function (r) {
          return (
            <div
              key={r.title}
              style={{
                background: cardBg,
                borderRadius: 14,
                border: "1px solid " + borderC,
                padding: 16,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: textC,
                  marginBottom: 6,
                }}
              >
                {L(r.title)}
              </div>
              <div style={{ fontSize: 13, color: subC, lineHeight: 1.55 }}>
                {L(r.text)}
              </div>
            </div>
          );
        })}
        {showConsentControl && (
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 16,
            }}
          >
            <Toggle
              label={L("Consenti analisi e misurazione pubblicitaria")}
              checked={!!metaEventsConsent}
              onChange={function () {
                setMetaEventsConsent(!metaEventsConsent);
              }}
              color={confirmButtonColor}
            />
            <div
              style={{
                fontSize: 12,
                color: subC,
                lineHeight: 1.5,
                marginTop: 8,
              }}
            >
              {L(
                "Puoi modificare questa scelta in qualsiasi momento. Se disattivata, fAInance non invia eventi a Meta App Events."
              )}
            </div>
          </div>
        )}
        <div
          style={{
            background: dark ? "#24213a" : "#F0EDFF",
            borderRadius: 14,
            border: "1px solid " + (dark ? "#3d376a" : "#D8D2FF"),
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: dark ? "#BEB8FF" : "#534AB7",
              lineHeight: 1.55,
              fontWeight: 600,
            }}
          >
            {L("Versione privacy: 1.1 · Ultimo aggiornamento: 26/07/2026")}
          </div>
        </div>
      </div>
    );
  }

  function TermsAcceptanceModal() {
    var [legalView, setLegalView] = useState("main");
    var termsChecked = !!legalTermsChecked;
    var privacyChecked = !!legalPrivacyChecked;
    var metaChecked = !!legalMetaChecked;
    var legalCopy: any = {
      Autorizzazioni: {
        it: "Autorizzazioni",
        en: "Permissions",
        es: "Autorizaciones",
        fr: "Autorisations",
        de: "Berechtigungen",
        pt: "Autorizações",
        pl: "Uprawnienia",
        nl: "Toestemmingen",
        ro: "Autorizări",
        el: "Άδειες",
      },
      "Prima di continuare devi leggere e accettare i documenti obbligatori.": {
        it: "Prima di continuare devi leggere e accettare i documenti obbligatori.",
        en: "Before continuing, you must read and accept the required documents.",
        es: "Antes de continuar, debes leer y aceptar los documentos obligatorios.",
        fr: "Avant de continuer, tu dois lire et accepter les documents obligatoires.",
        de: "Bevor du fortfährst, musst du die erforderlichen Dokumente lesen und akzeptieren.",
        pt: "Antes de continuar, tens de ler e aceitar os documentos obrigatórios.",
        pl: "Przed kontynuowaniem musisz przeczytać i zaakceptować wymagane dokumenty.",
        nl: "Voordat je doorgaat, moet je de verplichte documenten lezen en accepteren.",
        ro: "Înainte de a continua, trebuie să citești și să accepți documentele obligatorii.",
        el: "Πριν συνεχίσεις, πρέπει να διαβάσεις και να αποδεχτείς τα υποχρεωτικά έγγραφα.",
      },
      "Dichiaro di aver letto e accettato i Termini di utilizzo": {
        it: "Dichiaro di aver letto e accettato i Termini di utilizzo",
        en: "I confirm that I have read and accepted the Terms of Use",
        es: "Declaro que he leído y acepto los Términos de uso",
        fr: "Je déclare avoir lu et accepté les Conditions d’utilisation",
        de: "Ich bestätige, dass ich die Nutzungsbedingungen gelesen und akzeptiert habe",
        pt: "Declaro que li e aceito os Termos de utilização",
        pl: "Oświadczam, że przeczytałem(-am) i akceptuję Warunki korzystania",
        nl: "Ik verklaar dat ik de Gebruiksvoorwaarden heb gelezen en geaccepteerd",
        ro: "Declar că am citit și accept Termenii de utilizare",
        el: "Δηλώνω ότι διάβασα και αποδέχομαι τους Όρους χρήσης",
      },
      "Leggi i Termini di utilizzo": {
        it: "Leggi i Termini di utilizzo",
        en: "Read the Terms of Use",
        es: "Leer los Términos de uso",
        fr: "Lire les Conditions d’utilisation",
        de: "Nutzungsbedingungen lesen",
        pt: "Ler os Termos de utilização",
        pl: "Przeczytaj Warunki korzystania",
        nl: "Lees de Gebruiksvoorwaarden",
        ro: "Citește Termenii de utilizare",
        el: "Διάβασε τους Όρους χρήσης",
      },
      "Dichiaro di aver letto e accettato l’Informativa Privacy": {
        it: "Dichiaro di aver letto e accettato l’Informativa Privacy",
        en: "I confirm that I have read and accepted the Privacy Policy",
        es: "Declaro que he leído y acepto la Política de privacidad",
        fr: "Je déclare avoir lu et accepté la Politique de confidentialité",
        de: "Ich bestätige, dass ich die Datenschutzerklärung gelesen und akzeptiert habe",
        pt: "Declaro que li e aceito a Política de privacidade",
        pl: "Oświadczam, że przeczytałem(-am) i akceptuję Politykę prywatności",
        nl: "Ik verklaar dat ik het Privacybeleid heb gelezen en geaccepteerd",
        ro: "Declar că am citit și accept Politica de confidențialitate",
        el: "Δηλώνω ότι διάβασα και αποδέχομαι την Πολιτική απορρήτου",
      },
      "Leggi l’Informativa Privacy": {
        it: "Leggi l’Informativa Privacy",
        en: "Read the Privacy Policy",
        es: "Leer la Política de privacidad",
        fr: "Lire la Politique de confidentialité",
        de: "Datenschutzerklärung lesen",
        pt: "Ler a Política de privacidade",
        pl: "Przeczytaj Politykę prywatności",
        nl: "Lees het Privacybeleid",
        ro: "Citește Politica de confidențialitate",
        el: "Διάβασε την Πολιτική απορρήτου",
      },
      "Consenso facoltativo": {
        it: "Consenso facoltativo",
        en: "Optional consent",
        es: "Consentimiento opcional",
        fr: "Consentement facultatif",
        de: "Optionale Einwilligung",
        pt: "Consentimento facultativo",
        pl: "Zgoda opcjonalna",
        nl: "Optionele toestemming",
        ro: "Consimțământ opțional",
        el: "Προαιρετική συγκατάθεση",
      },
      "Consento l’invio a Meta di eventi tecnici per misurare installazioni e risultati pubblicitari. Non vengono inviati dati finanziari.":
        {
          it: "Consento l’invio a Meta di eventi tecnici per misurare installazioni e risultati pubblicitari. Non vengono inviati dati finanziari.",
          en: "I consent to sending technical events to Meta to measure installations and advertising results. No financial data is sent.",
          es: "Consiento el envío a Meta de eventos técnicos para medir instalaciones y resultados publicitarios. No se envían datos financieros.",
          fr: "J’accepte l’envoi à Meta d’événements techniques afin de mesurer les installations et les résultats publicitaires. Aucune donnée financière n’est envoyée.",
          de: "Ich stimme der Übermittlung technischer Ereignisse an Meta zu, um Installationen und Werbeergebnisse zu messen. Es werden keine Finanzdaten gesendet.",
          pt: "Consinto o envio à Meta de eventos técnicos para medir instalações e resultados publicitários. Não são enviados dados financeiros.",
          pl: "Wyrażam zgodę na wysyłanie do Meta zdarzeń technicznych w celu pomiaru instalacji i wyników reklam. Żadne dane finansowe nie są przesyłane.",
          nl: "Ik stem in met het verzenden van technische gebeurtenissen naar Meta om installaties en advertentieresultaten te meten. Er worden geen financiële gegevens verzonden.",
          ro: "Sunt de acord cu trimiterea către Meta a evenimentelor tehnice pentru măsurarea instalărilor și a rezultatelor publicitare. Nu sunt trimise date financiare.",
          el: "Συναινώ στην αποστολή τεχνικών συμβάντων στη Meta για τη μέτρηση εγκαταστάσεων και διαφημιστικών αποτελεσμάτων. Δεν αποστέλλονται οικονομικά δεδομένα.",
        },
      Continua: {
        it: "Continua",
        en: "Continue",
        es: "Continuar",
        fr: "Continuer",
        de: "Weiter",
        pt: "Continuar",
        pl: "Kontynuuj",
        nl: "Doorgaan",
        ro: "Continuă",
        el: "Συνέχεια",
      },
      "‹ Indietro": {
        it: "‹ Indietro",
        en: "‹ Back",
        es: "‹ Atrás",
        fr: "‹ Retour",
        de: "‹ Zurück",
        pt: "‹ Voltar",
        pl: "‹ Wstecz",
        nl: "‹ Terug",
        ro: "‹ Înapoi",
        el: "‹ Πίσω",
      },
      "Termini di utilizzo": {
        it: "Termini di utilizzo",
        en: "Terms of Use",
        es: "Términos de uso",
        fr: "Conditions d’utilisation",
        de: "Nutzungsbedingungen",
        pt: "Termos de utilização",
        pl: "Warunki korzystania",
        nl: "Gebruiksvoorwaarden",
        ro: "Termeni de utilizare",
        el: "Όροι χρήσης",
      },
      "Informativa Privacy": {
        it: "Informativa Privacy",
        en: "Privacy Policy",
        es: "Política de privacidad",
        fr: "Politique de confidentialité",
        de: "Datenschutzerklärung",
        pt: "Política de privacidade",
        pl: "Polityka prywatności",
        nl: "Privacybeleid",
        ro: "Politica de confidențialitate",
        el: "Πολιτική απορρήτου",
      },
      "Ho letto": {
        it: "Ho letto",
        en: "I have read it",
        es: "He leído",
        fr: "J’ai lu",
        de: "Ich habe es gelesen",
        pt: "Li",
        pl: "Przeczytałem(-am)",
        nl: "Ik heb het gelezen",
        ro: "Am citit",
        el: "Το διάβασα",
      },
      "Autorizzazioni salvate": {
        it: "Autorizzazioni salvate",
        en: "Permissions saved",
        es: "Autorizaciones guardadas",
        fr: "Autorisations enregistrées",
        de: "Berechtigungen gespeichert",
        pt: "Autorizações guardadas",
        pl: "Uprawnienia zapisane",
        nl: "Toestemmingen opgeslagen",
        ro: "Autorizări salvate",
        el: "Οι άδειες αποθηκεύτηκαν",
      },
    };
    function LT(key: string) {
      var row = legalCopy[key] || {};
      return row[String(lang || "it")] || row.it || String(key);
    }
    function acceptAll() {
      if (!termsChecked || !privacyChecked || legalAcceptingRef.current) return;
      legalAcceptingRef.current = true;
      var acceptedAt = new Date().toISOString();
      if (!applyingFirestoreRef.current)
        markUserLocalChange("legal_acceptance_v2");
      var legalPayload = writeLegalAcceptanceLocal(acceptedAt, !!metaChecked);
      if (userId) {
        setDoc(
          doc(fbDb, "users", userId),
          {
            legalAcceptanceV2: legalPayload,
            termsAccepted: true,
            privacyAccepted: true,
            metaEventsConsent: !!metaChecked,
            legalAcceptanceDate: acceptedAt,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(function (e) {
          console.error(
            "Legal acceptance profile save error",
            (e && e.code) || "unknown"
          );
        });
      }
      if (onProfileUpdate)
        onProfileUpdate({
          legalAcceptanceV2: legalPayload,
          termsAccepted: true,
          privacyAccepted: true,
          metaEventsConsent: !!metaChecked,
          legalAcceptanceDate: acceptedAt,
        });
      setLegalAcceptanceCommitted(true);
      setLegalTermsChecked(true);
      setLegalPrivacyChecked(true);
      setTermsAccepted(true);
      setPrivacyAccepted(true);
      setMetaEventsConsent(!!metaChecked);
      setLegalAcceptanceDate(acceptedAt);
      setToast({
        text: LT("Autorizzazioni salvate"),
        type: "success",
        translated: true,
      });
    }
    function LegalDetail({ type }) {
      var isTerms = type === "terms";
      return (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={function () {
                setLegalView("main");
              }}
              style={{
                border: "1px solid " + borderC,
                background: dark ? "#252535" : "#f5f5f5",
                color: textC,
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {LT("‹ Indietro")}
            </button>
            <div style={{ fontSize: 16, fontWeight: 900, color: textC }}>
              {LT(isTerms ? "Termini di utilizzo" : "Informativa Privacy")}
            </div>
          </div>
          <div
            style={{ maxHeight: "58vh", overflowY: "auto", paddingRight: 4 }}
          >
            {isTerms ? (
              <TermsAndConditionsContent />
            ) : (
              <PrivacyPolicyContent showConsentControl={false} />
            )}
          </div>
          <button
            type="button"
            onClick={function () {
              if (isTerms) setLegalTermsChecked(true);
              else setLegalPrivacyChecked(true);
              setLegalView("main");
            }}
            style={{
              width: "100%",
              background:
                "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
              color: "#fff",
              border: "none",
              borderRadius: btnRadius,
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(127,119,221,0.35)",
              marginTop: 14,
            }}
          >
            {LT("Ho letto")}
          </button>
        </div>
      );
    }
    if (legalView === "terms")
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.58)",
            zIndex: 900,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "17vh 16px 3vh",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              background: cardBg,
              borderRadius: 22,
              border: "1px solid " + borderC,
              boxShadow: "0 14px 60px rgba(0,0,0,0.32)",
              padding: 20,
            }}
          >
            <LegalDetail type="terms" />
          </div>
        </div>
      );
    if (legalView === "privacy")
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.58)",
            zIndex: 900,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "17vh 16px 3vh",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              background: cardBg,
              borderRadius: 22,
              border: "1px solid " + borderC,
              boxShadow: "0 14px 60px rgba(0,0,0,0.32)",
              padding: 20,
            }}
          >
            <LegalDetail type="privacy" />
          </div>
        </div>
      );
    function checkMark(checked) {
      return (
        <span
          aria-hidden="true"
          style={{
            width: 20,
            height: 20,
            marginTop: 1,
            borderRadius: 4,
            border: "2px solid " + (checked ? "#7F77DD" : borderC),
            background: checked ? "#7F77DD" : "transparent",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 900,
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          {checked ? "✓" : ""}
        </span>
      );
    }
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.58)",
          zIndex: 900,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "17vh 16px 3vh",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            maxHeight: "88vh",
            overflowY: "auto",
            background: cardBg,
            borderRadius: 22,
            border: "1px solid " + borderC,
            boxShadow: "0 14px 60px rgba(0,0,0,0.32)",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <FAInanceLogo size={44} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: textC }}>
                {LT("Autorizzazioni")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {LT(
                  "Prima di continuare devi leggere e accettare i documenti obbligatori."
                )}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                background: dark ? "#1e1e30" : "#f9f9f9",
                borderRadius: 14,
                border: "1px solid " + borderC,
                padding: 14,
              }}
            >
              <button
                type="button"
                aria-pressed={termsChecked}
                onClick={function () {
                  setLegalTermsChecked(function (v) {
                    return !v;
                  });
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: textC,
                  textAlign: "left",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {checkMark(termsChecked)}
                <span style={{ fontSize: 13, color: textC, lineHeight: 1.45 }}>
                  {LT(
                    "Dichiaro di aver letto e accettato i Termini di utilizzo"
                  )}{" "}
                  <span style={{ color: "#E24B4A" }}>*</span>
                </span>
              </button>
              <button
                type="button"
                onClick={function () {
                  setLegalView("terms");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: dark ? "#BEB8FF" : "#378ADD",
                  padding: "8px 0 0 30px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {LT("Leggi i Termini di utilizzo")}
              </button>
            </div>
            <div
              style={{
                background: dark ? "#1e1e30" : "#f9f9f9",
                borderRadius: 14,
                border: "1px solid " + borderC,
                padding: 14,
              }}
            >
              <button
                type="button"
                aria-pressed={privacyChecked}
                onClick={function () {
                  setLegalPrivacyChecked(function (v) {
                    return !v;
                  });
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: textC,
                  textAlign: "left",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {checkMark(privacyChecked)}
                <span style={{ fontSize: 13, color: textC, lineHeight: 1.45 }}>
                  {LT(
                    "Dichiaro di aver letto e accettato l’Informativa Privacy"
                  )}{" "}
                  <span style={{ color: "#E24B4A" }}>*</span>
                </span>
              </button>
              <button
                type="button"
                onClick={function () {
                  setLegalView("privacy");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: dark ? "#BEB8FF" : "#378ADD",
                  padding: "8px 0 0 30px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {LT("Leggi l’Informativa Privacy")}
              </button>
            </div>
            <div
              style={{
                background: dark ? "#1e1e30" : "#f9f9f9",
                borderRadius: 14,
                border: "1px solid " + borderC,
                padding: 14,
              }}
            >
              <button
                type="button"
                aria-pressed={metaChecked}
                onClick={function () {
                  setLegalMetaChecked(function (v) {
                    return !v;
                  });
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: textC,
                  textAlign: "left",
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {checkMark(metaChecked)}
                <span style={{ fontSize: 13, color: textC, lineHeight: 1.45 }}>
                  <strong>{LT("Consenso facoltativo")}</strong>
                  <br />
                  {LT(
                    "Consento l’invio a Meta di eventi tecnici per misurare installazioni e risultati pubblicitari. Non vengono inviati dati finanziari."
                  )}
                </span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={acceptAll}
            disabled={
              !termsChecked || !privacyChecked || legalAcceptingRef.current
            }
            style={{
              width: "100%",
              background:
                !termsChecked || !privacyChecked
                  ? dark
                    ? "#333"
                    : "#ddd"
                  : "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
              color:
                !termsChecked || !privacyChecked
                  ? dark
                    ? "#777"
                    : "#999"
                  : "#fff",
              border: "none",
              borderRadius: btnRadius,
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 800,
              cursor:
                !termsChecked || !privacyChecked ? "not-allowed" : "pointer",
              boxShadow:
                !termsChecked || !privacyChecked
                  ? "none"
                  : "0 4px 16px rgba(127,119,221,0.35)",
            }}
          >
            {LT("Continua")}
          </button>
        </div>
      </div>
    );
  }

  var settingsSections = [
    {
      id: "profile",
      icon: "👤",
      label: translateUiRuntimeText("Profilo"),
      desc: translateUiRuntimeText("Dati personali, account, accesso"),
    },
    {
      id: "general",
      icon: "🌐",
      label: translateUiRuntimeText("Generale"),
      desc: translateUiRuntimeText(
        "Lingua, formato data, metriche, valute e IA"
      ),
    },
    {
      id: "appearance",
      icon: "🎨",
      label: translateUiRuntimeText("Aspetto"),
      desc: translateUiRuntimeText("Tema, colori, stile pulsanti e widget"),
    },
    {
      id: "sections",
      icon: "🧩",
      label: translateUiRuntimeText("Sezioni"),
      desc: translateUiRuntimeText("Entrate, uscite, patrimonio e storico"),
    },
    {
      id: "notifications",
      icon: "🔔",
      label: translateUiRuntimeText("Notifiche e Promemoria"),
      desc: translateUiRuntimeText("Promemoria inserimento, notifiche custom"),
    },
    {
      id: "info_support",
      icon: "🗂️",
      label: translateUiRuntimeText("Dati e Supporto"),
      desc: translateUiRuntimeText("Dati, assistenza e informazioni app"),
    },
  ];

  var bottomNavDefaultOrder = ["home", "spese", "history", "voice", "more"];
  var mobileMenuDefaultOrder = [
    "stats",
    "consulenteAI",
    "patrimonio",
    "budget",
    "share",
    "debtCredits",
    "shopping",
    "goals",
    "alerts",
    "appunti",
    "settings",
  ];
  var mobileAllNavDefaultOrder = DEFAULT_MOBILE_ALL_NAV_ORDER;
  function voiceLabel() {
    return (
      (TRANSLATIONS[lang] && TRANSLATIONS[lang].voice) ||
      {
        it: "Voce",
        en: "Voice",
        es: "Voz",
        fr: "Voix",
        de: "Stimme",
        pt: "Voz",
        pl: "Głos",
        nl: "Stem",
        ro: "Voce",
        el: "Φωνή",
      }[lang] ||
      "Voice"
    );
  }
  function sectionLabel(id) {
    var dict = {
      it: {
        home: "Home",
        spese: "Movimenti",
        history: "Storico",
        stats: "Statistiche",
        appunti: "Appunti",
        voice: "Voce",
        share: "Share",
        debtCredits: "Debiti / Crediti",
        shopping: "Spesa",
        consulenteAI: "Consulente AI",
        patrimonio: "Patrimonio",
        budget: "Budget",
        goals: "Obiettivi",
        alerts: "Alert",
        settings: "Impostazioni",
        more: "Altro",
      },
      en: {
        home: "Home",
        spese: "Movements",
        history: "History",
        stats: "Statistics",
        appunti: "Notes",
        voice: "Voice",
        share: "Share",
        debtCredits: "Debts / Credits",
        shopping: "Shopping",
        consulenteAI: "AI Advisor",
        patrimonio: "Assets",
        budget: "Budget",
        goals: "Goals",
        alerts: "Alerts",
        settings: "Settings",
        more: "More",
      },
      es: {
        home: "Inicio",
        spese: "Movimientos",
        history: "Historial",
        stats: "Estadísticas",
        appunti: "Notas",
        voice: "Voz",
        share: "Share",
        debtCredits: "Deudas / Créditos",
        shopping: "Compra",
        consulenteAI: "Asesor IA",
        patrimonio: "Patrimonio",
        budget: "Presupuesto",
        goals: "Objetivos",
        alerts: "Alertas",
        settings: "Ajustes",
        more: "Más",
      },
      fr: {
        home: "Accueil",
        spese: "Mouvements",
        history: "Historique",
        stats: "Statistiques",
        appunti: "Notes",
        voice: "Voix",
        share: "Share",
        debtCredits: "Dettes / Créances",
        shopping: "Courses",
        consulenteAI: "Conseiller IA",
        patrimonio: "Patrimoine",
        budget: "Budget",
        goals: "Objectifs",
        alerts: "Alertes",
        settings: "Paramètres",
        more: "Plus",
      },
      de: {
        home: "Startseite",
        spese: "Buchungen",
        history: "Verlauf",
        stats: "Statistiken",
        appunti: "Notizen",
        voice: "Stimme",
        share: "Share",
        debtCredits: "Schulden / Forderungen",
        shopping: "Einkauf",
        consulenteAI: "KI-Berater",
        patrimonio: "Vermögen",
        budget: "Budget",
        goals: "Ziele",
        alerts: "Warnungen",
        settings: "Einstellungen",
        more: "Andere",
      },
      pt: {
        home: "Início",
        spese: "Movimentos",
        history: "Histórico",
        stats: "Estatísticas",
        appunti: "Apontamentos",
        voice: "Voz",
        share: "Share",
        debtCredits: "Dívidas / Créditos",
        shopping: "Compras",
        consulenteAI: "Consultor IA",
        patrimonio: "Património",
        budget: "Orçamento",
        goals: "Objetivos",
        alerts: "Alertas",
        settings: "Definições",
        more: "Mais",
      },
      pl: {
        home: "Start",
        spese: "Ruchy",
        history: "Historia",
        stats: "Statystyki",
        appunti: "Notatki",
        voice: "Głos",
        share: "Share",
        debtCredits: "Długi / Należności",
        shopping: "Zakupy",
        consulenteAI: "Doradca AI",
        patrimonio: "Majątek",
        budget: "Budżet",
        goals: "Cele",
        alerts: "Alerty",
        settings: "Ustawienia",
        more: "Więcej",
      },
      nl: {
        home: "Home",
        spese: "Mutaties",
        history: "Geschiedenis",
        stats: "Statistieken",
        appunti: "Notities",
        voice: "Stem",
        share: "Share",
        debtCredits: "Schulden / Tegoeden",
        shopping: "Boodschappen",
        consulenteAI: "AI-adviseur",
        patrimonio: "Vermogen",
        budget: "Budget",
        goals: "Doelen",
        alerts: "Waarschuwingen",
        settings: "Instellingen",
        more: "Meer",
      },
      ro: {
        home: "Acasă",
        spese: "Mișcări",
        history: "Istoric",
        stats: "Statistici",
        appunti: "Notițe",
        voice: "Voce",
        share: "Share",
        debtCredits: "Datorii / Creanțe",
        shopping: "Cumpărături",
        consulenteAI: "Consilier AI",
        patrimonio: "Patrimoniu",
        budget: "Buget",
        goals: "Obiective",
        alerts: "Alerte",
        settings: "Setări",
        more: "Mai mult",
      },
      el: {
        home: "Αρχική",
        spese: "Κινήσεις",
        history: "Ιστορικό",
        stats: "Στατιστικά",
        appunti: "Σημειώσεις",
        voice: "Φωνή",
        share: "Share",
        debtCredits: "Χρέη / Πιστώσεις",
        shopping: "Αγορές",
        consulenteAI: "Σύμβουλος AI",
        patrimonio: "Περιουσία",
        budget: "Προϋπολογισμός",
        goals: "Στόχοι",
        alerts: "Ειδοποιήσεις",
        settings: "Ρυθμίσεις",
        more: "Περισσότερα",
      },
    };
    return (dict[lang] && dict[lang][id]) || dict.it[id] || id;
  }
  function allNavDefs() {
    return {
      home: { id: "home", icon: "🏠", label: sectionLabel("home") },
      spese: {
        id: "spese",
        icon: "💸",
        label: sectionLabel("spese"),
        badge: pendingCount,
      },
      history: { id: "history", icon: "📋", label: sectionLabel("history") },
      stats: { id: "stats", icon: "📊", label: sectionLabel("stats") },
      appunti: { id: "appunti", icon: "🗂", label: sectionLabel("appunti") },
      voice: { id: "voice", icon: "🎙️", label: sectionLabel("voice") },
      share: { id: "share", icon: "🤝", label: "Share" },
      debtCredits: {
        id: "debtCredits",
        icon: "💳",
        label: sectionLabel("debtCredits"),
      },
      shopping: { id: "shopping", icon: "🛒", label: sectionLabel("shopping") },
      consulenteAI: {
        id: "consulenteAI",
        icon: <AIGrilloIcon size={28} />,
        label: sectionLabel("consulenteAI"),
      },
      patrimonio: {
        id: "patrimonio",
        icon: "💎",
        label: sectionLabel("patrimonio"),
      },
      budget: { id: "budget", icon: "💰", label: sectionLabel("budget") },
      goals: { id: "goals", icon: "🎯", label: sectionLabel("goals") },
      alerts: {
        id: "alerts",
        icon: "🔔",
        label: sectionLabel("alerts"),
        badge: alertTriggered,
      },
      settings: { id: "settings", icon: "⚙", label: sectionLabel("settings") },
      more: {
        id: "more",
        icon: "☰",
        label: sectionLabel("more"),
        badge: alertTriggered,
      },
    };
  }
  function bottomNavDefs() {
    return allNavDefs();
  }
  function menuNavDefs() {
    return allNavDefs();
  }
  function normalizeOrder(order, defaults) {
    var seen = {};
    var out = [];
    (Array.isArray(order) ? order : []).concat(defaults).forEach(function (id) {
      if (defaults.indexOf(id) >= 0 && !seen[id]) {
        seen[id] = true;
        out.push(id);
      }
    });
    return out;
  }
  function moveOrder(order, setOrder, defaults, id, dir) {
    var arr = normalizeOrder(order, defaults);
    var i = arr.indexOf(id);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
    setOrder(arr);
    setToast("Impostazioni aggiornate");
  }
  function getBottomNavIds() {
    var order = normalizeOrder(mobileAllNavOrder, mobileAllNavDefaultOrder);
    var count = Math.max(
      3,
      Math.min(7, parseInt(String(mobileNavIconCount || 5), 10) || 5)
    );
    return order
      .filter(function (id) {
        return id !== "more";
      })
      .slice(0, Math.max(0, count - 1));
  }
  function buildBottomNavItems() {
    var defs = allNavDefs();
    var selected = getBottomNavIds();
    selected.push("more");
    return selected
      .map(function (id) {
        return defs[id];
      })
      .filter(Boolean);
  }
  function buildMobileMenuItems() {
    var defs = allNavDefs();
    var inBottom = {};
    getBottomNavIds().forEach(function (id) {
      inBottom[id] = true;
    });
    return normalizeOrder(mobileAllNavOrder, mobileAllNavDefaultOrder)
      .filter(function (id) {
        return !inBottom[id];
      })
      .map(function (id) {
        return defs[id];
      })
      .filter(Boolean);
  }

  /* SettingsPanel extracted */

  /* DebtCreditsPanel extracted */

  /* ShoppingPanel extracted */

  // ── Pannelli estratti in file separati ───────────────────────────────────────
  // HomePanel, SpesePanel, HistoryPanel → sezioni.tsx
  // StatsPanel                          → statistiche.tsx
  // ConsulenteAIPanel, FloatingAIButton  → sezioni.tsx
  // Patrimonio / Share / More            → src/sections/*
  // Appunti                              → src/sections/AppuntiPanel.tsx
  // Impostazioni                         → src/settings/SettingsPanel.tsx
  // Tutti i pannelli leggono il contesto via useApp()
  // ─────────────────────────────────────────────────────────────────────────────

  var navItems = [
    "home",
    "spese",
    "history",
    "stats",
    "consulenteAI",
    "patrimonio",
    "budget",
    "share",
    "debtCredits",
    "shopping",
    "goals",
    "alerts",
    "appunti",
    "settings",
  ]
    .map(function (id) {
      return allNavDefs()[id];
    })
    .filter(Boolean);

  // ── COPY MONTH WIDGET (proper component to avoid hooks-in-IIFE) ──────────────

  /* CopyMonthWidget extracted */

  // ── PATRIMONIO PANEL ────────────────────────────────────────────────────────

  /* PatrimonioPanel extracted */

  function createShareProject(name, description, icon, color) {
    if (!canAddPlanItem("shareProjects", (shareProjects || []).length, 1)) {
      setToast({
        text: upgradeMessage("shareProjects", (shareProjects || []).length),
        type: "error",
        color: "#E24B4A",
        icon: "🚫",
      });
      return null;
    }
    var owner = {
      id: "me",
      uid: userId,
      name: currentUser && currentUser.name ? currentUser.name : "Io",
      email:
        currentUser && currentUser.email
          ? normalizeEmail(currentUser.email)
          : "",
      kind: "registered",
      type: "registered",
      role: "owner",
      status: "active",
    };
    var p = {
      id: String(Date.now()),
      name: (name || "").trim() || "Progetto Share",
      description: (description || "").trim(),
      icon: icon || "🤝",
      color: color || "#4F8FF7",
      ownerUid: userId,
      ownerName: owner.name,
      ownerEmail: owner.email,
      memberUids: userId ? [userId] : [],
      participants: [owner],
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedAtMs: Date.now(),
    };
    setShareProjects(function (list) {
      return [p].concat(list || []);
    });
    syncShareProjectToCloud(p);
    setShareSelectedProjectId(p.id);
    setShareProjectTab("attivita");
    return p;
  }
  function updateShareProject(pid, fn) {
    setShareProjects(function (list) {
      return (list || []).map(function (p) {
        if (String(p.id) !== String(pid)) return p;
        var nowIso = new Date().toISOString();
        var updated = { ...fn(p), updatedAt: nowIso, updatedAtMs: Date.now() };
        syncShareProjectToCloud(updated);
        return updated;
      });
    });
  }
  function shareCurrentParticipant(project) {
    var rows = Array.isArray(project && project.participants)
      ? project.participants
      : [];
    return (
      rows.find(function (participant) {
        return String(participant && participant.uid || "") === String(userId || "");
      }) ||
      (String(project && project.ownerUid || "") === String(userId || "")
        ? rows.find(function (participant) {
            return participant && (participant.role === "owner" || participant.id === "me");
          })
        : null) ||
      null
    );
  }
  function shareHistoryRowsForCurrentUser(project) {
    if (!project) return [];
    var participant = shareCurrentParticipant(project);
    if (!participant) return [];
    var participantId = String(participant.id || "");
    var projectId = String(project.id || "");
    var projectName = String(project.name || "Progetto Share");
    return (Array.isArray(project.activities) ? project.activities : [])
      .filter(function (activity) {
        return activity && activity.kind !== "settlement";
      })
      .map(function (activity) {
        var shares = activity && activity.shares && typeof activity.shares === "object"
          ? activity.shares
          : {};
        var amount = Number(shares[participantId] || 0);
        if (!(amount > 0) && !Object.keys(shares).length && String(activity.paidBy || "") === participantId)
          amount = Number(activity.baseAmount || activity.amount || 0);
        if (!(amount > 0)) return null;
        var activityId = String(activity.id == null ? "" : activity.id);
        var stableId =
          "share_history_" +
          projectId.replace(/[^a-zA-Z0-9_-]/g, "_") +
          "_" +
          activityId.replace(/[^a-zA-Z0-9_-]/g, "_") +
          "_" +
          String(userId || "").replace(/[^a-zA-Z0-9_-]/g, "_");
        return {
          id: stableId,
          amount: Math.abs(amount),
          catId: 17,
          methodId: 7,
          methodName: "Altro",
          desc: "Share · " + projectName + " · " + String(activity.desc || "Spesa condivisa"),
          date: String(activity.date || todayStr()),
          rateizzato: false,
          source: "share_project_history",
          shareProjectId: projectId,
          shareActivityId: activityId,
          shareProjectName: projectName,
          currency: String(activity.baseCurrency || currency || "EUR"),
          createdAt: String(activity.createdAt || new Date().toISOString()),
        };
      })
      .filter(Boolean);
  }
  function saveShareProjectExpensesToHistory(project) {
    var rows = shareHistoryRowsForCurrentUser(project);
    if (!rows.length) return 0;
    var added = 0;
    setExpenses(function (current) {
      var list = Array.isArray(current) ? current : [];
      var existing = {};
      list.forEach(function (item) {
        existing[String(item && item.id || "")] = true;
      });
      var fresh = rows.filter(function (item) {
        var key = String(item && item.id || "");
        if (!key || existing[key]) return false;
        existing[key] = true;
        added += 1;
        return true;
      });
      return fresh.concat(list);
    });
    return added;
  }
  function shareDeletionRecipientUids(project) {
    var ids = [];
    function add(value) {
      var uid = String(value || "").trim();
      if (uid && uid !== String(userId || "") && ids.indexOf(uid) < 0) ids.push(uid);
    }
    add(project && project.ownerUid);
    (Array.isArray(project && project.participants) ? project.participants : []).forEach(function (participant) {
      if (!participant || participant.status === "archived" || participant.status === "pending") return;
      if (participant.kind && participant.kind !== "registered") return;
      add(participant.uid);
      var id = String(participant.id || "");
      if (!participant.uid && id.indexOf("u_") === 0) add(id.slice(2));
    });
    return ids;
  }
  function requestShareProjectDeletion(pid) {
    var project = (Array.isArray(shareProjectsRef.current) ? shareProjectsRef.current : []).find(function (item) {
      return String(item && item.id || "") === String(pid || "");
    });
    if (!project) return;
    setShareDeletionPrompt({
      source: "owner",
      project: project,
      notificationId: "",
    });
  }
  async function deleteShareProject(pid, keepHistory) {
    var project = (Array.isArray(shareProjectsRef.current) ? shareProjectsRef.current : []).find(function (item) {
      return String(item && item.id || "") === String(pid || "");
    });
    if (!project) return false;
    var nowIso = new Date().toISOString();
    var nowMs = Date.now();
    var deletedByName = currentUserShareName();
    if (keepHistory) saveShareProjectExpensesToHistory(project);
    var deletedProject = {
      ...project,
      status: "deleted",
      deletedAt: nowIso,
      deletedAtMs: nowMs,
      deletedByUid: String(userId || ""),
      deletedByName: deletedByName,
      updatedAt: nowIso,
      updatedAtMs: nowMs,
      shareRevision: nowMs,
    };
    await setDoc(doc(fbDb, "shareProjects", String(pid)), deletedProject, { merge: true });
    var recipients = shareDeletionRecipientUids(project);
    await Promise.all(
      recipients.map(function (targetUid) {
        var notificationId =
          "share_project_deleted_" +
          String(pid) +
          "_" +
          String(targetUid) +
          "_" +
          String(nowMs);
        return setDoc(
          doc(fbDb, "appNotifications", notificationId),
          {
            targetUid: targetUid,
            type: "share_project_deleted",
            title: "Progetto Share eliminato",
            message: deletedByName + " ha eliminato il progetto " + String(project.name || "Progetto Share"),
            messageArgs: {
              name: deletedByName,
              project: String(project.name || "Progetto Share"),
            },
            projectId: String(pid),
            actionType: "share_project_deleted_decision",
            actionValue: String(pid),
            source: "share",
            sourceUid: String(userId || ""),
            decisionStatus: "pending",
            read: false,
            status: "active",
            createdAt: nowIso,
            createdAtMs: nowMs,
          },
          { merge: true }
        );
      })
    );
    setShareProjects(function (list) {
      return (list || []).filter(function (item) {
        return String(item && item.id || "") !== String(pid);
      });
    });
    if (String(shareSelectedProjectId) === String(pid)) setShareSelectedProjectId(null);
    setToast(keepHistory ? "Progetto eliminato e spese salvate nello storico" : "Progetto Share eliminato");
    return true;
  }
  async function resolveShareDeletionPrompt(keepHistory) {
    var prompt = shareDeletionPromptRef.current;
    if (!prompt || !prompt.project || shareDeletionBusy) return;
    setShareDeletionBusy(true);
    try {
      if (prompt.source === "owner") {
        await deleteShareProject(String(prompt.project.id || ""), !!keepHistory);
      } else {
        var savedCount = keepHistory ? saveShareProjectExpensesToHistory(prompt.project) : 0;
        var pid = String(prompt.project.id || prompt.projectId || "");
        setShareProjects(function (list) {
          return (list || []).filter(function (item) {
            return String(item && item.id || "") !== pid;
          });
        });
        if (String(shareSelectedProjectId) === pid) setShareSelectedProjectId(null);
        if (prompt.notificationId) {
          await setDoc(
            doc(fbDb, "appNotifications", String(prompt.notificationId)),
            {
              decisionStatus: keepHistory ? "saved" : "discarded",
              read: true,
              readAt: new Date().toISOString(),
              decidedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch(function () {});
        }
        setToast(
          keepHistory
            ? savedCount > 0
              ? "Spese Share salvate nello storico personale"
              : "Nessuna spesa personale da salvare"
            : "Progetto Share rimosso"
        );
      }
      setShareDeletionPrompt(null);
    } catch (error) {
      console.error("Share project deletion error", error);
      setToast({
        text: translateUiRuntimeText("Errore durante l'eliminazione del progetto Share."),
        type: "error",
        color: "#E24B4A",
        icon: "⚠️",
      });
    } finally {
      setShareDeletionBusy(false);
    }
  }

  function ShareDeletionDecisionModal() {
    var prompt = shareDeletionPrompt;
    if (!prompt || !prompt.project) return null;
    var projectName = String(prompt.project.name || "Progetto Share");
    var deletedByName = String(
      prompt.deletedByName || prompt.project.deletedByName || ""
    );
    var participantMessage = deletedByName
      ? translateUiRuntimeText("{name} ha eliminato il progetto {project}.")
          .replace("{name}", deletedByName)
          .replace("{project}", projectName)
      : translateUiRuntimeText("Il progetto {project} è stato eliminato.").replace(
          "{project}",
          projectName
        );
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 20050,
          background: "rgba(0,0,0,.48)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          style={{
            width: "100%",
            maxWidth: 430,
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 22,
            padding: 20,
            boxShadow: dark ? "none" : "0 22px 60px rgba(0,0,0,.22)",
            color: textC,
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#F3EEFF",
                fontSize: 23,
                flexShrink: 0,
              }}
            >
              🤝
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 950 }}>
                {translateUiRuntimeText("Progetto Share eliminato")}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 850,
                  marginTop: 3,
                  overflowWrap: "anywhere",
                }}
              >
                {projectName}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 16,
              fontSize: 13,
              lineHeight: 1.5,
              color: subC,
            }}
          >
            {prompt.source === "owner"
              ? translateUiRuntimeText(
                  "Vuoi conservare le tue spese del progetto nello storico personale o eliminarle?"
                )
              : participantMessage +
                " " +
                translateUiRuntimeText(
                  "Vuoi conservare le tue spese del progetto nello storico personale o eliminarle?"
                )}
          </div>
          <div
            style={{
              marginTop: 12,
              borderRadius: 14,
              padding: "10px 12px",
              background: dark ? "#29283A" : "#F7F5FF",
              border: "1px solid " + (dark ? "#46435F" : "#E5DEFF"),
              fontSize: 11,
              lineHeight: 1.45,
              color: subC,
            }}
          >
            {translateUiRuntimeText(
              "Nello storico personale vengono salvate solo le spese attribuite a te; saldi e rimborsi non vengono copiati."
            )}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginTop: 18,
            }}
          >
            <button
              type="button"
              disabled={shareDeletionBusy}
              onClick={function () {
                resolveShareDeletionPrompt(false);
              }}
              style={{
                border: "1px solid #F2B8B5",
                background: dark ? "#3A2426" : "#FFF2F1",
                color: expenseColor,
                borderRadius: 13,
                padding: "11px 9px",
                fontSize: 12,
                fontWeight: 900,
                cursor: shareDeletionBusy ? "wait" : "pointer",
                opacity: shareDeletionBusy ? 0.65 : 1,
              }}
            >
              {translateUiRuntimeText("Elimina le spese")}
            </button>
            <button
              type="button"
              disabled={shareDeletionBusy}
              onClick={function () {
                resolveShareDeletionPrompt(true);
              }}
              style={{
                border: 0,
                background: confirmButtonColor,
                color: "#fff",
                borderRadius: 13,
                padding: "11px 9px",
                fontSize: 12,
                fontWeight: 900,
                cursor: shareDeletionBusy ? "wait" : "pointer",
                opacity: shareDeletionBusy ? 0.65 : 1,
              }}
            >
              {translateUiRuntimeText("Conserva nello storico")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* SharePanel extracted */

  /* MorePanel extracted */

  // panelContent() is defined in sezioni.tsx and imported above
  function panelContent() {
    if (tab === "home") return <HomePanel />;
    if (tab === "spese") return <SpesePanel />;
    if (tab === "history") return <HistoryPanel />;
    if (tab === "more") return <MorePanel />;
    if (tab === "share")
      return <StableNestedPanelHost key="share" render={SharePanel} />;
    if (tab === "debtCredits")
      return (
        <StableNestedPanelHost key="debtCredits" render={DebtCreditsPanel} />
      );
    if (tab === "shopping")
      return <StableNestedPanelHost key="shopping" render={ShoppingPanel} />;
    if (tab === "stats") return <StatsPanel />;
    if (tab === "consulenteAI") return <ConsulenteAIPanel />;
    if (tab === "budget") return <BudgetPlanPanel />;
    if (tab === "goals") return <GoalsPanel />;
    if (tab === "patrimonio")
      return (
        <StableNestedPanelHost key="patrimonio" render={PatrimonioPanel} />
      );
    if (tab === "appunti")
      return <StableNestedPanelHost key="appunti" render={AppuntiPanel} />;
    if (tab === "alerts") return <AlertsPanel />;
    if (tab === "settings")
      return <StableNestedPanelHost key="settings" render={SettingsPanel} />;
    return null;
  }

  var mobileMain = buildBottomNavItems();

  function BiometricLockScreen() {
    var configuredPin = validateLocalPin(localLockPin);
    var method = unlockMethod || localLockMethod || "biometric";
    if (method === "pin" && !configuredPin) method = "biometric";
    function submitPin() {
      unlockWithPin((unlockPinRef && unlockPinRef.current) || unlockPin);
    }
    function submitPassword() {
      unlockWithAccountPassword(unlockPassword);
    }
    function chooseUnlockMethod(m) {
      setUnlockMethod(m);
      setBiometricLockMessage("");
      setUnlockPin("");
      unlockPinRef.current = "";
      setUnlockPassword("");
    }
    var optionBtn = function (id, label) {
      var active = method === id;
      return (
        <button
          type="button"
          onClick={function () {
            chooseUnlockMethod(id);
          }}
          style={{
            flex: 1,
            border: "1px solid " + (active ? confirmButtonColor : borderC),
            background: active
              ? confirmButtonColor + "22"
              : dark
              ? "#252535"
              : "#fff",
            color: active ? confirmButtonColor : textC,
            borderRadius: btnRadius,
            padding: "9px 8px",
            fontSize: 12,
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {L(label)}
        </button>
      );
    };
    return (
      <div
        style={{
          fontFamily: "system-ui,sans-serif",
          height: "100vh",
          background: dark
            ? "linear-gradient(160deg,#111827,#1E1E30)"
            : "linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 24,
            boxShadow: dark
              ? "0 18px 70px rgba(0,0,0,.45)"
              : "0 18px 70px rgba(74,66,160,.22)",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 24,
              background: dark ? "#24213a" : "#F0EDFF",
              marginBottom: 14,
              fontSize: 34,
            }}
          >
            🔐
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 950,
              color: textC,
              marginBottom: 6,
            }}
          >
            {L("fAInance è bloccata")}
          </div>
          <div
            style={{
              fontSize: 13,
              color: subC,
              lineHeight: 1.45,
              marginBottom: 18,
            }}
          >
            {L("Sblocca l’app per visualizzare i tuoi dati finanziari.")}
          </div>
          {biometricLockMessage && (
            <div
              style={{
                background: dark ? "#342424" : "#fff0f0",
                border: "1px solid " + (dark ? "#5a3333" : "#f3b6b6"),
                color: dark ? "#ffd0d0" : "#8a2d2d",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 12,
                lineHeight: 1.35,
                marginBottom: 14,
              }}
            >
              {L(biometricLockMessage)}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {optionBtn("biometric", "Biometria")}
            {optionBtn("password", "Password")}
            {configuredPin && optionBtn("pin", "PIN")}
          </div>
          {method === "pin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={unlockPin}
                onChange={function (e) {
                  var next = String(e.currentTarget.value || "")
                    .replace(/\D/g, "")
                    .slice(0, 4);
                  unlockPinRef.current = next;
                  setUnlockPin(next);
                  if (biometricLockMessage) setBiometricLockMessage("");
                }}
                onKeyDown={function (e) {
                  if (e.key === "Enter") submitPin();
                }}
                inputMode="numeric"
                type="text"
                maxLength={4}
                autoComplete="off"
                placeholder={L("Inserisci PIN")}
                style={{
                  width: "100%",
                  borderRadius: btnRadius,
                  border: "1px solid " + borderC,
                  padding: "13px 14px",
                  fontSize: 20,
                  textAlign: "center",
                  letterSpacing: 8,
                  background: dark ? "#252535" : "#fff",
                  color: textC,
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={submitPin}
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                  color: "#fff",
                  border: "none",
                  borderRadius: btnRadius,
                  padding: "13px 16px",
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 8px 22px rgba(127,119,221,.28)",
                }}
              >
                {L("Sblocca con PIN")}
              </button>
              <button
                type="button"
                onClick={function () {
                  chooseUnlockMethod("biometric");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: confirmButtonColor,
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {L("PIN dimenticato? Usa un altro metodo")}
              </button>
            </div>
          )}
          {method === "password" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                value={unlockPassword}
                onChange={function (e) {
                  setUnlockPassword(e.target.value);
                }}
                onKeyDown={function (e) {
                  if (e.key === "Enter") submitPassword();
                }}
                type="password"
                autoComplete="current-password"
                placeholder={L("Password account")}
                style={{
                  width: "100%",
                  borderRadius: btnRadius,
                  border: "1px solid " + borderC,
                  padding: "13px 14px",
                  fontSize: 15,
                  background: dark ? "#252535" : "#fff",
                  color: textC,
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={submitPassword}
                disabled={biometricChecking}
                style={{
                  width: "100%",
                  background:
                    "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                  color: "#fff",
                  border: "none",
                  borderRadius: btnRadius,
                  padding: "13px 16px",
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: biometricChecking ? "not-allowed" : "pointer",
                  opacity: biometricChecking ? 0.7 : 1,
                  boxShadow: "0 8px 22px rgba(127,119,221,.28)",
                }}
              >
                {biometricChecking
                  ? L("Controllo in corso...")
                  : L("Sblocca con password")}
              </button>
            </div>
          )}
          {method !== "pin" && method !== "password" && (
            <button
              onClick={function () {
                unlockBiometricApp(
                  "Sblocca fAInance per visualizzare i tuoi dati finanziari"
                );
              }}
              disabled={biometricChecking}
              style={{
                width: "100%",
                background:
                  "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                color: "#fff",
                border: "none",
                borderRadius: btnRadius,
                padding: "13px 16px",
                fontSize: 15,
                fontWeight: 900,
                cursor: biometricChecking ? "not-allowed" : "pointer",
                opacity: biometricChecking ? 0.7 : 1,
                boxShadow: "0 8px 22px rgba(127,119,221,.28)",
              }}
            >
              {biometricChecking
                ? L("Controllo in corso...")
                : L("Sblocca con biometria")}
            </button>
          )}
          <div
            style={{
              fontSize: 11,
              color: subC,
              marginTop: 12,
              lineHeight: 1.35,
            }}
          >
            {L(
              "Se non ricordi il PIN, sblocca con biometria o password account e poi imposta un nuovo PIN in Sicurezza."
            )}
          </div>
        </div>
      </div>
    );
  }

  useEffect(
    function () {
      var alive = true;
      var cleanupPush = function () {};
      if (!userId) return function () {};

      syncNotificationProfile(String(userId), String(lang || "en")).catch(function (error) {
        try { console.warn("Notification profile sync failed", error); } catch (_logProfile) {}
      });

      startNativePushNotifications({
        uid: String(userId),
        language: String(lang || "en"),
        onAction: function (data) {
          if (!alive || !data) return;
          if (data.projectId) setShareSelectedProjectId(String(data.projectId));
          if (data.type === "share_invite" || data.actionType === "open_share_invite") {
            setTab("share");
            setShareProjectTab("partecipanti");
            setMobileMenu(false);
            loadShareCollaboration();
            return;
          }
          if (data.type === "share_invite_accepted" || data.actionType === "open_share_project") {
            setTab("share");
            setShareProjectTab("riassunto");
            setMobileMenu(false);
            loadShareCollaboration();
          }
        },
      }).then(function (cleanup) {
        if (!alive) {
          try { cleanup(); } catch (_lateCleanup) {}
          return;
        }
        cleanupPush = cleanup;
      }).catch(function (error) {
        try { console.warn("Push notifications unavailable", error); } catch (_logPush) {}
      });

      return function () {
        alive = false;
        try { cleanupPush(); } catch (_cleanupPush) {}
      };
    },
    [userId, lang]
  );

  var ctxValue = {
    // ── Già presenti ──────────────────────────────────────────────────────
    t,
    lang,
    cats,
    setCats,
    methods,
    setMethods,
    methodGroups,
    setMethodGroups,
    translateUiRuntimeText,
    monthShortName,
    monthFullName,
    expenseGroups,
    setExpenseGroups,
    incomeGroups,
    setIncomeGroups,
    incomeTypes,
    customIncomeTypes,
    setCustomIncomeTypes,
    incomeTypeOverrides,
    setIncomeTypeOverrides,
    recurring,
    setRecurring,
    goals,
    setGoals,
    alerts,
    setAlerts,
    expenses,
    setExpenses,
    incomes,
    setIncomes,
    sym,
    fmt,
    dark,
    dateFmt,
    curMonthKey,
    addExpenses,
    addIncomes,
    confirmRecurring,
    catOrder,
    setCatOrder,
    methodOrder,
    setMethodOrder,
    catSortMode,
    setCatSortMode,
    methodSortMode,
    setMethodSortMode,
    budgetPlan,
    setBudgetPlan,
    btnRadius,
    expenseColor,
    incomeColor,
    isMobile,
    patrimonioAreas,
    setPatrimonioAreas,
    patrimonioEntries,
    setPatrimonioEntries,
    patrimonioValues,
    setPatrimonioValues,
    patrimonioMode,
    setPatrimonioMode,
    patrimonioHistory,
    setPatrimonioHistory,
    patrimonioNotes,
    setPatrimonioNotes,
    historyFutureMode,
    setHistoryFutureMode,
    historySortDate,
    setHistorySortDate,
    historySortDirection,
    setHistorySortDirection,
    historySortSecondary,
    setHistorySortSecondary,
    historySortSecondaryDirection,
    setHistorySortSecondaryDirection,
    appuntiDocuments,
    setAppuntiDocuments,
    appuntiNotes,
    setAppuntiNotes,
    bankCoords,
    setBankCoords,
    creditCards,
    setCreditCards,
    notifPrefs,
    setNotifPrefs,
    customNotifs,
    setCustomNotifs,
    aiDismissed,
    setAiDismissed,
    aiChat,
    setAiChat,
    aiDataAccess,
    setAiDataAccess,
    aiFloatingEnabled,
    setAiFloatingEnabled,
    aiExternalConsent,
    setAiExternalConsent,
    aiExternalConsentAt,
    secondaryCurrency,
    secRate,
    fmtSec,
    secSym,
    secRateLoading,
    currency,
    showSecInHistory,
    setShowSecInHistory,
    showSecInStats,
    setShowSecInStats,
    showSecInBudget,
    setShowSecInBudget,
    showSecInPatrimonio,
    setShowSecInPatrimonio,

    currentPlan,
    setCurrentPlan,
    manualFullGrant,
    planUsage,
    setPlanUsage,
    planLimits,
    canUsePlanFeature,
    consumePlanFeature,
    handleRewardedFeature,
    canAddPlanItem,
    planRemaining,
    upgradeMessage,
    remainingMessage,
    singleMovementSuccessToast,
    bulkMovementSuccessToast,
    limitedFeatureSuccessToast,
    planFeatureGateState,
    singleMovementGateState,
    unlockRewardedMovement,
    manualMovementUsage,
    bulkMovementRowLimit,
    bulkMovementCooldownMonths,
    bulkMovementLocked,
    bulkMovementCooldownText,
    PLAN_IDS,
    PLAN_LABELS,
    PLAN_PRICES,
    PLAN_LIMITS,
    planLabel,
    planLimitLabel,
    // ── Tema / stile (usati dai pannelli) ─────────────────────────────────
    textC,
    subC,
    borderC,
    cardBg,
    inp,
    sb,
    bgColor,
    // ── Navigazione e stato UI ─────────────────────────────────────────────
    tab,
    setTab,
    settingsPage,
    setSettingsPage,
    speseSubTab,
    setSpeseSubTab,
    addType,
    setAddType,
    addSubTab,
    setAddSubTab,
    historyTab,
    setHistoryTab,
    editingItem,
    setEditingItem,
    mobileMenu,
    setMobileMenu,
    toast: FAINANCE_TOAST_CURRENT,
    setToast,
    alertPopup,
    setAlertPopup,
    markAlertsSeen,
    // ── Statistiche ────────────────────────────────────────────────────────
    statsView,
    setStatsView,
    curYear,
    yearExp,
    yearInc,
    monthlyTotals,
    // ── Filtri storico ─────────────────────────────────────────────────────
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filterYear,
    setFilterYear,
    filterMonth,
    setFilterMonth,
    filterMonths,
    setFilterMonths,
    filterCat,
    setFilterCat,
    filterCats,
    setFilterCats,
    filterCatExclude,
    setFilterCatExclude,
    filterMethods,
    setFilterMethods,
    filterAreaPersonal,
    setFilterAreaPersonal,
    filterAreaShare,
    setFilterAreaShare,
    filterGroup,
    setFilterGroup,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filterAmtMin,
    setFilterAmtMin,
    filterAmtMax,
    setFilterAmtMax,
    filteredExpenses,
    filteredIncomes,
    // ── Share ──────────────────────────────────────────────────────────────
    shareProjects,
    setShareProjects,
    shareSelectedProjectId,
    setShareSelectedProjectId,
    shareProjectTab,
    setShareProjectTab,
    shareReceivedInvites,
    shareInviteLoading,
    showShareInHistory,
    setShowShareInHistory,
    debtCredits,
    setDebtCredits,
    shoppingCards,
    setShoppingCards,
    shoppingItems,
    setShoppingItems,
    shoppingAreas,
    setShoppingAreas,
    shoppingAreaIcons,
    setShoppingAreaIcons,
    shoppingBoughtColor,
    setShoppingBoughtColor,
    shoppingUnits,
    setShoppingUnits,
    shoppingDefaultUnit,
    setShoppingDefaultUnit,
    shoppingLists,
    setShoppingLists,
    activeShoppingListId,
    setActiveShoppingListId,
    shoppingProductSort,
    setShoppingProductSort,
    showDebtCreditsInPatrimonio,
    setShowDebtCreditsInPatrimonio,
    showDebtCreditsInExpenses,
    setShowDebtCreditsInExpenses,
    shoppingDefaultArea,
    setShoppingDefaultArea,
    shareReceiptUploads,
    setShareReceiptUploads,
    confirmButtonColor,
    setConfirmButtonColor,
    secondaryButtonColor,
    setSecondaryButtonColor,
    nativeBannerSuppressed,
    setNativeBannerSuppressed,
    // ── Firestore / auth ────────────────────────────────────────────────────
    firestoreReady,
    isOffline,
    userKey,
    userId,
    currentUser,
    // ── Funzioni e ref condivisi usati dai pannelli estratti ────────────────
    historySearchDraftRef,
    normalizeEmail,
    loadShareCollaboration,
    acceptShareInvite,
    declineShareInvite,
    createShareInvite,
    createShareProject,
    updateShareProject,
    requestShareProjectDeletion,
    deleteShareProject,
    // ── Valori calcolati ────────────────────────────────────────────────────
    pendingCount,
    alertTriggered,
    getCat,
    getMethod,
    getIT,
    curMonthExp,
    curMonthInc,
    last12Balance,
    // ── AI ─────────────────────────────────────────────────────────────────
    aiTab,
    setAiTab,
    aiLoading,
    setAiLoading,
    aiAdviceFilter,
    setAiAdviceFilter,
    // ── Voice ──────────────────────────────────────────────────────────────
    voiceModal,
    setVoiceModal,
    voiceListening,
    setVoiceListening,
    voiceText,
    setVoiceText,
    voiceError,
    setVoiceError,
    voiceConfirm,
    setVoiceConfirm,
    voiceSaving,
    setVoiceSaving,
    voiceParsed,
    setVoiceParsed,
    openVoiceModal,
    // ── Settings specifici ─────────────────────────────────────────────────
    defaultExpenseCat,
    setDefaultExpenseCat,
    defaultExpenseMethod,
    setDefaultExpenseMethod,
    defaultExpenseArea,
    setDefaultExpenseArea,
    defaultIncomeType,
    setDefaultIncomeType,
    defaultIncomeArea,
    setDefaultIncomeArea,
    defaultMethodArea,
    setDefaultMethodArea,
    incomeTypeOrder,
    setIncomeTypeOrder,
    deleteConfirmId,
    setDeleteConfirmId,
    mergeFrom,
    setMergeFrom,
    mergeTo,
    setMergeTo,
    homeBalanceView,
    setHomeBalanceView,
    homeWorklets,
    setHomeWorklets,
    showAppSummaryHeader,
    setShowAppSummaryHeader,
    firstDayOfWeek,
    setFirstDayOfWeek,
    mobileNavOrder,
    setMobileNavOrder,
    mobileNavIconCount,
    setMobileNavIconCount,
    mobileMenuOrder,
    setMobileMenuOrder,
    setDateFmt,
    // ── AI floating ────────────────────────────────────────────────────────
    aiFloatingPos,
    setAiFloatingPos,
    aiFloatingDrag,
    setAiFloatingDrag,
    // ── Widget Android ─────────────────────────────────────────────────────
    widgetBgColor,
    setWidgetBgColor,
    widgetBgAlpha,
    setWidgetBgAlpha,
    widgetExpenseColor,
    setWidgetExpenseColor,
    widgetIncomeColor,
    setWidgetIncomeColor,
    widgetTitle,
    setWidgetTitle,
    widgetSubtitle,
    setWidgetSubtitle,
    widgetExpenseLabel,
    setWidgetExpenseLabel,
    widgetIncomeLabel,
    setWidgetIncomeLabel,
    widgetShowHeader,
    setWidgetShowHeader,
    widgetButtonStyle,
    setWidgetButtonStyle,
    widgetVoiceEnabled,
    setWidgetVoiceEnabled,
    widget2Enabled,
    setWidget2Enabled,
    widget2Type,
    setWidget2Type,
    widget2TitleColor,
    setWidget2TitleColor,
    widget2BodyColor,
    setWidget2BodyColor,
    widget2AccentColor,
    setWidget2AccentColor,
    widget2BgAlpha,
    setWidget2BgAlpha,
    widget2TextSize,
    setWidget2TextSize,
    widget2MaxChars,
    setWidget2MaxChars,
    widget2AutoUpdate,
    setWidget2AutoUpdate,
    widget2SelectedNoteId,
    setWidget2SelectedNoteId,
    widget2SelectedBankId,
    setWidget2SelectedBankId,
    widget3Enabled,
    setWidget3Enabled,
    widget3TextColor,
    setWidget3TextColor,
    widget3AccentColor,
    setWidget3AccentColor,
    widget3PercentColor,
    setWidget3PercentColor,
    widget3BgAlpha,
    setWidget3BgAlpha,
    widget3ShowPercent,
    setWidget3ShowPercent,
    widget3ShowAmounts,
    setWidget3ShowAmounts,
    widget3AutoUpdate,
    setWidget3AutoUpdate,
    widgetShareSelectedProjectId,
    setWidgetShareSelectedProjectId,
    widgetShareBgColor,
    setWidgetShareBgColor,
    widgetShareBgAlpha,
    setWidgetShareBgAlpha,
    widgetShareAccentColor,
    setWidgetShareAccentColor,
    widgetShareActivityColor,
    setWidgetShareActivityColor,
    widgetShareTitleColor,
    setWidgetShareTitleColor,
    widgetShareBodyColor,
    setWidgetShareBodyColor,
    widgetShareAutoUpdate,
    setWidgetShareAutoUpdate,
    widget3SelectedGoalId,
    setWidget3SelectedGoalId,
    bgTheme,
    setBgTheme,
    btnStyle,
    setBtnStyle,
    // ── Misc ────────────────────────────────────────────────────────────────
    shownAlertIds,
    setShownAlertIds,
    settingsValuesTab,
    setSettingsValuesTab,
    // Phase 16-20: bridge dei pannelli estratti. Solo riferimenti gia esistenti, nessuna nuova logica.
    AI_CONSENT_TEXT_VERSION,
    DEFAULT_SHOPPING_AREAS,
    DEFAULT_SHOPPING_UNITS,
    FAINANCE_CURRENT_VERSION,
    FAINANCE_CURRENT_VERSION_CODE,
    FAINANCE_PLAY_STORE_MARKET_URL,
    FAINANCE_PLAY_STORE_WEB_URL,
    PrivacyPolicyContent,
    TermsAndConditionsContent,
    accountDeletedRecords,
    allNavDefs,
    appUpdateAppleId,
    appUpdateCurrentInfo,
    appUpdateManualStatus,
    appUpdatePlatform,
    appUpdatePreferredStore,
    biometricChecking,
    biometricLockEnabled,
    biometricLockMessage,
    biometricLockTimeout,
    blockSetting,
    buildMobileMenuItems,
    canonicalShoppingUnitName,
    checkAppUpdatePopup,
    requestCurrentAccountDeletion,
    cancelCurrentAccountDeletion,
    featureExtraKey,
    featureLimits,
    featureUsageKey,
    findRegisteredUserForShare,
    getBottomNavIds,
    getPlanLimit,
    guardedSetter,
    handleBiometricToggle,
    initialSetupStatus,
    installedAppInfo,
    isNativeIOSApp,
    isWidgetAllowed,
    localLockMethod,
    localLockPin,
    metaEventsConsent,
    mobileAllNavDefaultOrder,
    mobileAllNavOrder,
    moveOrder,
    normalizeOrder,
    normalizePhoneForLookup,
    now,
    onLogout,
    onProfileUpdate,
    openFainanceStoreUrl,
    openPlanInfo,
    planBillingPeriod,
    planCount,
    planInc,
    planPurchaseLoading,
    platformStoreBillingName,
    purchasePlan,
    restorePurchases,
    rewardedFeatureGateState,
    saveWidgetSettingsToNative,
    securityPinDraft,
    securityPinDraftRef,
    setAccountDeletedRecordsRaw,
    setAppUpdateManualStatus,
    setBiometricLockMessage,
    setBiometricLockTimeout,
    setCurrency,
    setExpenseCatsFromSettings,
    setExpenseColor,
    setIncomeColor,
    setInitialSetupStatus,
    setInstalledAppInfo,
    setLang,
    setLocalLockMethod,
    setLocalLockPin,
    setMetaEventsConsent,
    setMobileAllNavOrder,
    setPlanBillingPeriod,
    setSecondaryCurrency,
    setSecurityPinDraft,
    setShoppingAreaColors,
    setShoppingDeletedRecordsRaw,
    setSupportContactFormOpen,
    setWidget2SelectedCreditCardId,
    setWidgetDebtCreditsAutoUpdate,
    setWidgetDebtCreditsBgAlpha,
    setWidgetDebtCreditsIconColor,
    setWidgetDebtCreditsTextColor,
    setWidgetDebtCreditsTextSize,
    setWidgetDebtCreditsTitleColor,
    setWidgetFidelityAutoUpdate,
    setWidgetFidelityBgAlpha,
    setWidgetFidelityIconColor,
    setWidgetFidelityTextColor,
    setWidgetFidelityTextSize,
    setWidgetFidelityTitleColor,
    setWidgetShoppingListAutoUpdate,
    setWidgetShoppingListBgAlpha,
    setWidgetShoppingListIconColor,
    setWidgetShoppingListTextColor,
    setWidgetShoppingListTextSize,
    setWidgetShoppingListTitleColor,
    settingAllowed,
    settingLockedMessage,
    settingsSections,
    shoppingAreaColors,
    shoppingDeletedRecords,
    showRewardedAdForExtraMovement,
    successToastForFeature,
    supportContactFormOpen,
    unlockRewardedFeature,
    widget2SelectedCreditCardId,
    widgetDebtCreditsAutoUpdate,
    widgetDebtCreditsBgAlpha,
    widgetDebtCreditsIconColor,
    widgetDebtCreditsTextColor,
    widgetDebtCreditsTextSize,
    widgetDebtCreditsTitleColor,
    widgetFidelityAutoUpdate,
    widgetFidelityBgAlpha,
    widgetFidelityIconColor,
    widgetFidelityTextColor,
    widgetFidelityTextSize,
    widgetFidelityTitleColor,
    widgetLockedMessage,
    widgetPlanName,
    widgetSettingsPayload,
    widgetShoppingListAutoUpdate,
    widgetShoppingListBgAlpha,
    widgetShoppingListIconColor,
    widgetShoppingListTextColor,
    widgetShoppingListTextSize,
    widgetShoppingListTitleColor,
  };

  return (
    <AppCtx.Provider value={ctxValue}>
      <style>{"input:focus::placeholder,textarea:focus::placeholder{color:transparent!important;opacity:0!important;}"}</style>
      {firestoreReady && !appLocked && (
        <NotificationCenter
          userId={String(userId || "")}
          onProfile={function () {
            setTab("settings");
            setSettingsPage("profile");
            setMobileMenu(false);
          }}
          onOpen={function (notification) {
            if (notification.projectId)
              setShareSelectedProjectId(String(notification.projectId));
            if (notification.type === "share_invite" || notification.actionType === "open_share_invite") {
              setTab("share");
              setShareProjectTab("partecipanti");
              loadShareCollaboration();
            } else if (notification.type === "share_invite_accepted" || notification.actionType === "open_share_project") {
              setTab("share");
              setShareProjectTab("riassunto");
              loadShareCollaboration();
            }
          }}
        />
      )}
      {!firestoreReady ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: dark
              ? "#1a1a2e"
              : "linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            zIndex: 999,
          }}
        >
          <FAInanceLogo size={72} />
          <div style={{ fontSize: 13, color: dark ? "#aaa" : "#888" }}>
            Caricamento dati account...
          </div>
        </div>
      ) : appLocked ? (
        <BiometricLockScreen />
      ) : isMobile ? (
        <div
          style={{
            fontFamily: "system-ui,sans-serif",
            maxWidth: 430,
            margin: "0 auto",
            height: "100dvh",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            background: bgColor,
            overflow: "hidden",
            paddingTop: "max(env(safe-area-inset-top, 0px), 24px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
            boxSizing: "border-box",
            ...({
              "--fainance-primary": confirmButtonColor,
              "--fainance-secondary": secondaryButtonColor,
            } as any),
          }}
        >
          {showAppSummaryHeader &&
            !(tab === "consulenteAI" && aiTab === "chat") && (
              <div
                style={{
                  background: headerBg,
                  borderBottom: "1px solid " + borderC,
                  padding: "10px 16px 8px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: subC,
                    marginBottom: 4,
                  }}
                >
                  fAInance
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingRight: firestoreReady && !appLocked ? 82 : 0,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: subC }}>
                      {translateUiRuntimeText("Uscite")}
                    </div>
                    <div
                      style={{
                        fontSize: 19,
                        fontWeight: 600,
                        color: expenseColor,
                      }}
                    >
                      {fmt(curMonthExp)}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: subC }}>
                      {translateUiRuntimeText("Saldo")}
                    </div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 600,
                        color: BALANCE_COLOR,
                      }}
                    >
                      {fmt(curMonthInc - curMonthExp)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: subC }}>
                      {translateUiRuntimeText("Entrate")}
                    </div>
                    <div
                      style={{
                        fontSize: 19,
                        fontWeight: 600,
                        color: incomeColor,
                      }}
                    >
                      {fmt(curMonthInc)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          <TopAdBox />
          <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
            <SectionErrorBoundary
              resetKey={tab + "|" + (settingsPage || "")}
              dark={dark}
              tr={translateUiRuntimeText}
              onHome={function () {
                setTab("home");
                setSettingsPage(null);
                setMobileMenu(false);
              }}
            >
              {panelContent()}
            </SectionErrorBoundary>
          </div>
          {aiFloatingEnabled && tab !== "settings" && <FloatingAIButton />}
          {voiceModal && <VoiceEntryModal />}
          <div
            style={{
              background: headerBg,
              borderTop: "1px solid " + borderC,
              display: "flex",
              flexShrink: 0,
            }}
          >
            {mobileMain.map(function (item) {
              return (
                <button
                  key={item.id}
                  onClick={function () {
                    if (item.id === "voice") {
                      openVoiceModal();
                      setMobileMenu(false);
                    } else if (item.id === "more") {
                      setTab("more");
                      setMobileMenu(function (s) {
                        return !s;
                      });
                      setSettingsPage(null);
                    } else {
                      setTab(item.id);
                      setMobileMenu(false);
                      setSettingsPage(null);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "9px 2px",
                    border: "none",
                    background: "transparent",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    cursor: "pointer",
                    color:
                      tab === item.id ||
                      (item.id === "more" && tab === "more") ||
                      (item.id === "voice" && voiceModal)
                        ? textC
                        : subC,
                    borderTop:
                      tab === item.id ||
                      (item.id === "more" && tab === "more") ||
                      (item.id === "voice" && voiceModal)
                        ? "2px solid " + (dark ? "#eee" : "#333")
                        : "2px solid transparent",
                  }}
                >
                  <span style={{ fontSize: 17 }}>{item.icon}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight:
                        tab === item.id ||
                        (item.id === "more" && tab === "more") ||
                        (item.id === "voice" && voiceModal)
                          ? 500
                          : 400,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          {mobileMenu && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                zIndex: 9998,
                display: "flex",
                alignItems: "flex-end",
                paddingBottom: 0,
                boxSizing: "border-box",
              }}
              onClick={function () {
                setMobileMenu(false);
              }}
            >
              <div
                style={{
                  background: cardBg,
                  borderRadius: "20px 20px 0 0",
                  width: "100%",
                  padding:
                    "10px 16px calc(104px + env(safe-area-inset-bottom, 0px))",
                  maxHeight: "72vh",
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  boxShadow: dark ? "none" : "0 -8px 30px rgba(0,0,0,0.18)",
                }}
                onClick={function (e) {
                  e.stopPropagation();
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "0 2px 8px",
                    position: "sticky",
                    top: 0,
                    background: cardBg,
                    zIndex: 1,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 900, color: textC }}>
                    {translateUiRuntimeText("Altro")}
                  </div>
                  <button
                    onClick={function () {
                      setMobileMenu(false);
                    }}
                    aria-label="Chiudi menu"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      border: "1px solid " + borderC,
                      background: dark ? "#252535" : "#fff",
                      color: "#F87171",
                      fontSize: 22,
                      fontWeight: 900,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
                {buildMobileMenuItems().map(function (item) {
                  return (
                    <button
                      key={item.id}
                      onClick={function () {
                        setTab(item.id);
                        setSettingsPage(null);
                        setMobileMenu(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "12px 8px",
                        border: "none",
                        background: "transparent",
                        borderBottom: "1px solid " + borderC,
                        fontSize: 15,
                        cursor: "pointer",
                        color: textC,
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{item.icon}</span>
                      {item.label}
                      {item.badge > 0 && (
                        <span
                          style={{
                            marginLeft: "auto",
                            background: expenseColor,
                            color: "#fff",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {isOffline && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9998,
                background: "#E24B4A",
                color: "#fff",
                textAlign: "center",
                fontSize: 13,
                fontWeight: 700,
                padding: "calc(env(safe-area-inset-top, 0px) + 6px) 12px 6px",
              }}
            >
              {L(
                "Nessuna connessione. I dati verranno sincronizzati al ripristino della rete."
              )}
            </div>
          )}
          {alertPopup && alertPopup.length > 0 && (
            <AlertPopup
              newAlerts={alertPopup}
              onClose={function (list) {
                markAlertsSeen(list || alertPopup);
              }}
            />
          )}
          {editingItem && (
            <EditModal
              item={editingItem.item}
              isExp={editingItem.isExp}
              onSave={function (updated) {
                if (editingItem.isExp) {
                  setExpenses(
                    expenses.map(function (e) {
                      return e.id === updated.id ? updated : e;
                    })
                  );
                  setToast("Spesa aggiornata");
                } else {
                  setIncomes(
                    incomes.map(function (i) {
                      return i.id === updated.id ? updated : i;
                    })
                  );
                  setToast("Entrata aggiornata");
                }
                setEditingItem(null);
              }}
              onClose={function () {
                setEditingItem(null);
              }}
            />
          )}
        </div>
      ) : (
        <div
          style={{
            fontFamily: "system-ui,sans-serif",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            background: bgColor,
            overflow: "hidden",
            ...({
              "--fainance-primary": confirmButtonColor,
              "--fainance-secondary": secondaryButtonColor,
            } as any),
          }}
        >
          {showAppSummaryHeader &&
            !(tab === "consulenteAI" && aiTab === "chat") && (
              <div
                style={{
                  background: headerBg,
                  borderBottom: "1px solid " + borderC,
                  padding: "10px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 15, color: textC }}>
                  fAInance
                </div>
                <div style={{ display: "flex", gap: 24 }}>
                  {[
                    [
                      translateUiRuntimeText("Uscite"),
                      expenseColor,
                      fmt(curMonthExp),
                    ],
                    [
                      translateUiRuntimeText("Saldo"),
                      BALANCE_COLOR,
                      fmt(curMonthInc - curMonthExp),
                    ],
                    [
                      translateUiRuntimeText("Entrate"),
                      incomeColor,
                      fmt(curMonthInc),
                    ],
                  ].map(function (item) {
                    return (
                      <div key={item[0]} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: subC }}>
                          {item[0]}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: item[1],
                          }}
                        >
                          {item[2]}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: subC }}>
                    {curYear}: {fmt(yearExp)} / {fmt(yearInc)}
                  </span>
                  <Btn
                    onClick={function () {
                      exportToCSV(expenses, incomes, cats, methods, dateFmt);
                    }}
                    bg={incomeColor}
                    style={{ padding: "5px 10px", fontSize: 11 }}
                  >
                    CSV
                  </Btn>
                  <Btn
                    onClick={function () {
                      exportToXLSX(expenses, incomes, cats, methods, dateFmt);
                    }}
                    bg="#217346"
                    style={{ padding: "5px 10px", fontSize: 11 }}
                  >
                    Excel
                  </Btn>
                </div>
              </div>
            )}
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div
              style={{
                width: 220,
                background: sideBg,
                borderRight: "1px solid " + borderC,
                display: "flex",
                flexDirection: "column",
                padding: "16px 0",
                flexShrink: 0,
                overflowY: "auto",
              }}
            >
              {navItems.map(function (item) {
                return (
                  <button
                    key={item.id}
                    onClick={function () {
                      if (item.id === "voice") {
                        openVoiceModal();
                      } else {
                        setTab(item.id);
                        if (item.id !== "settings") setSettingsPage(null);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 20px",
                      border: "none",
                      background:
                        tab === item.id || (item.id === "voice" && voiceModal)
                          ? dark
                            ? "#2a2a3e"
                            : "#f0f0f0"
                          : "transparent",
                      color:
                        tab === item.id || (item.id === "voice" && voiceModal)
                          ? textC
                          : subC,
                      fontSize: 14,
                      cursor: "pointer",
                      fontWeight:
                        tab === item.id || (item.id === "voice" && voiceModal)
                          ? 500
                          : 400,
                      textAlign: "left",
                      position: "relative",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    {item.label}
                    {item.badge > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          right: 14,
                          background: expenseColor,
                          color: "#fff",
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 500,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              <div style={{ maxWidth: 960, margin: "0 auto" }}>
                <SectionErrorBoundary
                  resetKey={tab + "|" + (settingsPage || "")}
                  dark={dark}
                  tr={translateUiRuntimeText}
                  onHome={function () {
                    setTab("home");
                    setSettingsPage(null);
                    setMobileMenu(false);
                  }}
                >
                  {panelContent()}
                </SectionErrorBoundary>
              </div>
            </div>
          </div>
          {aiFloatingEnabled && tab !== "settings" && (
            <FloatingAIButton desktop />
          )}
          {voiceModal && <VoiceEntryModal />}
          {alertPopup && alertPopup.length > 0 && (
            <AlertPopup
              newAlerts={alertPopup}
              onClose={function (list) {
                markAlertsSeen(list || alertPopup);
              }}
            />
          )}
          {editingItem && (
            <EditModal
              item={editingItem.item}
              isExp={editingItem.isExp}
              onSave={function (updated) {
                if (editingItem.isExp) {
                  setExpenses(
                    expenses.map(function (e) {
                      return e.id === updated.id ? updated : e;
                    })
                  );
                  setToast("Spesa aggiornata");
                } else {
                  setIncomes(
                    incomes.map(function (i) {
                      return i.id === updated.id ? updated : i;
                    })
                  );
                  setToast("Entrata aggiornata");
                }
                setEditingItem(null);
              }}
              onClose={function () {
                setEditingItem(null);
              }}
            />
          )}
        </div>
      )}
      {shareDeletionPrompt && <ShareDeletionDecisionModal />}
      <GlobalToastHost />
      <GlobalNumericInputAssist />
      {onboardingGuideOpen &&
        !appLocked &&
        termsAccepted &&
        privacyAccepted &&
        OnboardingGuideModal()}
      {initialSetupOpen &&
        !appLocked &&
        termsAccepted &&
        privacyAccepted &&
        InitialSetupModal()}
      {appUpdatePopup && <AppUpdateModal />}
      {showPremiumTrialPrompt &&
        !appLocked &&
        termsAccepted &&
        privacyAccepted &&
        currentPlan === "free" && <PremiumTrialPromptModal />}
      {!appLocked &&
        !legalAcceptanceCommitted &&
        (!termsAccepted || !privacyAccepted) && <TermsAcceptanceModal />}
    </AppCtx.Provider>
  );
}

export default AppWithLogin;
applyAppTranslationPatches();
