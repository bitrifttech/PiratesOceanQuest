import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";

import Ocean from "./Ocean";
import Ship from "./Ship";
import Enemy from "./Enemy";
import Island from "./Island";
import DebugControls from "./DebugControls";

import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";

// A reference ship that doesn't move - used to help with orientation
const ReferenceShip = () => {
  return (
    <group position={[20, 0, 0]}>
      {/* Ship hull */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[6, 3, 12]} />
        <meshStandardMaterial color="#FF5722" roughness={0.8} />
      </mesh>
      
      {/* Ship Deck */}
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.5, 0.5, 11.5]} />
        <meshStandardMaterial color="#E64A19" roughness={0.7} />
      </mesh>
      
      {/* Main mast */}
      <mesh position={[0, 8, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 14]} />
        <meshStandardMaterial color="#795548" roughness={0.7} />
      </mesh>
      
      {/* Main sail */}
      <mesh position={[0, 8, 2]} castShadow>
        <planeGeometry args={[8, 10]} />
        <meshStandardMaterial
          color="#FFEB3B"
          side={THREE.DoubleSide}
          roughness={0.8}
        />
      </mesh>
      
      {/* Reference label */}
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
  
  // Island positions (pre-calculated for consistency)
  const islandPositions = useRef([
    { x: 80, z: 100, scale: 1.5 },
    { x: -120, z: -50, scale: 2 },
    { x: 150, z: -120, scale: 1 },
    { x: -60, z: 150, scale: 1.2 },
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

  // State to track if we're using orbit controls
  const [useOrbitControls, setUseOrbitControls] = useState(false);
  
  // Toggle between automatic camera following and manual orbit controls
  const toggleCameraControls = () => {
    setUseOrbitControls(prev => !prev);
    console.log("Camera controls toggled, useOrbitControls:", !useOrbitControls);
  };
  
  // Effect to add keyboard shortcut for toggling camera mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        toggleCameraControls();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [useOrbitControls]); // Need to include the current state to correctly toggle
  
  // Camera follows player ship (only when orbit controls are disabled)
  useFrame(() => {
    if (playerPosition && !useOrbitControls) {
      // Update target position based on player's position
      cameraTargetRef.current.set(
        playerPosition.x,
        0,
        playerPosition.z
      );
      
      // Calculate camera position based on player rotation
      const angle = playerRotation.y;
      const distance = 30;
      const height = 15;
      
      cameraOffsetRef.current.set(
        Math.sin(angle) * distance,
        height,
        Math.cos(angle) * distance
      );
      
      // Set camera position behind the player
      camera.position.copy(cameraTargetRef.current).add(cameraOffsetRef.current);
      
      // Look at the player
      camera.lookAt(playerPosition.x, 0, playerPosition.z);
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
      
      {/* Islands */}
      {islandPositions.current.map((island, index) => (
        <Island 
          key={`island-${index}`} 
          position={[island.x, 0, island.z]} 
          scale={island.scale} 
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
        enabled={useOrbitControls}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        target={playerPosition ? new THREE.Vector3(playerPosition.x, 0, playerPosition.z) : new THREE.Vector3(0, 0, 0)}
        minDistance={10}
        maxDistance={100}
        minPolarAngle={0.1} 
        maxPolarAngle={Math.PI / 2 - 0.1} // Restrict to avoid going below ground
      />
      
      {/* Camera mode indicator */}
      {useOrbitControls && (
        <Text
          position={[0, 20, 0]}
          fontSize={3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          ORBIT CAMERA MODE
        </Text>
      )}
    </>
  );
};

export default Game;
