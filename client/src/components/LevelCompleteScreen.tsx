import { useEffect, useState } from "react";
import { useGameState } from "../lib/stores/useGameState";
import { usePlayer } from "../lib/stores/usePlayer";
import { LEVEL_PROGRESSION } from "../lib/config/gameBalance";
import { logger } from "../lib/utils/logger";

const LevelCompleteScreen = () => {
  const currentLevel = useGameState((state) => state.currentLevel);
  const shipsKilledThisLevel = useGameState((state) => state.shipsKilledThisLevel);
  const goldEarnedThisLevel = useGameState((state) => state.goldEarnedThisLevel);
  const totalGold = useGameState((state) => state.totalGold);
  const advanceLevel = useGameState((state) => state.advanceLevel);
  const setGameState = useGameState((state) => state.setGameState);
  const heal = usePlayer((state) => state.heal);
  const maxHealth = usePlayer((state) => state.maxHealth);
  
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState(3);
  
  // Calculate level completion bonus
  const levelBonus = Math.floor(
    LEVEL_PROGRESSION.LEVEL_COMPLETE_BONUS_BASE * 
    (currentLevel * LEVEL_PROGRESSION.LEVEL_COMPLETE_BONUS_MULTIPLIER)
  );
  
  // Auto-advance timer
  useEffect(() => {
    const interval = setInterval(() => {
      setAutoAdvanceTimer((prev) => {
        if (prev <= 1) {
          handleContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleContinue = () => {
    // Add level completion bonus
    const gameState = useGameState.getState();
    gameState.addGold(levelBonus);
    
    // Heal player if configured
    if (LEVEL_PROGRESSION.HEAL_ON_LEVEL_COMPLETE) {
      const healAmount = Math.floor(maxHealth * (LEVEL_PROGRESSION.HEAL_AMOUNT_PERCENT / 100));
      heal(healAmount);
      logger.debug('level', `Healed ${healAmount} HP on level complete`);
    }
    
    // Advance to next level
    advanceLevel();
    
    logger.debug('level', `Advanced to level ${currentLevel + 1}`);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-gradient-to-b from-blue-900 to-blue-950 border-4 border-yellow-500 rounded-lg p-8 max-w-lg w-full mx-4 shadow-2xl">
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-yellow-400 mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            Level {currentLevel} Complete!
          </h1>
          <div className="h-1 w-32 bg-yellow-500 mx-auto rounded"></div>
        </div>
        
        {/* Stats */}
        <div className="space-y-4 mb-6">
          <div className="bg-blue-800/50 rounded p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg text-blue-200">Ships Destroyed:</span>
              <span className="text-2xl font-bold text-white">{shipsKilledThisLevel}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg text-blue-200">Gold Earned:</span>
              <span className="text-2xl font-bold text-yellow-400">+{goldEarnedThisLevel}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="text-lg text-blue-200">Completion Bonus:</span>
              <span className="text-2xl font-bold text-green-400">+{levelBonus}</span>
            </div>
            
            <div className="h-px bg-blue-600 my-3"></div>
            
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-blue-200">Total Gold:</span>
              <span className="text-3xl font-bold text-yellow-400">{totalGold + levelBonus}</span>
            </div>
          </div>
          
          {/* Next level preview */}
          <div className="bg-blue-900/50 rounded p-4 border-2 border-blue-700">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">Next: Level {currentLevel + 1}</h3>
            <div className="text-blue-200">
              <p className="mb-1">• Ships to destroy: {LEVEL_PROGRESSION.BASE_SHIPS_TO_KILL + currentLevel * LEVEL_PROGRESSION.SHIPS_INCREMENT_PER_LEVEL}</p>
              <p className="mb-1">• Simultaneous enemies: {Math.min(
                LEVEL_PROGRESSION.BASE_SIMULTANEOUS_ENEMIES + currentLevel * LEVEL_PROGRESSION.ENEMIES_INCREMENT_PER_LEVEL,
                LEVEL_PROGRESSION.MAX_SIMULTANEOUS_ENEMIES
              )}</p>
              {LEVEL_PROGRESSION.HEAL_ON_LEVEL_COMPLETE && (
                <p className="text-green-400">• Health fully restored!</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-blue-950 font-bold text-xl py-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          Continue to Level {currentLevel + 1}
          {autoAdvanceTimer > 0 && ` (${autoAdvanceTimer})`}
        </button>
      </div>
    </div>
  );
};

export default LevelCompleteScreen;
