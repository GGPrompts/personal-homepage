/**
 * Shared AI utility functions
 *
 * These utilities are used across AI components for common operations
 * like avatar/emoji detection.
 */

/**
 * Check if a string is an emoji (simple heuristic)
 *
 * @param str - The string to check
 * @returns true if the string appears to be an emoji
 */
export function isEmoji(str: string): boolean {
  const emojiRegex = /^[\p{Emoji}\u200d]+$/u
  return emojiRegex.test(str) && str.length <= 8
}

/**
 * Check if a string is a URL or path (for avatar rendering)
 *
 * Handles:
 * - Absolute paths (e.g., '/avatars/bot.png' - served by Next.js from public/)
 * - Full URLs (e.g., 'https://example.com/avatar.png')
 *
 * @param str - The string to check
 * @returns true if the string is a URL or path
 */
export function isAvatarUrl(str: string): boolean {
  // Check for absolute paths (served by Next.js from public/)
  if (str.startsWith('/')) return true
  // Check for full URLs
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}
