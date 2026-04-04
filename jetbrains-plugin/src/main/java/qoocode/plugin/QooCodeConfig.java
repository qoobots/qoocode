/**
 * qoocode Configuration
 * Manages plugin settings
 */

package qoocode.plugin;

import com.intellij.openapi.application.*;
import com.intellij.openapi.components.*;
import com.intellij.openapi.options.*;
import com.intellij.openapi.project.*;
import com.intellij.util.xmlb.*;
import org.jetbrains.annotations.*;

import java.util.*;

@State(
    name = "QooCodeSettings",
    storages = {
        @Storage("QooCode.settings.xml")
    }
)

public class QooCodeConfig implements PersistentStateComponent<QooCodeConfig.State> {
    private State state = new State();
    
    public static class State {
        public String apiUrl = "http://localhost:8080";
        public String apiKey = "";
        public String model = "claude-3-5-sonnet";
        public boolean autoStart = false;
        public boolean telemetryEnabled = true;
        public String theme = "dark";
        public int maxTokens = 4096;
        public double temperature = 0.7;
        public Map<String, String> customSettings = new HashMap<>();
    }
    
    @Override
    public State getState() {
        return state;
    }
    
    @Override
    public void loadState(State state) {
        this.state = state;
    }
    
    // Convenience methods
    public String getApiUrl() {
        return state.apiUrl;
    }
    
    public void setApiUrl(String url) {
        state.apiUrl = url;
    }
    
    public String getApiKey() {
        return state.apiKey;
    }
    
    public void setApiKey(String key) {
        state.apiKey = key;
    }
    
    public String getModel() {
        return state.model;
    }
    
    public void setModel(String model) {
        state.model = model;
    }
    
    public boolean isAutoStart() {
        return state.autoStart;
    }
    
    public void setAutoStart(boolean autoStart) {
        state.autoStart = autoStart;
    }
    
    public boolean isTelemetryEnabled() {
        return state.telemetryEnabled;
    }
    
    public void setTelemetryEnabled(boolean enabled) {
        state.telemetryEnabled = enabled;
    }
    
    public String getTheme() {
        return state.theme;
    }
    
    public void setTheme(String theme) {
        state.theme = theme;
    }
    
    public int getMaxTokens() {
        return state.maxTokens;
    }
    
    public void setMaxTokens(int maxTokens) {
        state.maxTokens = maxTokens;
    }
    
    public double getTemperature() {
        return state.temperature;
    }
    
    public void setTemperature(double temperature) {
        state.temperature = temperature;
    }
}
