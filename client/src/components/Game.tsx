import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, Environment, OrbitControls, Text, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import ReactDOM from "react-dom";
import WorldObject from "./WorldObject";

import GridPlane from "./GridPlane"; // Using GridPlane instead of Ocean
import Ship from "./Ship";
// Enemy component removed
import Island from "./Island";
import DebugControls from "./DebugControls";
import DebugControlsOverlay from "./DebugControlsOverlay";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC, WORLD } from "../lib/constants";
import { BASE_SCALE, HEIGHT_OFFSET, GRID, RELATIVE_SIZE } from "../lib/ModelScaleSystem";

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
  
  // Define types for environmental features
  type EnvironmentFeatureType = 'tropical' | 'mountain' | 'rocks';
  
  interface EnvironmentFeature {
    type: EnvironmentFeatureType;
    x: number;
    z: number;
    scale: number;
    rotation: [number, number, number];
  }
  
  // Environment features with new, structured positioning system
  const environmentFeatures = useRef<{ 
    type: EnvironmentFeatureType;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
  }[]>([]);
  
  // Generate environment features with structured positioning
  useEffect(() => {
    // Clear any existing features
    environmentFeatures.current = [];
    
    // Define feature areas to ensure organized, intentional placement
    // Each area has its own feature types, density, etc.
    const areas = [
      // Tropical island cluster (northeast quadrant)
      {
        name: "Tropical Isles",
        center: new THREE.Vector3(40, 0, -40),
        radius: 30,
        featureCount: 3,
        type: 'tropical' as const,
        scaleRange: [0.8, 1.5]
      },
      
      // Mountain range (northwest quadrant)
      {
        name: "Mountain Range",
        center: new THREE.Vector3(-60, 0, -40), 
        radius: 40,
        featureCount: 3,
        type: 'mountain' as const,
        scaleRange: [1.0, 2.0]
      },
      
      // Scattered rocks (near player start)
      {
        name: "Rock Formations",
        center: new THREE.Vector3(0, 0, 20),
        radius: 20,
        featureCount: 4,
        type: 'rocks' as const,
        scaleRange: [0.5, 1.2]
      }
    ];
    
    // Generate features for each area
    areas.forEach(area => {
      console.log(`Generating ${area.featureCount} ${area.type} features in ${area.name}`);
      
      for (let i = 0; i < area.featureCount; i++) {
        // Calculate position with a random offset from area center
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * area.radius;
        
        const x = area.center.x + Math.cos(angle) * distance;
        const z = area.center.z + Math.sin(angle) * distance;
        
        // Random rotation around Y axis
        const rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0);
        
        // Random scale within range
        const scale = area.scaleRange[0] + Math.random() * (area.scaleRange[1] - area.scaleRange[0]);
        
        // Add the feature to our environment
        environmentFeatures.current.push({
          type: area.type,
          position: new THREE.Vector3(x, 0, z),
          rotation,
          scale
        });
        
        console.log(`Added ${area.type} at (${x.toFixed(1)}, 0, ${z.toFixed(1)}) with scale ${scale.toFixed(2)}`);
      }
    });
    
    console.log(`Generated ${environmentFeatures.current.length} environmental features in organized areas`);
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

  // Add the DebugControls UI overlay
  useEffect(() => {
    // Create container for debug controls
    const container = document.createElement('div');
    container.id = 'debug-controls-container';
    document.body.appendChild(container);
    
    // Render the DebugControlsOverlay into the container
    const overlay = document.createElement('div');
    container.appendChild(overlay);
    
    // Render the DebugControlsOverlay component
    ReactDOM.render(
      <DebugControlsOverlay containerId="debug-controls-container" />,
      overlay
    );
    
    // Clean up on unmount
    return () => {
      if (document.body.contains(container)) {
        // Clean up React component
        try {
          ReactDOM.unmountComponentAtNode(overlay);
        } catch (e) {
          console.error("Error unmounting debug controls:", e);
        }
        
        // Remove container from DOM
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
      
      {/* Player Ship - Using updated scaling with proper size */}
      <WorldObject 
        modelPath="/models/base_pirate_ship.glb"
        position={playerPosition || new THREE.Vector3(0, 0, 0)}
        rotation={playerRotation || new THREE.Euler(0, Math.PI, 0)} 
        scale={BASE_SCALE.SHIP.BASE} // Using pre-calculated base scale (includes adjustment)
        offset={HEIGHT_OFFSET.SHIP}
        castShadow
        receiveShadow
        onLoad={() => {
          console.log("Ship model loaded with adjusted scale for proper proportions");
        }}
      />
      
      {/* Environment Features - Using unified scale system relative to ship size */}
      {environmentFeatures.current.map((feature, index) => {
        // Determine the appropriate model path based on feature type
        const modelPath = 
          feature.type === 'tropical' ? '/models/tropical_island.glb' :
          feature.type === 'mountain' ? '/models/mountain_island.glb' : 
          '/models/rock_formation.glb';
          
        // Get appropriate base scale and height offset based on feature type
        const baseScale = 
          feature.type === 'tropical' ? BASE_SCALE.ISLAND.TROPICAL :
          feature.type === 'mountain' ? BASE_SCALE.ISLAND.MOUNTAIN : 
          BASE_SCALE.ISLAND.ROCKS;
        
        const heightOffset =
          feature.type === 'tropical' ? HEIGHT_OFFSET.TROPICAL_ISLAND :
          feature.type === 'mountain' ? HEIGHT_OFFSET.MOUNTAIN_ISLAND : 
          HEIGHT_OFFSET.ROCKS;
          
        // Calculate final scale with a much larger multiplier
        // We're applying the feature.scale directly without additional division
        const finalScale = baseScale * feature.scale;
          
        // Return WorldObject for each feature
        return (
          <WorldObject
            key={`env-${feature.type}-${index}`}
            modelPath={modelPath}
            position={feature.position}
            rotation={feature.rotation}
            scale={finalScale}
            offset={heightOffset}
            castShadow
            receiveShadow
            onLoad={() => {
              console.log(`Loaded ${feature.type} model at (${feature.position.x}, ${feature.position.z}) with scale ${finalScale.toFixed(3)}`);
            }}
          />
        );
      })}
      
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
