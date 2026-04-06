/**
 * qoocode Toolbar Action
 * Shows QooCode button in the toolbar
 */

package qoocode.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import org.jetbrains.annotations.*;

public class QooCodeToolbarAction extends AnAction {
    private static final Logger LOG = Logger.getInstance(QooCodeToolbarAction.class);

    public QooCodeToolbarAction() {
        super("QooCode", "Open QooCode AI Assistant", null);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            LOG.warn("No project available");
            return;
        }

        LOG.info("Opening QooCode from toolbar");

        ToolWindowManager manager = ToolWindowManager.getInstance(project);
        ToolWindow toolWindow = manager.getToolWindow("QooCode");
        if (toolWindow != null) {
            toolWindow.show();
            toolWindow.activate(null);
        }
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        e.getPresentation().setEnabledAndVisible(project != null);
    }
}
