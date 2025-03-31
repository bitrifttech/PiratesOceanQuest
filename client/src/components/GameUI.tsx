import { useState, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../App";
import HUD from "./HUD";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { useGameState } from "../lib/stores/useGameState";
import { useUpgrades } from "../lib/stores/useUpgrades";
import { useAudio } from "../lib/stores/useAudio";

const GameUI = () => {
  const [showControls, setShowControls] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  
  // Game state
  const gameState = useGameState((state) => state.gameState);
  const setGameState = useGameState((state) => state.setGameState);
  
  // Player state
  const playerHealth = usePlayer((state) => state.health);
  const resetPlayer = usePlayer((state) => state.resetPlayer);
  
  // Enemy state
  const enemies = useEnemies((state) => state.enemies);
  const resetEnemies = useEnemies((state) => state.resetEnemies);
  
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
  
  // Check for victory condition
  useEffect(() => {
    if (gameState === 'playing' && enemies.length === 0) {
      setShowVictory(true);
      // Add loot
      addLoot(Math.floor(Math.random() * 100) + 100);
    }
  }, [gameState, enemies, addLoot]);
  
  // Handle game restart
  const handleRestart = () => {
    // Reset player and enemies
    resetPlayer();
    resetEnemies();
    
    // Return to menu
    setGameState('menu');
    
    setShowGameOver(false);
    setShowVictory(false);
  };
  
  // Continue after victory
  const handleContinue = () => {
    // Spawn more enemies
    resetEnemies();
    
    // Continue playing
    setShowVictory(false);
  };
  
  // Go to upgrades menu
  const handleUpgrades = () => {
    setGameState('upgrade');
    setShowVictory(false);
  };
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* HUD */}
      <HUD />
      
      {/* Controls button */}
      <div className="absolute top-5 right-5 pointer-events-auto">
        <button
          className="bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white px-4 py-2 rounded-lg mr-2"
          onClick={() => setShowControls(!showControls)}
        >
          Controls
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
              
              <div>B</div>
              <div>Board Enemy Ship</div>
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
      
      {/* Victory overlay */}
      {showVictory && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center pointer-events-auto">
          <div className="bg-gray-900 p-8 rounded-lg max-w-md text-center border-2 border-[#FFD700]">
            <h2 className="text-4xl text-[#FFD700] font-['Pirata_One'] mb-4">Victory!</h2>
            
            <p className="text-gray-300 mb-4">You've defeated all enemy ships in this area!</p>
            
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
    </div>
  );
};

export default GameUI;
