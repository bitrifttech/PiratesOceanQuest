import { useState, useEffect } from "react";
import { useGameState } from "../lib/stores/useGameState";
import { useUpgrades } from "../lib/stores/useUpgrades";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";
import { getLocalStorage } from "../lib/utils";
import { useAudio } from "../lib/stores/useAudio";

const MainMenu = () => {
  const [hasProgress, setHasProgress] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const setGameState = useGameState((state) => state.setGameState);
  const resetPlayer = usePlayer((state) => state.resetPlayer);
  const resetEnemies = useEnemies((state) => state.resetEnemies);
  const loadUpgrades = useUpgrades((state) => state.loadUpgrades);
  
  // Audio functions (extracted individually to avoid unnecessary re-renders)
  const isMuted = useAudio((state) => state.isMuted);
  const toggleMute = useAudio((state) => state.toggleMute);
  const loadSounds = useAudio((state) => state.loadSounds);
  const playBackgroundMusic = useAudio((state) => state.playBackgroundMusic);
  
  // Initialize audio system on component mount
  useEffect(() => {
    // Load audio files
    loadSounds();
    
    // Try to play background music (will only play if not muted)
    playBackgroundMusic();
    
    console.log("Audio system initialized");
  }, [loadSounds, playBackgroundMusic]);
  
  // Check for saved progress
  useEffect(() => {
    const savedLoot = getLocalStorage('pirateGame_loot');
    setHasProgress(savedLoot !== null);
  }, []);
  
  // Handle start game
  const startNewGame = () => {
    // Reset game state
    resetPlayer();
    resetEnemies();
    
    // Show loading bar
    setShowProgressBar(true);
    
    // Simulate loading
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setGameState('playing');
      }
    }, 100);
  };
  
  // Handle continue game
  const continueGame = () => {
    // Load saved progress
    loadUpgrades();
    
    // Show loading bar
    setShowProgressBar(true);
    
    // Simulate loading
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setGameState('playing');
      }
    }, 100);
  };
  
  // Handle go to menu
  const goToTitle = () => {
    setGameState('title');
  };
  
  // Loading bar
  if (showProgressBar) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0A1C3B]">
        <h2 className="text-3xl font-['Pirata_One'] text-[#FFD700] mb-6">Setting Sail...</h2>
        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#FFD700] transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-4 text-[#F5F5F5]">Preparing your vessel...</p>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen bg-[#0A1C3B] flex items-center justify-center">
      <div className="relative bg-[#152d5b] border-2 border-[#8B4513] rounded-lg p-8 max-w-xl w-full mx-4">
        <h1 className="text-4xl md:text-5xl font-['Pirata_One'] text-[#FFD700] mb-6 text-center">
          Pirates of the Three Seas
        </h1>
        
        <div className="flex flex-col space-y-4">
          <button
            className="bg-[#8B4513] hover:bg-[#9c6b30] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl transition-all"
            onClick={startNewGame}
          >
            New Voyage
          </button>
          
          {hasProgress && (
            <button
              className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl transition-all"
              onClick={continueGame}
            >
              Continue Journey
            </button>
          )}
          
          <button
            className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl transition-all"
            onClick={() => setGameState('upgrade')}
          >
            Ship Upgrades
          </button>
          
          <button
            className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl transition-all"
            onClick={() => setGameState('settings')}
          >
            Settings
          </button>
          
          <button
            className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl transition-all"
            onClick={() => setGameState('help')}
          >
            Help
          </button>
          
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 rounded-lg font-['Pirata_One'] text-xl transition-all mt-6"
            onClick={goToTitle}
          >
            Back
          </button>
        </div>
        
        {/* Ship decoration */}
        <div className="absolute -top-16 -right-16 text-[#8B4513] opacity-20 transform rotate-12">
          <i className="fas fa-ship text-9xl"></i>
        </div>
        
        {/* Sound toggle */}
        <button 
          className="absolute top-4 right-4 text-white hover:text-[#FFD700]"
          onClick={audioControls.toggleMute}
        >
          {audioControls.isMuted ? (
            <i className="fas fa-volume-mute text-xl"></i>
          ) : (
            <i className="fas fa-volume-up text-xl"></i>
          )}
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
