import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Trail } from "@react-three/drei";
import { SCALE, MODEL_ADJUSTMENT } from "../lib/constants";

interface CannonballProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed?: number;
  onHit?: () => void;
  lifespan?: number; // seconds before auto-removal
}

/**
 * Renders a cannonball with enhanced physics, spread pattern, upward arc, and gravity
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
  const startTime = useRef<number>(Date.now());
  
  // Store the initial position and velocity locally to prevent them from being affected by the parent ship
  const [localPosition] = useState<THREE.Vector3>(position.clone());
  
  // Create velocity with the upward component already included from the direction
  // This preserves any upward angle set by the ship's cannons
  const [velocity] = useState<THREE.Vector3>(direction.clone().normalize().multiplyScalar(speed));

  // Check if this cannonball has an upward arc in its initial direction
  const hasUpwardComponent = direction.y > 0;
  
  // Initialize position and log trajectory data
  useEffect(() => {
    if (ballRef.current) {
      // Set initial position directly to avoid being parented to the ship
      ballRef.current.position.copy(localPosition);
      
      // Log the initial trajectory details for debugging
      console.log(`Cannonball fired with: 
        Position: (${localPosition.x.toFixed(2)}, ${localPosition.y.toFixed(2)}, ${localPosition.z.toFixed(2)})
        Direction: (${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}, ${direction.z.toFixed(2)})
        Speed: ${speed}
        Upward Arc: ${hasUpwardComponent ? 'Yes' : 'No'}`
      );
    }
  }, [localPosition, direction, speed, hasUpwardComponent]);
  
  // Update cannonball position and apply physics independently of ship
  useFrame((_, delta) => {
    if (!ballRef.current) return;
    
    // Elapsed time since firing (for advanced trajectory calculation)
    const elapsedTime = (Date.now() - startTime.current) / 1000;
    
    // Move cannonball using local velocity reference
    ballRef.current.position.add(velocity.clone().multiplyScalar(delta));
    
    // Apply stronger gravity effect - increased from 5 to 9.8 for more realistic arcs
    velocity.y -= 9.8 * delta;
    
    // Apply slight drag in horizontal directions for realism
    velocity.x *= 0.995;
    velocity.z *= 0.995;
    
    // Decrease lifespan
    lifeRef.current -= delta;
    
    // Add spin to the cannonball - faster rotation for better visual effect
    ballRef.current.rotation.x += delta * 8;
    ballRef.current.rotation.z += delta * 5;
    
    // Log trajectory data at regular intervals for debugging
    if (Math.floor(elapsedTime * 10) % 10 === 0) {
      console.log(`Cannonball at t=${elapsedTime.toFixed(1)}s: 
        Position: (${ballRef.current.position.x.toFixed(1)}, ${ballRef.current.position.y.toFixed(1)}, ${ballRef.current.position.z.toFixed(1)})
        Velocity: (${velocity.x.toFixed(1)}, ${velocity.y.toFixed(1)}, ${velocity.z.toFixed(1)})`
      );
    }
    
    // Auto-remove when lifespan is up
    if (lifeRef.current <= 0) {
      // Execute callback if provided
      if (onHit) onHit();
    }
    
    // Check if cannonball has fallen into the water - raised to -1 for better visibility
    if (ballRef.current.position.y < -1) {
      // Create water splash effect
      console.log("Splash! Cannonball hit water at", 
        `(${ballRef.current.position.x.toFixed(1)}, ${ballRef.current.position.y.toFixed(1)}, ${ballRef.current.position.z.toFixed(1)})`);
      
      // Immediately set lifespan to zero to remove cannonball
      lifeRef.current = 0;
      if (onHit) onHit();
      
      // Immediately remove cannonball mesh from scene
      if (ballRef.current && ballRef.current.parent) {
        ballRef.current.parent.remove(ballRef.current);
      }
      
      // Also move it far away to ensure it's completely gone
      ballRef.current.position.set(0, -1000, 0);
    }
  });
  
  return (
    // Use an absolute positioned group (not relative to ship)
    <group position={[0, 0, 0]}>
      {/* Cannonball mesh */}
      <mesh 
        ref={ballRef}
        castShadow
        scale={[
          SCALE.CANNONBALL * MODEL_ADJUSTMENT.CANNONBALL, 
          SCALE.CANNONBALL * MODEL_ADJUSTMENT.CANNONBALL, 
          SCALE.CANNONBALL * MODEL_ADJUSTMENT.CANNONBALL
        ]}
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
          width={1.5 * SCALE.EFFECTS.TRAIL}
          color={'#777777'}
          length={8 * SCALE.EFFECTS.TRAIL_LENGTH}
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