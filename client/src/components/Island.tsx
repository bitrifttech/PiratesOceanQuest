import { useRef, useState, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GLTF } from "three-stdlib";

// Define island types
type IslandType = 'tropical' | 'mountain' | 'rocks';

interface IslandProps {
  position: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  type?: IslandType;
}

// Preload all island models with correct paths
useGLTF.preload('./models/tropical_island.glb');
useGLTF.preload('./models/mountain_island.glb');
useGLTF.preload('./models/rock_formation.glb');

const Island = ({ 
  position, 
  scale = 1, 
  rotation = [0, 0, 0],
  type = 'tropical' 
}: IslandProps) => {
  const islandRef = useRef<THREE.Group>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Get the proper model path based on island type - NOTE: Use ./models instead of /models
  const modelPath = type === 'tropical' 
    ? './models/tropical_island.glb' 
    : type === 'mountain' 
      ? './models/mountain_island.glb' 
      : './models/rock_formation.glb';
  
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
  
  // Apply bobbing animation to simulate floating on water
  // This is subtle to avoid looking unrealistic
  useEffect(() => {
    if (!islandRef.current) return;
    
    const animate = () => {
      if (islandRef.current) {
        // Apply very subtle bobbing - almost imperceptible but adds life
        // Only for rocks - islands wouldn't visibly bob
        if (type === 'rocks') {
          const time = Date.now() * 0.0005;
          islandRef.current.position.y = position[1] + Math.sin(time) * 0.1;
        }
      }
      requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      // Cleanup 
    };
  }, [position, type]);
  
  return (
    <group 
      ref={islandRef} 
      position={position} 
      rotation={rotation}
    >
      {modelLoaded && islandModel ? (
        // Render loaded 3D model with proper scaling
        // Increase scale dramatically to make them more visible
        // Scale differently based on type - larger mountains, medium tropical islands, smaller rocks
        <group scale={[
          scale * (type === 'mountain' ? 25 : type === 'tropical' ? 20 : 15), 
          scale * (type === 'mountain' ? 25 : type === 'tropical' ? 20 : 15), 
          scale * (type === 'mountain' ? 25 : type === 'tropical' ? 20 : 15)
        ]}>
          <primitive object={islandModel} castShadow receiveShadow />
        </group>
      ) : (
        // Fallback while loading
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[8, 10, 4, 16]} />
          <meshStandardMaterial color={type === 'rocks' ? "#888888" : "#8d7447"} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
};

export default Island;
