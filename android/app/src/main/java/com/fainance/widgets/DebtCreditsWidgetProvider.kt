package com.fainance.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.view.View
import android.util.TypedValue
import android.widget.RemoteViews
import org.json.JSONArray

class DebtCreditsWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it) } }
    override fun onDeleted(context: Context, ids: IntArray) { ids.forEach { WidgetUtils.deleteInstance(context, "widget_debt_credits_instance", it) } }

    companion object {
        fun update(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val layoutId = context.resources.getIdentifier("widget_debt_credits", "layout", context.packageName)
            if (layoutId == 0) return
            val views = RemoteViews(context.packageName, layoutId)
            val titleId = context.resources.getIdentifier("widgetTitle", "id", context.packageName)
            val summaryId = context.resources.getIdentifier("widgetSummary", "id", context.packageName)
            val lineNames = arrayOf("line1", "line2", "line3", "line4", "line5")
            val settingsId = context.resources.getIdentifier("settingsButton", "id", context.packageName)
            val rootId = context.resources.getIdentifier("widgetRoot", "id", context.packageName)
            if (!WidgetUtils.isWidgetAllowed(context, "debtCredits")) {
                views.setTextViewText(titleId, "🔒 Debiti / Crediti")
                views.setTextViewText(summaryId, WidgetUtils.lockedWidgetMessage("debtCredits"))
                lineNames.forEach { views.setViewVisibility(context.resources.getIdentifier(it, "id", context.packageName), View.GONE) }
                manager.updateAppWidget(widgetId, views); return
            }
            val cfg = WidgetUtils.json(context, "widget_debt_credits_settings")
            val titleColor = WidgetUtils.parseColor(cfg.optString("titleColor", "#FFFFFF"), android.graphics.Color.WHITE)
            val textColor = WidgetUtils.parseColor(cfg.optString("textColor", "#EDEDF7"), android.graphics.Color.rgb(237,237,247))
            val iconColor = WidgetUtils.parseColor(cfg.optString("iconColor", cfg.optString("accentColor", "#7F77DD")), android.graphics.Color.rgb(127,119,221))
            val textSize = cfg.optDouble("textSize", 13.0).toFloat()
            views.setTextColor(titleId, titleColor)
            views.setTextColor(summaryId, textColor)
            views.setTextColor(settingsId, iconColor)
            views.setTextViewTextSize(titleId, TypedValue.COMPLEX_UNIT_SP, textSize + 2f)
            views.setTextViewTextSize(summaryId, TypedValue.COMPLEX_UNIT_SP, textSize + 1f)
            val bgAlpha = cfg.optInt("bgAlpha", 65).coerceIn(0, 100)
            val bgDrawableAlpha = (100 - bgAlpha).coerceIn(0, 100)
            views.setInt(rootId, "setBackgroundResource", WidgetUtils.bgDrawableRes(context, bgDrawableAlpha))
            val instance = WidgetUtils.instanceJson(context, "widget_debt_credits_instance", widgetId)
            val lineViewIds = lineNames.map { context.resources.getIdentifier(it, "id", context.packageName) }.toIntArray()
            lineViewIds.forEach { id -> if (id != 0) { views.setTextColor(id, textColor); views.setTextViewTextSize(id, TypedValue.COMPLEX_UNIT_SP, textSize) } }
            val opts = manager.getAppWidgetOptions(widgetId)
            val compact = opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 120) <= 70
            if (compact) {
                for (i in 1 until lineViewIds.size) if (lineViewIds[i] != 0) views.setViewVisibility(lineViewIds[i], View.GONE)
            }
            val selectedIds = instance.optJSONArray("selectedIds") ?: cfg.optJSONArray("selectedIds") ?: JSONArray()
            val allItems = cfg.optJSONArray("allItems") ?: cfg.optJSONArray("items") ?: JSONArray()
            val items = JSONArray()
            if (selectedIds.length() > 0) {
                for (i in 0 until allItems.length()) {
                    val obj = allItems.optJSONObject(i) ?: continue
                    for (j in 0 until selectedIds.length()) if (obj.optString("id") == selectedIds.optString(j)) items.put(obj)
                }
            } else {
                for (i in 0 until allItems.length()) items.put(allItems.opt(i))
            }
            var debt = 0.0; var credit = 0.0
            for (i in 0 until items.length()) {
                val obj = items.optJSONObject(i) ?: continue
                if (obj.optString("kind") == "credit") credit += obj.optDouble("balance") else debt += obj.optDouble("balance")
            }
            val currency = cfg.optString("currency", "€")
            val net = credit - debt
            views.setTextViewText(titleId, cfg.optString("title", "Debiti / Crediti"))
            views.setTextViewText(summaryId, "Saldo ${WidgetUtils.money(net, currency)}")
            for (i in lineNames.indices) {
                val id = context.resources.getIdentifier(lineNames[i], "id", context.packageName)
                if (i == 0) {
                    views.setViewVisibility(id, View.VISIBLE)
                    views.setTextViewText(id, "Debiti ${WidgetUtils.money(debt, currency)}  ·  Crediti ${WidgetUtils.money(credit, currency)}")
                } else {
                    val itemIndex = i - 1
                    if (itemIndex < items.length()) {
                        val obj = items.optJSONObject(itemIndex)
                        views.setViewVisibility(id, View.VISIBLE)
                        views.setTextViewText(id, (if (obj?.optString("kind") == "credit") "📈 " else "📉 ") + (obj?.optString("holder") ?: "") + " · " + WidgetUtils.money(obj?.optDouble("balance") ?: 0.0, currency))
                    } else views.setViewVisibility(id, View.GONE)
                }
            }
            views.setOnClickPendingIntent(rootId, WidgetUtils.openIntent(context, "fainance://open-debt-credits"))
            if (settingsId != 0) views.setOnClickPendingIntent(settingsId, WidgetUtils.configureDebtCreditsIntent(context, widgetId))
            manager.updateAppWidget(widgetId, views)
        }
    }
}
