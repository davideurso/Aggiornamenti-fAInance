import WidgetKit
import SwiftUI
import Foundation
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit
#if canImport(AppIntents)
import AppIntents
#endif

private let fainanceAppGroup = "group.it.fainanceapp.app"

private enum FainanceWidgetKind: String {
    case quick = "FainanceQuickAddWidget"
    case fidelity = "FainanceFidelityWidget"
    case shoppingList = "FainanceShoppingListWidget"
    case note = "FainanceNoteWidget"
    case goal = "FainanceGoalWidget"
    case debtCredits = "FainanceDebtCreditsWidget"
    case voiceAssistant = "FainanceVoiceAssistantWidget"
    case share = "FainanceShareWidget"

    var settingsKey: String {
        switch self {
        case .quick: return "widget_quick_add_settings"
        case .fidelity: return "widget_fidelity_settings"
        case .shoppingList: return "widget_shopping_list_settings"
        case .note: return "widget_note_settings"
        case .goal: return "widget_goal_settings"
        case .debtCredits: return "widget_debt_credits_settings"
        case .share: return "widget_share_settings"
        case .voiceAssistant: return "widget_settings_v2"
        }
    }

    var typeKey: String {
        switch self {
        case .quick: return "quick"
        case .fidelity: return "fidelity"
        case .shoppingList: return "shoppingList"
        case .note: return "note"
        case .goal: return "goal"
        case .debtCredits: return "debtCredits"
        case .voiceAssistant: return "voiceAssistant"
        case .share: return "share"
        }
    }
}

private struct FainanceWidgetEntry: TimelineEntry {
    let date: Date
    let kind: FainanceWidgetKind
    let data: [String: Any]
    let allowed: Bool
}

private struct FainanceTimelineProvider: TimelineProvider {
    let kind: FainanceWidgetKind

    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date(), kind: kind, data: WidgetStore.previewData(for: kind), allowed: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (FainanceWidgetEntry) -> Void) {
        let data = context.isPreview ? WidgetStore.previewData(for: kind) : WidgetStore.dictionary(forKey: kind.settingsKey)
        completion(FainanceWidgetEntry(date: Date(), kind: kind, data: data, allowed: WidgetStore.isAllowed(kind.typeKey)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FainanceWidgetEntry>) -> Void) {
        let entry = FainanceWidgetEntry(
            date: Date(),
            kind: kind,
            data: WidgetStore.dictionary(forKey: kind.settingsKey),
            allowed: WidgetStore.isAllowed(kind.typeKey)
        )
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60))))
    }
}

private enum WidgetStore {
    static var defaults: UserDefaults? { UserDefaults(suiteName: fainanceAppGroup) }

    static func dictionary(forKey key: String) -> [String: Any] {
        guard let raw = defaults?.string(forKey: key),
              let data = raw.data(using: .utf8),
              let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return [:]
        }
        return value
    }

    static func array(forKey key: String) -> [Any] {
        guard let raw = defaults?.string(forKey: key),
              let data = raw.data(using: .utf8),
              let value = try? JSONSerialization.jsonObject(with: data) as? [Any] else {
            return []
        }
        return value
    }

    static func isAllowed(_ type: String) -> Bool {
        if type == "quick" { return true }
        let currentPlan = (defaults?.string(forKey: "widget_current_plan") ?? "free").lowercased()
        let requirement: String
        switch type {
        case "note", "goal", "debtCredits", "voiceAssistant": requirement = "base"
        case "share": requirement = "premium"
        default: requirement = "free"
        }
        guard rank(currentPlan) >= rank(requirement) else { return false }
        let availability = dictionary(forKey: "widget_plan_availability")
        if let explicit = availability[type] as? Bool { return explicit }
        let available = array(forKey: "widget_available_types").compactMap { $0 as? String }
        return available.isEmpty || available.contains(type)
    }

    static func requiredPlanLabel(_ type: String) -> String {
        switch type {
        case "note", "goal", "debtCredits", "voiceAssistant": return "Base"
        case "share": return WidgetText.text("Completo")
        default: return WidgetText.text("Gratis")
        }
    }

    private static func rank(_ plan: String) -> Int {
        switch plan {
        case "base": return 1
        case "premium", "complete", "completa": return 2
        default: return 0
        }
    }

    static func previewData(for kind: FainanceWidgetKind) -> [String: Any] {
        switch kind {
        case .quick:
            return ["title": "fAInance", "subtitle": WidgetText.text("Aggiunta rapida movimenti"), "expenseLabel": WidgetText.text("Uscita"), "incomeLabel": WidgetText.text("Entrata"), "bgAlpha": 65, "showHeader": true, "showVoiceButton": true]
        case .fidelity:
            return ["title": "Fidelity card", "selectedCard": ["id": "preview", "name": "Supermercato", "code": "8001234567890", "codeType": "barcode", "color": "#0F9F76"], "bgAlpha": 65]
        case .shoppingList:
            return ["title": WidgetText.text("Lista spesa"), "selectedListTitle": WidgetText.text("Lista principale"), "subtitle": WidgetText.text("Tocca un articolo quando è nel carrello"), "items": [["id": "1", "name": "Pane", "bought": false], ["id": "2", "name": "Latte", "bought": false], ["id": "3", "name": "Pomodori", "bought": true]], "bgAlpha": 65]
        case .note:
            return ["title": WidgetText.text("Nota"), "body": "IBAN e informazioni importanti", "type": "note", "bgAlpha": 65]
        case .goal:
            return ["title": WidgetText.text("Vacanza"), "icon": "🎯", "saved": 1500.0, "target": 2500.0, "percent": 60, "currency": "€", "showPercent": true, "showAmounts": true, "bgAlpha": 65]
        case .debtCredits:
            return ["title": WidgetText.text("Debiti / Crediti"), "currency": "€", "items": [["id": "1", "holder": "Marco", "kind": "credit", "balance": 80.0], ["id": "2", "holder": "Laura", "kind": "debt", "balance": 35.0]], "bgAlpha": 65]
        case .voiceAssistant:
            return [:]
        case .share:
            return ["title": "Share", "projectId": "preview", "projectName": "Weekend", "netAmount": 45.0, "owedAmount": 45.0, "oweAmount": 0.0, "lastActivity": "Cena · 90 €", "currency": "€", "bgAlpha": 65]
        }
    }
}

