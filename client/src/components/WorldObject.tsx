import { useRef, useEffect, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { STATIC } from "../lib/constants";

interface WorldObjectProps {
  // Required properties
  modelPath: string;               // Path to the GLB model file
  position: THREE.Vector3;         // World position (x, z - y will be calculated)
  
  // Optional properties
  rotation?: THREE.Euler;          // Model rotation
  scale?: number;                  // Uniform scale factor
  offset?: number;                 // Additional height offset from grid level
  castShadow?: boolean;            // Whether the model casts shadows
  receiveShadow?: boolean;         // Whether the model receives shadows
  onLoad?: () => void;             // Callback when model loads
}

/**
 * A unified component for positioning 3D models in the game world
 * Handles automatic alignment to grid level with consistent positioning
 */
const WorldObject = ({
  modelPath,
  position,
  rotation = new THREE.Euler(0, 0, 0),
  scale = 1,
  offset = 0,
  castShadow = true,
  receiveShadow = true,
  onLoad
}: WorldObjectProps) => {
  // Refs
  const groupRef = useRef<THREE.Group>(null);
  const positionedRef = useRef(false);
  
  // State
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Load the model
  const { scene: model } = useGLTF(modelPath) as GLTF & {
    scene: THREE.Group
  };
  
  // Initial positioning and setup
  useEffect(() => {
    if (!model || !groupRef.current) return;
    
    // Set model loaded state and apply shadow settings
    setModelLoaded(true);
    
    // Apply shadow settings to all meshes in the model
    model.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = castShadow;
        node.receiveShadow = receiveShadow;
      }
    });
    
    // Notify parent when model is loaded
    if (onLoad) onLoad();
    
    // Log successful load
    console.log(`Model loaded: ${modelPath}`);
  }, [model, modelPath, castShadow, receiveShadow, onLoad]);
  
  // Handle one-time positioning to avoid flickering
  useEffect(() => {
    if (!groupRef.current || !model || positionedRef.current) return;
    
    // Mark as positioned to ensure this only runs once
    positionedRef.current = true;
    
    // Set x and z from position
    groupRef.current.position.x = position.x;
    groupRef.current.position.z = position.z;
    
    // Calculate the bounding box to find the model's bottom
    const boundingBox = new THREE.Box3().setFromObject(model);
    const modelBottom = boundingBox.min.y;
    
    // Calculate the offset needed to place the model's bottom at grid level
    const baselineOffset = -modelBottom;
    
    // Set y position: grid level + offset to align bottom + any additional desired offset
    groupRef.current.position.y = STATIC.WATER_LEVEL + baselineOffset + offset;
    
    // Log positioning info
    console.log(`Positioned ${modelPath} at (${position.x.toFixed(2)}, ${groupRef.current.position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
    console.log(`Model bottom: ${modelBottom.toFixed(2)}, Baseline offset: ${baselineOffset.toFixed(2)}, Additional offset: ${offset}`);
    
    return () => {
      // Reset positioned flag when unmounting
      positionedRef.current = false;
    };
  }, [model, position, offset, modelPath]);
  
  return (
    <group 
      ref={groupRef}
      rotation={rotation}
    >
      {modelLoaded ? (
        <Suspense fallback={
          <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
        }>
          <primitive 
            object={model.clone()} 
            scale={scale}
          />
        </Suspense>
      ) : (
        // Fallback placeholder while loading
        <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      )}
    </group>
  );
};

export default WorldObject;

// Preload all common models for better performance
useGLTF.preload('/models/base_pirate_ship.glb');
useGLTF.preload('/models/advanced_pirate_ship.glb');
useGLTF.preload('/models/tropical_island.glb');
useGLTF.preload('/models/mountain_island.glb');
useGLTF.preload('/models/rock_formation.glb');