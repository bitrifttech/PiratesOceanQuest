import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import { useGameState } from "./lib/stores/useGameState";
import Game from "./components/Game";
import TitleScreen from "./components/TitleScreen";
import MainMenu from "./components/MainMenu";
import SettingsMenu from "./components/SettingsMenu";
import HelpMenu from "./components/HelpMenu";
import UpgradeMenu from "./components/UpgradeMenu";
import GameUI from "./components/GameUI";
import "@fontsource/inter";

// Define control keys for the game
export enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  fire = 'fire',
  board = 'board',
}

// Map controls to keys
const controlsMap = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.fire, keys: ["Space"] },
  { name: Controls.board, keys: ["KeyB"] },
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
    <div className="h-screen w-screen overflow-hidden relative">
      <KeyboardControls map={controlsMap}>
        {/* Title Screen */}
        {gameState === 'title' && <TitleScreen />}
        
        {/* Main Menu */}
        {gameState === 'menu' && <MainMenu />}
        
        {/* Settings Menu */}
        {gameState === 'settings' && <SettingsMenu />}
        
        {/* Help Menu */}
        {gameState === 'help' && <HelpMenu />}
        
        {/* Upgrade Menu */}
        {gameState === 'upgrade' && <UpgradeMenu />}
        
        {/* Game Canvas - Only render when playing */}
        {gameState === 'playing' && (
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
              <fog attach="fog" args={["#89CFF0", 50, 200]} />
              
              <Suspense fallback={null}>
                <Game />
              </Suspense>
            </Canvas>
            
            {/* Game UI overlay */}
            <GameUI />
          </>
        )}
      </KeyboardControls>
    </div>
  );
}

export default App;
