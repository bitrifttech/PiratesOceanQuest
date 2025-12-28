/**
 * Game Balance Configuration
 * Centralized location for all game balance values and magic numbers.
 * Adjusting these values allows tuning gameplay without code changes.
 */

// =============================================================================
// SHIP PHYSICS
// =============================================================================
export const SHIP_PHYSICS = {
  // Movement
  FORWARD_ACCELERATION: 18, // 2x speed increase
  BACKWARD_ACCELERATION: 9, // 2x speed increase
  ROTATION_SPEED: 4.0, // 2x speed increase
  DRAG: 0.95,

  // Collision
  PLAYER_COLLISION_RADIUS: 4,
  ENEMY_COLLISION_RADIUS: 4,
  SAFETY_MARGIN: 1,

  // Bounds
  WORLD_BOUNDARY: 500,
} as const;

// =============================================================================
// CANNON / WEAPONS
// =============================================================================
export const WEAPONS = {
  // Cannonball
  CANNONBALL_SPEED: 35,
  CANNONBALL_LIFESPAN: 2.5, // seconds
  CANNONBALL_GRAVITY: 9.8,
  CANNONBALL_RADIUS: 0.5,

  // Hit detection
  SHIP_HIT_RADIUS: 3,
  PLAYER_HIT_RADIUS: 4,

  // Damage
  PLAYER_CANNON_DAMAGE: 20,
  ENEMY_CANNON_DAMAGE: 15,
  COLLISION_DAMAGE: 10,

  // Cooldown
  BASE_COOLDOWN: 3, // seconds
  COOLDOWN_REDUCTION_PER_LEVEL: 0.2,
} as const;

// =============================================================================
// PLAYER STATS
// =============================================================================
export const PLAYER = {
  // Health
  BASE_HEALTH: 100,
  HEALTH_PER_HULL_LEVEL: 10,
  
  // Regeneration
  REGEN_INTERVAL: 2, // seconds
  REGEN_AMOUNT: 1,

  // Upgrade multipliers
  DAMAGE_MULTIPLIER_PER_CANNON_LEVEL: 0.2,
} as const;

// =============================================================================
// ENEMY AI
// =============================================================================
export const ENEMY_AI = {
  // Spawn
  SPAWN_DISTANCE_MIN: 70,
  SPAWN_DISTANCE_MAX: 90,
  SPAWN_ATTEMPTS_MAX: 20,
  SPAWN_RADIUS: 12,

  // Movement (used in EnemyShip.tsx)
  MOVEMENT_SPEED: 0.05, // Base speed per frame
  ROTATION_SPEED: 0.01, // Rotation speed per frame
  RETREAT_SPEED_MULTIPLIER: 1.5, // Speed multiplier when retreating
  CIRCLE_SPEED_MULTIPLIER: 0.8, // Speed multiplier when circling
  APPROACH_SPEED_MULTIPLIER: 0.9, // Speed multiplier when approaching

  // Detection ranges
  DETECTION_RANGE: 80, // Distance at which enemy detects player
  CAN_FIRE_RANGE: 30, // Range at which enemy will fire cannons
  OPTIMAL_RANGE: 25, // Ideal distance to maintain from player
  MINIMUM_RANGE: 15, // Minimum distance before retreating

  // Combat
  ATTACK_RANGE: 60,
  FIRE_COOLDOWN_MIN: 5, // seconds
  FIRE_COOLDOWN_MAX: 8, // seconds (5 + 3 random)
  CANNON_SPREAD: 0.2, // Random spread for aiming
  CANNON_HEIGHT: 1.0, // Height at which cannons fire

  // Collision
  COLLISION_COOLDOWN: 1.5, // seconds between collision damage
  WARNING_DISTANCE_MULTIPLIER: 1.5, // Multiplier for collision warning distance
  BOUNCE_FORCE: 2.5, // Force applied when ships collide
  BOUNCE_FACTOR: 0.5, // Factor for environment collision bounce

  // Obstacle Avoidance (pathfinding)
  AVOIDANCE_LOOK_AHEAD: 25, // How far ahead to check for obstacles (units)
  AVOIDANCE_WHISKER_ANGLE: Math.PI / 4, // Angle of side "whisker" rays (45 degrees)
  AVOIDANCE_WHISKER_LENGTH: 15, // Length of side whisker rays
  AVOIDANCE_STRENGTH: 2.0, // How strongly to steer away from obstacles
  AVOIDANCE_CHECK_INTERVAL: 0.1, // Seconds between avoidance checks (performance)
  AVOIDANCE_STEER_SMOOTHING: 0.15, // Smoothing factor for avoidance steering (0-1)
  WANDER_ANGLE_CHANGE: 0.3, // Max angle change per frame when wandering

  // Stats
  BASE_HEALTH: 100,
} as const;

