package com.fainance.widgets

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

object WidgetUtils {
    private const val PREFS_NAME = "fainance_widget_prefs"

    fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(context: Context, key: String, value: String) {
        prefs(context).edit().putString(key, value).apply()
    }

    fun rawString(context: Context, key: String, fallback: String = ""): String {
        val prefNames = arrayOf(
            PREFS_NAME,
            "CapacitorStorage",
            context.packageName + "_preferences",
            "com.capacitorjs.plugins.preferences"
        )
        for (prefName in prefNames) {
            try {
                val raw = context.getSharedPreferences(prefName, Context.MODE_PRIVATE).getString(key, null)
                if (!raw.isNullOrBlank()) return raw
            } catch (_: Exception) {}
        }
        return fallback
    }

    fun json(context: Context, key: String): JSONObject {
        val raw = rawString(context, key, "{}")
        return try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
    }

    fun jsonArray(context: Context, key: String): JSONArray {
        val raw = rawString(context, key, "[]")
        return try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
    }

    fun currentPlan(context: Context): String {
        val plan = rawString(context, "widget_current_plan", "free").trim().lowercase()
        return if (plan == "base" || plan == "premium" || plan == "complete" || plan == "completa") plan else "free"
    }

    fun isWidgetAllowed(context: Context, type: String): Boolean {
        if (type == "quick") return true
        val planAllowed = planRank(currentPlan(context)) >= planRank(requiredPlan(type))
        if (!planAllowed) return false
        val availability = json(context, "widget_plan_availability")
        if (availability.has(type)) return availability.optBoolean(type, false)
        val available = jsonArray(context, "widget_available_types")
        if (available.length() > 0) {
            for (i in 0 until available.length()) if (available.optString(i) == type) return true
            return false
        }
        return true
    }

    fun requiredPlan(type: String): String {
        return when (type) {
            "note", "goal" -> "base"
            "share" -> "premium"
            else -> "free"
        }
    }

    fun requiredPlanLabel(type: String): String {
        return when (requiredPlan(type)) {
            "base" -> "Base"
            "premium" -> "Completa"
            else -> "Gratis"
        }
    }

    fun lockedWidgetTitle(type: String): String {
        return when (type) {
            "note" -> "Nota / Coordinata bloccato"
            "goal" -> "Obiettivo bloccato"
            "share" -> "Share bloccato"
            else -> "Widget bloccato"
        }
    }

    fun lockedWidgetMessage(type: String): String {
        return "Disponibile dal piano ${requiredPlanLabel(type)}. Apri Info in fAInance per cambiare piano."
    }

    private fun planRank(plan: String): Int {
        return when (plan) {
            "base" -> 1
            "premium", "complete", "completa" -> 2
            else -> 0
        }
    }

    fun instanceJson(context: Context, prefix: String, widgetId: Int): JSONObject {
        val raw = prefs(context).getString("${prefix}_${widgetId}", null)
        return if (raw.isNullOrBlank()) JSONObject() else try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
    }

    fun saveInstance(context: Context, prefix: String, widgetId: Int, value: String) {
        prefs(context).edit().putString("${prefix}_${widgetId}", value).apply()
    }

    fun deleteInstance(context: Context, prefix: String, widgetId: Int) {
        prefs(context).edit().remove("${prefix}_${widgetId}").apply()
    }

    fun openIntent(context: Context, url: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            setPackage(context.packageName)
            addCategory(Intent.CATEGORY_BROWSABLE)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val requestCode = url.hashCode()
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun configureNoteIntent(context: Context, widgetId: Int): PendingIntent {
        val intent = Intent(context, NoteWidgetConfigureActivity::class.java).apply {
            putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(context, widgetId + 210000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun configureGoalIntent(context: Context, widgetId: Int): PendingIntent {
        val intent = Intent(context, GoalWidgetConfigureActivity::class.java).apply {
            putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(context, widgetId + 220000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun money(value: Double, currency: String): String {
        val rounded = String.format(java.util.Locale.ITALY, "%,.0f", value).replace(',', '.')
        return "$rounded $currency"
    }

    fun bgDrawableName(transparency: Int): String {
        val safeTransparency = transparency.coerceIn(0, 100)
        val opacity = (100 - safeTransparency).coerceIn(0, 100)
        return "widget_panel_bg_$opacity"
    }

    fun bgDrawableRes(context: Context, alpha: Int): Int {
        val res = context.resources.getIdentifier(bgDrawableName(alpha), "drawable", context.packageName)
        return if (res != 0) res else context.resources.getIdentifier("widget_panel_bg", "drawable", context.packageName)
    }
}
