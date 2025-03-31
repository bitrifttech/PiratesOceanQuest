import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

import { Controls } from "../App";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { checkCollision } from "../lib/helpers/collisionDetection";
import Cannon from "./Cannon";
import { useAudio } from "../lib/stores/useAudio";

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
  
  // Get keyboard controls
  const forward = useKeyboardControls<Controls>((state) => state.forward);
  const backward = useKeyboardControls<Controls>((state) => state.backward);
  const leftward = useKeyboardControls<Controls>((state) => state.leftward);
  const rightward = useKeyboardControls<Controls>((state) => state.rightward);
  const fire = useKeyboardControls<Controls>((state) => state.fire);
  const board = useKeyboardControls<Controls>((state) => state.board);
  
  // Log key state changes for debugging
  useEffect(() => {
    console.log("Forward key state:", forward);
  }, [forward]);
  
  useEffect(() => {
    console.log("Backward key state:", backward);
  }, [backward]);
  
  // Cannon balls
  const cannonBalls = useRef<{
    position: THREE.Vector3;
    direction: THREE.Vector3;
    life: number;
    id: number;
  }[]>([]);
  let cannonBallId = useRef(0);
  
  useEffect(() => {
    // Initialize ship position if needed
    if (!position) {
      setPosition(new THREE.Vector3(0, 0, 0));
      setRotation(new THREE.Euler(0, 0, 0));
      setVelocity(new THREE.Vector3(0, 0, 0));
    }
    
    console.log("Ship initialized", position);
  }, [position, setPosition, setRotation, setVelocity]);
  
  // Check fire control input
  useEffect(() => {
    if (fire && cannonReady) {
      fireCannon();
      
      // Ensure position is not null
      if (!position) return;
      
      // Create a new cannon ball
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
        direction: direction.clone(),
        life: 2, // Seconds of life
        id: cannonBallId.current++
      });
      
      cannonBalls.current.push({
        position: new THREE.Vector3(
          position.x - direction.z * 2, // Left side of ship
          1,
          position.z + direction.x * 2
        ),
        direction: direction.clone(),
        life: 2, // Seconds of life
        id: cannonBallId.current++
      });
      
      console.log("Cannon fired!", cannonBalls.current.length);
    }
  }, [fire, cannonReady, position, rotation, fireCannon]);
  
  // Check boarding initiation
  useEffect(() => {
    if (board && position) {
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
  }, [board, enemies, position, damageEnemy, takeDamage]);
  
  // Update ship position and rotation
  useFrame((_, delta) => {
    if (!position || !shipRef.current) return;
    
    // Current rotation (yaw only)
    const currentRotation = rotation.y;
    
    // Apply rotation from steering
    let rotationDelta = 0;
    if (leftward) rotationDelta += 1 * delta;
    if (rightward) rotationDelta -= 1 * delta;
    
    // Update ship rotation
    const newRotation = new THREE.Euler(
      rotation.x,
      currentRotation + rotationDelta,
      rotation.z
    );
    setRotation(newRotation);
    
    // Calculate direction vector based on rotation
    const direction = new THREE.Vector3(
      Math.sin(newRotation.y),
      0,
      Math.cos(newRotation.y)
    );
    
    // Apply acceleration from controls
    const acceleration = new THREE.Vector3(0, 0, 0);
    
    if (forward) {
      acceleration.add(direction.clone().multiplyScalar(5 * delta));
      console.log("Accelerating forward:", direction, "Acceleration:", acceleration);
    }
    
    if (backward) {
      acceleration.add(direction.clone().multiplyScalar(-2 * delta));
      console.log("Accelerating backward:", direction, "Acceleration:", acceleration);
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
      shipRef.current.position.y = Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
      shipRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.03;
      shipRef.current.rotation.z = Math.cos(Date.now() * 0.002) * 0.03;
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

  return (
    <group ref={shipRef} position={position || [0, 0, 0]}>
      {/* Ship hull */}
      <mesh ref={hullRef} castShadow receiveShadow>
        <boxGeometry args={[6, 3, 12]} />
        <meshStandardMaterial
          map={woodTexture}
          color="#8B4513"
          roughness={0.8}
        />
      </mesh>
      
      {/* Ship Deck */}
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.5, 0.5, 11.5]} />
        <meshStandardMaterial
          map={woodTexture}
          color="#9c6b30"
          roughness={0.7}
        />
      </mesh>
      
      {/* Main mast */}
      <mesh position={[0, 8, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 14]} />
        <meshStandardMaterial
          map={woodTexture}
          color="#6d4c41"
          roughness={0.7}
        />
      </mesh>
      
      {/* Main sail */}
      <mesh ref={sailRef} position={[0, 8, 2]} castShadow>
        <planeGeometry args={[8, 10]} />
        <meshStandardMaterial
          color="#F5F5F5"
          side={THREE.DoubleSide}
          roughness={0.8}
        />
      </mesh>
      
      {/* Ship stern */}
      <mesh position={[0, 2, -5.5]} castShadow>
        <boxGeometry args={[5, 2, 1]} />
        <meshStandardMaterial
          map={woodTexture}
          color="#8B4513"
          roughness={0.8}
        />
      </mesh>
      
      {/* Ship bow */}
      <mesh position={[0, 1, 6.5]} castShadow>
        <coneGeometry args={[2.5, 2, 4, 1, false, Math.PI/4]} />
        <meshStandardMaterial
          map={woodTexture}
          color="#8B4513"
          roughness={0.8}
        />
      </mesh>
      
      {/* Health indicator (changes color based on health) */}
      <mesh position={[0, -1.6, 0]}>
        <boxGeometry args={[6, 0.1, 12]} />
        <meshStandardMaterial 
          color={health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336"}
          emissive={health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336"}
          emissiveIntensity={0.5}
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      
      {/* Left side cannons */}
      <Cannon position={[-3, 1, -2]} rotation={[0, -Math.PI/2, 0]} />
      <Cannon position={[-3, 1, 0]} rotation={[0, -Math.PI/2, 0]} />
      <Cannon position={[-3, 1, 2]} rotation={[0, -Math.PI/2, 0]} />
      
      {/* Right side cannons */}
      <Cannon position={[3, 1, -2]} rotation={[0, Math.PI/2, 0]} />
      <Cannon position={[3, 1, 0]} rotation={[0, Math.PI/2, 0]} />
      <Cannon position={[3, 1, 2]} rotation={[0, Math.PI/2, 0]} />
      
      {/* Render cannonballs */}
      {cannonBalls.current.map((ball) => (
        <mesh
          key={ball.id}
          position={ball.position}
          castShadow
        >
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#333" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

export default Ship;
