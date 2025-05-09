import { useRef, useEffect, memo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import CustomModel from "./CustomModel";
import Cannonball from "./Cannonball";
import { POSITION, SCALE, MODEL_ADJUSTMENT, STATIC } from "../lib/constants";

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
  const cannonballsRef = useRef<JSX.Element[]>([]);
  const cannonCooldownRef = useRef<number>(0);
  
  // Get player position for AI behavior
  const playerPosition = usePlayer((state) => state.position);
  
  // Ship movement parameters
  const speed = 0.05;
  const rotationSpeed = 0.01;
  const detectionRange = 80; // Units at which the enemy ship detects the player
  const canFireRange = 30; // Range at which enemy will fire cannons
  
  // Update the enemy in the game state
  const moveEnemy = useEnemies((state) => state.moveEnemy);
  
  // State to manage cannonballs
  const [cannonballs, setCannonballs] = useState<JSX.Element[]>([]);
  
  // Initialize on first render
  useEffect(() => {
    if (!initialized.current) {
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
    
    // Ship collision parameters
    const enemyShipRadius = 5; // Units radius for collision detection
    const playerShipRadius = 5; // Units radius for player ship
    const collisionDamage = 10; // Damage on collision
    
    // Create a local collision handler for this frame
    const localCollisionCooldown = 0; // Just use a local variable instead of ref
    
    // Check for collision with player ship - apply damage to both ships
    if (distanceToPlayer < (enemyShipRadius + playerShipRadius)) {
      // Damage both ships - no cooldown for now
      const takeDamage = usePlayer.getState().takeDamage;
      takeDamage(collisionDamage);
      
      // Damage this enemy ship too
      const damageEnemy = useEnemies(state => state.damageEnemy);
      damageEnemy(id, collisionDamage);
      
      console.log(`[COLLISION] Ship-to-ship collision! Both ships take ${collisionDamage} damage`);
      
      // Apply bounce effect - push ships away from each other
      const bounceDirection = new THREE.Vector3()
        .subVectors(currentPos, playerPosition)
        .normalize()
        .multiplyScalar(1.0); // Bounce force
      
      // Apply bounce to enemy position
      currentPos.add(bounceDirection);
    }
    
    // Basic AI behavior
    if (distanceToPlayer < detectionRange) {
      // Calculate angle to player - this is the direction we need to face
      const angleToPlayer = Math.atan2(
        playerPosition.x - currentPos.x,
        playerPosition.z - currentPos.z
      );
      
      // Gradually rotate toward player with smooth turning
      const currentAngle = currentRot.y;
      let angleDiff = angleToPlayer - currentAngle;
      
      // Normalize angle difference to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      // Apply smooth rotation toward player
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
      
      // The velocity is applied directly from this direction vector
      // The bow of the ship points in this direction because of the model's PI rotation
      const velocity = direction.clone().multiplyScalar(speed * delta * 60);
      
      // Apply velocity to position
      currentPos.add(velocity);
      
      // Log for debugging, but only occasionally
      if (Math.random() < 0.002) {
        console.log(`[ENEMY SHIP ${id}] Movement details: 
        - Angle to player: ${(angleToPlayer * 180 / Math.PI).toFixed(1)}°
        - Current rotation: ${(currentAngle * 180 / Math.PI).toFixed(1)}°
        - New rotation: ${(newRotY * 180 / Math.PI).toFixed(1)}°
        - Direction: (${direction.x.toFixed(2)}, ${direction.z.toFixed(2)})
        - Distance to player: ${distanceToPlayer.toFixed(1)} units`);
      }
    }
    
    // Fire cannons if in range and cooldown is ready
    if (distanceToPlayer < canFireRange && cannonCooldownRef.current <= 0) {
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
    </group>
  );
});

export default EnemyShip;