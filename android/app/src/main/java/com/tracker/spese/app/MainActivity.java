package com.tracker.spese.app;

import android.os.Bundle;
import android.media.AudioManager;
import android.view.KeyEvent;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.fainance.widgets.WidgetBridge;

public class MainActivity extends BridgeActivity {
    private String assistantAudioOutput;

    void setAssistantAudioOutput(String output) {
        assistantAudioOutput = output;
        refreshAssistantVolumeStream();
        publishAssistantVolume();
    }

    int assistantVolumeStream() {
        // Use one user-facing media volume, including true zero. Android's
        // communication stream has a nonzero minimum on some phones.
        return AudioManager.STREAM_MUSIC;
    }

    JSObject assistantMediaVolume() {
        AudioManager manager = (AudioManager) getSystemService(AUDIO_SERVICE);
        int current = manager.getStreamVolume(AudioManager.STREAM_MUSIC);
        int maximum = Math.max(1, manager.getStreamMaxVolume(AudioManager.STREAM_MUSIC));
        int mode = manager.getMode();
        JSObject result = new JSObject();
        result.put("stream", AudioManager.STREAM_MUSIC);
        result.put("current", current);
        result.put("max", maximum);
        result.put("ratio", (double) current / maximum);
        result.put("muted", current == 0 || manager.isStreamMute(AudioManager.STREAM_MUSIC));
        result.put("communication", mode == AudioManager.MODE_IN_COMMUNICATION || mode == AudioManager.MODE_IN_CALL);
        return result;
    }

    void publishAssistantVolume() {
        if (assistantAudioOutput != null && getBridge() != null) {
            getBridge().triggerWindowJSEvent("fainance-assistant-system-volume", assistantMediaVolume().toString());
        }
    }

    private void refreshAssistantVolumeStream() {
        setVolumeControlStream(assistantAudioOutput == null
                ? AudioManager.USE_DEFAULT_STREAM_TYPE : assistantVolumeStream());
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_UP ||
                event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_DOWN ||
                event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_MUTE) {
            refreshAssistantVolumeStream();
            // While WebRTC holds communication mode, Android can ignore the
            // Activity's media stream suggestion. Forward only the user's
            // actual key press to the output that is currently speaking.
            if (assistantAudioOutput != null) {
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    AudioManager manager = (AudioManager) getSystemService(AUDIO_SERVICE);
                    int direction = event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_UP
                            ? AudioManager.ADJUST_RAISE : AudioManager.ADJUST_LOWER;
                    if (event.getKeyCode() == KeyEvent.KEYCODE_VOLUME_MUTE) {
                        if (event.getRepeatCount() > 0) return true;
                        direction = AudioManager.ADJUST_TOGGLE_MUTE;
                    }
                    if (manager != null) manager.adjustStreamVolume(
                            assistantVolumeStream(), direction, AudioManager.FLAG_SHOW_UI);
                    publishAssistantVolume();
                }
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public void onResume() {
        super.onResume();
        refreshAssistantVolumeStream();
        publishAssistantVolume();
    }

    @Override
    public void onPause() {
        setVolumeControlStream(AudioManager.USE_DEFAULT_STREAM_TYPE);
        super.onPause();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FainanceAudioPlugin.class);
        registerPlugin(FainanceAnalyticsGuardPlugin.class);
        registerPlugin(WidgetBridge.class);
        registerPlugin(FainanceBillingPlugin.class);
        registerPlugin(FainanceAdsPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View content = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            int handled = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets bars = windowInsets.getInsets(handled);
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return new WindowInsetsCompat.Builder(windowInsets)
                    .setInsets(handled, Insets.NONE)
                    .setInsetsIgnoringVisibility(handled, Insets.NONE)
                    .build();
        });
        ViewCompat.requestApplyInsets(content);
    }
}
