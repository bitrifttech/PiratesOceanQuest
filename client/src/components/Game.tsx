import { useEffect, useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment as ThreeEnvironment, OrbitControls, Text, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import GridPlane from "./GridPlane"; // Using GridPlane instead of Ocean
import Ship from "./Ship";
// Enemy component removed
import SkyWithClouds from "./SkyWithClouds"; // New enhanced sky with cloud system
import EnvironmentComponent, { EnvironmentFeature, EnvironmentFeatureType } from "./Environment";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC, WORLD } from "../lib/constants";

import { usePlayer } from "../lib/stores/usePlayer";
// import { useEnemies } from "../lib/stores/useEnemies"; // Removed enemies
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";

// Direction indicators removed - no longer needed after fixing ship orientation

// Main game component that sets up the 3D scene
const Game = () => {
  const { camera } = useThree();
  const cameraTargetRef = useRef(new THREE.Vector3());
  const cameraOffsetRef = useRef(new THREE.Vector3(0, 15, 30));
  
  // Get player state
  const playerPosition = usePlayer((state) => state.position);
  const playerRotation = usePlayer((state) => state.rotation);
  const initializePlayer = usePlayer((state) => state.initialize);
  
  // Enemy state removed
  
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
  
  // Environmental features are already defined in the imported type
  
  // Functions to generate non-overlapping environment features
  const isOverlapping = (
    feature1: { x: number; z: number; type: EnvironmentFeatureType; scale: number },
    feature2: { x: number; z: number; type: EnvironmentFeatureType; scale: number }
  ): boolean => {
    // Calculate radius based on feature type and scale
    const getRadius = (type: EnvironmentFeatureType, scale: number): number => {
      // Base radius depends on feature type (these are approximate values)
      let baseRadius = 0;
      switch (type) {
        case 'tropical':
          baseRadius = 20;
          break;
        case 'mountain':
          baseRadius = 25;
          break;
        case 'rocks':
          baseRadius = 10;
          break;
        default:
          baseRadius = 15;
      }
      // Scale the radius based on the feature's scale
      return baseRadius * scale;
    };
    
    // Get radius for each feature
    const radius1 = getRadius(feature1.type, feature1.scale);
    const radius2 = getRadius(feature2.type, feature2.scale);
    
    // Calculate distance between features
    const dx = feature1.x - feature2.x;
    const dz = feature1.z - feature2.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Buffer space between features (additional margin)
    const buffer = 5;
    
    // Check if features are overlapping with buffer space
    return distance < (radius1 + radius2 + buffer);
  };
  
  // Function to create a feature at a position that doesn't overlap
  const createFeatureAtNonOverlappingPosition = (
    id: string,
    type: EnvironmentFeatureType,
    baseScale: number,
    existingFeatures: EnvironmentFeature[],
    minX: number,
    maxX: number,
    minZ: number,
    maxZ: number,
    rotationFactor: number = 0.5, // Factor to multiply with PI for rotation
    maxAttempts: number = 50 // Maximum attempts to find non-overlapping position
  ): EnvironmentFeature | null => {
    // Avoid spawning islands too close to the player start position
    const playerProtectionRadius = 40;
    const playerStartX = 0;
    const playerStartZ = 0;
    
    // Jitter scale to add variety (±10%)
    const scale = baseScale * (0.9 + Math.random() * 0.2);
    
    // Try to find a non-overlapping position
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Generate random position within bounds
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);
      
      // Check distance from player start
      const dxPlayer = x - playerStartX;
      const dzPlayer = z - playerStartZ;
      const distanceFromPlayer = Math.sqrt(dxPlayer * dxPlayer + dzPlayer * dzPlayer);
      
      // If too close to player start, try again
      if (distanceFromPlayer < playerProtectionRadius) {
        continue;
      }
      
      // Create candidate feature
      const candidate = { id, type, x, z, scale, rotation: [0, Math.PI * rotationFactor, 0] as [number, number, number] };
      
      // Check if it overlaps with any existing feature
      let overlapping = false;
      for (const existingFeature of existingFeatures) {
        if (isOverlapping(candidate, existingFeature)) {
          overlapping = true;
          break;
        }
      }
      
      // If not overlapping, return the feature
      if (!overlapping) {
        console.log(`[ENV GEN] Successfully placed ${id} at (${x.toFixed(1)}, ${z.toFixed(1)}) with scale ${scale.toFixed(2)}`);
        return candidate;
      }
    }
    
    console.warn(`[ENV GEN] Failed to place ${id} after ${maxAttempts} attempts`);
    return null;
  };
  
  // Island positions and other environment features (generated to avoid overlaps)
  // Only create this data once and never update it
  const environmentFeatures = useMemo(() => {
    console.log("[GAME] Generating non-overlapping environment features");
    
    const features: EnvironmentFeature[] = [];
    
    // Define the areas and parameters for each feature type
    const featureTypes: {
      type: EnvironmentFeatureType;
      count: number;
      scale: number;
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      prefix: string;
    }[] = [
      // Tropical islands - positioned farther from the starting point
      {
        type: 'tropical',
        count: 4,
        scale: 1.3,
        minX: -100,
        maxX: 100,
        minZ: -100,
        maxZ: 100,
        prefix: 'tropical'
      },
      // Mountain islands - medium distance
      {
        type: 'mountain',
        count: 4,
        scale: 1.8,
        minX: -110,
        maxX: 110,
        minZ: -110,
        maxZ: 110,
        prefix: 'mountain'
      },
      // Rock formations - much closer to create immediate obstacles
      {
        type: 'rocks',
        count: 8,
        scale: 1.9,
        minX: -60,
        maxX: 60,
        minZ: -60,
        maxZ: 60,
        prefix: 'rocks'
      }
    ];
    
    // Generate features for each type
    featureTypes.forEach(({ type, count, scale, minX, maxX, minZ, maxZ, prefix }) => {
      console.log(`[ENV GEN] Generating ${count} features of type ${type}`);
      
      for (let i = 0; i < count; i++) {
        // Create rotation value that's consistent but varied
        const rotationFactor = (i % 8) * 0.25;
        
        // Create feature with non-overlapping position
        const feature = createFeatureAtNonOverlappingPosition(
          `${prefix}_${i + 1}`,
          type,
          scale,
          features,
          minX,
          maxX,
          minZ,
          maxZ,
          rotationFactor
        );
        
        // Add to features array if successfully created
        if (feature) {
          features.push(feature);
        }
      }
    });
    
    console.log(`[ENV GEN] Generated ${features.length} total features`);
    return features as EnvironmentFeature[];
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
    
    // Initialize player
    initializePlayer();
    
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
  
  // Camera follows player ship but preserves manual adjustments
  useFrame(() => {
    if (!playerPosition) return;
    
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
      
      {/* Grid Plane (replaces Ocean) */}
      <GridPlane 
        size={1000}
        divisions={100}
        cellSize={10}
        cellThickness={0.3}
        cellColor="#222266"
        sectionSize={50}
        sectionThickness={0.8}
        sectionColor="#3333AA"
      />
      
      {/* Direction indicators removed - no longer needed after fixing ship orientation */}
      
      {/* Player ship */}
      <Ship />
      
      {/* Environmental features: Islands and rock formations using the new stable Environment component */}
      {/* This component only loads and positions models once */}
      <EnvironmentComponent features={environmentFeatures} />
      
      {/* Enemy ships - removed */}
      
      {/* Interactive orbit controls for click-and-drag camera movement */}
      <OrbitControls 
        ref={orbitControlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        target={playerPosition ? new THREE.Vector3(playerPosition.x, 0, playerPosition.z) : new THREE.Vector3(0, 0, 0)}
        minDistance={10}
        maxDistance={100}
        minPolarAngle={0.1} 
        maxPolarAngle={Math.PI / 2 - 0.1} // Restrict to avoid going below ground
        enabled={true}
      />
    </>
  );
};

export default Game;
