import { useEffect, useState } from "react";
import { usePlayer } from "../lib/stores/usePlayer";
// import { useEnemies } from "../lib/stores/useEnemies"; // Removed enemies
import { useGameState } from "../lib/stores/useGameState";

// HUD component - displays health, cannon status, mini-map
const HUD = () => {
  const health = usePlayer((state) => state.health);
  const cannonReady = usePlayer((state) => state.cannonReady);
  const cooldownPercent = usePlayer((state) => state.cooldownPercent);
  const playerPosition = usePlayer((state) => state.position);
  const playerRotation = usePlayer((state) => state.rotation);
  // Enemy state removed
  const gameState = useGameState((state) => state.gameState);
  
  const [canvasSize, setCanvasSize] = useState({ width: 150, height: 150 });
  
  // Draw mini-map on canvas
  useEffect(() => {
    if (!playerPosition) return;
    
    const canvas = document.getElementById('mini-map') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background
    ctx.fillStyle = 'rgba(0, 30, 60, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scale factor for map (1000x1000 game area)
    const scaleFactor = canvas.width / 1000;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Draw islands (static positions)
    const islands = [
      { x: 80, z: 100 },
      { x: -120, z: -50 },
      { x: 150, z: -120 },
      { x: -60, z: 150 },
    ];
    
    ctx.fillStyle = '#8D6E63';
    islands.forEach(island => {
      const mapX = centerX + (island.x - playerPosition.x) * scaleFactor;
      const mapY = centerY + (island.z - playerPosition.z) * scaleFactor;
      
      ctx.beginPath();
      ctx.arc(mapX, mapY, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw enemies
    ctx.fillStyle = '#F44336';
    enemies.forEach(enemy => {
      const mapX = centerX + (enemy.position.x - playerPosition.x) * scaleFactor;
      const mapY = centerY + (enemy.position.z - playerPosition.z) * scaleFactor;
      
      ctx.beginPath();
      ctx.arc(mapX, mapY, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw player
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw player direction
    const dirLength = 10;
    const dirX = centerX + Math.sin(playerRotation.y) * dirLength;
    const dirY = centerY + Math.cos(playerRotation.y) * dirLength;
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(dirX, dirY);
    ctx.stroke();
    
  }, [playerPosition, playerRotation, enemies]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = Math.min(150, window.innerWidth / 5);
      setCanvasSize({
        width,
        height: width
      });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Calculate health color
  const healthColor = health > 70 ? "#4CAF50" : health > 30 ? "#FF9800" : "#F44336";
  
  return (
    <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
      {/* Left side - health display */}
      <div className="bg-gray-900 bg-opacity-70 p-3 rounded-lg border border-gray-700 pointer-events-none">
        <div className="text-white mb-2 font-['Pirata_One'] text-xl">Ship Health</div>
        <div className="w-48 h-6 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-500 ease-out"
            style={{ 
              width: `${health}%`, 
              backgroundColor: healthColor
            }}
          />
        </div>
        <div className="text-white mt-1">{health}/100</div>
      </div>
      
      {/* Center - Reload status and test controls */}
      <div className="bg-gray-900 bg-opacity-70 p-3 rounded-lg border border-gray-700">
        <div className="text-white mb-2 font-['Pirata_One'] text-xl">Cannons</div>
        <div className="flex items-center justify-center pointer-events-none">
          {cannonReady ? (
            <div className="text-green-500 text-lg font-bold">READY</div>
          ) : (
            <>
              <div className="w-32 h-4 bg-gray-700 rounded-full overflow-hidden mr-2">
                <div 
                  className="h-full bg-yellow-500"
                  style={{ width: `${cooldownPercent}%` }}
                />
              </div>
              <div className="text-yellow-500">Reloading</div>
            </>
          )}
        </div>
        <div className="text-white mt-2 text-sm pointer-events-none">SPACEBAR to fire</div>
        
        {/* Test controls - these have pointer events enabled */}
        {gameState === 'playing' && (
          <div className="mt-4 flex justify-center">
            <div className="flex space-x-2">
              <button 
                className="bg-red-700 hover:bg-red-800 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                onClick={() => {
                  spawnEnemies(1);
                  console.log("Spawned a single enemy ship for testing");
                }}
              >
                Spawn Test Enemy
              </button>
              
              <button 
                className="bg-gray-700 hover:bg-gray-800 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                onClick={() => {
                  resetEnemies();
                  console.log("Removed all enemy ships");
                }}
              >
                Remove All Enemies
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Right side - mini-map */}
      <div className="bg-gray-900 bg-opacity-70 p-3 rounded-lg border border-gray-700 pointer-events-none">
        <div className="text-white mb-2 font-['Pirata_One'] text-xl">Map</div>
        <canvas 
          id="mini-map" 
          width={canvasSize.width} 
          height={canvasSize.height}
          className="border border-gray-600 rounded"
        />
      </div>
    </div>
  );
};

export default HUD;
