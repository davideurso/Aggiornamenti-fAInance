package com.tracker.spese.app;

import it.fainanceapp.app.R;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Shader;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class QuickAddWidgetProvider extends AppWidgetProvider {

    private static final int REQUEST_EXPENSE = 1001;
    private static final int REQUEST_INCOME = 1002;
    private static final int REQUEST_SETTINGS = 1003;
    private static final int REQUEST_VOICE = 1004;
    private static final int REQUEST_RECEIPT = 1005;
    private static final String PREFS_KEY = "widget_quick_add_settings";
    private static final int MODE_FULL = 0;
    private static final int MODE_COMPACT = 1;
    private static final int MODE_2X2 = 2;
    private static final int MODE_1X1 = 3;

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        updateWidget(context, appWidgetManager, appWidgetId);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName component = new ComponentName(context, QuickAddWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(component);
        QuickAddWidgetProvider provider = new QuickAddWidgetProvider();
        for (int id : ids) {
            provider.updateWidget(context, manager, id);
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        WidgetSettings settings = readSettings(context);

        Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
        int minHeight = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT) : 0;
        int minWidth = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) : 0;
        int mode = resolveMode(minWidth, minHeight);
        int layoutId = resolveLayout(mode);
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        int baseBg = parseColor(settings.bgColor, Color.rgb(30, 30, 48));
        int bgAlpha = alphaFromPercent(settings.bgAlpha);
        int rootColor = Color.argb(bgAlpha, Color.red(baseBg), Color.green(baseBg), Color.blue(baseBg));
        int rootRadius = dp(context, 16);
        int buttonRadius = buttonRadius(context, settings.buttonStyle);
        int rootWidth = mode == MODE_1X1 ? 280 : (mode == MODE_2X2 ? 520 : 840);
        int rootHeight = mode == MODE_2X2 ? 520 : (mode == MODE_FULL ? 330 : 180);

        views.setImageViewBitmap(
                R.id.widget_root_bg,
                roundedBitmap(rootColor, rootRadius, dp(context, 1), borderColor(baseBg, mode == MODE_FULL ? 130 : 105), rootWidth, rootHeight)
        );

        int expenseColor = parseColor(settings.expenseColor, Color.rgb(226, 75, 74));
        int incomeColor = parseColor(settings.incomeColor, Color.rgb(29, 158, 117));
        views.setImageViewBitmap(R.id.widget_add_expense_bg, buttonBitmap(expenseColor, buttonRadius, 390, 126));

        if (mode != MODE_1X1) {
            views.setImageViewBitmap(R.id.widget_add_income_bg, buttonBitmap(incomeColor, buttonRadius, 390, 126));
        }
        if (mode == MODE_FULL || mode == MODE_2X2) {
            views.setImageViewBitmap(R.id.widget_voice_bg, buttonBitmap(Color.rgb(127, 119, 221), buttonRadius, 390, 126));
            views.setImageViewBitmap(R.id.widget_receipt_bg, buttonBitmap(Color.rgb(237, 137, 54), buttonRadius, 390, 126));
        }

        views.setTextViewText(R.id.widget_add_expense_icon, "−");
        if (mode == MODE_1X1) {
            views.setTextViewText(R.id.widget_add_expense_label, "Spesa");
        } else if (mode != MODE_2X2) {
            views.setTextViewText(R.id.widget_add_expense_label, cleanActionLabel(settings.expenseLabel, "Uscita"));
            views.setTextViewText(R.id.widget_add_income_icon, "+");
            views.setTextViewText(R.id.widget_add_income_label, cleanActionLabel(settings.incomeLabel, "Entrata"));
        } else {
            views.setTextViewText(R.id.widget_add_income_icon, "+");
        }

        if (mode == MODE_FULL) {
            // Logica invertita come richiesto: nei layout FULL il microfono resta presente.
            views.setViewVisibility(R.id.widget_voice_action, View.VISIBLE);
            views.setTextViewText(R.id.widget_voice_icon, settings.voiceIcon);
            views.setTextViewText(R.id.widget_voice_label, settings.voiceLabel);
            views.setOnClickPendingIntent(R.id.widget_voice_action, createDeepLinkIntent(context, "fainance://open-voice", REQUEST_VOICE));
            views.setTextViewText(R.id.widget_receipt_icon, settings.receiptIcon);
            views.setTextViewText(R.id.widget_receipt_label, settings.receiptLabel);
            views.setOnClickPendingIntent(R.id.widget_receipt_action, createDeepLinkIntent(context, "fainance://open-receipt-camera", REQUEST_RECEIPT));

            views.setTextViewText(R.id.widget_title, safe(settings.title, "fAInance"));
            views.setTextViewText(R.id.widget_subtitle, safe(settings.subtitle, "Aggiunta rapida movimenti"));
            views.setViewVisibility(R.id.widget_header, settings.showHeader ? View.VISIBLE : View.GONE);
            views.setOnClickPendingIntent(R.id.widget_open_settings, createDeepLinkIntent(context, "fainance://widget-settings", REQUEST_SETTINGS));
        } else if (mode == MODE_COMPACT) {
            // Logica invertita: nei layout compatti il toggle controlla l'intero bottone.
            // Anche il suo bordo segue lo stile pulsanti scelto nell'app.
            views.setViewVisibility(R.id.widget_voice_button, settings.showVoiceButton ? View.VISIBLE : View.GONE);
            views.setImageViewBitmap(R.id.widget_voice_button_bg, buttonBitmap(Color.rgb(127, 119, 221), buttonRadius, 126, 126));
            views.setTextViewText(R.id.widget_voice_button_icon, settings.voiceIcon);
            views.setOnClickPendingIntent(R.id.widget_voice_button, createDeepLinkIntent(context, "fainance://open-voice", REQUEST_VOICE));
            views.setOnClickPendingIntent(R.id.widget_open_settings_compact, createDeepLinkIntent(context, "fainance://widget-settings", REQUEST_SETTINGS));
        } else if (mode == MODE_2X2) {
            // Logica invertita: nel formato 2x2 il toggle controlla l'intero bottone.
            views.setViewVisibility(R.id.widget_voice_action, settings.showVoiceButton ? View.VISIBLE : View.GONE);
            views.setTextViewText(R.id.widget_voice_icon, settings.voiceIcon);
            views.setTextViewText(R.id.widget_receipt_icon, settings.receiptIcon);
            views.setOnClickPendingIntent(R.id.widget_voice_action, createDeepLinkIntent(context, "fainance://open-voice", REQUEST_VOICE));
            views.setOnClickPendingIntent(R.id.widget_receipt_action, createDeepLinkIntent(context, "fainance://open-receipt-camera", REQUEST_RECEIPT));
        }

        views.setOnClickPendingIntent(R.id.widget_add_expense, createDeepLinkIntent(context, "fainance://add-expense", REQUEST_EXPENSE));
        if (mode != MODE_1X1) {
            views.setOnClickPendingIntent(R.id.widget_add_income, createDeepLinkIntent(context, "fainance://add-income", REQUEST_INCOME));
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private int resolveMode(int minWidth, int minHeight) {
        if (minWidth <= 0 || minHeight <= 0) return MODE_FULL;

        // Non usare una soglia assoluta di altezza: Samsung/alcuni launcher riportano
        // dimensioni effettive diverse da quelle nominali della griglia.
        // Il rapporto d'aspetto serve solo a scegliere il layout corretto; la visibilità
        // del microfono viene poi applicata nei rami MODE_FULL / MODE_COMPACT / MODE_2X2.
        float aspect = minWidth / (float) Math.max(1, minHeight);
        if (minWidth < 100 && minHeight < 150) return MODE_1X1;
        if (minWidth < 180 && aspect < 1.65f) return MODE_2X2;
        if (minWidth >= 180 && aspect >= 2.20f) return MODE_COMPACT;
        return MODE_FULL;
    }

    private int resolveLayout(int mode) {
        switch (mode) {
            case MODE_1X1: return R.layout.widget_quick_add_1x1;
            case MODE_2X2: return R.layout.widget_quick_add_2x2;
            case MODE_COMPACT: return R.layout.widget_quick_add_compact;
            default: return R.layout.widget_quick_add;
        }
    }

    private WidgetSettings readSettings(Context context) {
        WidgetSettings defaults = new WidgetSettings();
        String raw = null;

        String[] prefNames = new String[]{
                "fainance_widget_prefs",
                "CapacitorStorage",
                context.getPackageName() + "_preferences",
                "com.capacitorjs.plugins.preferences"
        };

        for (String prefName : prefNames) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(prefName, Context.MODE_PRIVATE);
                raw = prefs.getString(PREFS_KEY, null);
                if (raw != null && !raw.trim().isEmpty()) break;
            } catch (Exception ignored) {}
        }

        if (raw == null || raw.trim().isEmpty()) return defaults;

        try {
            JSONObject json = new JSONObject(raw);
            defaults.bgColor = json.optString("bgColor", defaults.bgColor);
            defaults.bgAlpha = json.optInt("bgAlpha", defaults.bgAlpha);
            defaults.expenseColor = json.optString("expenseColor", defaults.expenseColor);
            defaults.incomeColor = json.optString("incomeColor", defaults.incomeColor);
            defaults.title = json.optString("title", defaults.title);
            defaults.subtitle = json.optString("subtitle", defaults.subtitle);
            defaults.expenseLabel = json.optString("expenseLabel", defaults.expenseLabel);
            defaults.incomeLabel = json.optString("incomeLabel", defaults.incomeLabel);
            defaults.showHeader = json.optBoolean("showHeader", defaults.showHeader);
            defaults.buttonStyle = json.optString("buttonStyle", defaults.buttonStyle);
            defaults.showVoiceButton = json.optBoolean("showVoiceButton", defaults.showVoiceButton);
            defaults.voiceLabel = json.optString("voiceLabel", defaults.voiceLabel);
            defaults.voiceIcon = json.optString("voiceIcon", defaults.voiceIcon);
            defaults.receiptLabel = json.optString("receiptLabel", defaults.receiptLabel);
            defaults.receiptIcon = json.optString("receiptIcon", defaults.receiptIcon);
        } catch (Exception ignored) {}
        return defaults;
    }

    private String safe(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        return value.trim();
    }

    private String cleanActionLabel(String value, String fallback) {
        String cleaned = safe(value, fallback).replaceFirst("^\\s*[+\\-−]\\s*", "").trim();
        return cleaned.isEmpty() ? fallback : cleaned;
    }

    private int alphaFromPercent(int transparencyPercent) {
        int safe = Math.max(0, Math.min(100, transparencyPercent));
        return Math.round(255f * ((100 - safe) / 100f));
    }

    private int parseColor(String color, int fallback) {
        try {
            if (color == null) return fallback;
            String c = color.trim();
            if (!c.startsWith("#")) return fallback;
            if (c.length() == 4) {
                c = "#" + c.substring(1,2) + c.substring(1,2) + c.substring(2,3) + c.substring(2,3) + c.substring(3,4) + c.substring(3,4);
            }
            return Color.parseColor(c);
        } catch (Exception e) {
            return fallback;
        }
    }

    private int borderColor(int color, int alpha) {
        int r = Math.min(255, Color.red(color) + 70);
        int g = Math.min(255, Color.green(color) + 70);
        int b = Math.min(255, Color.blue(color) + 70);
        return Color.argb(alpha, r, g, b);
    }

    private Bitmap roundedBitmap(int color, float radius, int strokeWidth, int strokeColor, int width, int height) {
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF rect = new RectF(strokeWidth, strokeWidth, width - strokeWidth, height - strokeWidth);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(color);
        canvas.drawRoundRect(rect, radius, radius, paint);
        if (strokeWidth > 0) {
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(strokeWidth);
            paint.setColor(strokeColor);
            canvas.drawRoundRect(rect, radius, radius, paint);
        }
        return bitmap;
    }

    private Bitmap buttonBitmap(int color, float radius, int width, int height) {
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        RectF rect = new RectF(2, 2, width - 2, height - 2);

        int light = lighten(color, 20);
        int dark = darken(color, 10);
        paint.setStyle(Paint.Style.FILL);
        paint.setShader(new LinearGradient(0, 0, width, height, light, dark, Shader.TileMode.CLAMP));
        canvas.drawRoundRect(rect, radius, radius, paint);
        paint.setShader(null);

        // Solo un bordo leggero: eliminate le vecchie linee/onde bianche decorative.
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(1);
        paint.setColor(Color.argb(55, 255, 255, 255));
        canvas.drawRoundRect(rect, radius, radius, paint);
        return bitmap;
    }

    private int lighten(int color, int amount) {
        return Color.rgb(Math.min(255, Color.red(color) + amount), Math.min(255, Color.green(color) + amount), Math.min(255, Color.blue(color) + amount));
    }

    private int darken(int color, int amount) {
        return Color.rgb(Math.max(0, Color.red(color) - amount), Math.max(0, Color.green(color) - amount), Math.max(0, Color.blue(color) - amount));
    }

    private int buttonRadius(Context context, String style) {
        String id = style == null ? "soft" : style.trim().toLowerCase();
        if ("rounded".equals(id)) return dp(context, 20);
        if ("square".equals(id)) return dp(context, 6);
        if ("sharp".equals(id)) return dp(context, 2);
        return dp(context, 10); // soft
    }

    private int dp(Context context, int value) {
        return Math.round(value * context.getResources().getDisplayMetrics().density);
    }

    private PendingIntent createDeepLinkIntent(Context context, String deepLink, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(deepLink));
        intent.setPackage(context.getPackageName());
        intent.addCategory(Intent.CATEGORY_DEFAULT);
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        return PendingIntent.getActivity(
                context,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static class WidgetSettings {
        String bgColor = "#1E1E30";
        int bgAlpha = 65;
        String expenseColor = "#E24B4A";
        String incomeColor = "#1D9E75";
        String title = "fAInance";
        String subtitle = "Aggiunta rapida movimenti";
        String expenseLabel = "Uscita";
        String incomeLabel = "Entrata";
        String buttonStyle = "rounded";
        boolean showHeader = true;
        boolean showVoiceButton = true;
        String voiceLabel = "Voce";
        String voiceIcon = "🎙";
        String receiptLabel = "Scontrino";
        String receiptIcon = "📷";
    }
}
