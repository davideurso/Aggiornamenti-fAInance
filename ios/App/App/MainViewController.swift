import UIKit
import WebKit
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        // I plugin installati tramite Swift Package Manager vengono registrati
        // automaticamente da Capacitor. Registriamo qui soltanto i due plugin
        // locali specifici di fAInance.
        bridge?.registerPluginInstance(FainanceAudioPlugin())
        bridge?.registerPluginInstance(FainanceFilePlugin())

        // La conversazione viene avviata da un’azione esplicita dell’utente.
        // Dopo tale azione, l’audio remoto può partire senza un secondo tocco.
        webView?.configuration.mediaTypesRequiringUserActionForPlayback = []
    }
}
