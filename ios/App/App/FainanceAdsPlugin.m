#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FainanceAdsPlugin, "FainanceAds",
           CAP_PLUGIN_METHOD(requestConsent, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(showBanner, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(hideBanner, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(showRewarded, CAPPluginReturnPromise);
)
