/**
 * Environment-aware logging utility for FiveThirty viewer
 *
 * Usage:
 * - logger.error() - Always logged (production errors)
 * - logger.warn() - Only in development
 * - logger.log() - Only in development
 * - logger.debug() - Only when NEXT_PUBLIC_VERBOSE_LOGGING=true
 * - logger.metric() - Structured logging for metrics/analytics
 */

const isDev = process.env.NODE_ENV === 'development'
const isVerbose = process.env.NEXT_PUBLIC_VERBOSE_LOGGING === 'true'

export const logger = {
  /**
   * Always logged - use for critical errors in production
   */
  error: (...args: any[]) => {
    console.error(...args)
  },

  /**
   * Only logged in development - use for warnings
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Only logged in development - use for general info
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Only logged when explicitly enabled - use for detailed debugging
   */
  debug: (...args: any[]) => {
    if (isDev && isVerbose) {
      console.log('[DEBUG]', ...args)
    }
  },

  /**
   * Structured logging for metrics and analytics
   * In production, this could send to an analytics service
   */
  metric: (event: string, data?: any) => {
    if (isDev) {
      console.log(`[METRIC] ${event}`, data)
    }
    // In production, send to analytics instead:
    // if (typeof window !== 'undefined' && window.analytics) {
    //   window.analytics.track(event, data)
    // }
  },

  /**
   * Group-based logging for collapsible sections (dev only)
   */
  group: (label: string, ...args: any[]) => {
    if (isDev) {
      console.group(label, ...args)
    }
  },

  groupEnd: () => {
    if (isDev) {
      console.groupEnd()
    }
  },
}

export default logger
