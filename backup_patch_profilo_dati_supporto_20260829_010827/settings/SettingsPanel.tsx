import { useState, useEffect, useRef } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  useApp,
  fbAuth,
  fbDb,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  useStorage,
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
  COLORS,
  INCOME_TYPES,
  DATE_FORMATS,
  PLAN_IDS,
  PLAN_LIMITS,
  PLAN_PRICES,
  planLabel,
  todayStr,
  fmtDate,
  androidDownload,
  exportToCSV,
  exportToXLSX,
  appBanner,
} from "../core";
import {
  AIGrilloIcon,
  AppColorSelector,
  AreasEditor,
  Btn,
  EmojiPicker,
  FAInanceLogo,
  FainanceIcon,
  ImportData,
  PatrimonioSettingsPanel,
  SettingsList,
  SortOrderPanel,
  SortableRows,
  Toggle,
} from "../widget";
import { StableCurrencyPicker } from "../ui/appInfrastructure";
import { numOr } from "../utils/appRuntime";
import { fainanceExpandAccountCloudDataV5 } from "../data/accountCloudCodec";
import { translateFainanceText } from "../traduzioni";
import { ContactForm, ProfileCard } from "../account/AccountScreens";
import {
  fainanceEncryptSensitiveData,
  fainanceDecryptSensitiveData,
} from "../security/sensitiveStorage";
import { AccountSecurityCenter } from "../security/AccountSecurityCenter";
import { writeTechnicalLog } from "../observability/technicalLogs";
import {
  CUSTOM_ICON_MAX_ITEMS,
  customIconValue,
  deleteCustomIconRecord,
  pickNativeCustomIconFile,
  uploadCustomIcon,
  useCustomIconLibrary,
} from "../icons/customIconLibrary";

const FainanceFileNativeBackup: any = registerPlugin("FainanceFile");

function StableNestedPanelHost({ render }: { render: () => any }) {
  return render();
}

