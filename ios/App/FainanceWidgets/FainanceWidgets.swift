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


    static func noteData(selectionId: String?) -> [String: Any] {
        var data = dictionary(forKey: FainanceWidgetKind.note.settingsKey)
        guard let selectionId, !selectionId.isEmpty else { return data }
        let parts = selectionId.split(separator: "|", maxSplits: 1).map(String.init)
        guard parts.count == 2 else { return data }
        let type = parts[0]
        let id = parts[1]
        let key: String
        switch type {
        case "bank": key = "bankItems"
        case "creditCard": key = "creditCardItems"
        default: key = "noteItems"
        }
        guard let item = dictionaries(in: data, key: key).first(where: { WidgetValue.string($0, "id") == id }) else { return data }
        data["type"] = type
        data["title"] = WidgetValue.string(item, "title", WidgetText.text("Nota"))
        data["body"] = WidgetValue.string(item, "body", WidgetText.text("Apri fAInance per configurarlo"))
        data["selectedNoteId"] = type == "note" ? id : ""
        data["selectedBankId"] = type == "bank" ? id : ""
        data["selectedCreditCardId"] = type == "creditCard" ? id : ""
        data["selectionId"] = selectionId
        return data
    }

    static func goalData(selectionId: String?) -> [String: Any] {
        var data = dictionary(forKey: FainanceWidgetKind.goal.settingsKey)
        guard let selectionId, !selectionId.isEmpty,
              let item = dictionaries(in: data, key: "goalItems").first(where: { WidgetValue.string($0, "id") == selectionId }) else {
            return data
        }
        for (key, value) in item { data[key] = value }
        data["selectedGoalId"] = selectionId
        return data
    }

    static func shoppingListData(selectionId: String?) -> [String: Any] {
        var data = dictionary(forKey: FainanceWidgetKind.shoppingList.settingsKey)
        let resolvedId = {
            if let selectionId, !selectionId.isEmpty { return selectionId }
            return WidgetValue.string(data, "selectedListId", "main")
        }()
        guard !resolvedId.isEmpty else { return data }
        let lists = dictionaries(in: data, key: "lists")
        let list = lists.first(where: { WidgetValue.string($0, "id") == resolvedId })
        let maxItems = max(1, WidgetValue.int(data, "maxItems", 8))
        let items = dictionaries(in: data, key: "allItems")
            .filter { WidgetValue.string($0, "listId", "main") == resolvedId }
            .sorted {
                let leftBought = WidgetValue.bool($0, "bought")
                let rightBought = WidgetValue.bool($1, "bought")
                if leftBought != rightBought { return !leftBought }
                return WidgetValue.string($0, "name").localizedCaseInsensitiveCompare(WidgetValue.string($1, "name")) == .orderedAscending
            }
        data["selectedListId"] = resolvedId
        data["selectedListTitle"] = list.map { WidgetValue.string($0, "title", WidgetText.text("Lista spesa")) } ?? WidgetText.text("Lista spesa")
        data["items"] = Array(items.prefix(max(60, maxItems)))
        return data
    }

    static func fidelityData(selectionId: String?) -> [String: Any] {
        var data = dictionary(forKey: FainanceWidgetKind.fidelity.settingsKey)
        guard let selectionId, !selectionId.isEmpty,
              let card = dictionaries(in: data, key: "cards").first(where: { WidgetValue.string($0, "id") == selectionId }) else {
            return data
        }
        data["selectedCardId"] = selectionId
        data["selectedCard"] = card
        return data
    }

    static func debtCreditsData(selectionIds: [String]) -> [String: Any] {
        var data = dictionary(forKey: FainanceWidgetKind.debtCredits.settingsKey)
        guard !selectionIds.isEmpty else { return data }
        let selected = dictionaries(in: data, key: "allItems").filter { selectionIds.contains(WidgetValue.string($0, "id")) }
        data["selectedIds"] = selectionIds
        data["items"] = selected
        return data
    }

    static func shareData(selectionId: String?) -> [String: Any] {
        var data = dictionary(forKey: FainanceWidgetKind.share.settingsKey)
        guard let selectionId, !selectionId.isEmpty,
              let project = dictionaries(in: data, key: "projectItems").first(where: {
                  WidgetValue.string($0, "projectId", WidgetValue.string($0, "id")) == selectionId
              }) else {
            return data
        }
        for (key, value) in project { data[key] = value }
        data["projectId"] = selectionId
        data["projectName"] = WidgetValue.string(project, "projectName", WidgetValue.string(project, "name", "Progetto Share"))
        return data
    }

    static func dictionaries(in data: [String: Any], key: String) -> [[String: Any]] {
        data[key] as? [[String: Any]] ?? (data[key] as? [Any])?.compactMap { $0 as? [String: Any] } ?? []
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


#if canImport(AppIntents)
@available(iOSApplicationExtension 17.0, *)
struct NoteContentEntity: AppEntity, Hashable {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Nota, coordinata o carta")
    static var defaultQuery = NoteContentQuery()

    let id: String
    let title: String
    let category: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(category)")
    }
}

@available(iOSApplicationExtension 17.0, *)
struct NoteContentQuery: EntityQuery {
    func entities(for identifiers: [NoteContentEntity.ID]) async throws -> [NoteContentEntity] {
        allEntities().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [NoteContentEntity] {
        allEntities()
    }

    private func allEntities() -> [NoteContentEntity] {
        let data = WidgetStore.dictionary(forKey: FainanceWidgetKind.note.settingsKey)
        var result: [NoteContentEntity] = []
        result += WidgetStore.dictionaries(in: data, key: "noteItems").map {
            NoteContentEntity(id: "note|\(WidgetValue.string($0, "id"))", title: WidgetValue.string($0, "title", WidgetText.text("Nota")), category: WidgetText.text("Nota"))
        }
        result += WidgetStore.dictionaries(in: data, key: "bankItems").map {
            NoteContentEntity(id: "bank|\(WidgetValue.string($0, "id"))", title: WidgetValue.string($0, "title", "Coordinata bancaria"), category: "Coordinata bancaria")
        }
        result += WidgetStore.dictionaries(in: data, key: "creditCardItems").map {
            NoteContentEntity(id: "creditCard|\(WidgetValue.string($0, "id"))", title: WidgetValue.string($0, "title", "Carta di credito"), category: "Carta di credito")
        }
        return result.filter { !$0.id.hasSuffix("|") }
    }
}

@available(iOSApplicationExtension 17.0, *)
struct GoalEntity: AppEntity, Hashable {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Obiettivo")
    static var defaultQuery = GoalEntityQuery()

