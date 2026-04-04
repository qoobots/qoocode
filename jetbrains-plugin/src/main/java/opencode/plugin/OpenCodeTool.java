/**
 * QOOCODE Tool Interface
 * Extension point for adding custom tools
 */

package QOOCODE.plugin;

import javax.swing.*;

public interface QOOCODETool {
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
