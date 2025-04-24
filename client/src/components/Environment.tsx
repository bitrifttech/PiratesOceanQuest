import { useRef, useState, useEffect, memo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT, STATIC } from "../lib/constants";

// Preload all models once at module level
useGLTF.preload('/models/tropical_island.glb');
useGLTF.preload('/models/mountain_island.glb');
useGLTF.preload('/models/rock_formation.glb');

// Define feature types
export type EnvironmentFeatureType = 'tropical' | 'mountain' | 'rocks';

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
  const modelPath = type === 'tropical' 
    ? '/models/tropical_island.glb' 
    : type === 'mountain' 
      ? '/models/mountain_island.glb' 
      : '/models/rock_formation.glb';
  
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
      // Calculate bounding box to determine bottom
      const boundingBox = new THREE.Box3().setFromObject(model.current);
      const modelBottom = boundingBox.min.y;
      
      // Calculate the offset to place bottom at grid level
      const baselineOffset = -modelBottom;
      
      // Calculate final Y position
      const yPosition = STATIC.WATER_LEVEL + baselineOffset;
      
      // Set the position once
      featureRef.current.position.set(x, yPosition, z);
      
      // Set rotation
      featureRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      
      // Log success
      console.log(`[ENV] Successfully positioned ${id} at (${x}, ${yPosition}, ${z})`);
      
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
          <primitive object={model.current} castShadow receiveShadow />
        </group>
      )}
    </group>
  );
}, (prevProps, nextProps) => {
  // Only rerender if the ID changes (which should never happen)
  return prevProps.feature.id === nextProps.feature.id;
});

// Main Environment component - renders all features
const Environment = ({ features }: { features: EnvironmentFeature[] }) => {
  // Log once on mount
  useEffect(() => {
    console.log(`[ENV] Environment initialized with ${features.length} features`);
  }, [features.length]);
  
  return (
    <group name="environment">
      {features.map(feature => (
        <EnvironmentalFeature key={feature.id} feature={feature} />
      ))}
    </group>
  );
};

export default memo(Environment);