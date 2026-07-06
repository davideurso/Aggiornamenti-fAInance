package com.fainance.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

class QuickAddWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { update(context, appWidgetManager, it) }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        update(context, appWidgetManager, appWidgetId)
    }

    companion object {
        private const val PREFS_KEY = "widget_quick_add_settings"
        private const val REQUEST_EXPENSE = 1001
        private const val REQUEST_INCOME = 1002
        private const val REQUEST_SETTINGS = 1003

        fun updateAllWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val component = ComponentName(context, QuickAddWidgetProvider::class.java)
            manager.getAppWidgetIds(component).forEach { update(context, manager, it) }
        }

        fun update(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val settings = readSettings(context)
            val options = manager.getAppWidgetOptions(widgetId)
            val minHeight = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT) ?: 0
            val minWidth = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) ?: 0
            val compact = (minHeight > 0 && minHeight < 105) || (minWidth > 0 && minWidth < 220)
            val layoutName = if (compact) "widget_quick_add_compact" else "widget_quick_add"
            val layoutId = context.resources.getIdentifier(layoutName, "layout", context.packageName)
            if (layoutId == 0) return

            val views = RemoteViews(context.packageName, layoutId)
            val bgTransparency = settings.optInt("bgAlpha", 65).coerceIn(0, 100)
            val bgOpacity = ((100 - bgTransparency) * 255 / 100).coerceIn(0, 255)
            val bgId = context.resources.getIdentifier("widget_root_bg", "id", context.packageName)
            if (bgId != 0) views.setInt(bgId, "setImageAlpha", bgOpacity)

            setText(context, views, "widget_add_expense_icon", "−")
            setText(context, views, "widget_add_income_icon", "+")
            setText(context, views, "widget_add_expense_label", cleanActionLabel(settings.optString("expenseLabel", "Uscita"), "Uscita"))
            setText(context, views, "widget_add_income_label", cleanActionLabel(settings.optString("incomeLabel", "Entrata"), "Entrata"))

            if (!compact) {
                setText(context, views, "widget_title", safe(settings.optString("title", "fAInance"), "fAInance"))
                setText(context, views, "widget_subtitle", safe(settings.optString("subtitle", "Aggiunta rapida movimenti"), "Aggiunta rapida movimenti"))
                val headerId = context.resources.getIdentifier("widget_header", "id", context.packageName)
                if (headerId != 0) views.setViewVisibility(headerId, if (settings.optBoolean("showHeader", true)) View.VISIBLE else View.GONE)
                setClick(context, views, "widget_open_settings", "fainance://widget-settings", REQUEST_SETTINGS)
            } else {
                setClick(context, views, "widget_open_settings_compact", "fainance://widget-settings", REQUEST_SETTINGS)
            }

            setClick(context, views, "widget_add_expense", "fainance://add-expense", REQUEST_EXPENSE)
            setClick(context, views, "widget_add_income", "fainance://add-income", REQUEST_INCOME)

            manager.updateAppWidget(widgetId, views)
        }

        private fun setText(context: Context, views: RemoteViews, idName: String, value: String) {
            val id = context.resources.getIdentifier(idName, "id", context.packageName)
            if (id != 0) views.setTextViewText(id, value)
        }

        private fun setClick(context: Context, views: RemoteViews, idName: String, url: String, requestCode: Int) {
            val id = context.resources.getIdentifier(idName, "id", context.packageName)
            if (id != 0) views.setOnClickPendingIntent(id, createDeepLinkIntent(context, url, requestCode))
        }

        private fun createDeepLinkIntent(context: Context, url: String, requestCode: Int): PendingIntent {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                setPackage(context.packageName)
                addCategory(Intent.CATEGORY_BROWSABLE)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun readSettings(context: Context): JSONObject {
            val prefNames = arrayOf(
                "CapacitorStorage",
                context.packageName + "_preferences",
                "com.capacitorjs.plugins.preferences",
                "fainance_widget_prefs"
            )
            for (prefName in prefNames) {
                try {
                    val raw = context.getSharedPreferences(prefName, Context.MODE_PRIVATE).getString(PREFS_KEY, null)
                    if (!raw.isNullOrBlank()) return JSONObject(raw)
                } catch (_: Exception) {}
            }
            return JSONObject()
        }

        private fun safe(value: String?, fallback: String): String {
            val cleaned = value?.trim().orEmpty()
            return cleaned.ifEmpty { fallback }
        }

        private fun cleanActionLabel(value: String?, fallback: String): String {
            val cleaned = safe(value, fallback).replace(Regex("^\\s*[+\\-−]\\s*"), "").trim()
            return cleaned.ifEmpty { fallback }
        }
    }
}
