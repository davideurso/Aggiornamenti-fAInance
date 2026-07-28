import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    private let widgetAppGroup = "group.it.fainanceapp.app"
    private var widgetRouteObserver: NSObjectProtocol?
    private var widgetRouteDispatchToken = UUID()

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
        // Temporaneamente disattivato per isolare un problema di reattività dei tap su iOS.
        // Nessuna funzionalità legata al deep-link dai widget viene eseguita finché non
        // viene riattivato esplicitamente.
        return
        /*
        guard let defaults = UserDefaults(suiteName: widgetAppGroup),
              let route = defaults.string(forKey: "widget_pending_route_v1"),
              !route.isEmpty else {
            return
        }

        let timestamp = defaults.double(forKey: "widget_pending_route_timestamp_v1")
        if timestamp > 0, Date().timeIntervalSince1970 - timestamp > 300 {
            defaults.removeObject(forKey: "widget_pending_route_v1")
            defaults.removeObject(forKey: "widget_pending_route_timestamp_v1")
            defaults.synchronize()
            return
        }

        guard let encoded = try? JSONEncoder().encode(route),
              let routeJSON = String(data: encoded, encoding: .utf8) else {
            return
        }

        // Ogni nuova azione annulla i tentativi ancora pianificati della precedente.
        // In questo modo un vecchio tocco su Fotocamera non può riaprire la fotocamera
        // dopo che l’utente ha premuto Nota, Debiti, Share o Impostazioni.
        let token = UUID()
        widgetRouteDispatchToken = token

        let script = """
        window.__fainancePendingWidgetRoute=\(routeJSON);
        try{localStorage.setItem('fainance_pending_widget_route_v1',\(routeJSON));}catch(e){}
        window.dispatchEvent(new CustomEvent('fainance-widget-route',{detail:{url:\(routeJSON)}}));
        """

        [0.10, 0.35, 0.80, 1.50, 2.50, 4.00, 6.00].forEach { delay in
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                guard let self,
                      self.widgetRouteDispatchToken == token,
                      defaults.string(forKey: "widget_pending_route_v1") == route else {
                    return
                }

                self.webView?.evaluateJavaScript(script) { _, error in
                    guard error == nil,
                          self.widgetRouteDispatchToken == token,
                          defaults.string(forKey: "widget_pending_route_v1") == route else {
                        return
                    }

                    // Lo script ha già salvato il percorso nel localStorage della WebView.
                    // Possiamo quindi rimuoverlo dall’App Group e annullare i tentativi successivi.
                    defaults.removeObject(forKey: "widget_pending_route_v1")
                    defaults.removeObject(forKey: "widget_pending_route_timestamp_v1")
                    defaults.synchronize()
                    self.widgetRouteDispatchToken = UUID()
                }
            }
        }
        */
    }
}
