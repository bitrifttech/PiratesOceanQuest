import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment, OrbitControls, Text, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import Ocean from "./Ocean";
import Ship from "./Ship";
import Enemy from "./Enemy";
import Island from "./Island";
import DebugControls from "./DebugControls";
import { SCALE, MODEL_ADJUSTMENT, POSITION, WORLD } from "../lib/constants";

import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";

// A reference ship that doesn't move - used to help with orientation
const ReferenceShip = () => {
  // Load the same tall multi-deck pirate ship model
  const { scene: model } = useGLTF("/models/tall_pirate_ship.glb") as any;
  const [modelLoaded, setModelLoaded] = useState(false);
  const shipRef = useRef<THREE.Group>(null);
  
  // Make sure model is loaded
  useEffect(() => {
    if (model) {
      console.log("Reference ship model loaded successfully");
      setModelLoaded(true);
    }
  }, [model]);
  
  // Deep clone the model to prevent issues
  const shipModel = modelLoaded ? model.clone() : null;
  
  // Get game state for ship scale and height - using directly to always have latest values
  const shipHeight = useGameState((state) => state.shipHeight);
  const shipScale = useGameState((state) => state.shipScale);
  const waveHeight = useGameState((state) => state.waveHeight);
  const waveSpeed = useGameState((state) => state.waveSpeed);
  
  // Add wave bobbing effect to match other ships
  useFrame(() => {
    if (!shipRef.current) return;
    
    // Apply bobbing effect on waves
    const time = Date.now() * waveSpeed;
    shipRef.current.position.y = Math.sin(time) * waveHeight + shipHeight; 
    shipRef.current.rotation.x = Math.sin(time - 0.1) * 0.01;
    shipRef.current.rotation.z = Math.cos(time - 0.1) * 0.01;
  });
  
  return (
    <group ref={shipRef} position={[20, shipHeight, 0]}>
      {modelLoaded && shipModel ? (
        <group 
          scale={[shipScale, shipScale, shipScale]} // Use dynamic ship scale
          rotation={[0, Math.PI - Math.PI/2, 0]} // Fix 90 degree rotation issue
          position={[0, 0, 0]} // Centered at origin since parent handles height
        >
          <primitive object={shipModel} castShadow receiveShadow />
          
          {/* Orange flag to distinguish reference ship */}
          <mesh position={[0, 6, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.1, 4, 2.5]} />
            <meshStandardMaterial 
              color="#FF5722" 
              transparent={true} 
              opacity={1.0} 
              emissive="#FF5722"
              emissiveIntensity={0.8}
            />
          </mesh>
          
          {/* Reference text */}
          <Text
            position={[0, 12, 0]}
            fontSize={2}
            color="#FF5722"
            anchorX="center"
            anchorY="middle"
          >
            REFERENCE
          </Text>
        </group>
      ) : (
        /* Fallback if model fails to load */
        <group>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[6, 3, 12]} />
            <meshStandardMaterial color="#FF5722" roughness={0.8} />
          </mesh>
          
          <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[5.5, 0.5, 11.5]} />
            <meshStandardMaterial color="#E64A19" roughness={0.7} />
          </mesh>
          
          <mesh position={[0, 8, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 14]} />
            <meshStandardMaterial color="#795548" roughness={0.7} />
          </mesh>
          
          <mesh position={[0, 8, 2]} castShadow>
            <planeGeometry args={[8, 10]} />
            <meshStandardMaterial
              color="#FFEB3B"
              side={THREE.DoubleSide}
              roughness={0.8}
            />
          </mesh>
          
          <Text
            position={[0, 10, 0]}
            fontSize={2}
            color="#FF5722"
            anchorX="center"
            anchorY="middle"
          >
            REFERENCE
          </Text>
        </group>
      )}
    </group>
  );
};

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
  
  // Get enemy state
  const enemies = useEnemies((state) => state.enemies);
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
  
  // Define types for environmental features
  type EnvironmentFeatureType = 'tropical' | 'mountain' | 'rocks';
  
  interface EnvironmentFeature {
    type: EnvironmentFeatureType;
    x: number;
    z: number;
    scale: number;
    rotation: [number, number, number];
  }
  
  // Island positions and other environment features (pre-calculated for consistency)
  // Each feature has type, position, scale, and rotation
  const environmentFeatures = useRef<EnvironmentFeature[]>([
    // Tropical islands - positioned closer to the starting point
    { type: 'tropical', x: 40, z: 40, scale: 1.5, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'tropical', x: -60, z: -30, scale: 1.2, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'tropical', x: 80, z: -50, scale: 0.8, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'tropical', x: -90, z: 70, scale: 1.0, rotation: [0, Math.random() * Math.PI * 2, 0] },
    
    // Mountain islands - medium distance
    { type: 'mountain', x: 70, z: -60, scale: 1.8, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'mountain', x: -40, z: 80, scale: 2.0, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'mountain', x: 100, z: 90, scale: 2.2, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'mountain', x: -100, z: -80, scale: 1.7, rotation: [0, Math.random() * Math.PI * 2, 0] },
    
    // Rock formations - much closer to create immediate obstacles (increased scale)
    { type: 'rocks', x: 20, z: 25, scale: 2.0, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'rocks', x: -15, z: 30, scale: 1.8, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'rocks', x: 25, z: -20, scale: 1.7, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'rocks', x: -25, z: -25, scale: 2.2, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'rocks', x: 40, z: 15, scale: 1.5, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'rocks', x: -20, z: -40, scale: 2.1, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'rocks', x: 5, z: 45, scale: 1.6, rotation: [0, Math.random() * Math.PI * 2, 0] },
    { type: 'rocks', x: 50, z: 30, scale: 1.9, rotation: [0, Math.random() * Math.PI * 2, 0] },
  ]);

  // Initialize game on first load
  useEffect(() => {
    console.log("Game initialized");
    
    // Initialize player
    initializePlayer();
    
    // Spawn initial enemies
    spawnEnemies(3); // Reduced number of enemies to make debugging easier
    
    // Play background music
    playBackgroundMusic();
    
    // Set up camera
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);
    
  }, [initializePlayer, spawnEnemies, playBackgroundMusic, camera]);
  
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

  // Add the DebugControls UI overlay
  useEffect(() => {
    // Create container for debug controls
    const container = document.createElement('div');
    container.id = 'debug-controls-container';
    document.body.appendChild(container);
    
    // Render the DebugControls component into the container
    const root = document.createElement('div');
    container.appendChild(root);
    
    // Clean up on unmount
    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

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
      <Environment preset="sunset" />
      
      {/* Ocean */}
      <Ocean />
      
      {/* Reference elements */}
      <ReferenceShip />
      <DirectionIndicators />
      
      {/* Player ship */}
      <Ship />
      
      {/* Environmental features: Islands and rock formations */}
      {environmentFeatures.current.map((feature, index) => (
        <Island 
          key={`env-${feature.type}-${index}`} 
          position={[
            feature.x, 
            feature.type === 'rocks' 
              ? POSITION.ISLAND.ROCKS 
              : feature.type === 'mountain' 
                ? POSITION.ISLAND.MOUNTAIN 
                : POSITION.ISLAND.TROPICAL, 
            feature.z
          ]} 
          scale={feature.scale} 
          rotation={feature.rotation}
          type={feature.type}
        />
      ))}
      
      {/* Enemy ships */}
      {enemies.map((enemy) => (
        <Enemy 
          key={enemy.id} 
          id={enemy.id} 
          position={enemy.position} 
          rotation={enemy.rotation} 
          health={enemy.health}
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
        maxDistance={100}
        minPolarAngle={0.1} 
        maxPolarAngle={Math.PI / 2 - 0.1} // Restrict to avoid going below ground
        enabled={true}
      />
    </>
  );
};

export default Game;
