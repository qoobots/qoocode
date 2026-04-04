/**
 * QOOCODE Tool Window Factory
 */

package QOOCODE.plugin;

import com.intellij.openapi.project.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.ui.*;
import org.jetbrains.annotations.*;

import javax.swing.*;

public class QOOCODEToolWindowFactory implements ToolWindowFactory {
    private static final Logger LOG = Logger.getInstance(QOOCODEToolWindowFactory.class);
    
    @Override
    public void createToolWindowContent(@NotNull Project project, @NotNull ToolWindow toolWindow) {
        LOG.info("Creating QOOCODE tool window content");
        
        QOOCODEChatPanel chatPanel = new QOOCODEChatPanel(project);
        toolWindow.getComponent().add(chatPanel.getContent());
        
        // Store reference for later use
        toolWindow.putUserData(QOOCODEChatPanel.class, chatPanel);
    }
    
    @Override
    public boolean shouldBeAvailable(@NotNull Project project) {
        return true;
    }
    
    @Override
    public boolean isDoNotActivateOnStart() {
        return true;
    }
}
