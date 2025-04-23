import { useRef, useState, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";
import { SCALE, MODEL_ADJUSTMENT, POSITION, STATIC } from "../lib/constants";

// Define island types
type IslandType = 'tropical' | 'mountain' | 'rocks';

interface IslandProps {
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  type?: IslandType;
}

// Preload all island models with correct paths
useGLTF.preload('/models/tropical_island.glb');
useGLTF.preload('/models/mountain_island.glb');
useGLTF.preload('/models/rock_formation.glb');

const Island = ({ 
  position, 
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
  
  // Set the appropriate height for each island type based on our standard positions
  useEffect(() => {
    if (!islandRef.current) return;
    
    // Set base position with the appropriate height for this island type
    let heightOffset: number;
    switch (type) {
      case 'tropical':
        heightOffset = POSITION.ISLAND.TROPICAL;
        break;
      case 'mountain':
        heightOffset = POSITION.ISLAND.MOUNTAIN;
        break;
      case 'rocks':
        heightOffset = POSITION.ISLAND.ROCKS;
        break;
      default:
        heightOffset = POSITION.ISLAND.TROPICAL;
    }
    
    // Set initial position with correct height relative to static water level
    islandRef.current.position.set(position[0], STATIC.WATER_LEVEL + heightOffset, position[2]);
    
    // Log the positioning for debugging
    console.log(`Island of type ${type} positioned at: Water level ${STATIC.WATER_LEVEL} + offset ${heightOffset}`);
    
    // Apply subtle bobbing animation
    const animate = () => {
      if (islandRef.current) {
        // All island types bob slightly to add life to the scene
        const time = Date.now() * 0.0005; // Slow bobbing (0.5 speed)
        // Always animate relative to the static water level
        islandRef.current.position.y = STATIC.WATER_LEVEL + heightOffset + Math.sin(time) * 0.03; // Subtle 0.03 height
      }
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      // Cleanup 
    };
  }, [position, type]);
  
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
      position={position} 
      rotation={rotation}
    >
      {modelLoaded && islandModel ? (
        // Render loaded 3D model with standardized scaling
        <group scale={[finalScale, finalScale, finalScale]}>
          <primitive object={islandModel} castShadow receiveShadow />
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
