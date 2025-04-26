import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Trail } from "@react-three/drei";
import { SCALE, MODEL_ADJUSTMENT } from "../lib/constants";
import { useEnemies } from "../lib/stores/useEnemies";
import { environmentCollisions } from "../lib/collision";

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
  
  // Initialize position without logging
  useEffect(() => {
    if (ballRef.current) {
      // Set initial position directly to avoid being parented to the ship
      ballRef.current.position.copy(localPosition);
      
      // No logging for better performance
    }
  }, [localPosition]);
  
  // Get enemy damage function
  const damageEnemy = useEnemies((state) => state.damageEnemy);
  const enemies = useEnemies((state) => state.enemies);
  
  // Hit detection status
  const hitDetected = useRef<boolean>(false);

  // Update cannonball position and apply physics independently of ship
  useFrame((_, delta) => {
    if (!ballRef.current || hitDetected.current) return;
    
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
    
    // Get current cannonball position
    const cannonballPosition = ballRef.current.position.clone();
    
    // Check for collisions with environmental features first
    // Use a smaller hit radius for more precise collision detection
    const hitRadius = 1.5; // Units - reduced for precision
    
    // Adjust hit detection based on cannonball velocity and height
    // This prevents unrealistic collisions when cannonballs are high above features
    let effectiveHitRadius = hitRadius;
    
    // Height-based collision adjustment - cannonballs flying high should not collide with low features
    const heightThreshold = 15; // Minimum height to start reducing collision probability
    if (cannonballPosition.y > heightThreshold) {
      // Reduce effective hit radius based on height (cannonballs in arc are less likely to hit)
      effectiveHitRadius *= Math.max(0.1, 1 - (cannonballPosition.y - heightThreshold) / 30);
    }
    
    // Check for environment collisions with the adjusted hit radius
    const environmentCollision = environmentCollisions.checkPointCollision(cannonballPosition, effectiveHitRadius);
    if (environmentCollision && !hitDetected.current) {
      // Mark as hit to prevent multiple hits
      hitDetected.current = true;
      
      // Log collision with environment including cannonball position and adjusted hit radius
      console.log(`[CANNONBALL] Hit ${environmentCollision.type} at (${cannonballPosition.x.toFixed(2)}, ${cannonballPosition.y.toFixed(2)}, ${cannonballPosition.z.toFixed(2)}) with radius ${effectiveHitRadius.toFixed(2)}`);
      
      // Store hit velocity for impact effects (faster cannonballs have more dramatic effects)
      const hitVelocity = velocity.length();
      
      // Notify about impact velocity 
      console.log(`[CANNONBALL] Impact velocity: ${hitVelocity.toFixed(2)}`);
      
      // Create a small explosion effect
      // TODO: Add explosion effect
      
      // Trigger callback to remove cannonball
      if (onHit) onHit();
      
      // Remove cannonball immediately
      if (ballRef.current && ballRef.current.parent) {
        ballRef.current.parent.remove(ballRef.current);
      }
      
      // Skip enemy collision checks if we already hit the environment
      return;
    }
    
    // If we didn't hit the environment, check for collisions with enemy ships
    // Use a more precise hit radius for ships based on velocity and distance
    const enemyHitRadius = 8.0; // Larger radius for enemy ships since they're bigger than cannonballs
    
    // Check each enemy for collisions
    for (const enemy of enemies) {
      // Calculate distance to enemy
      const distance = cannonballPosition.distanceTo(enemy.position);
      
      // Height-adjusted hit detection - consider vertical position relative to ship
      const heightDifference = Math.abs(cannonballPosition.y - enemy.position.y);
      const heightAdjustedHitRadius = 
        heightDifference < 5 ? enemyHitRadius : // Full hit radius when close to ship height
        enemyHitRadius * Math.max(0.2, 1 - (heightDifference - 5) / 15); // Reduce with height difference
      
      // If distance is less than adjusted hit radius, we have a hit
      if (distance < heightAdjustedHitRadius && !hitDetected.current) {
        // Mark as hit to prevent multiple hits
        hitDetected.current = true;
        
        // Calculate damage based on velocity (faster cannonballs do more damage)
        const impactVelocity = velocity.length();
        const baseDamage = 20; // Base damage value
        const velocityMultiplier = Math.min(1.5, Math.max(0.7, impactVelocity / 30)); // 0.7-1.5x multiplier
        const finalDamage = Math.round(baseDamage * velocityMultiplier);
        
        // Apply damage to enemy
        damageEnemy(enemy.id, finalDamage);
        
        // Log hit details
        console.log(`[CANNONBALL] Hit enemy ship ${enemy.id} for ${finalDamage} damage (velocity: ${impactVelocity.toFixed(2)})`);
        
        // Trigger callback to remove cannonball
        if (onHit) onHit();
        
        // Remove cannonball immediately
        if (ballRef.current && ballRef.current.parent) {
          ballRef.current.parent.remove(ballRef.current);
        }
        
        // Exit loop after first hit
        break;
      }
    }
    
    // Auto-remove when lifespan is up
    if (lifeRef.current <= 0) {
      // Execute callback if provided
      if (onHit) onHit();
    }
    
    // Check if cannonball has fallen into the water - raised to -1 for better visibility
    if (ballRef.current.position.y < -1) {
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