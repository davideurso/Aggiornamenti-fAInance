package com.fainance.widgets

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import android.util.TypedValue
import org.json.JSONObject

class ShoppingListWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return ShoppingListFactory(applicationContext, intent)
    }
}

class ShoppingListFactory(
    private val context: Context,
    private val intent: Intent
) : RemoteViewsService.RemoteViewsFactory {
    private val rows = mutableListOf<JSONObject>()
    private var selectedListId: String = "main"

    override fun onCreate() {}

    override fun onDestroy() {
        rows.clear()
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long {
        return rows.getOrNull(position)?.optString("id")?.hashCode()?.toLong() ?: position.toLong()
    }

    override fun hasStableIds(): Boolean = true

    override fun getCount(): Int = rows.size

    override fun onDataSetChanged() {
        selectedListId = intent.getStringExtra("selectedListId") ?: "main"
        rows.clear()

        val cfg = WidgetUtils.json(context, "widget_shopping_list_settings")
        val arr = cfg.optJSONArray("allItems") ?: cfg.optJSONArray("items") ?: return
        val tmp = mutableListOf<JSONObject>()

        for (i in 0 until arr.length()) {
            val obj = arr.optJSONObject(i) ?: continue
            if (obj.optString("listId", "main") == selectedListId) {
                tmp.add(obj)
            }
        }

        rows.addAll(
            tmp.sortedWith(
                compareBy<JSONObject> { it.optBoolean("bought", false) }
                    .thenBy { it.optString("name") }
            )
        )
    }

    override fun getViewAt(position: Int): RemoteViews {
        val item = rows.getOrNull(position) ?: JSONObject()
        val layoutId = context.resources.getIdentifier("widget_shopping_item", "layout", context.packageName)
        val views = RemoteViews(context.packageName, layoutId)
        val nameId = context.resources.getIdentifier("itemName", "id", context.packageName)
        val areaId = context.resources.getIdentifier("itemArea", "id", context.packageName)
        val checkId = context.resources.getIdentifier("itemCheck", "id", context.packageName)
        val rootId = context.resources.getIdentifier("shoppingItemRoot", "id", context.packageName)
        val bought = item.optBoolean("bought", false)

        views.setTextViewText(nameId, item.optString("name", "Prodotto"))
        views.setTextViewText(areaId, item.optString("area", ""))
        views.setTextViewText(checkId, if (bought) "✓" else "☐")

        try {
            val cfg = WidgetUtils.json(context, "widget_shopping_list_settings")
            val boughtColor = Color.parseColor(cfg.optString("boughtColor", "#EAF7EE"))
            val textColor = WidgetUtils.parseColor(cfg.optString("textColor", "#EDEDF7"), Color.WHITE)
            val textSize = cfg.optDouble("textSize", 13.0).toFloat()
            views.setTextViewTextSize(nameId, TypedValue.COMPLEX_UNIT_SP, textSize)
            views.setTextViewTextSize(areaId, TypedValue.COMPLEX_UNIT_SP, (textSize - 3f).coerceAtLeast(9f))
            views.setTextViewTextSize(checkId, TypedValue.COMPLEX_UNIT_SP, textSize + 2f)
            views.setInt(rootId, "setBackgroundColor", if (bought) boughtColor else Color.rgb(42, 42, 58))
            if (bought) {
                views.setTextColor(nameId, Color.rgb(29, 158, 117))
                views.setTextColor(areaId, Color.rgb(29, 158, 117))
                views.setTextColor(checkId, Color.rgb(29, 158, 117))
            } else {
                views.setTextColor(nameId, textColor)
                views.setTextColor(areaId, Color.LTGRAY)
                views.setTextColor(checkId, textColor)
            }
        } catch (_: Exception) {
            // RemoteViews must never fail the widget render.
        }

        val fill = Intent().apply {
            putExtra(ShoppingListWidgetProvider.EXTRA_ITEM_ID, item.optString("id"))
        }
        views.setOnClickFillInIntent(rootId, fill)
        return views
    }
}
