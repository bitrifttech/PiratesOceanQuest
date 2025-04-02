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
  // Ship scaling
  PLAYER_SHIP: 1.0, // Base reference (1.0 = 30 meters)
  ENEMY_SHIP: {
    MIN: 0.8,  // Smaller enemy ships
    MAX: 1.1,  // Larger enemy ships
  },
  
  // Island scaling (as multiplier of base ship size)
  ISLAND: {
    TROPICAL: {
      MIN: 2.0,  // Smaller tropical islands
      MAX: 5.0,  // Larger tropical islands
      BASE: 3.0,  // Default size
    },
    MOUNTAIN: {
      MIN: 3.0,  // Smaller mountain islands
      MAX: 8.0,  // Larger mountain islands
      BASE: 5.0,  // Default size
    },
    ROCKS: {
      MIN: 0.5,  // Smaller rock formations
      MAX: 1.5,  // Larger rock formations
      BASE: 1.0,  // Default size
    }
  },
  
  // Projectile scaling
  CANNONBALL: 0.02, // 0.5 BSU
  
  // Decoration and effects scaling
  EFFECTS: {
    FIRE: 0.2,
    SMOKE: 0.3,
    SPLASH: 0.2
  }
};

// Model scaling adjustments (to correct for model-specific scaling issues)
export const MODEL_ADJUSTMENT = {
  SHIP: 24.0,     // Required multiplier to make ship model appropriate size
  TROPICAL: 8.0,  // Multiplier for tropical island models
  MOUNTAIN: 10.0, // Multiplier for mountain island models
  ROCKS: 6.0      // Multiplier for rock formation models
};

// Position constants
export const POSITION = {
  WATER_LEVEL: 0,
  ISLAND: {
    TROPICAL: -8,  // Height adjustment for tropical islands
    MOUNTAIN: -12, // Height adjustment for mountain islands
    ROCKS: -2      // Height adjustment for rock formations
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