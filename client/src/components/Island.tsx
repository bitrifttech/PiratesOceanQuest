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
  
  // Keep track of position history for debugging
  const positionHistory = useRef<{x: number, y: number, z: number}[]>([]);
  
  // Store fixed Y position once calculated
  const fixedYPosition = useRef<number | null>(null);
  
  // Track if model is being updated
  const updateInProgress = useRef(false);
  
  // Track stack trace on each position update
  const positionStackTrace = useRef<string[]>([]);
  
  // Set up monitor to track external position changes
  useEffect(() => {
    if (!islandRef.current) return;
    
    const instanceId = instanceIdRef.current;
    console.log(`[ISLAND-MONITOR][${instanceId}] Starting position monitor`);
    
    // Current position for tracking
    let lastY = islandRef.current.position.y;
    
    // Setup position watcher
    const checkInterval = setInterval(() => {
      if (islandRef.current) {
        const currentY = islandRef.current.position.y;
        if (Math.abs(currentY - lastY) > 0.01) {
          console.error(`[ISLAND-MONITOR][${instanceId}] ⚠️ EXTERNAL Y POSITION CHANGE DETECTED: ${lastY.toFixed(2)} -> ${currentY.toFixed(2)}`);
          
          // Print stack trace from previous position sets
          console.error(`[ISLAND-MONITOR][${instanceId}] Position was previously set from these locations:`);
          positionStackTrace.current.forEach((trace, i) => {
            console.error(`[ISLAND-MONITOR][${instanceId}] Position set #${i+1}:\n${trace}`);
          });
          
          // Store new position
          lastY = currentY;
        }
      }
    }, 100);
    
    return () => {
      clearInterval(checkInterval);
      console.log(`[ISLAND-MONITOR][${instanceId}] Position monitor stopped`);
    };
  }, []);
  
  // Enhanced effect for position setting
  useEffect(() => {
    if (!islandRef.current || !islandModel) return;
    
    const instanceId = instanceIdRef.current;
    const stack = new Error().stack || "No stack trace available";
    console.log(`[ISLAND-POSITION][${instanceId}] Position effect running from: ${stack.split('\n')[2]}`);
    
    // Store this stack trace
    positionStackTrace.current.push(stack);
    if (positionStackTrace.current.length > 5) {
      positionStackTrace.current.shift();
    }
    
    // Only calculate position if we haven't done it before
    if (fixedYPosition.current === null) {
      // Lock to prevent concurrent updates
      if (updateInProgress.current) {
        console.log(`[ISLAND-POSITION][${instanceId}] Skipping update - another update in progress`);
        return;
      }
      
      updateInProgress.current = true;
      console.log(`[ISLAND-POSITION][${instanceId}] ⚠️ INITIAL Y CALCULATION`);
      
      try {
        // Calculate the bounding box to find the bottom of the model
        const boundingBox = new THREE.Box3().setFromObject(islandModel);
        console.log(`[ISLAND-POSITION][${instanceId}] Bounding box calculated:`, {
          min: boundingBox.min,
          max: boundingBox.max
        });
        
        const modelBottom = boundingBox.min.y;
        
        // Calculate the offset needed to place the bottom exactly at grid level
        const baselineOffset = -modelBottom;
        
        // Calculate the fixed Y position once
        const newY = STATIC.WATER_LEVEL + baselineOffset;
        
        console.log(`[ISLAND-POSITION][${instanceId}] ⚠️ SETTING NEW Y=${newY.toFixed(2)} (Prev: ${fixedYPosition.current?.toFixed(2) || 'NULL'})`);
        fixedYPosition.current = newY;
        
        // Apply the fixed position
        const oldPosition = islandRef.current.position.clone();
        islandRef.current.position.set(xPosition, newY, zPosition);
        
        console.log(`[ISLAND-POSITION][${instanceId}] Position changed from (${oldPosition.x.toFixed(2)}, ${oldPosition.y.toFixed(2)}, ${oldPosition.z.toFixed(2)}) to (${xPosition.toFixed(2)}, ${newY.toFixed(2)}, ${zPosition.toFixed(2)})`);
      } catch (error) {
        console.error(`[ISLAND-POSITION][${instanceId}] Error calculating position:`, error);
      } finally {
        // Mark as positioned and release lock
        positionedRef.current = true;
        updateInProgress.current = false;
      }
    } else {
      // If position has already been calculated, just update X and Z coordinates
      const oldPosition = islandRef.current.position.clone();
      
      console.log(`[ISLAND-POSITION][${instanceId}] Using stored Y=${fixedYPosition.current.toFixed(2)}`);
      
      islandRef.current.position.set(
        xPosition, 
        fixedYPosition.current, 
        zPosition
      );
      
      console.log(`[ISLAND-POSITION][${instanceId}] Updated X/Z from (${oldPosition.x.toFixed(2)}, ${oldPosition.y.toFixed(2)}, ${oldPosition.z.toFixed(2)}) to (${xPosition.toFixed(2)}, ${fixedYPosition.current.toFixed(2)}, ${zPosition.toFixed(2)})`);
    }
    
    // Override direct manipulations by freezing the Y position
    const lockInterval = setInterval(() => {
      if (islandRef.current && fixedYPosition.current !== null) {
        const currentY = islandRef.current.position.y;
        if (Math.abs(currentY - fixedYPosition.current) > 0.01) {
          console.error(`[ISLAND-POSITION][${instanceId}] ⚠️ FORCING Y POSITION BACK TO ${fixedYPosition.current.toFixed(2)} from ${currentY.toFixed(2)}`);
          islandRef.current.position.y = fixedYPosition.current;
        }
      }
    }, 200);
    
    return () => {
      // Reset the position calculations when component unmounts
      positionedRef.current = false;
      fixedYPosition.current = null;
      clearInterval(lockInterval);
      console.log(`[ISLAND-POSITION][${instanceId}] Island effect cleanup`);
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
