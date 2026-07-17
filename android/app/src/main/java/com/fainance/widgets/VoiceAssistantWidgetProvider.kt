package com.fainance.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.RemoteViews
import it.fainanceapp.app.R
import com.tracker.spese.app.WidgetPlanGuard

/**
 * Widget Android nativo che apre direttamente l'assistente vocale di fAInance.
 * Il layout cambia automaticamente tra 1x1, 1x2, 2x1 e 2x2 in base alle
 * dimensioni assegnate dal launcher.
 */
class VoiceAssistantWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { widgetId ->
            updateWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        updateWidget(context, appWidgetManager, appWidgetId, newOptions)
    }

    companion object {
        private const val TWO_CELL_THRESHOLD_DP = 90

        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            suppliedOptions: Bundle? = null
        ) {
            val options = suppliedOptions ?: appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 40)
            val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 40)

            val isWide = minWidth >= TWO_CELL_THRESHOLD_DP
            val isTall = minHeight >= TWO_CELL_THRESHOLD_DP

            val layoutRes = when {
                isWide && isTall -> R.layout.widget_voice_assistant_2x2
                isWide -> R.layout.widget_voice_assistant_2x1
                isTall -> R.layout.widget_voice_assistant_1x2
                else -> R.layout.widget_voice_assistant_1x1
            }

            val views = RemoteViews(context.packageName, layoutRes)
            views.setOnClickPendingIntent(
                R.id.voiceAssistantWidgetRoot,
                createOpenAssistantIntent(context, appWidgetId)
            )
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun createOpenAssistantIntent(context: Context, appWidgetId: Int): PendingIntent {
            val allowed = WidgetPlanGuard.isAllowed(context, "voiceAssistant")
            val deepLink = Uri.parse(if (allowed) "fainance://open-voice?source=android-widget&autostart=1" else "fainance://open-plans?source=voice-widget")
            val intent = Intent(Intent.ACTION_VIEW, deepLink).apply {
                setPackage(context.packageName)
                addCategory(Intent.CATEGORY_BROWSABLE)
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
            }

            return PendingIntent.getActivity(
                context,
                7000 + appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}
