import Foundation
import Capacitor
import Speech
import AVFoundation

@objc(FainanceSpeechRecognitionPlugin)
public class FainanceSpeechRecognitionPlugin: CAPPlugin, CAPBridgedPlugin, SFSpeechRecognizerDelegate {
    public let identifier = "FainanceSpeechRecognitionPlugin"
    public let jsName = "SpeechRecognition"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isListening", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getSupportedLanguages", returnType: CAPPluginReturnPromise)
    ]

    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var speechRecognizer: SFSpeechRecognizer?
    private var activeCall: CAPPluginCall?
    private var lastTranscript = ""
    private var partialResultsEnabled = false
    private var stopTimer: DispatchWorkItem?
    private var isListeningFlag = false
    private var tapInstalled = false

    private func permissionState(_ authorized: Bool? = nil) -> String {
        let speechStatus = SFSpeechRecognizer.authorizationStatus()
        let speechGranted = authorized ?? (speechStatus == .authorized)
        let micStatus = AVAudioSession.sharedInstance().recordPermission
        if speechGranted && micStatus == .granted { return "granted" }
        if speechStatus == .denied || speechStatus == .restricted || micStatus == .denied { return "denied" }
        return "prompt"
    }

    private func resolvePermissions(_ call: CAPPluginCall, speechAuthorized: Bool? = nil) {
        let state = permissionState(speechAuthorized)
        call.resolve([
            "speechRecognition": state,
            "microphone": state,
            "permission": state,
            "state": state,
            "status": state,
            "value": state,
            "hasPermission": state == "granted"
        ])
    }

    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["available": true])
    }

    @objc func isListening(_ call: CAPPluginCall) {
        call.resolve(["listening": isListeningFlag])
    }

    @objc public override func checkPermissions(_ call: CAPPluginCall) {
        resolvePermissions(call)
    }

    @objc func hasPermission(_ call: CAPPluginCall) {
        call.resolve(["hasPermission": permissionState() == "granted"])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        requestPermissions(call)
    }

    @objc public override func requestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { speechStatus in
            AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
                DispatchQueue.main.async {
                    let speechGranted = speechStatus == .authorized
                    let finalGranted = speechGranted && micGranted
                    let state = finalGranted ? "granted" : ((speechStatus == .denied || speechStatus == .restricted || !micGranted) ? "denied" : "prompt")
                    call.resolve([
                        "speechRecognition": state,
                        "microphone": micGranted ? "granted" : "denied",
                        "permission": state,
                        "state": state,
                        "status": state,
                        "value": state,
                        "hasPermission": finalGranted
                    ])
                }
            }
        }
    }

    @objc func getSupportedLanguages(_ call: CAPPluginCall) {
        let languages = Array(SFSpeechRecognizer.supportedLocales()).map { $0.identifier }.sorted()
        call.resolve(["languages": languages])
    }

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopInternal(resolveCurrentCall: false)

            let language = call.getString("language") ?? Locale.current.identifier
            self.partialResultsEnabled = call.getBool("partialResults") ?? false
            self.lastTranscript = ""
            self.activeCall = call

            SFSpeechRecognizer.requestAuthorization { speechStatus in
                AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
                    DispatchQueue.main.async {
                        guard speechStatus == .authorized && micGranted else {
                            self.finishWithReject("Permesso microfono o riconoscimento vocale non concesso.")
                            return
                        }
                        self.startRecognition(language: language)
                    }
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopInternal(resolveCurrentCall: true)
            call.resolve()
        }
    }

    private func startRecognition(language: String) {
        let locale = Locale(identifier: language)
        guard let recognizer = SFSpeechRecognizer(locale: locale) else {
            finishWithReject("Riconoscimento vocale non disponibile per la lingua selezionata.")
            return
        }
        speechRecognizer = recognizer
        speechRecognizer?.delegate = self

        guard recognizer.isAvailable else {
            finishWithReject("Riconoscimento vocale non disponibile in questo momento.")
            return
        }

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        recognitionRequest = request

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.record, mode: .measurement, options: [.duckOthers])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            finishWithReject("Microfono non disponibile: \(error.localizedDescription)")
            return
        }

        let inputNode = audioEngine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)
        if tapInstalled {
            inputNode.removeTap(onBus: 0)
            tapInstalled = false
        }
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { buffer, _ in
            self.recognitionRequest?.append(buffer)
        }
        tapInstalled = true

        recognitionTask = recognizer.recognitionTask(with: request) { result, error in
            DispatchQueue.main.async {
                if let result = result {
                    let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !text.isEmpty {
                        self.lastTranscript = text
                        if self.partialResultsEnabled {
                            self.notifyListeners("partialResults", data: ["matches": [text]])
                        }
                    }
                    if result.isFinal {
                        self.finishWithSuccess()
                        return
                    }
                }

                if let error = error {
                    let nsError = error as NSError
                    let message = error.localizedDescription
                    if !self.lastTranscript.isEmpty || nsError.code == 203 || message.lowercased().contains("cancel") {
                        self.finishWithSuccess()
                    } else {
                        self.finishWithReject(message)
                    }
                }
            }
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isListeningFlag = true
            notifyListeners("listeningState", data: ["status": "started"])
            scheduleAutoStop()
        } catch {
            finishWithReject("Impossibile avviare il microfono: \(error.localizedDescription)")
        }
    }

    private func scheduleAutoStop() {
        stopTimer?.cancel()
        let workItem = DispatchWorkItem { [weak self] in
            self?.stopInternal(resolveCurrentCall: true)
        }
        stopTimer = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + 7.0, execute: workItem)
    }

    private func finishWithSuccess() {
        let matches = lastTranscript.isEmpty ? [] : [lastTranscript]
        activeCall?.resolve(["matches": matches, "value": lastTranscript])
        cleanupRecognition()
    }

    private func finishWithReject(_ message: String) {
        activeCall?.reject(message)
        cleanupRecognition()
    }

    private func stopInternal(resolveCurrentCall: Bool) {
        if audioEngine.isRunning {
            audioEngine.stop()
            recognitionRequest?.endAudio()
        }
        if resolveCurrentCall, activeCall != nil {
            finishWithSuccess()
        } else {
            cleanupRecognition()
        }
    }

    private func cleanupRecognition() {
        stopTimer?.cancel()
        stopTimer = nil
        if tapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            tapInstalled = false
        }
        if audioEngine.isRunning { audioEngine.stop() }
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        activeCall = nil
        if isListeningFlag {
            notifyListeners("listeningState", data: ["status": "stopped"])
        }
        isListeningFlag = false
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
