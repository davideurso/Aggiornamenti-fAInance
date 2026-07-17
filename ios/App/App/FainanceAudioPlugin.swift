import Foundation
import Capacitor
import AVFoundation

@objc(FainanceAudioPlugin)
public class FainanceAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FainanceAudioPlugin"
    public let jsName = "FainanceAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "activateAssistantAudio", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getMediaVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "releaseAssistantAudio", returnType: CAPPluginReturnPromise)
    ]

    @objc func activateAssistantAudio(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(
                    .playAndRecord,
                    mode: .voiceChat,
                    options: [.defaultToSpeaker, .allowBluetoothHFP]
                )
                try? session.setPreferredSampleRate(48_000)
                try? session.setPreferredIOBufferDuration(0.01)
                try session.setActive(true)

                call.resolve([
                    "active": true,
                    "stream": "system",
                    "route": self.currentRoute(session)
                ])
            } catch {
                call.reject("Non riesco ad attivare l’audio dell’assistente.", nil, error)
            }
        }
    }

    @objc func getMediaVolume(_ call: CAPPluginCall) {
        let session = AVAudioSession.sharedInstance()

        // Su iOS il volume dei tasti fisici viene applicato direttamente dal
        // sistema all’uscita audio. Il flusso WebRTC deve quindi restare a
        // guadagno pieno: applicare di nuovo outputVolume in JavaScript
        // produrrebbe una doppia attenuazione e una regolazione non lineare.
        call.resolve([
            "current": 1,
            "max": 1,
            "ratio": 1,
            "muted": false,
            "systemOutputVolume": session.outputVolume,
            "route": currentRoute(session)
        ])
    }

    @objc func releaseAssistantAudio(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            do {
                let session = AVAudioSession.sharedInstance()
                try session.setActive(false, options: .notifyOthersOnDeactivation)
                call.resolve([
                    "active": false,
                    "stream": "system"
                ])
            } catch {
                // La sessione può essere già stata disattivata da iOS durante
                // un’interruzione. In questo caso la chiusura dell’assistente
                // deve comunque completarsi senza bloccare l’interfaccia.
                call.resolve([
                    "active": false,
                    "stream": "system"
                ])
            }
        }
    }

    private func currentRoute(_ session: AVAudioSession) -> String {
        session.currentRoute.outputs
            .map { $0.portType.rawValue }
            .joined(separator: ",")
    }
}
