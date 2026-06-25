package com.fainance.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

class ShoppingListWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it) } }

    override fun onDeleted(context: Context, ids: IntArray) {
        ids.forEach { WidgetUtils.deleteInstance(context, "widget_shopping_list_instance", it) }
    }


    private fun appendPendingShoppingUpdate(context: Context, itemId: String, bought: Boolean) {
        try {
            val pending = WidgetUtils.jsonArray(context, "widget_shopping_list_item_updates_v1")
            var replaced = false
            for (i in 0 until pending.length()) {
                val obj = pending.optJSONObject(i) ?: continue
                if (obj.optString("id") == itemId) {
                    obj.put("bought", bought)
                    obj.put("updatedAt", System.currentTimeMillis())
                    replaced = true
                    break
                }
            }
            if (!replaced) {
                val obj = JSONObject()
                obj.put("id", itemId)
                obj.put("bought", bought)
                obj.put("updatedAt", System.currentTimeMillis())
                pending.put(obj)
            }
            val pendingString = pending.toString()
            WidgetUtils.save(context, "widget_shopping_list_item_updates_v1", pendingString)
            context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE).edit().putString("widget_shopping_list_item_updates_v1", pendingString).apply()
            context.getSharedPreferences(context.packageName + "_preferences", Context.MODE_PRIVATE).edit().putString("widget_shopping_list_item_updates_v1", pendingString).apply()
            context.getSharedPreferences("com.capacitorjs.plugins.preferences", Context.MODE_PRIVATE).edit().putString("widget_shopping_list_item_updates_v1", pendingString).apply()
        } catch (_: Exception) {}
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_TOGGLE_ITEM) {
            val itemId = intent.getStringExtra(EXTRA_ITEM_ID) ?: return
            val cfg = WidgetUtils.json(context, "widget_shopping_list_settings")
            val arr = cfg.optJSONArray("allItems") ?: cfg.optJSONArray("items") ?: JSONArray()
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                if (obj.optString("id") == itemId) {
                    val newBought = !obj.optBoolean("bought", false)
                    obj.put("bought", newBought)
                    appendPendingShoppingUpdate(context, itemId, newBought)
                    break
                }
            }
            cfg.put("allItems", arr)
            cfg.put("items", arr)
            WidgetUtils.save(context, "widget_shopping_list_settings", cfg.toString())
            val manager = AppWidgetManager.getInstance(context)
            manager.getAppWidgetIds(ComponentName(context, ShoppingListWidgetProvider::class.java)).forEach { update(context, manager, it) }
            manager.notifyAppWidgetViewDataChanged(manager.getAppWidgetIds(ComponentName(context, ShoppingListWidgetProvider::class.java)), context.resources.getIdentifier("widgetList", "id", context.packageName))
        }
    }

    companion object {
        const val ACTION_TOGGLE_ITEM = "com.fainance.widgets.TOGGLE_SHOPPING_ITEM"
        const val EXTRA_ITEM_ID = "item_id"

        fun update(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val layoutId = context.resources.getIdentifier("widget_shopping_list", "layout", context.packageName)
            if (layoutId == 0) return
            val views = RemoteViews(context.packageName, layoutId)
            val titleId = context.resources.getIdentifier("widgetTitle", "id", context.packageName)
            val subtitleId = context.resources.getIdentifier("widgetSubtitle", "id", context.packageName)
            val listId = context.resources.getIdentifier("widgetList", "id", context.packageName)
            val emptyId = context.resources.getIdentifier("emptyText", "id", context.packageName)
            val rootId = context.resources.getIdentifier("widgetRoot", "id", context.packageName)
            val settingsId = context.resources.getIdentifier("settingsButton", "id", context.packageName)

            if (!WidgetUtils.isWidgetAllowed(context, "shoppingList")) {
                views.setTextViewText(titleId, "🔒 Lista spesa")
                views.setTextViewText(subtitleId, WidgetUtils.lockedWidgetMessage("shoppingList"))
                views.setViewVisibility(listId, View.GONE)
                views.setViewVisibility(emptyId, View.GONE)
                views.setOnClickPendingIntent(rootId, WidgetUtils.openIntent(context, "fainance://open-plan-info"))
                manager.updateAppWidget(widgetId, views)
                return
            }

            val cfg = WidgetUtils.json(context, "widget_shopping_list_settings")
            val instance = WidgetUtils.instanceJson(context, "widget_shopping_list_instance", widgetId)
            val chosenListId = instance.optString("selectedListId", cfg.optString("selectedListId", "main"))
            val listTitle = instance.optString("selectedListTitle", cfg.optString("title", "Lista spesa"))
            views.setTextViewText(titleId, listTitle.ifBlank { cfg.optString("title", "Lista spesa") })
            views.setTextViewText(subtitleId, cfg.optString("subtitle", "Tocca un articolo quando è nel carrello"))

            val adapterIntent = Intent(context, ShoppingListWidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                putExtra("selectedListId", chosenListId)
                data = android.net.Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }
            views.setRemoteAdapter(listId, adapterIntent)
            views.setEmptyView(listId, emptyId)
            views.setTextViewText(emptyId, cfg.optString("emptyText", "Lista della spesa vuota"))

            val clickIntent = Intent(context, ShoppingListWidgetProvider::class.java).apply { action = ACTION_TOGGLE_ITEM }
            val clickPending = PendingIntent.getBroadcast(context, widgetId + 300000, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE)
            views.setPendingIntentTemplate(listId, clickPending)
            views.setOnClickPendingIntent(rootId, WidgetUtils.openIntent(context, "fainance://open-shopping"))
            if (settingsId != 0) views.setOnClickPendingIntent(settingsId, WidgetUtils.configureShoppingListIntent(context, widgetId))
            manager.updateAppWidget(widgetId, views)
            manager.notifyAppWidgetViewDataChanged(widgetId, listId)
        }
    }
}
