/**
 * qoocode Command Interface
 * Extension point for adding custom commands
 */

package qoocode.plugin;

public interface QooCodeCommand {
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