    let id: String
    let title: String
    let detail: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(detail)")
    }
}

@available(iOSApplicationExtension 17.0, *)
struct GoalEntityQuery: EntityQuery {
    func entities(for identifiers: [GoalEntity.ID]) async throws -> [GoalEntity] {
        allEntities().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [GoalEntity] {
        allEntities()
    }

    private func allEntities() -> [GoalEntity] {
        let data = WidgetStore.dictionary(forKey: FainanceWidgetKind.goal.settingsKey)
        return WidgetStore.dictionaries(in: data, key: "goalItems").compactMap {
            let id = WidgetValue.string($0, "id")
            guard !id.isEmpty else { return nil }
            let title = WidgetValue.string($0, "title", "Obiettivo")
            let percent = WidgetValue.int($0, "percent")
            return GoalEntity(id: id, title: title, detail: "\(percent)%")
        }
    }
}

@available(iOSApplicationExtension 17.0, *)
struct ShoppingListEntity: AppEntity, Hashable {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Lista della spesa")
    static var defaultQuery = ShoppingListEntityQuery()

    let id: String
    let title: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)")
    }
}

@available(iOSApplicationExtension 17.0, *)
struct ShoppingListEntityQuery: EntityQuery {
    func entities(for identifiers: [ShoppingListEntity.ID]) async throws -> [ShoppingListEntity] {
        allEntities().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [ShoppingListEntity] {
        allEntities()
    }

    private func allEntities() -> [ShoppingListEntity] {
        let data = WidgetStore.dictionary(forKey: FainanceWidgetKind.shoppingList.settingsKey)
        return WidgetStore.dictionaries(in: data, key: "lists").compactMap {
            let id = WidgetValue.string($0, "id")
            guard !id.isEmpty else { return nil }
            return ShoppingListEntity(id: id, title: WidgetValue.string($0, "title", WidgetText.text("Lista spesa")))
        }
    }
}

@available(iOSApplicationExtension 17.0, *)
struct FidelityCardEntity: AppEntity, Hashable {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Fidelity card")
    static var defaultQuery = FidelityCardEntityQuery()

    let id: String
    let title: String
    let detail: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(detail)")
    }
}

@available(iOSApplicationExtension 17.0, *)
struct FidelityCardEntityQuery: EntityQuery {
    func entities(for identifiers: [FidelityCardEntity.ID]) async throws -> [FidelityCardEntity] {
        allEntities().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [FidelityCardEntity] {
        allEntities()
    }

    private func allEntities() -> [FidelityCardEntity] {
        let data = WidgetStore.dictionary(forKey: FainanceWidgetKind.fidelity.settingsKey)
        return WidgetStore.dictionaries(in: data, key: "cards").compactMap {
            let id = WidgetValue.string($0, "id")
            guard !id.isEmpty else { return nil }
            let code = WidgetValue.string($0, "code")
            let suffix = code.count > 4 ? String(code.suffix(4)) : code
            return FidelityCardEntity(id: id, title: WidgetValue.string($0, "name", "Fidelity card"), detail: suffix.isEmpty ? "Fidelity card" : "•••• \(suffix)")
        }
    }
}

@available(iOSApplicationExtension 17.0, *)
struct DebtCreditEntity: AppEntity, Hashable {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Debito o credito")
    static var defaultQuery = DebtCreditEntityQuery()

    let id: String
    let title: String
    let detail: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(detail)")
    }
}

@available(iOSApplicationExtension 17.0, *)
struct DebtCreditEntityQuery: EntityQuery {
    func entities(for identifiers: [DebtCreditEntity.ID]) async throws -> [DebtCreditEntity] {
        allEntities().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [DebtCreditEntity] {
        allEntities()
    }

    private func allEntities() -> [DebtCreditEntity] {
        let data = WidgetStore.dictionary(forKey: FainanceWidgetKind.debtCredits.settingsKey)
        let currency = WidgetValue.string(data, "currency", "€")
        return WidgetStore.dictionaries(in: data, key: "allItems").compactMap {
            let id = WidgetValue.string($0, "id")
            guard !id.isEmpty else { return nil }
            let kind = WidgetValue.string($0, "kind", "debt") == "credit" ? WidgetText.text("Ti devono") : WidgetText.text("Devi")
            let detail = "\(kind): \(money(WidgetValue.double($0, "balance"), currency: currency))"
            return DebtCreditEntity(id: id, title: WidgetValue.string($0, "holder", "—"), detail: detail)
        }
    }
}

@available(iOSApplicationExtension 17.0, *)
struct ShareProjectEntity: AppEntity, Hashable {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Progetto Share")
    static var defaultQuery = ShareProjectEntityQuery()

    let id: String
    let title: String
    let detail: String

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(title)", subtitle: "\(detail)")
    }
}

@available(iOSApplicationExtension 17.0, *)
struct ShareProjectEntityQuery: EntityQuery {
    func entities(for identifiers: [ShareProjectEntity.ID]) async throws -> [ShareProjectEntity] {
        allEntities().filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [ShareProjectEntity] {
        allEntities()
    }

    private func allEntities() -> [ShareProjectEntity] {
        let data = WidgetStore.dictionary(forKey: FainanceWidgetKind.share.settingsKey)
        let currency = WidgetValue.string(data, "currency", "€")
        return WidgetStore.dictionaries(in: data, key: "projectItems").compactMap {
            let id = WidgetValue.string($0, "projectId", WidgetValue.string($0, "id"))
            guard !id.isEmpty else { return nil }
            let title = WidgetValue.string($0, "projectName", WidgetValue.string($0, "name", "Progetto Share"))
            let detail = "\(WidgetText.text("Saldo")): \(money(WidgetValue.double($0, "netAmount"), currency: currency))"
            return ShareProjectEntity(id: id, title: title, detail: detail)
        }
    }
}

@available(iOSApplicationExtension 17.0, *)
struct NoteWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Nota / Dati"
    static var description = IntentDescription("Scegli la nota, la coordinata bancaria o la carta di credito da mostrare.")

    @Parameter(title: "Contenuto")
    var content: NoteContentEntity?
}