private enum WidgetValue {
    static func string(_ data: [String: Any], _ key: String, _ fallback: String = "") -> String {
        if let value = data[key] as? String, !value.isEmpty { return value }
        if let value = data[key] as? NSNumber { return value.stringValue }
        return fallback
    }

    static func bool(_ data: [String: Any], _ key: String, _ fallback: Bool = false) -> Bool {
        if let value = data[key] as? Bool { return value }
        if let value = data[key] as? NSNumber { return value.boolValue }
        return fallback
    }

    static func double(_ data: [String: Any], _ key: String, _ fallback: Double = 0) -> Double {
        if let value = data[key] as? Double { return value }
        if let value = data[key] as? Int { return Double(value) }
        if let value = data[key] as? NSNumber { return value.doubleValue }
        if let value = data[key] as? String, let parsed = Double(value) { return parsed }
        return fallback
    }

    static func int(_ data: [String: Any], _ key: String, _ fallback: Int = 0) -> Int {
        Int(double(data, key, Double(fallback)))
    }

    static func dictionary(_ data: [String: Any], _ key: String) -> [String: Any] {
        data[key] as? [String: Any] ?? [:]
    }

    static func dictionaries(_ data: [String: Any], _ key: String) -> [[String: Any]] {
        data[key] as? [[String: Any]] ?? (data[key] as? [Any])?.compactMap { $0 as? [String: Any] } ?? []
    }
}

private enum WidgetText {
    static func text(_ italian: String) -> String {
        let language = Locale.preferredLanguages.first?.split(separator: "-").first.map(String.init) ?? "it"
        let values: [String: [String: String]] = [
            "Aggiunta rapida movimenti": ["en":"Quick add transactions","es":"Añadir movimientos","fr":"Ajout rapide","de":"Schnell hinzufügen","pt":"Adição rápida","pl":"Szybkie dodawanie","nl":"Snel toevoegen","ro":"Adăugare rapidă","el":"Γρήγορη προσθήκη"],
            "Uscita": ["en":"Expense","es":"Gasto","fr":"Dépense","de":"Ausgabe","pt":"Despesa","pl":"Wydatek","nl":"Uitgave","ro":"Cheltuială","el":"Έξοδο"],
            "Entrata": ["en":"Income","es":"Ingreso","fr":"Revenu","de":"Einnahme","pt":"Receita","pl":"Przychód","nl":"Inkomst","ro":"Venit","el":"Έσοδο"],
            "Voce": ["en":"Voice","es":"Voz","fr":"Voix","de":"Sprache","pt":"Voz","pl":"Głos","nl":"Stem","ro":"Voce","el":"Φωνή"],
            "Scontrino": ["en":"Receipt","es":"Recibo","fr":"Reçu","de":"Beleg","pt":"Recibo","pl":"Paragon","nl":"Bon","ro":"Bon","el":"Απόδειξη"],
            "Lista spesa": ["en":"Shopping list","es":"Lista de compra","fr":"Liste de courses","de":"Einkaufsliste","pt":"Lista de compras","pl":"Lista zakupów","nl":"Boodschappenlijst","ro":"Listă de cumpărături","el":"Λίστα αγορών"],
            "Lista principale": ["en":"Main list","es":"Lista principal","fr":"Liste principale","de":"Hauptliste","pt":"Lista principal","pl":"Lista główna","nl":"Hoofdlijst","ro":"Lista principală","el":"Κύρια λίστα"],
            "Tocca un articolo quando è nel carrello": ["en":"Tap an item when it is in the cart","es":"Toca un artículo cuando esté en el carrito","fr":"Touchez un article lorsqu’il est dans le panier","de":"Tippe auf einen Artikel im Warenkorb","pt":"Toca num artigo quando estiver no carrinho","pl":"Dotknij produktu, gdy jest w koszyku","nl":"Tik op een item wanneer het in de winkelwagen ligt","ro":"Atinge un articol când este în coș","el":"Πατήστε ένα προϊόν όταν μπει στο καλάθι"],
            "Lista della spesa vuota": ["en":"Shopping list is empty","es":"La lista de compra está vacía","fr":"La liste de courses est vide","de":"Die Einkaufsliste ist leer","pt":"A lista de compras está vazia","pl":"Lista zakupów jest pusta","nl":"De boodschappenlijst is leeg","ro":"Lista de cumpărături este goală","el":"Η λίστα αγορών είναι κενή"],
            "Nota": ["en":"Note","es":"Nota","fr":"Note","de":"Notiz","pt":"Nota","pl":"Notatka","nl":"Notitie","ro":"Notă","el":"Σημείωση"],
            "Vacanza": ["en":"Holiday","es":"Vacaciones","fr":"Vacances","de":"Urlaub","pt":"Férias","pl":"Wakacje","nl":"Vakantie","ro":"Vacanță","el":"Διακοπές"],
            "Debiti / Crediti": ["en":"Debts / Credits","es":"Deudas / Créditos","fr":"Dettes / Crédits","de":"Schulden / Guthaben","pt":"Dívidas / Créditos","pl":"Długi / Należności","nl":"Schulden / Tegoeden","ro":"Datorii / Credite","el":"Χρέη / Πιστώσεις"],
            "Saldo": ["en":"Balance","es":"Saldo","fr":"Solde","de":"Saldo","pt":"Saldo","pl":"Saldo","nl":"Saldo","ro":"Sold","el":"Υπόλοιπο"],
            "Ti devono": ["en":"They owe you","es":"Te deben","fr":"On vous doit","de":"Dir wird geschuldet","pt":"Devem-te","pl":"Tobie są winni","nl":"Zij zijn jou verschuldigd","ro":"Ți se datorează","el":"Σου οφείλουν"],
            "Devi": ["en":"You owe","es":"Debes","fr":"Vous devez","de":"Du schuldest","pt":"Deves","pl":"Jesteś winien","nl":"Jij bent verschuldigd","ro":"Datorezi","el":"Οφείλεις"],
            "Attività": ["en":"Activity","es":"Actividad","fr":"Activité","de":"Aktivität","pt":"Atividade","pl":"Aktywność","nl":"Activiteit","ro":"Activitate","el":"Δραστηριότητα"],
            "Assistente vocale": ["en":"Voice assistant","es":"Asistente de voz","fr":"Assistant vocal","de":"Sprachassistent","pt":"Assistente de voz","pl":"Asystent głosowy","nl":"Spraakassistent","ro":"Asistent vocal","el":"Φωνητικός βοηθός"],
            "Tocca per parlare": ["en":"Tap to talk","es":"Toca para hablar","fr":"Touchez pour parler","de":"Tippen zum Sprechen","pt":"Toca para falar","pl":"Dotknij, aby mówić","nl":"Tik om te praten","ro":"Atinge pentru a vorbi","el":"Πατήστε για ομιλία"],
            "Widget disponibile dal piano": ["en":"Widget available from plan","es":"Widget disponible desde el plan","fr":"Widget disponible à partir du forfait","de":"Widget verfügbar ab Tarif","pt":"Widget disponível a partir do plano","pl":"Widżet dostępny od planu","nl":"Widget beschikbaar vanaf abonnement","ro":"Widget disponibil din planul","el":"Το widget είναι διαθέσιμο από το πλάνο"],
            "Apri fAInance per configurarlo": ["en":"Open fAInance to configure it","es":"Abre fAInance para configurarlo","fr":"Ouvrez fAInance pour le configurer","de":"Öffne fAInance zum Konfigurieren","pt":"Abre o fAInance para configurar","pl":"Otwórz fAInance, aby skonfigurować","nl":"Open fAInance om te configureren","ro":"Deschide fAInance pentru configurare","el":"Ανοίξτε το fAInance για ρύθμιση"],
            "Completo": ["en":"Premium","es":"Completo","fr":"Complet","de":"Komplett","pt":"Completo","pl":"Pełny","nl":"Compleet","ro":"Complet","el":"Πλήρες"],
            "Gratis": ["en":"Free","es":"Gratis","fr":"Gratuit","de":"Kostenlos","pt":"Grátis","pl":"Darmowy","nl":"Gratis","ro":"Gratuit","el":"Δωρεάν"]
        ]
        return values[italian]?[language] ?? italian
    }
}

