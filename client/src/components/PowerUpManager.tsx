import React, { useState, useEffect } from 'react';
import * as THREE from 'three';

import { usePowerUps, PowerUpType } from '../lib/stores/usePowerUps';
import PowerUp from './PowerUp';

// Interface for a power-up in the scene
export interface PowerUpInstance {
  id: string;
  position: THREE.Vector3;
  type: PowerUpType;
}

interface PowerUpManagerProps {
  // The component doesn't need any props
}

// Counter for generating unique IDs
let powerUpIdCounter = 0;

// Global mutable reference for the spawn function
let globalSpawnFunction: ((position: THREE.Vector3, type?: PowerUpType) => string | null) | null = null;

// Simple interface for the power-up system
interface PowerUpSystemType {
  spawn: (position: THREE.Vector3, type?: PowerUpType) => string | null;
}

// Export singleton instance for direct access from other components
export const PowerUpSystem: PowerUpSystemType = {
  spawn: (position: THREE.Vector3, type?: PowerUpType) => {
    // Log the input parameters in detail
    console.log('[POWER-UP SYSTEM DEBUG] spawn() called with:', {
      position: position ? {
        x: position.x,
        y: position.y,
        z: position.z,
        isVector3: position instanceof THREE.Vector3
      } : 'undefined',
      type: type || 'not specified (random)',
      globalSpawnFunctionAvailable: !!globalSpawnFunction,
      windowSpawnFunctionAvailable: typeof window !== 'undefined' && !!(window as any)._powerUpSpawnFunction,
      windowBackupFunctionAvailable: typeof window !== 'undefined' && !!(window as any).spawnPowerUp
    });
    
    // Safety check for position
    if (!position || !(position instanceof THREE.Vector3)) {
      console.error("[POWER-UP SYSTEM ERROR] Invalid position provided:", position);
      return null;
    }
    
    // Try using the direct function reference first
    if (globalSpawnFunction) {
      console.log("[POWER-UP SYSTEM] Using stored function to spawn power-up");
      try {
        const result = globalSpawnFunction(position, type);
        console.log("[POWER-UP SYSTEM] Direct function call result:", result);
        return result;
      } catch (error) {
        console.error("[POWER-UP SYSTEM ERROR] Error calling globalSpawnFunction:", error);
      }
    } else {
      console.warn("[POWER-UP SYSTEM WARN] globalSpawnFunction is not available");
    }
    
    // Try window globals as fallback
    if (typeof window !== 'undefined') {
      if ((window as any)._powerUpSpawnFunction) {
        console.log("[POWER-UP SYSTEM] Using window._powerUpSpawnFunction");
        try {
          const result = (window as any)._powerUpSpawnFunction(position, type);
          console.log("[POWER-UP SYSTEM] window._powerUpSpawnFunction result:", result);
          return result;
        } catch (error) {
          console.error("[POWER-UP SYSTEM ERROR] Error calling window._powerUpSpawnFunction:", error);
        }
      }
      
      if ((window as any).spawnPowerUp) {
        console.log("[POWER-UP SYSTEM] Using window.spawnPowerUp");
        try {
          const result = (window as any).spawnPowerUp(position, type);
          console.log("[POWER-UP SYSTEM] window.spawnPowerUp result:", result);
          return result;
        } catch (error) {
          console.error("[POWER-UP SYSTEM ERROR] Error calling window.spawnPowerUp:", error);
        }
      }
    }
    
    console.error("[POWER-UP SYSTEM ERROR] No spawn function available!");
    return null;
  }
};

