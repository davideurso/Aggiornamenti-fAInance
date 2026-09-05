import Foundation
import UIKit
import Capacitor
import GoogleMobileAds

@objc(FainanceAdsPlugin)
public class FainanceAdsPlugin: CAPPlugin, GADFullScreenContentDelegate, GADBannerViewDelegate {
    private var bannerView: GADBannerView?
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

        // FAINANCE_V99_IOS_BANNER_USES_WEB_SLOT
        // app.tsx misura gia lo slot superiore e passa la coordinata Y al plugin.
        // Il vecchio plugin ignorava completamente questi parametri e ancorava
        // sempre il banner in basso alla safe area.
        // FAINANCE_V102_IOS_SLOT_ALIGNMENT
        // app.tsx aggiunge +38 per il posizionamento Android. Su iOS la coordinata
        // viene applicata direttamente alla root view: rimuoviamo esattamente
        // quei 38 pt per centrare il banner nello slot bianco gia riservato.
        let requestedTop = max(0, self.requestedBannerTop(call) - 38)

        DispatchQueue.main.async {
            guard let root = self.rootViewController() else {
                call.reject("Root view controller not available")
                return
            }

            self.hideBannerView()

            let banner = GADBannerView(adSize: GADAdSizeBanner)
            banner.adUnitID = adUnitId
            banner.rootViewController = root
            banner.delegate = self
            banner.translatesAutoresizingMaskIntoConstraints = false
            root.view.addSubview(banner)

            root.view.layoutIfNeeded()
            let maximumTop = max(0, Int(root.view.bounds.height.rounded(.down)) - 50)
            let top = CGFloat(min(max(0, requestedTop), maximumTop))

            NSLayoutConstraint.activate([
                banner.centerXAnchor.constraint(equalTo: root.view.centerXAnchor),
                banner.topAnchor.constraint(equalTo: root.view.topAnchor, constant: top)
            ])

            root.view.bringSubviewToFront(banner)
            self.bannerView = banner
            banner.load(GADRequest())
            call.resolve(["success": true, "top": Int(top)])
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

    public func bannerViewDidReceiveAd(_ bannerView: GADBannerView) {
        guard self.bannerView === bannerView else { return }
        rootViewController()?.view.bringSubviewToFront(bannerView)
    }

    public func bannerView(_ bannerView: GADBannerView, didFailToReceiveAdWithError error: Error) {
        // Un banner vuoto non deve restare sopra la WebView e intercettare i tocchi.
        guard self.bannerView === bannerView else { return }
        hideBannerView()
        print("fAInance AdMob banner load failed: \(error.localizedDescription)")
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

    private func requestedBannerTop(_ call: CAPPluginCall) -> Int {
        return call.getInt("topMarginCssPx")
            ?? call.getInt("topMarginPx")
            ?? call.getInt("topMargin")
            ?? call.getInt("marginTop")
            ?? call.getInt("y")
            ?? call.getInt("top")
            ?? 0
    }

    private func hideBannerView() {
        bannerView?.delegate = nil
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