private extension Color {
    init(hex: String, fallback: String = "#1E1E30") {
        let value = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        let parsed = UInt64(value, radix: 16) ?? UInt64(fallback.trimmingCharacters(in: CharacterSet.alphanumerics.inverted), radix: 16) ?? 0x1E1E30
        let r, g, b, a: Double
        switch value.count {
        case 8:
            r = Double((parsed >> 24) & 0xFF) / 255
            g = Double((parsed >> 16) & 0xFF) / 255
            b = Double((parsed >> 8) & 0xFF) / 255
            a = Double(parsed & 0xFF) / 255
        default:
            r = Double((parsed >> 16) & 0xFF) / 255
            g = Double((parsed >> 8) & 0xFF) / 255
            b = Double(parsed & 0xFF) / 255
            a = 1
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

private extension View {
    @ViewBuilder
    func fainanceContainerBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(color, for: .widget)
        } else {
            self.background(color)
        }
    }
}

private func fainanceURL(_ value: String) -> URL {
    URL(string: value) ?? URL(string: "fainance://widget-settings")!
}

private func money(_ value: Double, currency: String) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = value.rounded() == value ? 0 : 2
    formatter.minimumFractionDigits = 0
    formatter.locale = Locale.current
    return "\(formatter.string(from: NSNumber(value: value)) ?? "0") \(currency)"
}

private struct FainanceBackground: View {
    let hex: String
    let transparency: Int

    var body: some View {
        let opacity = max(0.18, min(1, Double(100 - transparency) / 100))
        ZStack {
            LinearGradient(
                colors: [Color(hex: hex).opacity(opacity), Color(hex: "#111426").opacity(max(opacity, 0.72))],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            RadialGradient(colors: [Color.white.opacity(0.10), Color.clear], center: .topLeading, startRadius: 0, endRadius: 180)
        }
    }
}

private struct WidgetHeader: View {
    let title: String
    let subtitle: String?
    let titleColor: Color
    let bodyColor: Color
    var settingsURL: String = "fainance://widget-settings"

