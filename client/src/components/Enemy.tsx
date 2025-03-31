import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { checkCollision } from "../lib/helpers/collisionDetection";
import Cannon from "./Cannon";

// Preload the ship model
useGLTF.preload("/models/pirate_ship.glb");

interface EnemyProps {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  health: number;
}

const Enemy = ({ id, position, rotation, health }: EnemyProps) => {
  const enemyRef = useRef<THREE.Group>(null);
  const stateRef = useRef({
    patrolTimer: 0,
    patrolDirection: new THREE.Vector3(0, 0, 0),
    attackCooldown: 0,
    state: "patrol" as "patrol" | "chase" | "attack"
  });
  
  // Load ship model
  const { scene: model } = useGLTF("/models/pirate_ship.glb") as any;
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Textures
  const woodTexture = useTexture("/textures/wood.jpg");
  
  // Make sure model is loaded
  useEffect(() => {
    if (model) {
      console.log("Enemy ship model loaded successfully");
      setModelLoaded(true);
    }
  }, [model]);
  
  // Deep clone the model to prevent issues
  const shipModel = modelLoaded ? model.clone() : null;
  
  // Get player state
  const playerPosition = usePlayer((state) => state.position);
  const playerTakeDamage = usePlayer((state) => state.takeDamage);
  
  // Access enemy movement functions
  const moveEnemy = useEnemies((state) => state.moveEnemy);
  const damageEnemy = useEnemies((state) => state.damageEnemy);
  
  // Cannonballs
  const cannonBalls = useRef<{
    position: THREE.Vector3;
    direction: THREE.Vector3;
    life: number;
    id: number;
  }[]>([]);
  let cannonBallId = useRef(0);
  
  // Check for collision with player
  useEffect(() => {
    if (!playerPosition) return;
    
    const playerCollision = checkCollision(
      playerPosition,
      position,
      6, // Player radius
      6  // Enemy radius
    );
    
    if (playerCollision) {
      // Ships collided, damage both
      playerTakeDamage(1);
      damageEnemy(id, 1);
    }
  }, [id, position, playerPosition, playerTakeDamage, damageEnemy]);
  
  // Animation and AI behavior
  useFrame((_, delta) => {
    if (!enemyRef.current || !playerPosition) return;
    
    // Update reference position
    enemyRef.current.position.copy(position);
    enemyRef.current.rotation.copy(rotation);
    
    // Ship bobbing on waves
    enemyRef.current.position.y = Math.sin(Date.now() * 0.001 + parseInt(id)) * 1.0 + 1.0;
    enemyRef.current.rotation.x = Math.sin(Date.now() * 0.001 + parseInt(id)) * 0.05;
    enemyRef.current.rotation.z = Math.cos(Date.now() * 0.002 + parseInt(id)) * 0.05;
    
    // Calculate distance to player
    const distanceToPlayer = new THREE.Vector3()
      .subVectors(playerPosition, position)
      .length();
    
    const directionToPlayer = new THREE.Vector3()
      .subVectors(playerPosition, position)
      .normalize();
    
    // Get current state ref
    const state = stateRef.current;
    
    // Update state based on distance to player
    if (distanceToPlayer < 40) {
      state.state = "attack";
    } else if (distanceToPlayer < 100) {
      state.state = "chase";
    } else {
      state.state = "patrol";
    }
    
    // Update enemy based on state
    if (state.state === "patrol") {
      // Patrol behavior - random movement
      state.patrolTimer -= delta;
      
      if (state.patrolTimer <= 0) {
        // Get new random direction
        state.patrolDirection = new THREE.Vector3(
          Math.random() * 2 - 1,
          0,
          Math.random() * 2 - 1
        ).normalize();
        
        state.patrolTimer = 5 + Math.random() * 5; // 5-10 seconds
      }
      
      // Move in patrol direction
      const newPosition = position.clone().add(
        state.patrolDirection.clone().multiplyScalar(5 * delta)
      );
      
      // Calculate rotation to face movement direction
      const targetRotation = Math.atan2(
        state.patrolDirection.x,
        state.patrolDirection.z
      );
      
      // Interpolate current rotation to target rotation
      const newRotation = new THREE.Euler(
        rotation.x,
        THREE.MathUtils.lerp(
          rotation.y,
          targetRotation,
          delta * 1.5
        ),
        rotation.z
      );
      
      // Update position and rotation
      moveEnemy(id, newPosition, newRotation);
      
    } else if (state.state === "chase") {
      // Chase behavior - move toward player
      const newPosition = position.clone().add(
        directionToPlayer.clone().multiplyScalar(10 * delta)
      );
      
      // Calculate rotation to face player
      const targetRotation = Math.atan2(
        directionToPlayer.x,
        directionToPlayer.z
      );
      
      // Interpolate current rotation to target rotation
      const newRotation = new THREE.Euler(
        rotation.x,
        THREE.MathUtils.lerp(
          rotation.y,
          targetRotation,
          delta * 2
        ),
        rotation.z
      );
      
      // Update position and rotation
      moveEnemy(id, newPosition, newRotation);
      
    } else if (state.state === "attack") {
      // Attack behavior - keep distance and fire cannons
      
      // Calculate ideal attack position
      const attackVector = directionToPlayer.clone().multiplyScalar(-20);
      const idealPosition = playerPosition.clone().add(attackVector);
      
      // Move toward ideal position
      const positionDifference = new THREE.Vector3().subVectors(
        idealPosition,
        position
      );
      
      const newPosition = position.clone().add(
        positionDifference.normalize().multiplyScalar(8 * delta)
      );
      
      // Calculate rotation to face player (for broadside attacks)
      const perpendicularToPlayer = new THREE.Vector3(
        directionToPlayer.z,
        0,
        -directionToPlayer.x
      );
      
      const targetRotation = Math.atan2(
        perpendicularToPlayer.x,
        perpendicularToPlayer.z
      );
      
      // Interpolate current rotation to target rotation
      const newRotation = new THREE.Euler(
        rotation.x,
        THREE.MathUtils.lerp(
          rotation.y,
          targetRotation,
          delta * 2.5
        ),
        rotation.z
      );
      
      // Update position and rotation
      moveEnemy(id, newPosition, newRotation);
      
      // Fire cannons
      state.attackCooldown -= delta;
      
      if (state.attackCooldown <= 0 && distanceToPlayer < 35) {
        // Reset cooldown
        state.attackCooldown = 3;
        
        // Create a new cannon ball
        const direction = new THREE.Vector3(
          Math.sin(rotation.y),
          0,
          Math.cos(rotation.y)
        );
        
        // Determine if player is to the left or right
        const cross = new THREE.Vector3().crossVectors(
          direction,
          directionToPlayer
        );
        
        // Fires from the side facing the player
        const sideOffset = cross.y > 0 ? 2 : -2;
        
        cannonBalls.current.push({
          position: new THREE.Vector3(
            position.x + direction.z * sideOffset,
            1,
            position.z - direction.x * sideOffset
          ),
          direction: directionToPlayer.clone(),
          life: 2, // Seconds of life
          id: cannonBallId.current++
        });
        
        console.log("Enemy fired cannon!", id);
      }
    }
    
    // Update cannonballs
    cannonBalls.current.forEach((ball, index) => {
      // Move the cannon ball
      ball.position.add(
        ball.direction.clone().multiplyScalar(30 * delta)
      );
      
      // Decrease life
      ball.life -= delta;
      
      // Check for collision with player
      if (checkCollision(ball.position, playerPosition, 1, 5)) {
        // Hit player!
        playerTakeDamage(10);
        ball.life = 0; // Remove the ball
      }
      
      // Remove if life is depleted
      if (ball.life <= 0) {
        cannonBalls.current.splice(index, 1);
      }
    });
  });
  
  return (
    <group ref={enemyRef} position={position} rotation={rotation}>
      {/* 3D Ship Model - with red color overlay for enemies */}
      {modelLoaded && shipModel ? (
        <group 
          scale={[16, 8, 16]} 
          rotation={[0, Math.PI, 0]}
          position={[0, 3, 0]} 
        >
          <primitive object={shipModel} castShadow receiveShadow />
          
          {/* Red overlay to distinguish enemy ships */}
          <mesh position={[0, 0.8, 0]} scale={[0.5, 2, 0.5]}>
            <boxGeometry args={[0.3, 5, 0.8]} />
            <meshStandardMaterial 
              color="#B71C1C" 
              transparent={true} 
              opacity={0.9} 
              emissive="#B71C1C"
              emissiveIntensity={0.7}
            />
          </mesh>
        </group>
      ) : (
        /* Fallback geometry if model fails to load */
        <group>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[6, 3, 12]} />
            <meshStandardMaterial
              map={woodTexture}
              color="#5D4037"
              roughness={0.8}
            />
          </mesh>
          
          <mesh position={[0, 8, 2]} castShadow>
            <planeGeometry args={[8, 10]} />
            <meshStandardMaterial
              color="#B71C1C"
              side={THREE.DoubleSide}
              roughness={0.8}
            />
          </mesh>
        </group>
      )}
      
      {/* Health indicator (changes color based on health) */}
      <mesh position={[0, -2, 0]}>
        <boxGeometry args={[12, 0.1, 24]} />
        <meshStandardMaterial 
          color={health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336"}
          emissive={health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336"}
          emissiveIntensity={0.5}
          transparent={true}
          opacity={0.7}
        />
      </mesh>
      
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

export default Enemy;
