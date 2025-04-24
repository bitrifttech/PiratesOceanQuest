/**
 * Unified Model Scale System
 * 
 * This system establishes a consistent scale for all 3D models in the game.
 * The player ship is defined as 1 unit (equal to 1 grid square = 10 world units),
 * and all other models are scaled relative to this reference size.
 */

// Grid unit constants
export const GRID = {
  CELL_SIZE: 10,           // Size of a single grid cell in world units
  REFERENCE_UNIT: 10       // One grid square (ship reference length)
};

// Base model scales - these are the raw scale factors needed to make models the correct size
// Use these when instantiating models directly
export const BASE_SCALE = {
  // Ships
  SHIP: {
    BASE: 0.02,            // Player ship base scale (makes ship length = 1 grid square)
    ADVANCED: 0.023        // Advanced ship (slightly larger)
  },
  
  // Islands
  ISLAND: {
    TROPICAL: 0.06,        // Tropical islands (about 3x ship length)
    MOUNTAIN: 0.08,        // Mountain islands (about 4x ship length)
    ROCKS: 0.04            // Rock formations (about 2x ship length)
  },
  
  // Props and Effects
  PROPS: {
    CANNON: 0.02,          // Cannons
    CANNONBALL: 0.01       // Cannonballs
  }
};

// Relative size multipliers - these express the size relationships between models
// Use these for gameplay calculations, collision detection, etc.
export const RELATIVE_SIZE = {
  // Size relative to player ship (ship = 1.0)
  SHIP: 1.0,               // Player ship is the reference (1 unit)
  TROPICAL_ISLAND: 3.0,    // Tropical islands are 3x ship size
  MOUNTAIN_ISLAND: 4.0,    // Mountains are 4x ship size
  ROCKS: 2.0,              // Rock formations are 2x ship size
  CANNON: 0.2,             // Cannons are 0.2x ship size
  CANNONBALL: 0.1          // Cannonballs are 0.1x ship size
};

// Height offsets for proper grid alignment
export const HEIGHT_OFFSET = {
  SHIP: 0.2,               // Ship floats slightly above water
  TROPICAL_ISLAND: 0.0,    // Islands sit directly on water level
  MOUNTAIN_ISLAND: 0.0,    // Mountains sit directly on water level
  ROCKS: 0.0               // Rocks sit directly on water level
};