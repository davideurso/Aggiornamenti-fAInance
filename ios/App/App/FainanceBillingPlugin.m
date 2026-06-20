#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FainanceBillingPlugin, "FainanceBilling",
           CAP_PLUGIN_METHOD(purchase, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(restorePurchases, CAPPluginReturnPromise);
)
