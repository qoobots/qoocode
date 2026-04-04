/**
 * qoocode Tool Interface
 * Extension point for adding custom tools
 */

package qoocode.plugin;

import javax.swing.*;

public interface QooCodeTool {
    /**
     * Get tool name
     */
    String getName();
    
    /**
     * Get tool description
     */
    String getDescription();
    
    /**
     * Get tool icon
     */
    Icon getIcon();
    
    /**
     * Execute tool
     */
    void execute(String input);
    
    /**
     * Get categories
     */
    default String[] getCategories() {
        return new String[]{"general"};
    }
    
    /**
     * Is enabled for file type
     */
    default boolean isEnabledFor(String fileExtension) {
        return true;
    }
}
