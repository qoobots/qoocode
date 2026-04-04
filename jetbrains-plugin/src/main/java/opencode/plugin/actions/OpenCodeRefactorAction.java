/**
 * QOOCODE Refactor Action
 * Refactor selected code
 */

package QOOCODE.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.openapi.wm.*;
import QOOCODE.plugin.QOOCODEChatPanel;
import org.jetbrains.annotations.*;

public class QOOCODERefactorAction extends AnAction {
    private static final Logger LOG = Logger.getLogger(QOOCODERefactorAction.class);
    
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
            ToolWindow toolWindow = manager.getToolWindow("QOOCODE");
            if (toolWindow != null) {
                toolWindow.show();
                
                Object userData = toolWindow.getUserData(QOOCODEChatPanel.class);
                if (userData instanceof QOOCODEChatPanel) {
                    QOOCODEChatPanel chatPanel = (QOOCODEChatPanel) userData;
                    chatPanel.addMessage(new QOOCODEChatPanel.ChatMessage(
                        QOOCODEChatPanel.MessageRole.USER,
                        "Refactor this code to improve quality:\n" + selectedText
                    ));
                    chatPanel.addMessage(new QOOCODEChatPanel.ChatMessage(
                        QOOCODEChatPanel.MessageRole.ASSISTANT,
                        "Here are some refactoring suggestions:\n\n" +
                        "1. Extract method for repeated logic\n" +
                        "2. Use more descriptive variable names\n" +
                        "3. Add early returns to reduce nesting\n" +
                        "4. Consider using a strategy pattern for flexibility\n\n" +
                        "Would you like me to generate the refactored code?"
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
