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
import com.tracker.spese.app.ShareWidgetProvider
import org.json.JSONArray
import org.json.JSONObject

class ShareWidgetConfigureActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private val projectItems = mutableListOf<ProjectItem>()
    private var selectedIndex = 0
    private lateinit var listRoot: LinearLayout

    data class ProjectItem(
        val id: String,
        val title: String,
        val net: Double,
        val owed: Double,
        val owe: Double,
        val last: String,
        val currency: String
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        appWidgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
            ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }
        if (!WidgetUtils.isWidgetAllowed(this, "share")) { showLockedPlanScreen("share"); return }

        val global = WidgetUtils.json(this, "widget_share_settings")
        val existing = WidgetUtils.instanceJson(this, "share_widget", appWidgetId)
        fillProjects(global.optJSONArray("projectItems"), global)
        if (projectItems.isEmpty()) {
            projectItems.add(ProjectItem("default_share", WidgetUtils.tr(this, "Nessun progetto disponibile"), 0.0, 0.0, 0.0, WidgetUtils.tr(this, "Crea prima un progetto Share nell'app."), global.optString("currency", "€")))
        }

        val selectedId = existing.optString("projectId", global.optString("projectId", ""))
        selectedIndex = projectItems.indexOfFirst { it.id == selectedId }.let { if (it >= 0) it else 0 }

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(46), dp(22), dp(24))
            setBackgroundColor(Color.rgb(16, 17, 26))
        }
        scroll.addView(root)
        root.addView(title(WidgetUtils.tr(this, "Configura widget Share")))
        root.addView(info(WidgetUtils.tr(this, "Scegli il progetto da mostrare in questo widget. Colori, trasparenza e stile restano nelle impostazioni Widget dell'app.")))
        root.addView(label(WidgetUtils.tr(this, "Progetto da mostrare")))
        listRoot = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(listRoot)
        renderProjectCards()

        val save = Button(this).apply {
            text = WidgetUtils.tr(this@ShareWidgetConfigureActivity, "SALVA WIDGET")
            textSize = 15f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.rgb(25, 27, 35))
            setOnClickListener { saveSelection() }
        }
        root.addView(save, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)).apply { topMargin = dp(18) })
        setContentView(scroll)
    }

    private fun fillProjects(arr: JSONArray?, global: JSONObject) {
        if (arr == null) {
            val id = global.optString("projectId", "")
            val title = global.optString("projectName", "")
            if (id.isNotBlank() || title.isNotBlank()) {
                projectItems.add(ProjectItem(
                    if (id.isNotBlank()) id else "default_share",
                    if (title.isNotBlank()) title else "Progetto Share",
                    global.optDouble("netAmount", 0.0),
                    global.optDouble("owedAmount", 0.0),
                    global.optDouble("oweAmount", 0.0),
                    global.optString("lastActivity", "Nessuna attività recente"),
                    global.optString("currency", "€")
                ))
            }
            return
        }
        for (i in 0 until arr.length()) {
            val obj = arr.optJSONObject(i) ?: continue
            val id = obj.optString("projectId", obj.optString("id", "share_$i"))
            val title = obj.optString("projectName", obj.optString("name", "Progetto Share"))
            projectItems.add(ProjectItem(
                id,
                title,
                obj.optDouble("netAmount", 0.0),
                obj.optDouble("owedAmount", 0.0),
                obj.optDouble("oweAmount", 0.0),
                obj.optString("lastActivity", "Nessuna attività recente"),
                obj.optString("currency", global.optString("currency", "€"))
            ))
        }
    }

    private fun renderProjectCards() {
        listRoot.removeAllViews()
        projectItems.forEachIndexed { index, item ->
            val active = index == selectedIndex
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(14), dp(12), dp(14), dp(12))
                background = rounded(if (active) Color.rgb(42, 50, 74) else Color.rgb(28, 31, 46), if (active) Color.rgb(127, 119, 221) else Color.rgb(52, 56, 74), 18)
                setOnClickListener { selectedIndex = index; renderProjectCards() }
            }
            val top = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
            top.addView(TextView(this).apply {
                text = "🤝"
                textSize = 24f
                gravity = Gravity.CENTER
            }, LinearLayout.LayoutParams(dp(38), dp(38)))
            val titleBox = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(10), 0, 0, 0) }
            titleBox.addView(TextView(this).apply {
                text = item.title
                textSize = 15f
                setTypeface(null, Typeface.BOLD)
                setTextColor(Color.WHITE)
            })
            titleBox.addView(TextView(this).apply {
                text = WidgetUtils.tr(this@ShareWidgetConfigureActivity, "Saldo") + ": ${money(item.net, item.currency)} · " + WidgetUtils.tr(this@ShareWidgetConfigureActivity, "Ti devono") + ": ${money(item.owed, item.currency)} · " + WidgetUtils.tr(this@ShareWidgetConfigureActivity, "Devi") + ": ${money(item.owe, item.currency)}"
                textSize = 12f
                setTextColor(Color.rgb(190, 196, 215))
            })
            top.addView(titleBox, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            if (active) {
                top.addView(TextView(this).apply {
                    text = "✓"
                    textSize = 20f
                    setTypeface(null, Typeface.BOLD)
                    setTextColor(Color.rgb(127, 119, 221))
                    gravity = Gravity.CENTER
                }, LinearLayout.LayoutParams(dp(32), dp(38)))
            }
            card.addView(top)
            card.addView(TextView(this).apply {
                text = item.last
                textSize = 12f
                setTextColor(Color.rgb(160, 166, 185))
                setPadding(dp(48), dp(4), 0, 0)
                maxLines = 2
            })
            listRoot.addView(card, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(10) })
        }
    }

    private fun saveSelection() {
        val item = projectItems.getOrNull(selectedIndex) ?: return
        val value = JSONObject().apply {
            put("projectId", item.id)
            put("projectName", item.title)
        }
        WidgetUtils.saveInstance(this, "share_widget", appWidgetId, value.toString())
        val result = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        setResult(RESULT_OK, result)
        try {
            val manager = AppWidgetManager.getInstance(this)
            ShareWidgetProvider().onUpdate(this, manager, intArrayOf(appWidgetId))
        } catch (_: Exception) {}
        finish()
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

    private fun goHomeAndFinish() { finish() }

    private fun title(text: String) = TextView(this).apply {
        this.text = text
        textSize = 22f
        setTypeface(null, Typeface.BOLD)
        setTextColor(Color.WHITE)
        setPadding(0, 0, 0, dp(10))
    }

    private fun info(text: String) = TextView(this).apply {
        this.text = text
        textSize = 13f
        setTextColor(Color.rgb(180, 185, 205))
        setPadding(0, 0, 0, dp(18))
        setLineSpacing(dp(2).toFloat(), 1.0f)
    }

    private fun label(text: String) = TextView(this).apply {
        this.text = text.uppercase()
        textSize = 11f
        setTypeface(null, Typeface.BOLD)
        setTextColor(Color.rgb(140, 145, 165))
        setPadding(0, dp(6), 0, dp(8))
    }

    private fun rounded(fill: Int, stroke: Int, radius: Int): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(radius).toFloat()
            setColor(fill)
            setStroke(dp(1), stroke)
        }
    }

    private fun money(value: Double, currency: String): String {
        val rounded = String.format(java.util.Locale.ITALY, "%,.2f", value).replace('.', '#').replace(',', '.').replace('#', ',')
        return "$rounded $currency"
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()
}
