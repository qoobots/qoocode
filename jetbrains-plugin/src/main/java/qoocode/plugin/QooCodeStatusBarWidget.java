/**
 * qoocode Status Bar Widget
 */

package qoocode.plugin;

import com.intellij.openapi.project.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.ide.ui.*;
import com.intellij.util.ui.*;
import org.jetbrains.annotations.*;

import javax.swing.*;
import java.awt.*;

public class QooCodeStatusBarWidget implements StatusBarWidget {
    private static final Logger LOG = Logger.getInstance(QooCodeStatusBarWidget.class);
    
    private final Project project;
    private boolean connected = false;
    
    public QooCodeStatusBarWidget(Project project) {
        this.project = project;
    }
    
    @Override
    public @NotNull String ID() {
        return "QooCode.status";
    }
    
    @Override
    public @Nullable WidgetPresentation getPresentation(@NotNull PlatformType type) {
        return new Presentation();
    }
    
    @Override
    public void install(@NotNull StatusBar statusBar) {
        LOG.info("Installing QooCode status bar widget");
    }
    
    @Override
    public void dispose() {
        LOG.info("Disposing QooCode status bar widget");
    }
    
    public void setConnected(boolean connected) {
        this.connected = connected;
    }
    
    private class Presentation implements StatusBarWidgetPresentation {
        @Override
        public @Nullable String getText() {
            return connected ? "QooCode: Connected" : "QooCode: Ready";
        }
        
        @Override
        public @Nullable String getToolTipText() {
            return connected ? "QooCode is connected to the server" : "Click to start QooCode";
        }
        
        @Override
        public @Nullable Icon getIcon() {
            return connected ? 
                AllIcons.IDE.Statusbar_infos : 
                AllIcons.IDE.Statusbar_warning;
        }
        
        @Override
        public @Nullable Consumer<MouseEvent> getClickConsumer() {
            return event -> {
                // Open QooCode tool window
                ToolWindowManager manager = ToolWindowManager.getInstance(project);
                if (manager != null) {
                    ToolWindow toolWindow = manager.getToolWindow("QooCode");
                    if (toolWindow != null) {
                        toolWindow.show();
                    }
                }
            };
        }
    }
}

class QooCodeStatusBarWidgetFactory implements StatusBarWidgetFactory {
    @Override
    public @NotNull String getId() {
        return "QooCode.status";
    }
    
    @Override
    public @NotNull String getDisplayName() {
        return "QooCode Status";
    }
    
    @Override
    public @Nullable Icon getIcon() {
        return AllIcons.General.Settings;
    }
    
    @Override
    public StatusBarWidget createWidget(@NotNull Project project) {
        return new QooCodeStatusBarWidget(project);
    }
    
    @Override
    public void disposeWidget(@NotNull StatusBarWidget widget) {
        widget.dispose();
    }
    
    @Override
    public boolean canBeEnabledOn(@NotNull StatusBar statusBar) {
        return true;
    }
}
