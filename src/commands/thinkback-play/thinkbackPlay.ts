// Thinkback-play command - Play the thinkback animation
import type { Command } from '../../types/message.js'

/**
 * Thinkback-play - Play the thinkback animation (if available)
 * 
 * This is a companion command to /thinkback that plays the animation
 * showing your coding journey throughout the year.
 */

export const thinkbackPlayCommand: Command = {
  name: 'thinkback-play',
  aliases: ['tbplay'],
  description: 'Play the thinkback animation',
  type: 'local',
  isHidden: true,
  async execute() {
    return `
  Thinkback Animation Player

  The animation feature requires the thinkback plugin to be installed.
  This feature may be available in a future version.

  To use:
  1. Install the thinkback plugin
  2. Run /thinkback to generate your year in review
  3. Run /thinkback-play to view the animation

  Note: This feature may be added in a future version.`
  },
}

export default thinkbackPlayCommand
