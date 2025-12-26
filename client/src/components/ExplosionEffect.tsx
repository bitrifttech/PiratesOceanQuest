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
  
  // Generate particles on first render (optimized for performance)
  useEffect(() => {
    const particleCount = 10; // Reduced from 20 for better performance
    const newParticles = [];
    
    // Create a burst of particles in random directions
    for (let i = 0; i < particleCount; i++) {
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      
      const speed = 2 + Math.random() * 3;
      const particleSize = (Math.random() * 0.5 + 0.5) * size / 3;
      
      // Simplified color selection
      const colors = [0xff4500, 0xff8c00, 0xffcc00, 0xff0000];
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      
      newParticles.push(
        <mesh 
          key={`particle-${i}`}
          position={[0, 0, 0]}
          userData={{ direction, speed, initialScale: particleSize }}
        >
          <sphereGeometry args={[particleSize, 4, 4]} />
          <meshBasicMaterial color={color} transparent={true} opacity={1} />
        </mesh>
      );
    }
    
    // Add some smoke particles (reduced from 10 to 5)
    for (let i = 0; i < 5; i++) {
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 1.5
      ).normalize();
      
      const speed = 1 + Math.random() * 2;
      const particleSize = (Math.random() * 0.7 + 0.8) * size / 2;
      
      newParticles.push(
        <mesh 
          key={`smoke-${i}`}
          position={[0, 0, 0]}
          userData={{ direction, speed, initialScale: particleSize, isSmoke: true }}
        >
          <sphereGeometry args={[particleSize, 4, 4]} />
          <meshBasicMaterial color={0x444444} transparent={true} opacity={0.5} />
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