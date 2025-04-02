import { useRef, useState, useEffect } from "react";
import { useFrame, Canvas, ThreeElements } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import CustomModel from "./CustomModel";
import ModelTestNavigation from "./ModelTestNavigation";
import { SCALE, MODEL_ADJUSTMENT, POSITION } from "../lib/constants";

interface ModelTestSceneProps {
  modelPath?: string;
  modelScale?: number;
  modelAdjustment?: number;
  enableBob?: boolean;
}

/**
 * A test scene for previewing and testing 3D models
 */
export const ModelTestScene = ({
  modelPath = "/models/base_pirate_ship.glb",
  modelScale = 1.0,
  modelAdjustment,
  enableBob = true
}: ModelTestSceneProps) => {
  // References
  const sceneRef = useRef<THREE.Group>(null);
  
  // Model loading state
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Handle model load
  const handleModelLoad = () => {
    console.log("Model loaded successfully");
    setModelLoaded(true);
  };
  
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Canvas
        shadows
        camera={{ position: [10, 10, 10], fov: 50 }}
        gl={{ antialias: true }}
      >
        {/* Environment */}
        <fog attach="fog" args={["#142b43", 30, 100]} />
        <color attach="background" args={["#142b43"]} />
        
        {/* Scene lights */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        
        {/* Star background */}
        <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />
        
        {/* Scene container */}
        <group ref={sceneRef}>
          {/* Ocean plane */}
          <mesh 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.1, 0]} 
            receiveShadow
          >
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial 
              color="#0077be" 
              metalness={0.1}
              roughness={0.2}
            />
          </mesh>
          
          {/* Custom model */}
          <CustomModel
            path={modelPath}
            position={[0, 0, 0]}
            scale={modelScale}
            modelAdjustment={modelAdjustment}
            bob={enableBob}
            bobHeight={0.15}
            bobSpeed={0.5}
            castShadow
            receiveShadow
            onLoad={handleModelLoad}
          />
          
          {/* Reference cubes for scale */}
          <mesh position={[5, 0.5, 0]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="red" />
          </mesh>
          
          <mesh position={[-5, 0.5, 0]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="green" />
          </mesh>
          
          <mesh position={[0, 0.5, 5]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="blue" />
          </mesh>
          
          <mesh position={[0, 0.5, -5]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="yellow" />
          </mesh>
        </group>
        
        {/* Camera controls */}
        <OrbitControls 
          target={[0, 0, 0]} 
          enableDamping={true} 
          dampingFactor={0.05}
        />
      </Canvas>
      
      {/* Info overlay */}
      <div style={{
        position: "absolute",
        top: 10,
        left: 10,
        padding: 10,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        color: "white",
        borderRadius: 5,
        fontFamily: "monospace"
      }}>
        <h3>Model Test Scene</h3>
        <p>Model: {modelPath.split('/').pop()}</p>
        <p>Scale: {modelScale} × {modelAdjustment || "N/A"}</p>
        <p>Status: {modelLoaded ? "✅ Loaded" : "⏳ Loading..."}</p>
        <p>Bob Effect: {enableBob ? "Enabled" : "Disabled"}</p>
        <p><small>Red, green, blue and yellow cubes are 1×1×1 meter reference blocks</small></p>
      </div>
      
      {/* Navigation Menu */}
      <ModelTestNavigation />
    </div>
  );
};

export default ModelTestScene;