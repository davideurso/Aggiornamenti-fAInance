import Foundation
import Capacitor
import StoreKit

@objc(FainanceBillingPlugin)
public class FainanceBillingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FainanceBillingPlugin"
    public let jsName = "FainanceBilling"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise)
    ]

    private let productToPlan: [String: (plan: String, period: String)] = [
        "base_monthly": ("base", "monthly"),
        "base_yearly": ("base", "yearly"),
        "complete_monthly": ("premium", "monthly"),
        "complete_yearly": ("premium", "yearly"),
        "premium_monthly": ("premium", "monthly"),
        "premium_yearly": ("premium", "yearly")
    ]

    @objc func purchase(_ call: CAPPluginCall) {
        let productId = call.getString("productId") ?? ""
        let requestedPlan = call.getString("plan") ?? ""
        let requestedPeriod = call.getString("billingPeriod") ?? "monthly"

        if productId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            call.reject("Prodotto App Store mancante.")
            return
        }

        if #available(iOS 15.0, *) {
            Task {
                do {
                    let response = try await purchaseProduct(productId: productId, requestedPlan: requestedPlan, requestedPeriod: requestedPeriod)
                    await MainActor.run { call.resolve(response) }
                } catch {
                    await MainActor.run { call.reject(error.localizedDescription) }
                }
            }
        } else {
            call.reject("Gli acquisti in-app richiedono iOS 15 o successivo.")
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        if #available(iOS 15.0, *) {
            Task {
                do {
                    try await AppStore.sync()
                    let response = try await currentBestEntitlement()
                    await MainActor.run { call.resolve(response) }
                } catch {
                    await MainActor.run { call.reject(error.localizedDescription) }
                }
            }
        } else {
            call.reject("Il ripristino acquisti richiede iOS 15 o successivo.")
        }
    }

    @available(iOS 15.0, *)
    private func purchaseProduct(productId: String, requestedPlan: String, requestedPeriod: String) async throws -> [String: Any] {
        let products = try await Product.products(for: [productId])
        guard let product = products.first else {
            return [
                "success": false,
                "message": "Prodotto App Store non trovato: \(productId)",
                "productId": productId
            ]
        }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            let mapped = productToPlan[transaction.productID] ?? productToPlan[productId]
            let resolvedPlan = mapped?.plan ?? (requestedPlan.isEmpty ? "premium" : requestedPlan)
            let resolvedPeriod = mapped?.period ?? (requestedPeriod.isEmpty ? "monthly" : requestedPeriod)
            return [
                "success": true,
                "hasActiveSubscription": true,
                "productId": transaction.productID,
                "plan": resolvedPlan,
                "billingPeriod": resolvedPeriod,
                "transactionId": String(transaction.id)
            ]
        case .userCancelled:
            return ["success": false, "cancelled": true, "message": "Acquisto annullato."]
        case .pending:
            return ["success": false, "pending": true, "message": "Acquisto in attesa di conferma."]
        @unknown default:
            return ["success": false, "message": "Risposta App Store non riconosciuta."]
        }
    }

    @available(iOS 15.0, *)
    private func currentBestEntitlement() async throws -> [String: Any] {
        var bestPlan: String? = nil
        var bestPeriod: String? = nil
        var bestRank = -1
        var bestProductId: String? = nil
        var bestTransactionId: UInt64? = nil

        for await result in Transaction.currentEntitlements {
            let transaction = try checkVerified(result)
            guard transaction.revocationDate == nil else { continue }
            guard let mapped = productToPlan[transaction.productID] else { continue }
            let rank = mapped.plan == "premium" ? 2 : mapped.plan == "base" ? 1 : 0
            if rank > bestRank {
                bestRank = rank
                bestPlan = mapped.plan
                bestPeriod = mapped.period
                bestProductId = transaction.productID
                bestTransactionId = transaction.id
            }
        }

        if let plan = bestPlan {
            return [
                "success": true,
                "hasActiveSubscription": true,
                "plan": plan,
                "billingPeriod": bestPeriod ?? "monthly",
                "productId": bestProductId ?? "",
                "transactionId": bestTransactionId != nil ? String(bestTransactionId!) : ""
            ]
        }

        return ["success": true, "hasActiveSubscription": false, "plan": "free"]
    }

    @available(iOS 15.0, *)
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw NSError(domain: "fAInance.StoreKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "La transazione App Store non è stata verificata."])
        case .verified(let safe):
            return safe
        }
    }
}
