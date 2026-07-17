package com.fainance.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

class FidelityWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it) } }
    override fun onDeleted(context: Context, ids: IntArray) { ids.forEach { WidgetUtils.deleteInstance(context, "widget_fidelity_instance", it) } }

    companion object {
        fun update(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val layoutId = context.resources.getIdentifier("widget_fidelity", "layout", context.packageName)
            if (layoutId == 0) return
            val views = RemoteViews(context.packageName, layoutId)
            val titleId = context.resources.getIdentifier("widgetTitle", "id", context.packageName)
            val nameId = context.resources.getIdentifier("cardName", "id", context.packageName)
            val codeId = context.resources.getIdentifier("cardCode", "id", context.packageName)
            val barcodeId = context.resources.getIdentifier("barcodeText", "id", context.packageName)
            val barcodeImageId = context.resources.getIdentifier("barcodeImage", "id", context.packageName)
            val rootId = context.resources.getIdentifier("widgetRoot", "id", context.packageName)
            val settingsId = context.resources.getIdentifier("settingsButton", "id", context.packageName)
            if (!WidgetUtils.isWidgetAllowed(context, "fidelity")) {
                views.setTextViewText(titleId, "🔒 Fidelity")
                views.setTextViewText(nameId, WidgetUtils.lockedWidgetMessage("fidelity"))
                views.setViewVisibility(codeId, View.GONE)
                views.setViewVisibility(barcodeId, View.GONE)
                if (barcodeImageId != 0) views.setViewVisibility(barcodeImageId, View.GONE)
                views.setOnClickPendingIntent(rootId, WidgetUtils.openIntent(context, "fainance://open-plan-info"))
                manager.updateAppWidget(widgetId, views); return
            }
            val cfg = WidgetUtils.json(context, "widget_fidelity_settings")
            val instance = WidgetUtils.instanceJson(context, "widget_fidelity_instance", widgetId)
            val selectedId = instance.optString("selectedCardId", cfg.optString("selectedCardId", ""))
            val cards = cfg.optJSONArray("cards")
            var card = cfg.optJSONObject("selectedCard")
            if (cards != null && selectedId.isNotBlank()) {
                for (i in 0 until cards.length()) {
                    val obj = cards.optJSONObject(i) ?: continue
                    if (obj.optString("id") == selectedId) { card = obj; break }
                }
            }
            val code = card?.optString("code") ?: ""
            val cardId = card?.optString("id") ?: selectedId
            val cardUrl = if (cardId.isNotBlank()) "fainance://open-fidelity-card?cardId=${Uri.encode(cardId)}" else "fainance://open-fidelity-card"
            val rawBg = WidgetUtils.parseColor(card?.optString("color") ?: cfg.optString("accentColor"), android.graphics.Color.rgb(15,159,118))
            val transparency = cfg.optInt("bgAlpha", 0).coerceIn(0, 100)
            val opacity = ((100 - transparency) * 255 / 100).coerceIn(0, 255)
            val bg = (rawBg and 0x00FFFFFF) or (opacity shl 24)
            views.setInt(rootId, "setBackgroundColor", bg)
            if (titleId != 0) { views.setTextViewText(titleId, ""); views.setViewVisibility(titleId, View.GONE) }
            views.setTextViewText(nameId, card?.optString("name") ?: "Nessuna carta")
            views.setViewVisibility(codeId, View.GONE)
            views.setViewVisibility(barcodeId, View.GONE)
            if (barcodeImageId != 0 && code.isNotBlank()) {
                views.setImageViewBitmap(barcodeImageId, WidgetUtils.barcodeBitmap(code, 1100, 460))
                views.setViewVisibility(barcodeImageId, View.VISIBLE)
            } else {
                views.setTextViewText(barcodeId, WidgetUtils.barcodeVisual(code))
                views.setViewVisibility(barcodeId, View.VISIBLE)
            }
            val openCardIntent = WidgetUtils.openIntent(context, cardUrl)
            views.setOnClickPendingIntent(rootId, openCardIntent)
            if (barcodeImageId != 0) views.setOnClickPendingIntent(barcodeImageId, openCardIntent)
            if (barcodeId != 0) views.setOnClickPendingIntent(barcodeId, openCardIntent)
            if (codeId != 0) views.setOnClickPendingIntent(codeId, openCardIntent)
            if (settingsId != 0) views.setOnClickPendingIntent(settingsId, WidgetUtils.configureFidelityIntent(context, widgetId))
            manager.updateAppWidget(widgetId, views)
        }
    }
}
