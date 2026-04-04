/**
 * QOOCODE Main Action
 * Main toolbar action
 */

package QOOCODE.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.ui.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import QOOCODE.plugin.QOOCODEChatPanel;
import org.jetbrains.annotations.*;

import javax.swing.*;

public class QOOCODEMainAction extends AnAction {
    private static final Logger LOG = Logger.getInstance(QOOCODEMainAction.class);
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            LOG.warn("No project available");
            return;
        }
        
        LOG.info("Opening QOOCODE");
        
        ToolWindowManager manager = ToolWindowManager.getInstance(project);
        if (manager != null) {
            ToolWindow toolWindow = manager.getToolWindow("QOOCODE");
            if (toolWindow != null) {
                toolWindow.show();
                toolWindow.activate(null);
            } else {
                // If tool window doesn't exist, show a message
                Messages.showInfoMessage(
                    "QOOCODE is being initialized. Please try again.",
                    "QOOCODE"
                );
            }
        }
    }
    
    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        e.getPresentation().setEnabled(project != null);
    }
}