@available(iOSApplicationExtension 17.0, *)
struct GoalWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Obiettivo"
    static var description = IntentDescription("Scegli l’obiettivo da mostrare.")

    @Parameter(title: "Obiettivo")
    var goal: GoalEntity?
}

@available(iOSApplicationExtension 17.0, *)
struct ShoppingListWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Lista della spesa"
    static var description = IntentDescription("Scegli la lista della spesa da mostrare.")

    @Parameter(title: "Lista")
    var list: ShoppingListEntity?
}

@available(iOSApplicationExtension 17.0, *)
struct FidelityWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Fidelity card"
    static var description = IntentDescription("Scegli la carta da mostrare.")

    @Parameter(title: "Carta")
    var card: FidelityCardEntity?
}

@available(iOSApplicationExtension 17.0, *)
struct DebtCreditsWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Debiti / Crediti"
    static var description = IntentDescription("Scegli uno o più debiti e crediti da mostrare.")

    @Parameter(title: "Posizioni")
    var positions: [DebtCreditEntity]

    init() {
        positions = []
    }
}

@available(iOSApplicationExtension 17.0, *)
struct ShareWidgetConfigurationIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Share"
    static var description = IntentDescription("Scegli il progetto Share da mostrare.")

    @Parameter(title: "Progetto")
    var project: ShareProjectEntity?
}

@available(iOSApplicationExtension 17.0, *)
private struct NoteAppIntentProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date(), kind: .note, data: WidgetStore.previewData(for: .note), allowed: true)
    }

    func snapshot(for configuration: NoteWidgetConfigurationIntent, in context: Context) async -> FainanceWidgetEntry {
        let data = context.isPreview ? WidgetStore.previewData(for: .note) : WidgetStore.noteData(selectionId: configuration.content?.id)
        return FainanceWidgetEntry(date: Date(), kind: .note, data: data, allowed: WidgetStore.isAllowed(FainanceWidgetKind.note.typeKey))
    }

    func timeline(for configuration: NoteWidgetConfigurationIntent, in context: Context) async -> Timeline<FainanceWidgetEntry> {
        let entry = FainanceWidgetEntry(date: Date(), kind: .note, data: WidgetStore.noteData(selectionId: configuration.content?.id), allowed: WidgetStore.isAllowed(FainanceWidgetKind.note.typeKey))
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
    }
}

@available(iOSApplicationExtension 17.0, *)
private struct GoalAppIntentProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date(), kind: .goal, data: WidgetStore.previewData(for: .goal), allowed: true)
    }

    func snapshot(for configuration: GoalWidgetConfigurationIntent, in context: Context) async -> FainanceWidgetEntry {
        let data = context.isPreview ? WidgetStore.previewData(for: .goal) : WidgetStore.goalData(selectionId: configuration.goal?.id)
        return FainanceWidgetEntry(date: Date(), kind: .goal, data: data, allowed: WidgetStore.isAllowed(FainanceWidgetKind.goal.typeKey))
    }

    func timeline(for configuration: GoalWidgetConfigurationIntent, in context: Context) async -> Timeline<FainanceWidgetEntry> {
        let entry = FainanceWidgetEntry(date: Date(), kind: .goal, data: WidgetStore.goalData(selectionId: configuration.goal?.id), allowed: WidgetStore.isAllowed(FainanceWidgetKind.goal.typeKey))
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
    }
}

@available(iOSApplicationExtension 17.0, *)
private struct ShoppingListAppIntentProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date(), kind: .shoppingList, data: WidgetStore.previewData(for: .shoppingList), allowed: true)
    }

    func snapshot(for configuration: ShoppingListWidgetConfigurationIntent, in context: Context) async -> FainanceWidgetEntry {
        let data = context.isPreview ? WidgetStore.previewData(for: .shoppingList) : WidgetStore.shoppingListData(selectionId: configuration.list?.id)
        return FainanceWidgetEntry(date: Date(), kind: .shoppingList, data: data, allowed: WidgetStore.isAllowed(FainanceWidgetKind.shoppingList.typeKey))
    }

    func timeline(for configuration: ShoppingListWidgetConfigurationIntent, in context: Context) async -> Timeline<FainanceWidgetEntry> {
        let entry = FainanceWidgetEntry(date: Date(), kind: .shoppingList, data: WidgetStore.shoppingListData(selectionId: configuration.list?.id), allowed: WidgetStore.isAllowed(FainanceWidgetKind.shoppingList.typeKey))
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
    }
}

@available(iOSApplicationExtension 17.0, *)
private struct FidelityAppIntentProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date(), kind: .fidelity, data: WidgetStore.previewData(for: .fidelity), allowed: true)
    }

    func snapshot(for configuration: FidelityWidgetConfigurationIntent, in context: Context) async -> FainanceWidgetEntry {
        let data = context.isPreview ? WidgetStore.previewData(for: .fidelity) : WidgetStore.fidelityData(selectionId: configuration.card?.id)
        return FainanceWidgetEntry(date: Date(), kind: .fidelity, data: data, allowed: WidgetStore.isAllowed(FainanceWidgetKind.fidelity.typeKey))
    }

    func timeline(for configuration: FidelityWidgetConfigurationIntent, in context: Context) async -> Timeline<FainanceWidgetEntry> {
        let entry = FainanceWidgetEntry(date: Date(), kind: .fidelity, data: WidgetStore.fidelityData(selectionId: configuration.card?.id), allowed: WidgetStore.isAllowed(FainanceWidgetKind.fidelity.typeKey))
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
    }
}

@available(iOSApplicationExtension 17.0, *)
private struct DebtCreditsAppIntentProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date(), kind: .debtCredits, data: WidgetStore.previewData(for: .debtCredits), allowed: true)
    }

    func snapshot(for configuration: DebtCreditsWidgetConfigurationIntent, in context: Context) async -> FainanceWidgetEntry {
        let ids = configuration.positions.map(\.id)
        let data = context.isPreview ? WidgetStore.previewData(for: .debtCredits) : WidgetStore.debtCreditsData(selectionIds: ids)
        return FainanceWidgetEntry(date: Date(), kind: .debtCredits, data: data, allowed: WidgetStore.isAllowed(FainanceWidgetKind.debtCredits.typeKey))
    }

    func timeline(for configuration: DebtCreditsWidgetConfigurationIntent, in context: Context) async -> Timeline<FainanceWidgetEntry> {
        let ids = configuration.positions.map(\.id)
        let entry = FainanceWidgetEntry(date: Date(), kind: .debtCredits, data: WidgetStore.debtCreditsData(selectionIds: ids), allowed: WidgetStore.isAllowed(FainanceWidgetKind.debtCredits.typeKey))
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
    }
}

