import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { checkCollision } from "../lib/helpers/collisionDetection";
import Cannon from "./Cannon";

// Preload the tall multi-deck pirate ship model
useGLTF.preload("/models/tall_pirate_ship.glb");

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
    collisionCooldown: 0, // Add collision cooldown
    currentCannonPosition: 0, // Track which cannon position to fire from
    state: "patrol" as "patrol" | "chase" | "attack"
  });
  
  // Load tall multi-deck pirate ship model
  const { scene: model } = useGLTF("/models/tall_pirate_ship.glb") as any;
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
  
  // We'll handle collisions in the useFrame hook instead of here
  
  // Animation and AI behavior
  useFrame((_, delta) => {
    if (!enemyRef.current || !playerPosition) return;
    
    // Update reference position
    enemyRef.current.position.copy(position);
    enemyRef.current.rotation.copy(rotation);
    
    // Ship bobbing on waves with configurable height - use the same settings as player ship
    const { shipHeight, waveHeight, waveSpeed, shipScale } = useGameState.getState();
    
    // Update model scale dynamically if it has changed
    if (enemyRef.current.children[0] && modelLoaded) {
      enemyRef.current.children[0].scale.set(shipScale, shipScale, shipScale);
    }
    
    // Update position with correct shipHeight
    enemyRef.current.position.y = Math.sin(Date.now() * waveSpeed + parseInt(id)) * waveHeight + shipHeight;
    enemyRef.current.rotation.x = Math.sin(Date.now() * (waveSpeed - 0.0001) + parseInt(id)) * 0.01;
    enemyRef.current.rotation.z = Math.cos(Date.now() * (waveSpeed - 0.0001) + parseInt(id)) * 0.01;
    
    // Calculate distance to player
    const distanceToPlayer = new THREE.Vector3()
      .subVectors(playerPosition, position)
      .length();
    
    const directionToPlayer = new THREE.Vector3()
      .subVectors(playerPosition, position)
      .normalize();
    
    // Get current state ref
    const state = stateRef.current;
    
    // Make sure currentCannonPosition is initialized
    if (state.currentCannonPosition === undefined) {
      state.currentCannonPosition = 0;
    }
    
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
        
        // Determine which side the player is on - positive means left side, negative means right side
        const sideOffset = cross.y > 0 ? 2.5 : -2.5;
        
        // Choose from multiple cannon positions along the side
        // All cannons at the same height level (matching player ship)
        // Generate many more positions evenly spaced along the ship
        const cannonPositions = [];
        
        // Generate 12 positions from front to back of the ship
        const shipLength = 12; // Length of the ship for positioning
        const cannonHeight = 0.8;  // Height of all cannons (above water level)
        
        // Generate evenly distributed positions
        for (let i = 0; i < 12; i++) {
          // Calculate position from front (-shipLength/2) to back (+shipLength/2)
          const offset = -shipLength/2 + (shipLength * i / 11);
          cannonPositions.push({
            height: cannonHeight,
            offset: offset
          });
        }
        
        // Fire from multiple positions at once, spread across the ship's length
        // Number of cannons to fire at once
        const cannonsToFireAtOnce = 3;
        
        // Choose which cannon positions to use - evenly distributed
        // Start with current position and add a few more evenly spaced
        if (state.currentCannonPosition === undefined) {
          state.currentCannonPosition = 0;
        }
        
        // Calculate the positions to fire from
        const positionsToFire = [];
        for (let i = 0; i < cannonsToFireAtOnce; i++) {
          // Calculate index with even spacing
          const posIndex = (state.currentCannonPosition + 
                         Math.floor(i * (cannonPositions.length / cannonsToFireAtOnce))) % 
                         cannonPositions.length;
          
          positionsToFire.push(cannonPositions[posIndex]);
        }
        
        // Increment current position for next volley
        state.currentCannonPosition = (state.currentCannonPosition + 2) % cannonPositions.length;
        
        // Log what we're using
        console.log(`Enemy ${id} firing ${positionsToFire.length} cannons from positions:`, 
                   positionsToFire.map(p => p.offset));
        
        // Fire from each selected position
        positionsToFire.forEach(cannonPosition => {
          // Calculate precise X and Z offsets for the cannon position along the ship's length
          const longitudinalOffsetX = Math.sin(rotation.y + Math.PI/2) * cannonPosition.offset;
          const longitudinalOffsetZ = Math.cos(rotation.y + Math.PI/2) * cannonPosition.offset;
          
          // Precise position for this cannon
          const cannonPosX = position.x + direction.z * sideOffset + longitudinalOffsetX;
          const cannonPosY = cannonPosition.height; // Height is fixed per cannon position
          const cannonPosZ = position.z - direction.x * sideOffset + longitudinalOffsetZ;
          
          // Create the cannon ball position with explicit coordinates
          const cannonBallPosition = new THREE.Vector3(cannonPosX, cannonPosY, cannonPosZ);
          
          // Log exact position for debugging
          console.log(`Enemy cannon at: (${cannonPosX.toFixed(2)}, ${cannonPosY.toFixed(2)}, ${cannonPosZ.toFixed(2)})`);
          
          // Determine position type (front, middle, back) based on numerical offset
          // rather than using string comparisons
          
          // Get the offset value for this cannon
          const offsetValue = cannonPosition.offset;
          
          // Simple numerical checks to determine cannon location type
          let cannonLocationType = '';
          if (offsetValue < -2) {
            cannonLocationType = 'front';
          } else if (offsetValue > 2) {
            cannonLocationType = 'back';
          } else {
            cannonLocationType = 'middle';
          }
          
          // Create spread angle based on the cannon's location
          // This creates the spreading/fan effect as cannonballs fly
          let longSpreadAngle = 0;
          
          // Use simple string equality to check the location type
          if (cannonLocationType === 'front') {
            longSpreadAngle = -0.1; // Front cannon angles slightly backward
          } else if (cannonLocationType === 'back') {
            longSpreadAngle = 0.1;  // Back cannon angles slightly forward
          }
          // Middle cannons stay at 0 (fire straight)
          
          // Create a rotation matrix to apply the spread angle
          const spreadMatrix = new THREE.Matrix4().makeRotationY(longSpreadAngle);
          
          // Create base direction with upward arc component (y=0.15)
          const baseDir = directionToPlayer.clone();
          baseDir.y = 0.15; // Add upward component for arcing trajectory
          
          // Apply the spread rotation
          baseDir.applyMatrix4(spreadMatrix);
          
          // Add a small random deviation for realism
          const accuracy = 0.95; // Higher accuracy (0.9 to 0.95)
          const spreadX = (Math.random() - 0.5) * (1 - accuracy) * 0.1;
          const spreadZ = (Math.random() - 0.5) * (1 - accuracy) * 0.1;
          
          // Apply the random deviation and normalize
          const fireDirection = baseDir.add(new THREE.Vector3(spreadX, 0, spreadZ)).normalize();
          
          // Log the firing parameters for debugging
          console.log(`Enemy cannon (${cannonLocationType}) firing: 
            Position: (${cannonPosX.toFixed(1)}, ${cannonPosY.toFixed(1)}, ${cannonPosZ.toFixed(1)})
            Direction: (${fireDirection.x.toFixed(2)}, ${fireDirection.y.toFixed(2)}, ${fireDirection.z.toFixed(2)})`
          );
          
          // Add the cannonball to the list with the new direction
          cannonBalls.current.push({
            position: cannonBallPosition,
            direction: fireDirection,
            life: 2.5, // Slightly longer life to match player's cannonballs
            id: cannonBallId.current++
          });
        });
        
        console.log("Enemy fired cannon!", id);
      }
    }
    
    // Update collision cooldown
    state.collisionCooldown = Math.max(0, state.collisionCooldown - delta);
    
    // Check for collision with player with cooldown
    const playerCollision = checkCollision(
      playerPosition,
      position,
      6, // Player radius
      6  // Enemy radius
    );
    
    if (playerCollision && state.collisionCooldown <= 0) {
      // Ships collided, but we're just logging for debugging, not causing damage
      console.log("DEBUG: Ship collision detected with enemy ID:", id);
      console.log("DEBUG: Position player:", playerPosition);
      console.log("DEBUG: Position enemy:", position);
      
      // Collision detection only - no damage
      // playerTakeDamage(5);  // Disabled
      // damageEnemy(id, 5);   // Disabled
      
      // Set collision cooldown to 2 seconds
      state.collisionCooldown = 2.0;
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
        console.log("DEBUG: Cannonball hit player! from enemy ID:", id);
        console.log("DEBUG: Ball position:", ball.position);
        console.log("DEBUG: Player position:", playerPosition);
        // playerTakeDamage(10); // Disabled for debugging
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
          scale={[useGameState.getState().shipScale, useGameState.getState().shipScale, useGameState.getState().shipScale]} // Use dynamic ship scale
          rotation={[0, Math.PI - Math.PI/2, 0]} // Fix 90 degree rotation issue
          position={[0, useGameState.getState().shipHeight - 2.0, 0]} // Lower position to better show multiple decks
        >
          <primitive object={shipModel} castShadow receiveShadow />
          
          {/* Red flag to distinguish enemy ships - adjusted for new rotation */}
          <mesh position={[0, 6, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.1, 4, 2.5]} />
            <meshStandardMaterial 
              color="#B71C1C" 
              transparent={true} 
              opacity={1.0} 
              emissive="#B71C1C"
              emissiveIntensity={0.8}
            />
          </mesh>
          
          {/* Skull and crossbones symbol on flag - adjusted for new rotation */}
          <mesh position={[0.1, 6, 0]} rotation={[0, 0, 0]}>
            <planeGeometry args={[2.0, 1.5]} />
            <meshStandardMaterial 
              color="black" 
              transparent={true} 
              opacity={1.0} 
              emissive="white"
              emissiveIntensity={0.5}
              side={THREE.DoubleSide}
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
