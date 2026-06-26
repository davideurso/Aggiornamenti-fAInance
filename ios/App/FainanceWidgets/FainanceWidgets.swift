import WidgetKit
import SwiftUI

struct FainanceWidgetEntry: TimelineEntry {
    let date: Date
}

struct FainanceWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (FainanceWidgetEntry) -> Void) {
        completion(FainanceWidgetEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FainanceWidgetEntry>) -> Void) {
        let entry = FainanceWidgetEntry(date: Date())
        completion(Timeline(entries: [entry], policy: .never))
    }
}

struct FainanceWidgetView: View {
    var entry: FainanceWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("fAInance")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.white)

            Text("Aggiunta rapida")
                .font(.subheadline)
                .foregroundColor(.white)

            Spacer()

            Text("Tocca per aprire")
                .font(.caption)
                .foregroundColor(.white)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.19, green: 0.36, blue: 1.0),
                    Color(red: 0.55, green: 0.30, blue: 1.0)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .widgetURL(URL(string: "fainance://quick-add"))
    }
}

@main
struct FainanceWidgets: Widget {
    let kind: String = "FainanceQuickAddWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceWidgetProvider()) { entry in
            FainanceWidgetView(entry: entry)
        }
        .configurationDisplayName("Aggiunta rapida")
        .description("Apri rapidamente fAInance")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
