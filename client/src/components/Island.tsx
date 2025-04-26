import { useRef, useState, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC } from "../lib/constants";
import { ModelService } from "../lib/services/ModelService";

// Define island types
type IslandType = 'tropical' | 'mountain' | 'rocks';

interface IslandProps {
  xPosition: number;
  zPosition: number;
  scale?: number;
  rotation?: [number, number, number];
  type?: IslandType;
}

// Models are preloaded in ModelService

const Island = ({ 
  xPosition, 
  zPosition,
  scale = 1, 
  rotation = [0, 0, 0],
  type = 'tropical' 
}: IslandProps) => {
  const islandRef = useRef<THREE.Group>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Get the proper model path based on island type using ModelService
  const modelPath = ModelService.getEnvironmentModelPath(type);
  
  // Load the specified model with error handling
  let model: THREE.Group | null = null;
  try {
    const gltf = useGLTF(modelPath) as GLTF & {
      scene: THREE.Group
    };
    model = gltf.scene;
    console.log(`Successfully loaded model from ${modelPath}`);
  } catch (error) {
    console.error(`Error loading model from ${modelPath}:`, error);
    model = null;
  }
  
  // Detect when model is loaded
  useEffect(() => {
    if (model) {
      console.log(`Island model loaded: ${type}`, model);
      setModelLoaded(true);
    } else {
      console.error(`Failed to load island model for type: ${type}`);
    }
  }, [model, type]);
  
  // Deep clone the model to prevent issues
  let islandModel: THREE.Group | null = null;
  if (modelLoaded && model) {
    try {
      islandModel = model.clone();
    } catch (error) {
      console.error(`Error cloning model for ${type}:`, error);
    }
  }
  
  // Generate random Y rotation if none specified
  useEffect(() => {
    if (islandRef.current && rotation[1] === 0) {
      // Add some randomness to the rotation for natural variety
      const randomRotation = Math.random() * Math.PI * 2;
      islandRef.current.rotation.y = randomRotation;
    }
  }, [rotation]);
  
  // Create a unique instance ID for logging
  const instanceId = useRef(`island_${Math.random().toString(36).substr(2, 9)}`);
  
  // Create a stable model ID for tracking
  const modelId = `${type}_${xPosition.toFixed(2)}_${zPosition.toFixed(2)}`;
  
  // Improved positioning logic that aligns with Environment component
  useEffect(() => {
    if (!islandRef.current || !islandModel) return;
    
    const id = instanceId.current;
    console.log(`[ISLAND][${id}] Positioning island ${modelId}`);
    
    // Create a separate group for vertical adjustment to match Environment component approach
    try {
      // Calculate the position - for consistent positioning across components
      const boundingBox = new THREE.Box3().setFromObject(islandModel);
      const modelBottom = boundingBox.min.y;
      const baselineOffset = -modelBottom;
        
      console.log(`[ISLAND][${id}] Island model data for ${modelId}:`, {
        modelBottom: modelBottom.toFixed(2),
        baselineOffset: baselineOffset.toFixed(2),
        waterLevel: STATIC.WATER_LEVEL
      });
      
      // Main group should be at the grid position (WATER_LEVEL)
      islandRef.current.position.set(xPosition, STATIC.WATER_LEVEL, zPosition);
      
      // Apply the vertical offset to the model within the group, just like Environment does
      if (islandModel) {
        islandModel.position.y = baselineOffset;
        console.log(`[ISLAND][${id}] Applied vertical adjustment of ${baselineOffset.toFixed(2)} to model ${modelId}`);
      }
      
      // Set rotation
      islandRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      
      // Log success
      console.log(`[ISLAND][${id}] Successfully positioned ${modelId} at (${xPosition}, ${STATIC.WATER_LEVEL}, ${zPosition}) with model offset ${baselineOffset.toFixed(2)}`);
      
      // No need to use the enforcement interval - this matches Environment component behavior
    } catch (error) {
      console.error(`[ISLAND][${id}] Error positioning ${modelId}:`, error);
      // Fallback
      islandRef.current.position.set(xPosition, STATIC.WATER_LEVEL, zPosition);
    }
    
    return () => {
      console.log(`[ISLAND][${id}] Cleanup for ${modelId}`);
    };
  }, [modelId, xPosition, zPosition, rotation, islandModel]);
  
  // Calculate scale based on island type using our standardized scale system
  const getScaleFactor = () => {
    let baseScale: number;
    let modelAdjustment: number;
    
    switch (type) {
      case 'tropical':
        baseScale = SCALE.ISLAND.TROPICAL.BASE;
        modelAdjustment = MODEL_ADJUSTMENT.TROPICAL;
        break;
      case 'mountain':
        baseScale = SCALE.ISLAND.MOUNTAIN.BASE;
        modelAdjustment = MODEL_ADJUSTMENT.MOUNTAIN;
        break;
      case 'rocks':
        baseScale = SCALE.ISLAND.ROCKS.BASE;
        modelAdjustment = MODEL_ADJUSTMENT.ROCKS;
        break;
      default:
        baseScale = SCALE.ISLAND.TROPICAL.BASE;
        modelAdjustment = MODEL_ADJUSTMENT.TROPICAL;
    }
    
    // Calculate final scale: user-provided scale * base type scale * model adjustment
    return scale * baseScale * modelAdjustment;
  };
  
  const finalScale = getScaleFactor();
  
  return (
    <group 
      ref={islandRef} 
      // We now use the same positioning approach as the Environment component,
      // where the main group is at water level (0) and the model has a Y offset
      // to properly position its bottom at the water
    >
      {modelLoaded && islandModel ? (
        // Render loaded 3D model with standardized scaling
        <group scale={[finalScale, finalScale, finalScale]}>
          <primitive 
            object={islandModel} 
            castShadow 
            receiveShadow 
          />
        </group>
      ) : (
        // Fallback while loading - sized according to island type
        <mesh castShadow receiveShadow>
          <cylinderGeometry 
            args={[
              type === 'mountain' ? 10 : type === 'tropical' ? 8 : 5, 
              type === 'mountain' ? 12 : type === 'tropical' ? 10 : 6, 
              type === 'mountain' ? 6 : type === 'tropical' ? 4 : 2, 
              16
            ]} 
          />
          <meshStandardMaterial 
            color={type === 'rocks' ? "#888888" : type === 'mountain' ? "#9a8569" : "#8d7447"} 
            roughness={0.9} 
          />
        </mesh>
      )}
    </group>
  );
};

export default Island;
