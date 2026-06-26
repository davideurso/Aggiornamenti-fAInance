import WidgetKit
import SwiftUI

struct FainanceEntry: TimelineEntry {
    let date: Date
    let title: String
    let subtitle: String
    let icon: String
    let primaryLabel: String
    let primaryValue: String
    let secondaryLabel: String
    let secondaryValue: String
    let url: String
}

struct FainanceProvider: TimelineProvider {
    let entry: FainanceEntry

    func placeholder(in context: Context) -> FainanceEntry {
        entry
    }

    func getSnapshot(in context: Context, completion: @escaping (FainanceEntry) -> Void) {
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FainanceEntry>) -> Void) {
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

struct FainanceCardView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceEntry

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.18, green: 0.35, blue: 0.98),
                    Color(red: 0.54, green: 0.29, blue: 0.96)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Text(entry.icon)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(.white)
                        .frame(width: 28, height: 28)
                        .background(Color.white.opacity(0.18))
                        .cornerRadius(8)

                    Text(entry.title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    Spacer(minLength: 0)
                }

                Spacer(minLength: 0)

                if family == .systemSmall {
                    Text(entry.subtitle)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(3)
                        .minimumScaleFactor(0.75)
                } else {
                    HStack(spacing: 8) {
                        metricBox(label: entry.primaryLabel, value: entry.primaryValue)
                        metricBox(label: entry.secondaryLabel, value: entry.secondaryValue)
                    }

                    Text(entry.subtitle)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(.white.opacity(0.78))
                        .lineLimit(1)
                }
            }
            .padding(14)
        }
        .widgetURL(URL(string: entry.url))
    }

    private func metricBox(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
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
}

func makeEntry(
    title: String,
    subtitle: String,
    icon: String,
    primaryLabel: String,
    primaryValue: String,
    secondaryLabel: String,
    secondaryValue: String,
    path: String
) -> FainanceEntry {
    FainanceEntry(
        date: Date(),
        title: title,
        subtitle: subtitle,
        icon: icon,
        primaryLabel: primaryLabel,
        primaryValue: primaryValue,
        secondaryLabel: secondaryLabel,
        secondaryValue: secondaryValue,
        url: "fainance://\(path)"
    )
}

struct QuickAddWidget: Widget {
    let kind = "FainanceQuickAddWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceProvider(entry: makeEntry(title: "Aggiunta rapida", subtitle: "Registra subito una nuova entrata o uscita", icon: "+", primaryLabel: "Uscita", primaryValue: "+ Spesa", secondaryLabel: "Entrata", secondaryValue: "+ Entrata", path: "quick-add"))) { entry in
            FainanceCardView(entry: entry)
        }
        .configurationDisplayName("Aggiunta rapida")
        .description("Registra rapidamente entrate e uscite")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct FidelityWidget: Widget {
    let kind = "FainanceFidelityWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceProvider(entry: makeEntry(title: "Fidelity", subtitle: "Apri rapidamente le tue carte", icon: "◆", primaryLabel: "Carta", primaryValue: "Fidelity", secondaryLabel: "Codice", secondaryValue: "Apri", path: "fidelity"))) { entry in
            FainanceCardView(entry: entry)
        }
        .configurationDisplayName("Fidelity")
        .description("Apri rapidamente le carte fidelity")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ShoppingWidget: Widget {
    let kind = "FainanceShoppingWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceProvider(entry: makeEntry(title: "Lista spesa", subtitle: "Controlla la lista della spesa", icon: "🛒", primaryLabel: "Lista", primaryValue: "Spesa", secondaryLabel: "Fatti", secondaryValue: "0", path: "shopping-list"))) { entry in
            FainanceCardView(entry: entry)
        }
        .configurationDisplayName("Lista spesa")
        .description("Controlla rapidamente la lista della spesa")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct NoteWidget: Widget {
    let kind = "FainanceNoteWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceProvider(entry: makeEntry(title: "Nota", subtitle: "Apri i tuoi appunti", icon: "✎", primaryLabel: "Nota", primaryValue: "Promemoria", secondaryLabel: "Apri", secondaryValue: "App", path: "note"))) { entry in
            FainanceCardView(entry: entry)
        }
        .configurationDisplayName("Nota")
        .description("Apri rapidamente una nota")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct GoalWidget: Widget {
    let kind = "FainanceGoalWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceProvider(entry: makeEntry(title: "Obiettivo", subtitle: "Monitora il tuo obiettivo", icon: "◎", primaryLabel: "Avanzamento", primaryValue: "0%", secondaryLabel: "Target", secondaryValue: "€ 0", path: "goal"))) { entry in
            FainanceCardView(entry: entry)
        }
        .configurationDisplayName("Obiettivo")
        .description("Monitora rapidamente un obiettivo")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ShareWidget: Widget {
    let kind = "FainanceShareWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceProvider(entry: makeEntry(title: "Share", subtitle: "Controlla il saldo condiviso", icon: "⇄", primaryLabel: "Saldo", primaryValue: "€ 0", secondaryLabel: "Persone", secondaryValue: "0", path: "share"))) { entry in
            FainanceCardView(entry: entry)
        }
        .configurationDisplayName("Share")
        .description("Controlla rapidamente i progetti Share")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct DebtsWidget: Widget {
    let kind = "FainanceDebtsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceProvider(entry: makeEntry(title: "Debiti", subtitle: "Debiti · Crediti · Saldo", icon: "≡", primaryLabel: "Debiti", primaryValue: "€ 0", secondaryLabel: "Crediti", secondaryValue: "€ 0", path: "debts"))) { entry in
            FainanceCardView(entry: entry)
        }
        .configurationDisplayName("Debiti")
        .description("Controlla rapidamente debiti e crediti")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct FainanceWidgets: WidgetBundle {
    var body: some Widget {
        QuickAddWidget()
        FidelityWidget()
        ShoppingWidget()
        NoteWidget()
        GoalWidget()
        ShareWidget()
        DebtsWidget()
    }
}
