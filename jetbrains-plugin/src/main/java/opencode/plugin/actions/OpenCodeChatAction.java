/**
 * QOOCODE Chat Action
 */

package QOOCODE.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import org.jetbrains.annotations.*;

public class QOOCODEChatAction extends QOOCODEMainAction {
    private static final Logger LOG = Logger.getInstance(QOOCODEChatAction.class);
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        LOG.info("QOOCODE Chat action triggered");
        super.actionPerformed(e);
    }
}
