package com.fainance.widgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.pm.PackageManager
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.tracker.spese.app.QuickAddWidgetProvider
import com.tracker.spese.app.ShareWidgetProvider
import com.tracker.spese.app.WidgetPlanGuard
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
            WidgetUtils.save(context, "widget_shopping_list_settings", call.getString("shoppingList") ?: "{}")
            WidgetUtils.save(context, "widget_fidelity_settings", call.getString("fidelity") ?: "{}")
            WidgetUtils.save(context, "widget_debt_credits_settings", call.getString("debtCredits") ?: "{}")
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
            syncVoiceAssistantProviderAvailability(context)
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
        WidgetUtils.save(context, "widget_order", arrayString(call, "widgetOrder"))
        WidgetUtils.save(context, "widget_display_order", arrayString(call, "widgetOrder"))
        WidgetUtils.save(context, "widget_plan_availability", objectString(call, "planAvailability"))
        syncVoiceAssistantProviderAvailability(context)
    }

    private fun syncVoiceAssistantProviderAvailability(context: android.content.Context) {
        val component = ComponentName(context, VoiceAssistantWidgetProvider::class.java)
        val desiredState = if (WidgetPlanGuard.isAllowed(context, "voiceAssistant")) {
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } else {
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED
        }
        try {
            context.packageManager.setComponentEnabledSetting(
                component,
                desiredState,
                PackageManager.DONT_KILL_APP
            )
        } catch (_: Exception) { }
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
        manager.getAppWidgetIds(ComponentName(context, ShoppingListWidgetProvider::class.java)).forEach {
            ShoppingListWidgetProvider.update(context, manager, it)
        }
        manager.getAppWidgetIds(ComponentName(context, FidelityWidgetProvider::class.java)).forEach {
            FidelityWidgetProvider.update(context, manager, it)
        }
        manager.getAppWidgetIds(ComponentName(context, DebtCreditsWidgetProvider::class.java)).forEach {
            DebtCreditsWidgetProvider.update(context, manager, it)
        }
        manager.getAppWidgetIds(ComponentName(context, VoiceAssistantWidgetProvider::class.java)).forEach {
            val updateIntent = android.content.Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
                component = ComponentName(context, VoiceAssistantWidgetProvider::class.java)
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(it))
            }
            context.sendBroadcast(updateIntent)
        }
    }
}
