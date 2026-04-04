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
    
    private final QooCodeConfig config;
    
    public QooCodeConfigurable() {
        this.config = new QooCodeConfig();
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
        apiUrlField = new JTextField(config.getApiUrl(), 30);
        mainPanel.add(apiUrlField, gbc);
        row++;
        
        // API Key
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("API Key:"), gbc);
        
        gbc.gridx = 1;
        apiKeyField = new JPasswordField(config.getApiKey(), 30);
        mainPanel.add(apiKeyField, gbc);
        row++;
        
        // Model
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("Model:"), gbc);
        
        gbc.gridx = 1;
        modelCombo = new JComboBox<>(new String[]{
            "claude-3-5-sonnet",
            "claude-3-opus",
            "claude-3-haiku",
            "gpt-4o",
            "gpt-4-turbo"
        });
        modelCombo.setSelectedItem(config.getModel());
        mainPanel.add(modelCombo, gbc);
        row++;
        
        // Max Tokens
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("Max Tokens:"), gbc);
        
        gbc.gridx = 1;
        maxTokensField = new JTextField(String.valueOf(config.getMaxTokens()), 10);
        mainPanel.add(maxTokensField, gbc);
        row++;
        
        // Temperature
        gbc.gridx = 0;
        gbc.gridy = row;
        mainPanel.add(new JLabel("Temperature:"), gbc);
        
        gbc.gridx = 1;
        JPanel tempPanel = new JPanel(new BorderLayout(4, 0));
        temperatureSlider = new JSlider(0, 100, (int)(config.getTemperature() * 100));
        temperatureLabel = new JLabel(String.format("%.2f", config.getTemperature()));
        
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
        autoStartCheck = new JCheckBox("Auto-start qoocode on project open", config.isAutoStart());
        mainPanel.add(autoStartCheck, gbc);
        row++;
        
        // Telemetry
        gbc.gridx = 0;
        gbc.gridy = row;
        telemetryCheck = new JCheckBox("Enable telemetry", config.isTelemetryEnabled());
        mainPanel.add(telemetryCheck, gbc);
        row++;
        
        return mainPanel;
    }
    
    @Override
    public boolean isModified() {
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
