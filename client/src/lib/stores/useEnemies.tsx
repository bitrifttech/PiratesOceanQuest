import { create } from "zustand";
import * as THREE from "three";
import { usePlayer } from "./usePlayer";
import { useGameState } from "./useGameState";
import { useUpgrades } from "./useUpgrades";

interface Enemy {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
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
    
    for (let i = 0; i < count; i++) {
      // Generate a random position away from the player
      let spawnX, spawnZ;
      
      do {
        spawnX = (Math.random() * 400) - 200; // -200 to 200
        spawnZ = (Math.random() * 400) - 200; // -200 to 200
      } while (
        playerPosition && 
        new THREE.Vector3(spawnX, 0, spawnZ).distanceTo(playerPosition) < 50
      );
      
      const enemy: Enemy = {
        id: `enemy-${Date.now()}-${i}`,
        position: new THREE.Vector3(spawnX, 0, spawnZ),
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        health: 100,
        maxHealth: 100,
      };
      
      newEnemies.push(enemy);
    }
    
    set((state) => ({
      enemies: [...state.enemies, ...newEnemies],
    }));
    
    console.log(`Spawned ${count} enemies`);
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
      
      console.log(`Enemy ${id} destroyed! +${lootAmount} gold`);
      
      // Remove the enemy
      set((state) => ({
        enemies: state.enemies.filter((e) => e.id !== id),
      }));
      
      // Check if all enemies are defeated
      const remainingEnemies = get().enemies.filter((e) => e.id !== id);
      if (remainingEnemies.length === 0) {
        console.log("All enemies defeated!");
        
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
      
      console.log(`Enemy ${id} took ${scaledDamage.toFixed(1)} damage. Health: ${newHealth}`);
    }
  },
  
  // Reset all enemies (for new game)
  resetEnemies: () => {
    set({ enemies: [] });
    
    // Spawn new enemies with slight delay
    setTimeout(() => {
      get().spawnEnemies(5);
    }, 500);
  },
}));
