import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Trail } from "@react-three/drei";
import { SCALE, MODEL_ADJUSTMENT } from "../lib/constants";
import { useEnemies } from "../lib/stores/useEnemies";
import { usePlayer } from "../lib/stores/usePlayer";
import { environmentCollisions } from "../lib/collision";
import ExplosionEffect from "./ExplosionEffect";

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
  
  // Track explosion state
  const [showExplosion, setShowExplosion] = useState<boolean>(false);
  const [explosionPosition, setExplosionPosition] = useState<THREE.Vector3 | null>(null);

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
    // Fixed hit radius based on cannonball size
    const hitRadius = 2.0; // Units
    
    // Check for environment collisions
    const environmentCollision = environmentCollisions.checkPointCollision(cannonballPosition, hitRadius);
    if (environmentCollision && !hitDetected.current) {
      // Mark as hit to prevent multiple hits
      hitDetected.current = true;
      
      // Log collision with environment
      console.log(`[CANNONBALL] Hit ${environmentCollision.type} at (${environmentCollision.x}, ${environmentCollision.z})`);
      
      // Create explosion effect at the impact point
      setExplosionPosition(cannonballPosition.clone());
      setShowExplosion(true);
      
      // Hide the cannonball but don't remove it yet (explosion needs to finish)
      if (ballRef.current) {
        ballRef.current.visible = false;
      }
      
      // Skip enemy collision checks if we already hit the environment
      return;
    }
    
    // If we didn't hit the environment, check for collisions with enemy ships
    // Check each enemy for collisions
    for (const enemy of enemies) {
      // Calculate distance to enemy
      const distance = cannonballPosition.distanceTo(enemy.position);
      
      // If distance is less than hit radius, we have a hit
      if (distance < hitRadius && !hitDetected.current) {
        // Mark as hit to prevent multiple hits
        hitDetected.current = true;
        
        // Apply damage to enemy
        damageEnemy(enemy.id, 20); // 20 damage per cannonball
        
        console.log(`[CANNONBALL] Hit enemy ship ${enemy.id}! Applied 20 damage.`);
        
        // Create explosion effect at the impact point
        setExplosionPosition(cannonballPosition.clone());
        setShowExplosion(true);
        
        // Hide the cannonball but don't remove it yet (explosion needs to finish)
        if (ballRef.current) {
          ballRef.current.visible = false;
        }
        
        // Exit loop after first hit
        break;
      }
    }
    
    // Check if the cannonball hits the player ship (enemy cannonballs only hit player)
    // First determine if this is an enemy cannonball by checking its origin
    // If the cannonball was fired more than 15 units away from the player's position,
    // we assume it's an enemy cannonball and check for collision with the player
    
    // Safely get player position using store
    const playerState = usePlayer.getState();
    const playerPosition = playerState.position;
    
    if (playerPosition) {
      // Check if cannonball origin is far from player (enemy cannonball)
      const isEnemyCannonball = localPosition.distanceTo(playerPosition) > 15;
      
      if (isEnemyCannonball) {
        // Calculate distance to player
        const distanceToPlayer = cannonballPosition.distanceTo(playerPosition);
        
        // Set slightly larger hit radius for player to make it easier to hit
        const playerHitRadius = 8;
        
        // If distance is less than hit radius, we have a hit
        if (distanceToPlayer < playerHitRadius && !hitDetected.current) {
          // Mark as hit to prevent multiple hits
          hitDetected.current = true;
          
          // Apply damage to player (correctly access from the state we already retrieved)
          playerState.takeDamage(15); // 15 damage per enemy cannonball (slightly less than player's cannons)
          
          console.log(`[CANNONBALL] Enemy cannonball hit player! Applied 15 damage.`);
          
          // Create explosion effect at the impact point
          setExplosionPosition(cannonballPosition.clone());
          setShowExplosion(true);
          
          // Hide the cannonball but don't remove it yet (explosion needs to finish)
          if (ballRef.current) {
            ballRef.current.visible = false;
          }
        }
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
      
      {/* Explosion effect when cannonball hits something */}
      {showExplosion && explosionPosition && (
        <ExplosionEffect
          position={explosionPosition}
          size={3.5}
          duration={0.8}
          onComplete={() => {
            // Clean up when explosion finishes
            setShowExplosion(false);
            
            // Now remove the cannonball completely
            if (ballRef.current && ballRef.current.parent) {
              ballRef.current.parent.remove(ballRef.current);
            }
            
            // Execute callback if provided
            if (onHit) onHit();
          }}
        />
      )}
    </group>
  );
};

export default Cannonball;