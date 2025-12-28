import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useTexture, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { Controls } from "../App";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { useShipEvents } from "../lib/stores/useShipEvents";
import { checkCollision } from "../lib/helpers/collisionDetection";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC } from "../lib/constants";
import { ModelService } from "../lib/services/ModelService";
import { useShipMovement } from "../hooks/useShipMovement";
import { useCannonSystem } from "../hooks/useCannonSystem";
import Cannon from "./Cannon";
import Cannonball from "./Cannonball";
import CannonFireEffect from "./CannonFireEffect";
import CustomModel from "./CustomModel";
import CrewSystem from "./CrewSystem";

// Ship models are preloaded in ModelService

const Ship = () => {
  // Get player state and controls
  const {
    position,
    rotation,
    velocity,
    health,
    cannonReady,
    setPosition,
    setRotation,
    setVelocity,
    takeDamage,
    resetCannonCooldown,
  } = usePlayer();
  
  // Get ship event state for crew animations
  const { 
    playerShipEvent, 
    playerHit, 
    updateEnemyProximity 
  } = useShipEvents();
  
  // Enemy proximity tracking for crew reactions
  const enemies = useEnemies(state => state.enemies);
  
  // Ship mesh references
  const shipRef = useRef<THREE.Group>(null);
  const hullRef = useRef<THREE.Mesh>(null);
  const sailRef = useRef<THREE.Mesh>(null);
  
  // Store initial ship config values to ensure consistency across restarts
  const initialShipConfig = useRef({
    shipHeight: STATIC.WATER_LEVEL + STATIC.SHIP_OFFSET, // Use universal static values
    waveHeight: useGameState.getState().waveHeight,
    waveSpeed: useGameState.getState().waveSpeed
  });
  
  // Textures
  const woodTexture = useTexture("/textures/wood.jpg");
  
  // Direct access to keyboard controls through subscribe (more reliable)
  const [subscribeKeys, getKeys] = useKeyboardControls<Controls>();
  
  // Set up subscriptions to key states for better debugging
  useEffect(() => {
    // Using silent subscriptions to avoid console spam
    const unsubForward = subscribeKeys(
      (state) => state.forward,
      (pressed) => { /* No logging */ }
    );
    
    const unsubBackward = subscribeKeys(
      (state) => state.backward,
      (pressed) => { /* No logging */ }
    );
    
    const unsubLeft = subscribeKeys(
      (state) => state.leftward,
      (pressed) => { /* No logging */ }
    );
    
    const unsubRight = subscribeKeys(
      (state) => state.rightward,
      (pressed) => { /* No logging */ }
    );
    
    // Clean up subscriptions
    return () => {
      unsubForward();
      unsubBackward();
      unsubLeft();
      unsubRight();
    };
  }, [subscribeKeys]);
  
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
  const { updateMovement, position: movementPosition } = useShipMovement();
  
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

  // Track model loading through a ref to avoid state issues
  const shipModelLoadedRef = useRef(false);

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
          rotation={[0, -Math.PI / 3 + Math.PI / 12 + Math.PI / 45, 0]} // Rotate 60-15+4 = 49 degrees clockwise
          scale={useGameState.getState().shipScale * SCALE.PLAYER_SHIP}
          modelAdjustment={MODEL_ADJUSTMENT.SHIP}
          modelHeightOffset={STATIC.SHIP_OFFSET} // Using static offset from water level
          bob={false}
          bobHeight={0}
          bobSpeed={0}
          castShadow
          receiveShadow
          onLoad={() => {
            shipModelLoadedRef.current = true;
          }}
        />
        
        {/* Fallback cannons - shown only until model loads */}
        <group visible={!shipModelLoadedRef.current}>
          {/* Cannons - port side (left) - shown only in fallback mode */}
          {[-6, -3, 0, 3, 6].map((z, i) => (
            <Cannon
              key={`port-${i}`}
              position={[-3.5, 0.8, z]}
              rotation={[0, -Math.PI / 2, 0]}
            />
          ))}
          
          {/* Cannons - starboard side (right) - shown only in fallback mode */}
          {[-6, -3, 0, 3, 6].map((z, i) => (
            <Cannon
              key={`starboard-${i}`}
              position={[3.5, 0.8, z]}
              rotation={[0, Math.PI / 2, 0]}
            />
          ))}
        </group>
        
        {/* Health indicator above ship removed - health now only shown in HUD */}
        
        {/* Crew System disabled */}
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