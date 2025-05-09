/**
 * Game Scaling System
 * ------------------
 * This file defines the standard scale metrics for all game objects
 * 
 * Base Scale Unit (BSU): 1 BSU = 1 meter in game world
 * Reference: Player ship is approximately 30 BSU (30 meters) in length
 */

// Base scaling factors for different object types
export const SCALE = {
  // Ship scaling - standardized sizes
  PLAYER_SHIP: 1.0, // Base reference (1.0 = standard size)
  // Enemy ship scaling removed
  
  // Island scaling (as multiplier of base ship size) - increased to be notably larger than ships
  ISLAND: {
    TROPICAL: {
      MIN: 5.0,   // Smaller tropical islands - much larger than ships
      MAX: 8.0,   // Larger tropical islands
      BASE: 6.0,  // Default size - substantially larger than before
    },
    MOUNTAIN: {
      MIN: 6.0,   // Smaller mountain islands - larger than tropical
      MAX: 10.0,  // Larger mountain islands
      BASE: 8.0,  // Default size
    },
    ROCKS: {
      MIN: 8.0,   // Smaller rock formations - largest environmental features
      MAX: 12.0,  // Larger rock formations
      BASE: 10.0, // Default size - significantly larger than before
    }
  },
  
  // Weapon scaling
  CANNON: 0.05,    // Cannon size (relative to BSU)
  CANNONBALL: 0.02, // Cannonball size (0.5 BSU)
  
  // Decoration and effects scaling
  EFFECTS: {
    FIRE: 0.2,
    SMOKE: 0.3,
    SPLASH: 0.2,
    TRAIL: 0.18,
    TRAIL_LENGTH: 0.25,
    POSITION_OFFSET: 1.5
  }
};

// Model scaling adjustments (to correct for model-specific scaling issues)
export const MODEL_ADJUSTMENT = {
  SHIP: 1.5,      // Standardized multiplier for all ship models
  TROPICAL: 4.0,  // Multiplier for tropical island models
  MOUNTAIN: 8.0,  // Multiplier for mountain island models
  ROCKS: 3.0,     // Multiplier for rock formation models
  CANNON: 20.0,   // Multiplier for cannon models
  CANNONBALL: 15.0 // Multiplier for cannonball models
};

// UNIVERSAL STATIC VALUES - These should never change during gameplay
export const STATIC = {
  WATER_LEVEL: 0, // The absolute reference point for all heights
  SHIP_OFFSET: 1.5 // Height of ship above water level
};

// Position constants - all relative to STATIC.WATER_LEVEL
export const POSITION = {
  WATER_LEVEL: STATIC.WATER_LEVEL, // Reference water level (always static)
  SHIP_HEIGHT: STATIC.WATER_LEVEL + STATIC.SHIP_OFFSET, // Ship position = water level + offset
  ISLAND: {
    TROPICAL: STATIC.WATER_LEVEL + 5.0,  // Height adjustment for tropical islands
    MOUNTAIN: STATIC.WATER_LEVEL + 8.0,  // Height adjustment for mountain islands
    ROCKS: STATIC.WATER_LEVEL + 6.0      // Height adjustment for rock formations
  }
};

// Game world size constants
export const WORLD = {
  SIZE: 500,      // World boundary size (square)
  ISLAND_COUNT: {
    TROPICAL: 6,  // Number of tropical islands to generate
    MOUNTAIN: 4,  // Number of mountain islands to generate
    ROCKS: 8      // Number of rock formations to generate
  }
};