@available(iOSApplicationExtension 17.0, *)
private struct ShareAppIntentProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> FainanceWidgetEntry {
        FainanceWidgetEntry(date: Date(), kind: .share, data: WidgetStore.previewData(for: .share), allowed: true)
    }

    func snapshot(for configuration: ShareWidgetConfigurationIntent, in context: Context) async -> FainanceWidgetEntry {
        let data = context.isPreview ? WidgetStore.previewData(for: .share) : WidgetStore.shareData(selectionId: configuration.project?.id)
        return FainanceWidgetEntry(date: Date(), kind: .share, data: data, allowed: WidgetStore.isAllowed(FainanceWidgetKind.share.typeKey))
    }

    func timeline(for configuration: ShareWidgetConfigurationIntent, in context: Context) async -> Timeline<FainanceWidgetEntry> {
        let entry = FainanceWidgetEntry(date: Date(), kind: .share, data: WidgetStore.shareData(selectionId: configuration.project?.id), allowed: WidgetStore.isAllowed(FainanceWidgetKind.share.typeKey))
        return Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
    }
}
#endif

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

    @ViewBuilder
    func fainanceWidgetURL(for family: WidgetFamily, route: String) -> some View {
        if family == .systemSmall {
            self.widgetURL(fainanceURL(route))
        } else {
            self
        }
    }

}

private func fainanceURL(_ value: String) -> URL {
    URL(string: value) ?? URL(string: "fainance://widget-settings")!
}

/// Use Link for every interaction whose purpose is opening fAInance.
/// Button(intent:) is reserved for actions that update widget data in place.
private struct RouteAction<Content: View>: View {
    let route: String
    private let content: () -> Content

    init(_ route: String, @ViewBuilder content: @escaping () -> Content) {
        self.route = route
        self.content = content
    }

    var body: some View {
        Link(destination: fainanceURL(route)) {
            content()
        }
    }
}

private struct WidgetSettingsButton: View {
    let widgetType: String
    let foregroundColor: Color
    var compact = false

    var body: some View {
        Link(destination: fainanceURL("fainance://widget-settings?widget=\(widgetType)")) {
            settingsIcon
        }
    }

    private var settingsIcon: some View {
        Image(systemName: "gearshape.fill")
            .font(.system(size: compact ? 11 : 13, weight: .bold))
            .foregroundColor(foregroundColor)
            .frame(width: compact ? 25 : 29, height: compact ? 25 : 29)
            .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .contentShape(Rectangle())
            .accessibilityLabel("Scegli contenuto widget")
    }
}

private struct StaticSettingsIcon: View {
    let foregroundColor: Color
    var compact = false

    var body: some View {
        Image(systemName: "gearshape.fill")
            .font(.system(size: compact ? 11 : 13, weight: .bold))
            .foregroundColor(foregroundColor)
            .frame(width: compact ? 25 : 29, height: compact ? 25 : 29)
            .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .accessibilityLabel("Scegli contenuto widget")
    }
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
    @Environment(\.widgetFamily) private var family
    let title: String
    let subtitle: String?
    let titleColor: Color
    let bodyColor: Color
    var settingsURL: String = "fainance://widget-settings"
    var settingsWidgetType: String? = nil
    var showSettingsButton = true
    var showStaticSettingsIcon = false