    var body: some View {
        HStack(spacing: 7) {
            Image("logo_fainance")
                .resizable()
                .scaledToFit()
                .frame(width: 29, height: 29)
            VStack(alignment: .leading, spacing: 0) {
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(titleColor)
                    .lineLimit(1)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.system(size: 9.5, weight: .medium))
                        .foregroundColor(bodyColor)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 2)
            Link(destination: fainanceURL(settingsURL)) {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(titleColor)
                    .frame(width: 29, height: 29)
                    .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
            }
        }
    }
}

private struct LockedWidgetView: View {
    let type: String
    let icon: String

    var body: some View {
        Link(destination: fainanceURL("fainance://open-plan-info")) {
            VStack(spacing: 7) {
                HStack {
                    Image("logo_fainance").resizable().scaledToFit().frame(width: 31, height: 31)
                    Spacer()
                    Text(icon).font(.system(size: 24))
                }
                Spacer(minLength: 0)
                Text("\(WidgetText.text("Widget disponibile dal piano")) \(WidgetStore.requiredPlanLabel(type))")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                Text(WidgetText.text("Apri fAInance per configurarlo"))
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.72))
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                Spacer(minLength: 0)
            }
            .padding(12)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(FainanceBackground(hex: "#1E1E30", transparency: 35))
        }
        .fainanceContainerBackground(Color(hex: "#1E1E30"))
    }
}

private struct ActionTile: View {
    let url: String
    let icon: String
    let label: String
    let color: Color
    var vertical = false

