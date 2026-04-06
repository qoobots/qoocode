/**
 * qoocode AI Service
 * Handles API calls to LLM providers
 */

package qoocode.plugin;

import com.intellij.openapi.diagnostic.Logger;
import com.intellij.openapi.progress.ProgressIndicator;
import com.intellij.openapi.progress.ProgressManager;
import com.intellij.openapi.progress.Task;
import com.intellij.openapi.project.Project;
import org.jetbrains.annotations.NotNull;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class QooCodeAIService {
    private static final Logger LOG = Logger.getInstance(QooCodeAIService.class);
    private static final int CONNECT_TIMEOUT = 30000;
    private static final int READ_TIMEOUT = 60000;

    private final Project project;
    private final QooCodeConfig config;

    public QooCodeAIService(@NotNull Project project) {
        this.project = project;
        this.config = QooCodeConfig.getInstance();
    }

    /**
     * Send message to AI and get response
     */
    public void sendMessageAsync(String message, List<QooCodeChatPanel.ChatMessage> history, AIServiceCallback callback) {
        ProgressManager.getInstance().run(new Task.Backgroundable(project, "QooCode AI Processing", true) {
            private String response;

            @Override
            public void run(@NotNull ProgressIndicator indicator) {
                indicator.setIndeterminate(true);
                try {
                    response = sendMessage(message, history);
                } catch (Exception e) {
                    LOG.error("AI request failed", e);
                    String errorMsg = e.getMessage();
                    if (errorMsg == null || errorMsg.trim().isEmpty()) {
                        errorMsg = e.getClass().getSimpleName() + ": " + e.toString();
                    }
                    response = "Error: " + errorMsg;
                }
            }

            @Override
            public void onSuccess() {
                callback.onResponse(response);
            }

            @Override
            public void onThrowable(@NotNull Throwable error) {
                LOG.error("AI task failed", error);
                callback.onError(error);
            }
        });
    }

    /**
     * Send message to AI synchronously
     */
    private String sendMessage(String message, List<QooCodeChatPanel.ChatMessage> history) throws Exception {
        LOG.info("Starting AI request with message: " + message);

        if (config == null) {
            LOG.error("Config is null");
            throw new Exception("Configuration not initialized. Please restart the IDE.");
        }

        String apiUrl = config.getApiUrl();
        String apiKey = config.getApiKey();
        String model = config.getModel();

        LOG.info("API URL: " + apiUrl);
        LOG.info("Model: " + model);
        LOG.info("API Key configured: " + (apiKey != null && !apiKey.trim().isEmpty()));

        if (apiUrl == null || apiUrl.trim().isEmpty()) {
            throw new Exception("API URL is not configured. Please set it in Settings > Tools > QooCode");
        }

        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new Exception("API Key is not configured. Please set it in Settings > Tools > QooCode");
        }

        // Prepare request body
        StringBuilder requestBody = new StringBuilder();
        requestBody.append("{");
        requestBody.append("\"model\":\"").append(model).append("\",");
        requestBody.append("\"messages\":[");

        // Add conversation history
        LOG.info("History size: " + (history == null ? "null" : history.size()));
        if (history != null) {
            for (int i = 0; i < history.size(); i++) {
                QooCodeChatPanel.ChatMessage msg = history.get(i);
                LOG.info("History message " + i + ": role=" + msg.role + ", content=" + msg.content);
                if (i > 0) requestBody.append(",");
                requestBody.append("{\"role\":\"").append(msg.role.toString().toLowerCase()).append("\",");
                requestBody.append("\"content\":\"").append(escapeJson(msg.content)).append("\"}");
            }
        }

        // Add current message
        if (history == null || history.isEmpty()) {
            requestBody.append("{\"role\":\"user\",\"content\":\"").append(escapeJson(message)).append("\"}");
        } else {
            requestBody.append(",{\"role\":\"user\",\"content\":\"").append(escapeJson(message)).append("\"}");
        }

        requestBody.append("],");
        requestBody.append("\"max_tokens\":").append(config.getMaxTokens()).append(",");
        requestBody.append("\"temperature\":").append(config.getTemperature());
        requestBody.append("}");

        LOG.info("Request body: " + requestBody.toString());

        // Send HTTP request
        HttpURLConnection connection = null;
        BufferedReader reader = null;
        try {
            URL url = new URL(apiUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + apiKey);
            connection.setConnectTimeout(CONNECT_TIMEOUT);
            connection.setReadTimeout(READ_TIMEOUT);
            connection.setDoOutput(true);

            // Send request
            try (OutputStream os = connection.getOutputStream()) {
                byte[] input = requestBody.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            // Read response
            int responseCode = connection.getResponseCode();
            LOG.info("Response code: " + responseCode);

            java.io.InputStream inputStream;
            if (responseCode >= 200 && responseCode < 300) {
                inputStream = connection.getInputStream();
            } else {
                inputStream = connection.getErrorStream();
            }

            if (inputStream == null) {
                throw new Exception("No response body received. Response code: " + responseCode);
            }

            reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }

            LOG.info("Response: " + response.toString());

            if (responseCode >= 200 && responseCode < 300) {
                return parseResponse(response.toString());
            } else {
                throw new Exception("API request failed with status " + responseCode + ": " + response);
            }
        } catch (Exception e) {
            LOG.error("Error in sendMessage", e);
            throw e;
        } finally {
            if (reader != null) {
                try {
                    reader.close();
                } catch (Exception e) {
                    LOG.error("Error closing reader", e);
                }
            }
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    /**
     * Parse API response to extract the AI message
     */
    private String parseResponse(String jsonResponse) throws Exception {
        // Simple JSON parsing to extract content
        // Look for "content" field in the response
        try {
            int contentIndex = jsonResponse.indexOf("\"content\"");
            if (contentIndex == -1) {
                return jsonResponse;
            }

            int colonIndex = jsonResponse.indexOf(":", contentIndex);
            int startIndex = jsonResponse.indexOf("\"", colonIndex) + 1;
            int endIndex = startIndex;

            // Find matching closing quote (handling escaped quotes)
            boolean escaped = false;
            for (; endIndex < jsonResponse.length(); endIndex++) {
                char c = jsonResponse.charAt(endIndex);
                if (c == '\\' && !escaped) {
                    escaped = true;
                } else if (c == '"' && !escaped) {
                    break;
                } else {
                    escaped = false;
                }
            }

            String content = jsonResponse.substring(startIndex, endIndex);
            // Unescape JSON
            content = content.replace("\\n", "\n")
                           .replace("\\\"", "\"")
                           .replace("\\\\", "\\");
            return content;
        } catch (Exception e) {
            LOG.error("Failed to parse AI response", e);
            throw new Exception("Failed to parse AI response: " + e.getMessage());
        }
    }

    /**
     * Escape string for JSON
     */
    private String escapeJson(String text) {
        return text.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }

    public interface AIServiceCallback {
        void onResponse(String response);
        void onError(Throwable error);
    }
}
