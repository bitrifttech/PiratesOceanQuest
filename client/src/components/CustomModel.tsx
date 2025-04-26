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
 * Completely rewritten to avoid infinite loops caused by setState in effects
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
  
  // One-time initialization flags to prevent multiple processing
  const initialized = useRef(false);
  const positioned = useRef(false);
  const debugLogged = useRef(false);
  const instanceId = useRef(`model_${Math.random().toString(36).substr(2, 9)}`);
  
  // For controlling bob effect
  const initialY = useRef<number>(yPosition);
  const time = useRef<number>(Math.random() * 100);
  
  // Use a ref for model loaded state instead of state to prevent re-renders
  const modelLoadedRef = useRef(false);
  const [fallbackVisible, setFallbackVisible] = useState(true);
  
  // Load the model
  // Set second parameter to true to disable automatic dispose (prevents model disappearing)
  const result = useGLTF(path, true) as GLTF & { scene: THREE.Group };
  const { scene: originalModel } = result;
  
  // Clone model once to avoid sharing materials
  const modelClone = useRef<THREE.Group | null>(null);
  
  // Position key to track changes
  const positionKey = useRef(`${xPosition.toFixed(2)}_${zPosition.toFixed(2)}_${modelHeightOffset}`);
  
  // Initialize model on first render only
  useEffect(() => {
    // Skip if already initialized or no model loaded
    if (initialized.current || !originalModel) return;
    
    try {
      // Clone once
      modelClone.current = originalModel.clone();
      
      // Set shadows and optimize materials for performance
      if (modelClone.current) {
        modelClone.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Apply shadow settings
            child.castShadow = castShadow;
            child.receiveShadow = receiveShadow;
            
            // Optimize materials for performance
            if (child.material) {
              // Handle array of materials
              if (Array.isArray(child.material)) {
                child.material.forEach(material => {
                  if (material instanceof THREE.MeshStandardMaterial) {
                    // Disable expensive reflections
                    material.metalness = 0;
                    material.roughness = 1;
                    material.envMapIntensity = 0;
                    material.needsUpdate = true;
                  }
                });
              } 
              // Handle single material
              else if (child.material instanceof THREE.MeshStandardMaterial) {
                // Disable expensive reflections
                child.material.metalness = 0;
                child.material.roughness = 1;
                child.material.envMapIntensity = 0;
                child.material.needsUpdate = true;
              }
            }
          }
        });
      }
      
      // Mark as initialized and loaded
      initialized.current = true;
      modelLoadedRef.current = true;
      
      // Hide fallback after a short delay to avoid flickering
      setTimeout(() => {
        setFallbackVisible(false);
      }, 100);
      
      console.log(`Model initialized: ${path}`);
      
      // Execute callback
      if (onLoad) onLoad();
    } catch (err) {
      console.error(`Failed to initialize model ${path}:`, err);
    }
    
    // This effect runs only once per component lifecycle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Position model when needed
  useEffect(() => {
    if (!modelRef.current || !modelClone.current || !initialized.current) return;
    
    const newPositionKey = `${xPosition.toFixed(2)}_${zPosition.toFixed(2)}_${modelHeightOffset}`;
    const positionChanged = positionKey.current !== newPositionKey;
    
    // Only reposition if position changed or not positioned yet
    if (!positioned.current || positionChanged) {
      try {
        // Update position key
        positionKey.current = newPositionKey;
        
        // Set X and Z positions directly
        modelRef.current.position.x = xPosition;
        modelRef.current.position.z = zPosition;
        
        // Calculate proper Y position based on model dimensions
        const boundingBox = new THREE.Box3().setFromObject(modelClone.current);
        const modelBottom = boundingBox.min.y;
        const baselineOffset = -modelBottom;
        
        // Calculate final position - model bottom at water level + desired offset
        const finalYPosition = STATIC.WATER_LEVEL + baselineOffset + modelHeightOffset;
        modelRef.current.position.y = finalYPosition;
        
        // Store initial Y for bobbing
        initialY.current = finalYPosition;
        
        // Log once for debugging
        if (!debugLogged.current) {
          console.log(`Model ${path} positioned at (${xPosition}, ${finalYPosition}, ${zPosition})`);
          console.log(`- Model bottom: ${modelBottom.toFixed(2)}, offset: ${baselineOffset.toFixed(2)}`);
          debugLogged.current = true;
        }
        
        // Mark as positioned
        positioned.current = true;
      } catch (err) {
        console.error(`Failed to position model ${path}:`, err);
      }
    }
    
    // Dependencies include position params but NOT the model itself (to avoid re-renders)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xPosition, zPosition, modelHeightOffset]);
  
  // Calculate final scale
  const finalScale = scale * (modelAdjustment || 1.0);
  
  // Skip bobbing for now - uncomment if needed later
  /*
  useFrame((_, delta) => {
    if (!modelRef.current || !bob) return;
    
    time.current += delta * bobSpeed;
    const bobOffset = Math.sin(time.current) * bobHeight;
    modelRef.current.position.y = initialY.current + bobOffset;
  });
  */
  
  return (
    <group
      rotation={rotation as unknown as THREE.Euler}
      ref={modelRef}
    >
      {fallbackVisible && (
        <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#AAAAAA" />
        </mesh>
      )}
      
      {initialized.current && modelClone.current && (
        <primitive 
          object={modelClone.current}
          scale={[finalScale, finalScale, finalScale]} 
          castShadow={castShadow}
          receiveShadow={receiveShadow}
        />
      )}
    </group>
  );
};

export default CustomModel;