// Component for managing power-ups in the game world
const PowerUpManager: React.FC<PowerUpManagerProps> = () => {
  // State for tracking power-ups in the scene
  const [powerUps, setPowerUps] = useState<PowerUpInstance[]>([]);
  
  // Get the power-up functions
  const addPowerUp = usePowerUps((state) => state.addPowerUp);
  
  // Function to spawn a power-up at a position
  const spawnPowerUp = (position: THREE.Vector3, type?: PowerUpType) => {
    console.log('[POWER-UP SPAWN DEBUG] Starting spawn with input:', {
      position: position ? {
        x: position.x,
        y: position.y,
        z: position.z,
        isVector3: position instanceof THREE.Vector3,
        hash: position.toArray().join(',')
      } : 'null position',
      type: type || 'not specified (will use random)',
      powerUpCount: powerUps.length
    });
    
    // Safety check for valid position
    if (!position || !(position instanceof THREE.Vector3)) {
      console.error('[POWER-UP SPAWN ERROR] Invalid position provided:', position);
      return null;
    }
    
    const getRandomPowerUpType = usePowerUps.getState().getRandomPowerUpType;
    
    // Generate a unique ID
    const id = `powerup-${powerUpIdCounter++}`;
    
    // Use provided type or get a random one
    const powerUpType = type || getRandomPowerUpType();
    console.log('[POWER-UP SPAWN DEBUG] Selected power-up type:', powerUpType);
    
    // Create slight randomization in position
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2
    );
    
    // Create the power-up with modified position
    const finalPosition = position.clone().add(randomOffset);
    console.log('[POWER-UP SPAWN DEBUG] Final position with offset:', {
      x: finalPosition.x,
      y: finalPosition.y,
      z: finalPosition.z,
      originalX: position.x,
      originalZ: position.z,
      offsetX: randomOffset.x,
      offsetZ: randomOffset.z
    });
    
    const newPowerUp: PowerUpInstance = {
      id,
      position: finalPosition,
      type: powerUpType
    };
    
    // Add to state
    setPowerUps(prev => {
      const newState = [...prev, newPowerUp];
      console.log('[POWER-UP SPAWN DEBUG] Updated powerUps state:', {
        previousCount: prev.length,
        newCount: newState.length,
        addedPowerUp: {
          id: newPowerUp.id,
          type: newPowerUp.type,
          position: `(${newPowerUp.position.x.toFixed(2)}, ${newPowerUp.position.y.toFixed(2)}, ${newPowerUp.position.z.toFixed(2)})`
        }
      });
      return newState;
    });
    
    console.log(`[POWER-UP SPAWN] Successfully spawned ${powerUpType} (id: ${id}) at position ${finalPosition.x.toFixed(1)}, ${finalPosition.z.toFixed(1)}`);
    
    return id;
  };
  
  // Function to remove a power-up
  const removePowerUp = (id: string, collected: boolean = false) => {
    setPowerUps(prev => {
      // Find the power-up before removing it
      const powerUp = prev.find(p => p.id === id);
      
      // If it was collected, activate its effect
      if (collected && powerUp) {
        addPowerUp(powerUp.type);
      }
      
      // Remove from state
      return prev.filter(p => p.id !== id);
    });
  };
  
  // Make spawn function available globally - immediately on component mount
  useEffect(() => {
    console.log("[POWER-UP] Setting up global spawn function");
    
    // Store in global variable
    globalSpawnFunction = spawnPowerUp;
    
    // Add to window for global access
    (window as any).spawnPowerUp = spawnPowerUp;
    (window as any)._powerUpSpawnFunction = spawnPowerUp;
    
    console.log("[POWER-UP] Registered spawn function successfully");
    
    // Cleanup
    return () => {
      console.log("[POWER-UP] Cleaning up global spawn function");
      globalSpawnFunction = null;
      delete (window as any).spawnPowerUp;
      delete (window as any)._powerUpSpawnFunction;
    };
  }, []);
  
  return (
    <>
      {/* Render all active power-ups */}
      {powerUps.map(powerUp => (
        <PowerUp
          key={powerUp.id}
          id={powerUp.id}
          position={powerUp.position}
          type={powerUp.type}
          onCollect={(id) => removePowerUp(id, true)}
        />
      ))}
    </>
  );
};

export default PowerUpManager;