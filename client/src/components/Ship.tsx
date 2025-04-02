import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useTexture, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { Controls } from "../App";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { checkCollision } from "../lib/helpers/collisionDetection";
import Cannon from "./Cannon";
import Cannonball from "./Cannonball";
import CannonFireEffect from "./CannonFireEffect";
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
}

// Pre-load the tall multi-deck pirate ship model
useGLTF.preload("/models/tall_pirate_ship.glb");

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
  
  // Textures
  const woodTexture = useTexture("/textures/wood.jpg");
  
  // Get enemies
  const enemies = useEnemies((state) => state.enemies);
  const damageEnemy = useEnemies((state) => state.damageEnemy);
  
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
    
    console.log("Ship initialized", position);
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
      // Ship model faces -Z direction by default
      const direction = new THREE.Vector3(
        Math.sin(rotation.y),
        0,
        Math.cos(rotation.y)
      );
      
      // Configure horizontal cannon positions along the ship's sides
      // All at similar height levels but spread horizontally
      const cannonPositions: CannonPosition[] = [];
      
      // Define cannon ports at different positions along the ship
      // Each deck has its own height and positions
      
      // First deck - lowest level, 5 cannon ports along each side
      const firstDeckHeight = 0.6;  // Just above water level
      const firstDeckPositions = [-5.0, -2.5, 0.0, 2.5, 5.0]; // Front to back
      
      // Second deck - middle level, 4 cannon ports along each side
      const secondDeckHeight = 2.0; // Middle deck
      const secondDeckPositions = [-4.0, -1.3, 1.3, 4.0];    // Front to back
      
      // Third deck - top level, 3 cannon ports along each side
      const thirdDeckHeight = 3.4;  // Upper deck
      const thirdDeckPositions = [-3.0, 0.0, 3.0];          // Front to back
      
      // Add first deck cannons
      firstDeckPositions.forEach(zOffset => {
        cannonPositions.push({
          deckHeight: firstDeckHeight,
          rightOffset: 2.5,       // Distance from center on right side
          leftOffset: 2.5,        // Distance from center on left side
          zOffset: zOffset        // Position along the length of the ship
        });
      });
      
      // Add second deck cannons
      secondDeckPositions.forEach(zOffset => {
        cannonPositions.push({
          deckHeight: secondDeckHeight,
          rightOffset: 2.2,       // Slightly narrower at second deck
          leftOffset: 2.2,        // Slightly narrower at second deck
          zOffset: zOffset        // Position along the length of the ship
        });
      });
      
      // Add third deck cannons
      thirdDeckPositions.forEach(zOffset => {
        cannonPositions.push({
          deckHeight: thirdDeckHeight,
          rightOffset: 2.0,       // Narrowest at top deck
          leftOffset: 2.0,        // Narrowest at top deck
          zOffset: zOffset        // Position along the length of the ship
        });
      });
      
      // Select a subset of cannon positions to fire at once (based on cannon level)
      // This is more realistic than firing all cannons simultaneously
      const cannonsPerSide = 4; // Number of cannons to fire per side
      
      // Shuffle cannon positions for random distribution
      const shuffledPositions = [...cannonPositions];
      
      // Fisher-Yates shuffle algorithm for random selection
      for (let i = shuffledPositions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]];
      }
      
      // Take only the first N positions for each side
      const selectedPositions = shuffledPositions.slice(0, cannonsPerSide * 2);
      
      // Create cannonballs and effects for selected cannon positions
      selectedPositions.forEach((deck, index) => {
        // Calculate longitudinal offset vector based on ship's direction
        // This positions cannons along the length of the ship
        const longitudinalOffset = new THREE.Vector3(
          Math.sin(rotation.y + Math.PI/2) * deck.zOffset,
          0,
          Math.cos(rotation.y + Math.PI/2) * deck.zOffset
        );
        
        // Determine which side this cannon should fire from
        const isRightSide = index < cannonsPerSide;
        
        if (isRightSide) {
          // Right side cannonball - positioned along ship length using longitudinal offset
          const rightPos = new THREE.Vector3(
            position.x + direction.z * deck.rightOffset + longitudinalOffset.x, // Right side + offset along ship
            deck.deckHeight, // Deck height
            position.z - direction.x * deck.rightOffset + longitudinalOffset.z // Right side + offset along ship
          );
          
          // Right side cannon direction (perpendicular to ship)
          const rightDir = new THREE.Vector3(-direction.z, 0, direction.x);
          
          // Add cannonball
          cannonballs.current.push({
            id: cannonBallId.current++,
            position: rightPos.clone(),
            direction: rightDir.clone()
          });
          
          // Add cannon fire effect
          cannonFireEffects.current.push({
            id: cannonBallId.current++,
            position: rightPos.clone(),
            direction: rightDir.clone()
          });
        } else {
          // Left side cannonball - positioned along ship length using same longitudinal offset
          const leftPos = new THREE.Vector3(
            position.x - direction.z * deck.leftOffset + longitudinalOffset.x, // Left side + offset along ship
            deck.deckHeight, // Deck height
            position.z + direction.x * deck.leftOffset + longitudinalOffset.z // Left side + offset along ship
          );
          
          // Left side cannon direction (perpendicular to ship)
          const leftDir = new THREE.Vector3(direction.z, 0, -direction.x);
          
          // Add cannonball
          cannonballs.current.push({
            id: cannonBallId.current++,
            position: leftPos.clone(),
            direction: leftDir.clone()
          });
          
          // Add cannon fire effect
          cannonFireEffects.current.push({
            id: cannonBallId.current++,
            position: leftPos.clone(),
            direction: leftDir.clone()
          });
        }
      });
      
      console.log("Enhanced cannons fired!", cannonballs.current.length, "cannonballs and", cannonFireEffects.current.length, "effects");
    }
  }, [cannonReady, position, rotation, fireCannon, getKeys]);
  
  // Check boarding initiation
  useEffect(() => {
    // Get current key states directly
    const keys = getKeys();
    
    if (keys.board && position) {
      console.log("Attempting to board");
      
      // Check if any enemy is close enough to board
      enemies.forEach(enemy => {
        const distance = new THREE.Vector3(
          enemy.position.x - position.x,
          0,
          enemy.position.z - position.z
        ).length();
        
        if (distance < 15 && enemy.health < 30) {
          console.log("Boarding enemy ship", enemy.id);
          // Calculate boarding success based on ship health
          const boardingSuccess = Math.random() < (100 - enemy.health) / 100;
          
          if (boardingSuccess) {
            // Successfully captured ship
            damageEnemy(enemy.id, enemy.health);
            console.log("DEBUG: Successfully captured enemy ship!");
          } else {
            // Failed boarding attempt
            // takeDamage(10); // Disabled for debugging
            console.log("DEBUG: Boarding attempt failed!");
          }
        }
      });
    }
  }, [enemies, position, damageEnemy, takeDamage, getKeys]);
  
  // Update ship position and rotation
  useFrame((_, delta) => {
    if (!position || !shipRef.current) return;
    
    // Get current key states directly
    const keys = getKeys();
    
    // Get dynamic ship parameters from game state
    const { shipHeight, waveHeight, waveSpeed, shipScale } = useGameState.getState();
    
    // Update model scale dynamically if it has changed
    if (shipRef.current.children[0] && modelLoaded) {
      shipRef.current.children[0].scale.set(shipScale, shipScale, shipScale);
    }
    
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
    // Adjusted directional calculations for new ship orientation (90 degree adjustment)
    const direction = new THREE.Vector3(
      Math.sin(newRotation.y),
      0,
      Math.cos(newRotation.y)
    );
    
    // Apply acceleration from controls
    const acceleration = new THREE.Vector3(0, 0, 0);
    
    // Check key states and apply acceleration
    if (keys.forward) {
      // Apply acceleration in the direction the ship is facing (W key should move forward)
      const forwardForce = direction.clone().multiplyScalar(-15 * delta); // Increased for better control with larger ship
      acceleration.add(forwardForce);
      // console.log("Accelerating forward:", direction, "Force:", forwardForce);
    }
    
    if (keys.backward) {
      // Apply acceleration in the opposite direction the ship is facing (S key should move backward)
      const backwardForce = direction.clone().multiplyScalar(7.5 * delta); // Increased for better control
      acceleration.add(backwardForce);
      // console.log("Accelerating backward:", direction, "Force:", backwardForce);
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
    
    setPosition(newPosition);
    
    // Update the mesh position and rotation
    shipRef.current.position.copy(newPosition);
    shipRef.current.rotation.copy(newRotation);
    
    // Make ship bob on the waves with configurable height
    if (shipRef.current) {
      const { shipHeight, waveHeight, waveSpeed } = useGameState.getState();
      shipRef.current.position.y = Math.sin(Date.now() * waveSpeed) * waveHeight + shipHeight;
      shipRef.current.rotation.x = Math.sin(Date.now() * (waveSpeed - 0.0001)) * 0.01;
      shipRef.current.rotation.z = Math.cos(Date.now() * (waveSpeed - 0.0001)) * 0.01;
    }
    
    // Update cannon balls
    cannonballs.current.forEach((ball, index) => {
      // Move the cannon ball
      ball.position.add(
        ball.direction.clone().multiplyScalar(40 * delta)
      );
      
      // Check for collisions with enemies
      enemies.forEach(enemy => {
        if (checkCollision(ball.position, enemy.position, 2, 5)) {
          // Hit!
          damageEnemy(enemy.id, 10);
          // Mark for removal
          cannonballs.current.splice(index, 1);
          playHit();
        }
      });
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

  // Load the new tall pirate ship 3D model with multiple decks and cannons
  const { scene: model } = useGLTF("/models/tall_pirate_ship.glb") as any;
  const [modelLoaded, setModelLoaded] = useState(false);
  const shipModelRef = useRef<THREE.Group>(null);

  // Make sure model is loaded
  useEffect(() => {
    if (model) {
      console.log("Ship model loaded successfully", model);
      
      // Debug model structure
      if (model.children) {
        console.log("Model children:", model.children.length);
        // Use a regular for loop to avoid TypeScript errors
        for (let i = 0; i < model.children.length; i++) {
          console.log(`Child ${i}:`, model.children[i]);
        }
      }
      
      setModelLoaded(true);
    }
  }, [model]);

  // Deep clone the model to prevent issues
  const shipModel = modelLoaded ? model.clone() : null;

  return (
    <>
      {/* Ship Group - contains only the ship model and health indicator */}
      <group ref={shipRef} position={position || [0, 0, 0]}>
        {/* 3D Ship Model */}
        {modelLoaded && shipModel ? (
          <group 
            scale={[useGameState.getState().shipScale, useGameState.getState().shipScale, useGameState.getState().shipScale]} // Use dynamic ship scale
            rotation={[0, Math.PI - Math.PI/2, 0]} // Fix 90 degree rotation issue
            position={[0, useGameState.getState().shipHeight - 2.0, 0]} // Lower position to better show multiple decks
          >
            <primitive object={shipModel} castShadow receiveShadow />
          </group>
        ) : (
          /* Fallback if model fails to load */
          <group>
            <mesh
              position={[0, 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[6, 3, 12]} />
              <meshStandardMaterial map={woodTexture} roughness={0.7} />
            </mesh>
          </group>
        )}
        
        {/* Cannons are now part of the 3D model */}
        {!modelLoaded && (
          <>
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
          </>
        )}
        
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