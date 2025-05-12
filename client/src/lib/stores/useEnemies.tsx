import { create } from "zustand";
import * as THREE from "three";
import { usePlayer } from "./usePlayer";
import { useGameState } from "./useGameState";
import { useUpgrades } from "./useUpgrades";
import { POSITION } from "../constants";

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
    
    // Use standardized position values from constants.ts that we imported at the top
    
    for (let i = 0; i < count; i++) {
      // Generate a random position away from the player
      let spawnX, spawnZ;
      
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
    
    set((state) => ({
      enemies: [...state.enemies, ...newEnemies],
    }));
    
    // Log removed to reduce console spam
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
      // Enemy is destroyed, add loot
      const { addLoot } = useUpgrades.getState();
      const lootAmount = Math.floor(Math.random() * 50) + 50;
      addLoot(lootAmount);
      
      console.log(`[ENEMY] Ship ${id} DESTROYED! Attempting to spawn power-up at position:`, 
        JSON.stringify(enemy.position.toArray()));
      
      // Spawn a power-up prize at the enemy's position
      try {
        // Store the enemy position for debugging
        const enemyPosition = enemy.position.clone();
        
        // Log detailed position info
        console.log('[POWER-UP DEBUG] Attempting to spawn at enemy position:', {
          x: enemyPosition.x,
          y: enemyPosition.y,
          z: enemyPosition.z,
          enemyId: id,
          rawPosition: enemy.position,
          positionIsVector3: enemyPosition instanceof THREE.Vector3,
          positionJSON: JSON.stringify(enemyPosition.toArray())
        });
        
        // Import dynamically to avoid circular dependency
        console.log("[POWER-UP DEBUG] Importing PowerUpSystem...");
        const { PowerUpSystem } = require('../../components/PowerUpManager');
        
        console.log("[POWER-UP DEBUG] PowerUpSystem details:", {
          imported: !!PowerUpSystem,
          spawnAvailable: !!(PowerUpSystem && PowerUpSystem.spawn),
          powerUpSystemObject: JSON.stringify(PowerUpSystem)
        });
        
        if (PowerUpSystem && PowerUpSystem.spawn) {
          // Explicitly log before spawn
          console.log(`[POWER-UP DEBUG] About to call PowerUpSystem.spawn with position: (${enemyPosition.x.toFixed(2)}, ${enemyPosition.y.toFixed(2)}, ${enemyPosition.z.toFixed(2)})`);
          
          // Spawn a random power-up at the enemy's position
          const powerUpId = PowerUpSystem.spawn(enemyPosition);
          
          // Log spawn result
          console.log(`[POWER-UP DEBUG] Spawn result:`, {
            success: !!powerUpId,
            powerUpId: powerUpId,
            position: `(${enemyPosition.x.toFixed(2)}, ${enemyPosition.y.toFixed(2)}, ${enemyPosition.z.toFixed(2)})`
          });
          
          if (powerUpId) {
            console.log(`[POWER-UP] Successfully spawned prize (id: ${powerUpId}) at defeated enemy ship position (${enemyPosition.x.toFixed(1)}, ${enemyPosition.z.toFixed(1)})`);
          } else {
            console.error("[POWER-UP ERROR] Failed to spawn power-up: spawn function returned null");
          }
        } else {
          console.error("[POWER-UP ERROR] PowerUpSystem.spawn function not available", {
            PowerUpSystemExists: !!PowerUpSystem,
            spawnFunctionExists: !!(PowerUpSystem && PowerUpSystem.spawn)
          });
        }
      } catch (error) {
        console.error("[POWER-UP ERROR] Failed to spawn power-up:", error);
        // Log stack trace for better debugging
        console.error("[POWER-UP ERROR] Stack trace:", error instanceof Error ? error.stack : "No stack trace available");
      }
      
      // Log the enemy defeat
      console.log(`[ENEMY] Ship ${id} was destroyed! Added ${lootAmount} loot.`);
      
      // Remove the enemy
      set((state) => ({
        enemies: state.enemies.filter((e) => e.id !== id),
      }));
      
      // Check if all enemies are defeated
      const remainingEnemies = get().enemies.filter((e) => e.id !== id);
      if (remainingEnemies.length === 0) {
        // If all enemies are defeated, set game state to show victory screen
        // This will be handled by the GameUI component
      }
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
      
      // Log removed to reduce console spam
    }
  },
  
  // Reset all enemies (for new game)
  resetEnemies: () => {
    set({ enemies: [] });
    
    // Don't spawn enemies automatically - logging removed
  },
}));
