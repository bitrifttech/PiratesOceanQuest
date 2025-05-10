import { useRef, useState, useEffect, memo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT, STATIC } from "../lib/constants";
import { environmentCollisions } from "../lib/collision";
import CollisionBoundaryVisualizer from "./CollisionBoundaryVisualizer";

// Preload all models once at module level
useGLTF.preload('/models/tropical_island.glb');
useGLTF.preload('/models/mountain_island.glb');
useGLTF.preload('/models/rock_formation.glb');
useGLTF.preload('/models/shipwreck.glb');
useGLTF.preload('/models/port.glb');
useGLTF.preload('/models/lighthouse.glb');

// Define feature types
export type EnvironmentFeatureType = 'tropical' | 'mountain' | 'rocks' | 'shipwreck' | 'port' | 'lighthouse';

export interface EnvironmentFeature {
  id: string; // Unique ID
  type: EnvironmentFeatureType;
  x: number;
  z: number;
  scale: number;
  rotation: [number, number, number];
}

// Single environmental feature component that never rerenders once initialized
const EnvironmentalFeature = memo(({ feature }: { feature: EnvironmentFeature }) => {
  const { type, x, z, scale, rotation, id } = feature;
  const featureRef = useRef<THREE.Group>(null);
  const [loaded, setLoaded] = useState(false);
  const [positioned, setPositioned] = useState(false);
  
  // Get the proper model path based on feature type
  const getModelPath = () => {
    switch (type) {
      case 'tropical': return '/models/tropical_island.glb';
      case 'mountain': return '/models/mountain_island.glb';
      case 'rocks': return '/models/rock_formation.glb';
      case 'shipwreck': return '/models/shipwreck.glb';
      case 'port': return '/models/port.glb';
      case 'lighthouse': return '/models/lighthouse.glb';
      default: 
        console.warn(`[ENV] Unknown feature type: ${type}, defaulting to rocks`);
        return '/models/rock_formation.glb';
    }
  };
  
  const modelPath = getModelPath();
  
  // Load the model - this will use the preloaded version
  const { scene: originalModel } = useGLTF(modelPath) as GLTF & {
    scene: THREE.Group
  };
  
  // Clone model on first render only
  const model = useRef<THREE.Group | null>(null);
  useEffect(() => {
    if (!model.current && originalModel) {
      // Clone the model once
      model.current = originalModel.clone();
      setLoaded(true);
      console.log(`[ENV] Model ${id} loaded from ${modelPath}`);
    }
  }, [originalModel, id, modelPath]);
  
  // Calculate base scale based on type
  const getBaseScale = () => {
    switch (type) {
      case 'tropical': return SCALE.ISLAND.TROPICAL.BASE;
      case 'mountain': return SCALE.ISLAND.MOUNTAIN.BASE;
      case 'rocks': return SCALE.ISLAND.ROCKS.BASE;
      default: return 1;
    }
  };
  
  // Calculate model adjustment based on type
  const getModelAdjustment = () => {
    switch (type) {
      case 'tropical': return MODEL_ADJUSTMENT.TROPICAL;
      case 'mountain': return MODEL_ADJUSTMENT.MOUNTAIN;
      case 'rocks': return MODEL_ADJUSTMENT.ROCKS;
      default: return 1;
    }
  };
  
  // Final scaling factor
  const finalScale = scale * getBaseScale() * getModelAdjustment();
  
  // Position the model ONCE only when first loaded
  useEffect(() => {
    // Skip if already positioned or not loaded
    if (positioned || !featureRef.current || !model.current || !loaded) return;
    
    // Log this positioning event
    console.log(`[ENV] Positioning ${id} (${type}) at (${x}, ?, ${z})`);
    
    try {
      // Calculate bounding box to determine bottom of model
      const boundingBox = new THREE.Box3().setFromObject(model.current);
      const modelBottom = boundingBox.min.y;
      
      // Debug log
      console.log(`[ENV] Model ${id} bounding box: min=${JSON.stringify({x: boundingBox.min.x, y: boundingBox.min.y, z: boundingBox.min.z})}, max=${JSON.stringify({x: boundingBox.max.x, y: boundingBox.max.y, z: boundingBox.max.z})}`);
      console.log(`[ENV] Model bottom: ${modelBottom}`);
      
      // Calculate the offset needed to place bottom exactly at grid level (0)
      // For most models, we need to account for the actual dimensions to place on grid
      
      // Models might have different coordinate spaces, so we need a reliable way to
      // determine the true bottom for proper alignment with the grid
      
      // Get model height
      const modelHeight = boundingBox.max.y - boundingBox.min.y;
      console.log(`[ENV] Model ${id} height: ${modelHeight}`);
      
      // Calculate the offset needed to place bottom at grid level
      const baselineOffset = -modelBottom; // This moves the model up so its bottom is at y=0
      
      // Calculate final Y position - we want bottom of model at exactly grid level
      // STATIC.WATER_LEVEL is where our grid is positioned
      const yPosition = STATIC.WATER_LEVEL;
      
      // Set the position once, but use a group to handle the vertical offset
      featureRef.current.position.set(x, yPosition, z);
      
      // Create a nested group for vertical adjustment within the positioned group
      if (model.current) {
        // Apply the vertical adjustment to the model itself
        model.current.position.y = baselineOffset;
        console.log(`[ENV] Applied vertical adjustment of ${baselineOffset} to model ${id}`);
      }
      
      // Set rotation
      featureRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      
      // Log success with detailed positioning information
      console.log(`[ENV] Successfully positioned ${id} at (${x}, ${yPosition}, ${z}) with model offset ${baselineOffset}`);
      
      // Mark as positioned
      setPositioned(true);
    } catch (error) {
      console.error(`[ENV] Error positioning ${id}:`, error);
      
      // Fallback positioning at water level
      if (featureRef.current) {
        featureRef.current.position.set(x, STATIC.WATER_LEVEL, z);
        console.log(`[ENV] Fallback positioned ${id} at (${x}, ${STATIC.WATER_LEVEL}, ${z})`);
        setPositioned(true);
      }
    }
  }, [id, type, x, z, rotation, loaded, positioned]);
  
  // Return the model within a group
  return (
    <group ref={featureRef}>
      {loaded && model.current && (
        <group scale={[finalScale, finalScale, finalScale]}>
          <primitive 
            object={model.current} 
            castShadow 
            receiveShadow 
          />
        </group>
      )}
      {/* Debug axis helper removed */}
    </group>
  );
}, (prevProps, nextProps) => {
  // Only rerender if the ID changes (which should never happen)
  return prevProps.feature.id === nextProps.feature.id;
});

