package com.tracker.spese.app;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Task;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

@CapacitorPlugin(name = "FainanceAppUpdate")
public class FainanceAppUpdatePlugin extends Plugin {

    private static final String APP_UPDATE_MANAGER_FACTORY =
        "com.google.android.play.core.appupdate.AppUpdateManagerFactory";
    private static final String UPDATE_AVAILABILITY =
        "com.google.android.play.core.install.model.UpdateAvailability";
    private static final String APP_UPDATE_TYPE =
        "com.google.android.play.core.install.model.AppUpdateType";

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        try {
            Class<?> factoryClass = Class.forName(APP_UPDATE_MANAGER_FACTORY);
            Method createMethod = factoryClass.getMethod("create", Context.class);
            Object manager = createMethod.invoke(null, getContext());

            if (manager == null) {
                resolveUnavailable(call, "AppUpdateManager non disponibile.");
                return;
            }

            Method getInfoMethod = manager.getClass().getMethod("getAppUpdateInfo");
            Object taskObject = getInfoMethod.invoke(manager);

            if (!(taskObject instanceof Task)) {
                resolveUnavailable(call, "Risposta Google Play non valida.");
                return;
            }

            Task<?> task = (Task<?>) taskObject;
            task.addOnSuccessListener(info -> resolveUpdateInfo(call, info));
            task.addOnFailureListener(error ->
                resolveUnavailable(call, error != null ? error.getMessage() : "Controllo Google Play non riuscito.")
            );
        } catch (ClassNotFoundException error) {
            // La compilazione resta valida anche se la dipendenza non è stata ancora
            // scaricata. Il codice web utilizzerà il controllo remoto di riserva.
            resolveUnavailable(call, "Libreria aggiornamenti Google Play non disponibile.");
        } catch (Exception error) {
            resolveUnavailable(call, error.getMessage());
        }
    }

    private void resolveUpdateInfo(PluginCall call, Object info) {
        try {
            int availability = invokeInt(info, "updateAvailability", 0);
            int updateAvailable = readStaticInt(UPDATE_AVAILABILITY, "UPDATE_AVAILABLE", 2);
            int updateInProgress = readStaticInt(
                UPDATE_AVAILABILITY,
                "DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS",
                3
            );

            boolean isAvailable = availability == updateAvailable || availability == updateInProgress;

            JSObject result = new JSObject();
            result.put("supported", true);
            result.put("updateAvailable", isAvailable);
            result.put("updateAvailability", availability);

            if (isAvailable) {
                int immediate = readStaticInt(APP_UPDATE_TYPE, "IMMEDIATE", 1);
                int flexible = readStaticInt(APP_UPDATE_TYPE, "FLEXIBLE", 0);

                result.put("availableVersionCode", invokeInt(info, "availableVersionCode", 0));
                result.put("immediateAllowed", invokeBooleanWithInt(info, "isUpdateTypeAllowed", immediate));
                result.put("flexibleAllowed", invokeBooleanWithInt(info, "isUpdateTypeAllowed", flexible));
            }

            call.resolve(result);
        } catch (Exception error) {
            resolveUnavailable(call, error.getMessage());
        }
    }

    private int invokeInt(Object target, String methodName, int fallback) {
        if (target == null) {
            return fallback;
        }
        try {
            Method method = target.getClass().getMethod(methodName);
            Object value = method.invoke(target);
            return value instanceof Number ? ((Number) value).intValue() : fallback;
        } catch (Exception error) {
            return fallback;
        }
    }

    private boolean invokeBooleanWithInt(Object target, String methodName, int value) {
        if (target == null) {
            return false;
        }
        try {
            Method method = target.getClass().getMethod(methodName, int.class);
            Object result = method.invoke(target, value);
            return result instanceof Boolean && (Boolean) result;
        } catch (Exception error) {
            return false;
        }
    }

    private int readStaticInt(String className, String fieldName, int fallback) {
        try {
            Class<?> targetClass = Class.forName(className);
            Field field = targetClass.getField(fieldName);
            return field.getInt(null);
        } catch (Exception error) {
            return fallback;
        }
    }

    private void resolveUnavailable(PluginCall call, String message) {
        JSObject result = new JSObject();
        result.put("supported", false);
        result.put("updateAvailable", false);
        if (message != null && !message.trim().isEmpty()) {
            result.put("error", message);
        }
        call.resolve(result);
    }
}
