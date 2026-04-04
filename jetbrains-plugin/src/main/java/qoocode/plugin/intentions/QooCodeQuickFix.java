/**
 * qoocode Quick Fix
 * Quick fix intention action
 */

package qoocode.plugin.intentions;

import com.intellij.codeInspection.*;
import com.intellij.openapi.editor.*;
import com.intellij.openapi.project.*;
import com.intellij.psi.*;
import com.intellij.util.*;
import org.jetbrains.annotations.*;

import javax.swing.*;

public class QooCodeQuickFix implements IntentionAction {
    private static final Logger LOG = Logger.getInstance(QooCodeQuickFix.class);
    
    @Override
    @NotNull
    public String getText() {
        return "Fix with QooCode";
    }
    
    @Override
    @NotNull
    public String getFamilyName() {
        return "QooCode";
    }
    
    @Override
    public boolean isAvailable(@NotNull Project project, Editor editor, PsiFile file) {
        return file != null && editor != null;
    }
    
    @Override
    public void invoke(@NotNull Project project, Editor editor, PsiFile file) throws ProblemsHolder {
        if (file == null || editor == null) return;
        
        LOG.info("QooCode quick fix invoked");
        
        // Get selection
        int offset = editor.getCaretModel().getOffset();
        String lineText = editor.getDocument().getLineText(
            editor.getDocument().getLineNumber(offset)
        );
        
        // Show suggestion
        editor.getDocument().insertString(
            editor.getSelectionModel().getSelectionEnd(),
            " // QooCode: Consider using a more efficient approach"
        );
    }
    
    @Override
    public boolean startInWriteAction() {
        return false;
    }
}
