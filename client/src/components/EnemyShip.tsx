import { useRef, useEffect, memo, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { useShipEvents } from "../lib/stores/useShipEvents";
import CustomModel from "./CustomModel";
import Cannonball from "./Cannonball";
import WaterSplashEffect from "./WaterSplashEffect";
import { SCALE, MODEL_ADJUSTMENT, STATIC } from "../lib/constants";
import { collisionHandler } from "../lib/services/CollisionHandler";
import { BVHCollisionService } from "../lib/services/BVHCollisionService";
import { MeshCollisionRegistry } from "../lib/services/MeshCollisionRegistry";
import { ENEMY_AI, SHIP_PHYSICS, WEAPONS } from "../lib/config/gameBalance";

interface EnemyShipProps {
  id: string;
  initialPosition: THREE.Vector3;
  initialRotation: THREE.Euler;
}

/**
 * Completely rebuilt enemy ship component that correctly handles orientation and movement
 */
const EnemyShip = memo(({ id, initialPosition, initialRotation }: EnemyShipProps) => {
  // References
  const shipRef = useRef<THREE.Group>(null);
  const positionRef = useRef<THREE.Vector3>(initialPosition.clone());
  const rotationRef = useRef<THREE.Euler>(initialRotation.clone());
  const initialized = useRef<boolean>(false);
  
  // Collision and combat references
  const collisionCooldown = useRef<number>(0);
  const cannonCooldownRef = useRef<number>(0);
  
  // Obstacle avoidance references
  const avoidanceCheckTimer = useRef<number>(0);
  const currentAvoidanceSteer = useRef<number>(0); // Current avoidance steering angle
  const lastObstacleDirection = useRef<'left' | 'right' | null>(null); // Remember which way we were avoiding
  
  // Get player position for AI behavior
  const playerPosition = usePlayer((state) => state.position);
  
  // Ship movement parameters from gameBalance config
  const speed = ENEMY_AI.MOVEMENT_SPEED;
  const rotationSpeed = ENEMY_AI.ROTATION_SPEED;
  const detectionRange = ENEMY_AI.DETECTION_RANGE;
  const canFireRange = ENEMY_AI.CAN_FIRE_RANGE;
  const optimalRange = ENEMY_AI.OPTIMAL_RANGE;
  const minimumRange = ENEMY_AI.MINIMUM_RANGE;
  
  // Cache squared distances to avoid Math.sqrt in distance checks
  const detectionRangeSq = detectionRange * detectionRange;
  const canFireRangeSq = canFireRange * canFireRange;
  const optimalRangeSq = optimalRange * optimalRange;
  const minimumRangeSq = minimumRange * minimumRange;
  
  // Obstacle avoidance parameters
  const lookAheadDistance = ENEMY_AI.AVOIDANCE_LOOK_AHEAD;
  const whiskerAngle = ENEMY_AI.AVOIDANCE_WHISKER_ANGLE;
  const whiskerLength = ENEMY_AI.AVOIDANCE_WHISKER_LENGTH;
  const avoidanceStrength = ENEMY_AI.AVOIDANCE_STRENGTH;
  const avoidanceCheckInterval = ENEMY_AI.AVOIDANCE_CHECK_INTERVAL;
  const steerSmoothing = ENEMY_AI.AVOIDANCE_STEER_SMOOTHING;
  
  /**
   * Check for obstacles in a given direction using collision detection
   * Returns distance to obstacle if found, or Infinity if clear
   * Only considers above-water obstacles (y > 0)
   */
  const checkObstacleInDirection = useCallback((
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number
  ): { distance: number; hit: boolean } => {
    // Check multiple points along the ray for collisions
    const steps = 5;
    const stepSize = maxDistance / steps;
    const WATER_LEVEL = 0; // Only detect obstacles above water
    
    for (let i = 1; i <= steps; i++) {
      const checkPos = origin.clone().add(
        direction.clone().multiplyScalar(stepSize * i)
      );
      
      // Use BVH collision if available, otherwise use legacy
      if (MeshCollisionRegistry.isInitialized()) {
        const collision = BVHCollisionService.checkSphereCollision(
          checkPos, 
          SHIP_PHYSICS.ENEMY_COLLISION_RADIUS
        );
        // BVHCollisionService already filters underwater collisions
        if (collision.isColliding) {
          return { distance: stepSize * i, hit: true };
        }
      } else {
        // Check against collision handler features
        // Only consider features that have above-water portions
        const features = collisionHandler.getFeatures();
        for (const feature of features) {
          const dx = checkPos.x - feature.x;
          const dz = checkPos.z - feature.z;
          const distSq = dx * dx + dz * dz;
          // Use smaller radius for above-water collision to account for underwater portions
          const featureRadius = (feature.scale || 1) * 5; // Reduced from 8 for above-water only
          const combinedRadius = featureRadius + SHIP_PHYSICS.ENEMY_COLLISION_RADIUS;
          if (distSq < combinedRadius * combinedRadius) {
            return { distance: stepSize * i, hit: true };
          }
        }
      }
    }
    
    return { distance: Infinity, hit: false };
  }, []);
  
  /**
   * Calculate obstacle avoidance steering
   * Returns an angle offset to apply to the current heading
   */
  const calculateObstacleAvoidance = useCallback((
    position: THREE.Vector3,
    currentHeading: number,
    targetAngle: number
  ): number => {
    // Forward direction based on current heading
    const forwardDir = new THREE.Vector3(
      Math.sin(currentHeading),
      0,
      Math.cos(currentHeading)
    );
    
    // Check forward
    const forwardCheck = checkObstacleInDirection(position, forwardDir, lookAheadDistance);
    
    // If no obstacle ahead, no avoidance needed
    if (!forwardCheck.hit) {
      // Gradually reduce avoidance steering
      return currentAvoidanceSteer.current * (1 - steerSmoothing * 2);
    }
    
    // Check left whisker
    const leftAngle = currentHeading - whiskerAngle;
    const leftDir = new THREE.Vector3(
      Math.sin(leftAngle),
      0,
      Math.cos(leftAngle)
    );
    const leftCheck = checkObstacleInDirection(position, leftDir, whiskerLength);
    
    // Check right whisker
    const rightAngle = currentHeading + whiskerAngle;
    const rightDir = new THREE.Vector3(
      Math.sin(rightAngle),
      0,
      Math.cos(rightAngle)
    );
    const rightCheck = checkObstacleInDirection(position, rightDir, whiskerLength);
    
    // Determine which way to steer
    let steerDirection = 0;
    
    // If both sides are clear, pick the one that's more aligned with target
    if (!leftCheck.hit && !rightCheck.hit) {
      // Normalize target angle difference
      let angleDiffToTarget = targetAngle - currentHeading;
      while (angleDiffToTarget > Math.PI) angleDiffToTarget -= Math.PI * 2;
      while (angleDiffToTarget < -Math.PI) angleDiffToTarget += Math.PI * 2;
      
      // Steer toward the target direction
      steerDirection = angleDiffToTarget > 0 ? 1 : -1;
      
      // Remember which way we're going to maintain consistency
      lastObstacleDirection.current = steerDirection > 0 ? 'right' : 'left';
    }
    // If only left is clear, steer left
    else if (!leftCheck.hit) {
      steerDirection = -1;
      lastObstacleDirection.current = 'left';
    }
    // If only right is clear, steer right
    else if (!rightCheck.hit) {
      steerDirection = 1;
      lastObstacleDirection.current = 'right';
    }
    // Both sides blocked - steer harder in the direction with more space
    else {
      steerDirection = leftCheck.distance > rightCheck.distance ? -1 : 1;
      lastObstacleDirection.current = steerDirection > 0 ? 'right' : 'left';
    }
    
    // Calculate avoidance intensity based on distance to obstacle
    // Closer obstacles = stronger avoidance
    const closestDistance = Math.min(forwardCheck.distance, leftCheck.distance, rightCheck.distance);
    const urgency = 1 - (closestDistance / lookAheadDistance);
    const avoidanceIntensity = urgency * avoidanceStrength;
    
    // Return the steering angle offset
    return steerDirection * avoidanceIntensity;
  }, [checkObstacleInDirection, lookAheadDistance, whiskerAngle, whiskerLength, avoidanceStrength, steerSmoothing]);
  
  // Peaceful start timer (seconds) - when positive, ship won't attack
  const peacefulStartTimerRef = useRef<number | undefined>(undefined);
  
  // Update the enemy in the game state
  const moveEnemy = useEnemies((state) => state.moveEnemy);
  
  // Memoize cannonball creation to prevent unnecessary re-renders
  const createCannonball = useCallback((
    position: THREE.Vector3,
    direction: THREE.Vector3,
    cannonballId: string
  ) => (
    <Cannonball
      key={cannonballId}
      position={position}
      direction={direction}
      speed={35}
      lifespan={6.0}
      sourceId={id}
      onSplash={(splashPos) => {
        // Add splash to effect queue (renders independently of cannonball)
        const splashId = `${cannonballId}-splash`;
        setSplashEffects(prev => [...prev, { id: splashId, position: splashPos.clone() }]);
      }}
      onHit={() => {
        setCannonballs(prev => prev.filter(ball => ball.key !== cannonballId));
      }}
    />
  ), [id]);

  // State to manage cannonballs - memoized to prevent unnecessary re-renders
  const [cannonballs, setCannonballs] = useState<JSX.Element[]>([]);
  
  // State for water splash effects (independent of cannonball lifecycle)
  const [splashEffects, setSplashEffects] = useState<{ id: string; position: THREE.Vector3 }[]>([]);
  
  // Initialize on first render
  useEffect(() => {
    if (!initialized.current) {
      const enemies = useEnemies.getState().enemies;
      const enemyData = enemies.find(e => e.id === id);
      
      if (enemyData?.peacefulStartTimer) {
        // Initialize peaceful start timer if provided in enemy data
        peacefulStartTimerRef.current = enemyData.peacefulStartTimer;
      }
      
      initialized.current = true;
    }
  }, [id]);
  
  // AI movement behavior in the game loop
  useFrame((_, delta) => {
    if (!shipRef.current || !playerPosition || !initialized.current) return;
    
    // Current position and rotation
    const currentPos = positionRef.current;
    const currentRot = rotationRef.current;
    
    // Calculate squared distance to player (faster than distanceTo)
    const dx = playerPosition.x - currentPos.x;
    const dz = playerPosition.z - currentPos.z;
    const distanceSqToPlayer = dx * dx + dz * dz;
    const distanceToPlayer = Math.sqrt(distanceSqToPlayer);
    
    // Ship collision parameters from gameBalance config
    const enemyShipRadius = SHIP_PHYSICS.ENEMY_COLLISION_RADIUS;
    const playerShipRadius = SHIP_PHYSICS.PLAYER_COLLISION_RADIUS;
    const collisionDamage = WEAPONS.COLLISION_DAMAGE;
    const collisionRadiusSum = enemyShipRadius + playerShipRadius;
    const collisionRadiusSumSq = collisionRadiusSum * collisionRadiusSum;
    
    // Track collision state and add cooldown for damage
    if (collisionCooldown.current > 0) {
      collisionCooldown.current -= delta;
    }
    
    // Proximity alert - using squared distances for better performance
    const warningDistance = collisionRadiusSum * ENEMY_AI.WARNING_DISTANCE_MULTIPLIER;
    const collisionWarningDistanceSq = warningDistance * warningDistance;
    const inCollisionDanger = distanceSqToPlayer < collisionWarningDistanceSq;
    
    // Check for actual collision with player ship using squared distance
    if (distanceSqToPlayer < collisionRadiusSumSq) {
      // Only apply damage if not in cooldown to prevent rapid damage
      if (collisionCooldown.current <= 0) {
        // Damage both ships
        const takeDamage = usePlayer.getState().takeDamage;
        takeDamage(collisionDamage);
        
        // Damage this enemy ship too
        const enemiesState = useEnemies.getState();
        enemiesState.damageEnemy(id, collisionDamage);
        
        // Trigger crew reactions
        const { enemyHit, playerHit } = useShipEvents.getState();
        enemyHit(id); // Enemy ship crew reacts to being hit
        playerHit(); // Player ship crew also reacts
        
        // Set collision cooldown to avoid rapid damage
        collisionCooldown.current = ENEMY_AI.COLLISION_COOLDOWN;
        
      }
      
      // Apply stronger bounce effect - push ships away from each other
      // Do this regardless of damage cooldown to ensure ships separate
      const bounceDirection = new THREE.Vector3()
        .subVectors(currentPos, playerPosition)
        .normalize()
        .multiplyScalar(ENEMY_AI.BOUNCE_FORCE);
      
      // Apply bounce to enemy position
      currentPos.add(bounceDirection);
      
    }
    
    // Improved AI behavior with tactical movement and obstacle avoidance
    if (distanceToPlayer < detectionRange) {
      // Calculate angle to player - direction we need to either face or flee from
      const angleToPlayer = Math.atan2(
        playerPosition.x - currentPos.x,
        playerPosition.z - currentPos.z
      );
      
      // Decide whether to approach, maintain distance, or retreat
      let targetAngle = angleToPlayer;
      let movementSpeed = speed;
      
      // If too close to player or in collision warning, turn around and retreat
      if (distanceToPlayer < minimumRange || inCollisionDanger) {
        // Reverse the direction to move away
        targetAngle = angleToPlayer + Math.PI; // Turn 180° away
        movementSpeed = speed * ENEMY_AI.RETREAT_SPEED_MULTIPLIER; // Move away faster
        
        // Trigger crew near collision animation when collision danger detected
        if (inCollisionDanger && Math.random() < 0.05) {
          const { enemyNearCollision } = useShipEvents.getState();
          enemyNearCollision(id);
        }
      } 
      // Otherwise, if within optimal firing range, circle the player
      else if (distanceToPlayer < optimalRange) {
        // Calculate a perpendicular angle for circling (90 degrees offset)
        targetAngle = angleToPlayer + Math.PI / 2;
        // Randomly reverse circle direction occasionally
        if (Math.random() < 0.01) {
          targetAngle = angleToPlayer - Math.PI / 2;
        }
        movementSpeed = speed * ENEMY_AI.CIRCLE_SPEED_MULTIPLIER; // Slower circular movement
      }
      // If beyond optimal range but within detection, approach cautiously
      else {
        // Approach normally
        targetAngle = angleToPlayer;
        movementSpeed = speed * ENEMY_AI.APPROACH_SPEED_MULTIPLIER; // Slightly slower approach
      }
      
      // ========================================
      // OBSTACLE AVOIDANCE LOGIC
      // ========================================
      // Periodically check for obstacles and calculate avoidance steering
      avoidanceCheckTimer.current += delta;
      if (avoidanceCheckTimer.current >= avoidanceCheckInterval) {
        avoidanceCheckTimer.current = 0;
        
        const avoidanceOffset = calculateObstacleAvoidance(
          currentPos,
          currentRot.y,
          targetAngle
        );
        
        // Smooth the avoidance steering to prevent jerky movement
        currentAvoidanceSteer.current = currentAvoidanceSteer.current * (1 - steerSmoothing) + 
                                         avoidanceOffset * steerSmoothing;
      }
      
      // Apply obstacle avoidance to the target angle
      // The stronger the avoidance, the more we deviate from the target
      const avoidanceAdjustedAngle = targetAngle + currentAvoidanceSteer.current;
      
      // Gradually rotate toward the avoidance-adjusted target angle with smooth turning
      const currentAngle = currentRot.y;
      let angleDiff = avoidanceAdjustedAngle - currentAngle;
      
      // Normalize angle difference to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      // Apply smooth rotation toward target angle
      // When avoiding obstacles, turn faster for more responsive navigation
      const turnMultiplier = Math.abs(currentAvoidanceSteer.current) > 0.1 ? 2.0 : 1.0;
      const newRotY = currentAngle + Math.sign(angleDiff) * 
                      Math.min(Math.abs(angleDiff), rotationSpeed * delta * 60 * turnMultiplier);
      
      // Update rotation
      currentRot.set(0, newRotY, 0);
      
      // Movement direction is based on rotation
      // Since we rotate the model 180° (Math.PI) in the return JSX below,
      // we need to adjust our direction calculation to match the visual "forward" of the ship
      const direction = new THREE.Vector3(
        Math.sin(newRotY),
        0,
        Math.cos(newRotY)
      );
      
      // Calculate velocity with dynamic speed adjustment
      const velocity = direction.clone().multiplyScalar(movementSpeed * delta * 60);
      
      // Calculate the future position to check for collisions
      const futurePosition = currentPos.clone().add(velocity);
      
      // Ship collision radius from gameBalance config
      const shipRadius = SHIP_PHYSICS.ENEMY_COLLISION_RADIUS;
      
      // Use BVH for precise mesh-level collision detection if meshes are registered
      const useBVH = MeshCollisionRegistry.isInitialized();
      
      let hasCollision = false;
      let safePosition: THREE.Vector3 | null = null;
      let pushDirection: THREE.Vector3 | null = null;
      
      if (useBVH) {
        // Use BVH mesh-level collision detection
        const collision = BVHCollisionService.checkSphereCollision(futurePosition, shipRadius);
        
        if (collision.isColliding) {
          hasCollision = true;
          safePosition = BVHCollisionService.calculateSafePosition(
            currentPos,
            collision,
            shipRadius,
            SHIP_PHYSICS.SAFETY_MARGIN
          );
          pushDirection = collision.pushDirection || null;
        }
      } else {
        // Fallback to legacy collision handler
        const collision = collisionHandler.handleCollision(
          futurePosition, 
          shipRadius, 
          false, // Not player ship
          id // Enemy ID for crew reactions
        );
        
        if (collision) {
          hasCollision = true;
          safePosition = collision;
        }
      }
      
      if (hasCollision && safePosition) {
        // We have a collision, use the safe position
        // Trigger crew reaction for near collision
        const { enemyNearCollision } = useShipEvents.getState();
        enemyNearCollision(id);
        
        // Store original Y before collision response
        const originalY = currentPos.y;
        
        // Update position to safe position
        currentPos.copy(safePosition);
        
        // Reverse direction slightly to move away from obstacle
        // Zero out Y component to keep ships on water surface
        const bounceDirection = pushDirection 
          ? pushDirection.clone()
          : new THREE.Vector3().subVectors(currentPos, futurePosition).normalize();
        bounceDirection.y = 0; // Keep bounce horizontal only
        if (bounceDirection.length() > 0) {
          bounceDirection.normalize();
        }
        const bounceFactor = ENEMY_AI.BOUNCE_FACTOR; // How much to bounce
        
        // Apply bounce velocity (horizontal only)
        const bounceVelocity = bounceDirection.multiplyScalar(movementSpeed * delta * 60 * bounceFactor);
        currentPos.add(bounceVelocity);
        
        // Restore Y position to keep ship on water surface
        currentPos.y = originalY;
      } else {
        // No collision, apply normal velocity
        currentPos.add(velocity);
      }
      
    }
    
    // Update peaceful start timer if it exists
    if (peacefulStartTimerRef.current !== undefined && peacefulStartTimerRef.current > 0) {
      peacefulStartTimerRef.current -= delta;
      
      if (peacefulStartTimerRef.current <= 0) {
        peacefulStartTimerRef.current = 0; // Set to exactly zero to avoid negative values
      }
    }
    
    // Fire cannons if in range, cooldown is ready, and not in peaceful start period
    if (distanceToPlayer < canFireRange && 
        cannonCooldownRef.current <= 0 && 
        (peacefulStartTimerRef.current === undefined || peacefulStartTimerRef.current <= 0)) {
      // Get direction vector toward player for aiming cannons
      const toPlayerDirection = new THREE.Vector3()
        .subVectors(playerPosition, currentPos)
        .normalize();
      
      // Add slight randomness to aim (makes it possible for player to dodge)
      const spread = ENEMY_AI.CANNON_SPREAD;
      toPlayerDirection.x += (Math.random() - 0.5) * spread;
      toPlayerDirection.z += (Math.random() - 0.5) * spread;
      toPlayerDirection.normalize(); // Re-normalize after adding randomness
      
      // Set cannon firing position slightly above water at the ship's position
      const cannonPosition = new THREE.Vector3(
        currentPos.x,
        ENEMY_AI.CANNON_HEIGHT,
        currentPos.z
      );
      
      // Create a unique ID for this cannonball
      const cannonballId = `${id}-cannonball-${Date.now()}`;
      
      // Add the cannonball to state using memoized creation
      const newCannonball = createCannonball(cannonPosition, toPlayerDirection, cannonballId);
      setCannonballs(prev => [...prev, newCannonball]);
      
      // Set cooldown for next cannon fire (random to make it less predictable)
      const cooldownRange = ENEMY_AI.FIRE_COOLDOWN_MAX - ENEMY_AI.FIRE_COOLDOWN_MIN;
      cannonCooldownRef.current = ENEMY_AI.FIRE_COOLDOWN_MIN + Math.random() * cooldownRange;
    }
    
    // Update cannon cooldown
    if (cannonCooldownRef.current > 0) {
      cannonCooldownRef.current -= delta;
    }
    
    // Use a Y position of 0 - CustomModel will adjust height based on modelHeightOffset
    currentPos.y = 0;
    
    // Update refs
    positionRef.current = currentPos;
    rotationRef.current = currentRot;
    
    // Update position and rotation in the store
    moveEnemy(id, currentPos.clone(), currentRot.clone());
    
    // Apply position and rotation to the 3D model
    shipRef.current.position.copy(currentPos);
    shipRef.current.rotation.copy(currentRot);
  });
  
  return (
    <>
      {/* Render all cannonballs fired by this enemy ship */}
      {cannonballs}
      
      {/* Render water splash effects (independent of cannonball lifecycle) */}
      {splashEffects.map((splash) => (
        <WaterSplashEffect
          key={splash.id}
          position={splash.position}
          size={1.5}
          duration={1.8}
          onComplete={() => {
            // Remove splash from queue when effect completes
            setSplashEffects(prev => prev.filter(s => s.id !== splash.id));
          }}
        />
      ))}
      
      <group 
        ref={shipRef} 
        position={positionRef.current.toArray()} 
        rotation={rotationRef.current.toArray()}
      >
        {/* Ship model - Positioned to match player ship positioning standards */}
        <CustomModel
          path="/models/pirate_ship.glb" 
          scale={useGameState.getState().shipScale * SCALE.PLAYER_SHIP * 1.25} // 25% larger than player ship
          modelAdjustment={MODEL_ADJUSTMENT.SHIP}
          modelHeightOffset={STATIC.SHIP_OFFSET} // Use same offset as player ship
          rotation={[0, Math.PI, 0]} // Rotate 180 degrees so the bow points forward
          bob={true}
          bobHeight={0.2}
          bobSpeed={1.0}
          castShadow={true}
          receiveShadow={true}
          onLoad={() => {
            // Model loaded
          }}
        />
        
        {/* Enemy ship crew system disabled */}
      </group>
    </>
  );
});

export default EnemyShip;