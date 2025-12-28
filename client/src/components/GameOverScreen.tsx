import { useGameState } from "../lib/stores/useGameState";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";

/**
 * GameOverScreen - Displayed when the player's ship is destroyed
 */
const GameOverScreen = () => {
  const gameState = useGameState((state) => state.gameState);
  const resetMission = useGameState((state) => state.resetMission);
  const gold = useGameState((state) => state.gold);
  const enemiesKilled = useGameState((state) => state.enemiesKilled);
  const resetPlayer = usePlayer((state) => state.resetPlayer);
  const resetEnemies = useEnemies((state) => state.resetEnemies);
  const spawnEnemies = useEnemies((state) => state.spawnEnemies);

  if (gameState !== 'gameOver') return null;

  const handleRestart = () => {
    // Reset all game state
    resetPlayer();
    resetEnemies();
    resetMission();
    // Spawn new enemies
    spawnEnemies(5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-gray-900 border-4 border-red-700 rounded-xl p-10 text-center max-w-md">
        {/* Skull and crossbones */}
        <div className="text-8xl mb-4">💀</div>
        
        <h1 className="text-5xl font-['Pirata_One'] text-red-500 mb-4">
          YE BE SUNK!
        </h1>
        
        <p className="text-xl text-gray-300 mb-6">
          Your ship has been sent to Davy Jones' Locker!
        </p>
        
        {/* Stats */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-lg mb-2">
            <span className="text-gray-400">Ships Destroyed:</span>
            <span className="text-white font-bold">{enemiesKilled}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-gray-400">Gold Earned:</span>
            <span className="text-yellow-400 font-bold">🪙 {gold}</span>
          </div>
        </div>
        
        <button
          onClick={handleRestart}
          className="bg-red-700 hover:bg-red-600 text-white font-['Pirata_One'] text-2xl px-8 py-4 rounded-lg transition-colors duration-200 border-2 border-red-500"
        >
          Set Sail Again
        </button>
      </div>
    </div>
  );
};

export default GameOverScreen;
