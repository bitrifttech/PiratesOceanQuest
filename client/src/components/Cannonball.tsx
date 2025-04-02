import { useRef, useEffect } from "react";
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
  const velocityRef = useRef<THREE.Vector3>(direction.clone().normalize().multiplyScalar(speed));
  
  // Initial position
  useEffect(() => {
    if (ballRef.current && position) {
      ballRef.current.position.copy(position);
    }
  }, [position]);
  
  // Update cannonball position and apply physics
  useFrame((_, delta) => {
    if (!ballRef.current) return;
    
    // Move cannonball
    const velocity = velocityRef.current;
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
  });
  
  return (
    <group>
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