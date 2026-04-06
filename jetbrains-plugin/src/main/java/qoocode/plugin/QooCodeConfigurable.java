/**
 * qoocode Configurable
 * Application-level settings UI
 */

package qoocode.plugin;

import com.intellij.openapi.options.*;
import com.intellij.openapi.ui.*;
import com.intellij.util.ui.*;
import org.jetbrains.annotations.*;

import javax.swing.*;
import java.awt.*;

public class QooCodeConfigurable implements Configurable {
    private JPanel mainPanel;
    private JTextField apiUrlField;
    private JPasswordField apiKeyField;
    private JComboBox<String> modelCombo;
    private JCheckBox autoStartCheck;
    private JCheckBox telemetryCheck;
    private JTextField maxTokensField;
    private JSlider temperatureSlider;
    private JLabel temperatureLabel;

    private QooCodeConfig config;

    public QooCodeConfigurable() {
    }

    private QooCodeConfig getConfig() {
        if (config == null) {
            config = QooCodeConfig.getInstance();
        }
        return config;
    }
    
    @Override
    @NotNull
    public String getDisplayName() {
        return "QooCode";
    }

    @Override
    public String getHelpTopic() {
        return "settings.QooCode";
    }
    
    @Override
    public JComponent createComponent() {
        mainPanel = new JPanel(new GridBagLayout());
        mainPanel.setPreferredSize(new Dimension(500, 400));
        
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(4, 4, 4, 4);
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.weightx = 1.0;
        
        int row = 0;
        
        // API URL
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("API URL:"), gbc);

        gbc.gridx = 1;
        apiUrlField = new JTextField(getConfig().getApiUrl(), 30);
        mainPanel.add(apiUrlField, gbc);
        row++;

        // API Key
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("API Key:"), gbc);

        gbc.gridx = 1;
        apiKeyField = new JPasswordField(getConfig().getApiKey(), 30);
        mainPanel.add(apiKeyField, gbc);
        row++;

        // Model
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("Model:"), gbc);

        gbc.gridx = 1;
        modelCombo = new JComboBox<>(new String[]{
            // OpenAI Models
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4-turbo-preview",
            "gpt-4",
            "gpt-4-32k",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",

            // Anthropic Claude Models
            "claude-3-5-sonnet-20241022",
            "claude-3-5-sonnet-20240620",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",

            // Google Gemini Models
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-pro-001",
            "gemini-1.5-flash",
            "gemini-1.5-flash-001",
            "gemini-1.5-flash-8b",

            // Meta LLaMA Models
            "llama-3.2-90b-vision-preview",
            "llama-3.2-11b-vision-preview",
            "llama-3.1-70b-preview",
            "llama-3.1-405b-preview",
            "llama-3.1-8b-preview",

            // DeepSeek Models
            "deepseek-chat",
            "deepseek-coder",

            // Moonshot Models
            "moonshot-v1-128k",
            "moonshot-v1-32k",
            "moonshot-v1-8k",

            // Qwen Models
            "qwen-max",
            "qwen-plus",
            "qwen-turbo",
            "qwen2.5-72b-instruct",

            // Baichuan Models
            "baichuan4-turbo",
            "baichuan3-turbo",
            "baichuan3-64k",

            // Zhipu Models
            "glm-4",
            "glm-4-plus",
            "glm-4-0520",
            "glm-3-turbo",

            // Mistral Models
            "mistral-large-latest",
            "mistral-medium-latest",
            "mistral-small-latest",
            "codestral-latest",

            // Ali Models
            "qwen-max-longcontext",
            "qwen-plus-longcontext",

            // Yi Models
            "yi-large",
            "yi-medium",
                "yi-spark"
        });
        modelCombo.setSelectedItem(getConfig().getModel());
        mainPanel.add(modelCombo, gbc);
        row++;

        // Max Tokens
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("Max Tokens:"), gbc);

        gbc.gridx = 1;
        maxTokensField = new JTextField(String.valueOf(getConfig().getMaxTokens()), 10);
        mainPanel.add(maxTokensField, gbc);
        row++;

        // Temperature
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("Temperature:"), gbc);

        gbc.gridx = 1;
        JPanel tempPanel = new JPanel(new BorderLayout(4, 0));
        temperatureSlider = new JSlider(0, 100, (int)(getConfig().getTemperature() * 100));
        temperatureLabel = new JLabel(String.format("%.2f", getConfig().getTemperature()));
        
        temperatureSlider.addChangeListener(e -> {
            temperatureLabel.setText(String.format("%.2f", temperatureSlider.getValue() / 100.0));
        });
        
        tempPanel.add(temperatureSlider, BorderLayout.CENTER);
        tempPanel.add(temperatureLabel, BorderLayout.EAST);
        mainPanel.add(tempPanel, gbc);
        row++;

        // Auto Start
        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.gridwidth = 2;
        autoStartCheck = new JCheckBox("Auto-start qoocode on project open", getConfig().isAutoStart());
        mainPanel.add(autoStartCheck, gbc);
        row++;

        // Telemetry
        gbc.gridx = 0;
        gbc.gridy = row;
        telemetryCheck = new JCheckBox("Enable telemetry", getConfig().isTelemetryEnabled());
        mainPanel.add(telemetryCheck, gbc);
        row++;
        
        return mainPanel;
    }
    
    @Override
    public boolean isModified() {
        if (mainPanel == null) {
            return false;
        }
        QooCodeConfig config = getConfig();
        return !apiUrlField.getText().equals(config.getApiUrl()) ||
               !new String(apiKeyField.getPassword()).equals(config.getApiKey()) ||
               !modelCombo.getSelectedItem().equals(config.getModel()) ||
               !maxTokensField.getText().equals(String.valueOf(config.getMaxTokens())) ||
               temperatureSlider.getValue() != (int)(config.getTemperature() * 100) ||
               autoStartCheck.isSelected() != config.isAutoStart() ||
               telemetryCheck.isSelected() != config.isTelemetryEnabled();
    }

    @Override
    public void apply() {
        QooCodeConfig config = getConfig();
        config.setApiUrl(apiUrlField.getText());
        config.setApiKey(new String(apiKeyField.getPassword()));
        config.setModel((String) modelCombo.getSelectedItem());
        config.setMaxTokens(Integer.parseInt(maxTokensField.getText()));
        config.setTemperature(temperatureSlider.getValue() / 100.0);
        config.setAutoStart(autoStartCheck.isSelected());
        config.setTelemetryEnabled(telemetryCheck.isSelected());
    }

    @Override
    public void reset() {
        QooCodeConfig config = getConfig();
        apiUrlField.setText(config.getApiUrl());
        apiKeyField.setText(config.getApiKey());
        modelCombo.setSelectedItem(config.getModel());
        maxTokensField.setText(String.valueOf(config.getMaxTokens()));
        temperatureSlider.setValue((int)(config.getTemperature() * 100));
        autoStartCheck.setSelected(config.isAutoStart());
        telemetryCheck.setSelected(config.isTelemetryEnabled());
    }

    @Override
    public void disposeUIResources() {
        mainPanel = null;
    }
}
