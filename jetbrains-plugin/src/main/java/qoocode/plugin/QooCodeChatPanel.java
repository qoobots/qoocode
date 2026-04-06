/**
 * qoocode Chat Panel
 * Main chat interface for JetBrains IDE
 */

package qoocode.plugin;

import com.intellij.openapi.project.*;
import com.intellij.openapi.ui.*;
import com.intellij.openapi.wm.*;
import com.intellij.ui.*;
import com.intellij.ui.treeStructure.*;
import com.intellij.util.ui.*;
import org.jetbrains.annotations.*;

import javax.swing.*;
import javax.swing.border.*;
import javax.swing.text.*;
import java.awt.*;
import java.awt.event.*;
import java.util.*;
import java.util.List;

public class QooCodeChatPanel {
    private final Project project;
    private JPanel mainPanel;
    private JPanel headerPanel;
    private JPanel messagesPanel;
    private JScrollPane messagesScrollPane;
    private JPanel inputPanel;
    private JTextArea inputTextArea;
    private JButton sendButton;
    private JButton clearButton;
    private SimpleToolWindowPanel toolWindowPanel;
    
    private DefaultListModel<String> messagesModel;
    private List<ChatMessage> messages;
    
    public QooCodeChatPanel(@NotNull Project project) {
        this.project = project;
        this.messages = new ArrayList<>();
        this.messagesModel = new DefaultListModel<>();
        initComponents();
        setupLayout();
        setupEventHandlers();
    }
    
    private void initComponents() {
        // Main panel
        mainPanel = new JPanel(new BorderLayout());
        mainPanel.setBackground(UIUtil.getPanelBackground());
        
        // Header panel
        headerPanel = createHeaderPanel();
        
        // Messages panel
        messagesPanel = new JPanel();
        messagesPanel.setLayout(new BoxLayout(messagesPanel, BoxLayout.Y_AXIS));
        messagesPanel.setBackground(UIUtil.getPanelBackground());
        
        messagesScrollPane = ScrollPaneFactory.createScrollPane(messagesPanel);
        messagesScrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
        messagesScrollPane.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        
        // Make scroll pane anchor to bottom (new messages at bottom)
        messagesScrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);
        JScrollBar verticalScrollBar = messagesScrollPane.getVerticalScrollBar();
        verticalScrollBar.addAdjustmentListener(new AdjustmentListener() {
            private int previousValue = -1;
            
            @Override
            public void adjustmentValueChanged(AdjustmentEvent e) {
                // Auto-scroll to bottom when new messages are added
                if (previousValue == -1 || e.getValueIsAdjusting()) {
                    previousValue = e.getValue();
                    return;
                }
                if (e.getValue() < previousValue) {
                    // User is scrolling up, don't auto-scroll
                    previousValue = e.getValue();
                    return;
                }
                // Auto-scroll to bottom
                previousValue = e.getValue();
                SwingUtilities.invokeLater(() -> {
                    JScrollBar scrollBar = messagesScrollPane.getVerticalScrollBar();
                    scrollBar.setValue(scrollBar.getMaximum());
                });
            }
        });
        
        // Input panel
        inputPanel = createInputPanel();
        
