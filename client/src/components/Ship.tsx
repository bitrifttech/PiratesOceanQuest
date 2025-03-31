import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, useTexture, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { Controls } from "../App";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { checkCollision } from "../lib/helpers/collisionDetection";
import Cannon from "./Cannon";
import { useAudio } from "../lib/stores/useAudio";

// Pre-load the ship model
useGLTF.preload("/models/base_pirate_ship.glb");

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
  
  // Cannon balls
  const cannonBalls = useRef<{
    position: THREE.Vector3;
    direction: THREE.Vector3;
    life: number;
    id: number;
  }[]>([]);
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
      
      // Create two cannon balls (one from each side)
      cannonBalls.current.push({
        position: new THREE.Vector3(
          position.x + direction.z * 2, // Right side of ship
          1,
          position.z - direction.x * 2
        ),
        direction: new THREE.Vector3(-direction.z, 0, direction.x), // Perpendicular to ship direction (right)
        life: 2, // Seconds of life
        id: cannonBallId.current++
      });
      
      cannonBalls.current.push({
        position: new THREE.Vector3(
          position.x - direction.z * 2, // Left side of ship
          1,
          position.z + direction.x * 2
        ),
        direction: new THREE.Vector3(direction.z, 0, -direction.x), // Perpendicular to ship direction (left)
        life: 2, // Seconds of life
        id: cannonBallId.current++
      });
      
      console.log("Cannon fired!", cannonBalls.current.length);
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
            console.log("Successfully captured enemy ship!");
          } else {
            // Failed boarding attempt
            takeDamage(10);
            console.log("Boarding attempt failed!");
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
    
    // Debug: Show current key states
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
    
    // Current rotation (yaw only)
    const currentRotation = rotation.y;
    
    // Apply rotation from steering
    let rotationDelta = 0;
    if (keys.leftward) {
      rotationDelta += 1.5 * delta;
      console.log("Turning left");
    }
    
    if (keys.rightward) {
      rotationDelta -= 1.5 * delta;
      console.log("Turning right");
    }
    
    // Update ship rotation
    const newRotation = new THREE.Euler(
      rotation.x,
      currentRotation + rotationDelta,
      rotation.z
    );
    setRotation(newRotation);
    
    // Calculate direction vector based on rotation
    // Ship model faces -Z direction by default, so direction vector should reflect that
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
      const forwardForce = direction.clone().multiplyScalar(-10 * delta);
      acceleration.add(forwardForce);
      console.log("Accelerating forward:", direction, "Force:", forwardForce);
    }
    
    if (keys.backward) {
      // Apply acceleration in the opposite direction the ship is facing (S key should move backward)
      const backwardForce = direction.clone().multiplyScalar(5 * delta);
      acceleration.add(backwardForce);
      console.log("Accelerating backward:", direction, "Force:", backwardForce);
    }
    
    // Log current velocity for debugging
    console.log("Current velocity before update:", velocity);
    
    // Update velocity with acceleration and apply drag
    const newVelocity = velocity.clone()
      .add(acceleration)
      .multiplyScalar(0.95); // Apply drag
    
    console.log("New velocity after update:", newVelocity);
    
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
    
    // Make ship bob on the waves
    if (shipRef.current) {
      shipRef.current.position.y = Math.sin(Date.now() * 0.0006) * 2.0 + 2.0;
      shipRef.current.rotation.x = Math.sin(Date.now() * 0.0005) * 0.03;
      shipRef.current.rotation.z = Math.cos(Date.now() * 0.0005) * 0.03;
    }
    
    // Update cannon balls
    cannonBalls.current.forEach((ball, index) => {
      // Move the cannon ball
      ball.position.add(
        ball.direction.clone().multiplyScalar(40 * delta)
      );
      
      // Decrease life
      ball.life -= delta;
      
      // Check for collisions with enemies
      enemies.forEach(enemy => {
        if (checkCollision(ball.position, enemy.position, 2, 5)) {
          // Hit!
          damageEnemy(enemy.id, 10);
          ball.life = 0; // Remove the ball
          playHit();
        }
      });
      
      // Remove if life is depleted
      if (ball.life <= 0) {
        cannonBalls.current.splice(index, 1);
      }
    });
    
    // Update cannon cooldown
    if (!cannonReady) {
      resetCannonCooldown(delta);
    }
  });

  // Load the 3D model
  const { scene: model } = useGLTF("/models/pirate_ship.glb") as any;
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
    <group ref={shipRef} position={position || [0, 0, 0]}>
      {/* 3D Ship Model */}
      {modelLoaded && shipModel ? (
        <group 
          scale={[64, 32, 64]} 
          rotation={[0, Math.PI, 0]}
          position={[0, 3, 0]} // Raise the model to sit on water
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
        <mesh position={[0, 35, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[20, 0.5, 3]} />
          <meshStandardMaterial 
            color={health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336"}
            emissive={health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336"}
            emissiveIntensity={0.8}
            transparent={true}
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Render cannonballs */}
      {cannonBalls.current.map((ball) => (
        <mesh
          key={ball.id}
          position={ball.position}
          castShadow
        >
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshStandardMaterial color="#222" roughness={0.7} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
};

export default Ship;