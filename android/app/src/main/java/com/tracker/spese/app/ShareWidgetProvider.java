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

import com.fainance.widgets.ShareWidgetConfigureActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

public class ShareWidgetProvider extends AppWidgetProvider {
    private static final int REQUEST_OPEN_SHARE = 4101;
    private static final int REQUEST_ADD_SHARE_EXPENSE = 4102;
    private static final int REQUEST_CONFIGURE_SHARE = 4103;
    private static final int REQUEST_SHARE_RECEIPT = 4104;
    private static final int REQUEST_SHARE_VOICE = 4105;
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
        ShareWidgetSettings settings = readSettings(context, appWidgetId);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_share);

        int baseBg = parseColor(settings.bgColor, Color.rgb(30, 30, 48));
        int bgAlpha = alphaFromPercent(settings.bgAlpha);
        int rootColor = Color.argb(bgAlpha, Color.red(baseBg), Color.green(baseBg), Color.blue(baseBg));
        views.setImageViewBitmap(R.id.share_widget_root_bg, roundedBitmap(rootColor, dp(context, 18), dp(context, 1), borderColor(baseBg, 120), 900, 470));

        int translucentPanel = Color.argb(Math.max(28, Math.round(bgAlpha * 0.22f)), 255, 255, 255);
        views.setImageViewBitmap(R.id.share_widget_balance_bg, roundedBitmap(translucentPanel, dp(context, 12), 0, Color.TRANSPARENT, 360, 170));
        int actionColor = parseColor(settings.accentColor, Color.rgb(127, 119, 221));
        int activityColor = parseColor(settings.activityColor, Color.rgb(55, 138, 221));
        views.setImageViewBitmap(R.id.share_widget_action_bg, buttonBitmap(Color.rgb(226, 75, 74), dp(context, 12), 360, 110));
        views.setImageViewBitmap(R.id.share_widget_receipt_bg, buttonBitmap(Color.rgb(242, 159, 61), dp(context, 12), 360, 110));
        views.setImageViewBitmap(R.id.share_widget_voice_bg, buttonBitmap(Color.rgb(127, 119, 221), dp(context, 12), 360, 110));
        views.setImageViewBitmap(R.id.share_widget_activity_bg, buttonBitmap(activityColor, dp(context, 12), 360, 110));

        int titleColor = parseColor(settings.titleColor, Color.WHITE);
        int bodyColor = parseColor(settings.bodyColor, Color.rgb(216, 214, 242));

        views.setTextViewText(R.id.share_widget_title, safe(settings.title, "Share"));
        views.setTextViewText(R.id.share_widget_project, safe(settings.projectName, "Progetto Share"));
        views.setTextViewText(R.id.share_widget_balance_label, safe(settings.balanceLabel, "Saldo"));
        views.setTextViewText(R.id.share_widget_balance_value, money(settings.netAmount, settings.currency));
        views.setTextViewText(R.id.share_widget_owed_text, "Ti devono: " + money(settings.owedAmount, settings.currency));
        views.setTextViewText(R.id.share_widget_owe_text, "Devi: " + money(settings.oweAmount, settings.currency));
        views.setTextViewText(R.id.share_widget_last_activity, safe(settings.lastActivity, "Nessuna attività recente"));
        views.setTextViewText(R.id.share_widget_action_label, "Spesa");
        views.setTextViewText(R.id.share_widget_activity_label, "Attività");

        views.setTextColor(R.id.share_widget_title, titleColor);
        views.setTextColor(R.id.share_widget_project, bodyColor);
        views.setTextColor(R.id.share_widget_settings, titleColor);
        views.setTextColor(R.id.share_widget_balance_label, bodyColor);
        views.setTextColor(R.id.share_widget_balance_value, titleColor);
        views.setTextColor(R.id.share_widget_owed_text, bodyColor);
        views.setTextColor(R.id.share_widget_owe_text, bodyColor);
        views.setTextColor(R.id.share_widget_last_activity, bodyColor);

        String projectParam = buildProjectParam(settings.projectId, appWidgetId);
        PendingIntent openShare = createDeepLinkIntent(context, "fainance://open-share" + projectParam, REQUEST_OPEN_SHARE + appWidgetId);
        PendingIntent addShare = createDeepLinkIntent(context, "fainance://share-add-expense" + projectParam, REQUEST_ADD_SHARE_EXPENSE + appWidgetId);
        PendingIntent receiptShare = createDeepLinkIntent(context, "fainance://share-receipt" + projectParam, REQUEST_SHARE_RECEIPT + appWidgetId);
        PendingIntent voiceShare = createDeepLinkIntent(context, "fainance://share-voice" + projectParam, REQUEST_SHARE_VOICE + appWidgetId);
        PendingIntent configure = createConfigureIntent(context, appWidgetId);

        views.setOnClickPendingIntent(R.id.share_widget_root, openShare);
        views.setOnClickPendingIntent(R.id.share_widget_header, openShare);
        views.setOnClickPendingIntent(R.id.share_widget_balance_box, openShare);
        views.setOnClickPendingIntent(R.id.share_widget_action, addShare);
        views.setOnClickPendingIntent(R.id.share_widget_receipt, receiptShare);
        views.setOnClickPendingIntent(R.id.share_widget_voice, voiceShare);
        views.setOnClickPendingIntent(R.id.share_widget_activity, openShare);
        views.setOnClickPendingIntent(R.id.share_widget_settings, configure);

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

    private ShareWidgetSettings readSettings(Context context, int appWidgetId) {
        ShareWidgetSettings defaults = new ShareWidgetSettings();
        JSONObject json = parseJson(rawString(context, PREFS_KEY, "{}"));
        JSONObject instance = parseJson(rawString(context, "share_widget_" + appWidgetId, "{}"));

        defaults.bgColor = json.optString("bgColor", defaults.bgColor);
        defaults.bgAlpha = json.optInt("bgAlpha", defaults.bgAlpha);
        defaults.accentColor = json.optString("accentColor", defaults.accentColor);
        defaults.activityColor = json.optString("activityColor", defaults.activityColor);
        defaults.titleColor = json.optString("titleColor", defaults.titleColor);
        defaults.bodyColor = json.optString("bodyColor", defaults.bodyColor);
        defaults.currency = json.optString("currency", defaults.currency);
        defaults.title = json.optString("title", defaults.title);

        String selectedId = instance.optString("projectId", json.optString("projectId", ""));
        JSONObject project = findProject(json.optJSONArray("projectItems"), selectedId);
        if (project == null && json.has("projectName")) project = json;
        if (project == null) project = firstProject(json.optJSONArray("projectItems"));

        if (project != null) {
            defaults.projectId = project.optString("projectId", project.optString("id", selectedId));
            defaults.projectName = project.optString("projectName", project.optString("name", json.optString("projectName", defaults.projectName)));
            defaults.netAmount = project.optDouble("netAmount", json.optDouble("netAmount", defaults.netAmount));
            defaults.owedAmount = project.optDouble("owedAmount", json.optDouble("owedAmount", defaults.owedAmount));
            defaults.oweAmount = project.optDouble("oweAmount", json.optDouble("oweAmount", defaults.oweAmount));
            defaults.lastActivity = project.optString("lastActivity", json.optString("lastActivity", defaults.lastActivity));
            defaults.currency = project.optString("currency", defaults.currency);
        } else {
            defaults.projectId = selectedId;
            defaults.projectName = instance.optString("projectName", json.optString("projectName", defaults.projectName));
            defaults.netAmount = json.optDouble("netAmount", defaults.netAmount);
            defaults.owedAmount = json.optDouble("owedAmount", defaults.owedAmount);
            defaults.oweAmount = json.optDouble("oweAmount", defaults.oweAmount);
            defaults.lastActivity = json.optString("lastActivity", defaults.lastActivity);
        }
        if (!instance.optString("projectName", "").trim().isEmpty() && defaults.projectName.trim().isEmpty()) {
            defaults.projectName = instance.optString("projectName", defaults.projectName);
        }
        return defaults;
    }

    private String rawString(Context context, String key, String fallback) {
        String[] prefNames = new String[]{
                "fainance_widget_prefs",
                "CapacitorStorage",
                context.getPackageName() + "_preferences",
                "com.capacitorjs.plugins.preferences"
        };
        for (String prefName : prefNames) {
            try {
                SharedPreferences prefs = context.getSharedPreferences(prefName, Context.MODE_PRIVATE);
                String raw = prefs.getString(key, null);
                if (raw != null && !raw.trim().isEmpty()) return raw;
            } catch (Exception ignored) {}
        }
        return fallback;
    }

    private JSONObject parseJson(String raw) {
        try { return new JSONObject(raw == null ? "{}" : raw); } catch (Exception e) { return new JSONObject(); }
    }

    private JSONObject findProject(JSONArray arr, String id) {
        if (arr == null || id == null || id.trim().isEmpty()) return null;
        for (int i = 0; i < arr.length(); i++) {
            JSONObject obj = arr.optJSONObject(i);
            if (obj == null) continue;
            String pid = obj.optString("projectId", obj.optString("id", ""));
            if (id.equals(String.valueOf(pid))) return obj;
        }
        return null;
    }

    private JSONObject firstProject(JSONArray arr) {
        if (arr == null || arr.length() == 0) return null;
        return arr.optJSONObject(0);
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

    private String money(double value, String currency) {
        String formatted = String.format(Locale.ITALY, "%,.2f", value).replace('.', '#').replace(',', '.').replace('#', ',');
        return formatted + " " + safe(currency, "€");
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
        int light = lighten(color, 22);
        int dark = darken(color, 8);
        paint.setStyle(Paint.Style.FILL);
        paint.setShader(new LinearGradient(0, 0, width, height, light, dark, Shader.TileMode.CLAMP));
        canvas.drawRoundRect(rect, radius, radius, paint);
        paint.setShader(null);
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


    private String buildProjectParam(String projectId, int appWidgetId) {
        StringBuilder out = new StringBuilder("?");
        if (projectId != null && projectId.trim().length() > 0) {
            out.append("project=").append(Uri.encode(projectId.trim())).append("&");
        }
        out.append("widgetId=").append(appWidgetId);
        return out.toString();
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

    private PendingIntent createConfigureIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, ShareWidgetConfigureActivity.class);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(
                context,
                REQUEST_CONFIGURE_SHARE + appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static class ShareWidgetSettings {
        String bgColor = "#1E1E30";
        int bgAlpha = 25;
        String accentColor = "#7F77DD";
        String activityColor = "#378ADD";
        String titleColor = "#FFFFFF";
        String bodyColor = "#D8D6F2";
        String title = "Share";
        String projectId = "";
        String projectName = "Progetto Share";
        double netAmount = 0.0;
        double owedAmount = 0.0;
        double oweAmount = 0.0;
        String lastActivity = "Nessuna attività recente";
        String currency = "€";
        String balanceLabel = "Saldo";
    }
}
