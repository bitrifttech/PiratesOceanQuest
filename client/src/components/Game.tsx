import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import Ocean from "./Ocean";
import Ship from "./Ship";
import Enemy from "./Enemy";
import Island from "./Island";

import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { useAudio } from "../lib/stores/useAudio";

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
    spawnEnemies(5);
    
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

  // Camera follows player ship
  useFrame(() => {
    if (playerPosition) {
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
      
      {/* Debug controls - disabled in production */}
      {/* <OrbitControls /> */}
    </>
  );
};

export default Game;
