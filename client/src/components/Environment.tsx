import { useRef, useState, useEffect, memo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT, STATIC } from "../lib/constants";
import { environmentCollisions } from "../lib/collision";
import CollisionBoundaryVisualizer from "./CollisionBoundaryVisualizer";
import { MeshCollisionRegistry } from "../lib/services/MeshCollisionRegistry";
import { BVHCollisionService } from "../lib/services/BVHCollisionService";
// Import BVH setup to extend Three.js prototypes
import "../lib/bvh-setup";

// Preload all models once at module level
useGLTF.preload('/models/tropical_island.glb');
useGLTF.preload('/models/mountain_island.glb');
useGLTF.preload('/models/rock_formation.glb');
useGLTF.preload('/models/shipwreck.glb');
useGLTF.preload('/models/port.glb');
useGLTF.preload('/models/lighthouse.glb');
// Preload new island type models
useGLTF.preload('/models/volcanic_island.glb');
useGLTF.preload('/models/atoll_island.glb');
useGLTF.preload('/models/ice_island.glb');

// Define feature types
export type EnvironmentFeatureType = 
  | 'tropical' 
  | 'mountain' 
  | 'rocks' 
  | 'shipwreck' 
  | 'port' 
  | 'lighthouse'
  | 'volcanic'  // New type: volcanic island 
  | 'atoll'     // New type: coral atoll island
  | 'ice';      // New type: ice island

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
      // New island types
      case 'volcanic': return '/models/volcanic_island.glb';
      case 'atoll': return '/models/atoll_island.glb';
      case 'ice': return '/models/ice_island.glb';
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
    }
  }, [originalModel, id, modelPath]);
  
  // Cleanup: unregister mesh from collision registry when component unmounts
  useEffect(() => {
    return () => {
      MeshCollisionRegistry.unregisterMesh(id);
    };
  }, [id]);
  
  // Calculate base scale based on type
  const getBaseScale = () => {
    switch (type) {
      case 'tropical': return SCALE.ISLAND.TROPICAL.BASE;
      case 'mountain': return SCALE.ISLAND.MOUNTAIN.BASE;
      case 'rocks': return SCALE.ISLAND.ROCKS.BASE;
      case 'shipwreck': return SCALE.ISLAND.SHIPWRECK.BASE;
      case 'port': return SCALE.ISLAND.PORT.BASE;
      case 'lighthouse': return SCALE.ISLAND.LIGHTHOUSE.BASE;
      // New island types
      case 'volcanic': return SCALE.ISLAND.VOLCANIC.BASE;
      case 'atoll': return SCALE.ISLAND.ATOLL.BASE;
      case 'ice': return SCALE.ISLAND.ICE.BASE;
      default: return 1;
    }
  };
  
  // Calculate model adjustment based on type
  const getModelAdjustment = () => {
    switch (type) {
      case 'tropical': return MODEL_ADJUSTMENT.TROPICAL;
      case 'mountain': return MODEL_ADJUSTMENT.MOUNTAIN;
      case 'rocks': return MODEL_ADJUSTMENT.ROCKS;
      case 'shipwreck': return MODEL_ADJUSTMENT.SHIPWRECK;
      case 'port': return MODEL_ADJUSTMENT.PORT;
      case 'lighthouse': return MODEL_ADJUSTMENT.LIGHTHOUSE;
      // New island types
      case 'volcanic': return MODEL_ADJUSTMENT.VOLCANIC;
      case 'atoll': return MODEL_ADJUSTMENT.ATOLL;
      case 'ice': return MODEL_ADJUSTMENT.ICE;
      default: return 1;
    }
  };
  
  // Final scaling factor
  const finalScale = scale * getBaseScale() * getModelAdjustment();
  
  // Track if BVH has been registered
  const bvhRegistered = useRef(false);
  // Reference to the scaled group for proper BVH registration
  const scaledGroupRef = useRef<THREE.Group>(null);
  
  // Get underwater offset based on island type (how much should be submerged)
  const getUnderwaterOffset = () => {
    switch (type) {
      case 'tropical': return -2.0;   // Tropical islands: lower portions underwater
      case 'mountain': return -3.0;   // Mountain islands: base partially submerged
      case 'rocks': return -1.5;      // Rock formations: slight submersion
      case 'shipwreck': return -1.0;  // Shipwrecks: mostly above water but base submerged
      case 'port': return -0.5;       // Ports: just slightly in water
      case 'lighthouse': return -1.5; // Lighthouses: base in water
      case 'volcanic': return -3.5;   // Volcanic: deep base underwater with peaks showing
      case 'atoll': return -1.0;      // Atolls: shallow submersion, beach level
      case 'ice': return -2.5;        // Ice islands: significant portion underwater like icebergs
      default: return -1.5;
    }
  };
  
  // Position the model ONCE only when first loaded
  useEffect(() => {
    // Skip if already positioned or not loaded
    if (positioned || !featureRef.current || !model.current || !loaded) return;
    
    try {
      // Calculate bounding box to determine bottom of model
      const boundingBox = new THREE.Box3().setFromObject(model.current);
      const modelBottom = boundingBox.min.y;
      
      // Calculate the offset needed to place bottom at water level
      const baselineOffset = -modelBottom;
      
      // Get underwater offset for this island type
      const underwaterOffset = getUnderwaterOffset();
      
      // Calculate final Y position - water level is at 0, push islands down to submerge portions
      const yPosition = STATIC.WATER_LEVEL + underwaterOffset;
      
      // Set the position once
      featureRef.current.position.set(x, yPosition, z);
      
      // Apply the vertical adjustment to the model itself
      if (model.current) {
        model.current.position.y = baselineOffset;
      }
      
      // Set rotation
      featureRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
      
      // Mark as positioned - BVH will be registered in useFrame after transforms are applied
      setPositioned(true);
    } catch (error) {
      // Fallback positioning at grid level with underwater offset
      if (featureRef.current) {
        featureRef.current.position.set(x, getUnderwaterOffset(), z);
        setPositioned(true);
      }
    }
  }, [id, type, x, z, rotation, loaded, positioned]);
  
  // Register BVH after the mesh is in the scene with proper transforms
  // This needs to happen after render when the scaled group has been created
  useFrame(() => {
    // Only register once, after positioned and not yet registered
    if (!positioned || bvhRegistered.current || !model.current || !scaledGroupRef.current) return;
    
    // Ensure the scene graph is updated
    scaledGroupRef.current.updateMatrixWorld(true);
    
    // Find the first mesh in the loaded model to use for collision
    const meshes: THREE.Mesh[] = [];
    model.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    
    const primaryMesh = meshes[0];
    if (primaryMesh && featureRef.current) {
      // Update the mesh's world matrix to include scale from parent groups
      primaryMesh.updateMatrixWorld(true);
      
      // Compute BVH for the mesh geometry
      BVHCollisionService.computeBVH(primaryMesh.geometry);
      
      // Register the mesh with the collision registry
      // The mesh now has the correct world matrix including scale
      MeshCollisionRegistry.registerMesh(
        id,
        type,
        primaryMesh,
        featureRef.current
      );
      
      // Update BVH status in registry
      MeshCollisionRegistry.updateBVHStatus(id, BVHCollisionService.hasBVH(primaryMesh.geometry));
      
      // Mark as registered
      bvhRegistered.current = true;
    }
  });
  
  // Return the model within a group
  return (
    <group ref={featureRef}>
      {loaded && model.current && (
        <group ref={scaledGroupRef} scale={[finalScale, finalScale, finalScale]}>
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
  // State for showing collision boundaries (debug tool) - default to false
  const [showCollisionBoundaries, setShowCollisionBoundaries] = useState(false);
  
  // Set up keyboard listener for toggling collision visualization 
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle collision boundaries with "B" key (for development purposes only)
      if (event.key === 'b' || event.key === 'B') {
        setShowCollisionBoundaries(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCollisionBoundaries]);
  
  // Register features with collision system on mount
  useEffect(() => {
    // Register features with the collision system
    environmentCollisions.setFeatures(features);
  }, [features.length, features]);
  
  // Render nothing if no features
  if (!features || features.length === 0) {
    return null;
  }
  
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