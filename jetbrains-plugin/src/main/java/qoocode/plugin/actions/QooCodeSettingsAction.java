/**
 * qoocode Settings Action
 */

package qoocode.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.options.*;
import com.intellij.openapi.diagnostic.*;
import org.jetbrains.annotations.*;

public class QooCodeSettingsAction extends AnAction {
    private static final Logger LOG = Logger.getLogger(QooCodeSettingsAction.class);
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        
        LOG.info("Opening QooCode settings");
        
        try {
            ShowSettingsUtil.getInstance().showSettingsDialog(
                project,
                "QooCode"
            );
        } catch (Exception ex) {
            LOG.error("Failed to open settings", ex);
        }
    }
    
    @Override
    public void update(@NotNull AnActionEvent e) {
        e.getPresentation().setEnabled(true);
    }
}
