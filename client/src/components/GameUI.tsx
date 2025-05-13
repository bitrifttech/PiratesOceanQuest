import { useState, useEffect, useRef } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../App";
import HUD from "./HUD";
import DebugControls from "./DebugControls";
import { usePlayer } from "../lib/stores/usePlayer";
// import { useEnemies } from "../lib/stores/useEnemies"; // Removed enemies import
import { useGameState } from "../lib/stores/useGameState";
import { useUpgrades } from "../lib/stores/useUpgrades";
import { useAudio } from "../lib/stores/useAudio";

const GameUI = () => {
  const [showControls, setShowControls] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  
  // Game state
  const gameState = useGameState((state) => state.gameState);
  const setGameState = useGameState((state) => state.setGameState);
  const shipHeight = useGameState((state) => state.shipHeight);
  const waveHeight = useGameState((state) => state.waveHeight);
  const waveSpeed = useGameState((state) => state.waveSpeed);
  const shipScale = useGameState((state) => state.shipScale); // Add ship scale
  const waterVisible = useGameState((state) => state.waterVisible);
  const oneShotKill = useGameState((state) => state.oneShotKill);
  
  const setShipHeight = useGameState((state) => state.setShipHeight);
  const setWaveParameters = useGameState((state) => state.setWaveParameters);
  const setShipScale = useGameState((state) => state.setShipScale); // Add ship scale setter
  const toggleWaterVisibility = useGameState((state) => state.toggleWaterVisibility);
  const toggleOneShotKill = useGameState((state) => state.toggleOneShotKill);
  
  // Player state
  const playerHealth = usePlayer((state) => state.health);
  const resetPlayer = usePlayer((state) => state.resetPlayer);
  
  // Enemy state removed
  
  // Upgrades
  const loot = useUpgrades((state) => state.loot);
  const addLoot = useUpgrades((state) => state.addLoot);
  const hullLevel = useUpgrades((state) => state.hullLevel);
  const cannonLevel = useUpgrades((state) => state.cannonLevel);
  const speedLevel = useUpgrades((state) => state.speedLevel);
  const upgradeStat = useUpgrades((state) => state.upgradeStat);
  
  // Audio
  const toggleMute = useAudio((state) => state.toggleMute);
  const isMuted = useAudio((state) => state.isMuted);
  
  // Check for game over
  useEffect(() => {
    if (gameState === 'gameOver') {
      setShowGameOver(true);
    } else {
      setShowGameOver(false);
    }
  }, [gameState]);
  
  // Using a ref to track game time for auto victory
  const gameTimeRef = useRef(0);
  
  // Victory screen disabled as requested
  /* Victory screen auto-trigger has been removed
  useEffect(() => {
    if (gameState === 'playing') {
      // Set a timeout to show victory after 2 minutes of gameplay
      const victoryTimeout = setTimeout(() => {
        setShowVictory(true);
        // Add random loot amount
        addLoot(Math.floor(Math.random() * 100) + 100);
      }, 120000); // 2 minutes
      
      return () => clearTimeout(victoryTimeout);
    }
  }, [gameState, addLoot]);
  */
  
  // Handle game restart
  const handleRestart = () => {
    // Reset player
    resetPlayer();
    
    // Reset game timer
    gameTimeRef.current = 0;
    
    // Return to menu
    setGameState('menu');
    
    setShowGameOver(false);
    setShowVictory(false);
  };
  
  // Continue after victory
  const handleContinue = () => {
    // Reset game timer
    gameTimeRef.current = 0;
    
    // Continue playing
    setShowVictory(false);
  };
  
  // Go to upgrades menu
  const handleUpgrades = () => {
    setGameState('upgrade');
    setShowVictory(false);
  };
  
  return (
    <div className="absolute inset-0">
      {/* HUD - fixed positioning allows it to escape parent container's pointer events */}
      <HUD />
      
      {/* Controls button */}
      <div className="absolute top-5 right-5 pointer-events-auto flex flex-col space-y-2">
        <div className="flex space-x-2">
          <button
            className="bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white px-4 py-2 rounded-lg"
            onClick={() => setShowControls(!showControls)}
          >
            Controls
          </button>
          
          <button
            className="bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white px-4 py-2 rounded-lg"
            onClick={() => setShowDebug(!showDebug)}
          >
            Debug
          </button>
          
          <button
            className="bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white px-4 py-2 rounded-lg"
            onClick={toggleMute}
          >
            {isMuted ? (
              <i className="fas fa-volume-mute"></i>
            ) : (
              <i className="fas fa-volume-up"></i>
            )}
          </button>
        </div>
        
        <div className="px-2 py-1 bg-gray-900 bg-opacity-70 text-white text-sm rounded-lg">
          Click and drag to rotate camera view
        </div>
      </div>
      
      {/* Controls overlay */}
      {showControls && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md">
            <h2 className="text-2xl text-[#FFD700] font-['Pirata_One'] mb-4">Game Controls</h2>
            
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>W or ↑</div>
              <div>Move Forward</div>
              
              <div>S or ↓</div>
              <div>Move Backward</div>
              
              <div>A or ←</div>
              <div>Turn Left</div>
              
              <div>D or →</div>
              <div>Turn Right</div>
              
              <div>SPACEBAR</div>
              <div>Fire Cannons</div>
            </div>
            
            <button
              className="mt-6 bg-[#0A1C3B] text-white px-4 py-2 rounded-lg hover:bg-[#152d5b]"
              onClick={() => setShowControls(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {/* Game Over overlay */}
      {showGameOver && (
        <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-900 p-8 rounded-lg max-w-md text-center border-2 border-red-800">
            <h2 className="text-4xl text-red-500 font-['Pirata_One'] mb-4">Ship Destroyed!</h2>
            
            <p className="text-gray-300 mb-4">Your vessel has been sunk to the depths.</p>
            
            <div className="mb-6 bg-gray-800 p-4 rounded-lg">
              <div className="text-[#FFD700] text-lg">Total Loot Collected</div>
              <div className="text-white text-2xl">{loot} Gold</div>
            </div>
            
            <button
              className="bg-[#0A1C3B] text-white px-6 py-3 rounded-lg hover:bg-[#152d5b] text-lg"
              onClick={handleRestart}
            >
              Return to Port
            </button>
          </div>
        </div>
      )}
      
      {/* Victory overlay - disabled as requested */}
      {false && showVictory && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-900 p-8 rounded-lg max-w-md text-center border-2 border-[#FFD700]">
            <h2 className="text-4xl text-[#FFD700] font-['Pirata_One'] mb-4">Victory!</h2>
            
            <p className="text-gray-300 mb-4">You've successfully completed your voyage!</p>
            
            <div className="mb-6 bg-gray-800 p-4 rounded-lg">
              <div className="text-[#FFD700] text-lg">Loot Collected</div>
              <div className="text-white text-2xl">{loot} Gold</div>
            </div>
            
            <div className="flex space-x-4">
              <button
                className="bg-[#8B4513] text-white px-4 py-2 rounded-lg hover:bg-[#a05a2c] flex-1"
                onClick={handleUpgrades}
              >
                Upgrades
              </button>
              
              <button
                className="bg-[#0A1C3B] text-white px-4 py-2 rounded-lg hover:bg-[#152d5b] flex-1"
                onClick={handleContinue}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug Controls Overlay */}
      {showDebug && (
        <div className="absolute pointer-events-auto" style={{ zIndex: 1000 }}>
          <DebugControls
            onUpdateShipHeight={setShipHeight}
            onUpdateWaterParams={setWaveParameters}
            onUpdateShipScale={setShipScale}
            onToggleWaterVisibility={toggleWaterVisibility}
            onToggleOneShotKill={toggleOneShotKill}
            initialShipHeight={shipHeight}
            initialWaveHeight={waveHeight}
            initialWaveSpeed={waveSpeed}
            initialShipScale={shipScale}
            initialWaterVisible={waterVisible}
            initialOneShotKill={oneShotKill}
          />
        </div>
      )}
    </div>
  );
};

export default GameUI;
