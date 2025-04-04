import { useRef, useEffect, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT } from "../lib/constants";

interface CustomModelProps {
  path: string;                           // Path to the GLB model file
  position?: [number, number, number];    // Model position
  rotation?: [number, number, number];    // Model rotation
  scale?: number;                         // Base scale multiplier
  modelAdjustment?: number;               // Model-specific adjustment factor
  modelHeightOffset?: number;             // Vertical offset to position model at water level
  bob?: boolean;                          // Enable ocean bob effect
  bobHeight?: number;                     // Bob amplitude
  bobSpeed?: number;                      // Bob frequency
  receiveShadow?: boolean;                // Enable shadow receiving
  castShadow?: boolean;                   // Enable shadow casting
  onLoad?: () => void;                    // Callback when model loads
}

/**
 * Renders a custom GLB model with standardized scaling
 */
const CustomModel = ({
  path,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1.0,
  modelAdjustment,
  modelHeightOffset = 0,
  bob = false,
  bobHeight = 0.15,
  bobSpeed = 1.0,
  receiveShadow = true,
  castShadow = true,
  onLoad
}: CustomModelProps) => {
  // Model reference
  const modelRef = useRef<THREE.Group>(null);
  
  // Create a new position array with the height offset applied
  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] + modelHeightOffset,
    position[2]
  ];
  
  const initialY = useRef<number>(adjustedPosition[1]);
  const time = useRef<number>(Math.random() * 100); // Random start time for varied bobbing
  
  // Track loading state
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Load the model
  const { scene: customModel } = useGLTF(path) as GLTF & {
    scene: THREE.Group
  };
  
  // When model loads
  useEffect(() => {
    if (customModel) {
      console.log(`Model loaded: ${path}`);
      setModelLoaded(true);
      
      // Apply shadows to all meshes
      if (receiveShadow || castShadow) {
        customModel.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
          }
        });
      }
      
      // Execute callback if provided
      if (onLoad) onLoad();
    }
    
    return () => {
      // Cleanup
    };
  }, [customModel, path, castShadow, receiveShadow, onLoad]);
  
  // Apply bobbing motion if enabled
  useFrame((_, delta) => {
    if (!modelRef.current || !bob) return;
    
    // Increment time
    time.current += delta * bobSpeed;
    
    // Calculate bob offset
    const bobOffset = Math.sin(time.current) * bobHeight;
    
    // Apply offset to Y position
    modelRef.current.position.y = initialY.current + bobOffset;
  });
  
  // Determine final scale factor
  const finalScale = scale * (modelAdjustment || 1.0);
  
  return (
    <group
      position={adjustedPosition}
      rotation={rotation as unknown as THREE.Euler}
      ref={modelRef}
    >
      {modelLoaded ? (
        <Suspense fallback={
          <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#AAAAAA" />
          </mesh>
        }>
          <primitive 
            object={customModel.clone()} 
            scale={[finalScale, finalScale, finalScale]}
            castShadow={castShadow}
            receiveShadow={receiveShadow}
          />
        </Suspense>
      ) : (
        <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#AAAAAA" />
        </mesh>
      )}
    </group>
  );
};

export default CustomModel;

// Preload models
useGLTF.preload('/models/base_pirate_ship.glb');
useGLTF.preload('/models/advanced_pirate_ship.glb');
useGLTF.preload('/models/tropical_island.glb');
useGLTF.preload('/models/mountain_island.glb');
useGLTF.preload('/models/rock_formation.glb');