package com.tracker.spese.app;

import android.app.Application;
import android.os.Bundle;

import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.Iterator;

@CapacitorPlugin(name = "FainanceMetaEvents")
public class FainanceMetaEventsPlugin extends Plugin {
    private volatile boolean eventsEnabled = false;
    private volatile boolean activationLogged = false;

    @PluginMethod
    public void setConsent(PluginCall call) {
        boolean granted = Boolean.TRUE.equals(call.getBoolean("granted"));
        try {
            eventsEnabled = granted;
            FacebookSdk.setAdvertiserIDCollectionEnabled(false);
            // Raccolta automatica disattivata: vengono registrati soltanto gli eventi
            // esplicitamente richiesti dall’app dopo il consenso dell’utente.
            FacebookSdk.setAutoLogAppEventsEnabled(false);
            if (granted && !activationLogged && getContext().getApplicationContext() instanceof Application) {
                AppEventsLogger.activateApp((Application) getContext().getApplicationContext());
                activationLogged = true;
            }
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("granted", granted);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to update Meta App Events consent", error);
        }
    }

    @PluginMethod
    public void logEvent(PluginCall call) {
        if (!eventsEnabled) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("skipped", true);
            result.put("reason", "consent_not_granted");
            call.resolve(result);
            return;
        }

        String name = call.getString("name", "").trim();
        if (name.isEmpty()) {
            call.reject("Event name is required");
            return;
        }
        try {
            Bundle bundle = new Bundle();
            JSObject params = call.getObject("params");
            if (params != null) {
                Iterator<String> keys = params.keys();
                while (keys.hasNext()) {
                    String key = keys.next();
                    Object value = params.opt(key);
                    if (value == null || value == JSONObject.NULL) continue;
                    if (value instanceof Integer) bundle.putInt(key, (Integer) value);
                    else if (value instanceof Long) bundle.putLong(key, (Long) value);
                    else if (value instanceof Double) bundle.putDouble(key, (Double) value);
                    else if (value instanceof Float) bundle.putDouble(key, ((Float) value).doubleValue());
                    else if (value instanceof Boolean) bundle.putBoolean(key, (Boolean) value);
                    else bundle.putString(key, String.valueOf(value));
                }
            }
            AppEventsLogger logger = AppEventsLogger.newLogger(getContext());
            Double value = call.getDouble("value");
            if (value != null) logger.logEvent(name, value, bundle);
            else logger.logEvent(name, bundle);
            logger.flush();
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Unable to log Meta App Event", error);
        }
    }
}
