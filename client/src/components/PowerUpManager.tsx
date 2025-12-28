import React, { useState, useEffect } from 'react';
import * as THREE from 'three';

import { usePowerUps, PowerUpType } from '../lib/stores/usePowerUps';
import { logger } from '../lib/utils/logger';
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
    // Safety check for position
    if (!position || !(position instanceof THREE.Vector3)) {
      logger.error('powerup', 'Invalid position provided to PowerUpSystem.spawn');
      return null;
    }
    
    // Try using the direct function reference first
    if (globalSpawnFunction) {
      try {
        return globalSpawnFunction(position, type);
      } catch (error) {
        logger.error('powerup', 'Error calling globalSpawnFunction:', error);
      }
    }
    
    // Try window globals as fallback
    if (typeof window !== 'undefined') {
      if ((window as any)._powerUpSpawnFunction) {
        try {
          return (window as any)._powerUpSpawnFunction(position, type);
        } catch (error) {
          logger.error('powerup', 'Error calling window._powerUpSpawnFunction:', error);
        }
      }
      
      if ((window as any).spawnPowerUp) {
        try {
          return (window as any).spawnPowerUp(position, type);
        } catch (error) {
          logger.error('powerup', 'Error calling window.spawnPowerUp:', error);
        }
      }
    }
    
    logger.error('powerup', 'No spawn function available!');
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
    // Safety check for valid position
    if (!position || !(position instanceof THREE.Vector3)) {
      logger.error('powerup', 'Invalid position provided to spawnPowerUp');
      return null;
    }
    
    // Clamp position to valid world bounds
    if (Math.abs(position.x) > 500 || Math.abs(position.z) > 500) {
      position = new THREE.Vector3(0, 0, 0);
    }
    
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
    
    // Create the power-up with modified position
    const finalPosition = position.clone().add(randomOffset);
    finalPosition.y = 0; // Ensure at water level
    
    const newPowerUp: PowerUpInstance = {
      id,
      position: finalPosition,
      type: powerUpType
    };
    
    // Add to state
    setPowerUps(prev => [...prev, newPowerUp]);
    
    logger.debug('powerup', `Spawned ${powerUpType} (id: ${id}) at (${finalPosition.x.toFixed(1)}, ${finalPosition.z.toFixed(1)})`);
    
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
    // Store in global variable
    globalSpawnFunction = spawnPowerUp;
    
    // Add to window for global access
    (window as any).spawnPowerUp = spawnPowerUp;
    (window as any)._powerUpSpawnFunction = spawnPowerUp;
    
    // Cleanup
    return () => {
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