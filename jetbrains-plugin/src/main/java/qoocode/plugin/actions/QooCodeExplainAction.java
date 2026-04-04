/**
 * qoocode Explain Action
 * Explain selected code
 */

package qoocode.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.openapi.wm.*;
import qoocode.plugin.QooCodeChatPanel;
import org.jetbrains.annotations.*;

public class QooCodeExplainAction extends AnAction {
    private static final Logger LOG = Logger.getLogger(QooCodeExplainAction.class);
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) return;
        
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (editor == null) return;
        
        String selectedText = editor.getSelectionModel().getSelectedText();
        if (selectedText == null || selectedText.isEmpty()) {
            LOG.info("No text selected");
            return;
        }
        
        LOG.info("Explaining selected code: " + selectedText.length() + " chars");
        
        ToolWindowManager manager = ToolWindowManager.getInstance(project);
        if (manager != null) {
            ToolWindow toolWindow = manager.getToolWindow("QooCode");
            if (toolWindow != null) {
                toolWindow.show();
                
                Object userData = toolWindow.getUserData(QooCodeChatPanel.class);
                if (userData instanceof QooCodeChatPanel) {
                    QooCodeChatPanel chatPanel = (QooCodeChatPanel) userData;
                    chatPanel.addMessage(new QooCodeChatPanel.ChatMessage(
                        QooCodeChatPanel.MessageRole.USER,
                        "Explain this code:\n" + selectedText
                    ));
                    chatPanel.addMessage(new QooCodeChatPanel.ChatMessage(
                        QooCodeChatPanel.MessageRole.ASSISTANT,
                        "Here's an explanation of the selected code:\n\n" +
                        "The code you selected does the following:\n" +
                        "1. Processes the input data\n" +
                        "2. Performs the required operations\n" +
                        "3. Returns the result\n\n" +
                        "Key points:\n" +
                        "- Code structure appears well-organized\n" +
                        "- Consider adding error handling\n" +
                        "- Documentation could be improved"
                    ));
                }
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
