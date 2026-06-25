#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FainanceWidgetBridgePlugin, "FainanceWidgetBridge",
    CAP_PLUGIN_METHOD(saveAll, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(reload, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clear, CAPPluginReturnPromise);
)
