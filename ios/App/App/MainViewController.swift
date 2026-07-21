import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    private let widgetAppGroup = "group.it.fainanceapp.app"
    private var widgetRouteObserver: NSObjectProtocol?

    override func viewDidLoad() {
        super.viewDidLoad()
        widgetRouteObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.dispatchPendingWidgetRoute()
        }
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        dispatchPendingWidgetRoute()
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        // I plugin installati tramite Swift Package Manager vengono registrati
        // automaticamente da Capacitor. Registriamo qui soltanto i plugin
        // locali specifici di fAInance.
        bridge?.registerPluginInstance(FainanceAudioPlugin())
        bridge?.registerPluginInstance(FainanceFilePlugin())
        bridge?.registerPluginInstance(FainanceWidgetBridge())

        // La conversazione viene avviata da un’azione esplicita dell’utente.
        // Dopo tale azione, l’audio remoto può partire senza un secondo tocco.
        webView?.configuration.mediaTypesRequiringUserActionForPlayback = []

        dispatchPendingWidgetRoute()
    }

    deinit {
        if let widgetRouteObserver {
            NotificationCenter.default.removeObserver(widgetRouteObserver)
        }
    }

    private func dispatchPendingWidgetRoute() {
        guard let defaults = UserDefaults(suiteName: widgetAppGroup),
              let route = defaults.string(forKey: "widget_pending_route_v1"),
              !route.isEmpty else {
            return
        }

        let timestamp = defaults.double(forKey: "widget_pending_route_timestamp_v1")
        if timestamp > 0, Date().timeIntervalSince1970 - timestamp > 300 {
            defaults.removeObject(forKey: "widget_pending_route_v1")
            defaults.removeObject(forKey: "widget_pending_route_timestamp_v1")
            return
        }

        defaults.removeObject(forKey: "widget_pending_route_v1")
        defaults.removeObject(forKey: "widget_pending_route_timestamp_v1")
        defaults.synchronize()

        guard let encoded = try? JSONEncoder().encode(route),
              let routeJSON = String(data: encoded, encoding: .utf8) else {
            return
        }

        let script = "window.dispatchEvent(new CustomEvent('fainance-widget-route',{detail:{url:\(routeJSON)}}));"
        [0.15, 0.55, 1.2, 2.0].forEach { delay in
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.webView?.evaluateJavaScript(script, completionHandler: nil)
            }
        }
    }
}
