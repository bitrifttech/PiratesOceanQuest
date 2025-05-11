import { useRef, useEffect, memo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { useShipEvents } from "../lib/stores/useShipEvents";
import CustomModel from "./CustomModel";
import Cannonball from "./Cannonball";
import CrewSystem from "./CrewSystem";
import { POSITION, SCALE, MODEL_ADJUSTMENT, STATIC } from "../lib/constants";
import { collisionHandler } from "../lib/services/CollisionHandler";

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
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const healthRef = useRef<number>(100);
  const initialized = useRef<boolean>(false);
  
  // Collision and combat references
  const collisionCooldown = useRef<number>(0);
  
  // Get the ship event state for this specific enemy ship
  const shipEvent = useShipEvents(state => state.enemyShipEvents[id] || 'sailing');
  const cannonballsRef = useRef<JSX.Element[]>([]);
  const cannonCooldownRef = useRef<number>(0);
  
  // Get player position for AI behavior
  const playerPosition = usePlayer((state) => state.position);
  
  // Ship movement parameters
  const speed = 0.05;
  const rotationSpeed = 0.01;
  const detectionRange = 80; // Units at which the enemy ship detects the player
  const canFireRange = 30; // Range at which enemy will fire cannons
  const optimalRange = 25; // Ideal distance to maintain from player
  const minimumRange = 15; // Minimum distance before retreating
  
  // Peaceful start timer (seconds) - when positive, ship won't attack
  const peacefulStartTimerRef = useRef<number | undefined>(undefined);
  
  // Update the enemy in the game state
  const moveEnemy = useEnemies((state) => state.moveEnemy);
  
  // State to manage cannonballs
  const [cannonballs, setCannonballs] = useState<JSX.Element[]>([]);
  
  // Initialize on first render
  useEffect(() => {
    if (!initialized.current) {
      const enemies = useEnemies.getState().enemies;
      const enemyData = enemies.find(e => e.id === id);
      
      if (enemyData?.peacefulStartTimer) {
        // Initialize peaceful start timer if provided in enemy data
        peacefulStartTimerRef.current = enemyData.peacefulStartTimer;
        console.log(`[ENEMY SHIP ${id}] Initializing with ${peacefulStartTimerRef.current}s peaceful start timer`);
      }
      
      console.log(`[ENEMY SHIP ${id}] Initializing at position ${JSON.stringify(positionRef.current)}`);
      initialized.current = true;
    }
  }, [id]);
  
  // AI movement behavior in the game loop
  useFrame((_, delta) => {
    if (!shipRef.current || !playerPosition || !initialized.current) return;
    
    // Current position and rotation
    const currentPos = positionRef.current;
    const currentRot = rotationRef.current;
    
    // Calculate distance to player
    const distanceToPlayer = currentPos.distanceTo(playerPosition);
    
    // Ship collision parameters - balanced values
    const enemyShipRadius = 12; // Collision radius matching player ship's balanced settings
    const playerShipRadius = 12; // Match the player ship's collision radius
    const collisionDamage = 10; // Damage on collision
    
    // Track collision state and add cooldown for damage
    if (collisionCooldown.current > 0) {
      collisionCooldown.current -= delta;
    }
    
    // Proximity alert - start evasive maneuvers when getting too close to player
    // This helps avoid collisions before they happen
    const collisionWarningDistance = (enemyShipRadius + playerShipRadius) * 1.5;
    const inCollisionDanger = distanceToPlayer < collisionWarningDistance;
    
    // Check for actual collision with player ship
    if (distanceToPlayer < (enemyShipRadius + playerShipRadius)) {
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
        collisionCooldown.current = 1.5; // 1.5 second cooldown
        
        console.log(`[COLLISION] Ship-to-ship collision! Both ships take ${collisionDamage} damage`);
      }
      
      // Apply stronger bounce effect - push ships away from each other
      // Do this regardless of damage cooldown to ensure ships separate
      const bounceDirection = new THREE.Vector3()
        .subVectors(currentPos, playerPosition)
        .normalize()
        .multiplyScalar(2.5); // Stronger bounce force
      
      // Apply bounce to enemy position
      currentPos.add(bounceDirection);
      
      // Log evasive action
      console.log(`[ENEMY SHIP ${id}] Collision detected! Taking evasive action.`);
    }
    
    // Improved AI behavior with tactical movement
    if (distanceToPlayer < detectionRange) {
      // Calculate angle to player - direction we need to either face or flee from
      const angleToPlayer = Math.atan2(
        playerPosition.x - currentPos.x,
        playerPosition.z - currentPos.z
      );
      
      // Decide whether to approach, maintain distance, or retreat
      let targetAngle = angleToPlayer;
      let movementSpeed = speed;
      let behaviorState = "approach"; // Default behavior
      
      // If too close to player or in collision warning, turn around and retreat
      if (distanceToPlayer < minimumRange || inCollisionDanger) {
        // Reverse the direction to move away
        targetAngle = angleToPlayer + Math.PI; // Turn 180° away
        movementSpeed = speed * 1.5; // Move away faster
        behaviorState = "retreat";
        
        // Log collision avoidance when first triggered
        if (inCollisionDanger && Math.random() < 0.05) {
          // Trigger crew near collision animation
          const { enemyNearCollision } = useShipEvents.getState();
          enemyNearCollision(id);
          
          console.log(`[ENEMY SHIP ${id}] Collision warning! Taking evasive action.`);
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
        movementSpeed = speed * 0.8; // Slower circular movement
        behaviorState = "circle";
      }
      // If beyond optimal range but within detection, approach cautiously
      else {
        // Approach normally
        targetAngle = angleToPlayer;
        movementSpeed = speed * 0.9; // Slightly slower approach
        behaviorState = "approach";
      }
      
      // Gradually rotate toward the target angle with smooth turning
      const currentAngle = currentRot.y;
      let angleDiff = targetAngle - currentAngle;
      
      // Normalize angle difference to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      // Apply smooth rotation toward target angle
      const newRotY = currentAngle + Math.sign(angleDiff) * 
                      Math.min(Math.abs(angleDiff), rotationSpeed * delta * 60);
      
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
      
      // Ship collision radius - should match the visual size
      const shipRadius = 12;
      
      // Check for collisions with environmental features
      // First check the potential new position
      const collision = collisionHandler.handleCollision(
        futurePosition, 
        shipRadius, 
        false, // Not player ship
        id // Enemy ID for crew reactions
      );
      
      if (collision) {
        // We have a collision, use the safe position provided by collision handler
        console.log(`[ENEMY SHIP ${id}] Collided with environment. Adjusting position.`);
        
        // Trigger crew reaction for near collision
        const { enemyNearCollision } = useShipEvents.getState();
        enemyNearCollision(id);
        
        // Update position to safe position
        currentPos.copy(collision);
        
        // Reverse direction slightly to move away from obstacle
        const bounceDirection = new THREE.Vector3().subVectors(currentPos, futurePosition).normalize();
        const bounceFactor = 0.5; // How much to bounce
        
        // Apply bounce velocity
        const bounceVelocity = bounceDirection.multiplyScalar(movementSpeed * delta * 60 * bounceFactor);
        currentPos.add(bounceVelocity);
      } else {
        // No collision, apply normal velocity
        currentPos.add(velocity);
      }
      
      // Log for debugging, but only occasionally
      if (Math.random() < 0.002) {
        console.log(`[ENEMY SHIP ${id}] Movement details: 
        - Behavior: ${behaviorState}
        - Angle to player: ${(angleToPlayer * 180 / Math.PI).toFixed(1)}°
        - Target angle: ${(targetAngle * 180 / Math.PI).toFixed(1)}°
        - Current rotation: ${(currentAngle * 180 / Math.PI).toFixed(1)}°
        - New rotation: ${(newRotY * 180 / Math.PI).toFixed(1)}°
        - Direction: (${direction.x.toFixed(2)}, ${direction.z.toFixed(2)})
        - Distance to player: ${distanceToPlayer.toFixed(1)} units`);
      }
    }
    
    // Update peaceful start timer if it exists
    if (peacefulStartTimerRef.current !== undefined && peacefulStartTimerRef.current > 0) {
      peacefulStartTimerRef.current -= delta;
      
      // Log when peaceful timer expires
      if (peacefulStartTimerRef.current <= 0) {
        console.log(`[ENEMY SHIP ${id}] Peaceful start period ended - now hostile!`);
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
      const spread = 0.2; // Amount of random spread
      toPlayerDirection.x += (Math.random() - 0.5) * spread;
      toPlayerDirection.z += (Math.random() - 0.5) * spread;
      toPlayerDirection.normalize(); // Re-normalize after adding randomness
      
      // Set cannon firing position slightly above water at the ship's position
      const cannonPosition = new THREE.Vector3(
        currentPos.x,
        1.0, // Fixed height for cannon position
        currentPos.z
      );
      
      // Create a unique ID for this cannonball
      const cannonballId = `${id}-cannonball-${Date.now()}`;
      
      // Add the cannonball to state
      const newCannonball = (
        <Cannonball
          key={cannonballId}
          position={cannonPosition}
          direction={toPlayerDirection}
          speed={25} // Slightly slower than player cannons
          lifespan={3.0}
          onHit={() => {
            // Remove this cannonball from the array when it hits something
            setCannonballs(prev => prev.filter(ball => ball.key !== cannonballId));
          }}
        />
      );
      
      setCannonballs(prev => [...prev, newCannonball]);
      
      // Set cooldown for next cannon fire (5-8 seconds, random to make it less predictable)
      cannonCooldownRef.current = 5 + Math.random() * 3;
      
      console.log(`[ENEMY SHIP ${id}] Fired cannon at player!`);
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
            console.log(`[ENEMY SHIP ${id}] Model loaded successfully`);
            console.log(`- Position: ${JSON.stringify(positionRef.current)}`);
            console.log(`- Rotation: ${JSON.stringify(rotationRef.current)}`);
            console.log(`- Scale: ${useGameState.getState().shipScale * SCALE.PLAYER_SHIP * 1.25}`);
          }}
        />
        
        {/* Enemy ship crew system disabled */}
      </group>
    </>
  );
});

export default EnemyShip;