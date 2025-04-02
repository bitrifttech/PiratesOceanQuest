import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Trail } from "@react-three/drei";

interface CannonballProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed?: number;
  onHit?: () => void;
  lifespan?: number; // seconds before auto-removal
}

/**
 * Renders a cannonball with physics and trail effect
 * Important: This component is rendered outside the ship group hierarchy
 * to ensure cannonballs don't move with the ship after being fired
 */
const Cannonball = ({
  position,
  direction,
  speed = 30,
  onHit,
  lifespan = 2.0
}: CannonballProps) => {
  // References
  const ballRef = useRef<THREE.Mesh>(null);
  const lifeRef = useRef<number>(lifespan);
  
  // Store the initial position and velocity locally to prevent them from being affected by the parent ship
  const [localPosition] = useState<THREE.Vector3>(position.clone());
  const [velocity] = useState<THREE.Vector3>(direction.clone().normalize().multiplyScalar(speed));
  
  // Initialize position
  useEffect(() => {
    if (ballRef.current) {
      // Set initial position directly to avoid being parented to the ship
      ballRef.current.position.copy(localPosition);
      console.log("Cannonball initialized at", localPosition);
    }
  }, [localPosition]);
  
  // Update cannonball position and apply physics independently of ship
  useFrame((_, delta) => {
    if (!ballRef.current) return;
    
    // Move cannonball using local velocity reference
    ballRef.current.position.add(velocity.clone().multiplyScalar(delta));
    
    // Apply slight gravity
    velocity.y -= 5 * delta;
    
    // Apply slight drag in horizontal directions
    velocity.x *= 0.99;
    velocity.z *= 0.99;
    
    // Decrease lifespan
    lifeRef.current -= delta;
    
    // Add spin to the cannonball
    ballRef.current.rotation.x += delta * 5;
    ballRef.current.rotation.z += delta * 3;
    
    // Auto-remove when lifespan is up
    if (lifeRef.current <= 0) {
      // Execute callback if provided
      if (onHit) onHit();
    }
    
    // Optional: Check if cannonball has fallen into the water
    if (ballRef.current.position.y < -2) {
      lifeRef.current = 0;
      if (onHit) onHit();
      
      // Create a small splash effect here (for future enhancement)
    }
  });
  
  return (
    // Use an absolute positioned group (not relative to ship)
    <group position={[0, 0, 0]}>
      {/* Cannonball mesh */}
      <mesh 
        ref={ballRef}
        castShadow
      >
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial 
          color="#222"
          roughness={0.7}
          metalness={0.8}
          emissive="#330000"
          emissiveIntensity={0.1}
        />
        
        {/* Trail effect that follows the cannonball */}
        <Trail
          width={1.5}
          color={'#777777'}
          length={8}
          decay={1}
          local={false}
          stride={0}
          interval={1}
          attenuation={(width) => width}
        />
      </mesh>
    </group>
  );
};

export default Cannonball;