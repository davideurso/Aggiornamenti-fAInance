import Foundation
import Capacitor
import UIKit
import QuickLook

@objc(FainanceFilePlugin)
public class FainanceFilePlugin: CAPPlugin, CAPBridgedPlugin, QLPreviewControllerDataSource {
    public let identifier = "FainanceFilePlugin"
    public let jsName = "FainanceFile"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "copyText", returnType: CAPPluginReturnPromise)
    ]

    private var previewURL: URL?
    private weak var previewNavigationController: UINavigationController?

    @objc func copyText(_ call: CAPPluginCall) {
        let text = (call.getString("text") ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !text.isEmpty else {
            call.reject("Contenuto vuoto.")
            return
        }

        DispatchQueue.main.async {
            UIPasteboard.general.string = text
            call.resolve(["copied": true])
        }
    }

    @objc func openFile(_ call: CAPPluginCall) {
        let dataURL = call.getString("dataUrl") ?? ""
        let requestedName = call.getString("fileName") ?? "documento"

        guard let fileData = decodeDataURL(dataURL) else {
            call.reject("Documento non valido.")
            return
        }

        do {
            let directory = FileManager.default.temporaryDirectory
                .appendingPathComponent("fainance_opened_documents", isDirectory: true)
            try FileManager.default.createDirectory(
                at: directory,
                withIntermediateDirectories: true,
                attributes: nil
            )

            let fileURL = directory.appendingPathComponent(sanitizeFileName(requestedName))
            try fileData.write(to: fileURL, options: .atomic)

            DispatchQueue.main.async {
                guard let presenter = self.bridge?.viewController else {
                    call.reject("Schermata iOS non disponibile.")
                    return
                }

                self.previewURL = fileURL
                let preview = QLPreviewController()
                preview.dataSource = self
                preview.navigationItem.rightBarButtonItem = UIBarButtonItem(
                    barButtonSystemItem: .done,
                    target: self,
                    action: #selector(self.closePreview)
                )

                let navigation = UINavigationController(rootViewController: preview)
                navigation.modalPresentationStyle = .fullScreen
                self.previewNavigationController = navigation
                presenter.present(navigation, animated: true) {
                    call.resolve(["opened": true])
                }
            }
        } catch {
            call.reject("Non riesco ad aprire il documento.", nil, error)
        }
    }

    @objc private func closePreview() {
        previewNavigationController?.dismiss(animated: true)
        previewNavigationController = nil
        previewURL = nil
    }

    public func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
        previewURL == nil ? 0 : 1
    }

    public func previewController(
        _ controller: QLPreviewController,
        previewItemAt index: Int
    ) -> QLPreviewItem {
        (previewURL ?? FileManager.default.temporaryDirectory) as NSURL
    }

    private func decodeDataURL(_ value: String) -> Data? {
        guard value.hasPrefix("data:"), let comma = value.firstIndex(of: ",") else {
            return nil
        }

        let header = String(value[..<comma])
        let payload = String(value[value.index(after: comma)...])

        if header.contains(";base64") {
            return Data(base64Encoded: payload, options: .ignoreUnknownCharacters)
        }

        let decoded = payload.removingPercentEncoding ?? payload
        return decoded.data(using: .utf8)
    }

    private func sanitizeFileName(_ value: String) -> String {
        var result = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if result.isEmpty { result = "documento" }

        let forbidden = CharacterSet(charactersIn: "\\/:*?\"<>|")
            .union(.controlCharacters)
        result = result.components(separatedBy: forbidden).joined(separator: "_")

        if result.count > 120 {
            result = String(result.suffix(120))
        }
        return result
    }
}
