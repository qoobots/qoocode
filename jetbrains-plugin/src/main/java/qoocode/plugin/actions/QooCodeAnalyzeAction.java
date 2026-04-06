/**
 * qoocode Analyze Action
 * Analyze current file with QooCode
 */

package qoocode.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.vfs.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.wm.ToolWindowManager;
import com.intellij.openapi.util.Key;
import qoocode.plugin.QooCodeChatPanel;
import org.jetbrains.annotations.*;

import java.io.*;

public class QooCodeAnalyzeAction extends AnAction {
    private static final Logger LOG = Logger.getInstance(QooCodeAnalyzeAction.class);

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) return;

        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (editor == null) {
            LOG.info("No editor available");
            return;
        }

        Document document = editor.getDocument();
        String content = document.getText();

        LOG.info("Analyzing file: " + (editor.getDocument().getLineCount()) + " lines");

        // Show tool window and send analysis request
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
        e.getPresentation().setEnabled(project != null && e.getData(CommonDataKeys.EDITOR) != null);
    }
}
