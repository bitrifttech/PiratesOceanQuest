import { useRef, useEffect, useState, Suspense } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT, STATIC, POSITION } from "../lib/constants";

interface CustomModelProps {
  path: string;                           // Path to the GLB model file
  xPosition?: number;                     // X coordinate
  yPosition?: number;                     // Y coordinate (usually derived from model bottom)
  zPosition?: number;                     // Z coordinate
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
  xPosition = 0,
  yPosition = 0,
  zPosition = 0,
  rotation = [0, 0, 0],
  scale = 1.0,
  modelAdjustment,
  modelHeightOffset = 0,
  bob = false,
  bobHeight = 0.03,
  bobSpeed = 1.0,
  receiveShadow = true,
  castShadow = true,
  onLoad
}: CustomModelProps) => {
  // Model reference
  const modelRef = useRef<THREE.Group>(null);
  
  // Track initial position and bob state
  const initialY = useRef<number>(yPosition);
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
  
  // Track whether the model has been positioned already to prevent flickering
  const positionedRef = useRef(false);
  
  // Set initial position when component mounts or modelHeightOffset changes
  useEffect(() => {
    if (modelRef.current && customModel) {
      // Only position once to avoid flickering
      if (positionedRef.current) return;
      positionedRef.current = true;
      
      // Set X and Z from the position props
      modelRef.current.position.x = xPosition;
      modelRef.current.position.z = zPosition;
      
      // Always use static water level as base reference
      const heightFromWater = modelHeightOffset === undefined ? 0 : modelHeightOffset;
      
      // Analyze the model to determine its bounding box
      const boundingBox = new THREE.Box3().setFromObject(customModel);
      const modelHeight = boundingBox.max.y - boundingBox.min.y;
      const modelBottom = boundingBox.min.y;
      
      // Calculate how much we need to offset so the model bottom is exactly at grid level
      // This ensures the bottom of all models aligns perfectly with the grid
      const baselineOffset = -modelBottom;
      
      // The y position places the bottom of the model precisely at grid level, then adds the desired offset
      modelRef.current.position.y = STATIC.WATER_LEVEL + baselineOffset + heightFromWater;
      
      // Log the positioning for debugging
      console.log(`Model ${path} - Height: ${modelHeight.toFixed(2)}, Bottom at: ${modelBottom.toFixed(2)}`);
      console.log(`Positioned with bottom at grid level (${STATIC.WATER_LEVEL}) + baseline (${baselineOffset.toFixed(2)}) + offset (${heightFromWater}) = ${modelRef.current.position.y.toFixed(2)}`);
      
      // Update initialY reference for future positioning
      initialY.current = STATIC.WATER_LEVEL + baselineOffset + heightFromWater;
    }
    
    return () => {
      // Reset when component unmounts
      positionedRef.current = false;
    };
  }, [modelHeightOffset, xPosition, zPosition, path, customModel]);
  
  // In grid mode, we disable bobbing for consistent positioning
  useFrame((_, delta) => {
    if (!modelRef.current) return;
    
    // No bobbing in grid mode - models stay at fixed height
    // This ensures consistent positioning for all game elements
    
    // Uncomment this block if bobbing is needed in the future
    /*
    if (bob) {
      // Increment time
      time.current += delta * bobSpeed;
      
      // Calculate bob offset
      const bobOffset = Math.sin(time.current) * bobHeight;
      
      // Apply offset to Y position
      modelRef.current.position.y = initialY.current + bobOffset;
    }
    */
  });
  
  // Determine final scale factor
  const finalScale = scale * (modelAdjustment || 1.0);
  
  return (
    <group
      // Don't set position here, handle it entirely in useEffect
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
            onUpdate={(self: THREE.Object3D) => {
              // Recompute the bounding box when the model is updated
              if (modelRef.current) {
                const boundingBox = new THREE.Box3().setFromObject(self);
                console.log(`Model ${path} updated - Bottom Y: ${boundingBox.min.y.toFixed(2)}`);
              }
            }}
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