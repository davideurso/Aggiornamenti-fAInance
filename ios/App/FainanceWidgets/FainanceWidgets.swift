import WidgetKit
import SwiftUI
import Foundation

private enum FainanceWidgetConfig {
    static let appGroupId = "group.it.fainanceapp.app"
    static let payloadKey = "fainance_widget_payload"
    static let appScheme = "fainance"
}

struct FainanceWidgetPayload: Codable {
    var updatedAt: String?
    var locale: String?
    var currencySymbol: String?
    var colors: FainanceWidgetColors?
    var quickAdd: QuickAddWidgetData?
    var fidelity: FidelityWidgetData?
    var shopping: ShoppingWidgetData?
    var note: NoteWidgetData?
    var goal: GoalWidgetData?
    var share: ShareWidgetData?
    var debts: DebtsWidgetData?

    static let sample = FainanceWidgetPayload(
        updatedAt: "Ora",
        locale: "it-IT",
        currencySymbol: "€",
        colors: FainanceWidgetColors.sample,
        quickAdd: QuickAddWidgetData(sampleExpenseLabel: "+ Spesa", sampleIncomeLabel: "+ Entrata"),
        fidelity: FidelityWidgetData(title: "Fidelity", cardName: "Supermercato", barcode: "0123456789", qrCode: nil, backgroundHex: "#2F5BFF"),
        shopping: ShoppingWidgetData(title: "Lista spesa", listName: "Spesa oggi", remainingCount: 5, completedCount: 2, items: ["Pane", "Latte", "Pasta", "Frutta"]),
        note: NoteWidgetData(title: "Nota", noteTitle: "Promemoria", body: "Ricordati di controllare le spese del weekend."),
        goal: GoalWidgetData(title: "Obiettivo", goalName: "Viaggio", currentAmount: 720, targetAmount: 1200, currencySymbol: "€"),
        share: ShareWidgetData(title: "Share", projectName: "Weekend", myBalance: -18.50, currencySymbol: "€", participants: ["Davide", "Marco", "Sara"]),
        debts: DebtsWidgetData(title: "Debiti", debtsTotal: 140, creditsTotal: 75, currencySymbol: "€", items: [DebtCreditItem(name: "Luca", amount: 80, type: "debt"), DebtCreditItem(name: "Anna", amount: 50, type: "credit")])
    )
}

struct FainanceWidgetColors: Codable {
    var primaryHex: String?
    var secondaryHex: String?
    var incomeHex: String?
    var expenseHex: String?
    var textHex: String?
    var cardHex: String?

    static let sample = FainanceWidgetColors(
        primaryHex: "#315CFF",
        secondaryHex: "#8C4DFF",
        incomeHex: "#18A957",
        expenseHex: "#E44B4B",
        textHex: "#FFFFFF",
        cardHex: "#12172A"
    )
}

struct QuickAddWidgetData: Codable {
    var sampleExpenseLabel: String?
    var sampleIncomeLabel: String?
}

struct FidelityWidgetData: Codable {
    var title: String?
    var cardName: String?
    var barcode: String?
    var qrCode: String?
    var backgroundHex: String?
}

struct ShoppingWidgetData: Codable {
    var title: String?
    var listName: String?
    var remainingCount: Int?
    var completedCount: Int?
    var items: [String]?
}

struct NoteWidgetData: Codable {
    var title: String?
    var noteTitle: String?
    var body: String?
}

struct GoalWidgetData: Codable {
    var title: String?
    var goalName: String?
    var currentAmount: Double?
    var targetAmount: Double?
    var currencySymbol: String?
}

struct ShareWidgetData: Codable {
    var title: String?
    var projectName: String?
    var myBalance: Double?
    var currencySymbol: String?
    var participants: [String]?
}

struct DebtCreditItem: Codable, Identifiable {
    var id: String { "\(type)-\(name)-\(amount)" }
    var name: String
    var amount: Double
    var type: String
}

