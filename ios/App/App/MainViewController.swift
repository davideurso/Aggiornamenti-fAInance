import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    private let widgetAppGroup = "group.it.fainanceapp.app"
    private var widgetRouteObserver: NSObjectProtocol?
    private var widgetRouteDispatchToken = UUID()
    private var lastInjectedSafeAreaInsets = UIEdgeInsets(top: -1, left: -1, bottom: -1, right: -1)

    override func viewDidLoad() {
        super.viewDidLoad()
        configureWebViewForReliableTouches()
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
        configureWebViewForReliableTouches()
        injectNativeSafeArea(force: true)
        dispatchPendingWidgetRoute()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        configureWebViewForReliableTouches()
        injectNativeSafeArea()
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

        configureWebViewForReliableTouches()
        injectNativeSafeArea(force: true)
        dispatchPendingWidgetRoute()
    }

    deinit {
        if let widgetRouteObserver {
            NotificationCenter.default.removeObserver(widgetRouteObserver)
        }
    }

    private func configureWebViewForReliableTouches() {
        guard let scrollView = webView?.scrollView else {
            return
        }

        // The interface scrolls inside the web content. Keep UIKit from
        // delaying or cancelling the touch sequence before WebKit delivers the
        // corresponding touchend/click to React.
        scrollView.delaysContentTouches = false
        scrollView.canCancelContentTouches = false
        scrollView.contentInsetAdjustmentBehavior = .never
    }

    private func injectNativeSafeArea(force: Bool = false) {
        guard let webView else {
            return
        }

        let insets = view.safeAreaInsets
        let changed =
            abs(insets.top - lastInjectedSafeAreaInsets.top) >= 0.5 ||
            abs(insets.left - lastInjectedSafeAreaInsets.left) >= 0.5 ||
            abs(insets.bottom - lastInjectedSafeAreaInsets.bottom) >= 0.5 ||
            abs(insets.right - lastInjectedSafeAreaInsets.right) >= 0.5

        guard force || changed else {
            return
        }

        lastInjectedSafeAreaInsets = insets

        let top = String(format: "%.2f", Double(insets.top))
        let right = String(format: "%.2f", Double(insets.right))
        let bottom = String(format: "%.2f", Double(insets.bottom))
        let left = String(format: "%.2f", Double(insets.left))

        let script = """
        (function(){
          var root=document.documentElement;
          if(!root)return;
          root.classList.add('fainance-ios-native');
          root.style.setProperty('--fainance-native-safe-top','\(top)px');
          root.style.setProperty('--fainance-native-safe-right','\(right)px');
          root.style.setProperty('--fainance-native-safe-bottom','\(bottom)px');
          root.style.setProperty('--fainance-native-safe-left','\(left)px');
          window.__FAINANCE_IOS_SAFE_AREA__={top:\(top),right:\(right),bottom:\(bottom),left:\(left)};
          try{window.dispatchEvent(new CustomEvent('fainance-safe-area-change',{detail:window.__FAINANCE_IOS_SAFE_AREA__}));}catch(e){}
        })();
        """

        webView.evaluateJavaScript(script, completionHandler: nil)
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
    }
}
