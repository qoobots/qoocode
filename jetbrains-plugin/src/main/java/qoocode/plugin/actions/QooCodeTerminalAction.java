/**
 * QooCode Terminal Action
 * Quick action to open QooCode terminal in IDE
 */

package qoocode.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import qoocode.plugin.QooCodeTerminalPanel;
import org.jetbrains.annotations.NotNull;

/**
 * Action to open QooCode terminal
 */
public class QooCodeTerminalAction extends AnAction {

    public QooCodeTerminalAction() {
        super("Open QooCode Terminal", "在 IDEA 中打开 QooCode 命令行终端", null);
    }

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) {
            return;
        }

        // Get or create QooCode tool window
        ToolWindowManager toolWindowManager = ToolWindowManager.getInstance(project);
        ToolWindow toolWindow = toolWindowManager.getToolWindow("QooCode");

        if (toolWindow == null) {
            // Tool window not found, show error
            com.intellij.openapi.ui.Messages.showErrorDialog(
                project,
                "QooCode 工具窗口未找到，请确保插件已正确安装。",
                "QooCode"
            );
            return;
        }

        // Show the tool window
        toolWindow.show();
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        boolean enabled = project != null;
        e.getPresentation().setEnabledAndVisible(enabled);
    }
}
