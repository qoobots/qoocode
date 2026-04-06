/**
 * qoocode Kotlin Tool Window
 */

package qoocode.plugin

import com.intellij.openapi.project.*
import com.intellij.openapi.ui.*
import javax.swing.*

/**
 * Kotlin-focused tool window content
 */
class QooCodeKotlinToolWindow(project: Project) {
    private val mainPanel: SimpleToolWindowPanel
    private val content = JLabel("QooCode Kotlin Tool Window")

    init {
        mainPanel = SimpleToolWindowPanel(true)
        mainPanel.setContent(content)
    }

    fun getContent(): JComponent = mainPanel

    fun refresh() {
        // Refresh content
    }
}
