import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Trail } from "@react-three/drei";
import { SCALE, MODEL_ADJUSTMENT } from "../lib/constants";
import { useEnemies } from "../lib/stores/useEnemies";
import { usePlayer } from "../lib/stores/usePlayer";
import { usePowerUps } from "../lib/stores/usePowerUps";
import { useGameState } from "../lib/stores/useGameState";
import { environmentCollisions } from "../lib/collision";
import { MeshCollisionRegistry } from "../lib/services/MeshCollisionRegistry";
import { BVHCollisionService } from "../lib/services/BVHCollisionService";
import { logger } from "../lib/utils/logger";
import ExplosionEffect from "./ExplosionEffect";
import WaterSplashEffect from "./WaterSplashEffect";
import ShipExplosionEffect from "./ShipExplosionEffect";

interface CannonballProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed?: number;
  onHit?: () => void;
  lifespan?: number; // seconds before auto-removal
  sourceId?: string; // ID of the entity that fired this cannonball (for avoiding self-damage)
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
  lifespan = 2.0,
  sourceId
}: CannonballProps) => {
  // References
  const ballRef = useRef<THREE.Mesh>(null);
  const lifeRef = useRef<number>(lifespan);
  const startTime = useRef<number>(Date.now());
  
  // Store the initial position and velocity locally to prevent them from being affected by the parent ship
  const [localPosition] = useState<THREE.Vector3>(position.clone());
  
  // Check for long_range power-up for player cannonballs
  let adjustedSpeed = speed;
  let adjustedLifespan = lifespan;
  
  // Only apply power-ups for player cannonballs (not enemy cannonballs)
  if (!sourceId || !sourceId.includes('enemy')) {
    const powerUpsState = usePowerUps.getState();
    
    // Apply long range boost if active
    if (powerUpsState.hasPowerUp('long_range')) {
      const rangeMultiplier = powerUpsState.getPowerUpValue('long_range') || 1;
      adjustedSpeed = speed * rangeMultiplier;
      adjustedLifespan = lifespan * rangeMultiplier;
    }
  }
  
  // Create velocity with the upward component already included from the direction
  // This preserves any upward angle set by the ship's cannons
  const [velocity] = useState<THREE.Vector3>(direction.clone().normalize().multiplyScalar(adjustedSpeed));

  // Check if this cannonball has an upward arc in its initial direction
  const hasUpwardComponent = direction.y > 0;
  
  // Initialize the cannonball properties
  useEffect(() => {
    // Initialize the adjusted lifespan
    lifeRef.current = adjustedLifespan;
    
    if (ballRef.current) {
      // Set initial position directly to avoid being parented to the ship
      ballRef.current.position.copy(localPosition);
      
      // No logging for better performance
    }
  }, [localPosition, adjustedLifespan]);
  
  // Get enemy damage function
  const damageEnemy = useEnemies((state) => state.damageEnemy);
  const enemies = useEnemies((state) => state.enemies);
  
  // Hit detection status
  const hitDetected = useRef<boolean>(false);
  
  // Track effect states
  const [showExplosion, setShowExplosion] = useState<boolean>(false);
  const [showShipExplosion, setShowShipExplosion] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [effectPosition, setEffectPosition] = useState<THREE.Vector3 | null>(null);

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
    // Cannonball collision radius - small for precise hits
    const cannonballRadius = 0.5; // Small radius for the cannonball itself
    
    // Use BVH for precise mesh-level collision if available
    const useBVH = MeshCollisionRegistry.isInitialized();
    let hasEnvironmentCollision = false;
    let collisionType = '';
    
    if (useBVH) {
      // Use BVH mesh-level collision for accurate environment hits
      const bvhCollision = BVHCollisionService.checkSphereCollision(cannonballPosition, cannonballRadius);
      if (bvhCollision.isColliding) {
        hasEnvironmentCollision = true;
        collisionType = bvhCollision.featureType || 'environment';
      }
    } else {
      // Fallback to legacy 2D circle collision
      const legacyCollision = environmentCollisions.checkPointCollision(cannonballPosition, cannonballRadius);
      if (legacyCollision) {
        hasEnvironmentCollision = true;
        collisionType = legacyCollision.type;
      }
    }
    
    if (hasEnvironmentCollision && !hitDetected.current) {
      // Mark as hit to prevent multiple hits
      hitDetected.current = true;
      
      logger.debug('cannonball', `Hit ${collisionType} at (${cannonballPosition.x.toFixed(1)}, ${cannonballPosition.z.toFixed(1)})`);
      
      // Create explosion effect at the impact point
      setEffectPosition(cannonballPosition.clone());
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
      // Skip if this enemy is the source of the cannonball (prevent self-damage)
      if (sourceId && enemy.id === sourceId) {
        continue;
      }
      
      // Calculate distance to enemy
      const distance = cannonballPosition.distanceTo(enemy.position);
      
      // Enemy ship collision radius - matches visual ship size at scale 4.5
      // Ship is approximately 3-4 units wide, so we use 3 for the hit radius
      const enemyShipHitRadius = 3; // Radius at which cannonball hits the ship
      const effectiveHitRadius = cannonballRadius + enemyShipHitRadius; // = 3.5 units combined
      
      // If distance is less than effective hit radius, we have a hit
      if (distance < effectiveHitRadius && !hitDetected.current) {
        // Mark as hit to prevent multiple hits
        hitDetected.current = true;
        
        // Check for double damage power-up from player ship
        let damage = 20; // Base damage
        
        // Check for one-shot kill debug feature
        const gameState = useGameState.getState();
        if (gameState.oneShotKill && (!sourceId || !sourceId.includes('enemy'))) {
          // Set damage to a very high value to guarantee a kill
          damage = 1000;
        } 
        // Only apply power-ups for player cannonballs (not enemy cannonballs)
        else if (!sourceId || !sourceId.includes('enemy')) {
          const powerUpsState = usePowerUps.getState();
          
          // Apply damage multiplier if double_damage is active
          if (powerUpsState.hasPowerUp('double_damage')) {
            const multiplier = powerUpsState.getPowerUpValue('double_damage') || 1;
            damage = Math.round(damage * multiplier);
            
            // Consume one shot from the double_damage power-up
            powerUpsState.consumeShot('double_damage');
          }
        }
        
        // Apply damage to enemy
        damageEnemy(enemy.id, damage);
        
        logger.debug('cannonball', `Hit enemy ship ${enemy.id}! Applied ${damage} damage.`);
        
        // Create ship explosion effect at the impact point
        setEffectPosition(cannonballPosition.clone());
        setShowShipExplosion(true);
        
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
      const isEnemyCannonball = localPosition.distanceTo(playerPosition) > 10;
      
      if (isEnemyCannonball) {
        // Calculate distance to player
        const distanceToPlayer = cannonballPosition.distanceTo(playerPosition);
        
        // Player ship collision radius - matches visual ship size at scale 4.5
        const playerHitRadius = cannonballRadius + 3; // = 3.5 units total
        
        // If distance is less than hit radius, we have a hit
        if (distanceToPlayer < playerHitRadius && !hitDetected.current) {
          // Mark as hit to prevent multiple hits
          hitDetected.current = true;
          
          // Apply damage to player (correctly access from the state we already retrieved)
          playerState.takeDamage(15); // 15 damage per enemy cannonball (slightly less than player's cannons)
          
          // Create ship explosion effect at the impact point
          setEffectPosition(cannonballPosition.clone());
          setShowShipExplosion(true);
          
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
    // Allow cannonballs to travel further out before hitting the water
    if (ballRef.current.position.y < -1 && !hitDetected.current) {
      // Mark as hit to prevent multiple splashes
      hitDetected.current = true;
      
      // Create splash effect at the water surface
      // Set Y to 0 for proper water level
      const splashPosition = new THREE.Vector3(
        ballRef.current.position.x,
        0, // Always at water level
        ballRef.current.position.z
      );
      
      // Set effect position and show splash
      setEffectPosition(splashPosition);
      setShowSplash(true);
      
      // Hide cannonball immediately but keep object for effect completion
      if (ballRef.current) {
        ballRef.current.visible = false;
      }
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
      
      {/* Explosion effect when cannonball hits land */}
      {showExplosion && effectPosition && (
        <ExplosionEffect
          position={effectPosition}
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
      
      {/* Fiery explosion effect when cannonball hits ships */}
      {showShipExplosion && effectPosition && (
        <ShipExplosionEffect
          position={effectPosition}
          size={4.0}
          duration={1.2}
          onComplete={() => {
            // Clean up when explosion finishes
            setShowShipExplosion(false);
            
            // Now remove the cannonball completely
            if (ballRef.current && ballRef.current.parent) {
              ballRef.current.parent.remove(ballRef.current);
            }
            
            // Execute callback if provided
            if (onHit) onHit();
          }}
        />
      )}
      
      {/* Splash effect when cannonball hits water */}
      {showSplash && effectPosition && (
        <WaterSplashEffect
          position={effectPosition}
          size={2.5}
          duration={1.2}
          onComplete={() => {
            // Clean up when splash finishes
            setShowSplash(false);
            
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