// Main Environment component - renders all features
const Environment = ({ features }: { features: EnvironmentFeature[] }) => {
  // State for showing collision boundaries (debug tool)
  const [showCollisionBoundaries, setShowCollisionBoundaries] = useState(true);
  
  // Set up keyboard listener for toggling collision visualization 
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle collision boundaries with "B" key
      if (event.key === 'b' || event.key === 'B') {
        setShowCollisionBoundaries(prev => !prev);
        console.log(`[COLLISION DEBUG] ${!showCollisionBoundaries ? 'Showing' : 'Hiding'} collision boundaries`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCollisionBoundaries]);
  
  // Log once on mount and register features with collision system
  useEffect(() => {
    console.log(`[ENV] Environment initialized with ${features.length} features`, features);
    
    // Register features with the collision system
    environmentCollisions.setFeatures(features);
    
    // Add crash protection and debug info
    if (!features || features.length === 0) {
      console.warn('[ENV] No features provided to Environment component!');
    } else {
      // Check validity of features
      features.forEach((feature, index) => {
        console.log(`[ENV] Feature ${index}: ${feature.id} type=${feature.type} at x=${feature.x}, z=${feature.z}`);
        
        // Check for invalid rotation values
        if (!feature.rotation || feature.rotation.length !== 3) {
          console.error(`[ENV] Invalid rotation for feature ${feature.id}:`, feature.rotation);
        }
      });
    }
  }, [features.length, features]);
  
  // Render nothing if no features
  if (!features || features.length === 0) {
    console.warn('[ENV-RENDER] No features to render!');
    return null;
  }
  
  console.log('[ENV-RENDER] Rendering environment features');
  console.log('[COLLISION DEBUG] Press B to toggle collision boundary visualization');
  
  return (
    <group name="environment">
      {/* Render all environmental features */}
      {features.map(feature => (
        <EnvironmentalFeature key={feature.id} feature={feature} />
      ))}
      
      {/* Render collision boundary visualizer */}
      <CollisionBoundaryVisualizer features={features} visible={showCollisionBoundaries} />
    </group>
  );
};

export default memo(Environment);