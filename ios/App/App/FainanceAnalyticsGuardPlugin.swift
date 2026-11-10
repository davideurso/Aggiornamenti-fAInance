import Foundation
import UIKit
import Capacitor
import FirebaseCore

@objc(FainanceAnalyticsGuardPlugin)
public class FainanceAnalyticsGuardPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FainanceAnalyticsGuardPlugin"
    public let jsName = "FainanceAnalyticsGuard"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getConfiguration", returnType: CAPPluginReturnPromise)
    ]
    @objc func getConfiguration(_ call: CAPPluginCall) {
        guard let projectId = FirebaseApp.app()?.options.projectID,
              let appId = Bundle.main.bundleIdentifier else {
            call.reject("FAINANCE_ANALYTICS_CONFIGURATION_UNAVAILABLE")
            return
        }
        call.resolve(["projectId": projectId, "appId": appId])
    }
}

class FainanceAnalyticsViewController: CAPBridgeViewController {
    // Keep every DOM surface, including portals and keyboard-scrolled content,
    // physically below the status bar. Capacitor still owns the same WKWebView.
    override func viewDidLoad() {
        super.viewDidLoad()
        guard let content = webView else { return }
        let container = UIView()
        container.backgroundColor = .systemBackground
        container.clipsToBounds = true
        view = container
        content.translatesAutoresizingMaskIntoConstraints = false
        content.clipsToBounds = true
        container.addSubview(content)
        NSLayoutConstraint.activate([
            content.topAnchor.constraint(equalTo: container.safeAreaLayoutGuide.topAnchor),
            content.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            content.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
    }

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(FainanceAnalyticsGuardPlugin())
    }
}
