/**
 * qoocode Terminal Panel
 * Embeds qoocode CLI terminal interface in JetBrains IDE
 */

package qoocode.plugin;

import com.intellij.execution.ExecutionException;
import com.intellij.execution.configurations.GeneralCommandLine;
import com.intellij.execution.process.*;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.util.Key;
import com.intellij.ui.components.JBScrollPane;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import javax.swing.text.*;
import java.awt.*;
import java.awt.event.KeyAdapter;
import java.awt.event.KeyEvent;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Terminal panel that embeds qoocode CLI in the IDE
 */
public class QooCodeTerminalPanel implements Disposable {
    private static final Logger LOG = Logger.getInstance(QooCodeTerminalPanel.class);

    private final Project project;
    private JTextPane outputPane;
    private JTextField inputField;
    private ProcessHandler processHandler;
    private final AtomicBoolean isRunning = new AtomicBoolean(false);
    private String qoocodeExecutablePath;

    public QooCodeTerminalPanel(@NotNull Project project) {
        this.project = project;
        startQoocode();
    }

    /**
     * Start qoocode CLI
     */
    private void startQoocode() {
        if (isRunning.get()) {
            LOG.info("QooCode is already running");
            return;
        }

        try {
            // Find qoocode executable
            try {
                qoocodeExecutablePath = findQoocodeExecutable();
            } catch (IOException e) {
                throw new ExecutionException("Cannot find qoocode executable", e);
            }
            LOG.info("Found qoocode at: " + qoocodeExecutablePath);

            // Get API configuration
            QooCodeConfig config = QooCodeConfig.getInstance();
            if (config.getApiKey() == null || config.getApiKey().isEmpty()) {
                throw new ExecutionException("API Key not configured. Please configure it in Settings > Tools > QooCode");
            }

            // Show startup message
            appendOutput("🚀 QooCode AI 助手已启动 (非交互模式)\n");
            appendOutput("💡 模型: " + (config.getModel() != null ? config.getModel() : "deepseek-chat") + "\n");
            appendOutput("📝 输入问题后按回车，AI 将逐个回答您的问题\n");
            appendOutput("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

            isRunning.set(true);
            LOG.info("QooCode started successfully (non-interactive mode)");

        } catch (ExecutionException e) {
            LOG.error("Failed to start qoocode", e);
            showError("无法启动 qoocode: " + e.getMessage());
        }
    }

    /**
     * Send input to qoocode process
     */
    private void sendInput() {
        String input = inputField.getText();
        if (input.isEmpty()) {
            return;
        }

        // Display user input
        appendOutput("\n> " + input + "\n");
        inputField.setText("");
        appendOutput("🤔 正在思考...\n");

        // Run qoocode in non-interactive mode
        new Thread(() -> {
            try {
                // Build command
                GeneralCommandLine commandLine = new GeneralCommandLine();
                commandLine.setExePath(qoocodeExecutablePath);

                // Set working directory to project base path
                String workDir = project.getBasePath();
                commandLine.setWorkDirectory(workDir);

                // Set environment variables for proper encoding
                java.util.Map<String, String> env = commandLine.getEnvironment();
                env.put("NODE_OPTIONS", "--max-old-space-size=4096");

                // Log working directory
                LOG.info("Working directory: " + workDir);

                // Add API configuration
                QooCodeConfig config = QooCodeConfig.getInstance();
                if (config.getApiKey() != null && !config.getApiKey().isEmpty()) {
                    commandLine.addParameters("--api-key", config.getApiKey());
                }
                if (config.getApiUrl() != null && !config.getApiUrl().isEmpty()) {
                    // Clean up API URL: remove /chat/completions suffix if present
                    String apiUrl = config.getApiUrl();
                    if (apiUrl.contains("/chat/completions")) {
                        apiUrl = apiUrl.replace("/chat/completions", "");
                        LOG.info("Auto-corrected API URL by removing /chat/completions suffix");
                    }
                    commandLine.addParameters("--base-url", apiUrl);
                }
                if (config.getModel() != null && !config.getModel().isEmpty()) {
                    commandLine.addParameters("--model", config.getModel());
                }

                // Add prompt for non-interactive mode
                commandLine.addParameters("--prompt", input);

                // Add verbose flag for debugging
                commandLine.addParameters("--verbose");

                // Log command for debugging
                String commandStr = commandLine.getCommandLineString();
                LOG.info("Executing qoocode command: " + commandStr);
                appendOutput("\n[命令] " + qoocodeExecutablePath + " --prompt \"" + input + "\"\n");

                // Create and start process with character set
                processHandler = new OSProcessHandler(commandLine);
                processHandler.addProcessListener(new ProcessAdapter() {
                    @Override
                    public void onTextAvailable(@NotNull ProcessEvent event, @NotNull Key outputType) {
                        String text = event.getText();
                        if (!text.isEmpty()) {
                            // Log all output for debugging
                            LOG.info("Process output [" + outputType + "]: " + text.trim());
                            appendOutput(text);
                        }
                    }

                    @Override
                    public void processTerminated(@NotNull ProcessEvent event) {
                        int exitCode = event.getExitCode();
                        LOG.info("Process terminated with exit code: " + exitCode);
                        if (exitCode != 0) {
                            appendOutput("\n❌ 进程异常退出，退出码: " + exitCode + "\n");
                            appendOutput("💡 提示: 如果问题持续，请尝试在插件设置中重新启动 QooCode\n");
                        } else {
                            appendOutput("\n✅ 任务完成\n");
                        }
                        appendOutput("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");
                    }

                    @Override
                    public void startNotified(@NotNull ProcessEvent event) {
                        LOG.info("Process started successfully");
                        appendOutput("📡 已启动进程...\n");
                    }
                });

                // Start the process
                processHandler.startNotify();

                // Wait for process to complete
                processHandler.waitFor();

            } catch (Exception e) {
                LOG.error("Failed to run qoocode command", e);
                appendOutput("❌ 错误: " + e.getMessage() + "\n");
                appendOutput("💡 详细日志请查看 IDE 的 Help > Show Log in Explorer\n");
            }
        }).start();
    }

    /**
     * Append text to output pane
     */
    private void appendOutput(String text) {
        SwingUtilities.invokeLater(() -> {
            StyledDocument doc = outputPane.getStyledDocument();

            try {
                // Remove ANSI codes for now (simplified)
                String cleanText = text.replaceAll("\u001B\\[[0-9;]*m", "");

                doc.insertString(doc.getLength(), cleanText, doc.getStyle("regular"));

                // Auto-scroll to bottom
                outputPane.setCaretPosition(doc.getLength());
            } catch (BadLocationException e) {
                LOG.error("Failed to append output", e);
            }
        });
    }

    /**
     * Restart qoocode
     */
    public void restartQoocode() {
        stopQoocode();
        // Wait a bit for cleanup
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Clear output
        SwingUtilities.invokeLater(() -> {
            outputPane.setText("");
        });

        startQoocode();
    }

    /**
     * Stop qoocode process
     */
    public void stopQoocode() {
        if (processHandler != null && !processHandler.isProcessTerminated()) {
            LOG.info("Stopping qoocode process");
            processHandler.destroyProcess();
            isRunning.set(false);
        }
    }

    /**
     * Find qoocode executable in various locations
     */
    private String findQoocodeExecutable() throws IOException {
        // 1. Try to extract qoocode.exe from JAR resources
        try {
            String extractedPath = extractQoocodeFromJar();
            if (extractedPath != null) {
                LOG.info("Using qoocode.exe extracted from JAR: " + extractedPath);
                return extractedPath;
            }
        } catch (Exception e) {
            LOG.warn("Failed to extract qoocode.exe from JAR: " + e.getMessage());
        }

        String[] possiblePaths = {
            // 2. Parent directory (when running from jetbrains-plugin folder)
            new File(System.getProperty("user.dir")).getParent() + File.separator + "qoocode.exe",

            // 3. Project root directory (development mode)
            System.getProperty("user.dir") + File.separator + "qoocode.exe",

            // 4. User home directory
            System.getProperty("user.home") + File.separator + ".qoocode" + File.separator + "bin" + File.separator + "qoocode.exe",

            // 5. User local AppData (Windows)
            System.getenv("LOCALAPPDATA") != null
                ? System.getenv("LOCALAPPDATA") + File.separator + "qoocode" + File.separator + "bin" + File.separator + "qoocode.exe"
                : null,

            // 6. System PATH
            "qoocode.exe",
            "qoocode"
        };

        // Add logging for all searched paths
        StringBuilder searchedPaths = new StringBuilder("查找 qoocode 可执行文件：\n");

        for (String path : possiblePaths) {
            if (path != null) {
                File file = new File(path);
                String absolutePath = file.getAbsolutePath();

                // On Windows, canExecute() may not work reliably, just check existence
                if (file.exists() && file.isFile()) {
                    LOG.info("Found qoocode executable at: " + absolutePath);
                    return absolutePath;
                }

                searchedPaths.append("  - ").append(absolutePath)
                          .append(" [").append(file.exists() ? "存在" : "不存在").append("]\n");
            }
        }

        String errorMsg = "找不到 qoocode 可执行文件。\n" +
                       "请确保已安装 qoocode 或将 qoocode.exe 放在项目根目录。\n" +
                       "如果之前使用过插件但出现问题，请尝试清理缓存后重新启动。\n\n" +
                       searchedPaths.toString();

        LOG.error(errorMsg);
        throw new IOException(errorMsg);
    }

    /**
     * Extract qoocode.exe from JAR resources to a temporary file
     */
    private String extractQoocodeFromJar() throws IOException {
        // Try to find qoocode.exe in JAR resources
        String resourcePath = "/bin/qoocode.exe";
        URL resource = getClass().getResource(resourcePath);

        if (resource == null) {
            LOG.info("qoocode.exe not found in JAR resources at " + resourcePath);
            return null;
        }

        LOG.info("Found qoocode.exe in JAR resources, extracting...");

        // Create a cache directory in user's temp directory
        String cacheDir = System.getProperty("java.io.tmpdir") + File.separator + "qoocode-plugin";
        File cacheDirFile = new File(cacheDir);
        if (!cacheDirFile.exists()) {
            cacheDirFile.mkdirs();
        }

        // Determine target file path
        String targetPath = cacheDir + File.separator + "qoocode.exe";
        File targetFile = new File(targetPath);

        // Check if the file already exists and is valid
        if (targetFile.exists()) {
            // Check size of existing file to make sure it's complete
            long existingSize = targetFile.length();
            LOG.info("Cached qoocode.exe exists, size: " + existingSize + " bytes");

            // On Windows, the actual qoocode.exe is about 118MB, use that as a reference
            if (existingSize > 100 * 1024 * 1024) { // > 100MB
                LOG.info("Using cached qoocode.exe");
                return targetPath;
            } else {
                LOG.warn("Cached qoocode.exe size too small (" + existingSize + " bytes), re-extracting");
                targetFile.delete();
            }
        }

        // Extract the file from JAR
        try (InputStream in = getClass().getResourceAsStream(resourcePath)) {
            if (in == null) {
                throw new IOException("Failed to open input stream for " + resourcePath);
            }

            Files.copy(in, targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING);

            LOG.info("Extracted qoocode.exe to: " + targetPath);
            LOG.info("Extracted file size: " + targetFile.length() + " bytes");

            return targetPath;
        }
    }

    /**
     * Send command to qoocode
     */
    public void sendCommand(String command) {
        inputField.setText(command);
        sendInput();
    }

    /**
     * Get panel component
     */
    @Nullable
    public JComponent getComponent() {
        // Create and return the panel
        JPanel mainPanel = new JPanel(new java.awt.BorderLayout(10, 10));
        mainPanel.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));

