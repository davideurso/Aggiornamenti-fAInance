import Foundation
import UIKit
import Capacitor
import GoogleMobileAds

@objc(FainanceAdsPlugin)
public class FainanceAdsPlugin: CAPPlugin, GADFullScreenContentDelegate {
    private var bannerView: GADBannerView?
    private var bannerTopConstraint: NSLayoutConstraint?
    private var rewardedAd: GADRewardedAd?
    private var rewardedCall: CAPPluginCall?
    private var rewardedEarned = false

    public override func load() {
        DispatchQueue.main.async {
            GADMobileAds.sharedInstance().start(completionHandler: nil)
        }
    }

    @objc func requestConsent(_ call: CAPPluginCall) {
        // Placeholder hook for future UMP consent flow. AdMob can still initialize and load test/live ads.
        call.resolve(["success": true])
    }

    @objc func showBanner(_ call: CAPPluginCall) {
        let adUnitId = call.getString("adUnitId") ?? ""
        if adUnitId.isEmpty {
            call.reject("Missing adUnitId")
            return
        }
        DispatchQueue.main.async {
            guard let root = self.rootViewController() else {
                call.reject("Root view controller not available")
                return
            }
            let cssTop = call.getDouble("topMarginCssPx") ?? 0
            let webView = self.bridge?.webView
            let webOrigin = webView.map { $0.convert($0.bounds, to: root.view).minY } ?? 0
            let top = max(0, webOrigin + CGFloat(cssTop) * (webView?.scrollView.zoomScale ?? 1))
            if let existing = self.bannerView, existing.adUnitID == adUnitId {
                self.bannerTopConstraint?.constant = top
                call.resolve(["success": true])
                return
            }
            self.hideBannerView()
            let banner = GADBannerView(adSize: GADAdSizeBanner)
            banner.adUnitID = adUnitId
            banner.rootViewController = root
            banner.translatesAutoresizingMaskIntoConstraints = false
            root.view.addSubview(banner)
            let topConstraint = banner.topAnchor.constraint(equalTo: root.view.topAnchor, constant: top)
            self.bannerTopConstraint = topConstraint
            NSLayoutConstraint.activate([
                banner.centerXAnchor.constraint(equalTo: root.view.centerXAnchor),
                topConstraint
            ])
            banner.load(GADRequest())
            self.bannerView = banner
            call.resolve(["success": true])
        }
    }

    @objc func hideBanner(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.hideBannerView()
            call.resolve(["success": true])
        }
    }

    @objc func showRewarded(_ call: CAPPluginCall) {
        let adUnitId = call.getString("adUnitId") ?? ""
        if adUnitId.isEmpty {
            call.reject("Missing adUnitId")
            return
        }
        DispatchQueue.main.async {
            guard let root = self.rootViewController() else {
                call.reject("Root view controller not available")
                return
            }
            self.rewardedCall = call
            self.rewardedEarned = false
            GADRewardedAd.load(withAdUnitID: adUnitId, request: GADRequest()) { ad, error in
                if let error = error {
                    self.rewardedCall = nil
                    call.reject(error.localizedDescription)
                    return
                }
                guard let ad = ad else {
                    self.rewardedCall = nil
                    call.reject("Rewarded ad not loaded")
                    return
                }
                self.rewardedAd = ad
                self.rewardedAd?.fullScreenContentDelegate = self
                ad.present(fromRootViewController: root) {
                    self.rewardedEarned = true
                }
            }
        }
    }

    public func adDidDismissFullScreenContent(_ ad: GADFullScreenPresentingAd) {
        rewardedCall?.resolve(["rewarded": rewardedEarned])
        rewardedCall = nil
        rewardedAd = nil
        rewardedEarned = false
    }

    public func ad(_ ad: GADFullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        rewardedCall?.reject(error.localizedDescription)
        rewardedCall = nil
        rewardedAd = nil
        rewardedEarned = false
    }

    private func hideBannerView() {
        bannerTopConstraint?.isActive = false
        bannerTopConstraint = nil
        bannerView?.removeFromSuperview()
        bannerView = nil
    }

    private func rootViewController() -> UIViewController? {
        if let controller = bridge?.viewController { return controller }
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.flatMap { $0.windows }.first { $0.isKeyWindow }
        return window?.rootViewController
    }
}
