package com.tracker.spese.app;

import android.content.Context;
import android.media.AudioManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;

import com.getcapacitor.BridgeActivity;
import com.fainance.widgets.WidgetBridge;
import com.aparajita.capacitor.biometricauth.BiometricAuthNative;

public class MainActivity extends BridgeActivity {
    private static final long VOLUME_MONITOR_INTERVAL_MS = 120L;

    private volatile boolean assistantAudioActive = false;
    private Handler volumeHandler;
    private Runnable volumeMonitor;
    private int lastDispatchedVolume = -1;
    private int lastDispatchedMaximum = -1;
    private boolean lastDispatchedMuted = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        registerPlugin(FainanceBillingPlugin.class);
        registerPlugin(FainanceAdsPlugin.class);
        registerPlugin(FainanceContactsPlugin.class);
        registerPlugin(FainanceAppUpdatePlugin.class);
        registerPlugin(FainanceAudioPlugin.class);
        registerPlugin(FainanceFilePlugin.class);
        registerPlugin(FainanceMetaEventsPlugin.class);
        registerPlugin(BiometricAuthNative.class);
        super.onCreate(savedInstanceState);

        volumeHandler = new Handler(Looper.getMainLooper());
        volumeMonitor = new Runnable() {
            @Override
            public void run() {
                if (!assistantAudioActive) return;
                dispatchAssistantSystemVolume(false);
                volumeHandler.postDelayed(this, VOLUME_MONITOR_INTERVAL_MS);
            }
        };

        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        try {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            }
        } catch (Exception ignored) {
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        if (assistantAudioActive) {
            dispatchAssistantSystemVolume(true);
            startVolumeMonitor();
        }
    }

    @Override
    public void onPause() {
        stopVolumeMonitor();
        super.onPause();
    }

    @Override
    public void onDestroy() {
        stopVolumeMonitor();
        super.onDestroy();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (assistantAudioActive && isVolumeKey(keyCode)) {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                int direction = AudioManager.ADJUST_SAME;
                if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) direction = AudioManager.ADJUST_RAISE;
                else if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) direction = AudioManager.ADJUST_LOWER;
                else if (keyCode == KeyEvent.KEYCODE_VOLUME_MUTE) direction = AudioManager.ADJUST_TOGGLE_MUTE;

                audioManager.adjustStreamVolume(
                        AudioManager.STREAM_MUSIC,
                        direction,
                        AudioManager.FLAG_SHOW_UI
                );
            }
            if (volumeHandler != null) {
                volumeHandler.postDelayed(() -> dispatchAssistantSystemVolume(true), 35L);
            }
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (assistantAudioActive && isVolumeKey(keyCode)) return true;
        return super.onKeyUp(keyCode, event);
    }

    private boolean isVolumeKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_VOLUME_UP
                || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN
                || keyCode == KeyEvent.KEYCODE_VOLUME_MUTE;
    }

    public void setAssistantAudioActive(boolean active) {
        assistantAudioActive = active;
        runOnUiThread(() -> {
            setVolumeControlStream(AudioManager.STREAM_MUSIC);
            if (active) {
                lastDispatchedVolume = -1;
                lastDispatchedMaximum = -1;
                dispatchAssistantSystemVolume(true);
                startVolumeMonitor();
            } else {
                stopVolumeMonitor();
            }
        });
    }

    private void startVolumeMonitor() {
        if (volumeHandler == null || volumeMonitor == null) return;
        volumeHandler.removeCallbacks(volumeMonitor);
        if (assistantAudioActive) volumeHandler.post(volumeMonitor);
    }

    private void stopVolumeMonitor() {
        if (volumeHandler != null && volumeMonitor != null) {
            volumeHandler.removeCallbacks(volumeMonitor);
        }
    }

    private void dispatchAssistantSystemVolume(boolean force) {
        runOnUiThread(() -> {
            try {
                AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                int current = audioManager != null
                        ? audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
                        : 0;
                int maximum = audioManager != null
                        ? Math.max(1, audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
                        : 1;
                boolean muted = current <= 0
                        || (audioManager != null && audioManager.isStreamMute(AudioManager.STREAM_MUSIC));

                if (!force
                        && current == lastDispatchedVolume
                        && maximum == lastDispatchedMaximum
                        && muted == lastDispatchedMuted) {
                    return;
                }

                lastDispatchedVolume = current;
                lastDispatchedMaximum = maximum;
                lastDispatchedMuted = muted;

                double ratio = Math.max(0d, Math.min(1d, ((double) current) / ((double) maximum)));
                String script = "window.dispatchEvent(new CustomEvent('fainance-assistant-system-volume',{detail:{current:"
                        + current + ",max:" + maximum + ",ratio:" + ratio + ",muted:" + muted + "}}));";
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(script, null);
                }
            } catch (Exception ignored) {
            }
        });
    }
}
