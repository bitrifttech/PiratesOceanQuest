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
  
  // Generate water particles on first render
  useEffect(() => {
    const particleCount = 25;
    const newParticles = [];
    
    // Create spray of water droplets in upward direction with outward spread
    for (let i = 0; i < particleCount; i++) {
      // Random direction with strong upward bias
      const angle = Math.random() * Math.PI * 2; // Random angle around circle
      const radius = Math.random() * 0.8; // Random radius (controls spread)
      
      // Direction with strong upward bias
      const direction = new THREE.Vector3(
        Math.cos(angle) * radius,  // X component with spread
        0.8 + Math.random() * 0.7, // Strong upward bias (0.8-1.5)
        Math.sin(angle) * radius   // Z component with spread
      ).normalize();
      
      // Random speed with more variation for natural look
      const speed = 2 + Math.random() * 4;
      
      // Random size for water droplets
      const particleSize = (Math.random() * 0.3 + 0.2) * size / 3;
      
      // Water droplet colors (blue to white)
      const colors = [
        new THREE.Color(0x3498db), // Blue
        new THREE.Color(0x2980b9), // Darker blue
        new THREE.Color(0x7fc7ff), // Light blue
        new THREE.Color(0xffffff), // White (foam)
      ];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      // Initial y position (slightly varied for more natural look)
      const initialY = 0.1 + Math.random() * 0.1;
      
      newParticles.push(
        <mesh 
          key={`splash-${i}`}
          position={[0, initialY, 0]}
          userData={{ 
            direction,
            speed,
            initialScale: particleSize,
            initialY
          }}
        >
          <sphereGeometry args={[particleSize, 8, 8]} />
          <meshStandardMaterial 
            color={color} 
            transparent={true} 
            opacity={0.8} 
          />
        </mesh>
      );
    }
    
    // Add circular ripple effect on water surface
    for (let i = 0; i < 3; i++) {
      const scale = (i + 1) * 0.8; // Scale for each ripple ring
      const delay = i * 0.15; // Delay the start of each ripple
      
      newParticles.push(
        <mesh 
          key={`ripple-${i}`}
          position={[0, 0.05, 0]} // Just above water surface
          rotation={[-Math.PI / 2, 0, 0]} // Flat on water
          userData={{ 
            isRipple: true,
            initialScale: 0.2, // Start small
            maxScale: scale * 3, // Grow to this size
            delay, // Delay before starting
            duration: duration * 0.8 // Ripples are shorter than splash
          }}
          scale={[0.001, 0.001, 0.001]} // Start invisible
        >
          <ringGeometry args={[0.8, 1.0, 16]} />
          <meshStandardMaterial 
            color={new THREE.Color(0xffffff)} 
            transparent={true} 
            opacity={0.7} 
            side={THREE.DoubleSide}
          />
        </mesh>
      );
    }
    
    // Add some foam particles around impact area
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      
      const xPos = Math.cos(angle) * radius;
      const zPos = Math.sin(angle) * radius;
      
      // Random foam scale
      const foamScale = (Math.random() * 0.6 + 0.4) * size / 2;
      
      newParticles.push(
        <mesh 
          key={`foam-${i}`}
          position={[xPos, 0.1, zPos]}
          rotation={[-Math.PI / 2, 0, Math.random() * Math.PI * 2]}
          userData={{ 
            isFoam: true,
            initialScale: foamScale,
            lifespan: 0.4 + Math.random() * 0.6 // Random lifespan
          }}
        >
          <circleGeometry args={[0.3, 8]} />
          <meshStandardMaterial 
            color={new THREE.Color(0xffffff)} 
            transparent={true} 
            opacity={0.5} 
          />
        </mesh>
      );
    }
    
    // Add vertical water column at center (main splash)
    newParticles.push(
      <mesh 
        key="water-column"
        position={[0, 0.1, 0]}
        userData={{ 
          isColumn: true,
          initialHeight: 0.1,
          maxHeight: size * 0.8
        }}
        scale={[0.5, 0.1, 0.5]}
      >
        <cylinderGeometry args={[0.3, 0.8, 1, 12]} />
        <meshStandardMaterial 
          color={new THREE.Color(0x2980b9)}
          transparent={true} 
          opacity={0.8} 
        />
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