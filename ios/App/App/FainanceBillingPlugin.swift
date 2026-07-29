import Foundation
import Capacitor
import StoreKit

@objc(FainanceBillingPlugin)
public class FainanceBillingPlugin: CAPPlugin {
    private let productToPlan: [String: (plan: String, period: String)] = [
        "base_monthly": ("base", "monthly"),
        "base_yearly": ("base", "yearly"),
        "complete_monthly": ("premium", "monthly"),
        "complete_yearly": ("premium", "yearly")
    ]

    @objc func purchase(_ call: CAPPluginCall) {
        let productId = call.getString("productId") ?? ""
        if productId.isEmpty {
            call.reject("Missing productId")
            return
        }

        if #available(iOS 15.0, *) {
            Task {
                do {
                    let response = try await purchaseProduct(productId: productId)
                    await MainActor.run { call.resolve(response) }
                } catch {
                    await MainActor.run { call.reject(error.localizedDescription) }
                }
            }
        } else {
            call.reject("In-app purchases require iOS 15.0 or later")
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
            call.reject("Restore purchases requires iOS 15.0 or later")
        }
    }

    @available(iOS 15.0, *)
    private func purchaseProduct(productId: String) async throws -> [String: Any] {
        let products = try await Product.products(for: [productId])
        guard let product = products.first else {
            return ["success": false, "message": "Product not found"]
        }

        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await transaction.finish()
            let mapped = productToPlan[transaction.productID] ?? productToPlan[productId]
            return [
                "success": true,
                "productId": transaction.productID,
                "plan": mapped?.plan ?? "premium",
                "billingPeriod": mapped?.period ?? "monthly"
            ]
        case .userCancelled:
            return ["success": false, "cancelled": true]
        case .pending:
            return ["success": false, "pending": true]
        @unknown default:
            return ["success": false]
        }
    }

    @available(iOS 15.0, *)
    private func currentBestEntitlement() async throws -> [String: Any] {
        var bestPlan: String? = nil
        var bestPeriod: String? = nil
        var bestRank = -1
        var bestProductId: String? = nil

        for await result in Transaction.currentEntitlements {
            let transaction = try checkVerified(result)
            guard let mapped = productToPlan[transaction.productID] else { continue }
            let rank = mapped.plan == "premium" ? 2 : mapped.plan == "base" ? 1 : 0
            if rank > bestRank {
                bestRank = rank
                bestPlan = mapped.plan
                bestPeriod = mapped.period
                bestProductId = transaction.productID
            }
        }

        if let plan = bestPlan {
            return [
                "success": true,
                "plan": plan,
                "billingPeriod": bestPeriod ?? "monthly",
                "productId": bestProductId ?? ""
            ]
        }
        return ["success": false]
    }

    @available(iOS 15.0, *)
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw NSError(domain: "fAInance.StoreKit", code: 1, userInfo: [NSLocalizedDescriptionKey: "Transaction could not be verified"])
        case .verified(let safe):
            return safe
        }
    }
}
