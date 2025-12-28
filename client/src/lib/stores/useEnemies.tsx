import { create } from "zustand";
import * as THREE from "three";
import { usePlayer } from "./usePlayer";
import { useUpgrades } from "./useUpgrades";
import { usePowerUps } from "./usePowerUps";
import { useGameState, MISSION_CONFIG } from "./useGameState";
import { collisionHandler } from "../services/CollisionHandler";
import { EnvironmentGenerator } from "../services/EnvironmentGenerator";
import { logger } from "../utils/logger";

interface Enemy {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  peacefulStartTimer?: number; // Optional timer for grace period before attacking
}

interface EnemiesState {
  enemies: Enemy[];
  spawnEnemies: (count: number) => void;
  moveEnemy: (id: string, position: THREE.Vector3, rotation: THREE.Euler) => void;
  damageEnemy: (id: string, amount: number) => void;
  resetEnemies: () => void;
}

export const useEnemies = create<EnemiesState>((set, get) => ({
  enemies: [],
  
  // Spawn new enemies
  spawnEnemies: (count) => {
    const newEnemies: Enemy[] = [];
    
    // Get player position to ensure enemies don't spawn too close
    const playerPosition = usePlayer.getState().position;
    
    // Get environment features for spawn validation
    const environmentFeatures = collisionHandler.getFeatures();
    const enemyShipRadius = 12; // Ship collision radius
    
    for (let i = 0; i < count; i++) {
      // Generate a random position away from the player
      let spawnX = 0, spawnZ = 0;
      let positionIsValid = false;
      let attempts = 0;
      const maxAttempts = 20;
      
      // Try to find a valid spawn position that doesn't overlap with islands
      while (!positionIsValid && attempts < maxAttempts) {
        attempts++;
        
        if (playerPosition) {
          // Ensure enemies spawn in view of the player, but at a safe distance
          // Spawn between 70-90 units away from player in a random direction
          const angle = Math.random() * Math.PI * 2;
          const distance = 70 + Math.random() * 20;
          
          spawnX = playerPosition.x + Math.sin(angle) * distance;
          spawnZ = playerPosition.z + Math.cos(angle) * distance;
        } else {
          // Fallback if player position not available
          spawnX = (Math.random() * 200) - 100;
          spawnZ = (Math.random() * 200) - 100;
        }
        
        // Check if this position is safe (not inside an island)
        positionIsValid = EnvironmentGenerator.isPositionSafe(
          spawnX, 
          spawnZ, 
          enemyShipRadius, 
          environmentFeatures
        );
      }
      
      // Only spawn if we found a valid position
      if (positionIsValid) {
        const enemy: Enemy = {
          id: `enemy-${Date.now()}-${i}`,
          // Use Y position of 0 - the CustomModel component will handle the proper height offset
          position: new THREE.Vector3(spawnX, 0, spawnZ),
          // Make enemy ships face the player initially
          rotation: playerPosition ? 
            new THREE.Euler(0, Math.atan2(playerPosition.x - spawnX, playerPosition.z - spawnZ), 0) :
            new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
          velocity: new THREE.Vector3(0, 0, 0),
          health: 100,
          maxHealth: 100,
        };
        
        newEnemies.push(enemy);
      }
    }
    
    set((state) => ({
      enemies: [...state.enemies, ...newEnemies],
    }));
  },
  
  // Move an enemy
  moveEnemy: (id, position, rotation) => {
    set((state) => ({
      enemies: state.enemies.map((enemy) => {
        if (enemy.id === id) {
          return {
            ...enemy,
            position,
            rotation,
          };
        }
        return enemy;
      }),
    }));
  },
  
  // Damage an enemy
  damageEnemy: (id, amount) => {
    const { enemies } = get();
    const enemy = enemies.find((e) => e.id === id);
    
    if (!enemy) return;
    
    // Apply damage multiplier based on cannon upgrade level
    const { cannonLevel } = useUpgrades.getState();
    const damageMultiplier = 1 + (cannonLevel * 0.2); // 20% more damage per level
    const scaledDamage = amount * damageMultiplier;
    
    const newHealth = Math.max(0, enemy.health - scaledDamage);
    
    if (newHealth <= 0) {
      // Enemy is destroyed
      logger.debug('enemy', `Ship ${id} destroyed`);
      
      // Track kill and add gold (mission system)
      const { incrementKills, addGold } = useGameState.getState();
      incrementKills();
      addGold(MISSION_CONFIG.GOLD_PER_KILL);
      
      // Add loot to player (upgrade system)
      const { addLoot } = useUpgrades.getState();
      const lootAmount = Math.floor(Math.random() * 50) + 50;
      addLoot(lootAmount);
      
      // Spawn power-up at enemy position (handled by usePowerUps now)
      try {
        const { spawnWorldPowerUp } = usePowerUps.getState();
        spawnWorldPowerUp(enemy.position);
      } catch (error) {
        logger.error('enemy', 'Failed to spawn power-up:', error);
      }
      
      // Remove the enemy
      set((state) => ({
        enemies: state.enemies.filter((e) => e.id !== id),
      }));
    } else {
      // Update enemy health
      set((state) => ({
        enemies: state.enemies.map((e) => {
          if (e.id === id) {
            return {
              ...e,
              health: newHealth,
            };
          }
          return e;
        }),
      }));
    }
  },
  
  // Reset all enemies (for new game)
  resetEnemies: () => {
    set({ enemies: [] });
    
    // Also clear world power-ups
    try {
      const { clearWorldPowerUps } = usePowerUps.getState();
      clearWorldPowerUps();
    } catch (error) {
      logger.error('enemy', 'Failed to clear world power-ups:', error);
    }
  },
}));
