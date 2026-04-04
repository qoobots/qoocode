/**
 * qoocode Tool Window Factory
 */

package qoocode.plugin;

import com.intellij.openapi.project.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.ui.*;
import org.jetbrains.annotations.*;

import javax.swing.*;

public class QooCodeToolWindowFactory implements ToolWindowFactory {
    private static final Logger LOG = Logger.getInstance(QooCodeToolWindowFactory.class);
    
    @Override
    public void createToolWindowContent(@NotNull Project project, @NotNull ToolWindow toolWindow) {
        LOG.info("Creating QooCode tool window content");
        
        QooCodeChatPanel chatPanel = new QooCodeChatPanel(project);
        toolWindow.getComponent().add(chatPanel.getContent());
        
        // Store reference for later use
        toolWindow.putUserData(QooCodeChatPanel.class, chatPanel);
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
