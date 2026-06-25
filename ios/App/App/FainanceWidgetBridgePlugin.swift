import Foundation
import Capacitor
#if canImport(WidgetKit)
import WidgetKit
#endif

@objc(FainanceWidgetBridgePlugin)
public class FainanceWidgetBridgePlugin: CAPPlugin {
    private let appGroupId = "group.it.fainanceapp.app"
    private let payloadKey = "fainance_widget_payload"

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
