/**
 * qoocode JetBrains Plugin
 * Main Plugin Entry Point
 */

package qoocode.plugin;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.ui.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.openapi.extensions.*;
import com.intellij.ide.*;
import com.intellij.ide.actions.*;
import com.intellij.ide.util.*;
import com.intellij.openapi.ui.Messages;
import org.jetbrains.annotations.*;

import javax.swing.*;
import java.awt.*;

public class QooCodePlugin implements ApplicationComponent {
    private static final Logger LOG = Logger.getInstance(QooCodePlugin.class);
    private Project project;
    private ToolWindow toolWindow;
    private QooCodeChatPanel chatPanel;

    public QooCodePlugin(@NotNull Project project) {
        this.project = project;
    }

    @Override
    public void initComponent() {
        LOG.info("QooCode Plugin initializing...");
        
        // Register tool window
        ToolWindowManager toolWindowManager = ToolWindowManager.getInstance(project);
        if (toolWindowManager != null) {
            toolWindow = toolWindowManager.getToolWindow("QooCode");
            if (toolWindow == null) {
                toolWindow = toolWindowManager.registerToolWindow(
                    "QooCode",
                    true,
                    ToolWindowAnchor.RIGHT,
                    project,
                    true
                );
                toolWindow.setTitle("QooCode Chat");
                
                // Create and set content
                chatPanel = new QooCodeChatPanel(project);
                toolWindow.getComponent().add(chatPanel.getContent());
                
                // Set icon
                toolWindow.setIcon(AllIcons.Toolwindows.ToolWindowDebugger);
            }
        }
        
        LOG.info("QooCode Plugin initialized successfully");
    }

    @Override
    public void disposeComponent() {
        LOG.info("QooCode Plugin disposing...");
        if (toolWindow != null) {
            toolWindow.remove();
        }
    }

    @Override
    @NotNull
    public String getComponentName() {
        return "QooCodePlugin";
    }

    /**
     * Get the chat panel instance
     */
    public QooCodeChatPanel getChatPanel() {
        return chatPanel;
    }

    /**
     * Show the QooCode tool window
     */
    public void showToolWindow() {
        if (toolWindow != null) {
            toolWindow.show();
        }
    }

    /**
     * Hide the QooCode tool window
     */
    public void hideToolWindow() {
        if (toolWindow != null) {
            toolWindow.hide();
        }
    }
}
