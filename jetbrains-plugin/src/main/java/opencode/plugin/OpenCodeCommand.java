/**
 * QOOCODE Command Interface
 * Extension point for adding custom commands
 */

package QOOCODE.plugin;

public interface QOOCODECommand {
    /**
     * Get command name
     */
    String getName();
    
    /**
     * Get command description
     */
    String getDescription();
    
    /**
     * Execute command
     */
    String execute(String[] args);
    
    /**
     * Get usage string
     */
    default String getUsage() {
        return "/" + getName();
    }
    
    /**
     * Get examples
     */
    default String[] getExamples() {
        return new String[0];
    }
}