// =============================================================================
// POWER-UPS
// =============================================================================
export const POWER_UPS = {
  // Collection
  COLLECTION_RADIUS: 5,
  LIFETIME: 30, // seconds before despawn

  // Health boost
  HEALTH_BOOST_AMOUNT: 30,
  
  // Speed boost
  SPEED_BOOST_MULTIPLIER: 1.5,
  SPEED_BOOST_DURATION: 20, // seconds

  // Double damage
  DOUBLE_DAMAGE_MULTIPLIER: 2.0,
  DOUBLE_DAMAGE_SHOTS: 10,

  // Rapid fire
  RAPID_FIRE_REDUCTION: 0.3, // 70% cooldown reduction
  RAPID_FIRE_DURATION: 15, // seconds

  // Shield
  SHIELD_DAMAGE_REDUCTION: 0.5,
  SHIELD_DURATION: 30, // seconds

  // Triple shot
  TRIPLE_SHOT_COUNT: 3,
  TRIPLE_SHOT_SHOTS: 5,

  // Long range
  LONG_RANGE_MULTIPLIER: 2.0,
  LONG_RANGE_DURATION: 15, // seconds

  // Gold bonus
  GOLD_BONUS_AMOUNT: 100,
} as const;

// =============================================================================
// LOOT / ECONOMY
// =============================================================================
export const ECONOMY = {
  // Enemy loot
  LOOT_MIN: 50,
  LOOT_MAX: 100,

  // Upgrade costs
  HULL_UPGRADE_BASE_COST: 100,
  CANNON_UPGRADE_BASE_COST: 150,
  SPEED_UPGRADE_BASE_COST: 125,
  COST_MULTIPLIER_PER_LEVEL: 1.5,
} as const;

// =============================================================================
// ENVIRONMENT
// =============================================================================
export const ENVIRONMENT = {
  // Spawn protection
  PLAYER_SPAWN_PROTECTION_RADIUS: 30,

  // Feature placement
  FEATURE_MARGIN: 5, // minimum distance between features
  
  // Arena (central area)
  ARENA_RADIUS: 80,
  ARENA_ROCKS_COUNT: 6,

  // World bounds
  WORLD_RADIUS: 400,

  // Collision margin added to all feature collision checks
  // Reduced since we now only consider above-water portions
  COLLISION_MARGIN: 1,
} as const;

// =============================================================================
// FEATURE COLLISION RADII
// Base collision radii for each environment feature type.
// These are multiplied by the feature's scale to get the actual collision radius.
// IMPORTANT: These values represent only the ABOVE-WATER portion of islands.
// The underwater portions have been subtracted to prevent ships from colliding
// with submerged geometry.
// =============================================================================
export const FEATURE_COLLISION_RADII: Record<string, number> = {
  tropical: 3,    // Reduced from 6 - much of the base is underwater
  mountain: 4,    // Reduced from 8 - large underwater base
  rocks: 2,       // Reduced from 4 - rocks are partially submerged
  shipwreck: 2,   // Reduced from 5 - mostly underwater
  port: 4,        // Reduced from 5 - docks extend into water
  lighthouse: 3,  // Reduced from 4 - sits on rocks
  volcanic: 4,    // Reduced from 7 - large underwater base
  atoll: 3,       // Reduced from 6 - atoll is mostly at water level
  ice: 3,         // Reduced from 5 - ice extends underwater
} as const;

// Default collision radius for unknown feature types
export const DEFAULT_FEATURE_RADIUS = 3;

// =============================================================================
// VISUAL / PERFORMANCE
// =============================================================================
export const VISUALS = {
  // Clouds
  CLOUD_COUNT: 18,
  CLOUD_PUFFS_MIN: 4,
  CLOUD_PUFFS_MAX: 8,

  // Ocean / Water (By The Lee implementation - see Ocean.tsx)
  // Note: Water appearance is now controlled by the shader and normal map texture
  // These constants are kept for compatibility but are not used by the new water shader
  OCEAN_SEGMENTS: 1, // Flat plane - all wave detail in shader
  WATER_WAVE_HEIGHT: 0.8, // Not used
  WATER_WAVE_SPEED: 0.6, // Not used
  WATER_SHALLOW_COLOR: '#4A9FD8', // Not used
  WATER_MID_COLOR: '#2B7FBF', // Not used
  WATER_DEEP_COLOR: '#1A5F8F', // Not used
  WATER_TRANSPARENCY: 0.85, // Not used
  WATER_METALNESS: 0.1, // Not used
  WATER_ROUGHNESS: 0.1, // Not used

  // Shadows
  SHADOW_MAP_SIZE: 1024,

  // Effects
  SPLASH_PARTICLE_COUNT: 12,
  EXPLOSION_PARTICLE_COUNT: 10,
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export type ShipPhysicsConfig = typeof SHIP_PHYSICS;
export type WeaponsConfig = typeof WEAPONS;
export type PlayerConfig = typeof PLAYER;
export type EnemyAIConfig = typeof ENEMY_AI;
export type PowerUpsConfig = typeof POWER_UPS;
export type EconomyConfig = typeof ECONOMY;
export type EnvironmentConfig = typeof ENVIRONMENT;
export type VisualsConfig = typeof VISUALS;
