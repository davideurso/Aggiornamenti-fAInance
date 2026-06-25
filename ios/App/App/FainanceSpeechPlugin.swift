import Foundation
import Capacitor
import Speech
import AVFoundation

@objc(FainanceSpeechPlugin)
public class FainanceSpeechPlugin: CAPPlugin {
    private var recognizer: SFSpeechRecognizer?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    private var startCall: CAPPluginCall?
    private var stopCall: CAPPluginCall?
    private var latestTranscript: String = ""
    private var sessionActive = false
    private var maxTimer: Timer?
    private var recognitionTimer: Timer?
    private var isRecognizing = false

    @objc func available(_ call: CAPPluginCall) {
        let language = call.getString("language") ?? Locale.current.identifier.replacingOccurrences(of: "_", with: "-")
        let rec = SFSpeechRecognizer(locale: Locale(identifier: language)) ?? SFSpeechRecognizer(locale: Locale(identifier: "it-IT")) ?? SFSpeechRecognizer()
        call.resolve(["available": rec?.isAvailable ?? false])
    }

    @objc func isListening(_ call: CAPPluginCall) {
        call.resolve(["listening": sessionActive])
    }

    @objc func speechCheckPermissions(_ call: CAPPluginCall) {
        let speech = Self.speechStatusString(SFSpeechRecognizer.authorizationStatus())
        let mic = Self.microphoneStatusString(AVCaptureDevice.authorizationStatus(for: .audio))
        call.resolve(["speechRecognition": speech, "microphone": mic])
    }

    @objc func speechRequestPermissions(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { speechStatus in
            DispatchQueue.main.async {
                self.requestMicrophoneAccess { micGranted in
                    let speech = Self.speechStatusString(speechStatus)
                    let mic = micGranted ? "granted" : Self.microphoneStatusString(AVCaptureDevice.authorizationStatus(for: .audio))
                    call.resolve(["speechRecognition": speech, "microphone": mic])
                }
            }
        }
    }

    @objc func checkMicrophonePermission(_ call: CAPPluginCall) {
        speechCheckPermissions(call)
    }

    @objc func requestMicrophonePermission(_ call: CAPPluginCall) {
        speechRequestPermissions(call)
    }

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.sessionActive || self.isRecognizing {
                self.cleanupSession()
            }

