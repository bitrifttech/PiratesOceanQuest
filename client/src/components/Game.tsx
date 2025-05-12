import { useEffect, useRef, useState, useMemo, memo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment as ThreeEnvironment, OrbitControls, Text, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Ocean from "./Ocean"; // Using Ocean for water surface
import Ship from "./Ship";
import EnemyShip from "./EnemyShip"; // Added back enemy ship component
import SkyWithClouds from "./SkyWithClouds"; // New enhanced sky with cloud system
import EnvironmentComponent, { EnvironmentFeature, EnvironmentFeatureType } from "./Environment";
import PowerUpManager from "./PowerUpManager"; // Power-up system for prizes
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC, WORLD } from "../lib/constants";

import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies"; // Re-enabled enemies
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";
import { usePowerUps, PowerUpType } from "../lib/stores/usePowerUps"; // Power-up state management

// Import services
import { EnemyManager } from "../lib/services/EnemyManager";
import { EnvironmentGenerator } from "../lib/services/EnvironmentGenerator";
import { CollisionService } from "../lib/services/CollisionService";
import { collisionHandler } from "../lib/services/CollisionHandler";

// Direction indicators removed - no longer needed after fixing ship orientation

// DirectPowerUpCollector component to handle collection logic
// We separate this to avoid React hooks conditional calling issues
const DirectPowerUpCollector = memo(() => {
  const playerPosition = usePlayer((state) => state.position);
  const directPowerUps = useEnemies((state) => state.directPowerUps);
  const removeDirectPowerUp = useEnemies((state) => state.removeDirectPowerUp);

  useFrame(() => {
    if (!playerPosition || directPowerUps.length === 0) return;
    
    // Check each power-up for collection
    directPowerUps.forEach(powerUp => {
      // Calculate distance to player
      const dx = playerPosition.x - powerUp.position.x;
      const dz = playerPosition.z - powerUp.position.z;
      const distanceSquared = dx * dx + dz * dz;
      
      // If player is within 5 units, collect the power-up
      if (distanceSquared < 25) { // 5 squared
        console.log(`[DIRECT POWER-UP] Player collected power-up: ${powerUp.id} (${powerUp.type})`);
        
        // Add power-up effect to player
        const { addPowerUp } = usePowerUps.getState();
        if (addPowerUp) {
          addPowerUp(powerUp.type as PowerUpType);
          
          // Play sound effect
          const { playSound } = useAudio.getState();
          playSound('powerUp');
        }
        
        // Remove from the state
        removeDirectPowerUp(powerUp.id);
      }
    });
  });
  
  return null; // This component doesn't render anything
});

