import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useTexture, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { Controls } from "../App";
import { usePlayer } from "../lib/stores/usePlayer";
// import { useEnemies } from "../lib/stores/useEnemies"; // Removed enemies
import { useGameState } from "../lib/stores/useGameState";
import { checkCollision } from "../lib/helpers/collisionDetection";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC } from "../lib/constants";
import { collisionHandler } from "../lib/services/CollisionHandler";
import { ModelService } from "../lib/services/ModelService";
import Cannon from "./Cannon";
import Cannonball from "./Cannonball";
import CannonFireEffect from "./CannonFireEffect";
import CustomModel from "./CustomModel";
import { useAudio } from "../lib/stores/useAudio";

// Define types for our cannonball and effect tracking
interface CannonballInfo {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

interface CannonFireEffectInfo {
  id: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
}

// Define type for cannon position configuration
interface CannonPosition {
  deckHeight: number;
  rightOffset: number;
  leftOffset: number;
  zOffset: number;
  side?: 'right' | 'left'; // Optional property for cannon side
}

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
    fireCannon,
    takeDamage,
    resetCannonCooldown,
  } = usePlayer();
  
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
  
  // Enemy state removed
  
  // Audio
  const playHit = useAudio((state) => state.playHit);
  
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
  
  // Track cannonballs and effects using our defined interfaces
  const cannonballs = useRef<CannonballInfo[]>([]);
  const cannonFireEffects = useRef<CannonFireEffectInfo[]>([]);
  let cannonBallId = useRef(0);
  
  // Track initialization status
  const isInitialized = useRef(false);
  
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
  
  // Check fire control input
  useEffect(() => {
    // Get current key states directly
    const keys = getKeys();
    
    if (keys.fire && cannonReady) {
      fireCannon();
      
      // Ensure position is not null
      if (!position) return;
      
      // Create a new cannon ball - using the direction vector
      // Ship model faces -Z direction by default (negative Z is forward)
      const direction = new THREE.Vector3(
        -Math.sin(rotation.y),
        0,
        -Math.cos(rotation.y)
      );
      
      // Configure horizontal cannon positions along the ship's sides
      // All at the same height level but spread horizontally
      const cannonPositions: CannonPosition[] = [];
      
      // Single deck height for all cannons (just above water level)
      const deckHeight = 0.8;  
      
      // Define many more horizontal positions along the ship length
      // Generate positions from front to back with smaller intervals
      const shipPositions = [];
      
      // Generate 20 positions from front to back
      const shipLength = 14.0; // Longer than actual ship for better spread
      for (let i = 0; i < 20; i++) {
        // From -shipLength/2 to +shipLength/2
        const position = -shipLength/2 + (shipLength * i / 19);
        shipPositions.push(position);
      }
      
      // No logging of cannon positions to reduce console spam
      
      // Add cannons along the length of the ship, all at the same height
      shipPositions.forEach(zOffset => {
        cannonPositions.push({
          deckHeight: deckHeight,      // All cannons at the same height
          rightOffset: 2.5,            // Distance from center on right side
          leftOffset: 2.5,             // Distance from center on left side
          zOffset: zOffset             // Position along the length of the ship
        });
      });
      
      // Force cannonballs to be evenly spaced along ship length
      // Fixed positions to ensure proper distribution
      
      // New approach: fire 3 cannons from each side in a spread pattern
      // Cannons will be positioned at front, middle, and back of the ship on each side
      
      // Create positions for exactly 3 cannons on each side (6 total)
      const selectedPositions: CannonPosition[] = [];
      
      // Fixed positions at front, middle, and back for right side
      // These represent indices in the cannonPositions array (front, middle, back)
      const rightSideIndices = [
        0,                                  // Front of ship
        Math.floor(cannonPositions.length / 2), // Middle of ship
        cannonPositions.length - 1          // Back of ship
      ];
      
      // Fixed positions for left side (same positions as right)
      const leftSideIndices = [
        0,                                  // Front of ship
        Math.floor(cannonPositions.length / 2), // Middle of ship
        cannonPositions.length - 1          // Back of ship
      ];
      
      // Add right side positions
      rightSideIndices.forEach(index => {
        selectedPositions.push({
          ...cannonPositions[index],
          side: 'right'
        });
      });
      
      // Add left side positions
      leftSideIndices.forEach(index => {
        selectedPositions.push({
          ...cannonPositions[index],
          side: 'left'
        });
      });
      
      // No logging of cannon position distribution to reduce console spam
      
      // Create cannonballs and effects for selected cannon positions
      selectedPositions.forEach((deck) => {
        // Use completely separate x,y,z coordinates for each cannon
        // This ensures they're not aligned in a single line
        
        // Set cannon height (all cannon balls emerge at same height)
        const cannonHeight = deck.deckHeight;
        
        // Longitudinal position along ship (front to back)
        // This varies for each cannon to distribute them along ship length
        const longitudinalOffsetX = Math.sin(rotation.y + Math.PI/2) * deck.zOffset;
        const longitudinalOffsetZ = Math.cos(rotation.y + Math.PI/2) * deck.zOffset;
        
        // SIMPLIFIED CANNON FIRING APPROACH
        // Instead of using separate positions for each cannon, we'll use fixed side positions
        // and vary only the firing angle to create the spread effect
        
        // Set a consistent firing position at the middle of each side of the ship
        // Determine the longitudinal position (fore to aft) based on the cannon's position
        const shipHalfWidth = 3.5; // Half-width of the ship
        
        // Determine cannon type (front, middle, back) which affects firing angle
        let cannonPosition: 'front' | 'middle' | 'back';
        if (deck.zOffset < -2) cannonPosition = 'front';
        else if (deck.zOffset > 2) cannonPosition = 'back';
        else cannonPosition = 'middle';
        
        // Calculate a single firing position based on the ship's side
        if (deck.side === 'right') {
          // RIGHT SIDE CANNON - Fixed position on right side of ship
          // Simplified position - always from the exact side of the ship
          const rightPosX = position.x + direction.z * shipHalfWidth; // Fixed side offset
          const rightPosY = cannonHeight; // Fixed height
          const rightPosZ = position.z - direction.x * shipHalfWidth; // Fixed side offset
          
          // Create a firing position vector
          const rightPos = new THREE.Vector3(rightPosX, rightPosY, rightPosZ);
          
          // Create spread angles based on cannon position
          // All cannons fire outward from the side, but at slightly different angles
          const horizontalSpreadAngle = cannonPosition === 'front' ? -0.2 : // Front cannon angles backward
                                        cannonPosition === 'back' ? 0.2 :   // Back cannon angles forward
                                        0;                                  // Middle cannon fires straight out
          
          // Base direction is always directly outward from the side
          // This ensures cannonballs never go through the ship
          const baseDir = new THREE.Vector3(-direction.z, 0.15, direction.x).normalize();
          
          // Apply the spread angle for fan effect using a rotation matrix
          const spreadMatrix = new THREE.Matrix4().makeRotationY(horizontalSpreadAngle);
          const finalDir = baseDir.clone().applyMatrix4(spreadMatrix).normalize();
          
          // No logging of right cannon details to reduce console spam
          
          // Add cannonball
          cannonballs.current.push({
            id: cannonBallId.current++,
            position: rightPos,
            direction: finalDir
          });
          
          // Add fire effect
          cannonFireEffects.current.push({
            id: cannonBallId.current++,
            position: rightPos.clone(),
            direction: finalDir.clone()
          });
        } else {
          // LEFT SIDE CANNON - Fixed position on left side of ship
          // Simplified position - always from the exact side of the ship
          const leftPosX = position.x - direction.z * shipHalfWidth; // Fixed side offset
          const leftPosY = cannonHeight; // Fixed height
          const leftPosZ = position.z + direction.x * shipHalfWidth; // Fixed side offset
          
          // Create a firing position vector
          const leftPos = new THREE.Vector3(leftPosX, leftPosY, leftPosZ);
          
          // Create spread angles based on cannon position
          // All cannons fire outward from the side, but at slightly different angles
          const horizontalSpreadAngle = cannonPosition === 'front' ? 0.2 : // Front cannon angles forward
                                        cannonPosition === 'back' ? -0.2 : // Back cannon angles backward
                                        0;                                 // Middle cannon fires straight out
          
          // Base direction is always directly outward from the side
          // This ensures cannonballs never go through the ship
          const baseDir = new THREE.Vector3(direction.z, 0.15, -direction.x).normalize();
          
          // Apply the spread angle for fan effect using a rotation matrix
          const spreadMatrix = new THREE.Matrix4().makeRotationY(horizontalSpreadAngle);
          const finalDir = baseDir.clone().applyMatrix4(spreadMatrix).normalize();
          
          // No logging of left cannon details to reduce console spam
          
          // Add cannonball
          cannonballs.current.push({
            id: cannonBallId.current++,
            position: leftPos,
            direction: finalDir
          });
          
          // Add fire effect
          cannonFireEffects.current.push({
            id: cannonBallId.current++,
            position: leftPos.clone(),
            direction: finalDir.clone()
          });
        }
      });
      
      // No logging of cannon firing info to reduce console spam
    }
  }, [cannonReady, position, rotation, fireCannon, getKeys]);
  
  // Boarding functionality removed
  
  // Update ship position and rotation
  useFrame((_, delta) => {
    if (!position || !shipRef.current) return;
    
    // Get current key states directly
    const keys = getKeys();
    
    // Get dynamic ship parameters from game state
    const { shipHeight, waveHeight, waveSpeed, shipScale } = useGameState.getState();
    
    // No need to update model scale here, CustomModel handles it internally
    
    // Debug: Show current key states (commented out to reduce console spam)
    /*
    console.log("Current key states:", 
      JSON.stringify({
        forward: keys.forward,
        backward: keys.backward,
        leftward: keys.leftward,
        rightward: keys.rightward,
        fire: keys.fire,
        board: keys.board
      })
    );
    */
    
    // Current rotation (yaw only)
    const currentRotation = rotation.y;
    
    // Apply rotation from steering
    let rotationDelta = 0;
    if (keys.leftward) {
      rotationDelta += 1.5 * delta;
      // console.log("Turning left");
    }
    
    if (keys.rightward) {
      rotationDelta -= 1.5 * delta;
      // console.log("Turning right");
    }
    
    // Update ship rotation
    const newRotation = new THREE.Euler(
      rotation.x,
      currentRotation + rotationDelta,
      rotation.z
    );
    setRotation(newRotation);
    
    // Calculate direction vector based on rotation
    // Since the ship model is rotated by Math.PI (180 degrees) in the CustomModel component,
    // the visual "front" of the model is actually the opposite of its movement direction
    // We must negate the direction vector to match the visual orientation
    const direction = new THREE.Vector3(
      Math.sin(newRotation.y),
      0,
      Math.cos(newRotation.y)
    );
    
    // Negate the vector to match the ship's visual orientation with its movement
    direction.multiplyScalar(-1);
    
    // Apply acceleration from controls
    const acceleration = new THREE.Vector3(0, 0, 0);
    
    // Check key states and apply acceleration
    if (keys.forward) {
      // Apply acceleration in the direction the ship is facing (W key moves forward)
      // Reduced to 40% of original speed (from 15 to 6)
      const forwardForce = direction.clone().multiplyScalar(6 * delta);
      acceleration.add(forwardForce);
    }
    
    if (keys.backward) {
      // Apply acceleration in the opposite direction (S key moves backward)
      // Reduced to 40% of original speed (from 7.5 to 3)
      const backwardForce = direction.clone().multiplyScalar(-3 * delta);
      acceleration.add(backwardForce);
    }
    
    // Update velocity with acceleration and apply drag
    const newVelocity = velocity.clone()
      .add(acceleration)
      .multiplyScalar(0.95); // Apply drag
    
    setVelocity(newVelocity);
    
    // SIMPLIFIED COLLISION APPROACH: Prevent the ship from entering island collision areas
    const shipRadius = 6; // Ship collision radius
    const safetyMargin = 1.5; // Extra buffer to keep from islands
    
    // Calculate proposed new position with velocity
    const futurePosition = position.clone().add(
      newVelocity.clone().multiplyScalar(delta)
    );
    
    // Check if the proposed position would collide with an environment feature
    // Using our new CollisionHandler service
    const futureCollision = collisionHandler.checkPointCollision(futurePosition, shipRadius + safetyMargin);
    
    let newPosition;
    if (futureCollision) {
      // We would collide at the future position - stop the ship
      console.log(`[COLLISION] Stopping ship to prevent collision with ${futureCollision.type}`);
      
      // Zero out velocity to prevent movement into the obstacle
      setVelocity(new THREE.Vector3(0, 0, 0));
      
      // Stay at the current position
      newPosition = position.clone();
    } else {
      // No collision at the future position - allow the ship to move
      // Limit boundaries of the game area
      futurePosition.x = Math.max(-500, Math.min(500, futurePosition.x));
      futurePosition.z = Math.max(-500, Math.min(500, futurePosition.z));
      
      newPosition = futurePosition;
    }
    
    // One last safety check - if we're already inside an obstacle, push out
    const currentCollision = collisionHandler.checkPointCollision(position, shipRadius + safetyMargin);
    if (currentCollision) {
      console.log(`[COLLISION] Emergency correction - ship inside ${currentCollision.type}`);
      
      // Use the collision handler to calculate a safe position
      newPosition = collisionHandler.calculateSafePosition(
        position,
        currentCollision,
        shipRadius,
        safetyMargin
      );
      
      // Stop all movement to prevent bouncing
      setVelocity(new THREE.Vector3(0, 0, 0));
    }
    
    // Store the current Y position so we don't override the model's vertical positioning
    const currentY = shipRef.current.position.y;
    
    setPosition(newPosition);
    
    // Track changes before applying
    const oldPosition = shipRef.current.position.clone();
    
    // Update the mesh position and rotation, but preserve Y to avoid interfering with model positioning
    shipRef.current.position.set(
      newPosition.x,
      currentY, // Preserve the Y position calculated by the model
      newPosition.z
    );
    shipRef.current.rotation.copy(newRotation);
    
    // Debug position changes are disabled to reduce console spam
    
    // No manual positioning needed - the CustomModel component 
    // will handle precise grid alignment with the model's bottom at grid level.
    // This ensures consistency across all game elements.
    if (shipRef.current) {
      // No bobbing rotation on flat grid
      shipRef.current.rotation.x = 0;
      shipRef.current.rotation.z = 0;
    }
    
    // Update cannon balls
    // Use filter instead of forEach to safely handle removal during iteration
    cannonballs.current = cannonballs.current.filter((ball) => {
      // Move the cannon ball
      ball.position.add(
        ball.direction.clone().multiplyScalar(40 * delta)
      );
      
      // Check if cannonball is below grid level (y < 0)
      if (ball.position.y < 0) {
        // No logging of cannonball removal to reduce console spam
        return false; // Remove from array
      }
      
      // Check for cannonball range from ship
      if (ball.position.distanceTo(position) > 100) {
        return false; // Remove from array
      }
      
      return true; // Keep the cannonball
    });
    
    // Remove fire effects after their lifetime
    cannonFireEffects.current = cannonFireEffects.current.filter(effect => {
      const lifetime = 0.5; // Short lifetime for effects
      return Date.now() - effect.id < lifetime * 1000;
    });
    
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
            // Log detailed ship model properties
            console.log('[PLAYER SHIP] Model properties:');
            console.log(`- Path: ${ModelService.getShipModelPath('base')}`);
            console.log(`- Scale: ${useGameState.getState().shipScale * SCALE.PLAYER_SHIP}`);
            console.log(`- ModelAdjustment: ${MODEL_ADJUSTMENT.SHIP}`);
            console.log(`- TotalScale: ${useGameState.getState().shipScale * SCALE.PLAYER_SHIP * MODEL_ADJUSTMENT.SHIP}`);
            console.log(`- ModelHeightOffset: ${STATIC.SHIP_OFFSET}`);
            console.log(`- Rotation: [0, -Math.PI / 3 + Math.PI / 12 + Math.PI / 45, 0]`);
            
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
        
        {/* Health indicator (only shown when damaged) - positioned above ship */}
        {health < 100 && (
          <mesh position={[0, 8, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[10, 0.4, 2]} />
            <meshStandardMaterial 
              color={health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336"}
              emissive={health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336"}
              emissiveIntensity={0.8}
              transparent={true}
              opacity={0.8}
            />
          </mesh>
        )}
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