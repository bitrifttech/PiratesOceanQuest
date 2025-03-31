import { create } from "zustand";
import * as THREE from "three";
import { useUpgrades } from "./useUpgrades";

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
  
  // Initialize player
  initialize: () => {
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
      // Cooldown time reduces with cannon level
      const cooldownTime = Math.max(1, 3 - (cannonLevel * 0.2));
      
      set({
        cannonReady: false,
        cannonCooldown: cooldownTime,
        cooldownMax: cooldownTime,
        cooldownPercent: 0,
      });
      
      console.log("Cannon fired! Cooldown:", cooldownTime);
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
    const newHealth = Math.max(0, health - amount);
    
    set({ health: newHealth });
    
    console.log(`Player took ${amount} damage. Health: ${newHealth}`);
    
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
