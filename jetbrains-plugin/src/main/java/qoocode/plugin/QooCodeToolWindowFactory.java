/**
 * qoocode Tool Window Factory
 */

package qoocode.plugin;

import com.intellij.openapi.project.Project;
import com.intellij.openapi.wm.ToolWindow;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.util.Key;
import com.intellij.ui.content.ContentFactory;
import org.jetbrains.annotations.*;

import javax.swing.*;

public class QooCodeToolWindowFactory implements com.intellij.openapi.wm.ToolWindowFactory {
    private static final Logger LOG = Logger.getInstance(QooCodeToolWindowFactory.class);

    @Override
    public void createToolWindowContent(@NotNull Project project, @NotNull com.intellij.openapi.wm.ToolWindow toolWindow) {
        LOG.info("Creating QooCode tool window content");

        // 使用终端面板嵌入 qoocode CLI
        QooCodeTerminalPanel terminalPanel = new QooCodeTerminalPanel(project);

        // 创建包含终端和重启按钮的面板
        JPanel mainPanel = new JPanel(new java.awt.BorderLayout());
        mainPanel.add(terminalPanel.getComponent(), java.awt.BorderLayout.CENTER);

        // 添加工具栏按钮
        JPanel toolbarPanel = createToolbarPanel(project, terminalPanel);
        mainPanel.add(toolbarPanel, java.awt.BorderLayout.NORTH);

        // 使用 ContentFactory 正确添加内容
        ContentFactory contentFactory = ContentFactory.getInstance();
        toolWindow.getContentManager().addContent(
            contentFactory.createContent(mainPanel, "Terminal", false)
        );
    }

    private JPanel createToolbarPanel(Project project, QooCodeTerminalPanel terminalPanel) {
        JPanel toolbar = new JPanel(new java.awt.FlowLayout(java.awt.FlowLayout.LEFT));
        toolbar.setBackground(new java.awt.Color(245, 245, 245));
        toolbar.setBorder(javax.swing.BorderFactory.createEmptyBorder(4, 8, 4, 8));

        // 标题
        javax.swing.JLabel titleLabel = new javax.swing.JLabel("QooCode 终端");
        titleLabel.setFont(new java.awt.Font("Microsoft YaHei", java.awt.Font.BOLD, 14));
        titleLabel.setForeground(new java.awt.Color(17, 17, 17));
        toolbar.add(titleLabel);

        toolbar.add(javax.swing.Box.createHorizontalStrut(16));

        // 重启按钮
        javax.swing.JButton restartButton = new javax.swing.JButton("🔄 重启");
        restartButton.setFont(new java.awt.Font("Microsoft YaHei", java.awt.Font.PLAIN, 12));
        restartButton.addActionListener(e -> terminalPanel.restartQoocode());
        toolbar.add(restartButton);

        toolbar.add(javax.swing.Box.createHorizontalStrut(8));

        // 停止按钮
        javax.swing.JButton stopButton = new javax.swing.JButton("⏹ 停止");
        stopButton.setFont(new java.awt.Font("Microsoft YaHei", java.awt.Font.PLAIN, 12));
        stopButton.addActionListener(e -> terminalPanel.stopQoocode());
        toolbar.add(stopButton);

        toolbar.add(javax.swing.Box.createHorizontalStrut(16));

        // 状态显示
        javax.swing.JLabel statusLabel = new javax.swing.JLabel("● 运行中");
        statusLabel.setFont(new java.awt.Font("Microsoft YaHei", java.awt.Font.PLAIN, 11));
        statusLabel.setForeground(new java.awt.Color(7, 193, 96));
        toolbar.add(statusLabel);

        // 设置按钮
        toolbar.add(javax.swing.Box.createHorizontalStrut(16));
        javax.swing.JButton settingsButton = new javax.swing.JButton("⚙ 设置");
        settingsButton.setFont(new java.awt.Font("Microsoft YaHei", java.awt.Font.PLAIN, 12));
        settingsButton.addActionListener(e -> {
            com.intellij.openapi.options.ShowSettingsUtil.getInstance().showSettingsDialog(project, "QooCode");
        });
        toolbar.add(settingsButton);

        return toolbar;
    }

    @Override
    public boolean shouldBeAvailable(@NotNull Project project) {
        return true;
    }
}
