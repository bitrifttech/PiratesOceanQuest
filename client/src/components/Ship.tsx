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

// Pre-load the ship models
useGLTF.preload('/models/base_pirate_ship.glb');
useGLTF.preload('/models/advanced_pirate_ship.glb');

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
    const unsubForward = subscribeKeys(
      (state) => state.forward,
      (pressed) => console.log("Forward key:", pressed)
    );
    
    const unsubBackward = subscribeKeys(
      (state) => state.backward,
      (pressed) => console.log("Backward key:", pressed)
    );
    
    const unsubLeft = subscribeKeys(
      (state) => state.leftward,
      (pressed) => console.log("Left key:", pressed)
    );
    
    const unsubRight = subscribeKeys(
      (state) => state.rightward,
      (pressed) => console.log("Right key:", pressed)
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
  
  // Initialize ship position if needed
  useEffect(() => {
    if (!position) {
      setPosition(new THREE.Vector3(0, 0, 0));
      setRotation(new THREE.Euler(0, 0, 0));
      setVelocity(new THREE.Vector3(0, 0, 0));
    }
    
    // Log initialization with ship height for debugging
    console.log("Ship initialized", {
      position,
      savedHeight: initialShipConfig.current.shipHeight,
      constantHeight: POSITION.SHIP_HEIGHT,
      gameStateHeight: useGameState.getState().shipHeight
    });
  }, [position, setPosition, setRotation, setVelocity]);
  
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
      
      console.log("Ship cannon positions:", shipPositions);
      
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
      
      // Log the distribution of positions for debugging
      console.log("Cannon positions distribution:", selectedPositions.map(pos => pos.zOffset));
      
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
          
          // Log the firing details for debugging
          console.log(`Right ${cannonPosition} cannon: pos=(${rightPosX.toFixed(1)}, ${rightPosY.toFixed(1)}, ${rightPosZ.toFixed(1)}), dir=(${finalDir.x.toFixed(2)}, ${finalDir.y.toFixed(2)}, ${finalDir.z.toFixed(2)})`);
          
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
          
          // Log the firing details for debugging
          console.log(`Left ${cannonPosition} cannon: pos=(${leftPosX.toFixed(1)}, ${leftPosY.toFixed(1)}, ${leftPosZ.toFixed(1)}), dir=(${finalDir.x.toFixed(2)}, ${finalDir.y.toFixed(2)}, ${finalDir.z.toFixed(2)})`);
          
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
      
      console.log("Enhanced cannons fired!", cannonballs.current.length, "cannonballs and", cannonFireEffects.current.length, "effects");
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
    // The ship model is rotated by Math.PI (180 degrees) in the CustomModel component
    // which means it's facing the negative Z direction, so we need to adjust our direction
    // vector to match that orientation - forward should always be along the ship's bow
    const direction = new THREE.Vector3(
      Math.sin(newRotation.y),
      0,
      Math.cos(newRotation.y)
    );
    
    // Negate the vector since our ship points in -Z direction with 0 rotation
    direction.multiplyScalar(-1);
    
    // Log direction vector for debugging
    console.log("Ship direction vector:", direction);
    
    // Apply acceleration from controls
    const acceleration = new THREE.Vector3(0, 0, 0);
    
    // Check key states and apply acceleration
    if (keys.forward) {
      // Apply acceleration in the direction the ship is facing (W key moves forward)
      // No need for negative multiplier now that direction is correct
      const forwardForce = direction.clone().multiplyScalar(15 * delta);
      acceleration.add(forwardForce);
      console.log("Moving forward in direction:", direction);
    }
    
    if (keys.backward) {
      // Apply acceleration in the opposite direction (S key moves backward)
      const backwardForce = direction.clone().multiplyScalar(-7.5 * delta);
      acceleration.add(backwardForce);
      console.log("Moving backward, opposite of direction:", direction);
    }
    
    // Update velocity with acceleration and apply drag
    const newVelocity = velocity.clone()
      .add(acceleration)
      .multiplyScalar(0.95); // Apply drag
    
    setVelocity(newVelocity);
    
    // Update position with velocity
    const newPosition = position.clone().add(
      newVelocity.clone().multiplyScalar(delta)
    );
    
    // Limit boundaries of the game area
    newPosition.x = Math.max(-500, Math.min(500, newPosition.x));
    newPosition.z = Math.max(-500, Math.min(500, newPosition.z));
    
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
    
    // Debug: Log position changes to track when parent group moves
    if (Math.random() < 0.01) { // Log occasionally to reduce spam
      console.log(`[SHIP-GROUP] Position changed from (${oldPosition.x.toFixed(2)}, ${oldPosition.y.toFixed(2)}, ${oldPosition.z.toFixed(2)}) to (${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)}, ${newPosition.z.toFixed(2)})`);
      
      // Check for child elements being repositioned
      shipRef.current.traverse(child => {
        if (child.type === "Group" && child !== shipRef.current) {
          console.log(`[SHIP-CHILD] Child group at (${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`);
        }
      });
    }
    
    // No manual positioning needed - the CustomModel component 
    // will handle precise grid alignment with the model's bottom at grid level.
    // This ensures consistency across all game elements.
    if (shipRef.current) {
      // Log the ship position for debugging
      if (Math.random() < 0.01) { // Log only occasionally to prevent spam
        console.log(`[SHIP-DEBUG] Ship position Y: ${shipRef.current.position.y.toFixed(2)}`);
      }
      
      // No bobbing rotation on flat grid
      shipRef.current.rotation.x = 0;
      shipRef.current.rotation.z = 0;
    }
    
    // Update cannon balls
    cannonballs.current.forEach((ball, index) => {
      // Move the cannon ball
      ball.position.add(
        ball.direction.clone().multiplyScalar(40 * delta)
      );
      
      // Enemy collision detection removed
      
      // Check for cannonball range/lifetime instead
      if (ball.position.distanceTo(position) > 100) {
        // Out of range, remove cannonball
        cannonballs.current.splice(index, 1);
      }
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
          path='/models/base_pirate_ship.glb'
          xPosition={0}
          yPosition={0}
          zPosition={0}
          rotation={[0, Math.PI, 0]} // Fixed rotation to point forward
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
            console.log(`Ship model loaded, positioned with bottom at water level + ${STATIC.SHIP_OFFSET} offset`);
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