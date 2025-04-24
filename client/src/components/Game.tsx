import { useEffect, useRef, useState, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment as ThreeEnvironment, OrbitControls, Text, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import GridPlane from "./GridPlane"; // Using GridPlane instead of Ocean
import Ship from "./Ship";
// Enemy component removed
import EnvironmentComponent, { EnvironmentFeature, EnvironmentFeatureType } from "./Environment";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC, WORLD } from "../lib/constants";

import { usePlayer } from "../lib/stores/usePlayer";
// import { useEnemies } from "../lib/stores/useEnemies"; // Removed enemies
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";

// Reference ship component removed
/* 
const ReferenceShip = () => {
  // This component has been removed to eliminate the reference ship
  return null;
};
*/

// Direction indicators for debugging
const DirectionIndicators = () => {
  return (
    <group>
      {/* North marker */}
      <group position={[0, 0, -50]}>
        <mesh>
          <boxGeometry args={[5, 5, 5]} />
          <meshStandardMaterial color="red" />
        </mesh>
        <Text
          position={[0, 10, 0]}
          fontSize={5}
          color="red"
          anchorX="center"
          anchorY="middle"
        >
          NORTH
        </Text>
      </group>
      
      {/* East marker */}
      <group position={[50, 0, 0]}>
        <mesh>
          <boxGeometry args={[5, 5, 5]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        <Text
          position={[0, 10, 0]}
          fontSize={5}
          color="blue"
          anchorX="center"
          anchorY="middle"
        >
          EAST
        </Text>
      </group>
    </group>
  );
};

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
  
  // Type definitions imported at the top of the file
  
  // Island positions and other environment features (pre-calculated for consistency)
  // Only create this data once and never update it
  const environmentFeatures = useMemo(() => {
    console.log("[GAME] Creating environment features once");
    return [
      // Tropical islands - positioned closer to the starting point
      { id: 'tropical_1', type: 'tropical', x: 40, z: 40, scale: 1.5, rotation: [0, Math.PI * 0.5, 0] },
      { id: 'tropical_2', type: 'tropical', x: -60, z: -30, scale: 1.2, rotation: [0, Math.PI * 1.2, 0] },
      { id: 'tropical_3', type: 'tropical', x: 80, z: -50, scale: 0.8, rotation: [0, Math.PI * 0.8, 0] },
      { id: 'tropical_4', type: 'tropical', x: -90, z: 70, scale: 1.0, rotation: [0, Math.PI * 1.7, 0] },
      
      // Mountain islands - medium distance
      { id: 'mountain_1', type: 'mountain', x: 70, z: -60, scale: 1.8, rotation: [0, Math.PI * 0.3, 0] },
      { id: 'mountain_2', type: 'mountain', x: -40, z: 80, scale: 2.0, rotation: [0, Math.PI * 1.1, 0] },
      { id: 'mountain_3', type: 'mountain', x: 100, z: 90, scale: 2.2, rotation: [0, Math.PI * 0.7, 0] },
      { id: 'mountain_4', type: 'mountain', x: -100, z: -80, scale: 1.7, rotation: [0, Math.PI * 1.5, 0] },
      
      // Rock formations - much closer to create immediate obstacles (increased scale)
      { id: 'rocks_1', type: 'rocks', x: 20, z: 25, scale: 2.0, rotation: [0, Math.PI * 0.2, 0] },
      { id: 'rocks_2', type: 'rocks', x: -15, z: 30, scale: 1.8, rotation: [0, Math.PI * 1.4, 0] },
      { id: 'rocks_3', type: 'rocks', x: 25, z: -20, scale: 1.7, rotation: [0, Math.PI * 0.9, 0] },
      { id: 'rocks_4', type: 'rocks', x: -25, z: -25, scale: 2.2, rotation: [0, Math.PI * 1.3, 0] },
      { id: 'rocks_5', type: 'rocks', x: 40, z: 15, scale: 1.5, rotation: [0, Math.PI * 0.4, 0] },
      { id: 'rocks_6', type: 'rocks', x: -20, z: -40, scale: 2.1, rotation: [0, Math.PI * 1.6, 0] },
      { id: 'rocks_7', type: 'rocks', x: 5, z: 45, scale: 1.6, rotation: [0, Math.PI * 0.6, 0] },
      { id: 'rocks_8', type: 'rocks', x: 50, z: 30, scale: 1.9, rotation: [0, Math.PI * 1.8, 0] },
      
      // Single test island
      { id: 'test_island', type: 'tropical', x: 100, z: 100, scale: 1.5, rotation: [0, 0, 0] },
    ] as EnvironmentFeature[];
  }, []);

  // Initialize game on first load
  useEffect(() => {
    console.log("Game initialized");
    
    // Initialize player
    initializePlayer();
    
    // Play background music
    playBackgroundMusic();
    
    // Set up camera
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);
    
  }, [initializePlayer, playBackgroundMusic, camera]);
  
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
      
      {/* Sky and environment */}
      <Sky 
        distance={450000} 
        sunPosition={[0, 1, 0]} 
        inclination={0.5} 
        azimuth={0.25} 
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
      
      {/* Direction indicator elements */}
      {/* Reference ship removed */}
      <DirectionIndicators />
      
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
