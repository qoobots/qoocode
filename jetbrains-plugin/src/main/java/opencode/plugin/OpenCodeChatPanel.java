/**
 * QOOCODE Chat Panel
 * Main chat interface for JetBrains IDE
 */

package QOOCODE.plugin;

import com.intellij.openapi.project.*;
import com.intellij.openapi.ui.*;
import com.intellij.openapi.wm.*;
import com.intellij.ui.*;
import com.intellij.ui.treeStructure.*;
import com.intellij.util.ui.*;
import org.jetbrains.annotations.*;

import javax.swing.*;
import javax.swing.border.*;
import java.awt.*;
import java.awt.event.*;
import java.util.*;
import java.util.List;

public class QOOCODEChatPanel {
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
    
    public QOOCODEChatPanel(@NotNull Project project) {
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
        
        // Input panel
        inputPanel = createInputPanel();
        
        // Tool window panel
        toolWindowPanel = new SimpleToolWindowPanel(true);
    }
    
    private JPanel createHeaderPanel() {
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(new Color(63, 63, 63));
        header.setBorder(BorderFactory.createEmptyBorder(8, 12, 8, 12));
        
        // Title
        JLabel titleLabel = new JLabel("QOOCODE Chat");
        titleLabel.setFont(new Font("SansSerif", Font.BOLD, 14));
        titleLabel.setForeground(Color.WHITE);
        header.add(titleLabel, BorderLayout.WEST);
        
        // Status indicator
        JPanel statusPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT));
        statusPanel.setOpaque(false);
        
        JLabel statusDot = new JLabel("●");
        statusDot.setForeground(new Color(76, 175, 80)); // Green
        statusDot.setToolTipText("Connected");
        
        JLabel statusText = new JLabel("Ready");
        statusText.setForeground(Color.WHITE);
        statusText.setFont(new Font("SansSerif", Font.PLAIN, 11));
        
        statusPanel.add(statusDot);
        statusPanel.add(statusText);
        header.add(statusPanel, BorderLayout.EAST);
        
        return header;
    }
    
    private JPanel createInputPanel() {
        JPanel input = new JPanel(new BorderLayout(4, 4));
        input.setBorder(BorderFactory.createEmptyBorder(8, 8, 8, 8));
        input.setBackground(UIUtil.getPanelBackground());
        
        // Input text area
        inputTextArea = new JTextArea(3, 20);
        inputTextArea.setLineWrap(true);
        inputTextArea.setWrapStyleWord(true);
        inputTextArea.setFont(new Font("SansSerif", Font.PLAIN, 13));
        inputTextArea.setMargin(new Insets(8, 8, 8, 8));
        inputTextArea.setText("");
        inputTextArea.putClientProperty("placeholder.text", "Type your message here...");
        
        JScrollPane inputScroll = ScrollPaneFactory.createScrollPane(inputTextArea);
        inputScroll.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_AS_NEEDED);
        inputScroll.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        
        // Button panel
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 4, 0));
        buttonPanel.setOpaque(false);
        
        clearButton = new JButton("Clear");
        clearButton.setToolTipText("Clear conversation");
        clearButton.addActionListener(e -> clearMessages());
        
        sendButton = new JButton("Send");
        sendButton.setToolTipText("Send message (Ctrl+Enter)");
        sendButton.setPreferredSize(new Dimension(80, 32));
        sendButton.addActionListener(e -> sendMessage());
        
        buttonPanel.add(clearButton);
        buttonPanel.add(sendButton);
        
        input.add(inputScroll, BorderLayout.CENTER);
        input.add(buttonPanel, BorderLayout.SOUTH);
        
        // Ctrl+Enter to send
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
        // Enter key handling
        inputTextArea.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                if (e.getKeyCode() == KeyEvent.VK_ENTER && !e.isShiftDown()) {
                    e.consume();
                    sendMessage();
                }
            }
        });
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
        // Simulate AI response
        SwingUtilities.invokeLater(() -> {
            try {
                Thread.sleep(500);
                
                String response = generateResponse(text);
                addMessage(new ChatMessage(MessageRole.ASSISTANT, response));
                
                // Auto-scroll to bottom
                messagesScrollPane.getVerticalScrollBar().setValue(
                    messagesScrollPane.getVerticalScrollBar().getMaximum()
                );
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
    }
    
    private String generateResponse(String input) {
        // Simple response generation
        if (input.toLowerCase().contains("hello") || input.toLowerCase().contains("hi")) {
            return "Hello! I'm QOOCODE, your AI coding assistant. How can I help you today?";
        }
        if (input.toLowerCase().contains("help")) {
            return "I can help you with:\n" +
                   "- Analyzing and explaining code\n" +
                   "- Generating tests\n" +
                   "- Refactoring code\n" +
                   "- Finding files and symbols\n" +
                   "- Git operations\n" +
                   "- And much more!";
        }
        if (input.toLowerCase().contains("file")) {
            return "I can help you work with files. I can read, create, edit, and delete files in your project.";
        }
        
        return "I've processed your request: \"" + input + "\"\n\n" +
               "I'm here to help with your coding tasks. What would you like to do next?";
    }
    
    public void addMessage(ChatMessage message) {
        messages.add(message);
        
        JPanel messagePanel = createMessagePanel(message);
        messagesPanel.add(messagePanel);
        messagesPanel.add(Box.createVerticalStrut(8));
        
        messagesPanel.revalidate();
        messagesPanel.repaint();
    }
    
    private JPanel createMessagePanel(ChatMessage message) {
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        panel.setOpaque(false);
        
        boolean isUser = message.role == MessageRole.USER;
        
        // Message bubble
        JTextArea textArea = new JTextArea(message.content);
        textArea.setEditable(false);
        textArea.setLineWrap(true);
        textArea.setWrapStyleWord(true);
        textArea.setOpaque(true);
        textArea.setFont(new Font("SansSerif", Font.PLAIN, 13));
        textArea.setBorder(BorderFactory.createEmptyBorder(8, 12, 8, 12));
        
        if (isUser) {
            textArea.setBackground(new Color(0, 120, 212));
            textArea.setForeground(Color.WHITE);
            textArea.setAlignmentX(RIGHT_ALIGNMENT);
        } else {
            textArea.setBackground(new Color(45, 45, 45));
            textArea.setForeground(Color.WHITE);
            textArea.setAlignmentX(LEFT_ALIGNMENT);
        }
        
        // Timestamp
        JLabel timestamp = new JLabel(message.formattedTime);
        timestamp.setFont(new Font("SansSerif", Font.PLAIN, 10));
        timestamp.setForeground(Color.GRAY);
        timestamp.setAlignmentX(isUser ? RIGHT_ALIGNMENT : LEFT_ALIGNMENT);
        
        panel.add(textArea);
        panel.add(timestamp);
        
        return panel;
    }
    
    public void clearMessages() {
        messages.clear();
        messagesPanel.removeAll();
        messagesPanel.revalidate();
        messagesPanel.repaint();
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
