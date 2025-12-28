/**
 * Debug logger utility that respects environment settings
 * Only logs in development mode when debug is enabled
 */

// Check if we're in development mode
const isDev = import.meta.env.DEV;

// Debug categories that can be toggled
export type LogCategory = 
  | 'ship'
  | 'enemy'
  | 'collision'
  | 'cannonball'
  | 'powerup'
  | 'audio'
  | 'game'
  | 'environment'
  | 'model';

// Enable/disable specific categories (all disabled by default for clean console)
const enabledCategories: Set<LogCategory> = new Set([
  // Uncomment categories to enable logging:
  // 'ship',
  // 'enemy',
  // 'collision',
  // 'cannonball',
  // 'powerup',
  // 'audio',
  // 'game',
  // 'environment',
  // 'model',
]);

// Master debug switch (set to false to disable all debug logging)
const DEBUG_ENABLED = false;

/**
 * Conditional debug logger
 * Only logs if in dev mode, debug is enabled, and category is enabled
 */
export const logger = {
  debug: (category: LogCategory, message: string, ...args: unknown[]): void => {
    if (isDev && DEBUG_ENABLED && enabledCategories.has(category)) {
      console.log(`[${category.toUpperCase()}] ${message}`, ...args);
    }
  },

  warn: (category: LogCategory, message: string, ...args: unknown[]): void => {
    if (isDev && DEBUG_ENABLED && enabledCategories.has(category)) {
      console.warn(`[${category.toUpperCase()}] ${message}`, ...args);
    }
  },

  error: (category: LogCategory, message: string, ...args: unknown[]): void => {
    // Errors are always logged in dev mode (regardless of category)
    if (isDev) {
      console.error(`[${category.toUpperCase()}] ${message}`, ...args);
    }
  },

  /**
   * Enable a logging category at runtime
   */
  enableCategory: (category: LogCategory): void => {
    enabledCategories.add(category);
  },

  /**
   * Disable a logging category at runtime
   */
  disableCategory: (category: LogCategory): void => {
    enabledCategories.delete(category);
  },

  /**
   * Check if a category is enabled
   */
  isEnabled: (category: LogCategory): boolean => {
    return isDev && DEBUG_ENABLED && enabledCategories.has(category);
  },
};

// Expose logger control to window for debugging in browser console
if (isDev && typeof window !== 'undefined') {
  (window as unknown as { gameLogger: typeof logger }).gameLogger = logger;
}