    var body: some View {
        HStack(spacing: family == .systemSmall ? 5 : 7) {
            if family != .systemSmall {
                Image("logo_fainance")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 29, height: 29)
            }
            VStack(alignment: .leading, spacing: 0) {
                Text(title)
                    .font(.system(size: family == .systemSmall ? 11.5 : 13, weight: .bold))
                    .foregroundColor(titleColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
                if let subtitle, !subtitle.isEmpty, family != .systemSmall {
                    Text(subtitle)
                        .font(.system(size: 9.5, weight: .medium))
                        .foregroundColor(bodyColor)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 1)
            if showSettingsButton {
                if let settingsWidgetType, !settingsWidgetType.isEmpty {
                    WidgetSettingsButton(
                        widgetType: settingsWidgetType,
                        foregroundColor: titleColor,
                        compact: family == .systemSmall
                    )
                } else {
                    RouteAction(settingsURL) {
                        settingsIcon
                    }
                }
            } else if showStaticSettingsIcon {
                settingsIcon
            }
        }
    }

    private var settingsIcon: some View {
        Image(systemName: "gearshape.fill")
            .font(.system(size: family == .systemSmall ? 11 : 13, weight: .bold))
            .foregroundColor(titleColor)
            .frame(width: family == .systemSmall ? 25 : 29, height: family == .systemSmall ? 25 : 29)
            .background(Color.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct LockedWidgetView: View {
    let type: String
    let icon: String

    var body: some View {
        VStack(spacing: 7) {
            HStack {
                Text("fAInance")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundColor(.white)
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
        .fainanceContainerBackground(Color(hex: "#1E1E30"))
        .widgetURL(fainanceURL("fainance://open-plan-info"))
    }
}

private struct ActionTile: View {
    let url: String
    let icon: String
    let label: String
    let color: Color
    var vertical = false

    var body: some View {
        RouteAction(url) {
            Group {
                if vertical {
                    VStack(spacing: 1) {
                        Text(icon).font(.system(size: 20, weight: .bold))
                        Text(label).font(.system(size: 10, weight: .bold)).lineLimit(1).minimumScaleFactor(0.7)
                    }
                } else {
                    HStack(spacing: 6) {
                        Text(icon).font(.system(size: 20, weight: .bold))
                        Text(label).font(.system(size: 12, weight: .bold)).lineLimit(1).minimumScaleFactor(0.72)
                    }
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(color, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
        }
    }
}

private struct StaticActionTile: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(icon).font(.system(size: 20, weight: .bold))
            Text(label).font(.system(size: 10, weight: .bold)).lineLimit(1)
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(color, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
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

        ZStack {
            FainanceBackground(hex: background, transparency: transparency)
            if family == .systemSmall {
                VStack(spacing: 6) {
                    HStack {
                        Text("fAInance")
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundColor(.white)
                        Spacer(minLength: 2)
                    }
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 6), GridItem(.flexible(), spacing: 6)], spacing: 6) {
                        ActionTile(url: "fainance://add-expense", icon: "−", label: expense, color: expenseColor, vertical: true)
                        ActionTile(url: "fainance://add-income", icon: "+", label: income, color: incomeColor, vertical: true)
                        ActionTile(url: "fainance://open-receipt-camera", icon: "📷", label: WidgetText.text("Scontrino"), color: Color(hex: "#F29F3D"), vertical: true)
                        ActionTile(url: "fainance://open-ai-assistant?source=ios-widget&autostart=1", icon: "🎙", label: WidgetText.text("Voce"), color: Color(hex: "#7F77DD"), vertical: true)
                    }
                }
                .padding(9)
            } else {
                VStack(spacing: 7) {
                    if WidgetValue.bool(data, "showHeader", true) {
                        WidgetHeader(title: title, subtitle: subtitle, titleColor: .white, bodyColor: Color.white.opacity(0.75), settingsURL: "fainance://widget-settings?widget=quick", settingsWidgetType: "quick")
                    }
                    HStack(spacing: 8) {
                        ActionTile(url: "fainance://add-expense", icon: "−", label: expense, color: expenseColor)
                        ActionTile(url: "fainance://add-income", icon: "+", label: income, color: incomeColor)
                    }
                    HStack(spacing: 8) {
                        ActionTile(url: "fainance://open-receipt-camera", icon: "📷", label: WidgetText.text("Scontrino"), color: Color(hex: "#F29F3D"))
                        ActionTile(url: "fainance://open-ai-assistant?source=ios-widget&autostart=1", icon: "🎙", label: WidgetText.text("Voce"), color: Color(hex: "#7F77DD"))
                    }
                }
                .padding(10)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()
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
                VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 8) {
                    WidgetHeader(
                        title: title,
                        subtitle: nil,
                        titleColor: titleColor,
                        bodyColor: bodyColor,
                        settingsURL: "fainance://widget-settings?widget=note",
                        settingsWidgetType: "note",
                        showSettingsButton: family != .systemSmall,
                        showStaticSettingsIcon: family == .systemSmall
                    )
                    Text(body)
                        .font(.system(size: CGFloat(max(10, min(family == .systemSmall ? 15 : 18, WidgetValue.int(data, "textSize", 14)))), weight: .medium))
                        .foregroundColor(bodyColor)
                        .lineLimit(family == .systemSmall ? 5 : 8)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                        .padding(family == .systemSmall ? 7 : 9)
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .padding(family == .systemSmall ? 9 : 11)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .unredacted()
            .fainanceContainerBackground(Color(hex: background))
            .widgetURL(fainanceURL(family == .systemSmall ? "fainance://widget-settings?widget=note" : "fainance://open-appunti"))
        }
    }
}

private struct GoalWidgetView: View {
    @Environment(\.widgetFamily) private var family
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
                VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 9) {
                    HStack(spacing: 6) {
                        Text(icon).font(.system(size: family == .systemSmall ? 19 : 23))
                        Text(title)
                            .font(.system(size: family == .systemSmall ? 12 : 14, weight: .bold))
                            .foregroundColor(textColor)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                        Spacer(minLength: 1)
                    }
                    goalContent(percent: percent, saved: saved, target: target, currency: currency, accent: accent, textColor: textColor, percentColor: percentColor, data: data)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                }
                .padding(family == .systemSmall ? 10 : 11)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .unredacted()
            .fainanceContainerBackground(Color(hex: "#1E1E30"))
            .widgetURL(fainanceURL(goalURL(data: data)))
        }
    }

    private func goalURL(data: [String: Any]) -> String {
        let goalId = WidgetValue.string(data, "selectedGoalId", WidgetValue.string(data, "id"))
        guard !goalId.isEmpty else { return "fainance://open-goals" }
        let encoded = goalId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return "fainance://open-goal?goalId=\(encoded)"
    }

    private func goalContent(
        percent: Int,
        saved: Double,
        target: Double,
        currency: String,
        accent: Color,
        textColor: Color,
        percentColor: Color,
        data: [String: Any]
    ) -> some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 6 : 9) {
            if WidgetValue.bool(data, "showPercent", true) {
                Text("\(percent)%")
                    .font(.system(size: family == .systemSmall ? 22 : 25, weight: .heavy))
                    .foregroundColor(percentColor)
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.14))
                    Capsule().fill(accent).frame(width: proxy.size.width * CGFloat(percent) / 100)
                }
            }
            .frame(height: family == .systemSmall ? 8 : 9)
            if WidgetValue.bool(data, "showAmounts", true) {
                Text("\(money(saved, currency: currency)) / \(money(target, currency: currency))")
                    .font(.system(size: family == .systemSmall ? 9.5 : 11, weight: .semibold))
                    .foregroundColor(textColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.68)
            }
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
        let isQR = codeType.lowercased().contains("qr")
        let accent = WidgetValue.string(data, "accentColor", WidgetValue.string(card, "color", "#0F9F76"))
        let titleColor = Color(hex: WidgetValue.string(data, "titleColor", "#FFFFFF"))
        let transparency = WidgetValue.int(data, "bgAlpha", 65)

