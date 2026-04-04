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
import com.intellij.openapi.wm.*;
import qoocode.plugin.QooCodeChatPanel;
import org.jetbrains.annotations.*;

import java.io.*;

public class QooCodeAnalyzeAction extends AnAction {
    private static final Logger LOG = Logger.getLogger(QooCodeAnalyzeAction.class);
    
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
                
                // Get chat panel and send message
                Object userData = toolWindow.getUserData(QooCodeChatPanel.class);
                if (userData instanceof QooCodeChatPanel) {
                    QooCodeChatPanel chatPanel = (QooCodeChatPanel) userData;
                    chatPanel.addMessage(new QooCodeChatPanel.ChatMessage(
                        QooCodeChatPanel.MessageRole.ASSISTANT,
                        "Analyzing your code...\n\n" +
                        "File has " + document.getLineCount() + " lines.\n" +
                        "I'll analyze the code structure, potential issues, and suggestions."
                    ));
                }
            }
        }
    }
    
    @Override
    public void update(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        e.getPresentation().setEnabled(project != null && e.getData(CommonDataKeys.EDITOR) != null);
    }
}