    var body: some View {
        Link(destination: fainanceURL(url)) {
            Group {
                if vertical {
                    VStack(spacing: 1) {
                        Text(icon).font(.system(size: 22, weight: .bold))
                        Text(label).font(.system(size: 11, weight: .bold)).lineLimit(1)
                    }
                } else {
                    HStack(spacing: 6) {
                        Text(icon).font(.system(size: 21, weight: .bold))
                        Text(label).font(.system(size: 12, weight: .bold)).lineLimit(1)
                    }
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(color, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

private struct QuickAddWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceWidgetEntry

    var body: some View {
        let data = entry.data
        let title = WidgetValue.string(data, "title", "fAInance")
        let subtitle = WidgetValue.string(data, "subtitle", WidgetText.text("Aggiunta rapida movimenti"))
        let expense = WidgetValue.string(data, "expenseLabel", WidgetText.text("Uscita")).replacingOccurrences(of: "+", with: "").replacingOccurrences(of: "−", with: "").trimmingCharacters(in: .whitespaces)
        let income = WidgetValue.string(data, "incomeLabel", WidgetText.text("Entrata")).replacingOccurrences(of: "+", with: "").replacingOccurrences(of: "−", with: "").trimmingCharacters(in: .whitespaces)
        let background = WidgetValue.string(data, "bgColor", "#1E1E30")
        let transparency = WidgetValue.int(data, "bgAlpha", 65)
        let expenseColor = Color(hex: WidgetValue.string(data, "expenseColor", "#E24B4A"))
        let incomeColor = Color(hex: WidgetValue.string(data, "incomeColor", "#1D9B6C"))
        let showVoice = WidgetValue.bool(data, "showVoiceButton", true)

        ZStack {
            FainanceBackground(hex: background, transparency: transparency)
            if family == .systemSmall {
                VStack(spacing: 7) {
                    HStack(spacing: 7) {
                        Link(destination: fainanceURL(showVoice ? "fainance://open-voice?source=ios-widget&autostart=1" : "fainance://widget-settings")) {
                            Image(systemName: showVoice ? "mic.fill" : "gearshape.fill")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 34, height: 34)
                                .background(Color(hex: "#7F77DD"), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        Spacer()
                        Image("logo_fainance").resizable().scaledToFit().frame(width: 30, height: 30)
                    }
                    HStack(spacing: 7) {
                        ActionTile(url: "fainance://add-expense", icon: "−", label: expense, color: expenseColor, vertical: true)
                        ActionTile(url: "fainance://add-income", icon: "+", label: income, color: incomeColor, vertical: true)
                    }
                }
                .padding(10)
            } else {
                VStack(spacing: 7) {
                    if WidgetValue.bool(data, "showHeader", true) {
                        WidgetHeader(title: title, subtitle: subtitle, titleColor: .white, bodyColor: Color.white.opacity(0.75))
                    }
                    HStack(spacing: 8) {
                        ActionTile(url: "fainance://add-expense", icon: "−", label: expense, color: expenseColor)
                        ActionTile(url: "fainance://add-income", icon: "+", label: income, color: incomeColor)
                    }
                    HStack(spacing: 8) {
                        ActionTile(url: "fainance://open-voice?source=ios-widget&autostart=1", icon: "🎙", label: WidgetText.text("Voce"), color: Color(hex: "#7F77DD"))
                        ActionTile(url: "fainance://open-receipt-camera", icon: "📷", label: WidgetText.text("Scontrino"), color: Color(hex: "#F29F3D"))
                    }
                }
                .padding(10)
            }
        }
        .fainanceContainerBackground(Color(hex: background))
    }
}

private struct NoteWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceWidgetEntry

    var body: some View {
        if !entry.allowed {
            LockedWidgetView(type: "note", icon: "📝")
        } else {
            let data = entry.data
            let title = WidgetValue.string(data, "title", WidgetText.text("Nota"))
            let body = WidgetValue.string(data, "body", WidgetText.text("Apri fAInance per configurarlo"))
            let background = WidgetValue.string(data, "accentColor", "#7F77DD")
            let titleColor = Color(hex: WidgetValue.string(data, "titleColor", "#FFFFFF"))
            let bodyColor = Color(hex: WidgetValue.string(data, "bodyColor", "#EDEDF7"))
            let transparency = WidgetValue.int(data, "bgAlpha", 65)
            ZStack {
                FainanceBackground(hex: background, transparency: transparency)
                VStack(alignment: .leading, spacing: 8) {
                    WidgetHeader(title: title, subtitle: nil, titleColor: titleColor, bodyColor: bodyColor)
                    Text(body)
                        .font(.system(size: CGFloat(max(11, min(18, WidgetValue.int(data, "textSize", 14)))), weight: .medium))
                        .foregroundColor(bodyColor)
                        .lineLimit(family == .systemSmall ? 5 : 8)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .padding(9)
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                }
                .padding(11)
            }
            .widgetURL(fainanceURL("fainance://open-appunti"))
            .fainanceContainerBackground(Color(hex: background))
        }
    }
}

private struct GoalWidgetView: View {
    let entry: FainanceWidgetEntry

    var body: some View {
        if !entry.allowed {
            LockedWidgetView(type: "goal", icon: "🎯")
        } else {
            let data = entry.data
            let title = WidgetValue.string(data, "title", WidgetText.text("Vacanza"))
            let icon = WidgetValue.string(data, "icon", "🎯")
            let saved = WidgetValue.double(data, "saved")
            let target = WidgetValue.double(data, "target")
            let percent = min(100, max(0, WidgetValue.int(data, "percent", target > 0 ? Int(saved / target * 100) : 0)))
            let currency = WidgetValue.string(data, "currency", "€")
            let accent = Color(hex: WidgetValue.string(data, "accentColor", WidgetValue.string(data, "color", "#EF7D00")))
            let textColor = Color(hex: WidgetValue.string(data, "textColor", "#FFFFFF"))
            let percentColor = Color(hex: WidgetValue.string(data, "percentColor", "#EF7D00"))
            let transparency = WidgetValue.int(data, "bgAlpha", 65)
            ZStack {
                FainanceBackground(hex: "#1E1E30", transparency: transparency)
                VStack(alignment: .leading, spacing: 9) {
                    HStack {
                        Image("logo_fainance").resizable().scaledToFit().frame(width: 30, height: 30)
                        Text(icon).font(.system(size: 23))
                        Text(title).font(.system(size: 14, weight: .bold)).foregroundColor(textColor).lineLimit(1)
                        Spacer(minLength: 2)
                        Link(destination: fainanceURL("fainance://widget-settings")) {
                            Image(systemName: "gearshape.fill").font(.system(size: 13, weight: .bold)).foregroundColor(textColor)
                        }
                    }
                    if WidgetValue.bool(data, "showPercent", true) {
                        Text("\(percent)%")
                            .font(.system(size: 25, weight: .heavy))
                            .foregroundColor(percentColor)
                    }
                    GeometryReader { proxy in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.white.opacity(0.14))
                            Capsule().fill(accent).frame(width: proxy.size.width * CGFloat(percent) / 100)
                        }
                    }
                    .frame(height: 9)
                    if WidgetValue.bool(data, "showAmounts", true) {
                        Text("\(money(saved, currency: currency)) / \(money(target, currency: currency))")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(textColor)
                            .lineLimit(1)
                    }
                }
                .padding(11)
            }
            .widgetURL(fainanceURL("fainance://open-goals"))
            .fainanceContainerBackground(Color(hex: "#1E1E30"))
        }
    }
}

private struct FidelityWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceWidgetEntry

    var body: some View {
        let data = entry.data
        let card = WidgetValue.dictionary(data, "selectedCard").isEmpty ? (WidgetValue.dictionaries(data, "cards").first ?? [:]) : WidgetValue.dictionary(data, "selectedCard")
        let cardId = WidgetValue.string(card, "id")
        let cardName = WidgetValue.string(card, "name", "Fidelity card")
        let code = WidgetValue.string(card, "code")
        let codeType = WidgetValue.string(card, "codeType", "barcode")
        let accent = WidgetValue.string(data, "accentColor", WidgetValue.string(card, "color", "#0F9F76"))
        let titleColor = Color(hex: WidgetValue.string(data, "titleColor", "#FFFFFF"))
        let transparency = WidgetValue.int(data, "bgAlpha", 65)
        ZStack {
            FainanceBackground(hex: accent, transparency: transparency)
            VStack(spacing: 7) {
                WidgetHeader(title: cardName, subtitle: "Fidelity card", titleColor: titleColor, bodyColor: titleColor.opacity(0.72))
                if code.isEmpty {
                    Spacer()
                    Text(WidgetText.text("Apri fAInance per configurarlo"))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(titleColor.opacity(0.82))
                        .multilineTextAlignment(.center)
                    Spacer()
                } else if let image = BarcodeRenderer.image(code: code, type: codeType) {
                    Image(uiImage: image)
                        .resizable()
                        .interpolation(.none)
                        .scaledToFit()
                        .padding(family == .systemSmall ? 6 : 4)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                if family != .systemSmall && !code.isEmpty {
                    Text(code).font(.system(size: 10, weight: .medium, design: .monospaced)).foregroundColor(titleColor).lineLimit(1)
                }
            }
            .padding(10)
        }
        .widgetURL(fainanceURL("fainance://open-fidelity-card?cardId=\(cardId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"))
        .fainanceContainerBackground(Color(hex: accent))
    }
}

private enum BarcodeRenderer {
    static func image(code: String, type: String) -> UIImage? {
        let context = CIContext()
        let output: CIImage?
        if type.lowercased().contains("qr") {
            let filter = CIFilter.qrCodeGenerator()
            filter.message = Data(code.utf8)
            filter.correctionLevel = "M"
            output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 8, y: 8))
        } else {
            let filter = CIFilter.code128BarcodeGenerator()
            filter.message = Data(code.utf8)
            filter.quietSpace = 7
            output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 3.2, y: 3.2))
        }
        guard let output, let cgImage = context.createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
}

