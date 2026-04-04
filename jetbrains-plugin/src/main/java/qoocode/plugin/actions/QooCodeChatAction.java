/**
 * qoocode Chat Action
 */

package qoocode.plugin.actions;

import com.intellij.openapi.actionSystem.*;
import com.intellij.openapi.project.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import org.jetbrains.annotations.*;

public class QooCodeChatAction extends QooCodeMainAction {
    private static final Logger LOG = Logger.getInstance(QooCodeChatAction.class);
    
    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        LOG.info("QooCode Chat action triggered");
        super.actionPerformed(e);
    }
}
