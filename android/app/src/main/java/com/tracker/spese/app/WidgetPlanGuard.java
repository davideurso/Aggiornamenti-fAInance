package com.tracker.spese.app;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

public final class WidgetPlanGuard {
    private WidgetPlanGuard() {}

    public static boolean isAllowed(Context context, String type) {
        if ("quick".equals(type)) return true;
        String plan = readString(context, "widget_current_plan", "free").trim().toLowerCase(java.util.Locale.ROOT);
        boolean planAllowed = rank(plan) >= rank(requiredPlan(type));
        if (!planAllowed) return false;
        JSONObject availability = readJson(context, "widget_plan_availability");
        if (availability.has(type)) return availability.optBoolean(type, false);
        JSONArray available = readArray(context, "widget_available_types");
        if (available.length() > 0) {
            for (int i = 0; i < available.length(); i++) {
                if (type.equals(available.optString(i))) return true;
            }
            return false;
        }
        return true;
    }

    public static String requiredPlanLabel(String type) {
        String required = requiredPlan(type);
        if ("base".equals(required)) return "Base";
        if ("premium".equals(required)) return "Completa";
        return "Gratis";
    }

    public static String lockedTitle(String type) {
        if ("share".equals(type)) return "Share bloccato";
        if ("goal".equals(type)) return "Obiettivo bloccato";
        if ("note".equals(type)) return "Nota / Coordinata bloccato";
        return "Widget bloccato";
    }

    public static String lockedMessage(String type) {
        return "Disponibile dal piano " + requiredPlanLabel(type) + ". Apri Info in fAInance per cambiare piano.";
    }

    private static String requiredPlan(String type) {
        if ("note".equals(type) || "goal".equals(type)) return "base";
        if ("share".equals(type)) return "premium";
        return "free";
    }

    private static int rank(String plan) {
        if ("base".equals(plan)) return 1;
        if ("premium".equals(plan) || "complete".equals(plan) || "completa".equals(plan)) return 2;
        return 0;
    }

    private static String readString(Context context, String key, String fallback) {
        String[] prefNames = new String[]{
                "fainance_widget_prefs",
                "CapacitorStorage",
                context.getPackageName() + "_preferences",
                "com.capacitorjs.plugins.preferences"
        };
        for (String prefName : prefNames) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(prefName, Context.MODE_PRIVATE);
                String raw = prefs.getString(key, null);
                if (raw != null && raw.trim().length() > 0) return raw;
            } catch (Exception ignored) {}
        }
        return fallback;
    }

    private static JSONObject readJson(Context context, String key) {
        try { return new JSONObject(readString(context, key, "{}")); } catch (Exception e) { return new JSONObject(); }
    }

    private static JSONArray readArray(Context context, String key) {
        try { return new JSONArray(readString(context, key, "[]")); } catch (Exception e) { return new JSONArray(); }
    }
}
