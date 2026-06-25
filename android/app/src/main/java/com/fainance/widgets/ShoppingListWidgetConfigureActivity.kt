package com.fainance.widgets

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject

class ShoppingListWidgetConfigureActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var selectedIndex = 0
    private val listItems = mutableListOf<Item>()
    private lateinit var listRoot: LinearLayout

    data class Item(val id: String, val title: String, val icon: String)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        appWidgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }

        val global = WidgetUtils.json(this, "widget_shopping_list_settings")
        val existing = WidgetUtils.instanceJson(this, "widget_shopping_list_instance", appWidgetId)
        fillItems(global.optJSONArray("lists"))
        if (listItems.isEmpty()) listItems.add(Item(global.optString("selectedListId", "main"), global.optString("selectedListTitle", "Lista principale"), global.optString("icon", "🧺")))

        val selectedId = existing.optString("selectedListId", "")
        selectedIndex = listItems.indexOfFirst { it.id == selectedId }.let { if (it >= 0) it else 0 }

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(46), dp(22), dp(24))
            setBackgroundColor(Color.rgb(16, 17, 26))
        }
        scroll.addView(root)
        root.addView(title(WidgetUtils.tr(this, "Configura widget Lista spesa")))
        root.addView(info(WidgetUtils.tr(this, "Scegli la lista da mostrare in questo widget. Trasparenza, colori e stile restano nelle impostazioni Widget dell'app.")))
        root.addView(label(WidgetUtils.tr(this, "Lista da mostrare")))
        listRoot = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(listRoot)
        renderItemCards()

        val save = Button(this).apply {
            text = WidgetUtils.tr(this@ShoppingListWidgetConfigureActivity, "SALVA WIDGET")
            textSize = 15f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.rgb(25, 27, 35))
            setOnClickListener { saveSelection() }
        }
        root.addView(save, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)).apply { topMargin = dp(18) })
        setContentView(scroll)
    }

    private fun renderItemCards() {
        listRoot.removeAllViews()
        listItems.forEachIndexed { index, item ->
            val active = index == selectedIndex
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(14), dp(12), dp(14), dp(12))
                background = rounded(if (active) Color.rgb(42, 50, 74) else Color.rgb(28, 31, 46), if (active) Color.rgb(127, 119, 221) else Color.rgb(52, 56, 74), 18)
                setOnClickListener { selectedIndex = index; renderItemCards() }
            }
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
            row.addView(TextView(this).apply { text = item.icon.ifBlank { "🧺" }; textSize = 24f; gravity = Gravity.CENTER }, LinearLayout.LayoutParams(dp(34), dp(38)))
            val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(10), 0, 0, 0) }
            texts.addView(TextView(this).apply { text = item.title; setTextColor(Color.WHITE); textSize = 17f; setTypeface(null, Typeface.BOLD); maxLines = 1 })
            texts.addView(TextView(this).apply { text = WidgetUtils.tr(this@ShoppingListWidgetConfigureActivity, "Lista della spesa"); setTextColor(Color.argb(195, 255, 255, 255)); textSize = 12f; maxLines = 2 })
            row.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            if (active) row.addView(TextView(this).apply { text = "✓"; textSize = 24f; setTextColor(Color.rgb(127,119,221)); gravity = Gravity.CENTER }, LinearLayout.LayoutParams(dp(32), dp(38)))
            card.addView(row)
            listRoot.addView(card, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(10) })
        }
    }

    private fun saveSelection() {
        val item = listItems.getOrElse(selectedIndex.coerceAtLeast(0)) { listItems[0] }
        val json = JSONObject().apply {
            put("selectedListId", item.id)
            put("selectedListTitle", item.title)
            put("icon", item.icon)
        }
        WidgetUtils.saveInstance(this, "widget_shopping_list_instance", appWidgetId, json.toString())
        try { ShoppingListWidgetProvider.update(this, AppWidgetManager.getInstance(this), appWidgetId) } catch (_: Exception) {}
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
        finish()
    }

    private fun fillItems(arr: JSONArray?) {
        if (arr == null) return
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            listItems.add(Item(o.optString("id", "list_$i"), o.optString("title", "Lista"), o.optString("icon", "🧺")))
        }
    }

    private fun title(t: String) = TextView(this).apply { text = t; textSize = 24f; setTextColor(Color.WHITE); setTypeface(null, Typeface.BOLD); setPadding(0, 0, 0, dp(8)) }
    private fun info(t: String) = TextView(this).apply { text = t; textSize = 13f; setTextColor(Color.argb(200,255,255,255)); setPadding(0, 0, 0, dp(18)); setLineSpacing(dp(2).toFloat(), 1.0f) }
    private fun label(t: String) = TextView(this).apply { text = t; textSize = 14f; setTextColor(Color.argb(220,255,255,255)); setTypeface(null, Typeface.BOLD); setPadding(0, dp(8), 0, dp(10)) }
    private fun rounded(fill: Int, stroke: Int, radius: Int): GradientDrawable = GradientDrawable().apply { setColor(fill); cornerRadius = dp(radius).toFloat(); setStroke(dp(1), stroke) }
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
