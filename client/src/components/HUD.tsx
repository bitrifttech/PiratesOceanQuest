import { useEffect, useState } from "react";
import { usePlayer } from "../lib/stores/usePlayer";
import { useEnemies } from "../lib/stores/useEnemies"; // Re-added for mini-map
import { useGameState } from "../lib/stores/useGameState";
import { usePowerUps, PowerUpType, ActivePowerUp } from "../lib/stores/usePowerUps";
import { environmentCollisions } from "../lib/collision";

// HUD component - displays health, cannon status, mini-map
const HUD = () => {
  const health = usePlayer((state) => state.health);
  const cannonReady = usePlayer((state) => state.cannonReady);
  const cooldownPercent = usePlayer((state) => state.cooldownPercent);
  const playerPosition = usePlayer((state) => state.position);
  const playerRotation = usePlayer((state) => state.rotation);
  // Added back enemy state for the mini-map
  const enemies = useEnemies((state) => state.enemies);
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
    
    // Calculate scale factor for map (800x800 game area visible on minimap)
    const mapVisibleRange = 400; // Units visible from center in each direction
    const scaleFactor = canvas.width / (mapVisibleRange * 2);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Get actual environment features from the collision system
    const environmentFeatures = environmentCollisions.getFeatures();
    
    // Draw environment features with type-specific colors
    environmentFeatures.forEach(feature => {
      // Calculate position on mini-map relative to player
      const mapX = centerX + (feature.x - playerPosition.x) * scaleFactor;
      const mapY = centerY + (feature.z - playerPosition.z) * scaleFactor;
      
      // Skip if outside the mini-map bounds (with some margin)
      if (
        mapX < -5 || mapX > canvas.width + 5 || 
        mapY < -5 || mapY > canvas.height + 5
      ) {
        return;
      }
      
      // Choose color and size based on feature type
      let color = '#8D6E63'; // Default brown
      let size = 3; // Default size
      
      switch (feature.type) {
        case 'tropical':
          color = '#8BC34A'; // Green
          size = 4;
          break;
        case 'mountain':
          color = '#795548'; // Brown
          size = 5;
          break;
        case 'rocks':
          color = '#9E9E9E'; // Gray
          size = 3;
          break;
        case 'shipwreck':
          color = '#607D8B'; // Blue-gray
          size = 3;
          break;
        case 'port':
          color = '#FFB300'; // Amber
          size = 4;
          break;
        case 'lighthouse':
          color = '#FFFFFF'; // White
          size = 3;
          break;
        case 'volcanic':
          color = '#F44336'; // Red
          size = 4;
          break;
        case 'atoll':
          color = '#00BCD4'; // Cyan
          size = 4;
          break;
        case 'ice':
          color = '#B3E5FC'; // Light blue
          size = 4;
          break;
      }
      
      // Adjust size based on feature scale
      size = size * Math.sqrt(feature.scale);
      
      // Draw the feature
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mapX, mapY, size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Draw enemy ships
    enemies.forEach(enemy => {
      // Calculate position on mini-map relative to player
      const mapX = centerX + (enemy.position.x - playerPosition.x) * scaleFactor;
      const mapY = centerY + (enemy.position.z - playerPosition.z) * scaleFactor;
      
      // Skip if outside mini-map bounds
      if (
        mapX < 0 || mapX > canvas.width || 
        mapY < 0 || mapY > canvas.height
      ) {
        return;
      }
      
      // Draw enemy ship as a red triangle
      ctx.fillStyle = '#F44336'; // Red
      ctx.beginPath();
      
      // Calculate the direction in which the triangle should point
      // Apply same adjustment as player ship for consistency
      const angle = enemy.rotation.y - Math.PI;
      const shipSize = 5;
      
      // Calculate the three points of the triangle
      const tipX = mapX + Math.sin(angle) * shipSize;
      const tipY = mapY + Math.cos(angle) * shipSize;
      
      const leftX = mapX + Math.sin(angle - 2.5) * shipSize;
      const leftY = mapY + Math.cos(angle - 2.5) * shipSize;
      
      const rightX = mapX + Math.sin(angle + 2.5) * shipSize;
      const rightY = mapY + Math.cos(angle + 2.5) * shipSize;
      
      // Draw the triangle
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(leftX, leftY);
      ctx.lineTo(rightX, rightY);
      ctx.closePath();
      ctx.fill();
    });
    
    // Draw player ship as a green triangle
    ctx.fillStyle = '#4CAF50'; // Green
    ctx.beginPath();
    
    // Draw player as triangle pointing in correct direction
    const playerSize = 5;
    // Fix: Invert the angle as the ship model faces -Z by default
    // The ship model faces in negative Z direction, but for the mini-map
    // we need to invert this to match the actual visual orientation
    const playerAngle = playerRotation.y - Math.PI; // Rotate 180 degrees to point in the right direction
    
    // Calculate the three points of the triangle
    const pTipX = centerX + Math.sin(playerAngle) * playerSize;
    const pTipY = centerY + Math.cos(playerAngle) * playerSize;
    
    const pLeftX = centerX + Math.sin(playerAngle - 2.5) * playerSize;
    const pLeftY = centerY + Math.cos(playerAngle - 2.5) * playerSize;
    
    const pRightX = centerX + Math.sin(playerAngle + 2.5) * playerSize;
    const pRightY = centerY + Math.cos(playerAngle + 2.5) * playerSize;
    
    // Draw the triangle
    ctx.moveTo(pTipX, pTipY);
    ctx.lineTo(pLeftX, pLeftY);
    ctx.lineTo(pRightX, pRightY);
    ctx.closePath();
    ctx.fill();
    
  }, [playerPosition, playerRotation, enemies]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // Make the mini-map slightly larger for better visibility
      const width = Math.min(180, window.innerWidth / 4.5);
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
        
        {/* Enemy ship test controls removed */}
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