struct DebtsWidgetData: Codable {
    var title: String?
    var debtsTotal: Double?
    var creditsTotal: Double?
    var currencySymbol: String?
    var items: [DebtCreditItem]?
}

private enum FainanceWidgetStore {
    static func readPayload() -> FainanceWidgetPayload {
        guard let defaults = UserDefaults(suiteName: FainanceWidgetConfig.appGroupId) else {
            return FainanceWidgetPayload.sample
        }
        guard let json = defaults.string(forKey: FainanceWidgetConfig.payloadKey) else {
            return FainanceWidgetPayload.sample
        }
        guard let data = json.data(using: .utf8) else {
            return FainanceWidgetPayload.sample
        }
        return (try? JSONDecoder().decode(FainanceWidgetPayload.self, from: data)) ?? FainanceWidgetPayload.sample
    }
}

enum FainanceWidgetKind: String, CaseIterable {
    case quickAdd = "FainanceQuickAddWidget"
    case fidelity = "FainanceFidelityWidget"
    case shopping = "FainanceShoppingWidget"
    case note = "FainanceNoteWidget"
    case goal = "FainanceGoalWidget"
    case share = "FainanceShareWidget"
    case debts = "FainanceDebtsWidget"

    var displayName: String {
        switch self {
        case .quickAdd: return "Aggiunta rapida"
        case .fidelity: return "Fidelity"
        case .shopping: return "Lista spesa"
        case .note: return "Nota"
        case .goal: return "Obiettivo"
        case .share: return "Share"
        case .debts: return "Debiti"
        }
    }

    var description: String {
        switch self {
        case .quickAdd: return "Aggiungi rapidamente entrate e uscite."
        case .fidelity: return "Mostra rapidamente una fidelity card."
        case .shopping: return "Controlla la lista della spesa."
        case .note: return "Visualizza una nota importante."
        case .goal: return "Monitora un obiettivo di risparmio."
        case .share: return "Controlla un progetto Share."
        case .debts: return "Visualizza debiti, crediti e saldo."
        }
    }

    var deepLinkPath: String {
        switch self {
        case .quickAdd: return "quick-add"
        case .fidelity: return "fidelity"
        case .shopping: return "shopping-list"
        case .note: return "note"
        case .goal: return "goal"
        case .share: return "share"
        case .debts: return "debts"
        }
    }
}

struct FainanceEntry: TimelineEntry {
    let date: Date
    let kind: FainanceWidgetKind
    let payload: FainanceWidgetPayload
}

struct FainanceProvider: TimelineProvider {
    let kind: FainanceWidgetKind

