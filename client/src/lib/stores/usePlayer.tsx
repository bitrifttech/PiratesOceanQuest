import { create } from "zustand";
import * as THREE from "three";
import { useUpgrades } from "./useUpgrades";
import { usePowerUps } from "./usePowerUps";

interface PlayerState {
  // Ship properties
  position: THREE.Vector3 | null;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  
  // Cannon properties
  cannonReady: boolean;
  cannonCooldown: number;
  cooldownMax: number;
  cooldownPercent: number;
  
  // Actions
  initialize: () => void;
  resetPlayer: () => void;
  setPosition: (position: THREE.Vector3) => void;
  setRotation: (rotation: THREE.Euler) => void;
  setVelocity: (velocity: THREE.Vector3) => void;
  fireCannon: () => void;
  resetCannonCooldown: (delta: number) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
}

export const usePlayer = create<PlayerState>((set, get) => ({
  // Initial ship properties
  position: null,
  rotation: new THREE.Euler(0, 0, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  health: 100,
  maxHealth: 100,
  
  // Cannon properties
  cannonReady: true,
  cannonCooldown: 0,
  cooldownMax: 3, // 3 seconds cooldown
  cooldownPercent: 100,
  
  // Initialize player - only call once when null
  initialize: () => {
    // Check if player is already initialized
    if (get().position !== null) {
      console.log("Player already initialized, skipping initialization");
      return;
    }
    
    const { hullLevel } = useUpgrades.getState();
    const maxHealth = 100 + (hullLevel * 10);
    
    set({
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      health: maxHealth,
      maxHealth: maxHealth,
      cannonReady: true,
      cannonCooldown: 0,
    });
    
    console.log("Player initialized with max health:", maxHealth);
  },
  
  // Reset player state (used when starting a new game)
  resetPlayer: () => {
    const { hullLevel } = useUpgrades.getState();
    const maxHealth = 100 + (hullLevel * 10);
    
    set({
      position: new THREE.Vector3(0, 0, 0),
      rotation: new THREE.Euler(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      health: maxHealth,
      maxHealth: maxHealth,
      cannonReady: true,
      cannonCooldown: 0,
    });
  },
  
  // Update position
  setPosition: (position) => set({ position }),
  
  // Update rotation
  setRotation: (rotation) => set({ rotation }),
  
  // Update velocity
  setVelocity: (velocity) => set({ velocity }),
  
  // Fire cannon
  fireCannon: () => {
    if (get().cannonReady) {
      const { cannonLevel } = useUpgrades.getState();
      // Base cooldown time reduces with cannon level
      let cooldownTime = Math.max(1, 3 - (cannonLevel * 0.2));
      
      // Check for rapid fire power-up
      const powerUpState = usePowerUps.getState();
      if (powerUpState.hasPowerUp('rapid_fire')) {
        const rapidFireMultiplier = powerUpState.getPowerUpValue('rapid_fire') || 1;
        cooldownTime *= rapidFireMultiplier; // e.g., 0.3 = 70% cooldown reduction
        console.log(`[POWER-UP] Rapid fire active: ${(1 - rapidFireMultiplier) * 100}% faster cannons`);
      }
      
      // Apply triple shot if active
      if (powerUpState.hasPowerUp('triple_shot')) {
        console.log(`[POWER-UP] Triple shot active!`);
        // The actual triple shot logic is in the Ship component
        // We just track shot consumption here
        powerUpState.consumeShot('triple_shot');
      }
      
      set({
        cannonReady: false,
        cannonCooldown: cooldownTime,
        cooldownMax: cooldownTime,
        cooldownPercent: 0,
      });
      
      // No logging of cannon firing to reduce console spam
    }
  },
  
  // Update cannon cooldown
  resetCannonCooldown: (delta) => {
    const { cannonReady, cannonCooldown, cooldownMax } = get();
    
    if (!cannonReady) {
      const newCooldown = Math.max(0, cannonCooldown - delta);
      
      if (newCooldown <= 0) {
        set({
          cannonReady: true,
          cannonCooldown: 0,
          cooldownPercent: 100,
        });
      } else {
        set({
          cannonCooldown: newCooldown,
          cooldownPercent: ((cooldownMax - newCooldown) / cooldownMax) * 100,
        });
      }
    }
  },
  
  // Take damage
  takeDamage: (amount) => {
    const { health } = get();
    let damageAmount = amount;
    
    // Check for shield power-up
    const powerUpState = usePowerUps.getState();
    if (powerUpState.hasPowerUp('shield')) {
      const damageReduction = powerUpState.getPowerUpValue('shield') || 1;
      damageAmount = Math.floor(amount * damageReduction);
      
      if (damageAmount < amount) {
        console.log(`[POWER-UP] Shield active: Reduced damage from ${amount} to ${damageAmount}`);
      }
    }
    
    // Re-enabled damage system to support ship collisions
    const newHealth = Math.max(0, health - damageAmount);
    set({ health: newHealth });
    
    if (damageAmount > 0) {
      console.log(`[PLAYER] Took ${damageAmount} damage. Health: ${newHealth}/${get().maxHealth}`);
    }
    
    // Trigger crew reaction in ship events store if available
    try {
      const { playerHit } = require('./useShipEvents').useShipEvents.getState();
      if (playerHit) {
        playerHit();
      }
    } catch (error) {
      // Silently handle if the module isn't available yet
    }
    
    console.log(`[PLAYER] Took ${amount} damage. Health: ${newHealth}/${get().maxHealth}`);
    return newHealth;
  },
  
  // Heal
  heal: (amount) => {
    const { health, maxHealth } = get();
    const newHealth = Math.min(maxHealth, health + amount);
    
    set({ health: newHealth });
    
    return newHealth;
  },
}));
