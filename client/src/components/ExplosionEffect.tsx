import React, { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ExplosionEffectProps {
  position: THREE.Vector3;
  size?: number;
  duration?: number;
  onComplete?: () => void;
}

// Define particleData type for better type checking
interface ParticleData {
  direction: THREE.Vector3;
  speed: number;
  initialScale: number;
  isSmoke?: boolean;
}

interface ParticleMesh extends THREE.Mesh {
  userData: ParticleData;
  material: THREE.Material;
}

/**
 * A component that renders a particle-based explosion effect
 * Used when cannonballs hit targets
 */
const ExplosionEffect: React.FC<ExplosionEffectProps> = ({
  position,
  size = 3,
  duration = 0.8,
  onComplete
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const [particles, setParticles] = useState<JSX.Element[]>([]);
  
  // Generate particles on first render
  useEffect(() => {
    const particleCount = 20;
    const newParticles = [];
    
    // Create a burst of particles in random directions
    for (let i = 0; i < particleCount; i++) {
      // Random direction
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2, // More upward bias
        (Math.random() - 0.5) * 2
      ).normalize();
      
      // Random speed
      const speed = 2 + Math.random() * 3;
      
      // Random size
      const particleSize = (Math.random() * 0.5 + 0.5) * size / 3;
      
      // Random color (orange/red/yellow for fire)
      const colors = [
        new THREE.Color(0xff4500), // Orange-red
        new THREE.Color(0xff8c00), // Dark orange
        new THREE.Color(0xffcc00), // Gold
        new THREE.Color(0xff0000), // Red
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      newParticles.push(
        <mesh 
          key={`particle-${i}`}
          position={[0, 0, 0]}
          userData={{ 
            direction,
            speed,
            initialScale: particleSize
          }}
        >
          <sphereGeometry args={[particleSize, 8, 8]} />
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={2}
            transparent={true} 
            opacity={1} 
          />
        </mesh>
      );
    }
    
    // Add some smoke particles (dark gray)
    for (let i = 0; i < 10; i++) {
      // Random direction with upward bias
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.5 + 0.5, // More upward bias
        (Math.random() - 0.5) * 1.5
      ).normalize();
      
      // Random speed (slower than fire)
      const speed = 1 + Math.random() * 2;
      
      // Random size (larger than fire)
      const particleSize = (Math.random() * 0.7 + 0.8) * size / 2;
      
      newParticles.push(
        <mesh 
          key={`smoke-${i}`}
          position={[0, 0, 0]}
          userData={{ 
            direction,
            speed,
            initialScale: particleSize,
            isSmoke: true
          }}
        >
          <sphereGeometry args={[particleSize, 8, 8]} />
          <meshStandardMaterial 
            color={new THREE.Color(0x444444)} 
            transparent={true} 
            opacity={0.5} 
          />
        </mesh>
      );
    }
    
    setParticles(newParticles);
  }, [size]);
  
  // Animate particles
  useFrame(() => {
    if (!groupRef.current) return;
    
    const elapsedTime = (Date.now() - startTime.current) / 1000;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // If animation is complete, call onComplete callback
    if (progress >= 1 && onComplete) {
      onComplete();
      return;
    }
    
    // Update each particle
    groupRef.current.children.forEach((child) => {
      // Type assertion to handle the proper mesh type
      const mesh = child as ParticleMesh;
      const userData = mesh.userData;
      
      if (!userData.direction || !userData.speed) return;
      
      // Move particle outward
      const movementFactor = userData.speed * 0.1 * (1 - Math.pow(progress, 2));
      mesh.position.x += userData.direction.x * movementFactor;
      mesh.position.y += userData.direction.y * movementFactor;
      mesh.position.z += userData.direction.z * movementFactor;
      
      // Scale down fire particles, scale up smoke particles
      if (userData.isSmoke) {
        // Smoke grows and fades
        const scale = userData.initialScale * (1 + progress * 2);
        mesh.scale.set(scale, scale, scale);
        
        // Update opacity
        if (mesh.material && mesh.material.opacity !== undefined) {
          mesh.material.opacity = 0.6 * (1 - progress);
        }
      } else {
        // Fire shrinks and fades
        const fireProgress = Math.min(elapsedTime / (duration * 0.7), 1); // Fire is shorter
        const scale = userData.initialScale * (1 - fireProgress);
        mesh.scale.set(scale, scale, scale);
        
        // Update opacity
        if (mesh.material && mesh.material.opacity !== undefined) {
          mesh.material.opacity = 1 - fireProgress;
        }
      }
    });
  });
  
  return (
    <group ref={groupRef} position={position.toArray()}>
      {particles}
    </group>
  );
};

export default ExplosionEffect;