    func placeholder(in context: Context) -> FainanceEntry {
        FainanceEntry(date: Date(), kind: kind, payload: FainanceWidgetPayload.sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (FainanceEntry) -> Void) {
        let payload = context.isPreview ? FainanceWidgetPayload.sample : FainanceWidgetStore.readPayload()
        completion(FainanceEntry(date: Date(), kind: kind, payload: payload))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FainanceEntry>) -> Void) {
        let entry = FainanceEntry(date: Date(), kind: kind, payload: FainanceWidgetStore.readPayload())
        let nextUpdate = Date().addingTimeInterval(15 * 60)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

@main
struct FainanceWidgetsBundle: WidgetBundle {
    var body: some Widget {
        FainanceWidget(kind: .quickAdd)
        FainanceWidget(kind: .fidelity)
        FainanceWidget(kind: .shopping)
        FainanceWidget(kind: .note)
        FainanceWidget(kind: .goal)
        FainanceWidget(kind: .share)
        FainanceWidget(kind: .debts)
    }
}

struct FainanceWidget: Widget {
    let kind: FainanceWidgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind.rawValue, provider: FainanceProvider(kind: kind)) { entry in
            FainanceWidgetRootView(entry: entry)
        }
        .configurationDisplayName(kind.displayName)
        .description(kind.description)
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct FainanceWidgetRootView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceEntry

    var body: some View {
        ZStack {
            widgetBackground
            widgetContent
                .padding(14)
        }
        .widgetURL(URL(string: "\(FainanceWidgetConfig.appScheme)://\(entry.kind.deepLinkPath)"))
        .modifier(WidgetContainerBackground(background: widgetBackground))
    }

    private var widgetBackground: LinearGradient {
        let colors = entry.payload.colors ?? FainanceWidgetColors.sample
        let primary = Color(hex: colors.primaryHex ?? "#315CFF")
        let secondary = Color(hex: colors.secondaryHex ?? "#8C4DFF")
        return LinearGradient(colors: [primary, secondary], startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    @ViewBuilder
    private var widgetContent: some View {
        switch entry.kind {
        case .quickAdd:
            QuickAddWidgetView(entry: entry, family: family)
        case .fidelity:
            FidelityWidgetView(entry: entry, family: family)
        case .shopping:
            ShoppingWidgetView(entry: entry, family: family)
        case .note:
            NoteWidgetView(entry: entry, family: family)
        case .goal:
            GoalWidgetView(entry: entry, family: family)
        case .share:
            ShareWidgetView(entry: entry, family: family)
        case .debts:
            DebtsWidgetView(entry: entry, family: family)
        }
    }
}

private struct WidgetContainerBackground<Background: View>: ViewModifier {
    let background: Background

    func body(content: Content) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            content.containerBackground(for: .widget) {
                background
            }
        } else {
            content
        }
    }
}

private struct WidgetHeader: View {
    let icon: String
    let title: String

    var body: some View {
        HStack(spacing: 8) {
            Text(icon)
                .font(.system(size: 16, weight: .bold))
                .frame(width: 28, height: 28)
                .background(Color.white.opacity(0.18))
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

            Text(title)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)

            Spacer(minLength: 0)
        }
    }
}

private struct StatPill: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.75))
            Text(value)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.14))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct ProgressBar: View {
    let progress: Double

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 5).fill(Color.white.opacity(0.22))
                RoundedRectangle(cornerRadius: 5)
                    .fill(Color.white)
                    .frame(width: max(8, geo.size.width * CGFloat(min(max(progress, 0), 1))))
            }
        }
        .frame(height: 9)
    }
}

private func money(_ value: Double?, symbol: String?) -> String {
    let amount = value ?? 0
    let rounded = abs(amount.truncatingRemainder(dividingBy: 1)) < 0.005
    let number = rounded ? String(format: "%.0f", amount) : String(format: "%.2f", amount)
    return "\(symbol ?? "€") \(number)"
}

private func signedMoney(_ value: Double?, symbol: String?) -> String {
    let amount = value ?? 0
    let sign = amount > 0 ? "+" : amount < 0 ? "-" : ""
    return "\(sign)\(money(abs(amount), symbol: symbol))"
}

private struct QuickAddWidgetView: View {
    let entry: FainanceEntry
    let family: WidgetFamily

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            WidgetHeader(icon: "+", title: "Aggiunta rapida")
            Spacer(minLength: 0)

            if family == .systemSmall {
                Text("Registra subito")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                Text("Tocca per aprire fAInance")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.78))
            } else {
                HStack(spacing: 10) {
                    StatPill(title: "Uscita", value: entry.payload.quickAdd?.sampleExpenseLabel ?? "+ Spesa")
                    StatPill(title: "Entrata", value: entry.payload.quickAdd?.sampleIncomeLabel ?? "+ Entrata")
                }
                Text("Tocca il widget per aprire l’inserimento rapido")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.78))
                    .lineLimit(2)
            }
        }
    }
}

private struct FidelityWidgetView: View {
    let entry: FainanceEntry
    let family: WidgetFamily

