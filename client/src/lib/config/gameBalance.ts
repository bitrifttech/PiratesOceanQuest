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
  FORWARD_ACCELERATION: 9,
  BACKWARD_ACCELERATION: 4.5,
  ROTATION_SPEED: 2.0,
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

  // Movement
  MOVEMENT_SPEED: 8,
  CHASE_SPEED_MULTIPLIER: 1.2,
  PATROL_RADIUS: 50,

  // Combat
  ATTACK_RANGE: 60,
  FIRE_INTERVAL_MIN: 3, // seconds
  FIRE_INTERVAL_MAX: 5, // seconds

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
} as const;

// =============================================================================
// VISUAL / PERFORMANCE
// =============================================================================
export const VISUALS = {
  // Clouds
  CLOUD_COUNT: 18,
  CLOUD_PUFFS_MIN: 4,
  CLOUD_PUFFS_MAX: 8,

  // Ocean
  OCEAN_SEGMENTS: 64,
  OCEAN_FRAME_SKIP: 2,

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
