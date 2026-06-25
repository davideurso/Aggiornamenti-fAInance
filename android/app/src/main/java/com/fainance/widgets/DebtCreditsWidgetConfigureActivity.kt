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

class DebtCreditsWidgetConfigureActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private val selectedIds = mutableSetOf<String>()
    private val items = mutableListOf<Item>()
    private lateinit var listRoot: LinearLayout

    data class Item(val id: String, val title: String, val subtitle: String, val icon: String)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        appWidgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }

        val global = WidgetUtils.json(this, "widget_debt_credits_settings")
        val existing = WidgetUtils.instanceJson(this, "widget_debt_credits_instance", appWidgetId)
        fillItems(global.optJSONArray("allItems") ?: global.optJSONArray("items"), global.optString("currency", "€"))
        val oldIds = existing.optJSONArray("selectedIds")
        if (oldIds != null && oldIds.length() > 0) for (i in 0 until oldIds.length()) selectedIds.add(oldIds.optString(i))
        if (selectedIds.isEmpty()) items.forEach { selectedIds.add(it.id) }
        if (items.isEmpty()) items.add(Item("", WidgetUtils.tr(this, "Nessun debito o credito disponibile."), WidgetUtils.tr(this, "Apri fAInance e crea un debito o un credito."), "📉"))

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(46), dp(22), dp(24))
            setBackgroundColor(Color.rgb(16, 17, 26))
        }
        scroll.addView(root)
        root.addView(title(WidgetUtils.tr(this, "Configura widget Debiti / Crediti")))
        root.addView(info(WidgetUtils.tr(this, "Scegli uno o più debiti/crediti da mostrare in questo widget. Trasparenza, colori e stile restano nelle impostazioni Widget dell'app.")))
        root.addView(label(WidgetUtils.tr(this, "Contenuto da mostrare")))
        listRoot = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(listRoot)
        renderItemCards()

        val save = Button(this).apply {
            text = WidgetUtils.tr(this@DebtCreditsWidgetConfigureActivity, "SALVA WIDGET")
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
        items.forEach { item ->
            val active = selectedIds.contains(item.id)
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(14), dp(12), dp(14), dp(12))
                background = rounded(if (active) Color.rgb(42, 50, 74) else Color.rgb(28, 31, 46), if (active) Color.rgb(127, 119, 221) else Color.rgb(52, 56, 74), 18)
                setOnClickListener { if (selectedIds.contains(item.id)) selectedIds.remove(item.id) else selectedIds.add(item.id); renderItemCards() }
            }
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
            row.addView(TextView(this).apply { text = item.icon; textSize = 24f; gravity = Gravity.CENTER }, LinearLayout.LayoutParams(dp(34), dp(38)))
            val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(10), 0, 0, 0) }
            texts.addView(TextView(this).apply { text = item.title; setTextColor(Color.WHITE); textSize = 17f; setTypeface(null, Typeface.BOLD); maxLines = 1 })
            texts.addView(TextView(this).apply { text = item.subtitle; setTextColor(Color.argb(195, 255, 255, 255)); textSize = 12f; maxLines = 2 })
            row.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            if (active) row.addView(TextView(this).apply { text = "✓"; textSize = 24f; setTextColor(Color.rgb(127,119,221)); gravity = Gravity.CENTER }, LinearLayout.LayoutParams(dp(32), dp(38)))
            card.addView(row)
            listRoot.addView(card, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(10) })
        }
    }

    private fun saveSelection() {
        val arr = JSONArray()
        selectedIds.filter { it.isNotBlank() }.forEach { arr.put(it) }
        WidgetUtils.saveInstance(this, "widget_debt_credits_instance", appWidgetId, JSONObject().put("selectedIds", arr).toString())
        try { DebtCreditsWidgetProvider.update(this, AppWidgetManager.getInstance(this), appWidgetId) } catch (_: Exception) {}
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
        finish()
    }

    private fun fillItems(arr: JSONArray?, currency: String) {
        if (arr == null) return
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val kind = o.optString("kind", "debt")
            val icon = if (kind == "credit") "📈" else "📉"
            val label = if (kind == "credit") WidgetUtils.tr(this, "Credito") else WidgetUtils.tr(this, "Debito")
            val holder = o.optString("holder", WidgetUtils.tr(this, "Senza nome"))
            items.add(Item(o.optString("id", "debt_$i"), "$label · $holder", WidgetUtils.money(o.optDouble("balance"), currency), icon))
        }
    }

    private fun title(t: String) = TextView(this).apply { text = t; textSize = 24f; setTextColor(Color.WHITE); setTypeface(null, Typeface.BOLD); setPadding(0, 0, 0, dp(8)) }
    private fun info(t: String) = TextView(this).apply { text = t; textSize = 13f; setTextColor(Color.argb(200,255,255,255)); setPadding(0, 0, 0, dp(18)); setLineSpacing(dp(2).toFloat(), 1.0f) }
    private fun label(t: String) = TextView(this).apply { text = t; textSize = 14f; setTextColor(Color.argb(220,255,255,255)); setTypeface(null, Typeface.BOLD); setPadding(0, dp(8), 0, dp(10)) }
    private fun rounded(fill: Int, stroke: Int, radius: Int): GradientDrawable = GradientDrawable().apply { setColor(fill); cornerRadius = dp(radius).toFloat(); setStroke(dp(1), stroke) }
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