    private var data: FidelityWidgetData {
        entry.payload.fidelity ?? FainanceWidgetPayload.sample.fidelity!
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(icon: "◆", title: data.title ?? "Fidelity")

            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color(hex: data.backgroundHex ?? "#2F5BFF").opacity(0.88))
                .overlay(fidelityContent.padding(12))
                .frame(maxHeight: family == .systemSmall ? 82 : 112)

            if family != .systemSmall {
                Text("Tocca per aprire la carta")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.78))
            }
        }
    }

    private var fidelityContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(data.cardName ?? "Carta")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)

            Spacer(minLength: 0)

            if let barcode = data.barcode, !barcode.isEmpty {
                BarcodePlaceholder(value: barcode)
            } else if let qr = data.qrCode, !qr.isEmpty {
                Text(qr)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(.white)
                    .lineLimit(2)
            } else {
                Text("Nessun codice")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white.opacity(0.8))
            }
        }
    }
}

private struct BarcodePlaceholder: View {
    let value: String

    private var barCount: Int {
        min(value.count, 18)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 2) {
                ForEach(0..<barCount, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 1)
                        .fill(Color.white)
                        .frame(width: index % 3 == 0 ? 3 : 2, height: index % 2 == 0 ? 28 : 20)
                }
            }
            Text(value)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundColor(.white.opacity(0.88))
                .lineLimit(1)
                .minimumScaleFactor(0.5)
        }
    }
}

private struct ShoppingWidgetView: View {
    let entry: FainanceEntry
    let family: WidgetFamily

    private var data: ShoppingWidgetData {
        entry.payload.shopping ?? FainanceWidgetPayload.sample.shopping!
    }

    private var visibleItems: [String] {
        let limit = family == .systemLarge ? 7 : family == .systemMedium ? 4 : 2
        return Array((data.items ?? []).prefix(limit))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(icon: "🛒", title: data.title ?? "Lista spesa")

            HStack(alignment: .firstTextBaseline) {
                Text(data.listName ?? "Lista")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                Spacer(minLength: 0)
                Text("\(data.remainingCount ?? 0)")
                    .font(.system(size: 26, weight: .heavy))
                    .foregroundColor(.white)
            }

            VStack(alignment: .leading, spacing: 5) {
                ForEach(visibleItems, id: \.self) { item in
                    HStack(spacing: 6) {
                        Circle().fill(Color.white.opacity(0.85)).frame(width: 5, height: 5)
                        Text(item)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.white.opacity(0.92))
                            .lineLimit(1)
                    }
                }
            }

            Spacer(minLength: 0)
            Text("\(data.completedCount ?? 0) completati")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.75))
        }
    }
}

private struct NoteWidgetView: View {
    let entry: FainanceEntry
    let family: WidgetFamily

    private var data: NoteWidgetData {
        entry.payload.note ?? FainanceWidgetPayload.sample.note!
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(icon: "✎", title: data.title ?? "Nota")
            Text(data.noteTitle ?? "Nota")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(2)
            Text(data.body ?? "")
                .font(.system(size: family == .systemSmall ? 12 : 13, weight: .medium))
                .foregroundColor(.white.opacity(0.86))
                .lineLimit(family == .systemLarge ? 8 : family == .systemMedium ? 4 : 3)
            Spacer(minLength: 0)
        }
    }
}

private struct GoalWidgetView: View {
    let entry: FainanceEntry
    let family: WidgetFamily

    private var data: GoalWidgetData {
        entry.payload.goal ?? FainanceWidgetPayload.sample.goal!
    }

    private var current: Double {
        data.currentAmount ?? 0
    }

    private var target: Double {
        max(data.targetAmount ?? 1, 1)
    }

    private var progress: Double {
        current / target
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            WidgetHeader(icon: "◎", title: data.title ?? "Obiettivo")
            Text(data.goalName ?? "Obiettivo")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
            ProgressBar(progress: progress)
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Risparmiato")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(.white.opacity(0.75))
                    Text(money(current, symbol: data.currencySymbol ?? entry.payload.currencySymbol))
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                Spacer(minLength: 0)
                Text("\(Int(min(max(progress, 0), 1) * 100))%")
                    .font(.system(size: 22, weight: .heavy))
                    .foregroundColor(.white)
            }
            if family != .systemSmall {
                Text("Target: \(money(target, symbol: data.currencySymbol ?? entry.payload.currencySymbol))")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.78))
            }
        }
    }
}

