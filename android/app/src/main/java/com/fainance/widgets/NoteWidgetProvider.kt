package com.fainance.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.util.TypedValue
import android.widget.RemoteViews
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject

class NoteWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { update(context, manager, it) }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        appWidgetIds.forEach { WidgetUtils.deleteInstance(context, "note_widget", it) }
        super.onDeleted(context, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_COPY_NOTE) {
            val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            val text = textForCopy(context, widgetId)
            if (text.isNotBlank()) {
                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                cm.setPrimaryClip(ClipData.newPlainText("fAInance", text))
                Toast.makeText(context, "Testo copiato", Toast.LENGTH_SHORT).show()
            }
        }
    }

    companion object {
        private const val ACTION_COPY_NOTE = "com.fainance.widgets.COPY_NOTE"

        fun update(context: Context, manager: AppWidgetManager, widgetId: Int) {
            if (!WidgetUtils.isWidgetAllowed(context, "note")) {
                renderLocked(context, manager, widgetId)
                return
            }
            val global = WidgetUtils.json(context, "widget_note_settings")
            val local = WidgetUtils.instanceJson(context, "note_widget", widgetId)
            val resolved = resolveContent(global, local)
            val views = RemoteViews(context.packageName, context.resources.getIdentifier("widget_note", "layout", context.packageName))
            val type = resolved.optString("type", "note")
            val title = resolved.optString("title", if (type == "bank") "Coordinata bancaria" else "Nota")
            val body = resolved.optString("body", if (type == "bank") "Nessun IBAN selezionato" else "Nessuna nota selezionata")
            val maxChars = global.optInt("maxChars", 500).coerceIn(20, 2000)
            val textSize = global.optInt("textSize", 14).coerceIn(10, 28)
            val titleColor = parseColor(global.optString("titleColor", "#FFFFFF"), "#FFFFFF")
            val bodyColor = parseColor(global.optString("bodyColor", "#CCFFFFFF"), "#CCFFFFFF")
            val iconColor = parseColor(global.optString("accentColor", "#7F77DD"), "#7F77DD")
            val shownBody = if (body.length > maxChars) body.take(maxChars - 1) + "…" else body
            val bgAlpha = global.optInt("bgAlpha", 65).coerceIn(0, 100)

            views.setInt(context.resources.getIdentifier("widgetRoot", "id", context.packageName), "setBackgroundResource", WidgetUtils.bgDrawableRes(context, bgAlpha))
            views.setTextViewText(context.resources.getIdentifier("noteIcon", "id", context.packageName), if (type == "bank") "🏦" else "▤")
            views.setTextColor(context.resources.getIdentifier("noteIcon", "id", context.packageName), iconColor)
            views.setTextViewText(context.resources.getIdentifier("noteTitle", "id", context.packageName), title)
            views.setTextViewText(context.resources.getIdentifier("noteBody", "id", context.packageName), if (type == "bank") styledBankText(shownBody) else shownBody)
            views.setTextColor(context.resources.getIdentifier("noteTitle", "id", context.packageName), titleColor)
            views.setTextColor(context.resources.getIdentifier("noteBody", "id", context.packageName), bodyColor)
            views.setTextViewTextSize(context.resources.getIdentifier("noteTitle", "id", context.packageName), TypedValue.COMPLEX_UNIT_SP, (textSize + 1).toFloat())
            views.setTextViewTextSize(context.resources.getIdentifier("noteBody", "id", context.packageName), TypedValue.COMPLEX_UNIT_SP, textSize.toFloat())
            views.setOnClickPendingIntent(context.resources.getIdentifier("widgetRoot", "id", context.packageName), WidgetUtils.openIntent(context, "fainance://open-appunti"))
            views.setOnClickPendingIntent(context.resources.getIdentifier("noteIcon", "id", context.packageName), WidgetUtils.openIntent(context, "fainance://open-appunti"))
            val noteSettingsId = context.resources.getIdentifier("noteSettings", "id", context.packageName)
            if (noteSettingsId != 0) views.setOnClickPendingIntent(noteSettingsId, WidgetUtils.configureNoteIntent(context, widgetId))
            views.setOnClickPendingIntent(context.resources.getIdentifier("noteBody", "id", context.packageName), copyIntent(context, widgetId))

            manager.updateAppWidget(widgetId, views)
        }

        private fun renderLocked(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val layoutId = context.resources.getIdentifier("widget_note", "layout", context.packageName)
            if (layoutId == 0) return
            val views = RemoteViews(context.packageName, layoutId)
            views.setInt(context.resources.getIdentifier("widgetRoot", "id", context.packageName), "setBackgroundResource", WidgetUtils.bgDrawableRes(context, 35))
            views.setTextViewText(context.resources.getIdentifier("noteIcon", "id", context.packageName), "🔒")
            views.setTextViewText(context.resources.getIdentifier("noteTitle", "id", context.packageName), WidgetUtils.lockedWidgetTitle("note"))
            views.setTextViewText(context.resources.getIdentifier("noteBody", "id", context.packageName), WidgetUtils.lockedWidgetMessage("note"))
            views.setTextColor(context.resources.getIdentifier("noteTitle", "id", context.packageName), Color.WHITE)
            views.setTextColor(context.resources.getIdentifier("noteBody", "id", context.packageName), Color.rgb(255, 214, 102))
            views.setOnClickPendingIntent(context.resources.getIdentifier("widgetRoot", "id", context.packageName), WidgetUtils.openIntent(context, "fainance://open-plan-info"))
            val noteSettingsId = context.resources.getIdentifier("noteSettings", "id", context.packageName)
            if (noteSettingsId != 0) views.setOnClickPendingIntent(noteSettingsId, WidgetUtils.openIntent(context, "fainance://open-plan-info"))
            manager.updateAppWidget(widgetId, views)
        }

        private fun resolveContent(global: JSONObject, local: JSONObject): JSONObject {
            val type = local.optString("type", global.optString("type", "note"))
            val fallbackGlobalId = if (type == "bank") global.optString("selectedBankId", "") else global.optString("selectedNoteId", "")
            val selectedId = local.optString("selectedId", fallbackGlobalId)
            val items = if (type == "bank") global.optJSONArray("bankItems") else global.optJSONArray("noteItems")
            val item = findById(items, selectedId)
            return JSONObject().apply {
                put("type", type)
                put("selectedId", selectedId)
                put("title", item?.optString("title") ?: local.optString("title", if (type == "bank") "Coordinata bancaria" else "Nota"))
                put("body", item?.optString("body") ?: local.optString("body", if (type == "bank") "Nessun IBAN selezionato" else "Nessuna nota selezionata"))
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

        private fun textForCopy(context: Context, widgetId: Int): String {
            val global = WidgetUtils.json(context, "widget_note_settings")
            val local = WidgetUtils.instanceJson(context, "note_widget", widgetId)
            return resolveContent(global, local).optString("body", "")
        }

        private fun copyIntent(context: Context, widgetId: Int): PendingIntent {
            val intent = Intent(context, NoteWidgetProvider::class.java).apply {
                action = ACTION_COPY_NOTE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            }
            return PendingIntent.getBroadcast(context, widgetId + 230000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        private fun parseColor(value: String, fallback: String): Int {
            return try { Color.parseColor(value) } catch (_: Exception) { Color.parseColor(fallback) }
        }

        private fun styledBankText(text: String): SpannableString {
            val sp = SpannableString(text)
            val labelColor = Color.rgb(111, 206, 255)
            val lines = text.split('\n')
            var start = 0
            lines.forEach { line ->
                val idx = line.indexOf(":")
                val spanEnd = start + idx + 1
                if (idx > 0 && spanEnd <= sp.length) {
                    sp.setSpan(ForegroundColorSpan(labelColor), start, spanEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                }
                start += line.length + 1
            }
            return sp
        }
    }
}
