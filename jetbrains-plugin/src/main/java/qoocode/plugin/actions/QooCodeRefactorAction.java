/**
 * qoocode Refactor Action
 * Refactor selected code
 */

package qoocode.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.util.Key;
import qoocode.plugin.QooCodeChatPanel;
import org.jetbrains.annotations.*;

public class QooCodeRefactorAction extends AnAction {
    private static final Logger LOG = Logger.getInstance(QooCodeRefactorAction.class);

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) return;

        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (editor == null) return;

        String selectedText = editor.getSelectionModel().getSelectedText();
        if (selectedText == null || selectedText.isEmpty()) {
            LOG.info("No text selected for refactoring");
            return;
        }

        LOG.info("Refactoring selected code");

        ToolWindowManager manager = ToolWindowManager.getInstance(project);
        if (manager != null) {
            ToolWindow toolWindow = manager.getToolWindow("QooCode");
            if (toolWindow != null) {
                toolWindow.show();
                LOG.info("Tool window shown");
            }
        }
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        boolean hasSelection = false;

        if (project != null) {
            Editor editor = e.getData(CommonDataKeys.EDITOR);
            if (editor != null) {
                String selected = editor.getSelectionModel().getSelectedText();
                hasSelection = selected != null && !selected.isEmpty();
            }
        }

        e.getPresentation().setEnabled(hasSelection);
    }
}
