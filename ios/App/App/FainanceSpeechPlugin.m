#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FainanceSpeechPlugin, "FainanceSpeech",
           CAP_PLUGIN_METHOD(available, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(isListening, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(speechCheckPermissions, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(speechRequestPermissions, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(checkMicrophonePermission, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(requestMicrophonePermission, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(start, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(stop, CAPPluginReturnPromise);
)
