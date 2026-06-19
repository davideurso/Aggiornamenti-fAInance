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

public class ShareWidgetProvider extends AppWidgetProvider {
    private static final int REQUEST_OPEN_SHARE = 4101;
    private static final int REQUEST_ADD_SHARE_EXPENSE = 4102;
    private static final String PREFS_KEY = "widget_share_settings";

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
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName component = new ComponentName(context, ShareWidgetProvider.class);
            int[] ids = manager.getAppWidgetIds(component);
            ShareWidgetProvider provider = new ShareWidgetProvider();
            for (int id : ids) {
                provider.updateWidget(context, manager, id);
            }
        } catch (Exception ignored) {}
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        if (!WidgetPlanGuard.isAllowed(context, "share")) {
            renderLocked(context, appWidgetManager, appWidgetId);
            return;
        }
        ShareWidgetSettings settings = readSettings(context);

        Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
        int minHeight = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT) : 0;
        int minWidth = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH) : 0;
        boolean compact = (minHeight > 0 && minHeight < 105) || (minWidth > 0 && minWidth < 220);
        int layoutId = compact ? R.layout.widget_share_preview : R.layout.widget_share;

        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        int baseBg = parseColor(settings.bgColor, Color.rgb(30, 30, 48));
        int bgAlpha = alphaFromPercent(settings.bgAlpha);
        int rootColor = Color.argb(bgAlpha, Color.red(baseBg), Color.green(baseBg), Color.blue(baseBg));
        views.setImageViewBitmap(
                R.id.share_widget_root_bg,
                roundedBitmap(rootColor, dp(context, 12), dp(context, 1), borderColor(baseBg, 130), compact ? 760 : 900, compact ? 150 : 290)
        );

        int accent = parseColor(settings.accentColor, Color.rgb(127, 119, 221));
        views.setImageViewBitmap(R.id.share_widget_action_bg, buttonBitmap(accent, dp(context, 12), compact ? 260 : 360, compact ? 90 : 120));

        views.setTextViewText(R.id.share_widget_title, safe(settings.title, "Share"));
        views.setTextViewText(R.id.share_widget_subtitle, safe(settings.subtitle, "Progetti, costi condivisi e saldi"));
        views.setTextViewText(R.id.share_widget_balance_label, safe(settings.balanceLabel, "Saldo netto"));
        views.setTextViewText(R.id.share_widget_balance_value, safe(settings.balanceValue, "Apri Share"));
        views.setTextViewText(R.id.share_widget_action_label, compact ? "+" : "+ Spesa condivisa");

        PendingIntent openShare = createDeepLinkIntent(context, "fainance://open-share", REQUEST_OPEN_SHARE + appWidgetId);
        PendingIntent addShare = createDeepLinkIntent(context, "fainance://share-add-expense", REQUEST_ADD_SHARE_EXPENSE + appWidgetId);

        views.setOnClickPendingIntent(R.id.share_widget_root, openShare);
        views.setOnClickPendingIntent(R.id.share_widget_title_box, openShare);
        views.setOnClickPendingIntent(R.id.share_widget_balance_box, openShare);
        views.setOnClickPendingIntent(R.id.share_widget_action, addShare);

        if (compact) {
            views.setViewVisibility(R.id.share_widget_subtitle, View.GONE);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private void renderLocked(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_goal);
        views.setInt(R.id.widgetRoot, "setBackgroundResource", getWidgetPanelBackground(context, 35));
        views.setTextViewText(R.id.goalIcon, "🔒");
        views.setTextViewText(R.id.goalTitle, WidgetPlanGuard.lockedTitle("share"));
        views.setTextViewText(R.id.goalPercent, "");
        views.setTextViewText(R.id.goalAmounts, WidgetPlanGuard.lockedMessage("share"));
        views.setTextColor(R.id.goalTitle, Color.WHITE);
        views.setTextColor(R.id.goalAmounts, Color.rgb(255, 214, 102));
        views.setViewVisibility(R.id.goalPercent, View.GONE);
        views.setProgressBar(R.id.goalProgress, 100, 0, false);
        views.setViewVisibility(R.id.goalProgress, View.GONE);
        PendingIntent openPlan = createDeepLinkIntent(context, "fainance://open-plan-info", REQUEST_OPEN_SHARE + appWidgetId);
        views.setOnClickPendingIntent(R.id.widgetRoot, openPlan);
        views.setOnClickPendingIntent(R.id.goalSettings, openPlan);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private ShareWidgetSettings readSettings(Context context) {
        ShareWidgetSettings defaults = new ShareWidgetSettings();
        String raw = null;
        String[] prefNames = new String[]{
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
            defaults.accentColor = json.optString("accentColor", defaults.accentColor);
            defaults.title = json.optString("title", defaults.title);
            defaults.subtitle = json.optString("subtitle", defaults.subtitle);
            defaults.balanceLabel = json.optString("balanceLabel", defaults.balanceLabel);
            defaults.balanceValue = json.optString("balanceValue", defaults.balanceValue);
        } catch (Exception ignored) {}
        return defaults;
    }

    private int getWidgetPanelBackground(Context context, int transparencyPercent) {
        int safe = Math.max(0, Math.min(100, transparencyPercent));
        String name = "widget_panel_bg_" + safe;
        int res = context.getResources().getIdentifier(name, "drawable", context.getPackageName());
        if (res == 0) res = context.getResources().getIdentifier("widget_panel_bg", "drawable", context.getPackageName());
        return res != 0 ? res : R.drawable.widget_panel_bg;
    }

    private String safe(String value, String fallback) {
        if (value == null || value.trim().isEmpty()) return fallback;
        return value.trim();
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
        int light = lighten(color, 32);
        int dark = darken(color, 18);
        paint.setStyle(Paint.Style.FILL);
        paint.setShader(new LinearGradient(0, 0, width, height, light, dark, Shader.TileMode.CLAMP));
        canvas.drawRoundRect(rect, radius, radius, paint);
        paint.setShader(null);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(2);
        paint.setColor(Color.argb(115, 255, 255, 255));
        canvas.drawRoundRect(rect, radius, radius, paint);
        return bitmap;
    }

    private int lighten(int color, int amount) {
        return Color.rgb(Math.min(255, Color.red(color) + amount), Math.min(255, Color.green(color) + amount), Math.min(255, Color.blue(color) + amount));
    }

    private int darken(int color, int amount) {
        return Color.rgb(Math.max(0, Color.red(color) - amount), Math.max(0, Color.green(color) - amount), Math.max(0, Color.blue(color) - amount));
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

    private static class ShareWidgetSettings {
        String bgColor = "#1E1E30";
        int bgAlpha = 65;
        String accentColor = "#7F77DD";
        String title = "Share";
        String subtitle = "Progetti, costi condivisi e saldi";
        String balanceLabel = "Saldo netto";
        String balanceValue = "Apri Share";
    }
}