        ZStack {
            FainanceBackground(hex: accent, transparency: transparency)
            VStack(spacing: family == .systemSmall ? 3 : 4) {
                HStack(spacing: 5) {
                    Text(cardName)
                        .font(.system(size: family == .systemSmall ? 11.5 : 13, weight: .bold))
                        .foregroundColor(titleColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                    Spacer(minLength: 1)
                }

                if code.isEmpty {
                    Text(WidgetText.text("Apri fAInance per configurarlo"))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(titleColor)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let image = BarcodeRenderer.image(code: code, type: codeType) {
                    barcodeView(image: image, isQR: isQR)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .padding(family == .systemSmall ? 3 : 5)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()
        .fainanceContainerBackground(Color(hex: accent))
        .widgetURL(fainanceURL(
            cardId.isEmpty
                ? "fainance://open-shopping"
                : "fainance://open-fidelity-card?cardId=\(cardId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        ))
    }

    private func barcodeView(image: UIImage, isQR: Bool) -> some View {
        GeometryReader { proxy in
            ZStack {
                RoundedRectangle(cornerRadius: family == .systemSmall ? 7 : 9, style: .continuous)
                    .fill(Color.white)
                Image(uiImage: image)
                    .resizable()
                    
                    .interpolation(.none)
                    .aspectRatio(contentMode: isQR ? .fit : .fill)
                    .frame(
                        width: max(1, proxy.size.width - (isQR ? 6 : 2)),
                        height: max(1, proxy.size.height - (isQR ? 6 : 2))
                    )
                    .clipped()
            }
        }
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
            output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 3.0, y: 10.0))
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
        let items = WidgetValue.dictionaries(data, "items")
        let accent = WidgetValue.string(data, "accentColor", "#EF9F27")
        let titleColor = Color(hex: WidgetValue.string(data, "titleColor", "#FFFFFF"))
        let textColor = Color(hex: WidgetValue.string(data, "textColor", "#EDEDF7"))
        let iconColor = Color(hex: WidgetValue.string(data, "iconColor", accent))
        let transparency = WidgetValue.int(data, "bgAlpha", 65)
        let maxRows = family == .systemLarge ? 11 : (family == .systemMedium ? 5 : 4)
        let visibleItems = Array(items.prefix(maxRows))
        let hiddenCount = max(0, items.count - visibleItems.count)

        ZStack {
            FainanceBackground(hex: "#1E1E30", transparency: transparency)
            VStack(alignment: .leading, spacing: 4) {
                WidgetHeader(
                    title: title,
                    subtitle: nil,
                    titleColor: titleColor,
                    bodyColor: textColor,
                    settingsURL: "fainance://widget-settings?widget=shoppingList",
                    settingsWidgetType: "shoppingList",
                    showSettingsButton: family != .systemSmall,
                    showStaticSettingsIcon: family == .systemSmall
                )

                if items.isEmpty {
                    Text(WidgetValue.string(data, "emptyText", WidgetText.text("Lista della spesa vuota")))
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(textColor)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if family == .systemSmall {
                    VStack(spacing: 3) {
                        ForEach(Array(visibleItems.enumerated()), id: \.offset) { _, item in
                            StaticShoppingRow(item: item, textColor: textColor, iconColor: iconColor)
                        }
                        if hiddenCount > 0 {
                            Text("+\(hiddenCount) altri")
                                .font(.system(size: 8.5, weight: .semibold))
                                .foregroundColor(textColor.opacity(0.72))
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }
                    Spacer(minLength: 0)
                } else {
                    VStack(spacing: 4) {
                        ForEach(Array(visibleItems.enumerated()), id: \.offset) { _, item in
                            ShoppingRow(item: item, listId: listId, textColor: textColor, iconColor: iconColor)
                        }
                    }
                    if hiddenCount > 0 {
                        Text("+\(hiddenCount) altri")
                            .font(.system(size: 8.5, weight: .semibold))
                            .foregroundColor(textColor.opacity(0.72))
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                    Spacer(minLength: 0)
                }
            }
            .padding(family == .systemSmall ? 8 : 9)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .unredacted()
        .fainanceContainerBackground(Color(hex: "#1E1E30"))
        .widgetURL(fainanceURL(
            family == .systemSmall
                ? "fainance://widget-settings?widget=shoppingList"
                : "fainance://open-shopping-list?listId=\(listId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        ))
    }
}

private struct StaticShoppingRow: View {
    let item: [String: Any]
    let textColor: Color
    let iconColor: Color

    var body: some View {
        let name = WidgetValue.string(item, "name", "Prodotto")
        let bought = WidgetValue.bool(item, "bought")
        HStack(spacing: 6) {
            Image(systemName: bought ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(bought ? iconColor : textColor.opacity(0.65))
            Text(name)
                .font(.system(size: 10.5, weight: bought ? .medium : .semibold))
                .foregroundColor(textColor.opacity(bought ? 0.58 : 1))
                .strikethrough(bought)
                .lineLimit(1)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 6)
        .frame(height: 23)
        .background(Color.white.opacity(bought ? 0.05 : 0.09), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
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

    var body: some View {
        Button(intent: ToggleShoppingItemIntent(itemId: id, listId: listId)) {
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
            .frame(height: 22)
            .background(Color.white.opacity(bought ? 0.05 : 0.09), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
        }
        .buttonStyle(.plain)
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
        json["items"] = allItems
            .filter { WidgetValue.string($0, "listId", "main") == selectedListId }
            .sorted {
                let left = WidgetValue.bool($0, "bought")
                let right = WidgetValue.bool($1, "bought")
                if left != right { return !left }
                return WidgetValue.string($0, "name").localizedCaseInsensitiveCompare(WidgetValue.string($1, "name")) == .orderedAscending
            }

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
            let maxRows = family == .systemLarge ? 6 : (family == .systemMedium ? 4 : 2)

            ZStack {
                FainanceBackground(hex: "#1E1E30", transparency: transparency)
                VStack(alignment: .leading, spacing: family == .systemSmall ? 4 : 5) {
                    HStack(spacing: 6) {
                        if family != .systemSmall {
                            Image("logo_fainance")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 29, height: 29)
                        }
                        Text(WidgetValue.string(data, "title", WidgetText.text("Debiti / Crediti")))
                            .font(.system(size: family == .systemSmall ? 11.5 : 13, weight: .bold))
                            .foregroundColor(titleColor)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                        Spacer(minLength: 1)
                        if family == .systemSmall {
                            StaticSettingsIcon(foregroundColor: iconColor, compact: true)
                        } else {
                            WidgetSettingsButton(widgetType: "debtCredits", foregroundColor: iconColor)
                        }
                    }

                    Group {
                        HStack(spacing: 5) {
                            Text("\(WidgetText.text("Saldo")) \(money(net, currency: currency))")
                            Spacer(minLength: 1)
                            if family != .systemSmall {
                                Text("\(WidgetText.text("Devi")) \(money(debt, currency: currency)) · \(WidgetText.text("Ti devono")) \(money(credit, currency: currency))")
                            }
                        }
                        .font(.system(size: family == .systemSmall ? 10 : 11, weight: .bold))
                        .foregroundColor(textColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(6)
                        .background(Color.white.opacity(0.13), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }

                    ForEach(Array(items.prefix(maxRows).enumerated()), id: \.offset) { _, item in
                        let id = WidgetValue.string(item, "id")
                        let kind = WidgetValue.string(item, "kind", "debt")
                        if family == .systemSmall {
                            debtRow(item: item, kind: kind, currency: currency, textColor: textColor)
                        } else {
                            RouteAction("fainance://open-debt-credit?debtId=\(id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")") {
                                debtRow(item: item, kind: kind, currency: currency, textColor: textColor)
                            }
                        }
                    }
                    Spacer(minLength: 0)
                }
                .padding(family == .systemSmall ? 8 : 9)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .unredacted()
            .fainanceContainerBackground(Color(hex: "#1E1E30"))
            .widgetURL(fainanceURL(family == .systemSmall ? "fainance://widget-settings?widget=debtCredits" : "fainance://open-debt-credits"))
        }
    }

    private func debtRow(item: [String: Any], kind: String, currency: String, textColor: Color) -> some View {
        HStack(spacing: 5) {
            Text(kind == "credit" ? "📈" : "📉")
            Text(WidgetValue.string(item, "holder", "—")).lineLimit(1)
            Spacer(minLength: 2)
            Text(money(WidgetValue.double(item, "balance"), currency: currency)).lineLimit(1)
        }
        .font(.system(size: family == .systemSmall ? 9.5 : 11, weight: .semibold))
        .foregroundColor(textColor)
        .padding(.horizontal, 6)
        .frame(height: family == .systemSmall ? 22 : 24)
        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
    }
}

private struct ShareActionButton: View {
    let route: String
    let systemImage: String
    let label: String
    let color: Color
    var compact = true

    var body: some View {
        RouteAction(route) {
            Group {
                if compact {
                    VStack(spacing: 2) {
                        Image(systemName: systemImage)
                            .font(.system(size: 14, weight: .bold))
                        Text(label)
                            .font(.system(size: 9.5, weight: .bold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                    }
                } else {
                    HStack(spacing: 7) {
                        Image(systemName: systemImage)
                            .font(.system(size: 15, weight: .bold))
                        Text(label)
                            .font(.system(size: 12, weight: .bold))
                            .lineLimit(1)
                    }
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(color, in: RoundedRectangle(cornerRadius: 11, style: .continuous))
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
            let encodedProject = projectId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let projectParam = projectId.isEmpty ? "" : "?project=\(encodedProject)"
            let currency = WidgetValue.string(data, "currency", "€")
            let titleColor = Color(hex: WidgetValue.string(data, "titleColor", "#FFFFFF"))
            let bodyColor = Color(hex: WidgetValue.string(data, "bodyColor", "#D8D6F2"))
            let expenseColor = Color(hex: WidgetValue.string(data, "accentColor", "#E24B4A"))
            let background = WidgetValue.string(data, "bgColor", "#1E1E30")
            let transparency = WidgetValue.int(data, "bgAlpha", 65)
            let net = WidgetValue.double(data, "netAmount")
            let owed = WidgetValue.double(data, "owedAmount")
            let owe = WidgetValue.double(data, "oweAmount")

            ZStack {
                FainanceBackground(hex: background, transparency: transparency)
                VStack(spacing: family == .systemSmall ? 5 : 6) {
                    WidgetHeader(
                        title: "Share",
                        subtitle: WidgetValue.string(data, "projectName", "Nessun progetto selezionato"),
                        titleColor: titleColor,
                        bodyColor: bodyColor,
                        settingsURL: "fainance://widget-settings?widget=share",
                        settingsWidgetType: "share",
                        showSettingsButton: false,
                        showStaticSettingsIcon: false
                    )

                    if family == .systemSmall {
                        shareBalanceSmall(net: net, owed: owed, owe: owe, currency: currency, titleColor: titleColor, bodyColor: bodyColor)
                    } else {
                        shareBalanceWide(net: net, owed: owed, owe: owe, currency: currency, titleColor: titleColor, bodyColor: bodyColor)
                    }

                    if family == .systemMedium {
                        HStack(spacing: 6) {
                            ShareActionButton(route: "fainance://share-add-expense\(projectParam)", systemImage: "minus", label: WidgetText.text("Uscita"), color: expenseColor)
                            ShareActionButton(route: "fainance://share-receipt\(projectParam)", systemImage: "camera.fill", label: WidgetText.text("Scontrino"), color: Color(hex: "#F29F3D"))
                            ShareActionButton(route: "fainance://share-voice\(projectParam)", systemImage: "mic.fill", label: WidgetText.text("Voce"), color: Color(hex: "#7F77DD"))
                        }
                        .frame(height: 39)
                    } else if family == .systemLarge {
                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 8),
                            GridItem(.flexible(), spacing: 8),
                            GridItem(.flexible(), spacing: 8)
                        ], spacing: 8) {
                            ShareActionButton(route: "fainance://share-add-expense\(projectParam)", systemImage: "minus", label: WidgetText.text("Uscita"), color: expenseColor, compact: false).frame(height: 45)
                            ShareActionButton(route: "fainance://share-receipt\(projectParam)", systemImage: "camera.fill", label: WidgetText.text("Scontrino"), color: Color(hex: "#F29F3D"), compact: false).frame(height: 45)
                            ShareActionButton(route: "fainance://share-voice\(projectParam)", systemImage: "mic.fill", label: WidgetText.text("Voce"), color: Color(hex: "#7F77DD"), compact: false).frame(height: 45)
                        }
                    }

                    if family != .systemSmall {
                        Text(WidgetValue.string(data, "lastActivity", "Nessuna attività recente"))
                            .font(.system(size: 9.5, weight: .medium))
                            .foregroundColor(bodyColor)
                            .lineLimit(1)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(9)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .unredacted()
            .fainanceContainerBackground(Color(hex: background))
            .widgetURL(fainanceURL("fainance://open-share-project\(projectParam)"))
        }
    }

    private func shareBalanceSmall(net: Double, owed: Double, owe: Double, currency: String, titleColor: Color, bodyColor: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(WidgetText.text("Saldo"))
                .font(.system(size: 9.5, weight: .semibold))
                .foregroundColor(bodyColor)
            Text(money(net, currency: currency))
                .font(.system(size: 21, weight: .heavy))
                .foregroundColor(titleColor)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            HStack(spacing: 5) {
                Text("+ \(money(owed, currency: currency))")
                Spacer(minLength: 1)
                Text("− \(money(owe, currency: currency))")
            }
            .font(.system(size: 9, weight: .bold))
            .foregroundColor(bodyColor)
        }
        .padding(9)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color.white.opacity(0.10), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
    }

    private func shareBalanceWide(net: Double, owed: Double, owe: Double, currency: String, titleColor: Color, bodyColor: Color) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 1) {
                Text(WidgetText.text("Saldo"))
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(bodyColor)
                Text(money(net, currency: currency))
                    .font(.system(size: family == .systemLarge ? 22 : 18, weight: .heavy))
                    .foregroundColor(titleColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            Spacer(minLength: 2)
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(WidgetText.text("Ti devono")): \(money(owed, currency: currency))")
                Text("\(WidgetText.text("Devi")): \(money(owe, currency: currency))")
            }
            .font(.system(size: 9.5, weight: .semibold))
            .foregroundColor(bodyColor)
            .lineLimit(1)
            .minimumScaleFactor(0.72)
        }
        .padding(8)
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.10), in: RoundedRectangle(cornerRadius: 11, style: .continuous))
    }
}

private struct VoiceAssistantWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: FainanceWidgetEntry

    var body: some View {
        if !entry.allowed {
            LockedWidgetView(type: "voiceAssistant", icon: "🎙")
        } else {
            ZStack {
                LinearGradient(colors: [Color(hex: "#F3F0FF"), Color(hex: "#DCD7FF")], startPoint: .topLeading, endPoint: .bottomTrailing)
                if family == .systemSmall {
                    VStack(spacing: 4) {
                        ZStack {
                            Circle()
                                .fill(Color.white.opacity(0.72))
                                .frame(width: 52, height: 52)
                            Image("ai_grillo_mascot_transparent")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 36, height: 36)
                            Image(systemName: "mic.fill")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 20, height: 20)
                                .background(Color(hex: "#7F77DD"), in: Circle())
                                .offset(x: 18, y: 18)
                        }
                        Text(WidgetText.text("Assistente vocale"))
                            .font(.system(size: 10.5, weight: .bold))
                            .foregroundColor(Color(hex: "#292642"))
                            .lineLimit(2)
                            .multilineTextAlignment(.center)
                    }
                    .padding(6)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if family == .systemMedium {
                    HStack(spacing: 12) {
                        Image("ai_grillo_mascot_transparent")
                            .resizable()
                            
                            .scaledToFit()
                            .frame(maxWidth: 112, maxHeight: 122)
                        VStack(alignment: .leading, spacing: 7) {
                            Text(WidgetText.text("Assistente vocale"))
                                .font(.system(size: 19, weight: .heavy))
                                .foregroundColor(Color(hex: "#292642"))
                                .lineLimit(1)
                            Text(WidgetText.text("Tocca per parlare"))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(Color(hex: "#6A6682"))
                            HStack(spacing: 8) {
                                Image(systemName: "mic.fill")
                                Text(WidgetText.text("Voce"))
                            }
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 18)
                            .frame(height: 40)
                            .background(Color(hex: "#7F77DD"), in: Capsule())
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(16)
                } else {
                    VStack(spacing: 10) {
                        HStack {
                            Image("logo_fainance").resizable().scaledToFit().frame(width: 34, height: 34)
                            Text("fAInance")
                                .font(.system(size: 17, weight: .heavy))
                                .foregroundColor(Color(hex: "#292642"))
                            Spacer()
                        }
                        Image("ai_grillo_mascot_transparent")
                            .resizable()
                            
                            .scaledToFit()
                            .frame(maxHeight: 175)
                        Text(WidgetText.text("Assistente vocale"))
                            .font(.system(size: 24, weight: .heavy))
                            .foregroundColor(Color(hex: "#292642"))
                        Text(WidgetText.text("Tocca per parlare"))
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(Color(hex: "#6A6682"))
                        HStack(spacing: 9) {
                            Image(systemName: "mic.fill")
                            Text(WidgetText.text("Assistente vocale"))
                        }
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 46)
                        .background(Color(hex: "#7F77DD"), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .padding(18)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .unredacted()
            .fainanceContainerBackground(Color(hex: "#F3F0FF"))
            .widgetURL(fainanceURL("fainance://open-voice?source=ios-widget&autostart=1"))
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
            .contentMarginsDisabled()
    }
}

private struct FidelityWidget: Widget {
    let kind = FainanceWidgetKind.fidelity.rawValue
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: FidelityWidgetConfigurationIntent.self, provider: FidelityAppIntentProvider()) { FidelityWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Fidelity card")
            .description("Mostra rapidamente la carta selezionata.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
    }
}

private struct ShoppingListWidget: Widget {
    let kind = FainanceWidgetKind.shoppingList.rawValue
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ShoppingListWidgetConfigurationIntent.self, provider: ShoppingListAppIntentProvider()) { ShoppingListWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Lista spesa")
            .description("Controlla la lista e segna gli articoli acquistati.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
            .contentMarginsDisabled()
    }
}

private struct NoteWidget: Widget {
    let kind = FainanceWidgetKind.note.rawValue
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: NoteWidgetConfigurationIntent.self, provider: NoteAppIntentProvider()) { NoteWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Nota / Dati")
            .description("Mostra una nota, un IBAN o una carta di credito.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
    }
}

private struct GoalWidget: Widget {
    let kind = FainanceWidgetKind.goal.rawValue
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: GoalWidgetConfigurationIntent.self, provider: GoalAppIntentProvider()) { GoalWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Obiettivo")
            .description("Mostra avanzamento, percentuale e importi.")
            .supportedFamilies([.systemSmall, .systemMedium])
            .contentMarginsDisabled()
    }
}

private struct DebtCreditsWidget: Widget {
    let kind = FainanceWidgetKind.debtCredits.rawValue
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: DebtCreditsWidgetConfigurationIntent.self, provider: DebtCreditsAppIntentProvider()) { DebtCreditsWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Debiti / Crediti")
            .description("Mostra saldo e posizioni aperte.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
            .contentMarginsDisabled()
    }
}

private struct VoiceAssistantWidget: Widget {
    let kind = FainanceWidgetKind.voiceAssistant.rawValue
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FainanceTimelineProvider(kind: .voiceAssistant)) { VoiceAssistantWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Assistente vocale")
            .description("Apri direttamente la conversazione vocale.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
            .contentMarginsDisabled()
    }
}

private struct ShareWidget: Widget {
    let kind = FainanceWidgetKind.share.rawValue
    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ShareWidgetConfigurationIntent.self, provider: ShareAppIntentProvider()) { ShareWidgetView(entry: $0) }
            .configurationDisplayName("fAInance · Share")
            .description("Controlla il saldo del progetto e aggiungi spese.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
            .contentMarginsDisabled()
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
