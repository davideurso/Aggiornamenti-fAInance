package com.fainance.widgets

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.Html
import android.text.SpannableStringBuilder
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ImageView
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject

class NoteWidgetConfigureActivity : Activity() {
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var type = "note"
    private var selectedIndex = 0
    private val noteItems = mutableListOf<Item>()
    private val bankItems = mutableListOf<Item>()
    private val creditCardItems = mutableListOf<Item>()
    private lateinit var typeRoot: LinearLayout
    private lateinit var previewRoot: LinearLayout
    private lateinit var listRoot: LinearLayout

    data class Item(val id: String, val title: String, val body: String, val html: String = "")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        appWidgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }
        if (!WidgetUtils.isWidgetAllowed(this, "note")) { showLockedPlanScreen("note"); return }

        val global = WidgetUtils.json(this, "widget_note_settings")
        val existing = WidgetUtils.instanceJson(this, "note_widget", appWidgetId)
        fillItems(global.optJSONArray("noteItems"), noteItems, WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Nota"))
        fillItems(global.optJSONArray("bankItems"), bankItems, "Coordinata bancaria")
        fillItems(global.optJSONArray("creditCardItems"), creditCardItems, "Carta di credito")
        if (noteItems.isEmpty()) noteItems.add(Item("default_note", "Nessuna nota disponibile", "Crea prima una nota nell'app.", ""))
        if (bankItems.isEmpty()) bankItems.add(Item("default_bank", "Nessuna coordinata disponibile", "Crea prima una coordinata bancaria nell'app.", ""))
        if (creditCardItems.isEmpty()) creditCardItems.add(Item("default_credit_card", "Nessuna carta disponibile", "Crea prima una carta di credito nell'app.", ""))

        type = existing.optString("type", global.optString("type", "note"))
        val selectedId = existing.optString("selectedId", "")
        selectedIndex = currentList().indexOfFirst { it.id == selectedId }.let { if (it >= 0) it else 0 }

        val scroll = ScrollView(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(22), dp(46), dp(22), dp(24))
            setBackgroundColor(Color.rgb(16, 17, 26))
        }
        scroll.addView(root)
        root.addView(title(WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Configura widget Nota / IBAN / Carta")))
        root.addView(info(WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Scegli solo il contenuto da mostrare in questo widget. Trasparenza, limite caratteri e stile restano nelle impostazioni Widget dell'app e valgono per tutti i widget Nota / IBAN / Carta.")))

        root.addView(label(WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Tipo di contenuto")))
        typeRoot = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        root.addView(typeRoot, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        root.addView(label(WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Anteprima")))
        previewRoot = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(previewRoot, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))
        root.addView(label(WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Contenuto da mostrare")))
        listRoot = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(listRoot)
        renderTypeButtons()
        renderPreview()
        renderItemCards()

        val save = Button(this).apply {
            text = WidgetUtils.tr(this@NoteWidgetConfigureActivity, "SALVA WIDGET")
            textSize = 15f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.rgb(25, 27, 35))
            setOnClickListener { saveSelection() }
        }
        root.addView(save, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)).apply { topMargin = dp(18) })
        setContentView(scroll)
    }

    private fun currentList(): MutableList<Item> = when (type) {
        "bank" -> bankItems
        "creditCard" -> creditCardItems
        else -> noteItems
    }

    private fun renderTypeButtons() {
        typeRoot.removeAllViews()
        listOf(
            "note" to WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Nota"),
            "bank" to WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Coordinata"),
            "creditCard" to WidgetUtils.tr(this@NoteWidgetConfigureActivity, "Carta")
        ).forEach { pair ->
            val active = type == pair.first
            val button = TextView(this).apply {
                text = pair.second
                gravity = Gravity.CENTER
                textSize = 14f
                setTypeface(null, Typeface.BOLD)
                setTextColor(if (active) Color.WHITE else Color.argb(190, 255, 255, 255))
                background = rounded(if (active) Color.rgb(127, 119, 221) else Color.rgb(28, 31, 46), if (active) Color.rgb(162, 152, 255) else Color.rgb(52, 56, 74), 16)
                setOnClickListener { type = pair.first; selectedIndex = 0; renderTypeButtons(); renderPreview(); renderItemCards() }
                setPadding(dp(8), dp(12), dp(8), dp(12))
            }
            typeRoot.addView(button, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { rightMargin = dp(8) })
        }
    }

    private fun renderPreview() {
        previewRoot.removeAllViews()
        val items = currentList()
        if (items.isEmpty()) return
        val item = items.getOrElse(selectedIndex.coerceAtLeast(0)) { items[0] }
        val global = WidgetUtils.json(this, "widget_note_settings")
        val titleColor = parseColor(global.optString("titleColor", "#FFFFFF"), Color.WHITE)
        val bodyColor = parseColor(global.optString("bodyColor", "#CCFFFFFF"), Color.argb(204, 255, 255, 255))
        val accentColor = parseColor(global.optString("accentColor", "#7F77DD"), Color.rgb(127, 119, 221))
        val textSize = global.optInt("textSize", 14).coerceIn(10, 28)
        val maxChars = global.optInt("maxChars", 500).coerceIn(20, 2000)
        val bgAlpha = global.optInt("bgAlpha", 65).coerceIn(0, 100)
        val bgDrawableAlpha = (100 - bgAlpha).coerceIn(0, 100)

        val widget = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(10), dp(10), dp(10), dp(10))
            setBackgroundResource(WidgetUtils.bgDrawableRes(this@NoteWidgetConfigureActivity, bgDrawableAlpha))
        }
        val logoRes = resources.getIdentifier("logo_fainance", "drawable", packageName)
        if (logoRes != 0) {
            widget.addView(ImageView(this).apply {
                setImageResource(logoRes)
                scaleType = ImageView.ScaleType.FIT_CENTER
                adjustViewBounds = true
            }, LinearLayout.LayoutParams(dp(34), dp(34)).apply { rightMargin = dp(8) })
        }
        widget.addView(TextView(this).apply {
            text = when (type) { "bank" -> "🏦"; "creditCard" -> "💳"; else -> "▤" }
            this.textSize = 20f
            gravity = Gravity.CENTER
            setTextColor(accentColor)
        }, LinearLayout.LayoutParams(dp(38), LinearLayout.LayoutParams.MATCH_PARENT))

        val texts = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(12), 0, 0, 0)
        }
        texts.addView(TextView(this).apply {
            text = item.title
            setTextColor(titleColor)
            this.textSize = (textSize + 1).toFloat()
            setTypeface(null, Typeface.BOLD)
            maxLines = 1
        })
        texts.addView(TextView(this).apply {
            text = previewBody(item, maxChars)
            setTextColor(bodyColor)
            this.textSize = textSize.toFloat()
            maxLines = 5
            setLineSpacing(dp(1).toFloat(), 1.0f)
            gravity = notePreviewGravity(item.html)
        })
        widget.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f).apply { leftMargin = dp(0) })
        widget.addView(TextView(this).apply {
            text = "⚙"
            this.textSize = 18f
            gravity = Gravity.CENTER
            setTextColor(Color.argb(221, 255, 255, 255))
        }, LinearLayout.LayoutParams(dp(28), dp(42)))

        previewRoot.addView(widget, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(112)).apply { bottomMargin = dp(4) })
        previewRoot.addView(TextView(this).apply {
            text = WidgetUtils.tr(this@NoteWidgetConfigureActivity, "L'anteprima usa colori, dimensione testo, trasparenza e limite caratteri impostati nell'app.")
            this.textSize = 11.5f
            setTextColor(Color.argb(155, 255, 255, 255))
            setPadding(dp(2), dp(7), dp(2), dp(2))
        })
    }

    private fun renderItemCards() {
        listRoot.removeAllViews()
        val items = currentList()
        items.forEachIndexed { index, item ->
            val active = index == selectedIndex
            val global = WidgetUtils.json(this, "widget_note_settings")
            val titleColor = parseColor(global.optString("titleColor", "#FFFFFF"), Color.WHITE)
            val bodyColor = parseColor(global.optString("bodyColor", "#CCFFFFFF"), Color.argb(204, 255, 255, 255))
            val accentColor = parseColor(global.optString("accentColor", "#7F77DD"), Color.rgb(127, 119, 221))
            val baseTextSize = global.optInt("textSize", 14).coerceIn(10, 28)
            val maxChars = global.optInt("maxChars", 500).coerceIn(20, 2000)
            val card = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(14), dp(13), dp(14), dp(13))
                background = rounded(if (active) Color.rgb(42, 50, 74) else Color.rgb(28, 31, 46), if (active) accentColor else Color.rgb(52, 56, 74), 18)
                setOnClickListener { selectedIndex = index; renderPreview(); renderItemCards() }
            }
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.TOP }
            row.addView(TextView(this).apply {
                text = when (type) { "bank" -> "🏦"; "creditCard" -> "💳"; else -> "▤" }
                textSize = 22f
                gravity = Gravity.CENTER
                setTextColor(accentColor)
            }, LinearLayout.LayoutParams(dp(36), dp(40)))
            val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(10), 0, 0, 0) }
            texts.addView(TextView(this).apply {
                text = item.title
                setTextColor(titleColor)
                textSize = (baseTextSize + 1).toFloat()
                setTypeface(null, Typeface.BOLD)
                maxLines = 1
            })
            texts.addView(TextView(this).apply {
                text = previewBody(item, maxChars)
                setTextColor(bodyColor)
                textSize = baseTextSize.toFloat()
                maxLines = if (active) 4 else 3
                setLineSpacing(dp(1).toFloat(), 1.04f)
                gravity = notePreviewGravity(item.html)
            })
            row.addView(texts, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
            if (active) row.addView(TextView(this).apply { text = "✓"; textSize = 24f; setTextColor(accentColor); gravity = Gravity.CENTER }, LinearLayout.LayoutParams(dp(32), dp(40)))
            card.addView(row)
            listRoot.addView(card, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { bottomMargin = dp(10) })
        }
    }

    private fun saveSelection() {
        val list = currentList()
        val item = list.getOrElse(selectedIndex.coerceAtLeast(0)) { list[0] }
        val json = JSONObject().apply {
            put("type", type)
            put("selectedId", item.id)
            put("title", item.title)
            put("body", item.body)
            if (type == "note") put("html", item.html)
        }
        WidgetUtils.saveInstance(this, "note_widget", appWidgetId, json.toString())
        val manager = AppWidgetManager.getInstance(this)
        NoteWidgetProvider.update(this, manager, appWidgetId)
        setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId))
        finish()
    }

    private fun fillItems(arr: JSONArray?, out: MutableList<Item>, fallback: String) {
        if (arr == null) return
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            out.add(Item(o.optString("id", "item_$i"), o.optString("title", fallback), o.optString("body", ""), o.optString("html", "")))
        }
    }

    private fun previewBody(item: Item, maxChars: Int): CharSequence {
        val plain = if (item.body.length > maxChars) item.body.take(maxChars - 1) + "…" else item.body
        if (type != "note" || item.html.isBlank()) return plain
        return try {
            val parsed = Html.fromHtml(
                item.html,
                Html.FROM_HTML_MODE_COMPACT or Html.FROM_HTML_OPTION_USE_CSS_COLORS
            )
            val rich = SpannableStringBuilder(parsed)
            if (rich.length == 0) return plain
            if (rich.length > maxChars) {
                val keep = (maxChars - 1).coerceAtLeast(1)
                rich.delete(keep, rich.length)
                rich.append("…")
            }
            rich
        } catch (_: Exception) {
            plain
        }
    }

    private fun notePreviewGravity(html: String): Int {
        if (type != "note" || html.isBlank()) return Gravity.START
        val normalized = html.lowercase()
        return when {
            normalized.contains("text-align:center") || normalized.contains("text-align: center") || normalized.contains("align=\"center\"") -> Gravity.CENTER_HORIZONTAL
            normalized.contains("text-align:right") || normalized.contains("text-align: right") || normalized.contains("align=\"right\"") -> Gravity.END
            else -> Gravity.START
        }
    }

    private fun parseColor(value: String, fallback: Int): Int {
        return try { Color.parseColor(value) } catch (_: Exception) { fallback }
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
    private fun label(t: String) = TextView(this).apply { text = t; textSize = 14f; setTextColor(Color.argb(220,255,255,255)); setTypeface(null, Typeface.BOLD); setPadding(0, dp(8), 0, dp(10)) }
    private fun rounded(fill: Int, stroke: Int, radius: Int): GradientDrawable = GradientDrawable().apply { setColor(fill); cornerRadius = dp(radius).toFloat(); setStroke(dp(1), stroke) }
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
