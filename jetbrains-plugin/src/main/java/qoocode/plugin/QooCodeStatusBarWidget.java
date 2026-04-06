/**
 * qoocode Status Bar Widget
 */

package qoocode.plugin;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.*;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.util.NlsContexts;
import com.intellij.openapi.wm.StatusBarWidget;
import com.intellij.util.Consumer;
import org.jetbrains.annotations.*;

import javax.swing.*;
import java.awt.event.MouseEvent;

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
    public @Nullable StatusBarWidget.WidgetPresentation getPresentation(@NotNull PlatformType type) {
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

    private class Presentation implements StatusBarWidget.WidgetPresentation {
        public @Nullable String getText() {
            return connected ? "QooCode: Connected" : "QooCode: Ready";
        }

        public @Nullable String getTooltipText() {
            return connected ? "QooCode is connected to the server" : "Click to start QooCode";
        }

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

    public @NotNull String getDisplayName() {
        return "QooCode Status";
    }

    public @Nullable Icon getIcon() {
        return null;
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
    public boolean isAvailable(@NotNull Project project) {
        return true;
    }

    @Override
    public boolean canBeEnabledOn(@NotNull StatusBar statusBar) {
        return true;
    }
}