private struct ShareWidgetView: View {
    let entry: FainanceEntry
    let family: WidgetFamily

    private var data: ShareWidgetData {
        entry.payload.share ?? FainanceWidgetPayload.sample.share!
    }

    private var balance: Double {
        data.myBalance ?? 0
    }

    private var visiblePeople: String {
        let limit = family == .systemLarge ? 6 : 3
        return Array((data.participants ?? []).prefix(limit)).joined(separator: " · ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(icon: "⇄", title: data.title ?? "Share")
            Text(data.projectName ?? "Progetto")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
            StatPill(title: balance >= 0 ? "Ti devono" : "Devi", value: signedMoney(balance, symbol: data.currencySymbol ?? entry.payload.currencySymbol))
            if family != .systemSmall {
                Text(visiblePeople.isEmpty ? "Nessun partecipante" : visiblePeople)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.78))
                    .lineLimit(family == .systemLarge ? 2 : 1)
            }
            Spacer(minLength: 0)
        }
    }
}

private struct DebtsWidgetView: View {
    let entry: FainanceEntry
    let family: WidgetFamily

    private var data: DebtsWidgetData {
        entry.payload.debts ?? FainanceWidgetPayload.sample.debts!
    }

    private var debtTotal: Double {
        data.debtsTotal ?? 0
    }

    private var creditTotal: Double {
        data.creditsTotal ?? 0
    }

    private var balance: Double {
        creditTotal - debtTotal
    }

    private var visibleItems: [DebtCreditItem] {
        let limit = family == .systemLarge ? 5 : 2
        return Array((data.items ?? []).prefix(limit))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            WidgetHeader(icon: "≡", title: data.title ?? "Debiti")

            if family == .systemSmall {
                StatPill(title: "Saldo", value: signedMoney(balance, symbol: data.currencySymbol ?? entry.payload.currencySymbol))
                Spacer(minLength: 0)
                Text("Debiti \(money(debtTotal, symbol: data.currencySymbol ?? entry.payload.currencySymbol))")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.78))
                    .lineLimit(1)
            } else {
                HStack(spacing: 8) {
                    StatPill(title: "Debiti", value: money(debtTotal, symbol: data.currencySymbol ?? entry.payload.currencySymbol))
                    StatPill(title: "Crediti", value: money(creditTotal, symbol: data.currencySymbol ?? entry.payload.currencySymbol))
                    StatPill(title: "Saldo", value: signedMoney(balance, symbol: data.currencySymbol ?? entry.payload.currencySymbol))
                }

                VStack(alignment: .leading, spacing: 5) {
                    ForEach(visibleItems) { item in
                        HStack {
                            Text(item.name)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white.opacity(0.92))
                                .lineLimit(1)
                            Spacer(minLength: 0)
                            Text(money(item.amount, symbol: data.currencySymbol ?? entry.payload.currencySymbol))
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.white)
                                .lineLimit(1)
                        }
                    }
                }
            }
        }
    }
}

private extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&int)

        let a: UInt64
        let r: UInt64
        let g: UInt64
        let b: UInt64

        switch cleaned.count {
        case 3:
            a = 255
            r = (int >> 8) * 17
            g = ((int >> 4) & 0xF) * 17
            b = (int & 0xF) * 17
        case 6:
            a = 255
            r = int >> 16
            g = (int >> 8) & 0xFF
            b = int & 0xFF
        case 8:
            a = int >> 24
            r = (int >> 16) & 0xFF
            g = (int >> 8) & 0xFF
            b = int & 0xFF
        default:
            a = 255
            r = 49
            g = 92
            b = 255
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
