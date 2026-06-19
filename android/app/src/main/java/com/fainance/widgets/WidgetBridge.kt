package com.fainance.widgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.tracker.spese.app.QuickAddWidgetProvider
import com.tracker.spese.app.ShareWidgetProvider
import org.json.JSONArray
import org.json.JSONObject

@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridge : Plugin() {
    @PluginMethod
    fun saveAndUpdateWidgets(call: PluginCall) {
        try {
            val context = context
            WidgetUtils.save(context, "widget_settings_v2", call.getString("settings") ?: "{}")
            WidgetUtils.save(context, "widget_quick_add_settings", call.getString("quickAdd") ?: "{}")
            WidgetUtils.save(context, "widget_note_settings", call.getString("note") ?: "{}")
            WidgetUtils.save(context, "widget_goal_settings", call.getString("goal") ?: "{}")
            WidgetUtils.save(context, "widget_share_settings", call.getString("share") ?: "{}")
            saveAvailabilityPayload(call)
            updateWidgets(context)
            val ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("WidgetBridge saveAndUpdateWidgets error: ${e.message}", e)
        }
    }

    @PluginMethod
    fun setWidgetAvailability(call: PluginCall) {
        try {
            saveAvailabilityPayload(call)
            updateWidgets(context)
            val ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("WidgetBridge setWidgetAvailability error: ${e.message}", e)
        }
    }

    @PluginMethod
    fun setAvailableWidgets(call: PluginCall) {
        try {
            val currentPlan = call.getString("currentPlan") ?: "free"
            WidgetUtils.save(context, "widget_current_plan", currentPlan)
            WidgetUtils.save(context, "widget_available_types", arrayString(call, "types"))
            updateWidgets(context)
            val ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("WidgetBridge setAvailableWidgets error: ${e.message}", e)
        }
    }

    @PluginMethod
    fun updateQuickAddWidget(call: PluginCall) {
        try {
            QuickAddWidgetProvider.updateAllWidgets(context)
            val ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("WidgetBridge updateQuickAddWidget error: ${e.message}", e)
        }
    }

    @PluginMethod
    fun updateAllWidgets(call: PluginCall) {
        try {
            updateWidgets(context)
            val ret = JSObject()
            ret.put("updated", true)
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("WidgetBridge updateAllWidgets error: ${e.message}", e)
        }
    }

    private fun saveAvailabilityPayload(call: PluginCall) {
        WidgetUtils.save(context, "widget_current_plan", call.getString("currentPlan") ?: "free")
        WidgetUtils.save(context, "widget_available_types", arrayString(call, "availableTypes"))
        WidgetUtils.save(context, "widget_enabled_types", arrayString(call, "enabledTypes"))
        WidgetUtils.save(context, "widget_disabled_types", arrayString(call, "disabledTypes"))
        WidgetUtils.save(context, "widget_plan_availability", objectString(call, "planAvailability"))
    }

    private fun arrayString(call: PluginCall, key: String): String {
        return try {
            val arr = call.data.optJSONArray(key)
            arr?.toString() ?: call.getString(key) ?: "[]"
        } catch (_: Exception) { call.getString(key) ?: "[]" }
    }

    private fun objectString(call: PluginCall, key: String): String {
        return try {
            val obj = call.data.optJSONObject(key)
            obj?.toString() ?: call.getString(key) ?: "{}"
        } catch (_: Exception) { call.getString(key) ?: "{}" }
    }

    private fun updateWidgets(context: android.content.Context) {
        QuickAddWidgetProvider.updateAllWidgets(context)

        val manager = AppWidgetManager.getInstance(context)
        manager.getAppWidgetIds(ComponentName(context, NoteWidgetProvider::class.java)).forEach {
            NoteWidgetProvider.update(context, manager, it)
        }
        manager.getAppWidgetIds(ComponentName(context, GoalWidgetProvider::class.java)).forEach {
            GoalWidgetProvider.update(context, manager, it)
        }
        ShareWidgetProvider.updateAllWidgets(context)
    }
}
