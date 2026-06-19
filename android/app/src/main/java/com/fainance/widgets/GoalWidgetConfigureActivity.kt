package com.fainance.widgets

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject

class GoalWidgetConfigureActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private val goalItems = mutableListOf<GoalItem>()
    private var selectedIndex = 0
    private lateinit var listRoot: LinearLayout

    data class GoalItem(val id: String, val title: String, val icon: String, val saved: Double, val target: Double, val percent: Int, val color: String, val currency: String)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        appWidgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }
        if (!WidgetUtils.isWidgetAllowed(this, "goal")) { showLockedPlanScreen("goal"); return }

        val global = WidgetUtils.json(this, "widget_goal_settings")
        val existing = WidgetUtils.instanceJson(this, "goal_widget", appWidgetId)
        fillGoals(global.optJSONArray("goalItems"))
        if (goalItems.isEmpty()) goalItems.add(GoalItem("default_goal", "Nessun obiettivo disponibile", "🎯", 0.0, 0.0, 0, global.optString("accentColor", "#EF7D00"), "€"))

        val selectedId = existing.optString("selectedGoalId", global.optString("selectedGoalId", ""))
        selectedIndex = goalItems.indexOfFirst { it.id == selectedId }.let { if (it >= 0) it else 0 }

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(46), dp(22), dp(24))
            setBackgroundColor(Color.rgb(16, 17, 26))
        }
        scroll.addView(root)
        root.addView(title("Configura widget Obiettivo"))
        root.addView(info("Scegli solo l'obiettivo da mostrare in questo widget. Trasparenza, percentuale, importi e colore fallback restano nelle impostazioni Widget dell'app e valgono per tutti i widget Obiettivo."))
        root.addView(label("Obiettivo da mostrare"))
        listRoot = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(listRoot)
        renderGoalCards()

        val save = Button(this).apply {
            text = "SALVA WIDGET"
            textSize = 15f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.rgb(25, 27, 35))
            setOnClickListener { saveSelection() }
        }
        root.addView(save, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)).apply { topMargin = dp(18) })
        setContentView(scroll)
    }

    private fun renderGoalCards() {
        listRoot.removeAllViews()
        goalItems.forEachIndexed { index, item ->
            val active = index == selectedIndex
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(14), dp(12), dp(14), dp(12))
                background = rounded(if (active) Color.rgb(42, 50, 74) else Color.rgb(28, 31, 46), if (active) Color.rgb(127, 119, 221) else Color.rgb(52, 56, 74), 18)
                setOnClickListener { selectedIndex = index; renderGoalCards() }
            }
            card.addView(TextView(this).apply { text = item.icon; textSize = 26f; gravity = Gravity.CENTER }, LinearLayout.LayoutParams(dp(38), dp(44)))
            val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(12), 0, 0, 0) }
            texts.addView(TextView(this).apply { text = item.title; setTextColor(Color.WHITE); textSize = 17f; setTypeface(null, Typeface.BOLD); maxLines = 1 })
            texts.addView(TextView(this).apply { text = "${item.percent}% · ${WidgetUtils.money(item.saved, item.currency)} / ${WidgetUtils.money(item.target, item.currency)}"; setTextColor(Color.argb(195, 255, 255, 255)); textSize = 13f; maxLines = 1 })
            card.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            if (active) card.addView(TextView(this).apply { text = "✓"; textSize = 24f; setTextColor(Color.rgb(127,119,221)); gravity = Gravity.CENTER }, LinearLayout.LayoutParams(dp(32), dp(44)))
            listRoot.addView(card, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(10) })
        }
    }

    private fun saveSelection() {
        val g = goalItems.getOrElse(selectedIndex.coerceAtLeast(0)) { goalItems[0] }
        val json = JSONObject().apply {
            put("selectedGoalId", g.id)
            put("title", g.title)
            put("icon", g.icon)
            put("saved", g.saved)
            put("target", g.target)
            put("percent", g.percent)
            put("color", g.color)
            put("currency", g.currency)
        }
        WidgetUtils.saveInstance(this, "goal_widget", appWidgetId, json.toString())
        val manager = AppWidgetManager.getInstance(this)
        GoalWidgetProvider.update(this, manager, appWidgetId)
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
        finish()
    }

    private fun fillGoals(arr: JSONArray?) {
        if (arr == null) return
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            goalItems.add(GoalItem(o.optString("id", "goal_$i"), o.optString("title", "Obiettivo"), o.optString("icon", "🎯"), o.optDouble("saved", 0.0), o.optDouble("target", 0.0), o.optInt("percent", 0), o.optString("color", "#EF7D00"), o.optString("currency", "€")))
        }
    }


    private fun showLockedPlanScreen(type: String) {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(24), dp(46), dp(24), dp(32))
            setBackgroundColor(Color.rgb(16, 17, 26))
        }
        root.addView(TextView(this).apply {
            text = "🔒"
            textSize = 54f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(14))
        })
        root.addView(TextView(this).apply {
            text = WidgetUtils.lockedWidgetTitle(type)
            textSize = 22f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(10))
        })
        root.addView(TextView(this).apply {
            text = WidgetUtils.lockedWidgetMessage(type)
            textSize = 14f
            setTextColor(Color.rgb(255, 214, 102))
            gravity = Gravity.CENTER
            setLineSpacing(dp(2).toFloat(), 1.0f)
            setPadding(0, 0, 0, dp(22))
        })
        val open = Button(this).apply {
            text = "CAMBIA PIANO"
            textSize = 15f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.rgb(25, 27, 35))
            setOnClickListener {
                try { startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse("fainance://open-plan-info")).apply { setPackage(packageName); addCategory(Intent.CATEGORY_BROWSABLE) }) } catch (_: Exception) {}
                finish()
            }
        }
        root.addView(open, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)))
        setContentView(root)
    }

    private fun title(t: String) = TextView(this).apply { text = t; textSize = 24f; setTextColor(Color.WHITE); setTypeface(null, Typeface.BOLD); setPadding(0, 0, 0, dp(8)) }
    private fun info(t: String) = TextView(this).apply { text = t; textSize = 13f; setTextColor(Color.argb(200,255,255,255)); setPadding(0, 0, 0, dp(18)); setLineSpacing(dp(2).toFloat(), 1.0f) }
    private fun label(t: String) = TextView(this).apply { text = t; textSize = 14f; setTextColor(Color.argb(220,255,255,255)); setTypeface(null, Typeface.BOLD); setPadding(0, 0, 0, dp(10)) }
    private fun rounded(fill: Int, stroke: Int, radius: Int): GradientDrawable = GradientDrawable().apply { setColor(fill); cornerRadius = dp(radius).toFloat(); setStroke(dp(1), stroke) }
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
