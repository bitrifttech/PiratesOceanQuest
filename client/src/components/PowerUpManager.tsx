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

// Component for managing power-ups in the game world
const PowerUpManager: React.FC<PowerUpManagerProps> = () => {
  // State for tracking power-ups in the scene
  const [powerUps, setPowerUps] = useState<PowerUpInstance[]>([]);
  
  // Get the power-up functions
  const addPowerUp = usePowerUps((state) => state.addPowerUp);
  
  // Function to spawn a power-up at a position
  const spawnPowerUp = (position: THREE.Vector3, type?: PowerUpType) => {
    const getRandomPowerUpType = usePowerUps.getState().getRandomPowerUpType;
    
    // Generate a unique ID
    const id = `powerup-${powerUpIdCounter++}`;
    
    // Use provided type or get a random one
    const powerUpType = type || getRandomPowerUpType();
    
    // Create slight randomization in position
    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2
    );
    
    // Create the power-up
    const newPowerUp: PowerUpInstance = {
      id,
      position: position.clone().add(randomOffset),
      type: powerUpType
    };
    
    // Add to state
    setPowerUps(prev => [...prev, newPowerUp]);
    
    console.log(`[POWER-UP] Spawned ${powerUpType} at position ${position.x.toFixed(1)}, ${position.z.toFixed(1)}`);
    
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
    
    // Add to window for global access
    (window as any).spawnPowerUp = spawnPowerUp;
    
    // Export the function directly using the global object
    (window as any)._powerUpSpawnFunction = spawnPowerUp;
    
    // Cleanup
    return () => {
      console.log("[POWER-UP] Cleaning up global spawn function");
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

// Simple interface for the power-up system
interface PowerUpSystemType {
  spawn: (position: THREE.Vector3, type?: PowerUpType) => string | null;
}

// Export singleton instance for direct access from other components
export const PowerUpSystem: PowerUpSystemType = {
  spawn: (position: THREE.Vector3, type?: PowerUpType) => {
    // Try direct access from window
    if (typeof window !== 'undefined') {
      // Try the specialized function first
      if ((window as any)._powerUpSpawnFunction) {
        console.log("[POWER-UP] Using _powerUpSpawnFunction to spawn power-up");
        return (window as any)._powerUpSpawnFunction(position, type);
      }
      
      // Fallback to standard function
      if ((window as any).spawnPowerUp) {
        console.log("[POWER-UP] Using window.spawnPowerUp to spawn power-up");
        return (window as any).spawnPowerUp(position, type);
      }
    }
    
    // Log error if no function is available
    console.error("[POWER-UP] Failed to spawn power-up: No spawn function available");
    return null;
  }
};