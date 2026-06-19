package com.tracker.spese.app;

import android.app.Activity;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardItem;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

import com.google.android.ump.ConsentDebugSettings;
import com.google.android.ump.ConsentForm;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

@CapacitorPlugin(name = "FainanceAds")
public class FainanceAdsPlugin extends Plugin {
    private static final String DEFAULT_BANNER_UNIT_ID = "ca-app-pub-4502496181111632/3175905788";
    private static final String DEFAULT_REWARDED_UNIT_ID = "ca-app-pub-4502496181111632/2700092208";
    private boolean initialized = false;
    private AdView bannerView = null;
    private ConsentInformation consentInformation;

    private void ensureInitialized() {
        if (initialized) return;
        initialized = true;
        MobileAds.initialize(getContext(), initializationStatus -> {});
    }

    @PluginMethod
    public void requestConsent(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("message", "Activity not available");
            call.resolve(ret);
            return;
        }
        ensureInitialized();
        consentInformation = UserMessagingPlatform.getConsentInformation(activity);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().build();
        activity.runOnUiThread(() -> consentInformation.requestConsentInfoUpdate(
            activity,
            params,
            () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                activity,
                formError -> {
                    JSObject ret = new JSObject();
                    ret.put("success", formError == null);
                    ret.put("canRequestAds", consentInformation.canRequestAds());
                    if (formError != null) ret.put("message", formError.getMessage());
                    call.resolve(ret);
                }
            ),
            requestConsentError -> {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("canRequestAds", consentInformation.canRequestAds());
                ret.put("message", requestConsentError.getMessage());
                call.resolve(ret);
            }
        ));
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        ensureInitialized();
        String adUnitId = call.getString("adUnitId", DEFAULT_REWARDED_UNIT_ID);
        activity.runOnUiThread(() -> RewardedAd.load(
            activity,
            adUnitId,
            new AdRequest.Builder().build(),
            new RewardedAdLoadCallback() {
                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("rewarded", false);
                    ret.put("message", loadAdError.getMessage());
                    call.resolve(ret);
                }

                @Override
                public void onAdLoaded(@NonNull RewardedAd rewardedAd) {
                    final boolean[] rewarded = {false};
                    rewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            JSObject ret = new JSObject();
                            ret.put("success", true);
                            ret.put("rewarded", rewarded[0]);
                            call.resolve(ret);
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                            JSObject ret = new JSObject();
                            ret.put("success", false);
                            ret.put("rewarded", false);
                            ret.put("message", adError.getMessage());
                            call.resolve(ret);
                        }
                    });
                    rewardedAd.show(activity, rewardItem -> rewarded[0] = true);
                }
            }
        ));
    }

    @PluginMethod
    public void showBanner(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }
        ensureInitialized();
        String adUnitId = call.getString("adUnitId", DEFAULT_BANNER_UNIT_ID);
        Integer topMarginCssPxValue = call.getInt("topMarginCssPx");
        Integer topMarginPxValue = call.getInt("topMarginPx");
        Integer topMarginValue = call.getInt("topMargin");
        int topMarginDp = call.getInt("topMarginDp", 96);
        activity.runOnUiThread(() -> {
            try {
                hideBannerInternal();
                bannerView = new AdView(activity);
                bannerView.setAdUnitId(adUnitId);
                bannerView.setAdSize(AdSize.BANNER);
                FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                );
                params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                float density = activity.getResources().getDisplayMetrics().density;
                int requestedTopPx;
                if (topMarginCssPxValue != null) {
                    // La WebView misura lo slot in CSS px / dp. Il layout nativo Android usa pixel reali.
                    // Convertiamo qui, senza offset fissi: se l'header sparisce, la misura dello slot sale automaticamente.
                    requestedTopPx = Math.round(topMarginCssPxValue * density);
                } else if (topMarginPxValue != null) {
                    requestedTopPx = topMarginPxValue;
                } else if (topMarginValue != null) {
                    requestedTopPx = topMarginValue;
                } else {
                    requestedTopPx = Math.round(topMarginDp * density);
                }
                params.topMargin = Math.max(0, requestedTopPx);
                activity.addContentView(bannerView, params);
                bannerView.loadAd(new AdRequest.Builder().build());
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) activity.runOnUiThread(this::hideBannerInternal);
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private void hideBannerInternal() {
        if (bannerView != null) {
            try {
                ViewGroup parent = (ViewGroup) bannerView.getParent();
                if (parent != null) parent.removeView(bannerView);
                bannerView.destroy();
            } catch (Exception ignored) {}
            bannerView = null;
        }
    }
}