        // Tool window panel
        toolWindowPanel = new SimpleToolWindowPanel(true);
    }
    
    private JPanel createHeaderPanel() {
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(new Color(245, 245, 245));
        header.setBorder(BorderFactory.createEmptyBorder(10, 12, 10, 12));

        // Title - WeChat style
        JLabel titleLabel = new JLabel("QooCode助手");
        titleLabel.setFont(new Font("Microsoft YaHei", Font.BOLD, 16));
        titleLabel.setForeground(new Color(17, 17, 17));
        header.add(titleLabel, BorderLayout.CENTER);

        // Status indicator and settings button
        JPanel statusPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 4, 0));
        statusPanel.setOpaque(false);

        JLabel statusDot = new JLabel("●");
        statusDot.setForeground(new Color(7, 193, 96)); // WeChat green
        statusDot.setToolTipText("在线");

        // Settings button
        JButton settingsButton = new JButton("⚙");
        settingsButton.setFont(new Font("Arial", Font.PLAIN, 14));
        settingsButton.setBorderPainted(false);
        settingsButton.setFocusPainted(false);
        settingsButton.setContentAreaFilled(false);
        settingsButton.setToolTipText("打开设置");
        settingsButton.addActionListener(e -> openSettings());

        statusPanel.add(statusDot);
        statusPanel.add(settingsButton);
        header.add(statusPanel, BorderLayout.EAST);

        return header;
    }

    private void openSettings() {
        com.intellij.openapi.options.ShowSettingsUtil.getInstance().showSettingsDialog(project, "QooCode");
    }
    
    private JPanel createInputPanel() {
        JPanel input = new JPanel(new BorderLayout(0, 0));
        input.setBorder(BorderFactory.createEmptyBorder(8, 12, 12, 12));
        input.setBackground(new Color(245, 245, 245));
        
        // Input text area - WeChat style
        inputTextArea = new JTextArea(4, 20);
        inputTextArea.setLineWrap(true);
        inputTextArea.setWrapStyleWord(true);
        inputTextArea.setFont(new Font("Microsoft YaHei", Font.PLAIN, 14));
        inputTextArea.setMargin(new Insets(10, 10, 10, 10));
        inputTextArea.setText("");
        inputTextArea.setBorder(BorderFactory.createLineBorder(new Color(229, 229, 229), 1));
        inputTextArea.setBackground(Color.WHITE);
        
        JScrollPane inputScroll = ScrollPaneFactory.createScrollPane(inputTextArea);
        inputScroll.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
        inputScroll.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        inputScroll.setBorder(null);
        
        // Button panel - WeChat style
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 8, 8));
        buttonPanel.setOpaque(false);
        
        clearButton = new JButton("清空");
        clearButton.setFont(new Font("Microsoft YaHei", Font.PLAIN, 12));
        clearButton.setBackground(new Color(229, 229, 229));
        clearButton.setBorderPainted(false);
        clearButton.setFocusPainted(false);
        clearButton.setToolTipText("清空对话");
        clearButton.addActionListener(e -> clearMessages());
        
        sendButton = new JButton("发送");
        sendButton.setFont(new Font("Microsoft YaHei", Font.PLAIN, 12));
        sendButton.setBackground(new Color(7, 193, 96)); // WeChat green
        sendButton.setForeground(Color.WHITE);
        sendButton.setBorderPainted(false);
        sendButton.setFocusPainted(false);
        sendButton.setPreferredSize(new Dimension(70, 36));
        sendButton.setToolTipText("发送消息 (Ctrl+Enter)");
        sendButton.addActionListener(e -> sendMessage());
        
        buttonPanel.add(clearButton);
        buttonPanel.add(sendButton);
        
        input.add(inputScroll, BorderLayout.CENTER);
        input.add(buttonPanel, BorderLayout.SOUTH);
        
        // Ctrl+Enter to send (WeChat style)
        inputTextArea.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                if (e.isControlDown() && e.getKeyCode() == KeyEvent.VK_ENTER) {
                    sendMessage();
                }
            }
        });
        
        return input;
    }
    
    private void setupLayout() {
        mainPanel.add(headerPanel, BorderLayout.NORTH);
        mainPanel.add(messagesScrollPane, BorderLayout.CENTER);
        mainPanel.add(inputPanel, BorderLayout.SOUTH);
    }
    
    private void setupEventHandlers() {
        // Enter key handling - WeChat style: Enter for newline, Ctrl+Enter to send
        // Already handled in createInputPanel()
    }
    
    public void sendMessage() {
        String text = inputTextArea.getText().trim();
        if (text.isEmpty()) {
            return;
        }
        
        // Add user message
        addMessage(new ChatMessage(MessageRole.USER, text));
        inputTextArea.setText("");
        
        // Process message (mock response)
        processMessage(text);
    }
    
    private void processMessage(String text) {
        // Use AI service to get real response
        QooCodeAIService aiService = new QooCodeAIService(project);

        aiService.sendMessageAsync(text, messages, new QooCodeAIService.AIServiceCallback() {
            @Override
            public void onResponse(String response) {
                SwingUtilities.invokeLater(() -> {
                    addMessage(new ChatMessage(MessageRole.ASSISTANT, response));
                });
            }

            @Override
            public void onError(Throwable error) {
                SwingUtilities.invokeLater(() -> {
                    addMessage(new ChatMessage(MessageRole.ASSISTANT,
                        "抱歉，调用 AI 时出错：" + error.getMessage() + "\n\n请检查 API 配置是否正确。"));
                });
            }
        });
    }

    public void addMessage(ChatMessage message) {
        messages.add(message);

        JPanel messagePanel = createMessagePanel(message);
        messagesPanel.add(messagePanel);
        messagesPanel.add(Box.createVerticalStrut(8));

        messagesPanel.revalidate();
        messagesPanel.repaint();

        // Always scroll to bottom to show newest messages
        SwingUtilities.invokeLater(() -> {
            JScrollBar verticalScrollBar = messagesScrollPane.getVerticalScrollBar();
            verticalScrollBar.setValue(verticalScrollBar.getMaximum());
        });
    }

    public void clearMessages() {
        messages.clear();
        messagesPanel.removeAll();
        messagesPanel.revalidate();
        messagesPanel.repaint();
    }
    
    private JPanel createMessagePanel(ChatMessage message) {
        JPanel container = new JPanel(new BorderLayout());
        container.setOpaque(false);
        container.setBorder(BorderFactory.createEmptyBorder(8, 12, 8, 12));

        boolean isUser = message.role == MessageRole.USER;

        // Create avatar - WeChat circular style
        JLabel avatar = new JLabel();
        avatar.setPreferredSize(new Dimension(36, 36));
        avatar.setOpaque(true);
        if (isUser) {
            // User avatar - blue circle
            avatar.setBackground(new Color(7, 193, 96));
            avatar.setForeground(Color.WHITE);
            avatar.setText("我");
            avatar.setHorizontalAlignment(SwingConstants.CENTER);
            avatar.setVerticalAlignment(SwingConstants.CENTER);
            avatar.setFont(new Font("Microsoft YaHei", Font.PLAIN, 14));
            avatar.setBorder(BorderFactory.createEmptyBorder(6, 6, 6, 6));
        } else {
            // Assistant avatar - gray circle with icon
            avatar.setBackground(new Color(232, 232, 232));
            avatar.setForeground(new Color(66, 66, 66));
            avatar.setText("AI");
            avatar.setHorizontalAlignment(SwingConstants.CENTER);
            avatar.setVerticalAlignment(SwingConstants.CENTER);
            avatar.setFont(new Font("Microsoft YaHei", Font.PLAIN, 12));
            avatar.setBorder(BorderFactory.createEmptyBorder(6, 6, 6, 6));
        }

        // Create message bubble - WeChat style with proper sizing
        JTextPane textPane = new JTextPane() {
            @Override
            public Dimension getPreferredSize() {
                // Get the size based on text content
                Dimension size = super.getPreferredSize();
                // Limit width to 400px max, adjust height accordingly
                int maxWidth = 400;
                if (size.width > maxWidth) {
                    // Recalculate size with limited width
                    try {
                        View view = this.getUI().getRootView(this);
                        view.setSize(maxWidth, Integer.MAX_VALUE);
                        float height = view.getPreferredSpan(View.Y_AXIS);
                        if (height > 0) {
                            return new Dimension(maxWidth, (int) height);
                        }
                    } catch (Exception e) {
                        // Fallback to simple calculation
                        return new Dimension(maxWidth, size.height * (size.width / maxWidth + 1));
                    }
                }
                return size;
            }
        };

        textPane.setEditable(false);
        textPane.setContentType("text/html");
        textPane.setFont(new Font("Microsoft YaHei", Font.PLAIN, 14));

        // Convert newlines to HTML breaks
        String htmlContent = message.content.replace("\n", "<br>");
        if (isUser) {
            // User message: no background styling in HTML
            textPane.setText("<html><body style='margin: 0; color: white;'>" + htmlContent + "</body></html>");
        } else {
            // Assistant message: no background styling in HTML
            textPane.setText("<html><body style='margin: 0; color: #111111;'>" + htmlContent + "</body></html>");
        }

        // Ensure the component updates its preferred size
        textPane.revalidate();
        textPane.repaint();

        if (isUser) {
            // User message: WeChat green background, white text, right aligned
            textPane.setOpaque(true);
            textPane.setBackground(new Color(7, 193, 96));
            textPane.setForeground(Color.WHITE);
            textPane.setBorder(BorderFactory.createEmptyBorder(8, 12, 8, 12));
        } else {
            // Assistant message: white background, black text, left aligned
            textPane.setOpaque(true);
            textPane.setBackground(Color.WHITE);
            textPane.setForeground(new Color(17, 17, 17));
            textPane.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(229, 229, 229), 1),
                BorderFactory.createEmptyBorder(7, 11, 7, 11)
            ));
        }

        // Create content panel for avatar and bubble with proper alignment
        JPanel contentPanel = new JPanel();
        contentPanel.setOpaque(false);
        contentPanel.setLayout(new BoxLayout(contentPanel, BoxLayout.X_AXIS));
        contentPanel.setAlignmentY(Component.TOP_ALIGNMENT);

        // Add avatar and bubble in proper order - WeChat style
        if (isUser) {
            // User: text first (left), then avatar (right)
            contentPanel.add(textPane);
            contentPanel.add(Box.createHorizontalStrut(8));
            contentPanel.add(avatar);
            container.add(contentPanel, BorderLayout.EAST);
        } else {
            // Assistant: avatar first (left), then text (right)
            contentPanel.add(avatar);
            contentPanel.add(Box.createHorizontalStrut(8));
            contentPanel.add(textPane);
            container.add(contentPanel, BorderLayout.WEST);
        }

        return container;
    }

    public JComponent getContent() {
        return mainPanel;
    }
    
    public void dispose() {
        // Clean up resources
    }
    
    // Inner classes
    public static class ChatMessage {
        public final MessageRole role;
        public final String content;
        public final long timestamp;
        
        public ChatMessage(MessageRole role, String content) {
            this.role = role;
            this.content = content;
            this.timestamp = System.currentTimeMillis();
        }
        
        public String formattedTime() {
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm");
            return sdf.format(new Date(timestamp));
        }
    }
    
    public enum MessageRole {
        USER,
        ASSISTANT,
        SYSTEM,
        TOOL
    }
}
