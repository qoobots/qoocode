/**
 * QOOCODE JetBrains Plugin
 * Main Plugin Entry Point
 */

package QOOCODE.plugin;

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

public class QOOCODEPlugin implements ApplicationComponent {
    private static final Logger LOG = Logger.getInstance(QOOCODEPlugin.class);
    private Project project;
    private ToolWindow toolWindow;
    private QOOCODEChatPanel chatPanel;

    public QOOCODEPlugin(@NotNull Project project) {
        this.project = project;
    }

    @Override
    public void initComponent() {
        LOG.info("QOOCODE Plugin initializing...");
        
        // Register tool window
        ToolWindowManager toolWindowManager = ToolWindowManager.getInstance(project);
        if (toolWindowManager != null) {
            toolWindow = toolWindowManager.getToolWindow("QOOCODE");
            if (toolWindow == null) {
                toolWindow = toolWindowManager.registerToolWindow(
                    "QOOCODE",
                    true,
                    ToolWindowAnchor.RIGHT,
                    project,
                    true
                );
                toolWindow.setTitle("QOOCODE Chat");
                
                // Create and set content
                chatPanel = new QOOCODEChatPanel(project);
                toolWindow.getComponent().add(chatPanel.getContent());
                
                // Set icon
                toolWindow.setIcon(AllIcons.Toolwindows.ToolWindowDebugger);
            }
        }
        
        LOG.info("QOOCODE Plugin initialized successfully");
    }

    @Override
    public void disposeComponent() {
        LOG.info("QOOCODE Plugin disposing...");
        if (toolWindow != null) {
            toolWindow.remove();
        }
    }

    @Override
    @NotNull
    public String getComponentName() {
        return "QOOCODEPlugin";
    }

    /**
     * Get the chat panel instance
     */
    public QOOCODEChatPanel getChatPanel() {
        return chatPanel;
    }

    /**
     * Show the QOOCODE tool window
     */
    public void showToolWindow() {
        if (toolWindow != null) {
            toolWindow.show();
        }
    }

    /**
     * Hide the QOOCODE tool window
     */
    public void hideToolWindow() {
        if (toolWindow != null) {
            toolWindow.hide();
        }
    }
}
