import { create } from "zustand";
import * as THREE from "three";

// Power-up types with their effects
export type PowerUpType = 
  | 'health_boost'      // Instantly restore health
  | 'speed_boost'       // Temporary ship speed increase 
  | 'double_damage'     // Cannonballs do double damage
  | 'rapid_fire'        // Reduced cannon cooldown
  | 'shield'            // Temporary damage resistance
  | 'triple_shot'       // Fire 3 cannonballs at once
  | 'long_range'        // Increased cannonball range
  | 'gold_bonus';       // Extra gold/loot

export interface ActivePowerUp {
  type: PowerUpType;
  duration: number;     // Duration in seconds (0 for instant effects)
  remaining: number;    // Remaining time
  shots?: number;       // For shot-limited power-ups
  shotsRemaining?: number; // Shots remaining for shot-limited power-ups
  value: number;        // Effect value (damage multiplier, speed multiplier, etc.)
}

interface PowerUpDefinition {
  type: PowerUpType;
  name: string;
  description: string;
  duration: number;     // 0 for instant effects
  shots?: number;       // For shot-limited power-ups
  value: number;        // Effect value
  color: string;        // Color for the power-up object
  rarity: number;       // 1 (common) to 5 (legendary) - affects spawn chance
  healthBonus: number;  // All power-ups give some health when collected
}

interface PowerUpsState {
  // Available power-up definitions
  powerUpDefinitions: PowerUpDefinition[];
  
  // Currently active power-ups
  activePowerUps: ActivePowerUp[];
  
  // Actions
  addPowerUp: (type: PowerUpType) => void;
  removePowerUp: (type: PowerUpType) => void;
  updatePowerUps: (delta: number) => void;
  consumeShot: (type: PowerUpType) => void;
  getPowerUpValue: (type: PowerUpType) => number | null;
  hasPowerUp: (type: PowerUpType) => boolean;
  getRandomPowerUpType: () => PowerUpType;
}

