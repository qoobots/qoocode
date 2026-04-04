/**
 * QOOCODE Analyze Action
 * Analyze current file with QOOCODE
 */

package QOOCODE.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.fileEditor.*;
import com.intellij.openapi.vfs.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.openapi.wm.*;
import QOOCODE.plugin.QOOCODEChatPanel;
import org.jetbrains.annotations.*;

import java.io.*;

public class QOOCODEAnalyzeAction extends AnAction {
    private static final Logger LOG = Logger.getLogger(QOOCODEAnalyzeAction.class);
    
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
            ToolWindow toolWindow = manager.getToolWindow("QOOCODE");
            if (toolWindow != null) {
                toolWindow.show();
                
                // Get chat panel and send message
                Object userData = toolWindow.getUserData(QOOCODEChatPanel.class);
                if (userData instanceof QOOCODEChatPanel) {
                    QOOCODEChatPanel chatPanel = (QOOCODEChatPanel) userData;
                    chatPanel.addMessage(new QOOCODEChatPanel.ChatMessage(
                        QOOCODEChatPanel.MessageRole.ASSISTANT,
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
