import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

import { PowerUpType, usePowerUps } from '../lib/stores/usePowerUps';
import { usePlayer } from '../lib/stores/usePlayer';
import { useAudio } from '../lib/stores/useAudio';
import Gem from './Gem';

interface PowerUpProps {
  position: THREE.Vector3;
  type: PowerUpType;
  id: string;
  onCollect: (id: string) => void;
}

const PowerUp: React.FC<PowerUpProps> = ({ position, type, id, onCollect }) => {
  // Reference to the power-up group for animation
  const meshRef = useRef<THREE.Group>(null);
  
  // Track lifetime and bobbing animation
  const [lifetime, setLifetime] = useState(30); // 30 seconds before disappearing
  const bobHeight = useRef(0);
  const rotationSpeed = useRef(Math.random() * 0.5 + 0.5); // Random rotation speed
  
  // Get player position and power-up definitions
  const playerPosition = usePlayer((state) => state.position);
  const definitions = usePowerUps((state) => state.powerUpDefinitions);
  
  // Find the power-up definition to get its color
  const definition = definitions.find(def => def.type === type);
  const color = definition?.color || '#ffffff';
  
  // Audio service for sound effects
  const playSound = useAudio((state) => state.playSound);
  
  // Log when power-up is created
  useEffect(() => {
    console.log(`[POWER-UP RENDER] Initialized power-up:`, {
      id,
      type,
      position: `(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`,
      color,
      lifetime: 30
    });
    
    // Check if we're at water level
    const waterLevel = 0;
    if (Math.abs(position.y - waterLevel) > 0.5) {
      console.warn(`[POWER-UP RENDER WARNING] Power-up ${id} is not at water level: y=${position.y}`);
    }
    
    return () => {
      console.log(`[POWER-UP RENDER] Power-up ${id} unmounted`);
    };
  }, [id, type, position, color]);
  
  // Animation and collision detection
  useFrame((state, delta) => {
    if (!meshRef.current || !playerPosition) return;
    
    // Update lifetime
    setLifetime(prev => prev - delta);
    
    // Make the power-up bob up and down
    bobHeight.current += delta * 2;
    const newY = Math.sin(bobHeight.current) * 0.3 + 0.5; // Bob from 0.2 to 0.8
    meshRef.current.position.y = newY;
    
    // Rotate the power-up
    meshRef.current.rotation.y += delta * rotationSpeed.current;
    
    // Flash faster when about to disappear
    if (lifetime < 5) {
      const fadeScale = 0.5 + (Math.sin(lifetime * 10) * 0.5 + 0.5) * 0.5;
      meshRef.current.scale.set(fadeScale, fadeScale, fadeScale);
    }
    
    // Check for collection (player collision)
    const distanceToPlayer = playerPosition.distanceTo(position);
    
    // Log collection attempts occasionally (not every frame to avoid spam)
    if (lifetime % 5 < 0.1) {
      console.log(`[POWER-UP COLLECTION] Power-up ${id} (${type}) distance to player: ${distanceToPlayer.toFixed(2)}`);
    }
    
    if (distanceToPlayer < 5) { // Collection radius of 5 units
      console.log(`[POWER-UP COLLECTION] Player collecting power-up ${id} (${type}) at distance ${distanceToPlayer.toFixed(2)}`);
      playSound('powerUp');
      onCollect(id);
    }
  });
  
  // Remove when lifetime expires
  useEffect(() => {
    if (lifetime <= 0) {
      console.log(`[POWER-UP LIFETIME] Power-up ${id} expired after 30 seconds`);
      onCollect(id);
    }
  }, [lifetime, id, onCollect]);
  
  // Display name based on power-up type
  const displayName = definition?.name || 'Power-Up';
  
  // Get gem cut type based on power-up type for visual variety
  const getGemCutType = (): 'brilliant' | 'emerald' => {
    switch (type) {
      case 'double_damage':
      case 'shield':
      case 'long_range':
        return 'emerald';
      default:
        return 'brilliant';
    }
  };
  
  return (
    <group position={[position.x, 0, position.z]}>
      {/* Gem container for animation */}
      <group ref={meshRef} position={[0, 0.5, 0]}>
        {/* Realistic cut gem with sparkle and refraction */}
        <Gem
          color={color}
          size={0.6}
          cutType={getGemCutType()}
        />
      </group>
      
      {/* Floating text label */}
      <Text
        position={[0, 1.8, 0]}
        rotation={[0, Math.PI / 4, 0]}
        fontSize={0.4}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#000000"
      >
        {displayName}
      </Text>
    </group>
  );
};

export default PowerUp;