export const usePowerUps = create<PowerUpsState>((set, get) => ({
  // Define all available power-ups
  powerUpDefinitions: [
    {
      type: 'health_boost',
      name: 'Health Boost',
      description: 'Instantly restores 30 health points',
      duration: 0, // instant effect
      value: 30,
      color: '#ff5555',
      rarity: 1, // common
      healthBonus: 30
    },
    {
      type: 'speed_boost',
      name: 'Speed Boost',
      description: 'Increases ship speed by 50% for 20 seconds',
      duration: 20,
      value: 1.5, // 50% speed increase
      color: '#55ff55',
      rarity: 2, // uncommon
      healthBonus: 10
    },
    {
      type: 'double_damage',
      name: 'Double Damage',
      description: 'Cannonballs do double damage for 10 shots',
      duration: 0,
      shots: 10,
      value: 2.0, // double damage
      color: '#ff9900',
      rarity: 3, // rare
      healthBonus: 15
    },
    {
      type: 'rapid_fire',
      name: 'Rapid Fire',
      description: 'Reduces cannon cooldown by 70% for 15 seconds',
      duration: 15,
      value: 0.3, // 70% cooldown reduction
      color: '#ffff00',
      rarity: 3, // rare
      healthBonus: 10
    },
    {
      type: 'shield',
      name: 'Shield',
      description: 'Reduces incoming damage by 50% for 30 seconds',
      duration: 30,
      value: 0.5, // 50% damage reduction
      color: '#5555ff',
      rarity: 4, // very rare
      healthBonus: 20
    },
    {
      type: 'triple_shot',
      name: 'Triple Shot',
      description: 'Fire 3 cannonballs at once for 5 shots',
      duration: 0,
      shots: 5,
      value: 3, // 3 shots at once
      color: '#ff55ff',
      rarity: 5, // legendary
      healthBonus: 15
    },
    {
      type: 'long_range',
      name: 'Long Range',
      description: 'Doubles cannonball range and speed for 15 seconds',
      duration: 15,
      value: 2.0, // double range
      color: '#00ffff',
      rarity: 3, // rare
      healthBonus: 10
    },
    {
      type: 'gold_bonus',
      name: 'Gold Bonus',
      description: 'Instantly grants 100 gold',
      duration: 0, // instant effect
      value: 100,
      color: '#ffdd00',
      rarity: 2, // uncommon
      healthBonus: 5
    }
  ],
  
  // Currently active power-ups
  activePowerUps: [],
  
  // Add a new power-up
  addPowerUp: (type) => {
    const { powerUpDefinitions, activePowerUps } = get();
    
    // Find the power-up definition
    const definition = powerUpDefinitions.find(p => p.type === type);
    if (!definition) {
      console.error(`[POWER-UP] Unknown power-up type: ${type}`);
      return;
    }
    
    // Check if we already have this power-up active
    const existingIndex = activePowerUps.findIndex(p => p.type === type);
    
    // Get user player state to add health 
    try {
      const { heal } = require('./usePlayer').usePlayer.getState();
      if (heal) {
        heal(definition.healthBonus);
        console.log(`[POWER-UP] Health bonus: +${definition.healthBonus}`);
      }
    } catch (error) {
      console.error("[POWER-UP] Failed to apply health bonus:", error);
    }
    
    // Handle instant effect power-ups
    if (definition.duration === 0 && !definition.shots) {
      console.log(`[POWER-UP] Applied instant effect: ${definition.name}`);
      
      // Handle specific instant effects
      if (type === 'gold_bonus') {
        try {
          const { addLoot } = require('./useUpgrades').useUpgrades.getState();
          if (addLoot) {
            addLoot(definition.value);
            console.log(`[POWER-UP] Added ${definition.value} gold`);
          }
        } catch (error) {
          console.error("[POWER-UP] Failed to add gold:", error);
        }
      }
      
      // Don't add instant effects to active power-ups
      return;
    }
    
    // For shot-based power-ups
    if (definition.shots) {
      if (existingIndex >= 0) {
        // Reset the shots remaining
        const updatedPowerUps = [...activePowerUps];
        updatedPowerUps[existingIndex].shotsRemaining = definition.shots;
        set({ activePowerUps: updatedPowerUps });
      } else {
        // Add new shot-based power-up
        set({
          activePowerUps: [
            ...activePowerUps,
            {
              type,
              duration: definition.duration,
              remaining: definition.duration,
              shots: definition.shots,
              shotsRemaining: definition.shots,
              value: definition.value
            }
          ]
        });
      }
      console.log(`[POWER-UP] Activated ${definition.name} for ${definition.shots} shots`);
      return;
    }
    
    // Handle time-based power-ups
    if (existingIndex >= 0) {
      // Reset the duration or add to it
      const updatedPowerUps = [...activePowerUps];
      updatedPowerUps[existingIndex].remaining = definition.duration;
      set({ activePowerUps: updatedPowerUps });
    } else {
      // Add new time-based power-up
      set({
        activePowerUps: [
          ...activePowerUps,
          {
            type,
            duration: definition.duration,
            remaining: definition.duration,
            value: definition.value
          }
        ]
      });
    }
    
    console.log(`[POWER-UP] Activated ${definition.name} for ${definition.duration}s`);
  },
  
  // Remove a power-up
  removePowerUp: (type) => {
    const { activePowerUps } = get();
    set({
      activePowerUps: activePowerUps.filter(p => p.type !== type)
    });
    console.log(`[POWER-UP] Removed ${type}`);
  },
  
  // Update power-ups (call this every frame)
  updatePowerUps: (delta) => {
    const { activePowerUps } = get();
    
    // Update durations and remove expired power-ups
    const updatedPowerUps = activePowerUps
      .map(powerUp => {
        // Skip shot-based power-ups
        if (powerUp.shots) return powerUp;
        
        // Update time remaining
        return {
          ...powerUp,
          remaining: powerUp.remaining - delta
        };
      })
      .filter(powerUp => {
        // Keep shot-based power-ups with shots remaining
        if (powerUp.shots && powerUp.shotsRemaining && powerUp.shotsRemaining > 0) {
          return true;
        }
        
        // Keep time-based power-ups with time remaining
        if (powerUp.remaining > 0) {
          return true;
        }
        
        // Power-up expired
        console.log(`[POWER-UP] ${powerUp.type} expired`);
        return false;
      });
    
    // Only update state if there's a change
    if (updatedPowerUps.length !== activePowerUps.length) {
      set({ activePowerUps: updatedPowerUps });
    }
  },
  
  // Consume a shot for shot-based power-ups
  consumeShot: (type) => {
    const { activePowerUps } = get();
    const index = activePowerUps.findIndex(p => p.type === type);
    
    if (index >= 0 && activePowerUps[index].shotsRemaining) {
      const updatedPowerUps = [...activePowerUps];
      updatedPowerUps[index].shotsRemaining!--;
      
      // Log when shots are running low
      if (updatedPowerUps[index].shotsRemaining === 1) {
        console.log(`[POWER-UP] Last shot of ${type} remaining!`);
      }
      
      set({ activePowerUps: updatedPowerUps });
    }
  },
  
  // Get the current value of a power-up (null if not active)
  getPowerUpValue: (type) => {
    const { activePowerUps } = get();
    const powerUp = activePowerUps.find(p => p.type === type);
    return powerUp ? powerUp.value : null;
  },
  
  // Check if a power-up is active
  hasPowerUp: (type) => {
    const { activePowerUps } = get();
    return activePowerUps.some(p => p.type === type);
  },
  
  // Get a random power-up type weighted by rarity
  getRandomPowerUpType: () => {
    const { powerUpDefinitions } = get();
    
    // Calculate total weight (higher rarity = lower weight)
    const totalWeight = powerUpDefinitions.reduce((sum, def) => sum + (6 - def.rarity), 0);
    
    // Get a random value between 0 and totalWeight
    let random = Math.random() * totalWeight;
    
    // Find the power-up that corresponds to this random value
    for (const definition of powerUpDefinitions) {
      const weight = 6 - definition.rarity; // Convert rarity to weight (5 = legendary = weight 1)
      random -= weight;
      
      if (random <= 0) {
        return definition.type;
      }
    }
    
    // Fallback to first power-up if something goes wrong
    return powerUpDefinitions[0].type;
  }
}));