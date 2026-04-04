/**
 * QOOCODE Status Bar Widget
 */

package QOOCODE.plugin;

import com.intellij.openapi.project.*;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.*;
import com.intellij.ide.ui.*;
import com.intellij.util.ui.*;
import org.jetbrains.annotations.*;

import javax.swing.*;
import java.awt.*;

public class QOOCODEStatusBarWidget implements StatusBarWidget {
    private static final Logger LOG = Logger.getInstance(QOOCODEStatusBarWidget.class);
    
    private final Project project;
    private boolean connected = false;
    
    public QOOCODEStatusBarWidget(Project project) {
        this.project = project;
    }
    
    @Override
    public @NotNull String ID() {
        return "QOOCODE.status";
    }
    
    @Override
    public @Nullable WidgetPresentation getPresentation(@NotNull PlatformType type) {
        return new Presentation();
    }
    
    @Override
    public void install(@NotNull StatusBar statusBar) {
        LOG.info("Installing QOOCODE status bar widget");
    }
    
    @Override
    public void dispose() {
        LOG.info("Disposing QOOCODE status bar widget");
    }
    
    public void setConnected(boolean connected) {
        this.connected = connected;
    }
    
    private class Presentation implements StatusBarWidgetPresentation {
        @Override
        public @Nullable String getText() {
            return connected ? "QOOCODE: Connected" : "QOOCODE: Ready";
        }
        
        @Override
        public @Nullable String getToolTipText() {
            return connected ? "QOOCODE is connected to the server" : "Click to start QOOCODE";
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
                // Open QOOCODE tool window
                ToolWindowManager manager = ToolWindowManager.getInstance(project);
                if (manager != null) {
                    ToolWindow toolWindow = manager.getToolWindow("QOOCODE");
                    if (toolWindow != null) {
                        toolWindow.show();
                    }
                }
            };
        }
    }
}

class QOOCODEStatusBarWidgetFactory implements StatusBarWidgetFactory {
    @Override
    public @NotNull String getId() {
        return "QOOCODE.status";
    }
    
    @Override
    public @NotNull String getDisplayName() {
        return "QOOCODE Status";
    }
    
    @Override
    public @Nullable Icon getIcon() {
        return AllIcons.General.Settings;
    }
    
    @Override
    public StatusBarWidget createWidget(@NotNull Project project) {
        return new QOOCODEStatusBarWidget(project);
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
