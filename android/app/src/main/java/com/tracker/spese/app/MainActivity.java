package com.tracker.spese.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.fainance.widgets.WidgetBridge;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        registerPlugin(FainanceBillingPlugin.class);
        registerPlugin(FainanceAdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
