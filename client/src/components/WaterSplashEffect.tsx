import React, { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface WaterSplashEffectProps {
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
  initialY: number;
}

interface ParticleMesh extends THREE.Mesh {
  userData: ParticleData;
  material: THREE.Material;
}

/**
 * A component that renders a water splash effect
 * Used when cannonballs hit water surface
 */
const WaterSplashEffect: React.FC<WaterSplashEffectProps> = ({
  position,
  size = 2.5,
  duration = 1.2,
  onComplete
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const [particles, setParticles] = useState<JSX.Element[]>([]);
  
  // Generate water particles on first render (optimized for performance)
  useEffect(() => {
    const particleCount = 12; // Reduced from 25 for better performance
    const newParticles = [];
    
    // Create spray of water droplets in upward direction with outward spread
    for (let i = 0; i < particleCount; i++) {
      // Random direction with strong upward bias
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.8;
      
      const direction = new THREE.Vector3(
        Math.cos(angle) * radius,
        0.8 + Math.random() * 0.7,
        Math.sin(angle) * radius
      ).normalize();
      
      const speed = 2 + Math.random() * 4;
      const particleSize = (Math.random() * 0.3 + 0.2) * size / 3;
      
      // Simplified color selection
      const colors = [0x3498db, 0x2980b9, 0x7fc7ff, 0xffffff];
      const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
      
      const initialY = 0.1 + Math.random() * 0.1;
      
      newParticles.push(
        <mesh 
          key={`splash-${i}`}
          position={[0, initialY, 0]}
          userData={{ direction, speed, initialScale: particleSize, initialY }}
        >
          <sphereGeometry args={[particleSize, 4, 4]} />
          <meshBasicMaterial color={color} transparent={true} opacity={0.8} />
        </mesh>
      );
    }
    
    // Add circular ripple effect on water surface (reduced to 2 ripples)
    for (let i = 0; i < 2; i++) {
      const scale = (i + 1) * 0.8;
      const delay = i * 0.15;
      
      newParticles.push(
        <mesh 
          key={`ripple-${i}`}
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          userData={{ 
            isRipple: true,
            initialScale: 0.2,
            maxScale: scale * 3,
            delay,
            duration: duration * 0.8
          }}
          scale={[0.001, 0.001, 0.001]}
        >
          <ringGeometry args={[0.8, 1.0, 8]} />
          <meshBasicMaterial color={0xffffff} transparent={true} opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      );
    }
    
    // Add some foam particles around impact area (reduced from 10 to 5)
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      const xPos = Math.cos(angle) * radius;
      const zPos = Math.sin(angle) * radius;
      const foamScale = (Math.random() * 0.6 + 0.4) * size / 2;
      
      newParticles.push(
        <mesh 
          key={`foam-${i}`}
          position={[xPos, 0.1, zPos]}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI * 2]}
          userData={{ isFoam: true, initialScale: foamScale, lifespan: 0.4 + Math.random() * 0.6 }}
        >
          <circleGeometry args={[0.3, 6]} />
          <meshBasicMaterial color={0xffffff} transparent={true} opacity={0.5} />
        </mesh>
      );
    }
    
    // Add vertical water column at center (main splash)
    newParticles.push(
      <mesh 
        key="water-column"
        position={[0, 0.1, 0]}
        userData={{ isColumn: true, initialHeight: 0.1, maxHeight: size * 0.8 }}
        scale={[0.5, 0.1, 0.5]}
      >
        <cylinderGeometry args={[0.3, 0.8, 1, 8]} />
        <meshBasicMaterial color={0x2980b9} transparent={true} opacity={0.8} />
      </mesh>
    );
    
    setParticles(newParticles);
  }, [size, duration]);
  
  // Animate splash effect
  useFrame(() => {
    if (!groupRef.current) return;
    
    const elapsedTime = (Date.now() - startTime.current) / 1000;
    const progress = Math.min(elapsedTime / duration, 1);
    
    // If animation is complete, call onComplete callback
    if (progress >= 1 && onComplete) {
      onComplete();
      return;
    }
    
    // Update each particle/element
    groupRef.current.children.forEach((child) => {
      // Handle regular particles (water droplets)
      if (child.userData.direction && child.userData.speed) {
        // Type assertion for proper mesh access
        const mesh = child as ParticleMesh;
        const userData = mesh.userData;
        
        // Apply parabolic motion with gravity
        const particleElapsed = elapsedTime;
        
        // Initial upward velocity
        const initialVelocity = userData.speed;
        
        // Calculate height using physics formula: h = v0*t - 0.5*g*t^2
        const gravity = 9.8;
        const height = (initialVelocity * particleElapsed) - 
                      (0.5 * gravity * particleElapsed * particleElapsed);
        
        // Apply horizontal movement (decreases as splash progresses)
        const horizontalFactor = 0.2 * (1 - Math.pow(progress, 2));
        
        mesh.position.x += userData.direction.x * horizontalFactor;
        mesh.position.y = userData.initialY + height * 0.4; // Scale down height for better visuals
        mesh.position.z += userData.direction.z * horizontalFactor;
        
        // Fade out particles as they fall
        if (mesh.material && mesh.material.opacity !== undefined) {
          // More opacity at peak, fades as it falls
          const heightRatio = Math.max(0, mesh.position.y / (userData.initialY + 1));
          mesh.material.opacity = 0.8 * (heightRatio + 0.2) * (1 - progress * 0.7);
        }
        
        // Remove particles that go below water
        if (mesh.position.y < 0) {
          mesh.visible = false;
        }
      }
      // Handle ripple rings
      else if (child.userData.isRipple) {
        const rippleDelay = child.userData.delay || 0;
        const rippleDuration = child.userData.duration || duration;
        
        // Only start animation after delay
        if (elapsedTime > rippleDelay) {
          const rippleProgress = Math.min((elapsedTime - rippleDelay) / rippleDuration, 1);
          
          // Grow from initial to max scale
          const currentScale = child.userData.initialScale + 
                             (child.userData.maxScale - child.userData.initialScale) * rippleProgress;
          
          // Set scale
          child.scale.set(currentScale, currentScale, 1);
          
          // Fade out as it expands
          if ('material' in child && child.material instanceof THREE.Material) {
            child.material.opacity = 0.7 * (1 - rippleProgress);
          }
        }
      }
      // Handle foam particles
      else if (child.userData.isFoam) {
        const foamLifespan = child.userData.lifespan || 0.5;
        const foamProgress = Math.min(elapsedTime / (duration * foamLifespan), 1);
        
        // Fade out foam
        if ('material' in child && child.material instanceof THREE.Material) {
          child.material.opacity = 0.5 * (1 - foamProgress);
        }
      }
      // Handle water column (main splash)
      else if (child.userData.isColumn) {
        // Quick rise and fall
        const riseTime = duration * 0.15; // 15% of duration for rise
        const columnProgress = elapsedTime / riseTime;
        
        if (columnProgress < 1) {
          // Rising phase
          const heightProgress = Math.min(columnProgress, 1);
          const currentHeight = child.userData.initialHeight + 
                              (child.userData.maxHeight - child.userData.initialHeight) * heightProgress;
          
          // Set scale (x and z remain constant)
          child.scale.set(0.5, currentHeight, 0.5);
          child.position.y = currentHeight / 2; // Adjust position to match scaled height
        } else {
          // Falling phase
          const fallProgress = (columnProgress - 1) / 1; // Remaining time for fall
          
          // Shrink back down
          const shrinkFactor = 1 - Math.min(fallProgress, 1);
          
          if (shrinkFactor > 0) {
            const currentHeight = child.userData.maxHeight * shrinkFactor;
            child.scale.set(0.5 * (1 + shrinkFactor * 0.5), currentHeight, 0.5 * (1 + shrinkFactor * 0.5));
            child.position.y = currentHeight / 2;
            
            // Fade out water column
            if ('material' in child && child.material instanceof THREE.Material) {
              child.material.opacity = 0.8 * shrinkFactor;
            }
          } else {
            child.visible = false;
          }
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

export default WaterSplashEffect;