// Main game component that sets up the 3D scene
const Game = () => {
  const { camera } = useThree();
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraOffsetRef = useRef(new THREE.Vector3(0, 15, 30));
  
  // Get player state
  const playerPosition = usePlayer((state) => state.position);
  const playerRotation = usePlayer((state) => state.rotation);
  const initializePlayer = usePlayer((state) => state.initialize);
  
  // Enemy state and direct power-ups
  const enemies = useEnemies((state) => state.enemies);
  const directPowerUps = useEnemies((state) => state.directPowerUps);
  const removeDirectPowerUp = useEnemies((state) => state.removeDirectPowerUp);
  const spawnEnemies = useEnemies((state) => state.spawnEnemies);
  
  // Sound effects
  const playBackgroundMusic = useAudio((state) => state.playBackgroundMusic);
  
  // Game state
  const setGameOver = useGameState((state) => state.setGameOver);
  const playerHealth = usePlayer((state) => state.health);
  const shipHeight = useGameState((state) => state.shipHeight);
  const waveHeight = useGameState((state) => state.waveHeight);
  const waveSpeed = useGameState((state) => state.waveSpeed);
  const setShipHeight = useGameState((state) => state.setShipHeight);
  const setWaveParameters = useGameState((state) => state.setWaveParameters);
  
  // Environmental features are defined and managed by the EnvironmentGenerator service
  
  // Island positions and other environment features (generated to avoid overlaps)
  // Only create this data once and never update it
  const environmentFeatures = useMemo(() => {
    console.log("[GAME] Generating non-overlapping environment features using EnvironmentGenerator service");
    
    // Use our refactored service to generate environment features
    return EnvironmentGenerator.generateEnvironment();
  }, []);

  // Track if game was already initialized to prevent multiple initializations
  const initialized = useRef(false);
  
  // Initialize game on first load - only once
  useEffect(() => {
    // Skip if already initialized
    if (initialized.current) {
      console.log("Game already initialized, skipping");
      return;
    }
    
    console.log("Game initialized", {
      environmentFeatures: environmentFeatures.length,
      sampleFeature: environmentFeatures[0],
      playerPosition
    });
    
    // Register environment features with collision handler
    collisionHandler.setFeatures(environmentFeatures);
    
    // Initialize player
    initializePlayer();
    
    // Spawn a test enemy ship directly in front of the player for debugging orientation
    EnemyManager.spawnTestEnemyShip();
    
    // Play background music
    playBackgroundMusic();
    
    // Set up camera
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);
    
    // Log key game elements
    console.log("[GAME-INIT] Environment features sample:", 
                environmentFeatures.slice(0, 3)); 
    console.log("[GAME-INIT] Player state:", {
      position: usePlayer.getState().position,
      rotation: usePlayer.getState().rotation,
      health: usePlayer.getState().health
    });
    console.log("[GAME-INIT] Game state:", {
      gameState: useGameState.getState().gameState,
      shipHeight: useGameState.getState().shipHeight,
      shipScale: useGameState.getState().shipScale
    });
    
    // Mark as initialized
    initialized.current = true;
    
  // Run only once on component mount, don't depend on changing values
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Check for game over condition
  useEffect(() => {
    if (playerHealth <= 0) {
      setGameOver();
    }
  }, [playerHealth, setGameOver]);

  // Reference to the OrbitControls
  const orbitControlsRef = useRef<any>(null);
  
  // Track the last camera position and rotation before manual adjustment
  const lastCameraPositionRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const lastCameraRotationRef = useRef<THREE.Euler>(new THREE.Euler());
  const cameraAdjustedRef = useRef<boolean>(false);
  
  // Player's ship orientation for forward direction
  const shipForwardRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, -1));
  
  // Camera dynamics settings
  const [cameraSmoothing, setCameraSmoothing] = useState<number>(0.05);
  
  // Health regeneration timer
  const healthRegenTimer = useRef<number>(0);
  const regenInterval = 2; // Regenerate health every 2 seconds
  const regenAmount = 1; // Amount of health to regenerate each interval (slowed down)
  
  // Camera follows player ship but preserves manual adjustments
  useFrame((state, delta) => {
    if (!playerPosition) return;
    
    // Health regeneration system
    const playerState = usePlayer.getState();
    healthRegenTimer.current += delta;
    
    // Check if it's time to regenerate health
    if (healthRegenTimer.current >= regenInterval) {
      // Only regenerate if player health is below max and above 0 (not dead)
      if (playerState.health > 0 && playerState.health < playerState.maxHealth) {
        playerState.heal(regenAmount);
        // Only log every 5th regeneration to reduce console spam (every 10 seconds)
        if (Math.floor(playerState.health) % 5 === 0) {
          console.log(`[PLAYER] Health: ${playerState.health}/${playerState.maxHealth} (slowly regenerating)`);
        }
      }
      // Reset timer
      healthRegenTimer.current = 0;
    }
    
    // Update active power-ups
    const powerUpsState = usePowerUps.getState();
    powerUpsState.updatePowerUps(delta);
    
    // Update target to always follow the player ship
    cameraTargetRef.current.set(
      playerPosition.x,
      0,
      playerPosition.z
    );
    
    // Always update the ship's forward direction based on rotation
    // This is needed for proper WASD controls relative to camera view
    shipForwardRef.current.set(0, 0, -1).applyEuler(playerRotation);
    
    if (orbitControlsRef.current) {
      // Update orbit controls target to follow the player
      orbitControlsRef.current.target.set(
        playerPosition.x,
        0,
        playerPosition.z
      );
    }
  });

  // Add the DebugControls UI directly in the render tree
  // This avoids repeated mounting/unmounting that was causing flickering

  return (
    <>
      {/* Environment lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[100, 100, 50]} 
        intensity={1} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
      />
      
      {/* Enhanced sky with procedural clouds */}
      <SkyWithClouds
        cloudCount={35}
        cloudDensity={8}
        cloudHeight={60}
        dayNightCycle={true}
        cycleSpeed={0.05}
        initialTimeOfDay={0.3}
      />
      <ThreeEnvironment preset="sunset" />
      
      {/* Ocean water surface */}
      <Ocean />
      
      {/* Direction indicators removed - no longer needed after fixing ship orientation */}
      
      {/* Player ship */}
      <Ship />
      
      {/* Environmental features: Islands and rock formations using the new stable Environment component */}
      {/* This component only loads and positions models once */}
      <EnvironmentComponent features={environmentFeatures} />
      
      {/* Power-up system to handle prizes from defeated enemy ships */}
      <PowerUpManager />
      
      {/* Test power-up at world origin (0,0,0) */}
      <mesh position={[0, 1, 0]} userData={{ isPowerUp: true, type: 'health_boost' }}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Test power-up near player start position */}
      <mesh position={[15, 1, 15]} userData={{ isPowerUp: true, type: 'speed_boost' }}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Direct Power-Ups Collection Logic */}
      <DirectPowerUpCollector />
      
      {/* Render all direct power-ups from the global state */}
      {directPowerUps.map((powerUp) => {
        // Determine color based on power-up type
        let color = '#ffffff';
        let geometry = null;
        
        switch (powerUp.type) {
          case 'health_boost':
            color = '#ff0000';
            geometry = <sphereGeometry args={[0.8, 16, 16]} />;
            break;
          case 'speed_boost':
            color = '#00ff00';
            geometry = <coneGeometry args={[0.7, 1.4, 16]} />;
            break;
          case 'double_damage':
            color = '#ff7700';
            geometry = <boxGeometry args={[1, 1, 1]} />;
            break;
          case 'rapid_fire':
            color = '#00ffff';
            geometry = <cylinderGeometry args={[0.4, 0.6, 1.2, 16]} />;
            break;
          case 'shield':
            color = '#0000ff';
            geometry = <torusGeometry args={[0.6, 0.2, 16, 32]} />;
            break;
          case 'triple_shot':
            color = '#ff00ff';
            geometry = <dodecahedronGeometry args={[0.7, 0]} />;
            break;
          case 'long_range':
            color = '#ffff00';
            geometry = <octahedronGeometry args={[0.7, 0]} />;
            break;
          default:
            color = '#ffffff';
            geometry = <sphereGeometry args={[0.6, 12, 12]} />;
        }
        
        // The position from the stored power-up as Three.js compatible array
        const position: [number, number, number] = [
          powerUp.position.x,
          powerUp.position.y, // Should already be at 1
          powerUp.position.z
        ];
        
        // Calculate time-based animation with unique variations
        // Use hash code of the ID as an offset to create different animations for each power-up
        const idHash = powerUp.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const bobOffset = Math.sin((Date.now() + idHash) * 0.003) * 0.3;
        const spinOffset = (Date.now() + idHash) * 0.001;
                
        return (
          <group key={powerUp.id} position={position} rotation={[0, spinOffset, 0]}>
            <mesh position={[0, bobOffset, 0]} userData={{ isPowerUp: true, id: powerUp.id, type: powerUp.type }}>
              {geometry}
              <meshStandardMaterial 
                color={color} 
                emissive={color} 
                emissiveIntensity={0.7} 
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            <pointLight 
              color={color} 
              intensity={0.8} 
              distance={5} 
              position={[0, bobOffset, 0]}
            />
          </group>
        );
      })}
      
      {/* Enemy ships */}
      {enemies.map((enemy) => (
        <EnemyShip
          key={enemy.id}
          id={enemy.id}
          initialPosition={enemy.position}
          initialRotation={enemy.rotation}
        />
      ))}
      
      {/* Interactive orbit controls for click-and-drag camera movement */}
      <OrbitControls 
        ref={orbitControlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        target={playerPosition ? new THREE.Vector3(playerPosition.x, 0, playerPosition.z) : new THREE.Vector3(0, 0, 0)}
        minDistance={10}
        maxDistance={500}
        minPolarAngle={0.1} 
        maxPolarAngle={Math.PI / 2 - 0.1} // Restrict to avoid going below ground
        enabled={true}
      />
    </>
  );
};

export default Game;
