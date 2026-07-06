package com.fainance.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

class GoalWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { update(context, manager, it) }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        appWidgetIds.forEach { WidgetUtils.deleteInstance(context, "goal_widget", it) }
        super.onDeleted(context, appWidgetIds)
    }

    companion object {
        fun update(context: Context, manager: AppWidgetManager, widgetId: Int) {
            if (!WidgetUtils.isWidgetAllowed(context, "goal")) {
                renderLocked(context, manager, widgetId)
                return
            }
            val global = WidgetUtils.json(context, "widget_goal_settings")
            val local = WidgetUtils.instanceJson(context, "goal_widget", widgetId)
            val content = resolveContent(global, local)
            val layoutId = context.resources.getIdentifier("widget_goal", "layout", context.packageName)
            if (layoutId == 0) return
            val views = RemoteViews(context.packageName, layoutId)
            val currency = content.optString("currency", global.optString("currency", "€"))
            val title = content.optString("title", "Nessun obiettivo")
            val icon = content.optString("icon", "🎯")
            val saved = content.optDouble("saved", 0.0)
            val target = content.optDouble("target", 0.0)
            val percent = content.optInt("percent", if (target > 0) ((saved / target) * 100).toInt() else 0).coerceIn(0, 100)
            val showPercent = global.optBoolean("showPercent", true)
            val showAmounts = global.optBoolean("showAmounts", true)
            val bgAlpha = global.optInt("bgAlpha", 65).coerceIn(0, 100)
            val accent = parseColor(content.optString("color", global.optString("accentColor", "#EF7D00")), "#EF7D00")
            val textColor = parseColor(content.optString("textColor", global.optString("textColor", "#FFFFFF")), "#FFFFFF")
            val percentColor = parseColor(content.optString("percentColor", global.optString("percentColor", "#EF7D00")), "#EF7D00")

            val bgDrawableAlpha = (100 - bgAlpha).coerceIn(0, 100)
            views.setInt(context.resources.getIdentifier("widgetRoot", "id", context.packageName), "setBackgroundResource", WidgetUtils.bgDrawableRes(context, bgDrawableAlpha))
            views.setTextViewText(context.resources.getIdentifier("goalIcon", "id", context.packageName), icon)
            views.setTextViewText(context.resources.getIdentifier("goalTitle", "id", context.packageName), title)
            views.setTextColor(context.resources.getIdentifier("goalTitle", "id", context.packageName), textColor)
            views.setTextViewText(context.resources.getIdentifier("goalPercent", "id", context.packageName), "$percent%")
            views.setTextColor(context.resources.getIdentifier("goalPercent", "id", context.packageName), percentColor)
            views.setViewVisibility(context.resources.getIdentifier("goalPercent", "id", context.packageName), if (showPercent) View.VISIBLE else View.GONE)
            val progressId = context.resources.getIdentifier("goalProgress", "id", context.packageName)
            views.setProgressBar(progressId, 100, percent, false)
            views.setColorStateList(progressId, "setProgressTintList", ColorStateList.valueOf(accent))
            views.setTextViewText(context.resources.getIdentifier("goalAmounts", "id", context.packageName), "${WidgetUtils.money(saved, currency)} / ${WidgetUtils.money(target, currency)}")
            views.setTextColor(context.resources.getIdentifier("goalAmounts", "id", context.packageName), textColor)
            views.setViewVisibility(context.resources.getIdentifier("goalAmounts", "id", context.packageName), if (showAmounts) View.VISIBLE else View.GONE)
            views.setOnClickPendingIntent(context.resources.getIdentifier("widgetRoot", "id", context.packageName), WidgetUtils.openIntent(context, "fainance://open-goals"))
            views.setOnClickPendingIntent(context.resources.getIdentifier("goalSettings", "id", context.packageName), WidgetUtils.configureGoalIntent(context, widgetId))

            manager.updateAppWidget(widgetId, views)
        }

        private fun renderLocked(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val layoutId = context.resources.getIdentifier("widget_goal", "layout", context.packageName)
            if (layoutId == 0) return
            val views = RemoteViews(context.packageName, layoutId)
            views.setInt(context.resources.getIdentifier("widgetRoot", "id", context.packageName), "setBackgroundResource", WidgetUtils.bgDrawableRes(context, 35))
            views.setTextViewText(context.resources.getIdentifier("goalIcon", "id", context.packageName), "🔒")
            views.setTextViewText(context.resources.getIdentifier("goalTitle", "id", context.packageName), WidgetUtils.lockedWidgetTitle("goal"))
            views.setTextViewText(context.resources.getIdentifier("goalPercent", "id", context.packageName), "")
            views.setTextViewText(context.resources.getIdentifier("goalAmounts", "id", context.packageName), WidgetUtils.lockedWidgetMessage("goal"))
            views.setTextColor(context.resources.getIdentifier("goalTitle", "id", context.packageName), Color.WHITE)
            views.setTextColor(context.resources.getIdentifier("goalAmounts", "id", context.packageName), Color.rgb(255, 214, 102))
            views.setViewVisibility(context.resources.getIdentifier("goalPercent", "id", context.packageName), View.GONE)
            val progressId = context.resources.getIdentifier("goalProgress", "id", context.packageName)
            views.setProgressBar(progressId, 100, 0, false)
            views.setViewVisibility(progressId, View.GONE)
            views.setOnClickPendingIntent(context.resources.getIdentifier("widgetRoot", "id", context.packageName), WidgetUtils.openIntent(context, "fainance://open-plan-info"))
            views.setOnClickPendingIntent(context.resources.getIdentifier("goalSettings", "id", context.packageName), WidgetUtils.openIntent(context, "fainance://open-plan-info"))
            manager.updateAppWidget(widgetId, views)
        }

        private fun resolveContent(global: JSONObject, local: JSONObject): JSONObject {
            val selectedId = local.optString("selectedGoalId", global.optString("selectedGoalId", ""))
            val item = findById(global.optJSONArray("goalItems"), selectedId)
            return JSONObject().apply {
                put("selectedGoalId", selectedId)
                put("title", item?.optString("title") ?: local.optString("title", "Nessun obiettivo"))
                put("icon", item?.optString("icon") ?: local.optString("icon", "🎯"))
                put("saved", item?.optDouble("saved") ?: local.optDouble("saved", 0.0))
                put("target", item?.optDouble("target") ?: local.optDouble("target", 0.0))
                put("percent", item?.optInt("percent") ?: local.optInt("percent", 0))
                put("color", item?.optString("color") ?: local.optString("color", global.optString("accentColor", "#EF7D00")))
                put("textColor", item?.optString("textColor") ?: local.optString("textColor", global.optString("textColor", "#FFFFFF")))
                put("percentColor", item?.optString("percentColor") ?: local.optString("percentColor", global.optString("percentColor", "#EF7D00")))
                put("currency", item?.optString("currency") ?: local.optString("currency", global.optString("currency", "€")))
            }
        }

        private fun findById(arr: JSONArray?, id: String): JSONObject? {
            if (arr == null) return null
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                if (obj.optString("id") == id) return obj
            }
            return if (arr.length() > 0) arr.optJSONObject(0) else null
        }

        private fun parseColor(value: String, fallback: String): Int {
            return try { Color.parseColor(value) } catch (_: Exception) { Color.parseColor(fallback) }
        }
    }
}