private struct ShoppingListWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceWidgetEntry

    var body: some View {
        let data = entry.data
        let listId = WidgetValue.string(data, "selectedListId", "main")
        let title = WidgetValue.string(data, "selectedListTitle", WidgetValue.string(data, "title", WidgetText.text("Lista spesa")))
        let subtitle = WidgetValue.string(data, "subtitle", WidgetText.text("Tocca un articolo quando è nel carrello"))
        let items = WidgetValue.dictionaries(data, "items")
        let accent = WidgetValue.string(data, "accentColor", "#EF9F27")
        let titleColor = Color(hex: WidgetValue.string(data, "titleColor", "#FFFFFF"))
        let textColor = Color(hex: WidgetValue.string(data, "textColor", "#EDEDF7"))
        let iconColor = Color(hex: WidgetValue.string(data, "iconColor", accent))
        let transparency = WidgetValue.int(data, "bgAlpha", 65)
        let maxRows = family == .systemLarge ? 8 : (family == .systemMedium ? 4 : 3)

        ZStack {
            FainanceBackground(hex: "#1E1E30", transparency: transparency)
            VStack(alignment: .leading, spacing: 6) {
                WidgetHeader(title: title, subtitle: subtitle, titleColor: titleColor, bodyColor: textColor)
                if items.isEmpty {
                    Link(destination: fainanceURL("fainance://open-shopping-list?listId=\(listId)")) {
                        Text(WidgetValue.string(data, "emptyText", WidgetText.text("Lista della spesa vuota")))
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(textColor)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                } else {
                    VStack(spacing: 4) {
                        ForEach(Array(items.prefix(maxRows).enumerated()), id: \.offset) { _, item in
                            ShoppingRow(item: item, listId: listId, textColor: textColor, iconColor: iconColor)
                        }
                    }
                    Spacer(minLength: 0)
                }
            }
            .padding(10)
        }
        .fainanceContainerBackground(Color(hex: "#1E1E30"))
    }
}

private struct ShoppingRow: View {
    let item: [String: Any]
    let listId: String
    let textColor: Color
    let iconColor: Color

    private var id: String { WidgetValue.string(item, "id") }
    private var name: String { WidgetValue.string(item, "name", "Prodotto") }
    private var bought: Bool { WidgetValue.bool(item, "bought") }

