/**
 * QOOCODE Project Configurable
 * Project-level settings UI
 */

package QOOCODE.plugin;

import com.intellij.openapi.options.*;
import com.intellij.openapi.project.*;
import com.intellij.util.xmlb.*;
import org.jetbrains.annotations.*;

import javax.swing.*;

public class QOOCODEProjectConfigurable implements Configurable {
    private JPanel mainPanel;
    private JCheckBox enableProjectCheck;
    private JCheckBox autoAnalyzeCheck;
    private JTextField projectApiKeyField;
    
    private final Project project;
    private final QOOCODEConfig config;
    
    public QOOCODEProjectConfigurable(Project project) {
        this.project = project;
        this.config = new QOOCODEConfig();
    }
    
    @Override
    @NotNull
    public String getDisplayName() {
        return "QOOCODE (Project)";
    }
    
    @Override
    public String getHelpTopic() {
        return "settings.QOOCODE.project";
    }
    
    @Override
    public JComponent createComponent() {
        mainPanel = new JPanel(new BoxLayout(mainPanel, BoxLayout.Y_AXIS));
        
        enableProjectCheck = new JCheckBox("Enable QOOCODE for this project");
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
