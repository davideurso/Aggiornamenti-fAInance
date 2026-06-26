import WidgetKit
import SwiftUI
import Foundation

private enum FainanceWidgetConfig {
    static let appGroupId = "group.it.fainanceapp.app"
    static let appScheme = "fainance"
}

private enum FainanceWidgetKind: String {
    case quickAdd = "FainanceQuickAddWidget"
    case fidelity = "FainanceFidelityWidget"
    case shopping = "FainanceShoppingWidget"
    case note = "FainanceNoteWidget"
    case goal = "FainanceGoalWidget"
    case share = "FainanceShareWidget"
    case debts = "FainanceDebtsWidget"

    var title: String {
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

    var subtitle: String {
        switch self {
        case .quickAdd: return "+ Spesa · + Entrata"
        case .fidelity: return "Apri carta fidelity"
        case .shopping: return "Controlla la lista"
        case .note: return "Promemoria rapido"
        case .goal: return "Avanzamento obiettivo"
        case .share: return "Saldo progetto"
        case .debts: return "Debiti · Crediti · Saldo"
        }
    }

    var icon: String {
        switch self {
        case .quickAdd: return "+"
        case .fidelity: return "◆"
        case .shopping: return "🛒"
        case .note: return "✎"
        case .goal: return "◎"
        case .share: return "⇄"
        case .debts: return "≡"
        }
    }

    var urlPath: String {
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

private struct FainanceWidgetEntry: TimelineEntry {
    let date: Date
    let kind: FainanceWidgetKind
}

private struct FainanceWidgetProvider: TimelineProvider {
    let kind: FainanceWidgetKind

    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date(), kind: kind)
    }

    func getSnapshot(in context: Context, completion: @escaping (FainanceWidgetEntry) -> Void) {
        completion(FainanceWidgetEntry(date: Date(), kind: kind))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FainanceWidgetEntry>) -> Void) {
        let entry = FainanceWidgetEntry(date: Date(), kind: kind)
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

@main
struct FainanceWidgetsBundle: WidgetBundle {
    var body: some Widget {
        FainanceSingleWidget(kind: .quickAdd)
        FainanceSingleWidget(kind: .fidelity)
        FainanceSingleWidget(kind: .shopping)
        FainanceSingleWidget(kind: .note)
        FainanceSingleWidget(kind: .goal)
        FainanceSingleWidget(kind: .share)
        FainanceSingleWidget(kind: .debts)
    }
}

private struct FainanceSingleWidget: Widget {
    let kind: FainanceWidgetKind

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind.rawValue, provider: FainanceWidgetProvider(kind: kind)) { entry in
            FainanceWidgetView(entry: entry)
        }
        .configurationDisplayName(kind.title)
        .description(kind.subtitle)
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

private struct FainanceWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceWidgetEntry

    var body: some View {
        ZStack {
            background
            content
                .padding(14)
        }
        .widgetURL(URL(string: "\(FainanceWidgetConfig.appScheme)://\(entry.kind.urlPath)"))
        .modifier(FainanceWidgetBackground(background: background))
    }

    private var background: LinearGradient {
        LinearGradient(
            colors: [Color(red: 0.19, green: 0.36, blue: 1.0), Color(red: 0.55, green: 0.30, blue: 1.0)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Text(entry.kind.icon)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 28, height: 28)
                    .background(Color.white.opacity(0.18))
                    .cornerRadius(8)

                Text(entry.kind.title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                Spacer(minLength: 0)
            }

            Spacer(minLength: 0)

            if family == .systemSmall {
                Text(entry.kind.subtitle)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(3)
            } else {
                HStack(spacing: 8) {
                    smallBox(title: primaryLabel, value: primaryValue)
                    smallBox(title: secondaryLabel, value: secondaryValue)
                }

                Text("Tocca per aprire fAInance")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.white.opacity(0.78))
                    .lineLimit(1)
            }
        }
    }

    private func smallBox(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.72))
                .lineLimit(1)
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
        .cornerRadius(12)
    }

    private var primaryLabel: String {
        switch entry.kind {
        case .quickAdd: return "Uscita"
        case .fidelity: return "Carta"
        case .shopping: return "Da comprare"
        case .note: return "Nota"
        case .goal: return "Obiettivo"
        case .share: return "Saldo"
        case .debts: return "Debiti"
        }
    }

    private var primaryValue: String {
        switch entry.kind {
        case .quickAdd: return "+ Spesa"
        case .fidelity: return "Fidelity"
        case .shopping: return "Lista"
        case .note: return "Promemoria"
        case .goal: return "0%"
        case .share: return "€ 0"
        case .debts: return "€ 0"
        }
    }

    private var secondaryLabel: String {
        switch entry.kind {
        case .quickAdd: return "Entrata"
        case .fidelity: return "Codice"
        case .shopping: return "Fatti"
        case .note: return "Apri"
        case .goal: return "Target"
        case .share: return "Persone"
        case .debts: return "Crediti"
        }
    }

    private var secondaryValue: String {
        switch entry.kind {
        case .quickAdd: return "+ Entrata"
        case .fidelity: return "Apri"
        case .shopping: return "0"
        case .note: return "App"
        case .goal: return "€ 0"
        case .share: return "0"
        case .debts: return "€ 0"
        }
    }
}

private struct FainanceWidgetBackground<Background: View>: ViewModifier {
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
