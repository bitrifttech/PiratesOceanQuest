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
  // Ships - using previous scale values that worked well
  SHIP: {
    BASE: 0.05 * 1.5,      // Player ship base scale (0.05) with MODEL_ADJUSTMENT (1.5)
    ADVANCED: 0.055 * 1.5   // Advanced ship (slightly larger)
  },
  
  // Islands - larger than before for better visibility
  ISLAND: {
    TROPICAL: 0.15 * 4.0,   // Tropical islands with MODEL_ADJUSTMENT (4.0)
    MOUNTAIN: 0.16 * 8.0,   // Mountain islands with MODEL_ADJUSTMENT (8.0)
    ROCKS: 0.12 * 3.0       // Rock formations with MODEL_ADJUSTMENT (3.0)
  },
  
  // Props and Effects
  PROPS: {
    CANNON: 0.05 * 20.0,    // Cannons with adjustment
    CANNONBALL: 0.02 * 15.0 // Cannonballs with adjustment
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

// Height offsets for proper grid alignment - using previous values
export const HEIGHT_OFFSET = {
  SHIP: 1.5,                // Ship floats above water (STATIC.SHIP_OFFSET)
  TROPICAL_ISLAND: 5.0,     // Islands have proper height (from POSITION.ISLAND values)
  MOUNTAIN_ISLAND: 8.0,     // Mountains have larger height offset
  ROCKS: 6.0                // Rocks have medium height offset
};