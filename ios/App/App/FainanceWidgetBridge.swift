import Foundation
import Capacitor
import WidgetKit

@objc(FainanceWidgetBridge)
public class FainanceWidgetBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FainanceWidgetBridge"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveAndUpdateWidgets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setWidgetAvailability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAvailableWidgets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateQuickAddWidget", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateAllWidgets", returnType: CAPPluginReturnPromise)
    ]

    private let appGroup = "group.it.fainanceapp.app"

    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }

    @objc func saveAndUpdateWidgets(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults else {
            call.reject("App Group dei widget non disponibile.")
            return
        }

        saveString(call, key: "settings", destinationKey: "widget_settings_v2", defaults: defaults, fallback: "{}")
        saveString(call, key: "quickAdd", destinationKey: "widget_quick_add_settings", defaults: defaults, fallback: "{}")
        saveString(call, key: "note", destinationKey: "widget_note_settings", defaults: defaults, fallback: "{}")
        saveString(call, key: "goal", destinationKey: "widget_goal_settings", defaults: defaults, fallback: "{}")
        saveString(call, key: "share", destinationKey: "widget_share_settings", defaults: defaults, fallback: "{}")
        saveString(call, key: "shoppingList", destinationKey: "widget_shopping_list_settings", defaults: defaults, fallback: "{}")
        saveString(call, key: "fidelity", destinationKey: "widget_fidelity_settings", defaults: defaults, fallback: "{}")
        saveString(call, key: "debtCredits", destinationKey: "widget_debt_credits_settings", defaults: defaults, fallback: "{}")
        saveAvailability(call, defaults: defaults)
        defaults.set(Date().timeIntervalSince1970, forKey: "widget_last_update")
        defaults.synchronize()
        reloadAll()
        call.resolve(["updated": true])
    }

    @objc func setWidgetAvailability(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults else {
            call.reject("App Group dei widget non disponibile.")
            return
        }
        saveAvailability(call, defaults: defaults)
        defaults.synchronize()
        reloadAll()
        call.resolve(["updated": true])
    }

    @objc func setAvailableWidgets(_ call: CAPPluginCall) {
        guard let defaults = sharedDefaults else {
            call.reject("App Group dei widget non disponibile.")
            return
        }
        defaults.set(call.getString("currentPlan") ?? "free", forKey: "widget_current_plan")
        defaults.set(jsonString(call, key: "types", fallback: "[]"), forKey: "widget_available_types")
        defaults.synchronize()
        reloadAll()
        call.resolve(["updated": true])
    }

    @objc func updateQuickAddWidget(_ call: CAPPluginCall) {
        reloadAll()
        call.resolve(["updated": true])
    }

    @objc func updateAllWidgets(_ call: CAPPluginCall) {
        reloadAll()
        call.resolve(["updated": true])
    }

    private func saveAvailability(_ call: CAPPluginCall, defaults: UserDefaults) {
        defaults.set(call.getString("currentPlan") ?? "free", forKey: "widget_current_plan")
        defaults.set(jsonString(call, key: "availableTypes", fallback: "[]"), forKey: "widget_available_types")
        defaults.set(jsonString(call, key: "enabledTypes", fallback: "[]"), forKey: "widget_enabled_types")
        defaults.set(jsonString(call, key: "disabledTypes", fallback: "[]"), forKey: "widget_disabled_types")
        defaults.set(jsonString(call, key: "widgetOrder", fallback: "[]"), forKey: "widget_order")
        defaults.set(jsonString(call, key: "planAvailability", fallback: "{}"), forKey: "widget_plan_availability")
    }

    private func saveString(
        _ call: CAPPluginCall,
        key: String,
        destinationKey: String,
        defaults: UserDefaults,
        fallback: String
    ) {
        defaults.set(jsonString(call, key: key, fallback: fallback), forKey: destinationKey)
    }

    private func jsonString(_ call: CAPPluginCall, key: String, fallback: String) -> String {
        if let value = call.getString(key), !value.isEmpty {
            return value
        }
        if let array = call.getArray(key),
           JSONSerialization.isValidJSONObject(array),
           let data = try? JSONSerialization.data(withJSONObject: array),
           let string = String(data: data, encoding: .utf8) {
            return string
        }
        if let object = call.getObject(key),
           JSONSerialization.isValidJSONObject(object),
           let data = try? JSONSerialization.data(withJSONObject: object),
           let string = String(data: data, encoding: .utf8) {
            return string
        }
        return fallback
    }

    private func reloadAll() {
        DispatchQueue.main.async {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}