export function SettingsPanel() {
  var _c: any = useApp();
  var {
    mobileNavOrder,
    mobileMenuOrder,
    aiExternalConsent,
    aiExternalConsentAt,
    shoppingBoughtColor,
    shoppingProductSort,
    shareReceiptUploads,
    initialSetupStatus,
    metaEventsConsent,
    accountDeletedRecords,
    customIncomeTypes,
    catSortMode,
    methodSortMode,
    defaultMethodArea,
    patrimonioMode,
    historySortSecondary,
    historySortSecondaryDirection,
    statsView,
    homeWorklets,
    AI_CONSENT_TEXT_VERSION,
    DEFAULT_SHOPPING_AREAS,
    DEFAULT_SHOPPING_UNITS,
    FAINANCE_CURRENT_VERSION,
    FAINANCE_CURRENT_VERSION_CODE,
    FAINANCE_PLAY_STORE_MARKET_URL,
    FAINANCE_PLAY_STORE_WEB_URL,
    PrivacyPolicyContent,
    TermsAndConditionsContent,
    activeShoppingListId,
    aiDataAccess,
    aiFloatingEnabled,
    alerts,
    allNavDefs,
    appUpdateAppleId,
    appUpdateCurrentInfo,
    appUpdateManualStatus,
    appUpdatePlatform,
    appUpdatePreferredStore,
    appuntiDocuments,
    appuntiNotes,
    bankCoords,
    bgTheme,
    biometricChecking,
    biometricLockEnabled,
    biometricLockMessage,
    biometricLockTimeout,
    blockSetting,
    borderC,
    btnRadius,
    btnStyle,
    budgetPlan,
    canonicalShoppingUnitName,
    cardBg,
    catOrder,
    cats,
    checkAppUpdatePopup,
    confirmButtonColor,
    creditCards,
    currency,
    currentPlan,
    currentUser,
    customNotifs,
    dark,
    dateFmt,
    debtCredits,
    defaultExpenseArea,
    defaultExpenseCat,
    defaultExpenseMethod,
    defaultIncomeArea,
    defaultIncomeType,
    requestCurrentAccountDeletion,
    cancelCurrentAccountDeletion,
    expenseColor,
    expenseGroups,
    expenses,
    firstDayOfWeek,
    fmt,
    getBottomNavIds,
    goals,
    guardedSetter,
    handleBiometricToggle,
    historyFutureMode,
    historySortDate,
    historySortDirection,
    homeBalanceView,
    incomeColor,
    incomeGroups,
    incomeTypeOrder,
    incomeTypeOverrides,
    incomeTypes,
    incomes,
    installedAppInfo,
    isMobile,
    isNativeIOSApp,
    isWidgetAllowed,
    lang,
    localLockMethod,
    localLockPin,
    mergeFrom,
    mergeTo,
    methodGroups,
    methodOrder,
    methods,
    mobileAllNavDefaultOrder,
    mobileAllNavOrder,
    mobileNavIconCount,
    moveOrder,
    normalizeOrder,
    notifPrefs,
    onLogout,
    onProfileUpdate,
    openFainanceStoreUrl,
    openPlanInfo,
    patrimonioAreas,
    patrimonioEntries,
    patrimonioHistory,
    patrimonioNotes,
    patrimonioValues,
    planBillingPeriod,
    planPurchaseLoading,
    platformStoreBillingName,
    purchasePlan,
    recurring,
    restorePurchases,
    saveWidgetSettingsToNative,
    secondaryButtonColor,
    secondaryCurrency,
    securityPinDraft,
    securityPinDraftRef,
    setAccountDeletedRecordsRaw,
    setActiveShoppingListId,
    setAiDataAccess,
    setAiExternalConsent,
    setAiFloatingEnabled,
    setAlerts,
    setAppUpdateManualStatus,
    setAppuntiDocuments,
    setAppuntiNotes,
    setBankCoords,
    setBgTheme,
    setBiometricLockMessage,
    setBiometricLockTimeout,
    setBtnStyle,
    setBudgetPlan,
    setCatOrder,
    setCatSortMode,
    setCats,
    setConfirmButtonColor,
    setCreditCards,
    setCurrency,
    setCustomIncomeTypes,
    setCustomNotifs,
    setDateFmt,
    setDebtCredits,
    setDefaultExpenseArea,
    setDefaultExpenseCat,
    setDefaultExpenseMethod,
    setDefaultIncomeArea,
    setDefaultIncomeType,
    setDefaultMethodArea,
    setExpenseCatsFromSettings,
    setExpenseColor,
    setExpenseGroups,
    setExpenses,
    setFilterCats,
    setFilterMethods,
    setFirstDayOfWeek,
    setGoals,
    setHistoryFutureMode,
    setHistorySortDate,
    setHistorySortDirection,
    setHistorySortSecondary,
    setHistorySortSecondaryDirection,
    setHomeBalanceView,
    setHomeWorklets,
    setIncomeColor,
    setIncomeGroups,
    setIncomeTypeOrder,
    setIncomeTypeOverrides,
    setIncomes,
    setInitialSetupStatus,
    setInstalledAppInfo,
    setLang,
    setLocalLockMethod,
    setLocalLockPin,
    setMergeFrom,
    setMergeTo,
    setMetaEventsConsent,
    setMethodGroups,
    setMethodOrder,
    setMethodSortMode,
    setMethods,
    setMobileAllNavOrder,
    setMobileMenuOrder,
    setMobileNavIconCount,
    setMobileNavOrder,
    setNotifPrefs,
    setPatrimonioAreas,
    setPatrimonioEntries,
    setPatrimonioHistory,
    setPatrimonioMode,
    setPatrimonioNotes,
    setPatrimonioValues,
    setPlanBillingPeriod,
    setRecurring,
    setSecondaryButtonColor,
    setSecondaryCurrency,
    setSecurityPinDraft,
    setSettingsPage,
    setSettingsValuesTab,
    setShareProjects,
    setShareReceiptUploads,
    setShoppingAreaColors,
    setShoppingAreaIcons,
    setShoppingAreas,
    setShoppingBoughtColor,
    setShoppingCards,
    setShoppingDefaultArea,
    setShoppingDefaultUnit,
    setShoppingDeletedRecordsRaw,
    setShoppingItems,
    setShoppingLists,
    setShoppingProductSort,
    setShoppingUnits,
    setShowAppSummaryHeader,
    setShowDebtCreditsInExpenses,
    setShowDebtCreditsInPatrimonio,
    setShowSecInBudget,
    setShowSecInHistory,
    setShowSecInPatrimonio,
    setShowSecInStats,
    setShowShareInHistory,
    setStatsView,
    setSupportContactFormOpen,
    setToast,
    setWidget2AccentColor,
    setWidget2AutoUpdate,
    setWidget2BgAlpha,
    setWidget2BodyColor,
    setWidget2MaxChars,
    setWidget2TextSize,
    setWidget2TitleColor,
    setWidget3AccentColor,
    setWidget3AutoUpdate,
    setWidget3BgAlpha,
    setWidget3PercentColor,
    setWidget3ShowAmounts,
    setWidget3ShowPercent,
    setWidget3TextColor,
    setWidgetBgAlpha,
    setWidgetBgColor,
    setWidgetButtonStyle,
    setWidgetDebtCreditsAutoUpdate,
    setWidgetDebtCreditsBgAlpha,
    setWidgetDebtCreditsIconColor,
    setWidgetDebtCreditsTextColor,
    setWidgetDebtCreditsTextSize,
    setWidgetDebtCreditsTitleColor,
    setWidgetExpenseColor,
    setWidgetExpenseLabel,
    setWidgetFidelityAutoUpdate,
    setWidgetFidelityBgAlpha,
    setWidgetFidelityIconColor,
    setWidgetFidelityTextColor,
    setWidgetFidelityTextSize,
    setWidgetFidelityTitleColor,
    setWidgetIncomeColor,
    setWidgetIncomeLabel,
    setWidgetShareAccentColor,
    setWidgetShareActivityColor,
    setWidgetShareAutoUpdate,
    setWidgetShareBgAlpha,
    setWidgetShareBgColor,
    setWidgetShareTitleColor,
    setWidgetShoppingListAutoUpdate,
    setWidgetShoppingListBgAlpha,
    setWidgetShoppingListIconColor,
    setWidgetShoppingListTextColor,
    setWidgetShoppingListTextSize,
    setWidgetShoppingListTitleColor,
    setWidgetShowHeader,
    setWidgetSubtitle,
    setWidgetTitle,
    setWidgetVoiceEnabled,
    settingAllowed,
    settingLockedMessage,
    settingsPage,
    settingsSections,
    settingsValuesTab,
    shareProjects,
    shareSelectedProjectId,
    shoppingAreaColors,
    shoppingAreaIcons,
    shoppingAreas,
    shoppingCards,
    shoppingDefaultArea,
    shoppingDefaultUnit,
    shoppingDeletedRecords,
    shoppingItems,
    shoppingLists,
    shoppingUnits,
    showAppSummaryHeader,
    showDebtCreditsInExpenses,
    showDebtCreditsInPatrimonio,
    showSecInBudget,
    showSecInHistory,
    showSecInPatrimonio,
    showSecInStats,
    showShareInHistory,
    subC,
    supportContactFormOpen,
    t,
    textC,
    translateUiRuntimeText,
    userId,
    userKey,
    widget2AccentColor,
    widget2AutoUpdate,
    widget2BgAlpha,
    widget2BodyColor,
    widget2MaxChars,
    widget2TextSize,
    widget2TitleColor,
    widget3AccentColor,
    widget3AutoUpdate,
    widget3BgAlpha,
    widget3PercentColor,
    widget3SelectedGoalId,
    widget3ShowAmounts,
    widget3ShowPercent,
    widget3TextColor,
    widgetBgAlpha,
    widgetBgColor,
    widgetButtonStyle,
    widgetDebtCreditsAutoUpdate,
    widgetDebtCreditsBgAlpha,
    widgetDebtCreditsIconColor,
    widgetDebtCreditsTextColor,
    widgetDebtCreditsTextSize,
    widgetDebtCreditsTitleColor,
    widgetExpenseColor,
    widgetExpenseLabel,
    widgetFidelityAutoUpdate,
    widgetFidelityBgAlpha,
    widgetFidelityIconColor,
    widgetFidelityTextColor,
    widgetFidelityTextSize,
    widgetFidelityTitleColor,
    widgetIncomeColor,
    widgetIncomeLabel,
    widgetLockedMessage,
    widgetPlanName,
    widgetSettingsPayload,
    widgetShareAccentColor,
    widgetShareActivityColor,
    widgetShareAutoUpdate,
    widgetShareBgAlpha,
    widgetShareBgColor,
    widgetShareBodyColor,
    widgetShareSelectedProjectId,
    widgetShareTitleColor,
    widgetShoppingListAutoUpdate,
    widgetShoppingListBgAlpha,
    widgetShoppingListIconColor,
    widgetShoppingListTextColor,
    widgetShoppingListTextSize,
    widgetShoppingListTitleColor,
    widgetShowHeader,
    widgetSubtitle,
    widgetTitle,
    widgetVoiceEnabled,
  }: any = _c;
  var [historyCurrencyPriority, setHistoryCurrencyPriority] = useStorage(
    userKey ? userKey("history_currency_priority_v1") : "history_currency_priority_v1",
    "paid"
  );

  var V = t;
  var settingsActiveCats = (cats || []).filter(function (c) {
    return !c.deleted && !c.archived;
  });
  var [dataImportOpen, setDataImportOpen] = useState(false);
  var [dataExportOpen, setDataExportOpen] = useState(false);
  var [dataDeleteOpen, setDataDeleteOpen] = useState(false);
  var [dataExportOption, setDataExportOption] = useState("backup");
  var [dataExportMenuOpen, setDataExportMenuOpen] = useState(false);
  var [dataDeleteSelection, setDataDeleteSelection] = useState([]);
  var [backupImportBusy, setBackupImportBusy] = useState(false);
  var [pendingBackupImport, setPendingBackupImport] = useState<any>(null);
  var [syncDiagnostic, setSyncDiagnostic] = useState<any>(null);
  var [syncDiagnosticLoading, setSyncDiagnosticLoading] = useState(false);
  var [syncDiagnosticError, setSyncDiagnosticError] = useState("");
  function diagnosticCount(value) {
    return Array.isArray(value)
      ? value.length
      : value && typeof value === "object"
      ? Object.keys(value).length
      : 0;
  }
  function diagnosticIso(value) {
    if (!value) return "—";
    try {
      if (value && typeof value.toDate === "function")
        return value.toDate().toISOString();
      if (value && typeof value.seconds === "number")
        return new Date(value.seconds * 1000).toISOString();
      var date = new Date(value);
      return isNaN(date.getTime()) ? String(value) : date.toISOString();
    } catch (e) {
      return String(value);
    }
  }
  async function loadSyncDiagnostic() {
    setSyncDiagnosticLoading(true);
    setSyncDiagnosticError("");
    try {
      var authUser: any = fbAuth.currentUser;
      var currentUid = String((authUser && authUser.uid) || userId || "");
      var currentEmail = String(
        (authUser && authUser.email) || (currentUser && currentUser.email) || ""
      )
        .trim()
        .toLowerCase();
      var projectId = String(
        (((fbDb as any) || {}).app &&
          ((fbDb as any).app.options || {}).projectId) ||
          "non disponibile"
      );
      var providers = ((authUser && authUser.providerData) || [])
        .map(function (x) {
          return String((x && x.providerId) || "");
        })
        .filter(Boolean);
      var localCounts: any = {
        expenses: diagnosticCount(expenses),
        incomes: diagnosticCount(incomes),
        cats: diagnosticCount(cats),
        methods: diagnosticCount(methods),
        recurring: diagnosticCount(recurring),
        goals: diagnosticCount(goals),
        alerts: diagnosticCount(alerts),
        shareProjects: diagnosticCount(shareProjects),
        shoppingItems: diagnosticCount(shoppingItems),
        shoppingLists: diagnosticCount(shoppingLists),
        shoppingCards: diagnosticCount(shoppingCards),
        debtCredits: diagnosticCount(debtCredits),
        appuntiDocuments: diagnosticCount(appuntiDocuments),
        appuntiNotes: diagnosticCount(appuntiNotes),
      };
      var currentCloud: any = {
        exists: false,
        uid: currentUid,
        counts: {},
        integrity: {},
        updatedAt: "—",
        schemaVersion: null,
        error: "",
      };
      if (currentUid) {
        try {
          var currentSnap: any = await getDoc(
            doc(fbDb, "userData", currentUid)
          );
          if (currentSnap.exists()) {
            var d: any = await fainanceExpandAccountCloudDataV5(
              currentSnap.data() || {}
            );
            currentCloud.exists = true;
            currentCloud.counts = {
              expenses: diagnosticCount(d.expenses),
              incomes: diagnosticCount(d.incomes),
              cats: diagnosticCount(d.cats),
              methods: diagnosticCount(d.methods),
              recurring: diagnosticCount(d.recurring),
              goals: diagnosticCount(d.goals),
              alerts: diagnosticCount(d.alerts),
              shareProjects: diagnosticCount(d.shareProjects),
              shoppingItems: diagnosticCount(d.shoppingItems),
              shoppingLists: diagnosticCount(d.shoppingLists),
              shoppingCards: diagnosticCount(d.shoppingCards),
              debtCredits: diagnosticCount(d.debtCredits),
              appuntiDocuments: diagnosticCount(d.appuntiDocuments),
              appuntiNotes: diagnosticCount(d.appuntiNotes),
            };
            currentCloud.integrity =
              d.dataIntegrityV1 && typeof d.dataIntegrityV1 === "object"
                ? d.dataIntegrityV1
                : {};
            currentCloud.updatedAt = diagnosticIso(
              d.updatedAt || d.lastUpdatedAt || d.cloudUpdatedAt || d.savedAt
            );
            currentCloud.schemaVersion =
              d.accountSyncSchemaVersion == null
                ? null
                : d.accountSyncSchemaVersion;
          }
        } catch (e: any) {
          currentCloud.error =
            String((e && e.code) || "") +
            " " +
            String((e && e.message) || e || "");
        }
      }
      var lookupUid = "";
      var lookupError = "";
      if (currentEmail) {
        try {
          var lookupSnap: any = await getDoc(
            doc(fbDb, "userLookup", "email:" + currentEmail.replace(/\//g, "_"))
          );
          if (lookupSnap.exists())
            lookupUid = String((lookupSnap.data() || {}).uid || "");
        } catch (e: any) {
          lookupError =
            String((e && e.code) || "") +
            " " +
            String((e && e.message) || e || "");
        }
      }
      var profileUids: string[] = [];
      var profilesError = "";
      if (currentEmail) {
        try {
          var profileSnap: any = await getDocs(
            query(
              collection(fbDb, "users"),
              where("email", "==", currentEmail),
              limit(10)
            )
          );
          profileSnap.forEach(function (x: any) {
            profileUids.push(String(x.id));
          });
        } catch (e: any) {
          profilesError =
            String((e && e.code) || "") +
            " " +
            String((e && e.message) || e || "");
        }
      }
      var candidateUids = Array.from(
        new Set([currentUid, lookupUid].concat(profileUids).filter(Boolean))
      );
      var candidateCloud: any[] = [];
      for (var i = 0; i < candidateUids.length; i++) {
        var candidateUid = String(candidateUids[i]);
        if (candidateUid === currentUid) {
          candidateCloud.push(currentCloud);
          continue;
        }
        var row: any = {
          uid: candidateUid,
          exists: false,
          counts: {},
          integrity: {},
          updatedAt: "—",
          schemaVersion: null,
          error: "",
        };
        try {
          var candidateSnap: any = await getDoc(
            doc(fbDb, "userData", candidateUid)
          );
          if (candidateSnap.exists()) {
            var cd: any = await fainanceExpandAccountCloudDataV5(
              candidateSnap.data() || {}
            );
            row.exists = true;
            row.counts = {
              expenses: diagnosticCount(cd.expenses),
              incomes: diagnosticCount(cd.incomes),
              cats: diagnosticCount(cd.cats),
              methods: diagnosticCount(cd.methods),
              recurring: diagnosticCount(cd.recurring),
              goals: diagnosticCount(cd.goals),
              alerts: diagnosticCount(cd.alerts),
              shareProjects: diagnosticCount(cd.shareProjects),
              shoppingItems: diagnosticCount(cd.shoppingItems),
              shoppingLists: diagnosticCount(cd.shoppingLists),
              shoppingCards: diagnosticCount(cd.shoppingCards),
              debtCredits: diagnosticCount(cd.debtCredits),
              appuntiDocuments: diagnosticCount(cd.appuntiDocuments),
              appuntiNotes: diagnosticCount(cd.appuntiNotes),
            };
            row.integrity =
              cd.dataIntegrityV1 && typeof cd.dataIntegrityV1 === "object"
                ? cd.dataIntegrityV1
                : {};
            row.updatedAt = diagnosticIso(
              cd.updatedAt ||
                cd.lastUpdatedAt ||
                cd.cloudUpdatedAt ||
                cd.savedAt
            );
            row.schemaVersion =
              cd.accountSyncSchemaVersion == null
                ? null
                : cd.accountSyncSchemaVersion;
          }
        } catch (e: any) {
          row.error =
            String((e && e.code) || "") +
            " " +
            String((e && e.message) || e || "");
        }
        candidateCloud.push(row);
      }
      var shareInfo: any = { owner: 0, member: 0, error: "" };
      if (currentUid) {
        try {
          var ownerSnap: any = await getDocs(
            query(
              collection(fbDb, "shareProjects"),
              where("ownerUid", "==", currentUid),
              limit(100)
            )
          );
          shareInfo.owner = ownerSnap.size || 0;
        } catch (e: any) {
          shareInfo.error =
            "owner: " +
            String((e && e.code) || "") +
            " " +
            String((e && e.message) || e || "");
        }
        try {
          var memberSnap: any = await getDocs(
            query(
              collection(fbDb, "shareProjects"),
              where("memberUids", "array-contains", currentUid),
              limit(100)
            )
          );
          shareInfo.member = memberSnap.size || 0;
        } catch (e: any) {
          shareInfo.error +=
            (shareInfo.error ? " | " : "") +
            "member: " +
            String((e && e.code) || "") +
            " " +
            String((e && e.message) || e || "");
        }
      }
      setSyncDiagnostic({
        createdAt: new Date().toISOString(),
        projectId: projectId,
        currentUid: currentUid,
        email: currentEmail,
        providers: providers,
        lookupUid: lookupUid,
        lookupError: lookupError,
        profileUids: profileUids,
        profilesError: profilesError,
        localCounts: localCounts,
        currentCloud: currentCloud,
        candidateCloud: candidateCloud,
        shareInfo: shareInfo,
      });
    } catch (e: any) {
      setSyncDiagnosticError(
        String((e && e.code) || "") +
          " " +
          String((e && e.message) || e || "Errore diagnostica")
      );
    } finally {
      setSyncDiagnosticLoading(false);
    }
  }
  function translateWidgetSettingsText(value) {
    var raw = String(value == null ? "" : value);
    var code = String(lang || "it")
      .split("-")[0]
      .toLowerCase();
    if (!raw) return raw;
    var widgetExactAlias = {
      "Icon Color": {
        it: "Colore icona",
        en: "Icon color",
        es: "Color del icono",
        fr: "Couleur de l’icône",
        de: "Symbolfarbe",
        pt: "Cor do ícone",
        pl: "Kolor ikony",
        nl: "Pictogramkleur",
        ro: "Culoarea pictogramei",
        el: "Χρώμα εικονιδίου",
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
        ro: "Culoarea pictogramei",
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
        ro: "Culoarea titlului",
        el: "Χρώμα τίτλου",
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
        ro: "Culoarea titlului",
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
        ro: "Culoarea textului",
        el: "Χρώμα κειμένου",
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
        ro: "Culoarea textului",
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
      "Background transparency": {
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
      "SAVE AND UPDATE WIDGET": {
        it: "SALVA E AGGIORNA WIDGET",
        en: "SAVE AND UPDATE WIDGET",
        es: "GUARDAR Y ACTUALIZAR WIDGET",
        fr: "ENREGISTRER ET METTRE À JOUR LE WIDGET",
        de: "WIDGET SPEICHERN UND AKTUALISIEREN",
        pt: "GUARDAR E ATUALIZAR WIDGET",
        pl: "ZAPISZ I ZAKTUALIZUJ WIDŻET",
        nl: "WIDGET OPSLAAN EN BIJWERKEN",
        ro: "SALVEAZĂ ȘI ACTUALIZEAZĂ WIDGETUL",
        el: "ΑΠΟΘΗΚΕΥΣΗ ΚΑΙ ΕΝΗΜΕΡΩΣΗ WIDGET",
      },
      "Show percentage": {
        it: "Mostra percentuale",
        en: "Show percentage",
        es: "Mostrar porcentaje",
        fr: "Afficher le pourcentage",
        de: "Prozentsatz anzeigen",
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
    var aliasRow = widgetExactAlias[raw] || widgetExactAlias[raw.trim()];
    if (aliasRow && aliasRow[code]) return aliasRow[code];
    var D = {
      Saldo: {
        it: "Saldo",
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
        it: "Saldo",
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
      "+ Spesa": {
        it: "+ Spesa",
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
        it: "+ Spesa",
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
      Spesa: {
        it: "Spesa",
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
      Expense: {
        it: "Spesa",
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
      "Mostra percentuale": {
        it: "Mostra percentuale",
        en: "Show percentage",
        es: "Mostrar porcentaje",
        fr: "Afficher le pourcentage",
        de: "Prozentsatz anzeigen",
        pt: "Mostrar percentagem",
        pl: "Pokaż procent",
        nl: "Percentage tonen",
        ro: "Afișează procentul",
        el: "Εμφάνιση ποσοστού",
      },
      "Show percentage": {
        it: "Mostra percentuale",
        en: "Show percentage",
        es: "Mostrar porcentaje",
        fr: "Afficher le pourcentage",
        de: "Prozentsatz anzeigen",
        pt: "Mostrar percentagem",
        pl: "Pokaż procent",
        nl: "Percentage tonen",
        ro: "Afișează procentul",
        el: "Εμφάνιση ποσοστού",
      },
      "Mostra importi": {
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
      "Colore barra/icona": {
        it: "Colore barra/icona",
        en: "Bar/icon color",
        es: "Color de barra/icono",
        fr: "Couleur de la barre/icône",
        de: "Balken-/Symbolfarbe",
        pt: "Cor da barra/ícone",
        pl: "Kolor paska/ikony",
        nl: "Kleur van balk/pictogram",
        ro: "Culoarea barei/pictogramei",
        el: "Χρώμα μπάρας/εικονιδίου",
      },
      "Bar/icon color": {
        it: "Colore barra/icona",
        en: "Bar/icon color",
        es: "Color de barra/icono",
        fr: "Couleur de la barre/icône",
        de: "Balken-/Symbolfarbe",
        pt: "Cor da barra/ícone",
        pl: "Kolor paska/ikony",
        nl: "Kleur van balk/pictogram",
        ro: "Culoarea barei/pictogramei",
        el: "Χρώμα μπάρας/εικονιδίου",
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
        ro: "Culoarea textului",
        el: "Χρώμα κειμένου",
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
        ro: "Culoarea textului",
        el: "Χρώμα κειμένου",
      },
      "Colore percentuale": {
        it: "Colore percentuale",
        en: "Percentage color",
        es: "Color del porcentaje",
        fr: "Couleur du pourcentage",
        de: "Prozentfarbe",
        pt: "Cor da percentagem",
        pl: "Kolor procentu",
        nl: "Kleur van percentage",
        ro: "Culoarea procentului",
        el: "Χρώμα ποσοστού",
      },
      "Percentage color": {
        it: "Colore percentuale",
        en: "Percentage color",
        es: "Color del porcentaje",
        fr: "Couleur du pourcentage",
        de: "Prozentfarbe",
        pt: "Cor da percentagem",
        pl: "Kolor procentu",
        nl: "Kleur van percentage",
        ro: "Culoarea procentului",
        el: "Χρώμα ποσοστού",
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
        ro: "Culoarea pictogramei",
        el: "Χρώμα εικονιδίου",
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
        ro: "Culoarea pictogramei",
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
        ro: "Culoarea titlului",
        el: "Χρώμα τίτλου",
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
        ro: "Culoarea titlului",
        el: "Χρώμα τίτλου",
      },
      "Colore + Spesa": {
        it: "Colore + Spesa",
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
        it: "Colore + Spesa",
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
        it: "Colore + Spesa",
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
        it: "Colore Attività",
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
        it: "Colore Attività",
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
      Sfondo: {
        it: "Sfondo",
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
        it: "Sfondo",
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
      Attività: {
        it: "Attività",
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
        it: "Attività",
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
      "Ti devono": {
        it: "Ti devono",
        en: "They owe you",
        es: "Te deben",
        fr: "On te doit",
        de: "Dir wird geschuldet",
        pt: "Devem-te",
        pl: "Oni są Ci winni",
        nl: "Zij zijn jou verschuldigd",
        ro: "Îți datorează",
        el: "Σου οφείλουν",
      },
      Devi: {
        it: "Devi",
        en: "You owe",
        es: "Debes",
        fr: "Tu dois",
        de: "Du schuldest",
        pt: "Deves",
        pl: "Jesteś winien",
        nl: "Jij bent verschuldigd",
        ro: "Datorezi",
        el: "Οφείλεις",
      },
      "Primo progetto disponibile": {
        it: "Primo progetto disponibile",
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
        it: "Primo progetto disponibile",
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
      "Progetto mostrato nel widget": {
        it: "Progetto mostrato nel widget",
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
        it: "Progetto mostrato nel widget",
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
      "Questo widget serve per inserire rapidamente una nuova uscita o una nuova entrata direttamente dalla Home del telefono, senza aprire manualmente l’app.":
        {
          it: "Questo widget serve per inserire rapidamente una nuova uscita o una nuova entrata direttamente dalla Home del telefono, senza aprire manualmente l’app.",
          en: "This widget lets you quickly add a new expense or income directly from the phone Home screen, without opening the app manually.",
          es: "Este widget te permite añadir rápidamente un nuevo gasto o ingreso directamente desde la pantalla de inicio del teléfono, sin abrir manualmente la app.",
          fr: "Ce widget te permet d’ajouter rapidement une nouvelle dépense ou un nouveau revenu directement depuis l’écran d’accueil du téléphone, sans ouvrir l’app manuellement.",
          de: "Mit diesem Widget kannst du schnell eine neue Ausgabe oder Einnahme direkt vom Startbildschirm des Telefons hinzufügen, ohne die App manuell zu öffnen.",
          pt: "Este widget permite adicionar rapidamente uma nova despesa ou receita diretamente a partir do ecrã inicial do telefone, sem abrir manualmente a app.",
          pl: "Ten widżet pozwala szybko dodać nowy wydatek lub przychód bezpośrednio z ekranu głównego telefonu, bez ręcznego otwierania aplikacji.",
          nl: "Met deze widget kun je snel een nieuwe uitgave of inkomst rechtstreeks vanaf het startscherm van je telefoon toevoegen, zonder de app handmatig te openen.",
          ro: "Acest widget îți permite să adaugi rapid o cheltuială sau un venit nou direct de pe ecranul principal al telefonului, fără să deschizi manual aplicația.",
          el: "Αυτό το widget σου επιτρέπει να προσθέτεις γρήγορα ένα νέο έξοδο ή έσοδο απευθείας από την αρχική οθόνη του τηλεφώνου, χωρίς να ανοίγεις χειροκίνητα την εφαρμογή.",
        },
      "Questo widget mostra sulla Home una nota salvata oppure una coordinata bancaria. Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori e aggiornamento.":
        {
          it: "Questo widget mostra sulla Home una nota salvata oppure una coordinata bancaria. Il contenuto preciso si sceglie quando aggiungi il widget alla Home; qui modifichi solo aspetto, colori e aggiornamento.",
          en: "This widget shows a saved note or bank detail on the Home screen. The exact content is selected when you add the widget to the Home screen; here you only change appearance, colors and update settings.",
          es: "Este widget muestra en la pantalla de inicio una nota guardada o un dato bancario. El contenido exacto se elige al añadir el widget a la pantalla de inicio; aquí solo modificas el aspecto, los colores y la actualización.",
          fr: "Ce widget affiche sur l’écran d’accueil une note enregistrée ou une coordonnée bancaire. Le contenu exact se choisit lorsque tu ajoutes le widget à l’écran d’accueil ; ici tu modifies seulement l’apparence, les couleurs et la mise à jour.",
          de: "Dieses Widget zeigt auf dem Startbildschirm eine gespeicherte Notiz oder Bankverbindung. Der genaue Inhalt wird gewählt, wenn du das Widget zum Startbildschirm hinzufügst; hier änderst du nur Aussehen, Farben und Aktualisierung.",
          pt: "Este widget mostra no ecrã inicial uma nota guardada ou um dado bancário. O conteúdo exato é escolhido quando adicionas o widget ao ecrã inicial; aqui alteras apenas o aspeto, as cores e a atualização.",
          pl: "Ten widżet pokazuje na ekranie głównym zapisaną notatkę albo dane bankowe. Dokładną zawartość wybiera się podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz tylko wygląd, kolory i aktualizację.",
          nl: "Deze widget toont op het startscherm een opgeslagen notitie of bankgegeven. De exacte inhoud kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je alleen uiterlijk, kleuren en bijwerken.",
          ro: "Acest widget afișează pe ecranul principal o notiță salvată sau un detaliu bancar. Conținutul exact se alege când adaugi widgetul pe ecranul principal; aici modifici doar aspectul, culorile și actualizarea.",
          el: "Αυτό το widget εμφανίζει στην αρχική οθόνη μια αποθηκευμένη σημείωση ή ένα τραπεζικό στοιχείο. Το ακριβές περιεχόμενο επιλέγεται όταν προσθέτεις το widget στην αρχική οθόνη· εδώ αλλάζεις μόνο εμφάνιση, χρώματα και ενημέρωση.",
        },
      "Questo widget mostra sulla Home l’avanzamento di un obiettivo di risparmio: nome, percentuale, barra e importi. L’obiettivo preciso si sceglie quando aggiungi il widget alla Home; qui modifichi aspetto e colori.":
        {
          it: "Questo widget mostra sulla Home l’avanzamento di un obiettivo di risparmio: nome, percentuale, barra e importi. L’obiettivo preciso si sceglie quando aggiungi il widget alla Home; qui modifichi aspetto e colori.",
          en: "This widget shows the progress of a savings goal on the Home screen: name, percentage, bar and amounts. The exact goal is selected when you add the widget to the Home screen; here you change appearance and colors.",
          es: "Este widget muestra en la pantalla de inicio el avance de un objetivo de ahorro: nombre, porcentaje, barra e importes. El objetivo exacto se elige al añadir el widget a la pantalla de inicio; aquí modificas el aspecto y los colores.",
          fr: "Ce widget affiche sur l’écran d’accueil la progression d’un objectif d’épargne : nom, pourcentage, barre et montants. L’objectif exact se choisit lorsque tu ajoutes le widget à l’écran d’accueil ; ici tu modifies l’apparence et les couleurs.",
          de: "Dieses Widget zeigt auf dem Startbildschirm den Fortschritt eines Sparziels: Name, Prozentwert, Balken und Beträge. Das genaue Ziel wird gewählt, wenn du das Widget zum Startbildschirm hinzufügst; hier änderst du Aussehen und Farben.",
          pt: "Este widget mostra no ecrã inicial o progresso de um objetivo de poupança: nome, percentagem, barra e valores. O objetivo exato é escolhido quando adicionas o widget ao ecrã inicial; aqui alteras o aspeto e as cores.",
          pl: "Ten widżet pokazuje na ekranie głównym postęp celu oszczędnościowego: nazwę, procent, pasek i kwoty. Dokładny cel wybiera się podczas dodawania widżetu do ekranu głównego; tutaj zmieniasz wygląd i kolory.",
          nl: "Deze widget toont op het startscherm de voortgang van een spaardoel: naam, percentage, balk en bedragen. Het exacte doel kies je wanneer je de widget aan het startscherm toevoegt; hier wijzig je uiterlijk en kleuren.",
          ro: "Acest widget afișează pe ecranul principal progresul unui obiectiv de economisire: nume, procent, bară și sume. Obiectivul exact se alege când adaugi widgetul pe ecranul principal; aici modifici aspectul și culorile.",
          el: "Αυτό το widget εμφανίζει στην αρχική οθόνη την πρόοδο ενός στόχου αποταμίευσης: όνομα, ποσοστό, μπάρα και ποσά. Ο ακριβής στόχος επιλέγεται όταν προσθέτεις το widget στην αρχική οθόνη· εδώ αλλάζεις εμφάνιση και χρώματα.",
        },
      "Questo widget mostra sulla Home il riepilogo di un progetto Share: saldo personale, quanto devi, quanto ti devono e ultima attività. Il progetto può essere scelto qui come default e anche dal tasto di configurazione quando aggiungi il widget.":
        {
          it: "Questo widget mostra sulla Home il riepilogo di un progetto Share: saldo personale, quanto devi, quanto ti devono e ultima attività. Il progetto può essere scelto qui come default e anche dal tasto di configurazione quando aggiungi il widget.",
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
    };
    var EXTRA_WIDGET_TRANSLATIONS_1633 = {
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
    Object.keys(EXTRA_WIDGET_TRANSLATIONS_1633).forEach(function (x) {
      D[x] = EXTRA_WIDGET_TRANSLATIONS_1633[x];
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
    var EXTRA_FINAL_1637 = {
      "Spunta i prodotti già messi nel carrello.": {
        en: "Tick the products already in your cart.",
        es: "Marca los productos ya puestos en el carrito.",
        fr: "Cochez les produits déjà mis dans le panier.",
        de: "Markiere die Produkte, die bereits im Einkaufswagen sind.",
        pt: "Marca os produtos já colocados no carrinho.",
        pl: "Zaznacz produkty już włożone do koszyka.",
        nl: "Vink de producten aan die al in je winkelwagen liggen.",
        ro: "Bifează produsele deja puse în coș.",
        el: "Σημειώστε τα προϊόντα που είναι ήδη στο καλάθι.",
      },
      "Se vuoi creare un’altra lista, vai nelle impostazioni": {
        en: "To create another list, go to settings",
        es: "Si quieres crear otra lista, ve a los ajustes",
        fr: "Pour créer une autre liste, allez dans les paramètres",
        de: "Wenn du eine weitere Liste erstellen möchtest, gehe zu den Einstellungen",
        pt: "Se quiseres criar outra lista, vai às definições",
        pl: "Aby utworzyć inną listę, przejdź do ustawień",
        nl: "Ga naar instellingen om een andere lijst te maken",
        ro: "Pentru a crea o altă listă, mergi la setări",
        el: "Για να δημιουργήσετε άλλη λίστα, μεταβείτε στις ρυθμίσεις",
      },
      "Liste della spesa": {
        en: "Shopping lists",
        es: "Listas de la compra",
        fr: "Listes de courses",
        de: "Einkaufslisten",
        pt: "Listas de compras",
        pl: "Listy zakupów",
        nl: "Boodschappenlijsten",
        ro: "Liste de cumpărături",
        el: "Λίστες αγορών",
      },
      "Crea, modifica o elimina le liste disponibili nella sezione Spesa.": {
        en: "Create, edit or delete the lists available in the Shopping section.",
        es: "Crea, modifica o elimina las listas disponibles en la sección Compra.",
        fr: "Créez, modifiez ou supprimez les listes disponibles dans la section Courses.",
        de: "Erstelle, bearbeite oder lösche die Listen im Bereich Einkaufen.",
        pt: "Cria, edita ou elimina as listas disponíveis na secção Compras.",
        pl: "Twórz, edytuj lub usuwaj listy dostępne w sekcji Zakupy.",
        nl: "Maak, bewerk of verwijder de lijsten in de sectie Boodschappen.",
        ro: "Creează, modifică sau șterge listele disponibile în secțiunea Cumpărături.",
        el: "Δημιουργήστε, επεξεργαστείτε ή διαγράψτε τις λίστες στην ενότητα Αγορές.",
      },
      "Lista della spesa creata": {
        en: "Shopping list created",
        es: "Lista de la compra creada",
        fr: "Liste de courses créée",
        de: "Einkaufsliste erstellt",
        pt: "Lista de compras criada",
        pl: "Lista zakupów utworzona",
        nl: "Boodschappenlijst aangemaakt",
        ro: "Lista de cumpărături a fost creată",
        el: "Η λίστα αγορών δημιουργήθηκε",
      },
      "Lista della spesa aggiornata": {
        en: "Shopping list updated",
        es: "Lista de la compra actualizada",
        fr: "Liste de courses mise à jour",
        de: "Einkaufsliste aktualisiert",
        pt: "Lista de compras atualizada",
        pl: "Lista zakupów zaktualizowana",
        nl: "Boodschappenlijst bijgewerkt",
        ro: "Lista de cumpărături a fost actualizată",
        el: "Η λίστα αγορών ενημερώθηκε",
      },
      "Confermi la cancellazione?": {
        en: "Confirm deletion?",
        es: "¿Confirmas la eliminación?",
        fr: "Confirmer la suppression ?",
        de: "Löschung bestätigen?",
        pt: "Confirmas a eliminação?",
        pl: "Potwierdzasz usunięcie?",
        nl: "Verwijderen bevestigen?",
        ro: "Confirmi ștergerea?",
        el: "Επιβεβαιώνετε τη διαγραφή;",
      },
      "Cancellazione completata": {
        en: "Deletion completed",
        es: "Eliminación completada",
        fr: "Suppression terminée",
        de: "Löschung abgeschlossen",
        pt: "Eliminação concluída",
        pl: "Usuwanie zakończone",
        nl: "Verwijderen voltooid",
        ro: "Ștergere finalizată",
        el: "Η διαγραφή ολοκληρώθηκε",
      },
      "Transazione modificata": {
        en: "Transaction updated",
        es: "Transacción modificada",
        fr: "Transaction modifiée",
        de: "Transaktion geändert",
        pt: "Transação modificada",
        pl: "Transakcja zmieniona",
        nl: "Transactie gewijzigd",
        ro: "Tranzacție modificată",
        el: "Η συναλλαγή τροποποιήθηκε",
      },
      "La lista principale non può essere eliminata se è l’unica lista.": {
        en: "The main list cannot be deleted if it is the only list.",
        es: "La lista principal no se puede eliminar si es la única lista.",
        fr: "La liste principale ne peut pas être supprimée si c’est la seule liste.",
        de: "Die Hauptliste kann nicht gelöscht werden, wenn sie die einzige Liste ist.",
        pt: "A lista principal não pode ser eliminada se for a única lista.",
        pl: "Głównej listy nie można usunąć, jeśli jest jedyną listą.",
        nl: "De hoofdlijst kan niet worden verwijderd als dit de enige lijst is.",
        ro: "Lista principală nu poate fi ștearsă dacă este singura listă.",
        el: "Η κύρια λίστα δεν μπορεί να διαγραφεί αν είναι η μόνη λίστα.",
      },
      "Lista selezionata": {
        en: "Selected list",
        es: "Lista seleccionada",
        fr: "Liste sélectionnée",
        de: "Ausgewählte Liste",
        pt: "Lista selecionada",
        pl: "Wybrana lista",
        nl: "Geselecteerde lijst",
        ro: "Listă selectată",
        el: "Επιλεγμένη λίστα",
      },
    };
    Object.keys(EXTRA_FINAL_1637).forEach(function (k) {
      D[k] = Object.assign({ it: k }, EXTRA_FINAL_1637[k]);
    });
    var row = D[raw] || D[raw.trim()];
    if (row && row[code]) return row[code];
    return translateUiRuntimeText(raw);
  }
  function L(s) {
    return translateWidgetSettingsText(s);
  }
  var sinp = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid " + (dark ? "#444" : "#ddd"),
    padding: "8px 10px",
    fontSize: 14,
    background: dark ? "#2a2a3e" : "#fff",
    color: dark ? "#eee" : "#333",
  };
  var baseSettingsAllowed = settingAllowed("base");
  function baseDisabledStyle() {
    return baseSettingsAllowed
      ? {}
      : {
          background: dark ? "#342b16" : "#FFF8E1",
          border: "1.5px solid " + (dark ? "#6a5520" : "#FFD54F"),
          opacity: 1,
        };
  }
  function baseLockHint(label) {
    return baseSettingsAllowed ? null : (
      <div
        style={{
          fontSize: 12,
          color: dark ? "#ffd58a" : "#856404",
          background: dark ? "#342b16" : "#FFF8E1",
          border: "1px solid " + (dark ? "#6a5520" : "#FFD54F"),
          borderRadius: 10,
          padding: "8px 10px",
          marginTop: 8,
          lineHeight: 1.35,
        }}
      >
        🔒 {L(label || "Disponibile dal piano Base")}.{" "}
        <button
          onClick={openPlanInfo}
          style={{
            background: "none",
            border: "none",
            color: dark ? "#FFE5A6" : "#534AB7",
            fontWeight: 900,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {L("Cambia piano")}
        </button>
      </div>
    );
  }
  function settingsParent(id) {
    var map = {
      metrics: "general",
      currency_settings: "general",
      appearance_app: "appearance",
      appearance_widget: "appearance",
      appearance_widget_quick: "appearance_widget",
      appearance_widget_note: "appearance_widget",
      appearance_widget_goal: "appearance_widget",
      appearance_widget_shopping_list: "appearance_widget",
      appearance_widget_fidelity: "appearance_widget",
      appearance_widget_debt_credits: "appearance_widget",
      appearance_widget_share: "appearance_widget",
      appearance_nav: "appearance",
      sections_income: "sections",
      sections_expense: "sections",
      shopping_settings: "sections",
      shopping_settings_lists: "shopping_settings",
      shopping_settings_areas: "shopping_settings",
      shopping_settings_units: "shopping_settings",
      patrimonio_settings: "sections",
      history_settings: "sections",
      patrimonio_areas_settings: "patrimonio_settings",
      patrimonio_entries_settings: "patrimonio_settings",
      patrimonio_mode_settings: "patrimonio_settings",
      sections_income_areas: "sections_income",
      sections_income_categories: "sections_income",
      sections_expense_areas: "sections_expense",
      sections_expense_categories: "sections_expense",
      sections_expense_methods: "sections_expense",
      info: "info_support",
      support: "info_support",
      data: "info_support",
      delete: "info_support",
      plans_settings: "info_support",
      terms_conditions: "info",
      privacy_policy: "info",
    };
    return map[id] || null;
  }
  function PageHeader({ title }) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button
          onClick={function () {
            setSettingsPage(settingsParent(settingsPage));
          }}
          style={{
            minWidth: 104,
            height: 42,
            borderRadius: 14,
            border: "1px solid " + (dark ? "#4a4865" : "#d8d2ff"),
            background: dark ? "#24213a" : "#F0EDFF",
            cursor: "pointer",
            color: dark ? "#BEB8FF" : "#534AB7",
            fontSize: 14,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            boxShadow: dark ? "none" : "0 3px 14px rgba(83,74,183,0.14)",
          }}
        >
          {L("‹ Indietro")}
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, color: textC }}>
          {L(title)}
        </div>
      </div>
    );
  }
  function SettingHint({ children }) {
    var txt = typeof children === "string" ? L(children) : children;
    return (
      <div
        style={{
          fontSize: 12,
          color: dark ? "#BEB8FF" : "#534AB7",
          background: dark ? "#24213a" : "#F0EDFF",
          border: "1px solid " + (dark ? "#3d376a" : "#D8D2FF"),
          borderRadius: 10,
          padding: "8px 10px",
          marginBottom: 12,
          lineHeight: 1.45,
        }}
      >
        {txt}
      </div>
    );
  }
  function LockedFeatureCard({ icon, title, message }) {
    return (
      <div
        style={{
          background: dark ? "#2a2424" : "#fff0f0",
          border: "1px solid " + (dark ? "#5a3333" : "#f3b6b6"),
          borderRadius: 18,
          padding: 20,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 16,
            background: dark ? "#3a2b2b" : "#ffe0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
            filter: "grayscale(1)",
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: dark ? "#ffd0d0" : "#8a2d2d",
              marginBottom: 6,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: dark ? "#f0bbbb" : "#8a4a4a",
              lineHeight: 1.45,
              marginBottom: 12,
            }}
          >
            {message}
          </div>
          <Btn onClick={openPlanInfo} bg="#E24B4A">
            {L("Cambia piano")}
          </Btn>
        </div>
      </div>
    );
  }
  function SettingsCards({ items }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(function (s) {
          var locked = !!s.disabled;
          return (
            <button
              key={s.id}
              onClick={function () {
                if (locked) {
                  if (s.lockedMessage)
                    setToast({ text: s.lockedMessage, type: "warning" });
                  return;
                }
                setSettingsPage(s.id);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 18px",
                border:
                  "1.5px solid " +
                  (locked ? (dark ? "#6a5520" : "#FFD54F") : borderC),
                borderRadius: 16,
                background: locked ? (dark ? "#2b2518" : "#FFF8E1") : cardBg,
                cursor: locked ? "not-allowed" : "pointer",
                textAlign: "left",
                boxShadow: locked
                  ? "none"
                  : dark
                  ? "none"
                  : "0 2px 12px rgba(0,0,0,0.04)",
                opacity: 1,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  background: locked
                    ? dark
                      ? "#3a3018"
                      : "#FFF3CD"
                    : dark
                    ? "#24213a"
                    : "#F0EDFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {locked ? "🔒" : s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 3,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: locked ? (dark ? "#ffd58a" : "#856404") : textC,
                    }}
                  >
                    {L(s.label)}
                  </div>
                  {locked && (
                    <span
                      style={{
                        fontSize: 11,
                        background: dark ? "#3a3018" : "#FFE8A3",
                        color: dark ? "#ffd58a" : "#856404",
                        borderRadius: 20,
                        padding: "2px 8px",
                        fontWeight: 900,
                      }}
                    >
                      {L("Disponibile da")} {s.requiredPlanLabel}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: locked
                      ? dark
                        ? "#ffe0a3"
                        : "#856404"
                      : dark
                      ? "#BEB8FF"
                      : "#534AB7",
                    background: locked
                      ? dark
                        ? "#221d12"
                        : "#fff3cd"
                      : dark
                      ? "#24213a"
                      : "#F0EDFF",
                    border:
                      "1px solid " +
                      (locked
                        ? dark
                          ? "#6a5520"
                          : "#FFD54F"
                        : dark
                        ? "#3d376a"
                        : "#D8D2FF"),
                    borderRadius: 9,
                    padding: "6px 9px",
                    lineHeight: 1.35,
                  }}
                >
                  {locked
                    ? L(
                        "Questa impostazione esiste, ma non è inclusa nel tuo piano attuale. "
                      )
                    : ""}
                  {L(s.desc)}
                </div>
                {locked && (
                  <div
                    style={{
                      fontSize: 12,
                      color: dark ? "#ffd58a" : "#856404",
                      fontWeight: 800,
                      marginTop: 7,
                    }}
                  >
                    {L(
                      "Tocca per vedere il motivo oppure usa “Cambia piano” nei popup."
                    )}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 18,
                  color: locked ? (dark ? "#ffd58a" : "#856404") : subC,
                }}
              >
                {locked ? "🔒" : "›"}
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  function SettingsMenu() {
    return <SettingsCards items={settingsSections} />;
  }
  if (settingsPage === "info_support")
    return (
      <div>
        <PageHeader title="Info, Piani & Supporto" />
        <SettingsCards
          items={[
            {
              id: "plans_settings",
              icon: "💎",
              label: "Piani",
              desc: "Piani, acquisti e dettagli",
            },
            {
              id: "support",
              icon: "🆘",
              label: "Supporto",
              desc: "FAQ, sito web e contatti",
            },
            {
              id: "data",
              icon: "💾",
              label: "Dati",
              desc: "Importa, esporta, backup, elimina",
            },
            {
              id: "info",
              icon: "ℹ️",
              label: "Info",
              desc: "Versione, termini, privacy e aggiornamenti",
            },
          ]}
        />
      </div>
    );
  function Segmented({ items, value, onChange, columns }) {
    var cols =
      Number(columns) ||
      (isMobile && items.length > 2 ? 2 : Math.max(1, items.length));
    var activeC = secondaryButtonColor || "#5FAFE5";
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(" + cols + ",minmax(0,1fr))",
          gap: 4,
          background: dark ? "#252535" : "#f5f5f5",
          borderRadius: 12,
          padding: 3,
          marginBottom: 12,
        }}
      >
        {items.map(function (it) {
          var active = value === it.id;
          var disabled = !!it.disabled;
          return (
            <button
              type="button"
              key={it.id}
              disabled={disabled}
              onClick={function (e) {
                if (e && e.stopPropagation) e.stopPropagation();
                if (disabled) {
                  if (it.lockedMessage) setToast(it.lockedMessage);
                  return;
                }
                onChange(it.id);
              }}
              style={{
                minWidth: 0,
                minHeight: 44,
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                padding: isMobile ? "8px 5px" : "9px 10px",
                border: "none",
                borderRadius: 10,
                background: active ? activeC : "transparent",
                color: active
                  ? "#fff"
                  : disabled
                  ? dark
                    ? "#555"
                    : "#aaa"
                  : subC,
                fontSize: isMobile ? 11 : 13,
                lineHeight: 1.18,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: active ? 800 : 400,
                boxShadow: active ? "0 3px 10px " + activeC + "40" : "none",
                opacity: disabled ? 0.55 : 1,
              }}
            >
              {L(it.label)}
              {disabled ? " 🔒" : ""}
            </button>
          );
        })}
      </div>
    );
  }

  function WidgetAppearancePanel() {
    var noteLocked = !isWidgetAllowed("note");
    var goalLocked = !isWidgetAllowed("goal");
    var shoppingListLocked = !isWidgetAllowed("shoppingList");
    var fidelityLocked = !isWidgetAllowed("fidelity");
    var debtCreditsLocked = !isWidgetAllowed("debtCredits");
    var shareLocked = !isWidgetAllowed("share");
    return (
      <SettingsCards
        items={[
          {
            id: "appearance_widget_quick",
            icon: "⚡",
            label: L("Aggiunta rapida"),
            desc: L(
              "Incluso nel piano Gratis. Logo fAInance, pulsanti Uscita/Entrata e layout 1x4 in una sola riga"
            ),
          },
          {
            id: "appearance_widget_fidelity",
            icon: "💳",
            label: L("Fidelity card"),
            desc: fidelityLocked
              ? L("Disponibile dal piano") +
                " " +
                widgetPlanName("fidelity") +
                ". " +
                L("Mostra rapidamente una fidelity card o una prepagata.")
              : L("Mostra rapidamente una fidelity card o una prepagata."),
            disabled: fidelityLocked,
            requiredPlanLabel: widgetPlanName("fidelity"),
            lockedMessage: widgetLockedMessage("fidelity"),
          },
          {
            id: "appearance_widget_shopping_list",
            icon: "🧺",
            label: L("Lista spesa"),
            desc: shoppingListLocked
              ? L("Disponibile dal piano") +
                " " +
                widgetPlanName("shoppingList") +
                ". " +
                L(
                  "Mostra la lista della spesa e permette di segnare gli articoli acquistati."
                )
              : L(
                  "Mostra la lista della spesa e permette di segnare gli articoli acquistati."
                ),
            disabled: shoppingListLocked,
            requiredPlanLabel: widgetPlanName("shoppingList"),
            lockedMessage: widgetLockedMessage("shoppingList"),
          },
          {
            id: "appearance_widget_note",
            icon: "📝",
            label: L("Nota / Dati bancari"),
            desc: noteLocked
              ? L("Disponibile dal piano") +
                " " +
                widgetPlanName("note") +
                ". " +
                L("Mostra il contenuto di una nota oppure l’IBAN selezionato.")
              : L("Mostra il contenuto di una nota oppure l’IBAN selezionato"),
            disabled: noteLocked,
            requiredPlanLabel: widgetPlanName("note"),
            lockedMessage: widgetLockedMessage("note"),
          },
          {
            id: "appearance_widget_goal",
            icon: "🎯",
            label: L("Obiettivo"),
            desc: goalLocked
              ? L("Disponibile dal piano") +
                " " +
                widgetPlanName("goal") +
                ". " +
                L("Mostra avanzamento, percentuale e importi di un obiettivo.")
              : L("Mostra avanzamento, percentuale e importi di un obiettivo"),
            disabled: goalLocked,
            requiredPlanLabel: widgetPlanName("goal"),
            lockedMessage: widgetLockedMessage("goal"),
          },
          {
            id: "appearance_widget_share",
            icon: "🤝",
            label: "Share",
            desc: shareLocked
              ? L("Disponibile dal piano") +
                " " +
                widgetPlanName("share") +
                ". " +
                L(
                  "Scegli progetto, colori, trasparenza e grafica del widget Share."
                )
              : L(
                  "Scegli progetto, colori, trasparenza e grafica del widget Share"
                ),
            disabled: shareLocked,
            requiredPlanLabel: widgetPlanName("share"),
            lockedMessage: widgetLockedMessage("share"),
          },
          {
            id: "appearance_widget_debt_credits",
            icon: "📉",
            label: L("Debiti / Crediti"),
            desc: debtCreditsLocked
              ? L("Disponibile dal piano") +
                " " +
                widgetPlanName("debtCredits") +
                ". " +
                L("Mostra il saldo aperto di debiti e crediti.")
              : L("Mostra il saldo aperto di debiti e crediti."),
            disabled: debtCreditsLocked,
            requiredPlanLabel: widgetPlanName("debtCredits"),
            lockedMessage: widgetLockedMessage("debtCredits"),
          },
        ]}
      />
    );
  }

  function WidgetQuickAddSettingsPanel() {
    var WIDGET_BG_PALETTE = [
      { name: "Glass scuro", value: "#1E1E30" },
      { name: "Notte", value: "#111827" },
      { name: "Slate", value: "#273244" },
      { name: "Soft", value: "#FAFAFF" },
      { name: "Bianco", value: "#FFFFFF" },
      { name: "Lavanda", value: "#F0EDFF" },
    ];
    var WIDGET_EXP_PALETTE = [
      { name: "Rosso", value: "#E24B4A" },
      { name: "Corallo", value: "#F05A55" },
      { name: "Arancio", value: "#D85A30" },
      { name: "Rosso scuro", value: "#B33030" },
      { name: "Cremisi", value: "#C0392B" },
      { name: "Viola", value: "#8E44AD" },
    ];
    var WIDGET_INC_PALETTE = [
      { name: "Verde", value: "#1D9E75" },
      { name: "Teal", value: "#16A085" },
      { name: "Smeraldo", value: "#10B981" },
      { name: "Verde 2", value: "#27AE60" },
      { name: "Blu", value: "#3498DB" },
      { name: "Royal", value: "#0D6EFD" },
    ];
    var [draft, setDraft] = useState(function () {
      return {
        bgColor: widgetBgColor,
        bgAlpha: widgetBgAlpha,
        expenseColor: widgetExpenseColor,
        incomeColor: widgetIncomeColor,
        title: translateUiRuntimeText(widgetTitle),
        subtitle: translateUiRuntimeText(widgetSubtitle),
        expenseLabel:
          stripWidgetPrefix(translateUiRuntimeText(widgetExpenseLabel)) ||
          translateUiRuntimeText("Uscita"),
        incomeLabel:
          stripWidgetPrefix(translateUiRuntimeText(widgetIncomeLabel)) ||
          translateUiRuntimeText("Entrata"),
        showHeader: widgetShowHeader,
        buttonStyle: widgetButtonStyle,
        voiceEnabled: widgetVoiceEnabled,
      };
    });
    function stripWidgetPrefix(v) {
      return String(v || "")
        .replace(/^\s*[+\-−]\s*/, "")
        .trim();
    }
    function dset(k, v) {
      setDraft(function (p) {
        return { ...p, [k]: v };
      });
    }
    function radiusFor(id) {
      var x = BUTTON_STYLES.find(function (b) {
        return b.id === id;
      });
      return x ? Math.max(6, Math.round(x.r * 0.7)) : 10;
    }
    function alphaHex(hex, alpha) {
      var transparency = Math.max(0, Math.min(100, Number(alpha) || 0));
      var a = (100 - transparency) / 100;
      var h = String(hex || "#1E1E30");
      if (h.length === 4) h = "#" + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
      var r = parseInt(h.slice(1, 3), 16) || 0,
        g = parseInt(h.slice(3, 5), 16) || 0,
        b = parseInt(h.slice(5, 7), 16) || 0;
      return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    }
    function textOnBg(hex) {
      var h = String(hex || "#1E1E30").replace("#", "");
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      var r = parseInt(h.slice(0, 2), 16) || 0,
        g = parseInt(h.slice(2, 4), 16) || 0,
        b = parseInt(h.slice(4, 6), 16) || 0;
      return (r * 299 + g * 587 + b * 114) / 1000 < 145 ? "#FFFFFF" : "#222222";
    }
    function quickVoicePayload(enabled, basePayload) {
      var next = !!enabled;
      var base = basePayload || widgetSettingsPayload();
      var visibility = next
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
        ...base,
        showVoiceButton: next,
        voiceEnabled: next,
        showMicrophone: next,
        voiceUserEnabled: next,
        hideVoiceButton: !next,
        removeVoiceButton: !next,
        collapseVoiceButton: !next,
        voiceButtonVisibility: next ? "visible" : "gone",
        voiceVisibilityBySize: visibility,
        quickAdd: {
          ...(base.quickAdd || {}),
          showVoiceButton: next,
          voiceEnabled: next,
          showMicrophone: next,
          voiceUserEnabled: next,
          hideVoiceButton: !next,
          removeVoiceButton: !next,
          collapseVoiceButton: !next,
          removeVoiceButtonFromLayout: !next,
          reserveVoiceButtonSpace: next,
          voiceButtonVisibility: next ? "visible" : "gone",
          voiceHiddenLayouts: visibility.hiddenLayouts,
          voiceVisibleLayouts: visibility.visibleLayouts,
          voiceVisibilityBySize: visibility,
          voiceLabel: L("Voce"),
          voiceIcon: "🎙️",
          voiceAction: "open-voice",
          voiceUrlScheme: "fainance://open-voice",
        },
      };
    }
    function applyVoiceEnabled(enabled) {
      var next = !!enabled;
      dset("voiceEnabled", next);
      setWidgetVoiceEnabled(next);
      saveWidgetSettingsToNative(false, quickVoicePayload(next));
    }
    function save() {
      var cleanExpense = stripWidgetPrefix(draft.expenseLabel) || "Uscita";
      var cleanIncome = stripWidgetPrefix(draft.incomeLabel) || "Entrata";
      setWidgetBgColor(draft.bgColor);
      setWidgetBgAlpha(numOr(draft.bgAlpha, 65));
      setWidgetExpenseColor(draft.expenseColor);
      setWidgetIncomeColor(draft.incomeColor);
      setWidgetTitle(draft.title);
      setWidgetSubtitle(draft.subtitle);
      setWidgetExpenseLabel(cleanExpense);
      setWidgetIncomeLabel(cleanIncome);
      setWidgetShowHeader(!!draft.showHeader);
      setWidgetButtonStyle(draft.buttonStyle);
      setWidgetVoiceEnabled(!!draft.voiceEnabled);
      var base = {
        ...widgetSettingsPayload(),
        quickAdd: {
          ...widgetSettingsPayload().quickAdd,
          bgColor: draft.bgColor,
          bgAlpha: numOr(draft.bgAlpha, 65),
          expenseColor: draft.expenseColor,
          incomeColor: draft.incomeColor,
          title: draft.title,
          subtitle: draft.subtitle,
          expenseLabel: cleanExpense,
          incomeLabel: cleanIncome,
          showHeader: !!draft.showHeader,
          buttonStyle: draft.buttonStyle,
          compactSingleRow: true,
          reduceButtonHeightPct: 15,
          removeButtonWhiteOverlay: true,
          widgetCornerRadius: "soft",
          logoKind: "official",
          logoLabel: "fAI",
        },
        shareWidget: {
          ...widgetSettingsPayload().shareWidget,
          buttonStyle: draft.buttonStyle,
        },
        bgColor: draft.bgColor,
        bgAlpha: numOr(draft.bgAlpha, 65),
        expenseColor: draft.expenseColor,
        incomeColor: draft.incomeColor,
        title: draft.title,
        subtitle: draft.subtitle,
        expenseLabel: cleanExpense,
        incomeLabel: cleanIncome,
        showHeader: !!draft.showHeader,
        buttonStyle: draft.buttonStyle,
      };
      saveWidgetSettingsToNative(
        true,
        quickVoicePayload(!!draft.voiceEnabled, base)
      );
    }
    function Palette({ title, value, onPick, items }) {
      return (
        <div
          style={{
            background: dark ? "#252535" : "#f9f9f9",
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 12,
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
            <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
              {L(title)}
            </div>
            <div style={{ fontSize: 11, color: subC, fontWeight: 700 }}>
              {value}
            </div>
          </div>
          <AppColorSelector
            value={value}
            onChange={function (color) {
              onPick(color);
            }}
          />
        </div>
      );
    }
    var previewText = textOnBg(draft.bgColor);
    var previewSub =
      previewText === "#FFFFFF" ? "rgba(255,255,255,0.72)" : "#777";
    var cardAlpha = alphaHex(draft.bgColor, draft.bgAlpha);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: textC,
              marginBottom: 4,
            }}
          >
            {L("⚡ Aggiunta Rapida")}
          </div>
          <SettingHint>
            {L(
              "Questo widget serve per inserire rapidamente una nuova uscita o una nuova entrata direttamente dalla Home del telefono, senza aprire manualmente l’app."
            )}
          </SettingHint>
          <div
            style={{
              background: cardAlpha,
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: 14,
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.08)",
            }}
          >
            <FAInanceLogo size={36} />
            <div
              style={{
                height: 32,
                width: 1,
                background: "rgba(255,255,255,.18)",
              }}
            />
            {draft.voiceEnabled && (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  background: "rgba(255,255,255,.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  color: previewText,
                }}
              >
                🎙️
              </div>
            )}
            <div
              style={{
                flex: 1,
                background: draft.expenseColor,
                color: "#fff",
                borderRadius: radiusFor(draft.buttonStyle),
                padding: "10px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              <span>−</span>
              <span>{L(draft.expenseLabel || "Uscita")}</span>
            </div>
            <div
              style={{
                flex: 1,
                background: draft.incomeColor,
                color: "#fff",
                borderRadius: radiusFor(draft.buttonStyle),
                padding: "10px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              <span>+</span>
              <span>{L(draft.incomeLabel || "Entrata")}</span>
            </div>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                border: "1px solid rgba(255,255,255,.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: previewText,
              }}
            >
              ⚙
            </div>
          </div>
          {draft.showHeader && (
            <div
              style={{
                background: cardAlpha,
                border: "1px solid rgba(255,255,255,.18)",
                borderRadius: 14,
                padding: 14,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <FAInanceLogo size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: previewText,
                    }}
                  >
                    {draft.title || "fAInance"}
                  </div>
                  <div style={{ fontSize: 12, color: previewSub }}>
                    {draft.subtitle || "Aggiunta rapida movimenti"}
                  </div>
                </div>
                <div style={{ color: previewText }}>⚙</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {draft.voiceEnabled && (
                  <div
                    style={{
                      width: 44,
                      background: "rgba(255,255,255,.18)",
                      color: previewText,
                      border: "1px solid rgba(255,255,255,.25)",
                      borderRadius: radiusFor(draft.buttonStyle),
                      padding: "10px 10px",
                      textAlign: "center",
                      fontWeight: 900,
                    }}
                  >
                    🎙️
                  </div>
                )}
                <div
                  style={{
                    flex: 1,
                    background: draft.expenseColor,
                    color: "#fff",
                    borderRadius: radiusFor(draft.buttonStyle),
                    padding: "10px 10px",
                    textAlign: "center",
                    fontWeight: 900,
                  }}
                >
                  − {L(draft.expenseLabel || "Uscita")}
                </div>
                <div
                  style={{
                    flex: 1,
                    background: draft.incomeColor,
                    color: "#fff",
                    borderRadius: radiusFor(draft.buttonStyle),
                    padding: "10px 10px",
                    textAlign: "center",
                    fontWeight: 900,
                  }}
                >
                  + {L(draft.incomeLabel || "Entrata")}
                </div>
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: subC,
                marginBottom: 5,
              }}
            >
              {L("Titolo")}
            </div>
            <input
              value={draft.title}
              onChange={function (e) {
                dset("title", e.target.value);
              }}
              style={sinp}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: subC,
                marginBottom: 5,
              }}
            >
              {L("Sottotitolo")}
            </div>
            <input
              value={draft.subtitle}
              onChange={function (e) {
                dset("subtitle", e.target.value);
              }}
              style={sinp}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: subC,
                marginBottom: 5,
              }}
            >
              {L("Testo tasto uscita")}
            </div>
            <input
              value={draft.expenseLabel}
              onChange={function (e) {
                dset("expenseLabel", stripWidgetPrefix(e.target.value));
              }}
              style={sinp}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: subC,
                marginBottom: 5,
              }}
            >
              {L("Testo tasto entrata")}
            </div>
            <input
              value={draft.incomeLabel}
              onChange={function (e) {
                dset("incomeLabel", stripWidgetPrefix(e.target.value));
              }}
              style={sinp}
            />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <Palette
            title={L("Sfondo widget")}
            value={draft.bgColor}
            onPick={function (v) {
              dset("bgColor", v);
            }}
            items={WIDGET_BG_PALETTE}
          />
          <Palette
            title={L("Pulsante uscita")}
            value={draft.expenseColor}
            onPick={function (v) {
              dset("expenseColor", v);
            }}
            items={WIDGET_EXP_PALETTE}
          />
          <Palette
            title={L("Pulsante entrata")}
            value={draft.incomeColor}
            onPick={function (v) {
              dset("incomeColor", v);
            }}
            items={WIDGET_INC_PALETTE}
          />
        </div>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: textC }}>
                {L("Trasparenza sfondo widget")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {L("100% = completamente trasparente. 0% = sfondo pieno.")}
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#7F77DD" }}>
              {draft.bgAlpha}%
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={draft.bgAlpha}
            onChange={function (e) {
              dset("bgAlpha", Number(e.target.value));
            }}
            style={{ width: "100%" }}
          />
        </div>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: subC,
              marginBottom: 8,
            }}
          >
            {L("Bordi dei tasti widget")}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {BUTTON_STYLES.map(function (bs) {
              var active = draft.buttonStyle === bs.id;
              return (
                <button
                  type="button"
                  key={bs.id}
                  onClick={function () {
                    dset("buttonStyle", bs.id);
                  }}
                  style={{
                    padding: "10px",
                    border: "2px solid " + (active ? "#7F77DD" : borderC),
                    borderRadius: Math.max(6, Math.round(bs.r * 0.7)),
                    background: active
                      ? dark
                        ? "#2a2a3e"
                        : "#EEEDFE"
                      : dark
                      ? "#1e1e30"
                      : "#f9f9f9",
                    cursor: "pointer",
                    fontSize: 13,
                    color: active ? "#7F77DD" : textC,
                    fontWeight: active ? 800 : 500,
                  }}
                >
                  {L(bs.label)}
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
              {L("Mostra microfono nel widget")}
            </div>
            <div style={{ fontSize: 12, color: subC }}>
              {L(
                "Aggiunge il pulsante 🎙️ sulla sinistra del widget di aggiunta rapida."
              )}
            </div>
          </div>
          <Toggle
            label=""
            checked={!!draft.voiceEnabled}
            onChange={function () {
              applyVoiceEnabled(!draft.voiceEnabled);
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
              {L("Mostra intestazione nella versione ampia")}
            </div>
            <div style={{ fontSize: 12, color: subC }}>
              {L("Nella versione 1x4 resta una sola riga.")}
            </div>
          </div>
          <Toggle
            label=""
            checked={!!draft.showHeader}
            onChange={function () {
              dset("showHeader", !draft.showHeader);
            }}
          />
        </div>
        <Btn
          onClick={save}
          bg="#7F77DD"
          style={{ width: "100%", padding: 12, fontWeight: 800 }}
        >
          {L("Salva e aggiorna widget")}
        </Btn>
      </div>
    );
  }

  function WidgetIntroCard({ icon, title, children }) {
    return (
      <div
        style={{
          background: cardBg,
          border: "1px solid " + borderC,
          borderRadius: 16,
          padding: 16,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: dark ? "#24213a" : "#F0EDFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: textC,
              marginBottom: 5,
            }}
          >
            {L(title)}
          </div>
          <div style={{ fontSize: 13, color: subC, lineHeight: 1.45 }}>
            {typeof children === "string" ? L(children) : children}
          </div>
        </div>
      </div>
    );
  }

  function WidgetNoteSettingsPanel() {
    var [draftMaxChars, setDraftMaxChars] = useState(
      String(widget2MaxChars || 500)
    );
    var [draftTextSize, setDraftTextSize] = useState(
      Number(widget2TextSize) || 14
    );
    var [draftBgAlpha, setDraftBgAlpha] = useState(numOr(widget2BgAlpha, 65));
    function save() {
      var max = parseInt(draftMaxChars, 10) || 500;
      max = Math.max(20, Math.min(2000, max));
      var rawAlpha = Number(draftBgAlpha);
      var alpha = Math.max(
        0,
        Math.min(100, Number.isFinite(rawAlpha) ? rawAlpha : 65)
      );
      var textSize = Math.max(10, Math.min(28, Number(draftTextSize) || 14));
      setWidget2MaxChars(max);
      setWidget2TextSize(textSize);
      setWidget2BgAlpha(alpha);
      saveWidgetSettingsToNative(true, {
        ...widgetSettingsPayload(),
        noteWidget: {
          ...widgetSettingsPayload().noteWidget,
          maxChars: max,
          textSize: textSize,
          bgAlpha: alpha,
          titleColor: widget2TitleColor,
          bodyColor: widget2BodyColor,
          accentColor: widget2AccentColor,
        },
      });
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <WidgetIntroCard icon="📝" title={L("Nota / Coordinata / Carta")}>
          {L(
            "Il contenuto si sceglie per ogni singolo widget dalla Home di iOS: tieni premuto il widget, scegli Modifica widget e seleziona la nota, la coordinata bancaria o la carta di credito. Ogni widget può mostrare un contenuto diverso."
          )}
        </WidgetIntroCard>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}
        >
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: textC,
                marginBottom: 5,
              }}
            >
              {L("Numero massimo di caratteri")}
            </div>
            <div style={{ fontSize: 12, color: subC, marginBottom: 8 }}>
              {L("Limite del testo mostrato nel widget.")}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min="20"
              max="2000"
              value={draftMaxChars}
              onChange={function (e) {
                setDraftMaxChars(e.target.value);
              }}
              onBlur={function () {
                var n = parseInt(draftMaxChars, 10);
                if (!n) setDraftMaxChars("500");
                else setDraftMaxChars(String(Math.max(20, Math.min(2000, n))));
              }}
              style={{ ...sinp, width: "100%" }}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Grandezza testo")}
            </div>
            <div style={{ fontSize: 12, color: subC, marginBottom: 8 }}>
              {L("Dimensione del contenuto mostrato nel widget.")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range"
                min="10"
                max="28"
                step="1"
                value={draftTextSize}
                onChange={function (e) {
                  setDraftTextSize(Number(e.target.value));
                }}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min="10"
                max="28"
                value={draftTextSize}
                onChange={function (e) {
                  setDraftTextSize(
                    Math.max(10, Math.min(28, Number(e.target.value) || 14))
                  );
                }}
                style={{ ...sinp, width: 74 }}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore icona")}
            </div>
            <AppColorSelector
              value={widget2AccentColor}
              onChange={function (color) {
                setWidget2AccentColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  noteWidget: {
                    ...widgetSettingsPayload().noteWidget,
                    accentColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore titolo")}
            </div>
            <AppColorSelector
              value={widget2TitleColor}
              onChange={function (color) {
                setWidget2TitleColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  noteWidget: {
                    ...widgetSettingsPayload().noteWidget,
                    titleColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore testo")}
            </div>
            <AppColorSelector
              value={widget2BodyColor}
              onChange={function (color) {
                setWidget2BodyColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  noteWidget: {
                    ...widgetSettingsPayload().noteWidget,
                    bodyColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
        </div>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: textC }}>
                {L("Trasparenza sfondo widget")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {L("100% = completamente trasparente. 0% = sfondo pieno.")}
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#7F77DD" }}>
              {draftBgAlpha}%
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={draftBgAlpha}
            onChange={function (e) {
              setDraftBgAlpha(Number(e.target.value));
            }}
            style={{ width: "100%" }}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={draftBgAlpha}
            onChange={function (e) {
              setDraftBgAlpha(
                Math.max(0, Math.min(100, Number(e.target.value) || 0))
              );
            }}
            style={{ ...sinp, width: 90, marginTop: 8 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
              {L("Aggiornamento automatico")}
            </div>
            <div style={{ fontSize: 12, color: subC }}>
              {L(
                "Aggiorna i widget già installati quando cambi contenuti o impostazioni."
              )}
            </div>
          </div>
          <Toggle
            label=""
            checked={!!widget2AutoUpdate}
            onChange={function () {
              setWidget2AutoUpdate(!widget2AutoUpdate);
            }}
          />
        </div>
        <Btn
          onClick={save}
          bg="#7F77DD"
          style={{ width: "100%", padding: 12, fontWeight: 800 }}
        >
          {L("Salva e aggiorna widget")}
        </Btn>
      </div>
    );
  }

  function WidgetGoalSettingsPanel() {
    var selectedGoal =
      (goals || []).find(function (g) {
        return String(g.id) === String(widget3SelectedGoalId);
      }) ||
      (goals || [])[0] ||
      null;
    var target = selectedGoal ? Number(selectedGoal.target || 0) : 0;
    var saved = selectedGoal ? Number(selectedGoal.saved || 0) : 0;
    var pct =
      target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    var gColor = widget3AccentColor;
    var [draftBgAlpha, setDraftBgAlpha] = useState(numOr(widget3BgAlpha, 65));
    function save() {
      var rawAlpha = Number(draftBgAlpha);
      var alpha = Math.max(
        0,
        Math.min(100, Number.isFinite(rawAlpha) ? rawAlpha : 65)
      );
      setWidget3BgAlpha(alpha);
      saveWidgetSettingsToNative(true, {
        ...widgetSettingsPayload(),
        goalWidget: {
          ...widgetSettingsPayload().goalWidget,
          bgAlpha: alpha,
          showPercent: !!widget3ShowPercent,
          showAmounts: !!widget3ShowAmounts,
          accentColor: widget3AccentColor,
          textColor: widget3TextColor,
          percentColor: widget3PercentColor,
        },
      });
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <WidgetIntroCard icon="🎯" title={L("Obiettivo")}>
          {L(
            "L’obiettivo si sceglie per ogni singolo widget dalla Home di iOS: tieni premuto il widget, scegli Modifica widget e seleziona l’obiettivo da mostrare."
          )}
        </WidgetIntroCard>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              background: dark ? "#111827" : "#F8FAFC",
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: gColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                color: "#fff",
              }}
            >
              <FainanceIcon
                value={selectedGoal ? selectedGoal.icon || "🎯" : "🎯"}
                size={28}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: widget3TextColor,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {selectedGoal
                    ? selectedGoal.name || "Obiettivo"
                    : "Anteprima obiettivo"}
                </div>
                {widget3ShowPercent && (
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: widget3PercentColor,
                    }}
                  >
                    {pct}%
                  </div>
                )}
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 8,
                  background: dark ? "#273244" : "#E5E7EB",
                  overflow: "hidden",
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: pct + "%",
                    height: "100%",
                    background: gColor,
                    borderRadius: 8,
                  }}
                />
              </div>
              {widget3ShowAmounts && (
                <div
                  style={{
                    fontSize: 12,
                    color: widget3TextColor,
                    marginTop: 5,
                    opacity: 0.82,
                  }}
                >
                  <span style={{ color: widget3PercentColor, fontWeight: 800 }}>
                    {fmt(saved)}
                  </span>{" "}
                  / {fmt(target)}
                </div>
              )}
            </div>
            <div style={{ fontSize: 18, color: subC }}>⚙</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
                {L("Mostra percentuale")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {L("Mostra la percentuale di avanzamento.")}
              </div>
            </div>
            <Toggle
              label=""
              checked={!!widget3ShowPercent}
              onChange={function () {
                setWidget3ShowPercent(!widget3ShowPercent);
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
                {L("Mostra importi")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {L("Mostra importo raggiunto e target.")}
              </div>
            </div>
            <Toggle
              label=""
              checked={!!widget3ShowAmounts}
              onChange={function () {
                setWidget3ShowAmounts(!widget3ShowAmounts);
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore barra/icona")}
            </div>
            <AppColorSelector
              value={widget3AccentColor}
              onChange={function (color) {
                setWidget3AccentColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  goalWidget: {
                    ...widgetSettingsPayload().goalWidget,
                    accentColor: color,
                    color: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore testo")}
            </div>
            <AppColorSelector
              value={widget3TextColor}
              onChange={function (color) {
                setWidget3TextColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  goalWidget: {
                    ...widgetSettingsPayload().goalWidget,
                    textColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore percentuale")}
            </div>
            <AppColorSelector
              value={widget3PercentColor}
              onChange={function (color) {
                setWidget3PercentColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  goalWidget: {
                    ...widgetSettingsPayload().goalWidget,
                    percentColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
        </div>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: textC }}>
                {L("Trasparenza sfondo widget")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {L("100% = completamente trasparente. 0% = sfondo pieno.")}
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#7F77DD" }}>
              {draftBgAlpha}%
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={draftBgAlpha}
            onChange={function (e) {
              setDraftBgAlpha(Number(e.target.value));
            }}
            style={{ width: "100%" }}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={draftBgAlpha}
            onChange={function (e) {
              setDraftBgAlpha(
                Math.max(0, Math.min(100, Number(e.target.value) || 0))
              );
            }}
            style={{ ...sinp, width: 90, marginTop: 8 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
              {L("Aggiornamento automatico")}
            </div>
            <div style={{ fontSize: 12, color: subC }}>
              {L("Aggiorna il widget quando cambia l’obiettivo.")}
            </div>
          </div>
          <Toggle
            label=""
            checked={!!widget3AutoUpdate}
            onChange={function () {
              setWidget3AutoUpdate(!widget3AutoUpdate);
            }}
          />
        </div>
        <Btn
          onClick={save}
          bg="#7F77DD"
          style={{ width: "100%", padding: 12, fontWeight: 800 }}
        >
          {L("Salva e aggiorna widget")}
        </Btn>
      </div>
    );
  }

  function WidgetGenericStylePanel({
    kind,
    icon,
    title,
    description,
    values,
    setters,
    onSave,
  }) {
    var [draftTextSize, setDraftTextSize] = useState(
      Number(values.textSize) || 13
    );
    var [draftBgAlpha, setDraftBgAlpha] = useState(numOr(values.bgAlpha, 65));
    useEffect(
      function () {
        setDraftBgAlpha(numOr(values.bgAlpha, 65));
      },
      [values.bgAlpha]
    );
    useEffect(
      function () {
        setDraftTextSize(Number(values.textSize) || 13);
      },
      [values.textSize]
    );
    function save() {
      var textSize = Math.max(10, Math.min(28, Number(draftTextSize) || 13));
      var rawAlpha = Number(draftBgAlpha);
      var alpha = Math.max(
        0,
        Math.min(100, Number.isFinite(rawAlpha) ? rawAlpha : 65)
      );
      setters.setTextSize(textSize);
      setters.setBgAlpha(alpha);
      onSave({ textSize: textSize, bgAlpha: alpha });
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <WidgetIntroCard icon={icon} title={L(title)}>
          {L(description)}
        </WidgetIntroCard>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: textC,
              marginBottom: 8,
            }}
          >
            {L("Grandezza testo")}
          </div>
          <div style={{ fontSize: 12, color: subC, marginBottom: 8 }}>
            {L("Dimensione del contenuto mostrato nel widget.")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min="10"
              max="28"
              step="1"
              value={draftTextSize}
              onChange={function (e) {
                setDraftTextSize(Number(e.target.value));
              }}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="10"
              max="28"
              value={draftTextSize}
              onChange={function (e) {
                setDraftTextSize(
                  Math.max(10, Math.min(28, Number(e.target.value) || 13))
                );
              }}
              style={{ ...sinp, width: 74 }}
            />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore icona")}
            </div>
            <AppColorSelector
              value={values.iconColor}
              onChange={function (color) {
                setters.setIconColor(color);
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore titolo")}
            </div>
            <AppColorSelector
              value={values.titleColor}
              onChange={function (color) {
                setters.setTitleColor(color);
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore testo")}
            </div>
            <AppColorSelector
              value={values.textColor}
              onChange={function (color) {
                setters.setTextColor(color);
              }}
              compact={true}
            />
          </div>
        </div>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: textC }}>
                {L("Trasparenza sfondo widget")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {L("100% = completamente trasparente. 0% = sfondo pieno.")}
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#7F77DD" }}>
              {draftBgAlpha}%
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={draftBgAlpha}
            onChange={function (e) {
              setDraftBgAlpha(Number(e.target.value));
            }}
            style={{ width: "100%" }}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={draftBgAlpha}
            onChange={function (e) {
              setDraftBgAlpha(
                Math.max(0, Math.min(100, Number(e.target.value) || 0))
              );
            }}
            style={{ ...sinp, width: 90, marginTop: 8 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
              {L("Aggiornamento automatico")}
            </div>
            <div style={{ fontSize: 12, color: subC }}>
              {L(
                "Aggiorna i widget già installati quando cambi contenuti o impostazioni."
              )}
            </div>
          </div>
          <Toggle
            label=""
            checked={!!values.autoUpdate}
            onChange={function () {
              setters.setAutoUpdate(!values.autoUpdate);
            }}
          />
        </div>
        <Btn
          onClick={save}
          bg="#7F77DD"
          style={{ width: "100%", padding: 12, fontWeight: 800 }}
        >
          {L("Salva e aggiorna widget")}
        </Btn>
      </div>
    );
  }

  function WidgetShoppingListSettingsPanel() {
    function save(extra) {
      saveWidgetSettingsToNative(true, {
        ...widgetSettingsPayload(),
        shoppingListWidget: {
          ...widgetSettingsPayload().shoppingListWidget,
          textSize: extra.textSize,
          bgAlpha: extra.bgAlpha,
          iconColor: widgetShoppingListIconColor,
          titleColor: widgetShoppingListTitleColor,
          textColor: widgetShoppingListTextColor,
          autoUpdate: !!widgetShoppingListAutoUpdate,
        },
      });
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <WidgetIntroCard icon="🧺" title={L("Lista spesa")}>
          {L(
            "La lista si sceglie per ogni singolo widget dalla Home di iOS: tieni premuto il widget, scegli Modifica widget e seleziona la lista da mostrare."
          )}
        </WidgetIntroCard>
        <WidgetGenericStylePanel
          key={
            "shop_" +
            widgetShoppingListBgAlpha +
            "_" +
            widgetShoppingListTextSize
          }
          kind="shoppingList"
          icon="🧺"
          title="Aspetto lista spesa"
          description="Usa le frecce su e giù per spostare l’elenco di una riga alla volta e tocca un articolo per contrassegnarlo."
          values={{
            textSize: widgetShoppingListTextSize,
            bgAlpha: widgetShoppingListBgAlpha,
            iconColor: widgetShoppingListIconColor,
            titleColor: widgetShoppingListTitleColor,
            textColor: widgetShoppingListTextColor,
            autoUpdate: widgetShoppingListAutoUpdate,
          }}
          setters={{
            setTextSize: setWidgetShoppingListTextSize,
            setBgAlpha: setWidgetShoppingListBgAlpha,
            setIconColor: setWidgetShoppingListIconColor,
            setTitleColor: setWidgetShoppingListTitleColor,
            setTextColor: setWidgetShoppingListTextColor,
            setAutoUpdate: setWidgetShoppingListAutoUpdate,
          }}
          onSave={save}
        />
      </div>
    );
  }

  function WidgetFidelitySettingsPanel() {
    function save(extra) {
      saveWidgetSettingsToNative(true, {
        ...widgetSettingsPayload(),
        fidelityWidget: {
          ...widgetSettingsPayload().fidelityWidget,
          textSize: extra.textSize,
          bgAlpha: extra.bgAlpha,
          iconColor: widgetFidelityIconColor,
          titleColor: widgetFidelityTitleColor,
          textColor: widgetFidelityTextColor,
          autoUpdate: !!widgetFidelityAutoUpdate,
        },
      });
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <WidgetIntroCard icon="💳" title="Fidelity card">
          {L(
            "La carta si sceglie per ogni singolo widget dalla Home di iOS: tieni premuto il widget, scegli Modifica widget e seleziona la carta da mostrare."
          )}
        </WidgetIntroCard>
        <WidgetGenericStylePanel
          kind="fidelity"
          icon="💳"
          title="Aspetto Fidelity card"
          description="Il nome della carta resta visibile e il codice a barre occupa quasi tutta la superficie del widget."
          values={{
            textSize: widgetFidelityTextSize,
            bgAlpha: widgetFidelityBgAlpha,
            iconColor: widgetFidelityIconColor,
            titleColor: widgetFidelityTitleColor,
            textColor: widgetFidelityTextColor,
            autoUpdate: widgetFidelityAutoUpdate,
          }}
          setters={{
            setTextSize: setWidgetFidelityTextSize,
            setBgAlpha: setWidgetFidelityBgAlpha,
            setIconColor: setWidgetFidelityIconColor,
            setTitleColor: setWidgetFidelityTitleColor,
            setTextColor: setWidgetFidelityTextColor,
            setAutoUpdate: setWidgetFidelityAutoUpdate,
          }}
          onSave={save}
        />
      </div>
    );
  }

  function WidgetDebtCreditsSettingsPanel() {
    function save(extra) {
      saveWidgetSettingsToNative(true, {
        ...widgetSettingsPayload(),
        debtCreditsWidget: {
          ...widgetSettingsPayload().debtCreditsWidget,
          textSize: extra.textSize,
          bgAlpha: extra.bgAlpha,
          iconColor: widgetDebtCreditsIconColor,
          titleColor: widgetDebtCreditsTitleColor,
          textColor: widgetDebtCreditsTextColor,
          autoUpdate: !!widgetDebtCreditsAutoUpdate,
        },
      });
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <WidgetIntroCard icon="📉" title={L("Debiti / Crediti")}>
          {L(
            "Le posizioni si scelgono per ogni singolo widget dalla Home di iOS: tieni premuto il widget, scegli Modifica widget e seleziona i debiti o i crediti da mostrare."
          )}
        </WidgetIntroCard>
        <WidgetGenericStylePanel
          kind="debtCredits"
          icon="📉"
          title="Aspetto Debiti / Crediti"
          description="Il widget è disponibile anche nel formato quadrato e apre direttamente la posizione selezionata."
          values={{
            textSize: widgetDebtCreditsTextSize,
            bgAlpha: widgetDebtCreditsBgAlpha,
            iconColor: widgetDebtCreditsIconColor,
            titleColor: widgetDebtCreditsTitleColor,
            textColor: widgetDebtCreditsTextColor,
            autoUpdate: widgetDebtCreditsAutoUpdate,
          }}
          setters={{
            setTextSize: setWidgetDebtCreditsTextSize,
            setBgAlpha: setWidgetDebtCreditsBgAlpha,
            setIconColor: setWidgetDebtCreditsIconColor,
            setTitleColor: setWidgetDebtCreditsTitleColor,
            setTextColor: setWidgetDebtCreditsTextColor,
            setAutoUpdate: setWidgetDebtCreditsAutoUpdate,
          }}
          onSave={save}
        />
      </div>
    );
  }

  function WidgetShareSettingsPanel() {
    var selected =
      (shareProjects || []).find(function (p) {
        return String(p.id) === String(widgetShareSelectedProjectId);
      }) ||
      (shareProjects || []).find(function (p) {
        return String(p.id) === String(shareSelectedProjectId);
      }) ||
      (shareProjects || [])[0] ||
      null;
    var [draftBgAlpha, setDraftBgAlpha] = useState(
      numOr(widgetShareBgAlpha, 65)
    );
    function projectBalance(project) {
      if (!project)
        return { net: 0, owed: 0, owe: 0, last: "Nessuna attività recente" };
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
      (project.activities || []).forEach(function (a) {
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
      var last = (project.activities || [])[0] || null;
      return {
        net: net,
        owed: Math.max(0, net),
        owe: Math.max(0, -net),
        last: last
          ? last.kind === "settlement"
            ? "Ultimo saldo: " + fmt(Number(last.amount || 0))
            : (last.desc || "Ultima spesa") +
              " · " +
              fmt(Number(last.amount || 0))
          : "Nessuna attività recente",
      };
    }
    var preview = projectBalance(selected);
    function shareButtonRadius() {
      var x = BUTTON_STYLES.find(function (b) {
        return b.id === widgetButtonStyle;
      });
      return x ? Math.max(2, Math.round(x.r * 0.7)) : 10;
    }
    function setShareButtonStyle(styleId) {
      setWidgetButtonStyle(styleId);
      var base = widgetSettingsPayload();
      saveWidgetSettingsToNative(true, {
        ...base,
        buttonStyle: styleId,
        quickAdd: { ...(base.quickAdd || {}), buttonStyle: styleId },
        shareWidget: { ...(base.shareWidget || {}), buttonStyle: styleId },
      });
    }
    function save() {
      var rawAlpha = Number(draftBgAlpha);
      var alpha = Math.max(
        0,
        Math.min(100, Number.isFinite(rawAlpha) ? rawAlpha : 65)
      );
      setWidgetShareBgAlpha(alpha);
      saveWidgetSettingsToNative(true, {
        ...widgetSettingsPayload(),
        shareWidget: {
          ...widgetSettingsPayload().shareWidget,
          bgColor: widgetShareBgColor,
          bgAlpha: alpha,
          accentColor: widgetShareAccentColor,
          activityColor: widgetShareActivityColor,
          titleColor: widgetShareTitleColor,
          bodyColor: widgetShareBodyColor,
          buttonStyle: widgetButtonStyle,
          projectId: selected ? String(selected.id) : "",
          projectName: selected
            ? selected.name || "Progetto Share"
            : "Nessun progetto selezionato",
          autoUpdate: !!widgetShareAutoUpdate,
        },
      });
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <WidgetIntroCard icon="🤝" title="Share">
          {L(
            "Il progetto si sceglie per ogni singolo widget dalla Home di iOS: tieni premuto il widget, scegli Modifica widget e seleziona il progetto Share. Ogni widget può essere collegato a un progetto diverso."
          )}
        </WidgetIntroCard>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              background: widgetShareBgColor,
              borderRadius: 14,
              padding: 12,
              border: "1px solid rgba(255,255,255,.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <FAInanceLogo size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 900,
                    color: widgetShareTitleColor,
                  }}
                >
                  Share
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: widgetShareBodyColor,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {selected
                    ? selected.name || L("Progetto Share")
                    : L("Nessun progetto selezionato")}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div
                style={{
                  background: "rgba(255,255,255,.13)",
                  borderRadius: 12,
                  padding: 10,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, color: widgetShareBodyColor }}>
                  {L("Saldo")}
                </div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: widgetShareTitleColor,
                  }}
                >
                  {fmt(preview.net)}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: widgetShareBodyColor,
                  lineHeight: 1.8,
                }}
              >
                <div>
                  {L("Ti devono")}:{" "}
                  <strong style={{ color: widgetShareTitleColor }}>
                    {fmt(preview.owed)}
                  </strong>
                </div>
                <div>
                  {L("Devi")}:{" "}
                  <strong style={{ color: widgetShareTitleColor }}>
                    {fmt(preview.owe)}
                  </strong>
                </div>
                <div
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {preview.last}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  background: widgetShareAccentColor,
                  color: "#fff",
                  borderRadius: shareButtonRadius(),
                  padding: "9px 5px",
                  textAlign: "center",
                  fontWeight: 950,
                  fontSize: 11,
                }}
              >
                {L("Uscita")}
              </div>
              <div
                style={{
                  background: widgetShareActivityColor,
                  color: "#fff",
                  borderRadius: shareButtonRadius(),
                  padding: "9px 5px",
                  textAlign: "center",
                  fontWeight: 950,
                  fontSize: 11,
                }}
              >
                {L("Entrata")}
              </div>
              <div
                style={{
                  background: "#F29F3D",
                  color: "#fff",
                  borderRadius: shareButtonRadius(),
                  padding: "9px 5px",
                  textAlign: "center",
                  fontWeight: 950,
                  fontSize: 11,
                }}
              >
                {L("Scontrino")}
              </div>
              <div
                style={{
                  background: "#7F77DD",
                  color: "#fff",
                  borderRadius: shareButtonRadius(),
                  padding: "9px 5px",
                  textAlign: "center",
                  fontWeight: 950,
                  fontSize: 11,
                }}
              >
                {L("Voce")}
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Sfondo")}
            </div>
            <AppColorSelector
              value={widgetShareBgColor}
              onChange={function (color) {
                setWidgetShareBgColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  shareWidget: {
                    ...widgetSettingsPayload().shareWidget,
                    bgColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore Uscita")}
            </div>
            <AppColorSelector
              value={widgetShareAccentColor}
              onChange={function (color) {
                setWidgetShareAccentColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  shareWidget: {
                    ...widgetSettingsPayload().shareWidget,
                    accentColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore Entrata")}
            </div>
            <AppColorSelector
              value={widgetShareActivityColor}
              onChange={function (color) {
                setWidgetShareActivityColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  shareWidget: {
                    ...widgetSettingsPayload().shareWidget,
                    activityColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
          <div
            style={{
              background: cardBg,
              border: "1px solid " + borderC,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: textC,
                marginBottom: 8,
              }}
            >
              {L("Colore titolo")}
            </div>
            <AppColorSelector
              value={widgetShareTitleColor}
              onChange={function (color) {
                setWidgetShareTitleColor(color);
                saveWidgetSettingsToNative(false, {
                  ...widgetSettingsPayload(),
                  shareWidget: {
                    ...widgetSettingsPayload().shareWidget,
                    titleColor: color,
                  },
                });
              }}
              compact={true}
            />
          </div>
        </div>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: subC,
              marginBottom: 8,
            }}
          >
            {L("Bordi dei tasti widget")}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {BUTTON_STYLES.map(function (bs) {
              var active = widgetButtonStyle === bs.id;
              return (
                <button
                  type="button"
                  key={bs.id}
                  onClick={function () {
                    setShareButtonStyle(bs.id);
                  }}
                  style={{
                    padding: "10px",
                    border: "2px solid " + (active ? "#7F77DD" : borderC),
                    borderRadius: Math.max(6, Math.round(bs.r * 0.7)),
                    background: active
                      ? dark
                        ? "#2a2a3e"
                        : "#EEEDFE"
                      : dark
                      ? "#1e1e30"
                      : "#f9f9f9",
                    cursor: "pointer",
                    fontSize: 13,
                    color: active ? "#7F77DD" : textC,
                    fontWeight: active ? 800 : 500,
                  }}
                >
                  {L(bs.label)}
                </button>
              );
            })}
          </div>
        </div>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: textC }}>
                {L("Trasparenza sfondo widget")}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {L("100% = completamente trasparente. 0% = sfondo pieno.")}
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#7F77DD" }}>
              {draftBgAlpha}%
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={draftBgAlpha}
            onChange={function (e) {
              setDraftBgAlpha(Number(e.target.value));
            }}
            style={{ width: "100%" }}
          />
          <input
            type="number"
            min="0"
            max="100"
            value={draftBgAlpha}
            onChange={function (e) {
              setDraftBgAlpha(
                Math.max(0, Math.min(100, Number(e.target.value) || 0))
              );
            }}
            style={{ ...sinp, width: 90, marginTop: 8 }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
              {L("Aggiornamento automatico")}
            </div>
            <div style={{ fontSize: 12, color: subC }}>
              {L(
                "Aggiorna il widget quando cambiano progetti, spese o impostazioni Share."
              )}
            </div>
          </div>
          <Toggle
            label=""
            checked={!!widgetShareAutoUpdate}
            onChange={function () {
              setWidgetShareAutoUpdate(!widgetShareAutoUpdate);
            }}
          />
        </div>
        <Btn
          onClick={save}
          bg="#7F77DD"
          style={{ width: "100%", padding: 12, fontWeight: 800 }}
        >
          {L("Salva e aggiorna widget")}
        </Btn>
      </div>
    );
  }

  function GroupSettingsPanel({
    title,
    desc,
    items,
    setItems,
    defaultValue,
    setDefaultValue,
    withIcon,
  }) {
    var _gspKey = "gsp_view_" + encodeURIComponent(title || "");
    var [view, setView] = useStorage(_gspKey, "list");
    var [edit, setEdit] = useState(null);
    var [form, setForm] = useState({ name: "", icon: "📂", color: COLORS[0] });
    var [showCreate, setShowCreate] = useState(false);
    function resetCreate() {
      setForm({ name: "", icon: "📂", color: COLORS[0] });
      setShowCreate(false);
    }
    function closeEdit() {
      setEdit(null);
    }
    var groupCreateValid =
      baseSettingsAllowed && !!String(form.name || "").trim();
    var groupEditValid =
      baseSettingsAllowed && !!edit && !!String(edit.name || "").trim();
    function add() {
      if (!groupCreateValid) return;
      setItems([
        ...(items || []),
        {
          id: "area_" + Date.now(),
          name: form.name.trim(),
          icon: withIcon ? form.icon : undefined,
          color: form.color,
        },
      ]);
      resetCreate();
    }
    function save() {
      if (!groupEditValid) return;
      setItems(
        items.map(function (x) {
          return x.id === edit.id
            ? {
                ...x,
                name: edit.name.trim(),
                icon: withIcon ? edit.icon : x.icon,
                color: edit.color || COLORS[0],
              }
            : x;
        })
      );
      closeEdit();
    }
    function del(id) {
      if (blockSetting("base")) return;
      setItems(
        items.filter(function (x) {
          return x.id !== id;
        })
      );
      if (String(defaultValue) === String(id)) setDefaultValue("");
    }
    function archive(id) {
      if (blockSetting("base")) return;
      setItems(
        items.map(function (x) {
          return x.id === id ? { ...x, archived: !x.archived } : x;
        })
      );
    }
    function openEdit(item) {
      if (blockSetting("base")) return;
      setEdit({
        ...item,
        icon: item.icon || "📂",
        color: item.color || COLORS[0],
      });
    }
    function GroupModal({ mode }) {
      var editing = mode === "edit";
      var value = editing ? edit : form;
      var valid = editing ? groupEditValid : groupCreateValid;
      var close = editing ? closeEdit : resetCreate;
      var submit = editing ? save : add;
      if (!value) return null;
      return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.58)",
            zIndex: 980,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "7vh 16px 3vh",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
          onMouseDown={function (e) {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 500,
              background: cardBg,
              borderRadius: 22,
              border: "1px solid " + borderC,
              boxShadow: "0 18px 65px rgba(0,0,0,0.38)",
              padding: "20px 18px 18px",
            }}
          >
            <button
              type="button"
              onClick={close}
              aria-label={L("Chiudi")}
              style={{
                position: "absolute",
                right: 14,
                top: 14,
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "none",
                background: "#E24B4A",
                color: "#fff",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: "32px",
                cursor: "pointer",
                boxShadow: "0 5px 14px rgba(226,75,74,.28)",
              }}
            >
              ×
            </button>
            <div
              style={{
                fontSize: 18,
                fontWeight: 950,
                color: textC,
                marginBottom: 16,
                paddingRight: 44,
              }}
            >
              {L(editing ? "Modifica area" : "Nuova area")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 13,
                ...baseDisabledStyle(),
              }}
            >
              {withIcon ? (
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
                      {L("Icona")}
                    </div>
                    <EmojiPicker
                      value={value.icon || "📂"}
                      onChange={function (v) {
                        if (blockSetting("base")) return;
                        if (editing)
                          setEdit(function (p) {
                            return { ...p, icon: v };
                          });
                        else
                          setForm(function (p) {
                            return { ...p, icon: v };
                          });
                      }}
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
                      {L("Colore")}
                    </div>
                    <AppColorSelector
                      value={value.color || COLORS[0]}
                      disabled={!baseSettingsAllowed}
                      onChange={function (color) {
                        if (blockSetting("base")) return;
                        if (editing)
                          setEdit(function (p) {
                            return { ...p, color: color };
                          });
                        else
                          setForm(function (p) {
                            return { ...p, color: color };
                          });
                      }}
                      compact={true}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 850,
                      color: subC,
                      marginBottom: 6,
                    }}
                  >
                    {L("Colore")}
                  </div>
                  <AppColorSelector
                    value={value.color || COLORS[0]}
                    disabled={!baseSettingsAllowed}
                    onChange={function (color) {
                      if (blockSetting("base")) return;
                      if (editing)
                        setEdit(function (p) {
                          return { ...p, color: color };
                        });
                      else
                        setForm(function (p) {
                          return { ...p, color: color };
                        });
                    }}
                    compact={true}
                  />
                </div>
              )}
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 850,
                    color: subC,
                    marginBottom: 6,
                  }}
                >
                  {L("Nome area")}
                </div>
                <input
                  autoFocus
                  disabled={!baseSettingsAllowed}
                  placeholder={L("Nome area")}
                  value={value.name || ""}
                  onChange={function (e) {
                    if (blockSetting("base")) return;
                    if (editing)
                      setEdit(function (p) {
                        return { ...p, name: e.target.value };
                      });
                    else
                      setForm(function (p) {
                        return { ...p, name: e.target.value };
                      });
                  }}
                  onKeyDown={function (e) {
                    if (e.key === "Enter" && valid) submit();
                  }}
                  style={{ ...sinp, width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
              <Btn
                onClick={submit}
                disabled={!valid}
                bg={valid ? confirmButtonColor || "#7F77DD" : "#A8A8A8"}
                style={{ flex: 1, padding: 12, fontWeight: 950 }}
              >
                {L("Salva")}
              </Btn>
              <Btn
                onClick={close}
                bg={dark ? "#333" : "#f0f0f0"}
                color={textC}
                style={{ padding: "12px 16px", fontWeight: 900 }}
              >
                {L("Annulla")}
              </Btn>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div>
        <PageHeader title={title} />
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
              fontSize: 14,
              fontWeight: 700,
              color: textC,
              marginBottom: 4,
            }}
          >
            {L(title)}
          </div>
          <SettingHint>{desc}</SettingHint>
          <Segmented
            items={[
              { id: "list", label: "Lista" },
              {
                id: "order",
                label: "Riordina",
                disabled: !baseSettingsAllowed,
                lockedMessage: settingLockedMessage("base"),
              },
              { id: "default", label: "Default" },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(function (a) {
                return (
                  <div
                    key={a.id}
                    style={{
                      background: cardBg,
                      borderRadius: 12,
                      border: "1px solid " + borderC,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      opacity: a.archived ? 0.55 : 1,
                    }}
                  >
                    {withIcon && (
                      <span style={{ display: "inline-flex" }}>
                        <FainanceIcon value={a.icon || "📂"} size={22} />
                      </span>
                    )}
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: a.color || COLORS[0],
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: textC,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {L(a.name)}
                      </div>
                      {a.archived && (
                        <div style={{ fontSize: 11, color: subC }}>
                          {L("Archiviata")}
                        </div>
                      )}
                    </div>
                    <button
                      disabled={!baseSettingsAllowed}
                      onClick={function () {
                        openEdit(a);
                      }}
                      style={{
                        background: "#EEF4FF",
                        border: "1px solid #BFD7FF",
                        borderRadius: 8,
                        cursor: baseSettingsAllowed ? "pointer" : "not-allowed",
                        fontSize: 14,
                        color: "#378ADD",
                        padding: "5px 8px",
                        fontWeight: 700,
                        opacity: baseSettingsAllowed ? 1 : 0.45,
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      disabled={!baseSettingsAllowed}
                      onClick={function () {
                        archive(a.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: baseSettingsAllowed ? "pointer" : "not-allowed",
                        fontSize: 16,
                        color: subC,
                        opacity: baseSettingsAllowed ? 1 : 0.45,
                      }}
                    >
                      {a.archived ? "📂" : "🗂"}
                    </button>
                    <button
                      disabled={!baseSettingsAllowed}
                      onClick={function () {
                        del(a.id);
                      }}
                      style={{
                        background: "#FFF0F0",
                        border: "1px solid #FFD0D0",
                        borderRadius: 8,
                        cursor: baseSettingsAllowed ? "pointer" : "not-allowed",
                        fontSize: 14,
                        color: "#E24B4A",
                        padding: "5px 8px",
                        fontWeight: 700,
                        opacity: baseSettingsAllowed ? 1 : 0.45,
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
              {baseLockHint(
                "Modifica, archiviazione, eliminazione e aggiunta disponibili dal piano Base"
              )}
              <button
                type="button"
                onClick={function () {
                  if (blockSetting("base")) return;
                  setShowCreate(true);
                }}
                style={{
                  width: "100%",
                  marginTop: 8,
                  background: baseSettingsAllowed
                    ? confirmButtonColor || "#7F77DD"
                    : "#EF9F27",
                  color: "#fff",
                  border: "none",
                  borderRadius: btnRadius,
                  padding: "13px 16px",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 900,
                }}
              >
                ＋ {L("Nuova area")}
              </button>
            </div>
          )}
          {view === "order" && (
            <SortableRows
              items={items}
              onMove={function (i, dir) {
                if (blockSetting("base")) return;
                var j = i + dir;
                if (j < 0 || j >= items.length) return;
                var arr = items.slice();
                var tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
                setItems(arr);
              }}
              renderItem={function (a) {
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    {withIcon && (
                      <span style={{ display: "inline-flex" }}>
                        <FainanceIcon value={a.icon || "📂"} size={20} />
                      </span>
                    )}
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: a.color || COLORS[0],
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: textC,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {L(a.name)}
                    </span>
                  </div>
                );
              }}
            />
          )}
          {view === "default" && (
            <select
              value={defaultValue || ""}
              onChange={function (e) {
                setDefaultValue(e.target.value);
              }}
              style={{ ...sinp, width: "100%" }}
            >
              <option value="">{L("Nessuna area default")}</option>
              {items
                .filter(function (a) {
                  return !a.archived;
                })
                .map(function (a) {
                  return (
                    <option key={a.id} value={a.id}>
                      {withIcon ? (a.icon || "📂") + " " : ""}
                      {L(a.name)}
                    </option>
                  );
                })}
            </select>
          )}
          {showCreate && <GroupModal mode="create" />}
          {edit && <GroupModal mode="edit" />}
        </div>
      </div>
    );
  }
  function categoryMergeConfirmation(items, fromId, toId) {
    var source = (items || []).find(function (item) {
      return String(item && item.id) === String(fromId);
    });
    var target = (items || []).find(function (item) {
      return String(item && item.id) === String(toId);
    });
    var fromName = translateUiRuntimeText(
      source && source.name ? source.name : String(fromId)
    );
    var toName = translateUiRuntimeText(
      target && target.name ? target.name : String(toId)
    );
    return String(
      L(
        "Confermi l’accorpamento? Tutti i movimenti della categoria “{from}” saranno assegnati a “{to}”. La categoria “{from}” verrà eliminata."
      )
    )
      .replace(/\{from\}/g, fromName)
      .replace(/\{to\}/g, toName);
  }
  function ExpenseCategoriesSettings() {
    var [view, setView] = useStorage(
      userKey("expense_cats_settings_view_v1"),
      "list"
    );
    var activeCats = (cats || []).filter(function (c) {
      return !c.deleted && !c.archived;
    });
    var validCatIds = activeCats.map(function (c) {
      return String(c.id);
    });
    var rawCatOrder = (catOrder || []).map(function (id) {
      return String(id);
    });
    var cleanCatOrder = rawCatOrder.filter(function (id, i, arr) {
      return validCatIds.indexOf(id) >= 0 && arr.indexOf(id) === i;
    });
    useEffect(
      function () {
        if (rawCatOrder.join("|") !== cleanCatOrder.join("|"))
          setCatOrder(cleanCatOrder);
      },
      [cats, catOrder]
    );
    var ordered = cleanCatOrder.length
      ? cleanCatOrder
          .map(function (id) {
            return activeCats.find(function (c) {
              return String(c.id) === id;
            });
          })
          .filter(Boolean)
          .concat(
            activeCats.filter(function (c) {
              return cleanCatOrder.indexOf(String(c.id)) < 0;
            })
          )
      : activeCats;
    return (
      <div>
        <PageHeader title={L("Uscite / Categorie")} />
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: "1px solid " + borderC,
            padding: 20,
          }}
        >
          <SettingHint>
            {L(
              "Gestisci categorie uscite: lista, riordino, default e accorpamento."
            )}
          </SettingHint>
          <Segmented
            items={[
              { id: "list", label: "Lista categorie" },
              {
                id: "order",
                label: "Riordina",
                disabled: !baseSettingsAllowed,
                lockedMessage: settingLockedMessage("base"),
              },
              { id: "default", label: "Default" },
              {
                id: "merge",
                label: "Accorpa",
                disabled: !baseSettingsAllowed,
                lockedMessage: settingLockedMessage("base"),
              },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "list" && (
            <>
              <SettingsList
                items={cats}
                setItems={guardedSetter(setExpenseCatsFromSettings, "base")}
                label="Aggiungi categoria uscita"
                showGroup
                showIcon
                groupList={expenseGroups || DEFAULT_EXPENSE_GROUPS}
                usageScope="expenseCategory"
              />
              {baseLockHint(
                "Modifica, archiviazione, eliminazione e aggiunta categorie disponibili dal piano Base"
              )}
            </>
          )}{" "}
          {view === "order" && (
            <SortableRows
              items={ordered}
              onMove={function (i, dir) {
                if (blockSetting("base")) return;
                var j = i + dir;
                if (j < 0 || j >= ordered.length) return;
                var arr = ordered.slice();
                var tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
                setCatOrder(
                  arr.map(function (c) {
                    return String(c.id);
                  })
                );
                setCatSortMode("custom");
                setCats(
                  arr.concat(
                    cats.filter(function (c) {
                      return (
                        arr.findIndex(function (x) {
                          return String(x.id) === String(c.id);
                        }) < 0
                      );
                    })
                  )
                );
              }}
              renderItem={function (c) {
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: textC,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {L(c.name)}
                    </span>
                  </div>
                );
              }}
            />
          )}
          {view === "default" && (
            <div>
              <select
                value={defaultExpenseCat || ""}
                onChange={function (e) {
                  setDefaultExpenseCat(e.target.value);
                }}
                style={{ ...sinp, width: "100%" }}
              >
                <option value="">{L("Nessuna categoria default")}</option>
                {activeCats.map(function (c) {
                  return (
                    <option key={c.id} value={c.id}>
                      {c.icon} {L(c.name)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          {view === "merge" && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: subC,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {L("Da (elimina)")}
                </label>
                <select
                  value={mergeFrom}
                  onChange={function (e) {
                    setMergeFrom(e.target.value);
                  }}
                  style={sinp}
                >
                  <option value="">-</option>
                  {activeCats.map(function (c) {
                    return (
                      <option key={c.id} value={c.id}>
                        {c.icon} {L(c.name)}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: subC,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {L("In (mantieni)")}
                </label>
                <select
                  value={mergeTo}
                  onChange={function (e) {
                    setMergeTo(e.target.value);
                  }}
                  style={sinp}
                >
                  <option value="">-</option>
                  {activeCats
                    .filter(function (c) {
                      return String(c.id) !== mergeFrom;
                    })
                    .map(function (c) {
                      return (
                        <option key={c.id} value={c.id}>
                          {c.icon} {L(c.name)}
                        </option>
                      );
                    })}
                </select>
              </div>
              <Btn
                onClick={function () {
                  if (blockSetting("base")) return;
                  if (!mergeFrom || !mergeTo) return;
                  var from = String(mergeFrom),
                    to = String(mergeTo);
                  if (
                    !window.confirm(
                      categoryMergeConfirmation(activeCats, from, to)
                    )
                  )
                    return;
                  setExpenses(
                    expenses.map(function (e) {
                      return String(e.catId || e.categoryId || "") === from
                        ? { ...e, catId: to, categoryId: to }
                        : e;
                    })
                  );
                  setRecurring(
                    (recurring || []).map(function (r) {
                      return String(r.catId || r.categoryId || "") === from
                        ? { ...r, catId: to, categoryId: to }
                        : r;
                    })
                  );
                  setCats(
                    cats.filter(function (c) {
                      return String(c.id) !== from;
                    })
                  );
                  setCatOrder(function (prev) {
                    return (prev || []).filter(function (id) {
                      return String(id) !== from;
                    });
                  });
                  setFilterCats(function (prev) {
                    return (prev || [])
                      .map(function (id) {
                        var sid = String(id);
                        if (sid === from) return to;
                        if (sid === "expense:" + from) return "expense:" + to;
                        return sid;
                      })
                      .filter(function (id, i, arr) {
                        return arr.indexOf(id) === i;
                      });
                  });
                  if (String(defaultExpenseCat || "") === from)
                    setDefaultExpenseCat(to);
                  setMergeFrom("");
                  setMergeTo("");
                  setToast &&
                    setToast({
                      text: L("Categorie accorpate correttamente."),
                      type: "success",
                      icon: "🔗",
                    });
                }}
                style={{
                  width: "100%",
                  padding: 13,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {L("Accorpa")}
              </Btn>
            </div>
          )}
        </div>
      </div>
    );
  }
  function ExpenseMethodsSettings() {
    var [view, setView] = useStorage(
      userKey("expense_methods_settings_view_v1"),
      "list"
    );
    var activeMethods = (methods || []).filter(function (m) {
      return !m.deleted && !m.archived;
    });
    var ordered =
      methodOrder && methodOrder.length
        ? methodOrder
            .map(function (id) {
              return activeMethods.find(function (m) {
                return String(m.id) === String(id);
              });
            })
            .filter(Boolean)
            .concat(
              activeMethods.filter(function (m) {
                return methodOrder.map(String).indexOf(String(m.id)) < 0;
              })
            )
        : activeMethods;
    return (
      <div>
        <PageHeader title="Uscite / Metodi di pagamento" />
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: "1px solid " + borderC,
            padding: 20,
          }}
        >
          <SettingHint>
            Gestisci metodi di pagamento: lista, riordino e default.
          </SettingHint>
          <Segmented
            items={[
              { id: "list", label: "Lista" },
              {
                id: "order",
                label: "Riordina",
                disabled: !baseSettingsAllowed,
                lockedMessage: settingLockedMessage("base"),
              },
              { id: "default", label: "Default" },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "list" && (
            <div>
              <SettingsList
                items={methods}
                setItems={guardedSetter(setMethods, "base")}
                label="Aggiungi metodo di pagamento"
                showIcon
                showGroup
                groupList={methodGroups}
                isMethod
                usageScope="method"
              />
              {baseLockHint(
                "Modifica, archiviazione, ripristino, riordino e aggiunta metodi disponibili dal piano Base"
              )}
              <div style={{ fontSize: 12, color: subC, marginTop: 8 }}>
                🗂 = {L("Archivia")} 📂 = {L("Ripristina")}
              </div>
            </div>
          )}
          {view === "order" && (
            <SortableRows
              items={ordered}
              onMove={function (i, dir) {
                if (blockSetting("base")) return;
                var j = i + dir;
                if (j < 0 || j >= ordered.length) return;
                var arr = ordered.slice();
                var tmp = arr[i];
                arr[i] = arr[j];
                arr[j] = tmp;
                setMethodOrder(
                  arr.map(function (m) {
                    return String(m.id);
                  })
                );
                setMethodSortMode("custom");
                setMethods(
                  arr.concat(
                    methods.filter(function (m) {
                      return (
                        arr.findIndex(function (x) {
                          return String(x.id) === String(m.id);
                        }) < 0
                      );
                    })
                  )
                );
              }}
              renderItem={function (m) {
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{m.icon}</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: textC,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {L(m.name)}
                    </span>
                  </div>
                );
              }}
            />
          )}
          {view === "default" && (
            <select
              value={defaultExpenseMethod || ""}
              onChange={function (e) {
                setDefaultExpenseMethod(e.target.value);
              }}
              style={{ ...sinp, width: "100%" }}
            >
              <option value="">{L("Nessun metodo default")}</option>
              {activeMethods.map(function (m) {
                return (
                  <option key={m.id} value={m.id}>
                    {m.icon} {L(m.name)}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </div>
    );
  }
  function IncomeCategoriesSettings() {
    var [view, setView] = useStorage(
      userKey("income_cats_settings_view_v1"),
      "list"
    );
    var groups = incomeGroups || DEFAULT_INCOME_GROUPS;
    function incomeDefaultGroup(id) {
      if (id === "azioni") return "investimenti";
      if (id === "extra") return "extra_inc";
      if (id === "conti") return "investimenti";
      return "lavoro";
    }
    var validIncomeIds = incomeTypes.map(function (x) {
      return String(x.id);
    });
    var cleanOrder = incomeTypeOrder.filter(function (id) {
      return validIncomeIds.indexOf(String(id)) >= 0;
    });
    if (cleanOrder.length !== incomeTypeOrder.length) {
      setIncomeTypeOrder(cleanOrder);
    }
    var orderedRaw = cleanOrder.length
      ? cleanOrder
          .map(function (id) {
            return incomeTypes.find(function (x) {
              return String(x.id) === String(id);
            });
          })
          .filter(Boolean)
          .concat(
            incomeTypes.filter(function (x) {
              return cleanOrder.map(String).indexOf(String(x.id)) < 0;
            })
          )
      : incomeTypes;
    var ordered = orderedRaw.map(function (it) {
      return {
        ...it,
        group: it.group || incomeDefaultGroup(it.id),
        color: it.color || "#5DCAA5",
        icon: it.icon || "💰",
      };
    });
    function setIncomeItems(nextItems) {
      var nextCustom = [];
      var nextOverrides = { ...incomeTypeOverrides };
      var nextOrder = [];
      var nextIds = (nextItems || []).map(function (it) {
        return String(it.id);
      });
      orderedRaw.forEach(function (oldItem) {
        if (nextIds.indexOf(String(oldItem.id)) >= 0) return;
        var isBaseMissing = INCOME_TYPES.some(function (b) {
          return String(b.id) === String(oldItem.id);
        });
        var used = (incomes || []).some(function (x) {
          return String(x.type) === String(oldItem.id);
        });
        if (used) {
          if (setToast)
            setToast({
              text: L(
                "Non puoi eliminare questa voce perché esistono già elementi associati. Archiviala invece di eliminarla."
              ),
              type: "warning",
              color: "#EF9F27",
              icon: "⚠️",
            });
          nextItems = [...(nextItems || []), { ...oldItem, archived: true }];
        } else if (isBaseMissing) {
          nextOverrides[oldItem.id] = {
            ...(nextOverrides[oldItem.id] || {}),
            deleted: true,
            archived: true,
          };
        }
      });
      (nextItems || []).forEach(function (it) {
        nextOrder.push(it.id);
        var clean = {
          name: it.name,
          icon: it.icon || "💰",
          color: it.color || "#5DCAA5",
          group: it.group || (groups[0] ? groups[0].id : "lavoro"),
          archived: !!it.archived,
          deleted: false,
        };
        var isBase = INCOME_TYPES.some(function (b) {
          return b.id === it.id;
        });
        if (isBase) {
          nextOverrides[it.id] = clean;
        } else {
          nextCustom.push({ ...it, ...clean, custom: true });
        }
      });
      setIncomeTypeOverrides(nextOverrides);
      setCustomIncomeTypes(nextCustom);
      setIncomeTypeOrder(nextOrder);
    }
    function moveIncome(i, dir) {
      if (blockSetting("base")) return;
      var j = i + dir;
      if (j < 0 || j >= ordered.length) return;
      var arr = ordered.slice();
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
      setIncomeTypeOrder(
        arr.map(function (x) {
          return x.id;
        })
      );
    }
    function mergeIncomeCategories() {
      if (blockSetting("base")) return;
      if (!mergeFrom || !mergeTo || String(mergeFrom) === String(mergeTo))
        return;
      var from = String(mergeFrom),
        to = String(mergeTo);
      if (!window.confirm(categoryMergeConfirmation(ordered, from, to))) return;
      function replaceRef(obj, keys) {
        var changed = false;
        var next = { ...obj };
        keys.forEach(function (k) {
          if (String(next[k] || "") === from) {
            next[k] = to;
            changed = true;
          }
        });
        return changed ? next : obj;
      }
      setIncomes(
        (incomes || []).map(function (e) {
          return replaceRef(e, [
            "type",
            "incomeType",
            "typeId",
            "catId",
            "categoryId",
          ]);
        })
      );
      setRecurring(
        (recurring || []).map(function (e) {
          return String(e.rtype || "") === "income"
            ? replaceRef(e, [
                "type",
                "incomeType",
                "typeId",
                "catId",
                "categoryId",
              ])
            : e;
        })
      );
      setIncomeItems(
        ordered.filter(function (it) {
          return String(it.id) !== from;
        })
      );
      setIncomeTypeOrder(function (prev) {
        return (prev || []).filter(function (id) {
          return String(id) !== from;
        });
      });
      setFilterCats(function (prev) {
        return (prev || [])
          .map(function (id) {
            var sid = String(id);
            if (sid === from) return to;
            if (sid === "income:" + from) return "income:" + to;
            return sid;
          })
          .filter(function (id, i, arr) {
            return arr.indexOf(id) === i;
          });
      });
      if (String(defaultIncomeType || "") === from) setDefaultIncomeType(to);
      setMergeFrom("");
      setMergeTo("");
      setToast &&
        setToast({
          text: L("Categorie accorpate correttamente."),
          type: "success",
          icon: "🔗",
        });
    }
    return (
      <div>
        <PageHeader title={L("Entrate / Categorie")} />
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: "1px solid " + borderC,
            padding: 20,
          }}
        >
          <SettingHint>
            {L(
              "Gestisci le categorie delle entrate con la stessa interfaccia delle altre liste: modifica, archivia, cancella, riordina, default e accorpamento."
            )}
          </SettingHint>
          <Segmented
            items={[
              { id: "list", label: "Lista categorie" },
              {
                id: "order",
                label: "Riordina",
                disabled: !baseSettingsAllowed,
                lockedMessage: settingLockedMessage("base"),
              },
              { id: "default", label: "Default" },
              {
                id: "merge",
                label: "Accorpa",
                disabled: !baseSettingsAllowed,
                lockedMessage: settingLockedMessage("base"),
              },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "list" && (
            <>
              <SettingsList
                items={ordered}
                setItems={guardedSetter(setIncomeItems, "base")}
                label="Aggiungi categoria entrata"
                showIcon
                showGroup
                groupList={groups}
                usageScope="incomeCategory"
              />
              {baseLockHint(
                "Modifica, archiviazione, eliminazione e aggiunta categorie disponibili dal piano Base"
              )}
            </>
          )}
          {view === "order" && (
            <SortableRows
              items={ordered}
              onMove={moveIncome}
              renderItem={function (it) {
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{it.icon || "💰"}</span>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: it.color || "#5DCAA5",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        color: textC,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {translateUiRuntimeText(it.name)}
                    </span>
                    {it.archived && (
                      <span
                        style={{
                          fontSize: 10,
                          background: dark ? "#333" : "#f0f0f0",
                          color: subC,
                          borderRadius: 10,
                          padding: "1px 6px",
                        }}
                      >
                        {L("Archiviato")}
                      </span>
                    )}
                  </div>
                );
              }}
            />
          )}
          {view === "default" && (
            <select
              value={defaultIncomeType || ""}
              onChange={function (e) {
                setDefaultIncomeType(e.target.value);
              }}
              style={{ ...sinp, width: "100%" }}
            >
              <option value="">{L("Nessuna categoria default")}</option>
              {ordered
                .filter(function (it) {
                  return !it.archived;
                })
                .map(function (it) {
                  return (
                    <option key={it.id} value={it.id}>
                      {it.icon} {translateUiRuntimeText(it.name)}
                    </option>
                  );
                })}
            </select>
          )}
          {view === "merge" && (
            <div>
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: subC,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {L("Da (elimina)")}
                </label>
                <select
                  value={mergeFrom}
                  onChange={function (e) {
                    setMergeFrom(e.target.value);
                  }}
                  style={sinp}
                >
                  <option value="">-</option>
                  {ordered
                    .filter(function (it) {
                      return !it.archived;
                    })
                    .map(function (it) {
                      return (
                        <option key={it.id} value={it.id}>
                          {it.icon || "💰"} {translateUiRuntimeText(it.name)}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: subC,
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {L("In (mantieni)")}
                </label>
                <select
                  value={mergeTo}
                  onChange={function (e) {
                    setMergeTo(e.target.value);
                  }}
                  style={sinp}
                >
                  <option value="">-</option>
                  {ordered
                    .filter(function (it) {
                      return (
                        !it.archived && String(it.id) !== String(mergeFrom)
                      );
                    })
                    .map(function (it) {
                      return (
                        <option key={it.id} value={it.id}>
                          {it.icon || "💰"} {translateUiRuntimeText(it.name)}
                        </option>
                      );
                    })}
                </select>
              </div>
              <Btn
                onClick={mergeIncomeCategories}
                style={{
                  width: "100%",
                  padding: 13,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {L("Accorpa")}
              </Btn>
            </div>
          )}
        </div>
      </div>
    );
  }
  var [pendingLang, setPendingLang] = useState(lang);
  useEffect(
    function () {
      setPendingLang(lang);
    },
    [lang]
  );
  if (!settingsPage) return <SettingsMenu />;
  if (settingsPage === "profile")
    return (
      <div>
        <PageHeader title="Profilo" />
        <ProfileCard
          currentUser={currentUser}
          onLogout={onLogout}
          dark={dark}
          textC={textC}
          subC={subC}
          borderC={borderC}
          cardBg={cardBg}
          btnRadius={btnRadius}
          dateFmt={dateFmt}
          setToast={setToast}
          fbDb={fbDb}
          onProfileUpdate={onProfileUpdate}
          onRequestAccountDeletion={requestCurrentAccountDeletion}
          onCancelAccountDeletion={cancelCurrentAccountDeletion}
          lang={lang}
          confirmButtonColor={confirmButtonColor}
          secondaryButtonColor={secondaryButtonColor}
        />
      </div>
    );

  function SecuritySettingsPage() {
    var timeoutItems = [
      { id: "0", label: "Subito" },
      { id: "1", label: "1 minuto" },
      { id: "5", label: "5 minuti" },
      { id: "15", label: "15 minuti" },
    ];
    var methods = [
      {
        id: "biometric",
        icon: "👆",
        label: "Biometria",
        desc: "Impronta, Face ID o codice dispositivo",
      },
      {
        id: "password",
        icon: "🔑",
        label: "Password account",
        desc: "Usa la stessa password dell’account email",
      },
      {
        id: "pin",
        icon: "🔢",
        label: "PIN 4 numeri",
        desc: "Codice locale di 4 cifre",
      },
    ];
    function methodBtn(m) {
      var active = localLockMethod === m.id;
      return (
        <button
          key={m.id}
          type="button"
          onClick={function () {
            setLocalLockMethod(m.id);
            setBiometricLockMessage("");
          }}
          style={{
            textAlign: "left",
            border: "1px solid " + (active ? confirmButtonColor : borderC),
            background: active
              ? confirmButtonColor + "18"
              : dark
              ? "#252535"
              : "#fff",
            color: textC,
            borderRadius: 14,
            padding: "12px 13px",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, marginBottom: 3 }}>
            {m.icon} {L(m.label)}
          </div>
          <div style={{ fontSize: 11, color: subC, lineHeight: 1.35 }}>
            {L(m.desc)}
          </div>
        </button>
      );
    }
    function savePin() {
      var clean = String(
        (securityPinDraftRef && securityPinDraftRef.current) ||
          securityPinDraft ||
          ""
      )
        .replace(/\D/g, "")
        .slice(0, 4);
      if (!/^\d{4}$/.test(clean)) {
        setToast({
          text: L("Il PIN deve contenere 4 numeri."),
          type: "error",
          icon: "🚫",
          color: "#E24B4A",
        });
        return;
      }
      if (localLockPin && clean === String(localLockPin)) {
        setToast({
          text: L("Il nuovo PIN deve essere diverso da quello attuale."),
          type: "error",
          icon: "🚫",
          color: "#E24B4A",
          duration: 4200,
        });
        return;
      }
      setLocalLockPin(clean);
      securityPinDraftRef.current = "";
      setSecurityPinDraft("");
      var pinSavedMessages: any = {
        it: "PIN salvato",
        en: "PIN saved",
        es: "PIN guardado",
        fr: "PIN enregistré",
        de: "PIN gespeichert",
        pt: "PIN guardado",
        pl: "PIN zapisany",
        nl: "PIN opgeslagen",
        ro: "PIN salvat",
        el: "Το PIN αποθηκεύτηκε",
      };
      var pinSavedLang = String(lang || "it")
        .toLowerCase()
        .slice(0, 2);
      setToast({
        text: pinSavedMessages[pinSavedLang] || pinSavedMessages.it,
        type: "success",
        icon: "🔢",
        translated: true,
      });
    }
    return (
      <div>
        <PageHeader title="Sicurezza" />
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
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color: textC,
                    marginBottom: 4,
                  }}
                >
                  🔐 {L("Proteggi l’app")}
                </div>
                <div style={{ fontSize: 13, color: subC, lineHeight: 1.45 }}>
                  {L(
                    "Scegli se sbloccare fAInance con biometria, password dell’account o PIN di 4 numeri."
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={function () {
                  handleBiometricToggle(!biometricLockEnabled);
                }}
                disabled={biometricChecking}
                aria-label={L("Proteggi l’app")}
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  border: "none",
                  padding: 3,
                  background: biometricLockEnabled
                    ? "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))"
                    : dark
                    ? "#4b4b5f"
                    : "#d4d4d8",
                  cursor: biometricChecking ? "not-allowed" : "pointer",
                  opacity: biometricChecking ? 0.65 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: biometricLockEnabled
                    ? "flex-end"
                    : "flex-start",
                  transition: "all .2s ease",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    display: "block",
                    boxShadow: "0 2px 6px rgba(0,0,0,.18)",
                  }}
                />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
                gap: 10,
              }}
            >
              {methods.map(methodBtn)}
            </div>
            <div
              style={{
                display: localLockMethod === "pin" ? "block" : "none",
                marginTop: 12,
                background: dark ? "#1e1e30" : "#F8FAFF",
                border: "1px solid " + borderC,
                borderRadius: 14,
                padding: 12,
              }}
            >
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: subC,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                {L("PIN di 4 numeri")}
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                }}
              >
                <input
                  value={securityPinDraft}
                  onChange={function (e) {
                    var next = String(e.currentTarget.value || "")
                      .replace(/\D/g, "")
                      .slice(0, 4);
                    securityPinDraftRef.current = next;
                    setSecurityPinDraft(next);
                  }}
                  onFocus={function (e) {
                    e.stopPropagation();
                  }}
                  inputMode="numeric"
                  type="text"
                  maxLength={4}
                  autoComplete="off"
                  placeholder={localLockPin ? "••••" : "1234"}
                  style={{
                    ...sinp,
                    width: "100%",
                    fontSize: 18,
                    textAlign: "center",
                    letterSpacing: 6,
                  }}
                />
                <Btn onClick={savePin} bg={confirmButtonColor}>
                  {L("Salva PIN")}
                </Btn>
              </div>
              {localLockPin && (
                <div
                  style={{
                    fontSize: 11,
                    color: "#1D9E75",
                    fontWeight: 800,
                    marginTop: 7,
                  }}
                >
                  ✅ {L("PIN configurato")}
                </div>
              )}
            </div>
            {localLockMethod === "password" && (
              <div
                style={{
                  fontSize: 12,
                  color: subC,
                  lineHeight: 1.4,
                  marginTop: 12,
                }}
              >
                {L(
                  "La password dell’account funziona per gli account creati con email e password. Gli account Google o Apple possono non avere una password fAInance verificabile localmente."
                )}
              </div>
            )}
            {biometricChecking && (
              <div style={{ fontSize: 12, color: subC, marginTop: 10 }}>
                ⏳ {L("Controllo in corso...")}
              </div>
            )}
            {biometricLockMessage && (
              <div
                style={{
                  fontSize: 12,
                  color: "#E24B4A",
                  marginTop: 10,
                  lineHeight: 1.35,
                }}
              >
                {L(biometricLockMessage)}
              </div>
            )}
          </div>
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 20,
              opacity: biometricLockEnabled ? 1 : 0.55,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: textC,
                marginBottom: 4,
              }}
            >
              ⏱️ {L("Richiedi blocco al ritorno nell’app")}
            </div>
            <div
              style={{
                fontSize: 12,
                color: subC,
                marginBottom: 12,
                lineHeight: 1.4,
              }}
            >
              {L(
                "Dopo quanto tempo in background fAInance deve bloccarsi di nuovo."
              )}
            </div>
            <Segmented
              items={timeoutItems}
              value={String(biometricLockTimeout)}
              onChange={function (v) {
                setBiometricLockTimeout(Number(v));
                setToast(L("Impostazioni aggiornate"));
              }}
            />
          </div>
          <div
            style={{
              background: dark ? "#24213a" : "#F0EDFF",
              border: "1px solid " + (dark ? "#3d376a" : "#D8D2FF"),
              borderRadius: 14,
              padding: 14,
              fontSize: 12,
              color: dark ? "#D8D2FF" : "#534AB7",
              lineHeight: 1.45,
            }}
          >
            {L(
              "Il blocco locale non sostituisce il login Google, Apple o email: protegge solo l’accesso ai dati già disponibili sul dispositivo."
            )}
          </div>
          <AccountSecurityCenter
            currentUser={currentUser}
            dark={dark}
            textC={textC}
            subC={subC}
            borderC={borderC}
            cardBg={cardBg}
            btnRadius={btnRadius}
            translate={L}
            setToast={setToast}
            onRequestAccountDeletion={requestCurrentAccountDeletion}
            onCancelAccountDeletion={cancelCurrentAccountDeletion}
            onLogout={onLogout}
            showDevices={true}
            showDeletion={false}
          />
        </div>
      </div>
    );
  }

  if (settingsPage === "security")
    return (
      <StableNestedPanelHost
        key="settings-security"
        render={function () {
          return SecuritySettingsPage();
        }}
      />
    );

  if (settingsPage === "general")
    return (
      <div>
        <PageHeader title="Generale" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid " + borderC,
            }}
          >
            {[
              {
                label: "🌐 Lingua",
                el: (
                  <div>
                    <select
                      value={pendingLang}
                      onChange={function (e) {
                        setPendingLang(e.target.value);
                      }}
                      style={{ ...sinp, width: "100%", marginBottom: 8 }}
                    >
                      {LANGUAGES.map(function (l) {
                        return (
                          <option key={l.code} value={l.code}>
                            {l.label}
                          </option>
                        );
                      })}
                    </select>
                    <Btn
                      onClick={function () {
                        var nextLang = pendingLang;
                        setLang(nextLang);
                        try {
                          localStorage.setItem(
                            "pref_lang_v2",
                            JSON.stringify(nextLang)
                          );
                        } catch (e) {}
                        setToast({
                          text: translateFainanceText(
                            "Lingua aggiornata",
                            nextLang
                          ),
                          type: "success",
                          translated: true,
                        });
                      }}
                      bg="#7F77DD"
                      style={{ width: "100%", padding: 10 }}
                    >
                      {L("Salva lingua")}
                    </Btn>
                    <div style={{ fontSize: 11, color: subC, marginTop: 6 }}>
                      {L(
                        "La lingua viene applicata salvando e ricaricando l’app."
                      )}
                    </div>
                  </div>
                ),
              },
              {
                label: "📅 Formato data",
                el: (
                  <Segmented
                    columns={3}
                    items={DATE_FORMATS.map(function (f) {
                      return {
                        id: f.id,
                        label:
                          f.id === "dmy"
                            ? "GG/MM/AAAA"
                            : f.id === "mdy"
                            ? "MM/GG/AAAA"
                            : "AAAA-MM-GG",
                      };
                    })}
                    value={dateFmt}
                    onChange={setDateFmt}
                  />
                ),
              },
              {
                label: "📅 Primo giorno settimana",
                el: (
                  <Segmented
                    items={[
                      { id: "mon", label: "Lunedì" },
                      { id: "sun", label: "Domenica" },
                    ]}
                    value={firstDayOfWeek}
                    onChange={setFirstDayOfWeek}
                  />
                ),
              },
            ].map(function (item, i, arr) {
              return (
                <div
                  key={item.label}
                  style={{
                    background: cardBg,
                    padding: "16px 20px",
                    borderBottom:
                      i < arr.length - 1 ? "1px solid " + borderC : "none",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: textC,
                      marginBottom: 8,
                    }}
                  >
                    {L(item.label)}
                  </div>
                  {item.el}
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
                fontSize: 14,
                fontWeight: 700,
                color: textC,
                marginBottom: 4,
              }}
            >
              💱 {L("Valute")}
            </div>
            <SettingHint>
              Gestisci valuta principale e valuta secondaria con ricerca tra
              tutte le valute disponibili.
            </SettingHint>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 12,
                alignItems: "start",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: textC,
                    marginBottom: 6,
                  }}
                >
                  {L("Valuta principale")}
                </div>
                <StableCurrencyPicker
                  value={currency}
                  onChange={setCurrency}
                  dark={dark}
                  textC={textC}
                  subC={subC}
                  borderC={borderC}
                  translate={L}
                />
              </div>
              <div style={{ opacity: settingAllowed("base") ? 1 : 0.62 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: textC,
                    marginBottom: 6,
                  }}
                >
                  {L("Valuta secondaria")}{" "}
                  <span
                    style={{
                      fontSize: 11,
                      background: dark ? "#333" : "#FFF3CD",
                      color: dark ? "#ffd58a" : "#856404",
                      borderRadius: 20,
                      padding: "2px 7px",
                      fontWeight: 900,
                    }}
                  >
                    Base
                  </span>
                </div>
                {settingAllowed("base") ? (
                  <StableCurrencyPicker
                    value={secondaryCurrency}
                    onChange={setSecondaryCurrency}
                    exclude={currency}
                    allowNone
                    dark={dark}
                    textC={textC}
                    subC={subC}
                    borderC={borderC}
                    translate={L}
                  />
                ) : (
                  <div
                    onClick={function () {
                      blockSetting("base");
                    }}
                    style={{
                      border: "1px dashed " + (dark ? "#5a4a20" : "#FFD54F"),
                      background: dark ? "#2b2518" : "#FFF8E1",
                      borderRadius: 12,
                      padding: "12px",
                      fontSize: 12,
                      color: dark ? "#ffd58a" : "#856404",
                      cursor: "pointer",
                      lineHeight: 1.35,
                    }}
                  >
                    🔒 {L("Valuta secondaria disponibile dal piano Base.")}
                  </div>
                )}
              </div>
            </div>
            {secondaryCurrency && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  background: dark ? "#252535" : "#f9f9f9",
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: "1px solid " + borderC,
                  marginTop: 12,
                  opacity: settingAllowed("base") ? 1 : 0.62,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: subC }}>
                  {L("Mostra")} {secondaryCurrency} {L("in")}:
                </div>
                {[
                  { label: "🏠 Home", always: true },
                  {
                    label: "📋 Storico",
                    v: showSecInHistory,
                    fn: function () {
                      if (blockSetting("base")) return;
                      setShowSecInHistory(!showSecInHistory);
                    },
                  },
                  {
                    label: "📊 Statistiche",
                    v: showSecInStats,
                    fn: function () {
                      if (blockSetting("base")) return;
                      setShowSecInStats(!showSecInStats);
                    },
                  },
                  {
                    label: "💰 Budget",
                    v: showSecInBudget,
                    fn: function () {
                      if (blockSetting("base")) return;
                      setShowSecInBudget(!showSecInBudget);
                    },
                  },
                  {
                    label: "💎 Patrimonio",
                    v: showSecInPatrimonio,
                    fn: function () {
                      if (blockSetting("base")) return;
                      setShowSecInPatrimonio(!showSecInPatrimonio);
                    },
                  },
                ].map(function (item, i) {
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: item.always ? subC : textC,
                        }}
                      >
                        {L(item.label)}
                      </span>
                      {item.always ? (
                        <span
                          style={{
                            fontSize: 11,
                            background: dark ? "#333" : "#f0f0f0",
                            color: "#aaa",
                            borderRadius: 8,
                            padding: "2px 8px",
                          }}
                        >
                          {L("sempre")}
                        </span>
                      ) : (
                        <Toggle label="" checked={item.v} onChange={item.fn} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                fontSize: 14,
                fontWeight: 700,
                color: textC,
                marginBottom: 4,
              }}
            >
              📊 {L("Metriche")}
            </div>
            <SettingHint>
              {translateUiRuntimeText("Saldo home e visualizzazione valori.")}
            </SettingHint>
            <div style={{ marginTop: 12, marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: textC,
                  marginBottom: 6,
                }}
              >
                🏠 {L("Saldo Home")}
              </div>
              <Segmented
                items={[
                  { id: "reale", label: "Reale" },
                  { id: "rateizzato", label: "Rateizzato" },
                ]}
                value={homeBalanceView}
                onChange={setHomeBalanceView}
              />
            </div>
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
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <AIGrilloIcon size={46} />
              <div style={{ fontSize: 14, fontWeight: 700, color: textC }}>
                {L("IA")}
              </div>
            </div>
            <SettingHint>
              {translateUiRuntimeText(
                "Scegli quali dati l’agente AI può leggere quando risponde nella chat."
              )}
            </SettingHint>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 12,
              }}
            >
              {[
                {
                  id: "summary",
                  icon: "📊",
                  title: "Analisi limitata",
                  desc: "Solo riassunto delle spese: totali mensili/annuali, saldo, categorie principali, budget e ricorrenti.",
                },
                {
                  id: "areas",
                  icon: "📂",
                  title: "Analisi media",
                  desc: "Riassunto + spese raggruppate per area, utile per capire quali blocchi di spesa pesano di più.",
                },
                {
                  id: "full",
                  icon: "🔎",
                  title: "Analisi completa",
                  desc: "Tutte le transazioni essenziali: data, importo, categoria/metodo o tipo entrata e descrizione.",
                },
              ].map(function (opt) {
                var active = aiDataAccess === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={function () {
                      setAiDataAccess(opt.id);
                      setToast("Impostazioni IA aggiornate");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      minHeight: 64,
                      touchAction: "manipulation",
                      WebkitTapHighlightColor: "transparent",
                      padding: "13px 14px",
                      borderRadius: 12,
                      border: "1.5px solid " + (active ? "#7F77DD" : borderC),
                      background: active
                        ? "linear-gradient(135deg,#f0edff,#e8f4ff)"
                        : dark
                        ? "#252535"
                        : "#fff",
                      cursor: "pointer",
                      boxShadow: active
                        ? "0 3px 12px rgba(127,119,221,0.16)"
                        : "none",
                    }}
                  >
                    <span style={{ fontSize: 22, lineHeight: 1.1 }}>
                      {opt.icon}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 800,
                          color: active ? "#534AB7" : textC,
                          marginBottom: 3,
                        }}
                      >
                        {L(opt.title)}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: subC,
                          lineHeight: 1.45,
                        }}
                      >
                        {L(opt.desc)}
                      </span>
                    </span>
                    {active && (
                      <span
                        style={{
                          fontSize: 16,
                          color: "#7F77DD",
                          fontWeight: 800,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 14,
                background: dark ? "#252535" : "#f9f9f9",
                borderRadius: 12,
                border: "1px solid " + borderC,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AIGrilloIcon size={42} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: textC }}>
                    {L("Icona rapida Consulente AI")}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: subC,
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {L(
                    "Mostra un pulsante flottante in basso a destra per aprire subito la chat AI."
                  )}
                </div>
              </div>
              <Toggle
                label=""
                checked={aiFloatingEnabled}
                onChange={function () {
                  setAiFloatingEnabled(!aiFloatingEnabled);
                  setToast("Impostazioni IA aggiornate");
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: subC,
                marginTop: 10,
                lineHeight: 1.45,
              }}
            >
              {L(
                "Questa impostazione viene applicata solo alle richieste inviate all’agente AI esterno. I consigli locali dell’app continuano a usare i dati già presenti sul dispositivo."
              )}
            </div>
          </div>
        </div>
      </div>
    );

  if (settingsPage === "sections")
    return (
      <div>
        <PageHeader title="Sezioni" />
        <SettingsCards
          items={[
            {
              id: "sections_income",
              icon: "💰",
              label: "Entrate",
              desc: "Aree e categorie delle entrate",
            },
            {
              id: "sections_expense",
              icon: "💸",
              label: "Uscite",
              desc: "Aree, categorie e metodi di pagamento",
            },
            {
              id: "history_settings",
              icon: "📋",
              label: t.history || "Storico",
              desc: "Ordinamento e movimenti futuri",
            },
            {
              id: "patrimonio_settings",
              icon: "💎",
              label: "Patrimonio",
              desc: "Modalità, aree e voci patrimonio",
            },
            {
              id: "debt_credits_settings",
              icon: "💳",
              label: "Debiti / Crediti",
              desc: "Visibilità, collegamento a patrimonio e movimenti",
            },
            {
              id: "shopping_settings",
              icon: "🛒",
              label: "Spesa",
              desc: "Liste, aree, unità di misura, fidelity card e prepagate",
            },
          ]}
        />
      </div>
    );

  if (settingsPage === "debt_credits_settings")
    return (
      <div>
        <PageHeader title="Debiti / Crediti" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: textC,
                marginBottom: 4,
              }}
            >
              💳 {L("Debiti / Crediti")}
            </div>
            <div style={{ fontSize: 12, color: subC, marginBottom: 12 }}>
              {L(
                "Sezione disponibile dal piano Base. Puoi decidere dove far apparire i valori collegati."
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  background: dark ? "#252535" : "#f9f9f9",
                  border: "1px solid " + borderC,
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
                    {L("Riporta nel patrimonio")}
                  </div>
                  <div style={{ fontSize: 12, color: subC }}>
                    {L(
                      "Consente di creare una voce patrimonio collegata al saldo del debito o credito."
                    )}
                  </div>
                </div>
                <Toggle
                  label=""
                  checked={!!showDebtCreditsInPatrimonio}
                  onChange={function () {
                    setShowDebtCreditsInPatrimonio(
                      !showDebtCreditsInPatrimonio
                    );
                    setToast(L("Impostazioni aggiornate"));
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  background: dark ? "#252535" : "#f9f9f9",
                  border: "1px solid " + borderC,
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: textC }}>
                    {L("Riporta nei movimenti")}
                  </div>
                  <div style={{ fontSize: 12, color: subC }}>
                    {L(
                      "Consente di creare entrate o uscite partendo dal saldo del debito o credito."
                    )}
                  </div>
                </div>
                <Toggle
                  label=""
                  checked={!!showDebtCreditsInExpenses}
                  onChange={function () {
                    setShowDebtCreditsInExpenses(!showDebtCreditsInExpenses);
                    setToast(L("Impostazioni aggiornate"));
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  var [newListSettTitle, setNewListSettTitle] = useState("");
  var [newListSettIcon, setNewListSettIcon] = useState("🧺");
  var [newListSettColor, setNewListSettColor] = useState(COLORS[0]);
  var [showNewListSettForm, setShowNewListSettForm] = useState(false);
  var [editingListSettId, setEditingListSettId] = useState("");
  function resetSettingsShoppingListForm() {
    setNewListSettTitle("");
    setNewListSettIcon("🧺");
    setNewListSettColor(COLORS[0]);
    setShowNewListSettForm(false);
    setEditingListSettId("");
  }
  function createSettingsShoppingList() {
    setEditingListSettId("");
    setNewListSettTitle("");
    setNewListSettIcon("🧺");
    setNewListSettColor(COLORS[0]);
    setShowNewListSettForm(true);
  }
  var settingsShoppingListFormValid = !!String(newListSettTitle || "").trim();
  function confirmCreateSettingsList() {
    var title = String(newListSettTitle || "").trim();
    if (!settingsShoppingListFormValid) {
      setToast({
        text: L("Inserisci il titolo della lista."),
        type: "warning",
        color: "#FFF8E1",
        icon: "⚠️",
        textColor: "#856404",
      });
      return;
    }
    var icon = newListSettIcon || "🧺";
    var color = newListSettColor || COLORS[0];
    if (editingListSettId) {
      setShoppingLists(function (items) {
        return (items || []).map(function (x) {
          return String(x.id) === String(editingListSettId)
            ? {
                ...x,
                title: title,
                icon: icon,
                color: color,
                updatedAt: new Date().toISOString(),
              }
            : x;
        });
      });
      setToast({
        text: L("Lista della spesa aggiornata"),
        type: "success",
        icon: "✅",
      });
      resetSettingsShoppingListForm();
      return;
    }
    var id = "list_" + Date.now();
    setShoppingLists(function (list) {
      return (list || []).concat([
        {
          id: id,
          title: title,
          icon: icon,
          color: color,
          createdAt: new Date().toISOString(),
        },
      ]);
    });
    setToast({
      text: L("Lista della spesa creata"),
      type: "success",
      icon: "🗂️",
    });
    resetSettingsShoppingListForm();
  }
  function editSettingsShoppingList(list) {
    setEditingListSettId(String(list.id));
    setNewListSettTitle(list.title || "");
    setNewListSettIcon(list.icon || "🧺");
    setNewListSettColor(list.color || COLORS[0]);
    setShowNewListSettForm(true);
  }
  function deleteSettingsShoppingList(id) {
    var list = (shoppingLists || []).find(function (x) {
      return String(x.id) === String(id);
    });
    if (!list) return;
    if (String(id) === "main" && (shoppingLists || []).length <= 1) {
      setToast({
        text: L(
          "La lista principale non può essere eliminata se è l’unica lista."
        ),
        type: "warning",
        color: "#FFF8E1",
        icon: "⚠️",
        textColor: "#856404",
      });
      return;
    }
    if (!window.confirm(L("Confermi la cancellazione?"))) return;
    setShoppingLists(function (items) {
      return (items || []).filter(function (x) {
        return String(x.id) !== String(id);
      });
    });
    setShoppingItems(function (items) {
      return (items || []).filter(function (x) {
        return String(x.listId || "main") !== String(id) || x.archived;
      });
    });
    if (String(activeShoppingListId) === String(id))
      setActiveShoppingListId("main");
    setToast({
      text: L("Cancellazione completata"),
      type: "success",
      icon: "🗑️",
    });
  }
  function shoppingAreaSettingsItems() {
    return (shoppingAreas || DEFAULT_SHOPPING_AREAS).map(function (a, idx) {
      return {
        id: String(a),
        name: String(a),
        icon: (shoppingAreaIcons && shoppingAreaIcons[a]) || "📂",
        color:
          (shoppingAreaColors && shoppingAreaColors[a]) ||
          COLORS[idx % COLORS.length],
      };
    });
  }
  function setShoppingAreaSettingsItems(nextItems) {
    var oldIcons = shoppingAreaIcons || {};
    var oldColors = shoppingAreaColors || {};
    var nextAreas = [];
    var nextIcons = {};
    var nextColors = {};
    var renamedDefault = "";
    (nextItems || []).forEach(function (it, idx) {
      var oldId = String((it && it.id) || "");
      var name =
        String((it && it.name) || "Area " + (idx + 1)).trim() ||
        "Area " + (idx + 1);
      nextAreas.push(name);
      nextIcons[name] =
        (it && it.icon) || oldIcons[oldId] || oldIcons[name] || "📂";
      nextColors[name] =
        (it && it.color) ||
        oldColors[oldId] ||
        oldColors[name] ||
        COLORS[idx % COLORS.length];
      if (String(shoppingDefaultArea || "") === oldId) renamedDefault = name;
    });
    setShoppingAreas(nextAreas);
    setShoppingAreaIcons(nextIcons);
    setShoppingAreaColors(nextColors);
    if (renamedDefault) setShoppingDefaultArea(renamedDefault);
    else if (shoppingDefaultArea && nextAreas.indexOf(shoppingDefaultArea) < 0)
      setShoppingDefaultArea(nextAreas[0] || "");
  }
  function ShoppingSettingsCategoriesPanel() {
    var [view, setView] = useStorage(
      userKey("shopping_categories_settings_view_v1"),
      "list"
    );
    var products = (shoppingItems || []).filter(function (x) {
      return x.archived;
    });
    var ordered = products.slice().sort(function (a, b) {
      return Number(a.order || 0) - Number(b.order || 0);
    });
    function moveProductSetting(id, dir) {
      if (blockSetting("base")) return;
      var idx = ordered.findIndex(function (x) {
        return String(x.id) === String(id);
      });
      var j = idx + dir;
      if (idx < 0 || j < 0 || j >= ordered.length) return;
      var ids = ordered.map(function (x) {
        return x.id;
      });
      var tmp = ids[idx];
      ids[idx] = ids[j];
      ids[j] = tmp;
      setShoppingItems(function (list) {
        return (list || []).map(function (x) {
          var pos = ids.indexOf(x.id);
          return pos >= 0 ? { ...x, order: pos + 1 } : x;
        });
      });
    }
    return (
      <div>
        <PageHeader title="Spesa / Categorie" />
        <div
          style={{
            background: cardBg,
            borderRadius: 14,
            border: "1px solid " + borderC,
            padding: 20,
          }}
        >
          <SettingHint>
            {L(
              "Gestisci i prodotti salvati della spesa con la stessa impostazione grafica delle categorie Uscite. La logica della sezione Spesa resta invariata."
            )}
          </SettingHint>
          <Segmented
            items={[
              { id: "list", label: "Lista categorie" },
              {
                id: "order",
                label: "Riordina",
                disabled: !baseSettingsAllowed,
                lockedMessage: settingLockedMessage("base"),
              },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ordered.map(function (x) {
                return (
                  <div
                    key={x.id}
                    style={{
                      background: cardBg,
                      borderRadius: 12,
                      border: "1px solid " + borderC,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🏷</span>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: confirmButtonColor,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: textC,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {L(x.name || "Prodotto")}
                      </div>
                      <div style={{ fontSize: 11, color: subC }}>
                        {((shoppingAreaIcons && shoppingAreaIcons[x.area]) ||
                          "📂") +
                          " " +
                          L(x.area || "Altro")}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!ordered.length && (
                <div
                  style={{
                    fontSize: 13,
                    color: subC,
                    background: dark ? "#252535" : "#f9f9f9",
                    border: "1px solid " + borderC,
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  {L("Nessun prodotto salvato")}
                </div>
              )}
            </div>
          )}
          {view === "order" && (
            <SortableRows
              items={ordered}
              onMove={function (i, dir) {
                if (i < 0 || i >= ordered.length) return;
                moveProductSetting(ordered[i].id, dir);
              }}
              renderItem={function (x) {
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>🏷</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: textC,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {L(x.name || "Prodotto")}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: subC,
                        whiteSpace: "nowrap",
                      }}
                    >
                      · {L(x.area || "Altro")}
                    </span>
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>
    );
  }

  if (settingsPage === "shopping_settings")
    return (
      <div>
        <PageHeader title="Spesa" />
        <SettingsCards
          items={[
            {
              id: "shopping_settings_lists",
              icon: "🧺",
              label: "Liste",
              desc: "Lista, modifica ed eliminazione delle liste spesa",
            },
            {
              id: "shopping_settings_areas",
              icon: "📂",
              label: "Aree",
              desc: "Lista, riordino e default delle aree spesa",
            },
            {
              id: "shopping_settings_units",
              icon: "⚖️",
              label: "Unità di misura",
              desc: "Lista, riordino, modifica e unità predefinita",
            },
          ]}
        />
      </div>
    );

  if (settingsPage === "shopping_settings_lists")
    return (
      <div>
        <PageHeader title="Spesa / Liste" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 18,
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
                <div style={{ fontSize: 14, fontWeight: 900, color: textC }}>
                  🧺 {L("Liste della spesa")}
                </div>
                <div style={{ fontSize: 12, color: subC }}>
                  {L(
                    "Crea, modifica o elimina le liste disponibili nella sezione Spesa."
                  )}
                </div>
              </div>
              <button
                onClick={createSettingsShoppingList}
                style={{
                  background: confirmButtonColor,
                  color: "#fff",
                  border: "none",
                  borderRadius: btnRadius,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ＋ {L("Nuova lista")}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(shoppingLists && shoppingLists.length
                ? shoppingLists
                : [
                    {
                      id: "main",
                      title: "Lista principale",
                      icon: "🧺",
                      color: COLORS[0],
                    },
                  ]
              ).map(function (list) {
                return (
                  <div
                    key={list.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: dark ? "#252535" : "#f9f9f9",
                      border: "1px solid " + borderC,
                      borderRadius: 12,
                      padding: "10px 12px",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>
                      <FainanceIcon value={list.icon || "🧺"} size={22} />
                    </span>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: list.color || COLORS[0],
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 900,
                          color: textC,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {list.title || L("Lista senza titolo")}
                      </div>
                      {String(activeShoppingListId) === String(list.id) && (
                        <div
                          style={{
                            fontSize: 11,
                            color: incomeColor,
                            fontWeight: 800,
                          }}
                        >
                          {L("Lista selezionata")}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={function () {
                        editSettingsShoppingList(list);
                      }}
                      style={{
                        border: "none",
                        background: dark ? "#2b2b3a" : "#EEF1FF",
                        color: confirmButtonColor,
                        borderRadius: 8,
                        padding: "6px 8px",
                        cursor: "pointer",
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={function () {
                        deleteSettingsShoppingList(list.id);
                      }}
                      style={{
                        border: "none",
                        background: "#FFF0F0",
                        color: "#E24B4A",
                        borderRadius: 8,
                        padding: "6px 8px",
                        cursor: "pointer",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {showNewListSettForm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.58)",
              zIndex: 980,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7vh 16px 3vh",
              boxSizing: "border-box",
              overflowY: "auto",
            }}
            onMouseDown={function (e) {
              if (e.target === e.currentTarget) resetSettingsShoppingListForm();
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 500,
                background: cardBg,
                borderRadius: 22,
                border: "1px solid " + borderC,
                boxShadow: "0 18px 65px rgba(0,0,0,0.38)",
                padding: "20px 18px 18px",
              }}
            >
              <button
                type="button"
                onClick={resetSettingsShoppingListForm}
                aria-label={L("Chiudi")}
                style={{
                  position: "absolute",
                  right: 14,
                  top: 14,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "none",
                  background: "#E24B4A",
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: "32px",
                  cursor: "pointer",
                  boxShadow: "0 5px 14px rgba(226,75,74,.28)",
                }}
              >
                ×
              </button>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 950,
                  color: textC,
                  marginBottom: 16,
                  paddingRight: 44,
                }}
              >
                {L(editingListSettId ? "Modifica lista" : "Nuova lista")}
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 13 }}
              >
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
                      {L("Icona")}
                    </div>
                    <EmojiPicker
                      value={newListSettIcon || "🧺"}
                      onChange={setNewListSettIcon}
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
                      {L("Colore")}
                    </div>
                    <AppColorSelector
                      value={newListSettColor || COLORS[0]}
                      onChange={setNewListSettColor}
                      compact={true}
                    />
                  </div>
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
                    {L("Nome lista")}
                  </div>
                  <input
                    autoFocus
                    placeholder={L("Nome lista")}
                    value={newListSettTitle}
                    onChange={function (e) {
                      setNewListSettTitle(e.target.value);
                    }}
                    onKeyDown={function (e) {
                      if (e.key === "Enter" && settingsShoppingListFormValid)
                        confirmCreateSettingsList();
                    }}
                    style={{ ...sinp, width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
                <Btn
                  onClick={confirmCreateSettingsList}
                  disabled={!settingsShoppingListFormValid}
                  bg={
                    settingsShoppingListFormValid
                      ? confirmButtonColor || "#7F77DD"
                      : "#A8A8A8"
                  }
                  style={{ flex: 1, padding: 12, fontWeight: 950 }}
                >
                  {L("Salva")}
                </Btn>
                <Btn
                  onClick={resetSettingsShoppingListForm}
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
      </div>
    );

  function ShoppingUnitsSettingsPage() {
    var [view, setView] = useStorage(
      userKey("shopping_units_settings_view_v1"),
      "list"
    );
    var [showUnitForm, setShowUnitForm] = useState(false);
    var [editingUnit, setEditingUnit] = useState("");
    var [unitDraft, setUnitDraft] = useState("");
    var [pendingDeleteUnit, setPendingDeleteUnit] = useState("");
    var units = (
      Array.isArray(shoppingUnits) && shoppingUnits.length
        ? shoppingUnits
        : DEFAULT_SHOPPING_UNITS
    )
      .map(canonicalShoppingUnitName)
      .filter(Boolean);
    function unitExists(name, exclude) {
      var target = String(name || "")
        .trim()
        .toLocaleLowerCase();
      return units.some(function (unit) {
        return (
          String(unit || "")
            .trim()
            .toLocaleLowerCase() === target &&
          String(unit) !== String(exclude || "")
        );
      });
    }
    function resetUnitForm() {
      setShowUnitForm(false);
      setEditingUnit("");
      setUnitDraft("");
    }
    function openNewUnit() {
      setEditingUnit("");
      setUnitDraft("");
      setShowUnitForm(true);
    }
    function openEditUnit(unit) {
      setEditingUnit(String(unit));
      setUnitDraft(String(unit));
      setShowUnitForm(true);
    }
    function saveUnit() {
      var name = canonicalShoppingUnitName(String(unitDraft || "").trim());
      if (!name) return;
      if (unitExists(name, editingUnit)) {
        setToast({
          text: L("Esiste già un’unità di misura con questo nome."),
          type: "warning",
          color: "#FFF8E1",
          icon: "⚠️",
          textColor: "#856404",
        });
        return;
      }
      if (editingUnit) {
        var oldName = canonicalShoppingUnitName(String(editingUnit));
        var nextUnits = units.map(function (unit) {
          return canonicalShoppingUnitName(String(unit)) === oldName
            ? name
            : canonicalShoppingUnitName(String(unit));
        });
        setShoppingItems(function (list) {
          return (list || []).map(function (item) {
            return canonicalShoppingUnitName(
              String((item && item.unit) || "")
            ) === oldName
              ? { ...item, unit: name, updatedAt: new Date().toISOString() }
              : item;
          });
        });
        setShoppingUnits(nextUnits);
        if (
          canonicalShoppingUnitName(String(shoppingDefaultUnit || "")) ===
          oldName
        )
          setShoppingDefaultUnit(name);
        setToast({
          text: L("Unità di misura aggiornata"),
          type: "success",
          icon: "✅",
        });
      } else {
        setShoppingUnits(units.concat([name]));
        if (!shoppingDefaultUnit) setShoppingDefaultUnit(name);
        setToast({
          text: L("Unità di misura aggiunta"),
          type: "success",
          icon: "✅",
        });
      }
      resetUnitForm();
    }
    function deleteUnitNow(unit) {
      var target = String(unit || "");
      var remaining = units.filter(function (item) {
        return String(item) !== target;
      });
      if (!remaining.length) {
        setToast({
          text: L("Deve rimanere almeno un’unità di misura."),
          type: "warning",
          color: "#FFF8E1",
          icon: "⚠️",
          textColor: "#856404",
        });
        setPendingDeleteUnit("");
        return;
      }
      setShoppingUnits(remaining);
      setShoppingItems(function (list) {
        var replacements = {};
        return (list || []).map(function (item) {
          if (String((item && item.unit) || "") !== target) return item;
          var logicalKey = String(
            (item && item.productId) ||
              (item && item.catalogProductId) ||
              (item && item.name
                ? String(item.name).trim().toLocaleLowerCase("it-IT")
                : "") +
                "|" +
                (item && item.area ? String(item.area) : "") ||
              (item && item.id) ||
              Math.random()
          );
          if (!replacements[logicalKey])
            replacements[logicalKey] =
              remaining[Math.floor(Math.random() * remaining.length)];
          return {
            ...item,
            unit: replacements[logicalKey],
            updatedAt: new Date().toISOString(),
          };
        });
      });
      if (String(shoppingDefaultUnit || "") === target)
        setShoppingDefaultUnit(remaining[0]);
      setPendingDeleteUnit("");
      setToast({
        text: L("Unità di misura eliminata"),
        type: "success",
        icon: "🗑️",
      });
    }
    function requestDeleteUnit(unit) {
      if (units.length <= 1) {
        setToast({
          text: L("Deve rimanere almeno un’unità di misura."),
          type: "warning",
          color: "#FFF8E1",
          icon: "⚠️",
          textColor: "#856404",
        });
        return;
      }
      var used = (shoppingItems || []).some(function (item) {
        return String((item && item.unit) || "") === String(unit);
      });
      if (used) {
        setPendingDeleteUnit(String(unit));
        return;
      }
      deleteUnitNow(unit);
    }
    function moveUnit(index, dir) {
      var target = index + dir;
      if (target < 0 || target >= units.length) return;
      var next = units.slice();
      var tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      setShoppingUnits(next);
    }
    var formValid = !!String(unitDraft || "").trim();
    return (
      <div>
        <PageHeader title={L("Spesa / Unità di misura")} />
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
              fontSize: 14,
              fontWeight: 700,
              color: textC,
              marginBottom: 4,
            }}
          >
            {L("Unità di misura")}
          </div>
          <SettingHint>
            {L(
              "Gestisci le unità di misura disponibili per i prodotti: aggiunta, modifica, riordino e unità predefinita."
            )}
          </SettingHint>
          <Segmented
            items={[
              { id: "list", label: "Lista" },
              { id: "order", label: "Riordina" },
              { id: "default", label: "Default" },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "list" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={openNewUnit}
                style={{
                  alignSelf: "flex-start",
                  background: confirmButtonColor,
                  color: "#fff",
                  border: "none",
                  borderRadius: btnRadius,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                  marginBottom: 4,
                }}
              >
                ＋ {L("Nuova unità di misura")}
              </button>
              {units.map(function (unit) {
                return (
                  <div
                    key={unit}
                    style={{
                      background: cardBg,
                      borderRadius: 12,
                      border: "1px solid " + borderC,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>⚖️</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: textC,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {L(unit)}
                      </div>
                      {String(shoppingDefaultUnit || "") === String(unit) && (
                        <div
                          style={{
                            fontSize: 11,
                            color: incomeColor,
                            fontWeight: 800,
                          }}
                        >
                          ★ {L("Unità predefinita")}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={function () {
                        openEditUnit(unit);
                      }}
                      style={{
                        background: "#EEF4FF",
                        border: "1px solid #BFD7FF",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        color: "#378ADD",
                        padding: "5px 8px",
                        fontWeight: 700,
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={function () {
                        requestDeleteUnit(unit);
                      }}
                      style={{
                        background: "#FFF0F0",
                        border: "1px solid #FFD1D1",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontSize: 14,
                        color: "#E24B4A",
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
          )}
          {view === "order" && (
            <SortableRows
              items={units.map(function (unit) {
                return { id: unit, name: unit };
              })}
              onMove={moveUnit}
              renderItem={function (item) {
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>⚖️</span>
                    <span
                      style={{
                        fontSize: 13,
                        color: textC,
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {L(item.name)}
                    </span>
                  </div>
                );
              }}
            />
          )}
          {view === "default" && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: subC,
                  marginBottom: 6,
                }}
              >
                {L("Unità predefinita")}
              </div>
              <select
                value={shoppingDefaultUnit || units[0] || ""}
                onChange={function (e) {
                  setShoppingDefaultUnit(e.target.value);
                }}
                style={{ ...sinp, width: "100%" }}
              >
                {units.map(function (unit) {
                  return (
                    <option key={unit} value={unit}>
                      {L(unit)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        {showUnitForm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.58)",
              zIndex: 980,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7vh 16px 3vh",
              boxSizing: "border-box",
              overflowY: "auto",
            }}
            onMouseDown={function (e) {
              if (e.target === e.currentTarget) resetUnitForm();
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 500,
                background: cardBg,
                borderRadius: 22,
                border: "1px solid " + borderC,
                boxShadow: "0 18px 65px rgba(0,0,0,0.38)",
                padding: "20px 18px 18px",
              }}
            >
              <button
                type="button"
                onClick={resetUnitForm}
                aria-label={L("Chiudi")}
                style={{
                  position: "absolute",
                  right: 14,
                  top: 14,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "none",
                  background: "#E24B4A",
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: "32px",
                  cursor: "pointer",
                  boxShadow: "0 5px 14px rgba(226,75,74,.28)",
                }}
              >
                ×
              </button>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 950,
                  color: textC,
                  marginBottom: 16,
                  paddingRight: 44,
                }}
              >
                {L(
                  editingUnit
                    ? "Modifica unità di misura"
                    : "Nuova unità di misura"
                )}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 850,
                  color: subC,
                  marginBottom: 6,
                }}
              >
                {L("Nome unità di misura")}
              </div>
              <input
                autoFocus
                value={unitDraft}
                onChange={function (e) {
                  setUnitDraft(e.target.value);
                }}
                onKeyDown={function (e) {
                  if (e.key === "Enter" && formValid) saveUnit();
                }}
                placeholder={L("Nome unità di misura")}
                style={{ ...sinp, width: "100%", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: 9, marginTop: 18 }}>
                <Btn
                  onClick={saveUnit}
                  disabled={!formValid}
                  bg={formValid ? confirmButtonColor || "#7F77DD" : "#A8A8A8"}
                  style={{ flex: 1, padding: 12, fontWeight: 950 }}
                >
                  {L("Salva")}
                </Btn>
                <Btn
                  onClick={resetUnitForm}
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
        {pendingDeleteUnit && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10050,
              background: "rgba(0,0,0,.58)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "7vh 16px 3vh",
              boxSizing: "border-box",
            }}
            onMouseDown={function (e) {
              if (e.target === e.currentTarget) setPendingDeleteUnit("");
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                maxWidth: 440,
                background: cardBg,
                border: "1px solid " + borderC,
                borderRadius: 22,
                padding: "20px 18px 18px",
                boxShadow: "0 18px 65px rgba(0,0,0,.38)",
              }}
            >
              <button
                type="button"
                onClick={function () {
                  setPendingDeleteUnit("");
                }}
                aria-label={L("Chiudi")}
                style={{
                  position: "absolute",
                  right: 14,
                  top: 14,
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  border: "none",
                  background: "#E24B4A",
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: 900,
                  lineHeight: "32px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 950,
                  color: textC,
                  marginBottom: 9,
                  paddingRight: 44,
                }}
              >
                {L("Eliminare unità di misura?")}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: subC,
                  lineHeight: 1.5,
                  marginBottom: 18,
                }}
              >
                {L(
                  "Questa unità di misura è usata da uno o più prodotti. Se la elimini, ai prodotti interessati verrà assegnata casualmente una delle unità di misura rimanenti. Vuoi continuare?"
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <Btn
                  onClick={function () {
                    setPendingDeleteUnit("");
                  }}
                  bg={dark ? "#333" : "#f0f0f0"}
                  color={textC}
                  style={{ padding: 12, fontWeight: 900 }}
                >
                  {L("Annulla")}
                </Btn>
                <Btn
                  onClick={function () {
                    deleteUnitNow(pendingDeleteUnit);
                  }}
                  bg="#E24B4A"
                  style={{ padding: 12, fontWeight: 950 }}
                >
                  {L("Elimina e riassegna")}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (settingsPage === "shopping_settings_units")
    return <ShoppingUnitsSettingsPage />;

  if (settingsPage === "shopping_settings_areas")
    return (
      <GroupSettingsPanel
        title="Spesa / Aree"
        desc="Gestisci le aree della spesa: lista, riordino e area default."
        items={shoppingAreaSettingsItems()}
        setItems={setShoppingAreaSettingsItems}
        defaultValue={shoppingDefaultArea}
        setDefaultValue={setShoppingDefaultArea}
        withIcon
      />
    );

  if (settingsPage === "sections_income")
    return (
      <div>
        <PageHeader title="Entrate" />
        <SettingsCards
          items={[
            {
              id: "sections_income_areas",
              icon: "📂",
              label: "Aree",
              desc: "Lista, riordino e default delle aree entrate",
            },
            {
              id: "sections_income_categories",
              icon: "🏷",
              label: "Categorie",
              desc: "Lista, riordino e default delle categorie entrate",
            },
          ]}
        />
      </div>
    );

  if (settingsPage === "sections_expense")
    return (
      <div>
        <PageHeader title="Uscite" />
        <SettingsCards
          items={[
            {
              id: "sections_expense_areas",
              icon: "📂",
              label: "Aree",
              desc: "Lista, riordino e default delle aree uscite",
            },
            {
              id: "sections_expense_categories",
              icon: "🏷",
              label: "Categorie",
              desc: "Lista, riordino, default e accorpa categorie",
            },
            {
              id: "sections_expense_methods",
              icon: "💳",
              label: "Metodi di pagamento",
              desc: "Lista, riordino e default dei metodi",
            },
          ]}
        />
      </div>
    );

  if (settingsPage === "sections_income_areas")
    return (
      <GroupSettingsPanel
        title="Entrate / Aree"
        desc="Gestisci le aree delle entrate: lista, riordino e area default."
        items={incomeGroups || DEFAULT_INCOME_GROUPS}
        setItems={setIncomeGroups}
        defaultValue={defaultIncomeArea}
        setDefaultValue={setDefaultIncomeArea}
      />
    );
  if (settingsPage === "sections_income_categories")
    return (
      <StableNestedPanelHost
        key="settings-income-categories"
        render={function () {
          return IncomeCategoriesSettings();
        }}
      />
    );
  if (settingsPage === "sections_expense_areas")
    return (
      <GroupSettingsPanel
        title="Uscite / Aree"
        desc="Gestisci le aree delle uscite: lista, riordino e area default."
        items={expenseGroups || DEFAULT_EXPENSE_GROUPS}
        setItems={setExpenseGroups}
        defaultValue={defaultExpenseArea}
        setDefaultValue={setDefaultExpenseArea}
      />
    );
  if (settingsPage === "sections_expense_categories")
    return (
      <StableNestedPanelHost
        key="settings-expense-categories"
        render={function () {
          return ExpenseCategoriesSettings();
        }}
      />
    );
  if (settingsPage === "sections_expense_methods")
    return (
      <StableNestedPanelHost
        key="settings-expense-methods"
        render={function () {
          return ExpenseMethodsSettings();
        }}
      />
    );
  if (settingsPage === "values")
    return (
      <div>
        <PageHeader title="Categorie & Metodi" />
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "cats", icon: "💸", label: "Uscite" },
            { id: "income_types", icon: "💰", label: "Entrate" },
            { id: "methods", icon: "💳", label: "Metodi di pagamento" },
            { id: "areas", icon: "📂", label: "Aree" },
            { id: "patrimonio", icon: "💎", label: "Patrimonio" },
            { id: "merge", icon: "↔", label: "Accorpa" },
            { id: "order", icon: "↕", label: "Ordine" },
            { id: "defaultcat", icon: "⭐", label: "Default" },
          ].map(function (st) {
            return (
              <Btn
                key={st.id}
                onClick={function () {
                  setSettingsValuesTab(st.id);
                }}
                bg={
                  settingsValuesTab === st.id
                    ? dark
                      ? "#444"
                      : "#333"
                    : dark
                    ? "#333"
                    : "#f0f0f0"
                }
                color={
                  settingsValuesTab === st.id ? "#fff" : dark ? "#eee" : "#555"
                }
                style={{
                  fontSize: 12,
                  padding: "8px 11px",
                  whiteSpace: "nowrap",
                  minWidth: settingsValuesTab === st.id ? 92 : 78,
                  flex: "0 0 auto",
                  textAlign: "center",
                }}
              >
                {st.icon} {L(st.label)}
              </Btn>
            );
          })}
        </div>
        {settingsValuesTab === "cats" && (
          <>
            <SettingsList
              items={cats}
              setItems={guardedSetter(setExpenseCatsFromSettings, "base")}
              label="Aggiungi categoria uscita"
              showGroup
              showIcon
              groupList={expenseGroups || DEFAULT_EXPENSE_GROUPS}
              usageScope="expenseCategory"
            />
            {baseLockHint(
              "Modifica, archiviazione, eliminazione e aggiunta categorie disponibili dal piano Base"
            )}
          </>
        )}
        {settingsValuesTab === "income_types" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                background: dark ? "#1e2a1e" : "#f0faf5",
                borderRadius: 10,
                border: "1px solid " + (dark ? "#2a5a2a" : "#a8e6c8"),
                padding: "10px 14px",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: dark ? "#7ec" : "#1D9E75",
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                💰 Tipi di entrata
              </div>
              <div style={{ fontSize: 12, color: dark ? "#aaa" : "#555" }}>
                I tipi di entrata sono predefiniti dal sistema (Busta paga,
                Bonus, Azioni, ecc.). Puoi modificarne nome e icona.
              </div>
            </div>
            {incomeTypes.map(function (it) {
              return (
                <div
                  key={it.id}
                  style={{
                    background: cardBg,
                    borderRadius: 10,
                    border: "1px solid " + borderC,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{it.icon}</span>
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: it.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 14, color: textC }}>
                    {translateUiRuntimeText(it.name)}
                  </span>
                </div>
              );
            })}
            <div style={{ fontSize: 12, color: subC, marginTop: 4 }}>
              {translateUiRuntimeText(
                "Le categorie personalizzate si aggiungono da Sezioni → Entrate → Categorie."
              )}
            </div>
          </div>
        )}
        {settingsValuesTab === "methods" && (
          <div>
            <SettingsList
              items={methods}
              setItems={guardedSetter(setMethods, "base")}
              label="Aggiungi metodo di pagamento"
              showIcon
              showGroup
              groupList={methodGroups}
              isMethod
              usageScope="method"
            />
            {baseLockHint(
              "Modifica, archiviazione, ripristino, riordino e aggiunta metodi disponibili dal piano Base"
            )}
            <div style={{ fontSize: 12, color: subC, marginTop: 8 }}>
              🗂 = Archivia 📂 = Ripristina
            </div>
          </div>
        )}
        {settingsValuesTab === "areas" && <AreasEditor />}
        {settingsValuesTab === "patrimonio" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SettingsList
              items={patrimonioEntries || DEFAULT_PATRIMONIO_ENTRIES}
              setItems={setPatrimonioEntries}
              label="Aggiungi voce patrimonio"
              showGroup
              showIcon
              groupList={(patrimonioAreas || DEFAULT_PATRIMONIO_AREAS).map(
                function (a) {
                  return {
                    id: a.id,
                    name: a.icon + " " + a.name,
                    color: a.color,
                  };
                }
              )}
            />
            <div style={{ fontSize: 12, color: subC, marginTop: 4 }}>
              🗂 = {L("Archivia")} 📂 = {L("Ripristina")} ·{" "}
              {L("Le aree si gestiscono in Aree → Patrimonio")}
            </div>
          </div>
        )}
        {settingsValuesTab === "order" && (
          <div key="order-panel">
            <SortOrderPanel />
          </div>
        )}
        {settingsValuesTab === "defaultcat" && (
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
                fontSize: 13,
                fontWeight: 600,
                color: textC,
                marginBottom: 4,
              }}
            >
              ⭐ {L("Categoria default")}
            </div>
            <div style={{ fontSize: 12, color: subC, marginBottom: 12 }}>
              {L(
                "Categoria preselezionata quando apri il form di inserimento uscita"
              )}
            </div>
            <select style={sinp}>
              <option value="">{L("Nessuna (prima della lista)")}</option>
              {settingsActiveCats.map(function (c) {
                return (
                  <option key={c.id} value={c.id}>
                    {c.icon} {L(c.name)}
                  </option>
                );
              })}
            </select>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 10,
                background: dark ? "#252535" : "#f0f4ff",
                borderRadius: 10,
                padding: "10px 12px",
                border: "1px solid " + (dark ? "#3a3a5a" : "#c7d7f8"),
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
              <span style={{ fontSize: 12, color: dark ? "#aac" : "#446" }}>
                Questa impostazione definisce solo la{" "}
                <strong>visualizzazione predefinita</strong>: la categoria
                preselezionata all'apertura del form. Se selezioni manualmente
                una categoria diversa al momento dell'inserimento, quella scelta
                ha sempre la precedenza.
              </span>
            </div>
          </div>
        )}
        {settingsValuesTab === "merge" && (
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 20,
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <label
                style={{
                  fontSize: 12,
                  color: subC,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {L("Da (elimina)")}
              </label>
              <select
                value={mergeFrom}
                onChange={function (e) {
                  setMergeFrom(e.target.value);
                }}
                style={sinp}
              >
                <option value="">-</option>
                {settingsActiveCats.map(function (c) {
                  return (
                    <option key={c.id} value={c.id}>
                      {c.icon} {L(c.name)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  color: subC,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                {L("In (mantieni)")}
              </label>
              <select
                value={mergeTo}
                onChange={function (e) {
                  setMergeTo(e.target.value);
                }}
                style={sinp}
              >
                <option value="">-</option>
                {settingsActiveCats
                  .filter(function (c) {
                    return String(c.id) !== mergeFrom;
                  })
                  .map(function (c) {
                    return (
                      <option key={c.id} value={c.id}>
                        {c.icon} {L(c.name)}
                      </option>
                    );
                  })}
              </select>
            </div>
            <Btn
              onClick={function () {
                if (blockSetting("base")) return;
                if (!mergeFrom || !mergeTo) return;
                var from = String(mergeFrom),
                  to = String(mergeTo);
                if (
                  !window.confirm(
                    categoryMergeConfirmation(settingsActiveCats, from, to)
                  )
                )
                  return;
                setExpenses(
                  expenses.map(function (e) {
                    return String(e.catId || e.categoryId || "") === from
                      ? { ...e, catId: to, categoryId: to }
                      : e;
                  })
                );
                setRecurring(
                  (recurring || []).map(function (r) {
                    return String(r.catId || r.categoryId || "") === from
                      ? { ...r, catId: to, categoryId: to }
                      : r;
                  })
                );
                setCats(
                  cats.filter(function (c) {
                    return String(c.id) !== from;
                  })
                );
                setCatOrder(function (prev) {
                  return (prev || []).filter(function (id) {
                    return String(id) !== from;
                  });
                });
                setFilterCats(function (prev) {
                  return (prev || [])
                    .map(function (id) {
                      var sid = String(id);
                      if (sid === from) return to;
                      if (sid === "expense:" + from) return "expense:" + to;
                      return sid;
                    })
                    .filter(function (id, i, arr) {
                      return arr.indexOf(id) === i;
                    });
                });
                if (String(defaultExpenseCat || "") === from)
                  setDefaultExpenseCat(to);
                setMergeFrom("");
                setMergeTo("");
                setToast &&
                  setToast({
                    text: L("Categorie accorpate correttamente."),
                    type: "success",
                    icon: "🔗",
                  });
              }}
              style={{
                width: "100%",
                padding: 13,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {L("Accorpa")}
            </Btn>
          </div>
        )}
      </div>
    );

  function NotificationsSettingsPage() {
    var np = notifPrefs || {};
    function setNp(k, v) {
      setNotifPrefs(function (p) {
        return { ...p, [k]: v };
      });
    }
    var notifBaseAllowed = settingAllowed("base");
    var [showNewNotif, setShowNewNotif] = useState(false);
    var [editNotifId, setEditNotifId] = useState(null);
    var emptyNotif = {
      title: "",
      text: "",
      hour: "09:00",
      freq: "monthly",
      dayOfMonth: 1,
      dayOfWeek: 1,
      date: todayStr(),
      active: true,
    };
    var [newNotif, setNewNotif] = useState(emptyNotif);
    var customNotifFormValid =
      !!String((newNotif || {}).title || "").trim() &&
      !!String((newNotif || {}).hour || "").trim() &&
      (((newNotif || {}).freq !== "once" &&
        (newNotif || {}).freq !== "yearly") ||
        !!String((newNotif || {}).date || "").trim());
    function saveNotif() {
      if (!customNotifFormValid) return;
      if (blockSetting("base")) return;
      if (!newNotif.title.trim()) {
        setToast({
          text: "⚠️ Inserisci il titolo della notifica.",
          type: "warning",
        });
        return;
      }
      if (editNotifId) {
        setCustomNotifs(function (p) {
          return p.map(function (n) {
            return n.id === editNotifId ? { ...newNotif, id: editNotifId } : n;
          });
        });
        setEditNotifId(null);
        setToast("Notifica personalizzata modificata");
      } else {
        setCustomNotifs(function (p) {
          return [...p, { ...newNotif, id: Date.now() }];
        });
        setToast("Notifica personalizzata creata");
      }
      setNewNotif(emptyNotif);
      setShowNewNotif(false);
    }
    function startEditNotif(n) {
      setNewNotif({
        title: n.title,
        text: n.text || "",
        hour: n.hour || "09:00",
        freq: n.freq || "monthly",
        dayOfMonth: n.dayOfMonth || 1,
        dayOfWeek: n.dayOfWeek || 1,
        date: n.date || todayStr(),
        active: n.active !== false,
      });
      setEditNotifId(n.id);
      setShowNewNotif(true);
    }
    function delNotif(id) {
      if (!window.confirm(L("Eliminare questa notifica personalizzata?")))
        return;
      setCustomNotifs(function (p) {
        return p.filter(function (n) {
          return n.id !== id;
        });
      });
      setToast("Notifica personalizzata eliminata");
    }
    function toggleNotif(id) {
      setCustomNotifs(function (p) {
        return p.map(function (n) {
          return n.id === id ? { ...n, active: !n.active } : n;
        });
      });
    }
    var FREQ_LABELS = {
      daily: "Ogni giorno",
      weekly: "Ogni settimana",
      monthly: "Ogni mese",
      yearly: "Ogni anno",
      once: "Una tantum",
    };
    var DOW = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
    return (
      <div>
        <PageHeader title="Notifiche & Promemoria" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Promemoria inserimento */}
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
                fontSize: 14,
                fontWeight: 600,
                color: textC,
                marginBottom: 4,
              }}
            >
              ⏰ Promemoria inserimento spese
            </div>
            <div style={{ fontSize: 12, color: subC, marginBottom: 14 }}>
              {L("Ricevere un promemoria per inserire le spese del giorno")}
            </div>
            <Toggle
              label="Attiva promemoria"
              checked={!!np.remindActive}
              onChange={function () {
                setNp("remindActive", !np.remindActive);
              }}
            />
            {np.remindActive && (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: subC, marginBottom: 6 }}>
                    Frequenza
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { id: "daily", label: "Ogni giorno" },
                      { id: "every2", label: "Ogni 2 giorni" },
                      { id: "every3", label: "Ogni 3 giorni" },
                      { id: "weekly", label: "Settimanale" },
                    ].map(function (f) {
                      return (
                        <button
                          key={f.id}
                          onClick={function () {
                            setNp("remindFreq", f.id);
                          }}
                          style={{
                            padding: "7px 14px",
                            borderRadius: 8,
                            border:
                              "1px solid " +
                              (np.remindFreq === f.id ? "#7F77DD" : borderC),
                            background:
                              np.remindFreq === f.id
                                ? "#EEEDFE"
                                : dark
                                ? "#252535"
                                : "#f5f5f5",
                            color: np.remindFreq === f.id ? "#534AB7" : textC,
                            fontSize: 12,
                            cursor: "pointer",
                            fontWeight: np.remindFreq === f.id ? 600 : 400,
                          }}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: subC, marginBottom: 6 }}>
                    Orario
                  </div>
                  <input
                    type="time"
                    value={np.remindHour || "20:00"}
                    onChange={function (e) {
                      setNp("remindHour", e.target.value);
                    }}
                    style={{ ...sinp, width: "auto" }}
                  />
                </div>
                <div
                  style={{
                    background: "#FFF8E1",
                    border: "1px solid #FFD54F",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <span style={{ fontSize: 12, color: "#856404" }}>
                    {"ℹ️ " +
                      L(
                        'I promemoria richiedono i permessi di notifica del browser. Clicca "Attiva" per abilitarli.'
                      )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Notifiche di sistema */}
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
                fontSize: 14,
                fontWeight: 600,
                color: textC,
                marginBottom: 14,
              }}
            >
              🔔 Notifiche di sistema
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: dark ? "#252535" : "#f9f9f9",
                  borderRadius: 10,
                  border: "1px solid " + (dark ? "#333" : "#f0f0f0"),
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textC }}>
                    {"💼 " + L("Stipendio")}
                  </div>
                  <div style={{ fontSize: 12, color: subC }}>
                    {L("Notifica il giorno del mese configurato")}
                  </div>
                </div>
                <Toggle
                  label=""
                  checked={!!np.stipendioActive}
                  onChange={function () {
                    setNp("stipendioActive", !np.stipendioActive);
                  }}
                />
              </div>
              {np.stipendioActive && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    paddingLeft: 12,
                  }}
                >
                  <span style={{ fontSize: 12, color: subC }}>
                    {L("Giorno")}:
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={np.stipendioDay || 27}
                    onChange={function (e) {
                      setNp("stipendioDay", parseInt(e.target.value) || 27);
                    }}
                    style={{ ...sinp, width: 70 }}
                  />
                  <span style={{ fontSize: 12, color: subC }}>
                    {L("di ogni mese")}
                  </span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: dark ? "#252535" : "#f9f9f9",
                  borderRadius: 10,
                  border: "1px solid " + (dark ? "#333" : "#f0f0f0"),
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: textC }}>
                    🔄 {L("Spese ricorrenti")}{" "}
                    <span
                      style={{
                        fontSize: 10,
                        background: dark ? "#333" : "#FFF3CD",
                        color: dark ? "#ffd58a" : "#856404",
                        borderRadius: 20,
                        padding: "1px 7px",
                        fontWeight: 900,
                      }}
                    >
                      Base
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: subC }}>
                    {L("Avviso quando ci sono ricorrenti da confermare")}
                  </div>
                </div>
                <Toggle
                  label=""
                  checked={!!np.spesaRicorrente}
                  onChange={function () {
                    if (blockSetting("base")) return;
                    setNp("spesaRicorrente", !np.spesaRicorrente);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Notifiche custom */}
          <div
            style={{
              background: notifBaseAllowed ? cardBg : "#FFF8E1",
              borderRadius: 14,
              border: "1px solid " + (notifBaseAllowed ? borderC : "#FFD54F"),
              padding: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: textC }}>
                  ✏️ {L("Notifiche personalizzate")}{" "}
                  <span
                    style={{
                      fontSize: 10,
                      background: dark ? "#333" : "#FFF3CD",
                      color: dark ? "#ffd58a" : "#856404",
                      borderRadius: 20,
                      padding: "1px 7px",
                      fontWeight: 900,
                    }}
                  >
                    Base
                  </span>
                </div>
                {!notifBaseAllowed && (
                  <div
                    style={{
                      fontSize: 12,
                      color: dark ? "#ffd58a" : "#856404",
                      marginTop: 4,
                    }}
                  >
                    {L(
                      "Disponibili dal piano Base. Puoi vederle qui, ma non crearle o modificarle nel piano Gratis."
                    )}
                  </div>
                )}
              </div>
              {!showNewNotif && (
                <button
                  onClick={function () {
                    if (blockSetting("base")) return;
                    setNewNotif(emptyNotif);
                    setEditNotifId(null);
                    setShowNewNotif(true);
                  }}
                  style={{
                    background: notifBaseAllowed
                      ? "#7F77DD"
                      : dark
                      ? "#333"
                      : "#e5e5e5",
                    color: notifBaseAllowed ? "#fff" : subC,
                    border: "none",
                    borderRadius: btnRadius,
                    padding: "7px 14px",
                    fontSize: 13,
                    cursor: notifBaseAllowed ? "pointer" : "not-allowed",
                    fontWeight: 700,
                  }}
                >
                  {"+ " + L("Nuova") + " " + (notifBaseAllowed ? "" : "🔒")}
                </button>
              )}
            </div>

            {/* Form crea/modifica */}
            {showNewNotif && (
              <div
                style={{
                  background: dark ? "#1e1e30" : "#f5f5ff",
                  borderRadius: 12,
                  border: "1px solid #AFA9EC",
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#534AB7",
                    marginBottom: 12,
                  }}
                >
                  {editNotifId ? L("Modifica notifica") : L("Nuova notifica")}
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: subC,
                        display: "block",
                        marginBottom: 3,
                      }}
                    >
                      {L("Titolo *")}
                    </label>
                    <input
                      type="text"
                      placeholder={L("Es. Pagamento affitto")}
                      value={newNotif.title}
                      onChange={function (e) {
                        setNewNotif(function (p) {
                          return { ...p, title: e.target.value };
                        });
                      }}
                      style={sinp}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: subC,
                        display: "block",
                        marginBottom: 3,
                      }}
                    >
                      {L("Testo (opzionale)")}
                    </label>
                    <input
                      type="text"
                      placeholder={L(
                        "Es. Ricorda di pagare l'affitto di questo mese"
                      )}
                      value={newNotif.text}
                      onChange={function (e) {
                        setNewNotif(function (p) {
                          return { ...p, text: e.target.value };
                        });
                      }}
                      style={sinp}
                    />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: subC,
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        {L("Orario")}
                      </label>
                      <input
                        type="time"
                        value={newNotif.hour}
                        onChange={function (e) {
                          setNewNotif(function (p) {
                            return { ...p, hour: e.target.value };
                          });
                        }}
                        style={sinp}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: subC,
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        {L("Frequenza")}
                      </label>
                      <select
                        value={newNotif.freq}
                        onChange={function (e) {
                          setNewNotif(function (p) {
                            return { ...p, freq: e.target.value };
                          });
                        }}
                        style={sinp}
                      >
                        <option value="daily">{L("Ogni giorno")}</option>
                        <option value="weekly">{L("Ogni settimana")}</option>
                        <option value="monthly">{L("Ogni mese")}</option>
                        <option value="yearly">{L("Ogni anno")}</option>
                        <option value="once">{L("Una tantum")}</option>
                      </select>
                    </div>
                  </div>
                  {newNotif.freq === "weekly" && (
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: subC,
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        {L("Giorno della settimana")}
                      </label>
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        {DOW.map(function (d, i) {
                          return (
                            <button
                              key={i}
                              onClick={function () {
                                setNewNotif(function (p) {
                                  return { ...p, dayOfWeek: i };
                                });
                              }}
                              style={{
                                padding: "5px 10px",
                                borderRadius: 6,
                                border:
                                  "1px solid " +
                                  (newNotif.dayOfWeek === i
                                    ? "#7F77DD"
                                    : borderC),
                                background:
                                  newNotif.dayOfWeek === i
                                    ? "#EEEDFE"
                                    : dark
                                    ? "#252535"
                                    : "#f5f5f5",
                                color:
                                  newNotif.dayOfWeek === i ? "#534AB7" : textC,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {newNotif.freq === "monthly" && (
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: subC,
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        {L("Giorno del mese")}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={newNotif.dayOfMonth}
                        onChange={function (e) {
                          setNewNotif(function (p) {
                            return {
                              ...p,
                              dayOfMonth: parseInt(e.target.value) || 1,
                            };
                          });
                        }}
                        style={{ ...sinp, width: 80 }}
                      />
                    </div>
                  )}
                  {newNotif.freq === "yearly" && (
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: subC,
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        {L("Data (GG/MM)")}
                      </label>
                      <input
                        type="date"
                        value={newNotif.date}
                        onChange={function (e) {
                          setNewNotif(function (p) {
                            return { ...p, date: e.target.value };
                          });
                        }}
                        style={{ ...sinp, width: "auto" }}
                      />
                    </div>
                  )}
                  {newNotif.freq === "once" && (
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: subC,
                          display: "block",
                          marginBottom: 3,
                        }}
                      >
                        {L("Data")}
                      </label>
                      <input
                        type="date"
                        value={newNotif.date}
                        onChange={function (e) {
                          setNewNotif(function (p) {
                            return { ...p, date: e.target.value };
                          });
                        }}
                        style={{ ...sinp, width: "auto" }}
                      />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Btn
                    onClick={saveNotif}
                    disabled={!customNotifFormValid}
                    bg={customNotifFormValid ? "#7F77DD" : "#A8A8A8"}
                    style={{ flex: 1, padding: "10px", fontWeight: 600 }}
                  >
                    {editNotifId ? L("Salva modifiche") : L("Crea notifica")}
                  </Btn>
                  <Btn
                    onClick={function () {
                      setShowNewNotif(false);
                      setEditNotifId(null);
                      setNewNotif(emptyNotif);
                    }}
                    bg={dark ? "#333" : "#f0f0f0"}
                    color={dark ? "#eee" : "#666"}
                    style={{ padding: "10px 16px" }}
                  >
                    {L("Annulla")}
                  </Btn>
                </div>
              </div>
            )}

            {/* Lista notifiche custom */}
            {customNotifs.length === 0 && !showNewNotif && (
              <div
                style={{
                  textAlign: "center",
                  color: subC,
                  fontSize: 13,
                  padding: "20px 0",
                }}
              >
                {translateUiRuntimeText(
                  'Nessuna notifica personalizzata. Clicca "+ Nuova" per crearne una.'
                )}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {customNotifs.map(function (n) {
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 14px",
                      background: n.active
                        ? dark
                          ? "#252535"
                          : "#f9f9f9"
                        : dark
                        ? "#1a1a28"
                        : "#f5f5f5",
                      borderRadius: 10,
                      border:
                        "1px solid " +
                        (n.active
                          ? dark
                            ? "#333"
                            : "#e8e8e8"
                          : dark
                          ? "#2a2a3e"
                          : "#ddd"),
                      opacity: n.active ? 1 : 0.65,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: textC,
                            marginBottom: 2,
                          }}
                        >
                          {n.title}
                        </div>
                        {n.text && (
                          <div
                            style={{
                              fontSize: 12,
                              color: subC,
                              marginBottom: 4,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {n.text}
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              background: "#EEEDFE",
                              color: "#534AB7",
                              borderRadius: 6,
                              padding: "2px 8px",
                            }}
                          >
                            {L(FREQ_LABELS[n.freq] || n.freq)}
                          </span>
                          <span style={{ fontSize: 11, color: subC }}>
                            🕐 {n.hour || "09:00"}
                          </span>
                          {n.freq === "monthly" && (
                            <span style={{ fontSize: 11, color: subC }}>
                              📅 {L("giorno")} {n.dayOfMonth}
                            </span>
                          )}
                          {n.freq === "weekly" && (
                            <span style={{ fontSize: 11, color: subC }}>
                              📅 {DOW[n.dayOfWeek || 0]}
                            </span>
                          )}
                          {(n.freq === "once" || n.freq === "yearly") &&
                            n.date && (
                              <span style={{ fontSize: 11, color: subC }}>
                                📅 {fmtDate(n.date, "dmy")}
                              </span>
                            )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Toggle
                          label=""
                          checked={n.active !== false}
                          onChange={function () {
                            if (blockSetting("base")) return;
                            toggleNotif(n.id);
                          }}
                        />
                        <button
                          title={L("Modifica")}
                          onClick={function () {
                            if (blockSetting("base")) return;
                            startEditNotif(n);
                          }}
                          style={{
                            background: "#EEF4FF",
                            border: "1px solid #BFD7FF",
                            cursor: notifBaseAllowed
                              ? "pointer"
                              : "not-allowed",
                            color: "#378ADD",
                            fontSize: 14,
                            padding: "5px 8px",
                            borderRadius: 8,
                            fontWeight: 700,
                            opacity: notifBaseAllowed ? 1 : 0.45,
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          title={L("Elimina")}
                          onClick={function () {
                            if (blockSetting("base")) return;
                            delNotif(n.id);
                          }}
                          style={{
                            background: "#FFF0F0",
                            border: "1px solid #FFD0D0",
                            cursor: notifBaseAllowed
                              ? "pointer"
                              : "not-allowed",
                            color: "#E24B4A",
                            fontSize: 14,
                            padding: "5px 8px",
                            borderRadius: 8,
                            fontWeight: 700,
                            opacity: notifBaseAllowed ? 1 : 0.45,
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function CustomIconAppearancePanel() {
    var library = useCustomIconLibrary();
    var [uploading, setUploading] = useState(false);
    var [iconError, setIconError] = useState("");
    var iconFileInputRef = useRef<any>(null);
    async function uploadIcon(file) {
      if (!file) return;
      setUploading(true);
      setIconError("");
      try {
        await uploadCustomIcon(file);
        await library.refresh();
        setToast(L("Icona personale caricata"));
      } catch (e) {
        var code = String(e && e.message ? e.message : e || "");
        if (code === "CUSTOM_ICON_CANCELLED") return;
        if (code === "CUSTOM_ICON_LIMIT")
          setIconError(L("Hai raggiunto il limite di icone personali."));
        else if (code === "CUSTOM_ICON_TOO_LARGE")
          setIconError(L("L'immagine selezionata è troppo grande."));
        else if (code.indexOf("CUSTOM_ICON_") === 0)
          setIconError(
            L("Impossibile elaborare l'icona. Prova con JPG, PNG o WebP.")
          );
        else setIconError(L("Impossibile caricare l'icona personale."));
      } finally {
        setUploading(false);
      }
    }
    async function chooseIcon() {
      if (uploading) return;
      setIconError("");
      try {
        var cap: any =
          typeof window !== "undefined" ? (window as any).Capacitor : null;
        var native = !!(
          cap &&
          typeof cap.isNativePlatform === "function" &&
          cap.isNativePlatform()
        );
        if (native) {
          var file = await pickNativeCustomIconFile();
          if (file) await uploadIcon(file);
          return;
        }
        var input = iconFileInputRef.current;
        if (!input) throw new Error("CUSTOM_ICON_INPUT_UNAVAILABLE");
        input.click();
      } catch (e) {
        var code = String(e && e.message ? e.message : e || "");
        if (code === "CUSTOM_ICON_CANCELLED") return;
        if (code.indexOf("CUSTOM_ICON_") === 0)
          setIconError(
            L("Impossibile elaborare l'icona. Prova con JPG, PNG o WebP.")
          );
        else setIconError(L("Impossibile caricare l'icona personale."));
      }
    }
    async function removeIcon(item) {
      if (!window.confirm(L("Eliminare questa icona personale?"))) return;
      setIconError("");
      try {
        await deleteCustomIconRecord(item.id);
        await library.refresh();
        setToast(L("Icona personale eliminata"));
      } catch (e) {
        setIconError(L("Impossibile eliminare l'icona personale."));
      }
    }
    var items = library.items || [];
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
              fontSize: 14,
              fontWeight: 800,
              color: textC,
              marginBottom: 5,
            }}
          >
            {"🖼️ " + L("Icone personali")}
          </div>
          <div
            style={{
              fontSize: 12,
              color: subC,
              lineHeight: 1.5,
              marginBottom: 14,
            }}
          >
            {L(
              "Carica qui le tue icone personali. Saranno disponibili in tutti i selettori di icone compatibili dell'app, indipendentemente dal piano."
            )}
          </div>
          <input
            ref={iconFileInputRef}
            type="file"
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.jfif"
            disabled={uploading}
            onChange={function (e) {
              var input = e.currentTarget;
              var file = input.files && input.files[0];
              input.value = "";
              if (file) uploadIcon(file);
            }}
            style={{
              position: "fixed",
              left: -10000,
              top: -10000,
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: "none",
            }}
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={chooseIcon}
            disabled={uploading}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1px dashed " + (secondaryButtonColor || "#5FAFE5"),
              background: (secondaryButtonColor || "#5FAFE5") + "12",
              color: secondaryButtonColor || "#378ADD",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 900,
              cursor: uploading ? "wait" : "pointer",
              opacity: uploading ? 0.65 : 1,
            }}
          >
            {uploading ? L("Ottimizzazione icona...") : L("Carica nuova icona")}
          </button>
          <div
            style={{
              fontSize: 11,
              color: subC,
              lineHeight: 1.45,
              marginTop: 8,
            }}
          >
            {L(
              "L'icona viene ritagliata, ridimensionata e compressa automaticamente per occupare meno spazio."
            )}
          </div>
          <div
            style={{
              fontSize: 11,
              color: subC,
              lineHeight: 1.45,
              marginTop: 4,
            }}
          >
            {L("Disponibile per tutti i piani.")} {items.length}/
            {CUSTOM_ICON_MAX_ITEMS}
          </div>
          {iconError && (
            <div
              style={{
                marginTop: 10,
                border: "1px solid #F3A9A9",
                background: dark ? "#3A2020" : "#FFF2F2",
                color: "#E24B4A",
                borderRadius: 10,
                padding: "9px 11px",
                fontSize: 12,
                fontWeight: 750,
              }}
            >
              {iconError}
            </div>
          )}
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
              fontSize: 13,
              fontWeight: 800,
              color: textC,
              marginBottom: 12,
            }}
          >
            {L("La mia libreria")}
          </div>
          {library.loading ? (
            <div
              style={{
                fontSize: 12,
                color: subC,
                padding: "18px 0",
                textAlign: "center",
              }}
            >
              {L("Caricamento icone...")}
            </div>
          ) : items.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(92px,1fr))",
                gap: 12,
              }}
            >
              {items.map(function (item) {
                var ref = customIconValue(item.ownerUid, item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid " + borderC,
                      borderRadius: 14,
                      padding: 10,
                      background: dark ? "#252535" : "#F8FAFD",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <FainanceIcon value={ref} size={52} />
                    <div
                      title={item.label || L("Icona personale")}
                      style={{
                        width: "100%",
                        fontSize: 11,
                        color: textC,
                        fontWeight: 750,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label || L("Icona personale")}
                    </div>
                    <button
                      type="button"
                      onClick={function () {
                        removeIcon(item);
                      }}
                      style={{
                        width: "100%",
                        border: "1px solid #FCA5A5",
                        background: dark ? "#3A2228" : "#FFF5F5",
                        color: "#E24B4A",
                        borderRadius: 9,
                        padding: "6px 7px",
                        fontSize: 11,
                        fontWeight: 850,
                        cursor: "pointer",
                      }}
                    >
                      {L("Elimina")}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                color: subC,
                padding: "22px 0",
                textAlign: "center",
              }}
            >
              {L("Non hai ancora caricato icone personali.")}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (settingsPage === "notifications")
    return (
      <StableNestedPanelHost
        key="settings-notifications"
        render={function () {
          return NotificationsSettingsPage();
        }}
      />
    );

  if (settingsPage === "patrimonio_settings")
    return (
      <div>
        <PageHeader title="Patrimonio" />
        <SettingsCards
          items={[
            {
              id: "patrimonio_areas_settings",
              icon: "📂",
              label: "Aree",
              desc: settingAllowed("base")
                ? "Lista, crea, modifica e riordina aree patrimonio"
                : "Lista disponibile. Crea, modifica e riordina dal piano Base",
            },
            {
              id: "patrimonio_entries_settings",
              icon: "💎",
              label: "Voci",
              desc: settingAllowed("base")
                ? "Lista, crea, modifica e riordina voci patrimonio"
                : "Lista disponibile. Crea, modifica e riordina dal piano Base",
            },
            {
              id: "patrimonio_mode_settings",
              icon: "⚙️",
              label: "Modalità",
              desc: "Come vengono aggiornati i valori del patrimonio",
            },
          ]}
        />
      </div>
    );
  if (settingsPage === "patrimonio_areas_settings")
    return (
      <div>
        <PageHeader title="Patrimonio / Aree" />
        <PatrimonioSettingsPanel
          forcedSection="areas"
          allowEditing={settingAllowed("base")}
          onLocked={function () {
            blockSetting("base");
          }}
        />
      </div>
    );
  if (settingsPage === "patrimonio_entries_settings")
    return (
      <div>
        <PageHeader title="Patrimonio / Voci" />
        <PatrimonioSettingsPanel
          forcedSection="entries"
          allowEditing={settingAllowed("base")}
          onLocked={function () {
            blockSetting("base");
          }}
        />
      </div>
    );
  if (settingsPage === "patrimonio_mode_settings")
    return (
      <div>
        <PageHeader title="Patrimonio / Modalità" />
        <PatrimonioSettingsPanel forcedSection="mode" />
      </div>
    );

  if (settingsPage === "appearance")
    return (
      <div>
        <PageHeader title="Aspetto" />
        <SettingsCards
          items={[
            {
              id: "appearance_app",
              icon: "🎨",
              label: "App",
              desc: "Tema, sfondo, stile e colori dei pulsanti dell’app",
            },
            {
              id: "appearance_nav",
              icon: "📱",
              label: "Barra superiore e inferiore",
              desc: "Barra superiore, numero icone e ordine delle sezioni",
            },
            {
              id: "appearance_widget",
              icon: "🧩",
              label: "Widget",
              desc: "Configurazione separata del widget Android",
            },
            {
              id: "appearance_icons",
              icon: "🖼️",
              label: "Icone personali",
              desc: "Carica e gestisci le icone personali disponibili in tutta l'app",
            },
          ]}
        />
      </div>
    );

  if (settingsPage === "appearance_nav")
    return (
      <div>
        <PageHeader title={L("Aspetto / Barra superiore e inferiore")} />
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
                fontSize: 14,
                fontWeight: 700,
                color: textC,
                marginBottom: 4,
              }}
            >
              {"📊 " + L("Barra superiore")}
            </div>
            <SettingHint>
              {translateUiRuntimeText(
                "Attiva o rimuove la barra superiore con Uscite, Saldo ed Entrate."
              )}
            </SettingHint>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                background: dark ? "#252535" : "#f9f9f9",
                border: "1px solid " + borderC,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: textC }}>
                  {L("Mostra riepilogo in alto")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: subC,
                    marginTop: 3,
                    lineHeight: 1.35,
                  }}
                >
                  {L("Mostra o nasconde la barra superiore dell’app.")}
                </div>
              </div>
              <Toggle
                label=""
                checked={!!showAppSummaryHeader}
                onChange={function () {
                  setShowAppSummaryHeader(!showAppSummaryHeader);
                  setToast(L("Impostazioni aggiornate"));
                }}
              />
            </div>
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
                fontSize: 14,
                fontWeight: 700,
                color: textC,
                marginBottom: 4,
              }}
            >
              {"📱 " + L("Barra inferiore")}
            </div>
            <SettingHint>
              {L(
                "Le prime sezioni dell'elenco entrano nella barra inferiore, in base al numero di icone scelto. Le altre restano nel menu Altro. L'icona Altro resta sempre disponibile."
              )}
            </SettingHint>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: textC,
                marginBottom: 6,
              }}
            >
              {L("Numero icone nella barra inferiore")}
            </div>
            <Segmented
              items={[3, 4, 5, 6, 7].map(function (n) {
                return { id: String(n), label: String(n) };
              })}
              value={String(mobileNavIconCount || 5)}
              onChange={function (v) {
                setMobileNavIconCount(parseInt(v, 10));
                setToast(L("Impostazioni aggiornate"));
              }}
            />
            <div
              style={{
                fontSize: 12,
                color: subC,
                marginTop: 8,
                marginBottom: 12,
              }}
            >
              {(function () {
                var n = parseInt(String(mobileNavIconCount || 5), 10) || 5;
                var sec = Math.max(0, n - 1);
                var map = {
                  it: "Con " + n + " icone: " + sec + " sezioni + Altro.",
                  en: "With " + n + " icons: " + sec + " sections + More.",
                  es: "Con " + n + " iconos: " + sec + " secciones + Más.",
                  fr: "Avec " + n + " icônes : " + sec + " sections + Plus.",
                  de: "Mit " + n + " Symbolen: " + sec + " Bereiche + Mehr.",
                  pt: "Com " + n + " ícones: " + sec + " secções + Mais.",
                  pl: "Przy " + n + " ikonach: " + sec + " sekcje + Więcej.",
                  nl: "Met " + n + " pictogrammen: " + sec + " secties + Meer.",
                  ro:
                    "Cu " + n + " pictograme: " + sec + " secțiuni + Mai mult.",
                  el:
                    "Με " +
                    n +
                    " εικονίδια: " +
                    sec +
                    " ενότητες + Περισσότερα.",
                };
                return map[lang] || map.en;
              })()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {normalizeOrder(mobileAllNavOrder, mobileAllNavDefaultOrder).map(
                function (id, idx, arr) {
                  var item = allNavDefs()[id];
                  if (!item) return null;
                  var bottomMap = {};
                  getBottomNavIds().forEach(function (x) {
                    bottomMap[x] = true;
                  });
                  var zone = bottomMap[id] ? "Barra inferiore" : "Menu Altro";
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: dark ? "#252535" : "#f9f9f9",
                        border: "1px solid " + borderC,
                        borderRadius: 10,
                        padding: "8px 10px",
                      }}
                    >
                      <span
                        style={{ fontSize: 18, width: 28, textAlign: "center" }}
                      >
                        {item.icon}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 800,
                          color: textC,
                        }}
                      >
                        {L(item.label)}
                        <span
                          style={{
                            display: "block",
                            fontSize: 10,
                            fontWeight: 700,
                            color: bottomMap[id] ? "#1D9E75" : subC,
                            marginTop: 2,
                          }}
                        >
                          {L(zone)}
                        </span>
                      </span>
                      <button
                        onClick={function () {
                          moveOrder(
                            mobileAllNavOrder,
                            setMobileAllNavOrder,
                            mobileAllNavDefaultOrder,
                            id,
                            -1
                          );
                        }}
                        disabled={idx === 0}
                        style={{
                          border: "1px solid " + borderC,
                          borderRadius: 8,
                          background: dark ? "#1e1e30" : "#fff",
                          color: textC,
                          padding: "4px 8px",
                          opacity: idx === 0 ? 0.35 : 1,
                          cursor: idx === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        ▲
                      </button>
                      <button
                        onClick={function () {
                          moveOrder(
                            mobileAllNavOrder,
                            setMobileAllNavOrder,
                            mobileAllNavDefaultOrder,
                            id,
                            1
                          );
                        }}
                        disabled={idx === arr.length - 1}
                        style={{
                          border: "1px solid " + borderC,
                          borderRadius: 8,
                          background: dark ? "#1e1e30" : "#fff",
                          color: textC,
                          padding: "4px 8px",
                          opacity: idx === arr.length - 1 ? 0.35 : 1,
                          cursor:
                            idx === arr.length - 1 ? "not-allowed" : "pointer",
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>
    );

  if (settingsPage === "appearance_app")
    return (
      <div>
        <PageHeader title="Aspetto / App" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid " + borderC,
          }}
        >
          <div
            style={{
              background: cardBg,
              padding: "16px 20px",
              borderBottom: "1px solid " + borderC,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: textC,
                marginBottom: 10,
              }}
            >
              {"🌙 " + L("Dark Mode")}
            </div>
            <Toggle
              label={L("Attiva la dark mode")}
              checked={dark}
              onChange={function () {
                setBgTheme(dark ? "default" : "dark");
              }}
              color="#7F77DD"
            />
          </div>
          <div
            onClick={function () {
              if (!baseSettingsAllowed) blockSetting("base");
            }}
            style={{
              background: baseSettingsAllowed
                ? cardBg
                : dark
                ? "#342b16"
                : "#FFF8E1",
              padding: "16px 20px",
              borderBottom:
                "1px solid " +
                (baseSettingsAllowed ? borderC : dark ? "#6a5520" : "#FFD54F"),
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: baseSettingsAllowed
                  ? textC
                  : dark
                  ? "#ffd58a"
                  : "#856404",
                marginBottom: 12,
              }}
            >
              {"🎨 " + L("Sfondo")}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
              }}
            >
              {BG_THEMES.map(function (th) {
                return (
                  <button
                    key={th.id}
                    disabled={!baseSettingsAllowed}
                    onClick={function () {
                      if (blockSetting("base")) return;
                      setBgTheme(th.id);
                    }}
                    style={{
                      padding: "10px 6px",
                      border:
                        "2px solid " +
                        (baseSettingsAllowed
                          ? bgTheme === th.id
                            ? "#7F77DD"
                            : borderC
                          : "#FFD54F"),
                      borderRadius: 12,
                      background: baseSettingsAllowed ? th.bg : "#FFF8E1",
                      cursor: baseSettingsAllowed ? "pointer" : "not-allowed",
                      fontSize: 11,
                      color: baseSettingsAllowed
                        ? th.dark
                          ? "#eee"
                          : "#333"
                        : "#856404",
                      fontWeight: bgTheme === th.id ? 600 : 400,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      opacity: 1,
                      filter: baseSettingsAllowed ? "none" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: th.bg,
                        border: "1px solid #ccc",
                      }}
                    />
                    {bgTheme === th.id && (
                      <span style={{ fontSize: 9, color: "#7F77DD" }}>✓</span>
                    )}
                    <span>{L(th.label)}</span>
                  </button>
                );
              })}
            </div>
            {baseLockHint("Scelta sfondo disponibile dal piano Base")}
          </div>
          <div
            style={{
              background: cardBg,
              padding: "16px 20px",
              borderBottom: "1px solid " + borderC,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: textC,
                marginBottom: 12,
              }}
            >
              {"🔲 " + L("Stile pulsanti")}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {BUTTON_STYLES.map(function (bs) {
                return (
                  <button
                    key={bs.id}
                    onClick={function () {
                      setBtnStyle(bs.id);
                      setWidgetButtonStyle(bs.id);
                      var base = widgetSettingsPayload();
                      saveWidgetSettingsToNative(false, {
                        ...base,
                        buttonStyle: bs.id,
                        quickAdd: {
                          ...(base.quickAdd || {}),
                          buttonStyle: bs.id,
                        },
                        shareWidget: {
                          ...(base.shareWidget || {}),
                          buttonStyle: bs.id,
                        },
                      });
                    }}
                    style={{
                      padding: "12px",
                      border:
                        "2px solid " +
                        (btnStyle === bs.id ? "#7F77DD" : borderC),
                      borderRadius: bs.r,
                      background:
                        btnStyle === bs.id
                          ? dark
                            ? "#2a2a3e"
                            : "#EEEDFE"
                          : dark
                          ? "#1e1e30"
                          : "#f9f9f9",
                      cursor: "pointer",
                      fontSize: 13,
                      color: btnStyle === bs.id ? "#7F77DD" : textC,
                      fontWeight: btnStyle === bs.id ? 600 : 400,
                    }}
                  >
                    {L(bs.label)}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            style={{
              background: cardBg,
              padding: "16px 20px",
              borderBottom: "1px solid " + borderC,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: textC,
                marginBottom: 12,
              }}
            >
              {"🔴 " + L("Colore uscite")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <AppColorSelector
                value={expenseColor}
                onChange={function (color) {
                  setExpenseColor(color);
                }}
                compact={true}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "#E24B4A",
                  "#D85A30",
                  "#B33030",
                  "#C0392B",
                  "#E67E22",
                  "#8E44AD",
                ].map(function (c) {
                  return (
                    <button
                      key={c}
                      onClick={function () {
                        setExpenseColor(c);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        background: c,
                        border:
                          expenseColor === c
                            ? "3px solid #333"
                            : "2px solid transparent",
                        borderRadius: "50%",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  background: expenseColor,
                  color: "#fff",
                  borderRadius: btnRadius,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {L("Anteprima")}
              </div>
            </div>
          </div>
          <div style={{ background: cardBg, padding: "16px 20px" }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: textC,
                marginBottom: 12,
              }}
            >
              {"🟢 " + L("Colore entrate")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <AppColorSelector
                value={incomeColor}
                onChange={function (color) {
                  setIncomeColor(color);
                }}
                compact={true}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "#1D9E75",
                  "#27AE60",
                  "#16A085",
                  "#2ECC71",
                  "#3498DB",
                  "#0D6EFD",
                ].map(function (c) {
                  return (
                    <button
                      key={c}
                      onClick={function () {
                        setIncomeColor(c);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        background: c,
                        border:
                          incomeColor === c
                            ? "3px solid #333"
                            : "2px solid transparent",
                        borderRadius: "50%",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  background: incomeColor,
                  color: "#fff",
                  borderRadius: btnRadius,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {L("Anteprima")}
              </div>
            </div>
          </div>
          <div
            onClick={function () {
              if (!baseSettingsAllowed) blockSetting("base");
            }}
            style={{
              background: baseSettingsAllowed
                ? cardBg
                : dark
                ? "#342b16"
                : "#FFF8E1",
              padding: "16px 20px",
              borderTop:
                "1px solid " +
                (baseSettingsAllowed ? borderC : dark ? "#6a5520" : "#FFD54F"),
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: baseSettingsAllowed
                  ? textC
                  : dark
                  ? "#ffd58a"
                  : "#856404",
                marginBottom: 12,
              }}
            >
              {"✅ " + L("Bottoni Principali")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <AppColorSelector
                value={confirmButtonColor}
                disabled={!baseSettingsAllowed}
                onChange={function (color) {
                  if (blockSetting("base")) return;
                  setConfirmButtonColor(color);
                }}
                compact={true}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "#7F77DD",
                  "#378ADD",
                  "#1D9E75",
                  "#EF9F27",
                  "#8E44AD",
                  "#222222",
                ].map(function (c) {
                  return (
                    <button
                      key={c}
                      disabled={!baseSettingsAllowed}
                      onClick={function () {
                        if (blockSetting("base")) return;
                        setConfirmButtonColor(c);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        background: c,
                        border:
                          confirmButtonColor === c
                            ? "3px solid #333"
                            : "2px solid transparent",
                        borderRadius: "50%",
                        cursor: baseSettingsAllowed ? "pointer" : "not-allowed",
                        padding: 0,
                        opacity: baseSettingsAllowed ? 1 : 0.45,
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  background: baseSettingsAllowed
                    ? confirmButtonColor
                    : "#EF9F27",
                  color: "#fff",
                  borderRadius: btnRadius,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {L("Anteprima bottone principale")}
              </div>
            </div>
            {baseLockHint("Bottoni Principali disponibili dal piano Base")}
          </div>
          <div
            onClick={function () {
              if (!baseSettingsAllowed) blockSetting("base");
            }}
            style={{
              background: baseSettingsAllowed
                ? cardBg
                : dark
                ? "#342b16"
                : "#FFF8E1",
              padding: "16px 20px",
              borderTop:
                "1px solid " +
                (baseSettingsAllowed ? borderC : dark ? "#6a5520" : "#FFD54F"),
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: baseSettingsAllowed
                  ? textC
                  : dark
                  ? "#ffd58a"
                  : "#856404",
                marginBottom: 12,
              }}
            >
              {"🟦 " + L("Bottoni Secondari")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <AppColorSelector
                value={secondaryButtonColor || "#378ADD"}
                disabled={!baseSettingsAllowed}
                onChange={function (color) {
                  if (blockSetting("base")) return;
                  setSecondaryButtonColor(color);
                }}
                compact={true}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  "#378ADD",
                  "#7F77DD",
                  "#1D9E75",
                  "#EF9F27",
                  "#8E44AD",
                  "#555555",
                ].map(function (c) {
                  return (
                    <button
                      key={c}
                      disabled={!baseSettingsAllowed}
                      onClick={function () {
                        if (blockSetting("base")) return;
                        setSecondaryButtonColor(c);
                      }}
                      style={{
                        width: 28,
                        height: 28,
                        background: c,
                        border:
                          (secondaryButtonColor || "#378ADD") === c
                            ? "3px solid #333"
                            : "2px solid transparent",
                        borderRadius: "50%",
                        cursor: baseSettingsAllowed ? "pointer" : "not-allowed",
                        padding: 0,
                        opacity: baseSettingsAllowed ? 1 : 0.45,
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  border: "1px solid " + (secondaryButtonColor || "#378ADD"),
                  background: baseSettingsAllowed
                    ? (secondaryButtonColor || "#378ADD") + "22"
                    : dark
                    ? "#4a3c12"
                    : "#FFF8E1",
                  color: baseSettingsAllowed
                    ? secondaryButtonColor || "#378ADD"
                    : dark
                    ? "#ffd54f"
                    : "#856404",
                  borderRadius: btnRadius,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {L("Anteprima bottone secondario")}
              </div>
            </div>
            {baseLockHint("Bottoni Secondari disponibili dal piano Base")}
          </div>
        </div>
      </div>
    );

  if (settingsPage === "appearance_icons")
    return (
      <div>
        <PageHeader title={L("Aspetto / Icone personali")} />
        <CustomIconAppearancePanel />
      </div>
    );

  if (settingsPage === "appearance_widget")
    return (
      <div>
        <PageHeader title="Aspetto / Widget" />
        <WidgetAppearancePanel />
      </div>
    );
  if (settingsPage === "appearance_widget_quick")
    return (
      <div>
        <PageHeader title="Aggiunta Rapida" />
        <WidgetQuickAddSettingsPanel />
      </div>
    );
  if (settingsPage === "appearance_widget_note") {
    if (!isWidgetAllowed("note"))
      return (
        <div>
          <PageHeader title="Nota / Coordinata" />
          <LockedFeatureCard
            icon="📝"
            title="Widget Nota / Coordinata"
            message={widgetLockedMessage("note")}
          />
        </div>
      );
    return (
      <div>
        <PageHeader title="Nota / Coordinata / Carta" />
        <WidgetNoteSettingsPanel />
      </div>
    );
  }
  if (settingsPage === "appearance_widget_goal") {
    if (!isWidgetAllowed("goal"))
      return (
        <div>
          <PageHeader title="Obiettivo" />
          <LockedFeatureCard
            icon="🎯"
            title="Widget Obiettivo"
            message={widgetLockedMessage("goal")}
          />
        </div>
      );
    return (
      <div>
        <PageHeader title="Obiettivo" />
        <WidgetGoalSettingsPanel />
      </div>
    );
  }
  if (settingsPage === "appearance_widget_shopping_list") {
    if (!isWidgetAllowed("shoppingList"))
      return (
        <div>
          <PageHeader title="Lista spesa" />
          <LockedFeatureCard
            icon="🧺"
            title="Widget Lista spesa"
            message={widgetLockedMessage("shoppingList")}
          />
        </div>
      );
    return (
      <div>
        <PageHeader title="Lista spesa" />
        <WidgetShoppingListSettingsPanel />
      </div>
    );
  }
  if (settingsPage === "appearance_widget_fidelity") {
    if (!isWidgetAllowed("fidelity"))
      return (
        <div>
          <PageHeader title="Fidelity card" />
          <LockedFeatureCard
            icon="💳"
            title="Widget Fidelity card"
            message={widgetLockedMessage("fidelity")}
          />
        </div>
      );
    return (
      <div>
        <PageHeader title="Fidelity card" />
        <WidgetFidelitySettingsPanel />
      </div>
    );
  }
  if (settingsPage === "appearance_widget_debt_credits") {
    if (!isWidgetAllowed("debtCredits"))
      return (
        <div>
          <PageHeader title="Debiti / Crediti" />
          <LockedFeatureCard
            icon="📉"
            title="Widget Debiti / Crediti"
            message={widgetLockedMessage("debtCredits")}
          />
        </div>
      );
    return (
      <div>
        <PageHeader title="Debiti / Crediti" />
        <WidgetDebtCreditsSettingsPanel />
      </div>
    );
  }
  if (settingsPage === "appearance_widget_share") {
    if (!isWidgetAllowed("share"))
      return (
        <div>
          <PageHeader title="Share" />
          <LockedFeatureCard
            icon="🤝"
            title="Widget Share"
            message={widgetLockedMessage("share")}
          />
        </div>
      );
    return (
      <div>
        <PageHeader title="Share" />
        <WidgetShareSettingsPanel />
      </div>
    );
  }

  if (settingsPage === "history_settings")
    return (
      <div>
        <PageHeader title="Storico" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                fontSize: 15,
                fontWeight: 700,
                color: textC,
                marginBottom: 4,
              }}
            >
              {L("Ordinamento storico")}
            </div>
            <SettingHint>
              {translateUiRuntimeText(
                "Scegli quale data usare per ordinare uscite ed entrate."
              )}
            </SettingHint>
            <Segmented
              items={[
                { id: "operation", label: "Data operazione" },
                { id: "created", label: "Data inserimento" },
              ]}
              value={historySortDate}
              onChange={setHistorySortDate}
            />
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: textC,
                marginBottom: 4,
              }}
            >
              ↕ {L("Direzione ordinamento")}
            </div>
            <SettingHint>
              {L(
                "Decidi se mostrare prima i movimenti più recenti o quelli più vecchi."
              )}
            </SettingHint>
            <Segmented
              items={[
                { id: "desc", label: "Più recenti" },
                { id: "asc", label: "Più vecchi" },
              ]}
              value={historySortDirection}
              onChange={setHistorySortDirection}
            />
            <div style={{ fontSize: 12, color: subC }}>
              {L(
                "Default: prima i movimenti più recenti, ordinati per data dell’operazione."
              )}
            </div>
          </div>
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 20,
            }}
          >
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: textC, marginBottom: 4 }}>
                🌐 {L("Importo principale nello Storico")}
              </div>
              <SettingHint>
                {L("Per le transazioni in valuta estera scegli quale importo mostrare in grande.")}
              </SettingHint>
              <Segmented
                items={[
                  { id: "paid", label: L("Valuta utilizzata") },
                  { id: "default", label: L("Valuta predefinita") },
                ]}
                value={historyCurrencyPriority}
                onChange={setHistoryCurrencyPriority}
              />
              <div style={{ fontSize: 12, color: subC }}>
                {L("L’altro importo resta visibile in piccolo sotto quello principale.")}
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: textC, marginBottom: 4 }}>
              📋 {L("Movimenti futuri")}
            </div>
            <SettingHint>
              {L(
                "Decidi se nello storico devono comparire anche uscite ed entrate con data futura."
              )}
            </SettingHint>
            <Segmented
              items={[
                { id: "untilToday", label: "Solo fino a oggi" },
                { id: "all", label: "Mostra anche future" },
              ]}
              value={historyFutureMode}
              onChange={setHistoryFutureMode}
            />
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
                fontSize: 14,
                fontWeight: 600,
                color: textC,
                marginBottom: 4,
              }}
            >
              {"🤝 " +
                String(L("Share nello storico")).replace(
                  /^(?:🤝\s*)+/,
                  ""
                )}{" "}
              {!baseSettingsAllowed && (
                <span style={{ fontSize: 11, color: subC }}> 🔒 Base</span>
              )}
            </div>
            <SettingHint>
              Attiva questa opzione per mostrare nello storico anche la tua
              quota delle spese inserite nella sezione Share. La categoria Share
              comparirà nei filtri solo quando questa opzione è attiva.
            </SettingHint>
            <Toggle
              label={L("Mostra transazioni Share nello storico")}
              checked={showShareInHistory}
              onChange={function () {
                setShowShareInHistory(!showShareInHistory);
              }}
              color={confirmButtonColor}
            />
          </div>
        </div>
      </div>
    );

  function backupLocalJson(key, fallback) {
    try {
      var raw = localStorage.getItem(userKey(key));
      return raw ? JSON.parse(raw) : fallback;
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
  async function buildBackupPayload() {
    var sensitiveDataEncryptedV1 = {
      bankCoords: await fainanceEncryptSensitiveData(bankCoords, userId),
      creditCards: await fainanceEncryptSensitiveData(creditCards, userId),
      accountUid: String(userId || ""),
    };
    return {
      backupSchemaVersion: 3,
      accountSyncSchemaVersion: 4,
      accountDeletedRecords,
      expenses,
      incomes,
      cats,
      methods,
      expenseGroups,
      incomeGroups,
      methodGroups,
      customIncomeTypes,
      incomeTypeOverrides,
      catOrder: (catOrder || []).map(String),
      methodOrder: (methodOrder || []).map(String),
      catSortMode,
      methodSortMode,
      defaultExpenseCat,
      defaultExpenseMethod,
      defaultIncomeType,
      defaultExpenseArea,
      defaultIncomeArea,
      defaultMethodArea,
      incomeTypeOrder: (incomeTypeOrder || []).map(String),
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
      mobileAllNavOrder,
      appuntiDocuments,
      appuntiNotes,
      sensitiveDataEncryptedV1,
      aiDataAccess,
      aiExternalConsent,
      aiExternalConsentAt,
      aiConsentTextVersion: AI_CONSENT_TEXT_VERSION,
      shareProjects,
      showShareInHistory,
      debtCredits,
      shoppingCards,
      shoppingItems,
      shoppingDeletedRecords,
      shoppingAreas,
      shoppingAreaIcons,
      shoppingAreaColors,
      shoppingBoughtColor,
      shoppingDefaultArea,
      shoppingUnits,
      shoppingDefaultUnit,
      shoppingLists,
      activeShoppingListId,
      shoppingProductSort,
      showDebtCreditsInPatrimonio,
      showDebtCreditsInExpenses,
      shareReceiptUploads,
      confirmButtonColor,
      secondaryButtonColor,
      initialSetupStatus,
      metaEventsConsent,
    };
  }
  async function prepareBackupImport(raw) {
    var d = raw && typeof raw === "object" ? { ...raw } : {};
    var encrypted = d.sensitiveDataEncryptedV1;
    if (encrypted && typeof encrypted === "object") {
      var owner = String(encrypted.accountUid || "");
      if (owner && owner !== String(userId || ""))
        throw new Error("BACKUP_DIFFERENT_ACCOUNT");
      d.bankCoords = await fainanceDecryptSensitiveData(
        encrypted.bankCoords,
        userId
      );
      d.creditCards = await fainanceDecryptSensitiveData(
        encrypted.creditCards,
        userId
      );
    } else {
      d.bankCoords = Array.isArray(d.bankCoords) ? d.bankCoords : [];
      d.creditCards = Array.isArray(d.creditCards) ? d.creditCards : [];
    }
    return d;
  }
  function countBackupItems(d) {
    d = d || {};
    var parts = [];
    function add(label, n) {
      n = Number(n || 0);
      if (n > 0) parts.push(n + " " + label);
    }
    add("uscite", (d.expenses || []).length);
    add("entrate", (d.incomes || []).length);
    add("ricorrenti", (d.recurring || []).length);
    add("obiettivi", (d.goals || []).length);
    add("alert", (d.alerts || []).length);
    add("voci patrimonio", (d.patrimonioEntries || []).length);
    add("mesi patrimonio", Object.keys(d.patrimonioHistory || {}).length);
    add("documenti", (d.appuntiDocuments || []).length);
    add("appunti", (d.appuntiNotes || []).length);
    add("coordinate", (d.bankCoords || []).length);
    add("carte di credito", (d.creditCards || []).length);
    add("progetti Share", (d.shareProjects || []).length);
    add(L("debiti/crediti"), (d.debtCredits || []).length);
    add(L("carte fidelity"), (d.shoppingCards || []).length);
    add(L("prodotti spesa"), (d.shoppingItems || []).length);
    add(L("aree spesa"), (d.shoppingAreas || []).length);
    add(L("liste spesa"), (d.shoppingLists || []).length);
    return parts.length ? parts.join(" · ") : "0 voci";
  }
  function applyBackupData(d) {
    if (!d || typeof d !== "object") return;
    if (d.accountDeletedRecords && typeof d.accountDeletedRecords === "object")
      setAccountDeletedRecordsRaw(d.accountDeletedRecords);
    if (Array.isArray(d.expenses)) setExpenses(d.expenses);
    if (Array.isArray(d.incomes)) setIncomes(d.incomes);
    if (Array.isArray(d.cats)) setCats(d.cats);
    if (Array.isArray(d.methods)) setMethods(d.methods);
    if (Array.isArray(d.expenseGroups)) setExpenseGroups(d.expenseGroups);
    if (Array.isArray(d.incomeGroups)) setIncomeGroups(d.incomeGroups);
    if (Array.isArray(d.methodGroups)) setMethodGroups(d.methodGroups);
    if (Array.isArray(d.customIncomeTypes))
      setCustomIncomeTypes(d.customIncomeTypes);
    if (d.incomeTypeOverrides && typeof d.incomeTypeOverrides === "object")
      setIncomeTypeOverrides(d.incomeTypeOverrides);
    if (Array.isArray(d.catOrder)) setCatOrder(d.catOrder.map(String));
    if (Array.isArray(d.methodOrder)) setMethodOrder(d.methodOrder.map(String));
    if (d.catSortMode !== undefined)
      setCatSortMode(String(d.catSortMode || "group"));
    if (d.methodSortMode !== undefined)
      setMethodSortMode(String(d.methodSortMode || "group"));
    if (d.defaultExpenseCat !== undefined)
      setDefaultExpenseCat(String(d.defaultExpenseCat || ""));
    if (d.defaultExpenseMethod !== undefined)
      setDefaultExpenseMethod(String(d.defaultExpenseMethod || ""));
    if (d.defaultIncomeType !== undefined)
      setDefaultIncomeType(String(d.defaultIncomeType || ""));
    if (d.defaultExpenseArea !== undefined)
      setDefaultExpenseArea(String(d.defaultExpenseArea || "vita"));
    if (d.defaultIncomeArea !== undefined)
      setDefaultIncomeArea(String(d.defaultIncomeArea || "lavoro"));
    if (d.defaultMethodArea !== undefined)
      setDefaultMethodArea(String(d.defaultMethodArea || "conti_carte"));
    if (Array.isArray(d.incomeTypeOrder))
      setIncomeTypeOrder(d.incomeTypeOrder.map(String));
    if (Array.isArray(d.recurring)) setRecurring(d.recurring);
    if (Array.isArray(d.goals)) setGoals(d.goals);
    if (Array.isArray(d.alerts)) setAlerts(d.alerts);
    if (d.budgetPlan !== undefined) setBudgetPlan(d.budgetPlan);
    if (d.patrimonioValues && typeof d.patrimonioValues === "object")
      setPatrimonioValues(d.patrimonioValues);
    if (Array.isArray(d.patrimonioAreas)) setPatrimonioAreas(d.patrimonioAreas);
    if (Array.isArray(d.patrimonioEntries))
      setPatrimonioEntries(d.patrimonioEntries);
    if (d.patrimonioHistory && typeof d.patrimonioHistory === "object")
      setPatrimonioHistory(d.patrimonioHistory);
    if (d.patrimonioNotes && typeof d.patrimonioNotes === "object")
      setPatrimonioNotes(d.patrimonioNotes);
    if (d.patrimonioMode !== undefined)
      setPatrimonioMode(String(d.patrimonioMode || "manuale"));
    if (d.historyFutureMode) setHistoryFutureMode(d.historyFutureMode);
    if (d.historySortDate) setHistorySortDate(d.historySortDate);
    if (d.historySortDirection) setHistorySortDirection(d.historySortDirection);
    if (d.historySortSecondary) setHistorySortSecondary(d.historySortSecondary);
    if (d.historySortSecondaryDirection)
      setHistorySortSecondaryDirection(d.historySortSecondaryDirection);
    if (d.currency) setCurrency(d.currency);
    if (d.secondaryCurrency !== undefined)
      setSecondaryCurrency(String(d.secondaryCurrency || ""));
    if (d.showSecInHistory !== undefined)
      setShowSecInHistory(!!d.showSecInHistory);
    if (d.showSecInStats !== undefined) setShowSecInStats(!!d.showSecInStats);
    if (d.showSecInBudget !== undefined)
      setShowSecInBudget(!!d.showSecInBudget);
    if (d.showSecInPatrimonio !== undefined)
      setShowSecInPatrimonio(!!d.showSecInPatrimonio);
    if (d.dateFmt) setDateFmt(d.dateFmt);
    if (d.firstDayOfWeek) setFirstDayOfWeek(d.firstDayOfWeek);
    if (d.statsView) setStatsView(d.statsView);
    if (d.btnStyle) setBtnStyle(d.btnStyle);
    if (d.expenseColor) setExpenseColor(d.expenseColor);
    if (d.incomeColor) setIncomeColor(d.incomeColor);
    if (d.homeBalanceView) setHomeBalanceView(d.homeBalanceView);
    if (Array.isArray(d.homeWorklets)) setHomeWorklets(d.homeWorklets);
    if (d.showAppSummaryHeader !== undefined)
      setShowAppSummaryHeader(!!d.showAppSummaryHeader);
    if (Array.isArray(d.mobileNavOrder)) setMobileNavOrder(d.mobileNavOrder);
    if (d.mobileNavIconCount !== undefined)
      setMobileNavIconCount(Number(d.mobileNavIconCount || 5));
    if (Array.isArray(d.mobileMenuOrder)) setMobileMenuOrder(d.mobileMenuOrder);
    if (Array.isArray(d.mobileAllNavOrder))
      setMobileAllNavOrder(d.mobileAllNavOrder);
    if (Array.isArray(d.shareProjects)) setShareProjects(d.shareProjects);
    if (Array.isArray(d.debtCredits)) setDebtCredits(d.debtCredits);
    if (Array.isArray(d.shoppingCards)) setShoppingCards(d.shoppingCards);
    if (Array.isArray(d.shoppingItems)) setShoppingItems(d.shoppingItems);
    if (
      d.shoppingDeletedRecords &&
      typeof d.shoppingDeletedRecords === "object"
    )
      setShoppingDeletedRecordsRaw(d.shoppingDeletedRecords);
    if (Array.isArray(d.shoppingLists)) setShoppingLists(d.shoppingLists);
    if (d.activeShoppingListId !== undefined)
      setActiveShoppingListId(String(d.activeShoppingListId || "main"));
    if (Array.isArray(d.shoppingAreas)) setShoppingAreas(d.shoppingAreas);
    if (d.shoppingAreaIcons && typeof d.shoppingAreaIcons === "object")
      setShoppingAreaIcons(d.shoppingAreaIcons);
    if (d.shoppingAreaColors && typeof d.shoppingAreaColors === "object")
      setShoppingAreaColors(d.shoppingAreaColors);
    if (d.shoppingBoughtColor) setShoppingBoughtColor(d.shoppingBoughtColor);
    if (Array.isArray(d.shoppingUnits) && d.shoppingUnits.length)
      setShoppingUnits(d.shoppingUnits);
    if (d.shoppingDefaultUnit) setShoppingDefaultUnit(d.shoppingDefaultUnit);
    if (d.shoppingProductSort) setShoppingProductSort(d.shoppingProductSort);
    if (Array.isArray(d.shareReceiptUploads))
      setShareReceiptUploads(d.shareReceiptUploads);
    if (d.showDebtCreditsInPatrimonio !== undefined)
      setShowDebtCreditsInPatrimonio(!!d.showDebtCreditsInPatrimonio);
    if (d.showDebtCreditsInExpenses !== undefined)
      setShowDebtCreditsInExpenses(!!d.showDebtCreditsInExpenses);
    if (d.shoppingDefaultArea) setShoppingDefaultArea(d.shoppingDefaultArea);
    if (d.showShareInHistory !== undefined)
      setShowShareInHistory(!!d.showShareInHistory);
    if (d.confirmButtonColor) setConfirmButtonColor(d.confirmButtonColor);
    if (d.secondaryButtonColor) setSecondaryButtonColor(d.secondaryButtonColor);
    if (Array.isArray(d.appuntiDocuments))
      setAppuntiDocuments(d.appuntiDocuments);
    if (Array.isArray(d.appuntiNotes)) setAppuntiNotes(d.appuntiNotes);
    if (Array.isArray(d.bankCoords)) setBankCoords(d.bankCoords);
    if (Array.isArray(d.creditCards)) setCreditCards(d.creditCards);
    if (d.aiDataAccess) setAiDataAccess(d.aiDataAccess);
    if (d.metaEventsConsent !== undefined)
      setMetaEventsConsent(!!d.metaEventsConsent);
    if (d.aiExternalConsent !== undefined)
      setAiExternalConsent(!!d.aiExternalConsent, d.aiExternalConsentAt);
    if (d.initialSetupStatus !== undefined)
      setInitialSetupStatus(String(d.initialSetupStatus || "complete"));
    writeTechnicalLog({
      category: "RESTORE_VERSION",
      operation: "manual-backup-restore",
      metadata: { backupSchemaVersion: Number(d.backupSchemaVersion || 0) },
    }).catch(function () {});
    setToast("Backup ripristinato");
  }
  function readBackupJsonFileWithReader(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (ev) {
        resolve(String((ev && ev.target && ev.target.result) || ""));
      };
      reader.onerror = function () {
        reject(reader.error || new Error("BACKUP_FILE_READ_FAILED"));
      };
      reader.onabort = function () {
        reject(new Error("BACKUP_FILE_READ_ABORTED"));
      };
      reader.readAsText(file);
    });
  }
  function readBackupJsonFile(file) {
    if (file && typeof file.text === "function") {
      return file.text().catch(function () {
        return readBackupJsonFileWithReader(file);
      });
    }
    return readBackupJsonFileWithReader(file);
  }
  function decodeNativeBackupBase64(value) {
    var binary = window.atob(String(value || ""));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (typeof TextDecoder !== "undefined") {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
    var escaped = "";
    for (var j = 0; j < bytes.length; j++) {
      escaped += "%" + bytes[j].toString(16).padStart(2, "0");
    }
    return decodeURIComponent(escaped);
  }
  function isRecognizedBackupJson(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
    return [
      "backupSchemaVersion",
      "expenses",
      "incomes",
      "cats",
      "methods",
      "recurring",
      "shareProjects",
      "shoppingItems",
      "patrimonioValues",
    ].some(function (key) {
      return Object.prototype.hasOwnProperty.call(raw, key);
    });
  }
  function showBackupImportError(err) {
    var different =
      String((err && err.message) || err) === "BACKUP_DIFFERENT_ACCOUNT";
    setToast({
      text: L(
        different
          ? "Questo backup contiene dati sensibili cifrati per un altro account."
          : "File JSON non valido o dati sensibili non decifrabili."
      ),
      type: "error",
      icon: "🚫",
      color: "#E24B4A",
    });
  }
  async function stageBackupJsonText(text) {
    var cleanText = String(text || "").replace(/^\uFEFF/, "").trim();
    if (!cleanText || cleanText.length > 32 * 1024 * 1024)
      throw new Error("BACKUP_FILE_SIZE_INVALID");
    var raw = JSON.parse(cleanText);
    if (!isRecognizedBackupJson(raw)) throw new Error("BACKUP_SCHEMA_INVALID");
    var data = await prepareBackupImport(raw);
    setPendingBackupImport({
      data: data,
      summary: countBackupItems(data),
    });
  }
  async function handleBackupJsonFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var input = e.target;
    setBackupImportBusy(true);
    try {
        // Clearing a file input before the read finishes can revoke Android's
        // temporary document URI. Reset it only after the restore attempt.
        var text = await readBackupJsonFile(f);
        await stageBackupJsonText(text);
      } catch (err) {
        showBackupImportError(err);
      } finally {
        setBackupImportBusy(false);
        try {
          input.value = "";
        } catch (_inputResetError) {}
      }
  }
  async function handleNativeBackupJsonFile() {
    if (backupImportBusy) return;
    setBackupImportBusy(true);
    try {
      var picked = await FainanceFileNativeBackup.pickJson();
      if (!picked || picked.cancelled) return;
      if (!picked.dataBase64) throw new Error("BACKUP_NATIVE_DATA_MISSING");
      await stageBackupJsonText(decodeNativeBackupBase64(picked.dataBase64));
    } catch (err) {
      showBackupImportError(err);
    } finally {
      setBackupImportBusy(false);
    }
  }
  function confirmPendingBackupImport() {
    if (!pendingBackupImport || !pendingBackupImport.data) return;
    var data = pendingBackupImport.data;
    setPendingBackupImport(null);
    applyBackupData(data);
  }
  function dataTitle(label) {
    function stripDataCardIcons(value) {
      var text = String(value == null ? "" : value).trim();
      if (!text) return "";
      text = text.replace(/^(?:(?:📥|📤|🗑️?|💾|📄)\s*)+/g, "");
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
    var translated = String(L(label) || label || "").trim();
    var clean = stripDataCardIcons(translated);
    return (
      clean || stripDataCardIcons(String(label || "")) || String(label || "")
    );
  }
  function DataAccordionCard(props) {
    return (
      <div
        style={{
          background: cardBg,
          borderRadius: 14,
          border: "1px solid " + borderC,
          padding: 20,
        }}
      >
        <button
          type="button"
          onClick={function () {
            props.setOpen(!props.open);
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              minWidth: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{ fontSize: 22, lineHeight: 1.05, flexShrink: 0 }}
            >
              {props.icon || ""}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: props.danger ? "#E24B4A" : textC,
                }}
              >
                {dataTitle(props.title)}
              </div>
              {props.desc && (
                <div style={{ fontSize: 12, color: subC, marginTop: 4 }}>
                  {L(props.desc)}
                </div>
              )}
            </div>
          </div>
          <span
            style={{
              fontSize: 22,
              color: subC,
              transform: props.open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform .18s",
              flexShrink: 0,
            }}
          >
            ⌄
          </span>
        </button>
        {props.open && (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {props.children}
          </div>
        )}
      </div>
    );
  }
  function toggleDataDeleteOption(id) {
    setDataDeleteSelection(function (prev) {
      var arr = Array.isArray(prev) ? prev.slice() : [];
      if (id === "all") {
        return arr.indexOf("all") >= 0 ? [] : ["all"];
      }
      arr = arr.filter(function (x) {
        return x !== "all";
      });
      if (arr.indexOf(id) >= 0)
        return arr.filter(function (x) {
          return x !== id;
        });
      arr.push(id);
      return arr;
    });
  }

  function exportDataOptions() {
    return [
      { id: "backup", label: L("Backup completo (Json)") },
      { id: "expenses_xlsx", label: L("Uscite - Excel") },
      { id: "expenses_csv", label: L("Uscite - CSV") },
      { id: "incomes_xlsx", label: L("Entrate - Excel") },
      { id: "incomes_csv", label: L("Entrate - CSV") },
      { id: "patrimonio_json", label: L("Patrimonio (Json)") },
      { id: "budget_json", label: L("Budget (Json)") },
      { id: "shopping_json", label: L("Spesa (Json)") },
      { id: "debt_credits_json", label: L("Debiti / Crediti (Json)") },
    ];
  }
  function deleteDataOptions() {
    var base = [
      {
        id: "expenses",
        label: L("Uscite"),
        count: (expenses || []).length,
        clear: function () {
          setExpenses([]);
        },
      },
      {
        id: "incomes",
        label: L("Entrate"),
        count: (incomes || []).length,
        clear: function () {
          setIncomes([]);
        },
      },
      {
        id: "recurring",
        label: L("Ricorrenti"),
        count: (recurring || []).length,
        clear: function () {
          setRecurring([]);
        },
      },
      {
        id: "goals",
        label: L("Obiettivi"),
        count: (goals || []).length,
        clear: function () {
          setGoals([]);
        },
      },
      {
        id: "alerts",
        label: L("Alert"),
        count: (alerts || []).length,
        clear: function () {
          setAlerts([]);
        },
      },
      {
        id: "budget",
        label: L("Budget"),
        count: budgetPlan ? 1 : 0,
        clear: function () {
          setBudgetPlan(null);
        },
      },
      {
        id: "patrimonio",
        label: L("Patrimonio"),
        count:
          Object.keys(patrimonioValues || {}).length +
          Object.keys(patrimonioHistory || {}).length,
        clear: function () {
          setPatrimonioValues({});
          setPatrimonioHistory({});
          setPatrimonioNotes({});
        },
      },
      {
        id: "documents",
        label: L("Documenti"),
        count: (appuntiDocuments || []).length,
        clear: function () {
          setAppuntiDocuments([]);
        },
      },
      {
        id: "notes",
        label: L("Appunti"),
        count: (appuntiNotes || []).length,
        clear: function () {
          setAppuntiNotes([]);
        },
      },
      {
        id: "bank",
        label: L("Coordinate bancarie"),
        count: (bankCoords || []).length,
        clear: function () {
          setBankCoords([]);
        },
      },
      {
        id: "creditCards",
        label: L("Carte di credito"),
        count: (creditCards || []).length,
        clear: function () {
          setCreditCards && setCreditCards([]);
        },
      },
      {
        id: "expenseCategories",
        label: L("Aree / Categorie Uscite"),
        count: (expenseGroups || []).length + (cats || []).length,
        clear: function () {
          setCats(DEFAULT_CATS);
          setExpenseGroups(DEFAULT_EXPENSE_GROUPS);
          setCatOrder([]);
          setFilterCats(function (prev) {
            return (prev || []).filter(function (id) {
              return String(id).indexOf("expense:") !== 0;
            });
          });
          setDefaultExpenseCat("");
        },
      },
      {
        id: "incomeCategories",
        label: L("Aree / Categorie Entrate"),
        count: (incomeGroups || []).length + (incomeTypes || []).length,
        clear: function () {
          setIncomeGroups(DEFAULT_INCOME_GROUPS);
          setCustomIncomeTypes && setCustomIncomeTypes([]);
          setIncomeTypeOverrides && setIncomeTypeOverrides({});
        },
      },
      {
        id: "methods",
        label: L("Metodi pagamento"),
        count: (methods || []).length,
        clear: function () {
          setMethods(DEFAULT_METHODS);
          setMethodGroups(DEFAULT_METHOD_GROUPS);
          setMethodOrder([]);
          setFilterMethods([]);
          setDefaultExpenseMethod("");
        },
      },
      {
        id: "patrimonioConfig",
        label: L("Config. patrimonio"),
        count:
          (patrimonioAreas || []).length + (patrimonioEntries || []).length,
        clear: function () {
          setPatrimonioAreas(DEFAULT_PATRIMONIO_AREAS);
          setPatrimonioEntries(DEFAULT_PATRIMONIO_ENTRIES);
        },
      },
      {
        id: "debtCredits",
        label: L("Debiti / Crediti"),
        count: (debtCredits || []).length,
        clear: function () {
          setDebtCredits && setDebtCredits([]);
        },
      },
      {
        id: "shopping",
        label: L("Spesa"),
        count:
          (shoppingCards || []).length +
          (shoppingItems || []).length +
          (shoppingAreas || []).length,
        clear: function () {
          setShoppingCards && setShoppingCards([]);
          setShoppingItems && setShoppingItems([]);
          setShoppingAreas && setShoppingAreas([]);
          setShoppingAreaIcons && setShoppingAreaIcons({});
          setShoppingAreaColors && setShoppingAreaColors({});
          restoreLocalJson("shopping_lists_v2", []);
          restoreLocalJson("shopping_active_list_id_v2", "main");
        },
      },
    ];
    var total = base.reduce(function (sum, o) {
      return sum + Number(o.count || 0);
    }, 0);
    base.push({
      id: "all",
      label: L("Elimina tutto"),
      count: total,
      clear: function () {
        base.forEach(function (o) {
          try {
            o.clear && o.clear();
          } catch (e) {}
        });
      },
    });
    return base;
  }
  function selectedDeleteOptions() {
    var opts = deleteDataOptions();
    var selected = Array.isArray(dataDeleteSelection)
      ? dataDeleteSelection
      : [];
    if (selected.indexOf("all") >= 0)
      return opts.filter(function (o) {
        return o.id === "all";
      });
    return opts.filter(function (o) {
      return selected.indexOf(o.id) >= 0;
    });
  }
  async function runDataExport() {
    var opt = String(dataExportOption || "backup");
    if (opt === "backup") {
      try {
        var data = await buildBackupPayload();
        androidDownload(
          "fainance_backup_" + todayStr() + ".json",
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
          function () {
            setToast(L("Backup esportato"));
          }
        );
      } catch (err) {
        console.error("Backup encryption error", err);
        setToast({
          text: L(
            "Impossibile creare il backup: i dati sensibili non possono essere cifrati."
          ),
          type: "error",
          icon: "🚫",
          color: "#E24B4A",
        });
      }
      return;
    }
    if (opt === "expenses_xlsx") {
      exportToXLSX(
        expenses,
        [],
        cats,
        methods,
        dateFmt,
        function () {
          setToast(L("File Excel uscite esportato"));
        },
        "fainance_uscite.xlsx"
      );
      return;
    }
    if (opt === "expenses_csv") {
      exportToCSV(
        expenses,
        [],
        cats,
        methods,
        dateFmt,
        function () {
          setToast(L("File CSV uscite esportato"));
        },
        "fainance_uscite.csv"
      );
      return;
    }
    if (opt === "incomes_xlsx") {
      exportToXLSX(
        [],
        incomes,
        cats,
        methods,
        dateFmt,
        function () {
          setToast(L("File Excel entrate esportato"));
        },
        "fainance_entrate.xlsx"
      );
      return;
    }
    if (opt === "incomes_csv") {
      exportToCSV(
        [],
        incomes,
        cats,
        methods,
        dateFmt,
        function () {
          setToast(L("File CSV entrate esportato"));
        },
        "fainance_entrate.csv"
      );
      return;
    }
    if (opt === "patrimonio_json") {
      androidDownload(
        "fainance_patrimonio_" + todayStr() + ".json",
        new Blob(
          [
            JSON.stringify(
              {
                patrimonioValues: patrimonioValues || {},
                patrimonioAreas: patrimonioAreas || [],
                patrimonioEntries: patrimonioEntries || [],
                patrimonioHistory: patrimonioHistory || {},
                patrimonioNotes: patrimonioNotes || {},
              },
              null,
              2
            ),
          ],
          { type: "application/json" }
        ),
        function () {
          setToast(L("File JSON Patrimonio esportato"));
        }
      );
      return;
    }
    if (opt === "budget_json") {
      androidDownload(
        "fainance_budget_" + todayStr() + ".json",
        new Blob([JSON.stringify({ budgetPlan: budgetPlan || {} }, null, 2)], {
          type: "application/json",
        }),
        function () {
          setToast(L("File JSON Budget esportato"));
        }
      );
      return;
    }
    if (opt === "shopping_json") {
      androidDownload(
        "fainance_spesa_" + todayStr() + ".json",
        new Blob(
          [
            JSON.stringify(
              {
                backupSchemaVersion: 2,
                shoppingCards: shoppingCards || [],
                shoppingItems: shoppingItems || [],
                shoppingDeletedRecords: shoppingDeletedRecords || {},
                shoppingAreas: shoppingAreas || [],
                shoppingAreaIcons: shoppingAreaIcons || {},
                shoppingAreaColors: shoppingAreaColors || {},
                shoppingBoughtColor,
                shoppingDefaultArea,
                shoppingUnits: shoppingUnits || DEFAULT_SHOPPING_UNITS,
                shoppingDefaultUnit,
                shoppingLists: shoppingLists || [],
                activeShoppingListId,
                shoppingProductSort,
              },
              null,
              2
            ),
          ],
          { type: "application/json" }
        ),
        function () {
          setToast(L("File JSON Spesa esportato"));
        }
      );
      return;
    }
    if (opt === "debt_credits_json") {
      androidDownload(
        "fainance_debiti_crediti_" + todayStr() + ".json",
        new Blob(
          [
            JSON.stringify(
              {
                debtCredits: debtCredits || [],
                showDebtCreditsInPatrimonio,
                showDebtCreditsInExpenses,
              },
              null,
              2
            ),
          ],
          { type: "application/json" }
        ),
        function () {
          setToast(L("File JSON Debiti / Crediti esportato"));
        }
      );
      return;
    }
  }
  function runDataDelete() {
    var opts = selectedDeleteOptions();
    if (!opts.length) {
      setToast({
        text: L("Seleziona cosa eliminare"),
        type: "warning",
        icon: "⚠️",
        color: "#EF9F27",
      });
      return;
    }
    var msg =
      L("Confermi l’eliminazione dei dati selezionati?") +
      "\n" +
      opts
        .map(function (opt) {
          return (
            String(opt.label) + " · " + String(opt.count || 0) + " " + L("voci")
          );
        })
        .join("\n");
    if (!window.confirm(msg)) return;
    opts.forEach(function (opt) {
      try {
        opt.clear && opt.clear();
      } catch (e) {}
    });
    setDataDeleteSelection([]);
    setToast({
      text: L("Cancellazione completata"),
      type: "success",
      icon: "✅",
      color: confirmButtonColor,
    });
  }

  if (settingsPage === "data" || settingsPage === "delete")
    return (
      <div>
        <PageHeader title="Dati" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <DataAccordionCard
            icon="📥"
            title="Importa dati"
            desc="Carica file CSV, Excel o un backup completo JSON."
            open={dataImportOpen}
            setOpen={setDataImportOpen}
          >
            <div
              style={{
                background: dark ? "#1e1e30" : "#f9f9f9",
                border: "1px solid " + borderC,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: textC,
                  marginBottom: 8,
                }}
              >
                {L("Importa movimenti da file")}
              </div>
              <ImportData />
            </div>
            <div
              style={{
                background: dark ? "#1e1e30" : "#f9f9f9",
                border: "1px solid " + borderC,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: textC,
                  marginBottom: 5,
                }}
              >
                {L("Importa backup completo (Json)")}
              </div>
              <div style={{ fontSize: 12, color: subC, marginBottom: 10 }}>
                {L("Ripristina il JSON globale creato da Backup completo.")}
              </div>
              {Capacitor.isNativePlatform() ? (
                <button
                  type="button"
                  disabled={backupImportBusy}
                  onClick={handleNativeBackupJsonFile}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    background: confirmButtonColor,
                    color: "#fff",
                    borderRadius: btnRadius,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: backupImportBusy ? "wait" : "pointer",
                    opacity: backupImportBusy ? 0.68 : 1,
                    minHeight: 42,
                  }}
                >
                  {backupImportBusy
                    ? L("Caricamento...")
                    : dataTitle("Ripristina JSON")}
                </button>
              ) : (
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: confirmButtonColor,
                    color: "#fff",
                    borderRadius: btnRadius,
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: backupImportBusy ? "wait" : "pointer",
                    opacity: backupImportBusy ? 0.68 : 1,
                    minHeight: 42,
                  }}
                >
                  {backupImportBusy
                    ? L("Caricamento...")
                    : dataTitle("Ripristina JSON")}
                  <input
                    type="file"
                    accept=".json,application/json,text/json"
                    disabled={backupImportBusy}
                    style={{ display: "none" }}
                    onChange={handleBackupJsonFile}
                  />
                </label>
              )}
            </div>
            {pendingBackupImport && (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={L("Ripristina JSON")}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 12000,
                  background: "rgba(16,20,34,.58)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                }}
                onClick={function () {
                  setPendingBackupImport(null);
                }}
              >
                <div
                  onClick={function (event) {
                    event.stopPropagation();
                  }}
                  style={{
                    width: "min(440px, 100%)",
                    background: cardBg,
                    color: textC,
                    border: "1px solid " + borderC,
                    borderRadius: 20,
                    padding: 22,
                    boxShadow: "0 22px 70px rgba(0,0,0,.28)",
                  }}
                >
                  <div style={{ fontSize: 20, fontWeight: 950, marginBottom: 12 }}>
                    {L("Ripristina JSON")}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: subC }}>
                    {L(
                      "Stai per ripristinare questo backup.\nVoci che verranno importate: "
                    )}
                    <strong style={{ color: textC }}>
                      {pendingBackupImport.summary}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginTop: 20,
                    }}
                  >
                    <button
                      type="button"
                      onClick={function () {
                        setPendingBackupImport(null);
                      }}
                      style={{
                        border: "1px solid " + secondaryButtonColor,
                        background: "transparent",
                        color: secondaryButtonColor,
                        minHeight: 44,
                        borderRadius: btnRadius,
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {L("Annulla")}
                    </button>
                    <button
                      type="button"
                      onClick={confirmPendingBackupImport}
                      style={{
                        border: "none",
                        minHeight: 44,
                        borderRadius: btnRadius,
                        background: confirmButtonColor,
                        color: "#fff",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {L("Ripristina JSON")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </DataAccordionCard>
          <DataAccordionCard
            icon="📤"
            title="Esporta dati"
            desc="Scegli cosa scaricare e poi conferma l’esportazione."
            open={dataExportOpen}
            setOpen={function (v) {
              setDataExportOpen(v);
              if (!v) setDataExportMenuOpen(false);
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
                gap: 10,
                alignItems: "end",
              }}
            >
              <div style={{ position: "relative", minWidth: 0 }}>
                <button
                  type="button"
                  onClick={function () {
                    setDataExportMenuOpen(function (v) {
                      return !v;
                    });
                  }}
                  style={{
                    ...sinp,
                    width: "100%",
                    minHeight: 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {
                      (
                        exportDataOptions().find(function (o) {
                          return o.id === dataExportOption;
                        }) || exportDataOptions()[0]
                      ).label
                    }
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 18,
                      transform: dataExportMenuOpen ? "rotate(180deg)" : "none",
                      transition: "transform .15s",
                      flexShrink: 0,
                    }}
                  >
                    ⌄
                  </span>
                </button>
                {dataExportMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "calc(100% + 6px)",
                      zIndex: 40,
                      maxHeight: 280,
                      overflowY: "auto",
                      background: dark ? "#29293D" : "#fff",
                      border: "1px solid " + borderC,
                      borderRadius: 12,
                      boxShadow: "0 14px 35px rgba(0,0,0,.22)",
                      padding: 6,
                    }}
                  >
                    {exportDataOptions().map(function (o) {
                      var selected = o.id === dataExportOption;
                      return (
                        <button
                          type="button"
                          key={o.id}
                          onClick={function () {
                            setDataExportOption(o.id);
                            setDataExportMenuOpen(false);
                          }}
                          style={{
                            width: "100%",
                            border: "none",
                            borderRadius: 9,
                            padding: "10px 11px",
                            background: selected
                              ? dark
                                ? "#383354"
                                : "#EEEDFE"
                              : "transparent",
                            color: selected
                              ? dark
                                ? "#DCD7FF"
                                : "#534AB7"
                              : textC,
                            textAlign: "left",
                            fontSize: 13,
                            fontWeight: selected ? 850 : 650,
                            cursor: "pointer",
                          }}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Btn
                onClick={runDataExport}
                bg={confirmButtonColor}
                style={{
                  padding: "11px 18px",
                  fontSize: 14,
                  fontWeight: 900,
                  minHeight: 42,
                }}
              >
                {L("Esporta")}
              </Btn>
            </div>
          </DataAccordionCard>
          <DataAccordionCard
            icon="🗑️"
            title="Elimina dati"
            desc="Seleziona una o più sezioni da eliminare. L’operazione non è reversibile."
            open={dataDeleteOpen}
            setOpen={setDataDeleteOpen}
            danger={true}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: 10,
              }}
            >
              {deleteDataOptions().map(function (o) {
                var checked =
                  (Array.isArray(dataDeleteSelection)
                    ? dataDeleteSelection
                    : []
                  ).indexOf(o.id) >= 0;
                var isAll = o.id === "all";
                return (
                  <label
                    key={o.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border:
                        "1px solid " +
                        (checked
                          ? isAll
                            ? "#E24B4A"
                            : confirmButtonColor
                          : borderC),
                      background: checked
                        ? isAll
                          ? dark
                            ? "#381c1c"
                            : "#FFF0F0"
                          : dark
                          ? "#24213a"
                          : "#F0EDFF"
                        : dark
                        ? "#1e1e30"
                        : "#f9f9f9",
                      cursor: "pointer",
                      minHeight: 48,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={function () {
                        toggleDataDeleteOption(o.id);
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        accentColor: isAll ? "#E24B4A" : confirmButtonColor,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 900,
                          color: isAll ? "#E24B4A" : textC,
                        }}
                      >
                        {o.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: subC,
                          marginTop: 2,
                        }}
                      >
                        {String(o.count || 0)} {L("voci")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Btn
              onClick={runDataDelete}
              bg="#E24B4A"
              style={{
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 900,
                minHeight: 44,
                width: isMobile ? "100%" : "fit-content",
              }}
            >
              {L("Elimina")}
            </Btn>
          </DataAccordionCard>
        </div>
      </div>
    );

  function PlansSettingsPage() {
    function openPlansDetails() {
      var code = String(lang || "it")
        .split("-")[0]
        .toLowerCase();
      var url =
        code === "it"
          ? "https://fainanceapp.it/it/piani/"
          : "https://fainanceapp.it/plans/";
      try {
        if (window && window.open) {
          window.open(url, "_blank");
          return;
        }
      } catch (e) {}
      try {
        window.location.href = url;
      } catch (e2) {
        setToast(L("Link supporto non disponibile"));
      }
    }
    return (
      <div>
        <PageHeader title="Piani" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background: dark
                ? "linear-gradient(135deg,#2B214A 0%,#173A59 48%,#153A2B 100%)"
                : "linear-gradient(135deg,#F6E8FF 0%,#E7F2FF 45%,#E7FFF3 100%)",
              borderRadius: 24,
              border: "1px solid " + (dark ? "#5A4B82" : "#DCD6FF"),
              padding: 20,
              boxShadow: dark ? "none" : "0 18px 42px rgba(83,74,183,0.16)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -44,
                top: -44,
                width: 150,
                height: 150,
                borderRadius: "50%",
                background: "rgba(127,119,221,.22)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -50,
                bottom: -60,
                width: 170,
                height: 170,
                borderRadius: "50%",
                background: "rgba(29,158,117,.18)",
              }}
            />
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  background:
                    "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  boxShadow: "0 12px 24px rgba(83,74,183,.24)",
                }}
              >
                💎
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 950,
                    color: textC,
                    marginBottom: 5,
                  }}
                >
                  {L("Piano attuale")}
                </div>
                <div style={{ fontSize: 12, color: subC, lineHeight: 1.45 }}>
                  {L(
                    "Gestisci il tuo piano e il tipo di rinnovo in modo semplice e immediato."
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                position: "relative",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  background: dark
                    ? "rgba(255,255,255,0.09)"
                    : "rgba(255,255,255,0.88)",
                  border:
                    "1px solid " + (dark ? "rgba(255,255,255,.14)" : "#E7E2FF"),
                  borderRadius: 18,
                  padding: "13px 14px",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: subC,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 5,
                  }}
                >
                  {L("Piano")}
                </div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 950,
                    color: confirmButtonColor,
                  }}
                >
                  {planLabel(currentPlan, lang)}
                </div>
              </div>
              <div
                style={{
                  background: dark
                    ? "rgba(255,255,255,0.09)"
                    : "rgba(255,255,255,0.88)",
                  border:
                    "1px solid " + (dark ? "rgba(255,255,255,.14)" : "#E7E2FF"),
                  borderRadius: 18,
                  padding: "13px 14px",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: subC,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 5,
                  }}
                >
                  {L("Rinnovo")}
                </div>
                <div
                  style={{ fontSize: 19, fontWeight: 950, color: "#EF9F27" }}
                >
                  {L(planBillingPeriod === "yearly" ? "Annuale" : "Mensile")}
                </div>
              </div>
            </div>
            <div
              style={{
                position: "relative",
                display: "flex",
                gap: 6,
                background: dark
                  ? "rgba(255,255,255,.08)"
                  : "rgba(255,255,255,0.9)",
                borderRadius: 14,
                padding: 4,
                marginBottom: 12,
                width: "fit-content",
                border:
                  "1px solid " + (dark ? "rgba(255,255,255,.12)" : "#ECE9F6"),
              }}
            >
              {[
                { id: "monthly", label: "Mensile" },
                { id: "yearly", label: "Annuale" },
              ].map(function (item) {
                var selected = planBillingPeriod === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={function () {
                      setPlanBillingPeriod(item.id);
                    }}
                    style={{
                      border: "none",
                      borderRadius: 12,
                      padding: "8px 14px",
                      background: selected
                        ? secondaryButtonColor || "#7F77DD"
                        : "transparent",
                      color: selected ? "#fff" : textC,
                      fontSize: 13,
                      fontWeight: 900,
                      cursor: "pointer",
                      boxShadow: selected
                        ? dark
                          ? "none"
                          : "0 4px 12px rgba(127,119,221,.22)"
                        : "none",
                    }}
                  >
                    {L(item.label)}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 8,
                scrollSnapType: "x mandatory",
              }}
            >
              {PLAN_IDS.map(function (pid) {
                var active = currentPlan === pid;
                var lim = PLAN_LIMITS[pid] || PLAN_LIMITS.free;
                var price = PLAN_PRICES[pid] || PLAN_PRICES.free;
                var day = L("giorno"),
                  month = L("mese"),
                  ad = L("annuncio"),
                  extra = L("extra"),
                  withAd = L("con annuncio");
                function limTxt(v) {
                  return v === Infinity ? L("illimitati") : String(v);
                }
                function limFem(v) {
                  return v === Infinity ? L("illimitate") : String(v);
                }
                function perDay(v) {
                  return v + "/" + day;
                }
                function perMonth(v) {
                  return v + "/" + month;
                }
                function plusAd(n) {
                  return n ? " + " + n + " " + withAd : "";
                }
                function copyPatrimonioLabel() {
                  return lim.patrimonioCopyMonthly === Infinity
                    ? L("illimitate")
                    : String(lim.patrimonioCopyMonthly) +
                        " " +
                        L("al mese") +
                        plusAd(lim.rewardedExtraPatrimonioCopy);
                }
                var details = [
                  [
                    "Entrate e Uscite semplici",
                    limFem(lim.dailySingleMovements) +
                      plusAd(lim.rewardedExtraMovements) +
                      "/" +
                      day,
                  ],
                  [
                    "Entrate e Uscite Multiple",
                    pid === "premium"
                      ? L("illimitate")
                      : (pid === "base" ? "2" : "1") +
                        " " +
                        L("al mese") +
                        " (" +
                        L("massimo") +
                        " " +
                        (pid === "base" ? "15" : "10") +
                        " " +
                        L("spese alla volta") +
                        ")",
                  ],
                  [
                    "Entrate e Uscite Ricorrenti",
                    lim.recurringMovements === Infinity
                      ? L("illimitate")
                      : String(lim.recurringMovements),
                  ],
                  [
                    "Entrate e Uscite Rateizzate",
                    pid === "premium"
                      ? L("Scegli il numero")
                      : pid === "free"
                      ? L("2 opzioni")
                      : L("4 opzioni"),
                  ],
                  [
                    "Scontrini",
                    limTxt(lim.dailyReceiptScans) +
                      plusAd(lim.rewardedExtraReceiptScans) +
                      "/" +
                      day,
                  ],
                  [
                    "Voce",
                    limTxt(lim.dailyVoiceEntries) +
                      plusAd(lim.rewardedExtraVoiceEntries) +
                      "/" +
                      day,
                  ],
                  [
                    "Assistente vocale",
                    pid === "free" ? L("dal piano Base") : L("incluso"),
                  ],
                  ["Share Progetti", limTxt(lim.shareProjects)],
                  [
                    "Share Spese",
                    limTxt(lim.shareDailyExpenses) +
                      plusAd(lim.rewardedExtraShareDailyExpenses) +
                      "/" +
                      day,
                  ],
                  [
                    "Share Scontrini",
                    limTxt(lim.shareReceiptScans) + "/" + day,
                  ],
                  [
                    "Debiti / Crediti",
                    lim.debtCredits === 0
                      ? L("dal piano Base")
                      : limTxt(lim.debtCredits),
                  ],
                  ["Carte Spesa", limTxt(lim.shoppingCards)],
                  ["Lista della spesa", limTxt(lim.shoppingListItems)],
                  ["Budget", L("completo")],
                  ["Patrimonio copia", copyPatrimonioLabel()],
                  ["Obiettivi", limTxt(lim.goals)],
                  ["Appunti", limTxt(lim.notes)],
                  ["Coordinate bancarie", limTxt(lim.bankNotes)],
                  ["Carte di credito", limTxt(lim.bankNotes)],
                  [
                    "Documenti",
                    lim.documents === 0
                      ? L("no")
                      : lim.documents === Infinity
                      ? L("illimitati")
                      : String(lim.documents),
                  ],
                  ["Alert", limTxt(lim.alerts)],
                  ["AI Consigli", limTxt(lim.aiMonthlyTips)],
                  [
                    "AI Risposte",
                    pid === "premium"
                      ? L("illimitate")
                      : limTxt(lim.aiDailyReplies) +
                        plusAd(lim.rewardedExtraAiReplies) +
                        "/" +
                        day,
                  ],
                  ["Statistiche", L(lim.statsLevel)],
                  ["Impostazioni", L(lim.settingsLevel)],
                  [
                    "Personalizzazione Home",
                    pid === "premium" ? L("inclusa") : L("solo piano Completo"),
                  ],
                  ["Widget", limTxt(lim.widgets)],
                  ["Annunci", lim.ads ? L("sì") : L("no")],
                ];
                return (
                  <div
                    key={pid}
                    style={{
                      minWidth: isMobile ? 280 : 320,
                      scrollSnapAlign: "start",
                      background: active
                        ? dark
                          ? "#1a2a1e"
                          : "#edfaf3"
                        : dark
                        ? "#252535"
                        : "#fff",
                      border: "2px solid " + (active ? "#1D9E75" : borderC),
                      borderRadius: 18,
                      padding: "16px 16px",
                      boxShadow: active
                        ? dark
                          ? "none"
                          : "0 8px 24px rgba(29,158,117,0.18)"
                        : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: active ? "#1D9E75" : textC,
                          }}
                        >
                          {planLabel(pid, lang)}
                        </div>
                        <div
                          style={{ fontSize: 12, color: subC, marginTop: 3 }}
                        >
                          {price.monthly === 0
                            ? "0 €"
                            : price.monthly + " €/" + L("mese")}{" "}
                          ·{" "}
                          {price.yearly === 0
                            ? "0 €"
                            : price.yearly + " €/" + L("anno")}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: pid === "free" ? subC : "#7F77DD",
                            fontWeight: 800,
                            marginTop: 5,
                          }}
                        >
                          {pid === "free"
                            ? L("Gratis sempre disponibile")
                            : L("Pagamento") +
                              ": " +
                              (planBillingPeriod === "yearly"
                                ? price.yearly + " €/" + L("anno")
                                : price.monthly + " €/" + L("mese"))}
                        </div>
                      </div>
                      {active && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 900,
                            color: "#1D9E75",
                            background: "#1D9E7522",
                            borderRadius: 12,
                            padding: "3px 8px",
                          }}
                        >
                          {L("ATTIVO")}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        maxHeight: 310,
                        overflowY: "auto",
                        paddingRight: 3,
                      }}
                    >
                      {details.map(function (row) {
                        return (
                          <div
                            key={row[0]}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              borderBottom:
                                "1px solid " + (dark ? "#333" : "#f0f0f0"),
                              padding: "5px 0",
                            }}
                          >
                            <span style={{ fontSize: 12, color: subC }}>
                              {L(row[0])}
                            </span>
                            <span
                              style={{
                                fontSize: 12,
                                color: textC,
                                fontWeight: 800,
                                textAlign: "right",
                              }}
                            >
                              {L(row[1])}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={function () {
                        if (active) return;
                        purchasePlan(pid);
                      }}
                      disabled={active || !!planPurchaseLoading}
                      style={{
                        width: "100%",
                        marginTop: 12,
                        background: active ? "#1D9E75" : "#7F77DD",
                        color: "#fff",
                        border: "none",
                        borderRadius: btnRadius,
                        padding: "11px",
                        fontSize: 13,
                        fontWeight: 900,
                        cursor:
                          active || !!planPurchaseLoading
                            ? "not-allowed"
                            : "pointer",
                        opacity: active || !!planPurchaseLoading ? 0.8 : 1,
                      }}
                    >
                      {L(
                        active
                          ? "Piano selezionato"
                          : planPurchaseLoading ===
                            pid +
                              ":" +
                              (planBillingPeriod === "yearly"
                                ? "yearly"
                                : "monthly")
                          ? "Acquisto in corso..."
                          : pid === "free"
                          ? "Passa a Gratis"
                          : "Acquista piano"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                fontSize: 11,
                color: subC,
                marginTop: 10,
                lineHeight: 1.45,
              }}
            >
              {L("Gli acquisti Base e Completo vengono gestiti tramite")}{" "}
              {platformStoreBillingName()}.{" "}
              {L(
                "Se l'acquisto viene annullato o non va a buon fine, il piano resta invariato."
              )}
            </div>
            <button
              onClick={restorePurchases}
              disabled={!!planPurchaseLoading}
              style={{
                marginTop: 10,
                background: dark ? "#252535" : "#F3F4FF",
                color: dark ? "#D6D1FF" : "#5A52B8",
                border: "1px solid " + (dark ? "#3d376a" : "#D8D2FF"),
                borderRadius: btnRadius,
                padding: "9px 12px",
                fontSize: 12,
                fontWeight: 900,
                cursor: planPurchaseLoading ? "not-allowed" : "pointer",
                opacity: planPurchaseLoading ? 0.7 : 1,
              }}
            >
              {L(
                planPurchaseLoading === "restore"
                  ? "Ripristino in corso..."
                  : "Ripristina acquisti"
              )}
            </button>
          </div>
          {isNativeIOSApp() ? (
            <div
              style={{
                background: cardBg,
                borderRadius: 14,
                border: "1px solid " + borderC,
                padding: 16,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: textC }}>
                  {L("Acquisti gestiti da App Store")}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: subC,
                    marginTop: 2,
                    lineHeight: 1.45,
                  }}
                >
                  {L(
                    "Su iOS, piani e abbonamenti sono disponibili solo tramite acquisto in-app su App Store. I dettagli principali sono mostrati direttamente in questa schermata."
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: cardBg,
                borderRadius: 14,
                border: "1px solid " + borderC,
                padding: 16,
              }}
            >
              <button
                onClick={openPlansDetails}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 24 }}>🌐</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: textC }}>
                    {L("Scopri il dettaglio dei piani")}
                  </div>
                  <div style={{ fontSize: 12, color: subC, marginTop: 2 }}>
                    {L("Apri dettaglio piani sul sito")}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: subC }}>›</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (settingsPage === "plans_settings")
    return (
      <StableNestedPanelHost
        key="settings-plans"
        render={function () {
          return PlansSettingsPage();
        }}
      />
    );

  function SupportSettingsPage() {
    function openExternal(url) {
      try {
        if (window && window.open) {
          window.open(url, "_blank");
          return;
        }
      } catch (e) {}
      try {
        window.location.href = url;
      } catch (e2) {
        setToast(L("Link supporto non disponibile"));
      }
    }
    function openContactForm(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      // Non usare un toggle: più tocchi ravvicinati non devono richiudere il form.
      setSupportContactFormOpen(true);
    }
    return (
      <div>
        <PageHeader title="Supporto" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              overflow: "hidden",
            }}
          >
            {(isNativeIOSApp()
              ? [
                  {
                    icon: "✉️",
                    label: "Contattaci",
                    desc: "Apri il form di contatto interno",
                    action: openContactForm,
                    badge: "Form",
                  },
                ]
              : [
                  {
                    icon: "🌐",
                    label: "FAQ sul sito web",
                    desc: "Apri le FAQ ufficiali su fainanceapp.it",
                    action: function () {
                      openExternal("https://fainanceapp.it/it/faq-ita/");
                    },
                    badge: "Apri",
                  },
                  {
                    icon: "🌐",
                    label: "Sito web ufficiale",
                    desc: "fainanceapp.it",
                    action: function () {
                      openExternal("https://fainanceapp.it/");
                    },
                    badge: "Apri",
                  },
                  {
                    icon: "✉️",
                    label: "Contattaci",
                    desc: "Apri il form di contatto interno",
                    action: openContactForm,
                    badge: "Form",
                  },
                ]
            ).map(function (item, i, arr) {
              return (
                <button
                  type="button"
                  key={i}
                  onClick={function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    item.action(e);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 20px",
                    border: "none",
                    borderBottom:
                      i < arr.length - 1 ? "1px solid " + borderC : "none",
                    background: cardBg,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{ fontSize: 24, width: 36, textAlign: "center" }}
                  >
                    {item.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 600, color: textC }}
                    >
                      {L(item.label)}
                    </div>
                    <div style={{ fontSize: 12, color: subC, marginTop: 1 }}>
                      {L(item.desc)}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      background: "#e8f4ff",
                      color: "#1a5fa8",
                      borderRadius: 20,
                      padding: "3px 10px",
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {L(item.badge)}
                  </span>
                </button>
              );
            })}
          </div>
          {supportContactFormOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  title={L("Annulla")}
                  aria-label={L("Annulla")}
                  onClick={function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    setSupportContactFormOpen(false);
                  }}
                  style={{
                    border: "1px solid " + borderC,
                    background: cardBg,
                    color: subC,
                    borderRadius: 10,
                    width: 36,
                    height: 34,
                    fontSize: 18,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
              <ContactForm currentUser={currentUser} />
            </div>
          )}
          <div
            style={{
              background: dark ? "#252535" : "#f5f5f5",
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: subC }}>
              fAInance v
              {String(installedAppInfo.version || FAINANCE_CURRENT_VERSION)}
            </span>
            <span
              style={{
                fontSize: 11,
                background: "#f0f0f0",
                color: "#888",
                borderRadius: 20,
                padding: "2px 10px",
              }}
            >
              {planLabel(currentPlan, lang)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (settingsPage === "support")
    return (
      <StableNestedPanelHost
        key="settings-support"
        render={function () {
          return SupportSettingsPage();
        }}
      />
    );

  if (settingsPage === "terms_conditions")
    return (
      <div>
        <PageHeader title="Info app / Termini di utilizzo" />
        <TermsAndConditionsContent />
      </div>
    );
  if (settingsPage === "privacy_policy")
    return (
      <div>
        <PageHeader title="Info app / Informativa Privacy" />
        <PrivacyPolicyContent />
      </div>
    );

  function InfoSettingsPage() {
    function openInfoExternal(url) {
      try {
        if (window && window.open) {
          window.open(url, "_blank");
          return;
        }
      } catch (e) {}
      try {
        window.location.href = url;
      } catch (e2) {
        setToast({
          text: L("Impossibile aprire il collegamento."),
          type: "error",
          icon: "🚫",
          color: "#E24B4A",
        });
      }
    }
    var APP_VERSION = String(
      installedAppInfo.version || FAINANCE_CURRENT_VERSION
    );
    var APP_VERSION_CODE =
      Number(installedAppInfo.code || FAINANCE_CURRENT_VERSION_CODE) ||
      FAINANCE_CURRENT_VERSION_CODE;
    var APP_PLATFORM = String(
      installedAppInfo.platform || appUpdatePlatform() || "web"
    );
    var APP_PLATFORM_LABEL =
      APP_PLATFORM === "android"
        ? "Android"
        : APP_PLATFORM === "ios"
        ? "iOS"
        : "Web";
    var updateStatus = appUpdateManualStatus;
    var setUpdateStatus = setAppUpdateManualStatus;
    async function checkForUpdates() {
      if (updateStatus === "checking") return;
      setUpdateStatus("checking");
      try {
        var available = await checkAppUpdatePopup({ ignoreDismissed: true });
        if (available) {
          setUpdateStatus("available");
          return;
        }
        var current = await appUpdateCurrentInfo();
        setInstalledAppInfo(current);
        var store = await appUpdatePreferredStore(current);
        setUpdateStatus("store");
        if (!openFainanceStoreUrl(store.url, store.platform, store.webUrl))
          throw new Error("Store non disponibile");
      } catch (e) {
        setUpdateStatus("error");
        setToast({
          text: "Impossibile aprire lo store. Riprova tra poco.",
          type: "error",
          icon: "🚫",
          color: "#E24B4A",
        });
      }
    }
    async function openStoreRating() {
      try {
        var current = await appUpdateCurrentInfo();
        var store = await appUpdatePreferredStore(current);
        var ratingUrl = store.url;
        var ratingWebUrl = store.webUrl;
        if (store.platform === "android") {
          ratingUrl = FAINANCE_PLAY_STORE_MARKET_URL + "&showAllReviews=true";
          ratingWebUrl = FAINANCE_PLAY_STORE_WEB_URL + "&showAllReviews=true";
        } else if (store.platform === "ios") {
          var appleId =
            appUpdateAppleId(store.url) || appUpdateAppleId(store.webUrl);
          if (appleId) {
            ratingUrl =
              "itms-apps://itunes.apple.com/app/id" +
              appleId +
              "?action=write-review";
            ratingWebUrl =
              "https://apps.apple.com/app/id" +
              appleId +
              "?action=write-review";
          }
        }
        if (!openFainanceStoreUrl(ratingUrl, store.platform, ratingWebUrl))
          throw new Error("Store non disponibile");
      } catch (e) {
        setToast({
          text: "Impossibile aprire la pagina delle recensioni.",
          type: "error",
          icon: "🚫",
          color: "#E24B4A",
        });
      }
    }
    return (
      <div>
        <PageHeader title="Info" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* App identity */}
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                background: dark ? "#fff" : "transparent",
                borderRadius: dark ? 14 : 0,
                padding: dark ? 14 : 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
                boxShadow: dark ? "0 8px 28px rgba(0,0,0,0.25)" : "none",
              }}
            >
              <img
                src={appBanner}
                alt="fAInance"
                style={{
                  width: "100%",
                  maxWidth: 300,
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
            <div style={{ fontSize: 13, color: subC, marginBottom: 2 }}>
              Versione {APP_VERSION}
            </div>
            <div
              style={{
                fontSize: 11,
                color: subC,
                marginTop: 4,
                fontStyle: "italic",
              }}
            >
              {L("Your AI-powered finance tracker")}
            </div>
          </div>

          {/* Termini e Privacy */}
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 16,
            }}
          >
            <button
              onClick={function () {
                setSettingsPage("terms_conditions");
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 24 }}>📄</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: textC }}>
                  Termini di utilizzo
                </div>
                <div style={{ fontSize: 12, color: subC }}>
                  Consulta ambito dell’app, limiti dell’Agente AI e
                  responsabilità utente.
                </div>
              </div>
              <span style={{ fontSize: 18, color: subC }}>›</span>
            </button>
            <div style={{ height: 1, background: borderC, marginBottom: 14 }} />
            <button
              onClick={function () {
                setSettingsPage("privacy_policy");
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 24 }}>🔐</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: textC }}>
                  Informativa Privacy
                </div>
                <div style={{ fontSize: 12, color: subC }}>
                  Consulta dati salvati, sincronizzazione, Firebase e uso
                  dell’Agente AI.
                </div>
              </div>
              <span style={{ fontSize: 18, color: subC }}>›</span>
            </button>
          </div>

          {/* Aggiornamenti OTA */}
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
                fontSize: 14,
                fontWeight: 600,
                color: textC,
                marginBottom: 4,
              }}
            >
              {"🔄 " + translateUiRuntimeText("Aggiornamenti")}
            </div>
            <div style={{ fontSize: 12, color: subC, marginBottom: 14 }}>
              Versione installata: <strong>{APP_VERSION}</strong>
            </div>
            {updateStatus === "checking" && (
              <div
                style={{
                  background: dark ? "#252535" : "#f5f5f5",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 12,
                  border: "1px solid " + borderC,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>⏳</span>
                <span style={{ fontSize: 13, color: subC, fontWeight: 500 }}>
                  {L("Controllo aggiornamenti in corso...")}
                </span>
              </div>
            )}
            {updateStatus === "store" && (
              <div
                style={{
                  background: dark ? "#1a2a1e" : "#edfaf3",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 12,
                  border: "1px solid #1D9E75",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>✅</span>
                <span
                  style={{ fontSize: 13, color: "#1D9E75", fontWeight: 500 }}
                >
                  {L("È stato aperto lo store corretto per il dispositivo.")}
                </span>
              </div>
            )}
            {updateStatus === "available" && (
              <div
                style={{
                  background: dark ? "#252044" : "#F0EEFF",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 12,
                  border: "1px solid #7F77DD",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>🚀</span>
                <span
                  style={{
                    fontSize: 13,
                    color: dark ? "#C9C4FF" : "#534AB7",
                    fontWeight: 600,
                  }}
                >
                  {L(
                    "Aggiornamento disponibile: usa il popup per aprire lo store."
                  )}
                </span>
              </div>
            )}
            {updateStatus === "error" && (
              <div
                style={{
                  background: dark ? "#321d23" : "#fff0f0",
                  borderRadius: 10,
                  padding: "12px 16px",
                  marginBottom: 12,
                  border: "1px solid #E24B4A",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 20 }}>🚫</span>
                <span
                  style={{ fontSize: 13, color: "#E24B4A", fontWeight: 500 }}
                >
                  {L("Impossibile controllare gli aggiornamenti.")}
                </span>
              </div>
            )}
            <button
              onClick={checkForUpdates}
              disabled={updateStatus === "checking"}
              style={{
                width: "100%",
                background: dark ? "#252535" : "#f5f5f5",
                color: textC,
                border: "1px solid " + borderC,
                borderRadius: btnRadius,
                padding: "11px",
                fontSize: 14,
                cursor: updateStatus === "checking" ? "not-allowed" : "pointer",
                fontWeight: 500,
                opacity: updateStatus === "checking" ? 0.6 : 1,
              }}
            >
              {updateStatus === "checking"
                ? L("Controllo in corso...")
                : L("Controlla aggiornamenti")}
            </button>
          </div>

          {/* Piano spostato in Info, Piani & Supporto / Piani */}

          {/* Social */}
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: subC,
                marginBottom: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              {L("Seguici sui social")}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={function () {
                  openInfoExternal(
                    "https://www.facebook.com/profile.php?id=61592298219650"
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 13px",
                  border: "1px solid " + borderC,
                  borderRadius: 12,
                  background: dark ? "#252535" : "#F6F8FF",
                  color: textC,
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#1877F2",
                    color: "#fff",
                    fontSize: 20,
                    fontWeight: 950,
                    flexShrink: 0,
                  }}
                >
                  f
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{ display: "block", fontSize: 13, fontWeight: 900 }}
                  >
                    Facebook
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
                    {L("Pagina ufficiale")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={function () {
                  openInfoExternal("https://www.instagram.com/fainanceapp");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 13px",
                  border: "1px solid " + borderC,
                  borderRadius: 12,
                  background: dark ? "#252535" : "#FFF6FB",
                  color: textC,
                  cursor: "pointer",
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "linear-gradient(135deg,#833AB4,#FD1D1D,#FCAF45)",
                    color: "#fff",
                    fontSize: 17,
                    fontWeight: 950,
                    flexShrink: 0,
                  }}
                >
                  ◎
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{ display: "block", fontSize: 13, fontWeight: 900 }}
                  >
                    Instagram
                  </span>
                  <span
                    data-no-translate="true"
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
                    @fainanceapp
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Rating */}
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 16,
            }}
          >
            <button
              onClick={openStoreRating}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span style={{ fontSize: 24 }}>⭐</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: textC }}>
                  Vota sullo store
                </div>
                <div style={{ fontSize: 12, color: subC }}>
                  Se ti piace l'app, lasciaci una recensione!
                </div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 16, color: subC }}>
                ›
              </span>
            </button>
          </div>

          {/* Build info */}
          <div
            style={{
              background: cardBg,
              borderRadius: 14,
              border: "1px solid " + borderC,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: subC,
                marginBottom: 8,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Informazioni tecniche
            </div>
            {[
              ["Versione", APP_VERSION],
              ["Build", String(APP_VERSION_CODE)],
              ["Piattaforma", APP_PLATFORM_LABEL],
              ["Storage", "localStorage"],
            ].map(function (row) {
              return (
                <div
                  key={row[0]}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: "1px solid " + borderC,
                  }}
                >
                  <span style={{ fontSize: 13, color: subC }}>{L(row[0])}</span>
                  <span
                    data-no-translate="true"
                    style={{ fontSize: 13, color: textC, fontWeight: 500 }}
                  >
                    {row[1]}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              fontSize: 11,
              color: subC,
              textAlign: "center",
              padding: "8px 0",
            }}
          >
            © 2026 fAInance · Tutti i diritti riservati
          </div>
        </div>
      </div>
    );
  }

  if (settingsPage === "info")
    return (
      <StableNestedPanelHost
        key="settings-info"
        render={function () {
          return InfoSettingsPage();
        }}
      />
    );
}