        // Output pane with styled document
        outputPane = new JTextPane();
        outputPane.setEditable(false);
        outputPane.setBackground(Color.BLACK);
        outputPane.setForeground(new Color(180, 180, 180));
        outputPane.setFont(new Font("Monospaced", Font.PLAIN, 14));
        outputPane.setMargin(new Insets(5, 5, 5, 5));

        // Styled document for colored output
        StyledDocument doc = outputPane.getStyledDocument();
        Style def = StyleContext.getDefaultStyleContext().getStyle(StyleContext.DEFAULT_STYLE);
        Style regular = doc.addStyle("regular", def);
        StyleConstants.setFontFamily(regular, "Monospaced");
        StyleConstants.setFontSize(regular, 14);

        StyleConstants.setForeground(doc.addStyle("green", regular), new Color(0, 200, 0));
        StyleConstants.setForeground(doc.addStyle("yellow", regular), new Color(200, 200, 0));
        StyleConstants.setForeground(doc.addStyle("red", regular), new Color(255, 100, 100));
        StyleConstants.setForeground(doc.addStyle("cyan", regular), new Color(0, 200, 200));

        JScrollPane scrollPane = new JScrollPane(outputPane);
        scrollPane.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);

        // Input field
        inputField = new JTextField();
        inputField.setFont(new Font("Monospaced", Font.PLAIN, 14));
        inputField.setBackground(new Color(20, 20, 20));
        inputField.setForeground(Color.WHITE);
        inputField.setCaretColor(Color.WHITE);
        inputField.setBorder(BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(new Color(100, 100, 100), 1),
            BorderFactory.createEmptyBorder(8, 8, 8, 8)
        ));
        inputField.addActionListener(e -> sendInput());

        // Handle Enter key
        inputField.addKeyListener(new KeyAdapter() {
            @Override
            public void keyPressed(KeyEvent e) {
                if (e.getKeyCode() == KeyEvent.VK_ENTER) {
                    sendInput();
                }
            }
        });

        mainPanel.add(scrollPane, java.awt.BorderLayout.CENTER);
        mainPanel.add(inputField, java.awt.BorderLayout.SOUTH);

        return mainPanel;
    }

    /**
     * Check if qoocode is running
     */
    public boolean isRunning() {
        return isRunning.get();
    }

    /**
     * Get qoocode executable path
     */
    public String getQoocodeExecutablePath() {
        return qoocodeExecutablePath;
    }

    /**
     * Show error message
     */
    private void showError(String message) {
        SwingUtilities.invokeLater(() -> {
            appendOutput("\n[ERROR] " + message + "\n");
        });
    }

    @Override
    public void dispose() {
        stopQoocode();
    }
}
