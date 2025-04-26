import { useRef, useEffect, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import CustomModel from "./CustomModel";
import EnemyDirectionMarkers from "./EnemyDirectionMarkers";
import { POSITION, SCALE, MODEL_ADJUSTMENT, STATIC } from "../lib/constants";

interface EnemyShipProps {
  id: string;
  initialPosition: THREE.Vector3;
  initialRotation: THREE.Euler;
}

const EnemyShip = memo(({ id, initialPosition, initialRotation }: EnemyShipProps) => {
  // References
  const shipRef = useRef<THREE.Group>(null);
  const positionRef = useRef<THREE.Vector3>(initialPosition.clone());
  const rotationRef = useRef<THREE.Euler>(initialRotation.clone());
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const healthRef = useRef<number>(100);
  const initialized = useRef<boolean>(false);
  
  // Get player position for AI behavior
  const playerPosition = usePlayer((state) => state.position);
  
  // Ship movement parameters
  const speed = 0.05;
  const rotationSpeed = 0.01;
  const detectionRange = 80; // Units at which the enemy ship detects the player
  
  // Update the enemy in the game state
  const moveEnemy = useEnemies((state) => state.moveEnemy);
  
  // Initialize on first render
  useEffect(() => {
    if (!initialized.current) {
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
    
    // Basic AI behavior
    if (distanceToPlayer < detectionRange) {
      // Chase player when in range
      
      // Calculate angle to player
      // The ship model is rotated 49 degrees clockwise, so we need to account for this
      // when calculating the angle to the player
      const angleToPlayer = Math.atan2(
        playerPosition.x - currentPos.x,
        playerPosition.z - currentPos.z
      );
      
      // Apply rotation correction
      // Instead of adding the offset, we'll use the raw angle to player
      // Because we're inverting the movement direction below, we don't need this offset anymore
      const correctedAngle = angleToPlayer;
      
      // Gradually rotate toward player
      const currentAngle = currentRot.y;
      let angleDiff = correctedAngle - currentAngle; // Use the corrected angle
      
      // Normalize angle difference to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      // Rotate toward player
      const newRotY = currentRot.y + Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), rotationSpeed * delta * 60);
      
      // Update rotation
      currentRot.set(0, newRotY, 0);
      
      // Move forward in the direction the ship is facing at a constant speed
      // Reverse the direction because the model is actually facing the opposite way
      const velocity = new THREE.Vector3(
        -Math.sin(newRotY) * speed * delta * 60, // Reverse X direction
        0,
        -Math.cos(newRotY) * speed * delta * 60  // Reverse Z direction
      );
      
      // Apply velocity to position
      currentPos.add(velocity);
      
      // Log the angles occasionally for debugging
      if (Math.random() < 0.002) { // Log only ~0.2% of the time to avoid spam
        console.log(`[ENEMY SHIP] Movement details: 
        - Raw angle to player: ${(angleToPlayer * 180 / Math.PI).toFixed(1)}°
        - Model rotation: 180.0° (Model faces back)
        - Corrected angle: ${(correctedAngle * 180 / Math.PI).toFixed(1)}°
        - Current rotation: ${(currentAngle * 180 / Math.PI).toFixed(1)}°
        - New rotation: ${(newRotY * 180 / Math.PI).toFixed(1)}°
        - Direction: Reversed (moving in opposite direction of rotation)`);
      }
    }
    
    // Keep ship at constant height above water
    currentPos.y = POSITION.SHIP_HEIGHT;
    
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
    <group ref={shipRef} position={positionRef.current.toArray()} rotation={rotationRef.current.toArray()}>
      <CustomModel
        path="/models/pirate_ship.glb" 
        scale={useGameState.getState().shipScale * SCALE.PLAYER_SHIP * 1.25} // 25% larger than player ship
        modelAdjustment={MODEL_ADJUSTMENT.SHIP}
        modelHeightOffset={STATIC.SHIP_OFFSET} // Use same offset as player ship
        rotation={[0, Math.PI, 0]} // Rotate 180 degrees to face forward
        bob={true}
        bobHeight={0.2}
        bobSpeed={1.0}
        castShadow={true}
        receiveShadow={true}
        onLoad={() => {
          // Log detailed enemy ship model properties
          console.log('[ENEMY SHIP] Model properties:');
          console.log(`- Path: /models/pirate_ship.glb`);
          console.log(`- Base Scale: ${useGameState.getState().shipScale * SCALE.PLAYER_SHIP}`);
          console.log(`- Scale with 25% increase: ${useGameState.getState().shipScale * SCALE.PLAYER_SHIP * 1.25}`);
          console.log(`- ModelAdjustment: ${MODEL_ADJUSTMENT.SHIP}`);
          console.log(`- TotalScale: ${useGameState.getState().shipScale * SCALE.PLAYER_SHIP * 1.25 * MODEL_ADJUSTMENT.SHIP}`);
          console.log(`- ModelHeightOffset: ${STATIC.SHIP_OFFSET}`);
          console.log(`- Position: ${JSON.stringify(positionRef.current)}`);
        }}
      />
      
      {/* Add direction markers for debugging orientation */}
      <EnemyDirectionMarkers position={positionRef.current} rotation={rotationRef.current} />
    </group>
  );
});

export default EnemyShip;