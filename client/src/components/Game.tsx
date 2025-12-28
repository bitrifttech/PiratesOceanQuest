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
import WorldPowerUp from "./WorldPowerUp"; // World power-up rendering component
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC, WORLD } from "../lib/constants";
import { logger } from "../lib/utils/logger";

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

// WorldPowerUpCollector component to handle collection logic
// We separate this to avoid React hooks conditional calling issues
const WorldPowerUpCollector = memo(() => {
  const playerPosition = usePlayer((state) => state.position);
  const worldPowerUps = usePowerUps((state) => state.worldPowerUps);
  const removeWorldPowerUp = usePowerUps((state) => state.removeWorldPowerUp);

  useFrame(() => {
    if (!playerPosition || worldPowerUps.length === 0) return;
    
    // Check each power-up for collection
    worldPowerUps.forEach(powerUp => {
      // Calculate distance to player
      const dx = playerPosition.x - powerUp.position.x;
      const dz = playerPosition.z - powerUp.position.z;
      const distanceSquared = dx * dx + dz * dz;
      
      // If player is within 5 units, collect the power-up
      if (distanceSquared < 25) { // 5 squared
        logger.debug('powerup', `Player collected power-up: ${powerUp.id} (${powerUp.type})`);
        
        // Add power-up to inventory (doesn't activate immediately)
        const { collectPowerUp } = usePowerUps.getState();
        if (collectPowerUp) {
          collectPowerUp(powerUp.type);
          
          // Play sound effect for collection
          const { playSound } = useAudio.getState();
          playSound('powerUp');
        }
        
        // Remove from the state
        removeWorldPowerUp(powerUp.id);
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
  
  // Enemy state
  const enemies = useEnemies((state) => state.enemies);
  const spawnEnemies = useEnemies((state) => state.spawnEnemies);
  
  // World power-ups (dropped by enemies)
  const worldPowerUps = usePowerUps((state) => state.worldPowerUps);
  
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
    // Use our refactored service to generate environment features
    return EnvironmentGenerator.generateEnvironment();
  }, []);

  // Track if game was already initialized to prevent multiple initializations
  const initialized = useRef(false);
  
  // Initialize game on first load - only once
  useEffect(() => {
    // Skip if already initialized
    if (initialized.current) {
      return;
    }
    
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
  
  // Effect to handle keyboard shortcuts for power-up activation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 'e' key to activate all power-ups in inventory
      if (event.code === 'KeyE') {
        const { activateAllPowerUps, inventoryPowerUps } = usePowerUps.getState();
        
        if (inventoryPowerUps.length > 0) {
          // Play activation sound
          const { playSound } = useAudio.getState();
          playSound('powerUp');
          
          // Activate all power-ups in inventory
          activateAllPowerUps();
        }
      }
    };
    
    // Add and remove event listener
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
        shadow-mapSize={[1024, 1024]} 
      />
      
      {/* Enhanced sky with procedural clouds - optimized count */}
      <SkyWithClouds
        cloudCount={18}
        cloudDensity={6}
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
      
      {/* World Power-Ups Collection Logic */}
      <WorldPowerUpCollector />
      
      {/* Render all world power-ups from the global state */}
      {worldPowerUps.map((powerUp) => (
        <WorldPowerUp
          key={powerUp.id}
          id={powerUp.id}
          type={powerUp.type}
          position={powerUp.position}
        />
      ))}
      
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
