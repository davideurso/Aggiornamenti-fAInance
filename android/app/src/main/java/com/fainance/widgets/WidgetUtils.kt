package com.fainance.widgets

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

object WidgetUtils {
    private const val PREFS_NAME = "fainance_widget_prefs"

    fun prefs(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun save(context: Context, key: String, value: String) {
        prefs(context).edit().putString(key, value).apply()
    }

    fun rawString(context: Context, key: String, fallback: String = ""): String {
        val prefNames = arrayOf(
            PREFS_NAME,
            "CapacitorStorage",
            context.packageName + "_preferences",
            "com.capacitorjs.plugins.preferences"
        )
        for (prefName in prefNames) {
            try {
                val raw = context.getSharedPreferences(prefName, Context.MODE_PRIVATE).getString(key, null)
                if (!raw.isNullOrBlank()) return raw
            } catch (_: Exception) {}
        }
        return fallback
    }

    fun json(context: Context, key: String): JSONObject {
        val raw = rawString(context, key, "{}")
        return try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
    }

    fun jsonArray(context: Context, key: String): JSONArray {
        val raw = rawString(context, key, "[]")
        return try { JSONArray(raw) } catch (_: Exception) { JSONArray() }
    }

    fun currentPlan(context: Context): String {
        val plan = rawString(context, "widget_current_plan", "free").trim().lowercase()
        return if (plan == "base" || plan == "premium" || plan == "complete" || plan == "completa") plan else "free"
    }

    fun isWidgetAllowed(context: Context, type: String): Boolean {
        if (type == "quick") return true
        val planAllowed = planRank(currentPlan(context)) >= planRank(requiredPlan(type))
        if (!planAllowed) return false
        val availability = json(context, "widget_plan_availability")
        if (availability.has(type)) return availability.optBoolean(type, false)
        val available = jsonArray(context, "widget_available_types")
        if (available.length() > 0) {
            for (i in 0 until available.length()) if (available.optString(i) == type) return true
            return false
        }
        return true
    }

    fun requiredPlan(type: String): String {
        return when (type) {
            "note", "goal", "debtCredits" -> "base"
            "share" -> "premium"
            else -> "free"
        }
    }

    fun requiredPlanLabel(type: String): String {
        return when (requiredPlan(type)) {
            "base" -> "Base"
            "premium" -> "Completo"
            else -> "Gratis"
        }
    }

    fun lockedWidgetTitle(type: String): String { return "Widget disponibile dal piano ${requiredPlanLabel(type)}" }

    fun lockedWidgetMessage(type: String): String {
        return "Disponibile dal piano ${requiredPlanLabel(type)}. Apri Info in fAInance per cambiare piano."
    }

    private fun planRank(plan: String): Int {
        return when (plan) {
            "base" -> 1
            "premium", "complete", "completa" -> 2
            else -> 0
        }
    }

    fun instanceJson(context: Context, prefix: String, widgetId: Int): JSONObject {
        val raw = prefs(context).getString("${prefix}_${widgetId}", null)
        return if (raw.isNullOrBlank()) JSONObject() else try { JSONObject(raw) } catch (_: Exception) { JSONObject() }
    }

    fun saveInstance(context: Context, prefix: String, widgetId: Int, value: String) {
        prefs(context).edit().putString("${prefix}_${widgetId}", value).apply()
    }

    fun deleteInstance(context: Context, prefix: String, widgetId: Int) {
        prefs(context).edit().remove("${prefix}_${widgetId}").apply()
    }

    fun openIntent(context: Context, url: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
            setPackage(context.packageName)
            addCategory(Intent.CATEGORY_BROWSABLE)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val requestCode = url.hashCode()
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun configureNoteIntent(context: Context, widgetId: Int): PendingIntent {
        val intent = Intent(context, NoteWidgetConfigureActivity::class.java).apply {
            putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(context, widgetId + 210000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun configureGoalIntent(context: Context, widgetId: Int): PendingIntent {
        val intent = Intent(context, GoalWidgetConfigureActivity::class.java).apply {
            putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(context, widgetId + 220000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun configureShoppingListIntent(context: Context, widgetId: Int): PendingIntent {
        val intent = Intent(context, ShoppingListWidgetConfigureActivity::class.java).apply {
            putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(context, widgetId + 230000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun configureFidelityIntent(context: Context, widgetId: Int): PendingIntent {
        val intent = Intent(context, FidelityWidgetConfigureActivity::class.java).apply {
            putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(context, widgetId + 240000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun configureDebtCreditsIntent(context: Context, widgetId: Int): PendingIntent {
        val intent = Intent(context, DebtCreditsWidgetConfigureActivity::class.java).apply {
            putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(context, widgetId + 250000, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun parseColor(value: String?, fallback: Int): Int {
        return try { if (value.isNullOrBlank()) fallback else Color.parseColor(value) } catch (_: Exception) { fallback }
    }

    fun barcodeVisual(code: String): String {
        val clean = code.filter { it.isDigit() }.ifBlank { code }
        if (clean.isBlank()) return ""
        val parts = clean.mapIndexed { idx, ch ->
            val n = (ch.code + idx) % 5
            when (n) {
                0 -> "▌"
                1 -> "█"
                2 -> "▐"
                3 -> "▌█"
                else -> "█▌"
            }
        }
        return parts.joinToString(" ")
    }

    private fun ean13Digits(code: String): String? {
        val digits = code.filter { it.isDigit() }
        if (digits.length >= 13) return digits.substring(0, 13)
        if (digits.length == 12) {
            var sum = 0
            for (i in digits.indices) {
                val n = digits[i].digitToInt()
                sum += if (i % 2 == 0) n else n * 3
            }
            val check = (10 - (sum % 10)) % 10
            return digits + check.toString()
        }
        return null
    }

    fun barcodeBitmap(code: String, width: Int = 900, height: Int = 300): Bitmap {
        val bitmap = Bitmap.createBitmap(width.coerceAtLeast(320), height.coerceAtLeast(160), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK; style = Paint.Style.FILL }
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK; textSize = 28f; textAlign = Paint.Align.CENTER; typeface = android.graphics.Typeface.MONOSPACE }
        val ean = ean13Digits(code)
        if (ean != null) {
            val l = arrayOf("0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011")
            val g = arrayOf("0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111")
            val r = arrayOf("1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100")
            val parity = arrayOf("LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL")
            val first = ean[0].digitToInt()
            val bits = StringBuilder("101")
            val p = parity[first]
            for (i in 1..6) bits.append(if (p[i-1] == 'L') l[ean[i].digitToInt()] else g[ean[i].digitToInt()])
            bits.append("01010")
            for (i in 7..12) bits.append(r[ean[i].digitToInt()])
            bits.append("101")
            val quiet = 12
            val total = bits.length + quiet * 2
            val barTop = 18f
            val barBottom = height - 42f
            val module = width.toFloat() / total.toFloat()
            var x = quiet * module
            bits.forEachIndexed { idx, bit ->
                if (bit == '1') {
                    val guard = idx < 3 || idx in 45..49 || idx >= 92
                    canvas.drawRect(x, barTop, x + module.coerceAtLeast(1f), if (guard) barBottom + 18f else barBottom, paint)
                }
                x += module
            }
            canvas.drawText(ean, width / 2f, height - 10f, textPaint)
            return bitmap
        }
        val clean = code.ifBlank { "0000000000000" }
        val bars = clean.flatMapIndexed { idx, ch ->
            val v = (ch.code + idx * 7) % 9 + 1
            listOf(v % 3 + 1, 1, v % 4 + 1, 2)
        }
        val total = bars.sum() + 24
        val module = width.toFloat() / total
        var x = 12 * module
        var black = true
        bars.forEach { w ->
            val ww = w * module
            if (black) canvas.drawRect(x, 18f, x + ww, height - 42f, paint)
            x += ww
            black = !black
        }
        canvas.drawText(clean.take(32), width / 2f, height - 10f, textPaint)
        return bitmap
    }

    fun bgDrawableRes(context: Context, alpha: Int): Int {
        val safeAlpha = alpha.coerceIn(0, 100)
        val exactName = "widget_panel_bg_${safeAlpha}"
        val exact = context.resources.getIdentifier(exactName, "drawable", context.packageName)
        if (exact != 0) return exact
        val fallbackName = when {
            safeAlpha <= 0 -> "widget_panel_bg_0"
            safeAlpha >= 100 -> "widget_panel_bg_100"
            else -> "widget_panel_bg_${(safeAlpha / 5) * 5}"
        }
        val fallback = context.resources.getIdentifier(fallbackName, "drawable", context.packageName)
        if (fallback != 0) return fallback
        val generic = context.resources.getIdentifier("widget_panel_bg", "drawable", context.packageName)
        if (generic != 0) return generic
        return android.R.color.transparent
    }


    fun withAlpha(color: Int, alphaPercent: Int): Int {
        val a = (alphaPercent.coerceIn(0, 100) * 255 / 100)
        return Color.argb(a, Color.red(color), Color.green(color), Color.blue(color))
    }

    fun appLang(context: Context): String {
        val raw = rawString(context, "pref_lang_v2", "")
            .trim()
            .trim('"')
            .lowercase()
        val code = if (raw.length >= 2) raw.substring(0, 2) else java.util.Locale.getDefault().language.lowercase()
        return when (code) {
            "en","es","fr","de","pt","pl","nl","ro","el","it" -> code
            else -> "it"
        }
    }

    fun tr(context: Context, key: String): String {
        val lang = appLang(context)
        val values = mapOf(
            "Configura widget Nota / IBAN" to mapOf("en" to "Configure Note / IBAN widget","es" to "Configurar widget Nota / IBAN","fr" to "Configurer le widget Note / IBAN","de" to "Widget Notiz / IBAN konfigurieren","pt" to "Configurar widget Nota / IBAN","pl" to "Skonfiguruj widżet Notatka / IBAN","nl" to "Widget Notitie / IBAN configureren","ro" to "Configurează widgetul Notă / IBAN","el" to "Ρύθμιση widget Σημείωση / IBAN"),
            "Configura widget Obiettivo" to mapOf("en" to "Configure Goal widget","es" to "Configurar widget Objetivo","fr" to "Configurer le widget Objectif","de" to "Widget Ziel konfigurieren","pt" to "Configurar widget Objetivo","pl" to "Skonfiguruj widżet Cel","nl" to "Widget Doel configureren","ro" to "Configurează widgetul Obiectiv","el" to "Ρύθμιση widget Στόχος"),
            "Configura widget Share" to mapOf("en" to "Configure Share widget","es" to "Configurar widget Share","fr" to "Configurer le widget Share","de" to "Widget Share konfigurieren","pt" to "Configurar widget Share","pl" to "Skonfiguruj widżet Share","nl" to "Widget Share configureren","ro" to "Configurează widgetul Share","el" to "Ρύθμιση widget Share"),
            "Configura widget Lista spesa" to mapOf("en" to "Configure Shopping list widget","es" to "Configurar widget Lista de la compra","fr" to "Configurer le widget Liste de courses","de" to "Widget Einkaufsliste konfigurieren","pt" to "Configurar widget Lista de compras","pl" to "Skonfiguruj widżet Lista zakupów","nl" to "Widget Boodschappenlijst configureren","ro" to "Configurează widgetul Listă de cumpărături","el" to "Ρύθμιση widget Λίστα αγορών"),
            "Configura widget Fidelity card" to mapOf("en" to "Configure Fidelity card widget","es" to "Configurar widget Tarjeta fidelidad","fr" to "Configurer le widget Carte fidélité","de" to "Widget Kundenkarte konfigurieren","pt" to "Configurar widget Cartão fidelidade","pl" to "Skonfiguruj widżet Karta lojalnościowa","nl" to "Widget Klantenkaart configureren","ro" to "Configurează widgetul Card fidelitate","el" to "Ρύθμιση widget Κάρτα πελάτη"),
            "Configura widget Debiti / Crediti" to mapOf("en" to "Configure Debts / Credits widget","es" to "Configurar widget Deudas / Créditos","fr" to "Configurer le widget Dettes / Crédits","de" to "Widget Schulden / Guthaben konfigurieren","pt" to "Configurar widget Dívidas / Créditos","pl" to "Skonfiguruj widżet Długi / Należności","nl" to "Widget Schulden / Tegoeden configureren","ro" to "Configurează widgetul Datorii / Credite","el" to "Ρύθμιση widget Χρέη / Πιστώσεις"),
            "Scegli solo il contenuto da mostrare in questo widget. Trasparenza, limite caratteri e stile restano nelle impostazioni Widget dell'app e valgono per tutti i widget Nota / IBAN." to mapOf("en" to "Choose only the content to show in this widget. Transparency, character limit and style remain in the app Widget settings and apply to all Note / IBAN widgets.","es" to "Elige solo el contenido que se mostrará en este widget. Transparencia, límite de caracteres y estilo quedan en los ajustes de Widget de la app y valen para todos los widgets Nota / IBAN.","fr" to "Choisissez uniquement le contenu à afficher dans ce widget. Transparence, limite de caractères et style restent dans les paramètres Widget de l’app et valent pour tous les widgets Note / IBAN.","de" to "Wähle nur den Inhalt für dieses Widget. Transparenz, Zeichenlimit und Stil bleiben in den Widget-Einstellungen der App und gelten für alle Notiz-/IBAN-Widgets.","pt" to "Escolhe apenas o conteúdo a mostrar neste widget. Transparência, limite de caracteres e estilo ficam nas definições de Widget da app e valem para todos os widgets Nota / IBAN.","pl" to "Wybierz tylko treść do pokazania w tym widżecie. Przezroczystość, limit znaków i styl pozostają w ustawieniach widżetów aplikacji i dotyczą wszystkich widżetów Notatka / IBAN.","nl" to "Kies alleen de inhoud die in deze widget wordt getoond. Transparantie, tekenlimiet en stijl blijven in de widgetinstellingen van de app en gelden voor alle Notitie / IBAN-widgets.","ro" to "Alege doar conținutul afișat în acest widget. Transparența, limita de caractere și stilul rămân în setările Widget ale aplicației și se aplică tuturor widgeturilor Notă / IBAN.","el" to "Επιλέξτε μόνο το περιεχόμενο που θα εμφανίζεται σε αυτό το widget. Η διαφάνεια, το όριο χαρακτήρων και το στυλ παραμένουν στις ρυθμίσεις Widget της εφαρμογής και ισχύουν για όλα τα widget Σημείωση / IBAN."),
            "Scegli solo l'obiettivo da mostrare in questo widget. Trasparenza, percentuale, importi e colore fallback restano nelle impostazioni Widget dell'app e valgono per tutti i widget Obiettivo." to mapOf("en" to "Choose only the goal to show in this widget. Transparency, percentage, amounts and fallback color remain in the app Widget settings and apply to all Goal widgets.","es" to "Elige solo el objetivo que se mostrará en este widget. Transparencia, porcentaje, importes y color alternativo quedan en los ajustes de Widget de la app y valen para todos los widgets Objetivo.","fr" to "Choisissez uniquement l’objectif à afficher dans ce widget. Transparence, pourcentage, montants et couleur de secours restent dans les paramètres Widget de l’app et valent pour tous les widgets Objectif.","de" to "Wähle nur das Ziel für dieses Widget. Transparenz, Prozent, Beträge und Ersatzfarbe bleiben in den Widget-Einstellungen der App und gelten für alle Ziel-Widgets.","pt" to "Escolhe apenas o objetivo a mostrar neste widget. Transparência, percentagem, valores e cor alternativa ficam nas definições de Widget da app e valem para todos os widgets Objetivo.","pl" to "Wybierz tylko cel do pokazania w tym widżecie. Przezroczystość, procent, kwoty i kolor zapasowy pozostają w ustawieniach widżetów aplikacji i dotyczą wszystkich widżetów Cel.","nl" to "Kies alleen het doel dat in deze widget wordt getoond. Transparantie, percentage, bedragen en terugvalkleur blijven in de widgetinstellingen van de app en gelden voor alle Doel-widgets.","ro" to "Alege doar obiectivul afișat în acest widget. Transparența, procentul, sumele și culoarea de rezervă rămân în setările Widget ale aplicației și se aplică tuturor widgeturilor Obiectiv.","el" to "Επιλέξτε μόνο τον στόχο που θα εμφανίζεται σε αυτό το widget. Η διαφάνεια, το ποσοστό, τα ποσά και το εναλλακτικό χρώμα παραμένουν στις ρυθμίσεις Widget της εφαρμογής και ισχύουν για όλα τα widget Στόχος."),
            "Scegli il progetto da mostrare in questo widget. Colori, trasparenza e stile restano nelle impostazioni Widget dell'app." to mapOf("en" to "Choose the project to show in this widget. Colors, transparency and style remain in the app Widget settings.","es" to "Elige el proyecto que se mostrará en este widget. Colores, transparencia y estilo quedan en los ajustes de Widget de la app.","fr" to "Choisissez le projet à afficher dans ce widget. Couleurs, transparence et style restent dans les paramètres Widget de l’app.","de" to "Wähle das Projekt für dieses Widget. Farben, Transparenz und Stil bleiben in den Widget-Einstellungen der App.","pt" to "Escolhe o projeto a mostrar neste widget. Cores, transparência e estilo ficam nas definições de Widget da app.","pl" to "Wybierz projekt do pokazania w tym widżecie. Kolory, przezroczystość i styl pozostają w ustawieniach widżetów aplikacji.","nl" to "Kies het project dat in deze widget wordt getoond. Kleuren, transparantie en stijl blijven in de widgetinstellingen van de app.","ro" to "Alege proiectul afișat în acest widget. Culorile, transparența și stilul rămân în setările Widget ale aplicației.","el" to "Επιλέξτε το έργο που θα εμφανίζεται σε αυτό το widget. Τα χρώματα, η διαφάνεια και το στυλ παραμένουν στις ρυθμίσεις Widget της εφαρμογής."),
            "Scegli la lista da mostrare in questo widget. L’impostazione vale solo per questo widget." to mapOf("en" to "Choose the list to show in this widget. This setting applies only to this widget.","es" to "Elige la lista que se mostrará en este widget. Este ajuste se aplica solo a este widget.","fr" to "Choisissez la liste à afficher dans ce widget. Ce réglage s’applique uniquement à ce widget.","de" to "Wähle die Liste, die in diesem Widget angezeigt werden soll. Diese Einstellung gilt nur für dieses Widget.","pt" to "Escolhe a lista a mostrar neste widget. Esta definição aplica-se apenas a este widget.","pl" to "Wybierz listę do pokazania w tym widżecie. To ustawienie dotyczy tylko tego widżetu.","nl" to "Kies de lijst die in deze widget wordt getoond. Deze instelling geldt alleen voor deze widget.","ro" to "Alege lista de afișat în acest widget. Setarea se aplică doar acestui widget.","el" to "Επιλέξτε τη λίστα που θα εμφανίζεται σε αυτό το widget. Η ρύθμιση ισχύει μόνο για αυτό το widget."),
            "Scegli la carta da mostrare in questo widget. L’impostazione vale solo per questo widget." to mapOf("en" to "Choose the card to show in this widget. This setting applies only to this widget.","es" to "Elige la tarjeta que se mostrará en este widget. Este ajuste se aplica solo a este widget.","fr" to "Choisissez la carte à afficher dans ce widget. Ce réglage s’applique uniquement à ce widget.","de" to "Wähle die Karte, die in diesem Widget angezeigt werden soll. Diese Einstellung gilt nur für dieses Widget.","pt" to "Escolhe o cartão a mostrar neste widget. Esta definição aplica-se apenas a este widget.","pl" to "Wybierz kartę do pokazania w tym widżecie. To ustawienie dotyczy tylko tego widżetu.","nl" to "Kies de kaart die in deze widget wordt getoond. Deze instelling geldt alleen voor deze widget.","ro" to "Alege cardul de afișat în acest widget. Setarea se aplică doar acestui widget.","el" to "Επιλέξτε την κάρτα που θα εμφανίζεται σε αυτό το widget. Η ρύθμιση ισχύει μόνο για αυτό το widget."),
            "Seleziona uno o più debiti/crediti da mostrare. L’impostazione vale solo per questo widget." to mapOf("en" to "Select one or more debts/credits to show. This setting applies only to this widget.","es" to "Selecciona una o más deudas/créditos que se mostrarán. Este ajuste se aplica solo a este widget.","fr" to "Sélectionnez une ou plusieurs dettes/crédits à afficher. Ce réglage s’applique uniquement à ce widget.","de" to "Wähle eine oder mehrere Schulden/Guthaben aus. Diese Einstellung gilt nur für dieses Widget.","pt" to "Seleciona uma ou mais dívidas/créditos a mostrar. Esta definição aplica-se apenas a este widget.","pl" to "Wybierz jeden lub więcej długów/należności do pokazania. To ustawienie dotyczy tylko tego widżetu.","nl" to "Selecteer een of meer schulden/tegoeden om te tonen. Deze instelling geldt alleen voor deze widget.","ro" to "Selectează una sau mai multe datorii/credite de afișat. Setarea se aplică doar acestui widget.","el" to "Επιλέξτε ένα ή περισσότερα χρέη/πιστώσεις για εμφάνιση. Η ρύθμιση ισχύει μόνο για αυτό το widget."),

            "Progetto da mostrare" to mapOf("en" to "Project to show","es" to "Proyecto para mostrar","fr" to "Projet à afficher","de" to "Anzuzeigendes Projekt","pt" to "Projeto a mostrar","pl" to "Projekt do pokazania","nl" to "Project om te tonen","ro" to "Proiect de afișat","el" to "Έργο για εμφάνιση"),
            "Nessun progetto disponibile" to mapOf("en" to "No project available","es" to "Ningún proyecto disponible","fr" to "Aucun projet disponible","de" to "Kein Projekt verfügbar","pt" to "Nenhum projeto disponível","pl" to "Brak dostępnego projektu","nl" to "Geen project beschikbaar","ro" to "Niciun proiect disponibil","el" to "Δεν υπάρχει διαθέσιμο έργο"),
            "Crea prima un progetto Share nell'app." to mapOf("en" to "Create a Share project in the app first.","es" to "Primero crea un proyecto Share en la app.","fr" to "Créez d’abord un projet Share dans l’app.","de" to "Erstelle zuerst ein Share-Projekt in der App.","pt" to "Cria primeiro um projeto Share na app.","pl" to "Najpierw utwórz projekt Share w aplikacji.","nl" to "Maak eerst een Share-project in de app.","ro" to "Creează mai întâi un proiect Share în aplicație.","el" to "Δημιουργήστε πρώτα ένα έργο Share στην εφαρμογή."),
            "Nessuna carta disponibile. Apri fAInance e crea una fidelity card." to mapOf("en" to "No card available. Open fAInance and create a fidelity card.","es" to "Ninguna tarjeta disponible. Abre fAInance y crea una tarjeta de fidelidad.","fr" to "Aucune carte disponible. Ouvrez fAInance et créez une carte de fidélité.","de" to "Keine Karte verfügbar. Öffne fAInance und erstelle eine Kundenkarte.","pt" to "Nenhum cartão disponível. Abre o fAInance e cria um cartão de fidelidade.","pl" to "Brak karty. Otwórz fAInance i utwórz kartę lojalnościową.","nl" to "Geen kaart beschikbaar. Open fAInance en maak een klantenkaart.","ro" to "Niciun card disponibil. Deschide fAInance și creează un card de fidelitate.","el" to "Δεν υπάρχει διαθέσιμη κάρτα. Ανοίξτε το fAInance και δημιουργήστε μια κάρτα πιστότητας."),
            "Nessun debito o credito disponibile." to mapOf("en" to "No debt or credit available.","es" to "Ninguna deuda o crédito disponible.","fr" to "Aucune dette ou crédit disponible.","de" to "Keine Schuld oder kein Guthaben verfügbar.","pt" to "Nenhuma dívida ou crédito disponível.","pl" to "Brak długów lub należności.","nl" to "Geen schuld of tegoed beschikbaar.","ro" to "Nicio datorie sau credit disponibil.","el" to "Δεν υπάρχει διαθέσιμο χρέος ή πίστωση."),
            "Saldo" to mapOf("en" to "Balance","es" to "Saldo","fr" to "Solde","de" to "Saldo","pt" to "Saldo","pl" to "Saldo","nl" to "Saldo","ro" to "Sold","el" to "Υπόλοιπο"),
            "Ti devono" to mapOf("en" to "They owe you","es" to "Te deben","fr" to "On vous doit","de" to "Dir wird geschuldet","pt" to "Devem-te","pl" to "Tobie są winni","nl" to "Zij zijn jou verschuldigd","ro" to "Ți se datorează","el" to "Σου οφείλουν"),
            "Devi" to mapOf("en" to "You owe","es" to "Debes","fr" to "Vous devez","de" to "Du schuldest","pt" to "Deves","pl" to "Jesteś winien","nl" to "Jij bent verschuldigd","ro" to "Datorezi","el" to "Οφείλεις"),
            "Icon Color" to mapOf("it" to "Colore icona","en" to "Icon color","es" to "Color del icono","fr" to "Couleur de l’icône","de" to "Symbolfarbe","pt" to "Cor do ícone","pl" to "Kolor ikony","nl" to "Pictogramkleur","ro" to "Culoare pictogramă","el" to "Χρώμα εικονιδίου"),
            "Title Color" to mapOf("it" to "Colore titolo","en" to "Title color","es" to "Color del título","fr" to "Couleur du titre","de" to "Titelfarbe","pt" to "Cor do título","pl" to "Kolor tytułu","nl" to "Titelkleur","ro" to "Culoare titlu","el" to "Χρώμα τίτλου"),
            "Text Color" to mapOf("it" to "Colore testo","en" to "Text color","es" to "Color del texto","fr" to "Couleur du texte","de" to "Textfarbe","pt" to "Cor do texto","pl" to "Kolor tekstu","nl" to "Tekstkleur","ro" to "Culoare text","el" to "Χρώμα κειμένου"),
            "Save and Update widget" to mapOf("it" to "Salva e aggiorna widget","en" to "Save and update widget","es" to "Guardar y actualizar widget","fr" to "Enregistrer et mettre à jour le widget","de" to "Widget speichern und aktualisieren","pt" to "Guardar e atualizar widget","pl" to "Zapisz i zaktualizuj widżet","nl" to "Widget opslaan en bijwerken","ro" to "Salvează și actualizează widgetul","el" to "Αποθήκευση και ενημέρωση widget"),
            "Tipo di contenuto" to mapOf("en" to "Content type","es" to "Tipo de contenido","fr" to "Type de contenu","de" to "Inhaltstyp","pt" to "Tipo de conteúdo","pl" to "Typ treści","nl" to "Type inhoud","ro" to "Tip de conținut","el" to "Τύπος περιεχομένου"),
            "Contenuto da mostrare" to mapOf("en" to "Content to show","es" to "Contenido para mostrar","fr" to "Contenu à afficher","de" to "Anzuzeigender Inhalt","pt" to "Conteúdo a mostrar","pl" to "Treść do pokazania","nl" to "Inhoud om te tonen","ro" to "Conținut de afișat","el" to "Περιεχόμενο για εμφάνιση"),
            "SALVA WIDGET" to mapOf("en" to "SAVE WIDGET","es" to "GUARDAR WIDGET","fr" to "ENREGISTRER LE WIDGET","de" to "WIDGET SPEICHERN","pt" to "GUARDAR WIDGET","pl" to "ZAPISZ WIDŻET","nl" to "WIDGET OPSLAAN","ro" to "SALVEAZĂ WIDGETUL","el" to "ΑΠΟΘΗΚΕΥΣΗ WIDGET"),
            "Nessuna lista disponibile" to mapOf("en" to "No list available","es" to "Ninguna lista disponible","fr" to "Aucune liste disponible","de" to "Keine Liste verfügbar","pt" to "Nenhuma lista disponível","pl" to "Brak dostępnych list","nl" to "Geen lijst beschikbaar","ro" to "Nicio listă disponibilă","el" to "Δεν υπάρχει διαθέσιμη λίστα"),
            "Nessuna carta disponibile" to mapOf("en" to "No card available","es" to "Ninguna tarjeta disponible","fr" to "Aucune carte disponible","de" to "Keine Karte verfügbar","pt" to "Nenhum cartão disponível","pl" to "Brak dostępnych kart","nl" to "Geen kaart beschikbaar","ro" to "Niciun card disponibil","el" to "Δεν υπάρχει διαθέσιμη κάρτα"),
            "Nessun Debito / Credito disponibile" to mapOf("en" to "No debt / credit available","es" to "Ninguna deuda / crédito disponible","fr" to "Aucune dette / crédit disponible","de" to "Keine Schuld / kein Guthaben verfügbar","pt" to "Nenhuma dívida / crédito disponível","pl" to "Brak długów / należności","nl" to "Geen schuld / tegoed beschikbaar","ro" to "Nicio datorie / credit disponibil","el" to "Δεν υπάρχει διαθέσιμο χρέος / πίστωση"),
            "Nota" to mapOf("en" to "Note","es" to "Nota","fr" to "Note","de" to "Notiz","pt" to "Nota","pl" to "Notatka","nl" to "Notitie","ro" to "Notă","el" to "Σημείωση"),
            "Coordinata" to mapOf("en" to "Bank detail","es" to "Coordenada","fr" to "Coordonnée","de" to "Bankdaten","pt" to "Coordenada","pl" to "Dane bankowe","nl" to "Bankgegeven","ro" to "Coordonată","el" to "Τραπεζικό στοιχείο")
        )
        if (lang == "it") return key
        return values[key]?.get(lang) ?: key
    }

    fun money(value: Double, currency: String): String {
        val rounded = String.format(java.util.Locale.ITALY, "%,.0f", value).replace(',', '.')
        return "$rounded $currency"
    }
}
