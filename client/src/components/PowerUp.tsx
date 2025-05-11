import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

import { PowerUpType, usePowerUps } from '../lib/stores/usePowerUps';
import { usePlayer } from '../lib/stores/usePlayer';
import { useAudio } from '../lib/stores/useAudio';

interface PowerUpProps {
  position: THREE.Vector3;
  type: PowerUpType;
  id: string;
  onCollect: (id: string) => void;
}

const PowerUp: React.FC<PowerUpProps> = ({ position, type, id, onCollect }) => {
  // Reference to the power-up mesh
  const meshRef = useRef<THREE.Mesh>(null);
  
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
  
  // Animation and collision detection
  useFrame((state, delta) => {
    if (!meshRef.current || !playerPosition) return;
    
    // Update lifetime
    setLifetime(prev => prev - delta);
    
    // Make the power-up bob up and down
    bobHeight.current += delta * 2;
    meshRef.current.position.y = Math.sin(bobHeight.current) * 0.3 + 0.5; // Bob from 0.2 to 0.8
    
    // Rotate the power-up
    meshRef.current.rotation.y += delta * rotationSpeed.current;
    
    // Flash faster when about to disappear
    if (lifetime < 5) {
      const fadeScale = 0.5 + (Math.sin(lifetime * 10) * 0.5 + 0.5) * 0.5;
      meshRef.current.scale.set(fadeScale, fadeScale, fadeScale);
    }
    
    // Check for collection (player collision)
    const distanceToPlayer = playerPosition.distanceTo(position);
    if (distanceToPlayer < 5) { // Collection radius of 5 units
      playSound('powerUp');
      onCollect(id);
    }
  });
  
  // Remove when lifetime expires
  useEffect(() => {
    if (lifetime <= 0) {
      onCollect(id);
    }
  }, [lifetime, id, onCollect]);
  
  // Display name based on power-up type
  const displayName = definition?.name || 'Power-Up';
  
  return (
    <group position={[position.x, 0, position.z]}>
      {/* Power-up model */}
      <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
        {/* Base shape determined by power-up type */}
        {type === 'health_boost' && <sphereGeometry args={[0.6, 16, 16]} />}
        {type === 'speed_boost' && <coneGeometry args={[0.5, 1.2, 16]} />}
        {type === 'double_damage' && <boxGeometry args={[0.8, 0.8, 0.8]} />}
        {type === 'rapid_fire' && <cylinderGeometry args={[0.3, 0.5, 1, 16]} />}
        {type === 'shield' && <torusGeometry args={[0.5, 0.2, 16, 32]} />}
        {type === 'triple_shot' && <dodecahedronGeometry args={[0.6, 0]} />}
        {type === 'long_range' && <octahedronGeometry args={[0.6, 0]} />}
        {type === 'gold_bonus' && <tetrahedronGeometry args={[0.7, 0]} />}
        
        {/* Material with glow effect */}
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={0.5} 
          metalness={0.7}
          roughness={0.2}
        />
      </mesh>
      
      {/* Floating text label */}
      <Text
        position={[0, 1.5, 0]}
        rotation={[0, Math.PI / 4, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {displayName}
      </Text>
      
      {/* Particle effect - simple glowing sphere */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshBasicMaterial 
          color={color} 
          transparent={true} 
          opacity={0.2} 
        />
      </mesh>
    </group>
  );
};

export default PowerUp;