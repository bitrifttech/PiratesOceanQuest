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
  modelHeightOffset?: number;
  enableBob?: boolean;
}

/**
 * A test scene for previewing and testing 3D models
 */
export const ModelTestScene = ({
  modelPath = "/models/base_pirate_ship.glb",
  modelScale = 1.0,
  modelAdjustment,
  modelHeightOffset = 2.0, // Default height offset to position models at water level
  enableBob = true
}: ModelTestSceneProps) => {
  // References
  const sceneRef = useRef<THREE.Group>(null);
  
  // Model loading state
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // Configurable parameters
  const [scale, setScale] = useState<number>(modelScale);
  const [heightOffset, setHeightOffset] = useState<number>(modelHeightOffset);
  const [adjustmentFactor, setAdjustmentFactor] = useState<number>(modelAdjustment || 1.0);
  const [bobEnabled, setBobEnabled] = useState<boolean>(enableBob);
  const [bobHeight, setBobHeight] = useState<number>(0.15);
  const [bobSpeed, setBobSpeed] = useState<number>(0.5);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // Copy to clipboard function
  const copyConfigToClipboard = () => {
    // Format the configuration as JSON
    const config = {
      path: modelPath,
      scale,
      modelAdjustment: adjustmentFactor,
      modelHeightOffset: heightOffset,
      bob: bobEnabled,
      bobHeight,
      bobSpeed
    };
    
    // Convert to formatted JSON string
    const configString = JSON.stringify(config, null, 2);
    
    // Create a code snippet for CustomModel component
    const componentString = `<CustomModel
  path="${modelPath}"
  scale={${scale}}
  modelAdjustment={${adjustmentFactor}}
  modelHeightOffset={${heightOffset}}
  bob={${bobEnabled}}
  bobHeight={${bobHeight}}
  bobSpeed={${bobSpeed}}
  castShadow
  receiveShadow
/>`;
    
    // Copy the component string to clipboard
    navigator.clipboard.writeText(componentString)
      .then(() => {
        alert("Configuration copied to clipboard as CustomModel component!");
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        alert("Failed to copy configuration");
      });
  };
  
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
            scale={scale}
            modelAdjustment={adjustmentFactor}
            modelHeightOffset={heightOffset}
            bob={bobEnabled}
            bobHeight={bobHeight}
            bobSpeed={bobSpeed}
            castShadow
            receiveShadow
            onLoad={handleModelLoad}
          />
          
          {/* Reference cubes for scale */}
          {showGrid && (
            <>
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
              
              {/* Add grid helper */}
              <gridHelper args={[20, 20, "#ffffff", "#555555"]} />
            </>
          )}
        </group>
        
        {/* Camera controls */}
        <OrbitControls 
          target={[0, 0, 0]} 
          enableDamping={true} 
          dampingFactor={0.05}
        />
      </Canvas>
      
      {/* Model Info Panel */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg shadow-lg max-w-md">
        <h3 className="text-xl font-bold mb-2">Model Information</h3>
        <div className="mb-2">
          <div className="font-semibold">Model:</div> 
          <div className="text-green-400">{modelPath.split('/').pop()}</div>
        </div>
        <div className="mb-2">
          <div className="font-semibold">Status:</div> 
          <div className={modelLoaded ? "text-green-400" : "text-yellow-400"}>
            {modelLoaded ? "✅ Loaded" : "⏳ Loading..."}
          </div>
        </div>
        <hr className="my-3 border-gray-600" />
        <div className="mb-2 font-semibold">Reference Scale:</div>
        <div className="text-xs mb-3 text-gray-300">
          Red, green, blue and yellow cubes are 1×1×1 meter reference blocks
        </div>
        <div className="flex items-center mb-2">
          <input 
            type="checkbox" 
            id="showGrid" 
            checked={showGrid} 
            onChange={(e) => setShowGrid(e.target.checked)} 
            className="mr-2"
          />
          <label htmlFor="showGrid">Show grid and reference blocks</label>
        </div>
      </div>
      
      {/* Controls Panel */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white p-4 rounded-lg shadow-lg max-w-md">
        <h3 className="text-xl font-bold mb-2">Model Configuration</h3>
        
        {/* Scale Control */}
        <div className="mb-4">
          <label htmlFor="scaleSlider" className="block mb-1">
            Base Scale: {scale.toFixed(2)}
          </label>
          <input 
            id="scaleSlider"
            type="range" 
            min="0.1" 
            max="10" 
            step="0.1"
            value={scale} 
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0.1</span>
            <span>10</span>
          </div>
        </div>
        
        {/* Model Adjustment Factor */}
        <div className="mb-4">
          <label htmlFor="adjustmentSlider" className="block mb-1">
            Model Adjustment Factor: {adjustmentFactor.toFixed(2)}
          </label>
          <input 
            id="adjustmentSlider"
            type="range" 
            min="0.01" 
            max="5" 
            step="0.01"
            value={adjustmentFactor} 
            onChange={(e) => setAdjustmentFactor(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0.01</span>
            <span>5.0</span>
          </div>
        </div>
        
        {/* Height Offset Control */}
        <div className="mb-4">
          <label htmlFor="heightSlider" className="block mb-1">
            Height Offset: {heightOffset.toFixed(2)}
          </label>
          <input 
            id="heightSlider"
            type="range" 
            min="-5" 
            max="5" 
            step="0.1"
            value={heightOffset} 
            onChange={(e) => setHeightOffset(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>-5</span>
            <span>5</span>
          </div>
        </div>
        
        {/* Bob Effect Controls */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <input 
              type="checkbox" 
              id="bobEnabled" 
              checked={bobEnabled} 
              onChange={(e) => setBobEnabled(e.target.checked)} 
              className="mr-2"
            />
            <label htmlFor="bobEnabled">Enable Bob Effect</label>
          </div>
          
          {bobEnabled && (
            <>
              {/* Bob Height */}
              <div className="mb-3 pl-6">
                <label htmlFor="bobHeightSlider" className="block mb-1 text-sm">
                  Bob Height: {bobHeight.toFixed(2)}
                </label>
                <input 
                  id="bobHeightSlider"
                  type="range" 
                  min="0.01" 
                  max="1" 
                  step="0.01"
                  value={bobHeight} 
                  onChange={(e) => setBobHeight(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Bob Speed */}
              <div className="pl-6">
                <label htmlFor="bobSpeedSlider" className="block mb-1 text-sm">
                  Bob Speed: {bobSpeed.toFixed(2)}
                </label>
                <input 
                  id="bobSpeedSlider"
                  type="range" 
                  min="0.1" 
                  max="2" 
                  step="0.1"
                  value={bobSpeed} 
                  onChange={(e) => setBobSpeed(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
        
        {/* Copy Configuration Button */}
        <button 
          onClick={copyConfigToClipboard}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Copy Configuration
        </button>
        
        {/* Final Scale Display */}
        <div className="mt-4 text-center text-sm bg-gray-800 rounded p-2">
          <div className="font-semibold">Effective Scale:</div>
          <div className="text-yellow-300 font-mono">
            {scale} × {adjustmentFactor} = {(scale * adjustmentFactor).toFixed(4)}
          </div>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <ModelTestNavigation />
    </div>
  );
};

export default ModelTestScene;