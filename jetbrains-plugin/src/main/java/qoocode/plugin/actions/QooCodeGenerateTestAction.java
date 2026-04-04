/**
 * qoocode Generate Test Action
 */

package qoocode.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.openapi.wm.*;
import qoocode.plugin.QooCodeChatPanel;
import org.jetbrains.annotations.*;

public class QooCodeGenerateTestAction extends AnAction {
    private static final Logger LOG = Logger.getLogger(QooCodeGenerateTestAction.class);
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        if (project == null) return;
        
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (editor == null) return;
        
        String selectedText = editor.getSelectionModel().getSelectedText();
        if (selectedText == null || selectedText.isEmpty()) {
            LOG.info("No code selected for test generation");
            return;
        }
        
        LOG.info("Generating test for selected code");
        
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
                        "Generate unit tests for:\n" + selectedText
                    ));
                    chatPanel.addMessage(new QooCodeChatPanel.ChatMessage(
                        QooCodeChatPanel.MessageRole.ASSISTANT,
                        "Here's a suggested test:\n\n```javascript\n" +
                        "describe('YourFunction', () => {\n" +
                        "  it('should handle basic input', () => {\n" +
                        "    const result = yourFunction(input);\n" +
                        "    expect(result).toBe(expectedOutput);\n" +
                        "  });\n" +
                        "\n" +
                        "  it('should handle edge cases', () => {\n" +
                        "    expect(() => yourFunction(null)).toThrow();\n" +
                        "  });\n" +
                        "});\n" +
                        "```\n\n" +
                        "Shall I create this test file in your project?"
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
