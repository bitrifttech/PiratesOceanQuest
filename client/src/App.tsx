import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import { useGameState } from "./lib/stores/useGameState";
import Game from "./components/Game";
import GameUI from "./components/GameUI";
import DebugControls from "./components/DebugControls";
import ModelTestScene from "./components/ModelTestScene";
import { MODEL_ADJUSTMENT } from "./lib/constants";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import "@fontsource/inter";

// Define control keys for the game
export enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  fire = 'fire',
  // board control removed
}

// Map controls to keys
const controlsMap = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.fire, keys: ["Space"] },
  // boarding key mapping removed
];

// Log the control map configuration
console.log("Control map configured:", controlsMap);

// Main App component
function App() {
  const gameState = useGameState((state) => state.gameState);
  const loadSounds = useAudio((state) => state.loadSounds);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load sounds
    loadSounds();
    
    // Initialize game (simulate loading)
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => {
      clearTimeout(loadingTimeout);
    };
  }, [loadSounds]);

  // Loading screen
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0A1C3B] text-white">
        <h1 className="text-4xl font-['Pirata_One'] mb-6 text-[#FFD700]">Pirates of the Three Seas</h1>
        <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-[#FFD700] animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
        <p className="mt-4 text-[#F5F5F5]">Loading the high seas...</p>
        <style>{`
          @keyframes loading {
            0% { width: 0%; }
            50% { width: 100%; }
            100% { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Model Test Route */}
        <Route path="/model-test" element={<ModelTestScene modelPath="/models/base_pirate_ship.glb" modelScale={1.0} modelAdjustment={1.6} modelHeightOffset={0.6} enableBob={true} bobHeight={0.03} />} />
        <Route path="/model-test/ship" element={<ModelTestScene modelPath="/models/base_pirate_ship.glb" modelScale={1.0} modelAdjustment={1.6} modelHeightOffset={0.6} enableBob={true} bobHeight={0.03} />} />
        <Route path="/model-test/advanced-ship" element={<ModelTestScene modelPath="/models/advanced_pirate_ship.glb" modelScale={1.0} modelAdjustment={MODEL_ADJUSTMENT.SHIP} modelHeightOffset={2.5} enableBob={true} bobHeight={0.03} bobSpeed={0.5} />} />
        <Route path="/model-test/tropical" element={<ModelTestScene modelPath="/models/tropical_island.glb" modelScale={3.0} modelAdjustment={4.8} modelHeightOffset={3.7} enableBob={true} bobHeight={0.03} bobSpeed={0.5} />} />
        <Route path="/model-test/mountain" element={<ModelTestScene modelPath="/models/mountain_island.glb" modelScale={5.0} modelAdjustment={MODEL_ADJUSTMENT.MOUNTAIN} modelHeightOffset={0} />} />
        <Route path="/model-test/rock" element={<ModelTestScene modelPath="/models/rock_formation.glb" modelScale={7.7} modelAdjustment={3.19} modelHeightOffset={5} enableBob={true} bobHeight={0.03} bobSpeed={0.5} />} />
        <Route path="/model-test/rocks" element={<ModelTestScene modelPath="/models/rock_formation.glb" modelScale={1.0} modelAdjustment={MODEL_ADJUSTMENT.ROCKS} modelHeightOffset={0} />} />
        
        {/* Main Game Route */}
        <Route path="*" element={
          <div className="h-screen w-screen overflow-hidden relative">
            <KeyboardControls map={controlsMap}>
              {/* Game Canvas - Always render as we skip the intro screens */}
              {(
                <>
                  <Canvas
                    shadows
                    camera={{
                      position: [0, 15, 30],
                      fov: 60,
                      near: 0.1,
                      far: 1000
                    }}
                    gl={{
                      antialias: true,
                      powerPreference: "default"
                    }}
                  >
                    <color attach="background" args={["#89CFF0"]} />
                    <fog attach="fog" args={["#89CFF0", 100, 400]} />
                    
                    <Suspense fallback={null}>
                      <Game />
                    </Suspense>
                  </Canvas>
                  
                  {/* Game UI overlay */}
                  <GameUI />
                  
                  {/* Add debug controls directly in App component for stability */}
                  <div id="debug-controls-container">
                    <DebugControls
                      onUpdateShipHeight={useGameState.getState().setShipHeight}
                      onUpdateWaterParams={useGameState.getState().setWaveParameters}
                      onUpdateShipScale={useGameState.getState().setShipScale}
                      initialShipHeight={useGameState.getState().shipHeight}
                      initialWaveHeight={useGameState.getState().waveHeight}
                      initialWaveSpeed={useGameState.getState().waveSpeed}
                      initialShipScale={useGameState.getState().shipScale}
                    />
                  </div>
                </>
              )}
            </KeyboardControls>
            
            {/* Model Test Navigation Button */}
            <div className="absolute right-4 bottom-4 bg-blue-800 text-white rounded-lg overflow-hidden">
              <a href="/model-test" className="block px-4 py-2 hover:bg-blue-700 transition-colors">
                Model Viewer
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
