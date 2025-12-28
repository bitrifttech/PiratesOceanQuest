import { useGameState, MISSION_CONFIG } from "../lib/stores/useGameState";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies";

/**
 * VictoryScreen - Displayed when the player completes the mission
 */
const VictoryScreen = () => {
  const gameState = useGameState((state) => state.gameState);
  const resetMission = useGameState((state) => state.resetMission);
  const gold = useGameState((state) => state.gold);
  const enemiesKilled = useGameState((state) => state.enemiesKilled);
  const resetPlayer = usePlayer((state) => state.resetPlayer);
  const resetEnemies = useEnemies((state) => state.resetEnemies);
  const spawnEnemies = useEnemies((state) => state.spawnEnemies);
  const health = usePlayer((state) => state.health);

  if (gameState !== 'victory') return null;

  const handlePlayAgain = () => {
    // Reset all game state
    resetPlayer();
    resetEnemies();
    resetMission();
    // Spawn new enemies
    spawnEnemies(MISSION_CONFIG.ENEMIES_TO_KILL);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-gray-900 border-4 border-yellow-500 rounded-xl p-10 text-center max-w-md">
        {/* Trophy */}
        <div className="text-8xl mb-4">🏆</div>
        
        <h1 className="text-5xl font-['Pirata_One'] text-yellow-400 mb-4">
          VICTORY!
        </h1>
        
        <p className="text-xl text-gray-300 mb-6">
          Ye conquered the seas, Captain! All enemy ships have been sent to the depths!
        </p>
        
        {/* Stats */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between text-lg mb-2">
            <span className="text-gray-400">Ships Destroyed:</span>
            <span className="text-green-400 font-bold">{enemiesKilled} ✓</span>
          </div>
          <div className="flex justify-between text-lg mb-2">
            <span className="text-gray-400">Gold Earned:</span>
            <span className="text-yellow-400 font-bold">🪙 {gold}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="text-gray-400">Health Remaining:</span>
            <span className="text-white font-bold">{health}%</span>
          </div>
        </div>
        
        {/* Rating based on health remaining */}
        <div className="mb-6">
          <div className="text-gray-400 mb-2">Rating:</div>
          <div className="text-4xl">
            {health >= 80 ? '⭐⭐⭐' : health >= 50 ? '⭐⭐' : '⭐'}
          </div>
        </div>
        
        <button
          onClick={handlePlayAgain}
          className="bg-yellow-600 hover:bg-yellow-500 text-black font-['Pirata_One'] text-2xl px-8 py-4 rounded-lg transition-colors duration-200 border-2 border-yellow-400"
        >
          Sail Again! 🏴‍☠️
        </button>
      </div>
    </div>
  );
};

export default VictoryScreen;
