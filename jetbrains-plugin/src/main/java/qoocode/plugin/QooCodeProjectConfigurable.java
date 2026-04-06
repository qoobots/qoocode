/**
 * qoocode Project Configurable
 * Project-level settings UI
 */

package qoocode.plugin;

import com.intellij.openapi.options.*;
import com.intellij.openapi.project.*;
import com.intellij.util.xmlb.*;
import org.jetbrains.annotations.*;

import javax.swing.*;

public class QooCodeProjectConfigurable implements Configurable {
    private JPanel mainPanel;
    private JCheckBox enableProjectCheck;
    private JCheckBox autoAnalyzeCheck;
    private JTextField projectApiKeyField;
    
    private final Project project;
    private final QooCodeConfig config;
    
    public QooCodeProjectConfigurable(Project project) {
        this.project = project;
        this.config = new QooCodeConfig();
    }
    
    @Override
    @NotNull
    public String getDisplayName() {
        return "QooCode (Project)";
    }
    
    @Override
    public String getHelpTopic() {
        return "settings.QooCode.project";
    }
    
    @Override
    public JComponent createComponent() {
        mainPanel = new JPanel();
        mainPanel.setLayout(new BoxLayout(mainPanel, BoxLayout.Y_AXIS));
        
        enableProjectCheck = new JCheckBox("Enable qoocode for this project");
        autoAnalyzeCheck = new JCheckBox("Auto-analyze files on save");
        projectApiKeyField = new JTextField(30);
        
        mainPanel.add(enableProjectCheck);
        mainPanel.add(autoAnalyzeCheck);
        mainPanel.add(new JLabel("Project-specific API Key (optional):"));
        mainPanel.add(projectApiKeyField);
        
        return mainPanel;
    }
    
    @Override
    public boolean isModified() {
        return true;
    }
    
    @Override
    public void apply() {
        // Apply settings
    }
    
    @Override
    public void reset() {
        // Reset to defaults
    }
    
    @Override
    public void disposeUIResources() {
        mainPanel = null;
    }
}
