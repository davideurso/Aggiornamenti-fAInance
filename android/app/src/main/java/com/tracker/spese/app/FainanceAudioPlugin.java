package com.tracker.spese.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FainanceAudio")
public class FainanceAudioPlugin extends Plugin {
    private AudioFocusRequest audioFocusRequest;
    private final AudioManager.OnAudioFocusChangeListener audioFocusListener = focusChange -> { };

    private void requestAssistantAudioFocus(AudioManager audioManager) {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes attributes = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build();
                audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                        .setAudioAttributes(attributes)
                        .setAcceptsDelayedFocusGain(false)
                        .setOnAudioFocusChangeListener(audioFocusListener)
                        .build();
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(
                        audioFocusListener,
                        AudioManager.STREAM_MUSIC,
                        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
                );
            }
        } catch (Exception ignored) { }
    }

    private void abandonAssistantAudioFocus(AudioManager audioManager) {
        if (audioManager == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && audioFocusRequest != null) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
                audioFocusRequest = null;
            } else {
                audioManager.abandonAudioFocus(audioFocusListener);
            }
        } catch (Exception ignored) { }
    }

    @PluginMethod
    public void activateAssistantAudio(PluginCall call) {
        if (getActivity() == null) {
            call.reject("Activity Android non disponibile.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                // L'audio WebRTC della WebView viene riprodotto come contenuto multimediale.
                // MODE_IN_COMMUNICATION e STREAM_VOICE_CALL rendevano i tasti fisici indipendenti
                // dal volume realmente usato dalla voce dell'assistente.
                audioManager.setMode(AudioManager.MODE_NORMAL);
                requestAssistantAudioFocus(audioManager);
            }
            getActivity().setVolumeControlStream(AudioManager.STREAM_MUSIC);
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).setAssistantAudioActive(true);
            }
            JSObject result = new JSObject();
            result.put("active", true);
            result.put("stream", "music");
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getMediaVolume(PluginCall call) {
        try {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            int current = audioManager != null ? audioManager.getStreamVolume(AudioManager.STREAM_MUSIC) : 0;
            int maximum = audioManager != null ? Math.max(1, audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)) : 1;
            boolean muted = current <= 0 || (audioManager != null && audioManager.isStreamMute(AudioManager.STREAM_MUSIC));
            JSObject result = new JSObject();
            result.put("current", current);
            result.put("max", maximum);
            result.put("ratio", Math.max(0d, Math.min(1d, ((double) current) / ((double) maximum))));
            result.put("muted", muted);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Non riesco a leggere il volume multimediale.", error);
        }
    }

    @PluginMethod
    public void releaseAssistantAudio(PluginCall call) {
        if (getActivity() == null) {
            call.resolve();
            return;
        }
        getActivity().runOnUiThread(() -> {
            AudioManager audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            abandonAssistantAudioFocus(audioManager);
            if (audioManager != null) audioManager.setMode(AudioManager.MODE_NORMAL);
            getActivity().setVolumeControlStream(AudioManager.STREAM_MUSIC);
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).setAssistantAudioActive(false);
            }
            JSObject result = new JSObject();
            result.put("active", false);
            result.put("stream", "music");
            call.resolve(result);
        });
    }
}