    @ViewBuilder
    var body: some View {
#if canImport(AppIntents)
        if #available(iOSApplicationExtension 17.0, *) {
            Button(intent: ToggleShoppingItemIntent(itemId: id, listId: listId)) {
                rowContent
            }
            .buttonStyle(.plain)
        } else {
            shoppingLink
        }
#else
        shoppingLink
#endif
    }

    private var shoppingLink: some View {
        Link(destination: fainanceURL("fainance://open-shopping-list?listId=\(listId)")) {
            rowContent
        }
    }

    private var rowContent: some View {
        HStack(spacing: 7) {
            Image(systemName: bought ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(bought ? iconColor : textColor.opacity(0.65))
            Text(name)
                .font(.system(size: 11.5, weight: bought ? .medium : .semibold))
                .foregroundColor(textColor.opacity(bought ? 0.58 : 1))
                .strikethrough(bought)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 7)
        .frame(height: 25)
        .background(Color.white.opacity(bought ? 0.05 : 0.09), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

#if canImport(AppIntents)
@available(iOSApplicationExtension 17.0, *)
struct ToggleShoppingItemIntent: AppIntent {
    static var title: LocalizedStringResource = "Aggiorna articolo"
    static var openAppWhenRun = false

    @Parameter(title: "Articolo") var itemId: String
    @Parameter(title: "Lista") var listId: String

    init() {
        itemId = ""
        listId = "main"
    }

    init(itemId: String, listId: String) {
        self.itemId = itemId
        self.listId = listId
    }

    func perform() async throws -> some IntentResult {
        guard let defaults = UserDefaults(suiteName: fainanceAppGroup),
              let raw = defaults.string(forKey: "widget_shopping_list_settings"),
              let rawData = raw.data(using: .utf8),
              var json = try JSONSerialization.jsonObject(with: rawData) as? [String: Any] else {
            return .result()
        }

        var allItems = (json["allItems"] as? [[String: Any]]) ?? (json["items"] as? [[String: Any]]) ?? []
        var updatedValue: Bool?
        for index in allItems.indices where WidgetValue.string(allItems[index], "id") == itemId {
            let newValue = !WidgetValue.bool(allItems[index], "bought")
            allItems[index]["bought"] = newValue
            updatedValue = newValue
        }
        guard let updatedValue else { return .result() }

        json["allItems"] = allItems
        let selectedListId = WidgetValue.string(json, "selectedListId", listId)
        let maxItems = max(1, WidgetValue.int(json, "maxItems", 8))
        json["items"] = allItems
            .filter { WidgetValue.string($0, "listId", "main") == selectedListId }
            .sorted {
                let left = WidgetValue.bool($0, "bought")
                let right = WidgetValue.bool($1, "bought")
                if left != right { return !left }
                return WidgetValue.string($0, "name").localizedCaseInsensitiveCompare(WidgetValue.string($1, "name")) == .orderedAscending
            }
            .prefix(maxItems)
            .map { $0 }

        if let encoded = try? JSONSerialization.data(withJSONObject: json),
           let string = String(data: encoded, encoding: .utf8) {
            defaults.set(string, forKey: "widget_shopping_list_settings")
        }

        let pendingKey = "widget_shopping_list_item_updates_v1"
        var pending: [[String: Any]] = []
        if let pendingRaw = defaults.string(forKey: pendingKey),
           let pendingData = pendingRaw.data(using: .utf8),
           let decoded = try? JSONSerialization.jsonObject(with: pendingData) as? [[String: Any]] {
            pending = decoded.filter { WidgetValue.string($0, "id") != itemId }
        }
        pending.append(["id": itemId, "bought": updatedValue, "updatedAt": ISO8601DateFormatter().string(from: Date())])
        if let encoded = try? JSONSerialization.data(withJSONObject: pending),
           let string = String(data: encoded, encoding: .utf8) {
            defaults.set(string, forKey: pendingKey)
        }
        defaults.synchronize()
        WidgetCenter.shared.reloadTimelines(ofKind: FainanceWidgetKind.shoppingList.rawValue)
        return .result()
    }
}
#endif

private struct DebtCreditsWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceWidgetEntry

    var body: some View {
        if !entry.allowed {
            LockedWidgetView(type: "debtCredits", icon: "📉")
        } else {
            let data = entry.data
            let items = WidgetValue.dictionaries(data, "items")
            let currency = WidgetValue.string(data, "currency", "€")
            let debt = items.filter { WidgetValue.string($0, "kind", "debt") != "credit" }.reduce(0) { $0 + WidgetValue.double($1, "balance") }
            let credit = items.filter { WidgetValue.string($0, "kind") == "credit" }.reduce(0) { $0 + WidgetValue.double($1, "balance") }
            let net = credit - debt
            let titleColor = Color(hex: WidgetValue.string(data, "titleColor", "#FFFFFF"))
            let textColor = Color(hex: WidgetValue.string(data, "textColor", "#EDEDF7"))
            let iconColor = Color(hex: WidgetValue.string(data, "iconColor", WidgetValue.string(data, "accentColor", "#7F77DD")))
            let transparency = WidgetValue.int(data, "bgAlpha", 65)
            let maxRows = family == .systemLarge ? 6 : 4

            ZStack {
                FainanceBackground(hex: "#1E1E30", transparency: transparency)
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 7) {
                        Image("logo_fainance").resizable().scaledToFit().frame(width: 29, height: 29)
                        Text(WidgetValue.string(data, "title", WidgetText.text("Debiti / Crediti")))
                            .font(.system(size: 13, weight: .bold)).foregroundColor(titleColor).lineLimit(1)
                        Spacer(minLength: 3)
                        Text("\(WidgetText.text("Saldo")) \(money(net, currency: currency))")
                            .font(.system(size: 11.5, weight: .bold)).foregroundColor(textColor).lineLimit(1)
                        Link(destination: fainanceURL("fainance://widget-settings")) {
                            Image(systemName: "gearshape.fill").font(.system(size: 12, weight: .bold)).foregroundColor(iconColor)
                        }
                    }
                    Link(destination: fainanceURL("fainance://open-debt-credits")) {
                        Text("\(WidgetText.text("Devi")) \(money(debt, currency: currency))  ·  \(WidgetText.text("Ti devono")) \(money(credit, currency: currency))")
                            .font(.system(size: 11, weight: .bold)).foregroundColor(textColor)
                            .frame(maxWidth: .infinity, alignment: .leading).padding(6)
                            .background(Color.white.opacity(0.13), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    ForEach(Array(items.prefix(maxRows).enumerated()), id: \.offset) { _, item in
                        let id = WidgetValue.string(item, "id")
                        let kind = WidgetValue.string(item, "kind", "debt")
                        Link(destination: fainanceURL("fainance://open-debt-credit?debtId=\(id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")) {
                            HStack(spacing: 5) {
                                Text(kind == "credit" ? "📈" : "📉")
                                Text(WidgetValue.string(item, "holder", "—")).lineLimit(1)
                                Spacer(minLength: 2)
                                Text(money(WidgetValue.double(item, "balance"), currency: currency)).lineLimit(1)
                            }
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(textColor)
                            .padding(.horizontal, 6)
                            .frame(height: 24)
                            .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
                        }
                    }
                    Spacer(minLength: 0)
                }
                .padding(9)
            }
            .fainanceContainerBackground(Color(hex: "#1E1E30"))
        }
    }
}

private struct ShareWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceWidgetEntry

    var body: some View {
        if !entry.allowed {
            LockedWidgetView(type: "share", icon: "🤝")
        } else {
            let data = entry.data
            let projectId = WidgetValue.string(data, "projectId")
            let projectParam = projectId.isEmpty ? "" : "?project=\(projectId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
            let currency = WidgetValue.string(data, "currency", "€")
            let titleColor = Color(hex: WidgetValue.string(data, "titleColor", "#FFFFFF"))
            let bodyColor = Color(hex: WidgetValue.string(data, "bodyColor", "#D8D6F2"))
            let activityColor = Color(hex: WidgetValue.string(data, "activityColor", "#378ADD"))
            let background = WidgetValue.string(data, "bgColor", "#1E1E30")
            let transparency = WidgetValue.int(data, "bgAlpha", 65)

            ZStack {
                FainanceBackground(hex: background, transparency: transparency)
                VStack(spacing: 7) {
                    WidgetHeader(title: "Share", subtitle: WidgetValue.string(data, "projectName", "Nessun progetto selezionato"), titleColor: titleColor, bodyColor: bodyColor)
                    Link(destination: fainanceURL("fainance://open-share\(projectParam)")) {
                        HStack(spacing: 9) {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(WidgetText.text("Saldo")).font(.system(size: 10, weight: .semibold)).foregroundColor(bodyColor)
                                Text(money(WidgetValue.double(data, "netAmount"), currency: currency)).font(.system(size: 18, weight: .heavy)).foregroundColor(titleColor).lineLimit(1)
                            }
                            Spacer(minLength: 1)
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("\(WidgetText.text("Ti devono")): \(money(WidgetValue.double(data, "owedAmount"), currency: currency))")
                                Text("\(WidgetText.text("Devi")): \(money(WidgetValue.double(data, "oweAmount"), currency: currency))")
                            }
                            .font(.system(size: 9.5, weight: .semibold))
                            .foregroundColor(bodyColor)
                        }
                        .padding(8)
                        .background(Color.white.opacity(0.10), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
                    }
                    if family != .systemSmall {
                        HStack(spacing: 6) {
                            ActionTile(url: "fainance://share-add-expense\(projectParam)", icon: "+", label: WidgetText.text("Uscita"), color: Color(hex: "#E24B4A"))
                            ActionTile(url: "fainance://share-receipt\(projectParam)", icon: "📷", label: WidgetText.text("Scontrino"), color: Color(hex: "#F29F3D"))
                            ActionTile(url: "fainance://share-voice\(projectParam)", icon: "🎙", label: WidgetText.text("Voce"), color: Color(hex: "#7F77DD"))
                            ActionTile(url: "fainance://open-share\(projectParam)", icon: "↗", label: WidgetText.text("Attività"), color: activityColor)
                        }
                        .frame(height: 38)
                    }
                    Text(WidgetValue.string(data, "lastActivity", "Nessuna attività recente"))
                        .font(.system(size: 9.5, weight: .medium))
                        .foregroundColor(bodyColor)
                        .lineLimit(1)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(9)
            }
            .fainanceContainerBackground(Color(hex: background))
        }
    }
}

private struct VoiceAssistantWidgetView: View {
    let entry: FainanceWidgetEntry

    var body: some View {
        if !entry.allowed {
            LockedWidgetView(type: "voiceAssistant", icon: "🎙")
        } else {
            Link(destination: fainanceURL("fainance://open-voice?source=ios-widget&autostart=1")) {
                ZStack(alignment: .bottomTrailing) {
                    LinearGradient(colors: [Color(hex: "#F3F0FF"), Color(hex: "#DCD7FF")], startPoint: .topLeading, endPoint: .bottomTrailing)
                    VStack(spacing: 2) {
                        Image("ai_grillo_mascot_transparent").resizable().scaledToFit().frame(maxHeight: 75)
                        Text(WidgetText.text("Assistente vocale"))
                            .font(.system(size: 12, weight: .bold)).foregroundColor(Color(hex: "#292642")).lineLimit(1)
                        Text(WidgetText.text("Tocca per parlare"))
                            .font(.system(size: 9, weight: .medium)).foregroundColor(Color(hex: "#6A6682")).lineLimit(1)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    Image(systemName: "mic.fill")
                        .font(.system(size: 12, weight: .bold)).foregroundColor(.white)
                        .frame(width: 27, height: 27)
                        .background(Color(hex: "#7F77DD"), in: Circle())
                        .padding(8)
                }
            }
            .fainanceContainerBackground(Color(hex: "#F3F0FF"))
        }
    }
}

private struct QuickAddWidget: Widget {
    let kind = FainanceWidgetKind.quick.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .quick)) { QuickAddWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Aggiunta rapida")
            .description("Aggiungi uscite, entrate, voce e scontrini.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct FidelityWidget: Widget {
    let kind = FainanceWidgetKind.fidelity.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .fidelity)) { FidelityWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Fidelity card")
            .description("Mostra rapidamente la carta selezionata.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct ShoppingListWidget: Widget {
    let kind = FainanceWidgetKind.shoppingList.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .shoppingList)) { ShoppingListWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Lista spesa")
            .description("Controlla la lista e segna gli articoli acquistati.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

private struct NoteWidget: Widget {
    let kind = FainanceWidgetKind.note.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .note)) { NoteWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Nota / Dati")
            .description("Mostra una nota, un IBAN o una carta di credito.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct GoalWidget: Widget {
    let kind = FainanceWidgetKind.goal.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .goal)) { GoalWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Obiettivo")
            .description("Mostra avanzamento, percentuale e importi.")
            .supportedFamilies([.systemSmall, .systemMedium])
    }
}

private struct DebtCreditsWidget: Widget {
    let kind = FainanceWidgetKind.debtCredits.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .debtCredits)) { DebtCreditsWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Debiti / Crediti")
            .description("Mostra saldo e posizioni aperte.")
            .supportedFamilies([.systemMedium, .systemLarge])
    }
}

private struct VoiceAssistantWidget: Widget {
    let kind = FainanceWidgetKind.voiceAssistant.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .voiceAssistant)) { VoiceAssistantWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Assistente vocale")
            .description("Apri direttamente la conversazione vocale.")
            .supportedFamilies([.systemSmall])
    }
}

private struct ShareWidget: Widget {
    let kind = FainanceWidgetKind.share.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .share)) { ShareWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Share")
            .description("Controlla il saldo del progetto e aggiungi spese.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct FainanceWidgets: WidgetBundle {
    var body: some Widget {
        QuickAddWidget()
        FidelityWidget()
        ShoppingListWidget()
        NoteWidget()
        GoalWidget()
        DebtCreditsWidget()
        VoiceAssistantWidget()
        ShareWidget()
    }
}
