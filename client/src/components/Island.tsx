import { useRef, useState, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC } from "../lib/constants";

// Define island types
type IslandType = 'tropical' | 'mountain' | 'rocks';

interface IslandProps {
  xPosition: number;
  zPosition: number;
  scale?: number;
  rotation?: [number, number, number];
  type?: IslandType;
}

// Preload all island models with correct paths
useGLTF.preload('/models/tropical_island.glb');
useGLTF.preload('/models/mountain_island.glb');
useGLTF.preload('/models/rock_formation.glb');

const Island = ({ 
  xPosition, 
  zPosition,
  scale = 1, 
  rotation = [0, 0, 0],
  type = 'tropical' 
}: IslandProps) => {
  const islandRef = useRef<THREE.Group>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Get the proper model path based on island type - standardized to match other components
  const modelPath = type === 'tropical' 
    ? '/models/tropical_island.glb' 
    : type === 'mountain' 
      ? '/models/mountain_island.glb' 
      : '/models/rock_formation.glb';
  
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
  
  // Set the appropriate height for each island type based on flat grid
  // Using a ref to track whether we've already positioned this model
  const positionedRef = useRef(false);
  
  // Create a unique ID for debugging
  const instanceIdRef = useRef(`island_${Math.random().toString(36).substr(2, 9)}`);
  
  useEffect(() => {
    if (!islandRef.current) return;
    
    const instanceId = instanceIdRef.current;
    
    console.log(`[ISLAND-DEBUG][${instanceId}] Positioning effect triggered:`, {
      islandType: type,
      xPosition,
      zPosition,
      isModelLoaded: !!islandModel,
      alreadyPositioned: positionedRef.current
    });
    
    // Only do positioning once per model to prevent flickering
    if (positionedRef.current) {
      console.log(`[ISLAND-DEBUG][${instanceId}] SKIPPING positioning - already positioned`);
      return;
    }
    
    // For grid alignment, we need to calculate bottom of the model
    if (islandModel) {
      console.log(`[ISLAND-DEBUG][${instanceId}] POSITIONING new island for the first time`);
      positionedRef.current = true;
      
      // Calculate the bounding box to find the bottom of the model
      const boundingBox = new THREE.Box3().setFromObject(islandModel);
      const modelBottom = boundingBox.min.y;
      
      // Calculate the offset needed to place the bottom exactly at grid level
      const baselineOffset = -modelBottom;
      
      // Store the current position before changing
      const oldPosition = islandRef.current.position.clone();
      
      // Set initial position with bottom aligned precisely to grid level
      const newY = STATIC.WATER_LEVEL + baselineOffset;
      islandRef.current.position.set(
        xPosition, 
        newY, 
        zPosition
      );
      
      // Log the positioning for debugging
      console.log(`[ISLAND-DEBUG][${instanceId}] POSITIONED from (${oldPosition.x.toFixed(2)}, ${oldPosition.y.toFixed(2)}, ${oldPosition.z.toFixed(2)}) to (${xPosition.toFixed(2)}, ${newY.toFixed(2)}, ${zPosition.toFixed(2)}):`, {
        islandType: type,
        modelBottom: modelBottom.toFixed(2),
        baselineOffset: baselineOffset.toFixed(2),
        waterLevel: STATIC.WATER_LEVEL
      });
    } else {
      console.log(`[ISLAND-DEBUG][${instanceId}] POSITIONING using FALLBACK`);
      // For fallback shapes, just place them directly on the grid
      islandRef.current.position.set(xPosition, STATIC.WATER_LEVEL, zPosition);
      console.log(`[ISLAND-DEBUG][${instanceId}] Fallback positioned at (${xPosition}, ${STATIC.WATER_LEVEL}, ${zPosition})`);
    }
    
    return () => {
      // Reset the position flag when component unmounts
      positionedRef.current = false;
    };
  }, [xPosition, zPosition, type, islandModel]);
  
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
            onUpdate={(self: THREE.Object3D) => {
              if (islandRef.current) {
                // Analyze model to ensure bottom is at water level
                const boundingBox = new THREE.Box3().setFromObject(self);
                console.log(`Island ${type} model - Bottom Y: ${boundingBox.min.y.toFixed(2)}`);
              }
            }}
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
