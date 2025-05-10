import React, { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ShipExplosionEffectProps {
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
  isEmber?: boolean;
  isDebris?: boolean;
  isFireball?: boolean;
  rotationSpeed?: THREE.Vector3;
  finalScale?: number;
  lifespan?: number;
}

interface ParticleMesh extends THREE.Mesh {
  userData: ParticleData;
  material: THREE.Material & { 
    emissiveIntensity?: number;
    emissive?: THREE.Color;
  };
}

/**
 * A component that renders a more intense, fiery explosion effect
 * Specifically designed for ship impacts with more fire, embers, and debris
 */
const ShipExplosionEffect: React.FC<ShipExplosionEffectProps> = ({
  position,
  size = 4,
  duration = 1.2,
  onComplete
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const [particles, setParticles] = useState<JSX.Element[]>([]);
  
  // Generate particles on first render
  useEffect(() => {
    const newParticles = [];
    
    // Create a central fireball (larger, brighter, longer-lasting)
    const fireballSize = size * 0.8;
    newParticles.push(
      <mesh 
        key="central-fireball"
        position={[0, 0.5, 0]}
        userData={{
          isFireball: true,
          initialScale: fireballSize,
          finalScale: fireballSize * 1.5,
          lifespan: duration * 0.5
        }}
        scale={[0.01, 0.01, 0.01]} // Start small, will grow
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshStandardMaterial 
          color={new THREE.Color(0xff5500)} 
          emissive={new THREE.Color(0xff3300)} 
          emissiveIntensity={2}
          transparent={true} 
          opacity={0.9} 
        />
      </mesh>
    );
    
    // 1. Fire particles (intense, vibrant, concentrated)
    const fireCount = 30;
    const fireColors = [
      new THREE.Color(0xff4500), // Orange-red
      new THREE.Color(0xff7700), // Bright orange
      new THREE.Color(0xff0000), // Pure red
      new THREE.Color(0xffcc00), // Gold
      new THREE.Color(0xff3300), // Deep orange
    ];
    
    for (let i = 0; i < fireCount; i++) {
      // Random direction with stronger upward bias for fire
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 3 + 0.5, // Stronger upward bias
        (Math.random() - 0.5) * 2
      ).normalize();
      
      // Random speed - faster to create more dynamic effect
      const speed = 3 + Math.random() * 5;
      
      // Random size - larger fire particles
      const particleSize = (Math.random() * 0.7 + 0.6) * size / 3;
      
      // Random color from fire palette
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];
      
      newParticles.push(
        <mesh 
          key={`fire-${i}`}
          position={[0, 0, 0]}
          userData={{ 
            direction,
            speed,
            initialScale: particleSize,
            rotationSpeed: new THREE.Vector3(
              Math.random() * 5,
              Math.random() * 5,
              Math.random() * 5
            )
          }}
        >
          <sphereGeometry args={[particleSize, 8, 8]} />
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={3}
            transparent={true} 
            opacity={1} 
          />
        </mesh>
      );
    }
    
    // 2. Smoke particles (darker, larger, slower)
    const smokeCount = 20;
    const smokeColors = [
      new THREE.Color(0x222222), // Dark gray
      new THREE.Color(0x333333), // Medium gray
      new THREE.Color(0x444444), // Light gray
      new THREE.Color(0x111111), // Almost black
    ];
    
    for (let i = 0; i < smokeCount; i++) {
      // Direction with strong upward bias
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        Math.random() * 1.5 + 1, // Strong upward
        (Math.random() - 0.5) * 1.2
      ).normalize();
      
      // Slower speed
      const speed = 1 + Math.random() * 2;
      
      // Larger smoke particles
      const particleSize = (Math.random() * 1.2 + 1) * size / 2.5;
      
      // Random smoky color
      const color = smokeColors[Math.floor(Math.random() * smokeColors.length)];
      
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
            color={color} 
            transparent={true} 
            opacity={0.7} 
          />
        </mesh>
      );
    }
    
    // 3. Glowing embers (tiny, bright sparks that linger and float)
    const emberCount = 40;
    const emberColors = [
      new THREE.Color(0xff0000), // Red
      new THREE.Color(0xff6600), // Orange
      new THREE.Color(0xffcc00), // Yellow
      new THREE.Color(0xffff00), // Bright yellow
    ];
    
    for (let i = 0; i < emberCount; i++) {
      // Random direction with wide spread
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 2.5,
        Math.random() * 2.5, // Varied heights
        (Math.random() - 0.5) * 2.5
      ).normalize();
      
      // Varied speeds
      const speed = 0.5 + Math.random() * 6;
      
      // Small ember particles
      const particleSize = (Math.random() * 0.2 + 0.1) * size / 3;
      
      // Random ember color
      const color = emberColors[Math.floor(Math.random() * emberColors.length)];
      
      newParticles.push(
        <mesh 
          key={`ember-${i}`}
          position={[0, 0, 0]}
          userData={{ 
            direction,
            speed,
            initialScale: particleSize,
            isEmber: true,
            rotationSpeed: new THREE.Vector3(
              Math.random() * 3,
              Math.random() * 3,
              Math.random() * 3
            )
          }}
        >
          <boxGeometry args={[particleSize, particleSize, particleSize]} />
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={5}
            transparent={true} 
            opacity={1} 
          />
        </mesh>
      );
    }
    
    // 4. Debris particles (wooden ship fragments)
    const debrisCount = 15;
    const woodColors = [
      new THREE.Color(0x8B4513), // Saddle Brown
      new THREE.Color(0xA0522D), // Sienna
      new THREE.Color(0xD2691E), // Chocolate
      new THREE.Color(0xCD853F), // Peru
    ];
    
    for (let i = 0; i < debrisCount; i++) {
      // Random direction with lower upward bias (heavier objects)
      const direction = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 1.5, // Some upward force
        (Math.random() - 0.5) * 3
      ).normalize();
      
      // Random speed
      const speed = 2 + Math.random() * 4;
      
      // Random size for debris fragments
      const width = (Math.random() * 0.3 + 0.2) * size / 2;
      const height = (Math.random() * 0.3 + 0.2) * size / 2;
      const depth = (Math.random() * 0.1 + 0.05) * size / 2;
      
      // Random wood color
      const color = woodColors[Math.floor(Math.random() * woodColors.length)];
      
      // Random rotation for natural orientation
      const rotation = [
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ];
      
      newParticles.push(
        <mesh 
          key={`debris-${i}`}
          position={[0, 0, 0]}
          rotation={rotation as [number, number, number]}
          userData={{ 
            direction,
            speed,
            initialScale: 1,
            isDebris: true,
            rotationSpeed: new THREE.Vector3(
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10,
              (Math.random() - 0.5) * 10
            )
          }}
        >
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
      );
    }
    
    setParticles(newParticles);
  }, [size, duration]);
  
  // Animate particles
  useFrame(() => {
    if (!groupRef.current) return;
    
    const elapsedTime = (Date.now() - startTime.current) / 1000;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // If animation is complete, call onComplete callback
    if (progress >= 1) {
      if (onComplete) onComplete();
      return;
    }
    
    // Update each particle
    groupRef.current.children.forEach((child) => {
      // Central fireball has special handling
      if (child.userData.isFireball) {
        const fireballProgress = Math.min(elapsedTime / child.userData.lifespan, 1);
        
        if (fireballProgress < 0.2) {
          // Quick expansion phase
          const expansionFactor = fireballProgress / 0.2;
          const scale = child.userData.initialScale * expansionFactor;
          child.scale.set(scale, scale, scale);
        } else if (fireballProgress < 0.8) {
          // Hold at full size
          const scale = child.userData.initialScale;
          child.scale.set(scale, scale, scale);
        } else {
          // Fade out phase
          const fadeFactor = 1 - ((fireballProgress - 0.8) / 0.2);
          const scale = child.userData.initialScale * fadeFactor;
          child.scale.set(scale, scale, scale);
          
          if ('material' in child && child.material instanceof THREE.Material) {
            child.material.opacity = 0.9 * fadeFactor;
          }
        }
        return;
      }
      
      // Type assertion to handle the proper mesh type
      const mesh = child as ParticleMesh;
      const userData = mesh.userData;
      
      if (!userData.direction || !userData.speed) return;
      
      // Apply rotation if available
      if (userData.rotationSpeed) {
        mesh.rotation.x += userData.rotationSpeed.x * 0.01;
        mesh.rotation.y += userData.rotationSpeed.y * 0.01;
        mesh.rotation.z += userData.rotationSpeed.z * 0.01;
      }
      
      // Move particle outward
      const movementFactor = userData.speed * 0.1 * (1 - Math.pow(progress, 2));
      mesh.position.x += userData.direction.x * movementFactor;
      mesh.position.y += userData.direction.y * movementFactor;
      mesh.position.z += userData.direction.z * movementFactor;
      
      // Apply gravity for debris and embers
      if (userData.isDebris || userData.isEmber) {
        mesh.position.y -= 0.05 * elapsedTime * elapsedTime; // Quadratic gravity effect
      }
      
      // Different behavior based on particle type
      if (userData.isSmoke) {
        // Smoke expands and fades gradually
        const scale = userData.initialScale * (1 + progress * 2);
        mesh.scale.set(scale, scale, scale);
        
        // Update opacity - smoke lasts longer
        if (mesh.material && mesh.material.opacity !== undefined) {
          mesh.material.opacity = 0.7 * (1 - Math.pow(progress, 2));
        }
      } 
      else if (userData.isEmber) {
        // Embers start bright, then fade but maintain size
        // They also twinkle
        const twinkle = Math.sin(elapsedTime * 10 + Math.random() * 10) * 0.3 + 0.7;
        
        // Embers last longer, then quickly fade
        let emberOpacity = 1;
        if (progress > 0.7) {
          emberOpacity = 1 - ((progress - 0.7) / 0.3);
        }
        
        if (mesh.material && mesh.material.emissiveIntensity !== undefined) {
          mesh.material.emissiveIntensity = 5 * twinkle * emberOpacity;
        }
        
        if (mesh.material && mesh.material.opacity !== undefined) {
          mesh.material.opacity = emberOpacity;
        }
      }
      else if (userData.isDebris) {
        // Debris maintains size but fades later
        if (progress > 0.8 && mesh.material && mesh.material.opacity !== undefined) {
          mesh.material.opacity = 1 - ((progress - 0.8) / 0.2);
        }
      }
      else {
        // Fire particles shrink and fade quickly
        const fireProgress = Math.min(elapsedTime / (duration * 0.6), 1); // Fire is shorter
        const scale = userData.initialScale * (1 - fireProgress * 0.7);
        mesh.scale.set(scale, scale, scale);
        
        // Update opacity
        if (mesh.material && mesh.material.opacity !== undefined) {
          mesh.material.opacity = 1 - fireProgress;
        }
        
        // Reduce emission intensity as it fades
        if (mesh.material && 'emissiveIntensity' in mesh.material) {
          // @ts-ignore - we know this exists on the material
          mesh.material.emissiveIntensity = 3 * (1 - fireProgress);
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

export default ShipExplosionEffect;