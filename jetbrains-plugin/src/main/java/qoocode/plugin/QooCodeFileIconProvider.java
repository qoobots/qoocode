/**
 * qoocode File Icon Provider
 */

package qoocode.plugin;

import com.intellij.openapi.project.*;
import com.intellij.openapi.vfs.*;
import com.intellij.psi.*;
import com.intellij.util.*;
import org.jetbrains.annotations.*;

import javax.swing.*;

public class QooCodeFileIconProvider implements FileIconProvider {
    @Override
    public Icon getIcon(@NotNull VirtualFile file, 
                        int flags, 
                        @Nullable Project project) {
        // Could provide custom icons for qoocode-related files
        // For now, return null to use default icons
        return null;
    }
}