            let language = call.getString("language") ?? Locale.current.identifier.replacingOccurrences(of: "_", with: "-")
            self.recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)) ?? SFSpeechRecognizer(locale: Locale(identifier: "it-IT")) ?? SFSpeechRecognizer()
            guard let recognizer = self.recognizer, recognizer.isAvailable else {
                call.reject("Riconoscimento vocale non disponibile per la lingua selezionata.")
                return
            }

            self.requestNativePermissions { granted, message in
                guard granted else {
                    call.reject(message ?? "Permessi microfono o riconoscimento vocale non concessi.")
                    return
                }
                do {
                    try self.beginRecording(call: call)
                } catch {
                    self.cleanupSession()
                    call.reject(error.localizedDescription)
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.isRecognizing {
                self.stopCall = call
                return
            }
            guard self.sessionActive else {
                let text = self.latestTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
                call.resolve(Self.responsePayload(text: text))
                return
            }
            self.stopCall = call
            self.stopRecordingAndRecognize()
        }
    }

    private func beginRecording(call: CAPPluginCall) throws {
        cleanupSession()
        latestTranscript = ""
        startCall = call
        sessionActive = true
        isRecognizing = false

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: [.duckOthers])
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        let url = FileManager.default.temporaryDirectory.appendingPathComponent("fainance_voice_\(UUID().uuidString).m4a")
        recordingURL = url
        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]
        let recorder = try AVAudioRecorder(url: url, settings: settings)
        recorder.prepareToRecord()
        guard recorder.record() else {
            throw NSError(domain: "FainanceSpeech", code: 1, userInfo: [NSLocalizedDescriptionKey: "Impossibile avviare la registrazione audio."])
        }
        audioRecorder = recorder
        notifyListeners("listeningState", data: ["status": "started"])

        let timeoutMs = call.getInt("timeoutMs") ?? 12000
        maxTimer = Timer.scheduledTimer(withTimeInterval: max(3.0, Double(timeoutMs) / 1000.0), repeats: false) { [weak self] _ in
            DispatchQueue.main.async {
                guard let self = self, self.sessionActive else { return }
                self.stopRecordingAndRecognize()
            }
        }
    }

    private func stopRecordingAndRecognize() {
        guard sessionActive else { return }
        sessionActive = false
        isRecognizing = true
        maxTimer?.invalidate()
        maxTimer = nil

        audioRecorder?.stop()
        audioRecorder = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        notifyListeners("listeningState", data: ["status": "stopped"])

        guard let url = recordingURL else {
            finishRecognition(text: "", errorMessage: nil)
            return
        }

        guard let recognizer = recognizer else {
            finishRecognition(text: "", errorMessage: "Riconoscimento vocale non disponibile.")
            return
        }

        let request = SFSpeechURLRecognitionRequest(url: url)
        request.shouldReportPartialResults = false
        if #available(iOS 13.0, *) {
            request.requiresOnDeviceRecognition = false
        }
        if #available(iOS 16.0, *) {
            request.addsPunctuation = false
        }
        latestTranscript = ""

        recognitionTimer?.invalidate()
        recognitionTimer = Timer.scheduledTimer(withTimeInterval: 12.0, repeats: false) { [weak self] _ in
            DispatchQueue.main.async {
                guard let self = self, self.isRecognizing else { return }
                self.finishRecognition(text: self.latestTranscript, errorMessage: nil)
            }
        }

        recognitionTask = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self = self else { return }
            DispatchQueue.main.async {
                if let result = result {
                    let text = result.bestTranscription.formattedString.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !text.isEmpty {
                        self.latestTranscript = text
                        self.notifyListeners("partialResults", data: ["matches": [text], "transcript": text])
                    }
                    if result.isFinal {
                        self.finishRecognition(text: text, errorMessage: nil)
                        return
                    }
                }
                if let error = error {
                    let current = self.latestTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
                    if !current.isEmpty {
                        self.finishRecognition(text: current, errorMessage: nil)
                    } else {
                        self.finishRecognition(text: "", errorMessage: error.localizedDescription)
                    }
                }
            }
        }
    }

    private func finishRecognition(text: String, errorMessage: String?) {
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        latestTranscript = clean
        recognitionTimer?.invalidate()
        recognitionTimer = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        isRecognizing = false

        if let url = recordingURL {
            try? FileManager.default.removeItem(at: url)
        }
        recordingURL = nil

        let payload = Self.responsePayload(text: clean, errorMessage: errorMessage)
        startCall?.resolve(payload)
        stopCall?.resolve(payload)
        startCall = nil
        stopCall = nil
    }

    private func requestNativePermissions(_ completion: @escaping (Bool, String?) -> Void) {
        let currentSpeech = SFSpeechRecognizer.authorizationStatus()

        func requestMicIfNeeded(_ speechStatus: SFSpeechRecognizerAuthorizationStatus) {
            let speechOk = speechStatus == .authorized
            self.requestMicrophoneAccess { micGranted in
                completion(speechOk && micGranted, (speechOk && micGranted) ? nil : "Permessi microfono o riconoscimento vocale non concessi.")
            }
        }

        if currentSpeech == .notDetermined {
            SFSpeechRecognizer.requestAuthorization { status in
                DispatchQueue.main.async { requestMicIfNeeded(status) }
            }
        } else {
            requestMicIfNeeded(currentSpeech)
        }
    }

    private func requestMicrophoneAccess(_ completion: @escaping (Bool) -> Void) {
        let status = AVCaptureDevice.authorizationStatus(for: .audio)
        switch status {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .audio) { granted in
                DispatchQueue.main.async { completion(granted) }
            }
        case .denied, .restricted:
            completion(false)
        @unknown default:
            completion(false)
        }
    }

    private func cleanupSession() {
        maxTimer?.invalidate()
        recognitionTimer?.invalidate()
        maxTimer = nil
        recognitionTimer = nil
        audioRecorder?.stop()
        audioRecorder = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        if let url = recordingURL { try? FileManager.default.removeItem(at: url) }
        recordingURL = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        startCall = nil
        stopCall = nil
        latestTranscript = ""
        sessionActive = false
        isRecognizing = false
    }

    private static func responsePayload(text: String, errorMessage: String? = nil) -> [String: Any] {
        var payload: [String: Any] = text.isEmpty ? ["matches": [], "transcript": ""] : ["matches": [text], "transcript": text]
        if let errorMessage = errorMessage, !errorMessage.isEmpty {
            payload["error"] = errorMessage
        }
        return payload
    }

    private static func speechStatusString(_ status: SFSpeechRecognizerAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "granted"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "prompt"
        @unknown default: return "prompt"
        }
    }

    private static func microphoneStatusString(_ status: AVAuthorizationStatus) -> String {
        switch status {
        case .authorized: return "granted"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "prompt"
        @unknown default: return "prompt"
        }
    }
}
