/**
 * qoocode JetBrains Plugin
 * Main Plugin Entry Point
 */

package qoocode.plugin;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.diagnostic.Logger;
import org.jetbrains.annotations.NotNull;

public class QooCodePlugin {
    private static final Logger LOG = Logger.getInstance(QooCodePlugin.class);

    public QooCodePlugin() {
        LOG.info("QooCode Plugin loaded");
    }

    /**
     * Show the QooCode tool window
     */
    public static void showToolWindow(@NotNull Project project) {
        com.intellij.openapi.wm.ToolWindow toolWindow = com.intellij.openapi.wm.ToolWindowManager.getInstance(project).getToolWindow("QooCode");
        if (toolWindow != null) {
            toolWindow.show();
        }
    }
}
