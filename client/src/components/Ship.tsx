import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";

import { Controls } from "../App";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { useShipEvents } from "../lib/stores/useShipEvents";
import { SCALE, MODEL_ADJUSTMENT, STATIC } from "../lib/constants";
import { ModelService } from "../lib/services/ModelService";
import { useShipMovement } from "../hooks/useShipMovement";
import { useCannonSystem } from "../hooks/useCannonSystem";
import Cannonball from "./Cannonball";
import CannonFireEffect from "./CannonFireEffect";
import CustomModel from "./CustomModel";

// Ship models are preloaded in ModelService

const Ship = () => {
  // Get player state and controls
  const {
    position,
    cannonReady,
    setPosition,
    setRotation,
    setVelocity,
    resetCannonCooldown,
  } = usePlayer();
  
  // Get ship event state for crew animations
  const { updateEnemyProximity } = useShipEvents();
  
  // Enemy proximity tracking for crew reactions
  const enemies = useEnemies(state => state.enemies);
  
  // Ship mesh reference
  const shipRef = useRef<THREE.Group>(null);
  
  // Direct access to keyboard controls
  const [, getKeys] = useKeyboardControls<Controls>();
  
  // Cannon system hook - handles firing, tracking, and effects
  const {
    fireAllCannons,
    updateCannonballs,
    updateFireEffects,
    cannonballsRef: cannonballs,
    fireEffectsRef: cannonFireEffects,
  } = useCannonSystem();
  
  // Track initialization status
  const isInitialized = useRef(false);
  
  // Update crew reactions based on enemy proximity
  useEffect(() => {
    if (!position || enemies.length === 0) return;
    
    // Find closest enemy
    let closestDistance = Infinity;
    for (const enemy of enemies) {
      const distance = position.distanceTo(enemy.position);
      if (distance < closestDistance) {
        closestDistance = distance;
      }
    }
    
    // Update crew reaction based on proximity
    updateEnemyProximity(closestDistance);
  }, [position, enemies, updateEnemyProximity]);
  
  // Initialize ship position if needed - only once
  useEffect(() => {
    // Skip if already initialized
    if (isInitialized.current) {
      return;
    }
    
    if (!position) {
      setPosition(new THREE.Vector3(0, 0, 0));
      setRotation(new THREE.Euler(0, 0, 0));
      setVelocity(new THREE.Vector3(0, 0, 0));
    }
    
    // No logging of ship initialization to reduce console spam
    
    // Mark as initialized
    isInitialized.current = true;
  }, []);
  
  // Check fire control input - delegates to cannon system hook
  useEffect(() => {
    const keys = getKeys();
    
    if (keys.fire) {
      fireAllCannons();
    }
  }, [getKeys, fireAllCannons]);
  
  // Ship movement hook - handles physics, steering, and collision
  const { updateMovement } = useShipMovement();
  
  // Update ship position and rotation
  useFrame((_, delta) => {
    if (!position || !shipRef.current) return;
    
    // Get current key states directly
    const keys = getKeys();
    
    // Update movement using the extracted hook
    const { newPosition, newRotation } = updateMovement(keys, delta);
    
    // Store the current Y position so we don't override the model's vertical positioning
    const currentY = shipRef.current.position.y;
    
    // Update the mesh position and rotation, but preserve Y to avoid interfering with model positioning
    shipRef.current.position.set(
      newPosition.x,
      currentY, // Preserve the Y position calculated by the model
      newPosition.z
    );
    shipRef.current.rotation.copy(newRotation);
    
    // No manual positioning needed - the CustomModel component 
    // will handle precise grid alignment with the model's bottom at grid level.
    if (shipRef.current) {
      // No bobbing rotation on flat grid
      shipRef.current.rotation.x = 0;
      shipRef.current.rotation.z = 0;
    }
    
    // Update cannon balls and fire effects using the extracted hook
    updateCannonballs(delta);
    updateFireEffects();
    
    // Update cannon cooldown
    if (!cannonReady) {
      resetCannonCooldown(delta);
    }
  });

  return (
    <>
      {/* Ship Group - contains only the ship model and health indicator */}
      <group 
        ref={shipRef} 
        position={position || [0, 0, 0]}
        userData={{ isShipGroup: true }} // Mark for debugging
      >
        {/* 3D Ship Model using CustomModel component 
          * Position is always 0,0,0 relative to parent group
          * Parent group handles all movement
          * CustomModel handles vertical alignment to grid
        */}
        <CustomModel 
          path={ModelService.getShipModelPath('base')}
          xPosition={0}
          yPosition={0}
          zPosition={0}
          rotation={[0, -Math.PI / 3 + Math.PI / 12 + Math.PI / 45, 0]}
          scale={useGameState.getState().shipScale * SCALE.PLAYER_SHIP}
          modelAdjustment={MODEL_ADJUSTMENT.SHIP}
          modelHeightOffset={STATIC.SHIP_OFFSET}
          bob={false}
          bobHeight={0}
          bobSpeed={0}
          castShadow
          receiveShadow
        />
      </group>
      
      {/* Scene-level projectiles and effects - not children of the ship group */}
      {/* This ensures they move independently from the ship */}
      
      {/* Render enhanced cannonballs with the new Cannonball component */}
      {cannonballs.current.map((ball) => (
        <Cannonball
          key={ball.id}
          position={ball.position}
          direction={ball.direction}
          speed={35}
          lifespan={2.5}
          sourceId="player" // Add player as source ID to prevent friendly fire
          onHit={() => {
            // Remove this cannonball from the array when it's done
            cannonballs.current = cannonballs.current.filter(b => b.id !== ball.id);
          }}
        />
      ))}
      
      {/* Render cannon fire effects */}
      {cannonFireEffects.current.map((effect) => (
        <CannonFireEffect
          key={effect.id}
          position={effect.position}
          direction={effect.direction}
        />
      ))}
    </>
  );
};

export default Ship;