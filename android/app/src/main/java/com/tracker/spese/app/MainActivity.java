package com.tracker.spese.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.fainance.widgets.WidgetBridge;
import com.aparajita.capacitor.biometricauth.BiometricAuthNative;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        registerPlugin(FainanceBillingPlugin.class);
        registerPlugin(FainanceAdsPlugin.class);
        registerPlugin(FainanceContactsPlugin.class);
        registerPlugin(BiometricAuthNative.class);
        super.onCreate(savedInstanceState);
    }
}
