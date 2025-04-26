import { useRef, useState, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC } from "../lib/constants";
import { useIslandPositions, getModelPositionId } from "../lib/stores/useIslandPositions";
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
  
  // Get the global island position store
  const getIslandPosition = useIslandPositions((state) => state.getPosition);
  const setIslandPosition = useIslandPositions((state) => state.setPosition);
  const hasIslandPosition = useIslandPositions((state) => state.hasPosition);
  
  // Create a stable model ID that doesn't change when component remounts
  // This is crucial for fixing the flickering issue
  const modelId = getModelPositionId(type, xPosition, zPosition);
  
  // Create a debugging instance ID
  const instanceId = useRef(`island_${Math.random().toString(36).substr(2, 9)}`);
  
  // Simple positioning logic that uses the persistent store
  useEffect(() => {
    if (!islandRef.current || !islandModel) return;
    
    const id = instanceId.current;
    console.log(`[ISLAND][${id}] Positioning island ${modelId}`);
    
    // Check if we already have a stored position
    if (hasIslandPosition(modelId)) {
      // Use the stored position
      const storedY = getIslandPosition(modelId);
      console.log(`[ISLAND][${id}] Using stored position Y=${storedY} for ${modelId}`);
      
      // Apply position directly
      islandRef.current.position.set(xPosition, storedY!, zPosition);
    } else {
      console.log(`[ISLAND][${id}] Calculating new position for ${modelId}`);
      
      try {
        // First time - calculate the position
        const boundingBox = new THREE.Box3().setFromObject(islandModel);
        const modelBottom = boundingBox.min.y;
        const baselineOffset = -modelBottom;
        const yPosition = STATIC.WATER_LEVEL + baselineOffset;
        
        console.log(`[ISLAND][${id}] Calculated position Y=${yPosition.toFixed(2)} for ${modelId}`, {
          modelBottom: modelBottom.toFixed(2),
          baselineOffset: baselineOffset.toFixed(2),
          waterLevel: STATIC.WATER_LEVEL
        });
        
        // Store the position in the global store
        setIslandPosition(modelId, yPosition);
        
        // Apply the position
        islandRef.current.position.set(xPosition, yPosition, zPosition);
      } catch (error) {
        console.error(`[ISLAND][${id}] Error calculating position:`, error);
        // Fallback to grid level
        islandRef.current.position.set(xPosition, STATIC.WATER_LEVEL, zPosition);
      }
    }
    
    // Set up a position enforcement timer to make sure nothing changes the Y
    const enforcementInterval = setInterval(() => {
      if (!islandRef.current) return;
      
      const storedY = getIslandPosition(modelId);
      if (storedY !== null) {
        // Check if position has been modified
        const currentY = islandRef.current.position.y;
        if (Math.abs(currentY - storedY) > 0.01) {
          console.log(`[ISLAND][${id}] ⚠️ Enforcing Y position ${storedY.toFixed(2)} (was ${currentY.toFixed(2)})`);
          islandRef.current.position.y = storedY;
        }
      }
    }, 100);
    
    return () => {
      clearInterval(enforcementInterval);
      console.log(`[ISLAND][${id}] Cleanup for ${modelId}`);
    };
  }, [modelId, xPosition, zPosition, islandModel, getIslandPosition, hasIslandPosition, setIslandPosition]);
  
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
      // Don't set position prop, we'll handle it completely in the useEffect
      // to avoid double-positioning and flickering
      rotation={rotation}
    >
      {modelLoaded && islandModel ? (
        // Render loaded 3D model with standardized scaling
        <group scale={[finalScale, finalScale, finalScale]}>
          <primitive 
            object={islandModel} 
            castShadow 
            receiveShadow 
            // Remove the onUpdate handler to prevent bounding box calculations during rendering
            // This was a likely cause of flickering
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
