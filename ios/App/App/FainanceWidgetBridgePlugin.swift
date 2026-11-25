import Foundation
import Capacitor
#if canImport(WidgetKit)
import WidgetKit
#endif

@objc(FainanceWidgetBridgePlugin)
public class FainanceWidgetBridgePlugin: CAPPlugin {
    private let appGroupId = "group.it.fainanceapp.app"
    private let payloadKey = "fainance_widget_payload"

    private let debtStyleKey = "fainance_debt_widget_appearance"

    @objc func saveDebtAppearance(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroupId),
              let color = call.getString("bgColor"),
              color.range(of: "^#[0-9a-fA-F]{6}$", options: .regularExpression) != nil,
              let alpha = call.getInt("bgAlpha"), (0...100).contains(alpha) else {
            call.reject("Invalid debt widget appearance")
            return
        }
        let saved = defaults.dictionary(forKey: debtStyleKey)
        if saved?["bgColor"] as? String != color || saved?["bgAlpha"] as? Int != alpha {
            defaults.set(["bgColor": color, "bgAlpha": alpha], forKey: debtStyleKey)
            WidgetCenter.shared.reloadTimelines(ofKind: "FainanceDebtsWidget")
        }
        call.resolve()
    }

    @objc func saveAll(_ call: CAPPluginCall) {
        guard let payload = call.getObject("payload") else {
            call.reject("Missing payload")
            return
        }

        do {
            let data = try JSONSerialization.data(withJSONObject: payload, options: [])
            guard let json = String(data: data, encoding: .utf8) else {
                call.reject("Unable to encode widget payload")
                return
            }

            guard let defaults = UserDefaults(suiteName: appGroupId) else {
                call.reject("Unable to open App Group: \(appGroupId)")
                return
            }

            defaults.set(json, forKey: payloadKey)
            defaults.synchronize()

            #if canImport(WidgetKit)
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }
            #endif

            call.resolve(["saved": true])
        } catch {
            call.reject("Unable to serialize widget payload", nil, error)
        }
    }

    @objc func reload(_ call: CAPPluginCall) {
        #if canImport(WidgetKit)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve(["reloaded": true])
        } else {
            call.resolve(["reloaded": false])
        }
        #else
        call.resolve(["reloaded": false])
        #endif
    }

    @objc func clear(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            call.reject("Unable to open App Group: \(appGroupId)")
            return
        }

        defaults.removeObject(forKey: debtStyleKey)
        defaults.removeObject(forKey: payloadKey)
        defaults.synchronize()

        #if canImport(WidgetKit)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        #endif

        call.resolve(["cleared": true])
    }
}
